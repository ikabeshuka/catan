import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { dispatchGameAction } from '../../services/gameDispatcher';

type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
type ResourceCounts = Record<ResourceType, number>;

const EMPTY_SELECTION: ResourceCounts = {
  WOOD: 0,
  BRICK: 0,
  SHEEP: 0,
  WHEAT: 0,
  ORE: 0,
};

const RESOURCES = [
  { type: 'WOOD' as const, label: 'עץ', img: '/wood1.png', activeBg: 'bg-emerald-950/45 border-emerald-500' },
  { type: 'BRICK' as const, label: 'לבנה', img: '/brick1.png', activeBg: 'bg-orange-950/45 border-orange-500' },
  { type: 'SHEEP' as const, label: 'כבש', img: '/wool1.png', activeBg: 'bg-lime-950/45 border-lime-500' },
  { type: 'WHEAT' as const, label: 'חיטה', img: '/wheat1.png', activeBg: 'bg-amber-950/45 border-amber-500' },
  { type: 'ORE' as const, label: 'ברזל', img: '/rock1.png', activeBg: 'bg-slate-800/50 border-slate-500' },
];

export const GoldFieldSelectionModal: React.FC = () => {
  const {
    turnSubPhase, goldSelectionQueue, players, roomId, myPlayerId,
    resourceBank, setResourceBank, setPlayers, setGoldSelectionQueue,
    setTurnSubPhase, addLog,
  } = useGame();

  const [selectedResources, setSelectedResources] = useState<ResourceCounts>({ ...EMPTY_SELECTION });
  const currentSelection = goldSelectionQueue[0];

  useEffect(() => {
    setSelectedResources({ ...EMPTY_SELECTION });
  }, [currentSelection?.playerId, currentSelection?.tileId]);

  if (turnSubPhase !== 'GOLD_RESOURCE_SELECTION' || !currentSelection) return null;

  const activePlayer = players.find(player => player.id === currentSelection.playerId);

  if (!activePlayer || activePlayer.isBot || (roomId && activePlayer.id !== myPlayerId)) return null;

  const amount = currentSelection.amount;
  const selectedTotal = Object.values(selectedResources).reduce((sum, count) => sum + count, 0);
  const remainingSelections = Math.max(0, amount - selectedTotal);

  const addResource = (resource: ResourceType) => {
    if (selectedTotal >= amount || selectedResources[resource] >= (resourceBank[resource] || 0)) return;
    setSelectedResources(previous => ({ ...previous, [resource]: previous[resource] + 1 }));
  };

  const removeResource = (resource: ResourceType) => {
    setSelectedResources(previous => {
      if (previous[resource] === 0) return previous;
      return { ...previous, [resource]: previous[resource] - 1 };
    });
  };

  const handleConfirm = () => {
    if (selectedTotal !== amount) return;

    const chosen = RESOURCES.flatMap(resource =>
      Array.from({ length: selectedResources[resource.type] }, () => resource.type)
    );

    if (RESOURCES.some(resource => selectedResources[resource.type] > (resourceBank[resource.type] || 0))) {
      alert('אין מספיק קלפים מהמשאב שנבחר בבנק.');
      return;
    }

    setSelectedResources({ ...EMPTY_SELECTION });
    chosen.forEach(resource => dispatchGameAction({
      type: 'SELECT_GOLD_RESOURCE',
      playerId: activePlayer.id,
      resource,
    }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : activePlayer.id,
      turnSubPhase,
      players,
      setPlayers,
      resourceBank,
      setResourceBank,
      goldSelectionQueue,
      setGoldSelectionQueue,
      setTurnSubPhase,
      addLog,
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-right" dir="rtl">
        <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-5 border-b border-slate-800 pb-3 flex items-center gap-2">
          <span className="text-2xl">🪙</span>
          <span>מכרה הזהב - בחירת משאבים</span>
        </h3>

        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-300">
            שלום <strong style={{ color: activePlayer.color }}>{activePlayer.name}</strong>! מגיעים לך{' '}
            <strong>{amount} משאבים</strong>. אפשר לבחור משאבים זהים או שונים.
          </p>
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 shadow-lg">
            <span className="text-[9px] font-bold text-amber-300">נותרו</span>
            <span className="text-3xl font-black text-amber-400">{remainingSelections}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {RESOURCES.map(resource => {
            const selectedCount = selectedResources[resource.type];
            const ownedResources = activePlayer.resources?.[resource.type] || 0;
            const bankStock = resourceBank[resource.type] || 0;
            const cannotAdd = selectedTotal >= amount || selectedCount >= bankStock;

            return (
              <div key={resource.type} className="relative pt-2">
                <button
                  type="button"
                  onClick={() => addResource(resource.type)}
                  onContextMenu={event => {
                    event.preventDefault();
                    removeResource(resource.type);
                  }}
                  aria-disabled={cannotAdd}
                  className={`relative flex min-h-[132px] w-full flex-col items-center justify-center gap-1 rounded-xl border p-3 text-[10px] font-black transition-all ${
                    selectedCount > 0
                      ? `${resource.activeBg} ring-1 ring-amber-500/40 text-white`
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                  } ${cannotAdd ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 hover:bg-slate-950/70'}`}
                  aria-label={`הוסף ${resource.label}. יש לך ${ownedResources}, בבנק ${bankStock}, נבחרו ${selectedCount}`}
                >
                  <span className="absolute -top-2 -right-1 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[9px] font-black text-amber-400 shadow-md">
                    יש לך: {ownedResources}
                  </span>
                  <img src={resource.img} className="h-12 w-12 object-contain" alt={resource.label} />
                  <span className="text-xs">{resource.label}</span>
                  <span className="mt-1 rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[9px] text-slate-300">
                    בבנק: {bankStock}
                  </span>
                </button>

                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => removeResource(resource.type)}
                    className="group/remove absolute -top-1 -left-1 z-10 flex h-7 min-w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-500 px-1 text-xs font-black text-slate-950 shadow-lg transition hover:border-red-400 hover:bg-red-600 hover:text-white"
                    title={`הסר ${resource.label} אחד`}
                    aria-label={`הסר ${resource.label} אחד מהבחירה`}
                  >
                    <span className="group-hover/remove:hidden">{selectedCount}</span>
                    <span className="hidden text-base leading-none group-hover/remove:inline">−1</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[10px] text-slate-500">
          לחיצה רגילה מוסיפה משאב; לחיצה ימנית על הסמל או לחיצה על מונה הבחירה מסירה אחד.
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
          <span className="shrink-0 text-xs font-black text-slate-300">מאזן הבנק:</span>
          <div className="grid flex-1 grid-cols-5 gap-2">
            {RESOURCES.map(resource => (
              <div key={`bank-balance-${resource.type}`} className="flex items-center justify-center gap-1 rounded-lg bg-slate-900/80 px-1.5 py-1">
                <img src={resource.img} className="h-5 w-5 object-contain" alt="" />
                <span className="text-[10px] font-bold text-slate-400">{resource.label}</span>
                <span className="text-xs font-black text-emerald-400">{resourceBank[resource.type] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={selectedTotal !== amount}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            אשר וקבל משאבים ({selectedTotal}/{amount})
          </button>
        </div>
      </div>
    </div>
  );
};
