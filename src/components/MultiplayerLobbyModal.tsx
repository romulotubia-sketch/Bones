import React, { useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Globe,
  Radio,
  Shield,
  Swords,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { CHARACTER_LIST, CHARACTER_ROSTER } from '../data/zombieData';
import { NetworkManager } from '../multiplayer/NetworkManager';
import { MultiplayerMode, RoomInfo } from '../multiplayer/networkTypes';
import { CharacterId } from '../types/game';
import { ScrollablePane } from './ScrollablePane';

interface MultiplayerLobbyModalProps {
  networkManager: NetworkManager;
  room: RoomInfo | null;
  selectedCharacter: CharacterId;
  onClose: () => void;
  onStartMultiplayerGame: () => void;
}

const MODES: {
  id: MultiplayerMode;
  name: string;
  tag: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    id: 'ONLINE_COOP',
    name: 'Online Co-op',
    tag: '2-4 Players · Party Dungeon',
    desc: 'Battle through procedurally generated Graveyard chambers and bosses together with online companions.',
    icon: Globe,
    color: '#4ADE80',
  },
  {
    id: 'LAN_COOP',
    name: 'Local Wi-Fi Co-op',
    tag: '2-4 Players · Same Wi-Fi',
    desc: 'Play with friends connected to your local network. Zero internet latency, shared party progression.',
    icon: Wifi,
    color: '#38BDF8',
  },
  {
    id: 'ONLINE_PVP',
    name: 'Online PvP',
    tag: '2-4 Players · Sparring Arena',
    desc: 'Enter the Guild Colosseum to duel other heroes with your custom hero archetype, combos, and skills.',
    icon: Swords,
    color: '#F43F5E',
  },
  {
    id: 'LAN_PVP',
    name: 'Local Wi-Fi PvP',
    tag: '2-4 Players · Local Arena',
    desc: 'Fast, responsive hero vs. hero duels hosted across your local home or office Wi-Fi network.',
    icon: Radio,
    color: '#FBBF24',
  },
];

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  networkManager,
  room,
  selectedCharacter,
  onClose,
  onStartMultiplayerGame,
}) => {
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [selectedMode, setSelectedMode] = useState<MultiplayerMode>('ONLINE_COOP');
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('hb_mp_name') || 'Hero_' + Math.floor(100 + Math.random() * 900);
  });
  const [characterId, setCharacterId] = useState<CharacterId>(selectedCharacter);
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const localId = networkManager.getLocalPlayerId();
  const isHost = room && localId ? room.hostId === localId : false;
  const localPlayerInRoom = room?.players.find((p) => p.id === localId);

  const handleNameChange = (val: string) => {
    const clean = val.slice(0, 14);
    setPlayerName(clean);
    localStorage.setItem('hb_mp_name', clean);
  };

  const handleCreateRoom = async () => {
    setErrorMessage(null);
    setIsBusy(true);
    soundEngine.playUiClick(580);
    try {
      await networkManager.createRoom(
        playerName.trim() || 'Hero',
        characterId,
        selectedMode,
        maxPlayers
      );
    } catch {
      setErrorMessage('Failed to connect to multiplayer server.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setErrorMessage('Please enter a 4-letter room code.');
      return;
    }
    setErrorMessage(null);
    setIsBusy(true);
    soundEngine.playUiClick(580);
    try {
      await networkManager.joinRoom(
        joinCode.trim().toUpperCase(),
        playerName.trim() || 'Hero',
        characterId
      );
    } catch {
      setErrorMessage('Could not connect to multiplayer server.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopyCode = () => {
    if (!room) return;
    void navigator.clipboard?.writeText(room.code);
    setCopiedCode(true);
    soundEngine.playUiClick(720);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleReady = () => {
    if (!localPlayerInRoom) return;
    soundEngine.playUiClick(620);
    networkManager.setReady(!localPlayerInRoom.isReady);
  };

  const handleSelectCharInLobby = (char: CharacterId) => {
    setCharacterId(char);
    soundEngine.playUiClick(520);
    if (room) {
      networkManager.selectCharacter(char);
    }
  };

  const handleStartGame = () => {
    if (!isHost) return;
    soundEngine.playSummon();
    networkManager.startGame();
    onStartMultiplayerGame();
  };

  const handleLeaveRoom = () => {
    soundEngine.playUiClick(440);
    networkManager.leaveRoom();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm pointer-events-auto safe-hud-insets">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#16121E] border border-[#352C46] shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1C1727] border-b border-[#2C243B] shrink-0">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#4ADE80]" />
            <h2 className="text-base font-bold text-[#F3EFE6] tracking-wide font-display">
              {room ? `Party Lobby · Code [${room.code}]` : 'Multiplayer Arena & Co-op'}
            </h2>
            {room && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
                {room.mode.replace('_', ' ')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(440);
              onClose();
            }}
            aria-label="Close multiplayer menu"
            className="w-8 h-8 rounded-lg bg-[#272036] hover:bg-[#342B48] text-[#C4BCB0] active:scale-95 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          {errorMessage && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-300 hover:text-white text-xs underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ACTIVE IN-LOBBY ROOM VIEW */}
          {room ? (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {/* Room Code Lockup */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1D172A] border border-[#3A3050]">
                <div>
                  <div className="text-[11px] text-[#A69FB4] uppercase tracking-wider font-semibold">
                    Room Code (Share with companions)
                  </div>
                  <div className="text-2xl font-mono-num font-bold text-[#FBBF24] tracking-widest mt-0.5">
                    {room.code}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#2C233E] hover:bg-[#382D4F] border border-[#483B63] text-xs font-semibold text-[#F3EFE6] flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 text-[#4ADE80]" />
                      <span className="text-[#4ADE80]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#C084FC]" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Connected Players List (2-4 Slots) */}
              <div className="flex-1 min-h-[140px] flex flex-col">
                <div className="text-xs font-bold text-[#E5DFD4] mb-2 flex items-center justify-between">
                  <span>Connected Adventurers ({room.players.length}/{room.maxPlayers})</span>
                  <span className="text-[11px] text-[#A69FB4]">
                    Ping: {networkManager.getPing()}ms
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {room.players.map((p) => {
                    const charDef = CHARACTER_ROSTER[p.characterId] || CHARACTER_ROSTER[CharacterId.Zombie];
                    const isSelf = p.id === localId;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          isSelf
                            ? 'bg-[#221B32] border-[#4ADE80]/50 shadow-md'
                            : 'bg-[#1A1526] border-[#312844]'
                        }`}
                      >
                        <img
                          src={charDef.portraitUrl}
                          alt={charDef.name}
                          className="w-12 h-12 rounded-xl object-cover border-2 shrink-0"
                          style={{ borderColor: p.color || charDef.accentColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#F3EFE6] truncate">
                              {p.name} {isSelf && '(You)'}
                            </span>
                            {p.isHost && (
                              <Crown className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-[#A69FB4] truncate">
                            {charDef.archetypeName}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                p.isReady
                                  ? 'bg-[#4ADE80]/20 text-[#4ADE80]'
                                  : 'bg-[#FBBF24]/20 text-[#FBBF24]'
                              }`}
                            >
                              {p.isReady ? 'READY' : 'CHOOSING'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty Party Slots */}
                  {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center justify-center p-4 rounded-xl border border-dashed border-[#352B49] text-xs text-[#7A708D] bg-[#14101E]"
                    >
                      Waiting for player to join...
                    </div>
                  ))}
                </div>
              </div>

              {/* Character Quick Switcher inside Lobby */}
              <div className="pt-2 border-t border-[#292238]">
                <div className="text-[11px] text-[#A69FB4] font-semibold mb-1.5">
                  Select Your Hero:
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {CHARACTER_LIST.map((c) => {
                    const isSelected = characterId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCharInLobby(c.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap active:scale-95 transition-all ${
                          isSelected
                            ? 'bg-[#29203C] border-[#4ADE80] text-white shadow-sm'
                            : 'bg-[#191424] border-[#312844] text-[#B8AFC6]'
                        }`}
                      >
                        <img
                          src={c.portraitUrl}
                          alt={c.name}
                          className="w-6 h-6 rounded-md object-cover"
                        />
                        <span>{c.archetypeName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lobby Action Controls */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#292238] shrink-0">
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="min-h-[44px] px-4 rounded-xl bg-[#281F37] hover:bg-[#362B4A] text-xs font-bold text-[#E5DFD4] active:scale-95 transition-all"
                >
                  Leave Party
                </button>

                {!isHost && (
                  <button
                    type="button"
                    onClick={handleToggleReady}
                    className={`flex-1 min-h-[44px] px-4 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      localPlayerInRoom?.isReady
                        ? 'bg-[#FBBF24] text-[#1E1729]'
                        : 'bg-[#4ADE80] text-[#0F1E14]'
                    }`}
                  >
                    {localPlayerInRoom?.isReady ? 'Cancel Ready' : 'Ready Up!'}
                  </button>
                )}

                {isHost && (
                  <button
                    type="button"
                    onClick={handleStartGame}
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#4ADE80] text-[#0F1E14] text-xs font-bold tracking-wide shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Crown className="w-4 h-4 text-[#0F1E14]" />
                    <span>Start Party Game</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* CREATE OR JOIN LOBBY VIEW */
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {/* Top Tabs */}
              <div className="flex rounded-xl bg-[#1C1629] p-1 border border-[#2D2340] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(500);
                    setActiveTab('CREATE');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'CREATE'
                      ? 'bg-[#4ADE80] text-[#0D1C12] shadow-md'
                      : 'text-[#B8AFC6] hover:text-white'
                  }`}
                >
                  Host / Create Room
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(500);
                    setActiveTab('JOIN');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'JOIN'
                      ? 'bg-[#4ADE80] text-[#0D1C12] shadow-md'
                      : 'text-[#B8AFC6] hover:text-white'
                  }`}
                >
                  Join via Code
                </button>
              </div>

              <ScrollablePane className="flex-1 flex flex-col gap-3.5 pr-1">
                {/* Player Profile Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A69FB4] mb-1">
                      Your Hero Name
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={playerName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Adventurer"
                      className="w-full h-11 px-3 rounded-xl bg-[#1C1727] border border-[#352B48] text-sm text-[#F3EFE6] focus:border-[#4ADE80] focus:outline-none"
                    />
                  </div>

                  {activeTab === 'JOIN' ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#A69FB4] mb-1">
                        4-Letter Room Code
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="e.g. BONE"
                        className="w-full h-11 px-3 rounded-xl bg-[#1C1727] border border-[#352B48] text-sm font-mono uppercase tracking-widest text-[#FBBF24] focus:border-[#4ADE80] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#A69FB4] mb-1">
                        Max Players (2 - 4)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[2, 3, 4].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setMaxPlayers(n)}
                            className={`h-11 rounded-xl text-xs font-bold border active:scale-95 transition-all ${
                              maxPlayers === n
                                ? 'bg-[#4ADE80]/20 border-[#4ADE80] text-[#4ADE80]'
                                : 'bg-[#1C1727] border-[#352B48] text-[#B8AFC6]'
                            }`}
                          >
                            {n} Players
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hero Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#A69FB4] mb-1.5">
                    Select Your Starting Hero
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {CHARACTER_LIST.map((c) => {
                      const isSel = characterId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick(520);
                            setCharacterId(c.id);
                          }}
                          className={`p-2 rounded-xl border flex flex-col items-center text-center active:scale-95 transition-all ${
                            isSel
                              ? 'bg-[#261E37] border-[#4ADE80] shadow-md ring-1 ring-[#4ADE80]/40'
                              : 'bg-[#1A1526] border-[#312844] hover:border-[#453960]'
                          }`}
                        >
                          <img
                            src={c.portraitUrl}
                            alt={c.name}
                            className="w-12 h-12 rounded-lg object-cover mb-1.5"
                          />
                          <span className="text-xs font-bold text-[#F3EFE6] leading-tight">
                            {c.archetypeName}
                          </span>
                          <span className="text-[10px] text-[#A69FB4]">{c.role}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mode Selector (When creating) */}
                {activeTab === 'CREATE' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A69FB4] mb-1.5">
                      Choose Multiplayer Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {MODES.map((m) => {
                        const Icon = m.icon;
                        const isChosen = selectedMode === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick(500);
                              setSelectedMode(m.id);
                            }}
                            className={`p-3 rounded-xl border text-left flex items-start gap-3 active:scale-98 transition-all ${
                              isChosen
                                ? 'bg-[#241C35] border-[#4ADE80] shadow-md'
                                : 'bg-[#181324] border-[#2C243B] hover:border-[#3E3253]'
                            }`}
                          >
                            <div
                              className="p-2 rounded-lg shrink-0 mt-0.5"
                              style={{ backgroundColor: `${m.color}22` }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#F3EFE6]">
                                  {m.name}
                                </span>
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{ color: m.color, backgroundColor: `${m.color}15` }}
                                >
                                  {m.tag.split('·')[0].trim()}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#A69FB4] mt-1 leading-snug">
                                {m.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </ScrollablePane>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#292238] shrink-0">
                {activeTab === 'CREATE' ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleCreateRoom}
                    className="w-full min-h-[46px] rounded-xl bg-[#4ADE80] hover:bg-[#3FC772] text-[#0F1E14] text-sm font-bold tracking-wide shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    <span>{isBusy ? 'Creating Room...' : 'Create Multiplayer Room'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy || joinCode.length < 4}
                    onClick={handleJoinRoom}
                    className="w-full min-h-[46px] rounded-xl bg-[#38BDF8] hover:bg-[#2563EB] disabled:opacity-50 text-[#091823] text-sm font-bold tracking-wide shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>{isBusy ? 'Connecting to Room...' : 'Join Party Game'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
