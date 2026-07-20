import React from 'react';
import { useGame } from '../../context/GameContext';
import { HexTile as HexTileType } from '../../types/hex.types';
import { cubeToPixel } from '../../utils/hexMath/cubeToPixel';
import { getHexPointsString } from '../../utils/hexMath/getHexPointsString';
import { NumberToken } from './NumberToken';
import { getEligibleRobberyTargets } from '../../utils/gameEngine/robberSteal';
import { parseEdgeId } from '../../utils/hexMath/parseEdgeId';

interface HexTileProps {
  tile: HexTileType;
}

const HEX_SIZE = 60;

const RESOURCE_COLORS: Record<string, string> = {
  WOOD: '#15803d',   // ירוק כהה בשביל יער
  BRICK: '#dc2626',  // אדום בשביל לבנים
  SHEEP: '#a3e635',  // ירוק בהיר בשביל מרעה כבשים
  WHEAT: '#eab308',  // צהוב בשביל חיטה
  ORE: '#64748b',    // אפור בשביל ברזל (סלעים)
  DESERT: '#8b5a2b', // חום בשביל מדבר
  WATER: '#3b82f6',  // כחול ים
  SEA: '#3b82f6',    // כחול ים
};

const RESOURCE_TEXTURES: Record<string, string> = {
  WOOD: 'url(#tex-WOOD)',
  BRICK: 'url(#tex-BRICK)',
  SHEEP: 'url(#tex-SHEEP)',
  WHEAT: 'url(#tex-WHEAT)',
  ORE: 'url(#tex-ORE)',
  DESERT: 'url(#tex-DESERT)',
  GOLD_FIELD: 'url(#tex-GOLD_FIELD)',
  FOG: 'url(#tex-FOG)',
};

export const HexTile: React.FC<HexTileProps> = ({ tile }) => {
  const { turnSubPhase, setTiles, setTurnSubPhase, players, currentPlayerIndex, addLog, is3DMode, vertices, setRobberyState, activeExpansion, activeRobberType, setActiveRobberType, edges } = useGame();
  
  const center = cubeToPixel(tile.coord, HEX_SIZE);
  const pointsString = getHexPointsString(center.x, center.y, HEX_SIZE);
  const tileColor = RESOURCE_TEXTURES[tile.type] || RESOURCE_COLORS[tile.type] || '#ffffff';

  // השודד ניתן להזזה רק אם אנחנו בשלב המתאים, וזהו תורו של שחקן אנושי, והשודד לא נמצא שם כבר
  const isSelectableForRobber = (() => {
    if (turnSubPhase !== 'ROBBER_PLACEMENT') return false;
    if (players[currentPlayerIndex]?.isBot) return false;

    if (activeExpansion === 'SEAFARERS') {
      if (activeRobberType === 'ROBBER') {
        return tile.type !== 'WATER' && !tile.hasRobber;
      } else if (activeRobberType === 'PIRATE') {
        return tile.type === 'WATER' && !tile.hasPirate;
      }
      return false;
    } else {
      return tile.type !== 'WATER' && !tile.hasRobber;
    }
  })();

  const handleTileClick = () => {
    if (!isSelectableForRobber) return;

    const currentPlayerName = players[currentPlayerIndex]?.name || 'השחקן';
    const isPirate = activeExpansion === 'SEAFARERS' && activeRobberType === 'PIRATE';

    if (isPirate) {
      setTiles(prevTiles => prevTiles.map(t => {
        if (t.id === tile.id) return { ...t, hasPirate: true };
        if (t.hasPirate) return { ...t, hasPirate: false };
        return t;
      }));
      addLog(`${currentPlayerName} הזיז את שודד הים לאריח מים.`);
    } else {
      setTiles(prevTiles => prevTiles.map(t => {
        if (t.id === tile.id) return { ...t, hasRobber: true };
        if (t.hasRobber) return { ...t, hasRobber: false };
        return t;
      }));
      addLog(`${currentPlayerName} הזיז את השודד לאריח מסוג ${tile.type}.`);
    }

    const currentPlayingPlayer = players[currentPlayerIndex];
    let eligibleTargets: any[] = [];

    if (isPirate) {
      const tileVertexIds = new Set<string>();

      vertices.forEach(vertex => {
        for (let i = 0; i < 6; i++) {
          const angleRad = (Math.PI / 180) * (60 * i - 30);
          const x = center.x + HEX_SIZE * Math.cos(angleRad);
          const y = center.y + HEX_SIZE * Math.sin(angleRad);

          const roundedX = Math.round(x * 10) / 10;
          const roundedY = Math.round(y * 10) / 10;
          const checkId = `v_${roundedX}_${roundedY}`;

          if (checkId === vertex.id) {
            tileVertexIds.add(vertex.id);
            break;
          }
        }
      });

      const candidatePlayerIds = new Set<string>();
      edges.forEach(edge => {
        if (edge.hasShip && edge.shipPlayerId && edge.shipPlayerId !== currentPlayingPlayer.id) {
          const { x1, y1, x2, y2 } = parseEdgeId(edge.id);
          const v1Id = `v_${x1}_${y1}`;
          const v2Id = `v_${x2}_${y2}`;
          if (tileVertexIds.has(v1Id) && tileVertexIds.has(v2Id)) {
            candidatePlayerIds.add(edge.shipPlayerId);
          }
        }
      });

      eligibleTargets = players.filter(p => {
        if (!candidatePlayerIds.has(p.id)) return false;
        const totalCards = Object.values(p.resources).reduce((sum, count) => sum + (count as number), 0);
        return totalCards > 0;
      });
    } else {
      eligibleTargets = getEligibleRobberyTargets(tile, vertices, players, currentPlayingPlayer.id);
    }

    setActiveRobberType?.(null);

    if (eligibleTargets.length > 0) {
      setRobberyState({ tile, targets: eligibleTargets });
    } else {
      addLog(`[שודד] אין שחקנים יריבים עם קלפים באריח זה.`);
      setTurnSubPhase('TRADE_AND_BUILD');
    }
  };

  return (
    <g 
      id={`tile-${tile.id}`} 
      onClick={handleTileClick}
      style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
    >
      <polygon
        points={pointsString}
        fill={tileColor}
        stroke="rgba(212, 175, 55, 0.7)"
        strokeWidth="1.2"
        className={`transition-all duration-300 ${
          isSelectableForRobber 
            ? 'animate-pulse brightness-110 cursor-pointer stroke-amber-400 stroke-[3px]' 
            : 'hover:brightness-105'
        }`}
        style={is3DMode ? { transform: 'translateZ(0px)', transformStyle: 'preserve-3d' } : undefined}
      />

      {/* renderTerrainFeatures is omitted so the raw background image texture is fully visible and not drawn over */}
      {/* {renderTerrainFeatures()} */}

      {tile.numberToken !== null && (
        <NumberToken centerX={center.x} centerY={center.y} value={tile.numberToken} is3DMode={is3DMode} />
      )}

      {tile.hasRobber && (
        <g transform={`translate(${center.x}, ${center.y + 13})`} className="drop-shadow-lg filter pointer-events-none">
          {/* Outer glowing shield border (Robber icon) */}
          <path
            d="M -11,-12 L 11,-12 L 11,-3 C 11,4 0,14 0,14 C 0,14 -11,4 -11,-3 Z"
            fill="#1e1b4b"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Inner shield decoration */}
          <path
            d="M -7,-8 L 7,-8 L 7,-2 C 7,3 0,10 0,10 C 0,10 -7,3 -7,-2 Z"
            fill="#312e81"
            stroke="#f59e0b"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Dark emblem/cross inside */}
          <path
            d="M -3,-2 L 3,-2 M 0,-5 L 0,1"
            stroke="#f43f5e"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      {tile.hasPirate && (
        <g transform={`translate(${center.x - 20}, ${center.y - 20})`} className="drop-shadow-lg filter pointer-events-none">
          <image
            href="/pirat.jpg"
            width="40"
            height="40"
            className="rounded-full overflow-hidden"
          />
        </g>
      )}
    </g>
  );
};
