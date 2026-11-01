/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  AWAKENING_BASE_SUCCESS_CHANCE,
  AWAKENING_COST_GEMS,
  AWAKENING_PATHS,
  AwakenedFormKey,
  CHARACTER_AWAKENING_IDENTITIES,
  getAwakenedFormKey,
  getAwakenedStatus,
  TRANSMUTE_GEMS_YIELD,
  TRANSMUTE_SHARDS_COST,
} from '../data/awakeningData';
import { CHARACTER_ROSTER, ULTIMATE_SKILLS } from '../data/zombieData';
import {
  AwakenedPathKey,
  CharacterId,
  GuildSaveData,
  UltimateSkillId,
} from '../types/game';
import { AwakenedUltimatePreview } from './AwakenedUltimatePreview';
import { LobbyHeroCanvas } from './LobbyHeroCanvas';

export interface AwakeningModalProps {
  isOpen: boolean;
  saveData: GuildSaveData;
  initialCharacterId?: CharacterId;
  onClose: () => void;
  onAttemptAwakening: (
    charId: CharacterId,
    ultId: UltimateSkillId
  ) => { success: boolean; pathUnlocked?: 'PATH_A' | 'PATH_B'; message: string };
  onTogglePath: (
    charId: CharacterId,
    ultId: UltimateSkillId,
    path: AwakenedPathKey
  ) => void;
  onTransmuteShards: () => boolean;
}

export const AwakeningModal: React.FC<AwakeningModalProps> = ({
  isOpen,
  saveData,
  initialCharacterId = CharacterId.Zombie,
  onClose,
  onAttemptAwakening,
  onTogglePath,
  onTransmuteShards,
}) => {
  const [selectedChar, setSelectedChar] = useState<CharacterId>(initialCharacterId);
  const equippedUlt =
    saveData.loadouts[selectedChar]?.ultimateSkill ??
    CHARACTER_ROSTER[selectedChar].defaultLoadout.ultimateSkill;
  const [selectedUlt, setSelectedUlt] = useState<UltimateSkillId>(equippedUlt);

  const [isChanneling, setIsChanneling] = useState(false);
  const [channelAnimState, setChannelAnimState] = useState<'IDLE' | 'CHANNELING' | 'SUCCESS' | 'FAIL'>('IDLE');
  const [channelResult, setChannelResult] = useState<{
    type: 'SUCCESS' | 'FAIL' | 'TRANSMUTE';
    text: string;
    subText?: string;
  } | null>(null);

  // Active preview tab for awakened ultimate (set automatically on success or manually clicked)
  const [previewPath, setPreviewPath] = useState<'PATH_A' | 'PATH_B' | null>(null);

  if (!isOpen) return null;

  const charDef = CHARACTER_ROSTER[selectedChar];
  const charIdentity = CHARACTER_AWAKENING_IDENTITIES[selectedChar];
  const ultDef = ULTIMATE_SKILLS[selectedUlt];
  const pair = AWAKENING_PATHS[selectedChar]?.[selectedUlt];
  const status = getAwakenedStatus(saveData, selectedChar, selectedUlt);

  const gems = saveData.gems ?? 100;
  const shards = saveData.soulShards ?? 0;
  const canAffordAttempt = gems >= AWAKENING_COST_GEMS;
  const canTransmute = shards >= TRANSMUTE_SHARDS_COST;
  const isBothUnlocked = status.unlockedA && status.unlockedB;
  const pityCount = status.pityCount ?? 0;
  const pityBonusPct = Math.min(80, pityCount * 16);
  const totalChancePct = Math.min(100, Math.round((AWAKENING_BASE_SUCCESS_CHANCE * 100) + pityBonusPct));

  // Compute active awakened form for pedestal display
  const activePathToDisplay =
    previewPath ??
    (status.activePath !== 'NONE'
      ? status.activePath
      : status.unlockedA
      ? 'PATH_A'
      : status.unlockedB
      ? 'PATH_B'
      : null);
  const activeAwakenedForm: AwakenedFormKey = activePathToDisplay
    ? getAwakenedFormKey(selectedChar, selectedUlt, activePathToDisplay)
    : 'NONE';

  const handleAttempt = () => {
    if (isChanneling || !canAffordAttempt || isBothUnlocked) return;
    setIsChanneling(true);
    setChannelAnimState('CHANNELING');
    setChannelResult(null);
    soundEngine.playUiClick(740);

    // Channeling suspense timer (1.2 seconds of cosmic vortex)
    setTimeout(() => {
      const res = onAttemptAwakening(selectedChar, selectedUlt);
      setIsChanneling(false);

      if (res.success && res.pathUnlocked) {
        soundEngine.playVictory();
        setChannelAnimState('SUCCESS');
        const pathDef = res.pathUnlocked === 'PATH_A' ? pair?.pathA : pair?.pathB;
        setChannelResult({
          type: 'SUCCESS',
          text: `Awakening Succeeded!`,
          subText: `Unlocked: ${pathDef?.name ?? 'Awakened Form'} (${pathDef?.badge})`,
        });

        // Automatically show the Awakened Ultimate Preview on successful awakening!
        setPreviewPath(res.pathUnlocked);
      } else {
        soundEngine.playHit(false);
        setChannelAnimState('FAIL');
        setChannelResult({
          type: 'FAIL',
          text: res.message || 'Resonance Dissipated...',
          subText: 'Attunement increased! Next attempt has higher success chance.',
        });
      }
    }, 1200);
  };

  const handleTransmute = () => {
    if (!canTransmute) return;
    const ok = onTransmuteShards();
    if (ok) {
      soundEngine.playPickup();
      setChannelResult({
        type: 'TRANSMUTE',
        text: `Transmuted ${TRANSMUTE_SHARDS_COST} Soul Shards into +${TRANSMUTE_GEMS_YIELD} Awakening Gems!`,
      });
    }
  };

  const handleClose = () => {
    soundEngine.playUiClick(420);
    onClose();
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-50 flex items-center justify-center p-1 sm:p-2 bg-black/85 backdrop-blur-md select-none overflow-hidden animate-fadeIn"
    >
      <div
        role="dialog"
        aria-label="Altar of Soul Awakening"
        className="relative w-full max-w-5xl h-full max-h-[98%] flex flex-col bg-[#140E1E] border-2 border-[#7C3AED]/50 rounded-2xl shadow-2xl overflow-hidden text-[#F3EFE6]"
      >
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C084FC] to-transparent animate-pulse" />

        {/* 1. Header Bar: Prominent Back Button, Title, Currencies */}
        <div className="flex items-center justify-between px-2.5 sm:px-3.5 py-1.5 border-b border-[#2C1F3F] bg-[#191125] shrink-0 gap-2">
          {/* Prominent Back Button (Guaranteed visible and thumb-friendly on all cellphone screens) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] border border-[#A855F7]/40 text-xs font-bold text-white shadow-md transition-all active:scale-95 shrink-0"
              title="Return to Guild Hall"
            >
              <span className="text-sm font-black leading-none">←</span>
              <span>Back</span>
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-xs sm:text-sm font-bold font-display text-white tracking-wide truncate">
                Altar of Soul Awakening
              </h2>
              <span className="hidden sm:inline text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-[#7E22CE]/40 text-[#E9D5FF] border border-[#A855F7]/30">
                TRANSCENDENCE
              </span>
            </div>
          </div>

          {/* Currencies, Transmute & Close Icon */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Gems */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#C084FC]/40 bg-[#25173A]"
              title="Awakening Gems"
            >
              <span className="text-xs">💎</span>
              <span className="text-xs font-bold font-mono-num text-[#E9D5FF]">
                {gems}
              </span>
            </div>

            {/* Shards */}
            <div
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#38BDF8]/30 bg-[#0C2236]"
              title="Soul Shards"
            >
              <span className="text-xs">🔮</span>
              <span className="text-xs font-bold font-mono-num text-[#BAE6FD]">
                {shards}
              </span>
            </div>

            {/* Transmute */}
            <button
              type="button"
              onClick={handleTransmute}
              disabled={!canTransmute}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                canTransmute
                  ? 'bg-[#312E81] border-[#6366F1]/50 text-[#C7D2FE] hover:bg-[#3730A3] active:scale-95'
                  : 'bg-[#1C172B] border-[#2B213B] text-[#5A5469] opacity-40 cursor-not-allowed'
              }`}
              title={`Exchange ${TRANSMUTE_SHARDS_COST} Soul Shards for +${TRANSMUTE_GEMS_YIELD} Awakening Gems`}
            >
              <span>Transmute</span>
              <span className="hidden sm:inline text-[9px] font-mono-num text-[#A5B4FC]">
                (50🔮→25💎)
              </span>
            </button>

            {/* Top-Right Secondary Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#251A38] hover:bg-[#35254E] border border-[#3E2C58] flex items-center justify-center text-xs font-bold text-[#E2DCED] active:scale-90 transition-transform"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Main Body: Divided exactly in half (50% Left / 50% Right in Landscape) */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          {/* ========================================================================= */}
          {/* LEFT HALF (50%): LOBBY WALKING CHARACTER SPRITE & AWAKENING ALTAR BUTTON */}
          {/* ========================================================================= */}
          <div className="w-1/2 flex flex-col justify-between border-r border-[#2C1F3F] bg-gradient-to-b from-[#181126] to-[#100A19] p-2 sm:p-2.5 overflow-y-auto min-h-0">
            {/* Character Selector Pill Strip */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0F0A18] border border-[#2B1D3D] overflow-x-auto scrollbar-none shrink-0 mb-1">
              {Object.values(CHARACTER_ROSTER).map((c) => {
                const isSelected = selectedChar === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(500);
                      setSelectedChar(c.id);
                      const newEquipped =
                        saveData.loadouts[c.id]?.ultimateSkill ??
                        c.defaultLoadout.ultimateSkill;
                      setSelectedUlt(newEquipped);
                      setChannelResult(null);
                      setChannelAnimState('IDLE');
                      setPreviewPath(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-0.5 px-1 rounded-md text-[9px] sm:text-[10px] font-bold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-[#2E1B4D] border-[#A855F7] text-white shadow ring-1 ring-[#A855F7]/40 scale-[1.02]'
                        : 'bg-transparent border-transparent text-[#9E95B0] hover:bg-[#201633]'
                    }`}
                  >
                    <span className="truncate">{c.archetypeName}</span>
                  </button>
                );
              })}
            </div>

            {/* Center: Live Walking Character from Lobby (not the image) */}
            <div className="flex flex-col items-center justify-center my-auto">
              {/* Character Identity Theme Pill */}
              <div className="w-full text-center px-2 py-0.5 rounded-md bg-[#211535] border border-[#362352] text-[9px] sm:text-[10px] text-[#C084FC] font-semibold truncate mb-0.5">
                ✦ {charIdentity.theme}
              </div>

              {/* Lobby Hero Canvas: The actual character walking/breathing as in the lobby */}
              <div
                className={`relative w-full max-w-[190px] rounded-2xl flex items-center justify-center transition-all ${
                  channelAnimState === 'CHANNELING'
                    ? 'ring-2 ring-[#C084FC] scale-105'
                    : channelAnimState === 'SUCCESS'
                    ? 'ring-2 ring-[#FBBF24] shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-celestialStarburst'
                    : channelAnimState === 'FAIL'
                    ? 'ring-2 ring-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-awakeningShake'
                    : ''
                }`}
              >
                <LobbyHeroCanvas
                  characterId={selectedChar}
                  channelState={channelAnimState}
                  awakenedForm={activeAwakenedForm}
                />

                {/* Overlaid status icon */}
                {channelAnimState === 'CHANNELING' && (
                  <div className="absolute top-1.5 left-2 px-1.5 py-0.2 rounded bg-black/60 backdrop-blur-sm text-[8px] sm:text-[9px] font-mono-num font-bold text-[#FDE047] border border-yellow-500/30 flex items-center gap-1">
                    <span className="animate-spin text-[9px]">🌀</span>
                    <span>CHANNELING</span>
                  </div>
                )}
                {channelAnimState === 'SUCCESS' && (
                  <div className="absolute top-1.5 right-2 px-1.5 py-0.2 rounded bg-green-950/80 border border-green-500/40 text-[8px] sm:text-[9px] font-mono-num font-bold text-[#A7F3D0] animate-bounce">
                    👑 ASCENDED!
                  </div>
                )}
                {channelAnimState === 'FAIL' && (
                  <div className="absolute top-1.5 right-2 px-1.5 py-0.2 rounded bg-red-950/80 border border-red-500/40 text-[8px] sm:text-[9px] font-mono-num font-bold text-[#FECACA]">
                    💔 FRACTURED
                  </div>
                )}
              </div>

              {/* Character Name & Archetype */}
              <div className="text-center mt-0.5">
                <span className="text-xs sm:text-sm font-bold font-display text-white">
                  {charDef.name}
                </span>
                <span className="text-[10px] text-[#A39BB5] ml-1">
                  ({charDef.archetypeName})
                </span>
              </div>
            </div>

            {/* Bottom: Awakening Altar Controls & Awaken Button */}
            <div className="mt-1 p-1.5 sm:p-2 rounded-xl border border-[#3E2B58] bg-[#160E24] flex flex-col gap-1 shrink-0">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                <span className="font-bold text-[#E2DCED]">
                  Attunement Resonance
                </span>
                <span className="font-mono-num font-bold text-[#C084FC]">
                  {pityCount >= 5 ? 'Guaranteed Next!' : `${totalChancePct}% Chance`}
                </span>
              </div>

              {/* 5 Pity Crystal Pips Gauge */}
              <div className="flex items-center justify-between gap-1 py-0.5 px-1 rounded-lg bg-[#0E0916] border border-[#2B1D3D]">
                {[1, 2, 3, 4, 5].map((pip) => {
                  const filled = pip <= pityCount;
                  return (
                    <div
                      key={pip}
                      className={`flex-1 h-2 rounded flex items-center justify-center text-[8px] transition-all ${
                        filled
                          ? 'bg-gradient-to-t from-[#7E22CE] to-[#C084FC] shadow-[0_0_8px_rgba(192,132,252,0.6)] text-white'
                          : 'bg-[#1A1327] text-[#4A405A]'
                      }`}
                    >
                      {filled ? '💎' : '·'}
                    </div>
                  );
                })}
              </div>

              {/* The Awakening Button */}
              {!isBothUnlocked ? (
                <button
                  type="button"
                  onClick={handleAttempt}
                  disabled={isChanneling || !canAffordAttempt}
                  className={`w-full py-1.5 px-2 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                    isChanneling
                      ? 'bg-[#4C1D95] text-[#C4B5FD] cursor-wait'
                      : canAffordAttempt
                      ? 'bg-gradient-to-r from-[#7E22CE] to-[#4F46E5] hover:from-[#9333EA] hover:to-[#6366F1] text-white shadow-purple-950/40 ring-1 ring-white/20'
                      : 'bg-[#221735] text-[#635B74] border border-[#332549] cursor-not-allowed'
                  }`}
                >
                  {isChanneling ? (
                    <>
                      <span className="animate-spin text-xs">🌀</span>
                      <span>Channeling Runes...</span>
                    </>
                  ) : (
                    <>
                      <span>Awaken Ultimate</span>
                      <span className="px-1.5 py-0.2 rounded bg-black/40 font-mono-num text-[9px] text-[#FDE047]">
                        25 💎
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full py-1 text-center rounded-xl bg-[#065F46]/50 border border-[#10B981]/50 text-[10px] font-bold text-[#6EE7B7]">
                  ✓ Mastered Both Paths
                </div>
              )}

              {/* Feedback Banner */}
              {channelResult && (
                <div
                  className={`p-1 rounded-lg border text-[9px] leading-tight flex flex-col gap-0.5 ${
                    channelResult.type === 'SUCCESS'
                      ? 'bg-[#064E3B]/80 border-[#10B981] text-[#A7F3D0] animate-fadeIn'
                      : channelResult.type === 'FAIL'
                      ? 'bg-[#450A0A]/80 border-[#EF4444] text-[#FECACA] animate-awakeningShake'
                      : 'bg-[#1E1B4B]/80 border-[#6366F1] text-[#C7D2FE]'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold text-[10px]">
                    <span>{channelResult.type === 'SUCCESS' ? '🌟' : channelResult.type === 'FAIL' ? '⚠️' : '🔮'}</span>
                    <span>{channelResult.text}</span>
                  </div>
                  {channelResult.subText && (
                    <span className="opacity-85 text-[8.5px]">{channelResult.subText}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT HALF (50%): COMPLETE DESCRIPTIONS OF THE ULTIMATE & AWAKENED PATHS  */}
          {/* ========================================================================= */}
          <div className="w-1/2 flex flex-col bg-[#110B1B] p-2 sm:p-2.5 overflow-y-auto min-h-0">
            {/* Top: 3 Ultimate Selector Tabs */}
            <div className="flex items-center justify-between mb-1 shrink-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-[#A39BB5] uppercase tracking-wider">
                Select Ultimate:
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#C084FC]">
                Equipped:{' '}
                <strong className="text-white">
                  {ULTIMATE_SKILLS[equippedUlt]?.name}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 mb-1.5 shrink-0">
              {charDef.ultimateSkillIds.map((uId) => {
                const u = ULTIMATE_SKILLS[uId];
                const isSelected = selectedUlt === uId;
                const isEquipped = equippedUlt === uId;
                const uStatus = getAwakenedStatus(saveData, selectedChar, uId);

                return (
                  <button
                    key={uId}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(550);
                      setSelectedUlt(uId);
                      setChannelResult(null);
                      setChannelAnimState('IDLE');
                      setPreviewPath(null);
                    }}
                    className={`flex flex-col p-1 rounded-xl text-left border transition-all relative ${
                      isSelected
                        ? 'bg-[#281745] border-[#A855F7] shadow ring-1 ring-[#A855F7]/40 scale-[1.01]'
                        : 'bg-[#171123] border-[#2C1F3F] hover:bg-[#201830] text-[#A39BB5]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] sm:text-[11px] font-bold text-white truncate">
                        {u.name}
                      </span>
                      {isEquipped && (
                        <span className="text-[7px] font-mono-num font-bold px-1 rounded bg-[#10B981]/30 text-[#6EE7B7] border border-[#10B981]/40 shrink-0">
                          RUN
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className={`text-[8px] px-1 py-0.2 rounded font-mono-num font-bold ${
                          uStatus.unlockedA
                            ? uStatus.activePath === 'PATH_A'
                              ? 'bg-[#A855F7] text-white shadow-sm'
                              : 'bg-[#A855F7]/30 text-[#D8B4FE]'
                            : 'bg-[#221833] text-[#554C63]'
                        }`}
                      >
                        A {uStatus.unlockedA ? (uStatus.activePath === 'PATH_A' ? '★' : '✓') : '🔒'}
                      </span>
                      <span
                        className={`text-[8px] px-1 py-0.2 rounded font-mono-num font-bold ${
                          uStatus.unlockedB
                            ? uStatus.activePath === 'PATH_B'
                              ? 'bg-[#38BDF8] text-white shadow-sm'
                              : 'bg-[#38BDF8]/30 text-[#BAE6FD]'
                            : 'bg-[#221833] text-[#554C63]'
                        }`}
                      >
                        B {uStatus.unlockedB ? (uStatus.activePath === 'PATH_B' ? '★' : '✓') : '🔒'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* If in Preview Mode: Show Live Canvas Preview */}
            {previewPath && pair ? (
              <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
                <AwakenedUltimatePreview
                  characterId={selectedChar}
                  ultimateId={selectedUlt}
                  pathKey={previewPath}
                  onClose={() => setPreviewPath(null)}
                  isEquipped={status.activePath === previewPath}
                  onEquip={() => {
                    soundEngine.playUiClick(600);
                    onTogglePath(
                      selectedChar,
                      selectedUlt,
                      status.activePath === previewPath ? 'NONE' : previewPath
                    );
                  }}
                />
              </div>
            ) : pair ? (
              /* Ultimate Descriptions & Path A / Path B Details (Scrollable & Clear) */
              <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-y-auto pr-0.5">
                {/* Base Ultimate Card Description */}
                <div className="p-1.5 rounded-xl bg-[#171022] border border-[#2D1F42] shrink-0">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white font-display">
                      {ultDef.name}
                    </span>
                    <span className="text-[9px] font-mono-num text-[#A39BB5]">
                      Cooldown: {ultDef.cooldown}s · {ultDef.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#C4BED4] mt-0.5 leading-snug">
                    {ultDef.description}
                  </p>
                </div>

                {/* PATH A DESCRIPTION */}
                <div
                  className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    status.activePath === 'PATH_A'
                      ? 'bg-[#271642] border-[#C084FC] shadow-lg ring-1 ring-[#C084FC]/40'
                      : status.unlockedA
                      ? 'bg-[#1A1328] border-[#442F63] hover:border-[#7E22CE]'
                      : 'bg-[#150F22] border-[#291E3B]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[8.5px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-[#C084FC]/20 text-[#E9D5FF] border border-[#C084FC]/30 uppercase tracking-wide">
                        PATH A · {pair.pathA.badge}
                      </span>
                      <span
                        className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded ${
                          status.activePath === 'PATH_A'
                            ? 'bg-[#10B981] text-white shadow-sm'
                            : status.unlockedA
                            ? 'bg-[#2E1E45] text-[#A7F3D0]'
                            : 'bg-[#221833] text-[#716880]'
                        }`}
                      >
                        {status.activePath === 'PATH_A'
                          ? '★ ACTIVE IN RUN'
                          : status.unlockedA
                          ? '✓ UNLOCKED'
                          : '🔒 LOCKED'}
                      </span>
                    </div>

                    <h4
                      className="text-xs sm:text-sm font-bold font-display"
                      style={{ color: pair.pathA.color }}
                    >
                      {pair.pathA.name}
                    </h4>
                    <p className="text-[10px] text-[#DDD6FE] font-medium leading-tight mt-0.5">
                      {pair.pathA.tagline}
                    </p>
                    <p className="text-[9.5px] sm:text-[10px] text-[#A39BB5] mt-1 leading-snug">
                      {pair.pathA.description}
                    </p>

                    {/* Full Mechanics list */}
                    <div className="mt-1 flex flex-col gap-0.5">
                      {pair.pathA.mechanics.map((m, idx) => (
                        <div key={idx} className="flex items-start gap-1 text-[9px] sm:text-[9.5px] text-[#E2DCED]">
                          <span className="text-[#C084FC] font-bold leading-none mt-0.5">✦</span>
                          <span className="leading-tight">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions for Path A */}
                  <div className="mt-1.5 pt-1 border-t border-[#2B1D3E] flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(500);
                        setPreviewPath('PATH_A');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[#271A3B] hover:bg-[#382654] border border-[#483369] text-[9.5px] font-bold text-[#E9D5FF] flex items-center gap-1 transition-colors"
                      title="Preview Awakened Ultimate Animation"
                    >
                      <span>👁️</span>
                      <span>Preview</span>
                    </button>

                    {status.unlockedA ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick(600);
                          onTogglePath(
                            selectedChar,
                            selectedUlt,
                            status.activePath === 'PATH_A' ? 'NONE' : 'PATH_A'
                          );
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 ${
                          status.activePath === 'PATH_A'
                            ? 'bg-[#3A245C] hover:bg-[#482D73] text-[#E9D5FF] border border-[#A855F7]/50'
                            : 'bg-gradient-to-r from-[#7E22CE] to-[#9333EA] text-white shadow-md'
                        }`}
                      >
                        {status.activePath === 'PATH_A'
                          ? 'Active in Run (Unequip)'
                          : 'Equip Path A'}
                      </button>
                    ) : (
                      <div className="flex-1 py-0.5 text-center text-[9px] font-semibold text-[#665D74]">
                        Locked · Awaken at Altar on Left
                      </div>
                    )}
                  </div>
                </div>

                {/* PATH B DESCRIPTION */}
                <div
                  className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    status.activePath === 'PATH_B'
                      ? 'bg-[#132537] border-[#38BDF8] shadow-lg ring-1 ring-[#38BDF8]/40'
                      : status.unlockedB
                      ? 'bg-[#121C28] border-[#223E59] hover:border-[#0284C7]'
                      : 'bg-[#150F22] border-[#291E3B]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[8.5px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-[#38BDF8]/20 text-[#BAE6FD] border border-[#38BDF8]/30 uppercase tracking-wide">
                        PATH B · {pair.pathB.badge}
                      </span>
                      <span
                        className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded ${
                          status.activePath === 'PATH_B'
                            ? 'bg-[#10B981] text-white shadow-sm'
                            : status.unlockedB
                            ? 'bg-[#182736] text-[#A7F3D0]'
                            : 'bg-[#221833] text-[#716880]'
                        }`}
                      >
                        {status.activePath === 'PATH_B'
                          ? '★ ACTIVE IN RUN'
                          : status.unlockedB
                          ? '✓ UNLOCKED'
                          : '🔒 LOCKED'}
                      </span>
                    </div>

                    <h4
                      className="text-xs sm:text-sm font-bold font-display"
                      style={{ color: pair.pathB.color }}
                    >
                      {pair.pathB.name}
                    </h4>
                    <p className="text-[10px] text-[#BAE6FD] font-medium leading-tight mt-0.5">
                      {pair.pathB.tagline}
                    </p>
                    <p className="text-[9.5px] sm:text-[10px] text-[#A39BB5] mt-1 leading-snug">
                      {pair.pathB.description}
                    </p>

                    {/* Full Mechanics list */}
                    <div className="mt-1 flex flex-col gap-0.5">
                      {pair.pathB.mechanics.map((m, idx) => (
                        <div key={idx} className="flex items-start gap-1 text-[9px] sm:text-[9.5px] text-[#E2DCED]">
                          <span className="text-[#38BDF8] font-bold leading-none mt-0.5">✦</span>
                          <span className="leading-tight">{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions for Path B */}
                  <div className="mt-1.5 pt-1 border-t border-[#1C2C3D] flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(500);
                        setPreviewPath('PATH_B');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[#182B3D] hover:bg-[#233E57] border border-[#2B4B69] text-[9.5px] font-bold text-[#BAE6FD] flex items-center gap-1 transition-colors"
                      title="Preview Awakened Ultimate Animation"
                    >
                      <span>👁️</span>
                      <span>Preview</span>
                    </button>

                    {status.unlockedB ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick(600);
                          onTogglePath(
                            selectedChar,
                            selectedUlt,
                            status.activePath === 'PATH_B' ? 'NONE' : 'PATH_B'
                          );
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 ${
                          status.activePath === 'PATH_B'
                            ? 'bg-[#183954] hover:bg-[#20496B] text-[#BAE6FD] border border-[#38BDF8]/50'
                            : 'bg-gradient-to-r from-[#0284C7] to-[#2563EB] text-white shadow-md'
                        }`}
                      >
                        {status.activePath === 'PATH_B'
                          ? 'Active in Run (Unequip)'
                          : 'Equip Path B'}
                      </button>
                    ) : (
                      <div className="flex-1 py-0.5 text-center text-[9px] font-semibold text-[#665D74]">
                        Locked · Awaken at Altar on Left
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Bottom Footer for Right Half */}
            <div className="mt-1 pt-1 border-t border-[#261B35] flex items-center justify-between text-[9px] text-[#8C849E] shrink-0">
              <span className="truncate">
                ⚔️ One awakened path active per ultimate.
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-2.5 py-0.5 rounded-lg bg-[#271E36] hover:bg-[#362B4A] text-white font-bold text-[10px] transition-all active:scale-95 shrink-0"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
