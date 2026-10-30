export enum GamePhase {
  Title = 'TITLE',
  GuildPicking = 'GUILD_PICKING',
  GuildRoam = 'GUILD_ROAM',
  Dungeon = 'DUNGEON',
  BlessingSelect = 'BLESSING_SELECT',
  Paused = 'PAUSED',
  Victory = 'VICTORY',
  GameOver = 'GAME_OVER',
}

export enum CharacterId {
  Zombie = 'ZOMBIE',
  Skeleton = 'SKELETON',
  Goblin = 'GOBLIN',
  Gnome = 'GNOME',
}

export enum NormalSkillId {
  // Zombie Normal Skills (5)
  RottingClaw = 'ROTTING_CLAW',
  PlagueBurst = 'PLAGUE_BURST',
  FleshRipper = 'FLESH_RIPPER',
  UndyingFlesh = 'UNDYING_FLESH',
  GraveCall = 'GRAVE_CALL',

  // Skeleton Normal Skills (5)
  BoneSlash = 'BONE_SLASH',
  BoneSpear = 'BONE_SPEAR',
  RibcageShield = 'RIBCAGE_SHIELD',
  SkeletalRush = 'SKELETAL_RUSH',
  BoneStorm = 'BONE_STORM',

  // Goblin Normal Skills (5)
  DaggerFlurry = 'DAGGER_FLURRY',
  Shadowstep = 'SHADOWSTEP',
  ExplosiveTrap = 'EXPLOSIVE_TRAP',
  Windrunner = 'WINDRUNNER',
  PoisonedBlades = 'POISONED_BLADES',

  // Gnome Normal Skills (5)
  IronFist = 'IRON_FIST',
  FortressStance = 'FORTRESS_STANCE',
  Groundbreaker = 'GROUNDBREAKER',
  MagneticGuard = 'MAGNETIC_GUARD',
  EarthenGrasp = 'EARTHEN_GRASP',
}

export enum UltimateSkillId {
  // Zombie Ultimate Skills (3)
  AbominationForm = 'ABOMINATION_FORM',
  KingdomOfTheDead = 'KINGDOM_OF_THE_DEAD',
  DeathsEmbrace = 'DEATHS_EMBRACE',

  // Skeleton Ultimate Skills (3)
  BoneColossus = 'BONE_COLOSSUS',
  ArmyOfBones = 'ARMY_OF_BONES',
  ReapersJudgment = 'REAPERS_JUDGMENT',

  // Goblin Ultimate Skills (3)
  PhantomFrenzy = 'PHANTOM_FRENZY',
  KingOfThieves = 'KING_OF_THIEVES',
  ThousandDaggers = 'THOUSAND_DAGGERS',

  // Gnome Ultimate Skills (3)
  MountainsHeart = 'MOUNTAINS_HEART',
  TitansRampart = 'TITANS_RAMPART',
  CataclysmicSlam = 'CATACLYSMIC_SLAM',
}

export enum PassiveSkillId {
  // Zombie Passives (2)
  CarrionHunger = 'CARRION_HUNGER',
  InfectiousTouch = 'INFECTIOUS_TOUCH',

  // Skeleton Passives (2)
  EternalFramework = 'ETERNAL_FRAMEWORK',
  UnyieldingBones = 'UNYIELDING_BONES',

  // Goblin Passives (2)
  NimbleReflexes = 'NIMBLE_REFLEXES',
  OpportunisticPredator = 'OPPORTUNISTIC_PREDATOR',

  // Gnome Passives (2)
  UnbreakableFoundation = 'UNBREAKABLE_FOUNDATION',
  LastingResolve = 'LASTING_RESOLVE',
}

export enum EnemyKind {
  SkeletonWarrior = 'SKELETON_WARRIOR',
  SkeletonArcher = 'SKELETON_ARCHER',
  SkeletonBoss = 'SKELETON_BOSS',
  TrainingDummy = 'TRAINING_DUMMY',
}

export enum RoomKind {
  Start = 'START',
  Combat = 'COMBAT',
  Shrine = 'SHRINE',
  Boss = 'BOSS',
}

export interface NormalSkillDef {
  id: NormalSkillId;
  characterId: CharacterId;
  name: string;
  tag: string;
  cooldown: number;
  description: string;
  detailLine: string;
  accentColor: string;
}

export interface UltimateSkillDef {
  id: UltimateSkillId;
  characterId: CharacterId;
  name: string;
  tag: string;
  cooldown: number;
  energyRequired: number;
  description: string;
  detailLine: string;
  accentColor: string;
}

export interface PassiveSkillDef {
  id: PassiveSkillId;
  characterId: CharacterId;
  name: string;
  tag: string;
  description: string;
  detailLine: string;
}

export interface EquippedLoadout {
  normalSkills: [NormalSkillId, NormalSkillId];
  ultimateSkill: UltimateSkillId;
}

export type UpgradeNodeSlot = 'pathA' | 'pathB' | 'pathC' | 'pathD' | 'pathE';

export type CharacterUpgradeRanks = Record<UpgradeNodeSlot, number>;

export interface GuildSaveData {
  selectedCharacter: CharacterId;
  soulShards: number;
  totalRuns: number;
  victories: number;
  totalSkeletonsSlain: number;
  characterUpgrades: Record<CharacterId, CharacterUpgradeRanks>;
  loadouts: Record<CharacterId, EquippedLoadout>;
  muted: boolean;
}

export interface RunBlessing {
  id: string;
  characterId: CharacterId;
  name: string;
  category: string;
  description: string;
  requiredNormalSkill?: NormalSkillId;
  requiredUltimateSkill?: UltimateSkillId;
}

export interface ProceduralSkeletonTraits {
  skullVariant: 0 | 1 | 2;
  hoodColor: string;
  boneTint: string;
  weaponVariant: 0 | 1;
  hasBuckler: boolean;
  scale: number;
}

export interface EnemyEntity {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  facing: number;
  facingX: number;
  walkPhase: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;

  slowTimer: number;
  slowFactor: number;
  stunTimer: number;
  rootTimer: number;
  infectionStacks: number;
  infectionTimer: number;
  plagueTimer: number;

  aiState: 'IDLE' | 'CHASE' | 'WINDUP' | 'ATTACK' | 'COOLDOWN' | 'SUMMONING' | 'WHIRLWIND';
  stateTimer: number;
  attackCooldown: number;
  telegraphAngle: number;
  telegraphType:
    | 'SLASH'
    | 'AIM_ARROW'
    | 'BOSS_CLEAVE'
    | 'BOSS_VOLLEY'
    | 'BOSS_SUMMON'
    | 'BOSS_DASH'
    | 'NONE';
  bossPhase: number;
  bossPatternIndex: number;
  roomId: number;
  traits: ProceduralSkeletonTraits;
}

export interface MinionEntity {
  id: number;
  minionType: 'ZOMBIE_SHAMBLER' | 'SKELETON_WARRIOR_ALLY';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  lifeTimer: number;
  maxLife: number;
  attackCooldown: number;
  walkPhase: number;
  hitFlashTimer: number;
  facingX: number;
  sproutVariant: 0 | 1 | 2;
  spawnAnimTimer: number;
}

export interface ProjectileEntity {
  id: number;
  fromPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  color: string;
  kind:
    | 'BONE_ARROW'
    | 'BOSS_BOLT'
    | 'PLAGUE_SPIT'
    | 'PLAYER_BONE_SPEAR'
    | 'PLAYER_DARK_WAVE'
    | 'PLAYER_ENCHANTED_DAGGER';
  angle: number;
  pierce?: boolean;
  hitEnemyIds?: Set<number>;
}

export interface ExplosiveTrapEntity {
  id: number;
  x: number;
  y: number;
  triggerRadius: number;
  blastRadius: number;
  damage: number;
  armTimer: number;
  life: number;
}

export interface AfterimageEntity {
  x: number;
  y: number;
  facingX: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface DaggerRainZone {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  damagePerVolley: number;
}

export interface EarthenGraspZone {
  id: number;
  targetEnemyId: number | null;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  damagePerTick: number;
}

export interface StoneRampartEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  angle: number;
  life: number;
  maxLife: number;
}

export interface PoisonCloudEntity {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  damagePerTick: number;
}

export interface PickupOrb {
  id: number;
  kind: 'ESSENCE_HEAL' | 'SOUL_SHARD' | 'XP_ORB' | 'GOLD_COIN';
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  life: number;
  bobOffset: number;
}

export interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  radius: number;
  arcSpread: number;
  color: string;
  life: number;
  maxLife: number;
  flip: boolean;
  kind?: 'DEFAULT' | 'ZOMBIE_BASIC_ATTACK' | 'ZOMBIE_POISON_BURST';
  scale?: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface SoulTether {
  fromX: number;
  fromY: number;
  life: number;
  maxLife: number;
}

export interface FloatingPopup {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  fade: boolean;
}

export interface RoomProp {
  id: number;
  kind:
    | 'TOMBSTONE_ROUND'
    | 'TOMBSTONE_CROSS'
    | 'CRYPT_PILLAR'
    | 'LANTERN_POST'
    | 'BONE_URN'
    | 'WOOD_CRATE'
    | 'SHRINE_ALTAR'
    | 'PORTAL_ARCH'
    | 'CHEST'
    | 'HEARTH_FIRE'
    | 'GUILD_COUCH'
    | 'GUILD_BOOKSHELF'
    | 'GUILD_CAULDRON'
    | 'GUILD_DOOR';
  x: number;
  y: number;
  w: number;
  h: number;
  solid: boolean;
  destructible: boolean;
  hp: number;
  opened?: boolean;
}

export interface DungeonRoom {
  id: number;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: RoomKind;
  discovered: boolean;
  cleared: boolean;
  locked: boolean;
  wavesRemaining: number;
  connections: { dir: 'N' | 'S' | 'E' | 'W'; targetRoomId: number }[];
}

export interface MinimapRoomInfo {
  id: number;
  gridX: number;
  gridY: number;
  kind: RoomKind;
  discovered: boolean;
  cleared: boolean;
  isCurrent: boolean;
  hasExitDoor: boolean;
  exitUnlocked: boolean;
  exitPosition?: { normX: number; normY: number };
  playerPosition?: { normX: number; normY: number };
  connections: ('N' | 'S' | 'E' | 'W')[];
}

export interface GuildCompanionRenderState {
  characterId: CharacterId;
  x: number;
  y: number;
  facingX: number;
  label: string;
}

export interface HudSnapshot {
  phase: GamePhase;
  activeCharacter: CharacterId;
  hp: number;
  maxHp: number;
  undyingTimer: number;
  abominationTimer: number;
  ribcageTimer: number;
  ribcageCharges: number;
  boneStormTimer: number;
  colossusTimer: number;
  unyieldingStacks: number;
  windrunnerTimer: number;
  poisonBladesTimer: number;
  stolenMightTimer: number;
  fortressTimer: number;
  magneticTimer: number;
  mountainHeartTimer: number;
  resolveBonusPct: number;
  ultCharge: number; // 0 to 100
  ultCooldown: number;
  ultMaxCooldown: number;
  normalCooldowns: [number, number];
  normalMaxCooldowns: [number, number];
  activeMinions: number;
  floorNumber: number; // 0 = Guild, 1, 2, 3
  floorLabel: string;
  runLevel: number;
  runXp: number;
  runXpNext: number;
  runCoins: number;
  runShardsEarned: number;
  runKills: number;
  runDamageDealt: number;
  activeBlessings: string[];
  interactPrompt: string | null;
  roomBannerText: string | null;
  bossInfo: {
    name: string;
    subtitle: string;
    hp: number;
    maxHp: number;
  } | null;
  minimap: MinimapRoomInfo[];
  mapPan: {
    gridOffsetX: number;
    gridOffsetY: number;
    isPanned: boolean;
  };
}
