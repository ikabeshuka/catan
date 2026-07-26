import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getEligibleRobberyTargets } from '../utils/gameEngine/robberSteal';
import { parseEdgeId } from '../utils/hexMath/parseEdgeId';
import { cubeToPixel } from '../utils/hexMath/cubeToPixel';
import { useVertexInteraction } from './useVertexInteraction';
import { useEdgeInteraction } from './useEdgeInteraction';

export function useBoardInteraction() {
  const { 
    vertices, 
    edges, 
    setTiles, 
    setTurnSubPhase, 
    addLog, 
    setRobberyState,
    players,
    currentPlayerIndex,
    turnSubPhase,
    activeExpansion,
    activeRobberType,
    setActiveRobberType,
  } = useGame();

  const [hoveredTile, setHoveredTile] = useState<{
    tile: any;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredHarbor, setHoveredHarbor] = useState<{
    harbor: any;
    x: number;
    y: number;
  } | null>(null);

  const {
    getVertexConfig,
    handleVertexClick,
  } = useVertexInteraction();

  const {
    coastlinePopupEdge,
    setCoastlinePopupEdge,
    getEdgeConfig,
    buildRoadOnEdge,
    buildShipOnEdge,
    handleEdgeClick,
  } = useEdgeInteraction();

  const isSelectableForRobber = (tile: any) => {
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
  };

  const handleTileClick = (tile: any) => {
    if (!isSelectableForRobber(tile)) return;
    
    const currentPlayerName = players[currentPlayerIndex]?.name || 'השחקן';
    const isPirate = activeExpansion === 'SEAFARERS' && activeRobberType === 'PIRATE';
    
    // Move robber/pirate
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
      // Pirate Rule: only steal from players with a ship on one of the 6 surrounding edges of this water tile
      const HEX_SIZE = 60;
      const center = cubeToPixel(tile.coord, HEX_SIZE);
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

    // Reset activeRobberType to null since selection/placement action is finished
    setActiveRobberType?.(null);

    if (eligibleTargets.length > 0) {
      setRobberyState({ tile, targets: eligibleTargets });
    } else {
      addLog(`[שודד] אין שחקנים יריבים עם קלפים באריח זה.`);
      setTurnSubPhase('TRADE_AND_BUILD');
    }
  };

  return {
    hoveredTile,
    setHoveredTile,
    hoveredHarbor,
    setHoveredHarbor,
    coastlinePopupEdge,
    setCoastlinePopupEdge,
    buildRoadOnEdge,
    buildShipOnEdge,
    handleTileClick,
    handleVertexClick,
    handleEdgeClick,
    getVertexConfig,
    getEdgeConfig,
    isSelectableForRobber,
  };
}
