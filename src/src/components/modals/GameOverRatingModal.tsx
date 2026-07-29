import React from 'react';
import { RatingCalculationResult } from '../../types/rating.types';

interface GameOverRatingModalProps {
  result: RatingCalculationResult;
  onClose: () => void;
}

export const GameOverRatingModal: React.FC<GameOverRatingModalProps> = ({ result, onClose }) => {
  const isPositive = result.finalPointsChanged >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white text-center animate-in fade-in zoom-in duration-300">
        <div className="text-5xl mb-3">
          {isPositive ? '🏆' : '📉'}
        </div>
        
        <h3 className="text-2xl font-bold mb-1 text-amber-400">
          {isPositive ? 'סיכום דירוג - ניצחון!' : 'סיכום דירוג - הפסד'}
        </h3>

        <div className="my-6 p-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="text-sm text-slate-400 mb-1">שינוי בדירוג</div>
          <div className={`text-4xl font-extrabold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? `+${result.finalPointsChanged}` : `${result.finalPointsChanged}`} נקודות
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/50 text-xs">
            <div>
              <span className="text-slate-400 block">ערך החדר הבסיסי:</span>
              <span className="font-semibold text-amber-200">{result.baseRoomScore}</span>
            </div>
            <div>
              <span className="text-slate-400 block">מקדם שחיקה:</span>
              <span className="font-semibold text-amber-200">{Math.round(result.diminishingMultiplier * 100)}%</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-700/40 mb-6">
          {result.reason}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition duration-200"
        >
          אישור והמשך
        </button>
      </div>
    </div>
  );
};