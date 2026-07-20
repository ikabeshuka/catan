import React from 'react';
import { CrossIcon } from '../common/Icons';

interface TrophyPopupProps {
  type: 'longest_road' | 'largest_army';
  player: any;
  prevPlayer: any;
  onClose: () => void;
}

export const TrophyPopup: React.FC<TrophyPopupProps> = ({
  type,
  player,
  prevPlayer,
  onClose,
}) => {
  const isRoad = type === 'longest_road';
  const borderColor = isRoad ? 'border-emerald-500' : 'border-amber-500';
  const img = isRoad ? '/badge_longest_road.png' : '/badge_largest_army.png';
  const title = isRoad ? '🏆 הדרך הארוכה ביותר!' : '🏆 הצבא הגדול ביותר!';
  const btnBg = isRoad ? 'from-emerald-500 to-teal-500' : 'from-amber-500 to-orange-500';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className={`bg-slate-900 border-2 ${borderColor} rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center animate-fade-in`} dir="rtl">
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
        >
          <CrossIcon size={16} />
        </button>
        
        <img 
          src={img} 
          alt={isRoad ? "Longest Road" : "Largest Army"} 
          className="w-20 h-20 mx-auto mb-4 object-contain animate-bounce" 
          style={{ animationDuration: '3s' }} 
        />
        
        <h3 className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${isRoad ? 'from-emerald-400 to-teal-500' : 'from-amber-400 to-orange-500'} mb-2`}>
          {title}
        </h3>

        {prevPlayer ? (
          <p className="text-slate-200 text-sm leading-relaxed mb-6 font-medium">
            השחקן <span className="font-extrabold" style={{ color: player.color }}>{player.name}</span> לקח את תעודת {isRoad ? 'הדרך הארוכה ביותר' : 'הצבא הגדול ביותר'} מידי <span className="font-extrabold" style={{ color: prevPlayer.color }}>{prevPlayer.name}</span>!
          </p>
        ) : (
          <p className="text-slate-200 text-sm leading-relaxed mb-6 font-medium">
            השחקן <span className="font-extrabold" style={{ color: player.color }}>{player.name}</span> זכה בתעודת {isRoad ? 'הדרך הארוכה ביותר' : 'הצבא הגדול ביותר'} בפעם הראשונה במשחק!
          </p>
        )}

        <button
          onClick={onClose}
          className={`w-full bg-gradient-to-r ${btnBg} text-slate-950 font-black py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer`}
        >
          סגור (X)
        </button>
      </div>
    </div>
  );
};

interface TrophyDetailModalProps {
  isOpen: boolean;
  type: 'longest_road' | 'largest_army';
  longestRoadPlayerId: string | null;
  largestArmyPlayerId: string | null;
  players: any[];
  onClose: () => void;
}

export const TrophyDetailModal: React.FC<TrophyDetailModalProps> = ({
  isOpen,
  type,
  longestRoadPlayerId,
  largestArmyPlayerId,
  players,
  onClose,
}) => {
  if (!isOpen) return null;

  const isRoad = type === 'longest_road';
  const title = isRoad ? 'תואר: הדרך הארוכה ביותר (Longest Road)' : 'תואר: הצבא הגדול ביותר (Largest Army)';
  const img = isRoad ? '/badge_longest_road.png' : '/badge_largest_army.png';
  const holderId = isRoad ? longestRoadPlayerId : largestArmyPlayerId;
  const holder = players.find(p => p.id === holderId) || null;
  const reqs = isRoad 
    ? 'כדי לזכות בתואר אסטרטגי זה, עליך לבנות את רצף הכבישים הארוך ביותר של לפחות 5 כבישים רציפים ומחוברים. ברגע ששחקן אחר בונה רצף ארוך יותר משלך, התואר והנקודות עוברים אליו מיידית.' 
    : 'כדי לזכות בתואר הצבאי הזה, עליך להפעיל לפחות 3 קלפי אביר (Knight) מחפיסת הפיתוח שלך. ברגע ששחקן אחר מפעיל מספר גדול יותר של קלפי אביר ממך, התואר והנקודות עוברים אליו מיידית.';
  
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative text-center animate-fade-in" dir="rtl">
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1.5 rounded-xl hover:bg-slate-800 flex items-center justify-center border border-slate-800"
        >
          <CrossIcon size={16} />
        </button>
        
        <div className="w-24 h-24 mx-auto mb-5 relative">
          <div className="absolute inset-0 bg-amber-500/15 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
          <img src={img} alt={title} className="w-full h-full object-contain relative z-10 animate-bounce" style={{ animationDuration: '4s' }} />
        </div>
        
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-4">
          {title}
        </h3>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-5 text-right">
          <div className="flex items-center justify-between mb-3 border-b border-slate-850/60 pb-2">
            <span className="text-xs text-slate-400 font-bold">מחזיק התואר הנוכחי:</span>
            {holder ? (
              <span className="text-sm font-black" style={{ color: holder.color }}>
                👑 {holder.name} {holder.isBot ? '(מחשב)' : '(אתה)'}
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">אין מחזיק כרגע</span>
            )}
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-bold">בונוס נקודות ניצחון:</span>
            <span className="text-xs font-extrabold text-amber-400 font-mono">2 VP (נקודות ניצחון ציבוריות)</span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 mb-6 text-right leading-relaxed animate-none">
          <span className="block text-xs font-black text-slate-300 mb-1.5">כיצד זוכים בתואר?</span>
          <p className="text-xs text-slate-400 font-medium">{reqs}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer border border-amber-400"
        >
          סגור תעודה
        </button>
      </div>
    </div>
  );
};
