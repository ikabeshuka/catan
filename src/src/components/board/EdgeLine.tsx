import React, { useState } from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { HexTile } from '../../types/hex.types';
import { validateRoadPlacement } from '../../utils/validation/validateRoadPlacement';
import { validateShipPlacement } from '../../utils/validation/validateShipPlacement';
import { useGame } from '../../context/GameContext';
import { getOpenShipsForPlayer } from '../../utils/gameEngine/getOpenShipsForPlayer';
import { getCachedEdgeGeometry } from '../../utils/hexMath/boardRenderCache';
import { isSeafarersExpansion } from '../../config/gameRules';

interface EdgeLineProps {
  edge: BoardEdge;
  vertices: BoardVertex[];
  edges: BoardEdge[];
  players: Player[];
  currentPlayerIndex: number;
  setEdges: React.Dispatch<React.SetStateAction<BoardEdge[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  is3DMode: boolean;
  showBuildingCostToast: (type: 'ROAD' | 'SETTLEMENT' | 'CITY' | 'SHIP', success: boolean, isFree?: boolean, errorMessage?: string) => void;
  addLog: (message: string) => void;
  roadBuildingRemaining: number;
  onClick?: () => void;
  isSetupPhase?: boolean;
  setupState?: any;
  recordSetupPlacement?: (type: 'SETTLEMENT' | 'ROAD', elementId: string) => void;
  turnSubPhase?: any;
  tiles?: HexTile[];
}

const RESOURCE_COLORS_BLENDED: Record<string, string> = {
  WOOD: '#15803d',
  BRICK: '#dc2626',
  SHEEP: '#a3e635',
  WHEAT: '#eab308',
  ORE: '#64748b',
  DESERT: '#8b5a2b',
  WATER: '#1e3a8a',
  SEA: '#1e3a8a',
  GOLD_FIELD: '#f59e0b',
  FOG: '#334155',
};

const COAST_BASE_COLOR = '#dfbd73';

export const EdgeLine: React.FC<EdgeLineProps> = ({
  edge,
  vertices,
  edges,
  players,
  currentPlayerIndex,
  setEdges,
  setPlayers,
  is3DMode,
  showBuildingCostToast,
  addLog,
  roadBuildingRemaining,
  onClick,
  isSetupPhase: propIsSetupPhase,
  setupState: propSetupState,
  recordSetupPlacement: propRecordSetupPlacement,
  turnSubPhase: propTurnSubPhase,
  tiles,
}) => {
  const { 
    currentAction, 
    setCurrentAction, 
    selectedShipIdToMove, 
    setSelectedShipIdToMove, 
    setHasMovedShipThisTurn, 
    currentTurnBuiltShips,
    activeExpansion,
    gamePhase,
    boardRenderCache,
  } = useGame();
  const turnManager = useTurnManager();
  const isSetupPhase = propIsSetupPhase !== undefined ? propIsSetupPhase : turnManager.isSetupPhase;
  const setupState = propSetupState !== undefined ? propSetupState : turnManager.setupState;
  const recordSetupPlacement = propRecordSetupPlacement !== undefined ? propRecordSetupPlacement : turnManager.recordSetupPlacement;
  const turnSubPhase = propTurnSubPhase !== undefined ? propTurnSubPhase : turnManager.turnSubPhase;

  const edgeRenderData = boardRenderCache.edgeById.get(edge.id);
  const edgeGeometry = edgeRenderData || getCachedEdgeGeometry(edge.id);
  const { x1, y1, x2, y2 } = edgeGeometry;
  const mx = edgeGeometry.center2D.x;
  const my = edgeGeometry.center2D.y;
  const length = edgeGeometry.length2D;
  const angleDeg = edgeGeometry.angleDeg2D;

  const currentPlayer = players[currentPlayerIndex];

  const [showCoastPopup, setShowCoastPopup] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCoast = React.useMemo(() => {
    if (!tiles || tiles.length === 0) return false;
    return edgeRenderData?.isCoast || false;
  }, [edgeRenderData, tiles]);

  const { leftColor, rightColor } = React.useMemo(() => {
    if (!isCoast || !tiles || tiles.length === 0 || !edgeRenderData) {
      return { leftColor: '#1e3a8a', rightColor: '#1e3a8a' };
    }
    const borderingTiles = edgeRenderData.borderingTiles || [];
    let leftColor = '#1e3a8a';
    let rightColor = '#1e3a8a';
    const angleRad = (angleDeg * Math.PI) / 180;
    const edgeDirectionX = Math.cos(angleRad);
    const edgeDirectionY = Math.sin(angleRad);

    borderingTiles.forEach((tile) => {
      const tileGeometry = boardRenderCache.tileById.get(tile.id);
      const tilePosition = tileGeometry?.center2D;
      if (!tilePosition) return;

      const relativeX = tilePosition.x - mx;
      const relativeY = tilePosition.y - my;
      const isOnLeft = edgeDirectionX * relativeY - edgeDirectionY * relativeX >= 0;
      const tileColor = RESOURCE_COLORS_BLENDED[tile.type] || '#1e3a8a';

      if (isOnLeft) {
        leftColor = tileColor;
      } else {
        rightColor = tileColor;
      }
    });
    return { leftColor, rightColor };
  }, [isCoast, tiles, edgeRenderData, angleDeg, mx, my, boardRenderCache]);

  const isAdjacentToSetupSettlement = React.useMemo(() => {
    if (!isSetupPhase || !setupState?.lastSettlementVertexId) return false;
    const parts = edge.id.replace('e_v_', '').split('_v_');
    const v1Id = `v_${parts[0]}`;
    const v2Id = `v_${parts[1]}`;
    return v1Id === setupState.lastSettlementVertexId || v2Id === setupState.lastSettlementVertexId;
  }, [isSetupPhase, setupState?.lastSettlementVertexId, edge.id]);

  const bordersWater = React.useMemo(() => {
    if (!tiles || tiles.length === 0) return false;
    return edgeRenderData?.hasWater || false;
  }, [edgeRenderData, tiles]);

  // בדיקה האם הנתיב הזה חוקי לבנייה עבור השחקן שמשחק כרגע
  const isBlockedBySetup = isSetupPhase && setupState?.hasPlacedRoad;
  let isValidPlacement = false;

  if (isAdjacentToSetupSettlement && bordersWater) {
    const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
    const isValidShip = currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
    isValidPlacement = isValidRoad || isValidShip;
  } else if (currentAction === 'MOVE_SHIP_SELECT') {
    const openShips = getOpenShipsForPlayer(currentPlayer.id, edges, vertices, currentTurnBuiltShips, tiles);
    isValidPlacement = openShips.some(s => s.id === edge.id);
  } else if (currentAction === 'MOVE_SHIP_PLACE') {
    if (!edge.hasRoad && !edge.hasShip) {
      const edgesWithoutMovingShip = edges.map(e => 
        e.id === selectedShipIdToMove ? { ...e, hasShip: false, shipPlayerId: undefined } : e
      );
      isValidPlacement = validateShipPlacement(edge.id, currentPlayer.id, vertices, edgesWithoutMovingShip, tiles || [], gamePhase);
    }
  } else if (roadBuildingRemaining > 0 && isSeafarersExpansion(activeExpansion)) {
    const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
    const isValidShip = currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
    isValidPlacement = isValidRoad || isValidShip;
  } else if (isCoast) {
    const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
    const isValidShip = currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
    isValidPlacement = isValidRoad || isValidShip;
  } else if (isSeafarersExpansion(activeExpansion) && bordersWater && !isCoast) {
    isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase)
      : false;
  } else if (currentAction === 'BUILD_SHIP') {
    isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase)
      : false;
  } else {
    isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase)
      : false;
  }

  // בשלב ההקמה, נגביל את בחירת ה-Edge כך שחייב להתחבר פיזית במדויק ל-lastSettlementVertexId
  if (isValidPlacement && isSetupPhase && setupState?.lastSettlementVertexId) {
    const parts = edge.id.replace('e_v_', '').split('_v_');
    const v1Id = `v_${parts[0]}`;
    const v2Id = `v_${parts[1]}`;
    if (v1Id !== setupState.lastSettlementVertexId && v2Id !== setupState.lastSettlementVertexId) {
      isValidPlacement = false;
    }
  }

  const buildRoadOnEdge = () => {
    if (isSetupPhase) {
      setEdges(prevEdges => prevEdges.map(e => 
        e.id === edge.id 
          ? { ...e, hasRoad: true, playerId: currentPlayer.id } 
          : e
      ));
      recordSetupPlacement?.('ROAD', edge.id);
      showBuildingCostToast('ROAD', true, true);
      addLog(`שחקן ${currentPlayer.name} בנה כביש בשלב ההקמה (חינם).`);
      return;
    }

    const canBuildFreeRoadBeforeRoll = turnSubPhase === 'BEFORE_ROLL' && roadBuildingRemaining > 0;
    if (turnSubPhase !== 'TRADE_AND_BUILD' && !canBuildFreeRoadBeforeRoll) return;

    const isFreeRoad = roadBuildingRemaining > 0;
    const hasResources = isFreeRoad || (currentPlayer.resources.WOOD >= 1 && currentPlayer.resources.BRICK >= 1);

    showBuildingCostToast('ROAD', hasResources, isFreeRoad);

    if (!hasResources) {
      addLog(`אין לך מספיק משאבים לבניית כביש! נדרש: 1 עץ, 1 לבנה.`);
      return;
    }

    if (!isFreeRoad) {
      setPlayers(prev => prev.map(p => p.id === currentPlayer.id 
        ? {
            ...p,
            resources: {
              ...p.resources,
              WOOD: p.resources.WOOD - 1,
              BRICK: p.resources.BRICK - 1
            }
          }
        : p
      ));
    }

    setEdges(prevEdges => prevEdges.map(e => 
      e.id === edge.id 
        ? { ...e, hasRoad: true, playerId: currentPlayer.id } 
        : e
    ));

    addLog(`שחקן ${currentPlayer.name} בנה כביש! ${isFreeRoad ? '(חינם - קלף בניית כבישים)' : 'עלות: 1 עץ, 1 לבנה.'}`);
  };

  const buildShipOnEdge = () => {
    if (isSetupPhase) {
      setEdges(prevEdges => prevEdges.map(e => 
        e.id === edge.id 
          ? { ...e, hasShip: true, shipPlayerId: currentPlayer.id } 
          : e
      ));
      recordSetupPlacement?.('ROAD', edge.id);
      showBuildingCostToast('SHIP', true, true);
      addLog(`שחקן ${currentPlayer.name} בנה ספינה בשלב ההקמה (חינם).`);
      return;
    }

    const canBuildFreeShipBeforeRoll = turnSubPhase === 'BEFORE_ROLL' && roadBuildingRemaining > 0;
    if (turnSubPhase !== 'TRADE_AND_BUILD' && !canBuildFreeShipBeforeRoll) return;

    const isFreeShip = roadBuildingRemaining > 0 && isSeafarersExpansion(activeExpansion);
    const hasResources = isFreeShip || (currentPlayer.resources.WOOD >= 1 && currentPlayer.resources.SHEEP >= 1);
    showBuildingCostToast('SHIP', hasResources, isFreeShip);

    if (!hasResources) {
      addLog(`אין לך מספיק משאבים לבניית ספינה! נדרש: 1 עץ, 1 כבש.`);
      return;
    }

    if (!isFreeShip) {
      setPlayers(prev => prev.map(p => p.id === currentPlayer.id 
        ? {
            ...p,
            resources: {
              ...p.resources,
              WOOD: p.resources.WOOD - 1,
              SHEEP: p.resources.SHEEP - 1
            }
          }
        : p
      ));
    }

    setEdges(prevEdges => prevEdges.map(e => 
      e.id === edge.id 
        ? { ...e, hasShip: true, shipPlayerId: currentPlayer.id } 
        : e
    ));

    if (!isFreeShip) {
      setCurrentAction(null);
    }
    
    addLog(`השחקן ${currentPlayer.name} בנה ספינה! ${isFreeShip ? '(חינם - קלף בניית כבישים)' : 'עלות: 1 עץ, 1 כבש.'}`);
  };

  const handleEdgeClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (currentPlayer?.isBot) return;
    if (!isValidPlacement) return;

    if (currentAction === 'MOVE_SHIP_SELECT') {
      setSelectedShipIdToMove(edge.id);
      setCurrentAction('MOVE_SHIP_PLACE');
      addLog(`בחרת ספינה פתוחה להזזה. בחר כעת יעד חוקי.`);
      return;
    }

    if (currentAction === 'MOVE_SHIP_PLACE') {
      setEdges(prevEdges => prevEdges.map(e => {
        if (e.id === selectedShipIdToMove) {
          return { ...e, hasShip: false, shipPlayerId: undefined };
        }
        if (e.id === edge.id) {
          return { ...e, hasShip: true, shipPlayerId: currentPlayer.id };
        }
        return e;
      }));

      setHasMovedShipThisTurn(true);
      setSelectedShipIdToMove(null);
      setCurrentAction(null);
      addLog(`השחקן ${currentPlayer.name} הזיז ספינה פתוחה למיקום חדש!`);
      return;
    }

    if (isSetupPhase && !isCoast && bordersWater) {
      const isValid = currentPlayer && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValid) {
        buildShipOnEdge();
      }
      return;
    }

    if (isCoast) {
      setShowCoastPopup(true);
      return;
    }

    if (isSeafarersExpansion(activeExpansion) && bordersWater && !isCoast) {
      const isValid = currentPlayer && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValid) {
        buildShipOnEdge();
      }
      return;
    }

    if (roadBuildingRemaining > 0 && isSeafarersExpansion(activeExpansion)) {
      const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      const isValidShip = currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValidRoad && !isValidShip) {
        buildRoadOnEdge();
      } else if (isValidShip && !isValidRoad) {
        buildShipOnEdge();
      }
      return;
    }

    if (currentAction === 'BUILD_SHIP') {
      const isValid = currentPlayer && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValid) {
        buildShipOnEdge();
      }
    } else {
      const isValid = currentPlayer && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      if (isValid) {
        buildRoadOnEdge();
      }
    }
  };

  const isShipMode = currentAction === 'BUILD_SHIP' || currentAction === 'MOVE_SHIP_PLACE';

  // קביעת צבע הכביש: אם הוא בנוי - צבע השחקן שבנה. אם הוא חוקי לבנייה - צבע השחקן הנוכחי בחצי שקופות. אחר כך - כמעט שקוף.
  const builtPlayer = players.find(p => p.id === edge.playerId || p.id === edge.shipPlayerId || p.id === edge.bridgePlayerId);
  const playerColor = builtPlayer?.color || '#ff5722';
  
  const isBuilt = edge.hasRoad || edge.hasShip || Boolean(edge.bridgePlayerId);
  const isMovingThisShip = currentAction === 'MOVE_SHIP_PLACE' && selectedShipIdToMove === edge.id;
  const roadColor = isBuilt 
    ? (isMovingThisShip ? '#facc15' : playerColor)
    : (isValidPlacement ? (currentAction === 'MOVE_SHIP_PLACE' ? '#38bdf8' : `${currentPlayer?.color}80`) : '#1a237e1a');

  return (
    <g 
      className={isValidPlacement && !currentPlayer?.isBot ? 'cursor-pointer' : 'cursor-default'} 
      onClick={handleEdgeClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* 2D Coastal Edge Blending Strip */}
      {!is3DMode && isCoast && (
        <g>
          <defs>
            <linearGradient id={`grad-coast-${edge.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={rightColor} />
              <stop offset="33%" stopColor={COAST_BASE_COLOR} />
              <stop offset="66%" stopColor={COAST_BASE_COLOR} />
              <stop offset="100%" stopColor={leftColor} />
            </linearGradient>
          </defs>
          <g transform={`translate(${mx}, ${my}) rotate(${angleDeg})`}>
            <rect
              x={-length / 2 - 1}
              y={-10}
              width={length + 2}
              height={20}
              fill={`url(#grad-coast-${edge.id})`}
              rx={1.5}
              pointerEvents="none"
              opacity="0.85"
            />
          </g>
        </g>
      )}

      {/* קו עבה שקוף להקלת הלחיצה */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="transparent"
        strokeWidth="12"
        className={isValidPlacement && !currentPlayer?.isBot ? "hover:stroke-white/20 transition-colors duration-200" : ""}
        style={is3DMode ? { transform: 'translateZ(8px)', transformStyle: 'preserve-3d' } : undefined}
      />

      {/* צל עמוק מתחת לכביש בנוי */}
      {edge.hasRoad && is3DMode && !is3DMode && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#000000"
          strokeWidth="10"
          strokeLinecap="round"
          pointerEvents="none"
          style={{
            transform: 'translateZ(1px)',
            transformStyle: 'preserve-3d',
            opacity: 0.55,
            transition: 'all 0.3s ease'
          }}
        />
      )}

      {/* הכביש הוויזואלי */}
      {edge.hasRoad && !is3DMode && (
        <g>
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={playerColor}
            strokeWidth="8"
            strokeLinecap="round"
            pointerEvents="none"
          />
          <g transform={`translate(${mx}, ${my}) rotate(${angleDeg})`}>
            <svg
              x={-length / 2}
              y={-10}
              width={length}
              height={20}
              viewBox="0 0 50 100"
              preserveAspectRatio="none"
              style={{ overflow: 'hidden' }}
            >
              <image
                href="/road.png"
                x="0"
                y="0"
                width="100"
                height="100"
                preserveAspectRatio="none"
                style={{
                  pointerEvents: 'none',
                  filter: `url(#tint-road-${edge.playerId})`
                }}
              />
            </svg>
          </g>
        </g>
      )}

      {edge.bridgePlayerId && !is3DMode && (
        <g pointerEvents="none">
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0f172a" strokeWidth="12" strokeLinecap="round" />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={playerColor} strokeWidth="7" strokeLinecap="round" />
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f8fafc" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
        </g>
      )}

      {/* הספינה הוויזואלית */}
      {edge.hasShip && !is3DMode && (
        <g transform={`translate(${mx}, ${my}) rotate(${angleDeg})`} pointerEvents="none">
          {/* בסיס הספינה */}
          <path 
            d="M -15,-2 L 15,-2 L 10,6 L -10,6 Z" 
            fill={playerColor} 
            stroke="#ffffff" 
            strokeWidth="1" 
          />
          {/* תורן */}
          <line 
            x1="0" 
            y1="-2" 
            x2="0" 
            y2="-15" 
            stroke="#8B4513" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
          />
          {/* מפרש */}
          <path 
            d="M 0,-15 L 12,-4 L 0,-4 Z" 
            fill="#ffffff" 
            stroke={playerColor} 
            strokeWidth="1.5" 
          />
        </g>
      )}

      {!edge.hasRoad && !edge.hasShip && !is3DMode && (
        <>
          {isValidPlacement && isShipMode ? (
            <g transform={`translate(${mx}, ${my}) rotate(${angleDeg})`} pointerEvents="none" opacity="0.5">
              {/* בסיס הספינה */}
              <path 
                d="M -15,-2 L 15,-2 L 10,6 L -10,6 Z" 
                fill={currentPlayer?.color || '#ff5722'} 
                stroke="#ffffff" 
                strokeWidth="1" 
              />
              {/* תורן */}
              <line 
                x1="0" 
                y1="-2" 
                x2="0" 
                y2="-15" 
                stroke="#8B4513" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              {/* מפרש */}
              <path 
                d="M 0,-15 L 12,-4 L 0,-4 Z" 
                fill="#ffffff" 
                stroke={currentPlayer?.color || '#ff5722'} 
                strokeWidth="1.5" 
              />
            </g>
          ) : (
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={roadColor}
              strokeWidth="3"
              strokeDasharray={isValidPlacement ? '4 2' : 'none'} // קו מקווקו לרמז בנייה
              strokeLinecap="round"
              pointerEvents="none"
            />
          )}
        </>
      )}

      {showCoastPopup && (
        <foreignObject
          x={mx - 90}
          y={my - 50}
          width="180"
          height="100"
          style={{ overflow: 'visible', zIndex: 100 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-2xl flex flex-col gap-1.5 text-center" dir="rtl">
            <span className="text-[10px] text-slate-200 font-bold leading-tight">בחר מה לבנות בקו החוף:</span>
            <div className="flex gap-1 justify-center my-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isValid = currentPlayer && validateRoadPlacement(
                    edge.id,
                    currentPlayer.id,
                    vertices,
                    edges,
                    tiles,
                    gamePhase
                  );
                  if (!isValid) {
                    const errorMsg = "חוקי המשחק אוסרים על חיבור דרך ישירות לספינה ללא יישוב/עיר בצומת המקשרת!";
                    addLog(`❌ ${errorMsg}`);
                    showBuildingCostToast('ROAD', false, false, errorMsg);
                    setShowCoastPopup(false);
                    return;
                  }
                  buildRoadOnEdge();
                  setShowCoastPopup(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold px-2.5 py-1 rounded shadow cursor-pointer active:scale-95"
              >
                כביש 🛣️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const isValid = currentPlayer && validateShipPlacement(
                    edge.id,
                    currentPlayer.id,
                    vertices,
                    edges,
                    tiles || [],
                    gamePhase
                  );
                  if (!isValid) {
                    const errorMsg = "חוקי המשחק אוסרים על חיבור ספינה ישירות לדרך ללא יישוב/עיר בצומת המקשרת!";
                    addLog(`❌ ${errorMsg}`);
                    showBuildingCostToast('SHIP', false, false, errorMsg);
                    setShowCoastPopup(false);
                    return;
                  }
                  buildShipOnEdge();
                  setShowCoastPopup(false);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold px-2.5 py-1 rounded shadow cursor-pointer active:scale-95"
              >
                ספינה ⛵
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCoastPopup(false);
              }}
              className="text-[8px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ביטול
            </button>
          </div>
        </foreignObject>
      )}

      {edge.isHarbor && (
        <g transform={`translate(${mx}, ${my})`}>
          <circle r="15" fill="#0f3f73" stroke="#fbbf24" strokeWidth="2" />
          <circle r="11" fill="#0ea5e9" fillOpacity="0.32" stroke="#e0f2fe" strokeWidth="1" />
          <image href="/port.png" x="-13" y="-13" width="26" height="26" preserveAspectRatio="xMidYMid meet" />
          <text
            y="5"
            textAnchor="middle"
            fontSize="15"
            fontWeight="black"
            fill="#fbbf24"
            className="select-none pointer-events-none font-sans"
          >
            ⚓
          </text>
          <text y="24" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fef3c7" className="select-none pointer-events-none font-sans">
            {edge.harborType === 'GENERIC' ? '3:1' : '2:1'}
          </text>
        </g>
      )}

      {edge.lostTribeReward && !edge.lostTribeReward.collectedBy && !is3DMode && (
        <g transform={`translate(${mx}, ${my})`} pointerEvents="none">
          {edge.lostTribeReward.kind === 'DEV_CARD' ? (
            <>
              <rect x="-11" y="-16" width="22" height="32" rx="3" fill="#312e81" stroke="#ddd6fe" strokeWidth="2" />
              <rect x="-7" y="-11" width="14" height="22" rx="2" fill="#7c3aed" stroke="#c4b5fd" strokeWidth="1" />
              <text y="5" textAnchor="middle" fontSize="14" fontWeight="900" fill="#ffffff">✦</text>
            </>
          ) : edge.lostTribeReward.kind === 'HARBOR' ? (
            <>
              <circle r="15" fill="#075985" stroke="#fbbf24" strokeWidth="2" />
              <image href="/port.png" x="-13" y="-13" width="26" height="26" preserveAspectRatio="xMidYMid meet" />
              <text y="5" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fef3c7">⚓</text>
              <text y="25" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fef3c7">נמל</text>
            </>
          ) : (
            <>
              <circle r="12" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
              <text y="4" textAnchor="middle" fontSize="14" fontWeight="900" fill="#78350f">★</text>
            </>
          )}
        </g>
      )}

      {edge.camelCount && !is3DMode && (
        <g transform={`translate(${mx}, ${my})`} pointerEvents="none" className="drop-shadow-lg">
          <circle r="13" fill="#fef3c7" fillOpacity="0.9" stroke="#78350f" strokeWidth="1.5" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="17">🐪</text>
        </g>
      )}

      {isHovered && !is3DMode && (edge.hasRoad || edge.hasShip) && (
        <foreignObject
          x={mx - 35}
          y={my - 38}
          width="70"
          height="26"
          style={{ pointerEvents: 'none', overflow: 'visible', zIndex: 100 }}
        >
          <div className="bg-slate-900/90 border border-slate-700/85 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg text-center whitespace-nowrap animate-fade-in" dir="rtl">
            {edge.hasRoad ? 'דרך 🛣️' : 'ספינה ⛵'}
          </div>
        </foreignObject>
      )}
    </g>
  );
};
