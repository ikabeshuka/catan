import React from 'react';
import { Player } from '../../types/player.types';

interface BotTimerIndicatorProps {
  activePlayer: Player | undefined;
  botTimeRemaining: number;
  isWaitingForPlayerAction: boolean;
}

export const BotTimerIndicator: React.FC<BotTimerIndicatorProps> = ({
  activePlayer,
  botTimeRemaining,
  isWaitingForPlayerAction,
}) => {
  if (!activePlayer || !activePlayer.isBot) {
    return null;
  }

  return (
    <div className="flex-none mx-4 mb-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-right flex items-center justify-between" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="text-xl animate-pulse">⏱️</span>
        <div>
          <div className="text-sm font-bold text-amber-400">תור הבוט {activePlayer.name} פעיל...</div>
          <div className="text-xs text-slate-400">זמן שנותר למהלך: {Math.max(0, Math.ceil(botTimeRemaining / 1000))} שניות</div>
        </div>
      </div>
      {isWaitingForPlayerAction && (
        <div className="text-emerald-400 font-extrabold text-xs px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full animate-pulse">
          ⏳ הטיימר מושהה - ממתין לפעולת השחקן האנושי (השלכת קלפים, בחירת זהב או מענה למסחר)
        </div>
      )}
    </div>
  );
};
