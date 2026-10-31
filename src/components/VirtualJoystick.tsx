import React, { useCallback, useEffect, useRef, useState } from 'react';
import { clientDeltaToLandscape } from '../utils/orientation';

interface VirtualJoystickProps {
  onMove: (nx: number, ny: number) => void;
  scale?: number;
}

const MAX_KNOB_RADIUS = 42;
const DEADZONE = 0.08;

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, scale = 1 }) => {
  const activePointerId = useRef<number | null>(null);
  const startClientPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const resetStick = useCallback(() => {
    activePointerId.current = null;
    setIsPressed(false);
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    }
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    const handleBlur = () => resetStick();
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
      onMove(0, 0);
    };
  }, [onMove, resetStick]);

  const updateVectorFromClient = (clientX: number, clientY: number) => {
    const { dx, dy } = clientDeltaToLandscape(
      clientX - startClientPos.current.x,
      clientY - startClientPos.current.y
    );

    const effectiveMaxRadius = MAX_KNOB_RADIUS * scale;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, effectiveMaxRadius);
    const angle = dist > 0.0001 ? Math.atan2(dy, dx) : 0;

    const localDist = clampedDist / scale;
    const kx = Math.cos(angle) * localDist;
    const ky = Math.sin(angle) * localDist;

    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0px)`;
    }

    const rawMag = clampedDist / effectiveMaxRadius;
    if (rawMag < DEADZONE) {
      onMove(0, 0);
      return;
    }

    const rescaledMag = (rawMag - DEADZONE) / (1 - DEADZONE);
    onMove(Math.cos(angle) * rescaledMag, Math.sin(angle) * rescaledMag);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    startClientPos.current = { x: e.clientX, y: e.clientY };
    setIsPressed(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateVectorFromClient(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    updateVectorFromClient(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetStick();
  };

  return (
    <div
      role="application"
      aria-label="Movement Joystick"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onLostPointerCapture={resetStick}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'bottom left',
      }}
      className="pointer-events-auto touch-none select-none w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center relative cursor-pointer will-change-transform"
    >
      {/* Outer tactile ring */}
      <div
        className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 flex items-center justify-center transition-colors duration-150 ${
          isPressed
            ? 'bg-[#182220]/90 border-[#4ADE80]'
            : 'bg-[#16131E]/85 border-[#3A334E]'
        }`}
      >
        {/* Subtle cardinal direction notches */}
        <span className="absolute top-5 w-1.5 h-1.5 rounded-full bg-[#4B4263]" />
        <span className="absolute bottom-5 w-1.5 h-1.5 rounded-full bg-[#4B4263]" />
        <span className="absolute left-5 w-1.5 h-1.5 rounded-full bg-[#4B4263]" />
        <span className="absolute right-5 w-1.5 h-1.5 rounded-full bg-[#4B4263]" />

        {/* Inner thumb stick knob */}
        <div
          ref={knobRef}
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 shadow-lg flex items-center justify-center will-change-transform ${
            isPressed
              ? 'bg-[#4ADE80] border-[#DCFCE7]'
              : 'bg-[#2A2438] border-[#655B7C]'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full ${
              isPressed ? 'bg-[#102618]/45' : 'bg-[#4ADE80]/65'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
