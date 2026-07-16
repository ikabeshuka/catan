import React, { useState, useEffect } from 'react';
import { 
  UserIcon, BotIcon, EasyIcon, MediumIcon, HardIcon, SuperHardIcon 
} from '../common/Icons';
import { useGame } from '../../context/GameContext';

export const CATAN_COLORS = [
  { name: 'אדום', hex: '#e53935' },
  { name: 'כחול', hex: '#1e88e5' },
  { name: 'צהוב', hex: '#fdd835' },
  { name: 'ירוק', hex: '#43a047' },
];

interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  difficulty?: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה';
}

interface LobbyScreenProps {
  playerCount: 3 | 4;
  setPlayerCount: (count: 3 | 4) => void;
  lobbyPlayers: LobbyPlayer[];
  setLobbyPlayers: React.Dispatch<React.SetStateAction<LobbyPlayer[]>>;
  togglePlayerType: (id: string, isBot: boolean) => void;
  botTimeLimit: number;
  setBotTimeLimit: (limit: number) => void;
  handleStartGame: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  playerCount,
  setPlayerCount,
  lobbyPlayers,
  setLobbyPlayers,
  togglePlayerType,
  botTimeLimit,
  setBotTimeLimit,
  handleStartGame
}) => {
  const { boardType: _boardType, setBoardType, activeExpansion, setActiveExpansion } = useGame();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [gameType, setGameType] = useState<'BASE' | 'SPACE'>('BASE');
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [isGlobalDifficulty, setIsGlobalDifficulty] = useState<boolean>(true);
  const [globalDifficulty, setGlobalDifficulty] = useState<'קל' | 'בינוני' | 'קשה' | 'סופר קשה'>('בינוני');

  // Check if there is at least one bot in the current selection
  const activePlayers = lobbyPlayers.slice(0, playerCount);
  const hasBots = activePlayers.some(p => p.isBot);

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
  }, [isGlobalDifficulty, globalDifficulty, setLobbyPlayers]);

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (gameType === 'BASE') {
        setShowMapModal(true);
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      handleStartGame();
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

  const getDifficultyIcon = (diff: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה') => {
    switch (diff) {
      case 'קל': return <EasyIcon size={14} />;
      case 'בינוני': return <MediumIcon size={14} />;
      case 'קשה': return <HardIcon size={14} />;
      case 'סופר קשה': return <SuperHardIcon size={14} />;
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
            <span className={`text-xs mt-2 font-bold ${currentStep === 1 ? 'text-amber-400' : currentStep > 1 ? 'text-emerald-400' : 'text-slate-500'}`}>בחירת משחק</span>
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
            <span className={`text-xs mt-2 font-bold ${currentStep === 2 ? 'text-amber-400' : currentStep > 2 ? 'text-emerald-400' : 'text-slate-500'}`}>בחירת הרחבות</span>
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
            <span className={`text-xs mt-2 font-bold ${currentStep === 4 ? 'text-amber-400' : 'text-slate-500'}`}>הגדרת משתתפים</span>
          </div>
        </div>

        {/* 🔹 שלב 1: בחירת משחק (Game Selection) */}
        {currentStep === 1 && (
          <div className="w-full max-w-2xl animate-fade-in flex flex-col items-center gap-6">
            <h2 className="text-xl font-bold text-slate-100 text-center">בחר את סוג משחק הקטאן שלך:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
              
              {/* קטאן ערכת הבסיס */}
              <button
                type="button"
                onClick={() => {
                  setGameType('BASE');
                  setCurrentStep(2);
                }}
                className="group p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 border-slate-800 hover:border-amber-500 bg-slate-900/40 hover:bg-slate-900/70 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]"
              >
                <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
                  <img 
                    src="/base_game.png" 
                    alt="Catan Base Game" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-black text-slate-100">קטאן ערכת הבסיס</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                    חוויית קטאן הקלאסית והמרהיבה בתלת-ממד מלא.
                  </span>
                </div>
              </button>

              {/* קטאן חלל - חסום (טיוטה) */}
              <div 
                className="p-4 rounded-2xl border border-slate-800/80 text-center relative overflow-hidden flex flex-col items-center gap-4 bg-slate-950/40 opacity-60 cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                  <span className="text-sm font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow">
                    🔒 בקרוב!
                  </span>
                </div>
                <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
                  <img 
                    src="/space_catan.png" 
                    alt="Space Catan" 
                    className="w-full h-full object-cover grayscale" 
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-black text-slate-400">קטאן חלל</span>
                  <span className="text-xs text-slate-500 mt-1 max-w-[220px] leading-relaxed">
                    הרפתקה בין-כוכבית עתידנית במעמקי הגלקסיה.
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 🔹 שלב 2: בחירת הרחבות (Expansion Select) */}
        {currentStep === 2 && (
          <div className="w-full max-w-2xl animate-fade-in flex flex-col items-center gap-6">
            <h2 className="text-xl font-bold text-slate-100 text-center">בחר הרחבות מיוחדות למשחק:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
              
              {/* סוחרים וברברים */}
              <button
                type="button"
                onClick={() => setActiveExpansion(activeExpansion === 'MERCHANTS_AND_BARBARIANS' ? 'BASE' : 'MERCHANTS_AND_BARBARIANS')}
                className={`group p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${
                  activeExpansion === 'MERCHANTS_AND_BARBARIANS'
                    ? 'border-amber-500 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
                  <img 
                    src="/traders_barbarians.png" 
                    alt="Traders & Barbarians" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                  {activeExpansion === 'MERCHANTS_AND_BARBARIANS' && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 rounded-full p-1 shadow-lg z-10">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-black text-slate-100">סוחרים וברברים</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                    משימות הובלה מרתקות, שיירות, וזהב כפיצוי על תורות חלשים.
                  </span>
                </div>
              </button>

              {/* יורדי הים */}
              <button
                type="button"
                onClick={() => setActiveExpansion(activeExpansion === 'SEAFARERS' ? 'BASE' : 'SEAFARERS')}
                className={`group p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${
                  activeExpansion === 'SEAFARERS'
                    ? 'border-amber-500 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
                  <img 
                    src="/seafarers.png" 
                    alt="Seafarers" 
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${activeExpansion === 'SEAFARERS' ? '' : 'grayscale'}`} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                  {activeExpansion === 'SEAFARERS' && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 rounded-full p-1 shadow-lg z-10">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-black text-slate-100">יורדי הים</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                    הרחבת יורדי הים - בניית אוניות, נתיבי שיט וניווט בין איים.
                  </span>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* 🔹 שלב 3: כמות שחקנים (Player Count Selection) */}
        {currentStep === 3 && (
          <div className="w-full max-w-2xl animate-fade-in flex flex-col items-center gap-6">
            <h2 className="text-xl font-bold text-slate-100 text-center">בחר את כמות השחקנים סביב השולחן:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
              
              {/* Card 3 Players */}
              <button
                type="button"
                onClick={() => { setPlayerCount(3); setCurrentStep(4); }}
                className={`group p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${
                  playerCount === 3
                    ? 'bg-gradient-to-b from-amber-500/10 to-orange-500/5 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-full h-36 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
                  <img 
                    src="/3player.jpg" 
                    alt="3 Players Table" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                </div>
                <div className="flex flex-col items-center">
                  <span className={`text-xl font-black ${playerCount === 3 ? 'text-amber-400' : 'text-slate-200'}`}>3 שחקנים</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                    שולחן עגול קלאסי. מפה מצומצמת, משחק קצבי ותחרות פראית על כל שטח פנוי!
                  </span>
                </div>
              </button>

              {/* Card 4 Players */}
              <button
                type="button"
                onClick={() => { setPlayerCount(4); setCurrentStep(4); }}
                className={`group p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${
                  playerCount === 4
                    ? 'bg-gradient-to-b from-amber-500/10 to-orange-500/5 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-full h-36 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
                  <img 
                    src="/4player.jpg" 
                    alt="4 Players Table" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                </div>
                <div className="flex flex-col items-center">
                  <span className={`text-xl font-black ${playerCount === 4 ? 'text-amber-400' : 'text-slate-200'}`}>4 שחקנים</span>
                  <span className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                    שולחן מלבני אלכסוני. מפה מלאה ועשירה, מסחר אינטנסיבי ואסטרטגיה עמוקה לטווח רחוק.
                  </span>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* 🔹 שלב 4: הגדרת שחקנים ורמות קושי בבוטים (Unified Setup) */}
        {currentStep === 4 && (
          <div className="w-full animate-fade-in flex flex-col items-center gap-6">
            <h2 className="text-lg font-bold text-slate-300 text-center">הגדרת משתתפים ובינה מלאכותית:</h2>
            <div className="w-full max-w-2xl flex flex-col gap-4">
              {activePlayers.map((p, index) => (
                <div 
                  key={p.id}
                  className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl gap-4 shadow-md"
                >
                  {/* Avatar & Label */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shadow animate-pulse" 
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-sm font-bold text-slate-400 min-w-[55px]">שחקן {index + 1}:</span>
                  </div>

                  {/* Toggle Button (Human / Bot) */}
                  <div className="w-full md:w-auto flex gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => togglePlayerType(p.id, false)}
                      className={`flex-1 md:flex-none py-1.5 px-3 rounded-md text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer border ${
                        !p.isBot 
                          ? 'bg-amber-500 border-amber-400 text-slate-950 font-extrabold shadow' 
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <UserIcon size={13} />
                      <span>אנושי</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlayerType(p.id, true)}
                      className={`flex-1 md:flex-none py-1.5 px-3 rounded-md text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer border ${
                        p.isBot 
                          ? 'bg-amber-500 border-amber-400 text-slate-950 font-extrabold shadow' 
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <BotIcon size={13} />
                      <span>בוט מחשב</span>
                    </button>
                  </div>

                  {/* Name Input */}
                  <div className="w-full md:flex-1 relative">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLobbyPlayers(prev => prev.map(item => item.id === p.id ? { ...item, name: val } : item));
                      }}
                      className="w-full text-right bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-2 pr-9 text-slate-100 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                      placeholder="שם השחקן..."
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {p.isBot ? <BotIcon size={14} /> : <UserIcon size={14} />}
                    </div>
                  </div>

                  {/* Individual Bot Difficulty Selector (Only visible if not global difficulty) */}
                  {p.isBot && !isGlobalDifficulty && (
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800/80 w-full md:w-auto">
                      {(['קל', 'בינוני', 'קשה', 'סופר קשה'] as const).map(diff => {
                        const isSelected = p.difficulty === diff || (!p.difficulty && diff === 'בינוני');
                        return (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => {
                              setLobbyPlayers(prev => prev.map(item => item.id === p.id ? { ...item, difficulty: diff } : item));
                            }}
                            className={`py-1 px-2 rounded text-[10px] font-bold transition-all duration-150 ${
                              isSelected 
                                ? 'bg-amber-500 text-slate-950 font-extrabold shadow' 
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {diff}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Color Selector */}
                  <div className="flex gap-1.5">
                    {CATAN_COLORS.map(colorOption => {
                      const isSelected = p.color === colorOption.hex;
                      const isTakenByOther = activePlayers.some(
                        other => other.id !== p.id && other.color === colorOption.hex
                      );

                      return (
                        <button
                          key={colorOption.hex}
                          type="button"
                          disabled={isTakenByOther}
                          onClick={() => {
                            if (!isTakenByOther) {
                              setLobbyPlayers(prev => prev.map(item => item.id === p.id ? { ...item, color: colorOption.hex } : item));
                            }
                          }}
                          className={`w-7 h-7 rounded-full border border-slate-900 relative transition-all duration-150 cursor-pointer ${
                            isSelected 
                              ? 'ring-2 ring-amber-500 scale-110 shadow-md' 
                              : isTakenByOther 
                                ? 'opacity-20 cursor-not-allowed' 
                                : 'hover:scale-105 border-white/15'
                          }`}
                          style={{ backgroundColor: colorOption.hex }}
                          title={isTakenByOther ? `צבע תפוס` : colorOption.name}
                        >
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-black">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                </div>
              ))}
            </div>

            {/* AI Control Panel (Shown only if there are active bots) */}
            {hasBots && (
              <div className="w-full max-w-2xl bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row gap-6 shadow-xl justify-between items-center backdrop-blur-sm">
                
                {/* Global Difficulty Control */}
                <div className="flex flex-col gap-4 w-full md:w-1/2 border-b md:border-b-0 md:border-l border-slate-800/80 pb-4 md:pb-0 md:pl-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-bold text-slate-200">קושי אחיד לכל הבוטים</span>
                      <span className="text-xs text-slate-500">החל רמת קושי זהה לכל בוט של שחקן מחשב</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isGlobalDifficulty} 
                        onChange={(e) => setIsGlobalDifficulty(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-950 peer-checked:after:border-amber-400"></div>
                    </label>
                  </div>

                  {isGlobalDifficulty && (
                    <div className="grid grid-cols-4 gap-1.5 w-full mt-2">
                      {(['קל', 'בינוני', 'קשה', 'סופר קשה'] as const).map(diff => {
                        const isSelected = globalDifficulty === diff;
                        return (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setGlobalDifficulty(diff)}
                            className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              isSelected 
                                ? 'bg-amber-500 border-amber-400 text-slate-950 font-extrabold shadow-md' 
                                : 'border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {getDifficultyIcon(diff)}
                            <span>{diff}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bot Reaction Range Limit */}
                <div className="flex flex-col items-start w-full md:w-1/2">
                  <label className="text-slate-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                    <span>⏱️</span> הגבלת זמן תגובה לבוטים:
                  </label>
                  <div className="flex items-center gap-3 w-full">
                    <input
                      type="range"
                      min={3}
                      max={30}
                      value={botTimeLimit}
                      onChange={(e) => setBotTimeLimit(parseInt(e.target.value))}
                      className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono font-black text-amber-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 min-w-[50px] text-center">
                      {botTimeLimit} שנ'
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">הבוט יפנה את תורו באופן אוטומטי במקרה של השהייה</p>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="w-full flex items-center justify-between gap-4 mt-6 border-t border-slate-800/80 pt-6">
          
          {/* Back Button */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-2.5 px-6 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              חזור
            </button>
          ) : (
            <div /> // Empty filler spacer to push the next button to the left
          )}

          {/* Next / Start Button */}
          {currentStep !== 1 && currentStep !== 3 && (
            <button
              type="button"
              onClick={handleNextStep}
              className="bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black py-3 px-8 rounded-xl text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-200 tracking-wide hover:brightness-110 cursor-pointer"
            >
              {currentStep === 4 ? 'צור לוח וצא לדרך' : 'המשך'}
            </button>
          )}
        </div>

      </div>

      {/* 🎭 פאנל המודל הקופץ היוקרתי לבחירת המפה (Map Selection Modal) */}
      {showMapModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl flex flex-col gap-6 text-center">
            <h3 className="text-2xl font-black text-slate-50">בחר סוג מפה למשחק הבסיס</h3>
            <p className="text-sm text-slate-400">המפה תקבע את סידור משאבי המשושים והמספרים על גבי הלוח.</p>
            
            <div className="grid grid-cols-1 gap-4 mt-2">
              <button 
                type="button"
                onClick={() => {
                  setBoardType('RANDOM');
                  setShowMapModal(false);
                  setCurrentStep(3);
                }}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border border-slate-850 hover:border-amber-500 bg-slate-950/50 hover:bg-slate-950/80 transition text-right w-full cursor-pointer"
              >
                <span className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  🎲 מפה אקראית
                </span>
                <span className="text-xs text-slate-400">מפה המיוצרת באקראיות מלאה ומציעה בכל משחק אתגר חדש ומשתנה.</span>
              </button>

              <button 
                type="button"
                onClick={() => {
                  setBoardType('STARTER');
                  setShowMapModal(false);
                  setCurrentStep(3);
                }}
                className="flex flex-col items-center gap-2 p-5 rounded-xl border border-slate-850 hover:border-amber-500 bg-slate-950/50 hover:bg-slate-950/80 transition text-right w-full cursor-pointer"
              >
                <span className="text-lg font-bold text-amber-500 flex items-center gap-2">
                  📜 לוח קלאסי למתחילים
                </span>
                <span className="text-xs text-slate-400">פריסת לוח קבועה, מאוזנת ורשמית המומלצת למשחקי פתיחה.</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};