import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { validateSettlementPlacement } from '../utils/validation/validateSettlementPlacement';
import { useBoard } from '../context/BoardContext';
import { cubeToPixel } from '../utils/hexMath/cubeToPixel';

export function useVertexInteraction() {
  const { selectedScenario } = useBoard();
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
      ? validateSettlementPlacement(vertex.id, currentPlayer.id, gamePhase, vertices, edges, tiles, selectedScenario)
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

      let specialVPBonus = 0;
      let targetIslandId: number | undefined;

      if (selectedScenario === 'THROUGH_THE_DESERT') {
        const [, xStr, yStr] = vertex.id.split('_');
        const vX = parseFloat(xStr);
        const vY = parseFloat(yStr);

        const borderingTiles = (tiles || []).filter((tile: any) => {
          const center = cubeToPixel(tile.coord, 60);
          for (let i = 0; i < 6; i++) {
            const angleRad = (Math.PI / 180) * (60 * i - 30);
            const x = center.x + 60 * Math.cos(angleRad);
            const y = center.y + 60 * Math.sin(angleRad);
            const roundedX = Math.round(x * 10) / 10;
            const roundedY = Math.round(y * 10) / 10;
            if (roundedX === vX && roundedY === vY) return true;
          }
          return false;
        });

        const landTiles = borderingTiles.filter((t: any) => t.type !== 'WATER');
        const foreignIslandTile = landTiles.find((t: any) => t.islandId !== undefined && t.islandId > 1);

        if (foreignIslandTile) {
          targetIslandId = foreignIslandTile.islandId;
          let isFirstSettlementOnThisIsland = true;

          const playerVertices = (vertices || []).filter((v: any) => v.playerId === currentPlayer.id && (v.structure === 'SETTLEMENT' || v.structure === 'CITY'));
          for (const pv of playerVertices) {
            if (pv.id === vertex.id) continue;

            const [, pvXStr, pvYStr] = pv.id.split('_');
            const pvX = parseFloat(pvXStr);
            const pvY = parseFloat(pvYStr);
            const pvBorderingTiles = (tiles || []).filter((tile: any) => {
              const center = cubeToPixel(tile.coord, 60);
              for (let i = 0; i < 6; i++) {
                const angleRad = (Math.PI / 180) * (60 * i - 30);
                const x = center.x + 60 * Math.cos(angleRad);
                const y = center.y + 60 * Math.sin(angleRad);
                const roundedX = Math.round(x * 10) / 10;
                const roundedY = Math.round(y * 10) / 10;
                if (roundedX === pvX && roundedY === pvY) return true;
              }
              return false;
            });
            const touchesSameIsland = pvBorderingTiles.some((tile: any) => tile.islandId === targetIslandId);
            if (touchesSameIsland) {
              isFirstSettlementOnThisIsland = false;
              break;
            }
          }

          if (isFirstSettlementOnThisIsland) {
            specialVPBonus = 2;
          }
        }
      }

      setPlayers(prev => prev.map(p => p.id === currentPlayer.id 
        ? {
            ...p,
            victoryPoints: p.victoryPoints + 1 + specialVPBonus,
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
      if (specialVPBonus > 0 && targetIslandId !== undefined) {
        addLog(`🏆 ${currentPlayer.name} התיישב לראשונה באי זר (אי מספר ${targetIslandId}) וקיבל 2 נקודות ניצחון מיוחדות! (סה"כ 3 נקודות על היישוב)`);
      }
      return;
    }
  };

  return {
    getVertexConfig,
    handleVertexClick,
  };
}
