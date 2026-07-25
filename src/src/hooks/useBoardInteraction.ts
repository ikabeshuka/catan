import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { getEligibleRobberyTargets } from '../utils/gameEngine/robberSteal';
import { validateSettlementPlacement } from '../utils/validation/validateSettlementPlacement';
import { validateRoadPlacement } from '../utils/validation/validateRoadPlacement';
import { validateShipPlacement } from '../utils/validation/validateShipPlacement';
import { parseEdgeId } from '../utils/hexMath/parseEdgeId';
import { getOpenShipsForPlayer } from '../utils/gameEngine/getOpenShipsForPlayer';
import { cubeToPixel } from '../utils/hexMath/cubeToPixel';
import { getTileEdgeIds } from '../utils/gameEngine/generateEdges';

export function useBoardInteraction() {
  const { 
    tiles, 
    vertices, 
    edges, 
    setTiles, 
    setTurnSubPhase, 
    addLog, 
    setRobberyState,
    setVertices,
    setPlayers,
    gamePhase,
    setEdges,
    roadBuildingRemaining,
    showBuildingCostToast,
    setActivePortTrade,
    isMovingWagon,
    setIsMovingWagon,
    currentAction,
    setCurrentAction,
    players,
    currentPlayerIndex,
    turnSubPhase,
    activeExpansion,
    activeRobberType,
    setActiveRobberType,
    setCurrentTurnBuiltShips,
    selectedShipIdToMove,
    setSelectedShipIdToMove,
    setHasMovedShipThisTurn,
    currentTurnBuiltShips,
    setGoldSelectionQueue
  } = useGame();

  const { isSetupPhase, setupState, recordSetupPlacement, moveWagon } = useTurnManager();

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

  const [coastlinePopupEdge, setCoastlinePopupEdge] = useState<any | null>(null);

  const getEdgeVertices = (eId: string): [string, string] => {
    const withoutPrefix = eId.replace('e_', '');
    const parts = withoutPrefix.split('_v_');
    const v1 = parts[0];
    const v2 = 'v_' + parts[1];
    return [v1, v2];
  };

  const getTileVertexIds = (t: any): string[] => {
    const HEX_SIZE = 60;
    const center = cubeToPixel(t.coord, HEX_SIZE);
    const vertexIdsInHex: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i - 30);
      const x = center.x + HEX_SIZE * Math.cos(angleRad);
      const y = center.y + HEX_SIZE * Math.sin(angleRad);
      const roundedX = Math.round(x * 10) / 10;
      const roundedY = Math.round(y * 10) / 10;
      vertexIdsInHex.push(`v_${roundedX}_${roundedY}`);
    }
    return vertexIdsInHex;
  };

  const revealFogAdjacentToEdge = (edgeId: string) => {
    if (!tiles || tiles.length === 0) return;
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;

    const [v1, v2] = getEdgeVertices(edgeId);

    setTiles(prevTiles => prevTiles.map(tile => {
      // Find and reveal adjacent fog tiles by checking if they share either vertex of the placed edge
      if (tile.type === 'FOG') {
        const tileVertices = getTileVertexIds(tile);
        if (tileVertices.includes(v1) || tileVertices.includes(v2)) {
          const originalType = tile.originalType || 'WOOD';
          const originalNumberToken = tile.originalNumberToken !== undefined ? tile.originalNumberToken : null;

        const resourceHebrewNames: Record<string, string> = {
          WOOD: 'עץ',
          BRICK: 'לבנים',
          SHEEP: 'כבשים',
          WHEAT: 'חיטה',
          ORE: 'ברזל',
          DESERT: 'מדבר',
          GOLD_FIELD: 'אדמת זהב',
          WATER: 'מים',
          SEA: 'ים',
        };
        const resourceName = resourceHebrewNames[originalType] || originalType;
        addLog(`שחקן ${currentPlayer.name} גילה אריח ערפל! נחשף אריח מסוג ${resourceName}${originalNumberToken ? ` עם המספר ${originalNumberToken}` : ''}.`);

        // Discovery Bonus:
        if (originalType !== 'WATER' && originalType !== 'DESERT') {
          if (originalType === 'GOLD_FIELD') {
            setGoldSelectionQueue(prevQueue => [
              ...prevQueue,
              {
                playerId: currentPlayer.id,
                amount: 1,
                tileId: tile.id
              }
            ]);
            setTurnSubPhase('GOLD_RESOURCE_SELECTION');
            addLog(`🪙 אדמת זהב נחשפה! השחקן ${currentPlayer.name} מקבל משאב 1 לבחירה.`);
          } else {
            setPlayers(prevPlayers => prevPlayers.map(p => {
              if (p.id === currentPlayer.id) {
                return {
                  ...p,
                  resources: {
                    ...p.resources,
                    [originalType]: (p.resources[originalType as keyof typeof p.resources] || 0) + 1
                  }
                };
              }
              return p;
            }));
            addLog(`בונוס גילוי! שחקן ${currentPlayer.name} קיבל קלף משאב 1 מסוג ${resourceName}.`);
          }
        }

        return {
          ...tile,
          type: originalType,
          numberToken: originalNumberToken,
          revealed: true
        };
        }
      }
      return tile;
    }));
  };

  const checkIsCoastline = (edgeId: string) => {
    if (!tiles || tiles.length === 0) return false;
    const bordering = tiles.filter(t => getTileEdgeIds(t).includes(edgeId));
    const hasLand = bordering.some(t => t.type !== 'WATER' && t.type !== 'SEA' && t.type !== 'FOG');
    const hasWater = bordering.some(t => t.type === 'WATER' || t.type === 'SEA' || t.type === 'FOG');
    return hasLand && hasWater;
  };

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
      revealFogAdjacentToEdge(edge.id);
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
    revealFogAdjacentToEdge(edge.id);
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
      revealFogAdjacentToEdge(edge.id);
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
    revealFogAdjacentToEdge(edge.id);
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
      revealFogAdjacentToEdge(edge.id);
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
