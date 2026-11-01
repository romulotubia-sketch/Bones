import React, { useEffect, useRef } from 'react';

interface PreviewArcaneOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isFinisher: boolean;
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
 * 60fps HTML5 Canvas preview of the Slime Arcane Mage basic attack:
 * Pulsating gelatinous arcane core channels concentrated spheres of magical energy;
 * Consecutive casts build Unstable Mana, culminating in a devastating arcane explosion.
 */
export const SlimeAttackPreview: React.FC = () => {
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
    let castTimer = 0.1;
    let comboStep = 0;
    let squish = 0;
    let coreGlow = 0;
    let targetHitFlash = 0;

    const orbs: PreviewArcaneOrb[] = [];
    const sparks: PreviewSpark[] = [];

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      castTimer -= dt;
      if (castTimer <= 0) {
        const isFinisher = comboStep === 2;
        comboStep = (comboStep + 1) % 3;
        castTimer = isFinisher ? 0.65 : 0.32;
        squish = isFinisher ? 1.0 : 0.6;
        coreGlow = 1.0;

        orbs.push({
          x: 32,
          y: 33,
          vx: isFinisher ? 220 : 180,
          vy: 0,
          radius: isFinisher ? 8.5 : 5.5,
          color: isFinisher ? '#C084FC' : '#38BDF8',
          isFinisher,
          life: 0.55,
        });

        const sparkCount = isFinisher ? 8 : 4;
        for (let i = 0; i < sparkCount; i++) {
          const ang = (Math.random() - 0.5) * 1.5;
          const spd = 40 + Math.random() * 55;
          sparks.push({
            x: 32,
            y: 33,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 12,
            size: 1.8 + Math.random() * 1.8,
            color: i % 2 === 0 ? '#E879F9' : '#38BDF8',
            life: 0.28,
            maxLife: 0.28,
          });
        }
      }

      squish = Math.max(0, squish - dt * 5.5);
      coreGlow = Math.max(0, coreGlow - dt * 4.5);
      targetHitFlash = Math.max(0, targetHitFlash - dt * 6.0);

      // Step orbs
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.x += o.vx * dt;
        o.life -= dt;
        if (o.x >= 78) {
          targetHitFlash = o.isFinisher ? 1.0 : 0.65;
          const burstSparks = o.isFinisher ? 10 : 5;
          for (let s = 0; s < burstSparks; s++) {
            const ang = (s / burstSparks) * Math.PI * 2;
            const spd = 35 + Math.random() * 55;
            sparks.push({
              x: 80,
              y: 33,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 2.2 + Math.random() * 1.8,
              color: o.isFinisher ? '#F472B6' : '#67E8F9',
              life: 0.32,
              maxLife: 0.32,
            });
          }
          orbs.splice(i, 1);
          continue;
        }
        if (o.life <= 0) orbs.splice(i, 1);
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

      // Arcane Leyline trajectory dash
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(30, 33);
      ctx.lineTo(80, 33);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target dummy on right
      ctx.save();
      ctx.translate(80, 33);
      const hitScale = 1 + targetHitFlash * 0.22;
      ctx.scale(hitScale, 2 - hitScale * 0.85);
      ctx.strokeStyle = targetHitFlash > 0.2 ? '#E879F9' : '#818CF8';
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

      // Slime silhouette & arcane gelatinous core on left
      ctx.save();
      ctx.translate(18, 36);
      const scaleX = 1 + squish * 0.35;
      const scaleY = 1 - squish * 0.28;
      ctx.scale(scaleX, scaleY);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(0, 11, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gelatinous translucent body
      const slimeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
      slimeGrad.addColorStop(0, '#C084FC');
      slimeGrad.addColorStop(0.55, '#6366F1');
      slimeGrad.addColorStop(1, '#312E81');
      ctx.fillStyle = slimeGrad;
      ctx.strokeStyle = '#818CF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, 10);
      ctx.quadraticCurveTo(-14, -4, -7, -11);
      ctx.quadraticCurveTo(0, -17, 7, -11);
      ctx.quadraticCurveTo(14, -4, 12, 10);
      ctx.quadraticCurveTo(0, 13, -12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Inner Arcane Core
      ctx.fillStyle = coreGlow > 0.2 ? '#F0ABFC' : '#A855F7';
      ctx.beginPath();
      ctx.arc(0, -1, 4.5 + coreGlow * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Cute glowing arcane eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-3.5, -4, 1.8, 0, Math.PI * 2);
      ctx.arc(4, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Render flying orbs
      for (const orb of orbs) {
        ctx.save();
        ctx.translate(orb.x, orb.y);
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, orb.radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.4, orb.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting rune crystal fragment
        const ra = now * 0.012;
        ctx.fillStyle = '#E879F9';
        ctx.beginPath();
        ctx.arc(Math.cos(ra) * (orb.radius + 3), Math.sin(ra) * (orb.radius + 3), 1.5, 0, Math.PI * 2);
        ctx.fill();
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
