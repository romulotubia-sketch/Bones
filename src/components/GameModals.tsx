import React, { useState } from 'react';
import {
  Crown,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shield,
  Skull,
  Volume2,
  VolumeX,
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
}

export const TitleScreenOverlay: React.FC<TitleScreenOverlayProps> = ({
  muted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onStartGame,
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
          className="mt-4 sm:mt-5 min-h-[48px] px-8 rounded-2xl bg-[#4ADE80] text-[#0E1912] text-sm font-bold tracking-wide shadow-xl transition-transform active:scale-95 whitespace-nowrap"
        >
          Start Game
        </button>
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
  onPickBlessing: (id: string) => void;
}

export const BlessingModal: React.FC<BlessingModalProps> = ({
  activeCharacter,
  choices,
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

  const handleSelect = (id: string) => {
    if (performance.now() - openedAtRef.current < 280) return;
    soundEngine.playUiClick(620);
    onPickBlessing(id);
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-3 py-2.5 sm:p-4"
    >
      <div
        role="dialog"
        aria-label="Lantern Statue Blessing"
        className="w-full max-w-2xl bg-[#17141F] border border-[#352F46] rounded-2xl p-3 sm:p-4 shadow-2xl"
      >
        <div className="flex items-baseline justify-between gap-3 mb-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#F5F0E6] whitespace-nowrap">
            Lantern Statue · {profile.archetypeName}
          </h2>
          <span className="text-[11px] text-[#A39BB5] truncate">
            Choose 1 blessing for your equipped loadout
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 items-stretch">
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
