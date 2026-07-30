import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../../context/UserContext';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatCard: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent = 'text-slate-100' }) => (
  <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 p-3 text-center">
    <span className="block text-xs text-slate-400">{label}</span>
    <span className={`text-2xl font-black ${accent}`}>{value}</span>
  </div>
);

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ isOpen, onClose }) => {
  const { playerStats, playerName, setPlayerName, generalStats, resetStats } = useUser();
  const [draftName, setDraftName] = useState(playerName);

  useEffect(() => setDraftName(playerName), [playerName, isOpen]);

  const winRate = playerStats.totalGames > 0
    ? Math.round((playerStats.totalWins / playerStats.totalGames) * 100)
    : 0;

  const sortedGeneralStats = useMemo(
    () => [...generalStats].sort((a, b) => b.ratingPoints - a.ratingPoints || b.totalWins - a.totalWins),
    [generalStats]
  );

  const generalTotals = useMemo(() => sortedGeneralStats.reduce((totals, item) => ({
    games: totals.games + item.totalGames,
    wins: totals.wins + item.totalWins,
    losses: totals.losses + item.totalLosses,
  }), { games: 0, wins: 0, losses: 0 }), [sortedGeneralStats]);

  if (!isOpen) return null;

  const saveName = () => setPlayerName(draftName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" dir="rtl">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-amber-500/40 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-xl font-black text-amber-400">📊 דירוג וסטטיסטיקות</h3>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="סגור">✕</button>
        </div>

        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <label htmlFor="stats-player-name" className="mb-2 block text-sm font-bold text-slate-300">השם שיופיע בסטטיסטיקות הכלליות</label>
          <div className="flex gap-2">
            <input
              id="stats-player-name"
              value={draftName}
              maxLength={40}
              onChange={event => setDraftName(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') saveName(); }}
              placeholder="כתבו שם שחקן"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-white outline-none focus:border-amber-500"
            />
            <button onClick={saveName} disabled={!draftName.trim()} className="rounded-xl bg-amber-500 px-5 py-2.5 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">שמור</button>
          </div>
        </section>

        <h4 className="mb-3 font-bold text-slate-300">הנתונים האישיים {playerName ? `של ${playerName}` : ''}</h4>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="ניקוד דירוג" value={playerStats.ratingPoints} accent="text-amber-300" />
          <StatCard label="משחקים" value={playerStats.totalGames} />
          <StatCard label="ניצחונות / הפסדים" value={<>{playerStats.totalWins} / {playerStats.totalLosses}</>} accent="text-emerald-300" />
          <StatCard label="אחוז ניצחונות" value={`${winRate}%`} accent="text-cyan-300" />
        </div>

        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-950/35 p-4">
          <h4 className="mb-3 font-bold text-slate-300">נתונים כלליים</h4>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="שחקנים רשומים" value={sortedGeneralStats.length} />
            <StatCard label="סה״כ משחקים" value={generalTotals.games} />
            <StatCard label="סה״כ ניצחונות" value={generalTotals.wins} accent="text-emerald-300" />
            <StatCard label="סה״כ הפסדים" value={generalTotals.losses} accent="text-rose-300" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[520px] text-right text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr><th className="p-3">#</th><th className="p-3">שם</th><th className="p-3">דירוג</th><th className="p-3">משחקים</th><th className="p-3">ניצחונות</th><th className="p-3">אחוז הצלחה</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedGeneralStats.map((item, index) => (
                  <tr key={item.playerName} className={item.playerName === playerName ? 'bg-amber-500/10' : 'bg-slate-900/50'}>
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3 font-bold">{item.playerName}</td>
                    <td className="p-3 font-black text-amber-300">{item.ratingPoints}</td>
                    <td className="p-3">{item.totalGames}</td>
                    <td className="p-3 text-emerald-300">{item.totalWins}</td>
                    <td className="p-3">{item.totalGames ? Math.round(item.totalWins / item.totalGames * 100) : 0}%</td>
                  </tr>
                ))}
                {sortedGeneralStats.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-500">כתבו שם כדי להצטרף לטבלה הכללית.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            onClick={() => { if (window.confirm('לאפס את כל נתוני הדירוג והסטטיסטיקות האישיות?')) resetStats(); }}
            className="rounded-xl border border-rose-500/50 bg-rose-950/40 px-5 py-2.5 font-bold text-rose-300 hover:bg-rose-900/50"
          >
            איפוס נתונים
          </button>
          <button onClick={onClose} className="rounded-xl border border-slate-700 bg-slate-800 px-8 py-2.5 font-bold text-slate-200 hover:bg-slate-700">סגור</button>
        </div>
      </div>
    </div>
  );
};
