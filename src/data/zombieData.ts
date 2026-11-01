import ghostPortraitImg from '../assets/images/ghost_hero_portrait_1793398455645.jpg';
import gnomePortraitImg from '../assets/images/gnome_hero_portrait_1793315632139.jpg';
import goblinPortraitImg from '../assets/images/goblin_hero_portrait_1793313607661.jpg';
import graveyardBiomeImg from '../assets/images/graveyard_biome_card_1793308236254.jpg';
import koboldPortraitImg from '../assets/images/kobold_hero_portrait_1793440988933.jpg';
import lizardfolkPortraitImg from '../assets/images/lizardfolk_hero_portrait_1793559735949.jpg';
import skeletonBossImg from '../assets/images/skeleton_boss_portrait_1793308236655.jpg';
import skeletonPortraitImg from '../assets/images/skeleton_hero_portrait_1793311951924.jpg';
import slimePortraitImg from '../assets/images/slime_hero_portrait_1793559719531.jpg';
import zombiePortraitImg from '../assets/images/zombie_hero_portrait_1793308234967.jpg';
import {
  CharacterId,
  CharacterUpgradeRanks,
  DifficultyConfig,
  DifficultyLevel,
  EquippedLoadout,
  GuildSaveData,
  NormalSkillDef,
  NormalSkillId,
  PassiveSkillDef,
  PassiveSkillId,
  RunBlessing,
  UltimateSkillDef,
  UltimateSkillId,
  UpgradeNodeSlot,
} from '../types/game';

export const ZOMBIE_PORTRAIT_URL = zombiePortraitImg;
export const SKELETON_PORTRAIT_URL = skeletonPortraitImg;
export const GOBLIN_PORTRAIT_URL = goblinPortraitImg;
export const GNOME_PORTRAIT_URL = gnomePortraitImg;
export const GHOST_PORTRAIT_URL = ghostPortraitImg;
export const KOBOLD_PORTRAIT_URL = koboldPortraitImg;
export const SLIME_PORTRAIT_URL = slimePortraitImg;
export const LIZARDFOLK_PORTRAIT_URL = lizardfolkPortraitImg;
export const GRAVEYARD_BIOME_URL = graveyardBiomeImg;
export const SKELETON_BOSS_URL = skeletonBossImg;

export interface CharacterProfileDef {
  id: CharacterId;
  name: string;
  archetypeName: string;
  characterType: string;
  role: string;
  portraitUrl: string;
  accentColor: string;
  attackLabel: string;
  baseHp: number;
  baseSpeed: number;
  baseAttackDamage: number;
  baseAttackCooldown: number;
  baseCritChance: number; // 0..1
  critMultiplier: number;
  guildSpot: { x: number; y: number; facingX: number };
  normalSkillIds: NormalSkillId[];
  ultimateSkillIds: UltimateSkillId[];
  passiveSkills: PassiveSkillDef[];
  defaultLoadout: EquippedLoadout;
}

export const NORMAL_SKILLS: Record<NormalSkillId, NormalSkillDef> = {
  // === ZOMBIE NORMAL SKILLS (5) ===
  [NormalSkillId.RottingClaw]: {
    id: NormalSkillId.RottingClaw,
    characterId: CharacterId.Zombie,
    name: 'Rotting Claw',
    tag: 'Melee · Slow',
    cooldown: 3.8,
    description:
      'The zombie slashes enemies with its decaying claws in a rapid combo, inflicting physical damage and slowing their movement.',
    detailLine: '3-hit rapid slash arc · 40% Movement Slow for 3.5s',
    accentColor: '#4ADE80',
  },
  [NormalSkillId.PlagueBurst]: {
    id: NormalSkillId.PlagueBurst,
    characterId: CharacterId.Zombie,
    name: 'Plague Burst',
    tag: 'Poison · Area',
    cooldown: 6.0,
    description:
      'The zombie releases a cloud of toxic gas that damages nearby enemies and infects them with a lingering plague.',
    detailLine: '4.5s toxic cloud · Lingering Plague damage over time',
    accentColor: '#A3E635',
  },
  [NormalSkillId.FleshRipper]: {
    id: NormalSkillId.FleshRipper,
    characterId: CharacterId.Zombie,
    name: 'Flesh Ripper',
    tag: 'Dash · Piercing',
    cooldown: 4.6,
    description:
      'The zombie lunges forward, tearing through enemies in its path with its sharp claws.',
    detailLine: 'High-speed claw lunge · Pierces & knocks back foes',
    accentColor: '#34D399',
  },
  [NormalSkillId.UndyingFlesh]: {
    id: NormalSkillId.UndyingFlesh,
    characterId: CharacterId.Zombie,
    name: 'Undying Flesh',
    tag: 'Regen · Ward',
    cooldown: 9.0,
    description:
      'The zombie activates its undead regeneration, gradually restoring its health and strengthening its ability to withstand attacks.',
    detailLine: 'Restores 35% Max HP over 5s · 45% Damage Reduction',
    accentColor: '#2DD4BF',
  },
  [NormalSkillId.GraveCall]: {
    id: NormalSkillId.GraveCall,
    characterId: CharacterId.Zombie,
    name: 'Grave Call',
    tag: 'Summon · Pack',
    cooldown: 8.5,
    description:
      'The zombie summons lesser undead minions that pursue nearby enemies and attack them relentlessly.',
    detailLine: 'Raises 2 Lesser Zombies · Relentless pursuit for 15s',
    accentColor: '#86EFAC',
  },

  // === SKELETON NORMAL SKILLS (5) ===
  [NormalSkillId.BoneSlash]: {
    id: NormalSkillId.BoneSlash,
    characterId: CharacterId.Skeleton,
    name: 'Bone Slash',
    tag: 'Melee · High Crit',
    cooldown: 2.8,
    description:
      'The skeleton performs a swift sword slash, cutting through enemies in front of it with its sharpened bone blade.',
    detailLine: 'Wide bone-katana cleave · +35% Critical Strike chance',
    accentColor: '#38BDF8',
  },
  [NormalSkillId.BoneSpear]: {
    id: NormalSkillId.BoneSpear,
    characterId: CharacterId.Skeleton,
    name: 'Bone Spear',
    tag: 'Projectile · Pierce',
    cooldown: 4.2,
    description:
      'The skeleton launches a sharpened bone projectile toward enemies, piercing everything in its path.',
    detailLine: 'High-velocity piercing spear · Cuts through entire enemy lines',
    accentColor: '#7DD3FC',
  },
  [NormalSkillId.RibcageShield]: {
    id: NormalSkillId.RibcageShield,
    characterId: CharacterId.Skeleton,
    name: 'Ribcage Shield',
    tag: 'Barrier · Block',
    cooldown: 8.5,
    description:
      'The skeleton detaches and rearranges its ribs into a protective barrier, blocking incoming attacks.',
    detailLine: 'Blocks 3 incoming hits (80% mitigation) & deflects arrows for 6s',
    accentColor: '#E2E8F0',
  },
  [NormalSkillId.SkeletalRush]: {
    id: NormalSkillId.SkeletalRush,
    characterId: CharacterId.Skeleton,
    name: 'Skeletal Rush',
    tag: 'Dash · Lethal',
    cooldown: 4.5,
    description:
      'The skeleton dashes forward with incredible speed, striking enemies along its path with its weapon.',
    detailLine: 'Lightning blade dash · +30% Critical Strike chance along path',
    accentColor: '#60A5FA',
  },
  [NormalSkillId.BoneStorm]: {
    id: NormalSkillId.BoneStorm,
    characterId: CharacterId.Skeleton,
    name: 'Bone Storm',
    tag: 'Vortex · Guard',
    cooldown: 9.0,
    description:
      'The skeleton summons spinning bone fragments around itself, damaging enemies that approach while protecting it from incoming attacks.',
    detailLine: '5.5s whirling bone vortex · Shreds nearby foes & intercepts arrows',
    accentColor: '#A5B4FC',
  },

  // === GOBLIN NORMAL SKILLS (5) ===
  [NormalSkillId.DaggerFlurry]: {
    id: NormalSkillId.DaggerFlurry,
    characterId: CharacterId.Goblin,
    name: 'Dagger Flurry',
    tag: 'Rapid · 5-Hit',
    cooldown: 3.2,
    description:
      'The goblin unleashes a series of rapid dagger strikes against enemies in front of it, overwhelming them with its incredible attack speed.',
    detailLine: '5 ultra-fast twin-dagger slashes · High Crit & on-hit synergy',
    accentColor: '#F59E0B',
  },
  [NormalSkillId.Shadowstep]: {
    id: NormalSkillId.Shadowstep,
    characterId: CharacterId.Goblin,
    name: 'Shadowstep',
    tag: 'Blink · Backstab',
    cooldown: 4.8,
    description:
      'The goblin quickly vanishes into the shadows and reappears behind its target, performing a surprise attack.',
    detailLine: 'Teleports behind target · Guaranteed Opportunistic Backstab (+45% Crit)',
    accentColor: '#FBBF24',
  },
  [NormalSkillId.ExplosiveTrap]: {
    id: NormalSkillId.ExplosiveTrap,
    characterId: CharacterId.Goblin,
    name: 'Explosive Trap',
    tag: 'Trap · Blast',
    cooldown: 6.0,
    description:
      'The goblin places a hidden explosive trap on the ground that detonates when an enemy approaches, damaging and knocking back nearby enemies.',
    detailLine: 'Proximity rune mine · Heavy area blast & strong knockback',
    accentColor: '#FB923C',
  },
  [NormalSkillId.Windrunner]: {
    id: NormalSkillId.Windrunner,
    characterId: CharacterId.Goblin,
    name: 'Windrunner',
    tag: 'Speed · Evasion',
    cooldown: 8.5,
    description:
      'The goblin enters a state of heightened agility, allowing it to move at incredible speed and evade incoming attacks while moving.',
    detailLine: '5s +45% Move Speed · +50% Evasion while moving · Faster strikes',
    accentColor: '#FDE047',
  },
  [NormalSkillId.PoisonedBlades]: {
    id: NormalSkillId.PoisonedBlades,
    characterId: CharacterId.Goblin,
    name: 'Poisoned Blades',
    tag: 'Venom · Weaken',
    cooldown: 8.0,
    description:
      'The goblin coats its daggers with a deadly poison, causing its attacks to weaken enemies and inflict continuous damage.',
    detailLine: '6.5s Venom Coating · Weakens enemy attacks (-18%) & deals DoT',
    accentColor: '#A3E635',
  },

  // === GNOME NORMAL SKILLS (5) ===
  [NormalSkillId.IronFist]: {
    id: NormalSkillId.IronFist,
    characterId: CharacterId.Gnome,
    name: 'Iron Fist',
    tag: 'Gauntlet · Stagger',
    cooldown: 3.6,
    description:
      'The gnome delivers a powerful punch with its reinforced gauntlet, sending a shockwave through the ground that damages and staggers enemies in front of it.',
    detailLine: 'Forward ground shockwave · Heavy impact & 1.1s Stagger Stun',
    accentColor: '#FB923C',
  },
  [NormalSkillId.FortressStance]: {
    id: NormalSkillId.FortressStance,
    characterId: CharacterId.Gnome,
    name: 'Fortress Stance',
    tag: 'Armor · Unstoppable',
    cooldown: 8.5,
    description:
      'The gnome braces itself and activates its defensive armor, greatly reducing incoming damage while becoming resistant to knockback and interruptions.',
    detailLine: '5.5s Reinforced Guard · 55% Damage Reduction & Knockback Immunity',
    accentColor: '#FDBA74',
  },
  [NormalSkillId.Groundbreaker]: {
    id: NormalSkillId.Groundbreaker,
    characterId: CharacterId.Gnome,
    name: 'Groundbreaker',
    tag: 'Leap · Interrupt',
    cooldown: 5.2,
    description:
      'The gnome jumps into the air and crashes into the ground, creating a powerful shockwave that damages nearby enemies and disrupts their attacks.',
    detailLine: 'Armored leap slam · Cancels enemy windups & staggers nearby foes',
    accentColor: '#F97316',
  },
  [NormalSkillId.MagneticGuard]: {
    id: NormalSkillId.MagneticGuard,
    characterId: CharacterId.Gnome,
    name: 'Magnetic Guard',
    tag: 'Field · Redirect',
    cooldown: 8.0,
    description:
      'The gnome activates a magnetic field around its armor, attracting nearby projectiles and redirecting them away from allies.',
    detailLine: '5.5s Lodestone Field · Pulls enemy arrows/bolts & reflects them back',
    accentColor: '#38BDF8',
  },
  [NormalSkillId.EarthenGrasp]: {
    id: NormalSkillId.EarthenGrasp,
    characterId: CharacterId.Gnome,
    name: 'Earthen Grasp',
    tag: 'Stone · Immobilize',
    cooldown: 7.5,
    description:
      'The gnome strikes the ground, causing stone hands to emerge and grab nearby enemies, immobilizing them while dealing damage.',
    detailLine: 'Stone hands root nearby foes for 2.8s & deal crushing earth DoT',
    accentColor: '#D97706',
  },

  // === GHOST NORMAL SKILLS (5) ===
  [NormalSkillId.SpectralBolt]: {
    id: NormalSkillId.SpectralBolt,
    characterId: CharacterId.Ghost,
    name: 'Spectral Bolt',
    tag: 'Magic · Pierce',
    cooldown: 3.4,
    description:
      'The ghost launches a concentrated projectile of spiritual energy toward enemies, passing through multiple targets and damaging everything in its path.',
    detailLine: 'Piercing astral projectile · Phases through obstacles & all foes in line',
    accentColor: '#67E8F9',
  },
  [NormalSkillId.PhantomDash]: {
    id: NormalSkillId.PhantomDash,
    characterId: CharacterId.Ghost,
    name: 'Phantom Dash',
    tag: 'Phase · Mist Trail',
    cooldown: 4.5,
    description:
      'The ghost transforms into a fleeting mist and rapidly moves in a chosen direction, phasing through enemies and leaving behind a trail of spectral energy.',
    detailLine: 'Untargetable mist dash · Phases through foes & leaves haunting DoT wake',
    accentColor: '#C084FC',
  },
  [NormalSkillId.SoulDrain]: {
    id: NormalSkillId.SoulDrain,
    characterId: CharacterId.Ghost,
    name: 'Soul Drain',
    tag: 'Tendrils · Siphon',
    cooldown: 7.2,
    description:
      'The ghost releases ethereal tendrils that latch onto nearby enemies, draining their life force and transferring it into its own body.',
    detailLine: '2.4s mobile soul-tether channel · Deals magic DoT & heals per target',
    accentColor: '#A855F7',
  },
  [NormalSkillId.WailingScream]: {
    id: NormalSkillId.WailingScream,
    characterId: CharacterId.Ghost,
    name: 'Wailing Scream',
    tag: 'Wave · Fear',
    cooldown: 6.8,
    description:
      'The ghost unleashes a terrifying supernatural scream that sends out a wave of energy, damaging nearby enemies and frightening them into temporarily fleeing.',
    detailLine: 'Supernatural shockwave · Deals AoE magic damage & Fears foes for 2.8s',
    accentColor: '#E879F9',
  },
  [NormalSkillId.HauntedPossession]: {
    id: NormalSkillId.HauntedPossession,
    characterId: CharacterId.Ghost,
    name: 'Haunted Possession',
    tag: 'Possess · Disrupt',
    cooldown: 8.5,
    description:
      'The ghost temporarily possesses an enemy, disrupting its movements and forcing it to attack nearby enemies before escaping its body.',
    detailLine: '2.6s untargetable takeover · Host cleaves nearby foes + exorcism burst',
    accentColor: '#818CF8',
  },

  // === KOBOLD NORMAL SKILLS (5) ===
  [NormalSkillId.PiercingBolt]: {
    id: NormalSkillId.PiercingBolt,
    characterId: CharacterId.Kobold,
    name: 'Piercing Bolt',
    tag: 'Ranged · Line Pierce',
    cooldown: 3.6,
    description:
      'Fires a powerful crossbow bolt that pierces through multiple enemies in a straight line.',
    detailLine: 'High-velocity steel lance · Pierces all foes in line (+30% Crit)',
    accentColor: '#FB7185',
  },
  [NormalSkillId.RapidReload]: {
    id: NormalSkillId.RapidReload,
    characterId: CharacterId.Kobold,
    name: 'Rapid Reload',
    tag: 'Burst · 6 Bolts',
    cooldown: 4.4,
    description:
      'Quickly reloads and fires several crossbow bolts in rapid succession at nearby enemies.',
    detailLine: 'Snap-reloads & fires 6 high-speed bolts · Stacks Hunter’s Precision',
    accentColor: '#FBBF24',
  },
  [NormalSkillId.ExplosiveBolt]: {
    id: NormalSkillId.ExplosiveBolt,
    characterId: CharacterId.Kobold,
    name: 'Explosive Bolt',
    tag: 'Ranged · Blast AoE',
    cooldown: 5.4,
    description:
      'Fires a specially crafted bolt that explodes upon impact, damaging enemies caught in the blast.',
    detailLine: 'Blackpowder bolt detonates on impact · Heavy AoE blast & knockback',
    accentColor: '#F97316',
  },
  [NormalSkillId.SnareTrap]: {
    id: NormalSkillId.SnareTrap,
    characterId: CharacterId.Kobold,
    name: 'Snare Trap',
    tag: 'Trap · Root & Expose',
    cooldown: 6.2,
    description:
      'Places a hidden mechanical trap on the ground. Enemies who step on it become restrained and vulnerable to attacks.',
    detailLine: 'Hidden jaw-snare · Roots foes 2.8s & exposes them (+28% DMG taken)',
    accentColor: '#FDE047',
  },
  [NormalSkillId.MultiShot]: {
    id: NormalSkillId.MultiShot,
    characterId: CharacterId.Kobold,
    name: 'Multi-Shot',
    tag: 'Spread · Wide Fan',
    cooldown: 4.8,
    description:
      'Fires multiple bolts in different directions, striking several enemies surrounding the Kobold.',
    detailLine: 'Launches 7 bolts in a wide fan · Strikes surrounding foes & pushes close threats',
    accentColor: '#FDA4AF',
  },

  // === SLIME NORMAL SKILLS (5) ===
  [NormalSkillId.ArcaneOrb]: {
    id: NormalSkillId.ArcaneOrb,
    characterId: CharacterId.Slime,
    name: 'Arcane Orb',
    tag: 'Ranged · Arcane Blast',
    cooldown: 3.2,
    description:
      'Creates and launches a concentrated sphere of magical energy that travels toward enemies and explodes upon impact.',
    detailLine: 'High-density arcane projectile · Detonates in a high-damage AoE blast',
    accentColor: '#A855F7',
  },
  [NormalSkillId.PrismaticShards]: {
    id: NormalSkillId.PrismaticShards,
    characterId: CharacterId.Slime,
    name: 'Prismatic Shards',
    tag: 'Pierce · Ricochet Crystals',
    cooldown: 4.5,
    description:
      'Summons several magical crystals that shoot toward enemies. The crystals pierce through targets and can change direction to strike additional enemies.',
    detailLine: '5 piercing crystalline shards · Homing ricochet vectors between foes',
    accentColor: '#C084FC',
  },
  [NormalSkillId.GravityWell]: {
    id: NormalSkillId.GravityWell,
    characterId: CharacterId.Slime,
    name: 'Gravity Well',
    tag: 'Vortex · Crowd Control',
    cooldown: 6.5,
    description:
      'Creates a magical sphere that generates gravitational force, pulling nearby enemies toward its center and restricting their movement.',
    detailLine: '3.6s gravitational vortex · Continuously sucks enemies inward and slows them',
    accentColor: '#818CF8',
  },
  [NormalSkillId.ElementalCascade]: {
    id: NormalSkillId.ElementalCascade,
    characterId: CharacterId.Slime,
    name: 'Elemental Cascade',
    tag: 'Sky Rain · Multi-Element',
    cooldown: 5.8,
    description:
      'Summons a sequence of elemental projectiles that rain down over a selected area. Each projectile carries a different elemental effect.',
    detailLine: 'Rains fire, ice, and lightning meteors · Burns, chills, and shocks enemies',
    accentColor: '#38BDF8',
  },
  [NormalSkillId.ArcanePrison]: {
    id: NormalSkillId.ArcanePrison,
    characterId: CharacterId.Slime,
    name: 'Arcane Prison',
    tag: 'Barrier · Continuous Field',
    cooldown: 7.2,
    description:
      'Creates a magical barrier around a targeted area, trapping enemies inside while continuously damaging them with unstable magical energy.',
    detailLine: '4.5s boundary cage · Traps foes within & continuously deals unstable arcane DoT',
    accentColor: '#E879F9',
  },

  // === LIZARDFOLK NORMAL SKILLS (5) ===
  [NormalSkillId.PiercingJavelin]: {
    id: NormalSkillId.PiercingJavelin,
    characterId: CharacterId.Lizardfolk,
    name: 'Piercing Javelin',
    tag: 'Line Pierce · Returning',
    cooldown: 3.5,
    description:
      'Throws a powerful spear in a straight line, piercing through multiple enemies before returning to the Lizardfolk.',
    detailLine: 'Heavy piercing javelin · Deals double damage on the return flight',
    accentColor: '#10B981',
  },
  [NormalSkillId.TripleSpearToss]: {
    id: NormalSkillId.TripleSpearToss,
    characterId: CharacterId.Lizardfolk,
    name: 'Triple Spear Toss',
    tag: 'Fan Spread · Multi-Direction',
    cooldown: 4.2,
    description:
      'Rapidly throws three spears toward targeted enemies. Each spear follows a slightly different trajectory, allowing the Lizardfolk to attack multiple directions.',
    detailLine: 'Throws 3 lethal spears in a spread · High critical puncture damage',
    accentColor: '#34D399',
  },
  [NormalSkillId.ImpalingSpear]: {
    id: NormalSkillId.ImpalingSpear,
    characterId: CharacterId.Lizardfolk,
    name: 'Impaling Spear',
    tag: 'Heavy Pin · Root & Bleed',
    cooldown: 5.5,
    description:
      'Throws a heavy spear that pins the first enemy it hits to the ground. The spear remains embedded temporarily, restricting the enemy’s movement.',
    detailLine: 'Pins enemy for 3.0s · Inflicts heavy bleed and restricts all movement',
    accentColor: '#059669',
  },
  [NormalSkillId.HuntingMark]: {
    id: NormalSkillId.HuntingMark,
    characterId: CharacterId.Lizardfolk,
    name: 'Hunting Mark',
    tag: 'Target Lock · Homing Spears',
    cooldown: 6.0,
    description:
      'Marks a targeted enemy with a hunter’s symbol. The Lizardfolk’s subsequent spear attacks prioritize the marked target and can track its movement.',
    detailLine: 'Places Hunter Brand for 8s · All spears curve & home into the marked target (+30% DMG)',
    accentColor: '#F59E0B',
  },
  [NormalSkillId.SpearCyclone]: {
    id: NormalSkillId.SpearCyclone,
    characterId: CharacterId.Lizardfolk,
    name: 'Spear Cyclone',
    tag: 'Orbiting Blades · Whirlwind',
    cooldown: 6.8,
    description:
      'Throws several spinning spears around a selected area. The weapons rotate through the battlefield, repeatedly striking enemies before returning to the Lizardfolk.',
    detailLine: '4 spinning spears orbit for 4.2s · Repeatedly slashes and shreds nearby targets',
    accentColor: '#14B8A6',
  },
};

export const ULTIMATE_SKILLS: Record<UltimateSkillId, UltimateSkillDef> = {
  // === ZOMBIE ULTIMATE SKILLS (3) ===
  [UltimateSkillId.AbominationForm]: {
    id: UltimateSkillId.AbominationForm,
    characterId: CharacterId.Zombie,
    name: 'Abomination Form',
    tag: 'Transform · Juggernaut',
    cooldown: 20,
    energyRequired: 100,
    description:
      'The zombie transforms into a massive abomination, gaining tremendous strength, increased durability, and devastating close-range attacks.',
    detailLine: '10s Giant Form · +65% Attack · 50% Mitigation',
    accentColor: '#4ADE80',
  },
  [UltimateSkillId.KingdomOfTheDead]: {
    id: UltimateSkillId.KingdomOfTheDead,
    characterId: CharacterId.Zombie,
    name: 'Kingdom of the Dead',
    tag: 'Summon · Horde',
    cooldown: 22,
    energyRequired: 100,
    description:
      'The zombie summons a horde of undead that floods the battlefield, overwhelming enemies through sheer numbers and relentless attacks.',
    detailLine: 'Summons 7 Frenzied Zombies · Swarms entire crypt room',
    accentColor: '#A3E635',
  },
  [UltimateSkillId.DeathsEmbrace]: {
    id: UltimateSkillId.DeathsEmbrace,
    characterId: CharacterId.Zombie,
    name: "Death's Embrace",
    tag: 'Nova · Life Drain',
    cooldown: 18,
    energyRequired: 100,
    description:
      'The zombie slams the ground, unleashing a massive plague wave that damages surrounding enemies and absorbs their life force to restore its own health.',
    detailLine: 'Massive Plague Slam · Heals 14 HP per struck skeleton',
    accentColor: '#2DD4BF',
  },

  // === SKELETON ULTIMATE SKILLS (3) ===
  [UltimateSkillId.BoneColossus]: {
    id: UltimateSkillId.BoneColossus,
    characterId: CharacterId.Skeleton,
    name: 'Bone Colossus',
    tag: 'Transform · Titan',
    cooldown: 20,
    energyRequired: 100,
    description:
      'The skeleton absorbs nearby bones and transforms into a gigantic skeletal warrior, wielding enormous bone weapons and gaining tremendous physical strength.',
    detailLine: '10s Colossus Form · +70% Damage · +25% Crit',
    accentColor: '#38BDF8',
  },
  [UltimateSkillId.ArmyOfBones]: {
    id: UltimateSkillId.ArmyOfBones,
    characterId: CharacterId.Skeleton,
    name: 'Army of Bones',
    tag: 'Summon · Legion',
    cooldown: 22,
    energyRequired: 100,
    description:
      'The skeleton summons an army of skeletal warriors that emerge from the ground and fight alongside it, overwhelming enemies with coordinated attacks.',
    detailLine: 'Summons 6 Skeletal Sword-Warriors · Coordinated crits',
    accentColor: '#818CF8',
  },
  [UltimateSkillId.ReapersJudgment]: {
    id: UltimateSkillId.ReapersJudgment,
    characterId: CharacterId.Skeleton,
    name: "Reaper's Judgment",
    tag: 'Scythe · Dark Wave',
    cooldown: 18,
    energyRequired: 100,
    description:
      'The skeleton manifests a massive spectral scythe and performs a devastating sweeping attack, cutting through enemies in a wide area and releasing a wave of dark energy.',
    detailLine: 'Guaranteed Crit Scythe Sweep + Piercing Dark Wave',
    accentColor: '#C084FC',
  },

  // === GOBLIN ULTIMATE SKILLS (3) ===
  [UltimateSkillId.PhantomFrenzy]: {
    id: UltimateSkillId.PhantomFrenzy,
    characterId: CharacterId.Goblin,
    name: 'Phantom Frenzy',
    tag: 'Afterimages · Blitz',
    cooldown: 19,
    energyRequired: 100,
    description:
      'The goblin moves at extraordinary speed, creating multiple afterimages as it rapidly attacks surrounding enemies from different directions.',
    detailLine: '8 untargetable omnidirectional phantom strikes (+35% Crit)',
    accentColor: '#F59E0B',
  },
  [UltimateSkillId.KingOfThieves]: {
    id: UltimateSkillId.KingOfThieves,
    characterId: CharacterId.Goblin,
    name: 'King of Thieves',
    tag: 'Ambush · Steal',
    cooldown: 20,
    energyRequired: 100,
    description:
      'The goblin unleashes its full cunning, disappearing and reappearing around the battlefield while stealing the strength and vitality of enemies through successive surprise attacks.',
    detailLine: '6 chain ambushes · Drains HP & Gold + +35% Stolen Attack for 8s',
    accentColor: '#FBBF24',
  },
  [UltimateSkillId.ThousandDaggers]: {
    id: UltimateSkillId.ThousandDaggers,
    characterId: CharacterId.Goblin,
    name: 'Thousand Daggers',
    tag: 'Barrage · Sky Rain',
    cooldown: 18,
    energyRequired: 100,
    description:
      'The goblin throws a massive barrage of enchanted daggers into the air, raining them down across a large area and striking enemies from every direction.',
    detailLine: '360° dagger fan + 2.4s Enchanted Dagger Storm across a wide zone',
    accentColor: '#34D399',
  },

  // === GNOME ULTIMATE SKILLS (3) ===
  [UltimateSkillId.MountainsHeart]: {
    id: UltimateSkillId.MountainsHeart,
    characterId: CharacterId.Gnome,
    name: "Mountain's Heart",
    tag: 'Transform · Bastion',
    cooldown: 20,
    energyRequired: 100,
    description:
      'The gnome transforms its body into an enormous stone-armored form, becoming an almost immovable fortress with tremendous defensive strength.',
    detailLine: '10s Stone Fortress Form · 65% Mitigation · +55% Slam Damage',
    accentColor: '#FB923C',
  },
  [UltimateSkillId.TitansRampart]: {
    id: UltimateSkillId.TitansRampart,
    characterId: CharacterId.Gnome,
    name: "Titan's Rampart",
    tag: 'Stone Walls · Trap',
    cooldown: 21,
    energyRequired: 100,
    description:
      'The gnome summons massive stone walls around the battlefield, creating a protective barrier that blocks enemy attacks and traps enemies within its boundaries.',
    detailLine: '6.5s Stone Rampart Ring · Blocks projectiles & traps enemies inside',
    accentColor: '#D97706',
  },
  [UltimateSkillId.CataclysmicSlam]: {
    id: UltimateSkillId.CataclysmicSlam,
    characterId: CharacterId.Gnome,
    name: 'Cataclysmic Slam',
    tag: '3x Quake · Knockback',
    cooldown: 18,
    energyRequired: 100,
    description:
      'The gnome gathers enormous strength before delivering a devastating ground strike, unleashing waves of earth and stone that damage and knock enemies away.',
    detailLine: '3 expanding tectonic shockwaves · Heavy AoE stun & knockback',
    accentColor: '#F97316',
  },

  // === GHOST ULTIMATE SKILLS (3) ===
  [UltimateSkillId.EternalNightmare]: {
    id: UltimateSkillId.EternalNightmare,
    characterId: CharacterId.Ghost,
    name: 'Eternal Nightmare',
    tag: 'Dark Realm · Fear',
    cooldown: 20,
    energyRequired: 100,
    description:
      'The ghost transforms the battlefield into a realm of darkness, summoning terrifying apparitions that chase and attack enemies while continuously spreading fear.',
    detailLine: '8s Darkness Realm · Summons 4 Apparitions that hunt & Fear foes',
    accentColor: '#A855F7',
  },
  [UltimateSkillId.SpiritLegion]: {
    id: UltimateSkillId.SpiritLegion,
    characterId: CharacterId.Ghost,
    name: 'Spirit Legion',
    tag: 'Orbit · Charge',
    cooldown: 19,
    energyRequired: 100,
    description:
      'The ghost summons a legion of wandering spirits that surround it and charge toward nearby enemies, overwhelming them with successive spectral attacks.',
    detailLine: 'Summons 8 orbiting spirits that lock on & charge foes in spectral blasts',
    accentColor: '#67E8F9',
  },
  [UltimateSkillId.DeathsPassage]: {
    id: UltimateSkillId.DeathsPassage,
    characterId: CharacterId.Ghost,
    name: "Death's Passage",
    tag: 'Rift Pull · Detonate',
    cooldown: 18,
    energyRequired: 100,
    description:
      'The ghost opens a massive spectral rift beneath the battlefield, pulling nearby enemies into its center before unleashing an enormous explosion of spiritual energy.',
    detailLine: 'Massive abyssal vortex pulls foes inward then erupts in a spirit nova',
    accentColor: '#C084FC',
  },

  // === KOBOLD ULTIMATE SKILLS (3) ===
  [UltimateSkillId.DragonsBarrage]: {
    id: UltimateSkillId.DragonsBarrage,
    characterId: CharacterId.Kobold,
    name: "Dragon's Barrage",
    tag: 'Sky Rain · Wide Zone',
    cooldown: 18,
    energyRequired: 100,
    description:
      'Unleashes a massive barrage of enchanted crossbow bolts that rain down across a wide battlefield.',
    detailLine: '3.2s enchanted draconic bolt storm across a wide target area',
    accentColor: '#FB7185',
  },
  [UltimateSkillId.MasterArtificer]: {
    id: UltimateSkillId.MasterArtificer,
    characterId: CharacterId.Kobold,
    name: 'Master Artificer',
    tag: 'Deploy · 3 Turrets',
    cooldown: 21,
    energyRequired: 100,
    description:
      'Deploys several automated crossbow turrets that independently target and attack nearby enemies.',
    detailLine: 'Deploys 3 clockwork crossbow turrets for 12s · Auto-locks & fires bolts',
    accentColor: '#FBBF24',
  },
  [UltimateSkillId.KoboldsDeadlyArsenal]: {
    id: UltimateSkillId.KoboldsDeadlyArsenal,
    characterId: CharacterId.Kobold,
    name: "Kobold's Deadly Arsenal",
    tag: 'Sequence · Elemental',
    cooldown: 19,
    energyRequired: 100,
    description:
      'Unleashes a specially prepared collection of mechanical weapons, firing explosive, piercing, and elemental bolts in a devastating sequence.',
    detailLine: '9-volley mechanical sequence · Explosive, Piercing, Fire, Frost & Lightning bolts',
    accentColor: '#38BDF8',
  },

  // === SLIME ULTIMATE SKILLS (3) ===
  [UltimateSkillId.CataclysmOfElements]: {
    id: UltimateSkillId.CataclysmOfElements,
    characterId: CharacterId.Slime,
    name: 'Cataclysm of Elements',
    tag: 'Storm · Multi-Elemental',
    cooldown: 20,
    energyRequired: 100,
    description:
      'The Slime channels several elemental forces and unleashes a massive magical storm. Fire, ice, lightning, and arcane energy rain down across the battlefield.',
    detailLine: 'Massive elemental storm · Fire, ice, lightning & arcane meteors blanket the room',
    accentColor: '#A855F7',
  },
  [UltimateSkillId.AstralSingularity]: {
    id: UltimateSkillId.AstralSingularity,
    characterId: CharacterId.Slime,
    name: 'Astral Singularity',
    tag: 'Vortex · Catastrophic Collapse',
    cooldown: 22,
    energyRequired: 100,
    description:
      'Creates an enormous magical singularity that continuously pulls enemies toward its center. As the singularity grows, it absorbs magical energy before releasing a devastating explosion.',
    detailLine: '5.0s massive gravitational pull · Expands while devouring foes, then collapses in a huge blast',
    accentColor: '#6366F1',
  },
  [UltimateSkillId.PrimordialOverload]: {
    id: UltimateSkillId.PrimordialOverload,
    characterId: CharacterId.Slime,
    name: 'Primordial Overload',
    tag: 'Transform · Arcane Core',
    cooldown: 21,
    energyRequired: 100,
    description:
      'The Slime transforms into a gigantic floating magical core surrounded by rotating arcane crystals. It unleashes continuous waves of magical projectiles, beams, and explosive energy attacks across the battlefield.',
    detailLine: '9.0s gigantic floating core · Unleashes continuous arcane laser sweeps & crystal barrages',
    accentColor: '#C084FC',
  },

  // === LIZARDFOLK ULTIMATE SKILLS (3) ===
  [UltimateSkillId.RainOfJavelins]: {
    id: UltimateSkillId.RainOfJavelins,
    characterId: CharacterId.Lizardfolk,
    name: 'Rain of Javelins',
    tag: 'Skyfall · Pin & Impale',
    cooldown: 19,
    energyRequired: 100,
    description:
      'The Lizardfolk leaps backward and launches an enormous number of spears into the sky. The spears rain down across a large battlefield area, heavily damaging and pinning enemies beneath them.',
    detailLine: '3.8s heavy spear barrage · Punctures, bleeds, and pins all enemies in targeted zone',
    accentColor: '#10B981',
  },
  [UltimateSkillId.WorldPiercer]: {
    id: UltimateSkillId.WorldPiercer,
    characterId: CharacterId.Lizardfolk,
    name: 'World Piercer',
    tag: 'Colossal Lance · Infinite Pierce',
    cooldown: 20,
    energyRequired: 100,
    description:
      'Channels maximum physical focus and throws a colossal dragon-slaying spear that tears through the fabric of the battlefield, piercing through all enemies and barriers in an infinite line.',
    detailLine: 'Colossal dragon-slaying spear · Pierces infinite distance with immense critical shockwaves',
    accentColor: '#059669',
  },
  [UltimateSkillId.SpiritOfTheGreatHunt]: {
    id: UltimateSkillId.SpiritOfTheGreatHunt,
    characterId: CharacterId.Lizardfolk,
    name: 'Spirit of the Great Hunt',
    tag: 'Avatar · Primal Beasts',
    cooldown: 22,
    energyRequired: 100,
    description:
      'Awakens the primal spirit of the ancient hunter god, gaining tremendous attack speed, tracking spears, and spectral spirit beasts that aid in combat.',
    detailLine: '10s Primal God Avatar · +50% Attack Speed, auto-tracking spears, & spectral beasts',
    accentColor: '#F59E0B',
  },
};

export const ZOMBIE_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: PassiveSkillId.CarrionHunger,
    characterId: CharacterId.Zombie,
    name: 'Carrion Hunger',
    tag: 'Always Active · Sustain',
    description:
      'The zombie feeds on the lingering essence of defeated enemies to restore its vitality.',
    detailLine: 'Slain foes drop Vitality Essence restoring HP & Ultimate charge',
  },
  {
    id: PassiveSkillId.InfectiousTouch,
    characterId: CharacterId.Zombie,
    name: 'Infectious Touch',
    tag: 'Always Active · Contagion',
    description:
      "The zombie's attacks spread a contagious infection that weakens enemies over time.",
    detailLine: 'Hits stack Infection DoT (-18% enemy damage) · Splashes on death',
  },
];

export const SKELETON_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: PassiveSkillId.EternalFramework,
    characterId: CharacterId.Skeleton,
    name: 'Eternal Framework',
    tag: 'Always Active · Resilience',
    description:
      "The skeleton's bone structure is naturally resistant to physical attacks, allowing it to withstand punishment that would cripple other creatures.",
    detailLine: 'Reduces all incoming physical & projectile damage by 18%',
  },
  {
    id: PassiveSkillId.UnyieldingBones,
    characterId: CharacterId.Skeleton,
    name: 'Unyielding Bones',
    tag: 'Always Active · Fortify',
    description:
      'Whenever the skeleton withstands an enemy attack, its bones absorb the impact and become temporarily reinforced, increasing its resistance to subsequent attacks.',
    detailLine: 'Hits grant Unyielding stacks (up to 3x, +12% mitigation per stack for 5s)',
  },
];

export const GOBLIN_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: PassiveSkillId.NimbleReflexes,
    characterId: CharacterId.Goblin,
    name: 'Nimble Reflexes',
    tag: 'Always Active · Evasion',
    description:
      "The goblin's naturally heightened reflexes allow it to instinctively evade incoming attacks and maneuver through dangerous situations with exceptional agility.",
    detailLine: '25% base Evasion (up to 75% during Windrunner) + agility burst on dodge',
  },
  {
    id: PassiveSkillId.OpportunisticPredator,
    characterId: CharacterId.Goblin,
    name: 'Opportunistic Predator',
    tag: 'Always Active · Ambush',
    description:
      'The goblin excels at exploiting enemy weaknesses, becoming increasingly dangerous when attacking enemies from behind or targeting already weakened opponents.',
    detailLine: '+32% Damage & +25% Crit Chance vs backstabbed or weakened foes',
  },
];

export const GNOME_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: PassiveSkillId.UnbreakableFoundation,
    characterId: CharacterId.Gnome,
    name: 'Unbreakable Foundation',
    tag: 'Always Active · Armor',
    description:
      "The gnome's naturally dense body and sturdy bones provide exceptional resistance to physical attacks and strong resistance against knockback.",
    detailLine: '22% base Damage Reduction & strong resistance against knockback',
  },
  {
    id: PassiveSkillId.LastingResolve,
    characterId: CharacterId.Gnome,
    name: 'Lasting Resolve',
    tag: 'Always Active · Tenacity',
    description:
      'The closer the gnome gets to defeat, the more determined and resilient it becomes, gradually strengthening its defenses as its health drops.',
    detailLine: 'Grants up to +42% extra Damage Reduction dynamically as HP drops',
  },
];

export const GHOST_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: PassiveSkillId.EtherealBody,
    characterId: CharacterId.Ghost,
    name: 'Ethereal Body',
    tag: 'Always Active · Phase',
    description:
      "The ghost's incorporeal form allows it to naturally phase through physical obstacles and resist ordinary physical attacks.",
    detailLine: 'Phases freely through obstacles · 20% Physical Resist & 24% Phase Evasion',
  },
  {
    id: PassiveSkillId.RestlessSpirit,
    characterId: CharacterId.Ghost,
    name: 'Restless Spirit',
    tag: 'Always Active · Surge',
    description:
      'Whenever the ghost successfully avoids an enemy attack, its spiritual energy intensifies, temporarily increasing its movement speed and magical power.',
    detailLine: 'Evading or phasing attacks grants +28% Move Speed & +32% Magic Power for 4s',
  },
];

export const KOBOLD_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: PassiveSkillId.MechanicalExpertise,
    characterId: CharacterId.Kobold,
    name: 'Mechanical Expertise',
    tag: 'Always Active · Artifice',
    description:
      "The Kobold's knowledge of machinery allows it to handle crossbows and mechanical weapons with exceptional skill.",
    detailLine: '+18% Crossbow Fire Rate & Bolt Velocity · Deploying traps/turrets grants +25% Haste',
  },
  {
    id: PassiveSkillId.HuntersPrecision,
    characterId: CharacterId.Kobold,
    name: "Hunter's Precision",
    tag: 'Always Active · Weakspot',
    description:
      'Repeatedly attacking the same enemy allows the Kobold to identify its weaknesses and improve the accuracy of subsequent attacks.',
    detailLine: 'Hits stack Hunter Marks (up to 5x: +6% Crit Chance & +7% Bonus DMG per stack)',
  },
];

export const SLIME_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: PassiveSkillId.ArcaneConduit,
    characterId: CharacterId.Slime,
    name: 'Arcane Conduit',
    tag: 'Always Active · Arcane Amplification',
    description:
      "The Slime's gelatinous body naturally absorbs and circulates magical energy, allowing it to enhance the properties of its magical attacks.",
    detailLine: '+20% Arcane & Elemental Spell Damage · Casting spells grants +15% spell velocity & +10% area size',
  },
  {
    id: PassiveSkillId.UnstableMana,
    characterId: CharacterId.Slime,
    name: 'Unstable Mana',
    tag: 'Always Active · Arcane Detonation',
    description:
      'Whenever the Slime casts consecutive magical attacks, unstable energy accumulates within its body. Once enough energy gathers, its next magical attack produces an additional arcane explosion.',
    detailLine: 'Every 3 consecutive magic casts, release an unstable 360° Arcane Burst dealing heavy splash damage',
  },
];

export const LIZARDFOLK_PASSIVE_SKILLS: PassiveSkillDef[] = [
  {
    id: PassiveSkillId.PredatorsAccuracy,
    characterId: CharacterId.Lizardfolk,
    name: "Predator's Accuracy",
    tag: 'Always Active · Range Scaling',
    description:
      "The Lizardfolk's keen reptilian senses grant increased critical strike chance, extended vision range, and amplified damage the farther away the target is.",
    detailLine: '+20% Critical Strike Chance · Deals up to +40% bonus damage based on distance to the enemy',
  },
  {
    id: PassiveSkillId.HuntersInstinct,
    characterId: CharacterId.Lizardfolk,
    name: "Hunter's Instinct",
    tag: 'Always Active · Focus Reset',
    description:
      "Dodging or moving grants stacks of Hunter's Focus. At max stacks, the next spear throw is guaranteed to critically strike, pierce all targets, and reset the cooldown of Piercing Javelin.",
    detailLine: 'Moving generates Focus (max 5) · At 5 stacks, next spear is guaranteed 100% Crit, Pierces all, & resets Piercing Javelin CD',
  },
];

export const CHARACTER_ROSTER: Record<CharacterId, CharacterProfileDef> = {
  [CharacterId.Zombie]: {
    id: CharacterId.Zombie,
    name: 'Patch the Undying',
    archetypeName: 'Zombie',
    characterType: 'Melee · Poison · Summoner',
    role: 'A durable undead fighter who infects enemies, regenerates health, and summons lesser zombies.',
    portraitUrl: ZOMBIE_PORTRAIT_URL,
    accentColor: '#4ADE80',
    attackLabel: 'CLAW',
    baseHp: 130,
    baseSpeed: 196,
    baseAttackDamage: 18,
    baseAttackCooldown: 0.34,
    baseCritChance: 0.08,
    critMultiplier: 1.6,
    guildSpot: { x: -380, y: -20, facingX: 1 },
    normalSkillIds: [
      NormalSkillId.RottingClaw,
      NormalSkillId.PlagueBurst,
      NormalSkillId.FleshRipper,
      NormalSkillId.UndyingFlesh,
      NormalSkillId.GraveCall,
    ],
    ultimateSkillIds: [
      UltimateSkillId.AbominationForm,
      UltimateSkillId.KingdomOfTheDead,
      UltimateSkillId.DeathsEmbrace,
    ],
    passiveSkills: ZOMBIE_PASSIVE_SKILLS,
    defaultLoadout: {
      normalSkills: [NormalSkillId.RottingClaw, NormalSkillId.GraveCall],
      ultimateSkill: UltimateSkillId.DeathsEmbrace,
    },
  },
  [CharacterId.Skeleton]: {
    id: CharacterId.Skeleton,
    name: 'Vane the Boneblade',
    archetypeName: 'Skeleton',
    characterType: 'Melee · Physical Damage · Critical Strikes',
    role: 'A swift and agile undead warrior specializing in weapon mastery, bone manipulation, and precise attacks. Unlike the Zombie, the Skeleton relies on speed, technique, and critical strikes rather than regeneration and durability.',
    portraitUrl: SKELETON_PORTRAIT_URL,
    accentColor: '#38BDF8',
    attackLabel: 'SLASH',
    baseHp: 105,
    baseSpeed: 228,
    baseAttackDamage: 19,
    baseAttackCooldown: 0.27,
    baseCritChance: 0.28,
    critMultiplier: 1.85,
    guildSpot: { x: -80, y: 50, facingX: -1 },
    normalSkillIds: [
      NormalSkillId.BoneSlash,
      NormalSkillId.BoneSpear,
      NormalSkillId.RibcageShield,
      NormalSkillId.SkeletalRush,
      NormalSkillId.BoneStorm,
    ],
    ultimateSkillIds: [
      UltimateSkillId.BoneColossus,
      UltimateSkillId.ArmyOfBones,
      UltimateSkillId.ReapersJudgment,
    ],
    passiveSkills: SKELETON_PASSIVE_SKILLS,
    defaultLoadout: {
      normalSkills: [NormalSkillId.BoneSlash, NormalSkillId.BoneSpear],
      ultimateSkill: UltimateSkillId.ReapersJudgment,
    },
  },
  [CharacterId.Goblin]: {
    id: CharacterId.Goblin,
    name: 'Vex the Shadowblade',
    archetypeName: 'Goblin',
    characterType: 'Agility · Assassin · Critical Strikes',
    role: 'A quick and cunning fighter who specializes in rapid attacks, evasive movements, traps, and ambushes. Unlike stronger characters, the Goblin relies on speed, trickery, and exploiting enemy weaknesses.',
    portraitUrl: GOBLIN_PORTRAIT_URL,
    accentColor: '#F59E0B',
    attackLabel: 'STAB',
    baseHp: 94,
    baseSpeed: 248,
    baseAttackDamage: 15,
    baseAttackCooldown: 0.21,
    baseCritChance: 0.3,
    critMultiplier: 1.95,
    guildSpot: { x: 140, y: 70, facingX: 1 },
    normalSkillIds: [
      NormalSkillId.DaggerFlurry,
      NormalSkillId.Shadowstep,
      NormalSkillId.ExplosiveTrap,
      NormalSkillId.Windrunner,
      NormalSkillId.PoisonedBlades,
    ],
    ultimateSkillIds: [
      UltimateSkillId.PhantomFrenzy,
      UltimateSkillId.KingOfThieves,
      UltimateSkillId.ThousandDaggers,
    ],
    passiveSkills: GOBLIN_PASSIVE_SKILLS,
    defaultLoadout: {
      normalSkills: [NormalSkillId.DaggerFlurry, NormalSkillId.Shadowstep],
      ultimateSkill: UltimateSkillId.PhantomFrenzy,
    },
  },
  [CharacterId.Gnome]: {
    id: CharacterId.Gnome,
    name: 'Bram the Ironheart',
    archetypeName: 'Gnome',
    characterType: 'Tank · Defense · Crowd Control',
    role: 'A sturdy and resilient fighter who specializes in absorbing damage, protecting allies, and controlling enemy movements. Despite its small stature, the Gnome possesses incredible physical endurance, reinforced armor, and powerful defensive abilities.',
    portraitUrl: GNOME_PORTRAIT_URL,
    accentColor: '#FB923C',
    attackLabel: 'PUNCH',
    baseHp: 155,
    baseSpeed: 184,
    baseAttackDamage: 21,
    baseAttackCooldown: 0.36,
    baseCritChance: 0.1,
    critMultiplier: 1.65,
    guildSpot: { x: -360, y: 150, facingX: 1 },
    normalSkillIds: [
      NormalSkillId.IronFist,
      NormalSkillId.FortressStance,
      NormalSkillId.Groundbreaker,
      NormalSkillId.MagneticGuard,
      NormalSkillId.EarthenGrasp,
    ],
    ultimateSkillIds: [
      UltimateSkillId.MountainsHeart,
      UltimateSkillId.TitansRampart,
      UltimateSkillId.CataclysmicSlam,
    ],
    passiveSkills: GNOME_PASSIVE_SKILLS,
    defaultLoadout: {
      normalSkills: [NormalSkillId.IronFist, NormalSkillId.EarthenGrasp],
      ultimateSkill: UltimateSkillId.MountainsHeart,
    },
  },
  [CharacterId.Ghost]: {
    id: CharacterId.Ghost,
    name: 'Lyra the Whispering Wraith',
    archetypeName: 'Ghost',
    characterType: 'Magic · Evasion · Crowd Control',
    role: 'A mysterious spectral entity that manipulates spirits, shadows, and ethereal energy. The Ghost specializes in phasing through enemies, disappearing from danger, and attacking with supernatural abilities. It sacrifices physical durability for exceptional mobility and magical power.',
    portraitUrl: GHOST_PORTRAIT_URL,
    accentColor: '#C084FC',
    attackLabel: 'HAUNT',
    baseHp: 88,
    baseSpeed: 242,
    baseAttackDamage: 20,
    baseAttackCooldown: 0.28,
    baseCritChance: 0.22,
    critMultiplier: 1.85,
    guildSpot: { x: 380, y: -270, facingX: -1 },
    normalSkillIds: [
      NormalSkillId.SpectralBolt,
      NormalSkillId.PhantomDash,
      NormalSkillId.SoulDrain,
      NormalSkillId.WailingScream,
      NormalSkillId.HauntedPossession,
    ],
    ultimateSkillIds: [
      UltimateSkillId.EternalNightmare,
      UltimateSkillId.SpiritLegion,
      UltimateSkillId.DeathsPassage,
    ],
    passiveSkills: GHOST_PASSIVE_SKILLS,
    defaultLoadout: {
      normalSkills: [NormalSkillId.SpectralBolt, NormalSkillId.PhantomDash],
      ultimateSkill: UltimateSkillId.EternalNightmare,
    },
  },
  [CharacterId.Kobold]: {
    id: CharacterId.Kobold,
    name: 'Rikkit the Boltmaster',
    archetypeName: 'Kobold',
    characterType: 'Ranged · Traps · Critical Strikes',
    role: 'A cunning ranged fighter who specializes in crossbow mastery, mechanical traps, and tactical positioning. Uses different types of bolts to attack enemies from a distance and control the battlefield.',
    portraitUrl: KOBOLD_PORTRAIT_URL,
    accentColor: '#FB7185',
    attackLabel: 'SHOOT',
    baseHp: 96,
    baseSpeed: 234,
    baseAttackDamage: 16,
    baseAttackCooldown: 0.25,
    baseCritChance: 0.26,
    critMultiplier: 1.9,
    guildSpot: { x: 180, y: -270, facingX: 1 },
    normalSkillIds: [
      NormalSkillId.PiercingBolt,
      NormalSkillId.RapidReload,
      NormalSkillId.ExplosiveBolt,
      NormalSkillId.SnareTrap,
      NormalSkillId.MultiShot,
    ],
    ultimateSkillIds: [
      UltimateSkillId.DragonsBarrage,
      UltimateSkillId.MasterArtificer,
      UltimateSkillId.KoboldsDeadlyArsenal,
    ],
    passiveSkills: KOBOLD_PASSIVE_SKILLS,
    defaultLoadout: {
      normalSkills: [NormalSkillId.PiercingBolt, NormalSkillId.SnareTrap],
      ultimateSkill: UltimateSkillId.MasterArtificer,
    },
  },
  [CharacterId.Slime]: {
    id: CharacterId.Slime,
    name: 'Gloop the Arcane Core',
    archetypeName: 'Slime',
    characterType: 'Magic · Ranged · Crowd Control',
    role: 'A magical creature that manipulates its gelatinous body to channel powerful arcane energy. Specializes in long-range magical attacks, elemental spells, and battlefield control.',
    portraitUrl: SLIME_PORTRAIT_URL,
    accentColor: '#A855F7',
    attackLabel: 'PULSE',
    baseHp: 100,
    baseSpeed: 215,
    baseAttackDamage: 22,
    baseAttackCooldown: 0.3,
    baseCritChance: 0.18,
    critMultiplier: 1.8,
    guildSpot: { x: -180, y: -220, facingX: 1 },
    normalSkillIds: [
      NormalSkillId.ArcaneOrb,
      NormalSkillId.PrismaticShards,
      NormalSkillId.GravityWell,
      NormalSkillId.ElementalCascade,
      NormalSkillId.ArcanePrison,
    ],
    ultimateSkillIds: [
      UltimateSkillId.CataclysmOfElements,
      UltimateSkillId.AstralSingularity,
      UltimateSkillId.PrimordialOverload,
    ],
    passiveSkills: SLIME_PASSIVE_SKILLS,
    defaultLoadout: {
      normalSkills: [NormalSkillId.ArcaneOrb, NormalSkillId.GravityWell],
      ultimateSkill: UltimateSkillId.CataclysmOfElements,
    },
  },
  [CharacterId.Lizardfolk]: {
    id: CharacterId.Lizardfolk,
    name: 'Krazz the Primal Hunter',
    archetypeName: 'Lizardfolk',
    characterType: 'Ranged · Physical Damage · Marksman',
    role: 'A skilled reptilian hunter specializing in spear throwing, precision attacks, and long-range combat. Uses specially crafted spears with different properties to pierce enemies, control their movements, and attack multiple targets.',
    portraitUrl: LIZARDFOLK_PORTRAIT_URL,
    accentColor: '#10B981',
    attackLabel: 'SPEAR',
    baseHp: 110,
    baseSpeed: 236,
    baseAttackDamage: 24,
    baseAttackCooldown: 0.32,
    baseCritChance: 0.25,
    critMultiplier: 1.9,
    guildSpot: { x: 320, y: 120, facingX: -1 },
    normalSkillIds: [
      NormalSkillId.PiercingJavelin,
      NormalSkillId.TripleSpearToss,
      NormalSkillId.ImpalingSpear,
      NormalSkillId.HuntingMark,
      NormalSkillId.SpearCyclone,
    ],
    ultimateSkillIds: [
      UltimateSkillId.RainOfJavelins,
      UltimateSkillId.WorldPiercer,
      UltimateSkillId.SpiritOfTheGreatHunt,
    ],
    passiveSkills: LIZARDFOLK_PASSIVE_SKILLS,
    defaultLoadout: {
      normalSkills: [NormalSkillId.PiercingJavelin, NormalSkillId.SpearCyclone],
      ultimateSkill: UltimateSkillId.RainOfJavelins,
    },
  },
};

export const CHARACTER_LIST: CharacterProfileDef[] = [
  CHARACTER_ROSTER[CharacterId.Zombie],
  CHARACTER_ROSTER[CharacterId.Skeleton],
  CHARACTER_ROSTER[CharacterId.Goblin],
  CHARACTER_ROSTER[CharacterId.Gnome],
  CHARACTER_ROSTER[CharacterId.Ghost],
  CHARACTER_ROSTER[CharacterId.Kobold],
  CHARACTER_ROSTER[CharacterId.Slime],
  CHARACTER_ROSTER[CharacterId.Lizardfolk],
];

export function getNormalSkillsForCharacter(charId: CharacterId): NormalSkillDef[] {
  return CHARACTER_ROSTER[charId].normalSkillIds.map((id) => NORMAL_SKILLS[id]);
}

export function getUltimateSkillsForCharacter(charId: CharacterId): UltimateSkillDef[] {
  return CHARACTER_ROSTER[charId].ultimateSkillIds.map((id) => ULTIMATE_SKILLS[id]);
}

export interface CharacterUpgradeNodeDef {
  slot: UpgradeNodeSlot;
  name: string;
  summary: string;
  baseCost: number;
  costStep: number;
  maxRank: number;
  perRankLabel: string;
}

export interface CharacterUpgradePathDef {
  characterId: CharacterId;
  pathTitle: string;
  pathSubtitle: string;
  nodes: CharacterUpgradeNodeDef[];
}

export const CHARACTER_UPGRADE_PATHS: Record<CharacterId, CharacterUpgradePathDef> = {
  [CharacterId.Zombie]: {
    characterId: CharacterId.Zombie,
    pathTitle: 'Path of Undying Decay',
    pathSubtitle: 'Regeneration · Virulent Plague · Undead Horde',
    nodes: [
      {
        slot: 'pathA',
        name: 'Stitched Carcass',
        summary: 'Reinforces decaying tissue for massive vitality and richer Carrion Hunger sustain.',
        baseCost: 15,
        costStep: 12,
        maxRank: 6,
        perRankLabel: '+24 Max HP · +3 Carrion Essence Heal',
      },
      {
        slot: 'pathB',
        name: 'Festering Talons',
        summary: 'Hardens rotting claws to rend deeper wounds and prolong Rotting Claw movement slow.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+14% Claw & Slam Damage · +0.4s Slow',
      },
      {
        slot: 'pathC',
        name: 'Virulent Contagion',
        summary: 'Brews deadlier necrotic spores, boosting Plague & Infection damage and cloud size.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+20% Plague & Infection DoT · +8% Cloud Size',
      },
      {
        slot: 'pathD',
        name: 'Graveyard Pact',
        summary: 'Strengthens summoned shamblers with tougher bodies, fiercer bites, and longer life.',
        baseCost: 20,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+22% Zombie Minion Stats · +1.5s Lifespan',
      },
      {
        slot: 'pathE',
        name: 'Relentless Rot',
        summary: 'Quickens necrotic instincts while thickening Undying Flesh & Abomination armor.',
        baseCost: 22,
        costStep: 16,
        maxRank: 5,
        perRankLabel: '+5% Undying/Abom Guard · -6% Cooldowns',
      },
    ],
  },

  [CharacterId.Skeleton]: {
    characterId: CharacterId.Skeleton,
    pathTitle: 'Path of Bone Mastery',
    pathSubtitle: 'Weapon Technique · Critical Strikes · Calcified Guard',
    nodes: [
      {
        slot: 'pathA',
        name: 'Calcified Marrow',
        summary: 'Tempers skeletal structure for extra health and stronger Eternal Framework armor.',
        baseCost: 16,
        costStep: 12,
        maxRank: 6,
        perRankLabel: '+14 Max HP · +3% Physical & Arrow Guard',
      },
      {
        slot: 'pathB',
        name: 'Honed Boneblade',
        summary: 'Polishes bone sword, spears, and spectral scythe for higher damage and blade reach.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+13% Blade, Spear & Scythe Damage · +4% Reach',
      },
      {
        slot: 'pathC',
        name: 'Anatomical Precision',
        summary: 'Sharpens lethal swordplay to strike vital joints with higher crit rate and power.',
        baseCost: 18,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+4% Crit Chance · +12% Crit Damage',
      },
      {
        slot: 'pathD',
        name: 'Ossuary Arsenal',
        summary: 'Empowers Bone Storm & Skeletal Legion, and adds extra Ribcage Shield charges.',
        baseCost: 20,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+18% Storm & Legion Power · +1 Rib at R3 & R6',
      },
      {
        slot: 'pathE',
        name: 'Weightless Frame',
        summary: 'Lightens bone joints for faster footwork, swifter slashes, and shorter cooldowns.',
        baseCost: 22,
        costStep: 16,
        maxRank: 5,
        perRankLabel: '+5% Move & Attack Speed · -7% Cooldowns',
      },
    ],
  },

  [CharacterId.Goblin]: {
    characterId: CharacterId.Goblin,
    pathTitle: 'Path of Shadow Cunning',
    pathSubtitle: 'Evasive Footwork · Backstab Crits · Traps & Venom',
    nodes: [
      {
        slot: 'pathA',
        name: 'Shadow-Silk Cloak',
        summary: 'Weaves dusk-silk lining for nimble survivability and higher Nimble Reflexes dodge.',
        baseCost: 16,
        costStep: 13,
        maxRank: 6,
        perRankLabel: '+11 Max HP · +3% Base Evasion Chance',
      },
      {
        slot: 'pathB',
        name: 'Twin-Fang Tempo',
        summary: 'Balances curved twin daggers for deadlier slashes and relentless attack speed.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+12% Dagger & Ambush Damage · +6% Attack Speed',
      },
      {
        slot: 'pathC',
        name: "Cutthroat's Instinct",
        summary: 'Exploits openings ruthlessly, boosting Critical Chance and Opportunistic backstabs.',
        baseCost: 18,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+4% Crit Chance · +10% Backstab/Weakened Bonus',
      },
      {
        slot: 'pathD',
        name: "Saboteur's Alchemy",
        summary: 'Refines blackpowder charges and blade toxins for bigger blasts and deadlier venom.',
        baseCost: 20,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+24% Trap & Venom Power · +8% Blast Radius',
      },
      {
        slot: 'pathE',
        name: 'Cutpurse Hustle',
        summary: 'Heightens thief reflexes for faster sprint speed, Ult charge, and skill recovery.',
        baseCost: 22,
        costStep: 16,
        maxRank: 5,
        perRankLabel: '+5% Move Speed · +15% Ult Gain · -7% Cooldowns',
      },
    ],
  },

  [CharacterId.Gnome]: {
    characterId: CharacterId.Gnome,
    pathTitle: 'Path of the Living Mountain',
    pathSubtitle: 'Reinforced Armor · Seismic Crowd Control · Earthen Bastion',
    nodes: [
      {
        slot: 'pathA',
        name: 'Granite Core',
        summary: 'Reinforces dense gnome bone and bronze-stone plate for massive HP and armor.',
        baseCost: 16,
        costStep: 12,
        maxRank: 6,
        perRankLabel: '+26 Max HP · +2.5% Unbreakable Armor',
      },
      {
        slot: 'pathB',
        name: 'Hydraulic Gauntlets',
        summary: 'Pressurizes reinforced iron gauntlets for heavier punches and wider shockwaves.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+14% Gauntlet & Slam Damage · +5% Reach',
      },
      {
        slot: 'pathC',
        name: "Geomancer's Grip",
        summary: 'Deepens earthen control, extending stuns, Earthen Grasp roots, and stone damage.',
        baseCost: 18,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+0.25s Stun & Root · +18% Earth Skill Power',
      },
      {
        slot: 'pathD',
        name: 'Lodestone Plating',
        summary: 'Amplifies Fortress Stance armor, Magnetic Guard reflection, and Rampart duration.',
        baseCost: 20,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+20% Reflect & Rampart · +0.4s Stance/Guard',
      },
      {
        slot: 'pathE',
        name: 'Tectonic Cadence',
        summary: 'Stabilizes heavy armor joints for steadier stride, Ult gain, and faster cooldowns.',
        baseCost: 22,
        costStep: 16,
        maxRank: 5,
        perRankLabel: '+4% Move Speed · +15% Hit Ult Gain · -6% CDs',
      },
    ],
  },
  [CharacterId.Ghost]: {
    characterId: CharacterId.Ghost,
    pathTitle: 'Path of the Astral Veil',
    pathSubtitle: 'Incorporeal Evasion · Spirit Magic · Supernatural Terror',
    nodes: [
      {
        slot: 'pathA',
        name: 'Incorporeal Shroud',
        summary: 'Deepens spectral density, adding ectoplasmic vitality, phase evasion, and physical resist.',
        baseCost: 15,
        costStep: 12,
        maxRank: 6,
        perRankLabel: '+12 Max HP · +2.5% Phase Evade · +3% Phys Resist',
      },
      {
        slot: 'pathB',
        name: 'Supernatural Potency',
        summary: 'Sharpens basic spirit-claw arcs and Spectral Bolts with concentrated astral force.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+13% Spectral Attack & Bolt Magic Power',
      },
      {
        slot: 'pathC',
        name: 'Poltergeist Resonance',
        summary: 'Amplifies Soul Drain siphons, Phantom mist trails, and Death’s Passage rift explosions.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+18% Ethereal Skill Power & Drain Healing',
      },
      {
        slot: 'pathD',
        name: 'Dread Haunting',
        summary: 'Extends Wailing Scream fear, Haunted Possession control, and Apparition/Spirit strength.',
        baseCost: 20,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+0.3s Fear & Possession · +20% Spirit & Apparition Power',
      },
      {
        slot: 'pathE',
        name: 'Astral Drift',
        summary: 'Lightens spectral form for swift floating speed, Restless Spirit power, and lower cooldowns.',
        baseCost: 22,
        costStep: 16,
        maxRank: 5,
        perRankLabel: '+4.5% Move Speed · +8% Restless Surge · -6% CDs',
      },
    ],
  },
  [CharacterId.Kobold]: {
    characterId: CharacterId.Kobold,
    pathTitle: 'Path of Clockwork Precision',
    pathSubtitle: 'Repeating Crossbows · Mechanical Traps · Weakspot Crits',
    nodes: [
      {
        slot: 'pathA',
        name: 'Draconic Scale Vest',
        summary: 'Reinforces brigandine leather and dragon-scale plates for nimble ranged survival.',
        baseCost: 16,
        costStep: 12,
        maxRank: 6,
        perRankLabel: '+13 Max HP · +2.5% Evasive Reflex',
      },
      {
        slot: 'pathB',
        name: 'Tempered Steel Limbs',
        summary: 'Increases crossbow draw tension for deadlier bolts and faster repeating fire.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+13% Crossbow & Bolt Skill Damage · +4% Fire Rate',
      },
      {
        slot: 'pathC',
        name: 'Weakspot Optics',
        summary: 'Calibrates brass sighting lenses to amplify Critical Strikes and Hunter’s Precision.',
        baseCost: 18,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+4% Crit Chance · +12% Crit & Hunter Mark Bonus',
      },
      {
        slot: 'pathD',
        name: "Artificer's Gearwork",
        summary: 'Upgrades Snare Traps, Explosive Bolts, and Automated Crossbow Turrets.',
        baseCost: 20,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+22% Trap, Blast & Turret Power · +1.2s Turret Life',
      },
      {
        slot: 'pathE',
        name: 'Ratchet Crank Mechanism',
        summary: 'Oils clockwork cranks for swifter kiting footwork, Ult charge, and faster reloads.',
        baseCost: 22,
        costStep: 16,
        maxRank: 5,
        perRankLabel: '+5% Move Speed · +14% Ult Gain · -7% Cooldowns',
      },
    ],
  },
  [CharacterId.Slime]: {
    characterId: CharacterId.Slime,
    pathTitle: 'Path of Gelatinous Arcana',
    pathSubtitle: 'Arcane Conduit · Elemental Cascade · Singularity Power',
    nodes: [
      {
        slot: 'pathA',
        name: 'Amorphous Vitality',
        summary: 'Enriches gelatinous mass to absorb kinetic impacts and maintain high magical reserves.',
        baseCost: 16,
        costStep: 12,
        maxRank: 6,
        perRankLabel: '+14 Max HP · +3% Arcane Shielding',
      },
      {
        slot: 'pathB',
        name: 'Resonant Mana Core',
        summary: 'Intensifies the central arcane crystal for devastating spell impact and faster casting.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+14% Arcane & Elemental Damage · +4% Cast Haste',
      },
      {
        slot: 'pathC',
        name: 'Prismatic Focusing',
        summary: 'Tunes crystal facets to maximize spell critical strikes and Unstable Mana detonations.',
        baseCost: 18,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+4% Spell Crit · +14% Unstable Mana Explosion Area & DMG',
      },
      {
        slot: 'pathD',
        name: 'Gravitational Mastery',
        summary: 'Amplifies Gravity Well pull, Arcane Prison duration, and Singularity blast power.',
        baseCost: 20,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+22% Vortex Pull & Prison Field Power · +0.6s Duration',
      },
      {
        slot: 'pathE',
        name: 'Gelatinous Surge',
        summary: 'Enhances elastic fluidity for swift gliding, rapid ultimate accumulation, and reduced cooldowns.',
        baseCost: 22,
        costStep: 16,
        maxRank: 5,
        perRankLabel: '+4.5% Move Speed · +12% Ult Gain · -7% Cooldowns',
      },
    ],
  },
  [CharacterId.Lizardfolk]: {
    characterId: CharacterId.Lizardfolk,
    pathTitle: 'Path of the Apex Javelin',
    pathSubtitle: 'Spear Mastery · Precision Marksman · Ancient Hunt Avatar',
    nodes: [
      {
        slot: 'pathA',
        name: 'Reptilian Vigor',
        summary: 'Hardens scaled hide and tones sinewy muscles for superior survival in close quarters.',
        baseCost: 16,
        costStep: 12,
        maxRank: 6,
        perRankLabel: '+15 Max HP · +3% Physical Evasion',
      },
      {
        slot: 'pathB',
        name: 'Honed Spearheads',
        summary: 'Forges razor obsidian and hardened steel tips for devastating puncture damage.',
        baseCost: 18,
        costStep: 14,
        maxRank: 6,
        perRankLabel: '+15% Spear & Javelin Damage · +5% Throw Velocity',
      },
      {
        slot: 'pathC',
        name: 'Predatory Instincts',
        summary: 'Sharpens hunting senses to amplify long-range critical hits and Hunter Mark damage.',
        baseCost: 18,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+4.5% Crit Chance · +15% Distance Scaling & Mark Bonus',
      },
      {
        slot: 'pathD',
        name: 'Weapon Cyclone Art',
        summary: 'Refines multi-spear throwing techniques for Spear Cyclone, Rain of Javelins, and Impale.',
        baseCost: 20,
        costStep: 15,
        maxRank: 6,
        perRankLabel: '+20% Spear Cyclone & Rain Duration/DMG · +0.8s Impale Pin',
      },
      {
        slot: 'pathE',
        name: 'Stalker Gait',
        summary: 'Lightens footfalls to generate Hunter’s Focus rapidly and kite enemies effortlessly.',
        baseCost: 22,
        costStep: 16,
        maxRank: 5,
        perRankLabel: '+5% Move Speed · +14% Focus Generation · -6% Cooldowns',
      },
    ],
  },
};

export function getUpgradePathForCharacter(charId: CharacterId): CharacterUpgradePathDef {
  return CHARACTER_UPGRADE_PATHS[charId] ?? CHARACTER_UPGRADE_PATHS[CharacterId.Zombie];
}

/**
 * Character-exclusive Lantern Statue Blessings.
 * Every skill-specific blessing carries `requiredNormalSkill` or `requiredUltimateSkill`
 * so ONLY blessings matching the player's currently equipped skills (plus innate/core blessings)
 * can ever appear inside the dungeon!
 */
export const CHARACTER_STATUE_BLESSINGS: Record<CharacterId, RunBlessing[]> = {
  // === ZOMBIE STATUE BLESSINGS (4 Core/Passive + 5 Normal-Gated + 3 Ult-Gated) ===
  [CharacterId.Zombie]: [
    {
      id: 'zombie_bloated_carcass',
      characterId: CharacterId.Zombie,
      name: 'Bloated Carcass',
      category: 'Vitality · Spores',
      description: '+22 Max HP, heals 22 HP now, and bursts a toxic cloud when hit.',
    },
    {
      id: 'zombie_necrotic_claws',
      characterId: CharacterId.Zombie,
      name: 'Necrotic Talons',
      category: 'Basic Claw · Gas',
      description: '+12% Claw damage; every 3rd basic slash spawns a toxic gas puff.',
    },
    {
      id: 'zombie_feast_of_rot',
      characterId: CharacterId.Zombie,
      name: 'Gorged Carrion',
      category: 'Carrion Hunger',
      description: 'Carrion Hunger orbs heal +5 extra HP and grant +14% Ult charge.',
    },
    {
      id: 'zombie_virulent_strain',
      characterId: CharacterId.Zombie,
      name: 'Black Blight',
      category: 'Infectious Touch',
      description: 'Infections stack to 4x, deal +15% DoT, and burst wider on kill.',
    },
    {
      id: 'zombie_skill_rotting_claw',
      characterId: CharacterId.Zombie,
      name: 'Festering Mauling',
      category: 'Rotting Claw · 4-Hit',
      description: 'Rotting Claw strikes 4 times, deals +12% damage, and stacks 2 Infection.',
      requiredNormalSkill: NormalSkillId.RottingClaw,
    },
    {
      id: 'zombie_skill_plague_burst',
      characterId: CharacterId.Zombie,
      name: 'Miasma Eruption',
      category: 'Plague Burst · Wide',
      description: 'Plague Burst covers +18% wider area, lasts +1s, and slows foes 20%.',
      requiredNormalSkill: NormalSkillId.PlagueBurst,
    },
    {
      id: 'zombie_skill_flesh_ripper',
      characterId: CharacterId.Zombie,
      name: 'Gore Lunge',
      category: 'Flesh Ripper · Trail',
      description: 'Flesh Ripper deals +15% damage, heals 3 HP/hit, and leaves toxic gas.',
      requiredNormalSkill: NormalSkillId.FleshRipper,
    },
    {
      id: 'zombie_skill_undying_flesh',
      characterId: CharacterId.Zombie,
      name: 'Spined Carapace',
      category: 'Undying Flesh · Ward',
      description: 'Undying Flesh lasts +1.2s longer and pulses necrotic thorns nearby.',
      requiredNormalSkill: NormalSkillId.UndyingFlesh,
    },
    {
      id: 'zombie_skill_grave_call',
      characterId: CharacterId.Zombie,
      name: 'Overflowing Graves',
      category: 'Grave Call · Pack',
      description: 'Grave Call raises +1 extra frenzied zombie with +12% move speed.',
      requiredNormalSkill: NormalSkillId.GraveCall,
    },
    {
      id: 'zombie_ult_abomination',
      characterId: CharacterId.Zombie,
      name: 'Behemoth Mutation',
      category: 'Abomination Form',
      description: 'Abomination Form lasts +2s, heals +10% HP, and resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.AbominationForm,
    },
    {
      id: 'zombie_ult_kingdom',
      characterId: CharacterId.Zombie,
      name: 'Lord of Graves',
      category: 'Kingdom of the Dead',
      description: 'Kingdom of the Dead raises +1 extra zombie and resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.KingdomOfTheDead,
    },
    {
      id: 'zombie_ult_embrace',
      characterId: CharacterId.Zombie,
      name: 'Ravenous Embrace',
      category: "Death's Embrace",
      description: "Death's Embrace deals +20% damage, drains +5 HP/foe, & resets Skills.",
      requiredUltimateSkill: UltimateSkillId.DeathsEmbrace,
    },
    // Strategic Build Expansion — Zombie Core, Normal & Ultimate Specializations
    {
      id: 'zombie_putrid_frenzy',
      characterId: CharacterId.Zombie,
      name: 'Putrid Frenzy',
      category: 'Plague · Tempo',
      description: '+15% Attack & Move Speed while any Infected enemy is nearby.',
    },
    {
      id: 'zombie_corpse_glutton',
      characterId: CharacterId.Zombie,
      name: 'Graveyard Glutton',
      category: 'Execute · Leech',
      description: '+24% damage vs foes below 35% HP; slaying Infected foes heals 4 HP.',
    },
    {
      id: 'zombie_miasma_shroud',
      characterId: CharacterId.Zombie,
      name: 'Miasma Shroud',
      category: 'Aura · Blight',
      description: 'Pulses a necrotic ring every 1.8s in combat, dealing plague dmg & 1 Infection.',
    },
    {
      id: 'zombie_stitchwork_hide',
      characterId: CharacterId.Zombie,
      name: 'Stitchwork Hide',
      category: 'Guard · Fury',
      description: '+12% Damage Reduction; taking damage grants +7% bonus Ultimate charge.',
    },
    {
      id: 'zombie_skill_rotting_claw_alt',
      characterId: CharacterId.Zombie,
      name: 'Leeching Talons',
      category: 'Rotting Claw · Drain',
      description: 'Rotting Claw heals 2 HP per enemy hit and cuts CD by 0.6s on final rend.',
      requiredNormalSkill: NormalSkillId.RottingClaw,
    },
    {
      id: 'zombie_skill_plague_burst_alt',
      characterId: CharacterId.Zombie,
      name: 'Corpse Detonation',
      category: 'Plague Burst · Blast',
      description: 'Plague Burst deals +40% upfront blast damage and stuns Infected foes 0.7s.',
      requiredNormalSkill: NormalSkillId.PlagueBurst,
    },
    {
      id: 'zombie_skill_flesh_ripper_alt',
      characterId: CharacterId.Zombie,
      name: "Predator's Pounce",
      category: 'Flesh Ripper · Reset',
      description: 'Flesh Ripper gains +30% Crit Chance, heals 4 HP/hit, & refunds 35% CD on hit.',
      requiredNormalSkill: NormalSkillId.FleshRipper,
    },
    {
      id: 'zombie_skill_undying_flesh_alt',
      characterId: CharacterId.Zombie,
      name: 'Putrid Bloodshield',
      category: 'Undying Flesh · Surge',
      description: 'Undying Flesh heals 14% Max HP immediately & grants +20% Attack Damage while active.',
      requiredNormalSkill: NormalSkillId.UndyingFlesh,
    },
    {
      id: 'zombie_skill_grave_call_alt',
      characterId: CharacterId.Zombie,
      name: 'Volatile Shamblers',
      category: 'Grave Call · Nova',
      description: 'Shamblers deal +25% bite damage and Grave Call erupts a plague nova on cast.',
      requiredNormalSkill: NormalSkillId.GraveCall,
    },
    {
      id: 'zombie_ult_abomination_alt',
      characterId: CharacterId.Zombie,
      name: 'Mutagenic Rampage',
      category: 'Abomination · Extend',
      description: 'Abomination stomps 30% faster; kills while active extend duration by +0.6s.',
      requiredUltimateSkill: UltimateSkillId.AbominationForm,
    },
    {
      id: 'zombie_ult_kingdom_alt',
      characterId: CharacterId.Zombie,
      name: "Plaguebearers' March",
      category: 'Kingdom of the Dead',
      description: 'Kingdom of the Dead heals 18% Max HP and blankets the arena in toxic gas.',
      requiredUltimateSkill: UltimateSkillId.KingdomOfTheDead,
    },
    {
      id: 'zombie_ult_embrace_alt',
      characterId: CharacterId.Zombie,
      name: 'Necrotic Singularity',
      category: "Death's Embrace",
      description: "Death's Embrace stuns foes 1.2s and refunds 25% Ult charge when hitting 3+.",
      requiredUltimateSkill: UltimateSkillId.DeathsEmbrace,
    },
  ],

  // === SKELETON STATUE BLESSINGS (4 Core/Passive + 5 Normal-Gated + 3 Ult-Gated) ===
  [CharacterId.Skeleton]: [
    {
      id: 'skel_ivory_edge',
      characterId: CharacterId.Skeleton,
      name: 'Ivory Executioner',
      category: 'Critical · Blade',
      description: '+10% Crit Chance and +18% Crit Damage with all bone weapons.',
    },
    {
      id: 'skel_splinter_burst',
      characterId: CharacterId.Skeleton,
      name: 'Shattering Marrow',
      category: 'Crit · Splinters',
      description: 'Critical Strikes burst light bone splinters into nearby foes.',
    },
    {
      id: 'skel_fortified_ribs',
      characterId: CharacterId.Skeleton,
      name: 'Aegis of Marrow',
      category: 'Unyielding Bones',
      description: '+18 Max HP, heals 18 HP now, and Unyielding Bones stacks up to 4x.',
    },
    {
      id: 'skel_phantom_stride',
      characterId: CharacterId.Skeleton,
      name: 'Wraithbone Tempo',
      category: 'Speed · Haste',
      description: '+10% move & attack speed and -10% equipped Skill cooldowns.',
    },
    {
      id: 'skel_skill_bone_slash',
      characterId: CharacterId.Skeleton,
      name: 'Crescent Ossuary',
      category: 'Bone Slash · Wave',
      description: 'Bone Slash deals +14% damage and launches a piercing bone wave.',
      requiredNormalSkill: NormalSkillId.BoneSlash,
    },
    {
      id: 'skel_skill_bone_spear',
      characterId: CharacterId.Skeleton,
      name: 'Twin-Spine Lance',
      category: 'Bone Spear · Volley',
      description: 'Bone Spear fires 2 piercing lances with +12% Crit Chance.',
      requiredNormalSkill: NormalSkillId.BoneSpear,
    },
    {
      id: 'skel_skill_ribcage_shield',
      characterId: CharacterId.Skeleton,
      name: 'Spiked Sternum',
      category: 'Ribcage Shield · Nova',
      description: 'Ribcage Shield gains +1 rib charge and shatters foes on block.',
      requiredNormalSkill: NormalSkillId.RibcageShield,
    },
    {
      id: 'skel_skill_skeletal_rush',
      characterId: CharacterId.Skeleton,
      name: 'Phantom Dash',
      category: 'Skeletal Rush · Crit',
      description: 'Skeletal Rush gains +25% Crit Chance & refunds 0.8s CD on hit.',
      requiredNormalSkill: NormalSkillId.SkeletalRush,
    },
    {
      id: 'skel_skill_bone_storm',
      characterId: CharacterId.Skeleton,
      name: 'Maelstrom of Shards',
      category: 'Bone Storm · Vortex',
      description: 'Bone Storm lasts +1.5s longer with +15% wider vortex radius & power.',
      requiredNormalSkill: NormalSkillId.BoneStorm,
    },
    {
      id: 'skel_ult_colossus',
      characterId: CharacterId.Skeleton,
      name: 'Dread Colossus',
      category: 'Bone Colossus',
      description: 'Bone Colossus lasts +2s, pulses faster quakes, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.BoneColossus,
    },
    {
      id: 'skel_ult_army',
      characterId: CharacterId.Skeleton,
      name: 'Immortal Phalanx',
      category: 'Army of Bones',
      description: 'Army of Bones raises +1 extra Bone Warrior and resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.ArmyOfBones,
    },
    {
      id: 'skel_ult_reaper',
      characterId: CharacterId.Skeleton,
      name: 'Soul Harvest',
      category: "Reaper's Judgment",
      description: "Reaper's Judgment fires 3 Dark Waves, heals 12 HP, & resets Skills.",
      requiredUltimateSkill: UltimateSkillId.ReapersJudgment,
    },
    // Strategic Build Expansion — Skeleton Core, Normal & Ultimate Specializations
    {
      id: 'skel_marrow_piercer',
      characterId: CharacterId.Skeleton,
      name: 'Marrow Piercer',
      category: 'Opener · Crit Haste',
      description: '+22% damage vs foes above 70% HP or Bosses; Crits cut Skill CDs by 0.3s.',
    },
    {
      id: 'skel_grim_ossuary',
      characterId: CharacterId.Skeleton,
      name: 'Grim Ossuary',
      category: 'Unyielding · Soul',
      description: 'Unyielding Bones grants +5% extra DR per stack; kills grant +7% Ult charge.',
    },
    {
      id: 'skel_deathrattler_tempo',
      characterId: CharacterId.Skeleton,
      name: 'Deathrattler Stride',
      category: 'Kill Surge · Crit',
      description: 'Slaying an enemy grants +20% Move Speed and +15% Crit Chance for 3.5s.',
    },
    {
      id: 'skel_serrated_femur',
      characterId: CharacterId.Skeleton,
      name: 'Serrated Blade',
      category: 'Reach · Finisher',
      description: '+14% basic slash reach and +24% damage on every 3rd combo finisher.',
    },
    {
      id: 'skel_skill_bone_slash_alt',
      characterId: CharacterId.Skeleton,
      name: "Executioner's Cleave",
      category: 'Bone Slash · Execute',
      description: 'Bone Slash guarantees a Critical Strike vs foes below 50% HP & cuts CD 1s.',
      requiredNormalSkill: NormalSkillId.BoneSlash,
    },
    {
      id: 'skel_skill_bone_spear_alt',
      characterId: CharacterId.Skeleton,
      name: 'Impaling Javelin',
      category: 'Bone Spear · Stun',
      description: 'Bone Spear deals +28% damage, flies 20% faster, & stuns pierced foes 0.6s.',
      requiredNormalSkill: NormalSkillId.BoneSpear,
    },
    {
      id: 'skel_skill_ribcage_shield_alt',
      characterId: CharacterId.Skeleton,
      name: 'Calcified Bastion',
      category: 'Ribcage Shield · Mend',
      description: 'Ribcage Shield grants 2 Unyielding stacks on cast & heals 4 HP per block.',
      requiredNormalSkill: NormalSkillId.RibcageShield,
    },
    {
      id: 'skel_skill_skeletal_rush_alt',
      characterId: CharacterId.Skeleton,
      name: "Reaper's Wake",
      category: 'Skeletal Rush · Volley',
      description: 'Skeletal Rush fires 2 piercing Bone Spears forward & grants +10% Ult charge.',
      requiredNormalSkill: NormalSkillId.SkeletalRush,
    },
    {
      id: 'skel_skill_bone_storm_alt',
      characterId: CharacterId.Skeleton,
      name: 'Siphoning Vortex',
      category: 'Bone Storm · Leech',
      description: 'Gain +18% Move Speed during Bone Storm and heal 2 HP when its hits crit.',
      requiredNormalSkill: NormalSkillId.BoneStorm,
    },
    {
      id: 'skel_ult_colossus_alt',
      characterId: CharacterId.Skeleton,
      name: "Sovereign's Wrath",
      category: 'Bone Colossus · Barrage',
      description: 'Bone Colossus slam deals +45% damage and fires 8 radial Bone Spears.',
      requiredUltimateSkill: UltimateSkillId.BoneColossus,
    },
    {
      id: 'skel_ult_army_alt',
      characterId: CharacterId.Skeleton,
      name: 'Ossuary Warcry',
      category: 'Army of Bones · Rally',
      description: 'Army of Bones grants max Unyielding stacks, heals 16 HP, & empowers warriors.',
      requiredUltimateSkill: UltimateSkillId.ArmyOfBones,
    },
    {
      id: 'skel_ult_reaper_alt',
      characterId: CharacterId.Skeleton,
      name: 'Guillotine Decree',
      category: "Reaper's Judgment",
      description: "Reaper's Judgment deals +30% sweep damage and refunds 25% Ultimate charge.",
      requiredUltimateSkill: UltimateSkillId.ReapersJudgment,
    },
  ],

  // === GOBLIN STATUE BLESSINGS (4 Core/Passive + 5 Normal-Gated + 3 Ult-Gated) ===
  [CharacterId.Goblin]: [
    {
      id: 'gob_throat_seeker',
      characterId: CharacterId.Goblin,
      name: 'Heartseeker Fangs',
      category: 'Opportunistic · Crit',
      description: '+12% Crit Chance and +20% Crit Damage on backstabs & weak foes.',
    },
    {
      id: 'gob_shadow_clone',
      characterId: CharacterId.Goblin,
      name: 'Mirage Decoy',
      category: 'Nimble Reflexes',
      description: '+6% Evasion; dodging unleashes a spinning shadow counter-slash.',
    },
    {
      id: 'gob_viper_toxin',
      characterId: CharacterId.Goblin,
      name: 'Nightshade Fangs',
      category: 'Daggers · Weaken',
      description: 'Basic dagger strikes have a 50% chance to coat enemies in Weakening Venom.',
    },
    {
      id: 'gob_quicksilver_boots',
      characterId: CharacterId.Goblin,
      name: 'Quicksilver Step',
      category: 'Agility · Reset',
      description: '+10% move speed; slaying an enemy cuts equipped Skill CDs by 0.6s.',
    },
    {
      id: 'gob_skill_dagger_flurry',
      characterId: CharacterId.Goblin,
      name: 'Sevenfold Cuts',
      category: 'Dagger Flurry · 6-Hit',
      description: 'Dagger Flurry unleashes 6 rapid strikes ending in a crit slash.',
      requiredNormalSkill: NormalSkillId.DaggerFlurry,
    },
    {
      id: 'gob_skill_shadowstep',
      characterId: CharacterId.Goblin,
      name: 'Umbral Ambush',
      category: 'Shadowstep · Crit',
      description: 'Shadowstep guarantees a Critical Backstab and cuts CD by 1s on hit.',
      requiredNormalSkill: NormalSkillId.Shadowstep,
    },
    {
      id: 'gob_skill_explosive_trap',
      characterId: CharacterId.Goblin,
      name: 'Goblin Kegpowder',
      category: 'Explosive Trap · Gas',
      description: 'Explosive Traps deal +20% damage and leave a toxic venom cloud.',
      requiredNormalSkill: NormalSkillId.ExplosiveTrap,
    },
    {
      id: 'gob_skill_windrunner',
      characterId: CharacterId.Goblin,
      name: 'Zephyr Gale',
      category: 'Windrunner · Blades',
      description: 'Windrunner lasts +1.2s and throws enchanted daggers when striking.',
      requiredNormalSkill: NormalSkillId.Windrunner,
    },
    {
      id: 'gob_skill_poisoned_blades',
      characterId: CharacterId.Goblin,
      name: 'Corrosive Vials',
      category: 'Poisoned Blades · DoT',
      description: 'Poisoned Blades lasts +1.5s, stacks faster, & deals +18% venom DoT.',
      requiredNormalSkill: NormalSkillId.PoisonedBlades,
    },
    {
      id: 'gob_ult_phantom',
      characterId: CharacterId.Goblin,
      name: 'Endless Mirage',
      category: 'Phantom Frenzy',
      description: 'Phantom Frenzy strikes 9 times, heals 12 HP, & resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.PhantomFrenzy,
    },
    {
      id: 'gob_ult_thieves',
      characterId: CharacterId.Goblin,
      name: 'Royal Plunder',
      category: 'King of Thieves',
      description: 'King of Thieves chains 7 ambushes, steals +1 gold, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.KingOfThieves,
    },
    {
      id: 'gob_ult_thousand',
      characterId: CharacterId.Goblin,
      name: 'Emerald Tempest',
      category: 'Thousand Daggers',
      description: 'Thousand Daggers lasts +0.8s, widens +12%, and resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.ThousandDaggers,
    },
    // Strategic Build Expansion — Goblin Core, Normal & Ultimate Specializations
    {
      id: 'gob_gilded_cutthroat',
      characterId: CharacterId.Goblin,
      name: 'Gilded Cutthroat',
      category: 'Gold · Scaling DMG',
      description: 'Slain foes drop +3 Gold; gain +1% damage per 10 Gold carried (up to +25%).',
    },
    {
      id: 'gob_executioner_guile',
      characterId: CharacterId.Goblin,
      name: "Executioner's Guile",
      category: 'Execute · Crit',
      description: 'Guaranteed Critical Strikes vs foes below 30% HP and +15% Ambush damage.',
    },
    {
      id: 'gob_shadow_veil',
      characterId: CharacterId.Goblin,
      name: 'Shadow-Silk Veil',
      category: 'Vitality · Dodge',
      description: '+16 Max HP, heals 16 HP now, +5% Evasion, & +6% Ult charge on dodge.',
    },
    {
      id: 'gob_festering_toxins',
      characterId: CharacterId.Goblin,
      name: 'Festering Toxins',
      category: 'Venom · Amplify',
      description: 'Poisoned or Slowed enemies suffer +18% bonus damage from all sources.',
    },
    {
      id: 'gob_skill_dagger_flurry_alt',
      characterId: CharacterId.Goblin,
      name: 'Venomous Barrage',
      category: 'Dagger Flurry · Leech',
      description: 'Dagger Flurry coats every hit in Venom and heals 4 HP on the final slash.',
      requiredNormalSkill: NormalSkillId.DaggerFlurry,
    },
    {
      id: 'gob_skill_shadowstep_alt',
      characterId: CharacterId.Goblin,
      name: 'Flashpowder Blink',
      category: 'Shadowstep · Stun',
      description: 'Shadowstep detonates a blinding smoke bomb on arrival, stunning foes 0.8s.',
      requiredNormalSkill: NormalSkillId.Shadowstep,
    },
    {
      id: 'gob_skill_explosive_trap_alt',
      characterId: CharacterId.Goblin,
      name: 'Cluster Charges',
      category: 'Explosive Trap · Twin',
      description: 'Deploys 2 Explosive Traps side-by-side that arm faster and stun 0.5s.',
      requiredNormalSkill: NormalSkillId.ExplosiveTrap,
    },
    {
      id: 'gob_skill_windrunner_alt',
      characterId: CharacterId.Goblin,
      name: 'Cyclone Reflex',
      category: 'Windrunner · Crit',
      description: 'Windrunner grants +20% Crit Chance while active and blasts foes on cast.',
      requiredNormalSkill: NormalSkillId.Windrunner,
    },
    {
      id: 'gob_skill_poisoned_blades_alt',
      characterId: CharacterId.Goblin,
      name: 'Neurotoxin Coating',
      category: 'Poisoned Blades · Slow',
      description: 'Poisoned Blades slows foes 18% more and adds +15% Crit Chance while active.',
      requiredNormalSkill: NormalSkillId.PoisonedBlades,
    },
    {
      id: 'gob_ult_phantom_alt',
      characterId: CharacterId.Goblin,
      name: 'Gale Assassination',
      category: 'Phantom Frenzy · Haste',
      description: 'Phantom Frenzy triggers Windrunner for 4s and coats every strike in Venom.',
      requiredUltimateSkill: UltimateSkillId.PhantomFrenzy,
    },
    {
      id: 'gob_ult_thieves_alt',
      characterId: CharacterId.Goblin,
      name: 'Crown of Greed',
      category: 'King of Thieves · Buff',
      description: 'King of Thieves extends Stolen Might +3s and activates Poisoned Blades 5s.',
      requiredUltimateSkill: UltimateSkillId.KingOfThieves,
    },
    {
      id: 'gob_ult_thousand_alt',
      characterId: CharacterId.Goblin,
      name: 'Shrapnel Finale',
      category: 'Thousand Daggers · Trap',
      description: 'Thousand Daggers fires +6 radial blades & drops an Explosive Trap in center.',
      requiredUltimateSkill: UltimateSkillId.ThousandDaggers,
    },
  ],

  // === GNOME STATUE BLESSINGS (4 Core/Passive + 5 Normal-Gated + 3 Ult-Gated) ===
  [CharacterId.Gnome]: [
    {
      id: 'gnome_bedrock_plating',
      characterId: CharacterId.Gnome,
      name: 'Bedrock Plating',
      category: 'Unbreakable · HP',
      description: '+24 Max HP, heals 24 HP now, and adds +5% Unbreakable Armor.',
    },
    {
      id: 'gnome_iron_counter',
      characterId: CharacterId.Gnome,
      name: 'Runestone Retaliation',
      category: 'Armor · Shockwave',
      description: 'Withstanding an attack unleashes a seismic tremor around you.',
    },
    {
      id: 'gnome_undying_grit',
      characterId: CharacterId.Gnome,
      name: 'Unyielding Grit',
      category: 'Lasting Resolve',
      description: 'Lasting Resolve scales faster and grants up to +18% bonus damage.',
    },
    {
      id: 'gnome_concussive_gauntlets',
      characterId: CharacterId.Gnome,
      name: 'Concussive Knuckles',
      category: 'Gauntlet · Stagger',
      description: '+12% punch damage; every 3rd punch triggers an earth pulse.',
    },
    {
      id: 'gnome_skill_iron_fist',
      characterId: CharacterId.Gnome,
      name: 'Tectonic Knuckle',
      category: 'Iron Fist · Quake',
      description: 'Iron Fist deals +16% damage, stuns +0.3s, & triggers an aftershock.',
      requiredNormalSkill: NormalSkillId.IronFist,
    },
    {
      id: 'gnome_skill_fortress_stance',
      characterId: CharacterId.Gnome,
      name: 'Aegis Bastion',
      category: 'Fortress Stance · Heal',
      description: 'Fortress Stance lasts +1.2s, heals 15% HP, and pulses tremors.',
      requiredNormalSkill: NormalSkillId.FortressStance,
    },
    {
      id: 'gnome_skill_groundbreaker',
      characterId: CharacterId.Gnome,
      name: 'Faultline Crash',
      category: 'Groundbreaker · Crater',
      description: 'Groundbreaker covers +18% wider area, +18% damage, & 0.8s stun.',
      requiredNormalSkill: NormalSkillId.Groundbreaker,
    },
    {
      id: 'gnome_skill_magnetic_guard',
      characterId: CharacterId.Gnome,
      name: 'Overcharged Coil',
      category: 'Magnetic Guard · Arc',
      description: 'Magnetic Guard lasts +1.2s, boosts reflect power, & zaps nearby foes.',
      requiredNormalSkill: NormalSkillId.MagneticGuard,
    },
    {
      id: 'gnome_skill_earthen_grasp',
      characterId: CharacterId.Gnome,
      name: 'Crushing Stonehands',
      category: 'Earthen Grasp · Root',
      description: 'Earthen Grasp immobilizes +0.6s longer and deals +20% crush damage.',
      requiredNormalSkill: NormalSkillId.EarthenGrasp,
    },
    {
      id: 'gnome_ult_mountain',
      characterId: CharacterId.Gnome,
      name: 'Living Mountain',
      category: "Mountain's Heart",
      description: "Mountain's Heart lasts +2s, heals 18% HP, and resets Normal Skills.",
      requiredUltimateSkill: UltimateSkillId.MountainsHeart,
    },
    {
      id: 'gnome_ult_rampart',
      characterId: CharacterId.Gnome,
      name: 'Citadel Bastion',
      category: "Titan's Rampart",
      description: "Titan's Rampart lasts +1.5s, pulses quakes inside, & resets Skills.",
      requiredUltimateSkill: UltimateSkillId.TitansRampart,
    },
    {
      id: 'gnome_ult_cataclysm',
      characterId: CharacterId.Gnome,
      name: 'Worldshatter',
      category: 'Cataclysmic Slam',
      description: 'Cataclysmic Slam unleashes a 4th wave, stuns 1s, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.CataclysmicSlam,
    },
    // Strategic Build Expansion — Gnome Core, Normal & Ultimate Specializations
    {
      id: 'gnome_seismic_momentum',
      characterId: CharacterId.Gnome,
      name: 'Seismic Momentum',
      category: 'Stride · Shatter',
      description: '+12% Move Speed and +22% damage against Stunned or Rooted foes.',
    },
    {
      id: 'gnome_forgeheart_furnace',
      characterId: CharacterId.Gnome,
      name: 'Forgeheart Furnace',
      category: 'Aura · Forge Pulse',
      description: 'Pulses a fiery forge shockwave every 2.0s in combat, damaging nearby foes.',
    },
    {
      id: 'gnome_shatterstone_grip',
      characterId: CharacterId.Gnome,
      name: 'Shatterstone Grip',
      category: 'Critical · Impact',
      description: '+12% Crit Chance and +20% Crit Damage; Critical Strikes briefly stagger foes.',
    },
    {
      id: 'gnome_stoneborn_regen',
      characterId: CharacterId.Gnome,
      name: 'Stoneborn Vigor',
      category: 'Regen · Sustain',
      description: 'Regenerates 3 HP every 2.5s in combat and boosts all healing by +25%.',
    },
    {
      id: 'gnome_skill_iron_fist_alt',
      characterId: CharacterId.Gnome,
      name: 'Forgebreaker Haymaker',
      category: 'Iron Fist · Crit Guard',
      description: 'Iron Fist guarantees a Critical Strike and grants 1.8s of Fortress Stance.',
      requiredNormalSkill: NormalSkillId.IronFist,
    },
    {
      id: 'gnome_skill_fortress_stance_alt',
      characterId: CharacterId.Gnome,
      name: 'Juggernaut Bastion',
      category: 'Fortress Stance · Might',
      description: 'While Fortress Stance is active, gain +24% Attack Damage & faster CD recovery.',
      requiredNormalSkill: NormalSkillId.FortressStance,
    },
    {
      id: 'gnome_skill_groundbreaker_alt',
      characterId: CharacterId.Gnome,
      name: 'Magma Faultline',
      category: 'Groundbreaker · Reset',
      description: 'Groundbreaker deals +22% damage and refunds 1.5s CD when hitting 2+ foes.',
      requiredNormalSkill: NormalSkillId.Groundbreaker,
    },
    {
      id: 'gnome_skill_magnetic_guard_alt',
      characterId: CharacterId.Gnome,
      name: 'Lodestone Vortex',
      category: 'Magnetic Guard · Pull',
      description: 'Casting Magnetic Guard pulls nearby foes inward, slows 30%, & adds +12% Ult.',
      requiredNormalSkill: NormalSkillId.MagneticGuard,
    },
    {
      id: 'gnome_skill_earthen_grasp_alt',
      characterId: CharacterId.Gnome,
      name: 'Granite Siphon',
      category: 'Earthen Grasp · Heal',
      description: 'Earthen Grasp heals 4 HP per enemy rooted and stuns them 0.5s on cast.',
      requiredNormalSkill: NormalSkillId.EarthenGrasp,
    },
    {
      id: 'gnome_ult_mountain_alt',
      characterId: CharacterId.Gnome,
      name: 'Volcanic Core',
      category: "Mountain's Heart · Coil",
      description: "Mountain's Heart slam deals +45% damage & activates Magnetic Guard for 5s.",
      requiredUltimateSkill: UltimateSkillId.MountainsHeart,
    },
    {
      id: 'gnome_ult_rampart_alt',
      characterId: CharacterId.Gnome,
      name: 'Sanctuary Citadel',
      category: "Titan's Rampart · Guard",
      description: "Titan's Rampart heals 20% Max HP on cast & activates Fortress Stance 4.5s.",
      requiredUltimateSkill: UltimateSkillId.TitansRampart,
    },
    {
      id: 'gnome_ult_cataclysm_alt',
      characterId: CharacterId.Gnome,
      name: 'Tectonic Snare',
      category: 'Cataclysmic Slam · Root',
      description: 'Cataclysmic Slam deals +22% wave damage and roots struck foes for 2.0s.',
      requiredUltimateSkill: UltimateSkillId.CataclysmicSlam,
    },
  ],

  // === GHOST STATUE BLESSINGS (4 Core/Passive + 5 Normal-Gated + 3 Ult-Gated) ===
  [CharacterId.Ghost]: [
    {
      id: 'ghost_ectoplasm_wisp',
      characterId: CharacterId.Ghost,
      name: 'Whispering Lantern',
      category: 'Basic Haunt · Spirit Wisp',
      description: 'Every 3rd spectral attack launches an extra homing spirit orb for +10 magic dmg.',
    },
    {
      id: 'ghost_ethereal_veil',
      characterId: CharacterId.Ghost,
      name: 'Astral Phase',
      category: 'Ethereal Body',
      description: '+14 Max HP, +6% additional Phase Evasion, & +6% Physical Resistance.',
    },
    {
      id: 'ghost_restless_echo',
      characterId: CharacterId.Ghost,
      name: 'Poltergeist Surge',
      category: 'Restless Spirit',
      description: 'Restless Spirit lasts +1.2s longer and heals 3 HP whenever you evade an attack.',
    },
    {
      id: 'ghost_chilling_touch',
      characterId: CharacterId.Ghost,
      name: 'Grave Chill',
      category: 'Crowd Control · Chill',
      description: 'All spectral attacks & skills chill foes, slowing movement by 16% for 1.6s.',
    },
    // Normal Skill-Specific Blessings (ONLY appear when equipped!)
    {
      id: 'ghost_skill_spectral_bolt',
      characterId: CharacterId.Ghost,
      name: 'Twin Astral Lance',
      category: 'Spectral Bolt',
      description: 'Spectral Bolt fires 2 piercing bolts and deals +12% magic damage.',
      requiredNormalSkill: NormalSkillId.SpectralBolt,
    },
    {
      id: 'ghost_skill_phantom_dash',
      characterId: CharacterId.Ghost,
      name: 'Lingering Ectoplasm',
      category: 'Phantom Dash',
      description: 'Phantom Dash leaves mist pools (+1.2s duration) & refunds 18% CD on hit.',
      requiredNormalSkill: NormalSkillId.PhantomDash,
    },
    {
      id: 'ghost_skill_soul_drain',
      characterId: CharacterId.Ghost,
      name: 'Ravenous Tether',
      category: 'Soul Drain',
      description: 'Soul Drain latches onto +1 extra foe, ticks faster, & heals +25% more HP.',
      requiredNormalSkill: NormalSkillId.SoulDrain,
    },
    {
      id: 'ghost_skill_wailing_scream',
      characterId: CharacterId.Ghost,
      name: "Banshee's Howl",
      category: 'Wailing Scream',
      description: 'Wailing Scream expands +18% wider, deals +15% damage, & Fears +0.6s longer.',
      requiredNormalSkill: NormalSkillId.WailingScream,
    },
    {
      id: 'ghost_skill_haunted_possession',
      characterId: CharacterId.Ghost,
      name: 'Malevolent Puppeteer',
      category: 'Haunted Possession',
      description: 'Possession lasts +0.6s longer, cleaves faster, & erupts for +22% exorcism dmg.',
      requiredNormalSkill: NormalSkillId.HauntedPossession,
    },
    // Ultimate Skill-Specific Blessings (ONLY appear when equipped!)
    {
      id: 'ghost_ult_nightmare',
      characterId: CharacterId.Ghost,
      name: 'Endless Terror',
      category: 'Eternal Nightmare',
      description: 'Eternal Nightmare summons +1 extra Apparition, lasts +1.5s, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.EternalNightmare,
    },
    {
      id: 'ghost_ult_legion',
      characterId: CharacterId.Ghost,
      name: 'Vengeful Phantoms',
      category: 'Spirit Legion',
      description: 'Spirit Legion summons +2 extra wandering spirits, heals 10 HP, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.SpiritLegion,
    },
    {
      id: 'ghost_ult_passage',
      characterId: CharacterId.Ghost,
      name: 'Abyssal Singularity',
      category: "Death's Passage",
      description: "Death's Passage pulls +15% wider, detonates for +20% dmg, & resets Skills.",
      requiredUltimateSkill: UltimateSkillId.DeathsPassage,
    },
    // Strategic Build Expansion — Ghost Core, Normal & Ultimate Specializations
    {
      id: 'ghost_phantom_harvester',
      characterId: CharacterId.Ghost,
      name: 'Phantom Harvester',
      category: 'Reap · Spirit Orb',
      description: 'Slaying an enemy heals 3 HP, grants +6% Ult charge, & fires a Spirit Orb.',
    },
    {
      id: 'ghost_frostbite_haunt',
      characterId: CharacterId.Ghost,
      name: 'Frostbite Haunt',
      category: 'Chill & Fear · Bonus DMG',
      description: 'Slowed or Feared enemies take +22% bonus damage from all spectral hits.',
    },
    {
      id: 'ghost_astral_conduit',
      characterId: CharacterId.Ghost,
      name: 'Astral Conduit',
      category: 'Spellcraft · Haste',
      description: '-14% Normal Skill cooldowns and +15% Skill & Ultimate damage.',
    },
    {
      id: 'ghost_spectral_shroud',
      characterId: CharacterId.Ghost,
      name: 'Banshee Veil',
      category: 'Phase · Counter Nova',
      description: 'Phasing through an attack unleashes an icy shockwave that chills nearby foes.',
    },
    {
      id: 'ghost_skill_spectral_bolt_alt',
      characterId: CharacterId.Ghost,
      name: 'Soulpiercer Lance',
      category: 'Spectral Bolt · Reset',
      description: 'Spectral Bolt deals +24% damage, +25% Crit Chance, & cuts CD 0.7s on hit.',
      requiredNormalSkill: NormalSkillId.SpectralBolt,
    },
    {
      id: 'ghost_skill_phantom_dash_alt',
      characterId: CharacterId.Ghost,
      name: 'Astral Nova Step',
      category: 'Phantom Dash · Burst',
      description: 'Phantom Dash erupts a spectral burst on cast and heals 4 HP per foe hit.',
      requiredNormalSkill: NormalSkillId.PhantomDash,
    },
    {
      id: 'ghost_skill_soul_drain_alt',
      characterId: CharacterId.Ghost,
      name: 'Spirit Overload',
      category: 'Soul Drain · Charge',
      description: 'Soul Drain slows tethered foes 30% and grants +3% Ultimate charge per tick.',
      requiredNormalSkill: NormalSkillId.SoulDrain,
    },
    {
      id: 'ghost_skill_wailing_scream_alt',
      characterId: CharacterId.Ghost,
      name: 'Shattering Wail',
      category: 'Wailing Scream · Crit',
      description: 'Wailing Scream deals +28% damage with +30% Crit Chance & stuns 0.6s.',
      requiredNormalSkill: NormalSkillId.WailingScream,
    },
    {
      id: 'ghost_skill_haunted_possession_alt',
      characterId: CharacterId.Ghost,
      name: 'Soul Parasite',
      category: 'Haunted Possession · Mend',
      description: 'Exorcism heals 14% Max HP and cuts Normal Skill cooldowns by 1.5s.',
      requiredNormalSkill: NormalSkillId.HauntedPossession,
    },
    {
      id: 'ghost_ult_nightmare_alt',
      characterId: CharacterId.Ghost,
      name: 'Siphoning Dread',
      category: 'Eternal Nightmare · Drain',
      description: 'Eternal Nightmare terror pulses deal +35% damage and heal 4 HP on hit.',
      requiredUltimateSkill: UltimateSkillId.EternalNightmare,
    },
    {
      id: 'ghost_ult_legion_alt',
      characterId: CharacterId.Ghost,
      name: 'Soulbound Choir',
      category: 'Spirit Legion · Tether',
      description: 'Spirit Legion triggers Soul Drain on cast and refunds 20% Ultimate charge.',
      requiredUltimateSkill: UltimateSkillId.SpiritLegion,
    },
    {
      id: 'ghost_ult_passage_alt',
      characterId: CharacterId.Ghost,
      name: 'Eventide Collapse',
      category: "Death's Passage · Mend",
      description: "Death's Passage heals 15% Max HP on cast and chills nearby foes 30%.",
      requiredUltimateSkill: UltimateSkillId.DeathsPassage,
    },
  ],

  // === KOBOLD STATUE BLESSINGS (8 Core/Passive + 10 Normal-Gated + 6 Ult-Gated) ===
  [CharacterId.Kobold]: [
    {
      id: 'kobold_twin_ratchet',
      characterId: CharacterId.Kobold,
      name: 'Twin-Notch Ratchet',
      category: 'Basic Crossbow · Twin Shot',
      description: 'Every 3rd crossbow shot fires 2 parallel crit-empowered bolts (+18% DMG).',
    },
    {
      id: 'kobold_hunters_quarry',
      characterId: CharacterId.Kobold,
      name: "Hunter's Quarry",
      category: "Hunter's Precision",
      description: "Hunter's Precision stacks up to 7x and crits on 4+ stack foes refund 0.35s CDs.",
    },
    {
      id: 'kobold_clockwork_overdrive',
      characterId: CharacterId.Kobold,
      name: 'Clockwork Overdrive',
      category: 'Mechanical Expertise',
      description: '+15% Attack Speed; casting any skill grants +28% Move & Reload Speed for 3s.',
    },
    {
      id: 'kobold_serrated_broadheads',
      characterId: CharacterId.Kobold,
      name: 'Serrated Broadheads',
      category: 'Crit · Ricochet',
      description: '+24% Critical Damage; Critical crossbow bolts ricochet to a nearby enemy.',
    },
    {
      id: 'kobold_trappers_ambush',
      characterId: CharacterId.Kobold,
      name: "Trapper's Ambush",
      category: 'Control · Expose',
      description: 'Rooted, Stunned, or Vulnerable enemies take +24% bonus crossbow & skill damage.',
    },
    {
      id: 'kobold_dragonscale_quiver',
      characterId: CharacterId.Kobold,
      name: 'Dragonscale Quiver',
      category: 'Vitality · Sustain',
      description: '+18 Max HP, heals 18 HP now, and slaying Marked foes restores 3 HP.',
    },
    {
      id: 'kobold_alchemical_fletching',
      characterId: CharacterId.Kobold,
      name: 'Alchemical Fletching',
      category: 'Elemental Bolts',
      description: 'Every 4th crossbow bolt is imbued with Frost or Lightning, slowing or shocking foes.',
    },
    {
      id: 'kobold_scavenger_springs',
      characterId: CharacterId.Kobold,
      name: 'Scavenger Springs',
      category: 'Kills · Tempo',
      description: 'Slaying an enemy grants +6% Ultimate charge and cuts Normal Skill CDs by 0.5s.',
    },
    // Normal Skill-Specific Blessings (ONLY appear when equipped!)
    {
      id: 'kobold_skill_piercing_bolt',
      characterId: CharacterId.Kobold,
      name: 'Tungsten Bodkin',
      category: 'Piercing Bolt',
      description: 'Piercing Bolt fires a secondary parallel lance and deals +22% Crit Damage.',
      requiredNormalSkill: NormalSkillId.PiercingBolt,
    },
    {
      id: 'kobold_skill_piercing_bolt_alt',
      characterId: CharacterId.Kobold,
      name: 'Armor-Cracking Skewer',
      category: 'Piercing Bolt · Expose',
      description: 'Piercing Bolt applies 2 Hunter Marks & Exposes struck foes for 3s.',
      requiredNormalSkill: NormalSkillId.PiercingBolt,
    },
    {
      id: 'kobold_skill_rapid_reload',
      characterId: CharacterId.Kobold,
      name: 'Bottomless Drum',
      category: 'Rapid Reload',
      description: 'Rapid Reload fires +2 extra bolts and its final bolt is a guaranteed Crit.',
      requiredNormalSkill: NormalSkillId.RapidReload,
    },
    {
      id: 'kobold_skill_rapid_reload_alt',
      characterId: CharacterId.Kobold,
      name: 'Quick-Crank Evasion',
      category: 'Rapid Reload · Mobility',
      description: 'Rapid Reload grants +35% Move Speed for 2.5s and heals 2 HP on crit hits.',
      requiredNormalSkill: NormalSkillId.RapidReload,
    },
    {
      id: 'kobold_skill_explosive_bolt',
      characterId: CharacterId.Kobold,
      name: 'Cluster Munitions',
      category: 'Explosive Bolt',
      description: 'Explosive Bolt blast radius +25%, +20% damage, and stuns foes for 0.8s.',
      requiredNormalSkill: NormalSkillId.ExplosiveBolt,
    },
    {
      id: 'kobold_skill_explosive_bolt_alt',
      characterId: CharacterId.Kobold,
      name: 'Thermite Payload',
      category: 'Explosive Bolt · Expose',
      description: 'Explosive Bolt sunders armor, making blasted enemies Vulnerable for 3.5s.',
      requiredNormalSkill: NormalSkillId.ExplosiveBolt,
    },
    {
      id: 'kobold_skill_snare_trap',
      characterId: CharacterId.Kobold,
      name: 'Double-Jaw Rig',
      category: 'Snare Trap',
      description: 'Snare Trap deploys 2 traps at once, arms instantly, and roots +0.8s longer.',
      requiredNormalSkill: NormalSkillId.SnareTrap,
    },
    {
      id: 'kobold_skill_snare_trap_alt',
      characterId: CharacterId.Kobold,
      name: 'Electrified Jaws',
      category: 'Snare Trap · Shock',
      description: 'Triggered Snare Traps unleash a shock burst (+35% DMG) & apply 3 Hunter Marks.',
      requiredNormalSkill: NormalSkillId.SnareTrap,
    },
    {
      id: 'kobold_skill_multi_shot',
      characterId: CharacterId.Kobold,
      name: 'Razor Fan Volley',
      category: 'Multi-Shot',
      description: 'Multi-Shot fires 9 piercing bolts in a wider arc with +20% Crit Chance.',
      requiredNormalSkill: NormalSkillId.MultiShot,
    },
    {
      id: 'kobold_skill_multi_shot_alt',
      characterId: CharacterId.Kobold,
      name: 'Concussive Volley',
      category: 'Multi-Shot · Control',
      description: 'Multi-Shot slows struck enemies by 35% for 2.5s and refunds 0.6s CD if 3+ hit.',
      requiredNormalSkill: NormalSkillId.MultiShot,
    },
    // Ultimate Skill-Specific Blessings (ONLY appear when equipped!)
    {
      id: 'kobold_ult_barrage',
      characterId: CharacterId.Kobold,
      name: 'Wyrmfire Skyfall',
      category: "Dragon's Barrage",
      description: "Dragon's Barrage lasts +1.0s longer, +22% radius, Exposes foes, & resets Skills.",
      requiredUltimateSkill: UltimateSkillId.DragonsBarrage,
    },
    {
      id: 'kobold_ult_barrage_alt',
      characterId: CharacterId.Kobold,
      name: 'Crimson Hailstorm',
      category: "Dragon's Barrage · Mend",
      description: "Dragon's Barrage heals 12 HP on cast and slows enemies inside the storm 40%.",
      requiredUltimateSkill: UltimateSkillId.DragonsBarrage,
    },
    {
      id: 'kobold_ult_artificer',
      characterId: CharacterId.Kobold,
      name: 'Quad-Ballista Network',
      category: 'Master Artificer',
      description: 'Deploys +1 extra automated turret (4 total), +25% fire rate, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.MasterArtificer,
    },
    {
      id: 'kobold_ult_artificer_alt',
      characterId: CharacterId.Kobold,
      name: 'Piercing Auto-Bolts',
      category: 'Master Artificer · Pierce',
      description: 'Turret bolts pierce enemies, stack Hunter Marks, and heal 10 HP on deploy.',
      requiredUltimateSkill: UltimateSkillId.MasterArtificer,
    },
    {
      id: 'kobold_ult_arsenal',
      characterId: CharacterId.Kobold,
      name: 'Grandmaster Ordnance',
      category: "Kobold's Deadly Arsenal",
      description: 'Deadly Arsenal fires +3 extra elemental volleys, +25% Crit, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.KoboldsDeadlyArsenal,
    },
    {
      id: 'kobold_ult_arsenal_alt',
      characterId: CharacterId.Kobold,
      name: 'Overclocked Harness',
      category: "Kobold's Deadly Arsenal · Ward",
      description: 'Grants +35% Move Speed, heals 14 HP, & refunds 20% Ult charge during Arsenal.',
      requiredUltimateSkill: UltimateSkillId.KoboldsDeadlyArsenal,
    },
  ],

  // === SLIME STATUE BLESSINGS & AWAKENING PATHS ===
  [CharacterId.Slime]: [
    {
      id: 'slime_mana_conduit_amp',
      characterId: CharacterId.Slime,
      name: 'Prismatic Viscosity',
      category: 'Arcane Conduit · Spell Power',
      description: '+25% Arcane & Elemental spell damage, and spell impacts restore 1.5% Max HP.',
    },
    {
      id: 'slime_unstable_singularity',
      characterId: CharacterId.Slime,
      name: 'Volatile Resonance',
      category: 'Unstable Mana · Detonation',
      description: 'Unstable Mana detonations trigger after 2 spells instead of 3, with +30% blast radius.',
    },
    {
      id: 'slime_amorphous_ward',
      characterId: CharacterId.Slime,
      name: 'Gelatinous Aegis',
      category: 'Vitality · Ward',
      description: '+24 Max HP, heals 24 HP immediately, and grants 15% physical damage reduction.',
    },
    {
      id: 'slime_mana_tide',
      characterId: CharacterId.Slime,
      name: 'Astral Flow',
      category: 'Cooldowns · Tempo',
      description: '-15% Normal Skill cooldowns and +25% Ultimate charge generation from spell hits.',
    },
    // Normal Skill Specific
    {
      id: 'slime_skill_arcane_orb',
      characterId: CharacterId.Slime,
      name: 'Pulsing Supernova',
      category: 'Arcane Orb',
      description: 'Arcane Orb explodes twice in rapid succession and emits shockwaves that slow foes.',
      requiredNormalSkill: NormalSkillId.ArcaneOrb,
    },
    {
      id: 'slime_skill_prismatic_shards',
      characterId: CharacterId.Slime,
      name: 'Infinite Refraction',
      category: 'Prismatic Shards',
      description: 'Summons 3 additional crystal shards (8 total) that pierce an extra time with +20% Crit.',
      requiredNormalSkill: NormalSkillId.PrismaticShards,
    },
    {
      id: 'slime_skill_gravity_well',
      characterId: CharacterId.Slime,
      name: 'Crushing Event Horizon',
      category: 'Gravity Well',
      description: 'Gravity Well pulls with double force and continuously crushes foes for heavy arcane damage.',
      requiredNormalSkill: NormalSkillId.GravityWell,
    },
    {
      id: 'slime_skill_elemental_cascade',
      characterId: CharacterId.Slime,
      name: 'Tri-Element Catastrophe',
      category: 'Elemental Cascade',
      description: 'Elemental Cascade showers 50% more meteors and leaves burning, freezing, and shocking zones.',
      requiredNormalSkill: NormalSkillId.ElementalCascade,
    },
    {
      id: 'slime_skill_arcane_prison',
      characterId: CharacterId.Slime,
      name: 'Unstable Containment',
      category: 'Arcane Prison',
      description: 'Arcane Prison barrier shocks trapped enemies every 0.4s and detonates violently when expiring.',
      requiredNormalSkill: NormalSkillId.ArcanePrison,
    },
    // Awakening Paths: Cataclysm of Elements
    {
      id: 'slime_ult_cataclysm_path_a',
      characterId: CharacterId.Slime,
      name: 'Path A – Elemental Sovereign',
      category: 'Awakening · Elemental Spirits',
      description: 'Summons four enormous elemental spirits (fire, ice, lightning, earth) that independently fight before combining into a massive eruption.',
      requiredUltimateSkill: UltimateSkillId.CataclysmOfElements,
    },
    {
      id: 'slime_ult_cataclysm_path_b',
      characterId: CharacterId.Slime,
      name: 'Path B – Elemental Convergence',
      category: 'Awakening · Mystic Glyph',
      description: 'Creates a massive rotating magical symbol above the arena, unleashing unpredictable dual-element hyper-bursts across the field.',
      requiredUltimateSkill: UltimateSkillId.CataclysmOfElements,
    },
    // Awakening Paths: Astral Singularity
    {
      id: 'slime_ult_singularity_path_a',
      characterId: CharacterId.Slime,
      name: 'Path A – Black Star',
      category: 'Awakening · Dark Collapse',
      description: 'Transforms singularity into a miniature black star consuming energy and projectiles before collapsing into an immense gravitational blast.',
      requiredUltimateSkill: UltimateSkillId.AstralSingularity,
    },
    {
      id: 'slime_ult_singularity_path_b',
      characterId: CharacterId.Slime,
      name: 'Path B – Celestial Prison',
      category: 'Awakening · Pocket Dimension',
      description: 'Traps affected enemies in a pocket dimension with distorted gravity and orbiting magical crystal fragments that continuously strike.',
      requiredUltimateSkill: UltimateSkillId.AstralSingularity,
    },
    // Awakening Paths: Primordial Overload
    {
      id: 'slime_ult_overload_path_a',
      characterId: CharacterId.Slime,
      name: 'Path A – Arcane Deity',
      category: 'Awakening · Multi-Core Deity',
      description: 'Transforms into a multi-core divine entity where each orbiting core independently casts distinct elemental and arcane spells.',
      requiredUltimateSkill: UltimateSkillId.PrimordialOverload,
    },
    {
      id: 'slime_ult_overload_path_b',
      characterId: CharacterId.Slime,
      name: 'Path B – Living Spellbook',
      category: 'Awakening · Ancient Grimoire',
      description: 'Manifests a colossal floating ancient grimoire with turning pages, unleashing magical storms, giant energy hands, and crystal formations.',
      requiredUltimateSkill: UltimateSkillId.PrimordialOverload,
    },
  ],

  // === LIZARDFOLK STATUE BLESSINGS & AWAKENING PATHS ===
  [CharacterId.Lizardfolk]: [
    {
      id: 'lizard_predator_instinct_amp',
      characterId: CharacterId.Lizardfolk,
      name: 'Cold-Blooded Ruthlessness',
      category: "Predator's Accuracy",
      description: '+25% Spear Damage; striking targets from long range deals 2.2x Critical damage.',
    },
    {
      id: 'lizard_hunters_focus_surge',
      characterId: CharacterId.Lizardfolk,
      name: 'Apex Reflexes',
      category: "Hunter's Instinct",
      description: "Hunter's Focus generates twice as quickly while moving; dodging grants maximum Focus immediately.",
    },
    {
      id: 'lizard_scaled_vitality',
      characterId: CharacterId.Lizardfolk,
      name: 'Obsidian Scales',
      category: 'Vitality · Tough Hide',
      description: '+26 Max HP, heals 26 HP immediately, and grants 15% armor mitigation against melee hits.',
    },
    {
      id: 'lizard_spear_cyclone_tempo',
      characterId: CharacterId.Lizardfolk,
      name: 'Spear-Dancer Tempo',
      category: 'Spear Haste · Reload',
      description: '+20% Spear throw velocity and -15% cooldowns on all spear-based techniques.',
    },
    // Normal Skill Specific
    {
      id: 'lizard_skill_piercing_javelin',
      characterId: CharacterId.Lizardfolk,
      name: 'Returning Harpoon',
      category: 'Piercing Javelin',
      description: 'Piercing Javelin returns with 3x velocity, pulling struck enemies backward along its path.',
      requiredNormalSkill: NormalSkillId.PiercingJavelin,
    },
    {
      id: 'lizard_skill_triple_spear',
      characterId: CharacterId.Lizardfolk,
      name: 'Five-Point Barbed Fan',
      category: 'Triple Spear Toss',
      description: 'Throws 5 barbed spears instead of 3, piercing up to 2 enemies per spear with +20% Crit.',
      requiredNormalSkill: NormalSkillId.TripleSpearToss,
    },
    {
      id: 'lizard_skill_impaling_spear',
      characterId: CharacterId.Lizardfolk,
      name: 'Grounded Execution',
      category: 'Impaling Spear',
      description: 'Impaled enemies suffer 40% increased damage from all attacks and erupt in a bone splinter burst.',
      requiredNormalSkill: NormalSkillId.ImpalingSpear,
    },
    {
      id: 'lizard_skill_hunting_mark',
      characterId: CharacterId.Lizardfolk,
      name: 'Bloodhound Brand',
      category: 'Hunting Mark',
      description: 'Marked enemies are revealed and slowed 30%; all spear attacks against them ignore 100% armor.',
      requiredNormalSkill: NormalSkillId.HuntingMark,
    },
    {
      id: 'lizard_skill_spear_cyclone',
      characterId: CharacterId.Lizardfolk,
      name: 'Vortex of Blades',
      category: 'Spear Cyclone',
      description: 'Spear Cyclone adds 2 additional orbiting spears (6 total) and draws nearby enemies into its orbit.',
      requiredNormalSkill: NormalSkillId.SpearCyclone,
    },
    // Awakening Paths: Rain of Javelins
    {
      id: 'lizard_ult_rain_path_a',
      characterId: CharacterId.Lizardfolk,
      name: 'Path A – Thousand Spears of the Ancients',
      category: 'Awakening · Ancestral Army',
      description: 'Blankets the entire arena in ancestral spears; each spear impact summons a spectral tribal warrior that strikes nearby foes.',
      requiredUltimateSkill: UltimateSkillId.RainOfJavelins,
    },
    {
      id: 'lizard_ult_rain_path_b',
      characterId: CharacterId.Lizardfolk,
      name: 'Path B – Spearfall Cataclysm',
      category: 'Awakening · Titan Spear',
      description: 'The falling spears converge into a titanic colossal spear that impacts like a meteor, shattering the earth with seismic shockwaves.',
      requiredUltimateSkill: UltimateSkillId.RainOfJavelins,
    },
    // Awakening Paths: World Piercer
    {
      id: 'lizard_ult_world_piercer_path_a',
      characterId: CharacterId.Lizardfolk,
      name: 'Path A – Dragonfang',
      category: 'Awakening · Spectral Dragon',
      description: 'Imbues the colossal spear with ancient dragon spirit energy; a giant flaming dragon maw engulfs the spear, searing everything in its wake.',
      requiredUltimateSkill: UltimateSkillId.WorldPiercer,
    },
    {
      id: 'lizard_ult_world_piercer_path_b',
      characterId: CharacterId.Lizardfolk,
      name: 'Path B – Absolute Penetration',
      category: 'Awakening · Armor Shatter',
      description: 'Tears the dimensional fabric, shattering enemy armor to 0%, obliterating shields, and triggering sonic shockwaves at each penetration.',
      requiredUltimateSkill: UltimateSkillId.WorldPiercer,
    },
    // Awakening Paths: Spirit of the Great Hunt
    {
      id: 'lizard_ult_hunt_path_a',
      characterId: CharacterId.Lizardfolk,
      name: 'Path A – The First Hunter',
      category: 'Awakening · Triple Split & Execute',
      description: 'Channels the primordial founder of the hunt: every spear splits into 3 homing spears, and basic attacks instantly execute low-HP targets.',
      requiredUltimateSkill: UltimateSkillId.SpiritOfTheGreatHunt,
    },
    {
      id: 'lizard_ult_hunt_path_b',
      characterId: CharacterId.Lizardfolk,
      name: 'Path B – Wild Hunt Procession',
      category: 'Awakening · Ghostly Pack',
      description: 'Calls forth the spectral hunting procession—phantom raptors and ghost wolves rush the arena, mauling foes while spears rain automatically.',
      requiredUltimateSkill: UltimateSkillId.SpiritOfTheGreatHunt,
    },
  ],
};

/**
 * Maximum number of blessings a player can acquire in a single run.
 * Keeps the exact original blessing cap intact while offering a deep strategic pool.
 */
export const MAX_RUN_BLESSINGS = 7;

/**
 * Universal Sanctuary Relic & Pact Blessings available to all heroes.
 * Creates cross-cutting build archetypes (Glass Cannon, Sustain, Ult Tempo, Cooldown Surge, Boss Hunter, Chain Lightning).
 */
export const UNIVERSAL_STATUE_BLESSINGS: RunBlessing[] = [
  {
    id: 'relic_glass_scythe',
    isUniversal: true,
    name: 'Crimson Scythe Pact',
    category: 'Relic Pact · High Risk',
    description: '+28% all damage dealt, but reduces Max HP by 15%.',
  },
  {
    id: 'relic_lantern_vitality',
    isUniversal: true,
    name: "Hearthkeeper's Ember",
    category: 'Relic · Room Sustain',
    description: '+20 Max HP, heals 20 HP now, & restores 12% Max HP on room clear.',
  },
  {
    id: 'relic_soul_dynamo',
    isUniversal: true,
    name: 'Soulforged Dynamo',
    category: 'Relic · Ultimate Tempo',
    description: '+30% Ultimate charge gain from all sources and -15% Ultimate cooldown.',
  },
  {
    id: 'relic_chrono_hourglass',
    isUniversal: true,
    name: 'Chrono Hourglass',
    category: 'Relic · Cooldown Surge',
    description: '-14% Normal Skill cooldowns; casting an Ultimate grants +22% DMG for 5s.',
  },
  {
    id: 'relic_gravebell_toll',
    isUniversal: true,
    name: 'Toll of the Gravebell',
    category: 'Relic · Boss & Execute',
    description: '+22% damage against Bosses and enemies below 40% HP.',
  },
  {
    id: 'relic_storm_reliquary',
    isUniversal: true,
    name: 'Stormbound Reliquary',
    category: 'Relic · Chain Arc',
    description: 'Every 4th basic attack arcs spectral lightning to up to 2 nearby enemies.',
  },
];

export function getStatueBlessingsForCharacter(charId: CharacterId): RunBlessing[] {
  return CHARACTER_STATUE_BLESSINGS[charId] ?? CHARACTER_STATUE_BLESSINGS[CharacterId.Zombie];
}

export function getBlessingById(id: string): RunBlessing | undefined {
  const universal = UNIVERSAL_STATUE_BLESSINGS.find((b) => b.id === id);
  if (universal) return universal;
  for (const list of Object.values(CHARACTER_STATUE_BLESSINGS)) {
    const found = list.find((b) => b.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Strictly filters a character's Lantern Statue blessings to ONLY those in line with
 * the character's currently equipped 2 Normal Skills and 1 Ultimate Skill (plus core/passive & universal relic blessings).
 * Blessings for unequipped skills are guaranteed never to appear.
 */
export function getEligibleStatueBlessings(
  charId: CharacterId,
  loadout: EquippedLoadout
): RunBlessing[] {
  const pool = getStatueBlessingsForCharacter(charId);
  const heroPool = pool.filter((b) => {
    if (b.requiredNormalSkill && !loadout.normalSkills.includes(b.requiredNormalSkill)) {
      return false;
    }
    if (b.requiredUltimateSkill && b.requiredUltimateSkill !== loadout.ultimateSkill) {
      return false;
    }
    return true;
  });
  return [...heroPool, ...UNIVERSAL_STATUE_BLESSINGS];
}

export const EMPTY_UPGRADE_RANKS: CharacterUpgradeRanks = {
  pathA: 0,
  pathB: 0,
  pathC: 0,
  pathD: 0,
  pathE: 0,
};

const STORAGE_KEY = 'hearth_and_bone_save_v5';
const PREV_V4_STORAGE_KEY = 'hearth_and_bone_save_v4';
const PREV_V3_STORAGE_KEY = 'hearth_and_bone_save_v3';
const PREV_STORAGE_KEY = 'hearth_and_bone_save_v2';
const LEGACY_STORAGE_KEY = 'hearth_and_bone_save_v1';

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  [DifficultyLevel.Easy]: {
    id: DifficultyLevel.Easy,
    level: DifficultyLevel.Easy,
    name: 'Easy',
    label: 'Easy',
    tagline: 'Cozy Baseline',
    badge: '1 · 1 Stage (1-1 to 1-3)',
    color: '#4ADE80',
    bgGrad: 'from-[#14532D]/40 to-[#052E16]/40',
    borderClass: 'border-[#4ADE80]/50',
    accentText: 'text-[#4ADE80]',
    stages: 1,
    maxFloors: 3,
    victoryShards: 25,
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    enemySpeedMult: 1.0,
    enemyAttackCooldownMult: 1.0,
    extraEnemiesPerWave: 0,
    wavesPerCombatRoom: 2,
    shardMultiplier: 1.0,
    goldMultiplier: 1.0,
    xpMultiplier: 1.0,
    description: 'The gentle baseline dungeon experience. Perfect for exploring characters and core skill synergies.',
  },
  [DifficultyLevel.Normal]: {
    id: DifficultyLevel.Normal,
    level: DifficultyLevel.Normal,
    name: 'Normal',
    label: 'Normal',
    tagline: '2 Stages · Crypt Adventurer',
    badge: '2 · 2 Stages (1-1 to 2-3) · +60% Shards',
    color: '#38BDF8',
    bgGrad: 'from-[#0369A1]/40 to-[#082F49]/40',
    borderClass: 'border-[#38BDF8]/50',
    accentText: 'text-[#38BDF8]',
    stages: 2,
    maxFloors: 6,
    victoryShards: 45,
    enemyHpMult: 1.45,
    enemyDmgMult: 1.35,
    enemySpeedMult: 1.08,
    enemyAttackCooldownMult: 0.92,
    extraEnemiesPerWave: 1,
    wavesPerCombatRoom: 2,
    shardMultiplier: 1.6,
    goldMultiplier: 1.4,
    xpMultiplier: 1.3,
    description: 'Enemies hit harder, move faster, and absorb more punishment across 2 full stages (1-1 to 2-3). Yields +60% Soul Shards.',
  },
  [DifficultyLevel.Hard]: {
    id: DifficultyLevel.Hard,
    level: DifficultyLevel.Hard,
    name: 'Hard',
    label: 'Hard',
    tagline: '3 Stages · Ascend to 3-1',
    badge: '3 · 3 Stages (1-1 to 3-3) · 2.8x Shards',
    color: '#F59E0B',
    bgGrad: 'from-[#B45309]/40 to-[#451A03]/40',
    borderClass: 'border-[#F59E0B]/50',
    accentText: 'text-[#F59E0B]',
    stages: 3,
    maxFloors: 9,
    victoryShards: 85,
    enemyHpMult: 2.2,
    enemyDmgMult: 1.85,
    enemySpeedMult: 1.18,
    enemyAttackCooldownMult: 0.82,
    extraEnemiesPerWave: 2,
    wavesPerCombatRoom: 3,
    shardMultiplier: 2.8,
    goldMultiplier: 2.0,
    xpMultiplier: 1.8,
    description: 'Extends the dungeon into 3 full stages down to the Abyssal Sepulcher! 3 enemy waves per room.',
  },
  [DifficultyLevel.Torment]: {
    id: DifficultyLevel.Torment,
    level: DifficultyLevel.Torment,
    name: 'Torment',
    label: 'Torment',
    tagline: '4 Stages · Ascend to 4-1',
    badge: '4 · 4 Stages (1-1 to 4-3) · 4.5x Shards',
    color: '#FB7185',
    bgGrad: 'from-[#9F1239]/40 to-[#4C0519]/40',
    borderClass: 'border-[#FB7185]/50',
    accentText: 'text-[#FB7185]',
    stages: 4,
    maxFloors: 12,
    victoryShards: 160,
    enemyHpMult: 3.6,
    enemyDmgMult: 2.6,
    enemySpeedMult: 1.28,
    enemyAttackCooldownMult: 0.72,
    extraEnemiesPerWave: 3,
    wavesPerCombatRoom: 3,
    shardMultiplier: 4.5,
    goldMultiplier: 3.0,
    xpMultiplier: 2.4,
    description: 'Descend through 4 harrowing stages down to the Void Ossuary (1-1 to 4-3). Lethal enemy swarms and relentless strikes.',
  },
  [DifficultyLevel.Nightmare]: {
    id: DifficultyLevel.Nightmare,
    level: DifficultyLevel.Nightmare,
    name: 'Nightmare',
    label: 'Nightmare',
    tagline: '5 Stages · Impossible For New Players',
    badge: '5 · 5 Stages (1-1 to 5-3) · 8.0x Shards · LETHAL',
    color: '#A855F7',
    bgGrad: 'from-[#6B21A8]/50 to-[#3B0764]/50',
    borderClass: 'border-[#A855F7]/70',
    accentText: 'text-[#C084FC]',
    stages: 5,
    maxFloors: 15,
    victoryShards: 300,
    enemyHpMult: 6.2,
    enemyDmgMult: 4.2,
    enemySpeedMult: 1.42,
    enemyAttackCooldownMult: 0.6,
    extraEnemiesPerWave: 5,
    wavesPerCombatRoom: 3,
    shardMultiplier: 8.0,
    goldMultiplier: 5.0,
    xpMultiplier: 3.5,
    description: 'Impossible for new players! Enormous monster swarms that 2-shot unfortified heroes, swift projectiles, and 5 grueling stages culminating in the Primordial King of Death.',
    warningNote: 'EXTREMELY LETHAL — Requires Max Guild Upgrades & Flawless Mastery',
  },
};

export const DIFFICULTY_LIST: DifficultyConfig[] = [
  DIFFICULTY_CONFIGS[DifficultyLevel.Easy],
  DIFFICULTY_CONFIGS[DifficultyLevel.Normal],
  DIFFICULTY_CONFIGS[DifficultyLevel.Hard],
  DIFFICULTY_CONFIGS[DifficultyLevel.Torment],
  DIFFICULTY_CONFIGS[DifficultyLevel.Nightmare],
];

export const DEFAULT_SAVE_DATA: GuildSaveData = {
  selectedCharacter: CharacterId.Zombie,
  selectedDifficulty: DifficultyLevel.Easy,
  soulShards: 40,
  gems: 100,
  totalRuns: 0,
  victories: 0,
  totalSkeletonsSlain: 0,
  characterUpgrades: {
    [CharacterId.Zombie]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Skeleton]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Goblin]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Gnome]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Ghost]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Kobold]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Slime]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Lizardfolk]: { ...EMPTY_UPGRADE_RANKS },
  },
  loadouts: {
    [CharacterId.Zombie]: structuredClone(CHARACTER_ROSTER[CharacterId.Zombie].defaultLoadout),
    [CharacterId.Skeleton]: structuredClone(CHARACTER_ROSTER[CharacterId.Skeleton].defaultLoadout),
    [CharacterId.Goblin]: structuredClone(CHARACTER_ROSTER[CharacterId.Goblin].defaultLoadout),
    [CharacterId.Gnome]: structuredClone(CHARACTER_ROSTER[CharacterId.Gnome].defaultLoadout),
    [CharacterId.Ghost]: structuredClone(CHARACTER_ROSTER[CharacterId.Ghost].defaultLoadout),
    [CharacterId.Kobold]: structuredClone(CHARACTER_ROSTER[CharacterId.Kobold].defaultLoadout),
    [CharacterId.Slime]: structuredClone(CHARACTER_ROSTER[CharacterId.Slime].defaultLoadout),
    [CharacterId.Lizardfolk]: structuredClone(CHARACTER_ROSTER[CharacterId.Lizardfolk].defaultLoadout),
  },
  muted: false,
  disableScreenShake: false,
  joystickScale: 1.0,
  skillButtonScale: 1.0,
};

function sanitizeCharacterLoadout(
  charId: CharacterId,
  candidate: Partial<EquippedLoadout> | undefined
): EquippedLoadout {
  const profile = CHARACTER_ROSTER[charId];
  const validNormals = profile.normalSkillIds;
  const validUlts = profile.ultimateSkillIds;

  const normalSkills =
    Array.isArray(candidate?.normalSkills) &&
    candidate.normalSkills.length === 2 &&
    validNormals.includes(candidate.normalSkills[0]) &&
    validNormals.includes(candidate.normalSkills[1]) &&
    candidate.normalSkills[0] !== candidate.normalSkills[1]
      ? (candidate.normalSkills as [NormalSkillId, NormalSkillId])
      : ([...profile.defaultLoadout.normalSkills] as [NormalSkillId, NormalSkillId]);

  const ultimateSkill =
    candidate?.ultimateSkill && validUlts.includes(candidate.ultimateSkill)
      ? candidate.ultimateSkill
      : profile.defaultLoadout.ultimateSkill;

  return { normalSkills, ultimateSkill };
}

function sanitizeUpgradeRanks(
  candidate: Partial<CharacterUpgradeRanks> | undefined
): CharacterUpgradeRanks {
  return {
    pathA: Math.max(0, Math.min(6, Math.floor(candidate?.pathA ?? 0))),
    pathB: Math.max(0, Math.min(6, Math.floor(candidate?.pathB ?? 0))),
    pathC: Math.max(0, Math.min(6, Math.floor(candidate?.pathC ?? 0))),
    pathD: Math.max(0, Math.min(6, Math.floor(candidate?.pathD ?? 0))),
    pathE: Math.max(0, Math.min(5, Math.floor(candidate?.pathE ?? 0))),
  };
}

export function loadGuildSave(): GuildSaveData {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(PREV_V4_STORAGE_KEY) ??
      localStorage.getItem(PREV_V3_STORAGE_KEY) ??
      localStorage.getItem(PREV_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE_DATA);

    const parsed = JSON.parse(raw) as Partial<GuildSaveData> & {
      loadout?: Partial<EquippedLoadout>;
      upgrades?: {
        vitalityRank?: number;
        clawMightRank?: number;
        plaguePotencyRank?: number;
        minionMasteryRank?: number;
        hasteRank?: number;
      };
    };

    const selectedCharacter =
      parsed.selectedCharacter === CharacterId.Skeleton
        ? CharacterId.Skeleton
        : parsed.selectedCharacter === CharacterId.Goblin
        ? CharacterId.Goblin
        : parsed.selectedCharacter === CharacterId.Gnome
        ? CharacterId.Gnome
        : parsed.selectedCharacter === CharacterId.Ghost
        ? CharacterId.Ghost
        : parsed.selectedCharacter === CharacterId.Kobold
        ? CharacterId.Kobold
        : parsed.selectedCharacter === CharacterId.Slime
        ? CharacterId.Slime
        : parsed.selectedCharacter === CharacterId.Lizardfolk
        ? CharacterId.Lizardfolk
        : CharacterId.Zombie;

    const zombieLoadout = sanitizeCharacterLoadout(
      CharacterId.Zombie,
      parsed.loadouts?.[CharacterId.Zombie] ?? parsed.loadout
    );
    const skeletonLoadout = sanitizeCharacterLoadout(
      CharacterId.Skeleton,
      parsed.loadouts?.[CharacterId.Skeleton]
    );
    const goblinLoadout = sanitizeCharacterLoadout(
      CharacterId.Goblin,
      parsed.loadouts?.[CharacterId.Goblin]
    );
    const gnomeLoadout = sanitizeCharacterLoadout(
      CharacterId.Gnome,
      parsed.loadouts?.[CharacterId.Gnome]
    );
    const ghostLoadout = sanitizeCharacterLoadout(
      CharacterId.Ghost,
      parsed.loadouts?.[CharacterId.Ghost]
    );
    const koboldLoadout = sanitizeCharacterLoadout(
      CharacterId.Kobold,
      parsed.loadouts?.[CharacterId.Kobold]
    );
    const slimeLoadout = sanitizeCharacterLoadout(
      CharacterId.Slime,
      parsed.loadouts?.[CharacterId.Slime]
    );
    const lizardfolkLoadout = sanitizeCharacterLoadout(
      CharacterId.Lizardfolk,
      parsed.loadouts?.[CharacterId.Lizardfolk]
    );

    const legacyMapped: CharacterUpgradeRanks | undefined = parsed.upgrades
      ? sanitizeUpgradeRanks({
          pathA: parsed.upgrades.vitalityRank ?? 0,
          pathB: parsed.upgrades.clawMightRank ?? 0,
          pathC: parsed.upgrades.plaguePotencyRank ?? 0,
          pathD: parsed.upgrades.minionMasteryRank ?? 0,
          pathE: parsed.upgrades.hasteRank ?? 0,
        })
      : undefined;

    const characterUpgrades: Record<CharacterId, CharacterUpgradeRanks> = {
      [CharacterId.Zombie]: sanitizeUpgradeRanks(
        parsed.characterUpgrades?.[CharacterId.Zombie] ??
          (selectedCharacter === CharacterId.Zombie ? legacyMapped : undefined)
      ),
      [CharacterId.Skeleton]: sanitizeUpgradeRanks(
        parsed.characterUpgrades?.[CharacterId.Skeleton] ??
          (selectedCharacter === CharacterId.Skeleton ? legacyMapped : undefined)
      ),
      [CharacterId.Goblin]: sanitizeUpgradeRanks(
        parsed.characterUpgrades?.[CharacterId.Goblin] ??
          (selectedCharacter === CharacterId.Goblin ? legacyMapped : undefined)
      ),
      [CharacterId.Gnome]: sanitizeUpgradeRanks(
        parsed.characterUpgrades?.[CharacterId.Gnome] ??
          (selectedCharacter === CharacterId.Gnome ? legacyMapped : undefined)
      ),
      [CharacterId.Ghost]: sanitizeUpgradeRanks(
        parsed.characterUpgrades?.[CharacterId.Ghost] ??
          (selectedCharacter === CharacterId.Ghost ? legacyMapped : undefined)
      ),
      [CharacterId.Kobold]: sanitizeUpgradeRanks(
        parsed.characterUpgrades?.[CharacterId.Kobold] ??
          (selectedCharacter === CharacterId.Kobold ? legacyMapped : undefined)
      ),
      [CharacterId.Slime]: sanitizeUpgradeRanks(
        parsed.characterUpgrades?.[CharacterId.Slime] ??
          (selectedCharacter === CharacterId.Slime ? legacyMapped : undefined)
      ),
      [CharacterId.Lizardfolk]: sanitizeUpgradeRanks(
        parsed.characterUpgrades?.[CharacterId.Lizardfolk] ??
          (selectedCharacter === CharacterId.Lizardfolk ? legacyMapped : undefined)
      ),
    };

    const selectedDifficulty =
      parsed.selectedDifficulty === DifficultyLevel.Normal
        ? DifficultyLevel.Normal
        : parsed.selectedDifficulty === DifficultyLevel.Hard
        ? DifficultyLevel.Hard
        : parsed.selectedDifficulty === DifficultyLevel.Torment
        ? DifficultyLevel.Torment
        : parsed.selectedDifficulty === DifficultyLevel.Nightmare
        ? DifficultyLevel.Nightmare
        : DifficultyLevel.Easy;

    const clampUiScale = (val: unknown): number => {
      if (typeof val !== 'number' || Number.isNaN(val)) return 1.0;
      return Math.max(0.7, Math.min(1.35, Math.round(val * 100) / 100));
    };

    return {
      selectedCharacter,
      selectedDifficulty,
      soulShards:
        typeof parsed.soulShards === 'number' ? parsed.soulShards : DEFAULT_SAVE_DATA.soulShards,
      gems:
        typeof parsed.gems === 'number' ? parsed.gems : DEFAULT_SAVE_DATA.gems,
      totalRuns: typeof parsed.totalRuns === 'number' ? parsed.totalRuns : 0,
      victories: typeof parsed.victories === 'number' ? parsed.victories : 0,
      totalSkeletonsSlain:
        typeof parsed.totalSkeletonsSlain === 'number' ? parsed.totalSkeletonsSlain : 0,
      characterUpgrades,
      loadouts: {
        [CharacterId.Zombie]: zombieLoadout,
        [CharacterId.Skeleton]: skeletonLoadout,
        [CharacterId.Goblin]: goblinLoadout,
        [CharacterId.Gnome]: gnomeLoadout,
        [CharacterId.Ghost]: ghostLoadout,
        [CharacterId.Kobold]: koboldLoadout,
        [CharacterId.Slime]: slimeLoadout,
        [CharacterId.Lizardfolk]: lizardfolkLoadout,
      },
      muted: Boolean(parsed.muted),
      disableScreenShake: Boolean(parsed.disableScreenShake),
      joystickScale: clampUiScale(parsed.joystickScale),
      skillButtonScale: clampUiScale(parsed.skillButtonScale),
    };
  } catch {
    return structuredClone(DEFAULT_SAVE_DATA);
  }
}

export function persistGuildSave(data: GuildSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in sandboxed frames
  }
}

export function getUpgradeCost(def: CharacterUpgradeNodeDef, currentRank: number): number {
  return def.baseCost + currentRank * def.costStep;
}

export function computeCharacterStarRank(ranks: CharacterUpgradeRanks): number {
  const totalRanks = ranks.pathA + ranks.pathB + ranks.pathC + ranks.pathD + ranks.pathE;
  return Math.min(6, 1 + Math.floor(totalRanks / 4));
}
