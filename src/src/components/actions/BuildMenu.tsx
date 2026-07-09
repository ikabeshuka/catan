import React, { useState } from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { ResourceType } from '../../types/resources.types';
import { WoodIcon, SheepIcon, WheatIcon, CardIcon } from '../common/Icons';

export const BuildMenu: React.FC = () => {
  const { turnSubPhase, isCurrentPlayerBot, tradeWithBank, buyDevelopmentCard } = useTurnManager();
  const [giveRes, setGiveRes] = useState<ResourceType>('WOOD');
  const [receiveRes, setReceiveRes] = useState<ResourceType>('BRICK');

  const isActionsDisabled = isCurrentPlayerBot || turnSubPhase !== 'TRADE_AND_BUILD';

  const handleTrade = () => {
    if (giveRes === receiveRes) return;
    tradeWithBank(giveRes, receiveRes);
  };

  return (
    <div className={`bg-slate-950/80 border p-5 rounded-2xl flex flex-col gap-4 text-sm backdrop-blur-md transition-all duration-300 text-right
      ${!isActionsDisabled 
        ? 'border-emerald-500/45 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900/50' 
        : 'border-slate-800 opacity-40 pointer-events-none select-none'
      }`}
      dir="rtl"
    >
      <span className="font-extrabold text-amber-500 text-[11px] uppercase tracking-wider block border-b border-slate-800 pb-2 mb-1">פעולות נוספות</span>
      
      {/* רכישת קלף פיתוח */}
      <div className="flex flex-col gap-2">
        <button
          onClick={buyDevelopmentCard}
          disabled={isActionsDisabled}
          className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider transition-all duration-300 border border-transparent flex items-center justify-center gap-2
            ${isActionsDisabled 
              ? 'bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-50' 
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 active:scale-[0.97] shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 cursor-pointer'
            }`}
        >
          <CardIcon size={16} primaryColor="currentColor" secondaryColor="currentColor" />
          <span>רכוש קלף פיתוח</span>
        </button>
        
        {/* עלות רכישה וקטורית */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 bg-slate-950/50 py-1.5 px-3 rounded-lg border border-slate-850">
          <span className="font-bold">עלות:</span>
          <div className="flex items-center gap-1.5">
            <WoodIcon size={13} className="text-emerald-500" />
            <span>עץ x1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <SheepIcon size={13} className="text-lime-500" />
            <span>כבש x1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WheatIcon size={13} className="text-amber-500" />
            <span>חיטה x1</span>
          </div>
        </div>
      </div>

      {/* מסחר בנקאי פשוט */}
      <div className="mt-2 border-t border-slate-800/80 pt-4">
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2.5">מסחר מול הבנק (4 : 1)</span>
        
        <div className="flex gap-2 items-center justify-between bg-slate-950/90 p-2.5 rounded-xl border border-slate-900">
          {/* סלקט נתינה */}
          <select 
            value={giveRes} 
            disabled={isActionsDisabled}
            onChange={(e) => setGiveRes(e.target.value as ResourceType)}
            className="bg-slate-900 text-slate-100 p-2 rounded-lg border border-slate-800 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 cursor-pointer font-bold"
          >
            <option value="WOOD">עץ</option>
            <option value="BRICK">לבנה</option>
            <option value="SHEEP">כבש</option>
            <option value="WHEAT">חיטה</option>
            <option value="ORE">ברזל</option>
          </select>
          
          <span className="text-slate-500 text-xs font-black">←</span>
          
          {/* סלקט קבלה */}
          <select 
            value={receiveRes} 
            disabled={isActionsDisabled}
            onChange={(e) => setReceiveRes(e.target.value as ResourceType)}
            className="bg-slate-900 text-slate-100 p-2 rounded-lg border border-slate-800 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-50 cursor-pointer font-bold"
          >
            <option value="BRICK">לבנה</option>
            <option value="WOOD">עץ</option>
            <option value="SHEEP">כבש</option>
            <option value="WHEAT">חיטה</option>
            <option value="ORE">ברזל</option>
          </select>
        </div>
        
        <button
          onClick={handleTrade}
          disabled={isActionsDisabled || giveRes === receiveRes}
          className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider transition-all duration-300 border border-transparent mt-3.5
            ${(isActionsDisabled || giveRes === receiveRes)
              ? 'bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-50'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.97] shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 cursor-pointer'
            }`}
        >
          בצע חילוף בנקאי
        </button>
      </div>
    </div>
  );
};
