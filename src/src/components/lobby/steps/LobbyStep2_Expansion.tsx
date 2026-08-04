import React, { useState, useEffect } from 'react';
import type { SeafarersScenario } from '../../../types/game.types';
import type { GameExpansion } from '../../../config/gameRules';

interface LobbyStep2ExpansionProps {
  activeExpansion: GameExpansion;
  setActiveExpansion: (exp: GameExpansion) => void;
  selectedScenario: SeafarersScenario;
  setSelectedScenario: (scen: SeafarersScenario) => void;
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
  const [selectedExpansions, setSelectedExpansions] = useState<('SEAFARERS' | 'CITIES_AND_KNIGHTS')[]>(() => {
    return activeExpansion === 'SEAFARERS' || activeExpansion === 'CITIES_AND_KNIGHTS' ? [activeExpansion] : [];
  });

  // Whenever local selections change, sync with the global context (fallback to BASE if empty)
  useEffect(() => {
    if (selectedExpansions.includes('CITIES_AND_KNIGHTS')) {
      setActiveExpansion('CITIES_AND_KNIGHTS');
    } else if (selectedExpansions.includes('SEAFARERS')) {
      setActiveExpansion('SEAFARERS');
    } else {
      setActiveExpansion('BASE');
    }
  }, [selectedExpansions, setActiveExpansion]);

  const toggleExpansion = (exp: 'SEAFARERS' | 'CITIES_AND_KNIGHTS') => {
    setSelectedExpansions(prev => prev.includes(exp) ? [] : [exp]);
  };

  const isSeafarersSelected = selectedExpansions.includes('SEAFARERS');
  const isCitiesKnightsSelected = selectedExpansions.includes('CITIES_AND_KNIGHTS');

  const selectBoardAndContinue = (type: 'RANDOM' | 'STARTER') => {
    setBoardType(type);
    onNext();
  };

  return (
    <div className="w-full animate-fade-in flex flex-col items-center gap-6" dir="rtl">
      {/* 🔹 בחירת הרחבה */}
      <h2 className="text-xl font-bold text-slate-100 text-center">בחר הרחבות מיוחדות למשחק (ניתן לשלב מספר הרחבות):</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl">
        
        {/* סוחרים וברברים */}
        <button
          type="button"
          disabled
          title="הרחבה זו עדיין אינה זמינה עד להשלמת תרחיש רשמי מלא."
          className="group p-4 rounded-2xl border text-center relative overflow-hidden flex flex-col items-center gap-4 border-slate-800 bg-slate-900/40 opacity-50 cursor-not-allowed"
        >
          <div className="w-full h-40 rounded-xl overflow-hidden relative bg-slate-950 flex items-center justify-center">
            <img 
              src="/traders_barbarians.png" 
              alt="Traders & Barbarians" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            <span className="absolute top-3 right-3 rounded-full border border-amber-500/30 bg-slate-950/80 px-2 py-1 text-[10px] font-black text-amber-400">בקרוב</span>
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

      {/* ערים ואבירים */}
      <div className="w-full max-w-2xl flex justify-center -mt-2">
        <button
          type="button"
          onClick={() => toggleExpansion('CITIES_AND_KNIGHTS')}
          className={`group p-4 rounded-2xl border text-center relative overflow-hidden flex flex-col items-center gap-4 w-full max-w-md transition cursor-pointer ${isCitiesKnightsSelected ? 'border-violet-400 bg-violet-950/30 shadow-[0_0_24px_rgba(167,139,250,0.22)]' : 'border-slate-800/80 bg-slate-950/40 hover:border-violet-400/60'}`}
        >
          <div className="h-44 w-full overflow-hidden rounded-xl bg-slate-950">
            <img
              src="/knightscities.png"
              alt="Catan ערים ואבירים"
              className={`h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${isCitiesKnightsSelected ? '' : 'grayscale-[20%]'}`}
            />
          </div>
          <div className="text-center">
            <span className="block text-xl font-black text-slate-100">ערים ואבירים</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-400">שדרוג ערים למטרופולינים, אבירים להגנה ותקיפת הברברים.</span>
          </div>
          {isCitiesKnightsSelected && <span className="absolute left-3 top-3 rounded-full bg-violet-400 px-2 py-0.5 text-[10px] font-black text-slate-950">נבחר</span>}
        </button>
      </div>

      {/* ממשק בחירת תרחיש מרהיב עבור יורדי הים */}
      {isSeafarersSelected && (
        <div className="w-full mt-2 p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col gap-4 animate-fade-in max-w-2xl">
          <div className="text-center">
            <h3 className="text-base font-black text-amber-400 flex items-center justify-center gap-2">
              <span>⛵</span> בחר תרחיש להרפתקת יורדי הים:
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
            <button
              type="button"
              onClick={() => setSelectedScenario('PIRATE_ISLANDS')}
              className={`group/scenario p-3 rounded-xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col items-center gap-2 relative overflow-hidden ${selectedScenario === 'PIRATE_ISLANDS' ? 'border-rose-400 bg-slate-950/80' : 'border-slate-850 bg-slate-950/40 hover:border-slate-700'}`}
            >
              {selectedScenario === 'PIRATE_ISLANDS' && <span className="absolute top-2 right-2 text-rose-300">✓</span>}
              <span className="text-2xl">🏴‍☠️</span>
              <span className="text-sm font-bold text-slate-100 group-hover/scenario:text-rose-300">איי הפיראטים</span>
              <span className="text-[10px] text-slate-400 leading-relaxed text-center">הפליגו אל המבצר שלכם, חמשו ספינות מלחמה והדפו את צי הפיראטים.</span>
            </button>
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

            {/* דרך המדבר */}
            <button
              type="button"
              onClick={() => setSelectedScenario('THROUGH_THE_DESERT')}
              className={`group/scenario p-3 rounded-xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col items-center gap-2 relative overflow-hidden ${
                selectedScenario === 'THROUGH_THE_DESERT'
                  ? 'border-amber-500 bg-slate-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
              }`}
            >
              {selectedScenario === 'THROUGH_THE_DESERT' && (
                <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow z-10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-2xl filter drop-shadow">🏜️</span>
              <span className="text-sm font-bold text-slate-100 group-hover/scenario:text-amber-400 transition-colors">"דרך המדבר"</span>
              <span className="text-[10px] text-slate-400 leading-relaxed text-center">
                מעבר דרך רצועת מדבר מאתגרת להתיישבות באיים זרים ועשירים.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedScenario('THE_LOST_TRIBE')}
              className={`group/scenario p-3 rounded-xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col items-center gap-2 relative overflow-hidden ${
                selectedScenario === 'THE_LOST_TRIBE'
                  ? 'border-amber-500 bg-slate-950/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
              }`}
            >
              {selectedScenario === 'THE_LOST_TRIBE' && (
                <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow z-10">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-2xl filter drop-shadow">🗿</span>
              <span className="text-sm font-bold text-slate-100 group-hover/scenario:text-amber-400 transition-colors">"השבט האבוד"</span>
              <span className="text-[10px] text-slate-400 leading-relaxed text-center">
                הפליגו אל האיים הקטנים ואספו נקודות, קלפי פיתוח ונמלים עתיקים.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedScenario('CLOTH_FOR_CATAN')}
              className={`group/scenario p-3 rounded-xl border text-center transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col items-center gap-2 relative overflow-hidden ${
                selectedScenario === 'CLOTH_FOR_CATAN'
                  ? 'border-indigo-400 bg-slate-950/80 shadow-[0_0_15px_rgba(129,140,248,0.2)]'
                  : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
              }`}
            >
              {selectedScenario === 'CLOTH_FOR_CATAN' && <span className="absolute top-2 right-2 text-indigo-300">✓</span>}
              <span className="text-2xl">🧵</span>
              <span className="text-sm font-bold text-slate-100 group-hover/scenario:text-indigo-300">בדים לקטאן</span>
              <span className="text-[10px] text-slate-400 leading-relaxed text-center">חברו ספינות לכפרים, אספו גלילי בד וצברו נקודות ניצחון.</span>
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
            onClick={() => selectBoardAndContinue('STARTER')}
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
            onClick={() => selectBoardAndContinue('RANDOM')}
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

      <div className="w-full flex items-center justify-between mt-2 max-w-2xl">
        <button
          type="button"
          onClick={onPrev}
          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-2.5 px-6 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          חזור
        </button>
        <p className="text-xs font-bold text-amber-400/80">בחירת סוג הלוח ממשיכה מיד לשלב הבא.</p>
      </div>
    </div>
  );
};
