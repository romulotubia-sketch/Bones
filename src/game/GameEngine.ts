import { soundEngine } from '../audio/soundEngine';
import {
  CHARACTER_LIST,
  CHARACTER_ROSTER,
  CharacterProfileDef,
  EMPTY_UPGRADE_RANKS,
  getEligibleStatueBlessings,
  NORMAL_SKILLS,
  ULTIMATE_SKILLS,
} from '../data/zombieData';
import {
  AfterimageEntity,
  CharacterId,
  CharacterUpgradeRanks,
  DaggerRainZone,
  EarthenGraspZone,
  EnemyEntity,
  EnemyKind,
  EquippedLoadout,
  ExplosiveTrapEntity,
  FloatingPopup,
  GamePhase,
  GuildCompanionRenderState,
  GuildSaveData,
  HudSnapshot,
  MinimapRoomInfo,
  MinionEntity,
  NormalSkillId,
  Particle,
  PickupOrb,
  PoisonCloudEntity,
  ProjectileEntity,
  RoomKind,
  RunBlessing,
  ShockwaveRing,
  SlashEffect,
  SoulTether,
  StoneRampartEntity,
  UltimateSkillId,
} from '../types/game';
import { clientToLandscapePoint } from '../utils/orientation';
import {
  allocEntityId,
  buildGraveyardFloor,
  buildGuildWorld,
  createProceduralSkeleton,
  GeneratedWorld,
  spawnRoomWave,
} from './dungeonGenerator';
import { renderGameWorld } from './renderer';

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onOpenLoadout: (charId?: CharacterId) => void;
  onOfferBlessings: (choices: RunBlessing[]) => void;
  onRunFinished: (victory: boolean, shardsEarned: number, kills: number, damageDealt: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;
  private saveData: GuildSaveData;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private hudSyncAccum = 0;

  private stageWidth = 844;
  private stageHeight = 390;

  private phase: GamePhase = GamePhase.Title;
  private world: GeneratedWorld;

  // Pure Mobile Input State (Virtual Joystick + Touch Action Pad)
  private joyX = 0;
  private joyY = 0;
  private attackHeld = false;
  private bufferedActions = new Map<string, number>();

  // Camera & game feel
  private cameraX = -60;
  private cameraY = 8;
  private mapPanX = 0;
  private mapPanY = 0;
  private shakeMag = 0;
  private hitstopTimer = 0;

  // Screen-Drag Map Joystick State
  private panPointerId: number | null = null;
  private panStartX = 0;
  private panStartY = 0;
  private panKnobX = 0;
  private panKnobY = 0;
  private panPrevX = 0;
  private panPrevY = 0;
  private panJoyX = 0;
  private panJoyY = 0;
  private isDraggingMap = false;
  private pointerDownTime = 0;
  private minimapJoyX = 0;
  private minimapJoyY = 0;

  // Player state (supports both Zombie and Skeleton heroes)
  private player = {
    characterId: CharacterId.Zombie as CharacterId,
    x: -195,
    y: -30,
    vx: 0,
    vy: 0,
    radius: 17,
    hp: 130,
    maxHp: 130,
    speed: 196,
    aimAngle: 0,
    facingX: 1,
    walkPhase: 0,
    hitFlashTimer: 0,
    invulnTimer: 0,
    squashX: 1,
    squashY: 1,
    basicAttackCooldown: 0,
    comboFlip: false,
    normalCooldowns: [0, 0] as [number, number],
    normalMaxCooldowns: [4, 8] as [number, number],
    ultCharge: 100,
    ultCooldown: 0,
    ultMaxCooldown: 20,

    // Active Zombie, Skeleton, Goblin & Gnome skill states
    rottingComboRemaining: 0,
    rottingComboTotal: 3,
    rottingComboTimer: 0,
    dashTimer: 0,
    dashKind: 'FLESH_RIPPER' as 'FLESH_RIPPER' | 'SKELETAL_RUSH' | 'GROUNDBREAKER_LEAP',
    dashSlotIndex: 0 as 0 | 1,
    dashRefunded: false,
    dashAngle: 0,
    dashHitIds: new Set<number>(),
    undyingTimer: 0,
    undyingHealTick: 0,
    abominationTimer: 0,
    abomStompTick: 0,

    // Skeleton active states & passives
    ribcageTimer: 0,
    ribcageCharges: 0,
    boneStormTimer: 0,
    boneStormTick: 0,
    colossusTimer: 0,
    colossusShockTick: 0,
    unyieldingStacks: 0,
    unyieldingTimer: 0,

    // Goblin active states & passives
    windrunnerTimer: 0,
    reflexBurstTimer: 0,
    poisonBladesTimer: 0,
    stolenMightTimer: 0,
    flurryRemaining: 0,
    flurryTotal: 5,
    flurryTimer: 0,
    phantomRemaining: 0,
    phantomTotal: 8,
    phantomTimer: 0,
    kingThievesRemaining: 0,
    kingThievesTimer: 0,
    zombieClawStrikeCount: 0,

    // Gnome active states & passives
    fortressTimer: 0,
    fortressTremorTick: 0,
    magneticTimer: 0,
    magneticZapTick: 0,
    mountainHeartTimer: 0,
    mountainTremorTick: 0,
    leapAirProgress: 0,
    leapTotalDuration: 0.24,
    resolveRatio: 0,
    gnomePunchCount: 0,
    ironFistAftershockTimer: 0,
    ironFistAftershockX: 0,
    ironFistAftershockY: 0,
    ironFistAftershockAngle: 0,
    cataclysmWavesRemaining: 0,
    cataclysmTotalWaves: 3,
    cataclysmWaveTimer: 0,
    cataclysmOriginX: 0,
    cataclysmOriginY: 0,
    rampartTremorTick: 0,

    hoveredInGuild: false,
  };

  // Run stats & blessings
  private activeBlessingIds = new Set<string>();
  private runLevel = 1;
  private runXp = 0;
  private runXpNext = 60;
  private runCoins = 0;
  private runShardsEarned = 0;
  private runKills = 0;
  private runDamageDealt = 0;
  private corpseBloomCounter = 0;
  private pendingNextFloor: number | null = null;

  // Dynamic entities
  private minions: MinionEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private poisonClouds: PoisonCloudEntity[] = [];
  private traps: ExplosiveTrapEntity[] = [];
  private afterimages: AfterimageEntity[] = [];
  private daggerRains: DaggerRainZone[] = [];
  private earthenGrasps: EarthenGraspZone[] = [];
  private stoneRamparts: StoneRampartEntity[] = [];
  private pickups: PickupOrb[] = [];
  private slashes: SlashEffect[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private tethers: SoulTether[] = [];
  private particles: Particle[] = [];
  private popups: FloatingPopup[] = [];

  private currentRoomId = 0;
  private roomBannerText: string | null = null;
  private roomBannerTimer = 0;
  private interactPrompt: string | null = null;
  private ambientSpawnTimer = 0;

  // Bound mobile & lifecycle listeners (zero PC keyboard/mouse-hover listeners)
  private onBlurBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onResizeBound: () => void;

  constructor(canvas: HTMLCanvasElement, saveData: GuildSaveData, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }
    this.ctx = context;
    this.saveData = saveData;
    this.callbacks = callbacks;

    this.world = buildGuildWorld();
    const profile = this.getActiveProfile();
    this.player.characterId = profile.id;
    this.player.x = profile.guildSpot.x;
    this.player.y = profile.guildSpot.y;
    this.player.facingX = profile.guildSpot.facingX;
    this.recomputePlayerStats(true);

    this.onBlurBound = this.handleWindowBlur.bind(this);
    this.onPointerDownBound = this.handleCanvasPointerDown.bind(this);
    this.onPointerMoveBound = this.handleCanvasPointerMove.bind(this);
    this.onPointerUpBound = this.handleCanvasPointerUp.bind(this);
    this.onResizeBound = this.handleResize.bind(this);

    this.attachEvents();
    this.handleResize();
    this.emitHudSnapshot();
  }

  private getActiveProfile(): CharacterProfileDef {
    return CHARACTER_ROSTER[this.saveData.selectedCharacter] ?? CHARACTER_ROSTER[CharacterId.Zombie];
  }

  private getActiveLoadout(): EquippedLoadout {
    const charId = this.saveData.selectedCharacter;
    return (
      this.saveData.loadouts[charId] ??
      CHARACTER_ROSTER[charId]?.defaultLoadout ??
      CHARACTER_ROSTER[CharacterId.Zombie].defaultLoadout
    );
  }

  private getActiveUpgrades(): CharacterUpgradeRanks {
    return (
      this.saveData.characterUpgrades[this.saveData.selectedCharacter] ?? EMPTY_UPGRADE_RANKS
    );
  }

  private getGuildCompanions(): GuildCompanionRenderState[] {
    if (!this.world.isGuild) return [];
    return CHARACTER_LIST.filter((c) => c.id !== this.saveData.selectedCharacter).map((c) => ({
      characterId: c.id,
      x: c.guildSpot.x,
      y: c.guildSpot.y,
      facingX: c.guildSpot.facingX,
      label: c.archetypeName,
    }));
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('blur', this.onBlurBound);
    window.removeEventListener('resize', this.onResizeBound);
    this.canvas.removeEventListener('pointerdown', this.onPointerDownBound);
    this.canvas.removeEventListener('pointermove', this.onPointerMoveBound);
    this.canvas.removeEventListener('pointerup', this.onPointerUpBound);
    this.canvas.removeEventListener('pointercancel', this.onPointerUpBound);
  }

  public notifyViewportSync(): void {
    this.handleResize();
  }

  public setJoystickInput(nx: number, ny: number): void {
    this.joyX = nx;
    this.joyY = ny;
  }

  public setMinimapPanJoystick(nx: number, ny: number): void {
    this.minimapJoyX = nx;
    this.minimapJoyY = ny;
  }

  public resetMapPan(): void {
    this.mapPanX = 0;
    this.mapPanY = 0;
    this.minimapJoyX = 0;
    this.minimapJoyY = 0;
    this.panJoyX = 0;
    this.panJoyY = 0;
    this.isDraggingMap = false;
    this.emitHudSnapshot();
  }

  public setAttackHeld(held: boolean): void {
    this.attackHeld = held;
    if (held) {
      this.bufferedActions.set('BASIC', 0.14);
    }
  }

  public triggerInteract(): void {
    if (this.phase !== GamePhase.Dungeon && this.phase !== GamePhase.GuildRoam) return;
    this.bufferedActions.set('INTERACT', 0.22);
  }

  public updateSaveData(newSave: GuildSaveData): void {
    const prevChar = this.saveData.selectedCharacter;
    this.saveData = newSave;
    const nextChar = this.saveData.selectedCharacter;

    if (this.world.isGuild && prevChar !== nextChar) {
      const nextProfile = this.getActiveProfile();
      this.clearTransientEntities();
      this.player.characterId = nextChar;
      this.player.x = nextProfile.guildSpot.x;
      this.player.y = nextProfile.guildSpot.y;
      this.player.facingX = nextProfile.guildSpot.facingX;
      this.player.ultCharge = 100;
      this.player.normalCooldowns = [0, 0];
      this.player.ultCooldown = 0;
    } else {
      this.player.characterId = nextChar;
    }

    const healFull = this.world.isGuild;
    this.recomputePlayerStats(healFull);
    this.emitHudSnapshot();
  }

  public setPhase(nextPhase: GamePhase): void {
    this.phase = nextPhase;
    this.joyX = 0;
    this.joyY = 0;
    this.panPointerId = null;
    this.isDraggingMap = false;
    this.panJoyX = 0;
    this.panJoyY = 0;
    this.minimapJoyX = 0;
    this.minimapJoyY = 0;
    this.attackHeld = false;
    this.bufferedActions.clear();
    this.emitHudSnapshot();
  }

  public enterGuildPicking(): void {
    this.world = buildGuildWorld();
    this.clearTransientEntities();
    this.activeBlessingIds.clear();
    const profile = this.getActiveProfile();
    this.player.characterId = profile.id;
    this.player.x = profile.guildSpot.x;
    this.player.y = profile.guildSpot.y;
    this.player.facingX = profile.guildSpot.facingX;
    this.player.vx = 0;
    this.player.vy = 0;
    this.recomputePlayerStats(true);
    this.player.ultCharge = 100;
    this.phase = GamePhase.GuildPicking;
    this.showBanner('Sanctuary Guild House · Tap Any Hero in the Hall to Choose & Customize');
    this.emitHudSnapshot();
  }

  public enterGuildRoam(): void {
    const wasInGuild = this.world.isGuild;
    const profile = this.getActiveProfile();
    this.player.characterId = profile.id;
    if (!wasInGuild) {
      this.world = buildGuildWorld();
      this.clearTransientEntities();
      this.player.x = profile.guildSpot.x;
      this.player.y = profile.guildSpot.y;
      this.player.facingX = profile.guildSpot.facingX;
    }
    this.activeBlessingIds.clear();
    this.recomputePlayerStats(true);
    this.player.ultCharge = 100;
    this.phase = GamePhase.GuildRoam;
    this.showBanner(
      `${profile.archetypeName} Ready · Walk Out the North Door to Enter Dungeon`
    );
    this.emitHudSnapshot();
  }

  public startGraveyardRun(): void {
    this.activeBlessingIds.clear();
    this.runLevel = 1;
    this.runXp = 0;
    this.runXpNext = 55;
    this.runCoins = 0;
    this.runShardsEarned = 0;
    this.runKills = 0;
    this.runDamageDealt = 0;
    this.corpseBloomCounter = 0;
    this.pendingNextFloor = null;

    this.player.characterId = this.saveData.selectedCharacter;
    this.recomputePlayerStats(true);
    this.player.ultCharge = 100;
    this.player.normalCooldowns = [0, 0];
    this.player.ultCooldown = 0;

    this.loadDungeonFloor(1);
    soundEngine.playSummon();
  }

  public applyBlessingChoice(blessingId: string): void {
    this.activeBlessingIds.add(blessingId);
    if (blessingId === 'zombie_bloated_carcass') {
      this.recomputePlayerStats(false);
      this.healPlayer(45);
    } else if (blessingId === 'skel_fortified_ribs') {
      this.recomputePlayerStats(false);
      this.healPlayer(32);
    } else if (blessingId === 'gnome_bedrock_plating') {
      this.recomputePlayerStats(false);
      this.healPlayer(48);
    } else {
      this.recomputePlayerStats(false);
    }
    soundEngine.playHeal();

    if (this.pendingNextFloor !== null) {
      const targetFloor = this.pendingNextFloor;
      this.pendingNextFloor = null;
      this.loadDungeonFloor(targetFloor);
    } else {
      this.phase = GamePhase.Dungeon;
      this.emitHudSnapshot();
    }
  }

  public triggerSkillFromHud(slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE'): void {
    if (this.phase !== GamePhase.Dungeon && this.phase !== GamePhase.GuildRoam) return;
    if (slot === 'BASIC') {
      this.bufferedActions.set('BASIC', 0.14);
    } else if (slot === 'NORMAL_0') {
      this.bufferedActions.set('SKILL_0', 0.16);
    } else if (slot === 'NORMAL_1') {
      this.bufferedActions.set('SKILL_1', 0.16);
    } else if (slot === 'ULTIMATE') {
      this.bufferedActions.set('ULT', 0.16);
    }
  }

  private loadDungeonFloor(floorNum: number): void {
    this.clearTransientEntities();
    this.world = buildGraveyardFloor(floorNum);
    this.player.x = this.world.spawnX;
    this.player.y = this.world.spawnY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.cameraX = this.player.x;
    this.cameraY = this.player.y;
    this.currentRoomId = 0;
    this.phase = GamePhase.Dungeon;
    this.showBanner(this.world.floorLabel);
    this.emitHudSnapshot();
  }

  private clearTransientEntities(): void {
    this.minions = [];
    this.projectiles = [];
    this.poisonClouds = [];
    this.traps = [];
    this.afterimages = [];
    this.daggerRains = [];
    this.earthenGrasps = [];
    this.stoneRamparts = [];
    this.pickups = [];
    this.slashes = [];
    this.shockwaves = [];
    this.tethers = [];
    this.particles = [];
    this.popups = [];
    this.joyX = 0;
    this.joyY = 0;
    this.mapPanX = 0;
    this.mapPanY = 0;
    this.panPointerId = null;
    this.isDraggingMap = false;
    this.panJoyX = 0;
    this.panJoyY = 0;
    this.minimapJoyX = 0;
    this.minimapJoyY = 0;
    this.attackHeld = false;
    this.player.rottingComboRemaining = 0;
    this.player.dashTimer = 0;
    this.player.undyingTimer = 0;
    this.player.abominationTimer = 0;
    this.player.ribcageTimer = 0;
    this.player.ribcageCharges = 0;
    this.player.boneStormTimer = 0;
    this.player.colossusTimer = 0;
    this.player.unyieldingStacks = 0;
    this.player.unyieldingTimer = 0;
    this.player.windrunnerTimer = 0;
    this.player.reflexBurstTimer = 0;
    this.player.poisonBladesTimer = 0;
    this.player.stolenMightTimer = 0;
    this.player.flurryRemaining = 0;
    this.player.phantomRemaining = 0;
    this.player.kingThievesRemaining = 0;
    this.player.zombieClawStrikeCount = 0;
    this.player.fortressTimer = 0;
    this.player.magneticTimer = 0;
    this.player.mountainHeartTimer = 0;
    this.player.leapAirProgress = 0;
    this.player.gnomePunchCount = 0;
    this.player.ironFistAftershockTimer = 0;
    this.player.cataclysmWavesRemaining = 0;
  }

  private recomputePlayerStats(fullHeal: boolean): void {
    const profile = this.getActiveProfile();
    const loadout = this.getActiveLoadout();
    const ranks = this.getActiveUpgrades();
    const isSkel = profile.id === CharacterId.Skeleton;
    const isGob = profile.id === CharacterId.Goblin;
    const isGnome = profile.id === CharacterId.Gnome;

    const upgHp = isSkel
      ? ranks.pathA * 14
      : isGob
      ? ranks.pathA * 11
      : isGnome
      ? ranks.pathA * 26
      : ranks.pathA * 24;
    const statueHp =
      (this.activeBlessingIds.has('zombie_bloated_carcass') ? 45 : 0) +
      (this.activeBlessingIds.has('skel_fortified_ribs') ? 32 : 0) +
      (this.activeBlessingIds.has('gnome_bedrock_plating') ? 48 : 0);
    const levelBonus = (this.runLevel - 1) * 10;
    const newMaxHp = profile.baseHp + upgHp + statueHp + levelBonus;

    this.player.characterId = profile.id;
    this.player.maxHp = newMaxHp;
    if (fullHeal) {
      this.player.hp = newMaxHp;
    } else {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp);
    }

    const upgSpeedMult =
      isSkel || isGob ? 1 + ranks.pathE * 0.05 : isGnome ? 1 + ranks.pathE * 0.04 : 1.0;
    const statueSpeedMult =
      (this.activeBlessingIds.has('skel_phantom_stride') ? 1.18 : 1.0) *
      (this.activeBlessingIds.has('gob_quicksilver_boots') ? 1.2 : 1.0);
    this.player.speed = profile.baseSpeed * upgSpeedMult * statueSpeedMult;

    const pathCdStep = isSkel || isGob ? 0.07 : 0.06;
    const upgCdMult = 1 - ranks.pathE * pathCdStep;
    const normalBlessCdMult = this.activeBlessingIds.has('skel_phantom_stride') ? 0.8 : 1.0;

    const s0 = NORMAL_SKILLS[loadout.normalSkills[0]];
    const s1 = NORMAL_SKILLS[loadout.normalSkills[1]];
    const ult = ULTIMATE_SKILLS[loadout.ultimateSkill];

    this.player.normalMaxCooldowns = [
      Math.max(1.0, +(s0.cooldown * upgCdMult * normalBlessCdMult).toFixed(1)),
      Math.max(1.0, +(s1.cooldown * upgCdMult * normalBlessCdMult).toFixed(1)),
    ];
    this.player.ultMaxCooldown = Math.max(8, +(ult.cooldown * upgCdMult).toFixed(1));
    this.player.resolveRatio = isGnome
      ? Math.max(0, Math.min(1, 1 - this.player.hp / Math.max(1, this.player.maxHp)))
      : 0;
  }

  /**
   * Gnome Passive 2: Lasting Resolve
   * Dynamically strengthens defenses as HP drops (up to +42% bonus damage reduction).
   */
  private getGnomeResolveDefenseBonus(): number {
    if (this.player.characterId !== CharacterId.Gnome) return 0;
    const missingRatio = Math.max(
      0,
      Math.min(1, 1 - this.player.hp / Math.max(1, this.player.maxHp))
    );
    if (missingRatio <= 0.01) return 0;
    const exponent = this.activeBlessingIds.has('gnome_undying_grit') ? 0.72 : 1.0;
    return Math.min(0.42, Math.pow(missingRatio, exponent) * 0.42);
  }

  private getPhysicalDamageMultiplier(): number {
    const ranks = this.getActiveUpgrades();
    const charId = this.player.characterId;
    const pathBStep =
      charId === CharacterId.Skeleton
        ? 0.13
        : charId === CharacterId.Goblin
        ? 0.12
        : 0.14;
    const upg = 1 + ranks.pathB * pathBStep;
    const necroTalons =
      charId === CharacterId.Zombie && this.activeBlessingIds.has('zombie_necrotic_claws')
        ? 1.25
        : 1.0;
    const concussive =
      charId === CharacterId.Gnome && this.activeBlessingIds.has('gnome_concussive_gauntlets')
        ? 1.25
        : 1.0;
    const gritOffense =
      charId === CharacterId.Gnome && this.activeBlessingIds.has('gnome_undying_grit')
        ? 1 + Math.max(0, 1 - this.player.hp / Math.max(1, this.player.maxHp)) * 0.35
        : 1.0;
    const abom = this.player.abominationTimer > 0 ? 1.65 : 1.0;
    const colossus = this.player.colossusTimer > 0 ? 1.7 : 1.0;
    const mountain = this.player.mountainHeartTimer > 0 ? 1.55 : 1.0;
    const stolenMight = this.player.stolenMightTimer > 0 ? 1.35 : 1.0;
    const lvl = 1 + (this.runLevel - 1) * 0.07;
    return upg * necroTalons * concussive * gritOffense * abom * colossus * mountain * stolenMight * lvl;
  }

  private getPlagueOrSkillMultiplier(): number {
    const ranks = this.getActiveUpgrades();
    const charId = this.player.characterId;
    const upgBonus =
      charId === CharacterId.Skeleton
        ? ranks.pathD * 0.18
        : charId === CharacterId.Goblin
        ? ranks.pathD * 0.24
        : charId === CharacterId.Gnome
        ? ranks.pathC * 0.18
        : ranks.pathC * 0.2;
    const lvl = 1 + (this.runLevel - 1) * 0.06;
    return (1 + upgBonus) * lvl;
  }

  /**
   * Goblin Passive 2: Opportunistic Predator
   * Exploits enemies when attacking from behind OR targeting weakened foes.
   */
  private getOpportunisticBonus(
    enemy: EnemyEntity,
    attackerX: number
  ): { dmgMult: number; bonusCrit: number; active: boolean } {
    if (this.player.characterId !== CharacterId.Goblin) {
      return { dmgMult: 1, bonusCrit: 0, active: false };
    }
    const isBehind = (attackerX - enemy.x) * enemy.facingX < -4;
    const isWeakened =
      enemy.infectionStacks > 0 ||
      enemy.plagueTimer > 0 ||
      enemy.slowTimer > 0 ||
      enemy.hp < enemy.maxHp * 0.55;

    if (isBehind || isWeakened) {
      const ranks = this.getActiveUpgrades();
      return {
        dmgMult: 1.32 + ranks.pathC * 0.1,
        bonusCrit: 0.25,
        active: true,
      };
    }
    return { dmgMult: 1, bonusCrit: 0, active: false };
  }

  private rollPhysicalAttack(
    rawDamage: number,
    bonusCritChance = 0,
    forceCrit = false,
    isOpportunisticHit = false
  ): { damage: number; isCrit: boolean } {
    const profile = this.getActiveProfile();
    const ranks = this.getActiveUpgrades();
    const isSkel = profile.id === CharacterId.Skeleton;
    const isGob = profile.id === CharacterId.Goblin;

    const upgCrit = isSkel || isGob ? ranks.pathC * 0.04 : 0;
    const ivoryCrit = this.activeBlessingIds.has('skel_ivory_edge') ? 0.2 : 0;
    const heartseekerCrit = this.activeBlessingIds.has('gob_throat_seeker') ? 0.22 : 0;
    const colossusCrit = this.player.colossusTimer > 0 ? 0.25 : 0;

    const totalCritChance = Math.min(
      0.95,
      profile.baseCritChance +
        upgCrit +
        ivoryCrit +
        heartseekerCrit +
        colossusCrit +
        bonusCritChance
    );

    const isCrit = forceCrit || Math.random() < totalCritChance;
    if (!isCrit) {
      return { damage: Math.max(1, Math.round(rawDamage)), isCrit: false };
    }

    const skelPrecisionMult = isSkel ? ranks.pathC * 0.12 : 0;
    const ivoryMult = this.activeBlessingIds.has('skel_ivory_edge') ? 0.35 : 0;
    const heartseekerMult =
      isOpportunisticHit && this.activeBlessingIds.has('gob_throat_seeker') ? 0.4 : 0;

    const critMult = profile.critMultiplier + skelPrecisionMult + ivoryMult + heartseekerMult;
    return {
      damage: Math.max(2, Math.round(rawDamage * critMult)),
      isCrit: true,
    };
  }

  private attachEvents(): void {
    window.addEventListener('blur', this.onBlurBound);
    window.addEventListener('resize', this.onResizeBound);
    this.canvas.addEventListener('pointerdown', this.onPointerDownBound);
    this.canvas.addEventListener('pointermove', this.onPointerMoveBound);
    this.canvas.addEventListener('pointerup', this.onPointerUpBound);
    this.canvas.addEventListener('pointercancel', this.onPointerUpBound);
  }

  private getWorldZoom(): number {
    return Math.min(1, Math.max(0.68, this.stageHeight / 540));
  }

  private handleResize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.stageWidth = Math.max(vw, vh);
    this.stageHeight = Math.min(vw, vh);

    this.canvas.width = Math.max(1, Math.floor(this.stageWidth * dpr));
    this.canvas.height = Math.max(1, Math.floor(this.stageHeight * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private handleWindowBlur(): void {
    this.joyX = 0;
    this.joyY = 0;
    this.panPointerId = null;
    this.isDraggingMap = false;
    this.panJoyX = 0;
    this.panJoyY = 0;
    this.minimapJoyX = 0;
    this.minimapJoyY = 0;
    this.attackHeld = false;
    this.bufferedActions.clear();
  }

  private clampMapPanToWorldBounds(): void {
    if (this.world.rooms.length === 0) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const r of this.world.rooms) {
      minX = Math.min(minX, r.x);
      maxX = Math.max(maxX, r.x + r.w);
      minY = Math.min(minY, r.y);
      maxY = Math.max(maxY, r.y + r.h);
    }
    const targetX = Math.max(minX - 60, Math.min(maxX + 60, this.player.x + this.mapPanX));
    const targetY = Math.max(minY - 80, Math.min(maxY + 60, this.player.y + this.mapPanY));
    this.mapPanX = targetX - this.player.x;
    this.mapPanY = targetY - this.player.y;
  }

  private handleCanvasPointerDown(e: PointerEvent): void {
    if (
      this.phase !== GamePhase.GuildPicking &&
      this.phase !== GamePhase.GuildRoam &&
      this.phase !== GamePhase.Dungeon
    ) {
      return;
    }
    if (this.panPointerId !== null) return;

    e.preventDefault();
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture edge cases
    }

    const pt = clientToLandscapePoint(e.clientX, e.clientY);
    this.panPointerId = e.pointerId;
    this.panStartX = pt.x;
    this.panStartY = pt.y;
    this.panKnobX = pt.x;
    this.panKnobY = pt.y;
    this.panPrevX = pt.x;
    this.panPrevY = pt.y;
    this.panJoyX = 0;
    this.panJoyY = 0;
    this.isDraggingMap = false;
    this.pointerDownTime = performance.now();
  }

  private handleCanvasPointerMove(e: PointerEvent): void {
    if (e.pointerId !== this.panPointerId) return;
    if (this.phase !== GamePhase.GuildRoam && this.phase !== GamePhase.Dungeon) return;

    const pt = clientToLandscapePoint(e.clientX, e.clientY);
    const stepDx = pt.x - this.panPrevX;
    const stepDy = pt.y - this.panPrevY;
    this.panPrevX = pt.x;
    this.panPrevY = pt.y;

    const dx = pt.x - this.panStartX;
    const dy = pt.y - this.panStartY;
    const dist = Math.hypot(dx, dy);

    if (!this.isDraggingMap && dist >= 10) {
      this.isDraggingMap = true;
    }

    if (this.isDraggingMap) {
      const maxR = 48;
      const clamped = Math.min(dist, maxR);
      const nx = dist > 0.01 ? dx / dist : 0;
      const ny = dist > 0.01 ? dy / dist : 0;
      this.panKnobX = this.panStartX + nx * clamped;
      this.panKnobY = this.panStartY + ny * clamped;
      this.panJoyX = nx * (clamped / maxR);
      this.panJoyY = ny * (clamped / maxR);

      this.mapPanX += stepDx * 0.85;
      this.mapPanY += stepDy * 0.85;
      this.clampMapPanToWorldBounds();
    }
  }

  private handleCanvasPointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.panPointerId) return;
    e.preventDefault();
    try {
      if (this.canvas.hasPointerCapture(e.pointerId)) {
        this.canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    const wasDragging = this.isDraggingMap;
    const elapsed = performance.now() - this.pointerDownTime;
    const pt = clientToLandscapePoint(e.clientX, e.clientY);

    this.panPointerId = null;
    this.isDraggingMap = false;
    this.panJoyX = 0;
    this.panJoyY = 0;

    if (!wasDragging && elapsed < 550) {
      this.handleCanvasTap(pt.x, pt.y);
    }
  }

  private handleCanvasTap(stageX: number, stageY: number): void {
    const zoom = this.getWorldZoom();
    const worldX = (stageX - this.stageWidth / 2) / zoom + this.cameraX;
    const worldY = (stageY - this.stageHeight / 2) / zoom + this.cameraY;

    if (
      this.world.isGuild &&
      (this.phase === GamePhase.GuildPicking || this.phase === GamePhase.GuildRoam)
    ) {
      // Tapping the active hero opens their Skill Loadout & Upgrades
      const distToActive = Math.hypot(worldX - this.player.x, worldY - (this.player.y - 8));
      if (distToActive <= 66) {
        soundEngine.playUiClick(620);
        this.callbacks.onOpenLoadout(this.saveData.selectedCharacter);
        return;
      }

      // Tapping any resting Guild companion hero opens THEIR character & skill picker!
      for (const companion of this.getGuildCompanions()) {
        const distToComp = Math.hypot(worldX - companion.x, worldY - (companion.y - 8));
        if (distToComp <= 68) {
          soundEngine.playUiClick(640);
          this.callbacks.onOpenLoadout(companion.characterId);
          return;
        }
      }

      // Tapping the Guild Cauldron also opens Loadout & Upgrades
      const cauldron = this.world.props.find((pr) => pr.kind === 'GUILD_CAULDRON');
      if (cauldron && Math.hypot(worldX - cauldron.x, worldY - cauldron.y) <= 60) {
        soundEngine.playUiClick(620);
        this.callbacks.onOpenLoadout(this.saveData.selectedCharacter);
        return;
      }

      // Tapping the North Guild Door when standing near it steps outside into the Dungeon
      if (this.phase === GamePhase.GuildRoam) {
        const door = this.world.props.find((pr) => pr.kind === 'GUILD_DOOR');
        if (
          door &&
          Math.hypot(worldX - door.x, worldY - door.y) <= 82 &&
          Math.hypot(this.player.x - door.x, this.player.y - door.y) <= 120
        ) {
          soundEngine.playUiClick(640);
          this.startGraveyardRun();
        }
      }
      return;
    }

    if (this.phase === GamePhase.Dungeon) {
      for (const prop of this.world.props) {
        const tapDist = Math.hypot(worldX - prop.x, worldY - (prop.y - 12));
        const playerDist = Math.hypot(this.player.x - prop.x, this.player.y - prop.y);
        if (prop.kind === 'SHRINE_ALTAR' && !prop.opened && tapDist <= 64 && playerDist <= 125) {
          this.activateShrineStatue(prop);
          return;
        }
        if (prop.kind === 'CHEST' && !prop.opened && tapDist <= 56 && playerDist <= 105) {
          this.openChestProp(prop);
          return;
        }
        if (prop.kind === 'PORTAL_ARCH' && tapDist <= 68 && playerDist <= 105) {
          if (this.world.floorNumber >= 3) {
            this.finishRun(true);
          } else {
            this.offerBlessingsAndAdvanceFloor(this.world.floorNumber + 1);
          }
          return;
        }
      }
    }
  }

  private update(dt: number): void {
    this.elapsedTime += dt;

    if (this.shakeMag > 0.1) {
      this.shakeMag *= Math.pow(0.0015, dt);
    } else {
      this.shakeMag = 0;
    }

    this.ambientSpawnTimer -= dt;
    if (this.ambientSpawnTimer <= 0) {
      this.ambientSpawnTimer = 0.14;
      this.spawnAmbientParticle();
    }

    if (this.phase === GamePhase.Title) {
      const targetX = -75 + Math.sin(this.elapsedTime * 0.35) * 120;
      const targetY = -45 + Math.cos(this.elapsedTime * 0.28) * 50;
      this.cameraX += (targetX - this.cameraX) * 2.5 * dt;
      this.cameraY += (targetY - this.cameraY) * 2.5 * dt;
      this.updateParticles(dt);
      return;
    }

    if (this.phase === GamePhase.GuildPicking) {
      // Frame Zombie (-210, -25), Goblin (-55, 95), and Skeleton (105, 20) together in the Guild Hall!
      const targetX = -55;
      const targetY = 22;
      this.cameraX += (targetX - this.cameraX) * 5 * dt;
      this.cameraY += (targetY - this.cameraY) * 5 * dt;
      this.updateParticles(dt);
      return;
    }

    if (this.phase !== GamePhase.GuildRoam && this.phase !== GamePhase.Dungeon) {
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    for (const [key, rem] of this.bufferedActions.entries()) {
      if (rem - dt <= 0) this.bufferedActions.delete(key);
      else this.bufferedActions.set(key, rem - dt);
    }

    if (this.roomBannerTimer > 0) {
      this.roomBannerTimer -= dt;
      if (this.roomBannerTimer <= 0) {
        this.roomBannerText = null;
      }
    }

    this.updatePlayer(dt);
    this.updateMinions(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePoisonClouds(dt);
    this.updateTraps(dt);
    this.updateDaggerRains(dt);
    this.updateEarthenGrasps(dt);
    this.updateStoneRamparts(dt);
    this.updatePickups(dt);
    this.updateEffects(dt);
    this.updateParticles(dt);
    this.updateRoomState();

    // Update analog Map-Pan Joystick (either screen drag OR minimap drag)
    const activePanX =
      Math.abs(this.panJoyX) >= Math.abs(this.minimapJoyX) ? this.panJoyX : this.minimapJoyX;
    const activePanY =
      Math.abs(this.panJoyY) >= Math.abs(this.minimapJoyY) ? this.panJoyY : this.minimapJoyY;
    const panInputMag = Math.hypot(activePanX, activePanY);

    if (panInputMag > 0.02) {
      const panSpeed = 580;
      this.mapPanX += activePanX * panSpeed * dt;
      this.mapPanY += activePanY * panSpeed * dt;
      this.clampMapPanToWorldBounds();
    } else if (Math.hypot(this.joyX, this.joyY) > 0.08 || this.attackHeld) {
      this.mapPanX *= Math.pow(0.0004, dt);
      this.mapPanY *= Math.pow(0.0004, dt);
      if (Math.hypot(this.mapPanX, this.mapPanY) < 2) {
        this.mapPanX = 0;
        this.mapPanY = 0;
      }
    }

    const lookX = Math.cos(this.player.aimAngle) * 20;
    const lookY = Math.sin(this.player.aimAngle) * 14;
    const desiredCamX = this.player.x + lookX + this.mapPanX;
    const desiredCamY = this.player.y + lookY + this.mapPanY;
    this.cameraX += (desiredCamX - this.cameraX) * Math.min(1, 10 * dt);
    this.cameraY += (desiredCamY - this.cameraY) * Math.min(1, 10 * dt);

    const syncInterval = panInputMag > 0.02 ? 0.032 : 0.075;
    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= syncInterval) {
      this.hudSyncAccum = 0;
      this.emitHudSnapshot();
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;

    p.squashX += (1 - p.squashX) * 12 * dt;
    p.squashY += (1 - p.squashY) * 12 * dt;
    if (p.hitFlashTimer > 0) p.hitFlashTimer -= dt;
    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.basicAttackCooldown > 0) p.basicAttackCooldown -= dt;
    if (p.normalCooldowns[0] > 0) p.normalCooldowns[0] = Math.max(0, p.normalCooldowns[0] - dt);
    if (p.normalCooldowns[1] > 0) p.normalCooldowns[1] = Math.max(0, p.normalCooldowns[1] - dt);
    if (p.ultCooldown > 0) p.ultCooldown = Math.max(0, p.ultCooldown - dt);

    if (this.world.isGuild) {
      p.ultCharge = Math.min(100, p.ultCharge + 28 * dt);
    } else {
      p.ultCharge = Math.min(100, p.ultCharge + 1.8 * dt);
    }

    // Zombie: Undying Flesh regeneration (+ Spined Carapace thorns if blessed)
    if (p.undyingTimer > 0) {
      p.undyingTimer = Math.max(0, p.undyingTimer - dt);
      p.undyingHealTick -= dt;
      if (p.undyingHealTick <= 0) {
        p.undyingHealTick = 0.5;
        const healAmt = Math.max(2, Math.round(p.maxHp * 0.035));
        this.healPlayer(healAmt);
        if (this.activeBlessingIds.has('zombie_skill_undying_flesh')) {
          this.shockwaves.push({
            x: p.x,
            y: p.y,
            maxRadius: 86,
            color: '#2DD4BF',
            life: 0.2,
            maxLife: 0.2,
          });
          const thornDmg = Math.round(11 * this.getPlagueOrSkillMultiplier());
          for (const enemy of [...this.world.enemies]) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 86 + enemy.radius) {
              this.damageEnemy(enemy, thornDmg, false, p.x, p.y);
              this.applyInfectiousTouch(enemy, 1);
            }
          }
        }
      }
    }

    // Zombie: Abomination Form periodic stomp
    if (p.abominationTimer > 0) {
      p.abominationTimer = Math.max(0, p.abominationTimer - dt);
      p.abomStompTick -= dt;
      if (p.abomStompTick <= 0) {
        p.abomStompTick = 1.4;
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 95,
          color: '#4ADE80',
          life: 0.25,
          maxLife: 0.25,
        });
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 95 + enemy.radius) {
            this.damageEnemy(
              enemy,
              Math.round(14 * this.getPhysicalDamageMultiplier()),
              true,
              p.x,
              p.y
            );
          }
        }
      }
    }

    // Skeleton: Ribcage Shield timer
    if (p.ribcageTimer > 0) {
      p.ribcageTimer = Math.max(0, p.ribcageTimer - dt);
      if (p.ribcageTimer <= 0) {
        p.ribcageCharges = 0;
      }
    }

    // Skeleton: Unyielding Bones passive stack duration
    if (p.unyieldingTimer > 0) {
      p.unyieldingTimer = Math.max(0, p.unyieldingTimer - dt);
      if (p.unyieldingTimer <= 0) {
        p.unyieldingStacks = 0;
      }
    }

    // Skeleton: Bone Storm whirling vortex shred
    if (p.boneStormTimer > 0) {
      p.boneStormTimer = Math.max(0, p.boneStormTimer - dt);
      p.boneStormTick -= dt;
      if (p.boneStormTick <= 0) {
        p.boneStormTick = 0.34;
        const maelstrom = this.activeBlessingIds.has('skel_skill_bone_storm');
        const stormRadius = maelstrom ? 99 : 76;
        const stormRaw =
          13 *
          (maelstrom ? 1.3 : 1.0) *
          this.getPhysicalDamageMultiplier() *
          this.getPlagueOrSkillMultiplier();
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= stormRadius + enemy.radius) {
            const roll = this.rollPhysicalAttack(stormRaw);
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, false, roll.isCrit);
          }
        }
        this.hitDestructibleProps(p.x, p.y, stormRadius);
      }
    }

    // Skeleton: Bone Colossus titan pulse
    if (p.colossusTimer > 0) {
      p.colossusTimer = Math.max(0, p.colossusTimer - dt);
      p.colossusShockTick -= dt;
      if (p.colossusShockTick <= 0) {
        p.colossusShockTick = this.activeBlessingIds.has('skel_ult_colossus') ? 0.9 : 1.35;
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 100,
          color: '#38BDF8',
          life: 0.24,
          maxLife: 0.24,
        });
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 100 + enemy.radius) {
            const roll = this.rollPhysicalAttack(16 * this.getPhysicalDamageMultiplier());
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, false, roll.isCrit);
          }
        }
      }
    }

    // Zombie: Rotting Claw combo
    if (p.rottingComboRemaining > 0) {
      p.rottingComboTimer -= dt;
      if (p.rottingComboTimer <= 0) {
        p.rottingComboRemaining--;
        p.rottingComboTimer = 0.11;
        this.performRottingClawHit(p.rottingComboTotal - p.rottingComboRemaining);
      }
    }

    // Goblin active timers
    if (p.windrunnerTimer > 0) {
      p.windrunnerTimer = Math.max(0, p.windrunnerTimer - dt);
      if (Math.hypot(p.vx, p.vy) > 40 && Math.random() < 0.35) {
        this.spawnBurst(p.x, p.y + 8, '#FDE047', 1, 35);
      }
    }
    if (p.reflexBurstTimer > 0) p.reflexBurstTimer = Math.max(0, p.reflexBurstTimer - dt);
    if (p.poisonBladesTimer > 0) p.poisonBladesTimer = Math.max(0, p.poisonBladesTimer - dt);
    if (p.stolenMightTimer > 0) p.stolenMightTimer = Math.max(0, p.stolenMightTimer - dt);

    // Goblin: Dagger Flurry ultra-fast strike chain
    if (p.flurryRemaining > 0) {
      p.flurryTimer -= dt;
      if (p.flurryTimer <= 0) {
        p.flurryRemaining--;
        p.flurryTimer = 0.065;
        this.performDaggerFlurryHit(p.flurryTotal - p.flurryRemaining, p.flurryRemaining === 0);
      }
    }

    // Goblin Ultimate: Phantom Frenzy omnidirectional afterimage blitz
    if (p.phantomRemaining > 0) {
      p.phantomTimer -= dt;
      if (p.phantomTimer <= 0) {
        p.phantomRemaining--;
        p.phantomTimer = 0.095;
        this.performPhantomFrenzyStep(p.phantomTotal - p.phantomRemaining);
      }
    }

    // Goblin Ultimate: King of Thieves chain ambushes
    if (p.kingThievesRemaining > 0) {
      p.kingThievesTimer -= dt;
      if (p.kingThievesTimer <= 0) {
        p.kingThievesRemaining--;
        p.kingThievesTimer = 0.12;
        this.performKingOfThievesStep();
      }
    }

    // Gnome: Dynamic Lasting Resolve ratio update
    p.resolveRatio =
      p.characterId === CharacterId.Gnome
        ? Math.max(0, Math.min(1, 1 - p.hp / Math.max(1, p.maxHp)))
        : 0;

    // Gnome: Fortress Stance timer (+ Aegis Bastion tremors)
    if (p.fortressTimer > 0) {
      p.fortressTimer = Math.max(0, p.fortressTimer - dt);
      if (this.activeBlessingIds.has('gnome_skill_fortress_stance')) {
        p.fortressTremorTick -= dt;
        if (p.fortressTremorTick <= 0) {
          p.fortressTremorTick = 1.25;
          this.shockwaves.push({
            x: p.x,
            y: p.y,
            maxRadius: 96,
            color: '#FDBA74',
            life: 0.24,
            maxLife: 0.24,
          });
          const tremorDmg = Math.round(14 * this.getPhysicalDamageMultiplier());
          for (const enemy of [...this.world.enemies]) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 96 + enemy.radius) {
              this.damageEnemy(enemy, tremorDmg, true, p.x, p.y);
              enemy.stunTimer = Math.max(enemy.stunTimer, 0.35);
            }
          }
        }
      }
    }

    // Gnome: Magnetic Guard timer (+ Overcharged Coil lightning arcs)
    if (p.magneticTimer > 0) {
      p.magneticTimer = Math.max(0, p.magneticTimer - dt);
      if (this.activeBlessingIds.has('gnome_skill_magnetic_guard')) {
        p.magneticZapTick -= dt;
        if (p.magneticZapTick <= 0) {
          p.magneticZapTick = 0.7;
          const zapDmg = Math.round(15 * this.getPlagueOrSkillMultiplier());
          let zappedAny = false;
          for (const enemy of [...this.world.enemies]) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 120 + enemy.radius) {
              this.damageEnemy(enemy, zapDmg, false, p.x, p.y);
              this.spawnBurst(enemy.x, enemy.y, '#38BDF8', 5, 70);
              zappedAny = true;
            }
          }
          if (zappedAny) {
            this.shockwaves.push({
              x: p.x,
              y: p.y,
              maxRadius: 120,
              color: '#38BDF8',
              life: 0.2,
              maxLife: 0.2,
            });
          }
        }
      }
    }

    // Gnome: Mountain's Heart giant stone colossus periodic tremor
    if (p.mountainHeartTimer > 0) {
      p.mountainHeartTimer = Math.max(0, p.mountainHeartTimer - dt);
      p.mountainTremorTick -= dt;
      if (p.mountainTremorTick <= 0) {
        p.mountainTremorTick = 1.25;
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 112,
          color: '#FB923C',
          life: 0.26,
          maxLife: 0.26,
        });
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 112 + enemy.radius) {
            const roll = this.rollPhysicalAttack(18 * this.getPhysicalDamageMultiplier());
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
            enemy.stunTimer = Math.max(enemy.stunTimer, 0.4);
          }
        }
      }
    }

    // Gnome: Iron Fist Tectonic Knuckle delayed aftershock
    if (p.ironFistAftershockTimer > 0) {
      p.ironFistAftershockTimer -= dt;
      if (p.ironFistAftershockTimer <= 0) {
        soundEngine.playBossSlam();
        const ax = p.ironFistAftershockX + Math.cos(p.ironFistAftershockAngle) * 78;
        const ay = p.ironFistAftershockY + Math.sin(p.ironFistAftershockAngle) * 78;
        this.shockwaves.push({
          x: ax,
          y: ay,
          maxRadius: 96,
          color: '#FDBA74',
          life: 0.28,
          maxLife: 0.28,
        });
        this.spawnBurst(ax, ay, '#FB923C', 14, 120);
        const afterDmg = Math.round(24 * this.getPhysicalDamageMultiplier());
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - ax, enemy.y - ay) <= 96 + enemy.radius) {
            const roll = this.rollPhysicalAttack(afterDmg);
            this.damageEnemy(enemy, roll.damage, true, ax, ay, true, roll.isCrit);
            this.applyEnemyStun(enemy, 0.85);
          }
        }
        this.hitDestructibleProps(ax, ay, 96);
      }
    }

    // Gnome Ultimate: Cataclysmic Slam multi-wave cascade
    if (p.cataclysmWavesRemaining > 0) {
      p.cataclysmWaveTimer -= dt;
      if (p.cataclysmWaveTimer <= 0) {
        const waveIndex = p.cataclysmTotalWaves - p.cataclysmWavesRemaining;
        p.cataclysmWavesRemaining--;
        p.cataclysmWaveTimer = 0.17;
        this.triggerCataclysmWave(waveIndex);
      }
    }

    // Soul Knight Mobile Aiming: Auto-lock nearest enemy within range; otherwise aim along joystick vector
    const joyMag = Math.hypot(this.joyX, this.joyY);
    const nearestEnemy = this.findNearestEnemy(p.x, p.y, 305);
    if (nearestEnemy) {
      p.aimAngle = Math.atan2(nearestEnemy.y - p.y, nearestEnemy.x - p.x);
      p.facingX = Math.cos(p.aimAngle) >= 0 ? 1 : -1;
    } else if (joyMag > 0.05) {
      p.aimAngle = Math.atan2(this.joyY, this.joyX);
      p.facingX = this.joyX >= 0 ? 1 : -1;
    }

    const windSpeedMult =
      (p.windrunnerTimer > 0 ? 1.45 : 1.0) * (p.reflexBurstTimer > 0 ? 1.24 : 1.0);
    const effectiveMoveSpeed = p.speed * windSpeedMult;

    // Movement via Virtual Joystick or Dash/Leap Skill (Flesh Ripper / Skeletal Rush / Groundbreaker)
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      if (p.dashKind === 'GROUNDBREAKER_LEAP') {
        const totalDur = Math.max(0.05, p.leapTotalDuration);
        p.leapAirProgress = Math.max(0, Math.min(1, 1 - Math.max(0, p.dashTimer) / totalDur));
        const leapSpeed = 520;
        p.vx = Math.cos(p.dashAngle) * leapSpeed;
        p.vy = Math.sin(p.dashAngle) * leapSpeed;
        if (Math.random() < 0.45) {
          this.spawnBurst(p.x, p.y + 6, '#FB923C', 1, 45);
        }
        if (p.dashTimer <= 0) {
          p.leapAirProgress = 0;
          this.triggerGroundbreakerCrash();
        }
      } else {
        const isSkeletalRush = p.dashKind === 'SKELETAL_RUSH';
        const dashSpeed = isSkeletalRush ? 790 : 690;
        p.vx = Math.cos(p.dashAngle) * dashSpeed;
        p.vy = Math.sin(p.dashAngle) * dashSpeed;
        this.spawnBurst(p.x, p.y, isSkeletalRush ? '#38BDF8' : '#4ADE80', 2, 50);

        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (!p.dashHitIds.has(enemy.id)) {
            const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (dist <= p.radius + enemy.radius + 24) {
              p.dashHitIds.add(enemy.id);
              if (isSkeletalRush) {
                const phantomDash = this.activeBlessingIds.has('skel_skill_skeletal_rush');
                const roll = this.rollPhysicalAttack(
                  35 * this.getPhysicalDamageMultiplier(),
                  0.3,
                  phantomDash
                );
                this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
                if (phantomDash && !p.dashRefunded) {
                  p.dashRefunded = true;
                  p.normalCooldowns[p.dashSlotIndex] = Math.max(
                    0,
                    p.normalCooldowns[p.dashSlotIndex] - 1.5
                  );
                }
              } else {
                const goreLunge = this.activeBlessingIds.has('zombie_skill_flesh_ripper');
                const roll = this.rollPhysicalAttack(
                  34 * (goreLunge ? 1.35 : 1.0) * this.getPhysicalDamageMultiplier()
                );
                this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
                this.applyInfectiousTouch(enemy, 1);
                if (goreLunge) {
                  this.healPlayer(6);
                }
              }
              this.hitstopTimer = 0.04;
              this.shakeMag = Math.max(this.shakeMag, 6);
            }
          }
        }
        this.hitDestructibleProps(p.x, p.y, 44);
      }
    } else if (joyMag > 0.01) {
      p.leapAirProgress = 0;
      const clampedMag = Math.min(1, joyMag);
      const nx = this.joyX / joyMag;
      const ny = this.joyY / joyMag;
      p.vx = nx * effectiveMoveSpeed * clampedMag;
      p.vy = ny * effectiveMoveSpeed * clampedMag;
      p.walkPhase += dt * (8 + 6 * clampedMag) * (p.windrunnerTimer > 0 ? 1.35 : 1);
    } else {
      p.leapAirProgress = 0;
      p.vx *= Math.pow(0.001, dt);
      p.vy *= Math.pow(0.001, dt);
    }

    const nextPos = this.resolveWorldCollision(p.x + p.vx * dt, p.y + p.vy * dt, p.radius);
    p.x = nextPos.x;
    p.y = nextPos.y;

    // Consume buffered touch skills & basic attacks
    if (this.bufferedActions.has('SKILL_0') && p.normalCooldowns[0] <= 0) {
      this.bufferedActions.delete('SKILL_0');
      this.castNormalSkill(0);
    }
    if (this.bufferedActions.has('SKILL_1') && p.normalCooldowns[1] <= 0) {
      this.bufferedActions.delete('SKILL_1');
      this.castNormalSkill(1);
    }
    if (this.bufferedActions.has('ULT') && p.ultCooldown <= 0 && p.ultCharge >= 100) {
      this.bufferedActions.delete('ULT');
      this.castUltimateSkill();
    }

    if (
      (this.attackHeld || this.bufferedActions.has('BASIC')) &&
      p.basicAttackCooldown <= 0 &&
      p.dashTimer <= 0 &&
      p.phantomRemaining <= 0 &&
      p.kingThievesRemaining <= 0
    ) {
      this.bufferedActions.delete('BASIC');
      this.performBasicAttack();
    }

    this.checkInteractables();
  }

  private performBasicAttack(): void {
    const p = this.player;
    const profile = this.getActiveProfile();
    const ranks = this.getActiveUpgrades();
    const isSkel = profile.id === CharacterId.Skeleton;
    const isGob = profile.id === CharacterId.Goblin;
    const isGnome = profile.id === CharacterId.Gnome;
    const isTitan = p.abominationTimer > 0 || p.colossusTimer > 0 || p.mountainHeartTimer > 0;

    let cd = profile.baseAttackCooldown;
    if (isSkel) {
      cd /= (1 + ranks.pathE * 0.05) * (this.activeBlessingIds.has('skel_phantom_stride') ? 1.18 : 1);
    } else if (isGob) {
      cd /= 1 + ranks.pathB * 0.06;
    }
    if (isTitan) cd = Math.max(0.16, cd - 0.04);
    if (p.windrunnerTimer > 0) cd *= 0.76;
    p.basicAttackCooldown = Math.max(0.11, cd);

    p.comboFlip = !p.comboFlip;
    p.squashX = isGnome ? 1.22 : 1.18;
    p.squashY = isGnome ? 0.82 : 0.85;

    const baseReach = isSkel
      ? (p.colossusTimer > 0 ? 96 : 68) * (1 + ranks.pathB * 0.04)
      : isGob
      ? 58
      : isGnome
      ? (p.mountainHeartTimer > 0 ? 92 : 66) * (1 + ranks.pathB * 0.05)
      : p.abominationTimer > 0
      ? 84
      : 62;
    const reach = baseReach;
    const spread = isTitan ? 1.7 : isSkel ? 1.45 : isGob ? 1.25 : isGnome ? 1.4 : 1.35;

    const gobVenomActive = p.poisonBladesTimer > 0 || this.activeBlessingIds.has('gob_viper_toxin');

    soundEngine.playSlash(p.comboFlip ? 1 : 0);
    const isZombie = profile.id === CharacterId.Zombie;
    this.slashes.push({
      x: p.x + Math.cos(p.aimAngle) * 14,
      y: p.y + Math.sin(p.aimAngle) * 14,
      angle: p.aimAngle,
      radius: reach,
      arcSpread: spread,
      color: isSkel
        ? p.colossusTimer > 0
          ? '#7DD3FC'
          : '#38BDF8'
        : isGob
        ? gobVenomActive
          ? '#A3E635'
          : '#FBBF24'
        : isGnome
        ? p.mountainHeartTimer > 0
          ? '#FDBA74'
          : '#FB923C'
        : p.abominationTimer > 0
        ? '#A3E635'
        : '#4ADE80',
      life: isGob ? 0.11 : isZombie ? 0.28 : 0.14,
      maxLife: isGob ? 0.11 : isZombie ? 0.28 : 0.14,
      flip: p.comboFlip,
      kind: isZombie ? 'ZOMBIE_BASIC_ATTACK' : 'DEFAULT',
      scale: isZombie && p.abominationTimer > 0 ? 1.45 : 1.0,
    });

    const rawDmg = profile.baseAttackDamage * this.getPhysicalDamageMultiplier();
    this.hitEnemiesInArc(p.x, p.y, p.aimAngle, reach, spread * 0.65, rawDmg, isGnome, 0, isZombie);
    this.hitDestructibleProps(p.x, p.y, reach);

    // Goblin Statue Blessing: Zephyr Gale — Windrunner basic attacks throw enchanted daggers!
    if (
      isGob &&
      p.windrunnerTimer > 0 &&
      this.activeBlessingIds.has('gob_skill_windrunner')
    ) {
      const dSpeed = 580;
      this.projectiles.push({
        id: allocEntityId(),
        fromPlayer: true,
        x: p.x + Math.cos(p.aimAngle) * 18,
        y: p.y + Math.sin(p.aimAngle) * 18,
        vx: Math.cos(p.aimAngle) * dSpeed,
        vy: Math.sin(p.aimAngle) * dSpeed,
        radius: 8,
        damage: 16 * this.getPhysicalDamageMultiplier(),
        life: 0.85,
        color: '#FDE047',
        kind: 'PLAYER_ENCHANTED_DAGGER',
        angle: p.aimAngle,
        pierce: true,
        hitEnemyIds: new Set<number>(),
      });
    }

    // Gnome Statue Blessing: Concussive Knuckles — every 3rd punch triggers a stunning earth pulse!
    if (isGnome && this.activeBlessingIds.has('gnome_concussive_gauntlets')) {
      p.gnomePunchCount++;
      if (p.gnomePunchCount >= 3) {
        p.gnomePunchCount = 0;
        const px = p.x + Math.cos(p.aimAngle) * 32;
        const py = p.y + Math.sin(p.aimAngle) * 32;
        const pulseR = Math.round(78 * (1 + ranks.pathB * 0.05));
        this.shockwaves.push({
          x: px,
          y: py,
          maxRadius: pulseR,
          color: '#FB923C',
          life: 0.24,
          maxLife: 0.24,
        });
        this.spawnBurst(px, py, '#FDBA74', 8, 85);
        const pulseDmg = Math.round(15 * this.getPhysicalDamageMultiplier());
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - px, enemy.y - py) <= pulseR + enemy.radius) {
            this.damageEnemy(enemy, pulseDmg, true, px, py, true);
            this.applyEnemyStun(enemy, 0.65);
          }
        }
      }
    }

    // Zombie Statue Blessing: Necrotic Talons — every 3rd claw slash bursts a toxic gas puff!
    if (profile.id === CharacterId.Zombie && this.activeBlessingIds.has('zombie_necrotic_claws')) {
      p.zombieClawStrikeCount++;
      if (p.zombieClawStrikeCount >= 3) {
        p.zombieClawStrikeCount = 0;
        const puffX = p.x + Math.cos(p.aimAngle) * 34;
        const puffY = p.y + Math.sin(p.aimAngle) * 34;
        const puffRadius = Math.round(70 * (1 + ranks.pathC * 0.08));
        this.poisonClouds.push({
          id: allocEntityId(),
          x: puffX,
          y: puffY,
          radius: puffRadius,
          life: 2.4,
          maxLife: 2.4,
          tickTimer: 0.15,
          damagePerTick: Math.round(8 * this.getPlagueOrSkillMultiplier()),
        });
        this.spawnBurst(puffX, puffY, '#A3E635', 8, 70);
      }
    }
  }

  private castNormalSkill(slotIndex: 0 | 1): void {
    const loadout = this.getActiveLoadout();
    const skillId = loadout.normalSkills[slotIndex];
    this.player.normalCooldowns[slotIndex] = this.player.normalMaxCooldowns[slotIndex];

    switch (skillId) {
      // === ZOMBIE NORMAL SKILLS ===
      case NormalSkillId.RottingClaw: {
        const hits = this.activeBlessingIds.has('zombie_skill_rotting_claw') ? 4 : 3;
        this.player.rottingComboTotal = hits;
        this.player.rottingComboRemaining = hits;
        this.player.rottingComboTimer = 0;
        break;
      }
      case NormalSkillId.PlagueBurst: {
        soundEngine.playPlague();
        const ranks = this.getActiveUpgrades();
        const miasma = this.activeBlessingIds.has('zombie_skill_plague_burst');
        this.player.squashX = 1.25;
        this.player.squashY = 0.78;
        const radius = Math.round(128 * (1 + ranks.pathC * 0.08) * (miasma ? 1.35 : 1.0));
        const duration = miasma ? 6.5 : 4.5;
        this.poisonClouds.push({
          id: allocEntityId(),
          x: this.player.x,
          y: this.player.y,
          radius,
          life: duration,
          maxLife: duration,
          tickTimer: 0.1,
          damagePerTick: Math.round(11 * this.getPlagueOrSkillMultiplier()),
        });
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: radius,
          color: '#A3E635',
          life: 0.28,
          maxLife: 0.28,
        });
        this.spawnBurst(this.player.x, this.player.y, '#A3E635', 16, 120);
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) <= radius + enemy.radius) {
            this.damageEnemy(
              enemy,
              Math.round(18 * this.getPlagueOrSkillMultiplier()),
              false,
              this.player.x,
              this.player.y
            );
            enemy.plagueTimer = duration;
            if (miasma) {
              enemy.slowTimer = Math.max(enemy.slowTimer, 3.5);
              enemy.slowFactor = Math.min(enemy.slowFactor, 0.65);
            }
            this.applyInfectiousTouch(enemy, 2);
          }
        }
        break;
      }
      case NormalSkillId.FleshRipper: {
        soundEngine.playDash();
        const joyMag = Math.hypot(this.joyX, this.joyY);
        const lungeAngle = joyMag > 0.3 ? Math.atan2(this.joyY, this.joyX) : this.player.aimAngle;
        this.player.dashKind = 'FLESH_RIPPER';
        this.player.dashSlotIndex = slotIndex;
        this.player.dashRefunded = false;
        this.player.dashTimer = 0.21;
        this.player.dashAngle = lungeAngle;
        this.player.aimAngle = lungeAngle;
        this.player.facingX = Math.cos(lungeAngle) >= 0 ? 1 : -1;
        this.player.dashHitIds.clear();
        this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.26);
        this.slashes.push({
          x: this.player.x + Math.cos(lungeAngle) * 28,
          y: this.player.y + Math.sin(lungeAngle) * 28,
          angle: lungeAngle,
          radius: 58,
          arcSpread: 1.1,
          color: '#34D399',
          life: 0.2,
          maxLife: 0.2,
          flip: false,
        });
        if (this.activeBlessingIds.has('zombie_skill_flesh_ripper')) {
          this.poisonClouds.push({
            id: allocEntityId(),
            x: this.player.x + Math.cos(lungeAngle) * 48,
            y: this.player.y + Math.sin(lungeAngle) * 48,
            radius: 78,
            life: 2.8,
            maxLife: 2.8,
            tickTimer: 0.12,
            damagePerTick: Math.round(9 * this.getPlagueOrSkillMultiplier()),
          });
        }
        break;
      }
      case NormalSkillId.UndyingFlesh: {
        soundEngine.playHeal();
        const spined = this.activeBlessingIds.has('zombie_skill_undying_flesh');
        this.player.undyingTimer = spined ? 7.5 : 5.0;
        this.player.undyingHealTick = 0.15;
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: 72,
          color: '#2DD4BF',
          life: 0.3,
          maxLife: 0.3,
        });
        this.spawnPopup(this.player.x, this.player.y - 26, 'UNDYING FLESH', '#5EEAD4', 0.95);
        break;
      }
      case NormalSkillId.GraveCall: {
        soundEngine.playSummon();
        const ranks = this.getActiveUpgrades();
        const extra = this.activeBlessingIds.has('zombie_skill_grave_call') ? 2 : 0;
        const count = 2 + extra;
        const life = 15 + ranks.pathD * 1.5;
        for (let i = 0; i < count; i++) {
          const ang = this.player.aimAngle + (i - (count - 1) / 2) * 0.85;
          const sx = this.player.x + Math.cos(ang) * 44;
          const sy = this.player.y + Math.sin(ang) * 44;
          this.spawnMinion(sx, sy, life, extra > 0, 'ZOMBIE_SHAMBLER');
        }
        break;
      }

      // === SKELETON NORMAL SKILLS ===
      case NormalSkillId.BoneSlash: {
        soundEngine.playSlash(1);
        const ranks = this.getActiveUpgrades();
        const crescent = this.activeBlessingIds.has('skel_skill_bone_slash');
        this.player.squashX = 1.24;
        this.player.squashY = 0.8;
        const reach =
          (this.player.colossusTimer > 0 ? 122 : 96) * (1 + ranks.pathB * 0.04);
        const angle = this.player.aimAngle;

        this.slashes.push({
          x: this.player.x + Math.cos(angle) * 18,
          y: this.player.y + Math.sin(angle) * 18,
          angle,
          radius: reach,
          arcSpread: 1.9,
          color: '#38BDF8',
          life: 0.18,
          maxLife: 0.18,
          flip: false,
        });

        const rawDmg = 30 * (crescent ? 1.28 : 1.0) * this.getPhysicalDamageMultiplier();
        this.hitEnemiesInArc(this.player.x, this.player.y, angle, reach, 1.0, rawDmg, true, 0.35);
        this.hitDestructibleProps(this.player.x, this.player.y, reach);

        if (crescent) {
          const waveSpeed = 500;
          this.projectiles.push({
            id: allocEntityId(),
            fromPlayer: true,
            x: this.player.x + Math.cos(angle) * 26,
            y: this.player.y + Math.sin(angle) * 26,
            vx: Math.cos(angle) * waveSpeed,
            vy: Math.sin(angle) * waveSpeed,
            radius: 22,
            damage: 22 * this.getPhysicalDamageMultiplier(),
            life: 0.95,
            color: '#38BDF8',
            kind: 'PLAYER_DARK_WAVE',
            angle,
            pierce: true,
            hitEnemyIds: new Set<number>(),
          });
        }
        break;
      }

      case NormalSkillId.BoneSpear: {
        soundEngine.playArrow();
        const ranks = this.getActiveUpgrades();
        this.player.squashX = 1.2;
        this.player.squashY = 0.84;
        const baseAngle = this.player.aimAngle;
        const speed = 640;
        const rawSpearDmg = 32 * this.getPhysicalDamageMultiplier() * (1 + ranks.pathB * 0.06);
        const twinVolley = this.activeBlessingIds.has('skel_skill_bone_spear');
        const angles = twinVolley ? [baseAngle - 0.075, baseAngle + 0.075] : [baseAngle];

        for (const angle of angles) {
          this.projectiles.push({
            id: allocEntityId(),
            fromPlayer: true,
            x: this.player.x + Math.cos(angle) * 20,
            y: this.player.y + Math.sin(angle) * 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 10,
            damage: rawSpearDmg,
            life: 1.45,
            color: '#7DD3FC',
            kind: 'PLAYER_BONE_SPEAR',
            angle,
            pierce: true,
            hitEnemyIds: new Set<number>(),
          });
        }
        this.spawnBurst(
          this.player.x + Math.cos(baseAngle) * 18,
          this.player.y + Math.sin(baseAngle) * 18,
          '#7DD3FC',
          twinVolley ? 12 : 8,
          90
        );
        break;
      }

      case NormalSkillId.RibcageShield: {
        soundEngine.playHeal();
        const ranks = this.getActiveUpgrades();
        const extraCharges =
          (ranks.pathD >= 6 ? 2 : ranks.pathD >= 3 ? 1 : 0) +
          (this.activeBlessingIds.has('skel_skill_ribcage_shield') ? 2 : 0);
        this.player.ribcageTimer = 6.5;
        this.player.ribcageCharges = 3 + extraCharges;
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: 70,
          color: '#E2E8F0',
          life: 0.28,
          maxLife: 0.28,
        });
        this.spawnBurst(this.player.x, this.player.y, '#E2E8F0', 12, 85);
        this.spawnPopup(this.player.x, this.player.y - 26, 'RIBCAGE SHIELD', '#E2E8F0', 0.95);
        break;
      }

      case NormalSkillId.SkeletalRush: {
        soundEngine.playDash();
        const joyMag = Math.hypot(this.joyX, this.joyY);
        const rushAngle = joyMag > 0.3 ? Math.atan2(this.joyY, this.joyX) : this.player.aimAngle;
        this.player.dashKind = 'SKELETAL_RUSH';
        this.player.dashSlotIndex = slotIndex;
        this.player.dashRefunded = false;
        this.player.dashTimer = 0.19;
        this.player.dashAngle = rushAngle;
        this.player.aimAngle = rushAngle;
        this.player.facingX = Math.cos(rushAngle) >= 0 ? 1 : -1;
        this.player.dashHitIds.clear();
        this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.26);
        this.slashes.push({
          x: this.player.x + Math.cos(rushAngle) * 30,
          y: this.player.y + Math.sin(rushAngle) * 30,
          angle: rushAngle,
          radius: 62,
          arcSpread: 1.25,
          color: '#60A5FA',
          life: 0.2,
          maxLife: 0.2,
          flip: false,
        });
        break;
      }

      case NormalSkillId.BoneStorm: {
        soundEngine.playSummon();
        const maelstrom = this.activeBlessingIds.has('skel_skill_bone_storm');
        this.player.boneStormTimer = maelstrom ? 8.5 : 5.5;
        this.player.boneStormTick = 0.05;
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: maelstrom ? 102 : 82,
          color: '#A5B4FC',
          life: 0.3,
          maxLife: 0.3,
        });
        this.spawnBurst(this.player.x, this.player.y, '#A5B4FC', 14, 110);
        this.spawnPopup(this.player.x, this.player.y - 26, 'BONE STORM', '#A5B4FC', 0.95);
        break;
      }

      // === GOBLIN NORMAL SKILLS ===
      case NormalSkillId.DaggerFlurry: {
        const hits = this.activeBlessingIds.has('gob_skill_dagger_flurry') ? 7 : 5;
        this.player.flurryTotal = hits;
        this.player.flurryRemaining = hits;
        this.player.flurryTimer = 0;
        break;
      }

      case NormalSkillId.Shadowstep: {
        soundEngine.playDash();
        const p = this.player;
        const umbral = this.activeBlessingIds.has('gob_skill_shadowstep');
        this.afterimages.push({
          x: p.x,
          y: p.y,
          facingX: p.facingX,
          color: '#F59E0B',
          life: 0.38,
          maxLife: 0.38,
        });
        this.spawnBurst(p.x, p.y, '#FBBF24', 10, 95);

        const target = this.findNearestEnemy(p.x, p.y, 325);
        if (target) {
          const behindX = target.x - target.facingX * (target.radius + 26);
          const behindY = target.y;
          const resolved = this.resolveWorldCollision(behindX, behindY, p.radius);
          p.x = resolved.x;
          p.y = resolved.y;
          p.aimAngle = Math.atan2(target.y - p.y, target.x - p.x);
          p.facingX = Math.cos(p.aimAngle) >= 0 ? 1 : -1;
          p.invulnTimer = Math.max(p.invulnTimer, 0.32);
          p.squashX = 1.26;
          p.squashY = 0.78;

          soundEngine.playSlash(2);
          this.slashes.push({
            x: p.x + Math.cos(p.aimAngle) * 16,
            y: p.y + Math.sin(p.aimAngle) * 16,
            angle: p.aimAngle,
            radius: 72,
            arcSpread: 1.65,
            color: '#FBBF24',
            life: 0.18,
            maxLife: 0.18,
            flip: false,
          });

          const opp = this.getOpportunisticBonus(target, p.x);
          const rawSurprise = 36 * this.getPhysicalDamageMultiplier() * opp.dmgMult;
          const roll = this.rollPhysicalAttack(
            rawSurprise,
            0.45 + opp.bonusCrit,
            umbral,
            opp.active
          );
          this.damageEnemy(target, roll.damage, true, p.x, p.y, true, roll.isCrit);
          this.applyGoblinPoisonIfActive(target);
          if (umbral) {
            p.normalCooldowns[slotIndex] = Math.max(0, p.normalCooldowns[slotIndex] - 2.0);
          }
          this.spawnPopup(p.x, p.y - 30, 'BACKSTAB!', '#FDE047', 1.0);
        } else {
          const blinkAngle =
            Math.hypot(this.joyX, this.joyY) > 0.2
              ? Math.atan2(this.joyY, this.joyX)
              : p.aimAngle;
          const resolved = this.resolveWorldCollision(
            p.x + Math.cos(blinkAngle) * 140,
            p.y + Math.sin(blinkAngle) * 140,
            p.radius
          );
          p.x = resolved.x;
          p.y = resolved.y;
          p.invulnTimer = Math.max(p.invulnTimer, 0.28);
          this.slashes.push({
            x: p.x + Math.cos(blinkAngle) * 16,
            y: p.y + Math.sin(blinkAngle) * 16,
            angle: blinkAngle,
            radius: 66,
            arcSpread: 1.5,
            color: '#FBBF24',
            life: 0.16,
            maxLife: 0.16,
            flip: false,
          });
        }
        this.spawnBurst(p.x, p.y, '#FDE047', 10, 95);
        break;
      }

      case NormalSkillId.ExplosiveTrap: {
        soundEngine.playPickup();
        const ranks = this.getActiveUpgrades();
        const kegBless = this.activeBlessingIds.has('gob_skill_explosive_trap') ? 1.45 : 1.0;
        const trapDmg = Math.round(
          48 * this.getPhysicalDamageMultiplier() * this.getPlagueOrSkillMultiplier() * kegBless
        );
        const blastRadius = Math.round(132 * (1 + ranks.pathD * 0.08));

        if (this.traps.length >= 4) {
          const oldest = this.traps.shift();
          if (oldest) this.detonateTrap(oldest);
        }

        this.traps.push({
          id: allocEntityId(),
          x: this.player.x,
          y: this.player.y,
          triggerRadius: 58,
          blastRadius,
          damage: trapDmg,
          armTimer: 0.3,
          life: 18,
        });
        this.spawnBurst(this.player.x, this.player.y, '#FB923C', 8, 70);
        this.spawnPopup(this.player.x, this.player.y - 24, 'TRAP SET', '#FB923C', 0.9);
        break;
      }

      case NormalSkillId.Windrunner: {
        soundEngine.playDash();
        this.player.windrunnerTimer = this.activeBlessingIds.has('gob_skill_windrunner')
          ? 7.5
          : 5.0;
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: 74,
          color: '#FDE047',
          life: 0.28,
          maxLife: 0.28,
        });
        this.spawnBurst(this.player.x, this.player.y, '#FDE047', 14, 115);
        this.spawnPopup(this.player.x, this.player.y - 26, 'WINDRUNNER!', '#FDE047', 0.98);
        break;
      }

      case NormalSkillId.PoisonedBlades: {
        soundEngine.playPlague();
        this.player.poisonBladesTimer = this.activeBlessingIds.has('gob_skill_poisoned_blades')
          ? 9.5
          : 6.5;
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: 68,
          color: '#A3E635',
          life: 0.26,
          maxLife: 0.26,
        });
        this.spawnBurst(this.player.x, this.player.y, '#A3E635', 14, 95);
        this.spawnPopup(this.player.x, this.player.y - 26, 'POISONED BLADES', '#A3E635', 0.96);
        break;
      }

      // === GNOME NORMAL SKILLS ===
      case NormalSkillId.IronFist: {
        soundEngine.playBossSlam();
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const tectonic = this.activeBlessingIds.has('gnome_skill_iron_fist');
        p.squashX = 1.32;
        p.squashY = 0.74;
        this.hitstopTimer = 0.045;
        this.shakeMag = Math.max(this.shakeMag, 8.5);

        const angle = p.aimAngle;
        const reach = (p.mountainHeartTimer > 0 ? 168 : 148) * (1 + ranks.pathB * 0.05);

        // Gauntlet punch slash + 3 forward tectonic shockwaves
        this.slashes.push({
          x: p.x + Math.cos(angle) * 20,
          y: p.y + Math.sin(angle) * 20,
          angle,
          radius: 78,
          arcSpread: 1.5,
          color: '#FB923C',
          life: 0.2,
          maxLife: 0.2,
          flip: false,
        });

        for (let step = 1; step <= 3; step++) {
          const distStep = (reach / 3) * step;
          const sx = p.x + Math.cos(angle) * distStep;
          const sy = p.y + Math.sin(angle) * distStep;
          this.shockwaves.push({
            x: sx,
            y: sy,
            maxRadius: 34 + step * 10,
            color: step === 3 ? '#FDBA74' : '#FB923C',
            life: 0.22 + step * 0.04,
            maxLife: 0.22 + step * 0.04,
          });
          this.spawnBurst(sx, sy, '#FDBA74', 5, 85);
        }

        const rawFistDmg =
          35 * (tectonic ? 1.35 : 1.0) * this.getPhysicalDamageMultiplier();
        const stunDur = 1.1 + ranks.pathC * 0.25 + (tectonic ? 0.7 : 0);

        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (this.isEnemyInArc(enemy, p.x, p.y, angle, reach, 0.72)) {
            const roll = this.rollPhysicalAttack(rawFistDmg, 0.15);
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
            this.applyEnemyStun(enemy, stunDur);
          }
        }
        this.hitDestructibleProps(p.x + Math.cos(angle) * (reach * 0.5), p.y + Math.sin(angle) * (reach * 0.5), reach * 0.65);

        if (tectonic) {
          p.ironFistAftershockTimer = 0.32;
          p.ironFistAftershockX = p.x;
          p.ironFistAftershockY = p.y;
          p.ironFistAftershockAngle = angle;
        }
        break;
      }

      case NormalSkillId.FortressStance: {
        soundEngine.playHeal();
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const aegis = this.activeBlessingIds.has('gnome_skill_fortress_stance');
        p.fortressTimer = 5.5 + ranks.pathD * 0.4 + (aegis ? 2.5 : 0);
        p.fortressTremorTick = 0.25;
        p.squashX = 1.18;
        p.squashY = 0.84;
        if (aegis) {
          this.healPlayer(Math.round(p.maxHp * 0.3));
        }
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 82,
          color: '#FDBA74',
          life: 0.3,
          maxLife: 0.3,
        });
        this.spawnBurst(p.x, p.y, '#FDBA74', 14, 95);
        this.spawnPopup(p.x, p.y - 26, 'FORTRESS STANCE!', '#FDBA74', 0.98);
        break;
      }

      case NormalSkillId.Groundbreaker: {
        soundEngine.playDash();
        const p = this.player;
        const joyMag = Math.hypot(this.joyX, this.joyY);
        const leapAngle = joyMag > 0.25 ? Math.atan2(this.joyY, this.joyX) : p.aimAngle;
        p.dashKind = 'GROUNDBREAKER_LEAP';
        p.dashSlotIndex = slotIndex;
        p.dashRefunded = false;
        p.leapTotalDuration = 0.24;
        p.dashTimer = 0.24;
        p.leapAirProgress = 0.05;
        p.dashAngle = leapAngle;
        p.aimAngle = leapAngle;
        p.facingX = Math.cos(leapAngle) >= 0 ? 1 : -1;
        p.dashHitIds.clear();
        p.invulnTimer = Math.max(p.invulnTimer, 0.34);
        this.spawnBurst(p.x, p.y, '#FB923C', 10, 90);
        break;
      }

      case NormalSkillId.MagneticGuard: {
        soundEngine.playSummon();
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const overcharged = this.activeBlessingIds.has('gnome_skill_magnetic_guard');
        p.magneticTimer = 5.5 + ranks.pathD * 0.4 + (overcharged ? 2.5 : 0);
        p.magneticZapTick = 0.15;
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 96,
          color: '#38BDF8',
          life: 0.28,
          maxLife: 0.28,
        });
        this.spawnBurst(p.x, p.y, '#38BDF8', 14, 105);
        this.spawnPopup(p.x, p.y - 26, 'MAGNETIC GUARD!', '#7DD3FC', 0.98);
        break;
      }

      case NormalSkillId.EarthenGrasp: {
        soundEngine.playBossSlam();
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const crushing = this.activeBlessingIds.has('gnome_skill_earthen_grasp');
        p.squashX = 1.24;
        p.squashY = 0.78;
        this.shakeMag = Math.max(this.shakeMag, 7);

        const rootDuration = 2.8 + ranks.pathC * 0.25 + (crushing ? 1.2 : 0);
        const crushMult = (crushing ? 1.45 : 1.0) * this.getPlagueOrSkillMultiplier();
        const initialDmg = Math.round(18 * crushMult);
        const dotDmg = Math.round(9 * crushMult);

        const inRange = [...this.world.enemies]
          .filter((e) => e && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= 220)
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)
          )
          .slice(0, 6);

        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 120,
          color: '#D97706',
          life: 0.26,
          maxLife: 0.26,
        });

        if (inRange.length > 0) {
          for (const target of inRange) {
            target.rootTimer = Math.max(target.rootTimer, rootDuration);
            target.vx = 0;
            target.vy = 0;
            this.damageEnemy(target, initialDmg, false, target.x, target.y);
            this.earthenGrasps.push({
              id: allocEntityId(),
              targetEnemyId: target.id,
              x: target.x,
              y: target.y,
              radius: Math.max(24, target.radius + 8),
              life: rootDuration,
              maxLife: rootDuration,
              tickTimer: 0.55,
              damagePerTick: dotDmg,
            });
            this.spawnBurst(target.x, target.y, '#D97706', 8, 80);
          }
          this.spawnPopup(p.x, p.y - 28, 'EARTHEN GRASP!', '#FDBA74', 0.98);
        } else {
          // Spawn a stone hand cluster ahead of the Gnome if cast with no nearby targets
          const gx = p.x + Math.cos(p.aimAngle) * 75;
          const gy = p.y + Math.sin(p.aimAngle) * 75;
          this.earthenGrasps.push({
            id: allocEntityId(),
            targetEnemyId: null,
            x: gx,
            y: gy,
            radius: 42,
            life: rootDuration,
            maxLife: rootDuration,
            tickTimer: 0.5,
            damagePerTick: dotDmg,
          });
          this.spawnBurst(gx, gy, '#D97706', 10, 85);
          this.hitDestructibleProps(gx, gy, 56);
        }
        break;
      }
    }
    this.emitHudSnapshot();
  }

  private applyEnemyStun(enemy: EnemyEntity, duration: number): void {
    if (enemy.kind === EnemyKind.TrainingDummy) return;
    const effective =
      enemy.kind === EnemyKind.SkeletonBoss ? duration * 0.55 : duration;
    enemy.stunTimer = Math.max(enemy.stunTimer, effective);
    if (enemy.aiState === 'WINDUP' || enemy.aiState === 'WHIRLWIND') {
      enemy.aiState = 'COOLDOWN';
      enemy.telegraphType = 'NONE';
      enemy.stateTimer = Math.max(enemy.stateTimer, 0.35);
    }
  }

  private triggerGroundbreakerCrash(): void {
    const p = this.player;
    const ranks = this.getActiveUpgrades();
    const faultline = this.activeBlessingIds.has('gnome_skill_groundbreaker');
    soundEngine.playBossSlam();
    this.hitstopTimer = 0.055;
    this.shakeMag = Math.max(this.shakeMag, 11);
    p.squashX = 1.38;
    p.squashY = 0.68;

    const crashRadius = Math.round(
      138 * (1 + ranks.pathB * 0.04) * (faultline ? 1.35 : 1.0)
    );
    this.shockwaves.push({
      x: p.x,
      y: p.y,
      maxRadius: crashRadius,
      color: '#FB923C',
      life: 0.34,
      maxLife: 0.34,
    });
    this.shockwaves.push({
      x: p.x,
      y: p.y,
      maxRadius: Math.round(crashRadius * 0.65),
      color: '#FDE047',
      life: 0.24,
      maxLife: 0.24,
    });
    this.spawnBurst(p.x, p.y, '#FB923C', 20, 155);
    this.spawnPopup(p.x, p.y - 30, 'GROUNDBREAKER!', '#FDBA74', 1.05);

    const rawCrash =
      38 *
      (faultline ? 1.35 : 1.0) *
      this.getPhysicalDamageMultiplier() *
      this.getPlagueOrSkillMultiplier();
    const stunDur = 0.95 + ranks.pathC * 0.25 + (faultline ? 0.55 : 0);

    for (const enemy of [...this.world.enemies]) {
      if (!enemy || enemy.hp <= 0) continue;
      if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= crashRadius + enemy.radius) {
        const roll = this.rollPhysicalAttack(rawCrash, 0.15);
        this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
        this.applyEnemyStun(enemy, stunDur);
      }
    }
    this.hitDestructibleProps(p.x, p.y, crashRadius);
  }

  private triggerCataclysmWave(waveIndex: number): void {
    const p = this.player;
    const ranks = this.getActiveUpgrades();
    const worldshatter = this.activeBlessingIds.has('gnome_ult_cataclysm');
    soundEngine.playBossSlam();
    this.shakeMag = Math.max(this.shakeMag, 10 + waveIndex * 2.5);

    const ox = p.cataclysmOriginX;
    const oy = p.cataclysmOriginY;
    const waveRadius = (125 + waveIndex * 78) * (1 + ranks.pathB * 0.04);

    this.shockwaves.push({
      x: ox,
      y: oy,
      maxRadius: waveRadius,
      color: waveIndex % 2 === 0 ? '#FB923C' : '#FDE047',
      life: 0.36,
      maxLife: 0.36,
    });
    this.spawnBurst(ox, oy, '#FDBA74', 14, 140 + waveIndex * 25);

    const waveDmg =
      (28 + waveIndex * 6) *
      this.getPhysicalDamageMultiplier() *
      this.getPlagueOrSkillMultiplier();
    const stunDur = (worldshatter ? 2.0 : 1.3) + ranks.pathC * 0.2;

    for (const enemy of [...this.world.enemies]) {
      if (!enemy || enemy.hp <= 0) continue;
      const dist = Math.hypot(enemy.x - ox, enemy.y - oy);
      const innerBand = waveIndex === 0 ? 0 : waveRadius - 95;
      if (dist >= innerBand && dist <= waveRadius + enemy.radius) {
        const roll = this.rollPhysicalAttack(waveDmg, 0.2);
        this.damageEnemy(enemy, roll.damage, true, ox, oy, true, roll.isCrit);
        this.applyEnemyStun(enemy, stunDur);
      }
    }
    this.hitDestructibleProps(ox, oy, waveRadius);
  }

  private performDaggerFlurryHit(step: number, isFinal: boolean): void {
    const p = this.player;
    soundEngine.playSlash(step % 3);
    const sevenfold = this.activeBlessingIds.has('gob_skill_dagger_flurry');
    const reach = isFinal && sevenfold ? 92 : 74;
    const jitter = (step % 2 === 0 ? 1 : -1) * (step * 0.06);
    const angle = p.aimAngle + jitter;
    const venomGlow = p.poisonBladesTimer > 0 || this.activeBlessingIds.has('gob_viper_toxin');

    p.squashX = 1.16;
    p.squashY = 0.86;
    this.slashes.push({
      x: p.x + Math.cos(angle) * 16,
      y: p.y + Math.sin(angle) * 16,
      angle,
      radius: reach,
      arcSpread: isFinal && sevenfold ? 1.85 : 1.35,
      color: venomGlow ? '#A3E635' : '#F59E0B',
      life: 0.11,
      maxLife: 0.11,
      flip: step % 2 === 0,
    });

    const rawDmg = (isFinal && sevenfold ? 20 : 13) * this.getPhysicalDamageMultiplier();
    this.hitEnemiesInArc(
      p.x,
      p.y,
      angle,
      reach,
      isFinal && sevenfold ? 1.05 : 0.85,
      rawDmg,
      isFinal,
      isFinal && sevenfold ? 1.0 : 0.12
    );
    this.hitDestructibleProps(p.x, p.y, reach);
  }

  private performPhantomFrenzyStep(step: number): void {
    const p = this.player;
    this.afterimages.push({
      x: p.x,
      y: p.y,
      facingX: p.facingX,
      color: step % 2 === 0 ? '#F59E0B' : '#FDE047',
      life: 0.42,
      maxLife: 0.42,
    });

    const candidates = this.world.enemies.filter((e) => e.hp > 0);
    if (candidates.length > 0) {
      const target = candidates[step % candidates.length];
      const strikeAngle = (step * Math.PI * 2) / Math.max(8, p.phantomTotal);
      const dest = this.resolveWorldCollision(
        target.x + Math.cos(strikeAngle) * (target.radius + 26),
        target.y + Math.sin(strikeAngle) * (target.radius + 26),
        p.radius
      );
      p.x = dest.x;
      p.y = dest.y;
      const toEnemy = Math.atan2(target.y - p.y, target.x - p.x);
      p.aimAngle = toEnemy;
      p.facingX = Math.cos(toEnemy) >= 0 ? 1 : -1;

      soundEngine.playSlash(step % 3);
      this.slashes.push({
        x: p.x + Math.cos(toEnemy) * 14,
        y: p.y + Math.sin(toEnemy) * 14,
        angle: toEnemy,
        radius: 78,
        arcSpread: 1.8,
        color: '#F59E0B',
        life: 0.14,
        maxLife: 0.14,
        flip: step % 2 === 0,
      });

      const opp = this.getOpportunisticBonus(target, p.x);
      const raw = 25 * this.getPhysicalDamageMultiplier() * opp.dmgMult;
      const roll = this.rollPhysicalAttack(raw, 0.35 + opp.bonusCrit, false, opp.active);
      this.damageEnemy(
        target,
        roll.damage,
        true,
        p.x,
        p.y,
        step === p.phantomTotal,
        roll.isCrit
      );
      this.applyGoblinPoisonIfActive(target);
    } else {
      const ang = (step * Math.PI * 2) / Math.max(8, p.phantomTotal);
      const dest = this.resolveWorldCollision(
        p.x + Math.cos(ang) * 55,
        p.y + Math.sin(ang) * 55,
        p.radius
      );
      p.x = dest.x;
      p.y = dest.y;
      soundEngine.playSlash(step % 2);
      this.slashes.push({
        x: p.x,
        y: p.y,
        angle: ang,
        radius: 68,
        arcSpread: 1.8,
        color: '#F59E0B',
        life: 0.13,
        maxLife: 0.13,
        flip: step % 2 === 0,
      });
    }
    this.shakeMag = Math.max(this.shakeMag, 4.5);
  }

  private performKingOfThievesStep(): void {
    const p = this.player;
    this.afterimages.push({
      x: p.x,
      y: p.y,
      facingX: p.facingX,
      color: '#FBBF24',
      life: 0.45,
      maxLife: 0.45,
    });

    const alive = this.world.enemies.filter((e) => e.hp > 0);
    if (alive.length === 0) return;

    const target = alive[Math.floor(Math.random() * alive.length)];
    const behind = this.resolveWorldCollision(
      target.x - target.facingX * (target.radius + 24),
      target.y + (Math.random() - 0.5) * 18,
      p.radius
    );
    p.x = behind.x;
    p.y = behind.y;
    const toTarget = Math.atan2(target.y - p.y, target.x - p.x);
    p.aimAngle = toTarget;
    p.facingX = Math.cos(toTarget) >= 0 ? 1 : -1;

    soundEngine.playSlash(2);
    this.slashes.push({
      x: p.x + Math.cos(toTarget) * 14,
      y: p.y + Math.sin(toTarget) * 14,
      angle: toTarget,
      radius: 74,
      arcSpread: 1.7,
      color: '#FDE047',
      life: 0.15,
      maxLife: 0.15,
      flip: false,
    });

    // Steals strength & vitality from struck foe!
    target.infectionStacks = Math.min(3, target.infectionStacks + 2);
    target.infectionTimer = 0.65;
    target.slowTimer = Math.max(target.slowTimer, 3.0);
    target.slowFactor = Math.min(target.slowFactor, 0.7);

    const opp = this.getOpportunisticBonus(target, p.x);
    const raw = 28 * this.getPhysicalDamageMultiplier() * opp.dmgMult;
    const roll = this.rollPhysicalAttack(raw, 0.35 + opp.bonusCrit, false, opp.active);
    this.tethers.push({
      fromX: target.x,
      fromY: target.y,
      life: 0.32,
      maxLife: 0.32,
    });
    this.damageEnemy(target, roll.damage, true, p.x, p.y, true, roll.isCrit);
    this.applyGoblinPoisonIfActive(target);
    this.healPlayer(8);
    if (!this.world.isGuild) {
      this.runCoins += this.activeBlessingIds.has('gob_ult_thieves') ? 4 : 2;
    }
  }

  private performRottingClawHit(step: number): void {
    const p = this.player;
    const ranks = this.getActiveUpgrades();
    const festering = this.activeBlessingIds.has('zombie_skill_rotting_claw');
    soundEngine.playSlash(step);
    const reach = p.abominationTimer > 0 ? 96 : 76;
    const angleJitter = (step - 2) * 0.16;
    const angle = p.aimAngle + angleJitter;

    this.slashes.push({
      x: p.x + Math.cos(angle) * 18,
      y: p.y + Math.sin(angle) * 18,
      angle,
      radius: reach,
      arcSpread: 1.55,
      color: '#4ADE80',
      life: 0.22,
      maxLife: 0.22,
      flip: step % 2 === 0,
      kind: 'ZOMBIE_BASIC_ATTACK',
      scale: p.abominationTimer > 0 ? 1.4 : 1.05,
    });

    const rawDmg = 16 * (festering ? 1.25 : 1.0) * this.getPhysicalDamageMultiplier();
    const slowDuration = 3.5 + ranks.pathB * 0.4;
    for (const enemy of [...this.world.enemies]) {
      if (!enemy || enemy.hp <= 0) continue;
      if (this.isEnemyInArc(enemy, p.x, p.y, angle, reach, 0.95)) {
        const roll = this.rollPhysicalAttack(rawDmg);
        this.damageEnemy(
          enemy,
          roll.damage,
          true,
          p.x,
          p.y,
          step === p.rottingComboTotal,
          roll.isCrit
        );
        enemy.slowTimer = Math.max(enemy.slowTimer, slowDuration);
        enemy.slowFactor = 0.6;
        this.applyInfectiousTouch(enemy, festering ? 2 : 1);
        this.slashes.push({
          x: enemy.x,
          y: enemy.y,
          angle: angle + (Math.random() - 0.5) * 0.4,
          radius: 46 * (p.abominationTimer > 0 ? 1.4 : 1.0),
          arcSpread: 0,
          color: '#A3E635',
          life: 0.32,
          maxLife: 0.32,
          flip: Math.random() < 0.5,
          kind: 'ZOMBIE_POISON_BURST',
          scale: p.abominationTimer > 0 ? 1.35 : 1.0,
        });
        this.spawnBurst(enemy.x, enemy.y, '#A3E635', 6, 60);
      }
    }
    this.hitDestructibleProps(p.x, p.y, reach);
  }

  private castUltimateSkill(): void {
    const p = this.player;
    const loadout = this.getActiveLoadout();
    const ultId = loadout.ultimateSkill;
    p.ultCharge = 0;
    p.ultCooldown = p.ultMaxCooldown;

    switch (ultId) {
      // === ZOMBIE ULTIMATE SKILLS ===
      case UltimateSkillId.AbominationForm: {
        soundEngine.playBossSlam();
        const behemoth = this.activeBlessingIds.has('zombie_ult_abomination');
        p.abominationTimer = behemoth ? 14.0 : 10.0;
        p.abomStompTick = 0.8;
        p.squashX = 1.35;
        p.squashY = 0.72;
        this.hitstopTimer = 0.055;
        this.shakeMag = 10;
        this.healPlayer(Math.round(p.maxHp * (behemoth ? 0.45 : 0.25)));
        if (behemoth) {
          p.normalCooldowns = [0, 0];
        }
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 150,
          color: '#4ADE80',
          life: 0.36,
          maxLife: 0.36,
        });
        this.spawnBurst(p.x, p.y, '#4ADE80', 22, 160);
        this.spawnPopup(p.x, p.y - 34, 'ABOMINATION!', '#4ADE80', 1.15);
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 150 + enemy.radius) {
            this.damageEnemy(
              enemy,
              Math.round(28 * this.getPhysicalDamageMultiplier()),
              true,
              p.x,
              p.y,
              true
            );
          }
        }
        break;
      }

      case UltimateSkillId.KingdomOfTheDead: {
        soundEngine.playSummon();
        const ranks = this.getActiveUpgrades();
        const lordGraves = this.activeBlessingIds.has('zombie_ult_kingdom');
        this.shakeMag = 8;
        const hordeCount = 7 + (lordGraves ? 3 : 0);
        const hordeLife = 14 + ranks.pathD * 1.5;
        if (lordGraves) {
          p.normalCooldowns = [0, 0];
        }
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 165,
          color: '#A3E635',
          life: 0.4,
          maxLife: 0.4,
        });
        this.spawnPopup(p.x, p.y - 34, 'KINGDOM OF THE DEAD', '#A3E635', 1.1);
        for (let i = 0; i < hordeCount; i++) {
          const ang = (i / hordeCount) * Math.PI * 2;
          const sx = p.x + Math.cos(ang) * 72;
          const sy = p.y + Math.sin(ang) * 62;
          this.spawnMinion(sx, sy, hordeLife, true, 'ZOMBIE_SHAMBLER');
        }
        break;
      }

      case UltimateSkillId.DeathsEmbrace: {
        soundEngine.playBossSlam();
        const ravenous = this.activeBlessingIds.has('zombie_ult_embrace');
        this.hitstopTimer = 0.07;
        this.shakeMag = 13;
        p.squashX = 1.4;
        p.squashY = 0.65;
        if (ravenous) {
          p.normalCooldowns = [0, 0];
        }
        const slamRadius = 250;
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: slamRadius,
          color: '#2DD4BF',
          life: 0.42,
          maxLife: 0.42,
        });
        this.spawnBurst(p.x, p.y, '#2DD4BF', 28, 190);
        this.spawnPopup(p.x, p.y - 34, "DEATH'S EMBRACE", '#5EEAD4', 1.15);

        let totalDrain = 0;
        const waveDmg = Math.round(
          58 * (ravenous ? 1.4 : 1.0) * this.getPlagueOrSkillMultiplier()
        );
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= slamRadius + enemy.radius) {
            this.tethers.push({
              fromX: enemy.x,
              fromY: enemy.y,
              life: 0.45,
              maxLife: 0.45,
            });
            this.damageEnemy(enemy, waveDmg, false, p.x, p.y, true);
            this.applyInfectiousTouch(enemy, 3);
            totalDrain += ravenous ? 24 : 14;
          }
        }
        if (totalDrain > 0) {
          this.healPlayer(totalDrain);
        }
        this.hitDestructibleProps(p.x, p.y, slamRadius);
        break;
      }

      // === SKELETON ULTIMATE SKILLS ===
      case UltimateSkillId.BoneColossus: {
        soundEngine.playBossSlam();
        const dread = this.activeBlessingIds.has('skel_ult_colossus');
        p.colossusTimer = dread ? 14.0 : 10.0;
        p.colossusShockTick = 0.75;
        p.squashX = 1.38;
        p.squashY = 0.7;
        this.hitstopTimer = 0.06;
        this.shakeMag = 11;
        this.healPlayer(Math.round(p.maxHp * 0.2));
        if (dread) {
          p.normalCooldowns = [0, 0];
        }
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 160,
          color: '#38BDF8',
          life: 0.38,
          maxLife: 0.38,
        });
        this.spawnBurst(p.x, p.y, '#F8FAFC', 24, 175);
        this.spawnPopup(p.x, p.y - 36, 'BONE COLOSSUS!', '#38BDF8', 1.18);

        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 160 + enemy.radius) {
            const roll = this.rollPhysicalAttack(
              32 * this.getPhysicalDamageMultiplier(),
              0,
              true
            );
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, true);
          }
        }
        this.hitDestructibleProps(p.x, p.y, 160);
        break;
      }

      case UltimateSkillId.ArmyOfBones: {
        soundEngine.playSummon();
        const phalanx = this.activeBlessingIds.has('skel_ult_army');
        this.shakeMag = 9;
        const legionCount = phalanx ? 9 : 6;
        if (phalanx) {
          p.normalCooldowns = [0, 0];
        }
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 170,
          color: '#818CF8',
          life: 0.4,
          maxLife: 0.4,
        });
        this.spawnBurst(p.x, p.y, '#818CF8', 22, 150);
        this.spawnPopup(p.x, p.y - 34, 'ARMY OF BONES!', '#818CF8', 1.14);
        for (let i = 0; i < legionCount; i++) {
          const ang = (i / legionCount) * Math.PI * 2;
          const sx = p.x + Math.cos(ang) * 70;
          const sy = p.y + Math.sin(ang) * 60;
          this.spawnMinion(sx, sy, 15, true, 'SKELETON_WARRIOR_ALLY');
        }
        break;
      }

      case UltimateSkillId.ReapersJudgment: {
        soundEngine.playBossSlam();
        soundEngine.playSlash(2);
        const harvest = this.activeBlessingIds.has('skel_ult_reaper');
        this.hitstopTimer = 0.075;
        this.shakeMag = 14;
        p.squashX = 1.36;
        p.squashY = 0.68;
        if (harvest) {
          p.normalCooldowns = [0, 0];
          this.healPlayer(25);
        }

        const angle = p.aimAngle;
        const scytheReach = 168;
        this.slashes.push({
          x: p.x + Math.cos(angle) * 20,
          y: p.y + Math.sin(angle) * 20,
          angle,
          radius: scytheReach,
          arcSpread: 2.55,
          color: '#C084FC',
          life: 0.28,
          maxLife: 0.28,
          flip: false,
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 150,
          color: '#C084FC',
          life: 0.34,
          maxLife: 0.34,
        });
        this.spawnBurst(p.x, p.y, '#C084FC', 26, 185);
        this.spawnPopup(p.x, p.y - 36, "REAPER'S JUDGMENT!", '#C084FC', 1.18);

        // Wide spectral scythe sweep (Guaranteed Critical Strike!)
        const rawSweep = 48 * this.getPhysicalDamageMultiplier();
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (this.isEnemyInArc(enemy, p.x, p.y, angle, scytheReach, 1.38)) {
            const roll = this.rollPhysicalAttack(rawSweep, 0, true);
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, true);
          }
        }
        this.hitDestructibleProps(p.x, p.y, scytheReach);

        // Piercing dark energy wave(s) launched forward
        const waveSpeed = 470;
        const waveRaw = 42 * this.getPhysicalDamageMultiplier() * this.getPlagueOrSkillMultiplier();
        const waveAngles = harvest ? [angle - 0.24, angle, angle + 0.24] : [angle];
        for (const wa of waveAngles) {
          this.projectiles.push({
            id: allocEntityId(),
            fromPlayer: true,
            x: p.x + Math.cos(wa) * 32,
            y: p.y + Math.sin(wa) * 32,
            vx: Math.cos(wa) * waveSpeed,
            vy: Math.sin(wa) * waveSpeed,
            radius: 36,
            damage: waveRaw,
            life: 1.5,
            color: '#C084FC',
            kind: 'PLAYER_DARK_WAVE',
            angle: wa,
            pierce: true,
            hitEnemyIds: new Set<number>(),
          });
        }
        break;
      }

      // === GOBLIN ULTIMATE SKILLS ===
      case UltimateSkillId.PhantomFrenzy: {
        soundEngine.playDash();
        const mirage = this.activeBlessingIds.has('gob_ult_phantom');
        const total = mirage ? 11 : 8;
        p.phantomTotal = total;
        p.phantomRemaining = total;
        p.phantomTimer = 0;
        p.invulnTimer = Math.max(p.invulnTimer, mirage ? 1.25 : 0.95);
        if (mirage) {
          p.normalCooldowns = [0, 0];
          this.healPlayer(24);
        }
        this.shakeMag = 8;
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 140,
          color: '#F59E0B',
          life: 0.32,
          maxLife: 0.32,
        });
        this.spawnPopup(p.x, p.y - 34, 'PHANTOM FRENZY!', '#F59E0B', 1.14);
        break;
      }

      case UltimateSkillId.KingOfThieves: {
        soundEngine.playSummon();
        const plunder = this.activeBlessingIds.has('gob_ult_thieves');
        p.stolenMightTimer = 8.0;
        p.kingThievesRemaining = plunder ? 8 : 6;
        p.kingThievesTimer = 0;
        p.invulnTimer = Math.max(p.invulnTimer, plunder ? 1.15 : 0.9);
        if (plunder) {
          p.normalCooldowns = [0, 0];
        }
        this.shakeMag = 9;
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 155,
          color: '#FBBF24',
          life: 0.36,
          maxLife: 0.36,
        });
        this.spawnBurst(p.x, p.y, '#FDE047', 20, 145);
        this.spawnPopup(p.x, p.y - 36, 'KING OF THIEVES!', '#FDE047', 1.15);
        break;
      }

      case UltimateSkillId.ThousandDaggers: {
        soundEngine.playArrow();
        soundEngine.playBossSlam();
        const tempest = this.activeBlessingIds.has('gob_ult_thousand');
        this.hitstopTimer = 0.05;
        this.shakeMag = 11;
        p.squashX = 1.3;
        p.squashY = 0.74;
        if (tempest) {
          p.normalCooldowns = [0, 0];
        }

        // 360-degree radial enchanted dagger fan
        const daggerCount = 14;
        const daggerSpeed = 590;
        const daggerRaw = 24 * this.getPhysicalDamageMultiplier() * this.getPlagueOrSkillMultiplier();
        for (let i = 0; i < daggerCount; i++) {
          const ang = (i / daggerCount) * Math.PI * 2;
          this.projectiles.push({
            id: allocEntityId(),
            fromPlayer: true,
            x: p.x + Math.cos(ang) * 18,
            y: p.y + Math.sin(ang) * 18,
            vx: Math.cos(ang) * daggerSpeed,
            vy: Math.sin(ang) * daggerSpeed,
            radius: 9,
            damage: daggerRaw,
            life: 1.1,
            color: '#FDE68A',
            kind: 'PLAYER_ENCHANTED_DAGGER',
            angle: ang,
            pierce: true,
            hitEnemyIds: new Set<number>(),
          });
        }

        // Large sky-rain target zone centered on nearest enemy or ahead of Goblin
        const focusTarget = this.findNearestEnemy(p.x, p.y, 280);
        const zoneX = focusTarget ? focusTarget.x : p.x + Math.cos(p.aimAngle) * 75;
        const zoneY = focusTarget ? focusTarget.y : p.y + Math.sin(p.aimAngle) * 75;
        const rainRadius = tempest ? 238 : 190;
        const rainLife = tempest ? 4.0 : 2.4;
        this.daggerRains.push({
          id: allocEntityId(),
          x: zoneX,
          y: zoneY,
          radius: rainRadius,
          life: rainLife,
          maxLife: rainLife,
          tickTimer: 0.08,
          damagePerVolley: 19 * this.getPhysicalDamageMultiplier() * this.getPlagueOrSkillMultiplier(),
        });

        this.shockwaves.push({
          x: zoneX,
          y: zoneY,
          maxRadius: rainRadius,
          color: '#34D399',
          life: 0.36,
          maxLife: 0.36,
        });
        this.spawnPopup(p.x, p.y - 36, 'THOUSAND DAGGERS!', '#34D399', 1.16);
        break;
      }

      // === GNOME ULTIMATE SKILLS ===
      case UltimateSkillId.MountainsHeart: {
        soundEngine.playBossSlam();
        const livingMtn = this.activeBlessingIds.has('gnome_ult_mountain');
        p.mountainHeartTimer = livingMtn ? 14.0 : 10.0;
        p.mountainTremorTick = 0.7;
        p.squashX = 1.4;
        p.squashY = 0.68;
        this.hitstopTimer = 0.065;
        this.shakeMag = 12;
        this.healPlayer(Math.round(p.maxHp * (livingMtn ? 0.35 : 0.25)));
        if (livingMtn) {
          p.normalCooldowns = [0, 0];
        }
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 165,
          color: '#FB923C',
          life: 0.38,
          maxLife: 0.38,
        });
        this.spawnBurst(p.x, p.y, '#FDBA74', 24, 175);
        this.spawnPopup(p.x, p.y - 38, "MOUNTAIN'S HEART!", '#FB923C', 1.18);

        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 165 + enemy.radius) {
            const roll = this.rollPhysicalAttack(34 * this.getPhysicalDamageMultiplier(), 0.2);
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
            this.applyEnemyStun(enemy, 1.1);
          }
        }
        this.hitDestructibleProps(p.x, p.y, 165);
        break;
      }

      case UltimateSkillId.TitansRampart: {
        soundEngine.playBossSlam();
        soundEngine.playSummon();
        const ranks = this.getActiveUpgrades();
        const citadel = this.activeBlessingIds.has('gnome_ult_rampart');
        this.hitstopTimer = 0.055;
        this.shakeMag = 12;
        p.squashX = 1.3;
        p.squashY = 0.74;
        p.rampartTremorTick = 0.9;
        if (citadel) {
          p.normalCooldowns = [0, 0];
        }

        const ringRadius = 165;
        const wallCount = 8;
        const wallLife = 6.5 + ranks.pathD * 0.4 + (citadel ? 3.0 : 0);
        this.stoneRamparts = [];
        for (let i = 0; i < wallCount; i++) {
          const ang = (i / wallCount) * Math.PI * 2;
          const wx = p.x + Math.cos(ang) * ringRadius;
          const wy = p.y + Math.sin(ang) * (ringRadius * 0.86);
          if (!this.isPointInsideWalkableArea(wx, wy)) continue;
          this.stoneRamparts.push({
            id: allocEntityId(),
            x: wx,
            y: wy,
            radius: 26,
            angle: ang,
            life: wallLife,
            maxLife: wallLife,
          });
          this.spawnBurst(wx, wy, '#D97706', 8, 90);
        }

        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: ringRadius + 15,
          color: '#FB923C',
          life: 0.4,
          maxLife: 0.4,
        });
        this.spawnPopup(p.x, p.y - 36, "TITAN'S RAMPART!", '#FDBA74', 1.16);

        const eruptDmg = Math.round(
          28 * this.getPhysicalDamageMultiplier() * (1 + ranks.pathD * 0.1)
        );
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= ringRadius + 28) {
            this.damageEnemy(enemy, eruptDmg, true, p.x, p.y, false);
            this.applyEnemyStun(enemy, 0.9);
          }
        }
        break;
      }

      case UltimateSkillId.CataclysmicSlam: {
        soundEngine.playBossSlam();
        const worldshatter = this.activeBlessingIds.has('gnome_ult_cataclysm');
        this.hitstopTimer = 0.075;
        this.shakeMag = 15;
        p.squashX = 1.44;
        p.squashY = 0.62;
        if (worldshatter) {
          p.normalCooldowns = [0, 0];
        }
        const waves = worldshatter ? 4 : 3;
        p.cataclysmTotalWaves = waves;
        p.cataclysmWavesRemaining = waves;
        p.cataclysmWaveTimer = 0;
        p.cataclysmOriginX = p.x;
        p.cataclysmOriginY = p.y;
        this.spawnPopup(p.x, p.y - 38, 'CATACLYSMIC SLAM!', '#FB923C', 1.2);
        break;
      }
    }

    this.emitHudSnapshot();
  }

  private spawnMinion(
    x: number,
    y: number,
    duration: number,
    frenzied: boolean,
    minionType: 'ZOMBIE_SHAMBLER' | 'SKELETON_WARRIOR_ALLY'
  ): void {
    const resolved = this.resolveWorldCollision(x, y, 12);
    const ranks = this.getActiveUpgrades();
    const isSkeletal = minionType === 'SKELETON_WARRIOR_ALLY';
    const masteryMult = 1 + ranks.pathD * (isSkeletal ? 0.18 : 0.22);
    const endlessBless =
      !isSkeletal &&
      (this.activeBlessingIds.has('zombie_skill_grave_call') ||
        this.activeBlessingIds.has('zombie_ult_kingdom'));
    const blessSpeed = endlessBless ? 1.25 : 1.0;
    const hp = Math.round((isSkeletal ? 42 : 46) * masteryMult);
    const baseDmg = isSkeletal ? 15 : frenzied ? 13 : 11;
    const dmg = Math.round(baseDmg * masteryMult * (endlessBless ? 1.15 : 1));

    this.minions.push({
      id: allocEntityId(),
      minionType,
      x: resolved.x,
      y: resolved.y,
      vx: 0,
      vy: 0,
      radius: 12,
      hp,
      maxHp: hp,
      damage: dmg,
      speed: (isSkeletal ? 210 : frenzied ? 192 : 168) * blessSpeed,
      lifeTimer: duration,
      maxLife: duration,
      attackCooldown: 0.15,
      walkPhase: Math.random() * 5,
      hitFlashTimer: 0,
      facingX: 1,
      sproutVariant: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      spawnAnimTimer: 0.24,
    });
    this.spawnBurst(resolved.x, resolved.y, isSkeletal ? '#7DD3FC' : '#86EFAC', 8, 75);
  }

  private updateMinions(dt: number): void {
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      m.lifeTimer -= dt;
      if (m.spawnAnimTimer > 0) m.spawnAnimTimer -= dt;
      if (m.hitFlashTimer > 0) m.hitFlashTimer -= dt;
      if (m.attackCooldown > 0) m.attackCooldown -= dt;

      if (m.lifeTimer <= 0 || m.hp <= 0) {
        this.spawnBurst(
          m.x,
          m.y,
          m.minionType === 'SKELETON_WARRIOR_ALLY' ? '#7DD3FC' : '#68A357',
          6,
          55
        );
        this.minions.splice(i, 1);
        continue;
      }

      const target = this.findNearestEnemy(m.x, m.y, 520);
      if (target) {
        const dx = target.x - m.x;
        const dy = target.y - m.y;
        const dist = Math.hypot(dx, dy);
        m.facingX = dx >= 0 ? 1 : -1;

        if (dist > m.radius + target.radius + 6) {
          m.vx = (dx / dist) * m.speed;
          m.vy = (dy / dist) * m.speed;
          m.walkPhase += dt * 15;
        } else {
          m.vx *= 0.6;
          m.vy *= 0.6;
          if (m.attackCooldown <= 0) {
            const isSkeletal = m.minionType === 'SKELETON_WARRIOR_ALLY';
            m.attackCooldown = isSkeletal ? 0.52 : 0.62;
            soundEngine.playHit(false);
            if (isSkeletal) {
              const ang = Math.atan2(dy, dx);
              this.slashes.push({
                x: m.x + Math.cos(ang) * 8,
                y: m.y + Math.sin(ang) * 8,
                angle: ang,
                radius: 26,
                arcSpread: 1.2,
                color: '#38BDF8',
                life: 0.11,
                maxLife: 0.11,
                flip: false,
              });
              const isCrit = Math.random() < 0.25;
              const hitDmg = isCrit ? Math.round(m.damage * 1.75) : m.damage;
              this.damageEnemy(target, hitDmg, true, m.x, m.y, false, isCrit);
            } else {
              const ang = Math.atan2(dy, dx);
              this.slashes.push({
                x: m.x + Math.cos(ang) * 8,
                y: m.y + Math.sin(ang) * 8,
                angle: ang,
                radius: 30,
                arcSpread: 1.25,
                color: '#4ADE80',
                life: 0.22,
                maxLife: 0.22,
                flip: Math.random() < 0.5,
                kind: 'ZOMBIE_BASIC_ATTACK',
                scale: 0.65,
              });
              this.damageEnemy(target, m.damage, true, m.x, m.y);
              this.applyInfectiousTouch(target, 1);
            }
          }
        }
      } else {
        const dx = this.player.x - m.x;
        const dy = this.player.y - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 64) {
          m.vx = (dx / dist) * (m.speed * 0.72);
          m.vy = (dy / dist) * (m.speed * 0.72);
          m.facingX = dx >= 0 ? 1 : -1;
          m.walkPhase += dt * 11;
        } else {
          m.vx *= 0.8;
          m.vy *= 0.8;
        }
      }

      for (let j = 0; j < this.minions.length; j++) {
        if (i === j) continue;
        const other = this.minions[j];
        const sdx = m.x - other.x;
        const sdy = m.y - other.y;
        const sdist = Math.hypot(sdx, sdy);
        if (sdist > 0.1 && sdist < 22) {
          m.vx += (sdx / sdist) * 90 * dt * 10;
          m.vy += (sdy / sdist) * 90 * dt * 10;
        }
      }

      const resolved = this.resolveWorldCollision(m.x + m.vx * dt, m.y + m.vy * dt, m.radius);
      m.x = resolved.x;
      m.y = resolved.y;
    }
  }

  private updateEnemies(dt: number): void {
    const enemiesSnapshot = [...this.world.enemies];
    for (const e of enemiesSnapshot) {
      if (!e || e.hp <= 0) continue;

      e.squashX += (1 - e.squashX) * 10 * dt;
      e.squashY += (1 - e.squashY) * 10 * dt;
      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) e.slowFactor = 1;
      }

      if (e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - dt);
      }
      if (e.rootTimer > 0) {
        e.rootTimer = Math.max(0, e.rootTimer - dt);
      }

      if (e.infectionStacks > 0 || e.plagueTimer > 0) {
        e.infectionTimer -= dt;
        if (e.plagueTimer > 0) e.plagueTimer -= dt;

        if (e.infectionTimer <= 0) {
          e.infectionTimer = 0.75;
          const strainMult =
            (this.activeBlessingIds.has('zombie_virulent_strain') ? 1.35 : 1.0) *
            (this.activeBlessingIds.has('gob_skill_poisoned_blades') ? 1.4 : 1.0);
          const infDmg =
            e.infectionStacks * Math.round(5 * this.getPlagueOrSkillMultiplier() * strainMult);
          const plagueDmg =
            e.plagueTimer > 0 ? Math.round(6 * this.getPlagueOrSkillMultiplier() * strainMult) : 0;
          const totalDot = infDmg + plagueDmg;
          if (totalDot > 0) {
            this.damageEnemy(e, totalDot, false, e.x, e.y);
            if (e.hp <= 0) continue;
          }
        }
      }

      if (e.kind === EnemyKind.TrainingDummy) {
        if (e.hp < e.maxHp && e.hitFlashTimer <= 0) {
          e.hp = Math.min(e.maxHp, e.hp + 40 * dt);
        }
        continue;
      }

      // Stunned enemies cannot act or windup attacks
      if (e.stunTimer > 0) {
        if (e.aiState === 'WINDUP' || e.aiState === 'WHIRLWIND') {
          e.aiState = 'COOLDOWN';
          e.telegraphType = 'NONE';
          e.stateTimer = Math.max(e.stateTimer, 0.25);
        }
        e.vx *= 0.78;
        e.vy *= 0.78;
        const stunnedPos = this.resolveEnemyRampartCollision(
          this.resolveWorldCollision(e.x + e.vx * dt, e.y + e.vy * dt, e.radius),
          e.radius
        );
        e.x = stunnedPos.x;
        e.y = stunnedPos.y;
        continue;
      }

      const target = this.pickEnemyTarget(e);
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy);
      const angleToTarget = Math.atan2(dy, dx);
      const isRooted = e.rootTimer > 0;
      const moveSpeed = isRooted ? 0 : e.speed * e.slowFactor;

      if (e.kind === EnemyKind.SkeletonWarrior) {
        this.updateWarriorAi(e, dt, dist, angleToTarget, moveSpeed);
      } else if (e.kind === EnemyKind.SkeletonArcher) {
        this.updateArcherAi(e, dt, dist, angleToTarget, moveSpeed);
      } else if (e.kind === EnemyKind.SkeletonBoss) {
        this.updateBossAi(e, dt, dist, angleToTarget, moveSpeed);
      }

      if (isRooted) {
        e.vx *= 0.4;
        e.vy *= 0.4;
      }

      const worldPos = this.resolveWorldCollision(e.x + e.vx * dt, e.y + e.vy * dt, e.radius);
      const resolved = this.resolveEnemyRampartCollision(worldPos, e.radius);
      e.x = resolved.x;
      e.y = resolved.y;
    }
  }

  private resolveEnemyRampartCollision(
    pos: { x: number; y: number },
    radius: number
  ): { x: number; y: number } {
    let cx = pos.x;
    let cy = pos.y;
    for (const wall of this.stoneRamparts) {
      const dx = cx - wall.x;
      const dy = cy - wall.y;
      const dist = Math.hypot(dx, dy);
      const minSep = radius + wall.radius;
      if (dist < minSep) {
        if (dist > 0.001) {
          cx = wall.x + (dx / dist) * minSep;
          cy = wall.y + (dy / dist) * minSep;
        } else {
          cx = wall.x + minSep;
        }
      }
    }
    return { x: cx, y: cy };
  }

  private updateWarriorAi(
    e: EnemyEntity,
    dt: number,
    dist: number,
    angleToTarget: number,
    moveSpeed: number
  ): void {
    if (e.attackCooldown > 0) e.attackCooldown -= dt;

    if (e.aiState === 'WINDUP') {
      e.vx *= 0.82;
      e.vy *= 0.82;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'COOLDOWN';
        e.stateTimer = 0.45;
        e.attackCooldown = 1.25;
        e.telegraphType = 'NONE';
        e.vx = Math.cos(e.telegraphAngle) * 260;
        e.vy = Math.sin(e.telegraphAngle) * 260;
        soundEngine.playSlash(0);
        this.slashes.push({
          x: e.x + Math.cos(e.telegraphAngle) * 14,
          y: e.y + Math.sin(e.telegraphAngle) * 14,
          angle: e.telegraphAngle,
          radius: 56,
          arcSpread: 1.4,
          color: '#FBBF24',
          life: 0.14,
          maxLife: 0.14,
          flip: false,
        });
        const rawDmg = 16 + (this.world.floorNumber - 1) * 3;
        this.damagePlayerOrMinionInArc(e, e.telegraphAngle, 64, 0.85, rawDmg);
      }
      return;
    }

    if (e.aiState === 'COOLDOWN') {
      e.vx *= 0.88;
      e.vy *= 0.88;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.aiState = 'CHASE';
      return;
    }

    e.facingX = Math.cos(angleToTarget) >= 0 ? 1 : -1;
    if (dist <= 58 && e.attackCooldown <= 0) {
      e.aiState = 'WINDUP';
      e.stateTimer = 0.38;
      e.telegraphAngle = angleToTarget;
      e.telegraphType = 'SLASH';
      e.squashX = 0.88;
      e.squashY = 1.14;
    } else {
      e.vx = Math.cos(angleToTarget) * moveSpeed;
      e.vy = Math.sin(angleToTarget) * moveSpeed;
      e.walkPhase += dt * 11;
    }
  }

  private updateArcherAi(
    e: EnemyEntity,
    dt: number,
    dist: number,
    angleToTarget: number,
    moveSpeed: number
  ): void {
    if (e.attackCooldown > 0) e.attackCooldown -= dt;

    if (e.aiState === 'WINDUP') {
      e.vx *= 0.8;
      e.vy *= 0.8;
      e.stateTimer -= dt;
      if (e.stateTimer > 0.2) {
        e.telegraphAngle = angleToTarget;
      }
      e.facingX = Math.cos(e.telegraphAngle) >= 0 ? 1 : -1;
      if (e.stateTimer <= 0) {
        e.aiState = 'COOLDOWN';
        e.stateTimer = 0.5;
        e.attackCooldown = 1.85;
        e.telegraphType = 'NONE';
        soundEngine.playArrow();
        const arrowDmg = this.applyWeakenedEnemyMultiplier(e, 14 + (this.world.floorNumber - 1) * 3);
        this.spawnEnemyProjectile(e.x, e.y, e.telegraphAngle, 340, arrowDmg, 'BONE_ARROW', '#F87171');
      }
      return;
    }

    if (e.aiState === 'COOLDOWN') {
      e.vx *= 0.85;
      e.vy *= 0.85;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.aiState = 'CHASE';
      return;
    }

    e.facingX = Math.cos(angleToTarget) >= 0 ? 1 : -1;
    if (dist < 140) {
      e.vx = -Math.cos(angleToTarget) * moveSpeed * 0.85;
      e.vy = -Math.sin(angleToTarget) * moveSpeed * 0.85;
      e.walkPhase += dt * 10;
    } else if (dist > 270) {
      e.vx = Math.cos(angleToTarget) * moveSpeed;
      e.vy = Math.sin(angleToTarget) * moveSpeed;
      e.walkPhase += dt * 10;
    } else {
      e.vx = Math.cos(angleToTarget + Math.PI / 2) * moveSpeed * 0.55;
      e.vy = Math.sin(angleToTarget + Math.PI / 2) * moveSpeed * 0.55;
      e.walkPhase += dt * 8;
    }

    if (dist <= 320 && e.attackCooldown <= 0) {
      e.aiState = 'WINDUP';
      e.stateTimer = 0.58;
      e.telegraphAngle = angleToTarget;
      e.telegraphType = 'AIM_ARROW';
    }
  }

  private updateBossAi(
    e: EnemyEntity,
    dt: number,
    dist: number,
    angleToTarget: number,
    moveSpeed: number
  ): void {
    const enraged = e.hp < e.maxHp * 0.5;
    e.bossPhase = enraged ? 2 : 1;
    if (e.attackCooldown > 0) e.attackCooldown -= dt;

    if (e.aiState === 'WHIRLWIND') {
      e.stateTimer -= dt;
      const chargeSpeed = 360 * e.slowFactor;
      e.vx = Math.cos(e.telegraphAngle) * chargeSpeed;
      e.vy = Math.sin(e.telegraphAngle) * chargeSpeed;
      e.walkPhase += dt * 22;
      if (Math.random() < 0.35) {
        this.spawnBurst(e.x, e.y, '#38BDF8', 2, 70);
      }
      this.damagePlayerOrMinionInArc(e, e.telegraphAngle, 65, Math.PI, 20);
      if (e.stateTimer <= 0) {
        e.aiState = 'COOLDOWN';
        e.stateTimer = 0.65;
        e.telegraphType = 'NONE';
      }
      return;
    }

    if (e.aiState === 'WINDUP') {
      e.vx *= 0.8;
      e.vy *= 0.8;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        const tType = e.telegraphType;
        e.telegraphType = 'NONE';

        if (tType === 'BOSS_CLEAVE') {
          soundEngine.playBossSlam();
          this.shakeMag = Math.max(this.shakeMag, 9);
          this.slashes.push({
            x: e.x + Math.cos(e.telegraphAngle) * 20,
            y: e.y + Math.sin(e.telegraphAngle) * 20,
            angle: e.telegraphAngle,
            radius: 130,
            arcSpread: 2.0,
            color: '#FB7185',
            life: 0.22,
            maxLife: 0.22,
            flip: false,
          });
          this.damagePlayerOrMinionInArc(e, e.telegraphAngle, 135, 1.08, 26);
          e.aiState = 'COOLDOWN';
          e.stateTimer = enraged ? 0.55 : 0.8;
        } else if (tType === 'BOSS_VOLLEY') {
          soundEngine.playArrow();
          const fanCount = enraged ? 9 : 7;
          const boltDmg = this.applyWeakenedEnemyMultiplier(e, 18);
          for (let k = 0; k < fanCount; k++) {
            const a = e.telegraphAngle - 0.95 + (k / (fanCount - 1)) * 1.9;
            this.spawnEnemyProjectile(e.x, e.y, a, 300, boltDmg, 'BOSS_BOLT', '#38BDF8');
          }
          e.aiState = 'COOLDOWN';
          e.stateTimer = 0.75;
        } else if (tType === 'BOSS_SUMMON') {
          soundEngine.playSummon();
          const guardCount = this.world.enemies.filter((x) => x.kind !== EnemyKind.SkeletonBoss).length;
          if (guardCount < 5) {
            const s1 = createProceduralSkeleton(
              EnemyKind.SkeletonWarrior,
              e.x - 75,
              e.y + 45,
              e.roomId,
              1.15
            );
            const s2 = createProceduralSkeleton(
              EnemyKind.SkeletonArcher,
              e.x + 75,
              e.y + 45,
              e.roomId,
              1.15
            );
            this.world.enemies.push(s1, s2);
            this.spawnBurst(s1.x, s1.y, '#38BDF8', 12, 85);
            this.spawnBurst(s2.x, s2.y, '#38BDF8', 12, 85);
          }
          e.aiState = 'COOLDOWN';
          e.stateTimer = 0.8;
        } else if (tType === 'BOSS_DASH') {
          soundEngine.playDash();
          e.aiState = 'WHIRLWIND';
          e.stateTimer = 0.65;
          return;
        }
      }
      return;
    }

    if (e.aiState === 'COOLDOWN') {
      e.vx *= 0.85;
      e.vy *= 0.85;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'CHASE';
        e.attackCooldown = enraged ? 0.9 : 1.25;
      }
      return;
    }

    e.facingX = Math.cos(angleToTarget) >= 0 ? 1 : -1;
    e.vx = Math.cos(angleToTarget) * moveSpeed;
    e.vy = Math.sin(angleToTarget) * moveSpeed;
    e.walkPhase += dt * 9;

    if (e.attackCooldown <= 0) {
      e.bossPatternIndex = (e.bossPatternIndex + 1) % (enraged ? 4 : 3);
      e.aiState = 'WINDUP';
      e.telegraphAngle = angleToTarget;

      if (e.bossPatternIndex === 0 || dist < 125) {
        e.telegraphType = 'BOSS_CLEAVE';
        e.stateTimer = 0.62;
      } else if (e.bossPatternIndex === 1) {
        e.telegraphType = 'BOSS_VOLLEY';
        e.stateTimer = 0.68;
      } else if (e.bossPatternIndex === 2) {
        e.telegraphType = 'BOSS_SUMMON';
        e.stateTimer = 0.75;
      } else {
        e.telegraphType = 'BOSS_DASH';
        e.stateTimer = 0.58;
      }
    }
  }

  private pickEnemyTarget(enemy: EnemyEntity): { x: number; y: number } {
    let best: { x: number; y: number } = this.player;
    let bestDist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);

    for (const m of this.minions) {
      const d = Math.hypot(m.x - enemy.x, m.y - enemy.y);
      if (d < bestDist * 0.82) {
        bestDist = d;
        best = m;
      }
    }
    return best;
  }

  private applyWeakenedEnemyMultiplier(enemy: EnemyEntity, rawDmg: number): number {
    const mult = enemy.infectionStacks > 0 ? 0.82 : 1.0;
    return Math.max(1, Math.round(rawDmg * mult));
  }

  private damagePlayerOrMinionInArc(
    attacker: EnemyEntity,
    angle: number,
    reach: number,
    halfSpread: number,
    rawDamage: number
  ): void {
    const finalDmg = this.applyWeakenedEnemyMultiplier(attacker, rawDamage);

    const pdx = this.player.x - attacker.x;
    const pdy = this.player.y - attacker.y;
    const pDist = Math.hypot(pdx, pdy);
    if (pDist <= reach + this.player.radius) {
      const diff = Math.abs(
        Math.atan2(Math.sin(Math.atan2(pdy, pdx) - angle), Math.cos(Math.atan2(pdy, pdx) - angle))
      );
      if (diff <= halfSpread) {
        this.damagePlayer(finalDmg, false);
      }
    }

    for (const m of this.minions) {
      const mdx = m.x - attacker.x;
      const mdy = m.y - attacker.y;
      if (Math.hypot(mdx, mdy) <= reach + m.radius) {
        m.hp -= finalDmg;
        m.hitFlashTimer = 0.08;
      }
    }
  }

  private damagePlayer(incomingDmg: number, isProjectile: boolean): void {
    const p = this.player;
    if (p.invulnTimer > 0 || this.phase !== GamePhase.Dungeon) return;

    const ranks = this.getActiveUpgrades();

    // Goblin Passive 1: Nimble Reflexes (instinctive evasion + Shadow-Silk Cloak + Mirage Decoy + Windrunner!)
    if (p.characterId === CharacterId.Goblin) {
      const moving = Math.hypot(p.vx, p.vy) > 22;
      const baseEvade =
        0.25 +
        ranks.pathA * 0.03 +
        (this.activeBlessingIds.has('gob_shadow_clone') ? 0.12 : 0);
      const evadeChance = Math.min(
        0.88,
        baseEvade + (p.windrunnerTimer > 0 && moving ? 0.45 : 0)
      );
      if (Math.random() < evadeChance) {
        soundEngine.playDash();
        p.invulnTimer = 0.28;
        p.reflexBurstTimer = 1.2;
        const ultGain = 6 * (1 + ranks.pathE * 0.15);
        p.ultCharge = Math.min(100, p.ultCharge + ultGain);
        this.afterimages.push({
          x: p.x,
          y: p.y,
          facingX: p.facingX,
          color: '#FDE047',
          life: 0.38,
          maxLife: 0.38,
        });

        // Goblin Statue Blessing: Mirage Decoy — dodging unleashes a spinning shadow slash!
        if (this.activeBlessingIds.has('gob_shadow_clone')) {
          soundEngine.playSlash(2);
          this.slashes.push({
            x: p.x,
            y: p.y,
            angle: p.aimAngle,
            radius: 84,
            arcSpread: Math.PI * 1.85,
            color: '#F59E0B',
            life: 0.2,
            maxLife: 0.2,
            flip: false,
          });
          const counterRaw = 24 * this.getPhysicalDamageMultiplier();
          for (const enemy of [...this.world.enemies]) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 84 + enemy.radius) {
              const opp = this.getOpportunisticBonus(enemy, p.x);
              const roll = this.rollPhysicalAttack(
                counterRaw * opp.dmgMult,
                0.25 + opp.bonusCrit,
                false,
                opp.active
              );
              this.damageEnemy(enemy, roll.damage, true, p.x, p.y, false, roll.isCrit);
              this.applyGoblinPoisonIfActive(enemy);
            }
          }
        }

        this.spawnPopup(p.x, p.y - 28, 'EVADE!', '#FDE047', 1.0);
        this.emitHudSnapshot();
        return;
      }
    }

    const isSkeleton = p.characterId === CharacterId.Skeleton;
    const isZombie = p.characterId === CharacterId.Zombie;
    const isGnome = p.characterId === CharacterId.Gnome;
    let dmg = incomingDmg;

    // Skeleton Passive 1: Eternal Framework + Calcified Marrow pathA (+3% guard per rank)
    if (isSkeleton) {
      const frameworkGuard = Math.min(0.45, 0.18 + ranks.pathA * 0.03);
      dmg *= 1 - frameworkGuard;
    }

    // Skeleton Passive 2: Unyielding Bones (existing stacks grant 12% resistance per stack)
    if (isSkeleton && p.unyieldingStacks > 0) {
      dmg *= Math.max(0.42, 1 - p.unyieldingStacks * 0.12);
    }

    // Skeleton Normal Skill: Ribcage Shield (blocks 80% of hit & consumes 1 rib charge)
    let ribBlocked = false;
    if (p.ribcageTimer > 0 && p.ribcageCharges > 0) {
      p.ribcageCharges--;
      if (p.ribcageCharges <= 0) {
        p.ribcageTimer = 0;
      }
      dmg *= 0.2;
      ribBlocked = true;
      if (this.activeBlessingIds.has('skel_skill_ribcage_shield')) {
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 92,
          color: '#E2E8F0',
          life: 0.24,
          maxLife: 0.24,
        });
        const spikeDmg = Math.round(22 * this.getPhysicalDamageMultiplier());
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 92 + enemy.radius) {
            this.damageEnemy(enemy, spikeDmg, true, p.x, p.y, true);
          }
        }
      }
    }

    // Skeleton Normal Skill: Bone Storm (30% vortex guard)
    if (p.boneStormTimer > 0) {
      dmg *= 0.7;
    }

    // Skeleton Ultimate: Bone Colossus (40% titan guard)
    if (p.colossusTimer > 0) {
      dmg *= 0.6;
    }

    if (isProjectile && this.activeBlessingIds.has('skel_fortified_ribs')) {
      dmg *= 0.75;
    }

    // Gnome Passive 1: Unbreakable Foundation + Granite Core pathA + Bedrock Plating
    if (isGnome) {
      const foundationArmor = Math.min(
        0.48,
        0.22 +
          ranks.pathA * 0.025 +
          (this.activeBlessingIds.has('gnome_bedrock_plating') ? 0.1 : 0)
      );
      dmg *= 1 - foundationArmor;
      // Gnome Passive 2: Lasting Resolve (scales up to 42% extra DR as HP drops)
      dmg *= 1 - this.getGnomeResolveDefenseBonus();
    }

    // Gnome Normal Skill: Fortress Stance (55% damage reduction + Lodestone Plating)
    const fortressGuarded = p.fortressTimer > 0;
    if (fortressGuarded) {
      const stanceMult = Math.max(0.28, 0.45 - ranks.pathD * 0.02);
      dmg *= stanceMult;
    }

    // Gnome Ultimate: Mountain's Heart (65% damage reduction)
    if (p.mountainHeartTimer > 0) {
      dmg *= 0.35;
    }

    // Zombie Relentless Rot pathE thickens Undying Flesh & Abomination armor
    const zombieRotGuard = isZombie ? ranks.pathE * 0.05 : 0;
    if (p.undyingTimer > 0) {
      dmg *= Math.max(0.3, 0.55 - zombieRotGuard);
    }
    if (p.abominationTimer > 0) {
      dmg *= Math.max(0.25, 0.5 - zombieRotGuard);
    }

    const finalDmg = Math.max(1, Math.round(dmg));
    p.hp = Math.max(0, p.hp - finalDmg);
    p.hitFlashTimer = 0.12;
    p.invulnTimer = 0.42;
    if (!fortressGuarded && p.mountainHeartTimer <= 0 && !isGnome) {
      p.squashX = 1.22;
      p.squashY = 0.8;
    } else {
      // Unbreakable Foundation / Fortress Stance resists flinch & knockback
      p.squashX = 1.06;
      p.squashY = 0.94;
    }
    const hitUltGain =
      p.characterId === CharacterId.Goblin || isGnome
        ? 8 * (1 + ranks.pathE * 0.15)
        : 8;
    p.ultCharge = Math.min(100, p.ultCharge + hitUltGain);
    this.shakeMag = Math.max(this.shakeMag, ribBlocked || fortressGuarded ? 3.5 : 7);

    // Update Gnome resolve ratio immediately after taking damage
    if (isGnome) {
      p.resolveRatio = Math.max(0, Math.min(1, 1 - p.hp / Math.max(1, p.maxHp)));
    }

    // Skeleton Passive 2: Unyielding Bones reinforces bones after withstanding an attack!
    if (isSkeleton && p.hp > 0) {
      const maxUnyielding = this.activeBlessingIds.has('skel_fortified_ribs') ? 4 : 3;
      p.unyieldingStacks = Math.min(maxUnyielding, p.unyieldingStacks + 1);
      p.unyieldingTimer = 5.0;
    }

    // Gnome Statue Blessing: Runestone Retaliation — unleashes seismic tremor when hit!
    if (isGnome && p.hp > 0 && this.activeBlessingIds.has('gnome_iron_counter')) {
      this.shockwaves.push({
        x: p.x,
        y: p.y,
        maxRadius: 105,
        color: '#FB923C',
        life: 0.26,
        maxLife: 0.26,
      });
      const retalDmg = Math.round(20 * this.getPhysicalDamageMultiplier());
      for (const enemy of [...this.world.enemies]) {
        if (!enemy || enemy.hp <= 0) continue;
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 105 + enemy.radius) {
          this.damageEnemy(enemy, retalDmg, true, p.x, p.y, true);
          this.applyEnemyStun(enemy, 0.55);
        }
      }
      this.spawnBurst(p.x, p.y, '#FDBA74', 10, 95);
    }

    // Zombie Statue Blessing: Bloated Carcass — bursts a toxic cloud when hit!
    if (isZombie && p.hp > 0 && this.activeBlessingIds.has('zombie_bloated_carcass')) {
      this.poisonClouds.push({
        id: allocEntityId(),
        x: p.x,
        y: p.y,
        radius: Math.round(88 * (1 + ranks.pathC * 0.08)),
        life: 2.8,
        maxLife: 2.8,
        tickTimer: 0.1,
        damagePerTick: Math.round(9 * this.getPlagueOrSkillMultiplier()),
      });
      this.spawnBurst(p.x, p.y, '#A3E635', 10, 85);
    }

    soundEngine.playHit(true);
    if (ribBlocked) {
      this.spawnPopup(p.x, p.y - 34, `RIB BLOCK -${finalDmg}`, '#E2E8F0', 0.96);
      this.spawnBurst(p.x, p.y, '#E2E8F0', 8, 85);
    } else if (fortressGuarded || p.mountainHeartTimer > 0) {
      this.spawnPopup(p.x, p.y - 30, `ARMOR -${finalDmg}`, '#FDBA74', 0.96);
      this.spawnBurst(p.x, p.y, '#FDBA74', 6, 75);
    } else {
      this.spawnPopup(p.x, p.y - 24, `-${finalDmg}`, '#F87171', 1.05);
      this.spawnBurst(p.x, p.y, '#EF4444', 8, 95);
    }
    this.emitHudSnapshot();

    if (p.hp <= 0) {
      this.finishRun(false);
    }
  }

  private healPlayer(amount: number): void {
    if (amount <= 0) return;
    const prev = this.player.hp;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    const gained = this.player.hp - prev;
    if (gained > 0) {
      this.spawnPopup(this.player.x, this.player.y - 22, `+${gained}`, '#4ADE80', 0.95);
    }
  }

  private spawnEnemyProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    kind: 'BONE_ARROW' | 'BOSS_BOLT',
    color: string
  ): void {
    this.projectiles.push({
      id: allocEntityId(),
      fromPlayer: false,
      x: x + Math.cos(angle) * 16,
      y: y + Math.sin(angle) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: kind === 'BOSS_BOLT' ? 7 : 5,
      damage,
      life: 2.4,
      color,
      kind,
      angle,
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      if (pr.fromPlayer) {
        // Player Bone Spear & Dark Wave break destructible urns/crates along their path
        this.hitDestructibleProps(pr.x, pr.y, pr.radius + 8);
      }

      // Dark Wave passes over low props and only expires on outer room walls or lifetime; Bone Spear stops on walls/solid pillars
      const blocked =
        pr.kind === 'PLAYER_DARK_WAVE'
          ? !this.isPointInsideWalkableArea(pr.x, pr.y)
          : this.isPointBlockedByWallOrProp(pr.x, pr.y);

      if (pr.life <= 0 || blocked) {
        this.spawnBurst(pr.x, pr.y, pr.color, 5, 65);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.fromPlayer) {
        let consumed = false;
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (pr.hitEnemyIds?.has(enemy.id)) continue;

          if (Math.hypot(pr.x - enemy.x, pr.y - enemy.y) <= pr.radius + enemy.radius) {
            pr.hitEnemyIds?.add(enemy.id);
            const opp = this.getOpportunisticBonus(enemy, pr.x);
            const spearTwinBonus =
              pr.kind === 'PLAYER_BONE_SPEAR' &&
              this.activeBlessingIds.has('skel_skill_bone_spear')
                ? 0.25
                : 0;
            const bonusCrit =
              (pr.kind === 'PLAYER_BONE_SPEAR' ? 0.15 + spearTwinBonus : 0.25) + opp.bonusCrit;
            const roll = this.rollPhysicalAttack(
              pr.damage * opp.dmgMult,
              bonusCrit,
              false,
              opp.active
            );
            this.damageEnemy(enemy, roll.damage, true, pr.x, pr.y, true, roll.isCrit);
            if (pr.kind === 'PLAYER_ENCHANTED_DAGGER') {
              this.applyGoblinPoisonIfActive(enemy);
            }
            this.spawnBurst(enemy.x, enemy.y, pr.color, 6, 80);

            if (!pr.pierce) {
              consumed = true;
              break;
            }
          }
        }
        if (consumed) {
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      // Enemy projectile vs Gnome Titan's Rampart stone walls
      let blockedByRampart = false;
      for (const wall of this.stoneRamparts) {
        if (Math.hypot(pr.x - wall.x, pr.y - wall.y) <= pr.radius + wall.radius + 2) {
          blockedByRampart = true;
          soundEngine.playBoneBreak();
          this.spawnBurst(pr.x, pr.y, '#FDBA74', 6, 75);
          break;
        }
      }
      if (blockedByRampart) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Enemy projectile vs Gnome Magnetic Guard (attracts & redirects away from Gnome & allies!)
      if (this.player.magneticTimer > 0) {
        const distToPlayer = Math.hypot(pr.x - this.player.x, pr.y - this.player.y);
        let nearAlly = distToPlayer <= 138;
        if (!nearAlly) {
          for (const m of this.minions) {
            if (Math.hypot(pr.x - m.x, pr.y - m.y) <= 96) {
              nearAlly = true;
              break;
            }
          }
        }
        if (nearAlly) {
          const ranks = this.getActiveUpgrades();
          const overcharged = this.activeBlessingIds.has('gnome_skill_magnetic_guard');
          const reflectTarget = this.findNearestEnemy(pr.x, pr.y, 480);
          const newAngle = reflectTarget
            ? Math.atan2(reflectTarget.y - pr.y, reflectTarget.x - pr.x)
            : Math.atan2(-pr.vy, -pr.vx);
          const speed = Math.max(480, Math.hypot(pr.vx, pr.vy) * 1.45);
          pr.fromPlayer = true;
          pr.vx = Math.cos(newAngle) * speed;
          pr.vy = Math.sin(newAngle) * speed;
          pr.angle = newAngle;
          pr.color = '#38BDF8';
          pr.life = 1.6;
          pr.pierce = overcharged;
          pr.hitEnemyIds = new Set<number>();
          pr.damage = Math.round(
            pr.damage * (1.8 + ranks.pathD * 0.2) * (overcharged ? 2.0 : 1.0)
          );
          soundEngine.playUiClick(780);
          this.spawnBurst(pr.x, pr.y, '#38BDF8', 8, 90);
          this.spawnPopup(pr.x, pr.y - 16, 'REDIRECT!', '#7DD3FC', 0.88);
          continue;
        }
      }

      // Enemy projectile vs Bone Storm arrow-interception ring
      if (
        this.player.boneStormTimer > 0 &&
        pr.kind === 'BONE_ARROW' &&
        Math.hypot(pr.x - this.player.x, pr.y - this.player.y) <=
          (this.activeBlessingIds.has('skel_skill_bone_storm') ? 76 : 58)
      ) {
        soundEngine.playBoneBreak();
        this.spawnBurst(pr.x, pr.y, '#A5B4FC', 6, 75);
        this.spawnPopup(pr.x, pr.y - 12, 'PARRY', '#A5B4FC', 0.82);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Enemy projectile vs Ribcage Shield complete deflection!
      if (
        this.player.ribcageTimer > 0 &&
        this.player.ribcageCharges > 0 &&
        Math.hypot(pr.x - this.player.x, pr.y - this.player.y) <= 34 + pr.radius
      ) {
        this.player.ribcageCharges--;
        if (this.player.ribcageCharges <= 0) {
          this.player.ribcageTimer = 0;
        }
        if (this.player.characterId === CharacterId.Skeleton) {
          const maxUnyielding = this.activeBlessingIds.has('skel_fortified_ribs') ? 4 : 3;
          this.player.unyieldingStacks = Math.min(maxUnyielding, this.player.unyieldingStacks + 1);
          this.player.unyieldingTimer = 5.0;
        }
        if (this.activeBlessingIds.has('skel_skill_ribcage_shield')) {
          this.shockwaves.push({
            x: this.player.x,
            y: this.player.y,
            maxRadius: 90,
            color: '#E2E8F0',
            life: 0.22,
            maxLife: 0.22,
          });
          const spikeDmg = Math.round(20 * this.getPhysicalDamageMultiplier());
          for (const enemy of [...this.world.enemies]) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) <= 90 + enemy.radius) {
              this.damageEnemy(enemy, spikeDmg, true, this.player.x, this.player.y, true);
            }
          }
        }
        soundEngine.playBoneBreak();
        this.spawnBurst(pr.x, pr.y, '#F8FAFC', 8, 90);
        this.spawnPopup(this.player.x, this.player.y - 26, 'BLOCKED!', '#E2E8F0', 0.95);
        this.projectiles.splice(i, 1);
        this.emitHudSnapshot();
        continue;
      }

      if (Math.hypot(pr.x - this.player.x, pr.y - this.player.y) <= pr.radius + this.player.radius - 2) {
        this.damagePlayer(pr.damage, true);
        this.projectiles.splice(i, 1);
        continue;
      }

      let hitMinion = false;
      for (const m of this.minions) {
        if (Math.hypot(pr.x - m.x, pr.y - m.y) <= pr.radius + m.radius) {
          m.hp -= pr.damage;
          m.hitFlashTimer = 0.08;
          hitMinion = true;
          break;
        }
      }
      if (hitMinion) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updatePoisonClouds(dt: number): void {
    for (let i = this.poisonClouds.length - 1; i >= 0; i--) {
      const c = this.poisonClouds[i];
      c.life -= dt;
      c.tickTimer -= dt;
      if (c.life <= 0) {
        this.poisonClouds.splice(i, 1);
        continue;
      }
      if (c.tickTimer <= 0) {
        c.tickTimer = 0.55;
        for (const enemy of [...this.world.enemies]) {
          if (Math.hypot(enemy.x - c.x, enemy.y - c.y) <= c.radius + enemy.radius) {
            this.damageEnemy(enemy, c.damagePerTick, false, c.x, c.y);
            this.applyInfectiousTouch(enemy, 1);
          }
        }
      }
    }
  }

  private updateTraps(dt: number): void {
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const trap = this.traps[i];
      trap.life -= dt;
      if (trap.armTimer > 0) {
        trap.armTimer -= dt;
      }
      if (trap.life <= 0) {
        this.traps.splice(i, 1);
        continue;
      }
      if (trap.armTimer <= 0) {
        let triggered = false;
        for (const enemy of this.world.enemies) {
          if (
            enemy.hp > 0 &&
            Math.hypot(enemy.x - trap.x, enemy.y - trap.y) <= trap.triggerRadius + enemy.radius
          ) {
            triggered = true;
            break;
          }
        }
        if (triggered) {
          this.traps.splice(i, 1);
          this.detonateTrap(trap);
        }
      }
    }
  }

  private detonateTrap(trap: ExplosiveTrapEntity): void {
    soundEngine.playBossSlam();
    this.shakeMag = Math.max(this.shakeMag, 9.5);
    this.shockwaves.push({
      x: trap.x,
      y: trap.y,
      maxRadius: trap.blastRadius,
      color: '#FB923C',
      life: 0.34,
      maxLife: 0.34,
    });
    this.spawnBurst(trap.x, trap.y, '#FDE047', 18, 165);
    this.spawnBurst(trap.x, trap.y, '#FB923C', 12, 130);

    for (const enemy of [...this.world.enemies]) {
      if (!enemy || enemy.hp <= 0) continue;
      const dist = Math.hypot(enemy.x - trap.x, enemy.y - trap.y);
      if (dist <= trap.blastRadius + enemy.radius) {
        const opp = this.getOpportunisticBonus(enemy, trap.x);
        const roll = this.rollPhysicalAttack(
          trap.damage * opp.dmgMult,
          0.2 + opp.bonusCrit,
          false,
          opp.active
        );
        this.damageEnemy(enemy, roll.damage, true, trap.x, trap.y, true, roll.isCrit);
        enemy.slowTimer = Math.max(enemy.slowTimer, 2.2);
        enemy.slowFactor = Math.min(enemy.slowFactor, 0.72);
        this.applyGoblinPoisonIfActive(enemy);
      }
    }

    // Goblin Statue Blessing: Goblin Kegpowder — detonated traps leave a lingering venom cloud!
    if (this.activeBlessingIds.has('gob_skill_explosive_trap')) {
      this.poisonClouds.push({
        id: allocEntityId(),
        x: trap.x,
        y: trap.y,
        radius: 95,
        life: 3.4,
        maxLife: 3.4,
        tickTimer: 0.12,
        damagePerTick: Math.round(10 * this.getPlagueOrSkillMultiplier()),
      });
    }

    this.hitDestructibleProps(trap.x, trap.y, trap.blastRadius);
  }

  private updateDaggerRains(dt: number): void {
    for (let i = this.daggerRains.length - 1; i >= 0; i--) {
      const zone = this.daggerRains[i];
      zone.life -= dt;
      zone.tickTimer -= dt;
      if (zone.life <= 0) {
        this.daggerRains.splice(i, 1);
        continue;
      }
      if (zone.tickTimer <= 0) {
        zone.tickTimer = 0.28;
        soundEngine.playSlash(1);
        for (let s = 0; s < 3; s++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * (zone.radius * 0.85);
          this.spawnBurst(
            zone.x + Math.cos(a) * r,
            zone.y + Math.sin(a) * r,
            s % 2 === 0 ? '#FDE047' : '#34D399',
            4,
            75
          );
        }
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - zone.x, enemy.y - zone.y) <= zone.radius + enemy.radius) {
            const opp = this.getOpportunisticBonus(enemy, zone.x);
            const roll = this.rollPhysicalAttack(
              zone.damagePerVolley * opp.dmgMult,
              0.22 + opp.bonusCrit,
              false,
              opp.active
            );
            this.damageEnemy(enemy, roll.damage, true, zone.x, zone.y, false, roll.isCrit);
            this.applyGoblinPoisonIfActive(enemy);
          }
        }
        this.hitDestructibleProps(zone.x, zone.y, zone.radius);
      }
    }
  }

  private updateEarthenGrasps(dt: number): void {
    for (let i = this.earthenGrasps.length - 1; i >= 0; i--) {
      const g = this.earthenGrasps[i];
      g.life -= dt;
      g.tickTimer -= dt;
      if (g.life <= 0) {
        this.earthenGrasps.splice(i, 1);
        continue;
      }

      if (g.targetEnemyId !== null) {
        const host = this.world.enemies.find((e) => e.id === g.targetEnemyId && e.hp > 0);
        if (!host) {
          this.earthenGrasps.splice(i, 1);
          continue;
        }
        g.x = host.x;
        g.y = host.y;
      }

      if (g.tickTimer <= 0) {
        g.tickTimer = 0.65;
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - g.x, enemy.y - g.y) <= g.radius + enemy.radius) {
            enemy.rootTimer = Math.max(enemy.rootTimer, Math.min(0.75, g.life));
            this.damageEnemy(enemy, g.damagePerTick, false, g.x, g.y);
          }
        }
      }
    }
  }

  private updateStoneRamparts(dt: number): void {
    for (let i = this.stoneRamparts.length - 1; i >= 0; i--) {
      const w = this.stoneRamparts[i];
      w.life -= dt;
      if (w.life <= 0) {
        this.spawnBurst(w.x, w.y, '#A8A29E', 6, 70);
        this.stoneRamparts.splice(i, 1);
      }
    }

    // Citadel Bastion blessing: active rampart ring pulses interior tremors
    if (
      this.stoneRamparts.length > 0 &&
      this.activeBlessingIds.has('gnome_ult_rampart')
    ) {
      this.player.rampartTremorTick -= dt;
      if (this.player.rampartTremorTick <= 0) {
        this.player.rampartTremorTick = 1.2;
        let cx = 0;
        let cy = 0;
        for (const w of this.stoneRamparts) {
          cx += w.x;
          cy += w.y;
        }
        cx /= this.stoneRamparts.length;
        cy /= this.stoneRamparts.length;
        this.shockwaves.push({
          x: cx,
          y: cy,
          maxRadius: 165,
          color: '#FDBA74',
          life: 0.26,
          maxLife: 0.26,
        });
        const quakeDmg = Math.round(18 * this.getPhysicalDamageMultiplier());
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - cx, enemy.y - cy) <= 170 + enemy.radius) {
            this.damageEnemy(enemy, quakeDmg, true, cx, cy);
            this.applyEnemyStun(enemy, 0.35);
          }
        }
      }
    }
  }

  private applyGoblinPoisonIfActive(enemy: EnemyEntity): void {
    if (this.player.characterId !== CharacterId.Goblin) return;
    const hasNightshade = this.activeBlessingIds.has('gob_viper_toxin');
    const hasCorrosive = this.activeBlessingIds.has('gob_skill_poisoned_blades');
    if (this.player.poisonBladesTimer <= 0 && !hasNightshade) return;

    const stacksToAdd =
      (this.player.poisonBladesTimer > 0 && hasNightshade ? 2 : 1) + (hasCorrosive ? 1 : 0);
    enemy.infectionStacks = Math.min(hasCorrosive ? 5 : 4, enemy.infectionStacks + stacksToAdd);
    enemy.plagueTimer = Math.max(enemy.plagueTimer, 3.6);
    if (enemy.infectionTimer <= 0) {
      enemy.infectionTimer = 0.6;
    }
    enemy.slowTimer = Math.max(enemy.slowTimer, 1.8);
    enemy.slowFactor = Math.min(enemy.slowFactor, 0.82);
  }

  private applyInfectiousTouch(enemy: EnemyEntity, stacksToAdd: number): void {
    // Infectious Touch is the Zombie's innate passive
    if (this.player.characterId !== CharacterId.Zombie) return;
    const maxStacks = this.activeBlessingIds.has('zombie_virulent_strain') ? 6 : 3;
    enemy.infectionStacks = Math.min(maxStacks, enemy.infectionStacks + stacksToAdd);
    if (enemy.infectionTimer <= 0) {
      enemy.infectionTimer = 0.65;
    }
  }

  private hitEnemiesInArc(
    ox: number,
    oy: number,
    angle: number,
    reach: number,
    halfSpread: number,
    rawDamage: number,
    heavy: boolean,
    bonusCritChance = 0,
    isZombieAttack = false
  ): void {
    let hitAny = false;
    for (const enemy of [...this.world.enemies]) {
      if (enemy.hp <= 0) continue;
      if (this.isEnemyInArc(enemy, ox, oy, angle, reach, halfSpread)) {
        const opp = this.getOpportunisticBonus(enemy, ox);
        const roll = this.rollPhysicalAttack(
          rawDamage * opp.dmgMult,
          bonusCritChance + opp.bonusCrit,
          false,
          opp.active
        );
        this.damageEnemy(enemy, roll.damage, true, ox, oy, heavy, roll.isCrit);
        this.applyInfectiousTouch(enemy, 1);
        this.applyGoblinPoisonIfActive(enemy);
        hitAny = true;

        if (isZombieAttack) {
          this.slashes.push({
            x: enemy.x,
            y: enemy.y,
            angle: angle + (Math.random() - 0.5) * 0.35,
            radius: 46 * (this.player.abominationTimer > 0 ? 1.4 : 1.0),
            arcSpread: 0,
            color: '#A3E635',
            life: 0.32,
            maxLife: 0.32,
            flip: Math.random() < 0.5,
            kind: 'ZOMBIE_POISON_BURST',
            scale: this.player.abominationTimer > 0 ? 1.35 : 1.0,
          });
          this.spawnBurst(enemy.x, enemy.y, '#A3E635', 6, 60);
        }
      }
    }
    if (hitAny && (this.player.abominationTimer > 0 || this.player.colossusTimer > 0)) {
      this.shakeMag = Math.max(this.shakeMag, 4.5);
    }
  }

  private isEnemyInArc(
    enemy: EnemyEntity,
    ox: number,
    oy: number,
    angle: number,
    reach: number,
    halfSpread: number
  ): boolean {
    const dx = enemy.x - ox;
    const dy = enemy.y - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > reach + enemy.radius) return false;
    if (dist < 14) return true;
    const targetAng = Math.atan2(dy, dx);
    const diff = Math.abs(Math.atan2(Math.sin(targetAng - angle), Math.cos(targetAng - angle)));
    return diff <= halfSpread;
  }

  private damageEnemy(
    enemy: EnemyEntity,
    damage: number,
    isDirectHit: boolean,
    sourceX: number,
    sourceY: number,
    heavyKnockback = false,
    isCrit = false,
    isSplinterSplash = false
  ): void {
    if (enemy.hp <= 0) return;

    const actual = Math.max(1, damage);
    enemy.hp -= actual;
    enemy.hitFlashTimer = 0.08;
    enemy.squashX = isCrit ? 1.28 : 1.2;
    enemy.squashY = isCrit ? 0.76 : 0.82;
    this.runDamageDealt += actual;

    if (isDirectHit) {
      soundEngine.playHit(heavyKnockback || isCrit);
      const ranks = this.getActiveUpgrades();
      const ultGainMult =
        this.player.characterId === CharacterId.Goblin ? 1 + ranks.pathE * 0.15 : 1.0;
      this.player.ultCharge = Math.min(
        100,
        this.player.ultCharge + (isCrit ? 6.5 : 4.5) * ultGainMult
      );
      const kDist = Math.max(1, Math.hypot(enemy.x - sourceX, enemy.y - sourceY));
      const force = enemy.kind === EnemyKind.SkeletonBoss ? 40 : heavyKnockback || isCrit ? 185 : 85;
      if (enemy.kind !== EnemyKind.TrainingDummy) {
        enemy.vx += ((enemy.x - sourceX) / kDist) * force;
        enemy.vy += ((enemy.y - sourceY) / kDist) * force;
      }
    }

    this.spawnPopup(
      enemy.x + (Math.random() - 0.5) * 14,
      enemy.y - 24,
      isCrit ? `CRIT! ${actual}` : `${actual}`,
      isCrit ? '#FBBF24' : isDirectHit ? '#F8FAFC' : '#A3E635',
      isCrit ? 1.16 : heavyKnockback ? 1.1 : 0.92
    );

    // Skeleton Statue Blessing: Shattering Marrow — Critical Strikes burst razor bone splinters!
    if (
      isCrit &&
      !isSplinterSplash &&
      this.player.characterId === CharacterId.Skeleton &&
      this.activeBlessingIds.has('skel_splinter_burst')
    ) {
      const splinterR = 92;
      this.shockwaves.push({
        x: enemy.x,
        y: enemy.y,
        maxRadius: splinterR,
        color: '#38BDF8',
        life: 0.22,
        maxLife: 0.22,
      });
      const splashDmg = Math.max(5, Math.round(actual * 0.38));
      for (const other of [...this.world.enemies]) {
        if (!other || other.id === enemy.id || other.hp <= 0) continue;
        if (Math.hypot(other.x - enemy.x, other.y - enemy.y) <= splinterR + other.radius) {
          this.damageEnemy(other, splashDmg, false, enemy.x, enemy.y, false, false, true);
        }
      }
    }

    if (enemy.kind === EnemyKind.TrainingDummy && enemy.hp <= 10) {
      enemy.hp = enemy.maxHp;
      this.spawnPopup(enemy.x, enemy.y - 42, 'RESET!', '#FBBF24', 1.0);
      return;
    }

    if (enemy.hp <= 0) {
      this.handleEnemyDefeated(enemy);
    }
  }

  private handleEnemyDefeated(enemy: EnemyEntity): void {
    const idx = this.world.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.world.enemies.splice(idx, 1);
    }

    const ranks = this.getActiveUpgrades();
    soundEngine.playBoneBreak();
    this.runKills++;
    this.corpseBloomCounter++;
    this.spawnBurst(enemy.x, enemy.y, '#EAE4D7', 12, 130);

    // Goblin Statue Blessing: Quicksilver Step — slaying an enemy cuts Normal Skill cooldowns by 1.2s!
    if (
      this.player.characterId === CharacterId.Goblin &&
      this.activeBlessingIds.has('gob_quicksilver_boots')
    ) {
      this.player.normalCooldowns[0] = Math.max(0, this.player.normalCooldowns[0] - 1.2);
      this.player.normalCooldowns[1] = Math.max(0, this.player.normalCooldowns[1] - 1.2);
    }

    if (enemy.infectionStacks > 0) {
      const splashRadius = this.activeBlessingIds.has('zombie_virulent_strain') ? 168 : 112;
      this.shockwaves.push({
        x: enemy.x,
        y: enemy.y,
        maxRadius: splashRadius,
        color: '#A3E635',
        life: 0.25,
        maxLife: 0.25,
      });
      const splashDmg = Math.round(12 * enemy.infectionStacks * this.getPlagueOrSkillMultiplier());
      for (const other of [...this.world.enemies]) {
        if (!other || other.hp <= 0) continue;
        if (Math.hypot(other.x - enemy.x, other.y - enemy.y) <= splashRadius + other.radius) {
          this.applyInfectiousTouch(other, Math.min(2, enemy.infectionStacks));
          this.damageEnemy(other, splashDmg, false, enemy.x, enemy.y);
        }
      }
    }

    // Carrion Hunger is Zombie's innate sustain passive (+3 HP/rank from Stitched Carcass + Gorged Carrion statue)
    if (this.player.characterId === CharacterId.Zombie) {
      const healVal =
        8 +
        ranks.pathA * 3 +
        (this.activeBlessingIds.has('zombie_feast_of_rot') ? 10 : 0);
      this.spawnOrb('ESSENCE_HEAL', enemy.x, enemy.y, healVal);
    }

    this.spawnOrb('XP_ORB', enemy.x, enemy.y, enemy.kind === EnemyKind.SkeletonBoss ? 120 : 18);
    if (Math.random() < 0.7) {
      this.spawnOrb('GOLD_COIN', enemy.x, enemy.y, 4 + Math.floor(Math.random() * 4));
    }

    if (enemy.kind === EnemyKind.SkeletonBoss) {
      this.hitstopTimer = 0.08;
      this.shakeMag = 15;
      for (let s = 0; s < 12; s++) {
        this.spawnOrb('SOUL_SHARD', enemy.x, enemy.y, 4);
      }
      soundEngine.playVictory();
    } else if (Math.random() < 0.55) {
      this.spawnOrb('SOUL_SHARD', enemy.x, enemy.y, 2 + Math.floor(this.world.floorNumber * 0.7));
    }
  }

  private hitDestructibleProps(ox: number, oy: number, radius: number): void {
    for (let i = this.world.props.length - 1; i >= 0; i--) {
      const pr = this.world.props[i];
      if (!pr.destructible) continue;
      if (Math.hypot(pr.x - ox, pr.y - oy) <= radius + pr.w * 0.5) {
        pr.hp -= 30;
        if (pr.hp <= 0) {
          soundEngine.playBoneBreak();
          this.spawnBurst(pr.x, pr.y, pr.kind === 'BONE_URN' ? '#D6CFC2' : '#92400E', 8, 90);
          if (Math.random() < 0.55) {
            this.spawnOrb('ESSENCE_HEAL', pr.x, pr.y, 10);
          } else {
            this.spawnOrb('GOLD_COIN', pr.x, pr.y, 5);
          }
          this.world.props.splice(i, 1);
        }
      }
    }
  }

  private spawnOrb(kind: PickupOrb['kind'], x: number, y: number, value: number): void {
    const ang = Math.random() * Math.PI * 2;
    const spd = 45 + Math.random() * 65;
    this.pickups.push({
      id: allocEntityId(),
      kind,
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      value,
      life: 30,
      bobOffset: Math.random() * 6,
    });
  }

  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const orb = this.pickups[i];
      orb.life -= dt;
      orb.vx *= Math.pow(0.02, dt);
      orb.vy *= Math.pow(0.02, dt);

      const dx = this.player.x - orb.x;
      const dy = this.player.y - orb.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 155) {
        const pull = 360 * (1 - dist / 180) + 120;
        orb.vx = (dx / Math.max(1, dist)) * pull;
        orb.vy = (dy / Math.max(1, dist)) * pull;
      }

      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;

      if (dist <= 22) {
        soundEngine.playPickup();
        if (orb.kind === 'ESSENCE_HEAL') {
          this.healPlayer(orb.value);
          const bonusUlt = this.activeBlessingIds.has('zombie_feast_of_rot') ? 22 : 13;
          this.player.ultCharge = Math.min(100, this.player.ultCharge + bonusUlt);
        } else if (orb.kind === 'SOUL_SHARD') {
          this.runShardsEarned += orb.value;
          this.spawnPopup(this.player.x, this.player.y - 28, `+${orb.value} Shards`, '#38BDF8', 0.9);
        } else if (orb.kind === 'GOLD_COIN') {
          this.runCoins += orb.value;
        } else if (orb.kind === 'XP_ORB') {
          this.gainRunXp(orb.value);
        }
        this.pickups.splice(i, 1);
      } else if (orb.life <= 0) {
        this.pickups.splice(i, 1);
      }
    }
  }

  private gainRunXp(amount: number): void {
    this.runXp += amount;
    if (this.runXp >= this.runXpNext) {
      this.runXp -= this.runXpNext;
      this.runLevel++;
      this.runXpNext = Math.round(this.runXpNext * 1.38);
      this.recomputePlayerStats(false);
      this.healPlayer(20);
      soundEngine.playHeal();
      this.spawnPopup(this.player.x, this.player.y - 38, `LEVEL ${this.runLevel}!`, '#FBBF24', 1.15);
    }
  }

  private updateRoomState(): void {
    if (this.world.isGuild) return;

    const p = this.player;
    for (const room of this.world.rooms) {
      const margin = 44;
      if (
        p.x >= room.x + margin &&
        p.x <= room.x + room.w - margin &&
        p.y >= room.y + margin &&
        p.y <= room.y + room.h - margin
      ) {
        this.currentRoomId = room.id;
        if (!room.discovered) {
          room.discovered = true;
        }

        if (!room.cleared && !room.locked && room.wavesRemaining > 0) {
          room.locked = true;
          room.wavesRemaining--;
          const isFinalBoss = this.world.floorNumber === 3 && room.kind === RoomKind.Boss;
          const wave = spawnRoomWave(room, this.world.floorNumber, isFinalBoss);
          this.world.enemies.push(...wave);
          for (const w of wave) {
            this.spawnBurst(w.x, w.y, '#94A3B8', 10, 85);
          }
          if (isFinalBoss) {
            this.showBanner('Lord Marrow · Keeper of the Graveyard');
            soundEngine.playBossSlam();
          }
          this.emitHudSnapshot();
        }
        break;
      }
    }

    const activeRoom = this.world.rooms.find((r) => r.id === this.currentRoomId);
    if (activeRoom && activeRoom.locked && this.world.enemies.length === 0) {
      if (activeRoom.wavesRemaining > 0) {
        activeRoom.wavesRemaining--;
        const wave = spawnRoomWave(activeRoom, this.world.floorNumber, false);
        this.world.enemies.push(...wave);
        for (const w of wave) {
          this.spawnBurst(w.x, w.y, '#94A3B8', 10, 85);
        }
      } else {
        activeRoom.locked = false;
        activeRoom.cleared = true;
        soundEngine.playHeal();

        const cx = activeRoom.x + activeRoom.w / 2;
        const cy = activeRoom.y + activeRoom.h / 2;

        if (activeRoom.kind === RoomKind.Boss) {
          this.world.props.push({
            id: allocEntityId(),
            kind: 'PORTAL_ARCH',
            x: cx,
            y: cy - 30,
            w: 110,
            h: 68,
            solid: false,
            destructible: false,
            hp: 999,
          });
          this.showBanner(
            this.world.floorNumber === 3
              ? 'Lord Marrow Defeated! Enter the Sanctuary Portal'
              : 'Crypt Cleared! Step into the Descent Portal'
          );
        } else {
          this.world.props.push({
            id: allocEntityId(),
            kind: 'CHEST',
            x: cx,
            y: cy,
            w: 44,
            h: 34,
            solid: false,
            destructible: false,
            hp: 999,
            opened: false,
          });
          this.showBanner('Plot Cleared');
        }
        this.emitHudSnapshot();
      }
    }
  }

  private checkInteractables(): void {
    const p = this.player;
    let prompt: string | null = null;
    const pressedInteract = this.bufferedActions.has('INTERACT');

    if (this.world.isGuild) {
      for (const comp of this.getGuildCompanions()) {
        if (Math.hypot(p.x - comp.x, p.y - comp.y) <= 68) {
          prompt = `Switch to ${comp.label}`;
          if (pressedInteract) {
            this.bufferedActions.delete('INTERACT');
            soundEngine.playUiClick(620);
            this.callbacks.onOpenLoadout(comp.characterId);
            return;
          }
          break;
        }
      }
    }

    for (const prop of this.world.props) {
      const dist = Math.hypot(p.x - prop.x, p.y - prop.y);
      if (prop.kind === 'GUILD_DOOR' && this.world.isGuild) {
        const steppedOutside = p.y <= prop.y - 22 && Math.abs(p.x - prop.x) <= 68;
        if (dist <= 96 || steppedOutside) {
          prompt = 'Open Door · Go Outside';
          if (pressedInteract || steppedOutside) {
            this.bufferedActions.delete('INTERACT');
            this.startGraveyardRun();
            return;
          }
        }
      } else if (prop.kind === 'PORTAL_ARCH' && !this.world.isGuild && dist <= 76) {
        prompt =
          this.world.floorNumber === 3
            ? 'Claim Victory & Return'
            : `Descend to Floor 1-${this.world.floorNumber + 1}`;
        if (pressedInteract || dist <= 32) {
          this.bufferedActions.delete('INTERACT');
          if (this.world.floorNumber >= 3) {
            this.finishRun(true);
          } else {
            this.offerBlessingsAndAdvanceFloor(this.world.floorNumber + 1);
          }
          return;
        }
      } else if (prop.kind === 'GUILD_CAULDRON' && this.world.isGuild && dist <= 78) {
        prompt = 'Skills & Soul Upgrades';
        if (pressedInteract) {
          this.bufferedActions.delete('INTERACT');
          soundEngine.playUiClick(600);
          this.callbacks.onOpenLoadout(this.saveData.selectedCharacter);
          return;
        }
      } else if (prop.kind === 'CHEST' && !prop.opened && dist <= 68) {
        prompt = 'Open Crypt Chest';
        if (pressedInteract || dist <= 34) {
          this.openChestProp(prop);
        }
      } else if (prop.kind === 'SHRINE_ALTAR' && !prop.opened && dist <= 82) {
        prompt = 'Pray at Lantern Statue';
        if (pressedInteract) {
          this.activateShrineStatue(prop);
          return;
        }
      }
    }

    this.interactPrompt = prompt;
  }

  private openChestProp(prop: { x: number; y: number; opened?: boolean }): void {
    if (prop.opened) return;
    this.bufferedActions.delete('INTERACT');
    prop.opened = true;
    soundEngine.playPickup();
    this.spawnBurst(prop.x, prop.y, '#FBBF24', 14, 110);
    this.spawnOrb('SOUL_SHARD', prop.x, prop.y, 5 + this.world.floorNumber * 2);
    this.spawnOrb('ESSENCE_HEAL', prop.x, prop.y, 18);
    this.spawnOrb('GOLD_COIN', prop.x, prop.y, 12);
  }

  private activateShrineStatue(prop: { x: number; y: number; opened?: boolean }): void {
    if (prop.opened || this.phase !== GamePhase.Dungeon) return;
    this.bufferedActions.delete('INTERACT');
    prop.opened = true;
    this.interactPrompt = null;
    this.healPlayer(Math.round(this.player.maxHp * 0.4));
    const burstColor =
      this.player.characterId === CharacterId.Skeleton
        ? '#38BDF8'
        : this.player.characterId === CharacterId.Goblin
        ? '#F59E0B'
        : this.player.characterId === CharacterId.Gnome
        ? '#FB923C'
        : '#4ADE80';
    this.spawnBurst(prop.x, prop.y - 20, burstColor, 14, 95);
    this.offerBlessingsAndAdvanceFloor(null);
  }

  private offerBlessingsAndAdvanceFloor(nextFloor: number | null): void {
    this.pendingNextFloor = nextFloor;
    // Strictly filter to ONLY blessings matching the hero's equipped 2 Normal + 1 Ultimate skills (plus core passives)
    const eligiblePool = getEligibleStatueBlessings(
      this.player.characterId,
      this.getActiveLoadout()
    );
    const unpicked = eligiblePool.filter((b) => !this.activeBlessingIds.has(b.id));
    let choices: RunBlessing[];
    if (unpicked.length >= 3) {
      choices = unpicked
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
    } else {
      // Never pull from unequipped skills — top up strictly from eligiblePool if nearly all 7 eligible blessings were taken
      const pickedEligible = eligiblePool
        .filter((b) => this.activeBlessingIds.has(b.id))
        .sort(() => Math.random() - 0.5);
      choices = [...unpicked, ...pickedEligible].slice(0, 3);
    }
    this.phase = GamePhase.BlessingSelect;
    this.joyX = 0;
    this.joyY = 0;
    this.attackHeld = false;
    this.callbacks.onOfferBlessings(choices);
    this.emitHudSnapshot();
  }

  private finishRun(victory: boolean): void {
    this.phase = victory ? GamePhase.Victory : GamePhase.GameOver;
    this.joyX = 0;
    this.joyY = 0;
    this.attackHeld = false;
    const bonusShards = victory ? 25 : 5;
    const totalEarned = this.runShardsEarned + bonusShards;
    this.runShardsEarned = totalEarned;
    this.callbacks.onRunFinished(victory, totalEarned, this.runKills, this.runDamageDealt);
    this.emitHudSnapshot();
  }

  private resolveWorldCollision(nx: number, ny: number, radius: number): { x: number; y: number } {
    const activeRoom = this.world.rooms.find((r) => r.id === this.currentRoomId);

    let clampedX = nx;
    let clampedY = ny;

    if (activeRoom && activeRoom.locked) {
      clampedX = Math.max(
        activeRoom.x + radius + 6,
        Math.min(activeRoom.x + activeRoom.w - radius - 6, nx)
      );
      clampedY = Math.max(
        activeRoom.y + radius + 6,
        Math.min(activeRoom.y + activeRoom.h - radius - 6, ny)
      );
    } else {
      let bestDistSq = Infinity;
      let bestX = nx;
      let bestY = ny;

      for (const r of this.world.rooms) {
        const cx = Math.max(r.x + radius + 4, Math.min(r.x + r.w - radius - 4, nx));
        const cy = Math.max(r.y + radius + 4, Math.min(r.y + r.h - radius - 4, ny));
        const dSq = (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestX = cx;
          bestY = cy;
        }
      }

      for (const c of this.world.corridors) {
        const isHorizontal = c.w > c.h;
        const cx = isHorizontal
          ? Math.max(c.x, Math.min(c.x + c.w, nx))
          : Math.max(c.x + radius + 4, Math.min(c.x + c.w - radius - 4, nx));
        const cy = isHorizontal
          ? Math.max(c.y + radius + 4, Math.min(c.y + c.h - radius - 4, ny))
          : Math.max(c.y, Math.min(c.y + c.h, ny));
        const dSq = (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestX = cx;
          bestY = cy;
        }
      }

      clampedX = bestX;
      clampedY = bestY;
    }

    for (const prop of this.world.props) {
      if (!prop.solid) continue;
      const halfW = prop.w * 0.44;
      const halfH = prop.h * 0.4;
      const nearX = Math.max(prop.x - halfW, Math.min(prop.x + halfW, clampedX));
      const nearY = Math.max(prop.y - halfH, Math.min(prop.y + halfH, clampedY));
      const dx = clampedX - nearX;
      const dy = clampedY - nearY;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        if (dist > 0.001) {
          clampedX = nearX + (dx / dist) * radius;
          clampedY = nearY + (dy / dist) * radius;
        } else {
          clampedY = prop.y + halfH + radius;
        }
      }
    }

    return { x: clampedX, y: clampedY };
  }

  private isPointInsideWalkableArea(px: number, py: number): boolean {
    for (const r of this.world.rooms) {
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
        return true;
      }
    }
    for (const c of this.world.corridors) {
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
        return true;
      }
    }
    return false;
  }

  private isPointBlockedByWallOrProp(px: number, py: number): boolean {
    if (!this.isPointInsideWalkableArea(px, py)) return true;

    for (const prop of this.world.props) {
      if (!prop.solid) continue;
      if (Math.abs(px - prop.x) < prop.w * 0.42 && Math.abs(py - prop.y) < prop.h * 0.38) {
        return true;
      }
    }
    return false;
  }

  private findNearestEnemy(x: number, y: number, maxRange: number): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestDist = maxRange;
    for (const e of this.world.enemies) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private updateEffects(dt: number): void {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].life -= dt;
      if (this.slashes[i].life <= 0) this.slashes.splice(i, 1);
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life -= dt;
      if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i].life -= dt;
      if (this.shockwaves[i].life <= 0) this.shockwaves.splice(i, 1);
    }
    for (let i = this.tethers.length - 1; i >= 0; i--) {
      this.tethers[i].life -= dt;
      if (this.tethers[i].life <= 0) this.tethers.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt;
      pop.y += pop.vy * dt;
      if (pop.life <= 0) this.popups.splice(i, 1);
    }
  }

  private spawnAmbientParticle(): void {
    if (this.particles.length > 140) return;
    const spread = 520;
    const px = this.cameraX + (Math.random() - 0.5) * spread * 2;
    const py = this.cameraY + (Math.random() - 0.5) * spread * 1.5;
    const isFirefly = Math.random() < 0.65;
    this.particles.push({
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 18,
      vy: -12 - Math.random() * 18,
      size: isFirefly ? 2.2 : 3,
      color: this.world.isGuild
        ? isFirefly
          ? '#FBBF24'
          : '#F97316'
        : isFirefly
        ? '#86EFAC'
        : '#D97706',
      life: 2.2 + Math.random() * 1.5,
      maxLife: 3.5,
      gravity: 0,
      fade: true,
    });
  }

  private spawnBurst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 220) break;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.75);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: 2.4 + Math.random() * 2.6,
        color,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        gravity: 0,
        fade: true,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }

  private spawnPopup(x: number, y: number, text: string, color: string, scale = 1): void {
    if (this.popups.length > 36) this.popups.shift();
    this.popups.push({
      x,
      y,
      vy: -36,
      text,
      color,
      life: 0.75,
      maxLife: 0.75,
      scale,
    });
  }

  private showBanner(text: string): void {
    this.roomBannerText = text;
    this.roomBannerTimer = 2.8;
  }

  private emitHudSnapshot(): void {
    const boss = this.world.enemies.find((e) => e.kind === EnemyKind.SkeletonBoss);
    let minimap: MinimapRoomInfo[];

    if (this.world.isGuild) {
      const gr = this.world.rooms[0];
      const normX = gr
        ? Math.max(-0.46, Math.min(0.46, (this.player.x - (gr.x + gr.w / 2)) / gr.w))
        : 0;
      const normY = gr
        ? Math.max(-0.55, Math.min(0.46, (this.player.y - (gr.y + gr.h / 2)) / gr.h))
        : 0;
      minimap = [
        {
          id: 0,
          gridX: 0,
          gridY: 0,
          kind: RoomKind.Start,
          discovered: true,
          cleared: true,
          isCurrent: true,
          hasExitDoor: true,
          exitUnlocked: true,
          exitPosition: { normX: 0, normY: -0.48 },
          playerPosition: { normX, normY },
          connections: ['N'],
        },
      ];
    } else {
      minimap = this.world.rooms.map((r) => {
        const isCurrent = r.id === this.currentRoomId;
        const hasExitDoor = r.kind === RoomKind.Boss;
        const exitUnlocked = hasExitDoor && r.cleared;
        const normX = Math.max(-0.54, Math.min(0.54, (this.player.x - (r.x + r.w / 2)) / r.w));
        const normY = Math.max(-0.54, Math.min(0.54, (this.player.y - (r.y + r.h / 2)) / r.h));

        return {
          id: r.id,
          gridX: r.gridX,
          gridY: r.gridY,
          kind: r.kind,
          discovered: r.discovered,
          cleared: r.cleared,
          isCurrent,
          hasExitDoor,
          exitUnlocked,
          exitPosition: hasExitDoor ? { normX: 0, normY: -0.06 } : undefined,
          playerPosition: isCurrent ? { normX, normY } : undefined,
          connections: r.connections.map((c) => c.dir),
        };
      });
    }

    const stepX = this.world.isGuild ? 920 : 1100;
    const stepY = this.world.isGuild ? 600 : 920;

    this.callbacks.onHudUpdate({
      phase: this.phase,
      activeCharacter: this.player.characterId,
      hp: Math.ceil(this.player.hp),
      maxHp: this.player.maxHp,
      undyingTimer: +this.player.undyingTimer.toFixed(1),
      abominationTimer: +this.player.abominationTimer.toFixed(1),
      ribcageTimer: +this.player.ribcageTimer.toFixed(1),
      ribcageCharges: this.player.ribcageCharges,
      boneStormTimer: +this.player.boneStormTimer.toFixed(1),
      colossusTimer: +this.player.colossusTimer.toFixed(1),
      unyieldingStacks: this.player.unyieldingStacks,
      windrunnerTimer: +this.player.windrunnerTimer.toFixed(1),
      poisonBladesTimer: +this.player.poisonBladesTimer.toFixed(1),
      stolenMightTimer: +this.player.stolenMightTimer.toFixed(1),
      fortressTimer: +this.player.fortressTimer.toFixed(1),
      magneticTimer: +this.player.magneticTimer.toFixed(1),
      mountainHeartTimer: +this.player.mountainHeartTimer.toFixed(1),
      resolveBonusPct:
        this.player.characterId === CharacterId.Gnome
          ? Math.round(this.getGnomeResolveDefenseBonus() * 100)
          : 0,
      ultCharge: Math.floor(this.player.ultCharge),
      ultCooldown: +this.player.ultCooldown.toFixed(1),
      ultMaxCooldown: this.player.ultMaxCooldown,
      normalCooldowns: [
        +this.player.normalCooldowns[0].toFixed(1),
        +this.player.normalCooldowns[1].toFixed(1),
      ],
      normalMaxCooldowns: this.player.normalMaxCooldowns,
      activeMinions: this.minions.length,
      floorNumber: this.world.floorNumber,
      floorLabel: this.world.floorLabel,
      runLevel: this.runLevel,
      runXp: this.runXp,
      runXpNext: this.runXpNext,
      runCoins: this.runCoins,
      runShardsEarned: this.runShardsEarned,
      runKills: this.runKills,
      runDamageDealt: this.runDamageDealt,
      activeBlessings: Array.from(this.activeBlessingIds),
      interactPrompt: this.interactPrompt,
      roomBannerText: this.roomBannerText,
      bossInfo: boss
        ? {
            name: 'Lord Marrow',
            subtitle: 'Keeper of the Graveyard',
            hp: Math.max(0, Math.ceil(boss.hp)),
            maxHp: boss.maxHp,
          }
        : null,
      minimap,
      mapPan: {
        gridOffsetX: +(this.mapPanX / stepX).toFixed(3),
        gridOffsetY: +(this.mapPanY / stepY).toFixed(3),
        isPanned: Math.hypot(this.mapPanX, this.mapPanY) > 18,
      },
    });
  }

  private render(): void {
    const shakeX = this.shakeMag > 0 ? (Math.random() - 0.5) * 2 * this.shakeMag : 0;
    const shakeY = this.shakeMag > 0 ? (Math.random() - 0.5) * 2 * this.shakeMag : 0;

    renderGameWorld({
      ctx: this.ctx,
      width: this.stageWidth,
      height: this.stageHeight,
      worldZoom: this.getWorldZoom(),
      time: this.elapsedTime,
      phase: this.phase,
      isGuild: this.world.isGuild,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      shakeOffsetX: shakeX,
      shakeOffsetY: shakeY,
      rooms: this.world.rooms,
      corridors: this.world.corridors,
      props: this.world.props,
      poisonClouds: this.poisonClouds,
      traps: this.traps,
      afterimages: this.afterimages,
      daggerRains: this.daggerRains,
      earthenGrasps: this.earthenGrasps,
      stoneRamparts: this.stoneRamparts,
      pickups: this.pickups,
      minions: this.minions,
      enemies: this.world.enemies,
      player: this.player,
      guildCompanions: this.getGuildCompanions(),
      projectiles: this.projectiles,
      slashes: this.slashes,
      shockwaves: this.shockwaves,
      tethers: this.tethers,
      particles: this.particles,
      popups: this.popups,
      panJoystick: this.isDraggingMap
        ? {
            startX: this.panStartX,
            startY: this.panStartY,
            knobX: this.panKnobX,
            knobY: this.panKnobY,
          }
        : null,
    });
  }
}
