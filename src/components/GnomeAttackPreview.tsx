import React, { useEffect, useRef } from 'react';

export const GnomeAttackPreview: React.FC = () => {
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

    const fist = {
      active: false,
      life: 0,
      maxLife: 0.2,
      flip: false,
      isSeismic: false,
      radius: 28,
      arcSpread: 1.44,
    };

    const chunks = Array.from({ length: 18 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      vRot: 0,
      size: 3.2,
      life: 0,
      maxLife: 0.28,
      color: '#FB923C',
      isStone: false,
    }));

    const drawGauntletWave = (
      progress: number,
      radius: number,
      arcSpread: number,
      flip: boolean,
      isCrit: boolean
    ) => {
      const headEase = 1 - Math.pow(1 - Math.min(1, progress * 1.6), 3);
      const tailEase = Math.pow(Math.max(0, (progress - 0.14) / 0.86), 2.0);
      const alpha = Math.max(0, 1 - Math.pow(progress, 2.15));
      const half = arcSpread * 0.5;
      const startAng = -half + arcSpread * tailEase;
      const endAng = -half + arcSpread * headEase;
      if (endAng - startAng <= 0.05) return;

      const outerR = radius * (0.88 + headEase * 0.14);
      const maxW = (isCrit ? 11.5 : 9) * (1 - progress * 0.38);
      const steps = 14;

      ctx.save();
      if (flip) ctx.scale(1, -1);

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAng + (endAng - startAng) * t;
        // Knuckle ridge notches along outer edge
        const ridge = Math.sin(t * Math.PI * 4) * 1.2;
        const r = outerR + ridge;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAng + (endAng - startAng) * t;
        const profile = Math.sin(Math.pow(t, 0.78) * Math.PI);
        const r = Math.max(4, outerR - maxW * profile);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * (isCrit ? 0.68 : 0.48);
      ctx.fillStyle = isCrit ? '#FDE047' : '#FB923C';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = isCrit ? '#FEF08A' : '#FDBA74';
      ctx.fill();
      ctx.strokeStyle = `rgba(18, 15, 23, ${alpha * 0.78})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // Sonic compression ring ahead of gauntlet fist
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.72;
      ctx.strokeStyle = '#FEF9C3';
      ctx.lineWidth = 1.5 * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 3, startAng + 0.15, endAng - 0.05);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    };

    const triggerPunch = () => {
      const isFinisher = comboStep === 2;
      fist.active = true;
      fist.flip = comboStep % 2 === 1;
      fist.isSeismic = isFinisher;
      fist.maxLife = isFinisher ? 0.26 : 0.19;
      fist.life = fist.maxLife;
      fist.radius = isFinisher ? 33 : 27;
      fist.arcSpread = isFinisher ? 1.68 : 1.42;

      const ox = 27;
      const oy = h * 0.5;
      const count = isFinisher ? 9 : 6;
      for (let i = 0; i < count; i++) {
        const slot = chunks.find((c) => !c.active);
        if (!slot) break;
        const t = (i / Math.max(1, count - 1) - 0.5) * fist.arcSpread;
        const dir = fist.flip ? -t : t;
        const r = fist.radius * (0.72 + Math.random() * 0.25);
        const spd = (isFinisher ? 95 : 72) + Math.random() * 40;
        slot.active = true;
        slot.x = ox + Math.cos(dir) * r;
        slot.y = oy + Math.sin(dir) * r;
        slot.vx = Math.cos(dir) * spd;
        slot.vy = Math.sin(dir) * spd;
        slot.rot = dir;
        slot.vRot = (Math.random() - 0.5) * 16;
        slot.isStone = i % 2 === 0;
        slot.size = slot.isStone ? 3.2 : 2.6;
        slot.color = slot.isStone ? '#A8A29E' : isFinisher ? '#FDE047' : '#FB923C';
        slot.maxLife = 0.26;
        slot.life = slot.maxLife;
      }

      comboStep = (comboStep + 1) % 3;
      autoTimer = isFinisher ? 0.52 : 0.3;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      autoTimer -= dt;
      if (autoTimer <= 0) {
        triggerPunch();
      }

      ctx.fillStyle = '#17100C';
      ctx.fillRect(0, 0, w, h);

      // Stocky Gnome Defender silhouette on left
      const lunge = fist.active ? (fist.life / fist.maxLife) * 4.5 : 0;
      ctx.save();
      ctx.translate(20 + lunge, h * 0.5 + 3);
      // Bronze helm + white braided beard + iron gauntlet
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.arc(0, -6, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D97706';
      ctx.fillRect(-7.5, -8.5, 15, 2.8);
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(5, -4);
      ctx.lineTo(1, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FB923C';
      ctx.fillRect(5, -2, 5.5, 5);
      ctx.restore();

      // 60fps Runestone Gauntlet Arc / 3rd-Hit Tectonic Smash
      if (fist.active) {
        fist.life -= dt;
        if (fist.life <= 0) {
          fist.active = false;
        } else {
          const progress = Math.max(0, Math.min(1, 1 - fist.life / fist.maxLife));
          ctx.save();
          ctx.translate(27, h * 0.5);
          if (fist.isSeismic) {
            ctx.save();
            ctx.rotate(-0.18);
            drawGauntletWave(progress, fist.radius, fist.arcSpread, false, true);
            ctx.restore();
            const p2 = Math.max(0, Math.min(1, (progress - 0.06) / 0.94));
            if (p2 > 0) {
              ctx.save();
              ctx.rotate(0.18);
              drawGauntletWave(p2, fist.radius * 0.95, fist.arcSpread, true, true);
              ctx.restore();
            }
            // Radial seismic fracture burst at impact apex
            const fa = Math.max(0, 1 - progress);
            ctx.save();
            ctx.translate(fist.radius * 0.9, 0);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = fa;
            ctx.strokeStyle = '#FDE047';
            ctx.lineWidth = 1.6;
            for (let k = 0; k < 5; k++) {
              const ka = (k / 5) * Math.PI * 2;
              const kr = 4 + progress * 11;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(ka) * kr, Math.sin(ka) * kr);
              ctx.stroke();
            }
            ctx.restore();
          } else {
            drawGauntletWave(progress, fist.radius, fist.arcSpread, fist.flip, false);
          }
          ctx.restore();
        }
      }

      // Flying granite chunks & copper rune sparks
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        if (!c.active) continue;
        c.life -= dt;
        if (c.life <= 0) {
          c.active = false;
          continue;
        }
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vx *= 1 - dt * 5;
        c.vy *= 1 - dt * 5;
        c.rot += c.vRot * dt;

        const a = Math.max(0, c.life / c.maxLife);
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.globalAlpha = a;
        if (c.isStone) {
          ctx.fillStyle = c.color;
          ctx.fillRect(-c.size * 0.6, -c.size * 0.5, c.size * 1.2, c.size);
        } else {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.moveTo(-4, 0);
          ctx.lineTo(0, -1.8);
          ctx.lineTo(4, 0);
          ctx.lineTo(0, 1.8);
          ctx.closePath();
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
      aria-label="Gnome 60fps Runestone Gauntlet and Tectonic Smash preview"
      className="w-full h-full block"
    />
  );
};
