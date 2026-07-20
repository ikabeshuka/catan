import React from 'react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMap: (type: 'RANDOM' | 'STARTER') => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  onSelectMap,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl flex flex-col gap-6 text-center" dir="rtl">
        <h3 className="text-2xl font-black text-slate-50">בחר סוג מפה למשחק הבסיס</h3>
        <p className="text-sm text-slate-400">המפה תקבע את סידור משאבי המשושים והמספרים על גבי הלוח.</p>
        
        <div className="grid grid-cols-1 gap-4 mt-2">
          <button 
            type="button"
            onClick={() => onSelectMap('RANDOM')}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border border-slate-850 hover:border-amber-500 bg-slate-950/50 hover:bg-slate-950/80 transition text-right w-full cursor-pointer"
          >
            <span className="text-lg font-bold text-amber-500 flex items-center gap-2">
              🎲 מפה אקראית
            </span>
            <span className="text-xs text-slate-400">מפה המיוצרת באקראיות מלאה ומציעה בכל משחק אתגר חדש ומשתנה.</span>
          </button>

          <button 
            type="button"
            onClick={() => onSelectMap('STARTER')}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border border-slate-850 hover:border-amber-500 bg-slate-950/50 hover:bg-slate-950/80 transition text-right w-full cursor-pointer"
          >
            <span className="text-lg font-bold text-amber-500 flex items-center gap-2">
              📜 לוח קלאסי למתחילים
            </span>
            <span className="text-xs text-slate-400">פריסת לוח קבועה, מאוזנת ורשמית המומלצת למשחקי פתיחה.</span>
          </button>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition"
        >
          ביטול
        </button>
      </div>
    </div>
  );
};
