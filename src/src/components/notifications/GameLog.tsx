import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { TransparentImage } from '../common/TransparentImage';

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const GameLog: React.FC = () => {
  const { logs, players } = useGame();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // גלילה אוטומטית לתחתית הלוג בכל פעם שמתווספת הודעה חדשה (שימוש ב-scrollTop מונע גלילה לא רצויה של כל חלון האפליקציה)
  useEffect(() => {
    if (!isCollapsed && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  // פונקציית עזר להדגשת שמות שחקנים ושילוב אייקונים של משאבים
  const formatLogMessage = (message: string) => {
    if (!players || players.length === 0) return message;
    
    const playerNames = players.map(p => p.name).filter(Boolean);
    if (playerNames.length === 0) return message;
    
    const playerPattern = playerNames.map(name => escapeRegExp(name)).join('|');
    const resourcePattern = 'עץ|לבנה|כבש|חיטה|ברזל|WOOD|BRICK|SHEEP|WHEAT|ORE';
    
    const combinedRegex = new RegExp(`(${playerPattern}|${resourcePattern})`, 'g');
    const parts = message.split(combinedRegex);
    
    return parts.map((part, index) => {
      // בדיקה האם חלק זה הוא שם שחקן
      const player = players.find(p => p.name === part);
      if (player) {
        return (
          <span 
            key={index} 
            style={{ color: player.color }} 
            className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
          >
            {part}
          </span>
        );
      }
      
      // בדיקה האם חלק זה הוא משאב
      if (part === 'עץ' || part === 'WOOD') {
        return (
          <span key={index} className="inline-flex items-center gap-0.5 font-semibold text-emerald-400 bg-emerald-950/35 px-1 py-0.5 rounded border border-emerald-500/20 mx-0.5">
            עץ
            <TransparentImage src="/wood1.png" className="h-4 w-4 inline-block align-middle ml-1" alt="עץ" />
          </span>
        );
      }
      if (part === 'לבנה' || part === 'BRICK') {
        return (
          <span key={index} className="inline-flex items-center gap-0.5 font-semibold text-orange-400 bg-orange-950/35 px-1 py-0.5 rounded border border-orange-500/20 mx-0.5">
            לבנה
            <TransparentImage src="/brick1.png" className="h-4 w-4 inline-block align-middle ml-1" alt="לבנה" />
          </span>
        );
      }
      if (part === 'כבש' || part === 'SHEEP') {
        return (
          <span key={index} className="inline-flex items-center gap-0.5 font-semibold text-pink-400 bg-pink-950/35 px-1 py-0.5 rounded border border-pink-500/20 mx-0.5">
            כבש
            <TransparentImage src="/wool1.png" className="h-4 w-4 inline-block align-middle ml-1" alt="כבש" />
          </span>
        );
      }
      if (part === 'חיטה' || part === 'WHEAT') {
        return (
          <span key={index} className="inline-flex items-center gap-0.5 font-semibold text-amber-400 bg-amber-950/35 px-1 py-0.5 rounded border border-amber-500/20 mx-0.5">
            חיטה
            <TransparentImage src="/wheat1.png" className="h-4 w-4 inline-block align-middle ml-1" alt="חיטה" />
          </span>
        );
      }
      if (part === 'ברזל' || part === 'ORE') {
        return (
          <span key={index} className="inline-flex items-center gap-0.5 font-semibold text-slate-300 bg-slate-800/35 px-1 py-0.5 rounded border border-slate-700/20 mx-0.5">
            ברזל
            <TransparentImage src="/rock1.png" className="h-4 w-4 inline-block align-middle ml-1" alt="ברזל" />
          </span>
        );
      }
      
      return part;
    });
  };

  return (
    <div className={`w-full transition-all duration-300 bg-slate-950/40 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-2xl flex flex-col ${isCollapsed ? 'p-2' : 'h-48 p-4'}`}>
      <button 
        onClick={() => setIsCollapsed(prev => !prev)}
        className={`w-full text-right flex items-center justify-between cursor-pointer transition-all duration-200 focus:outline-none ${isCollapsed ? 'text-xs py-1 px-2 font-bold text-slate-300 hover:text-slate-100 justify-center gap-2' : 'text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-3 border-b border-slate-800 pb-2'}`}
      >
        {isCollapsed ? (
          <span>📋 לוג משחק (לחץ להצגה)</span>
        ) : (
          <>
            <span>היסטוריית מהלכים (News Feed)</span>
            <span className="text-[9px] text-amber-500 font-bold hover:text-amber-400 transition-colors">◀ מזער</span>
          </>
        )}
      </button>
      
      {!isCollapsed && (
        /* אזור רשימת ההודעות הנגלל */
        <div 
          ref={logContainerRef}
          className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 text-xs font-medium scroll-smooth scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
        >
          {logs.map((log, index) => (
            <div 
              key={index} 
              className="text-slate-300 border-r-2 border-amber-500/40 pr-2.5 py-0.5 leading-relaxed hover:text-slate-100 hover:border-amber-400 transition-all duration-200"
            >
              {formatLogMessage(log)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
