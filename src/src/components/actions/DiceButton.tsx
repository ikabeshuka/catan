import React from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useGame } from '../../context/GameContext';
import { DiceIcon } from '../common/Icons';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { rollDice } from '../../utils/gameEngine/rollDice';
import { isCitiesKnightsExpansion } from '../../config/gameRules';

export const DiceButton: React.FC = () => {
  const { currentPlayer, turnSubPhase, isCurrentPlayerBot, handleDiceRoll, isSetupPhase } = useTurnManager();
  const { isRolling, rollValues, lastRoll, roomId, myPlayerId, activeExpansion } = useGame();
  const isWrongOnlinePlayer = !!roomId && (!myPlayerId || currentPlayer?.id !== myPlayerId);

  const onRollClick = () => {
    if (isRolling || isDisabled || !currentPlayer) return;

    const alchemistDice = currentPlayer.alchemistDice;
    const alchemistEventDie = currentPlayer.alchemistEventDie;
    const diceResult = roomId ? null : (alchemistDice ? { dice1: alchemistDice[0], dice2: alchemistDice[1] } : rollDice());
    const cityDie = isCitiesKnightsExpansion(activeExpansion) ? (alchemistDice?.[2] || Math.floor(Math.random() * 6) + 1) : undefined;
    const eventDie = isCitiesKnightsExpansion(activeExpansion)
      ? (alchemistEventDie || (['BARBARIAN', 'BARBARIAN', 'BARBARIAN', 'SCIENCE', 'POLITICS', 'TRADE'] as const)[Math.floor(Math.random() * 6)])
      : undefined;
    dispatchGameAction({
      type: 'ROLL_DICE',
      playerId: currentPlayer.id,
      diceValues: diceResult ? (cityDie ? [diceResult.dice1, diceResult.dice2, cityDie] : [diceResult.dice1, diceResult.dice2]) : undefined,
      eventDie,
    }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : currentPlayer.id,
      handleDiceRoll,
    });
  };

  // הכפתור מושבת אם זה תור של בוט, או אם אנחנו בשלב ההקמה, או אם כבר הטלנו קוביות בתור הזה
  const isDisabled = isCurrentPlayerBot || isWrongOnlinePlayer || turnSubPhase !== 'BEFORE_ROLL' || isSetupPhase;

  let buttonContent = (
    <span className="flex items-center justify-center gap-2">
      <DiceIcon size={16} primaryColor="currentColor" secondaryColor="currentColor" />
      <span>הטל קוביות!</span>
    </span>
  );
  if (isSetupPhase) {
    buttonContent = <span>שלב ההקמה - מקם יישוב ודרך</span>;
  } else if (turnSubPhase !== 'BEFORE_ROLL') {
    buttonContent = <span>הקוביות כבר הוטלו</span>;
  }

  // Helper for drawing classic black dice dots on white background
  const renderDiceDots = (val: number) => {
    const dotsPositions: Record<number, string[]> = {
      1: ['bg-black w-3 h-3 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'],
      2: [
        'bg-black w-2 h-2 rounded-full absolute top-2.5 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute bottom-2.5 right-2.5'
      ],
      3: [
        'bg-black w-2 h-2 rounded-full absolute top-2.5 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-black w-2 h-2 rounded-full absolute bottom-2.5 right-2.5',
      ],
      4: [
        'bg-black w-2 h-2 rounded-full absolute top-2.5 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute top-2.5 right-2.5',
        'bg-black w-2 h-2 rounded-full absolute bottom-2.5 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute bottom-2.5 right-2.5',
      ],
      5: [
        'bg-black w-2 h-2 rounded-full absolute top-2.5 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute top-2.5 right-2.5',
        'bg-black w-2 h-2 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-black w-2 h-2 rounded-full absolute bottom-2.5 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute bottom-2.5 right-2.5',
      ],
      6: [
        'bg-black w-2 h-2 rounded-full absolute top-2.5 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute top-2.5 right-2.5',
        'bg-black w-2 h-2 rounded-full absolute top-1/2 -translate-y-1/2 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute top-1/2 -translate-y-1/2 right-2.5',
        'bg-black w-2 h-2 rounded-full absolute bottom-2.5 left-2.5',
        'bg-black w-2 h-2 rounded-full absolute bottom-2.5 right-2.5',
      ],
    };

    return (
      <div 
        className={`relative w-14 h-14 bg-white rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-slate-200 flex items-center justify-center transition-all duration-300
          ${isRolling ? 'animate-dice-roll' : 'hover:rotate-6'}`}
      >
        {dotsPositions[val]?.map((cls, i) => <div key={i} className={cls} />)}
      </div>
    );
  };

  return (
    <div className={`relative isolate shrink-0 overflow-hidden flex flex-col items-center gap-4 bg-slate-950/60 p-4 rounded-xl border transition-all duration-300 w-full shadow-lg backdrop-blur-md
      ${!isDisabled 
        ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-slate-900/40' 
        : 'border-slate-850 opacity-40'
      }`}
    >
      <style>{`
        @keyframes dice-roll {
          0% { transform: rotate(0deg) scale(1); filter: blur(0px); }
          50% { transform: rotate(180deg) scale(1.15); filter: blur(3px); }
          100% { transform: rotate(360deg) scale(1); filter: blur(0px); }
        }
        .animate-dice-roll {
          animation: dice-roll 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      <div className="flex justify-between items-center w-full">
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">שלב הטלת קוביות</span>
        {isSetupPhase && (
          <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
            סבב הקמה
          </span>
        )}
      </div>

      <button
        onClick={onRollClick}
        disabled={isDisabled || isRolling}
        className={`w-full py-3 px-4 rounded-xl font-extrabold text-sm tracking-wide shadow-lg transition-all duration-200 border border-transparent
          ${
            (isDisabled || isRolling)
              ? 'bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 active:scale-[0.97] shadow-amber-500/10 hover:shadow-amber-500/20 cursor-pointer animate-pulse'
          }`}
      >
        {isRolling ? (
          <span className="flex items-center justify-center gap-2 animate-spin">
            <DiceIcon size={16} primaryColor="currentColor" secondaryColor="currentColor" />
            <span>מטיל קוביות...</span>
          </span>
        ) : buttonContent}
      </button>

      {/* תצוגת הקוביות הוויזואלית במידה ויש תוצאה או בזמן הטלה */}
      {(lastRoll || isRolling) && !isSetupPhase && (
        <div className="flex items-center gap-4 mt-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50 w-full justify-center">
          <div className="flex gap-2">
            {renderDiceDots(rollValues.d1)}
            {renderDiceDots(rollValues.d2)}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">תוצאה</span>
            <span className="text-sm text-amber-400 font-black">
              {isRolling ? '...' : `סה"כ: ${rollValues.d1 + rollValues.d2}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
