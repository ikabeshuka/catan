const RESOURCE_TYPES = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];
const DEV_CARD_TYPES = ['KNIGHT', 'VICTORY_POINT', 'ROAD_BUILDING', 'YEAR_OF_PLENTY', 'MONOPOLY'];
const ACTION_TYPES = new Set([
  'ROLL_DICE', 'END_TURN', 'DISCARD_CARDS',
  'BUILD_SETTLEMENT', 'BUILD_CITY', 'BUILD_ROAD', 'BUILD_SHIP',
  'BUY_DEV_CARD', 'PLAY_DEV_CARD', 'MOVE_ROBBER', 'STEAL_RESOURCE',
  'PROPOSE_TRADE', 'ACCEPT_TRADE', 'DECLINE_TRADE', 'BANK_TRADE',
  'EXECUTE_PLAYER_TRADE', 'GOLD_TRADE',
  'MOVE_SHIP', 'DISCOVER_FOG', 'SELECT_GOLD_RESOURCE',
  'MOVE_WAGON', 'UPGRADE_WAGON',
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

function validateActionShape(action) {
  if (!isPlainObject(action) || !ACTION_TYPES.has(action.type) || !isId(action.playerId)) {
    return { ok: false, message: 'Invalid game action' };
  }

  const requireId = (key) => isId(action[key]);
  switch (action.type) {
    case 'ROLL_DICE':
      if (!Array.isArray(action.diceValues) || action.diceValues.length !== 2 ||
          !action.diceValues.every(value => Number.isInteger(value) && value >= 1 && value <= 6)) {
        return { ok: false, message: 'Invalid dice values' };
      }
      break;
    case 'DISCARD_CARDS':
      if (!validateResourceMap(action.resourcesToDiscard, { allowEmpty: false })) {
        return { ok: false, message: 'Invalid discard selection' };
      }
      break;
    case 'BUILD_SETTLEMENT':
    case 'BUILD_CITY':
      if (!requireId('vertexId')) return { ok: false, message: 'Invalid vertex' };
      break;
    case 'BUILD_ROAD':
    case 'BUILD_SHIP':
      if (!requireId('edgeId')) return { ok: false, message: 'Invalid edge' };
      break;
    case 'BUY_DEV_CARD':
      if (!DEV_CARD_TYPES.includes(action.cardType)) return { ok: false, message: 'Invalid development card' };
      break;
    case 'PLAY_DEV_CARD':
      if (!DEV_CARD_TYPES.includes(action.cardType) || action.cardType === 'VICTORY_POINT') {
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
      if (!requireId('tileId') || (action.robberType && !['ROBBER', 'PIRATE'].includes(action.robberType))) {
        return { ok: false, message: 'Invalid robber move' };
      }
      break;
    case 'STEAL_RESOURCE':
      if (!requireId('victimPlayerId') || !isResource(action.stolenResource)) {
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
    case 'MOVE_WAGON':
      if (!requireId('targetVertexId') || ![1, 2].includes(action.movementCost)) return { ok: false, message: 'Invalid wagon move' };
      break;
    case 'UPGRADE_WAGON':
      if (![2, 3].includes(action.newLevel) || !['RESOURCES', 'GOLD'].includes(action.payment)) {
        return { ok: false, message: 'Invalid wagon upgrade' };
      }
      break;
    default:
      break;
  }
  return { ok: true };
}

const totalResources = (player) => RESOURCE_TYPES.reduce((sum, key) => sum + (player.resources?.[key] || 0), 0);
const hasResources = (player, cost) => Object.entries(cost).every(([key, amount]) => (player.resources?.[key] || 0) >= amount);
const countPieces = (state, playerId, kind) => {
  if (kind === 'SETTLEMENT' || kind === 'CITY') {
    return (state.vertices || []).filter(vertex => vertex.playerId === playerId && vertex.structure === kind).length;
  }
  if (kind === 'ROAD') return (state.edges || []).filter(edge => edge.playerId === playerId && edge.hasRoad).length;
  return (state.edges || []).filter(edge => edge.shipPlayerId === playerId && edge.hasShip).length;
};
const edgeEndpoints = (edge) => {
  const parts = String(edge?.id || '').replace(/^e_/, '').split('_v_');
  return parts.length === 2 ? [parts[0], `v_${parts[1]}`] : [];
};
const incidentEdges = (state, vertexId) => (state.edges || []).filter(edge => edgeEndpoints(edge).includes(vertexId));
const hasAdjacentStructure = (state, vertexId) => incidentEdges(state, vertexId).some(edge =>
  edgeEndpoints(edge).some(endpoint => endpoint !== vertexId && state.vertices?.some(vertex => vertex.id === endpoint && vertex.structure !== 'NONE'))
);
const networkTouchesTarget = (state, playerId, edge, routeKind, ignoredEdgeId) => edgeEndpoints(edge).some(endpoint => {
  const vertex = state.vertices?.find(candidate => candidate.id === endpoint);
  if (vertex?.structure !== 'NONE' && vertex?.playerId && vertex.playerId !== playerId) return false;
  if (vertex?.playerId === playerId && vertex.structure !== 'NONE') return true;
  return incidentEdges(state, endpoint).some(candidate => {
    if (candidate.id === edge.id || candidate.id === ignoredEdgeId) return false;
    const connectedKind = candidate.hasRoad && candidate.playerId === playerId
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
const tileEdgeIds = (tile) => {
  const vertices = tileVertexIds(tile);
  return vertices.map((vertex, index) => {
    const endpoints = [vertex, vertices[(index + 1) % vertices.length]].sort();
    return `e_${endpoints[0]}_${endpoints[1]}`;
  });
};
const isWaterTile = (tile) => ['WATER', 'SEA', 'FOG'].includes(tile.type);

function validateGameAction(state, action) {
  const shape = validateActionShape(action);
  if (!shape.ok) return shape;
  if (!state || !Array.isArray(state.players)) return { ok: false, message: 'Game state is not ready' };

  const player = state.players.find(candidate => candidate.id === action.playerId);
  if (!player) return { ok: false, message: 'Unknown player' };
  const activePlayer = state.players[state.currentPlayerIndex || 0];
  const isSetup = state.gamePhase === 'SETUP_ROUND_1' || state.gamePhase === 'SETUP_ROUND_2';
  const phaseExceptions = new Set(['DISCARD_CARDS', 'ACCEPT_TRADE', 'DECLINE_TRADE', 'SELECT_GOLD_RESOURCE']);
  if (!phaseExceptions.has(action.type) && activePlayer?.id !== action.playerId) {
    return { ok: false, message: 'It is not this player\'s turn' };
  }

  switch (action.type) {
    case 'ROLL_DICE':
      if (state.gamePhase !== 'MAIN_GAME' || state.turnSubPhase !== 'BEFORE_ROLL') return { ok: false, message: 'Dice cannot be rolled now' };
      break;
    case 'END_TURN':
      if (!isSetup && state.turnSubPhase !== 'TRADE_AND_BUILD') return { ok: false, message: 'Turn cannot end now' };
      if (isSetup && (!state.setupState?.hasPlacedSettlement || !state.setupState?.hasPlacedRoad)) {
        return { ok: false, message: 'Setup placement is incomplete' };
      }
      break;
    case 'DISCARD_CARDS': { 
      if (state.turnSubPhase !== 'DISCARD_PHASE') return { ok: false, message: 'Not in discard phase' };
      const required = Math.floor(totalResources(player) / 2);
      const selected = Object.values(action.resourcesToDiscard).reduce((sum, amount) => sum + amount, 0);
      if (totalResources(player) <= 7 || selected !== required ||
          Object.entries(action.resourcesToDiscard).some(([key, amount]) => amount > (player.resources?.[key] || 0))) {
        return { ok: false, message: 'Exactly half of the hand must be discarded' };
      }
      break;
    }
    case 'BUILD_SETTLEMENT': {
      const vertex = state.vertices?.find(candidate => candidate.id === action.vertexId);
      if (!vertex || vertex.structure !== 'NONE' || countPieces(state, action.playerId, 'SETTLEMENT') >= 5) return { ok: false, message: 'Illegal settlement target' };
      const borderingTiles = (state.tiles || []).filter(tile => tileVertexIds(tile).includes(action.vertexId));
      if (borderingTiles.length === 0 || borderingTiles.every(isWaterTile)) return { ok: false, message: 'Settlement must touch land' };
      if (isSetup && ['HEADING_FOR_NEW_SHORES', 'THROUGH_THE_DESERT'].includes(state.selectedScenario) &&
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
      if (!vertex || vertex.structure !== 'SETTLEMENT' || vertex.playerId !== action.playerId || countPieces(state, action.playerId, 'CITY') >= 4 ||
          state.turnSubPhase !== 'TRADE_AND_BUILD' || !hasResources(player, { WHEAT: 2, ORE: 3 })) {
        return { ok: false, message: 'Illegal city upgrade' };
      }
      break;
    }
    case 'BUILD_ROAD':
    case 'BUILD_SHIP': {
      const edge = state.edges?.find(candidate => candidate.id === action.edgeId);
      const kind = action.type === 'BUILD_ROAD' ? 'ROAD' : 'SHIP';
      const limit = 15;
      const free = (state.roadBuildingRemaining || 0) > 0;
      const cost = kind === 'ROAD' ? { WOOD: 1, BRICK: 1 } : { WOOD: 1, SHEEP: 1 };
      if (!edge || edge.hasRoad || edge.hasShip || countPieces(state, action.playerId, kind) >= limit ||
          (!isSetup && state.turnSubPhase !== 'TRADE_AND_BUILD' && !free) || (!isSetup && !free && !hasResources(player, cost))) {
        return { ok: false, message: `Illegal ${kind.toLowerCase()} placement` };
      }
      const borderingTiles = (state.tiles || []).filter(tile => tileEdgeIds(tile).includes(action.edgeId));
      if (kind === 'SHIP' && !borderingTiles.some(isWaterTile)) return { ok: false, message: 'Ship must be built on water or coast' };
      if (kind === 'ROAD' && !borderingTiles.some(tile => !isWaterTile(tile))) return { ok: false, message: 'Road must be built on land or coast' };
      if (isSetup) {
        if (state.setupState?.hasPlacedRoad || !state.setupState?.lastSettlementVertexId ||
            !edgeEndpoints(edge).includes(state.setupState.lastSettlementVertexId)) {
          return { ok: false, message: 'Setup route must touch the new settlement' };
        }
      } else if (!networkTouchesTarget(state, action.playerId, edge, kind)) {
        return { ok: false, message: `${kind} is not connected to the player network` };
      }
      break;
    }
    case 'BUY_DEV_CARD':
      if (state.turnSubPhase !== 'TRADE_AND_BUILD' || !hasResources(player, { SHEEP: 1, WHEAT: 1, ORE: 1 }) ||
          !Array.isArray(state.devCardDeck) || state.devCardDeck[0] !== action.cardType) {
        return { ok: false, message: 'Development card cannot be bought' };
      }
      break;
    case 'PLAY_DEV_CARD': {
      const available = (player.developmentCards?.[action.cardType] || 0) - (player.boughtDevCardsThisTurn?.[action.cardType] || 0);
      if (!['BEFORE_ROLL', 'TRADE_AND_BUILD'].includes(state.turnSubPhase) || player.playedDevCardThisTurn || available <= 0) {
        return { ok: false, message: 'Development card cannot be played' };
      }
      break;
    }
    case 'MOVE_ROBBER': {
      const tile = state.tiles?.find(candidate => candidate.id === action.tileId);
      if (!tile || state.turnSubPhase !== 'ROBBER_PLACEMENT') return { ok: false, message: 'Illegal robber target' };
      break;
    }
    case 'STEAL_RESOURCE': {
      const victim = state.players.find(candidate => candidate.id === action.victimPlayerId);
      if (!victim || victim.id === action.playerId || (victim.resources?.[action.stolenResource] || 0) <= 0 ||
          !['ROBBER_STEAL', 'ROBBER_PLACEMENT'].includes(state.turnSubPhase)) {
        return { ok: false, message: 'Illegal steal action' };
      }
      break;
    }
    case 'BANK_TRADE':
      if (state.turnSubPhase !== 'TRADE_AND_BUILD' || (player.resources?.[action.offeredResource] || 0) < action.ratio ||
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
      if (state.turnSubPhase !== 'TRADE_AND_BUILD' || (state.goldCoins?.[action.playerId] || 0) < 2 ||
          (player.goldTradesThisTurn || 0) >= 2 || (state.resourceBank?.[action.requestedResource] || 0) < 1) {
        return { ok: false, message: 'Illegal gold trade' };
      }
      break;
    case 'SELECT_GOLD_RESOURCE': {
      const pending = state.goldSelectionQueue?.[0];
      if (state.turnSubPhase !== 'GOLD_RESOURCE_SELECTION' || pending?.playerId !== action.playerId ||
          (state.resourceBank?.[action.resource] || 0) < 1) return { ok: false, message: 'Illegal gold selection' };
      break;
    }
    case 'MOVE_SHIP': {
      const source = state.edges?.find(edge => edge.id === action.fromEdgeId);
      const target = state.edges?.find(edge => edge.id === action.toEdgeId);
      if (!source?.hasShip || source.shipPlayerId !== action.playerId || !target || target.hasShip || target.hasRoad || state.hasMovedShipThisTurn) {
        return { ok: false, message: 'Illegal ship move' };
      }
      if (!networkTouchesTarget(state, action.playerId, target, 'SHIP', source.id)) return { ok: false, message: 'Ship destination is disconnected' };
      break;
    }
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
      const connectingEdge = incidentEdges(state, player.wagonPosition).find(edge => edgeEndpoints(edge).includes(action.targetVertexId));
      const expectedCost = connectingEdge?.hasRoad && connectingEdge.playerId === action.playerId ? 1 : 2;
      if (!connectingEdge || action.movementCost !== expectedCost || (player.remainingMovementPoints || 0) < action.movementCost) {
        return { ok: false, message: 'Illegal wagon move' };
      }
      break;
    }
    case 'UPGRADE_WAGON':
      if ((player.wagonLevel || 1) + 1 !== action.newLevel) return { ok: false, message: 'Invalid wagon level' };
      if (action.payment === 'RESOURCES' && !hasResources(player, { WOOD: 1, ORE: 1 })) return { ok: false, message: 'Not enough resources' };
      if (action.payment === 'GOLD' && (state.goldCoins?.[action.playerId] || 0) < 3) return { ok: false, message: 'Not enough gold' };
      break;
    default:
      break;
  }
  return { ok: true };
}

function applyReservedAction(state, action) {
  if (!state) return;
  const player = state.players?.find(candidate => candidate.id === action.playerId);
  const spend = (cost) => Object.entries(cost).forEach(([key, amount]) => { player.resources[key] -= amount; });
  const returnToBank = (cards) => Object.entries(cards).forEach(([key, amount]) => {
    if (state.resourceBank) state.resourceBank[key] = (state.resourceBank[key] || 0) + amount;
  });
  switch (action.type) {
    case 'ROLL_DICE': {
      const total = action.diceValues[0] + action.diceValues[1];
      state.lastRoll = total;
      state.turnSubPhase = total === 7
        ? (state.players.some(candidate => totalResources(candidate) > 7) ? 'DISCARD_PHASE' : 'ROBBER_PLACEMENT')
        : 'TRADE_AND_BUILD';
      break;
    }
    case 'END_TURN':
      if (state.gamePhase === 'SETUP_ROUND_1') {
        if (state.currentPlayerIndex < state.players.length - 1) state.currentPlayerIndex += 1;
        else state.gamePhase = 'SETUP_ROUND_2';
      } else if (state.gamePhase === 'SETUP_ROUND_2') {
        if (state.currentPlayerIndex > 0) state.currentPlayerIndex -= 1;
        else state.gamePhase = 'MAIN_GAME';
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
      break;
    case 'DISCARD_CARDS':
      Object.entries(action.resourcesToDiscard).forEach(([key, amount]) => { player.resources[key] -= amount; });
      returnToBank(action.resourcesToDiscard);
      if (!state.players.some(candidate => totalResources(candidate) > 7)) state.turnSubPhase = 'ROBBER_PLACEMENT';
      break;
    case 'BUILD_SETTLEMENT':
      Object.assign(state.vertices.find(vertex => vertex.id === action.vertexId), { structure: 'SETTLEMENT', playerId: action.playerId });
      if (String(state.gamePhase).startsWith('SETUP_')) state.setupState = { ...(state.setupState || {}), hasPlacedSettlement: true, lastSettlementVertexId: action.vertexId };
      if (!String(state.gamePhase).startsWith('SETUP_')) {
        spend({ WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 });
        returnToBank({ WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 });
      }
      break;
    case 'BUILD_CITY':
      state.vertices.find(vertex => vertex.id === action.vertexId).structure = 'CITY';
      spend({ WHEAT: 2, ORE: 3 });
      returnToBank({ WHEAT: 2, ORE: 3 });
      break;
    case 'BUILD_ROAD': {
      const edge = state.edges.find(candidate => candidate.id === action.edgeId);
      Object.assign(edge, { hasRoad: true, playerId: action.playerId });
      if (!String(state.gamePhase).startsWith('SETUP_') && !(state.roadBuildingRemaining > 0)) {
        spend({ WOOD: 1, BRICK: 1 });
        returnToBank({ WOOD: 1, BRICK: 1 });
      }
      if (state.roadBuildingRemaining > 0) state.roadBuildingRemaining -= 1;
      if (String(state.gamePhase).startsWith('SETUP_')) state.setupState = { ...(state.setupState || {}), hasPlacedRoad: true };
      break;
    }
    case 'BUILD_SHIP': {
      const edge = state.edges.find(candidate => candidate.id === action.edgeId);
      Object.assign(edge, { hasShip: true, shipPlayerId: action.playerId });
      if (!String(state.gamePhase).startsWith('SETUP_') && !(state.roadBuildingRemaining > 0)) {
        spend({ WOOD: 1, SHEEP: 1 });
        returnToBank({ WOOD: 1, SHEEP: 1 });
      }
      if (state.roadBuildingRemaining > 0) state.roadBuildingRemaining -= 1;
      if (String(state.gamePhase).startsWith('SETUP_')) state.setupState = { ...(state.setupState || {}), hasPlacedRoad: true };
      break;
    }
    case 'BUY_DEV_CARD':
      spend({ SHEEP: 1, WHEAT: 1, ORE: 1 });
      returnToBank({ SHEEP: 1, WHEAT: 1, ORE: 1 });
      state.devCardDeck.shift();
      player.developmentCards[action.cardType] = (player.developmentCards[action.cardType] || 0) + 1;
      break;
    case 'PLAY_DEV_CARD':
      player.developmentCards[action.cardType] -= 1;
      player.playedDevCardThisTurn = true;
      if (action.cardType === 'KNIGHT') {
        player.knightsPlayed = (player.knightsPlayed || 0) + 1;
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
    case 'MOVE_ROBBER':
      state.tiles.forEach(tile => {
        if (action.robberType === 'PIRATE') tile.hasPirate = tile.id === action.tileId;
        else tile.hasRobber = tile.id === action.tileId;
      });
      state.turnSubPhase = action.hasEligibleVictims ? 'ROBBER_STEAL' : 'TRADE_AND_BUILD';
      break;
    case 'STEAL_RESOURCE': {
      const victim = state.players.find(candidate => candidate.id === action.victimPlayerId);
      victim.resources[action.stolenResource] -= 1;
      player.resources[action.stolenResource] += 1;
      state.turnSubPhase = 'TRADE_AND_BUILD';
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
      Object.assign(source, { hasShip: false, shipPlayerId: null });
      Object.assign(target, { hasShip: true, shipPlayerId: action.playerId });
      state.hasMovedShipThisTurn = true;
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
    case 'MOVE_WAGON':
      player.wagonPosition = action.targetVertexId;
      player.remainingMovementPoints -= action.movementCost;
      break;
    case 'UPGRADE_WAGON':
      if (action.payment === 'RESOURCES') {
        spend({ WOOD: 1, ORE: 1 });
        returnToBank({ WOOD: 1, ORE: 1 });
      }
      else state.goldCoins[action.playerId] -= 3;
      player.wagonLevel = action.newLevel;
      break;
    default:
      break;
  }
}

module.exports = {
  ACTION_TYPES,
  DEV_CARD_TYPES,
  RESOURCE_TYPES,
  applyReservedAction,
  validateActionShape,
  validateGameAction,
  validateResourceMap,
};
