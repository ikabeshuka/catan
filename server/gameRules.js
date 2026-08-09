const RESOURCE_TYPES = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];
const COMMODITY_TYPES = ['COIN', 'PAPER', 'CLOTH'];
const CITY_IMPROVEMENT_TRACKS = ['SCIENCE', 'POLITICS', 'TRADE'];
const CITY_EVENT_TYPES = ['BARBARIAN', ...CITY_IMPROVEMENT_TRACKS];
const INITIAL_PROGRESS_DECKS = {
  SCIENCE: ['ALCHEMIST', 'ALCHEMIST', 'CRANE', 'CRANE', 'ENGINEER', 'INVENTOR', 'INVENTOR', 'IRRIGATION', 'IRRIGATION', 'MEDICINE', 'MEDICINE', 'MINING', 'MINING', 'PRINTER', 'ROAD_BUILDING', 'ROAD_BUILDING', 'SMITH', 'SMITH'],
  POLITICS: ['BISHOP', 'BISHOP', 'CONSTITUTION', 'DESERTER', 'DESERTER', 'DIPLOMAT', 'DIPLOMAT', 'INTRIGUE', 'INTRIGUE', 'SABOTEUR', 'SABOTEUR', 'SPY', 'SPY', 'SPY', 'WARLORD', 'WARLORD', 'WEDDING', 'WEDDING'],
  TRADE: ['COMMERCIAL_HARBOR', 'COMMERCIAL_HARBOR', 'MASTER_MERCHANT', 'MASTER_MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT_FLEET', 'MERCHANT_FLEET', 'RESOURCE_MONOPOLY', 'RESOURCE_MONOPOLY', 'RESOURCE_MONOPOLY', 'RESOURCE_MONOPOLY', 'TRADE_MONOPOLY', 'TRADE_MONOPOLY'],
};
const PROGRESS_TRACK_BY_CARD = Object.fromEntries(Object.entries(INITIAL_PROGRESS_DECKS).flatMap(([track, deck]) =>
  [...new Set(deck)].map(card => [card, track])
));
const shuffled = deck => {
  const copy = [...deck];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};
const DEV_CARD_TYPES = ['KNIGHT', 'VICTORY_POINT', 'ROAD_BUILDING', 'YEAR_OF_PLENTY', 'MONOPOLY', 'KNIGHTHOOD', 'STRONG_KNIGHT', 'TREASON', 'INTRIGUE', 'SWIFT_JOURNEY'];
const BARBARIAN_ATTACK_CARD_TYPES = new Set(['KNIGHTHOOD', 'STRONG_KNIGHT', 'TREASON', 'INTRIGUE']);
const FISH_ACTION_COSTS = { MOVE_ROBBER: 2, STEAL_CARD: 3, TAKE_BANK_RESOURCE: 4, FREE_ROAD: 5, FREE_DEV_CARD: 7 };
const TREASURES_DRAGONS_ADVENTURERS_SCENARIOS = new Set([
  'TREASURE_ISLANDS', 'INTO_THE_UNKNOWN', 'GREATER_CATAN', 'DESERT_DRAGONS', 'GREAT_CANAL', 'ENCHANTED_LAND',
]);
const PIRATE_ISLANDS_FLEET_ROUTE = [49, 48, 41, 33, 25, 16, 9, 3, 4, 11, 18, 26, 35, 43];
const ACTION_TYPES = new Set([
  'ROLL_DICE', 'END_TURN', 'DISCARD_CARDS', 'GIVE_PROGRESS_CARDS',
  'BUILD_SETTLEMENT', 'BUILD_CITY', 'BUILD_ROAD', 'BUILD_SHIP',
  'BUY_DEV_CARD', 'PLAY_DEV_CARD', 'MOVE_ROBBER', 'STEAL_RESOURCE',
  'PROPOSE_TRADE', 'ACCEPT_TRADE', 'DECLINE_TRADE', 'BANK_TRADE',
  'EXECUTE_PLAYER_TRADE', 'GOLD_TRADE',
  'MOVE_SHIP', 'PLACE_HARBOR', 'DISCOVER_FOG', 'SELECT_GOLD_RESOURCE',
  'ATTACK_PIRATE_FORTRESS',
  'DISCOVER_SCENARIO_HEX', 'CLAIM_TREASURE', 'KEEP_TREASURE', 'MOVE_ENCHANTED_KNIGHT', 'FIGHT_ENCHANTED_DRAGON',
  'MOVE_WAGON', 'UPGRADE_WAGON', 'PLACE_MERCHANTS_BARBARIAN', 'BUILD_BRIDGE', 'CAST_CARAVAN_VOTE', 'CHOOSE_CARAVAN_TIE_LOCATION', 'PLACE_CARAVAN_CAMEL', 'RESOLVE_BARBARIAN_CARD', 'MOVE_BARBARIAN_KNIGHT', 'SPEND_FISH_ACTION', 'PASS_OLD_BOOT',
  'BUILD_KNIGHT', 'ACTIVATE_KNIGHT', 'UPGRADE_KNIGHT', 'MOVE_KNIGHT', 'DISPLACE_KNIGHT', 'RELOCATE_DISPLACED_KNIGHT', 'SELECT_DESERTER_KNIGHT', 'PLACE_DESERTER_KNIGHT',
  'EXPEL_PIRATE',
  'BUILD_CITY_WALL', 'UPGRADE_CITY_IMPROVEMENT', 'DOWNGRADE_CITY', 'PLAY_PROGRESS_CARD', 'DISCARD_PROGRESS_CARD',
]);

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isId = (value) => typeof value === 'string' && value.length > 0 && value.length <= 160;
const isResource = (value) => RESOURCE_TYPES.includes(value);
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

function validateResourceMap(value, { allowEmpty = true } = {}) {
  if (!isPlainObject(value)) return false;
  const entries = Object.entries(value);
  if (!allowEmpty && entries.length === 0) return false;
  return entries.every(([key, amount]) => isResource(key) && isNonNegativeInteger(amount));
}
function validateCommodityMap(value, { allowEmpty = true } = {}) {
  if (value === undefined) return allowEmpty;
  if (!isPlainObject(value)) return false;
  const entries = Object.entries(value);
  if (!allowEmpty && entries.length === 0) return false;
  return entries.every(([key, amount]) => COMMODITY_TYPES.includes(key) && isNonNegativeInteger(amount));
}

function validateActionShape(action, { authoritative = false } = {}) {
  if (!isPlainObject(action) || !ACTION_TYPES.has(action.type) || !isId(action.playerId)) {
    return { ok: false, message: 'Invalid game action' };
  }

  const requireId = (key) => isId(action[key]);
  switch (action.type) {
    case 'ROLL_DICE':
      if ((!authoritative && action.diceValues !== undefined) || (authoritative &&
          (!Array.isArray(action.diceValues) || ![2, 3].includes(action.diceValues.length) ||
          !action.diceValues.every(value => Number.isInteger(value) && value >= 1 && value <= 6)) ||
          (action.eventDie !== undefined && !CITY_EVENT_TYPES.includes(action.eventDie)))) {
        return { ok: false, message: 'Invalid dice values' };
      }
      break;
    case 'DISCARD_CARDS':
      if (!validateResourceMap(action.resourcesToDiscard) || !validateCommodityMap(action.commoditiesToDiscard) ||
          (!Object.keys(action.resourcesToDiscard).length && !Object.keys(action.commoditiesToDiscard || {}).length)) {
        return { ok: false, message: 'Invalid discard selection' };
      }
      break;
    case 'GIVE_PROGRESS_CARDS':
      if (!requireId('targetPlayerId') || action.targetPlayerId === action.playerId ||
          !validateResourceMap(action.resourcesToGive) || !validateCommodityMap(action.commoditiesToGive) ||
          (!Object.keys(action.resourcesToGive).length && !Object.keys(action.commoditiesToGive || {}).length)) {
        return { ok: false, message: 'Invalid progress-card transfer' };
      }
      break;
    case 'BUILD_SETTLEMENT':
    case 'BUILD_CITY':
      if (!requireId('vertexId')) return { ok: false, message: 'Invalid vertex' };
      break;
    case 'BUILD_ROAD':
    case 'BUILD_SHIP':
    case 'PLACE_HARBOR':
      if (!requireId('edgeId')) return { ok: false, message: 'Invalid edge' };
      break;
    case 'BUY_DEV_CARD':
      if (!DEV_CARD_TYPES.includes(action.cardType)) return { ok: false, message: 'Invalid development card' };
      break;
    case 'RESOLVE_BARBARIAN_CARD':
      if ((action.edgeId !== undefined && !requireId('edgeId')) || (action.tileId !== undefined && !requireId('tileId')) ||
          (action.sourceTileIds !== undefined && (!Array.isArray(action.sourceTileIds) || action.sourceTileIds.length !== 2 || !action.sourceTileIds.every(isId))) ||
          (action.targetTileIds !== undefined && (!Array.isArray(action.targetTileIds) || action.targetTileIds.length !== 2 || !action.targetTileIds.every(isId)))) {
        return { ok: false, message: 'Invalid Barbarian Attack card resolution' };
      }
      break;
    case 'MOVE_BARBARIAN_KNIGHT':
      if (!requireId('knightId') || !requireId('edgeId') || (action.payWheat !== undefined && typeof action.payWheat !== 'boolean')) return { ok: false, message: 'Invalid Barbarian Attack knight move' };
      break;
    case 'PLAY_DEV_CARD':
      if (!DEV_CARD_TYPES.includes(action.cardType)) {
        return { ok: false, message: 'Invalid development card play' };
      }
      if (action.cardType === 'MONOPOLY' && !isResource(action.data?.resource)) {
        return { ok: false, message: 'Invalid monopoly resource' };
      }
      if (action.cardType === 'YEAR_OF_PLENTY' &&
          (!Array.isArray(action.data?.resources) || action.data.resources.length !== 2 || !action.data.resources.every(isResource))) {
        return { ok: false, message: 'Invalid Year of Plenty resources' };
      }
      break;
    case 'MOVE_ROBBER':
      if (!requireId('tileId') || (action.robberType && !['ROBBER', 'PIRATE'].includes(action.robberType)) ||
          (!authoritative && (action.hasEligibleVictims !== undefined || action.eligibleVictimPlayerIds !== undefined))) {
        return { ok: false, message: 'Invalid robber move' };
      }
      break;
    case 'STEAL_RESOURCE':
      if (!requireId('victimPlayerId') || (!authoritative && action.stolenResource !== undefined) ||
          (action.stealKind && !['RESOURCE', 'CLOTH'].includes(action.stealKind)) ||
          (authoritative && !isResource(action.stolenResource) && !COMMODITY_TYPES.includes(action.stolenResource))) {
        return { ok: false, message: 'Invalid steal action' };
      }
      break;
    case 'PROPOSE_TRADE':
      if (!validateResourceMap(action.tradeOffer?.offer, { allowEmpty: false }) ||
          !validateResourceMap(action.tradeOffer?.request, { allowEmpty: false })) {
        return { ok: false, message: 'Invalid trade offer' };
      }
      break;
    case 'ACCEPT_TRADE':
      if (!requireId('targetPlayerId')) return { ok: false, message: 'Invalid trade target' };
      break;
    case 'BANK_TRADE':
      if (!isResource(action.offeredResource) || !isResource(action.requestedResource) ||
          action.offeredResource === action.requestedResource || ![2, 3, 4].includes(action.ratio)) {
        return { ok: false, message: 'Invalid bank trade' };
      }
      break;
    case 'EXECUTE_PLAYER_TRADE':
      if (!requireId('targetPlayerId') || action.targetPlayerId === action.playerId ||
          !validateResourceMap(action.offer, { allowEmpty: false }) || !validateResourceMap(action.request, { allowEmpty: false })) {
        return { ok: false, message: 'Invalid player trade' };
      }
      break;
    case 'GOLD_TRADE':
      if (!isResource(action.requestedResource)) return { ok: false, message: 'Invalid gold trade' };
      break;
    case 'MOVE_SHIP':
      if (!requireId('fromEdgeId') || !requireId('toEdgeId') || action.fromEdgeId === action.toEdgeId) {
        return { ok: false, message: 'Invalid ship move' };
      }
      break;
    case 'DISCOVER_FOG':
      if (!requireId('tileId') || !isPlainObject(action.revealedTile)) return { ok: false, message: 'Invalid fog discovery' };
      break;
    case 'SELECT_GOLD_RESOURCE':
      if (!isResource(action.resource)) return { ok: false, message: 'Invalid gold resource' };
      break;
    case 'ATTACK_PIRATE_FORTRESS':
      if (!requireId('fortressVertexId') ||
          (!authoritative && action.fortressPower !== undefined) ||
          (authoritative && (!Number.isInteger(action.fortressPower) || action.fortressPower < 1 || action.fortressPower > 6))) {
        return { ok: false, message: 'Invalid fortress attack' };
      }
      break;
    case 'DISCOVER_SCENARIO_HEX':
      if (!requireId('tileId')) return { ok: false, message: 'Invalid scenario hex discovery' };
      break;
    case 'CLAIM_TREASURE':
    case 'KEEP_TREASURE':
      if (!requireId('treasureId')) return { ok: false, message: 'Invalid treasure' };
      if (action.type === 'CLAIM_TREASURE' && action.progressTrack !== undefined && !CITY_IMPROVEMENT_TRACKS.includes(action.progressTrack)) {
        return { ok: false, message: 'Invalid treasure progress-card stack' };
      }
      if (action.type === 'KEEP_TREASURE' && action.harborType !== undefined && !isResource(action.harborType)) return { ok: false, message: 'Invalid treasure harbor' };
      break;
    case 'MOVE_ENCHANTED_KNIGHT':
      if (!requireId('fromVertexId') || !requireId('toVertexId') || action.fromVertexId === action.toVertexId) {
        return { ok: false, message: 'Invalid enchanted knight move' };
      }
      break;
    case 'FIGHT_ENCHANTED_DRAGON':
      if (!requireId('knightVertexId') || !requireId('dragonId')) return { ok: false, message: 'Invalid dragon fight' };
      break;
    case 'MOVE_WAGON':
      if (!requireId('targetVertexId') || !Number.isInteger(action.movementCost) || action.movementCost < 1 || action.movementCost > 5 ||
          (action.wheatBoost !== undefined && typeof action.wheatBoost !== 'boolean')) return { ok: false, message: 'Invalid wagon move' };
      break;
    case 'UPGRADE_WAGON':
      if (![2, 3, 4, 5].includes(action.newLevel) || !['RESOURCES', 'GOLD'].includes(action.payment)) {
        return { ok: false, message: 'Invalid wagon upgrade' };
      }
      break;
    case 'PLACE_MERCHANTS_BARBARIAN':
      if (!requireId('edgeId')) return { ok: false, message: 'Invalid barbarian location' };
      break;
    case 'BUILD_BRIDGE':
      if (!requireId('edgeId')) return { ok: false, message: 'Invalid bridge location' };
      break;
    case 'CAST_CARAVAN_VOTE':
      if (!isPlainObject(action.cards) || !isNonNegativeInteger(action.cards.SHEEP) || !isNonNegativeInteger(action.cards.WHEAT) ||
          Object.keys(action.cards).some(key => !['SHEEP', 'WHEAT'].includes(key))) return { ok: false, message: 'Invalid caravan vote' };
      break;
    case 'CHOOSE_CARAVAN_TIE_LOCATION':
    case 'PLACE_CARAVAN_CAMEL':
      if (!requireId('edgeId')) return { ok: false, message: 'Invalid camel location' };
      break;
    case 'SPEND_FISH_ACTION':
      if (!Object.hasOwn(FISH_ACTION_COSTS, action.actionType) ||
          (action.targetPlayerId !== undefined && !requireId('targetPlayerId')) ||
          (action.resource !== undefined && !isResource(action.resource))) {
        return { ok: false, message: 'Invalid fish action' };
      }
      break;
    case 'PASS_OLD_BOOT':
      if (!requireId('targetPlayerId') || action.targetPlayerId === action.playerId) {
        return { ok: false, message: 'Invalid Old Boot target' };
      }
      break;
    case 'BUILD_KNIGHT':
    case 'ACTIVATE_KNIGHT':
    case 'UPGRADE_KNIGHT':
    case 'BUILD_CITY_WALL':
    case 'DOWNGRADE_CITY':
      if (!requireId('vertexId')) return { ok: false, message: 'Invalid Cities & Knights vertex' };
      break;
    case 'MOVE_KNIGHT':
    case 'DISPLACE_KNIGHT':
      if (!requireId('fromVertexId') || !requireId('toVertexId') || action.fromVertexId === action.toVertexId) {
        return { ok: false, message: 'Invalid knight move' };
      }
      break;
    case 'EXPEL_PIRATE':
      if (!requireId('vertexId') || !requireId('tileId')) return { ok: false, message: 'Invalid pirate expulsion' };
      break;
    case 'RELOCATE_DISPLACED_KNIGHT':
      if (action.toVertexId !== undefined && !requireId('toVertexId')) return { ok: false, message: 'Invalid displaced knight target' };
      break;
    case 'SELECT_DESERTER_KNIGHT':
    case 'PLACE_DESERTER_KNIGHT':
      if (!requireId('vertexId')) return { ok: false, message: 'Invalid Deserter knight target' };
      break;
    case 'UPGRADE_CITY_IMPROVEMENT':
      if (!CITY_IMPROVEMENT_TRACKS.includes(action.track)) return { ok: false, message: 'Invalid city improvement track' };
      break;
    case 'PLAY_PROGRESS_CARD':
    case 'DISCARD_PROGRESS_CARD':
      if (typeof action.cardId !== 'string' || !PROGRESS_TRACK_BY_CARD[action.cardId]) return { ok: false, message: 'Invalid progress card' };
      if (action.cardId === 'ALCHEMIST' && (!Array.isArray(action.data?.diceValues) || action.data.diceValues.length !== 3 ||
          !action.data.diceValues.every(value => Number.isInteger(value) && value >= 1 && value <= 6) ||
          !CITY_EVENT_TYPES.includes(action.data?.eventDie))) {
        return { ok: false, message: 'Alchemist needs all three dice and an event die' };
      }
      break;
    default:
      break;
  }
  return { ok: true };
}

const totalResources = (player) => RESOURCE_TYPES.reduce((sum, key) => sum + (player.resources?.[key] || 0), 0);
const totalHandCards = (state, player) => totalResources(player) + (isCitiesKnights(state)
  ? COMMODITY_TYPES.reduce((sum, key) => sum + (player.commodities?.[key] || 0), 0)
  : 0);
const handLimit = (state, player) => (state.selectedScenario === 'INTO_THE_UNKNOWN' && (player.keptTreasureTokens || 0) > 0 ? 9 : 7) + (isCitiesKnights(state)
  ? 2 * (state.vertices || []).filter(vertex => vertex.playerId === player.id && vertex.cityWall).length
  : 0);
const isCitiesKnights = state => ['CITIES_AND_KNIGHTS', 'SEAFARERS_AND_CITIES_AND_KNIGHTS'].includes(state?.activeExpansion);
const isSeafarers = state => ['SEAFARERS', 'SEAFARERS_AND_CITIES_AND_KNIGHTS'].includes(state?.activeExpansion);
const isCombinedSeafarersCitiesKnights = state => state?.activeExpansion === 'SEAFARERS_AND_CITIES_AND_KNIGHTS';
const ensureCitiesKnightsState = state => {
  state.citiesKnightsState ||= {};
  state.citiesKnightsState.barbarianPosition ??= 0;
  state.citiesKnightsState.metropolisOwners ||= {};
  state.citiesKnightsState.barbarianLossQueue ||= [];
  state.citiesKnightsState.hasBarbarianAttacked ??= false;
  state.citiesKnightsState.pendingDisplacedKnight ??= undefined;
  state.citiesKnightsState.progressDiscardQueue ||= [];
  state.citiesKnightsState.sabotageDiscardQueue ||= [];
  state.citiesKnightsState.weddingGiveQueue ||= [];
  state.citiesKnightsState.deserterPending ??= undefined;
  state.citiesKnightsState.commercialHarborQueue ||= [];
  state.citiesKnightsState.commercialHarborOffer ??= undefined;
  state.citiesKnightsState.progressDecks ||= Object.fromEntries(
    Object.entries(INITIAL_PROGRESS_DECKS).map(([track, deck]) => [track, shuffled(deck)])
  );
  state.commodityBank ||= { COIN: 12, PAPER: 12, CLOTH: 12 };
  (state.players || []).forEach(player => {
    player.commodities ||= { COIN: 0, PAPER: 0, CLOTH: 0 };
    player.cityImprovements ||= { SCIENCE: 0, POLITICS: 0, TRADE: 0 };
    player.progressCards ||= [];
    player.defenderOfCatanPoints ||= 0;
  });
  return state.citiesKnightsState;
};
const commodityForTerrain = resource => ({ WOOD: 'PAPER', ORE: 'COIN', SHEEP: 'CLOTH' })[resource];
const knightStrength = (state, playerId) => (state.vertices || []).reduce((total, vertex) =>
  total + (vertex.knight?.playerId === playerId && vertex.knight.active ? vertex.knight.level : 0), 0);
const cityCount = (state, playerId) => (state.vertices || []).filter(vertex =>
  vertex.playerId === playerId && vertex.structure === 'CITY'
).length;
const barbarianStrength = state => (state.vertices || []).filter(vertex => vertex.structure === 'CITY').reduce((total, vertex) => total + 1 + (vertex.metropolis ? 1 : 0), 0);
const resolveBarbarianAttack = state => {
  const citiesKnights = ensureCitiesKnightsState(state);
  const totalCityCount = barbarianStrength(state);
  const strengths = new Map((state.players || []).map(player => [player.id, knightStrength(state, player.id)]));
  const totalStrength = [...strengths.values()].reduce((total, strength) => total + strength, 0);

  // Activated knights always stand down after a barbarian attack.
  (state.vertices || []).forEach(vertex => {
    if (vertex.knight?.active) vertex.knight = { ...vertex.knight, active: false, actedThisTurn: false };
  });
  citiesKnights.barbarianPosition = 0;
  citiesKnights.hasBarbarianAttacked = true;
  introducePirateAfterFirstBarbarianAttack(state);

  if (totalStrength >= totalCityCount) {
    const highest = Math.max(0, ...strengths.values());
    const defenders = [...strengths.entries()].filter(([, strength]) => strength === highest && strength > 0);
    // A tied strongest defender does not receive Defender of Catan.
    if (defenders.length === 1) {
      const winner = state.players.find(player => player.id === defenders[0][0]);
      if (winner) winner.defenderOfCatanPoints = (winner.defenderOfCatanPoints || 0) + 1;
    }
    citiesKnights.barbarianLossQueue = [];
    return false;
  }

  const eligibleLosers = (state.players || []).filter(player =>
    (state.vertices || []).some(vertex => vertex.playerId === player.id && vertex.structure === 'CITY' && !vertex.metropolis)
  );
  const weakestStrength = Math.min(...eligibleLosers.map(player => strengths.get(player.id) || 0));
  citiesKnights.barbarianLossQueue = eligibleLosers
    .filter(player => (strengths.get(player.id) || 0) === weakestStrength)
    .map(player => player.id);
  return citiesKnights.barbarianLossQueue.length > 0;
};
const hasResources = (player, cost) => Object.entries(cost).every(([key, amount]) => (player.resources?.[key] || 0) >= amount);
const isFishermen = state => state?.activeExpansion === 'MERCHANTS_AND_BARBARIANS' && state?.selectedMBScenario === 'FISHERMEN_OF_CATAN';
const isRiversOfCatan = state => state?.activeExpansion === 'MERCHANTS_AND_BARBARIANS' && state?.selectedMBScenario === 'RIVERS_OF_CATAN';
const isCaravanRoute = state => state?.activeExpansion === 'MERCHANTS_AND_BARBARIANS' && state?.selectedMBScenario === 'CARAVAN_ROUTE';
const isBarbarianAttack = state => state?.activeExpansion === 'MERCHANTS_AND_BARBARIANS' && state?.selectedMBScenario === 'BARBARIAN_ATTACK';
const isMerchantsAndBarbarians = state => state?.activeExpansion === 'MERCHANTS_AND_BARBARIANS' && state?.selectedMBScenario === 'MERCHANTS_AND_BARBARIANS';
const wagonMaxMovement = level => [4, 5, 5, 6, 6][Math.max(0, (level || 1) - 1)] || 4;
const wagonDeliveryTargetType = product => ({ GLASS: 'CASTLE', MARBLE: 'CASTLE', SAND: 'GLASSWORKS', TOOLS: 'QUARRY' })[product];
const wagonTargetAtVertex = (state, vertexId) => Object.entries(state.scenarioState?.targetVertexIdsByTileId || {})
  .find(([, vertexIds]) => vertexIds.includes(vertexId))?.[0];
const resolveWagonArrival = (state, player, targetTileId) => {
  const scenario = state.scenarioState;
  if (!targetTileId || !scenario?.kind || scenario.kind !== 'MERCHANTS_AND_BARBARIANS') return false;
  const target = state.tiles.find(tile => tile.id === targetTileId);
  if (!target) return false;
  if (!player.wagonCargo) {
    player.wagonCargo = scenario.productDecksByTargetId[targetTileId]?.shift();
    return true;
  }
  if (target.type !== wagonDeliveryTargetType(player.wagonCargo)) return true;
  player.victoryPoints = (player.victoryPoints || 0) + 1;
  state.goldCoins[player.id] = (state.goldCoins[player.id] || 0) + (player.wagonLevel || 1);
  player.wagonCargo = scenario.productDecksByTargetId[targetTileId]?.shift();
  return true;
};
const syncRiversWealth = state => {
  if (!isRiversOfCatan(state) || !state.players?.length) return;
  const amounts = state.players.map(player => state.goldCoins?.[player.id] || 0);
  const richest = Math.max(...amounts);
  const poorest = Math.min(...amounts);
  const richIndex = amounts.filter(amount => amount === richest).length === 1 ? amounts.indexOf(richest) : -1;
  state.players.forEach((candidate, index) => {
    candidate.riverScoreModifier = (index === richIndex ? 1 : 0) + (amounts[index] === poorest ? -2 : 0);
  });
};
const findFishPayment = (tokens, cost) => {
  const selected = [];
  let best = null;
  const visit = (index, total) => {
    if (total === cost) {
      if (!best || selected.length < best.length) best = [...selected];
      return;
    }
    if (total > cost || index >= tokens.length || (best && selected.length >= best.length)) return;
    selected.push(index);
    visit(index + 1, total + tokens[index]);
    selected.pop();
    visit(index + 1, total);
  };
  visit(0, 0);
  return best;
};
const drawFishermenToken = state => {
  const scenario = state.scenarioState;
  if (scenario?.kind !== 'FISHERMEN_OF_CATAN') return undefined;
  if (!scenario.fishDrawPile.length && scenario.fishDiscardPile.length) {
    scenario.fishDrawPile = shuffled(scenario.fishDiscardPile);
    scenario.fishDiscardPile = [];
  }
  return scenario.fishDrawPile.shift();
};
const countPieces = (state, playerId, kind) => {
  if (kind === 'SETTLEMENT' || kind === 'CITY') {
    return (state.vertices || []).filter(vertex => vertex.playerId === playerId && vertex.structure === kind).length;
  }
  if (kind === 'ROAD') return (state.edges || []).filter(edge => edge.playerId === playerId && edge.hasRoad).length;
  return (state.edges || []).filter(edge => edge.shipPlayerId === playerId && edge.hasShip).length;
};
const cityLimitForState = state => state.selectedScenario === 'GREATER_CATAN' ? 8 : 4;
const edgeEndpoints = (edge) => {
  const parts = String(edge?.id || '').replace(/^e_/, '').split('_v_');
  return parts.length === 2 ? [parts[0], `v_${parts[1]}`] : [];
};
const incidentEdges = (state, vertexId) => (state.edges || []).filter(edge => edgeEndpoints(edge).includes(vertexId));
const caravanComponents = (state, camelEdgeIds) => {
  const unseen = new Set(camelEdgeIds);
  let result = 0;
  while (unseen.size) {
    result += 1;
    const [first] = unseen;
    const queue = [first];
    unseen.delete(first);
    while (queue.length) {
      const current = state.edges?.find(edge => edge.id === queue.shift());
      if (!current) continue;
      edgeEndpoints(current).forEach(vertexId => incidentEdges(state, vertexId).filter(edge => unseen.has(edge.id)).forEach(edge => {
        unseen.delete(edge.id); queue.push(edge.id);
      }));
    }
  }
  return result;
};
const caravanCamelCandidates = state => {
  const camelEdgeIds = state.scenarioState?.camelEdgeIds || [];
  const occupied = new Set(camelEdgeIds);
  const degrees = new Map();
  (state.edges || []).filter(edge => occupied.has(edge.id)).forEach(edge => edgeEndpoints(edge).forEach(vertexId =>
    degrees.set(vertexId, (degrees.get(vertexId) || 0) + 1)));
  const endpoints = new Set([...degrees.entries()].filter(([, count]) => count === 1).map(([vertexId]) => vertexId));
  const extensions = (state.edges || []).filter(edge => !occupied.has(edge.id) && edgeEndpoints(edge).some(vertexId => endpoints.has(vertexId))).map(edge => edge.id);
  const oasis = (state.tiles || []).find(tile => tile.type === 'OASIS');
  const starts = oasis && caravanComponents(state, camelEdgeIds) < 3
    ? tileEdgeIds(oasis).filter(edgeId => !occupied.has(edgeId)) : [];
  return new Set([...starts, ...extensions]);
};
const syncCaravanScores = state => {
  if (!isCaravanRoute(state)) return;
  const degrees = new Map();
  (state.edges || []).filter(edge => edge.camelCount).forEach(edge => edgeEndpoints(edge).forEach(vertexId =>
    degrees.set(vertexId, (degrees.get(vertexId) || 0) + 1)));
  (state.players || []).forEach(candidate => {
    candidate.caravanScoreModifier = (state.vertices || []).filter(vertex => vertex.playerId === candidate.id &&
      ['SETTLEMENT', 'CITY'].includes(vertex.structure) && (degrees.get(vertex.id) || 0) >= 2).length;
  });
};
const humanCaravanVoterIds = state => (state.players || []).filter(candidate => !candidate.isBot).map(candidate => candidate.id);
const placeCaravanCamel = (state, edgeId) => {
  const edge = state.edges.find(candidate => candidate.id === edgeId);
  edge.camelCount = 1;
  state.scenarioState.camelEdgeIds.push(edgeId);
  state.scenarioState.remainingCamels -= 1;
};
const settleCaravanVote = state => {
  const scenario = state.scenarioState;
  const votes = scenario.pendingCaravanVote.votesByPlayerId;
  const amounts = Object.fromEntries(Object.entries(votes).map(([playerId, cards]) => [playerId, cards.SHEEP + cards.WHEAT]));
  Object.entries(votes).forEach(([playerId, cards]) => {
    const player = state.players.find(candidate => candidate.id === playerId);
    player.resources.SHEEP -= cards.SHEEP;
    player.resources.WHEAT -= cards.WHEAT;
    state.resourceBank.SHEEP += cards.SHEEP;
    state.resourceBank.WHEAT += cards.WHEAT;
  });
  delete scenario.pendingCaravanVote;
  const highest = Math.max(0, ...Object.values(amounts));
  if (highest === 0) return;
  const leaders = Object.keys(amounts).filter(playerId => amounts[playerId] === highest);
  if (leaders.length === 1) scenario.pendingCamelPlayerId = leaders[0];
  else scenario.pendingCamelTie = { playerIds: leaders, choicesByPlayerId: {} };
};
const barbarianDistanceToCatan = tile => Math.abs(tile.coord.q) + Math.abs(tile.coord.r) + Math.abs(tile.coord.s);
const resolveBarbarianInvasion = (state, playerId) => {
  const scenario = state.scenarioState;
  if (!isBarbarianAttack(state) || scenario?.kind !== 'BARBARIAN_ATTACK') return [];
  scenario.remainingByPlayerId ||= {};
  const rolls = new Set();
  while (rolls.size < 3) {
    const total = 2 + Math.floor(Math.random() * 11);
    if (total !== 7) rolls.add(total);
  }
  const land = (state.tiles || []).filter(tile => !isWaterTile(tile));
  const coastDistance = Math.max(...land.map(barbarianDistanceToCatan));
  [...rolls].forEach(roll => {
    if ((scenario.remainingByPlayerId[playerId] || 0) <= 0) return;
    const target = land.find(tile => tile.numberToken === roll && barbarianDistanceToCatan(tile) === coastDistance &&
      (scenario.barbarians || []).filter(barbarian => barbarian.tileId === tile.id).length < 3);
    if (!target) return;
    const ordinal = 6 - scenario.remainingByPlayerId[playerId] + 1;
    scenario.remainingByPlayerId[playerId] -= 1;
    scenario.barbarians.push({ id: `barbarian-${playerId}-${ordinal}`, ownerPlayerId: playerId, tileId: target.id });
  });
  refreshBarbarianCaptures(state);
  return [...rolls];
};
const refreshBarbarianCaptures = state => {
  const scenario = state.scenarioState;
  const land = (state.tiles || []).filter(tile => !isWaterTile(tile));
  scenario.capturedTileIds = land.filter(tile => (scenario.barbarians || []).filter(barbarian => barbarian.tileId === tile.id).length >= 3).map(tile => tile.id);
  (state.tiles || []).forEach(tile => { tile.scenarioMarker = { ...tile.scenarioMarker, barbarianCaptured: scenario.capturedTileIds.includes(tile.id) }; });
  (state.vertices || []).forEach(vertex => {
    if (!['SETTLEMENT', 'CITY'].includes(vertex.structure)) return;
    const bordering = state.tiles.filter(tile => tileVertexIds(tile).includes(vertex.id));
    // The fortress and desert are explicitly immune to capture.
    vertex.barbarianCaptured = bordering.length > 0 && !bordering.some(tile => tile.scenarioMarker?.barbarianFortress || tile.type === 'DESERT') &&
      bordering.every(tile => isWaterTile(tile) || scenario.capturedTileIds.includes(tile.id));
  });
  (state.players || []).forEach(player => {
    player.barbarianPrisonerScoreModifier = Math.floor((scenario.prisonersByPlayerId?.[player.id] || 0) / 2);
  });
};
const barbarianKnightReachable = (state, startEdgeId, targetEdgeId, maxSteps) => {
  const queue = [[startEdgeId, 0]];
  const seen = new Set([startEdgeId]);
  while (queue.length) {
    const [edgeId, distance] = queue.shift();
    if (edgeId === targetEdgeId) return true;
    if (distance >= maxSteps) continue;
    const edge = state.edges.find(candidate => candidate.id === edgeId);
    if (!edge) continue;
    edgeEndpoints(edge).forEach(vertexId => incidentEdges(state, vertexId).forEach(next => {
      if (seen.has(next.id) || !(next.hasRoad || next.id === targetEdgeId)) return;
      seen.add(next.id); queue.push([next.id, distance + 1]);
    }));
  }
  return false;
};
const resolveBarbarianVictories = state => {
  const scenario = state.scenarioState;
  if (!isBarbarianAttack(state) || scenario?.kind !== 'BARBARIAN_ATTACK') return [];
  const awards = [];
  for (const tileId of [...scenario.capturedTileIds]) {
    const tile = state.tiles.find(candidate => candidate.id === tileId);
    if (!tile) continue;
    const surroundingEdges = new Set(tileEdgeIds(tile));
    const involved = new Map();
    (scenario.knights || []).filter(knight => surroundingEdges.has(knight.edgeId)).forEach(knight =>
      involved.set(knight.ownerPlayerId, (involved.get(knight.ownerPlayerId) || 0) + 1));
    const barbarians = (scenario.barbarians || []).filter(barbarian => barbarian.tileId === tileId);
    const knightCount = [...involved.values()].reduce((total, count) => total + count, 0);
    if (knightCount <= barbarians.length) continue;
    const contenders = [...involved.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const winners = contenders.slice(0, barbarians.length).map(([playerId]) => playerId);
    barbarians.forEach((barbarian, index) => {
      const recipient = winners[index];
      if (!recipient) return;
      scenario.prisonersByPlayerId[recipient] = (scenario.prisonersByPlayerId[recipient] || 0) + 1;
      awards.push({ tileId, prisonerId: barbarian.id, playerId: recipient });
    });
    scenario.barbarians = scenario.barbarians.filter(barbarian => barbarian.tileId !== tileId);
  }
  refreshBarbarianCaptures(state);
  return awards;
};
const hasOwnedRoutePath = (state, playerId, fromVertexId, toVertexId, { allowOccupiedTarget = false } = {}) => {
  const pending = [fromVertexId];
  const visited = new Set(pending);
  while (pending.length) {
    const current = pending.shift();
    if (current === toVertexId) return true;
    incidentEdges(state, current).filter(edge =>
      (edge.hasRoad && edge.playerId === playerId) ||
      edge.bridgePlayerId === playerId ||
      (isCombinedSeafarersCitiesKnights(state) && edge.hasShip && edge.shipPlayerId === playerId)
    ).forEach(edge => {
      edgeEndpoints(edge).filter(id => !visited.has(id)).forEach(id => {
        const vertex = state.vertices?.find(candidate => candidate.id === id);
        const opponentPiece = id !== fromVertexId && vertex?.playerId !== playerId &&
          (vertex?.structure !== 'NONE' || vertex?.knight);
        if (opponentPiece && !(allowOccupiedTarget && id === toVertexId)) return;
        visited.add(id); pending.push(id);
      });
    });
  }
  return false;
};
const hasOwnedRoadPath = (state, playerId, fromVertexId, toVertexId, options) =>
  hasOwnedRoutePath(state, playerId, fromVertexId, toVertexId, options);
const isKnightConnectedToOwnStructure = (state, playerId, vertexId) =>
  (state.vertices || []).some(vertex => vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) &&
    hasOwnedRoutePath(state, playerId, vertexId, vertex.id));
const shipMoveDisconnectsKnight = (state, playerId, sourceEdgeId) => {
  if (!isCombinedSeafarersCitiesKnights(state)) return false;
  const connectedKnightIds = (state.vertices || [])
    .filter(vertex => vertex.knight?.playerId === playerId && isKnightConnectedToOwnStructure(state, playerId, vertex.id))
    .map(vertex => vertex.id);
  if (!connectedKnightIds.length) return false;
  const source = state.edges?.find(edge => edge.id === sourceEdgeId);
  if (!source) return false;
  const previousShip = { hasShip: source.hasShip, shipPlayerId: source.shipPlayerId };
  source.hasShip = false;
  source.shipPlayerId = null;
  const disconnects = connectedKnightIds.some(vertexId => !isKnightConnectedToOwnStructure(state, playerId, vertexId));
  Object.assign(source, previousShip);
  return disconnects;
};
const introducePirateAfterFirstBarbarianAttack = state => {
  if (!isCombinedSeafarersCitiesKnights(state) || (state.tiles || []).some(tile => tile.hasPirate)) return;
  const target = (state.tiles || []).find(tile => isRevealedWaterTile(tile) && !tile.isFrameSea);
  if (target) target.hasPirate = true;
};
const hasAdjacentStructure = (state, vertexId) => incidentEdges(state, vertexId).some(edge =>
  edgeEndpoints(edge).some(endpoint => endpoint !== vertexId && state.vertices?.some(vertex => vertex.id === endpoint && vertex.structure !== 'NONE'))
);
const networkTouchesTarget = (state, playerId, edge, routeKind, ignoredEdgeId) => edgeEndpoints(edge).some(endpoint => {
  const vertex = state.vertices?.find(candidate => candidate.id === endpoint);
  if (vertex?.structure !== 'NONE' && vertex?.playerId && vertex.playerId !== playerId) return false;
  if (vertex?.playerId === playerId && vertex.structure !== 'NONE') return true;
  return incidentEdges(state, endpoint).some(candidate => {
    if (candidate.id === edge.id || candidate.id === ignoredEdgeId) return false;
    const connectedKind = (candidate.hasRoad && candidate.playerId === playerId) || candidate.bridgePlayerId === playerId
      ? 'ROAD'
      : candidate.hasShip && candidate.shipPlayerId === playerId ? 'SHIP' : null;
    if (!connectedKind) return false;
    return connectedKind === routeKind || (vertex?.playerId === playerId && vertex.structure !== 'NONE');
  });
});
const tileVertexIds = (tile) => {
  if (!tile?.coord) return [];
  const size = 60;
  const center = {
    x: size * (Math.sqrt(3) * tile.coord.q + (Math.sqrt(3) / 2) * tile.coord.r),
    y: size * (3 / 2) * tile.coord.r,
  };
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 30);
    const x = Math.round((center.x + size * Math.cos(angle)) * 10) / 10;
    const y = Math.round((center.y + size * Math.sin(angle)) * 10) / 10;
    return `v_${x}_${y}`;
  });
};
const terrainHexesAdjacentToPlayer = (state, playerId, terrain) => (state.tiles || []).filter(tile =>
  tile.type === terrain && tileVertexIds(tile).some(vertexId => {
    const vertex = state.vertices?.find(candidate => candidate.id === vertexId);
    return vertex?.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure);
  })
);
const tileEdgeIds = (tile) => {
  const vertices = tileVertexIds(tile);
  return vertices.map((vertex, index) => {
    const endpoints = [vertex, vertices[(index + 1) % vertices.length]].sort();
    return `e_${endpoints[0]}_${endpoints[1]}`;
  });
};
const isWaterTile = (tile) => ['WATER', 'SEA', 'FOG'].includes(tile.type);
const isCoastalVertex = (state, vertexId) => (state.tiles || []).some(tile => isWaterTile(tile) && tileVertexIds(tile).includes(vertexId));
const isEnchantedCoast = (state, vertexId) => {
  const bordering = (state.tiles || []).filter(tile => tileVertexIds(tile).includes(vertexId));
  return bordering.some(tile => tile.scenarioMarker?.isEnchantedLand) && bordering.some(tile => ['WATER', 'SEA'].includes(tile.type));
};
const enchantedLandDistance = (state, fromVertexId, toVertexId) => {
  const pending = [[fromVertexId, 0]];
  const visited = new Set([fromVertexId]);
  while (pending.length) {
    const [current, distance] = pending.shift();
    if (current === toVertexId) return distance;
    if (distance >= 3) continue;
    incidentEdges(state, current).forEach(edge => edgeEndpoints(edge).forEach(vertexId => {
      if (!visited.has(vertexId) && state.vertices?.find(vertex => vertex.id === vertexId)?.isEnchantedLand) {
        visited.add(vertexId);
        pending.push([vertexId, distance + 1]);
      }
    }));
  }
  return Infinity;
};
const isRevealedWaterTile = (tile) => ['WATER', 'SEA'].includes(tile.type);
const borderingTilesForEdge = (state, edgeId) => (state.tiles || []).filter(tile => tileEdgeIds(tile).includes(edgeId));
const isShipEdge = (state, edgeId) => {
  const borderingTiles = borderingTilesForEdge(state, edgeId);
  const isLandFrame = borderingTiles.length === 1 && !isWaterTile(borderingTiles[0]);
  return borderingTiles.some(isWaterTile) || isLandFrame;
};
const isPirateBlockedEdge = (state, edgeId) => borderingTilesForEdge(state, edgeId).some(tile => tile.hasPirate);
const vertexIslandIds = (state, vertexId) => Array.from(new Set((state.tiles || [])
  .filter(tile => tileVertexIds(tile).includes(vertexId) && !isWaterTile(tile) && tile.islandId !== undefined)
  .map(tile => tile.islandId)));
const isPirateIslands = state => state.selectedScenario === 'PIRATE_ISLANDS';
const pirateFortressVertex = (state, playerId) => (state.vertices || []).find(vertex => vertex.pirateFortress?.playerId === playerId);
const pirateSettlementTarget = (state, playerId) => (state.vertices || []).find(vertex => vertex.pirateSettlementTarget === playerId);
const pirateShippingLine = (state, playerId, additionalEdge) => {
  const owned = (state.edges || []).filter(edge => edge.hasShip && edge.shipPlayerId === playerId);
  const ships = additionalEdge ? [...owned, additionalEdge] : owned;
  if (!ships.length) return [];
  const byVertex = new Map();
  ships.forEach(edge => edgeEndpoints(edge).forEach(vertexId => byVertex.set(vertexId, [...(byVertex.get(vertexId) || []), edge])));
  if ([...byVertex.values()].some(edges => edges.length > 2)) return null;
  const start = (state.vertices || []).find(vertex =>
    vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && vertexIslandIds(state, vertex.id).includes(1) &&
    (byVertex.get(vertex.id)?.length || 0) === 1
  );
  if (!start) return null;
  const line = [];
  let previousEdgeId;
  let vertexId = start.id;
  while (true) {
    const next = (byVertex.get(vertexId) || []).find(edge => edge.id !== previousEdgeId);
    if (!next) break;
    line.push(next);
    previousEdgeId = next.id;
    vertexId = edgeEndpoints(next).find(id => id !== vertexId);
  }
  return line.length === ships.length ? line : null;
};
const pirateShipPath = (state, playerId) => {
  const line = pirateShippingLine(state, playerId);
  const fortress = pirateFortressVertex(state, playerId);
  const target = pirateSettlementTarget(state, playerId);
  if (!line || !line.length || !fortress || !target) return null;
  const start = edgeEndpoints(line[0]).find(vertexId => (state.vertices || []).some(vertex =>
    vertex.id === vertexId && vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && vertexIslandIds(state, vertex.id).includes(1)
  ));
  if (!start) return null;
  let vertexId = start;
  const visited = new Set([start]);
  line.forEach(edge => { vertexId = edgeEndpoints(edge).find(id => id !== vertexId); visited.add(vertexId); });
  return vertexId === fortress.id && visited.has(target.id) ? line : null;
};
const isSinglePirateShippingLine = (state, playerId, additionalEdge) => {
  const owned = (state.edges || []).filter(edge => edge.hasShip && edge.shipPlayerId === playerId);
  const candidate = additionalEdge ? [...owned, additionalEdge] : owned;
  if (candidate.length === 0) return false;
  const degrees = new Map();
  candidate.forEach(edge => edgeEndpoints(edge).forEach(vertexId => degrees.set(vertexId, (degrees.get(vertexId) || 0) + 1)));
  if ([...degrees.values()].some(degree => degree > 2)) return false;
  const seenEdges = new Set();
  const stack = [candidate[0]];
  while (stack.length) {
    const edge = stack.pop();
    if (seenEdges.has(edge.id)) continue;
    seenEdges.add(edge.id);
    const endpoints = new Set(edgeEndpoints(edge));
    candidate.forEach(other => { if (other.id !== edge.id && edgeEndpoints(other).some(id => endpoints.has(id))) stack.push(other); });
  }
  return seenEdges.size === candidate.length;
};
const shortestPirateRouteLength = (state, playerId) => {
  const line = pirateShippingLine(state, playerId);
  const startId = line?.length && edgeEndpoints(line[0]).find(vertexId => (state.vertices || []).some(vertex =>
    vertex.id === vertexId && vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && vertexIslandIds(state, vertex.id).includes(1)
  ));
  const fortress = pirateFortressVertex(state, playerId);
  const target = pirateSettlementTarget(state, playerId);
  if (!startId || !fortress || !target) return Infinity;
  const usable = (state.edges || []).filter(edge => isShipEdge(state, edge.id));
  const graph = new Map();
  usable.forEach(edge => edgeEndpoints(edge).forEach(vertexId => graph.set(vertexId, [...(graph.get(vertexId) || []), edge])));
  const distance = (from, to) => {
    const queue = [{ vertexId: from, distance: 0 }];
    const seen = new Set([from]);
    while (queue.length) {
      const { vertexId, distance } = queue.shift();
      if (vertexId === to) return distance;
      for (const edge of graph.get(vertexId) || []) {
        const next = edgeEndpoints(edge).find(id => id !== vertexId);
        if (next && !seen.has(next)) { seen.add(next); queue.push({ vertexId: next, distance: distance + 1 }); }
      }
    }
    return Infinity;
  };
  return distance(startId, target.id) + distance(target.id, fortress.id);
};
const isShortestPirateLineExtension = (state, playerId, edge) => {
  const line = pirateShippingLine(state, playerId, edge);
  const fortress = pirateFortressVertex(state, playerId);
  const target = pirateSettlementTarget(state, playerId);
  if (!line || !line.length || !fortress || !target) return false;
  const startId = edgeEndpoints(line[0]).find(vertexId => (state.vertices || []).some(vertex =>
    vertex.id === vertexId && vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && vertexIslandIds(state, vertex.id).includes(1)
  ));
  if (!startId) return false;
  const usable = (state.edges || []).filter(candidate => isShipEdge(state, candidate.id));
  const graph = new Map();
  usable.forEach(candidate => edgeEndpoints(candidate).forEach(vertexId => graph.set(vertexId, [...(graph.get(vertexId) || []), candidate])));
  const distance = (from, to) => {
    const queue = [{ vertexId: from, distance: 0 }];
    const seen = new Set([from]);
    while (queue.length) {
      const { vertexId, distance } = queue.shift();
      if (vertexId === to) return distance;
      for (const candidate of graph.get(vertexId) || []) {
        const next = edgeEndpoints(candidate).find(id => id !== vertexId);
        if (next && !seen.has(next)) { seen.add(next); queue.push({ vertexId: next, distance: distance + 1 }); }
      }
    }
    return Infinity;
  };
  let endpoint = startId;
  const visited = new Set([startId]);
  line.forEach(candidate => { endpoint = edgeEndpoints(candidate).find(id => id !== endpoint); visited.add(endpoint); });
  const shortest = distance(startId, target.id) + distance(target.id, fortress.id);
  if (visited.has(fortress.id)) return visited.has(target.id) && line.length === shortest;
  const remaining = visited.has(target.id)
    ? distance(endpoint, fortress.id)
    : distance(endpoint, target.id) + distance(target.id, fortress.id);
  return Number.isFinite(shortest) && line.length + remaining === shortest;
};
const advanceTurn = state => {
  state.currentPlayerIndex = ((state.currentPlayerIndex || 0) + 1) % state.players.length;
  state.turnSubPhase = 'BEFORE_ROLL';
  state.hasMovedShipThisTurn = false;
  state.currentTurnBuiltShips = [];
  state.diplomatRoadBuildingRemaining = 0;
  const next = state.players[state.currentPlayerIndex];
  next.goldTradesThisTurn = 0;
  next.playedDevCardThisTurn = false;
  next.boughtDevCardsThisTurn = {};
  (state.vertices || []).forEach(vertex => {
    if (vertex.knight) vertex.knight.promotedThisTurn = false;
  });
  (state.players || []).forEach(player => {
    player.cityImprovementDiscount = 0;
    player.freeKnightPromotions = 0;
    delete player.merchantFleetResource;
  });
};
const TDA_VICTORY_TARGETS = {
  TREASURE_ISLANDS: { SEAFARERS: { 3: 15, 4: 14 }, SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 16, 4: 17 } },
  INTO_THE_UNKNOWN: { SEAFARERS: { 3: 12, 4: 12 }, SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 14, 4: 14 } },
  GREATER_CATAN: { SEAFARERS: { 3: 18, 4: 18 }, SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 20, 4: 20 } },
  DESERT_DRAGONS: { SEAFARERS: { 3: 13, 4: 13 } },
  GREAT_CANAL: { SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 21, 4: 18 } },
  ENCHANTED_LAND: { SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 21, 4: 18 } },
};
const victoryTarget = state => {
  if (state.activeExpansion === 'MERCHANTS_AND_BARBARIANS') {
    return ({
      FISHERMEN_OF_CATAN: 10,
      RIVERS_OF_CATAN: 10,
      CARAVAN_ROUTE: 12,
      BARBARIAN_ATTACK: 12,
      MERCHANTS_AND_BARBARIANS: 13,
    })[state.selectedMBScenario] || 10;
  }
  const playerCount = state.players?.length === 3 ? 3 : 4;
  const tdaTarget = TDA_VICTORY_TARGETS[state.selectedScenario]?.[state.activeExpansion]?.[playerCount];
  if (tdaTarget) return tdaTarget;
  if (isCombinedSeafarersCitiesKnights(state)) return 15;
  if (isCitiesKnights(state)) return 13;
  return ({ HEADING_FOR_NEW_SHORES: 14, FOUR_ISLANDS: 13, FOG_ISLAND: 12, THROUGH_THE_DESERT: 14, THE_LOST_TRIBE: 13, CLOTH_FOR_CATAN: 14, PIRATE_ISLANDS: 10 })[state.selectedScenario] || 10;
};
const playerTotalVP = (state, player) => {
  let points = player.victoryPoints || 0;
  points += player.riverScoreModifier || 0;
  points += player.caravanScoreModifier || 0;
  if (isBarbarianAttack(state)) {
    (state.vertices || []).filter(vertex => vertex.playerId === player.id && vertex.barbarianCaptured).forEach(vertex => {
      points -= vertex.structure === 'CITY' ? 2 : 1;
    });
  }
  if (!isPirateIslands(state)) points += player.developmentCards?.VICTORY_POINT || 0;
  if (state.selectedScenario === 'CLOTH_FOR_CATAN') points += Math.floor((player.clothRolls || 0) / 2);
  points += player.defenderOfCatanPoints || 0;
  if (['HEADING_FOR_NEW_SHORES', 'FOUR_ISLANDS', 'THROUGH_THE_DESERT'].includes(state.selectedScenario)) {
    const homes = player.homeIslandIds?.length ? player.homeIslandIds : player.homeIslandId === undefined ? [] : [player.homeIslandId];
    const visited = new Set();
    (state.vertices || []).filter(vertex => vertex.playerId === player.id && ['SETTLEMENT', 'CITY'].includes(vertex.structure)).forEach(vertex =>
      vertexIslandIds(state, vertex.id).forEach(islandId => { if (!homes.includes(islandId)) visited.add(islandId); })
    );
    points += visited.size * 2;
  }
  if (state.selectedScenario === 'DESERT_DRAGONS') {
    (state.vertices || []).filter(vertex => vertex.playerId === player.id && ['SETTLEMENT', 'CITY'].includes(vertex.structure)).forEach(vertex => {
      const land = (state.tiles || []).filter(tile => tileVertexIds(tile).includes(vertex.id) && !isWaterTile(tile));
      if (land.length > 0 && land.every(tile => (tile.scenarioMarker?.dragonIds || []).length > 0)) points -= 1;
    });
  }
  if (isFishermen(state) && player.hasOldBoot) points -= 1;
  return points;
};
const maybeEndGame = (state, playerId) => {
  if (state.gamePhase !== 'MAIN_GAME') return;
  const player = state.players.find(candidate => candidate.id === playerId);
  if (!player || (isPirateIslands(state) && !pirateFortressVertex(state, playerId)?.pirateFortress?.conquered)) return;
  if (state.selectedScenario === 'ENCHANTED_LAND' && (state.scenarioState?.defeatedDragonIdsByPlayerId?.[playerId] || []).length >= 6) {
    state.gamePhase = 'GAME_OVER';
    state.winnerPlayerId = playerId;
    return;
  }
  if (playerTotalVP(state, player) >= victoryTarget(state)) {
    state.gamePhase = 'GAME_OVER';
    state.winnerPlayerId = playerId;
  }
};
const eligibleHarborEdges = (state, playerId) => {
  const harborEdges = (state.edges || []).filter(edge => edge.isHarbor);
  return (state.edges || []).filter(edge => {
    if (edge.isHarbor) return false;
    const endpoints = edgeEndpoints(edge);
    if (!endpoints.some(endpoint => state.vertices?.some(vertex =>
      vertex.id === endpoint && vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure)))) return false;
    const borderingTiles = borderingTilesForEdge(state, edge.id);
    const waterTiles = borderingTiles.filter(isWaterTile);
    if (waterTiles.length === 0 || !borderingTiles.some(tile => !isWaterTile(tile))) return false;
    if (harborEdges.some(harbor => edgeEndpoints(harbor).some(endpoint => endpoints.includes(endpoint)))) return false;
    return waterTiles.every(waterTile => {
      const waterEdges = new Set(tileEdgeIds(waterTile));
      return !harborEdges.some(harbor => waterEdges.has(harbor.id));
    });
  });
};

const bankTradeRatioForPlayer = (state, playerId, offeredResource) => {
  const merchant = state.citiesKnightsState?.merchant;
  const player = state.players?.find(candidate => candidate.id === playerId);
  if ((merchant?.playerId === playerId && merchant.resource === offeredResource) || player?.merchantFleetResource === offeredResource) return 2;
  const ownedHarbors = (state.vertices || []).filter(vertex =>
    vertex.playerId === playerId &&
    ['SETTLEMENT', 'CITY'].includes(vertex.structure) &&
    vertex.isHarbor
  );
  if (ownedHarbors.some(harbor => harbor.harborType === offeredResource)) return 2;
  if (state.selectedScenario === 'GREAT_CANAL' && (state.vertices || []).some(vertex =>
    vertex.knight?.playerId === playerId && vertex.isHarbor && vertex.harborType === offeredResource &&
    vertexIslandIds(state, vertex.id).some(islandId => islandId !== 1))) return 2;
  if (ownedHarbors.some(harbor => harbor.harborType === 'GENERIC')) return 3;
  return 4;
};
const isOpenShip = (state, playerId, source) => edgeEndpoints(source).some(vertexId => {
  const vertex = state.vertices?.find(candidate => candidate.id === vertexId);
  if (!vertex || (vertex.structure && vertex.structure !== 'NONE')) return false;
  return incidentEdges(state, vertexId).filter(edge => edge.hasShip && edge.shipPlayerId === playerId).length === 1;
});
const getEligibleVictimIds = (state, playerId, tile, robberType) => {
  if (!tile) return [];
  const candidateIds = new Set();
  if (robberType === 'PIRATE') {
    const edgeIds = new Set(tileEdgeIds(tile));
    (state.edges || []).forEach(edge => {
      if (edgeIds.has(edge.id) && edge.hasShip && edge.shipPlayerId && edge.shipPlayerId !== playerId) {
        candidateIds.add(edge.shipPlayerId);
      }
    });
  } else {
    const vertexIds = new Set(tileVertexIds(tile));
    (state.vertices || []).forEach(vertex => {
      if (vertexIds.has(vertex.id) && vertex.structure !== 'NONE' && vertex.playerId && vertex.playerId !== playerId) {
        candidateIds.add(vertex.playerId);
      }
    });
  }
  return (state.players || [])
    .filter(candidate => candidateIds.has(candidate.id) &&
      (totalHandCards(state, candidate) > 0 || (state.selectedScenario === 'CLOTH_FOR_CATAN' && robberType === 'PIRATE' && (candidate.clothRolls || 0) > 0)))
    .map(candidate => candidate.id);
};

const distributeRolledResources = (state, total) => {
  const claims = [];
  const commodityClaims = [];
  const goldSelections = [];
  const receivedByPlayer = new Map();
  const isActivatedToken = token => token === total ||
    (token === '2/3' && [2, 3].includes(total)) ||
    (token === '11/12' && [11, 12].includes(total)) ||
    (token === '2/3/11/12' && [2, 3, 11, 12].includes(total));
  (state.tiles || []).filter(tile =>
    isActivatedToken(tile.numberToken) &&
    !tile.hasRobber &&
    !(isBarbarianAttack(state) && state.scenarioState?.capturedTileIds?.includes(tile.id)) &&
    !(state.selectedScenario === 'DESERT_DRAGONS' && (tile.scenarioMarker?.dragonIds || []).length > 0) &&
    !(state.selectedScenario === 'GREAT_CANAL' && tile.scenarioMarker?.infertileField) &&
    !(['THE_LOST_TRIBE', 'CLOTH_FOR_CATAN'].includes(state.selectedScenario) && tile.islandId !== 1)
  ).forEach(tile => {
    const vertexIds = new Set(tileVertexIds(tile));
    (state.vertices || []).forEach(vertex => {
      if (!vertexIds.has(vertex.id) || !vertex.playerId || vertex.structure === 'NONE') return;
      const amount = vertex.structure === 'CITY' ? 2 : 1;
      if (isFishermen(state) && ['LAKE', 'FISHING_GROUND'].includes(tile.type)) {
        const owner = state.players.find(candidate => candidate.id === vertex.playerId);
        owner.fishTokens ||= [];
        for (let index = 0; index < amount && owner.fishTokens.length < 7; index += 1) {
          const token = drawFishermenToken(state);
          if (token === 'OLD_BOOT') owner.hasOldBoot = true;
          else if (token) owner.fishTokens.push(token);
        }
        owner.fishCount = owner.fishTokens.reduce((sum, token) => sum + token, 0);
      } else if (tile.type === 'GOLD_FIELD') goldSelections.push({ playerId: vertex.playerId, amount, tileId: tile.id });
      else if (RESOURCE_TYPES.includes(tile.type)) {
        const commodity = isCitiesKnights(state) && vertex.structure === 'CITY' ? commodityForTerrain(tile.type) : null;
        claims.push({ playerId: vertex.playerId, resource: tile.type, amount: commodity ? 1 : amount });
        if (commodity) commodityClaims.push({ playerId: vertex.playerId, commodity, amount: 1 });
      }
    });
  });
  if (state.selectedScenario === 'GREAT_CANAL' && total === 8 && !state.scenarioState?.isCanalComplete) {
    const minerIds = new Set((state.vertices || []).filter(vertex => vertex.knight?.playerId &&
      (state.tiles || []).some(tile => tile.type === 'GOLD_FIELD' && tile.islandId !== 1 && tileVertexIds(tile).includes(vertex.id)))
      .map(vertex => vertex.knight.playerId));
    minerIds.forEach(playerId => goldSelections.push({ playerId, amount: 1, tileId: 'great-canal-gold-miner' }));
  }

  RESOURCE_TYPES.forEach(resource => {
    const resourceClaims = claims.filter(claim => claim.resource === resource);
    const totalDemand = resourceClaims.reduce((sum, claim) => sum + claim.amount, 0);
    const claimantCount = new Set(resourceClaims.map(claim => claim.playerId)).size;
    if (totalDemand === 0 || (totalDemand > (state.resourceBank?.[resource] || 0) && claimantCount > 1)) return;
    let available = state.resourceBank?.[resource] || 0;
    resourceClaims.forEach(claim => {
      const amount = Math.min(claim.amount, available);
      const claimant = state.players.find(candidate => candidate.id === claim.playerId);
      if (!claimant || amount <= 0) return;
      claimant.resources[resource] += amount;
      receivedByPlayer.set(claim.playerId, (receivedByPlayer.get(claim.playerId) || 0) + amount);
      available -= amount;
    });
    state.resourceBank[resource] = available;
  });

  if (isCitiesKnights(state)) {
    ensureCitiesKnightsState(state);
    COMMODITY_TYPES.forEach(commodity => {
      const claimsForCommodity = commodityClaims.filter(claim => claim.commodity === commodity);
      const totalDemand = claimsForCommodity.reduce((sum, claim) => sum + claim.amount, 0);
      const claimantCount = new Set(claimsForCommodity.map(claim => claim.playerId)).size;
      if (totalDemand === 0 || (totalDemand > (state.commodityBank?.[commodity] || 0) && claimantCount > 1)) return;
      let available = state.commodityBank[commodity] || 0;
      claimsForCommodity.forEach(claim => {
        const amount = Math.min(claim.amount, available);
        const claimant = state.players.find(candidate => candidate.id === claim.playerId);
        if (!claimant || amount <= 0) return;
        claimant.commodities[commodity] += amount;
        available -= amount;
      });
      state.commodityBank[commodity] = available;
    });
  }

  state.goldSelectionQueue = Array.from(goldSelections.reduce((byPlayer, selection) => {
    const existing = byPlayer.get(selection.playerId);
    if (existing) existing.amount += selection.amount;
    else byPlayer.set(selection.playerId, { ...selection });
    return byPlayer;
  }, new Map()).values());
  if (goldSelections.length > 0) state.turnSubPhase = 'GOLD_RESOURCE_SELECTION';
  if (state.activeExpansion === 'MERCHANTS_AND_BARBARIANS' && state.selectedMBScenario === 'MERCHANTS_AND_BARBARIANS') {
    const playersWithBuildings = new Set((state.vertices || [])
      .filter(vertex => vertex.playerId && vertex.structure !== 'NONE')
      .map(vertex => vertex.playerId));
    state.goldCoins ||= {};
    playersWithBuildings.forEach(playerId => {
      if (!receivedByPlayer.has(playerId)) state.goldCoins[playerId] = (state.goldCoins[playerId] || 0) + 1;
    });
  }
  if (state.selectedScenario === 'CLOTH_FOR_CATAN') distributeLostTribeCloth(state, total);
};

/** Dragon placement is deterministic online: use the least populated desert. */
const addDesertDragons = (state) => {
  if (state.selectedScenario !== 'DESERT_DRAGONS' || String(state.gamePhase).startsWith('SETUP_')) return;
  const deserts = (state.tiles || []).filter(tile => tile.type === 'DESERT').slice(0, 3);
  if (!deserts.length) return;
  const remaining = Math.max(0, 18 - deserts.reduce((sum, tile) => sum + (tile.scenarioMarker?.dragonIds || []).length, 0));
  const amount = Math.min(remaining, state.players.length === 3 ? 3 : 2);
  for (let index = 0; index < amount; index += 1) {
    deserts.sort((a, b) => (a.scenarioMarker?.dragonIds || []).length - (b.scenarioMarker?.dragonIds || []).length);
    const target = deserts[0];
    target.scenarioMarker = { ...target.scenarioMarker, dragonIds: [...(target.scenarioMarker?.dragonIds || []), `desert-dragon-${Date.now()}-${index}`] };
  }
  if (remaining <= amount && state.scenarioState) state.scenarioState.dragonsHaveAttacked = true;
};

const areNeighboringHexes = (first, second) =>
  (Math.abs(first.coord.q - second.coord.q) + Math.abs(first.coord.r - second.coord.r) + Math.abs(first.coord.s - second.coord.s)) / 2 === 1;

/** Once the reserve is exhausted, a matching roll moves one dragon from each relevant desert. */
const moveDesertDragons = (state, total) => {
  if (state.selectedScenario !== 'DESERT_DRAGONS' || !state.scenarioState?.dragonsHaveAttacked || total === 7) return;
  const deserts = (state.tiles || []).filter(tile => tile.type === 'DESERT' && (tile.scenarioMarker?.dragonIds || []).length > 0);
  const destinations = (state.tiles || []).filter(tile => tile.numberToken === total && tile.type !== 'WATER' && tile.type !== 'DESERT' && !(tile.scenarioMarker?.dragonIds || []).length &&
    deserts.some(desert => areNeighboringHexes(desert, tile)));
  destinations.forEach((destination, index) => {
    const sources = deserts.filter(desert => (desert.scenarioMarker?.dragonIds || []).length > 0 && areNeighboringHexes(desert, destination));
    if (!sources.length) return;
    sources.sort((a, b) => (b.scenarioMarker?.dragonIds || []).length - (a.scenarioMarker?.dragonIds || []).length);
    const source = sources[0];
    const dragonId = source.scenarioMarker.dragonIds.pop();
    destination.scenarioMarker = { ...destination.scenarioMarker, dragonIds: [dragonId || `desert-dragon-move-${total}-${index}`] };
  });
};

const buildCanalFromKnight = (state, vertexId) => {
  if (state.selectedScenario !== 'GREAT_CANAL' || !state.scenarioState) return;
  const completed = new Set(state.scenarioState.completedCanalIds || []);
  const candidate = (state.tiles || []).find(tile => tile.scenarioMarker?.canalId && !completed.has(tile.scenarioMarker.canalId) &&
    tileVertexIds(tile).includes(vertexId) &&
    tileVertexIds(tile).filter(id => state.vertices.find(vertex => vertex.id === id)?.knight?.active).length >= 2);
  if (!candidate) return;
  const knightOwners = tileVertexIds(candidate).map(id => state.vertices.find(vertex => vertex.id === id)?.knight)
    .filter(knight => knight?.active).slice(0, 2).map(knight => knight.playerId);
  knightOwners.forEach(ownerId => {
    const owner = state.players.find(candidatePlayer => candidatePlayer.id === ownerId);
    if (owner) { owner.canalChits = (owner.canalChits || 0) + 1; owner.victoryPoints = (owner.victoryPoints || 0) + 1; }
  });
  candidate.scenarioMarker.canalBuilt = true;
  completed.add(candidate.scenarioMarker.canalId);
  // The ninth piece is placed automatically when the eighth is completed.
  if (completed.size >= 8) {
    (state.tiles || []).filter(tile => tile.scenarioMarker?.canalId).forEach(tile => {
      tile.scenarioMarker.canalBuilt = true;
      completed.add(tile.scenarioMarker.canalId);
    });
    (state.tiles || []).filter(tile => tile.scenarioMarker?.infertileField).forEach(tile => {
      tile.scenarioMarker.infertileField = false;
    });
    state.scenarioState.isCanalComplete = true;
  }
  state.scenarioState.completedCanalIds = [...completed];
};

const lostTribeVillages = state => (state.tiles || []).flatMap(tile => (tile.lostTribeVillages || []).map(village => ({
  ...village, tile, vertexId: tileVertexIds(tile)[village.vertexIndex],
})));

const reachedLostTribeVillageIds = (state, playerId) => {
  const graph = new Map();
  (state.edges || []).filter(edge => edge.hasShip && edge.shipPlayerId === playerId).forEach(edge => {
    const [a, b] = edgeEndpoints(edge);
    graph.set(a, [...(graph.get(a) || []), b]);
    graph.set(b, [...(graph.get(b) || []), a]);
  });
  const queue = (state.vertices || []).filter(vertex => vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure)).map(vertex => vertex.id);
  const reached = new Set();
  while (queue.length) {
    const vertexId = queue.shift();
    if (reached.has(vertexId)) continue;
    reached.add(vertexId);
    (graph.get(vertexId) || []).forEach(next => queue.push(next));
  }
  return lostTribeVillages(state).filter(village => reached.has(village.vertexId)).map(village => village.id);
};

const distributeLostTribeCloth = (state, total) => {
  const active = lostTribeVillages(state).filter(village => village.number === total && village.clothRemaining > 0 && (village.connectedPlayerIds || []).length);
  let reserveTile = (state.tiles || []).find(tile => tile.lostTribeGeneralCloth !== undefined);
  let reserve = reserveTile?.lostTribeGeneralCloth || 0;
  active.forEach(village => {
    const connected = village.connectedPlayerIds || [];
    const ownRolls = Math.min(village.clothRemaining, connected.length);
    const reserveRolls = Math.min(reserve, connected.length - ownRolls);
    reserve -= reserveRolls;
    village.tile.lostTribeVillages.find(entry => entry.id === village.id).clothRemaining -= ownRolls;
    connected.slice(0, ownRolls + reserveRolls).forEach(playerId => {
      const player = state.players.find(candidate => candidate.id === playerId);
      if (player) player.clothRolls = (player.clothRolls || 0) + 1;
    });
  });
  if (reserveTile) reserveTile.lostTribeGeneralCloth = reserve;
};

function validateGameAction(state, action) {
  const shape = validateActionShape(action, { authoritative: true });
  if (!shape.ok) return shape;
  if (!state || !Array.isArray(state.players)) return { ok: false, message: 'Game state is not ready' };

  const player = state.players.find(candidate => candidate.id === action.playerId);
  if (!player) return { ok: false, message: 'Unknown player' };
  const activePlayer = state.players[state.currentPlayerIndex || 0];
  const isSetup = ['SETUP_ROUND_1', 'SETUP_ROUND_2', 'SETUP_ROUND_3'].includes(state.gamePhase);
  const phaseExceptions = new Set(['DISCARD_CARDS', 'GIVE_PROGRESS_CARDS', 'ACCEPT_TRADE', 'DECLINE_TRADE', 'SELECT_GOLD_RESOURCE', 'RELOCATE_DISPLACED_KNIGHT', 'SELECT_DESERTER_KNIGHT', 'DISCARD_PROGRESS_CARD', 'CAST_CARAVAN_VOTE', 'CHOOSE_CARAVAN_TIE_LOCATION', 'PLACE_CARAVAN_CAMEL']);
  if (!phaseExceptions.has(action.type) && activePlayer?.id !== action.playerId) {
    return { ok: false, message: 'It is not this player\'s turn' };
  }

  switch (action.type) {
    case 'DISCOVER_SCENARIO_HEX': {
      const tile = state.tiles?.find(candidate => candidate.id === action.tileId);
      const tileVertices = new Set(tileVertexIds(tile));
      const touchesRoute = state.edges?.some(edge => (edge.hasRoad && edge.playerId === action.playerId || edge.hasShip && edge.shipPlayerId === action.playerId) &&
        edgeEndpoints(edge).some(vertexId => tileVertices.has(vertexId)));
      if (state.selectedScenario !== 'GREATER_CATAN' || !tile || tile.numberToken !== null || tile.islandId === undefined || tile.islandId <= 1 ||
          !RESOURCE_TYPES.includes(tile.type) || !touchesRoute) return { ok: false, message: 'This number chit cannot be discovered' };
      if (!(state.scenarioState?.numberTokenSupply || []).length) {
        const canMoveNumber = (candidate) => {
          if ([6, 8].includes(candidate.numberToken) && state.tiles.some(other => other !== tile && [6, 8].includes(other.numberToken) && areNeighboringHexes(other, tile))) return false;
          return tileVertexIds(candidate).some(vertexId => {
            const vertex = state.vertices?.find(entry => entry.id === vertexId);
            return vertex?.playerId === action.playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) &&
              state.tiles.some(other => other !== candidate && Number.isInteger(other.numberToken) && tileVertexIds(other).includes(vertexId));
          });
        };
        if (!(state.tiles || []).some(candidate => candidate.islandId === 1 && Number.isInteger(candidate.numberToken) && canMoveNumber(candidate))) {
          return { ok: false, message: 'No legal home-island number token can be depleted' };
        }
      }
      break;
    }
    case 'MOVE_ENCHANTED_KNIGHT': {
      const source = state.vertices?.find(vertex => vertex.id === action.fromVertexId);
      const destination = state.vertices?.find(vertex => vertex.id === action.toVertexId);
      const hasCrossed = Boolean(state.scenarioState.knightOnIslandByPlayerId?.[action.playerId]);
      const legalMove = hasCrossed
        ? source?.isEnchantedLand && !isEnchantedCoast(state, destination?.id) && enchantedLandDistance(state, source.id, destination?.id) <= 3
        : isEnchantedCoast(state, destination?.id) && hasOwnedRoutePath(state, action.playerId, source?.id, destination?.id, { allowOccupiedTarget: true });
      if (state.selectedScenario !== 'ENCHANTED_LAND' || !source?.knight?.active || source.knight.playerId !== action.playerId ||
          source.knight.actedThisTurn || !destination || destination.structure !== 'NONE' ||
          (destination.knight && (destination.knight.playerId === action.playerId || source.knight.level <= destination.knight.level)) ||
          !destination.isEnchantedLand || !legalMove) {
        return { ok: false, message: 'Illegal enchanted knight move' };
      }
      break;
    }
    case 'FIGHT_ENCHANTED_DRAGON': {
      const vertex = state.vertices?.find(candidate => candidate.id === action.knightVertexId);
      if (state.selectedScenario !== 'ENCHANTED_LAND' || vertex?.knight?.playerId !== action.playerId || !vertex.knight.active ||
          vertex.knight.actedThisTurn || vertex.enchantedDragon?.id !== action.dragonId) {
        return { ok: false, message: 'Illegal enchanted dragon fight' };
      }
      break;
    }
    case 'CLAIM_TREASURE': {
      const token = state.scenarioState?.treasureTokens?.[action.treasureId];
      const vertex = state.vertices?.find(candidate => candidate.id === token?.vertexId);
      const touchesPlayerRoute = incidentEdges(state, token?.vertexId).some(edge =>
        (edge.hasRoad && edge.playerId === action.playerId) || (edge.hasShip && edge.shipPlayerId === action.playerId));
      const isTreasureScenario = state.selectedScenario === 'TREASURE_ISLANDS' || state.selectedScenario === 'INTO_THE_UNKNOWN';
      if (!isTreasureScenario || (state.selectedScenario === 'INTO_THE_UNKNOWN' && action.mode !== 'REVEAL') ||
          !token || token.status !== 'UNCLAIMED' || !vertex?.treasureToken || !touchesPlayerRoute) {
        return { ok: false, message: 'Treasure cannot be claimed from this location' };
      }
      if (isCitiesKnights(state) && state.scenarioState?.treasureDeck?.[0] === 'DEVELOPMENT_CARD' && !CITY_IMPROVEMENT_TRACKS.includes(action.progressTrack)) {
        return { ok: false, message: 'Choose a progress-card stack for this treasure' };
      }
      break;
    }
    case 'KEEP_TREASURE': {
      const token = state.scenarioState?.treasureTokens?.[action.treasureId];
      const vertex = state.vertices?.find(candidate => candidate.id === token?.vertexId);
      const touchesPlayerRoute = incidentEdges(state, token?.vertexId).some(edge =>
        (edge.hasRoad && edge.playerId === action.playerId) || (edge.hasShip && edge.shipPlayerId === action.playerId));
      if (state.selectedScenario !== 'INTO_THE_UNKNOWN' || !token || token.status !== 'UNCLAIMED' || !vertex?.treasureToken ||
          !touchesPlayerRoute || (player.keptTreasureTokens || 0) >= 4 ||
          ((player.keptTreasureTokens || 0) === 1 && !isResource(action.harborType))) return { ok: false, message: 'Treasure cannot be kept' };
      break;
    }
    case 'ROLL_DICE':
      if (state.gamePhase !== 'MAIN_GAME' || state.turnSubPhase !== 'BEFORE_ROLL') return { ok: false, message: 'Dice cannot be rolled now' };
      break;
    case 'RESOLVE_BARBARIAN_CARD': {
      const pending = state.scenarioState?.pendingDevelopmentCard;
      if (!isBarbarianAttack(state) || !pending || pending.playerId !== action.playerId) return { ok: false, message: 'No Barbarian Attack card is awaiting resolution' };
      const scenario = state.scenarioState;
      const freeEdge = edgeId => {
        const edge = state.edges?.find(candidate => candidate.id === edgeId);
        return edge && !scenario.knights.some(knight => knight.edgeId === edgeId);
      };
      if (pending.cardType === 'KNIGHTHOOD' && (!freeEdge(action.edgeId) || !state.edges.find(edge => edge.id === action.edgeId)?.isBarbarianFortressRoute)) return { ok: false, message: 'Knighthood must use a free fortress path' };
      if (pending.cardType === 'STRONG_KNIGHT' && !freeEdge(action.edgeId)) return { ok: false, message: 'Strong Knight needs a free path' };
      if (pending.cardType === 'INTRIGUE' && !scenario.barbarians.some(barbarian => barbarian.tileId === action.tileId)) return { ok: false, message: 'Intrigue needs a barbarian target' };
      if (pending.cardType === 'TREASON') {
        const sources = action.sourceTileIds || [];
        const targets = action.targetTileIds || [];
        const land = state.tiles.filter(tile => !isWaterTile(tile));
        const coastDistance = Math.max(...land.map(barbarianDistanceToCatan));
        const eligibleTarget = tileId => {
          const tile = land.find(candidate => candidate.id === tileId);
          return tile && barbarianDistanceToCatan(tile) === coastDistance && !scenario.capturedTileIds.includes(tile.id) &&
            !sources.includes(tileId) && scenario.barbarians.filter(barbarian => barbarian.tileId === tileId).length < 3;
        };
        if (sources.length !== 2 || new Set(sources).size !== 2 || targets.length !== 2 || new Set(targets).size !== 2 ||
            !sources.every(tileId => scenario.barbarians.some(barbarian => barbarian.tileId === tileId)) || !targets.every(eligibleTarget)) {
          return { ok: false, message: 'Treason requires two different source and eligible coastal target areas' };
        }
      }
      break;
    }
    case 'MOVE_BARBARIAN_KNIGHT': {
      const scenario = state.scenarioState;
      const knight = scenario?.knights?.find(candidate => candidate.id === action.knightId && candidate.ownerPlayerId === action.playerId);
      const destination = state.edges?.find(edge => edge.id === action.edgeId);
      if (!isBarbarianAttack(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || !knight || knight.movedThisTurn || !destination || destination.isBarbarianFortressRoute ||
          scenario.knights.some(candidate => candidate.edgeId === action.edgeId) || (action.payWheat && (player.resources?.WHEAT || 0) < 1) ||
          !barbarianKnightReachable(state, knight.edgeId, action.edgeId, action.payWheat ? 5 : 3)) {
        return { ok: false, message: 'Illegal Barbarian Attack knight move' };
      }
      break;
    }
    case 'END_TURN':
      if (!isSetup && state.turnSubPhase !== 'TRADE_AND_BUILD') return { ok: false, message: 'Turn cannot end now' };
      if (isCaravanRoute(state) && (state.scenarioState?.pendingCaravanVote || state.scenarioState?.pendingCamelPlayerId || state.scenarioState?.pendingCamelTie)) return { ok: false, message: 'Resolve the caravan vote before ending the turn' };
      if (isBarbarianAttack(state) && (state.scenarioState?.pendingDevelopmentCard || state.scenarioState?.knights?.some(knight => knight.ownerPlayerId === action.playerId && state.edges?.find(edge => edge.id === knight.edgeId)?.isBarbarianFortressRoute))) return { ok: false, message: 'Resolve the Barbarian Attack card and move knights out of the fortress' };
      if (isCitiesKnights(state) && (player.progressCards || []).length > 4) {
        return { ok: false, message: 'Discard progress cards until only four remain' };
      }
      if (isSetup && (!state.setupState?.hasPlacedSettlement || !state.setupState?.hasPlacedRoad)) {
        return { ok: false, message: 'Setup placement is incomplete' };
      }
      break;
    case 'DISCARD_CARDS': { 
      const sabotageEntry = isCitiesKnights(state) && state.turnSubPhase === 'SABOTEUR_DISCARD'
        ? ensureCitiesKnightsState(state).sabotageDiscardQueue?.[0] : null;
      if (state.turnSubPhase !== 'DISCARD_PHASE' && !sabotageEntry) return { ok: false, message: 'Not in discard phase' };
      const handSize = totalHandCards(state, player);
      const required = sabotageEntry?.amount ?? Math.floor(handSize / 2);
      const selected = Object.values(action.resourcesToDiscard).reduce((sum, amount) => sum + amount, 0) +
        Object.values(action.commoditiesToDiscard || {}).reduce((sum, amount) => sum + amount, 0);
      if ((sabotageEntry && sabotageEntry.playerId !== action.playerId) || (!sabotageEntry && handSize <= handLimit(state, player)) || selected !== required ||
          Object.entries(action.resourcesToDiscard).some(([key, amount]) => amount > (player.resources?.[key] || 0)) ||
          Object.entries(action.commoditiesToDiscard || {}).some(([key, amount]) => amount > (player.commodities?.[key] || 0))) {
        return { ok: false, message: 'Exactly half of the hand must be discarded' };
      }
      break;
    }
    case 'GIVE_PROGRESS_CARDS': {
      const citiesKnights = isCitiesKnights(state) ? ensureCitiesKnightsState(state) : null;
      const wedding = state.turnSubPhase === 'WEDDING_GIVE' ? citiesKnights?.weddingGiveQueue?.[0] : null;
      const harbor = state.turnSubPhase === 'COMMERCIAL_HARBOR_GIVE' ? citiesKnights?.commercialHarborQueue?.[0] : null;
      const returnOffer = state.turnSubPhase === 'COMMERCIAL_HARBOR_RETURN' ? citiesKnights?.commercialHarborOffer : null;
      const entry = wedding || harbor || returnOffer;
      if (!entry || entry.playerId !== action.playerId || entry.recipientId !== action.targetPlayerId) {
        return { ok: false, message: 'No matching progress-card transfer is pending' };
      }
      const amount = Object.values(action.resourcesToGive).reduce((sum, value) => sum + value, 0) +
        Object.values(action.commoditiesToGive || {}).reduce((sum, value) => sum + value, 0);
      const requiredAmount = (harbor || returnOffer) ? 1 : entry.amount;
      if (amount !== requiredAmount || Object.entries(action.resourcesToGive).some(([key, value]) => (player.resources?.[key] || 0) < value) ||
          Object.entries(action.commoditiesToGive || {}).some(([key, value]) => (player.commodities?.[key] || 0) < value)) {
        return { ok: false, message: 'Invalid Wedding cards' };
      }
      if ((harbor || returnOffer) && amount !== 1) return { ok: false, message: 'Commercial Harbor exchanges exactly one card' };
      if (returnOffer) {
        const category = Object.keys(action.resourcesToGive).some(key => action.resourcesToGive[key]) ? 'RESOURCE' : 'COMMODITY';
        if (category !== returnOffer.category) return { ok: false, message: 'Return a card of the same type' };
      }
      break;
    }
    case 'BUILD_SETTLEMENT': {
      if (isCitiesKnights(state) && state.gamePhase === 'SETUP_ROUND_2') {
        return { ok: false, message: 'Cities & Knights second setup placement must be a city' };
      }
      const vertex = state.vertices?.find(candidate => candidate.id === action.vertexId);
      if (!vertex || vertex.structure !== 'NONE' || countPieces(state, action.playerId, 'SETTLEMENT') >= 5) return { ok: false, message: 'Illegal settlement target' };
      const borderingTiles = (state.tiles || []).filter(tile => tileVertexIds(tile).includes(action.vertexId));
      if (borderingTiles.length === 0 || borderingTiles.every(isWaterTile)) return { ok: false, message: 'Settlement must touch land' };
      if (isBarbarianAttack(state) && borderingTiles.some(tile => state.scenarioState?.capturedTileIds?.includes(tile.id))) return { ok: false, message: 'Captured coastal areas cannot be settled' };
      if ((state.selectedScenario === 'CLOTH_FOR_CATAN' && borderingTiles.some(tile => (tile.lostTribeVillages || []).length)) ||
          (state.selectedScenario === 'THE_LOST_TRIBE' && borderingTiles.some(tile => !isWaterTile(tile) && tile.islandId !== 1))) return { ok: false, message: 'Lost Tribe islands cannot be settled' };
      if (state.selectedScenario === 'GREAT_CANAL' && borderingTiles.some(tile => !isWaterTile(tile) && tile.islandId !== 1)) {
        return { ok: false, message: 'The Great Canal small islands cannot be settled' };
      }
      if (state.selectedScenario === 'ENCHANTED_LAND' && borderingTiles.some(tile => tile.scenarioMarker?.isEnchantedLand) && !borderingTiles.some(isWaterTile)) {
        return { ok: false, message: 'Settlements in the Enchanted Land must be on the coast' };
      }
      if (isPirateIslands(state) && !isSetup && vertexIslandIds(state, action.vertexId).some(islandId => islandId !== 1) &&
          vertex.pirateSettlementTarget !== action.playerId) return { ok: false, message: 'Only the marked Pirate Islands vertex may be settled' };
      if (isSetup && ['HEADING_FOR_NEW_SHORES', 'THROUGH_THE_DESERT', 'THE_LOST_TRIBE', 'CLOTH_FOR_CATAN'].includes(state.selectedScenario) &&
          borderingTiles.some(tile => !isWaterTile(tile) && tile.islandId !== 1)) {
        return { ok: false, message: 'Setup settlement must be on the main island' };
      }
      if (hasAdjacentStructure(state, action.vertexId)) return { ok: false, message: 'Settlement distance rule violated' };
      if (isSetup && state.setupState?.hasPlacedSettlement) return { ok: false, message: 'Setup settlement already placed' };
      if (!isSetup && !incidentEdges(state, action.vertexId).some(edge =>
        (edge.hasRoad && edge.playerId === action.playerId) || (edge.hasShip && edge.shipPlayerId === action.playerId))) {
        return { ok: false, message: 'Settlement is not connected to the player network' };
      }
      if (!isSetup && (state.turnSubPhase !== 'TRADE_AND_BUILD' || !hasResources(player, { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 }))) {
        return { ok: false, message: 'Settlement cannot be built now' };
      }
      break;
    }
    case 'BUILD_CITY': {
      const vertex = state.vertices?.find(candidate => candidate.id === action.vertexId);
      if (state.selectedScenario === 'ENCHANTED_LAND' && (state.tiles || []).some(tile => tile.scenarioMarker?.isEnchantedLand && tileVertexIds(tile).includes(action.vertexId))) {
        return { ok: false, message: 'Enchanted Land settlements cannot be upgraded to cities' };
      }
      const isScenarioSetupCity = state.gamePhase === 'SETUP_ROUND_2' && (isCitiesKnights(state) || isMerchantsAndBarbarians(state));
      if (isScenarioSetupCity) {
        const borderingTiles = (state.tiles || []).filter(tile => tileVertexIds(tile).includes(action.vertexId));
        const requiresCoastalStart = ['GREAT_CANAL', 'ENCHANTED_LAND'].includes(state.selectedScenario);
        const alreadyHasCoastalStructure = (state.vertices || []).some(candidate => candidate.playerId === action.playerId && ['SETTLEMENT', 'CITY'].includes(candidate.structure) && isCoastalVertex(state, candidate.id));
        if (!vertex || vertex.structure !== 'NONE' || countPieces(state, action.playerId, 'CITY') >= cityLimitForState(state) ||
            !borderingTiles.length || borderingTiles.every(isWaterTile) || hasAdjacentStructure(state, action.vertexId) ||
            state.setupState?.hasPlacedSettlement || (requiresCoastalStart && !alreadyHasCoastalStructure && !isCoastalVertex(state, action.vertexId))) {
          return { ok: false, message: 'Illegal Cities & Knights setup city' };
        }
        break;
      }
      if (!vertex || vertex.structure !== 'SETTLEMENT' || vertex.playerId !== action.playerId || countPieces(state, action.playerId, 'CITY') >= cityLimitForState(state) ||
          state.turnSubPhase !== 'TRADE_AND_BUILD' || !hasResources(player, { WHEAT: 2, ORE: 3 })) {
        return { ok: false, message: 'Illegal city upgrade' };
      }
      break;
    }
    case 'CAST_CARAVAN_VOTE': {
      const scenario = state.scenarioState;
      if (!isCaravanRoute(state) || scenario?.kind !== 'CARAVAN_ROUTE' || !scenario.pendingCaravanVote || player.isBot ||
          Object.hasOwn(scenario.pendingCaravanVote.votesByPlayerId, action.playerId) || action.cards.SHEEP > (player.resources.SHEEP || 0) || action.cards.WHEAT > (player.resources.WHEAT || 0)) {
        return { ok: false, message: 'Illegal caravan vote' };
      }
      break;
    }
    case 'CHOOSE_CARAVAN_TIE_LOCATION': {
      const tie = state.scenarioState?.pendingCamelTie;
      if (!isCaravanRoute(state) || !tie?.playerIds.includes(action.playerId) || Object.hasOwn(tie.choicesByPlayerId, action.playerId) ||
          !caravanCamelCandidates(state).has(action.edgeId)) return { ok: false, message: 'Illegal caravan tie choice' };
      break;
    }
    case 'PLACE_CARAVAN_CAMEL': {
      const scenario = state.scenarioState;
      if (!isCaravanRoute(state) || scenario?.kind !== 'CARAVAN_ROUTE' || scenario.pendingCamelPlayerId !== action.playerId ||
          scenario.remainingCamels <= 0 || !caravanCamelCandidates(state).has(action.edgeId)) {
        return { ok: false, message: 'Illegal caravan camel location' };
      }
      break;
    }
    case 'BUILD_ROAD':
    case 'BUILD_SHIP': {
      const edge = state.edges?.find(candidate => candidate.id === action.edgeId);
      const kind = action.type === 'BUILD_ROAD' ? 'ROAD' : 'SHIP';
      const limit = 15;
      const free = kind === 'ROAD'
        ? (state.roadBuildingRemaining || 0) > 0 || (state.diplomatRoadBuildingRemaining || 0) > 0
        : (state.roadBuildingRemaining || 0) > 0;
      const cost = kind === 'ROAD' ? { WOOD: 1, BRICK: 1 } : { WOOD: 1, SHEEP: 1 };
      if (!edge || edge.hasRoad || edge.hasShip || (kind === 'ROAD' && edge.isRiverCrossing) || countPieces(state, action.playerId, kind) >= limit ||
          (!isSetup && state.turnSubPhase !== 'TRADE_AND_BUILD' && !free) || (!isSetup && !free && !hasResources(player, cost))) {
        return { ok: false, message: `Illegal ${kind.toLowerCase()} placement` };
      }
      const borderingTiles = (state.tiles || []).filter(tile => tileEdgeIds(tile).includes(action.edgeId));
      if (isBarbarianAttack(state) && borderingTiles.some(tile => state.scenarioState?.capturedTileIds?.includes(tile.id))) return { ok: false, message: 'Roads cannot be built around a captured coastal area' };
      if (state.selectedScenario === 'DESERT_DRAGONS' && kind === 'ROAD' &&
          borderingTiles.filter(tile => (tile.scenarioMarker?.dragonIds || []).length > 0).length >= 2) {
        return { ok: false, message: 'A road between two dragon hexes is blocked' };
      }
      if (state.selectedScenario === 'ENCHANTED_LAND' && kind === 'ROAD' && borderingTiles.some(tile => tile.scenarioMarker?.isEnchantedLand)) {
        return { ok: false, message: 'Roads cannot be built in the Enchanted Land' };
      }
      const isLandFrame = borderingTiles.length === 1 && !isWaterTile(borderingTiles[0]);
      if (kind === 'SHIP' && !borderingTiles.some(isWaterTile) && !isLandFrame) return { ok: false, message: 'Ship must be built on water or coast' };
      if (kind === 'ROAD' && !borderingTiles.some(tile => !isWaterTile(tile))) return { ok: false, message: 'Road must be built on land or coast' };
      if (state.selectedScenario === 'GREAT_CANAL' && isSetup && kind === 'ROAD' && state.setupState?.lastSettlementVertexId &&
          isCoastalVertex(state, state.setupState.lastSettlementVertexId)) {
        return { ok: false, message: 'Coastal setup buildings in the Great Canal require a ship' };
      }
      if (state.selectedScenario === 'GREAT_CANAL' && kind === 'SHIP' && edgeEndpoints(edge).some(vertexId =>
        incidentEdges(state, vertexId).filter(candidate => candidate.hasShip && candidate.shipPlayerId === action.playerId).length >= 2)) {
        return { ok: false, message: 'Shipping routes cannot branch in the Great Canal scenario' };
      }
      if (isSetup) {
        if (state.setupState?.hasPlacedRoad || !state.setupState?.lastSettlementVertexId ||
            !edgeEndpoints(edge).includes(state.setupState.lastSettlementVertexId)) {
          return { ok: false, message: 'Setup route must touch the new settlement' };
        }
      } else if (!networkTouchesTarget(state, action.playerId, edge, kind)) {
        return { ok: false, message: `${kind} is not connected to the player network` };
      }
      if (isPirateIslands(state) && kind === 'SHIP') {
        if (pirateShipPath(state, action.playerId)) return { ok: false, message: 'The Pirate Islands shipping line is already complete' };
        if (!isSinglePirateShippingLine(state, action.playerId, edge) || !isShortestPirateLineExtension(state, action.playerId, edge)) {
          return { ok: false, message: 'The Pirate Islands route must be one uninterrupted shortest line through the marked intersection' };
        }
      }
      break;
    }
    case 'BUY_DEV_CARD':
      if (isCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || !hasResources(player, { SHEEP: 1, WHEAT: 1, ORE: 1 }) ||
          !Array.isArray(state.devCardDeck) || state.devCardDeck[0] !== action.cardType) {
        return { ok: false, message: 'Development card cannot be bought' };
      }
      break;
    case 'PLAY_DEV_CARD': {
      if (isCitiesKnights(state)) return { ok: false, message: 'Cities & Knights uses progress cards instead of development cards' };
      const available = (player.developmentCards?.[action.cardType] || 0) - (player.boughtDevCardsThisTurn?.[action.cardType] || 0);
      if (!['BEFORE_ROLL', 'TRADE_AND_BUILD'].includes(state.turnSubPhase) || player.playedDevCardThisTurn || available <= 0) {
        return { ok: false, message: 'Development card cannot be played' };
      }
      if (isPirateIslands(state) && !['KNIGHT', 'VICTORY_POINT'].includes(action.cardType)) return { ok: false, message: 'Only knight cards can be used on Pirate Islands' };
      if (isPirateIslands(state) && ['KNIGHT', 'VICTORY_POINT'].includes(action.cardType) &&
          !pirateShippingLine(state, action.playerId)?.some(edge => !edge.isWarship)) {
        return { ok: false, message: 'A regular ship is required for a warship upgrade' };
      }
      if (state.selectedScenario === 'DESERT_DRAGONS' && action.cardType === 'KNIGHT' &&
          !(state.tiles || []).some(tile => tile.islandId === 1 && tile.type !== 'DESERT' && (tile.scenarioMarker?.dragonIds || []).length)) {
        return { ok: false, message: 'There is no dragon outside the desert to remove' };
      }
      if (action.cardType === 'YEAR_OF_PLENTY') {
        const requestedResources = action.data.resources.reduce((counts, resource) => {
          counts[resource] = (counts[resource] || 0) + 1;
          return counts;
        }, {});
        if (Object.entries(requestedResources).some(([resource, amount]) => (state.resourceBank?.[resource] || 0) < amount)) {
          return { ok: false, message: 'Insufficient bank resources for Year of Plenty' };
        }
      }
      break;
    }
    case 'MOVE_ROBBER': {
      if (isPirateIslands(state)) return { ok: false, message: 'Pirate Islands has no robber or sea robber' };
      const tile = state.tiles?.find(candidate => candidate.id === action.tileId);
      const robberType = action.robberType || 'ROBBER';
      if (!tile || state.turnSubPhase !== 'ROBBER_PLACEMENT' ||
          (robberType === 'ROBBER' ? isWaterTile(tile) || tile.type === 'OASIS' || tile.hasRobber : !isRevealedWaterTile(tile) || tile.hasPirate)) {
        return { ok: false, message: 'Illegal robber target' };
      }
      if (state.selectedScenario === 'CLOTH_FOR_CATAN' && robberType === 'ROBBER' && tile.islandId !== 1) {
        return { ok: false, message: 'The robber cannot move to a Lost Tribe island' };
      }
      if (state.selectedScenario === 'CLOTH_FOR_CATAN' && robberType === 'PIRATE' && !(player.lostTribeVillageIds || []).length) {
        return { ok: false, message: 'A village shipping connection is required before moving the pirate' };
      }
      break;
    }
    case 'STEAL_RESOURCE': {
      const victim = state.players.find(candidate => candidate.id === action.victimPlayerId);
      if (state.selectedScenario === 'DESERT_DRAGONS' && state.turnSubPhase === 'ROBBER_STEAL') {
        if (!victim || victim.id === action.playerId || totalResources(victim) <= 0) return { ok: false, message: 'Illegal Desert Dragons steal' };
        break;
      }
      if (isPirateIslands(state) && state.turnSubPhase === 'ROBBER_STEAL') {
        if (!victim || victim.id === action.playerId ||
            (action.stolenResource === 'CLOTH'
              ? state.selectedScenario !== 'CLOTH_FOR_CATAN' || (victim.clothRolls || 0) <= 0
            : totalHandCards(state, victim) <= 0 || ((isResource(action.stolenResource) ? victim.resources : victim.commodities)?.[action.stolenResource] || 0) <= 0)) {
          return { ok: false, message: 'Illegal Pirate Islands steal' };
        }
        break;
      }
      const robberType = state.pendingRobberType || 'ROBBER';
      const markerTile = state.tiles?.find(tile => robberType === 'PIRATE' ? tile.hasPirate : tile.hasRobber);
      const eligibleVictims = getEligibleVictimIds(state, action.playerId, markerTile, robberType);
      if (!victim || victim.id === action.playerId ||
          (action.stolenResource === 'CLOTH'
            ? state.selectedScenario !== 'CLOTH_FOR_CATAN' || robberType !== 'PIRATE' || (victim.clothRolls || 0) <= 0
            : totalHandCards(state, victim) <= 0 || ((isResource(action.stolenResource) ? victim.resources : victim.commodities)?.[action.stolenResource] || 0) <= 0) ||
          !eligibleVictims.includes(victim.id) ||
          state.turnSubPhase !== 'ROBBER_STEAL') {
        return { ok: false, message: 'Illegal steal action' };
      }
      break;
    }
    case 'BANK_TRADE':
      if (state.turnSubPhase !== 'TRADE_AND_BUILD' ||
          action.ratio !== bankTradeRatioForPlayer(state, action.playerId, action.offeredResource) ||
          (player.resources?.[action.offeredResource] || 0) < action.ratio ||
          (state.resourceBank?.[action.requestedResource] || 0) < 1) return { ok: false, message: 'Illegal bank trade' };
      break;
    case 'EXECUTE_PLAYER_TRADE': {
      const target = state.players.find(candidate => candidate.id === action.targetPlayerId);
      if (!target || state.turnSubPhase !== 'TRADE_AND_BUILD' || !hasResources(player, action.offer) || !hasResources(target, action.request)) {
        return { ok: false, message: 'Illegal player trade' };
      }
      break;
    }
    case 'GOLD_TRADE':
      if ((!isRiversOfCatan(state) && !isMerchantsAndBarbarians(state)) || state.turnSubPhase !== 'TRADE_AND_BUILD' || (state.goldCoins?.[action.playerId] || 0) < 2 ||
          (!isRiversOfCatan(state) && (player.goldTradesThisTurn || 0) >= 2) || (state.resourceBank?.[action.requestedResource] || 0) < 1) {
        return { ok: false, message: 'Illegal gold trade' };
      }
      break;
    case 'SELECT_GOLD_RESOURCE': {
      const pending = state.goldSelectionQueue?.[0];
      if (state.turnSubPhase !== 'GOLD_RESOURCE_SELECTION' || pending?.playerId !== action.playerId ||
          (pending.allowedResources && !pending.allowedResources.includes(action.resource)) ||
          (state.resourceBank?.[action.resource] || 0) < 1) return { ok: false, message: 'Illegal gold selection' };
      break;
    }
    case 'ATTACK_PIRATE_FORTRESS': {
      const fortress = state.vertices?.find(vertex => vertex.id === action.fortressVertexId);
      const path = pirateShipPath(state, action.playerId);
      const warshipCount = path?.filter(edge => edge.isWarship).length || 0;
      if (state.selectedScenario !== 'PIRATE_ISLANDS' || state.turnSubPhase !== 'TRADE_AND_BUILD' ||
          !fortress?.pirateFortress || fortress.pirateFortress.playerId !== action.playerId ||
          fortress.pirateFortress.conquered || fortress.pirateFortress.remainingTokens <= 0 || !path ||
          path.length !== shortestPirateRouteLength(state, action.playerId) || warshipCount <= 0) {
        return { ok: false, message: 'Illegal fortress attack' };
      }
      break;
    }
    case 'MOVE_SHIP': {
      if (isPirateIslands(state)) return { ok: false, message: 'Ships cannot be moved on Pirate Islands' };
      const source = state.edges?.find(edge => edge.id === action.fromEdgeId);
      const target = state.edges?.find(edge => edge.id === action.toEdgeId);
      if (state.turnSubPhase !== 'TRADE_AND_BUILD' || !source?.hasShip || source.shipPlayerId !== action.playerId ||
          !target || target.hasShip || target.hasRoad || state.hasMovedShipThisTurn ||
          (state.currentTurnBuiltShips || []).includes(source.id) || !isOpenShip(state, action.playerId, source) ||
          !isShipEdge(state, target.id) || isPirateBlockedEdge(state, source.id) || isPirateBlockedEdge(state, target.id) ||
          shipMoveDisconnectsKnight(state, action.playerId, source.id)) {
        return { ok: false, message: 'Illegal ship move' };
      }
      if (!networkTouchesTarget(state, action.playerId, target, 'SHIP', source.id)) return { ok: false, message: 'Ship destination is disconnected' };
      break;
    }
    case 'PLACE_HARBOR':
      if (state.turnSubPhase !== 'HARBOR_PLACEMENT' || !player.unplacedHarbors?.length ||
          !eligibleHarborEdges(state, action.playerId).some(edge => edge.id === action.edgeId)) {
        return { ok: false, message: 'Illegal harbor placement' };
      }
      break;
    case 'DISCOVER_FOG': {
      const tile = state.tiles?.find(candidate => candidate.id === action.tileId);
      if (!tile || tile.type !== 'FOG') return { ok: false, message: 'Illegal fog discovery' };
      const expectedType = tile.originalType || 'WOOD';
      const expectedNumber = tile.originalNumberToken ?? null;
      if (action.revealedTile.type !== expectedType || (action.revealedTile.numberToken ?? null) !== expectedNumber) {
        return { ok: false, message: 'Forged fog tile data' };
      }
      break;
    }
    case 'MOVE_WAGON': {
      if (!isMerchantsAndBarbarians(state) || state.turnSubPhase !== 'TRADE_AND_BUILD') return { ok: false, message: 'Wagons are unavailable' };
      const connectingEdge = incidentEdges(state, player.wagonPosition).find(edge => edgeEndpoints(edge).includes(action.targetVertexId));
      const foreignRoad = connectingEdge?.hasRoad && connectingEdge.playerId && connectingEdge.playerId !== action.playerId;
      const expectedCost = (connectingEdge?.hasRoad && connectingEdge.playerId === action.playerId ? 1 : 2) +
        (state.scenarioState?.barbarianEdgeIds?.includes(connectingEdge?.id) ? 2 : 0);
      const movement = (player.remainingMovementPoints || 0) + (action.wheatBoost && !player.wagonWheatBoostUsed ? 2 : 0);
      if (!connectingEdge || action.movementCost !== expectedCost || movement < action.movementCost ||
          (action.wheatBoost && ((player.resources?.WHEAT || 0) < 1 || player.wagonWheatBoostUsed)) ||
          (foreignRoad && (state.goldCoins?.[action.playerId] || 0) < 1)) {
        return { ok: false, message: 'Illegal wagon move' };
      }
      break;
    }
    case 'UPGRADE_WAGON':
      if (!isMerchantsAndBarbarians(state) || state.turnSubPhase !== 'TRADE_AND_BUILD') return { ok: false, message: 'Wagons are unavailable' };
      if ((player.wagonLevel || 1) + 1 !== action.newLevel || action.newLevel > 5) return { ok: false, message: 'Invalid wagon level' };
      if (action.payment === 'RESOURCES' && !hasResources(player, { WOOD: 1, ORE: 1 })) return { ok: false, message: 'Not enough resources' };
      if (action.payment === 'GOLD' && (state.goldCoins?.[action.playerId] || 0) < 3) return { ok: false, message: 'Not enough gold' };
      break;
    case 'PLACE_MERCHANTS_BARBARIAN': {
      const edge = state.edges?.find(candidate => candidate.id === action.edgeId);
      if (!isMerchantsAndBarbarians(state) || state.turnSubPhase !== 'MERCHANTS_BARBARIAN_PLACEMENT' || !edge ||
          state.scenarioState?.barbarianEdgeIds?.includes(action.edgeId) || (state.scenarioState?.barbarianEdgeIds?.length || 0) >= 3) {
        return { ok: false, message: 'Illegal barbarian placement' };
      }
      break;
    }
    case 'BUILD_BRIDGE': {
      const edge = state.edges?.find(candidate => candidate.id === action.edgeId);
      const endpoints = edgeEndpoints(edge);
      const touchesOwnNetwork = endpoints.some(vertexId =>
        state.vertices?.some(vertex => vertex.id === vertexId && vertex.playerId === action.playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure)) ||
        incidentEdges(state, vertexId).some(candidate => (candidate.hasRoad && candidate.playerId === action.playerId) || candidate.bridgePlayerId === action.playerId)
      );
      if (!isRiversOfCatan(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || !edge?.isRiverCrossing || edge.bridgePlayerId ||
          (state.edges || []).filter(candidate => candidate.bridgePlayerId === action.playerId).length >= 3 ||
          !hasResources(player, { WOOD: 1, BRICK: 2 }) || !touchesOwnNetwork) {
        return { ok: false, message: 'Illegal bridge construction' };
      }
      break;
    }
    case 'SPEND_FISH_ACTION': {
      if (!isFishermen(state) || state.turnSubPhase !== 'TRADE_AND_BUILD') return { ok: false, message: 'Fish actions are unavailable' };
      const cost = FISH_ACTION_COSTS[action.actionType];
      if (!findFishPayment(player.fishTokens || [], cost)) return { ok: false, message: 'Fish payment must match exactly' };
      if (action.actionType === 'TAKE_BANK_RESOURCE' && (!isResource(action.resource) || (state.resourceBank?.[action.resource] || 0) < 1)) {
        return { ok: false, message: 'Requested bank resource is unavailable' };
      }
      if (action.actionType === 'STEAL_CARD') {
        const target = state.players.find(candidate => candidate.id === action.targetPlayerId);
        if (!target || target.id === action.playerId || totalResources(target) < 1) return { ok: false, message: 'Invalid fish theft target' };
      }
      if (action.actionType === 'FREE_DEV_CARD' && !state.devCardDeck?.length) return { ok: false, message: 'Development deck is empty' };
      break;
    }
    case 'PASS_OLD_BOOT': {
      if (!isFishermen(state) || !player.hasOldBoot) return { ok: false, message: 'Old Boot is unavailable' };
      const target = state.players.find(candidate => candidate.id === action.targetPlayerId);
      if (!target || playerTotalVP(state, target) < playerTotalVP(state, player)) return { ok: false, message: 'Old Boot target must not be behind' };
      break;
    }
    case 'BUILD_KNIGHT': {
      const vertex = state.vertices?.find(candidate => candidate.id === action.vertexId);
      const ownsRoute = incidentEdges(state, action.vertexId).some(edge =>
        (edge.hasRoad && edge.playerId === action.playerId) ||
        (isCombinedSeafarersCitiesKnights(state) && edge.hasShip && edge.shipPlayerId === action.playerId)
      );
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || !vertex || vertex.structure !== 'NONE' || vertex.knight ||
          !ownsRoute || !hasResources(player, { SHEEP: 1, ORE: 1 }) ||
          (state.selectedScenario === 'GREAT_CANAL' && vertexIslandIds(state, action.vertexId).some(islandId => islandId !== 1)) ||
          (state.vertices || []).filter(candidate => candidate.knight?.playerId === action.playerId).length >= 6) {
        return { ok: false, message: 'Illegal knight placement' };
      }
      break;
    }
    case 'ACTIVATE_KNIGHT': {
      const knight = state.vertices?.find(candidate => candidate.id === action.vertexId)?.knight;
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || knight?.playerId !== action.playerId || knight.active || !hasResources(player, { WHEAT: 1 })) {
        return { ok: false, message: 'Knight cannot be activated' };
      }
      break;
    }
    case 'UPGRADE_KNIGHT': {
      const knight = state.vertices?.find(candidate => candidate.id === action.vertexId)?.knight;
      const freePromotion = (player.freeKnightPromotions || 0) > 0;
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || knight?.playerId !== action.playerId || knight.promotedThisTurn || knight.level >= 3 ||
          (knight.level === 2 && (player.cityImprovements?.POLITICS || 0) < 3) ||
          (!freePromotion && !hasResources(player, { SHEEP: 1, ORE: 1 }))) return { ok: false, message: 'Knight cannot be upgraded' };
      break;
    }
    case 'MOVE_KNIGHT': {
      const source = state.vertices?.find(candidate => candidate.id === action.fromVertexId);
      const destination = state.vertices?.find(candidate => candidate.id === action.toVertexId);
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || source?.knight?.playerId !== action.playerId || !source.knight.active || source.knight.actedThisTurn ||
          !destination || destination.structure !== 'NONE' || destination.knight || !hasOwnedRoadPath(state, action.playerId, action.fromVertexId, action.toVertexId)) {
        return { ok: false, message: 'Illegal knight move' };
      }
      break;
    }
    case 'EXPEL_PIRATE': {
      const vertex = state.vertices?.find(candidate => candidate.id === action.vertexId);
      const tile = state.tiles?.find(candidate => candidate.id === action.tileId);
      if (!isCombinedSeafarersCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' ||
          !vertex?.knight || vertex.knight.playerId !== action.playerId || !vertex.knight.active || vertex.knight.actedThisTurn ||
          !tile?.hasPirate || !tileVertexIds(tile).includes(action.vertexId)) {
        return { ok: false, message: 'Knight cannot expel this pirate' };
      }
      break;
    }
    case 'DISPLACE_KNIGHT': {
      const source = state.vertices?.find(candidate => candidate.id === action.fromVertexId);
      const destination = state.vertices?.find(candidate => candidate.id === action.toVertexId);
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || source?.knight?.playerId !== action.playerId ||
          !source.knight.active || source.knight.actedThisTurn || !destination?.knight || destination.knight.playerId === action.playerId ||
          source.knight.level <= destination.knight.level || !hasOwnedRoadPath(state, action.playerId, action.fromVertexId, action.toVertexId, { allowOccupiedTarget: true })) {
        return { ok: false, message: 'Illegal knight displacement' };
      }
      break;
    }
    case 'RELOCATE_DISPLACED_KNIGHT': {
      const citiesKnights = ensureCitiesKnightsState(state);
      const pending = citiesKnights.pendingDisplacedKnight;
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'KNIGHT_DISPLACEMENT' || pending?.ownerId !== action.playerId) {
        return { ok: false, message: 'No displaced knight awaits relocation' };
      }
      if (action.toVertexId) {
        const target = state.vertices?.find(candidate => candidate.id === action.toVertexId);
        const isEnchantedRelocation = pending.relocationMode === 'ENCHANTED_LAND';
        const legalTarget = isEnchantedRelocation
          ? target?.isEnchantedLand && !isEnchantedCoast(state, target.id) && target.structure === 'NONE' && !target.knight
          : target && target.structure === 'NONE' && !target.knight && hasOwnedRoadPath(state, action.playerId, pending.originVertexId, action.toVertexId);
        if (!legalTarget) {
          return { ok: false, message: 'Illegal displaced knight target' };
        }
      } else {
        const canRelocate = (state.vertices || []).some(vertex => pending.relocationMode === 'ENCHANTED_LAND'
          ? vertex.isEnchantedLand && !isEnchantedCoast(state, vertex.id) && vertex.structure === 'NONE' && !vertex.knight
          : vertex.structure === 'NONE' && !vertex.knight && hasOwnedRoadPath(state, action.playerId, pending.originVertexId, vertex.id));
        if (canRelocate) return { ok: false, message: 'A legal relocation exists' };
      }
      break;
    }
    case 'SELECT_DESERTER_KNIGHT': {
      const pending = isCitiesKnights(state) ? ensureCitiesKnightsState(state).deserterPending : null;
      const knight = state.vertices?.find(candidate => candidate.id === action.vertexId)?.knight;
      if (state.turnSubPhase !== 'DESERTER_SELECT' || pending?.targetPlayerId !== action.playerId || knight?.playerId !== action.playerId) {
        return { ok: false, message: 'Choose one of the targeted player\'s knights' };
      }
      if (state.selectedScenario === 'ENCHANTED_LAND' && state.vertices?.find(candidate => candidate.id === action.vertexId)?.isEnchantedLand) {
        return { ok: false, message: 'Deserter cannot target knights in the Enchanted Land' };
      }
      break;
    }
    case 'PLACE_DESERTER_KNIGHT': {
      const pending = isCitiesKnights(state) ? ensureCitiesKnightsState(state).deserterPending : null;
      const vertex = state.vertices?.find(candidate => candidate.id === action.vertexId);
      const ownsRoute = incidentEdges(state, action.vertexId).some(edge => edge.hasRoad && edge.playerId === action.playerId);
      if (state.turnSubPhase !== 'DESERTER_PLACE' || pending?.actorId !== action.playerId || !pending.knight || !vertex || vertex.structure !== 'NONE' || vertex.knight || !ownsRoute ||
          (state.vertices || []).filter(candidate => candidate.knight?.playerId === action.playerId).length >= 6) {
        return { ok: false, message: 'Illegal Deserter knight placement' };
      }
      break;
    }
    case 'BUILD_CITY_WALL': {
      const vertex = state.vertices?.find(candidate => candidate.id === action.vertexId);
      const wallCount = (state.vertices || []).filter(candidate => candidate.playerId === action.playerId && candidate.cityWall).length;
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || vertex?.playerId !== action.playerId || vertex.structure !== 'CITY' || vertex.cityWall ||
          wallCount >= 3 || !hasResources(player, { BRICK: 2 })) return { ok: false, message: 'City wall cannot be built' };
      break;
    }
    case 'UPGRADE_CITY_IMPROVEMENT': {
      ensureCitiesKnightsState(state);
      const currentLevel = player.cityImprovements?.[action.track] || 0;
      const commodity = { SCIENCE: 'PAPER', POLITICS: 'COIN', TRADE: 'CLOTH' }[action.track];
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'TRADE_AND_BUILD' || cityCount(state, action.playerId) === 0 || currentLevel >= 5 ||
          (player.commodities?.[commodity] || 0) < Math.max(0, currentLevel + 1 - (player.cityImprovementDiscount || 0))) return { ok: false, message: 'City improvement cannot be upgraded' };
      break;
    }
    case 'DOWNGRADE_CITY': {
      ensureCitiesKnightsState(state);
      const vertex = state.vertices?.find(candidate => candidate.id === action.vertexId);
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'BARBARIAN_LOSS' || state.citiesKnightsState.barbarianLossQueue?.[0] !== action.playerId ||
          vertex?.playerId !== action.playerId || vertex.structure !== 'CITY' || vertex.metropolis) return { ok: false, message: 'This city cannot be downgraded' };
      break;
    }
    case 'PLAY_PROGRESS_CARD': {
      const allowedBeforeRoll = action.cardId === 'ALCHEMIST';
      if (!isCitiesKnights(state) || !player.progressCards?.includes(action.cardId) ||
          (allowedBeforeRoll ? state.turnSubPhase !== 'BEFORE_ROLL' : state.turnSubPhase !== 'TRADE_AND_BUILD')) {
        return { ok: false, message: 'Progress card cannot be played now' };
      }
      if (!['ALCHEMIST', 'INVENTOR', 'BISHOP', 'SABOTEUR', 'DESERTER', 'DIPLOMAT', 'INTRIGUE', 'WARLORD', 'ROAD_BUILDING', 'CRANE', 'SMITH', 'ENGINEER', 'IRRIGATION', 'MINING', 'MEDICINE', 'RESOURCE_MONOPOLY', 'TRADE_MONOPOLY', 'MASTER_MERCHANT', 'SPY', 'MERCHANT', 'MERCHANT_FLEET', 'WEDDING', 'COMMERCIAL_HARBOR'].includes(action.cardId)) return { ok: false, message: 'This progress card is not implemented yet' };
      if (action.cardId === 'ENGINEER') {
        const vertex = state.vertices?.find(candidate => candidate.id === action.data?.vertexId);
        const walls = (state.vertices || []).filter(candidate => candidate.playerId === action.playerId && candidate.cityWall).length;
        if (!vertex || vertex.playerId !== action.playerId || vertex.structure !== 'CITY' || vertex.cityWall || walls >= 3) return { ok: false, message: 'Engineer needs an eligible city' };
      }
      if (action.cardId === 'IRRIGATION' && terrainHexesAdjacentToPlayer(state, action.playerId, 'WHEAT').length === 0) return { ok: false, message: 'Irrigation needs an adjacent field' };
      if (action.cardId === 'MINING' && terrainHexesAdjacentToPlayer(state, action.playerId, 'ORE').length === 0) return { ok: false, message: 'Mining needs an adjacent mountain' };
      if (action.cardId === 'MEDICINE') {
        const vertex = state.vertices?.find(candidate => candidate.id === action.data?.vertexId);
        if (!vertex || vertex.playerId !== action.playerId || vertex.structure !== 'SETTLEMENT' || countPieces(state, action.playerId, 'CITY') >= cityLimitForState(state) || !hasResources(player, { WHEAT: 1, ORE: 2 })) {
          return { ok: false, message: 'Medicine needs an eligible settlement and payment' };
        }
      }
      if (action.cardId === 'INVENTOR') {
        const tileA = state.tiles?.find(tile => tile.id === action.data?.tileAId);
        const tileB = state.tiles?.find(tile => tile.id === action.data?.tileBId);
        if (!tileA || !tileB || tileA === tileB || [2, 12].includes(tileA.numberToken) || [2, 12].includes(tileB.numberToken) ||
            !Number.isInteger(tileA.numberToken) || !Number.isInteger(tileB.numberToken) ||
            (state.selectedScenario === 'ENCHANTED_LAND' && (tileA.scenarioMarker?.isEnchantedLand || tileB.scenarioMarker?.isEnchantedLand))) {
          return { ok: false, message: 'Inventor needs two different numbered tiles, neither 2 nor 12' };
        }
      }
      if (action.cardId === 'RESOURCE_MONOPOLY' && !RESOURCE_TYPES.includes(action.data?.resource)) return { ok: false, message: 'Resource Monopoly needs a resource type' };
      if (action.cardId === 'TRADE_MONOPOLY' && !COMMODITY_TYPES.includes(action.data?.resource)) return { ok: false, message: 'Trade Monopoly needs a commodity type' };
      if (action.cardId === 'MASTER_MERCHANT') {
        const target = state.players.find(candidate => candidate.id === action.data?.targetPlayerId);
        const requested = action.data?.selectedCards || [];
        const requestedCounts = requested.reduce((counts, card) => ({ ...counts, [card]: (counts[card] || 0) + 1 }), {});
        if (!target || target.id === player.id || playerTotalVP(state, target) <= playerTotalVP(state, player) || requested.length !== 2 ||
            requested.some(card => !RESOURCE_TYPES.includes(card) && !COMMODITY_TYPES.includes(card)) ||
            Object.entries(requestedCounts).some(([card, amount]) => ((RESOURCE_TYPES.includes(card) ? target.resources?.[card] : target.commodities?.[card]) || 0) < amount)) {
          return { ok: false, message: 'Master Merchant needs two available cards from a leading opponent' };
        }
      }
      if (action.cardId === 'SPY') {
        const target = state.players.find(candidate => candidate.id === action.data?.targetPlayerId);
        if (!target || target.id === player.id || !target.progressCards?.includes(action.data?.targetCardId)) return { ok: false, message: 'Spy needs a progress card from another player' };
      }
      if (action.cardId === 'MERCHANT') {
        const tile = state.tiles?.find(candidate => candidate.id === action.data?.tileId);
        if (!tile || !RESOURCE_TYPES.includes(tile.type) || !tileVertexIds(tile).some(vertexId => state.vertices?.some(vertex =>
          vertex.id === vertexId && vertex.playerId === action.playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure)))) {
          return { ok: false, message: 'Merchant needs a resource tile adjacent to your building' };
        }
      }
      if (action.cardId === 'MERCHANT_FLEET' && !RESOURCE_TYPES.includes(action.data?.resource)) return { ok: false, message: 'Merchant Fleet needs a resource type' };
      if (action.cardId === 'BISHOP') {
        const tile = state.tiles?.find(candidate => candidate.id === action.data?.tileId);
        if (!tile || isWaterTile(tile)) return { ok: false, message: 'Bishop needs a land tile for the robber' };
      }
      if (action.cardId === 'DIPLOMAT') {
        const edge = state.edges?.find(candidate => candidate.id === action.data?.targetEdgeId);
        if (!edge?.hasRoad || !edge.playerId || !edgeEndpoints(edge).every(vertexId => state.vertices?.find(vertex => vertex.id === vertexId)?.structure === 'NONE')) {
          return { ok: false, message: 'Diplomat needs an open road' };
        }
      }
      if (action.cardId === 'INTRIGUE') {
        const target = state.vertices?.find(candidate => candidate.id === action.data?.targetVertexId);
        const adjacentOwnActiveKnight = incidentEdges(state, action.data?.targetVertexId).some(edge => {
          const neighbourId = edgeEndpoints(edge).find(vertexId => vertexId !== action.data.targetVertexId);
          const knight = state.vertices?.find(vertex => vertex.id === neighbourId)?.knight;
          return knight?.playerId === action.playerId && knight.active;
        });
        if (!target?.knight || target.knight.playerId === action.playerId || !adjacentOwnActiveKnight ||
            (state.selectedScenario === 'ENCHANTED_LAND' && target.isEnchantedLand)) return { ok: false, message: 'Intrigue needs an opponent knight beside one of your active knights' };
      }
      if (action.cardId === 'DESERTER') {
        const target = state.players.find(candidate => candidate.id === action.data?.targetPlayerId);
        if (!target || target.id === action.playerId || !(state.vertices || []).some(vertex => vertex.knight?.playerId === target.id &&
            !(state.selectedScenario === 'ENCHANTED_LAND' && vertex.isEnchantedLand))) {
          return { ok: false, message: 'Deserter needs an opponent with a knight' };
        }
      }
      break;
    }
    case 'DISCARD_PROGRESS_CARD': {
      const citiesKnights = ensureCitiesKnightsState(state);
      if (!isCitiesKnights(state) || state.turnSubPhase !== 'PROGRESS_DISCARD' || citiesKnights.progressDiscardQueue?.[0] !== action.playerId ||
          (player.progressCards || []).length <= 4 || !player.progressCards.includes(action.cardId)) {
        return { ok: false, message: 'No progress card discard is required' };
      }
      break;
    }
    default:
      break;
  }
  return { ok: true };
}

function applyReservedAction(state, action) {
  if (!state) return;
  if (isCitiesKnights(state)) ensureCitiesKnightsState(state);
  const player = state.players?.find(candidate => candidate.id === action.playerId);
  const spend = (cost) => Object.entries(cost).forEach(([key, amount]) => { player.resources[key] -= amount; });
  const returnToBank = (cards) => Object.entries(cards).forEach(([key, amount]) => {
    if (state.resourceBank) state.resourceBank[key] = (state.resourceBank[key] || 0) + amount;
  });
  switch (action.type) {
    case 'CLAIM_TREASURE': {
      const scenario = state.scenarioState;
      const token = scenario.treasureTokens[action.treasureId];
      const reward = scenario.treasureDeck.shift();
      token.status = 'CLAIMED';
      token.claimedBy = action.playerId;
      const vertex = state.vertices.find(candidate => candidate.id === token.vertexId);
      if (vertex?.treasureToken) vertex.treasureToken.claimedBy = action.playerId;
      action.reward = reward;
      if (reward === 'RESOURCE_CHOICE' || reward === 'GRAIN_OR_BRICK') {
        state.goldSelectionQueue = [...(state.goldSelectionQueue || []), {
          playerId: action.playerId,
          amount: 1,
          tileId: token.vertexId,
          source: 'TREASURE',
          allowedResources: reward === 'GRAIN_OR_BRICK' ? ['WHEAT', 'BRICK'] : undefined,
        }];
        state.turnSubPhase = 'GOLD_RESOURCE_SELECTION';
      } else if (reward === 'TWO_RESOURCES') {
        state.goldSelectionQueue = [...(state.goldSelectionQueue || []), { playerId: action.playerId, amount: 2, tileId: token.vertexId, source: 'TREASURE' }];
        state.turnSubPhase = 'GOLD_RESOURCE_SELECTION';
      } else if (reward === 'DEVELOPMENT_CARD' && isCitiesKnights(state)) {
        const progressDeck = ensureCitiesKnightsState(state).progressDecks?.[action.progressTrack];
        const card = progressDeck?.shift();
        if (card) player.progressCards = [...(player.progressCards || []), card];
      } else if (reward === 'DEVELOPMENT_CARD' && state.devCardDeck.length) {
        const card = state.devCardDeck.shift();
        player.developmentCards[card] = (player.developmentCards[card] || 0) + 1;
      } else if (reward === 'FREE_BUILD') {
        state.roadBuildingRemaining = (state.roadBuildingRemaining || 0) + 2;
      }
      break;
    }
    case 'KEEP_TREASURE': {
      const scenario = state.scenarioState;
      const token = scenario.treasureTokens[action.treasureId];
      token.status = 'KEPT';
      token.claimedBy = action.playerId;
      const vertex = state.vertices.find(candidate => candidate.id === token.vertexId);
      if (vertex?.treasureToken) vertex.treasureToken.claimedBy = action.playerId;
      player.keptTreasureTokens = (player.keptTreasureTokens || 0) + 1;
      if (player.keptTreasureTokens === 2) {
        player.unplacedHarbors = [...(player.unplacedHarbors || []), action.harborType];
        state.turnSubPhase = 'HARBOR_PLACEMENT';
      }
      if (player.keptTreasureTokens === 3 || player.keptTreasureTokens === 4) {
        player.victoryPoints = (player.victoryPoints || 0) + 1;
      }
      break;
    }
    case 'MOVE_ENCHANTED_KNIGHT': {
      const source = state.vertices.find(vertex => vertex.id === action.fromVertexId);
      const destination = state.vertices.find(vertex => vertex.id === action.toVertexId);
      const displacedKnight = destination.knight;
      destination.knight = { ...source.knight, active: false, actedThisTurn: true };
      delete source.knight;
      state.scenarioState.knightOnIslandByPlayerId[action.playerId] = destination.id;
      if (displacedKnight) {
        const citiesKnights = ensureCitiesKnightsState(state);
        citiesKnights.pendingDisplacedKnight = {
          ownerId: displacedKnight.playerId,
          knight: { ...displacedKnight },
          originVertexId: destination.id,
          relocationMode: 'ENCHANTED_LAND',
        };
        state.turnSubPhase = 'KNIGHT_DISPLACEMENT';
      }
      break;
    }
    case 'FIGHT_ENCHANTED_DRAGON': {
      const vertex = state.vertices.find(candidate => candidate.id === action.knightVertexId);
      const dragon = vertex.enchantedDragon;
      vertex.knight = { ...vertex.knight, active: false, actedThisTurn: true };
      if (vertex.knight.level >= dragon.strength) {
        delete vertex.enchantedDragon;
        const defeated = state.scenarioState.defeatedDragonIdsByPlayerId[action.playerId] || [];
        state.scenarioState.defeatedDragonIdsByPlayerId[action.playerId] = [...defeated, dragon.id];
        player.victoryPoints = (player.victoryPoints || 0) + 1;
      }
      break;
    }
    case 'DISCOVER_SCENARIO_HEX': {
      const target = state.tiles.find(tile => tile.id === action.tileId);
      const scenario = state.scenarioState;
      let number = scenario.numberTokenSupply.shift();
      if (number === undefined) {
        const homeCandidates = state.tiles.filter(candidate => candidate.islandId === 1 && Number.isInteger(candidate.numberToken) &&
          !([6, 8].includes(candidate.numberToken) && state.tiles.some(other => other !== target && [6, 8].includes(other.numberToken) && areNeighboringHexes(other, target))) &&
          tileVertexIds(candidate).some(vertexId => {
            const vertex = state.vertices.find(entry => entry.id === vertexId);
            return vertex?.playerId === action.playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) &&
              state.tiles.some(other => other !== candidate && Number.isInteger(other.numberToken) && tileVertexIds(other).includes(vertexId));
          }));
        const source = homeCandidates.find(candidate => ![6, 8].includes(candidate.numberToken)) || homeCandidates[0];
        if (!source) break;
        number = source.numberToken;
        source.numberToken = null;
        scenario.depletedHomeTileIds = [...(scenario.depletedHomeTileIds || []), source.id];
      }
      target.numberToken = number;
      action.numberToken = number;
      break;
    }
    case 'ROLL_DICE': {
      const total = action.diceValues[0] + action.diceValues[1];
      state.lastRoll = total;
      let barbarianAttackPending = false;
      if (isCitiesKnights(state)) {
        const citiesKnights = ensureCitiesKnightsState(state);
        delete player.alchemistDice;
        delete player.alchemistEventDie;
        const cityDie = action.diceValues[2];
        citiesKnights.lastCityDie = cityDie;
        citiesKnights.lastEventDie = action.eventDie;
        if (action.eventDie === 'BARBARIAN') {
          citiesKnights.barbarianPosition = Math.min(7, citiesKnights.barbarianPosition + 1);
          if (citiesKnights.barbarianPosition === 7) barbarianAttackPending = resolveBarbarianAttack(state);
        } else if (CITY_IMPROVEMENT_TRACKS.includes(action.eventDie)) {
          const progressDeck = citiesKnights.progressDecks[action.eventDie];
          (state.players || []).forEach(candidate => {
            if ((candidate.cityImprovements?.[action.eventDie] || 0) >= cityDie && progressDeck.length > 0) {
              const drawnCard = progressDeck.shift();
              if (['PRINTER', 'CONSTITUTION'].includes(drawnCard)) {
                candidate.victoryPoints = (candidate.victoryPoints || 0) + 1;
              } else {
                candidate.progressCards ||= [];
                candidate.progressCards.push(drawnCard);
              }
            }
          });
        }
      }
      if (state.selectedScenario === 'PIRATE_ISLANDS') {
        const fleetTile = state.tiles?.find(tile => tile.hasPirate);
        const currentTileNumber = Number(fleetTile?.id?.split('_').pop());
        const routeIndex = PIRATE_ISLANDS_FLEET_ROUTE.indexOf(currentTileNumber);
        const steps = Math.min(action.diceValues[0], action.diceValues[1]);
        const destination = PIRATE_ISLANDS_FLEET_ROUTE[(Math.max(0, routeIndex) + steps) % PIRATE_ISLANDS_FLEET_ROUTE.length];
        const destinationId = `hex_pi_${destination}`;
        state.tiles.forEach(tile => { tile.hasPirate = tile.id === destinationId; });
        action.pirateFleetTileId = destinationId;
        const fleetPower = Math.min(action.diceValues[0], action.diceValues[1]);
        const threatenedVertices = new Set(tileVertexIds(state.tiles.find(tile => tile.id === destinationId)));
        state.vertices.filter(vertex => threatenedVertices.has(vertex.id) && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && vertex.playerId)
          .forEach(vertex => {
            const defender = state.players.find(candidate => candidate.id === vertex.playerId);
            const defense = state.edges.filter(edge => edge.hasShip && edge.shipPlayerId === defender.id && edge.isWarship).length;
            if (fleetPower > defense) {
              let losses = 1 + (vertex.structure === 'CITY' ? 1 : 0);
              while (losses > 0 && totalResources(defender) > 0) {
                const available = RESOURCE_TYPES.filter(resource => defender.resources[resource] > 0);
                const stolen = available[Math.floor(Math.random() * available.length)];
                defender.resources[stolen] -= 1;
                state.resourceBank[stolen] += 1;
                losses -= 1;
              }
            } else if (defense > fleetPower) {
              const gained = RESOURCE_TYPES.find(resource => (state.resourceBank?.[resource] || 0) > 0);
              if (gained) { defender.resources[gained] += 1; state.resourceBank[gained] -= 1; }
            }
          });
      }
      if (isMerchantsAndBarbarians(state) && [2, 12].includes(total)) {
        state.turnSubPhase = 'BEFORE_ROLL';
        break;
      }
      if (total === 7) {
        state.players.filter(candidate => candidate.isBot && totalHandCards(state, candidate) > handLimit(state, candidate)).forEach(bot => {
          let remaining = Math.floor(totalHandCards(state, bot) / 2);
          RESOURCE_TYPES.forEach(resource => {
            const amount = Math.min(bot.resources[resource] || 0, remaining);
            bot.resources[resource] -= amount;
            state.resourceBank[resource] += amount;
            remaining -= amount;
          });
          COMMODITY_TYPES.forEach(commodity => {
            const amount = Math.min(bot.commodities?.[commodity] || 0, remaining);
            bot.commodities[commodity] -= amount;
            state.commodityBank[commodity] += amount;
            remaining -= amount;
          });
        });
        const cAndKNoRobberYet = isCitiesKnights(state) && !ensureCitiesKnightsState(state).hasBarbarianAttacked;
        if (state.selectedScenario === 'DESERT_DRAGONS') {
          state.eligibleStealPlayerIds = state.players.filter(candidate => candidate.id !== action.playerId && totalResources(candidate) > 0).map(candidate => candidate.id);
        }
        state.turnSubPhase = state.players.some(candidate => totalHandCards(state, candidate) > handLimit(state, candidate))
          ? 'DISCARD_PHASE'
          : state.selectedScenario === 'DESERT_DRAGONS' && state.players.some(candidate => candidate.id !== action.playerId && totalResources(candidate) > 0)
            ? 'ROBBER_STEAL'
          : isPirateIslands(state) && state.players.some(candidate => candidate.id !== action.playerId && totalResources(candidate) > 0)
            ? 'ROBBER_STEAL'
            : isMerchantsAndBarbarians(state) ? 'MERCHANTS_BARBARIAN_PLACEMENT'
            : (isPirateIslands(state) || cAndKNoRobberYet || isBarbarianAttack(state)) ? 'TRADE_AND_BUILD' : 'ROBBER_PLACEMENT';
      } else {
        state.turnSubPhase = 'TRADE_AND_BUILD';
        distributeRolledResources(state, total);
        moveDesertDragons(state, total);
      }
      if (barbarianAttackPending && total !== 7) state.turnSubPhase = 'BARBARIAN_LOSS';
      if (isCitiesKnights(state)) {
        const citiesKnights = ensureCitiesKnightsState(state);
        state.players.filter(candidate => candidate.isBot).forEach(bot => {
          while ((bot.progressCards || []).length > 4) {
            const discarded = bot.progressCards.pop();
            citiesKnights.progressDecks[PROGRESS_TRACK_BY_CARD[discarded]].push(discarded);
          }
        });
        citiesKnights.progressDiscardQueue = state.players.filter(candidate => !candidate.isBot && (candidate.progressCards || []).length > 4).map(candidate => candidate.id);
        if (citiesKnights.progressDiscardQueue.length) state.turnSubPhase = 'PROGRESS_DISCARD';
      }
      break;
    }
    case 'END_TURN':
      if (state.gamePhase === 'SETUP_ROUND_1') {
        if (state.currentPlayerIndex < state.players.length - 1) state.currentPlayerIndex += 1;
        else state.gamePhase = 'SETUP_ROUND_2';
      } else if (state.gamePhase === 'SETUP_ROUND_2') {
        if (state.currentPlayerIndex > 0) state.currentPlayerIndex -= 1;
        else if (['CLOTH_FOR_CATAN', 'INTO_THE_UNKNOWN'].includes(state.selectedScenario)) state.gamePhase = 'SETUP_ROUND_3';
        else state.gamePhase = 'MAIN_GAME';
      } else if (state.gamePhase === 'SETUP_ROUND_3') {
        if (state.currentPlayerIndex < state.players.length - 1) state.currentPlayerIndex += 1;
        else { state.currentPlayerIndex = 0; state.gamePhase = 'MAIN_GAME'; }
      } else {
        state.currentPlayerIndex = ((state.currentPlayerIndex || 0) + 1) % state.players.length;
      }
      state.turnSubPhase = 'BEFORE_ROLL';
      state.setupState = { hasPlacedSettlement: false, hasPlacedRoad: false };
      state.hasMovedShipThisTurn = false;
      state.currentTurnBuiltShips = [];
      state.players[state.currentPlayerIndex].goldTradesThisTurn = 0;
      state.players[state.currentPlayerIndex].playedDevCardThisTurn = false;
      state.players[state.currentPlayerIndex].boughtDevCardsThisTurn = {};
      if (isBarbarianAttack(state) && state.scenarioState?.kind === 'BARBARIAN_ATTACK') {
        state.scenarioState.knights.forEach(knight => {
          if (knight.ownerPlayerId === state.players[state.currentPlayerIndex].id) knight.movedThisTurn = false;
        });
      }
      (state.vertices || []).forEach(vertex => { if (vertex.knight) vertex.knight.promotedThisTurn = false; });
      (state.players || []).forEach(candidate => { candidate.cityImprovementDiscount = 0; candidate.freeKnightPromotions = 0; delete candidate.merchantFleetResource; });
      break;
    case 'DISCARD_CARDS':
      Object.entries(action.resourcesToDiscard).forEach(([key, amount]) => { player.resources[key] -= amount; });
      returnToBank(action.resourcesToDiscard);
      Object.entries(action.commoditiesToDiscard || {}).forEach(([key, amount]) => {
        player.commodities[key] -= amount;
        state.commodityBank[key] += amount;
      });
      if (state.turnSubPhase === 'SABOTEUR_DISCARD') {
        const citiesKnights = ensureCitiesKnightsState(state);
        citiesKnights.sabotageDiscardQueue.shift();
        if (!citiesKnights.sabotageDiscardQueue.length) state.turnSubPhase = 'TRADE_AND_BUILD';
        break;
      }
      if (!state.players.some(candidate => totalHandCards(state, candidate) > handLimit(state, candidate))) {
        const cAndKNoRobberYet = isCitiesKnights(state) && !ensureCitiesKnightsState(state).hasBarbarianAttacked;
        state.turnSubPhase = isPirateIslands(state) && state.players.some(candidate => candidate.id !== action.playerId && totalResources(candidate) > 0)
          ? 'ROBBER_STEAL'
          : isMerchantsAndBarbarians(state) ? 'MERCHANTS_BARBARIAN_PLACEMENT'
          : (isPirateIslands(state) || cAndKNoRobberYet || isBarbarianAttack(state)) ? 'TRADE_AND_BUILD' : 'ROBBER_PLACEMENT';
      }
      break;
    case 'GIVE_PROGRESS_CARDS': {
      const citiesKnights = ensureCitiesKnightsState(state);
      const recipient = state.players.find(candidate => candidate.id === action.targetPlayerId);
      Object.entries(action.resourcesToGive).forEach(([resource, amount]) => {
        player.resources[resource] -= amount;
        recipient.resources[resource] += amount;
      });
      Object.entries(action.commoditiesToGive || {}).forEach(([commodity, amount]) => {
        player.commodities[commodity] -= amount;
        recipient.commodities[commodity] += amount;
      });
      if (state.turnSubPhase === 'WEDDING_GIVE') {
        citiesKnights.weddingGiveQueue.shift();
        if (!citiesKnights.weddingGiveQueue.length) state.turnSubPhase = 'TRADE_AND_BUILD';
      } else if (state.turnSubPhase === 'COMMERCIAL_HARBOR_GIVE') {
        const category = Object.values(action.resourcesToGive).some(amount => amount > 0) ? 'RESOURCE' : 'COMMODITY';
        citiesKnights.commercialHarborOffer = { playerId: action.targetPlayerId, recipientId: action.playerId, category };
        state.turnSubPhase = 'COMMERCIAL_HARBOR_RETURN';
      } else if (state.turnSubPhase === 'COMMERCIAL_HARBOR_RETURN') {
        citiesKnights.commercialHarborQueue.shift();
        delete citiesKnights.commercialHarborOffer;
        state.turnSubPhase = citiesKnights.commercialHarborQueue.length ? 'COMMERCIAL_HARBOR_GIVE' : 'TRADE_AND_BUILD';
      }
      break;
    }
    case 'BUILD_SETTLEMENT':
      Object.assign(state.vertices.find(vertex => vertex.id === action.vertexId), { structure: 'SETTLEMENT', playerId: action.playerId });
      if (isRiversOfCatan(state) && incidentEdges(state, action.vertexId).some(edge => edge.isRiverCrossing || edge.isRiverBank)) {
        state.goldCoins[action.playerId] = (state.goldCoins[action.playerId] || 0) + 1;
      }
      if (String(state.gamePhase).startsWith('SETUP_')) {
        state.setupState = { ...(state.setupState || {}), hasPlacedSettlement: true, lastSettlementVertexId: action.vertexId };
        const islandIds = vertexIslandIds(state, action.vertexId);
        if (islandIds.length) {
          player.homeIslandId ??= islandIds[0];
          player.homeIslandIds = [...new Set([...(player.homeIslandIds || []), ...islandIds])];
        }
      }
      if (state.gamePhase === 'SETUP_ROUND_3' || (state.gamePhase === 'SETUP_ROUND_2' && state.selectedScenario !== 'INTO_THE_UNKNOWN')) {
        if (state.selectedScenario !== 'INTO_THE_UNKNOWN') {
          (state.tiles || []).filter(tile => tileVertexIds(tile).includes(action.vertexId) && RESOURCE_TYPES.includes(tile.type))
            .forEach(tile => {
              if ((state.resourceBank[tile.type] || 0) > 0) {
                player.resources[tile.type] += 1;
                state.resourceBank[tile.type] -= 1;
              }
            });
        }
        if (isFishermen(state)) {
          (state.tiles || []).filter(tile => tileVertexIds(tile).includes(action.vertexId) && ['FISHING_GROUND', 'LAKE'].includes(tile.type))
            .forEach(() => {
              if ((player.fishTokens || []).length >= 7) return;
              const drawn = drawFishermenToken(state);
              if (drawn === 'OLD_BOOT') player.hasOldBoot = true;
              else if (drawn !== undefined) {
                player.fishTokens = [...(player.fishTokens || []), drawn];
                player.fishCount = player.fishTokens.reduce((total, token) => total + token, 0);
              }
            });
        }
      }
      if (!String(state.gamePhase).startsWith('SETUP_')) {
        player.victoryPoints = (player.victoryPoints || 0) + 1;
        spend({ WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 });
        returnToBank({ WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 });
        if (player.unplacedHarbors?.length && eligibleHarborEdges(state, action.playerId).length > 0) {
          player.harborReturnSubPhase = 'TRADE_AND_BUILD';
          state.turnSubPhase = 'HARBOR_PLACEMENT';
        }
        if (state.selectedScenario === 'TREASURE_ISLANDS') {
          const homeIslands = player.homeIslandIds?.length ? player.homeIslandIds : [player.homeIslandId];
          const foreignIslandIds = vertexIslandIds(state, action.vertexId).filter(id => !homeIslands.includes(id));
          const newIslandId = foreignIslandIds.find(id => !(player.treasureIslandIds || []).includes(id));
          if (newIslandId !== undefined) {
            player.treasureIslandIds = [...(player.treasureIslandIds || []), newIslandId];
            player.victoryPoints += 1;
          }
        }
        addDesertDragons(state);
        if (isCaravanRoute(state) && state.scenarioState?.remainingCamels > 0) state.scenarioState.pendingCaravanVote = { initiatedByPlayerId: action.playerId, votesByPlayerId: {} };
        if (isBarbarianAttack(state)) action.barbarianAttackRolls = resolveBarbarianInvasion(state, action.playerId);
      }
      break;
    case 'BUILD_CITY':
      if ((isCitiesKnights(state) || isMerchantsAndBarbarians(state)) && state.gamePhase === 'SETUP_ROUND_2') {
        Object.assign(state.vertices.find(vertex => vertex.id === action.vertexId), { structure: 'CITY', playerId: action.playerId });
        state.setupState = { ...(state.setupState || {}), hasPlacedSettlement: true, lastSettlementVertexId: action.vertexId };
        const islandIds = vertexIslandIds(state, action.vertexId);
        if (islandIds.length) {
          player.homeIslandId ??= islandIds[0];
          player.homeIslandIds = [...new Set([...(player.homeIslandIds || []), ...islandIds])];
        }
        (state.tiles || []).filter(tile => tileVertexIds(tile).includes(action.vertexId) && RESOURCE_TYPES.includes(tile.type))
          .forEach(tile => {
            if ((state.resourceBank[tile.type] || 0) > 0) {
              player.resources[tile.type] += 1;
              state.resourceBank[tile.type] -= 1;
            }
          });
        if (isMerchantsAndBarbarians(state)) {
          player.wagonPosition = action.vertexId;
          player.wagonLevel = 1;
          player.remainingMovementPoints = 4;
        }
      } else {
        state.vertices.find(vertex => vertex.id === action.vertexId).structure = 'CITY';
        player.victoryPoints = (player.victoryPoints || 0) + 1;
        spend({ WHEAT: 2, ORE: 3 });
        returnToBank({ WHEAT: 2, ORE: 3 });
        addDesertDragons(state);
        if (isCaravanRoute(state) && state.scenarioState?.remainingCamels > 0) state.scenarioState.pendingCaravanVote = { initiatedByPlayerId: action.playerId, votesByPlayerId: {} };
        if (isBarbarianAttack(state)) action.barbarianAttackRolls = resolveBarbarianInvasion(state, action.playerId);
      }
      break;
    case 'BUILD_ROAD': {
      const edge = state.edges.find(candidate => candidate.id === action.edgeId);
      Object.assign(edge, { hasRoad: true, playerId: action.playerId });
      const freeRoad = (state.roadBuildingRemaining || 0) > 0 || (state.diplomatRoadBuildingRemaining || 0) > 0;
      if (!String(state.gamePhase).startsWith('SETUP_') && !freeRoad) {
        spend({ WOOD: 1, BRICK: 1 });
        returnToBank({ WOOD: 1, BRICK: 1 });
      }
      if (state.diplomatRoadBuildingRemaining > 0) state.diplomatRoadBuildingRemaining -= 1;
      else if (state.roadBuildingRemaining > 0) state.roadBuildingRemaining -= 1;
      if (String(state.gamePhase).startsWith('SETUP_')) state.setupState = { ...(state.setupState || {}), hasPlacedRoad: true };
      if (isRiversOfCatan(state) && edge.isRiverBank) state.goldCoins[action.playerId] = (state.goldCoins[action.playerId] || 0) + 1;
      break;
    }
    case 'BUILD_SHIP': {
      const edge = state.edges.find(candidate => candidate.id === action.edgeId);
      const reward = edge.lostTribeReward && !edge.lostTribeReward.collectedBy ? edge.lostTribeReward : null;
      Object.assign(edge, { hasShip: true, shipPlayerId: action.playerId });
      if (!String(state.gamePhase).startsWith('SETUP_') && !(state.roadBuildingRemaining > 0)) {
        spend({ WOOD: 1, SHEEP: 1 });
        returnToBank({ WOOD: 1, SHEEP: 1 });
      }
      if (state.roadBuildingRemaining > 0) state.roadBuildingRemaining -= 1;
      if (String(state.gamePhase).startsWith('SETUP_')) state.setupState = { ...(state.setupState || {}), hasPlacedRoad: true };
      else state.currentTurnBuiltShips = [...(state.currentTurnBuiltShips || []), action.edgeId];
      if (reward && !String(state.gamePhase).startsWith('SETUP_')) {
        reward.collectedBy = action.playerId;
        if (reward.kind === 'VICTORY_POINT') player.victoryPoints = (player.victoryPoints || 0) + 1;
        if (reward.kind === 'DEV_CARD' && reward.devCardType) {
          player.developmentCards[reward.devCardType] = (player.developmentCards[reward.devCardType] || 0) + 1;
          if (reward.devCardType !== 'VICTORY_POINT') {
            player.boughtDevCardsThisTurn ||= {};
            player.boughtDevCardsThisTurn[reward.devCardType] = (player.boughtDevCardsThisTurn[reward.devCardType] || 0) + 1;
          }
        }
        if (reward.kind === 'HARBOR' && reward.harborType) {
          player.unplacedHarbors = [...(player.unplacedHarbors || []), reward.harborType];
          if (eligibleHarborEdges(state, action.playerId).length > 0) {
            player.harborReturnSubPhase = state.turnSubPhase === 'BEFORE_ROLL' ? 'BEFORE_ROLL' : 'TRADE_AND_BUILD';
            state.turnSubPhase = 'HARBOR_PLACEMENT';
          }
        }
      }
      if (state.selectedScenario === 'CLOTH_FOR_CATAN') {
        const connectedIds = reachedLostTribeVillageIds(state, action.playerId);
        const newIds = connectedIds.filter(id => !(player.lostTribeVillageIds || []).includes(id));
        newIds.forEach(id => {
          const village = lostTribeVillages(state).find(candidate => candidate.id === id);
          if (!village) return;
          const stored = village.tile.lostTribeVillages.find(entry => entry.id === id);
          stored.connectedPlayerIds = [...new Set([...(stored.connectedPlayerIds || []), action.playerId])];
          if (stored.clothRemaining > 0) { stored.clothRemaining -= 1; player.clothRolls = (player.clothRolls || 0) + 1; }
        });
        player.lostTribeVillageIds = [...new Set([...(player.lostTribeVillageIds || []), ...newIds])];
      }
      break;
    }
    case 'PLACE_HARBOR': {
      const edge = state.edges.find(candidate => candidate.id === action.edgeId);
      const harborType = player.unplacedHarbors[0];
      Object.assign(edge, { isHarbor: true, harborType });
      edgeEndpoints(edge).forEach(vertexId => {
        const vertex = state.vertices.find(candidate => candidate.id === vertexId);
        if (vertex) Object.assign(vertex, { isHarbor: true, harborType });
      });
      player.unplacedHarbors = player.unplacedHarbors.slice(1);
      if (player.unplacedHarbors.length > 0 && eligibleHarborEdges(state, action.playerId).length > 0) {
        state.turnSubPhase = 'HARBOR_PLACEMENT';
      } else {
        state.turnSubPhase = player.harborReturnSubPhase || 'TRADE_AND_BUILD';
        delete player.harborReturnSubPhase;
      }
      break;
    }
    case 'RESOLVE_BARBARIAN_CARD': {
      const scenario = state.scenarioState;
      const cardType = scenario.pendingDevelopmentCard.cardType;
      if (cardType === 'KNIGHTHOOD' || cardType === 'STRONG_KNIGHT') {
        scenario.knights.push({ id: `barbarian-knight-${action.playerId}-${scenario.knights.length + 1}`, ownerPlayerId: action.playerId, edgeId: action.edgeId, kind: cardType });
      } else if (cardType === 'INTRIGUE') {
        const index = scenario.barbarians.findIndex(barbarian => barbarian.tileId === action.tileId);
        scenario.barbarians.splice(index, 1);
        scenario.prisonersByPlayerId[action.playerId] = (scenario.prisonersByPlayerId[action.playerId] || 0) + 1;
        refreshBarbarianCaptures(state);
      } else if (cardType === 'TREASON') {
        action.sourceTileIds.forEach((tileId, index) => {
          const barbarianIndex = scenario.barbarians.findIndex(barbarian => barbarian.tileId === tileId);
          const [barbarian] = scenario.barbarians.splice(barbarianIndex, 1);
          barbarian.tileId = action.targetTileIds[index];
          scenario.barbarians.push(barbarian);
        });
        state.goldCoins ||= {};
        state.goldCoins[action.playerId] = (state.goldCoins[action.playerId] || 0) + 2;
        refreshBarbarianCaptures(state);
      }
      state.devCardDeck.push(cardType);
      delete scenario.pendingDevelopmentCard;
      break;
    }
    case 'MOVE_BARBARIAN_KNIGHT': {
      const knight = state.scenarioState.knights.find(candidate => candidate.id === action.knightId);
      knight.edgeId = action.edgeId;
      knight.movedThisTurn = true;
      if (action.payWheat) {
        player.resources.WHEAT -= 1;
        state.resourceBank.WHEAT += 1;
      }
      action.barbarianPrisonerAwards = resolveBarbarianVictories(state);
      break;
    }
    case 'BUY_DEV_CARD':
      spend({ SHEEP: 1, WHEAT: 1, ORE: 1 });
      returnToBank({ SHEEP: 1, WHEAT: 1, ORE: 1 });
      state.devCardDeck.shift();
      if (isBarbarianAttack(state) && BARBARIAN_ATTACK_CARD_TYPES.has(action.cardType)) {
        state.scenarioState.pendingDevelopmentCard = { playerId: action.playerId, cardType: action.cardType };
      } else {
        player.developmentCards[action.cardType] = (player.developmentCards[action.cardType] || 0) + 1;
      }
      break;
    case 'PLAY_DEV_CARD':
      player.developmentCards[action.cardType] -= 1;
      player.playedDevCardThisTurn = true;
      if (action.cardType === 'KNIGHT' || (isPirateIslands(state) && action.cardType === 'VICTORY_POINT')) {
        if (state.selectedScenario === 'DESERT_DRAGONS') {
          const dragonTile = state.tiles.find(tile => tile.islandId === 1 && tile.type !== 'DESERT' && (tile.scenarioMarker?.dragonIds || []).length);
          dragonTile.scenarioMarker.dragonIds.pop();
          if (!dragonTile.scenarioMarker.dragonIds.length) delete dragonTile.scenarioMarker.dragonIds;
          break;
        }
        if (isPirateIslands(state)) {
          const ship = pirateShippingLine(state, action.playerId)?.find(edge => !edge.isWarship);
          ship.isWarship = true;
          break;
        }
        player.knightsPlayed = (player.knightsPlayed || 0) + 1;
        player.devCardReturnSubPhase = state.turnSubPhase === 'BEFORE_ROLL' ? 'BEFORE_ROLL' : 'TRADE_AND_BUILD';
        state.turnSubPhase = 'ROBBER_PLACEMENT';
      } else if (action.cardType === 'ROAD_BUILDING') {
        state.roadBuildingRemaining = 2;
      } else if (action.cardType === 'YEAR_OF_PLENTY') {
        action.data.resources.forEach(resource => {
          player.resources[resource] += 1;
          state.resourceBank[resource] -= 1;
        });
      } else if (action.cardType === 'MONOPOLY') {
        const resource = action.data.resource;
        state.players.forEach(candidate => {
          if (candidate.id === action.playerId) return;
          const amount = candidate.resources[resource] || 0;
          candidate.resources[resource] = 0;
          player.resources[resource] += amount;
        });
      }
      break;
    case 'MOVE_ROBBER': {
      const robberType = action.robberType || 'ROBBER';
      state.tiles.forEach(tile => {
        if (robberType === 'PIRATE') tile.hasPirate = tile.id === action.tileId;
        else tile.hasRobber = tile.id === action.tileId;
      });
      state.pendingRobberType = robberType;
      const targetTile = state.tiles.find(tile => tile.id === action.tileId);
      state.eligibleStealPlayerIds = getEligibleVictimIds(state, action.playerId, targetTile, robberType);
      if (state.eligibleStealPlayerIds.length > 0) state.turnSubPhase = 'ROBBER_STEAL';
      else {
        state.turnSubPhase = player.devCardReturnSubPhase || 'TRADE_AND_BUILD';
        delete player.devCardReturnSubPhase;
        delete state.pendingRobberType;
      }
      break;
    }
    case 'STEAL_RESOURCE': {
      const victim = state.players.find(candidate => candidate.id === action.victimPlayerId);
      if (action.stolenResource === 'CLOTH') {
        victim.clothRolls -= 1;
        player.clothRolls = (player.clothRolls || 0) + 1;
      } else if (COMMODITY_TYPES.includes(action.stolenResource)) {
        victim.commodities[action.stolenResource] -= 1;
        player.commodities[action.stolenResource] += 1;
      } else {
        victim.resources[action.stolenResource] -= 1;
        player.resources[action.stolenResource] += 1;
      }
      state.eligibleStealPlayerIds = [];
      delete state.pendingRobberType;
      state.turnSubPhase = player.devCardReturnSubPhase || 'TRADE_AND_BUILD';
      delete player.devCardReturnSubPhase;
      break;
    }
    case 'BANK_TRADE':
      player.resources[action.offeredResource] -= action.ratio;
      player.resources[action.requestedResource] += 1;
      state.resourceBank[action.offeredResource] += action.ratio;
      state.resourceBank[action.requestedResource] -= 1;
      break;
    case 'EXECUTE_PLAYER_TRADE': {
      const target = state.players.find(candidate => candidate.id === action.targetPlayerId);
      Object.entries(action.offer).forEach(([resource, amount]) => {
        player.resources[resource] -= amount;
        target.resources[resource] += amount;
      });
      Object.entries(action.request).forEach(([resource, amount]) => {
        target.resources[resource] -= amount;
        player.resources[resource] += amount;
      });
      break;
    }
    case 'GOLD_TRADE':
      state.goldCoins[action.playerId] -= 2;
      player.resources[action.requestedResource] += 1;
      player.goldTradesThisTurn = (player.goldTradesThisTurn || 0) + 1;
      state.resourceBank[action.requestedResource] -= 1;
      break;
    case 'SELECT_GOLD_RESOURCE':
      player.resources[action.resource] += 1;
      state.resourceBank[action.resource] -= 1;
      if (Array.isArray(state.goldSelectionQueue) && state.goldSelectionQueue.length > 0) {
        const [pending, ...remaining] = state.goldSelectionQueue;
        state.goldSelectionQueue = pending.amount > 1
          ? [{ ...pending, amount: pending.amount - 1 }, ...remaining]
          : remaining;
        if (state.goldSelectionQueue.length === 0) state.turnSubPhase = 'TRADE_AND_BUILD';
      }
      break;
    case 'MOVE_SHIP': {
      const source = state.edges.find(edge => edge.id === action.fromEdgeId);
      const target = state.edges.find(edge => edge.id === action.toEdgeId);
      const reward = target.lostTribeReward && !target.lostTribeReward.collectedBy ? target.lostTribeReward : null;
      Object.assign(source, { hasShip: false, shipPlayerId: null });
      Object.assign(target, { hasShip: true, shipPlayerId: action.playerId });
      state.hasMovedShipThisTurn = true;
      if (reward) {
        reward.collectedBy = action.playerId;
        if (reward.kind === 'VICTORY_POINT') player.victoryPoints = (player.victoryPoints || 0) + 1;
        if (reward.kind === 'DEV_CARD' && reward.devCardType) {
          player.developmentCards[reward.devCardType] = (player.developmentCards[reward.devCardType] || 0) + 1;
          if (reward.devCardType !== 'VICTORY_POINT') {
            player.boughtDevCardsThisTurn ||= {};
            player.boughtDevCardsThisTurn[reward.devCardType] = (player.boughtDevCardsThisTurn[reward.devCardType] || 0) + 1;
          }
        }
        if (reward.kind === 'HARBOR' && reward.harborType) {
          player.unplacedHarbors = [...(player.unplacedHarbors || []), reward.harborType];
          if (eligibleHarborEdges(state, action.playerId).length > 0) {
            player.harborReturnSubPhase = 'TRADE_AND_BUILD';
            state.turnSubPhase = 'HARBOR_PLACEMENT';
          }
        }
      }
      if (state.selectedScenario === 'CLOTH_FOR_CATAN') {
        const connectedIds = reachedLostTribeVillageIds(state, action.playerId);
        const newIds = connectedIds.filter(id => !(player.lostTribeVillageIds || []).includes(id));
        newIds.forEach(id => {
          const village = lostTribeVillages(state).find(candidate => candidate.id === id);
          const stored = village?.tile.lostTribeVillages.find(entry => entry.id === id);
          if (!stored) return;
          stored.connectedPlayerIds = [...new Set([...(stored.connectedPlayerIds || []), action.playerId])];
          if (stored.clothRemaining > 0) { stored.clothRemaining -= 1; player.clothRolls = (player.clothRolls || 0) + 1; }
        });
        player.lostTribeVillageIds = [...new Set([...(player.lostTribeVillageIds || []), ...newIds])];
      }
      break;
    }
    case 'DISCOVER_FOG': {
      const tile = state.tiles.find(candidate => candidate.id === action.tileId);
      const revealedType = tile.originalType || 'WOOD';
      tile.type = revealedType;
      tile.numberToken = tile.originalNumberToken ?? null;
      tile.revealed = true;
      tile.isFog = false;
      if (revealedType === 'GOLD_FIELD') {
        state.goldSelectionQueue = [...(state.goldSelectionQueue || []), { playerId: action.playerId, amount: 1, tileId: tile.id }];
        state.turnSubPhase = 'GOLD_RESOURCE_SELECTION';
      } else if (RESOURCE_TYPES.includes(revealedType) && (state.resourceBank?.[revealedType] || 0) > 0) {
        player.resources[revealedType] += 1;
        state.resourceBank[revealedType] -= 1;
      }
      break;
    }
    case 'ATTACK_PIRATE_FORTRESS': {
      const fortress = state.vertices.find(vertex => vertex.id === action.fortressVertexId);
      const path = pirateShipPath(state, action.playerId);
      const warships = path.filter(edge => edge.isWarship);
      if (warships.length > action.fortressPower) {
        fortress.pirateFortress.remainingTokens -= 1;
        if (fortress.pirateFortress.remainingTokens === 0) {
          fortress.pirateFortress.conquered = true;
          fortress.structure = 'SETTLEMENT';
          fortress.playerId = action.playerId;
          player.victoryPoints = (player.victoryPoints || 0) + 1;
        }
        action.fortressOutcome = fortress.pirateFortress.conquered ? 'CONQUERED' : 'WON';
        action.shipsLost = 0;
      } else {
        const shipsToRemove = warships.length === action.fortressPower ? 1 : 2;
        const shipIds = path.slice(-shipsToRemove).map(edge => edge.id);
        state.edges.forEach(edge => {
          if (shipIds.includes(edge.id)) Object.assign(edge, { hasShip: false, shipPlayerId: null, isWarship: false });
        });
        action.fortressOutcome = warships.length === action.fortressPower ? 'TIED' : 'LOST';
        action.shipsLost = shipIds.length;
      }
      if (state.vertices.some(vertex => vertex.pirateFortress) && state.vertices.filter(vertex => vertex.pirateFortress).every(vertex => vertex.pirateFortress.conquered)) {
        state.tiles.forEach(tile => { tile.hasPirate = false; });
      }
      advanceTurn(state);
      break;
    }
    case 'MOVE_WAGON':
      if (action.wheatBoost) {
        player.resources.WHEAT -= 1;
        state.resourceBank.WHEAT += 1;
        player.remainingMovementPoints += 2;
        player.wagonWheatBoostUsed = true;
      }
      {
        const traversed = incidentEdges(state, player.wagonPosition).find(edge => edgeEndpoints(edge).includes(action.targetVertexId));
        if (traversed?.hasRoad && traversed.playerId && traversed.playerId !== action.playerId) {
          state.goldCoins[action.playerId] -= 1;
          state.goldCoins[traversed.playerId] = (state.goldCoins[traversed.playerId] || 0) + 1;
        }
      }
      player.wagonPosition = action.targetVertexId;
      player.remainingMovementPoints -= action.movementCost;
      if (resolveWagonArrival(state, player, wagonTargetAtVertex(state, action.targetVertexId))) player.remainingMovementPoints = 0;
      break;
    case 'UPGRADE_WAGON':
      if (action.payment === 'RESOURCES') {
        spend({ WOOD: 1, ORE: 1 });
        returnToBank({ WOOD: 1, ORE: 1 });
      }
      else state.goldCoins[action.playerId] -= 3;
      player.wagonLevel = action.newLevel;
      player.remainingMovementPoints = Math.max(player.remainingMovementPoints || 0, wagonMaxMovement(action.newLevel));
      if (action.newLevel === 5) player.wagonLevelScoreModifier = 1;
      break;
    case 'PLACE_MERCHANTS_BARBARIAN': {
      state.scenarioState.barbarianEdgeIds.push(action.edgeId);
      const roadOwnerId = state.edges.find(edge => edge.id === action.edgeId)?.playerId;
      if (roadOwnerId && roadOwnerId !== action.playerId) {
        const target = state.players.find(candidate => candidate.id === roadOwnerId);
        const available = RESOURCE_TYPES.filter(resource => (target?.resources?.[resource] || 0) > 0);
        if (target && available.length) {
          const stolen = available[Math.floor(Math.random() * available.length)];
          target.resources[stolen] -= 1;
          player.resources[stolen] += 1;
        }
      }
      state.turnSubPhase = 'TRADE_AND_BUILD';
      break;
    }
    case 'BUILD_BRIDGE': {
      const edge = state.edges.find(candidate => candidate.id === action.edgeId);
      edge.bridgePlayerId = action.playerId;
      spend({ WOOD: 1, BRICK: 2 });
      returnToBank({ WOOD: 1, BRICK: 2 });
      state.goldCoins[action.playerId] = (state.goldCoins[action.playerId] || 0) + 3;
      break;
    }
    case 'CAST_CARAVAN_VOTE': {
      state.scenarioState.pendingCaravanVote.votesByPlayerId[action.playerId] = action.cards;
      const required = humanCaravanVoterIds(state);
      if (required.every(playerId => Object.hasOwn(state.scenarioState.pendingCaravanVote.votesByPlayerId, playerId))) settleCaravanVote(state);
      break;
    }
    case 'CHOOSE_CARAVAN_TIE_LOCATION': {
      const tie = state.scenarioState.pendingCamelTie;
      tie.choicesByPlayerId[action.playerId] = action.edgeId;
      if (tie.playerIds.every(playerId => Object.hasOwn(tie.choicesByPlayerId, playerId))) {
        const choices = Object.values(tie.choicesByPlayerId);
        if (new Set(choices).size === 1) placeCaravanCamel(state, choices[0]);
        delete state.scenarioState.pendingCamelTie;
      }
      break;
    }
    case 'PLACE_CARAVAN_CAMEL': {
      placeCaravanCamel(state, action.edgeId);
      delete state.scenarioState.pendingCamelPlayerId;
      break;
    }
    case 'SPEND_FISH_ACTION': {
      const cost = FISH_ACTION_COSTS[action.actionType];
      const payment = findFishPayment(player.fishTokens || [], cost);
      const paidIndexes = new Set(payment);
      const paidTokens = player.fishTokens.filter((_, index) => paidIndexes.has(index));
      player.fishTokens = player.fishTokens.filter((_, index) => !paidIndexes.has(index));
      player.fishCount = player.fishTokens.reduce((total, token) => total + token, 0);
      if (state.scenarioState?.kind === 'FISHERMEN_OF_CATAN') state.scenarioState.fishDiscardPile.push(...paidTokens);
      if (action.actionType === 'MOVE_ROBBER') {
        state.tiles.forEach(tile => { tile.hasRobber = false; tile.hasPirate = false; });
      } else if (action.actionType === 'STEAL_CARD') {
        const target = state.players.find(candidate => candidate.id === action.targetPlayerId);
        const available = RESOURCE_TYPES.flatMap(resource => Array.from({ length: target.resources?.[resource] || 0 }, () => resource));
        const stolen = available[Math.floor(Math.random() * available.length)];
        target.resources[stolen] -= 1;
        player.resources[stolen] += 1;
      } else if (action.actionType === 'TAKE_BANK_RESOURCE') {
        player.resources[action.resource] += 1;
        state.resourceBank[action.resource] -= 1;
      } else if (action.actionType === 'FREE_ROAD') {
        state.roadBuildingRemaining = (state.roadBuildingRemaining || 0) + 1;
      } else if (action.actionType === 'FREE_DEV_CARD') {
        const card = state.devCardDeck.shift();
        player.developmentCards[card] = (player.developmentCards[card] || 0) + 1;
      }
      break;
    }
    case 'PASS_OLD_BOOT': {
      const target = state.players.find(candidate => candidate.id === action.targetPlayerId);
      player.hasOldBoot = false;
      target.hasOldBoot = true;
      break;
    }
    case 'BUILD_KNIGHT': {
      const vertex = state.vertices.find(candidate => candidate.id === action.vertexId);
      vertex.knight = { playerId: action.playerId, level: 1, active: false, actedThisTurn: false };
      spend({ SHEEP: 1, ORE: 1 });
      returnToBank({ SHEEP: 1, ORE: 1 });
      break;
    }
    case 'ACTIVATE_KNIGHT': {
      const vertex = state.vertices.find(candidate => candidate.id === action.vertexId);
      vertex.knight = { ...vertex.knight, active: true, actedThisTurn: false };
      spend({ WHEAT: 1 });
      returnToBank({ WHEAT: 1 });
      buildCanalFromKnight(state, action.vertexId);
      break;
    }
    case 'UPGRADE_KNIGHT': {
      const vertex = state.vertices.find(candidate => candidate.id === action.vertexId);
      vertex.knight = { ...vertex.knight, level: vertex.knight.level + 1, promotedThisTurn: true };
      if ((player.freeKnightPromotions || 0) > 0) player.freeKnightPromotions -= 1;
      else { spend({ SHEEP: 1, ORE: 1 }); returnToBank({ SHEEP: 1, ORE: 1 }); }
      break;
    }
    case 'MOVE_KNIGHT': {
      const source = state.vertices.find(candidate => candidate.id === action.fromVertexId);
      const target = state.vertices.find(candidate => candidate.id === action.toVertexId);
      target.knight = { ...source.knight, actedThisTurn: true };
      delete source.knight;
      break;
    }
    case 'EXPEL_PIRATE': {
      const vertex = state.vertices.find(candidate => candidate.id === action.vertexId);
      const tile = state.tiles.find(candidate => candidate.id === action.tileId);
      tile.hasPirate = false;
      vertex.knight = { ...vertex.knight, active: false, actedThisTurn: true };
      break;
    }
    case 'DISPLACE_KNIGHT': {
      const source = state.vertices.find(candidate => candidate.id === action.fromVertexId);
      const target = state.vertices.find(candidate => candidate.id === action.toVertexId);
      const citiesKnights = ensureCitiesKnightsState(state);
      citiesKnights.pendingDisplacedKnight = { ownerId: target.knight.playerId, knight: { ...target.knight }, originVertexId: action.toVertexId };
      target.knight = { ...source.knight, actedThisTurn: true };
      delete source.knight;
      state.turnSubPhase = 'KNIGHT_DISPLACEMENT';
      break;
    }
    case 'RELOCATE_DISPLACED_KNIGHT': {
      const citiesKnights = ensureCitiesKnightsState(state);
      const pending = citiesKnights.pendingDisplacedKnight;
      if (action.toVertexId) state.vertices.find(candidate => candidate.id === action.toVertexId).knight = { ...pending.knight };
      if (pending.relocationMode === 'ENCHANTED_LAND') {
        if (action.toVertexId) state.scenarioState.knightOnIslandByPlayerId[pending.ownerId] = action.toVertexId;
        else delete state.scenarioState.knightOnIslandByPlayerId[pending.ownerId];
      }
      delete citiesKnights.pendingDisplacedKnight;
      state.turnSubPhase = 'TRADE_AND_BUILD';
      break;
    }
    case 'SELECT_DESERTER_KNIGHT': {
      const citiesKnights = ensureCitiesKnightsState(state);
      const vertex = state.vertices.find(candidate => candidate.id === action.vertexId);
      citiesKnights.deserterPending.knight = { ...vertex.knight };
      delete vertex.knight;
      state.turnSubPhase = 'DESERTER_PLACE';
      break;
    }
    case 'PLACE_DESERTER_KNIGHT': {
      const citiesKnights = ensureCitiesKnightsState(state);
      state.vertices.find(candidate => candidate.id === action.vertexId).knight = {
        ...citiesKnights.deserterPending.knight,
        playerId: action.playerId,
        actedThisTurn: false,
      };
      delete citiesKnights.deserterPending;
      state.turnSubPhase = 'TRADE_AND_BUILD';
      break;
    }
    case 'BUILD_CITY_WALL': {
      const vertex = state.vertices.find(candidate => candidate.id === action.vertexId);
      vertex.cityWall = true;
      spend({ BRICK: 2 });
      returnToBank({ BRICK: 2 });
      break;
    }
    case 'UPGRADE_CITY_IMPROVEMENT': {
      const citiesKnights = ensureCitiesKnightsState(state);
      const level = (player.cityImprovements?.[action.track] || 0) + 1;
      const commodity = { SCIENCE: 'PAPER', POLITICS: 'COIN', TRADE: 'CLOTH' }[action.track];
      const cost = Math.max(0, level - (player.cityImprovementDiscount || 0));
      player.commodities[commodity] -= cost;
      state.commodityBank[commodity] += cost;
      player.cityImprovementDiscount = 0;
      player.cityImprovements[action.track] = level;
      const incumbentId = citiesKnights.metropolisOwners[action.track];
      const incumbentLevel = incumbentId ? state.players.find(candidate => candidate.id === incumbentId)?.cityImprovements?.[action.track] || 0 : 0;
      if (level >= 4 && (!incumbentId || level > incumbentLevel)) {
        (state.vertices || []).forEach(vertex => { if (vertex.metropolis === action.track) delete vertex.metropolis; });
        const metropolis = (state.vertices || []).find(vertex => vertex.playerId === action.playerId && vertex.structure === 'CITY');
        if (metropolis) {
          metropolis.metropolis = action.track;
          citiesKnights.metropolisOwners[action.track] = action.playerId;
          if (!incumbentId) player.victoryPoints = (player.victoryPoints || 0) + 2;
          else {
            const incumbent = state.players.find(candidate => candidate.id === incumbentId);
            if (incumbent) incumbent.victoryPoints = Math.max(0, (incumbent.victoryPoints || 0) - 2);
            player.victoryPoints = (player.victoryPoints || 0) + 2;
          }
        }
      }
      break;
    }
    case 'DOWNGRADE_CITY': {
      const citiesKnights = ensureCitiesKnightsState(state);
      const vertex = state.vertices.find(candidate => candidate.id === action.vertexId);
      vertex.structure = 'SETTLEMENT';
      vertex.cityWall = false;
      player.victoryPoints = Math.max(0, (player.victoryPoints || 0) - 1);
      citiesKnights.barbarianLossQueue.shift();
      if (citiesKnights.barbarianLossQueue.length === 0) state.turnSubPhase = 'TRADE_AND_BUILD';
      break;
    }
    case 'PLAY_PROGRESS_CARD': {
      const citiesKnights = ensureCitiesKnightsState(state);
      player.progressCards.splice(player.progressCards.indexOf(action.cardId), 1);
      citiesKnights.progressDecks[PROGRESS_TRACK_BY_CARD[action.cardId]].push(action.cardId);
      if (action.cardId === 'WARLORD') {
        state.vertices.forEach(vertex => {
          if (vertex.knight?.playerId === action.playerId && !vertex.knight.active) vertex.knight = { ...vertex.knight, active: true, actedThisTurn: false };
        });
      }
      if (action.cardId === 'ROAD_BUILDING') state.roadBuildingRemaining = (state.roadBuildingRemaining || 0) + 2;
      if (action.cardId === 'ALCHEMIST') {
        player.alchemistDice = action.data.diceValues;
        player.alchemistEventDie = action.data.eventDie;
      }
      if (action.cardId === 'INVENTOR') {
        const tileA = state.tiles.find(tile => tile.id === action.data.tileAId);
        const tileB = state.tiles.find(tile => tile.id === action.data.tileBId);
        [tileA.numberToken, tileB.numberToken] = [tileB.numberToken, tileA.numberToken];
      }
      if (action.cardId === 'RESOURCE_MONOPOLY') {
        const resource = action.data.resource;
        state.players.forEach(candidate => {
          if (candidate.id === action.playerId) return;
          const amount = candidate.resources?.[resource] || 0;
          candidate.resources[resource] -= amount;
          player.resources[resource] += amount;
        });
      }
      if (action.cardId === 'TRADE_MONOPOLY') {
        const commodity = action.data.resource;
        state.players.forEach(candidate => {
          if (candidate.id === action.playerId) return;
          const amount = candidate.commodities?.[commodity] || 0;
          candidate.commodities[commodity] -= amount;
          player.commodities[commodity] += amount;
        });
      }
      if (action.cardId === 'MASTER_MERCHANT') {
        const target = state.players.find(candidate => candidate.id === action.data.targetPlayerId);
        action.data.selectedCards.forEach(card => {
          const field = RESOURCE_TYPES.includes(card) ? 'resources' : 'commodities';
          target[field][card] -= 1;
          player[field][card] += 1;
        });
      }
      if (action.cardId === 'SPY') {
        const target = state.players.find(candidate => candidate.id === action.data.targetPlayerId);
        target.progressCards.splice(target.progressCards.indexOf(action.data.targetCardId), 1);
        player.progressCards.push(action.data.targetCardId);
        if (player.progressCards.length > 4) {
          citiesKnights.progressDiscardQueue = [action.playerId];
          state.turnSubPhase = 'PROGRESS_DISCARD';
        }
      }
      if (action.cardId === 'MERCHANT') {
        const tile = state.tiles.find(candidate => candidate.id === action.data.tileId);
        const previousMerchant = citiesKnights.merchant;
        if (previousMerchant?.playerId !== action.playerId) {
          if (previousMerchant?.playerId) {
            const previousOwner = state.players.find(candidate => candidate.id === previousMerchant.playerId);
            if (previousOwner) previousOwner.victoryPoints = Math.max(0, (previousOwner.victoryPoints || 0) - 1);
          }
          player.victoryPoints = (player.victoryPoints || 0) + 1;
        }
        citiesKnights.merchant = { playerId: action.playerId, resource: tile.type };
      }
      if (action.cardId === 'MERCHANT_FLEET') player.merchantFleetResource = action.data.resource;
      if (action.cardId === 'BISHOP') {
        const tile = state.tiles.find(candidate => candidate.id === action.data.tileId);
        state.tiles.forEach(candidate => { candidate.hasRobber = candidate.id === tile.id; });
        getEligibleVictimIds(state, action.playerId, tile, 'ROBBER').forEach(victimId => {
          const victim = state.players.find(candidate => candidate.id === victimId);
          const available = [
            ...RESOURCE_TYPES.flatMap(resource => Array.from({ length: victim.resources?.[resource] || 0 }, () => resource)),
            ...COMMODITY_TYPES.flatMap(commodity => Array.from({ length: victim.commodities?.[commodity] || 0 }, () => commodity)),
          ];
          const stolen = available[Math.floor(Math.random() * available.length)];
          if (RESOURCE_TYPES.includes(stolen)) { victim.resources[stolen] -= 1; player.resources[stolen] += 1; }
          else if (COMMODITY_TYPES.includes(stolen)) { victim.commodities[stolen] -= 1; player.commodities[stolen] += 1; }
        });
      }
      if (action.cardId === 'SABOTEUR') {
        const highestPoints = Math.max(...state.players.filter(candidate => candidate.id !== action.playerId).map(candidate => playerTotalVP(state, candidate)));
        const targets = state.players.filter(candidate => candidate.id !== action.playerId && playerTotalVP(state, candidate) === highestPoints && totalHandCards(state, candidate) > 0);
        const queue = [];
        targets.forEach(target => {
          let remaining = Math.floor(totalHandCards(state, target) / 2);
          if (target.isBot) {
            [...RESOURCE_TYPES, ...COMMODITY_TYPES].forEach(card => {
              const field = RESOURCE_TYPES.includes(card) ? 'resources' : 'commodities';
              const amount = Math.min(target[field]?.[card] || 0, remaining);
              target[field][card] -= amount;
              if (field === 'resources') state.resourceBank[card] += amount;
              else state.commodityBank[card] += amount;
              remaining -= amount;
            });
          } else if (remaining > 0) queue.push({ playerId: target.id, amount: remaining });
        });
        citiesKnights.sabotageDiscardQueue = queue;
        if (queue.length) state.turnSubPhase = 'SABOTEUR_DISCARD';
      }
      if (action.cardId === 'DESERTER') {
        const target = state.players.find(candidate => candidate.id === action.data.targetPlayerId);
        citiesKnights.deserterPending = { actorId: action.playerId, targetPlayerId: action.data.targetPlayerId };
        if (target?.isBot) {
          const knightVertex = state.vertices.find(vertex => vertex.knight?.playerId === target.id);
          citiesKnights.deserterPending.knight = { ...knightVertex.knight };
          delete knightVertex.knight;
          state.turnSubPhase = 'DESERTER_PLACE';
        } else state.turnSubPhase = 'DESERTER_SELECT';
      }
      if (action.cardId === 'WEDDING') {
        const queue = [];
        state.players.filter(candidate => candidate.id !== action.playerId && playerTotalVP(state, candidate) > playerTotalVP(state, player))
          .forEach(target => {
            const amount = Math.min(2, totalHandCards(state, target));
            if (!amount) return;
            if (target.isBot) {
              let remaining = amount;
              [...RESOURCE_TYPES, ...COMMODITY_TYPES].forEach(card => {
                const field = RESOURCE_TYPES.includes(card) ? 'resources' : 'commodities';
                const transferred = Math.min(target[field]?.[card] || 0, remaining);
                target[field][card] -= transferred;
                player[field][card] += transferred;
                remaining -= transferred;
              });
            } else queue.push({ playerId: target.id, recipientId: action.playerId, amount });
          });
        citiesKnights.weddingGiveQueue = queue;
        if (queue.length) state.turnSubPhase = 'WEDDING_GIVE';
      }
      if (action.cardId === 'COMMERCIAL_HARBOR') {
        const queue = [];
        state.players.filter(candidate => candidate.id !== action.playerId && totalHandCards(state, candidate) > 0).forEach(target => {
          if (!target.isBot) { queue.push({ playerId: target.id, recipientId: action.playerId }); return; }
          const offered = [...RESOURCE_TYPES, ...COMMODITY_TYPES].find(card => (RESOURCE_TYPES.includes(card) ? target.resources?.[card] : target.commodities?.[card]) > 0);
          const offeredField = RESOURCE_TYPES.includes(offered) ? 'resources' : 'commodities';
          const offeredCategory = RESOURCE_TYPES.includes(offered) ? 'RESOURCE' : 'COMMODITY';
          target[offeredField][offered] -= 1;
          player[offeredField][offered] += 1;
          const returned = (offeredCategory === 'RESOURCE' ? RESOURCE_TYPES : COMMODITY_TYPES).find(card => player[offeredField]?.[card] > 0);
          player[offeredField][returned] -= 1;
          target[offeredField][returned] += 1;
        });
        citiesKnights.commercialHarborQueue = queue;
        if (queue.length) state.turnSubPhase = 'COMMERCIAL_HARBOR_GIVE';
      }
      if (action.cardId === 'DIPLOMAT') {
        const edge = state.edges.find(candidate => candidate.id === action.data.targetEdgeId);
        edge.hasRoad = false;
        edge.playerId = null;
        state.diplomatRoadBuildingRemaining = (state.diplomatRoadBuildingRemaining || 0) + 1;
      }
      if (action.cardId === 'INTRIGUE') {
        const target = state.vertices.find(candidate => candidate.id === action.data.targetVertexId);
        citiesKnights.pendingDisplacedKnight = { ownerId: target.knight.playerId, knight: { ...target.knight }, originVertexId: target.id };
        delete target.knight;
        state.turnSubPhase = 'KNIGHT_DISPLACEMENT';
      }
      if (action.cardId === 'CRANE') player.cityImprovementDiscount = 1;
      if (action.cardId === 'SMITH') player.freeKnightPromotions = (player.freeKnightPromotions || 0) + 2;
      if (action.cardId === 'ENGINEER') state.vertices.find(vertex => vertex.id === action.data.vertexId).cityWall = true;
      if (action.cardId === 'IRRIGATION' || action.cardId === 'MINING') {
        const resource = action.cardId === 'IRRIGATION' ? 'WHEAT' : 'ORE';
        let amount = terrainHexesAdjacentToPlayer(state, action.playerId, resource).length * 2;
        amount = Math.min(amount, state.resourceBank[resource] || 0);
        player.resources[resource] += amount;
        state.resourceBank[resource] -= amount;
      }
      if (action.cardId === 'MEDICINE') {
        const vertex = state.vertices.find(candidate => candidate.id === action.data.vertexId);
        vertex.structure = 'CITY';
        player.victoryPoints = (player.victoryPoints || 0) + 1;
        spend({ WHEAT: 1, ORE: 2 });
        returnToBank({ WHEAT: 1, ORE: 2 });
      }
      break;
    }
    case 'DISCARD_PROGRESS_CARD': {
      const citiesKnights = ensureCitiesKnightsState(state);
      player.progressCards.splice(player.progressCards.indexOf(action.cardId), 1);
      citiesKnights.progressDecks[PROGRESS_TRACK_BY_CARD[action.cardId]].push(action.cardId);
      if ((player.progressCards || []).length <= 4) citiesKnights.progressDiscardQueue.shift();
      if (!citiesKnights.progressDiscardQueue.length) state.turnSubPhase = 'TRADE_AND_BUILD';
      break;
    }
    default:
      break;
  }
  syncRiversWealth(state);
  syncCaravanScores(state);
  maybeEndGame(state, action.playerId);
}

module.exports = {
  ACTION_TYPES,
  DEV_CARD_TYPES,
  RESOURCE_TYPES,
  TREASURES_DRAGONS_ADVENTURERS_SCENARIOS,
  applyReservedAction,
  validateActionShape,
  validateGameAction,
  validateResourceMap,
};
