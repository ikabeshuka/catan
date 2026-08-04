import { GameAction, ResourceType, CommodityType, CityImprovementTrack } from '../../types/gameActions.types';
import { getTileVertexIds, getEdgeVertices } from '../hexMath/boardGeometryHelpers';
import { getTileEdgeIds } from '../gameEngine/generateEdges';
import { getEligibleHarborEdges } from '../gameEngine/lostTribeHelpers';
import { getOpenShipsForPlayer } from '../gameEngine/getOpenShipsForPlayer';
import { validateShipPlacement } from '../validation/validateShipPlacement';

type BotState = {
  botPlayer: any;
  turnSubPhase: string;
  players: any[];
  vertices: any[];
  edges: any[];
  tiles: any[];
  resourceBank?: any;
  commodityBank?: any;
  goldSelectionQueue?: Array<{ playerId: string; amount: number }>;
  robberyState?: { targets?: any[] } | null;
  citiesKnightsState?: any;
  hasMovedShipThisTurn?: boolean;
  currentTurnBuiltShips?: string[];
};

const RESOURCES: ResourceType[] = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];
const COMMODITIES: CommodityType[] = ['COIN', 'PAPER', 'CLOTH'];
const tracks: Array<{ track: CityImprovementTrack; commodity: CommodityType }> = [
  { track: 'SCIENCE', commodity: 'PAPER' },
  { track: 'POLITICS', commodity: 'COIN' },
  { track: 'TRADE', commodity: 'CLOTH' },
];

export type CitiesKnightsBotPlan = 'DEFEND_CATAN' | 'METROPOLIS_RACE' | 'PRESSURE_LEADER' | 'EXPAND_ECONOMY';

const cardCount = (player: any) =>
  RESOURCES.reduce((sum, resource) => sum + Number(player.resources?.[resource] || 0), 0) +
  COMMODITIES.reduce((sum, commodity) => sum + Number(player.commodities?.[commodity] || 0), 0);

const scoreOpponent = (player: any) => (player.victoryPoints || 0) * 10 + cardCount(player);

const leadingOpponent = (state: BotState) => state.players
  .filter(player => player.id !== state.botPlayer.id)
  .sort((left, right) => scoreOpponent(right) - scoreOpponent(left))[0];

const mostAbundant = (entries: Array<{ key: any; value: number }>) =>
  [...entries].sort((left, right) => right.value - left.value)[0]?.key;

/**
 * Hard and super-hard bots re-evaluate this plan each turn.  It deliberately
 * weighs the shared barbarian threat before private scoring, preventing the
 * common failure where an AI races for points and loses its own cities.
 */
export const getCitiesKnightsBotPlan = (state: BotState): CitiesKnightsBotPlan => {
  const player = state.botPlayer;
  const difficulty = player.difficulty || 'MEDIUM';
  const ownCities = state.vertices.filter(vertex => vertex.playerId === player.id && vertex.structure === 'CITY').length;
  const activeStrength = state.vertices
    .filter(vertex => vertex.knight?.playerId === player.id && vertex.knight.active)
    .reduce((sum, vertex) => sum + Number(vertex.knight.level || 0), 0);
  const allActiveStrength = state.vertices
    .filter(vertex => vertex.knight?.active)
    .reduce((sum, vertex) => sum + Number(vertex.knight.level || 0), 0);
  const barbarianPosition = Number(state.citiesKnightsState?.barbarianPosition || 0);
  const leader = leadingOpponent(state);
  const hasAffordableImprovement = tracks.some(({ track, commodity }) => {
    const level = Number(player.cityImprovements?.[track] || 0);
    return ownCities > 0 && level < 5 && Number(player.commodities?.[commodity] || 0) >= level + 1 - Number(player.cityImprovementDiscount || 0);
  });

  if (difficulty === 'HARD' || difficulty === 'SUPER_HARD') {
    const dangerSoon = barbarianPosition >= 5 && allActiveStrength < ownCities;
    if (dangerSoon || (barbarianPosition >= 6 && activeStrength === 0 && ownCities > 0)) return 'DEFEND_CATAN';
    if (difficulty === 'SUPER_HARD' && leader && (leader.victoryPoints || 0) >= (player.victoryPoints || 0) + 2) return 'PRESSURE_LEADER';
    if (hasAffordableImprovement) return 'METROPOLIS_RACE';
  }
  return 'EXPAND_ECONOMY';
};

const chooseDiscard = (player: any, amount: number) => {
  const cards = [
    ...RESOURCES.map(key => ({ key, field: 'resources' as const, value: Number(player.resources?.[key] || 0) })),
    ...COMMODITIES.map(key => ({ key, field: 'commodities' as const, value: Number(player.commodities?.[key] || 0) })),
  ].sort((left, right) => right.value - left.value);
  const resourcesToDiscard: Partial<Record<ResourceType, number>> = {};
  const commoditiesToDiscard: Partial<Record<CommodityType, number>> = {};
  let remaining = amount;
  for (const card of cards) {
    const selected = Math.min(card.value, remaining);
    if (!selected) continue;
    if (card.field === 'resources') resourcesToDiscard[card.key as ResourceType] = selected;
    else commoditiesToDiscard[card.key as CommodityType] = selected;
    remaining -= selected;
    if (!remaining) break;
  }
  return { resourcesToDiscard, commoditiesToDiscard };
};

const chooseRobberMove = (state: BotState): GameAction | null => {
  const isPirateGame = state.tiles.some(tile => tile.type === 'WATER' || tile.type === 'SEA');
  const candidates = state.tiles.filter(tile => !tile.hasRobber && tile.type !== 'DESERT' && tile.type !== 'WATER' && tile.type !== 'SEA');
  const pirateCandidates = state.tiles.filter(tile => (tile.type === 'WATER' || tile.type === 'SEA') && !tile.hasPirate);
  const scoreLand = (tile: any) => getTileVertexIds(tile).reduce((score, vertexId) => {
    const vertex = state.vertices.find(vertex => vertex.id === vertexId);
    if (!vertex?.playerId || vertex.playerId === state.botPlayer.id) return score;
    const opponent = state.players.find(player => player.id === vertex.playerId);
    return score + (vertex.structure === 'CITY' ? 8 : 4) + (opponent?.victoryPoints || 0);
  }, 0);
  const scoreSea = (tile: any) => getTileEdgeIds(tile).reduce((score, edgeId) => {
    const edge = state.edges.find(edge => edge.id === edgeId);
    if (!edge?.hasShip || edge.shipPlayerId === state.botPlayer.id) return score;
    const opponent = state.players.find(player => player.id === edge.shipPlayerId);
    return score + 5 + (opponent?.victoryPoints || 0);
  }, 0);
  const bestLand = [...candidates].sort((left, right) => scoreLand(right) - scoreLand(left))[0];
  const bestSea = [...pirateCandidates].sort((left, right) => scoreSea(right) - scoreSea(left))[0];
  const usePirate = isPirateGame && bestSea && (!bestLand || scoreSea(bestSea) > scoreLand(bestLand));
  const tile = usePirate ? bestSea : bestLand;
  if (!tile) return null;
  return { type: 'MOVE_ROBBER', playerId: state.botPlayer.id, tileId: tile.id, robberType: usePirate ? 'PIRATE' : 'ROBBER' };
};

const chooseProgressCard = (state: BotState): GameAction | null => {
  const player = state.botPlayer;
  const cards: string[] = player.progressCards || [];
  const ownCities = state.vertices.filter(vertex => vertex.playerId === player.id && vertex.structure === 'CITY');
  const ownSettlements = state.vertices.filter(vertex => vertex.playerId === player.id && vertex.structure === 'SETTLEMENT');
  const ownKnights = state.vertices.filter(vertex => vertex.knight?.playerId === player.id);
  const opponent = leadingOpponent(state);

  if (cards.includes('WARLORD') && ownKnights.some(vertex => !vertex.knight.active)) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'WARLORD' };
  if (cards.includes('SMITH') && ownKnights.some(vertex => vertex.knight.level < 3 && !vertex.knight.promotedThisTurn)) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'SMITH' };
  const wallCity = ownCities.find(vertex => !vertex.cityWall) && state.vertices.filter(vertex => vertex.playerId === player.id && vertex.cityWall).length < 3;
  if (cards.includes('ENGINEER') && wallCity) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'ENGINEER', data: { vertexId: wallCity.id } };
  if (cards.includes('MEDICINE') && ownSettlements.length && (player.resources?.WHEAT || 0) >= 1 && (player.resources?.ORE || 0) >= 2) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MEDICINE', data: { vertexId: ownSettlements[0].id } };
  const wheatTile = state.tiles.find(tile => tile.type === 'WHEAT' && getTileVertexIds(tile).some(vertexId => state.vertices.some(vertex => vertex.id === vertexId && vertex.playerId === player.id)));
  if (cards.includes('IRRIGATION') && wheatTile) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'IRRIGATION' };
  const oreTile = state.tiles.find(tile => tile.type === 'ORE' && getTileVertexIds(tile).some(vertexId => state.vertices.some(vertex => vertex.id === vertexId && vertex.playerId === player.id)));
  if (cards.includes('MINING') && oreTile) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MINING' };
  if (cards.includes('CRANE')) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'CRANE' };
  if (cards.includes('ROAD_BUILDING')) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'ROAD_BUILDING' };
  const inventorTiles = state.tiles.filter(tile => Number.isInteger(tile.numberToken) && ![2, 12].includes(tile.numberToken));
  if (cards.includes('INVENTOR') && inventorTiles.length >= 2) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'INVENTOR', data: { tileAId: inventorTiles[0].id, tileBId: inventorTiles[inventorTiles.length - 1].id } };
  if (cards.includes('BISHOP')) {
    const target = [...state.tiles]
      .filter(tile => !['WATER', 'SEA', 'DESERT'].includes(tile.type))
      .sort((left, right) => getTileVertexIds(right).filter(vertexId => state.vertices.some(vertex => vertex.id === vertexId && vertex.playerId !== player.id)).length - getTileVertexIds(left).filter(vertexId => state.vertices.some(vertex => vertex.id === vertexId && vertex.playerId !== player.id)).length)[0];
    if (target) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'BISHOP', data: { tileId: target.id } };
  }
  if (cards.includes('SABOTEUR')) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'SABOTEUR' };
  if (cards.includes('WEDDING')) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'WEDDING' };
  if (cards.includes('COMMERCIAL_HARBOR')) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'COMMERCIAL_HARBOR' };
  if (cards.includes('DIPLOMAT')) {
    const road = state.edges.find(edge => edge.hasRoad && edge.playerId && getEdgeVertices(edge.id).every(vertexId => state.vertices.find(vertex => vertex.id === vertexId)?.structure === 'NONE'));
    if (road) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'DIPLOMAT', data: { targetEdgeId: road.id } };
  }
  if (cards.includes('INTRIGUE')) {
    const target = state.vertices.find(vertex => vertex.knight && vertex.knight.playerId !== player.id && state.edges.some(edge => getEdgeVertices(edge.id).includes(vertex.id) && getEdgeVertices(edge.id).some(vertexId => state.vertices.find(candidate => candidate.id === vertexId)?.knight?.playerId === player.id && state.vertices.find(candidate => candidate.id === vertexId)?.knight?.active)));
    if (target) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'INTRIGUE', data: { targetVertexId: target.id } };
  }
  if (cards.includes('MERCHANT')) {
    const target = state.tiles.find(tile => RESOURCES.includes(tile.type) && getTileVertexIds(tile).some(vertexId => state.vertices.some(vertex => vertex.id === vertexId && vertex.playerId === player.id && ['SETTLEMENT', 'CITY'].includes(vertex.structure))));
    if (target) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MERCHANT', data: { tileId: target.id } };
  }
  const resource = mostAbundant(RESOURCES.map(key => ({ key, value: state.players.filter(other => other.id !== player.id).reduce((sum, other) => sum + Number(other.resources?.[key] || 0), 0) })));
  if (cards.includes('RESOURCE_MONOPOLY') && resource) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'RESOURCE_MONOPOLY', data: { resource } };
  const commodity = mostAbundant(COMMODITIES.map(key => ({ key, value: state.players.filter(other => other.id !== player.id).reduce((sum, other) => sum + Number(other.commodities?.[key] || 0), 0) })));
  if (cards.includes('TRADE_MONOPOLY') && commodity) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'TRADE_MONOPOLY', data: { resource: commodity } };
  if (cards.includes('MERCHANT_FLEET')) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MERCHANT_FLEET', data: { resource: mostAbundant(RESOURCES.map(key => ({ key, value: Number(player.resources?.[key] || 0) }))) || 'WOOD' } };
  if (cards.includes('SPY')) {
    const target = state.players.find(other => other.id !== player.id && other.progressCards?.length);
    if (target) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'SPY', data: { targetPlayerId: target.id, targetCardId: target.progressCards[0] } };
  }
  if (cards.includes('DESERTER')) {
    const target = state.players.filter(other => other.id !== player.id && state.vertices.some(vertex => vertex.knight?.playerId === other.id)).sort((left, right) => scoreOpponent(right) - scoreOpponent(left))[0];
    if (target) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'DESERTER', data: { targetPlayerId: target.id } };
  }
  if (cards.includes('MASTER_MERCHANT') && opponent && opponent.victoryPoints > player.victoryPoints) {
    const available = [...RESOURCES, ...COMMODITIES].flatMap(key => Array.from({ length: Number((RESOURCES as string[]).includes(key) ? opponent.resources?.[key] || 0 : opponent.commodities?.[key] || 0) }, () => key));
    if (available.length >= 2) return { type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MASTER_MERCHANT', data: { targetPlayerId: opponent.id, selectedCards: available.slice(0, 2) as any } };
  }
  return null;
};

/**
 * Chooses the mandatory response for a bot.  Every result is a normal
 * GameAction, so local games and host-controlled online games use the same
 * validation path as human players.
 */
export const chooseBotReactiveAction = (state: BotState): GameAction | null => {
  const player = state.botPlayer;
  const phase = state.turnSubPhase;
  if (phase === 'ROBBER_PLACEMENT') return chooseRobberMove(state);
  if (phase === 'ROBBER_STEAL') {
    const victim = [...(state.robberyState?.targets || state.players.filter(other => other.id !== player.id && cardCount(other) > 0))]
      .sort((left, right) => scoreOpponent(right) - scoreOpponent(left))[0];
    if (!victim) return null;
    const resource = mostAbundant(RESOURCES.map(key => ({ key, value: Number(victim.resources?.[key] || 0) })));
    const commodity = mostAbundant(COMMODITIES.map(key => ({ key, value: Number(victim.commodities?.[key] || 0) })));
    const stolenResource = (commodity && Number(victim.commodities?.[commodity] || 0) > Number(victim.resources?.[resource] || 0)) ? commodity : resource;
    return stolenResource ? { type: 'STEAL_RESOURCE', playerId: player.id, victimPlayerId: victim.id, stolenResource } : null;
  }
  if (phase === 'GOLD_RESOURCE_SELECTION') {
    const pending = state.goldSelectionQueue?.[0];
    if (!pending || pending.playerId !== player.id) return null;
    const resource = mostAbundant(RESOURCES.map(key => ({ key, value: Number(state.resourceBank?.[key] || 0) })));
    return resource ? { type: 'SELECT_GOLD_RESOURCE', playerId: player.id, resource } : null;
  }
  if (phase === 'HARBOR_PLACEMENT') {
    const edge = getEligibleHarborEdges(player.id, state.vertices, state.edges, state.tiles)[0];
    return edge ? { type: 'PLACE_HARBOR', playerId: player.id, edgeId: edge.id } : null;
  }
  if (phase === 'BARBARIAN_LOSS') {
    const city = state.vertices.find(vertex => vertex.playerId === player.id && vertex.structure === 'CITY' && !vertex.metropolis);
    return city ? { type: 'DOWNGRADE_CITY', playerId: player.id, vertexId: city.id } : null;
  }
  if (phase === 'KNIGHT_DISPLACEMENT') {
    const pending = state.citiesKnightsState?.pendingDisplacedKnight;
    if (pending?.ownerId !== player.id) return null;
    const destination = state.vertices.find(vertex => vertex.structure === 'NONE' && !vertex.knight && state.edges.some(edge =>
      edge.hasRoad && edge.playerId === player.id && getEdgeVertices(edge.id).includes(vertex.id)
    ));
    // The server verifies the relocation route. Passing no destination is the
    // legal fallback when no known empty intersection is available.
    return { type: 'RELOCATE_DISPLACED_KNIGHT', playerId: player.id, toVertexId: destination?.id };
  }
  if (phase === 'PROGRESS_DISCARD') {
    const cardId = player.progressCards?.[0];
    return cardId ? { type: 'DISCARD_PROGRESS_CARD', playerId: player.id, cardId } : null;
  }
  if (phase === 'DISCARD_PHASE' || phase === 'SABOTEUR_DISCARD') {
    const queued = phase === 'SABOTEUR_DISCARD' ? state.citiesKnightsState?.sabotageDiscardQueue?.[0] : null;
    const amount = queued?.amount ?? Math.floor(cardCount(player) / 2);
    const discarded = chooseDiscard(player, amount);
    return { type: 'DISCARD_CARDS', playerId: player.id, ...discarded };
  }
  if (phase === 'DESERTER_SELECT') {
    const knight = state.vertices.find(vertex => vertex.knight?.playerId === player.id);
    return knight ? { type: 'SELECT_DESERTER_KNIGHT', playerId: player.id, vertexId: knight.id } : null;
  }
  if (phase === 'DESERTER_PLACE') {
    const destination = state.vertices.find(vertex => vertex.structure === 'NONE' && !vertex.knight && state.edges.some(edge => edge.hasRoad && edge.playerId === player.id && getEdgeVertices(edge.id).includes(vertex.id)));
    return destination ? { type: 'PLACE_DESERTER_KNIGHT', playerId: player.id, vertexId: destination.id } : null;
  }
  if (phase === 'TRADE_AND_BUILD' && !state.hasMovedShipThisTurn && ['MEDIUM', 'HARD', 'SUPER_HARD'].includes(player.difficulty || '')) {
    const source = getOpenShipsForPlayer(player.id, state.edges, state.vertices, state.currentTurnBuiltShips || [], state.tiles)[0];
    if (source) {
      const edgesWithoutSource = state.edges.map(edge => edge.id === source.id ? { ...edge, hasShip: false, shipPlayerId: undefined } : edge);
      const target = edgesWithoutSource.find(edge => edge.id !== source.id && validateShipPlacement(edge.id, player.id, state.vertices, edgesWithoutSource, state.tiles, 'MAIN_GAME'));
      if (target) return { type: 'MOVE_SHIP', playerId: player.id, fromEdgeId: source.id, toEdgeId: target.id };
    }
  }
  if (phase === 'TRADE_AND_BUILD' && player.cityImprovements) return chooseProgressCard(state);
  return null;
};

export const chooseCitiesKnightsBuildAction = (state: BotState): GameAction | null => {
  const player = state.botPlayer;
  if (!player.cityImprovements || state.turnSubPhase !== 'TRADE_AND_BUILD') return null;
  const ownCities = state.vertices.filter(vertex => vertex.playerId === player.id && vertex.structure === 'CITY');
  const ownKnights = state.vertices.filter(vertex => vertex.knight?.playerId === player.id);
  const emptyKnightVertex = state.vertices.find(vertex => vertex.structure === 'NONE' && !vertex.knight && state.edges.some(edge => edge.hasRoad && edge.playerId === player.id && getEdgeVertices(edge.id).includes(vertex.id)));
  const mobileKnight = ownKnights.find(vertex => vertex.knight.active && !vertex.knight.actedThisTurn);
  const plan = getCitiesKnightsBotPlan(state);
  if (mobileKnight && ['MEDIUM', 'HARD', 'SUPER_HARD'].includes(player.difficulty || '')) {
    const attack = state.edges
      .filter(edge => edge.hasRoad && edge.playerId === player.id && getEdgeVertices(edge.id).includes(mobileKnight.id))
      .map(edge => state.vertices.find(vertex => getEdgeVertices(edge.id).includes(vertex.id) && vertex.id !== mobileKnight.id))
      .find(vertex => vertex?.knight && vertex.knight.playerId !== player.id && vertex.knight.level < mobileKnight.knight.level);
    if (attack) return { type: 'DISPLACE_KNIGHT', playerId: player.id, fromVertexId: mobileKnight.id, toVertexId: attack.id };
    const advance = state.edges
      .filter(edge => edge.hasRoad && edge.playerId === player.id && getEdgeVertices(edge.id).includes(mobileKnight.id))
      .map(edge => state.vertices.find(vertex => getEdgeVertices(edge.id).includes(vertex.id) && vertex.id !== mobileKnight.id))
      .find(vertex => vertex?.structure === 'NONE' && !vertex.knight);
    if (advance) return { type: 'MOVE_KNIGHT', playerId: player.id, fromVertexId: mobileKnight.id, toVertexId: advance.id };
  }
  const inactive = ownKnights.find(vertex => !vertex.knight.active);
  const upgrade = tracks
    .map(entry => ({ ...entry, level: Number(player.cityImprovements?.[entry.track] || 0), cards: Number(player.commodities?.[entry.commodity] || 0) }))
    .filter(entry => ownCities.length && entry.level < 5 && entry.cards >= entry.level + 1 - Number(player.cityImprovementDiscount || 0))
    .sort((left, right) => (right.cards - right.level) - (left.cards - left.level))[0];
  const wall = ownCities.find(vertex => !vertex.cityWall);
  const promote = ownKnights.find(vertex => vertex.knight.level < 3 && !vertex.knight.promotedThisTurn);
  const canBuildKnight = (player.resources?.SHEEP || 0) >= 1 && (player.resources?.ORE || 0) >= 1 && ownKnights.length < 6 && emptyKnightVertex;
  const canActivate = inactive && (player.resources?.WHEAT || 0) >= 1;
  const canPromote = promote && ((player.freeKnightPromotions || 0) > 0 || ((player.resources?.SHEEP || 0) >= 1 && (player.resources?.ORE || 0) >= 1));
  const canBuildWall = wall && (player.resources?.BRICK || 0) >= 2 && state.vertices.filter(vertex => vertex.playerId === player.id && vertex.cityWall).length < 3;

  if (plan === 'DEFEND_CATAN') {
    if (canActivate) return { type: 'ACTIVATE_KNIGHT', playerId: player.id, vertexId: inactive.id };
    if (canPromote) return { type: 'UPGRADE_KNIGHT', playerId: player.id, vertexId: promote.id };
    if (canBuildKnight) return { type: 'BUILD_KNIGHT', playerId: player.id, vertexId: emptyKnightVertex.id };
  }
  if (plan === 'METROPOLIS_RACE' && upgrade) return { type: 'UPGRADE_CITY_IMPROVEMENT', playerId: player.id, track: upgrade.track };
  if (plan === 'PRESSURE_LEADER') {
    if (canActivate) return { type: 'ACTIVATE_KNIGHT', playerId: player.id, vertexId: inactive.id };
    if (canPromote) return { type: 'UPGRADE_KNIGHT', playerId: player.id, vertexId: promote.id };
  }
  if (upgrade) return { type: 'UPGRADE_CITY_IMPROVEMENT', playerId: player.id, track: upgrade.track };
  if (canBuildKnight) return { type: 'BUILD_KNIGHT', playerId: player.id, vertexId: emptyKnightVertex.id };
  if (canActivate) return { type: 'ACTIVATE_KNIGHT', playerId: player.id, vertexId: inactive.id };
  if (canBuildWall) return { type: 'BUILD_CITY_WALL', playerId: player.id, vertexId: wall.id };
  if (canPromote) return { type: 'UPGRADE_KNIGHT', playerId: player.id, vertexId: promote.id };
  return null;
};
