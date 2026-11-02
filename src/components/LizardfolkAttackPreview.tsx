import React, { useEffect, useRef } from 'react';

interface PreviewJavelin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isCrit: boolean;
  scale: number;
  color: string;
  life: number;
  pierce: boolean;
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

/**
 * 60fps HTML5 Canvas preview of the Lizardfolk Spear Hunter's all-ranged basic attack combo:
 * Step 0: Swift Hunting Dart / Single Quick Throw
 * Step 1: Twin Barbed Javelins / Dual Split Throw
 * Step 2: Great Impaling Harpoon / Power Javelin Finisher
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
    let spearThrowProgress = 0; // 0 to 1 throw release animation
    let targetHitFlash = 0;
    let targetShake = 0;

    const javelins: PreviewJavelin[] = [];
    const sparks: PreviewSpark[] = [];
    const wakes: PreviewWake[] = [];

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      attackTimer -= dt;
      if (attackTimer <= 0) {
        const step = comboStep;
        comboStep = (comboStep + 1) % 3;
        spearThrowProgress = 1.0;

        if (step === 2) {
          // Finisher: Great Impaling Harpoon (Power Javelin)
          attackTimer = 0.58;
          javelins.push({
            x: 28,
            y: 33,
            vx: 290,
            vy: 0,
            isCrit: true,
            scale: 1.35,
            color: '#FDE047',
            life: 0.5,
            pierce: true,
          });
          wakes.push({
            x: 28,
            y: 33,
            radius: 12,
            life: 0.22,
            maxLife: 0.22,
            color: '#FDE047',
          });

          // Slipstream shards
          for (let i = 0; i < 7; i++) {
            const ang = (Math.random() - 0.5) * 1.2;
            const spd = 40 + Math.random() * 50;
            sparks.push({
              x: 28,
              y: 33,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 2.2,
              color: i % 2 === 0 ? '#FDE047' : '#34D399',
              life: 0.26,
              maxLife: 0.26,
            });
          }
        } else if (step === 1) {
          // Step 1: Twin Barbed Javelins (Dual Split Throw)
          attackTimer = 0.38;
          const yOffsets = [-3.5, 3.5];
          for (let i = 0; i < 2; i++) {
            javelins.push({
              x: 27,
              y: 33 + yOffsets[i],
              vx: 260,
              vy: yOffsets[i] * 1.5,
              isCrit: false,
              scale: 0.95,
              color: '#34D399',
              life: 0.48,
              pierce: false,
            });
          }
          wakes.push({
            x: 27,
            y: 33,
            radius: 9,
            life: 0.18,
            maxLife: 0.18,
            color: '#34D399',
          });

          for (let i = 0; i < 5; i++) {
            const ang = (Math.random() - 0.5) * 1.0;
            const spd = 35 + Math.random() * 40;
            sparks.push({
              x: 27,
              y: 33,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 1.8,
              color: '#34D399',
              life: 0.2,
              maxLife: 0.2,
            });
          }
        } else {
          // Step 0: Swift Hunting Dart (Quick Throw)
          attackTimer = 0.32;
          javelins.push({
            x: 26,
            y: 33,
            vx: 270,
            vy: 0,
            isCrit: false,
            scale: 1.0,
            color: '#10B981',
            life: 0.45,
            pierce: false,
          });
          wakes.push({
            x: 26,
            y: 33,
            radius: 8,
            life: 0.16,
            maxLife: 0.16,
            color: '#10B981',
          });

          for (let i = 0; i < 4; i++) {
            const ang = (Math.random() - 0.5) * 0.9;
            const spd = 30 + Math.random() * 35;
            sparks.push({
              x: 26,
              y: 33,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 1.6,
              color: '#6EE7B7',
              life: 0.18,
              maxLife: 0.18,
            });
          }
        }
      }

      spearThrowProgress = Math.max(0, spearThrowProgress - dt * 5.2);
      targetHitFlash = Math.max(0, targetHitFlash - dt * 6.0);
      targetShake = Math.max(0, targetShake - dt * 8.0);

      // Step javelins
      for (let i = javelins.length - 1; i >= 0; i--) {
        const j = javelins[i];
        j.x += j.vx * dt;
        j.y += j.vy * dt;
        j.life -= dt;

        // Check target collision
        if (j.x >= 78) {
          targetHitFlash = j.isCrit ? 1.0 : 0.65;
          targetShake = j.isCrit ? 1.0 : 0.5;

          const sparkCount = j.isCrit ? 10 : 5;
          for (let s = 0; s < sparkCount; s++) {
            const ang = Math.PI + (Math.random() - 0.5) * 2.4;
            const spd = (j.isCrit ? 55 : 35) + Math.random() * 50;
            sparks.push({
              x: 80,
              y: j.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: j.isCrit ? 2.4 : 1.8,
              color: s % 2 === 0 ? (j.isCrit ? '#FDE047' : '#34D399') : '#6EE7B7',
              life: 0.28,
              maxLife: 0.28,
            });
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

      // Trajectory guide lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(28, 33);
      ctx.lineTo(80, 33);
      ctx.stroke();
      ctx.setLineDash([]);

      // Range indicator badge
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALL RANGED', 54, 14);

      // Target dummy on right
      ctx.save();
      const shakeX = targetShake > 0.05 ? (Math.random() - 0.5) * 4 * targetShake : 0;
      const shakeY = targetShake > 0.05 ? (Math.random() - 0.5) * 2 * targetShake : 0;
      ctx.translate(81 + shakeX, 33 + shakeY);
      const hitScale = 1 + targetHitFlash * 0.24;
      ctx.scale(hitScale, 2 - hitScale * 0.88);
      ctx.strokeStyle = targetHitFlash > 0.3 ? '#FDE047' : '#34D399';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-4, 0);
      ctx.moveTo(4, 0);
      ctx.lineTo(9, 0);
      ctx.moveTo(0, -9);
      ctx.lineTo(0, -4);
      ctx.moveTo(0, 4);
      ctx.lineTo(0, 9);
      ctx.stroke();
      ctx.restore();

      // Reptilian Hunter silhouette on left (throwing stance)
      ctx.save();
      const recoilOffset = spearThrowProgress > 0 ? (1 - spearThrowProgress) * -2.5 : 0;
      ctx.translate(16 + recoilOffset, 33);

      // Tail with dynamic sway
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

      // Hunter Torso & Leather harness
      ctx.fillStyle = '#10B981';
      ctx.fillRect(-6, -8, 12, 16);
      ctx.strokeStyle = '#064E3B';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -8, 12, 16);

      // Hunter Cowl / Hood
      ctx.fillStyle = '#065F46';
      ctx.beginPath();
      ctx.arc(0, -11, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Amber reptilian eye
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(3.5, -11, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Spear in hand: arm cocks back and whips forward during release
      const throwArm = spearThrowProgress > 0 ? spearThrowProgress * 8 : -2;
      ctx.save();
      ctx.translate(6 + throwArm, 0);
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();

      // Crafted obsidian/bronze spearhead
      ctx.fillStyle = '#34D399';
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(10, -3.2);
      ctx.lineTo(19, 0);
      ctx.lineTo(10, 3.2);
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
        ctx.ellipse(w.x, w.y, w.radius * (2 - w.life / w.maxLife), w.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Render flying thrown javelins
      for (const jav of javelins) {
        ctx.save();
        ctx.translate(jav.x, jav.y);
        ctx.scale(jav.scale, jav.scale);

        // Supersonic slipstream trail
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.65)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // Wooden spear shaft
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();

        // Barbed spearhead
        ctx.fillStyle = jav.color;
        ctx.strokeStyle = jav.isCrit ? '#FDE047' : '#065F46';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(10, -3.5);
        ctx.lineTo(20, 0);
        ctx.lineTo(10, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Feather fletching
        ctx.fillStyle = jav.isCrit ? '#F59E0B' : '#10B981';
        ctx.fillRect(-12, -2.5, 4, 5);
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
