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
  CHARACTER_AWAKENING_IDENTITIES,
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
  const [channelResult, setChannelResult] = useState<{
    type: 'SUCCESS' | 'FAIL' | 'TRANSMUTE';
    text: string;
    subText?: string;
  } | null>(null);

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

  const handleAttempt = () => {
    if (isChanneling || !canAffordAttempt || isBothUnlocked) return;
    setIsChanneling(true);
    setChannelResult(null);
    soundEngine.playUiClick(740);

    // Channeling suspense timer (1.2 seconds of rune spinning)
    setTimeout(() => {
      const res = onAttemptAwakening(selectedChar, selectedUlt);
      setIsChanneling(false);
      if (res.success && res.pathUnlocked) {
        soundEngine.playVictory();
        const pathDef = res.pathUnlocked === 'PATH_A' ? pair?.pathA : pair?.pathB;
        setChannelResult({
          type: 'SUCCESS',
          text: `Celestial Awakening Succeeded!`,
          subText: `Unlocked: ${pathDef?.name ?? 'Awakened Form'} (${pathDef?.badge})`,
        });
      } else {
        soundEngine.playHit(false);
        setChannelResult({
          type: 'FAIL',
          text: res.message || 'The Celestial Runes Flickered...',
          subText: 'Resonance increased! Your next attempt has higher attunement.',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md select-none overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[96dvh] flex flex-col bg-[#14101A] border-2 border-[#6D28D9]/50 rounded-2xl shadow-2xl overflow-hidden text-[#F3EFE6]">
        {/* Ambient Top Glow Banner */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-[#C084FC] to-transparent animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#2D223B] bg-[#1A1424]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7E22CE] to-[#3B82F6] flex items-center justify-center text-xl shadow-lg ring-1 ring-white/30">
              💎
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display text-white tracking-wide">
                  Altar of Soul Awakening
                </h2>
                <span className="text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full bg-[#7E22CE]/40 text-[#E9D5FF] border border-[#A855F7]/40">
                  ULTIMATE TRANSCENDENCE
                </span>
              </div>
              <p className="text-xs text-[#A39BB5] truncate max-w-sm sm:max-w-md">
                Empower ultimate skills with two distinct playstyle transformations.
              </p>
            </div>
          </div>

          {/* Currencies & Close */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Gems pill */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C084FC]/40 bg-[#241738]"
              title="Awakening Gems (used for awakening attempts)"
            >
              <span className="text-sm">💎</span>
              <span className="text-sm font-bold font-mono-num text-[#E9D5FF]">
                {gems}
              </span>
              <span className="text-[10px] text-[#A39BB5] uppercase font-semibold">Gems</span>
            </div>

            {/* Shards pill */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#38BDF8]/30 bg-[#0C253B]"
              title="Soul Shards"
            >
              <span className="text-sm">🔮</span>
              <span className="text-sm font-bold font-mono-num text-[#BAE6FD]">
                {shards}
              </span>
            </div>

            {/* Transmute Button */}
            <button
              type="button"
              onClick={handleTransmute}
              disabled={!canTransmute}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                canTransmute
                  ? 'bg-[#312E81] border-[#6366F1]/50 text-[#C7D2FE] hover:bg-[#3730A3] active:scale-95'
                  : 'bg-[#1E1B2E] border-[#2D253B] text-[#6B7280] opacity-50 cursor-not-allowed'
              }`}
              title={`Exchange ${TRANSMUTE_SHARDS_COST} Soul Shards for +${TRANSMUTE_GEMS_YIELD} Awakening Gems`}
            >
              <span>Transmute</span>
              <span className="text-[10px] font-mono-num text-[#A5B4FC]">
                (50🔮→25💎)
              </span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(420);
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-[#271E36] hover:bg-[#362B4A] border border-[#3D2F54] flex items-center justify-center text-sm font-bold text-[#E2DCED] active:scale-90 transition-transform"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Character Selector Strip */}
        <div className="flex items-center gap-1.5 px-3 sm:px-6 py-2 bg-[#171221] border-b border-[#271E36] overflow-x-auto scrollbar-none">
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
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[#2E1B4D] border-[#A855F7] text-white shadow-md ring-1 ring-[#A855F7]/40 scale-[1.02]'
                    : 'bg-[#1C1628] border-transparent hover:bg-[#251D36] text-[#A39BB5]'
                }`}
              >
                <img
                  src={c.portraitUrl}
                  alt={c.name}
                  className="w-5 h-5 rounded-md object-cover ring-1 ring-white/20"
                />
                <span>{c.archetypeName}</span>
              </button>
            );
          })}
        </div>

        {/* Character Awakening Banner */}
        <div className="px-4 sm:px-6 py-2 bg-gradient-to-r from-[#201533] via-[#1A1229] to-[#201533] border-b border-[#2C203E] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#C084FC] font-bold">Awakening Identity:</span>
            <span className="text-white font-semibold">{charIdentity.theme}</span>
          </div>
          <span className="hidden md:inline text-[11px] text-[#A39BB5]">
            {charIdentity.identityLine}
          </span>
        </div>

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
          {/* Ultimate Selection Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#A39BB5] uppercase tracking-wider">
                Select Ultimate To Awaken
              </span>
              <span className="text-[11px] text-[#C084FC]">
                Currently Equipped in Dungeon:{' '}
                <strong className="text-white">
                  {ULTIMATE_SKILLS[equippedUlt]?.name}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {charDef.ultimateSkillIds.map((uId) => {
                const u = ULTIMATE_SKILLS[uId];
                const isSelected = selectedUlt === uId;
                const isEquipped = equippedUlt === uId;
                const uStatus = getAwakenedStatus(saveData, selectedChar, uId);
                const hasAwakened = uStatus.unlockedA || uStatus.unlockedB;

                return (
                  <button
                    key={uId}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(550);
                      setSelectedUlt(uId);
                      setChannelResult(null);
                    }}
                    className={`flex flex-col p-2.5 rounded-xl text-left border transition-all relative ${
                      isSelected
                        ? 'bg-[#291845] border-[#A855F7] shadow-lg ring-1 ring-[#A855F7]/40'
                        : 'bg-[#181324] border-[#2C233D] hover:bg-[#201930] text-[#A39BB5]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white truncate">
                        {u.name}
                      </span>
                      {isEquipped && (
                        <span className="text-[9px] font-mono-num font-bold px-1.5 py-0.5 rounded bg-[#10B981]/30 text-[#6EE7B7] border border-[#10B981]/40">
                          EQUIPPED
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#8C849E] mt-0.5 truncate">
                      {u.tag}
                    </span>

                    {/* Mini path indicator badges */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono-num font-bold ${
                          uStatus.unlockedA
                            ? uStatus.activePath === 'PATH_A'
                              ? 'bg-[#A855F7] text-white shadow'
                              : 'bg-[#A855F7]/30 text-[#D8B4FE] border border-[#A855F7]/40'
                            : 'bg-[#1F192E] text-[#6B7280]'
                        }`}
                      >
                        Path A {uStatus.unlockedA ? (uStatus.activePath === 'PATH_A' ? '★' : '✓') : '🔒'}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono-num font-bold ${
                          uStatus.unlockedB
                            ? uStatus.activePath === 'PATH_B'
                              ? 'bg-[#38BDF8] text-white shadow'
                              : 'bg-[#38BDF8]/30 text-[#BAE6FD] border border-[#38BDF8]/40'
                            : 'bg-[#1F192E] text-[#6B7280]'
                        }`}
                      >
                        Path B {uStatus.unlockedB ? (uStatus.activePath === 'PATH_B' ? '★' : '✓') : '🔒'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Awakening Action Banner & Pity Tracker */}
          <div className="p-3 sm:p-4 rounded-xl border border-[#6D28D9]/40 bg-gradient-to-br from-[#23143D] to-[#160E26] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                  isChanneling
                    ? 'animate-spin bg-[#7E22CE] ring-4 ring-[#C084FC]'
                    : isBothUnlocked
                    ? 'bg-[#059669] text-white'
                    : 'bg-[#2E1A4E] text-[#C084FC] ring-1 ring-[#A855F7]/40'
                }`}
              >
                {isChanneling ? '🌀' : isBothUnlocked ? '👑' : '✨'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {isBothUnlocked
                      ? 'Fully Awakened Ultimate!'
                      : 'Channel Celestial Awakening'}
                  </span>
                  <span className="text-[10px] font-mono-num font-bold px-2 py-0.5 rounded bg-[#7E22CE]/40 text-[#E9D5FF] border border-[#A855F7]/40">
                    22% Chance
                  </span>
                </div>
                <p className="text-xs text-[#A39BB5] mt-0.5">
                  {isBothUnlocked
                    ? 'Both paths unlocked! You can switch between Path A and Path B anytime below.'
                    : 'Each awakening attempt rolls for either Path A or Path B. Unlocking both gives full flexibility.'}
                </p>
                {/* Pity / Resonance Indicator */}
                {!isBothUnlocked && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-[#A5B4FC]">
                      Attunement Resonance:
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-2 rounded-sm ${
                            i <= (status.pityCount ?? 0)
                              ? 'bg-[#C084FC] shadow-sm shadow-[#C084FC]'
                              : 'bg-[#2D2142]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-[#A39BB5] font-mono-num">
                      ({status.pityCount ?? 0}/5 guaranteed)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isBothUnlocked ? (
                <button
                  type="button"
                  onClick={handleAttempt}
                  disabled={isChanneling || !canAffordAttempt}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all active:scale-95 ${
                    isChanneling
                      ? 'bg-[#4C1D95] text-[#C4B5FD] cursor-wait'
                      : canAffordAttempt
                      ? 'bg-gradient-to-r from-[#7E22CE] to-[#4F46E5] hover:from-[#9333EA] hover:to-[#6366F1] text-white shadow-purple-900/40 ring-1 ring-white/30'
                      : 'bg-[#251B38] text-[#6B7280] border border-[#392955] cursor-not-allowed'
                  }`}
                >
                  {isChanneling ? (
                    <>
                      <span className="animate-spin text-sm">🌀</span>
                      <span>Channeling...</span>
                    </>
                  ) : (
                    <>
                      <span>Awaken Ultimate</span>
                      <span className="px-2 py-0.5 rounded-md bg-black/30 font-mono-num text-xs text-[#FDE047]">
                        25 💎
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="px-4 py-2 rounded-xl bg-[#065F46]/60 border border-[#10B981]/50 text-xs font-bold text-[#A7F3D0]">
                  ✓ Mastered Both Paths
                </div>
              )}
            </div>
          </div>

          {/* Feedback banner if just attempted */}
          {channelResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex flex-col gap-0.5 animate-fadeIn ${
                channelResult.type === 'SUCCESS'
                  ? 'bg-[#064E3B]/70 border-[#10B981] text-[#A7F3D0]'
                  : channelResult.type === 'FAIL'
                  ? 'bg-[#450A0A]/70 border-[#EF4444] text-[#FECACA]'
                  : 'bg-[#1E1B4B]/70 border-[#6366F1] text-[#C7D2FE]'
              }`}
            >
              <span className="font-bold text-sm">{channelResult.text}</span>
              {channelResult.subText && (
                <span className="text-[11px] opacity-90">
                  {channelResult.subText}
                </span>
              )}
            </div>
          )}

          {/* Two Awakening Paths Side by Side */}
          {pair && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* PATH A */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  status.activePath === 'PATH_A'
                    ? 'bg-[#2A1847] border-[#C084FC] shadow-xl ring-2 ring-[#C084FC]/50'
                    : status.unlockedA
                    ? 'bg-[#1C162A] border-[#4C356E] hover:border-[#7E22CE]'
                    : 'bg-[#15101E] border-[#291F38] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-num font-bold px-2 py-0.5 rounded bg-[#C084FC]/20 text-[#E9D5FF] border border-[#C084FC]/30 uppercase tracking-wide">
                      PATH A · {pair.pathA.badge}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        status.activePath === 'PATH_A'
                          ? 'bg-[#10B981] text-white'
                          : status.unlockedA
                          ? 'bg-[#2D2142] text-[#A7F3D0]'
                          : 'bg-[#261C33] text-[#9CA3AF]'
                      }`}
                    >
                      {status.activePath === 'PATH_A'
                        ? '★ ACTIVE IN DUNGEON'
                        : status.unlockedA
                        ? '✓ UNLOCKED'
                        : '🔒 LOCKED'}
                    </span>
                  </div>

                  <h3
                    className="text-base font-bold font-display mt-2"
                    style={{ color: pair.pathA.color }}
                  >
                    {pair.pathA.name}
                  </h3>
                  <p className="text-xs text-[#DDD6FE] font-medium mt-0.5">
                    {pair.pathA.tagline}
                  </p>

                  <p className="text-xs text-[#A39BB5] mt-2 leading-relaxed">
                    {pair.pathA.description}
                  </p>

                  {/* Mechanics list */}
                  <div className="mt-3 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-[#A39BB5] uppercase tracking-wider">
                      Transformation Mechanics:
                    </span>
                    {pair.pathA.mechanics.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 text-xs text-[#E2DCED]"
                      >
                        <span className="text-[#C084FC] font-bold leading-none mt-0.5">
                          ✦
                        </span>
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Path A Toggle / Activate Button */}
                <div className="pt-2 border-t border-[#2D2142] flex items-center justify-between gap-2">
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
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                        status.activePath === 'PATH_A'
                          ? 'bg-[#3F2B63] hover:bg-[#4C3575] text-[#E9D5FF] border border-[#A855F7]/50'
                          : 'bg-gradient-to-r from-[#7E22CE] to-[#9333EA] text-white shadow-md'
                      }`}
                    >
                      {status.activePath === 'PATH_A'
                        ? 'Active in Run (Tap to Unequip)'
                        : 'Equip Path A'}
                    </button>
                  ) : (
                    <div className="w-full py-2 text-center text-xs font-semibold text-[#6B7280]">
                      Locked · Attempt awakening above to unlock
                    </div>
                  )}
                </div>
              </div>

              {/* PATH B */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  status.activePath === 'PATH_B'
                    ? 'bg-[#152B3E] border-[#38BDF8] shadow-xl ring-2 ring-[#38BDF8]/50'
                    : status.unlockedB
                    ? 'bg-[#14202E] border-[#234563] hover:border-[#0284C7]'
                    : 'bg-[#15101E] border-[#291F38] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-num font-bold px-2 py-0.5 rounded bg-[#38BDF8]/20 text-[#BAE6FD] border border-[#38BDF8]/30 uppercase tracking-wide">
                      PATH B · {pair.pathB.badge}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        status.activePath === 'PATH_B'
                          ? 'bg-[#10B981] text-white'
                          : status.unlockedB
                          ? 'bg-[#1E2D3D] text-[#A7F3D0]'
                          : 'bg-[#261C33] text-[#9CA3AF]'
                      }`}
                    >
                      {status.activePath === 'PATH_B'
                        ? '★ ACTIVE IN DUNGEON'
                        : status.unlockedB
                        ? '✓ UNLOCKED'
                        : '🔒 LOCKED'}
                    </span>
                  </div>

                  <h3
                    className="text-base font-bold font-display mt-2"
                    style={{ color: pair.pathB.color }}
                  >
                    {pair.pathB.name}
                  </h3>
                  <p className="text-xs text-[#BAE6FD] font-medium mt-0.5">
                    {pair.pathB.tagline}
                  </p>

                  <p className="text-xs text-[#A39BB5] mt-2 leading-relaxed">
                    {pair.pathB.description}
                  </p>

                  {/* Mechanics list */}
                  <div className="mt-3 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-[#A39BB5] uppercase tracking-wider">
                      Transformation Mechanics:
                    </span>
                    {pair.pathB.mechanics.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 text-xs text-[#E2DCED]"
                      >
                        <span className="text-[#38BDF8] font-bold leading-none mt-0.5">
                          ✦
                        </span>
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Path B Toggle / Activate Button */}
                <div className="pt-2 border-t border-[#1C2C3D] flex items-center justify-between gap-2">
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
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                        status.activePath === 'PATH_B'
                          ? 'bg-[#1A3A54] hover:bg-[#20496B] text-[#BAE6FD] border border-[#38BDF8]/50'
                          : 'bg-gradient-to-r from-[#0284C7] to-[#2563EB] text-white shadow-md'
                      }`}
                    >
                      {status.activePath === 'PATH_B'
                        ? 'Active in Run (Tap to Unequip)'
                        : 'Equip Path B'}
                    </button>
                  ) : (
                    <div className="w-full py-2 text-center text-xs font-semibold text-[#6B7280]">
                      Locked · Attempt awakening above to unlock
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#2D223B] bg-[#171221] flex items-center justify-between text-xs text-[#A39BB5]">
          <div className="flex items-center gap-1.5">
            <span>⚔️ Mutually Exclusive:</span>
            <span className="text-white">Only one awakened path can be active per ultimate.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(440);
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-[#2E2440] hover:bg-[#3D3054] text-white font-bold transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
