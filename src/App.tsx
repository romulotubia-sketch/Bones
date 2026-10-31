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
import { AwakeningModal } from './components/AwakeningModal';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { SettingsModal } from './components/SettingsModal';
import { NetworkManager } from './multiplayer/NetworkManager';
import { RoomInfo } from './multiplayer/networkTypes';
import {
  CHARACTER_ROSTER,
  EMPTY_UPGRADE_RANKS,
  loadGuildSave,
  MAX_RUN_BLESSINGS,
  persistGuildSave,
} from './data/zombieData';
import {
  AWAKENING_BASE_SUCCESS_CHANCE,
  AWAKENING_COST_GEMS,
  TRANSMUTE_GEMS_YIELD,
  TRANSMUTE_SHARDS_COST,
} from './data/awakeningData';
import { GameEngine } from './game/GameEngine';
import {
  AwakenedPathKey,
  CharacterId,
  DifficultyLevel,
  EquippedLoadout,
  GamePhase,
  GuildSaveData,
  HudSnapshot,
  ManualSkillAimInput,
  RunBlessing,
  SkillSlotKey,
  UltimateSkillId,
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
  tinkerHasteTimer: 0,
  rapidReloadActive: false,
  arsenalActive: false,
  activeTurrets: 0,
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
  pvpMatchInfo: null,
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
  const [awakeningModalOpen, setAwakeningModalOpen] = useState(false);
  const [difficultyModalOpen, setDifficultyModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [blessingChoices, setBlessingChoices] = useState<RunBlessing[]>([]);
  const [blessingSource, setBlessingSource] = useState<'STATUE' | 'STAGE_CLEAR'>('STAGE_CLEAR');
  const [endSummary, setEndSummary] = useState({
    shardsEarned: 0,
    kills: 0,
    damageDealt: 0,
  });

  const networkManagerRef = useRef<NetworkManager | null>(null);
  if (!networkManagerRef.current) {
    networkManagerRef.current = new NetworkManager();
  }
  const [multiplayerModalOpen, setMultiplayerModalOpen] = useState(false);
  const [multiplayerRoom, setMultiplayerRoom] = useState<RoomInfo | null>(null);

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
      onOpenAwakening: (charId) => {
        if (charId) handleSelectCharacter(charId);
        setAwakeningModalOpen(true);
      },
      onOfferBlessings: (choices, source = 'STAGE_CLEAR') => {
        setBlessingChoices(choices);
        setBlessingSource(source);
      },
      onRunFinished: (victory, shardsEarned, kills, damageDealt) => {
        setEndSummary({ shardsEarned, kills, damageDealt });
        const prev = saveDataRef.current;
        const bonusGems = victory ? 35 : 12;
        const updated: GuildSaveData = {
          ...prev,
          soulShards: prev.soulShards + shardsEarned,
          gems: (prev.gems ?? 100) + bonusGems,
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
    engine.setNetworkManager(networkManagerRef.current);
    engine.start();

    return () => {
      engine.setNetworkManager(null);
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleOpenLoadout]);

  useEffect(() => {
    const net = networkManagerRef.current;
    if (!net) return;
    return net.setCallbacks({
      onRoomUpdate: (room) => {
        setMultiplayerRoom(room ? { ...room } : null);
      },
      onGameStart: () => {
        setMultiplayerModalOpen(false);
      },
    });
  }, []);

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

  const handleUpdateSettings = useCallback(
    (patch: { muted?: boolean; joystickScale?: number; skillButtonScale?: number }) => {
      setSaveData((prev) => {
        const nextMuted = patch.muted !== undefined ? patch.muted : prev.muted;
        const clamp = (v: number) => Math.max(0.7, Math.min(1.35, Math.round(v * 100) / 100));
        const nextJoy =
          patch.joystickScale !== undefined ? clamp(patch.joystickScale) : prev.joystickScale;
        const nextSkill =
          patch.skillButtonScale !== undefined
            ? clamp(patch.skillButtonScale)
            : prev.skillButtonScale;

        if (nextMuted !== prev.muted) {
          soundEngine.setMuted(nextMuted);
          if (!nextMuted) soundEngine.playUiClick(600);
        }

        const updated: GuildSaveData = {
          ...prev,
          muted: nextMuted,
          joystickScale: nextJoy,
          skillButtonScale: nextSkill,
        };
        persistGuildSave(updated);
        engineRef.current?.updateSaveData(updated);
        return updated;
      });
    },
    []
  );

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

  const handleAttemptAwakening = useCallback(
    (charId: CharacterId, ultId: UltimateSkillId) => {
      const currentGems = saveDataRef.current.gems ?? 100;
      if (currentGems < AWAKENING_COST_GEMS) {
        return { success: false, message: 'Not enough Awakening Gems (requires 25 💎).' };
      }

      const existingAwakened = saveDataRef.current.awakenedUltimates?.[charId]?.[ultId] ?? {
        unlockedA: false,
        unlockedB: false,
        activePath: 'NONE',
        pityCount: 0,
      };

      if (existingAwakened.unlockedA && existingAwakened.unlockedB) {
        return { success: false, message: 'Both paths are already unlocked!' };
      }

      const pityBonus = existingAwakened.pityCount * 0.16;
      const effectiveChance = AWAKENING_BASE_SUCCESS_CHANCE + pityBonus;
      const isPityGuaranteed = existingAwakened.pityCount >= 4;
      const rollSuccess = isPityGuaranteed || Math.random() < effectiveChance;

      let pathUnlocked: 'PATH_A' | 'PATH_B' | undefined;

      if (rollSuccess) {
        if (!existingAwakened.unlockedA && !existingAwakened.unlockedB) {
          pathUnlocked = Math.random() < 0.5 ? 'PATH_A' : 'PATH_B';
        } else if (!existingAwakened.unlockedA) {
          pathUnlocked = 'PATH_A';
        } else {
          pathUnlocked = 'PATH_B';
        }
      }

      setSaveData((prev) => {
        const charAwakened = { ...(prev.awakenedUltimates?.[charId] ?? {}) };
        const prevStatus = charAwakened[ultId] ?? {
          unlockedA: false,
          unlockedB: false,
          activePath: 'NONE',
          pityCount: 0,
        };

        const updatedStatus = {
          unlockedA: rollSuccess && pathUnlocked === 'PATH_A' ? true : prevStatus.unlockedA,
          unlockedB: rollSuccess && pathUnlocked === 'PATH_B' ? true : prevStatus.unlockedB,
          activePath: rollSuccess && pathUnlocked ? pathUnlocked : prevStatus.activePath,
          pityCount: rollSuccess ? 0 : prevStatus.pityCount + 1,
        };

        charAwakened[ultId] = updatedStatus;

        const updated: GuildSaveData = {
          ...prev,
          gems: Math.max(0, (prev.gems ?? 100) - AWAKENING_COST_GEMS),
          awakenedUltimates: {
            ...prev.awakenedUltimates,
            [charId]: charAwakened,
          },
        };
        persistGuildSave(updated);
        engineRef.current?.updateSaveData(updated);
        return updated;
      });

      return {
        success: rollSuccess,
        pathUnlocked,
        message: rollSuccess ? 'Awakening Ascension Succeeded!' : 'Awakening Resonance Dissipated...',
      };
    },
    []
  );

  const handleToggleAwakenedPath = useCallback(
    (charId: CharacterId, ultId: UltimateSkillId, path: AwakenedPathKey) => {
      setSaveData((prev) => {
        const charAwakened = { ...(prev.awakenedUltimates?.[charId] ?? {}) };
        const prevStatus = charAwakened[ultId] ?? {
          unlockedA: false,
          unlockedB: false,
          activePath: 'NONE',
          pityCount: 0,
        };
        charAwakened[ultId] = {
          ...prevStatus,
          activePath: path,
        };
        const updated: GuildSaveData = {
          ...prev,
          awakenedUltimates: {
            ...prev.awakenedUltimates,
            [charId]: charAwakened,
          },
        };
        persistGuildSave(updated);
        engineRef.current?.updateSaveData(updated);
        return updated;
      });
    },
    []
  );

  const handleTransmuteShards = useCallback(() => {
    if ((saveDataRef.current.soulShards ?? 0) < TRANSMUTE_SHARDS_COST) return false;
    setSaveData((prev) => {
      const updated: GuildSaveData = {
        ...prev,
        soulShards: prev.soulShards - TRANSMUTE_SHARDS_COST,
        gems: (prev.gems ?? 100) + TRANSMUTE_GEMS_YIELD,
      };
      persistGuildSave(updated);
      engineRef.current?.updateSaveData(updated);
      return updated;
    });
    return true;
  }, []);

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
    if (networkManagerRef.current?.getRoom() && networkManagerRef.current.isHost()) {
      networkManagerRef.current.sendReturnPartyToGuild();
    }
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
    if (difficultyModalOpen || loadoutModalOpen || multiplayerModalOpen || settingsModalOpen) return;
    engineRef.current?.setJoystickInput(nx, ny);
  }, [difficultyModalOpen, loadoutModalOpen, multiplayerModalOpen, settingsModalOpen]);

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

  const handleSkillAimChange = useCallback((aim: ManualSkillAimInput | null) => {
    engineRef.current?.setSkillAimPreview(aim);
  }, []);

  const handleReleaseSkill = useCallback(
    (slot: SkillSlotKey, manualAim?: { angle: number; magnitude: number }) => {
      engineRef.current?.releaseManualSkill(slot, manualAim);
    },
    []
  );

  const activeLoadout =
    saveData.loadouts[saveData.selectedCharacter] ??
    CHARACTER_ROSTER[saveData.selectedCharacter].defaultLoadout;

  const handlePvpRematch = useCallback(() => {
    soundEngine.playUiClick(580);
    networkManagerRef.current?.sendRequestRematch();
  }, []);

  const handlePvpReturnToLobby = useCallback(() => {
    soundEngine.playUiClick(440);
    networkManagerRef.current?.sendReturnPartyToGuild();
  }, []);

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
          onOpenSettings={() => setSettingsModalOpen(true)}
          onStartGame={handleStartFromTitle}
          onOpenMultiplayer={() => setMultiplayerModalOpen(true)}
        />
      )}

      {/* Mobile Landscape HUD (Joystick + Radial Action Pad) */}
      {(hud.phase === GamePhase.GuildPicking ||
        hud.phase === GamePhase.GuildRoam ||
        hud.phase === GamePhase.Dungeon) &&
        !loadoutModalOpen &&
        !awakeningModalOpen &&
        !difficultyModalOpen &&
        !multiplayerModalOpen &&
        !settingsModalOpen && (
          <HudOverlay
            hud={hud}
            loadout={activeLoadout}
            totalSavedShards={saveData.soulShards}
            totalGems={saveData.gems ?? 100}
            selectedDifficulty={saveData.selectedDifficulty}
            muted={saveData.muted}
            joystickScale={saveData.joystickScale}
            skillButtonScale={saveData.skillButtonScale}
            isFullscreen={isFullscreen}
            onToggleMute={handleToggleMute}
            onToggleFullscreen={handleToggleFullscreen}
            onOpenSettings={() => setSettingsModalOpen(true)}
            onPause={handlePause}
            onOpenLoadout={handleOpenLoadout}
            onOpenAwakening={() => setAwakeningModalOpen(true)}
            onOpenMultiplayer={() => setMultiplayerModalOpen(true)}
            onSelectDifficulty={handleSelectDifficulty}
            onJoystickMove={handleJoystickMove}
            onMapPanJoystick={handleMapPanJoystick}
            onResetMapPan={handleResetMapPan}
            onAttackHeldChange={handleAttackHeldChange}
            onInteract={handleInteract}
            onTriggerSkill={handleTriggerSkill}
            onSkillAimChange={handleSkillAimChange}
            onReleaseSkill={handleReleaseSkill}
            onPvpRematch={handlePvpRematch}
            onPvpReturnToLobby={handlePvpReturnToLobby}
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

      {/* Hero Awakening Altar Modal */}
      {awakeningModalOpen && (
        <AwakeningModal
          isOpen={awakeningModalOpen}
          saveData={saveData}
          initialCharacterId={saveData.selectedCharacter}
          onClose={() => setAwakeningModalOpen(false)}
          onAttemptAwakening={handleAttemptAwakening}
          onTogglePath={handleToggleAwakenedPath}
          onTransmuteShards={handleTransmuteShards}
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
          pickedCount={hud.activeBlessings.length}
          maxBlessings={MAX_RUN_BLESSINGS}
          source={blessingSource}
          currentFloor={hud.floorNumber}
          currentStageFloor={
            hud.maxStages > 1 ? `${hud.currentStage}-${hud.stageFloor}` : `F${hud.stageFloor}`
          }
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
          activeBlessingIds={hud.activeBlessings}
          difficulty={saveData.selectedDifficulty}
          currentStage={hud.currentStage}
          maxStages={hud.maxStages}
          floorLabel={hud.floorLabel}
          onSelectDifficulty={handleSelectDifficulty}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onResume={handleResume}
          onReturnToGuild={handleReturnToGuild}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Settings & Controls Modal */}
      {settingsModalOpen && (
        <SettingsModal
          muted={saveData.muted}
          joystickScale={saveData.joystickScale}
          skillButtonScale={saveData.skillButtonScale}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setSettingsModalOpen(false)}
        />
      )}

      {/* Multiplayer Lobby & Party Management Modal */}
      {multiplayerModalOpen && networkManagerRef.current && (
        <MultiplayerLobbyModal
          networkManager={networkManagerRef.current}
          room={multiplayerRoom}
          selectedCharacter={saveData.selectedCharacter}
          selectedDifficulty={saveData.selectedDifficulty}
          onSelectCharacter={handleSelectCharacter}
          onSelectDifficulty={handleSelectDifficulty}
          onClose={() => setMultiplayerModalOpen(false)}
          onStartMultiplayerGame={() => {
            setMultiplayerModalOpen(false);
          }}
        />
      )}
    </main>
  );
}
