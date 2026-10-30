import React, { useEffect, useRef } from 'react';
import { clientDeltaToLandscape } from '../utils/orientation';

interface ScrollablePaneProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Landscape-stage-aware mobile touch & wheel scroll container.
 * Uses pointer drag with inertia so vertical scrolling works identically in both
 * native landscape and +90deg portrait-rotated landscape, while suppressing
 * accidental button clicks after a scroll swipe.
 */
export const ScrollablePane: React.FC<ScrollablePaneProps> = ({ children, className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const prevClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const accumMoveRef = useRef(0);
  const isDraggingScrollRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const velocityYRef = useRef(0);
  const momentumRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (momentumRafRef.current !== null) {
        cancelAnimationFrame(momentumRafRef.current);
      }
    };
  }, []);

  const stopMomentum = () => {
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    velocityYRef.current = 0;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stopMomentum();
    pointerIdRef.current = e.pointerId;
    prevClientRef.current = { x: e.clientX, y: e.clientY };
    accumMoveRef.current = 0;
    isDraggingScrollRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const rawDx = e.clientX - prevClientRef.current.x;
    const rawDy = e.clientY - prevClientRef.current.y;
    prevClientRef.current = { x: e.clientX, y: e.clientY };

    const { dx, dy } = clientDeltaToLandscape(rawDx, rawDy);
    accumMoveRef.current += Math.hypot(dx, dy);

    if (!isDraggingScrollRef.current && accumMoveRef.current > 8) {
      isDraggingScrollRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture errors
      }
    }

    if (isDraggingScrollRef.current) {
      e.preventDefault();
      el.scrollTop -= dy;
      velocityYRef.current = velocityYRef.current * 0.35 + -dy * 0.65;
    }
  };

  const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    if (isDraggingScrollRef.current) {
      suppressClickUntilRef.current = performance.now() + 180;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }

      const el = containerRef.current;
      if (el && Math.abs(velocityYRef.current) > 1.0) {
        const stepMomentum = () => {
          if (!containerRef.current || Math.abs(velocityYRef.current) < 0.45) {
            momentumRafRef.current = null;
            return;
          }
          containerRef.current.scrollTop += velocityYRef.current;
          velocityYRef.current *= 0.92;
          momentumRafRef.current = requestAnimationFrame(stepMomentum);
        };
        momentumRafRef.current = requestAnimationFrame(stepMomentum);
      }
    }

    pointerIdRef.current = null;
    isDraggingScrollRef.current = false;
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (performance.now() < suppressClickUntilRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onClickCapture={handleClickCapture}
      className={`overflow-y-auto overscroll-contain touch-none ${className}`}
    >
      {children}
    </div>
  );
};
