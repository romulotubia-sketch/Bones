import type {
  EnemyStatusPayload,
  PvpBaseSyncState,
  PvpMatchSyncState,
  PvpMinionSyncState,
  PvpPlayerStats,
  PvpTeam,
  ServerMessage,
} from './src/multiplayer/networkTypes.ts';
import { CharacterId } from './src/types/game.ts';

export interface ServerPlayerPvpState {
  id: string;
  name: string;
  team: PvpTeam;
  characterId: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aimAngle: number;
  facingX: number;
  walkPhase: number;
  hp: number;
  maxHp: number;
  isDowned: boolean;
  isRespawning: boolean;
  respawnTimer: number;
  invulnTimer: number;
  kills: number;
  deaths: number;
  damageDealt: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  dashTimer: number;
  leapAirProgress: number;
  comboFlip: boolean;
  activeBuffs: {
    undying: boolean;
    abomination: boolean;
    ribcageCharges: number;
    boneStorm: boolean;
    colossus: boolean;
    windrunner: boolean;
    poisonBlades?: boolean;
    stolenMight?: boolean;
    fortress: boolean;
    magnetic?: boolean;
    mountainHeart: boolean;
    restless: boolean;
    soulDrain?: boolean;
    nightmare: boolean;
    tinkerHaste?: boolean;
    rapidReload?: boolean;
    arsenal?: boolean;
  };
}

export interface ServerPvpMinion {
  id: number;
  team: PvpTeam;
  kind: 'MELEE' | 'RANGED';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facingX: number;
  aiState: 'MARCH' | 'ATTACK' | 'COOLDOWN' | 'DEATH';
  attackCooldown: number;
  attackAngle: number;
  hitFlashTimer: number;
  laneTargetY: number;
}

interface PvpSessionHooks {
  broadcast: (msg: ServerMessage, excludePlayerId?: string) => void;
  getPartyPlayers: () => {
    id: string;
    name: string;
    characterId: CharacterId;
    team?: PvpTeam;
  }[];
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export const ARENA_CONFIG = {
  LANE_LEFT: -920,
  LANE_RIGHT: 920,
  LANE_TOP: -180,
  LANE_BOTTOM: 180,
  BLUE_BASE_X: -740,
  BLUE_BASE_Y: 0,
  BLUE_SPAWN_X: -870,
  BLUE_SPAWN_Y: 0,
  RED_BASE_X: 740,
  RED_BASE_Y: 0,
  RED_SPAWN_X: 870,
  RED_SPAWN_Y: 0,
  BASE_MAX_HP: 3200,
  BASE_ATTACK_RADIUS: 240,
  RESPAWN_DELAY: 6.0,
  RESPAWN_INVULN: 3.5,
  WAVE_INTERVAL: 18.0,
};

export class ServerPvpSession {
  public matchTime = 0;
  public blueScore = 0;
  public redScore = 0;
  public isMatchEnded = false;
  public winnerTeam?: PvpTeam;

  public blueBase: PvpBaseSyncState = {
    hp: ARENA_CONFIG.BASE_MAX_HP,
    maxHp: ARENA_CONFIG.BASE_MAX_HP,
    x: ARENA_CONFIG.BLUE_BASE_X,
    y: ARENA_CONFIG.BLUE_BASE_Y,
    isDestroyed: false,
    hitFlashTimer: 0,
  };

  public redBase: PvpBaseSyncState = {
    hp: ARENA_CONFIG.BASE_MAX_HP,
    maxHp: ARENA_CONFIG.BASE_MAX_HP,
    x: ARENA_CONFIG.RED_BASE_X,
    y: ARENA_CONFIG.RED_BASE_Y,
    isDestroyed: false,
    hitFlashTimer: 0,
  };

  public players = new Map<string, ServerPlayerPvpState>();
  public minions = new Map<number, ServerPvpMinion>();

  private nextEntityId = 10000;
  private minionSpawnTimer = 3.0; // Initial wave arrives quickly (3s)
  private processedEventIds = new Set<string>();

  constructor(private hooks: PvpSessionHooks) {
    this.ensurePartyPlayersSynced();
  }

  private allocId(): number {
    return this.nextEntityId++;
  }

  private recordEventId(eventId?: string): boolean {
    if (!eventId) return true;
    if (this.processedEventIds.has(eventId)) return false;
    this.processedEventIds.add(eventId);
    if (this.processedEventIds.size > 2500) {
      const iter = this.processedEventIds.values();
      for (let i = 0; i < 500; i++) {
        const val = iter.next().value;
        if (val) this.processedEventIds.delete(val);
      }
    }
    return true;
  }

  public ensurePartyPlayersSynced() {
    const party = this.hooks.getPartyPlayers();
    const activeIds = new Set(party.map((p) => p.id));

    let blueCount = 0;
    let redCount = 0;
    for (const p of this.players.values()) {
      if (p.team === 'BLUE') blueCount++;
      else redCount++;
    }

    for (let i = 0; i < party.length; i++) {
      const member = party[i];
      let pState = this.players.get(member.id);
      if (!pState) {
        // Auto-assign teams fairly if not set (alternating Blue / Red)
        let assignedTeam: PvpTeam = member.team || (blueCount <= redCount ? 'BLUE' : 'RED');
        if (assignedTeam === 'BLUE') blueCount++;
        else redCount++;

        const spawnX =
          assignedTeam === 'BLUE'
            ? ARENA_CONFIG.BLUE_SPAWN_X
            : ARENA_CONFIG.RED_SPAWN_X;
        const spawnY = (i % 2 === 0 ? -1 : 1) * 28;

        pState = {
          id: member.id,
          name: member.name,
          team: assignedTeam,
          characterId: member.characterId,
          x: spawnX,
          y: spawnY,
          vx: 0,
          vy: 0,
          aimAngle: assignedTeam === 'BLUE' ? 0 : Math.PI,
          facingX: assignedTeam === 'BLUE' ? 1 : -1,
          walkPhase: 0,
          hp: 160,
          maxHp: 160,
          isDowned: false,
          isRespawning: false,
          respawnTimer: 0,
          invulnTimer: ARENA_CONFIG.RESPAWN_INVULN,
          kills: 0,
          deaths: 0,
          damageDealt: 0,
          hitFlashTimer: 0,
          squashX: 1,
          squashY: 1,
          dashTimer: 0,
          leapAirProgress: 0,
          comboFlip: false,
          activeBuffs: {
            undying: false,
            abomination: false,
            ribcageCharges: 0,
            boneStorm: false,
            colossus: false,
            windrunner: false,
            fortress: false,
            mountainHeart: false,
            restless: false,
            nightmare: false,
          },
        };
        this.players.set(member.id, pState);
      } else {
        pState.name = member.name;
        pState.characterId = member.characterId;
        if (member.team) pState.team = member.team;
      }
    }

    for (const id of Array.from(this.players.keys())) {
      if (!activeIds.has(id)) {
        this.players.delete(id);
      }
    }
  }

  public setPlayerTeam(playerId: string, team: PvpTeam) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.team = team;
    p.x = team === 'BLUE' ? ARENA_CONFIG.BLUE_SPAWN_X : ARENA_CONFIG.RED_SPAWN_X;
    p.y = 0;
    p.hp = p.maxHp;
    p.invulnTimer = 2.0;
  }

  public syncPlayerTransform(
    playerId: string,
    transform: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      aimAngle: number;
      facingX: number;
      walkPhase: number;
      hp: number;
      maxHp: number;
      hitFlashTimer: number;
      squashX: number;
      squashY: number;
      dashTimer: number;
      leapAirProgress: number;
      comboFlip?: boolean;
      activeBuffs: ServerPlayerPvpState['activeBuffs'];
    }
  ) {
    const p = this.players.get(playerId);
    if (!p || p.isRespawning) return;

    p.x = transform.x;
    p.y = transform.y;
    p.vx = transform.vx;
    p.vy = transform.vy;
    p.aimAngle = transform.aimAngle;
    p.facingX = transform.facingX;
    p.walkPhase = transform.walkPhase;
    p.squashX = transform.squashX;
    p.squashY = transform.squashY;
    p.dashTimer = transform.dashTimer;
    p.leapAirProgress = transform.leapAirProgress;
    p.comboFlip = Boolean(transform.comboFlip);
    p.activeBuffs = transform.activeBuffs;
  }

  public handleDamagePvpPlayer(
    attackerId: string,
    eventId: string,
    targetPlayerId: string,
    rawDamage: number,
    isCrit?: boolean,
    hitX?: number,
    hitY?: number
  ) {
    if (!this.recordEventId(eventId)) return;
    if (this.isMatchEnded) return;

    const attacker = this.players.get(attackerId);
    const target = this.players.get(targetPlayerId);
    if (!attacker || !target) return;
    if (attacker.team === target.team) return; // No friendly fire!
    if (target.isRespawning || target.invulnTimer > 0) return; // Invulnerability shield active!

    const damage = Math.max(1, Math.min(9999, Math.round(rawDamage)));
    attacker.damageDealt += damage;
    target.hp = Math.max(0, target.hp - damage);
    target.hitFlashTimer = 0.12;

    this.hooks.broadcast({
      type: 'S2C_PLAYER_DAMAGED',
      targetPlayerId: target.id,
      damage,
      newHp: target.hp,
      maxHp: target.maxHp,
    });

    if (target.hp <= 0) {
      target.isRespawning = true;
      target.respawnTimer = ARENA_CONFIG.RESPAWN_DELAY;
      target.deaths += 1;
      attacker.kills += 1;

      if (attacker.team === 'BLUE') this.blueScore++;
      else this.redScore++;

      this.hooks.broadcast({
        type: 'S2C_PVP_PLAYER_ELIMINATED',
        victimId: target.id,
        victimName: target.name,
        victimTeam: target.team,
        killerId: attacker.id,
        killerName: attacker.name,
        killerTeam: attacker.team,
        respawnDelay: ARENA_CONFIG.RESPAWN_DELAY,
      });
    }
  }

  public handleDamageBase(
    attackerId: string,
    eventId: string,
    targetTeam: PvpTeam,
    rawDamage: number,
    isCrit?: boolean,
    hitX?: number,
    hitY?: number
  ) {
    if (!this.recordEventId(eventId)) return;
    if (this.isMatchEnded) return;

    const attacker = this.players.get(attackerId);
    if (attacker && attacker.team === targetTeam) return; // Cannot attack own base

    const base = targetTeam === 'BLUE' ? this.blueBase : this.redBase;
    if (base.isDestroyed || base.hp <= 0) return;

    const damage = Math.max(1, Math.min(9999, Math.round(rawDamage)));
    if (attacker) attacker.damageDealt += damage;

    base.hp = Math.max(0, base.hp - damage);
    base.hitFlashTimer = 0.15;

    this.hooks.broadcast({
      type: 'S2C_PVP_BASE_DAMAGED',
      team: targetTeam,
      newHp: base.hp,
      maxHp: base.maxHp,
      damage,
      attackerId,
      hitX: hitX || base.x,
      hitY: hitY || base.y,
    });

    if (base.hp <= 0) {
      base.isDestroyed = true;
      this.isMatchEnded = true;
      this.winnerTeam = targetTeam === 'BLUE' ? 'RED' : 'BLUE';

      this.hooks.broadcast({
        type: 'S2C_PVP_BASE_DESTROYED',
        winningTeam: this.winnerTeam,
        destroyedTeam: targetTeam,
      });

      this.hooks.broadcast({
        type: 'S2C_PVP_MATCH_ENDED',
        winningTeam: this.winnerTeam,
        blueScore: this.blueScore,
        redScore: this.redScore,
        matchDuration: Math.round(this.matchTime),
      });
    }
  }

  public handleDamageMinion(
    attackerId: string,
    eventId: string,
    minionId: number,
    rawDamage: number,
    isCrit?: boolean,
    hitX?: number,
    hitY?: number
  ) {
    if (!this.recordEventId(eventId)) return;
    if (this.isMatchEnded) return;

    const minion = this.minions.get(minionId);
    if (!minion || minion.hp <= 0) return;

    const attacker = this.players.get(attackerId);
    if (attacker && attacker.team === minion.team) return; // Cannot damage friendly minion

    const damage = Math.max(1, Math.min(9999, Math.round(rawDamage)));
    if (attacker) attacker.damageDealt += damage;

    minion.hp = Math.max(0, minion.hp - damage);
    minion.hitFlashTimer = 0.1;

    this.hooks.broadcast({
      type: 'S2C_PVP_MINION_DAMAGED',
      minionId: minion.id,
      newHp: minion.hp,
      maxHp: minion.maxHp,
      damage,
      isCrit,
      hitX: hitX || minion.x,
      hitY: hitY || minion.y,
      attackerId,
    });

    if (minion.hp <= 0) {
      this.minions.delete(minion.id);
      this.hooks.broadcast({
        type: 'S2C_PVP_MINION_DEFEATED',
        minionId: minion.id,
        killerId: attackerId,
        dropX: minion.x,
        dropY: minion.y,
      });
    }
  }

  public handleRequestRematch() {
    this.matchTime = 0;
    this.blueScore = 0;
    this.redScore = 0;
    this.isMatchEnded = false;
    this.winnerTeam = undefined;

    this.blueBase.hp = ARENA_CONFIG.BASE_MAX_HP;
    this.blueBase.isDestroyed = false;
    this.blueBase.hitFlashTimer = 0;

    this.redBase.hp = ARENA_CONFIG.BASE_MAX_HP;
    this.redBase.isDestroyed = false;
    this.redBase.hitFlashTimer = 0;

    this.minions.clear();
    this.minionSpawnTimer = 2.5;

    for (const p of this.players.values()) {
      p.hp = p.maxHp;
      p.isRespawning = false;
      p.respawnTimer = 0;
      p.invulnTimer = ARENA_CONFIG.RESPAWN_INVULN;
      p.x = p.team === 'BLUE' ? ARENA_CONFIG.BLUE_SPAWN_X : ARENA_CONFIG.RED_SPAWN_X;
      p.y = 0;
      p.kills = 0;
      p.deaths = 0;
      p.damageDealt = 0;
    }

    this.hooks.broadcast({
      type: 'S2C_PVP_SYNC',
      matchState: this.buildMatchSyncState(),
    });
  }

  public handlePlayerDisconnect(playerId: string) {
    this.players.delete(playerId);
  }

  private spawnMinionWave() {
    const laneOffsets = [-36, 0, 36];

    // Spawn Blue wave marching East
    for (let i = 0; i < 3; i++) {
      const isRanged = i === 1;
      const id = this.allocId();
      this.minions.set(id, {
        id,
        team: 'BLUE',
        kind: isRanged ? 'RANGED' : 'MELEE',
        x: ARENA_CONFIG.BLUE_BASE_X + 50,
        y: laneOffsets[i],
        vx: isRanged ? 78 : 88,
        vy: 0,
        hp: isRanged ? 160 : 240,
        maxHp: isRanged ? 160 : 240,
        facingX: 1,
        aiState: 'MARCH',
        attackCooldown: 0.5 + i * 0.2,
        attackAngle: 0,
        hitFlashTimer: 0,
        laneTargetY: laneOffsets[i],
      });
    }

    // Spawn Red wave marching West
    for (let i = 0; i < 3; i++) {
      const isRanged = i === 1;
      const id = this.allocId();
      this.minions.set(id, {
        id,
        team: 'RED',
        kind: isRanged ? 'RANGED' : 'MELEE',
        x: ARENA_CONFIG.RED_BASE_X - 50,
        y: laneOffsets[i],
        vx: -(isRanged ? 78 : 88),
        vy: 0,
        hp: isRanged ? 160 : 240,
        maxHp: isRanged ? 160 : 240,
        facingX: -1,
        aiState: 'MARCH',
        attackCooldown: 0.5 + i * 0.2,
        attackAngle: Math.PI,
        hitFlashTimer: 0,
        laneTargetY: laneOffsets[i],
      });
    }
  }

  private stepMinions(dt: number) {
    const livingMinions = Array.from(this.minions.values()).filter((m) => m.hp > 0);

    for (const m of livingMinions) {
      m.hitFlashTimer = Math.max(0, m.hitFlashTimer - dt);
      m.attackCooldown = Math.max(0, m.attackCooldown - dt);

      // Target selection: enemy minions > enemy players > enemy base
      const enemyTeam = m.team === 'BLUE' ? 'RED' : 'BLUE';
      const enemyMinions = livingMinions.filter((o) => o.team === enemyTeam);
      const enemyPlayers = Array.from(this.players.values()).filter(
        (p) => p.team === enemyTeam && !p.isRespawning && p.invulnTimer <= 0
      );
      const enemyBase = m.team === 'BLUE' ? this.redBase : this.blueBase;

      const isRanged = m.kind === 'RANGED';
      const engageRadius = isRanged ? 220 : 54;
      const marchSpeed = isRanged ? 76 : 88;

      let targetPos: { x: number; y: number; type: 'MINION' | 'PLAYER' | 'BASE'; ref?: any } | null = null;
      let closestDist = Infinity;

      // 1. Check opposing minions within acquisition range
      for (const em of enemyMinions) {
        const d = distance(m.x, m.y, em.x, em.y);
        if (d <= (isRanged ? 240 : 160) && d < closestDist) {
          closestDist = d;
          targetPos = { x: em.x, y: em.y, type: 'MINION', ref: em };
        }
      }

      // 2. Check opposing players
      if (!targetPos) {
        for (const ep of enemyPlayers) {
          const d = distance(m.x, m.y, ep.x, ep.y);
          if (d <= (isRanged ? 200 : 140) && d < closestDist) {
            closestDist = d;
            targetPos = { x: ep.x, y: ep.y, type: 'PLAYER', ref: ep };
          }
        }
      }

      // 3. Check enemy base
      if (!targetPos && !enemyBase.isDestroyed) {
        const d = distance(m.x, m.y, enemyBase.x, enemyBase.y);
        if (d <= (isRanged ? 240 : 90)) {
          targetPos = { x: enemyBase.x, y: enemyBase.y, type: 'BASE' };
          closestDist = d;
        }
      }

      if (targetPos) {
        const ang = Math.atan2(targetPos.y - m.y, targetPos.x - m.x);
        m.attackAngle = ang;
        m.facingX = targetPos.x >= m.x ? 1 : -1;

        if (closestDist <= engageRadius) {
          // Within striking distance!
          m.vx = 0;
          m.vy = 0;
          m.aiState = 'ATTACK';

          if (m.attackCooldown <= 0) {
            m.attackCooldown = isRanged ? 1.6 : 1.3;
            const dmg = isRanged ? 16 : 22;

            this.hooks.broadcast({
              type: 'S2C_PVP_MINION_ATTACK_FX',
              minionId: m.id,
              team: m.team,
              kind: m.kind,
              x: m.x,
              y: m.y,
              targetX: targetPos.x,
              targetY: targetPos.y,
            });

            if (targetPos.type === 'MINION') {
              const victim = targetPos.ref as ServerPvpMinion;
              victim.hp = Math.max(0, victim.hp - dmg);
              victim.hitFlashTimer = 0.1;
              if (victim.hp <= 0) {
                this.minions.delete(victim.id);
                this.hooks.broadcast({
                  type: 'S2C_PVP_MINION_DEFEATED',
                  minionId: victim.id,
                  killerId: `minion_${m.id}`,
                  dropX: victim.x,
                  dropY: victim.y,
                });
              }
            } else if (targetPos.type === 'PLAYER') {
              const victim = targetPos.ref as ServerPlayerPvpState;
              victim.hp = Math.max(0, victim.hp - dmg);
              victim.hitFlashTimer = 0.1;
              this.hooks.broadcast({
                type: 'S2C_PLAYER_DAMAGED',
                targetPlayerId: victim.id,
                damage: dmg,
                newHp: victim.hp,
                maxHp: victim.maxHp,
              });
              if (victim.hp <= 0) {
                victim.isRespawning = true;
                victim.respawnTimer = ARENA_CONFIG.RESPAWN_DELAY;
                victim.deaths += 1;
                if (m.team === 'BLUE') this.blueScore++;
                else this.redScore++;
                this.hooks.broadcast({
                  type: 'S2C_PVP_PLAYER_ELIMINATED',
                  victimId: victim.id,
                  victimName: victim.name,
                  victimTeam: victim.team,
                  killerId: `minion_${m.id}`,
                  killerName: `${m.team === 'BLUE' ? 'Blue' : 'Red'} Minion`,
                  killerTeam: m.team,
                  respawnDelay: ARENA_CONFIG.RESPAWN_DELAY,
                });
              }
            } else if (targetPos.type === 'BASE') {
              enemyBase.hp = Math.max(0, enemyBase.hp - dmg);
              enemyBase.hitFlashTimer = 0.15;
              this.hooks.broadcast({
                type: 'S2C_PVP_BASE_DAMAGED',
                team: enemyTeam,
                newHp: enemyBase.hp,
                maxHp: enemyBase.maxHp,
                damage: dmg,
                attackerId: `minion_${m.id}`,
                hitX: enemyBase.x,
                hitY: enemyBase.y,
              });
              if (enemyBase.hp <= 0 && !this.isMatchEnded) {
                enemyBase.isDestroyed = true;
                this.isMatchEnded = true;
                this.winnerTeam = m.team;
                this.hooks.broadcast({
                  type: 'S2C_PVP_BASE_DESTROYED',
                  winningTeam: m.team,
                  destroyedTeam: enemyTeam,
                });
                this.hooks.broadcast({
                  type: 'S2C_PVP_MATCH_ENDED',
                  winningTeam: m.team,
                  blueScore: this.blueScore,
                  redScore: this.redScore,
                  matchDuration: Math.round(this.matchTime),
                });
              }
            }
          }
        } else {
          // Move towards target
          m.aiState = 'MARCH';
          m.vx = Math.cos(ang) * marchSpeed;
          m.vy = Math.sin(ang) * marchSpeed;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
        }
      } else {
        // No enemy in combat range -> march steadily down the lane
        m.aiState = 'MARCH';
        const marchDir = m.team === 'BLUE' ? 1 : -1;
        m.facingX = marchDir;
        m.vx = marchDir * marchSpeed;
        m.vy = (m.laneTargetY - m.y) * 1.5;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
      }
    }
  }

  public step(dt = 0.05) {
    if (!this.isMatchEnded) {
      this.matchTime += dt;
      this.minionSpawnTimer -= dt;
      if (this.minionSpawnTimer <= 0) {
        this.minionSpawnTimer = ARENA_CONFIG.WAVE_INTERVAL;
        this.spawnMinionWave();
      }
    }

    this.blueBase.hitFlashTimer = Math.max(0, this.blueBase.hitFlashTimer - dt);
    this.redBase.hitFlashTimer = Math.max(0, this.redBase.hitFlashTimer - dt);

    // Step minions
    this.stepMinions(dt);

    // Step player respawns and invulnerability
    for (const p of this.players.values()) {
      p.hitFlashTimer = Math.max(0, p.hitFlashTimer - dt);
      p.invulnTimer = Math.max(0, p.invulnTimer - dt);

      if (p.isRespawning) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.isRespawning = false;
          p.respawnTimer = 0;
          p.hp = p.maxHp;
          p.invulnTimer = ARENA_CONFIG.RESPAWN_INVULN;
          p.x = p.team === 'BLUE' ? ARENA_CONFIG.BLUE_SPAWN_X : ARENA_CONFIG.RED_SPAWN_X;
          p.y = 0;

          this.hooks.broadcast({
            type: 'S2C_PVP_PLAYER_RESPAWNED',
            playerId: p.id,
            x: p.x,
            y: p.y,
            hp: p.hp,
            maxHp: p.maxHp,
          });
        }
      }
    }
  }

  public buildMatchSyncState(): PvpMatchSyncState {
    const minionsList: PvpMinionSyncState[] = Array.from(this.minions.values()).map((m) => ({
      id: m.id,
      team: m.team,
      kind: m.kind,
      x: +m.x.toFixed(1),
      y: +m.y.toFixed(1),
      vx: +m.vx.toFixed(1),
      vy: +m.vy.toFixed(1),
      hp: Math.ceil(m.hp),
      maxHp: m.maxHp,
      facingX: m.facingX,
      aiState: m.aiState,
      attackAngle: +m.attackAngle.toFixed(2),
      hitFlashTimer: +m.hitFlashTimer.toFixed(2),
    }));

    const playerStats: Record<string, PvpPlayerStats> = {};
    for (const p of this.players.values()) {
      playerStats[p.id] = {
        kills: p.kills,
        deaths: p.deaths,
        damage: p.damageDealt,
        respawnTimer: Math.max(0, +p.respawnTimer.toFixed(1)),
        invulnTimer: Math.max(0, +p.invulnTimer.toFixed(1)),
      };
    }

    return {
      blueBase: {
        hp: Math.ceil(this.blueBase.hp),
        maxHp: this.blueBase.maxHp,
        x: this.blueBase.x,
        y: this.blueBase.y,
        isDestroyed: this.blueBase.isDestroyed,
        hitFlashTimer: this.blueBase.hitFlashTimer,
      },
      redBase: {
        hp: Math.ceil(this.redBase.hp),
        maxHp: this.redBase.maxHp,
        x: this.redBase.x,
        y: this.redBase.y,
        isDestroyed: this.redBase.isDestroyed,
        hitFlashTimer: this.redBase.hitFlashTimer,
      },
      minions: minionsList,
      matchTime: +this.matchTime.toFixed(1),
      blueScore: this.blueScore,
      redScore: this.redScore,
      playerStats,
      isMatchEnded: this.isMatchEnded,
      winnerTeam: this.winnerTeam,
    };
  }

  public buildSyncMessage(): ServerMessage {
    return {
      type: 'S2C_PVP_SYNC',
      matchState: this.buildMatchSyncState(),
    };
  }
}
