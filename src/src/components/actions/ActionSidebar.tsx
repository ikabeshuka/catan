import React from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useGame } from '../../context/GameContext';
import { DiceButton } from './DiceButton';
import { BuildMenu } from './BuildMenu';
import { SettlementIcon, RoadIcon } from '../common/Icons';

export const ActionSidebar: React.FC = () => {
  const { currentPlayer, turnSubPhase, isCurrentPlayerBot, endTurn, isSetupPhase, setupState } = useTurnManager();
  const { is3DMode, setIs3DMode } = useGame();

  if (!currentPlayer) return null;

  const showEndTurnButton = turnSubPhase === 'TRADE_AND_BUILD' || 
    (isSetupPhase && setupState.hasPlacedSettlement && setupState.hasPlacedRoad);

  // פונקציה לקבלת הנחיית התור הדינמית בהתאם לשלב ולסוג השחקן
  const getGuideText = (): React.ReactNode => {
    if (isCurrentPlayerBot) {
      return <span>שחקן המחשב מקבל החלטות ומבצע מהלכים...</span>;
    }
    if (isSetupPhase) {
      const hasSettlement = setupState?.hasPlacedSettlement;
      const hasRoad = setupState?.hasPlacedRoad;
      
      if (!hasSettlement || !hasRoad) {
        return (
          <span className="flex flex-col gap-1.5 items-start mt-1">
            <span>שלב ההקמה: נא למקם על גבי הלוח:</span>
            <span className="flex gap-2 items-center text-[10px] text-slate-300">
              {!hasSettlement && (
                <span className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  <SettlementIcon size={12} className="text-amber-500" /> יישוב
                </span>
              )}
              {!hasRoad && (
                <span className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  <RoadIcon size={12} className="text-emerald-500" /> כביש
                </span>
              )}
            </span>
          </span>
        );
      }
      return <span>כל הכבוד! נא ללחוץ על "סיום תור" כדי להמשיך</span>;
    }
    switch (turnSubPhase) {
      case 'BEFORE_ROLL':
        return <span>נא לזרוק קוביות</span>;
      case 'TRADE_AND_BUILD':
        return <span>שלב נוכחי: מסחר ובנייה</span>;
      case 'ROBBER_PLACEMENT':
        return <span>שלב השודד: נא להציב את השודד באריח אחר על הלוח</span>;
      default:
        return <span>נא לבצע את הפעולה הבאה</span>;
    }
  };

  return (
    <div className="h-full flex flex-col justify-between gap-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 shadow-2xl text-white">
      
      {/* Upper section: Header, Mode Toggle, Player Details */}
      <div className="flex flex-col gap-4">
        {/* כפתור מצב תלת-ממד */}
        <button
          onClick={() => setIs3DMode(!is3DMode)}
          className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs tracking-wide transition-all duration-300 border flex items-center justify-between shadow-md cursor-pointer
            ${is3DMode 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 text-slate-950 hover:from-amber-400 hover:to-orange-400 font-black shadow-amber-500/10' 
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/80'
            }`}
        >
          <span>מצב תלת-ממד</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-widest ${is3DMode ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
            {is3DMode ? 'פעיל' : 'כבוי'}
          </span>
        </button>

        {/* מדריך אינטראקטיבי לתור עם אינדיקטור צבע שחקן */}
        <div 
          className="relative overflow-hidden bg-slate-950/75 p-4 rounded-xl border border-slate-800/80 text-right transition-all duration-300 flex flex-col gap-3" 
          style={{ 
            borderTop: `4px solid ${currentPlayer.color}`, 
            boxShadow: `0 4px 20px -2px rgba(0,0,0,0.5), 0 -2px 12px -1px ${currentPlayer.color}40, inset 0 1px 0 0 rgba(255,255,255,0.05)` 
          }}
          dir="rtl"
        >
          <div>
            {/* כותרת בגופן סריף בולט */}
            <h2 className="font-serif text-lg font-extrabold text-slate-100 tracking-wide mb-1">
              התור של {currentPlayer.name} {isCurrentPlayerBot && '(מחשב)'}
            </h2>
            
            {/* טקסט הנחיה דינמי קצר בגופן סנס-סריף נקי */}
            <p className="font-sans text-xs text-slate-400 font-medium leading-relaxed">
              {getGuideText()}
            </p>
          </div>

          <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800/60 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] text-slate-400 font-bold">נקודות ניצחון:</span>
            <span className="text-xs text-amber-400 font-black font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              {currentPlayer.victoryPoints} מתוך 10
            </span>
          </div>
        </div>

        {/* אזור פעולת הקוביות */}
        <DiceButton />

        {/* כפתור סיום תור רחב ובולט ישירות מתחת לקוביות */}
        <div className="w-full">
          <style>{`
            @keyframes gentle-pulse {
              0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
              50% { transform: scale(1.02); opacity: 0.95; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.45); }
            }
            .animate-gentle-pulse {
              animation: gentle-pulse 2s infinite ease-in-out;
            }
          `}</style>
          <button
            onClick={endTurn}
            disabled={!showEndTurnButton || isCurrentPlayerBot}
            className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm tracking-wide shadow-lg transition-all duration-300 border
              ${(showEndTurnButton && !isCurrentPlayerBot)
                ? 'bg-emerald-700 text-white hover:bg-emerald-600 border-emerald-600 shadow-emerald-700/20 cursor-pointer animate-gentle-pulse'
                : 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed opacity-50'
              }`}
          >
            {isCurrentPlayerBot ? 'הבוט חושב...' : 'סיום תור ➔'}
          </button>
        </div>

        {/* תפריט פעולות מורחב בשלב הבנייה והמסחר - מוצג תמיד כדי לשקף מצב פעיל/חצי שקוף */}
        <BuildMenu />
      </div>
    </div>
  );
};
