import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useUser } from '../../context/UserContext';
import { LobbyPlayer } from './types';
import { AuthWidget } from '../auth/AuthWidget';
import { PlayerStatsModal } from '../modals/PlayerStatsModal';
import { PlayerType } from '../../types/player.types';
import { LobbyStep1_Theme } from './steps/LobbyStep1_Theme';
import { LobbyStep2_Expansion } from './steps/LobbyStep2_Expansion';
import { LobbyStep3_PlayerCount } from './steps/LobbyStep3_PlayerCount';
import { LobbyStep4_PlayersSetup } from './steps/LobbyStep4_PlayersSetup';
import { GeminiSettingsModal } from '../../services/gemini/GeminiSettingsModal';
import { OnlineRoomModal } from './modals/OnlineRoomModal';
import { LobbyChat } from './LobbyChat';
import { socketService } from '../../services/network/socketService';

interface LobbyScreenProps {
  onStartGame: (playerCount: 3 | 4, lobbyPlayers: LobbyPlayer[], botTimeLimit: number) => void;
  roomId: string | null;
  setRoomId: (roomId: string | null) => void;
  isHost: boolean;
  setIsHost: (isHost: boolean) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onStartGame,
  roomId,
  setRoomId,
  isHost,
  setIsHost,
}) => {
  const [isGeminiSettingsOpen, setIsGeminiSettingsOpen] = useState(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [isOnlineCreationMode, setIsOnlineCreationMode] = useState<boolean>(false);
  const { 
    boardType,
    setBoardType, 
    activeExpansion, 
    setActiveExpansion,
    selectedScenario,
    setSelectedScenario,
    myPlayerId,
    setMyPlayerId
  } = useGame();
  
  const [playerCount, setPlayerCount] = useState<3 | 4>(4);
  const [botTimeLimit, setBotTimeLimit] = useState<number>(10);

  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([
    { id: 'p1', name: 'שחקן 1 (רוס)', color: '#e53935', isBot: false, playerType: 'HUMAN', difficulty: undefined },
    { id: 'p2', name: 'שחקן 2', color: '#1e88e5', isBot: true, playerType: 'LOCAL_BOT', difficulty: 'בינוני' },
    { id: 'p3', name: 'שחקן 3', color: '#fdd835', isBot: true, playerType: 'LOCAL_BOT', difficulty: 'בינוני' },
    { id: 'p4', name: 'שחקן 4', color: '#43a047', isBot: true, playerType: 'LOCAL_BOT', difficulty: 'בינוני' },
  ]);

  const isOnlineMode = !!roomId || isOnlineCreationMode;

  useEffect(() => {
    if (isOnlineMode) {
      setLobbyPlayers(prev => prev.map((p, idx) => ({
        ...p,
        playerType: 'HUMAN',
        isBot: false,
        name: p.name.startsWith('שחקן') || p.name === '' ? `שחקן ${idx + 1}` : p.name
      })));
    } else {
      setLobbyPlayers(prev => prev.map((p, idx) => ({
        ...p,
        playerType: idx === 0 ? 'HUMAN' : 'LOCAL_BOT',
        isBot: idx !== 0,
        name: idx === 0 ? p.name : `שחקן ${idx + 1}`
      })));
    }
  }, [isOnlineMode]);

  const togglePlayerType = (id: string, playerType: PlayerType) => {
    setLobbyPlayers(prev => prev.map((item, idx) => {
      if (item.id === id) {
        const defaultNames = ["רוס", "פיבי", "ג'ואי", "צ'נדלר"];
        const newName = defaultNames[idx] || item.name;
        
        if (roomId && isHost) {
          const status = (playerType === 'LOCAL_BOT' || playerType === 'GEMINI_AI') ? 'LOCKED_BOT' : 'OPEN';
          socketService.updateSlotStatus(roomId, id, status);
        }

        return {
          ...item,
          isBot: playerType !== 'HUMAN',
          playerType,
          name: newName
        };
      }
      return item;
    }));
  };

  const { isStatsModalOpen, setIsStatsModalOpen } = useUser();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [gameType, setGameType] = useState<'BASE' | 'SPACE'>('BASE');
  const [isGlobalDifficulty, setIsGlobalDifficulty] = useState<boolean>(true);
  const [globalDifficulty, setGlobalDifficulty] = useState<'קל' | 'בינוני' | 'קשה' | 'סופר קשה'>('בינוני');

  // Sync bot difficulties if global difficulty is enabled
  useEffect(() => {
    if (isGlobalDifficulty) {
      setLobbyPlayers(prev => prev.map(p => {
        if (p.isBot) {
          return { ...p, difficulty: globalDifficulty };
        }
        return p;
      }));
    }
  }, [isGlobalDifficulty, globalDifficulty]);

  // Host broadcast settings to room
  useEffect(() => {
    if (roomId && isHost) {
      socketService.updateGameSettings(roomId, {
        gameType,
        activeExpansion,
        selectedScenario,
        boardType,
        playerCount,
        lobbyPlayers,
        botTimeLimit,
      });
    }
  }, [roomId, isHost, gameType, activeExpansion, selectedScenario, boardType, playerCount, lobbyPlayers, botTimeLimit]);

  // Guest listen to settings & jump directly to Step 4
  useEffect(() => {
    if (roomId && !isHost) {
      setCurrentStep(4);
      socketService.onGameSettingsUpdated((settings) => {
        if (settings.gameType !== undefined) setGameType(settings.gameType);
        if (settings.activeExpansion !== undefined) setActiveExpansion(settings.activeExpansion);
        if (settings.selectedScenario !== undefined) setSelectedScenario(settings.selectedScenario);
        if (settings.boardType !== undefined) setBoardType(settings.boardType);
        if (settings.playerCount !== undefined) setPlayerCount(settings.playerCount);
        if (settings.lobbyPlayers !== undefined) setLobbyPlayers(settings.lobbyPlayers);
        if (settings.botTimeLimit !== undefined) setBotTimeLimit(settings.botTimeLimit);
      });
    }
  }, [roomId, isHost, setActiveExpansion, setSelectedScenario, setBoardType]);

  // Host listen for incoming player joins
  useEffect(() => {
    if (roomId && isHost) {
      socketService.onPlayerJoined(({ playerName, assignedPlayerId }: { playerName: string; assignedPlayerId?: string }) => {
        setLobbyPlayers(prev => {
          if (assignedPlayerId) {
            return prev.map(p => p.id === assignedPlayerId ? { ...p, name: playerName } : p);
          }
          // Find first open HUMAN slot that doesn't belong to the host (idx > 0)
          const openSlot = prev.find((p, idx) => idx > 0 && p.playerType === 'HUMAN' && !p.isBot && (p.name.startsWith('שחקן') || p.name === ''));
          if (openSlot) {
            return prev.map(p => p.id === openSlot.id ? { ...p, name: playerName } : p);
          }
          return prev;
        });
      });

      socketService.onPlayerLeft(({ playerId }) => {
        setLobbyPlayers(prev => prev.map((player, index) =>
          player.id === playerId
            ? { ...player, name: `שחקן ${index + 1}` }
            : player
        ));
      });
    }
  }, [roomId, isHost]);

  // When host reaches Step 4 in online creation mode, create the online room
  useEffect(() => {
    if (currentStep === 4 && isOnlineCreationMode && !roomId && isHost) {
      const newRoomId = 'CATAN-' + Math.floor(1000 + Math.random() * 9000);
      
      socketService.createRoom({
        roomId: newRoomId,
        hostName: lobbyPlayers.find(p => !p.isBot)?.name || 'שחקן',
        expansion: activeExpansion,
        scenario: selectedScenario,
        boardType: boardType,
        maxPlayers: playerCount,
      });

      socketService.joinRoom(newRoomId, lobbyPlayers.find(p => !p.isBot)?.name || 'שחקן').then((assignedId) => {
        if (!assignedId) {
          setRoomId(null);
          setIsHost(false);
          return;
        }
        setMyPlayerId(assignedId);
      });
      setRoomId(newRoomId);
      setIsOnlineCreationMode(false);
    }
  }, [currentStep, isOnlineCreationMode, roomId, isHost, activeExpansion, selectedScenario, boardType, playerCount, lobbyPlayers, setRoomId, setIsHost, setMyPlayerId]);

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      onStartGame(playerCount, lobbyPlayers, botTimeLimit);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      setCurrentStep(3);
    }
  };

  return (
    <div 
      className="w-full h-full min-h-screen overflow-y-auto flex flex-col items-center justify-start text-slate-100 p-4 md:p-8 relative bg-slate-950"
      style={{ 
        backgroundImage: "url('/table.png')", 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Blurred dark overlay layer for contrast */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md pointer-events-none z-0" />

      {/* Main setup container */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800/80 p-6 md:p-10 rounded-2xl shadow-2xl z-10 flex flex-col items-center my-auto" dir="rtl">
        
        {/* Auth Widget */}
        <div className="w-full max-w-sm mb-6">
          <AuthWidget />
        </div>

        {/* Header Section */}
        <div className="text-center w-full mb-6">
          <div className="inline-block px-4 py-1 bg-amber-500/15 border border-amber-500/25 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            Catan Premium Edition
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2 font-sans">
            הגדרת משחק קטאן {roomId ? (
              <span className="text-sm font-mono text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-700">חדר: {roomId}</span>
            ) : isOnlineCreationMode ? (
              <span className="text-sm font-sans text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-700">Configuring Online Scenario</span>
            ) : null}
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-amber-500 to-orange-500 mx-auto rounded-full mb-4" />
        </div>

        {/* Stepper Progress */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-8 relative px-4">
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 z-0" />
          
          {[
            { num: 1, title: 'ערכת נושא' },
            { num: 2, title: 'הרחבה ומפה' },
            { num: 3, title: 'כמות שחקנים' },
            { num: 4, title: 'משתתפים וזמן' }
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setCurrentStep(s.num as 1 | 2 | 3 | 4)}
              disabled={roomId !== null && !isHost}
              className="group flex flex-col items-center z-10 disabled:cursor-not-allowed"
              aria-label={`עבור לשלב ${s.num}: ${s.title}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                currentStep === s.num ? 'bg-amber-500 text-slate-950 shadow-lg ring-4 ring-amber-500/20' : currentStep > s.num ? 'bg-emerald-500 text-white group-hover:bg-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
              }`}>
                {currentStep > s.num ? '✓' : s.num}
              </div>
              <span className={`text-xs mt-2 font-bold ${currentStep === s.num ? 'text-amber-400' : currentStep > s.num ? 'text-emerald-400' : 'text-slate-500'}`}>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Step Content Render */}
        {currentStep === 1 && (
          <LobbyStep1_Theme
            gameType={gameType}
            setGameType={setGameType}
            onNext={handleNextStep}
          />
        )}

        {currentStep === 2 && (
          <LobbyStep2_Expansion
            activeExpansion={activeExpansion}
            setActiveExpansion={setActiveExpansion}
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
            boardType={boardType}
            setBoardType={setBoardType}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        )}

        {currentStep === 3 && (
          <LobbyStep3_PlayerCount
            playerCount={playerCount}
            setPlayerCount={setPlayerCount}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        )}

        {currentStep === 4 && (
          <div className="w-full flex flex-col gap-6">
            <LobbyStep4_PlayersSetup
              playerCount={playerCount}
              lobbyPlayers={lobbyPlayers}
              setLobbyPlayers={setLobbyPlayers}
              togglePlayerType={togglePlayerType}
              isGlobalDifficulty={isGlobalDifficulty}
              setIsGlobalDifficulty={setIsGlobalDifficulty}
              globalDifficulty={globalDifficulty}
              setGlobalDifficulty={setGlobalDifficulty}
              botTimeLimit={botTimeLimit}
              setBotTimeLimit={setBotTimeLimit}
              onPrev={handlePrevStep}
              onStartGame={() => onStartGame(playerCount, lobbyPlayers, botTimeLimit)}
              isGuest={roomId !== null && !isHost}
              highlightedPlayerId={roomId ? myPlayerId || undefined : lobbyPlayers.find(player => player.playerType === 'HUMAN')?.id}
            />

            {/* הצגת צ'אט החדר רק כאשר קיים חדר אונליין פעיל */}
            {roomId && (
              <LobbyChat
                roomId={roomId}
                playerName={lobbyPlayers.find(p => !p.isBot)?.name || 'שחקן'}
                playerColor={lobbyPlayers.find(p => !p.isBot)?.color}
              />
            )}
          </div>
        )}

        {/* כפתורי פקודות בתחתית */}
        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={() => setIsOnlineModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <span>🌐</span> {roomId ? `חדר פעיל: ${roomId}` : isOnlineCreationMode ? 'Configuring Online Scenario' : 'משחק אונליין (דפדפן חדרים)'}
          </button>

          <button
            type="button"
            onClick={() => setIsStatsModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-md hover:shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <span>📊</span> דירוג וסטטיסטיקות
          </button>

          <button
            type="button"
            onClick={() => setIsGeminiSettingsOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all"
          >
            הגדרות Gemini AI
          </button>
        </div>

        <GeminiSettingsModal
          isOpen={isGeminiSettingsOpen}
          onClose={() => setIsGeminiSettingsOpen(false)}
        />

        <OnlineRoomModal
          isOpen={isOnlineModalOpen}
          onClose={() => setIsOnlineModalOpen(false)}
          onRoomJoined={(code, isHostLocal, assignedId) => {
            setRoomId(code);
            setIsHost(isHostLocal);
            if (isHostLocal) {
              setMyPlayerId('p1');
            } else if (typeof assignedId === 'string') {
              setMyPlayerId(assignedId);
            }
            if (!isHostLocal) setCurrentStep(4);
            setIsOnlineCreationMode(false);
          }}
          onStartOnlineCreation={() => {
            setIsOnlineCreationMode(true);
            setIsHost(true);
            setRoomId(null);
          }}
          playerName={lobbyPlayers.find(p => !p.isBot)?.name || 'שחקן'}
          currentSettings={{
            activeExpansion,
            selectedScenario,
            boardType,
            playerCount,
          }}
        />

        <PlayerStatsModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
        />

      </div>

    </div>
  );
};
