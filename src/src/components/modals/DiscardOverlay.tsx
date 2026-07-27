import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { ResourceCards } from '../../types/resources.types';
import { dispatchGameAction } from '../../services/gameDispatcher';

const CARD_IMAGES: Record<string, string> = {
  WOOD: '/card_wood.png',
  BRICK: '/card_brick.png',
  SHEEP: '/card_sheep.png',
  WHEAT: '/card_wheat.png',
  ORE: '/card_ore.png',
};

const CARD_LABELS: Record<string, string> = {
  WOOD: 'עץ',
  BRICK: 'לבנה',
  SHEEP: 'כבש',
  WHEAT: 'חיטה',
  ORE: 'ברזל',
};

const CARD_COLORS: Record<string, string> = {
  WOOD: 'border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400',
  BRICK: 'border-orange-500/30 hover:border-orange-500/50 text-orange-400',
  SHEEP: 'border-lime-500/30 hover:border-lime-500/50 text-lime-400',
  WHEAT: 'border-amber-500/30 hover:border-amber-500/50 text-amber-400',
  ORE: 'border-slate-500/30 hover:border-slate-500/50 text-slate-400',
};

export const DiscardOverlay: React.FC = () => {
  const { players, setPlayers, setTurnSubPhase, addLog, turnSubPhase, roomId, myPlayerId } = useGame();

  const [discardCount, setDiscardCount] = useState<Record<string, number>>({
    WOOD: 0,
    BRICK: 0,
    SHEEP: 0,
    WHEAT: 0,
    ORE: 0,
  });

  useEffect(() => {
    if (turnSubPhase === 'DISCARD_PHASE') {
      setDiscardCount({
        WOOD: 0,
        BRICK: 0,
        SHEEP: 0,
        WHEAT: 0,
        ORE: 0,
      });
    }
  }, [turnSubPhase]);

  if (turnSubPhase !== 'DISCARD_PHASE') return null;

  const humanPlayer = (roomId && myPlayerId)
    ? players.find(p => p.id === myPlayerId)
    : players.find(p => !p.isBot);

  if (!humanPlayer) return null;

  const totalCards = Object.values(humanPlayer.resources).reduce((a, b) => a + b, 0);
  const toDiscard = Math.floor(totalCards / 2);

  if (toDiscard <= 0) return null;

  const chosenTotal = Object.values(discardCount).reduce((a, b) => a + b, 0);
  const remaining = toDiscard - chosenTotal;

  const handleIncrement = (type: string) => {
    const key = type as keyof ResourceCards;
    const currentSelected = discardCount[type] || 0;
    const available = humanPlayer.resources[key] || 0;

    if (currentSelected < available && chosenTotal < toDiscard) {
      setDiscardCount(prev => ({
        ...prev,
        [type]: currentSelected + 1,
      }));
    }
  };

  const handleDecrement = (type: string) => {
    const currentSelected = discardCount[type] || 0;

    if (currentSelected > 0) {
      setDiscardCount(prev => ({
        ...prev,
        [type]: currentSelected - 1,
      }));
    }
  };

  const handleConfirm = () => {
    if (chosenTotal !== toDiscard) return;

    dispatchGameAction({
      type: 'DISCARD_CARDS' as any,
      playerId: humanPlayer.id,
      resourcesToDiscard: discardCount
    } as any, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId,
      players,
      setPlayers,
      setTurnSubPhase,
      addLog
    });
  };

  const resourceKeys: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[] = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-white overflow-y-auto select-none">
      <div className="max-w-4xl w-full flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full filter blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full filter blur-[100px] pointer-events-none" />

        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-500 to-amber-400 mb-4 animate-pulse">
          השודד הגיע!
        </h1>
        <p className="text-lg md:text-xl text-slate-300 text-center mb-8 font-medium">
          עליך לבחור בדיוק <span className="text-rose-400 font-extrabold text-2xl mx-1">{toDiscard}</span> קלפים לזריקה (מחצית מתוך {totalCards} קלפים שבידך).
        </p>

        {/* Resources Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 w-full mb-10">
          {resourceKeys.map(key => {
            const available = humanPlayer.resources[key] || 0;
            const selected = discardCount[key] || 0;
            const label = CARD_LABELS[key];
            const bgImage = CARD_IMAGES[key];

            return (
              <div
                key={key}
                className={`relative flex flex-col items-center bg-slate-950/40 border rounded-2xl p-4 shadow-lg transition-all duration-300 ${CARD_COLORS[key]} ${
                  selected > 0 ? 'bg-slate-900/80 scale-105 border-amber-500/40 shadow-amber-500/5' : ''
                }`}
              >
                {/* Visual Representation of Card */}
                <div className="w-20 h-28 rounded-xl overflow-hidden border border-slate-800/80 mb-3 relative group">
                  {bgImage && (
                    <img
                      src={bgImage}
                      alt={label}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 pointer-events-none select-none"
                    />
                  )}
                  {/* Overlay available count */}
                  <div className="absolute top-2 right-2 flex items-center justify-center min-w-6 h-6 px-1 rounded-md bg-slate-950/90 border border-slate-700/50 text-slate-300 text-xs font-bold font-mono">
                    {available}
                  </div>
                </div>

                <span className="text-sm font-black mb-3">{label}</span>

                {/* Adjuster Buttons */}
                <div className="flex items-center justify-between w-full bg-slate-950/80 border border-slate-800 rounded-xl p-1 font-mono">
                  <button
                    onClick={() => handleDecrement(key)}
                    disabled={selected === 0}
                    className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-lg font-black transition-all flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-white px-2">
                    {selected}
                  </span>
                  <button
                    onClick={() => handleIncrement(key)}
                    disabled={selected >= available || chosenTotal >= toDiscard}
                    className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-lg font-black transition-all flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button and Status */}
        <div className="flex flex-col items-center w-full max-w-md">
          {remaining > 0 ? (
            <div className="text-amber-400 font-bold mb-4 text-center text-base flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              עליך לבחור עוד {remaining} קלפים לזריקה
            </div>
          ) : (
            <div className="text-emerald-400 font-bold mb-4 text-center text-base flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              הכמות שנבחרה מדויקת!
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={chosenTotal !== toDiscard}
            className="w-full py-4 px-8 rounded-2xl font-black text-lg transition-all duration-300 transform shadow-xl flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 shadow-rose-950/40 text-white"
          >
            אשר זריקה
          </button>
        </div>
      </div>
    </div>
  );
};
