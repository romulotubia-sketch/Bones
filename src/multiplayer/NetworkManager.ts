import { CharacterId, DifficultyLevel, EnemyKind } from '../types/game';
import {
  ClientMessage,
  EnemyProjectileSyncState,
  EnemyStatusPayload,
  EnemySyncState,
  MultiplayerMode,
  PlayerTransformSync,
  PvpMatchSyncState,
  PvpTeam,
  RoomInfo,
  RoomProgressSyncState,
  ServerMessage,
  SpawnedPropSyncState,
} from './networkTypes';

export interface WorldSyncPayload {
  players: PlayerTransformSync[];
  enemies?: EnemySyncState[];
  enemyProjectiles?: EnemyProjectileSyncState[];
  roomsState?: RoomProgressSyncState[];
  spawnedProps?: SpawnedPropSyncState[];
  brokenPropIds?: number[];
  activeRoomId?: number;
  wavesRemaining?: number;
  currentWave?: number;
  totalWaves?: number;
}

export interface NetworkCallbacks {
  onRoomUpdate?: (room: RoomInfo | null) => void;
  onGameStart?: (seed: number, floorNumber: number, difficulty: DifficultyLevel) => void;
  onWorldSync?: (payload: WorldSyncPayload) => void;
  onWaveEvent?: (event: {
    roomId: number;
    bannerText: string;
    currentWave: number;
    totalWaves: number;
    isBoss?: boolean;
    isCleared?: boolean;
  }) => void;
  onPartyRoomPull?: (roomId: number, x: number, y: number) => void;
  onEnemyAttackFx?: (
    kind: 'WARRIOR_SLASH' | 'ARCHER_SHOT' | 'BOSS_CLEAVE' | 'BOSS_VOLLEY' | 'BOSS_SUMMON' | 'BOSS_DASH',
    x: number,
    y: number,
    angle: number
  ) => void;
  onEnemyDamaged?: (
    enemyId: number,
    newHp: number,
    maxHp: number,
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
    dropY: number,
    kind?: EnemyKind
  ) => void;
  onPlayerDamaged?: (event: {
    targetPlayerId: string;
    damage: number;
    newHp: number;
    maxHp: number;
    evaded?: boolean;
    ribBlocked?: boolean;
    isProjectile?: boolean;
  }) => void;
  onPlayerDowned?: (playerId: string, playerName: string) => void;
  onRemoteSkill?: (
    playerId: string,
    skillId: string,
    x: number,
    y: number,
    angle: number,
    slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE',
    targetX?: number,
    targetY?: number
  ) => void;
  onPropOpened?: (
    propId: number,
    kind: 'CHEST' | 'SHRINE_ALTAR' | 'DESTRUCTIBLE',
    x: number,
    y: number,
    openerId: string
  ) => void;
  onPlayerRevived?: (
    revivedPlayerId: string,
    reviverPlayerId: string,
    reviveHp: number,
    maxHp?: number
  ) => void;
  onFloorSync?: (floorNumber: number, seed: number, difficulty: DifficultyLevel) => void;
  onPartyVictory?: (difficulty: DifficultyLevel, floorNumber: number) => void;
  onPartyWipe?: () => void;
  onReturnToGuild?: () => void;
  onHostChanged?: (newHostId: string, newHostName?: string) => void;
  onError?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  onPlayerLeft?: (playerId: string, playerName?: string, newHostName?: string) => void;
  onPvpSync?: (matchState: PvpMatchSyncState) => void;
  onPvpBaseDamaged?: (
    team: PvpTeam,
    newHp: number,
    maxHp: number,
    damage: number,
    attackerId: string,
    hitX: number,
    hitY: number
  ) => void;
  onPvpBaseDestroyed?: (winningTeam: PvpTeam, destroyedTeam: PvpTeam) => void;
  onPvpPlayerEliminated?: (
    victimId: string,
    victimName: string,
    victimTeam: PvpTeam,
    killerId: string,
    killerName: string,
    killerTeam: PvpTeam,
    respawnDelay: number
  ) => void;
  onPvpPlayerRespawned?: (playerId: string, x: number, y: number, hp: number, maxHp: number) => void;
  onPvpMinionAttackFx?: (
    minionId: number,
    team: PvpTeam,
    kind: 'MELEE' | 'RANGED',
    x: number,
    y: number,
    targetX: number,
    targetY: number
  ) => void;
  onPvpMinionDamaged?: (
    minionId: number,
    newHp: number,
    maxHp: number,
    damage: number,
    isCrit?: boolean,
    hitX?: number,
    hitY?: number,
    attackerId?: string
  ) => void;
  onPvpMinionDefeated?: (minionId: number, killerId: string, dropX: number, dropY: number) => void;
  onPvpMatchEnded?: (
    winningTeam: PvpTeam,
    blueScore: number,
    redScore: number,
    matchDuration: number
  ) => void;
}

export class NetworkManager {
  private ws: WebSocket | null = null;
  private callbacks: NetworkCallbacks = {};
  private subscribers = new Set<NetworkCallbacks>();
  private localPlayerId: string | null = null;
  private currentRoom: RoomInfo | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPingSent = 0;
  private currentPing = 0;
  private shouldStayConnected = false;
  private serverHost: string | null = null;
  private connectedUrl: string | null = null;
  private eventSeq = 0;

  constructor(callbacks?: NetworkCallbacks) {
    if (callbacks) this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: NetworkCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Subscribe an additional listener without clobbering existing listeners (e.g. App UI + GameEngine).
   */
  public subscribe(listener: NetworkCallbacks): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private emit<K extends keyof NetworkCallbacks>(
    key: K,
    ...args: Parameters<NonNullable<NetworkCallbacks[K]>>
  ): void {
    const primary = this.callbacks[key] as ((...a: unknown[]) => void) | undefined;
    if (primary) {
      primary(...args);
    }
    for (const sub of this.subscribers) {
      const fn = sub[key] as ((...a: unknown[]) => void) | undefined;
      if (fn) {
        fn(...args);
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

  private buildSocketUrl(hostOverride?: string | null): string {
    const pageProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (hostOverride && hostOverride.trim().length > 0) {
      const raw = hostOverride.trim();
      if (raw.startsWith('ws://') || raw.startsWith('wss://')) {
        return raw.endsWith('/ws') ? raw : `${raw.replace(/\/+$/, '')}/ws`;
      }
      if (raw.startsWith('http://')) {
        const clean = raw.replace(/^http:\/\//, '').replace(/\/+$/, '');
        return `ws://${clean.endsWith('/ws') ? clean : `${clean}/ws`}`;
      }
      if (raw.startsWith('https://')) {
        const clean = raw.replace(/^https:\/\//, '').replace(/\/+$/, '');
        return `wss://${clean.endsWith('/ws') ? clean : `${clean}/ws`}`;
      }
      const clean = raw.replace(/\/+$/, '');
      const isPrivateLanIp =
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.0\.0\.1|localhost)(:\d+)?(\/ws)?$/i.test(
          clean
        );
      const proto = isPrivateLanIp && window.location.protocol !== 'https:' ? 'ws:' : pageProtocol;
      return `${proto}//${clean.endsWith('/ws') ? clean : `${clean}/ws`}`;
    }
    return `${pageProtocol}//${window.location.host}/ws`;
  }

  public connect(customHost?: string): Promise<boolean> {
    const nextHost = customHost !== undefined ? (customHost.trim() || null) : this.serverHost;
    const desiredUrl = this.buildSocketUrl(nextHost);

    // If switching between Online server and a custom Local Wi-Fi LAN host, close previous socket first
    if (
      this.ws &&
      this.connectedUrl &&
      this.connectedUrl !== desiredUrl &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      this.shouldStayConnected = false;
      this.stopHeartbeat();
      this.ws.close();
      this.ws = null;
      this.currentRoom = null;
    }

    this.serverHost = nextHost;

    if (
      this.ws &&
      this.connectedUrl === desiredUrl &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      if (this.ws.readyState === WebSocket.OPEN) {
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            clearInterval(check);
            resolve(false);
          } else if (this.ws.readyState === WebSocket.OPEN) {
            clearInterval(check);
            resolve(true);
          }
        }, 40);
      });
    }

    this.shouldStayConnected = true;
    this.isConnecting = true;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      };

      try {
        const socket = new WebSocket(desiredUrl);
        this.ws = socket;
        this.connectedUrl = desiredUrl;

        socket.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('onConnectionChange', true);
          this.startHeartbeat();
          finish(true);
        };

        socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        socket.onclose = () => {
          this.stopHeartbeat();
          this.emit('onConnectionChange', false);
          if (this.ws === socket) {
            this.handleDisconnect();
          }
          finish(false);
        };

        socket.onerror = (err) => {
          console.warn('[NetworkManager] Socket error:', err);
          this.isConnecting = false;
        };
      } catch (err) {
        console.error('[NetworkManager] Connect error:', err);
        this.isConnecting = false;
        finish(false);
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
      this.emit('onError', 'Lost connection to multiplayer game server.');
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingSent = performance.now();
        this.send({ type: 'C2S_PING', clientTime: this.lastPingSent });
      }
    }, 3500);
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

  private nextEventId(prefix = 'ev'): string {
    this.eventSeq = (this.eventSeq + 1) % 1000000000;
    return `${this.localPlayerId ?? 'loc'}_${prefix}_${this.eventSeq}_${Date.now().toString(36)}`;
  }

  private handleMessage(rawData: string): void {
    try {
      const msg = JSON.parse(rawData) as ServerMessage;

      switch (msg.type) {
        case 'S2C_ROOM_CREATED':
        case 'S2C_ROOM_JOINED': {
          this.currentRoom = msg.room;
          this.localPlayerId = msg.playerId;
          this.emit('onRoomUpdate', this.currentRoom);
          break;
        }

        case 'S2C_ROOM_STATE': {
          this.currentRoom = msg.room;
          this.emit('onRoomUpdate', this.currentRoom);
          break;
        }

        case 'S2C_PLAYER_JOINED': {
          if (this.currentRoom) {
            const exists = this.currentRoom.players.some((p) => p.id === msg.player.id);
            if (!exists) {
              this.currentRoom.players.push(msg.player);
              this.emit('onRoomUpdate', this.currentRoom);
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
              for (const p of this.currentRoom.players) {
                p.isHost = p.id === msg.newHostId;
              }
            }
            this.emit('onPlayerLeft', msg.playerId, msg.playerName, msg.newHostName);
            this.emit('onRoomUpdate', this.currentRoom);
          }
          break;
        }

        case 'S2C_HOST_CHANGED': {
          if (this.currentRoom) {
            this.currentRoom.hostId = msg.newHostId;
            for (const p of this.currentRoom.players) {
              p.isHost = p.id === msg.newHostId;
            }
            this.emit('onHostChanged', msg.newHostId, msg.newHostName);
            this.emit('onRoomUpdate', this.currentRoom);
          }
          break;
        }

        case 'S2C_GAME_STARTED': {
          if (this.currentRoom) {
            this.currentRoom.inGame = true;
            this.currentRoom.seed = msg.seed;
            this.currentRoom.floorNumber = msg.floorNumber;
            this.currentRoom.difficulty = msg.difficulty;
          }
          this.emit('onRoomUpdate', this.currentRoom);
          this.emit('onGameStart', msg.seed, msg.floorNumber, msg.difficulty);
          break;
        }

        case 'S2C_SYNC_WORLD': {
          this.emit('onWorldSync', {
            players: msg.players,
            enemies: msg.enemies,
            enemyProjectiles: msg.enemyProjectiles,
            roomsState: msg.roomsState,
            spawnedProps: msg.spawnedProps,
            brokenPropIds: msg.brokenPropIds,
            activeRoomId: msg.activeRoomId,
            wavesRemaining: msg.wavesRemaining,
            currentWave: msg.currentWave,
            totalWaves: msg.totalWaves,
          });
          break;
        }

        case 'S2C_WAVE_EVENT': {
          this.emit('onWaveEvent', {
            roomId: msg.roomId,
            bannerText: msg.bannerText,
            currentWave: msg.currentWave,
            totalWaves: msg.totalWaves,
            isBoss: msg.isBoss,
            isCleared: msg.isCleared,
          });
          break;
        }

        case 'S2C_PARTY_ROOM_PULL': {
          this.emit('onPartyRoomPull', msg.roomId, msg.x, msg.y);
          break;
        }

        case 'S2C_ENEMY_ATTACK_FX': {
          this.emit('onEnemyAttackFx', msg.kind, msg.x, msg.y, msg.angle);
          break;
        }

        case 'S2C_ENEMY_DAMAGED': {
          this.emit(
            'onEnemyDamaged',
            msg.enemyId,
            msg.newHp,
            msg.maxHp,
            msg.damageDealt,
            msg.isCrit,
            msg.hitX,
            msg.hitY,
            msg.attackerId
          );
          break;
        }

        case 'S2C_ENEMY_DEFEATED': {
          this.emit(
            'onEnemyDefeated',
            msg.enemyId,
            msg.killerId,
            msg.dropX,
            msg.dropY,
            msg.kind
          );
          break;
        }

        case 'S2C_PLAYER_DAMAGED': {
          this.emit('onPlayerDamaged', {
            targetPlayerId: msg.targetPlayerId,
            damage: msg.damage,
            newHp: msg.newHp,
            maxHp: msg.maxHp,
            evaded: msg.evaded,
            ribBlocked: msg.ribBlocked,
            isProjectile: msg.isProjectile,
          });
          break;
        }

        case 'S2C_PLAYER_DOWNED': {
          this.emit('onPlayerDowned', msg.playerId, msg.playerName);
          break;
        }

        case 'S2C_REMOTE_SKILL': {
          this.emit(
            'onRemoteSkill',
            msg.playerId,
            msg.skillId,
            msg.x,
            msg.y,
            msg.angle,
            msg.slot,
            msg.targetX,
            msg.targetY
          );
          break;
        }

        case 'S2C_PROP_OPENED': {
          this.emit('onPropOpened', msg.propId, msg.kind, msg.x, msg.y, msg.openerId);
          break;
        }

        case 'S2C_PLAYER_REVIVED': {
          this.emit(
            'onPlayerRevived',
            msg.revivedPlayerId,
            msg.reviverPlayerId,
            msg.reviveHp,
            msg.maxHp
          );
          break;
        }

        case 'S2C_FLOOR_SYNC': {
          if (this.currentRoom) {
            this.currentRoom.floorNumber = msg.floorNumber;
            this.currentRoom.seed = msg.seed;
            this.currentRoom.difficulty = msg.difficulty;
          }
          this.emit('onRoomUpdate', this.currentRoom);
          this.emit('onFloorSync', msg.floorNumber, msg.seed, msg.difficulty);
          break;
        }

        case 'S2C_PARTY_VICTORY': {
          if (this.currentRoom) {
            this.currentRoom.inGame = false;
          }
          this.emit('onPartyVictory', msg.difficulty, msg.floorNumber);
          break;
        }

        case 'S2C_PARTY_WIPE': {
          if (this.currentRoom) {
            this.currentRoom.inGame = false;
          }
          this.emit('onPartyWipe');
          break;
        }

        case 'S2C_RETURN_TO_GUILD': {
          if (this.currentRoom) {
            this.currentRoom.inGame = true;
            this.currentRoom.floorNumber = 0;
          }
          this.emit('onRoomUpdate', this.currentRoom);
          this.emit('onReturnToGuild');
          break;
        }

        case 'S2C_PONG': {
          const now = performance.now();
          this.currentPing = Math.max(1, Math.round(now - msg.clientTime));
          break;
        }

        case 'S2C_PVP_SYNC': {
          this.emit('onPvpSync', msg.matchState);
          break;
        }

        case 'S2C_PVP_BASE_DAMAGED': {
          this.emit(
            'onPvpBaseDamaged',
            msg.team,
            msg.newHp,
            msg.maxHp,
            msg.damage,
            msg.attackerId,
            msg.hitX,
            msg.hitY
          );
          break;
        }

        case 'S2C_PVP_BASE_DESTROYED': {
          this.emit('onPvpBaseDestroyed', msg.winningTeam, msg.destroyedTeam);
          break;
        }

        case 'S2C_PVP_PLAYER_ELIMINATED': {
          this.emit(
            'onPvpPlayerEliminated',
            msg.victimId,
            msg.victimName,
            msg.victimTeam,
            msg.killerId,
            msg.killerName,
            msg.killerTeam,
            msg.respawnDelay
          );
          break;
        }

        case 'S2C_PVP_PLAYER_RESPAWNED': {
          this.emit('onPvpPlayerRespawned', msg.playerId, msg.x, msg.y, msg.hp, msg.maxHp);
          break;
        }

        case 'S2C_PVP_MINION_ATTACK_FX': {
          this.emit(
            'onPvpMinionAttackFx',
            msg.minionId,
            msg.team,
            msg.kind,
            msg.x,
            msg.y,
            msg.targetX,
            msg.targetY
          );
          break;
        }

        case 'S2C_PVP_MINION_DAMAGED': {
          this.emit(
            'onPvpMinionDamaged',
            msg.minionId,
            msg.newHp,
            msg.maxHp,
            msg.damage,
            msg.isCrit,
            msg.hitX,
            msg.hitY,
            msg.attackerId
          );
          break;
        }

        case 'S2C_PVP_MINION_DEFEATED': {
          this.emit('onPvpMinionDefeated', msg.minionId, msg.killerId, msg.dropX, msg.dropY);
          break;
        }

        case 'S2C_PVP_MATCH_ENDED': {
          this.emit(
            'onPvpMatchEnded',
            msg.winningTeam,
            msg.blueScore,
            msg.redScore,
            msg.matchDuration
          );
          break;
        }

        case 'S2C_ERROR': {
          this.emit('onError', msg.message);
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
    difficulty: DifficultyLevel = DifficultyLevel.Easy,
    customHost?: string
  ): Promise<boolean> {
    const connected = await this.connect(customHost ?? '');
    if (!connected) return false;
    this.send({
      type: 'C2S_CREATE_ROOM',
      playerName,
      characterId,
      mode,
      maxPlayers,
      difficulty,
    });
    return true;
  }

  public async joinRoom(
    code: string,
    playerName: string,
    characterId: CharacterId,
    customHost?: string
  ): Promise<boolean> {
    const connected = await this.connect(customHost ?? '');
    if (!connected) return false;
    this.send({
      type: 'C2S_JOIN_ROOM',
      code: code.trim().toUpperCase(),
      playerName,
      characterId,
    });
    return true;
  }

  public leaveRoom(): void {
    this.send({ type: 'C2S_LEAVE_ROOM' });
    this.currentRoom = null;
    this.emit('onRoomUpdate', null);
  }

  public setReady(ready: boolean): void {
    this.send({ type: 'C2S_SET_READY', ready });
  }

  public selectCharacter(characterId: CharacterId): void {
    this.send({ type: 'C2S_SELECT_CHARACTER', characterId });
  }

  public setDifficulty(difficulty: DifficultyLevel): void {
    this.send({ type: 'C2S_SET_DIFFICULTY', difficulty });
  }

  public promoteLeader(targetPlayerId: string): void {
    this.send({ type: 'C2S_PROMOTE_LEADER', targetPlayerId });
  }

  public startGame(difficulty?: DifficultyLevel): void {
    this.send({ type: 'C2S_START_GAME', difficulty });
  }

  public startDungeonRun(difficulty: DifficultyLevel): void {
    this.send({ type: 'C2S_START_DUNGEON_RUN', difficulty });
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
    hitY = 0,
    statusEffects?: EnemyStatusPayload
  ): void {
    if (!this.localPlayerId) return;
    this.send({
      type: 'C2S_DAMAGE_ENEMY',
      eventId: this.nextEventId('hit'),
      enemyId,
      damage,
      isCrit,
      hitX,
      hitY,
      attackerId: this.localPlayerId,
      statusEffects,
    });
  }

  public sendPlayerHeal(amount: number, maxHp?: number): void {
    if (!this.localPlayerId || amount <= 0) return;
    this.send({
      type: 'C2S_PLAYER_HEAL',
      eventId: this.nextEventId('heal'),
      amount: Math.round(amount),
      maxHp,
    });
  }

  public sendCastSkill(
    skillId: string,
    x: number,
    y: number,
    angle: number,
    slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE',
    targetX?: number,
    targetY?: number
  ): void {
    this.send({
      type: 'C2S_CAST_SKILL',
      skillId,
      x: +x.toFixed(1),
      y: +y.toFixed(1),
      angle: +angle.toFixed(2),
      slot,
      targetX: targetX !== undefined ? +targetX.toFixed(1) : undefined,
      targetY: targetY !== undefined ? +targetY.toFixed(1) : undefined,
    });
  }

  public sendInteractProp(propId: number): void {
    this.send({
      type: 'C2S_INTERACT_PROP',
      propId,
    });
  }

  public sendReviveProgress(targetPlayerId: string, progress: number): void {
    this.send({
      type: 'C2S_REVIVE_PLAYER',
      targetPlayerId,
      progress,
    });
  }

  public sendAdvanceFloor(floorNumber: number, seed?: number): void {
    this.send({
      type: 'C2S_ADVANCE_FLOOR',
      floorNumber,
      seed,
    });
  }

  public sendClaimVictory(): void {
    this.send({
      type: 'C2S_CLAIM_VICTORY',
    });
  }

  public sendReturnPartyToGuild(): void {
    this.send({
      type: 'C2S_RETURN_PARTY_TO_GUILD',
    });
  }

  public sendDamagePvpPlayer(
    targetPlayerId: string,
    damage: number,
    isCrit = false,
    hitX = 0,
    hitY = 0,
    statusEffects?: EnemyStatusPayload
  ): void {
    this.send({
      type: 'C2S_DAMAGE_PVP_PLAYER',
      eventId: this.nextEventId('pvp_hit'),
      targetPlayerId,
      damage,
      isCrit,
      hitX,
      hitY,
      statusEffects,
    });
  }

  public sendDamageBase(
    targetTeam: PvpTeam,
    damage: number,
    isCrit = false,
    hitX = 0,
    hitY = 0
  ): void {
    this.send({
      type: 'C2S_DAMAGE_BASE',
      eventId: this.nextEventId('base_hit'),
      targetTeam,
      damage,
      isCrit,
      hitX,
      hitY,
    });
  }

  public sendDamageMinion(
    minionId: number,
    damage: number,
    isCrit = false,
    hitX = 0,
    hitY = 0,
    statusEffects?: EnemyStatusPayload
  ): void {
    this.send({
      type: 'C2S_DAMAGE_MINION',
      eventId: this.nextEventId('minion_hit'),
      minionId,
      damage,
      isCrit,
      hitX,
      hitY,
      statusEffects,
    });
  }

  public sendSetTeam(team: PvpTeam): void {
    this.send({
      type: 'C2S_SET_TEAM',
      team,
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
    this.connectedUrl = null;
  }
}
