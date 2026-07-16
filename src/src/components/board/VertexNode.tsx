import React, { useState } from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { parseVertexId } from '../../utils/hexMath/parseVertexId';
import { validateSettlementPlacement } from '../../utils/validation/validateSettlementPlacement';

interface VertexNodeProps {
  vertex: BoardVertex;
  vertices: BoardVertex[];
  edges: BoardEdge[];
  players: Player[];
  currentPlayerIndex: number;
  gamePhase: any;
  setVertices: React.Dispatch<React.SetStateAction<BoardVertex[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  is3DMode: boolean;
  showBuildingCostToast: (type: 'ROAD' | 'SETTLEMENT' | 'CITY', success: boolean, isFree?: boolean) => void;
  addLog: (message: string) => void;
  setActivePortTrade: (vertex: BoardVertex | null) => void;
  onClick?: () => void;
  isSetupPhase?: boolean;
  setupState?: any;
  recordSetupPlacement?: (type: 'SETTLEMENT' | 'ROAD', elementId: string) => void;
  turnSubPhase?: any;
}

export const VertexNode: React.FC<VertexNodeProps> = ({
  vertex,
  vertices,
  edges,
  players,
  currentPlayerIndex,
  gamePhase,
  setVertices,
  setPlayers,
  is3DMode,
  showBuildingCostToast,
  addLog,
  setActivePortTrade,
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

  const [isHovered, setIsHovered] = useState(false);
  
  const { x, y } = parseVertexId(vertex.id);
  const currentPlayer = players[currentPlayerIndex];

  // בדיקת חוקיות לבניית יישוב
  const isBlockedBySetup = isSetupPhase && setupState.hasPlacedSettlement;
  const isValidPlacement = currentPlayer && !isBlockedBySetup
    ? validateSettlementPlacement(vertex.id, currentPlayer.id, gamePhase, vertices, edges)
    : false;

  // בדיקת חוקיות לשדרוג לעיר
  const isOwnSettlement = vertex.structure === 'SETTLEMENT' && vertex.playerId === currentPlayer?.id;
  const canUpgradeToCity = currentPlayer && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD' && isOwnSettlement;

  const handleVertexClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (currentPlayer?.isBot) return;

    // אם זה נמל ששייך לשחקן הנוכחי, ובשלב מסחר ובנייה, נפתח את ממשק המסחר של הנמל
    const isOwnedHarbor = vertex.isHarbor && vertex.playerId === currentPlayer?.id;
    if (isOwnedHarbor && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD') {
      setActivePortTrade(vertex);
      return;
    }

    // במקרה של שלב ההקמה
    if (isSetupPhase) {
      if (!isValidPlacement) return;
      setVertices(prevVertices => prevVertices.map(v => 
        v.id === vertex.id 
          ? { ...v, structure: 'SETTLEMENT', playerId: currentPlayer.id } 
          : v
      ));
      recordSetupPlacement?.('SETTLEMENT', vertex.id);
      showBuildingCostToast('SETTLEMENT', true, true);
      addLog(`שחקן ${currentPlayer.name} בנה יישוב בשלב ההקמה (חינם).`);
      return;
    }

    // במקרה של שדרוג לעיר
    if (canUpgradeToCity) {
      const hasResources = currentPlayer.resources.WHEAT >= 2 && currentPlayer.resources.ORE >= 3;
      
      // תמיד נציג את העלות בכל לחיצה
      showBuildingCostToast('CITY', hasResources);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לשדרוג לעיר! נדרש: 3 ברזל, 2 חיטה.`);
        return;
      }

      // הפחתת משאבים והוספת נקודת ניצחון
      setPlayers(prev => prev.map(p => p.id === currentPlayer.id 
        ? {
            ...p,
            victoryPoints: p.victoryPoints + 1,
            resources: {
              ...p.resources,
              WHEAT: p.resources.WHEAT - 2,
              ORE: p.resources.ORE - 3
            }
          }
        : p
      ));

      setVertices(prevVertices => prevVertices.map(v => 
        v.id === vertex.id 
          ? { ...v, structure: 'CITY' } 
          : v
      ));

      addLog(`שחקן ${currentPlayer.name} שדרג יישוב לעיר! עלות: 3 ברזל, 2 חיטה.`);
      return;
    }

    // במקרה של בניית יישוב רגיל
    if (isValidPlacement) {
      if (turnSubPhase !== 'TRADE_AND_BUILD') return;

      const hasResources = currentPlayer.resources.WOOD >= 1 && 
                           currentPlayer.resources.BRICK >= 1 && 
                           currentPlayer.resources.SHEEP >= 1 && 
                           currentPlayer.resources.WHEAT >= 1;

      // תמיד נציג את העלות בכל לחיצה
      showBuildingCostToast('SETTLEMENT', hasResources);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לבניית יישוב! נדרש: 1 עץ, 1 לבנה, 1 כבש, 1 חיטה.`);
        return;
      }

      // הפחתת משאבים והוספת נקודת ניצחון
      setPlayers(prev => prev.map(p => p.id === currentPlayer.id 
        ? {
            ...p,
            victoryPoints: p.victoryPoints + 1,
            resources: {
              ...p.resources,
              WOOD: p.resources.WOOD - 1,
              BRICK: p.resources.BRICK - 1,
              SHEEP: p.resources.SHEEP - 1,
              WHEAT: p.resources.WHEAT - 1
            }
          }
        : p
      ));

      setVertices(prevVertices => prevVertices.map(v => 
        v.id === vertex.id 
          ? { ...v, structure: 'SETTLEMENT', playerId: currentPlayer.id } 
          : v
      ));

      addLog(`שחקן ${currentPlayer.name} בנה יישוב! עלות: 1 עץ, 1 לבנה, 1 כבש, 1 חיטה.`);
      return;
    }
  };

  const isOwnedHarbor = vertex.isHarbor && vertex.playerId === currentPlayer?.id;
  const isClickable = ((isValidPlacement || canUpgradeToCity) || (isOwnedHarbor && turnSubPhase === 'TRADE_AND_BUILD')) && !currentPlayer?.isBot;

  const getHarborTooltipText = (type?: string) => {
    switch (type) {
      case 'GENERIC': return 'נמל כללי: יחס 3:1';
      case 'WOOD': return 'נמל עץ: יחס 2:1';
      case 'BRICK': return 'נמל לבנה: יחס 2:1';
      case 'SHEEP': return 'נמל כבש: יחס 2:1';
      case 'WHEAT': return 'נמל חיטה: יחס 2:1';
      case 'ORE': return 'נמל ברזל: יחס 2:1';
      default: return 'נמל מסחר';
    }
  };

  return (
    <g 
      className={isClickable ? 'cursor-pointer' : 'cursor-default'} 
      onClick={handleVertexClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* נמל (Harbor / Port) */}
      {vertex.isHarbor && (
        <g style={{ transformStyle: 'preserve-3d' }}>
          {/* Wood Deck Extrusion for 3D Mode */}
          {is3DMode && Array.from({ length: 6 }, (_, i) => i + 1).map((z) => (
            <circle
              key={z}
              r="14"
              fill="#3e2723"
              stroke="#271510"
              strokeWidth="1"
              style={{
                transform: `translate(${x}px, ${y}px) translateZ(${z}px)`,
                transformStyle: 'preserve-3d',
                opacity: 0.9,
              }}
            />
          ))}
          {/* Top surface of the harbor platform */}
          <circle
            r="14"
            fill="#5c4033"
            stroke="#d7ccc8"
            strokeWidth="1.5"
            className="drop-shadow-md"
            style={{
              transform: is3DMode ? `translate(${x}px, ${y}px) translateZ(7px)` : `translate(${x}px, ${y}px)`,
              transformStyle: 'preserve-3d',
            }}
          />
          {/* Text/Label indicating port type floating higher */}
          {vertex.harborType === 'GENERIC' ? (
            <g style={{ transform: is3DMode ? `translate(${x}px, ${y}px) translateZ(12px)` : `translate(${x}px, ${y}px)`, transformStyle: 'preserve-3d' }}>
              <image
                href="/favicon.svg"
                x="-7"
                y="-11"
                width="14"
                height="14"
                style={{ pointerEvents: 'none' }}
              />
              <text
                y="10"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="7px"
                fontWeight="900"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: '1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000',
                  pointerEvents: 'none',
                }}
              >
                3:1
              </text>
            </g>
          ) : (
            <g style={{ transform: is3DMode ? `translate(${x}px, ${y}px) translateZ(12px)` : `translate(${x}px, ${y}px)`, transformStyle: 'preserve-3d' }}>
              <image
                href={
                  vertex.harborType === 'WOOD' ? '/wood1.png' :
                  vertex.harborType === 'BRICK' ? '/brick1.png' :
                  vertex.harborType === 'SHEEP' ? '/wool1.png' :
                  vertex.harborType === 'WHEAT' ? '/wheat1.png' :
                  '/rock1.png'
                }
                x="-7"
                y="-11"
                width="14"
                height="14"
                style={{ pointerEvents: 'none' }}
              />
              <text
                y="10"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="7px"
                fontWeight="900"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: '1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000',
                  pointerEvents: 'none',
                }}
              >
                2:1
              </text>
            </g>
          )}
        </g>
      )}
      
      {/* צומת פנוי */}
      {vertex.structure === 'NONE' && (
        <circle
          r="6"
          fill={isValidPlacement ? currentPlayer?.color : '#ffffff'}
          opacity={isValidPlacement ? '0.3' : '0'}
          className={isValidPlacement && !currentPlayer?.isBot ? "hover:opacity-100 transition-all duration-200" : ""}
          stroke="#424242"
          strokeWidth="1"
          style={is3DMode ? { transform: `translate(${x}px, ${y}px) translateZ(4px)`, transformStyle: 'preserve-3d' } : undefined}
          cx={is3DMode ? 0 : x}
          cy={is3DMode ? 0 : y}
        />
      )}

      {/* יישוב בנוי (Settlement: Small House shape) */}
      {vertex.structure === 'SETTLEMENT' && !is3DMode && (
        <g className="transition-all duration-300 hover:scale-125" style={{ transformOrigin: `${x}px ${y}px` }}>
          <image
            href="/settlement.png"
            x={x - 19}
            y={y - 19}
            width="38"
            height="38"
            style={{
              pointerEvents: 'none',
              filter: `url(#tint-${vertex.playerId})`
            }}
          />
        </g>
      )}

      {/* עיר בנויה (City: Large Tower + House shape) */}
      {vertex.structure === 'CITY' && !is3DMode && (
        <g className="transition-all duration-300 hover:scale-125" style={{ transformOrigin: `${x}px ${y}px` }}>
          <image
            href="/city.png"
            x={x - 24}
            y={y - 24}
            width="48"
            height="48"
            style={{
              pointerEvents: 'none',
              filter: `url(#tint-${vertex.playerId})`
            }}
          />
        </g>
      )}

      {/* בועת מידע צפה (Tooltip) במעבר עכבר מעל נמל */}
      {isHovered && vertex.isHarbor && (
        <g 
          style={{ 
            transform: is3DMode ? `translate(${x}px, ${y}px) translateZ(35px)` : `translate(${x}px, ${y}px)`, 
            pointerEvents: 'none',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* רקע שחור/כהה חצי שקוף של הטולטיפ */}
          <rect
            x="-65"
            y="-42"
            width="130"
            height="26"
            rx="5"
            fill="#0b1329"
            stroke={isOwnedHarbor ? "#10b981" : "#f59e0b"}
            strokeWidth="1.5"
            opacity="0.95"
            className="drop-shadow-lg"
          />
          {/* משולש קטן בתחתית הבועה */}
          <path
            d="M -5,-16 L 0,-10 L 5,-16 Z"
            fill="#0b1329"
            stroke={isOwnedHarbor ? "#10b981" : "#f59e0b"}
            strokeWidth="1.5"
          />
          {/* תמונת נמל בבועה */}
          {vertex.harborType && (
            <image
              href={
                vertex.harborType === 'GENERIC' ? '/favicon.svg' :
                vertex.harborType === 'WOOD' ? '/wood1.png' :
                vertex.harborType === 'BRICK' ? '/brick1.png' :
                vertex.harborType === 'SHEEP' ? '/wool1.png' :
                vertex.harborType === 'WHEAT' ? '/wheat1.png' :
                '/rock1.png'
              }
              x="-54"
              y="-35"
              width="12"
              height="12"
            />
          )}
          {/* טקסט בתוך הבועה */}
          <text
            textAnchor="start"
            dominantBaseline="central"
            x="-38"
            y="-29"
            fill="#f8fafc"
            fontSize="9px"
            fontWeight="bold"
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {getHarborTooltipText(vertex.harborType)}
          </text>
        </g>
      )}
    </g>
  );
};
