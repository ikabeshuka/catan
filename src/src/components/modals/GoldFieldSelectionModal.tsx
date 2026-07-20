import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';

type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';

export const GoldFieldSelectionModal: React.FC = () => {
  const { turnSubPhase, goldSelectionQueue, resolveGoldSelection, players } = useGame();

  const [res1, setRes1] = useState<ResourceType>('WOOD');
  const [res2, setRes2] = useState<ResourceType>('WOOD');

  if (turnSubPhase !== 'GOLD_RESOURCE_SELECTION' || goldSelectionQueue.length === 0) return null;

  const currentSelection = goldSelectionQueue[0];
  const activePlayer = players.find(p => p.id === currentSelection.playerId);
  
  // Only display for human players
  if (!activePlayer || activePlayer.isBot) return null;

  const amount = currentSelection.amount;

  const handleConfirm = () => {
    const chosen: ResourceType[] = amount === 1 ? [res1] : [res1, res2];
    resolveGoldSelection(chosen);
  };

  const resourcesList = [
    { type: 'WOOD' as const, label: 'עץ', img: '/wood1.png', activeBg: 'bg-emerald-950/45 border-emerald-500' },
    { type: 'BRICK' as const, label: 'לבנה', img: '/brick1.png', activeBg: 'bg-orange-950/45 border-orange-500' },
    { type: 'SHEEP' as const, label: 'כבש', img: '/wool1.png', activeBg: 'bg-lime-950/45 border-lime-500' },
    { type: 'WHEAT' as const, label: 'חיטה', img: '/wheat1.png', activeBg: 'bg-amber-950/45 border-amber-500' },
    { type: 'ORE' as const, label: 'ברזל', img: '/rock1.png', activeBg: 'bg-slate-800/50 border-slate-500' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right" dir="rtl">
        <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
          <span className="text-2xl">🪙</span>
          <span>מכרה הזהב - בחירת משאבים</span>
        </h3>

        <p className="text-sm text-slate-300 mb-6">
          שלום <strong style={{ color: activePlayer.color }}>{activePlayer.name}</strong>! יישוב או עיר שלך הגובלים במכרה הזהב הניבו משאבים. נא לבחור{' '}
          <strong>{amount === 1 ? 'משאב אחד' : 'שני משאבים (זהים או שונים)'}</strong>:
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-3">
              {amount === 1 ? 'בחר משאב לקבלה:' : 'משאב ראשון:'}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {resourcesList.map((res) => {
                const isActive = res1 === res.type;
                return (
                  <button
                    key={`gold-res1-${res.type}`}
                    type="button"
                    onClick={() => setRes1(res.type)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer gap-1
                      ${isActive ? res.activeBg + ' ring-1 ring-amber-500/40 text-white' : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/70 text-slate-400'}`}
                  >
                    <img src={res.img} className="w-8 h-8 object-contain" alt={res.label} />
                    <span>{res.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {amount === 2 && (
            <div>
              <label className="block text-slate-400 text-xs font-bold mb-3">משאב שני:</label>
              <div className="grid grid-cols-5 gap-2">
                {resourcesList.map((res) => {
                  const isActive = res2 === res.type;
                  return (
                    <button
                      key={`gold-res2-${res.type}`}
                      type="button"
                      onClick={() => setRes2(res.type)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer gap-1
                        ${isActive ? res.activeBg + ' ring-1 ring-amber-500/40 text-white' : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/70 text-slate-400'}`}
                    >
                      <img src={res.img} className="w-8 h-8 object-contain" alt={res.label} />
                      <span>{res.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm"
          >
            אשר וקבל משאבים
          </button>
        </div>
      </div>
    </div>
  );
};
