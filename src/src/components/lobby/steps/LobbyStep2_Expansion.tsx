import React, { useState, useEffect } from 'react';

interface LobbyStep2ExpansionProps {
  activeExpansion: 'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS';
  setActiveExpansion: (exp: 'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS') => void;
  selectedScenario: 'HEADING_FOR_NEW_SHORES' | 'FOUR_ISLANDS' | 'FOG_ISLAND';
  setSelectedScenario: (scen: 'HEADING_FOR_NEW_SHORES' | 'FOUR_ISLANDS' | 'FOG_ISLAND') => void;
  boardType: 'RANDOM' | 'STARTER';
  setBoardType: (type: 'RANDOM' | 'STARTER') => void;
  onNext: () => void;
  onPrev: () => void;
}

export const LobbyStep2_Expansion: React.FC<LobbyStep2ExpansionProps> = ({
  activeExpansion,
  setActiveExpansion,
  selectedScenario,
  setSelectedScenario,
  boardType,
  setBoardType,
  onNext,
  onPrev,
}) => {
  // Local state to allow multiple selections visually, as requested by the user
  const [selectedExpansions, setSelectedExpansions] = useState<('MERCHANTS_AND_BARBARIANS' | 'SEAFARERS')[]>(() => {
    if (activeExpansion === 'BASE') return [];
    return [activeExpansion];
  });

  // Whenever local selections change, sync with the global context (fallback to BASE if empty)
  useEffect(() => {
    if (selectedExpansions.includes('SEAFARERS')) {
      setActiveExpansion('SEAFARERS');
    } else if (selectedExpansions.includes('MERCHANTS_AND_BARBARIANS')) {
      setActiveExpansion('MERCHANTS_AND_BARBARIANS');
    } else {
      setActiveExpansion('BASE');
    }
  }, [selectedExpansions, setActiveExpansion]);

  const toggleExpansion = (exp: 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS') => {
    setSelectedExpansions(prev => {
      if (prev.includes(exp)) {
        return prev.filter(item => item !== exp);
      } else {
        return [...prev, exp];
      }
    });
  };

  const isMerchantsSelected = selectedExpansions.includes('MERCHANTS_AND_BARBARIANS');
  const isSeafarersSelected = selectedExpansions.includes('SEAFARERS');

  return (
    <div className="w-full animate-fade-in flex flex-col items-center gap-6" dir="rtl">
      {/* 🔹 בחירת הרחבה */}
      <h2 className="text-xl font-bold text-slate-100 text-center">בחר הרחבות מיוחדות למשחק (ניתן לשלב מספר הרחבות):</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl">
        
        {/* סוחרים וברברים */}
        <button
          type="button"
          onClick={() => toggleExpansion('MERCHANTS_AND_BARBARIANS')}
          className={`group p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${
            isMerchantsSelected
              ? 'border-amber-500 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
          }`}
        >
          <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
            <img 
              src="/traders_barbarians.png" 
              alt="Traders & Barbarians" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            {isMerchantsSelected && (
              <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 rounded-full p-1 shadow-lg z-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-slate-100">סוחרים וברברים</span>
            <span className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
              משימות הובלה מרתקות, שיירות, וזהב כפיצוי על תורות חלשים.
            </span>
          </div>
        </button>

        {/* יורדי הים */}
        <button
          type="button"
          onClick={() => toggleExpansion('SEAFARERS')}
          className={`group p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col items-center gap-4 ${
            isSeafarersSelected
              ? 'border-amber-500 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
          }`}
        >
          <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
            <img 
              src="/seafarers.png" 
              alt="Seafarers" 
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isSeafarersSelected ? '' : 'grayscale'}`} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            {isSeafarersSelected && (
              <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 rounded-full p-1 shadow-lg z-10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-black text-slate-100">יורדי הים</span>
            <span className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
              הרחבת בניית אוניות, נתיבי שיט וניווט בין איים.
            </span>
          </div>
        </button>

      </div>

      {/* ערים ואבירים - חסום (טיוטה) */}
      <div className="w-full max-w-2xl flex justify-center -mt-2">
        <div 
          className="p-3 rounded-xl border border-slate-800/80 text-center relative overflow-hidden flex items-center justify-between gap-4 bg-slate-950/40 opacity-50 cursor-not-allowed w-full max-w-md"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <div className="text-right">
              <span className="text-sm font-black text-slate-400 block">ערים ואבירים</span>
              <span className="text-[10px] text-slate-500 leading-none">
                שדרוג ערים למטרופולינים, אבירים להגנה ותקיפת הברברים.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
            🔒 בקרוב!
          </span>
        </div>
      </div>

      {/* ממשק בחירת תרחיש מרהיב עבור יורדי הים */}
      {isSeafarersSelected && (
        <div className="w-full mt-2 p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col gap-4 animate-fade-in max-w-2xl">
          <div className="text-center">
            <h3 className="text-base font-black text-amber-400 flex items-center justify-center gap-2">
              <span>⛵</span> בחר תרחיש להרפתקת יורדי הים:
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {/* אל חופים חדשים */}
            <button
              type="button"
              onClick={() => setSelectedScenario('HEADING_FOR_NEW_SHORES')}
              className={`group/scenario p-3 rounded-xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col items-center gap-2 relative overflow-hidden ${
                selectedScenario === 'HEADING_FOR_NEW_SHORES'
                  ? 'border-amber-500 bg-slate-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
              }`}
            >
              {selectedScenario === 'HEADING_FOR_NEW_SHORES' && (
                <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow z-10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-2xl filter drop-shadow">⛵</span>
              <span className="text-sm font-bold text-slate-100 group-hover/scenario:text-amber-400 transition-colors">"אל חופים חדשים"</span>
              <span className="text-[10px] text-slate-400 leading-relaxed text-center">
                אי מרכזי גדול המוקף באיים קטנים ועשירים בזהב.
              </span>
            </button>

            {/* ארבעת האיים */}
            <button
              type="button"
              onClick={() => setSelectedScenario('FOUR_ISLANDS')}
              className={`group/scenario p-3 rounded-xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col items-center gap-2 relative overflow-hidden ${
                selectedScenario === 'FOUR_ISLANDS'
                  ? 'border-amber-500 bg-slate-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
              }`}
            >
              {selectedScenario === 'FOUR_ISLANDS' && (
                <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow z-10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-2xl filter drop-shadow">🏝️</span>
              <span className="text-sm font-bold text-slate-100 group-hover/scenario:text-amber-400 transition-colors">"ארבעת האיים"</span>
              <span className="text-[10px] text-slate-400 leading-relaxed text-center">
                חלוקה לארבעה איים נפרדים וגדולים הדורשת הפלגה מוקדמת.
              </span>
            </button>

            {/* אי הערפל */}
            <button
              type="button"
              onClick={() => setSelectedScenario('FOG_ISLAND')}
              className={`group/scenario p-3 rounded-xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col items-center gap-2 relative overflow-hidden ${
                selectedScenario === 'FOG_ISLAND'
                  ? 'border-amber-500 bg-slate-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
              }`}
            >
              {selectedScenario === 'FOG_ISLAND' && (
                <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow z-10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-2xl filter drop-shadow">🌫️</span>
              <span className="text-sm font-bold text-slate-100 group-hover/scenario:text-amber-400 transition-colors">"אי הערפל"</span>
              <span className="text-[10px] text-slate-400 leading-relaxed text-center">
                מרכז הלוח מכוסה בערפל מסתורי הנחשף רק בעת הגעת ספינות.
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 🔹 תפריט בחירת סוג הלוח באותו חלון/שלב */}
      <div className="w-full mt-4 p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col gap-4 animate-fade-in max-w-2xl">
        <div className="text-center">
          <h3 className="text-base font-black text-amber-400 flex items-center justify-center gap-2">
            <span>🗺️</span> בחר את סוג הלוח למשחק:
          </h3>
          <p className="text-xs text-slate-400 mt-1">פריסת הלוח הבסיסית או האקראית עבור המשחק שלך.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* מפת מתחילים (STARTER) */}
          <button
            type="button"
            onClick={() => setBoardType('STARTER')}
            className={`p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] flex flex-col items-center gap-2 relative overflow-hidden cursor-pointer ${
              boardType === 'STARTER'
                ? 'border-amber-500 bg-slate-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
            }`}
          >
            {boardType === 'STARTER' && (
              <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow z-10">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <span className="text-base font-bold text-slate-100">📜 לוח קלאסי למתחילים</span>
            <span className="text-xs text-slate-400 leading-relaxed text-center">
              פריסת לוח קבועה, מאוזנת ורשמית המומלצת למשחקי פתיחה.
            </span>
          </button>

          {/* מפה אקראית (RANDOM) */}
          <button
            type="button"
            onClick={() => setBoardType('RANDOM')}
            className={`p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] flex flex-col items-center gap-2 relative overflow-hidden cursor-pointer ${
              boardType === 'RANDOM'
                ? 'border-amber-500 bg-slate-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
            }`}
          >
            {boardType === 'RANDOM' && (
              <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow z-10">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <span className="text-base font-bold text-slate-100">🎲 מפה אקראית</span>
            <span className="text-xs text-slate-400 leading-relaxed text-center">
              מפה המיוצרת באקראיות מלאה ומציעה בכל משחק אתגר חדש ומשתנה.
            </span>
          </button>
        </div>
      </div>

      {/* כפתורי ניווט */}
      <div className="w-full flex items-center justify-between mt-6 border-t border-slate-800/80 pt-6 max-w-2xl">
        <button
          type="button"
          onClick={onPrev}
          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-2.5 px-6 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          חזור
        </button>

        <button
          type="button"
          onClick={onNext}
          className="bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black py-3 px-8 rounded-xl text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-200 tracking-wide hover:brightness-110 cursor-pointer"
        >
          המשך לבחירת כמות שחקנים
        </button>
      </div>
    </div>
  );
};
