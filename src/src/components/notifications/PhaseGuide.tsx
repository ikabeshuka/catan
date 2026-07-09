import React from 'react';
import { useGame } from '../../context/GameContext';
import { useTurnManager } from '../../hooks/useTurnManager';
import { SettlementIcon, RoadIcon, RobberIcon } from '../common/Icons';

export const PhaseGuide: React.FC = () => {
  const { gamePhase, turnSubPhase, players, currentPlayerIndex } = useGame();
  const { isSetupPhase, setupState } = useTurnManager();

  if (gamePhase === 'LOBBY' || gamePhase === 'GAME_OVER') {
    return null;
  }

  const activePlayer = players[currentPlayerIndex];
  if (!activePlayer) return null;

  let guideText: React.ReactNode = '';
  let subText: React.ReactNode = '';
  let badgeColor = 'bg-amber-500/15 border-amber-500/30 text-amber-400';

  if (isSetupPhase) {
    guideText = 'שלב ההקמה: מקם יישוב אחד וכביש אחד המחובר אליו, ולאחר מכן לחץ סיום תור';
    const hasSettlement = setupState.hasPlacedSettlement;
    const hasRoad = setupState.hasPlacedRoad;

    subText = (
      <span className="flex items-center gap-1.5 flex-wrap">
        <span>נשאר להניח:</span>
        {!hasSettlement && (
          <span className="inline-flex items-center gap-1 bg-slate-950/60 border border-slate-800 px-1.5 py-0.5 rounded text-amber-400">
            <SettlementIcon size={12} /> יישוב
          </span>
        )}
        {!hasSettlement && !hasRoad && <span>ו-</span>}
        {!hasRoad && (
          <span className="inline-flex items-center gap-1 bg-slate-950/60 border border-slate-800 px-1.5 py-0.5 rounded text-emerald-400">
            <RoadIcon size={12} /> כביש
          </span>
        )}
        {hasSettlement && hasRoad && <span className="text-emerald-400 font-bold">כל הכבוד! לחץ על "סיום תור ➔"</span>}
      </span>
    );
    badgeColor = 'bg-amber-500/15 border-amber-500/30 text-amber-400';
  } else if (gamePhase === 'MAIN_GAME') {
    if (turnSubPhase === 'BEFORE_ROLL') {
      guideText = 'שלב ההטלה: תורך להטיל קוביות!';
      subText = 'לחץ על כפתור הקוביות בסרגל הצידי כדי לייצר משאבים.';
      badgeColor = 'bg-amber-500/15 border-amber-500/30 text-amber-400';
    } else if (turnSubPhase === 'ROBBER_PLACEMENT') {
      guideText = (
        <span className="flex items-center gap-2">
          <RobberIcon size={16} className="text-rose-400" />
          <span>מיקום השודד</span>
        </span>
      );
      subText = 'בחר אריח חדש להנחת השודד וגנוב משאב מאחד השחקנים הגובלים.';
      badgeColor = 'bg-rose-500/15 border-rose-500/30 text-rose-400';
    } else if (turnSubPhase === 'TRADE_AND_BUILD') {
      guideText = 'שלב המסחר והבנייה';
      subText = 'בנה כבישים ויישובים על ידי לחיצה על הלוח, או בצע מסחר 4:1 עם הבנק דרך הסרגל.';
      badgeColor = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-2 animate-fade-in z-20">
      <div className="bg-slate-900/85 backdrop-blur-md border border-slate-850/80 rounded-xl p-4 shadow-xl flex items-center gap-4 text-right transition-all duration-300">
        
        {/* סמל השלב */}
        <div className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border ${badgeColor}`}>
          {isSetupPhase ? 'הקמה' : 'משחק פעיל'}
        </div>

        {/* טקסט הסבר */}
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-100 tracking-wide mb-1 flex items-center gap-1.5 justify-start">{guideText}</h4>
          <div className="text-xs text-slate-400 font-medium leading-relaxed">{subText}</div>
        </div>

        {/* שחקן נוכחי בתור חיווי קטן */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/55 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
          <div 
            className="w-2.5 h-2.5 rounded-full animate-pulse" 
            style={{ backgroundColor: activePlayer.color }}
          />
          <span className="text-[11px] text-slate-300 font-bold">תור: {activePlayer.name}</span>
        </div>

      </div>
    </div>
  );
};
