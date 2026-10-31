import {
  DifficultyConfig,
  DifficultyLevel,
  DungeonRoom,
  EnemyEntity,
  EnemyKind,
  ProceduralSkeletonTraits,
  RoomKind,
  RoomProp,
} from '../types/game';
import { DIFFICULTY_CONFIGS } from '../data/zombieData';

export interface WalkableZone {
  x: number;
  y: number;
  w: number;
  h: number;
  isCorridor: boolean;
  roomA: number;
  roomB: number;
}

export interface GeneratedWorld {
  isGuild: boolean;
  floorNumber: number;
  floorLabel: string;
  rooms: DungeonRoom[];
  corridors: WalkableZone[];
  props: RoomProp[];
  enemies: EnemyEntity[];
  spawnX: number;
  spawnY: number;
}

let nextEntityId = 1;
export function allocEntityId(): number {
  return nextEntityId++;
}

const HOOD_PALETTE = ['#4C3556', '#2D4A53', '#5C3A3A', '#3B4259', '#4A5240'];
const BONE_TINTS = ['#EAE4D7', '#DFD8C8', '#E5E7EB', '#D9DFD4'];

export function createProceduralSkeleton(
  kind: EnemyKind,
  x: number,
  y: number,
  roomId: number,
  floorScale = 1,
  diffConfig?: DifficultyConfig,
  stage = 1
): EnemyEntity {
  const isNightmare = diffConfig?.id === DifficultyLevel.Nightmare;
  const isTorment = diffConfig?.id === DifficultyLevel.Torment;
  const speedMult = diffConfig?.enemySpeedMult ?? 1.0;
  const cdMult = diffConfig?.enemyAttackCooldownMult ?? 1.0;

  const traits: ProceduralSkeletonTraits = {
    skullVariant: (Math.floor(Math.random() * 3) as 0 | 1 | 2),
    hoodColor: isNightmare
      ? '#7F1D1D'
      : isTorment
      ? '#581C87'
      : HOOD_PALETTE[Math.floor(Math.random() * HOOD_PALETTE.length)],
    boneTint: isNightmare
      ? '#FECDD3'
      : isTorment
      ? '#E9D5FF'
      : BONE_TINTS[Math.floor(Math.random() * BONE_TINTS.length)],
    weaponVariant: Math.random() < 0.5 ? 0 : 1,
    hasBuckler: Math.random() < 0.65,
    scale: (0.94 + Math.random() * 0.14) * (stage > 2 ? 1.06 : 1.0),
  };

  if (kind === EnemyKind.TrainingDummy) {
    return {
      id: allocEntityId(),
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 20,
      hp: 500,
      maxHp: 500,
      speed: 0,
      facing: Math.PI,
      facingX: -1,
      walkPhase: 0,
      hitFlashTimer: 0,
      squashX: 1,
      squashY: 1,
      slowTimer: 0,
      slowFactor: 1,
      stunTimer: 0,
      rootTimer: 0,
      fearTimer: 0,
      possessedTimer: 0,
      infectionStacks: 0,
      infectionTimer: 0,
      plagueTimer: 0,
      aiState: 'IDLE',
      stateTimer: 0,
      attackCooldown: 99,
      telegraphAngle: 0,
      telegraphType: 'NONE',
      bossPhase: 1,
      bossPatternIndex: 0,
      roomId,
      traits,
    };
  }

  if (kind === EnemyKind.SkeletonBoss) {
    const baseBossHp = 920 + (stage - 1) * 440;
    const bossHp = Math.round(baseBossHp * floorScale);
    return {
      id: allocEntityId(),
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 34 + (stage > 2 ? 3 : 0),
      hp: bossHp,
      maxHp: bossHp,
      speed: Math.round((98 + (stage - 1) * 8) * speedMult),
      facing: Math.PI / 2,
      facingX: -1,
      walkPhase: 0,
      hitFlashTimer: 0,
      squashX: 1,
      squashY: 1,
      slowTimer: 0,
      slowFactor: 1,
      stunTimer: 0,
      rootTimer: 0,
      fearTimer: 0,
      possessedTimer: 0,
      infectionStacks: 0,
      infectionTimer: 0,
      plagueTimer: 0,
      aiState: 'IDLE',
      stateTimer: 1.0,
      attackCooldown: 1.4 * cdMult,
      telegraphAngle: 0,
      telegraphType: 'NONE',
      bossPhase: 1,
      bossPatternIndex: 0,
      roomId,
      traits: {
        skullVariant: (stage % 3) as 0 | 1 | 2,
        hoodColor: isNightmare
          ? '#991B1B'
          : stage === 4
          ? '#4C0519'
          : stage === 3
          ? '#3B0764'
          : stage === 2
          ? '#1E3A8A'
          : '#6B2D5C',
        boneTint: isNightmare ? '#FFE4E6' : '#F2ECE1',
        weaponVariant: 1,
        hasBuckler: false,
        scale: 1.35 + (stage - 1) * 0.08,
      },
    };
  }

  const isArcher = kind === EnemyKind.SkeletonArcher;
  const baseHp = isArcher ? 56 : 82;
  const scaledHp = Math.round(baseHp * floorScale * traits.scale);

  return {
    id: allocEntityId(),
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: isArcher ? 16 : 18,
    hp: scaledHp,
    maxHp: scaledHp,
    speed: Math.round((isArcher ? 102 : 118) * speedMult),
    facing: Math.random() * Math.PI * 2,
    facingX: Math.random() < 0.5 ? -1 : 1,
    walkPhase: Math.random() * 6,
    hitFlashTimer: 0,
    squashX: 1,
    squashY: 1,
    slowTimer: 0,
    slowFactor: 1,
    stunTimer: 0,
    rootTimer: 0,
    fearTimer: 0,
    possessedTimer: 0,
    infectionStacks: 0,
    infectionTimer: 0,
    plagueTimer: 0,
    aiState: 'CHASE',
    stateTimer: 0.3 + Math.random() * 0.4,
    attackCooldown: (0.8 + Math.random() * 0.7) * cdMult,
    telegraphAngle: 0,
    telegraphType: 'NONE',
    bossPhase: 1,
    bossPatternIndex: 0,
    roomId,
    traits,
  };
}

export function buildGuildWorld(): GeneratedWorld {
  const roomW = 920;
  const roomH = 600;
  const guildRoom: DungeonRoom = {
    id: 0,
    gridX: 0,
    gridY: 0,
    x: -roomW / 2,
    y: -280,
    w: roomW,
    h: roomH,
    kind: RoomKind.Start,
    discovered: true,
    cleared: true,
    locked: false,
    wavesRemaining: 0,
    connections: [{ dir: 'N', targetRoomId: 0 }],
  };

  // Walkable outdoor moonlit porch beyond the North Guild Door
  const outdoorThreshold: WalkableZone = {
    x: -72,
    y: -395,
    w: 144,
    h: 135,
    isCorridor: true,
    roomA: 0,
    roomB: 0,
  };

  const props: RoomProp[] = [
    // Cozy fireplace hearth on left wall
    {
      id: allocEntityId(),
      kind: 'HEARTH_FIRE',
      x: -365,
      y: -70,
      w: 84,
      h: 96,
      solid: true,
      destructible: false,
      hp: 999,
    },
    // Cozy bench/couch by the hearth rug where Zombie rests
    {
      id: allocEntityId(),
      kind: 'GUILD_COUCH',
      x: -210,
      y: -115,
      w: 112,
      h: 48,
      solid: true,
      destructible: false,
      hp: 999,
    },
    // Bookshelves along upper-left & upper-right North wall
    {
      id: allocEntityId(),
      kind: 'GUILD_BOOKSHELF',
      x: -265,
      y: -252,
      w: 110,
      h: 46,
      solid: true,
      destructible: false,
      hp: 999,
    },
    {
      id: allocEntityId(),
      kind: 'GUILD_BOOKSHELF',
      x: 265,
      y: -252,
      w: 110,
      h: 46,
      solid: true,
      destructible: false,
      hp: 999,
    },
    // Alchemy & Soul Shard Progression Cauldron on right
    {
      id: allocEntityId(),
      kind: 'GUILD_CAULDRON',
      x: 285,
      y: -85,
      w: 64,
      h: 64,
      solid: true,
      destructible: false,
      hp: 999,
    },
    // Heavy Oak Guild Double-Doorway leading outside to the Whispering Graveyard
    {
      id: allocEntityId(),
      kind: 'GUILD_DOOR',
      x: 0,
      y: -280,
      w: 148,
      h: 64,
      solid: false,
      destructible: false,
      hp: 999,
    },
    // Warm Guild Lantern posts flanking the North Doorway
    {
      id: allocEntityId(),
      kind: 'LANTERN_POST',
      x: -102,
      y: -236,
      w: 26,
      h: 26,
      solid: true,
      destructible: false,
      hp: 999,
    },
    {
      id: allocEntityId(),
      kind: 'LANTERN_POST',
      x: 102,
      y: -236,
      w: 26,
      h: 26,
      solid: true,
      destructible: false,
      hp: 999,
    },
    // Cozy wooden crates near bottom-left
    {
      id: allocEntityId(),
      kind: 'WOOD_CRATE',
      x: -365,
      y: 205,
      w: 44,
      h: 44,
      solid: true,
      destructible: false,
      hp: 999,
    },
    {
      id: allocEntityId(),
      kind: 'WOOD_CRATE',
      x: -312,
      y: 225,
      w: 40,
      h: 40,
      solid: true,
      destructible: false,
      hp: 999,
    },
  ];

  // Training Dummy in the bottom-right sparring mat
  const dummy = createProceduralSkeleton(EnemyKind.TrainingDummy, 250, 145, 0, 1);

  return {
    isGuild: true,
    floorNumber: 0,
    floorLabel: 'Sanctuary · Cozy Guild Hall',
    rooms: [guildRoom],
    corridors: [outdoorThreshold],
    props,
    enemies: [dummy],
    spawnX: -210,
    spawnY: -35,
  };
}

export function getStageAndFloor(floorIndex: number): {
  stage: number;
  stageFloor: number;
  isStageBoss: boolean;
} {
  const safeFloor = Math.max(1, Math.floor(floorIndex));
  const stage = Math.floor((safeFloor - 1) / 3) + 1;
  const stageFloor = ((safeFloor - 1) % 3) + 1;
  return { stage, stageFloor, isStageBoss: stageFloor === 3 };
}

export const STAGE_THEMES: Record<
  number,
  {
    name: string;
    floors: [string, string, string];
    bossName: string;
    bossTitle: string;
  }
> = {
  1: {
    name: 'Whispering Graveyard',
    floors: ['Moonlit Graveyard', 'Weeping Mausoleum', 'Ossuary Throne'],
    bossName: 'Lord Marrow',
    bossTitle: 'The Bone Tyrant · Gatekeeper',
  },
  2: {
    name: 'Sunken Catacombs',
    floors: ['Sunken Catacombs', 'Crypt of the Forgotten', "Sovereign's Sanctum"],
    bossName: 'Dread Monarch Marrow',
    bossTitle: 'Ascended Sovereign of the Deep',
  },
  3: {
    name: 'Abyssal Sepulcher',
    floors: ['Abyssal Sepulcher', 'Hall of Black Flames', "Lich's Dominion"],
    bossName: 'Arch-Lich Malakar',
    bossTitle: 'Master of the Black Flame',
  },
  4: {
    name: 'Void Ossuary',
    floors: ['Void Ossuary', 'River of Styx Gateway', 'Throne of Eternal Doom'],
    bossName: 'Supreme Sovereign of Doom',
    bossTitle: 'Death Incarnate · God of the Netherworld',
  },
};

export function getFloorLabel(floorIndex: number): string {
  const { stage, stageFloor } = getStageAndFloor(floorIndex);
  const theme = STAGE_THEMES[stage] ?? STAGE_THEMES[4];
  const floorSubName = theme.floors[stageFloor - 1] ?? `Chamber ${stageFloor}`;
  return `${stage}-${stageFloor} · ${floorSubName}`;
}

export function getBossInfoForFloor(floorIndex: number) {
  const { stage } = getStageAndFloor(floorIndex);
  const theme = STAGE_THEMES[stage] ?? STAGE_THEMES[4];
  return {
    name: theme.bossName,
    subtitle: theme.bossTitle,
  };
}

function createSeededRandom(seed: number) {
  let s = (seed ^ 0xdeadbeef) | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildGraveyardFloor(
  floorIndex: number,
  diffConfig?: DifficultyConfig,
  seed?: number
): GeneratedWorld {
  const ROOM_W = 820;
  const ROOM_H = 640;
  const STEP_X = 1100;
  const STEP_Y = 920;
  const CORRIDOR_WIDTH = 144;

  const rng = seed !== undefined ? createSeededRandom(seed + floorIndex * 9973) : Math.random;

  const { stage, stageFloor, isStageBoss } = getStageAndFloor(floorIndex);
  const cfg = diffConfig ?? DIFFICULTY_CONFIGS[DifficultyLevel.Easy];

  // Procedurally walk a connected room graph
  const targetRoomCount = isStageBoss ? 5 : 5 + (stageFloor === 2 ? 1 : 0) + (stage > 1 ? 1 : 0);
  interface GridCell {
    id: number;
    gx: number;
    gy: number;
    dist: number;
  }

  const cells: GridCell[] = [{ id: 0, gx: 0, gy: 0, dist: 0 }];
  const occupied = new Map<string, number>();
  occupied.set('0,0', 0);
  const edges: [number, number, 'N' | 'S' | 'E' | 'W'][] = [];

  const dirs: { dx: number; dy: number; dir: 'N' | 'S' | 'E' | 'W'; opp: 'N' | 'S' | 'E' | 'W' }[] = [
    { dx: 0, dy: -1, dir: 'N', opp: 'S' },
    { dx: 1, dy: 0, dir: 'E', opp: 'W' },
    { dx: -1, dy: 0, dir: 'W', opp: 'E' },
    { dx: 0, dy: 1, dir: 'S', opp: 'N' },
  ];

  let safety = 0;
  while (cells.length < targetRoomCount && safety < 100) {
    safety++;
    // Prefer growing outward from newer rooms for good dungeon progression
    const pickIdx =
      rng() < 0.7 ? cells.length - 1 : Math.floor(rng() * cells.length);
    const base = cells[pickIdx];
    const shuffled = [...dirs].sort(() => rng() - 0.5);

    for (const d of shuffled) {
      const ngx = base.gx + d.dx;
      const ngy = base.gy + d.dy;
      const key = `${ngx},${ngy}`;
      if (!occupied.has(key)) {
        const newId = cells.length;
        cells.push({ id: newId, gx: ngx, gy: ngy, dist: base.dist + 1 });
        occupied.set(key, newId);
        edges.push([base.id, newId, d.dir]);
        break;
      }
    }
  }

  // Sort to assign special rooms: furthest = Boss/Portal room, one mid branch = Shrine
  let maxDistRoom = cells[cells.length - 1];
  for (const c of cells) {
    if (c.dist > maxDistRoom.dist) maxDistRoom = c;
  }

  let shrineCandidate = cells.find((c) => c.id !== 0 && c.id !== maxDistRoom.id);
  for (const c of cells) {
    if (c.id !== 0 && c.id !== maxDistRoom.id) {
      shrineCandidate = c;
      break;
    }
  }

  const rooms: DungeonRoom[] = cells.map((cell) => {
    let kind = RoomKind.Combat;
    let roomW = ROOM_W;
    let roomH = ROOM_H;

    if (cell.id === 0) {
      kind = RoomKind.Start;
    } else if (cell.id === maxDistRoom.id) {
      kind = RoomKind.Boss;
      if (isStageBoss) {
        roomW = 960;
        roomH = 760;
      }
    } else if (shrineCandidate && cell.id === shrineCandidate.id) {
      kind = RoomKind.Shrine;
    }

    const cx = cell.gx * STEP_X;
    const cy = cell.gy * STEP_Y;

    return {
      id: cell.id,
      gridX: cell.gx,
      gridY: cell.gy,
      x: cx - roomW / 2,
      y: cy - roomH / 2,
      w: roomW,
      h: roomH,
      kind,
      discovered: cell.id === 0,
      cleared: cell.id === 0 || kind === RoomKind.Shrine,
      locked: false,
      wavesRemaining:
        kind === RoomKind.Combat
          ? cfg.wavesPerCombatRoom
          : kind === RoomKind.Boss
          ? 1
          : 0,
      connections: [],
    };
  });

  const oppMap: Record<'N' | 'S' | 'E' | 'W', 'N' | 'S' | 'E' | 'W'> = {
    N: 'S',
    S: 'N',
    E: 'W',
    W: 'E',
  };

  const corridors: WalkableZone[] = [];

  for (const [idA, idB, dir] of edges) {
    const rA = rooms[idA];
    const rB = rooms[idB];
    rA.connections.push({ dir, targetRoomId: idB });
    rB.connections.push({ dir: oppMap[dir], targetRoomId: idA });

    const cxA = rA.x + rA.w / 2;
    const cyA = rA.y + rA.h / 2;
    const cxB = rB.x + rB.w / 2;
    const cyB = rB.y + rB.h / 2;

    if (dir === 'E' || dir === 'W') {
      const leftRoom = cxA < cxB ? rA : rB;
      const rightRoom = cxA < cxB ? rB : rA;
      const startX = leftRoom.x + leftRoom.w - 64;
      const endX = rightRoom.x + 64;
      corridors.push({
        x: startX,
        y: cyA - CORRIDOR_WIDTH / 2,
        w: endX - startX,
        h: CORRIDOR_WIDTH,
        isCorridor: true,
        roomA: idA,
        roomB: idB,
      });
    } else {
      const topRoom = cyA < cyB ? rA : rB;
      const bottomRoom = cyA < cyB ? rB : rA;
      const startY = topRoom.y + topRoom.h - 64;
      const endY = bottomRoom.y + 64;
      corridors.push({
        x: cxA - CORRIDOR_WIDTH / 2,
        y: startY,
        w: CORRIDOR_WIDTH,
        h: endY - startY,
        isCorridor: true,
        roomA: idA,
        roomB: idB,
      });
    }
  }

  // Populate graveyard props in each room
  const props: RoomProp[] = [];

  for (const room of rooms) {
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;

    // Corner cemetery lanterns for warm cozy visibility
    const lanternOffsets = [
      [-room.w / 2 + 78, -room.h / 2 + 78],
      [room.w / 2 - 78, -room.h / 2 + 78],
      [-room.w / 2 + 78, room.h / 2 - 78],
      [room.w / 2 - 78, room.h / 2 - 78],
    ];
    for (const [ox, oy] of lanternOffsets) {
      props.push({
        id: allocEntityId(),
        kind: 'LANTERN_POST',
        x: cx + ox,
        y: cy + oy,
        w: 24,
        h: 24,
        solid: true,
        destructible: false,
        hp: 999,
      });
    }

    if (room.kind === RoomKind.Shrine) {
      props.push({
        id: allocEntityId(),
        kind: 'SHRINE_ALTAR',
        x: cx,
        y: cy,
        w: 60,
        h: 60,
        solid: true,
        destructible: false,
        hp: 999,
        opened: false,
      });
    }

    if (room.kind === RoomKind.Combat) {
      // Procedural tombstone clusters & destructible bone urns (leaving center & doorways clear)
      const patterns = [
        [
          [-180, -120],
          [180, -120],
          [-180, 120],
          [180, 120],
        ],
        [
          [-150, 0],
          [150, 0],
          [0, -135],
          [0, 135],
        ],
        [
          [-210, -95],
          [210, 95],
          [-110, 115],
          [110, -115],
        ],
      ];
      const chosen = patterns[Math.floor(rng() * patterns.length)];
      for (const [ox, oy] of chosen) {
        const isCross = rng() < 0.45;
        props.push({
          id: allocEntityId(),
          kind: isCross ? 'TOMBSTONE_CROSS' : 'TOMBSTONE_ROUND',
          x: cx + ox + (rng() - 0.5) * 28,
          y: cy + oy + (rng() - 0.5) * 24,
          w: 38,
          h: 44,
          solid: true,
          destructible: false,
          hp: 999,
        });
      }

      // 3-4 Destructible Bone Urns / Crates
      const urnCount = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < urnCount; i++) {
        const angle = (i / urnCount) * Math.PI * 2 + rng() * 0.8;
        const dist = 190 + rng() * 75;
        const ux = cx + Math.cos(angle) * dist;
        const uy = cy + Math.sin(angle) * (dist * 0.72);
        props.push({
          id: allocEntityId(),
          kind: rng() < 0.65 ? 'BONE_URN' : 'WOOD_CRATE',
          x: ux,
          y: uy,
          w: 32,
          h: 32,
          solid: true,
          destructible: true,
          hp: 25,
        });
      }
    }

    if (room.kind === RoomKind.Boss && isStageBoss) {
      // Four grand crypt pillars in the Boss arena
      const pillarOffsets = [
        [-235, -165],
        [235, -165],
        [-235, 165],
        [235, 165],
      ];
      for (const [ox, oy] of pillarOffsets) {
        props.push({
          id: allocEntityId(),
          kind: 'CRYPT_PILLAR',
          x: cx + ox,
          y: cy + oy,
          w: 48,
          h: 48,
          solid: true,
          destructible: false,
          hp: 999,
        });
      }
    }
  }

  return {
    isGuild: false,
    floorNumber: floorIndex,
    floorLabel: getFloorLabel(floorIndex),
    rooms,
    corridors,
    props,
    enemies: [],
    spawnX: 0,
    spawnY: 0,
  };
}

export function spawnRoomWave(
  room: DungeonRoom,
  floorIndex: number,
  isStageBossFloor: boolean,
  diffConfig?: DifficultyConfig
): EnemyEntity[] {
  const spawned: EnemyEntity[] = [];
  const { stage, stageFloor } = getStageAndFloor(floorIndex);
  const cfg = diffConfig ?? DIFFICULTY_CONFIGS[DifficultyLevel.Easy];
  const floorScale = (1 + (floorIndex - 1) * 0.22) * cfg.enemyHpMult;
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;

  if (room.kind === RoomKind.Boss) {
    if (isStageBossFloor) {
      // Spawn Stage Boss (Lord Marrow, Dread Monarch, Arch-Lich, or Supreme Sovereign)
      spawned.push(createProceduralSkeleton(EnemyKind.SkeletonBoss, cx, cy - 80, room.id, floorScale, cfg, stage));
      // Guard count scales by stage and difficulty
      const guardCount = Math.min(6, 2 + (stage - 1) + Math.floor(cfg.extraEnemiesPerWave * 0.6));
      for (let g = 0; g < guardCount; g++) {
        const ga = (g / guardCount) * Math.PI * 2;
        const gx = cx + Math.cos(ga) * (180 + (g % 2) * 40);
        const gy = cy + Math.sin(ga) * (120 + (g % 2) * 30);
        const kind = g % 2 === 0 ? EnemyKind.SkeletonWarrior : EnemyKind.SkeletonArcher;
        spawned.push(createProceduralSkeleton(kind, gx, gy, room.id, floorScale * 1.05, cfg, stage));
      }
      return spawned;
    } else {
      // Non-boss floors (e.g. 1-1, 1-2, 2-1 Gatekeepers guarding the descent portal)
      const count = 4 + stageFloor + (stage - 1) + cfg.extraEnemiesPerWave;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        const ex = cx + Math.cos(ang) * 210;
        const ey = cy + Math.sin(ang) * 145;
        const kind = i % 2 === 0 ? EnemyKind.SkeletonWarrior : EnemyKind.SkeletonArcher;
        spawned.push(createProceduralSkeleton(kind, ex, ey, room.id, floorScale * 1.12, cfg, stage));
      }
      return spawned;
    }
  }

  // Standard Graveyard Combat Room wave
  const totalCount = 3 + stageFloor + (stage - 1) * 2 + cfg.extraEnemiesPerWave + (Math.random() < 0.45 ? 1 : 0);
  for (let i = 0; i < totalCount; i++) {
    const ang = (i / totalCount) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 165 + Math.random() * 95;
    const ex = Math.max(room.x + 85, Math.min(room.x + room.w - 85, cx + Math.cos(ang) * dist));
    const ey = Math.max(room.y + 85, Math.min(room.y + room.h - 85, cy + Math.sin(ang) * (dist * 0.75)));
    const archerBias = cfg.id === DifficultyLevel.Nightmare || cfg.id === DifficultyLevel.Torment ? 0.48 : 0.42;
    const kind = Math.random() < archerBias ? EnemyKind.SkeletonArcher : EnemyKind.SkeletonWarrior;
    spawned.push(createProceduralSkeleton(kind, ex, ey, room.id, floorScale, cfg, stage));
  }

  return spawned;
}
