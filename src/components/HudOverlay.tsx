import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Crown,
  DoorOpen,
  Hand,
  Maximize2,
  Minimize2,
  Pause,
  Settings,
  Skull,
  SlidersHorizontal,
  Swords,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  CHARACTER_ROSTER,
  NORMAL_SKILLS,
  ULTIMATE_SKILLS,
} from '../data/zombieData';
import {
  CharacterId,
  DifficultyLevel,
  EquippedLoadout,
  GamePhase,
  HudSnapshot,
  ManualSkillAimInput,
  SkillSlotKey,
} from '../types/game';
import { clientDeltaToLandscape } from '../utils/orientation';
import { MinimapOverlay } from './MinimapOverlay';
import {
  NormalSkillIcon,
  SoulShardIcon,
  UltimateSkillIcon,
} from './SkillIcons';
import { VirtualJoystick } from './VirtualJoystick';

interface HudOverlayProps {
  hud: HudSnapshot;
  loadout: EquippedLoadout;
  totalSavedShards: number;
  selectedDifficulty?: DifficultyLevel;
  muted: boolean;
  joystickScale?: number;
  skillButtonScale?: number;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onOpenSettings?: () => void;
  onPause: () => void;
  onOpenLoadout: (charId?: CharacterId) => void;
  onOpenMultiplayer?: () => void;
  onSelectDifficulty?: (diff: DifficultyLevel) => void;
  onJoystickMove: (nx: number, ny: number) => void;
  onMapPanJoystick: (nx: number, ny: number) => void;
  onResetMapPan: () => void;
  onAttackHeldChange: (held: boolean) => void;
  onInteract: () => void;
  onTriggerSkill: (slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE') => void;
  onSkillAimChange?: (aim: ManualSkillAimInput | null) => void;
  onReleaseSkill?: (
    slot: SkillSlotKey,
    manualAim?: { angle: number; magnitude: number }
  ) => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  loadout,
  totalSavedShards,
  selectedDifficulty: _selectedDifficulty,
  muted,
  joystickScale = 1,
  skillButtonScale = 1,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onOpenSettings,
  onPause,
  onOpenLoadout,
  onOpenMultiplayer,
  onSelectDifficulty: _onSelectDifficulty,
  onJoystickMove,
  onMapPanJoystick,
  onResetMapPan,
  onAttackHeldChange,
  onInteract,
  onTriggerSkill,
  onSkillAimChange,
  onReleaseSkill,
}) => {
  const attackPointerId = useRef<number | null>(null);
  const [attackPressed, setAttackPressed] = useState(false);

  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const [aimingState, setAimingState] = useState<{
    slot: SkillSlotKey;
    isCancelling: boolean;
  } | null>(null);
  const [cancelVersion, setCancelVersion] = useState(0);

  const checkOverCancelZone = useCallback((clientX: number, clientY: number): boolean => {
    const el = cancelBtnRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const pad = 12;
    return (
      clientX >= rect.left - pad &&
      clientX <= rect.right + pad &&
      clientY >= rect.top - pad &&
      clientY <= rect.bottom + pad
    );
  }, []);

  const handleSkillAimMove = useCallback(
    (aim: ManualSkillAimInput) => {
      setAimingState((prev) => {
        if (prev && prev.slot === aim.slot && prev.isCancelling === aim.isCancelling) {
          return prev;
        }
        return { slot: aim.slot, isCancelling: aim.isCancelling };
      });
      onSkillAimChange?.(aim);
    },
    [onSkillAimChange]
  );

  const handleSkillAimCancel = useCallback(() => {
    setAimingState(null);
    onSkillAimChange?.(null);
  }, [onSkillAimChange]);

  const handleSkillRelease = useCallback(
    (slot: SkillSlotKey, manualAim?: { angle: number; magnitude: number }) => {
      setAimingState(null);
      onSkillAimChange?.(null);
      if (onReleaseSkill) {
        onReleaseSkill(slot, manualAim);
      } else {
        onTriggerSkill(slot);
      }
    },
    [onReleaseSkill, onSkillAimChange, onTriggerSkill]
  );

  const isGuild = hud.floorNumber === 0;
  const isSkeleton = hud.activeCharacter === CharacterId.Skeleton;
  const isGoblin = hud.activeCharacter === CharacterId.Goblin;
  const isGnome = hud.activeCharacter === CharacterId.Gnome;
  const isGhost = hud.activeCharacter === CharacterId.Ghost;
  const isKobold = hud.activeCharacter === CharacterId.Kobold;
  const profile = CHARACTER_ROSTER[hud.activeCharacter] ?? CHARACTER_ROSTER[CharacterId.Zombie];

  const hpRatio = Math.max(0, Math.min(1, hud.hp / Math.max(1, hud.maxHp)));
  const xpRatio = Math.max(0, Math.min(1, hud.runXp / Math.max(1, hud.runXpNext)));

  const healthStatusLabel =
    hud.arsenalActive
      ? 'ARSENAL'
      : hud.rapidReloadActive
      ? 'RAPID'
      : hud.tinkerHasteTimer > 0
      ? `TINKER ${hud.tinkerHasteTimer.toFixed(1)}s`
      : hud.activeTurrets > 0
      ? `TURRET x${hud.activeTurrets}`
      : hud.nightmareTimer > 0
      ? `NIGHTMARE ${hud.nightmareTimer.toFixed(0)}s`
      : hud.possessionTimer > 0
      ? `POSSESS ${hud.possessionTimer.toFixed(1)}s`
      : hud.mountainHeartTimer > 0
      ? `MOUNTAIN ${hud.mountainHeartTimer.toFixed(0)}s`
      : hud.colossusTimer > 0
      ? `TITAN ${hud.colossusTimer.toFixed(0)}s`
      : hud.abominationTimer > 0
      ? `ABOM ${hud.abominationTimer.toFixed(0)}s`
      : hud.soulDrainTimer > 0
      ? `DRAIN ${hud.soulDrainTimer.toFixed(1)}s`
      : hud.restlessTimer > 0
      ? `RESTLESS ${hud.restlessTimer.toFixed(1)}s`
      : hud.fortressTimer > 0
      ? `FORTRESS ${hud.fortressTimer.toFixed(0)}s`
      : hud.magneticTimer > 0
      ? `MAGNET ${hud.magneticTimer.toFixed(0)}s`
      : hud.stolenMightTimer > 0
      ? `THIEF ${hud.stolenMightTimer.toFixed(0)}s`
      : hud.windrunnerTimer > 0
      ? `WIND ${hud.windrunnerTimer.toFixed(0)}s`
      : hud.poisonBladesTimer > 0
      ? `VENOM ${hud.poisonBladesTimer.toFixed(0)}s`
      : hud.boneStormTimer > 0
      ? `STORM ${hud.boneStormTimer.toFixed(0)}s`
      : hud.ribcageCharges > 0 && hud.ribcageTimer > 0
      ? `RIBS x${hud.ribcageCharges}`
      : hud.undyingTimer > 0
      ? `WARD ${hud.undyingTimer.toFixed(0)}s`
      : hud.unyieldingStacks > 0
      ? `BONES x${hud.unyieldingStacks}`
      : isGnome && hud.resolveBonusPct >= 8
      ? `RESOLVE +${hud.resolveBonusPct}%`
      : hpRatio <= 0.3
      ? 'LOW'
      : profile.archetypeName.toUpperCase();

  const skill0 = NORMAL_SKILLS[loadout.normalSkills[0]];
  const skill1 = NORMAL_SKILLS[loadout.normalSkills[1]];
  const ult = ULTIMATE_SKILLS[loadout.ultimateSkill];
  const ultReady = hud.ultCooldown <= 0 && hud.ultCharge >= 100;
  const isDoorPrompt = hud.interactPrompt?.includes('Door') ?? false;

  const handleAttackDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (attackPointerId.current !== null) return;
    e.stopPropagation();
    attackPointerId.current = e.pointerId;
    setAttackPressed(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    onAttackHeldChange(true);
  };

  const handleAttackUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== attackPointerId.current) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    attackPointerId.current = null;
    setAttackPressed(false);
    onAttackHeldChange(false);
  };

  const resetAttack = () => {
    attackPointerId.current = null;
    setAttackPressed(false);
    onAttackHeldChange(false);
  };

  const hasBuffActive =
    hud.arsenalActive ||
    hud.rapidReloadActive ||
    hud.tinkerHasteTimer > 0 ||
    hud.activeTurrets > 0 ||
    hud.abominationTimer > 0 ||
    hud.undyingTimer > 0 ||
    hud.colossusTimer > 0 ||
    hud.boneStormTimer > 0 ||
    hud.ribcageCharges > 0 ||
    hud.unyieldingStacks > 0 ||
    hud.windrunnerTimer > 0 ||
    hud.poisonBladesTimer > 0 ||
    hud.stolenMightTimer > 0 ||
    hud.fortressTimer > 0 ||
    hud.magneticTimer > 0 ||
    hud.mountainHeartTimer > 0 ||
    hud.restlessTimer > 0 ||
    hud.soulDrainTimer > 0 ||
    hud.possessionTimer > 0 ||
    hud.nightmareTimer > 0 ||
    (isGnome && hud.resolveBonusPct >= 8);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between safe-hud-insets">
      {/* Compact Top Perimeter Row */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Vitality + Shards + Party Indicators */}
        <div className="flex flex-col items-start gap-1 pointer-events-auto">
          <div className="flex items-start gap-2">
          {isGuild ? (
            <div className="bg-[#16131E]/90 border border-[#302A40] rounded-xl px-2.5 py-1 shadow-lg min-w-[140px]">
              <div className="flex items-center justify-between gap-2 text-[10px] mb-0.5">
                <span className="font-semibold text-[#F5F0E6]">
                  HP <span className="font-mono-num">{hud.hp}/{hud.maxHp}</span>
                </span>
                <span className="font-mono-num text-[9.5px] font-semibold text-[#86EFAC]">
                  {healthStatusLabel}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#0E0C14] rounded overflow-hidden border border-[#282336]">
                <div
                  className="h-full bg-[#4ADE80] transition-transform duration-150 origin-left"
                  style={{ transform: `scaleX(${hpRatio})` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5 text-[10px] text-[#BDB6CC] font-mono-num">
                <span>Lv {hud.runLevel}</span>
                <span>·</span>
                <span className="flex items-center gap-1 text-[#7DD3FC]">
                  <SoulShardIcon className="w-2.5 h-2.5" />
                  {totalSavedShards}
                </span>
              </div>
            </div>
          ) : (
            /* Dungeon Compact Combat Bar (ultra-sleek, non-intrusive) */
            <div className="bg-[#14111B]/85 backdrop-blur-xs border border-[#2D263B] rounded-lg px-2 py-1 shadow-md w-[148px]">
              {/* Row 1: HP & Status */}
              <div className="flex items-baseline justify-between gap-1 text-[10px] leading-tight">
                <span className="font-semibold text-[#F5F0E6] font-mono-num">
                  <span className="text-[9px] text-[#9E96B0] mr-0.5 font-normal">HP</span>
                  {hud.hp}
                  <span className="text-[8.5px] text-[#7E7790] font-normal">/{hud.maxHp}</span>
                </span>
                <span
                  className={`font-mono-num text-[9px] font-semibold truncate max-w-[65px] text-right ${
                    hasBuffActive
                      ? isGoblin
                        ? 'text-[#FDE047]'
                        : isGnome
                        ? 'text-[#FDBA74]'
                        : isGhost
                        ? 'text-[#E9D5FF]'
                        : isKobold
                        ? 'text-[#FDE047]'
                        : 'text-[#7DD3FC]'
                      : hpRatio <= 0.3
                      ? 'text-[#F87171]'
                      : isSkeleton
                      ? 'text-[#7DD3FC]'
                      : isGoblin
                      ? 'text-[#FBBF24]'
                      : isGnome
                      ? 'text-[#FB923C]'
                      : isGhost
                      ? 'text-[#D8B4FE]'
                      : isKobold
                      ? 'text-[#FDA4AF]'
                      : 'text-[#86EFAC]'
                  }`}
                >
                  {healthStatusLabel}
                </span>
              </div>

              {/* Row 2: Dual Gauge (HP Bar + Underline XP Bar) */}
              <div className="w-full mt-1">
                <div className="w-full h-1.5 bg-[#0C0A10] rounded-xs overflow-hidden border border-[#252030]">
                  <div
                    className={`h-full transition-transform duration-150 origin-left ${
                      hpRatio <= 0.3
                        ? 'bg-[#EF4444]'
                        : isSkeleton
                        ? 'bg-[#38BDF8]'
                        : isGoblin
                        ? 'bg-[#F59E0B]'
                        : isGnome
                        ? 'bg-[#FB923C]'
                        : isGhost
                        ? 'bg-[#C084FC]'
                        : isKobold
                        ? 'bg-[#FB7185]'
                        : 'bg-[#4ADE80]'
                    }`}
                    style={{ transform: `scaleX(${hpRatio})` }}
                  />
                </div>
                <div className="w-full h-[1.5px] bg-[#0C0A10] overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-[#A78BFA] origin-left transition-transform duration-150"
                    style={{ transform: `scaleX(${xpRatio})` }}
                  />
                </div>
              </div>

              {/* Row 3: Single Compact Inline Metrics */}
              <div className="flex items-center justify-between text-[9px] font-mono-num text-[#A39BB5] mt-1 leading-none">
                <div className="flex items-center gap-1">
                  <span>L{hud.runLevel}</span>
                  <span className="text-[#554E66]">·</span>
                  <span className="text-[#FBBF24]">{hud.runCoins}g</span>
                  <span className="text-[#554E66]">·</span>
                  <span className="text-[#7DD3FC] flex items-center gap-0.5">
                    <SoulShardIcon className="w-2.5 h-2.5" />
                    +{hud.runShardsEarned}
                  </span>
                </div>
                <span
                  className="font-bold text-[8.5px] px-1 py-0.5 rounded leading-none shrink-0"
                  style={{
                    backgroundColor: `${hud.difficultyColor}1F`,
                    color: hud.difficultyColor,
                  }}
                >
                  {hud.difficultyBadge.split(' ')[0]} {hud.maxStages > 1 ? `${hud.currentStage}-${hud.stageFloor}` : `F${hud.stageFloor}`}
                </span>
              </div>
            </div>
          )}

          {isGuild && hud.phase === GamePhase.GuildRoam && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(580);
                  onOpenLoadout(hud.activeCharacter);
                }}
                className={`min-h-[40px] px-2.5 rounded-xl bg-[#201B2D]/90 active:scale-95 border text-xs font-semibold text-[#F5F0E6] flex items-center gap-1.5 shadow-lg whitespace-nowrap shrink-0 ${
                  isSkeleton
                    ? 'border-[#38BDF8]/70'
                    : isGoblin
                    ? 'border-[#F59E0B]/70'
                    : isGnome
                    ? 'border-[#FB923C]/70'
                    : isGhost
                    ? 'border-[#C084FC]/70'
                    : isKobold
                    ? 'border-[#FB7185]/70'
                    : 'border-[#4ADE80]/70'
                }`}
              >
                <SlidersHorizontal
                  className={`w-3.5 h-3.5 ${
                    isSkeleton
                      ? 'text-[#38BDF8]'
                      : isGoblin
                      ? 'text-[#FBBF24]'
                      : isGnome
                      ? 'text-[#FB923C]'
                      : isGhost
                      ? 'text-[#D8B4FE]'
                      : isKobold
                      ? 'text-[#FB7185]'
                      : 'text-[#4ADE80]'
                  }`}
                />
                <span>Heroes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(580);
                  onOpenMultiplayer?.();
                }}
                className="min-h-[40px] px-2.5 rounded-xl bg-[#201B2D]/90 active:scale-95 border border-[#38BDF8]/60 text-xs font-semibold text-[#F5F0E6] flex items-center gap-1.5 shadow-lg whitespace-nowrap shrink-0"
              >
                <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>{hud.multiplayerInfo ? `Party · ${hud.multiplayerInfo.roomCode}` : 'Multiplayer'}</span>
              </button>
            </div>
          )}
          </div>

          {/* Compact 2-Column Party Member Health Strip */}
          {hud.multiplayerInfo?.partyMembers && hud.multiplayerInfo.partyMembers.length > 1 && (
            <div className="grid grid-cols-2 gap-1 max-w-[244px]">
              {hud.multiplayerInfo.partyMembers
                .filter((m) => !m.isSelf)
                .map((member) => {
                  const mRatio = Math.max(0, Math.min(1, member.hp / Math.max(1, member.maxHp)));
                  return (
                    <div
                      key={member.id}
                      className="bg-[#14101E]/90 backdrop-blur-xs border border-[#2D2340] rounded-md px-1.5 py-0.5 shadow-sm w-[118px]"
                    >
                      <div className="flex items-center justify-between gap-1 text-[8.5px] leading-tight mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: member.color }}
                          />
                          <span className="font-bold text-[#E5DFD4] truncate">
                            {member.name}
                          </span>
                          {member.isHost && (
                            <Crown className="w-2.5 h-2.5 text-[#FBBF24] shrink-0" />
                          )}
                        </div>
                        {member.isDowned ? (
                          <span className="text-[8px] font-bold text-red-400 shrink-0">
                            DOWN
                          </span>
                        ) : (
                          <span className="font-mono-num text-[8px] text-[#A69FB4] shrink-0">
                            {member.hp}
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1 bg-[#0A080F] rounded-xs overflow-hidden">
                        <div
                          className="h-full transition-transform duration-150 origin-left"
                          style={{
                            transform: `scaleX(${member.isDowned ? 1 : mRatio})`,
                            backgroundColor: member.isDowned ? '#EF4444' : member.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Top-Center: Boss Health Bar, Room Banner, Multiplayer Info, or Re-Center Camera Button */}
        <div className="flex-1 max-w-xs sm:max-w-sm mx-auto flex flex-col items-center gap-1 px-1 min-w-0">
          {hud.multiplayerInfo && (
            <button
              type="button"
              onClick={() => {
                if (onOpenMultiplayer) {
                  soundEngine.playUiClick(540);
                  onOpenMultiplayer();
                }
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#181324]/90 border border-[#3E3054] text-[10px] text-[#A69FB4] whitespace-nowrap active:scale-95"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] shrink-0" />
              <span className="font-mono-num font-bold text-[#FBBF24]">{hud.multiplayerInfo.roomCode}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#E2E8F0] font-medium">{hud.multiplayerInfo.playerCount}P</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num tabular-nums">{hud.multiplayerInfo.ping}ms</span>
            </button>
          )}

          {hud.bossInfo ? (
            <div className="w-full bg-[#181322]/95 border border-[#4C2D4E] rounded-xl px-3 py-1.5 shadow-lg">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="font-display text-xs font-bold text-[#F5F0E6] truncate">
                  {hud.bossInfo.name}
                </span>
                <span className="text-[11px] font-mono-num text-[#FDA4AF] shrink-0">
                  {hud.bossInfo.hp}/{hud.bossInfo.maxHp}
                </span>
              </div>
              <div className="w-full h-2 bg-[#0D0A12] rounded overflow-hidden border border-[#3B233E]">
                <div
                  className="h-full bg-[#F43F5E] origin-left transition-transform duration-100"
                  style={{
                    transform: `scaleX(${Math.max(
                      0,
                      Math.min(1, hud.bossInfo.hp / Math.max(1, hud.bossInfo.maxHp))
                    )})`,
                  }}
                />
              </div>
            </div>
          ) : hud.roomBannerText ? (
            <div className="px-3 py-1 rounded-lg bg-[#16131E]/90 border border-[#302A40] text-[11px] font-semibold text-[#F5F0E6] text-center truncate max-w-full">
              {hud.roomBannerText}
            </div>
          ) : null}

          {hud.mapPan.isPanned && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(520);
                onResetMapPan();
              }}
              className="pointer-events-auto min-h-[36px] px-3 py-1 rounded-xl bg-[#111827]/80 border border-[#38BDF8]/55 text-[11px] font-semibold text-[#E0F2FE] flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Center on {profile.archetypeName}</span>
            </button>
          )}
        </div>

        {/* Top-Right: Utility Controls + Transparent Overlay Minimap (or Cancel Skill X Button while manually targeting) */}
        <div className="relative flex items-start gap-2 pointer-events-auto">
          <div
            className={`flex items-start gap-2 transition-opacity duration-100 ${
              aimingState ? 'opacity-15 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(520);
                  onToggleFullscreen();
                }}
                aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#16131E]/75 border border-white/15 text-[#D6D0C4] active:scale-95 flex items-center justify-center"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#16131E]/75 border border-white/15 text-[#D6D0C4] active:scale-95 flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(500);
                    onOpenSettings();
                  }}
                  aria-label="Open settings"
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-[#16131E]/75 border border-white/15 text-[#D6D0C4] active:scale-95 flex items-center justify-center"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {hud.phase !== GamePhase.GuildPicking && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(460);
                    onPause();
                  }}
                  aria-label="Pause game"
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-[#16131E]/75 border border-white/15 text-[#D6D0C4] active:scale-95 flex items-center justify-center"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
            </div>

            {hud.phase !== GamePhase.GuildPicking && hud.minimap.length > 0 && (
              <MinimapOverlay
                rooms={hud.minimap}
                mapPan={hud.mapPan}
                onPanJoystick={onMapPanJoystick}
                onResetPan={onResetMapPan}
              />
            )}
          </div>

          {/* Upper-Right Skill Cancel (X) Button during Manual Targeting */}
          <button
            ref={cancelBtnRef}
            type="button"
            aria-label="Cancel skill targeting"
            onPointerDown={(e) => {
              if (!aimingState) return;
              e.stopPropagation();
              soundEngine.playUiClick(320);
              setCancelVersion((v) => v + 1);
              handleSkillAimCancel();
            }}
            className={`absolute top-0 right-0 z-50 min-w-[56px] min-h-[56px] px-3 py-1.5 rounded-2xl border-2 shadow-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-100 ${
              aimingState
                ? aimingState.isCancelling
                  ? 'opacity-100 pointer-events-auto scale-110 bg-[#DC2626] border-[#FEE2E2] text-white'
                  : 'opacity-100 pointer-events-auto scale-100 bg-[#261118]/95 border-[#EF4444]/85 text-[#FCA5A5]'
                : 'opacity-0 pointer-events-none scale-90 bg-[#261118]/90 border-[#EF4444]/50 text-[#FCA5A5]'
            }`}
          >
            <X className="w-5 h-5 stroke-[2.6]" />
            <span className="text-[10px] font-bold leading-none">Cancel</span>
          </button>
        </div>
      </div>

      {/* Bottom Ergonomic Mobile Thumb Zones */}
      {hud.phase === GamePhase.GuildPicking ? (
        <div className="mx-auto mb-1 pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-[#16131E]/95 border border-[#342E44] shadow-xl max-w-full">
          <span className="text-xs text-[#F5F0E6] hidden lg:inline">
            Tap a hero in the Guild House or pick:
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(590);
              onOpenLoadout(CharacterId.Zombie);
            }}
            className="min-h-[42px] px-3 rounded-xl bg-[#4ADE80] text-[#0E1912] text-xs font-bold active:scale-95 whitespace-nowrap shrink-0"
          >
            Zombie
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(620);
              onOpenLoadout(CharacterId.Skeleton);
            }}
            className="min-h-[42px] px-3 rounded-xl bg-[#38BDF8] text-[#0B1724] text-xs font-bold active:scale-95 whitespace-nowrap shrink-0"
          >
            Skeleton
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(650);
              onOpenLoadout(CharacterId.Goblin);
            }}
            className="min-h-[42px] px-3 rounded-xl bg-[#F59E0B] text-[#170F04] text-xs font-bold active:scale-95 whitespace-nowrap shrink-0"
          >
            Goblin
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(670);
              onOpenLoadout(CharacterId.Gnome);
            }}
            className="min-h-[42px] px-3 rounded-xl bg-[#FB923C] text-[#1C0F06] text-xs font-bold active:scale-95 whitespace-nowrap shrink-0"
          >
            Gnome
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(700);
              onOpenLoadout(CharacterId.Ghost);
            }}
            className="min-h-[42px] px-3 rounded-xl bg-[#C084FC] text-[#180B26] text-xs font-bold active:scale-95 whitespace-nowrap shrink-0"
          >
            Ghost
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(720);
              onOpenLoadout(CharacterId.Kobold);
            }}
            className="min-h-[42px] px-3 rounded-xl bg-[#FB7185] text-[#1F0810] text-xs font-bold active:scale-95 whitespace-nowrap shrink-0"
          >
            Kobold
          </button>
        </div>
      ) : (
        <div className="flex items-end justify-between w-full">
          {/* Left Thumb Zone: Analog Virtual Joystick */}
          <VirtualJoystick onMove={onJoystickMove} scale={joystickScale} />

          {/* Center-Bottom Contextual Touch Interact Button */}
          {hud.interactPrompt && (
            <div className="pointer-events-auto mb-3 mx-auto">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playUiClick(600);
                  onInteract();
                }}
                className={`min-h-[48px] px-5 rounded-2xl text-xs font-bold shadow-xl flex items-center gap-2 active:scale-95 whitespace-nowrap ${
                  isSkeleton
                    ? 'bg-[#38BDF8] text-[#0B1724]'
                    : isGoblin
                    ? 'bg-[#F59E0B] text-[#170F04]'
                    : isGnome
                    ? 'bg-[#FB923C] text-[#1C0F06]'
                    : isGhost
                    ? 'bg-[#C084FC] text-[#180B26]'
                    : isKobold
                    ? 'bg-[#FB7185] text-[#1F0810]'
                    : 'bg-[#4ADE80] text-[#0E1912]'
                }`}
              >
                {isDoorPrompt ? (
                  <DoorOpen className="w-4 h-4 shrink-0" />
                ) : (
                  <Hand className="w-4 h-4 shrink-0" />
                )}
                <span>{hud.interactPrompt}</span>
              </button>
            </div>
          )}

          {/* Right Thumb Zone: Soul Knight Radial Combat Cluster */}
          <div
            style={{
              transform: `scale(${skillButtonScale})`,
              transformOrigin: 'bottom right',
            }}
            className="relative w-48 h-40 sm:w-52 sm:h-44 shrink-0 pointer-events-none will-change-transform"
          >
            {/* Normal Skill 1 (Left of Attack arc — Tap to auto-cast, Drag to aim/target) */}
            <DraggableSkillButton
              slot="NORMAL_0"
              scale={skillButtonScale}
              className="bottom-1 right-[88px] sm:right-[96px] w-14 h-14"
              name={skill0.name}
              ready={hud.normalCooldowns[0] <= 0}
              statusLabel={
                hud.normalCooldowns[0] > 0 ? `${hud.normalCooldowns[0].toFixed(1)}s` : null
              }
              activeCharacter={hud.activeCharacter}
              icon={<NormalSkillIcon id={skill0.id} className="w-6 h-6" />}
              cancelVersion={cancelVersion}
              checkOverCancelZone={checkOverCancelZone}
              onAimMove={handleSkillAimMove}
              onAimCancel={handleSkillAimCancel}
              onReleaseCast={handleSkillRelease}
            />

            {/* Normal Skill 2 (Diagonal upper-left of Attack arc — Tap to auto-cast, Drag to aim/target) */}
            <DraggableSkillButton
              slot="NORMAL_1"
              scale={skillButtonScale}
              className="bottom-[66px] sm:bottom-[72px] right-[72px] sm:right-[78px] w-14 h-14"
              name={skill1.name}
              ready={hud.normalCooldowns[1] <= 0}
              statusLabel={
                hud.normalCooldowns[1] > 0 ? `${hud.normalCooldowns[1].toFixed(1)}s` : null
              }
              activeCharacter={hud.activeCharacter}
              icon={<NormalSkillIcon id={skill1.id} className="w-6 h-6" />}
              cancelVersion={cancelVersion}
              checkOverCancelZone={checkOverCancelZone}
              onAimMove={handleSkillAimMove}
              onAimCancel={handleSkillAimCancel}
              onReleaseCast={handleSkillRelease}
            />

            {/* Ultimate Skill (Above Attack arc — Tap to auto-cast, Drag to aim/target) */}
            <DraggableSkillButton
              slot="ULTIMATE"
              isUltimate
              scale={skillButtonScale}
              className="bottom-[86px] sm:bottom-[92px] right-1 w-15 h-15"
              name={`Ultimate: ${ult.name}`}
              ready={ultReady}
              statusLabel={
                hud.ultCooldown > 0
                  ? `${Math.ceil(hud.ultCooldown)}s`
                  : ultReady
                  ? 'MAX'
                  : `${hud.ultCharge}%`
              }
              activeCharacter={hud.activeCharacter}
              icon={<UltimateSkillIcon id={ult.id} className="w-6 h-6" />}
              cancelVersion={cancelVersion}
              checkOverCancelZone={checkOverCancelZone}
              onAimMove={handleSkillAimMove}
              onAimCancel={handleSkillAimCancel}
              onReleaseCast={handleSkillRelease}
            />

            {/* Primary Weapon Attack Button (Hold or Tap) */}
            <button
              type="button"
              aria-label={`${profile.attackLabel} Attack`}
              onPointerDown={handleAttackDown}
              onPointerUp={handleAttackUp}
              onPointerCancel={handleAttackUp}
              onLostPointerCapture={resetAttack}
              className={`pointer-events-auto touch-none absolute bottom-1 right-1 w-[74px] h-[74px] sm:w-[78px] sm:h-[78px] rounded-full border-2 shadow-2xl flex flex-col items-center justify-center transition-transform ${
                attackPressed
                  ? isSkeleton
                    ? 'scale-92 bg-[#38BDF8] border-[#E0F2FE] text-[#0B1724]'
                    : isGoblin
                    ? 'scale-92 bg-[#F59E0B] border-[#FEF3C7] text-[#170F04]'
                    : isGnome
                    ? 'scale-92 bg-[#FB923C] border-[#FFEDD5] text-[#1C0F06]'
                    : isGhost
                    ? 'scale-92 bg-[#C084FC] border-[#F3E8FF] text-[#180B26]'
                    : isKobold
                    ? 'scale-92 bg-[#FB7185] border-[#FFE4E6] text-[#1F0810]'
                    : 'scale-92 bg-[#4ADE80] border-[#DCFCE7] text-[#0E1912]'
                  : isSkeleton
                  ? 'bg-[#182436]/95 border-[#38BDF8] text-[#F5F0E6]'
                  : isGoblin
                  ? 'bg-[#2B2013]/95 border-[#F59E0B] text-[#F5F0E6]'
                  : isGnome
                  ? 'bg-[#2B1D17]/95 border-[#FB923C] text-[#F5F0E6]'
                  : isGhost
                  ? 'bg-[#241834]/95 border-[#C084FC] text-[#F5F0E6]'
                  : isKobold
                  ? 'bg-[#2A151E]/95 border-[#FB7185] text-[#F5F0E6]'
                  : 'bg-[#212D28]/95 border-[#4ADE80] text-[#F5F0E6]'
              }`}
            >
              {isSkeleton ? (
                <Swords className="w-7 h-7" />
              ) : isGoblin ? (
                <Swords className="w-7 h-7" />
              ) : isGnome ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                  <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                  <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                  <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                </svg>
              ) : isGhost ? (
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
                  <path
                    d="M7 22C10 14 16 8 25 7M10 26C14 18 19 13 27 12M15 28C18 22 22 18 28 17"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <circle cx="24.5" cy="7.5" r="2" fill="#67E8F9" />
                  <circle cx="26.5" cy="12.5" r="1.6" fill="#E9D5FF" />
                </svg>
              ) : isKobold ? (
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                  <path
                    d="M4 20L18.5 5.5M14.5 5H19V9.5"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.5 8.5C11 6.5 17.5 13 15.5 16.5"
                    stroke="#FBBF24"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <path d="M7.5 8.5L11.5 12.5L15.5 16.5" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
                  <path
                    d="M8 7C10 11 11 17 13 25M15 5C17 10 18 18 20 26M22 8C23.5 12 24.5 19 25 24M27 12C28 15 28 19 27.5 22"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  <circle cx="8.5" cy="8" r="1.5" fill="#FEF08A" />
                  <circle cx="15.5" cy="6" r="1.6" fill="#FEF08A" />
                  <circle cx="22.5" cy="9" r="1.4" fill="#FEF08A" />
                </svg>
              )}
              <span className="text-[10px] font-bold tracking-tight mt-0.5">
                {profile.attackLabel}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Downed / Bleedout State Screen Overlay for Local Player */}
      {hud.multiplayerInfo && hud.hp <= 0 && hud.floorNumber > 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
          <div className="max-w-xs w-full px-4 py-3 rounded-2xl bg-black/85 border-2 border-red-500/80 backdrop-blur-md shadow-2xl flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs tracking-wider uppercase font-display">
              <Skull className="w-4 h-4 text-red-500 animate-bounce" />
              <span>You are Downed!</span>
            </div>
            <p className="text-[11px] text-[#E2E8F0] leading-snug">
              Crawl toward teammates. Stand near each other to channel revive!
            </p>
            {hud.multiplayerInfo.partyMembers?.find((m) => m.isSelf)?.bleedoutTimer !== undefined && (
              <div className="text-[11px] font-mono-num font-bold text-red-300">
                Bleedout: {Math.max(0, Math.ceil(hud.multiplayerInfo.partyMembers.find((m) => m.isSelf)?.bleedoutTimer || 0))}s
              </div>
            )}
            {(hud.multiplayerInfo.partyMembers?.find((m) => m.isSelf)?.reviveProgress ?? 0) > 0 && (
              <div className="w-36 h-2 bg-[#201018] rounded-full overflow-hidden border border-[#552030] mt-0.5">
                <div
                  className="h-full bg-[#4ADE80] transition-all duration-100"
                  style={{
                    width: `${Math.round((hud.multiplayerInfo.partyMembers?.find((m) => m.isSelf)?.reviveProgress ?? 0) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DRAG_DEADZONE_PX = 10;
const MAX_SKILL_PAD_RADIUS = 56;
const MAX_SKILL_KNOB_OFFSET = 26;

const DraggableSkillButton: React.FC<{
  slot: SkillSlotKey;
  isUltimate?: boolean;
  scale?: number;
  className: string;
  name: string;
  ready: boolean;
  statusLabel: string | null;
  activeCharacter: CharacterId;
  icon: React.ReactNode;
  cancelVersion: number;
  checkOverCancelZone: (clientX: number, clientY: number) => boolean;
  onAimMove: (aim: ManualSkillAimInput) => void;
  onAimCancel: () => void;
  onReleaseCast: (slot: SkillSlotKey, manualAim?: { angle: number; magnitude: number }) => void;
}> = ({
  slot,
  isUltimate = false,
  scale = 1,
  className,
  name,
  ready,
  statusLabel,
  activeCharacter,
  icon,
  cancelVersion,
  checkOverCancelZone,
  onAimMove,
  onAimCancel,
  onReleaseCast,
}) => {
  const activePointerId = useRef<number | null>(null);
  const startClientPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const isCancellingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastMagRef = useRef(0);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const [isPressed, setIsPressed] = useState(false);
  const [isDraggingUi, setIsDraggingUi] = useState(false);
  const [isCancellingUi, setIsCancellingUi] = useState(false);

  const resetGesture = useCallback(() => {
    activePointerId.current = null;
    isDraggingRef.current = false;
    isCancellingRef.current = false;
    setIsPressed(false);
    setIsDraggingUi(false);
    setIsCancellingUi(false);
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    }
  }, []);

  useEffect(() => {
    if (activePointerId.current !== null) {
      resetGesture();
    }
  }, [cancelVersion, resetGesture]);

  useEffect(() => {
    const onBlur = () => {
      if (activePointerId.current !== null) {
        resetGesture();
        onAimCancel();
      }
    };
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('blur', onBlur);
    };
  }, [onAimCancel, resetGesture]);

  const readyTheme = isUltimate
    ? 'bg-[#2C2314]/95 border-[#FBBF24]'
    : activeCharacter === CharacterId.Skeleton
    ? 'bg-[#182436]/95 border-[#38BDF8]'
    : activeCharacter === CharacterId.Goblin
    ? 'bg-[#2B2013]/95 border-[#F59E0B]'
    : activeCharacter === CharacterId.Gnome
    ? 'bg-[#2B1D17]/95 border-[#FB923C]'
    : activeCharacter === CharacterId.Ghost
    ? 'bg-[#241834]/95 border-[#C084FC]'
    : activeCharacter === CharacterId.Kobold
    ? 'bg-[#2A151E]/95 border-[#FB7185]'
    : 'bg-[#1D2824]/95 border-[#4ADE80]';

  const disabledTheme = isUltimate
    ? 'bg-[#1A1624]/90 border-[#39324D] opacity-85'
    : 'bg-[#181522]/90 border-[#322B44] opacity-75';

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerId.current !== null) return;
    e.stopPropagation();

    if (!ready) {
      // Preserve buffered quick-cast if skill is within fractions of a second of coming off cooldown
      onReleaseCast(slot);
      return;
    }

    activePointerId.current = e.pointerId;
    startClientPos.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    isCancellingRef.current = false;
    lastMagRef.current = 0;
    setIsPressed(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();

    const { dx, dy } = clientDeltaToLandscape(
      e.clientX - startClientPos.current.x,
      e.clientY - startClientPos.current.y
    );
    const dist = Math.hypot(dx, dy);
    const effectivePadRadius = MAX_SKILL_PAD_RADIUS * scale;

    if (!isDraggingRef.current && dist >= DRAG_DEADZONE_PX) {
      isDraggingRef.current = true;
      setIsDraggingUi(true);
    }

    if (isDraggingRef.current) {
      if (dist > 2) {
        lastAngleRef.current = Math.atan2(dy, dx);
      }
      const magnitude = Math.min(
        1,
        Math.max(0, (dist - DRAG_DEADZONE_PX * 0.8) / Math.max(12, effectivePadRadius - DRAG_DEADZONE_PX * 0.8))
      );
      lastMagRef.current = magnitude;

      if (knobRef.current) {
        const clampedKnob = Math.min(dist / scale, MAX_SKILL_KNOB_OFFSET);
        const kx = Math.cos(lastAngleRef.current) * clampedKnob;
        const ky = Math.sin(lastAngleRef.current) * clampedKnob;
        knobRef.current.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0px)`;
      }

      const overCancel = checkOverCancelZone(e.clientX, e.clientY);
      if (overCancel !== isCancellingRef.current) {
        isCancellingRef.current = overCancel;
        setIsCancellingUi(overCancel);
      }

      onAimMove({
        slot,
        angle: lastAngleRef.current,
        magnitude,
        isCancelling: overCancel,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const wasDragging = isDraggingRef.current;
    const overCancel =
      wasDragging && (isCancellingRef.current || checkOverCancelZone(e.clientX, e.clientY));
    const angle = lastAngleRef.current;
    const magnitude = lastMagRef.current;

    resetGesture();

    if (overCancel) {
      soundEngine.playUiClick(320);
      onAimCancel();
      return;
    }

    if (wasDragging) {
      onReleaseCast(slot, { angle, magnitude });
    } else {
      onReleaseCast(slot);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetGesture();
    onAimCancel();
  };

  return (
    <button
      type="button"
      aria-label={name}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={() => {
        if (activePointerId.current !== null) {
          resetGesture();
          onAimCancel();
        }
      }}
      className={`pointer-events-auto touch-none select-none absolute rounded-full border-2 shadow-xl flex flex-col items-center justify-center transition-transform ${className} ${
        !ready
          ? disabledTheme
          : isCancellingUi
          ? 'bg-[#38141C]/95 border-[#EF4444]'
          : readyTheme
      } ${isPressed && !isDraggingUi ? 'scale-92' : ''}`}
    >
      {/* Outer aiming pad ring shown while dragging */}
      {isDraggingUi && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-3.5 rounded-full border border-dashed ${
            isCancellingUi
              ? 'border-[#EF4444]/80 bg-[#EF4444]/10'
              : 'border-white/35 bg-white/5'
          }`}
        />
      )}

      <div
        ref={knobRef}
        className={`pointer-events-none flex flex-col items-center justify-center will-change-transform ${
          isDraggingUi
            ? 'w-11 h-11 rounded-full bg-white/15 border border-white/50 shadow-md'
            : ''
        }`}
      >
        {icon}
        {statusLabel && !isDraggingUi && (
          <span
            className={`text-[10px] font-mono-num font-bold leading-none mt-0.5 ${
              isUltimate ? 'text-[#FDE68A]' : 'text-[#F5F0E6]'
            }`}
          >
            {statusLabel}
          </span>
        )}
      </div>
    </button>
  );
};
