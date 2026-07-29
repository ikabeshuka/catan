import React from 'react';
import { ResourceCards } from '../../types/resources.types';
import { ResourceCard } from './ResourceCard';
import { SearchIcon, CompressIcon } from '../common/Icons';

interface ResourceContainerProps {
  resources: ResourceCards;
  playerName: string;
  position: 'bottom' | 'right';
  isCollapsed: boolean;
  onPositionChange: (position: 'bottom' | 'right') => void;
  onToggleCollapsed: () => void;
  playerId?: string;
}

export const ResourceContainer: React.FC<ResourceContainerProps> = ({
  resources,
  playerName,
  position,
  isCollapsed,
  onPositionChange,
  onToggleCollapsed,
  playerId,
}) => {
  const resourceTypes = [
    { type: 'WOOD' as const, label: 'עץ', imgPath: '/wood1.png', color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
    { type: 'BRICK' as const, label: 'לבנה', imgPath: '/brick1.png', color: 'text-orange-800', bg: 'bg-orange-50 border-orange-200' },
    { type: 'SHEEP' as const, label: 'כבש', imgPath: '/wool1.png', color: 'text-lime-800', bg: 'bg-lime-50 border-lime-200' },
    { type: 'WHEAT' as const, label: 'חיטה', imgPath: '/wheat1.png', color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
    { type: 'ORE' as const, label: 'ברזל', imgPath: '/rock1.png', color: 'text-slate-800', bg: 'bg-slate-50 border-slate-200' },
  ];

  return (
    <div
      data-player-id={playerId}
      className={`w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed && position === 'bottom' ? 'h-16 px-6 py-2' : isCollapsed && position === 'right' ? 'h-auto p-2' : 'h-auto p-4'
      }`}
    >
      {/* שורת בקרה עליונה: בחירת מיקום וכיווץ (מוצגת במצב מורחב או בצד ימין) */}
      <div className={`flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3 select-none transition-all duration-300 ${
        isCollapsed && position === 'bottom' ? 'h-0 opacity-0 mb-0 pb-0 border-0 pointer-events-none overflow-hidden' : 'flex-row'
      } ${isCollapsed && position === 'right' ? 'flex-col gap-2' : ''}`}>
        <div className={`flex items-center gap-2 ${isCollapsed && position === 'right' ? 'flex-col text-center' : ''}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
          {!isCollapsed && (
            <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">
              קלפי <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-extrabold">{playerName}</span>
            </span>
          )}
          {isCollapsed && position !== 'right' && (
            <span className="text-slate-400 text-[10px] font-bold">משאבים</span>
          )}
        </div>

        {/* פאנל כפתורי בקרה עם כפתורים מפורשים ומזמינים לפתיחת מרחב הראייה */}
        <div className={`flex items-center gap-2 ${isCollapsed && position === 'right' ? 'flex-col' : 'flex-row'}`}>
          {/* כפתור החלפת מיקום - 'הצידה' */}
          <button
            onClick={() => onPositionChange(position === 'bottom' ? 'right' : 'bottom')}
            title={position === 'bottom' ? 'הזז את הפאנל הצידה לימין לפתיחת מרחב הראייה' : 'החזר את הפאנל לתחתית'}
            className={`rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 hover:text-white shadow-md active:scale-95 transition-all cursor-pointer text-xs font-extrabold flex items-center justify-center gap-1 ${
              isCollapsed && position === 'right' ? 'w-10 h-8 p-0 text-base' : 'py-1.5 px-3'
            }`}
          >
            <span>{isCollapsed && position === 'right' ? '⬇️' : (position === 'bottom' ? '➡️ הצידה' : '⬇️ תחתית')}</span>
          </button>

          {/* כפתור כיווץ / פריסה - 'צמצם' (כיווץ מטה) */}
          <button
            onClick={onToggleCollapsed}
            title={isCollapsed ? 'פרוס את הפאנל מחדש' : 'כווץ את הפאנל מטה לפתיחת מרחב הראייה'}
            className={`rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 hover:text-white shadow-md active:scale-95 transition-all cursor-pointer text-xs font-extrabold flex items-center justify-center gap-1 ${
              isCollapsed && position === 'right' ? 'w-10 h-8 p-0' : 'py-1.5 px-3'
            }`}
          >
            {isCollapsed ? (
              <>
                <SearchIcon size={12} />
                {!isCollapsed || position !== 'right' ? <span>הרחב</span> : null}
              </>
            ) : (
              <>
                <CompressIcon size={12} />
                <span>⬇️ צמצם</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* תצוגת תוכן המשאבים עם תמיכה באנימציות מעבר דינמיות וחלקות */}
      <div className="flex-1 flex items-center justify-center min-h-0 relative">
        {position === 'right' ? (
          /* ================== פריסה ימנית (ללא שינוי מהותי, תומכת במצבים הרגילים) ================== */
          isCollapsed ? (
            <div className="flex flex-col items-center gap-2.5 py-1 w-full animate-fade-in justify-center">
              {resourceTypes.map((res) => {
                const count = resources[res.type] || 0;
                  return (
                    <div
                      key={res.type}
                      id={`resource-collapsed-${res.type}`}
                      className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-slate-700/30 bg-slate-900/60 p-1 group hover:scale-115 transition-all cursor-pointer"
                      title={`${res.label}: ${count}`}
                    >
                      <span className="filter drop-shadow scale-90">
                        {res.imgPath ? <img src={res.imgPath} className="w-6 h-6 object-contain bg-transparent" style={{ mixBlendMode: 'multiply' }} alt={res.label} /> : null}
                      </span>
                      <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded bg-slate-950 border border-slate-750 text-slate-200 font-mono text-[9px] font-black shadow-md">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[380px] w-full relative animate-fade-in py-8">
              {/* הקלפים מסודרים בערימה אנכית חופפת כמו חפיסה אמיתית בצד */}
              <ResourceCard 
                type="WOOD" 
                count={resources.WOOD} 
                className="rotate-[-4deg] translate-x-[-4px] hover:translate-x-[-16px] hover:rotate-[0deg] hover:scale-105 hover:z-50 my-[-50px]"
              />
              <ResourceCard 
                type="BRICK" 
                count={resources.BRICK} 
                className="rotate-[-2deg] translate-x-[-2px] hover:translate-x-[-16px] hover:rotate-[0deg] hover:scale-105 hover:z-50 my-[-50px]"
              />
              <ResourceCard 
                type="SHEEP" 
                count={resources.SHEEP} 
                className="rotate-[0deg] translate-x-0 hover:translate-x-[-16px] hover:rotate-[0deg] hover:scale-105 hover:z-50 my-[-50px]"
              />
              <ResourceCard 
                type="WHEAT" 
                count={resources.WHEAT} 
                className="rotate-[2deg] translate-x-[2px] hover:translate-x-[-16px] hover:rotate-[0deg] hover:scale-105 hover:z-50 my-[-50px]"
              />
              <ResourceCard 
                type="ORE" 
                count={resources.ORE} 
                className="rotate-[4deg] translate-x-[4px] hover:translate-x-[-16px] hover:rotate-[0deg] hover:scale-105 hover:z-50 my-[-50px]"
              />
            </div>
          )
        ) : (
          /* ================== פריסה בתחתית (עם אנימציות מעבר והחלקה) ================== */
          <div className="w-full h-full relative flex items-center justify-center">
            
            {/* 1. מצב מורחב (הקלפים המקוריים) - מחליק מטה אל מחוץ למסך כאשר מכווץ */}
            <div 
              className={`flex flex-row justify-center items-end h-[190px] w-full gap-0 transition-all duration-300 ease-in-out transform ${
                isCollapsed 
                  ? 'translate-y-48 opacity-0 pointer-events-none absolute' 
                  : 'translate-y-0 opacity-100 relative'
              }`}
            >
              {/* הקלפים המקוריים מסודרים באלכסון קל חופף כמו חפיסה אמיתית */}
              <ResourceCard 
                type="WOOD" 
                count={resources.WOOD} 
                className="rotate-[-6deg] translate-y-[8px] hover:translate-y-[-12px] hover:rotate-[-2deg] hover:scale-105 hover:z-50 mx-[-14px]"
              />
              <ResourceCard 
                type="BRICK" 
                count={resources.BRICK} 
                className="rotate-[-3deg] translate-y-[2px] hover:translate-y-[-12px] hover:rotate-[-1deg] hover:scale-105 hover:z-50 mx-[-14px]"
              />
              <ResourceCard 
                type="SHEEP" 
                count={resources.SHEEP} 
                className="rotate-[0deg] translate-y-0 hover:translate-y-[-12px] hover:rotate-[0deg] hover:scale-105 hover:z-50 mx-[-14px]"
              />
              <ResourceCard 
                type="WHEAT" 
                count={resources.WHEAT} 
                className="rotate-[3deg] translate-y-[2px] hover:translate-y-[-12px] hover:rotate-[1deg] hover:scale-105 hover:z-50 mx-[-14px]"
              />
              <ResourceCard 
                type="ORE" 
                count={resources.ORE} 
                className="rotate-[6deg] translate-y-[8px] hover:translate-y-[-12px] hover:rotate-[2deg] hover:scale-105 hover:z-50 mx-[-14px]"
              />
            </div>

            {/* 2. מצב מכווץ (בר מינימליסטי) - עולה ותופס את המקום בצורה חלקה */}
            <div 
              className={`w-full flex items-center justify-between transition-all duration-300 ease-in-out transform ${
                isCollapsed 
                  ? 'translate-y-0 opacity-100 relative' 
                  : 'translate-y-24 opacity-0 pointer-events-none absolute'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-slate-400 text-xs font-bold font-sans">קלפי {playerName}:</span>
              </div>

              {/* 5 אייקונים וקטוריים מונוכרומטיים עם מספר לבן גדול וברור */}
              <div className="flex items-center justify-center gap-8 flex-1">
                {resourceTypes.map((res) => {
                  const count = resources[res.type] || 0;
                  return (
                    <div 
                      key={res.type} 
                      className="flex items-center gap-3 group px-3 py-1 rounded-lg hover:bg-slate-800/40 transition-all duration-200"
                      title={`${res.label}: ${count}`}
                    >
                      {res.imgPath ? <img src={res.imgPath} className="w-6 h-6 object-contain bg-transparent" style={{ mixBlendMode: 'multiply' }} alt={res.label} /> : null}
                      <span className="text-slate-100 text-2xl font-black font-mono tracking-tight drop-shadow-sm">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* כפתור הרחבה קומפקטי בצד שמאל של הבר */}
              <button
                onClick={onToggleCollapsed}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-black flex items-center gap-1.5"
                title="פרוס קלפים"
              >
                <SearchIcon size={12} />
                <span>הרחב</span>
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
