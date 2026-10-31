import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Globe,
  Radio,
  Swords,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  CHARACTER_LIST,
  CHARACTER_ROSTER,
  DIFFICULTY_CONFIGS,
} from '../data/zombieData';
import { NetworkManager } from '../multiplayer/NetworkManager';
import { MultiplayerMode, RoomInfo } from '../multiplayer/networkTypes';
import { CharacterId, DifficultyLevel } from '../types/game';
import { ScrollablePane } from './ScrollablePane';

interface MultiplayerLobbyModalProps {
  networkManager: NetworkManager;
  room: RoomInfo | null;
  selectedCharacter: CharacterId;
  selectedDifficulty?: DifficultyLevel;
  onSelectDifficulty?: (diff: DifficultyLevel) => void;
  onClose: () => void;
  onStartMultiplayerGame: () => void;
}

const MODES: {
  id: MultiplayerMode;
  name: string;
  shortLabel: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    id: 'ONLINE_COOP',
    name: 'Online Co-op',
    shortLabel: 'Online Co-op',
    desc: 'Clear Graveyard chambers and bosses with 2–4 online companions.',
    icon: Globe,
    color: '#4ADE80',
  },
  {
    id: 'LAN_COOP',
    name: 'Local Wi-Fi Co-op',
    shortLabel: 'Wi-Fi Co-op',
    desc: 'Low-latency dungeon runs with friends on the same Wi-Fi network.',
    icon: Wifi,
    color: '#38BDF8',
  },
  {
    id: 'ONLINE_PVP',
    name: 'Online Base Brawl',
    shortLabel: 'Base Brawl',
    desc: '1-lane battle with bases, minions, and PvP hero clashes (1v1 to 4v4).',
    icon: Swords,
    color: '#F43F5E',
  },
  {
    id: 'LAN_PVP',
    name: 'Local Wi-Fi Base Brawl',
    shortLabel: 'Wi-Fi Brawl',
    desc: 'Low-latency 1-lane base battle for 2–8 players on your Wi-Fi network.',
    icon: Radio,
    color: '#FBBF24',
  },
];

const MODE_LABELS: Record<MultiplayerMode, string> = {
  ONLINE_COOP: 'Online Co-op',
  LAN_COOP: 'Wi-Fi Co-op',
  ONLINE_PVP: 'Online Base Brawl',
  LAN_PVP: 'Wi-Fi Base Brawl',
};

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  networkManager,
  room,
  selectedCharacter,
  selectedDifficulty = DifficultyLevel.Easy,
  onSelectDifficulty,
  onClose,
  onStartMultiplayerGame,
}) => {
  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [selectedMode, setSelectedMode] = useState<MultiplayerMode>('ONLINE_COOP');
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('hb_mp_name') || 'Hero_' + Math.floor(100 + Math.random() * 900);
  });
  const [characterId, setCharacterId] = useState<CharacterId>(selectedCharacter);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => room?.difficulty ?? selectedDifficulty);
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lanAddress, setLanAddress] = useState<string | null>(null);
  const [copiedLan, setCopiedLan] = useState(false);
  const [customLanHost, setCustomLanHost] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [failedPortraits, setFailedPortraits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/lan-ip')
      .then((res) => res.json())
      .then((data: { lanIp: string; port: number }) => {
        if (data?.lanIp) {
          setLanAddress(`${data.lanIp}:${data.port}`);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    networkManager.setCallbacks({
      onError: (msg) => {
        setErrorMessage(msg);
        setIsBusy(false);
      },
    });
    return () => {
      networkManager.setCallbacks({ onError: undefined });
    };
  }, [networkManager]);

  const localId = networkManager.getLocalPlayerId();
  const isHost = room && localId ? room.hostId === localId : false;
  const localPlayerInRoom = room?.players.find((p) => p.id === localId);
  const selectedCharDef = CHARACTER_ROSTER[characterId] ?? CHARACTER_ROSTER[CharacterId.Zombie];

  const markPortraitFailed = (key: string) => {
    setFailedPortraits((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

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
        maxPlayers,
        difficulty,
        customLanHost.trim() || undefined
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
        characterId,
        customLanHost.trim() || undefined
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

  const handleCopyLan = () => {
    if (!lanAddress) return;
    void navigator.clipboard?.writeText(lanAddress);
    setCopiedLan(true);
    soundEngine.playUiClick(720);
    setTimeout(() => setCopiedLan(false), 2000);
  };

  const handleToggleReady = () => {
    if (!localPlayerInRoom) return;
    soundEngine.playUiClick(620);
    networkManager.setReady(!localPlayerInRoom.isReady);
  };

  const handleSelectChar = (char: CharacterId) => {
    setCharacterId(char);
    soundEngine.playUiClick(520);
    if (room) {
      networkManager.selectCharacter(char);
    }
  };

  const handleStartGame = () => {
    if (!isHost) return;
    if (room?.mode.includes('PVP') && room.players.length >= 2) {
      const blueCount = room.players.filter((p) => (p.team || 'BLUE') === 'BLUE').length;
      const redCount = room.players.filter((p) => p.team === 'RED').length;
      if (Math.abs(blueCount - redCount) > 1) {
        setErrorMessage('Teams must be balanced before starting Base Brawl!');
        soundEngine.playBoneBreak();
        return;
      }
    }
    soundEngine.playSummon();
    networkManager.startGame(difficulty);
    onStartMultiplayerGame();
  };

  const handleLeaveRoom = () => {
    soundEngine.playUiClick(440);
    networkManager.leaveRoom();
  };

  const renderHeroPortrait = (
    idKey: string,
    url: string,
    name: string,
    accentColor: string,
    sizeClass: string
  ) => {
    if (failedPortraits[idKey]) {
      return (
        <div
          className={`${sizeClass} rounded-lg flex items-center justify-center font-display font-bold text-xs text-[#F3EFE6] shrink-0`}
          style={{
            backgroundColor: `${accentColor}26`,
            border: `1.5px solid ${accentColor}`,
          }}
        >
          {name.slice(0, 2)}
        </div>
      );
    }
    return (
      <img
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => markPortraitFailed(idKey)}
        className={`${sizeClass} rounded-lg object-cover shrink-0`}
        style={{ border: `1.5px solid ${accentColor}` }}
      />
    );
  };

  const renderHeroStrip = () => (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
      {CHARACTER_LIST.map((c) => {
        const isSel = characterId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => handleSelectChar(c.id)}
            className={`min-h-[54px] px-1 py-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform ${
              isSel
                ? 'bg-[#261E37] border-[#4ADE80] text-[#F3EFE6]'
                : 'bg-[#191424] border-[#312844] text-[#B8AFC6] hover:border-[#453960]'
            }`}
          >
            {renderHeroPortrait(
              `pick-${c.id}`,
              c.portraitUrl,
              c.archetypeName,
              isSel ? '#4ADE80' : c.accentColor,
              'w-8 h-8'
            )}
            <span className="text-[10px] font-semibold leading-none truncate max-w-full">
              {c.archetypeName}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-xs pointer-events-auto safe-hud-insets"
    >
      <div
        role="dialog"
        aria-label="Multiplayer Lobby"
        className="w-full max-w-3xl max-h-full flex flex-col rounded-2xl bg-[#16121E] border border-[#352C46] shadow-2xl overflow-hidden"
      >
        {/* Compact Single-Row Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#1C1727] border-b border-[#2C243B] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-[#4ADE80] shrink-0" />
            <h2 className="text-sm font-bold text-[#F3EFE6] font-display whitespace-nowrap">
              {room ? 'Party Lobby' : 'Multiplayer'}
            </h2>
            {room && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#A69FB4] truncate">
                <span aria-hidden="true">·</span>
                <span className="text-[#E5DFD4] font-medium whitespace-nowrap">
                  {MODE_LABELS[room.mode]}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num tabular-nums whitespace-nowrap">
                  {networkManager.getPing()}ms
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {room ? (
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[36px] px-2.5 rounded-lg bg-[#261E36] hover:bg-[#332848] border border-[#463860] text-xs font-semibold text-[#F3EFE6] flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap"
              >
                <span className="text-[11px] text-[#A69FB4] font-normal">Code</span>
                <span className="font-mono-num font-bold tracking-widest text-[#FBBF24]">
                  {room.code}
                </span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#C084FC]" />
                )}
              </button>
            ) : (
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-[#110D18] border border-[#2C243B]">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(500);
                    setErrorMessage(null);
                    setActiveTab('CREATE');
                  }}
                  className={`min-h-[34px] px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'CREATE'
                      ? 'bg-[#4ADE80] text-[#0D1C12]'
                      : 'text-[#B8AFC6] hover:text-white'
                  }`}
                >
                  Create Room
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(500);
                    setErrorMessage(null);
                    setActiveTab('JOIN');
                  }}
                  className={`min-h-[34px] px-3 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'JOIN'
                      ? 'bg-[#38BDF8] text-[#091823]'
                      : 'text-[#B8AFC6] hover:text-white'
                  }`}
                >
                  Join via Code
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(440);
                onClose();
              }}
              aria-label="Close multiplayer menu"
              className="min-w-[40px] min-h-[40px] rounded-xl bg-[#272036] hover:bg-[#342B48] text-[#C4BCB0] active:scale-95 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Compact Error Strip */}
        {errorMessage && (
          <div className="px-3 py-1.5 bg-red-950/80 border-b border-red-500/40 text-red-200 text-[11px] flex items-center justify-between gap-2 shrink-0">
            <span className="truncate">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-300 hover:text-white text-[11px] underline shrink-0 whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Single-Screen Landscape Body with Safe Scroll Fallback */}
        <ScrollablePane className="flex-1 min-h-0 px-3 py-2.5">
          {room ? (
            /* ACTIVE PARTY LOBBY — 2-Column Landscape Split */
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Left: 2x2 Party Slots */}
              <div className="col-span-7 flex flex-col">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#E5DFD4]">
                    {room.mode.includes('PVP') ? 'Base Brawl Teams' : 'Party Adventurers'} ({room.players.length}/{room.maxPlayers})
                  </span>
                  <span className="text-[10px] text-[#A69FB4]">
                    Party Code <span className="font-mono-num text-[#FBBF24] font-semibold">{room.code}</span>
                  </span>
                </div>

                {room.mode.includes('PVP') ? (
                  /* Dedicated 2-Team View for Base Brawl (Blue vs Red) */
                  <div className="flex flex-col gap-2">
                    {/* Blue Team */}
                    <div className="p-2 rounded-xl bg-[#0F172A] border border-[#38BDF8]/40">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
                          <span className="text-[11px] font-bold text-[#38BDF8] tracking-wide">
                            BLUE TEAM ({room.players.filter((p) => (p.team || 'BLUE') === 'BLUE').length}/{Math.floor(room.maxPlayers / 2)})
                          </span>
                        </div>
                        {localPlayerInRoom?.team === 'RED' &&
                          room.players.filter((p) => (p.team || 'BLUE') === 'BLUE').length < Math.floor(room.maxPlayers / 2) && (
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(520);
                                networkManager.sendSetTeam('BLUE');
                              }}
                              className="px-2 py-0.5 rounded-md bg-[#1E293B] text-[10px] font-bold text-[#38BDF8] border border-[#38BDF8]/40 hover:bg-[#38BDF8]/20 transition-colors"
                            >
                              Switch to Blue
                            </button>
                          )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {room.players
                          .filter((p) => (p.team || 'BLUE') === 'BLUE')
                          .map((p) => {
                            const charDef = CHARACTER_ROSTER[p.characterId] || CHARACTER_ROSTER[CharacterId.Zombie];
                            const isSelf = p.id === localId;
                            return (
                              <div
                                key={p.id}
                                className={`h-[48px] px-2 rounded-lg border flex items-center gap-2 ${
                                  isSelf ? 'bg-[#1E293B] border-[#38BDF8]' : 'bg-[#131B2E] border-[#223250]'
                                }`}
                              >
                                {renderHeroPortrait(
                                  `slot-${p.id}-${p.characterId}`,
                                  charDef.portraitUrl,
                                  charDef.archetypeName,
                                  '#38BDF8',
                                  'w-8 h-8'
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-bold text-[#F3EFE6] truncate">
                                      {p.name} {isSelf ? '(You)' : ''}
                                    </span>
                                    {p.isHost && <Crown className="w-3 h-3 text-[#FBBF24] shrink-0" />}
                                  </div>
                                  <div className="text-[9px] text-[#94A3B8] truncate">
                                    {charDef.archetypeName} · {p.isReady ? 'Ready' : 'Waiting'}
                                  </div>
                                </div>
                                {isHost && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playUiClick(560);
                                      networkManager.promoteLeader(p.id);
                                    }}
                                    title="Make Party Leader"
                                    className="p-1 rounded bg-[#1E293B] text-[#FBBF24] border border-[#334155] shrink-0"
                                  >
                                    <Crown className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Red Team */}
                    <div className="p-2 rounded-xl bg-[#2A1116] border border-[#F43F5E]/40">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#F43F5E] animate-pulse" />
                          <span className="text-[11px] font-bold text-[#F43F5E] tracking-wide">
                            RED TEAM ({room.players.filter((p) => p.team === 'RED').length}/{Math.floor(room.maxPlayers / 2)})
                          </span>
                        </div>
                        {(!localPlayerInRoom?.team || localPlayerInRoom.team === 'BLUE') &&
                          room.players.filter((p) => p.team === 'RED').length < Math.floor(room.maxPlayers / 2) && (
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(520);
                                networkManager.sendSetTeam('RED');
                              }}
                              className="px-2 py-0.5 rounded-md bg-[#3F141E] text-[10px] font-bold text-[#F43F5E] border border-[#F43F5E]/40 hover:bg-[#F43F5E]/20 transition-colors"
                            >
                              Switch to Red
                            </button>
                          )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {room.players
                          .filter((p) => p.team === 'RED')
                          .map((p) => {
                            const charDef = CHARACTER_ROSTER[p.characterId] || CHARACTER_ROSTER[CharacterId.Zombie];
                            const isSelf = p.id === localId;
                            return (
                              <div
                                key={p.id}
                                className={`h-[48px] px-2 rounded-lg border flex items-center gap-2 ${
                                  isSelf ? 'bg-[#3F141E] border-[#F43F5E]' : 'bg-[#200D12] border-[#421B24]'
                                }`}
                              >
                                {renderHeroPortrait(
                                  `slot-${p.id}-${p.characterId}`,
                                  charDef.portraitUrl,
                                  charDef.archetypeName,
                                  '#F43F5E',
                                  'w-8 h-8'
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-bold text-[#F3EFE6] truncate">
                                      {p.name} {isSelf ? '(You)' : ''}
                                    </span>
                                    {p.isHost && <Crown className="w-3 h-3 text-[#FBBF24] shrink-0" />}
                                  </div>
                                  <div className="text-[9px] text-[#FDA4AF] truncate">
                                    {charDef.archetypeName} · {p.isReady ? 'Ready' : 'Waiting'}
                                  </div>
                                </div>
                                {isHost && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playUiClick(560);
                                      networkManager.promoteLeader(p.id);
                                    }}
                                    title="Make Party Leader"
                                    className="p-1 rounded bg-[#3F141E] text-[#FBBF24] border border-[#421B24] shrink-0"
                                  >
                                    <Crown className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {room.players.map((p) => {
                      const charDef =
                        CHARACTER_ROSTER[p.characterId] || CHARACTER_ROSTER[CharacterId.Zombie];
                      const isSelf = p.id === localId;
                      return (
                        <div
                          key={p.id}
                          className={`h-[56px] px-2.5 rounded-xl border flex items-center gap-2.5 ${
                            isSelf
                              ? 'bg-[#221B32] border-[#4ADE80]/55'
                              : 'bg-[#1A1526] border-[#312844]'
                          }`}
                        >
                          {renderHeroPortrait(
                            `slot-${p.id}-${p.characterId}`,
                            charDef.portraitUrl,
                            charDef.archetypeName,
                            p.color || charDef.accentColor,
                            'w-9 h-9'
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-[#F3EFE6] truncate">
                                {p.name}
                                {isSelf ? ' (You)' : ''}
                              </span>
                              {p.isHost && (
                                <Crown className="w-3 h-3 text-[#FBBF24] shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[#A69FB4] truncate mt-0.5">
                              <span className="truncate">{charDef.archetypeName}</span>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`font-semibold whitespace-nowrap ${
                                  p.isReady ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
                                }`}
                              >
                                {p.isReady ? 'Ready' : 'Choosing'}
                              </span>
                            </div>
                          </div>
                          {isHost && !isSelf && (
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(560);
                                networkManager.promoteLeader(p.id);
                              }}
                              title="Make Party Leader"
                              className="p-1 rounded-md bg-[#2B213D] hover:bg-[#3D2F56] text-[#FBBF24] border border-[#523F6E] active:scale-90 transition-transform shrink-0"
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map(
                      (_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="h-[56px] px-2.5 rounded-xl border border-dashed border-[#322846] bg-[#130F1C] flex items-center justify-center text-[11px] text-[#7A708D]"
                        >
                          Waiting for player...
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Expedition Difficulty Sync Strip */}
                <div className="flex items-center justify-between mt-2 px-2.5 py-1.5 rounded-xl bg-[#1A1526] border border-[#2E2540]">
                  <span className="text-[10px] font-semibold text-[#A69FB4]">
                    Expedition Difficulty
                  </span>
                  {isHost ? (
                    <div className="flex items-center gap-1">
                      {[
                        DifficultyLevel.Easy,
                        DifficultyLevel.Normal,
                        DifficultyLevel.Hard,
                        DifficultyLevel.Nightmare,
                      ].map((d) => {
                        const isChosen = (room.difficulty ?? difficulty) === d;
                        const cfg = DIFFICULTY_CONFIGS[d];
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick(500);
                              setDifficulty(d);
                              networkManager.setDifficulty(d);
                              onSelectDifficulty?.(d);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                              isChosen
                                ? 'bg-[#31254A] text-[#F3EFE6]'
                                : 'bg-transparent border-transparent text-[#7A708D] hover:text-[#B8AFC6]'
                            }`}
                            style={{
                              borderColor: isChosen ? cfg.color : 'transparent',
                              color: isChosen ? cfg.color : undefined,
                            }}
                          >
                            {cfg.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className="text-[10px] font-bold"
                      style={{ color: DIFFICULTY_CONFIGS[room.difficulty ?? difficulty]?.color }}
                    >
                      {DIFFICULTY_CONFIGS[room.difficulty ?? difficulty]?.name} (Leader set)
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Quick Hero Switcher + LAN Info */}
              <div className="col-span-5 flex flex-col gap-2">
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-[#E5DFD4]">Your Hero</span>
                    <span className="text-[10px] text-[#A69FB4] truncate">
                      {selectedCharDef.role}
                    </span>
                  </div>
                  {renderHeroStrip()}
                </div>

                <div className="px-2.5 py-2 rounded-xl bg-[#1A1526] border border-[#2E2540] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#F3EFE6] truncate">
                      {selectedCharDef.name}
                    </div>
                    <div className="text-[10px] text-[#A69FB4] truncate">
                      {room.mode.startsWith('LAN_') && lanAddress
                        ? `Wi-Fi Host: ${lanAddress}`
                        : `${selectedCharDef.characterType} · ${selectedCharDef.attackLabel}`}
                    </div>
                  </div>
                  {room.mode.startsWith('LAN_') && lanAddress && (
                    <button
                      type="button"
                      onClick={handleCopyLan}
                      className="min-h-[32px] px-2 rounded-lg bg-[#1E293B] text-[10px] font-semibold text-[#38BDF8] border border-[#38BDF8]/30 flex items-center gap-1 shrink-0 whitespace-nowrap active:scale-95"
                    >
                      {copiedLan ? (
                        <Check className="w-3 h-3 text-[#4ADE80]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedLan ? 'Copied' : 'Copy IP'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'CREATE' ? (
            /* CREATE ROOM — 2-Column Single-Screen Landscape Layout */
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Left Column: Name + Max Players + Hero Picker (+ LAN IP when Wi-Fi mode chosen) */}
              <div className="col-span-5 flex flex-col gap-2.5">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-7">
                    <label
                      htmlFor="mp-create-name"
                      className="block text-[10px] font-semibold text-[#A69FB4] mb-1"
                    >
                      Hero Name
                    </label>
                    <input
                      id="mp-create-name"
                      type="text"
                      maxLength={14}
                      value={playerName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Adventurer"
                      className="w-full h-9 px-2.5 rounded-lg bg-[#1C1727] border border-[#352B48] text-xs text-[#F3EFE6] focus:border-[#4ADE80] focus:outline-none"
                    />
                  </div>

                  <div className="col-span-5">
                    <span className="block text-[10px] font-semibold text-[#A69FB4] mb-1">
                      {selectedMode.includes('PVP') ? 'Brawl Setup' : 'Party Size'}
                    </span>
                    <div className={`grid ${selectedMode.includes('PVP') ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
                      {(selectedMode.includes('PVP') ? [2, 4, 6, 8] : [2, 3, 4]).map((n) => {
                        const label = selectedMode.includes('PVP')
                          ? n === 2
                            ? '1v1'
                            : n === 4
                            ? '2v2'
                            : n === 6
                            ? '3v3'
                            : '4v4'
                          : `${n}P`;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick(500);
                              setMaxPlayers(n);
                            }}
                            className={`h-9 rounded-lg text-xs font-bold tabular-nums border active:scale-95 transition-colors whitespace-nowrap ${
                              maxPlayers === n
                                ? 'bg-[#4ADE80]/20 border-[#4ADE80] text-[#4ADE80]'
                                : 'bg-[#1C1727] border-[#352B48] text-[#B8AFC6]'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Create Room Difficulty Selector */}
                <div>
                  <span className="block text-[10px] font-semibold text-[#A69FB4] mb-1">
                    Expedition Difficulty
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      DifficultyLevel.Easy,
                      DifficultyLevel.Normal,
                      DifficultyLevel.Hard,
                      DifficultyLevel.Nightmare,
                    ].map((d) => {
                      const isChosen = difficulty === d;
                      const cfg = DIFFICULTY_CONFIGS[d];
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick(500);
                            setDifficulty(d);
                            onSelectDifficulty?.(d);
                          }}
                          className={`h-8 rounded-lg text-[10px] font-bold border transition-colors ${
                            isChosen
                              ? 'bg-[#31254A] text-[#F3EFE6]'
                              : 'bg-[#1C1727] border-[#352B48] text-[#8E869E] hover:text-[#B8AFC6]'
                          }`}
                          style={{
                            borderColor: isChosen ? cfg.color : undefined,
                            color: isChosen ? cfg.color : undefined,
                          }}
                        >
                          {cfg.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] font-semibold text-[#A69FB4]">Starting Hero</span>
                    <span className="text-[10px] text-[#D6D0C4] truncate">
                      {selectedCharDef.archetypeName} · {selectedCharDef.role}
                    </span>
                  </div>
                  {renderHeroStrip()}
                </div>

                {(selectedMode === 'LAN_COOP' || selectedMode === 'LAN_PVP') && lanAddress && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#151D2A] border border-[#38BDF8]/35 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5 text-[11px] text-[#BAE6FD]">
                      <Wifi className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                      <span className="font-mono-num truncate">{lanAddress}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLan}
                      className="min-h-[28px] px-2 rounded bg-[#1E293B] text-[10px] font-semibold text-[#38BDF8] flex items-center gap-1 shrink-0 whitespace-nowrap active:scale-95"
                    >
                      {copiedLan ? (
                        <Check className="w-3 h-3 text-[#4ADE80]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedLan ? 'Copied' : 'Copy IP'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Compact 2x2 Mode Selector */}
              <div className="col-span-7 flex flex-col">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] font-semibold text-[#A69FB4]">
                    Multiplayer Mode
                  </span>
                  <span className="text-[10px] text-[#A69FB4]">2–4 Players</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 min-h-[68px] active:scale-[0.98] transition-transform ${
                          isChosen
                            ? 'bg-[#241C35] border-[#4ADE80]'
                            : 'bg-[#181324] border-[#2C243B] hover:border-[#3E3253]'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${m.color}20`, color: m.color }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#F3EFE6] truncate">
                            {m.name}
                          </div>
                          <p className="text-[10px] text-[#A69FB4] mt-0.5 leading-snug line-clamp-2">
                            {m.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* JOIN ROOM — 2-Column Single-Screen Landscape Layout */
            <div className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-6 flex flex-col gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="mp-join-name"
                      className="block text-[10px] font-semibold text-[#A69FB4] mb-1"
                    >
                      Hero Name
                    </label>
                    <input
                      id="mp-join-name"
                      type="text"
                      maxLength={14}
                      value={playerName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Adventurer"
                      className="w-full h-9 px-2.5 rounded-lg bg-[#1C1727] border border-[#352B48] text-xs text-[#F3EFE6] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="mp-join-code"
                      className="block text-[10px] font-semibold text-[#A69FB4] mb-1"
                    >
                      4-Letter Room Code
                    </label>
                    <input
                      id="mp-join-code"
                      type="text"
                      maxLength={4}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="BONE"
                      className="w-full h-9 px-2.5 rounded-lg bg-[#1C1727] border border-[#352B48] text-xs font-mono-num font-bold uppercase tracking-widest text-[#FBBF24] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="mp-join-lan"
                    className="block text-[10px] font-semibold text-[#A69FB4] mb-1"
                  >
                    Host Wi-Fi Address (Optional · Local Wi-Fi Only)
                  </label>
                  <input
                    id="mp-join-lan"
                    type="text"
                    value={customLanHost}
                    onChange={(e) => setCustomLanHost(e.target.value)}
                    placeholder={
                      lanAddress ? `${lanAddress} (leave blank for online)` : 'e.g. 192.168.1.100:3000'
                    }
                    className="w-full h-9 px-2.5 rounded-lg bg-[#1C1727] border border-[#352B48] text-xs font-mono-num text-[#F3EFE6] focus:border-[#38BDF8] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#8E869E] mt-1 leading-tight">
                    Leave empty for Online rooms, or enter the host device IP for Local Wi-Fi.
                  </p>
                </div>
              </div>

              <div className="col-span-6 flex flex-col gap-2.5">
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] font-semibold text-[#A69FB4]">Starting Hero</span>
                    <span className="text-[10px] text-[#D6D0C4] truncate">
                      {selectedCharDef.archetypeName} · {selectedCharDef.role}
                    </span>
                  </div>
                  {renderHeroStrip()}
                </div>

                <div className="px-2.5 py-2 rounded-xl bg-[#1A1526] border border-[#2E2540]">
                  <div className="text-xs font-semibold text-[#F3EFE6]">
                    {selectedCharDef.name}
                  </div>
                  <div className="text-[10px] text-[#A69FB4] mt-0.5 leading-snug">
                    {selectedCharDef.characterType} · Primary Attack: {selectedCharDef.attackLabel}
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollablePane>

        {/* Pinned Compact Footer Bar */}
        <div className="px-3 py-2 bg-[#1A1525] border-t border-[#2C243B] flex items-center justify-between gap-2 shrink-0">
          {room ? (
            <>
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="min-h-[40px] px-4 rounded-xl bg-[#281F37] hover:bg-[#362B4A] text-xs font-bold text-[#E5DFD4] active:scale-95 transition-transform whitespace-nowrap shrink-0"
              >
                Leave Party
              </button>

              {isHost ? (
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="min-h-[40px] px-5 rounded-xl bg-[#4ADE80] hover:bg-[#3FC772] text-[#0F1E14] text-xs font-bold tracking-wide shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Crown className="w-4 h-4 text-[#0F1E14]" />
                  <span>{room.mode.includes('PVP') ? 'Start Base Brawl' : 'Start Party Game'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleReady}
                  className={`min-h-[40px] px-5 rounded-xl text-xs font-bold active:scale-95 transition-transform whitespace-nowrap shrink-0 ${
                    localPlayerInRoom?.isReady
                      ? 'bg-[#FBBF24] text-[#1E1729]'
                      : 'bg-[#4ADE80] text-[#0F1E14]'
                  }`}
                >
                  {localPlayerInRoom?.isReady ? 'Cancel Ready' : 'Ready Up'}
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-[11px] text-[#A69FB4] truncate">
                {activeTab === 'CREATE'
                  ? `${MODES.find((m) => m.id === selectedMode)?.shortLabel} · Up to ${maxPlayers} players`
                  : 'Enter a 4-letter party code to join immediately'}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(440);
                    onClose();
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-[#261F35] hover:bg-[#332A46] text-xs font-semibold text-[#D6D0C4] active:scale-95 transition-transform whitespace-nowrap"
                >
                  Cancel
                </button>

                {activeTab === 'CREATE' ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleCreateRoom}
                    className="min-h-[40px] px-5 rounded-xl bg-[#4ADE80] hover:bg-[#3FC772] disabled:opacity-50 text-[#0F1E14] text-xs font-bold tracking-wide shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>{isBusy ? 'Creating...' : 'Create Room'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy || joinCode.trim().length < 4}
                    onClick={handleJoinRoom}
                    className="min-h-[40px] px-5 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-50 text-[#091823] text-xs font-bold tracking-wide shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{isBusy ? 'Joining...' : 'Join Room'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
