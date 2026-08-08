import { GameAction } from '../types/gameActions.types';
import { socketService } from './network/socketService';
import { cubeToPixel } from '../utils/hexMath/cubeToPixel';
import type { ResourceCards } from '../types/resources.types';
import { validateSettlementPlacement } from '../utils/validation/validateSettlementPlacement';
import { getEdgeVertices, getTileVertexIds } from '../utils/hexMath/boardGeometryHelpers';
import { getTileEdgeIds } from '../utils/gameEngine/generateEdges';
import { claimLostTribeReward, getEligibleHarborEdges, getLostTribeRewardLog, getReachedLostTribeVillageIds } from '../utils/gameEngine/lostTribeHelpers';
import { getPirateShippingLine, getPirateShippingPath } from '../utils/gameEngine/pirateIslands';
import { isCitiesKnightsExpansion, isSeafarersExpansion } from '../config/gameRules';

export interface DispatcherContext {
  roomId?: string;
  isRemote?: boolean;
  myPlayerId?: string | null;
  /** The room host is allowed to submit actions on behalf of server-owned bots. */
  allowBotControl?: boolean;
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
  handleDiceRoll?: (fixedValues?: [number, number] | [number, number, number], eventDie?: string) => void;
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

const addLocalDesertDragons = (context: DispatcherContext) => {
  if (context.selectedScenario !== 'DESERT_DRAGONS' || String(context.gamePhase).startsWith('SETUP_')) return;
  const existingCount = (context.tiles || []).filter((tile: any) => tile.type === 'DESERT')
    .reduce((sum: number, tile: any) => sum + (tile.scenarioMarker?.dragonIds || []).length, 0);
  const plannedAmount = Math.min(18 - existingCount, (context.players?.length || 4) === 3 ? 3 : 2);
  context.setTiles?.((previous: any[]) => {
    const deserts = previous.filter(tile => tile.type === 'DESERT').slice(0, 3);
    const placed = deserts.reduce((sum, tile) => sum + (tile.scenarioMarker?.dragonIds || []).length, 0);
    const amount = Math.min(18 - placed, (context.players?.length || 4) === 3 ? 3 : 2);
    const addedByTile = new Map<string, string[]>();
    for (let index = 0; index < amount; index += 1) {
      deserts.sort((a, b) => ((a.scenarioMarker?.dragonIds || []).length + (addedByTile.get(a.id)?.length || 0)) - ((b.scenarioMarker?.dragonIds || []).length + (addedByTile.get(b.id)?.length || 0)));
      const target = deserts[0];
      addedByTile.set(target.id, [...(addedByTile.get(target.id) || []), `desert-dragon-${Date.now()}-${index}`]);
    }
    return previous.map(tile => addedByTile.has(tile.id) ? {
      ...tile,
      scenarioMarker: { ...tile.scenarioMarker, dragonIds: [...(tile.scenarioMarker?.dragonIds || []), ...addedByTile.get(tile.id)!] },
    } : tile);
  });
  if (existingCount + plannedAmount >= 18) {
    context.setScenarioState?.((previous: any) => ({ ...previous, dragonsHaveAttacked: true }));
  }
};

const tryBuildLocalCanal = (context: DispatcherContext, vertexId: string) => {
  if (context.selectedScenario !== 'GREAT_CANAL' || !context.scenarioState) return;
  const completed = new Set(context.scenarioState.completedCanalIds || []);
  const canalTile = (context.tiles || []).find((tile: any) => tile.scenarioMarker?.canalId && !completed.has(tile.scenarioMarker.canalId) &&
    getTileVertexIds(tile).includes(vertexId) && getTileVertexIds(tile).filter(id => id === vertexId || context.vertices?.find((vertex: any) => vertex.id === id)?.knight?.active).length >= 2);
  if (!canalTile) return;
  const owners = getTileVertexIds(canalTile).map(id => id === vertexId ? context.players?.find((player: any) => player.id === context.myPlayerId)?.id : context.vertices?.find((vertex: any) => vertex.id === id)?.knight?.playerId)
    .filter(Boolean).slice(0, 2);
  completed.add(canalTile.scenarioMarker.canalId);
  const allCanalIds = (context.tiles || []).flatMap((tile: any) => tile.scenarioMarker?.canalId ? [tile.scenarioMarker.canalId] : []);
  const complete = completed.size >= 8;
  const finalCompleted = complete ? allCanalIds : [...completed];
  context.setScenarioState?.((previous: any) => ({ ...previous, completedCanalIds: finalCompleted, isCanalComplete: complete }));
  context.setTiles?.((previous: any[]) => previous.map(tile => tile.id === canalTile.id || (complete && tile.scenarioMarker?.canalId)
    ? { ...tile, scenarioMarker: { ...tile.scenarioMarker, canalBuilt: true, ...(complete ? { infertileField: false } : {}) } }
    : complete && tile.scenarioMarker?.infertileField ? { ...tile, scenarioMarker: { ...tile.scenarioMarker, infertileField: false } }
    : tile));
  context.setPlayers?.((previous: any[]) => previous.map(player => owners.includes(player.id)
    ? { ...player, canalChits: (player.canalChits || 0) + 1, victoryPoints: (player.victoryPoints || 0) + 1 } : player));
};

/**
 * Dispatches a game action, executing local logic and broadcasting to the network if in an active room.
 */
export function dispatchGameAction(action: GameAction, context?: DispatcherContext): void {
  console.log(`🎲 Dispatching Action [${context?.isRemote ? 'REMOTE' : 'LOCAL'}]:`, action);
  if (!context) return;

  // A local online action may only be issued for this client's assigned player.
  // Remote actions intentionally belong to another player and must be replayed
  // locally in order to keep every client on the same game state.
  const controlsBot = Boolean(context.allowBotControl && context.players?.some((player: any) => player.id === action.playerId && player.isBot));
  if (!context.isRemote && action.playerId !== context.myPlayerId && !controlsBot) {
    console.warn(`Local action security block: action.playerId (${action.playerId}) does not match myPlayerId (${context.myPlayerId})`);
    return;
  }

  // In an online room the server validates the action first and then echoes it
  // to every client, including the sender. Only that approved echo is applied.
  if (context.roomId && !context.isRemote) {
    const requestAction = { ...action } as GameAction;
    if (requestAction.type === 'ROLL_DICE') {
      delete requestAction.diceValues;
      delete requestAction.eventDie;
    }
    if (requestAction.type === 'STEAL_RESOURCE') delete requestAction.stolenResource;
    if (requestAction.type === 'MOVE_ROBBER') {
      delete requestAction.hasEligibleVictims;
      delete requestAction.eligibleVictimPlayerIds;
    }
    socketService.sendAction(context.roomId, requestAction);
    return;
  }

  const { type, playerId } = action;

  switch (type) {
    // --- 1. הטלת קוביות סנכרונית ---
    case 'ROLL_DICE': {
      if (context.handleDiceRoll && action.diceValues) {
        context.handleDiceRoll(action.diceValues, action.eventDie);
      }
      break;
    }

    case 'DISCARD_CARDS': {
      const { resourcesToDiscard, commoditiesToDiscard = {} } = action;
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const entries = Object.entries(resourcesToDiscard);
      const handSize = Object.values(player.resources).reduce((sum: number, count: any) => sum + Number(count || 0), 0) +
        (isCitiesKnightsExpansion(context.activeExpansion) ? Object.values(player.commodities || {}).reduce((sum: number, count: any) => sum + Number(count || 0), 0) : 0);
      const handLimit = 7 + (isCitiesKnightsExpansion(context.activeExpansion)
        ? 2 * (context.vertices || []).filter((vertex: any) => vertex.playerId === playerId && vertex.cityWall).length : 0);
      const sabotageEntry = context.turnSubPhase === 'SABOTEUR_DISCARD'
        ? context.citiesKnightsState?.sabotageDiscardQueue?.[0] : null;
      const selectedCount = entries.reduce((sum, [, amount]) => sum + Number(amount), 0) + Object.values(commoditiesToDiscard).reduce((sum: number, amount: any) => sum + Number(amount), 0);
      const requiredDiscard = sabotageEntry?.amount ?? Math.floor(handSize / 2);
      if ((sabotageEntry && sabotageEntry.playerId !== playerId) || (!sabotageEntry && handSize <= handLimit) || selectedCount !== requiredDiscard || entries.some(([resource, amount]) =>
        !Number.isInteger(amount) || amount < 0 || amount > (player.resources[resource] || 0)
      ) || Object.entries(commoditiesToDiscard).some(([commodity, amount]) => !Number.isInteger(amount) || amount < 0 || amount > (player.commodities?.[commodity] || 0))) return;

      context.setPlayers?.((prev: any[]) => {
        const updatedPlayers = prev.map(p => {
          if (p.id === playerId) {
            const updatedRes = { ...p.resources };
            Object.entries(resourcesToDiscard).forEach(([res, amt]) => {
              updatedRes[res] = Math.max(0, (updatedRes[res] || 0) - (amt as number));
            });
            const updatedCommodities = { ...(p.commodities || {}) };
            Object.entries(commoditiesToDiscard).forEach(([commodity, amount]) => {
              updatedCommodities[commodity] = Math.max(0, (updatedCommodities[commodity] || 0) - (amount as number));
            });
            return { ...p, resources: updatedRes, commodities: updatedCommodities };
          }
          return p;
        });

        const othersStillNeedToDiscard = updatedPlayers.some(p => 
          !p.isBot && Object.values(p.resources).reduce((sum: number, count: any) => sum + (count as number), 0) > 7
        );

        if (!sabotageEntry && !othersStillNeedToDiscard && context.setTurnSubPhase) {
          context.addLog?.(`כל השחקנים סיימו לזרוק קלפים. השודד הופעל! יש למקם את השודד באריח חדש.`);
          if (context.selectedScenario === 'PIRATE_ISLANDS' || context.selectedScenario === 'DESERT_DRAGONS') {
            const targets = updatedPlayers.filter(candidate => candidate.id !== playerId && Object.values(candidate.resources).reduce((sum: number, amount: any) => sum + Number(amount), 0) > 0);
            context.setRobberyState?.(targets.length ? { tile: context.tiles?.find((tile: any) => tile.hasPirate) || context.tiles?.[0], targets } : null);
            context.setTurnSubPhase(targets.length ? 'ROBBER_STEAL' : 'TRADE_AND_BUILD');
          } else {
            context.setTurnSubPhase('ROBBER_PLACEMENT');
          }
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
      context.setCommodityBank?.((previous: any) => {
        const next = { ...previous };
        Object.entries(commoditiesToDiscard).forEach(([commodity, amount]) => { next[commodity] = (next[commodity] || 0) + Number(amount); });
        return next;
      });
      if (sabotageEntry) {
        const queueLength = context.citiesKnightsState?.sabotageDiscardQueue?.length || 0;
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, sabotageDiscardQueue: (previous.sabotageDiscardQueue || []).slice(1) }));
        if (queueLength <= 1) context.setTurnSubPhase?.('TRADE_AND_BUILD');
      }

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
    case 'GIVE_PROGRESS_CARDS': {
      const wedding = context.turnSubPhase === 'WEDDING_GIVE' ? context.citiesKnightsState?.weddingGiveQueue?.[0] : null;
      const harbor = context.turnSubPhase === 'COMMERCIAL_HARBOR_GIVE' ? context.citiesKnightsState?.commercialHarborQueue?.[0] : null;
      const returnOffer = context.turnSubPhase === 'COMMERCIAL_HARBOR_RETURN' ? context.citiesKnightsState?.commercialHarborOffer : null;
      const entry = wedding || harbor || returnOffer;
      const recipientId = action.targetPlayerId;
      const resourcesToGive = action.resourcesToGive || {};
      const commoditiesToGive = action.commoditiesToGive || {};
      const amount = Object.values(resourcesToGive).reduce((sum: number, value: any) => sum + Number(value || 0), 0) +
        Object.values(commoditiesToGive).reduce((sum: number, value: any) => sum + Number(value || 0), 0);
      const requiredAmount = (harbor || returnOffer) ? 1 : wedding?.amount;
      if (!entry || entry.playerId !== playerId || entry.recipientId !== recipientId || amount !== requiredAmount) return;
      const giver = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!giver || Object.entries(resourcesToGive).some(([key, value]: [string, any]) => (giver.resources?.[key] || 0) < value) ||
          Object.entries(commoditiesToGive).some(([key, value]: [string, any]) => (giver.commodities?.[key] || 0) < value)) return;
      context.setPlayers?.((previous: any[]) => previous.map(candidate => {
        if (candidate.id !== playerId && candidate.id !== recipientId) return candidate;
        const isGiver = candidate.id === playerId;
        return {
          ...candidate,
          resources: Object.fromEntries(Object.entries(candidate.resources || {}).map(([key, value]) => [key, Number(value) + (isGiver ? -Number((resourcesToGive as any)[key] || 0) : Number((resourcesToGive as any)[key] || 0))])),
          commodities: Object.fromEntries(Object.entries(candidate.commodities || {}).map(([key, value]) => [key, Number(value) + (isGiver ? -Number((commoditiesToGive as any)[key] || 0) : Number((commoditiesToGive as any)[key] || 0))])),
        };
      }));
      if (context.turnSubPhase === 'WEDDING_GIVE') {
        const queueLength = context.citiesKnightsState?.weddingGiveQueue?.length || 0;
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, weddingGiveQueue: (previous.weddingGiveQueue || []).slice(1) }));
        if (queueLength <= 1) context.setTurnSubPhase?.('TRADE_AND_BUILD');
      } else if (context.turnSubPhase === 'COMMERCIAL_HARBOR_GIVE') {
        const category = Object.values(resourcesToGive).some(value => Number(value || 0) > 0) ? 'RESOURCE' : 'COMMODITY';
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, commercialHarborOffer: { playerId: recipientId, recipientId: playerId, category } }));
        context.setTurnSubPhase?.('COMMERCIAL_HARBOR_RETURN');
      } else if (context.turnSubPhase === 'COMMERCIAL_HARBOR_RETURN') {
        const queueLength = context.citiesKnightsState?.commercialHarborQueue?.length || 0;
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, commercialHarborQueue: (previous.commercialHarborQueue || []).slice(1), commercialHarborOffer: undefined }));
        context.setTurnSubPhase?.(queueLength <= 1 ? 'TRADE_AND_BUILD' : 'COMMERCIAL_HARBOR_GIVE');
      }
      break;
    }

    // --- 2. בניית יישוב ---
    case 'BUILD_SETTLEMENT': {
      const { vertexId } = action;
      const isSetupPhase = ['SETUP_ROUND_1', 'SETUP_ROUND_2', 'SETUP_ROUND_3'].includes(context.gamePhase || '');
      if (isCitiesKnightsExpansion(context.activeExpansion) && context.gamePhase === 'SETUP_ROUND_2') return;
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const targetVertex = context.vertices?.find((vertex: any) => vertex.id === vertexId);
      if (!targetVertex || targetVertex.structure !== 'NONE' || !context.setVertices) return;
      if (!validateSettlementPlacement(
        vertexId,
        playerId,
        context.gamePhase as any,
        context.vertices || [],
        context.edges || [],
        context.tiles,
        context.selectedScenario,
        context.activeExpansion
      )) return;
      if (!isSetupPhase && (context.turnSubPhase !== 'TRADE_AND_BUILD' ||
          player.resources.WOOD < 1 || player.resources.BRICK < 1 || player.resources.SHEEP < 1 || player.resources.WHEAT < 1 ||
          !context.setPlayers)) return;

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
        if (context.selectedScenario === 'TREASURE_ISLANDS') {
          const targetIslandIds = (context.tiles || [])
            .filter((tile: any) => getTileVertexIds(tile).includes(vertexId) && tile.islandId !== undefined)
            .map((tile: any) => tile.islandId as number);
          const homeIslands = player.homeIslandIds?.length ? player.homeIslandIds : [player.homeIslandId];
          const newIslandId = targetIslandIds.find((id: number) => !homeIslands.includes(id) && !(player.treasureIslandIds || []).includes(id));
          if (newIslandId !== undefined) {
            targetIslandId = newIslandId;
            specialVPBonus = 1;
          }
        }

        const verticesAfterSettlement = (context.vertices || []).map((vertex: any) =>
          vertex.id === vertexId ? { ...vertex, structure: 'SETTLEMENT', playerId } : vertex);
        const storedHarborCanBePlaced = (player.unplacedHarbors?.length || 0) > 0 &&
          getEligibleHarborEdges(playerId, verticesAfterSettlement, context.edges || [], context.tiles || []).length > 0;

        context.setPlayers?.((prev: any[]) => prev.map(p => p.id === playerId
          ? {
              ...p,
              victoryPoints: p.victoryPoints + 1 + specialVPBonus,
              treasureIslandIds: specialVPBonus === 1 && targetIslandId !== undefined
                ? [...(p.treasureIslandIds || []), targetIslandId] : p.treasureIslandIds,
              harborReturnSubPhase: storedHarborCanBePlaced ? 'TRADE_AND_BUILD' : p.harborReturnSubPhase,
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
        addLocalDesertDragons(context);
        context.showBuildingCostToast?.('SETTLEMENT', true);
        if (storedHarborCanBePlaced) {
          context.setTurnSubPhase?.('HARBOR_PLACEMENT');
          context.addLog?.('היישוב החדש מאפשר להציב נמל שמור. בחר צלע חוף מודגשת.');
        }
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
      const isSetupCity = isCitiesKnightsExpansion(context.activeExpansion) && context.gamePhase === 'SETUP_ROUND_2';
      if (isSetupCity) {
        const requiresCoastalStart = ['GREAT_CANAL', 'ENCHANTED_LAND'].includes(context.selectedScenario || '');
        const isCoastal = (id: string) => (context.tiles || []).some((tile: any) => ['WATER', 'SEA', 'FOG'].includes(tile.type) && getTileVertexIds(tile).includes(id));
        const alreadyHasCoastalStructure = (context.vertices || []).some((vertex: any) => vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && isCoastal(vertex.id));
        if (!cityTarget || cityTarget.structure !== 'NONE' || !context.setVertices || !validateSettlementPlacement(
          vertexId, playerId, context.gamePhase as any, context.vertices || [], context.edges || [], context.tiles,
          context.selectedScenario, context.activeExpansion
        ) || (requiresCoastalStart && !alreadyHasCoastalStructure && !isCoastal(vertexId))) return;
        context.setVertices(prev => prev.map(v => v.id === vertexId ? { ...v, structure: 'CITY', playerId } : v));
        context.showBuildingCostToast?.('CITY', true, true);
        context.addLog?.(`${player.name} בנה עיר בשלב ההקמה (חינם).`);
        context.recordSetupPlacement?.('SETTLEMENT', vertexId);
        break;
      }
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
      addLocalDesertDragons(context);
      context.showBuildingCostToast?.('CITY', true);
      context.addLog?.(`שחקן ${player.name} שדרג יישוב לעיר!`);
      break;
    }

    // --- 4. בניית כביש ---
    case 'BUILD_ROAD': {
      const { edgeId } = action;
      const isSetupPhase = ['SETUP_ROUND_1', 'SETUP_ROUND_2', 'SETUP_ROUND_3'].includes(context.gamePhase || '');
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const roadTarget = context.edges?.find((edge: any) => edge.id === edgeId);
      if (!roadTarget || roadTarget.hasRoad || roadTarget.hasShip || !context.setEdges) return;
      if (context.selectedScenario === 'DESERT_DRAGONS' && (context.tiles || []).filter((tile: any) =>
        getTileEdgeIds(tile).includes(edgeId) && (tile.scenarioMarker?.dragonIds || []).length > 0).length >= 2) {
        context.addLog?.('דרך בין שני אריחים עם דרקונים חסומה.');
        return;
      }
      if (context.selectedScenario === 'ENCHANTED_LAND' && (context.tiles || []).some((tile: any) =>
        tile.scenarioMarker?.isEnchantedLand && getTileEdgeIds(tile).includes(edgeId))) {
        context.addLog?.('אי אפשר לבנות דרכים בארץ המכושפת.');
        return;
      }
      if (context.selectedScenario === 'GREAT_CANAL' && isSetupPhase && context.setupState?.lastSettlementVertexId &&
          (context.tiles || []).some((tile: any) => ['WATER', 'SEA', 'FOG'].includes(tile.type) && getTileVertexIds(tile).includes(context.setupState.lastSettlementVertexId))) {
        context.addLog?.('בשלב ההקמה של התעלה הגדולה, מבנה חוף חייב לקבל ספינה.');
        return;
      }

      const isDiplomatRoad = (player.diplomatRoadBuildingRemaining || 0) > 0;
      const isFreeRoad = !isSetupPhase && ((context.roadBuildingRemaining || 0) > 0 || isDiplomatRoad);
      if (!isSetupPhase && !isFreeRoad && (
        context.turnSubPhase !== 'TRADE_AND_BUILD' ||
        player.resources.WOOD < 1 ||
        player.resources.BRICK < 1 ||
        !context.setPlayers
      )) return;

      context.setEdges((prev: any[]) => prev.map(e =>
        e.id === edgeId ? { ...e, hasRoad: true, playerId } : e
      ));

      if (isSetupPhase) {
        context.showBuildingCostToast?.('ROAD', true, true);
        context.addLog?.(`שחקן ${player.name} בנה כביש בשלב ההקמה (חינם).`);
        if (context.recordSetupPlacement) {
          context.recordSetupPlacement('ROAD', edgeId);
        }
      } else {
        if (isFreeRoad) {
          if (isDiplomatRoad) {
            context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId
              ? { ...candidate, diplomatRoadBuildingRemaining: Math.max(0, (candidate.diplomatRoadBuildingRemaining || 0) - 1) }
              : candidate));
          } else {
            context.setRoadBuildingRemaining?.((prev: number) => prev - 1);
          }
        } else {
          context.setPlayers!((prev: any[]) => prev.map(p => p.id === playerId
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
      const isSetupPhase = ['SETUP_ROUND_1', 'SETUP_ROUND_2', 'SETUP_ROUND_3'].includes(context.gamePhase || '');
      const player = context.players?.find((p: any) => p.id === playerId);
      if (!player) return;
      const shipTarget = context.edges?.find((edge: any) => edge.id === edgeId);
      if (context.selectedScenario === 'GREAT_CANAL' && shipTarget && getEdgeVertices(shipTarget.id).some(vertexId =>
        (context.edges || []).filter((edge: any) => getEdgeVertices(edge.id).includes(vertexId) && edge.hasShip && edge.shipPlayerId === playerId).length >= 2)) {
        context.addLog?.('נתיבי ספינות אינם יכולים להתפצל בתרחיש התעלה הגדולה.');
        return;
      }
      if (!shipTarget || shipTarget.hasRoad || shipTarget.hasShip || !context.setEdges) return;

      const isFreeShip = !isSetupPhase && (context.roadBuildingRemaining || 0) > 0 && isSeafarersExpansion(context.activeExpansion);
      if (!isSetupPhase && !isFreeShip && (
        context.turnSubPhase !== 'TRADE_AND_BUILD' ||
        player.resources.WOOD < 1 ||
        player.resources.SHEEP < 1 ||
        !context.setPlayers
      )) return;

      const rewardLog = getLostTribeRewardLog(player.name, shipTarget);
      const harborGiftCanBePlaced = shipTarget.lostTribeReward?.kind === 'HARBOR' &&
        getEligibleHarborEdges(playerId, context.vertices || [], context.edges || [], context.tiles || []).length > 0;

      const nextEdges = (context.edges || []).map((e: any) =>
        e.id === edgeId ? {
          ...e,
          hasShip: true,
          shipPlayerId: playerId,
          lostTribeReward: e.lostTribeReward && !e.lostTribeReward.collectedBy
            ? { ...e.lostTribeReward, collectedBy: playerId }
            : e.lostTribeReward,
        } : e
      );
      context.setEdges(nextEdges);

      // Reaching a village by a continuous ship route establishes a permanent
      // trade connection and immediately takes one roll from that village.
      const newlyReachedVillageIds = context.selectedScenario === 'CLOTH_FOR_CATAN'
        ? getReachedLostTribeVillageIds(playerId, context.vertices || [], nextEdges, context.tiles || [])
            .filter(villageId => !(player.lostTribeVillageIds || []).includes(villageId))
        : [];
      if (newlyReachedVillageIds.length > 0) {
        const grantedVillageIds = new Set(
          (context.tiles || []).flatMap((tile: any) => tile.lostTribeVillages || [])
            .filter((village: any) => newlyReachedVillageIds.includes(village.id) && village.clothRemaining > 0)
            .map((village: any) => village.id)
        );
        context.setTiles?.((previous: any[]) => previous.map(tile => ({
          ...tile,
          lostTribeVillages: tile.lostTribeVillages?.map((village: any) => {
            if (!newlyReachedVillageIds.includes(village.id)) return village;
            const connectedPlayerIds = [...new Set([...(village.connectedPlayerIds || []), playerId])];
            if (village.clothRemaining > 0) {
              return { ...village, clothRemaining: village.clothRemaining - 1, connectedPlayerIds };
            }
            return { ...village, connectedPlayerIds };
          }),
        })));
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
          ...candidate,
          lostTribeVillageIds: [...new Set([...(candidate.lostTribeVillageIds || []), ...newlyReachedVillageIds])],
          clothRolls: (candidate.clothRolls || 0) + grantedVillageIds.size,
        } : candidate));
        context.addLog?.(`🧵 ${player.name} יצר קשר מסחר עם ${newlyReachedVillageIds.length} כפר/ים וקיבל ${grantedVillageIds.size} גליל/י בד.`);
      }

      if (isSetupPhase) {
        context.showBuildingCostToast?.('SHIP', true, true);
        context.addLog?.(`שחקן ${player.name} בנה ספינה בשלב ההקמה (חינם).`);
        context.recordSetupPlacement?.('ROAD', edgeId);
      } else {
        if (isFreeShip) context.setRoadBuildingRemaining?.((prev: number) => prev - 1);
        context.setPlayers?.((prev: any[]) => prev.map(p => {
          if (p.id !== playerId) return p;
          let updatedPlayer = isFreeShip ? p : {
            ...p,
            resources: {
              ...p.resources,
              WOOD: p.resources.WOOD - 1,
              SHEEP: p.resources.SHEEP - 1,
            },
          };
          updatedPlayer = claimLostTribeReward(updatedPlayer, shipTarget);
          return harborGiftCanBePlaced ? {
            ...updatedPlayer,
            harborReturnSubPhase: context.turnSubPhase === 'BEFORE_ROLL' ? 'BEFORE_ROLL' : 'TRADE_AND_BUILD',
          } : updatedPlayer;
        }));
        if (!isFreeShip) {
          context.setResourceBank?.(previous => ({ ...previous, WOOD: previous.WOOD + 1, SHEEP: previous.SHEEP + 1 }));
        }
        context.showBuildingCostToast?.('SHIP', true, isFreeShip);
        if (rewardLog) context.addLog?.(rewardLog);
        if (harborGiftCanBePlaced) {
          context.setTurnSubPhase?.('HARBOR_PLACEMENT');
          context.addLog?.('בחר צלע חוף מודגשת ליד יישוב שלך כדי להציב את הנמל.');
        }
        context.addLog?.(`שחקן ${player.name} בנה ספינה!`);
      }
      break;
    }

    // --- 6. קניית קלף פיתוח ---
    case 'PLACE_HARBOR': {
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      const harborType = player?.unplacedHarbors?.[0];
      if (!player || !harborType || !context.setEdges || !context.setVertices) return;
      const eligibleEdges = getEligibleHarborEdges(playerId, context.vertices || [], context.edges || [], context.tiles || []);
      if (!eligibleEdges.some(edge => edge.id === action.edgeId)) return;

      const [v1Id, v2Id] = getEdgeVertices(action.edgeId);
      const nextEdges = (context.edges || []).map((edge: any) => edge.id === action.edgeId
        ? { ...edge, isHarbor: true, harborType }
        : edge);
      const remainingHarbors = player.unplacedHarbors.slice(1);
      const hasAnotherImmediatePlacement = remainingHarbors.length > 0 &&
        getEligibleHarborEdges(playerId, context.vertices || [], nextEdges, context.tiles || []).length > 0;

      context.setEdges(nextEdges);
      context.setVertices((previous: any[]) => previous.map(vertex =>
        vertex.id === v1Id || vertex.id === v2Id
          ? { ...vertex, isHarbor: true, harborType }
          : vertex
      ));
      context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId
        ? {
            ...candidate,
            unplacedHarbors: remainingHarbors,
            harborReturnSubPhase: hasAnotherImmediatePlacement ? candidate.harborReturnSubPhase : undefined,
          }
        : candidate));
      context.setTurnSubPhase?.(hasAnotherImmediatePlacement
        ? 'HARBOR_PLACEMENT'
        : (player.harborReturnSubPhase || 'TRADE_AND_BUILD'));
      context.addLog?.(`⚓ ${player.name} הציב נמל ${harborType === 'GENERIC' ? 'כללי 3:1' : `${harborType} 2:1`} ויכול להשתמש בו מיד.`);
      break;
    }

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
      if ((cardType === 'VICTORY_POINT' && context.selectedScenario !== 'PIRATE_ISLANDS') || availableCardCount <= 0 || player.playedDevCardThisTurn ||
          !['BEFORE_ROLL', 'TRADE_AND_BUILD'].includes(context.turnSubPhase || '')) return;

      if (context.selectedScenario === 'DESERT_DRAGONS' && cardType === 'KNIGHT') {
        const dragonTile = (context.tiles || []).find((tile: any) => tile.islandId === 1 && tile.type !== 'DESERT' && (tile.scenarioMarker?.dragonIds || []).length);
        if (!dragonTile) {
          context.addLog?.('אין דרקון מחוץ למדבר שאפשר לסלק.');
          return;
        }
        context.setTiles?.((previous: any[]) => previous.map(tile => tile.id === dragonTile.id ? {
          ...tile,
          scenarioMarker: { ...tile.scenarioMarker, dragonIds: (tile.scenarioMarker?.dragonIds || []).slice(0, -1) },
        } : tile));
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
          ...candidate,
          playedDevCardThisTurn: true,
          developmentCards: { ...candidate.developmentCards, KNIGHT: Math.max(0, (candidate.developmentCards?.KNIGHT || 0) - 1) },
        } : candidate));
        context.addLog?.(`🐉 ${player.name} סילק דרקון באמצעות אביר.`);
        break;
      }

      if (context.selectedScenario === 'PIRATE_ISLANDS' && (cardType === 'KNIGHT' || cardType === 'VICTORY_POINT')) {
        const warshipTarget = getPirateShippingLine(context.tiles || [], context.vertices || [], context.edges || [], playerId)
          ?.find((edge: any) => !edge.isWarship);
        if (!warshipTarget) {
          context.addLog?.('יש לבנות תחילה ספינה רגילה כדי להפוך אותה לספינת מלחמה.');
          return;
        }
        context.setEdges?.((previous: any[]) => previous.map(edge =>
          edge.id === warshipTarget.id ? { ...edge, isWarship: true } : edge
        ));
        context.setPlayers?.((previous: any[]) => previous.map(p => p.id === playerId ? {
          ...p,
          playedDevCardThisTurn: true,
          developmentCards: { ...p.developmentCards, [cardType]: Math.max(0, (p.developmentCards[cardType] || 0) - 1) },
        } : p));
        context.addLog?.(`⚔️ ${player.name} הפך ספינה לספינת מלחמה.`);
        break;
      }

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
    case 'ATTACK_PIRATE_FORTRESS': {
      const fortress = context.vertices?.find((vertex: any) => vertex.id === action.fortressVertexId);
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!fortress?.pirateFortress || fortress.pirateFortress.playerId !== playerId || fortress.pirateFortress.conquered || !player) return;
      const path = getPirateShippingPath(context.tiles || [], context.vertices || [], context.edges || [], playerId);
      const warships = (path || []).filter((edge: any) => edge.isWarship);
      if (warships.length === 0) return;
      const fortressPower = action.fortressPower ?? Math.floor(Math.random() * 6) + 1;
      if (warships.length > fortressPower) {
        const remainingTokens = Math.max(0, fortress.pirateFortress.remainingTokens - 1);
        context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id !== fortress.id ? vertex : {
          ...vertex,
          structure: remainingTokens === 0 ? 'SETTLEMENT' : vertex.structure,
          playerId: remainingTokens === 0 ? playerId : vertex.playerId,
          pirateFortress: { ...vertex.pirateFortress, remainingTokens, conquered: remainingTokens === 0 },
        }));
        if (remainingTokens === 0) context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId
          ? { ...candidate, victoryPoints: (candidate.victoryPoints || 0) + 1 } : candidate));
        context.addLog?.(`⚔️ כוח המבצר היה ${fortressPower}; ${player.name} ניצח${remainingTokens === 0 ? ' וכבש את המבצר!' : ' ולקח אסימון קטאן.'}`);
      } else {
        const losses = warships.length === fortressPower ? 1 : 2;
        const removedEdgeIds = (path || []).slice(-losses).map((edge: any) => edge.id);
        context.setEdges?.((previous: any[]) => previous.map(edge => removedEdgeIds.includes(edge.id)
          ? { ...edge, hasShip: false, shipPlayerId: undefined, isWarship: false } : edge));
        context.addLog?.(`⚔️ כוח המבצר היה ${fortressPower}; ${player.name} איבד ${removedEdgeIds.length} ספינות.`);
      }
      if ((context.vertices || []).filter((vertex: any) => vertex.pirateFortress).every((vertex: any) => vertex.pirateFortress.conquered || vertex.id === fortress.id && fortress.pirateFortress.remainingTokens === 1 && warships.length > fortressPower)) {
        context.setTiles?.((previous: any[]) => previous.map(tile => ({ ...tile, hasPirate: false })));
      }
      context.endTurn?.();
      break;
    }

    case 'MOVE_ROBBER': {
      const { tileId, hasEligibleVictims, eligibleVictimPlayerIds } = action;
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
      if (hasEligibleVictims) {
        const targets = context.players?.filter((candidate: any) => eligibleVictimPlayerIds?.includes(candidate.id)) || [];
        context.setRobberyState?.({ tile: targetTile, targets });
        context.setTurnSubPhase?.('ROBBER_STEAL');
      } else {
        context.setRobberyState?.(null);
        context.setPlayers?.((prevPlayers: any[]) => prevPlayers.map(p =>
          p.id === playerId ? { ...p, devCardReturnSubPhase: undefined } : p
        ));
        context.setTurnSubPhase?.(returnSubPhase);
      }
      break;
    }

    case 'STEAL_RESOURCE': {
      const { victimPlayerId, stolenResource } = action;
      if (!stolenResource) return;
      const victim = context.players?.find((p: any) => p.id === victimPlayerId);
      const stealer = context.players?.find((p: any) => p.id === playerId);
      if (!victim || !stealer) return;
      const returnSubPhase = stealer.devCardReturnSubPhase || 'TRADE_AND_BUILD';

      context.setPlayers?.((prevPlayers: any[]) => prevPlayers.map(p => {
        if (p.id === victimPlayerId) {
          if (stolenResource === 'CLOTH' && !isCitiesKnightsExpansion(context.activeExpansion)) return { ...p, clothRolls: Math.max(0, (p.clothRolls || 0) - 1) };
          if (['COIN', 'PAPER', 'CLOTH'].includes(stolenResource)) return { ...p, commodities: { ...p.commodities, [stolenResource]: Math.max(0, (p.commodities?.[stolenResource] || 0) - 1) } };
          return {
            ...p,
            resources: {
              ...p.resources,
              [stolenResource]: Math.max(0, (p.resources[stolenResource] || 0) - 1)
            }
          };
        }
        if (p.id === playerId) {
          if (stolenResource === 'CLOTH' && !isCitiesKnightsExpansion(context.activeExpansion)) return { ...p, devCardReturnSubPhase: undefined, clothRolls: (p.clothRolls || 0) + 1 };
          if (['COIN', 'PAPER', 'CLOTH'].includes(stolenResource)) return { ...p, devCardReturnSubPhase: undefined, commodities: { ...p.commodities, [stolenResource]: (p.commodities?.[stolenResource] || 0) + 1 } };
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

      context.addLog?.(`[שודד] ${stealer.name} שדד ${stolenResource === 'CLOTH' ? 'גליל בד' : `קלף ${stolenResource}`} מ-${victim.name}.`);
      context.setRobberyState?.(null);
      context.setTurnSubPhase?.(returnSubPhase);
      break;
    }

    // --- 8. הזזת ספינה פתוחה (Seafarers) ---
    case 'MOVE_SHIP': {
      const { fromEdgeId, toEdgeId } = action;
      const player = context.players?.find((p: any) => p.id === playerId);
      const shipTarget = context.edges?.find((edge: any) => edge.id === toEdgeId);
      const rewardLog = player && shipTarget ? getLostTribeRewardLog(player.name, shipTarget) : null;
      const harborGiftCanBePlaced = !!(player && shipTarget?.lostTribeReward?.kind === 'HARBOR' &&
        getEligibleHarborEdges(playerId, context.vertices || [], context.edges || [], context.tiles || []).length > 0);

      const nextEdges = (context.edges || []).map((e: any) => {
        if (e.id === fromEdgeId) return { ...e, hasShip: false, shipPlayerId: undefined };
        if (e.id === toEdgeId) return {
          ...e,
          hasShip: true,
          shipPlayerId: playerId,
          lostTribeReward: e.lostTribeReward && !e.lostTribeReward.collectedBy
            ? { ...e.lostTribeReward, collectedBy: playerId }
            : e.lostTribeReward,
        };
        return e;
      });
      context.setEdges?.(nextEdges);

      if (player && shipTarget?.lostTribeReward && !shipTarget.lostTribeReward.collectedBy) {
        context.setPlayers?.((previous: any[]) => previous.map(candidate => {
          if (candidate.id !== playerId) return candidate;
          const claimed = claimLostTribeReward(candidate, shipTarget);
          return harborGiftCanBePlaced ? {
            ...claimed,
            harborReturnSubPhase: context.turnSubPhase === 'BEFORE_ROLL' ? 'BEFORE_ROLL' : 'TRADE_AND_BUILD',
          } : claimed;
        }));
        if (rewardLog) context.addLog?.(rewardLog);
        if (harborGiftCanBePlaced) context.setTurnSubPhase?.('HARBOR_PLACEMENT');
      }

      if (context.selectedScenario === 'CLOTH_FOR_CATAN' && player) {
        const newlyReachedVillageIds = getReachedLostTribeVillageIds(playerId, context.vertices || [], nextEdges, context.tiles || [])
          .filter(villageId => !(player.lostTribeVillageIds || []).includes(villageId));
        if (newlyReachedVillageIds.length) {
          const granted = new Set((context.tiles || []).flatMap((tile: any) => tile.lostTribeVillages || [])
            .filter((village: any) => newlyReachedVillageIds.includes(village.id) && village.clothRemaining > 0)
            .map((village: any) => village.id));
          context.setTiles?.((previous: any[]) => previous.map(tile => ({
            ...tile,
            lostTribeVillages: tile.lostTribeVillages?.map((village: any) => newlyReachedVillageIds.includes(village.id)
              ? { ...village, connectedPlayerIds: [...new Set([...(village.connectedPlayerIds || []), playerId])], clothRemaining: Math.max(0, village.clothRemaining - (granted.has(village.id) ? 1 : 0)) }
              : village),
          })));
          context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
            ...candidate,
            clothRolls: (candidate.clothRolls || 0) + granted.size,
            lostTribeVillageIds: [...new Set([...(candidate.lostTribeVillageIds || []), ...newlyReachedVillageIds])],
          } : candidate));
        }
      }

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

    case 'DISCOVER_SCENARIO_HEX': {
      if (context.selectedScenario !== 'GREATER_CATAN' || context.scenarioState?.kind !== 'GREATER_CATAN') return;
      const target = context.tiles?.find((tile: any) => tile.id === action.tileId);
      if (!target || target.numberToken !== null) return;
      const [fromSupply, ...remaining] = context.scenarioState.numberTokenSupply;
      const homeSource = fromSupply === undefined ? (context.tiles || []).find((tile: any) => {
        if (tile.islandId !== 1 || !Number.isInteger(tile.numberToken)) return false;
        const createsRedAdjacency = [6, 8].includes(tile.numberToken) && (context.tiles || []).some((other: any) => other.id !== target.id && [6, 8].includes(other.numberToken) &&
          (Math.abs(other.coord.q - target.coord.q) + Math.abs(other.coord.r - target.coord.r) + Math.abs(other.coord.s - target.coord.s)) / 2 === 1);
        return !createsRedAdjacency && getTileVertexIds(tile).some(vertexId => context.vertices?.some((vertex: any) => vertex.id === vertexId && vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure)) &&
          (context.tiles || []).some((other: any) => other.id !== tile.id && Number.isInteger(other.numberToken) && getTileVertexIds(other).includes(vertexId)));
      }) : undefined;
      const number = fromSupply ?? homeSource?.numberToken;
      if (number === undefined) return;
      context.setTiles?.((previous: any[]) => previous.map(tile => {
        if (tile.id === action.tileId) return { ...tile, numberToken: number };
        if (tile.id === homeSource?.id) return { ...tile, numberToken: null };
        return tile;
      }));
      context.setScenarioState?.((previous: any) => ({ ...previous, numberTokenSupply: remaining,
        depletedHomeTileIds: homeSource ? [...(previous.depletedHomeTileIds || []), homeSource.id] : previous.depletedHomeTileIds }));
      context.addLog?.(`🌍 הונח אסימון מספר ${number} באי החדש.`);
      break;
    }

    // --- 10. בחירת משאב ממכרה זהב ---
    case 'SELECT_GOLD_RESOURCE': {
      const { resource } = action;
      const player = context.players?.find((p: any) => p.id === playerId);

      if ((context.resourceBank?.[resource] || 0) < 1) return;
      const pendingSelection = context.goldSelectionQueue?.[0];
      if (pendingSelection && pendingSelection.playerId !== playerId) return;
      if (pendingSelection?.allowedResources && !pendingSelection.allowedResources.includes(resource)) return;
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

    // --- Treasure Islands: a route arriving at a chest takes it immediately. ---
    case 'CLAIM_TREASURE': {
      const scenario = context.scenarioState;
      const token = scenario?.treasureTokens?.[action.treasureId];
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!token || token.status !== 'UNCLAIMED' || !player) return;

      const [reward, ...remainingDeck] = scenario.treasureDeck || [];
      if (!reward) return;
      context.setScenarioState?.((previous: any) => ({
        ...previous,
        treasureDeck: remainingDeck,
        treasureTokens: {
          ...previous.treasureTokens,
          [action.treasureId]: { ...previous.treasureTokens[action.treasureId], status: 'CLAIMED', claimedBy: playerId },
        },
      }));
      context.setVertices?.((previous: any[]) => previous.map(vertex =>
        vertex.id === token.vertexId && vertex.treasureToken
          ? { ...vertex, treasureToken: { ...vertex.treasureToken, claimedBy: playerId } }
          : vertex
      ));

      if (reward === 'RESOURCE_CHOICE' || reward === 'GRAIN_OR_BRICK' || reward === 'TWO_RESOURCES') {
        context.setGoldSelectionQueue?.((previous: any[]) => [...previous, {
          playerId,
          amount: reward === 'TWO_RESOURCES' ? 2 : 1,
          tileId: token.vertexId,
          source: 'TREASURE',
          allowedResources: reward === 'GRAIN_OR_BRICK' ? ['WHEAT', 'BRICK'] : undefined,
        }]);
        context.setTurnSubPhase?.('GOLD_RESOURCE_SELECTION');
      } else if (reward === 'DEVELOPMENT_CARD' && context.citiesKnightsState) {
        context.setCitiesKnightsState?.((previous: any) => {
          const stack = [...(previous.progressDecks?.[action.progressTrack!] || [])];
          const card = stack.shift();
          if (card) context.setPlayers?.((players: any[]) => players.map(candidate => candidate.id === playerId ? {
            ...candidate,
            progressCards: [...(candidate.progressCards || []), card],
          } : candidate));
          return { ...previous, progressDecks: { ...previous.progressDecks, [action.progressTrack!]: stack } };
        });
      } else if (reward === 'DEVELOPMENT_CARD') {
        context.setDevCardDeck?.((previous: string[]) => {
          const [card, ...rest] = previous;
          if (!card) return previous;
          context.setPlayers?.((players: any[]) => players.map(candidate => candidate.id === playerId ? {
            ...candidate,
            developmentCards: { ...candidate.developmentCards, [card]: (candidate.developmentCards?.[card] || 0) + 1 },
          } : candidate));
          return rest;
        });
      } else if (reward === 'FREE_BUILD') {
        context.setRoadBuildingRemaining?.((previous: number) => previous + 2);
      }
      context.addLog?.(`🧰 ${player.name} מצא אוצר: ${reward}.`);
      break;
    }

    case 'KEEP_TREASURE': {
      const scenario = context.scenarioState;
      const token = scenario?.treasureTokens?.[action.treasureId];
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!token || token.status !== 'UNCLAIMED' || !player || (player.keptTreasureTokens || 0) >= 4) return;
      context.setScenarioState?.((previous: any) => ({
        ...previous,
        treasureTokens: { ...previous.treasureTokens, [action.treasureId]: { ...token, status: 'KEPT', claimedBy: playerId } },
      }));
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === token.vertexId && vertex.treasureToken
        ? { ...vertex, treasureToken: { ...vertex.treasureToken, claimedBy: playerId } } : vertex));
      context.setPlayers?.((previous: any[]) => previous.map(candidate => {
        if (candidate.id !== playerId) return candidate;
        const kept = (candidate.keptTreasureTokens || 0) + 1;
        return {
          ...candidate,
          keptTreasureTokens: kept,
          unplacedHarbors: kept === 2 ? [...(candidate.unplacedHarbors || []), action.harborType] : candidate.unplacedHarbors,
          victoryPoints: (candidate.victoryPoints || 0) + (kept === 3 || kept === 4 ? 1 : 0),
        };
      }));
      if ((player.keptTreasureTokens || 0) === 1) {
        context.setTurnSubPhase?.('HARBOR_PLACEMENT');
        context.addLog?.('בחר צלע חוף ליד יישוב שלך להצבת נמל מיוחד.');
      }
      context.addLog?.(`🧰 ${player.name} שמר אוצר סגור.`);
      break;
    }

    case 'MOVE_ENCHANTED_KNIGHT': {
      const source = context.vertices?.find((vertex: any) => vertex.id === action.fromVertexId);
      const destination = context.vertices?.find((vertex: any) => vertex.id === action.toVertexId);
      if (!source?.knight || !destination || context.selectedScenario !== 'ENCHANTED_LAND') return;
      const displacedKnight = destination.knight;
      context.setVertices?.((previous: any[]) => previous.map(vertex => {
        if (vertex.id === action.fromVertexId) return { ...vertex, knight: undefined };
        if (vertex.id === action.toVertexId) return { ...vertex, knight: { ...source.knight, active: false, actedThisTurn: true } };
        return vertex;
      }));
      context.setScenarioState?.((previous: any) => ({ ...previous, knightOnIslandByPlayerId: { ...previous.knightOnIslandByPlayerId, [playerId]: action.toVertexId } }));
      if (displacedKnight) {
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, pendingDisplacedKnight: {
          ownerId: displacedKnight.playerId,
          knight: { ...displacedKnight },
          originVertexId: action.toVertexId,
          relocationMode: 'ENCHANTED_LAND',
        } }));
        context.setTurnSubPhase?.('KNIGHT_DISPLACEMENT');
      }
      break;
    }

    case 'FIGHT_ENCHANTED_DRAGON': {
      const vertex = context.vertices?.find((candidate: any) => candidate.id === action.knightVertexId);
      if (context.selectedScenario !== 'ENCHANTED_LAND' || vertex?.knight?.playerId !== playerId || vertex.enchantedDragon?.id !== action.dragonId) return;
      const won = vertex.knight.level >= vertex.enchantedDragon.strength;
      context.setVertices?.((previous: any[]) => previous.map(candidate => candidate.id === action.knightVertexId ? {
        ...candidate, ...(won ? { enchantedDragon: undefined } : {}), knight: { ...candidate.knight, active: false, actedThisTurn: true },
      } : candidate));
      if (won) {
        context.setScenarioState?.((previous: any) => ({ ...previous, defeatedDragonIdsByPlayerId: {
          ...previous.defeatedDragonIdsByPlayerId,
          [playerId]: [...(previous.defeatedDragonIdsByPlayerId?.[playerId] || []), action.dragonId],
        } }));
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? { ...candidate, victoryPoints: (candidate.victoryPoints || 0) + 1 } : candidate));
        context.addLog?.(`🐲 ${vertex.knight.playerId} הביס דרקון בארץ המכושפת.`);
      } else context.addLog?.('🐲 הדרקון גבר על האביר; אפשר לשדרג ולנסות שוב בתור הבא.');
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

    // --- Cities & Knights ---
    case 'BUILD_KNIGHT': {
      if (context.selectedScenario === 'GREAT_CANAL' && (context.tiles || []).some((tile: any) =>
        tile.islandId !== 1 && getTileVertexIds(tile).includes(action.vertexId))) {
        context.addLog?.('אבירים בתרחיש התעלה הגדולה נבנים רק באי הבית.');
        return;
      }
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.vertexId
        ? { ...vertex, knight: { playerId, level: 1, active: false, actedThisTurn: false } }
        : vertex));
      context.setPlayers?.((previous: any[]) => previous.map(player => player.id === playerId ? {
        ...player,
        resources: { ...player.resources, SHEEP: player.resources.SHEEP - 1, ORE: player.resources.ORE - 1 },
      } : player));
      context.setResourceBank?.(bank => ({ ...bank, SHEEP: bank.SHEEP + 1, ORE: bank.ORE + 1 }));
      context.addLog?.('נבנה אביר בסיסי.');
      break;
    }
    case 'ACTIVATE_KNIGHT': {
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.vertexId && vertex.knight
        ? { ...vertex, knight: { ...vertex.knight, active: true, actedThisTurn: false } } : vertex));
      context.setPlayers?.((previous: any[]) => previous.map(player => player.id === playerId ? {
        ...player, resources: { ...player.resources, WHEAT: player.resources.WHEAT - 1 },
      } : player));
      context.setResourceBank?.(bank => ({ ...bank, WHEAT: bank.WHEAT + 1 }));
      tryBuildLocalCanal(context, action.vertexId);
      break;
    }
    case 'UPGRADE_KNIGHT': {
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      const isFreePromotion = (player?.freeKnightPromotions || 0) > 0;
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.vertexId && vertex.knight
        ? { ...vertex, knight: { ...vertex.knight, level: Math.min(3, vertex.knight.level + 1), promotedThisTurn: true } } : vertex));
      context.setPlayers?.((previous: any[]) => previous.map(player => player.id === playerId ? {
        ...player,
        freeKnightPromotions: isFreePromotion ? Math.max(0, (player.freeKnightPromotions || 0) - 1) : player.freeKnightPromotions,
        resources: isFreePromotion ? player.resources : { ...player.resources, SHEEP: player.resources.SHEEP - 1, ORE: player.resources.ORE - 1 },
      } : player));
      if (!isFreePromotion) context.setResourceBank?.(bank => ({ ...bank, SHEEP: bank.SHEEP + 1, ORE: bank.ORE + 1 }));
      break;
    }
    case 'MOVE_KNIGHT': {
      const source = context.vertices?.find((vertex: any) => vertex.id === action.fromVertexId);
      if (!source?.knight) return;
      context.setVertices?.((previous: any[]) => previous.map(vertex => {
        if (vertex.id === action.fromVertexId) { const { knight, ...rest } = vertex; return rest; }
        if (vertex.id === action.toVertexId) return { ...vertex, knight: { ...source.knight, actedThisTurn: true } };
        return vertex;
      }));
      break;
    }
    case 'EXPEL_PIRATE': {
      context.setTiles?.((previous: any[]) => previous.map(tile => tile.id === action.tileId ? { ...tile, hasPirate: false } : tile));
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.vertexId && vertex.knight
        ? { ...vertex, knight: { ...vertex.knight, active: false, actedThisTurn: true } } : vertex));
      context.addLog?.('אביר גירש את שודד הים והפך ללא פעיל.');
      break;
    }
    case 'DISPLACE_KNIGHT': {
      const source = context.vertices?.find((vertex: any) => vertex.id === action.fromVertexId);
      const target = context.vertices?.find((vertex: any) => vertex.id === action.toVertexId);
      if (!source?.knight || !target?.knight) return;
      context.setCitiesKnightsState?.((previous: any) => ({
        ...previous,
        pendingDisplacedKnight: { ownerId: target.knight.playerId, knight: { ...target.knight }, originVertexId: action.toVertexId },
      }));
      context.setVertices?.((previous: any[]) => previous.map(vertex => {
        if (vertex.id === action.fromVertexId) { const { knight, ...rest } = vertex; return rest; }
        if (vertex.id === action.toVertexId) return { ...vertex, knight: { ...source.knight, actedThisTurn: true } };
        return vertex;
      }));
      context.setTurnSubPhase?.('KNIGHT_DISPLACEMENT');
      break;
    }
    case 'RELOCATE_DISPLACED_KNIGHT': {
      const pending = context.citiesKnightsState?.pendingDisplacedKnight;
      if (!pending) return;
      if (action.toVertexId) context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.toVertexId ? { ...vertex, knight: { ...pending.knight } } : vertex));
      if (pending.relocationMode === 'ENCHANTED_LAND') context.setScenarioState?.((previous: any) => {
        const knightOnIslandByPlayerId = { ...previous.knightOnIslandByPlayerId };
        if (action.toVertexId) knightOnIslandByPlayerId[pending.ownerId] = action.toVertexId;
        else delete knightOnIslandByPlayerId[pending.ownerId];
        return { ...previous, knightOnIslandByPlayerId };
      });
      context.setCitiesKnightsState?.((previous: any) => ({ ...previous, pendingDisplacedKnight: undefined }));
      context.setTurnSubPhase?.('TRADE_AND_BUILD');
      break;
    }
    case 'SELECT_DESERTER_KNIGHT': {
      const target = context.vertices?.find((vertex: any) => vertex.id === action.vertexId);
      const pending = context.citiesKnightsState?.deserterPending;
      if (!target?.knight || pending?.targetPlayerId !== playerId || context.turnSubPhase !== 'DESERTER_SELECT') return;
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.vertexId ? { ...vertex, knight: undefined } : vertex));
      context.setCitiesKnightsState?.((previous: any) => ({ ...previous, deserterPending: { ...previous.deserterPending, knight: { ...target.knight } } }));
      context.setTurnSubPhase?.('DESERTER_PLACE');
      break;
    }
    case 'PLACE_DESERTER_KNIGHT': {
      const pending = context.citiesKnightsState?.deserterPending;
      if (!pending?.knight || pending.actorId !== playerId || context.turnSubPhase !== 'DESERTER_PLACE') return;
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.vertexId ? { ...vertex, knight: { ...pending.knight, playerId, actedThisTurn: false } } : vertex));
      context.setCitiesKnightsState?.((previous: any) => ({ ...previous, deserterPending: undefined }));
      context.setTurnSubPhase?.('TRADE_AND_BUILD');
      break;
    }
    case 'BUILD_CITY_WALL': {
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.vertexId ? { ...vertex, cityWall: true } : vertex));
      context.setPlayers?.((previous: any[]) => previous.map(player => player.id === playerId ? {
        ...player, resources: { ...player.resources, BRICK: player.resources.BRICK - 2 },
      } : player));
      context.setResourceBank?.(bank => ({ ...bank, BRICK: bank.BRICK + 2 }));
      break;
    }
    case 'UPGRADE_CITY_IMPROVEMENT': {
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      const current = player?.cityImprovements?.[action.track] || 0;
      const commodity = { SCIENCE: 'PAPER', POLITICS: 'COIN', TRADE: 'CLOTH' }[action.track];
      const cost = Math.max(0, current + 1 - (player?.cityImprovementDiscount || 0));
      context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
        ...candidate,
        commodities: { ...candidate.commodities, [commodity]: candidate.commodities[commodity] - cost },
        cityImprovements: { ...candidate.cityImprovements, [action.track]: current + 1 },
        cityImprovementDiscount: 0,
      } : candidate));
      context.setCommodityBank?.((bank: any) => ({ ...bank, [commodity]: bank[commodity] + cost }));
      if (current + 1 >= 4) {
        const incumbentId = context.citiesKnightsState?.metropolisOwners?.[action.track];
        const incumbentLevel = incumbentId ? context.players?.find((candidate: any) => candidate.id === incumbentId)?.cityImprovements?.[action.track] || 0 : 0;
        if (!incumbentId || current + 1 > incumbentLevel) {
          context.setVertices?.((previous: any[]) => {
            const target = previous.find(vertex => vertex.playerId === playerId && vertex.structure === 'CITY');
            return previous.map(vertex => vertex.metropolis === action.track
              ? { ...vertex, metropolis: undefined }
              : vertex.id === target?.id ? { ...vertex, metropolis: action.track } : vertex);
          });
          context.setCitiesKnightsState?.((previous: any) => ({
            ...previous, metropolisOwners: { ...(previous.metropolisOwners || {}), [action.track]: playerId },
          }));
          context.setPlayers?.((previous: any[]) => previous.map(candidate => {
            if (candidate.id === playerId) return { ...candidate, victoryPoints: (candidate.victoryPoints || 0) + 2 };
            if (candidate.id === incumbentId) return { ...candidate, victoryPoints: Math.max(0, (candidate.victoryPoints || 0) - 2) };
            return candidate;
          }));
        }
      }
      break;
    }
    case 'DOWNGRADE_CITY': {
      context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.vertexId ? { ...vertex, structure: 'SETTLEMENT', cityWall: false } : vertex));
      context.setPlayers?.((previous: any[]) => previous.map(player => player.id === playerId ? { ...player, victoryPoints: Math.max(0, (player.victoryPoints || 0) - 1) } : player));
      context.setCitiesKnightsState?.((previous: any) => {
        const queue = (previous.barbarianLossQueue || []).slice(1);
        return { ...previous, barbarianLossQueue: queue };
      });
      if ((context.citiesKnightsState?.barbarianLossQueue || []).length <= 1) context.setTurnSubPhase?.('TRADE_AND_BUILD');
      break;
    }
    case 'PLAY_PROGRESS_CARD': {
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!player?.progressCards?.includes(action.cardId)) return;
      const track = {
        ALCHEMIST: 'SCIENCE', INVENTOR: 'SCIENCE', BISHOP: 'POLITICS', SABOTEUR: 'POLITICS', WEDDING: 'POLITICS', DESERTER: 'POLITICS', DIPLOMAT: 'POLITICS', INTRIGUE: 'POLITICS', WARLORD: 'POLITICS', ROAD_BUILDING: 'SCIENCE', CRANE: 'SCIENCE', SMITH: 'SCIENCE', ENGINEER: 'SCIENCE', IRRIGATION: 'SCIENCE', MINING: 'SCIENCE', MEDICINE: 'SCIENCE', RESOURCE_MONOPOLY: 'TRADE', TRADE_MONOPOLY: 'TRADE', COMMERCIAL_HARBOR: 'TRADE', MASTER_MERCHANT: 'TRADE', SPY: 'POLITICS', MERCHANT: 'TRADE', MERCHANT_FLEET: 'TRADE',
      }[action.cardId] as 'SCIENCE' | 'POLITICS' | 'TRADE' | undefined;
      if (!track) return;
      context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId
        ? { ...candidate, progressCards: candidate.progressCards.filter((card: string, index: number) => card !== action.cardId || index !== candidate.progressCards.indexOf(action.cardId)) }
        : candidate));
      context.setCitiesKnightsState?.((previous: any) => ({
        ...previous,
        progressDecks: { ...previous.progressDecks, [track]: [...(previous.progressDecks?.[track] || []), action.cardId] },
      }));
      if (action.cardId === 'WARLORD') {
        context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.knight?.playerId === playerId && !vertex.knight.active
          ? { ...vertex, knight: { ...vertex.knight, active: true, actedThisTurn: false } } : vertex));
      } else if (action.cardId === 'ROAD_BUILDING') {
        context.setRoadBuildingRemaining?.((previous: number) => previous + 2);
      } else if (action.cardId === 'ALCHEMIST' && action.data?.diceValues && action.data.eventDie) {
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
          ...candidate, alchemistDice: action.data!.diceValues, alchemistEventDie: action.data!.eventDie,
        } : candidate));
      } else if (action.cardId === 'INVENTOR' && action.data?.tileAId && action.data?.tileBId) {
        context.setTiles?.((previous: any[]) => {
          const tileA = previous.find(tile => tile.id === action.data!.tileAId);
          const tileB = previous.find(tile => tile.id === action.data!.tileBId);
          if (!tileA || !tileB) return previous;
          return previous.map(tile => tile.id === tileA.id ? { ...tile, numberToken: tileB.numberToken }
            : tile.id === tileB.id ? { ...tile, numberToken: tileA.numberToken } : tile);
        });
      } else if ((action.cardId === 'RESOURCE_MONOPOLY' || action.cardId === 'TRADE_MONOPOLY') && action.data?.resource) {
        const field = action.cardId === 'RESOURCE_MONOPOLY' ? 'resources' : 'commodities';
        const key = action.data.resource;
        context.setPlayers?.((previous: any[]) => {
          const received = previous.filter(candidate => candidate.id !== playerId).reduce((total, candidate) => total + (candidate[field]?.[key] || 0), 0);
          return previous.map(candidate => candidate.id === playerId
            ? { ...candidate, [field]: { ...candidate[field], [key]: (candidate[field]?.[key] || 0) + received } }
            : { ...candidate, [field]: { ...candidate[field], [key]: 0 } });
        });
      } else if (action.cardId === 'MASTER_MERCHANT' && action.data?.targetPlayerId && action.data.selectedCards?.length === 2) {
        context.setPlayers?.((previous: any[]) => previous.map(candidate => {
          if (candidate.id !== playerId && candidate.id !== action.data!.targetPlayerId) return candidate;
          const isTarget = candidate.id === action.data!.targetPlayerId;
          return action.data!.selectedCards!.reduce((next, card) => {
            const field = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].includes(card) ? 'resources' : 'commodities';
            return { ...next, [field]: { ...next[field], [card]: (next[field]?.[card] || 0) + (isTarget ? -1 : 1) } };
          }, candidate);
        }));
      } else if (action.cardId === 'SPY' && action.data?.targetPlayerId && action.data.targetCardId) {
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId
          ? { ...candidate, progressCards: [...(candidate.progressCards || []), action.data!.targetCardId] }
          : candidate.id === action.data!.targetPlayerId
            ? { ...candidate, progressCards: (candidate.progressCards || []).filter((card: string, index: number) => card !== action.data!.targetCardId || index !== candidate.progressCards.indexOf(action.data!.targetCardId)) }
            : candidate));
        if ((player.progressCards || []).length > 4) {
          context.setCitiesKnightsState?.((previous: any) => ({ ...previous, progressDiscardQueue: [playerId] }));
          context.setTurnSubPhase?.('PROGRESS_DISCARD');
        }
      } else if (action.cardId === 'MERCHANT' && action.data?.tileId) {
        const tile = (context.tiles || []).find((candidate: any) => candidate.id === action.data!.tileId);
        if (!tile) return;
        const formerOwner = context.citiesKnightsState?.merchant?.playerId;
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, merchant: { playerId, resource: tile.type } }));
        if (formerOwner !== playerId) context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId
          ? { ...candidate, victoryPoints: (candidate.victoryPoints || 0) + 1 }
          : candidate.id === formerOwner ? { ...candidate, victoryPoints: Math.max(0, (candidate.victoryPoints || 0) - 1) } : candidate));
      } else if (action.cardId === 'MERCHANT_FLEET' && action.data?.resource) {
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId
          ? { ...candidate, merchantFleetResource: action.data!.resource } : candidate));
      } else if (action.cardId === 'BISHOP' && action.data?.tileId) {
        const targetTile = (context.tiles || []).find((candidate: any) => candidate.id === action.data!.tileId);
        if (!targetTile) return;
        const center = cubeToPixel(targetTile.coord, 60);
        const vertexIds = new Set(Array.from({ length: 6 }, (_, index) => {
          const angle = (Math.PI / 180) * (60 * index - 30);
          return `v_${Math.round((center.x + 60 * Math.cos(angle)) * 10) / 10}_${Math.round((center.y + 60 * Math.sin(angle)) * 10) / 10}`;
        }));
        const victimIds = (context.vertices || []).filter((vertex: any) => vertexIds.has(vertex.id) && vertex.playerId && vertex.playerId !== playerId && vertex.structure !== 'NONE')
          .map((vertex: any) => vertex.playerId).filter((id: string, index: number, all: string[]) => all.indexOf(id) === index);
        context.setTiles?.((previous: any[]) => previous.map(tile => ({ ...tile, hasRobber: tile.id === targetTile.id })));
        context.setPlayers?.((previous: any[]) => {
          const next = previous.map(candidate => ({ ...candidate, resources: { ...candidate.resources }, commodities: { ...candidate.commodities } }));
          const recipient = next.find(candidate => candidate.id === playerId);
          victimIds.forEach((victimId: string) => {
            const victim = next.find(candidate => candidate.id === victimId);
            const resource = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].find(key => (victim.resources?.[key] || 0) > 0);
            const commodity = ['COIN', 'PAPER', 'CLOTH'].find(key => (victim.commodities?.[key] || 0) > 0);
            const card = resource || commodity;
            if (!card) return;
            const field = resource ? 'resources' : 'commodities';
            victim[field][card] -= 1;
            recipient[field][card] += 1;
          });
          return next;
        });
      } else if (action.cardId === 'SABOTEUR') {
        const leadingPoints = Math.max(...(context.players || []).filter(candidate => candidate.id !== playerId).map(candidate => candidate.victoryPoints || 0));
        const targets = (context.players || []).filter(candidate => candidate.id !== playerId && (candidate.victoryPoints || 0) === leadingPoints);
        const queue = targets.filter(candidate => !candidate.isBot).map(candidate => {
          const cards = Object.values(candidate.resources || {}).reduce((total: number, amount: any) => total + amount, 0) + Object.values(candidate.commodities || {}).reduce((total: number, amount: any) => total + amount, 0);
          return { playerId: candidate.id, amount: Math.floor(cards / 2) };
        }).filter(entry => entry.amount > 0);
        const botLosses = new Map<string, { resources: Record<string, number>; commodities: Record<string, number> }>();
        const botReturns = { resources: {} as Record<string, number>, commodities: {} as Record<string, number> };
        targets.filter(candidate => candidate.isBot).forEach(candidate => {
          let remaining = Math.floor((Object.values(candidate.resources || {}).reduce((total: number, amount: any) => total + amount, 0) + Object.values(candidate.commodities || {}).reduce((total: number, amount: any) => total + amount, 0)) / 2);
          const loss = { resources: {} as Record<string, number>, commodities: {} as Record<string, number> };
          ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].forEach(resource => { const amount = Math.min(candidate.resources?.[resource] || 0, remaining); loss.resources[resource] = amount; botReturns.resources[resource] = (botReturns.resources[resource] || 0) + amount; remaining -= amount; });
          ['COIN', 'PAPER', 'CLOTH'].forEach(commodity => { const amount = Math.min(candidate.commodities?.[commodity] || 0, remaining); loss.commodities[commodity] = amount; botReturns.commodities[commodity] = (botReturns.commodities[commodity] || 0) + amount; remaining -= amount; });
          botLosses.set(candidate.id, loss);
        });
        context.setPlayers?.((previous: any[]) => previous.map(candidate => {
          const loss = botLosses.get(candidate.id);
          return !loss ? candidate : {
            ...candidate,
            resources: Object.fromEntries(Object.entries(candidate.resources || {}).map(([key, amount]) => [key, (amount as number) - (loss.resources[key] || 0)])),
            commodities: Object.fromEntries(Object.entries(candidate.commodities || {}).map(([key, amount]) => [key, (amount as number) - (loss.commodities[key] || 0)])),
          };
        }));
        context.setResourceBank?.((previous: any) => ({ ...previous, ...Object.fromEntries(Object.entries(botReturns.resources).map(([key, amount]) => [key, (previous[key] || 0) + amount])) }));
        context.setCommodityBank?.((previous: any) => ({ ...previous, ...Object.fromEntries(Object.entries(botReturns.commodities).map(([key, amount]) => [key, (previous[key] || 0) + amount])) }));
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, sabotageDiscardQueue: queue }));
        if (queue.length) context.setTurnSubPhase?.('SABOTEUR_DISCARD');
      } else if (action.cardId === 'DESERTER' && action.data?.targetPlayerId) {
        const target = context.players?.find((candidate: any) => candidate.id === action.data!.targetPlayerId);
        const knightVertex = target?.isBot ? context.vertices?.find((vertex: any) => vertex.knight?.playerId === target.id) : undefined;
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, deserterPending: { actorId: playerId, targetPlayerId: action.data!.targetPlayerId, ...(knightVertex ? { knight: { ...knightVertex.knight } } : {}) } }));
        if (knightVertex) context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === knightVertex.id ? { ...vertex, knight: undefined } : vertex));
        context.setTurnSubPhase?.(knightVertex ? 'DESERTER_PLACE' : 'DESERTER_SELECT');
      } else if (action.cardId === 'WEDDING') {
        const winnerPoints = player.victoryPoints || 0;
        const recipients = (context.players || []).filter(candidate => candidate.id !== playerId && (candidate.victoryPoints || 0) > winnerPoints);
        const queue = recipients.filter(candidate => !candidate.isBot).map(candidate => ({
          playerId: candidate.id,
          recipientId: playerId,
          amount: Math.min(2, Object.values(candidate.resources || {}).reduce((sum: number, amount: any) => sum + Number(amount || 0), 0) + Object.values(candidate.commodities || {}).reduce((sum: number, amount: any) => sum + Number(amount || 0), 0)),
        })).filter(entry => entry.amount > 0);
        context.setPlayers?.((previous: any[]) => {
          const next = previous.map(candidate => ({ ...candidate, resources: { ...candidate.resources }, commodities: { ...candidate.commodities } }));
          const receiving = next.find(candidate => candidate.id === playerId);
          next.filter(candidate => candidate.isBot && recipients.some(recipient => recipient.id === candidate.id)).forEach(candidate => {
            let remaining = Math.min(2, Object.values(candidate.resources || {}).reduce((sum: number, amount: any) => sum + Number(amount || 0), 0) + Object.values(candidate.commodities || {}).reduce((sum: number, amount: any) => sum + Number(amount || 0), 0));
            ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].forEach(key => { const taken = Math.min(candidate.resources[key] || 0, remaining); candidate.resources[key] -= taken; receiving.resources[key] = (receiving.resources[key] || 0) + taken; remaining -= taken; });
            ['COIN', 'PAPER', 'CLOTH'].forEach(key => { const taken = Math.min(candidate.commodities[key] || 0, remaining); candidate.commodities[key] -= taken; receiving.commodities[key] = (receiving.commodities[key] || 0) + taken; remaining -= taken; });
          });
          return next;
        });
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, weddingGiveQueue: queue }));
        if (queue.length) context.setTurnSubPhase?.('WEDDING_GIVE');
      } else if (action.cardId === 'COMMERCIAL_HARBOR') {
        const queue = (context.players || []).filter(candidate => candidate.id !== playerId && !candidate.isBot &&
          Object.values(candidate.resources || {}).reduce((sum: number, value: any) => sum + Number(value || 0), 0) + Object.values(candidate.commodities || {}).reduce((sum: number, value: any) => sum + Number(value || 0), 0) > 0)
          .map(candidate => ({ playerId: candidate.id, recipientId: playerId }));
        context.setPlayers?.((previous: any[]) => {
          const next = previous.map(candidate => ({ ...candidate, resources: { ...candidate.resources }, commodities: { ...candidate.commodities } }));
          const receiving = next.find(candidate => candidate.id === playerId);
          next.filter(candidate => candidate.id !== playerId && candidate.isBot).forEach(candidate => {
            const offered = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE', 'COIN', 'PAPER', 'CLOTH'].find(card => ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].includes(card) ? (candidate.resources[card] || 0) > 0 : (candidate.commodities[card] || 0) > 0);
            if (!offered) return;
            const field = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].includes(offered) ? 'resources' : 'commodities';
            candidate[field][offered] -= 1;
            receiving[field][offered] = (receiving[field][offered] || 0) + 1;
            const returned = (field === 'resources' ? ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] : ['COIN', 'PAPER', 'CLOTH']).find(card => (receiving[field][card] || 0) > 0);
            if (!returned) return;
            receiving[field][returned] -= 1;
            candidate[field][returned] = (candidate[field][returned] || 0) + 1;
          });
          return next;
        });
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, commercialHarborQueue: queue }));
        if (queue.length) context.setTurnSubPhase?.('COMMERCIAL_HARBOR_GIVE');
      } else if (action.cardId === 'DIPLOMAT' && action.data?.targetEdgeId) {
        context.setEdges?.((previous: any[]) => previous.map(edge => edge.id === action.data!.targetEdgeId ? { ...edge, hasRoad: false, playerId: null } : edge));
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId
          ? { ...candidate, diplomatRoadBuildingRemaining: (candidate.diplomatRoadBuildingRemaining || 0) + 1 }
          : candidate));
      } else if (action.cardId === 'INTRIGUE' && action.data?.targetVertexId) {
        const target = context.vertices?.find((vertex: any) => vertex.id === action.data!.targetVertexId);
        if (!target?.knight) return;
        context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === target.id ? { ...vertex, knight: undefined } : vertex));
        context.setCitiesKnightsState?.((previous: any) => ({ ...previous, pendingDisplacedKnight: { ownerId: target.knight.playerId, knight: { ...target.knight }, originVertexId: target.id } }));
        context.setTurnSubPhase?.('KNIGHT_DISPLACEMENT');
      } else if (action.cardId === 'CRANE') {
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? { ...candidate, cityImprovementDiscount: 1 } : candidate));
      } else if (action.cardId === 'SMITH') {
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? { ...candidate, freeKnightPromotions: (candidate.freeKnightPromotions || 0) + 2 } : candidate));
      } else if (action.cardId === 'ENGINEER' && action.data?.vertexId) {
        context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.data!.vertexId ? { ...vertex, cityWall: true } : vertex));
      } else if (action.cardId === 'IRRIGATION' || action.cardId === 'MINING') {
        const resource = action.cardId === 'IRRIGATION' ? 'WHEAT' : 'ORE';
        const hexes = (context.tiles || []).filter((tile: any) => {
          if (tile.type !== resource) return false;
          const center = cubeToPixel(tile.coord, 60);
          return Array.from({ length: 6 }, (_, index) => {
            const angle = (Math.PI / 180) * (60 * index - 30);
            return `v_${Math.round((center.x + 60 * Math.cos(angle)) * 10) / 10}_${Math.round((center.y + 60 * Math.sin(angle)) * 10) / 10}`;
          }).some(vertexId => {
            const vertex = (context.vertices || []).find((candidate: any) => candidate.id === vertexId);
            return vertex?.playerId === playerId && (vertex.structure === 'SETTLEMENT' || vertex.structure === 'CITY');
          });
        });
        const amount = Math.min(hexes.length * 2, context.resourceBank?.[resource] || 0);
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
          ...candidate, resources: { ...candidate.resources, [resource]: candidate.resources[resource] + amount },
        } : candidate));
        context.setResourceBank?.((previous: any) => ({ ...previous, [resource]: previous[resource] - amount }));
      } else if (action.cardId === 'MEDICINE' && action.data?.vertexId) {
        context.setVertices?.((previous: any[]) => previous.map(vertex => vertex.id === action.data!.vertexId ? { ...vertex, structure: 'CITY' } : vertex));
        context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
          ...candidate,
          victoryPoints: (candidate.victoryPoints || 0) + 1,
          resources: { ...candidate.resources, WHEAT: candidate.resources.WHEAT - 1, ORE: candidate.resources.ORE - 2 },
        } : candidate));
        context.setResourceBank?.((previous: any) => ({ ...previous, WHEAT: previous.WHEAT + 1, ORE: previous.ORE + 2 }));
      }
      context.addLog?.(`הופעל קלף קִדמה: ${action.cardId}.`);
      break;
    }
    case 'DISCARD_PROGRESS_CARD': {
      const player = context.players?.find((candidate: any) => candidate.id === playerId);
      if (!player?.progressCards?.includes(action.cardId)) return;
      const track = {
        ALCHEMIST: 'SCIENCE', CRANE: 'SCIENCE', ENGINEER: 'SCIENCE', INVENTOR: 'SCIENCE', IRRIGATION: 'SCIENCE', MEDICINE: 'SCIENCE', MINING: 'SCIENCE', ROAD_BUILDING: 'SCIENCE', SMITH: 'SCIENCE',
        BISHOP: 'POLITICS', DESERTER: 'POLITICS', DIPLOMAT: 'POLITICS', INTRIGUE: 'POLITICS', SABOTEUR: 'POLITICS', SPY: 'POLITICS', WARLORD: 'POLITICS', WEDDING: 'POLITICS',
        COMMERCIAL_HARBOR: 'TRADE', MASTER_MERCHANT: 'TRADE', MERCHANT: 'TRADE', MERCHANT_FLEET: 'TRADE', RESOURCE_MONOPOLY: 'TRADE', TRADE_MONOPOLY: 'TRADE',
      }[action.cardId] as 'SCIENCE' | 'POLITICS' | 'TRADE' | undefined;
      if (!track) return;
      context.setPlayers?.((previous: any[]) => previous.map(candidate => candidate.id === playerId ? {
        ...candidate, progressCards: candidate.progressCards.filter((card: string, index: number) => card !== action.cardId || index !== candidate.progressCards.indexOf(action.cardId)),
      } : candidate));
      context.setCitiesKnightsState?.((previous: any) => ({
        ...previous,
        progressDecks: { ...previous.progressDecks, [track]: [...(previous.progressDecks?.[track] || []), action.cardId] },
        progressDiscardQueue: (previous.progressDiscardQueue || []).slice(1),
      }));
      if ((context.citiesKnightsState?.progressDiscardQueue || []).length <= 1) {
        context.setTurnSubPhase?.('TRADE_AND_BUILD');
      }
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
