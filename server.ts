import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  ClientMessage,
  EnemySyncState,
  MultiplayerMode,
  PlayerTransformSync,
  RoomInfo,
  RoomPlayer,
  ServerMessage,
} from './src/multiplayer/networkTypes.ts';
import type { CharacterId } from './src/types/game.ts';
import { registerDownloadRoutes } from './serverDownload.ts';

const DEFAULT_CHARACTER: CharacterId = 'ZOMBIE' as CharacterId;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

interface ConnectedPeer {
  id: string;
  ws: WebSocket;
  roomCode: string | null;
  player: RoomPlayer;
  latestTransform?: PlayerTransformSync;
}

interface ServerRoom {
  code: string;
  mode: MultiplayerMode;
  hostId: string;
  players: Map<string, ConnectedPeer>;
  maxPlayers: number;
  inGame: boolean;
  seed: number;
  floorNumber: number;
  syncInterval: NodeJS.Timeout | null;
  enemies: Map<number, EnemySyncState>;
  recentDamageEvents: Map<string, number>;
  activeRoomId?: number;
  wavesRemaining?: number;
}

const rooms = new Map<string, ServerRoom>();
const peers = new Map<WebSocket, ConnectedPeer>();

const PLAYER_COLORS = ['#4ADE80', '#38BDF8', '#FBBF24', '#C084FC', '#F43F5E'];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let attempt = 0; attempt < 100; attempt++) {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!rooms.has(code)) return code;
  }
  return String(Date.now()).slice(-4);
}

function serializeRoom(room: ServerRoom): RoomInfo {
  const playersList: RoomPlayer[] = Array.from(room.players.values()).map(
    (p) => p.player
  );
  return {
    code: room.code,
    mode: room.mode,
    hostId: room.hostId,
    players: playersList,
    maxPlayers: room.maxPlayers,
    inGame: room.inGame,
    seed: room.seed,
    floorNumber: room.floorNumber,
  };
}

function broadcastToRoom(room: ServerRoom, message: ServerMessage, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const peer of room.players.values()) {
    if (peer.ws !== excludeWs && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(data);
    }
  }
}

function sendToPeer(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function cleanupPeerFromRoom(peer: ConnectedPeer) {
  if (!peer.roomCode) return;
  const room = rooms.get(peer.roomCode);
  if (!room) {
    peer.roomCode = null;
    return;
  }

  room.players.delete(peer.id);
  peer.roomCode = null;

  if (room.players.size === 0) {
    if (room.syncInterval) {
      clearInterval(room.syncInterval);
    }
    rooms.delete(room.code);
    return;
  }

  // If host left, elect new host immediately
  let newHostId: string | undefined;
  if (room.hostId === peer.id) {
    const nextPeer = Array.from(room.players.values())[0];
    room.hostId = nextPeer.id;
    nextPeer.player.isHost = true;
    newHostId = nextPeer.id;
    broadcastToRoom(room, {
      type: 'S2C_HOST_CHANGED',
      newHostId: nextPeer.id,
    });
  }

  broadcastToRoom(room, {
    type: 'S2C_PLAYER_LEFT',
    playerId: peer.id,
    newHostId,
  });

  broadcastToRoom(room, {
    type: 'S2C_ROOM_STATE',
    room: serializeRoom(room),
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // WebSocket Server setup on same port (HTTP upgrade)
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const peerId = 'p_' + Math.random().toString(36).substring(2, 9);
    const peer: ConnectedPeer = {
      id: peerId,
      ws,
      roomCode: null,
      player: {
        id: peerId,
        name: 'Player',
        characterId: DEFAULT_CHARACTER,
        isHost: false,
        isReady: false,
        ping: 0,
        color: PLAYER_COLORS[0],
      },
    };
    peers.set(ws, peer);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;

        switch (msg.type) {
          case 'C2S_CREATE_ROOM': {
            cleanupPeerFromRoom(peer);

            const code = generateRoomCode();
            const maxPlayers = Math.max(2, Math.min(4, msg.maxPlayers ?? 4));
            peer.player.name = (msg.playerName || 'Adventurer').trim().slice(0, 14);
            peer.player.characterId = msg.characterId || DEFAULT_CHARACTER;
            peer.player.isHost = true;
            peer.player.isReady = true;
            peer.player.color = PLAYER_COLORS[0];
            peer.roomCode = code;

            const room: ServerRoom = {
              code,
              mode: msg.mode || 'ONLINE_COOP',
              hostId: peer.id,
              players: new Map([[peer.id, peer]]),
              maxPlayers,
              inGame: false,
              seed: Math.floor(Math.random() * 1000000),
              floorNumber: 0,
              syncInterval: null,
              enemies: new Map<number, EnemySyncState>(),
              recentDamageEvents: new Map<string, number>(),
              activeRoomId: 0,
              wavesRemaining: 0,
            };

            rooms.set(code, room);

            sendToPeer(ws, {
              type: 'S2C_ROOM_CREATED',
              room: serializeRoom(room),
              playerId: peer.id,
            });
            break;
          }

          case 'C2S_JOIN_ROOM': {
            cleanupPeerFromRoom(peer);

            const code = (msg.code || '').trim().toUpperCase();
            const room = rooms.get(code);

            if (!room) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: `Room code "${code}" not found.`,
                code: 'ROOM_NOT_FOUND',
              });
              return;
            }

            if (room.players.size >= room.maxPlayers) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: `Room "${code}" is full (maximum ${room.maxPlayers} players).`,
                code: 'ROOM_FULL',
              });
              return;
            }

            if (room.inGame) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: `A game is already in progress in room "${code}".`,
                code: 'ROOM_IN_GAME',
              });
              return;
            }

            peer.player.name = (msg.playerName || 'Adventurer').trim().slice(0, 14);
            peer.player.characterId = msg.characterId || DEFAULT_CHARACTER;
            peer.player.isHost = false;
            peer.player.isReady = false;
            peer.player.color = PLAYER_COLORS[room.players.size % PLAYER_COLORS.length];
            peer.roomCode = code;

            room.players.set(peer.id, peer);

            sendToPeer(ws, {
              type: 'S2C_ROOM_JOINED',
              room: serializeRoom(room),
              playerId: peer.id,
            });

            broadcastToRoom(
              room,
              {
                type: 'S2C_PLAYER_JOINED',
                player: peer.player,
              },
              ws
            );

            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            break;
          }

          case 'C2S_LEAVE_ROOM': {
            cleanupPeerFromRoom(peer);
            break;
          }

          case 'C2S_SET_READY': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            peer.player.isReady = Boolean(msg.ready);
            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            break;
          }

          case 'C2S_SELECT_CHARACTER': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            peer.player.characterId = msg.characterId;
            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            break;
          }

          case 'C2S_START_GAME': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (room.hostId !== peer.id) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: 'Only the party leader can start the game.',
              });
              return;
            }

            room.inGame = true;
            room.seed = Math.floor(Math.random() * 1000000);
            room.floorNumber = 0; // Sanctuary Guild Hall party start
            room.enemies.clear();
            room.recentDamageEvents.clear();

            // Setup 20Hz transform sync loop for this room
            if (room.syncInterval) clearInterval(room.syncInterval);
            room.syncInterval = setInterval(() => {
              if (room.players.size === 0) {
                if (room.syncInterval) clearInterval(room.syncInterval);
                return;
              }
              const transforms: PlayerTransformSync[] = [];
              for (const p of room.players.values()) {
                if (p.latestTransform) {
                  transforms.push(p.latestTransform);
                }
              }

              // Check if all players in party are downed (Party Defeat condition)
              if (room.inGame && transforms.length > 0 && transforms.every((t) => t.isDowned)) {
                broadcastToRoom(room, { type: 'S2C_PARTY_WIPE' });
              }

              if (transforms.length > 0) {
                broadcastToRoom(room, {
                  type: 'S2C_SYNC_WORLD',
                  players: transforms,
                  enemies: Array.from(room.enemies.values()),
                  activeRoomId: room.activeRoomId,
                  wavesRemaining: room.wavesRemaining,
                });
              }
            }, 50);

            broadcastToRoom(room, {
              type: 'S2C_GAME_STARTED',
              seed: room.seed,
              floorNumber: room.floorNumber,
            });
            break;
          }

          case 'C2S_UPDATE_TRANSFORM': {
            if (!peer.roomCode) return;
            peer.latestTransform = {
              ...msg.transform,
              id: peer.id,
            };
            break;
          }

          case 'C2S_SYNC_ENEMIES': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            // The room host maintains authoritative enemy positions, movement, and wave counts
            if (room.hostId === peer.id) {
              room.activeRoomId = msg.roomId;
              room.wavesRemaining = msg.wavesRemaining;

              const incomingIds = new Set(msg.enemies.map((e) => e.id));
              for (const e of msg.enemies) {
                const existing = room.enemies.get(e.id);
                if (existing) {
                  // Keep server-authoritative HP if damaged on server, update position & AI
                  existing.x = e.x;
                  existing.y = e.y;
                  existing.vx = e.vx;
                  existing.vy = e.vy;
                  existing.facingX = e.facingX;
                  existing.aiState = e.aiState;
                  existing.telegraphType = e.telegraphType;
                  existing.telegraphAngle = e.telegraphAngle;
                  existing.hitFlashTimer = Math.max(existing.hitFlashTimer, e.hitFlashTimer);
                  existing.stunTimer = e.stunTimer;
                  existing.plagueTimer = e.plagueTimer;
                  existing.infectionStacks = e.infectionStacks;
                  existing.roomId = e.roomId;
                } else {
                  // Newly spawned wave enemy
                  room.enemies.set(e.id, { ...e });
                }
              }

              // Remove enemies that were despawned or defeated on host
              for (const id of Array.from(room.enemies.keys())) {
                if (!incomingIds.has(id)) {
                  room.enemies.delete(id);
                }
              }
            }
            break;
          }

          case 'C2S_DAMAGE_ENEMY': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;

            let enemy = room.enemies.get(msg.enemyId);
            if (!enemy) {
              // Check if enemy hasn't been synced yet or was just spawned
              enemy = {
                id: msg.enemyId,
                kind: 'SKELETON_WARRIOR' as any,
                x: msg.hitX,
                y: msg.hitY,
                vx: 0,
                vy: 0,
                hp: Math.max(1, msg.damage * 2),
                maxHp: Math.max(1, msg.damage * 2),
                facingX: 1,
                aiState: 'CHASE',
                telegraphType: 'NONE',
                telegraphAngle: 0,
                hitFlashTimer: 0.08,
                stunTimer: 0,
                plagueTimer: 0,
                infectionStacks: 0,
                roomId: room.activeRoomId || 0,
              };
              room.enemies.set(msg.enemyId, enemy);
            }

            if (enemy.hp <= 0) return;

            // Deduplication window: within 40ms from same attacker on same enemy
            const now = Date.now();
            const dedupeKey = `${msg.enemyId}_${peer.id}_${Math.floor(now / 40)}`;
            if (room.recentDamageEvents.has(dedupeKey)) {
              return;
            }
            room.recentDamageEvents.set(dedupeKey, now);

            // Clean old deduplication events (> 5s old)
            if (room.recentDamageEvents.size > 200) {
              for (const [k, t] of room.recentDamageEvents.entries()) {
                if (now - t > 5000) room.recentDamageEvents.delete(k);
              }
            }

            // Server-authoritative damage calculation
            const prevHp = enemy.hp;
            const newHp = Math.max(0, prevHp - msg.damage);
            enemy.hp = newHp;
            enemy.hitFlashTimer = 0.08;

            if (newHp <= 0) {
              room.enemies.delete(msg.enemyId);
              broadcastToRoom(room, {
                type: 'S2C_ENEMY_DEFEATED',
                enemyId: msg.enemyId,
                killerId: peer.id,
                dropX: msg.hitX || enemy.x,
                dropY: msg.hitY || enemy.y,
              });
            } else {
              broadcastToRoom(room, {
                type: 'S2C_ENEMY_DAMAGED',
                enemyId: msg.enemyId,
                newHp,
                damageDealt: msg.damage,
                isCrit: msg.isCrit,
                hitX: msg.hitX,
                hitY: msg.hitY,
                attackerId: peer.id,
              });
            }
            break;
          }

          case 'C2S_CAST_SKILL': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            broadcastToRoom(
              room,
              {
                type: 'S2C_REMOTE_SKILL',
                playerId: peer.id,
                skillId: msg.skillId,
                x: msg.x,
                y: msg.y,
                angle: msg.angle,
                slot: msg.slot,
              },
              ws
            );
            break;
          }

          case 'C2S_REVIVE_PLAYER': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (msg.progress >= 1.0) {
              broadcastToRoom(room, {
                type: 'S2C_PLAYER_REVIVED',
                revivedPlayerId: msg.targetPlayerId,
                reviverPlayerId: peer.id,
                reviveHp: 50,
              });
            }
            break;
          }

          case 'C2S_ADVANCE_FLOOR': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (room.hostId !== peer.id) return;
            room.floorNumber = msg.floorNumber;
            room.seed = msg.seed;
            room.enemies.clear();
            room.recentDamageEvents.clear();
            broadcastToRoom(room, {
              type: 'S2C_FLOOR_SYNC',
              floorNumber: msg.floorNumber,
              seed: msg.seed,
            });
            break;
          }

          case 'C2S_PING': {
            sendToPeer(ws, {
              type: 'S2C_PONG',
              clientTime: msg.clientTime,
              serverTime: Date.now(),
            });
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      cleanupPeerFromRoom(peer);
      peers.delete(ws);
    });

    ws.on('error', (err) => {
      console.warn('Peer socket error:', err);
      cleanupPeerFromRoom(peer);
      peers.delete(ws);
    });
  });

  // REST API status endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      activeRooms: rooms.size,
      connectedPeers: peers.size,
    });
  });

  // Local Wi-Fi Co-op discovery endpoint
  app.get('/api/lan-ip', (_req, res) => {
    const interfaces = os.networkInterfaces();
    let lanIp = 'localhost';
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          lanIp = iface.address;
          break;
        }
      }
    }
    res.json({ lanIp, port: PORT });
  });

  // Direct file download endpoints (standalone playable HTML + source/build ZIP archives)
  registerDownloadRoutes(app, __dirname);

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[Hearth & Bone Server] Listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
