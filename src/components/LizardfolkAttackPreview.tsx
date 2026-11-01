import React, { useEffect, useRef } from 'react';

interface PreviewJavelin {
  x: number;
  y: number;
  vx: number;
  isCrit: boolean;
  life: number;
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

/**
 * 60fps HTML5 Canvas preview of the Lizardfolk Spear Hunter basic attack:
 * Fast, precise spear thrusts and piercing javelin throws with aerodynamic shockwaves
 * and Hunter's Instinct tracking accuracy.
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
    let attackTimer = 0.1;
    let comboStep = 0;
    let spearThrust = 0;
    let targetHitFlash = 0;

    const javelins: PreviewJavelin[] = [];
    const sparks: PreviewSpark[] = [];

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      attackTimer -= dt;
      if (attackTimer <= 0) {
        const isThrow = comboStep === 2;
        comboStep = (comboStep + 1) % 3;
        attackTimer = isThrow ? 0.62 : 0.28;
        spearThrust = 1.0;

        if (isThrow) {
          javelins.push({
            x: 32,
            y: 33,
            vx: 240,
            isCrit: true,
            life: 0.5,
          });

          for (let i = 0; i < 6; i++) {
            const ang = (Math.random() - 0.5) * 1.4;
            const spd = 45 + Math.random() * 55;
            sparks.push({
              x: 32,
              y: 33,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 10,
              size: 2,
              color: i % 2 === 0 ? '#FBBF24' : '#34D399',
              life: 0.25,
              maxLife: 0.25,
            });
          }
        } else {
          // Melee spear thrust reaching toward target
          for (let i = 0; i < 4; i++) {
            const ang = (Math.random() - 0.5) * 1.0;
            const spd = 35 + Math.random() * 45;
            sparks.push({
              x: 48,
              y: 33,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 1.8,
              color: '#FDE047',
              life: 0.18,
              maxLife: 0.18,
            });
          }
        }
      }

      spearThrust = Math.max(0, spearThrust - dt * 6.0);
      targetHitFlash = Math.max(0, targetHitFlash - dt * 6.5);

      // Step javelins
      for (let i = javelins.length - 1; i >= 0; i--) {
        const j = javelins[i];
        j.x += j.vx * dt;
        j.life -= dt;
        if (j.x >= 79) {
          targetHitFlash = 1.0;
          for (let s = 0; s < 8; s++) {
            const ang = Math.PI + (Math.random() - 0.5) * 2.2;
            const spd = 40 + Math.random() * 60;
            sparks.push({
              x: 80,
              y: 33,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 2.2,
              color: s % 2 === 0 ? '#FDE047' : '#34D399',
              life: 0.26,
              maxLife: 0.26,
            });
          }
          javelins.splice(i, 1);
          continue;
        }
        if (j.life <= 0) javelins.splice(i, 1);
      }

      // Step sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) sparks.splice(i, 1);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Trajectory guide line
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(30, 33);
      ctx.lineTo(80, 33);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target dummy on right
      ctx.save();
      ctx.translate(81, 33);
      const hitScale = 1 + targetHitFlash * 0.2;
      ctx.scale(hitScale, 2 - hitScale * 0.85);
      ctx.strokeStyle = targetHitFlash > 0.2 ? '#FDE047' : '#34D399';
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

      // Reptilian Hunter silhouette on left
      ctx.save();
      ctx.translate(18, 33);

      // Tail
      const tailWag = Math.sin(now * 0.008) * 3;
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

      // Spear in hand
      const thrustX = spearThrust * 14;
      ctx.save();
      ctx.translate(6 + thrustX, 0);
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();

      // Finely crafted obsidian/steel spearhead
      ctx.fillStyle = '#FDE047';
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(14, -3.5);
      ctx.lineTo(24, 0);
      ctx.lineTo(14, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Render flying thrown javelins
      for (const jav of javelins) {
        ctx.save();
        ctx.translate(jav.x, jav.y);
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.stroke();

        ctx.fillStyle = '#34D399';
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(10, -3.5);
        ctx.lineTo(20, 0);
        ctx.lineTo(10, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Feather fletching
        ctx.fillStyle = '#F59E0B';
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
