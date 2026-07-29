import React from 'react';
import { CrossIcon, MonopolyIcon } from '../common/Icons';
import { useGame } from '../../context/GameContext';
import { dispatchGameAction } from '../../services/gameDispatcher';

interface MonopolyModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: any[];
  humanPlayer: any;
  setPlayers: (val: any | ((prev: any[]) => any[])) => void;
  addLog: (msg: string) => void;
}

export const MonopolyModal: React.FC<MonopolyModalProps> = ({
  isOpen,
  onClose,
  players,
  humanPlayer,
  setPlayers,
  addLog,
}) => {
  const { roomId, myPlayerId, setTurnSubPhase } = useGame();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right" dir="rtl">
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
        >
          <CrossIcon size={16} />
        </button>
        
        <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
          <MonopolyIcon size={22} className="text-cyan-400 inline-block" />
          <span>קלף מונופול - בחירת משאב</span>
        </h3>

        <p className="text-sm text-slate-300 mb-6">
          בחר סוג משאב אחד. כל שאר הבוטים במשחק ייאלצו למסור לך את כל קלפי המשאב הזה שברשותם!
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { type: 'WOOD' as const, label: 'עץ', img: '/wood1.png', border: 'border-emerald-500/30', hover: 'hover:bg-emerald-950/30 hover:border-emerald-500' },
            { type: 'BRICK' as const, label: 'לבנה', img: '/brick1.png', border: 'border-orange-500/30', hover: 'hover:bg-orange-950/30 hover:border-orange-500' },
            { type: 'SHEEP' as const, label: 'כבש', img: '/wool1.png', border: 'border-lime-500/30', hover: 'hover:bg-lime-950/30 hover:border-lime-500' },
            { type: 'WHEAT' as const, label: 'חיטה', img: '/wheat1.png', border: 'border-amber-500/30', hover: 'hover:bg-amber-950/30 hover:border-amber-500' },
            { type: 'ORE' as const, label: 'ברזל', img: '/rock1.png', border: 'border-slate-500/30', hover: 'hover:bg-slate-800/30 hover:border-slate-500' },
          ].map((res) => (
            <button
              key={res.type}
              onClick={() => {
                dispatchGameAction({
                  type: 'PLAY_DEV_CARD',
                  playerId: humanPlayer.id,
                  cardType: 'MONOPOLY',
                  data: { resource: res.type },
                }, {
                  roomId: roomId || undefined,
                  isRemote: false,
                  myPlayerId: roomId ? myPlayerId : humanPlayer.id,
                  players,
                  setPlayers,
                  setTurnSubPhase,
                  addLog,
                });
                onClose();
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border bg-slate-950/40 text-slate-200 text-xs font-bold transition-all ${res.border} ${res.hover} active:scale-[0.95] cursor-pointer gap-1.5`}
            >
              <img src={res.img} className="w-10 h-10 object-contain" alt={res.label} />
              <span>{res.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
