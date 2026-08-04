import React from 'react';
import { useGame } from '../../context/GameContext';
import { CardIcon } from '../common/Icons';

interface DevelopmentCardsPanelProps {
  handlePlayCard: (cardType: 'KNIGHT' | 'VICTORY_POINT' | 'MONOPOLY' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY') => void;
  isCollapsed: boolean;
  onToggle: () => void;
  onTrophyClick?: (type: 'longest_road' | 'largest_army') => void;
  onHeaderClick?: () => void;
  onOfferTradeClick?: () => void;
}

export const DevelopmentCardsPanel: React.FC<DevelopmentCardsPanelProps> = ({
  handlePlayCard,
  isCollapsed,
  onToggle: _onToggle,
  onTrophyClick,
  onHeaderClick,
  onOfferTradeClick: _onOfferTradeClick,
}) => {
  const { players, currentPlayerIndex, turnSubPhase, longestRoadPlayerId, largestArmyPlayerId, roomId, myPlayerId, selectedScenario } = useGame();
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const humanPlayer = roomId
    ? players.find((p) => p.id === myPlayerId)
    : players.find((p) => !p.isBot) || players[0];
  const activePlayer = players[currentPlayerIndex];

  const devCards = humanPlayer?.developmentCards || {
    KNIGHT: 0,
    MONOPOLY: 0,
    ROAD_BUILDING: 0,
    YEAR_OF_PLENTY: 0,
    VICTORY_POINT: 0,
  };
  const totalCards = Object.values(devCards).reduce((a, b) => (a || 0) + (b || 0), 0);
  const isOurTurn = (!roomId || (!!myPlayerId && activePlayer?.id === myPlayerId))
    && activePlayer?.id === humanPlayer?.id
    && (turnSubPhase === 'BEFORE_ROLL' || turnSubPhase === 'TRADE_AND_BUILD');

  const longestRoadHolder = players.find((p) => p.id === longestRoadPlayerId) || null;
  const largestArmyHolder = players.find((p) => p.id === largestArmyPlayerId) || null;

  const effectiveCollapsed = isCollapsed;

  const handlePanelClick = () => {
    onHeaderClick?.();
  };

  // List of standard development card types
  const cardTypes = [
    {
      id: 'KNIGHT' as const,
      name: 'אביר (Knight)',
      shortName: 'אביר',
      desc: 'מזיז את השודד לאריח אחר',
      img: '/knite.png',
      count: devCards.KNIGHT || 0,
      playable: true,
    },
    {
      id: 'MONOPOLY' as const,
      name: 'מונופול (Monopoly)',
      shortName: 'מונופול',
      desc: 'מקבל את כל הקלפים ממשאב נבחר',
      img: '/monopoly.png',
      count: devCards.MONOPOLY || 0,
      playable: true,
    },
    {
      id: 'ROAD_BUILDING' as const,
      name: 'בניית כבישים (Road Building)',
      shortName: 'כבישים',
      desc: 'בונה 2 כבישים בחינם באופן מיידי',
      img: '/2_ways.png',
      count: devCards.ROAD_BUILDING || 0,
      playable: true,
    },
    {
      id: 'YEAR_OF_PLENTY' as const,
      name: 'שנת שפע (Year of Plenty)',
      shortName: 'שפע',
      desc: 'מקבל 2 משאבים חופשיים מהבנק',
      img: '/year_of_plenty.png',
      count: devCards.YEAR_OF_PLENTY || 0,
      playable: true,
    },
    {
      id: 'VICTORY_POINT' as const,
      name: 'קלף נקודת ניצחון (Victory Point)',
      shortName: 'נקודה',
      desc: 'מעניק 1 נקודת ניצחון אוטומטית',
      img: '/win1.png',
      count: devCards.VICTORY_POINT || 0,
      playable: selectedScenario === 'PIRATE_ISLANDS',
    },
  ];

  return (
    <div
      onClick={handlePanelClick}
      className={`bg-slate-900/90 border border-slate-700/30 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 select-none cursor-pointer ${
        effectiveCollapsed
          ? 'w-full h-auto p-2 overflow-hidden'
          : 'w-full h-full flex flex-col justify-between p-4 overflow-hidden'
      }`}
    >
      {effectiveCollapsed ? (
        /* ================== מצב מכווץ - אייקונים קטנים ================== */
        <div className="flex flex-col items-center gap-2.5 py-1 w-full animate-fade-in justify-center">
          {/* קודם נציג את תארי המשחק המכווצים */}
          <div className="flex flex-col gap-2 border-b border-slate-800/60 pb-2 mb-2 w-full items-center">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onTrophyClick?.('longest_road');
              }}
              className="relative flex items-center justify-center w-11 h-11 rounded-xl border bg-slate-950/60 p-1 group hover:scale-115 transition-all cursor-pointer"
              title={`הדרך הארוכה ביותר (Longest Road): ${longestRoadHolder ? longestRoadHolder.name : 'אין מחזיק'}`}
              style={{ borderColor: longestRoadHolder?.color || 'rgba(245,158,11,0.3)' }}
            >
              <img src="/badge_longest_road.png" alt="Road" className="w-8 h-8 object-contain" />
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                onTrophyClick?.('largest_army');
              }}
              className="relative flex items-center justify-center w-11 h-11 rounded-xl border bg-slate-950/60 p-1 group hover:scale-115 transition-all cursor-pointer"
              title={`הצבא הגדול ביותר (Largest Army): ${largestArmyHolder ? largestArmyHolder.name : 'אין מחזיק'}`}
              style={{ borderColor: largestArmyHolder?.color || 'rgba(168,85,247,0.3)' }}
            >
              <img src="/badge_largest_army.png" alt="Army" className="w-8 h-8 object-contain" />
            </div>
          </div>

          {/* רשימת קלפי הפיתוח כריבועים קטנים בדומה לקלפי המשאבים */}
          {cardTypes.map((card) => (
            <div
              key={card.id}
              onClick={(e) => {
                e.stopPropagation();
                onHeaderClick?.();
              }}
              className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-slate-700/30 bg-slate-900/60 p-0.5 group hover:scale-115 transition-all cursor-pointer overflow-hidden"
              title={`${card.name}: ${card.count}`}
            >
              {card.img ? <img src={card.img} alt={card.name} className="w-full h-full object-cover rounded-lg" /> : null}
              <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded bg-slate-950 border border-slate-750 text-purple-400 font-mono text-[9px] font-black shadow-md">
                {card.count}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ================== מצב מורחב - כרטיסים וערימה ================== */
        <div className="flex flex-col w-full h-full justify-between">
          <div>
            <>
              {/* כותרת הפאנל */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onHeaderClick?.();
                }}
                className="flex items-center justify-between pb-2 cursor-pointer group w-full border-b border-slate-800/60 mb-3"
              >
                <div className="flex items-center gap-2">
                  <CardIcon size={18} className="text-purple-400" />
                  <span className="text-slate-300 text-xs font-bold uppercase tracking-wider group-hover:text-white transition-colors">
                    קלפי פיתוח ותארים ({totalCards})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isOurTurn && (
                    <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 rounded text-[10px] font-extrabold animate-pulse">
                      התור שלך
                    </span>
                  )}
                </div>
              </div>

              {/* קלפי התארים (Trophies) */}
              <div className="grid grid-cols-2 gap-2 mb-2 border-b border-slate-800/60 pb-2.5">
                {/* Trophy 1: Longest Road */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrophyClick?.('longest_road');
                  }}
                  className="group/trophy relative overflow-hidden bg-slate-950/85 border border-slate-800/80 rounded-xl p-2 text-right cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-amber-500/50 transition-all duration-300 hover:-translate-x-1 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                >
                  <div className="flex flex-col gap-1 h-full justify-between relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-amber-500">הדרך הארוכה</span>
                      <span className="text-[9px] bg-amber-500/15 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black">
                        2 VP
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img
                        src="/badge_longest_road.png"
                        alt="Longest Road"
                        className="w-6 h-6 object-contain group-hover/trophy:scale-110 transition-transform duration-300"
                      />
                      <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-slate-400 font-bold">מחזיק:</span>
                        <span
                          className="text-[9px] font-black"
                          style={{ color: longestRoadHolder?.color || '#94a3b8' }}
                        >
                          {longestRoadHolder ? longestRoadHolder.name : 'אין מחזיק'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trophy 2: Largest Army */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onTrophyClick?.('largest_army');
                  }}
                  className="group/trophy relative overflow-hidden bg-slate-950/85 border border-slate-800/80 rounded-xl p-2 text-right cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-purple-500/50 transition-all duration-300 hover:-translate-x-1 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                >
                  <div className="flex flex-col gap-1 h-full justify-between relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-purple-400">הצבא הגדול</span>
                      <span className="text-[9px] bg-purple-500/15 border border-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-black">
                        2 VP
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img
                        src="/badge_largest_army.png"
                        alt="Largest Army"
                        className="w-6 h-6 object-contain group-hover/trophy:scale-110 transition-transform duration-300"
                      />
                      <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-slate-400 font-bold">מחזיק:</span>
                        <span
                          className="text-[9px] font-black"
                          style={{ color: largestArmyHolder?.color || '#94a3b8' }}
                        >
                          {largestArmyHolder ? largestArmyHolder.name : 'אין מחזיק'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          </div>

          {/* ערימת קלפי פיתוח חופפים עם אפקט מניפה ושליפה מודגש */}
          <div className="flex flex-col items-center justify-start h-[340px] w-full relative animate-fade-in pt-16 pb-8">
            {(() => {
              // Build dynamic cards list
              const cardsToRender: Array<{
                id: 'KNIGHT' | 'MONOPOLY' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY' | 'VICTORY_POINT';
                name: string;
                shortName: string;
                desc: string;
                img: string;
                count: number;
                playable: boolean;
                uniqueId: string;
              }> = [];

              cardTypes.forEach((card) => {
                if (card.id === 'VICTORY_POINT') {
                  if (card.count > 0) {
                    for (let i = 0; i < card.count; i++) {
                      cardsToRender.push({
                        ...card,
                        img: `/win${(i % 5) + 1}.png`,
                        count: 1,
                        uniqueId: `VICTORY_POINT-${i}`,
                      });
                    }
                  }
                } else {
                  if (card.count > 0) {
                    cardsToRender.push({
                      ...card,
                      uniqueId: card.id,
                    });
                  }
                }
              });

              // Separate and sort cards so VICTORY_POINT cards are at the top/center of the stack, not the bottom
              const vpCards = cardsToRender.filter(c => c.id === 'VICTORY_POINT');
              const otherCards = cardsToRender.filter(c => c.id !== 'VICTORY_POINT');
              const sortedCards = [...vpCards, ...otherCards];

              return sortedCards.map((card, idx) => {
                const total = sortedCards.length;
                const midIndex = (total - 1) / 2;
                const diff = idx - midIndex;

                // Base translation and rotation
                const rotateAngle = diff * 6; // graduated rotation angle
                const translateX = diff * 12; // horizontal spread
                const translateY = idx * 28 + Math.abs(diff) * 4; // gentle curved height

                const isHovered = hoveredIdx === idx;
                
                // When hovered, pull card upwards and outwards along its radial axis
                const currentTranslateY = isHovered ? translateY - 38 : translateY;
                const currentTranslateX = isHovered ? translateX + diff * 4 : translateX;
                const currentRotate = isHovered ? rotateAngle * 0.8 : rotateAngle;
                const currentScale = isHovered ? 1.08 : 1.0;

                return (
                  <div
                    key={card.uniqueId}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (card.playable && isOurTurn) {
                        handlePlayCard(card.id);
                      } else {
                        onHeaderClick?.();
                      }
                    }}
                    className="absolute flex flex-col items-center justify-between w-28 h-44 rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl transition-all duration-300 hover:shadow-purple-500/30 group cursor-pointer overflow-hidden"
                    style={{
                      zIndex: isHovered ? 100 : idx + 10,
                      transform: `translateY(${currentTranslateY}px) translateX(${currentTranslateX}px) rotate(${currentRotate}deg) scale(${currentScale})`,
                    }}
                  >
                    {/* תמונת הקלף האמיתית */}
                    {card.img ? (
                      <img
                        src={card.img}
                        alt={card.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none select-none"
                      />
                    ) : null}

                    {/* הצללה עליונה לקריאות המונה */}
                    <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

                    {/* מונה דיגיטלי זוהר בפינה הימנית העליונה */}
                    <div className="absolute top-2.5 right-2.5 flex items-center justify-center min-w-8 h-8 px-1.5 rounded-lg bg-slate-950/90 border border-purple-500/45 shadow-lg text-purple-400 font-mono text-sm font-black tracking-tight group-hover:border-purple-400 transition-all duration-300 z-10">
                      {card.count}
                    </div>

                    {/* הצללה תחתונה לקריאות התווית */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                    {/* תווית ומיתוג הקלף בתחתית */}
                    <div className="mt-auto w-full flex flex-col items-center pb-2 z-10 pointer-events-none">
                      <span className="text-xs tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-bold">
                        {card.shortName}
                      </span>
                      <span className="text-[7px] tracking-[0.2em] text-slate-300/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-extrabold mt-0.5">
                        DEVELOPMENT
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
