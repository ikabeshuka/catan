import React from 'react';
import { useUser } from '../../context/UserContext';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ isOpen, onClose }) => {
  const { playerStats } = useUser();

  if (!isOpen) return null;

  const winRate = playerStats.totalGames > 0
    ? Math.round((playerStats.totalWins / playerStats.totalGames) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-2xl w-full shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        
        {/* כותרת */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            📊 סטטיסטיקות שחקן ומטריצת ניקוד
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg px-2"
          >
            ✕
          </button>
        </div>

        {/* כרטיסיות נתונים אישיים */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
            <span className="text-xs text-slate-400 block">ניקוד דירוג</span>
            <span className="text-2xl font-bold text-amber-300">{playerStats.ratingPoints}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
            <span className="text-xs text-slate-400 block">סה"כ משחקים</span>
            <span className="text-2xl font-bold text-slate-200">{playerStats.totalGames}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
            <span className="text-xs text-slate-400 block">ניצחונות / הפסדים</span>
            <span className="text-xl font-bold text-emerald-400">{playerStats.totalWins} <span className="text-slate-500">/</span> <span className="text-rose-400">{playerStats.totalLosses}</span></span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
            <span className="text-xs text-slate-400 block">אחוז ניצחונות</span>
            <span className="text-2xl font-bold text-cyan-300">{winRate}%</span>
          </div>
        </div>

        {/* ניצחונות לפי סוג יריב */}
        <div className="mb-6 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
          <h4 className="text-sm font-semibold mb-3 text-slate-300">חלוקת משחקים וניצחונות לפי דרגת קושי</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block">בוט קל:</span>
              <span className="font-semibold text-amber-200">{playerStats.winsByBotType.EASY} ניצחונות מתוך {playerStats.gamesByBotType.EASY}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block">בוט בינוני:</span>
              <span className="font-semibold text-amber-200">{playerStats.winsByBotType.MEDIUM} ניצחונות מתוך {playerStats.gamesByBotType.MEDIUM}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block">בוט קשה:</span>
              <span className="font-semibold text-amber-200">{playerStats.winsByBotType.HARD} ניצחונות מתוך {playerStats.gamesByBotType.HARD}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block">בוט סופר-קשה:</span>
              <span className="font-semibold text-amber-200">{playerStats.winsByBotType.SUPER_HARD} ניצחונות מתוך {playerStats.gamesByBotType.SUPER_HARD}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block">Gemini AI:</span>
              <span className="font-semibold text-amber-200">{playerStats.winsByBotType.GEMINI_AI} ניצחונות מתוך {playerStats.gamesByBotType.GEMINI_AI}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 block">שחקנים אנושיים:</span>
              <span className="font-semibold text-amber-200">{playerStats.humanWins} ניצחונות מתוך {playerStats.humanGames}</span>
            </div>
          </div>
        </div>

        {/* טבלת ייחוס לשילובים נפוצים */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold mb-3 text-slate-300">טבלת ניקוד ייחוס (80% יריב חזק + 20% שאר היריבים)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                  <th className="p-2">הרכב החדר</th>
                  <th className="p-2">יריב מוביל</th>
                  <th className="p-2">שאר היריבים</th>
                  <th className="p-2">ניקוד בסיס</th>
                  <th className="p-2">שחיקה (50%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-2">3 בוטים קלים</td>
                  <td className="p-2">קל (1)</td>
                  <td className="p-2">קל, קל (1)</td>
                  <td className="p-2 font-bold text-amber-300">1.0</td>
                  <td className="p-2 text-slate-400">0.5</td>
                </tr>
                <tr>
                  <td className="p-2">2 קלים + 1 בינוני</td>
                  <td className="p-2">בינוני (3)</td>
                  <td className="p-2">קל, קל (1)</td>
                  <td className="p-2 font-bold text-amber-300">2.6</td>
                  <td className="p-2 text-slate-400">1.3</td>
                </tr>
                <tr>
                  <td className="p-2">2 בינוניים + 1 קשה</td>
                  <td className="p-2">קשה (5)</td>
                  <td className="p-2">בינוני, בינוני (3)</td>
                  <td className="p-2 font-bold text-amber-300">4.6</td>
                  <td className="p-2 text-slate-400">2.3</td>
                </tr>
                <tr>
                  <td className="p-2">3 בוטים סופר-קשים</td>
                  <td className="p-2">סופר-קשה (8)</td>
                  <td className="p-2">סופר-קשה (8)</td>
                  <td className="p-2 font-bold text-amber-300">8.0</td>
                  <td className="p-2 text-slate-400">4.0</td>
                </tr>
                <tr>
                  <td className="p-2">3 בוטים Gemini AI</td>
                  <td className="p-2">Gemini AI (10)</td>
                  <td className="p-2">Gemini AI (10)</td>
                  <td className="p-2 font-bold text-amber-300">10.0</td>
                  <td className="p-2 text-slate-400">5.0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition"
        >
          סגור
        </button>
      </div>
    </div>
  );
};