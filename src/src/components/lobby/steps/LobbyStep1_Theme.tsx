import React from 'react';

interface LobbyStep1ThemeProps {
  gameType: 'BASE' | 'SPACE';
  setGameType: (type: 'BASE' | 'SPACE') => void;
  onNext: () => void;
}

export const LobbyStep1_Theme: React.FC<LobbyStep1ThemeProps> = ({
  gameType,
  setGameType,
  onNext,
}) => {
  return (
    <div className="w-full animate-fade-in flex flex-col items-center gap-6" dir="rtl">
      {/* 🔹 בחירת סוג משחק / ערכת נושא */}
      <h2 className="text-xl font-bold text-slate-100 text-center">בחר את ערכת הנושא / המפה הבסיסית:</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
        
        {/* קטאן ערכת הבסיס */}
        <button
          type="button"
          onClick={() => {
            setGameType('BASE');
            onNext();
          }}
          className={`group p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${
            gameType === 'BASE'
              ? 'border-amber-500 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
          }`}
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
            <span className="text-lg font-black text-slate-100">קטאן ערכת הבסיס</span>
            <span className="text-xs text-slate-400 mt-1 leading-relaxed">
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
            <span className="text-lg font-black text-slate-400">קטאן חלל</span>
            <span className="text-xs text-slate-500 mt-1 leading-relaxed">
              הרפתקה בין-כוכבית עתידנית במעמקי הגלקסיה.
            </span>
          </div>
        </div>

        {/* קטאן יוונים - חסום (טיוטה) */}
        <div 
          className="p-4 rounded-2xl border border-slate-800/80 text-center relative overflow-hidden flex flex-col items-center gap-4 bg-slate-950/40 opacity-60 cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
            <span className="text-sm font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow">
              🔒 בקרוב!
            </span>
          </div>
          <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-4xl">🏛️</div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-slate-400">קטאן יוונים</span>
            <span className="text-xs text-slate-500 mt-1 leading-relaxed">
              קרבות ומסחר ביוון העתיקה סביב הים האגאי.
            </span>
          </div>
        </div>

      </div>

      <p className="text-xs font-bold text-amber-400/80">לחיצה על ערכת המשחק ממשיכה מיד לשלב הבא.</p>
    </div>
  );
};
