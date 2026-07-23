import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { LobbyPlayer } from './types';
import { LobbyStep1_Theme } from './steps/LobbyStep1_Theme';
import { LobbyStep2_Expansion } from './steps/LobbyStep2_Expansion';
import { LobbyStep3_PlayerCount } from './steps/LobbyStep3_PlayerCount';
import { LobbyStep4_PlayersSetup } from './steps/LobbyStep4_PlayersSetup';
import { GeminiSettingsModal } from '../../services/gemini/GeminiSettingsModal';

interface LobbyScreenProps {
  onStartGame: (playerCount: 3 | 4, lobbyPlayers: LobbyPlayer[], botTimeLimit: number) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onStartGame
}) => {
  const [isGeminiSettingsOpen, setIsGeminiSettingsOpen] = useState(false);
  const { 
    boardType,
    setBoardType, 
    activeExpansion, 
    setActiveExpansion,
    selectedScenario,
    setSelectedScenario
  } = useGame();
  
  const [playerCount, setPlayerCount] = useState<3 | 4>(4);
  const [botTimeLimit, setBotTimeLimit] = useState<number>(10);

  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([
    { id: 'p1', name: 'פיבי', color: '#e53935', isBot: false, difficulty: undefined },
    { id: 'p2', name: 'רוס', color: '#1e88e5', isBot: true, difficulty: 'בינוני' },
    { id: 'p3', name: 'צ\'נדלר', color: '#fdd835', isBot: true, difficulty: 'בינוני' },
    { id: 'p4', name: 'ג\'ואי', color: '#43a047', isBot: true, difficulty: 'בינוני' },
  ]);

  const togglePlayerType = (id: string, isBot: boolean) => {
    setLobbyPlayers(prev => prev.map((item, idx) => {
      if (item.id === id) {
        const defaultNames = ['פיבי', 'רוס', 'צ\'נדלר', 'ג\'ואי'];
        const newName = defaultNames[idx] || item.name;
        return {
          ...item,
          isBot,
          name: newName
        };
      }
      return item;
    }));
  };

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
      {/* Blurred dark overlay layer for superb text contrast */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md pointer-events-none z-0" />

      {/* Main setup container */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800/80 p-6 md:p-10 rounded-2xl shadow-2xl z-10 flex flex-col items-center my-auto" dir="rtl">
        
        {/* Header Section */}
        <div className="text-center w-full mb-6">
          <div className="inline-block px-4 py-1 bg-amber-500/15 border border-amber-500/25 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            Catan Premium Edition
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2 font-sans">
            הגדרת משחק קטאן
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-amber-500 to-orange-500 mx-auto rounded-full mb-4" />
        </div>

        {/* Beautiful Stepper Progress */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-8 relative px-4">
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 z-0" />
          
          {/* Step 1 */}
          <div className="flex flex-col items-center z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              currentStep === 1 
                ? 'bg-amber-500 text-slate-950 shadow-lg ring-4 ring-amber-500/20' 
                : currentStep > 1 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-800 text-slate-400'
            }`}>
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <span className={`text-xs mt-2 font-bold ${currentStep === 1 ? 'text-amber-400' : currentStep > 1 ? 'text-emerald-400' : 'text-slate-500'}`}>ערכת נושא</span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              currentStep === 2 
                ? 'bg-amber-500 text-slate-950 shadow-lg ring-4 ring-amber-500/20' 
                : currentStep > 2 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-800 text-slate-400'
            }`}>
              {currentStep > 2 ? '✓' : '2'}
            </div>
            <span className={`text-xs mt-2 font-bold ${currentStep === 2 ? 'text-amber-400' : currentStep > 2 ? 'text-emerald-400' : 'text-slate-500'}`}>הרחבה ומפה</span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              currentStep === 3 
                ? 'bg-amber-500 text-slate-950 shadow-lg ring-4 ring-amber-500/20' 
                : currentStep > 3 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-800 text-slate-400'
            }`}>
              {currentStep > 3 ? '✓' : '3'}
            </div>
            <span className={`text-xs mt-2 font-bold ${currentStep === 3 ? 'text-amber-400' : currentStep > 3 ? 'text-emerald-400' : 'text-slate-500'}`}>כמות שחקנים</span>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center z-10">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
              currentStep === 4 
                ? 'bg-amber-500 text-slate-950 shadow-lg ring-4 ring-amber-500/20' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              4
            </div>
            <span className={`text-xs mt-2 font-bold ${currentStep === 4 ? 'text-amber-400' : 'text-slate-500'}`}>משתתפים וזמן</span>
          </div>
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
          />
        )}

        <button
          type="button"
          onClick={() => setIsGeminiSettingsOpen(true)}
          className="mt-4 text-xs text-slate-400 hover:text-amber-400 transition-colors"
        >
          הגדרות Gemini AI
        </button>

        <GeminiSettingsModal
          isOpen={isGeminiSettingsOpen}
          onClose={() => setIsGeminiSettingsOpen(false)}
        />

      </div>

    </div>
  );
};
