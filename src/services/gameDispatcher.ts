import { GameAction } from '../types/gameActions.types';
import { stealRandomCard } from '../src/utils/gameEngine/robberSteal';

/**
 * Dispatches a game action, printing it to the console log and handling local logic.
 */
export function dispatchGameAction(action: GameAction, context?: any): void {
  console.log('Dispatching Game Action:', action, 'with context:', context);
  if (!context) return;

  const { type, playerId } = action;

  switch (type) {
    case 'ROLL_DICE': {
      if (context.handleDiceRoll) {
        context.handleDiceRoll();
      }
      break;
    }

    case 'BUILD_SETTLEMENT': {
      const { vertexId } = action;
      const isSetupPhase = context.gamePhase === 'SETUP_ROUND_1' || context.gamePhase === 'SETUP_ROUND_2';
      const player = context.players.find((p: any) => p.id === playerId);
      if (!player) return;

      context.setVertices?.((prev: any[]) => prev.map(v =>
        v.id === vertexId ? { ...v, structure: 'SETTLEMENT', playerId } : v
      ));

      if (isSetupPhase) {
        context.showBuildingCostToast?.('SETTLEMENT', true, true);
        context.addLog?.(`שחקן ${player.name} בנה יישוב בשלב ההקמה (חינם).`);
        if (context.recordSetupPlacement) {
          context.recordSetupPlacement('SETTLEMENT', vertexId);
        }
      } else {
        context.setPlayers?.((prev: any[]) => prev.map(p => p.id === playerId
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
        context.showBuildingCostToast?.('SETTLEMENT', true);
        context.addLog?.(`שחקן ${player.name} בנה יישוב! עלות: 1 עץ, 1 לבנה, 1 כבש, 1 חיטה.`);
      }
      break;
    }

    case 'BUILD_CITY': {
      const { vertexId } = action;
      const player = context.players.find((p: any) => p.id === playerId);
      if (!player) return;

      context.setPlayers?.((prev: any[]) => prev.map(p => p.id === playerId
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
      context.setVertices?.((prev: any[]) => prev.map(v =>
        v.id === vertexId ? { ...v, structure: 'CITY' } : v
      ));
      context.showBuildingCostToast?.('CITY', true);
      context.addLog?.(`שחקן ${player.name} שדרג יישוב לעיר! עלות: 3 ברזל, 2 חיטה.`);
      break;
    }

    case 'BUILD_ROAD': {
      const { edgeId } = action;
      const isSetupPhase = context.gamePhase === 'SETUP_ROUND_1' || context.gamePhase === 'SETUP_ROUND_2';
      const player = context.players.find((p: any) => p.id === playerId);
      if (!player) return;

      context.setEdges?.((prev: any[]) => prev.map(e =>
        e.id === edgeId ? { ...e, hasRoad: true, playerId } : e
      ));

      if (isSetupPhase) {
        context.showBuildingCostToast?.('ROAD', true, true);
        context.addLog?.(`שחקן ${player.name} בנה כביש בשלב ההקמה (חינם).`);
        if (context.recordSetupPlacement) {
          context.recordSetupPlacement('ROAD', edgeId);
        }
      } else {
        const isFreeRoad = (context.roadBuildingRemaining || 0) > 0;
        if (isFreeRoad) {
          context.setRoadBuildingRemaining?.((prev: number) => prev - 1);
        } else {
          context.setPlayers?.((prev: any[]) => prev.map(p => p.id === playerId
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
        context.showBuildingCostToast?.('ROAD', true, isFreeRoad);
        context.addLog?.(`שחקן ${player.name} בנה כביש! ${isFreeRoad ? '(חינם - קלף בניית כבישים)' : 'עלות: 1 עץ, 1 לבנה.'}`);
      }
      break;
    }

    case 'BUILD_SHIP': {
      const { edgeId } = action;
      const isSetupPhase = context.gamePhase === 'SETUP_ROUND_1' || context.gamePhase === 'SETUP_ROUND_2';
      const player = context.players.find((p: any) => p.id === playerId);
      if (!player) return;

      context.setEdges?.((prev: any[]) => prev.map(e =>
        e.id === edgeId ? { ...e, hasShip: true, shipPlayerId: playerId } : e
      ));

      if (isSetupPhase) {
        context.showBuildingCostToast?.('SHIP', true, true);
        context.addLog?.(`שחקן ${player.name} בנה ספינה בשלב ההקמה (חינם).`);
      } else {
        const isFreeShip = (context.roadBuildingRemaining || 0) > 0 && context.activeExpansion === 'SEAFARERS';
        if (isFreeShip) {
          context.setRoadBuildingRemaining?.((prev: number) => prev - 1);
        } else {
          context.setPlayers?.((prev: any[]) => prev.map(p => p.id === playerId
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
        context.showBuildingCostToast?.('SHIP', true, isFreeShip);
        context.addLog?.(`השחקן ${player.name} בנה ספינה! ${isFreeShip ? '(חינם - קלף בניית כבישים)' : 'עלות: 1 עץ, 1 כבש.'}`);
      }
      break;
    }

    case 'BUY_DEV_CARD': {
      if (context.buyDevelopmentCard) {
        context.buyDevelopmentCard();
      }
      break;
    }

    case 'MOVE_ROBBER': {
      const { tileId, victimPlayerId } = action;
      const targetTile = context.tiles?.find((t: any) => t.id === tileId);
      if (!targetTile) return;

      const activeRobberType = context.activeRobberType || 'ROBBER';

      context.setTiles?.((prevTiles: any[]) => prevTiles.map(t => {
        if (activeRobberType === 'PIRATE') {
          const nextT = { ...t };
          if (t.id === tileId) nextT.hasPirate = true;
          else if (t.hasPirate) nextT.hasPirate = false;
          return nextT;
        } else {
          const nextT = { ...t };
          if (t.id === tileId) nextT.hasRobber = true;
          else if (t.hasRobber) nextT.hasRobber = false;
          return nextT;
        }
      }));

      if (victimPlayerId) {
        const victim = context.players.find((p: any) => p.id === victimPlayerId);
        const stealer = context.players.find((p: any) => p.id === playerId);
        if (victim && stealer) {
          const { updatedPlayers } = stealRandomCard(playerId, victimPlayerId, context.players);
          context.setPlayers?.(updatedPlayers);

          context.addLog?.(`[שודד] ${stealer.name} שדד קלף משאב אקראי מ-${victim.name}.`);
        }
      }

      context.setRobberyState?.(null);
      context.setTurnSubPhase?.('TRADE_AND_BUILD');
      break;
    }

    case 'END_TURN': {
      if (context.endTurn) {
        context.endTurn();
      }
      break;
    }

    default:
      console.warn('Unknown game action type:', type);
  }
}
