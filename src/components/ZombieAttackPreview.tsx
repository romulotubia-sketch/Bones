import React, { useEffect, useRef } from 'react';

export const ZombieAttackPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const w = 96;
    const h = 64;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let rafId = 0;
    let lastTime = performance.now();
    let comboStep = 0;
    let autoTimer = 0.08;

    const claw = {
      active: false,
      life: 0,
      maxLife: 0.19,
      flip: false,
      isFinisher: false,
      radius: 28,
      arcSpread: 1.48,
    };

    const particles = Array.from({ length: 16 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      size: 3,
      life: 0,
      maxLife: 0.28,
      color: '#4ADE80',
      isSpore: false,
    }));

    const triggerClawSwipe = () => {
      const isFinisher = comboStep === 2;
      claw.active = true;
      claw.flip = comboStep % 2 === 1;
      claw.isFinisher = isFinisher;
      claw.maxLife = isFinisher ? 0.24 : 0.185;
      claw.life = claw.maxLife;
      claw.radius = isFinisher ? 32 : 27;
      claw.arcSpread = isFinisher ? 1.72 : 1.45;

      const ox = 27;
      const oy = h * 0.5;
      const count = isFinisher ? 9 : 6;
      for (let i = 0; i < count; i++) {
        const slot = particles.find((p) => !p.active);
        if (!slot) break;
        const t = (i / Math.max(1, count - 1) - 0.5) * claw.arcSpread;
        const dir = claw.flip ? -t : t;
        const r = claw.radius * (0.68 + Math.random() * 0.28);
        const isSpore = i % 3 === 1;
        const tangent = dir + (claw.flip ? -Math.PI * 0.34 : Math.PI * 0.34);
        const spd = isSpore ? 22 + Math.random() * 20 : (isFinisher ? 88 : 68) + Math.random() * 38;
        slot.active = true;
        slot.x = ox + Math.cos(dir) * r;
        slot.y = oy + Math.sin(dir) * r;
        slot.vx = Math.cos(tangent) * spd;
        slot.vy = Math.sin(tangent) * spd - (isSpore ? 8 : 0);
        slot.rot = tangent;
        slot.isSpore = isSpore;
        slot.size = isSpore ? 4.8 : 3.2;
        slot.color = isSpore ? '#4ADE80' : '#BEF264';
        slot.maxLife = isSpore ? 0.34 : 0.24;
        slot.life = slot.maxLife;
      }

      comboStep = (comboStep + 1) % 3;
      autoTimer = isFinisher ? 0.54 : 0.32;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      autoTimer -= dt;
      if (autoTimer <= 0) {
        triggerClawSwipe();
      }

      ctx.fillStyle = '#091812';
      ctx.fillRect(0, 0, w, h);

      // Mini Zombie silhouette on left
      ctx.save();
      ctx.translate(21, h * 0.5 + 3);
      ctx.fillStyle = '#8E3145';
      ctx.fillRect(-6, -1, 12, 4);
      ctx.fillStyle = '#6BA358';
      ctx.beginPath();
      ctx.arc(0, -6, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath();
      ctx.arc(2.5, -6, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3-Talon Necrotic Claw Rake
      if (claw.active) {
        claw.life -= dt;
        if (claw.life <= 0) {
          claw.active = false;
        } else {
          const progress = Math.max(0, Math.min(1, 1 - claw.life / claw.maxLife));
          const alpha = Math.max(0, 1 - Math.pow(progress, 2.2));
          const half = claw.arcSpread * 0.5;
          const offsets = [1.02, 0.85, 0.68];
          const delays = [0, 0.045, 0.09];
          const widths = [4.2, 5.2, 3.6];

          ctx.save();
          ctx.translate(27, h * 0.5);
          if (claw.isFinisher) {
            const sweep = 1 - Math.pow(1 - Math.min(1, progress * 1.6), 3);
            const fadeT = Math.pow(Math.max(0, (progress - 0.16) / 0.84), 2);
            for (let hand = 0; hand < 2; hand++) {
              ctx.save();
              ctx.translate(22, 0);
              ctx.rotate(hand === 0 ? -0.38 : 0.38);
              for (let c = -1; c <= 1; c++) {
                const yOff = c * 5.2;
                const halfL = (c === 0 ? 18 : 14) * (0.85 + sweep * 0.15);
                const x0 = -halfL + halfL * 2 * fadeT * 0.45;
                const x1 = -halfL + halfL * 2 * sweep;
                if (x1 - x0 <= 1.5) continue;
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = alpha * 0.65;
                ctx.strokeStyle = '#A3E635';
                ctx.lineWidth = (c === 0 ? 4.8 : 3.4) * (1 - progress * 0.4);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x0, yOff);
                ctx.lineTo(x1, yOff);
                ctx.stroke();

                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = c === 0 ? '#ECFCCB' : '#BEF264';
                ctx.lineWidth = (c === 0 ? 2.1 : 1.5) * (1 - progress * 0.35);
                ctx.beginPath();
                ctx.moveTo(x0, yOff);
                ctx.lineTo(x1, yOff);
                ctx.stroke();
              }
              ctx.restore();
            }
          } else {
            if (claw.flip) ctx.scale(1, -1);
            for (let c = 0; c < 3; c++) {
              const localP = Math.max(0, Math.min(1, (progress - delays[c]) / (1 - delays[c])));
              if (localP <= 0) continue;
              const headEase = 1 - Math.pow(1 - Math.min(1, localP * 1.55), 3);
              const tailEase = Math.pow(Math.max(0, (localP - 0.14) / 0.86), 2.0);
              const startAng = -half + claw.arcSpread * tailEase;
              const endAng = -half + claw.arcSpread * headEase;
              if (endAng - startAng <= 0.04) continue;

              const rBase = claw.radius * offsets[c] * (0.95 + headEase * 0.07);
              const maxW = widths[c] * (1 - localP * 0.42);
              const steps = 14;

              ctx.beginPath();
              for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const a = startAng + (endAng - startAng) * t;
                const px = Math.cos(a) * rBase;
                const py = Math.sin(a) * rBase;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              for (let i = steps; i >= 0; i--) {
                const t = i / steps;
                const a = startAng + (endAng - startAng) * t;
                const profile = Math.sin(Math.pow(t, 0.72) * Math.PI);
                const r = Math.max(3, rBase - maxW * profile);
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
              }
              ctx.closePath();

              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = alpha * 0.4;
              ctx.fillStyle = '#4ADE80';
              ctx.fill();
              ctx.restore();

              ctx.save();
              ctx.globalAlpha = alpha;
              ctx.fillStyle = c === 1 ? '#BBF7D0' : '#4ADE80';
              ctx.fill();
              ctx.restore();
            }
          }

          ctx.restore();
        }
      }

      // Venom droplets & spore puffs
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - dt * 4.5;
        p.vy *= 1 - dt * 4.5;

        const a = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = a * (p.isSpore ? 0.65 : 0.95);
        if (p.isSpore) {
          const prog = 1 - p.life / p.maxLife;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.55 + prog * 0.7), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(p.vy, p.vx));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.48, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Zombie 60fps 3-Talon Necrotic Claw basic attack preview"
      className="w-full h-full block"
    />
  );
};
