import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { validateRoadPlacement } from '../utils/validation/validateRoadPlacement';
import { validateShipPlacement } from '../utils/validation/validateShipPlacement';
import { getOpenShipsForPlayer } from '../utils/gameEngine/getOpenShipsForPlayer';
import { getTileEdgeIds } from '../utils/gameEngine/generateEdges';
import { revealFogAdjacentToEdge } from '../utils/gameEngine/fogHelpers';

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
  } = useGame();

  const { isSetupPhase, setupState, recordSetupPlacement } = useTurnManager();

  const [coastlinePopupEdge, setCoastlinePopupEdge] = useState<any | null>(null);

  const checkIsCoastline = (edgeId: string) => {
    if (!tiles || tiles.length === 0) return false;
    const bordering = tiles.filter(t => getTileEdgeIds(t).includes(edgeId));
    const hasLand = bordering.some(t => t.type !== 'WATER' && t.type !== 'SEA' && t.type !== 'FOG');
    const hasWater = bordering.some(t => t.type === 'WATER' || t.type === 'SEA' || t.type === 'FOG');
    return hasLand && hasWater;
  };

  const getEdgeConfig = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedRoad;

    if (currentAction === 'MOVE_SHIP_SELECT') {
      const openShips = getOpenShipsForPlayer(currentPlayer.id, edges, vertices, currentTurnBuiltShips, tiles || []);
      const isOpenShip = openShips.some(s => s.id === edge.id);
      return { isValidPlacement: isOpenShip, isClickable: isOpenShip };
    }

    if (currentAction === 'MOVE_SHIP_PLACE') {
      if (edge.hasRoad || edge.hasShip) {
        return { isValidPlacement: false, isClickable: false };
      }
      const edgesWithoutMovingShip = edges.map(e => 
        e.id === selectedShipIdToMove ? { ...e, hasShip: false, shipPlayerId: undefined } : e
      );
      const isValidShip = validateShipPlacement(edge.id, currentPlayer.id, vertices, edgesWithoutMovingShip, tiles || [], gamePhase);
      return { isValidPlacement: isValidShip, isClickable: isValidShip };
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
      const isValidShip = currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      isValidPlacement = isValidRoad || isValidShip;
    } else if (isCoast) {
      const isValidRoad = currentPlayer && !isBlockedBySetup && validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
      const isValidShip = currentPlayer && !isBlockedBySetup && validateShipPlacement(edge.id, currentPlayer.id, vertices, edges, tiles, gamePhase);
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

    const isClickable = isValidPlacement && !currentPlayer?.isBot;

    return { isValidPlacement, isClickable };
  };

  const handleRevealFog = (edgeId: string) => {
    revealFogAdjacentToEdge({
      edgeId,
      tiles: tiles || [],
      players,
      currentPlayerIndex,
      setTiles,
      setPlayers,
      addLog,
      setGoldSelectionQueue,
      setTurnSubPhase,
    });
  };

  const buildRoadOnEdge = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (isSetupPhase) {
      setEdges(prevEdges => prevEdges.map(e => 
        e.id === edge.id 
          ? { ...e, hasRoad: true, playerId: currentPlayer.id } 
          : e
      ));
      recordSetupPlacement?.('ROAD', edge.id);
      showBuildingCostToast('ROAD', true, true);
      addLog(`שחקן ${currentPlayer.name} בנה כביש בשלב ההקמה (חינם).`);
      handleRevealFog(edge.id);
      return;
    }

    if (turnSubPhase !== 'TRADE_AND_BUILD') return;

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
    handleRevealFog(edge.id);
  };

  const buildShipOnEdge = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (isSetupPhase) {
      setEdges(prevEdges => prevEdges.map(e => 
        e.id === edge.id 
          ? { ...e, hasShip: true, shipPlayerId: currentPlayer.id } 
          : e
      ));
      recordSetupPlacement?.('ROAD', edge.id);
      showBuildingCostToast('SHIP', true, true);
      addLog(`שחקן ${currentPlayer.name} בנה ספינה בשלב ההקמה (חינם).`);
      handleRevealFog(edge.id);
      return;
    }

    if (turnSubPhase !== 'TRADE_AND_BUILD') return;

    const isFreeShip = roadBuildingRemaining > 0 && activeExpansion === 'SEAFARERS';
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

    setCurrentTurnBuiltShips(prev => [...prev, edge.id]);

    if (!isFreeShip) {
      setCurrentAction(null);
    }
    
    addLog(`השחקן ${currentPlayer.name} בנה ספינה! ${isFreeShip ? '(חינם - קלף בניית כבישים)' : 'עלות: 1 עץ, 1 כבש.'}`);
    handleRevealFog(edge.id);
  };

  const handleEdgeClick = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer?.isBot) return;

    const { isValidPlacement } = getEdgeConfig(edge);
    if (!isValidPlacement) return;

    if (currentAction === 'MOVE_SHIP_SELECT') {
      setSelectedShipIdToMove(edge.id);
      setCurrentAction('MOVE_SHIP_PLACE');
      addLog(`בחרת ספינה פתוחה להזזה. בחר כעת יעד חוקי (צלע מים/חוף הגובלת ברשת הספינות או המבנים שלך).`);
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
      setCoastlinePopupEdge(edge);
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
