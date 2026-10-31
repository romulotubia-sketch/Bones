/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import {
  BlessingModal,
  DungeonDifficultyModal,
  EndOrPauseModal,
  TitleScreenOverlay,
} from './components/GameModals';
import { HudOverlay } from './components/HudOverlay';
import { LoadoutModal } from './components/LoadoutModal';
import {
  CHARACTER_ROSTER,
  EMPTY_UPGRADE_RANKS,
  loadGuildSave,
  persistGuildSave,
} from './data/zombieData';
import { GameEngine } from './game/GameEngine';
import {
  CharacterId,
  DifficultyLevel,
  EquippedLoadout,
  GamePhase,
  GuildSaveData,
  HudSnapshot,
  RunBlessing,
  UpgradeNodeSlot,
} from './types/game';
import {
  isDocumentFullscreen,
  isViewportPortrait,
  toggleAppFullscreen,
  tryLockScreenLandscape,
} from './utils/orientation';

const INITIAL_HUD: HudSnapshot = {
  phase: GamePhase.Title,
  activeCharacter: CharacterId.Zombie,
  hp: 130,
  maxHp: 130,
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
  resolveBonusPct: 0,
  restlessTimer: 0,
  soulDrainTimer: 0,
  possessionTimer: 0,
  nightmareTimer: 0,
  ultCharge: 100,
  ultCooldown: 0,
  ultMaxCooldown: 20,
  normalCooldowns: [0, 0],
  normalMaxCooldowns: [3.8, 8.5],
  activeMinions: 0,
  floorNumber: 0,
  floorLabel: 'Sanctuary · Cozy Guild Hall',
  difficulty: DifficultyLevel.Easy,
  difficultyLabel: 'Easy',
  difficultyBadge: '🌱',
  difficultyColor: '#4ADE80',
  currentStage: 1,
  maxStages: 1,
  stageFloor: 1,
  totalFloorsInRun: 3,
  runLevel: 1,
  runXp: 0,
  runXpNext: 55,
  runCoins: 0,
  runShardsEarned: 0,
  runKills: 0,
  runDamageDealt: 0,
  activeBlessings: [],
  interactPrompt: null,
  roomBannerText: null,
  bossInfo: null,
  minimap: [],
  mapPan: {
    gridOffsetX: 0,
    gridOffsetY: 0,
    isPanned: false,
  },
};

// Isolated memoized canvas host inside the Landscape Stage
const GameCanvasHost = React.memo(
  React.forwardRef<HTMLCanvasElement>((_, ref) => (
    <div className="absolute inset-0 z-0 w-full h-full overflow-hidden bg-[#121017]">
      <canvas
        ref={ref}
        onContextMenu={(e) => e.preventDefault()}
        className="block w-full h-full touch-none"
      />
    </div>
  ))
);
GameCanvasHost.displayName = 'GameCanvasHost';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [portraitRotated, setPortraitRotated] = useState<boolean>(() => isViewportPortrait());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isDocumentFullscreen());

  const [saveData, setSaveData] = useState<GuildSaveData>(() => {
    const loaded = loadGuildSave();
    soundEngine.setMuted(loaded.muted);
    return loaded;
  });

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    ...INITIAL_HUD,
    activeCharacter: saveData.selectedCharacter,
  }));
  const [loadoutModalOpen, setLoadoutModalOpen] = useState(false);
  const [difficultyModalOpen, setDifficultyModalOpen] = useState(false);
  const [blessingChoices, setBlessingChoices] = useState<RunBlessing[]>([]);
  const [endSummary, setEndSummary] = useState({
    shardsEarned: 0,
    kills: 0,
    damageDealt: 0,
  });

  const saveDataRef = useRef(saveData);
  saveDataRef.current = saveData;

  // Enforce Default Landscape Stage & Fullscreen state across resize/orientation/fullscreen changes
  useEffect(() => {
    tryLockScreenLandscape();
    const syncViewportAndFullscreen = () => {
      setPortraitRotated(isViewportPortrait());
      setIsFullscreen(isDocumentFullscreen());
      engineRef.current?.notifyViewportSync();
    };
    window.addEventListener('resize', syncViewportAndFullscreen);
    window.addEventListener('orientationchange', syncViewportAndFullscreen);
    document.addEventListener('fullscreenchange', syncViewportAndFullscreen);
    document.addEventListener('webkitfullscreenchange', syncViewportAndFullscreen);
    return () => {
      window.removeEventListener('resize', syncViewportAndFullscreen);
      window.removeEventListener('orientationchange', syncViewportAndFullscreen);
      document.removeEventListener('fullscreenchange', syncViewportAndFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncViewportAndFullscreen);
    };
  }, []);

  const handleSelectCharacter = useCallback((charId: CharacterId) => {
    setSaveData((prev) => {
      if (prev.selectedCharacter === charId) return prev;
      const updated: GuildSaveData = {
        ...prev,
        selectedCharacter: charId,
      };
      persistGuildSave(updated);
      engineRef.current?.updateSaveData(updated);
      return updated;
    });
  }, []);

  const handleSelectDifficulty = useCallback((diff: DifficultyLevel) => {
    setSaveData((prev) => {
      if (prev.selectedDifficulty === diff) return prev;
      const updated: GuildSaveData = {
        ...prev,
        selectedDifficulty: diff,
      };
      persistGuildSave(updated);
      engineRef.current?.updateSaveData(updated);
      engineRef.current?.setDifficulty(diff);
      return updated;
    });
  }, []);

  const handleOpenLoadout = useCallback((charId?: CharacterId) => {
    if (charId) {
      setSaveData((prev) => {
        if (prev.selectedCharacter === charId) return prev;
        const updated: GuildSaveData = {
          ...prev,
          selectedCharacter: charId,
        };
        persistGuildSave(updated);
        engineRef.current?.updateSaveData(updated);
        return updated;
      });
    }
    setLoadoutModalOpen(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, saveDataRef.current, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onOpenLoadout: (charId) => {
        handleOpenLoadout(charId);
      },
      onOfferBlessings: (choices) => {
        setBlessingChoices(choices);
      },
      onRunFinished: (victory, shardsEarned, kills, damageDealt) => {
        setEndSummary({ shardsEarned, kills, damageDealt });
        const prev = saveDataRef.current;
        const updated: GuildSaveData = {
          ...prev,
          soulShards: prev.soulShards + shardsEarned,
          totalRuns: prev.totalRuns + 1,
          victories: prev.victories + (victory ? 1 : 0),
          totalSkeletonsSlain: prev.totalSkeletonsSlain + kills,
        };
        persistGuildSave(updated);
        setSaveData(updated);
      },
      onRequestDifficultySelect: () => {
        setDifficultyModalOpen(true);
      },
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleOpenLoadout]);

  const handleToggleFullscreen = useCallback(() => {
    void toggleAppFullscreen().then((active) => {
      setIsFullscreen(active);
      setPortraitRotated(isViewportPortrait());
      engineRef.current?.notifyViewportSync();
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setSaveData((prev) => {
      const nextMuted = !prev.muted;
      soundEngine.setMuted(nextMuted);
      if (!nextMuted) soundEngine.playUiClick(600);
      const updated = { ...prev, muted: nextMuted };
      persistGuildSave(updated);
      engineRef.current?.updateSaveData(updated);
      return updated;
    });
  }, []);

  const handleUpdateLoadout = useCallback((charId: CharacterId, loadout: EquippedLoadout) => {
    setSaveData((prev) => {
      const updated: GuildSaveData = {
        ...prev,
        loadouts: {
          ...prev.loadouts,
          [charId]: loadout,
        },
      };
      persistGuildSave(updated);
      engineRef.current?.updateSaveData(updated);
      return updated;
    });
  }, []);

  const handlePurchaseUpgrade = useCallback(
    (charId: CharacterId, slot: UpgradeNodeSlot, cost: number) => {
      setSaveData((prev) => {
        if (prev.soulShards < cost) return prev;
        const currentRanks = prev.characterUpgrades[charId] ?? EMPTY_UPGRADE_RANKS;
        const nextCharRanks = {
          ...currentRanks,
          [slot]: currentRanks[slot] + 1,
        };
        const updated: GuildSaveData = {
          ...prev,
          soulShards: prev.soulShards - cost,
          characterUpgrades: {
            ...prev.characterUpgrades,
            [charId]: nextCharRanks,
          },
        };
        persistGuildSave(updated);
        engineRef.current?.updateSaveData(updated);
        return updated;
      });
    },
    []
  );

  const handleStartFromTitle = useCallback(() => {
    engineRef.current?.enterGuildPicking();
  }, []);

  const handleConfirmLoadoutAndRoam = useCallback(() => {
    setLoadoutModalOpen(false);
    engineRef.current?.enterGuildRoam();
  }, []);

  const handleSelectBlessing = useCallback((id: string) => {
    setBlessingChoices([]);
    engineRef.current?.applyBlessingChoice(id);
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.setPhase(GamePhase.Paused);
  }, []);

  const handleResume = useCallback(() => {
    const targetPhase = hud.floorNumber === 0 ? GamePhase.GuildRoam : GamePhase.Dungeon;
    engineRef.current?.setPhase(targetPhase);
  }, [hud.floorNumber]);

  const handleReturnToGuild = useCallback(() => {
    setLoadoutModalOpen(false);
    engineRef.current?.enterGuildRoam();
  }, []);

  const handlePlayAgain = useCallback(() => {
    setLoadoutModalOpen(false);
    setDifficultyModalOpen(true);
  }, []);

  const handleConfirmDifficultyAndStart = useCallback(
    (diff: DifficultyLevel) => {
      handleSelectDifficulty(diff);
      setDifficultyModalOpen(false);
      engineRef.current?.startGraveyardRun(diff);
    },
    [handleSelectDifficulty]
  );

  const handleCloseDifficultyModal = useCallback(() => {
    setDifficultyModalOpen(false);
    if (hud.phase === GamePhase.GameOver || hud.phase === GamePhase.Victory) {
      engineRef.current?.enterGuildRoam();
    }
  }, [hud.phase]);

  const handleJoystickMove = useCallback((nx: number, ny: number) => {
    if (difficultyModalOpen || loadoutModalOpen) return;
    engineRef.current?.setJoystickInput(nx, ny);
  }, [difficultyModalOpen, loadoutModalOpen]);

  const handleMapPanJoystick = useCallback((nx: number, ny: number) => {
    engineRef.current?.setMinimapPanJoystick(nx, ny);
  }, []);

  const handleResetMapPan = useCallback(() => {
    engineRef.current?.resetMapPan();
  }, []);

  const handleAttackHeldChange = useCallback((held: boolean) => {
    engineRef.current?.setAttackHeld(held);
  }, []);

  const handleInteract = useCallback(() => {
    engineRef.current?.triggerInteract();
  }, []);

  const handleTriggerSkill = useCallback(
    (slot: 'BASIC' | 'NORMAL_0' | 'NORMAL_1' | 'ULTIMATE') => {
      engineRef.current?.triggerSkillFromHud(slot);
    },
    []
  );

  const activeLoadout =
    saveData.loadouts[saveData.selectedCharacter] ??
    CHARACTER_ROSTER[saveData.selectedCharacter].defaultLoadout;

  return (
    <main
      className={`${
        portraitRotated ? 'landscape-stage-ForcedPortrait' : 'landscape-stage-Native'
      } overflow-hidden select-none bg-[#121017]`}
    >
      {/* Isolated 60fps Live Game World Canvas */}
      <GameCanvasHost ref={canvasRef} />

      {/* Title Screen */}
      {hud.phase === GamePhase.Title && (
        <TitleScreenOverlay
          muted={saveData.muted}
          isFullscreen={isFullscreen}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
          onStartGame={handleStartFromTitle}
        />
      )}

      {/* Mobile Landscape HUD (Joystick + Radial Action Pad) */}
      {(hud.phase === GamePhase.GuildPicking ||
        hud.phase === GamePhase.GuildRoam ||
        hud.phase === GamePhase.Dungeon) &&
        !loadoutModalOpen &&
        !difficultyModalOpen && (
          <HudOverlay
            hud={hud}
            loadout={activeLoadout}
            totalSavedShards={saveData.soulShards}
            selectedDifficulty={saveData.selectedDifficulty}
            muted={saveData.muted}
            isFullscreen={isFullscreen}
            onToggleMute={handleToggleMute}
            onToggleFullscreen={handleToggleFullscreen}
            onPause={handlePause}
            onOpenLoadout={handleOpenLoadout}
            onSelectDifficulty={handleSelectDifficulty}
            onJoystickMove={handleJoystickMove}
            onMapPanJoystick={handleMapPanJoystick}
            onResetMapPan={handleResetMapPan}
            onAttackHeldChange={handleAttackHeldChange}
            onInteract={handleInteract}
            onTriggerSkill={handleTriggerSkill}
          />
        )}

      {/* Character Skill Picking & Guild Progression Modal */}
      {loadoutModalOpen && (
        <LoadoutModal
          saveData={saveData}
          isPickingCharacter={hud.phase === GamePhase.GuildPicking}
          onSelectCharacter={handleSelectCharacter}
          onUpdateLoadout={handleUpdateLoadout}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          onConfirmAndRoam={handleConfirmLoadoutAndRoam}
        />
      )}

      {/* Dungeon Difficulty Selection Modal upon entering the dungeon */}
      {difficultyModalOpen && (
        <DungeonDifficultyModal
          currentDifficulty={saveData.selectedDifficulty}
          onConfirmDifficulty={handleConfirmDifficultyAndStart}
          onCancel={handleCloseDifficultyModal}
        />
      )}

      {/* Mid-Run Graveyard Blessing Picker */}
      {hud.phase === GamePhase.BlessingSelect && blessingChoices.length > 0 && (
        <BlessingModal
          activeCharacter={hud.activeCharacter}
          choices={blessingChoices}
          onPickBlessing={handleSelectBlessing}
        />
      )}

      {/* Pause, Victory & Game Over Modals */}
      {(hud.phase === GamePhase.Paused ||
        hud.phase === GamePhase.Victory ||
        hud.phase === GamePhase.GameOver) && (
        <EndOrPauseModal
          phase={hud.phase}
          isGuild={hud.floorNumber === 0}
          isFullscreen={isFullscreen}
          shardsEarned={endSummary.shardsEarned}
          kills={endSummary.kills}
          damageDealt={endSummary.damageDealt}
          difficulty={saveData.selectedDifficulty}
          currentStage={hud.currentStage}
          maxStages={hud.maxStages}
          floorLabel={hud.floorLabel}
          onSelectDifficulty={handleSelectDifficulty}
          onToggleFullscreen={handleToggleFullscreen}
          onResume={handleResume}
          onReturnToGuild={handleReturnToGuild}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </main>
  );
}
