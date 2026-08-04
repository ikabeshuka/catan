import React from 'react';
import { useUser } from '../../context/UserContext';

export const AuthWidget: React.FC = () => {
  const { 
    currentUser, 
    isAuthLoading, 
    logout, 
    playerStats,
    setIsAuthModalOpen 
  } = useUser();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center p-2 bg-slate-900/40 border border-slate-800/40 rounded-xl" dir="rtl">
        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="mr-2 text-xs text-slate-400">טוען...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="w-full" dir="rtl">
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md hover:shadow-amber-500/10 transition-all duration-300"
        >
          <span>🔑</span>
          <span>התחברות / הרשמה למשחק</span>
        </button>
      </div>
    );
  }

  const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'משתמש';

  return (
    <div className="flex items-center justify-between gap-3 p-2 bg-slate-900/80 border border-slate-800/80 rounded-xl shadow-md w-full" dir="rtl">
      {/* User Info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-xs text-amber-500 shrink-0">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0 text-right">
          <span className="text-xs font-bold text-slate-200 truncate">{displayName}</span>
          <span className="text-[10px] text-slate-400 truncate">{currentUser.email}</span>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-center shrink-0">
          <span className="text-xs font-black text-amber-500">🏆 {playerStats.ratingPoints} XP</span>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={logout}
          title="התנתק"
          className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-red-400 text-slate-400 border border-slate-700/50 rounded-lg transition-all duration-200"
          aria-label="התנתק"
        >
          🚪
        </button>
      </div>
    </div>
  );
};
