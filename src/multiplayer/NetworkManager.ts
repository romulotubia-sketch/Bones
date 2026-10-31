import { CharacterId, DifficultyLevel } from '../types/game';
import {
  ClientMessage,
  EnemySyncState,
  MultiplayerMode,
  PlayerTransformSync,
  PvpTeam,
  RoomInfo,
  RoomPlayer,
  ServerMessage,
} from './networkTypes';

export interface NetworkCallbacks {
  onRoomUpdate?: (room: RoomInfo | null) => void;
  onGameStart?: (seed: number, floorNumber: number) => void;
  onWorldSync?: (
    players: PlayerTransformSync[],
    enemies?: EnemySyncState[],
    activeRoomId?: number,
    wavesRemaining?: number
  ) => void;
  onEnemyDamaged?: (
    enemyId: number,
    damage: number,
    isCrit?: boolean,
    hitX?: number,
    hitY?: number,
    attackerId?: string
  ) => void;
  onEnemyDefeated?: (
    enemyId: number,
    killerId: string,
    dropX: number,
    dropY: number
  ) => void;
  onRemoteSkill?: (
    playerId: string,
    skillId: string,
    x: number,
    y: number,
    angle: number,
    slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE'
  ) => void;
  onPlayerRevived?: (
    revivedPlayerId: string,
    reviverPlayerId: string,
    reviveHp: number
  ) => void;
  onFloorSync?: (floorNumber: number, seed: number) => void;
  onPartyWipe?: () => void;
  onError?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  onPlayerLeft?: (playerId: string) => void;
}

export class NetworkManager {
  private ws: WebSocket | null = null;
  private listenerList: NetworkCallbacks[] = [];
  private localPlayerId: string | null = null;
  private currentRoom: RoomInfo | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingSent = 0;
  private currentPing = 0;
  private shouldStayConnected = false;
  private serverHost: string | null = null;
  private sessionToken: string = (() => {
    try {
      let tok = sessionStorage.getItem('hb_mp_session_token');
      if (!tok) {
        tok = 's_' + Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem('hb_mp_session_token', tok);
      }
      return tok;
    } catch {
      return 's_' + Math.random().toString(36).substring(2, 10);
    }
  })();

  constructor(callbacks?: NetworkCallbacks) {
    if (callbacks) this.listenerList.push(callbacks);
  }

  public setCallbacks(callbacks: NetworkCallbacks): () => void {
    this.listenerList.push(callbacks);
    return () => {
      this.listenerList = this.listenerList.filter((c) => c !== callbacks);
    };
  }

  public addCallbacks(callbacks: NetworkCallbacks): () => void {
    return this.setCallbacks(callbacks);
  }

  private trigger<K extends keyof NetworkCallbacks>(
    key: K,
    ...args: Parameters<NonNullable<NetworkCallbacks[K]>>
  ): void {
    for (const cb of [...this.listenerList]) {
      const fn = cb[key];
      if (typeof fn === 'function') {
        try {
          (fn as any)(...args);
        } catch (err) {
          console.error(`[NetworkManager] Error in ${String(key)} callback:`, err);
        }
      }
    }
  }

  public getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  public getRoom(): RoomInfo | null {
    return this.currentRoom;
  }

  public isHost(): boolean {
    if (!this.currentRoom || !this.localPlayerId) return false;
    return this.currentRoom.hostId === this.localPlayerId;
  }

  public connect(customHost?: string): Promise<boolean> {
    if (customHost) this.serverHost = customHost;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(true);
    }
    this.shouldStayConnected = true;
    this.isConnecting = true;

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let url: string;

        if (this.serverHost) {
          const raw = this.serverHost.trim();
          if (raw.startsWith('ws://') || raw.startsWith('wss://')) {
            url = raw.endsWith('/ws') ? raw : `${raw}/ws`;
          } else {
            const clean = raw.replace(/^https?:\/\//, '');
            url = `${protocol}//${clean.endsWith('/ws') ? clean : `${clean}/ws`}`;
          }
        } else {
          url = `${protocol}//${window.location.host}/ws`;
        }

        const socket = new WebSocket(url);
        this.ws = socket;

        socket.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.trigger('onConnectionChange', true);
          this.startHeartbeat();
          resolve(true);
        };

        socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        socket.onclose = () => {
          this.stopHeartbeat();
          this.trigger('onConnectionChange', false);
          this.handleDisconnect();
          resolve(false);
        };

        socket.onerror = (err) => {
          console.warn('[NetworkManager] Socket error:', err);
          this.isConnecting = false;
        };
      } catch (err) {
        console.error('[NetworkManager] Connect error:', err);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  private handleDisconnect(): void {
    if (!this.shouldStayConnected) return;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 5000);
      this.reconnectTimer = setTimeout(() => {
        if (this.shouldStayConnected) {
          void this.connect();
        }
      }, delay);
    } else {
      this.trigger('onError', 'Lost connection to multiplayer game server.');
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingSent = performance.now();
        this.send({ type: 'C2S_PING', clientTime: this.lastPingSent });
      }
    }, 4000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(rawData: string): void {
    try {
      const msg = JSON.parse(rawData) as ServerMessage;

      switch (msg.type) {
        case 'S2C_ROOM_CREATED':
        case 'S2C_ROOM_JOINED': {
          this.currentRoom = msg.room;
          this.localPlayerId = msg.playerId;
          this.trigger('onRoomUpdate', this.currentRoom);
          break;
        }

        case 'S2C_ROOM_STATE': {
          this.currentRoom = msg.room;
          this.trigger('onRoomUpdate', this.currentRoom);
          break;
        }

        case 'S2C_PLAYER_JOINED': {
          if (this.currentRoom) {
            const exists = this.currentRoom.players.some((p) => p.id === msg.player.id);
            if (!exists) {
              this.currentRoom.players.push(msg.player);
              this.trigger('onRoomUpdate', this.currentRoom);
            }
          }
          break;
        }

        case 'S2C_PLAYER_LEFT': {
          if (this.currentRoom) {
            this.currentRoom.players = this.currentRoom.players.filter(
              (p) => p.id !== msg.playerId
            );
            if (msg.newHostId) {
              this.currentRoom.hostId = msg.newHostId;
              const hostPlayer = this.currentRoom.players.find(
                (p) => p.id === msg.newHostId
              );
              if (hostPlayer) hostPlayer.isHost = true;
            }
            this.trigger('onPlayerLeft', msg.playerId);
            this.trigger('onRoomUpdate', this.currentRoom);
          }
          break;
        }

        case 'S2C_HOST_CHANGED': {
          if (this.currentRoom) {
            this.currentRoom.hostId = msg.newHostId;
            for (const p of this.currentRoom.players) {
              p.isHost = p.id === msg.newHostId;
            }
            this.trigger('onRoomUpdate', this.currentRoom);
          }
          break;
        }

        case 'S2C_GAME_STARTED': {
          if (this.currentRoom) {
            this.currentRoom.inGame = true;
            this.currentRoom.seed = msg.seed;
            this.currentRoom.floorNumber = msg.floorNumber;
          }
          this.trigger('onGameStart', msg.seed, msg.floorNumber);
          break;
        }

        case 'S2C_SYNC_WORLD': {
          this.trigger(
            'onWorldSync',
            msg.players,
            msg.enemies,
            msg.activeRoomId,
            msg.wavesRemaining
          );
          break;
        }

        case 'S2C_ENEMY_DAMAGED': {
          this.trigger(
            'onEnemyDamaged',
            msg.enemyId,
            msg.damageDealt,
            msg.isCrit,
            msg.hitX,
            msg.hitY,
            msg.attackerId
          );
          break;
        }

        case 'S2C_ENEMY_DEFEATED': {
          this.trigger(
            'onEnemyDefeated',
            msg.enemyId,
            msg.killerId,
            msg.dropX,
            msg.dropY
          );
          break;
        }

        case 'S2C_REMOTE_SKILL': {
          this.trigger(
            'onRemoteSkill',
            msg.playerId,
            msg.skillId,
            msg.x,
            msg.y,
            msg.angle,
            msg.slot
          );
          break;
        }

        case 'S2C_PLAYER_REVIVED': {
          this.trigger(
            'onPlayerRevived',
            msg.revivedPlayerId,
            msg.reviverPlayerId,
            msg.reviveHp
          );
          break;
        }

        case 'S2C_FLOOR_SYNC': {
          if (this.currentRoom) {
            this.currentRoom.floorNumber = msg.floorNumber;
            this.currentRoom.seed = msg.seed;
          }
          this.trigger('onFloorSync', msg.floorNumber, msg.seed);
          break;
        }

        case 'S2C_PARTY_WIPE': {
          this.trigger('onPartyWipe');
          break;
        }

        case 'S2C_PONG': {
          const now = performance.now();
          this.currentPing = Math.round(now - msg.clientTime);
          break;
        }

        case 'S2C_ERROR': {
          this.trigger('onError', msg.message);
          break;
        }
      }
    } catch (err) {
      console.error('[NetworkManager] Error parsing server message:', err);
    }
  }

  public async createRoom(
    playerName: string,
    characterId: CharacterId,
    mode: MultiplayerMode,
    maxPlayers = 4,
    difficulty?: DifficultyLevel,
    customHost?: string
  ): Promise<void> {
    await this.connect(customHost);

    this.send({
      type: 'C2S_CREATE_ROOM',
      playerName,
      characterId,
      mode,
      maxPlayers,
      difficulty,
      sessionToken: this.sessionToken,
    });
  }

  public async joinRoom(
    code: string,
    playerName: string,
    characterId: CharacterId,
    customHost?: string
  ): Promise<void> {
    await this.connect(customHost);

    this.send({
      type: 'C2S_JOIN_ROOM',
      code: code.trim().toUpperCase(),
      playerName,
      characterId,
      sessionToken: this.sessionToken,
    });
  }

  public leaveRoom(): void {
    this.send({ type: 'C2S_LEAVE_ROOM' });
    this.currentRoom = null;
    this.trigger('onRoomUpdate', null);
  }

  public setReady(ready: boolean): void {
    this.send({ type: 'C2S_SET_READY', ready });
  }

  public sendSetTeam(team: PvpTeam): void {
    this.send({ type: 'C2S_SET_TEAM', team });
  }

  public promoteLeader(targetPlayerId: string): void {
    this.send({ type: 'C2S_PROMOTE_LEADER', targetPlayerId });
  }

  public setDifficulty(difficulty: DifficultyLevel): void {
    this.send({ type: 'C2S_SET_DIFFICULTY', difficulty });
  }

  public selectCharacter(characterId: CharacterId): void {
    this.send({ type: 'C2S_SELECT_CHARACTER', characterId });
  }

  public startGame(difficulty?: DifficultyLevel): void {
    this.send({ type: 'C2S_START_GAME', difficulty });
  }

  public sendTransform(transform: Omit<PlayerTransformSync, 'id'>): void {
    if (!this.localPlayerId) return;
    this.send({
      type: 'C2S_UPDATE_TRANSFORM',
      transform: {
        ...transform,
        id: this.localPlayerId,
      },
    });
  }

  public sendEnemyDamage(
    enemyId: number,
    damage: number,
    isCrit = false,
    hitX = 0,
    hitY = 0
  ): void {
    if (!this.localPlayerId) return;
    this.send({
      type: 'C2S_DAMAGE_ENEMY',
      enemyId,
      damage,
      isCrit,
      hitX,
      hitY,
      attackerId: this.localPlayerId,
    });
  }

  public sendCastSkill(
    skillId: string,
    x: number,
    y: number,
    angle: number,
    slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE'
  ): void {
    this.send({
      type: 'C2S_CAST_SKILL',
      skillId,
      x,
      y,
      angle,
      slot,
    });
  }

  public sendSyncEnemies(roomId: number, wavesRemaining: number, enemies: EnemySyncState[]): void {
    this.send({
      type: 'C2S_SYNC_ENEMIES',
      roomId,
      wavesRemaining,
      enemies,
    });
  }

  public sendReviveProgress(targetPlayerId: string, progress: number): void {
    this.send({
      type: 'C2S_REVIVE_PLAYER',
      targetPlayerId,
      progress,
    });
  }

  public sendAdvanceFloor(floorNumber: number, seed: number): void {
    this.send({
      type: 'C2S_ADVANCE_FLOOR',
      floorNumber,
      seed,
    });
  }

  public sendReturnPartyToGuild(): void {
    this.send({
      type: 'C2S_RETURN_TO_GUILD',
    });
  }

  public sendRequestRematch(): void {
    this.send({
      type: 'C2S_REQUEST_REMATCH',
    });
  }

  public getPing(): number {
    return this.currentPing;
  }

  public disconnect(): void {
    this.shouldStayConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentRoom = null;
    this.localPlayerId = null;
    this.serverHost = null;
  }
}
