import React, { useEffect, useRef } from 'react';

interface PreviewBolt {
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
  life: number;
  maxLife: number;
  color: string;
}

/**
 * 60fps HTML5 Canvas preview of the Kobold's repeating crossbow ranged basic attack:
 * Shots 1 & 2 fire high-velocity steel bolts with brass latch sparks; Shot 3 fires a twin-notch Draconic Critical Bolt.
 */
export const KoboldAttackPreview: React.FC = () => {
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
    let shotTimer = 0.08;
    let shotStep = 0;
    let recoil = 0;
    let muzzleFlash = 0;
    let targetHitFlash = 0;

    const bolts: PreviewBolt[] = [];
    const sparks: PreviewSpark[] = [];

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      shotTimer -= dt;
      if (shotTimer <= 0) {
        const isFinisher = shotStep === 2;
        shotStep = (shotStep + 1) % 3;
        shotTimer = isFinisher ? 0.56 : 0.28;
        recoil = isFinisher ? 1.0 : 0.65;
        muzzleFlash = 1.0;

        bolts.push({
          x: 34,
          y: 33,
          vx: isFinisher ? 265 : 225,
          isCrit: isFinisher,
          life: 0.45,
        });

        for (let i = 0; i < (isFinisher ? 6 : 4); i++) {
          const ang = (Math.random() - 0.5) * 1.3;
          const spd = 48 + Math.random() * 58;
          sparks.push({
            x: 33,
            y: 33,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 14,
            life: 0.22,
            maxLife: 0.22,
            color: i % 2 === 0 ? '#FDE047' : '#FB7185',
          });
        }
      }

      recoil = Math.max(0, recoil - dt * 6.5);
      muzzleFlash = Math.max(0, muzzleFlash - dt * 8.5);
      targetHitFlash = Math.max(0, targetHitFlash - dt * 6.5);

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.x += b.vx * dt;
        b.life -= dt;
        if (b.x >= 79) {
          targetHitFlash = b.isCrit ? 1.0 : 0.65;
          for (let s = 0; s < (b.isCrit ? 7 : 4); s++) {
            const ang = Math.PI + (Math.random() - 0.5) * 2.0;
            const spd = 45 + Math.random() * 65;
            sparks.push({
              x: 80,
              y: 33,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              life: 0.24,
              maxLife: 0.24,
              color: b.isCrit ? '#FDE047' : '#FDA4AF',
            });
          }
          bolts.splice(i, 1);
          continue;
        }
        if (b.life <= 0) bolts.splice(i, 1);
      }

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

      // Subtle range guide line
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(30, 33);
      ctx.lineTo(80, 33);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target dummy reticle on right
      ctx.save();
      ctx.translate(82, 33);
      const hitScale = 1 + targetHitFlash * 0.18;
      ctx.scale(hitScale, 2 - hitScale * 0.85);
      ctx.strokeStyle = targetHitFlash > 0.2 ? '#FDE047' : '#FB7185';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-5, 0);
      ctx.moveTo(5, 0);
      ctx.lineTo(10, 0);
      ctx.moveTo(0, -10);
      ctx.lineTo(0, -5);
      ctx.moveTo(0, 5);
      ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.restore();

      // Kobold silhouette + repeating brass crossbow on left
      ctx.save();
      ctx.translate(20 - recoil * 3.2, 35);
      // Crimson horned head + brass goggles
      ctx.fillStyle = '#BE123C';
      ctx.beginPath();
      ctx.arc(0, -7, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, -11);
      ctx.lineTo(-9, -16);
      ctx.lineTo(-1, -12);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(2.5, -8, 2.1, 0, Math.PI * 2);
      ctx.fill();
      // Stock + prod limbs
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2, -2);
      ctx.lineTo(14, -2);
      ctx.stroke();
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(11, -9);
      ctx.quadraticCurveTo(15, -2, 11, 5);
      ctx.stroke();
      ctx.restore();

      // Muzzle flash
      if (muzzleFlash > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = muzzleFlash;
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.moveTo(31, 33);
        ctx.lineTo(42, 29);
        ctx.lineTo(39, 33);
        ctx.lineTo(42, 37);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Flying crossbow bolts
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const b of bolts) {
        const len = b.isCrit ? 18 : 13;
        const grad = ctx.createLinearGradient(b.x - len, b.y, b.x + 4, b.y);
        grad.addColorStop(0, 'rgba(251, 113, 133, 0)');
        grad.addColorStop(0.55, b.isCrit ? '#FBBF24' : '#FB7185');
        grad.addColorStop(1, '#FFFFFF');
        ctx.strokeStyle = grad;
        ctx.lineWidth = b.isCrit ? 3.0 : 2.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x - len, b.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Steel broadhead tip
        ctx.fillStyle = b.isCrit ? '#FEF08A' : '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(b.x + 4.5, b.y);
        ctx.lineTo(b.x - 2, b.y - (b.isCrit ? 3.4 : 2.4));
        ctx.lineTo(b.x - 0.8, b.y);
        ctx.lineTo(b.x - 2, b.y + (b.isCrit ? 3.4 : 2.4));
        ctx.closePath();
        ctx.fill();
      }

      for (const sp of sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return <canvas ref={canvasRef} className="w-24 h-16 block" aria-hidden="true" />;
};
