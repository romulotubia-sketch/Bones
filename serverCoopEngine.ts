import { DIFFICULTY_CONFIGS } from './src/data/difficultyData.ts';
import {
  buildGraveyardFloor,
  buildGuildWorld,
  createProceduralSkeleton,
  createSeededRandom,
  GeneratedWorld,
  getBossInfoForFloor,
  getStageAndFloor,
  spawnRoomWave,
} from './src/game/dungeonGenerator.ts';
import type {
  EnemyProjectileSyncState,
  EnemyStatusPayload,
  EnemySyncState,
  PlayerTransformSync,
  RoomProgressSyncState,
  ServerMessage,
  SpawnedPropSyncState,
} from './src/multiplayer/networkTypes.ts';
import {
  CharacterId,
  DifficultyConfig,
  DifficultyLevel,
  DungeonRoom,
  EnemyEntity,
  EnemyKind,
  RoomKind,
} from './src/types/game.ts';

export interface ServerPlayerState extends PlayerTransformSync {
  name: string;
  characterId: CharacterId;
  invulnTimer: number;
}

interface CoopSessionHooks {
  broadcast: (msg: ServerMessage, excludePlayerId?: string) => void;
  getDifficulty: () => DifficultyLevel;
  getPartyPlayers: () => { id: string; name: string; characterId: CharacterId }[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

function normalizeAngleDiff(target: number, current: number): number {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class ServerCoopSession {
  public floorNumber = 0;
  public seed = 1;
  public world: GeneratedWorld;
  public activeRoomId: number | null = null;
  public currentWave = 0;
  public totalWaves = 0;

  public players = new Map<string, ServerPlayerState>();
  public enemies = new Map<number, EnemyEntity>();
  public enemyProjectiles: (EnemyProjectileSyncState & { life: number })[] = [];
  public spawnedProps = new Map<number, SpawnedPropSyncState>();
  public openedPropIds = new Set<number>();
  public brokenPropIds = new Set<number>();

  private hooks: CoopSessionHooks;
  private rng: () => number;
  private nextEntityId = 500000;
  private processedEventIds = new Set<string>();
  private processedEventQueue: string[] = [];
  private dotAccum = 0;
  private dummyRegenTimer = 0;
  private partyWipedSent = false;
  private partyVictorySent = false;

  constructor(hooks: CoopSessionHooks, initialSeed: number) {
    this.hooks = hooks;
    this.seed = initialSeed;
    this.rng = createSeededRandom(initialSeed);
    this.world = buildGuildWorld();
    this.populateInitialEnemies();
  }

  private allocId = (): number => {
    return this.nextEntityId++;
  };

  private recordEventId(eventId: string | undefined): boolean {
    if (!eventId) return true;
    if (this.processedEventIds.has(eventId)) {
      return false;
    }
    this.processedEventIds.add(eventId);
    this.processedEventQueue.push(eventId);
    if (this.processedEventQueue.length > 2000) {
      const oldest = this.processedEventQueue.shift();
      if (oldest) this.processedEventIds.delete(oldest);
    }
    return true;
  }

  private getDiffConfig(): DifficultyConfig {
    const diff = this.hooks.getDifficulty();
    return DIFFICULTY_CONFIGS[diff] ?? DIFFICULTY_CONFIGS[DifficultyLevel.Easy];
  }

  private populateInitialEnemies() {
    this.enemies.clear();
    for (const e of this.world.enemies) {
      const id = e.kind === EnemyKind.TrainingDummy ? 499999 : this.allocId();
      this.enemies.set(id, { ...e, id });
    }
  }

  public ensurePartyPlayersSynced() {
    const party = this.hooks.getPartyPlayers();
    const activeIds = new Set(party.map((p) => p.id));

    for (const member of party) {
      const existing = this.players.get(member.id);
      if (!existing) {
        const baseMaxHp = this.getDefaultMaxHp(member.characterId);
        this.players.set(member.id, {
          id: member.id,
          name: member.name,
          characterId: member.characterId,
          x: this.world.spawnX + (this.players.size - 1) * 32,
          y: this.world.spawnY,
          vx: 0,
          vy: 0,
          aimAngle: 0,
          facingX: 1,
          walkPhase: 0,
          hp: baseMaxHp,
          maxHp: baseMaxHp,
          hitFlashTimer: 0,
          squashX: 1,
          squashY: 1,
          dashTimer: 0,
          leapAirProgress: 0,
          isAttacking: false,
          comboStep: 0,
          comboFlip: false,
          isDowned: false,
          bleedoutTimer: 0,
          reviveProgress: 0,
          isRevivingPlayerId: null,
          invulnTimer: 1.2,
          activeBuffs: {
            undying: false,
            abomination: false,
            ribcageCharges: 0,
            boneStorm: false,
            colossus: false,
            windrunner: false,
            fortress: false,
            mountainHeart: false,
            restless: false,
            nightmare: false,
          },
        });
      } else {
        existing.name = member.name;
        existing.characterId = member.characterId;
      }
    }

    for (const id of Array.from(this.players.keys())) {
      if (!activeIds.has(id)) {
        this.players.delete(id);
      }
    }
  }

  private getDefaultMaxHp(charId: CharacterId): number {
    switch (charId) {
      case CharacterId.Zombie:
        return 210;
      case CharacterId.Gnome:
        return 225;
      case CharacterId.Skeleton:
        return 175;
      case CharacterId.Ghost:
        return 165;
      case CharacterId.Kobold:
        return 168;
      case CharacterId.Goblin:
        return 160;
      default:
        return 185;
    }
  }

  public startGuildSession(seed: number) {
    this.floorNumber = 0;
    this.seed = seed;
    this.rng = createSeededRandom(seed);
    this.world = buildGuildWorld();
    this.activeRoomId = null;
    this.currentWave = 0;
    this.totalWaves = 0;
    this.enemyProjectiles = [];
    this.spawnedProps.clear();
    this.openedPropIds.clear();
    this.brokenPropIds.clear();
    this.partyWipedSent = false;
    this.partyVictorySent = false;
    this.populateInitialEnemies();

    this.ensurePartyPlayersSynced();
    let idx = 0;
    for (const p of this.players.values()) {
      p.isDowned = false;
      p.bleedoutTimer = 0;
      p.reviveProgress = 0;
      p.isRevivingPlayerId = null;
      p.hp = p.maxHp;
      p.invulnTimer = 1.0;
      p.x = this.world.spawnX + ((idx % 4) - 1.5) * 34;
      p.y = this.world.spawnY;
      idx++;
    }
  }

  public loadFloor(floorNumber: number, seed: number, difficulty: DifficultyLevel) {
    this.floorNumber = floorNumber;
    this.seed = seed;
    this.rng = createSeededRandom(seed + floorNumber * 31337);
    const diffCfg = DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS[DifficultyLevel.Easy];
    this.world = buildGraveyardFloor(floorNumber, diffCfg, seed);
    this.activeRoomId = null;
    this.currentWave = 0;
    this.totalWaves = 0;
    this.enemies.clear();
    this.enemyProjectiles = [];
    this.spawnedProps.clear();
    this.openedPropIds.clear();
    this.brokenPropIds.clear();
    this.partyWipedSent = false;
    this.partyVictorySent = false;

    const startRoom = this.world.rooms.find((r) => r.id === 0);
    if (startRoom) {
      startRoom.discovered = true;
      startRoom.cleared = true;
      startRoom.locked = false;
    }

    this.ensurePartyPlayersSynced();
    let idx = 0;
    for (const p of this.players.values()) {
      if (floorNumber === 1) {
        p.isDowned = false;
        p.bleedoutTimer = 0;
        p.reviveProgress = 0;
        p.hp = p.maxHp;
      } else if (p.isDowned) {
        // Rally downed allies when descending to a new floor
        p.isDowned = false;
        p.bleedoutTimer = 0;
        p.reviveProgress = 0;
        p.hp = Math.max(30, Math.round(p.maxHp * 0.5));
      } else {
        // Gentle hearth recovery between floors
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.2));
      }
      p.isRevivingPlayerId = null;
      p.invulnTimer = 2.0;
      p.x = this.world.spawnX + ((idx % 4) - 1.5) * 34;
      p.y = this.world.spawnY;
      idx++;
    }
  }

  public syncPlayerTransform(
    playerId: string,
    name: string,
    characterId: CharacterId,
    transform: PlayerTransformSync
  ) {
    this.ensurePartyPlayersSynced();
    const p = this.players.get(playerId);
    if (!p) return;

    p.name = name;
    p.characterId = characterId;
    p.x = transform.x;
    p.y = transform.y;
    p.vx = transform.vx;
    p.vy = transform.vy;
    p.aimAngle = transform.aimAngle;
    p.facingX = transform.facingX;
    p.walkPhase = transform.walkPhase;
    p.squashX = transform.squashX;
    p.squashY = transform.squashY;
    p.dashTimer = transform.dashTimer;
    p.leapAirProgress = transform.leapAirProgress;
    p.isAttacking = transform.isAttacking;
    p.comboStep = transform.comboStep;
    p.comboFlip = transform.comboFlip;
    p.activeBuffs = { ...p.activeBuffs, ...transform.activeBuffs };

    if (transform.dashTimer > 0.02 || transform.leapAirProgress > 0.05) {
      p.invulnTimer = Math.max(p.invulnTimer, 0.14);
    }

    if (this.floorNumber === 0) {
      if (transform.maxHp > 0) p.maxHp = transform.maxHp;
      if (transform.hp > 0) p.hp = Math.min(p.maxHp, transform.hp);
      p.isDowned = false;
    } else if (transform.maxHp > 0 && transform.maxHp !== p.maxHp) {
      const diff = transform.maxHp - p.maxHp;
      p.maxHp = transform.maxHp;
      if (!p.isDowned && diff > 0) {
        p.hp = Math.min(p.maxHp, p.hp + diff);
      } else {
        p.hp = Math.min(p.maxHp, p.hp);
      }
    }
  }

  public handlePlayerHeal(playerId: string, eventId: string, amount: number, maxHp?: number) {
    if (!this.recordEventId(eventId)) return;
    const p = this.players.get(playerId);
    if (!p || p.isDowned) return;
    if (maxHp && maxHp > 0) {
      p.maxHp = maxHp;
    }
    const cleanAmount = Math.max(0, Math.min(5000, Math.round(amount)));
    p.hp = Math.min(p.maxHp, p.hp + cleanAmount);
  }

  public handleDamageEnemy(
    attackerId: string,
    eventId: string,
    enemyId: number,
    rawDamage: number,
    isCrit: boolean | undefined,
    hitX: number,
    hitY: number,
    statusEffects?: EnemyStatusPayload
  ) {
    if (!this.recordEventId(eventId)) return;
    const enemy = this.enemies.get(enemyId);
    if (!enemy || enemy.hp <= 0) return;

    const attacker = this.players.get(attackerId);
    if (attacker && attacker.isDowned) return;

    // Apply crowd-control and DoT status effects authoritatively
    if (statusEffects) {
      if (statusEffects.stunDuration && statusEffects.stunDuration > 0) {
        const stunCap =
          enemy.kind === EnemyKind.SkeletonBoss
            ? statusEffects.stunDuration * 0.45
            : statusEffects.stunDuration;
        enemy.stunTimer = Math.max(enemy.stunTimer, stunCap);
      }
      if (statusEffects.slowDuration && statusEffects.slowDuration > 0) {
        enemy.slowTimer = Math.max(enemy.slowTimer, statusEffects.slowDuration);
        enemy.slowFactor = Math.min(enemy.slowFactor || 1, statusEffects.slowFactor ?? 0.55);
      }
      if (statusEffects.rootDuration && statusEffects.rootDuration > 0) {
        const rootCap =
          enemy.kind === EnemyKind.SkeletonBoss
            ? statusEffects.rootDuration * 0.5
            : statusEffects.rootDuration;
        enemy.rootTimer = Math.max(enemy.rootTimer, rootCap);
      }
      if (statusEffects.fearDuration && statusEffects.fearDuration > 0) {
        const fearCap =
          enemy.kind === EnemyKind.SkeletonBoss
            ? statusEffects.fearDuration * 0.35
            : statusEffects.fearDuration;
        enemy.fearTimer = Math.max(enemy.fearTimer, fearCap);
      }
      if (statusEffects.infectionStacksToAdd && statusEffects.infectionStacksToAdd > 0) {
        enemy.infectionStacks = Math.min(
          5,
          enemy.infectionStacks + statusEffects.infectionStacksToAdd
        );
        enemy.infectionTimer = 5.5;
      }
      if (statusEffects.plagueDuration && statusEffects.plagueDuration > 0) {
        enemy.plagueTimer = Math.max(enemy.plagueTimer, statusEffects.plagueDuration);
      }
      if (statusEffects.vulnerableDuration && statusEffects.vulnerableDuration > 0) {
        enemy.vulnerableTimer = Math.max(enemy.vulnerableTimer, statusEffects.vulnerableDuration);
      }
      if (statusEffects.hunterMarkStacks && statusEffects.hunterMarkStacks > 0) {
        enemy.hunterMarkStacks = Math.min(5, statusEffects.hunterMarkStacks);
        enemy.hunterMarkTimer = 6.0;
      }
    }

    const vulnMult = enemy.vulnerableTimer > 0 && !isCrit ? 1.08 : 1.0;
    const damage = Math.max(1, Math.min(25000, Math.round(rawDamage * vulnMult)));

    if (enemy.kind === EnemyKind.TrainingDummy) {
      enemy.hp = Math.max(1, enemy.hp - damage);
      enemy.hitFlashTimer = 0.08;
      this.dummyRegenTimer = 2.5;
      this.hooks.broadcast({
        type: 'S2C_ENEMY_DAMAGED',
        enemyId: enemy.id,
        newHp: enemy.hp,
        maxHp: enemy.maxHp,
        damageDealt: damage,
        isCrit,
        hitX: hitX || enemy.x,
        hitY: hitY || enemy.y,
        attackerId,
      });
      return;
    }

    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hitFlashTimer = 0.08;

    if (enemy.hp <= 0) {
      this.enemies.delete(enemy.id);
      this.hooks.broadcast({
        type: 'S2C_ENEMY_DEFEATED',
        enemyId: enemy.id,
        killerId: attackerId,
        dropX: enemy.x,
        dropY: enemy.y,
        kind: enemy.kind,
      });
    } else {
      this.hooks.broadcast({
        type: 'S2C_ENEMY_DAMAGED',
        enemyId: enemy.id,
        newHp: enemy.hp,
        maxHp: enemy.maxHp,
        damageDealt: damage,
        isCrit,
        hitX: hitX || enemy.x,
        hitY: hitY || enemy.y,
        attackerId,
      });
    }
  }

  public handleInteractProp(playerId: string, propId: number) {
    if (this.openedPropIds.has(propId)) return;

    const spawned = this.spawnedProps.get(propId);
    if (spawned && spawned.kind === 'CHEST') {
      spawned.opened = true;
      this.openedPropIds.add(propId);
      this.hooks.broadcast({
        type: 'S2C_PROP_OPENED',
        propId,
        kind: 'CHEST',
        x: spawned.x,
        y: spawned.y,
        openerId: playerId,
      });
      return;
    }

    const staticProp = this.world.props.find((pr) => pr.id === propId);
    if (staticProp) {
      if (staticProp.kind === 'CHEST' || staticProp.kind === 'SHRINE_ALTAR') {
        staticProp.opened = true;
        this.openedPropIds.add(propId);
        this.hooks.broadcast({
          type: 'S2C_PROP_OPENED',
          propId,
          kind: staticProp.kind,
          x: staticProp.x,
          y: staticProp.y,
          openerId: playerId,
        });
      }
    }
  }

  public handlePlayerDisconnect(playerId: string) {
    this.players.delete(playerId);
    this.checkPartyWipe();
  }

  public handleClaimVictory(): boolean {
    if (this.partyVictorySent) return false;
    this.partyVictorySent = true;
    this.hooks.broadcast({
      type: 'S2C_PARTY_VICTORY',
      difficulty: this.hooks.getDifficulty(),
      floorNumber: this.floorNumber,
    });
    return true;
  }

  private checkPartyWipe() {
    if (this.floorNumber <= 0 || this.partyWipedSent || this.partyVictorySent) return;
    if (this.players.size === 0) return;

    const allDowned = Array.from(this.players.values()).every((p) => p.isDowned);
    if (allDowned) {
      this.partyWipedSent = true;
      this.hooks.broadcast({
        type: 'S2C_PARTY_WIPE',
      });
    }
  }

  private spawnWaveForRoom(room: DungeonRoom) {
    const diffCfg = this.getDiffConfig();
    const { isStageBoss } = getStageAndFloor(this.floorNumber);
    const partyCount = Math.max(1, this.players.size);
    // Balanced co-op HP scaling (+35% per extra party member)
    const partyScaleMult = 1 + Math.max(0, partyCount - 1) * 0.35;

    const waveEnemies = spawnRoomWave(
      room,
      this.floorNumber,
      isStageBoss,
      diffCfg,
      this.rng,
      this.allocId,
      partyScaleMult
    );
    for (const enemy of waveEnemies) {
      this.enemies.set(enemy.id, enemy);
    }
  }

  public step(dt = 0.05) {
    this.ensurePartyPlayersSynced();

    // Update invulnerability & hit flash timers on players
    for (const p of this.players.values()) {
      p.invulnTimer = Math.max(0, p.invulnTimer - dt);
      p.hitFlashTimer = Math.max(0, p.hitFlashTimer - dt);
      p.isRevivingPlayerId = null;
    }

    // Proximity Revival Mechanics
    const livingPlayers = Array.from(this.players.values()).filter((p) => !p.isDowned);
    const downedPlayers = Array.from(this.players.values()).filter((p) => p.isDowned);

    for (const downed of downedPlayers) {
      downed.bleedoutTimer = Math.max(0, (downed.bleedoutTimer ?? 35) - dt);
      const rescuers = livingPlayers.filter(
        (ally) => distance(ally.x, ally.y, downed.x, downed.y) <= 92
      );
      if (rescuers.length > 0) {
        for (const r of rescuers) {
          r.isRevivingPlayerId = downed.id;
        }
        const rate = rescuers.length >= 2 ? 0.62 : 0.38;
        downed.reviveProgress = Math.min(1, (downed.reviveProgress ?? 0) + rate * dt);
        if (downed.reviveProgress >= 1) {
          downed.isDowned = false;
          downed.reviveProgress = 0;
          downed.bleedoutTimer = 0;
          downed.hp = Math.max(30, Math.round(downed.maxHp * 0.5));
          downed.invulnTimer = 2.5;
          this.hooks.broadcast({
            type: 'S2C_PLAYER_REVIVED',
            revivedPlayerId: downed.id,
            reviverPlayerId: rescuers[0].id,
            reviveHp: downed.hp,
            maxHp: downed.maxHp,
          });
        }
      } else {
        downed.reviveProgress = Math.max(0, (downed.reviveProgress ?? 0) - 0.14 * dt);
      }
    }

    this.checkPartyWipe();
    if (this.partyWipedSent || this.partyVictorySent) return;

    // Sanctuary Guild Hall logic
    if (this.floorNumber === 0) {
      if (this.dummyRegenTimer > 0) {
        this.dummyRegenTimer -= dt;
        if (this.dummyRegenTimer <= 0) {
          for (const e of this.enemies.values()) {
            if (e.kind === EnemyKind.TrainingDummy) {
              e.hp = e.maxHp;
            }
          }
        }
      }
      for (const e of this.enemies.values()) {
        e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      }
      return;
    }

    // Discover rooms as players explore
    for (const p of this.players.values()) {
      for (const r of this.world.rooms) {
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
          r.discovered = true;
        }
      }
    }

    // Trigger combat room lock & Wave 1 when any living party member steps inside
    if (this.activeRoomId === null) {
      const margin = 44;
      for (const p of livingPlayers) {
        const entered = this.world.rooms.find(
          (r) =>
            !r.cleared &&
            r.wavesRemaining > 0 &&
            p.x >= r.x + margin &&
            p.x <= r.x + r.w - margin &&
            p.y >= r.y + margin &&
            p.y <= r.y + r.h - margin
        );
        if (entered) {
          entered.locked = true;
          entered.discovered = true;
          this.activeRoomId = entered.id;
          this.totalWaves = entered.wavesRemaining;
          this.currentWave = 1;
          entered.wavesRemaining -= 1;

          // Pull any teammates outside this room inside the iron gates so the party fights together
          const pullX = entered.x + entered.w / 2;
          const pullY = entered.y + entered.h * 0.72;
          let pulledAnyone = false;
          for (const member of this.players.values()) {
            const inside =
              member.x >= entered.x + 26 &&
              member.x <= entered.x + entered.w - 26 &&
              member.y >= entered.y + 26 &&
              member.y <= entered.y + entered.h - 26;
            if (!inside) {
              member.x = pullX;
              member.y = pullY;
              pulledAnyone = true;
            }
          }
          if (pulledAnyone) {
            this.hooks.broadcast({
              type: 'S2C_PARTY_ROOM_PULL',
              roomId: entered.id,
              x: pullX,
              y: pullY,
            });
          }

          this.spawnWaveForRoom(entered);

          const { isStageBoss } = getStageAndFloor(this.floorNumber);
          let bannerText = `Wave ${this.currentWave}/${this.totalWaves} — Gates Sealed!`;
          let isBoss = false;
          if (entered.kind === RoomKind.Boss) {
            if (isStageBoss) {
              const info = getBossInfoForFloor(this.floorNumber);
              bannerText = `${info.name} — ${info.subtitle}`;
              isBoss = true;
            } else {
              bannerText = 'Crypt Gatekeepers Awaken!';
            }
          }
          this.hooks.broadcast({
            type: 'S2C_WAVE_EVENT',
            roomId: entered.id,
            bannerText,
            currentWave: this.currentWave,
            totalWaves: this.totalWaves,
            isBoss,
          });
          break;
        }
      }
    }

    // Step authoritative enemies and enemy projectiles
    this.stepEnemies(dt, livingPlayers);
    this.stepEnemyProjectiles(dt, livingPlayers);

    // Check shared wave progression & room clear
    if (this.activeRoomId !== null) {
      const activeRoom = this.world.rooms.find((r) => r.id === this.activeRoomId);
      if (activeRoom && this.enemies.size === 0) {
        if (activeRoom.wavesRemaining > 0) {
          this.currentWave += 1;
          activeRoom.wavesRemaining -= 1;
          this.spawnWaveForRoom(activeRoom);
          this.hooks.broadcast({
            type: 'S2C_WAVE_EVENT',
            roomId: activeRoom.id,
            bannerText: `Wave ${this.currentWave}/${this.totalWaves} Incoming!`,
            currentWave: this.currentWave,
            totalWaves: this.totalWaves,
          });
        } else {
          activeRoom.locked = false;
          activeRoom.cleared = true;
          const clearedId = activeRoom.id;
          this.activeRoomId = null;

          // Rally any downed teammates upon clearing the room
          for (const p of this.players.values()) {
            if (p.isDowned) {
              p.isDowned = false;
              p.reviveProgress = 0;
              p.bleedoutTimer = 0;
              p.hp = Math.max(25, Math.round(p.maxHp * 0.35));
              p.invulnTimer = 2.0;
              this.hooks.broadcast({
                type: 'S2C_PLAYER_REVIVED',
                revivedPlayerId: p.id,
                reviverPlayerId: p.id,
                reviveHp: p.hp,
                maxHp: p.maxHp,
              });
            }
          }

          const cx = activeRoom.x + activeRoom.w / 2;
          const cy = activeRoom.y + activeRoom.h / 2;
          const propId = this.allocId();
          const { isStageBoss } = getStageAndFloor(this.floorNumber);
          let bannerText = 'Room Cleared!';

          if (activeRoom.kind === RoomKind.Boss) {
            this.spawnedProps.set(propId, {
              id: propId,
              kind: 'PORTAL_ARCH',
              x: cx,
              y: cy - 10,
              w: 84,
              h: 96,
            });
            if (isStageBoss) {
              const info = getBossInfoForFloor(this.floorNumber);
              const diffCfg = this.getDiffConfig();
              bannerText =
                this.floorNumber >= diffCfg.maxFloors
                  ? `${info.name} Vanquished! Enter Portal to Claim Party Victory!`
                  : `${info.name} Defeated! Portal Unlocked!`;
            } else {
              bannerText = 'Descent Portal Unlocked!';
            }
          } else {
            this.spawnedProps.set(propId, {
              id: propId,
              kind: 'CHEST',
              x: cx,
              y: cy,
              w: 44,
              h: 36,
              opened: false,
            });
          }

          this.hooks.broadcast({
            type: 'S2C_WAVE_EVENT',
            roomId: clearedId,
            bannerText,
            currentWave: this.totalWaves,
            totalWaves: this.totalWaves,
            isCleared: true,
          });
        }
      }
    }
  }

  private findNearestLivingPlayer(x: number, y: number, living: ServerPlayerState[]): ServerPlayerState | null {
    if (living.length === 0) return null;
    let best = living[0];
    let bestD = distance(x, y, best.x, best.y);
    for (let i = 1; i < living.length; i++) {
      const cand = living[i];
      const d = distance(x, y, cand.x, cand.y);
      if (d < bestD) {
        best = cand;
        bestD = d;
      }
    }
    return best;
  }

  private stepEnemies(dt: number, livingPlayers: ServerPlayerState[]) {
    this.dotAccum += dt;
    const triggerDotTick = this.dotAccum >= 0.75;
    if (triggerDotTick) {
      this.dotAccum -= 0.75;
    }

    const diffCfg = this.getDiffConfig();

    for (const enemy of Array.from(this.enemies.values())) {
      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);

      if (enemy.slowTimer > 0) {
        enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
        if (enemy.slowTimer <= 0) enemy.slowFactor = 1;
      }
      if (enemy.stunTimer > 0) enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
      if (enemy.rootTimer > 0) enemy.rootTimer = Math.max(0, enemy.rootTimer - dt);
      if (enemy.fearTimer > 0) enemy.fearTimer = Math.max(0, enemy.fearTimer - dt);
      if (enemy.vulnerableTimer > 0) enemy.vulnerableTimer = Math.max(0, enemy.vulnerableTimer - dt);
      if (enemy.plagueTimer > 0) enemy.plagueTimer = Math.max(0, enemy.plagueTimer - dt);
      if (enemy.infectionTimer > 0) {
        enemy.infectionTimer = Math.max(0, enemy.infectionTimer - dt);
        if (enemy.infectionTimer <= 0) enemy.infectionStacks = 0;
      }

      // Authoritative DoT tick (Zombie infection & plague)
      if (triggerDotTick && (enemy.infectionStacks > 0 || enemy.plagueTimer > 0)) {
        const dotDmg =
          (enemy.infectionStacks > 0 ? enemy.infectionStacks * 6 : 0) +
          (enemy.plagueTimer > 0 ? 14 : 0);
        if (dotDmg > 0 && enemy.kind !== EnemyKind.TrainingDummy) {
          enemy.hp = Math.max(0, enemy.hp - dotDmg);
          enemy.hitFlashTimer = 0.06;
          const creditId = livingPlayers[0]?.id ?? '';
          if (enemy.hp <= 0) {
            this.enemies.delete(enemy.id);
            this.hooks.broadcast({
              type: 'S2C_ENEMY_DEFEATED',
              enemyId: enemy.id,
              killerId: creditId,
              dropX: enemy.x,
              dropY: enemy.y,
              kind: enemy.kind,
            });
            continue;
          } else {
            this.hooks.broadcast({
              type: 'S2C_ENEMY_DAMAGED',
              enemyId: enemy.id,
              newHp: enemy.hp,
              maxHp: enemy.maxHp,
              damageDealt: dotDmg,
              isCrit: false,
              hitX: enemy.x,
              hitY: enemy.y,
              attackerId: creditId,
            });
          }
        }
      }

      if (enemy.stunTimer > 0) {
        enemy.vx = 0;
        enemy.vy = 0;
        continue;
      }

      const target = this.findNearestLivingPlayer(enemy.x, enemy.y, livingPlayers);
      if (!target) {
        enemy.vx = 0;
        enemy.vy = 0;
        continue;
      }

      if (enemy.fearTimer > 0) {
        const awayAng = Math.atan2(enemy.y - target.y, enemy.x - target.x);
        const spd = enemy.rootTimer > 0 ? 0 : enemy.speed * 0.85;
        enemy.vx = Math.cos(awayAng) * spd;
        enemy.vy = Math.sin(awayAng) * spd;
        enemy.facingX = enemy.vx >= 0 ? 1 : -1;
        enemy.telegraphType = 'NONE';
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        this.constrainEnemyToRoom(enemy);
        continue;
      }

      const slowMult = enemy.rootTimer > 0 ? 0 : enemy.slowTimer > 0 ? enemy.slowFactor : 1;
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      const angToTarget = Math.atan2(dy, dx);
      if (Math.abs(dx) > 4) enemy.facingX = dx >= 0 ? 1 : -1;

      if (enemy.kind === EnemyKind.SkeletonWarrior) {
        this.stepWarriorAi(enemy, dt, dist, angToTarget, slowMult, diffCfg);
      } else if (enemy.kind === EnemyKind.SkeletonArcher) {
        this.stepArcherAi(enemy, dt, dist, angToTarget, slowMult, diffCfg);
      } else if (enemy.kind === EnemyKind.SkeletonBoss) {
        this.stepBossAi(enemy, dt, dist, angToTarget, slowMult, diffCfg, livingPlayers);
      }

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      this.constrainEnemyToRoom(enemy);
    }
  }

  private stepWarriorAi(
    e: EnemyEntity,
    dt: number,
    dist: number,
    angToPlayer: number,
    slowMult: number,
    diffCfg: DifficultyConfig
  ) {
    if (e.aiState === 'WINDUP') {
      e.vx = 0;
      e.vy = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'COOLDOWN';
        e.stateTimer = 0.35;
        e.attackCooldown = 1.15 * diffCfg.enemyAttackCooldownMult;
        e.telegraphType = 'NONE';

        const lungeX = e.x + Math.cos(e.telegraphAngle) * 14;
        const lungeY = e.y + Math.sin(e.telegraphAngle) * 14;
        e.x = lungeX;
        e.y = lungeY;

        this.hooks.broadcast({
          type: 'S2C_ENEMY_ATTACK_FX',
          kind: 'WARRIOR_SLASH',
          x: e.x,
          y: e.y,
          angle: e.telegraphAngle,
        });

        const baseDmg = Math.round((16 + this.floorNumber * 2.5) * diffCfg.enemyDamageMult);
        for (const p of this.players.values()) {
          if (p.isDowned) continue;
          const pDist = distance(e.x, e.y, p.x, p.y);
          const pAng = Math.atan2(p.y - e.y, p.x - e.x);
          if (pDist <= 74 && Math.abs(normalizeAngleDiff(pAng, e.telegraphAngle)) <= 0.85) {
            this.damageServerPlayer(p, baseDmg, false);
          }
        }
      }
      return;
    }

    if (e.aiState === 'COOLDOWN') {
      e.vx = 0;
      e.vy = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.aiState = 'CHASE';
      return;
    }

    if (dist <= 62 && e.attackCooldown <= 0) {
      e.aiState = 'WINDUP';
      e.stateTimer = Math.max(0.28, 0.44 * diffCfg.enemyAttackCooldownMult);
      e.telegraphAngle = angToPlayer;
      e.telegraphType = 'SLASH';
      e.vx = 0;
      e.vy = 0;
    } else {
      e.aiState = 'CHASE';
      e.vx = Math.cos(angToPlayer) * e.speed * slowMult;
      e.vy = Math.sin(angToPlayer) * e.speed * slowMult;
    }
  }

  private stepArcherAi(
    e: EnemyEntity,
    dt: number,
    dist: number,
    angToPlayer: number,
    slowMult: number,
    diffCfg: DifficultyConfig
  ) {
    if (e.aiState === 'WINDUP') {
      e.vx = 0;
      e.vy = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        e.aiState = 'COOLDOWN';
        e.stateTimer = 0.45;
        e.attackCooldown = 1.65 * diffCfg.enemyAttackCooldownMult;
        e.telegraphType = 'NONE';

        const arrowSpeed = 350 * (diffCfg.enemySpeedMult > 1 ? 1.08 : 1);
        const dmg = Math.round((14 + this.floorNumber * 2.2) * diffCfg.enemyDamageMult);
        this.enemyProjectiles.push({
          id: this.allocId(),
          x: e.x + Math.cos(e.telegraphAngle) * 18,
          y: e.y - 10 + Math.sin(e.telegraphAngle) * 18,
          vx: Math.cos(e.telegraphAngle) * arrowSpeed,
          vy: Math.sin(e.telegraphAngle) * arrowSpeed,
          radius: 7,
          damage: dmg,
          kind: 'BONE_ARROW',
          color: '#E7E0D0',
          angle: e.telegraphAngle,
          life: 1.8,
        });

        this.hooks.broadcast({
          type: 'S2C_ENEMY_ATTACK_FX',
          kind: 'ARCHER_SHOT',
          x: e.x,
          y: e.y,
          angle: e.telegraphAngle,
        });
      }
      return;
    }

    if (e.aiState === 'COOLDOWN') {
      e.vx = 0;
      e.vy = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.aiState = 'CHASE';
      return;
    }

    if (dist < 145) {
      e.vx = -Math.cos(angToPlayer) * e.speed * 0.9 * slowMult;
      e.vy = -Math.sin(angToPlayer) * e.speed * 0.9 * slowMult;
    } else if (dist > 280) {
      e.vx = Math.cos(angToPlayer) * e.speed * slowMult;
      e.vy = Math.sin(angToPlayer) * e.speed * slowMult;
    } else {
      e.vx = Math.cos(angToPlayer + Math.PI / 2) * e.speed * 0.45 * slowMult;
      e.vy = Math.sin(angToPlayer + Math.PI / 2) * e.speed * 0.45 * slowMult;
    }

    if (dist <= 360 && e.attackCooldown <= 0) {
      e.aiState = 'WINDUP';
      e.stateTimer = Math.max(0.36, 0.56 * diffCfg.enemyAttackCooldownMult);
      e.telegraphAngle = angToPlayer;
      e.telegraphType = 'AIM_ARROW';
      e.vx = 0;
      e.vy = 0;
    }
  }

  private stepBossAi(
    e: EnemyEntity,
    dt: number,
    dist: number,
    angToPlayer: number,
    slowMult: number,
    diffCfg: DifficultyConfig,
    livingPlayers: ServerPlayerState[]
  ) {
    if (e.bossPhase === 1 && e.hp <= e.maxHp * 0.5) {
      e.bossPhase = 2;
      e.speed *= 1.18;
    }

    if (e.aiState === 'WHIRLWIND') {
      e.stateTimer -= dt;
      const dashSpd = (255 + (e.bossPhase === 2 ? 45 : 0)) * slowMult;
      e.vx = Math.cos(e.telegraphAngle) * dashSpd;
      e.vy = Math.sin(e.telegraphAngle) * dashSpd;

      const spinDmg = Math.round((18 + this.floorNumber * 2.4) * diffCfg.enemyDamageMult);
      for (const p of livingPlayers) {
        if (distance(e.x, e.y, p.x, p.y) <= e.radius + 36) {
          this.damageServerPlayer(p, spinDmg, false);
        }
      }

      if (e.stateTimer <= 0) {
        e.aiState = 'COOLDOWN';
        e.stateTimer = 0.5;
        e.attackCooldown = (e.bossPhase === 2 ? 0.95 : 1.25) * diffCfg.enemyAttackCooldownMult;
        e.telegraphType = 'NONE';
      }
      return;
    }

    if (e.aiState === 'WINDUP') {
      e.vx = 0;
      e.vy = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) {
        const tType = e.telegraphType;
        e.telegraphType = 'NONE';

        if (tType === 'BOSS_CLEAVE') {
          const cleaveDmg = Math.round((26 + this.floorNumber * 3.2) * diffCfg.enemyDamageMult);
          this.hooks.broadcast({
            type: 'S2C_ENEMY_ATTACK_FX',
            kind: 'BOSS_CLEAVE',
            x: e.x,
            y: e.y,
            angle: e.telegraphAngle,
          });
          for (const p of livingPlayers) {
            const pDist = distance(e.x, e.y, p.x, p.y);
            const pAng = Math.atan2(p.y - e.y, p.x - e.x);
            if (pDist <= 135 && Math.abs(normalizeAngleDiff(pAng, e.telegraphAngle)) <= 1.05) {
              this.damageServerPlayer(p, cleaveDmg, false);
            }
          }
          e.aiState = 'COOLDOWN';
          e.stateTimer = 0.45;
          e.attackCooldown = (e.bossPhase === 2 ? 0.9 : 1.25) * diffCfg.enemyAttackCooldownMult;
        } else if (tType === 'BOSS_VOLLEY') {
          const count = e.bossPhase === 2 ? 12 : 8;
          const boltSpd = 290 * (e.bossPhase === 2 ? 1.15 : 1);
          const boltDmg = Math.round((18 + this.floorNumber * 2.5) * diffCfg.enemyDamageMult);
          for (let i = 0; i < count; i++) {
            const a = e.telegraphAngle + (i / count) * Math.PI * 2;
            this.enemyProjectiles.push({
              id: this.allocId(),
              x: e.x + Math.cos(a) * 26,
              y: e.y - 12 + Math.sin(a) * 26,
              vx: Math.cos(a) * boltSpd,
              vy: Math.sin(a) * boltSpd,
              radius: 9,
              damage: boltDmg,
              kind: 'BOSS_BOLT',
              color: e.bossPhase === 2 ? '#C084FC' : '#F87171',
              angle: a,
              life: 2.2,
            });
          }
          this.hooks.broadcast({
            type: 'S2C_ENEMY_ATTACK_FX',
            kind: 'BOSS_VOLLEY',
            x: e.x,
            y: e.y,
            angle: e.telegraphAngle,
          });
          e.aiState = 'COOLDOWN';
          e.stateTimer = 0.5;
          e.attackCooldown = (e.bossPhase === 2 ? 1.0 : 1.35) * diffCfg.enemyAttackCooldownMult;
        } else if (tType === 'BOSS_SUMMON') {
          const { stage } = getStageAndFloor(this.floorNumber);
          if (this.enemies.size < 12) {
            const minionCount = e.bossPhase === 2 ? 3 : 2;
            for (let m = 0; m < minionCount; m++) {
              const ma = (m / minionCount) * Math.PI * 2 + this.rng();
              const mx = e.x + Math.cos(ma) * 90;
              const my = e.y + Math.sin(ma) * 75;
              const kind = m % 2 === 0 ? EnemyKind.SkeletonWarrior : EnemyKind.SkeletonArcher;
              const minion = createProceduralSkeleton(
                kind,
                mx,
                my,
                e.roomId,
                1 + (this.floorNumber - 1) * 0.2,
                diffCfg,
                stage,
                this.rng,
                this.allocId()
              );
              this.constrainEnemyToRoom(minion);
              this.enemies.set(minion.id, minion);
            }
          }
          this.hooks.broadcast({
            type: 'S2C_ENEMY_ATTACK_FX',
            kind: 'BOSS_SUMMON',
            x: e.x,
            y: e.y,
            angle: 0,
          });
          e.aiState = 'COOLDOWN';
          e.stateTimer = 0.55;
          e.attackCooldown = 1.5 * diffCfg.enemyAttackCooldownMult;
        } else if (tType === 'BOSS_DASH') {
          this.hooks.broadcast({
            type: 'S2C_ENEMY_ATTACK_FX',
            kind: 'BOSS_DASH',
            x: e.x,
            y: e.y,
            angle: e.telegraphAngle,
          });
          e.aiState = 'WHIRLWIND';
          e.stateTimer = 0.72;
        }
      }
      return;
    }

    if (e.aiState === 'COOLDOWN') {
      e.vx = 0;
      e.vy = 0;
      e.stateTimer -= dt;
      if (e.stateTimer <= 0) e.aiState = 'CHASE';
      return;
    }

    if (e.attackCooldown <= 0) {
      const pattern = e.bossPatternIndex % 4;
      e.bossPatternIndex += 1;
      e.aiState = 'WINDUP';
      e.telegraphAngle = angToPlayer;
      e.vx = 0;
      e.vy = 0;

      if (pattern === 0 && dist <= 155) {
        e.telegraphType = 'BOSS_CLEAVE';
        e.stateTimer = 0.56;
      } else if (pattern === 1) {
        e.telegraphType = 'BOSS_VOLLEY';
        e.stateTimer = 0.62;
      } else if (pattern === 2 && this.enemies.size < 9) {
        e.telegraphType = 'BOSS_SUMMON';
        e.stateTimer = 0.68;
      } else {
        e.telegraphType = 'BOSS_DASH';
        e.stateTimer = 0.54;
      }
      return;
    }

    e.aiState = 'CHASE';
    e.vx = Math.cos(angToPlayer) * e.speed * slowMult;
    e.vy = Math.sin(angToPlayer) * e.speed * slowMult;
  }

  private stepEnemyProjectiles(dt: number, livingPlayers: ServerPlayerState[]) {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const pr = this.enemyProjectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;

      if (pr.life <= 0 || !this.isPointWalkable(pr.x, pr.y, pr.radius)) {
        this.enemyProjectiles.splice(i, 1);
        continue;
      }

      let hitPlayer = false;
      for (const p of livingPlayers) {
        if (p.isDowned) continue;
        if (distance(pr.x, pr.y, p.x, p.y) <= pr.radius + 17) {
          this.damageServerPlayer(p, pr.damage, true);
          hitPlayer = true;
          break;
        }
      }
      if (hitPlayer) {
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  private damageServerPlayer(player: ServerPlayerState, rawAmount: number, isProjectile: boolean) {
    if (player.isDowned || player.invulnTimer > 0 || this.floorNumber <= 0) return;

    // Evasion calculation preserving hero passives & buffs
    let evadeChance = 0;
    if (player.characterId === CharacterId.Goblin) evadeChance += 0.25;
    if (player.characterId === CharacterId.Ghost) evadeChance += 0.24;
    if (player.characterId === CharacterId.Kobold) evadeChance += 0.14;
    if (player.activeBuffs.windrunner) evadeChance += 0.45;
    if (player.activeBuffs.restless) evadeChance += 0.18;
    evadeChance = Math.min(0.75, evadeChance);

    if (evadeChance > 0 && this.rng() < evadeChance) {
      player.invulnTimer = 0.28;
      this.hooks.broadcast({
        type: 'S2C_PLAYER_DAMAGED',
        targetPlayerId: player.id,
        damage: 0,
        newHp: player.hp,
        maxHp: player.maxHp,
        evaded: true,
        isProjectile,
      });
      return;
    }

    let mult = 1.0;
    let ribBlocked = false;

    if (player.characterId === CharacterId.Gnome) mult *= 0.78;
    if (player.characterId === CharacterId.Zombie) mult *= 0.88;
    if (player.characterId === CharacterId.Skeleton && isProjectile) mult *= 0.65;
    if (player.characterId === CharacterId.Ghost) mult *= 0.88;

    if (player.activeBuffs.ribcageCharges > 0) {
      player.activeBuffs.ribcageCharges = Math.max(0, player.activeBuffs.ribcageCharges - 1);
      mult *= 0.2;
      ribBlocked = true;
    }
    if (player.activeBuffs.undying) mult *= 0.55;
    if (player.activeBuffs.abomination) mult *= 0.5;
    if (player.activeBuffs.boneStorm) mult *= 0.7;
    if (player.activeBuffs.colossus) mult *= 0.6;
    if (player.activeBuffs.fortress) mult *= 0.45;
    if (player.activeBuffs.mountainHeart) mult *= 0.35;

    const finalDmg = Math.max(1, Math.round(rawAmount * mult));
    player.hp = Math.max(0, player.hp - finalDmg);
    player.hitFlashTimer = 0.12;
    player.invulnTimer = 0.45;

    this.hooks.broadcast({
      type: 'S2C_PLAYER_DAMAGED',
      targetPlayerId: player.id,
      damage: finalDmg,
      newHp: player.hp,
      maxHp: player.maxHp,
      ribBlocked,
      isProjectile,
    });

    if (player.hp <= 0) {
      // Zombie Undying Fury keeps Zombie standing at 1 HP while active
      if (player.characterId === CharacterId.Zombie && player.activeBuffs.undying) {
        player.hp = 1;
        return;
      }

      player.isDowned = true;
      player.bleedoutTimer = 35;
      player.reviveProgress = 0;
      this.hooks.broadcast({
        type: 'S2C_PLAYER_DOWNED',
        playerId: player.id,
        playerName: player.name,
      });
      this.checkPartyWipe();
    }
  }

  private constrainEnemyToRoom(enemy: EnemyEntity) {
    const room = this.world.rooms.find((r) => r.id === enemy.roomId);
    if (!room) return;
    const pad = enemy.radius + 26;
    enemy.x = clamp(enemy.x, room.x + pad, room.x + room.w - pad);
    enemy.y = clamp(enemy.y, room.y + pad, room.y + room.h - pad);
  }

  private isPointWalkable(x: number, y: number, radius: number): boolean {
    for (const r of this.world.rooms) {
      if (
        x >= r.x + radius + 18 &&
        x <= r.x + r.w - radius - 18 &&
        y >= r.y + radius + 18 &&
        y <= r.y + r.h - radius - 18
      ) {
        return true;
      }
    }
    for (const c of this.world.corridors) {
      if (x >= c.x + radius && x <= c.x + c.w - radius && y >= c.y + radius && y <= c.y + c.h - radius) {
        return true;
      }
    }
    return false;
  }

  public buildWorldSyncMessage(): ServerMessage {
    const playersList: PlayerTransformSync[] = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      aimAngle: p.aimAngle,
      facingX: p.facingX,
      walkPhase: p.walkPhase,
      hp: p.hp,
      maxHp: p.maxHp,
      hitFlashTimer: p.hitFlashTimer,
      squashX: p.squashX,
      squashY: p.squashY,
      dashTimer: p.dashTimer,
      leapAirProgress: p.leapAirProgress,
      isAttacking: p.isAttacking,
      comboStep: p.comboStep,
      comboFlip: p.comboFlip,
      isDowned: p.isDowned,
      bleedoutTimer: p.bleedoutTimer,
      reviveProgress: p.reviveProgress,
      isRevivingPlayerId: p.isRevivingPlayerId,
      activeBuffs: p.activeBuffs,
    }));

    const enemiesList: EnemySyncState[] = Array.from(this.enemies.values()).map((e) => ({
      id: e.id,
      kind: e.kind,
      x: e.x,
      y: e.y,
      vx: e.vx,
      vy: e.vy,
      hp: e.hp,
      maxHp: e.maxHp,
      facingX: e.facingX,
      aiState: e.aiState,
      telegraphType: e.telegraphType,
      telegraphAngle: e.telegraphAngle,
      hitFlashTimer: e.hitFlashTimer,
      stunTimer: e.stunTimer,
      slowTimer: e.slowTimer,
      rootTimer: e.rootTimer,
      fearTimer: e.fearTimer,
      vulnerableTimer: e.vulnerableTimer,
      plagueTimer: e.plagueTimer,
      infectionStacks: e.infectionStacks,
      roomId: e.roomId,
      bossPhase: e.bossPhase,
    }));

    const roomsState: RoomProgressSyncState[] = this.world.rooms.map((r) => ({
      id: r.id,
      discovered: r.discovered,
      locked: r.locked,
      cleared: r.cleared,
      wavesRemaining: r.wavesRemaining,
    }));

    const activeRoom =
      this.activeRoomId !== null
        ? this.world.rooms.find((r) => r.id === this.activeRoomId)
        : undefined;

    return {
      type: 'S2C_SYNC_WORLD',
      players: playersList,
      enemies: enemiesList,
      enemyProjectiles: this.enemyProjectiles.map((pr) => ({
        id: pr.id,
        x: pr.x,
        y: pr.y,
        vx: pr.vx,
        vy: pr.vy,
        radius: pr.radius,
        damage: pr.damage,
        kind: pr.kind,
        color: pr.color,
        angle: pr.angle,
      })),
      roomsState,
      spawnedProps: Array.from(this.spawnedProps.values()),
      brokenPropIds: Array.from(this.brokenPropIds),
      activeRoomId: this.activeRoomId ?? undefined,
      wavesRemaining: activeRoom?.wavesRemaining ?? 0,
      currentWave: this.currentWave,
      totalWaves: this.totalWaves,
    };
  }
}
