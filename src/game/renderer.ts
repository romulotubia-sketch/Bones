import {
  AfterimageEntity,
  CharacterId,
  DaggerRainZone,
  DungeonRoom,
  EarthenGraspZone,
  EnemyEntity,
  EnemyKind,
  ExplosiveTrapEntity,
  FloatingPopup,
  GamePhase,
  GuildCompanionRenderState,
  MinionEntity,
  Particle,
  PickupOrb,
  PoisonCloudEntity,
  ProjectileEntity,
  RoomKind,
  RoomProp,
  ShockwaveRing,
  SlashEffect,
  SoulTether,
  StoneRampartEntity,
} from '../types/game';
import { WalkableZone } from './dungeonGenerator';

export interface RenderPlayerState {
  characterId: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  aimAngle: number;
  facingX: number;
  walkPhase: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  undyingTimer: number;
  abominationTimer: number;
  ribcageTimer: number;
  ribcageCharges: number;
  boneStormTimer: number;
  colossusTimer: number;
  unyieldingStacks: number;
  windrunnerTimer: number;
  poisonBladesTimer: number;
  stolenMightTimer: number;
  fortressTimer: number;
  magneticTimer: number;
  mountainHeartTimer: number;
  leapAirProgress: number;
  resolveRatio: number;
  dashTimer: number;
  hoveredInGuild: boolean;
}

export interface WorldRenderInput {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  worldZoom: number;
  time: number;
  phase: GamePhase;
  isGuild: boolean;
  cameraX: number;
  cameraY: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  rooms: DungeonRoom[];
  corridors: WalkableZone[];
  props: RoomProp[];
  poisonClouds: PoisonCloudEntity[];
  traps: ExplosiveTrapEntity[];
  afterimages: AfterimageEntity[];
  daggerRains: DaggerRainZone[];
  earthenGrasps: EarthenGraspZone[];
  stoneRamparts: StoneRampartEntity[];
  pickups: PickupOrb[];
  minions: MinionEntity[];
  enemies: EnemyEntity[];
  player: RenderPlayerState;
  guildCompanions: GuildCompanionRenderState[];
  projectiles: ProjectileEntity[];
  slashes: SlashEffect[];
  shockwaves: ShockwaveRing[];
  tethers: SoulTether[];
  particles: Particle[];
  popups: FloatingPopup[];
  panJoystick?: {
    startX: number;
    startY: number;
    knobX: number;
    knobY: number;
  } | null;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function renderGameWorld(input: WorldRenderInput): void {
  const {
    ctx,
    width,
    height,
    worldZoom,
    time,
    phase,
    isGuild,
    cameraX,
    cameraY,
    shakeOffsetX,
    shakeOffsetY,
    rooms,
    corridors,
    props,
    poisonClouds,
    traps,
    afterimages,
    daggerRains,
    earthenGrasps,
    stoneRamparts,
    pickups,
    minions,
    enemies,
    player,
    guildCompanions,
    projectiles,
    slashes,
    shockwaves,
    tethers,
    particles,
    popups,
    panJoystick,
  } = input;

  // 1. Deep void backdrop
  ctx.fillStyle = isGuild ? '#130F16' : '#0E1117';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(worldZoom, worldZoom);
  ctx.translate(-cameraX + shakeOffsetX, -cameraY + shakeOffsetY);

  // 2. Corridors / Guild Outdoor Porch (behind rooms)
  for (const cor of corridors) {
    if (isGuild) {
      drawGuildOutdoorExit(ctx, cor, time);
    } else {
      drawCorridor(ctx, cor);
    }
  }

  // 3. Rooms (floors, rugs/paths, stone borders, locked iron gates)
  for (const room of rooms) {
    if (isGuild) {
      drawGuildFloor(ctx, room, time);
    } else {
      drawGraveyardRoom(ctx, room, time);
    }
  }

  // 4. Ground-layer effects (Poison clouds, dagger rain circles, earthen grasps, traps, shockwave rings, enemy telegraphs)
  for (const cloud of poisonClouds) {
    drawPoisonCloud(ctx, cloud, time);
  }

  for (const zone of daggerRains) {
    drawDaggerRainGroundZone(ctx, zone, time);
  }

  for (const grasp of earthenGrasps) {
    drawEarthenGraspGround(ctx, grasp, time);
  }

  for (const trap of traps) {
    drawExplosiveTrap(ctx, trap, time);
  }

  for (const ring of shockwaves) {
    const progress = 1 - ring.life / ring.maxLife;
    const currentR = Math.max(4, ring.maxRadius * progress);
    ctx.save();
    ctx.globalAlpha = Math.max(0, ring.life / ring.maxLife);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 6 * (1 - progress * 0.6);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, currentR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const enemy of enemies) {
    drawEnemyTelegraph(ctx, enemy, time);
  }

  // 5. Pickups on ground
  for (const orb of pickups) {
    drawPickup(ctx, orb, time);
  }

  // 6. Depth-sorted entities (Props, Stone Ramparts, Afterimages, Minions, Enemies, Guild Companions, Active Player)
  interface SortableDraw {
    sortY: number;
    draw: () => void;
  }
  const drawList: SortableDraw[] = [];

  for (const prop of props) {
    drawList.push({
      sortY: prop.y + prop.h * 0.35,
      draw: () => drawProp(ctx, prop, time, isGuild, player.characterId),
    });
  }

  for (const wall of stoneRamparts) {
    drawList.push({
      sortY: wall.y + 8,
      draw: () => drawStoneRampart(ctx, wall, time),
    });
  }

  for (const ghost of afterimages) {
    drawList.push({
      sortY: ghost.y - 2,
      draw: () => drawGoblinAfterimage(ctx, ghost),
    });
  }

  for (const minion of minions) {
    drawList.push({
      sortY: minion.y,
      draw: () => drawMinion(ctx, minion, time),
    });
  }

  for (const enemy of enemies) {
    drawList.push({
      sortY: enemy.y,
      draw: () => drawEnemy(ctx, enemy, time),
    });
  }

  if (isGuild) {
    for (let idx = 0; idx < guildCompanions.length; idx++) {
      const comp = guildCompanions[idx];
      const compState: RenderPlayerState = {
        characterId: comp.characterId,
        x: comp.x,
        y: comp.y,
        vx: 0,
        vy: 0,
        radius: 17,
        aimAngle: comp.facingX >= 0 ? 0 : Math.PI,
        facingX: comp.facingX,
        walkPhase: 0,
        hitFlashTimer: 0,
        squashX: 1,
        squashY: 1,
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
        leapAirProgress: 0,
        resolveRatio: 0,
        dashTimer: 0,
        hoveredInGuild: phase === GamePhase.GuildPicking,
      };
      drawList.push({
        sortY: comp.y,
        draw: () => drawHeroCharacter(ctx, compState, phase, time + 0.9 * (idx + 1), false),
      });
    }
  }

  drawList.push({
    sortY: player.y,
    draw: () => drawHeroCharacter(ctx, player, phase, time, true),
  });

  drawList.sort((a, b) => a.sortY - b.sortY);
  for (const item of drawList) {
    item.draw();
  }

  // 7. Life-drain tethers (Death's Embrace)
  for (const tether of tethers) {
    const alpha = Math.max(0, tether.life / tether.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -time * 40;
    ctx.beginPath();
    ctx.moveTo(tether.fromX, tether.fromY);
    ctx.quadraticCurveTo(
      (tether.fromX + player.x) / 2,
      Math.min(tether.fromY, player.y) - 36,
      player.x,
      player.y - 10
    );
    ctx.stroke();
    ctx.restore();
  }

  // 8. Slash arcs & Projectiles
  for (const slash of slashes) {
    drawSlashArc(ctx, slash);
  }

  for (const proj of projectiles) {
    drawProjectile(ctx, proj, time);
  }

  // 8b. Sky-falling Thousand Daggers streaks
  for (const zone of daggerRains) {
    drawDaggerRainSkyStreaks(ctx, zone, time);
  }

  // 9. Particles
  for (const pt of particles) {
    const alpha = pt.fade ? Math.max(0, pt.life / pt.maxLife) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 10. Cozy warm lighting pools (additive/soft screen glow over lanterns, hearth, portal)
  drawWarmLightPools(ctx, props, player, isGuild, time);

  // 11. Floating damage / heal numbers
  for (const pop of popups) {
    const alpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `600 ${Math.round(14 * pop.scale)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#120F17';
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }

  // 12. Guild Character Picking / Switching prompts above all 3 Guild Heroes
  if (isGuild && phase === GamePhase.GuildPicking) {
    const pMeta = getCharacterPromptMeta(player.characterId);
    drawCharacterPromptBubble(ctx, player.x, player.y - 54, pMeta.pick, pMeta.color, time, 1);

    for (let idx = 0; idx < guildCompanions.length; idx++) {
      const comp = guildCompanions[idx];
      const cMeta = getCharacterPromptMeta(comp.characterId);
      drawCharacterPromptBubble(
        ctx,
        comp.x,
        comp.y - 54,
        cMeta.pick,
        cMeta.color,
        time + 1.2 * (idx + 1),
        0.95
      );
    }
  } else if (isGuild && phase === GamePhase.GuildRoam) {
    for (let idx = 0; idx < guildCompanions.length; idx++) {
      const comp = guildCompanions[idx];
      const cMeta = getCharacterPromptMeta(comp.characterId);
      drawCharacterPromptBubble(
        ctx,
        comp.x,
        comp.y - 50,
        cMeta.roam,
        cMeta.color,
        time + 0.9 * (idx + 1),
        0.78
      );
    }
  }

  ctx.restore();

  // Subtle cozy edge vignette
  const vig = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.36,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, isGuild ? 'rgba(12,9,16,0.46)' : 'rgba(8,10,16,0.58)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // Screen-space Map-Drag Joystick feedback when dragging across the screen
  if (panJoystick) {
    ctx.save();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.42)';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(panJoystick.startX, panJoystick.startY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(panJoystick.startX, panJoystick.startY);
    ctx.lineTo(panJoystick.knobX, panJoystick.knobY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.78)';
    ctx.strokeStyle = 'rgba(240, 249, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(panJoystick.knobX, panJoystick.knobY, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function getCharacterPromptMeta(charId: CharacterId): {
  pick: string;
  roam: string;
  color: string;
} {
  if (charId === CharacterId.Skeleton) {
    return { pick: 'Tap Skeleton · Skills', roam: 'Tap Skeleton', color: '#38BDF8' };
  }
  if (charId === CharacterId.Goblin) {
    return { pick: 'Tap Goblin · Skills', roam: 'Tap Goblin', color: '#F59E0B' };
  }
  if (charId === CharacterId.Gnome) {
    return { pick: 'Tap Gnome · Skills', roam: 'Tap Gnome', color: '#FB923C' };
  }
  return { pick: 'Tap Zombie · Skills', roam: 'Tap Zombie', color: '#4ADE80' };
}

function drawCharacterPromptBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  text: string,
  accentColor: string,
  time: number,
  alpha: number
): void {
  const bob = Math.sin(time * 3.8) * 3.5;
  const labelY = baseY + bob;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  const textW = ctx.measureText(text).width;
  const boxW = textW + 20;
  const boxH = 25;
  ctx.fillStyle = '#191622';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x - boxW / 2, labelY - boxH / 2, boxW, boxH, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(x - 4.5, labelY + boxH / 2);
  ctx.lineTo(x + 4.5, labelY + boxH / 2);
  ctx.lineTo(x, labelY + boxH / 2 + 5.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F3EFE6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, labelY + 0.5);
  ctx.restore();
}

function drawGuildFloor(ctx: CanvasRenderingContext2D, room: DungeonRoom, time: number): void {
  // Stone outer wall frame
  ctx.fillStyle = '#2B2433';
  drawRoundedRect(ctx, room.x - 22, room.y - 22, room.w + 44, room.h + 44, 14);
  ctx.fill();

  // Warm timber wood planks interior
  ctx.fillStyle = '#33251E';
  ctx.fillRect(room.x, room.y, room.w, room.h);

  // Subtle wood plank seams
  ctx.strokeStyle = 'rgba(20, 13, 10, 0.38)';
  ctx.lineWidth = 2;
  const plankH = 40;
  for (let py = room.y + plankH; py < room.y + room.h; py += plankH) {
    ctx.beginPath();
    ctx.moveTo(room.x, py);
    ctx.lineTo(room.x + room.w, py);
    ctx.stroke();
  }

  // Cozy crimson & gold hearth rug under the Zombie lounge
  ctx.save();
  ctx.fillStyle = '#5B2532';
  ctx.strokeStyle = '#C99342';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, -320, -105, 225, 148, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(243, 239, 230, 0.16)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, -308, -93, 201, 124, 4);
  ctx.stroke();
  ctx.restore();

  // Cozy forged-copper & slate mason mat where the Gnome defender rests
  ctx.save();
  ctx.fillStyle = '#2C1F1A';
  ctx.strokeStyle = '#FB923C';
  ctx.lineWidth = 2.6;
  drawRoundedRect(ctx, -295, 56, 154, 88, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(253, 186, 116, 0.18)';
  ctx.lineWidth = 1.4;
  drawRoundedRect(ctx, -283, 68, 130, 64, 4);
  ctx.stroke();
  ctx.restore();

  // Cozy royal-indigo & silver duelist rug where the Skeleton rests
  ctx.save();
  ctx.fillStyle = '#242947';
  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 2.8;
  drawRoundedRect(ctx, 32, -44, 166, 132, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(224, 242, 254, 0.18)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 44, -32, 142, 108, 4);
  ctx.stroke();
  ctx.restore();

  // Cozy forest-amber rogue mat where the Goblin assassin rests
  ctx.save();
  ctx.fillStyle = '#2B2318';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2.6;
  drawRoundedRect(ctx, -124, 52, 158, 92, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(253, 230, 138, 0.18)';
  ctx.lineWidth = 1.4;
  drawRoundedRect(ctx, -112, 64, 134, 68, 4);
  ctx.stroke();
  ctx.restore();

  // Stone paved path leading North to the Guild Front Door
  ctx.fillStyle = '#2A2B36';
  for (let i = 0; i < 5; i++) {
    drawRoundedRect(ctx, -46 + (i % 2) * 6, -238 + i * 38, 88, 28, 6);
    ctx.fill();
  }

  // Cozy woven doormat right inside the North Doorway
  ctx.save();
  ctx.fillStyle = '#6B4226';
  ctx.strokeStyle = '#C99342';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, -50, room.y + 8, 100, 30, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Open threshold bridge across the North wall gap into the outside porch
  ctx.fillStyle = '#282B36';
  ctx.fillRect(-72, room.y - 24, 144, 32);

  // Training Dummy sparring circle in bottom-right
  ctx.save();
  ctx.fillStyle = '#2A231E';
  ctx.strokeStyle = '#5C4938';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(250, 152, 74, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Inner wall bevel border (leaving the North Doorway gap [-72, +72] open!)
  ctx.strokeStyle = '#4B3F57';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-72, room.y);
  ctx.lineTo(room.x, room.y);
  ctx.lineTo(room.x, room.y + room.h);
  ctx.lineTo(room.x + room.w, room.y + room.h);
  ctx.lineTo(room.x + room.w, room.y);
  ctx.lineTo(72, room.y);
  ctx.stroke();

  // Subtle floor label near the North Door
  const pulse = 0.78 + Math.sin(time * 2.5) * 0.18;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#D6D0C4';
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OUTSIDE · TO GRAVEYARD DUNGEON', 0, -184);
  ctx.restore();
}

function drawGuildOutdoorExit(ctx: CanvasRenderingContext2D, cor: WalkableZone, time: number): void {
  ctx.save();
  ctx.fillStyle = '#142026';
  drawRoundedRect(ctx, cor.x - 108, cor.y - 48, cor.w + 216, cor.h + 52, 18);
  ctx.fill();

  ctx.fillStyle = '#1B2D2B';
  ctx.beginPath();
  ctx.ellipse(cor.x - 42, cor.y + 38, 48, 32, -0.2, 0, Math.PI * 2);
  ctx.ellipse(cor.x + cor.w + 42, cor.y + 38, 48, 32, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1F2633';
  ctx.fillRect(cor.x, cor.y - 20, cor.w, cor.h + 20);

  ctx.fillStyle = '#2C3547';
  for (let sy = cor.y - 8; sy < cor.y + cor.h - 16; sy += 34) {
    drawRoundedRect(ctx, cor.x + 18, sy, cor.w - 36, 24, 6);
    ctx.fill();
  }

  ctx.strokeStyle = '#3B475E';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cor.x - 4, cor.y - 14);
  ctx.lineTo(cor.x - 4, cor.y + cor.h - 18);
  ctx.moveTo(cor.x + cor.w + 4, cor.y - 14);
  ctx.lineTo(cor.x + cor.w + 4, cor.y + cor.h - 18);
  ctx.stroke();

  const mistAlpha = 0.28 + Math.sin(time * 2.2) * 0.1;
  const mistGrad = ctx.createLinearGradient(0, cor.y - 28, 0, cor.y + 64);
  mistGrad.addColorStop(0, `rgba(125, 211, 252, ${mistAlpha})`);
  mistGrad.addColorStop(1, 'rgba(20, 32, 38, 0)');
  ctx.fillStyle = mistGrad;
  ctx.fillRect(cor.x - 30, cor.y - 28, cor.w + 60, 92);

  ctx.restore();
}

function drawCorridor(ctx: CanvasRenderingContext2D, cor: WalkableZone): void {
  ctx.fillStyle = '#232834';
  ctx.fillRect(cor.x - 12, cor.y - 12, cor.w + 24, cor.h + 24);

  ctx.fillStyle = '#1B2029';
  ctx.fillRect(cor.x, cor.y, cor.w, cor.h);

  ctx.fillStyle = '#262D3A';
  const step = 48;
  if (cor.w > cor.h) {
    for (let sx = cor.x + 24; sx < cor.x + cor.w - 24; sx += step) {
      drawRoundedRect(ctx, sx, cor.y + cor.h / 2 - 22, 34, 44, 6);
      ctx.fill();
    }
  } else {
    for (let sy = cor.y + 24; sy < cor.y + cor.h - 24; sy += step) {
      drawRoundedRect(ctx, cor.x + cor.w / 2 - 22, sy, 44, 34, 6);
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#363E4F';
  ctx.lineWidth = 3;
  ctx.strokeRect(cor.x, cor.y, cor.w, cor.h);
}

function drawGraveyardRoom(ctx: CanvasRenderingContext2D, room: DungeonRoom, time: number): void {
  ctx.fillStyle = '#252B38';
  drawRoundedRect(ctx, room.x - 18, room.y - 18, room.w + 36, room.h + 36, 10);
  ctx.fill();

  ctx.fillStyle = room.kind === RoomKind.Boss ? '#1C1B29' : '#182028';
  ctx.fillRect(room.x, room.y, room.w, room.h);

  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;

  ctx.fillStyle = room.kind === RoomKind.Boss ? '#252336' : '#1F2B28';
  ctx.beginPath();
  ctx.ellipse(cx - 120, cy - 80, 110, 70, 0.2, 0, Math.PI * 2);
  ctx.ellipse(cx + 135, cy + 95, 120, 75, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#232A36';
  ctx.beginPath();
  ctx.arc(cx, cy, room.kind === RoomKind.Boss ? 135 : 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#303949';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = '#394356';
  ctx.lineWidth = 4;
  ctx.strokeRect(room.x, room.y, room.w, room.h);

  if (room.locked) {
    ctx.save();
    ctx.strokeStyle = '#94A3B8';
    ctx.fillStyle = '#1E293B';
    for (const conn of room.connections) {
      if (conn.dir === 'N' || conn.dir === 'S') {
        const gy = conn.dir === 'N' ? room.y : room.y + room.h - 10;
        ctx.fillRect(cx - 72, gy - 4, 144, 14);
        for (let bx = cx - 64; bx <= cx + 64; bx += 16) {
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(bx - 2, gy - 12, 4, 24);
        }
      } else {
        const gx = conn.dir === 'W' ? room.x : room.x + room.w - 10;
        ctx.fillRect(gx - 4, cy - 72, 14, 144);
        for (let by = cy - 64; by <= cy + 64; by += 16) {
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(gx - 12, by - 2, 24, 4);
        }
      }
    }
    ctx.restore();
  }

  const mistShift = Math.sin(time * 0.6 + room.id) * 35;
  ctx.save();
  ctx.fillStyle = 'rgba(148, 163, 184, 0.035)';
  ctx.beginPath();
  ctx.ellipse(cx + mistShift, cy + 40, 220, 55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPoisonCloud(ctx: CanvasRenderingContext2D, cloud: PoisonCloudEntity, time: number): void {
  const fade = Math.min(1, cloud.life / 0.8) * 0.42;
  ctx.save();
  const grad = ctx.createRadialGradient(cloud.x, cloud.y, 12, cloud.x, cloud.y, cloud.radius);
  grad.addColorStop(0, `rgba(132, 204, 22, ${fade})`);
  grad.addColorStop(0.65, `rgba(74, 222, 128, ${fade * 0.65})`);
  grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(163, 230, 53, ${fade * 0.9})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const ang = time * 1.2 + i * 1.57;
    const r = cloud.radius * (0.35 + ((time * 0.5 + i * 0.25) % 0.5));
    const bx = cloud.x + Math.cos(ang) * (r * 0.6);
    const by = cloud.y + Math.sin(ang) * (r * 0.6);
    ctx.beginPath();
    ctx.arc(bx, by, 5 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawExplosiveTrap(
  ctx: CanvasRenderingContext2D,
  trap: ExplosiveTrapEntity,
  time: number
): void {
  const armed = trap.armTimer <= 0;
  ctx.save();
  ctx.translate(trap.x, trap.y);

  if (armed) {
    const pulse = 0.25 + Math.sin(time * 8 + trap.id) * 0.12;
    ctx.strokeStyle = `rgba(251, 146, 60, ${pulse})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, trap.triggerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Brass & iron rune mine body
  ctx.fillStyle = '#292524';
  ctx.strokeStyle = armed ? '#FB923C' : '#94A3B8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Blinking amber core rune
  ctx.fillStyle = armed
    ? Math.sin(time * 14 + trap.id) > -0.2
      ? '#FDE047'
      : '#F97316'
    : '#64748B';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawDaggerRainGroundZone(
  ctx: CanvasRenderingContext2D,
  zone: DaggerRainZone,
  time: number
): void {
  const alpha = Math.min(1, zone.life / 0.45);
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createRadialGradient(zone.x, zone.y, 18, zone.x, zone.y, zone.radius);
  grad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
  grad.addColorStop(0.65, 'rgba(52, 211, 153, 0.14)');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.lineDashOffset = -time * 42;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawDaggerRainSkyStreaks(
  ctx: CanvasRenderingContext2D,
  zone: DaggerRainZone,
  time: number
): void {
  const alpha = Math.min(1, zone.life / 0.35);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 9; i++) {
    const phase = (time * 3.8 + i * 0.37) % 1;
    const angle = i * 2.39996 + zone.id;
    const r = zone.radius * (0.18 + ((i * 0.29) % 0.76));
    const impactX = zone.x + Math.cos(angle) * r;
    const impactY = zone.y + Math.sin(angle) * r;
    const skyOffset = (1 - phase) * 145;
    const curX = impactX - skyOffset * 0.18;
    const curY = impactY - skyOffset;

    ctx.strokeStyle = i % 2 === 0 ? '#FDE047' : '#34D399';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(curX - 3, curY - 18);
    ctx.lineTo(curX, curY);
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(curX, curY, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEarthenGraspGround(
  ctx: CanvasRenderingContext2D,
  grasp: EarthenGraspZone,
  time: number
): void {
  const alpha = Math.min(1, grasp.life / 0.35);
  ctx.save();
  ctx.translate(grasp.x, grasp.y);
  ctx.globalAlpha = alpha;

  // Cracked earthen rune circle
  ctx.fillStyle = 'rgba(120, 53, 15, 0.34)';
  ctx.strokeStyle = '#FB923C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 6, grasp.radius, grasp.radius * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Two carved stone hands rising from the earth to grip the target
  const squeeze = Math.sin(time * 8 + grasp.id) * 2;
  ctx.fillStyle = '#78716C';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * (13 - squeeze), 4);
    drawRoundedRect(ctx, -5, -15, 10, 18, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FB923C';
    ctx.fillRect(-2, -10, 4, 4);
    ctx.fillStyle = '#78716C';
    ctx.restore();
  }

  ctx.restore();
}

function drawStoneRampart(
  ctx: CanvasRenderingContext2D,
  wall: StoneRampartEntity,
  time: number
): void {
  const rise = Math.min(1, (wall.maxLife - wall.life) / 0.22);
  const fade = Math.min(1, wall.life / 0.35);
  ctx.save();
  ctx.translate(wall.x, wall.y);
  ctx.globalAlpha = fade;
  ctx.scale(1, Math.max(0.25, rise));

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 14, wall.radius * 1.15, wall.radius * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Massive granite bastion monolith
  ctx.fillStyle = '#57534E';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.6;
  drawRoundedRect(ctx, -20, -28, 40, 42, 6);
  ctx.fill();
  ctx.stroke();

  // Bronze battlements cap
  ctx.fillStyle = '#78716C';
  drawRoundedRect(ctx, -23, -34, 46, 12, 4);
  ctx.fill();
  ctx.stroke();

  // Glowing copper rune core
  const glow = 0.75 + Math.sin(time * 6 + wall.id) * 0.25;
  ctx.fillStyle = `rgba(251, 146, 60, ${glow})`;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(6, -8);
  ctx.lineTo(0, 1);
  ctx.lineTo(-6, -8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawGoblinAfterimage(ctx: CanvasRenderingContext2D, ghost: AfterimageEntity): void {
  const alpha = Math.max(0, (ghost.life / ghost.maxLife) * 0.58);
  ctx.save();
  ctx.translate(ghost.x, ghost.y);
  ctx.scale(ghost.facingX * 0.96, 0.96);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ghost.color;

  // Rogue hood + pointed ears silhouette
  drawRoundedRect(ctx, -11, -4, 22, 16, 5);
  ctx.fill();
  drawRoundedRect(ctx, -13, -24, 26, 19, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, -18);
  ctx.lineTo(-24, -22);
  ctx.lineTo(-12, -12);
  ctx.moveTo(12, -18);
  ctx.lineTo(24, -22);
  ctx.lineTo(12, -12);
  ctx.fill();
  ctx.restore();
}

function drawEnemyTelegraph(ctx: CanvasRenderingContext2D, enemy: EnemyEntity, time: number): void {
  if (enemy.aiState !== 'WINDUP' && enemy.aiState !== 'WHIRLWIND') return;

  ctx.save();
  const pulse = 0.55 + Math.sin(time * 22) * 0.25;

  if (enemy.telegraphType === 'SLASH') {
    ctx.fillStyle = `rgba(245, 158, 11, ${0.22 * pulse})`;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.85 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.arc(enemy.x, enemy.y, 64, enemy.telegraphAngle - 0.75, enemy.telegraphAngle + 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.telegraphType === 'AIM_ARROW') {
    ctx.strokeStyle = `rgba(248, 113, 113, ${0.85 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(
      enemy.x + Math.cos(enemy.telegraphAngle) * 320,
      enemy.y + Math.sin(enemy.telegraphAngle) * 320
    );
    ctx.stroke();
  } else if (enemy.telegraphType === 'BOSS_CLEAVE') {
    ctx.fillStyle = `rgba(244, 63, 94, ${0.24 * pulse})`;
    ctx.strokeStyle = `rgba(251, 113, 133, ${0.9 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.arc(enemy.x, enemy.y, 135, enemy.telegraphAngle - 1.05, enemy.telegraphAngle + 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (enemy.telegraphType === 'BOSS_VOLLEY') {
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.75 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    const fanCount = 7;
    for (let i = 0; i < fanCount; i++) {
      const a = enemy.telegraphAngle - 0.9 + (i / (fanCount - 1)) * 1.8;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x + Math.cos(a) * 260, enemy.y + Math.sin(a) * 260);
      ctx.stroke();
    }
  } else if (enemy.telegraphType === 'BOSS_SUMMON') {
    ctx.strokeStyle = `rgba(45, 212, 191, ${0.85 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 85, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.telegraphType === 'BOSS_DASH') {
    ctx.strokeStyle = `rgba(251, 146, 60, ${0.85 * pulse})`;
    ctx.lineWidth = 28;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(
      enemy.x + Math.cos(enemy.telegraphAngle) * 280,
      enemy.y + Math.sin(enemy.telegraphAngle) * 280
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawProp(
  ctx: CanvasRenderingContext2D,
  prop: RoomProp,
  time: number,
  isGuild: boolean,
  activeCharId: CharacterId
): void {
  ctx.save();
  ctx.translate(prop.x, prop.y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, prop.h * 0.38, prop.w * 0.48, prop.h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.5;

  switch (prop.kind) {
    case 'TOMBSTONE_ROUND': {
      ctx.fillStyle = '#525B6C';
      ctx.beginPath();
      ctx.arc(0, -8, 17, Math.PI, 0);
      ctx.lineTo(17, 16);
      ctx.lineTo(-17, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3F624D';
      ctx.beginPath();
      ctx.arc(-6, -18, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333A48';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(8, -4);
      ctx.moveTo(-6, 3);
      ctx.lineTo(6, 3);
      ctx.stroke();
      break;
    }
    case 'TOMBSTONE_CROSS': {
      ctx.fillStyle = '#5B6475';
      drawRoundedRect(ctx, -6, -24, 12, 40, 3);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, -16, -14, 32, 10, 3);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'CRYPT_PILLAR': {
      ctx.fillStyle = '#3F4659';
      drawRoundedRect(ctx, -20, -28, 40, 48, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#545D73';
      drawRoundedRect(ctx, -23, -32, 46, 12, 4);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'LANTERN_POST': {
      ctx.fillStyle = '#272B36';
      ctx.fillRect(-3, -24, 6, 34);
      ctx.strokeRect(-3, -24, 6, 34);
      const flicker = 0.88 + Math.sin(time * 9 + prop.id) * 0.12;
      ctx.fillStyle = `rgba(251, 191, 36, ${flicker})`;
      drawRoundedRect(ctx, -8, -32, 16, 14, 4);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'BONE_URN': {
      ctx.fillStyle = '#7C6F64';
      ctx.beginPath();
      ctx.ellipse(0, 2, 13, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9C8D7E';
      drawRoundedRect(ctx, -8, -14, 16, 6, 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'WOOD_CRATE': {
      ctx.fillStyle = '#6E472B';
      drawRoundedRect(ctx, -16, -16, 32, 32, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#4A2E1B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(14, 14);
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      break;
    }
    case 'SHRINE_ALTAR': {
      ctx.fillStyle = '#363F52';
      drawRoundedRect(ctx, -26, -2, 52, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475269';
      drawRoundedRect(ctx, -20, -10, 40, 14, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.moveTo(-13, -8);
      ctx.lineTo(-9, -32);
      ctx.quadraticCurveTo(0, -43, 9, -32);
      ctx.lineTo(13, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.arc(0, -34, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const bob = prop.opened ? 0 : Math.sin(time * 3.5) * 3.5;
      const shrineCoreColor =
        activeCharId === CharacterId.Skeleton
          ? '#38BDF8'
          : activeCharId === CharacterId.Goblin
          ? '#F59E0B'
          : activeCharId === CharacterId.Gnome
          ? '#FB923C'
          : '#4ADE80';
      const shrineAuraColor =
        activeCharId === CharacterId.Skeleton
          ? 'rgba(56, 189, 248, 0.58)'
          : activeCharId === CharacterId.Goblin
          ? 'rgba(245, 158, 11, 0.58)'
          : activeCharId === CharacterId.Gnome
          ? 'rgba(251, 146, 60, 0.58)'
          : 'rgba(74, 222, 128, 0.55)';
      ctx.fillStyle = prop.opened ? '#64748B' : shrineCoreColor;
      ctx.beginPath();
      ctx.arc(0, -20 + bob, prop.opened ? 6.5 : 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (!prop.opened) {
        ctx.save();
        ctx.strokeStyle = shrineAuraColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, -20 + bob, 13 + Math.sin(time * 5) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'CHEST': {
      ctx.fillStyle = prop.opened ? '#4B3A2C' : '#854D27';
      drawRoundedRect(ctx, -20, -14, 40, 28, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(-20, -2, 40, 5);
      ctx.fillRect(-4, -5, 8, 10);
      break;
    }
    case 'HEARTH_FIRE': {
      ctx.fillStyle = '#474350';
      drawRoundedRect(ctx, -38, -42, 76, 80, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1D1822';
      drawRoundedRect(ctx, -24, -16, 48, 48, 8);
      ctx.fill();
      ctx.fillStyle = '#5C3824';
      ctx.fillRect(-18, 18, 36, 8);
      const f1 = Math.sin(time * 10) * 4;
      const f2 = Math.cos(time * 13) * 3;
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(0, 10, 16, 0, Math.PI * 2);
      ctx.moveTo(-16, 12);
      ctx.lineTo(f1, -14);
      ctx.lineTo(16, 12);
      ctx.fill();
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(f2 * 0.5, 12, 9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'GUILD_COUCH': {
      ctx.fillStyle = '#6D2E3B';
      drawRoundedRect(ctx, -52, -20, 104, 40, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#883949';
      drawRoundedRect(ctx, -44, -8, 88, 24, 6);
      ctx.fill();
      break;
    }
    case 'GUILD_BOOKSHELF': {
      ctx.fillStyle = '#523422';
      drawRoundedRect(ctx, -52, -22, 104, 42, 5);
      ctx.fill();
      ctx.stroke();
      const colors = ['#4ADE80', '#F59E0B', '#38BDF8', '#F43F5E', '#A78BFA'];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(-42 + i * 11, -14, 7, 16);
      }
      break;
    }
    case 'GUILD_CAULDRON': {
      ctx.fillStyle = '#2A2D38';
      ctx.beginPath();
      ctx.arc(0, 2, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4ADE80';
      ctx.beginPath();
      ctx.ellipse(0, -6, 17, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      const bub = Math.sin(time * 6) * 3;
      ctx.fillStyle = '#BBF7D0';
      ctx.beginPath();
      ctx.arc(-5, -6 + bub * 0.4, 3.5, 0, Math.PI * 2);
      ctx.arc(6, -5 - bub * 0.4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'PORTAL_ARCH': {
      ctx.fillStyle = '#3F4759';
      drawRoundedRect(ctx, -52, -32, 104, 58, 26);
      ctx.fill();
      ctx.stroke();

      const swirlGrad = ctx.createRadialGradient(0, -2, 4, 0, -2, 38);
      if (isGuild) {
        swirlGrad.addColorStop(0, '#A7F3D0');
        swirlGrad.addColorStop(0.5, '#10B981');
        swirlGrad.addColorStop(1, '#1E1B4B');
      } else {
        swirlGrad.addColorStop(0, '#BAE6FD');
        swirlGrad.addColorStop(0.55, '#0284C7');
        swirlGrad.addColorStop(1, '#1E1B4B');
      }
      ctx.fillStyle = swirlGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 26, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + Math.sin(time * 4) * 4, time * 2, time * 2 + Math.PI * 1.3);
      ctx.stroke();
      break;
    }
    case 'GUILD_DOOR': {
      ctx.fillStyle = '#4B4458';
      drawRoundedRect(ctx, -82, -20, 20, 38, 5);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, 62, -20, 20, 38, 5);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(-64, -12);
      ctx.rotate(-0.52);
      ctx.fillStyle = '#6E4528';
      drawRoundedRect(ctx, 0, -44, 14, 48, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#272B36';
      ctx.fillRect(1, -12, 12, 4);
      ctx.fillRect(1, -34, 12, 4);
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(10, -22, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(64, -12);
      ctx.rotate(0.52);
      ctx.fillStyle = '#6E4528';
      drawRoundedRect(ctx, -14, -44, 14, 48, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#272B36';
      ctx.fillRect(-13, -12, 12, 4);
      ctx.fillRect(-13, -34, 12, 4);
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(-10, -22, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const bob = Math.sin(time * 4.2) * 4;
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-10, -22 + bob);
      ctx.lineTo(0, -32 + bob);
      ctx.lineTo(10, -22 + bob);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawHeroCharacter(
  ctx: CanvasRenderingContext2D,
  player: RenderPlayerState,
  phase: GamePhase,
  time: number,
  isControlled: boolean
): void {
  if (player.characterId === CharacterId.Skeleton) {
    drawSkeletonPlayer(ctx, player, phase, time, isControlled);
  } else if (player.characterId === CharacterId.Goblin) {
    drawGoblinPlayer(ctx, player, phase, time, isControlled);
  } else if (player.characterId === CharacterId.Gnome) {
    drawGnomePlayer(ctx, player, phase, time, isControlled);
  } else {
    drawZombiePlayer(ctx, player, phase, time, isControlled);
  }
}

function drawZombiePlayer(
  ctx: CanvasRenderingContext2D,
  player: RenderPlayerState,
  phase: GamePhase,
  time: number,
  isControlled: boolean
): void {
  const isAbom = player.abominationTimer > 0;
  const baseScale = isAbom ? 1.52 : 1.0;
  const speed = Math.hypot(player.vx, player.vy);
  const bob = speed > 10 ? Math.abs(Math.sin(player.walkPhase)) * 4.5 : Math.sin(time * 2.6) * 1.5;

  ctx.save();
  ctx.translate(player.x, player.y);

  if (phase === GamePhase.GuildPicking || player.hoveredInGuild) {
    ctx.save();
    ctx.strokeStyle = isControlled ? '#4ADE80' : 'rgba(74, 222, 128, 0.65)';
    ctx.lineWidth = isControlled ? 2.6 : 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -time * 22;
    ctx.beginPath();
    ctx.ellipse(0, 14, 28, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (player.undyingTimer > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.75)';
    ctx.fillStyle = 'rgba(45, 212, 191, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -4, 30 * baseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = time * 3.4 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = '#99F6E4';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 30 * baseScale, -4 + Math.sin(a) * 30 * baseScale, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 15 * baseScale, 17 * baseScale, 8 * baseScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(player.facingX * player.squashX * baseScale, player.squashY * baseScale);
  ctx.translate(0, -bob);

  const flash = player.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.4;

  // Tattered maroon scarf tail
  ctx.fillStyle = flash ? '#FFFFFF' : '#7F293A';
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.lineTo(-21, 4 + Math.sin(time * 9) * 3);
  ctx.lineTo(-17, 11 + Math.sin(time * 9) * 3);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Torso
  ctx.fillStyle = flash ? '#FFFFFF' : isAbom ? '#3B2F4A' : '#3E4437';
  drawRoundedRect(ctx, -12, -4, 24, 18, 6);
  ctx.fill();
  ctx.stroke();

  // Iron shoulder pauldron
  ctx.fillStyle = flash ? '#FFFFFF' : '#94A3B8';
  ctx.beginPath();
  ctx.arc(-11, -2, 7.5, Math.PI * 0.7, Math.PI * 2.1);
  ctx.fill();
  ctx.stroke();

  // Cozy Maroon Scarf wrap
  ctx.fillStyle = flash ? '#FFFFFF' : '#8E3145';
  drawRoundedRect(ctx, -13, -7, 26, 7, 3.5);
  ctx.fill();
  ctx.stroke();

  // Stitched Zombie Head
  ctx.fillStyle = flash ? '#FFFFFF' : isAbom ? '#529447' : '#6BA358';
  drawRoundedRect(ctx, -14, -25, 28, 21, 9);
  ctx.fill();
  ctx.stroke();

  if (isAbom && !flash) {
    ctx.fillStyle = '#E5DEC9';
    ctx.beginPath();
    ctx.moveTo(-11, -22);
    ctx.lineTo(-19, -33);
    ctx.lineTo(-6, -25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(11, -22);
    ctx.lineTo(19, -33);
    ctx.lineTo(6, -25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (!flash) {
    ctx.fillStyle = '#283325';
    ctx.beginPath();
    ctx.moveTo(-12, -21);
    ctx.quadraticCurveTo(0, -31, 13, -21);
    ctx.lineTo(6, -24);
    ctx.lineTo(0, -20);
    ctx.lineTo(-6, -24);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#2D4426';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, -19);
    ctx.lineTo(-2, -15);
    ctx.stroke();
  }

  // Glowing Emerald Eyes
  ctx.fillStyle = flash ? '#FFFFFF' : '#4ADE80';
  ctx.beginPath();
  ctx.arc(-4, -14, 3.2, 0, Math.PI * 2);
  ctx.arc(6, -14, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Bandaged claw hands
  ctx.fillStyle = flash ? '#FFFFFF' : '#D6CFC2';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(14, 4, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawSkeletonPlayer(
  ctx: CanvasRenderingContext2D,
  player: RenderPlayerState,
  phase: GamePhase,
  time: number,
  isControlled: boolean
): void {
  const isColossus = player.colossusTimer > 0;
  const baseScale = isColossus ? 1.56 : 1.0;
  const speed = Math.hypot(player.vx, player.vy);
  const bob = speed > 10 ? Math.abs(Math.sin(player.walkPhase)) * 4.8 : Math.sin(time * 2.9) * 1.6;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Selection highlight ring in Guild
  if (phase === GamePhase.GuildPicking || player.hoveredInGuild) {
    ctx.save();
    ctx.strokeStyle = isControlled ? '#38BDF8' : 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = isControlled ? 2.6 : 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -time * 22;
    ctx.beginPath();
    ctx.ellipse(0, 14, 28, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Bone Storm whirling vortex fragments
  if (player.boneStormTimer > 0) {
    ctx.save();
    const stormR = 68;
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.38)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, stormR, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const ang = time * 8.5 + (i * Math.PI * 2) / 6;
      const sx = Math.cos(ang) * stormR;
      const sy = Math.sin(ang) * stormR;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(0, -4);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Ribcage Shield orbiting curved bone ribs
  if (player.ribcageTimer > 0 && player.ribcageCharges > 0) {
    ctx.save();
    const shieldR = 32 * baseScale;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -4, shieldR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < player.ribcageCharges; i++) {
      const a = time * 3.8 + (i * Math.PI * 2) / Math.max(1, player.ribcageCharges);
      ctx.save();
      ctx.translate(Math.cos(a) * shieldR, -4 + Math.sin(a) * shieldR);
      ctx.rotate(a + Math.PI / 2);
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 6, 9, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 15 * baseScale, 16 * baseScale, 7.5 * baseScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(player.facingX * player.squashX * baseScale, player.squashY * baseScale);
  ctx.translate(0, -bob);

  const flash = player.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.4;

  // Royal indigo scarf tail fluttering behind
  ctx.fillStyle = flash ? '#FFFFFF' : '#4338CA';
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.lineTo(-23, 3 + Math.sin(time * 10) * 3.5);
  ctx.lineTo(-18, 10 + Math.sin(time * 10) * 3.5);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Agile duelist coat & ivory ribcage torso
  ctx.fillStyle = flash ? '#FFFFFF' : isColossus ? '#1E1B4B' : '#1E293B';
  drawRoundedRect(ctx, -11, -4, 22, 18, 5);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Ivory ribcage plates on chest
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 1);
    ctx.lineTo(5, 1);
    ctx.moveTo(-6, 5.5);
    ctx.lineTo(6, 5.5);
    ctx.moveTo(0, -1);
    ctx.lineTo(0, 9);
    ctx.stroke();
  }

  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.2;

  // Iron shoulder pauldron
  ctx.fillStyle = flash ? '#FFFFFF' : '#94A3B8';
  ctx.beginPath();
  ctx.arc(-10, -2, 7, Math.PI * 0.7, Math.PI * 2.1);
  ctx.fill();
  ctx.stroke();

  // Royal Indigo Scarf Collar
  ctx.fillStyle = flash ? '#FFFFFF' : '#4F46E5';
  drawRoundedRect(ctx, -12, -7, 24, 6.5, 3);
  ctx.fill();
  ctx.stroke();

  // Royal Indigo Hood outer silhouette
  ctx.fillStyle = flash ? '#FFFFFF' : isColossus ? '#312E81' : '#3730A3';
  drawRoundedRect(ctx, -14.5, -26, 29, 21, 10);
  ctx.fill();
  ctx.stroke();

  // Carved Ivory Skull inside hood
  ctx.fillStyle = flash ? '#FFFFFF' : '#F5F0E6';
  drawRoundedRect(ctx, -11.5, -23.5, 23, 17.5, 7.5);
  ctx.fill();
  ctx.stroke();

  // Bone Colossus towering crown horns
  if (isColossus && !flash) {
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(-11, -23);
    ctx.lineTo(-20, -36);
    ctx.lineTo(-5, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(11, -23);
    ctx.lineTo(20, -36);
    ctx.lineTo(5, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Glowing Sky-Cyan Duelist Eyes
  ctx.fillStyle = flash ? '#FFFFFF' : '#38BDF8';
  ctx.beginPath();
  ctx.arc(-3.5, -14.5, 3.1, 0, Math.PI * 2);
  ctx.arc(5.5, -14.5, 3.1, 0, Math.PI * 2);
  ctx.fill();

  // Gleaming Carved Bone Katana / Colossus Bone Greatsword
  ctx.save();
  ctx.translate(12, 2);
  ctx.rotate(-0.35);
  ctx.fillStyle = flash ? '#FFFFFF' : '#F8FAFC';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;
  const bladeH = isColossus ? 34 : 25;
  const bladeW = isColossus ? 7.5 : 5;
  ctx.beginPath();
  ctx.moveTo(-bladeW / 2, 4);
  ctx.lineTo(-bladeW / 2, -bladeH + 6);
  ctx.quadraticCurveTo(0, -bladeH - 2, bladeW / 2 + 1.5, -bladeH + 5);
  ctx.lineTo(bladeW / 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(0.5, -bladeH + 7);
    ctx.stroke();
  }

  // Bone hilt guard
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(-5, 2, 10, 3.5);
  ctx.restore();

  ctx.restore();

  // Unyielding Bones passive fortification pips above shoulder
  if (player.unyieldingStacks > 0) {
    for (let s = 0; s < player.unyieldingStacks; s++) {
      ctx.fillStyle = '#38BDF8';
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-8 + s * 8, -32 * baseScale, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawGoblinPlayer(
  ctx: CanvasRenderingContext2D,
  player: RenderPlayerState,
  phase: GamePhase,
  time: number,
  isControlled: boolean
): void {
  const baseScale = 0.95;
  const speed = Math.hypot(player.vx, player.vy);
  const bob = speed > 10 ? Math.abs(Math.sin(player.walkPhase)) * 5.2 : Math.sin(time * 3.4) * 1.6;
  const isWindrunner = player.windrunnerTimer > 0;
  const isVenom = player.poisonBladesTimer > 0;
  const isStolenMight = player.stolenMightTimer > 0;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Selection highlight ring in Guild
  if (phase === GamePhase.GuildPicking || player.hoveredInGuild) {
    ctx.save();
    ctx.strokeStyle = isControlled ? '#F59E0B' : 'rgba(245, 158, 11, 0.65)';
    ctx.lineWidth = isControlled ? 2.6 : 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -time * 22;
    ctx.beginPath();
    ctx.ellipse(0, 14, 27, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Windrunner swift gale ring
  if (isWindrunner) {
    ctx.save();
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -time * 75;
    ctx.beginPath();
    ctx.ellipse(0, 4, 30, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(player.facingX * player.squashX * baseScale, player.squashY * baseScale);
  ctx.translate(0, -bob);

  const flash = player.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.3;

  // Burnt-amber rogue cloak tail fluttering behind
  ctx.fillStyle = flash ? '#FFFFFF' : '#9A3412';
  ctx.beginPath();
  ctx.moveTo(-7, -3);
  ctx.lineTo(-24, 4 + Math.sin(time * 12) * 3.5);
  ctx.lineTo(-18, 11 + Math.sin(time * 12) * 3.5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Agile leather brigandine torso
  ctx.fillStyle = flash ? '#FFFFFF' : '#3F2E21';
  drawRoundedRect(ctx, -11, -3, 22, 17, 5);
  ctx.fill();
  ctx.stroke();

  // Golden sash belt
  if (!flash) {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-10, 6, 20, 3.5);
  }

  // Burnt-amber thief cowl collar
  ctx.fillStyle = flash ? '#FFFFFF' : '#B45309';
  drawRoundedRect(ctx, -12.5, -7, 25, 6.5, 3);
  ctx.fill();
  ctx.stroke();

  // Long pointed Goblin ears jutting out from both sides of the hood!
  ctx.fillStyle = flash ? '#FFFFFF' : '#65A30D';
  ctx.beginPath();
  ctx.moveTo(-11, -17);
  ctx.lineTo(-25, -21);
  ctx.lineTo(-12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(11, -17);
  ctx.lineTo(24, -21);
  ctx.lineTo(12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Deep rogue hood outer cowl
  ctx.fillStyle = flash ? '#FFFFFF' : '#9A3412';
  drawRoundedRect(ctx, -13.5, -25, 27, 20, 9);
  ctx.fill();
  ctx.stroke();

  // Moss-olive cunning Goblin face inside hood
  ctx.fillStyle = flash ? '#FFFFFF' : '#84CC16';
  drawRoundedRect(ctx, -10.5, -21.5, 21, 15.5, 7);
  ctx.fill();
  ctx.stroke();

  // Glowing Amber-Gold Assassin Eyes
  ctx.fillStyle = flash ? '#FFFFFF' : '#FDE047';
  ctx.beginPath();
  ctx.arc(-3, -14, 3, 0, Math.PI * 2);
  ctx.arc(5.5, -14, 3, 0, Math.PI * 2);
  ctx.fill();

  // Twin Curved Assassin Daggers (glowing bright venom green when Poisoned Blades active!)
  const bladeFill = flash ? '#FFFFFF' : isVenom ? '#A3E635' : '#F8FAFC';
  const bladeEdge = isVenom ? '#4ADE80' : '#FBBF24';

  // Off-hand reverse-grip dagger
  ctx.save();
  ctx.translate(-12, 3);
  ctx.rotate(0.45);
  ctx.fillStyle = bladeFill;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.moveTo(-2.5, 0);
  ctx.lineTo(-3, 13);
  ctx.quadraticCurveTo(0, 17, 3, 11);
  ctx.lineTo(2.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Main-hand forward curved dagger
  ctx.save();
  ctx.translate(13, 3);
  ctx.rotate(-0.35);
  ctx.fillStyle = bladeFill;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-2.5, 3);
  ctx.lineTo(-2.5, -13);
  ctx.quadraticCurveTo(1, -18, 4, -11);
  ctx.lineTo(2.5, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    ctx.strokeStyle = bladeEdge;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(0.5, -12);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();

  // King of Thieves stolen-strength golden crown emblem above hood
  if (isStolenMight) {
    ctx.save();
    ctx.fillStyle = '#FBBF24';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, -31);
    ctx.lineTo(-6, -38);
    ctx.lineTo(0, -34);
    ctx.lineTo(6, -38);
    ctx.lineTo(8, -31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawGnomePlayer(
  ctx: CanvasRenderingContext2D,
  player: RenderPlayerState,
  phase: GamePhase,
  time: number,
  isControlled: boolean
): void {
  const isMountain = player.mountainHeartTimer > 0;
  const isFortress = player.fortressTimer > 0;
  const isMagnetic = player.magneticTimer > 0;
  const scaleX = (isMountain ? 1.52 : 1.04) * player.squashX;
  const scaleY = (isMountain ? 1.48 : 0.92) * player.squashY;
  const speed = Math.hypot(player.vx, player.vy);
  const bob = speed > 10 ? Math.abs(Math.sin(player.walkPhase)) * 4.0 : Math.sin(time * 2.8) * 1.4;
  const leapLift =
    player.leapAirProgress > 0 ? Math.sin(player.leapAirProgress * Math.PI) * 34 : 0;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Selection highlight ring in Guild
  if (phase === GamePhase.GuildPicking || player.hoveredInGuild) {
    ctx.save();
    ctx.strokeStyle = isControlled ? '#FB923C' : 'rgba(251, 146, 60, 0.65)';
    ctx.lineWidth = isControlled ? 2.6 : 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -time * 22;
    ctx.beginPath();
    ctx.ellipse(0, 14, 28, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Lasting Resolve tenacity aura when HP drops
  if (player.resolveRatio > 0.22) {
    ctx.save();
    ctx.strokeStyle = `rgba(251, 146, 60, ${0.25 + player.resolveRatio * 0.55})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 11, 24, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Magnetic Guard pulsing lodestone polarity rings
  if (isMagnetic) {
    ctx.save();
    const magR = isMountain ? 58 : 44;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.62)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -time * 52;
    ctx.beginPath();
    ctx.arc(0, -4, magR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(251, 146, 60, 0.68)';
    ctx.lineDashOffset = time * 52;
    ctx.beginPath();
    ctx.arc(0, -4, magR - 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Fortress Stance orbiting stone-bronze shield plates
  if (isFortress) {
    ctx.save();
    const guardR = isMountain ? 46 : 33;
    ctx.fillStyle = 'rgba(251, 146, 60, 0.12)';
    ctx.strokeStyle = 'rgba(253, 186, 116, 0.75)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -3, guardR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const a = time * 2.6 + (i * Math.PI) / 2;
      ctx.save();
      ctx.translate(Math.cos(a) * guardR, -3 + Math.sin(a) * guardR);
      ctx.rotate(a);
      ctx.fillStyle = '#78716C';
      ctx.strokeStyle = '#FB923C';
      ctx.lineWidth = 1.6;
      drawRoundedRect(ctx, -4, -7, 8, 14, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Ground shadow (shrinks slightly while leaping in Groundbreaker!)
  const shadowScale = (isMountain ? 1.48 : 1.0) * (1 - leapLift * 0.008);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  ctx.beginPath();
  ctx.ellipse(0, 14 * (isMountain ? 1.4 : 1), 18 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -leapLift);
  ctx.scale(player.facingX * scaleX, scaleY);
  ctx.translate(0, -bob);

  const flash = player.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.4;

  // Heavy rust-crimson defender cape behind shoulders
  ctx.fillStyle = flash ? '#FFFFFF' : '#9A3412';
  ctx.beginPath();
  ctx.moveTo(-10, -4);
  ctx.lineTo(-22, 7 + Math.sin(time * 8) * 2.5);
  ctx.lineTo(-14, 14 + Math.sin(time * 8) * 2.5);
  ctx.lineTo(-4, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stocky stone-and-bronze reinforced cuirass torso
  ctx.fillStyle = flash ? '#FFFFFF' : isMountain ? '#57534E' : '#475569';
  drawRoundedRect(ctx, -14, -4, 28, 19, 6);
  ctx.fill();
  ctx.stroke();

  // Forged copper belt & glowing runestone buckle
  if (!flash) {
    ctx.fillStyle = '#B45309';
    ctx.fillRect(-13, 6, 26, 4.5);
    ctx.fillStyle = '#FB923C';
    ctx.fillRect(-3.5, 4.5, 7, 7);
  }

  // Heavy riveted pauldrons on both shoulders
  ctx.fillStyle = flash ? '#FFFFFF' : isMountain ? '#78716C' : '#94A3B8';
  ctx.beginPath();
  ctx.arc(-13, -2, 8, Math.PI * 0.65, Math.PI * 2.15);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, -1, 7.5, -Math.PI * 0.15, Math.PI * 1.35);
  ctx.fill();
  ctx.stroke();

  // Sturdy Gnome head & bronze-rimmed delving helm
  ctx.fillStyle = flash ? '#FFFFFF' : isMountain ? '#78716C' : '#FDBA74';
  drawRoundedRect(ctx, -13, -23, 26, 18, 8);
  ctx.fill();
  ctx.stroke();

  // Lush braided snowy-white Gnome beard covering chin & chest!
  ctx.fillStyle = flash ? '#FFFFFF' : isMountain ? '#D6D3D1' : '#F8FAFC';
  ctx.beginPath();
  ctx.moveTo(-11, -11);
  ctx.lineTo(12, -11);
  ctx.lineTo(9, 2);
  ctx.lineTo(2, 8);
  ctx.lineTo(-6, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Forged Bronze & Iron Delving Helmet Dome + Crest
  ctx.fillStyle = flash ? '#FFFFFF' : isMountain ? '#44403C' : '#64748B';
  ctx.beginPath();
  ctx.arc(0, -17, 14, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Copper helm brow band & warm runestone headlamp gem
  ctx.fillStyle = flash ? '#FFFFFF' : '#D97706';
  drawRoundedRect(ctx, -14.5, -19, 29, 5, 2.5);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(2, -21, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mountain's Heart towering stone crag horns
  if (isMountain && !flash) {
    ctx.fillStyle = '#FB923C';
    ctx.beginPath();
    ctx.moveTo(-12, -21);
    ctx.lineTo(-20, -33);
    ctx.lineTo(-6, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(12, -21);
    ctx.lineTo(20, -33);
    ctx.lineTo(6, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Glowing Warm Amber-Copper Eyes beneath helm brow
  ctx.fillStyle = flash ? '#FFFFFF' : '#FB923C';
  ctx.beginPath();
  ctx.arc(-3, -13, 2.8, 0, Math.PI * 2);
  ctx.arc(6, -13, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Oversized Reinforced Runestone Iron Gauntlets (signature weapon!)
  ctx.fillStyle = flash ? '#FFFFFF' : isMountain ? '#57534E' : '#64748B';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.2;
  drawRoundedRect(ctx, 10, -2, 13, 12, 4);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    ctx.fillStyle = '#FB923C';
    ctx.fillRect(14, 1, 5, 5);
  }

  ctx.restore();
  ctx.restore();
}

function drawMinion(ctx: CanvasRenderingContext2D, minion: MinionEntity, time: number): void {
  const spawnScale = minion.spawnAnimTimer > 0 ? 1 - minion.spawnAnimTimer / 0.25 : 1;
  const bob = Math.abs(Math.sin(minion.walkPhase)) * 3.2;

  ctx.save();
  ctx.translate(minion.x, minion.y);
  ctx.scale(Math.max(0.2, spawnScale), Math.max(0.2, spawnScale));

  if (minion.minionType === 'SKELETON_WARRIOR_ALLY') {
    // Friendly cyan ally ring so player distinguishes Army of Bones from crypt enemies
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 10, 13, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(minion.facingX, 1);
  ctx.translate(0, -bob);

  const flash = minion.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;

  if (minion.minionType === 'SKELETON_WARRIOR_ALLY') {
    // Royal-Indigo Allied Skeletal Sword-Warrior
    ctx.fillStyle = flash ? '#FFFFFF' : '#3730A3';
    drawRoundedRect(ctx, -8, -2, 16, 12, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#FFFFFF' : '#F5F0E6';
    drawRoundedRect(ctx, -9.5, -17, 19, 14.5, 6.5);
    ctx.fill();
    ctx.stroke();

    // Glowing cyan eyes
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(-2, -10, 2.2, 0, Math.PI * 2);
    ctx.arc(4.5, -10, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Mini bone sword
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(9, -13, 4, 15);
    ctx.strokeRect(9, -13, 4, 15);
  } else {
    // Cute Zombie Shambler Ally
    ctx.fillStyle = flash ? '#FFFFFF' : '#4A433B';
    drawRoundedRect(ctx, -8, -2, 16, 12, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#FFFFFF' : '#7BC462';
    drawRoundedRect(ctx, -10, -17, 20, 15, 7);
    ctx.fill();
    ctx.stroke();

    if (!flash && minion.sproutVariant === 0) {
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.quadraticCurveTo(4, -24, 7, -21 + Math.sin(time * 6) * 1.5);
      ctx.stroke();
    }

    ctx.fillStyle = '#BBF7D0';
    ctx.beginPath();
    ctx.arc(-2, -10, 2.2, 0, Math.PI * 2);
    ctx.arc(5, -10, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyEntity, time: number): void {
  const isBoss = enemy.kind === EnemyKind.SkeletonBoss;
  const isDummy = enemy.kind === EnemyKind.TrainingDummy;
  const speed = Math.hypot(enemy.vx, enemy.vy);
  const bob = speed > 8 ? Math.abs(Math.sin(enemy.walkPhase)) * 4 : 0;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, isBoss ? 26 : 15, isBoss ? 28 : 15, isBoss ? 12 : 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(enemy.facingX * enemy.squashX * enemy.traits.scale, enemy.squashY * enemy.traits.scale);
  ctx.translate(0, -bob);

  const flash = enemy.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.2;

  if (isDummy) {
    ctx.fillStyle = '#5C3A21';
    ctx.fillRect(-3, -6, 6, 22);
    ctx.fillRect(-18, -12, 36, 5);
    ctx.fillStyle = flash ? '#FFFFFF' : '#D4A359';
    drawRoundedRect(ctx, -11, -16, 22, 20, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -24, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (isBoss) {
    ctx.fillStyle = flash ? '#FFFFFF' : '#6B2D5C';
    ctx.beginPath();
    ctx.moveTo(-20, -14);
    ctx.lineTo(20, -14);
    ctx.lineTo(26, 22);
    ctx.lineTo(-26, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#FFFFFF' : '#E5DEC9';
    drawRoundedRect(ctx, -13, -12, 26, 22, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#FFFFFF' : '#F3EFE6';
    drawRoundedRect(ctx, -15, -33, 30, 22, 9);
    ctx.fill();
    ctx.stroke();

    if (!flash) {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(-13, -31);
      ctx.lineTo(-15, -43);
      ctx.lineTo(-6, -36);
      ctx.lineTo(0, -46);
      ctx.lineTo(6, -36);
      ctx.lineTo(15, -43);
      ctx.lineTo(13, -31);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(-5, -22, 3.6, 0, Math.PI * 2);
    ctx.arc(6, -22, 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38BDF8';
    drawRoundedRect(ctx, -29, -4 + Math.sin(time * 5) * 2, 11, 15, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    drawRoundedRect(ctx, 16, -18, 12, 32, 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const isArcher = enemy.kind === EnemyKind.SkeletonArcher;
    ctx.fillStyle = flash ? '#FFFFFF' : enemy.traits.hoodColor;
    drawRoundedRect(ctx, -11, -4, 22, 16, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = flash ? '#FFFFFF' : enemy.traits.boneTint;
    drawRoundedRect(ctx, -12, -22, 24, 18, 8);
    ctx.fill();
    ctx.stroke();

    if (!flash) {
      if (isArcher) {
        ctx.fillStyle = enemy.traits.hoodColor;
        ctx.beginPath();
        ctx.arc(0, -16, 13, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (enemy.traits.skullVariant === 1) {
        ctx.fillStyle = '#64748B';
        ctx.fillRect(-12, -19, 24, 5);
      } else if (enemy.traits.skullVariant === 2) {
        ctx.fillStyle = '#3F624D';
        ctx.beginPath();
        ctx.arc(-6, -21, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = isArcher ? '#F59E0B' : '#EF4444';
    ctx.beginPath();
    ctx.arc(-3.5, -13, 2.4, 0, Math.PI * 2);
    ctx.arc(5, -13, 2.4, 0, Math.PI * 2);
    ctx.fill();

    if (isArcher) {
      ctx.strokeStyle = '#D6CFC2';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(11, 0, 11, -1.1, 1.1);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#CBD5E1';
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.8;
      ctx.fillRect(12, -16, 5, 20);
      ctx.strokeRect(12, -16, 5, 20);
      if (enemy.traits.hasBuckler) {
        ctx.fillStyle = '#784B2A';
        ctx.beginPath();
        ctx.arc(-12, 3, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  ctx.restore();

  if (
    !isBoss &&
    (enemy.hp < enemy.maxHp ||
      enemy.infectionStacks > 0 ||
      enemy.slowTimer > 0 ||
      enemy.stunTimer > 0 ||
      enemy.rootTimer > 0)
  ) {
    const barW = 34;
    const barY = isDummy ? -38 : -34;
    ctx.fillStyle = '#14111C';
    ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, 6);
    ctx.fillStyle =
      enemy.stunTimer > 0 || enemy.rootTimer > 0
        ? '#FB923C'
        : enemy.infectionStacks > 0
        ? '#84CC16'
        : '#EF4444';
    ctx.fillRect(-barW / 2, barY, barW * Math.max(0, enemy.hp / enemy.maxHp), 4);

    if (enemy.infectionStacks > 0) {
      for (let s = 0; s < enemy.infectionStacks; s++) {
        ctx.fillStyle = '#A3E635';
        ctx.beginPath();
        ctx.arc(-barW / 2 + 4 + s * 7, barY - 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (isBoss && enemy.infectionStacks > 0) {
    for (let s = 0; s < enemy.infectionStacks; s++) {
      ctx.fillStyle = '#A3E635';
      ctx.beginPath();
      ctx.arc(-14 + s * 8, -64, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Stagger / Stun spinning stars above head
  if (enemy.stunTimer > 0) {
    const starY = isBoss ? -56 : -44;
    for (let i = 0; i < 3; i++) {
      const a = time * 8 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 11, starY + Math.sin(a) * 4, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Rooted stone-clasp ring around feet
  if (enemy.rootTimer > 0) {
    ctx.strokeStyle = '#FB923C';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, isBoss ? 22 : 12, isBoss ? 26 : 16, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, orb: PickupOrb, time: number): void {
  const bob = Math.sin(time * 5 + orb.bobOffset) * 3;
  ctx.save();
  ctx.translate(orb.x, orb.y + bob);

  if (orb.kind === 'ESSENCE_HEAL') {
    ctx.fillStyle = 'rgba(74, 222, 128, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4ADE80';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (orb.kind === 'SOUL_SHARD') {
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (orb.kind === 'GOLD_COIN') {
    ctx.fillStyle = '#FBBF24';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#A78BFA';
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSlashArc(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = 1 - slash.life / slash.maxLife;
  const alpha = Math.max(0, 1 - progress * progress);
  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = slash.color;
  ctx.lineWidth = 10 * (1 - progress * 0.5);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, slash.radius, -slash.arcSpread / 2, slash.arcSpread / 2);
  ctx.stroke();

  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 3.5 * (1 - progress * 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, slash.radius - 2, -slash.arcSpread * 0.35, slash.arcSpread * 0.35);
  ctx.stroke();

  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: ProjectileEntity, _time: number): void {
  ctx.save();
  ctx.translate(proj.x, proj.y);
  ctx.rotate(proj.angle);

  if (proj.kind === 'PLAYER_BONE_SPEAR') {
    // Cyan velocity wake
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();

    // Carved ivory bone spear shaft & barbed tip
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -2.5);
    ctx.lineTo(6, -2.5);
    ctx.lineTo(4, -6.5);
    ctx.lineTo(19, 0);
    ctx.lineTo(4, 6.5);
    ctx.lineTo(6, 2.5);
    ctx.lineTo(-18, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (proj.kind === 'PLAYER_DARK_WAVE') {
    // Reaper's Judgment crescent wave of dark energy
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-14, 0, 36, -0.88, 0.88);
    ctx.stroke();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-12, 0, 36, -0.72, 0.72);
    ctx.stroke();

    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-10, 0, 36, -0.5, 0.5);
    ctx.stroke();
  } else if (proj.kind === 'PLAYER_ENCHANTED_DAGGER') {
    // Enchanted emerald-gold throwing dagger
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();

    ctx.fillStyle = '#FDE68A';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-10, -2.5);
    ctx.lineTo(4, -3.5);
    ctx.lineTo(15, 0);
    ctx.lineTo(4, 3.5);
    ctx.lineTo(-10, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (proj.kind === 'BONE_ARROW') {
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();

    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();

    ctx.fillStyle = proj.fromPlayer ? '#38BDF8' : '#F87171';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(6, -4);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = proj.color;
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawWarmLightPools(
  ctx: CanvasRenderingContext2D,
  props: RoomProp[],
  player: RenderPlayerState,
  isGuild: boolean,
  time: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const isSkel = player.characterId === CharacterId.Skeleton;
  const isGob = player.characterId === CharacterId.Goblin;
  const isGnome = player.characterId === CharacterId.Gnome;
  const pGrad = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 95);
  pGrad.addColorStop(
    0,
    isSkel
      ? 'rgba(56, 189, 248, 0.08)'
      : isGob
      ? 'rgba(245, 158, 11, 0.08)'
      : isGnome
      ? 'rgba(251, 146, 60, 0.09)'
      : 'rgba(74, 222, 128, 0.07)'
  );
  pGrad.addColorStop(
    1,
    isSkel
      ? 'rgba(56, 189, 248, 0)'
      : isGob
      ? 'rgba(245, 158, 11, 0)'
      : isGnome
      ? 'rgba(251, 146, 60, 0)'
      : 'rgba(74, 222, 128, 0)'
  );
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 95, 0, Math.PI * 2);
  ctx.fill();

  for (const prop of props) {
    if (prop.kind === 'LANTERN_POST') {
      const r = 115 + Math.sin(time * 5 + prop.id) * 6;
      const g = ctx.createRadialGradient(prop.x, prop.y - 20, 4, prop.x, prop.y - 20, r);
      g.addColorStop(0, 'rgba(251, 191, 36, 0.16)');
      g.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(prop.x, prop.y - 20, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'HEARTH_FIRE') {
      const r = 210 + Math.sin(time * 7) * 10;
      const g = ctx.createRadialGradient(prop.x + 10, prop.y + 8, 8, prop.x + 10, prop.y + 8, r);
      g.addColorStop(0, 'rgba(249, 115, 22, 0.22)');
      g.addColorStop(0.5, 'rgba(251, 191, 36, 0.08)');
      g.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(prop.x + 10, prop.y + 8, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'PORTAL_ARCH') {
      const r = 140;
      const g = ctx.createRadialGradient(prop.x, prop.y, 8, prop.x, prop.y, r);
      g.addColorStop(0, isGuild ? 'rgba(52, 211, 153, 0.2)' : 'rgba(56, 189, 248, 0.2)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(prop.x, prop.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === 'GUILD_DOOR') {
      const r = 135;
      const g = ctx.createRadialGradient(prop.x, prop.y - 16, 8, prop.x, prop.y - 16, r);
      g.addColorStop(0, 'rgba(251, 191, 36, 0.16)');
      g.addColorStop(0.55, 'rgba(56, 189, 248, 0.1)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(prop.x, prop.y - 16, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
