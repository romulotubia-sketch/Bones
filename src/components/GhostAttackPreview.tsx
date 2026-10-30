import React, { useEffect, useRef } from 'react';

interface PreviewWisp {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  isStar: boolean;
}

export const GhostAttackPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 96;
    const H = 64;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const pool: PreviewWisp[] = Array.from({ length: 24 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#C084FC',
      isStar: false,
    }));

    const spawnWisp = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      size: number,
      color: string,
      life: number,
      isStar: boolean
    ) => {
      for (const p of pool) {
        if (!p.active) {
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = vx;
          p.vy = vy;
          p.size = size;
          p.color = color;
          p.life = life;
          p.maxLife = life;
          p.isStar = isStar;
          return;
        }
      }
    };

    let rafId = 0;
    let prev = performance.now();
    let elapsed = 0;
    let swingCooldown = 0.08;
    let comboStep = 0;
    let activeSwingLife = 0;
    const swingMaxLife = 0.28;
    let swingFlip = false;
    let swingFinisher = false;

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      elapsed += dt;

      swingCooldown -= dt;
      if (swingCooldown <= 0) {
        comboStep = (comboStep % 3) + 1;
        swingFinisher = comboStep === 3;
        swingFlip = comboStep === 2;
        activeSwingLife = swingMaxLife;
        swingCooldown = swingFinisher ? 0.62 : 0.42;

        const count = swingFinisher ? 9 : 5;
        for (let i = 0; i < count; i++) {
          const ang = ((i / (count - 1)) - 0.5) * 1.45;
          const sx = 28 + Math.cos(ang) * 28;
          const sy = H * 0.5 + Math.sin(ang) * 22;
          const spd = 42 + Math.random() * 48;
          spawnWisp(
            sx,
            sy,
            Math.cos(ang) * spd,
            Math.sin(ang) * spd,
            swingFinisher ? 2.8 : 2.1,
            i % 2 === 0 ? '#67E8F9' : '#C084FC',
            0.26 + Math.random() * 0.12,
            i % 3 === 0
          );
        }
      }

      if (activeSwingLife > 0) {
        activeSwingLife = Math.max(0, activeSwingLife - dt);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Subtle astral crypt grid
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.5);
      ctx.lineTo(W, H * 0.5);
      ctx.moveTo(W * 0.3, 0);
      ctx.lineTo(W * 0.3, H);
      ctx.stroke();

      // Mini Spectral Ghost caster silhouette on left
      const floatY = Math.sin(elapsed * 4.2) * 2.5;
      ctx.save();
      ctx.translate(22, H * 0.52 + floatY);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.beginPath();
      ctx.arc(0, -2, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#581C87';
      ctx.strokeStyle = '#C084FC';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-7, 7);
      ctx.quadraticCurveTo(-8, -9, 0, -10);
      ctx.quadraticCurveTo(8, -9, 7, 7);
      ctx.lineTo(3, 4);
      ctx.lineTo(0, 8);
      ctx.lineTo(-3, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#67E8F9';
      ctx.beginPath();
      ctx.arc(2.5, -3.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 60fps Spectral Claw Arc / 3rd-Hit Abyssal Vortex Rend
      if (activeSwingLife > 0) {
        const p = 1 - activeSwingLife / swingMaxLife;
        const head = 1 - Math.pow(1 - Math.min(1, p * 1.55), 3);
        const tail = Math.pow(Math.max(0, (p - 0.12) / 0.88), 2);
        const alpha = Math.max(0, 1 - Math.pow(p, 2.1));

        ctx.save();
        ctx.translate(28, H * 0.5);
        if (swingFlip && !swingFinisher) ctx.scale(1, -1);

        const drawEtherealCrescent = (rotOffset: number, rScale: number, cyanTint: boolean) => {
          const spread = swingFinisher ? 1.95 : 1.65;
          const a0 = -spread * 0.5 + spread * tail * 0.55 + rotOffset;
          const a1 = -spread * 0.5 + spread * head + rotOffset;
          if (a1 - a0 <= 0.05) return;
          const outerR = (swingFinisher ? 42 : 36) * rScale;
          const width = (swingFinisher ? 12 : 9.5) * (1 - p * 0.38);

          ctx.beginPath();
          const steps = 16;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const a = a0 + (a1 - a0) * t;
            const wave = Math.sin(t * Math.PI * 3 + elapsed * 14) * 1.4;
            const r = outerR + wave;
            if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          for (let s = steps; s >= 0; s--) {
            const t = s / steps;
            const a = a0 + (a1 - a0) * t;
            const r = Math.max(6, outerR - width * Math.sin(t * Math.PI));
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.85;
          const grad = ctx.createRadialGradient(0, 0, Math.max(2, outerR - width), 0, 0, outerR + 3);
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
          grad.addColorStop(0.55, cyanTint ? '#67E8F9' : '#C084FC');
          grad.addColorStop(1, '#F8FAFC');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.restore();
        };

        if (swingFinisher) {
          drawEtherealCrescent(-0.22, 1.0, false);
          ctx.save();
          ctx.scale(1, -1);
          drawEtherealCrescent(-0.22, 0.94, true);
          ctx.restore();

          // Abyssal Soul-Vortex core flash
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha * 0.9;
          ctx.strokeStyle = '#67E8F9';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(38, 0, Math.max(2, 9 * head), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          drawEtherealCrescent(0, 1.0, comboStep === 2);
        }

        ctx.restore();
      }

      // Pooled ectoplasm sparks & soul wisps
      for (const pt of pool) {
        if (!pt.active) continue;
        pt.life -= dt;
        if (pt.life <= 0) {
          pt.active = false;
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 1 - 4.2 * dt;
        pt.vy *= 1 - 4.2 * dt;
        const a = Math.max(0, pt.life / pt.maxLife);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a;
        ctx.fillStyle = pt.color;
        if (pt.isStar) {
          const s = pt.size * 1.6 * a;
          ctx.beginPath();
          ctx.moveTo(pt.x - s, pt.y);
          ctx.lineTo(pt.x, pt.y - s * 0.4);
          ctx.lineTo(pt.x + s, pt.y);
          ctx.lineTo(pt.x, pt.y + s * 0.4);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(0.8, pt.size * a), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return <canvas ref={canvasRef} className="w-24 h-16 block" />;
};
