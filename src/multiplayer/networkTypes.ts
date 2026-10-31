import { CharacterId, EnemyKind } from '../types/game';

export type MultiplayerMode = 'ONLINE_COOP' | 'LAN_COOP' | 'ONLINE_PVP' | 'LAN_PVP';

export interface RoomPlayer {
  id: string;
  name: string;
  characterId: CharacterId;
  isHost: boolean;
  isReady: boolean;
  ping: number;
  color: string;
}

export interface RoomInfo {
  code: string;
  mode: MultiplayerMode;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  inGame: boolean;
  seed: number;
  floorNumber: number;
}

export interface EnemySyncState {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facingX: number;
  aiState: 'IDLE' | 'CHASE' | 'WINDUP' | 'ATTACK' | 'COOLDOWN' | 'SUMMONING' | 'WHIRLWIND';
  telegraphType:
    | 'SLASH'
    | 'AIM_ARROW'
    | 'BOSS_CLEAVE'
    | 'BOSS_VOLLEY'
    | 'BOSS_SUMMON'
    | 'BOSS_DASH'
    | 'NONE';
  telegraphAngle: number;
  hitFlashTimer: number;
  stunTimer: number;
  plagueTimer: number;
  infectionStacks: number;
  roomId: number;
}

export interface PlayerTransformSync {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aimAngle: number;
  facingX: number;
  walkPhase: number;
  hp: number;
  maxHp: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  dashTimer: number;
  leapAirProgress: number;
  isAttacking: boolean;
  comboStep: number;
  isDowned?: boolean;
  bleedoutTimer?: number;
  reviveProgress?: number;
  isRevivingPlayerId?: string | null;
  activeBuffs: {
    undying: boolean;
    abomination: boolean;
    ribcageCharges: number;
    boneStorm: boolean;
    colossus: boolean;
    windrunner: boolean;
    fortress: boolean;
    mountainHeart: boolean;
    restless: boolean;
    nightmare: boolean;
  };
}

export type ClientMessage =
  | {
      type: 'C2S_CREATE_ROOM';
      playerName: string;
      characterId: CharacterId;
      mode: MultiplayerMode;
      maxPlayers?: number;
    }
  | {
      type: 'C2S_JOIN_ROOM';
      code: string;
      playerName: string;
      characterId: CharacterId;
    }
  | {
      type: 'C2S_LEAVE_ROOM';
    }
  | {
      type: 'C2S_SET_READY';
      ready: boolean;
    }
  | {
      type: 'C2S_SELECT_CHARACTER';
      characterId: CharacterId;
    }
  | {
      type: 'C2S_START_GAME';
    }
  | {
      type: 'C2S_UPDATE_TRANSFORM';
      transform: PlayerTransformSync;
    }
  | {
      type: 'C2S_DAMAGE_ENEMY';
      enemyId: number;
      damage: number;
      isCrit?: boolean;
      hitX: number;
      hitY: number;
      attackerId: string;
    }
  | {
      type: 'C2S_CAST_SKILL';
      skillId: string;
      x: number;
      y: number;
      angle: number;
      slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE';
    }
  | {
      type: 'C2S_SYNC_ENEMIES';
      roomId: number;
      wavesRemaining: number;
      enemies: EnemySyncState[];
    }
  | {
      type: 'C2S_REVIVE_PLAYER';
      targetPlayerId: string;
      progress: number;
    }
  | {
      type: 'C2S_ADVANCE_FLOOR';
      floorNumber: number;
      seed: number;
    }
  | {
      type: 'C2S_PING';
      clientTime: number;
    };

export type ServerMessage =
  | {
      type: 'S2C_ROOM_CREATED';
      room: RoomInfo;
      playerId: string;
    }
  | {
      type: 'S2C_ROOM_JOINED';
      room: RoomInfo;
      playerId: string;
    }
  | {
      type: 'S2C_ROOM_STATE';
      room: RoomInfo;
    }
  | {
      type: 'S2C_PLAYER_JOINED';
      player: RoomPlayer;
    }
  | {
      type: 'S2C_PLAYER_LEFT';
      playerId: string;
      newHostId?: string;
    }
  | {
      type: 'S2C_HOST_CHANGED';
      newHostId: string;
    }
  | {
      type: 'S2C_GAME_STARTED';
      seed: number;
      floorNumber: number;
    }
  | {
      type: 'S2C_SYNC_WORLD';
      players: PlayerTransformSync[];
      enemies?: EnemySyncState[];
      activeRoomId?: number;
      wavesRemaining?: number;
    }
  | {
      type: 'S2C_ENEMY_DAMAGED';
      enemyId: number;
      newHp: number;
      damageDealt: number;
      isCrit?: boolean;
      hitX: number;
      hitY: number;
      attackerId: string;
    }
  | {
      type: 'S2C_ENEMY_DEFEATED';
      enemyId: number;
      killerId: string;
      dropX: number;
      dropY: number;
    }
  | {
      type: 'S2C_REMOTE_SKILL';
      playerId: string;
      skillId: string;
      x: number;
      y: number;
      angle: number;
      slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE';
    }
  | {
      type: 'S2C_PLAYER_REVIVED';
      revivedPlayerId: string;
      reviverPlayerId: string;
      reviveHp: number;
    }
  | {
      type: 'S2C_FLOOR_SYNC';
      floorNumber: number;
      seed: number;
    }
  | {
      type: 'S2C_PARTY_WIPE';
    }
  | {
      type: 'S2C_PONG';
      clientTime: number;
      serverTime: number;
    }
  | {
      type: 'S2C_ERROR';
      message: string;
      code?: string;
    };
