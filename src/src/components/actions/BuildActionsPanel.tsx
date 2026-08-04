import React from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useGame } from '../../context/GameContext';
import { getOpenShipsForPlayer } from '../../utils/gameEngine/getOpenShipsForPlayer';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { getPirateShippingPath } from '../../utils/gameEngine/pirateIslands';
import type { DevCardType } from '../../types/gameActions.types';
const RESOURCE_IMAGES = {
  WOOD: '/wood1.png',
  BRICK: '/brick1.png',
  SHEEP: '/wool1.png',
  WHEAT: '/wheat1.png',
  ORE: '/rock1.png',
};

export const BuildActionsPanel: React.FC = () => {
  const {
    currentPlayer,
    turnSubPhase,
    isCurrentPlayerBot,
    isSetupPhase,
    setupState,
    undoTurnActions,
    endTurn,
  } = useTurnManager();

  const { 
    players, 
    setPlayers,
    setVertices,
    setEdges,
    activeExpansion, 
    selectedScenario,
    currentAction,
    setCurrentAction,
    edges,
    vertices,
    currentTurnBuiltShips,
    hasMovedShipThisTurn,
    setSelectedShipIdToMove,
    tiles,
    roomId,
    myPlayerId,
    devCardDeck,
    buyDevelopmentCard,
    addLog,
  } = useGame();

  if (!currentPlayer) return null;

  const humanPlayer = (roomId
    ? players.find((p) => p.id === myPlayerId)
    : players.find((p) => !p.isBot) || players[0])!;

  // Helper to check if human player has a specific resource and count
  const checkHumanResource = (type: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', amount: number): boolean => {
    return (humanPlayer.resources[type] || 0) >= amount;
  };

  const isWrongOnlinePlayer = !!roomId && (!myPlayerId || currentPlayer.id !== myPlayerId);
  const isActionsDisabled = isCurrentPlayerBot || isWrongOnlinePlayer || turnSubPhase !== 'TRADE_AND_BUILD';
  const canBuyDevelopmentCard = !isActionsDisabled && devCardDeck.length > 0 &&
    checkHumanResource('ORE', 1) && checkHumanResource('SHEEP', 1) && checkHumanResource('WHEAT', 1);
  const pirateFortress = selectedScenario === 'PIRATE_ISLANDS'
    ? vertices.find(vertex => vertex.pirateFortress?.playerId === currentPlayer.id && !vertex.pirateFortress.conquered)
    : undefined;
  const pirateShippingPath = selectedScenario === 'PIRATE_ISLANDS'
    ? getPirateShippingPath(tiles, vertices, edges, currentPlayer.id)
    : null;
  const warshipCount = (pirateShippingPath || []).filter(edge => edge.isWarship).length;

  const attackPirateFortress = () => {
    if (!pirateFortress || isActionsDisabled) return;
    dispatchGameAction({ type: 'ATTACK_PIRATE_FORTRESS', playerId: currentPlayer.id, fortressVertexId: pirateFortress.id }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : currentPlayer.id,
      players,
      vertices,
      edges,
      selectedScenario,
      turnSubPhase,
      setVertices,
      setEdges,
      setPlayers,
      addLog,
      endTurn,
    });
  };

  const handleBuyDevelopmentCard = () => {
    const cardType = devCardDeck[0] as DevCardType | undefined;
    if (!cardType) return;
    dispatchGameAction({ type: 'BUY_DEV_CARD', playerId: currentPlayer.id, cardType }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : currentPlayer.id,
      buyDevelopmentCard,
    });
  };

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
      bg: '/ship.jpg',
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

  return (
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

          </>
        ) : (
          <>
            {buildItems
              .filter((item) => {
                if (item.id === 'ship') {
                  return activeExpansion === 'SEAFARERS';
                }
                if (item.id === 'devCard') {
                  return activeExpansion !== 'CITIES_AND_KNIGHTS';
                }
                return true;
              })
              .map((item) => {
                const isDevCardSpanned = activeExpansion === 'SEAFARERS' && item.id === 'devCard';
                const colSpanClass = isDevCardSpanned ? 'col-span-2' : 'col-span-1';
                return (
                  <div 
                    key={item.id}
                    className={`relative overflow-hidden bg-slate-900/90 border border-white/10 rounded-xl p-2.5 flex flex-col justify-between gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/20 ${colSpanClass} min-h-[148px]`}
                  >
                  <div className="flex flex-col gap-2 flex-grow justify-between">
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      {/* Framed Thumbnail on the side */}
                      <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-950/80 p-0.5 flex-shrink-0 flex items-center justify-center">
                        {item.bg ? <img src={item.bg} alt={item.name} className="w-full h-full object-contain" /> : null}
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
                        handleBuyDevelopmentCard();
                      }}
                      disabled={!canBuyDevelopmentCard}
                      className={`w-full py-1 px-2 rounded-lg font-extrabold text-[10px] tracking-wider transition-all duration-300 border border-transparent flex items-center justify-center gap-1.5 mt-1
                        ${!canBuyDevelopmentCard
                          ? 'bg-slate-900/60 text-slate-500 cursor-not-allowed opacity-50' 
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 active:scale-[0.97] shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 cursor-pointer'
                        }`}
                    >
                      <span>רכוש</span>
                    </button>
                  ) : (item.id === 'ship' || item.id === 'road') ? (
                    <div className="mt-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 text-center text-[9px] font-bold text-cyan-300">
                      לבנייה: בחר צלע חוקית בלוח
                    </div>
                  ) : (
                    <div className="h-6 mt-1" />
                  )}
                </div>
              );
            })}
            
            {pirateFortress && (
              <button
                onClick={attackPirateFortress}
                disabled={isActionsDisabled || !pirateShippingPath || warshipCount === 0}
                className={`col-span-2 w-full mt-2 py-3 px-4 rounded-xl font-extrabold text-xs border ${isActionsDisabled || !pirateShippingPath || warshipCount === 0 ? 'bg-slate-900/40 text-slate-500 border-slate-800 cursor-not-allowed' : 'bg-rose-700 hover:bg-rose-600 text-white border-rose-400 cursor-pointer'}`}
              >
                ⚔️ תקוף את מבצר הפיראטים — {pirateFortress.pirateFortress!.remainingTokens} אסימונים, {warshipCount} ספינות מלחמה
              </button>
            )}

            {/* כפתור הזזת ספינה פתוחה עבור הרחבת יורדי הים */}
            {activeExpansion === 'SEAFARERS' && selectedScenario !== 'PIRATE_ISLANDS' && (
              <button
                onClick={() => {
                  if (currentAction === 'MOVE_SHIP_SELECT' || currentAction === 'MOVE_SHIP_PLACE') {
                    setCurrentAction(null);
                    setSelectedShipIdToMove(null);
                  } else {
                    setCurrentAction('MOVE_SHIP_SELECT');
                  }
                }}
                disabled={isActionsDisabled || hasMovedShipThisTurn || getOpenShipsForPlayer(currentPlayer.id, edges, vertices, currentTurnBuiltShips, tiles || []).length === 0}
                className={`col-span-2 w-full mt-2 py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider transition-all duration-300 border border-transparent flex items-center justify-center gap-2
                  ${isActionsDisabled || hasMovedShipThisTurn || getOpenShipsForPlayer(currentPlayer.id, edges, vertices, currentTurnBuiltShips, tiles || []).length === 0
                    ? 'bg-slate-900/40 text-slate-500 cursor-not-allowed opacity-50 border-slate-800/40' 
                    : (currentAction === 'MOVE_SHIP_SELECT' || currentAction === 'MOVE_SHIP_PLACE')
                      ? 'bg-rose-600 hover:bg-rose-500 text-white hover:brightness-110 active:scale-[0.97] shadow-lg shadow-rose-600/10 hover:shadow-rose-600/25 cursor-pointer border-rose-500'
                      : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-[0.97] shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 cursor-pointer'
                  }`}
              >
                <span className="text-sm">⛵</span>
                <span>
                  {currentAction === 'MOVE_SHIP_SELECT' || currentAction === 'MOVE_SHIP_PLACE'
                    ? 'בטל הזזת ספינה'
                    : hasMovedShipThisTurn
                      ? 'הזזת כבר ספינה בתור זה'
                      : getOpenShipsForPlayer(currentPlayer.id, edges, vertices, currentTurnBuiltShips, tiles || []).length === 0
                        ? 'אין ספינות פתוחות להזזה'
                        : 'הזז ספינה פתוחה'
                  }
                </span>
              </button>
            )}

            {/* ד. כפתור ביטול פעולות - ממוקם ישירות מתחת לגריד הפעולות הראשי */}
            <button
              onClick={() => {
                console.log('[ActionSidebar] Undo Actions Button Clicked!');
                undoTurnActions();
              }}
              disabled={isActionsDisabled || Boolean(roomId)}
              className={`col-span-2 w-full mt-2 py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider transition-all duration-300 border border-transparent flex items-center justify-center gap-2
                ${isActionsDisabled || roomId
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
  );
};
