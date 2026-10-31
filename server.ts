import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { ServerCoopSession } from './serverCoopEngine.ts';
import { registerDownloadRoutes } from './serverDownload.ts';
import type {
  ClientMessage,
  MultiplayerMode,
  RoomInfo,
  RoomPlayer,
  ServerMessage,
} from './src/multiplayer/networkTypes.ts';
import { CharacterId, DifficultyLevel } from './src/types/game.ts';

const DEFAULT_CHARACTER: CharacterId = CharacterId.Zombie;
const DEFAULT_DIFFICULTY: DifficultyLevel = DifficultyLevel.Easy;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

interface ConnectedPeer {
  id: string;
  ws: WebSocket;
  roomCode: string | null;
  player: RoomPlayer;
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
  difficulty: DifficultyLevel;
  syncInterval: ReturnType<typeof setInterval> | null;
  session: ServerCoopSession;
}

const rooms = new Map<string, ServerRoom>();
const peers = new Map<WebSocket, ConnectedPeer>();

const PLAYER_COLORS = ['#4ADE80', '#38BDF8', '#FBBF24', '#C084FC'];

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
  const playersList: RoomPlayer[] = Array.from(room.players.values()).map((p) => p.player);
  return {
    code: room.code,
    mode: room.mode,
    hostId: room.hostId,
    players: playersList,
    maxPlayers: room.maxPlayers,
    inGame: room.inGame,
    seed: room.seed,
    floorNumber: room.floorNumber,
    difficulty: room.difficulty,
  };
}

function broadcastToRoom(room: ServerRoom, message: ServerMessage, excludePlayerId?: string) {
  const data = JSON.stringify(message);
  for (const peer of room.players.values()) {
    if (peer.id !== excludePlayerId && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(data);
    }
  }
}

function sendToPeer(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function startRoomSimulationLoop(room: ServerRoom) {
  if (room.syncInterval) clearInterval(room.syncInterval);
  room.syncInterval = setInterval(() => {
    if (room.players.size === 0) {
      if (room.syncInterval) {
        clearInterval(room.syncInterval);
        room.syncInterval = null;
      }
      return;
    }
    room.session.step(0.05);
    broadcastToRoom(room, room.session.buildWorldSyncMessage());
  }, 50);
}

function cleanupPeerFromRoom(peer: ConnectedPeer) {
  if (!peer.roomCode) return;
  const room = rooms.get(peer.roomCode);
  if (!room) {
    peer.roomCode = null;
    return;
  }

  const departedName = peer.player.name;
  room.players.delete(peer.id);
  peer.roomCode = null;

  if (room.players.size === 0) {
    if (room.syncInterval) {
      clearInterval(room.syncInterval);
      room.syncInterval = null;
    }
    rooms.delete(room.code);
    return;
  }

  // Elect new Party Leader immediately if the current leader disconnected
  let newHostId: string | undefined;
  let newHostName: string | undefined;
  if (room.hostId === peer.id) {
    for (const p of room.players.values()) {
      p.player.isHost = false;
    }
    const nextPeer = Array.from(room.players.values())[0];
    room.hostId = nextPeer.id;
    nextPeer.player.isHost = true;
    nextPeer.player.isReady = true;
    newHostId = nextPeer.id;
    newHostName = nextPeer.player.name;
    broadcastToRoom(room, {
      type: 'S2C_HOST_CHANGED',
      newHostId: nextPeer.id,
      newHostName: nextPeer.player.name,
    });
  }

  room.session.handlePlayerDisconnect(peer.id);

  broadcastToRoom(room, {
    type: 'S2C_PLAYER_LEFT',
    playerId: peer.id,
    playerName: departedName,
    newHostId,
    newHostName,
  });

  broadcastToRoom(room, {
    type: 'S2C_ROOM_STATE',
    room: serializeRoom(room),
  });
}

function createServerRoom(
  code: string,
  mode: MultiplayerMode,
  hostPeer: ConnectedPeer,
  maxPlayers: number,
  difficulty: DifficultyLevel
): ServerRoom {
  const initialSeed = Math.floor(Math.random() * 1000000) + 1;
  let roomRef!: ServerRoom;

  const session = new ServerCoopSession(
    {
      broadcast: (msg, excludePlayerId) => {
        if (roomRef) broadcastToRoom(roomRef, msg, excludePlayerId);
      },
      getDifficulty: () => (roomRef ? roomRef.difficulty : difficulty),
      getPartyPlayers: () =>
        roomRef
          ? Array.from(roomRef.players.values()).map((p) => ({
              id: p.id,
              name: p.player.name,
              characterId: p.player.characterId,
            }))
          : [],
    },
    initialSeed
  );

  roomRef = {
    code,
    mode,
    hostId: hostPeer.id,
    players: new Map([[hostPeer.id, hostPeer]]),
    maxPlayers,
    inGame: false,
    seed: initialSeed,
    floorNumber: 0,
    difficulty,
    syncInterval: null,
    session,
  };

  session.ensurePartyPlayersSynced();
  return roomRef;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // WebSocket Server setup on same port (HTTP upgrade) — shared by Online Co-op & Local Wi-Fi Co-op
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const peerId = 'p_' + Math.random().toString(36).substring(2, 9);
    const peer: ConnectedPeer = {
      id: peerId,
      ws,
      roomCode: null,
      player: {
        id: peerId,
        name: 'Adventurer',
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
            const difficulty = msg.difficulty ?? DEFAULT_DIFFICULTY;
            peer.player.name = (msg.playerName || 'Adventurer').trim().slice(0, 14);
            peer.player.characterId = msg.characterId || DEFAULT_CHARACTER;
            peer.player.isHost = true;
            peer.player.isReady = true;
            peer.player.color = PLAYER_COLORS[0];
            peer.roomCode = code;

            const room = createServerRoom(
              code,
              msg.mode || 'ONLINE_COOP',
              peer,
              maxPlayers,
              difficulty
            );
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
                message: `Party code "${code}" not found.`,
                code: 'ROOM_NOT_FOUND',
              });
              return;
            }

            if (room.players.size >= room.maxPlayers) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: `Party "${code}" is full (max ${room.maxPlayers} players).`,
                code: 'ROOM_FULL',
              });
              return;
            }

            if (room.inGame && room.floorNumber > 0) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: `Party "${code}" is already battling in the Graveyard.`,
                code: 'ROOM_IN_GAME',
              });
              return;
            }

            const usedColors = new Set(
              Array.from(room.players.values()).map((p) => p.player.color)
            );
            const assignedColor =
              PLAYER_COLORS.find((c) => !usedColors.has(c)) ??
              PLAYER_COLORS[room.players.size % PLAYER_COLORS.length];

            peer.player.name = (msg.playerName || 'Adventurer').trim().slice(0, 14);
            peer.player.characterId = msg.characterId || DEFAULT_CHARACTER;
            peer.player.isHost = false;
            peer.player.isReady = true;
            peer.player.color = assignedColor;
            peer.roomCode = code;

            room.players.set(peer.id, peer);
            room.session.ensurePartyPlayersSynced();

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
              peer.id
            );

            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });

            // If party is currently hanging out in the Guild Hall (floor 0), drop newcomer right in
            if (room.inGame && room.floorNumber === 0) {
              sendToPeer(ws, {
                type: 'S2C_GAME_STARTED',
                seed: room.seed,
                floorNumber: 0,
                difficulty: room.difficulty,
              });
            }
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
            room.session.ensurePartyPlayersSynced();
            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            break;
          }

          case 'C2S_SET_DIFFICULTY': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (room.hostId !== peer.id) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: 'Only the Party Leader can change difficulty.',
              });
              return;
            }
            room.difficulty = msg.difficulty;
            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            break;
          }

          case 'C2S_PROMOTE_LEADER': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (room.hostId !== peer.id) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: 'Only the current Party Leader can promote another member.',
              });
              return;
            }
            const targetPeer = room.players.get(msg.targetPlayerId);
            if (!targetPeer) return;

            for (const p of room.players.values()) {
              p.player.isHost = false;
            }
            room.hostId = targetPeer.id;
            targetPeer.player.isHost = true;
            targetPeer.player.isReady = true;

            broadcastToRoom(room, {
              type: 'S2C_HOST_CHANGED',
              newHostId: targetPeer.id,
              newHostName: targetPeer.player.name,
            });
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
                message: 'Only the Party Leader can start the Co-op expedition.',
              });
              return;
            }

            if (room.players.size < 2 || room.players.size > 4) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: 'Co-op requires 2–4 players in the party to start.',
                code: 'PARTY_SIZE_REQUIRED',
              });
              return;
            }

            if (msg.difficulty) {
              room.difficulty = msg.difficulty;
            }

            room.inGame = true;
            room.seed = Math.floor(Math.random() * 1000000) + 1;
            room.floorNumber = 1; // Launch party directly into shared Graveyard Floor 1-1!
            room.session.loadFloor(1, room.seed, room.difficulty);
            startRoomSimulationLoop(room);

            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            broadcastToRoom(room, {
              type: 'S2C_GAME_STARTED',
              seed: room.seed,
              floorNumber: room.floorNumber,
              difficulty: room.difficulty,
            });
            break;
          }

          case 'C2S_START_DUNGEON_RUN': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (room.hostId !== peer.id) {
              sendToPeer(ws, {
                type: 'S2C_ERROR',
                message: 'Only the Party Leader can open the Graveyard Gate.',
              });
              return;
            }
            room.difficulty = msg.difficulty ?? room.difficulty;
            room.inGame = true;
            room.seed = Math.floor(Math.random() * 1000000) + 1;
            room.floorNumber = 1;
            room.session.loadFloor(1, room.seed, room.difficulty);
            startRoomSimulationLoop(room);

            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            broadcastToRoom(room, {
              type: 'S2C_FLOOR_SYNC',
              floorNumber: 1,
              seed: room.seed,
              difficulty: room.difficulty,
            });
            break;
          }

          case 'C2S_UPDATE_TRANSFORM': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            room.session.syncPlayerTransform(
              peer.id,
              peer.player.name,
              peer.player.characterId,
              msg.transform
            );
            break;
          }

          case 'C2S_DAMAGE_ENEMY': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            room.session.handleDamageEnemy(
              peer.id,
              msg.eventId,
              msg.enemyId,
              msg.damage,
              msg.isCrit,
              msg.hitX,
              msg.hitY,
              msg.statusEffects
            );
            break;
          }

          case 'C2S_PLAYER_HEAL': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            room.session.handlePlayerHeal(peer.id, msg.eventId, msg.amount, msg.maxHp);
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
                targetX: msg.targetX,
                targetY: msg.targetY,
              },
              peer.id
            );
            break;
          }

          case 'C2S_INTERACT_PROP': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            room.session.handleInteractProp(peer.id, msg.propId);
            break;
          }

          case 'C2S_REVIVE_PLAYER': {
            // Proximity revival is calculated authoritatively on the server 20Hz loop
            break;
          }

          case 'C2S_ADVANCE_FLOOR': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (room.hostId !== peer.id) return;

            const nextSeed = msg.seed ?? Math.floor(Math.random() * 1000000) + 1;
            room.floorNumber = msg.floorNumber;
            room.seed = nextSeed;
            room.session.loadFloor(room.floorNumber, room.seed, room.difficulty);

            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            broadcastToRoom(room, {
              type: 'S2C_FLOOR_SYNC',
              floorNumber: room.floorNumber,
              seed: room.seed,
              difficulty: room.difficulty,
            });
            break;
          }

          case 'C2S_CLAIM_VICTORY': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (room.hostId !== peer.id) return;
            room.session.handleClaimVictory();
            break;
          }

          case 'C2S_RETURN_PARTY_TO_GUILD': {
            if (!peer.roomCode) return;
            const room = rooms.get(peer.roomCode);
            if (!room) return;
            if (room.hostId !== peer.id) return;

            room.floorNumber = 0;
            room.seed = Math.floor(Math.random() * 1000000) + 1;
            room.session.startGuildSession(room.seed);
            startRoomSimulationLoop(room);

            broadcastToRoom(room, {
              type: 'S2C_ROOM_STATE',
              room: serializeRoom(room),
            });
            broadcastToRoom(room, {
              type: 'S2C_RETURN_TO_GUILD',
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

  // Local Wi-Fi Co-op discovery endpoint (returns primary LAN IPv4 + all non-internal IPv4s)
  app.get('/api/lan-ip', (_req, res) => {
    const interfaces = os.networkInterfaces();
    const lanAddresses: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          lanAddresses.push(iface.address);
        }
      }
    }
    const lanIp = lanAddresses[0] || 'localhost';
    res.json({ lanIp, lanAddresses, port: PORT });
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
