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
import { GhostAttackPreview } from './GhostAttackPreview';
import { GnomeAttackPreview } from './GnomeAttackPreview';
import { GoblinAttackPreview } from './GoblinAttackPreview';
import { KoboldAttackPreview } from './KoboldAttackPreview';
import { LizardfolkAttackPreview } from './LizardfolkAttackPreview';
import { SkeletonAttackPreview } from './SkeletonAttackPreview';
import { SlimeAttackPreview } from './SlimeAttackPreview';
import { ZombieAttackPreview } from './ZombieAttackPreview';

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
  const isGhost = activeCharId === CharacterId.Ghost;
  const isKobold = activeCharId === CharacterId.Kobold;
  const isSlime = activeCharId === CharacterId.Slime;
  const isLizardfolk = activeCharId === CharacterId.Lizardfolk;
  const accentTextClass = isSkeleton
    ? 'text-[#7DD3FC]'
    : isGoblin
    ? 'text-[#FDE68A]'
    : isGnome
    ? 'text-[#FDBA74]'
    : isGhost
    ? 'text-[#E9D5FF]'
    : isKobold
    ? 'text-[#FDA4AF]'
    : isSlime
    ? 'text-[#E9D5FF]'
    : isLizardfolk
    ? 'text-[#6EE7B7]'
    : 'text-[#86EFAC]';
  const accentBrightTextClass = isSkeleton
    ? 'text-[#38BDF8]'
    : isGoblin
    ? 'text-[#FBBF24]'
    : isGnome
    ? 'text-[#FB923C]'
    : isGhost
    ? 'text-[#C084FC]'
    : isKobold
    ? 'text-[#FB7185]'
    : isSlime
    ? 'text-[#A855F7]'
    : isLizardfolk
    ? 'text-[#10B981]'
    : 'text-[#4ADE80]';
  const primaryBtnClass = isSkeleton
    ? 'bg-[#38BDF8] text-[#0B1724]'
    : isGoblin
    ? 'bg-[#F59E0B] text-[#170F04]'
    : isGnome
    ? 'bg-[#FB923C] text-[#1C0F06]'
    : isGhost
    ? 'bg-[#C084FC] text-[#180B26]'
    : isKobold
    ? 'bg-[#FB7185] text-[#1F0810]'
    : isSlime
    ? 'bg-[#A855F7] text-[#19092B]'
    : isLizardfolk
    ? 'bg-[#10B981] text-[#041D13]'
    : 'bg-[#4ADE80] text-[#0E1912]';
  const equippedCardClass = isSkeleton
    ? 'bg-[#192536] border-[#38BDF8]'
    : isGoblin
    ? 'bg-[#2A2015] border-[#F59E0B]'
    : isGnome
    ? 'bg-[#2B1D17] border-[#FB923C]'
    : isGhost
    ? 'bg-[#251A36] border-[#C084FC]'
    : isKobold
    ? 'bg-[#2B1620] border-[#FB7185]'
    : isSlime
    ? 'bg-[#231533] border-[#A855F7]'
    : isLizardfolk
    ? 'bg-[#122820] border-[#10B981]'
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
    : isGhost
    ? profile.baseHp + charRanks.pathA * 9
    : isKobold
    ? profile.baseHp + charRanks.pathA * 13
    : profile.baseHp + charRanks.pathA * 24;
  const moveSpeedPreview = Math.round(
    profile.baseSpeed *
      (isSkeleton || isGoblin || isKobold
        ? 1 + charRanks.pathE * 0.05
        : isGnome
        ? 1 + charRanks.pathE * 0.04
        : isGhost
        ? 1 + charRanks.pathE * 0.055
        : 1)
  );
  const critPctPreview = Math.round((profile.baseCritChance + charRanks.pathC * 0.04) * 100);
  const zombiePlagueBonusPct = charRanks.pathC * 20;
  const zombieClawBonusPct = charRanks.pathB * 14;
  const skeletonGuardPct = 18 + charRanks.pathA * 3;
  const goblinEvadePct = 25 + charRanks.pathA * 3;
  const gnomeArmorPct = Math.round(22 + charRanks.pathA * 2.5);
  const ghostEvadePct = Math.round(24 + charRanks.pathA * 2.5);
  const ghostMagicPct = charRanks.pathB * 14;
  const koboldMarkBonusPct = 35 + charRanks.pathC * 12;

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
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#110E17] border border-[#2B2638] overflow-x-auto max-w-full">
              {CHARACTER_LIST.map((char) => {
                const selected = char.id === activeCharId;
                const tabActiveClass =
                  char.id === CharacterId.Skeleton
                    ? 'bg-[#38BDF8] text-[#0B1724]'
                    : char.id === CharacterId.Goblin
                    ? 'bg-[#F59E0B] text-[#170F04]'
                    : char.id === CharacterId.Gnome
                    ? 'bg-[#FB923C] text-[#1C0F06]'
                    : char.id === CharacterId.Ghost
                    ? 'bg-[#C084FC] text-[#180B26]'
                    : char.id === CharacterId.Kobold
                    ? 'bg-[#FB7185] text-[#1F0810]'
                    : 'bg-[#4ADE80] text-[#0E1912]';
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleSwitchCharacter(char.id)}
                    className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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
                    : isGhost
                    ? 'border-[#C084FC]/70'
                    : isKobold
                    ? 'border-[#FB7185]/70'
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
                  ) : isGhost ? (
                    <>
                      <span>Phase {ghostEvadePct}%</span>
                      <span className="text-[#5D5470]">·</span>
                      <span>Magic +{ghostMagicPct}%</span>
                    </>
                  ) : isKobold ? (
                    <>
                      <span>Crit {critPctPreview}%</span>
                      <span className="text-[#5D5470]">·</span>
                      <span>Mark +{koboldMarkBonusPct}%</span>
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

            {/* Zombie Basic Attack 60fps Animation Preview */}
            {!isSkeleton && !isGoblin && !isGnome && !isGhost && !isKobold && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#86EFAC] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
                    Basic Attack · Necrotic Claw (60fps FX)
                  </div>
                  <span className="text-[10px] text-[#A7F3D0] font-mono-num">3-Hit Combo</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#17241C] border border-[#2B4B36] space-y-2">
                  <p className="text-[11px] text-[#C2D8C9] leading-snug">
                    Smooth 3-talon decaying claw swipe with flung venom droplets and spore puffs; every 3rd swing unleashes a virulent rend applying double infection stacks.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#091812] rounded-lg border border-[#28573D] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <ZombieAttackPreview />
                    </div>
                    <div className="text-[10px] text-[#86EFAC] space-y-0.5 font-mono-num leading-tight">
                      <div>Reach: 62 · 72 on 3rd (94 Abomination)</div>
                      <div>3rd Strike: +20% DMG &amp; 2x Infection</div>
                      <div>Effects: 3-Talon Rake &amp; Spore Burst</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Skeleton Basic Attack 60fps Animation Preview */}
            {isSkeleton && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#7DD3FC] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                    Basic Attack · Sharpened Bone-Blade (60fps FX)
                  </div>
                  <span className="text-[10px] text-[#BAE6FD] font-mono-num">3-Hit Combo</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#131E2E] border border-[#24405E] space-y-2">
                  <p className="text-[11px] text-[#C4D7EC] leading-snug">
                    Swift alternating bone-blade crescent combo with flying ivory splinters; every 3rd swing unleashes a wider critical-empowered cleave.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#091322] rounded-lg border border-[#275078] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <SkeletonAttackPreview />
                    </div>
                    <div className="text-[10px] text-[#7DD3FC] space-y-0.5 font-mono-num leading-tight">
                      <div>Reach: 68 · 80 on 3rd (96 Colossus)</div>
                      <div>3rd Strike: +22% DMG &amp; +25% Crit</div>
                      <div>Effects: Bone Shards &amp; Cross-Flash</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Goblin Basic Attack & Assassin Blades 60fps Animation Preview */}
            {isGoblin && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#FDE68A] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    Basic Attack · Twin Kukri Blades (60fps FX)
                  </div>
                  <span className="text-[10px] text-[#FCD34D] font-mono-num">3-Hit Scissor</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#241B11] border border-[#523919] space-y-2">
                  <p className="text-[11px] text-[#E5D5BE] leading-snug">
                    Ultra-fast alternating curved dagger slashes that culminate in a 3rd-hit Scissor X-Slash; shifts to toxic emerald-lime when Poisoned Blades is active.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#140F0A] rounded-lg border border-[#6B481B] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <GoblinAttackPreview />
                    </div>
                    <div className="text-[10px] text-[#FDE68A] space-y-0.5 font-mono-num leading-tight">
                      <div>Reach: 56 · 66 on 3rd X-Slash</div>
                      <div>3rd Strike: +20% DMG &amp; +20% Crit</div>
                      <div>All 8 Skills: 60fps Assassin FX</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gnome Basic Attack & Runic Bastion 60fps Animation Preview */}
            {isGnome && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#FDBA74] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FB923C]" />
                    Basic Attack · Runestone Gauntlets (60fps FX)
                  </div>
                  <span className="text-[10px] text-[#FED7AA] font-mono-num">3-Hit Tectonic</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#251812] border border-[#5C3622] space-y-2">
                  <p className="text-[11px] text-[#E6D2C5] leading-snug">
                    Heavy alternating forged-bronze gauntlet shock-punches with sonic compression rings, culminating in a 3rd-hit Double-Fist Tectonic Smash.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#17100C] rounded-lg border border-[#734227] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <GnomeAttackPreview />
                    </div>
                    <div className="text-[10px] text-[#FDBA74] space-y-0.5 font-mono-num leading-tight">
                      <div>Reach: 66 · 78 on 3rd (104 Mountain)</div>
                      <div>3rd Strike: +22% DMG &amp; +18% Crit</div>
                      <div>All 8 Skills: 60fps Seismic FX</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ghost Basic Attack & Spectral Magic 60fps Animation Preview */}
            {isGhost && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#E9D5FF] flex items-center gap-1.5">
                    <span>Basic Attack · Spectral Haunt (60fps FX)</span>
                  </div>
                  <span className="text-[10px] text-[#67E8F9] font-mono-num">3-Hit Astral</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1F152E] border border-[#583380] space-y-2">
                  <p className="text-[11px] text-[#DDD6FE] leading-snug">
                    Ethereal spirit-claw arcs that phase through obstacles; every 3rd attack unleashes an Abyssal Vortex Rend and launches a piercing spirit orb.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#110B1C] rounded-lg border border-[#6D28D9] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <GhostAttackPreview />
                    </div>
                    <div className="text-[10px] text-[#E9D5FF] space-y-0.5 font-mono-num leading-tight">
                      <div>Reach: 78 · 94 on 3rd + Spirit Orb</div>
                      <div>Restless Surge: +32% Magic DMG</div>
                      <div>All 8 Skills: 60fps Spectral FX</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Kobold Basic Attack & Crossbow Artifice 60fps Animation Preview */}
            {isKobold && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#FDA4AF] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FB7185]" />
                    <span>Basic Attack · Repeating Crossbow (60fps FX)</span>
                  </div>
                  <span className="text-[10px] text-[#FDE047] font-mono-num">Ranged 3-Shot</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#27131B] border border-[#61273A] space-y-2">
                  <p className="text-[11px] text-[#EED5DC] leading-snug">
                    Fires high-velocity crossbow bolts from a safe distance, stacking Hunter’s Precision weakspot marks; every 3rd shot launches an armor-cracking Critical Bolt.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#17090F] rounded-lg border border-[#7D2E46] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <KoboldAttackPreview />
                    </div>
                    <div className="text-[10px] text-[#FDA4AF] space-y-0.5 font-mono-num leading-tight">
                      <div>Ranged Reach: 400px Crossbow Bolts</div>
                      <div>3rd Bolt: +24% DMG &amp; +25% Crit</div>
                      <div>All 8 Skills: 60fps Bolt &amp; Trap FX</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Slime Basic Attack & Arcane Magic 60fps Animation Preview */}
            {isSlime && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#E9D5FF] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
                    <span>Basic Attack · Arcane Pulse &amp; Detonation (60fps FX)</span>
                  </div>
                  <span className="text-[10px] text-[#C084FC] font-mono-num">3-Hit Arcane</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#20112F] border border-[#532675] space-y-2">
                  <p className="text-[11px] text-[#E5D7F2] leading-snug">
                    Pulses concentrated spheres of magical energy with undulating gelatinous body recoil; every 3rd cast triggers an Unstable Mana Arcane Detonation.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#13081E] rounded-lg border border-[#6E2E9E] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <SlimeAttackPreview />
                    </div>
                    <div className="text-[10px] text-[#E9D5FF] space-y-0.5 font-mono-num leading-tight">
                      <div>Ranged Reach: 360px Arcane Pulses</div>
                      <div>3rd Pulse: Unstable Arcane Detonation</div>
                      <div>All 8 Skills: 60fps Elemental FX</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lizardfolk Basic Attack & Spear Thrusts 60fps Animation Preview */}
            {isLizardfolk && (
              <div className="pt-3 border-t border-[#282336] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-[#6EE7B7] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span>Basic Attack · Hunter's Spear Thrust &amp; Javelin (60fps FX)</span>
                  </div>
                  <span className="text-[10px] text-[#34D399] font-mono-num">3-Hit Thrust &amp; Throw</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#10241A] border border-[#1F543C] space-y-2">
                  <p className="text-[11px] text-[#D1EBE0] leading-snug">
                    Swift two-hand reptilian spear thrusts with tail counter-balance, culminating in a 3rd-hit high-velocity Piercing Javelin throw that punctures enemy lines.
                  </p>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="relative w-24 h-16 bg-[#081710] rounded-lg border border-[#276F4E] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                      <LizardfolkAttackPreview />
                    </div>
                    <div className="text-[10px] text-[#6EE7B7] space-y-0.5 font-mono-num leading-tight">
                      <div>Thrust Reach: 75 · Javelin: 380px</div>
                      <div>3rd Throw: +25% DMG &amp; 100% Pierce</div>
                      <div>All 8 Skills: 60fps Spear Art FX</div>
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
