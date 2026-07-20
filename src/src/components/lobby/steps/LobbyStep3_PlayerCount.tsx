import React from 'react';

interface LobbyStep3PlayerCountProps {
  playerCount: 3 | 4;
  setPlayerCount: (count: 3 | 4) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const LobbyStep3_PlayerCount: React.FC<LobbyStep3PlayerCountProps> = ({
  playerCount,
  setPlayerCount,
  onNext,
  onPrev,
}) => {
  return (
    <div className="w-full animate-fade-in flex flex-col items-center gap-6" dir="rtl">
      {/* 🔹 בחירת כמות שחקנים */}
      <h2 className="text-xl font-bold text-slate-100 text-center">בחר את כמות השחקנים סביב השולחן:</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl">
        
        {/* Card 3 Players */}
        <button
          type="button"
          onClick={() => setPlayerCount(3)}
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
          onClick={() => setPlayerCount(4)}
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

      {/* כפתורי ניווט */}
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
          onClick={onNext}
          className="bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black py-3 px-8 rounded-xl text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-200 tracking-wide hover:brightness-110 cursor-pointer"
        >
          המשך להגדרת המשתתפים והזמן
        </button>
      </div>
    </div>
  );
};
