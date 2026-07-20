import React, { useState } from 'react';
import { CrossIcon } from '../common/Icons';

type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';

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
  const [yopRes1, setYopRes1] = useState<ResourceType>('WOOD');
  const [yopRes2, setYopRes2] = useState<ResourceType>('BRICK');

  if (!isOpen) return null;

  const handleExecuteYearOfPlenty = () => {
    setPlayers((prevPlayers: any[]) => prevPlayers.map(p => {
      if (p.id === humanPlayer.id) {
        return {
          ...p,
          resources: {
            ...p.resources,
            [yopRes1]: (p.resources[yopRes1] || 0) + 1,
            [yopRes2]: (p.resources[yopRes2] || 0) + 1
          },
          developmentCards: {
            ...p.developmentCards,
            YEAR_OF_PLENTY: Math.max(0, (p.developmentCards.YEAR_OF_PLENTY || 0) - 1)
          }
        };
      }
      return p;
    }));

    const resourceLabels: Record<string, string> = {
      WOOD: 'עץ',
      BRICK: 'לבנה',
      SHEEP: 'כבש',
      WHEAT: 'חיטה',
      ORE: 'ברזל'
    };

    addLog(`[קלף פיתוח] ${humanPlayer.name} הפעיל קלף שנת שפע וקיבל 1 ${resourceLabels[yopRes1]} ו-1 ${resourceLabels[yopRes2]} מהקופה!`);
    onClose();
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
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
        >
          <CrossIcon size={16} />
        </button>
        
        <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
          <img src="/wheat1.png" className="h-5 w-5 inline-block align-middle ml-1" alt="חיטה" />
          <span>קלף שנת שפע - קבלת 2 משאבים</span>
        </h3>

        <p className="text-sm text-slate-300 mb-6">
          בחר שני משאבים לקבלתם באופן מיידי מהבנק:
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-slate-400 text-xs font-bold mb-3">משאב ראשון:</label>
            <div className="grid grid-cols-5 gap-2">
              {resourcesList.map((res) => {
                const isActive = yopRes1 === res.type;
                return (
                  <button
                    key={`res1-${res.type}`}
                    type="button"
                    onClick={() => setYopRes1(res.type)}
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

          <div>
            <label className="block text-slate-400 text-xs font-bold mb-3">משאב שני:</label>
            <div className="grid grid-cols-5 gap-2">
              {resourcesList.map((res) => {
                const isActive = yopRes2 === res.type;
                return (
                  <button
                    key={`res2-${res.type}`}
                    type="button"
                    onClick={() => setYopRes2(res.type)}
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
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleExecuteYearOfPlenty}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm"
          >
            אשר וקבל משאבים
          </button>
          <button
            onClick={onClose}
            className="px-6 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-700 hover:text-white transition-all text-sm"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};
