/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  AwakenedFormKey,
  AWAKENING_PATHS,
  getAwakenedFormKey,
} from '../data/awakeningData';
import { CHARACTER_ROSTER, ULTIMATE_SKILLS } from '../data/zombieData';
import { drawHeroCharacter, RenderPlayerState } from '../game/renderer';
import { CharacterId, GamePhase, UltimateSkillId } from '../types/game';

interface AwakenedUltimatePreviewProps {
  characterId: CharacterId;
  ultimateId: UltimateSkillId;
  pathKey: 'PATH_A' | 'PATH_B';
  onClose?: () => void;
  onEquip?: () => void;
  isEquipped?: boolean;
}

type PreviewActionMode = 'AUTO' | 'MANUAL';

export const AwakenedUltimatePreview: React.FC<AwakenedUltimatePreviewProps> = ({
  characterId,
  ultimateId,
  pathKey,
  onClose,
  onEquip,
  isEquipped,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pair = AWAKENING_PATHS[characterId]?.[ultimateId];
  const pathDef = pathKey === 'PATH_A' ? pair?.pathA : pair?.pathB;
  const ultDef = ULTIMATE_SKILLS[ultimateId];
  const charDef = CHARACTER_ROSTER[characterId];
  const awakenedForm: AwakenedFormKey = getAwakenedFormKey(
    characterId,
    ultimateId,
    pathKey
  );

  const [actionMode, setActionMode] = useState<PreviewActionMode>('AUTO');
  const [lastAction, setLastAction] = useState<'BASIC' | 'SKILL'>('BASIC');

  // Reference for triggering specific attack/skill on demand
  const triggerRef = useRef<{ mode: 'BASIC' | 'SKILL' | null; time: number }>({
    mode: null,
    time: 0,
  });

  const handleTrigger = (mode: 'BASIC' | 'SKILL') => {
    setActionMode('MANUAL');
    setLastAction(mode);
    triggerRef.current = { mode, time: performance.now() };
    if (mode === 'BASIC') {
      soundEngine.playSlash(0);
    } else {
      soundEngine.playUiClick(720);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let previewTimer = 0;
    let autoCycleTimer = 0;
    let currentAutoPhase: 'BASIC' | 'SKILL' = 'BASIC';
    let heroLungeTimer = 0;

    // Particle pool for ultra-smooth 60fps zero-garbage collection
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      maxLife: number;
      type: 'spark' | 'smoke' | 'rune' | 'ring' | 'shard' | 'laser';
      rot?: number;
      vRot?: number;
    }

    const particles: Particle[] = [];
    const maxParticles = 100;

    const spawnParticle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      size: number,
      color: string,
      maxLife = 0.5,
      type: Particle['type'] = 'spark'
    ) => {
      if (particles.length >= maxParticles) {
        particles.shift();
      }
      particles.push({
        x,
        y,
        vx,
        vy,
        size,
        color,
        life: maxLife,
        maxLife,
        type,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 6,
      });
    };

    // Slashes and projectiles
    interface VisualSlash {
      x: number;
      y: number;
      angle: number;
      radius: number;
      color: string;
      life: number;
      maxLife: number;
      isFinisher?: boolean;
    }
    const slashes: VisualSlash[] = [];

    interface VisualProjectile {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      life: number;
      kind?: 'bullet' | 'fireball' | 'laser' | 'coin' | 'bomb' | 'wisp';
      targetIdx?: number;
    }
    const projectiles: VisualProjectile[] = [];

    // Persistent floor hazard pools (toxic pools, magma fissures, etc.)
    interface FloorHazard {
      x: number;
      y: number;
      radius: number;
      color: string;
      life: number;
      maxLife: number;
    }
    const floorHazards: FloorHazard[] = [];

    // Damage floating numbers
    interface FloatingText {
      x: number;
      y: number;
      text: string;
      color: string;
      life: number;
      maxLife: number;
    }
    const floatingTexts: FloatingText[] = [];

    const spawnDamageText = (
      x: number,
      y: number,
      text: string,
      color = '#FDE047'
    ) => {
      floatingTexts.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 10,
        text,
        color,
        life: 0.65,
        maxLife: 0.65,
      });
      if (floatingTexts.length > 12) floatingTexts.shift();
    };

    // Dummy training targets
    const dummyTargets = [
      { x: 235, y: 55, hp: 100, maxHp: 100, hitTimer: 0, shakeX: 0 },
      { x: 280, y: 82, hp: 100, maxHp: 100, hitTimer: 0, shakeX: 0 },
      { x: 240, y: 110, hp: 100, maxHp: 100, hitTimer: 0, shakeX: 0 },
    ];

    const damageTarget = (
      index: number,
      dmg: number,
      isCrit = false,
      label?: string
    ) => {
      const d = dummyTargets[index];
      if (!d) return;
      d.hitTimer = 0.22;
      d.shakeX = (Math.random() - 0.5) * 8;
      d.hp = Math.max(10, d.hp - dmg);
      spawnDamageText(
        d.x,
        d.y,
        label || `${dmg}${isCrit ? '!' : ''}`,
        isCrit ? '#FACC15' : '#FFFFFF'
      );
      for (let p = 0; p < 3; p++) {
        spawnParticle(
          d.x,
          d.y,
          (Math.random() - 0.5) * 70,
          (Math.random() - 0.5) * 70,
          3,
          isCrit ? '#FDE047' : '#EF4444',
          0.4
        );
      }
    };

    // ========================================================
    // PERFORM AWAKENED BASIC ATTACK
    // ========================================================
    const performAwakenedBasicAttack = (t: number) => {
      heroLungeTimer = 0.25;
      const heroX = 72;
      const heroY = 82;

      switch (awakenedForm) {
        case 'PLAGUE_BEHEMOTH': {
          // Virulent jade claw sweep + toxic floor puddle
          slashes.push({
            x: heroX + 30,
            y: heroY,
            angle: 0.1,
            radius: 80,
            color: '#4ADE80',
            life: 0.24,
            maxLife: 0.24,
            isFinisher: true,
          });
          floorHazards.push({
            x: dummyTargets[0].x - 15,
            y: dummyTargets[0].y + 8,
            radius: 28,
            color: 'rgba(74, 222, 128, 0.45)',
            life: 1.8,
            maxLife: 1.8,
          });
          damageTarget(0, 52, true, 'PLAGUE CLAW 52');
          damageTarget(1, 38, false);
          for (let i = 0; i < 6; i++) {
            spawnParticle(
              heroX + 45 + i * 12,
              heroY + (Math.random() - 0.5) * 20,
              20,
              -35,
              4.5,
              '#A3E635',
              0.6,
              'smoke'
            );
          }
          break;
        }

        case 'FLESH_COLOSSUS': {
          // 180° Bone Scythe Cleave + flying bone shrapnel
          slashes.push({
            x: heroX + 32,
            y: heroY,
            angle: 0,
            radius: 92,
            color: '#34D399',
            life: 0.26,
            maxLife: 0.26,
            isFinisher: true,
          });
          damageTarget(0, 58, true, 'SCYTHE CLEAVE 58');
          damageTarget(1, 58, true);
          damageTarget(2, 44, false);
          for (let i = 0; i < 4; i++) {
            spawnParticle(
              heroX + 50,
              heroY,
              120 + Math.random() * 40,
              (Math.random() - 0.5) * 80,
              3.5,
              '#E2E8F0',
              0.45,
              'shard'
            );
          }
          break;
        }

        case 'UNDYING_KINGDOM': {
          // Monarch Blade Slash + Swordsman Commander rush
          slashes.push({
            x: heroX + 28,
            y: heroY,
            angle: -0.15,
            radius: 72,
            color: '#86EFAC',
            life: 0.2,
            maxLife: 0.2,
          });
          damageTarget(0, 46, true, 'ROYAL BLADE 46');
          damageTarget(1, 46, true);
          break;
        }

        case 'GRAVEYARD_AWAKENING': {
          // Skeletal hands erupting from ground
          damageTarget(0, 48, true, 'CRYPT PIN 48');
          damageTarget(2, 48, true, 'CRYPT PIN 48');
          for (let p = 0; p < 8; p++) {
            spawnParticle(
              dummyTargets[0].x + (Math.random() - 0.5) * 20,
              dummyTargets[0].y + 10,
              0,
              -40,
              3.5,
              '#10B981',
              0.5,
              'smoke'
            );
          }
          break;
        }

        case 'PLAGUE_REBIRTH': {
          // Mini frenzied zombie runner pounces
          damageTarget(1, 44, true, 'FRENZY 44');
          damageTarget(0, 36, false);
          for (let i = 0; i < 5; i++) {
            spawnParticle(
              dummyTargets[1].x,
              dummyTargets[1].y,
              (Math.random() - 0.5) * 60,
              (Math.random() - 0.5) * 60,
              4,
              '#A3E635',
              0.4
            );
          }
          break;
        }

        case 'SOUL_DEVOURER': {
          // Homing Orbiting Soul Wisp Launch
          projectiles.push({
            x: heroX + 24,
            y: heroY,
            vx: 320,
            vy: -20,
            radius: 5.5,
            color: '#2DD4BF',
            life: 0.5,
            kind: 'wisp',
          });
          projectiles.push({
            x: heroX + 24,
            y: heroY,
            vx: 320,
            vy: 20,
            radius: 5.5,
            color: '#06B6D4',
            life: 0.5,
            kind: 'wisp',
          });
          damageTarget(1, 54, true, 'SOUL BOLT 54');
          break;
        }

        case 'BONE_TITAN': {
          // 6-Arm Simultaneous 360° Whirlwind Cleave
          for (let a = 0; a < 6; a++) {
            const ang = (a * Math.PI) / 3;
            slashes.push({
              x: heroX + Math.cos(ang) * 10,
              y: heroY + Math.sin(ang) * 10,
              angle: ang,
              radius: 70,
              color: a % 2 === 0 ? '#38BDF8' : '#7DD3FC',
              life: 0.22,
              maxLife: 0.22,
              isFinisher: true,
            });
          }
          damageTarget(0, 50, true, 'HEXA-CLEAVE 50');
          damageTarget(1, 50, true);
          damageTarget(2, 50, true);
          break;
        }

        case 'BONE_DRAGON': {
          // Dragon Wing Concussive Gale Blade
          slashes.push({
            x: heroX + 35,
            y: heroY,
            angle: 0,
            radius: 84,
            color: '#7DD3FC',
            life: 0.2,
            maxLife: 0.2,
            isFinisher: true,
          });
          damageTarget(0, 56, true, 'GALE 56');
          damageTarget(1, 56, true);
          break;
        }

        case 'FOUR_GENERALS': {
          // Spear thrust and arrow barrage
          damageTarget(0, 48, true, 'SPEAR 48');
          damageTarget(1, 42, false);
          break;
        }

        case 'BONE_FORTRESS': {
          // Heavy Bone Mortar Shell
          projectiles.push({
            x: heroX + 20,
            y: heroY - 8,
            vx: 260,
            vy: -40,
            radius: 6.5,
            color: '#93C5FD',
            life: 0.45,
            kind: 'bomb',
          });
          damageTarget(1, 60, true, 'CANNON 60');
          break;
        }

        case 'SOUL_SEVERANCE': {
          // Translucent Soul Scythe Sweep + Soul Seal mark
          slashes.push({
            x: heroX + 35,
            y: heroY,
            angle: 0.1,
            radius: 95,
            color: '#BAE6FD',
            life: 0.25,
            maxLife: 0.25,
            isFinisher: true,
          });
          damageTarget(0, 58, true, 'SEAL 58');
          damageTarget(1, 58, true);
          damageTarget(2, 58, true);
          break;
        }

        case 'BLACK_REAPER': {
          // Cursed Shadow Slash
          slashes.push({
            x: heroX + 30,
            y: heroY,
            angle: -0.2,
            radius: 78,
            color: '#C084FC',
            life: 0.22,
            maxLife: 0.22,
          });
          damageTarget(1, 52, true, 'SHADOW 52');
          break;
        }

        case 'THOUSAND_REFLECTIONS': {
          // Triple Mirage Slash
          damageTarget(0, 48, true, 'MIRAGE 48');
          damageTarget(1, 48, true);
          break;
        }

        case 'PHANTOM_EXECUTIONER': {
          // Instantaneous Crimson Crosshair Teleport Slice
          damageTarget(0, 68, true, 'CROSS-CUT 68');
          slashes.push({
            x: dummyTargets[0].x,
            y: dummyTargets[0].y,
            angle: Math.PI / 4,
            radius: 46,
            color: '#EF4444',
            life: 0.18,
            maxLife: 0.18,
            isFinisher: true,
          });
          break;
        }

        case 'STOLEN_IDENTITY': {
          damageTarget(1, 46, true, 'MIMIC 46');
          break;
        }

        case 'TREASURE_SOULS': {
          // Homing Cursed Coins shower
          for (let c = 0; c < 4; c++) {
            projectiles.push({
              x: heroX + 24,
              y: heroY + (c - 1.5) * 12,
              vx: 260,
              vy: (c - 1.5) * 35,
              radius: 4,
              color: '#FDE047',
              life: 0.45,
              kind: 'coin',
            });
          }
          damageTarget(1, 45, true, 'CURSED COIN 45');
          break;
        }

        case 'BLADE_CYCLONE': {
          // Ring of Orbiting Enchanted Daggers expands
          for (let d = 0; d < 5; d++) {
            projectiles.push({
              x: heroX + 26,
              y: heroY + (d - 2) * 14,
              vx: 280,
              vy: (d - 2) * 20,
              radius: 4.5,
              color: '#F97316',
              life: 0.45,
            });
          }
          damageTarget(0, 52, true, 'VORTEX 52');
          damageTarget(1, 52, true);
          break;
        }

        case 'DAGGER_CONSTELLATION': {
          // Intersecting Laser Tripwires
          damageTarget(0, 50, true, 'STAR-WIRE 50');
          damageTarget(1, 50, true);
          break;
        }

        case 'WORLDBREAKER': {
          // Seismic Warhammer Slam with erupting stone formations
          slashes.push({
            x: heroX + 36,
            y: heroY,
            angle: 0,
            radius: 78,
            color: '#FB923C',
            life: 0.24,
            maxLife: 0.24,
            isFinisher: true,
          });
          floorHazards.push({
            x: dummyTargets[1].x - 20,
            y: dummyTargets[1].y + 10,
            radius: 26,
            color: 'rgba(249, 115, 22, 0.4)',
            life: 1.6,
            maxLife: 1.6,
          });
          damageTarget(0, 62, true, 'FISSURE 62');
          damageTarget(1, 62, true);
          break;
        }

        case 'ETERNAL_MOUNTAIN': {
          // Floating monolith kinetic strike
          damageTarget(0, 54, true, 'MONOLITH 54');
          damageTarget(2, 42, false);
          break;
        }

        case 'GREAT_DIVIDE': {
          damageTarget(0, 56, true, 'DIVIDE 56');
          break;
        }

        case 'COLOSSAL_GUARDIAN': {
          damageTarget(1, 58, true, 'GOLEM SMASH 58');
          break;
        }

        case 'VOLCANIC_CATACLYSM': {
          // Magma geyser eruption
          floorHazards.push({
            x: dummyTargets[0].x,
            y: dummyTargets[0].y + 10,
            radius: 30,
            color: 'rgba(239, 68, 68, 0.4)',
            life: 1.5,
            maxLife: 1.5,
          });
          damageTarget(0, 60, true, 'MAGMA 60');
          break;
        }

        case 'GRAVITY_COLLAPSE': {
          damageTarget(1, 58, true, 'PULL 58');
          break;
        }

        case 'FACELESS_NIGHTMARE': {
          slashes.push({
            x: heroX + 32,
            y: heroY,
            angle: 0.1,
            radius: 80,
            color: '#C084FC',
            life: 0.2,
            maxLife: 0.2,
          });
          damageTarget(1, 54, true, 'TERROR 54');
          break;
        }

        case 'HAUNTED_DIMENSION': {
          damageTarget(0, 48, true, 'NETHER 48');
          damageTarget(2, 48, true);
          break;
        }

        case 'ANCIENT_MONARCHS': {
          damageTarget(1, 56, true, 'MONARCH 56');
          break;
        }

        case 'SPIRIT_POSSESSION': {
          damageTarget(0, 50, true, 'PUPPET 50');
          break;
        }

        case 'UNDERWORLD_GATE': {
          damageTarget(0, 55, true, 'CHAINS 55');
          damageTarget(1, 55, true);
          break;
        }

        case 'SOUL_CATACLYSM': {
          damageTarget(1, 54, true, 'SPIRIT 54');
          break;
        }

        case 'DRAGONS_BREATH': {
          // Dragon rocket bolt strafing fire
          projectiles.push({
            x: heroX + 30,
            y: heroY,
            vx: 340,
            vy: 0,
            radius: 6,
            color: '#FB923C',
            life: 0.45,
            kind: 'fireball',
          });
          damageTarget(1, 55, true, 'WYRMFIRE 55');
          break;
        }

        case 'SKYFALL_ARSENAL': {
          // Carpet bombing cluster munition
          projectiles.push({
            x: dummyTargets[0].x,
            y: -10,
            vx: 0,
            vy: 320,
            radius: 5,
            color: '#F97316',
            life: 0.35,
            kind: 'bomb',
          });
          damageTarget(0, 60, true, 'MORTAR 60');
          break;
        }

        case 'MECHA_ARTILLERY': {
          // Rapid Twin Gatling Laser Cannons
          for (let i = 0; i < 2; i++) {
            projectiles.push({
              x: heroX + 28,
              y: heroY + (i === 0 ? -6 : 6),
              vx: 380,
              vy: 0,
              radius: 4,
              color: '#FB7185',
              life: 0.45,
              kind: 'laser',
            });
          }
          damageTarget(1, 48, true, 'GATLING 48');
          break;
        }

        case 'CLOCKWORK_DOMINION': {
          damageTarget(0, 46, true, 'VOLTAGE 46');
          damageTarget(2, 46, true);
          break;
        }

        case 'FORBIDDEN_WEAPONRY': {
          // Arcane Tachyon Railgun piercing bolt
          projectiles.push({
            x: heroX + 30,
            y: heroY,
            vx: 420,
            vy: 0,
            radius: 5,
            color: '#C084FC',
            life: 0.4,
            kind: 'laser',
          });
          damageTarget(0, 58, true, 'TACHYON 58');
          damageTarget(1, 58, true);
          break;
        }

        case 'PERFECT_SHOT': {
          // Hypersonic Antimatter Sniper Bolt piercing straight through all targets
          projectiles.push({
            x: heroX + 36,
            y: heroY,
            vx: 550,
            vy: 0,
            radius: 4,
            color: '#EF4444',
            life: 0.35,
            kind: 'laser',
          });
          damageTarget(0, 72, true, 'SNIPER CRIT 72');
          damageTarget(1, 72, true);
          damageTarget(2, 72, true);
          break;
        }

        default: {
          slashes.push({
            x: heroX + 30,
            y: heroY,
            angle: 0,
            radius: 70,
            color: '#A855F7',
            life: 0.2,
            maxLife: 0.2,
          });
          damageTarget(1, 45, true);
          break;
        }
      }
    };

    // ========================================================
    // PERFORM AWAKENED SKILL EFFECT
    // ========================================================
    const performAwakenedSkillCast = (t: number) => {
      heroLungeTimer = 0.45;
      const heroX = 72;
      const heroY = 82;

      switch (awakenedForm) {
        case 'PLAGUE_BEHEMOTH': {
          // Massive Concentric Virulent Shockwave
          for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2;
            spawnParticle(
              heroX,
              heroY,
              Math.cos(a) * 110,
              Math.sin(a) * 80,
              5.5,
              '#4ADE80',
              0.65,
              'smoke'
            );
          }
          damageTarget(0, 96, true, 'BIOHAZARD 96');
          damageTarget(1, 96, true, 'BIOHAZARD 96');
          damageTarget(2, 96, true, 'BIOHAZARD 96');
          break;
        }

        case 'FLESH_COLOSSUS': {
          // Siphon Life & Bone Shrapnel Nova
          for (let i = 0; i < 3; i++) {
            const d = dummyTargets[i];
            projectiles.push({
              x: d.x,
              y: d.y,
              vx: (heroX - d.x) * 2.8,
              vy: (heroY - d.y) * 2.8,
              radius: 6,
              color: '#F43F5E',
              life: 0.4,
              kind: 'wisp',
            });
            damageTarget(i, 64, false, 'ABSORB 64');
          }
          break;
        }

        case 'UNDYING_KINGDOM': {
          damageTarget(0, 88, true, 'LEGION 88');
          damageTarget(1, 88, true, 'LEGION 88');
          damageTarget(2, 88, true, 'LEGION 88');
          break;
        }

        case 'GRAVEYARD_AWAKENING': {
          damageTarget(0, 92, true, 'BURIED 92');
          damageTarget(1, 92, true, 'BURIED 92');
          damageTarget(2, 92, true, 'BURIED 92');
          break;
        }

        case 'PLAGUE_REBIRTH': {
          damageTarget(0, 90, true, 'OUTBREAK 90');
          damageTarget(1, 90, true, 'OUTBREAK 90');
          damageTarget(2, 90, true, 'OUTBREAK 90');
          break;
        }

        case 'SOUL_DEVOURER': {
          // Colossal Spirit Maw Devour pull
          damageTarget(0, 105, true, 'DEVOUR 105');
          damageTarget(1, 105, true, 'DEVOUR 105');
          damageTarget(2, 105, true, 'DEVOUR 105');
          break;
        }

        case 'BONE_TITAN': {
          // Omnidirectional 6-weapon devastating storm
          for (let a = 0; a < 12; a++) {
            const ang = (a * Math.PI) / 6;
            slashes.push({
              x: heroX,
              y: heroY,
              angle: ang,
              radius: 95,
              color: a % 2 === 0 ? '#38BDF8' : '#93C5FD',
              life: 0.3,
              maxLife: 0.3,
              isFinisher: true,
            });
          }
          damageTarget(0, 110, true, 'HEXA-TITAN 110');
          damageTarget(1, 110, true, 'HEXA-TITAN 110');
          damageTarget(2, 110, true, 'HEXA-TITAN 110');
          break;
        }

        case 'BONE_DRAGON': {
          // Continuous Draconic Soul-Fire Torrent
          for (let i = 0; i < 16; i++) {
            projectiles.push({
              x: heroX + 30,
              y: heroY + (Math.random() - 0.5) * 16,
              vx: 220 + Math.random() * 120,
              vy: (Math.random() - 0.5) * 60,
              radius: 7,
              color: Math.random() < 0.5 ? '#BAE6FD' : '#38BDF8',
              life: 0.55,
              kind: 'fireball',
            });
          }
          damageTarget(0, 115, true, 'DRAGONFIRE 115');
          damageTarget(1, 115, true, 'DRAGONFIRE 115');
          break;
        }

        case 'FOUR_GENERALS': {
          damageTarget(0, 95, true, 'PHALANX 95');
          damageTarget(1, 95, true, 'PHALANX 95');
          damageTarget(2, 95, true, 'PHALANX 95');
          break;
        }

        case 'BONE_FORTRESS': {
          // Dual Mortar Shell Barrage Detonation
          for (let i = 0; i < 3; i++) {
            const d = dummyTargets[i];
            projectiles.push({
              x: d.x,
              y: -20,
              vx: 0,
              vy: 340,
              radius: 8,
              color: '#60A5FA',
              life: 0.4,
              kind: 'bomb',
            });
            damageTarget(i, 100, true, 'BARRAGE 100');
          }
          break;
        }

        case 'SOUL_SEVERANCE': {
          // Soul Execution tolling death bell
          damageTarget(0, 130, true, 'EXECUTE 130');
          damageTarget(1, 130, true, 'EXECUTE 130');
          damageTarget(2, 130, true, 'EXECUTE 130');
          break;
        }

        case 'BLACK_REAPER': {
          damageTarget(0, 102, true, 'SHADOW NOVA 102');
          damageTarget(1, 102, true, 'SHADOW NOVA 102');
          damageTarget(2, 102, true, 'SHADOW NOVA 102');
          break;
        }

        case 'PHANTOM_EXECUTIONER': {
          // Rapid Omnipresent Flashes
          for (let i = 0; i < 3; i++) {
            const d = dummyTargets[i];
            slashes.push({
              x: d.x,
              y: d.y,
              angle: (i * Math.PI) / 3,
              radius: 55,
              color: '#EF4444',
              life: 0.22,
              maxLife: 0.22,
              isFinisher: true,
            });
            damageTarget(i, 118, true, 'OMNI-SLASH 118');
          }
          break;
        }

        case 'BLADE_CYCLONE': {
          damageTarget(0, 98, true, 'HURRICANE 98');
          damageTarget(1, 98, true, 'HURRICANE 98');
          damageTarget(2, 98, true, 'HURRICANE 98');
          break;
        }

        case 'WORLDBREAKER': {
          // Tectonic Volcanic Eruption
          damageTarget(0, 120, true, 'EARTHQUAKE 120');
          damageTarget(1, 120, true, 'EARTHQUAKE 120');
          damageTarget(2, 120, true, 'EARTHQUAKE 120');
          break;
        }

        case 'ETERNAL_MOUNTAIN': {
          damageTarget(0, 95, true, 'AEGIS BASTION 95');
          damageTarget(1, 95, true, 'AEGIS BASTION 95');
          damageTarget(2, 95, true, 'AEGIS BASTION 95');
          break;
        }

        case 'VOLCANIC_CATACLYSM': {
          damageTarget(0, 115, true, 'CATACLYSM 115');
          damageTarget(1, 115, true, 'CATACLYSM 115');
          damageTarget(2, 115, true, 'CATACLYSM 115');
          break;
        }

        case 'GRAVITY_COLLAPSE': {
          damageTarget(0, 125, true, 'SINGULARITY 125');
          damageTarget(1, 125, true, 'SINGULARITY 125');
          damageTarget(2, 125, true, 'SINGULARITY 125');
          break;
        }

        case 'UNDERWORLD_GATE': {
          // Netherworld Abyss Soul Disintegration
          damageTarget(0, 125, true, 'STYGIAN ABYSS 125');
          damageTarget(1, 125, true, 'STYGIAN ABYSS 125');
          damageTarget(2, 125, true, 'STYGIAN ABYSS 125');
          break;
        }

        case 'SOUL_CATACLYSM': {
          // Celestial Spectral Meteor Strikes
          for (let i = 0; i < 3; i++) {
            const d = dummyTargets[i];
            projectiles.push({
              x: d.x,
              y: -20,
              vx: 0,
              vy: 360,
              radius: 7,
              color: '#F472B6',
              life: 0.35,
              kind: 'wisp',
            });
            damageTarget(i, 112, true, 'METEOR 112');
          }
          break;
        }

        case 'SKYFALL_ARSENAL': {
          // Full Carpet Bombing Strike
          for (let i = 0; i < 3; i++) {
            const d = dummyTargets[i];
            projectiles.push({
              x: d.x,
              y: -20,
              vx: 0,
              vy: 350,
              radius: 7.5,
              color: '#F97316',
              life: 0.35,
              kind: 'bomb',
            });
            damageTarget(i, 110, true, 'CARPET BOMB 110');
          }
          break;
        }

        case 'MECHA_ARTILLERY': {
          // Twin Ballista Cannon Blast
          for (let i = 0; i < 4; i++) {
            projectiles.push({
              x: heroX + 30,
              y: heroY + (i - 1.5) * 10,
              vx: 380,
              vy: 0,
              radius: 5,
              color: '#FB7185',
              life: 0.45,
              kind: 'laser',
            });
          }
          damageTarget(0, 105, true, 'MECHA BURST 105');
          damageTarget(1, 105, true, 'MECHA BURST 105');
          break;
        }

        case 'FORBIDDEN_WEAPONRY': {
          // Arcane Tachyon Overcharge
          damageTarget(0, 120, true, 'ARCANE TEAR 120');
          damageTarget(1, 120, true, 'ARCANE TEAR 120');
          damageTarget(2, 120, true, 'ARCANE TEAR 120');
          break;
        }

        case 'PERFECT_SHOT': {
          // Absolute Precision Execution
          damageTarget(0, 145, true, 'ANTIMATTER EXECUTION 145');
          damageTarget(1, 145, true, 'ANTIMATTER EXECUTION 145');
          damageTarget(2, 145, true, 'ANTIMATTER EXECUTION 145');
          break;
        }

        default: {
          damageTarget(0, 85, true, 'CRIT 85');
          damageTarget(1, 85, true, 'CRIT 85');
          damageTarget(2, 85, true, 'CRIT 85');
          break;
        }
      }
    };

    // ========================================================
    // MAIN 60FPS ANIMATION LOOP
    // ========================================================
    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      previewTimer += dt;
      autoCycleTimer += dt;
      if (heroLungeTimer > 0) heroLungeTimer -= dt;

      // Handle on-demand manual triggers or auto-cycle
      if (triggerRef.current.mode) {
        const m = triggerRef.current.mode;
        triggerRef.current.mode = null;
        if (m === 'BASIC') {
          performAwakenedBasicAttack(previewTimer);
        } else {
          performAwakenedSkillCast(previewTimer);
        }
      } else if (actionMode === 'AUTO') {
        if (autoCycleTimer > 1.35) {
          autoCycleTimer = 0;
          currentAutoPhase = currentAutoPhase === 'BASIC' ? 'SKILL' : 'BASIC';
          setLastAction(currentAutoPhase);
          if (currentAutoPhase === 'BASIC') {
            performAwakenedBasicAttack(previewTimer);
          } else {
            performAwakenedSkillCast(previewTimer);
          }
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      // Dark consecrated arena
      ctx.fillStyle = '#0D0816';
      ctx.fillRect(0, 0, w, h);

      // Arena grid lines
      ctx.strokeStyle = '#1A1226';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const heroX = 72;
      const heroY = 82;
      const themeColor = pathDef?.color || '#C084FC';

      // ========================================================
      // DRAW FLOOR HAZARDS (Persistent toxic/magma pools)
      // ========================================================
      for (let i = floorHazards.length - 1; i >= 0; i--) {
        const f = floorHazards[i];
        f.life -= dt;
        if (f.life <= 0) {
          floorHazards.splice(i, 1);
          continue;
        }
        const alpha = Math.min(1, f.life / 0.5);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, f.radius, f.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ========================================================
      // DRAW HERO DAIS & AURA
      // ========================================================
      ctx.save();
      const auraPulse = Math.sin(previewTimer * 5) * 0.15 + 0.85;
      const grad = ctx.createRadialGradient(
        heroX,
        heroY + 8,
        2,
        heroX,
        heroY + 8,
        42 * auraPulse
      );
      grad.addColorStop(0, themeColor + '55');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(heroX, heroY + 8, 42 * auraPulse, 20 * auraPulse, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dais rim
      ctx.strokeStyle = themeColor + '88';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -previewTimer * 20;
      ctx.beginPath();
      ctx.ellipse(heroX, heroY + 12, 34, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // ========================================================
      // DRAW HERO (THE ACTUAL COMPLETELY DIFFERENT AWAKENED HERO!)
      // ========================================================
      ctx.save();
      const lungeOffsetX = heroLungeTimer > 0 ? (heroLungeTimer / 0.25) * 8 : 0;
      const walkPhase = previewTimer * 4;

      const playerRenderState: RenderPlayerState = {
        characterId,
        x: heroX + lungeOffsetX,
        y: heroY,
        vx: 15,
        vy: 0,
        radius: 16,
        aimAngle: 0,
        facingX: 1,
        walkPhase,
        hitFlashTimer: 0,
        squashX: 1.0,
        squashY: 1.0,
        undyingTimer: 0,
        abominationTimer: 0,
        ribcageTimer: 0,
        ribcageCharges: 0,
        boneStormTimer: 0,
        colossusTimer: 0,
        unyieldingStacks: 0,
        windrunnerTimer: 0,
        poisonBladesTimer: 0,
        stolenMightTimer: 0,
        fortressTimer: 0,
        magneticTimer: 0,
        mountainHeartTimer: 0,
        leapAirProgress: 0,
        resolveRatio: 1,
        dashTimer: 0,
        hoveredInGuild: true,
        awakenedForm,
      };

      drawHeroCharacter(ctx, playerRenderState, GamePhase.GuildRoam, previewTimer, true);
      ctx.restore();

      // ========================================================
      // UPDATE & DRAW SLASHES
      // ========================================================
      for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        s.life -= dt;
        if (s.life <= 0) {
          slashes.splice(i, 1);
          continue;
        }
        const prog = 1 - s.life / s.maxLife;
        const alpha = Math.max(0, 1 - prog);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.isFinisher ? 5 : 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const startA = s.angle - 0.75;
        const endA = s.angle + 0.75;
        ctx.arc(s.x, s.y, s.radius * (0.8 + prog * 0.2), startA, endA);
        ctx.stroke();
        ctx.restore();
      }

      // ========================================================
      // UPDATE & DRAW PROJECTILES
      // ========================================================
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) {
          projectiles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Projectile trail sparks
        if (Math.random() < 0.6) {
          spawnParticle(
            p.x,
            p.y,
            -p.vx * 0.1,
            -p.vy * 0.1,
            p.radius * 0.6,
            p.color,
            0.22
          );
        }
        ctx.restore();
      }

      // ========================================================
      // UPDATE & DRAW PARTICLES
      // ========================================================
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const alpha = Math.max(0, p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ========================================================
      // DRAW TRAINING DUMMY TARGETS
      // ========================================================
      for (const d of dummyTargets) {
        if (d.hitTimer > 0) d.hitTimer -= dt;
        d.shakeX *= 0.86;

        ctx.save();
        ctx.translate(d.x + d.shakeX, d.y);
        ctx.fillStyle = d.hitTimer > 0 ? '#EF4444' : '#2A1F3B';
        ctx.strokeStyle = '#4F3B6B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-8, -11, 16, 22, 3);
        ctx.fill();
        ctx.stroke();

        // Mini HP Bar
        ctx.fillStyle = '#160E22';
        ctx.fillRect(-10, -18, 20, 3);
        ctx.fillStyle = '#10B981';
        ctx.fillRect(-10, -18, 20 * (d.hp / d.maxHp), 3);
        ctx.restore();
      }

      // ========================================================
      // DRAW FLOATING DAMAGE TEXTS
      // ========================================================
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life -= dt;
        ft.y -= 25 * dt;
        if (ft.life <= 0) {
          floatingTexts.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [characterId, ultimateId, pathKey, pathDef, actionMode, awakenedForm]);

  if (!pathDef || !ultDef) return null;

  return (
    <div className="flex flex-col h-full bg-[#150F22] rounded-xl border border-[#4C336E] overflow-hidden shadow-2xl">
      {/* Top Header with Mode Toggles */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 bg-[#1F1430] border-b border-[#352352] shrink-0 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-[#7E22CE]/40 text-[#E9D5FF] border border-[#A855F7]/40 shrink-0">
            {pathKey === 'PATH_A' ? 'PATH A' : 'PATH B'}
          </span>
          <span className="text-xs font-bold text-white font-display truncate">
            {pathDef.name}
          </span>
        </div>

        {/* Action Controls Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleTrigger('BASIC')}
            className={`px-2 py-0.5 rounded-md border text-[9.5px] font-bold active:scale-95 transition-all ${
              actionMode === 'MANUAL' && lastAction === 'BASIC'
                ? 'bg-[#4C1D95] border-[#A855F7] text-white shadow-sm ring-1 ring-[#A855F7]/40'
                : 'bg-[#2B1D3F] hover:bg-[#3D295A] border-[#4F3673] text-[#E9D5FF]'
            }`}
            title="Trigger Awakened Basic Attack"
          >
            ⚔️ Attack
          </button>
          <button
            type="button"
            onClick={() => handleTrigger('SKILL')}
            className={`px-2 py-0.5 rounded-md border text-[9.5px] font-bold active:scale-95 transition-all ${
              actionMode === 'MANUAL' && lastAction === 'SKILL'
                ? 'bg-[#7E22CE] border-[#FDE047] text-[#FDE047] shadow-sm ring-1 ring-[#FDE047]/40'
                : 'bg-[#3B225C] hover:bg-[#522F80] border-[#7C3AED]/50 text-[#FDE047]'
            }`}
            title="Trigger Awakened Skill Effect"
          >
            ✨ Skill
          </button>
          <button
            type="button"
            onClick={() => setActionMode('AUTO')}
            className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold active:scale-95 transition-all ${
              actionMode === 'AUTO'
                ? 'bg-[#14532D] border-[#22C55E] text-[#86EFAC]'
                : 'bg-[#1C172B] hover:bg-[#2A1F3E] border-[#382654] text-[#A39BB5]'
            }`}
            title="Continuous 60FPS Simulation"
          >
            {actionMode === 'AUTO' ? '⚡ Auto ON' : '⚡ Auto'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2D2144] hover:bg-[#3D2D5B] text-[#DDD6FE] ml-1 shrink-0"
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* 60FPS Live Animated Canvas Showcase */}
      <div className="relative w-full h-[115px] bg-[#0D0816] shrink-0 border-b border-[#2C1D42]">
        <canvas
          ref={canvasRef}
          width={340}
          height={115}
          className="w-full h-full block object-cover select-none"
        />
        <div className="absolute top-1.5 left-2 px-1.5 py-0.2 rounded bg-black/65 backdrop-blur-sm text-[8.5px] font-mono-num text-[#A3E635] border border-green-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
          <span>60FPS AWAKENED SIMULATION</span>
        </div>
        <div className="absolute bottom-1 right-2 px-1.5 py-0.2 rounded bg-black/65 text-[8.5px] font-mono-num text-[#E9D5FF]">
          Tap <strong>⚔️ Attack</strong> or <strong>✨ Skill</strong> to test
        </div>
      </div>

      {/* Mechanics & Action Footer */}
      <div className="flex-1 p-2 flex flex-col justify-between overflow-y-auto min-h-0">
        <div>
          <p className="text-[11px] text-[#DDD6FE] font-medium leading-tight">
            {pathDef.tagline}
          </p>
          <p className="text-[10px] text-[#A39BB5] mt-0.5 leading-snug">
            {pathDef.description}
          </p>

          <div className="mt-1 flex flex-col gap-0.5">
            {pathDef.mechanics.slice(0, 2).map((m, idx) => (
              <div key={idx} className="flex items-start gap-1 text-[9.5px] text-[#F3EFE6]">
                <span className="text-[#C084FC] font-bold leading-none mt-0.5">✦</span>
                <span className="line-clamp-2 leading-tight">{m}</span>
              </div>
            ))}
          </div>
        </div>

        {onEquip && (
          <div className="mt-1.5 pt-1 border-t border-[#2C1E40] flex items-center justify-between gap-2 shrink-0">
            <span className="text-[9px] text-[#A39BB5]">
              {isEquipped ? 'Active in runs' : 'Ready to activate'}
            </span>
            <button
              type="button"
              onClick={onEquip}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                isEquipped
                  ? 'bg-[#2E1F47] text-[#D8B4FE] border border-[#A855F7]/40'
                  : 'bg-gradient-to-r from-[#7E22CE] to-[#4F46E5] text-white shadow-md'
              }`}
            >
              {isEquipped ? '★ Active in Run' : 'Equip Awakened Path'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
