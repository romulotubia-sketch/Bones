/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AwakenedPathKey,
  AwakeningStatus,
  CharacterId,
  GuildSaveData,
  UltimateSkillId,
} from '../types/game';

export interface AwakeningPathDef {
  id: string;
  characterId: CharacterId;
  ultimateId: UltimateSkillId;
  path: 'PATH_A' | 'PATH_B';
  name: string;
  tagline: string;
  badge: string;
  color: string;
  secondaryColor: string;
  description: string;
  mechanics: string[];
}

export const AWAKENING_COST_GEMS = 25;
export const AWAKENING_BASE_SUCCESS_CHANCE = 0.22; // 22% base low-chance roll
export const TRANSMUTE_SHARDS_COST = 50;
export const TRANSMUTE_GEMS_YIELD = 25;

export const CHARACTER_AWAKENING_IDENTITIES: Record<
  CharacterId,
  {
    theme: string;
    identityLine: string;
    glowColor: string;
    accentBg: string;
  }
> = {
  [CharacterId.Zombie]: {
    theme: 'Infection · Mutation · Soul Consumption',
    identityLine: 'Spreads festering blight, breeds mutant thralls, and feeds on fallen life essence.',
    glowColor: '#4ADE80',
    accentBg: '#14532D',
  },
  [CharacterId.Skeleton]: {
    theme: 'Bone Transformations · Military Formations · Spectral Execution',
    identityLine: 'Commands disciplined legion warfare, reshapes into colossal draconic bone forms, and executes souls.',
    glowColor: '#38BDF8',
    accentBg: '#0C4A6E',
  },
  [CharacterId.Goblin]: {
    theme: 'Illusions · Deception · Cursed Treasures',
    identityLine: 'Weaves deceptive phantom reflections, steals slain combat styles, and drops cursed golden relics.',
    glowColor: '#F59E0B',
    accentBg: '#78350F',
  },
  [CharacterId.Gnome]: {
    theme: 'Earth Manipulation · Fortresses · Gravity',
    identityLine: 'Erects battlefield-splitting ramparts, invokes living stone fortresses, and triggers gravity singularities.',
    glowColor: '#E2E8F0',
    accentBg: '#334155',
  },
  [CharacterId.Ghost]: {
    theme: 'Haunted Dimensions · Possession · Underworld Gates',
    identityLine: 'Drags enemies into the ghost dimension, possesses foes with friendly fire, and opens Stygian gates.',
    glowColor: '#C084FC',
    accentBg: '#581C87',
  },
  [CharacterId.Kobold]: {
    theme: 'Mechanical Inventions · Artillery · Experimental Weapons',
    identityLine: 'Summons walking combat mechs, signals skyfall airship bombardments, and locks on with railgun aim.',
    glowColor: '#F97316',
    accentBg: '#7C2D12',
  },
};

export const AWAKENING_PATHS: Record<
  CharacterId,
  Partial<Record<UltimateSkillId, { pathA: AwakeningPathDef; pathB: AwakeningPathDef }>>
> = {
  // ==========================================
  // 1. ZOMBIE
  // ==========================================
  [CharacterId.Zombie]: {
    [UltimateSkillId.AbominationForm]: {
      pathA: {
        id: 'zombie_abom_path_a',
        characterId: CharacterId.Zombie,
        ultimateId: UltimateSkillId.AbominationForm,
        path: 'PATH_A',
        name: 'Plague Behemoth',
        tagline: 'Toxic Fumes & Spreading Infection',
        badge: 'Toxic Colossus',
        color: '#4ADE80',
        secondaryColor: '#A3E635',
        description:
          'The Zombie transforms into a gigantic plague creature. Its body continuously releases toxic fumes, and its attacks leave infected ground behind. Enemies defeated by the plague mutate into special infected creatures.',
        mechanics: [
          'Continuous noxious aura pulses poison damage in a 160px radius every 0.35s.',
          'Claws and stomps paint lingering bubbling plague pools on the floor.',
          'Slain infected enemies violently mutate into exploding plague runners that charge other monsters.',
        ],
      },
      pathB: {
        id: 'zombie_abom_path_b',
        characterId: CharacterId.Zombie,
        ultimateId: UltimateSkillId.AbominationForm,
        path: 'PATH_B',
        name: 'Flesh Colossus',
        tagline: 'Limb Weapons & Flesh Absorption',
        badge: 'Grave Juggernaut',
        color: '#34D399',
        secondaryColor: '#2DD4BF',
        description:
          'The Zombie becomes a massive creature made from accumulated flesh and bones. It can extend its limbs into enormous weapons, launch chunks of its body at enemies, and absorb fallen creatures to reconstruct damaged parts.',
        mechanics: [
          'Melee reach extends to 155px with bone-scythe cleaves striking 180° arcs.',
          'Launches explosive bone-flesh chunks at distant enemies every 1.4s.',
          'Absorbing fallen creatures heals 15% Max HP and grants stacking Bone Carapace defense.',
        ],
      },
    },
    [UltimateSkillId.KingdomOfTheDead]: {
      pathA: {
        id: 'zombie_kingdom_path_a',
        characterId: CharacterId.Zombie,
        ultimateId: UltimateSkillId.KingdomOfTheDead,
        path: 'PATH_A',
        name: 'The Undying Kingdom',
        tagline: 'Three Undead Commanders & Disciplined Legion',
        badge: 'Royal Dynasty',
        color: '#86EFAC',
        secondaryColor: '#22C55E',
        description:
          'The Zombie summons an undead army led by three powerful undead commanders. Each commander controls a different group of undead, creating an organized army rather than an uncontrolled horde.',
        mechanics: [
          'Commander of Blades leads armored cleavers with synchronized whirlwind strikes.',
          'Commander of Graves casts lingering rot spires and bolsters legion health.',
          'Commander of Shadows leads phantom stalkers executing isolated foes from behind.',
        ],
      },
      pathB: {
        id: 'zombie_kingdom_path_b',
        characterId: CharacterId.Zombie,
        ultimateId: UltimateSkillId.KingdomOfTheDead,
        path: 'PATH_B',
        name: 'Graveyard Awakening',
        tagline: 'Sunken Graves & Rising Revenants',
        badge: 'Catacomb Eruption',
        color: '#6EE7B7',
        secondaryColor: '#10B981',
        description:
          'The battlefield transforms into a massive graveyard. Hands emerge from the ground and continuously drag enemies underground. Defeated enemies can be buried and later emerge as stronger undead soldiers.',
        mechanics: [
          'Floor transforms into dark consecrated graveyard soil throughout the chamber.',
          'Skeletal hands constantly grasp and pin monsters, rooting them for 2.5s.',
          'Buried foes re-emerge from freshly dug graves as heavy armored crypt revenants.',
        ],
      },
    },
    [UltimateSkillId.DeathsEmbrace]: {
      pathA: {
        id: 'zombie_embrace_path_a',
        characterId: CharacterId.Zombie,
        ultimateId: UltimateSkillId.DeathsEmbrace,
        path: 'PATH_A',
        name: 'Plague Rebirth',
        tagline: 'Cataclysmic Shockwave & Mini Zombie Swarm',
        badge: 'Pandemic Wave',
        color: '#A3E635',
        secondaryColor: '#FACC15',
        description:
          'The plague wave becomes significantly more powerful. Enemies killed during the ultimate have a chance to become mini zombies that attack nearby enemies.',
        mechanics: [
          'Shockwave expands with +80% radius and leaves a 6-second searing plague vortex.',
          'Enemies slain during or shortly after the blast spawn swift mini zombies.',
          'Mini zombies pounce upon surviving targets with rapid frenzy biting.',
        ],
      },
      pathB: {
        id: 'zombie_embrace_path_b',
        characterId: CharacterId.Zombie,
        ultimateId: UltimateSkillId.DeathsEmbrace,
        path: 'PATH_B',
        name: 'Soul Devourer',
        tagline: 'Spectral Maw & Orbiting Soul Missiles',
        badge: 'Ethereal Hunger',
        color: '#2DD4BF',
        secondaryColor: '#06B6D4',
        description:
          'The Zombie creates a massive spectral mouth that consumes the life force of enemies caught in the attack. The absorbed souls become visible floating spirits that orbit the Zombie and can be released as seeking projectiles.',
        mechanics: [
          'Opens a colossal swirling spirit maw that pulls all nearby foes toward the center.',
          'Absorbed souls condense into 6 luminous ethereal soul orbs orbiting the hero.',
          'Attacking fires orbiting soul orbs as high-speed homing spirit projectiles.',
        ],
      },
    },
  },

  // ==========================================
  // 2. SKELETON
  // ==========================================
  [CharacterId.Skeleton]: {
    [UltimateSkillId.BoneColossus]: {
      pathA: {
        id: 'skel_colossus_path_a',
        characterId: CharacterId.Skeleton,
        ultimateId: UltimateSkillId.BoneColossus,
        path: 'PATH_A',
        name: 'Ancient Bone Titan',
        tagline: 'Six Arms & Simultaneous Omnidirectional Cleaves',
        badge: 'Hexa-Blade',
        color: '#38BDF8',
        secondaryColor: '#60A5FA',
        description:
          'The Skeleton transforms into an enormous skeletal warrior with several additional arms, each wielding a different bone weapon. It can attack multiple directions simultaneously, overwhelming surrounding enemies with weapon combinations.',
        mechanics: [
          'Gains 6 animated arms wielding Greatsword, Scythe, Lance, and Spiked Flail.',
          'Every attack executes a full 360° sweeping whirlwind of blades and bludgeons.',
          'Cleaves shatter enemy armor, inflicting stacking 20% vulnerability.',
        ],
      },
      pathB: {
        id: 'skel_colossus_path_b',
        characterId: CharacterId.Skeleton,
        ultimateId: UltimateSkillId.BoneColossus,
        path: 'PATH_B',
        name: 'Bone Dragon',
        tagline: 'Skeletal Flight, Wing Sweeps & Bone Breath',
        badge: 'Draconic Form',
        color: '#7DD3FC',
        secondaryColor: '#93C5FD',
        description:
          "The Skeleton's body expands and reshapes into a massive skeletal dragon. It gains the ability to fly briefly, sweep the battlefield with its skeletal wings, and unleash a devastating bone breath attack.",
        mechanics: [
          'Airborne hover ignores terrain and floor traps while increasing move speed by 45%.',
          'Wing flaps release wide concussive gale blades knocking enemies backward.',
          'Channeling releases Dragon Bone Breath — a continuous beam of searing white-hot soul fire.',
        ],
      },
    },
    [UltimateSkillId.ArmyOfBones]: {
      pathA: {
        id: 'skel_army_path_a',
        characterId: CharacterId.Skeleton,
        ultimateId: UltimateSkillId.ArmyOfBones,
        path: 'PATH_A',
        name: 'The Four Generals',
        tagline: 'Swordsmen, Spearmen, Archers & Shield Bearers',
        badge: 'Grand Phalanx',
        color: '#93C5FD',
        secondaryColor: '#3B82F6',
        description:
          'The Skeleton summons four elite skeletal generals, each commanding a specialized unit: swordsmen, spearmen, archers, and shield bearers. The generals coordinate their forces to surround and overwhelm enemies.',
        mechanics: [
          'Sword General leads frontline charging assaults with dual bone katanas.',
          'Spear General impales through rows of enemies with piercing thrusts.',
          'Archer General rains down repeating barrages of bone volleys.',
          'Shield General erects impenetrable bone barricades that intercept projectiles.',
        ],
      },
      pathB: {
        id: 'skel_army_path_b',
        characterId: CharacterId.Skeleton,
        ultimateId: UltimateSkillId.ArmyOfBones,
        path: 'PATH_B',
        name: 'The Bone Fortress',
        tagline: 'Erupting Citadel & Heavy Bone Cannons',
        badge: 'Siege Bastion',
        color: '#60A5FA',
        secondaryColor: '#2563EB',
        description:
          'The Skeleton summons a gigantic skeletal fortress from the ground. Skeleton warriors emerge from its gates, while enormous bone cannons automatically fire at enemies throughout the battlefield.',
        mechanics: [
          'Fortress rises in the room, taunting enemies and absorbing massive damage.',
          'Portcullis gates continuously deploy skeletal vanguard fighters.',
          'Dual heavy bone cannons bombard distant clusters with explosive mortar shells.',
        ],
      },
    },
    [UltimateSkillId.ReapersJudgment]: {
      pathA: {
        id: 'skel_reaper_path_a',
        characterId: CharacterId.Skeleton,
        ultimateId: UltimateSkillId.ReapersJudgment,
        path: 'PATH_A',
        name: 'Soul Severance',
        tagline: 'Panoramic Scythe Sweep & Timed Soul Execution',
        badge: 'Soul Seal',
        color: '#BAE6FD',
        secondaryColor: '#E0F2FE',
        description:
          'The Skeleton summons a gigantic spectral scythe that marks enemies with a soul seal. When the ultimate concludes, all marked enemies are struck by a simultaneous spectral execution.',
        mechanics: [
          'Colossal translucent scythe cleaves across the screen, marking all targets with Soul Seals.',
          'Marked targets suffer 35% movement slow and bleed spectral essence.',
          'When the timer expires, a solemn death bell tolls and execution strikes execute all marked targets.',
        ],
      },
      pathB: {
        id: 'skel_reaper_path_b',
        characterId: CharacterId.Skeleton,
        ultimateId: UltimateSkillId.ReapersJudgment,
        path: 'PATH_B',
        name: 'The Black Reaper',
        tagline: 'Shadow Melding, Sweeping Cleaves & Movement Traps',
        badge: 'Cursed Shadows',
        color: '#C084FC',
        secondaryColor: '#818CF8',
        description:
          'The Skeleton temporarily becomes a spectral reaper. It can disappear into shadows and emerge with enormous scythe strikes, leaving behind cursed marks that trigger additional attacks when enemies move.',
        mechanics: [
          'Dashing causes the hero to phase into shadowy smoke, bypassing collisions.',
          'Re-emerging unleashes crescent dark-scythe slashes leaving cursed shadow runes.',
          'Whenever an enemy moves over a rune, explosive shadow spikes erupt beneath them.',
        ],
      },
    },
  },

  // ==========================================
  // 3. GOBLIN
  // ==========================================
  [CharacterId.Goblin]: {
    [UltimateSkillId.PhantomFrenzy]: {
      pathA: {
        id: 'goblin_frenzy_path_a',
        characterId: CharacterId.Goblin,
        ultimateId: UltimateSkillId.PhantomFrenzy,
        path: 'PATH_A',
        name: 'Thousand Reflections',
        tagline: 'Battlefield Mirages & Unpredictable Assaults',
        badge: 'Mirror Army',
        color: '#F59E0B',
        secondaryColor: '#FBBF24',
        description:
          'The Goblin creates a battlefield filled with illusionary copies. Each copy performs different attack patterns, making it difficult for enemies to determine which Goblin is real.',
        mechanics: [
          'Spawns 6 illusionary Goblin clones that dash, slash, and taunt foes across the chamber.',
          'Monsters lose targeting and mistakenly attack the deceptive reflections.',
          'Reflections deal 45% real slash damage and explode into smoke when struck.',
        ],
      },
      pathB: {
        id: 'goblin_frenzy_path_b',
        characterId: CharacterId.Goblin,
        ultimateId: UltimateSkillId.PhantomFrenzy,
        path: 'PATH_B',
        name: 'Phantom Executioner',
        tagline: 'Crimson Crosshairs & Omnipresent Flashes',
        badge: 'Omni-Slash',
        color: '#F97316',
        secondaryColor: '#EF4444',
        description:
          'The Goblin marks several enemies as targets. It then vanishes and rapidly appears beside each marked enemy, performing a coordinated sequence of precision attacks before returning to its original position.',
        mechanics: [
          'Marks all visible enemies with glowing crimson execution target reticles.',
          'Vanish into the shadows, triggering rapid instantaneous teleport strikes at each marked foe.',
          'Flashes back to the origin point with a crisp dagger sheath click as enemies take burst damage.',
        ],
      },
    },
    [UltimateSkillId.KingOfThieves]: {
      pathA: {
        id: 'goblin_thieves_path_a',
        characterId: CharacterId.Goblin,
        ultimateId: UltimateSkillId.KingOfThieves,
        path: 'PATH_A',
        name: 'Stolen Identity',
        tagline: 'Mimic Fighting Styles & Mirage Replicas',
        badge: 'Identity Thief',
        color: '#FBBF24',
        secondaryColor: '#F59E0B',
        description:
          'The Goblin steals the appearance and fighting style of enemies it attacks. It temporarily creates illusionary copies of defeated enemies that fight on its behalf.',
        mechanics: [
          'Striking enemies absorbs their martial techniques and increases attack speed by 50%.',
          'Defeated foes manifest as golden mirage specters fighting on the Goblin’s side.',
          'Specters wield the exact attack animations and projectiles of their original forms.',
        ],
      },
      pathB: {
        id: 'goblin_thieves_path_b',
        characterId: CharacterId.Goblin,
        ultimateId: UltimateSkillId.KingOfThieves,
        path: 'PATH_B',
        name: 'Treasure of a Thousand Souls',
        tagline: 'Cursed Treasure Chest & Seeking Golden Coins',
        badge: 'Cursed Greed',
        color: '#EAB308',
        secondaryColor: '#CA8A04',
        description:
          'The Goblin opens a magical treasure chest that releases cursed golden coins. The coins chase enemies and attach themselves to their bodies, causing them to become increasingly vulnerable to attacks.',
        mechanics: [
          'Unlocks a gleaming gilded chest that expels dozens of homing cursed coins.',
          'Coins stick to enemies, inflicting +60% damage vulnerability.',
          'Slain coin-cursed foes burst into showers of bonus gold coins and soul shards.',
        ],
      },
    },
    [UltimateSkillId.ThousandDaggers]: {
      pathA: {
        id: 'goblin_daggers_path_a',
        characterId: CharacterId.Goblin,
        ultimateId: UltimateSkillId.ThousandDaggers,
        path: 'PATH_A',
        name: 'Blade Cyclone',
        tagline: 'Orbiting Enchanted Razor Hurricane',
        badge: 'Steel Vortex',
        color: '#F97316',
        secondaryColor: '#FB923C',
        description:
          'The Goblin creates a gigantic rotating cyclone of enchanted daggers. The blades continuously orbit the battlefield, cutting enemies caught in their path.',
        mechanics: [
          'Conjures 20 enchanted daggers spinning in concentric orbits around the hero.',
          'Orbits dynamically expand and contract, cutting down any foes entering the radius.',
          'Continuously deflects minor enemy projectiles away from the Goblin.',
        ],
      },
      pathB: {
        id: 'goblin_daggers_path_b',
        characterId: CharacterId.Goblin,
        ultimateId: UltimateSkillId.ThousandDaggers,
        path: 'PATH_B',
        name: 'Dagger Constellation',
        tagline: 'Astral Anchors & Intersecting Starlight Lasers',
        badge: 'Astral Web',
        color: '#FBBF24',
        secondaryColor: '#F43F5E',
        description:
          'The Goblin launches enchanted daggers into the sky, where they form a massive magical constellation. The constellation connects marked enemies with beams of energy, creating a network of deadly intersections.',
        mechanics: [
          'Daggers stick into the celestial ceiling, forming a radiant golden star chart.',
          'Intense laser beams connect between all anchored daggers across the chamber.',
          'Enemies walking through laser tripwires suffer continuous high-frequency slicing damage.',
        ],
      },
    },
  },

  // ==========================================
  // 4. GNOME
  // ==========================================
  [CharacterId.Gnome]: {
    [UltimateSkillId.MountainsHeart]: {
      pathA: {
        id: 'gnome_heart_path_a',
        characterId: CharacterId.Gnome,
        ultimateId: UltimateSkillId.MountainsHeart,
        path: 'PATH_A',
        name: 'Worldbreaker',
        tagline: 'Stone Titan, Seismic Fissures & Erupting Formations',
        badge: 'Tectonic Force',
        color: '#E2E8F0',
        secondaryColor: '#94A3B8',
        description:
          'The Gnome transforms into a gigantic stone titan. Every step creates massive ground fractures, while its fists can summon enormous stone formations that erupt beneath enemies.',
        mechanics: [
          'Hero scale expands to 1.8x with seismic footstep shockwaves staggering foes.',
          'Basic punches summon jagged stone stalagmites bursting up directly under monsters.',
          'Shattering stone formations sends sharp shrapnel flying in all directions.',
        ],
      },
      pathB: {
        id: 'gnome_heart_path_b',
        characterId: CharacterId.Gnome,
        ultimateId: UltimateSkillId.MountainsHeart,
        path: 'PATH_B',
        name: 'Eternal Mountain',
        tagline: 'Living Mountain Fortress & Impenetrable Bastion Dome',
        badge: 'Aegis Bastion',
        color: '#CBD5E1',
        secondaryColor: '#64748B',
        description:
          'The Gnome becomes a living mountain fortress. Its body develops several protective layers of stone, and nearby allies are sheltered within a powerful defensive barrier.',
        mechanics: [
          'Encased in rotating granite slabs providing 80% damage reduction and crowd-control immunity.',
          'Projects a 220px spherical glowing shelter dome over the Gnome and party members.',
          'Enemy projectiles hitting the dome ricochet back toward the attackers.',
        ],
      },
    },
    [UltimateSkillId.TitansRampart]: {
      pathA: {
        id: 'gnome_rampart_path_a',
        characterId: CharacterId.Gnome,
        ultimateId: UltimateSkillId.TitansRampart,
        path: 'PATH_A',
        name: 'The Great Divide',
        tagline: 'Colossal Monolith Wall & Funnel Chokepoints',
        badge: 'Earth Wall',
        color: '#94A3B8',
        secondaryColor: '#475569',
        description:
          'The Gnome summons an enormous stone wall that splits the battlefield into separate sections. Enemies caught between the expanding walls are forced into confined spaces.',
        mechanics: [
          'Erects two gigantic bedrock barriers that bisect the room for 12 seconds.',
          'Enemies caught along the fault line are crushed between expanding rock faces.',
          'Creates narrow choke points where area-of-effect skills deal amplified damage.',
        ],
      },
      pathB: {
        id: 'gnome_rampart_path_b',
        characterId: CharacterId.Gnome,
        ultimateId: UltimateSkillId.TitansRampart,
        path: 'PATH_B',
        name: 'Colossal Guardian',
        tagline: 'Autonomous Stone Golem Sentinel & Interceptor',
        badge: 'Stone Sentinel',
        color: '#CBD5E1',
        secondaryColor: '#38BDF8',
        description:
          "A gigantic stone guardian emerges from the ground and protects the Gnome's position. It independently attacks enemies approaching the area and intercepts attacks directed toward nearby allies.",
        mechanics: [
          'Summons an imposing Stone Guardian Golem with heavy club fists and high health.',
          'Golem taunts hostile enemies, slamming the ground to draw monster attention.',
          'Dashes in front of the Gnome to absorb incoming boss attacks and lethal strikes.',
        ],
      },
    },
    [UltimateSkillId.CataclysmicSlam]: {
      pathA: {
        id: 'gnome_slam_path_a',
        characterId: CharacterId.Gnome,
        ultimateId: UltimateSkillId.CataclysmicSlam,
        path: 'PATH_A',
        name: 'Volcanic Cataclysm',
        tagline: 'Molten Geysers, Magma Pillars & Burning Lava Pools',
        badge: 'Magma Eruption',
        color: '#F97316',
        secondaryColor: '#EF4444',
        description:
          'The Gnome strikes the ground, causing the earth to erupt like a volcano. Molten rock bursts from the ground, creating dangerous pools and pillars of molten stone.',
        mechanics: [
          'Impact ruptures the ground, sending fiery molten volcanic pillars blasting toward the ceiling.',
          'Leaves boiling magma pools on the floor that burn monsters with persistent fire damage.',
          'Enemies standing in magma take increasing heat damage and suffer 40% slow.',
        ],
      },
      pathB: {
        id: 'gnome_slam_path_b',
        characterId: CharacterId.Gnome,
        ultimateId: UltimateSkillId.CataclysmicSlam,
        path: 'PATH_B',
        name: 'Gravity Collapse',
        tagline: 'Singularity Vortex & Violent Outward Explosion',
        badge: 'Black Hole',
        color: '#818CF8',
        secondaryColor: '#6366F1',
        description:
          'The Gnome creates a massive gravitational field centered on the impact point. Enemies and projectiles are pulled toward the center before the field suddenly releases a powerful outward explosion.',
        mechanics: [
          'Forms an intense black-hole gravitational singularity pulling all monsters into the center.',
          'Sucks in and crushes incoming hostile projectiles within the vortex.',
          'After 2.2s, the core destabilizes and detonates with a devastating kinetic blast.',
        ],
      },
    },
  },

  // ==========================================
  // 5. GHOST
  // ==========================================
  [CharacterId.Ghost]: {
    [UltimateSkillId.EternalNightmare]: {
      pathA: {
        id: 'ghost_nightmare_path_a',
        characterId: CharacterId.Ghost,
        ultimateId: UltimateSkillId.EternalNightmare,
        path: 'PATH_A',
        name: 'The Faceless Nightmare',
        tagline: 'Shapeshifting Terror Entity & Fear Influx',
        badge: 'Shifting Horror',
        color: '#C084FC',
        secondaryColor: '#A855F7',
        description:
          'The Ghost creates a terrifying entity that hunts enemies throughout the battlefield. The creature changes its appearance and attack patterns, making it unpredictable and difficult to escape.',
        mechanics: [
          'Summons an enigmatic shadowy Nightmare Beast that morphs between beast, specter, and reaper forms.',
          'Inflicts Terrify upon monsters, causing them to flee uncontrollably.',
          'Attacks with phasing phantom claws that bypass physical armor and shields.',
        ],
      },
      pathB: {
        id: 'ghost_nightmare_path_b',
        characterId: CharacterId.Ghost,
        ultimateId: UltimateSkillId.EternalNightmare,
        path: 'PATH_B',
        name: 'Haunted Dimension',
        tagline: 'Distorted Reality, Grasping Hands & Cursed Relics',
        badge: 'Ghost Realm',
        color: '#E879F9',
        secondaryColor: '#7E22CE',
        description:
          'The battlefield is transformed into a distorted ghost dimension. The environment becomes filled with haunted structures, spectral hands, and cursed objects that independently attack enemies.',
        mechanics: [
          'Dungeon room transforms into an eerie monochrome netherworld realm.',
          'Spectral hands emerge from the walls and floors, clawing and crushing monsters.',
          'Hovering cursed candelabras launch seeking soul flames at approaching targets.',
        ],
      },
    },
    [UltimateSkillId.SpiritLegion]: {
      pathA: {
        id: 'ghost_legion_path_a',
        characterId: CharacterId.Ghost,
        ultimateId: UltimateSkillId.SpiritLegion,
        path: 'PATH_A',
        name: 'The Ancient Monarchs',
        tagline: 'Three Spirit Monarchs & Spectral Beasts',
        badge: 'Monarch Trinity',
        color: '#D8B4FE',
        secondaryColor: '#9333EA',
        description:
          'The Ghost summons three ancient spirit monarchs. Each monarch commands a different supernatural force: spectral beasts, fallen warriors, and wandering souls. They fight independently and unleash powerful combined attacks.',
        mechanics: [
          'Beast Monarch commands phantom wolves that pounce and shred backline archers.',
          'Warlord Monarch cleaves clusters of enemies with an ethereal colossal blade.',
          'Phantom Sovereign channels piercing astral soul bolts from afar.',
        ],
      },
      pathB: {
        id: 'ghost_legion_path_b',
        characterId: CharacterId.Ghost,
        ultimateId: UltimateSkillId.SpiritLegion,
        path: 'PATH_B',
        name: 'Spirit Possession',
        tagline: 'Ectoplasmic Shift & Mass Enemy Puppeteering',
        badge: 'Mind Control',
        color: '#A855F7',
        secondaryColor: '#6B21A8',
        description:
          'The Ghost temporarily abandons its physical form and possesses multiple enemies throughout the battlefield. Possessed enemies become hostile to their former allies and use their own abilities against them.',
        mechanics: [
          'The Ghost enters pure incorporeal form, becoming immune to all attacks for 5s.',
          'Infuses up to 4 enemy monsters with cyan spectral flame, possessing them completely.',
          'Possessed enemies turn and unleash their strongest attacks on other monsters.',
        ],
      },
    },
    [UltimateSkillId.DeathsPassage]: {
      pathA: {
        id: 'ghost_passage_path_a',
        characterId: CharacterId.Ghost,
        ultimateId: UltimateSkillId.DeathsPassage,
        path: 'PATH_A',
        name: 'The Underworld Gate',
        tagline: 'Obsidian Portal, Spectral Chains & Dimensional Abyss',
        badge: 'Stygian Gateway',
        color: '#C084FC',
        secondaryColor: '#4C1D95',
        description:
          'The Ghost opens an enormous gateway to the underworld. Spectral chains emerge from within, binding enemies and dragging them toward the gateway.',
        mechanics: [
          'Unfurls a towering obsidian underworld archway in the center of the chamber.',
          'Heavy ethereal chains lash out, binding all enemies and dragging them into the gate.',
          'Enemies pulled into the gate threshold suffer crushing soul disintegration damage.',
        ],
      },
      pathB: {
        id: 'ghost_passage_path_b',
        characterId: CharacterId.Ghost,
        ultimateId: UltimateSkillId.DeathsPassage,
        path: 'PATH_B',
        name: 'Soul Cataclysm',
        tagline: 'Soul Harvest, Astral Convergence & Cosmic Blast',
        badge: 'Spirit Rain',
        color: '#F472B6',
        secondaryColor: '#DB2777',
        description:
          'The Ghost gathers the spiritual energy of every enemy caught within its ultimate. Their souls appear as glowing spirits above the battlefield before descending together in a massive explosion of spectral energy.',
        mechanics: [
          'Rips glowing spiritual silhouettes out of all enemies on screen.',
          'Harvested souls hover overhead in a grand celestial constellation vortex.',
          'Souls plunge down in a coordinated carpet of radiant spectral meteor strikes.',
        ],
      },
    },
  },

  // ==========================================
  // 6. KOBOLD
  // ==========================================
  [CharacterId.Kobold]: {
    [UltimateSkillId.DragonsBarrage]: {
      pathA: {
        id: 'kobold_barrage_path_a',
        characterId: CharacterId.Kobold,
        ultimateId: UltimateSkillId.DragonsBarrage,
        path: 'PATH_A',
        name: "Dragon's Breath",
        tagline: 'Flying Spectral Dragon & Searing Magical Fire',
        badge: 'Draconic Rocket',
        color: '#F97316',
        secondaryColor: '#FB923C',
        description:
          'The Kobold fires a gigantic enchanted bolt that transforms into a spectral dragon. The dragon flies across the battlefield, breathing magical fire and attacking enemies in its path.',
        mechanics: [
          'Launches an enormous dragon-carved rocket bolt that manifests as a soaring spectral wyrm.',
          'Dragon glides in sweeping figure-eight patterns, strafing the floor with magical breath.',
          'Searing draconic flames ignite the ground, burning enemies with persistent elemental damage.',
        ],
      },
      pathB: {
        id: 'kobold_barrage_path_b',
        characterId: CharacterId.Kobold,
        ultimateId: UltimateSkillId.DragonsBarrage,
        path: 'PATH_B',
        name: 'Skyfall Arsenal',
        tagline: 'Signal Bolt, Mechanical Airship & Carpet Bombardment',
        badge: 'Airship Strike',
        color: '#FB923C',
        secondaryColor: '#EA580C',
        description:
          'The Kobold launches a special signal bolt into the sky. A hidden mechanical airship appears and releases an enormous bombardment of specialized crossbow ammunition across the battlefield.',
        mechanics: [
          'Fires a red signal flare into the ceiling, casting a massive airship shadow over the room.',
          'Mechanical airship unleashes a deafening carpet bombing of cluster munitions.',
          'Shells detonate with concussive shrapnel, creating chain explosions across the entire room.',
        ],
      },
    },
    [UltimateSkillId.MasterArtificer]: {
      pathA: {
        id: 'kobold_artificer_path_a',
        characterId: CharacterId.Kobold,
        ultimateId: UltimateSkillId.MasterArtificer,
        path: 'PATH_A',
        name: 'Mechanical Overlord',
        tagline: 'Walking Battle Mech, Heavy Turrets & Stomp Limbs',
        badge: 'Crossbow Mech',
        color: '#F59E0B',
        secondaryColor: '#D97706',
        description:
          'The Kobold constructs a gigantic walking crossbow machine. The machine moves independently, firing enormous bolts, deploying smaller turrets, and crushing enemies with its mechanical limbs.',
        mechanics: [
          'Assembles a towering steam-powered walking combat mech armed with twin ballistas.',
          'Mech stomps aggressively across the battlefield, crushing small enemies beneath its treads.',
          'Automatically deploys micro-gatling turrets every 3 seconds to lock down zones.',
        ],
      },
      pathB: {
        id: 'kobold_artificer_path_b',
        characterId: CharacterId.Kobold,
        ultimateId: UltimateSkillId.MasterArtificer,
        path: 'PATH_B',
        name: 'Clockwork Dominion',
        tagline: 'Subterranean Network, Tripwire Traps & Turret Pillboxes',
        badge: 'Trap Network',
        color: '#EAB308',
        secondaryColor: '#CA8A04',
        description:
          'The Kobold transforms the battlefield into a mechanical network. Hidden devices emerge from the ground, connecting through mechanical cables and creating an interconnected system of traps and automated crossbows.',
        mechanics: [
          'Deploys an electrified underground wire grid connecting four popup clockwork pillboxes.',
          'Intersecting high-voltage tripwires electrocute and stun enemies attempting to cross.',
          'Pillboxes fire synchronized high-velocity piercing bolts at the nearest monsters.',
        ],
      },
    },
    [UltimateSkillId.KoboldsDeadlyArsenal]: {
      pathA: {
        id: 'kobold_arsenal_path_a',
        characterId: CharacterId.Kobold,
        ultimateId: UltimateSkillId.KoboldsDeadlyArsenal,
        path: 'PATH_A',
        name: 'Forbidden Weaponry',
        tagline: 'Unstable Ammunition, Dimensional Tears & Chain Lightning',
        badge: 'Ancient Tech',
        color: '#F97316',
        secondaryColor: '#C084FC',
        description:
          'The Kobold reveals an ancient experimental crossbow that fires unstable magical ammunition. Every shot produces a different supernatural effect, including dimensional tears, lightning chains, and explosive energy bursts.',
        mechanics: [
          'Replaces weapon with an exotic arcane rail-crossbow with 3x rate of fire.',
          'Shots randomly cycle between mini singularity tears, jumping arc lightning, and sonic blasts.',
          'Overcharged shots pierce through infinite targets, shredding elite armor.',
        ],
      },
      pathB: {
        id: 'kobold_arsenal_path_b',
        characterId: CharacterId.Kobold,
        ultimateId: UltimateSkillId.KoboldsDeadlyArsenal,
        path: 'PATH_B',
        name: 'The Perfect Shot',
        tagline: 'Precision Sniping Stance, Target Locks & Piercing Antimatter',
        badge: 'Deadly Sniper',
        color: '#EF4444',
        secondaryColor: '#DC2626',
        description:
          'The Kobold summons a gigantic precision crossbow and enters a special aiming stance. It marks every enemy in its line of sight before releasing a single extraordinary bolt that travels through the entire battlefield, striking every marked target.',
        mechanics: [
          'Enters an immovable sniper stance with holographic laser targeting lines tracking all foes.',
          'Locks crimson tracking reticles onto all visible enemies in the room over 1.2s.',
          'Releases a single hypersonic bolt that instantly pierces and executes all locked targets simultaneously.',
        ],
      },
    },
  },
};

export function getAwakenedStatus(
  saveData: GuildSaveData,
  charId: CharacterId,
  ultId: UltimateSkillId
): AwakeningStatus {
  const existing = saveData.awakenedUltimates?.[charId]?.[ultId];
  if (existing) {
    return existing;
  }
  return {
    unlockedA: false,
    unlockedB: false,
    activePath: 'NONE',
    pityCount: 0,
  };
}

export function getAwakeningDef(
  charId: CharacterId,
  ultId: UltimateSkillId,
  path: 'PATH_A' | 'PATH_B'
): AwakeningPathDef | null {
  const pair = AWAKENING_PATHS[charId]?.[ultId];
  if (!pair) return null;
  return path === 'PATH_A' ? pair.pathA : pair.pathB;
}

export function getActiveAwakenedDef(
  saveData: GuildSaveData,
  charId: CharacterId,
  ultId: UltimateSkillId
): AwakeningPathDef | null {
  const status = getAwakenedStatus(saveData, charId, ultId);
  if (status.activePath === 'PATH_A') {
    return getAwakeningDef(charId, ultId, 'PATH_A');
  }
  if (status.activePath === 'PATH_B') {
    return getAwakeningDef(charId, ultId, 'PATH_B');
  }
  return null;
}
