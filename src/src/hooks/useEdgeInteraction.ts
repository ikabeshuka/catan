import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { validateRoadPlacement } from '../utils/validation/validateRoadPlacement';
import { validateShipPlacement } from '../utils/validation/validateShipPlacement';
import { getOpenShipsForPlayer } from '../utils/gameEngine/getOpenShipsForPlayer';
import { getEdgeVertices, getTileVertexIds } from '../utils/hexMath/boardGeometryHelpers';
import { dispatchGameAction } from '../services/gameDispatcher';
import { canExtendPirateShippingLine } from '../utils/gameEngine/pirateIslands';
import { GameAction } from '../types/gameActions.types';
import { getEligibleHarborEdges } from '../utils/gameEngine/lostTribeHelpers';
import { isSeafarersExpansion } from '../config/gameRules';

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
    setVertices,
    roadBuildingRemaining,
    showBuildingCostToast,
    currentAction,
    setCurrentAction,
    players,
    currentPlayerIndex,
    turnSubPhase,
    activeExpansion,
    selectedScenario,
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
    boardRenderCache,
    scenarioState,
    setScenarioState,
    devCardDeck,
    setDevCardDeck,
  } = useGame();

  const { isSetupPhase, setupState, recordSetupPlacement } = useTurnManager();

  const [coastlinePopupEdge, setCoastlinePopupEdge] = useState<any | null>(null);

  const checkIsCoastline = (edgeId: string) => {
    if (!tiles || tiles.length === 0) return false;
    return boardRenderCache.edgeById.get(edgeId)?.isCoast || false;
  };

  const calculateEdgeConfig = useCallback((edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isLocalPlayersTurn = !roomId || (!!myPlayerId && currentPlayer?.id === myPlayerId);
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedRoad;

    if (currentAction === 'PLACE_HARBOR') {
      const eligible = getEligibleHarborEdges(currentPlayer.id, vertices, edges, tiles || []);
      const canPlace = eligible.some(candidate => candidate.id === edge.id);
      return { isValidPlacement: canPlace, isClickable: canPlace && isLocalPlayersTurn };
    }

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

    const isCoast = boardRenderCache.edgeById.get(edge.id)?.isCoast || false;
    let isValidPlacement = false;

    const isAdjacentToSetupSettlement = (() => {
      if (!isSetupPhase || !setupState?.lastSettlementVertexId) return false;
      const parts = edge.id.replace('e_v_', '').split('_v_');
      const v1Id = `v_${parts[0]}`;
      const v2Id = `v_${parts[1]}`;
      return v1Id === setupState.lastSettlementVertexId || v2Id === setupState.lastSettlementVertexId;
    })();

    const bordersWater = boardRenderCache.edgeById.get(edge.id)?.hasWater || false;

    if (isAdjacentToSetupSettlement && bordersWater) {
      const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      const isValidShip = isSeafarersExpansion(activeExpansion) && currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      isValidPlacement = isValidRoad || isValidShip;
    } else if (isCoast) {
      const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      const isValidShip = isSeafarersExpansion(activeExpansion) && currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      isValidPlacement = isValidRoad || isValidShip;
    } else if (isSeafarersExpansion(activeExpansion) && bordersWater && !isCoast) {
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
  }, [
    activeExpansion,
    boardRenderCache,
    currentAction,
    currentPlayerIndex,
    currentTurnBuiltShips,
    edges,
    gamePhase,
    isSetupPhase,
    myPlayerId,
    players,
    roomId,
    selectedShipIdToMove,
    setupState.hasPlacedRoad,
    setupState.lastSettlementVertexId,
    tiles,
    vertices,
  ]);

  const edgeConfigById = useMemo(() => new Map(
    edges.map((edge) => [edge.id, calculateEdgeConfig(edge)])
  ), [calculateEdgeConfig, edges]);

  const getEdgeConfig = (edge: any) => edgeConfigById.get(edge.id)
    || { isValidPlacement: false, isClickable: false };

  useEffect(() => {
    if (turnSubPhase === 'HARBOR_PLACEMENT') {
      const currentPlayer = players[currentPlayerIndex];
      const isLocalPlayersTurn = !roomId || (!!myPlayerId && currentPlayer?.id === myPlayerId);
      if (currentPlayer && !currentPlayer.isBot && isLocalPlayersTurn) setCurrentAction('PLACE_HARBOR');
    } else if (currentAction === 'PLACE_HARBOR') {
      setCurrentAction(null);
    }
  }, [currentAction, currentPlayerIndex, myPlayerId, players, roomId, setCurrentAction, turnSubPhase]);

  const handleRevealFog = (edgeId: string) => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;
    const [firstVertex, secondVertex] = getEdgeVertices(edgeId);
    // Into the Unknown resolves a chest at the reached intersection before
    // revealing its neighboring hexes. The modal performs that discovery after
    // the irreversible treasure choice has been applied.
    if (selectedScenario === 'INTO_THE_UNKNOWN' && vertices.some(vertex =>
      (vertex.id === firstVertex || vertex.id === secondVertex) && vertex.treasureToken && !vertex.treasureToken.claimedBy
    )) return;
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

  const handleClaimTreasure = (edgeId: string) => {
    if (selectedScenario !== 'TREASURE_ISLANDS' && selectedScenario !== 'INTO_THE_UNKNOWN') return;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;
    const [firstVertex, secondVertex] = getEdgeVertices(edgeId);
    vertices.filter(vertex => (vertex.id === firstVertex || vertex.id === secondVertex) && vertex.treasureToken && !vertex.treasureToken.claimedBy)
      .forEach(vertex => {
        if (selectedScenario === 'INTO_THE_UNKNOWN') {
          setScenarioState((previous: any) => ({ ...previous, pendingTreasureId: vertex.treasureToken!.id }));
          return;
        }
        dispatchGameAction({ type: 'CLAIM_TREASURE', playerId: currentPlayer.id, treasureId: vertex.treasureToken!.id }, {
        roomId: roomId || undefined,
        isRemote: false,
        myPlayerId: roomId ? myPlayerId : currentPlayer.id,
        gamePhase,
        turnSubPhase,
        players,
        vertices,
        edges,
        tiles,
        setVertices,
        setPlayers,
        setTurnSubPhase,
        resourceBank,
        setResourceBank,
        setGoldSelectionQueue,
        setRoadBuildingRemaining,
        scenarioState,
        setScenarioState,
        devCardDeck,
        setDevCardDeck,
        addLog,
        });
      });
  };

  const handleGreaterCatanDiscovery = (edgeId: string) => {
    if (selectedScenario !== 'GREATER_CATAN') return;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;
    const [firstVertex, secondVertex] = getEdgeVertices(edgeId);
    (tiles || []).filter(tile => tile.numberToken === null && tile.islandId !== undefined && tile.islandId > 1 && !['WATER', 'DESERT'].includes(tile.type) &&
      getTileVertexIds(tile).some(vertexId => vertexId === firstVertex || vertexId === secondVertex)).forEach(tile => dispatchGameAction({
        type: 'DISCOVER_SCENARIO_HEX', playerId: currentPlayer.id, tileId: tile.id,
      }, {
        roomId: roomId || undefined, isRemote: false, myPlayerId: roomId ? myPlayerId : currentPlayer.id,
        players, vertices, edges, tiles, setTiles, scenarioState, setScenarioState, addLog,
      }));
  };

  const dispatchBuildAction = (action: Extract<GameAction, { type: 'BUILD_ROAD' | 'BUILD_SHIP' }>) => {
    dispatchGameAction(action, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : players[currentPlayerIndex]?.id,
      gamePhase,
      turnSubPhase,
      players,
      vertices,
      edges,
      tiles,
      setTiles,
      setEdges,
      setPlayers,
      resourceBank,
      setResourceBank,
      showBuildingCostToast,
      addLog,
      recordSetupPlacement,
      roadBuildingRemaining,
      setRoadBuildingRemaining,
      activeExpansion,
      selectedScenario,
      setupState,
    });
  };

  const buildRoadOnEdge = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isBot || (roomId && currentPlayer.id !== myPlayerId)) return;
    if (isSetupPhase) {
      dispatchBuildAction({ type: 'BUILD_ROAD', playerId: currentPlayer.id, edgeId: edge.id });
      handleRevealFog(edge.id);
      handleClaimTreasure(edge.id);
      handleGreaterCatanDiscovery(edge.id);
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
    handleClaimTreasure(edge.id);
    handleGreaterCatanDiscovery(edge.id);
  };

  const buildShipOnEdge = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isBot || (roomId && currentPlayer.id !== myPlayerId)) return;
    if (selectedScenario === 'PIRATE_ISLANDS' && !canExtendPirateShippingLine(tiles || [], vertices, edges, currentPlayer.id, edge)) {
      addLog('באיי הפיראטים מותר לבנות רק קו ספנות רציף אחד, ללא הסתעפויות ומעבר למבצר.');
      return;
    }
    if (isSetupPhase) {
      dispatchBuildAction({ type: 'BUILD_SHIP', playerId: currentPlayer.id, edgeId: edge.id });
      handleRevealFog(edge.id);
      handleClaimTreasure(edge.id);
      handleGreaterCatanDiscovery(edge.id);
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

    dispatchBuildAction({ type: 'BUILD_SHIP', playerId: currentPlayer.id, edgeId: edge.id });

    setCurrentTurnBuiltShips(prev => [...prev, edge.id]);

    if (!isFreeShip) {
      setCurrentAction(null);
    }
    
    handleRevealFog(edge.id);
    handleClaimTreasure(edge.id);
    handleGreaterCatanDiscovery(edge.id);
  };

  const handleEdgeClick = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isLocalPlayersTurn = !roomId || (!!myPlayerId && currentPlayer?.id === myPlayerId);
    if (!currentPlayer || currentPlayer.isBot || !isLocalPlayersTurn) return;

    const { isValidPlacement } = getEdgeConfig(edge);
    if (!isValidPlacement) return;

    if (currentAction === 'PLACE_HARBOR') {
      dispatchGameAction({ type: 'PLACE_HARBOR', playerId: currentPlayer.id, edgeId: edge.id }, {
        roomId: roomId || undefined,
        isRemote: false,
        myPlayerId: roomId ? myPlayerId : currentPlayer.id,
        players,
        vertices,
        edges,
        tiles,
        setVertices,
        setEdges,
        setPlayers,
        setTurnSubPhase,
        turnSubPhase,
        addLog,
      });
      return;
    }

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
    const bordersWater = boardRenderCache.edgeById.get(edge.id)?.hasWater || false;

    if (isSetupPhase && !isCoast && bordersWater) {
      const isValid = currentPlayer && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValid) {
        buildShipOnEdge(edge);
      }
      return;
    }

    if (isCoast) {
      if (isSeafarersExpansion(activeExpansion)) {
        setCoastlinePopupEdge(edge);
      } else {
        buildRoadOnEdge(edge);
      }
      return;
    }

    if (isSeafarersExpansion(activeExpansion) && bordersWater && !isCoast) {
      const isValid = currentPlayer && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles || [], gamePhase);
      if (isValid) {
        buildShipOnEdge(edge);
      }
      return;
    }

    if (roadBuildingRemaining > 0 && isSeafarersExpansion(activeExpansion)) {
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
