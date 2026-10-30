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
  DeathsEmbraceEffect,
  DeathsPassageRift,
  GhostMistZone,
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
  comboFlip?: boolean;
  skelLungeOffset?: number;
  zombieLungeOffset?: number;
  goblinLungeOffset?: number;
  gnomeLungeOffset?: number;
  ghostLungeOffset?: number;
  restlessTimer?: number;
  soulDrainTimer?: number;
  possessionTimer?: number;
  nightmareTimer?: number;
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
  deathsPassageRifts?: DeathsPassageRift[];
  ghostMistZones?: GhostMistZone[];
  pickups: PickupOrb[];
  minions: MinionEntity[];
  enemies: EnemyEntity[];
  player: RenderPlayerState;
  guildCompanions: GuildCompanionRenderState[];
  projectiles: ProjectileEntity[];
  slashes: SlashEffect[];
  shockwaves: ShockwaveRing[];
  deathsEmbraceEffects?: DeathsEmbraceEffect[];
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
    deathsPassageRifts,
    ghostMistZones,
    pickups,
    minions,
    enemies,
    player,
    guildCompanions,
    projectiles,
    slashes,
    shockwaves,
    deathsEmbraceEffects,
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

  // 4. Ground-layer effects (Poison clouds, spectral mist, Death's Passage rifts, dagger rain, earthen grasps, traps, shockwaves)
  for (const cloud of poisonClouds) {
    drawPoisonCloud(ctx, cloud, time);
  }

  if (ghostMistZones) {
    for (const mist of ghostMistZones) {
      drawGhostMistZone(ctx, mist, time);
    }
  }

  if (deathsPassageRifts) {
    for (const rift of deathsPassageRifts) {
      drawDeathsPassageRift(ctx, rift, time);
    }
  }

  for (const zone of daggerRains) {
    drawDaggerRainGroundZone(ctx, zone, time);
  }

  for (const grasp of earthenGrasps) {
    drawEarthenGraspGround(ctx, grasp, time);
  }

  // Shimmering copper-bronze barrier beams linking adjacent Titan's Rampart monoliths
  if (stoneRamparts.length >= 2) {
    ctx.save();
    for (let i = 0; i < stoneRamparts.length; i++) {
      const a = stoneRamparts[i];
      const b = stoneRamparts[(i + 1) % stoneRamparts.length];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist < 175) {
        const fade = Math.min(1, Math.min(a.life, b.life) / 0.35);
        ctx.globalAlpha = fade * (0.42 + Math.sin(time * 9 + i) * 0.14);
        ctx.strokeStyle = '#FB923C';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -time * 36;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y - 6);
        ctx.lineTo(b.x, b.y - 6);
        ctx.stroke();
      }
    }
    ctx.restore();
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

  // 4b. Zombie's Death's Embrace 60-frame skill VFX
  if (deathsEmbraceEffects && deathsEmbraceEffects.length > 0) {
    for (const fx of deathsEmbraceEffects) {
      drawDeathsEmbraceVFX(ctx, fx, time);
    }
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

  // 7. Life-drain, soul-drain & possession tethers
  for (const tether of tethers) {
    const alpha = Math.max(0, tether.life / tether.maxLife);
    const destX = tether.toX ?? player.x;
    const destY = tether.toY ?? player.y - 10;
    ctx.save();
    ctx.globalAlpha = alpha * 0.88;
    ctx.strokeStyle = tether.color ?? '#4ADE80';
    ctx.lineWidth = tether.color ? 3.4 : 3;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -time * 48;
    ctx.beginPath();
    ctx.moveTo(tether.fromX, tether.fromY);
    ctx.quadraticCurveTo(
      (tether.fromX + destX) / 2,
      Math.min(tether.fromY, destY) - 34,
      destX,
      destY
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

  // 9. Particles (ambient orbs, rotating bone splinters, and slash velocity streaks)
  for (const pt of particles) {
    const alpha = pt.fade ? Math.max(0, pt.life / pt.maxLife) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (pt.kind === 'BONE_SHARD') {
      const l = (pt.len ?? 7) * (0.5 + alpha * 0.5);
      const w = pt.thick ?? 2.4;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? 0);
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-l, 0);
      ctx.lineTo(0, -w);
      ctx.lineTo(l, 0);
      ctx.lineTo(0, w);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (pt.kind === 'SLASH_STREAK') {
      const l = pt.len ?? 14;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = (pt.thick ?? 1.8) * alpha;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-l, 0);
      ctx.lineTo(l * 0.5, 0);
      ctx.stroke();
    } else if (pt.kind === 'VENOM_DROP') {
      const l = (pt.len ?? 6.5) * (0.45 + alpha * 0.55);
      const w = (pt.thick ?? 2.8) * (0.5 + alpha * 0.5);
      const ang = Math.hypot(pt.vx, pt.vy) > 4 ? Math.atan2(pt.vy, pt.vx) : pt.rot ?? 0;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(ang);
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.3;
      // Teardrop virulent slime globule
      ctx.beginPath();
      ctx.moveTo(-l * 1.15, 0);
      ctx.quadraticCurveTo(l * 0.15, -w, l * 0.75, 0);
      ctx.quadraticCurveTo(l * 0.15, w, -l * 1.15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Specular slime sheen dot
      ctx.fillStyle = '#ECFCCB';
      ctx.beginPath();
      ctx.arc(l * 0.22, -w * 0.24, Math.max(0.8, w * 0.28), 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'SPORE_PUFF') {
      const progress = 1 - pt.life / pt.maxLife;
      const puffR = pt.size * (0.55 + progress * 0.75);
      ctx.globalAlpha = alpha * 0.72;
      ctx.fillStyle = '#14291D';
      ctx.strokeStyle = 'rgba(18, 15, 23, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, puffR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.65;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x - puffR * 0.12, pt.y - puffR * 0.12, puffR * 0.72, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'SHADOW_PUFF') {
      const progress = 1 - pt.life / pt.maxLife;
      const puffR = Math.max(1.5, pt.size * (0.55 + progress * 0.85));
      ctx.globalAlpha = alpha * 0.78;
      ctx.fillStyle = '#120F17';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, puffR + 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x - puffR * 0.1, pt.y - puffR * 0.1, puffR * 0.82, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'WIND_CHEVRON') {
      const w = (pt.len ?? 10) * (0.65 + (1 - alpha) * 0.45);
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = Math.max(1, (pt.thick ?? 2) * alpha);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, -w * 0.65);
      ctx.quadraticCurveTo(w * 0.35, 0, -w * 0.55, w * 0.65);
      ctx.stroke();
    } else if (pt.kind === 'GOLD_COIN_SPARK') {
      const spinScaleX = Math.max(0.24, Math.abs(Math.cos(pt.rot ?? 0)));
      const r = Math.max(2, pt.size);
      ctx.translate(pt.x, pt.y);
      ctx.scale(spinScaleX, 1);
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FEF9C3';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.25, r * 0.36, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'BRASS_SHRAPNEL') {
      const l = (pt.len ?? 7) * (0.5 + alpha * 0.5);
      const w = pt.thick ?? 2.6;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? 0);
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-l * 0.8, -w * 0.5);
      ctx.lineTo(l, 0);
      ctx.lineTo(-l * 0.4, w);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (pt.kind === 'STONE_CHUNK') {
      const r = Math.max(2.2, pt.size * (0.55 + alpha * 0.45));
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? 0);
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.55);
      ctx.lineTo(r * 0.25, -r * 0.95);
      ctx.lineTo(r * 1.05, r * 0.15);
      ctx.lineTo(r * 0.3, r * 0.88);
      ctx.lineTo(-r * 0.85, r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (pt.kind === 'RUNE_SPARK') {
      const s = Math.max(2, (pt.len ?? 6) * alpha);
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(0, -s * 0.42);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s * 0.42);
      ctx.closePath();
      ctx.fill();
    } else if (pt.kind === 'MAGNETIC_ARC') {
      const l = (pt.len ?? 9) * (0.55 + alpha * 0.45);
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = Math.max(1.2, (pt.thick ?? 2) * alpha);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-l * 0.6, -2);
      ctx.lineTo(-l * 0.15, 2.5);
      ctx.lineTo(l * 0.25, -2.5);
      ctx.lineTo(l * 0.65, 1.5);
      ctx.stroke();
    } else if (pt.kind === 'NECRO_CROSS') {
      const s = Math.max(2.4, (pt.len ?? 6.5) * (0.65 + alpha * 0.35));
      const arm = s * 0.36;
      ctx.translate(pt.x, pt.y);
      ctx.rotate((pt.rot ?? 0) * 0.25);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.rect(-arm, -s, arm * 2, s * 2);
      ctx.rect(-s, -arm, s * 2, arm * 2);
      ctx.fill();
      ctx.fillStyle = '#ECFCCB';
      ctx.beginPath();
      ctx.rect(-arm * 0.5, -s * 0.65, arm, s * 1.3);
      ctx.rect(-s * 0.65, -arm * 0.5, s * 1.3, arm);
      ctx.fill();
    } else if (pt.kind === 'SOUL_WISP') {
      const l = Math.max(3, (pt.len ?? 8) * (0.55 + alpha * 0.45));
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? -Math.PI * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(l, 0);
      ctx.quadraticCurveTo(0, -l * 0.48, -l * 0.9, 0);
      ctx.quadraticCurveTo(0, l * 0.48, l, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(l * 0.22, 0, Math.max(1, l * 0.22), 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'ECTO_SPARK') {
      const s = Math.max(2.2, pt.size * (0.55 + alpha * 0.45));
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot ?? 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(-s * 1.4, 0);
      ctx.lineTo(0, -s * 0.52);
      ctx.lineTo(s * 1.4, 0);
      ctx.lineTo(0, s * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.8, s * 0.28), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // Eternal Nightmare realm-of-darkness supernatural shroud
  if ((player.nightmareTimer ?? 0) > 0) {
    const nmAlpha = Math.min(1, (player.nightmareTimer ?? 0) / 0.6);
    const pulse = 0.88 + Math.sin(time * 5.2) * 0.12;
    const nmVig = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.22,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72
    );
    nmVig.addColorStop(0, 'rgba(30, 10, 56, 0.06)');
    nmVig.addColorStop(0.65, `rgba(46, 16, 101, ${0.34 * nmAlpha * pulse})`);
    nmVig.addColorStop(1, `rgba(12, 6, 26, ${0.72 * nmAlpha})`);
    ctx.fillStyle = nmVig;
    ctx.fillRect(0, 0, width, height);
  }

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
  if (charId === CharacterId.Ghost) {
    return { pick: 'Tap Ghost · Skills', roam: 'Tap Ghost', color: '#C084FC' };
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

  // Cozy twilight-amethyst & moon-cyan spirit circle where the Ghost hovers
  ctx.save();
  ctx.fillStyle = '#241838';
  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, 42, -184, 128, 78, 8);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(103, 232, 249, 0.22)';
  ctx.lineWidth = 1.4;
  drawRoundedRect(ctx, 52, -174, 108, 58, 4);
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
  const fade = Math.min(1, cloud.life / 0.85) * 0.46;
  const rMax = Math.max(14, cloud.radius);
  ctx.save();

  const grad = ctx.createRadialGradient(cloud.x, cloud.y, Math.max(2, rMax * 0.12), cloud.x, cloud.y, rMax);
  grad.addColorStop(0, `rgba(163, 230, 53, ${fade * 1.05})`);
  grad.addColorStop(0.55, `rgba(74, 222, 128, ${fade * 0.72})`);
  grad.addColorStop(0.85, `rgba(22, 163, 74, ${fade * 0.35})`);
  grad.addColorStop(1, 'rgba(22, 163, 74, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, rMax, 0, Math.PI * 2);
  ctx.fill();

  // Swirling 60fps bio-miasma vortex ribbons
  ctx.save();
  ctx.translate(cloud.x, cloud.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(190, 242, 100, ${fade * 0.75})`;
  ctx.lineCap = 'round';
  for (let s = 0; s < 3; s++) {
    const baseA = time * (1.6 + s * 0.25) + (s * Math.PI * 2) / 3;
    const bandR = Math.max(6, rMax * (0.36 + s * 0.2));
    ctx.lineWidth = 2.4 - s * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, bandR, baseA, baseA + 1.35);
    ctx.stroke();
  }
  ctx.restore();

  // Bubbling plague pustules with crisp specular glints
  for (let i = 0; i < 6; i++) {
    const cycle = (time * 0.85 + i * 0.31) % 1;
    const ang = time * 0.9 + i * 1.047;
    const dist = rMax * (0.2 + (i % 3) * 0.24);
    const bx = cloud.x + Math.cos(ang) * dist;
    const by = cloud.y + Math.sin(ang) * dist * 0.78 - cycle * 8;
    const br = Math.max(1.5, (3.2 + (i % 3) * 1.8) * Math.sin(cycle * Math.PI));

    ctx.fillStyle = `rgba(132, 204, 22, ${fade * 0.85})`;
    ctx.strokeStyle = `rgba(236, 252, 203, ${fade * 1.25})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
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
    const pulse = 0.24 + Math.sin(time * 8 + trap.id) * 0.1;
    ctx.strokeStyle = `rgba(251, 146, 60, ${pulse})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -time * 24;
    ctx.beginPath();
    ctx.arc(0, 0, trap.triggerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Subtle sweeping proximity sonar ring
    const sweepP = (time * 1.35 + trap.id * 0.31) % 1;
    ctx.strokeStyle = `rgba(253, 224, 71, ${(1 - sweepP) * 0.32})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(4, trap.triggerRadius * sweepP), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Brass gear teeth rim (rotates smoothly at 60fps when armed)
  ctx.save();
  ctx.rotate(armed ? time * 2.2 + trap.id : trap.id);
  ctx.fillStyle = armed ? '#B45309' : '#475569';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(8, -2.2, 4.5, 4.4);
    ctx.strokeRect(8, -2.2, 4.5, 4.4);
    ctx.restore();
  }
  ctx.restore();

  // Brass & iron rune mine body
  ctx.fillStyle = '#292524';
  ctx.strokeStyle = armed ? '#FB923C' : '#94A3B8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Blinking amber core rune + sizzling fuse spark
  const coreHot = armed && Math.sin(time * 16 + trap.id) > -0.2;
  ctx.fillStyle = armed ? (coreHot ? '#FDE047' : '#F97316') : '#64748B';
  ctx.beginPath();
  ctx.arc(0, 0, 4.6, 0, Math.PI * 2);
  ctx.fill();

  if (armed) {
    const sparkAng = time * 11 + trap.id;
    ctx.fillStyle = '#FEF9C3';
    ctx.beginPath();
    ctx.arc(Math.cos(sparkAng) * 6.5, Math.sin(sparkAng) * 6.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

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
  const grad = ctx.createRadialGradient(zone.x, zone.y, 14, zone.x, zone.y, Math.max(18, zone.radius));
  grad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
  grad.addColorStop(0.62, 'rgba(52, 211, 153, 0.15)');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
  ctx.fill();

  // Outer rotating assassin reticle ring
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([12, 7]);
  ctx.lineDashOffset = -time * 52;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner counter-rotating emerald sigil ring
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.48)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([8, 9]);
  ctx.lineDashOffset = time * 40;
  ctx.beginPath();
  ctx.arc(zone.x, zone.y, zone.radius * 0.58, 0, Math.PI * 2);
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
  const bladeCount = 12;
  for (let i = 0; i < bladeCount; i++) {
    const phase = (time * 4.4 + i * 0.29) % 1;
    const angle = i * 2.39996 + zone.id;
    const r = zone.radius * (0.14 + ((i * 0.27) % 0.78));
    const impactX = zone.x + Math.cos(angle) * r;
    const impactY = zone.y + Math.sin(angle) * r;
    const isGold = i % 2 === 0;

    if (phase < 0.82) {
      const fallT = phase / 0.82;
      const skyOffset = (1 - fallT) * 165;
      const curX = impactX - skyOffset * 0.18;
      const curY = impactY - skyOffset;
      const fallAngle = Math.atan2(1, 0.18);

      // Luminous sky-streak tail
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = isGold ? '#FDE047' : '#34D399';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(curX - 5.5, curY - 30);
      ctx.lineTo(curX, curY);
      ctx.stroke();
      ctx.restore();

      // Crisp falling enchanted dagger silhouette
      ctx.save();
      ctx.translate(curX, curY);
      ctx.rotate(fallAngle);
      ctx.fillStyle = isGold ? '#FEF08A' : '#A7F3D0';
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -2.2);
      ctx.lineTo(2, -3.2);
      ctx.lineTo(11, 0);
      ctx.lineTo(2, 3.2);
      ctx.lineTo(-10, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      // Sub-frame ground impact pin & expanding spark ring
      const impT = (phase - 0.82) / 0.18;
      const ringR = Math.max(2, 4 + impT * 18);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * (1 - impT);
      ctx.strokeStyle = isGold ? '#FDE047' : '#34D399';
      ctx.lineWidth = 2.2 * (1 - impT);
      ctx.beginPath();
      ctx.ellipse(impactX, impactY, ringR, ringR * 0.56, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Glinting cross spark at impact point
      const s = (1 - impT) * 7;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(impactX - s, impactY);
      ctx.lineTo(impactX, impactY - s * 0.35);
      ctx.lineTo(impactX + s, impactY);
      ctx.lineTo(impactX, impactY + s * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawEarthenGraspGround(
  ctx: CanvasRenderingContext2D,
  grasp: EarthenGraspZone,
  time: number
): void {
  const emerge = Math.min(1, (grasp.maxLife - grasp.life) / 0.18);
  const emergeEase = 1 - Math.pow(1 - emerge, 3);
  const alpha = Math.min(1, grasp.life / 0.35);
  ctx.save();
  ctx.translate(grasp.x, grasp.y);
  ctx.globalAlpha = alpha;

  // Cracked earthen magma-rune circle
  ctx.fillStyle = 'rgba(120, 53, 15, 0.38)';
  ctx.strokeStyle = '#FB923C';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 6, grasp.radius, grasp.radius * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glowing radial magma faultlines inside grasp
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
  ctx.lineWidth = 1.6;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + grasp.id;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(Math.cos(a) * grasp.radius * 0.82, 6 + Math.sin(a) * grasp.radius * 0.46);
    ctx.stroke();
  }
  ctx.restore();

  // Articulated carved granite gauntlets rising & squeezing inward at 60fps
  const squeeze = (1 - emergeEase) * -8 + Math.sin(time * 9 + grasp.id) * 2.4;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * (13 - squeeze), 6 + (1 - emergeEase) * 14);
    ctx.scale(side, Math.max(0.25, emergeEase));
    ctx.fillStyle = '#78716C';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 2;

    // Palm slab
    drawRoundedRect(ctx, -5, -15, 11, 18, 3.5);
    ctx.fill();
    ctx.stroke();

    // 3 clenching stone fingers curving inward toward target
    for (let f = 0; f < 3; f++) {
      ctx.beginPath();
      ctx.roundRect(-8, -14 + f * 5.2, 6, 4.2, 1.8);
      ctx.fill();
      ctx.stroke();
    }

    // Glowing copper knuckle rune
    ctx.fillStyle = '#FB923C';
    ctx.fillRect(-1, -10, 4.5, 4.5);
    ctx.restore();
  }

  ctx.restore();
}

function drawStoneRampart(
  ctx: CanvasRenderingContext2D,
  wall: StoneRampartEntity,
  time: number
): void {
  const riseRaw = Math.min(1, (wall.maxLife - wall.life) / 0.22);
  const rise = 1 - Math.pow(1 - riseRaw, 3);
  const fade = Math.min(1, wall.life / 0.35);
  ctx.save();
  ctx.translate(wall.x, wall.y);
  ctx.globalAlpha = fade;

  // Basal earthen rubble ring (stays grounded while monolith rises)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 14, wall.radius * 1.18, wall.radius * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, (1 - rise) * 22);
  ctx.scale(1, Math.max(0.25, rise));

  // Massive granite bastion monolith
  ctx.fillStyle = '#57534E';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.6;
  drawRoundedRect(ctx, -20, -28, 40, 42, 6);
  ctx.fill();
  ctx.stroke();

  // Beveled stone highlight & bronze trim band
  ctx.fillStyle = '#B45309';
  ctx.fillRect(-19, -4, 38, 4);

  // Bronze battlements cap
  ctx.fillStyle = '#78716C';
  drawRoundedRect(ctx, -23, -34, 46, 12, 4);
  ctx.fill();
  ctx.stroke();

  // Glowing copper rune core
  const glow = 0.75 + Math.sin(time * 6 + wall.id) * 0.25;
  ctx.fillStyle = `rgba(251, 146, 60, ${glow})`;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(6.5, -9);
  ctx.lineTo(0, 0);
  ctx.lineTo(-6.5, -9);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function drawGhostMistZone(
  ctx: CanvasRenderingContext2D,
  mist: GhostMistZone,
  time: number
): void {
  const alpha = Math.min(1, mist.life / 0.45);
  ctx.save();
  ctx.translate(mist.x, mist.y);
  ctx.globalAlpha = alpha * 0.78;
  ctx.globalCompositeOperation = 'lighter';

  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, mist.radius);
  grad.addColorStop(0, 'rgba(103, 232, 249, 0.34)');
  grad.addColorStop(0.55, 'rgba(192, 132, 252, 0.22)');
  grad.addColorStop(1, 'rgba(88, 28, 135, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 4, mist.radius, mist.radius * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(167, 139, 250, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const a0 = time * 3.6 + mist.id;
  ctx.ellipse(0, 4, mist.radius * 0.72, mist.radius * 0.42, 0, a0, a0 + Math.PI * 1.15);
  ctx.stroke();
  ctx.restore();
}

function drawDeathsPassageRift(
  ctx: CanvasRenderingContext2D,
  rift: DeathsPassageRift,
  time: number
): void {
  const progress = 1 - rift.life / rift.maxLife;
  const fade = Math.min(1, rift.life / 0.35);
  ctx.save();
  ctx.translate(rift.x, rift.y);
  ctx.globalAlpha = fade;

  // Abyssal singularity floor void
  const voidGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, rift.radius);
  voidGrad.addColorStop(0, 'rgba(12, 4, 28, 0.92)');
  voidGrad.addColorStop(0.45, 'rgba(88, 28, 135, 0.55)');
  voidGrad.addColorStop(0.82, 'rgba(168, 85, 247, 0.25)');
  voidGrad.addColorStop(1, 'rgba(103, 232, 249, 0)');
  ctx.fillStyle = voidGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rift.radius, 0, Math.PI * 2);
  ctx.fill();

  // Spiraling inward spectral vortex arms (60fps)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const armCount = 6;
  for (let i = 0; i < armCount; i++) {
    const baseA = (i / armCount) * Math.PI * 2 - time * 5.4;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(103, 232, 249, 0.68)' : 'rgba(216, 180, 254, 0.68)';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const r = rift.radius * (1 - t * 0.88);
      const a = baseA + t * 2.1;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Outer runic containment ring tightening toward detonation
  const tighten = rift.detonated ? 1.05 : 1 - progress * 0.14;
  ctx.strokeStyle = '#E879F9';
  ctx.lineWidth = 2.4;
  ctx.setLineDash([12, 8]);
  ctx.lineDashOffset = time * 64;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(12, rift.radius * tighten), 0, Math.PI * 2);
  ctx.stroke();

  // Pulsing unstable white-cyan rift core
  const coreR = 14 + Math.sin(time * 22) * 3.5 + progress * 10;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(0, 0, coreR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#67E8F9';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawGoblinAfterimage(ctx: CanvasRenderingContext2D, ghost: AfterimageEntity): void {
  const ratio = Math.max(0, ghost.life / ghost.maxLife);
  const alpha = ratio * 0.66;
  ctx.save();
  ctx.translate(ghost.x, ghost.y);
  ctx.scale(ghost.facingX * (0.94 + (1 - ratio) * 0.08), 0.96);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ghost.color;

  if (ghost.archetype === 'GHOST') {
    // Flowing hooded spectral wraith mirage silhouette
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(15, -22, 13, -2);
    ctx.lineTo(16, 14);
    ctx.lineTo(5, 8);
    ctx.lineTo(-2, 16);
    ctx.lineTo(-10, 9);
    ctx.lineTo(-18, 14);
    ctx.quadraticCurveTo(-15, -18, 0, -26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#67E8F9';
    ctx.beginPath();
    ctx.arc(-2, -13, 2.4, 0, Math.PI * 2);
    ctx.arc(5.5, -13, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (ghost.archetype === 'SKELETON') {
    // Indigo duelist cloak + skull + lunging bone katana mirage
    drawRoundedRect(ctx, -11, -3, 22, 17, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -15, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(28, -11);
    ctx.stroke();
  } else if (ghost.archetype === 'ZOMBIE') {
    // Feral hunched undead torso + stitched head + triple claw streak mirage
    drawRoundedRect(ctx, -12, -4, 24, 18, 6);
    ctx.fill();
    drawRoundedRect(ctx, -14, -24, 28, 20, 8);
    ctx.fill();
    ctx.strokeStyle = '#ECFCCB';
    ctx.lineWidth = 2.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.lineTo(25, -7);
    ctx.moveTo(13, 2);
    ctx.lineTo(27, 1);
    ctx.moveTo(12, 6);
    ctx.lineTo(24, 9);
    ctx.stroke();
  } else {
    // Rogue hood + pointed ears + twin dagger mirage silhouette
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

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(11, 2);
    ctx.lineTo(22, -9);
    ctx.moveTo(-10, 4);
    ctx.lineTo(-19, 13);
    ctx.stroke();
  }

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
          : activeCharId === CharacterId.Ghost
          ? '#C084FC'
          : '#4ADE80';
      const shrineAuraColor =
        activeCharId === CharacterId.Skeleton
          ? 'rgba(56, 189, 248, 0.58)'
          : activeCharId === CharacterId.Goblin
          ? 'rgba(245, 158, 11, 0.58)'
          : activeCharId === CharacterId.Gnome
          ? 'rgba(251, 146, 60, 0.58)'
          : activeCharId === CharacterId.Ghost
          ? 'rgba(192, 132, 252, 0.6)'
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
  } else if (player.characterId === CharacterId.Ghost) {
    drawGhostPlayer(ctx, player, phase, time, isControlled);
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

  const zLunge = player.zombieLungeOffset ?? 0;
  const lungeX = zLunge > 0.05 ? Math.cos(player.aimAngle) * zLunge : 0;
  const lungeY = zLunge > 0.05 ? Math.sin(player.aimAngle) * zLunge : 0;

  ctx.save();
  ctx.translate(player.x + lungeX, player.y + lungeY);

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

  if (isAbom) {
    ctx.save();
    const pulse = 0.88 + Math.sin(time * 7.5) * 0.12;
    const abomR = 38 * pulse;
    const abomGrad = ctx.createRadialGradient(0, 10, 6, 0, 10, abomR);
    abomGrad.addColorStop(0, 'rgba(163, 230, 53, 0.36)');
    abomGrad.addColorStop(0.65, 'rgba(126, 34, 206, 0.22)');
    abomGrad.addColorStop(1, 'rgba(74, 222, 128, 0)');
    ctx.fillStyle = abomGrad;
    ctx.beginPath();
    ctx.ellipse(0, 12, abomR, abomR * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(163, 230, 53, 0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -time * 28;
    ctx.beginPath();
    ctx.ellipse(0, 12, abomR * 0.9, abomR * 0.48, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (player.undyingTimer > 0) {
    ctx.save();
    const wardR = 31 * baseScale;
    ctx.fillStyle = 'rgba(45, 212, 191, 0.13)';
    ctx.beginPath();
    ctx.arc(0, -4, wardR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.82)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a0 = time * 2.8 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, -4, wardR, a0, a0 + 1.25);
      ctx.stroke();
    }

    for (let i = 0; i < 4; i++) {
      const a = -time * 3.2 + (i * Math.PI * 2) / 4;
      const cx = Math.cos(a) * wardR;
      const cy = -4 + Math.sin(a) * wardR;
      ctx.fillStyle = i % 2 === 0 ? '#5EEAD4' : '#BEF264';
      ctx.beginPath();
      ctx.rect(cx - 1.5, cy - 4.5, 3, 9);
      ctx.rect(cx - 4.5, cy - 1.5, 9, 3);
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

  // Bandaged claw hands with animated feral swipe & virulent talon tips
  const clawReachX = zLunge > 0.4 ? 18 : 14;
  const clawReachY = zLunge > 0.4 ? (player.comboFlip ? -3.5 : 6.5) : 4;
  ctx.save();
  ctx.translate(clawReachX, clawReachY);
  ctx.rotate(zLunge > 0.4 ? (player.comboFlip ? -0.45 : 0.45) : 0.1);
  ctx.fillStyle = flash ? '#FFFFFF' : '#D6CFC2';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Three sharp decaying green-ivory talons
    ctx.strokeStyle = isAbom ? '#A3E635' : '#86EFAC';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (let c = -1; c <= 1; c++) {
      ctx.beginPath();
      ctx.moveTo(3.5, c * 2.6);
      ctx.lineTo(8.5 + (c === 0 ? 1.5 : 0), c * 3.4);
      ctx.stroke();
    }
  }
  ctx.restore();

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

  const lunge = player.skelLungeOffset ?? 0;
  const lungeX = lunge > 0.05 ? Math.cos(player.aimAngle) * lunge : 0;
  const lungeY = lunge > 0.05 ? Math.sin(player.aimAngle) * lunge : 0;

  ctx.save();
  ctx.translate(player.x + lungeX, player.y + lungeY);

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

  if (isColossus) {
    ctx.save();
    const colPulse = 0.9 + Math.sin(time * 6.5) * 0.1;
    const colR = 40 * colPulse;
    ctx.globalCompositeOperation = 'lighter';
    const colGrad = ctx.createRadialGradient(0, 12, 6, 0, 12, colR);
    colGrad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
    colGrad.addColorStop(0.65, 'rgba(129, 140, 248, 0.22)');
    colGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = colGrad;
    ctx.beginPath();
    ctx.ellipse(0, 13, colR, colR * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting ossuary bone monolith shards
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) {
      const a = time * 2.6 + (i * Math.PI) / 2;
      const ox = Math.cos(a) * 34;
      const oy = 6 + Math.sin(a) * 16;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(Math.sin(time * 4 + i) * 0.25);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(3.5, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-3.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Bone Storm 60fps dual counter-spinning razor-bone vortex
  if (player.boneStormTimer > 0) {
    ctx.save();
    const stormR = 68;
    ctx.globalCompositeOperation = 'lighter';
    for (let w = 0; w < 4; w++) {
      const wa = time * 10.5 + (w * Math.PI) / 2;
      ctx.strokeStyle = w % 2 === 0 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(165, 180, 252, 0.48)';
      ctx.lineWidth = w % 2 === 0 ? 4 : 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, stormR - (w % 2) * 12, wa, wa + 1.05);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 8; i++) {
      const inner = i % 2 === 1;
      const ringR = inner ? stormR * 0.72 : stormR;
      const ang = (inner ? -time * 7.2 : time * 9.6) + (i * Math.PI * 2) / 8;
      const sx = Math.cos(ang) * ringR;
      const sy = Math.sin(ang) * ringR;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = inner ? '#818CF8' : '#38BDF8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.quadraticCurveTo(0, -5.5, 10, 0);
      ctx.quadraticCurveTo(0, 2.5, -10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Ribcage Shield orbiting articulated curved bone ribs
  if (player.ribcageTimer > 0 && player.ribcageCharges > 0) {
    ctx.save();
    const shieldR = 32 * baseScale;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
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
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 7, 10, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();

      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(0, 7, 10, -Math.PI * 0.8, -Math.PI * 0.2);
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

  // Gleaming Carved Bone Katana / Colossus Bone Greatsword (reacts to combo swing side)
  ctx.save();
  const swingTilt = lunge > 0.4 ? (player.comboFlip ? 1.05 : -1.15) : -0.35;
  ctx.translate(12, player.comboFlip && lunge > 0.4 ? -3 : 2);
  ctx.rotate(swingTilt);
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
  const lunge = player.goblinLungeOffset ?? 0;
  const lungeT = Math.min(1, lunge / 7.5);
  const lungeX = Math.cos(player.aimAngle) * lunge;
  const lungeY = Math.sin(player.aimAngle) * lunge * 0.65;

  ctx.save();
  ctx.translate(player.x + lungeX, player.y + lungeY);

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

  // Windrunner 60fps dual-orbit swift gale ribbons
  if (isWindrunner) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let ring = 0; ring < 2; ring++) {
      const a0 = time * (ring === 0 ? 11 : -8.5) + ring * Math.PI;
      ctx.strokeStyle = ring === 0 ? 'rgba(253, 224, 71, 0.72)' : 'rgba(56, 189, 248, 0.48)';
      ctx.lineWidth = ring === 0 ? 2.4 : 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, 5 - ring * 5, 31 - ring * 4, 15 - ring * 2, 0, a0, a0 + Math.PI * 1.15);
      ctx.stroke();
    }
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

  // Twin Curved Assassin Daggers (glowing bright venom green when Poisoned Blades active + dynamic slash pose!)
  const bladeFill = flash ? '#FFFFFF' : isVenom ? '#A3E635' : '#F8FAFC';
  const bladeEdge = isVenom ? '#4ADE80' : '#FBBF24';
  const offHandSwing = player.comboFlip ? lungeT * 1.45 : -lungeT * 0.25;
  const mainHandSwing = !player.comboFlip ? lungeT * 1.35 : lungeT * 0.35;

  // Off-hand reverse-grip dagger
  ctx.save();
  ctx.translate(-12 + (player.comboFlip ? lungeT * 12 : 0), 3);
  ctx.rotate(0.45 - offHandSwing);
  if (isVenom && !flash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(163, 230, 53, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
  ctx.translate(13 + (!player.comboFlip ? lungeT * 7 : 0), 3);
  ctx.rotate(-0.35 + mainHandSwing);
  if (isVenom && !flash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(163, 230, 53, 0.44)';
    ctx.beginPath();
    ctx.ellipse(0.5, -8, 5.5, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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

  // King of Thieves stolen-strength golden crown emblem + radiant halo above hood
  if (isStolenMight) {
    ctx.save();
    const bobCrown = Math.sin(time * 6.5) * 1.8;
    ctx.translate(0, bobCrown);
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
    player.leapAirProgress > 0 ? Math.sin(player.leapAirProgress * Math.PI) * 36 : 0;
  const lunge = player.gnomeLungeOffset ?? 0;
  const lungeT = Math.min(1, lunge / 8.5);
  const lungeX = Math.cos(player.aimAngle) * lunge;
  const lungeY = Math.sin(player.aimAngle) * lunge * 0.65;

  ctx.save();
  ctx.translate(player.x + lungeX, player.y + lungeY);

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
    ctx.strokeStyle = `rgba(251, 146, 60, ${0.28 + player.resolveRatio * 0.58})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 11, 25, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Magnetic Guard 60fps counter-spinning lodestone polarity coils + orbiting nodes
  if (isMagnetic) {
    ctx.save();
    const magR = isMountain ? 58 : 44;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([12, 7]);
    ctx.lineDashOffset = -time * 64;
    ctx.beginPath();
    ctx.arc(0, -4, magR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(251, 146, 60, 0.75)';
    ctx.lineDashOffset = time * 64;
    ctx.beginPath();
    ctx.arc(0, -4, magR - 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let pole = 0; pole < 2; pole++) {
      const pa = time * 5.2 + pole * Math.PI;
      ctx.fillStyle = pole === 0 ? '#38BDF8' : '#FB923C';
      ctx.beginPath();
      ctx.arc(Math.cos(pa) * magR, -4 + Math.sin(pa) * magR, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Fortress Stance 60fps hexagonal bronze bastion + orbiting forged tower shields
  if (isFortress) {
    ctx.save();
    const guardR = isMountain ? 48 : 34;
    ctx.fillStyle = 'rgba(251, 146, 60, 0.14)';
    ctx.strokeStyle = 'rgba(253, 186, 116, 0.82)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let h = 0; h < 6; h++) {
      const ha = time * 1.4 + (h / 6) * Math.PI * 2;
      const hx = Math.cos(ha) * guardR;
      const hy = -3 + Math.sin(ha) * guardR;
      if (h === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const a = time * 3.1 + (i * Math.PI) / 2;
      ctx.save();
      ctx.translate(Math.cos(a) * guardR, -3 + Math.sin(a) * guardR);
      ctx.rotate(a);
      ctx.fillStyle = '#78716C';
      ctx.strokeStyle = '#FB923C';
      ctx.lineWidth = 1.6;
      drawRoundedRect(ctx, -4.5, -7.5, 9, 15, 2.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(-1.5, -2, 3, 4);
      ctx.restore();
    }
    ctx.restore();
  }

  // Mountain's Heart orbiting levitating granite shards
  if (isMountain) {
    ctx.save();
    for (let s = 0; s < 3; s++) {
      const sa = time * 2.8 + (s * Math.PI * 2) / 3;
      const sx = Math.cos(sa) * 40;
      const sy = -8 + Math.sin(sa) * 20;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(sa);
      ctx.fillStyle = '#78716C';
      ctx.strokeStyle = '#FB923C';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(0, -4);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Ground shadow + Groundbreaker landing reticle while airborne
  const shadowScale = Math.max(0.4, (isMountain ? 1.48 : 1.0) * (1 - leapLift * 0.008));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  ctx.beginPath();
  ctx.ellipse(0, 14 * (isMountain ? 1.4 : 1), 18 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.leapAirProgress > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.78)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 14, 26, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(0, -leapLift);
  ctx.scale(player.facingX * scaleX, scaleY);
  ctx.translate(0, -bob);

  const flash = player.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.4;

  // Off-hand rear Runestone Iron Gauntlet (alternates punch thrust on comboFlip!)
  const offPunch = player.comboFlip ? lungeT * 12 : -lungeT * 2;
  ctx.save();
  ctx.translate(-10 + offPunch, -1);
  ctx.fillStyle = flash ? '#FFFFFF' : isMountain ? '#57534E' : '#475569';
  drawRoundedRect(ctx, -6, -5, 11, 10, 3.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

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

  // Lead Oversized Reinforced Runestone Iron Gauntlet (thrusts forward on punch!)
  const mainPunch = !player.comboFlip ? lungeT * 10 : lungeT * 3;
  ctx.save();
  ctx.translate(10 + mainPunch, -2);
  ctx.fillStyle = flash ? '#FFFFFF' : isMountain ? '#57534E' : '#64748B';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.2;
  drawRoundedRect(ctx, 0, 0, 14, 12.5, 4);
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    ctx.fillStyle = lungeT > 0.25 ? '#FDE047' : '#FB923C';
    ctx.fillRect(4.5, 3, 5.5, 5.5);
  }
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

function drawGhostPlayer(
  ctx: CanvasRenderingContext2D,
  player: RenderPlayerState,
  phase: GamePhase,
  time: number,
  isControlled: boolean
): void {
  // While possessing an enemy host, render an eerie spectral crown/halo on the host instead of a solid body
  if ((player.possessionTimer ?? 0) > 0) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(232, 121, 249, 0.85)';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -time * 42;
    ctx.beginPath();
    ctx.ellipse(0, 12, 26, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const isRestless = (player.restlessTimer ?? 0) > 0;
  const isDrain = (player.soulDrainTimer ?? 0) > 0;
  const isNightmare = (player.nightmareTimer ?? 0) > 0;
  const floatY = Math.sin(time * 4.2) * 3.8;
  const lunge = player.ghostLungeOffset ?? 0;
  const lungeX = lunge > 0.05 ? Math.cos(player.aimAngle) * lunge : 0;
  const lungeY = lunge > 0.05 ? Math.sin(player.aimAngle) * lunge * 0.7 : 0;

  ctx.save();
  ctx.translate(player.x + lungeX, player.y + lungeY);

  // Selection highlight ring in Guild
  if (phase === GamePhase.GuildPicking || player.hoveredInGuild) {
    ctx.save();
    ctx.strokeStyle = isControlled ? '#C084FC' : 'rgba(192, 132, 252, 0.65)';
    ctx.lineWidth = isControlled ? 2.6 : 2;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -time * 22;
    ctx.beginPath();
    ctx.ellipse(0, 14, 28, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Restless Spirit 60fps swirling cyan-violet orbit ribbons
  if (isRestless || isNightmare) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < 2; r++) {
      const a0 = time * (r === 0 ? 10.5 : -8.2) + r * Math.PI;
      ctx.strokeStyle =
        r === 0 ? 'rgba(103, 232, 249, 0.72)' : 'rgba(192, 132, 252, 0.62)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, 4 - r * 6, 30 - r * 4, 14 - r * 2, 0, a0, a0 + Math.PI * 1.15);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Soul Drain emerald-cyan siphon ward
  if (isDrain) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -time * 38;
    ctx.beginPath();
    ctx.arc(0, -4, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Soft translucent ectoplasmic floor glow instead of a heavy physical shadow
  ctx.fillStyle = 'rgba(139, 92, 246, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 15, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(player.facingX * player.squashX, player.squashY);
  ctx.translate(0, -floatY - 2);
  ctx.globalAlpha = player.dashTimer > 0 ? 0.58 : 0.9;

  const flash = player.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2.3;

  // Flowing tattered wraith cloak & wispy ectoplasm tail
  const tailWave1 = Math.sin(time * 9.5) * 3.5;
  const tailWave2 = Math.cos(time * 8.2) * 3.0;
  ctx.fillStyle = flash ? '#FFFFFF' : isNightmare ? '#3B0764' : '#4C1D95';
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(12, -8);
  ctx.lineTo(14, 11 + tailWave2 * 0.5);
  ctx.lineTo(6, 7);
  ctx.lineTo(1 + tailWave1 * 0.4, 15);
  ctx.lineTo(-5, 8);
  ctx.lineTo(-14 + tailWave1, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner luminous ectoplasm core glow on torso
  if (!flash) {
    ctx.fillStyle = '#A78BFA';
    ctx.beginPath();
    ctx.ellipse(1, 0, 6.5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Silver spectral chain collar
  ctx.fillStyle = flash ? '#FFFFFF' : '#CBD5E1';
  drawRoundedRect(ctx, -11, -9, 22, 5, 2.5);
  ctx.fill();
  ctx.stroke();

  // Pointed Phantom Shroud Hood
  ctx.fillStyle = flash ? '#FFFFFF' : isNightmare ? '#581C87' : '#6D28D9';
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.quadraticCurveTo(-15, -26, -3, -31);
  ctx.quadraticCurveTo(14, -27, 14, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shadowed abyssal face hollow inside hood
  ctx.fillStyle = flash ? '#FFFFFF' : '#120B24';
  drawRoundedRect(ctx, -9.5, -22.5, 20, 14.5, 6.5);
  ctx.fill();

  // Luminous Cyan-Amethyst Spectral Eyes
  ctx.fillStyle = flash ? '#FFFFFF' : '#67E8F9';
  ctx.beginPath();
  ctx.arc(-2.5, -15, 2.9, 0, Math.PI * 2);
  ctx.arc(5.8, -15, 2.9, 0, Math.PI * 2);
  ctx.fill();

  // Floating Silver Spirit Lantern orbiting lead hand!
  const lanternBob = Math.sin(time * 6.8) * 2.2;
  ctx.save();
  ctx.translate(16 + (lunge > 0.3 ? 4 : 0), -3 + lanternBob);
  ctx.fillStyle = '#94A3B8';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 1.8;
  drawRoundedRect(ctx, -4.5, -6, 9, 12, 2.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isRestless ? '#67E8F9' : '#E879F9';
  ctx.beginPath();
  ctx.arc(0, 0, 3.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

function drawMinion(ctx: CanvasRenderingContext2D, minion: MinionEntity, time: number): void {
  const spawnScale = minion.spawnAnimTimer > 0 ? 1 - minion.spawnAnimTimer / 0.25 : 1;
  const isGhostApp = minion.minionType === 'GHOST_APPARITION';
  const bob = isGhostApp
    ? Math.sin(time * 6 + minion.id) * 3.5
    : Math.abs(Math.sin(minion.walkPhase)) * 3.2;

  ctx.save();
  ctx.translate(minion.x, minion.y);
  ctx.scale(Math.max(0.2, spawnScale), Math.max(0.2, spawnScale));

  if (minion.minionType === 'SKELETON_WARRIOR_ALLY' || isGhostApp) {
    ctx.strokeStyle = isGhostApp
      ? 'rgba(192, 132, 252, 0.6)'
      : 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 10, 13, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shadow
  ctx.fillStyle = isGhostApp ? 'rgba(139, 92, 246, 0.28)' : 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(minion.facingX, 1);
  ctx.translate(0, -bob);

  const flash = minion.hitFlashTimer > 0;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;

  if (isGhostApp) {
    // Terrifying Hooded Nightmare Apparition Ally
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = flash ? '#FFFFFF' : '#581C87';
    ctx.beginPath();
    ctx.moveTo(-9, -18);
    ctx.quadraticCurveTo(0, -24, 9, -18);
    ctx.lineTo(11, 9);
    ctx.lineTo(3, 5);
    ctx.lineTo(-2, 11);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#120B24';
    drawRoundedRect(ctx, -6.5, -16, 14, 10, 4);
    ctx.fill();

    ctx.fillStyle = '#67E8F9';
    ctx.beginPath();
    ctx.arc(-1.5, -11, 2, 0, Math.PI * 2);
    ctx.arc(4.2, -11, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (minion.minionType === 'SKELETON_WARRIOR_ALLY') {
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
      enemy.rootTimer > 0 ||
      enemy.fearTimer > 0 ||
      enemy.possessedTimer > 0)
  ) {
    const barW = 34;
    const barY = isDummy ? -38 : -34;
    ctx.fillStyle = '#14111C';
    ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, 6);
    ctx.fillStyle =
      enemy.possessedTimer > 0
        ? '#E879F9'
        : enemy.fearTimer > 0
        ? '#A78BFA'
        : enemy.stunTimer > 0 || enemy.rootTimer > 0
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

  // Fear / Terror trembling spectral wisps above head
  if (enemy.fearTimer > 0) {
    const fearY = isBoss ? -58 : -46;
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k++) {
      const ox = k * 7;
      const oy = fearY + Math.sin(time * 18 + k) * 2;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + k * 2, oy - 6);
      ctx.stroke();
    }
  }

  // Haunted Possession puppet strings & spectral crown above possessed host
  if (enemy.possessedTimer > 0) {
    const posY = isBoss ? -60 : -47;
    ctx.strokeStyle = '#E879F9';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, posY, 8, 0, Math.PI * 2);
    ctx.stroke();
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

// Procedural 60fps 3-Talon Necrotic Claw Basic Attack & Virulent Spore Impact Burst
function drawZombieBasicAttack(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.2));
  const isFinisher = Boolean(slash.isCrit);
  const scale = slash.scale ?? 1;

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  if (slash.flip) {
    ctx.scale(1, -1);
  }

  const half = slash.arcSpread * 0.5;
  const steps = 18;

  // Soft toxic miasma wake behind the 3 claw furrows
  const wakeHead = 1 - Math.pow(1 - Math.min(1, progress * 1.45), 3);
  const wakeTail = Math.pow(Math.max(0, (progress - 0.18) / 0.82), 1.9);
  const wStart = -half + slash.arcSpread * wakeTail;
  const wEnd = -half + slash.arcSpread * wakeHead;

  if (wEnd - wStart > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (isFinisher ? 0.36 : 0.24);
    ctx.strokeStyle = isFinisher ? '#A3E635' : '#22C55E';
    ctx.lineWidth = 24 * scale * (1 - progress * 0.35);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, slash.radius * 0.86, wStart, wEnd);
    ctx.stroke();
    ctx.restore();
  }

  // Render 3 parallel staggered decaying claw talon gouges (outer, middle, inner)
  const clawOffsets = [1.02, 0.86, 0.7];
  const clawDelays = [0, 0.045, 0.09];
  const clawThickness = [8.8, 10.5, 7.4];

  for (let c = 0; c < 3; c++) {
    const localP = Math.max(0, Math.min(1, (progress - clawDelays[c]) / (1 - clawDelays[c])));
    if (localP <= 0) continue;

    const headEase = 1 - Math.pow(1 - Math.min(1, localP * 1.55), 3);
    const tailEase = Math.pow(Math.max(0, (localP - 0.14) / 0.86), 2.0);
    const startAng = -half + slash.arcSpread * tailEase;
    const endAng = -half + slash.arcSpread * headEase;
    if (endAng - startAng <= 0.04) continue;

    const clawR = slash.radius * clawOffsets[c] * (0.95 + headEase * 0.07);
    const maxW = clawThickness[c] * (isFinisher ? 1.25 : 1.0) * scale * (1 - localP * 0.42);

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = startAng + (endAng - startAng) * t;
      // Subtle organic jaggedness along the claw furrow
      const jag = Math.sin(t * Math.PI * 5 + c * 2.1) * 1.1 * scale;
      const r = clawR + jag;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const a = startAng + (endAng - startAng) * t;
      const profile = Math.sin(Math.pow(t, 0.72) * Math.PI);
      const r = Math.max(5, clawR - maxW * profile);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();

    // Additive necrotic lime/emerald glow pass
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * (isFinisher ? 0.58 : 0.42);
    ctx.fillStyle = isFinisher ? '#A3E635' : '#4ADE80';
    ctx.fill();
    ctx.restore();

    // Crisp hand-inked claw slash fill + dark outline
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle =
      c === 1
        ? isFinisher
          ? '#ECFCCB'
          : '#BBF7D0'
        : isFinisher
        ? '#BEF264'
        : '#4ADE80';
    ctx.fill();
    ctx.lineWidth = 1.45;
    ctx.strokeStyle = `rgba(18, 15, 23, ${alpha * 0.8})`;
    ctx.stroke();
    ctx.restore();

    // Sharp gleaming talon tip at the head of each claw furrow
    if (localP < 0.58) {
      const tipX = Math.cos(endAng) * clawR;
      const tipY = Math.sin(endAng) * clawR;
      const tipLen = (1 - localP / 0.58) * (isFinisher ? 8.5 : 6.2) * scale;
      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(endAng + Math.PI * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#F7FEE7';
      ctx.beginPath();
      ctx.moveTo(-tipLen, 0);
      ctx.lineTo(0, -tipLen * 0.34);
      ctx.lineTo(tipLen * 1.35, 0);
      ctx.lineTo(0, tipLen * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawZombiePoisonBurst(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
  const scale = slash.scale ?? 1;
  const isEmpowered = Boolean(slash.isCrit);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  if (slash.flip) {
    ctx.scale(1, -1);
  }

  const baseR = slash.radius * (0.38 + easeOut * 0.65);

  // 1. Expanding toxic floor puddle ring
  ctx.save();
  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = isEmpowered ? '#84CC16' : '#22C55E';
  ctx.beginPath();
  ctx.arc(0, 0, baseR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Six billowing cartoon plague cloud lobes with crisp dark ink outlines
  const lobeCount = 6;
  ctx.save();
  ctx.globalAlpha = alpha * 0.88;
  for (let i = 0; i < lobeCount; i++) {
    const ang = (i / lobeCount) * Math.PI * 2 + progress * 0.9;
    const dist = baseR * (0.48 + (i % 2) * 0.18);
    const lx = Math.cos(ang) * dist;
    const ly = Math.sin(ang) * dist;
    const lobeR = (slash.radius * 0.26 * (1 - progress * 0.45)) * scale;
    if (lobeR <= 0.8) continue;

    ctx.fillStyle = i % 2 === 0 ? (isEmpowered ? '#A3E635' : '#4ADE80') : '#166534';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(lx, ly, lobeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // 3. Sharp necrotic impact splatter spikes during initial contact frames
  if (progress < 0.55) {
    const spikeAlpha = (1 - progress / 0.55) * alpha;
    const spikeLen = slash.radius * (0.55 + easeOut * 0.5) * scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = spikeAlpha;
    ctx.fillStyle = isEmpowered ? '#ECFCCB' : '#BEF264';
    for (let s = 0; s < 4; s++) {
      ctx.rotate(Math.PI * 0.5);
      ctx.beginPath();
      ctx.moveTo(4, -2.6 * scale);
      ctx.lineTo(spikeLen, 0);
      ctx.lineTo(4, 2.6 * scale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// Reference to Zombie's Death's Embrace 60-frame top-view skill effects sheet
export const DEATHS_EMBRACE_SHEET_URL = '/assets/aistudio/deaths_embrace_fx_sheet.png?v=topview60';

let cachedDeathsEmbraceSheetImg: HTMLImageElement | null = null;

function getDeathsEmbraceSheetImage(): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;
  if (!cachedDeathsEmbraceSheetImg) {
    cachedDeathsEmbraceSheetImg = new Image();
    cachedDeathsEmbraceSheetImg.src = DEATHS_EMBRACE_SHEET_URL;
  }
  return cachedDeathsEmbraceSheetImg;
}

// Preload immediately in browser so the very first cast renders from Frame 1
if (typeof window !== 'undefined') {
  getDeathsEmbraceSheetImage();
}

export function drawDeathsEmbraceVFX(
  ctx: CanvasRenderingContext2D,
  fx: DeathsEmbraceEffect,
  _time: number
): void {
  const progress = Math.max(0, Math.min(1, 1 - fx.life / fx.maxLife));
  // 60 sequential frames (0 to 59) matching the 10x6 sheet
  const frameIndex = Math.min(59, Math.floor(progress * 60));

  // 10 columns by 6 rows in the 1400x840 master sheet (each frame 140x140)
  const col = frameIndex % 10;
  const row = Math.floor(frameIndex / 10);
  const sw = 140;
  const sh = 140;
  const sx = col * sw;
  const sy = row * sh;

  // Sized to match the skill's AoE reach cleanly in top-down perspective
  const drawDiameter = fx.radius * 2.15;
  const half = drawDiameter / 2;

  // Frames 50-60 already contain the hand-drawn dissipation fade; apply gentle tail fade at the very end
  const alpha = progress > 0.94 ? Math.max(0, (1 - progress) / 0.06) : 1;

  const sheet = getDeathsEmbraceSheetImage();
  const sheetReady = sheet && sheet.complete && sheet.naturalWidth > 0;

  ctx.save();
  ctx.translate(fx.x, fx.y);

  if (sheetReady) {
    // 1. Crisp full-color base pass preserving dark debris, outlines, and top-view cross artstyle
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.drawImage(sheet, sx, sy, sw, sh, -half, -half, drawDiameter, drawDiameter);
    ctx.restore();

    // 2. Subtle additive bloom pass for vibrant toxic-lime energy glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.28;
    ctx.drawImage(sheet, sx, sy, sw, sh, -half, -half, drawDiameter, drawDiameter);
    ctx.restore();
  } else {
    // Stylized lime-green fallback while sheet initializes
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = '#84CC16';
    ctx.lineWidth = 6 * (1 - progress);
    ctx.beginPath();
    ctx.arc(0, 0, fx.radius * Math.min(1, progress * 1.5), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawSkeletonBasicAttack(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  // Fast cubic ease-out head sweep, smooth ease-in tail catch-up
  const headEase = 1 - Math.pow(1 - Math.min(1, progress * 1.45), 3);
  const tailEase = Math.pow(Math.max(0, (progress - 0.12) / 0.88), 2.1);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.4));

  const half = slash.arcSpread * 0.5;
  const startAng = -half + slash.arcSpread * tailEase;
  const endAng = -half + slash.arcSpread * headEase;
  if (endAng - startAng <= 0.04) return;

  const isCrit = Boolean(slash.isCrit);
  const scale = slash.scale ?? 1;

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  if (slash.flip) {
    ctx.scale(1, -1);
  }

  const steps = 22;
  const outerR = slash.radius * (0.94 + headEase * 0.08);
  const maxBladeWidth = (isCrit ? 28 : 21) * scale * (1 - progress * 0.42);

  // Build tapered crescent polygon with bone-tooth serration notch
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startAng + (endAng - startAng) * t;
    const notch = t > 0.58 && t < 0.68 ? -3.5 * scale : 0;
    const r = outerR + notch;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = startAng + (endAng - startAng) * t;
    const profile = Math.sin(Math.pow(t, 0.75) * Math.PI);
    const r = Math.max(6, outerR - maxBladeWidth * profile);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();

  // Pass 1: Additive spectral cyan / critical-gold bloom
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * (isCrit ? 0.72 : 0.52);
  ctx.fillStyle = isCrit ? '#FDE047' : '#38BDF8';
  ctx.shadowColor = isCrit ? '#F59E0B' : '#38BDF8';
  ctx.shadowBlur = isCrit ? 18 : 13;
  ctx.fill();
  ctx.restore();

  // Pass 2: Crisp bone-ivory crescent body + dark ink rim
  ctx.save();
  ctx.globalAlpha = alpha;
  const innerStopR = Math.max(2, outerR - maxBladeWidth);
  const grad = ctx.createRadialGradient(0, 0, innerStopR, 0, 0, outerR + 2);
  grad.addColorStop(0, isCrit ? 'rgba(253, 224, 71, 0.25)' : 'rgba(56, 189, 248, 0.22)');
  grad.addColorStop(0.55, isCrit ? '#FEF08A' : '#7DD3FC');
  grad.addColorStop(0.86, '#F8FAFC');
  grad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = `rgba(18, 15, 23, ${alpha * 0.75})`;
  ctx.stroke();
  ctx.restore();

  // Pass 3: Razor-sharp inner kinetic wind line
  if (endAng - startAng > 0.2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = isCrit ? '#FEF9C3' : '#BAE6FD';
    ctx.lineWidth = 2.2 * scale * (1 - progress);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, outerR * 0.76, startAng + 0.12, endAng - 0.05);
    ctx.stroke();
    ctx.restore();
  }

  // Leading bone-tip glint star at the slash head during initial swing
  if (progress < 0.55) {
    const tipX = Math.cos(endAng) * outerR;
    const tipY = Math.sin(endAng) * outerR;
    const glintScale = (1 - progress / 0.55) * (isCrit ? 10.5 : 7.2) * scale;
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(endAng);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-glintScale * 1.4, 0);
    ctx.lineTo(0, -glintScale * 0.38);
    ctx.lineTo(glintScale * 1.4, 0);
    ctx.lineTo(0, glintScale * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawSkeletonImpactFlash(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - progress);
  const scale = slash.scale ?? 1;
  const isCrit = Boolean(slash.isCrit);
  const r = (22 + progress * 24) * scale;

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle + 0.35);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  // 4-point crisp impact cross-star
  ctx.fillStyle = slash.color || (isCrit ? '#FDE047' : '#7DD3FC');
  for (let arm = 0; arm < 2; arm++) {
    ctx.rotate(Math.PI * 0.5);
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(0, -3.4 * alpha * scale);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, 3.4 * alpha * scale);
    ctx.closePath();
    ctx.fill();
  }

  // Expanding shock ring on critical / 3rd-hit finisher
  if (isCrit) {
    ctx.strokeStyle = slash.color || '#FEF08A';
    ctx.lineWidth = 2.4 * alpha;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, r * 0.78), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGoblinCurvedCrescent(
  ctx: CanvasRenderingContext2D,
  progress: number,
  radius: number,
  arcSpread: number,
  flip: boolean,
  color: string,
  scale: number,
  isCrit: boolean
): void {
  const headEase = 1 - Math.pow(1 - Math.min(1, progress * 1.68), 3);
  const tailEase = Math.pow(Math.max(0, (progress - 0.1) / 0.9), 2.15);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.35));

  const half = arcSpread * 0.5;
  const startAng = -half + arcSpread * tailEase;
  const endAng = -half + arcSpread * headEase;
  if (endAng - startAng <= 0.04) return;

  const isVenom = color === '#A3E635' || color === '#4ADE80';
  const outerR = Math.max(8, radius * (0.95 + headEase * 0.07));
  const maxBladeW = (isCrit ? 22 : 16.5) * scale * (1 - progress * 0.42);
  const steps = 18;

  ctx.save();
  if (flip) ctx.scale(1, -1);

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startAng + (endAng - startAng) * t;
    // Forward kukri hook bulge near 78% of the blade sweep
    const hook = Math.sin(Math.pow(t, 1.8) * Math.PI) * 3.2 * scale;
    const r = outerR + hook;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = startAng + (endAng - startAng) * t;
    const profile = Math.sin(Math.pow(t, 0.8) * Math.PI);
    const r = Math.max(5, outerR - maxBladeW * profile);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();

  // Pass 1: Additive assassin gold or virulent nightshade bloom
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * (isCrit ? 0.68 : 0.48);
  ctx.fillStyle = isVenom ? '#84CC16' : isCrit ? '#FDE047' : '#F59E0B';
  ctx.fill();
  ctx.restore();

  // Pass 2: Razor steel-to-gold / venom radial fill + crisp dark rim
  ctx.save();
  ctx.globalAlpha = alpha;
  const innerStop = Math.max(2, outerR - maxBladeW);
  const grad = ctx.createRadialGradient(0, 0, innerStop, 0, 0, outerR + 4);
  if (isVenom) {
    grad.addColorStop(0, 'rgba(74, 222, 128, 0.22)');
    grad.addColorStop(0.55, '#A3E635');
    grad.addColorStop(0.88, '#ECFCCB');
    grad.addColorStop(1, '#FFFFFF');
  } else {
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
    grad.addColorStop(0.55, isCrit ? '#FDE047' : '#FBBF24');
    grad.addColorStop(0.88, '#FEF9C3');
    grad.addColorStop(1, '#FFFFFF');
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `rgba(18, 15, 23, ${alpha * 0.78})`;
  ctx.stroke();
  ctx.restore();

  // Pass 3: Inner velocity filament + leading kukri tip spark
  if (endAng - startAng > 0.18) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.82;
    ctx.strokeStyle = isVenom ? '#D9F99D' : '#FEF08A';
    ctx.lineWidth = 1.9 * scale * (1 - progress);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, outerR * 0.8, startAng + 0.1, endAng - 0.04);
    ctx.stroke();
    ctx.restore();
  }

  if (progress < 0.52) {
    const tipX = Math.cos(endAng) * (outerR + 1.5);
    const tipY = Math.sin(endAng) * (outerR + 1.5);
    const gs = (1 - progress / 0.52) * (isCrit ? 9.5 : 6.8) * scale;
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(endAng);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-gs * 1.4, 0);
    ctx.lineTo(0, -gs * 0.36);
    ctx.lineTo(gs * 1.4, 0);
    ctx.lineTo(0, gs * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawGoblinBasicAttack(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  drawGoblinCurvedCrescent(
    ctx,
    progress,
    slash.radius,
    slash.arcSpread,
    slash.flip,
    slash.color,
    slash.scale ?? 1,
    Boolean(slash.isCrit)
  );
  ctx.restore();
}

function drawGoblinTwinCross(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const scale = slash.scale ?? 1.1;
  const p1 = Math.min(1, progress * 1.12);
  const p2 = Math.max(0, Math.min(1, (progress - 0.08) / 0.92));

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);

  // Blade 1: Upper-to-lower scissor sweep
  ctx.save();
  ctx.rotate(-0.24);
  drawGoblinCurvedCrescent(
    ctx,
    p1,
    slash.radius,
    slash.arcSpread,
    false,
    slash.color,
    scale,
    true
  );
  ctx.restore();

  // Blade 2: Lower-to-upper counter scissor sweep
  if (p2 > 0) {
    ctx.save();
    ctx.rotate(0.24);
    drawGoblinCurvedCrescent(
      ctx,
      p2,
      slash.radius * 0.96,
      slash.arcSpread,
      true,
      slash.color,
      scale * 0.95,
      true
    );
    ctx.restore();
  }

  // Central X-intersection star flash
  if (progress > 0.08 && progress < 0.72) {
    const flashAlpha = Math.sin(((progress - 0.08) / 0.64) * Math.PI);
    const fx = slash.radius * 0.84;
    const armLen = 15 * scale * flashAlpha;
    ctx.save();
    ctx.translate(fx, 0);
    ctx.rotate(Math.PI * 0.25);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = '#FFFFFF';
    for (let k = 0; k < 2; k++) {
      ctx.rotate(Math.PI * 0.5);
      ctx.beginPath();
      ctx.moveTo(-armLen, 0);
      ctx.lineTo(0, -2.8 * scale);
      ctx.lineTo(armLen, 0);
      ctx.lineTo(0, 2.8 * scale);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawGoblinFlurryThrust(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const thrustEase = 1 - Math.pow(1 - Math.min(1, progress * 2.1), 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.85));
  const scale = slash.scale ?? 1;
  const reach = slash.radius * (0.42 + thrustEase * 0.64);
  const halfW = (slash.isCrit ? 9.5 : 7.2) * scale * (1 - progress * 0.45);
  const isVenom = slash.color === '#A3E635';

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);

  // Conical slipstream wind wake
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.52;
  ctx.strokeStyle = isVenom ? '#84CC16' : '#FBBF24';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(reach * 0.22, -halfW * 1.45);
  ctx.lineTo(reach * 0.96, 0);
  ctx.lineTo(reach * 0.22, halfW * 1.45);
  ctx.stroke();
  ctx.restore();

  // Needle-sharp dagger spear thrust
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(10, 0, reach + 6, 0);
  grad.addColorStop(0, 'rgba(245, 158, 11, 0)');
  grad.addColorStop(0.45, isVenom ? '#A3E635' : '#FBBF24');
  grad.addColorStop(0.85, '#FEF9C3');
  grad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = grad;
  ctx.strokeStyle = `rgba(18, 15, 23, ${alpha * 0.8})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(reach * 0.56, -halfW);
  ctx.lineTo(reach + 6, 0);
  ctx.lineTo(reach * 0.56, halfW);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Piercing tip spark
  if (progress < 0.6) {
    const s = (1 - progress / 0.6) * 8 * scale;
    ctx.save();
    ctx.translate(reach + 5, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-s * 1.5, 0);
    ctx.lineTo(0, -s * 0.35);
    ctx.lineTo(s * 1.5, 0);
    ctx.lineTo(0, s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawGoblinBackstabX(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.1));
  const scale = slash.scale ?? 1.15;
  const halfLen = slash.radius * (0.55 + (1 - Math.pow(1 - progress, 3)) * 0.55);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);

  // Expanding dark-shadow assassin ambush ring
  ctx.save();
  ctx.globalAlpha = alpha * 0.72;
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 5 * (1 - progress * 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(3, slash.radius * 0.68 * (0.4 + progress * 0.7)), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Twin diagonal ambush slashes cutting across the target
  const angles = [-0.68, 0.68];
  for (let i = 0; i < 2; i++) {
    const localP = Math.max(0, Math.min(1, (progress - i * 0.1) / (1 - i * 0.1)));
    if (localP <= 0) continue;
    const sweepLen = halfLen * (1 - Math.pow(1 - Math.min(1, localP * 2.2), 3));
    const w = 6.8 * scale * (1 - localP * 0.55);

    ctx.save();
    ctx.rotate(angles[i]);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = slash.color || '#FBBF24';
    ctx.beginPath();
    ctx.moveTo(-sweepLen * 1.1, 0);
    ctx.lineTo(0, -w * 1.45);
    ctx.lineTo(sweepLen * 1.1, 0);
    ctx.lineTo(0, w * 1.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-sweepLen, 0);
    ctx.lineTo(0, -w);
    ctx.lineTo(sweepLen, 0);
    ctx.lineTo(0, w);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

function drawGoblinTrapBlast(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.0));
  const maxR = Math.max(12, slash.radius * (0.35 + easeOut * 0.68));

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Expanding comic-crisp charcoal blast smoke lobes
  ctx.save();
  ctx.globalAlpha = alpha * 0.72;
  ctx.fillStyle = '#1C1917';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;
  const lobes = 8;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + 0.2;
    const dist = maxR * 0.56 * easeOut;
    const lobeR = Math.max(3, maxR * 0.28 * (1 - progress * 0.25));
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, lobeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Multi-pointed jagged fiery detonation starburst
  const spikes = 12;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 + progress * 0.4;
    const isTip = i % 2 === 0;
    const r = isTip ? maxR * (i % 4 === 0 ? 1.0 : 0.82) : maxR * 0.42;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, maxR);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.35, '#FEF08A');
  grad.addColorStop(0.72, '#F97316');
  grad.addColorStop(1, '#DC2626');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#120F17';
  ctx.stroke();
  ctx.restore();

  // Crisp inner white-hot core flash on initial detonation frames
  if (progress < 0.42) {
    const coreAlpha = 1 - progress / 0.42;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = coreAlpha;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, maxR * 0.38 * coreAlpha), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawGoblinVenomCoat(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, Math.sin(progress * Math.PI));
  const rBase = slash.radius * (0.55 + progress * 0.48);

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Dual-helix swirling nightshade toxin ribbons
  for (let h = 0; h < 2; h++) {
    const baseRot = progress * Math.PI * 3.2 + h * Math.PI;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.88;
    ctx.strokeStyle = h === 0 ? '#A3E635' : '#4ADE80';
    ctx.lineWidth = 4.2 * (1 - progress * 0.4);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(0, 2 - progress * 10, rBase, rBase * 0.56, 0, baseRot, baseRot + Math.PI * 1.25);
    ctx.stroke();

    const tipA = baseRot + Math.PI * 1.25;
    ctx.fillStyle = '#ECFCCB';
    ctx.beginPath();
    ctx.arc(
      Math.cos(tipA) * rBase,
      2 - progress * 10 + Math.sin(tipA) * rBase * 0.56,
      3.2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawGoblinShadowTrace(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const fromX = slash.fromX ?? slash.x - Math.cos(slash.angle) * 80;
  const fromY = slash.fromY ?? slash.y - Math.sin(slash.angle) * 80;
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));

  // Tail catches up to destination for ultra-fast blink sensation
  const tailT = Math.min(0.88, progress * 0.85);
  const sx = fromX + (slash.x - fromX) * tailT;
  const sy = fromY + (slash.y - fromY) * tailT;
  const dx = slash.x - sx;
  const dy = slash.y - sy;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;

  const nx = -dy / len;
  const ny = dx / len;
  const headHalfW = 7.5 * (slash.scale ?? 1) * alpha;

  ctx.save();
  // Dark shadow-smoke outer ribbon
  ctx.globalAlpha = alpha * 0.72;
  ctx.fillStyle = '#120F17';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(slash.x + nx * headHalfW * 1.45, slash.y + ny * headHalfW * 1.45);
  ctx.lineTo(slash.x - nx * headHalfW * 1.45, slash.y - ny * headHalfW * 1.45);
  ctx.closePath();
  ctx.fill();

  // Blazing assassin-gold inner lightning core
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.92;
  const grad = ctx.createLinearGradient(sx, sy, slash.x, slash.y);
  grad.addColorStop(0, 'rgba(245, 158, 11, 0)');
  grad.addColorStop(0.55, slash.color || '#F59E0B');
  grad.addColorStop(1, '#FEF9C3');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(slash.x + nx * headHalfW * 0.65, slash.y + ny * headHalfW * 0.65);
  ctx.lineTo(slash.x - nx * headHalfW * 0.65, slash.y - ny * headHalfW * 0.65);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawGnomeGauntletArc(
  ctx: CanvasRenderingContext2D,
  progress: number,
  radius: number,
  arcSpread: number,
  flip: boolean,
  scale: number,
  isCrit: boolean
): void {
  const headEase = 1 - Math.pow(1 - Math.min(1, progress * 1.58), 3);
  const tailEase = Math.pow(Math.max(0, (progress - 0.14) / 0.86), 2.0);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.15));

  const half = arcSpread * 0.5;
  const startAng = -half + arcSpread * tailEase;
  const endAng = -half + arcSpread * headEase;
  if (endAng - startAng <= 0.05) return;

  const outerR = Math.max(10, radius * (0.88 + headEase * 0.14));
  const maxW = (isCrit ? 26 : 20) * scale * (1 - progress * 0.38);
  const steps = 18;

  ctx.save();
  if (flip) ctx.scale(1, -1);

  // Heavy forged-gauntlet knuckle-ridged crescent polygon
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startAng + (endAng - startAng) * t;
    const knuckleRidge = Math.sin(t * Math.PI * 4) * 2.4 * scale;
    const r = outerR + knuckleRidge;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = startAng + (endAng - startAng) * t;
    const profile = Math.sin(Math.pow(t, 0.78) * Math.PI);
    const r = Math.max(5, outerR - maxW * profile);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();

  // Pass 1: Molten copper-amber shock bloom
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * (isCrit ? 0.7 : 0.5);
  ctx.fillStyle = isCrit ? '#FDE047' : '#FB923C';
  ctx.fill();
  ctx.restore();

  // Pass 2: Forged bronze-to-gold kinetic core + dark ink outline
  ctx.save();
  ctx.globalAlpha = alpha;
  const innerStop = Math.max(2, outerR - maxW);
  const grad = ctx.createRadialGradient(0, 0, innerStop, 0, 0, outerR + 4);
  grad.addColorStop(0, 'rgba(180, 83, 9, 0.25)');
  grad.addColorStop(0.52, isCrit ? '#FDBA74' : '#FB923C');
  grad.addColorStop(0.86, '#FEF08A');
  grad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = `rgba(18, 15, 23, ${alpha * 0.82})`;
  ctx.stroke();
  ctx.restore();

  // Pass 3: Twin sonic-boom compression arcs ahead of the gauntlet
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = '#FEF9C3';
  ctx.lineWidth = 2.4 * scale * (1 - progress * 0.45);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, outerR + 5 * scale, startAng + 0.14, endAng - 0.04);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawGnomeBasicAttack(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  drawGnomeGauntletArc(
    ctx,
    progress,
    slash.radius,
    slash.arcSpread,
    slash.flip,
    slash.scale ?? 1,
    Boolean(slash.isCrit)
  );
  ctx.restore();
}

function drawGnomeSeismicSlam(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const scale = slash.scale ?? 1.1;
  const p1 = Math.min(1, progress * 1.12);
  const p2 = Math.max(0, Math.min(1, (progress - 0.06) / 0.94));

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);

  // Converging Double-Gauntlet Tectonic Smash
  ctx.save();
  ctx.rotate(-0.18);
  drawGnomeGauntletArc(ctx, p1, slash.radius, slash.arcSpread, false, scale, true);
  ctx.restore();

  if (p2 > 0) {
    ctx.save();
    ctx.rotate(0.18);
    drawGnomeGauntletArc(ctx, p2, slash.radius * 0.96, slash.arcSpread, true, scale * 0.96, true);
    ctx.restore();
  }

  // Radial 6-fissure seismic fracture & sonic ring at knuckle collision apex
  if (progress > 0.06) {
    const crAlpha = Math.max(0, 1 - progress);
    const apexX = slash.radius * 0.88;
    const crackR = (10 + progress * 28) * scale;
    ctx.save();
    ctx.translate(apexX, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = crAlpha;
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 2.6 * scale * crAlpha;
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.25;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * crackR * 0.55, Math.sin(a) * crackR * 0.55 + 3);
      ctx.lineTo(Math.cos(a) * crackR, Math.sin(a) * crackR);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, crackR * 0.72), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawGnomeImpactCrack(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - progress);
  const scale = slash.scale ?? 1;
  const maxR = (18 + progress * 24) * scale;

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = slash.color || '#FB923C';
  ctx.lineWidth = 2.6 * scale * alpha;
  ctx.lineCap = 'round';

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a + 0.15) * maxR * 0.5, Math.sin(a + 0.15) * maxR * 0.5);
    ctx.lineTo(Math.cos(a) * maxR, Math.sin(a) * maxR);
    ctx.stroke();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.5, 5.5 * alpha * scale), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGnomeIronFistWave(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - Math.min(1, progress * 1.65), 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.9));
  const scale = slash.scale ?? 1;

  const ox = slash.fromX ?? slash.x - Math.cos(slash.angle) * slash.radius;
  const oy = slash.fromY ?? slash.y - Math.sin(slash.angle) * slash.radius;
  const curLen = slash.radius * (0.28 + ease * 0.74);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(slash.angle);

  // Erupting stone faultline trench wedge
  ctx.save();
  ctx.globalAlpha = alpha * 0.78;
  ctx.fillStyle = '#44403C';
  ctx.strokeStyle = '#120F17';
  ctx.lineWidth = 2;
  const halfCone = 24 * scale * (0.55 + ease * 0.45);
  ctx.beginPath();
  ctx.moveTo(0, -8 * scale);
  ctx.lineTo(curLen, -halfCone);
  ctx.lineTo(curLen + 14 * scale, 0);
  ctx.lineTo(curLen, halfCone);
  ctx.lineTo(0, 8 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Glowing molten-copper zigzag seismic fissure down the center
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = slash.color || '#FB923C';
  ctx.lineWidth = 4.2 * scale * (1 - progress * 0.35);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const segs = 6;
  for (let s = 1; s <= segs; s++) {
    const t = s / segs;
    const zig = s === segs ? 0 : (s % 2 === 0 ? 1 : -1) * 8 * scale;
    ctx.lineTo(curLen * t, zig);
  }
  ctx.stroke();

  // Sonic shock-cone arcs along the punch wave
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 2.4 * scale * alpha;
  for (let w = 1; w <= 2; w++) {
    const wx = curLen * (0.45 + w * 0.25);
    ctx.beginPath();
    ctx.arc(wx - 16, 0, Math.max(4, 24 * scale), -0.7, 0.7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function drawGnomeFortressAegis(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.85));
  const r = Math.max(8, slash.radius * (0.42 + ease * 0.6));

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Expanding hexagonal runestone bastion ring
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.78;
  ctx.fillStyle = 'rgba(251, 146, 60, 0.18)';
  ctx.strokeStyle = slash.color || '#FDBA74';
  ctx.lineWidth = 3.6 * (1 - progress * 0.45);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + progress * 0.35;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * (r * 0.72);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 6 vertex runestone shield diamonds
  ctx.fillStyle = '#FEF08A';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + progress * 0.35;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * (r * 0.72);
    ctx.beginPath();
    ctx.arc(px, py, 3.5 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

function drawGnomeCraterSlam(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
  const maxR = Math.max(12, slash.radius * (0.38 + ease * 0.64));

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Dark bedrock crater rim ellipse
  ctx.save();
  ctx.globalAlpha = alpha * 0.62;
  ctx.fillStyle = '#1C1917';
  ctx.strokeStyle = '#78716C';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 4, maxR * 0.88, maxR * 0.54, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 8 radial glowing magma-amber faultline cracks
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.92;
  ctx.strokeStyle = slash.color || '#FB923C';
  ctx.lineWidth = 3 * (1 - progress * 0.45);
  ctx.lineCap = 'round';
  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + slash.angle;
    const rx = Math.cos(a) * maxR * 0.92;
    const ry = 4 + Math.sin(a) * maxR * 0.56;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(rx * 0.52 + (i % 2 === 0 ? 4 : -4), 4 + (ry - 4) * 0.52);
    ctx.lineTo(rx, ry);
    ctx.stroke();
  }

  // Central white-amber impact flash
  if (progress < 0.45) {
    const fa = 1 - progress / 0.45;
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.ellipse(0, 4, Math.max(2, maxR * 0.32 * fa), Math.max(2, maxR * 0.2 * fa), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

function drawGnomeMagneticPulse(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.9));
  const r = Math.max(10, slash.radius * (0.35 + ease * 0.68));

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.88;

  // Dual polarity cyan + copper magnetic field rings
  for (let k = 0; k < 2; k++) {
    const dir = k === 0 ? 1 : -1;
    const rk = Math.max(4, r * (k === 0 ? 1 : 0.74));
    ctx.strokeStyle = k === 0 ? '#38BDF8' : '#FB923C';
    ctx.lineWidth = 3 * (1 - progress * 0.45);
    ctx.setLineDash([14, 8]);
    ctx.lineDashOffset = dir * progress * 80;
    ctx.beginPath();
    ctx.arc(0, 0, rk, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawGnomeMagneticArc(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const fromX = slash.fromX ?? slash.x - 40;
  const fromY = slash.fromY ?? slash.y;
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - progress);
  const dx = slash.x - fromX;
  const dy = slash.y - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) return;

  const nx = -dy / dist;
  const ny = dx / dist;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  // Outer cyan-blue magnetic lightning bolt + inner white filament
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? '#38BDF8' : '#FFFFFF';
    ctx.lineWidth = pass === 0 ? 4.2 * alpha : 1.8 * alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    const segs = 5;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const jag =
        s === segs ? 0 : (s % 2 === 0 ? 1 : -1) * (8 - progress * 4) * Math.sin(progress * 28 + s);
      ctx.lineTo(fromX + dx * t + nx * jag, fromY + dy * t + ny * jag);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawGnomeMountainNova(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const rise = 1 - Math.pow(1 - Math.min(1, progress * 1.9), 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.0));
  const ringR = Math.max(16, slash.radius * (0.45 + rise * 0.55));

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // 8 erupting jagged granite mountain spires around the Gnome
  const peaks = 8;
  for (let i = 0; i < peaks; i++) {
    const a = (i / peaks) * Math.PI * 2;
    const px = Math.cos(a) * ringR * 0.86;
    const py = Math.sin(a) * ringR * 0.56;
    const h = 28 * rise * (1 - progress * 0.35);

    ctx.save();
    ctx.translate(px, py);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#57534E';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, 4);
    ctx.lineTo(0, -h);
    ctx.lineTo(11, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FB923C';
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.lineTo(0, -h * 0.55);
    ctx.lineTo(4, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Central molten-hearth surge ring
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.72;
  ctx.strokeStyle = '#FDE047';
  ctx.lineWidth = 4 * (1 - progress * 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, ringR * 0.92, ringR * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawGnomeCataclysmRing(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - Math.min(1, progress * 1.75), 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.9));
  const ringR = Math.max(20, slash.radius * (0.62 + ease * 0.38));
  const scale = slash.scale ?? 1;

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Glowing tectonic ring fissure
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.85;
  ctx.strokeStyle = slash.color || '#FB923C';
  ctx.lineWidth = 4.5 * (1 - progress * 0.45);
  ctx.beginPath();
  ctx.ellipse(0, 0, ringR, ringR * 0.68, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Ring of 12 erupting stone-and-magma spikes
  const count = 12;
  const spikeH = 24 * scale * Math.sin(Math.min(1, progress * 1.2) * Math.PI);
  if (spikeH > 2) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + slash.angle;
      const sx = Math.cos(a) * ringR;
      const sy = Math.sin(a) * (ringR * 0.68);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 2 === 0 ? '#78716C' : '#57534E';
      ctx.strokeStyle = '#120F17';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-8 * scale, 3);
      ctx.lineTo((i % 2 === 0 ? 3 : -3) * scale, -spikeH);
      ctx.lineTo(8 * scale, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = slash.color || '#FB923C';
      ctx.beginPath();
      ctx.arc(0, -spikeH * 0.35, 2.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawZombieSavageRend(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.15));
  const scale = slash.scale ?? 1;
  const r = Math.max(18, slash.radius * scale);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);

  // Dual intersecting 3-talon claw rakes (-0.36 and +0.36 rad cant)
  for (let hand = 0; hand < 2; hand++) {
    const delayedP = Math.max(0, Math.min(1, (progress - hand * 0.08) / (1 - hand * 0.08)));
    if (delayedP <= 0) continue;
    const sweep = 1 - Math.pow(1 - Math.min(1, delayedP * 1.65), 3);
    const fadeTail = Math.pow(Math.max(0, (delayedP - 0.18) / 0.82), 2);
    const cant = hand === 0 ? -0.38 : 0.38;

    ctx.save();
    ctx.translate(r * 0.52, 0);
    ctx.rotate(cant);

    for (let c = -1; c <= 1; c++) {
      const yOff = c * 9 * scale;
      const halfL = r * (c === 0 ? 0.62 : 0.5) * (0.85 + sweep * 0.15);
      const x0 = -halfL + halfL * 2 * fadeTail * 0.45;
      const x1 = -halfL + halfL * 2 * sweep;
      if (x1 - x0 <= 2) continue;

      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.65;
      ctx.strokeStyle = slash.isCrit ? '#FDE047' : '#84CC16';
      ctx.lineWidth = (c === 0 ? 8.5 : 6.2) * scale * (1 - delayedP * 0.4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, yOff);
      ctx.quadraticCurveTo((x0 + x1) * 0.5, yOff + c * 3.5, x1, yOff);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = c === 0 ? '#ECFCCB' : '#BEF264';
      ctx.lineWidth = (c === 0 ? 3.6 : 2.5) * scale * (1 - delayedP * 0.35);
      ctx.beginPath();
      ctx.moveTo(x0, yOff);
      ctx.quadraticCurveTo((x0 + x1) * 0.5, yOff + c * 3.5, x1, yOff);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Central necrotic X-impact burst
  if (progress < 0.55) {
    const fAlpha = (1 - progress / 0.55) * alpha;
    ctx.save();
    ctx.translate(r * 0.52, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fAlpha * 0.85;
    ctx.fillStyle = '#ECFCCB';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, 11 * scale * (1 - progress)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawZombiePlagueNova(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.85));
  const maxR = Math.max(20, slash.radius * (0.28 + ease * 0.76));

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Toxic radial miasma wave
  const grad = ctx.createRadialGradient(0, 0, Math.max(2, maxR * 0.25), 0, 0, maxR);
  grad.addColorStop(0, 'rgba(132, 204, 22, 0)');
  grad.addColorStop(0.68, `rgba(132, 204, 22, ${alpha * 0.38})`);
  grad.addColorStop(0.9, `rgba(190, 242, 100, ${alpha * 0.72})`);
  grad.addColorStop(1, 'rgba(74, 222, 128, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, maxR, 0, Math.PI * 2);
  ctx.fill();

  // 8 billowing plague spore lobes
  for (let i = 0; i < 8; i++) {
    const a = slash.angle + (i * Math.PI) / 4 + ease * 0.28;
    const lx = Math.cos(a) * maxR * 0.86;
    const ly = Math.sin(a) * maxR * 0.86;
    const lobeR = Math.max(2, (16 - progress * 8) * (slash.scale ?? 1));
    ctx.fillStyle = `rgba(74, 222, 128, ${alpha * 0.55})`;
    ctx.strokeStyle = `rgba(236, 252, 203, ${alpha * 0.8})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(lx, ly, lobeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Outer bio-shockwave ring
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(190, 242, 100, ${alpha * 0.85})`;
  ctx.lineWidth = Math.max(1.5, 6 * (1 - progress * 0.7));
  ctx.beginPath();
  ctx.arc(0, 0, maxR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawZombieFleshRipperWake(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.9));
  const x0 = slash.fromX ?? slash.x - Math.cos(slash.angle) * slash.radius;
  const y0 = slash.fromY ?? slash.y - Math.sin(slash.angle) * slash.radius;
  const dx = slash.x - x0;
  const dy = slash.y - y0;
  const dist = Math.max(12, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(ang);

  const headX = dist * Math.min(1, progress * 2.4);
  const tailX = dist * Math.max(0, (progress - 0.25) * 0.85);

  if (headX > tailX + 2) {
    // Dark necrotic rift core
    ctx.strokeStyle = `rgba(20, 83, 45, ${alpha * 0.75})`;
    ctx.lineWidth = 22 * (1 - progress * 0.45);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, 0);
    ctx.lineTo(headX, 0);
    ctx.stroke();

    // 3 parallel feral claw laceration scars
    for (let c = -1; c <= 1; c++) {
      const yOff = c * 8.5;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = c === 0 ? `rgba(236, 252, 203, ${alpha})` : `rgba(132, 204, 22, ${alpha * 0.9})`;
      ctx.lineWidth = (c === 0 ? 5.2 : 3.6) * (1 - progress * 0.45);
      ctx.beginPath();
      ctx.moveTo(tailX, yOff);
      ctx.quadraticCurveTo((tailX + headX) * 0.5, yOff + c * 4, headX, yOff * 0.65);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawZombieUndyingPulse(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2));
  const scale = slash.scale ?? 1;
  const ringR = Math.max(10, slash.radius * scale * (0.4 + ease * 0.65));

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.globalCompositeOperation = 'lighter';

  // Expanding teal-emerald bio-ward ring
  ctx.strokeStyle = `rgba(45, 212, 191, ${alpha * 0.9})`;
  ctx.lineWidth = Math.max(1.5, 5.5 * (1 - progress * 0.6));
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // Radiant vitality cross emblem
  const s = Math.max(6, 18 * scale * (0.7 + ease * 0.35));
  const arm = s * 0.36;
  ctx.fillStyle = `rgba(74, 222, 128, ${alpha * 0.78})`;
  ctx.beginPath();
  ctx.rect(-arm, -s, arm * 2, s * 2);
  ctx.rect(-s, -arm, s * 2, arm * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(236, 252, 203, ${alpha * 0.95})`;
  ctx.beginPath();
  ctx.rect(-arm * 0.55, -s * 0.72, arm * 1.1, s * 1.44);
  ctx.rect(-s * 0.72, -arm * 0.55, s * 1.44, arm * 1.1);
  ctx.fill();

  ctx.restore();
}

function drawZombieGraveEruption(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2));
  const scale = slash.scale ?? 1;
  const rx = Math.max(12, slash.radius * scale * (0.45 + ease * 0.55));
  const ry = Math.max(6, rx * 0.55);

  ctx.save();
  ctx.translate(slash.x, slash.y + 8);

  // Cracked graveyard earth pit + emerald crypt glow
  ctx.fillStyle = `rgba(20, 30, 24, ${alpha * 0.82})`;
  ctx.strokeStyle = `rgba(74, 222, 128, ${alpha * 0.9})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Radial soil fissure cracks
  ctx.strokeStyle = `rgba(163, 230, 53, ${alpha * 0.85})`;
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + 0.25;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * rx * 0.5, Math.sin(a) * ry * 0.5);
    ctx.lineTo(Math.cos(a) * rx * 1.32, Math.sin(a) * ry * 1.32);
    ctx.stroke();
  }

  // Rising undead clawing hand silhouette
  const handRise = Math.sin(Math.min(1, progress * 1.35) * Math.PI) * 22 * scale;
  if (handRise > 2) {
    ctx.fillStyle = `rgba(134, 239, 172, ${alpha * 0.92})`;
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.8;
    drawRoundedRect(ctx, -4.5 * scale, -handRise, 9 * scale, handRise, 3);
    ctx.fill();
    ctx.stroke();
    for (let f = -1; f <= 1; f++) {
      ctx.beginPath();
      ctx.moveTo(f * 3.2 * scale, -handRise);
      ctx.lineTo(f * 4.5 * scale, -handRise - 6.5 * scale);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawZombieAbominationNova(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.85));
  const scale = slash.scale ?? 1;
  const maxR = Math.max(18, slash.radius * scale * (0.32 + ease * 0.68));

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Mutagenic purple-emerald shockwave
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(0, 0, Math.max(2, maxR * 0.35), 0, 0, maxR);
  grad.addColorStop(0, 'rgba(168, 85, 247, 0)');
  grad.addColorStop(0.65, `rgba(168, 85, 247, ${alpha * 0.45})`);
  grad.addColorStop(0.92, `rgba(163, 230, 53, ${alpha * 0.85})`);
  grad.addColorStop(1, 'rgba(163, 230, 53, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, maxR, 0, Math.PI * 2);
  ctx.fill();

  // 8 erupting jagged bone-horn spikes
  ctx.globalCompositeOperation = 'source-over';
  const spikePopup = Math.sin(Math.min(1, progress * 1.4) * Math.PI);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.2;
    const sx = Math.cos(a) * maxR * 0.78;
    const sy = Math.sin(a) * maxR * 0.78;
    const h = 18 * scale * spikePopup;
    if (h <= 2) continue;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = `rgba(229, 222, 201, ${alpha})`;
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-5.5 * scale, 0);
    ctx.lineTo(0, -h);
    ctx.lineTo(5.5 * scale, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawSkeletonTwinCleave(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.2));
  const scale = slash.scale ?? 1;
  const r = Math.max(20, slash.radius * scale);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);

  // Scissor twin bone-katana X-cleave (-0.34 and +0.34 rad)
  for (let b = 0; b < 2; b++) {
    const localP = Math.max(0, Math.min(1, (progress - b * 0.07) / (1 - b * 0.07)));
    if (localP <= 0) continue;
    const sweep = 1 - Math.pow(1 - Math.min(1, localP * 1.65), 3);
    const tail = Math.pow(Math.max(0, (localP - 0.16) / 0.84), 2);
    const cant = b === 0 ? -0.34 : 0.34;
    const halfSpread = 0.92;
    const a0 = -halfSpread + halfSpread * 2 * tail * 0.45;
    const a1 = -halfSpread + halfSpread * 2 * sweep;
    if (a1 - a0 <= 0.05) continue;

    ctx.save();
    ctx.rotate(cant);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = slash.isCrit ? `rgba(253, 224, 71, ${alpha * 0.85})` : `rgba(56, 189, 248, ${alpha * 0.85})`;
    ctx.lineWidth = 13 * scale * (1 - localP * 0.45);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(248, 250, 252, ${alpha})`;
    ctx.lineWidth = 4.5 * scale * (1 - localP * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();
    ctx.restore();
  }

  // Golden-cyan 4-point star glint at scissor cross-point
  if (progress < 0.6) {
    const sAlpha = (1 - progress / 0.6) * alpha;
    const starL = 18 * scale * (1 - progress * 0.5);
    ctx.save();
    ctx.translate(r * 0.92, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(254, 249, 195, ${sAlpha})`;
    ctx.beginPath();
    ctx.moveTo(-starL, 0);
    ctx.lineTo(0, -starL * 0.28);
    ctx.lineTo(starL, 0);
    ctx.lineTo(0, starL * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -starL);
    ctx.lineTo(starL * 0.28, 0);
    ctx.lineTo(0, starL);
    ctx.lineTo(-starL * 0.28, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawSkeletonBoneSlash(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const headEase = 1 - Math.pow(1 - Math.min(1, progress * 1.55), 3);
  const tailEase = Math.pow(Math.max(0, (progress - 0.14) / 0.86), 2);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.1));
  const scale = slash.scale ?? 1;
  const spread = slash.arcSpread;
  const startA = -spread * 0.5 + spread * tailEase * 0.55;
  const endA = -spread * 0.5 + spread * headEase;
  if (endA - startA <= 0.05) return;

  const outerR = Math.max(22, slash.radius * scale * (0.92 + headEase * 0.1));
  const maxThick = 24 * scale * (1 - progress * 0.42);
  const steps = 22;

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  if (slash.flip) ctx.scale(1, -1);

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startA + (endA - startA) * t;
    // Serrated vertebral teeth notches along outer edge
    const tooth = i % 4 === 2 && t > 0.2 && t < 0.85 ? -4.5 * scale : 0;
    const r = outerR + tooth;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = startA + (endA - startA) * t;
    const profile = Math.sin(Math.pow(t, 0.72) * Math.PI);
    const r = Math.max(8, outerR - maxThick * profile);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();

  // Supersonic cyan-indigo aura
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.78;
  ctx.fillStyle = slash.isCrit ? '#FDE047' : '#38BDF8';
  ctx.fill();
  ctx.restore();

  // Ivory marrow gradient fill
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createRadialGradient(0, 0, Math.max(4, outerR - maxThick), 0, 0, outerR + 2);
  grad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
  grad.addColorStop(0.55, slash.isCrit ? '#FEF08A' : '#7DD3FC');
  grad.addColorStop(1, '#F8FAFC');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Triple kinetic wind ribbons trailing the heavy crescent
  ctx.globalCompositeOperation = 'lighter';
  for (let w = 0; w < 3; w++) {
    const wr = outerR - 8 - w * 9 * scale;
    if (wr < 10) continue;
    ctx.strokeStyle = w === 0 ? `rgba(248, 250, 252, ${alpha * 0.9})` : `rgba(129, 140, 248, ${alpha * 0.65})`;
    ctx.lineWidth = (3.2 - w * 0.7) * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, wr, startA + 0.12 * w, endA - 0.08 * w);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSkeletonSpearLaunch(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.9));
  const r = Math.max(14, slash.radius * (0.45 + ease * 0.65));

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  ctx.globalCompositeOperation = 'lighter';

  // Directional Mach compression ring
  ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.9})`;
  ctx.lineWidth = 4.2 * (1 - progress * 0.55);
  ctx.beginPath();
  ctx.ellipse(6 + ease * 10, 0, Math.max(3, r * 0.24), Math.max(6, r * 0.52), 0, 0, Math.PI * 2);
  ctx.stroke();

  // Piercing ivory-cyan muzzle flash spear cone
  ctx.fillStyle = `rgba(248, 250, 252, ${alpha * 0.95})`;
  ctx.beginPath();
  ctx.moveTo(0, -6 * (1 - progress * 0.5));
  ctx.lineTo(r * 1.15, 0);
  ctx.lineTo(0, 6 * (1 - progress * 0.5));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawSkeletonRibcageBurst(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2));
  const scale = slash.scale ?? 1;
  const ringR = Math.max(12, slash.radius * scale * (0.42 + ease * 0.58));

  ctx.save();
  ctx.translate(slash.x, slash.y - 4);

  // Cyan soul-marrow barrier pulse
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.85})`;
  ctx.lineWidth = 5 * (1 - progress * 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 6 interlocking curved ivory rib-arches snapping into place
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + ease * 0.35;
    ctx.save();
    ctx.translate(Math.cos(a) * ringR, Math.sin(a) * ringR);
    ctx.rotate(a + Math.PI / 2);
    ctx.strokeStyle = `rgba(248, 250, 252, ${alpha})`;
    ctx.lineWidth = 3.8 * scale * (1 - progress * 0.4);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 7 * scale, Math.max(3, 11 * scale), -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawSkeletonRushWake(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.85));
  const x0 = slash.fromX ?? slash.x - Math.cos(slash.angle) * slash.radius;
  const y0 = slash.fromY ?? slash.y - Math.sin(slash.angle) * slash.radius;
  const dx = slash.x - x0;
  const dy = slash.y - y0;
  const dist = Math.max(12, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';

  const headX = dist * Math.min(1, progress * 2.6);
  const tailX = dist * Math.max(0, (progress - 0.22) * 0.9);
  if (headX > tailX + 2) {
    // Outer indigo-cyan dash wake
    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.72})`;
    ctx.lineWidth = 18 * (1 - progress * 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, 0);
    ctx.lineTo(headX, 0);
    ctx.stroke();

    // Razor white bone-katana flash line
    ctx.strokeStyle = `rgba(248, 250, 252, ${alpha})`;
    ctx.lineWidth = 4.5 * (1 - progress * 0.45);
    ctx.beginPath();
    ctx.moveTo(tailX, 0);
    ctx.lineTo(headX, 0);
    ctx.stroke();

    // Crackling soul-lightning zig-zag along the blade wake
    ctx.strokeStyle = `rgba(165, 180, 252, ${alpha * 0.88})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const segs = 6;
    for (let s = 0; s <= segs; s++) {
      const lx = tailX + ((headX - tailX) * s) / segs;
      const ly = s === 0 || s === segs ? 0 : (s % 2 === 0 ? 7 : -7) * (1 - progress * 0.4);
      if (s === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawSkeletonBoneStormBurst(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.9));
  const maxR = Math.max(18, slash.radius * (0.35 + ease * 0.72));

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + ease * 1.4;
    ctx.strokeStyle = i % 2 === 0 ? `rgba(56, 189, 248, ${alpha * 0.9})` : `rgba(165, 180, 252, ${alpha * 0.85})`;
    ctx.lineWidth = 5 * (1 - progress * 0.55);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, maxR * (i % 2 === 0 ? 1 : 0.74), a, a + 0.88);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSkeletonColossusNova(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.85));
  const scale = slash.scale ?? 1;
  const maxR = Math.max(20, slash.radius * scale * (0.3 + ease * 0.7));

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Soulfire marrow shockwave ring
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createRadialGradient(0, 0, Math.max(2, maxR * 0.35), 0, 0, maxR);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
  grad.addColorStop(0.7, `rgba(99, 102, 241, ${alpha * 0.45})`);
  grad.addColorStop(0.95, `rgba(56, 189, 248, ${alpha * 0.9})`);
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, maxR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 8 towering ossuary bone spires erupting outward
  const spirePop = Math.sin(Math.min(1, progress * 1.35) * Math.PI);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const bx = Math.cos(a) * maxR * 0.82;
    const by = Math.sin(a) * maxR * 0.82;
    const h = 24 * scale * spirePop;
    if (h <= 2) continue;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6 * scale, 0);
    ctx.lineTo(-2 * scale, -h * 0.65);
    ctx.lineTo(0, -h);
    ctx.lineTo(2 * scale, -h * 0.65);
    ctx.lineTo(6 * scale, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(0, -h * 0.35, Math.max(1.2, 2.5 * scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawSkeletonCryptSummon(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const ease = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.9));
  const scale = slash.scale ?? 1;
  const rx = Math.max(12, slash.radius * scale * (0.48 + ease * 0.52));

  ctx.save();
  ctx.translate(slash.x, slash.y + 8);
  ctx.scale(1, 0.56);
  ctx.rotate(progress * 1.6);
  ctx.globalCompositeOperation = 'lighter';

  // Outer necromantic rune circle
  ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.92})`;
  ctx.lineWidth = 3.2 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.stroke();

  // Inscribed hexagram sigil (two interlocking triangles)
  ctx.strokeStyle = `rgba(165, 180, 252, ${alpha * 0.85})`;
  ctx.lineWidth = 2.1 * scale;
  for (let t = 0; t < 2; t++) {
    ctx.beginPath();
    for (let v = 0; v < 3; v++) {
      const a = t * (Math.PI / 3) + (v * Math.PI * 2) / 3;
      const vx = Math.cos(a) * rx * 0.88;
      const vy = Math.sin(a) * rx * 0.88;
      if (v === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();

  // Rising soulfire beacon column
  if (progress < 0.75) {
    const colA = (1 - progress / 0.75) * alpha * 0.45;
    const colW = rx * 0.55;
    ctx.save();
    ctx.translate(slash.x, slash.y + 8);
    ctx.globalCompositeOperation = 'lighter';
    const beamGrad = ctx.createLinearGradient(0, 0, 0, -52 * scale);
    beamGrad.addColorStop(0, `rgba(56, 189, 248, ${colA})`);
    beamGrad.addColorStop(1, 'rgba(129, 140, 248, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-colW, -52 * scale, colW * 2, 52 * scale);
    ctx.restore();
  }
}

function drawSkeletonReaperScythe(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.max(0, Math.min(1, 1 - slash.life / slash.maxLife));
  const headEase = 1 - Math.pow(1 - Math.min(1, progress * 1.5), 3);
  const tailEase = Math.pow(Math.max(0, (progress - 0.16) / 0.84), 2);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2));
  const scale = slash.scale ?? 1;
  const spread = slash.arcSpread;
  const startA = -spread * 0.5 + spread * tailEase * 0.45;
  const endA = -spread * 0.5 + spread * headEase;
  const outerR = Math.max(30, slash.radius * scale * (0.9 + headEase * 0.12));
  const maxThick = 34 * scale * (1 - progress * 0.38);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);

  if (endA - startA > 0.05) {
    const steps = 26;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = startA + (endA - startA) * t;
      ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const a = startA + (endA - startA) * t;
      const profile = Math.sin(Math.pow(t, 0.7) * Math.PI);
      const r = Math.max(12, outerR - maxThick * profile);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();

    // Abyssal dark-violet rift fill
    ctx.save();
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = '#1E1B4B';
    ctx.fill();
    ctx.restore();

    // Radiant amethyst-cyan soul-harvest glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.9;
    const grad = ctx.createRadialGradient(0, 0, Math.max(6, outerR - maxThick), 0, 0, outerR + 3);
    grad.addColorStop(0, 'rgba(192, 132, 252, 0.25)');
    grad.addColorStop(0.55, '#C084FC');
    grad.addColorStop(0.85, '#38BDF8');
    grad.addColorStop(1, '#F8FAFC');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // Manifested colossal spectral Reaper Scythe shaft & curved bone blade at leading edge
  ctx.save();
  ctx.rotate(endA);
  ctx.globalAlpha = alpha;
  // Scythe long snath shaft
  ctx.strokeStyle = '#1E1B4B';
  ctx.lineWidth = 6.5 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14 * scale, 0);
  ctx.lineTo(outerR * 0.96, 0);
  ctx.stroke();

  ctx.strokeStyle = '#E0E7FF';
  ctx.lineWidth = 2.6 * scale;
  ctx.beginPath();
  ctx.moveTo(-14 * scale, 0);
  ctx.lineTo(outerR * 0.96, 0);
  ctx.stroke();

  // Curved ivory-amethyst reaper scythe head
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 2.4 * scale;
  ctx.beginPath();
  ctx.moveTo(outerR * 0.92, -4 * scale);
  ctx.quadraticCurveTo(outerR * 1.06, -34 * scale, outerR * 0.62, -52 * scale);
  ctx.quadraticCurveTo(outerR * 0.88, -24 * scale, outerR * 0.82, 4 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawGhostBasicArc(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 2.1));
  const scale = slash.scale ?? 1;
  const dir = slash.flip ? -1 : 1;
  const halfSpread = slash.arcSpread * 0.5;
  const sweepStart = -halfSpread * 0.95 * dir;
  const sweepEnd = (-halfSpread * 0.95 + slash.arcSpread * (0.28 + 0.72 * easeOut)) * dir;
  const startA = Math.min(sweepStart, sweepEnd);
  const endA = Math.max(sweepStart, sweepEnd);
  const outerR = slash.radius * (0.9 + 0.12 * easeOut);
  const maxThick = (slash.isCrit ? 30 : 23) * scale * (1 - progress * 0.42);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);

  // Outer ghostly claw crescent
  const steps = 18;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = startA + (endA - startA) * t;
    ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = startA + (endA - startA) * t;
    const profile = Math.sin(Math.pow(t, 0.75) * Math.PI);
    const innerR = Math.max(10, outerR - maxThick * profile);
    ctx.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
  }
  ctx.closePath();

  // Deep shadow-amethyst base
  ctx.save();
  ctx.globalAlpha = alpha * 0.65;
  ctx.fillStyle = '#2E1065';
  ctx.fill();
  ctx.restore();

  // Additive cyan-violet ectoplasm blade glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.92;
  const grad = ctx.createRadialGradient(0, 0, Math.max(8, outerR - maxThick), 0, 0, outerR + 4);
  grad.addColorStop(0, 'rgba(192, 132, 252, 0.15)');
  grad.addColorStop(0.55, '#A855F7');
  grad.addColorStop(0.84, '#38BDF8');
  grad.addColorStop(1, '#F8FAFC');
  ctx.fillStyle = grad;
  ctx.fill();

  // Three spectral claw rake filaments inside the arc
  for (let c = -1; c <= 1; c++) {
    const clawR = outerR - (6 + (c + 1) * 4.5) * scale;
    ctx.strokeStyle = c === 0 ? '#F8FAFC' : '#67E8F9';
    ctx.lineWidth = (c === 0 ? 2.6 : 1.7) * scale * (1 - progress * 0.45);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(10, clawR), startA + 0.08, endA - 0.05);
    ctx.stroke();
  }

  // Leading astral claw spark
  const tipA = dir > 0 ? endA : startA;
  const tipX = Math.cos(tipA) * outerR;
  const tipY = Math.sin(tipA) * outerR;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.arc(tipX, tipY, 4.2 * scale * (1 - progress * 0.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawGhostVortexRend(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.9));
  const outerR = slash.radius * (0.45 + 0.62 * easeOut);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle + easeOut * Math.PI * 1.45);

  // Abyssal core shadow disc
  ctx.save();
  ctx.globalAlpha = alpha * 0.45;
  const shadowGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, outerR);
  shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
  shadowGrad.addColorStop(0.7, 'rgba(88, 28, 135, 0.45)');
  shadowGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dual counter-spiraling spectral scythe vortex blades
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let arm = 0; arm < 3; arm++) {
    const baseA = (arm * Math.PI * 2) / 3;
    ctx.strokeStyle = arm % 2 === 0 ? '#38BDF8' : '#C084FC';
    ctx.lineWidth = (11 - progress * 6) * (slash.scale ?? 1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, outerR * (0.82 + arm * 0.07), baseA, baseA + Math.PI * 1.18);
    ctx.stroke();

    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2.6 * (1 - progress * 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, outerR * (0.84 + arm * 0.07), baseA + 0.15, baseA + Math.PI * 0.95);
    ctx.stroke();
  }

  // Outer expanding ectoplasm shock ring
  ctx.strokeStyle = `rgba(103, 232, 249, ${alpha * 0.8})`;
  ctx.lineWidth = 3 * (1 - progress * 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, outerR * 1.05, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawGhostImpactRing(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - progress * progress);
  const r = slash.radius * (0.35 + 0.75 * progress);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = slash.color || '#67E8F9';
  ctx.lineWidth = 4.2 * (1 - progress * 0.7);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 4-point astral star flash
  const starLen = r * 1.25 * (1 - progress * 0.45);
  const starThin = starLen * 0.18;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const midA = a + Math.PI / 4;
    const px = Math.cos(a) * starLen;
    const py = Math.sin(a) * starLen;
    const mx = Math.cos(midA) * starThin;
    const my = Math.sin(midA) * starThin;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    ctx.lineTo(mx, my);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawGhostBoltCast(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - progress * progress);
  const r = slash.radius * (0.65 + 0.45 * progress);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  // Arcane focusing crescent sigil
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 5 * (1 - progress * 0.55);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r, -0.95, 0.95);
  ctx.stroke();

  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 2.6 * (1 - progress * 0.5);
  ctx.beginPath();
  ctx.arc(-4, 0, r * 0.74, -1.1, 1.1);
  ctx.stroke();

  // Forward launch chevron
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -10 * (1 - progress * 0.4));
  ctx.lineTo(r * 1.28, 0);
  ctx.lineTo(r * 0.55, 10 * (1 - progress * 0.4));
  ctx.stroke();

  ctx.restore();
}

function drawGhostMistWake(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.7));
  const r = slash.radius * (0.45 + 0.65 * progress);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(slash.angle + progress * 1.8);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.85;

  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    ctx.strokeStyle = i % 2 === 0 ? '#67E8F9' : '#C084FC';
    ctx.lineWidth = 5.5 * (1 - progress * 0.65);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.75 + i * 0.12), a, a + 1.45);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGhostSoulDrainPulse(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, Math.sin(progress * Math.PI) * 0.95);
  // Inward-contracting siphon ring!
  const r = slash.radius * (1.05 - 0.62 * progress);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = '#34D399';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(8, r), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 6 inward-pulling soul motes
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6 + progress * 2.4;
    const mx = Math.cos(a) * r;
    const my = Math.sin(a) * r;
    ctx.fillStyle = i % 2 === 0 ? '#6EE7B7' : '#67E8F9';
    ctx.beginPath();
    ctx.arc(mx, my, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawGhostWailingScream(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 2.6);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
  const maxR = slash.radius * (0.24 + 0.82 * easeOut);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.globalCompositeOperation = 'lighter';

  // Three concentric jagged sonic banshee shockwaves
  for (let ring = 0; ring < 3; ring++) {
    const rr = maxR * (1 - ring * 0.22);
    if (rr <= 8) continue;
    ctx.save();
    ctx.globalAlpha = alpha * (1 - ring * 0.25);
    ctx.strokeStyle = ring === 0 ? '#F8FAFC' : ring === 1 ? '#67E8F9' : '#C084FC';
    ctx.lineWidth = (5.5 - ring * 1.3) * (1 - progress * 0.5);
    ctx.beginPath();
    const segs = 36;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const jag = Math.sin(i * 5 + progress * 22) * (6 - ring * 1.5) * (1 - progress * 0.4);
      const px = Math.cos(a) * (rr + jag);
      const py = Math.sin(a) * (rr + jag);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawGhostPossessPulse(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
  const r = slash.radius * (0.42 + 0.65 * progress);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(progress * Math.PI * 1.2);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  // Magenta-violet puppet hex ring
  ctx.strokeStyle = '#E879F9';
  ctx.lineWidth = 4.5 * (1 - progress * 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Four puppet-string cross slashes cleaving surrounding enemies
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.strokeStyle = i % 2 === 0 ? '#F0ABFC' : '#38BDF8';
    ctx.lineWidth = 3.2 * (1 - progress * 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, a - 0.45, a + 0.45);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGhostExorcismBurst(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.75));
  const r = slash.radius * (0.28 + 0.82 * easeOut);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, r);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.45, 'rgba(232, 121, 249, 0.8)');
  grad.addColorStop(0.8, 'rgba(56, 189, 248, 0.45)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 6-spike spectral exorcism star
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 3.6 * (1 - progress * 0.55);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + slash.angle;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
    ctx.lineTo(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGhostNightmareNova(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 2.8);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
  const r = slash.radius * (0.2 + 0.88 * easeOut);

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Expanding abyssal dread shadow wave
  ctx.save();
  ctx.globalAlpha = alpha * 0.65;
  ctx.strokeStyle = '#1E1B4B';
  ctx.lineWidth = 18 * (1 - progress * 0.55);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Glowing violet-crimson nightmare rim + spectral eyes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#A855F7';
  ctx.lineWidth = 6 * (1 - progress * 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + progress * 1.1;
    const ex = Math.cos(a) * r * 0.78;
    const ey = Math.sin(a) * r * 0.78;
    ctx.fillStyle = '#F472B6';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 6 * (1 - progress * 0.4), 2.6 * (1 - progress * 0.4), a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

function drawGhostSpiritRing(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 2.6);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.85));
  const r = slash.radius * (0.35 + 0.72 * easeOut);

  ctx.save();
  ctx.translate(slash.x, slash.y);
  ctx.rotate(-progress * 1.4);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 5 * (1 - progress * 0.55);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#C084FC';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
  ctx.stroke();

  // 8 radial summoning rays
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2.4 * (1 - progress * 0.5);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65);
    ctx.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGhostPassageDetonation(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const easeOut = 1 - Math.pow(1 - progress, 3.2);
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.7));
  const r = slash.radius * (0.18 + 0.92 * easeOut);

  ctx.save();
  ctx.translate(slash.x, slash.y);

  // Dark void core flash
  ctx.save();
  ctx.globalAlpha = alpha * 0.72;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55 * (1 - progress * 0.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Cataclysmic cyan-amethyst rift supernova
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.35, 'rgba(103, 232, 249, 0.92)');
  grad.addColorStop(0.72, 'rgba(168, 85, 247, 0.75)');
  grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Dual shockwave rings
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 6.5 * (1 - progress * 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 4 * (1 - progress * 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.stroke();

  // 8-point astral rift flare
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + progress * 0.4;
    const len = r * (i % 2 === 0 ? 1.18 : 0.85);
    ctx.strokeStyle = i % 2 === 0 ? '#F8FAFC' : '#C084FC';
    ctx.lineWidth = (i % 2 === 0 ? 4.2 : 2.6) * (1 - progress * 0.55);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function drawGhostRestlessSurge(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  const progress = Math.min(1, Math.max(0, 1 - slash.life / slash.maxLife));
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
  const r = slash.radius * (0.5 + 0.6 * progress);

  ctx.save();
  ctx.translate(slash.x, slash.y - progress * 10);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = '#67E8F9';
  ctx.lineWidth = 3.8 * (1 - progress * 0.55);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.58, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#E879F9';
  ctx.lineWidth = 2.2 * (1 - progress * 0.5);
  ctx.beginPath();
  ctx.ellipse(0, -6 * progress, r * 0.72, r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawSlashArc(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
  if (slash.kind === 'GHOST_BASIC_ARC') {
    drawGhostBasicArc(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_VORTEX_REND') {
    drawGhostVortexRend(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_IMPACT_RING') {
    drawGhostImpactRing(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_BOLT_CAST') {
    drawGhostBoltCast(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_MIST_WAKE') {
    drawGhostMistWake(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_SOUL_DRAIN_PULSE') {
    drawGhostSoulDrainPulse(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_WAILING_SCREAM') {
    drawGhostWailingScream(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_POSSESS_PULSE') {
    drawGhostPossessPulse(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_EXORCISM_BURST') {
    drawGhostExorcismBurst(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_NIGHTMARE_NOVA') {
    drawGhostNightmareNova(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_SPIRIT_RING') {
    drawGhostSpiritRing(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_PASSAGE_DETONATION') {
    drawGhostPassageDetonation(ctx, slash);
    return;
  }
  if (slash.kind === 'GHOST_RESTLESS_SURGE') {
    drawGhostRestlessSurge(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_BASIC_ATTACK') {
    drawSkeletonBasicAttack(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_TWIN_CLEAVE') {
    drawSkeletonTwinCleave(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_BONE_SLASH') {
    drawSkeletonBoneSlash(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_SPEAR_LAUNCH') {
    drawSkeletonSpearLaunch(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_RIBCAGE_BURST') {
    drawSkeletonRibcageBurst(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_RUSH_WAKE') {
    drawSkeletonRushWake(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_BONE_STORM_BURST') {
    drawSkeletonBoneStormBurst(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_COLOSSUS_NOVA') {
    drawSkeletonColossusNova(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_CRYPT_SUMMON') {
    drawSkeletonCryptSummon(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_REAPER_SCYTHE') {
    drawSkeletonReaperScythe(ctx, slash);
    return;
  }
  if (slash.kind === 'SKELETON_IMPACT_FLASH') {
    drawSkeletonImpactFlash(ctx, slash);
    return;
  }
  if (slash.kind === 'ZOMBIE_BASIC_ATTACK') {
    drawZombieBasicAttack(ctx, slash);
    return;
  }
  if (slash.kind === 'ZOMBIE_SAVAGE_REND') {
    drawZombieSavageRend(ctx, slash);
    return;
  }
  if (slash.kind === 'ZOMBIE_PLAGUE_NOVA') {
    drawZombiePlagueNova(ctx, slash);
    return;
  }
  if (slash.kind === 'ZOMBIE_FLESH_RIPPER_WAKE') {
    drawZombieFleshRipperWake(ctx, slash);
    return;
  }
  if (slash.kind === 'ZOMBIE_UNDYING_PULSE') {
    drawZombieUndyingPulse(ctx, slash);
    return;
  }
  if (slash.kind === 'ZOMBIE_GRAVE_ERUPTION') {
    drawZombieGraveEruption(ctx, slash);
    return;
  }
  if (slash.kind === 'ZOMBIE_ABOMINATION_NOVA') {
    drawZombieAbominationNova(ctx, slash);
    return;
  }
  if (slash.kind === 'ZOMBIE_POISON_BURST') {
    drawZombiePoisonBurst(ctx, slash);
    return;
  }
  if (slash.kind === 'GOBLIN_BASIC_ATTACK') {
    drawGoblinBasicAttack(ctx, slash);
    return;
  }
  if (slash.kind === 'GOBLIN_TWIN_CROSS') {
    drawGoblinTwinCross(ctx, slash);
    return;
  }
  if (slash.kind === 'GOBLIN_FLURRY_THRUST') {
    drawGoblinFlurryThrust(ctx, slash);
    return;
  }
  if (slash.kind === 'GOBLIN_BACKSTAB_X') {
    drawGoblinBackstabX(ctx, slash);
    return;
  }
  if (slash.kind === 'GOBLIN_TRAP_BLAST') {
    drawGoblinTrapBlast(ctx, slash);
    return;
  }
  if (slash.kind === 'GOBLIN_VENOM_COAT') {
    drawGoblinVenomCoat(ctx, slash);
    return;
  }
  if (slash.kind === 'GOBLIN_SHADOW_TRACE') {
    drawGoblinShadowTrace(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_BASIC_ATTACK') {
    drawGnomeBasicAttack(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_SEISMIC_SLAM') {
    drawGnomeSeismicSlam(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_IMPACT_CRACK') {
    drawGnomeImpactCrack(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_IRON_FIST_WAVE') {
    drawGnomeIronFistWave(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_FORTRESS_AEGIS') {
    drawGnomeFortressAegis(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_CRATER_SLAM') {
    drawGnomeCraterSlam(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_MAGNETIC_PULSE') {
    drawGnomeMagneticPulse(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_MAGNETIC_ARC') {
    drawGnomeMagneticArc(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_MOUNTAIN_NOVA') {
    drawGnomeMountainNova(ctx, slash);
    return;
  }
  if (slash.kind === 'GNOME_CATACLYSM_RING') {
    drawGnomeCataclysmRing(ctx, slash);
    return;
  }

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

function drawProjectile(ctx: CanvasRenderingContext2D, proj: ProjectileEntity, time: number): void {
  ctx.save();
  ctx.translate(proj.x, proj.y);
  ctx.rotate(proj.angle);

  if (proj.kind === 'PLAYER_BONE_SPEAR') {
    // Supersonic cyan marrow wake + spiraling helix ribbon
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(186, 230, 253, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let s = 0; s <= 8; s++) {
      const sx = -26 + s * 4.5;
      const sy = Math.sin(time * 28 + s * 1.1) * 4.5;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();

    // Carved ivory bone spear shaft & barbed ossuary tip
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -2.5);
    ctx.lineTo(6, -2.5);
    ctx.lineTo(3, -7);
    ctx.lineTo(21, 0);
    ctx.lineTo(3, 7);
    ctx.lineTo(6, 2.5);
    ctx.lineTo(-20, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (proj.kind === 'PLAYER_DARK_WAVE') {
    // Reaper's Judgment abyssal soul-harvest crescent wave
    ctx.strokeStyle = 'rgba(30, 27, 75, 0.85)';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-15, 0, 38, -0.92, 0.92);
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-14, 0, 38, -0.88, 0.88);
    ctx.stroke();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.arc(-12, 0, 38, -0.72, 0.72);
    ctx.stroke();

    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-10, 0, 38, -0.52, 0.52);
    ctx.stroke();
    ctx.restore();
  } else if (proj.kind === 'PLAYER_ENCHANTED_DAGGER') {
    // Enchanted emerald-gold throwing dagger (Thousand Daggers)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(4, 0);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#120F17';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-11, -2.2);
    ctx.lineTo(3, -4.2);
    ctx.lineTo(16, 0);
    ctx.lineTo(3, 4.2);
    ctx.lineTo(-11, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Emerald core fuller
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
  } else if (proj.kind === 'PLAYER_SPECTRAL_BOLT') {
    // 60fps Concentrated Piercing Spectral Lance with spiraling cyan-violet ectoplasm helix
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.72)';
    ctx.lineWidth = 8.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(103, 232, 249, 0.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let s = 0; s <= 8; s++) {
      const sx = -26 + s * 5;
      const sy = Math.sin(time * 30 + s * 1.15) * 4.5;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = '#C084FC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(2, -6.5, 20, 0);
    ctx.quadraticCurveTo(2, 6.5, -14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (proj.kind === 'PLAYER_SPIRIT_ORB') {
    // Wandering Spirit Orb with trailing ectoplasm tail & glowing eyes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const wag = Math.sin(time * 24 + proj.id) * 3.5;
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.moveTo(-18, wag);
    ctx.quadraticCurveTo(-4, -8, 9, 0);
    ctx.quadraticCurveTo(-4, 8, -18, wag);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(3, 0, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
  const isGhost = player.characterId === CharacterId.Ghost;
  const pGrad = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 95);
  pGrad.addColorStop(
    0,
    isSkel
      ? 'rgba(56, 189, 248, 0.08)'
      : isGob
      ? 'rgba(245, 158, 11, 0.08)'
      : isGnome
      ? 'rgba(251, 146, 60, 0.09)'
      : isGhost
      ? 'rgba(192, 132, 252, 0.11)'
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
      : isGhost
      ? 'rgba(192, 132, 252, 0)'
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
