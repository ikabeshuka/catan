import React from 'react';
import { 
  UserIcon, BotIcon, EasyIcon, MediumIcon, HardIcon, SuperHardIcon 
} from '../common/Icons';

export const CATAN_COLORS = [
  { name: 'אדום', hex: '#c62828' },
  { name: 'כחול', hex: '#1565c0' },
  { name: 'צהוב', hex: '#f9a825' },
  { name: 'ירוק', hex: '#2e7d32' },
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
  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center justify-start bg-slate-950 text-slate-100 p-6 relative">
      {/* Subtle linen texturing overlays instead of fuzzy AI glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#e1dbcd_1px,transparent_1px)] [background-size:16px_16px] opacity-35 pointer-events-none" />
      
      <div className="text-center w-full max-w-5xl bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-2xl shadow-xl z-10 flex flex-col items-center my-auto">
        <div className="inline-block px-4 py-1.5 bg-amber-100 border border-amber-300 rounded-full text-amber-800 text-xs font-bold uppercase tracking-wider mb-4">
          Premium Board Game Experience
        </div>
        <h1 className="text-5xl font-sans font-extrabold text-slate-100 mb-2 tracking-wider text-center">
          Catan Architecture
        </h1>
        <div className="w-24 h-0.5 bg-amber-600/40 mb-6" />
        <p className="text-slate-400 mb-10 text-sm md:text-base leading-relaxed max-w-2xl mx-auto text-center font-sans">
          ברוכים הבאים לפרויקט קטאן מודולרי ב-React ו-Tauri. הלוח מוכן, המשאבים מוגדרים ומערכת התורים מבוססת ה-AI ממתינה לך.
        </p>

        {/* כמות המשתתפים - קוביות גדולות ורחבות במרכז */}
        <div className="w-full max-w-2xl mb-2 text-right">
          <label className="block text-slate-300 text-lg font-extrabold mb-4 text-center tracking-wider">בחירת כמות שחקנים:</label>
          <div className="flex flex-col sm:flex-row gap-6 justify-center w-full">
            {/* תיבת 3 שחקנים */}
            <button
              type="button"
              onClick={() => setPlayerCount(3)}
              className={`flex-1 p-6 rounded-lg border text-center transition-all duration-300 transform hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center justify-center gap-2 ${
                playerCount === 3
                  ? 'bg-gradient-to-br from-amber-800/20 to-orange-900/10 border-amber-600 shadow-[0_0_20px_rgba(156,116,60,0.15)] border-2 text-white'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
              style={{ borderRadius: '8px' }}
            >
              <span className="text-xl font-extrabold tracking-wide">3 שחקנים</span>
              <span className="text-xs text-slate-400 max-w-[200px]">מפה מצומצמת, קצב מהיר, תחרות גבוהה על משאבים</span>
            </button>

            {/* תיבת 4 שחקנים */}
            <button
              type="button"
              onClick={() => setPlayerCount(4)}
              className={`flex-1 p-6 rounded-lg border text-center transition-all duration-300 transform hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center justify-center gap-2 ${
                playerCount === 4
                  ? 'bg-gradient-to-br from-amber-800/20 to-orange-900/10 border-amber-600 shadow-[0_0_20px_rgba(156,116,60,0.15)] border-2 text-white'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
              style={{ borderRadius: '8px' }}
            >
              <span className="text-xl font-extrabold tracking-wide">4 שחקנים</span>
              <span className="text-xs text-slate-400 max-w-[200px]">מפה מלאה, מסחר פעיל, אסטרטגיה מורכבת</span>
            </button>
          </div>

          {/* הגדרת זמן תגובה מקסימלי לבוטים */}
          <div className="flex flex-col items-center justify-center mb-8 p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl max-w-md mx-auto mt-6">
            <label className="text-slate-300 text-sm font-bold mb-2 flex items-center gap-1.5">
              <span>⏱️</span> הגבלת זמן תגובה לבוט:
            </label>
            <div className="flex items-center gap-3 w-full">
              <input
                type="range"
                min={3}
                max={30}
                value={botTimeLimit}
                onChange={(e) => setBotTimeLimit(parseInt(e.target.value))}
                className="flex-1 accent-amber-500 h-1.5 bg-slate-850 rounded-lg cursor-pointer"
              />
              <span className="text-sm font-mono font-black text-amber-400 bg-slate-950 px-2 py-1 rounded border border-slate-850 min-w-[50px] text-center">
                {botTimeLimit} שנ'
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 text-center">הבוט ייעצר ויפנה את תורו באופן אוטומטי לאחר {botTimeLimit} שניות</p>
          </div>
        </div>

        {/* כרטיסי שחקנים - כרטיסים אנכיים מרווחים עם פינות מעוגלות קלות rounded-xl, גבול דק מאוד וצל עמום ורך */}
        <div className="w-full text-right mb-10">
          <label className="block text-slate-300 text-lg font-extrabold mb-6 text-center tracking-wider">הגדרת המשתתפים:</label>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${playerCount === 3 ? 'lg:grid-cols-3 max-w-4xl mx-auto' : 'lg:grid-cols-4'} gap-6 w-full`}>
            {lobbyPlayers.slice(0, playerCount).map((p, index) => (
              <div 
                key={p.id} 
                className="flex flex-col items-center justify-start p-6 bg-slate-900/80 rounded-2xl border border-slate-800/60 shadow-lg shadow-black/20 hover:border-slate-700/60 transition-all duration-300 gap-6 relative min-h-[440px]"
                style={{ padding: '24px' }}
              >
                {/* כותרת הכרטיס בגופן Bold נקי */}
                <div className="flex flex-col items-center gap-1.5 w-full border-b border-slate-800/60 pb-3">
                  <span className="text-xl font-bold tracking-wide text-slate-100 font-sans">
                    שחקן {index + 1}
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-[6px] font-extrabold tracking-wider border ${
                    !p.isBot 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' 
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                  }`}>
                    {!p.isBot ? '👤 אנושי (אתה)' : `🤖 בוט מחשב`}
                  </span>
                </div>

                {/* בחירת סוג שחקן: שני כפתורי ריבוע קטנים וצמודים */}
                <div className="w-full flex flex-col gap-2 text-right">
                  <label className="block text-xs text-slate-400 font-bold">סוג שחקן:</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => togglePlayerType(p.id, false)}
                      className={`py-2 px-3 rounded-[6px] text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer border ${
                        !p.isBot 
                          ? 'bg-amber-600 border-amber-500 text-slate-950 font-extrabold shadow-sm' 
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                      }`}>
                      <UserIcon size={12} />
                      <span>אנושי</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlayerType(p.id, true)}
                      className={`py-2 px-3 rounded-[6px] text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer border ${
                        p.isBot 
                          ? 'bg-amber-600 border-amber-500 text-slate-950 font-extrabold shadow-sm' 
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                      }`}>
                      <BotIcon size={12} />
                      <span>בוט</span>
                    </button>
                  </div>
                </div>

                {/* שם השחקן - מוסר עבור בוטים */}
                {!p.isBot ? (
                  <div className="w-full text-right">
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">שם השחקן:</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLobbyPlayers(prev => prev.map(item => item.id === p.id ? { ...item, name: val } : item));
                        }}
                        className="w-full pr-8 text-center bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-[6px] px-3 py-2 text-slate-100 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                        placeholder={`שם שחקן ${index + 1}`}
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                        <UserIcon size={14} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full text-right py-2 px-3 bg-slate-950/40 border border-dashed border-slate-800/80 rounded-[6px]">
                    <span className="block text-[11px] text-slate-400 font-bold">שם הבוט (אוטומטי):</span>
                    <div className="text-center text-sm font-bold text-amber-500 font-sans mt-0.5">
                      {p.name}
                    </div>
                  </div>
                )}

                {/* בחירת צבע השחקן עם מנגנון נעילת צבעים ועיגולים גדולים יותר */}
                <div className="w-full flex flex-col gap-2 text-right">
                  <label className="block text-[11px] text-slate-400 font-bold">צבע חלקי המשחק:</label>
                  <div className="flex justify-center gap-3 w-full py-1">
                    {CATAN_COLORS.map(colorOption => {
                      const isSelected = p.color === colorOption.hex;
                      const isTakenByOther = lobbyPlayers.slice(0, playerCount).some(
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
                          className={`w-12 h-12 rounded-full border-2 border-transparent relative transition-all duration-200 cursor-pointer ${
                            isSelected 
                              ? 'ring-3 ring-amber-500 scale-105 shadow-md' 
                              : isTakenByOther 
                                ? 'opacity-40 cursor-not-allowed' 
                                : 'hover:scale-105 hover:border-white/20'
                          }`}
                          style={{ backgroundColor: colorOption.hex }}
                          title={isTakenByOther ? `צבע תפוס` : colorOption.name}
                        >
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center text-lg text-white font-black drop-shadow-md">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* בחירת דרגת קושי עבור בוטים */}
                {p.isBot && (
                  <div className="w-full flex flex-col gap-1 transition-all duration-300">
                    <label className="block text-[10px] text-slate-500 font-bold text-right">דרגת קושי:</label>
                    <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/40" style={{ borderRadius: '8px' }}>
                      {(['קל', 'בינוני', 'קשה', 'סופר קשה'] as const).map(diff => {
                        const diffStyles = {
                          'קל': { activeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <EasyIcon size={12} /> },
                          'בינוני': { activeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: <MediumIcon size={12} /> },
                          'קשה': { activeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: <HardIcon size={12} /> },
                          'סופר קשה': { activeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <SuperHardIcon size={12} /> },
                        };
                        const style = diffStyles[diff];
                        const isDiffSelected = p.difficulty === diff || (!p.difficulty && diff === 'בינוני');

                        return (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => {
                              setLobbyPlayers(prev => prev.map(item => item.id === p.id ? { ...item, difficulty: diff } : item));
                            }}
                            className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              isDiffSelected 
                                ? `${style.activeClass} font-extrabold` 
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                            style={{ borderRadius: '6px' }}
                          >
                            {style.icon}
                            <span>{diff}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStartGame}
          className="w-full max-w-md bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold py-4 px-8 rounded-xl text-lg shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95 transition-all duration-200 tracking-wide hover:brightness-110 cursor-pointer mt-4"
        >
          צור לוח וצא לדרך
        </button>
      </div>
    </div>
  );
};
