import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { validateSettlementPlacement } from '../utils/validation/validateSettlementPlacement';

export function useVertexInteraction() {
  const {
    vertices,
    edges,
    tiles,
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
  } = useGame();

  const { isSetupPhase, setupState, recordSetupPlacement, moveWagon } = useTurnManager();

  const getVertexConfig = (vertex: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedSettlement;
    const isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateSettlementPlacement(vertex.id, currentPlayer.id, gamePhase, vertices, edges, tiles)
      : false;

    const isOwnSettlement = vertex.structure === 'SETTLEMENT' && vertex.playerId === currentPlayer?.id;
    const canUpgradeToCity = currentPlayer && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD' && isOwnSettlement;
    const isOwnedHarbor = vertex.isHarbor && vertex.playerId === currentPlayer?.id;
    const isClickable = ((isValidPlacement || canUpgradeToCity) || (isOwnedHarbor && turnSubPhase === 'TRADE_AND_BUILD')) && !currentPlayer?.isBot;

    return { isValidPlacement, canUpgradeToCity, isOwnedHarbor, isClickable };
  };

  const handleVertexClick = (vertex: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer?.isBot) return;

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

    const { isValidPlacement, canUpgradeToCity, isOwnedHarbor } = getVertexConfig(vertex);

    // Harbor trade
    if (isOwnedHarbor && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD') {
      setActivePortTrade(vertex);
      return;
    }

    // Setup phase
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

    // Upgrade to city
    if (canUpgradeToCity) {
      const hasResources = currentPlayer.resources.WHEAT >= 2 && currentPlayer.resources.ORE >= 3;
      showBuildingCostToast('CITY', hasResources);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לשדרוג לעיר! נדרש: 3 ברזל, 2 חיטה.`);
        return;
      }

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

  return {
    getVertexConfig,
    handleVertexClick,
  };
}
