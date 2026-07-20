import React from 'react';
import { 
  UserIcon, BotIcon, EasyIcon, MediumIcon, HardIcon, SuperHardIcon 
} from '../../common/Icons';
import { LobbyPlayer, CATAN_COLORS } from '../types';

interface LobbyStep4PlayersSetupProps {
  playerCount: 3 | 4;
  lobbyPlayers: LobbyPlayer[];
  setLobbyPlayers: React.Dispatch<React.SetStateAction<LobbyPlayer[]>>;
  togglePlayerType: (id: string, isBot: boolean) => void;
  isGlobalDifficulty: boolean;
  setIsGlobalDifficulty: (global: boolean) => void;
  globalDifficulty: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה';
  setGlobalDifficulty: (diff: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה') => void;
  botTimeLimit: number;
  setBotTimeLimit: (limit: number) => void;
  onPrev: () => void;
  onStartGame: () => void;
}

export const LobbyStep4_PlayersSetup: React.FC<LobbyStep4PlayersSetupProps> = ({
  playerCount,
  lobbyPlayers,
  setLobbyPlayers,
  togglePlayerType,
  isGlobalDifficulty,
  setIsGlobalDifficulty,
  globalDifficulty,
  setGlobalDifficulty,
  botTimeLimit,
  setBotTimeLimit,
  onPrev,
  onStartGame,
}) => {
  const activePlayers = lobbyPlayers.slice(0, playerCount);
  const hasBots = activePlayers.some(p => p.isBot);

  const getDifficultyIcon = (diff: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה') => {
    switch (diff) {
      case 'קל': return <EasyIcon size={14} />;
      case 'בינוני': return <MediumIcon size={14} />;
      case 'קשה': return <HardIcon size={14} />;
      case 'סופר קשה': return <SuperHardIcon size={14} />;
    }
  };

  return (
    <div className="w-full animate-fade-in flex flex-col items-center gap-6" dir="rtl">
      
      {/* 🔹 הגדרת המשתתפים */}
      <h2 className="text-xl font-bold text-slate-100 text-center">הגדרת משתתפים וצבעים:</h2>
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

      {/* 🔹 הגדרת בינה מלאכותית ומגבלת זמן (רק אם יש בוטים) */}
      {hasBots && (
        <div className="w-full max-w-2xl flex flex-col gap-6 mt-4">
          
          {/* בוטים בודדים - רק אם קושי גלובלי מכובה */}
          {!isGlobalDifficulty && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-400">הגדרת קושי אינדיבידואלית לבוטים:</h3>
              {activePlayers.filter(p => p.isBot).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-bold text-slate-200">{p.name}</span>
                  </div>

                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800/80">
                    {(['קל', 'בינוני', 'קשה', 'סופר קשה'] as const).map(diff => {
                      const isSelected = p.difficulty === diff || (!p.difficulty && diff === 'בינוני');
                      return (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => {
                            setLobbyPlayers(prev => prev.map(item => item.id === p.id ? { ...item, difficulty: diff } : item));
                          }}
                          className={`py-1.5 px-3 rounded text-xs font-bold transition-all duration-150 cursor-pointer ${
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
                </div>
              ))}
            </div>
          )}

          {/* לוח בקרה ראשי לבוטים וזמן תור */}
          <div className="w-full bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row gap-6 shadow-xl justify-between items-center backdrop-blur-sm">
            
            {/* קושי אחיד גלובלי */}
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

            {/* מגבלת זמן תגובה */}
            <div className="flex flex-col items-start w-full md:w-1/2">
              <label className="text-slate-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                <span>⏱️</span> הגבלת זמן תגובה לבוטים (Turn Timer):
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

        </div>
      )}

      {/* כפתורי ניווט והפעלה ישירה */}
      <div className="w-full flex items-center justify-between mt-6 border-t border-slate-800/80 pt-6 max-w-2xl">
        <button
          type="button"
          onClick={onPrev}
          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-2.5 px-6 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          חזור
        </button>

        <button
          type="button"
          onClick={onStartGame}
          className="bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black py-3.5 px-10 rounded-xl text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-200 tracking-wide hover:brightness-110 cursor-pointer"
        >
          צור לוח וצא לדרך!
        </button>
      </div>
    </div>
  );
};
