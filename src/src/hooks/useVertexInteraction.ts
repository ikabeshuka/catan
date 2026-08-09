import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { validateSettlementPlacement } from '../utils/validation/validateSettlementPlacement';
import { useBoard } from '../context/BoardContext';
import { dispatchGameAction } from '../services/gameDispatcher';
import { GameAction } from '../types/gameActions.types';
import { isCitiesKnightsExpansion } from '../config/gameRules';
import { getTileVertexIds } from '../utils/hexMath/boardGeometryHelpers';

export function useVertexInteraction() {
  const { selectedScenario } = useBoard();
  const {
    vertices,
    edges,
    tiles,
    activeExpansion,
    mbScenarioId,
    gamePhase,
    turnSubPhase,
    players,
    currentPlayerIndex,
    isMovingWagon,
    setIsMovingWagon,
    setActivePortTrade,
    setVertices,
    setTiles,
    showBuildingCostToast,
    addLog,
    setPlayers,
    roomId,
    myPlayerId,
    resourceBank,
    setResourceBank,
    setActiveVertexPopover,
    scenarioState,
    setScenarioState,
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
    const touchesEnchantedLand = selectedScenario === 'ENCHANTED_LAND' && tiles.some(tile =>
      tile.scenarioMarker?.isEnchantedLand && getTileVertexIds(tile).includes(vertex.id));
    const cityLimit = selectedScenario === 'GREATER_CATAN' ? 8 : 4;
    const canUpgradeToCity = currentPlayer && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD' && isOwnSettlement && playerCitiesCount < cityLimit && !touchesEnchantedLand;
    const isOwnedHarbor = vertex.isHarbor && vertex.playerId === currentPlayer?.id;
    const isClickable = ((isValidPlacement || canUpgradeToCity) || (isOwnedHarbor && turnSubPhase === 'TRADE_AND_BUILD')) && !currentPlayer?.isBot && isLocalPlayersTurn;

    const isSetupCity = isSetupPhase && gamePhase === 'SETUP_ROUND_2' && (isCitiesKnightsExpansion(activeExpansion) ||
      (activeExpansion === 'MERCHANTS_AND_BARBARIANS' && mbScenarioId === 'MERCHANTS_AND_BARBARIANS'));
    return { isValidPlacement, canUpgradeToCity, isOwnedHarbor, isClickable, isSetupCity };
  };

  const dispatchAction = (action: GameAction) => {
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
      selectedScenario,
      activeExpansion,
      mbScenarioId,
      setVertices,
      setTiles,
      setPlayers,
      resourceBank,
      setResourceBank,
      scenarioState,
      setScenarioState,
      showBuildingCostToast,
      addLog,
      recordSetupPlacement,
    });
  };

  const getAvailableVertexActions = (vertexId: string) => {
    const vertex = vertices.find(v => v.id === vertexId);
    const currentPlayer = players[currentPlayerIndex];
    if (!vertex || !currentPlayer) return [];

    const availableActions: any[] = [];
    const { isValidPlacement, canUpgradeToCity } = getVertexConfig(vertex);

    // 1. Build Settlement
    if (isValidPlacement && turnSubPhase === 'TRADE_AND_BUILD' && !isSetupPhase) {
      const hasResources = (currentPlayer.resources?.WOOD || 0) >= 1 &&
                           (currentPlayer.resources?.BRICK || 0) >= 1 &&
                           (currentPlayer.resources?.SHEEP || 0) >= 1 &&
                           (currentPlayer.resources?.WHEAT || 0) >= 1;
      availableActions.push({
        type: 'BUILD_SETTLEMENT',
        label: 'בנה יישוב',
        cost: { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 },
        isAffordable: hasResources,
        description: 'הקם יישוב חדש המעניק נקודת ניצחון ומניב משאבים.',
        onClick: () => {
          dispatchAction({
            type: 'BUILD_SETTLEMENT',
            playerId: currentPlayer.id,
            vertexId: vertex.id,
          });
        }
      });
    }

    // 2. Upgrade to City
    if (canUpgradeToCity) {
      const hasResources = (currentPlayer.resources?.WHEAT || 0) >= 2 && (currentPlayer.resources?.ORE || 0) >= 3;
      availableActions.push({
        type: 'BUILD_CITY',
        label: 'שדרג לעיר',
        cost: { ORE: 3, WHEAT: 2 },
        isAffordable: hasResources,
        description: 'שדרג יישוב קיים לעיר המעניקה 2 נקודות ניצחון ומניבה משאבים כפולים.',
        onClick: () => {
          dispatchAction({
            type: 'BUILD_CITY',
            playerId: currentPlayer.id,
            vertexId: vertex.id,
          });
        }
      });
    }

    if (isCitiesKnightsExpansion(activeExpansion) && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD') {
      // 3. Build Knight
      const borderingEdges = edges.filter(e => e.id.includes(vertex.id));
      const isConnectedToOwnRoute = borderingEdges.some(e => 
        (e.playerId === currentPlayer.id && e.hasRoad) || 
        (e.shipPlayerId === currentPlayer.id && e.hasShip)
      );
      const canBuildKnight = vertex.structure === 'NONE' && !vertex.knight && isConnectedToOwnRoute;
      if (canBuildKnight) {
        const hasResources = (currentPlayer.resources?.ORE || 0) >= 1 && (currentPlayer.resources?.SHEEP || 0) >= 1;
        availableActions.push({
          type: 'BUILD_KNIGHT',
          label: 'גייס אביר',
          cost: { ORE: 1, SHEEP: 1 },
          isAffordable: hasResources,
          description: 'גייס אביר בסיסי להגנת קטאן ולהזזת השודד.',
          onClick: () => {
            dispatchAction({
              type: 'BUILD_KNIGHT',
              playerId: currentPlayer.id,
              vertexId: vertex.id,
            });
          }
        });
      }

      // 4. Activate Knight
      const isOwnKnight = vertex.knight && vertex.knight.playerId === currentPlayer.id;
      if (vertex.knight && isOwnKnight && !vertex.knight.active) {
        const hasResources = (currentPlayer.resources?.WHEAT || 0) >= 1;
        availableActions.push({
          type: 'ACTIVATE_KNIGHT',
          label: 'הפעל אביר',
          cost: { WHEAT: 1 },
          isAffordable: hasResources,
          description: 'הפעל את האביר שלך כדי שיוכל להילחם או לזוז.',
          onClick: () => {
            dispatchAction({
              type: 'ACTIVATE_KNIGHT',
              playerId: currentPlayer.id,
              vertexId: vertex.id,
            });
          }
        });
      }

      // 5. Upgrade Knight
      if (vertex.knight && isOwnKnight) {
        const politicsLevel = currentPlayer.cityImprovements?.POLITICS || 0;
        const maxLevel = politicsLevel >= 3 ? 3 : 2;
        const canUpgradeKnight = vertex.knight.level < maxLevel;
        if (canUpgradeKnight) {
          const isFreePromotion = (currentPlayer.freeKnightPromotions || 0) > 0;
          const hasResources = isFreePromotion || ((currentPlayer.resources?.ORE || 0) >= 1 && (currentPlayer.resources?.SHEEP || 0) >= 1);
          availableActions.push({
            type: 'UPGRADE_KNIGHT',
            label: 'שדרג אביר',
            cost: isFreePromotion ? {} : { ORE: 1, SHEEP: 1 },
            isAffordable: hasResources,
            description: isFreePromotion ? 'שדרג את האביר שלך לדרגה הבאה בחינם!' : 'שדרג את האביר שלך לדרגה הבאה.',
            onClick: () => {
              dispatchAction({
                type: 'UPGRADE_KNIGHT',
                playerId: currentPlayer.id,
                vertexId: vertex.id,
              });
            }
          });
        }
      }

      // 6. Build City Wall
      const isOwnCity = vertex.structure === 'CITY' && vertex.playerId === currentPlayer.id;
      if (isOwnCity && !vertex.cityWall) {
        const hasResources = (currentPlayer.resources?.BRICK || 0) >= 2;
        availableActions.push({
          type: 'BUILD_CITY_WALL',
          label: 'בנה חומת עיר',
          cost: { BRICK: 2 },
          isAffordable: hasResources,
          description: 'חומת עיר מגדילה את הגנת העיר מפני תקיפת ברברים ומקנה הגנה על קלפים.',
          onClick: () => {
            dispatchAction({
              type: 'BUILD_CITY_WALL',
              playerId: currentPlayer.id,
              vertexId: vertex.id,
            });
          }
        });
      }
    }

    return availableActions;
  };

  const handleVertexClick = (vertex: any, event?: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isLocalPlayersTurn = !roomId || (!!myPlayerId && currentPlayer?.id === myPlayerId);
    if (!currentPlayer || currentPlayer.isBot || !isLocalPlayersTurn) return;

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

    const { isOwnedHarbor } = getVertexConfig(vertex);

    // Harbor trade
    if (isOwnedHarbor && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD') {
      setActivePortTrade(vertex);
      return;
    }

    // Contextual actions check for regular phase
    if (!isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD') {
      const actions = getAvailableVertexActions(vertex.id);

      if (actions.length > 1) {
        if (setActiveVertexPopover) {
          setActiveVertexPopover({
            vertexId: vertex.id,
            screenCoords: event && typeof event.clientX === 'number' && typeof event.clientY === 'number'
              ? { x: event.clientX, y: event.clientY }
              : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
          });
        }
        return;
      }

      if (actions.length === 1) {
        actions[0].onClick();
        return;
      }
    }

    // Fallback for setup phase or any other state
    const { isValidPlacement, canUpgradeToCity, isSetupCity } = getVertexConfig(vertex);

    if (isSetupPhase) {
      if (!isValidPlacement) return;
      dispatchAction({
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

      dispatchAction({
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

      dispatchAction({
        type: 'BUILD_SETTLEMENT',
        playerId: currentPlayer.id,
        vertexId: vertex.id,
      });
      return;
    }
  };

  return {
    getVertexConfig,
    getAvailableVertexActions,
    handleVertexClick,
  };
}
