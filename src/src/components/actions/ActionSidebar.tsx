import React, { useState, useEffect } from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useGame, getPlayerTotalVP } from '../../context/GameContext';
import { DiceButton } from './DiceButton';
import { SettlementIcon, RoadIcon } from '../common/Icons';
import { Player } from '../../types/player.types';

const RESOURCE_IMAGES = {
  WOOD: '/wood1.png',
  BRICK: '/brick1.png',
  SHEEP: '/wool1.png',
  WHEAT: '/wheat1.png',
  ORE: '/rock1.png',
};

export const ActionSidebar: React.FC = () => {
  const {
    currentPlayer,
    turnSubPhase,
    isCurrentPlayerBot,
    endTurn,
    isSetupPhase,
    setupState,
    buyDevelopmentCard,
    undoTurnActions,
  } = useTurnManager();

  const { 
    players, 
    goldCoins, 
    setGoldCoins, 
    setPlayers, 
    addLog, 
    activeExpansion, 
    isMovingWagon, 
    setIsMovingWagon, 
    longestRoadPlayerId, 
    largestArmyPlayerId,
    currentAction,
    setCurrentAction 
  } = useGame();

  const isActionsDisabled = isCurrentPlayerBot || turnSubPhase !== 'TRADE_AND_BUILD';

  const [goldTradesThisTurn, setGoldTradesThisTurn] = useState(0);
  const [showResourceSelect, setShowResourceSelect] = useState(false);

  useEffect(() => {
    setGoldTradesThisTurn(0);
    setShowResourceSelect(false);
  }, [currentPlayer?.id]);

  if (!currentPlayer) return null;

  const humanPlayer = players.find((p) => !p.isBot) || players[0];

  // Helper to check if human player has a specific resource and count
  const checkHumanResource = (type: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', amount: number): boolean => {
    return (humanPlayer.resources[type] || 0) >= amount;
  };

  // Wagon variables
  const wagonLevel = currentPlayer.wagonLevel || 1;
  const remainingPoints = currentPlayer.remainingMovementPoints !== undefined ? currentPlayer.remainingMovementPoints : 4;
  const maxPoints = wagonLevel === 1 ? 4 : wagonLevel === 2 ? 5 : 6;
  const wagonPosition = currentPlayer.wagonPosition || '';

  const handleToggleWagonMovement = () => {
    if (setIsMovingWagon) {
      setIsMovingWagon(!isMovingWagon);
    }
  };

  const canUpgradeWithResources = checkHumanResource('WOOD', 1) && checkHumanResource('ORE', 1) && wagonLevel < 3;
  const canUpgradeWithGold = (goldCoins[currentPlayer.id] || 0) >= 3 && wagonLevel < 3;

  const upgradeWagonWithResources = () => {
    if (!canUpgradeWithResources) return;
    setPlayers((prevPlayers: Player[]) => prevPlayers.map(p => {
      if (p.id === currentPlayer.id) {
        const nextLevel = (p.wagonLevel || 1) + 1;
        const nextMax = nextLevel === 2 ? 5 : 6;
        return {
          ...p,
          wagonLevel: nextLevel,
          resources: {
            ...p.resources,
            WOOD: p.resources.WOOD - 1,
            ORE: p.resources.ORE - 1
          },
          remainingMovementPoints: nextMax
        };
      }
      return p;
    }));
    addLog(`🚚 ${currentPlayer.name} שדרג/ה את עגלת המסחר לרמה ${wagonLevel + 1} באמצעות משאבים (1 עץ + 1 ברזל)!`);
  };

  const upgradeWagonWithGold = () => {
    if (!canUpgradeWithGold) return;
    setGoldCoins((prev: Record<string, number>) => ({
      ...prev,
      [currentPlayer.id]: (prev[currentPlayer.id] || 0) - 3
    }));
    setPlayers((prevPlayers: Player[]) => prevPlayers.map(p => {
      if (p.id === currentPlayer.id) {
        const nextLevel = (p.wagonLevel || 1) + 1;
        const nextMax = nextLevel === 2 ? 5 : 6;
        return {
          ...p,
          wagonLevel: nextLevel,
          remainingMovementPoints: nextMax
        };
      }
      return p;
    }));
    addLog(`🚚 ${currentPlayer.name} שדרג/ה את עגלת המסחר לרמה ${wagonLevel + 1} באמצעות 3 מטבעות זהב!`);
  };

  const showEndTurnButton =
    turnSubPhase === 'TRADE_AND_BUILD' ||
    (isSetupPhase && setupState.hasPlacedSettlement && setupState.hasPlacedRoad);

  const getGuideText = (): React.ReactNode => {
    if (isCurrentPlayerBot) {
      return <span>שחקן המחשב מקבל החלטות ומבצע מהלכים...</span>;
    }
    if (isSetupPhase) {
      const hasSettlement = setupState?.hasPlacedSettlement;
      const hasRoad = setupState?.hasPlacedRoad;

      if (!hasSettlement || !hasRoad) {
        return (
          <span className="flex flex-col gap-1.5 items-start mt-1">
            <span>שלב ההקמה: נא למקם על גבי הלוח:</span>
            <span className="flex gap-2 items-center text-[10px] text-slate-300">
              {!hasSettlement && (
                <span className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  <SettlementIcon size={12} className="text-amber-500" /> יישוב
                </span>
              )}
              {!hasRoad && (
                <span className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  <RoadIcon size={12} className="text-emerald-500" /> כביש
                </span>
              )}
            </span>
          </span>
        );
      }
      return <span>כל הכבוד! נא ללחוץ על "סיום תור" כדי להמשיך</span>;
    }
    switch (turnSubPhase) {
      case 'BEFORE_ROLL':
        return <span>נא לזרוק קוביות</span>;
      case 'TRADE_AND_BUILD':
        return <span>שלב נוכחי: מסחר ובנייה</span>;
      case 'ROBBER_PLACEMENT':
        return <span>שלב השודד: נא להציב את השודד באריח אחר על הלוח</span>;
      default:
        return <span>נא לבצע את הפעולה הבאה</span>;
    }
  };

  // Build items cost structures
  const buildItems = [
    {
      id: 'road',
      name: 'כביש (Road)',
      bg: '/road.png',
      description: 'סלול דרך לחיבור שטחים והשגת הדרך הארוכה ביותר.',
      costs: [
        { type: 'WOOD' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.WOOD} className="w-5 h-5 object-contain" alt="עץ" /> },
        { type: 'BRICK' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.BRICK} className="w-5 h-5 object-contain" alt="לבנה" /> },
      ],
    },
    {
      id: 'settlement',
      name: 'יישוב (Settlement)',
      bg: '/settlement.png',
      description: 'הקם יישוב חדש להרחבת הייצור והשגת נקודת ניצחון.',
      costs: [
        { type: 'WOOD' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.WOOD} className="w-5 h-5 object-contain" alt="עץ" /> },
        { type: 'BRICK' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.BRICK} className="w-5 h-5 object-contain" alt="לבנה" /> },
        { type: 'SHEEP' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.SHEEP} className="w-5 h-5 object-contain" alt="כבש" /> },
        { type: 'WHEAT' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.WHEAT} className="w-5 h-5 object-contain" alt="חיטה" /> },
      ],
    },
    {
      id: 'city',
      name: 'עיר (City)',
      bg: '/city.png',
      description: 'שדרג יישוב קיים לעיר כדי להכפיל את תפוקת המשאבים.',
      costs: [
        { type: 'ORE' as const, amount: 3, icon: <img src={RESOURCE_IMAGES.ORE} className="w-5 h-5 object-contain" alt="ברזל" /> },
        { type: 'WHEAT' as const, amount: 2, icon: <img src={RESOURCE_IMAGES.WHEAT} className="w-5 h-5 object-contain" alt="חיטה" /> },
      ],
    },
    {
      id: 'ship',
      name: 'ספינה (Ship)',
      bg: '/ship.png',
      description: 'בנה ספינה לאורך נתיבי המים כדי לחבר איים ולסחור.',
      costs: [
        { type: 'WOOD' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.WOOD} className="w-5 h-5 object-contain" alt="עץ" /> },
        { type: 'SHEEP' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.SHEEP} className="w-5 h-5 object-contain" alt="כבש" /> },
      ],
    },
    {
      id: 'devCard',
      name: 'קלף פיתוח (Dev Card)',
      bg: '/card_knight.png',
      description: 'רכוש קלף פיתוח לקבלת אבירים, התקדמויות או נקודות.',
      costs: [
        { type: 'ORE' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.ORE} className="w-5 h-5 object-contain" alt="ברזל" /> },
        { type: 'SHEEP' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.SHEEP} className="w-5 h-5 object-contain" alt="כבש" /> },
        { type: 'WHEAT' as const, amount: 1, icon: <img src={RESOURCE_IMAGES.WHEAT} className="w-5 h-5 object-contain" alt="חיטה" /> },
      ],
    },
  ];

  const activePlayerVP = getPlayerTotalVP(currentPlayer, longestRoadPlayerId, largestArmyPlayerId, true);

  return (
    <div className="h-full flex flex-col gap-2.5 bg-slate-950 p-1 text-white text-right" dir="rtl">
      
      {/* א. שם השחקן הנוכחי וב. תצוגת נקודות הניצחון */}
      <div 
        className="relative overflow-hidden bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col gap-3" 
      >
        <div className="flex items-center gap-2">
          {/* עיגול צבע מזהה שחקן נוכחי */}
          <span 
            className="w-3 h-3 rounded-full inline-block shadow border border-white/20" 
            style={{ backgroundColor: currentPlayer.color }} 
          />
          <h2 className="font-serif text-sm font-extrabold text-slate-100 tracking-wide">
            התור של {currentPlayer.name} {isCurrentPlayerBot && '(מחשב)'}
          </h2>
        </div>

        {/* תצוגת נקודות הניצחון (Victory Points) מיד מתחת לשמו */}
        <div className="flex items-center justify-between bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/40">
          <span className="text-[11px] text-slate-400 font-bold">נקודות ניצחון (Victory Points)</span>
          <span className="text-sm font-black text-amber-400 font-mono">🏆 {activePlayerVP}</span>
        </div>

        <p className="font-sans text-[11px] text-slate-400 font-medium leading-relaxed border-t border-slate-800/50 pt-2">
          {getGuideText()}
        </p>
      </div>

      {/* אזור פעולת הקוביות */}
      <DiceButton />

      {/* כפתור סיום תור */}
      <div className="w-full">
        <button
          onClick={endTurn}
          disabled={!showEndTurnButton || isCurrentPlayerBot}
          className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs tracking-wide shadow-lg transition-all duration-300 border
            ${(showEndTurnButton && !isCurrentPlayerBot)
              ? 'bg-emerald-700 text-white hover:bg-emerald-600 border-emerald-600 shadow-emerald-700/20 cursor-pointer animate-gentle-pulse'
              : 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed opacity-50'
            }`}
        >
          {isCurrentPlayerBot ? 'הבוט חושב...' : 'סיום תור ➔'}
        </button>
      </div>

      {/* פאנל זהב מיוחד עבור הרחבת סוחרים וברברים */}
      {activeExpansion === 'MERCHANTS_AND_BARBARIANS' && (
        <div className="relative overflow-hidden bg-slate-900/90 p-3 rounded-2xl border border-amber-500/30 shadow-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">🪙</span>
              <span className="text-xs font-bold text-amber-400">יתרת מטבעות זהב:</span>
            </div>
            <span className="text-lg font-black font-mono text-amber-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
              {goldCoins[currentPlayer.id] || 0}
            </span>
          </div>

          {/* כפתור החלפה */}
          {!currentPlayer.isBot && turnSubPhase === 'TRADE_AND_BUILD' && (
            <div className="flex flex-col gap-2 mt-1">
              {!showResourceSelect ? (
                <button
                  disabled={(goldCoins[currentPlayer.id] || 0) < 2 || goldTradesThisTurn >= 2}
                  onClick={() => setShowResourceSelect(true)}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] transition-all duration-200 border cursor-pointer
                    ${((goldCoins[currentPlayer.id] || 0) >= 2 && goldTradesThisTurn < 2)
                      ? 'bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 border-amber-400 hover:brightness-110 active:scale-[0.98]'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed'
                    }`}
                >
                  {goldTradesThisTurn >= 2 
                    ? 'השתמשת במכסת ההחלפות לתור זה (2/2)' 
                    : (goldCoins[currentPlayer.id] || 0) < 2
                      ? 'החלפת 2 זהב במשאב (נדרש לפחות 2 זהב)'
                      : `החלפת 2 זהב במשאב (${goldTradesThisTurn}/2 החלפות)`
                  }
                </button>
              ) : (
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <span className="text-[10px] text-slate-400 font-bold block text-center">בחר משאב לקבל תמורת 2 זהב:</span>
                  <div className="grid grid-cols-5 gap-1">
                    {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).map((res) => {
                      const labelsHE = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };
                      return (
                        <button
                          key={res}
                          onClick={() => {
                            // Deduct 2 gold and add 1 resource
                            setGoldCoins((prev: Record<string, number>) => ({
                              ...prev,
                              [currentPlayer.id]: (prev[currentPlayer.id] || 0) - 2
                            }));
                            setPlayers((prevPlayers: Player[]) => prevPlayers.map(p => {
                              if (p.id === currentPlayer.id) {
                                return {
                                  ...p,
                                  resources: {
                                    ...p.resources,
                                    [res]: (p.resources[res] || 0) + 1
                                  }
                                };
                              }
                              return p;
                            }));
                            addLog(`🪙 ${currentPlayer.name} החליף/ה 2 זהב עבור 1 ${labelsHE[res]}.`);
                            setGoldTradesThisTurn(prev => prev + 1);
                            setShowResourceSelect(false);
                          }}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                        >
                          <img src={RESOURCE_IMAGES[res]} className="w-6 h-6 object-contain" alt={labelsHE[res]} />
                          <span className="text-[9px] font-bold text-slate-300">{labelsHE[res]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setShowResourceSelect(false)}
                    className="w-full py-1 text-[9px] font-bold text-rose-400 bg-slate-900 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                  >
                    ביטול
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* פאנל עגלת המסחר */}
      {activeExpansion === 'MERCHANTS_AND_BARBARIANS' && (
        <div className="relative overflow-hidden bg-slate-900/90 p-3 rounded-2xl border border-blue-500/30 shadow-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">🚚</span>
              <span className="text-xs font-bold text-blue-400">עגלת המסחר (Baggage Train):</span>
            </div>
            <span className="text-xs font-black bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300">
              רמה {wagonLevel}/3
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-300 bg-slate-950/50 p-2 rounded-xl border border-slate-800/40">
            <div>
              <span className="text-slate-400 block text-[9px]">מיקום נוכחי:</span>
              <span className="font-mono text-slate-200 truncate block max-w-full" title={wagonPosition}>
                {wagonPosition ? wagonPosition.replace('v_', '') : 'לא נקבע'}
              </span>
            </div>
            <div className="text-left">
              <span className="text-slate-400 block text-[9px]">נקודות תנועה:</span>
              <span className="text-amber-400 font-mono text-xs">
                {remainingPoints} / {maxPoints}
              </span>
            </div>
          </div>

          {!currentPlayer.isBot && turnSubPhase === 'TRADE_AND_BUILD' && (
            <div className="flex flex-col gap-2">
              {/* כפתור הנעת עגלה */}
              <button
                onClick={handleToggleWagonMovement}
                className={`w-full py-2 px-3 rounded-xl font-black text-xs transition-all duration-200 border cursor-pointer flex items-center justify-center gap-1.5
                  ${isMovingWagon
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-[0.98]'
                    : 'bg-slate-950 text-blue-400 border-blue-900/60 hover:bg-blue-950/20 active:scale-[0.98]'
                  }`}
              >
                <span>{isMovingWagon ? '🛑 בטל מצב תנועה' : '🚚 הנע עגלה'}</span>
              </button>

              {/* כפתורי שדרוג עגלה */}
              {wagonLevel < 3 ? (
                <div className="flex flex-col gap-1.5 border-t border-slate-800/60 pt-2.5">
                  <span className="text-[10px] text-slate-400 font-bold block text-center mb-0.5">שדרג עגלה לרמה {wagonLevel + 1}:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* שדרוג באמצעות משאבים */}
                    <button
                      disabled={!canUpgradeWithResources}
                      onClick={upgradeWagonWithResources}
                      className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition-all duration-200 border cursor-pointer flex flex-col items-center justify-center gap-1
                        ${canUpgradeWithResources
                          ? 'bg-slate-950 text-emerald-400 border-emerald-900 hover:bg-emerald-950/20 active:scale-[0.97]'
                          : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
                        }`}
                    >
                      <span className="leading-none">שדרוג משאבים</span>
                      <span className="text-[8px] opacity-75 font-normal">(1 ברזל + 1 עץ)</span>
                    </button>

                    {/* שדרוג באמצעות זהב */}
                    <button
                      disabled={!canUpgradeWithGold}
                      onClick={upgradeWagonWithGold}
                      className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition-all duration-200 border cursor-pointer flex flex-col items-center justify-center gap-1
                        ${canUpgradeWithGold
                          ? 'bg-slate-950 text-amber-400 border-amber-900 hover:bg-amber-950/20 active:scale-[0.97]'
                          : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
                        }`}
                    >
                      <span className="leading-none">שדרוג זהב</span>
                      <span className="text-[8px] opacity-75 font-normal">(3 זהב)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-emerald-500 font-bold text-center border-t border-slate-800/60 pt-2">
                  ⭐ עגלת המסחר ברמה המקסימלית!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. פאנל "הצעות לבנייה" וסטטוס בנייה גרפי עשיר */}
      <div className="bg-slate-900/90 border border-slate-800/85 rounded-2xl p-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.45)]">
        <span className="font-extrabold text-amber-500 text-[11px] uppercase tracking-wider block border-b border-slate-800 pb-2 mb-2.5">
          {isSetupPhase ? 'משימות שלב ההקמה' : 'הצעות לבנייה ועלויות'}
        </span>
        
        <div className="grid grid-cols-2 gap-2">
          {isSetupPhase ? (
            <>
              {/* כרטיס יישוב בשלב ההקמה */}
              <div 
                className={`relative overflow-hidden bg-slate-900/90 border rounded-xl p-2.5 flex flex-col gap-2 transition-all duration-300
                  ${!setupState.hasPlacedSettlement 
                    ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40' 
                    : 'border-emerald-500/30 opacity-60 bg-slate-950/40'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-950/80 p-0.5 flex-shrink-0 flex items-center justify-center">
                    <img src="/settlement.png" alt="יישוב" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-xs font-black block text-slate-100">
                      {!setupState.hasPlacedSettlement ? 'יישוב 🏠' : 'יישוב ✓ 🏠'}
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium leading-normal">
                      מקם את יישוב הפתיחה שלך.
                    </p>
                  </div>
                </div>
              </div>

              {/* כרטיס כביש בשלב ההקמה */}
              <div 
                className={`relative overflow-hidden bg-slate-900/90 border rounded-xl p-2.5 flex flex-col gap-2 transition-all duration-300
                  ${!setupState.hasPlacedRoad 
                    ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40' 
                    : 'border-emerald-500/30 opacity-60 bg-slate-950/40'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-950/80 p-0.5 flex-shrink-0 flex items-center justify-center">
                    <img src="/road.png" alt="כביש" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-xs font-black block text-slate-100">
                      {!setupState.hasPlacedRoad ? 'כביש 🛣️' : 'כביש ✓ 🛣️'}
                    </span>
                    <p className="text-[10px] text-slate-400 font-medium leading-normal">
                      סלול כביש פתיחה מחובר.
                    </p>
                  </div>
                </div>
              </div>

              {/* כפתור סיום תור בולט ומעוצב ישירות בכרטיסי הבנייה */}
              {setupState.hasPlacedSettlement && setupState.hasPlacedRoad && (
                <button
                  onClick={endTurn}
                  className="col-span-2 w-full mt-1.5 py-3 px-4 rounded-xl font-extrabold text-xs tracking-wide bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-emerald-500/20 cursor-pointer text-center animate-bounce duration-1000"
                >
                  סיום תור והמשך ➔
                </button>
              )}
            </>
          ) : (
            <>
              {buildItems.map((item) => {
                const isHybrid = item.id === 'ship' || item.id === 'devCard';
                const isActiveAction = 
                  (item.id === 'ship' && currentAction === 'BUILD_SHIP') ||
                  (item.id === 'road' && currentAction === 'BUILD_ROAD');
                return (
                  <div 
                    key={item.id}
                    className={`relative overflow-hidden bg-slate-900/90 border rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/20 ${
                      isHybrid ? 'col-span-2 min-h-[120px]' : 'min-h-[148px]'
                    } ${
                      isActiveAction 
                        ? 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.55)] ring-1 ring-cyan-500/40 animate-pulse' 
                        : 'border-white/10'
                    }`}
                  >
                    {isActiveAction && (
                      <div className="absolute top-1 left-1 bg-cyan-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow animate-bounce z-20">
                        בחר מיקום בלוח... {item.id === 'ship' ? '🌊' : '🛣️'}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 flex-grow justify-between">
                      <div className="flex items-start justify-between gap-3 relative z-10">
                        {/* Framed Thumbnail on the side */}
                        <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-950/80 p-0.5 flex-shrink-0 flex items-center justify-center">
                          <img src={item.bg} alt={item.name} className="w-full h-full object-contain" />
                        </div>

                        {/* Card Info and Instruction */}
                        <div className="flex-1 flex flex-col gap-0.5 text-right">
                          <span className="text-[11px] font-black text-slate-100">{item.name}</span>
                          <p className="text-[9px] text-slate-400 font-medium leading-tight">{item.description}</p>
                        </div>
                      </div>

                      {/* Resource costs with V / X above resource icons */}
                      <div className="flex items-center justify-end gap-1.5 border-t border-slate-800/60 pt-2 relative z-10">
                        <span className="text-[9px] text-slate-400 ml-auto font-bold">עלות:</span>
                        {item.costs.map((cost, idx) => {
                          const hasStock = checkHumanResource(cost.type, cost.amount);
                          return (
                            <div key={idx} className="flex flex-col items-center gap-0.5 bg-slate-950/60 border border-slate-800 p-0.5 rounded-lg min-w-[32px] justify-center">
                              {/* V / X Stock Indicator ABOVE the resource */}
                              <span className={`text-[9px] font-black leading-none ${hasStock ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {hasStock ? '✓' : '✗'}
                              </span>
                              <div className="w-4 h-4">{cost.icon}</div>
                              <span className="text-[8px] font-sans text-slate-300 font-bold mt-0.5">
                                x{cost.amount}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {item.id === 'devCard' ? (
                      <button
                        onClick={() => {
                          console.log('[ActionSidebar] Buy Dev Card Button Clicked!');
                          buyDevelopmentCard();
                        }}
                        disabled={isCurrentPlayerBot || turnSubPhase !== 'TRADE_AND_BUILD'}
                        className={`w-full py-1 px-2 rounded-lg font-extrabold text-[10px] tracking-wider transition-all duration-300 border border-transparent flex items-center justify-center gap-1.5 mt-1
                          ${(isCurrentPlayerBot || turnSubPhase !== 'TRADE_AND_BUILD')
                            ? 'bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-50' 
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 active:scale-[0.97] shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 cursor-pointer'
                          }`}
                      >
                        <span>רכוש</span>
                      </button>
                    ) : (item.id === 'ship' || item.id === 'road') ? (
                      <button
                        onClick={() => {
                          const action = item.id === 'ship' ? 'BUILD_SHIP' : 'BUILD_ROAD';
                          setCurrentAction(prev => prev === action ? null : action);
                        }}
                        disabled={isCurrentPlayerBot || turnSubPhase !== 'TRADE_AND_BUILD'}
                        className={`w-full py-1 px-2 rounded-lg font-extrabold text-[10px] tracking-wider transition-all duration-300 border border-transparent flex items-center justify-center gap-1.5 mt-1
                          ${(isCurrentPlayerBot || turnSubPhase !== 'TRADE_AND_BUILD')
                            ? 'bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-50' 
                            : currentAction === (item.id === 'ship' ? 'BUILD_SHIP' : 'BUILD_ROAD')
                              ? 'bg-rose-600 text-white hover:bg-rose-500 active:scale-[0.97] cursor-pointer shadow-md'
                              : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:brightness-110 active:scale-[0.97] shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 cursor-pointer'
                          }`}
                      >
                        <span>
                          {currentAction === (item.id === 'ship' ? 'BUILD_SHIP' : 'BUILD_ROAD')
                            ? 'בטל בנייה'
                            : item.id === 'ship' ? 'בנה ספינה' : 'בנה כביש'
                          }
                        </span>
                      </button>
                    ) : (
                      <div className="h-6 mt-1" />
                    )}
                  </div>
                );
              })}
              
              {/* ד. כפתור ביטול פעולות - ממוקם ישירות מתחת לגריד הפעולות הראשי */}
              <button
                onClick={() => {
                  console.log('[ActionSidebar] Undo Actions Button Clicked!');
                  undoTurnActions();
                }}
                disabled={isActionsDisabled}
                className={`col-span-2 w-full mt-2 py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider transition-all duration-300 border border-transparent flex items-center justify-center gap-2
                  ${isActionsDisabled 
                    ? 'bg-slate-900/40 text-slate-500 cursor-not-allowed opacity-50 border-slate-800/40' 
                    : 'bg-rose-600 hover:bg-rose-500 text-white hover:brightness-110 active:scale-[0.97] shadow-lg shadow-rose-600/10 hover:shadow-rose-600/25 cursor-pointer border-rose-500'
                  }`}
              >
                <span className="text-sm">🔄</span>
                <span>בטל פעולות בתור</span>
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );
};
