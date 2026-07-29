import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import type { SeafarersScenario } from '../../types/game.types';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RuleSectionProps {
  id: string;
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const SCENARIO_NAMES: Record<SeafarersScenario, string> = {
  HEADING_FOR_NEW_SHORES: 'אל חופים חדשים',
  FOUR_ISLANDS: 'ארבעת האיים',
  FOG_ISLAND: 'אי הערפל',
  THROUGH_THE_DESERT: 'דרך המדבר',
};

const SCENARIO_RULES: Record<SeafarersScenario, React.ReactNode> = {
  HEADING_FOR_NEW_SHORES: (
    <>
      <li>מתחילים באי הראשי ומפליגים אל האיים הקטנים.</li>
      <li>היישוב הראשון של שחקן בכל אי זר מעניק 2 נקודות ניצחון נוספות.</li>
      <li>היעד לניצחון הוא 14 נקודות.</li>
    </>
  ),
  FOUR_ISLANDS: (
    <>
      <li>יישובי ההקמה קובעים את איי הבית של כל שחקן.</li>
      <li>היישוב הראשון בכל אי שאינו אי בית מעניק 2 נקודות ניצחון נוספות.</li>
      <li>היעד לניצחון הוא 13 נקודות.</li>
    </>
  ),
  FOG_ISLAND: (
    <>
      <li>אריחי ערפל נחשפים כאשר כביש או ספינה מגיעים אליהם.</li>
      <li>חשיפת אריח משאב מעניקה מיד קלף אחד, בכפוף למלאי הבנק.</li>
      <li>חשיפת אדמת זהב מאפשרת לבחור משאב אחד מהבנק.</li>
      <li>היעד לניצחון הוא 12 נקודות.</li>
    </>
  ),
  THROUGH_THE_DESERT: (
    <>
      <li>יישובי ההקמה מוצבים באזור הבית; בהמשך ניתן להתרחב מעבר לים ולמדבר.</li>
      <li>היישוב הראשון באזור או באי זר מעניק 2 נקודות ניצחון נוספות.</li>
      <li>היעד לניצחון הוא 14 נקודות.</li>
    </>
  ),
};

const RuleSection: React.FC<RuleSectionProps> = ({ id, title, icon, isExpanded, onToggle, children }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/55">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={`${id}-content`}
      className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-right transition hover:bg-slate-800/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <span className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">{icon}</span>
        <span className="font-black text-slate-100">{title}</span>
      </span>
      <span className={`text-xl text-amber-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
    </button>
    {isExpanded && (
      <div id={`${id}-content`} className="border-t border-slate-800 px-6 py-5 text-sm leading-7 text-slate-300">
        {children}
      </div>
    )}
  </section>
);

export const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose }) => {
  const { activeExpansion, selectedScenario } = useGame();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['base']));
  const isSeafarers = activeExpansion === 'SEAFARERS';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(previous => {
      const next = new Set(previous);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-rules-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-500/35 bg-slate-900 shadow-2xl shadow-black/60">
        <header className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-l from-amber-500/10 to-transparent px-6 py-5">
          <div>
            <h2 id="game-rules-title" className="text-2xl font-black text-amber-400">📜 הוראות המשחק</h2>
            <p className="mt-1 text-xs text-slate-400">החוקים המוצגים מותאמים למשחק הפעיל.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירת הוראות המשחק"
            className="h-10 w-10 cursor-pointer rounded-xl border border-slate-700 bg-slate-950 text-xl text-slate-300 transition hover:border-rose-500/60 hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="space-y-3 overflow-y-auto p-5 md:p-6">
          <RuleSection id="base" title="חוקי הבסיס" icon="🏠" isExpanded={expandedSections.has('base')} onToggle={() => toggleSection('base')}>
            <ul className="list-disc space-y-2 pr-5 marker:text-amber-400">
              <li>המטרה היא להגיע ליעד נקודות הניצחון של המשחק ולהכריז על הניצחון בתורך.</li>
              <li>בכל תור מטילים קוביות, מחלקים משאבים ולאחר מכן סוחרים ובונים.</li>
              <li>עלויות: כביש — עץ ולבנה; יישוב — עץ, לבנה, כבשה וחיטה; עיר — 2 חיטה ו־3 ברזל; קלף פיתוח — כבשה, חיטה וברזל.</li>
              <li>יישובים חייבים להיות במרחק של שני קודקודים לפחות זה מזה ולהתחבר לרשת הדרכים של השחקן.</li>
              <li>בתוצאה 7, שחקן שמחזיק יותר מ־7 קלפים משליך מחצית מהם, ולאחר מכן השודד מועבר.</li>
              <li>ניתן לשחק קלף פיתוח אחד בתור, גם לפני הטלת הקוביות, אך לא קלף שנרכש באותו תור.</li>
              <li>הדרך הארוכה ביותר והצבא הגדול ביותר מעניקים 2 נקודות ניצחון כל אחד.</li>
            </ul>
          </RuleSection>

          {isSeafarers && (
            <RuleSection id="seafarers" title="חוקי יורדי הים" icon="⛵" isExpanded={expandedSections.has('seafarers')} onToggle={() => toggleSection('seafarers')}>
              <ul className="list-disc space-y-2 pr-5 marker:text-sky-400">
                <li>ספינה עולה עץ וכבשה, ונבנית בים או לאורך קו חוף.</li>
                <li>כבישים וספינות יוצרים נתיבים נפרדים; מעבר ביניהם מחייב יישוב או עיר של השחקן בנקודת החיבור.</li>
                <li>פעם אחת בתור ניתן להזיז ספינה פתוחה שלא נבנתה באותו תור.</li>
                <li>השודד פועל ביבשה ושודד הים פועל בים; יש לבחור כלי חוקי בהתאם ליעד.</li>
                <li>אדמת זהב אינה מייצרת משאב קבוע — בעל המבנה בוחר משאב זמין מהבנק.</li>
              </ul>
            </RuleSection>
          )}

          {isSeafarers && selectedScenario && (
            <RuleSection
              id="scenario"
              title={`חוקי התרחיש: ${SCENARIO_NAMES[selectedScenario]}`}
              icon="🗺️"
              isExpanded={expandedSections.has('scenario')}
              onToggle={() => toggleSection('scenario')}
            >
              <ul className="list-disc space-y-2 pr-5 marker:text-emerald-400">
                {SCENARIO_RULES[selectedScenario]}
              </ul>
            </RuleSection>
          )}
        </div>
      </div>
    </div>
  );
};
