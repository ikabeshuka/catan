import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { validateSettlementPlacement } from '../utils/validation/validateSettlementPlacement';
import { useBoard } from '../context/BoardContext';
import { dispatchGameAction } from '../services/gameDispatcher';
import { GameAction } from '../types/gameActions.types';

export function useVertexInteraction() {
  const { selectedScenario } = useBoard();
  const {
    vertices,
    edges,
    tiles,
    activeExpansion,
    gamePhase,
    turnSubPhase,
    players,
    currentPlayerIndex,
    isMovingWagon,
    setIsMovingWagon,
    setActivePortTrade,
    setVertices,
    showBuildingCostToast,
    addLog,
    setPlayers,
    roomId,
    myPlayerId,
    resourceBank,
    setResourceBank,
  } = useGame();

  const { isSetupPhase, setupState, recordSetupPlacement, moveWagon } = useTurnManager();

  const getVertexConfig = (vertex: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isLocalPlayersTurn = !roomId || (!!myPlayerId && currentPlayer?.id === myPlayerId);
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedSettlement;
    const isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateSettlementPlacement(vertex.id, currentPlayer.id, gamePhase, vertices, edges, tiles, selectedScenario, activeExpansion)
      : false;

    const isOwnSettlement = vertex.structure === 'SETTLEMENT' && vertex.playerId === currentPlayer?.id;
    const playerCitiesCount = vertices.filter(v => v.playerId === currentPlayer?.id && v.structure === 'CITY').length;
    const canUpgradeToCity = currentPlayer && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD' && isOwnSettlement && playerCitiesCount < 4;
    const isOwnedHarbor = vertex.isHarbor && vertex.playerId === currentPlayer?.id;
    const isClickable = ((isValidPlacement || canUpgradeToCity) || (isOwnedHarbor && turnSubPhase === 'TRADE_AND_BUILD')) && !currentPlayer?.isBot && isLocalPlayersTurn;

    const isSetupCity = isSetupPhase && activeExpansion === 'CITIES_AND_KNIGHTS' && gamePhase === 'SETUP_ROUND_2';
    return { isValidPlacement, canUpgradeToCity, isOwnedHarbor, isClickable, isSetupCity };
  };

  const handleVertexClick = (vertex: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isLocalPlayersTurn = !roomId || (!!myPlayerId && currentPlayer?.id === myPlayerId);
    if (!currentPlayer || currentPlayer.isBot || !isLocalPlayersTurn) return;

    const dispatchBuildAction = (action: Extract<GameAction, { type: 'BUILD_SETTLEMENT' | 'BUILD_CITY' }>) => {
      dispatchGameAction(action, {
        roomId: roomId || undefined,
        isRemote: false,
        myPlayerId: roomId ? myPlayerId : currentPlayer.id,
        gamePhase,
        turnSubPhase,
        players,
        vertices,
        edges,
        tiles,
        selectedScenario,
        activeExpansion,
        setVertices,
        setPlayers,
        resourceBank,
        setResourceBank,
        showBuildingCostToast,
        addLog,
        recordSetupPlacement,
      });
    };

    // Wagon movement click
    if (isMovingWagon) {
      const isWagonSelectable = (() => {
        if (!currentPlayer || !currentPlayer.wagonPosition || currentPlayer.wagonPosition === vertex.id) {
          return false;
        }
        const sortedIds = [currentPlayer.wagonPosition, vertex.id].sort();
        const edgeId = `e_${sortedIds[0]}_${sortedIds[1]}`;
        const edge = edges.find(e => e.id === edgeId);
        if (!edge) return false;
        const isOwner = edge.hasRoad && edge.playerId === currentPlayer.id;
        const cost = isOwner ? 1 : 2;
        const remainingPoints = currentPlayer.remainingMovementPoints !== undefined ? currentPlayer.remainingMovementPoints : 4;
        return remainingPoints >= cost;
      })();

      if (isWagonSelectable) {
        moveWagon?.(currentPlayer.id, vertex.id);
        const sortedIds = [currentPlayer.wagonPosition, vertex.id].sort();
        const edgeId = `e_${sortedIds[0]}_${sortedIds[1]}`;
        const edge = edges.find(e => e.id === edgeId);
        const isOwner = edge && edge.hasRoad && edge.playerId === currentPlayer.id;
        const cost = isOwner ? 1 : 2;
        const updatedPoints = (currentPlayer.remainingMovementPoints !== undefined ? currentPlayer.remainingMovementPoints : 4) - cost;
        if (updatedPoints <= 0 && setIsMovingWagon) {
          setIsMovingWagon(false);
        }
        return;
      }
    }

    const { isValidPlacement, canUpgradeToCity, isOwnedHarbor, isSetupCity } = getVertexConfig(vertex);

    // Harbor trade
    if (isOwnedHarbor && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD') {
      setActivePortTrade(vertex);
      return;
    }

    // Setup phase
    if (isSetupPhase) {
      if (!isValidPlacement) return;
      dispatchBuildAction({
        type: isSetupCity ? 'BUILD_CITY' : 'BUILD_SETTLEMENT',
        playerId: currentPlayer.id,
        vertexId: vertex.id,
      });
      return;
    }

    // Upgrade to city
    if (canUpgradeToCity) {
      const hasResources = currentPlayer.resources.WHEAT >= 2 && currentPlayer.resources.ORE >= 3;
      showBuildingCostToast('CITY', hasResources);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לשדרוג לעיר! נדרש: 3 ברזל, 2 חיטה.`);
        return;
      }

      dispatchBuildAction({
        type: 'BUILD_CITY',
        playerId: currentPlayer.id,
        vertexId: vertex.id,
      });
      return;
    }

    // Build regular settlement
    if (isValidPlacement) {
      if (turnSubPhase !== 'TRADE_AND_BUILD') return;

      const hasResources = currentPlayer.resources.WOOD >= 1 && 
                           currentPlayer.resources.BRICK >= 1 && 
                           currentPlayer.resources.SHEEP >= 1 && 
                           currentPlayer.resources.WHEAT >= 1;

      showBuildingCostToast('SETTLEMENT', hasResources);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לבניית יישוב! נדרש: 1 עץ, 1 לבנה, 1 כבש, 1 חיטה.`);
        return;
      }

      dispatchBuildAction({
        type: 'BUILD_SETTLEMENT',
        playerId: currentPlayer.id,
        vertexId: vertex.id,
      });
      return;
    }
  };

  return {
    getVertexConfig,
    handleVertexClick,
  };
}
