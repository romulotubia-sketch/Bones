/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundEngine } from '../audio/soundEngine';
import {
  CharacterId,
  EnemyEntity,
  EnemyKind,
  UltimateSkillId,
} from '../types/game';

export interface ToxicPuddle {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  damageTick: number;
}

export interface OrbitingDagger {
  angle: number;
  dist: number;
  speed: number;
}

export interface OrbitingSoulWisp {
  angle: number;
  dist: number;
}

export interface CursedCoinMarker {
  enemyId: number;
  coins: number;
}

export interface ExecutionTarget {
  enemyId: number;
  x: number;
  y: number;
  timeRemaining: number;
}

export interface LaserConstellationNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface AwakenedSummonEntity {
  id: number;
  kind:
    | 'COMMANDER_BLADES'
    | 'COMMANDER_GRAVES'
    | 'COMMANDER_SHADOWS'
    | 'REVENANT_WARRIOR'
    | 'PLAGUE_RUNNER'
    | 'MINI_ZOMBIE'
    | 'GENERAL_SWORDSMAN'
    | 'GENERAL_SPEARMAN'
    | 'GENERAL_ARCHER'
    | 'GENERAL_SHIELDBEARER'
    | 'BONE_FORTRESS'
    | 'GOBLIN_MIRAGE'
    | 'STONE_GUARDIAN'
    | 'NIGHTMARE_BEAST'
    | 'SPIRIT_MONARCH_BEAST'
    | 'SPIRIT_MONARCH_WARLORD'
    | 'SPIRIT_MONARCH_SOVEREIGN'
    | 'MECHANICAL_MECH'
    | 'CLOCKWORK_PILLBOX';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  life: number;
  attackTimer: number;
  facingX: number;
  name: string;
  color: string;
}

export class AwakeningEngine {
  // Zombie Awakened States
  public plagueBehemothTimer = 0;
  public fleshColossusTimer = 0;
  public fleshAbsorbStacks = 0;
  public graveyardAwakeningTimer = 0;
  public toxicPuddles: ToxicPuddle[] = [];
  public orbitingSouls: OrbitingSoulWisp[] = [];

  // Skeleton Awakened States
  public ancientBoneTitanTimer = 0;
  public boneDragonTimer = 0;
  public boneDragonBreathTimer = 0;
  public soulSeveranceTimer = 0;
  public blackReaperTimer = 0;
  public blackReaperRunes: { x: number; y: number; life: number }[] = [];

  // Goblin Awakened States
  public phantomExecutionerTargets: { x: number; y: number; enemyId: number }[] = [];
  public executionerStep = 0;
  public executionerTimer = 0;
  public executionerOriginX = 0;
  public executionerOriginY = 0;
  public bladeCycloneTimer = 0;
  public bladeCycloneDaggers: OrbitingDagger[] = [];
  public constellationNodes: LaserConstellationNode[] = [];
  public constellationTimer = 0;
  public cursedCoins: CursedCoinMarker[] = [];

  // Gnome Awakened States
  public worldbreakerTimer = 0;
  public worldbreakerTremorTick = 0;
  public eternalMountainTimer = 0;
  public greatDivideTimer = 0;
  public volcanicMagmaPools: { x: number; y: number; radius: number; life: number }[] = [];
  public gravitySingularity: { x: number; y: number; life: number; radius: number } | null = null;

  // Ghost Awakened States
  public hauntedDimensionTimer = 0;
  public underworldGate: { x: number; y: number; life: number; maxLife: number } | null = null;
  public soulCataclysmSpirits: { x: number; y: number; targetX: number; targetY: number; progress: number }[] = [];

  // Kobold Awakened States
  public spectralDragon: {
    x: number;
    y: number;
    angle: number;
    speed: number;
    life: number;
    breathTick: number;
  } | null = null;
  public skyfallBombardmentTimer = 0;
  public skyfallBombardmentTick = 0;
  public clockworkTripwires: { x1: number; y1: number; x2: number; y2: number }[] = [];
  public forbiddenWeaponTimer = 0;
  public forbiddenShotIndex = 0;
  public perfectShotStance = false;
  public perfectShotAimTimer = 0;

  // Active Awakened Summons
  public summons: AwakenedSummonEntity[] = [];

  public resetAll(): void {
    this.plagueBehemothTimer = 0;
    this.fleshColossusTimer = 0;
    this.fleshAbsorbStacks = 0;
    this.graveyardAwakeningTimer = 0;
    this.toxicPuddles = [];
    this.orbitingSouls = [];

    this.ancientBoneTitanTimer = 0;
    this.boneDragonTimer = 0;
    this.boneDragonBreathTimer = 0;
    this.soulSeveranceTimer = 0;
    this.blackReaperTimer = 0;
    this.blackReaperRunes = [];

    this.phantomExecutionerTargets = [];
    this.bladeCycloneTimer = 0;
    this.bladeCycloneDaggers = [];
    this.constellationNodes = [];
    this.constellationTimer = 0;
    this.cursedCoins = [];

    this.worldbreakerTimer = 0;
    this.eternalMountainTimer = 0;
    this.greatDivideTimer = 0;
    this.volcanicMagmaPools = [];
    this.gravitySingularity = null;

    this.hauntedDimensionTimer = 0;
    this.underworldGate = null;
    this.soulCataclysmSpirits = [];

    this.spectralDragon = null;
    this.skyfallBombardmentTimer = 0;
    this.clockworkTripwires = [];
    this.forbiddenWeaponTimer = 0;
    this.perfectShotStance = false;

    this.summons = [];
  }

  // =========================================================================
  // TRIGGER AWAKENED ULTIMATE
  // =========================================================================
  public triggerAwakened(
    charId: CharacterId,
    ultId: UltimateSkillId,
    path: 'PATH_A' | 'PATH_B',
    player: { x: number; y: number; aimAngle: number; hp: number; maxHp: number },
    enemies: EnemyEntity[],
    callbacks: {
      spawnPopup: (x: number, y: number, text: string, color: string, scale?: number) => void;
      spawnBurst: (x: number, y: number, color: string, count: number, speed: number) => void;
      dealAoEDamage: (x: number, y: number, radius: number, damage: number, isCrit?: boolean) => void;
    }
  ): void {
    // === 1. ZOMBIE ===
    if (charId === CharacterId.Zombie) {
      if (ultId === UltimateSkillId.AbominationForm) {
        if (path === 'PATH_A') {
          // Plague Behemoth
          this.plagueBehemothTimer = 14.0;
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'PLAGUE BEHEMOTH!', '#4ADE80', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 180, 55, true);
        } else {
          // Flesh Colossus
          this.fleshColossusTimer = 15.0;
          this.fleshAbsorbStacks = 0;
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'FLESH COLOSSUS!', '#34D399', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 190, 60, true);
        }
      } else if (ultId === UltimateSkillId.KingdomOfTheDead) {
        if (path === 'PATH_A') {
          // The Undying Kingdom: 3 Commanders
          soundEngine.playSummon();
          callbacks.spawnPopup(player.x, player.y - 45, 'THE UNDYING KINGDOM!', '#86EFAC', 1.25);
          this.spawnCommander('COMMANDER_BLADES', player.x - 45, player.y - 20, 'General of Blades', '#4ADE80');
          this.spawnCommander('COMMANDER_GRAVES', player.x + 45, player.y - 20, 'General of Graves', '#A3E635');
          this.spawnCommander('COMMANDER_SHADOWS', player.x, player.y + 40, 'General of Shadows', '#C084FC');
        } else {
          // Graveyard Awakening
          this.graveyardAwakeningTimer = 16.0;
          soundEngine.playSummon();
          callbacks.spawnPopup(player.x, player.y - 45, 'GRAVEYARD AWAKENING!', '#6EE7B7', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 220, 40, false);
        }
      } else if (ultId === UltimateSkillId.DeathsEmbrace) {
        if (path === 'PATH_A') {
          // Plague Rebirth
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'PLAGUE REBIRTH!', '#A3E635', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 280, 85, true);
          // Spawn 3 mini zombies immediately
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI * 2) / 3;
            this.spawnMiniZombie(player.x + Math.cos(a) * 35, player.y + Math.sin(a) * 35);
          }
        } else {
          // Soul Devourer: Orbiting Soul Missiles
          soundEngine.playHeal();
          callbacks.spawnPopup(player.x, player.y - 45, 'SOUL DEVOURER!', '#2DD4BF', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 200, 65, false);
          this.orbitingSouls = [];
          for (let i = 0; i < 6; i++) {
            this.orbitingSouls.push({ angle: (i * Math.PI * 2) / 6, dist: 42 });
          }
        }
      }
    }

    // === 2. SKELETON ===
    else if (charId === CharacterId.Skeleton) {
      if (ultId === UltimateSkillId.BoneColossus) {
        if (path === 'PATH_A') {
          // Ancient Bone Titan (6 Arms)
          this.ancientBoneTitanTimer = 14.0;
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'ANCIENT BONE TITAN!', '#38BDF8', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 190, 70, true);
        } else {
          // Bone Dragon
          this.boneDragonTimer = 14.0;
          this.boneDragonBreathTimer = 4.5;
          soundEngine.playSlash(1.2);
          callbacks.spawnPopup(player.x, player.y - 45, 'BONE DRAGON!', '#7DD3FC', 1.35);
          callbacks.dealAoEDamage(player.x, player.y, 210, 65, true);
        }
      } else if (ultId === UltimateSkillId.ArmyOfBones) {
        if (path === 'PATH_A') {
          // The Four Generals
          soundEngine.playSummon();
          callbacks.spawnPopup(player.x, player.y - 45, 'THE FOUR GENERALS!', '#93C5FD', 1.25);
          this.spawnCommander('GENERAL_SWORDSMAN', player.x - 45, player.y - 30, 'Sword General', '#38BDF8');
          this.spawnCommander('GENERAL_SPEARMAN', player.x + 45, player.y - 30, 'Spear General', '#60A5FA');
          this.spawnCommander('GENERAL_ARCHER', player.x - 35, player.y + 40, 'Archer General', '#93C5FD');
          this.spawnCommander('GENERAL_SHIELDBEARER', player.x + 35, player.y + 40, 'Shield General', '#E2E8F0');
        } else {
          // The Bone Fortress
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'THE BONE FORTRESS!', '#60A5FA', 1.3);
          this.spawnCommander('BONE_FORTRESS', player.x, player.y, 'Bone Fortress Citadel', '#38BDF8', 350, 48);
          callbacks.dealAoEDamage(player.x, player.y, 240, 50, false);
        }
      } else if (ultId === UltimateSkillId.ReapersJudgment) {
        if (path === 'PATH_A') {
          // Soul Severance
          soundEngine.playSlash(1.4);
          this.soulSeveranceTimer = 2.2;
          callbacks.spawnPopup(player.x, player.y - 45, 'SOUL SEVERANCE!', '#BAE6FD', 1.3);
          // Mark all living enemies
          for (const e of enemies) {
            if (e.hp > 0) {
              callbacks.spawnBurst(e.x, e.y, '#38BDF8', 8, 80);
            }
          }
        } else {
          // The Black Reaper
          this.blackReaperTimer = 12.0;
          soundEngine.playSlash(1.1);
          callbacks.spawnPopup(player.x, player.y - 45, 'THE BLACK REAPER!', '#C084FC', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 180, 60, true);
        }
      }
    }

    // === 3. GOBLIN ===
    else if (charId === CharacterId.Goblin) {
      if (ultId === UltimateSkillId.PhantomFrenzy) {
        if (path === 'PATH_A') {
          // Thousand Reflections (6 Clones)
          soundEngine.playSlash(1.0);
          callbacks.spawnPopup(player.x, player.y - 45, 'THOUSAND REFLECTIONS!', '#F59E0B', 1.3);
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI * 2) / 6;
            this.spawnCommander('GOBLIN_MIRAGE', player.x + Math.cos(a) * 55, player.y + Math.sin(a) * 55, 'Goblin Mirage', '#FBBF24', 90, 16);
          }
        } else {
          // Phantom Executioner: Rapid Omni-Slash Sequence
          const living = enemies.filter((e) => e.hp > 0).slice(0, 7);
          this.phantomExecutionerTargets = living.map((e) => ({ x: e.x, y: e.y, enemyId: e.id }));
          this.executionerStep = 0;
          this.executionerTimer = 0.12;
          this.executionerOriginX = player.x;
          this.executionerOriginY = player.y;
          soundEngine.playCrit();
          callbacks.spawnPopup(player.x, player.y - 45, 'PHANTOM EXECUTIONER!', '#F97316', 1.35);
        }
      } else if (ultId === UltimateSkillId.KingOfThieves) {
        if (path === 'PATH_A') {
          // Stolen Identity: Mimic specters
          soundEngine.playPickup();
          callbacks.spawnPopup(player.x, player.y - 45, 'STOLEN IDENTITY!', '#FBBF24', 1.25);
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI * 2) / 3;
            this.spawnCommander('GOBLIN_MIRAGE', player.x + Math.cos(a) * 50, player.y + Math.sin(a) * 50, 'Stolen Specter', '#F59E0B', 120, 18);
          }
        } else {
          // Treasure of a Thousand Souls: Cursed Gold Coins
          soundEngine.playPickup();
          callbacks.spawnPopup(player.x, player.y - 45, 'TREASURE OF A THOUSAND SOULS!', '#EAB308', 1.3);
          for (const e of enemies) {
            if (e.hp > 0) {
              this.cursedCoins.push({ enemyId: e.id, coins: 5 });
            }
          }
          callbacks.dealAoEDamage(player.x, player.y, 220, 50, false);
        }
      } else if (ultId === UltimateSkillId.ThousandDaggers) {
        if (path === 'PATH_A') {
          // Blade Cyclone (20 spinning daggers)
          this.bladeCycloneTimer = 12.0;
          this.bladeCycloneDaggers = [];
          for (let i = 0; i < 20; i++) {
            this.bladeCycloneDaggers.push({
              angle: (i * Math.PI * 2) / 20,
              dist: 45 + (i % 3) * 22,
              speed: 4.5 + (i % 2) * 1.5,
            });
          }
          soundEngine.playSlash(1.3);
          callbacks.spawnPopup(player.x, player.y - 45, 'BLADE CYCLONE!', '#F97316', 1.3);
        } else {
          // Dagger Constellation (Laser Web)
          this.constellationTimer = 12.0;
          this.constellationNodes = [];
          for (let i = 0; i < 6; i++) {
            const ca = (i * Math.PI * 2) / 6;
            this.constellationNodes.push({
              x: player.x + Math.cos(ca) * 120,
              y: player.y + Math.sin(ca) * 85,
              vx: (Math.random() - 0.5) * 40,
              vy: (Math.random() - 0.5) * 40,
            });
          }
          soundEngine.playCrit();
          callbacks.spawnPopup(player.x, player.y - 45, 'DAGGER CONSTELLATION!', '#FBBF24', 1.3);
        }
      }
    }

    // === 4. GNOME ===
    else if (charId === CharacterId.Gnome) {
      if (ultId === UltimateSkillId.MountainsHeart) {
        if (path === 'PATH_A') {
          // Worldbreaker
          this.worldbreakerTimer = 14.0;
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'WORLDBREAKER!', '#E2E8F0', 1.35);
          callbacks.dealAoEDamage(player.x, player.y, 200, 75, true);
        } else {
          // Eternal Mountain (Living Bastion Dome)
          this.eternalMountainTimer = 14.0;
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'ETERNAL MOUNTAIN!', '#CBD5E1', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 160, 45, false);
        }
      } else if (ultId === UltimateSkillId.TitansRampart) {
        if (path === 'PATH_A') {
          // The Great Divide
          this.greatDivideTimer = 12.0;
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'THE GREAT DIVIDE!', '#94A3B8', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 240, 60, true);
        } else {
          // Colossal Guardian Golem
          soundEngine.playSummon();
          callbacks.spawnPopup(player.x, player.y - 45, 'COLOSSAL GUARDIAN!', '#CBD5E1', 1.3);
          this.spawnCommander('STONE_GUARDIAN', player.x + 50, player.y, 'Stone Colossus Guardian', '#94A3B8', 400, 42);
        }
      } else if (ultId === UltimateSkillId.CataclysmicSlam) {
        if (path === 'PATH_A') {
          // Volcanic Cataclysm
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'VOLCANIC CATACLYSM!', '#F97316', 1.35);
          callbacks.dealAoEDamage(player.x, player.y, 220, 80, true);
          for (let i = 0; i < 5; i++) {
            const va = (i * Math.PI * 2) / 5;
            this.volcanicMagmaPools.push({
              x: player.x + Math.cos(va) * 80,
              y: player.y + Math.sin(va) * 60,
              radius: 46,
              life: 8.0,
            });
          }
        } else {
          // Gravity Collapse (Singularity)
          soundEngine.playHit(true);
          callbacks.spawnPopup(player.x, player.y - 45, 'GRAVITY COLLAPSE!', '#818CF8', 1.35);
          this.gravitySingularity = {
            x: player.x + Math.cos(player.aimAngle) * 90,
            y: player.y + Math.sin(player.aimAngle) * 90,
            life: 2.6,
            radius: 170,
          };
        }
      }
    }

    // === 5. GHOST ===
    else if (charId === CharacterId.Ghost) {
      if (ultId === UltimateSkillId.EternalNightmare) {
        if (path === 'PATH_A') {
          // The Faceless Nightmare
          soundEngine.playSummon();
          callbacks.spawnPopup(player.x, player.y - 45, 'THE FACELESS NIGHTMARE!', '#C084FC', 1.35);
          this.spawnCommander('NIGHTMARE_BEAST', player.x + 50, player.y - 30, 'Faceless Nightmare', '#7E22CE', 280, 36);
        } else {
          // Haunted Dimension
          this.hauntedDimensionTimer = 14.0;
          soundEngine.playHeal();
          callbacks.spawnPopup(player.x, player.y - 45, 'HAUNTED DIMENSION!', '#E879F9', 1.3);
          callbacks.dealAoEDamage(player.x, player.y, 220, 60, false);
        }
      } else if (ultId === UltimateSkillId.SpiritLegion) {
        if (path === 'PATH_A') {
          // The Ancient Monarchs (3 Monarchs)
          soundEngine.playSummon();
          callbacks.spawnPopup(player.x, player.y - 45, 'THE ANCIENT MONARCHS!', '#D8B4FE', 1.3);
          this.spawnCommander('SPIRIT_MONARCH_BEAST', player.x - 50, player.y - 20, 'Beast Monarch', '#C084FC');
          this.spawnCommander('SPIRIT_MONARCH_WARLORD', player.x + 50, player.y - 20, 'Warlord Monarch', '#E879F9');
          this.spawnCommander('SPIRIT_MONARCH_SOVEREIGN', player.x, player.y + 45, 'Phantom Sovereign', '#9333EA');
        } else {
          // Spirit Possession: Possesses multiple enemies
          soundEngine.playHeal();
          callbacks.spawnPopup(player.x, player.y - 45, 'SPIRIT POSSESSION!', '#A855F7', 1.3);
          let count = 0;
          for (const e of enemies) {
            if (e.hp > 0 && count < 4) {
              e.possessedTimer = 6.0;
              callbacks.spawnBurst(e.x, e.y, '#C084FC', 12, 100);
              count++;
            }
          }
        }
      } else if (ultId === UltimateSkillId.DeathsPassage) {
        if (path === 'PATH_A') {
          // The Underworld Gate
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'THE UNDERWORLD GATE!', '#C084FC', 1.35);
          this.underworldGate = {
            x: player.x + Math.cos(player.aimAngle) * 80,
            y: player.y + Math.sin(player.aimAngle) * 80,
            life: 8.0,
            maxLife: 8.0,
          };
        } else {
          // Soul Cataclysm: Spirits gather and meteor blast
          soundEngine.playHeal();
          callbacks.spawnPopup(player.x, player.y - 45, 'SOUL CATACLYSM!', '#F472B6', 1.35);
          this.soulCataclysmSpirits = [];
          for (const e of enemies) {
            if (e.hp > 0) {
              this.soulCataclysmSpirits.push({
                x: e.x,
                y: e.y,
                targetX: e.x,
                targetY: e.y,
                progress: 0,
              });
            }
          }
        }
      }
    }

    // === 6. KOBOLD ===
    else if (charId === CharacterId.Kobold) {
      if (ultId === UltimateSkillId.DragonsBarrage) {
        if (path === 'PATH_A') {
          // Dragon's Breath (Flying Spectral Wyrm)
          soundEngine.playCrit();
          callbacks.spawnPopup(player.x, player.y - 45, "DRAGON'S BREATH!", '#F97316', 1.35);
          this.spectralDragon = {
            x: player.x,
            y: player.y,
            angle: player.aimAngle,
            speed: 260,
            life: 8.0,
            breathTick: 0,
          };
        } else {
          // Skyfall Arsenal: Airship Bombardment
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'SKYFALL ARSENAL!', '#FB923C', 1.35);
          this.skyfallBombardmentTimer = 6.0;
          this.skyfallBombardmentTick = 0;
        }
      } else if (ultId === UltimateSkillId.MasterArtificer) {
        if (path === 'PATH_A') {
          // Mechanical Overlord (Walking Battle Mech)
          soundEngine.playBossSlam();
          callbacks.spawnPopup(player.x, player.y - 45, 'MECHANICAL OVERLORD!', '#F59E0B', 1.35);
          this.spawnCommander('MECHANICAL_MECH', player.x + 40, player.y, 'Overlord Mech', '#F97316', 380, 44);
        } else {
          // Clockwork Dominion (Subterranean Pillboxes & Tripwires)
          soundEngine.playPickup();
          callbacks.spawnPopup(player.x, player.y - 45, 'CLOCKWORK DOMINION!', '#EAB308', 1.3);
          const offsets = [
            { x: -90, y: -60 },
            { x: 90, y: -60 },
            { x: -90, y: 60 },
            { x: 90, y: 60 },
          ];
          for (let i = 0; i < 4; i++) {
            this.spawnCommander(
              'CLOCKWORK_PILLBOX',
              player.x + offsets[i].x,
              player.y + offsets[i].y,
              `Pillbox ${i + 1}`,
              '#FBBF24',
              150,
              18
            );
          }
        }
      } else if (ultId === UltimateSkillId.KoboldsDeadlyArsenal) {
        if (path === 'PATH_A') {
          // Forbidden Weaponry
          soundEngine.playCrit();
          callbacks.spawnPopup(player.x, player.y - 45, 'FORBIDDEN WEAPONRY!', '#F97316', 1.35);
          this.forbiddenWeaponTimer = 12.0;
          this.forbiddenShotIndex = 0;
        } else {
          // The Perfect Shot: Sniper line-of-sight execution
          soundEngine.playCrit();
          callbacks.spawnPopup(player.x, player.y - 45, 'THE PERFECT SHOT!', '#EF4444', 1.4);
          this.perfectShotStance = true;
          this.perfectShotAimTimer = 1.3;
        }
      }
    }
  }

  // =========================================================================
  // SUMMON SPAWNERS
  // =========================================================================
  private spawnCommander(
    kind: AwakenedSummonEntity['kind'],
    x: number,
    y: number,
    name: string,
    color: string,
    hp = 220,
    radius = 22
  ): void {
    this.summons.push({
      id: Math.floor(Math.random() * 100000),
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      radius,
      life: 18.0,
      attackTimer: 0.5,
      facingX: 1,
      name,
      color,
    });
  }

  private spawnMiniZombie(x: number, y: number): void {
    this.summons.push({
      id: Math.floor(Math.random() * 100000),
      kind: 'MINI_ZOMBIE',
      x,
      y,
      vx: 0,
      vy: 0,
      hp: 65,
      maxHp: 65,
      radius: 14,
      life: 14.0,
      attackTimer: 0.3,
      facingX: 1,
      name: 'Mini Zombie',
      color: '#A3E635',
    });
  }

  // =========================================================================
  // UPDATE LOOP (CALLED EVERY FRAME AT 60FPS)
  // =========================================================================
  public update(
    dt: number,
    player: { x: number; y: number; aimAngle: number; hp: number; maxHp: number },
    enemies: EnemyEntity[],
    callbacks: {
      dealDamage: (enemy: EnemyEntity, amount: number, isCrit?: boolean) => void;
      spawnBurst: (x: number, y: number, color: string, count: number, speed: number) => void;
      spawnPopup: (x: number, y: number, text: string, color: string, scale?: number) => void;
    }
  ): void {
    // 1. Plague Behemoth Auras & Toxic Pools
    if (this.plagueBehemothTimer > 0) {
      this.plagueBehemothTimer -= dt;
      // Pulse damage to nearby enemies every 0.35s
      for (const e of enemies) {
        if (e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) <= 165) {
          callbacks.dealDamage(e, Math.round(14 * dt * 2.8));
          e.infectionStacks = Math.min(5, (e.infectionStacks || 0) + 1);
        }
      }
    }

    if (this.fleshColossusTimer > 0) {
      this.fleshColossusTimer -= dt;
    }

    // Update toxic puddles
    for (let i = this.toxicPuddles.length - 1; i >= 0; i--) {
      const p = this.toxicPuddles[i];
      p.life -= dt;
      p.damageTick -= dt;
      if (p.damageTick <= 0) {
        p.damageTick = 0.4;
        for (const e of enemies) {
          if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) <= p.radius) {
            callbacks.dealDamage(e, 16);
          }
        }
      }
      if (p.life <= 0) {
        this.toxicPuddles.splice(i, 1);
      }
    }

    // 2. Graveyard Awakening Hands
    if (this.graveyardAwakeningTimer > 0) {
      this.graveyardAwakeningTimer -= dt;
      for (const e of enemies) {
        if (e.hp > 0 && Math.random() < 0.04) {
          callbacks.dealDamage(e, 22);
          e.rootTimer = Math.max(e.rootTimer || 0, 1.5);
          callbacks.spawnBurst(e.x, e.y, '#6EE7B7', 4, 45);
        }
      }
    }

    // 3. Soul Severance Timer
    if (this.soulSeveranceTimer > 0) {
      this.soulSeveranceTimer -= dt;
      if (this.soulSeveranceTimer <= 0) {
        soundEngine.playCrit();
        for (const e of enemies) {
          if (e.hp > 0) {
            callbacks.dealDamage(e, 140, true);
            callbacks.spawnBurst(e.x, e.y, '#BAE6FD', 14, 120);
            callbacks.spawnPopup(e.x, e.y - 20, 'EXECUTION!', '#BAE6FD', 1.25);
          }
        }
      }
    }

    // 4. Black Reaper Timer
    if (this.blackReaperTimer > 0) {
      this.blackReaperTimer -= dt;
    }

    // 5. Phantom Executioner Omni-slash steps
    if (this.phantomExecutionerTargets.length > 0) {
      this.executionerTimer -= dt;
      if (this.executionerTimer <= 0) {
        this.executionerTimer = 0.1;
        const target = this.phantomExecutionerTargets[this.executionerStep];
        if (target) {
          const e = enemies.find((en) => en.id === target.enemyId && en.hp > 0);
          if (e) {
            player.x = e.x;
            player.y = e.y;
            soundEngine.playSlash(1.3);
            callbacks.dealDamage(e, 85, true);
            callbacks.spawnBurst(e.x, e.y, '#F97316', 12, 110);
            callbacks.spawnPopup(e.x, e.y - 25, 'EXECUTE!', '#EF4444', 1.2);
          }
          this.executionerStep++;
        }
        if (this.executionerStep >= this.phantomExecutionerTargets.length) {
          this.phantomExecutionerTargets = [];
          player.x = this.executionerOriginX;
          player.y = this.executionerOriginY;
          soundEngine.playCrit();
          callbacks.spawnPopup(player.x, player.y - 30, 'SLASH COMPLETE!', '#FBBF24', 1.1);
        }
      }
    }

    // 6. Blade Cyclone update
    if (this.bladeCycloneTimer > 0) {
      this.bladeCycloneTimer -= dt;
      for (const d of this.bladeCycloneDaggers) {
        d.angle += d.speed * dt;
        const dx = player.x + Math.cos(d.angle) * d.dist;
        const dy = player.y + Math.sin(d.angle) * d.dist;
        for (const e of enemies) {
          if (e.hp > 0 && Math.hypot(e.x - dx, e.y - dy) <= 24) {
            callbacks.dealDamage(e, 8);
          }
        }
      }
    }

    // 7. Dagger Constellation Lasers
    if (this.constellationTimer > 0) {
      this.constellationTimer -= dt;
      for (let i = 0; i < this.constellationNodes.length; i++) {
        const n1 = this.constellationNodes[i];
        const n2 = this.constellationNodes[(i + 1) % this.constellationNodes.length];
        for (const e of enemies) {
          if (e.hp > 0) {
            const dist = distToSegment(e.x, e.y, n1.x, n1.y, n2.x, n2.y);
            if (dist <= 22) {
              callbacks.dealDamage(e, 14);
            }
          }
        }
      }
    }

    // 8. Worldbreaker Tremor
    if (this.worldbreakerTimer > 0) {
      this.worldbreakerTimer -= dt;
      this.worldbreakerTremorTick -= dt;
      if (this.worldbreakerTremorTick <= 0) {
        this.worldbreakerTremorTick = 0.8;
        for (const e of enemies) {
          if (e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) <= 180) {
            callbacks.dealDamage(e, 35, true);
            e.stunTimer = Math.max(e.stunTimer || 0, 0.7);
            callbacks.spawnBurst(e.x, e.y, '#E2E8F0', 6, 70);
          }
        }
      }
    }

    // 9. Gravity Singularity
    if (this.gravitySingularity) {
      this.gravitySingularity.life -= dt;
      const sing = this.gravitySingularity;
      for (const e of enemies) {
        if (e.hp > 0) {
          const d = Math.hypot(e.x - sing.x, e.y - sing.y);
          if (d <= sing.radius && d > 10) {
            const pull = (1 - d / sing.radius) * 160 * dt;
            const a = Math.atan2(sing.y - e.y, sing.x - e.x);
            e.x += Math.cos(a) * pull;
            e.y += Math.sin(a) * pull;
            callbacks.dealDamage(e, 8);
          }
        }
      }
      if (sing.life <= 0) {
        soundEngine.playBossSlam();
        for (const e of enemies) {
          if (e.hp > 0 && Math.hypot(e.x - sing.x, e.y - sing.y) <= sing.radius) {
            callbacks.dealDamage(e, 120, true);
          }
        }
        callbacks.spawnBurst(sing.x, sing.y, '#818CF8', 24, 180);
        this.gravitySingularity = null;
      }
    }

    // 10. Underworld Gate
    if (this.underworldGate) {
      this.underworldGate.life -= dt;
      const g = this.underworldGate;
      for (const e of enemies) {
        if (e.hp > 0) {
          const gd = Math.hypot(e.x - g.x, e.y - g.y);
          if (gd <= 190 && gd > 15) {
            const pull = 75 * dt;
            const ga = Math.atan2(g.y - e.y, g.x - e.x);
            e.x += Math.cos(ga) * pull;
            e.y += Math.sin(ga) * pull;
            callbacks.dealDamage(e, 10);
            e.slowTimer = Math.max(e.slowTimer || 0, 1.0);
          }
        }
      }
      if (g.life <= 0) {
        this.underworldGate = null;
      }
    }

    // 11. Spectral Dragon flight
    if (this.spectralDragon) {
      const d = this.spectralDragon;
      d.life -= dt;
      d.x += Math.cos(d.angle) * d.speed * dt;
      d.y += Math.sin(d.angle) * d.speed * dt;
      d.angle += 0.8 * dt; // sweeping figure eight
      d.breathTick -= dt;
      if (d.breathTick <= 0) {
        d.breathTick = 0.2;
        callbacks.spawnBurst(d.x, d.y, '#FB923C', 6, 90);
        for (const e of enemies) {
          if (e.hp > 0 && Math.hypot(e.x - d.x, e.y - d.y) <= 85) {
            callbacks.dealDamage(e, 38, true);
          }
        }
      }
      if (d.life <= 0) {
        this.spectralDragon = null;
      }
    }

    // 12. Skyfall Bombardment
    if (this.skyfallBombardmentTimer > 0) {
      this.skyfallBombardmentTimer -= dt;
      this.skyfallBombardmentTick -= dt;
      if (this.skyfallBombardmentTick <= 0) {
        this.skyfallBombardmentTick = 0.35;
        const rx = player.x + (Math.random() - 0.5) * 360;
        const ry = player.y + (Math.random() - 0.5) * 260;
        soundEngine.playHit(true);
        callbacks.spawnBurst(rx, ry, '#F97316', 10, 120);
        for (const e of enemies) {
          if (e.hp > 0 && Math.hypot(e.x - rx, e.y - ry) <= 75) {
            callbacks.dealDamage(e, 42, true);
          }
        }
      }
    }

    // 13. The Perfect Shot Execution
    if (this.perfectShotStance) {
      this.perfectShotAimTimer -= dt;
      if (this.perfectShotAimTimer <= 0) {
        this.perfectShotStance = false;
        soundEngine.playCrit();
        for (const e of enemies) {
          if (e.hp > 0) {
            callbacks.dealDamage(e, 180, true);
            callbacks.spawnBurst(e.x, e.y, '#EF4444', 16, 160);
            callbacks.spawnPopup(e.x, e.y - 25, 'PERFECT SHOT!', '#EF4444', 1.35);
          }
        }
      }
    }

    // 14. Update Awakened Summons
    for (let i = this.summons.length - 1; i >= 0; i--) {
      const s = this.summons[i];
      s.life -= dt;
      s.attackTimer -= dt;

      // Find nearest living enemy
      let nearest: EnemyEntity | null = null;
      let minDist = 340;
      for (const e of enemies) {
        if (e.hp > 0) {
          const d = Math.hypot(e.x - s.x, e.y - s.y);
          if (d < minDist) {
            minDist = d;
            nearest = e;
          }
        }
      }

      if (nearest) {
        const a = Math.atan2(nearest.y - s.y, nearest.x - s.x);
        s.facingX = nearest.x >= s.x ? 1 : -1;
        if (minDist > s.radius + 18) {
          s.x += Math.cos(a) * 110 * dt;
          s.y += Math.sin(a) * 110 * dt;
        }

        // Attack target
        if (s.attackTimer <= 0 && minDist <= s.radius + 35) {
          s.attackTimer = 0.7;
          callbacks.dealDamage(nearest, 32, true);
          callbacks.spawnBurst(nearest.x, nearest.y, s.color, 6, 80);
        }
      }

      if (s.life <= 0 || s.hp <= 0) {
        callbacks.spawnBurst(s.x, s.y, s.color, 12, 90);
        this.summons.splice(i, 1);
      }
    }
  }

  // =========================================================================
  // RENDER UNDERLAY (FLOOR EFFECTS, SHADOWS, SUMMON BASES)
  // =========================================================================
  public renderUnderlay(ctx: CanvasRenderingContext2D, time: number): void {
    // Graveyard Awakening Ground Consecration
    if (this.graveyardAwakeningTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -time * 18;
      ctx.beginPath();
      ctx.arc(0, 0, 520, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Toxic Puddles
    for (const p of this.toxicPuddles) {
      ctx.save();
      const alpha = Math.min(1, p.life / p.maxLife) * 0.45;
      ctx.fillStyle = `rgba(74, 222, 128, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.radius, p.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Volcanic Magma Pools
    for (const mp of this.volcanicMagmaPools) {
      ctx.save();
      const mGrad = ctx.createRadialGradient(mp.x, mp.y, 4, mp.x, mp.y, mp.radius);
      mGrad.addColorStop(0, 'rgba(251, 146, 60, 0.6)');
      mGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.3)');
      mGrad.addColorStop(1, 'rgba(124, 45, 18, 0)');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, mp.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Underworld Gate Portal Underlay
    if (this.underworldGate) {
      const g = this.underworldGate;
      ctx.save();
      const portalGrad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, 120);
      portalGrad.addColorStop(0, '#38BDF8');
      portalGrad.addColorStop(0.5, '#7E22CE');
      portalGrad.addColorStop(1, 'rgba(20, 16, 30, 0)');
      ctx.fillStyle = portalGrad;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, 90, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // =========================================================================
  // RENDER OVERLAY (PARTICLES, LASER WEBS, AIRSHIP SHADOW, HUD EFFECTS)
  // =========================================================================
  public renderOverlay(
    ctx: CanvasRenderingContext2D,
    player: { x: number; y: number },
    time: number
  ): void {
    // 1. Blade Cyclone spinning daggers
    if (this.bladeCycloneTimer > 0) {
      ctx.save();
      for (const d of this.bladeCycloneDaggers) {
        const dx = player.x + Math.cos(d.angle) * d.dist;
        const dy = player.y + Math.sin(d.angle) * d.dist;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(d.angle + Math.PI / 2);
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(4, 6);
        ctx.lineTo(-4, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // 2. Dagger Constellation Lasers
    if (this.constellationTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i < this.constellationNodes.length; i++) {
        const n1 = this.constellationNodes[i];
        const n2 = this.constellationNodes[(i + 1) % this.constellationNodes.length];
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Skyfall Airship Shadow
    if (this.skyfallBombardmentTimer > 0) {
      ctx.save();
      const airshipX = player.x - 30;
      const airshipY = player.y - 70;
      ctx.fillStyle = 'rgba(15, 10, 25, 0.45)';
      ctx.beginPath();
      ctx.ellipse(airshipX, airshipY, 140, 60, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Spectral Dragon Soaring
    if (this.spectralDragon) {
      const d = this.spectralDragon;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      // Dragon body
      ctx.fillStyle = '#F97316';
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Dragon wings
      const wingFlap = Math.sin(time * 14) * 22;
      ctx.fillStyle = 'rgba(251, 146, 60, 0.8)';
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(15, -45 + wingFlap);
      ctx.lineTo(35, 0);
      ctx.lineTo(15, 45 - wingFlap);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 5. Perfect Shot Laser Lines
    if (this.perfectShotStance) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, 280, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Summoned Creatures
    for (const s of this.summons) {
      ctx.save();
      ctx.translate(s.x, s.y);
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, s.radius * 0.7, s.radius, s.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body circle
      ctx.fillStyle = s.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Name & Mini HP bar
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.name, 0, -s.radius - 8);

      // Mini Health bar
      const hpRatio = Math.max(0, s.hp / s.maxHp);
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(-16, -s.radius - 6, 32, 4);
      ctx.fillStyle = s.color;
      ctx.fillRect(-16, -s.radius - 6, 32 * hpRatio, 4);

      ctx.restore();
    }
  }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export const awakeningEngine = new AwakeningEngine();
