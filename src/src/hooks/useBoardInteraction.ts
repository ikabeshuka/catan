import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getEligibleRobberyTargets } from '../utils/gameEngine/robberSteal';
import { useVertexInteraction } from './useVertexInteraction';
import { useEdgeInteraction } from './useEdgeInteraction';
import { dispatchGameAction } from '../services/gameDispatcher';

export function useBoardInteraction() {
  const { 
    tiles,
    vertices, 
    edges, 
    setTiles, 
    setPlayers,
    setTurnSubPhase, 
    addLog, 
    setRobberyState,
    players,
    currentPlayerIndex,
    turnSubPhase,
    activeExpansion,
    activeRobberType,
    setActiveRobberType,
    roomId,
    myPlayerId,
    boardRenderCache,
    selectedScenario,
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
    if (selectedScenario === 'PIRATE_ISLANDS') return false;
    if (turnSubPhase !== 'ROBBER_PLACEMENT') return false;
    if (players[currentPlayerIndex]?.isBot) return false;
    if (roomId && players[currentPlayerIndex]?.id !== myPlayerId) return false;

    if (activeExpansion === 'SEAFARERS') {
      if (activeRobberType === 'ROBBER') {
        if (selectedScenario === 'THE_LOST_TRIBE' && (tile.islandId !== 1 || tile.robberStartLocked)) return false;
        if (selectedScenario === 'CLOTH_FOR_CATAN' && tile.islandId !== 1) return false;
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
    
    const isPirate = activeExpansion === 'SEAFARERS' && activeRobberType === 'PIRATE';

    const currentPlayingPlayer = players[currentPlayerIndex];
    let eligibleTargets: any[] = [];

    if (isPirate) {
      // Pirate Rule: only steal from players with a ship on one of the 6 surrounding edges of this water tile
      const tileVertexIds = new Set(boardRenderCache.tileById.get(tile.id)?.vertexIds || []);

      const candidatePlayerIds = new Set<string>();
      edges.forEach(edge => {
        if (edge.hasShip && edge.shipPlayerId && edge.shipPlayerId !== currentPlayingPlayer.id) {
          const [v1Id, v2Id] = boardRenderCache.edgeById.get(edge.id)?.vertexIds || [];
          if (v1Id && v2Id && tileVertexIds.has(v1Id) && tileVertexIds.has(v2Id)) {
            candidatePlayerIds.add(edge.shipPlayerId);
          }
        }
      });

      eligibleTargets = players.filter(p => {
        if (!candidatePlayerIds.has(p.id)) return false;
        const totalCards = Object.values(p.resources).reduce((sum, count) => sum + (count as number), 0);
        return totalCards > 0 || (selectedScenario === 'CLOTH_FOR_CATAN' && (p.clothRolls || 0) > 0);
      });
    } else {
      eligibleTargets = getEligibleRobberyTargets(tile, vertices, players, currentPlayingPlayer.id);
    }

    dispatchGameAction({
      type: 'MOVE_ROBBER',
      playerId: currentPlayingPlayer.id,
      tileId: tile.id,
      robberType: isPirate ? 'PIRATE' : 'ROBBER',
      hasEligibleVictims: roomId ? undefined : eligibleTargets.length > 0,
    }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : currentPlayingPlayer.id,
      players,
      tiles,
      setTiles,
      setPlayers,
      setTurnSubPhase,
      setActiveRobberType,
      addLog,
    });

    if (!roomId && eligibleTargets.length > 0) {
      setRobberyState({ tile, targets: eligibleTargets });
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
