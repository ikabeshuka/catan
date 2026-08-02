import React from 'react';
import { useUser } from '../../context/UserContext';

export const AuthWidget: React.FC = () => {
  const { currentUser, isAuthLoading, loginWithGoogle, logout, playerStats } = useUser();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center p-3 bg-slate-900/40 border border-slate-800/40 rounded-xl" dir="rtl">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="mr-2 text-sm text-slate-400">טוען...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="w-full" dir="rtl">
        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm rounded-lg shadow-md hover:shadow-amber-500/20 transition-all duration-300"
        >
          <span>🔑</span>
          <span>התחבר עם Google</span>
        </button>
      </div>
    );
  }

  const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'משתמש';

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg w-full" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col min-w-0 text-right">
          <span className="text-sm font-bold text-slate-200 truncate">{displayName}</span>
          <span className="text-xs text-slate-400 truncate">{currentUser.email}</span>
        </div>
        <div className="flex flex-col items-end shrink-0 text-left">
          <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">ניקוד דירוג</span>
          <span className="text-sm font-bold text-amber-500">{playerStats.ratingPoints} XP</span>
        </div>
      </div>
      <button
        onClick={logout}
        className="w-full px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 border border-slate-700/50 hover:border-red-500/30 font-medium text-xs rounded-lg transition-all duration-200"
      >
        התנתק
      </button>
    </div>
  );
};
