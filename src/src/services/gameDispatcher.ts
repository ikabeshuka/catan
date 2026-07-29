import { GameAction } from '../types/gameActions.types';
import { socketService } from './network/socketService';
import { cubeToPixel } from '../utils/hexMath/cubeToPixel';
import type { ResourceCards } from '../types/resources.types';

export interface DispatcherContext {
  roomId?: string;
  isRemote?: boolean;
  myPlayerId?: string | null;
  gamePhase?: string;
  turnSubPhase?: string;
  players?: any[];
  setVertices?: React.Dispatch<React.SetStateAction<any[]>>;
  setEdges?: React.Dispatch<React.SetStateAction<any[]>>;
  setPlayers?: React.Dispatch<React.SetStateAction<any[]>>;
  setTiles?: React.Dispatch<React.SetStateAction<any[]>>;
showBuildingCostToast?: (type: any, success: boolean, free?: boolean, errorMessage?: string) => void;
  addLog?: (message: string) => void;
  recordSetupPlacement?: (type: any, id: string) => void;
  handleDiceRoll?: (fixedValues?: [number, number]) => void;
  buyDevelopmentCard?: (forcedCardType?: string, targetPlayerId?: string) => boolean;
  endTurn?: () => void;
  roadBuildingRemaining?: number;
  setRoadBuildingRemaining?: React.Dispatch<React.SetStateAction<number>>;
  activeExpansion?: string;
  tiles?: any[];
  activeRobberType?: string | null;
  setRobberyState?: (state: any) => void;
  setTurnSubPhase?: (phase: any) => void;
  setActiveRobberType?: (type: 'ROBBER' | 'PIRATE' | null) => void;
  setHasMovedShipThisTurn?: (moved: boolean) => void;
  setIncomingTradeOffer?: (offer: any) => void;
  resourceBank?: ResourceCards;
  setResourceBank?: React.Dispatch<React.SetStateAction<ResourceCards>>;
  goldCoins?: Record<string, number>;
  setGoldCoins?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  goldSelectionQueue?: any[];
  setGoldSelectionQueue?: React.Dispatch<React.SetStateAction<any[]>>;
  [key: string]: any;
}

/**
 * Dispatches a game action, executing local logic and broadcasting to the network if in an active room.
 */
export function dispatchGameAction(action: GameAction, context?: DispatcherContext): void {
  console.log(`🎲 Dispatching Action [${context?.isRemote ? 'REMOTE' : 'LOCAL'}]:`, action);
  if (!context) return;

  // A local online action may only be issued for this client's assigned player.
  // Remote actions intentionally belong to another player and must be replayed
  // locally in order to keep every client on the same game state.
  if (!context.isRemote && action.playerId !== context.myPlayerId) {
    console.warn(`Local action security block: action.playerId (${action.playerId}) does not match myPlayerId (${context.myPlayerId})`);
    return;
  }

  // In an online room the server validates the action first and then echoes it
  // to every client, including the sender. Only that approved echo is applied.
  if (context.roomId && !context.isRemote) {
    socketService.sendAction(context.roomId, action);
    return;
  }

  const { type, playerId } = action;

  switch (type) {
    // --- 1. הטלת קוביות סנכרונית ---
    case 'ROLL_DICE': {
      if (context.handleDiceRoll) {
        context.handleDiceRoll(action.diceValues);
      }
      break;
    }

    case 'DISCARD_CARDS': {
      const { resourcesToDiscard } = action;
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const entries = Object.entries(resourcesToDiscard);
      const handSize = Object.values(player.resources).reduce((sum: number, count: any) => sum + Number(count || 0), 0);
      const selectedCount = entries.reduce((sum, [, amount]) => sum + Number(amount), 0);
      if (handSize <= 7 || selectedCount !== Math.floor(handSize / 2) || entries.some(([resource, amount]) =>
        !Number.isInteger(amount) || amount < 0 || amount > (player.resources[resource] || 0)
      )) return;

      context.setPlayers?.((prev: any[]) => {
        const updatedPlayers = prev.map(p => {
          if (p.id === playerId) {
            const updatedRes = { ...p.resources };
            Object.entries(resourcesToDiscard).forEach(([res, amt]) => {
              updatedRes[res] = Math.max(0, (updatedRes[res] || 0) - (amt as number));
            });
            return { ...p, resources: updatedRes };
          }
          return p;
        });

        const othersStillNeedToDiscard = updatedPlayers.some(p => 
          !p.isBot && Object.values(p.resources).reduce((sum: number, count: any) => sum + (count as number), 0) > 7
        );

        if (!othersStillNeedToDiscard && context.setTurnSubPhase) {
          context.addLog?.(`כל השחקנים סיימו לזרוק קלפים. השודד הופעל! יש למקם את השודד באריח חדש.`);
          context.setTurnSubPhase('ROBBER_PLACEMENT');
        }

        return updatedPlayers;
      });
      context.setResourceBank?.(previous => {
        const next = { ...previous };
        entries.forEach(([resource, amount]) => {
          const key = resource as keyof ResourceCards;
          next[key] = (next[key] || 0) + amount;
        });
        return next;
      });

      const resourceLabelsHE: Record<string, string> = {
        WOOD: 'עץ',
        BRICK: 'לבנה',
        SHEEP: 'כבש',
        WHEAT: 'חיטה',
        ORE: 'ברזל'
      };

      const discardedItemsLog = Object.entries(resourcesToDiscard)
        .filter(([_, val]) => (val as number) > 0)
        .map(([key, val]) => `${val} ${resourceLabelsHE[key] || key}`)
        .join(', ');

      context.addLog?.(`שחקן ${player.name} זרק קלפים לקופה: ${discardedItemsLog || 'ללא קלפים'}.`);
      break;
    }

    // --- 2. בניית יישוב ---
    case 'BUILD_SETTLEMENT': {
      const { vertexId } = action;
      const isSetupPhase = context.gamePhase === 'SETUP_ROUND_1' || context.gamePhase === 'SETUP_ROUND_2';
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const targetVertex = context.vertices?.find((vertex: any) => vertex.id === vertexId);
      if (!targetVertex || targetVertex.structure !== 'NONE') return;
      if (!isSetupPhase && (context.turnSubPhase !== 'TRADE_AND_BUILD' ||
          player.resources.WOOD < 1 || player.resources.BRICK < 1 || player.resources.SHEEP < 1 || player.resources.WHEAT < 1)) return;

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
        let specialVPBonus = 0;
        let targetIslandId: number | undefined;

        if (context.selectedScenario === 'THROUGH_THE_DESERT') {
          const [, xStr, yStr] = vertexId.split('_');
          const vX = parseFloat(xStr);
          const vY = parseFloat(yStr);

          const borderingTiles = (context.tiles || []).filter((tile: any) => {
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

            const playerVertices = (context.vertices || []).filter((v: any) => v.playerId === playerId && (v.structure === 'SETTLEMENT' || v.structure === 'CITY'));
            for (const pv of playerVertices) {
              if (pv.id === vertexId) continue;

              const [, pvXStr, pvYStr] = pv.id.split('_');
              const pvX = parseFloat(pvXStr);
              const pvY = parseFloat(pvYStr);
              const pvBorderingTiles = (context.tiles || []).filter((tile: any) => {
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
        context.setResourceBank?.(previous => ({
          ...previous,
          WOOD: previous.WOOD + 1,
          BRICK: previous.BRICK + 1,
          SHEEP: previous.SHEEP + 1,
          WHEAT: previous.WHEAT + 1,
        }));
        context.showBuildingCostToast?.('SETTLEMENT', true);
        context.addLog?.(`שחקן ${player.name} בנה יישוב!`);
        if (specialVPBonus > 0 && targetIslandId !== undefined) {
          context.addLog?.(`🏆 ${player.name} התיישב לראשונה באי זר (אי מספר ${targetIslandId}) וקיבל 2 נקודות ניצחון מיוחדות! (סה"כ 3 נקודות על היישוב)`);
        }
      }
      break;
    }

    // --- 3. בניית עיר ---
    case 'BUILD_CITY': {
      const { vertexId } = action;
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const cityTarget = context.vertices?.find((vertex: any) => vertex.id === vertexId);
      if (!cityTarget || cityTarget.structure !== 'SETTLEMENT' || cityTarget.playerId !== playerId ||
          context.turnSubPhase !== 'TRADE_AND_BUILD' || player.resources.WHEAT < 2 || player.resources.ORE < 3) return;

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
      context.setResourceBank?.(previous => ({ ...previous, WHEAT: previous.WHEAT + 2, ORE: previous.ORE + 3 }));
      context.showBuildingCostToast?.('CITY', true);
      context.addLog?.(`שחקן ${player.name} שדרג יישוב לעיר!`);
      break;
    }

    // --- 4. בניית כביש ---
    case 'BUILD_ROAD': {
      const { edgeId } = action;
      const isSetupPhase = context.gamePhase === 'SETUP_ROUND_1' || context.gamePhase === 'SETUP_ROUND_2';
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const roadTarget = context.edges?.find((edge: any) => edge.id === edgeId);
      if (!roadTarget || roadTarget.hasRoad || roadTarget.hasShip) return;

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
          if (context.turnSubPhase !== 'TRADE_AND_BUILD' || player.resources.WOOD < 1 || player.resources.BRICK < 1) return;
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
          context.setResourceBank?.(previous => ({ ...previous, WOOD: previous.WOOD + 1, BRICK: previous.BRICK + 1 }));
        }
        context.showBuildingCostToast?.('ROAD', true, isFreeRoad);
        context.addLog?.(`שחקן ${player.name} בנה כביש!`);
      }
      break;
    }

    // --- 5. בניית ספינה ---
    case 'BUILD_SHIP': {
      const { edgeId } = action;
      const isSetupPhase = context.gamePhase === 'SETUP_ROUND_1' || context.gamePhase === 'SETUP_ROUND_2';
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const shipTarget = context.edges?.find((edge: any) => edge.id === edgeId);
      if (!shipTarget || shipTarget.hasRoad || shipTarget.hasShip) return;

      context.setEdges?.((prev: any[]) => prev.map(e =>
        e.id === edgeId ? { ...e, hasShip: true, shipPlayerId: playerId } : e
      ));

      if (isSetupPhase) {
        context.showBuildingCostToast?.('SHIP', true, true);
        context.addLog?.(`שחקן ${player.name} בנה ספינה בשלב ההקמה (חינם).`);
        context.recordSetupPlacement?.('ROAD', edgeId);
      } else {
        const isFreeShip = (context.roadBuildingRemaining || 0) > 0 && context.activeExpansion === 'SEAFARERS';
        if (isFreeShip) {
          context.setRoadBuildingRemaining?.((prev: number) => prev - 1);
        } else {
          if (context.turnSubPhase !== 'TRADE_AND_BUILD' || player.resources.WOOD < 1 || player.resources.SHEEP < 1) return;
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
          context.setResourceBank?.(previous => ({ ...previous, WOOD: previous.WOOD + 1, SHEEP: previous.SHEEP + 1 }));
        }
        context.showBuildingCostToast?.('SHIP', true, isFreeShip);
        context.addLog?.(`שחקן ${player.name} בנה ספינה!`);
      }
      break;
    }

    // --- 6. קניית קלף פיתוח ---
    case 'BUY_DEV_CARD': {
      if (context.buyDevelopmentCard) {
        context.buyDevelopmentCard(action.cardType, playerId);
      }
      break;
    }

    case 'PLAY_DEV_CARD': {
      const { cardType, data } = action;
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const availableCardCount = (player.developmentCards?.[cardType] || 0) - (player.boughtDevCardsThisTurn?.[cardType] || 0);
      if (cardType === 'VICTORY_POINT' || availableCardCount <= 0 || player.playedDevCardThisTurn ||
          !['BEFORE_ROLL', 'TRADE_AND_BUILD'].includes(context.turnSubPhase || '')) return;

      const resourceLabels: Record<string, string> = {
        WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל'
      };

      if (cardType === 'MONOPOLY') {
        const resource = data?.resource;
        if (!resource) return;
        const stolen = (context.players || []).reduce((total: number, p: any) =>
          p.id === playerId ? total : total + (p.resources?.[resource] || 0), 0
        );

        context.setPlayers?.((prevPlayers: any[]) => prevPlayers.map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              resources: { ...p.resources, [resource]: (p.resources[resource] || 0) + stolen },
              playedDevCardThisTurn: true,
              developmentCards: {
                ...p.developmentCards,
                MONOPOLY: Math.max(0, (p.developmentCards.MONOPOLY || 0) - 1)
              }
            };
          }
          return { ...p, resources: { ...p.resources, [resource]: 0 } };
        }));
        context.addLog?.(`[קלף פיתוח] ${player.name} הפעיל קלף מונופול וקיבל ${stolen} קלפי ${resourceLabels[resource] || resource}.`);
        break;
      }

      if (cardType === 'YEAR_OF_PLENTY') {
        const resources = data?.resources;
        if (!resources || resources.length !== 2) return;
        const required = resources.reduce((counts: Record<string, number>, resource) => {
          counts[resource] = (counts[resource] || 0) + 1;
          return counts;
        }, {});
        if (Object.entries(required).some(([resource, amount]) =>
          (context.resourceBank?.[resource as keyof ResourceCards] || 0) < amount
        )) return;
        context.setPlayers?.((prevPlayers: any[]) => prevPlayers.map(p => {
          if (p.id !== playerId) return p;
          const updatedResources = { ...p.resources };
          resources.forEach(resource => {
            updatedResources[resource] = (updatedResources[resource] || 0) + 1;
          });
          return {
            ...p,
            resources: updatedResources,
            playedDevCardThisTurn: true,
            developmentCards: {
              ...p.developmentCards,
              YEAR_OF_PLENTY: Math.max(0, (p.developmentCards.YEAR_OF_PLENTY || 0) - 1)
            }
          };
        }));
        context.setResourceBank?.(previous => {
          const next = { ...previous };
          resources.forEach(resource => { next[resource] -= 1; });
          return next;
        });
        context.addLog?.(`[קלף פיתוח] ${player.name} הפעיל שנת שפע וקיבל ${resources.map(r => resourceLabels[r] || r).join(' ו-')}.`);
        break;
      }

      context.setPlayers?.((prevPlayers: any[]) => prevPlayers.map(p => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          knightsPlayed: cardType === 'KNIGHT' ? (p.knightsPlayed || 0) + 1 : p.knightsPlayed,
          playedDevCardThisTurn: true,
          devCardReturnSubPhase: cardType === 'KNIGHT'
            ? (context.turnSubPhase === 'BEFORE_ROLL' ? 'BEFORE_ROLL' : 'TRADE_AND_BUILD')
            : p.devCardReturnSubPhase,
          developmentCards: {
            ...p.developmentCards,
            [cardType]: Math.max(0, (p.developmentCards[cardType] || 0) - 1)
          }
        };
      }));

      if (cardType === 'KNIGHT') {
        context.setTurnSubPhase?.('ROBBER_PLACEMENT');
        context.setActiveRobberType?.(null);
        context.addLog?.(`[קלף פיתוח] ${player.name} הפעיל קלף אביר ומזיז את השודד!`);
      } else if (cardType === 'ROAD_BUILDING') {
        context.setRoadBuildingRemaining?.(2);
        context.addLog?.(`[קלף פיתוח] ${player.name} הפעיל קלף בניית דרכים וקיבל 2 בניות חינם.`);
      }
      break;
    }

    // --- 7. הזזת שודד וגניבה ---
    case 'MOVE_ROBBER': {
      const { tileId, hasEligibleVictims } = action;
      const targetTile = context.tiles?.find((t: any) => t.id === tileId);
      if (!targetTile) return;

      const activeRobberType = action.robberType || context.activeRobberType || 'ROBBER';

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

      const player = context.players?.find((p: any) => p.id === playerId);
      const returnSubPhase = player?.devCardReturnSubPhase || 'TRADE_AND_BUILD';
      context.addLog?.(`${player?.name || 'השחקן'} הזיז את ${activeRobberType === 'PIRATE' ? 'שודד הים' : 'השודד'} לאריח חדש.`);
      context.setActiveRobberType?.(null);
      if (!hasEligibleVictims) {
        context.setPlayers?.((prevPlayers: any[]) => prevPlayers.map(p =>
          p.id === playerId ? { ...p, devCardReturnSubPhase: undefined } : p
        ));
        context.setTurnSubPhase?.(returnSubPhase);
      }
      break;
    }

    case 'STEAL_RESOURCE': {
      const { victimPlayerId, stolenResource } = action;
      const victim = context.players?.find((p: any) => p.id === victimPlayerId);
      const stealer = context.players?.find((p: any) => p.id === playerId);
      if (!victim || !stealer) return;
      const returnSubPhase = stealer.devCardReturnSubPhase || 'TRADE_AND_BUILD';

      context.setPlayers?.((prevPlayers: any[]) => prevPlayers.map(p => {
        if (p.id === victimPlayerId) {
          return {
            ...p,
            resources: {
              ...p.resources,
              [stolenResource]: Math.max(0, (p.resources[stolenResource] || 0) - 1)
            }
          };
        }
        if (p.id === playerId) {
          return {
            ...p,
            devCardReturnSubPhase: undefined,
            resources: {
              ...p.resources,
              [stolenResource]: (p.resources[stolenResource] || 0) + 1
            }
          };
        }
        return p;
      }));

      context.addLog?.(`[שודד] ${stealer.name} שדד קלף ${stolenResource} מ-${victim.name}.`);
      context.setRobberyState?.(null);
      context.setTurnSubPhase?.(returnSubPhase);
      break;
    }

    // --- 8. הזזת ספינה פתוחה (Seafarers) ---
    case 'MOVE_SHIP': {
      const { fromEdgeId, toEdgeId } = action;
      const player = context.players?.find((p: any) => p.id === playerId);

      context.setEdges?.((prev: any[]) => prev.map(e => {
        if (e.id === fromEdgeId) return { ...e, hasShip: false, shipPlayerId: undefined };
        if (e.id === toEdgeId) return { ...e, hasShip: true, shipPlayerId: playerId };
        return e;
      }));

      context.setHasMovedShipThisTurn?.(true);
      context.addLog?.(`⛵ ${player?.name || 'שחקן'} העביר ספינה פתוחה למיקום חדש.`);
      break;
    }

    // --- 9. חשיפת אריח ערפל (Seafarers) ---
    case 'DISCOVER_FOG': {
      const { tileId, revealedTile } = action;
      const player = context.players?.find((p: any) => p.id === playerId);
      const fogTile = context.tiles?.find((tile: any) => tile.id === tileId);
      if (!player || fogTile?.type !== 'FOG') return;
      const revealedType = fogTile.originalType || revealedTile.type;
      const revealedNumber = fogTile.originalNumberToken ?? revealedTile.numberToken ?? null;

      context.setTiles?.((prev: any[]) => prev.map(t =>
        t.id === tileId ? { ...t, type: revealedType, numberToken: revealedNumber, revealed: true, isFog: false } : t
      ));

      if (revealedType === 'GOLD_FIELD') {
        context.setGoldSelectionQueue?.((previous: any[]) => [
          ...previous, { playerId, amount: 1, tileId },
        ]);
        context.setTurnSubPhase?.('GOLD_RESOURCE_SELECTION');
      } else if (['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].includes(revealedType) &&
          (context.resourceBank?.[revealedType as keyof ResourceCards] || 0) > 0) {
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
          ...candidate,
          resources: {
            ...candidate.resources,
            [revealedType]: (candidate.resources[revealedType] || 0) + 1,
          },
        } : candidate));
        context.setResourceBank?.(previous => ({
          ...previous,
          [revealedType]: previous[revealedType as keyof ResourceCards] - 1,
        }));
      }

      context.addLog?.(`🌫️ ${player?.name || 'שחקן'} חשף אריח ערפל!`);
      break;
    }

    // --- 10. בחירת משאב ממכרה זהב ---
    case 'SELECT_GOLD_RESOURCE': {
      const { resource } = action;
      const player = context.players?.find((p: any) => p.id === playerId);

      if ((context.resourceBank?.[resource] || 0) < 1) return;
      const pendingSelection = context.goldSelectionQueue?.[0];
      if (pendingSelection && pendingSelection.playerId !== playerId) return;
      context.setPlayers?.((prev: any[]) => prev.map(p =>
        p.id === playerId
          ? {
              ...p,
              resources: {
                ...p.resources,
                [resource]: (p.resources[resource] || 0) + 1
              }
            }
          : p
      ));
      context.setResourceBank?.(previous => ({ ...previous, [resource]: previous[resource] - 1 }));
      context.setGoldSelectionQueue?.(previous => {
        if (previous.length === 0) return previous;
        const [current, ...rest] = previous;
        if (current.amount > 1) return [{ ...current, amount: current.amount - 1 }, ...rest];
        if (rest.length === 0) context.setTurnSubPhase?.('TRADE_AND_BUILD');
        return rest;
      });

      context.addLog?.(`🪙 ${player?.name || 'שחקן'} קיבל משאב ${resource} ממכרה זהב.`);
      break;
    }

    case 'BANK_TRADE': {
      const { offeredResource, requestedResource, ratio } = action;
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!player || context.turnSubPhase !== 'TRADE_AND_BUILD' || offeredResource === requestedResource ||
          ![2, 3, 4].includes(ratio) || player.resources[offeredResource] < ratio ||
          (context.resourceBank?.[requestedResource] || 0) < 1) return;
      context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
        ...candidate,
        resources: {
          ...candidate.resources,
          [offeredResource]: candidate.resources[offeredResource] - ratio,
          [requestedResource]: candidate.resources[requestedResource] + 1,
        },
      } : candidate));
      context.setResourceBank?.(previous => ({
        ...previous,
        [offeredResource]: previous[offeredResource] + ratio,
        [requestedResource]: previous[requestedResource] - 1,
      }));
      context.addLog?.(`${player.name} ביצע מסחר עם הבנק ביחס ${ratio}:1.`);
      break;
    }

    case 'EXECUTE_PLAYER_TRADE': {
      const { targetPlayerId, offer, request } = action;
      const source = context.players?.find((candidate: any) => candidate.id === playerId);
      const target = context.players?.find((candidate: any) => candidate.id === targetPlayerId);
      const canPay = (candidate: any, cards: Partial<Record<keyof ResourceCards, number>>) =>
        Object.entries(cards).every(([resource, amount]) => (candidate.resources[resource] || 0) >= (amount || 0));
      if (!source || !target || context.turnSubPhase !== 'TRADE_AND_BUILD' || !canPay(source, offer) || !canPay(target, request)) return;
      context.setPlayers?.((previous: any[]) => previous.map(candidate => {
        if (candidate.id !== playerId && candidate.id !== targetPlayerId) return candidate;
        const resources = { ...candidate.resources };
        Object.entries(offer).forEach(([resource, amount]) => {
          resources[resource] += candidate.id === playerId ? -(amount || 0) : (amount || 0);
        });
        Object.entries(request).forEach(([resource, amount]) => {
          resources[resource] += candidate.id === playerId ? (amount || 0) : -(amount || 0);
        });
        return { ...candidate, resources };
      }));
      context.addLog?.(`[מסחר] ${source.name} ו-${target.name} השלימו עסקה.`);
      break;
    }

    case 'GOLD_TRADE': {
      const { requestedResource } = action;
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!player || context.turnSubPhase !== 'TRADE_AND_BUILD' || (context.goldCoins?.[playerId] || 0) < 2 ||
          (player.goldTradesThisTurn || 0) >= 2 || (context.resourceBank?.[requestedResource] || 0) < 1) return;
      context.setGoldCoins?.(previous => ({ ...previous, [playerId]: previous[playerId] - 2 }));
      context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
        ...candidate,
        goldTradesThisTurn: (candidate.goldTradesThisTurn || 0) + 1,
        resources: { ...candidate.resources, [requestedResource]: candidate.resources[requestedResource] + 1 },
      } : candidate));
      context.setResourceBank?.(previous => ({ ...previous, [requestedResource]: previous[requestedResource] - 1 }));
      context.addLog?.(`[זהב] ${player.name} החליף 2 מטבעות זהב במשאב.`);
      break;
    }

    case 'MOVE_WAGON': {
      const { targetVertexId, movementCost } = action;
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!player || ![1, 2].includes(movementCost) || (player.remainingMovementPoints || 0) < movementCost) return;
      context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
        ...candidate,
        wagonPosition: targetVertexId,
        remainingMovementPoints: (candidate.remainingMovementPoints || 0) - movementCost,
      } : candidate));
      break;
    }

    case 'UPGRADE_WAGON': {
      const { newLevel, payment } = action;
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!player || (player.wagonLevel || 1) + 1 !== newLevel) return;
      if (payment === 'RESOURCES' && (player.resources.WOOD < 1 || player.resources.ORE < 1)) return;
      if (payment === 'GOLD' && (context.goldCoins?.[playerId] || 0) < 3) return;
      context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
        ...candidate,
        wagonLevel: newLevel,
        remainingMovementPoints: newLevel === 2 ? 5 : 6,
        resources: payment === 'RESOURCES' ? {
          ...candidate.resources,
          WOOD: candidate.resources.WOOD - 1,
          ORE: candidate.resources.ORE - 1,
        } : candidate.resources,
      } : candidate));
      if (payment === 'RESOURCES') context.setResourceBank?.(previous => ({ ...previous, WOOD: previous.WOOD + 1, ORE: previous.ORE + 1 }));
      else context.setGoldCoins?.(previous => ({ ...previous, [playerId]: previous[playerId] - 3 }));
      break;
    }

    // --- 11. הצעת מסחר אונליין ---
    case 'PROPOSE_TRADE': {
      const { tradeOffer } = action;
      const player = context.players?.find((p: any) => p.id === playerId);

      if (context.setIncomingTradeOffer) {
        context.setIncomingTradeOffer({ proposerId: playerId, tradeOffer });
      }

      context.setPlayers?.((prev: any[]) => prev.map(p => p.id === playerId
        ? { ...p, activeTradeOffer: tradeOffer }
        : p
      ));

      context.addLog?.(`🤝 ${player?.name || 'שחקן'} הציע מסחר חדש.`);
      break;
    }

    // --- 12. אישור מסחר אונליין ---
    case 'ACCEPT_TRADE': {
      const { targetPlayerId } = action; // proposerId
      const proposer = context.players?.find((p: any) => p.id === targetPlayerId);
      const acceptor = context.players?.find((p: any) => p.id === playerId);

      const tradeOffer = proposer?.activeTradeOffer || (action as any).tradeOffer || context.incomingTradeOffer?.tradeOffer || context.activeTradeOffer;

      if (proposer && acceptor && tradeOffer) {
        const { offer, request } = tradeOffer;

        context.setPlayers?.((prev: any[]) => prev.map(p => {
          if (p.id === targetPlayerId) { // proposer
            const updatedResources = { ...p.resources };
            if (offer) {
              Object.entries(offer).forEach(([res, amt]) => {
                updatedResources[res] = Math.max(0, (updatedResources[res] || 0) - (amt as number));
              });
            }
            if (request) {
              Object.entries(request).forEach(([res, amt]) => {
                updatedResources[res] = (updatedResources[res] || 0) + (amt as number);
              });
            }
            return { ...p, resources: updatedResources, activeTradeOffer: null };
          }
          if (p.id === playerId) { // acceptor
            const updatedResources = { ...p.resources };
            if (offer) {
              Object.entries(offer).forEach(([res, amt]) => {
                updatedResources[res] = (updatedResources[res] || 0) + (amt as number);
              });
            }
            if (request) {
              Object.entries(request).forEach(([res, amt]) => {
                updatedResources[res] = Math.max(0, (updatedResources[res] || 0) - (amt as number));
              });
            }
            return { ...p, resources: updatedResources };
          }
          return p;
        }));
      }

      context.addLog?.(`✅ ${acceptor?.name || 'שחקן'} אישר את הצעת המסחר של ${proposer?.name || 'שחקן'}.`);
      break;
    }

    // --- 13. דחיית מסחר ---
    case 'DECLINE_TRADE': {
      const player = context.players?.find((p: any) => p.id === playerId);
      context.addLog?.(`❌ ${player?.name || 'שחקן'} דחה את הצעת המסחר.`);
      break;
    }

    // --- 14. סיום תור ---
    case 'END_TURN': {
      if (context.endTurn) {
        context.endTurn();
      }
      break;
    }

    default:
      console.warn('Unhandled game action type:', type);
  }

  // שידור ברשת
}
