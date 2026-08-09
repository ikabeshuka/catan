import React, { useState, useEffect } from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useGame } from '../../context/GameContext';
import { dispatchGameAction } from '../../services/gameDispatcher';

const RESOURCE_IMAGES = {
  WOOD: '/wood1.png',
  BRICK: '/brick1.png',
  SHEEP: '/wool1.png',
  WHEAT: '/wheat1.png',
  ORE: '/rock1.png',
};

export const GoldTradePanel: React.FC = () => {
  const { currentPlayer, turnSubPhase } = useTurnManager();
  const { goldCoins, setGoldCoins, setPlayers, addLog, roomId, myPlayerId, resourceBank, setResourceBank, mbScenarioId } = useGame();

  const [goldTradesThisTurn, setGoldTradesThisTurn] = useState(0);
  const [showResourceSelect, setShowResourceSelect] = useState(false);

  useEffect(() => {
    setGoldTradesThisTurn(0);
    setShowResourceSelect(false);
  }, [currentPlayer?.id]);

  if (!currentPlayer) return null;

  const isWrongOnlinePlayer = !!roomId && (!myPlayerId || currentPlayer.id !== myPlayerId);
  const isRiversOfCatan = mbScenarioId === 'RIVERS_OF_CATAN';

  const handleGoldTrade = (requestedResource: keyof typeof RESOURCE_IMAGES) => {
    dispatchGameAction({ type: 'GOLD_TRADE', playerId: currentPlayer.id, requestedResource }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : currentPlayer.id,
      turnSubPhase,
      players: [currentPlayer],
      setPlayers,
      goldCoins,
      setGoldCoins,
      resourceBank,
      setResourceBank,
      mbScenarioId,
      addLog,
    });
    setGoldTradesThisTurn(previous => previous + 1);
    setShowResourceSelect(false);
  };

  return (
    <div className="relative overflow-hidden bg-slate-900/90 p-3 rounded-2xl border border-amber-500/30 shadow-md flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xl">🪙</span>
          <span className="text-xs font-bold text-amber-400">יתרת מטבעות זהב:</span>
        </div>
        <span className="text-lg font-black font-mono text-amber-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
          {goldCoins[currentPlayer.id] || 0}
        </span>
      </div>

      {/* כפתור החלפה */}
      {!currentPlayer.isBot && !isWrongOnlinePlayer && turnSubPhase === 'TRADE_AND_BUILD' && (
        <div className="flex flex-col gap-2 mt-1">
          {!showResourceSelect ? (
            <button
              disabled={(goldCoins[currentPlayer.id] || 0) < 2 || (!isRiversOfCatan && goldTradesThisTurn >= 2)}
              onClick={() => setShowResourceSelect(true)}
              className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] transition-all duration-200 border cursor-pointer
                ${((goldCoins[currentPlayer.id] || 0) >= 2 && (isRiversOfCatan || goldTradesThisTurn < 2))
                  ? 'bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 border-amber-400 hover:brightness-110 active:scale-[0.98]'
                  : 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed'
                }`}
            >
              {!isRiversOfCatan && goldTradesThisTurn >= 2 
                ? 'השתמשת במכסת ההחלפות לתור זה (2/2)' 
                : (goldCoins[currentPlayer.id] || 0) < 2
                  ? 'החלפת 2 זהב במשאב (נדרש לפחות 2 זהב)'
                  : `החלפת 2 זהב במשאב (${goldTradesThisTurn}/2 החלפות)`
              }
            </button>
          ) : (
            <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 font-bold block text-center">בחר משאב לקבל תמורת 2 זהב:</span>
              <div className="grid grid-cols-5 gap-1">
                {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).map((res) => {
                  const labelsHE = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };
                  return (
                    <button
                      key={res}
                      onClick={() => {
                        handleGoldTrade(res);
                        return;
                        /* Direct state mutation replaced by dispatchGameAction.
                        // Deduct 2 gold and add 1 resource
                        setGoldCoins((prev: Record<string, number>) => ({
                          ...prev,
                          [currentPlayer.id]: (prev[currentPlayer.id] || 0) - 2
                        }));
                        setPlayers((prevPlayers: Player[]) => prevPlayers.map(p => {
                          if (p.id === currentPlayer.id) {
                            return {
                              ...p,
                              resources: {
                                ...p.resources,
                                [res]: (p.resources[res] || 0) + 1
                              }
                            };
                          }
                          return p;
                        }));
                        addLog(`🪙 ${currentPlayer.name} החליף/ה 2 זהב עבור 1 ${labelsHE[res]}.`);
                        setGoldTradesThisTurn(prev => prev + 1);
                        setShowResourceSelect(false);
                        */
                      }}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                    >
                      <img src={RESOURCE_IMAGES[res]} className="w-6 h-6 object-contain" alt={labelsHE[res]} />
                      <span className="text-[9px] font-bold text-slate-300">{labelsHE[res]}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowResourceSelect(false)}
                className="w-full py-1 text-[9px] font-bold text-rose-400 bg-slate-900 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
              >
                ביטול
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
