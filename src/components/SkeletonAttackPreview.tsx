import React, { useEffect, useRef } from 'react';

export const SkeletonAttackPreview: React.FC = () => {
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

    const slash = {
      active: false,
      life: 0,
      maxLife: 0.16,
      flip: false,
      isCrit: false,
      radius: 30,
      arcSpread: 1.55,
    };

    const shards = Array.from({ length: 14 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      vRot: 0,
      len: 4,
      life: 0,
      maxLife: 0.25,
      color: '#F8FAFC',
      isBone: true,
    }));

    const triggerPreviewSlash = () => {
      const isCrit = comboStep === 2;
      slash.active = true;
      slash.flip = comboStep % 2 === 1;
      slash.isCrit = isCrit;
      slash.maxLife = isCrit ? 0.2 : 0.15;
      slash.life = slash.maxLife;
      slash.radius = isCrit ? 33 : 28;
      slash.arcSpread = isCrit ? 1.82 : 1.5;

      const ox = 28;
      const oy = h * 0.5;
      const count = isCrit ? 9 : 6;
      for (let i = 0; i < count; i++) {
        const slot = shards.find((p) => !p.active);
        if (!slot) break;
        const t = (i / Math.max(1, count - 1) - 0.5) * slash.arcSpread;
        const dir = slash.flip ? -t : t;
        const r = slash.radius * (0.72 + Math.random() * 0.25);
        const tangent = dir + (slash.flip ? -Math.PI * 0.38 : Math.PI * 0.38);
        const spd = (isCrit ? 105 : 78) + Math.random() * 45;
        slot.active = true;
        slot.x = ox + Math.cos(dir) * r;
        slot.y = oy + Math.sin(dir) * r;
        slot.vx = Math.cos(tangent) * spd;
        slot.vy = Math.sin(tangent) * spd;
        slot.rot = tangent;
        slot.vRot = (Math.random() - 0.5) * 16;
        slot.isBone = i % 2 === 0;
        slot.len = slot.isBone ? 4.2 : 8.5;
        slot.color = slot.isBone ? '#F8FAFC' : isCrit ? '#FDE047' : '#38BDF8';
        slot.maxLife = 0.22;
        slot.life = 0.22;
      }

      comboStep = (comboStep + 1) % 3;
      autoTimer = isCrit ? 0.52 : 0.28;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      autoTimer -= dt;
      if (autoTimer <= 0) {
        triggerPreviewSlash();
      }

      ctx.fillStyle = '#091322';
      ctx.fillRect(0, 0, w, h);

      // Mini Skeleton silhouette on left
      ctx.save();
      ctx.translate(22, h * 0.5 + 3);
      ctx.fillStyle = '#3730A3';
      ctx.beginPath();
      ctx.arc(0, -5, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F5F0E6';
      ctx.beginPath();
      ctx.arc(1, -5, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(3, -5, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tapered Bone-Blade crescent slash
      if (slash.active) {
        slash.life -= dt;
        if (slash.life <= 0) {
          slash.active = false;
        } else {
          const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
          const headEase = 1 - Math.pow(1 - Math.min(1, progress * 1.45), 3);
          const tailEase = Math.pow(Math.max(0, (progress - 0.12) / 0.88), 2.1);
          const alpha = Math.max(0, 1 - Math.pow(progress, 2.4));
          const half = slash.arcSpread * 0.5;
          const startAng = -half + slash.arcSpread * tailEase;
          const endAng = -half + slash.arcSpread * headEase;

          if (slash.isCrit) {
            ctx.save();
            ctx.translate(28, h * 0.5);
            for (let b = 0; b < 2; b++) {
              const cant = b === 0 ? -0.34 : 0.34;
              const a0 = -0.82 + 1.64 * tailEase * 0.45;
              const a1 = -0.82 + 1.64 * headEase;
              if (a1 - a0 <= 0.05) continue;
              ctx.save();
              ctx.rotate(cant);
              ctx.globalCompositeOperation = 'lighter';
              ctx.strokeStyle = `rgba(253, 224, 71, ${alpha * 0.85})`;
              ctx.lineWidth = 7.5 * (1 - progress * 0.45);
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.arc(0, 0, slash.radius * 0.92, a0, a1);
              ctx.stroke();
              ctx.globalCompositeOperation = 'source-over';
              ctx.strokeStyle = `rgba(248, 250, 252, ${alpha})`;
              ctx.lineWidth = 2.6 * (1 - progress * 0.4);
              ctx.beginPath();
              ctx.arc(0, 0, slash.radius * 0.92, a0, a1);
              ctx.stroke();
              ctx.restore();
            }
            ctx.restore();
          } else if (endAng - startAng > 0.04) {
            ctx.save();
            ctx.translate(28, h * 0.5);
            if (slash.flip) ctx.scale(1, -1);

            const steps = 16;
            const outerR = slash.radius * (0.94 + headEase * 0.08);
            const maxW = 9.5 * (1 - progress * 0.42);

            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const a = startAng + (endAng - startAng) * t;
              const notch = t > 0.58 && t < 0.68 ? -1.8 : 0;
              const r = outerR + notch;
              if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            for (let i = steps; i >= 0; i--) {
              const t = i / steps;
              const a = startAng + (endAng - startAng) * t;
              const profile = Math.sin(Math.pow(t, 0.75) * Math.PI);
              const r = Math.max(3, outerR - maxW * profile);
              ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = '#38BDF8';
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = alpha;
            const grad = ctx.createRadialGradient(0, 0, Math.max(2, outerR - maxW), 0, 0, outerR + 1);
            grad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
            grad.addColorStop(0.55, '#7DD3FC');
            grad.addColorStop(1, '#FFFFFF');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();

            ctx.restore();
          }
        }
      }

      // Shards & streaks
      for (let i = 0; i < shards.length; i++) {
        const p = shards[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - dt * 5.5;
        p.vy *= 1 - dt * 5.5;
        p.rot += p.vRot * dt;

        const a = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = a;
        if (p.isBone) {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-p.len, 0);
          ctx.lineTo(0, -1.5);
          ctx.lineTo(p.len, 0);
          ctx.lineTo(0, 1.5);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.3 * a;
          ctx.beginPath();
          ctx.moveTo(-p.len, 0);
          ctx.lineTo(p.len * 0.5, 0);
          ctx.stroke();
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
      aria-label="Skeleton 60fps Bone-Blade basic attack preview"
      className="w-full h-full block"
    />
  );
};
