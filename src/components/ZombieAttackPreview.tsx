import React, { useEffect, useRef, useState } from 'react';

interface ZombieAttackPreviewProps {
  initialForm?: 'NORMAL' | 'ABOMINATION';
  onFormChange?: (form: 'NORMAL' | 'ABOMINATION') => void;
}

export const ZombieAttackPreview: React.FC<ZombieAttackPreviewProps> = ({
  initialForm = 'NORMAL',
  onFormChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAbomination, setIsAbomination] = useState<boolean>(initialForm === 'ABOMINATION');
  const isAbominationRef = useRef<boolean>(isAbomination);
  isAbominationRef.current = isAbomination;

  const toggleForm = () => {
    setIsAbomination((prev) => {
      const next = !prev;
      onFormChange?.(next ? 'ABOMINATION' : 'NORMAL');
      return next;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const w = 128;
    const h = 76;
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
      isAbom: false,
      radius: 28,
      arcSpread: 1.48,
    };

    const particles = Array.from({ length: 28 }, () => ({
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
      isAcid: false,
    }));

    const triggerClawSwipe = () => {
      const isFinisher = comboStep === 2;
      const abom = isAbominationRef.current;

      claw.active = true;
      claw.flip = comboStep % 2 === 1;
      claw.isFinisher = isFinisher;
      claw.isAbom = abom;
      claw.maxLife = abom ? (isFinisher ? 0.32 : 0.22) : (isFinisher ? 0.24 : 0.185);
      claw.life = claw.maxLife;
      claw.radius = abom ? (isFinisher ? 46 : 38) : (isFinisher ? 32 : 27);
      claw.arcSpread = abom ? (isFinisher ? 1.95 : 1.72) : (isFinisher ? 1.72 : 1.45);

      const ox = abom ? 32 : 27;
      const oy = h * 0.5;
      const count = abom ? (isFinisher ? 16 : 10) : (isFinisher ? 9 : 6);

      for (let i = 0; i < count; i++) {
        const slot = particles.find((p) => !p.active);
        if (!slot) break;
        const t = (i / Math.max(1, count - 1) - 0.5) * claw.arcSpread;
        const dir = claw.flip ? -t : t;
        const r = claw.radius * (0.65 + Math.random() * 0.35);
        const isSpore = i % 3 === 1;
        const isAcid = abom && i % 2 === 0;
        const tangent = dir + (claw.flip ? -Math.PI * 0.34 : Math.PI * 0.34);
        const spd = isSpore
          ? 26 + Math.random() * 22
          : (isFinisher ? 110 : 80) + Math.random() * 55;

        slot.active = true;
        slot.x = ox + Math.cos(dir) * r;
        slot.y = oy + Math.sin(dir) * r;
        slot.vx = Math.cos(tangent) * spd;
        slot.vy = Math.sin(tangent) * spd - (isSpore ? 10 : 0);
        slot.rot = tangent;
        slot.isSpore = isSpore;
        slot.isAcid = isAcid;
        slot.size = abom ? (isSpore ? 6.5 : 4.4) : (isSpore ? 4.8 : 3.2);
        slot.color = isAcid
          ? isFinisher ? '#ECFCCB' : '#BEF264'
          : isSpore
          ? '#4ADE80'
          : '#A3E635';
        slot.maxLife = isSpore ? 0.38 : 0.26;
        slot.life = slot.maxLife;
      }

      comboStep = (comboStep + 1) % 3;
      autoTimer = abom ? (isFinisher ? 0.62 : 0.34) : (isFinisher ? 0.54 : 0.32);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      autoTimer -= dt;
      if (autoTimer <= 0) {
        triggerClawSwipe();
      }

      const abom = isAbominationRef.current;
      ctx.fillStyle = abom ? '#07140D' : '#091812';
      ctx.fillRect(0, 0, w, h);

      // Subtle dungeon stone grid floor lines
      ctx.save();
      ctx.strokeStyle = abom ? 'rgba(34, 197, 94, 0.08)' : 'rgba(74, 222, 128, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w, h * 0.5);
      ctx.moveTo(w * 0.5, 0);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.restore();

      // Zombie Silhouette on left (Transformed Abomination vs Standard Form)
      ctx.save();
      if (abom) {
        // Colossal Mutated Abomination Avatar (Broad shoulders, bone spurs, radioactive eye)
        ctx.translate(26, h * 0.5 + 3);
        // Torso / Ripped clothing
        ctx.fillStyle = '#631828';
        ctx.fillRect(-10, -2, 18, 7);
        // Hulk-like muscular green mass
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(0, -9, 11, 0, Math.PI * 2);
        ctx.fill();
        // Calcified shoulder bone spikes
        ctx.fillStyle = '#ECFCCB';
        ctx.beginPath();
        ctx.moveTo(-11, -11);
        ctx.lineTo(-15, -17);
        ctx.lineTo(-7, -12);
        ctx.closePath();
        ctx.fill();
        // Glowing Neon Toxic Eye
        ctx.fillStyle = '#BEF264';
        ctx.beginPath();
        ctx.arc(4, -9, 2.8, 0, Math.PI * 2);
        ctx.fill();
        // Pulsing toxic aura
        ctx.strokeStyle = 'rgba(163, 230, 53, 0.35)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, -9, 13.5 + Math.sin(now * 0.008) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Standard Zombie silhouette
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
      }
      ctx.restore();

      // Render Attack Effects
      if (claw.active) {
        claw.life -= dt;
        if (claw.life <= 0) {
          claw.active = false;
        } else {
          const progress = Math.max(0, Math.min(1, 1 - claw.life / claw.maxLife));
          const alpha = Math.max(0, 1 - Math.pow(progress, 2.1));
          const half = claw.arcSpread * 0.5;

          ctx.save();
          ctx.translate(claw.isAbom ? 32 : 27, h * 0.5);

          if (claw.isAbom) {
            // ==================== ABOMINATION TRANSFORMED BASIC ATTACKS ====================
            if (claw.isFinisher) {
              // 3rd-Hit Finisher: Titanic Earthshatter Slam & Erupting Monolith Fissures
              const easeOut = 1 - Math.pow(1 - progress, 3);
              const shockR = claw.radius * (0.35 + easeOut * 0.75);

              // 1. Expanding Neon Acid Shockwave
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = alpha * 0.65;
              ctx.strokeStyle = '#BEF264';
              ctx.lineWidth = 6 * (1 - progress * 0.5);
              ctx.beginPath();
              ctx.ellipse(claw.radius * 0.38, 0, shockR, shockR * 0.55, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();

              // 2. Deep Ground Fissures
              ctx.save();
              ctx.globalAlpha = alpha * 0.95;
              for (let f = -2; f <= 2; f++) {
                const fAng = f * 0.28;
                const fLen = claw.radius * (0.7 + Math.abs(f) * 0.12) * Math.min(1, progress * 2.2);
                const x0 = claw.radius * 0.18;
                const y0 = 0;
                const x1 = x0 + Math.cos(fAng) * fLen;
                const y1 = y0 + Math.sin(fAng) * fLen;

                ctx.strokeStyle = '#ECFCCB';
                ctx.lineWidth = (f === 0 ? 3.2 : 2.2) * (1 - progress * 0.3);
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();

                ctx.strokeStyle = '#14532D';
                ctx.lineWidth = 1.4;
                ctx.stroke();
              }
              ctx.restore();

              // 3. Erupting Bone Monolith Spikes
              ctx.save();
              ctx.globalAlpha = alpha;
              for (let s = -2; s <= 2; s++) {
                const sAng = s * 0.28;
                const sx = claw.radius * 0.22 + Math.cos(sAng) * (claw.radius * 0.58);
                const sy = Math.sin(sAng) * (claw.radius * 0.45);
                const sH = (s === 0 ? 16 : 12) * (1 - progress * 0.25);
                ctx.save();
                ctx.translate(sx, sy);
                ctx.fillStyle = '#ECFCCB';
                ctx.beginPath();
                ctx.moveTo(-3, 0);
                ctx.lineTo(0, -sH);
                ctx.lineTo(3, 0);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#14532D';
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.restore();
              }
              ctx.restore();
            } else {
              // Hit 1 & 2: 4-Pronged Monstrous Mutant Claw Cleave
              if (claw.flip) ctx.scale(1, -1);

              // Glowing Lime Miasma Wake
              const wHead = 1 - Math.pow(1 - Math.min(1, progress * 1.5), 3);
              const wTail = Math.pow(Math.max(0, (progress - 0.14) / 0.86), 2.1);
              const w0 = -half + claw.arcSpread * wTail;
              const w1 = -half + claw.arcSpread * wHead;
              if (w1 - w0 > 0.04) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = alpha * 0.5;
                ctx.strokeStyle = '#84CC16';
                ctx.lineWidth = 18 * (1 - progress * 0.35);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(0, 0, claw.radius * 0.86, w0, w1);
                ctx.stroke();
                ctx.restore();
              }

              // 4 Jagged Mutant Talons
              const tOffsets = [1.06, 0.92, 0.78, 0.64];
              const tDelays = [0, 0.03, 0.06, 0.09];
              for (let c = 0; c < 4; c++) {
                const localP = Math.max(0, Math.min(1, (progress - tDelays[c]) / (1 - tDelays[c])));
                if (localP <= 0) continue;
                const hP = 1 - Math.pow(1 - Math.min(1, localP * 1.6), 3);
                const tP = Math.pow(Math.max(0, (localP - 0.12) / 0.88), 2.2);
                const sA = -half + claw.arcSpread * tP;
                const eA = -half + claw.arcSpread * hP;
                if (eA - sA <= 0.03) continue;

                const cR = claw.radius * tOffsets[c] * (0.94 + hP * 0.08);
                const maxW = (c === 1 || c === 2 ? 6.5 : 4.8) * (1 - localP * 0.42);

                ctx.beginPath();
                for (let i = 0; i <= 14; i++) {
                  const t = i / 14;
                  const a = sA + (eA - sA) * t;
                  const px = Math.cos(a) * cR;
                  const py = Math.sin(a) * cR;
                  if (i === 0) ctx.moveTo(px, py);
                  else ctx.lineTo(px, py);
                }
                for (let i = 14; i >= 0; i--) {
                  const t = i / 14;
                  const a = sA + (eA - sA) * t;
                  const profile = Math.sin(Math.pow(t, 0.7) * Math.PI);
                  const r = Math.max(4, cR - maxW * profile);
                  ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.closePath();

                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = alpha * 0.65;
                ctx.fillStyle = '#BEF264';
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = c === 1 || c === 2 ? '#ECFCCB' : '#A3E635';
                ctx.fill();
                ctx.lineWidth = 1.4;
                ctx.strokeStyle = `rgba(15, 23, 14, ${alpha * 0.85})`;
                ctx.stroke();
                ctx.restore();
              }
            }
          } else {
            // ==================== STANDARD ZOMBIE BASIC ATTACKS ====================
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
              const offsets = [1.02, 0.85, 0.68];
              const delays = [0, 0.045, 0.09];
              const widths = [4.2, 5.2, 3.6];

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
          }

          ctx.restore();
        }
      }

      // Venom droplets, acidic splatters & spore puffs
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
          ctx.ellipse(0, 0, p.size, p.size * (p.isAcid ? 0.65 : 0.48), 0, 0, Math.PI * 2);
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
    <div
      onClick={toggleForm}
      className="relative w-full h-full cursor-pointer group select-none overflow-hidden"
      title="Click to toggle Normal vs Abomination Form 60fps basic attacks"
    >
      <canvas
        ref={canvasRef}
        aria-label="Zombie 60fps basic attack preview with Abomination transformation"
        className="w-full h-full block"
      />
      {/* Interactive Form Switcher Badge */}
      <div className="absolute top-1 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono-num font-semibold border backdrop-blur-sm transition-all shadow-sm flex items-center gap-1 bg-[#121E16]/80 text-[#86EFAC] border-[#2A5C3C] group-hover:border-[#4ADE80]">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isAbomination ? 'bg-[#BEF264] animate-pulse' : 'bg-[#4ADE80]'
          }`}
        />
        {isAbomination ? 'Abomination' : 'Normal'}
      </div>
    </div>
  );
};
