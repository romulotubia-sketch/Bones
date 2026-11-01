/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { drawHeroCharacter, RenderPlayerState } from '../game/renderer';
import { CharacterId, GamePhase } from '../types/game';

interface LobbyHeroCanvasProps {
  characterId: CharacterId;
  channelState: 'IDLE' | 'CHANNELING' | 'SUCCESS' | 'FAIL';
  awakenedForm?: RenderPlayerState['awakenedForm'];
  className?: string;
}

export const LobbyHeroCanvas: React.FC<LobbyHeroCanvasProps> = ({
  characterId,
  channelState,
  awakenedForm,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let startTime = performance.now();

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      maxLife: number;
    }[] = [];

    const render = (now: number) => {
      const time = (now - startTime) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.55;

      // 1. Consecrated Arcane Dais / Cobblestone circle beneath feet
      ctx.save();
      const daisRadiusX = 48;
      const daisRadiusY = 22;

      // Outer glowing rim
      const glowGrad = ctx.createRadialGradient(cx, cy + 12, 5, cx, cy + 12, 65);
      glowGrad.addColorStop(0, 'rgba(126, 34, 206, 0.45)');
      glowGrad.addColorStop(0.7, 'rgba(99, 102, 241, 0.2)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12, 65, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stone dais base
      ctx.fillStyle = '#1D172A';
      ctx.strokeStyle = '#43315B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12, daisRadiusX, daisRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating magic runes around the dais
      const runeAngle = time * (channelState === 'CHANNELING' ? 3.5 : 0.8);
      ctx.save();
      ctx.translate(cx, cy + 12);
      ctx.rotate(runeAngle);
      ctx.strokeStyle =
        channelState === 'SUCCESS'
          ? '#FBBF24'
          : channelState === 'FAIL'
          ? '#EF4444'
          : channelState === 'CHANNELING'
          ? '#C084FC'
          : 'rgba(192, 132, 252, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, daisRadiusX - 4, (daisRadiusX - 4) * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Particle spawns for channeling / success / failure
      if (channelState === 'CHANNELING' && Math.random() < 0.4) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 25;
        particles.push({
          x: cx + Math.cos(ang) * dist,
          y: cy + Math.sin(ang) * dist * 0.5,
          vx: -Math.cos(ang) * 45,
          vy: -Math.sin(ang) * 35,
          size: 2.5 + Math.random() * 2.5,
          color: Math.random() < 0.5 ? '#C084FC' : '#38BDF8',
          life: 0.6,
          maxLife: 0.6,
        });
      } else if (channelState === 'SUCCESS' && Math.random() < 0.5) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + 10,
          vx: (Math.random() - 0.5) * 50,
          vy: -50 - Math.random() * 60,
          size: 3 + Math.random() * 3,
          color: Math.random() < 0.6 ? '#FDE047' : '#6EE7B7',
          life: 0.8,
          maxLife: 0.8,
        });
      } else if (channelState === 'FAIL' && Math.random() < 0.3) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          size: 2.5,
          color: '#EF4444',
          life: 0.5,
          maxLife: 0.5,
        });
      }

      // Update & render particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.016;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();

      // 2. Render Hero Character walking/idling exactly as in the lobby!
      ctx.save();
      // Position at center of canvas, scale up 1.55x for crisp compact view
      const scale = 1.55;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Walk cycle animation (gentle walking step sway)
      const walkSpeed = channelState === 'CHANNELING' ? 8 : 3.2;
      const walkPhase = time * walkSpeed;
      const isWalking = true;

      const playerState: RenderPlayerState = {
        characterId,
        x: 0,
        y: 0,
        vx: isWalking ? 15 : 0,
        vy: 0,
        radius: 16,
        aimAngle: Math.sin(time * 1.5) * 0.25,
        facingX: 1,
        walkPhase,
        hitFlashTimer: channelState === 'FAIL' ? 0.35 : 0,
        squashX: channelState === 'SUCCESS' ? 1.08 + Math.sin(time * 12) * 0.08 : 1.0,
        squashY: channelState === 'SUCCESS' ? 1.08 - Math.sin(time * 12) * 0.08 : 1.0,
        undyingTimer: 0,
        abominationTimer: 0,
        ribcageTimer: 0,
        ribcageCharges: 0,
        boneStormTimer: 0,
        colossusTimer: 0,
        unyieldingStacks: 0,
        windrunnerTimer: 0,
        poisonBladesTimer: 0,
        stolenMightTimer: 0,
        fortressTimer: 0,
        magneticTimer: 0,
        mountainHeartTimer: 0,
        leapAirProgress: 0,
        resolveRatio: 1,
        dashTimer: 0,
        hoveredInGuild: true,
        awakenedForm,
      };

      drawHeroCharacter(ctx, playerState, GamePhase.GuildRoam, time, true);
      ctx.restore();

      // 3. Victory golden celestial rays overlay on success
      if (channelState === 'SUCCESS') {
        ctx.save();
        ctx.translate(cx, cy - 20);
        ctx.rotate(time * 1.8);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
        ctx.lineWidth = 2;
        for (let r = 0; r < 8; r++) {
          const a = (r * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24);
          ctx.lineTo(Math.cos(a) * 60, Math.sin(a) * 60);
          ctx.stroke();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [characterId, channelState, awakenedForm]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={115}
      className={`block w-full h-[95px] sm:h-[110px] object-contain select-none pointer-events-none ${className}`}
    />
  );
};
