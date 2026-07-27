import { GameAction } from '../types/gameActions.types';
import { socketService } from './network/socketService';
import { cubeToPixel } from '../utils/hexMath/cubeToPixel';

export interface DispatcherContext {
  roomId?: string;
  isRemote?: boolean;
  myPlayerId?: string | null;
  gamePhase?: string;
  players?: any[];
  setVertices?: React.Dispatch<React.SetStateAction<any[]>>;
  setEdges?: React.Dispatch<React.SetStateAction<any[]>>;
  setPlayers?: React.Dispatch<React.SetStateAction<any[]>>;
  setTiles?: React.Dispatch<React.SetStateAction<any[]>>;
showBuildingCostToast?: (type: any, success: boolean, free?: boolean, errorMessage?: string) => void;
  addLog?: (message: string) => void;
  recordSetupPlacement?: (type: any, id: string) => void;
  handleDiceRoll?: (fixedValues?: [number, number]) => void;
  buyDevelopmentCard?: (forcedCardType?: string) => void;
  endTurn?: () => void;
  roadBuildingRemaining?: number;
  setRoadBuildingRemaining?: React.Dispatch<React.SetStateAction<number>>;
  activeExpansion?: string;
  tiles?: any[];
  activeRobberType?: string | null;
  setRobberyState?: (state: any) => void;
  setTurnSubPhase?: (phase: any) => void;
  setIncomingTradeOffer?: (offer: any) => void;
  [key: string]: any;
}

/**
 * Dispatches a game action, executing local logic and broadcasting to the network if in an active room.
 */
export function dispatchGameAction(action: GameAction, context?: DispatcherContext): void {
  console.log(`🎲 Dispatching Action [${context?.isRemote ? 'REMOTE' : 'LOCAL'}]:`, action);
  if (!context) return;

  if (context.isRemote === true && action.playerId !== context.myPlayerId) {
    console.warn(`Action security block: action.playerId (${action.playerId}) does not match myPlayerId (${context.myPlayerId})`);
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
      const { resourcesToDiscard } = action as any;
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;

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
      context.addLog?.(`שחקן ${player.name} שדרג יישוב לעיר!`);
      break;
    }

    // --- 4. בניית כביש ---
    case 'BUILD_ROAD': {
      const { edgeId } = action;
      const isSetupPhase = context.gamePhase === 'SETUP_ROUND_1' || context.gamePhase === 'SETUP_ROUND_2';
      const player = context.players?.find((p: any) => p.id === playerId);
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
        context.addLog?.(`שחקן ${player.name} בנה ספינה!`);
      }
      break;
    }

    // --- 6. קניית קלף פיתוח ---
    case 'BUY_DEV_CARD': {
      if (context.buyDevelopmentCard) {
        context.buyDevelopmentCard(action.cardType);
      }
      break;
    }

    // --- 7. הזזת שודד וגניבה ---
    case 'MOVE_ROBBER': {
      const { tileId, victimPlayerId, stolenResource } = action;
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

      if (victimPlayerId && stolenResource && context.players) {
        const victim = context.players.find((p: any) => p.id === victimPlayerId);
        const stealer = context.players.find((p: any) => p.id === playerId);

        if (victim && stealer) {
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
                resources: {
                  ...p.resources,
                  [stolenResource]: (p.resources[stolenResource] || 0) + 1
                }
              };
            }
            return p;
          }));

          context.addLog?.(`[שודד] ${stealer.name} שדד קלף ${stolenResource} מ-${victim.name}.`);
        }
      }

      context.setRobberyState?.(null);
      context.setTurnSubPhase?.('TRADE_AND_BUILD');
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

      context.addLog?.(`⛵ ${player?.name || 'שחקן'} העביר ספינה פתוחה למיקום חדש.`);
      break;
    }

    // --- 9. חשיפת אריח ערפל (Seafarers) ---
    case 'DISCOVER_FOG': {
      const { tileId, revealedTile } = action;
      const player = context.players?.find((p: any) => p.id === playerId);

      context.setTiles?.((prev: any[]) => prev.map(t =>
        t.id === tileId ? { ...t, ...revealedTile, isFog: false } : t
      ));

      context.addLog?.(`🌫️ ${player?.name || 'שחקן'} חשף אריח ערפל!`);
      break;
    }

    // --- 10. בחירת משאב ממכרה זהב ---
    case 'SELECT_GOLD_RESOURCE': {
      const { resource } = action;
      const player = context.players?.find((p: any) => p.id === playerId);

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

      context.addLog?.(`🪙 ${player?.name || 'שחקן'} קיבל משאב ${resource} ממכרה זהב.`);
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
  if (context.roomId && !context.isRemote) {
    socketService.sendAction(context.roomId, action);
  }
}