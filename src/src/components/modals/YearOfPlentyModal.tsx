import React, { useEffect, useState } from 'react';
import { CrossIcon } from '../common/Icons';
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

interface YearOfPlentyModalProps {
  isOpen: boolean;
  onClose: () => void;
  humanPlayer: any;
  setPlayers: (val: any | ((prev: any[]) => any[])) => void;
  addLog: (msg: string) => void;
}

export const YearOfPlentyModal: React.FC<YearOfPlentyModalProps> = ({
  isOpen,
  onClose,
  humanPlayer,
  setPlayers,
  addLog,
}) => {
  const {
    players,
    roomId,
    myPlayerId,
    turnSubPhase,
    setTurnSubPhase,
    resourceBank,
    setResourceBank,
  } = useGame();
  const [selectedResources, setSelectedResources] = useState<ResourceCounts>({ ...EMPTY_SELECTION });

  useEffect(() => {
    if (isOpen) setSelectedResources({ ...EMPTY_SELECTION });
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedTotal = Object.values(selectedResources).reduce((sum, count) => sum + count, 0);
  const remainingSelections = Math.max(0, 2 - selectedTotal);

  const addResource = (resource: ResourceType) => {
    if (selectedTotal >= 2 || selectedResources[resource] >= (resourceBank[resource] || 0)) return;
    setSelectedResources(previous => ({ ...previous, [resource]: previous[resource] + 1 }));
  };

  const removeResource = (resource: ResourceType) => {
    setSelectedResources(previous => previous[resource] > 0
      ? { ...previous, [resource]: previous[resource] - 1 }
      : previous
    );
  };

  const handleExecuteYearOfPlenty = () => {
    if (selectedTotal !== 2) return;

    const chosenResources = RESOURCES.flatMap(resource =>
      Array.from({ length: selectedResources[resource.type] }, () => resource.type)
    );

    if (chosenResources.length !== 2 || RESOURCES.some(resource =>
      selectedResources[resource.type] > (resourceBank[resource.type] || 0)
    )) return;

    dispatchGameAction({
      type: 'PLAY_DEV_CARD',
      playerId: humanPlayer.id,
      cardType: 'YEAR_OF_PLENTY',
      data: { resources: [chosenResources[0], chosenResources[1]] },
    }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : humanPlayer.id,
      turnSubPhase,
      players,
      setPlayers,
      setTurnSubPhase,
      resourceBank,
      setResourceBank,
      addLog,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 text-right shadow-2xl" dir="rtl">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 flex items-center justify-center rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label="סגירה"
        >
          <CrossIcon size={16} />
        </button>

        <h3 className="mb-5 flex items-center gap-2 border-b border-slate-800 pb-3 text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">
          <img src="/wheat1.png" className="h-5 w-5" alt="חיטה" />
          <span>קלף שנת שפע — קבלת 2 משאבים</span>
        </h3>

        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-300">
            בחר שני משאבים מהבנק. אפשר לבחור שני קלפים זהים או שני משאבים שונים.
          </p>
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 shadow-lg">
            <span className="text-[9px] font-bold text-amber-300">נותרו</span>
            <span className="text-3xl font-black text-amber-400">{remainingSelections}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {RESOURCES.map(resource => {
            const selectedCount = selectedResources[resource.type];
            const ownedResources = humanPlayer.resources?.[resource.type] || 0;
            const bankStock = resourceBank[resource.type] || 0;
            const cannotAdd = selectedTotal >= 2 || selectedCount >= bankStock;

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
                      : 'border-slate-800/80 bg-slate-950/40 text-slate-400'
                  } ${cannotAdd ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 hover:bg-slate-950/70'}`}
                  aria-label={`הוסף ${resource.label}. יש לך ${ownedResources}, בבנק ${bankStock}, נבחרו ${selectedCount}`}
                >
                  <span className="absolute -top-2 -right-1 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[9px] font-black text-amber-400">
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
                    className="absolute -left-1 -top-1 z-10 flex h-7 min-w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-500 px-1 text-xs font-black text-slate-950 shadow-lg transition hover:border-red-400 hover:bg-red-600 hover:text-white"
                    title={`הסר ${resource.label}`}
                    aria-label={`הסר ${resource.label} מהבחירה`}
                  >
                    {selectedCount}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[10px] text-slate-500">
          לחיצה מוסיפה משאב; לחיצה כפולה על אותו משאב מוסיפה שניים ממנו. לחיצה ימנית או לחיצה על המונה מסירה אחד.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleExecuteYearOfPlenty}
            disabled={selectedTotal !== 2}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            אשר וקבל משאבים ({selectedTotal}/2)
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-6 py-3 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};
