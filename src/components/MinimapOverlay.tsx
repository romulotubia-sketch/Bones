import React, { useRef } from 'react';
import { HudSnapshot, RoomKind } from '../types/game';
import { clientToLandscapePoint } from '../utils/orientation';

interface MinimapOverlayProps {
  rooms: HudSnapshot['minimap'];
  mapPan: HudSnapshot['mapPan'];
  onPanJoystick: (nx: number, ny: number) => void;
  onResetPan: () => void;
}

const DIR_DELTAS: Record<'N' | 'S' | 'E' | 'W', { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
};

export const MinimapOverlay: React.FC<MinimapOverlayProps> = ({
  rooms,
  mapPan,
  onPanJoystick,
  onResetPan,
}) => {
  const pointerIdRef = useRef<number | null>(null);
  const startPtRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedRef = useRef(false);

  if (rooms.length === 0) return null;

  const VIEW_W = 144;
  const VIEW_H = 92;
  const isSingleGuildRoom = rooms.length === 1;
  const STEP_X = isSingleGuildRoom ? 46 : 34;
  const STEP_Y = isSingleGuildRoom ? 36 : 26;
  const ROOM_W = isSingleGuildRoom ? 42 : 24;
  const ROOM_H = isSingleGuildRoom ? 32 : 18;

  const currentRoom = rooms.find((r) => r.isCurrent) ?? rooms[0];
  const playerGX = currentRoom.gridX + (currentRoom.playerPosition?.normX ?? 0);
  const playerGY = currentRoom.gridY + (currentRoom.playerPosition?.normY ?? 0);

  const focusGX = playerGX + mapPan.gridOffsetX;
  const focusGY = playerGY + mapPan.gridOffsetY;

  const toMapX = (gx: number) => VIEW_W / 2 + (gx - focusGX) * STEP_X;
  const toMapY = (gy: number) => (VIEW_H - 12) / 2 + (gy - focusGY) * STEP_Y;

  const exitRoom = rooms.find((r) => r.hasExitDoor);
  const exitGX = exitRoom ? exitRoom.gridX + (exitRoom.exitPosition?.normX ?? 0) : null;
  const exitGY = exitRoom ? exitRoom.gridY + (exitRoom.exitPosition?.normY ?? 0) : null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return;
    e.stopPropagation();
    e.preventDefault();
    pointerIdRef.current = e.pointerId;
    draggedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = clientToLandscapePoint(e.clientX, e.clientY);
    startPtRef.current = { x: pt.x, y: pt.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    e.stopPropagation();
    const pt = clientToLandscapePoint(e.clientX, e.clientY);
    const dx = pt.x - startPtRef.current.x;
    const dy = pt.y - startPtRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= 6) {
      draggedRef.current = true;
      const maxR = 32;
      const clamped = Math.min(dist, maxR);
      onPanJoystick((dx / dist) * (clamped / maxR), (dy / dist) * (clamped / maxR));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const wasDragged = draggedRef.current;
    pointerIdRef.current = null;
    draggedRef.current = false;
    onPanJoystick(0, 0);
    if (!wasDragged) {
      onResetPan();
    }
  };

  const resetGesture = () => {
    pointerIdRef.current = null;
    draggedRef.current = false;
    onPanJoystick(0, 0);
  };

  // Edge indicator if Exit Door is panned outside the minimap frame
  let edgeExitIndicator: { x: number; y: number; unlocked: boolean } | null = null;
  if (exitGX !== null && exitGY !== null && exitRoom) {
    const ex = toMapX(exitGX);
    const ey = toMapY(exitGY);
    const pad = 9;
    const maxY = VIEW_H - 16;
    if (ex < pad || ex > VIEW_W - pad || ey < pad || ey > maxY) {
      edgeExitIndicator = {
        x: Math.max(pad, Math.min(VIEW_W - pad, ex)),
        y: Math.max(pad, Math.min(maxY, ey)),
        unlocked: exitRoom.exitUnlocked,
      };
    }
  }

  return (
    <div
      role="region"
      aria-label="Floor Minimap"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={resetGesture}
      className="pointer-events-auto touch-none relative w-[138px] h-[90px] sm:w-[148px] sm:h-[96px] rounded-xl bg-[#0B0E15]/35 border border-white/15 overflow-hidden select-none shrink-0"
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-full block"
        aria-hidden="true"
      >
        {/* 1. Connecting hallways for explored rooms */}
        {rooms
          .filter((r) => r.discovered)
          .map((room) => {
            const cx = toMapX(room.gridX);
            const cy = toMapY(room.gridY);
            return room.connections.map((dir) => {
              const delta = DIR_DELTAS[dir];
              const neighbor = rooms.find(
                (n) =>
                  n.id !== room.id &&
                  n.gridX === room.gridX + delta.dx &&
                  n.gridY === room.gridY + delta.dy
              );

              if (neighbor && neighbor.discovered) {
                if (room.id > neighbor.id) return null;
                const nx = toMapX(neighbor.gridX);
                const ny = toMapY(neighbor.gridY);
                return (
                  <line
                    key={`cor-${room.id}-${neighbor.id}`}
                    x1={cx}
                    y1={cy}
                    x2={nx}
                    y2={ny}
                    stroke="rgba(148, 163, 184, 0.5)"
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                );
              }

              // Unexplored doorway stub (or North outdoor walkway in Guild)
              const stubLenX = delta.dx * (ROOM_W * 0.5 + 5);
              const stubLenY = delta.dy * (ROOM_H * 0.5 + 5);
              return (
                <line
                  key={`stub-${room.id}-${dir}`}
                  x1={cx + delta.dx * (ROOM_W * 0.45)}
                  y1={cy + delta.dy * (ROOM_H * 0.45)}
                  x2={cx + stubLenX}
                  y2={cy + stubLenY}
                  stroke={
                    isSingleGuildRoom
                      ? 'rgba(56, 189, 248, 0.7)'
                      : 'rgba(148, 163, 184, 0.32)'
                  }
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            });
          })}

        {/* 2. Explored Floor Rooms (+ dashed beacon for undiscovered Exit Door room) */}
        {rooms.map((room) => {
          if (!room.discovered && !room.hasExitDoor) return null;

          const rx = toMapX(room.gridX) - ROOM_W / 2;
          const ry = toMapY(room.gridY) - ROOM_H / 2;

          if (!room.discovered && room.hasExitDoor) {
            return (
              <rect
                key={`ghost-${room.id}`}
                x={rx}
                y={ry}
                width={ROOM_W}
                height={ROOM_H}
                rx={3.5}
                fill="rgba(15, 23, 42, 0.35)"
                stroke="rgba(251, 191, 36, 0.55)"
                strokeWidth={1.2}
                strokeDasharray="2.5 2"
              />
            );
          }

          let fill = 'rgba(30, 41, 59, 0.52)';
          let stroke = 'rgba(148, 163, 184, 0.45)';
          if (room.isCurrent) {
            fill = 'rgba(30, 52, 46, 0.66)';
            stroke = 'rgba(74, 222, 128, 0.78)';
          } else if (room.kind === RoomKind.Shrine) {
            fill = 'rgba(19, 48, 55, 0.58)';
            stroke = 'rgba(45, 212, 191, 0.65)';
          } else if (room.kind === RoomKind.Boss) {
            fill = 'rgba(51, 27, 44, 0.58)';
            stroke = 'rgba(251, 113, 133, 0.7)';
          }

          return (
            <g key={`room-${room.id}`}>
              <rect
                x={rx}
                y={ry}
                width={ROOM_W}
                height={ROOM_H}
                rx={3.5}
                fill={fill}
                stroke={stroke}
                strokeWidth={room.isCurrent ? 1.5 : 1.1}
              />
              {/* Lantern Statue diamond marker in Shrine rooms */}
              {room.kind === RoomKind.Shrine && (
                <polygon
                  points={`${rx + ROOM_W / 2},${ry + 4} ${rx + ROOM_W / 2 + 3.5},${
                    ry + ROOM_H / 2
                  } ${rx + ROOM_W / 2},${ry + ROOM_H - 4} ${rx + ROOM_W / 2 - 3.5},${
                    ry + ROOM_H / 2
                  }`}
                  fill="#2DD4BF"
                />
              )}
            </g>
          );
        })}

        {/* 3. Exit Door Marker */}
        {exitRoom && exitGX !== null && exitGY !== null && (
          <g transform={`translate(${toMapX(exitGX)}, ${toMapY(exitGY)})`}>
            {/* Arched Exit Door silhouette */}
            <path
              d="M -4.2 3.8 L -4.2 -1.2 A 4.2 4.2 0 0 1 4.2 -1.2 L 4.2 3.8 Z"
              fill={exitRoom.exitUnlocked ? '#38BDF8' : '#FBBF24'}
              stroke="#0B0E15"
              strokeWidth={1.3}
            />
            <circle
              cx={1.6}
              cy={1.1}
              r={0.85}
              fill="#0B0E15"
            />
          </g>
        )}

        {/* Edge indicator when Exit Door is outside panned minimap view */}
        {edgeExitIndicator && (
          <circle
            cx={edgeExitIndicator.x}
            cy={edgeExitIndicator.y}
            r={3.2}
            fill={edgeExitIndicator.unlocked ? '#38BDF8' : '#FBBF24'}
            stroke="#0B0E15"
            strokeWidth={1.2}
          />
        )}

        {/* 4. Player Live Position Dot */}
        <g transform={`translate(${toMapX(playerGX)}, ${toMapY(playerGY)})`}>
          <circle r={5.4} fill="rgba(74, 222, 128, 0.25)" />
          <circle r={3.3} fill="#4ADE80" stroke="#0B0E15" strokeWidth={1.3} />
        </g>

        {/* Center reticle when map is panned away from player */}
        {mapPan.isPanned && (
          <g
            transform={`translate(${VIEW_W / 2}, ${(VIEW_H - 12) / 2})`}
            stroke="rgba(248, 250, 252, 0.45)"
            strokeWidth={1}
          >
            <line x1={-4} y1={0} x2={4} y2={0} />
            <line x1={0} y1={-4} x2={0} y2={4} />
          </g>
        )}
      </svg>

      {/* Bottom Micro-Legend Bar */}
      <div className="absolute inset-x-0 bottom-0 h-3.5 px-1.5 flex items-center justify-between bg-[#090B11]/45 text-[9px] leading-none text-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] inline-block" />
            You
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-[#38BDF8] inline-block" />
            Exit
          </span>
        </div>
        <span className="text-[8px] text-[#94A3B8] font-mono-num">
          {mapPan.isPanned ? 'Tap Center' : 'Drag Map'}
        </span>
      </div>
    </div>
  );
};
