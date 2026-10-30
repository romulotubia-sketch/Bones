import React, { useEffect, useRef } from 'react';

export const GoblinAttackPreview: React.FC = () => {
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
    let autoTimer = 0.06;

    const slash = {
      active: false,
      life: 0,
      maxLife: 0.16,
      flip: false,
      isTwinCross: false,
      isVenom: false,
      radius: 28,
      arcSpread: 1.5,
    };

    const sparks = Array.from({ length: 18 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      len: 8,
      life: 0,
      maxLife: 0.22,
      color: '#FDE047',
      isVenom: false,
    }));

    let cycleCount = 0;

    const drawCrescent = (
      progress: number,
      radius: number,
      arcSpread: number,
      flip: boolean,
      isVenom: boolean,
      isCrit: boolean
    ) => {
      const headEase = 1 - Math.pow(1 - Math.min(1, progress * 1.68), 3);
      const tailEase = Math.pow(Math.max(0, (progress - 0.1) / 0.9), 2.15);
      const alpha = Math.max(0, 1 - Math.pow(progress, 2.35));
      const half = arcSpread * 0.5;
      const startAng = -half + arcSpread * tailEase;
      const endAng = -half + arcSpread * headEase;
      if (endAng - startAng <= 0.04) return;

      const outerR = radius * (0.95 + headEase * 0.07);
      const maxW = (isCrit ? 9.2 : 7.2) * (1 - progress * 0.42);
      const steps = 14;

      ctx.save();
      if (flip) ctx.scale(1, -1);

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAng + (endAng - startAng) * t;
        const hook = Math.sin(Math.pow(t, 1.8) * Math.PI) * 1.8;
        const r = outerR + hook;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = startAng + (endAng - startAng) * t;
        const profile = Math.sin(Math.pow(t, 0.8) * Math.PI);
        const r = Math.max(4, outerR - maxW * profile);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * (isCrit ? 0.65 : 0.46);
      ctx.fillStyle = isVenom ? '#84CC16' : isCrit ? '#FDE047' : '#F59E0B';
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = isVenom ? '#ECFCCB' : isCrit ? '#FEF9C3' : '#FDE047';
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    const triggerDaggerCombo = () => {
      const isFinisher = comboStep === 2;
      const isVenom = Math.floor(cycleCount / 3) % 2 === 1;
      slash.active = true;
      slash.flip = comboStep % 2 === 1;
      slash.isTwinCross = isFinisher;
      slash.isVenom = isVenom;
      slash.maxLife = isFinisher ? 0.21 : 0.145;
      slash.life = slash.maxLife;
      slash.radius = isFinisher ? 32 : 27;
      slash.arcSpread = isFinisher ? 1.72 : 1.48;

      const ox = 27;
      const oy = h * 0.5;
      const count = isFinisher ? 8 : 5;
      for (let i = 0; i < count; i++) {
        const slot = sparks.find((s) => !s.active);
        if (!slot) break;
        const t = (i / Math.max(1, count - 1) - 0.5) * slash.arcSpread;
        const dir = slash.flip ? -t : t;
        const r = slash.radius * (0.72 + Math.random() * 0.28);
        const tangent = dir + (slash.flip ? -Math.PI * 0.34 : Math.PI * 0.34);
        const spd = (isFinisher ? 115 : 88) + Math.random() * 45;
        slot.active = true;
        slot.x = ox + Math.cos(dir) * r;
        slot.y = oy + Math.sin(dir) * r;
        slot.vx = Math.cos(tangent) * spd;
        slot.vy = Math.sin(tangent) * spd;
        slot.rot = tangent;
        slot.len = isFinisher ? 9 : 6.5;
        slot.isVenom = isVenom && i % 2 === 1;
        slot.color = slot.isVenom ? '#A3E635' : isFinisher ? '#FEF08A' : '#FBBF24';
        slot.maxLife = 0.2;
        slot.life = slot.maxLife;
      }

      comboStep = (comboStep + 1) % 3;
      cycleCount++;
      autoTimer = isFinisher ? 0.46 : 0.22;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      autoTimer -= dt;
      if (autoTimer <= 0) {
        triggerDaggerCombo();
      }

      ctx.fillStyle = '#140F0A';
      ctx.fillRect(0, 0, w, h);

      // Mini Goblin Assassin silhouette on left
      const lunge = slash.active ? (slash.life / slash.maxLife) * 3.5 : 0;
      ctx.save();
      ctx.translate(20 + lunge, h * 0.5 + 3);
      ctx.fillStyle = '#9A3412';
      ctx.beginPath();
      ctx.arc(0, -6, 7.5, 0, Math.PI * 2);
      ctx.fill();
      // Pointed ears
      ctx.fillStyle = '#65A30D';
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-13, -10);
      ctx.lineTo(-6, -4);
      ctx.fill();
      // Amber eyes
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(2.8, -6, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 60fps Twin-Dagger Crescent / Scissor X-Slash
      if (slash.active) {
        slash.life -= dt;
        if (slash.life <= 0) {
          slash.active = false;
        } else {
          const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
          ctx.save();
          ctx.translate(27, h * 0.5);
          if (slash.isTwinCross) {
            ctx.save();
            ctx.rotate(-0.22);
            drawCrescent(progress, slash.radius, slash.arcSpread, false, slash.isVenom, true);
            ctx.restore();
            const p2 = Math.max(0, Math.min(1, (progress - 0.08) / 0.92));
            if (p2 > 0) {
              ctx.save();
              ctx.rotate(0.22);
              drawCrescent(p2, slash.radius * 0.95, slash.arcSpread, true, slash.isVenom, true);
              ctx.restore();
            }
            if (progress > 0.08 && progress < 0.72) {
              const fa = Math.sin(((progress - 0.08) / 0.64) * Math.PI);
              const arm = 8.5 * fa;
              ctx.save();
              ctx.translate(slash.radius * 0.84, 0);
              ctx.rotate(Math.PI * 0.25);
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = fa;
              ctx.fillStyle = '#FFFFFF';
              for (let k = 0; k < 2; k++) {
                ctx.rotate(Math.PI * 0.5);
                ctx.beginPath();
                ctx.moveTo(-arm, 0);
                ctx.lineTo(0, -1.8);
                ctx.lineTo(arm, 0);
                ctx.lineTo(0, 1.8);
                ctx.closePath();
                ctx.fill();
              }
              ctx.restore();
            }
          } else {
            drawCrescent(progress, slash.radius, slash.arcSpread, slash.flip, slash.isVenom, false);
          }
          ctx.restore();
        }
      }

      // Tangential velocity streaks & venom droplets
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        if (!s.active) continue;
        s.life -= dt;
        if (s.life <= 0) {
          s.active = false;
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 1 - dt * 6;
        s.vy *= 1 - dt * 6;

        const a = Math.max(0, s.life / s.maxLife);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.globalAlpha = a;
        if (s.isVenom) {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.6 * a;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-s.len, 0);
          ctx.lineTo(s.len * 0.4, 0);
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
      aria-label="Goblin 60fps Twin-Dagger Crescent and Scissor X-Slash preview"
      className="w-full h-full block"
    />
  );
};
