import React from 'react';
import { useGame } from '../../context/GameContext';
import { HexTile as HexTileType } from '../../types/hex.types';
import { NumberToken } from './NumberToken';
import { getEligibleRobberyTargets } from '../../utils/gameEngine/robberSteal';
import { parseEdgeId } from '../../utils/hexMath/parseEdgeId';
import { getCachedTileGeometry } from '../../utils/hexMath/boardRenderCache';
import { isSeafarersExpansion } from '../../config/gameRules';

interface HexTileProps {
  tile: HexTileType;
}

const RESOURCE_COLORS: Record<string, string> = {
  SWAMP: '#4b5563',
  WOOD: '#15803d',   // ירוק כהה בשביל יער
  BRICK: '#dc2626',  // אדום בשביל לבנים
  SHEEP: '#a3e635',  // ירוק בהיר בשביל מרעה כבשים
  WHEAT: '#eab308',  // צהוב בשביל חיטה
  ORE: '#64748b',    // אפור בשביל ברזל (סלעים)
  DESERT: '#8b5a2b', // חום בשביל מדבר
  OASIS: '#caa65a',
  WATER: '#3b82f6',  // כחול ים
  SEA: '#3b82f6',    // כחול ים
  LAKE: '#0284c7',   // כחול אגם מיוחד
  FISHING_GROUND: '#0369a1', // כחול כהה של דייג
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
  const { turnSubPhase, setTiles, setTurnSubPhase, players, currentPlayerIndex, addLog, is3DMode, vertices, setRobberyState, activeExpansion, activeRobberType, setActiveRobberType, edges, boardRenderCache, selectedScenario, scenarioState } = useGame();
  
  const tileGeometry = boardRenderCache.tileById.get(tile.id) || getCachedTileGeometry(tile);
  const center = tileGeometry.center2D;
  const pointsString = tileGeometry.points2D;
  const tileColor = RESOURCE_TEXTURES[tile.type] || RESOURCE_COLORS[tile.type] || '#ffffff';

  // השודד ניתן להזזה רק אם אנחנו בשלב המתאים, וזהו תורו של שחקן אנושי, והשודד לא נמצא שם כבר
  const isSelectableForRobber = (() => {
    if (turnSubPhase !== 'ROBBER_PLACEMENT') return false;
    if (players[currentPlayerIndex]?.isBot) return false;

    if (isSeafarersExpansion(activeExpansion)) {
      if (activeRobberType === 'ROBBER') {
        if (selectedScenario === 'THE_LOST_TRIBE' && (tile.islandId !== 1 || tile.robberStartLocked)) return false;
        if (selectedScenario === 'CLOTH_FOR_CATAN' && tile.islandId !== 1) return false;
        return tile.type !== 'WATER' && tile.type !== 'OASIS' && !tile.hasRobber;
      } else if (activeRobberType === 'PIRATE') {
        return tile.type === 'WATER' && !tile.hasPirate;
      }
      return false;
    } else {
      return tile.type !== 'WATER' && tile.type !== 'OASIS' && !tile.hasRobber;
    }
  })();

  const handleTileClick = () => {
    if (!isSelectableForRobber) return;

    const currentPlayerName = players[currentPlayerIndex]?.name || 'השחקן';
    const isPirate = isSeafarersExpansion(activeExpansion) && activeRobberType === 'PIRATE';

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
      const tileVertexIds = new Set(tileGeometry.vertexIds);

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

      {tile.lostTribeVillages?.map(village => {
        const vertexId = tileGeometry.vertexIds[village.vertexIndex];
        const [, x, y] = vertexId.split('_');
        return (
          <g key={village.id} className="pointer-events-none">
            <NumberToken centerX={Number(x)} centerY={Number(y)} value={village.number} is3DMode={is3DMode} />
            <text x={Number(x)} y={Number(y) + 34} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fef3c7">
              🧵 {village.clothRemaining}
            </text>
          </g>
        );
      })}

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

      {(tile.scenarioMarker?.dragonIds || []).length > 0 && (
        <g transform={`translate(${center.x + 18}, ${center.y - 18})`} className="pointer-events-none drop-shadow-lg">
          <circle r="15" fill="#7f1d1d" stroke="#fbbf24" strokeWidth="2" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="18">🐉</text>
          <text x="12" y="14" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800">{tile.scenarioMarker?.dragonIds?.length}</text>
        </g>
      )}

      {tile.scenarioMarker?.canalBuilt && (
        <g className="pointer-events-none">
          <path d={`M ${center.x - 36},${center.y + 15} Q ${center.x},${center.y - 18} ${center.x + 36},${center.y + 15}`} fill="none" stroke="#38bdf8" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
          <path d={`M ${center.x - 36},${center.y + 15} Q ${center.x},${center.y - 18} ${center.x + 36},${center.y + 15}`} fill="none" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {tile.scenarioMarker?.riverId && (
        <g className="pointer-events-none">
          <path d={`M ${center.x - 48},${center.y + (tile.scenarioMarker.riverId === 'NORTH' ? 14 : -14)} Q ${center.x},${center.y - (tile.scenarioMarker.riverId === 'NORTH' ? 15 : -15)} ${center.x + 48},${center.y + (tile.scenarioMarker.riverId === 'NORTH' ? 14 : -14)}`} fill="none" stroke="#075985" strokeWidth="12" strokeLinecap="round" opacity="0.84" />
          <path d={`M ${center.x - 48},${center.y + (tile.scenarioMarker.riverId === 'NORTH' ? 14 : -14)} Q ${center.x},${center.y - (tile.scenarioMarker.riverId === 'NORTH' ? 15 : -15)} ${center.x + 48},${center.y + (tile.scenarioMarker.riverId === 'NORTH' ? 14 : -14)}`} fill="none" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        </g>
      )}
      {tile.type === 'OASIS' && (
        <g transform={`translate(${center.x}, ${center.y})`} className="pointer-events-none">
          <circle r="22" fill="#0f766e" opacity="0.72" stroke="#fef3c7" strokeWidth="2" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="20">🌴</text>
        </g>
      )}
      {tile.scenarioMarker?.barbarianFortress && (
        <g transform={`translate(${center.x}, ${center.y - 2})`} className="pointer-events-none drop-shadow-lg">
          <path d="M -20,16 L -20,-13 L -11,-20 L -3,-13 L 5,-20 L 13,-13 L 20,-6 L 20,16 Z" fill="#475569" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M -16,16 L -16,3 L -7,3 L -7,16" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
        </g>
      )}
      {scenarioState.kind === 'BARBARIAN_ATTACK' && scenarioState.barbarians.filter(barbarian => barbarian.tileId === tile.id).length > 0 && (
        <g transform={`translate(${center.x + 22}, ${center.y - 22})`} className="pointer-events-none drop-shadow-lg">
          <circle r="14" fill="#991b1b" stroke="#fecaca" strokeWidth="2" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="17">⚔</text>
          <text x="11" y="12" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">{scenarioState.barbarians.filter(barbarian => barbarian.tileId === tile.id).length}</text>
        </g>
      )}
      {tile.scenarioMarker?.barbarianCaptured && (
        <g transform={`translate(${center.x}, ${center.y})`} className="pointer-events-none">
          <path d="M -34,-28 L 34,28 M -34,28 L 34,-28" stroke="#7f1d1d" strokeWidth="7" strokeLinecap="round" opacity="0.76" />
          <text y="42" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fecaca">כבוש</text>
        </g>
      )}
      {tile.scenarioMarker?.infertileField && (
        <g transform={`translate(${center.x}, ${center.y})`} className="pointer-events-none">
          <circle r="22" fill="#78350f" opacity="0.72" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
          <text textAnchor="middle" dominantBaseline="central" fontSize="15">🏜️</text>
        </g>
      )}
    </g>
  );
};
