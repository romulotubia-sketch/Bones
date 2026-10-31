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
  DeathsPassageRift,
  EarthenGraspZone,
  EnemyEntity,
  EnemyKind,
  DifficultyConfig,
  DifficultyLevel,
  EquippedLoadout,
  ExplosiveTrapEntity,
  FloatingPopup,
  GamePhase,
  GhostMistZone,
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
  DeathsEmbraceEffect,
} from '../types/game';
import { DIFFICULTY_CONFIGS } from '../data/zombieData';
import { clientToLandscapePoint } from '../utils/orientation';
import {
  allocEntityId,
  buildGraveyardFloor,
  buildGuildWorld,
  createProceduralSkeleton,
  GeneratedWorld,
  getBossInfoForFloor,
  getFloorLabel,
  getStageAndFloor,
  spawnRoomWave,
  STAGE_THEMES,
} from './dungeonGenerator';
import { NetworkManager } from '../multiplayer/NetworkManager';
import { PlayerTransformSync } from '../multiplayer/networkTypes';
import { RemoteRenderPlayer, renderGameWorld } from './renderer';

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onOpenLoadout: (charId?: CharacterId) => void;
  onOfferBlessings: (choices: RunBlessing[], source?: 'STATUE' | 'STAGE_CLEAR') => void;
  onRunFinished: (victory: boolean, shardsEarned: number, kills: number, damageDealt: number) => void;
  onRequestDifficultySelect?: () => void;
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
    dashKind: 'FLESH_RIPPER' as
      | 'FLESH_RIPPER'
      | 'SKELETAL_RUSH'
      | 'GROUNDBREAKER_LEAP'
      | 'PHANTOM_DASH',
    dashSlotIndex: 0 as 0 | 1,
    dashRefunded: false,
    dashAngle: 0,
    dashOriginX: 0,
    dashOriginY: 0,
    dashAfterimageAccum: 0,
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
    skelComboStep: 0,
    skelLungeOffset: 0,

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
    zombieComboStep: 0,
    zombieLungeOffset: 0,
    goblinComboStep: 0,
    goblinLungeOffset: 0,

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
    gnomeComboStep: 0,
    gnomeLungeOffset: 0,
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

    // Ghost active states & passives
    restlessTimer: 0,
    soulDrainTimer: 0,
    soulDrainTick: 0,
    possessionTimer: 0,
    possessionPulseTick: 0,
    possessedEnemyId: null as number | null,
    nightmareTimer: 0,
    nightmareFearTick: 0,
    ghostComboStep: 0,
    ghostLungeOffset: 0,
    ghostBasicCount: 0,
    ghostMistDropAccum: 0,

    isDowned: false,
    bleedoutTimer: 0,
    reviveProgress: 0,
    isRevivingPlayerId: null as string | null,

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
  private currentDifficulty: DifficultyLevel = DifficultyLevel.Easy;

  // Dynamic entities
  private minions: MinionEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private poisonClouds: PoisonCloudEntity[] = [];
  private traps: ExplosiveTrapEntity[] = [];
  private afterimages: AfterimageEntity[] = [];
  private daggerRains: DaggerRainZone[] = [];
  private earthenGrasps: EarthenGraspZone[] = [];
  private stoneRamparts: StoneRampartEntity[] = [];
  private deathsPassageRifts: DeathsPassageRift[] = [];
  private ghostMistZones: GhostMistZone[] = [];
  private pickups: PickupOrb[] = [];
  private slashes: SlashEffect[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private tethers: SoulTether[] = [];
  private deathsEmbraceEffects: DeathsEmbraceEffect[] = [];
  private particles: Particle[] = [];
  private popups: FloatingPopup[] = [];

  // Multiplayer Networking
  private networkManager: NetworkManager | null = null;
  private remotePlayers = new Map<string, RemoteRenderPlayer & { targetX: number; targetY: number }>();
  private networkSyncAccum = 0;

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
    this.currentDifficulty = saveData.selectedDifficulty ?? DifficultyLevel.Easy;

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

  public isInCoop(): boolean {
    const mode = this.networkManager?.getRoom()?.mode;
    return mode === 'ONLINE_COOP' || mode === 'LAN_COOP';
  }

  public setNetworkManager(manager: NetworkManager | null): void {
    this.networkManager = manager;
    if (!manager) {
      this.remotePlayers.clear();
      this.emitHudSnapshot();
      return;
    }

    manager.setCallbacks({
      onRoomUpdate: () => {
        this.emitHudSnapshot();
      },
      onGameStart: (seed: number, floorNumber: number) => {
        this.startGraveyardRun(undefined, seed);
      },
      onWorldSync: (players: PlayerTransformSync[], enemies?: EnemySyncState[], activeRoomId?: number, wavesRemaining?: number) => {
        const localId = manager.getLocalPlayerId();
        const activeIds = new Set<string>();
        const room = manager.getRoom();
        const isPvp = room?.mode === 'ONLINE_PVP' || room?.mode === 'LAN_PVP';

        for (const p of players) {
          if (p.id === localId) continue;
          activeIds.add(p.id);

          const roomPlayer = room?.players.find((rp) => rp.id === p.id);
          const name = roomPlayer?.name || 'Ally';
          const color = roomPlayer?.color || '#38BDF8';
          const charId = roomPlayer?.characterId || CharacterId.Zombie;

          const existing = this.remotePlayers.get(p.id);
          if (existing) {
            existing.targetX = p.x;
            existing.targetY = p.y;
            existing.vx = p.vx;
            existing.vy = p.vy;
            existing.aimAngle = p.aimAngle;
            existing.facingX = p.facingX;
            existing.walkPhase = p.walkPhase;
            existing.hp = p.hp;
            existing.maxHp = p.maxHp;
            existing.hitFlashTimer = p.hitFlashTimer;
            existing.squashX = p.squashX;
            existing.squashY = p.squashY;
            existing.dashTimer = p.dashTimer;
            existing.leapAirProgress = p.leapAirProgress;
            existing.characterId = charId;
            existing.isDowned = Boolean(p.isDowned);
            existing.bleedoutTimer = p.bleedoutTimer ?? 0;
            existing.reviveProgress = p.reviveProgress ?? 0;
            existing.undyingTimer = p.activeBuffs.undying ? 5 : 0;
            existing.abominationTimer = p.activeBuffs.abomination ? 8 : 0;
            existing.ribcageCharges = p.activeBuffs.ribcageCharges;
            existing.boneStormTimer = p.activeBuffs.boneStorm ? 6 : 0;
            existing.colossusTimer = p.activeBuffs.colossus ? 8 : 0;
            existing.windrunnerTimer = p.activeBuffs.windrunner ? 5 : 0;
            existing.fortressTimer = p.activeBuffs.fortress ? 5 : 0;
            existing.mountainHeartTimer = p.activeBuffs.mountainHeart ? 8 : 0;
            existing.restlessTimer = p.activeBuffs.restless ? 4 : 0;
            existing.nightmareTimer = p.activeBuffs.nightmare ? 8 : 0;
          } else {
            this.remotePlayers.set(p.id, {
              id: p.id,
              name,
              color,
              characterId: charId,
              x: p.x,
              y: p.y,
              targetX: p.x,
              targetY: p.y,
              vx: p.vx,
              vy: p.vy,
              radius: 17,
              aimAngle: p.aimAngle,
              facingX: p.facingX,
              walkPhase: p.walkPhase,
              hitFlashTimer: p.hitFlashTimer,
              squashX: p.squashX,
              squashY: p.squashY,
              hp: p.hp,
              maxHp: p.maxHp,
              isRival: isPvp,
              isDowned: Boolean(p.isDowned),
              bleedoutTimer: p.bleedoutTimer ?? 0,
              reviveProgress: p.reviveProgress ?? 0,
              undyingTimer: p.activeBuffs.undying ? 5 : 0,
              abominationTimer: p.activeBuffs.abomination ? 8 : 0,
              ribcageTimer: 0,
              ribcageCharges: p.activeBuffs.ribcageCharges,
              boneStormTimer: p.activeBuffs.boneStorm ? 6 : 0,
              colossusTimer: p.activeBuffs.colossus ? 8 : 0,
              unyieldingStacks: 0,
              windrunnerTimer: p.activeBuffs.windrunner ? 5 : 0,
              poisonBladesTimer: 0,
              stolenMightTimer: 0,
              fortressTimer: p.activeBuffs.fortress ? 5 : 0,
              magneticTimer: 0,
              mountainHeartTimer: p.activeBuffs.mountainHeart ? 8 : 0,
              leapAirProgress: p.leapAirProgress,
              resolveRatio: 0,
              dashTimer: p.dashTimer,
              hoveredInGuild: false,
            });
          }
        }

        for (const id of this.remotePlayers.keys()) {
          if (!activeIds.has(id)) {
            this.remotePlayers.delete(id);
          }
        }

        // In Co-op mode, if non-host client, synchronize enemies authoritative state from host
        if (!manager.isHost() && this.isInCoop() && enemies) {
          const syncEnemyIds = new Set(enemies.map((e) => e.id));
          // Update or add enemies
          for (const se of enemies) {
            const existing = this.world.enemies.find((e) => e.id === se.id);
            if (existing) {
              existing.x += (se.x - existing.x) * 0.45;
              existing.y += (se.y - existing.y) * 0.45;
              existing.vx = se.vx;
              existing.vy = se.vy;
              existing.hp = se.hp;
              existing.maxHp = se.maxHp;
              existing.facingX = se.facingX;
              existing.aiState = se.aiState;
              existing.telegraphType = se.telegraphType;
              existing.telegraphAngle = se.telegraphAngle;
              existing.hitFlashTimer = se.hitFlashTimer;
              existing.stunTimer = se.stunTimer;
              existing.plagueTimer = se.plagueTimer;
              existing.infectionStacks = se.infectionStacks;
            } else {
              const newEnemy = createProceduralSkeleton(
                se.kind,
                se.x,
                se.y,
                se.roomId,
                1.0,
                this.getDifficultyConfig()
              );
              newEnemy.id = se.id;
              newEnemy.hp = se.hp;
              newEnemy.maxHp = se.maxHp;
              newEnemy.facingX = se.facingX;
              newEnemy.aiState = se.aiState;
              newEnemy.telegraphType = se.telegraphType;
              newEnemy.telegraphAngle = se.telegraphAngle;
              newEnemy.hitFlashTimer = se.hitFlashTimer;
              newEnemy.stunTimer = se.stunTimer;
              newEnemy.plagueTimer = se.plagueTimer;
              newEnemy.infectionStacks = se.infectionStacks;
              this.world.enemies.push(newEnemy);
            }
          }
          // Remove dead enemies
          for (let i = this.world.enemies.length - 1; i >= 0; i--) {
            if (!syncEnemyIds.has(this.world.enemies[i].id)) {
              this.world.enemies.splice(i, 1);
            }
          }
          if (activeRoomId !== undefined && wavesRemaining !== undefined) {
            const activeRoom = this.world.rooms.find((r) => r.id === activeRoomId);
            if (activeRoom) {
              activeRoom.wavesRemaining = wavesRemaining;
            }
          }
        }
      },
      onEnemyDamaged: (enemyId, damage, isCrit, hitX, hitY, attackerId) => {
        if (manager.isHost()) {
          const target = this.world.enemies.find((e) => e.id === enemyId);
          if (target && target.hp > 0) {
            this.damageEnemy(target, damage, true, hitX ?? target.x, hitY ?? target.y, false, isCrit);
          }
        } else {
          const target = this.world.enemies.find((e) => e.id === enemyId);
          if (target) {
            target.hp = Math.max(0, target.hp - damage);
            target.hitFlashTimer = 0.08;
            soundEngine.playHit(isCrit);
            this.spawnPopup(
              hitX ?? target.x,
              (hitY ?? target.y) - 18,
              `-${damage}`,
              isCrit ? '#FEF08A' : '#F87171',
              isCrit ? 1.25 : 1.0
            );
          }
        }
      },
      onEnemyDefeated: (enemyId, killerId, dropX, dropY) => {
        const idx = this.world.enemies.findIndex((e) => e.id === enemyId);
        if (idx !== -1) {
          const deadEnemy = this.world.enemies[idx];
          this.spawnBurst(deadEnemy.x, deadEnemy.y, '#94A3B8', 12, 110);
          this.world.enemies.splice(idx, 1);
          this.runKills++;
          soundEngine.playEnemyDeath();
          this.spawnOrb('SOUL_SHARD', dropX, dropY, 2);
        }
      },
      onRemoteSkill: (playerId, skillId, x, y, angle, slot) => {
        this.handleRemoteSkillCast(playerId, skillId, x, y, angle, slot);
      },
      onPlayerRevived: (revivedPlayerId, reviverPlayerId, reviveHp) => {
        const localId = manager.getLocalPlayerId();
        if (revivedPlayerId === localId) {
          this.player.isDowned = false;
          this.player.bleedoutTimer = 0;
          this.player.reviveProgress = 0;
          this.player.hp = reviveHp;
          this.player.invulnTimer = 2.5;
          soundEngine.playHeal();
          this.spawnBurst(this.player.x, this.player.y, '#4ADE80', 20, 120);
          this.spawnPopup(this.player.x, this.player.y - 32, 'REVIVED!', '#4ADE80', 1.4);
          this.showBanner('Revived by teammate!');
        } else {
          const remote = this.remotePlayers.get(revivedPlayerId);
          if (remote) {
            remote.isDowned = false;
            remote.hp = reviveHp;
            remote.reviveProgress = 0;
            soundEngine.playHeal();
            this.spawnBurst(remote.x, remote.y, '#4ADE80', 16, 110);
            this.spawnPopup(remote.x, remote.y - 32, 'REVIVED!', '#4ADE80', 1.3);
          }
        }
        this.emitHudSnapshot();
      },
      onFloorSync: (floorNumber, seed) => {
        this.loadDungeonFloor(floorNumber, seed);
      },
      onPartyWipe: () => {
        this.showBanner('Party Defeated!');
        this.finishRun(false);
      },
      onPlayerLeft: (playerId: string) => {
        this.remotePlayers.delete(playerId);
        this.emitHudSnapshot();
      },
    });
    this.emitHudSnapshot();
  }

  private handleRemoteSkillCast(
    playerId: string,
    skillId: string,
    x: number,
    y: number,
    angle: number,
    _slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE'
  ): void {
    const remote = this.remotePlayers.get(playerId);
    const charId = remote?.characterId ?? CharacterId.Zombie;

    if (skillId === 'BASIC') {
      if (charId === CharacterId.Skeleton) {
        soundEngine.playSlash(1);
        this.slashes.push({
          x: x + Math.cos(angle) * 16,
          y: y + Math.sin(angle) * 16,
          angle,
          radius: 72,
          arcSpread: 1.5,
          color: '#38BDF8',
          life: 0.22,
          maxLife: 0.22,
          flip: Math.random() < 0.5,
          kind: 'SKELETON_SWORD_SLASH',
        });
      } else if (charId === CharacterId.Goblin) {
        soundEngine.playSlash(1);
        this.slashes.push({
          x: x + Math.cos(angle) * 14,
          y: y + Math.sin(angle) * 14,
          angle,
          radius: 64,
          arcSpread: 1.4,
          color: '#F59E0B',
          life: 0.18,
          maxLife: 0.18,
          flip: Math.random() < 0.5,
        });
      } else if (charId === CharacterId.Gnome) {
        soundEngine.playBoneBreak();
        this.shockwaves.push({
          x: x + Math.cos(angle) * 24,
          y: y + Math.sin(angle) * 24,
          maxRadius: 76,
          color: '#FB923C',
          life: 0.22,
          maxLife: 0.22,
        });
      } else if (charId === CharacterId.Ghost) {
        soundEngine.playDash();
        this.slashes.push({
          x: x + Math.cos(angle) * 16,
          y: y + Math.sin(angle) * 16,
          angle,
          radius: 68,
          arcSpread: 1.6,
          color: '#C084FC',
          life: 0.2,
          maxLife: 0.2,
          flip: Math.random() < 0.5,
          kind: 'GHOST_CLAW_SLASH',
        });
      } else {
        soundEngine.playSlash(1);
        this.slashes.push({
          x: x + Math.cos(angle) * 16,
          y: y + Math.sin(angle) * 16,
          angle,
          radius: 70,
          arcSpread: 1.5,
          color: '#4ADE80',
          life: 0.22,
          maxLife: 0.22,
          flip: Math.random() < 0.5,
          kind: 'ZOMBIE_BASIC_ATTACK',
        });
      }
      return;
    }

    if (skillId === NormalSkillId.PlagueBurst) {
      soundEngine.playPlague();
      this.poisonClouds.push({
        id: allocEntityId(),
        x,
        y,
        radius: 120,
        life: 4.5,
        maxLife: 4.5,
        tickTimer: 0.1,
        damagePerTick: 10,
      });
      this.shockwaves.push({
        x,
        y,
        maxRadius: 120,
        color: '#A3E635',
        life: 0.28,
        maxLife: 0.28,
      });
    } else if (skillId === NormalSkillId.FleshRipper) {
      soundEngine.playDash();
      this.slashes.push({
        x,
        y,
        angle,
        radius: 80,
        arcSpread: 1.6,
        color: '#4ADE80',
        life: 0.24,
        maxLife: 0.24,
        flip: false,
        kind: 'ZOMBIE_SAVAGE_REND',
      });
    } else if (skillId === NormalSkillId.BoneSpear) {
      soundEngine.playSlash(2);
      this.projectiles.push({
        id: allocEntityId(),
        fromPlayer: true,
        x,
        y,
        vx: Math.cos(angle) * 600,
        vy: Math.sin(angle) * 600,
        radius: 8,
        damage: 25,
        life: 1.2,
        color: '#38BDF8',
        kind: 'PLAYER_BONE_SPEAR',
        angle,
        pierce: true,
        hitEnemyIds: new Set<number>(),
      });
    } else if (skillId === NormalSkillId.RibcageShield) {
      soundEngine.playBoneBreak();
      this.slashes.push({
        x,
        y,
        angle: 0,
        radius: 60,
        arcSpread: Math.PI * 2,
        color: '#E2E8F0',
        life: 0.26,
        maxLife: 0.26,
        flip: false,
        kind: 'SKELETON_RIBCAGE_BURST',
      });
    } else if (skillId === NormalSkillId.BoneStorm) {
      soundEngine.playSlash(3);
      this.shockwaves.push({
        x,
        y,
        maxRadius: 85,
        color: '#38BDF8',
        life: 0.35,
        maxLife: 0.35,
      });
    } else if (skillId === NormalSkillId.FanOfKnives) {
      soundEngine.playSlash(1);
      for (let i = 0; i < 5; i++) {
        const fa = angle + (i - 2) * 0.18;
        this.projectiles.push({
          id: allocEntityId(),
          fromPlayer: true,
          x,
          y,
          vx: Math.cos(fa) * 560,
          vy: Math.sin(fa) * 560,
          radius: 6,
          damage: 18,
          life: 0.9,
          color: '#F59E0B',
          kind: 'PLAYER_SPECTRAL_DAGGER',
          angle: fa,
          hitEnemyIds: new Set<number>(),
        });
      }
    } else if (skillId === NormalSkillId.ShadowStep) {
      soundEngine.playDash();
      this.spawnBurst(x, y, '#F59E0B', 10, 85);
    } else if (skillId === NormalSkillId.Groundbreaker) {
      soundEngine.playBossSlam();
      this.shockwaves.push({
        x,
        y,
        maxRadius: 95,
        color: '#FB923C',
        life: 0.3,
        maxLife: 0.3,
      });
    } else if (skillId === NormalSkillId.StoneRampart) {
      soundEngine.playBoneBreak();
      this.spawnBurst(x, y, '#FB923C', 12, 90);
    } else if (skillId === NormalSkillId.PhantomDash) {
      soundEngine.playDash();
      this.afterimages.push({
        x,
        y,
        facingX: Math.cos(angle) >= 0 ? 1 : -1,
        color: '#C084FC',
        life: 0.36,
        maxLife: 0.36,
        archetype: 'GHOST',
      });
    } else if (skillId === NormalSkillId.SoulDrain) {
      soundEngine.playDash();
      this.slashes.push({
        x,
        y,
        angle: 0,
        radius: 95,
        arcSpread: Math.PI * 2,
        color: '#34D399',
        life: 0.45,
        maxLife: 0.45,
        flip: false,
        kind: 'GHOST_SOUL_DRAIN_RING',
      });
    } else {
      soundEngine.playBossSlam();
      this.shockwaves.push({
        x,
        y,
        maxRadius: 130,
        color: '#FBBF24',
        life: 0.4,
        maxLife: 0.4,
      });
      this.spawnBurst(x, y, '#FBBF24', 16, 120);
    }
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

  public getDifficultyConfig(): DifficultyConfig {
    return DIFFICULTY_CONFIGS[this.currentDifficulty] ?? DIFFICULTY_CONFIGS[DifficultyLevel.Easy];
  }

  public setDifficulty(difficulty: DifficultyLevel): void {
    this.currentDifficulty = difficulty;
    this.saveData.selectedDifficulty = difficulty;
    this.emitHudSnapshot();
  }

  public updateSaveData(newSave: GuildSaveData): void {
    const prevChar = this.saveData.selectedCharacter;
    this.saveData = newSave;
    if (newSave.selectedDifficulty) {
      this.currentDifficulty = newSave.selectedDifficulty;
    }
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

  public startGraveyardRun(difficulty?: DifficultyLevel, seed?: number): void {
    if (difficulty) {
      this.currentDifficulty = difficulty;
      this.saveData.selectedDifficulty = difficulty;
    } else {
      this.currentDifficulty = this.saveData.selectedDifficulty ?? DifficultyLevel.Easy;
    }
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

    this.player.isDowned = false;
    this.player.bleedoutTimer = 0;
    this.player.reviveProgress = 0;
    this.player.characterId = this.saveData.selectedCharacter;
    this.recomputePlayerStats(true);
    this.player.ultCharge = 100;
    this.player.normalCooldowns = [0, 0];
    this.player.ultCooldown = 0;

    this.loadDungeonFloor(1, seed);
    soundEngine.playSummon();
  }

  public applyBlessingChoice(blessingId: string): void {
    this.activeBlessingIds.add(blessingId);
    if (blessingId === 'zombie_bloated_carcass') {
      this.recomputePlayerStats(false);
      this.healPlayer(22);
    } else if (blessingId === 'skel_fortified_ribs') {
      this.recomputePlayerStats(false);
      this.healPlayer(18);
    } else if (blessingId === 'gnome_bedrock_plating') {
      this.recomputePlayerStats(false);
      this.healPlayer(24);
    } else if (blessingId === 'ghost_ethereal_veil') {
      this.recomputePlayerStats(false);
      this.healPlayer(14);
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
    if (this.player.isDowned) return;
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

  public loadDungeonFloor(floorNum: number, seed?: number): void {
    this.clearTransientEntities();
    this.player.isDowned = false;
    this.player.bleedoutTimer = 0;
    this.player.reviveProgress = 0;
    this.world = buildGraveyardFloor(floorNum, this.getDifficultyConfig(), seed);
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
    this.deathsPassageRifts = [];
    this.ghostMistZones = [];
    this.pickups = [];
    this.slashes = [];
    this.shockwaves = [];
    this.tethers = [];
    this.deathsEmbraceEffects = [];
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
    this.player.dashAfterimageAccum = 0;
    this.player.undyingTimer = 0;
    this.player.abominationTimer = 0;
    this.player.ribcageTimer = 0;
    this.player.ribcageCharges = 0;
    this.player.boneStormTimer = 0;
    this.player.colossusTimer = 0;
    this.player.unyieldingStacks = 0;
    this.player.unyieldingTimer = 0;
    this.player.skelComboStep = 0;
    this.player.skelLungeOffset = 0;
    this.player.windrunnerTimer = 0;
    this.player.reflexBurstTimer = 0;
    this.player.poisonBladesTimer = 0;
    this.player.stolenMightTimer = 0;
    this.player.flurryRemaining = 0;
    this.player.phantomRemaining = 0;
    this.player.kingThievesRemaining = 0;
    this.player.zombieClawStrikeCount = 0;
    this.player.zombieComboStep = 0;
    this.player.zombieLungeOffset = 0;
    this.player.goblinComboStep = 0;
    this.player.goblinLungeOffset = 0;
    this.player.fortressTimer = 0;
    this.player.magneticTimer = 0;
    this.player.mountainHeartTimer = 0;
    this.player.leapAirProgress = 0;
    this.player.gnomePunchCount = 0;
    this.player.gnomeComboStep = 0;
    this.player.gnomeLungeOffset = 0;
    this.player.ironFistAftershockTimer = 0;
    this.player.cataclysmWavesRemaining = 0;
    this.player.restlessTimer = 0;
    this.player.soulDrainTimer = 0;
    this.player.possessionTimer = 0;
    this.player.possessedEnemyId = null;
    this.player.nightmareTimer = 0;
    this.player.ghostComboStep = 0;
    this.player.ghostLungeOffset = 0;
    this.player.ghostBasicCount = 0;
    this.player.ghostMistDropAccum = 0;
  }

  private recomputePlayerStats(fullHeal: boolean): void {
    const profile = this.getActiveProfile();
    const loadout = this.getActiveLoadout();
    const ranks = this.getActiveUpgrades();
    const isSkel = profile.id === CharacterId.Skeleton;
    const isGob = profile.id === CharacterId.Goblin;
    const isGnome = profile.id === CharacterId.Gnome;
    const isGhost = profile.id === CharacterId.Ghost;

    const upgHp = isSkel
      ? ranks.pathA * 14
      : isGob
      ? ranks.pathA * 11
      : isGnome
      ? ranks.pathA * 26
      : isGhost
      ? ranks.pathA * 9
      : ranks.pathA * 24;
    const statueHp =
      (this.activeBlessingIds.has('zombie_bloated_carcass') ? 22 : 0) +
      (this.activeBlessingIds.has('skel_fortified_ribs') ? 18 : 0) +
      (this.activeBlessingIds.has('gnome_bedrock_plating') ? 24 : 0) +
      (this.activeBlessingIds.has('ghost_ethereal_veil') ? 14 : 0);
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
      isSkel || isGob
        ? 1 + ranks.pathE * 0.05
        : isGnome
        ? 1 + ranks.pathE * 0.04
        : isGhost
        ? 1 + ranks.pathE * 0.055
        : 1.0;
    const statueSpeedMult =
      (this.activeBlessingIds.has('skel_phantom_stride') ? 1.1 : 1.0) *
      (this.activeBlessingIds.has('gob_quicksilver_boots') ? 1.1 : 1.0);
    this.player.speed = profile.baseSpeed * upgSpeedMult * statueSpeedMult;

    const pathCdStep = isSkel || isGob || isGhost ? 0.07 : 0.06;
    const upgCdMult = 1 - ranks.pathE * pathCdStep;
    const normalBlessCdMult = this.activeBlessingIds.has('skel_phantom_stride') ? 0.9 : 1.0;

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

  private getGhostRestlessMultiplier(): number {
    if (this.player.characterId !== CharacterId.Ghost || this.player.restlessTimer <= 0) {
      return 1.0;
    }
    const ranks = this.getActiveUpgrades();
    const echoBonus = this.activeBlessingIds.has('ghost_restless_echo') ? 0.07 : 0;
    return 1.32 + ranks.pathE * 0.08 + echoBonus;
  }

  private triggerRestlessSpirit(): void {
    const p = this.player;
    if (p.characterId !== CharacterId.Ghost) return;
    const ranks = this.getActiveUpgrades();
    const hasEcho = this.activeBlessingIds.has('ghost_restless_echo');
    const wasReady = p.restlessTimer <= 0.15;
    p.restlessTimer = 4.0 + (hasEcho ? 1.2 : 0);
    p.ultCharge = Math.min(100, p.ultCharge + 7 * (1 + ranks.pathE * 0.14));
    if (hasEcho) {
      this.healPlayer(3);
    }
    this.slashes.push({
      x: p.x,
      y: p.y,
      angle: 0,
      radius: 74,
      arcSpread: Math.PI * 2,
      color: '#67E8F9',
      life: 0.28,
      maxLife: 0.28,
      flip: false,
      kind: 'GHOST_RESTLESS_SURGE',
    });
    if (wasReady) {
      this.spawnPopup(p.x, p.y - 30, 'RESTLESS SPIRIT!', '#67E8F9', 0.98);
    }
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
        ? 1.12
        : 1.0;
    const concussive =
      charId === CharacterId.Gnome && this.activeBlessingIds.has('gnome_concussive_gauntlets')
        ? 1.12
        : 1.0;
    const gritOffense =
      charId === CharacterId.Gnome && this.activeBlessingIds.has('gnome_undying_grit')
        ? 1 + Math.max(0, 1 - this.player.hp / Math.max(1, this.player.maxHp)) * 0.18
        : 1.0;
    const ghostWisp =
      charId === CharacterId.Ghost && this.activeBlessingIds.has('ghost_ectoplasm_wisp')
        ? 1.1
        : 1.0;
    const ghostRestless = this.getGhostRestlessMultiplier();
    const ghostNightmare =
      charId === CharacterId.Ghost && this.player.nightmareTimer > 0 ? 1.25 : 1.0;
    const abom = this.player.abominationTimer > 0 ? 1.65 : 1.0;
    const colossus = this.player.colossusTimer > 0 ? 1.7 : 1.0;
    const mountain = this.player.mountainHeartTimer > 0 ? 1.55 : 1.0;
    const stolenMight = this.player.stolenMightTimer > 0 ? 1.35 : 1.0;
    const lvl = 1 + (this.runLevel - 1) * 0.07;
    return (
      upg *
      necroTalons *
      concussive *
      gritOffense *
      ghostWisp *
      ghostRestless *
      ghostNightmare *
      abom *
      colossus *
      mountain *
      stolenMight *
      lvl
    );
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
        : charId === CharacterId.Ghost
        ? ranks.pathB * 0.14 + ranks.pathC * 0.16
        : ranks.pathC * 0.2;
    const ghostRestless = this.getGhostRestlessMultiplier();
    const lvl = 1 + (this.runLevel - 1) * 0.06;
    return (1 + upgBonus) * ghostRestless * lvl;
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
    const isGhost = profile.id === CharacterId.Ghost;

    const upgCrit = isSkel || isGob || isGhost ? ranks.pathC * 0.04 : 0;
    const ivoryCrit = this.activeBlessingIds.has('skel_ivory_edge') ? 0.1 : 0;
    const heartseekerCrit = this.activeBlessingIds.has('gob_throat_seeker') ? 0.12 : 0;
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
    const ivoryMult = this.activeBlessingIds.has('skel_ivory_edge') ? 0.18 : 0;
    const heartseekerMult =
      isOpportunisticHit && this.activeBlessingIds.has('gob_throat_seeker') ? 0.2 : 0;

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
          if (this.callbacks.onRequestDifficultySelect) {
            this.callbacks.onRequestDifficultySelect();
          } else {
            this.startGraveyardRun();
          }
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
          const maxFloors = this.getDifficultyConfig().maxFloors;
          if (this.world.floorNumber >= maxFloors) {
            this.finishRun(true);
          } else {
            const nextFloor = this.world.floorNumber + 1;
            if (this.world.floorNumber > 7) {
              this.loadDungeonFloor(nextFloor);
            } else {
              this.offerBlessingsAndAdvanceFloor(nextFloor, 'STAGE_CLEAR');
            }
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

    // Smoothly interpolate remote players
    for (const remote of this.remotePlayers.values()) {
      const lerpFactor = Math.min(1, dt * 16);
      remote.x += (remote.targetX - remote.x) * lerpFactor;
      remote.y += (remote.targetY - remote.y) * lerpFactor;
      if (remote.hitFlashTimer > 0) remote.hitFlashTimer = Math.max(0, remote.hitFlashTimer - dt);
    }

    // Network transform broadcast (20 Hz)
    if (this.networkManager) {
      this.networkSyncAccum += dt;
      if (this.networkSyncAccum >= 0.05) {
        this.networkSyncAccum = 0;
        this.networkManager.sendTransform({
          x: +this.player.x.toFixed(1),
          y: +this.player.y.toFixed(1),
          vx: +this.player.vx.toFixed(1),
          vy: +this.player.vy.toFixed(1),
          aimAngle: +this.player.aimAngle.toFixed(2),
          facingX: this.player.facingX,
          walkPhase: +this.player.walkPhase.toFixed(2),
          hp: Math.ceil(this.player.hp),
          maxHp: this.player.maxHp,
          hitFlashTimer: +this.player.hitFlashTimer.toFixed(2),
          squashX: +this.player.squashX.toFixed(2),
          squashY: +this.player.squashY.toFixed(2),
          dashTimer: +this.player.dashTimer.toFixed(2),
          leapAirProgress: +this.player.leapAirProgress.toFixed(2),
          isAttacking: this.attackHeld || this.bufferedActions.has('BASIC'),
          comboStep: this.player.zombieComboStep || this.player.skelComboStep || 0,
          activeBuffs: {
            undying: this.player.undyingTimer > 0,
            abomination: this.player.abominationTimer > 0,
            ribcageCharges: this.player.ribcageCharges,
            boneStorm: this.player.boneStormTimer > 0,
            colossus: this.player.colossusTimer > 0,
            windrunner: this.player.windrunnerTimer > 0,
            fortress: this.player.fortressTimer > 0,
            mountainHeart: this.player.mountainHeartTimer > 0,
            restless: this.player.restlessTimer > 0,
            nightmare: this.player.nightmareTimer > 0,
          },
        });
      }
    }
    this.updateMinions(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePoisonClouds(dt);
    this.updateTraps(dt);
    this.updateDaggerRains(dt);
    this.updateEarthenGrasps(dt);
    this.updateStoneRamparts(dt);
    this.updateGhostMistZones(dt);
    this.updateDeathsPassageRifts(dt);
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
    p.skelLungeOffset += (0 - p.skelLungeOffset) * Math.min(1, dt * 16);
    p.zombieLungeOffset += (0 - p.zombieLungeOffset) * Math.min(1, dt * 14);
    p.goblinLungeOffset += (0 - p.goblinLungeOffset) * Math.min(1, dt * 18);
    p.gnomeLungeOffset += (0 - p.gnomeLungeOffset) * Math.min(1, dt * 15);
    p.ghostLungeOffset += (0 - p.ghostLungeOffset) * Math.min(1, dt * 16);
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

    // Zombie: Undying Flesh regeneration (+ Spined Carapace thorns & 60fps vitality cross motes)
    if (p.undyingTimer > 0) {
      p.undyingTimer = Math.max(0, p.undyingTimer - dt);
      if (Math.random() < 0.28 && this.particles.length < 230) {
        const ua = Math.random() * Math.PI * 2;
        const ur = (p.abominationTimer > 0 ? 34 : 24) * (0.6 + Math.random() * 0.45);
        this.particles.push({
          x: p.x + Math.cos(ua) * ur,
          y: p.y + Math.sin(ua) * (ur * 0.65),
          vx: (Math.random() - 0.5) * 14,
          vy: -32 - Math.random() * 22,
          size: 4.5,
          color: Math.random() < 0.5 ? '#2DD4BF' : '#4ADE80',
          life: 0.42,
          maxLife: 0.42,
          gravity: 0,
          fade: true,
          kind: 'NECRO_CROSS',
          drag: 2.0,
        });
      }
      p.undyingHealTick -= dt;
      if (p.undyingHealTick <= 0) {
        p.undyingHealTick = 0.5;
        const healAmt = Math.max(2, Math.round(p.maxHp * 0.035));
        this.healPlayer(healAmt);
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: this.activeBlessingIds.has('zombie_skill_undying_flesh') ? 86 : 62,
          arcSpread: Math.PI * 2,
          color: '#2DD4BF',
          life: 0.28,
          maxLife: 0.28,
          flip: false,
          kind: 'ZOMBIE_UNDYING_PULSE',
          scale: p.abominationTimer > 0 ? 1.35 : 1.0,
        });
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

    // Zombie: Abomination Form periodic mutagenic stomp
    if (p.abominationTimer > 0) {
      p.abominationTimer = Math.max(0, p.abominationTimer - dt);
      if (Math.random() < 0.24 && this.particles.length < 230) {
        const aa = Math.random() * Math.PI * 2;
        this.particles.push({
          x: p.x + Math.cos(aa) * 26,
          y: p.y + 8 + Math.sin(aa) * 14,
          vx: Math.cos(aa) * 28,
          vy: -24 - Math.random() * 18,
          size: 7,
          color: Math.random() < 0.5 ? '#A3E635' : '#4ADE80',
          life: 0.36,
          maxLife: 0.36,
          gravity: 0,
          fade: true,
          kind: 'SPORE_PUFF',
          drag: 3.2,
        });
      }
      p.abomStompTick -= dt;
      if (p.abomStompTick <= 0) {
        p.abomStompTick = 1.4;
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: Math.random() * Math.PI,
          radius: 98,
          arcSpread: Math.PI * 2,
          color: '#4ADE80',
          life: 0.32,
          maxLife: 0.32,
          flip: false,
          kind: 'ZOMBIE_ABOMINATION_NOVA',
          scale: 0.88,
        });
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
            this.applyInfectiousTouch(enemy, 1);
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

    // Skeleton: Bone Storm whirling vortex shred + 60fps cyclonic bone splinters
    if (p.boneStormTimer > 0) {
      p.boneStormTimer = Math.max(0, p.boneStormTimer - dt);
      const maelstrom = this.activeBlessingIds.has('skel_skill_bone_storm');
      const stormRadius = maelstrom ? 99 : 76;
      if (Math.random() < 0.45 && this.particles.length < 235) {
        const sa = this.elapsedTime * 9 + Math.random() * Math.PI * 2;
        const sr = stormRadius * (0.72 + Math.random() * 0.25);
        const tangent = sa + Math.PI * 0.5;
        const isShard = Math.random() < 0.45;
        this.particles.push({
          x: p.x + Math.cos(sa) * sr,
          y: p.y + Math.sin(sa) * sr,
          vx: Math.cos(tangent) * 145,
          vy: Math.sin(tangent) * 145,
          size: 2.6,
          color: isShard ? '#F8FAFC' : '#A5B4FC',
          life: 0.2,
          maxLife: 0.2,
          gravity: 0,
          fade: true,
          kind: isShard ? 'BONE_SHARD' : 'SLASH_STREAK',
          rot: tangent,
          vRot: isShard ? 18 : 0,
          len: isShard ? 6 : 14,
          thick: isShard ? 2.4 : 1.8,
          drag: 5.0,
        });
      }
      p.boneStormTick -= dt;
      if (p.boneStormTick <= 0) {
        p.boneStormTick = 0.34;
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
            this.slashes.push({
              x: enemy.x,
              y: enemy.y,
              angle: Math.atan2(enemy.y - p.y, enemy.x - p.x) + Math.PI * 0.5,
              radius: 24,
              arcSpread: 0,
              color: roll.isCrit ? '#FDE047' : '#A5B4FC',
              life: 0.14,
              maxLife: 0.14,
              flip: false,
              kind: 'SKELETON_IMPACT_FLASH',
              scale: 0.88,
              isCrit: roll.isCrit,
            });
          }
        }
        this.hitDestructibleProps(p.x, p.y, stormRadius);
      }
    }

    // Skeleton: Bone Colossus titan pulse
    if (p.colossusTimer > 0) {
      p.colossusTimer = Math.max(0, p.colossusTimer - dt);
      if (Math.random() < 0.28 && this.particles.length < 230) {
        const ca = Math.random() * Math.PI * 2;
        this.particles.push({
          x: p.x + Math.cos(ca) * 30,
          y: p.y + Math.sin(ca) * 20,
          vx: (Math.random() - 0.5) * 18,
          vy: -34 - Math.random() * 24,
          size: 3.5,
          color: Math.random() < 0.5 ? '#38BDF8' : '#C084FC',
          life: 0.38,
          maxLife: 0.38,
          gravity: 0,
          fade: true,
          kind: 'SOUL_WISP',
          drag: 2.2,
        });
      }
      p.colossusShockTick -= dt;
      if (p.colossusShockTick <= 0) {
        p.colossusShockTick = this.activeBlessingIds.has('skel_ult_colossus') ? 1.1 : 1.35;
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: Math.random() * Math.PI,
          radius: 104,
          arcSpread: Math.PI * 2,
          color: '#38BDF8',
          life: 0.3,
          maxLife: 0.3,
          flip: false,
          kind: 'SKELETON_COLOSSUS_NOVA',
          scale: 0.85,
        });
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

    // Goblin active timers (Windrunner aerodynamic slipstream chevrons & Poisoned Blades venom drips)
    if (p.windrunnerTimer > 0) {
      p.windrunnerTimer = Math.max(0, p.windrunnerTimer - dt);
      const moveSpd = Math.hypot(p.vx, p.vy);
      if (moveSpd > 35 && Math.random() < 0.48 && this.particles.length < 230) {
        const moveAng = Math.atan2(p.vy, p.vx);
        this.particles.push({
          x: p.x - Math.cos(moveAng) * 10 + (Math.random() - 0.5) * 10,
          y: p.y + 4 - Math.sin(moveAng) * 10 + (Math.random() - 0.5) * 10,
          vx: -Math.cos(moveAng) * 65,
          vy: -Math.sin(moveAng) * 65,
          size: 8.5,
          color: Math.random() < 0.5 ? '#FDE047' : '#34D399',
          life: 0.24,
          maxLife: 0.24,
          gravity: 0,
          fade: true,
          kind: 'WIND_CHEVRON',
          rot: moveAng,
          vRot: 0,
          len: 9,
          thick: 2.2,
          drag: 4.5,
        });
      }
    }
    if (p.reflexBurstTimer > 0) p.reflexBurstTimer = Math.max(0, p.reflexBurstTimer - dt);
    if (p.poisonBladesTimer > 0) {
      p.poisonBladesTimer = Math.max(0, p.poisonBladesTimer - dt);
      if (Math.random() < 0.28 && this.particles.length < 230) {
        const side = Math.random() < 0.5 ? -12 : 12;
        this.particles.push({
          x: p.x + side * p.facingX,
          y: p.y + 4,
          vx: (Math.random() - 0.5) * 20,
          vy: 26 + Math.random() * 18,
          size: 2.8,
          color: '#A3E635',
          life: 0.25,
          maxLife: 0.25,
          gravity: 0,
          fade: true,
          kind: 'VENOM_DROP',
          rot: Math.PI * 0.5,
          vRot: 0,
          len: 4.8,
          thick: 2.2,
          drag: 3.0,
        });
      }
    }
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

    // Gnome: Fortress Stance timer (+ Aegis Bastion tremors & rising bronze rune sparks)
    if (p.fortressTimer > 0) {
      p.fortressTimer = Math.max(0, p.fortressTimer - dt);
      if (Math.random() < 0.26 && this.particles.length < 230) {
        const fa = Math.random() * Math.PI * 2;
        const fr = p.mountainHeartTimer > 0 ? 42 : 30;
        this.particles.push({
          x: p.x + Math.cos(fa) * fr,
          y: p.y + Math.sin(fa) * (fr * 0.6),
          vx: (Math.random() - 0.5) * 14,
          vy: -28 - Math.random() * 20,
          size: 2.8,
          color: Math.random() < 0.5 ? '#FDBA74' : '#FDE047',
          life: 0.34,
          maxLife: 0.34,
          gravity: 0,
          fade: true,
          kind: 'RUNE_SPARK',
          rot: fa,
          vRot: 6,
          len: 5,
          drag: 2.5,
        });
      }
      if (this.activeBlessingIds.has('gnome_skill_fortress_stance')) {
        p.fortressTremorTick -= dt;
        if (p.fortressTremorTick <= 0) {
          p.fortressTremorTick = 1.25;
          this.slashes.push({
            x: p.x,
            y: p.y,
            angle: 0,
            radius: 96,
            arcSpread: Math.PI * 2,
            color: '#FDBA74',
            life: 0.28,
            maxLife: 0.28,
            flip: false,
            kind: 'GNOME_FORTRESS_AEGIS',
          });
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

    // Gnome: Magnetic Guard timer (+ Overcharged Coil lightning arcs & polarity sparks)
    if (p.magneticTimer > 0) {
      p.magneticTimer = Math.max(0, p.magneticTimer - dt);
      if (Math.random() < 0.32 && this.particles.length < 230) {
        const ma = Math.random() * Math.PI * 2;
        const mr = p.mountainHeartTimer > 0 ? 54 : 42;
        this.particles.push({
          x: p.x + Math.cos(ma) * mr,
          y: p.y - 4 + Math.sin(ma) * mr,
          vx: -Math.sin(ma) * 45,
          vy: Math.cos(ma) * 45,
          size: 3,
          color: Math.random() < 0.6 ? '#38BDF8' : '#FB923C',
          life: 0.22,
          maxLife: 0.22,
          gravity: 0,
          fade: true,
          kind: 'MAGNETIC_ARC',
          rot: ma + Math.PI * 0.5,
          vRot: 0,
          len: 9,
          thick: 2,
          drag: 4,
        });
      }
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
              this.slashes.push({
                x: enemy.x,
                y: enemy.y,
                fromX: p.x,
                fromY: p.y - 6,
                angle: Math.atan2(enemy.y - p.y, enemy.x - p.x),
                radius: 0,
                arcSpread: 0,
                color: '#38BDF8',
                life: 0.2,
                maxLife: 0.2,
                flip: false,
                kind: 'GNOME_MAGNETIC_ARC',
              });
              zappedAny = true;
            }
          }
          if (zappedAny) {
            this.slashes.push({
              x: p.x,
              y: p.y,
              angle: 0,
              radius: 120,
              arcSpread: Math.PI * 2,
              color: '#38BDF8',
              life: 0.24,
              maxLife: 0.24,
              flip: false,
              kind: 'GNOME_MAGNETIC_PULSE',
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
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 112,
          arcSpread: Math.PI * 2,
          color: '#FB923C',
          life: 0.3,
          maxLife: 0.3,
          flip: false,
          kind: 'GNOME_CRATER_SLAM',
          scale: 0.9,
        });
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
        this.slashes.push({
          x: ax,
          y: ay,
          angle: p.ironFistAftershockAngle,
          radius: 96,
          arcSpread: Math.PI * 2,
          color: '#FDBA74',
          life: 0.32,
          maxLife: 0.32,
          flip: false,
          kind: 'GNOME_CRATER_SLAM',
          scale: 0.85,
        });
        this.shockwaves.push({
          x: ax,
          y: ay,
          maxRadius: 96,
          color: '#FDBA74',
          life: 0.28,
          maxLife: 0.28,
        });
        for (let r = 0; r < 10; r++) {
          if (this.particles.length > 240) break;
          const ra = (r / 10) * Math.PI * 2;
          const rspd = 95 + Math.random() * 85;
          this.particles.push({
            x: ax,
            y: ay,
            vx: Math.cos(ra) * rspd,
            vy: Math.sin(ra) * rspd,
            size: 4,
            color: r % 2 === 0 ? '#78716C' : '#FB923C',
            life: 0.32,
            maxLife: 0.32,
            gravity: 0,
            fade: true,
            kind: r % 2 === 0 ? 'STONE_CHUNK' : 'RUNE_SPARK',
            rot: ra,
            vRot: (Math.random() - 0.5) * 16,
            len: 7,
            thick: 4,
            drag: 4.5,
          });
        }
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

    // Ghost Passive 2: Restless Spirit surge timer + astral spark motes
    if (p.restlessTimer > 0) {
      p.restlessTimer = Math.max(0, p.restlessTimer - dt);
      if (Math.random() < 0.34 && this.particles.length < 235) {
        const ra = Math.random() * Math.PI * 2;
        this.particles.push({
          x: p.x + Math.cos(ra) * 20,
          y: p.y - 4 + Math.sin(ra) * 14,
          vx: Math.cos(ra) * 22,
          vy: -34 - Math.random() * 24,
          size: 3.6,
          color: Math.random() < 0.55 ? '#67E8F9' : '#D8B4FE',
          life: 0.32,
          maxLife: 0.32,
          gravity: 0,
          fade: true,
          kind: 'ECTO_SPARK',
          rot: ra,
          vRot: 5,
          drag: 3.0,
        });
      }
    }

    // Ghost Normal Skill: Soul Drain active multi-tendril siphon
    if (p.soulDrainTimer > 0) {
      p.soulDrainTimer = Math.max(0, p.soulDrainTimer - dt);
      p.soulDrainTick -= dt;
      if (p.soulDrainTick <= 0) {
        const siphonBless = this.activeBlessingIds.has('ghost_skill_soul_drain');
        p.soulDrainTick = siphonBless ? 0.36 : 0.42;
        const maxTargets = siphonBless ? 5 : 4;
        const drainRange = 180;
        const targets = [...this.world.enemies]
          .filter((e) => e && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= drainRange + e.radius)
          .sort(
            (a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)
          )
          .slice(0, maxTargets);

        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: Math.random() * Math.PI * 2,
          radius: drainRange,
          arcSpread: Math.PI * 2,
          color: '#C084FC',
          life: 0.28,
          maxLife: 0.28,
          flip: false,
          kind: 'GHOST_SOUL_DRAIN_PULSE',
        });

        let totalHealed = 0;
        const tickDmg = Math.round(13 * this.getPlagueOrSkillMultiplier());
        for (const target of targets) {
          this.tethers.push({
            fromX: target.x,
            fromY: target.y - 6,
            life: 0.34,
            maxLife: 0.34,
            color: '#67E8F9',
          });
          this.damageEnemy(target, tickDmg, false, p.x, p.y);
          this.applyGhostChillIfActive(target);
          totalHealed += siphonBless ? 4 : 3;
          if (this.particles.length < 238) {
            const ta = Math.atan2(p.y - target.y, p.x - target.x);
            this.particles.push({
              x: target.x,
              y: target.y - 6,
              vx: Math.cos(ta) * 185,
              vy: Math.sin(ta) * 185,
              size: 4.2,
              color: '#67E8F9',
              life: 0.26,
              maxLife: 0.26,
              gravity: 0,
              fade: true,
              kind: 'SOUL_WISP',
              drag: 2.0,
            });
          }
        }
        if (totalHealed > 0) {
          this.healPlayer(totalHealed);
        }
      }
    }

    // Ghost Ultimate: Eternal Nightmare realm of darkness + periodic terror waves
    if (p.nightmareTimer > 0) {
      p.nightmareTimer = Math.max(0, p.nightmareTimer - dt);
      p.nightmareFearTick -= dt;
      if (p.nightmareFearTick <= 0) {
        p.nightmareFearTick = 1.45;
        const ranks = this.getActiveUpgrades();
        const fearDur = 1.5 + ranks.pathD * 0.2;
        const pulseDmg = Math.round(12 * this.getPlagueOrSkillMultiplier());
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: Math.random() * Math.PI * 2,
          radius: 175,
          arcSpread: Math.PI * 2,
          color: '#A855F7',
          life: 0.32,
          maxLife: 0.32,
          flip: false,
          kind: 'GHOST_NIGHTMARE_NOVA',
          scale: 0.78,
        });
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 210 + enemy.radius) {
            this.damageEnemy(enemy, pulseDmg, false, p.x, p.y);
            this.applyEnemyFear(enemy, fearDur);
          }
        }
      }
    }

    // Ghost Normal Skill: Haunted Possession — ride inside host enemy & force it to cleave nearby foes!
    if (p.possessionTimer > 0) {
      p.possessionTimer = Math.max(0, p.possessionTimer - dt);
      const host =
        p.possessedEnemyId !== null
          ? this.world.enemies.find((e) => e.id === p.possessedEnemyId && e.hp > 0)
          : undefined;
      if (!host || p.possessionTimer <= 0) {
        const burstX = host ? host.x : p.x;
        const burstY = host ? host.y : p.y;
        if (host) {
          host.possessedTimer = 0;
        }
        p.possessionTimer = 0;
        p.possessedEnemyId = null;
        this.triggerPossessionExorcism(burstX, burstY);
      } else {
        p.x = host.x;
        p.y = host.y;
        p.invulnTimer = Math.max(p.invulnTimer, 0.22);
        p.possessionPulseTick -= dt;
        if (p.possessionPulseTick <= 0) {
          const puppeteer = this.activeBlessingIds.has('ghost_skill_haunted_possession');
          p.possessionPulseTick = puppeteer ? 0.36 : 0.48;
          soundEngine.playSlash(1);
          this.slashes.push({
            x: host.x,
            y: host.y,
            angle: Math.random() * Math.PI * 2,
            radius: 112,
            arcSpread: Math.PI * 2,
            color: '#C084FC',
            life: 0.26,
            maxLife: 0.26,
            flip: false,
            kind: 'GHOST_POSSESS_PULSE',
          });
          const cleaveDmg = Math.round(
            20 * (puppeteer ? 1.3 : 1.0) * this.getPlagueOrSkillMultiplier()
          );
          let hitNeighbor = false;
          for (const other of [...this.world.enemies]) {
            if (!other || other.hp <= 0 || other.id === host.id) continue;
            if (Math.hypot(other.x - host.x, other.y - host.y) <= 116 + other.radius) {
              this.damageEnemy(other, cleaveDmg, true, host.x, host.y, false, puppeteer);
              this.applyGhostChillIfActive(other);
              hitNeighbor = true;
            }
          }
          // Host also suffers internal spiritual disruption (full if isolated, half if cleaving allies)
          this.damageEnemy(
            host,
            hitNeighbor ? Math.round(cleaveDmg * 0.55) : cleaveDmg,
            false,
            host.x,
            host.y
          );
        }
        this.checkInteractables();
        return;
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
      (p.windrunnerTimer > 0 ? 1.45 : 1.0) *
      (p.reflexBurstTimer > 0 ? 1.24 : 1.0) *
      (p.restlessTimer > 0 ? 1.28 : 1.0) *
      (p.nightmareTimer > 0 ? 1.14 : 1.0);
    const effectiveMoveSpeed = p.speed * windSpeedMult;

    // Movement via Virtual Joystick or Dash/Leap Skill (Flesh Ripper / Skeletal Rush / Groundbreaker / Phantom Dash)
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      if (p.dashKind === 'GROUNDBREAKER_LEAP') {
        const totalDur = Math.max(0.05, p.leapTotalDuration);
        p.leapAirProgress = Math.max(0, Math.min(1, 1 - Math.max(0, p.dashTimer) / totalDur));
        const leapSpeed = 520;
        p.vx = Math.cos(p.dashAngle) * leapSpeed;
        p.vy = Math.sin(p.dashAngle) * leapSpeed;
        if (Math.random() < 0.65 && this.particles.length < 235) {
          this.particles.push({
            x: p.x + (Math.random() - 0.5) * 10,
            y: p.y + 4,
            vx: -Math.cos(p.dashAngle) * 65 + (Math.random() - 0.5) * 35,
            vy: -Math.sin(p.dashAngle) * 65 + (Math.random() - 0.5) * 35,
            size: 3.4,
            color: Math.random() < 0.5 ? '#FB923C' : '#FDE047',
            life: 0.26,
            maxLife: 0.26,
            gravity: 0,
            fade: true,
            kind: 'RUNE_SPARK',
            rot: p.dashAngle,
            vRot: 12,
            len: 6,
            drag: 4,
          });
        }
        if (p.dashTimer <= 0) {
          p.leapAirProgress = 0;
          this.triggerGroundbreakerCrash();
        }
      } else if (p.dashKind === 'PHANTOM_DASH') {
        const dashSpeed = 810;
        p.vx = Math.cos(p.dashAngle) * dashSpeed;
        p.vy = Math.sin(p.dashAngle) * dashSpeed;

        p.dashAfterimageAccum -= dt;
        if (p.dashAfterimageAccum <= 0) {
          p.dashAfterimageAccum = 0.036;
          this.afterimages.push({
            x: p.x,
            y: p.y,
            facingX: p.facingX,
            color: '#C084FC',
            life: 0.32,
            maxLife: 0.32,
            archetype: 'GHOST',
          });
        }

        // Drop lingering spectral mist wake along dash path
        p.ghostMistDropAccum -= dt;
        if (p.ghostMistDropAccum <= 0) {
          p.ghostMistDropAccum = 0.055;
          const wakeBless = this.activeBlessingIds.has('ghost_skill_phantom_dash');
          this.ghostMistZones.push({
            id: allocEntityId(),
            x: p.x,
            y: p.y,
            radius: wakeBless ? 54 : 46,
            life: wakeBless ? 2.7 : 2.2,
            maxLife: wakeBless ? 2.7 : 2.2,
            tickTimer: 0.12,
            damagePerTick: Math.round(10 * (wakeBless ? 1.18 : 1.0) * this.getPlagueOrSkillMultiplier()),
          });
        }

        if (this.particles.length < 238) {
          const perp = p.dashAngle + Math.PI * 0.5;
          const off = (Math.random() - 0.5) * 20;
          this.particles.push({
            x: p.x + Math.cos(perp) * off,
            y: p.y + Math.sin(perp) * off,
            vx: -Math.cos(p.dashAngle) * 120,
            vy: -Math.sin(p.dashAngle) * 120,
            size: 4,
            color: Math.random() < 0.5 ? '#67E8F9' : '#D8B4FE',
            life: 0.24,
            maxLife: 0.24,
            gravity: 0,
            fade: true,
            kind: 'ECTO_SPARK',
            rot: p.dashAngle,
            vRot: 8,
            drag: 4.5,
          });
        }

        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (!p.dashHitIds.has(enemy.id)) {
            const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
            if (dist <= p.radius + enemy.radius + 26) {
              p.dashHitIds.add(enemy.id);
              const wakeBless = this.activeBlessingIds.has('ghost_skill_phantom_dash');
              const roll = this.rollPhysicalAttack(
                28 * (wakeBless ? 1.15 : 1.0) * this.getPlagueOrSkillMultiplier(),
                0.22
              );
              this.damageEnemy(enemy, roll.damage, false, p.x, p.y, false, roll.isCrit);
              this.applyGhostChillIfActive(enemy);
              this.slashes.push({
                x: enemy.x,
                y: enemy.y,
                angle: p.dashAngle,
                radius: 36,
                arcSpread: 0,
                color: '#67E8F9',
                life: 0.22,
                maxLife: 0.22,
                flip: false,
                kind: 'GHOST_IMPACT_RING',
                isCrit: roll.isCrit,
              });
              this.triggerRestlessSpirit();
              if (wakeBless && !p.dashRefunded) {
                p.dashRefunded = true;
                p.normalCooldowns[p.dashSlotIndex] *= 0.82;
              }
            }
          }
        }
      } else {
        const isSkeletalRush = p.dashKind === 'SKELETAL_RUSH';
        const dashSpeed = isSkeletalRush ? 790 : 690;
        p.vx = Math.cos(p.dashAngle) * dashSpeed;
        p.vy = Math.sin(p.dashAngle) * dashSpeed;

        // 60fps time-stepped mirage afterimages + directional razor/claw streaks
        p.dashAfterimageAccum -= dt;
        if (p.dashAfterimageAccum <= 0) {
          p.dashAfterimageAccum = 0.038;
          this.afterimages.push({
            x: p.x,
            y: p.y,
            facingX: p.facingX,
            color: isSkeletalRush ? '#38BDF8' : '#34D399',
            life: 0.26,
            maxLife: 0.26,
            archetype: isSkeletalRush ? 'SKELETON' : 'ZOMBIE',
          });
        }
        if (this.particles.length < 238) {
          const perp = p.dashAngle + Math.PI * 0.5;
          const off = (Math.random() - 0.5) * 18;
          this.particles.push({
            x: p.x + Math.cos(perp) * off,
            y: p.y + Math.sin(perp) * off,
            vx: -Math.cos(p.dashAngle) * 130,
            vy: -Math.sin(p.dashAngle) * 130,
            size: 3,
            color: isSkeletalRush
              ? Math.random() < 0.5
                ? '#7DD3FC'
                : '#F8FAFC'
              : Math.random() < 0.5
              ? '#4ADE80'
              : '#BEF264',
            life: 0.2,
            maxLife: 0.2,
            gravity: 0,
            fade: true,
            kind: isSkeletalRush ? 'SLASH_STREAK' : 'VENOM_DROP',
            rot: p.dashAngle + Math.PI,
            len: isSkeletalRush ? 16 : 6.5,
            thick: isSkeletalRush ? 2.1 : 2.8,
            drag: 5.5,
          });
        }

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
                  phantomDash ? 0.55 : 0.3,
                  false
                );
                this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
                this.slashes.push({
                  x: enemy.x,
                  y: enemy.y,
                  angle: p.dashAngle,
                  radius: 32,
                  arcSpread: 0,
                  color: roll.isCrit ? '#FDE047' : '#38BDF8',
                  life: 0.2,
                  maxLife: 0.2,
                  flip: false,
                  kind: 'SKELETON_IMPACT_FLASH',
                  scale: 1.35,
                  isCrit: roll.isCrit,
                });
                for (let b = 0; b < 6; b++) {
                  if (this.particles.length > 240) break;
                  const ba = p.dashAngle + (Math.random() - 0.5) * 1.4;
                  const bs = 160 + Math.random() * 110;
                  this.particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(ba) * bs,
                    vy: Math.sin(ba) * bs,
                    size: 2.6,
                    color: b % 2 === 0 ? '#F8FAFC' : '#38BDF8',
                    life: 0.24,
                    maxLife: 0.24,
                    gravity: 0,
                    fade: true,
                    kind: 'BONE_SHARD',
                    rot: ba,
                    vRot: (Math.random() - 0.5) * 20,
                    len: 7,
                    thick: 2.5,
                    drag: 5.2,
                  });
                }
                if (phantomDash && !p.dashRefunded) {
                  p.dashRefunded = true;
                  p.normalCooldowns[p.dashSlotIndex] = Math.max(
                    0,
                    p.normalCooldowns[p.dashSlotIndex] - 0.8
                  );
                }
              } else {
                const goreLunge = this.activeBlessingIds.has('zombie_skill_flesh_ripper');
                const roll = this.rollPhysicalAttack(
                  34 * (goreLunge ? 1.15 : 1.0) * this.getPhysicalDamageMultiplier()
                );
                this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
                this.applyInfectiousTouch(enemy, 1);
                this.slashes.push({
                  x: enemy.x,
                  y: enemy.y,
                  angle: p.dashAngle,
                  radius: 54,
                  arcSpread: 1.65,
                  color: '#34D399',
                  life: 0.24,
                  maxLife: 0.24,
                  flip: false,
                  kind: 'ZOMBIE_SAVAGE_REND',
                  scale: p.abominationTimer > 0 ? 1.3 : 1.0,
                  isCrit: true,
                });
                this.slashes.push({
                  x: enemy.x,
                  y: enemy.y,
                  angle: p.dashAngle,
                  radius: 42,
                  arcSpread: 0,
                  color: '#A3E635',
                  life: 0.28,
                  maxLife: 0.28,
                  flip: false,
                  kind: 'ZOMBIE_POISON_BURST',
                  isCrit: goreLunge,
                });
                if (goreLunge) {
                  this.healPlayer(3);
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
      p.walkPhase += dt * (8 + 6 * clampedMag) * (p.windrunnerTimer > 0 || p.restlessTimer > 0 ? 1.35 : 1);
    } else {
      p.leapAirProgress = 0;
      p.vx *= Math.pow(0.001, dt);
      p.vy *= Math.pow(0.001, dt);
    }

    // Ghost Passive 1: Ethereal Body phases naturally through physical obstacles in the Dungeon!
    const phaseObstacles =
      !this.world.isGuild &&
      (p.characterId === CharacterId.Ghost || p.dashKind === 'PHANTOM_DASH' && p.dashTimer > 0);
    const nextPos = this.resolveWorldCollision(
      p.x + p.vx * dt,
      p.y + p.vy * dt,
      p.radius,
      phaseObstacles
    );
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
    const isGhost = profile.id === CharacterId.Ghost;
    const isTitan = p.abominationTimer > 0 || p.colossusTimer > 0 || p.mountainHeartTimer > 0;

    let cd = profile.baseAttackCooldown;
    if (isSkel) {
      cd /= (1 + ranks.pathE * 0.05) * (this.activeBlessingIds.has('skel_phantom_stride') ? 1.1 : 1);
    } else if (isGob) {
      cd /= 1 + ranks.pathB * 0.06;
    } else if (isGhost) {
      cd /= (1 + ranks.pathE * 0.05) * (p.restlessTimer > 0 ? 1.18 : 1.0);
    }
    if (isTitan) cd = Math.max(0.16, cd - 0.04);
    if (p.windrunnerTimer > 0) cd *= 0.76;
    p.basicAttackCooldown = Math.max(0.11, cd);

    const isZombie = profile.id === CharacterId.Zombie;
    const skelStep = isSkel ? p.skelComboStep : 0;
    const isSkelFinisher = isSkel && skelStep === 2;
    const zombStep = isZombie ? p.zombieComboStep : 0;
    const isZombieFinisher = isZombie && zombStep === 2;
    const gobStep = isGob ? p.goblinComboStep : 0;
    const isGobFinisher = isGob && gobStep === 2;
    const gnomeStep = isGnome ? p.gnomeComboStep : 0;
    const isGnomeFinisher = isGnome && gnomeStep === 2;
    const ghostStep = isGhost ? p.ghostComboStep : 0;
    const isGhostFinisher = isGhost && ghostStep === 2;

    if (isSkel) {
      p.skelComboStep = (skelStep + 1) % 3;
      p.comboFlip = skelStep % 2 === 1;
      p.skelLungeOffset = isSkelFinisher ? 11 : 6.5;
      p.squashX = isSkelFinisher ? 1.28 : 1.18;
      p.squashY = isSkelFinisher ? 0.78 : 0.85;
    } else if (isZombie) {
      p.zombieComboStep = (zombStep + 1) % 3;
      p.comboFlip = zombStep % 2 === 1;
      p.zombieLungeOffset = isZombieFinisher ? 10 : 6;
      p.squashX = isZombieFinisher ? 1.26 : 1.18;
      p.squashY = isZombieFinisher ? 0.78 : 0.84;
    } else if (isGob) {
      p.goblinComboStep = (gobStep + 1) % 3;
      p.comboFlip = gobStep % 2 === 1;
      p.goblinLungeOffset = isGobFinisher ? 11.5 : 7;
      p.squashX = isGobFinisher ? 1.26 : 1.18;
      p.squashY = isGobFinisher ? 0.78 : 0.85;
    } else if (isGnome) {
      p.gnomeComboStep = (gnomeStep + 1) % 3;
      p.comboFlip = gnomeStep % 2 === 1;
      p.gnomeLungeOffset = isGnomeFinisher ? 12 : 7.5;
      p.squashX = isGnomeFinisher ? 1.32 : 1.22;
      p.squashY = isGnomeFinisher ? 0.74 : 0.82;
    } else if (isGhost) {
      p.ghostComboStep = (ghostStep + 1) % 3;
      p.comboFlip = ghostStep % 2 === 1;
      p.ghostLungeOffset = isGhostFinisher ? 11.5 : 7;
      p.squashX = isGhostFinisher ? 1.26 : 1.16;
      p.squashY = isGhostFinisher ? 0.8 : 0.86;
    } else {
      p.comboFlip = !p.comboFlip;
      p.squashX = 1.18;
      p.squashY = 0.85;
    }

    const baseReach = isSkel
      ? (p.colossusTimer > 0 ? 96 : isSkelFinisher ? 80 : 68) * (1 + ranks.pathB * 0.04)
      : isGob
      ? isGobFinisher
        ? 68
        : 58
      : isGnome
      ? (p.mountainHeartTimer > 0
          ? isGnomeFinisher
            ? 104
            : 92
          : isGnomeFinisher
          ? 78
          : 66) *
        (1 + ranks.pathB * 0.05)
      : isGhost
      ? (isGhostFinisher ? 92 : 76) * (1 + ranks.pathB * 0.04)
      : p.abominationTimer > 0
      ? isZombieFinisher
        ? 94
        : 84
      : isZombieFinisher
      ? 72
      : 62;
    const reach = baseReach;
    const spread = isSkel
      ? isSkelFinisher
        ? 1.82
        : p.colossusTimer > 0
        ? 1.68
        : 1.48
      : isZombie
      ? isZombieFinisher
        ? 1.72
        : p.abominationTimer > 0
        ? 1.62
        : 1.42
      : isGob
      ? isGobFinisher
        ? 1.62
        : 1.32
      : isGnome
      ? isGnomeFinisher
        ? 1.74
        : p.mountainHeartTimer > 0
        ? 1.62
        : 1.44
      : isGhost
      ? isGhostFinisher
        ? 1.88
        : 1.54
      : isTitan
      ? 1.7
      : 1.35;

    const gobVenomActive = p.poisonBladesTimer > 0 || this.activeBlessingIds.has('gob_viper_toxin');

    soundEngine.playSlash(
      isSkel
        ? skelStep
        : isZombie
        ? zombStep
        : isGob
        ? gobStep
        : isGnome
        ? gnomeStep
        : isGhost
        ? ghostStep
        : p.comboFlip
        ? 1
        : 0
    );
    const originX = p.x + Math.cos(p.aimAngle) * 16;
    const originY = p.y + Math.sin(p.aimAngle) * 16;
    const slashDuration = isGob
      ? isGobFinisher
        ? 0.165
        : 0.125
      : isGnome
      ? isGnomeFinisher
        ? 0.25
        : 0.185
      : isGhost
      ? isGhostFinisher
        ? 0.24
        : 0.175
      : isZombie
      ? isZombieFinisher
        ? 0.23
        : 0.18
      : isSkel
      ? isSkelFinisher
        ? 0.19
        : 0.145
      : 0.14;

    const createdSlash: SlashEffect = {
      x: originX,
      y: originY,
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
        ? p.mountainHeartTimer > 0 || isGnomeFinisher
          ? '#FDBA74'
          : '#FB923C'
        : isGhost
        ? p.restlessTimer > 0 || isGhostFinisher
          ? '#67E8F9'
          : '#C084FC'
        : p.abominationTimer > 0 || isZombieFinisher
        ? '#A3E635'
        : '#4ADE80',
      life: slashDuration,
      maxLife: slashDuration,
      flip: p.comboFlip,
      kind: isZombie
        ? isZombieFinisher
          ? 'ZOMBIE_SAVAGE_REND'
          : 'ZOMBIE_BASIC_ATTACK'
        : isSkel
        ? isSkelFinisher
          ? 'SKELETON_TWIN_CLEAVE'
          : 'SKELETON_BASIC_ATTACK'
        : isGob
        ? isGobFinisher
          ? 'GOBLIN_TWIN_CROSS'
          : 'GOBLIN_BASIC_ATTACK'
        : isGnome
        ? isGnomeFinisher
          ? 'GNOME_SEISMIC_SLAM'
          : 'GNOME_BASIC_ATTACK'
        : isGhost
        ? isGhostFinisher
          ? 'GHOST_VORTEX_REND'
          : 'GHOST_BASIC_ARC'
        : 'DEFAULT',
      scale:
        isZombie && p.abominationTimer > 0
          ? 1.38
          : isSkel && p.colossusTimer > 0
          ? 1.32
          : isGob && p.stolenMightTimer > 0
          ? 1.14
          : isGnome && p.mountainHeartTimer > 0
          ? 1.34
          : isGhost && p.restlessTimer > 0
          ? 1.18
          : 1.0,
      isCrit:
        isSkelFinisher ||
        isZombieFinisher ||
        isGobFinisher ||
        isGnomeFinisher ||
        isGhostFinisher,
    };
    this.slashes.push(createdSlash);

    // Ghost Basic Attack: 60fps swirling ectoplasm sparks & astral wisp trails
    if (isGhost) {
      const moteCount = isGhostFinisher ? 11 : 7;
      for (let i = 0; i < moteCount; i++) {
        if (this.particles.length > 240) break;
        const t = (i / Math.max(1, moteCount - 1) - 0.5) * spread;
        const dir = p.aimAngle + (p.comboFlip ? -t : t);
        const r = reach * (0.7 + Math.random() * 0.3);
        const sx = originX + Math.cos(dir) * r;
        const sy = originY + Math.sin(dir) * r;
        const tangent = dir + (p.comboFlip ? -Math.PI * 0.36 : Math.PI * 0.36);
        const spd = (isGhostFinisher ? 190 : 140) + Math.random() * 100;
        const life = 0.22 + Math.random() * 0.14;
        const isStar = i % 2 === 0;
        this.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(tangent) * spd,
          vy: Math.sin(tangent) * spd,
          size: isStar ? 4.0 : 3.2,
          color: isStar ? '#67E8F9' : '#D8B4FE',
          life,
          maxLife: life,
          gravity: 0,
          fade: true,
          kind: isStar ? 'ECTO_SPARK' : 'SOUL_WISP',
          rot: tangent,
          vRot: 9,
          drag: 4.8,
        });
      }
      // Every 3rd basic strike (Abyssal Vortex Rend) fires a homing/piercing Spirit Orb wisp!
      if (isGhostFinisher) {
        const orbSpd = 460;
        this.projectiles.push({
          id: allocEntityId(),
          fromPlayer: true,
          x: p.x + Math.cos(p.aimAngle) * 20,
          y: p.y + Math.sin(p.aimAngle) * 20,
          vx: Math.cos(p.aimAngle) * orbSpd,
          vy: Math.sin(p.aimAngle) * orbSpd,
          radius: 10,
          damage: 18 * this.getPhysicalDamageMultiplier(),
          life: 1.15,
          color: '#67E8F9',
          kind: 'PLAYER_SPIRIT_ORB',
          angle: p.aimAngle,
          pierce: true,
          homing: true,
          hitEnemyIds: new Set<number>(),
        });
      }
      // Ghost Statue Blessing: Ectoplasmic Wisps — fires extra homing spirit orb every 2nd strike!
      if (this.activeBlessingIds.has('ghost_ectoplasm_wisp')) {
        p.ghostBasicCount++;
        if (p.ghostBasicCount >= 2) {
          p.ghostBasicCount = 0;
          const offAng = p.aimAngle + (p.comboFlip ? -0.22 : 0.22);
          this.projectiles.push({
            id: allocEntityId(),
            fromPlayer: true,
            x: p.x + Math.cos(offAng) * 18,
            y: p.y + Math.sin(offAng) * 18,
            vx: Math.cos(offAng) * 430,
            vy: Math.sin(offAng) * 430,
            radius: 9,
            damage: 14 * this.getPhysicalDamageMultiplier(),
            life: 1.25,
            color: '#C084FC',
            kind: 'PLAYER_SPIRIT_ORB',
            angle: offAng,
            pierce: false,
            homing: true,
            hitEnemyIds: new Set<number>(),
          });
        }
      }
    }

    // Skeleton Basic Attack: tangential velocity streaks & flying ivory bone splinters
    if (isSkel) {
      if (isSkelFinisher) {
        soundEngine.playBoneBreak();
        this.shakeMag = Math.max(this.shakeMag, 3.8);
      }
      const shardCount = isSkelFinisher ? 14 : 7;
      for (let i = 0; i < shardCount; i++) {
        if (this.particles.length > 240) break;
        const t = (i / Math.max(1, shardCount - 1) - 0.5) * spread;
        // In finisher, alternate scissor arm angles
        const scissorArm = isSkelFinisher ? (i % 2 === 0 ? -1 : 1) : (p.comboFlip ? -1 : 1);
        const dir = p.aimAngle + scissorArm * t;
        const r = reach * (0.72 + Math.random() * 0.3);
        const sx = originX + Math.cos(dir) * r;
        const sy = originY + Math.sin(dir) * r;
        const tangent = dir + scissorArm * Math.PI * 0.38;
        const spd = (isSkelFinisher ? 225 : 155) + Math.random() * 120;
        const isBonePiece = i % 2 === 0;
        const life = 0.22 + Math.random() * 0.14;
        this.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(tangent) * spd,
          vy: Math.sin(tangent) * spd,
          size: 2.6,
          color: isBonePiece ? '#F8FAFC' : isSkelFinisher ? '#FDE047' : '#38BDF8',
          life,
          maxLife: life,
          gravity: 0,
          fade: true,
          kind: isBonePiece ? 'BONE_SHARD' : 'SLASH_STREAK',
          rot: tangent,
          vRot: (Math.random() - 0.5) * 18,
          len: isBonePiece ? 6.5 + Math.random() * 4.5 : 13 + Math.random() * 9,
          thick: isBonePiece ? 2.5 : 1.8,
          drag: 5.5,
        });
      }
    }

    // Goblin Basic Attack: 60fps twin-dagger razor streaks & venom/amber sparks
    if (isGob) {
      const sparkCount = isGobFinisher ? 10 : 6;
      for (let i = 0; i < sparkCount; i++) {
        if (this.particles.length > 240) break;
        const t = (i / Math.max(1, sparkCount - 1) - 0.5) * spread;
        const dir = p.aimAngle + (p.comboFlip ? -t : t);
        const r = reach * (0.72 + Math.random() * 0.28);
        const sx = originX + Math.cos(dir) * r;
        const sy = originY + Math.sin(dir) * r;
        const tangent = dir + (p.comboFlip ? -Math.PI * 0.4 : Math.PI * 0.4);
        const spd = (isGobFinisher ? 220 : 165) + Math.random() * 110;
        const useVenomDrop = gobVenomActive && i % 2 === 1;
        const life = 0.17 + Math.random() * 0.11;
        this.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(tangent) * spd,
          vy: Math.sin(tangent) * spd,
          size: 2.6,
          color: useVenomDrop
            ? '#A3E635'
            : gobVenomActive
            ? '#BEF264'
            : i % 2 === 0
            ? '#FDE047'
            : '#FB923C',
          life,
          maxLife: life,
          gravity: 0,
          fade: true,
          kind: useVenomDrop ? 'VENOM_DROP' : 'SLASH_STREAK',
          rot: tangent,
          vRot: 0,
          len: useVenomDrop ? 5.8 : 13 + Math.random() * 8,
          thick: useVenomDrop ? 2.3 : 1.9,
          drag: 6.2,
        });
      }
    }

    // Zombie Basic Attack: 60fps flung virulent slime droplets & billowing plague spore puffs
    if (isZombie) {
      const abomMult = p.abominationTimer > 0 ? 1.28 : 1.0;
      const dropCount = isZombieFinisher ? 11 : 7;
      for (let i = 0; i < dropCount; i++) {
        if (this.particles.length > 240) break;
        const t = (i / Math.max(1, dropCount - 1) - 0.5) * spread;
        const dir = p.aimAngle + (p.comboFlip ? -t : t);
        const r = reach * (0.65 + Math.random() * 0.35);
        const sx = originX + Math.cos(dir) * r;
        const sy = originY + Math.sin(dir) * r;
        const isSpore = i % 3 === 1;
        const tangent = dir + (p.comboFlip ? -Math.PI * 0.34 : Math.PI * 0.34);
        const spd = isSpore ? 38 + Math.random() * 35 : (isZombieFinisher ? 175 : 130) + Math.random() * 95;
        const life = isSpore ? 0.36 + Math.random() * 0.18 : 0.24 + Math.random() * 0.14;
        this.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(tangent) * spd,
          vy: Math.sin(tangent) * spd - (isSpore ? 14 : 0),
          size: (isSpore ? 6.5 + Math.random() * 4 : 3.2 + Math.random() * 1.8) * abomMult,
          color: isSpore
            ? isZombieFinisher
              ? '#A3E635'
              : '#4ADE80'
            : i % 2 === 0
            ? '#BEF264'
            : '#4ADE80',
          life,
          maxLife: life,
          gravity: 0,
          fade: true,
          kind: isSpore ? 'SPORE_PUFF' : 'VENOM_DROP',
          rot: tangent,
          vRot: 0,
          len: (6.5 + Math.random() * 4) * abomMult,
          thick: (2.8 + Math.random() * 1.2) * abomMult,
          drag: isSpore ? 3.2 : 4.8,
        });
      }
    }

    // Gnome Basic Attack: 60fps flying granite chunks & bronze rune sparks
    if (isGnome) {
      const mtnMult = p.mountainHeartTimer > 0 ? 1.25 : 1.0;
      const chunkCount = isGnomeFinisher ? 11 : 7;
      for (let i = 0; i < chunkCount; i++) {
        if (this.particles.length > 240) break;
        const t = (i / Math.max(1, chunkCount - 1) - 0.5) * spread;
        const dir = p.aimAngle + (p.comboFlip ? -t : t);
        const r = reach * (0.68 + Math.random() * 0.3);
        const sx = originX + Math.cos(dir) * r;
        const sy = originY + Math.sin(dir) * r;
        const isStone = i % 2 === 0;
        const outAng = dir + (Math.random() - 0.5) * 0.45;
        const spd = (isGnomeFinisher ? 185 : 135) + Math.random() * 95;
        const life = isStone ? 0.28 + Math.random() * 0.14 : 0.22 + Math.random() * 0.12;
        this.particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(outAng) * spd,
          vy: Math.sin(outAng) * spd,
          size: (isStone ? 4.2 : 3.0) * mtnMult,
          color: isStone
            ? i % 4 === 0
              ? '#A8A29E'
              : '#78716C'
            : isGnomeFinisher
            ? '#FDE047'
            : '#FB923C',
          life,
          maxLife: life,
          gravity: 0,
          fade: true,
          kind: isStone ? 'STONE_CHUNK' : 'RUNE_SPARK',
          rot: outAng,
          vRot: (Math.random() - 0.5) * 18,
          len: (isStone ? 6.8 : 8) * mtnMult,
          thick: (isStone ? 4.2 : 2.2) * mtnMult,
          drag: 5.0,
        });
      }
      if (isGnomeFinisher) {
        this.shakeMag = Math.max(this.shakeMag, 4.5);
      }
    }

    const rawDmg =
      profile.baseAttackDamage *
      (isSkelFinisher
        ? 1.55
        : isGnomeFinisher || isGhostFinisher
        ? 1.24
        : isZombieFinisher || isGobFinisher
        ? 1.2
        : 1.0) *
      this.getPhysicalDamageMultiplier();
    this.hitEnemiesInArc(
      p.x,
      p.y,
      p.aimAngle,
      reach,
      spread * 0.65,
      rawDmg,
      isGnome || isSkelFinisher || isZombieFinisher || isGobFinisher || isGhostFinisher,
      isSkelFinisher ? 0.35 : isGobFinisher || isGhostFinisher ? 0.22 : isGnomeFinisher ? 0.18 : 0,
      isZombie,
      isSkel || isGob || isGnome || isGhost ? createdSlash : undefined,
      isZombieFinisher
    );
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
        const puffRadius = Math.round(58 * (1 + ranks.pathC * 0.06));
        this.poisonClouds.push({
          id: allocEntityId(),
          x: puffX,
          y: puffY,
          radius: puffRadius,
          life: 1.8,
          maxLife: 1.8,
          tickTimer: 0.18,
          damagePerTick: Math.round(6 * this.getPlagueOrSkillMultiplier()),
        });
        this.spawnBurst(puffX, puffY, '#A3E635', 6, 60);
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
        this.player.squashX = 1.28;
        this.player.squashY = 0.76;
        this.shakeMag = Math.max(this.shakeMag, 6.5);
        const radius = Math.round(128 * (1 + ranks.pathC * 0.08) * (miasma ? 1.18 : 1.0));
        const duration = miasma ? 5.5 : 4.5;
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
        this.slashes.push({
          x: this.player.x,
          y: this.player.y,
          angle: Math.random() * Math.PI,
          radius,
          arcSpread: Math.PI * 2,
          color: '#A3E635',
          life: 0.42,
          maxLife: 0.42,
          flip: false,
          kind: 'ZOMBIE_PLAGUE_NOVA',
          isCrit: miasma,
        });
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: radius,
          color: '#A3E635',
          life: 0.28,
          maxLife: 0.28,
        });
        for (let i = 0; i < 16; i++) {
          if (this.particles.length > 240) break;
          const pa = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
          const isSpore = i % 2 === 0;
          const pspd = (isSpore ? 95 : 145) + Math.random() * 75;
          this.particles.push({
            x: this.player.x + Math.cos(pa) * 14,
            y: this.player.y + Math.sin(pa) * 14,
            vx: Math.cos(pa) * pspd,
            vy: Math.sin(pa) * pspd - (isSpore ? 14 : 0),
            size: isSpore ? 8.5 + Math.random() * 4 : 3.4,
            color: isSpore ? '#4ADE80' : '#BEF264',
            life: isSpore ? 0.44 : 0.3,
            maxLife: isSpore ? 0.44 : 0.3,
            gravity: 0,
            fade: true,
            kind: isSpore ? 'SPORE_PUFF' : 'VENOM_DROP',
            rot: pa,
            len: 7,
            thick: 3,
            drag: isSpore ? 3.2 : 4.6,
          });
        }
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
        this.player.dashOriginX = this.player.x;
        this.player.dashOriginY = this.player.y;
        this.player.dashAfterimageAccum = 0;
        this.player.aimAngle = lungeAngle;
        this.player.facingX = Math.cos(lungeAngle) >= 0 ? 1 : -1;
        this.player.dashHitIds.clear();
        this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.26);
        this.slashes.push({
          x: this.player.x + Math.cos(lungeAngle) * 142,
          y: this.player.y + Math.sin(lungeAngle) * 142,
          fromX: this.player.x,
          fromY: this.player.y,
          angle: lungeAngle,
          radius: 142,
          arcSpread: 1.25,
          color: '#34D399',
          life: 0.28,
          maxLife: 0.28,
          flip: false,
          kind: 'ZOMBIE_FLESH_RIPPER_WAKE',
          scale: this.player.abominationTimer > 0 ? 1.35 : 1.0,
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
        this.player.undyingTimer = spined ? 6.2 : 5.0;
        this.player.undyingHealTick = 0.15;
        this.player.squashX = 1.2;
        this.player.squashY = 0.82;
        this.slashes.push({
          x: this.player.x,
          y: this.player.y,
          angle: 0,
          radius: 78,
          arcSpread: Math.PI * 2,
          color: '#2DD4BF',
          life: 0.38,
          maxLife: 0.38,
          flip: false,
          kind: 'ZOMBIE_UNDYING_PULSE',
          scale: this.player.abominationTimer > 0 ? 1.35 : 1.0,
        });
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: 72,
          color: '#2DD4BF',
          life: 0.3,
          maxLife: 0.3,
        });
        for (let c = 0; c < 10; c++) {
          if (this.particles.length > 240) break;
          const ca = (c / 10) * Math.PI * 2;
          this.particles.push({
            x: this.player.x + Math.cos(ca) * 18,
            y: this.player.y + Math.sin(ca) * 14,
            vx: Math.cos(ca) * 55,
            vy: Math.sin(ca) * 40 - 34,
            size: 5,
            color: c % 2 === 0 ? '#2DD4BF' : '#86EFAC',
            life: 0.45,
            maxLife: 0.45,
            gravity: 0,
            fade: true,
            kind: 'NECRO_CROSS',
            drag: 2.8,
          });
        }
        this.spawnPopup(this.player.x, this.player.y - 26, 'UNDYING FLESH', '#5EEAD4', 0.95);
        break;
      }
      case NormalSkillId.GraveCall: {
        soundEngine.playSummon();
        const ranks = this.getActiveUpgrades();
        const extra = this.activeBlessingIds.has('zombie_skill_grave_call') ? 1 : 0;
        const count = 2 + extra;
        const life = 15 + ranks.pathD * 1.5;
        this.player.squashX = 1.22;
        this.player.squashY = 0.8;
        this.slashes.push({
          x: this.player.x,
          y: this.player.y,
          angle: 0,
          radius: 66,
          arcSpread: Math.PI * 2,
          color: '#86EFAC',
          life: 0.36,
          maxLife: 0.36,
          flip: false,
          kind: 'ZOMBIE_GRAVE_ERUPTION',
        });
        for (let i = 0; i < count; i++) {
          const ang = this.player.aimAngle + (i - (count - 1) / 2) * 0.85;
          const sx = this.player.x + Math.cos(ang) * 44;
          const sy = this.player.y + Math.sin(ang) * 44;
          this.spawnMinion(sx, sy, life, extra > 0, 'ZOMBIE_SHAMBLER');
        }
        this.spawnPopup(this.player.x, this.player.y - 26, 'GRAVE CALL!', '#86EFAC', 0.95);
        break;
      }

      // === SKELETON NORMAL SKILLS ===
      case NormalSkillId.BoneSlash: {
        soundEngine.playSlash(1);
        const ranks = this.getActiveUpgrades();
        const crescent = this.activeBlessingIds.has('skel_skill_bone_slash');
        this.player.squashX = 1.28;
        this.player.squashY = 0.78;
        this.player.skelLungeOffset = 10.5;
        const reach =
          (this.player.colossusTimer > 0 ? 124 : 98) * (1 + ranks.pathB * 0.04);
        const angle = this.player.aimAngle;
        const ox = this.player.x + Math.cos(angle) * 18;
        const oy = this.player.y + Math.sin(angle) * 18;

        const boneSlashFx: SlashEffect = {
          x: ox,
          y: oy,
          angle,
          radius: reach,
          arcSpread: 1.95,
          color: '#38BDF8',
          life: 0.22,
          maxLife: 0.22,
          flip: false,
          kind: 'SKELETON_BONE_SLASH',
          scale: this.player.colossusTimer > 0 ? 1.32 : 1.08,
          isCrit: crescent,
        };
        this.slashes.push(boneSlashFx);

        for (let i = 0; i < 12; i++) {
          if (this.particles.length > 240) break;
          const t = (i / 11 - 0.5) * 1.9;
          const dir = angle + t;
          const r = reach * (0.72 + Math.random() * 0.28);
          const tangent = dir + Math.PI * 0.36;
          const spd = 195 + Math.random() * 130;
          const isBone = i % 2 === 0;
          this.particles.push({
            x: ox + Math.cos(dir) * r,
            y: oy + Math.sin(dir) * r,
            vx: Math.cos(tangent) * spd,
            vy: Math.sin(tangent) * spd,
            size: 2.8,
            color: isBone ? '#F8FAFC' : '#38BDF8',
            life: 0.24,
            maxLife: 0.24,
            gravity: 0,
            fade: true,
            kind: isBone ? 'BONE_SHARD' : 'SLASH_STREAK',
            rot: tangent,
            vRot: isBone ? (Math.random() - 0.5) * 20 : 0,
            len: isBone ? 8 : 17,
            thick: isBone ? 2.8 : 2.1,
            drag: 5.2,
          });
        }

        const rawDmg = 30 * (crescent ? 1.14 : 1.0) * this.getPhysicalDamageMultiplier();
        this.hitEnemiesInArc(
          this.player.x,
          this.player.y,
          angle,
          reach,
          1.0,
          rawDmg,
          true,
          0.35,
          false,
          boneSlashFx
        );
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
        this.player.squashX = 1.24;
        this.player.squashY = 0.8;
        this.player.skelLungeOffset = 7.5;
        const baseAngle = this.player.aimAngle;
        const speed = 640;
        const rawSpearDmg = 32 * this.getPhysicalDamageMultiplier() * (1 + ranks.pathB * 0.06);
        const twinVolley = this.activeBlessingIds.has('skel_skill_bone_spear');
        const angles = twinVolley ? [baseAngle - 0.075, baseAngle + 0.075] : [baseAngle];

        this.slashes.push({
          x: this.player.x + Math.cos(baseAngle) * 20,
          y: this.player.y + Math.sin(baseAngle) * 20,
          angle: baseAngle,
          radius: 56,
          arcSpread: 0.9,
          color: '#7DD3FC',
          life: 0.22,
          maxLife: 0.22,
          flip: false,
          kind: 'SKELETON_SPEAR_LAUNCH',
          scale: twinVolley ? 1.22 : 1.0,
        });

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
        for (let s = 0; s < (twinVolley ? 12 : 8); s++) {
          if (this.particles.length > 240) break;
          const sa = baseAngle + (Math.random() - 0.5) * 0.9;
          const sspd = 150 + Math.random() * 120;
          const isBone = s % 2 === 0;
          this.particles.push({
            x: this.player.x + Math.cos(baseAngle) * 20,
            y: this.player.y + Math.sin(baseAngle) * 20,
            vx: Math.cos(sa) * sspd,
            vy: Math.sin(sa) * sspd,
            size: 2.6,
            color: isBone ? '#F8FAFC' : '#7DD3FC',
            life: 0.22,
            maxLife: 0.22,
            gravity: 0,
            fade: true,
            kind: isBone ? 'BONE_SHARD' : 'SLASH_STREAK',
            rot: sa,
            vRot: isBone ? 16 : 0,
            len: isBone ? 6.5 : 15,
            thick: 2.2,
            drag: 5.5,
          });
        }
        break;
      }

      case NormalSkillId.RibcageShield: {
        soundEngine.playHeal();
        const ranks = this.getActiveUpgrades();
        const extraCharges =
          (ranks.pathD >= 6 ? 2 : ranks.pathD >= 3 ? 1 : 0) +
          (this.activeBlessingIds.has('skel_skill_ribcage_shield') ? 1 : 0);
        this.player.ribcageTimer = 6.5;
        this.player.ribcageCharges = 3 + extraCharges;
        this.player.squashX = 1.18;
        this.player.squashY = 0.84;
        this.slashes.push({
          x: this.player.x,
          y: this.player.y,
          angle: 0,
          radius: 74,
          arcSpread: Math.PI * 2,
          color: '#E2E8F0',
          life: 0.36,
          maxLife: 0.36,
          flip: false,
          kind: 'SKELETON_RIBCAGE_BURST',
          scale: this.player.colossusTimer > 0 ? 1.35 : 1.0,
        });
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: 70,
          color: '#E2E8F0',
          life: 0.28,
          maxLife: 0.28,
        });
        for (let r = 0; r < 10; r++) {
          if (this.particles.length > 240) break;
          const ra = (r / 10) * Math.PI * 2;
          this.particles.push({
            x: this.player.x + Math.cos(ra) * 18,
            y: this.player.y + Math.sin(ra) * 18,
            vx: Math.cos(ra) * 95,
            vy: Math.sin(ra) * 95,
            size: 3,
            color: r % 2 === 0 ? '#F8FAFC' : '#38BDF8',
            life: 0.28,
            maxLife: 0.28,
            gravity: 0,
            fade: true,
            kind: 'BONE_SHARD',
            rot: ra + Math.PI * 0.5,
            vRot: 12,
            len: 7,
            thick: 2.5,
            drag: 4.8,
          });
        }
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
        this.player.dashOriginX = this.player.x;
        this.player.dashOriginY = this.player.y;
        this.player.dashAfterimageAccum = 0;
        this.player.aimAngle = rushAngle;
        this.player.facingX = Math.cos(rushAngle) >= 0 ? 1 : -1;
        this.player.dashHitIds.clear();
        this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.26);
        this.slashes.push({
          x: this.player.x + Math.cos(rushAngle) * 150,
          y: this.player.y + Math.sin(rushAngle) * 150,
          fromX: this.player.x,
          fromY: this.player.y,
          angle: rushAngle,
          radius: 150,
          arcSpread: 1.25,
          color: '#60A5FA',
          life: 0.26,
          maxLife: 0.26,
          flip: false,
          kind: 'SKELETON_RUSH_WAKE',
          scale: this.player.colossusTimer > 0 ? 1.35 : 1.0,
        });
        break;
      }

      case NormalSkillId.BoneStorm: {
        soundEngine.playSummon();
        const maelstrom = this.activeBlessingIds.has('skel_skill_bone_storm');
        const stormR = maelstrom ? 92 : 82;
        this.player.boneStormTimer = maelstrom ? 7.0 : 5.5;
        this.player.boneStormTick = 0.05;
        this.player.squashX = 1.22;
        this.player.squashY = 0.8;
        this.slashes.push({
          x: this.player.x,
          y: this.player.y,
          angle: 0,
          radius: stormR,
          arcSpread: Math.PI * 2,
          color: '#A5B4FC',
          life: 0.38,
          maxLife: 0.38,
          flip: false,
          kind: 'SKELETON_BONE_STORM_BURST',
        });
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: stormR,
          color: '#A5B4FC',
          life: 0.3,
          maxLife: 0.3,
        });
        for (let b = 0; b < 14; b++) {
          if (this.particles.length > 240) break;
          const ba = (b / 14) * Math.PI * 2;
          const tangent = ba + Math.PI * 0.42;
          this.particles.push({
            x: this.player.x + Math.cos(ba) * 20,
            y: this.player.y + Math.sin(ba) * 20,
            vx: Math.cos(tangent) * 145,
            vy: Math.sin(tangent) * 145,
            size: 3,
            color: b % 2 === 0 ? '#F8FAFC' : '#A5B4FC',
            life: 0.32,
            maxLife: 0.32,
            gravity: 0,
            fade: true,
            kind: b % 2 === 0 ? 'BONE_SHARD' : 'SLASH_STREAK',
            rot: tangent,
            vRot: 18,
            len: b % 2 === 0 ? 7.5 : 15,
            thick: 2.4,
            drag: 4.5,
          });
        }
        this.spawnPopup(this.player.x, this.player.y - 26, 'BONE STORM', '#A5B4FC', 0.95);
        break;
      }

      // === GOBLIN NORMAL SKILLS ===
      case NormalSkillId.DaggerFlurry: {
        const hits = this.activeBlessingIds.has('gob_skill_dagger_flurry') ? 6 : 5;
        this.player.flurryTotal = hits;
        this.player.flurryRemaining = hits;
        this.player.flurryTimer = 0;
        break;
      }

      case NormalSkillId.Shadowstep: {
        soundEngine.playDash();
        const p = this.player;
        const umbral = this.activeBlessingIds.has('gob_skill_shadowstep');
        const venomGlow = p.poisonBladesTimer > 0 || this.activeBlessingIds.has('gob_viper_toxin');
        const startX = p.x;
        const startY = p.y;

        this.afterimages.push({
          x: startX,
          y: startY,
          facingX: p.facingX,
          color: '#F59E0B',
          life: 0.42,
          maxLife: 0.42,
        });

        // Vanishing shadow-smoke implosion puffs at origin
        for (let s = 0; s < 8; s++) {
          if (this.particles.length > 240) break;
          const a = (s / 8) * Math.PI * 2;
          const spd = 45 + Math.random() * 45;
          this.particles.push({
            x: startX + Math.cos(a) * 8,
            y: startY + Math.sin(a) * 8,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd - 10,
            size: 8.5 + Math.random() * 4,
            color: s % 2 === 0 ? '#F59E0B' : '#312E81',
            life: 0.32,
            maxLife: 0.32,
            gravity: 0,
            fade: true,
            kind: 'SHADOW_PUFF',
            drag: 3.8,
          });
        }

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
          p.squashX = 1.28;
          p.squashY = 0.76;
          p.goblinLungeOffset = 10;

          // 60fps Shadow-Blink lightning ribbon from origin to ambush spot
          this.slashes.push({
            x: p.x,
            y: p.y,
            fromX: startX,
            fromY: startY,
            angle: p.aimAngle,
            radius: 0,
            arcSpread: 0,
            color: venomGlow ? '#A3E635' : '#FBBF24',
            life: 0.22,
            maxLife: 0.22,
            flip: false,
            kind: 'GOBLIN_SHADOW_TRACE',
          });

          soundEngine.playSlash(2);
          this.slashes.push({
            x: target.x,
            y: target.y,
            angle: p.aimAngle,
            radius: 56,
            arcSpread: 1.75,
            color: venomGlow ? '#A3E635' : '#FDE047',
            life: 0.22,
            maxLife: 0.22,
            flip: false,
            kind: 'GOBLIN_BACKSTAB_X',
            isCrit: true,
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
            p.normalCooldowns[slotIndex] = Math.max(0, p.normalCooldowns[slotIndex] - 1.0);
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
          p.goblinLungeOffset = 9;

          this.slashes.push({
            x: p.x,
            y: p.y,
            fromX: startX,
            fromY: startY,
            angle: blinkAngle,
            radius: 0,
            arcSpread: 0,
            color: venomGlow ? '#A3E635' : '#FBBF24',
            life: 0.2,
            maxLife: 0.2,
            flip: false,
            kind: 'GOBLIN_SHADOW_TRACE',
          });
          this.slashes.push({
            x: p.x + Math.cos(blinkAngle) * 18,
            y: p.y + Math.sin(blinkAngle) * 18,
            angle: blinkAngle,
            radius: 66,
            arcSpread: 1.55,
            color: venomGlow ? '#A3E635' : '#FBBF24',
            life: 0.16,
            maxLife: 0.16,
            flip: false,
            kind: 'GOBLIN_TWIN_CROSS',
            isCrit: true,
          });
        }
        for (let s = 0; s < 6; s++) {
          if (this.particles.length > 240) break;
          const a = (s / 6) * Math.PI * 2;
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * 65,
            vy: Math.sin(a) * 65,
            size: 7.5,
            color: '#FDE047',
            life: 0.26,
            maxLife: 0.26,
            gravity: 0,
            fade: true,
            kind: 'SHADOW_PUFF',
            drag: 4.2,
          });
        }
        break;
      }

      case NormalSkillId.ExplosiveTrap: {
        soundEngine.playPickup();
        const ranks = this.getActiveUpgrades();
        const kegBless = this.activeBlessingIds.has('gob_skill_explosive_trap') ? 1.20 : 1.0;
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
          ? 6.2
          : 5.0;
        this.player.squashX = 1.2;
        this.player.squashY = 0.82;
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          maxRadius: 78,
          color: '#FDE047',
          life: 0.28,
          maxLife: 0.28,
        });
        for (let w = 0; w < 8; w++) {
          if (this.particles.length > 240) break;
          const wa = (w / 8) * Math.PI * 2;
          const wspd = 125 + Math.random() * 50;
          this.particles.push({
            x: this.player.x + Math.cos(wa) * 10,
            y: this.player.y + Math.sin(wa) * 10,
            vx: Math.cos(wa) * wspd,
            vy: Math.sin(wa) * wspd,
            size: 9,
            color: w % 2 === 0 ? '#FDE047' : '#34D399',
            life: 0.28,
            maxLife: 0.28,
            gravity: 0,
            fade: true,
            kind: 'WIND_CHEVRON',
            rot: wa + Math.PI,
            vRot: 0,
            len: 9.5,
            thick: 2.2,
            drag: 4.2,
          });
        }
        this.spawnPopup(this.player.x, this.player.y - 26, 'WINDRUNNER!', '#FDE047', 0.98);
        break;
      }

      case NormalSkillId.PoisonedBlades: {
        soundEngine.playPlague();
        this.player.poisonBladesTimer = this.activeBlessingIds.has('gob_skill_poisoned_blades')
          ? 8.0
          : 6.5;
        this.player.squashX = 1.2;
        this.player.squashY = 0.82;
        this.slashes.push({
          x: this.player.x,
          y: this.player.y,
          angle: this.player.aimAngle,
          radius: 56,
          arcSpread: Math.PI * 2,
          color: '#A3E635',
          life: 0.36,
          maxLife: 0.36,
          flip: false,
          kind: 'GOBLIN_VENOM_COAT',
        });
        for (let v = 0; v < 10; v++) {
          if (this.particles.length > 240) break;
          const va = (v / 10) * Math.PI * 2;
          const isSpore = v % 3 === 0;
          const vspd = isSpore ? 45 : 105 + Math.random() * 55;
          this.particles.push({
            x: this.player.x + Math.cos(va) * 12,
            y: this.player.y + Math.sin(va) * 12,
            vx: Math.cos(va) * vspd,
            vy: Math.sin(va) * vspd - (isSpore ? 14 : 0),
            size: isSpore ? 7.5 : 3.2,
            color: isSpore ? '#4ADE80' : '#BEF264',
            life: 0.32,
            maxLife: 0.32,
            gravity: 0,
            fade: true,
            kind: isSpore ? 'SPORE_PUFF' : 'VENOM_DROP',
            rot: va,
            vRot: 0,
            len: 6.5,
            thick: 2.8,
            drag: 4.5,
          });
        }
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
        p.gnomeLungeOffset = 14;

        // 60fps Forged-Gauntlet Tectonic Faultline Wave + 3 cascading sonic rings
        this.slashes.push({
          x: p.x + Math.cos(angle) * reach,
          y: p.y + Math.sin(angle) * reach,
          fromX: p.x + Math.cos(angle) * 14,
          fromY: p.y + Math.sin(angle) * 14,
          angle,
          radius: reach,
          arcSpread: 1.5,
          color: tectonic ? '#FDE047' : '#FB923C',
          life: 0.34,
          maxLife: 0.34,
          flip: false,
          kind: 'GNOME_IRON_FIST_WAVE',
          scale: p.mountainHeartTimer > 0 ? 1.25 : 1.0,
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
          for (let c = 0; c < 4; c++) {
            if (this.particles.length > 240) break;
            const ca = angle + (Math.random() - 0.5) * 1.4;
            const cspd = 110 + Math.random() * 95;
            this.particles.push({
              x: sx,
              y: sy,
              vx: Math.cos(ca) * cspd,
              vy: Math.sin(ca) * cspd,
              size: 4.4,
              color: c % 2 === 0 ? '#78716C' : '#FDBA74',
              life: 0.3,
              maxLife: 0.3,
              gravity: 0,
              fade: true,
              kind: c % 2 === 0 ? 'STONE_CHUNK' : 'RUNE_SPARK',
              rot: ca,
              vRot: (Math.random() - 0.5) * 16,
              len: 7.5,
              thick: 4.2,
              drag: 4.5,
            });
          }
        }

        const rawFistDmg =
          35 * (tectonic ? 1.16 : 1.0) * this.getPhysicalDamageMultiplier();
        const stunDur = 1.1 + ranks.pathC * 0.25 + (tectonic ? 0.3 : 0);

        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (this.isEnemyInArc(enemy, p.x, p.y, angle, reach, 0.72)) {
            const roll = this.rollPhysicalAttack(rawFistDmg, 0.15);
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
            this.applyEnemyStun(enemy, stunDur);
          }
        }
        this.hitDestructibleProps(
          p.x + Math.cos(angle) * (reach * 0.5),
          p.y + Math.sin(angle) * (reach * 0.5),
          reach * 0.65
        );

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
        p.fortressTimer = 5.5 + ranks.pathD * 0.4 + (aegis ? 1.2 : 0);
        p.fortressTremorTick = 0.25;
        p.squashX = 1.18;
        p.squashY = 0.84;
        if (aegis) {
          this.healPlayer(Math.round(p.maxHp * 0.15));
        }
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 86,
          arcSpread: Math.PI * 2,
          color: '#FDBA74',
          life: 0.38,
          maxLife: 0.38,
          flip: false,
          kind: 'GNOME_FORTRESS_AEGIS',
          scale: p.mountainHeartTimer > 0 ? 1.3 : 1.0,
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 82,
          color: '#FDBA74',
          life: 0.3,
          maxLife: 0.3,
        });
        for (let r = 0; r < 10; r++) {
          if (this.particles.length > 240) break;
          const ra = (r / 10) * Math.PI * 2;
          this.particles.push({
            x: p.x + Math.cos(ra) * 20,
            y: p.y + Math.sin(ra) * 14,
            vx: Math.cos(ra) * 85,
            vy: Math.sin(ra) * 65 - 15,
            size: 3.5,
            color: r % 2 === 0 ? '#FDBA74' : '#FDE047',
            life: 0.34,
            maxLife: 0.34,
            gravity: 0,
            fade: true,
            kind: 'RUNE_SPARK',
            rot: ra,
            vRot: 10,
            len: 7,
            drag: 4,
          });
        }
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
        for (let s = 0; s < 8; s++) {
          if (this.particles.length > 240) break;
          const sa = (s / 8) * Math.PI * 2;
          this.particles.push({
            x: p.x,
            y: p.y + 8,
            vx: Math.cos(sa) * 95,
            vy: Math.sin(sa) * 65,
            size: 4,
            color: s % 2 === 0 ? '#78716C' : '#FB923C',
            life: 0.26,
            maxLife: 0.26,
            gravity: 0,
            fade: true,
            kind: s % 2 === 0 ? 'STONE_CHUNK' : 'RUNE_SPARK',
            rot: sa,
            vRot: 14,
            len: 6.5,
            thick: 3.8,
            drag: 4.5,
          });
        }
        break;
      }

      case NormalSkillId.MagneticGuard: {
        soundEngine.playSummon();
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const overcharged = this.activeBlessingIds.has('gnome_skill_magnetic_guard');
        p.magneticTimer = 5.5 + ranks.pathD * 0.4 + (overcharged ? 1.2 : 0);
        p.magneticZapTick = 0.15;
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 98,
          arcSpread: Math.PI * 2,
          color: '#38BDF8',
          life: 0.36,
          maxLife: 0.36,
          flip: false,
          kind: 'GNOME_MAGNETIC_PULSE',
          scale: p.mountainHeartTimer > 0 ? 1.25 : 1.0,
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 96,
          color: '#38BDF8',
          life: 0.28,
          maxLife: 0.28,
        });
        for (let m = 0; m < 10; m++) {
          if (this.particles.length > 240) break;
          const ma = (m / 10) * Math.PI * 2;
          this.particles.push({
            x: p.x + Math.cos(ma) * 16,
            y: p.y + Math.sin(ma) * 16,
            vx: Math.cos(ma) * 115,
            vy: Math.sin(ma) * 115,
            size: 3.5,
            color: m % 2 === 0 ? '#38BDF8' : '#FB923C',
            life: 0.28,
            maxLife: 0.28,
            gravity: 0,
            fade: true,
            kind: 'MAGNETIC_ARC',
            rot: ma,
            vRot: 0,
            len: 10,
            thick: 2.2,
            drag: 4.5,
          });
        }
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
        p.gnomeLungeOffset = 9;
        this.shakeMag = Math.max(this.shakeMag, 7);

        const rootDuration = 2.8 + ranks.pathC * 0.25 + (crushing ? 0.6 : 0);
        const crushMult = (crushing ? 1.20 : 1.0) * this.getPlagueOrSkillMultiplier();
        const initialDmg = Math.round(18 * crushMult);
        const dotDmg = Math.round(9 * crushMult);

        const inRange = [...this.world.enemies]
          .filter((e) => e && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= 220)
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)
          )
          .slice(0, 6);

        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 118,
          arcSpread: Math.PI * 2,
          color: '#D97706',
          life: 0.28,
          maxLife: 0.28,
          flip: false,
          kind: 'GNOME_CRATER_SLAM',
          scale: 0.85,
        });
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

      // === GHOST NORMAL SKILLS ===
      case NormalSkillId.SpectralBolt: {
        soundEngine.playArrow();
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const twinLance = this.activeBlessingIds.has('ghost_skill_spectral_bolt');
        p.squashX = 1.24;
        p.squashY = 0.8;

        const baseAngle = p.aimAngle;
        const angles = twinLance ? [baseAngle - 0.14, baseAngle + 0.14] : [baseAngle];
        const boltSpeed = 610;
        const boltDamage =
          33 *
          (twinLance ? 1.12 : 1.0) *
          this.getPhysicalDamageMultiplier() *
          this.getPlagueOrSkillMultiplier();

        this.slashes.push({
          x: p.x + Math.cos(baseAngle) * 18,
          y: p.y + Math.sin(baseAngle) * 18,
          angle: baseAngle,
          radius: 42,
          arcSpread: 1.2,
          color: '#C084FC',
          life: 0.24,
          maxLife: 0.24,
          flip: false,
          kind: 'GHOST_BOLT_CAST',
        });

        for (const ang of angles) {
          this.projectiles.push({
            id: allocEntityId(),
            fromPlayer: true,
            x: p.x + Math.cos(ang) * 20,
            y: p.y + Math.sin(ang) * 20,
            vx: Math.cos(ang) * boltSpeed,
            vy: Math.sin(ang) * boltSpeed,
            radius: 13 + ranks.pathB * 0.8,
            damage: boltDamage,
            life: 1.45,
            color: '#C084FC',
            kind: 'PLAYER_SPECTRAL_BOLT',
            angle: ang,
            pierce: true,
            hitEnemyIds: new Set<number>(),
          });
        }

        for (let s = 0; s < 8; s++) {
          if (this.particles.length > 240) break;
          const sa = baseAngle + (Math.random() - 0.5) * 1.1;
          const sspd = 130 + Math.random() * 90;
          this.particles.push({
            x: p.x + Math.cos(baseAngle) * 16,
            y: p.y + Math.sin(baseAngle) * 16,
            vx: Math.cos(sa) * sspd,
            vy: Math.sin(sa) * sspd,
            size: 3.6,
            color: s % 2 === 0 ? '#67E8F9' : '#E9D5FF',
            life: 0.24,
            maxLife: 0.24,
            gravity: 0,
            fade: true,
            kind: 'ECTO_SPARK',
            rot: sa,
            vRot: 12,
            drag: 4.5,
          });
        }
        this.spawnPopup(p.x, p.y - 26, twinLance ? 'TWIN SPECTRAL BOLT!' : 'SPECTRAL BOLT!', '#C084FC', 0.96);
        break;
      }

      case NormalSkillId.PhantomDash: {
        soundEngine.playDash();
        const p = this.player;
        const joyMag = Math.hypot(this.joyX, this.joyY);
        const dashAng = joyMag > 0.12 ? Math.atan2(this.joyY, this.joyX) : p.aimAngle;
        p.dashAngle = dashAng;
        p.facingX = Math.cos(dashAng) >= 0 ? 1 : -1;
        p.dashTimer = 0.24;
        p.dashKind = 'PHANTOM_DASH';
        p.dashHitIds.clear();
        p.dashAfterimageAccum = 0;
        p.ghostMistDropAccum = 0;
        p.dashRefunded = false;
        p.dashSlotIndex = slotIndex;
        p.invulnTimer = Math.max(p.invulnTimer, 0.34);
        p.squashX = 1.32;
        p.squashY = 0.72;

        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: dashAng,
          radius: 56,
          arcSpread: Math.PI * 2,
          color: '#67E8F9',
          life: 0.32,
          maxLife: 0.32,
          flip: false,
          kind: 'GHOST_MIST_WAKE',
        });
        this.spawnPopup(p.x, p.y - 26, 'PHANTOM DASH!', '#67E8F9', 0.96);
        break;
      }

      case NormalSkillId.SoulDrain: {
        soundEngine.playHeal();
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const devourer = this.activeBlessingIds.has('ghost_skill_soul_drain');
        p.soulDrainTimer = devourer ? 3.8 : 3.2;
        p.soulDrainTick = 0.05;
        p.squashX = 1.24;
        p.squashY = 0.8;

        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 176 + ranks.pathD * 8,
          arcSpread: Math.PI * 2,
          color: '#34D399',
          life: 0.36,
          maxLife: 0.36,
          flip: false,
          kind: 'GHOST_SOUL_DRAIN_PULSE',
        });
        this.spawnPopup(p.x, p.y - 28, 'SOUL DRAIN!', '#6EE7B7', 0.98);
        break;
      }

      case NormalSkillId.WailingScream: {
        soundEngine.playBossSlam();
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const banshee = this.activeBlessingIds.has('ghost_skill_wailing_scream');
        this.hitstopTimer = 0.04;
        this.shakeMag = Math.max(this.shakeMag, 9.5);
        p.squashX = 1.34;
        p.squashY = 0.72;

        const screamRadius = Math.round((banshee ? 205 : 178) * (1 + ranks.pathD * 0.04));
        const fearDur = (banshee ? 2.8 : 2.2) + ranks.pathD * 0.25;
        const rawDmg =
          30 *
          (banshee ? 1.15 : 1.0) *
          this.getPhysicalDamageMultiplier() *
          this.getPlagueOrSkillMultiplier();

        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: p.aimAngle,
          radius: screamRadius,
          arcSpread: Math.PI * 2,
          color: '#A78BFA',
          life: 0.44,
          maxLife: 0.44,
          flip: false,
          kind: 'GHOST_WAILING_SCREAM',
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: screamRadius,
          color: '#67E8F9',
          life: 0.34,
          maxLife: 0.34,
        });

        for (let w = 0; w < 16; w++) {
          if (this.particles.length > 240) break;
          const wa = (w / 16) * Math.PI * 2;
          const wspd = 155 + Math.random() * 95;
          this.particles.push({
            x: p.x + Math.cos(wa) * 14,
            y: p.y + Math.sin(wa) * 14,
            vx: Math.cos(wa) * wspd,
            vy: Math.sin(wa) * wspd,
            size: 4.0,
            color: w % 2 === 0 ? '#67E8F9' : '#D8B4FE',
            life: 0.34,
            maxLife: 0.34,
            gravity: 0,
            fade: true,
            kind: 'ECTO_SPARK',
            rot: wa,
            vRot: 14,
            drag: 4.2,
          });
        }

        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= screamRadius + enemy.radius) {
            const roll = this.rollPhysicalAttack(rawDmg, 0.2);
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, roll.isCrit);
            this.applyEnemyFear(enemy, fearDur);
            this.applyGhostChillIfActive(enemy);
          }
        }
        this.hitDestructibleProps(p.x, p.y, screamRadius);
        this.spawnPopup(p.x, p.y - 30, 'WAILING SCREAM!', '#D8B4FE', 1.05);
        break;
      }

      case NormalSkillId.HauntedPossession: {
        const p = this.player;
        const ranks = this.getActiveUpgrades();
        const puppeteer = this.activeBlessingIds.has('ghost_skill_haunted_possession');
        const host = this.findNearestEnemy(p.x, p.y, 265);

        if (host && host.kind !== EnemyKind.TrainingDummy) {
          soundEngine.playSummon();
          const dur = (puppeteer ? 2.9 : 2.3) + ranks.pathD * 0.22;
          p.possessedEnemyId = host.id;
          p.possessionTimer = dur;
          p.possessionPulseTick = 0.08;
          p.invulnTimer = Math.max(p.invulnTimer, dur + 0.35);
          host.possessedTimer = dur;

          this.afterimages.push({
            x: p.x,
            y: p.y,
            facingX: p.facingX,
            color: '#C084FC',
            life: 0.38,
            maxLife: 0.38,
            archetype: 'GHOST',
          });
          this.tethers.push({
            fromX: p.x,
            fromY: p.y - 10,
            toX: host.x,
            toY: host.y - 10,
            color: '#C084FC',
            life: 0.32,
            maxLife: 0.32,
          });
          p.x = host.x;
          p.y = host.y;
          this.slashes.push({
            x: host.x,
            y: host.y,
            angle: 0,
            radius: 74,
            arcSpread: Math.PI * 2,
            color: '#C084FC',
            life: 0.3,
            maxLife: 0.3,
            flip: false,
            kind: 'GHOST_POSSESS_PULSE',
          });
          this.spawnPopup(host.x, host.y - 34, 'POSSESSED!', '#E879F9', 1.06);
        } else {
          // Fallback exorcism nova if cast with only Training Dummy or no host nearby
          this.triggerPossessionExorcism(
            host ? host.x : p.x + Math.cos(p.aimAngle) * 52,
            host ? host.y : p.y + Math.sin(p.aimAngle) * 52
          );
        }
        break;
      }
    }
    this.emitHudSnapshot();
  }

  private applyEnemyFear(enemy: EnemyEntity, duration: number): void {
    if (enemy.kind === EnemyKind.TrainingDummy) return;
    const effective = enemy.kind === EnemyKind.SkeletonBoss ? duration * 0.45 : duration;
    enemy.fearTimer = Math.max(enemy.fearTimer, effective);
    if (enemy.aiState === 'WINDUP' || enemy.aiState === 'WHIRLWIND') {
      enemy.aiState = 'COOLDOWN';
      enemy.telegraphType = 'NONE';
      enemy.stateTimer = Math.max(enemy.stateTimer, 0.3);
    }
  }

  private applyGhostChillIfActive(enemy: EnemyEntity): void {
    if (this.player.characterId !== CharacterId.Ghost) return;
    if (this.activeBlessingIds.has('ghost_chilling_touch')) {
      enemy.slowTimer = Math.max(enemy.slowTimer, 1.6);
      enemy.slowFactor = Math.min(enemy.slowFactor, 0.84);
    }
  }

  private triggerPossessionExorcism(x: number, y: number): void {
    soundEngine.playBossSlam();
    const p = this.player;
    const puppeteer = this.activeBlessingIds.has('ghost_skill_haunted_possession');
    p.invulnTimer = Math.max(p.invulnTimer, 0.42);
    p.squashX = 1.28;
    p.squashY = 0.76;
    this.shakeMag = Math.max(this.shakeMag, 8.5);
    this.triggerRestlessSpirit();

    const blastR = puppeteer ? 132 : 118;
    this.slashes.push({
      x,
      y,
      angle: 0,
      radius: blastR,
      arcSpread: Math.PI * 2,
      color: '#E879F9',
      life: 0.38,
      maxLife: 0.38,
      flip: false,
      kind: 'GHOST_EXORCISM_BURST',
    });
    this.shockwaves.push({
      x,
      y,
      maxRadius: blastR,
      color: '#C084FC',
      life: 0.32,
      maxLife: 0.32,
    });
    const rawBlast =
      36 *
      (puppeteer ? 1.22 : 1.0) *
      this.getPhysicalDamageMultiplier() *
      this.getPlagueOrSkillMultiplier();
    for (const enemy of [...this.world.enemies]) {
      if (!enemy || enemy.hp <= 0) continue;
      if (Math.hypot(enemy.x - x, enemy.y - y) <= blastR + enemy.radius) {
        const roll = this.rollPhysicalAttack(rawBlast, 0.25);
        this.damageEnemy(enemy, roll.damage, true, x, y, true, roll.isCrit);
        this.applyEnemyFear(enemy, 1.4);
        this.applyGhostChillIfActive(enemy);
      }
    }
    this.spawnBurst(x, y, '#E879F9', 14, 120);
    this.spawnPopup(x, y - 30, 'EXORCISM!', '#F0ABFC', 1.05);
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
      138 * (1 + ranks.pathB * 0.04) * (faultline ? 1.18 : 1.0)
    );
    this.slashes.push({
      x: p.x,
      y: p.y,
      angle: p.aimAngle,
      radius: crashRadius,
      arcSpread: Math.PI * 2,
      color: '#FB923C',
      life: 0.4,
      maxLife: 0.4,
      flip: false,
      kind: 'GNOME_CRATER_SLAM',
      scale: faultline ? 1.12 : 1.0,
    });
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
    for (let s = 0; s < 16; s++) {
      if (this.particles.length > 240) break;
      const sa = (s / 16) * Math.PI * 2 + Math.random() * 0.2;
      const sspd = 125 + Math.random() * 115;
      const isStone = s % 2 === 0;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(sa) * sspd,
        vy: Math.sin(sa) * sspd,
        size: isStone ? 4.8 : 3.4,
        color: isStone ? '#78716C' : '#FDE047',
        life: 0.38,
        maxLife: 0.38,
        gravity: 0,
        fade: true,
        kind: isStone ? 'STONE_CHUNK' : 'RUNE_SPARK',
        rot: sa,
        vRot: (Math.random() - 0.5) * 20,
        len: 8,
        thick: 4.5,
        drag: 4.2,
      });
    }
    this.spawnPopup(p.x, p.y - 30, 'GROUNDBREAKER!', '#FDBA74', 1.05);

    const rawCrash =
      38 *
      (faultline ? 1.18 : 1.0) *
      this.getPhysicalDamageMultiplier() *
      this.getPlagueOrSkillMultiplier();
    const stunDur = 0.95 + ranks.pathC * 0.25 + (faultline ? 0.3 : 0);

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

    this.slashes.push({
      x: ox,
      y: oy,
      angle: waveIndex * 0.45,
      radius: waveRadius,
      arcSpread: Math.PI * 2,
      color: waveIndex % 2 === 0 ? '#FB923C' : '#FDE047',
      life: 0.42,
      maxLife: 0.42,
      flip: waveIndex % 2 === 1,
      kind: 'GNOME_CATACLYSM_RING',
      scale: 1 + waveIndex * 0.12,
    });
    this.shockwaves.push({
      x: ox,
      y: oy,
      maxRadius: waveRadius,
      color: waveIndex % 2 === 0 ? '#FB923C' : '#FDE047',
      life: 0.36,
      maxLife: 0.36,
    });
    for (let s = 0; s < 14; s++) {
      if (this.particles.length > 240) break;
      const sa = (s / 14) * Math.PI * 2 + waveIndex * 0.3;
      const rSpawn = Math.max(12, waveRadius * 0.65);
      const sspd = 130 + waveIndex * 25 + Math.random() * 80;
      const isStone = s % 2 === 0;
      this.particles.push({
        x: ox + Math.cos(sa) * rSpawn,
        y: oy + Math.sin(sa) * rSpawn,
        vx: Math.cos(sa) * sspd,
        vy: Math.sin(sa) * sspd,
        size: isStone ? 5 : 3.5,
        color: isStone ? '#78716C' : '#FDBA74',
        life: 0.36,
        maxLife: 0.36,
        gravity: 0,
        fade: true,
        kind: isStone ? 'STONE_CHUNK' : 'RUNE_SPARK',
        rot: sa,
        vRot: (Math.random() - 0.5) * 18,
        len: 8.5,
        thick: 4.8,
        drag: 4.2,
      });
    }

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
    const reach = isFinal && sevenfold ? 94 : isFinal ? 82 : 74;
    const jitter = (step % 2 === 0 ? 1 : -1) * ((step % 4) * 0.085);
    const angle = p.aimAngle + jitter;
    const venomGlow = p.poisonBladesTimer > 0 || this.activeBlessingIds.has('gob_viper_toxin');

    p.squashX = isFinal ? 1.24 : 1.16;
    p.squashY = isFinal ? 0.8 : 0.86;
    p.goblinLungeOffset = isFinal ? 11 : 6.5;
    p.comboFlip = step % 2 === 0;

    const ox = p.x + Math.cos(angle) * 16;
    const oy = p.y + Math.sin(angle) * 16;
    const createdFlurry: SlashEffect = {
      x: ox,
      y: oy,
      angle,
      radius: reach,
      arcSpread: isFinal ? 1.8 : 1.35,
      color: venomGlow ? '#A3E635' : '#F59E0B',
      life: isFinal ? 0.165 : 0.125,
      maxLife: isFinal ? 0.165 : 0.125,
      flip: step % 2 === 0,
      kind: isFinal ? 'GOBLIN_TWIN_CROSS' : 'GOBLIN_FLURRY_THRUST',
      isCrit: isFinal,
    };
    this.slashes.push(createdFlurry);

    for (let s = 0; s < (isFinal ? 6 : 3); s++) {
      if (this.particles.length > 240) break;
      const sa = angle + (Math.random() - 0.5) * 0.48;
      const spd = 210 + Math.random() * 120;
      this.particles.push({
        x: ox + Math.cos(sa) * 20,
        y: oy + Math.sin(sa) * 20,
        vx: Math.cos(sa) * spd,
        vy: Math.sin(sa) * spd,
        size: 2.4,
        color: venomGlow ? '#BEF264' : '#FDE047',
        life: 0.16,
        maxLife: 0.16,
        gravity: 0,
        fade: true,
        kind: 'SLASH_STREAK',
        rot: sa,
        vRot: 0,
        len: 15,
        thick: 1.9,
        drag: 6.5,
      });
    }

    const rawDmg = (isFinal && sevenfold ? 20 : 13) * this.getPhysicalDamageMultiplier();
    this.hitEnemiesInArc(
      p.x,
      p.y,
      angle,
      reach,
      isFinal && sevenfold ? 1.05 : 0.85,
      rawDmg,
      isFinal,
      isFinal && sevenfold ? 1.0 : 0.12,
      false,
      createdFlurry
    );
    this.hitDestructibleProps(p.x, p.y, reach);
  }

  private performPhantomFrenzyStep(step: number): void {
    const p = this.player;
    const prevX = p.x;
    const prevY = p.y;
    const venomGlow = p.poisonBladesTimer > 0 || this.activeBlessingIds.has('gob_viper_toxin');

    this.afterimages.push({
      x: prevX,
      y: prevY,
      facingX: p.facingX,
      color: step % 2 === 0 ? '#F59E0B' : '#FDE047',
      life: 0.45,
      maxLife: 0.45,
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
      p.goblinLungeOffset = 9;
      p.comboFlip = step % 2 === 0;

      soundEngine.playSlash(step % 3);
      this.slashes.push({
        x: p.x,
        y: p.y,
        fromX: prevX,
        fromY: prevY,
        angle: toEnemy,
        radius: 0,
        arcSpread: 0,
        color: venomGlow ? '#A3E635' : '#FDE047',
        life: 0.2,
        maxLife: 0.2,
        flip: false,
        kind: 'GOBLIN_SHADOW_TRACE',
      });
      this.slashes.push({
        x: p.x + Math.cos(toEnemy) * 14,
        y: p.y + Math.sin(toEnemy) * 14,
        angle: toEnemy,
        radius: 78,
        arcSpread: 1.8,
        color: venomGlow ? '#A3E635' : '#F59E0B',
        life: 0.16,
        maxLife: 0.16,
        flip: step % 2 === 0,
        kind: step === p.phantomTotal ? 'GOBLIN_TWIN_CROSS' : 'GOBLIN_BASIC_ATTACK',
        isCrit: step === p.phantomTotal,
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
      p.goblinLungeOffset = 8;
      soundEngine.playSlash(step % 2);
      this.slashes.push({
        x: p.x,
        y: p.y,
        fromX: prevX,
        fromY: prevY,
        angle: ang,
        radius: 0,
        arcSpread: 0,
        color: venomGlow ? '#A3E635' : '#FDE047',
        life: 0.18,
        maxLife: 0.18,
        flip: false,
        kind: 'GOBLIN_SHADOW_TRACE',
      });
      this.slashes.push({
        x: p.x,
        y: p.y,
        angle: ang,
        radius: 68,
        arcSpread: 1.8,
        color: venomGlow ? '#A3E635' : '#F59E0B',
        life: 0.15,
        maxLife: 0.15,
        flip: step % 2 === 0,
        kind: 'GOBLIN_BASIC_ATTACK',
      });
    }
    this.shakeMag = Math.max(this.shakeMag, 4.5);
  }

  private performKingOfThievesStep(): void {
    const p = this.player;
    const prevX = p.x;
    const prevY = p.y;
    const venomGlow = p.poisonBladesTimer > 0 || this.activeBlessingIds.has('gob_viper_toxin');

    this.afterimages.push({
      x: prevX,
      y: prevY,
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
    p.goblinLungeOffset = 10;

    soundEngine.playSlash(2);
    this.slashes.push({
      x: p.x,
      y: p.y,
      fromX: prevX,
      fromY: prevY,
      angle: toTarget,
      radius: 0,
      arcSpread: 0,
      color: '#FDE047',
      life: 0.22,
      maxLife: 0.22,
      flip: false,
      kind: 'GOBLIN_SHADOW_TRACE',
    });
    this.slashes.push({
      x: target.x,
      y: target.y,
      angle: toTarget,
      radius: 54,
      arcSpread: 1.7,
      color: venomGlow ? '#A3E635' : '#FDE047',
      life: 0.2,
      maxLife: 0.2,
      flip: false,
      kind: 'GOBLIN_BACKSTAB_X',
      isCrit: true,
    });

    // Glittering stolen gold coins & vitality sparks erupt from victim!
    for (let c = 0; c < 6; c++) {
      if (this.particles.length > 240) break;
      const ca = (c / 6) * Math.PI * 2 + Math.random() * 0.4;
      const cspd = 85 + Math.random() * 75;
      this.particles.push({
        x: target.x,
        y: target.y - 6,
        vx: Math.cos(ca) * cspd,
        vy: Math.sin(ca) * cspd - 22,
        size: 4.5,
        color: c % 2 === 0 ? '#FDE047' : '#F59E0B',
        life: 0.38,
        maxLife: 0.38,
        gravity: 0,
        fade: true,
        kind: 'GOLD_COIN_SPARK',
        rot: Math.random() * Math.PI,
        vRot: 14,
        drag: 3.5,
      });
    }

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
      life: 0.34,
      maxLife: 0.34,
      color: '#FBBF24',
    });
    this.damageEnemy(target, roll.damage, true, p.x, p.y, true, roll.isCrit);
    this.applyGoblinPoisonIfActive(target);
    this.healPlayer(8);
    if (!this.world.isGuild) {
      this.runCoins += this.activeBlessingIds.has('gob_ult_thieves') ? 3 : 2;
    }
  }

  private performRottingClawHit(step: number): void {
    const p = this.player;
    const ranks = this.getActiveUpgrades();
    const festering = this.activeBlessingIds.has('zombie_skill_rotting_claw');
    const isFinal = step === p.rottingComboTotal;
    soundEngine.playSlash(step);
    const reach = (p.abominationTimer > 0 ? 96 : 78) * (isFinal ? 1.12 : 1.0);
    const angleJitter = isFinal ? 0 : (step - 2) * 0.16;
    const angle = p.aimAngle + angleJitter;

    p.zombieLungeOffset = isFinal ? 11 : 7;
    p.comboFlip = step % 2 === 0;
    p.squashX = isFinal ? 1.28 : 1.18;
    p.squashY = isFinal ? 0.78 : 0.84;

    const ox = p.x + Math.cos(angle) * 18;
    const oy = p.y + Math.sin(angle) * 18;

    this.slashes.push({
      x: ox,
      y: oy,
      angle,
      radius: reach,
      arcSpread: isFinal ? 1.75 : 1.55,
      color: isFinal ? '#A3E635' : '#4ADE80',
      life: isFinal ? 0.26 : 0.22,
      maxLife: isFinal ? 0.26 : 0.22,
      flip: step % 2 === 0,
      kind: isFinal ? 'ZOMBIE_SAVAGE_REND' : 'ZOMBIE_BASIC_ATTACK',
      scale: p.abominationTimer > 0 ? 1.4 : 1.08,
      isCrit: isFinal,
    });

    for (let d = 0; d < (isFinal ? 9 : 5); d++) {
      if (this.particles.length > 240) break;
      const da = angle + (Math.random() - 0.5) * 1.4;
      const isSpore = d % 3 === 0;
      const dspd = (isSpore ? 55 : 155) + Math.random() * 75;
      this.particles.push({
        x: ox + Math.cos(da) * (reach * 0.55),
        y: oy + Math.sin(da) * (reach * 0.55),
        vx: Math.cos(da) * dspd,
        vy: Math.sin(da) * dspd,
        size: isSpore ? 7 : 3.2,
        color: isSpore ? '#4ADE80' : '#BEF264',
        life: 0.26,
        maxLife: 0.26,
        gravity: 0,
        fade: true,
        kind: isSpore ? 'SPORE_PUFF' : 'VENOM_DROP',
        rot: da,
        len: 7,
        thick: 2.8,
        drag: 4.5,
      });
    }

    const rawDmg = 16 * (festering ? 1.12 : 1.0) * this.getPhysicalDamageMultiplier();
    const slowDuration = 3.5 + ranks.pathB * 0.4;
    for (const enemy of [...this.world.enemies]) {
      if (!enemy || enemy.hp <= 0) continue;
      if (this.isEnemyInArc(enemy, p.x, p.y, angle, reach, 0.95)) {
        const roll = this.rollPhysicalAttack(rawDmg, isFinal ? 0.2 : 0);
        this.damageEnemy(enemy, roll.damage, true, p.x, p.y, isFinal, roll.isCrit);
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
          isCrit: isFinal,
        });
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
        p.abominationTimer = behemoth ? 12.0 : 10.0;
        p.abomStompTick = 0.8;
        p.squashX = 1.38;
        p.squashY = 0.7;
        this.hitstopTimer = 0.055;
        this.shakeMag = 10;
        this.healPlayer(Math.round(p.maxHp * (behemoth ? 0.35 : 0.25)));
        if (behemoth) {
          p.normalCooldowns = [0, 0];
        }
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 155,
          arcSpread: Math.PI * 2,
          color: '#4ADE80',
          life: 0.44,
          maxLife: 0.44,
          flip: false,
          kind: 'ZOMBIE_ABOMINATION_NOVA',
          scale: 1.25,
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 150,
          color: '#4ADE80',
          life: 0.36,
          maxLife: 0.36,
        });
        for (let b = 0; b < 18; b++) {
          if (this.particles.length > 240) break;
          const ba = (b / 18) * Math.PI * 2;
          const isSpore = b % 2 === 0;
          const bspd = 135 + Math.random() * 110;
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(ba) * bspd,
            vy: Math.sin(ba) * bspd,
            size: isSpore ? 9 : 3.8,
            color: isSpore ? '#4ADE80' : '#BEF264',
            life: 0.4,
            maxLife: 0.4,
            gravity: 0,
            fade: true,
            kind: isSpore ? 'SPORE_PUFF' : 'VENOM_DROP',
            rot: ba,
            len: 8,
            thick: 3.4,
            drag: 4.0,
          });
        }
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
            this.applyInfectiousTouch(enemy, 2);
          }
        }
        break;
      }

      case UltimateSkillId.KingdomOfTheDead: {
        soundEngine.playSummon();
        const ranks = this.getActiveUpgrades();
        const lordGraves = this.activeBlessingIds.has('zombie_ult_kingdom');
        this.shakeMag = 9;
        p.squashX = 1.3;
        p.squashY = 0.74;
        const hordeCount = 7 + (lordGraves ? 1 : 0);
        const hordeLife = 14 + ranks.pathD * 1.5;
        if (lordGraves) {
          p.normalCooldowns = [0, 0];
        }
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 168,
          arcSpread: Math.PI * 2,
          color: '#A3E635',
          life: 0.48,
          maxLife: 0.48,
          flip: false,
          kind: 'ZOMBIE_GRAVE_ERUPTION',
          scale: 1.5,
        });
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
        this.hitstopTimer = 0.06;
        this.shakeMag = 13;
        p.squashX = 1.42;
        p.squashY = 0.62;
        if (ravenous) {
          p.normalCooldowns = [0, 0];
        }
        const slamRadius = 250;
        const animDuration = 1.85; // 60 sequential frames (~32.4 fps across Slam, Wave, Drain, Heal Cross & Fade)
        const embraceEffect: DeathsEmbraceEffect = {
          id: allocEntityId(),
          x: p.x,
          y: p.y,
          radius: slamRadius,
          life: animDuration,
          maxLife: animDuration,
          totalDrain: 0,
          healed: false,
          followPlayer: true,
        };
        this.deathsEmbraceEffects.push(embraceEffect);
        this.spawnPopup(p.x, p.y - 34, "DEATH'S EMBRACE", '#A3E635', 1.15);

        let totalDrain = 0;
        const waveDmg = Math.round(
          58 * (ravenous ? 1.2 : 1.0) * this.getPlagueOrSkillMultiplier()
        );
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= slamRadius + enemy.radius) {
            // Life-drain tethers stretch across the Absorb/Drain stages
            this.tethers.push({
              fromX: enemy.x,
              fromY: enemy.y,
              life: 0.9,
              maxLife: 0.9,
            });
            this.damageEnemy(enemy, waveDmg, false, p.x, p.y, true);
            this.applyInfectiousTouch(enemy, 3);
            totalDrain += ravenous ? 19 : 14;
          }
        }
        embraceEffect.totalDrain = totalDrain;
        this.hitDestructibleProps(p.x, p.y, slamRadius);
        break;
      }

      // === SKELETON ULTIMATE SKILLS ===
      case UltimateSkillId.BoneColossus: {
        soundEngine.playBossSlam();
        const dread = this.activeBlessingIds.has('skel_ult_colossus');
        p.colossusTimer = dread ? 12.0 : 10.0;
        p.colossusShockTick = 0.75;
        p.squashX = 1.38;
        p.squashY = 0.7;
        this.hitstopTimer = 0.06;
        this.shakeMag = 11;
        this.healPlayer(Math.round(p.maxHp * 0.2));
        if (dread) {
          p.normalCooldowns = [0, 0];
        }
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 164,
          arcSpread: Math.PI * 2,
          color: '#38BDF8',
          life: 0.46,
          maxLife: 0.46,
          flip: false,
          kind: 'SKELETON_COLOSSUS_NOVA',
          scale: 1.25,
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 160,
          color: '#38BDF8',
          life: 0.38,
          maxLife: 0.38,
        });
        for (let b = 0; b < 20; b++) {
          if (this.particles.length > 240) break;
          const ba = (b / 20) * Math.PI * 2;
          const isBone = b % 2 === 0;
          const bspd = 145 + Math.random() * 120;
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(ba) * bspd,
            vy: Math.sin(ba) * bspd,
            size: 3.5,
            color: isBone ? '#F8FAFC' : '#38BDF8',
            life: 0.38,
            maxLife: 0.38,
            gravity: 0,
            fade: true,
            kind: isBone ? 'BONE_SHARD' : 'SOUL_WISP',
            rot: ba,
            vRot: isBone ? 18 : 0,
            len: 9,
            thick: 3.2,
            drag: 4.2,
          });
        }
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
        p.squashX = 1.28;
        p.squashY = 0.76;
        const legionCount = phalanx ? 7 : 6;
        if (phalanx) {
          p.normalCooldowns = [0, 0];
        }
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 172,
          arcSpread: Math.PI * 2,
          color: '#818CF8',
          life: 0.46,
          maxLife: 0.46,
          flip: false,
          kind: 'SKELETON_CRYPT_SUMMON',
          scale: 1.45,
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 170,
          color: '#818CF8',
          life: 0.4,
          maxLife: 0.4,
        });
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
        p.squashX = 1.38;
        p.squashY = 0.66;
        p.skelLungeOffset = 14;
        if (harvest) {
          p.normalCooldowns = [0, 0];
          this.healPlayer(12);
        }

        const angle = p.aimAngle;
        const scytheReach = 172;
        this.slashes.push({
          x: p.x + Math.cos(angle) * 20,
          y: p.y + Math.sin(angle) * 20,
          angle,
          radius: scytheReach,
          arcSpread: 2.6,
          color: '#C084FC',
          life: 0.36,
          maxLife: 0.36,
          flip: false,
          kind: 'SKELETON_REAPER_SCYTHE',
          scale: this.player.colossusTimer > 0 ? 1.28 : 1.0,
          isCrit: true,
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 150,
          color: '#C084FC',
          life: 0.34,
          maxLife: 0.34,
        });
        for (let r = 0; r < 18; r++) {
          if (this.particles.length > 240) break;
          const t = (r / 17 - 0.5) * 2.5;
          const ra = angle + t;
          const rspd = 175 + Math.random() * 135;
          const isWisp = r % 2 === 0;
          this.particles.push({
            x: p.x + Math.cos(ra) * 42,
            y: p.y + Math.sin(ra) * 42,
            vx: Math.cos(ra) * rspd,
            vy: Math.sin(ra) * rspd,
            size: isWisp ? 4.5 : 3.0,
            color: isWisp ? '#C084FC' : '#38BDF8',
            life: 0.38,
            maxLife: 0.38,
            gravity: 0,
            fade: true,
            kind: isWisp ? 'SOUL_WISP' : 'SLASH_STREAK',
            rot: ra,
            len: 18,
            thick: 2.4,
            drag: 4.2,
          });
        }
        this.spawnPopup(p.x, p.y - 36, "REAPER'S JUDGMENT!", '#C084FC', 1.18);

        // Wide spectral scythe sweep (Guaranteed Critical Strike!)
        const rawSweep = 48 * this.getPhysicalDamageMultiplier();
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (this.isEnemyInArc(enemy, p.x, p.y, angle, scytheReach, 1.38)) {
            const roll = this.rollPhysicalAttack(rawSweep, 0, true);
            this.damageEnemy(enemy, roll.damage, true, p.x, p.y, true, true);
            this.slashes.push({
              x: enemy.x,
              y: enemy.y,
              angle,
              radius: 36,
              arcSpread: 0,
              color: '#C084FC',
              life: 0.24,
              maxLife: 0.24,
              flip: false,
              kind: 'SKELETON_IMPACT_FLASH',
              scale: 1.4,
              isCrit: true,
            });
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
        const total = mirage ? 9 : 8;
        p.phantomTotal = total;
        p.phantomRemaining = total;
        p.phantomTimer = 0;
        p.invulnTimer = Math.max(p.invulnTimer, mirage ? 1.25 : 0.95);
        if (mirage) {
          p.normalCooldowns = [0, 0];
          this.healPlayer(12);
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
        p.kingThievesRemaining = plunder ? 7 : 6;
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
        p.mountainHeartTimer = livingMtn ? 12.0 : 10.0;
        p.mountainTremorTick = 0.7;
        p.squashX = 1.4;
        p.squashY = 0.68;
        this.hitstopTimer = 0.065;
        this.shakeMag = 12;
        this.healPlayer(Math.round(p.maxHp * (livingMtn ? 0.30 : 0.25)));
        if (livingMtn) {
          p.normalCooldowns = [0, 0];
        }
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 168,
          arcSpread: Math.PI * 2,
          color: '#FB923C',
          life: 0.45,
          maxLife: 0.45,
          flip: false,
          kind: 'GNOME_MOUNTAIN_NOVA',
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 165,
          color: '#FB923C',
          life: 0.38,
          maxLife: 0.38,
        });
        for (let b = 0; b < 18; b++) {
          if (this.particles.length > 240) break;
          const ba = (b / 18) * Math.PI * 2;
          const bspd = 135 + Math.random() * 115;
          const isStone = b % 2 === 0;
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(ba) * bspd,
            vy: Math.sin(ba) * bspd,
            size: isStone ? 5.2 : 3.6,
            color: isStone ? '#78716C' : '#FDBA74',
            life: 0.4,
            maxLife: 0.4,
            gravity: 0,
            fade: true,
            kind: isStone ? 'STONE_CHUNK' : 'RUNE_SPARK',
            rot: ba,
            vRot: (Math.random() - 0.5) * 18,
            len: 9,
            thick: 5,
            drag: 4.2,
          });
        }
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
        const wallLife = 6.5 + ranks.pathD * 0.4 + (citadel ? 1.5 : 0);
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
          for (let s = 0; s < 5; s++) {
            if (this.particles.length > 240) break;
            const sa = Math.random() * Math.PI * 2;
            this.particles.push({
              x: wx,
              y: wy + 8,
              vx: Math.cos(sa) * 85,
              vy: Math.sin(sa) * 65 - 18,
              size: 4.5,
              color: s % 2 === 0 ? '#78716C' : '#FB923C',
              life: 0.34,
              maxLife: 0.34,
              gravity: 0,
              fade: true,
              kind: s % 2 === 0 ? 'STONE_CHUNK' : 'RUNE_SPARK',
              rot: sa,
              vRot: 14,
              len: 7.5,
              thick: 4.2,
              drag: 4.5,
            });
          }
        }

        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: ringRadius,
          arcSpread: Math.PI * 2,
          color: '#FB923C',
          life: 0.38,
          maxLife: 0.38,
          flip: false,
          kind: 'GNOME_FORTRESS_AEGIS',
          scale: 1.4,
        });
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

      // === GHOST ULTIMATE SKILLS ===
      case UltimateSkillId.EternalNightmare: {
        soundEngine.playSummon();
        soundEngine.playBossSlam();
        const ranks = this.getActiveUpgrades();
        const dread = this.activeBlessingIds.has('ghost_ult_nightmare');
        const dur = (dread ? 8.5 : 7.0) + ranks.pathD * 0.4;
        p.nightmareTimer = dur;
        p.nightmareFearTick = 0.65;
        p.invulnTimer = Math.max(p.invulnTimer, 1.0);
        this.hitstopTimer = 0.055;
        this.shakeMag = 12;
        if (dread) {
          p.normalCooldowns = [0, 0];
        }

        const appCount = dread ? 5 : 4;
        for (let i = 0; i < appCount; i++) {
          const ang = (i / appCount) * Math.PI * 2;
          this.spawnMinion(
            p.x + Math.cos(ang) * 58,
            p.y + Math.sin(ang) * 48,
            dur + 1.0,
            true,
            'GHOST_APPARITION'
          );
        }

        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 210,
          arcSpread: Math.PI * 2,
          color: '#A855F7',
          life: 0.48,
          maxLife: 0.48,
          flip: false,
          kind: 'GHOST_NIGHTMARE_NOVA',
        });
        this.shockwaves.push({
          x: p.x,
          y: p.y,
          maxRadius: 210,
          color: '#C084FC',
          life: 0.4,
          maxLife: 0.4,
        });

        const openDmg = Math.round(30 * this.getPlagueOrSkillMultiplier());
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= 220 + enemy.radius) {
            this.damageEnemy(enemy, openDmg, true, p.x, p.y, false);
            this.applyEnemyFear(enemy, 2.2 + ranks.pathD * 0.2);
            this.applyGhostChillIfActive(enemy);
          }
        }
        this.triggerRestlessSpirit();
        this.spawnPopup(p.x, p.y - 38, 'ETERNAL NIGHTMARE!', '#D8B4FE', 1.18);
        break;
      }

      case UltimateSkillId.SpiritLegion: {
        soundEngine.playSummon();
        const hostBless = this.activeBlessingIds.has('ghost_ult_legion');
        this.hitstopTimer = 0.045;
        this.shakeMag = 10;
        p.invulnTimer = Math.max(p.invulnTimer, 0.85);
        p.squashX = 1.3;
        p.squashY = 0.74;
        if (hostBless) {
          p.normalCooldowns = [0, 0];
          this.healPlayer(10);
        }

        const spiritCount = hostBless ? 12 : 10;
        const orbDmg =
          25 *
          this.getPhysicalDamageMultiplier() *
          this.getPlagueOrSkillMultiplier();
        for (let i = 0; i < spiritCount; i++) {
          const ang = (i / spiritCount) * Math.PI * 2;
          const orbitR = 54 + (i % 2) * 18;
          this.projectiles.push({
            id: allocEntityId(),
            fromPlayer: true,
            x: p.x + Math.cos(ang) * orbitR,
            y: p.y + Math.sin(ang) * orbitR,
            vx: 0,
            vy: 0,
            radius: 11,
            damage: orbDmg,
            life: 4.2,
            color: i % 2 === 0 ? '#67E8F9' : '#C084FC',
            kind: 'PLAYER_SPIRIT_ORB',
            angle: ang,
            pierce: hostBless,
            hitEnemyIds: new Set<number>(),
            orbitTimer: 0.36 + i * 0.11,
            orbitAngle: ang,
            orbitRadius: orbitR,
          });
        }

        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          radius: 132,
          arcSpread: Math.PI * 2,
          color: '#67E8F9',
          life: 0.42,
          maxLife: 0.42,
          flip: false,
          kind: 'GHOST_SPIRIT_RING',
        });
        this.triggerRestlessSpirit();
        this.spawnPopup(p.x, p.y - 38, 'SPIRIT LEGION!', '#67E8F9', 1.18);
        break;
      }

      case UltimateSkillId.DeathsPassage: {
        soundEngine.playBossSlam();
        soundEngine.playSummon();
        const ranks = this.getActiveUpgrades();
        const horizon = this.activeBlessingIds.has('ghost_ult_passage');
        this.hitstopTimer = 0.06;
        this.shakeMag = 13;
        p.invulnTimer = Math.max(p.invulnTimer, 0.9);
        p.squashX = 1.34;
        p.squashY = 0.7;
        if (horizon) {
          p.normalCooldowns = [0, 0];
        }

        const focusTarget = this.findNearestEnemy(p.x, p.y, 290);
        const rx = focusTarget ? focusTarget.x : p.x + Math.cos(p.aimAngle) * 84;
        const ry = focusTarget ? focusTarget.y : p.y + Math.sin(p.aimAngle) * 84;
        const riftRadius = Math.round((horizon ? 212 : 192) * (1 + ranks.pathD * 0.04));
        const riftLife = 2.25;

        this.deathsPassageRifts.push({
          id: allocEntityId(),
          x: rx,
          y: ry,
          radius: riftRadius,
          life: riftLife,
          maxLife: riftLife,
          tickTimer: 0.1,
          detonated: false,
          pullDamage: Math.round(12 * this.getPlagueOrSkillMultiplier()),
          explosionDamage: Math.round(
            74 *
              (horizon ? 1.15 : 1.0) *
              this.getPhysicalDamageMultiplier() *
              this.getPlagueOrSkillMultiplier()
          ),
        });

        this.shockwaves.push({
          x: rx,
          y: ry,
          maxRadius: riftRadius,
          color: '#A855F7',
          life: 0.36,
          maxLife: 0.36,
        });
        this.triggerRestlessSpirit();
        this.spawnPopup(p.x, p.y - 38, "DEATH'S PASSAGE!", '#E879F9', 1.2);
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
    minionType: 'ZOMBIE_SHAMBLER' | 'SKELETON_WARRIOR_ALLY' | 'GHOST_APPARITION'
  ): void {
    const isGhostApp = minionType === 'GHOST_APPARITION';
    const resolved = this.resolveWorldCollision(x, y, 12, isGhostApp);
    const ranks = this.getActiveUpgrades();
    const isSkeletal = minionType === 'SKELETON_WARRIOR_ALLY';
    const masteryMult = 1 + ranks.pathD * (isGhostApp ? 0.2 : isSkeletal ? 0.18 : 0.22);
    const endlessBless =
      !isSkeletal &&
      !isGhostApp &&
      (this.activeBlessingIds.has('zombie_skill_grave_call') ||
        this.activeBlessingIds.has('zombie_ult_kingdom'));
    const dreadBless = isGhostApp && this.activeBlessingIds.has('ghost_ult_nightmare');
    const blessSpeed = endlessBless || dreadBless ? 1.22 : 1.0;
    const hp = Math.round((isGhostApp ? 48 : isSkeletal ? 42 : 46) * masteryMult);
    const baseDmg = isGhostApp ? 17 : isSkeletal ? 15 : frenzied ? 13 : 11;
    const dmg = Math.round(
      baseDmg * masteryMult * (endlessBless || dreadBless ? 1.18 : 1)
    );

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
      speed: (isGhostApp ? 236 : isSkeletal ? 210 : frenzied ? 192 : 168) * blessSpeed,
      lifeTimer: duration,
      maxLife: duration,
      attackCooldown: 0.12,
      walkPhase: Math.random() * 5,
      hitFlashTimer: 0,
      facingX: 1,
      sproutVariant: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      spawnAnimTimer: 0.28,
    });
    this.slashes.push({
      x: resolved.x,
      y: resolved.y,
      angle: 0,
      radius: 34,
      arcSpread: Math.PI * 2,
      color: isGhostApp ? '#C084FC' : isSkeletal ? '#818CF8' : '#86EFAC',
      life: 0.34,
      maxLife: 0.34,
      flip: false,
      kind: isGhostApp
        ? 'GHOST_MIST_WAKE'
        : isSkeletal
        ? 'SKELETON_CRYPT_SUMMON'
        : 'ZOMBIE_GRAVE_ERUPTION',
      scale: 0.72,
    });
    this.spawnBurst(
      resolved.x,
      resolved.y,
      isGhostApp ? '#C084FC' : isSkeletal ? '#7DD3FC' : '#86EFAC',
      6,
      70
    );
  }

  private updateMinions(dt: number): void {
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      const isGhostApp = m.minionType === 'GHOST_APPARITION';
      m.lifeTimer -= dt;
      if (m.spawnAnimTimer > 0) m.spawnAnimTimer -= dt;
      if (m.hitFlashTimer > 0) m.hitFlashTimer -= dt;
      if (m.attackCooldown > 0) m.attackCooldown -= dt;

      if (m.lifeTimer <= 0 || m.hp <= 0) {
        this.spawnBurst(
          m.x,
          m.y,
          isGhostApp
            ? '#C084FC'
            : m.minionType === 'SKELETON_WARRIOR_ALLY'
            ? '#7DD3FC'
            : '#68A357',
          6,
          55
        );
        this.minions.splice(i, 1);
        continue;
      }

      const target = this.findNearestEnemy(m.x, m.y, 540);
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
            m.attackCooldown = isGhostApp ? 0.48 : isSkeletal ? 0.52 : 0.62;
            soundEngine.playHit(false);
            if (isGhostApp) {
              const ang = Math.atan2(dy, dx);
              const isCrit = Math.random() < 0.28;
              this.slashes.push({
                x: m.x + Math.cos(ang) * 8,
                y: m.y + Math.sin(ang) * 8,
                angle: ang,
                radius: 34,
                arcSpread: 1.5,
                color: '#C084FC',
                life: 0.16,
                maxLife: 0.16,
                flip: Math.random() < 0.5,
                kind: 'GHOST_BASIC_ARC',
                scale: 0.68,
                isCrit,
              });
              const hitDmg = isCrit ? Math.round(m.damage * 1.7) : m.damage;
              this.damageEnemy(target, hitDmg, true, m.x, m.y, false, isCrit);
              this.applyEnemyFear(target, 0.85);
              this.applyGhostChillIfActive(target);
            } else if (isSkeletal) {
              const ang = Math.atan2(dy, dx);
              const isCrit = Math.random() < 0.25;
              this.slashes.push({
                x: m.x + Math.cos(ang) * 8,
                y: m.y + Math.sin(ang) * 8,
                angle: ang,
                radius: 30,
                arcSpread: 1.4,
                color: '#38BDF8',
                life: 0.14,
                maxLife: 0.14,
                flip: Math.random() < 0.5,
                kind: 'SKELETON_BASIC_ATTACK',
                scale: 0.62,
                isCrit,
              });
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

      const resolved = this.resolveWorldCollision(
        m.x + m.vx * dt,
        m.y + m.vy * dt,
        m.radius,
        isGhostApp
      );
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
      if (e.fearTimer > 0) {
        e.fearTimer = Math.max(0, e.fearTimer - dt);
      }
      if (e.possessedTimer > 0) {
        e.possessedTimer = Math.max(0, e.possessedTimer - dt);
      }

      if (e.infectionStacks > 0 || e.plagueTimer > 0) {
        e.infectionTimer -= dt;
        if (e.plagueTimer > 0) e.plagueTimer -= dt;

        if (e.infectionTimer <= 0) {
          e.infectionTimer = 0.75;
          const strainMult =
            (this.activeBlessingIds.has('zombie_virulent_strain') ? 1.15 : 1.0) *
            (this.activeBlessingIds.has('gob_skill_poisoned_blades') ? 1.18 : 1.0);
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

      // Possessed host is steered by Ghost's Haunted Possession in updatePlayer()
      if (e.possessedTimer > 0) {
        e.aiState = 'COOLDOWN';
        e.telegraphType = 'NONE';
        const otherEnemy = this.world.enemies.find(
          (o) => o.id !== e.id && o.hp > 0 && o.kind !== EnemyKind.TrainingDummy
        );
        if (otherEnemy) {
          const hdx = otherEnemy.x - e.x;
          const hdy = otherEnemy.y - e.y;
          const hdist = Math.max(1, Math.hypot(hdx, hdy));
          e.vx = (hdx / hdist) * (e.speed * 1.15);
          e.vy = (hdy / hdist) * (e.speed * 1.15);
          e.facingX = hdx >= 0 ? 1 : -1;
          e.walkPhase += dt * 13;
        } else {
          e.vx *= 0.8;
          e.vy *= 0.8;
        }
        const pPos = this.resolveEnemyRampartCollision(
          this.resolveWorldCollision(e.x + e.vx * dt, e.y + e.vy * dt, e.radius),
          e.radius
        );
        e.x = pPos.x;
        e.y = pPos.y;
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

      // Frightened enemies panic and flee away from Ghost!
      if (e.fearTimer > 0) {
        if (e.aiState === 'WINDUP' || e.aiState === 'WHIRLWIND') {
          e.aiState = 'COOLDOWN';
          e.telegraphType = 'NONE';
          e.stateTimer = Math.max(e.stateTimer, 0.3);
        }
        const isRooted = e.rootTimer > 0;
        const fleeAngle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        const fleeSpeed = isRooted ? 0 : e.speed * e.slowFactor * 0.88;
        e.vx = Math.cos(fleeAngle) * fleeSpeed;
        e.vy = Math.sin(fleeAngle) * fleeSpeed;
        e.facingX = Math.cos(fleeAngle) >= 0 ? 1 : -1;
        e.walkPhase += dt * 13;
        const fearPos = this.resolveEnemyRampartCollision(
          this.resolveWorldCollision(e.x + e.vx * dt, e.y + e.vy * dt, e.radius),
          e.radius
        );
        e.x = fearPos.x;
        e.y = fearPos.y;
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
        const baseArrow = 14 + (this.world.floorNumber - 1) * 3;
        const arrowDmg = this.applyWeakenedEnemyMultiplier(
          e,
          Math.round(baseArrow * this.getDifficultyConfig().enemyDmgMult)
        );
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
          const isNightmare = this.currentDifficulty === DifficultyLevel.Nightmare;
          const fanCount = isNightmare ? (enraged ? 13 : 11) : (enraged ? 9 : 7);
          const boltDmg = this.applyWeakenedEnemyMultiplier(
            e,
            Math.round(18 * this.getDifficultyConfig().enemyDmgMult)
          );
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
    const diffScaledDmg = Math.round(rawDamage * this.getDifficultyConfig().enemyDmgMult);
    const finalDmg = this.applyWeakenedEnemyMultiplier(attacker, diffScaledDmg);

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
        (this.activeBlessingIds.has('gob_shadow_clone') ? 0.06 : 0);
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
          const counterRaw = 14 * this.getPhysicalDamageMultiplier();
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

    // Ghost Passive 1: Ethereal Body (phase evasion + Restless Spirit surge!)
    if (p.characterId === CharacterId.Ghost) {
      const astralVeil = this.activeBlessingIds.has('ghost_ethereal_veil') ? 0.06 : 0;
      const evadeChance = Math.min(
        0.78,
        0.24 + ranks.pathA * 0.025 + astralVeil + (p.nightmareTimer > 0 ? 0.1 : 0)
      );
      if (Math.random() < evadeChance) {
        soundEngine.playDash();
        p.invulnTimer = 0.32;
        this.afterimages.push({
          x: p.x,
          y: p.y,
          facingX: p.facingX,
          color: '#C084FC',
          life: 0.36,
          maxLife: 0.36,
          archetype: 'GHOST',
        });
        this.triggerRestlessSpirit();
        this.spawnPopup(p.x, p.y - 28, 'PHASE!', '#67E8F9', 1.0);
        this.emitHudSnapshot();
        return;
      }
    }

    const isSkeleton = p.characterId === CharacterId.Skeleton;
    const isZombie = p.characterId === CharacterId.Zombie;
    const isGnome = p.characterId === CharacterId.Gnome;
    const isGhost = p.characterId === CharacterId.Ghost;
    let dmg = incomingDmg;

    // Ghost Passive 1: Ethereal Body innate physical attack resistance
    if (isGhost) {
      const etherealGuard = Math.min(
        0.52,
        0.2 +
          ranks.pathA * 0.03 +
          (this.activeBlessingIds.has('ghost_ethereal_veil') ? 0.06 : 0)
      );
      dmg *= 1 - etherealGuard;
    }

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
      this.slashes.push({
        x: p.x,
        y: p.y,
        angle: 0,
        radius: 58,
        arcSpread: Math.PI * 2,
        color: '#E2E8F0',
        life: 0.26,
        maxLife: 0.26,
        flip: false,
        kind: 'SKELETON_RIBCAGE_BURST',
      });
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
      dmg *= 0.85;
    }

    // Gnome Passive 1: Unbreakable Foundation + Granite Core pathA + Bedrock Plating
    if (isGnome) {
      const foundationArmor = Math.min(
        0.48,
        0.22 +
          ranks.pathA * 0.025 +
          (this.activeBlessingIds.has('gnome_bedrock_plating') ? 0.05 : 0)
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

      // Ghost Spirit Orb: orbits Ghost briefly before launching & homing onto nearest enemy!
      if (pr.kind === 'PLAYER_SPIRIT_ORB') {
        if (pr.orbitTimer !== undefined && pr.orbitTimer > 0) {
          pr.orbitTimer -= dt;
          pr.orbitAngle = (pr.orbitAngle ?? pr.angle) + dt * 6.2;
          const orbR = pr.orbitRadius ?? 56;
          pr.x = this.player.x + Math.cos(pr.orbitAngle) * orbR;
          pr.y = this.player.y + Math.sin(pr.orbitAngle) * orbR;
          pr.angle = pr.orbitAngle + Math.PI * 0.5;
          if (pr.orbitTimer <= 0) {
            const target = this.findNearestEnemy(pr.x, pr.y, 460);
            const launchAng = target
              ? Math.atan2(target.y - pr.y, target.x - pr.x)
              : pr.orbitAngle;
            pr.angle = launchAng;
            pr.vx = Math.cos(launchAng) * 520;
            pr.vy = Math.sin(launchAng) * 520;
          }
        } else {
          const target = this.findNearestEnemy(pr.x, pr.y, 380);
          if (target) {
            const desired = Math.atan2(target.y - pr.y, target.x - pr.x);
            const diff = Math.atan2(Math.sin(desired - pr.angle), Math.cos(desired - pr.angle));
            pr.angle += Math.max(-7.5 * dt, Math.min(7.5 * dt, diff));
            const spd = 540;
            pr.vx = Math.cos(pr.angle) * spd;
            pr.vy = Math.sin(pr.angle) * spd;
          }
          pr.x += pr.vx * dt;
          pr.y += pr.vy * dt;
        }
      } else {
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
      }

      if (pr.fromPlayer) {
        // Player projectiles break destructible urns/crates & emit 60fps slipstream trails
        this.hitDestructibleProps(pr.x, pr.y, pr.radius + 8);
        if (
          (pr.kind === 'PLAYER_BONE_SPEAR' ||
            pr.kind === 'PLAYER_DARK_WAVE' ||
            pr.kind === 'PLAYER_SPECTRAL_BOLT' ||
            pr.kind === 'PLAYER_SPIRIT_ORB') &&
          Math.random() < 0.58 &&
          this.particles.length < 238
        ) {
          const isGhostProj =
            pr.kind === 'PLAYER_SPECTRAL_BOLT' || pr.kind === 'PLAYER_SPIRIT_ORB';
          const isWave = pr.kind === 'PLAYER_DARK_WAVE';
          this.particles.push({
            x: pr.x - Math.cos(pr.angle) * 10 + (Math.random() - 0.5) * (isWave ? 26 : 9),
            y: pr.y - Math.sin(pr.angle) * 10 + (Math.random() - 0.5) * (isWave ? 26 : 9),
            vx: -Math.cos(pr.angle) * 55,
            vy: -Math.sin(pr.angle) * 55,
            size: isGhostProj ? 3.5 : isWave ? 3.8 : 2.5,
            color: isGhostProj
              ? Math.random() < 0.5
                ? '#67E8F9'
                : '#D8B4FE'
              : isWave
              ? '#C084FC'
              : '#7DD3FC',
            life: 0.2,
            maxLife: 0.2,
            gravity: 0,
            fade: true,
            kind: isGhostProj ? 'ECTO_SPARK' : isWave ? 'SOUL_WISP' : 'SLASH_STREAK',
            rot: pr.angle + Math.PI,
            len: 13,
            thick: 1.9,
            drag: 4.5,
          });
        }
      }

      // Spectral Bolt, Spirit Orb & Dark Wave phase over interior props and only expire on outer room walls or lifetime
      const phasesOverProps =
        pr.kind === 'PLAYER_DARK_WAVE' ||
        pr.kind === 'PLAYER_SPECTRAL_BOLT' ||
        pr.kind === 'PLAYER_SPIRIT_ORB';
      const blocked = phasesOverProps
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
                ? 0.12
                : 0;
            const bonusCrit =
              (pr.kind === 'PLAYER_BONE_SPEAR' ? 0.15 + spearTwinBonus : 0.22) + opp.bonusCrit;
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
            if (pr.kind === 'PLAYER_SPECTRAL_BOLT' || pr.kind === 'PLAYER_SPIRIT_ORB') {
              this.applyGhostChillIfActive(enemy);
              this.slashes.push({
                x: enemy.x,
                y: enemy.y,
                angle: pr.angle,
                radius: 30,
                arcSpread: 0,
                color: roll.isCrit ? '#67E8F9' : '#C084FC',
                life: 0.2,
                maxLife: 0.2,
                flip: false,
                kind: 'GHOST_IMPACT_RING',
                scale: roll.isCrit ? 1.3 : 1.0,
                isCrit: roll.isCrit,
              });
            } else if (pr.kind === 'PLAYER_BONE_SPEAR' || pr.kind === 'PLAYER_DARK_WAVE') {
              this.slashes.push({
                x: enemy.x,
                y: enemy.y,
                angle: pr.angle,
                radius: 28,
                arcSpread: 0,
                color: roll.isCrit ? '#FDE047' : pr.color,
                life: 0.18,
                maxLife: 0.18,
                flip: false,
                kind: 'SKELETON_IMPACT_FLASH',
                scale: roll.isCrit ? 1.3 : 1.0,
                isCrit: roll.isCrit,
              });
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
          this.slashes.push({
            x: pr.x,
            y: pr.y,
            fromX: this.player.x,
            fromY: this.player.y - 6,
            angle: newAngle,
            radius: 0,
            arcSpread: 0,
            color: '#38BDF8',
            life: 0.22,
            maxLife: 0.22,
            flip: false,
            kind: 'GNOME_MAGNETIC_ARC',
          });
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
          (this.activeBlessingIds.has('skel_skill_bone_storm') ? 66 : 58)
      ) {
        soundEngine.playBoneBreak();
        this.slashes.push({
          x: pr.x,
          y: pr.y,
          angle: pr.angle,
          radius: 26,
          arcSpread: 0,
          color: '#A5B4FC',
          life: 0.16,
          maxLife: 0.16,
          flip: false,
          kind: 'SKELETON_IMPACT_FLASH',
        });
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
        this.slashes.push({
          x: this.player.x,
          y: this.player.y,
          angle: 0,
          radius: 56,
          arcSpread: Math.PI * 2,
          color: '#E2E8F0',
          life: 0.24,
          maxLife: 0.24,
          flip: false,
          kind: 'SKELETON_RIBCAGE_BURST',
        });
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
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.025);
    this.shockwaves.push({
      x: trap.x,
      y: trap.y,
      maxRadius: trap.blastRadius,
      color: '#FB923C',
      life: 0.34,
      maxLife: 0.34,
    });
    this.slashes.push({
      x: trap.x,
      y: trap.y,
      angle: Math.random() * Math.PI,
      radius: trap.blastRadius,
      arcSpread: Math.PI * 2,
      color: '#F97316',
      life: 0.36,
      maxLife: 0.36,
      flip: false,
      kind: 'GOBLIN_TRAP_BLAST',
    });
    // Flying brass gear shrapnel & fiery sparks
    for (let i = 0; i < 16; i++) {
      if (this.particles.length > 240) break;
      const a = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const isShrapnel = i % 2 === 0;
      const spd = (isShrapnel ? 185 : 140) + Math.random() * 110;
      const life = isShrapnel ? 0.32 + Math.random() * 0.14 : 0.28 + Math.random() * 0.14;
      this.particles.push({
        x: trap.x,
        y: trap.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: isShrapnel ? 4.2 : 9.5,
        color: isShrapnel ? (i % 4 === 0 ? '#FDE047' : '#FB923C') : '#292524',
        life,
        maxLife: life,
        gravity: 0,
        fade: true,
        kind: isShrapnel ? 'BRASS_SHRAPNEL' : 'SHADOW_PUFF',
        rot: a,
        vRot: (Math.random() - 0.5) * 22,
        len: 6.5,
        thick: 2.8,
        drag: isShrapnel ? 4.8 : 3.4,
      });
    }

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
        radius: 82,
        life: 2.6,
        maxLife: 2.6,
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

  private updateGhostMistZones(dt: number): void {
    for (let i = this.ghostMistZones.length - 1; i >= 0; i--) {
      const m = this.ghostMistZones[i];
      m.life -= dt;
      m.tickTimer -= dt;
      if (m.life <= 0) {
        this.ghostMistZones.splice(i, 1);
        continue;
      }
      if (m.tickTimer <= 0) {
        m.tickTimer = 0.45;
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - m.x, enemy.y - m.y) <= m.radius + enemy.radius) {
            this.damageEnemy(enemy, m.damagePerTick, false, m.x, m.y);
            enemy.slowTimer = Math.max(enemy.slowTimer, 1.1);
            enemy.slowFactor = Math.min(enemy.slowFactor, 0.78);
            this.applyGhostChillIfActive(enemy);
          }
        }
      }
    }
  }

  private updateDeathsPassageRifts(dt: number): void {
    for (let i = this.deathsPassageRifts.length - 1; i >= 0; i--) {
      const rift = this.deathsPassageRifts[i];
      rift.life -= dt;
      rift.tickTimer -= dt;

      // Continuous vortex gravity pulling enemies into the center prior to detonation!
      if (!rift.detonated && rift.life > 0.35) {
        for (const enemy of this.world.enemies) {
          if (!enemy || enemy.hp <= 0 || enemy.kind === EnemyKind.TrainingDummy) continue;
          const dx = rift.x - enemy.x;
          const dy = rift.y - enemy.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 14 && dist <= rift.radius + enemy.radius + 36) {
            const pullForce = enemy.kind === EnemyKind.SkeletonBoss ? 120 : 235;
            const resolved = this.resolveWorldCollision(
              enemy.x + (dx / dist) * pullForce * dt,
              enemy.y + (dy / dist) * pullForce * dt,
              enemy.radius
            );
            enemy.x = resolved.x;
            enemy.y = resolved.y;
          }
        }

        if (rift.tickTimer <= 0) {
          rift.tickTimer = 0.32;
          for (const enemy of [...this.world.enemies]) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - rift.x, enemy.y - rift.y) <= rift.radius + enemy.radius) {
              this.damageEnemy(enemy, rift.pullDamage, false, rift.x, rift.y);
              this.applyGhostChillIfActive(enemy);
            }
          }
        }
      }

      // Enormous spiritual explosion at climax of the rift!
      if (!rift.detonated && rift.life <= 0.35) {
        rift.detonated = true;
        soundEngine.playBossSlam();
        this.hitstopTimer = 0.065;
        this.shakeMag = Math.max(this.shakeMag, 14);
        this.slashes.push({
          x: rift.x,
          y: rift.y,
          angle: 0,
          radius: rift.radius * 1.12,
          arcSpread: Math.PI * 2,
          color: '#E879F9',
          life: 0.46,
          maxLife: 0.46,
          flip: false,
          kind: 'GHOST_PASSAGE_DETONATION',
        });
        this.shockwaves.push({
          x: rift.x,
          y: rift.y,
          maxRadius: rift.radius * 1.15,
          color: '#67E8F9',
          life: 0.38,
          maxLife: 0.38,
        });
        for (let s = 0; s < 20; s++) {
          if (this.particles.length > 240) break;
          const sa = (s / 20) * Math.PI * 2;
          const sspd = 175 + Math.random() * 130;
          this.particles.push({
            x: rift.x,
            y: rift.y,
            vx: Math.cos(sa) * sspd,
            vy: Math.sin(sa) * sspd,
            size: 4.5,
            color: s % 2 === 0 ? '#67E8F9' : '#E879F9',
            life: 0.42,
            maxLife: 0.42,
            gravity: 0,
            fade: true,
            kind: 'ECTO_SPARK',
            rot: sa,
            vRot: 16,
            drag: 3.8,
          });
        }
        for (const enemy of [...this.world.enemies]) {
          if (!enemy || enemy.hp <= 0) continue;
          if (Math.hypot(enemy.x - rift.x, enemy.y - rift.y) <= rift.radius * 1.12 + enemy.radius) {
            const roll = this.rollPhysicalAttack(rift.explosionDamage, 0.35);
            this.damageEnemy(enemy, roll.damage, true, rift.x, rift.y, true, roll.isCrit);
            this.applyEnemyFear(enemy, 1.8);
            this.applyGhostChillIfActive(enemy);
          }
        }
        this.hitDestructibleProps(rift.x, rift.y, rift.radius * 1.1);
      }

      if (rift.life <= 0) {
        this.deathsPassageRifts.splice(i, 1);
      }
    }
  }

  private applyGoblinPoisonIfActive(enemy: EnemyEntity): void {
    if (this.player.characterId !== CharacterId.Goblin) return;
    const hasNightshade = this.activeBlessingIds.has('gob_viper_toxin');
    const hasCorrosive = this.activeBlessingIds.has('gob_skill_poisoned_blades');
    if (this.player.poisonBladesTimer <= 0 && !hasNightshade) return;
    if (this.player.poisonBladesTimer <= 0 && hasNightshade && Math.random() >= 0.5) return;

    const stacksToAdd =
      (this.player.poisonBladesTimer > 0 && hasNightshade ? 2 : 1) + (hasCorrosive ? 1 : 0);
    enemy.infectionStacks = Math.min(hasCorrosive ? 4 : 3, enemy.infectionStacks + stacksToAdd);
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
    const maxStacks = this.activeBlessingIds.has('zombie_virulent_strain') ? 4 : 3;
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
    isZombieAttack = false,
    skeletonSlash?: SlashEffect,
    isZombieFinisher = false
  ): void {
    let hitAny = false;
    let landedCrit = false;
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
        this.applyInfectiousTouch(enemy, isZombieFinisher ? 2 : 1);
        this.applyGoblinPoisonIfActive(enemy);
        this.applyGhostChillIfActive(enemy);
        hitAny = true;
        if (roll.isCrit) landedCrit = true;

        if (skeletonSlash) {
          const isGobImpact = this.player.characterId === CharacterId.Goblin;
          const isGnomeImpact = this.player.characterId === CharacterId.Gnome;
          const isGhostImpact = this.player.characterId === CharacterId.Ghost;
          const isGobVenom =
            isGobImpact &&
            (this.player.poisonBladesTimer > 0 || this.activeBlessingIds.has('gob_viper_toxin'));
          const isCritImpact = roll.isCrit || Boolean(skeletonSlash.isCrit);
          const flashLife = isCritImpact ? 0.22 : 0.15;
          const flashColor = isGhostImpact
            ? isCritImpact
              ? '#67E8F9'
              : '#C084FC'
            : isGnomeImpact
            ? isCritImpact
              ? '#FDE047'
              : '#FB923C'
            : isGobImpact
            ? isGobVenom
              ? '#A3E635'
              : isCritImpact
              ? '#FDE047'
              : '#FBBF24'
            : isCritImpact
            ? '#FDE047'
            : '#7DD3FC';

          this.slashes.push({
            x: enemy.x - Math.cos(angle) * 6,
            y: enemy.y - Math.sin(angle) * 6,
            angle,
            radius: isGnomeImpact ? 32 : isGhostImpact ? 30 : 26,
            arcSpread: 0,
            color: flashColor,
            life: flashLife,
            maxLife: flashLife,
            flip: false,
            kind: isGhostImpact
              ? 'GHOST_IMPACT_RING'
              : isGnomeImpact
              ? 'GNOME_IMPACT_CRACK'
              : 'SKELETON_IMPACT_FLASH',
            scale:
              (isCritImpact ? 1.32 : 0.95) *
              (this.player.colossusTimer > 0 || this.player.mountainHeartTimer > 0 ? 1.28 : 1.0),
            isCrit: isCritImpact,
          });

          if (isGhostImpact) {
            for (let g = 0; g < (isCritImpact ? 6 : 4); g++) {
              if (this.particles.length > 240) break;
              const ga = angle + (Math.random() - 0.5) * 1.6;
              const gs = 135 + Math.random() * 110;
              const glife = 0.2 + Math.random() * 0.12;
              this.particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(ga) * gs,
                vy: Math.sin(ga) * gs,
                size: 3.4,
                color: g % 2 === 0 ? '#67E8F9' : '#D8B4FE',
                life: glife,
                maxLife: glife,
                gravity: 0,
                fade: true,
                kind: 'ECTO_SPARK',
                rot: ga,
                vRot: (Math.random() - 0.5) * 16,
                drag: 5.0,
              });
            }
          } else if (isGnomeImpact) {
            for (let g = 0; g < (isCritImpact ? 6 : 4); g++) {
              if (this.particles.length > 240) break;
              const ga = angle + (Math.random() - 0.5) * 1.6;
              const gs = 130 + Math.random() * 110;
              const glife = 0.22 + Math.random() * 0.12;
              const isStone = g % 2 === 0;
              this.particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(ga) * gs,
                vy: Math.sin(ga) * gs,
                size: isStone ? 4.2 : 3.0,
                color: isStone ? '#A8A29E' : isCritImpact ? '#FDE047' : '#FB923C',
                life: glife,
                maxLife: glife,
                gravity: 0,
                fade: true,
                kind: isStone ? 'STONE_CHUNK' : 'RUNE_SPARK',
                rot: ga,
                vRot: (Math.random() - 0.5) * 18,
                len: 6.5,
                thick: 4.0,
                drag: 5.2,
              });
            }
          } else if (isGobImpact) {
            for (let g = 0; g < (isCritImpact ? 6 : 4); g++) {
              if (this.particles.length > 240) break;
              const ga = angle + (Math.random() - 0.5) * 1.5;
              const gs = 155 + Math.random() * 120;
              const glife = 0.17 + Math.random() * 0.1;
              const dropVenom = isGobVenom && g % 2 === 1;
              this.particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(ga) * (dropVenom ? gs * 0.65 : gs),
                vy: Math.sin(ga) * (dropVenom ? gs * 0.65 : gs),
                size: 2.6,
                color: dropVenom ? '#A3E635' : isCritImpact ? '#FEF08A' : '#FBBF24',
                life: glife,
                maxLife: glife,
                gravity: 0,
                fade: true,
                kind: dropVenom ? 'VENOM_DROP' : 'SLASH_STREAK',
                rot: ga,
                len: dropVenom ? 6.5 : 13 + Math.random() * 6,
                thick: dropVenom ? 2.8 : 2.1,
                drag: 6.5,
              });
            }
          } else {
            // Crisp bone splinters flying off struck enemy
            for (let b = 0; b < (isCritImpact ? 5 : 3); b++) {
              if (this.particles.length > 240) break;
              const ba = angle + (Math.random() - 0.5) * 1.4;
              const bs = 135 + Math.random() * 110;
              const blife = 0.2 + Math.random() * 0.12;
              this.particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(ba) * bs,
                vy: Math.sin(ba) * bs,
                size: 2.5,
                color: b === 0 && isCritImpact ? '#FDE047' : '#F8FAFC',
                life: blife,
                maxLife: blife,
                gravity: 0,
                fade: true,
                kind: 'BONE_SHARD',
                rot: ba,
                vRot: (Math.random() - 0.5) * 20,
                len: 6 + Math.random() * 4,
                thick: 2.4,
                drag: 5.5,
              });
            }
          }
        }

        if (isZombieAttack) {
          const isAbom = this.player.abominationTimer > 0;
          const isEmpowered = isZombieFinisher || roll.isCrit || isAbom;
          const burstLife = isEmpowered ? 0.34 : 0.27;
          this.slashes.push({
            x: enemy.x,
            y: enemy.y,
            angle: angle + (Math.random() - 0.5) * 0.35,
            radius: (isEmpowered ? 44 : 36) * (isAbom ? 1.28 : 1.0),
            arcSpread: 0,
            color: '#A3E635',
            life: burstLife,
            maxLife: burstLife,
            flip: Math.random() < 0.5,
            kind: 'ZOMBIE_POISON_BURST',
            scale: isAbom ? 1.32 : isZombieFinisher ? 1.16 : 1.0,
            isCrit: isEmpowered,
          });
          for (let z = 0; z < (isEmpowered ? 6 : 4); z++) {
            if (this.particles.length > 240) break;
            const za = angle + (Math.random() - 0.5) * 2.1;
            const isPuff = z % 2 === 0;
            const zs = isPuff ? 45 + Math.random() * 40 : 120 + Math.random() * 95;
            const zLife = isPuff ? 0.34 + Math.random() * 0.14 : 0.22 + Math.random() * 0.12;
            this.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(za) * zs,
              vy: Math.sin(za) * zs - (isPuff ? 12 : 0),
              size: isPuff ? 7 + Math.random() * 3.5 : 3.2,
              color: isPuff ? '#4ADE80' : '#BEF264',
              life: zLife,
              maxLife: zLife,
              gravity: 0,
              fade: true,
              kind: isPuff ? 'SPORE_PUFF' : 'VENOM_DROP',
              rot: za,
              vRot: 0,
              len: 6.5,
              thick: 2.8,
              drag: isPuff ? 3.5 : 5.0,
            });
          }
        }
      }
    }
    if (skeletonSlash && landedCrit) {
      skeletonSlash.isCrit = true;
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.024);
      this.shakeMag = Math.max(this.shakeMag, 5.2);
    } else if (skeletonSlash && hitAny) {
      this.shakeMag = Math.max(this.shakeMag, 2.4);
    } else if (isZombieAttack && hitAny) {
      if (isZombieFinisher || landedCrit) {
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.022);
        this.shakeMag = Math.max(this.shakeMag, 4.8);
      } else {
        this.shakeMag = Math.max(this.shakeMag, 2.2);
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
      const splashDmg = Math.max(5, Math.round(actual * 0.2));
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

    // Goblin Statue Blessing: Quicksilver Step — slaying an enemy cuts Normal Skill cooldowns by 0.6s!
    if (
      this.player.characterId === CharacterId.Goblin &&
      this.activeBlessingIds.has('gob_quicksilver_boots')
    ) {
      this.player.normalCooldowns[0] = Math.max(0, this.player.normalCooldowns[0] - 0.6);
      this.player.normalCooldowns[1] = Math.max(0, this.player.normalCooldowns[1] - 0.6);
    }

    if (enemy.infectionStacks > 0) {
      const splashRadius = this.activeBlessingIds.has('zombie_virulent_strain') ? 135 : 112;
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
        (this.activeBlessingIds.has('zombie_feast_of_rot') ? 5 : 0);
      this.spawnOrb('ESSENCE_HEAL', enemy.x, enemy.y, healVal);
    }

    this.spawnOrb('XP_ORB', enemy.x, enemy.y, enemy.kind === EnemyKind.SkeletonBoss ? 120 : 18);
    if (Math.random() < 0.7) {
      this.spawnOrb('GOLD_COIN', enemy.x, enemy.y, 4 + Math.floor(Math.random() * 4));
    }

    const shardMult = this.getDifficultyConfig().shardMultiplier;
    if (enemy.kind === EnemyKind.SkeletonBoss) {
      this.hitstopTimer = 0.08;
      this.shakeMag = 15;
      for (let s = 0; s < 12; s++) {
        this.spawnOrb('SOUL_SHARD', enemy.x, enemy.y, Math.max(1, Math.round(4 * shardMult)));
      }
      soundEngine.playVictory();
    } else if (Math.random() < 0.55) {
      this.spawnOrb(
        'SOUL_SHARD',
        enemy.x,
        enemy.y,
        Math.max(1, Math.round((2 + Math.floor(this.world.floorNumber * 0.7)) * shardMult))
      );
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
          const bonusUlt = this.activeBlessingIds.has('zombie_feast_of_rot') ? 17 : 13;
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
          const { isStageBoss } = getStageAndFloor(this.world.floorNumber);
          const isBossRoom = room.kind === RoomKind.Boss;
          const isFinalBoss = isBossRoom && isStageBoss;
          const diffConfig = this.getDifficultyConfig();
          const wave = spawnRoomWave(room, this.world.floorNumber, isFinalBoss, diffConfig);
          this.world.enemies.push(...wave);
          for (const w of wave) {
            this.spawnBurst(w.x, w.y, '#94A3B8', 10, 85);
          }
          if (isBossRoom) {
            const bossInfo = getBossInfoForFloor(this.world.floorNumber);
            this.showBanner(`${bossInfo.name} · ${bossInfo.subtitle}`);
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
        const wave = spawnRoomWave(activeRoom, this.world.floorNumber, false, this.getDifficultyConfig());
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
          const maxFloors = this.getDifficultyConfig().maxFloors;
          const bossInfo = getBossInfoForFloor(this.world.floorNumber);
          if (this.world.floorNumber >= maxFloors) {
            this.showBanner(`${bossInfo.name} Slain! Enter the Sanctum Portal to Claim Victory`);
          } else {
            const nextFloor = this.world.floorNumber + 1;
            const nextInfo = getStageAndFloor(nextFloor);
            if (nextInfo.stageFloor === 1) {
              const theme = STAGE_THEMES[nextInfo.stage] ?? STAGE_THEMES[1];
              this.showBanner(`Boss Slain! Ascend to Stage ${nextInfo.stage}-1: ${theme.name}`);
            } else {
              this.showBanner(`${bossInfo.name} Defeated! Step into the Descent Portal`);
            }
          }
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
          prompt = 'Open Door · Enter Dungeon';
          if (pressedInteract || steppedOutside) {
            this.bufferedActions.delete('INTERACT');
            if (this.callbacks.onRequestDifficultySelect) {
              this.player.y = prop.y + 16;
              this.callbacks.onRequestDifficultySelect();
            } else {
              this.startGraveyardRun();
            }
            return;
          }
        }
      } else if (prop.kind === 'PORTAL_ARCH' && !this.world.isGuild && dist <= 76) {
        const maxFloors = this.getDifficultyConfig().maxFloors;
        const isRunVictory = this.world.floorNumber >= maxFloors;
        const nextFloor = this.world.floorNumber + 1;
        const nextInfo = getStageAndFloor(nextFloor);
        if (isRunVictory) {
          prompt = 'Claim Victory & Return to Guild';
        } else if (nextInfo.stageFloor === 1) {
          const theme = STAGE_THEMES[nextInfo.stage] ?? STAGE_THEMES[1];
          prompt = `Ascend to Stage ${nextInfo.stage}-1 · ${theme.name}`;
        } else {
          prompt = `Descend to Floor ${nextInfo.stage}-${nextInfo.stageFloor}`;
        }

        if (pressedInteract || dist <= 32) {
          this.bufferedActions.delete('INTERACT');
          if (isRunVictory) {
            this.finishRun(true);
          } else if (this.world.floorNumber > 7) {
            this.loadDungeonFloor(nextFloor);
          } else {
            this.offerBlessingsAndAdvanceFloor(nextFloor, 'STAGE_CLEAR');
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
        prompt =
          this.world.floorNumber > 7
            ? 'Pray at Lantern Statue (+25% HP)'
            : 'Pray at Lantern Statue';
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
    const shardMult = this.getDifficultyConfig().shardMultiplier;
    this.spawnOrb(
      'SOUL_SHARD',
      prop.x,
      prop.y,
      Math.max(1, Math.round((5 + this.world.floorNumber * 2) * shardMult))
    );
    this.spawnOrb('ESSENCE_HEAL', prop.x, prop.y, 18);
    this.spawnOrb('GOLD_COIN', prop.x, prop.y, 12);
  }

  private activateShrineStatue(prop: { x: number; y: number; opened?: boolean }): void {
    if (prop.opened || this.phase !== GamePhase.Dungeon) return;
    this.bufferedActions.delete('INTERACT');
    prop.opened = true;
    this.interactPrompt = null;
    soundEngine.playHeal();
    this.healPlayer(Math.round(this.player.maxHp * 0.25));
    const burstColor =
      this.player.characterId === CharacterId.Skeleton
        ? '#38BDF8'
        : this.player.characterId === CharacterId.Goblin
        ? '#F59E0B'
        : this.player.characterId === CharacterId.Gnome
        ? '#FB923C'
        : this.player.characterId === CharacterId.Ghost
        ? '#C084FC'
        : '#4ADE80';
    this.spawnBurst(prop.x, prop.y - 20, burstColor, 14, 95);

    if (this.world.floorNumber > 7) {
      this.spawnPopup(prop.x, prop.y - 28, 'Vitality Restored (+25% HP)', burstColor, 1.05);
      this.roomBannerText = 'Lantern Statue · Vitality Restored (Blessings End After Stage 3-1)';
      this.roomBannerTimer = 3.2;
      this.emitHudSnapshot();
      return;
    }

    const eligiblePool = getEligibleStatueBlessings(
      this.player.characterId,
      this.getActiveLoadout()
    );
    const unpicked = eligiblePool.filter((b) => !this.activeBlessingIds.has(b.id));
    if (unpicked.length === 0) {
      this.spawnPopup(prop.x, prop.y - 28, 'All Blessings Mastered (+25% HP)', '#FBBF24', 1.05);
      this.emitHudSnapshot();
      return;
    }

    this.offerBlessingsAndAdvanceFloor(null, 'STATUE');
  }

  private offerBlessingsAndAdvanceFloor(
    nextFloor: number | null,
    source: 'STATUE' | 'STAGE_CLEAR' = 'STAGE_CLEAR'
  ): void {
    if (this.world.floorNumber > 7) {
      if (nextFloor !== null) {
        this.loadDungeonFloor(nextFloor);
      }
      return;
    }

    // Strictly filter to ONLY blessings matching the hero's equipped 2 Normal + 1 Ultimate skills (plus core passives)
    const eligiblePool = getEligibleStatueBlessings(
      this.player.characterId,
      this.getActiveLoadout()
    );
    const unpicked = eligiblePool.filter((b) => !this.activeBlessingIds.has(b.id));
    if (unpicked.length === 0) {
      if (nextFloor !== null) {
        this.loadDungeonFloor(nextFloor);
      } else {
        this.spawnPopup(this.player.x, this.player.y - 32, 'All Blessings Mastered', '#FBBF24', 1.0);
      }
      return;
    }

    const choices = unpicked
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    this.pendingNextFloor = nextFloor;
    this.phase = GamePhase.BlessingSelect;
    this.joyX = 0;
    this.joyY = 0;
    this.attackHeld = false;
    this.callbacks.onOfferBlessings(choices, source);
    this.emitHudSnapshot();
  }

  private finishRun(victory: boolean): void {
    this.phase = victory ? GamePhase.Victory : GamePhase.GameOver;
    this.joyX = 0;
    this.joyY = 0;
    this.attackHeld = false;
    const diff = this.getDifficultyConfig();
    const bonusShards = victory ? diff.victoryShards : Math.max(3, Math.round(5 * diff.shardMultiplier));
    const totalEarned = this.runShardsEarned + bonusShards;
    this.runShardsEarned = totalEarned;
    this.callbacks.onRunFinished(victory, totalEarned, this.runKills, this.runDamageDealt);
    this.emitHudSnapshot();
  }

  private resolveWorldCollision(
    nx: number,
    ny: number,
    radius: number,
    ignoreProps = false
  ): { x: number; y: number } {
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

    if (!ignoreProps) {
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
    for (let i = this.deathsEmbraceEffects.length - 1; i >= 0; i--) {
      const eff = this.deathsEmbraceEffects[i];
      eff.life -= dt;
      if (eff.followPlayer) {
        eff.x = this.player.x;
        eff.y = this.player.y;
      }
      const progress = 1 - eff.life / eff.maxLife;
      // Precise sync with Healing Start through Heal Peak (frames 31-36) where radiant cross illuminates
      if (!eff.healed && progress >= 0.52) {
        eff.healed = true;
        if (eff.totalDrain > 0) {
          this.healPlayer(eff.totalDrain);
          soundEngine.playHeal();
          this.slashes.push({
            x: this.player.x,
            y: this.player.y,
            angle: 0,
            radius: 84,
            arcSpread: Math.PI * 2,
            color: '#4ADE80',
            life: 0.36,
            maxLife: 0.36,
            flip: false,
            kind: 'ZOMBIE_UNDYING_PULSE',
          });
          for (let h = 0; h < 12; h++) {
            if (this.particles.length > 240) break;
            const ha = (h / 12) * Math.PI * 2;
            this.particles.push({
              x: this.player.x + Math.cos(ha) * 16,
              y: this.player.y + Math.sin(ha) * 12,
              vx: Math.cos(ha) * 65,
              vy: Math.sin(ha) * 50 - 38,
              size: 5.5,
              color: h % 2 === 0 ? '#4ADE80' : '#BEF264',
              life: 0.48,
              maxLife: 0.48,
              gravity: 0,
              fade: true,
              kind: 'NECRO_CROSS',
              drag: 2.5,
            });
          }
          this.spawnPopup(this.player.x, this.player.y - 28, `+${eff.totalDrain} HP`, '#4ADE80', 1.3);
        }
      }
      if (eff.life <= 0) {
        // Fallback safeguard: if ended without healing yet, heal now
        if (!eff.healed && eff.totalDrain > 0) {
          eff.healed = true;
          this.healPlayer(eff.totalDrain);
        }
        this.deathsEmbraceEffects.splice(i, 1);
      }
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
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      if (pt.drag) {
        const damp = Math.max(0, 1 - dt * pt.drag);
        pt.vx *= damp;
        pt.vy *= damp;
      }
      if (pt.vRot !== undefined && pt.rot !== undefined) {
        pt.rot += pt.vRot * dt;
      }
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
      restlessTimer: +this.player.restlessTimer.toFixed(1),
      soulDrainTimer: +this.player.soulDrainTimer.toFixed(1),
      possessionTimer: +this.player.possessionTimer.toFixed(1),
      nightmareTimer: +this.player.nightmareTimer.toFixed(1),
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
      difficulty: this.currentDifficulty,
      difficultyLabel: this.getDifficultyConfig().label,
      difficultyBadge: this.getDifficultyConfig().badge,
      difficultyColor: this.getDifficultyConfig().color,
      currentStage: getStageAndFloor(this.world.floorNumber).stage,
      maxStages: this.getDifficultyConfig().stages,
      stageFloor: getStageAndFloor(this.world.floorNumber).stageFloor,
      totalFloorsInRun: this.getDifficultyConfig().maxFloors,
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
            name: getBossInfoForFloor(this.world.floorNumber).name,
            subtitle: getBossInfoForFloor(this.world.floorNumber).subtitle,
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
      multiplayerInfo: (() => {
        const room = this.networkManager?.getRoom();
        if (!room) return null;
        return {
          inRoom: true,
          roomCode: room.code,
          mode: room.mode,
          isHost: room.hostId === this.networkManager?.getLocalPlayerId(),
          playerCount: room.players.length,
          ping: this.networkManager?.getPing() ?? 0,
        };
      })(),
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
      deathsPassageRifts: this.deathsPassageRifts,
      ghostMistZones: this.ghostMistZones,
      pickups: this.pickups,
      minions: this.minions,
      enemies: this.world.enemies,
      player: this.player,
      remotePlayers: Array.from(this.remotePlayers.values()),
      guildCompanions: this.getGuildCompanions(),
      projectiles: this.projectiles,
      slashes: this.slashes,
      shockwaves: this.shockwaves,
      tethers: this.tethers,
      deathsEmbraceEffects: this.deathsEmbraceEffects,
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
