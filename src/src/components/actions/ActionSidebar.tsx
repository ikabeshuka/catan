import React from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useGame, getPlayerTotalVP } from '../../context/GameContext';
import { RollDiceContainer } from './RollDiceContainer';
import { GoldTradePanel } from './GoldTradePanel';
import { WagonUpgradePanel } from './WagonUpgradePanel';
import { BuildActionsPanel } from './BuildActionsPanel';
import { SettlementIcon, RoadIcon } from '../common/Icons';

export const ActionSidebar: React.FC = () => {
  const {
    currentPlayer,
    turnSubPhase,
    isCurrentPlayerBot,
    endTurn,
    isSetupPhase,
    setupState,
  } = useTurnManager();

  const { 
    activeExpansion, 
    longestRoadPlayerId, 
    largestArmyPlayerId,
    vertices,
    tiles,
  } = useGame();

  if (!currentPlayer) return null;

  const showEndTurnButton =
    turnSubPhase === 'TRADE_AND_BUILD' ||
    (isSetupPhase && setupState.hasPlacedSettlement && setupState.hasPlacedRoad);

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

  const activePlayerVP = getPlayerTotalVP(currentPlayer, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles);

  return (
    <div className="h-full flex flex-col gap-2.5 bg-slate-950 p-1 text-white text-right" dir="rtl">
      
      {/* א. שם השחקן הנוכחי וב. תצוגת נקודות הניצחון */}
      <div 
        className="relative overflow-hidden bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col gap-3" 
      >
        <div className="flex items-center gap-2">
          {/* עיגול צבע מזהה שחקן נוכחי */}
          <span 
            className="w-3 h-3 rounded-full inline-block shadow border border-white/20" 
            style={{ backgroundColor: currentPlayer.color }} 
          />
          <h2 className="font-serif text-sm font-extrabold text-slate-100 tracking-wide">
            התור של {currentPlayer.name} {isCurrentPlayerBot && '(מחשב)'}
          </h2>
        </div>

        {/* תצוגת נקודות הניצחון (Victory Points) מיד מתחת לשמו */}
        <div className="flex items-center justify-between bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/40">
          <span className="text-[11px] text-slate-400 font-bold">נקודות ניצחון (Victory Points)</span>
          <span className="text-sm font-black text-amber-400 font-mono">🏆 {activePlayerVP}</span>
        </div>

        <p className="font-sans text-[11px] text-slate-400 font-medium leading-relaxed border-t border-slate-800/50 pt-2">
          {getGuideText()}
        </p>
      </div>

      {/* אזור פעולת הקוביות */}
      <RollDiceContainer />

      {/* כפתור סיום תור */}
      <div className="w-full">
        <button
          onClick={endTurn}
          disabled={!showEndTurnButton || isCurrentPlayerBot}
          className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs tracking-wide shadow-lg transition-all duration-300 border
            ${(showEndTurnButton && !isCurrentPlayerBot)
              ? 'bg-emerald-700 text-white hover:bg-emerald-600 border-emerald-600 shadow-emerald-700/20 cursor-pointer animate-gentle-pulse'
              : 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed opacity-50'
            }`}
        >
          {isCurrentPlayerBot ? 'הבוט חושב...' : 'סיום תור ➔'}
        </button>
      </div>

      {/* פאנל זהב מיוחד עבור הרחבת סוחרים וברברים */}
      {activeExpansion === 'MERCHANTS_AND_BARBARIANS' && (
        <GoldTradePanel />
      )}

      {/* פאנל עגלת המסחר */}
      {activeExpansion === 'MERCHANTS_AND_BARBARIANS' && (
        <WagonUpgradePanel />
      )}

      {/* פאנל "הצעות לבנייה" וסטטוס בנייה גרפי עשיר */}
      <BuildActionsPanel />

    </div>
  );
};
