import React from 'react';
import { useGame } from '../../context/GameContext';
import { CardIcon } from '../common/Icons';

interface DevelopmentCardsPanelProps {
  handlePlayCard: (cardType: 'KNIGHT' | 'MONOPOLY' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY') => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const DevelopmentCardsPanel: React.FC<DevelopmentCardsPanelProps> = ({ handlePlayCard, isCollapsed, onToggle }) => {
  const { players, currentPlayerIndex, turnSubPhase } = useGame();
  const humanPlayer = players.find(p => !p.isBot) || players[0];
  const activePlayer = players[currentPlayerIndex];

  const devCards = humanPlayer?.developmentCards || { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 };
  const totalCards = Object.values(devCards).reduce((a, b) => (a || 0) + (b || 0), 0);
  const isOurTurn = activePlayer?.id === humanPlayer?.id && turnSubPhase === 'TRADE_AND_BUILD';

  const handlePanelClick = () => {
    if (isCollapsed) {
      onToggle();
    }
  };

  return (
    <div 
      onClick={handlePanelClick}
      className={`bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl transition-all duration-300 ${
        isCollapsed 
          ? 'h-auto cursor-pointer hover:bg-slate-800/80 hover:border-slate-700/80' 
          : 'h-full flex flex-col justify-between overflow-hidden'
      }`}
    >
      <div className="flex flex-col w-full h-full">
        {/* Collapsible Header */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // עצירת הפעפוע בכל מצב
            onToggle();
          }}
          className={`flex items-center justify-between pb-2 cursor-pointer group w-full ${isCollapsed ? '' : 'border-b border-slate-800/60 mb-3'}`}
        >
          <div className="flex items-center gap-2">
            <CardIcon size={18} className="text-purple-400" />
            <span className="text-slate-300 text-xs font-bold uppercase tracking-wider group-hover:text-white transition-colors">
              קלפי הפיתוח שלי ({totalCards})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isOurTurn && (
              <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 rounded text-[10px] font-extrabold animate-pulse">
                התור שלך
              </span>
            )}
            <span className="text-slate-400 group-hover:text-white transition-transform duration-300 transform">
              {isCollapsed ? <span className="rotate-90">▶</span> : <span className="rotate-180">▼</span>}
            </span>
          </div>
        </button>

        {/* Collapsible Cards List */}
        <div className={`space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent ${isCollapsed ? "max-h-0 opacity-0" : "max-h-[300px] opacity-100"} transition-all duration-300 ease-in-out`}>
          {/* Knight */}
          <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 hover:border-slate-800 transition-all gap-2">
            <div className="flex items-center gap-3">
              <div className="w-[80px] h-[112px] flex-none">
                <img src="/knite.png" alt="Knight" className="w-full h-full object-cover rounded-md" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-100">אביר (Knight)</div>
                <div className="text-[10px] text-slate-400">מעביר את השודד לאריח אחר</div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-sans">
              <span className="text-xs font-black text-amber-400 font-mono bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
                {devCards.KNIGHT || 0}
              </span>
              <button
                disabled={!isOurTurn || !devCards.KNIGHT}
                onClick={() => handlePlayCard('KNIGHT')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  isOurTurn && devCards.KNIGHT
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md active:scale-[0.96] border border-amber-300'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50'
                }`}
              >
                הפעל
              </button>
            </div>
          </div>

          {/* Monopoly */}
          <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 hover:border-slate-800 transition-all gap-2">
            <div className="flex items-center gap-3">
              <div className="w-[80px] h-[112px] flex-none">
                <img src="/monopoly.png" alt="Monopoly" className="w-full h-full object-cover rounded-md" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-100">מונופול (Monopoly)</div>
                <div className="text-[10px] text-slate-400">לוקח את כל הקלפים ממשאב נבחר</div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-sans">
              <span className="text-xs font-black text-amber-400 font-mono bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
                {devCards.MONOPOLY || 0}
              </span>
              <button
                disabled={!isOurTurn || !devCards.MONOPOLY}
                onClick={() => handlePlayCard('MONOPOLY')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  isOurTurn && devCards.MONOPOLY
                    ? 'bg-amber-600 text-slate-950 hover:bg-amber-500 shadow-md active:scale-[0.96] border border-amber-400'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50'
                }`}
              >
                הפעל
              </button>
            </div>
          </div>

          {/* Road Building */}
          <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 hover:border-slate-800 transition-all gap-2">
            <div className="flex items-center gap-3">
              <div className="w-[80px] h-[112px] flex-none">
                <img src="/2_ways.png" alt="Road Building" className="w-full h-full object-cover rounded-md" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-100">בניית כבישים</div>
                <div className="text-[10px] text-slate-400">בונה 2 כבישים חינם באופן מיידי</div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-sans">
              <span className="text-xs font-black text-amber-400 font-mono bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
                {devCards.ROAD_BUILDING || 0}
              </span>
              <button
                disabled={!isOurTurn || !devCards.ROAD_BUILDING}
                onClick={() => handlePlayCard('ROAD_BUILDING')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  isOurTurn && devCards.ROAD_BUILDING
                    ? 'bg-amber-600 text-slate-950 hover:bg-amber-400 shadow-md active:scale-[0.96] border border-amber-400'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50'
                }`}
              >
                הפעל
              </button>
            </div>
          </div>

          {/* Year of Plenty */}
          <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 hover:border-slate-800 transition-all gap-2">
            <div className="flex items-center gap-3">
              <div className="w-[80px] h-[112px] flex-none">
                <img src="/year_of_plenty.png" alt="Year of Plenty" className="w-full h-full object-cover rounded-md" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-100">שנת שפע</div>
                <div className="text-[10px] text-slate-400">מקבל 2 משאבים חופשיים מהבנק</div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-sans">
              <span className="text-xs font-black text-amber-400 font-mono bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
                {devCards.YEAR_OF_PLENTY || 0}
              </span>
              <button
                disabled={!isOurTurn || !devCards.YEAR_OF_PLENTY}
                onClick={() => handlePlayCard('YEAR_OF_PLENTY')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  isOurTurn && devCards.YEAR_OF_PLENTY
                    ? 'bg-amber-600 text-slate-950 hover:bg-amber-500 shadow-md active:scale-[0.96] border border-amber-400'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50'
                }`}
              >
                הפעל
              </button>
            </div>
          </div>

          {/* Victory Point */}
          <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 hover:border-slate-800 transition-all gap-2">
            <div className="flex items-center gap-3">
              <div className="w-[80px] h-[112px] flex-none">
                <img src="/win1.png" alt="Victory Point" className="w-full h-full object-cover rounded-md" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-100">נקודת ניצחון</div>
                <div className="text-[10px] text-slate-400">מעניק 1 נקודת ניצחון אוטומטית</div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-sans">
              <span className="text-xs font-black text-amber-400 font-mono bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
                {devCards.VICTORY_POINT || 0}
              </span>
              <button
                disabled={true}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black transition-all bg-slate-900/60 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-50"
              >
                פסיבי
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
