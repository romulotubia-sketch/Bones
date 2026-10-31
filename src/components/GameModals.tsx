import React, { useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Crown,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shield,
  Skull,
  Swords,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  CHARACTER_ROSTER,
  DIFFICULTY_CONFIGS,
  DIFFICULTY_LIST,
  GRAVEYARD_BIOME_URL,
  SKELETON_BOSS_URL,
} from '../data/zombieData';
import { CharacterId, DifficultyLevel, GamePhase, RunBlessing } from '../types/game';
import { requestAppFullscreen, tryLockScreenLandscape } from '../utils/orientation';
import { ScrollablePane } from './ScrollablePane';
import { HearthAndBoneTitleSvg, SoulShardIcon } from './SkillIcons';

interface TitleScreenOverlayProps {
  muted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onStartGame: () => void;
  onOpenMultiplayer?: () => void;
}

export const TitleScreenOverlay: React.FC<TitleScreenOverlayProps> = ({
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onStartGame,
  onOpenMultiplayer,
}) => {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between safe-hud-insets bg-gradient-to-t from-[#0D0A12]/85 via-[#0D0A12]/25 to-[#0D0A12]/55">
      {/* Top-right mobile Download + Full Screen + Mute controls (>= 44x44px) */}
      <div className="flex justify-end items-center gap-2 pointer-events-auto">
        <a
          href="/hearth-and-bone-playable.zip"
          download="Hearth-and-Bone-Playable.zip"
          onClick={() => soundEngine.playUiClick(560)}
          aria-label="Download playable game archive"
          className="min-h-[44px] px-3.5 rounded-xl bg-[#181421]/95 border border-[#322B43] text-[#F5F0E6] text-xs font-semibold active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 no-underline"
        >
          <Download className="w-4 h-4 text-[#C084FC]" />
          <span>Download</span>
        </a>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick(540);
            onToggleFullscreen();
          }}
          aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
          className="min-h-[44px] px-3.5 rounded-xl bg-[#181421]/95 border border-[#322B43] text-[#F5F0E6] text-xs font-semibold active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4 text-[#4ADE80]" />
              <span>Exit Full</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-[#4ADE80]" />
              <span>Full Screen</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="min-w-[44px] min-h-[44px] rounded-xl bg-[#181421]/95 border border-[#322B43] text-[#D6D0C4] active:scale-95 flex items-center justify-center"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Center Lockup preserving generous negative space on mobile landscape */}
      <div className="my-auto flex flex-col items-center text-center max-w-lg mx-auto pointer-events-auto">
        <HearthAndBoneTitleSvg className="w-full max-w-[330px] sm:max-w-[410px] h-auto drop-shadow-lg" />

        <p className="text-xs sm:text-sm text-[#D6D0C4] mt-2 max-w-md leading-relaxed [text-wrap:balance]">
          Choose the Zombie, Skeleton, Goblin, Gnome, or Ghost in the Guild House, equip your skills, and step out the North Door into the Whispering Graveyard.
        </p>

        <div className="mt-4 sm:mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              tryLockScreenLandscape();
              if (!isFullscreen) {
                void requestAppFullscreen();
              }
              soundEngine.playUiClick(580);
              onStartGame();
            }}
            className="min-h-[46px] px-6 rounded-2xl bg-[#4ADE80] text-[#0E1912] text-sm font-bold tracking-wide shadow-xl transition-transform active:scale-95 whitespace-nowrap"
          >
            Solo Journey
          </button>

          <button
            type="button"
            onClick={() => {
              tryLockScreenLandscape();
              if (!isFullscreen) {
                void requestAppFullscreen();
              }
              soundEngine.playUiClick(600);
              onOpenMultiplayer?.();
            }}
            className="min-h-[46px] px-5 rounded-2xl bg-[#241D32] hover:bg-[#322745] border border-[#483761] text-[#F3EFE6] text-sm font-bold tracking-wide shadow-xl transition-transform active:scale-95 whitespace-nowrap flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-[#38BDF8]" />
            <span>Multiplayer</span>
          </button>
        </div>
      </div>

      {/* Single flat mobile control-hint line */}
      <div className="text-center text-[11px] text-[#B8B0C8] tracking-wide">
        Left Thumb Joystick · Right Thumb Attack &amp; Skills · Walk Out Guild Door to Enter Dungeon
      </div>
    </div>
  );
};

interface BlessingModalProps {
  activeCharacter: CharacterId;
  choices: RunBlessing[];
  source?: 'STATUE' | 'STAGE_CLEAR';
  currentFloor?: number;
  currentStageFloor?: string;
  onPickBlessing: (id: string) => void;
}

export const BlessingModal: React.FC<BlessingModalProps> = ({
  activeCharacter,
  choices,
  source = 'STAGE_CLEAR',
  currentFloor,
  currentStageFloor,
  onPickBlessing,
}) => {
  const openedAtRef = React.useRef<number>(performance.now());
  const profile = CHARACTER_ROSTER[activeCharacter] ?? CHARACTER_ROSTER[CharacterId.Zombie];
  const isSkeleton = activeCharacter === CharacterId.Skeleton;
  const isGoblin = activeCharacter === CharacterId.Goblin;
  const isGnome = activeCharacter === CharacterId.Gnome;
  const isGhost = activeCharacter === CharacterId.Ghost;
  const selectAccentClass = isSkeleton
    ? 'text-[#38BDF8]'
    : isGoblin
    ? 'text-[#FBBF24]'
    : isGnome
    ? 'text-[#FB923C]'
    : isGhost
    ? 'text-[#D8B4FE]'
    : 'text-[#4ADE80]';
  const activeBorderClass = isSkeleton
    ? 'active:border-[#38BDF8]'
    : isGoblin
    ? 'active:border-[#F59E0B]'
    : isGnome
    ? 'active:border-[#FB923C]'
    : isGhost
    ? 'active:border-[#C084FC]'
    : 'active:border-[#4ADE80]';

  const isFinalStage = currentStageFloor === '3-1' || currentFloor === 7;

  const handleSelect = (id: string) => {
    if (performance.now() - openedAtRef.current < 280) return;
    soundEngine.playUiClick(620);
    onPickBlessing(id);
  };

  const gridColsClass =
    choices.length === 1
      ? 'grid-cols-1 max-w-sm mx-auto'
      : choices.length === 2
      ? 'grid-cols-2 max-w-xl mx-auto'
      : 'grid-cols-3';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-3 py-2.5 sm:p-4"
    >
      <div
        role="dialog"
        aria-label="Run Blessing Choice"
        className="w-full max-w-2xl bg-[#17141F] border border-[#352F46] rounded-2xl p-3 sm:p-4 shadow-2xl"
      >
        <div className="flex items-baseline justify-between gap-3 mb-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#F5F0E6] whitespace-nowrap">
            {source === 'STATUE' ? 'Lantern Statue' : 'Stage Clear Blessing'} · {profile.archetypeName}
          </h2>
          <span className="text-[11px] text-[#A39BB5] truncate">
            {isFinalStage
              ? 'Stage 3-1 · Final blessing opportunity (Capped after 3-1)'
              : 'Choose 1 blessing · Blessings end after Stage 3-1'}
          </span>
        </div>

        <div className={`grid ${gridColsClass} gap-2 sm:gap-2.5 items-stretch`}>
          {choices.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => handleSelect(b.id)}
              className={`min-h-[118px] p-2.5 sm:p-3 rounded-xl bg-[#1D1928] border border-[#322C42] ${activeBorderClass} active:scale-[0.98] text-left flex flex-col justify-between gap-1.5 transition-transform`}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[#9E96B0] truncate">
                  {b.category}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#F5F0E6] mt-0.5 truncate">
                  {b.name}
                </h3>
                <p className="text-[11px] text-[#C7C0D6] mt-1 leading-tight line-clamp-3">
                  {b.description}
                </p>
              </div>
              <div
                className={`text-[11px] font-bold ${selectAccentClass} pt-1.5 border-t border-[#2C263B] whitespace-nowrap`}
              >
                Select
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface EndOrPauseModalProps {
  phase: GamePhase.Paused | GamePhase.Victory | GamePhase.GameOver;
  isGuild: boolean;
  isFullscreen: boolean;
  shardsEarned: number;
  kills: number;
  damageDealt: number;
  difficulty?: DifficultyLevel;
  currentStage?: number;
  maxStages?: number;
  floorLabel?: string;
  onSelectDifficulty?: (diff: DifficultyLevel) => void;
  onToggleFullscreen: () => void;
  onResume: () => void;
  onReturnToGuild: () => void;
  onPlayAgain: () => void;
}

export const EndOrPauseModal: React.FC<EndOrPauseModalProps> = ({
  phase,
  isGuild,
  isFullscreen,
  shardsEarned,
  kills,
  damageDealt,
  difficulty = DifficultyLevel.Easy,
  currentStage = 1,
  maxStages = 1,
  floorLabel,
  onSelectDifficulty,
  onToggleFullscreen,
  onResume,
  onReturnToGuild,
  onPlayAgain,
}) => {
  const [imgError, setImgError] = useState(false);
  const diffConfig = DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS[DifficultyLevel.Easy];

  if (phase === GamePhase.Paused) {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-4"
      >
        <ScrollablePane className="w-full max-w-sm max-h-[92%] bg-[#17141F] border border-[#352F46] rounded-2xl p-5 shadow-2xl text-center">
          <h2 className="font-display text-xl font-bold text-[#F5F0E6]">Game Paused</h2>
          <p className="text-xs text-[#A39BB5] mt-1">
            {isGuild
              ? 'Resting inside the Cozy Guild House.'
              : 'Exploring the Whispering Graveyard.'}
          </p>

          <div
            className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{
              color: diffConfig.color,
              backgroundColor: `${diffConfig.color}18`,
              border: `1px solid ${diffConfig.color}44`,
            }}
          >
            <span>{diffConfig.badge}</span>
            <span>{diffConfig.label} Difficulty</span>
            {!isGuild && floorLabel && <span className="opacity-80">· {floorLabel}</span>}
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(560);
                onResume();
              }}
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#4ADE80] text-[#0E1912] text-xs font-bold active:scale-95 transition-transform whitespace-nowrap"
            >
              Resume
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(520);
                onToggleFullscreen();
              }}
              className="w-full min-h-[46px] px-4 rounded-xl bg-[#262134] text-[#F5F0E6] text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform whitespace-nowrap"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-[#4ADE80]" />
                  <span>Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-[#4ADE80]" />
                  <span>Enter Full Screen</span>
                </>
              )}
            </button>

            {!isGuild && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(480);
                  onReturnToGuild();
                }}
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#262134] text-[#F5F0E6] text-xs font-semibold active:scale-95 transition-transform whitespace-nowrap"
              >
                Return to Guild House
              </button>
            )}
          </div>
        </ScrollablePane>
      </div>
    );
  }

  const isVictory = phase === GamePhase.Victory;
  const bannerImg = isVictory ? SKELETON_BOSS_URL : GRAVEYARD_BIOME_URL;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-5"
    >
      <ScrollablePane className="w-full max-w-lg max-h-[92%] bg-[#17141F] border border-[#352F46] rounded-2xl shadow-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-12 overflow-hidden">
          {/* Landscape Left Art Panel */}
          <div className="sm:col-span-5 h-28 sm:h-auto bg-[#1F1A2B] relative overflow-hidden">
            {!imgError ? (
              <img
                src={bannerImg}
                alt={isVictory ? 'Lord Marrow vanquished' : 'Whispering Graveyard'}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#211C2E]">
                {isVictory ? (
                  <Crown className="w-10 h-10 text-[#FBBF24]" />
                ) : (
                  <Skull className="w-10 h-10 text-[#94A3B8]" />
                )}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#17141F] via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-[#17141F]" />
          </div>

          {/* Landscape Right Summary & Touch Actions */}
          <div className="sm:col-span-7 p-4 sm:p-5 flex flex-col justify-between gap-3.5">
            <div>
              <h2 className="font-display text-xl font-bold text-[#F5F0E6]">
                {isVictory ? 'Graveyard Cleared!' : 'Returned to the Hearth'}
              </h2>
              <p className="text-[11px] text-[#BDB6CC] mt-1 leading-snug">
                {isVictory
                  ? `${diffConfig.label} conquered! All ${diffConfig.stages} ${diffConfig.stages === 1 ? 'stage' : 'stages'} cleared and peace returns to the moonlit plots.`
                  : 'Your Soul Shards were carried safely back to the Guild House.'}
              </p>

              <div className="mt-2.5 py-2 border-y border-[#2A2438] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#9E96B0]">Difficulty</span>
                  <span
                    className="font-mono-num font-bold text-[11px] px-2 py-0.5 rounded flex items-center gap-1"
                    style={{
                      color: diffConfig.color,
                      backgroundColor: `${diffConfig.color}22`,
                      border: `1px solid ${diffConfig.color}55`,
                    }}
                  >
                    <span>{diffConfig.badge}</span>
                    <span>{diffConfig.label}</span>
                    <span className="text-[10px] opacity-80">
                      ({diffConfig.stages} {diffConfig.stages === 1 ? 'Stage' : 'Stages'} · {diffConfig.maxFloors}F)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9E96B0]">Skeletons Defeated</span>
                  <span className="font-mono-num font-semibold text-[#F5F0E6]">{kills}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9E96B0]">Total Damage Dealt</span>
                  <span className="font-mono-num font-semibold text-[#F5F0E6]">{damageDealt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9E96B0]">Soul Shards ({diffConfig.shardMultiplier}x)</span>
                  <span className="font-mono-num font-semibold text-[#7DD3FC] flex items-center gap-1">
                    <SoulShardIcon className="w-3.5 h-3.5" />+{shardsEarned}
                  </span>
                </div>
              </div>
            </div>

            {onSelectDifficulty && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-[#9E96B0] uppercase tracking-wider">
                  Next Run Difficulty
                </span>
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {DIFFICULTY_LIST.map((d) => {
                    const isSel = difficulty === d.level;
                    return (
                      <button
                        key={d.level}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick(500 + DIFFICULTY_LIST.indexOf(d) * 50);
                          onSelectDifficulty(d.level);
                        }}
                        className={`min-h-[32px] px-2 rounded-lg text-[11px] font-bold transition-all active:scale-95 flex items-center gap-1 shrink-0 ${
                          isSel ? 'ring-1 ring-white/40 shadow-sm' : 'text-[#8E86A0] bg-[#120E1A]'
                        }`}
                        style={
                          isSel
                            ? {
                                backgroundColor: d.color,
                                color: d.level === DifficultyLevel.Easy ? '#0F1A12' : '#FFFFFF',
                              }
                            : undefined
                        }
                      >
                        <span>{d.badge}</span>
                        <span>{d.label}</span>
                        <span className="text-[9px] opacity-75 font-mono-num font-normal">
                          {d.shardMultiplier}x
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(540);
                  onReturnToGuild();
                }}
                className="flex-1 min-h-[46px] px-3 rounded-xl bg-[#272235] text-[#F5F0E6] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
              >
                <Shield className="w-4 h-4 text-[#4ADE80]" />
                <span>Guild House</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(620);
                  onPlayAgain();
                }}
                className="flex-1 min-h-[46px] px-3 rounded-xl bg-[#4ADE80] text-[#0E1912] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          </div>
        </div>
      </ScrollablePane>
    </div>
  );
};

export interface DungeonDifficultyModalProps {
  currentDifficulty?: DifficultyLevel;
  onConfirmDifficulty: (diff: DifficultyLevel) => void;
  onCancel: () => void;
}

export const DungeonDifficultyModal: React.FC<DungeonDifficultyModalProps> = ({
  currentDifficulty = DifficultyLevel.Easy,
  onConfirmDifficulty,
  onCancel,
}) => {
  const [selectedDiff, setSelectedDiff] = useState<DifficultyLevel>(currentDifficulty);
  const cfg = DIFFICULTY_CONFIGS[selectedDiff] ?? DIFFICULTY_CONFIGS[DifficultyLevel.Easy];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4"
    >
      <ScrollablePane className="w-full max-w-xl max-h-[96%] bg-[#15121D] border border-[#302A40] rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col text-[#F3EFE6]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#282236]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#201A2C] border border-[#3D3352] flex items-center justify-center text-[#C084FC] shadow-inner">
              <Compass className="w-5 h-5 text-[#C084FC]" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#F5F0E6]">
                Choose Expedition Difficulty
              </h2>
              <p className="text-[11px] sm:text-xs text-[#9E96B0]">
                Choose your descent into the graveyard before venturing past the Hearth.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(440);
              onCancel();
            }}
            aria-label="Close difficulty selection"
            className="w-8 h-8 rounded-lg bg-[#221D2E] hover:bg-[#2E273E] text-[#9E96B0] hover:text-white flex items-center justify-center transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Difficulty Selection Pills / Tabs */}
        <div className="grid grid-cols-5 gap-1.5 mt-3.5">
          {DIFFICULTY_LIST.map((diff, idx) => {
            const isSelected = selectedDiff === diff.level;
            return (
              <button
                key={diff.level}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(480 + idx * 40);
                  setSelectedDiff(diff.level);
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all active:scale-95 ${
                  isSelected
                    ? 'ring-2 ring-white/40 shadow-lg scale-[1.02]'
                    : 'border-[#2D253B] bg-[#1B1724]/70 hover:bg-[#221D2E] text-[#A39BB5]'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${diff.color}20`,
                        borderColor: diff.color,
                        boxShadow: `0 0 16px ${diff.color}40`,
                      }
                    : undefined
                }
              >
                <span className="text-base sm:text-lg mb-0.5">{diff.badge.split(' ')[0]}</span>
                <span
                  className="text-xs sm:text-sm font-bold tracking-tight truncate max-w-full"
                  style={{ color: isSelected ? diff.color : '#E2DCED' }}
                >
                  {diff.label}
                </span>
                <span
                  className="text-[10px] font-mono-num font-semibold px-1 py-0.5 mt-0.5 rounded"
                  style={{
                    backgroundColor: isSelected ? `${diff.color}33` : '#131019',
                    color: isSelected ? diff.color : '#7DD3FC',
                  }}
                >
                  {diff.shardMultiplier}x
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Difficulty Card */}
        <div
          className="mt-3.5 p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all"
          style={{
            backgroundColor: `${cfg.color}10`,
            borderColor: `${cfg.color}40`,
          }}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xl">{cfg.badge.split(' ')[0]}</span>
              <div>
                <span className="text-sm sm:text-base font-bold" style={{ color: cfg.color }}>
                  {cfg.label} Difficulty
                </span>
                <span className="text-[11px] text-[#A39BB5] ml-2">
                  {cfg.tagline}
                </span>
              </div>
            </div>
            <div
              className="px-2 py-0.5 rounded-md font-mono-num text-xs font-bold"
              style={{
                backgroundColor: `${cfg.color}25`,
                color: cfg.color,
                border: `1px solid ${cfg.color}60`,
              }}
            >
              {cfg.shardMultiplier}x Soul Shards
            </div>
          </div>

          <p className="text-xs text-[#D8D2E4] leading-relaxed">
            {cfg.description}
          </p>

          {/* Stat Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="bg-[#14101D]/80 border border-[#2B2338] rounded-lg p-2">
              <div className="text-[10px] text-[#8E86A0] uppercase font-semibold">Dungeon Length</div>
              <div className="font-mono-num font-bold text-[#F3EFE6] mt-0.5">
                {cfg.stages} {cfg.stages === 1 ? 'Stage' : 'Stages'} ({cfg.maxFloors} fl)
              </div>
            </div>
            <div className="bg-[#14101D]/80 border border-[#2B2338] rounded-lg p-2">
              <div className="text-[10px] text-[#8E86A0] uppercase font-semibold">Enemy Multiplier</div>
              <div className="font-mono-num font-bold text-[#F87171] mt-0.5">
                +{Math.round((cfg.enemyHpMult - 1) * 100)}% HP / +{Math.round((cfg.enemyDmgMult - 1) * 100)}% DMG
              </div>
            </div>
            <div className="bg-[#14101D]/80 border border-[#2B2338] rounded-lg p-2">
              <div className="text-[10px] text-[#8E86A0] uppercase font-semibold">Combat Waves</div>
              <div className="font-mono-num font-bold text-[#FCD34D] mt-0.5">
                {cfg.wavesPerCombatRoom} Waves / Room
              </div>
            </div>
            <div className="bg-[#14101D]/80 border border-[#2B2338] rounded-lg p-2">
              <div className="text-[10px] text-[#8E86A0] uppercase font-semibold">Victory Bonus</div>
              <div className="font-mono-num font-bold text-[#38BDF8] mt-0.5 flex items-center gap-1">
                <SoulShardIcon className="w-3.5 h-3.5" />
                +{cfg.victoryShards} Shards
              </div>
            </div>
          </div>

          {cfg.warningNote && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#450A0A]/60 border border-[#EF4444]/60 text-[#FCA5A5] text-[11px] font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>{cfg.warningNote}</span>
            </div>
          )}
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5 mt-4 pt-2 border-t border-[#262033]">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(440);
              onCancel();
            }}
            className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#221D2E] hover:bg-[#2B243B] text-[#D8D2E4] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Shield className="w-4 h-4 text-[#A39BB5]" />
            <span>Stay in Hearth</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(650);
              onConfirmDifficulty(selectedDiff);
            }}
            className="flex-1 min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg"
            style={{
              backgroundColor: cfg.color,
              color: cfg.level === DifficultyLevel.Easy ? '#0F1A12' : '#FFFFFF',
              boxShadow: `0 0 14px ${cfg.color}60`,
            }}
          >
            <Swords className="w-4 h-4" />
            <span>Enter Dungeon ({cfg.label})</span>
          </button>
        </div>
      </ScrollablePane>
    </div>
  );
};

