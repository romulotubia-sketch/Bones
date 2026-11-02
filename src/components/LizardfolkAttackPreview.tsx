import React, { useEffect, useRef } from 'react';

interface PreviewJavelin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  isCrit: boolean;
  scale: number;
  color: string;
  life: number;
  pierce: boolean;
  homing: boolean;
  targetIdx: number;
}

interface PreviewSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface PreviewWake {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface TransferBeam {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  maxLife: number;
}

/**
 * 60fps HTML5 Canvas preview of the Lizardfolk Spear Hunter:
 * 1. Athletic throwing javelin animation (windup cock-back, forward whip release, follow-through)
 * 2. Primal Hunting Mark: Horned predator crest on target & rotating tracking chevrons
 * 3. Empowered fiery golden-amber javelins homing in mid-air toward the marked target
 * 4. Kill-transfer effect: Hunting Mark instantly transfers to the nearest new target
 */
export const LizardfolkAttackPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = 96;
    const height = 64;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    let rafId = 0;
    let lastTs = performance.now();
    let attackTimer = 0.15;
    let comboStep = 0;
    let throwAnimTimer = 0;
    const throwDuration = 0.28;

    // Two targets to demonstrate hunting mark homing & kill transfer
    const targets = [
      { x: 80, y: 22, hitFlash: 0, shake: 0, hp: 3 },
      { x: 80, y: 44, hitFlash: 0, shake: 0, hp: 3 },
    ];
    let markedTargetIdx = 0;

    const javelins: PreviewJavelin[] = [];
    const sparks: PreviewSpark[] = [];
    const wakes: PreviewWake[] = [];
    const transferBeams: TransferBeam[] = [];

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      attackTimer -= dt;
      if (attackTimer <= 0) {
        const step = comboStep;
        comboStep = (comboStep + 1) % 3;
        throwAnimTimer = throwDuration;

        const target = targets[markedTargetIdx];
        const initialAimAngle = Math.atan2(target.y - 32, target.x - 22);

        if (step === 2) {
          // Step 2: Great Impaling Harpoon (Power Javelin)
          attackTimer = 0.58;
          javelins.push({
            x: 24,
            y: 32,
            vx: Math.cos(initialAimAngle) * 290,
            vy: Math.sin(initialAimAngle) * 290,
            angle: initialAimAngle,
            isCrit: true,
            scale: 1.35,
            color: '#F59E0B',
            life: 0.55,
            pierce: true,
            homing: true,
            targetIdx: markedTargetIdx,
          });
          wakes.push({
            x: 24,
            y: 32,
            radius: 12,
            life: 0.22,
            maxLife: 0.22,
            color: '#F59E0B',
          });

          // Supersonic hunter shards
          for (let i = 0; i < 7; i++) {
            const ang = initialAimAngle + (Math.random() - 0.5) * 1.2;
            const spd = 40 + Math.random() * 55;
            sparks.push({
              x: 24,
              y: 32,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 2.2,
              color: i % 2 === 0 ? '#FDE047' : '#F59E0B',
              life: 0.26,
              maxLife: 0.26,
            });
          }
        } else if (step === 1) {
          // Step 1: Twin Barbed Javelins (Dual Split Homing Throw)
          attackTimer = 0.38;
          const spreads = [-0.18, 0.18];
          for (let i = 0; i < 2; i++) {
            const launchAng = initialAimAngle + spreads[i];
            javelins.push({
              x: 23,
              y: 32,
              vx: Math.cos(launchAng) * 260,
              vy: Math.sin(launchAng) * 260,
              angle: launchAng,
              isCrit: false,
              scale: 0.95,
              color: '#F59E0B',
              life: 0.52,
              pierce: false,
              homing: true,
              targetIdx: markedTargetIdx,
            });
          }
          wakes.push({
            x: 23,
            y: 32,
            radius: 9,
            life: 0.18,
            maxLife: 0.18,
            color: '#F59E0B',
          });
        } else {
          // Step 0: Swift Hunting Dart (Quick Throw)
          attackTimer = 0.32;
          javelins.push({
            x: 22,
            y: 32,
            vx: Math.cos(initialAimAngle) * 270,
            vy: Math.sin(initialAimAngle) * 270,
            angle: initialAimAngle,
            isCrit: false,
            scale: 1.05,
            color: '#F59E0B',
            life: 0.48,
            pierce: false,
            homing: true,
            targetIdx: markedTargetIdx,
          });
          wakes.push({
            x: 22,
            y: 32,
            radius: 8,
            life: 0.16,
            maxLife: 0.16,
            color: '#F59E0B',
          });
        }
      }

      throwAnimTimer = Math.max(0, throwAnimTimer - dt);

      // Decay target hit effects
      for (const t of targets) {
        t.hitFlash = Math.max(0, t.hitFlash - dt * 6.0);
        t.shake = Math.max(0, t.shake - dt * 8.0);
      }

      // Step transfer beams
      for (let i = transferBeams.length - 1; i >= 0; i--) {
        transferBeams[i].life -= dt;
        if (transferBeams[i].life <= 0) transferBeams.splice(i, 1);
      }

      // Step homing javelins
      for (let i = javelins.length - 1; i >= 0; i--) {
        const j = javelins[i];
        const target = targets[j.targetIdx];

        if (j.homing && target) {
          // 60fps smooth homing steering toward marked target!
          const desired = Math.atan2(target.y - j.y, target.x - j.x);
          const diff = Math.atan2(Math.sin(desired - j.angle), Math.cos(desired - j.angle));
          j.angle += Math.max(-10 * dt, Math.min(10 * dt, diff));
          const spd = Math.hypot(j.vx, j.vy) || 270;
          j.vx = Math.cos(j.angle) * spd;
          j.vy = Math.sin(j.angle) * spd;

          // Trail sparks
          if (Math.random() < 0.45) {
            sparks.push({
              x: j.x,
              y: j.y,
              vx: (Math.random() - 0.5) * 20,
              vy: (Math.random() - 0.5) * 20,
              size: 1.4,
              color: '#FDE047',
              life: 0.18,
              maxLife: 0.18,
            });
          }
        }

        j.x += j.vx * dt;
        j.y += j.vy * dt;
        j.life -= dt;

        // Collision with marked target
        if (target && Math.hypot(j.x - target.x, j.y - target.y) <= 8) {
          target.hitFlash = j.isCrit ? 1.0 : 0.7;
          target.shake = j.isCrit ? 1.0 : 0.5;
          target.hp--;

          const sparkCount = j.isCrit ? 9 : 5;
          for (let s = 0; s < sparkCount; s++) {
            const ang = Math.PI + (Math.random() - 0.5) * 2.2;
            const spd = (j.isCrit ? 50 : 35) + Math.random() * 45;
            sparks.push({
              x: target.x,
              y: target.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: j.isCrit ? 2.4 : 1.7,
              color: s % 2 === 0 ? '#FDE047' : '#F59E0B',
              life: 0.26,
              maxLife: 0.26,
            });
          }

          // Target defeated: demonstrate Hunting Mark transfer to nearest next target!
          if (target.hp <= 0) {
            target.hp = 3;
            const oldIdx = markedTargetIdx;
            const nextIdx = (markedTargetIdx + 1) % targets.length;
            markedTargetIdx = nextIdx;

            // Spawn laser transfer tether
            transferBeams.push({
              fromX: targets[oldIdx].x,
              fromY: targets[oldIdx].y,
              toX: targets[nextIdx].x,
              toY: targets[nextIdx].y,
              life: 0.35,
              maxLife: 0.35,
            });

            // Redirect any remaining in-flight javelins to the new target
            for (const otherJav of javelins) {
              otherJav.targetIdx = nextIdx;
            }
          }

          if (!j.pierce) {
            javelins.splice(i, 1);
            continue;
          }
        }

        if (j.life <= 0 || j.x > width + 10) {
          javelins.splice(i, 1);
        }
      }

      // Step wakes
      for (let i = wakes.length - 1; i >= 0; i--) {
        const w = wakes[i];
        w.life -= dt;
        if (w.life <= 0) wakes.splice(i, 1);
      }

      // Step sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) sparks.splice(i, 1);
      }

      // Render 60fps canvas scene
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Range indicator badge
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOMING JAVELIN', 48, 11);

      // Render transfer beams
      for (const tb of transferBeams) {
        const alpha = tb.life / tb.maxLife;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 3.5 * alpha;
        ctx.beginPath();
        ctx.moveTo(tb.fromX, tb.fromY);
        ctx.lineTo(tb.toX, tb.toY);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4 * alpha;
        ctx.beginPath();
        ctx.moveTo(tb.fromX, tb.fromY);
        ctx.lineTo(tb.toX, tb.toY);
        ctx.stroke();
        ctx.restore();
      }

      // Render targets
      targets.forEach((target, idx) => {
        const isMarked = idx === markedTargetIdx;
        ctx.save();
        const shakeX = target.shake > 0.05 ? (Math.random() - 0.5) * 4 * target.shake : 0;
        const shakeY = target.shake > 0.05 ? (Math.random() - 0.5) * 2 * target.shake : 0;
        ctx.translate(target.x + shakeX, target.y + shakeY);

        const hitScale = 1 + target.hitFlash * 0.24;
        ctx.scale(hitScale, 2 - hitScale * 0.88);

        // Dummy target rings
        ctx.strokeStyle = target.hitFlash > 0.3 ? '#FFFFFF' : isMarked ? '#F59E0B' : '#4B5563';
        ctx.lineWidth = isMarked ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-3, 0);
        ctx.moveTo(3, 0);
        ctx.lineTo(8, 0);
        ctx.moveTo(0, -8);
        ctx.lineTo(0, -3);
        ctx.moveTo(0, 3);
        ctx.lineTo(0, 8);
        ctx.stroke();

        // Primal Hunting Mark on marked target!
        if (isMarked) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          // Rotating tracking chevrons
          const rot = now * 0.004;
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.stroke();

          for (let c = 0; c < 4; c++) {
            const a = rot + (c * Math.PI) / 2;
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.arc(Math.cos(a) * 10, Math.sin(a) * 10, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Overhead Horned Hunter Brand
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(4, -9);
          ctx.lineTo(-4, -9);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(0, -10, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      });

      // Lizardfolk Hunter on left (Throwing animation)
      ctx.save();
      const throwProg = 1 - throwAnimTimer / throwDuration;
      let handOffset = 0;
      let handYOffset = 0;
      let spearAlpha = 1.0;

      if (throwAnimTimer > 0) {
        if (throwProg < 0.35) {
          // Phase 1: Windup cock-back behind shoulder
          const t = throwProg / 0.35;
          handOffset = -8 * Math.sin(t * Math.PI * 0.5);
          handYOffset = -3 * Math.sin(t * Math.PI * 0.5);
        } else if (throwProg < 0.68) {
          // Phase 2: Forward whip release
          const t = (throwProg - 0.35) / 0.33;
          handOffset = -8 + 18 * Math.sin(t * Math.PI * 0.5);
          handYOffset = -3 + 4 * Math.sin(t * Math.PI * 0.5);
          if (t > 0.45) spearAlpha = Math.max(0, 1 - (t - 0.45) * 3);
        } else {
          // Phase 3: Follow-through and draw next spear
          const t = (throwProg - 0.68) / 0.32;
          handOffset = 10 - 10 * t;
          handYOffset = 1 * (1 - t);
          spearAlpha = Math.min(1, t * 2.5);
        }
      }

      ctx.translate(14, 32);

      // Reptilian tail
      const tailWag = Math.sin(now * 0.008) * 3.2;
      ctx.strokeStyle = '#052E16';
      ctx.lineWidth = 2.4;
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.moveTo(-6, 3);
      ctx.quadraticCurveTo(-14, 5 + tailWag, -17, 1 + tailWag);
      ctx.quadraticCurveTo(-12, 8 + tailWag, -5, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Back quiver
      ctx.fillStyle = '#451A03';
      ctx.fillRect(-8, -10, 4, 12);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(-9, -14, 3, 4);

      // Torso
      ctx.fillStyle = '#10B981';
      ctx.fillRect(-6, -7, 12, 14);
      ctx.strokeStyle = '#064E3B';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-6, -7, 12, 14);

      // Head
      ctx.fillStyle = '#065F46';
      ctx.beginPath();
      ctx.arc(0, -10, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(3.2, -10, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Spear in throwing arm
      ctx.save();
      ctx.translate(6 + handOffset, handYOffset);
      ctx.globalAlpha = spearAlpha;

      // Shaft
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(11, 0);
      ctx.stroke();

      // Spearhead
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(9, -2.8);
      ctx.lineTo(17, 0);
      ctx.lineTo(9, 2.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
      ctx.restore();

      // Render wakes
      for (const w of wakes) {
        ctx.save();
        ctx.globalAlpha = w.life / w.maxLife;
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, w.radius * (2 - w.life / w.maxLife), w.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Render flying thrown javelins with empowered golden-amber fire
      for (const jav of javelins) {
        ctx.save();
        ctx.translate(jav.x, jav.y);
        ctx.rotate(jav.angle);
        ctx.scale(jav.scale, jav.scale);

        // Blazing solar slipstream
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(4, 0);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();

        // Obsidian shaft
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();

        // Sun-forged barbed spearhead
        ctx.fillStyle = jav.color;
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(8, -3.2);
        ctx.lineTo(18, 0);
        ctx.lineTo(8, 3.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Golden feather fletching
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(-10, -2.2, 3.5, 4.4);
        ctx.restore();
      }

      // Render sparks
      for (const sp of sparks) {
        ctx.save();
        ctx.globalAlpha = sp.life / sp.maxLife;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ width: '96px', height: '64px' }}
    />
  );
};

