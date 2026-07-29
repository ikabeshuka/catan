import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { validateRoadPlacement } from '../utils/validation/validateRoadPlacement';
import { validateShipPlacement } from '../utils/validation/validateShipPlacement';
import { getOpenShipsForPlayer } from '../utils/gameEngine/getOpenShipsForPlayer';
import { getTileEdgeIds } from '../utils/gameEngine/generateEdges';
import { getEdgeVertices, getTileVertexIds } from '../utils/hexMath/boardGeometryHelpers';
import { dispatchGameAction } from '../services/gameDispatcher';
import { GameAction } from '../types/gameActions.types';

export function useEdgeInteraction() {
  const {
    tiles,
    vertices,
    edges,
    setTiles,
    setTurnSubPhase,
    addLog,
    setPlayers,
    gamePhase,
    setEdges,
    roadBuildingRemaining,
    showBuildingCostToast,
    currentAction,
    setCurrentAction,
    players,
    currentPlayerIndex,
    turnSubPhase,
    activeExpansion,
    setCurrentTurnBuiltShips,
    selectedShipIdToMove,
    setSelectedShipIdToMove,
    setHasMovedShipThisTurn,
    currentTurnBuiltShips,
    setGoldSelectionQueue,
    setRoadBuildingRemaining,
    roomId,
    myPlayerId,
    resourceBank,
    setResourceBank,
  } = useGame();

  const { isSetupPhase, setupState, recordSetupPlacement } = useTurnManager();

  const [coastlinePopupEdge, setCoastlinePopupEdge] = useState<any | null>(null);

  const checkIsCoastline = (edgeId: string) => {
    if (!tiles || tiles.length === 0) return false;
    const bordering = tiles.filter(t => getTileEdgeIds(t).includes(edgeId));
    const hasLand = bordering.some(t => t.type !== 'WATER' && t.type !== 'SEA' && t.type !== 'FOG');
    const hasWater = bordering.some(t => t.type === 'WATER' || t.type === 'SEA' || t.type === 'FOG');
    const isLandFrame = bordering.length === 1 && hasLand;
    return (hasLand && hasWater) || isLandFrame;
  };

  const getEdgeConfig = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isLocalPlayersTurn = !roomId || (!!myPlayerId && currentPlayer?.id === myPlayerId);
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedRoad;

    if (currentAction === 'MOVE_SHIP_SELECT') {
      const openShips = getOpenShipsForPlayer(currentPlayer.id, edges, vertices, currentTurnBuiltShips, tiles || []);
      const isOpenShip = openShips.some(s => s.id === edge.id);
      return { isValidPlacement: isOpenShip, isClickable: isOpenShip && isLocalPlayersTurn };
    }

    if (currentAction === 'MOVE_SHIP_PLACE') {
      if (edge.hasRoad || edge.hasShip) {
        return { isValidPlacement: false, isClickable: false };
      }
      const edgesWithoutMovingShip = edges.map(e => 
        e.id === selectedShipIdToMove ? { ...e, hasShip: false, shipPlayerId: undefined } : e
      );
      const isValidShip = validateShipPlacement(edge.id, currentPlayer.id, vertices, edgesWithoutMovingShip, tiles || [], gamePhase);
      return { isValidPlacement: isValidShip, isClickable: isValidShip && isLocalPlayersTurn };
    }

    const isCoast = checkIsCoastline(edge.id);
    let isValidPlacement = false;

    const isAdjacentToSetupSettlement = (() => {
      if (!isSetupPhase || !setupState?.lastSettlementVertexId) return false;
      const parts = edge.id.replace('e_v_', '').split('_v_');
      const v1Id = `v_${parts[0]}`;
      const v2Id = `v_${parts[1]}`;
      return v1Id === setupState.lastSettlementVertexId || v2Id === setupState.lastSettlementVertexId;
    })();

    const bordersWater = tiles 
      ? tiles.filter(t => getTileEdgeIds(t).includes(edge.id)).some(t => t.type === 'WATER' || t.type === 'SEA' || t.type === 'FOG')
      : false;

    if (isAdjacentToSetupSettlement && bordersWater) {
      const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      const isValidShip = activeExpansion === 'SEAFARERS' && currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      isValidPlacement = isValidRoad || isValidShip;
    } else if (isCoast) {
      const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      const isValidShip = activeExpansion === 'SEAFARERS' && currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      isValidPlacement = isValidRoad || isValidShip;
    } else if (activeExpansion === 'SEAFARERS' && bordersWater && !isCoast) {
      isValidPlacement = currentPlayer && !isBlockedBySetup
        ? validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase)
        : false;
    } else if (currentAction === 'BUILD_SHIP') {
      isValidPlacement = currentPlayer && !isBlockedBySetup
        ? validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase)
        : false;
    } else {
      isValidPlacement = currentPlayer && !isBlockedBySetup
        ? validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase)
        : false;
    }

    if (isValidPlacement && isSetupPhase && setupState?.lastSettlementVertexId) {
      const parts = edge.id.replace('e_v_', '').split('_v_');
      const v1Id = `v_${parts[0]}`;
      const v2Id = `v_${parts[1]}`;
      if (v1Id !== setupState.lastSettlementVertexId && v2Id !== setupState.lastSettlementVertexId) {
        isValidPlacement = false;
      }
    }

    const isClickable = isValidPlacement && !currentPlayer?.isBot && isLocalPlayersTurn;

    return { isValidPlacement, isClickable };
  };

  const handleRevealFog = (edgeId: string) => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;
    const [firstVertex, secondVertex] = getEdgeVertices(edgeId);
    (tiles || []).filter(tile => tile.type === 'FOG').forEach(tile => {
      const tileVertices = getTileVertexIds(tile);
      if (!tileVertices.includes(firstVertex) && !tileVertices.includes(secondVertex)) return;
      dispatchGameAction({
        type: 'DISCOVER_FOG',
        playerId: currentPlayer.id,
        tileId: tile.id,
        revealedTile: {
          type: tile.originalType || 'WOOD',
          numberToken: tile.originalNumberToken ?? null,
          revealed: true,
        },
      }, {
        roomId: roomId || undefined,
        isRemote: false,
        myPlayerId: roomId ? myPlayerId : currentPlayer.id,
        players,
        tiles,
        setTiles,
        setPlayers,
        resourceBank,
        setResourceBank,
        setGoldSelectionQueue,
        setTurnSubPhase,
        addLog,
      });
    });
  };

  const dispatchBuildAction = (action: Extract<GameAction, { type: 'BUILD_ROAD' | 'BUILD_SHIP' }>) => {
    dispatchGameAction(action, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : players[currentPlayerIndex]?.id,
      gamePhase,
      players,
      setEdges,
      setPlayers,
      showBuildingCostToast,
      addLog,
      recordSetupPlacement,
      roadBuildingRemaining,
      setRoadBuildingRemaining,
      activeExpansion,
    });
  };

  const buildRoadOnEdge = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isBot || (roomId && currentPlayer.id !== myPlayerId)) return;
    if (isSetupPhase) {
      dispatchBuildAction({ type: 'BUILD_ROAD', playerId: currentPlayer.id, edgeId: edge.id });
      handleRevealFog(edge.id);
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

    dispatchBuildAction({ type: 'BUILD_ROAD', playerId: currentPlayer.id, edgeId: edge.id });
    handleRevealFog(edge.id);
  };

  const buildShipOnEdge = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isBot || (roomId && currentPlayer.id !== myPlayerId)) return;
    if (isSetupPhase) {
      dispatchBuildAction({ type: 'BUILD_SHIP', playerId: currentPlayer.id, edgeId: edge.id });
      handleRevealFog(edge.id);
      return;
    }

    const canBuildFreeShipBeforeRoll = turnSubPhase === 'BEFORE_ROLL' && roadBuildingRemaining > 0;
    if (turnSubPhase !== 'TRADE_AND_BUILD' && !canBuildFreeShipBeforeRoll) return;

    const isFreeShip = roadBuildingRemaining > 0 && activeExpansion === 'SEAFARERS';
    const hasResources = isFreeShip || (currentPlayer.resources.WOOD >= 1 && currentPlayer.resources.SHEEP >= 1);
    showBuildingCostToast('SHIP', hasResources, isFreeShip);

    if (!hasResources) {
      addLog(`אין לך מספיק משאבים לבניית ספינה! נדרש: 1 עץ, 1 כבש.`);
      return;
    }

    dispatchBuildAction({ type: 'BUILD_SHIP', playerId: currentPlayer.id, edgeId: edge.id });

    setCurrentTurnBuiltShips(prev => [...prev, edge.id]);

    if (!isFreeShip) {
      setCurrentAction(null);
    }
    
    handleRevealFog(edge.id);
  };

  const handleEdgeClick = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isLocalPlayersTurn = !roomId || (!!myPlayerId && currentPlayer?.id === myPlayerId);
    if (!currentPlayer || currentPlayer.isBot || !isLocalPlayersTurn) return;

    const { isValidPlacement } = getEdgeConfig(edge);
    if (!isValidPlacement) return;

    if (currentAction === 'MOVE_SHIP_SELECT') {
      setSelectedShipIdToMove(edge.id);
      setCurrentAction('MOVE_SHIP_PLACE');
      addLog(`בחרת ספינה פתוחה להזזה. בחר כעת יעד חוקי (צלע מים/חוף הגובלת ברשת הספינות או המבנים שלך).`);
      return;
    }

    if (currentAction === 'MOVE_SHIP_PLACE') {
      if (!selectedShipIdToMove) return;
      dispatchGameAction({
        type: 'MOVE_SHIP',
        playerId: currentPlayer.id,
        fromEdgeId: selectedShipIdToMove,
        toEdgeId: edge.id,
      }, {
        roomId: roomId || undefined,
        isRemote: false,
        myPlayerId: roomId ? myPlayerId : currentPlayer.id,
        players,
        setEdges,
        setHasMovedShipThisTurn,
        addLog,
      });
      setSelectedShipIdToMove(null);
      setCurrentAction(null);
      handleRevealFog(edge.id);
      return;
    }

    const isCoast = checkIsCoastline(edge.id);
    const bordersWater = tiles 
      ? tiles.filter(t => getTileEdgeIds(t).includes(edge.id)).some(t => t.type === 'WATER' || t.type === 'SEA' || t.type === 'FOG')
      : false;

    if (isSetupPhase && !isCoast && bordersWater) {
      const isValid = currentPlayer && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValid) {
        buildShipOnEdge(edge);
      }
      return;
    }

    if (isCoast) {
      if (activeExpansion === 'SEAFARERS') {
        setCoastlinePopupEdge(edge);
      } else {
        buildRoadOnEdge(edge);
      }
      return;
    }

    if (activeExpansion === 'SEAFARERS' && bordersWater && !isCoast) {
      const isValid = currentPlayer && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValid) {
        buildShipOnEdge(edge);
      }
      return;
    }

    if (roadBuildingRemaining > 0 && activeExpansion === 'SEAFARERS') {
      const isBlockedBySetup = isSetupPhase && setupState?.hasPlacedRoad;
      const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      const isValidShip = currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValidRoad && !isValidShip) {
        buildRoadOnEdge(edge);
      } else if (isValidShip && !isValidRoad) {
        buildShipOnEdge(edge);
      }
      return;
    }

    if (currentAction === 'BUILD_SHIP') {
      const isValid = currentPlayer && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValid) {
        buildShipOnEdge(edge);
      }
    } else {
      const isValid = currentPlayer && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      if (isValid) {
        buildRoadOnEdge(edge);
      }
    }
  };

  return {
    coastlinePopupEdge,
    setCoastlinePopupEdge,
    getEdgeConfig,
    buildRoadOnEdge,
    buildShipOnEdge,
    handleEdgeClick,
  };
}
