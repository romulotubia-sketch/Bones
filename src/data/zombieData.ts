import gnomePortraitImg from '../assets/images/gnome_hero_portrait_1793315632139.jpg';
import goblinPortraitImg from '../assets/images/goblin_hero_portrait_1793313607661.jpg';
import graveyardBiomeImg from '../assets/images/graveyard_biome_card_1793308236254.jpg';
import skeletonBossImg from '../assets/images/skeleton_boss_portrait_1793308236655.jpg';
import skeletonPortraitImg from '../assets/images/skeleton_hero_portrait_1793311951924.jpg';
import zombiePortraitImg from '../assets/images/zombie_hero_portrait_1793308234967.jpg';
import {
  CharacterId,
  CharacterUpgradeRanks,
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
    guildSpot: { x: -210, y: -25, facingX: 1 },
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
    guildSpot: { x: 115, y: 20, facingX: -1 },
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
    guildSpot: { x: -45, y: 98, facingX: 1 },
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
    guildSpot: { x: -210, y: 98, facingX: 1 },
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
};

export const CHARACTER_LIST: CharacterProfileDef[] = [
  CHARACTER_ROSTER[CharacterId.Zombie],
  CHARACTER_ROSTER[CharacterId.Skeleton],
  CHARACTER_ROSTER[CharacterId.Goblin],
  CHARACTER_ROSTER[CharacterId.Gnome],
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
      description: '+45 Max HP, heals 45 HP now, and bursts a toxic cloud when hit.',
    },
    {
      id: 'zombie_necrotic_claws',
      characterId: CharacterId.Zombie,
      name: 'Necrotic Talons',
      category: 'Basic Claw · Gas',
      description: '+25% Claw damage; every 3rd basic slash spawns a toxic gas puff.',
    },
    {
      id: 'zombie_feast_of_rot',
      characterId: CharacterId.Zombie,
      name: 'Gorged Carrion',
      category: 'Carrion Hunger',
      description: 'Carrion Hunger orbs heal +10 extra HP and grant +22% Ult charge.',
    },
    {
      id: 'zombie_virulent_strain',
      characterId: CharacterId.Zombie,
      name: 'Black Blight',
      category: 'Infectious Touch',
      description: 'Infections stack to 6x, deal +35% DoT, and burst wider on kill.',
    },
    {
      id: 'zombie_skill_rotting_claw',
      characterId: CharacterId.Zombie,
      name: 'Festering Mauling',
      category: 'Rotting Claw · 4-Hit',
      description: 'Rotting Claw strikes 4 times, deals +25% damage, and stacks 2 Infection.',
      requiredNormalSkill: NormalSkillId.RottingClaw,
    },
    {
      id: 'zombie_skill_plague_burst',
      characterId: CharacterId.Zombie,
      name: 'Miasma Eruption',
      category: 'Plague Burst · Wide',
      description: 'Plague Burst covers +35% wider area, lasts +2s, and slows foes 35%.',
      requiredNormalSkill: NormalSkillId.PlagueBurst,
    },
    {
      id: 'zombie_skill_flesh_ripper',
      characterId: CharacterId.Zombie,
      name: 'Gore Lunge',
      category: 'Flesh Ripper · Trail',
      description: 'Flesh Ripper deals +35% damage, heals 6 HP/hit, and leaves toxic gas.',
      requiredNormalSkill: NormalSkillId.FleshRipper,
    },
    {
      id: 'zombie_skill_undying_flesh',
      characterId: CharacterId.Zombie,
      name: 'Spined Carapace',
      category: 'Undying Flesh · Ward',
      description: 'Undying Flesh lasts +2.5s longer and pulses necrotic thorns nearby.',
      requiredNormalSkill: NormalSkillId.UndyingFlesh,
    },
    {
      id: 'zombie_skill_grave_call',
      characterId: CharacterId.Zombie,
      name: 'Overflowing Graves',
      category: 'Grave Call · Pack',
      description: 'Grave Call raises +2 extra frenzied zombies with +25% move speed.',
      requiredNormalSkill: NormalSkillId.GraveCall,
    },
    {
      id: 'zombie_ult_abomination',
      characterId: CharacterId.Zombie,
      name: 'Behemoth Mutation',
      category: 'Abomination Form',
      description: 'Abomination Form lasts +4s, heals +20% HP, and resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.AbominationForm,
    },
    {
      id: 'zombie_ult_kingdom',
      characterId: CharacterId.Zombie,
      name: 'Lord of Graves',
      category: 'Kingdom of the Dead',
      description: 'Kingdom of the Dead raises +3 extra zombies and resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.KingdomOfTheDead,
    },
    {
      id: 'zombie_ult_embrace',
      characterId: CharacterId.Zombie,
      name: 'Ravenous Embrace',
      category: "Death's Embrace",
      description: "Death's Embrace deals +40% damage, drains +10 HP/foe, & resets Skills.",
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
      description: '+20% Crit Chance and +35% Crit Damage with all bone weapons.',
    },
    {
      id: 'skel_splinter_burst',
      characterId: CharacterId.Skeleton,
      name: 'Shattering Marrow',
      category: 'Crit · Splinters',
      description: 'Critical Strikes burst razor bone splinters into nearby foes.',
    },
    {
      id: 'skel_fortified_ribs',
      characterId: CharacterId.Skeleton,
      name: 'Aegis of Marrow',
      category: 'Unyielding Bones',
      description: '+32 Max HP, heals 32 HP, and Unyielding Bones stacks up to 4x.',
    },
    {
      id: 'skel_phantom_stride',
      characterId: CharacterId.Skeleton,
      name: 'Wraithbone Tempo',
      category: 'Speed · Haste',
      description: '+18% move & attack speed and -20% equipped Skill cooldowns.',
    },
    {
      id: 'skel_skill_bone_slash',
      characterId: CharacterId.Skeleton,
      name: 'Crescent Ossuary',
      category: 'Bone Slash · Wave',
      description: 'Bone Slash deals +28% damage and launches a piercing bone wave.',
      requiredNormalSkill: NormalSkillId.BoneSlash,
    },
    {
      id: 'skel_skill_bone_spear',
      characterId: CharacterId.Skeleton,
      name: 'Twin-Spine Lance',
      category: 'Bone Spear · Volley',
      description: 'Bone Spear fires 2 parallel piercing lances with +25% Crit Chance.',
      requiredNormalSkill: NormalSkillId.BoneSpear,
    },
    {
      id: 'skel_skill_ribcage_shield',
      characterId: CharacterId.Skeleton,
      name: 'Spiked Sternum',
      category: 'Ribcage Shield · Nova',
      description: 'Ribcage Shield gains +2 rib charges and shatters foes on block.',
      requiredNormalSkill: NormalSkillId.RibcageShield,
    },
    {
      id: 'skel_skill_skeletal_rush',
      characterId: CharacterId.Skeleton,
      name: 'Phantom Dash',
      category: 'Skeletal Rush · Crit',
      description: 'Skeletal Rush guarantees Critical Strikes & refunds 1.5s CD on hit.',
      requiredNormalSkill: NormalSkillId.SkeletalRush,
    },
    {
      id: 'skel_skill_bone_storm',
      characterId: CharacterId.Skeleton,
      name: 'Maelstrom of Shards',
      category: 'Bone Storm · Vortex',
      description: 'Bone Storm lasts +3s longer with +30% wider vortex radius & power.',
      requiredNormalSkill: NormalSkillId.BoneStorm,
    },
    {
      id: 'skel_ult_colossus',
      characterId: CharacterId.Skeleton,
      name: 'Dread Colossus',
      category: 'Bone Colossus',
      description: 'Bone Colossus lasts +4s, pulses faster quakes, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.BoneColossus,
    },
    {
      id: 'skel_ult_army',
      characterId: CharacterId.Skeleton,
      name: 'Immortal Phalanx',
      category: 'Army of Bones',
      description: 'Army of Bones raises +3 extra Bone Warriors and resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.ArmyOfBones,
    },
    {
      id: 'skel_ult_reaper',
      characterId: CharacterId.Skeleton,
      name: 'Soul Harvest',
      category: "Reaper's Judgment",
      description: "Reaper's Judgment fires 3 Dark Waves, heals 25 HP, & resets Skills.",
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
      description: '+22% Crit Chance and +40% Crit Damage on backstabs & weak foes.',
    },
    {
      id: 'gob_shadow_clone',
      characterId: CharacterId.Goblin,
      name: 'Mirage Decoy',
      category: 'Nimble Reflexes',
      description: '+12% Evasion; dodging unleashes a spinning shadow counter-slash.',
    },
    {
      id: 'gob_viper_toxin',
      characterId: CharacterId.Goblin,
      name: 'Nightshade Fangs',
      category: 'Daggers · Weaken',
      description: 'Basic dagger strikes coat enemies in Weakening Venom automatically.',
    },
    {
      id: 'gob_quicksilver_boots',
      characterId: CharacterId.Goblin,
      name: 'Quicksilver Step',
      category: 'Agility · Reset',
      description: '+20% move speed; slaying an enemy cuts equipped Skill CDs by 1.2s.',
    },
    {
      id: 'gob_skill_dagger_flurry',
      characterId: CharacterId.Goblin,
      name: 'Sevenfold Cuts',
      category: 'Dagger Flurry · 7-Hit',
      description: 'Dagger Flurry unleashes 7 rapid strikes ending in a wide crit slash.',
      requiredNormalSkill: NormalSkillId.DaggerFlurry,
    },
    {
      id: 'gob_skill_shadowstep',
      characterId: CharacterId.Goblin,
      name: 'Umbral Ambush',
      category: 'Shadowstep · Crit',
      description: 'Shadowstep guarantees a Critical Backstab and cuts CD by 2s on hit.',
      requiredNormalSkill: NormalSkillId.Shadowstep,
    },
    {
      id: 'gob_skill_explosive_trap',
      characterId: CharacterId.Goblin,
      name: 'Goblin Kegpowder',
      category: 'Explosive Trap · Gas',
      description: 'Explosive Traps deal +45% damage and leave a toxic venom cloud.',
      requiredNormalSkill: NormalSkillId.ExplosiveTrap,
    },
    {
      id: 'gob_skill_windrunner',
      characterId: CharacterId.Goblin,
      name: 'Zephyr Gale',
      category: 'Windrunner · Blades',
      description: 'Windrunner lasts +2.5s and throws enchanted daggers when striking.',
      requiredNormalSkill: NormalSkillId.Windrunner,
    },
    {
      id: 'gob_skill_poisoned_blades',
      characterId: CharacterId.Goblin,
      name: 'Corrosive Vials',
      category: 'Poisoned Blades · DoT',
      description: 'Poisoned Blades lasts +3s, stacks 2x faster, & deals +40% venom DoT.',
      requiredNormalSkill: NormalSkillId.PoisonedBlades,
    },
    {
      id: 'gob_ult_phantom',
      characterId: CharacterId.Goblin,
      name: 'Endless Mirage',
      category: 'Phantom Frenzy',
      description: 'Phantom Frenzy strikes 11 times, heals 24 HP, & resets Normal Skills.',
      requiredUltimateSkill: UltimateSkillId.PhantomFrenzy,
    },
    {
      id: 'gob_ult_thieves',
      characterId: CharacterId.Goblin,
      name: 'Royal Plunder',
      category: 'King of Thieves',
      description: 'King of Thieves chains 8 ambushes, steals 2x gold, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.KingOfThieves,
    },
    {
      id: 'gob_ult_thousand',
      characterId: CharacterId.Goblin,
      name: 'Emerald Tempest',
      category: 'Thousand Daggers',
      description: 'Thousand Daggers lasts +1.6s, widens +25%, and resets Normal Skills.',
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
      description: '+48 Max HP, heals 48 HP now, and adds +10% Unbreakable Armor.',
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
      description: 'Lasting Resolve scales faster and grants up to +35% bonus damage.',
    },
    {
      id: 'gnome_concussive_gauntlets',
      characterId: CharacterId.Gnome,
      name: 'Concussive Knuckles',
      category: 'Gauntlet · Stagger',
      description: '+25% punch damage; every 3rd punch triggers a stunning earth pulse.',
    },
    {
      id: 'gnome_skill_iron_fist',
      characterId: CharacterId.Gnome,
      name: 'Tectonic Knuckle',
      category: 'Iron Fist · Quake',
      description: 'Iron Fist deals +35% damage, stuns +0.7s, & triggers an aftershock.',
      requiredNormalSkill: NormalSkillId.IronFist,
    },
    {
      id: 'gnome_skill_fortress_stance',
      characterId: CharacterId.Gnome,
      name: 'Aegis Bastion',
      category: 'Fortress Stance · Heal',
      description: 'Fortress Stance lasts +2.5s, heals 30% HP, and pulses tremors.',
      requiredNormalSkill: NormalSkillId.FortressStance,
    },
    {
      id: 'gnome_skill_groundbreaker',
      characterId: CharacterId.Gnome,
      name: 'Faultline Crash',
      category: 'Groundbreaker · Crater',
      description: 'Groundbreaker covers +35% wider area, +35% damage, & 1.5s stun.',
      requiredNormalSkill: NormalSkillId.Groundbreaker,
    },
    {
      id: 'gnome_skill_magnetic_guard',
      characterId: CharacterId.Gnome,
      name: 'Overcharged Coil',
      category: 'Magnetic Guard · Arc',
      description: 'Magnetic Guard lasts +2.5s, doubles reflect power, & zaps nearby foes.',
      requiredNormalSkill: NormalSkillId.MagneticGuard,
    },
    {
      id: 'gnome_skill_earthen_grasp',
      characterId: CharacterId.Gnome,
      name: 'Crushing Stonehands',
      category: 'Earthen Grasp · Root',
      description: 'Earthen Grasp immobilizes +1.2s longer and deals +45% crush damage.',
      requiredNormalSkill: NormalSkillId.EarthenGrasp,
    },
    {
      id: 'gnome_ult_mountain',
      characterId: CharacterId.Gnome,
      name: 'Living Mountain',
      category: "Mountain's Heart",
      description: "Mountain's Heart lasts +4s, heals 35% HP, and resets Normal Skills.",
      requiredUltimateSkill: UltimateSkillId.MountainsHeart,
    },
    {
      id: 'gnome_ult_rampart',
      characterId: CharacterId.Gnome,
      name: 'Citadel Bastion',
      category: "Titan's Rampart",
      description: "Titan's Rampart lasts +3s, pulses quakes inside, & resets Skills.",
      requiredUltimateSkill: UltimateSkillId.TitansRampart,
    },
    {
      id: 'gnome_ult_cataclysm',
      characterId: CharacterId.Gnome,
      name: 'Worldshatter',
      category: 'Cataclysmic Slam',
      description: 'Cataclysmic Slam unleashes a 4th mega-wave, stuns 2s, & resets Skills.',
      requiredUltimateSkill: UltimateSkillId.CataclysmicSlam,
    },
  ],
};

export function getStatueBlessingsForCharacter(charId: CharacterId): RunBlessing[] {
  return CHARACTER_STATUE_BLESSINGS[charId] ?? CHARACTER_STATUE_BLESSINGS[CharacterId.Zombie];
}

/**
 * Strictly filters a character's Lantern Statue blessings to ONLY those in line with
 * the character's currently equipped 2 Normal Skills and 1 Ultimate Skill (plus core/passive blessings).
 * Blessings for unequipped skills are guaranteed never to appear.
 */
export function getEligibleStatueBlessings(
  charId: CharacterId,
  loadout: EquippedLoadout
): RunBlessing[] {
  const pool = getStatueBlessingsForCharacter(charId);
  return pool.filter((b) => {
    if (b.requiredNormalSkill && !loadout.normalSkills.includes(b.requiredNormalSkill)) {
      return false;
    }
    if (b.requiredUltimateSkill && b.requiredUltimateSkill !== loadout.ultimateSkill) {
      return false;
    }
    return true;
  });
}

export const EMPTY_UPGRADE_RANKS: CharacterUpgradeRanks = {
  pathA: 0,
  pathB: 0,
  pathC: 0,
  pathD: 0,
  pathE: 0,
};

const STORAGE_KEY = 'hearth_and_bone_save_v4';
const PREV_V3_STORAGE_KEY = 'hearth_and_bone_save_v3';
const PREV_STORAGE_KEY = 'hearth_and_bone_save_v2';
const LEGACY_STORAGE_KEY = 'hearth_and_bone_save_v1';

export const DEFAULT_SAVE_DATA: GuildSaveData = {
  selectedCharacter: CharacterId.Zombie,
  soulShards: 40,
  totalRuns: 0,
  victories: 0,
  totalSkeletonsSlain: 0,
  characterUpgrades: {
    [CharacterId.Zombie]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Skeleton]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Goblin]: { ...EMPTY_UPGRADE_RANKS },
    [CharacterId.Gnome]: { ...EMPTY_UPGRADE_RANKS },
  },
  loadouts: {
    [CharacterId.Zombie]: structuredClone(CHARACTER_ROSTER[CharacterId.Zombie].defaultLoadout),
    [CharacterId.Skeleton]: structuredClone(CHARACTER_ROSTER[CharacterId.Skeleton].defaultLoadout),
    [CharacterId.Goblin]: structuredClone(CHARACTER_ROSTER[CharacterId.Goblin].defaultLoadout),
    [CharacterId.Gnome]: structuredClone(CHARACTER_ROSTER[CharacterId.Gnome].defaultLoadout),
  },
  muted: false,
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
    };

    return {
      selectedCharacter,
      soulShards:
        typeof parsed.soulShards === 'number' ? parsed.soulShards : DEFAULT_SAVE_DATA.soulShards,
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
      },
      muted: Boolean(parsed.muted),
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
