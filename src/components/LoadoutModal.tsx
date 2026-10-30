import React, { useState } from 'react';
import { Check, Sparkles, Star, Swords, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  CHARACTER_LIST,
  CHARACTER_ROSTER,
  computeCharacterStarRank,
  EMPTY_UPGRADE_RANKS,
  getNormalSkillsForCharacter,
  getUltimateSkillsForCharacter,
  getUpgradeCost,
  getUpgradePathForCharacter,
  NORMAL_SKILLS,
  ULTIMATE_SKILLS,
} from '../data/zombieData';
import {
  CharacterId,
  EquippedLoadout,
  GuildSaveData,
  NormalSkillId,
  UltimateSkillId,
  UpgradeNodeSlot,
} from '../types/game';
import { ScrollablePane } from './ScrollablePane';
import {
  NormalSkillIcon,
  PassiveSkillIcon,
  SoulShardIcon,
  UltimateSkillIcon,
} from './SkillIcons';

interface LoadoutModalProps {
  saveData: GuildSaveData;
  isPickingCharacter: boolean;
  onSelectCharacter: (charId: CharacterId) => void;
  onUpdateLoadout: (charId: CharacterId, loadout: EquippedLoadout) => void;
  onPurchaseUpgrade: (charId: CharacterId, slot: UpgradeNodeSlot, cost: number) => void;
  onConfirmAndRoam: () => void;
}

export const LoadoutModal: React.FC<LoadoutModalProps> = ({
  saveData,
  isPickingCharacter,
  onSelectCharacter,
  onUpdateLoadout,
  onPurchaseUpgrade,
  onConfirmAndRoam,
}) => {
  const [activeTab, setActiveTab] = useState<'SKILLS' | 'UPGRADES'>('SKILLS');
  const [targetNormalSlot, setTargetNormalSlot] = useState<0 | 1>(0);
  const [failedPortraits, setFailedPortraits] = useState<Record<string, boolean>>({});
  const openedAtRef = React.useRef<number>(performance.now());

  const activeCharId = saveData.selectedCharacter;
  const profile = CHARACTER_ROSTER[activeCharId];
  const isSkeleton = activeCharId === CharacterId.Skeleton;
  const isGoblin = activeCharId === CharacterId.Goblin;
  const isGnome = activeCharId === CharacterId.Gnome;
  const accentTextClass = isSkeleton
    ? 'text-[#7DD3FC]'
    : isGoblin
    ? 'text-[#FDE68A]'
    : isGnome
    ? 'text-[#FDBA74]'
    : 'text-[#86EFAC]';
  const accentBrightTextClass = isSkeleton
    ? 'text-[#38BDF8]'
    : isGoblin
    ? 'text-[#FBBF24]'
    : isGnome
    ? 'text-[#FB923C]'
    : 'text-[#4ADE80]';
  const primaryBtnClass = isSkeleton
    ? 'bg-[#38BDF8] text-[#0B1724]'
    : isGoblin
    ? 'bg-[#F59E0B] text-[#170F04]'
    : isGnome
    ? 'bg-[#FB923C] text-[#1C0F06]'
    : 'bg-[#4ADE80] text-[#0E1912]';
  const equippedCardClass = isSkeleton
    ? 'bg-[#192536] border-[#38BDF8]'
    : isGoblin
    ? 'bg-[#2A2015] border-[#F59E0B]'
    : isGnome
    ? 'bg-[#2B1D17] border-[#FB923C]'
    : 'bg-[#1D2824] border-[#4ADE80]';

  const characterLoadout = saveData.loadouts[activeCharId] ?? profile.defaultLoadout;
  const { normalSkills, ultimateSkill } = characterLoadout;
  const normalSkillList = getNormalSkillsForCharacter(activeCharId);
  const ultimateSkillList = getUltimateSkillsForCharacter(activeCharId);
  const charRanks = saveData.characterUpgrades[activeCharId] ?? EMPTY_UPGRADE_RANKS;
  const upgradePath = getUpgradePathForCharacter(activeCharId);
  const starRank = computeCharacterStarRank(charRanks);

  const handleSafeConfirm = () => {
    if (performance.now() - openedAtRef.current < 260) return;
    soundEngine.playUiClick(620);
    onConfirmAndRoam();
  };

  const handleSwitchCharacter = (charId: CharacterId) => {
    if (charId === activeCharId) return;
    soundEngine.playUiClick(600);
    setTargetNormalSlot(0);
    onSelectCharacter(charId);
  };

  const handlePickNormalSkill = (skillId: NormalSkillId) => {
    soundEngine.playUiClick(560);
    const existingIndex = normalSkills.indexOf(skillId);
    if (existingIndex === targetNormalSlot) return;

    const nextNormals: [NormalSkillId, NormalSkillId] = [...normalSkills] as [
      NormalSkillId,
      NormalSkillId,
    ];
    if (existingIndex !== -1) {
      const otherSlot = existingIndex as 0 | 1;
      nextNormals[otherSlot] = normalSkills[targetNormalSlot];
      nextNormals[targetNormalSlot] = skillId;
    } else {
      nextNormals[targetNormalSlot] = skillId;
      setTargetNormalSlot(targetNormalSlot === 0 ? 1 : 0);
    }

    onUpdateLoadout(activeCharId, {
      normalSkills: nextNormals,
      ultimateSkill,
    });
  };

  const handlePickUltimateSkill = (ultId: UltimateSkillId) => {
    soundEngine.playUiClick(620);
    onUpdateLoadout(activeCharId, {
      normalSkills,
      ultimateSkill: ultId,
    });
  };

  const maxHpPreview = isSkeleton
    ? profile.baseHp + charRanks.pathA * 14
    : isGoblin
    ? profile.baseHp + charRanks.pathA * 11
    : isGnome
    ? profile.baseHp + charRanks.pathA * 26
    : profile.baseHp + charRanks.pathA * 24;
  const moveSpeedPreview = Math.round(
    profile.baseSpeed *
      (isSkeleton || isGoblin
        ? 1 + charRanks.pathE * 0.05
        : isGnome
        ? 1 + charRanks.pathE * 0.04
        : 1)
  );
  const critPctPreview = Math.round((profile.baseCritChance + charRanks.pathC * 0.04) * 100);
  const zombiePlagueBonusPct = charRanks.pathC * 20;
  const zombieClawBonusPct = charRanks.pathB * 14;
  const skeletonGuardPct = 18 + charRanks.pathA * 3;
  const goblinEvadePct = 25 + charRanks.pathA * 3;
  const gnomeArmorPct = Math.round(22 + charRanks.pathA * 2.5);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-2 sm:p-3.5"
    >
      <div
        role="dialog"
        aria-label="Character Selection, Skill Loadout and Guild Progression"
        className="w-full max-w-5xl h-full max-h-[96%] flex flex-col bg-[#17141F] border border-[#342E44] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Compact Landscape Modal Header with Character Switcher */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-[#2B2638] bg-[#1C1826] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Character Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#110E17] border border-[#2B2638] shrink-0">
              {CHARACTER_LIST.map((char) => {
                const selected = char.id === activeCharId;
                const tabActiveClass =
                  char.id === CharacterId.Skeleton
                    ? 'bg-[#38BDF8] text-[#0B1724]'
                    : char.id === CharacterId.Goblin
                    ? 'bg-[#F59E0B] text-[#170F04]'
                    : char.id === CharacterId.Gnome
                    ? 'bg-[#FB923C] text-[#1C0F06]'
                    : 'bg-[#4ADE80] text-[#0E1912]';
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleSwitchCharacter(char.id)}
                    className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      selected ? tabActiveClass : 'text-[#ABA3BC] active:bg-[#241F31]'
                    }`}
                  >
                    <span>{char.archetypeName}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex flex-col min-w-0 ml-1">
              <span className="font-display text-sm font-bold text-[#F5F0E6] truncate">
                {profile.name}
              </span>
              <span className="text-[11px] text-[#A39BB5] truncate">{profile.characterType}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono-num text-[#7DD3FC]">
              <SoulShardIcon className="w-4 h-4" />
              <span>{saveData.soulShards}</span>
              <span className="text-xs text-[#94A3B8] font-sans hidden sm:inline">Shards</span>
            </div>
            <button
              type="button"
              onClick={handleSafeConfirm}
              aria-label="Close loadout"
              className="min-w-[44px] min-h-[44px] rounded-xl text-[#ABA3BC] active:bg-[#282336] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Landscape 2-Column Body — Each column is an independent ScrollablePane so off-screen text ALWAYS scrolls smoothly! */}
        <div className="flex-1 min-h-0 flex flex-row divide-x divide-[#2B2638] overflow-hidden">
          {/* Left Column: Character Summary, Equipped Slots & Innate Passives */}
          <ScrollablePane className="w-[41%] lg:w-[37%] h-full min-h-0 p-3 sm:p-4 pb-7 flex flex-col gap-3.5 bg-[#15121D]">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border bg-[#211C2D] shrink-0 ${
                  isSkeleton
                    ? 'border-[#38BDF8]/70'
                    : isGoblin
                    ? 'border-[#F59E0B]/70'
                    : isGnome
                    ? 'border-[#FB923C]/70'
                    : 'border-[#4ADE80]/70'
                }`}
              >
                {!failedPortraits[activeCharId] ? (
                  <img
                    src={profile.portraitUrl}
                    alt={`${profile.name} portrait`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedPortraits((prev) => ({ ...prev, [activeCharId]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center bg-[#1F2433] ${accentBrightTextClass}`}
                  >
                    <Swords className="w-6 h-6" />
                    <span className="text-[10px] mt-1 font-medium">{profile.archetypeName}</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold text-[#F5F0E6] leading-tight">
                  {profile.name}
                </div>
                <div className={`text-[10px] font-semibold mt-0.5 ${accentTextClass}`}>
                  {profile.characterType}
                </div>
                <div
                  className="flex items-center gap-0.5 text-[#FBBF24] mt-1"
                  aria-label={`Star Rank ${starRank} of 6`}
                >
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-3 h-3 ${
                        idx < starRank ? 'fill-[#FBBF24] text-[#FBBF24]' : 'text-[#3B344D]'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] text-[#CBD5E1] font-mono-num flex flex-wrap gap-x-1.5 gap-y-0.5">
                  <span>HP {maxHpPreview}</span>
                  <span className="text-[#5D5470]">·</span>
                  <span>SPD {moveSpeedPreview}</span>
                  <span className="text-[#5D5470]">·</span>
                  {isSkeleton ? (
                    <>
                      <span>Crit {critPctPreview}%</span>
                      <span className="text-[#5D5470]">·</span>
                      <span>Guard {skeletonGuardPct}%</span>
                    </>
                  ) : isGoblin ? (
                    <>
                      <span>Crit {critPctPreview}%</span>
                      <span className="text-[#5D5470]">·</span>
                      <span>Evade {goblinEvadePct}%</span>
                    </>
                  ) : isGnome ? (
                    <>
                      <span>Armor {gnomeArmorPct}%</span>
                      <span className="text-[#5D5470]">·</span>
                      <span>Resolve +42%</span>
                    </>
                  ) : (
                    <>
                      <span>Plague +{zombiePlagueBonusPct}%</span>
                      {zombieClawBonusPct > 0 && (
                        <>
                          <span className="text-[#5D5470]">·</span>
                          <span>Claw +{zombieClawBonusPct}%</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#BDB6CC] leading-relaxed">{profile.role}</p>

            {/* Equipped Run Skills (2 Normal + 1 Ultimate) */}
            <div className="pt-3 border-t border-[#282336]">
              <div className="text-[11px] font-semibold text-[#D6D0C4] mb-2">
                Equipped Loadout (2 Normal · 1 Ultimate)
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {([0, 1] as const).map((slotIdx) => {
                  const sDef = NORMAL_SKILLS[normalSkills[slotIdx]];
                  const isEditing = activeTab === 'SKILLS' && targetNormalSlot === slotIdx;
                  return (
                    <button
                      key={slotIdx}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setActiveTab('SKILLS');
                        setTargetNormalSlot(slotIdx);
                      }}
                      className={`min-h-[54px] p-2 rounded-xl border text-left transition-colors ${
                        isEditing ? equippedCardClass : 'bg-[#1D1928] border-[#312B41]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#9E96B0] font-mono-num mb-1">
                        <span>Skill {slotIdx + 1}</span>
                        <span>{sDef.cooldown}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <NormalSkillIcon id={sDef.id} className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] font-semibold text-[#F5F0E6] truncate">
                          {sDef.name}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {(() => {
                  const uDef = ULTIMATE_SKILLS[ultimateSkill];
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setActiveTab('SKILLS');
                      }}
                      className="min-h-[54px] p-2 rounded-xl border bg-[#221D2E] border-[#F59E0B]/70 text-left"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#FBBF24] font-mono-num mb-1">
                        <span>Ultimate</span>
                        <span>{uDef.cooldown}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UltimateSkillIcon id={uDef.id} className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] font-semibold text-[#F5F0E6] truncate">
                          {uDef.name}
                        </span>
                      </div>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Zombie Basic Attack Animation Preview */}
            {!isSkeleton && !isGoblin && !isGnome && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#86EFAC] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
                    Basic Attack · Necrotic Claw (8-Frame FX)
                  </div>
                  <span className="text-[10px] text-[#A7F3D0] font-mono-num">0.34s recovery</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#17241C] border border-[#2B4B36] space-y-2">
                  <p className="text-[11px] text-[#C2D8C9] leading-snug">
                    Frame-by-frame toxic claw swipe. Connects with sharp impact sparks and bursts lingering poison clouds.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#081726] rounded-lg border border-[#28573D] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <img
                        src="/assets/aistudio/zombie_attack_fx_strip.png"
                        alt="Zombie basic attack animation frames"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-[10px] text-[#86EFAC] space-y-0.5 font-mono-num leading-tight">
                      <div>Reach: 62 (84 in Abomination)</div>
                      <div>Impact: Virulent Infection Stacks</div>
                      <div>Effects: Spore Plumes &amp; Droplets</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Both Innate Passives */}
            <div className="pt-3 border-t border-[#282336] space-y-2.5">
              <div className="text-[11px] font-semibold text-[#D6D0C4]">
                Innate Passives (Both Active)
              </div>
              {profile.passiveSkills.map((pas) => (
                <div key={pas.id} className="p-2.5 rounded-xl bg-[#1B1726] border border-[#2B253A] space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <PassiveSkillIcon id={pas.id} className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold text-[#F5F0E6]">{pas.name}</span>
                    <span className="text-[10px] text-[#8A819C]">· {pas.tag}</span>
                  </div>
                  <p className="text-[11px] text-[#BDB6CC] leading-snug">{pas.description}</p>
                  <div className={`text-[10px] ${accentTextClass}`}>
                    {pas.detailLine}
                  </div>
                </div>
              ))}
            </div>
          </ScrollablePane>

          {/* Right Column: Touch Skill Picker & Guild Upgrades */}
          <ScrollablePane className="w-[59%] lg:w-[63%] h-full min-h-0 p-3 sm:p-4 pb-7 flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-[#110E17] border border-[#2B2638] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveTab('SKILLS');
                  }}
                  className={`min-h-[38px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'SKILLS'
                      ? 'bg-[#292338] text-[#F5F0E6]'
                      : 'text-[#9E96B0]'
                  }`}
                >
                  Skills (5 Normal · 3 Ult)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveTab('UPGRADES');
                  }}
                  className={`min-h-[38px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'UPGRADES'
                      ? 'bg-[#292338] text-[#F5F0E6]'
                      : 'text-[#9E96B0]'
                  }`}
                >
                  {profile.archetypeName} Path
                </button>
              </div>

              {activeTab === 'SKILLS' && (
                <div className="flex items-center gap-1.5 text-xs text-[#A39BB5]">
                  <span>Slot:</span>
                  <button
                    type="button"
                    onClick={() => setTargetNormalSlot(0)}
                    className={`min-h-[38px] px-2.5 rounded-lg font-mono-num text-xs ${
                      targetNormalSlot === 0
                        ? `${primaryBtnClass} font-bold`
                        : 'bg-[#241F31] text-[#CBD5E1]'
                    }`}
                  >
                    Skill 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetNormalSlot(1)}
                    className={`min-h-[38px] px-2.5 rounded-lg font-mono-num text-xs ${
                      targetNormalSlot === 1
                        ? `${primaryBtnClass} font-bold`
                        : 'bg-[#241F31] text-[#CBD5E1]'
                    }`}
                  >
                    Skill 2
                  </button>
                </div>
              )}
            </div>

            {activeTab === 'SKILLS' ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <h3 className="text-xs sm:text-sm font-semibold text-[#F5F0E6]">
                      {profile.archetypeName} Normal Skills — Equip 2 of 5
                    </h3>
                    <span className="text-[11px] text-[#8A819C]">
                      Assigning to Skill {targetNormalSlot + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {normalSkillList.map((skill) => {
                      const slotIdx = normalSkills.indexOf(skill.id);
                      const isEquipped = slotIdx !== -1;
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => handlePickNormalSkill(skill.id)}
                          className={`p-3 rounded-xl border text-left transition-colors active:scale-[0.99] flex flex-col justify-between gap-1.5 ${
                            isEquipped ? equippedCardClass : 'bg-[#1B1725] border-[#2D273C]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <NormalSkillIcon id={skill.id} className="w-5 h-5 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-semibold text-[#F5F0E6] truncate">
                                  {skill.name}
                                </div>
                                <div className="text-[11px] text-[#9E96B0] font-mono-num">
                                  {skill.tag} · {skill.cooldown}s CD
                                </div>
                              </div>
                            </div>
                            {isEquipped && (
                              <span
                                className={`text-[11px] font-mono-num font-bold shrink-0 flex items-center gap-1 ${accentBrightTextClass}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Skill {slotIdx + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#BDB6CC] leading-snug">
                            {skill.description}
                          </p>
                          <div className={`text-[10px] ${accentTextClass}`}>
                            {skill.detailLine}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2B2638]">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <h3 className="text-xs sm:text-sm font-semibold text-[#F5F0E6]">
                      {profile.archetypeName} Ultimate Skills — Equip 1 of 3
                    </h3>
                    <span className="text-[11px] text-[#8A819C]">Tap Ultimate button when MAX</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {ultimateSkillList.map((ult) => {
                      const isSelected = ultimateSkill === ult.id;
                      return (
                        <button
                          key={ult.id}
                          type="button"
                          onClick={() => handlePickUltimateSkill(ult.id)}
                          className={`p-3 rounded-xl border text-left transition-colors active:scale-[0.99] flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-[#262030] border-[#F59E0B]'
                              : 'bg-[#1B1725] border-[#2D273C]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <UltimateSkillIcon id={ult.id} className="w-5 h-5 shrink-0" />
                              <span className="text-xs sm:text-sm font-semibold text-[#F5F0E6] truncate">
                                {ult.name}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="text-[11px] font-mono-num font-bold text-[#FBBF24] shrink-0">
                                Equipped
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#BDB6CC] leading-snug">
                            {ult.description}
                          </p>
                          <div className="text-[10px] text-[#FDE68A] font-mono-num">
                            {ult.detailLine} · {ult.cooldown}s CD
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-[#2B2638] flex-wrap">
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-[#F5F0E6]">
                      {upgradePath.pathTitle}
                    </h3>
                    <div className={`text-[11px] mt-0.5 ${accentTextClass}`}>
                      {upgradePath.pathSubtitle}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono-num text-[#9E96B0]">
                    {profile.archetypeName} Exclusive Path
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {upgradePath.nodes.map((def) => {
                    const currentRank = charRanks[def.slot];
                    const isMax = currentRank >= def.maxRank;
                    const cost = getUpgradeCost(def, currentRank);
                    const canAfford = !isMax && saveData.soulShards >= cost;

                    return (
                      <div
                        key={`${activeCharId}-${def.slot}`}
                        className="p-3 rounded-xl bg-[#1B1725] border border-[#2D273C] flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-[#F5F0E6]">
                              {def.name}
                            </span>
                            <span className={`text-[11px] font-mono-num ${accentTextClass}`}>
                              Rank {currentRank}/{def.maxRank}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A39BB5] mt-1 leading-snug">
                            {def.summary}
                          </p>
                          <div className="text-[11px] text-[#CBD5E1] mt-1">{def.perRankLabel}</div>
                        </div>

                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            soundEngine.playHeal();
                            onPurchaseUpgrade(activeCharId, def.slot, cost);
                          }}
                          className={`w-full min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-98 whitespace-nowrap ${
                            isMax
                              ? 'bg-[#242031] text-[#8A819C]'
                              : canAfford
                              ? primaryBtnClass
                              : 'bg-[#242031] text-[#6E6680]'
                          }`}
                        >
                          {isMax ? (
                            <span>Mastered</span>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Upgrade · {cost} Shards</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollablePane>
        </div>

        {/* Compact Touch Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-[#2B2638] bg-[#1C1826] shrink-0">
          <div className="text-[11px] text-[#9E96B0] hidden sm:block truncate">
            {isPickingCharacter
              ? `Swipe down inside either column to read all skills · Confirm ${profile.archetypeName} to roam the Guild House.`
              : `Swipe to scroll skills · Walk out the North Guild Door anytime as ${profile.archetypeName}.`}
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={handleSafeConfirm}
              className={`min-h-[44px] px-6 rounded-xl text-xs font-bold active:scale-95 whitespace-nowrap shrink-0 ${primaryBtnClass}`}
            >
              {isPickingCharacter
                ? `Play as ${profile.archetypeName}`
                : `Confirm ${profile.archetypeName}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
