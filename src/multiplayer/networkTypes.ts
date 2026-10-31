import { CharacterId, DifficultyLevel, EnemyKind } from '../types/game';

export type MultiplayerMode = 'ONLINE_COOP' | 'LAN_COOP' | 'ONLINE_PVP' | 'LAN_PVP';

export type PvpTeam = 'BLUE' | 'RED';

export interface RoomPlayer {
  id: string;
  name: string;
  characterId: CharacterId;
  isHost: boolean;
  isReady: boolean;
  ping: number;
  color: string;
  team?: PvpTeam;
  kills?: number;
  deaths?: number;
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
  difficulty: DifficultyLevel;
}

export interface EnemyStatusPayload {
  stunDuration?: number;
  slowDuration?: number;
  slowFactor?: number;
  rootDuration?: number;
  fearDuration?: number;
  infectionStacksToAdd?: number;
  plagueDuration?: number;
  vulnerableDuration?: number;
  hunterMarkStacks?: number;
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
  slowTimer?: number;
  rootTimer?: number;
  fearTimer?: number;
  vulnerableTimer?: number;
  plagueTimer: number;
  infectionStacks: number;
  roomId: number;
  bossPhase?: 1 | 2;
}

export interface EnemyProjectileSyncState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  kind: 'BONE_ARROW' | 'BOSS_BOLT';
  color: string;
  angle: number;
}

export interface RoomProgressSyncState {
  id: number;
  discovered: boolean;
  locked: boolean;
  cleared: boolean;
  wavesRemaining: number;
}

export interface SpawnedPropSyncState {
  id: number;
  kind: 'CHEST' | 'PORTAL_ARCH';
  x: number;
  y: number;
  w: number;
  h: number;
  opened?: boolean;
}

export interface PvpMinionSyncState {
  id: number;
  team: PvpTeam;
  kind: 'MELEE' | 'RANGED';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facingX: number;
  aiState: 'MARCH' | 'ATTACK' | 'COOLDOWN' | 'DEATH';
  attackAngle: number;
  hitFlashTimer: number;
}

export interface PvpBaseSyncState {
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  isDestroyed: boolean;
  hitFlashTimer: number;
}

export interface PvpPlayerStats {
  kills: number;
  deaths: number;
  damage: number;
  respawnTimer: number;
  invulnTimer: number;
}

export interface PvpMatchSyncState {
  blueBase: PvpBaseSyncState;
  redBase: PvpBaseSyncState;
  minions: PvpMinionSyncState[];
  matchTime: number;
  blueScore: number;
  redScore: number;
  playerStats: Record<string, PvpPlayerStats>;
  isMatchEnded: boolean;
  winnerTeam?: PvpTeam;
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
  comboFlip?: boolean;
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
    poisonBlades?: boolean;
    stolenMight?: boolean;
    fortress: boolean;
    magnetic?: boolean;
    mountainHeart: boolean;
    restless: boolean;
    soulDrain?: boolean;
    nightmare: boolean;
    tinkerHaste?: boolean;
    rapidReload?: boolean;
    arsenal?: boolean;
  };
}

export type ClientMessage =
  | {
      type: 'C2S_CREATE_ROOM';
      playerName: string;
      characterId: CharacterId;
      mode: MultiplayerMode;
      maxPlayers?: number;
      difficulty?: DifficultyLevel;
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
      type: 'C2S_SET_DIFFICULTY';
      difficulty: DifficultyLevel;
    }
  | {
      type: 'C2S_PROMOTE_LEADER';
      targetPlayerId: string;
    }
  | {
      type: 'C2S_START_GAME';
      difficulty?: DifficultyLevel;
    }
  | {
      type: 'C2S_START_DUNGEON_RUN';
      difficulty: DifficultyLevel;
    }
  | {
      type: 'C2S_UPDATE_TRANSFORM';
      transform: PlayerTransformSync;
    }
  | {
      type: 'C2S_DAMAGE_ENEMY';
      eventId: string;
      enemyId: number;
      damage: number;
      isCrit?: boolean;
      hitX: number;
      hitY: number;
      attackerId: string;
      statusEffects?: EnemyStatusPayload;
    }
  | {
      type: 'C2S_PLAYER_HEAL';
      eventId: string;
      amount: number;
      maxHp?: number;
    }
  | {
      type: 'C2S_CAST_SKILL';
      skillId: string;
      x: number;
      y: number;
      angle: number;
      slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE';
      targetX?: number;
      targetY?: number;
    }
  | {
      type: 'C2S_INTERACT_PROP';
      propId: number;
    }
  | {
      type: 'C2S_REVIVE_PLAYER';
      targetPlayerId: string;
      progress: number;
    }
  | {
      type: 'C2S_ADVANCE_FLOOR';
      floorNumber: number;
      seed?: number;
    }
  | {
      type: 'C2S_CLAIM_VICTORY';
    }
  | {
      type: 'C2S_RETURN_PARTY_TO_GUILD';
    }
  | {
      type: 'C2S_DAMAGE_PVP_PLAYER';
      eventId: string;
      targetPlayerId: string;
      damage: number;
      isCrit?: boolean;
      hitX: number;
      hitY: number;
      statusEffects?: EnemyStatusPayload;
    }
  | {
      type: 'C2S_DAMAGE_BASE';
      eventId: string;
      targetTeam: PvpTeam;
      damage: number;
      isCrit?: boolean;
      hitX: number;
      hitY: number;
    }
  | {
      type: 'C2S_DAMAGE_MINION';
      eventId: string;
      minionId: number;
      damage: number;
      isCrit?: boolean;
      hitX: number;
      hitY: number;
      statusEffects?: EnemyStatusPayload;
    }
  | {
      type: 'C2S_SET_TEAM';
      team: PvpTeam;
    }
  | {
      type: 'C2S_REQUEST_REMATCH';
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
      playerName?: string;
      newHostId?: string;
      newHostName?: string;
    }
  | {
      type: 'S2C_HOST_CHANGED';
      newHostId: string;
      newHostName?: string;
    }
  | {
      type: 'S2C_GAME_STARTED';
      seed: number;
      floorNumber: number;
      difficulty: DifficultyLevel;
    }
  | {
      type: 'S2C_SYNC_WORLD';
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
  | {
      type: 'S2C_WAVE_EVENT';
      roomId: number;
      bannerText: string;
      currentWave: number;
      totalWaves: number;
      isBoss?: boolean;
      isCleared?: boolean;
    }
  | {
      type: 'S2C_PARTY_ROOM_PULL';
      roomId: number;
      x: number;
      y: number;
    }
  | {
      type: 'S2C_ENEMY_ATTACK_FX';
      kind: 'WARRIOR_SLASH' | 'ARCHER_SHOT' | 'BOSS_CLEAVE' | 'BOSS_VOLLEY' | 'BOSS_SUMMON' | 'BOSS_DASH';
      x: number;
      y: number;
      angle: number;
    }
  | {
      type: 'S2C_ENEMY_DAMAGED';
      enemyId: number;
      newHp: number;
      maxHp: number;
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
      kind?: EnemyKind;
    }
  | {
      type: 'S2C_PLAYER_DAMAGED';
      targetPlayerId: string;
      damage: number;
      newHp: number;
      maxHp: number;
      evaded?: boolean;
      ribBlocked?: boolean;
      isProjectile?: boolean;
    }
  | {
      type: 'S2C_PLAYER_DOWNED';
      playerId: string;
      playerName: string;
    }
  | {
      type: 'S2C_REMOTE_SKILL';
      playerId: string;
      skillId: string;
      x: number;
      y: number;
      angle: number;
      slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE';
      targetX?: number;
      targetY?: number;
    }
  | {
      type: 'S2C_PROP_OPENED';
      propId: number;
      kind: 'CHEST' | 'SHRINE_ALTAR' | 'DESTRUCTIBLE';
      x: number;
      y: number;
      openerId: string;
    }
  | {
      type: 'S2C_PLAYER_REVIVED';
      revivedPlayerId: string;
      reviverPlayerId: string;
      reviveHp: number;
      maxHp?: number;
    }
  | {
      type: 'S2C_FLOOR_SYNC';
      floorNumber: number;
      seed: number;
      difficulty: DifficultyLevel;
    }
  | {
      type: 'S2C_PARTY_VICTORY';
      difficulty: DifficultyLevel;
      floorNumber: number;
    }
  | {
      type: 'S2C_PARTY_WIPE';
    }
  | {
      type: 'S2C_RETURN_TO_GUILD';
    }
  | {
      type: 'S2C_PVP_SYNC';
      matchState: PvpMatchSyncState;
    }
  | {
      type: 'S2C_PVP_BASE_DAMAGED';
      team: PvpTeam;
      newHp: number;
      maxHp: number;
      damage: number;
      attackerId: string;
      hitX: number;
      hitY: number;
    }
  | {
      type: 'S2C_PVP_BASE_DESTROYED';
      winningTeam: PvpTeam;
      destroyedTeam: PvpTeam;
    }
  | {
      type: 'S2C_PVP_MATCH_ENDED';
      winningTeam: PvpTeam;
      blueScore: number;
      redScore: number;
      matchDuration: number;
    }
  | {
      type: 'S2C_PVP_PLAYER_ELIMINATED';
      victimId: string;
      victimName: string;
      victimTeam: PvpTeam;
      killerId: string;
      killerName: string;
      killerTeam: PvpTeam;
      respawnDelay: number;
    }
  | {
      type: 'S2C_PVP_PLAYER_RESPAWNED';
      playerId: string;
      x: number;
      y: number;
      hp: number;
      maxHp: number;
    }
  | {
      type: 'S2C_PVP_MINION_ATTACK_FX';
      minionId: number;
      team: PvpTeam;
      kind: 'MELEE' | 'RANGED';
      x: number;
      y: number;
      targetX: number;
      targetY: number;
    }
  | {
      type: 'S2C_PVP_MINION_DAMAGED';
      minionId: number;
      newHp: number;
      maxHp: number;
      damage: number;
      isCrit?: boolean;
      hitX: number;
      hitY: number;
      attackerId: string;
    }
  | {
      type: 'S2C_PVP_MINION_DEFEATED';
      minionId: number;
      killerId: string;
      dropX: number;
      dropY: number;
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
