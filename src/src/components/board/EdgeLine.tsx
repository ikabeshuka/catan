import React from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { parseEdgeId } from '../../utils/hexMath/parseEdgeId';
import { validateRoadPlacement } from '../../utils/validation/validateRoadPlacement';

interface EdgeLineProps {
  edge: BoardEdge;
  vertices: BoardVertex[];
  edges: BoardEdge[];
  players: Player[];
  currentPlayerIndex: number;
  setEdges: React.Dispatch<React.SetStateAction<BoardEdge[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  is3DMode: boolean;
  showBuildingCostToast: (type: 'ROAD' | 'SETTLEMENT' | 'CITY', success: boolean, isFree?: boolean) => void;
  addLog: (message: string) => void;
  roadBuildingRemaining: number;
  onClick?: () => void;
  isSetupPhase?: boolean;
  setupState?: any;
  recordSetupPlacement?: (type: 'SETTLEMENT' | 'ROAD', elementId: string) => void;
  turnSubPhase?: any;
}

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
}) => {
  const turnManager = (!onClick && propIsSetupPhase === undefined) ? useTurnManager() : null;
  const isSetupPhase = propIsSetupPhase !== undefined ? propIsSetupPhase : turnManager?.isSetupPhase;
  const setupState = propSetupState !== undefined ? propSetupState : turnManager?.setupState;
  const recordSetupPlacement = propRecordSetupPlacement !== undefined ? propRecordSetupPlacement : turnManager?.recordSetupPlacement;
  const turnSubPhase = propTurnSubPhase !== undefined ? propTurnSubPhase : turnManager?.turnSubPhase;

  const { x1, y1, x2, y2 } = parseEdgeId(edge.id);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  const currentPlayer = players[currentPlayerIndex];

  // בדיקה האם הנתיב הזה חוקי לבנייה עבור השחקן שמשחק כרגע
  const isBlockedBySetup = isSetupPhase && setupState.hasPlacedRoad;
  const isValidPlacement = currentPlayer && !isBlockedBySetup
    ? validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges)
    : false;

  const handleEdgeClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    // אם המהלך לא חוקי או שזה תור של בוט - נחסום את הלחיצה
    if (currentPlayer?.isBot) return;

    if (isSetupPhase) {
      if (!isValidPlacement) return;
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

    if (isValidPlacement) {
      if (turnSubPhase !== 'TRADE_AND_BUILD') return;

      const isFreeRoad = roadBuildingRemaining > 0;
      const hasResources = isFreeRoad || (currentPlayer.resources.WOOD >= 1 && currentPlayer.resources.BRICK >= 1);

      // תמיד נציג את העלות בכל לחיצה
      showBuildingCostToast('ROAD', hasResources, isFreeRoad);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לבניית כביש! נדרש: 1 עץ, 1 לבנה.`);
        return;
      }

      // הפחתת משאבים אם זה לא כביש חינם
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
    }
  };

  // קביעת צבע הכביש: אם הוא בנוי - צבע השחקן שבנה. אם הוא חוקי לבנייה - צבע השחקן הנוכחי בחצי שקופות. אחר כך - כמעט שקוף.
  const builtPlayer = players.find(p => p.id === edge.playerId);
  const playerColor = builtPlayer?.color || '#ff5722';
  const roadColor = edge.hasRoad 
    ? playerColor 
    : (isValidPlacement ? `${currentPlayer?.color}80` : '#1a237e1a');

  return (
    <g 
      className={isValidPlacement && !currentPlayer?.isBot ? 'cursor-pointer' : 'cursor-default'} 
      onClick={handleEdgeClick}
      style={{ transformStyle: 'preserve-3d' }}
    >
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
      {!edge.hasRoad && !is3DMode && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={roadColor}
          strokeWidth="3"
          strokeDasharray={isValidPlacement ? '4 2' : 'none'} // קו מקווקו לרמז בנייה
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}
    </g>
  );
};