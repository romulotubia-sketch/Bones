import React, { useEffect, useRef } from 'react';

interface PreviewSpear {
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  color: string;
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

interface PreviewShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

/**
 * 60fps HTML5 Canvas Preview of Lizardfolk's Spirit of the Great Hunt Summoned Ally:
 * - Ultra-smooth 60fps ranged throwing animation (Cock/Windup -> Snap Release -> Follow-through -> Materialize)
 * - Ranged high-velocity spectral javelin projectiles with oscillating ribbons
 * - Dynamic ancestral cyan-emerald aura, tail undulation, and impact shockwaves
 */
export const SpiritOfTheGreatHuntPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = 112;
    const height = 68;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    let rafId = 0;
    let lastTs = performance.now();
    let animTimer = 0.85; // cycle timer
    const totalCycle = 0.95;
    let targetHitFlash = 0;
    let targetShake = 0;

    const spears: PreviewSpear[] = [];
    const sparks: PreviewSpark[] = [];
    const waves: PreviewShockwave[] = [];

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const time = now / 1000;

      animTimer -= dt;
      if (animTimer <= 0) {
        animTimer = totalCycle;
      }

      const cycleProgress = 1 - animTimer / totalCycle;

      // Projectile launch at snap point (around 38% into the cycle)
      if (cycleProgress >= 0.38 && cycleProgress < 0.38 + dt * 2 && spears.length === 0) {
        spears.push({
          x: 32,
          y: 34,
          vx: 270,
          vy: 0,
          scale: 1.15,
          color: '#34D399',
          life: 0.45,
        });
        waves.push({
          x: 32,
          y: 34,
          radius: 4,
          maxRadius: 18,
          life: 0.2,
          maxLife: 0.2,
          color: '#6EE7B7',
        });
        for (let s = 0; s < 5; s++) {
          const ang = (Math.random() - 0.5) * 1.4;
          const spd = 30 + Math.random() * 40;
          sparks.push({
            x: 32,
            y: 34,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            size: 2,
            color: s % 2 === 0 ? '#6EE7B7' : '#FDE047',
            life: 0.25,
            maxLife: 0.25,
          });
        }
      }

      // Step spears
      for (let i = spears.length - 1; i >= 0; i--) {
        const sp = spears[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;

        if (sp.x >= 92) {
          targetHitFlash = 1.0;
          targetShake = 1.0;

          waves.push({
            x: 94,
            y: 34,
            radius: 5,
            maxRadius: 24,
            life: 0.24,
            maxLife: 0.24,
            color: '#34D399',
          });

          for (let s = 0; s < 9; s++) {
            const ang = Math.PI + (Math.random() - 0.5) * 2.2;
            const spd = 45 + Math.random() * 55;
            sparks.push({
              x: 94,
              y: sp.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              size: 2.2,
              color: s % 3 === 0 ? '#FDE047' : s % 3 === 1 ? '#34D399' : '#6EE7B7',
              life: 0.3,
              maxLife: 0.3,
            });
          }

          spears.splice(i, 1);
        } else if (sp.life <= 0) {
          spears.splice(i, 1);
        }
      }

      // Step waves
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.life -= dt;
        if (w.life <= 0) waves.splice(i, 1);
      }

      // Step sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }

      if (targetHitFlash > 0) targetHitFlash = Math.max(0, targetHitFlash - dt * 3.5);
      if (targetShake > 0) targetShake = Math.max(0, targetShake - dt * 4.0);

      // Render 60fps canvas
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Trajectory dash line
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(30, 34);
      ctx.lineTo(92, 34);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge label
      ctx.fillStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALLY RANGED JAVELIN', 61, 12);

      // Target Dummy on right
      ctx.save();
      const shakeX = targetShake > 0.05 ? (Math.random() - 0.5) * 4 * targetShake : 0;
      const shakeY = targetShake > 0.05 ? (Math.random() - 0.5) * 2 * targetShake : 0;
      ctx.translate(94 + shakeX, 34 + shakeY);
      const hitScale = 1 + targetHitFlash * 0.22;
      ctx.scale(hitScale, hitScale);

      // Target shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dummy body
      ctx.fillStyle = targetHitFlash > 0.1 ? '#FFFFFF' : '#451A03';
      ctx.strokeStyle = targetHitFlash > 0.1 ? '#FDE047' : '#92400E';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-5, -12, 10, 24);
      ctx.strokeRect(-5, -12, 10, 24);

      // Bullseye
      ctx.fillStyle = targetHitFlash > 0.1 ? '#EF4444' : '#DC2626';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Summoned Spirit of the Great Hunt on left
      const bob = Math.sin(time * 5) * 2.5;
      ctx.save();
      ctx.translate(22, 34 + bob);

      // Ethereal ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(0, 16 - bob, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ethereal cyan-emerald glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowGrad = ctx.createRadialGradient(0, -6, 3, 0, -6, 28);
      glowGrad.addColorStop(0, 'rgba(110, 231, 183, 0.6)');
      glowGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.25)');
      glowGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, -6, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Phantasmal undulating lizard tail
      const tailWag = Math.sin(time * 6) * 5;
      ctx.save();
      ctx.strokeStyle = '#065F46';
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, 4);
      ctx.quadraticCurveTo(-14, 8 + tailWag * 0.4, -22, 10 + tailWag);
      ctx.stroke();
      ctx.restore();

      // Attack Animation Phases (60fps subpixel interpolation)
      let torsoTilt = 0;
      let handX = 10;
      let handY = -4;
      let spearAngle = -0.22;
      let spearThrust = 0;
      let spearAlpha = 1;
      let eyeGlow = 2.2;
      let gatherR = 0;

      if (cycleProgress < 0.36) {
        // Windup & Cocking spear backward
        const t = cycleProgress / 0.36;
        const ease = Math.sin(t * Math.PI * 0.5);
        torsoTilt = -0.22 * ease;
        handX = 10 - 20 * ease;
        handY = -4 - 8 * ease;
        spearAngle = -0.22 - 0.45 * ease;
        spearThrust = -12 * ease;
        eyeGlow = 2.2 + 1.6 * ease;
        gatherR = 7 * ease;
      } else if (cycleProgress < 0.56) {
        // Snap Throw Release
        const t = (cycleProgress - 0.36) / 0.2;
        const ease = Math.sin(t * Math.PI * 0.5);
        torsoTilt = 0.26 * (1 - ease * 0.5);
        handX = -10 + 32 * ease;
        handY = -12 + 14 * ease;
        spearAngle = 0;
        spearThrust = 12 + 22 * ease;
        eyeGlow = 3.4 - 1.2 * ease;
        if (t > 0.25) {
          spearAlpha = Math.max(0, 1 - (t - 0.25) / 0.5);
        }
      } else {
        // Recovery & Rematerialize
        const t = (cycleProgress - 0.56) / 0.44;
        torsoTilt = 0.12 * (1 - t);
        handX = 22 - 12 * t;
        handY = 2 - 6 * t;
        spearAngle = -0.22 * (1 - t);
        spearThrust = 0;
        spearAlpha = t;
        eyeGlow = 2.2;
      }

      // Torso & head tilted
      ctx.save();
      ctx.rotate(torsoTilt);
      ctx.fillStyle = '#065F46';
      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 1.6;

      // Torso
      ctx.beginPath();
      ctx.roundRect(-8, -8, 16, 18, 4);
      ctx.fill();
      ctx.stroke();

      // Back spines
      ctx.fillStyle = '#34D399';
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.lineTo(-12, -9);
      ctx.lineTo(-6, -3);
      ctx.closePath();
      ctx.fill();

      // Head & snout
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(0, -18);
      ctx.lineTo(11, -13);
      ctx.lineTo(6, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing hunter eye
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(4, -12, eyeGlow, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Arm & Spear
      ctx.save();
      ctx.translate(handX, handY);
      ctx.rotate(spearAngle);

      // Windup gathering aura
      if (gatherR > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(24 + spearThrust, 0, gatherR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (spearAlpha > 0.05) {
        ctx.save();
        ctx.globalAlpha = spearAlpha;

        // Spear glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(-18 + spearThrust, 0);
        ctx.lineTo(22 + spearThrust, 0);
        ctx.stroke();
        ctx.restore();

        // Spear Shaft
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-18 + spearThrust, 0);
        ctx.lineTo(22 + spearThrust, 0);
        ctx.stroke();

        // Barbed Spearhead
        ctx.fillStyle = '#6EE7B7';
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(28 + spearThrust, 0);
        ctx.lineTo(17 + spearThrust, -5);
        ctx.lineTo(19 + spearThrust, -1.6);
        ctx.lineTo(2 + spearThrust, 0);
        ctx.lineTo(19 + spearThrust, 1.6);
        ctx.lineTo(17 + spearThrust, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // Claws hand
      ctx.fillStyle = '#065F46';
      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
      ctx.restore();

      // Render shockwaves
      for (const w of waves) {
        ctx.save();
        ctx.globalAlpha = w.life / w.maxLife;
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius + (w.maxRadius - w.radius) * (1 - w.life / w.maxLife), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Render flying spears
      for (const sp of spears) {
        ctx.save();
        ctx.translate(sp.x, sp.y);
        ctx.scale(sp.scale, sp.scale);
        ctx.globalCompositeOperation = 'lighter';

        // Oscillating wake ribbons at 60fps
        const rib = Math.sin(time * 24) * 2;
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(-28, rib);
        ctx.lineTo(4, 0);
        ctx.stroke();

        // Luminous shaft
        ctx.strokeStyle = '#6EE7B7';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-24, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();

        // Barbed head
        ctx.fillStyle = '#A7F3D0';
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(12, -4.5);
        ctx.lineTo(14, -1.4);
        ctx.lineTo(0, 0);
        ctx.lineTo(14, 1.4);
        ctx.lineTo(12, 4.5);
        ctx.closePath();
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
      style={{ width: '112px', height: '68px' }}
    />
  );
};
