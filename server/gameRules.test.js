const test = require('node:test');
const assert = require('node:assert/strict');
const { validateActionShape, validateGameAction, applyReservedAction } = require('./gameRules');

const resources = (overrides = {}) => ({ WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0, ...overrides });
const baseState = () => ({
  gamePhase: 'MAIN_GAME',
  turnSubPhase: 'TRADE_AND_BUILD',
  currentPlayerIndex: 0,
  players: [
    { id: 'p1', resources: resources({ WOOD: 5, BRICK: 5, SHEEP: 5, WHEAT: 5, ORE: 5 }), developmentCards: {}, boughtDevCardsThisTurn: {} },
    { id: 'p2', resources: resources({ WOOD: 2 }), developmentCards: {}, boughtDevCardsThisTurn: {} },
  ],
  resourceBank: resources({ WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 }),
  goldCoins: { p1: 4, p2: 0 },
  devCardDeck: ['KNIGHT'],
  vertices: [
    { id: 'v_52_-30', structure: 'SETTLEMENT', playerId: 'p1' },
    { id: 'v_52_30', structure: 'NONE' },
    { id: 'v_0_60', structure: 'NONE' },
  ],
  edges: [
    { id: 'e_v_52_-30_v_52_30', hasRoad: true, playerId: 'p1', hasShip: false },
    { id: 'e_v_0_60_v_52_30', hasRoad: false, hasShip: false },
  ],
  tiles: [
    { id: 'land-1', type: 'WOOD', islandId: 1, coord: { q: 0, r: 0, s: 0 } },
    { id: 'fog-1', type: 'FOG', originalType: 'ORE', originalNumberToken: 8 },
  ],
  setupState: { hasPlacedSettlement: false, hasPlacedRoad: false },
  goldSelectionQueue: [],
  roadBuildingRemaining: 0,
});

test('accepts outcome-free dice requests and rejects client-supplied outcomes', () => {
  assert.equal(validateActionShape({ type: 'ROLL_DICE', playerId: 'p1' }).ok, true);
  assert.equal(validateActionShape({ type: 'ROLL_DICE', playerId: 'p1', diceValues: [3, 4] }).ok, false);
  assert.equal(validateActionShape({ type: 'ROLL_DICE', playerId: 'p1', diceValues: [0, 7] }).ok, false);
  assert.equal(validateActionShape({ type: 'STEAL_RESOURCE', playerId: 'p1', victimPlayerId: 'p2' }).ok, true);
  assert.equal(validateActionShape({ type: 'STEAL_RESOURCE', playerId: 'p1', victimPlayerId: 'p2', stolenResource: 'WOOD' }).ok, false);
  assert.equal(validateActionShape({ type: 'MOVE_ROBBER', playerId: 'p1', tileId: 'land-1', hasEligibleVictims: true }).ok, false);
  assert.equal(validateActionShape({ type: 'ADMIN_WIN', playerId: 'p1' }).ok, false);
});

test('Cities & Knights awards commodities instead of a second resource for a commodity city', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.turnSubPhase = 'BEFORE_ROLL';
  state.tiles[0].numberToken = 8;
  state.tiles[0].type = 'WOOD';
  state.vertices[0].structure = 'CITY';
  state.players[0].resources.WOOD = 0;
  state.players[0].cityImprovements = { SCIENCE: 1, POLITICS: 0, TRADE: 0 };
  const action = { type: 'ROLL_DICE', playerId: 'p1', diceValues: [4, 4, 1], eventDie: 'SCIENCE' };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.players[0].resources.WOOD, 1);
  assert.equal(state.players[0].commodities.PAPER, 1);
  assert.equal(state.players[0].progressCards.length + (state.players[0].victoryPoints || 0), 1);
  assert.equal(state.citiesKnightsState.progressDecks.SCIENCE.length, 17);
});

test('Cities & Knights maps pasture cities to cloth and uses a city in second setup', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.turnSubPhase = 'BEFORE_ROLL';
  state.tiles[0].numberToken = 8;
  state.tiles[0].type = 'SHEEP';
  state.vertices[0].structure = 'CITY';
  state.players[0].resources.SHEEP = 0;
  state.players[0].cityImprovements = { SCIENCE: 0, POLITICS: 0, TRADE: 1 };
  applyReservedAction(state, { type: 'ROLL_DICE', playerId: 'p1', diceValues: [4, 4, 6], eventDie: 'TRADE' });
  assert.equal(state.players[0].resources.SHEEP, 1);
  assert.equal(state.players[0].commodities.CLOTH, 1);

  const setup = baseState();
  setup.activeExpansion = 'CITIES_AND_KNIGHTS';
  setup.gamePhase = 'SETUP_ROUND_2';
  setup.vertices.forEach(vertex => { vertex.structure = 'NONE'; delete vertex.playerId; });
  setup.edges.forEach(edge => { edge.hasRoad = false; });
  const action = { type: 'BUILD_CITY', playerId: 'p1', vertexId: 'v_52_-30' };
  assert.equal(validateGameAction(setup, action).ok, true);
  applyReservedAction(setup, action);
  assert.equal(setup.vertices[0].structure, 'CITY');
  assert.equal(setup.players[0].resources.WOOD, 6);
});

test('Cities & Knights treats commodities as hand cards when discarding on a 7', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.turnSubPhase = 'DISCARD_PHASE';
  state.players[0].resources = resources();
  state.players[0].commodities = { COIN: 8, PAPER: 0, CLOTH: 0 };
  const action = { type: 'DISCARD_CARDS', playerId: 'p1', resourcesToDiscard: {}, commoditiesToDiscard: { COIN: 4 } };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.players[0].commodities.COIN, 4);
  assert.equal(state.commodityBank.COIN, 16);
  assert.equal(state.turnSubPhase, 'TRADE_AND_BUILD');

  state.players[0].commodities.COIN = 8;
  state.vertices[0].cityWall = true;
  state.turnSubPhase = 'DISCARD_PHASE';
  assert.equal(validateGameAction(state, action).ok, false, 'a city wall increases the safe hand limit by two');
});

test('Cities & Knights validates and applies a city wall', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.vertices[0].structure = 'CITY';
  const action = { type: 'BUILD_CITY_WALL', playerId: 'p1', vertexId: state.vertices[0].id };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.vertices[0].cityWall, true);
  assert.equal(state.players[0].resources.BRICK, 3);
});

test('Cities & Knights allows an active knight to move across its full road network', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.vertices[0] = { ...state.vertices[0], structure: 'NONE', playerId: undefined, knight: { playerId: 'p1', level: 1, active: true, actedThisTurn: false } };
  state.edges[1] = { ...state.edges[1], hasRoad: true, playerId: 'p1' };
  const action = { type: 'MOVE_KNIGHT', playerId: 'p1', fromVertexId: state.vertices[0].id, toVertexId: state.vertices[2].id };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.vertices[2].knight.playerId, 'p1');
  assert.equal(state.vertices[2].knight.actedThisTurn, true);
});

test('Cities & Knights recycles played progress cards and applies Warlord', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.players[0].progressCards = ['WARLORD'];
  state.vertices[1].knight = { playerId: 'p1', level: 1, active: false, actedThisTurn: true };
  const action = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'WARLORD' };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.deepEqual(state.players[0].progressCards, []);
  assert.equal(state.vertices[1].knight.active, true);
  assert.equal(state.vertices[1].knight.actedThisTurn, false);
  assert.equal(state.citiesKnightsState.progressDecks.POLITICS.includes('WARLORD'), true);
});

test('Cities & Knights Alchemist fixes the next roll and Inventor swaps legal number tokens', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.turnSubPhase = 'BEFORE_ROLL';
  state.players[0].progressCards = ['ALCHEMIST'];
  const alchemist = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'ALCHEMIST', data: { diceValues: [3, 4, 5], eventDie: 'TRADE' } };
  assert.equal(validateGameAction(state, alchemist).ok, true);
  applyReservedAction(state, alchemist);
  assert.deepEqual(state.players[0].alchemistDice, [3, 4, 5]);
  applyReservedAction(state, { type: 'ROLL_DICE', playerId: 'p1', diceValues: [3, 4, 5], eventDie: 'TRADE' });
  assert.equal(state.lastRoll, 7);
  assert.equal(state.players[0].alchemistDice, undefined);

  state.turnSubPhase = 'TRADE_AND_BUILD';
  state.tiles = [{ id: 'a', type: 'WOOD', numberToken: 5 }, { id: 'b', type: 'ORE', numberToken: 9 }];
  state.players[0].progressCards = ['INVENTOR'];
  const inventor = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'INVENTOR', data: { tileAId: 'a', tileBId: 'b' } };
  assert.equal(validateGameAction(state, inventor).ok, true);
  applyReservedAction(state, inventor);
  assert.deepEqual(state.tiles.map(tile => tile.numberToken), [9, 5]);
});

test('Cities & Knights resource and trade monopolies collect resources and commodities', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.players[0].resources.WOOD = 0;
  state.players[1].resources.WOOD = 3;
  state.players[0].commodities = { COIN: 0, PAPER: 0, CLOTH: 0 };
  state.players[1].commodities = { COIN: 2, PAPER: 0, CLOTH: 0 };
  state.players[0].progressCards = ['RESOURCE_MONOPOLY', 'TRADE_MONOPOLY'];
  const resourceMonopoly = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'RESOURCE_MONOPOLY', data: { resource: 'WOOD' } };
  assert.equal(validateGameAction(state, resourceMonopoly).ok, true);
  applyReservedAction(state, resourceMonopoly);
  assert.equal(state.players[0].resources.WOOD, 3);
  assert.equal(state.players[1].resources.WOOD, 0);
  const tradeMonopoly = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'TRADE_MONOPOLY', data: { resource: 'COIN' } };
  assert.equal(validateGameAction(state, tradeMonopoly).ok, true);
  applyReservedAction(state, tradeMonopoly);
  assert.equal(state.players[0].commodities.COIN, 2);
  assert.equal(state.players[1].commodities.COIN, 0);
});

test('Cities & Knights Merchant and Merchant Fleet grant the correct 2:1 bank trade', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.players[0].progressCards = ['MERCHANT', 'MERCHANT_FLEET'];
  state.players[0].victoryPoints = 2;
  const merchant = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'MERCHANT', data: { tileId: 'land-1' } };
  assert.equal(validateGameAction(state, merchant).ok, true);
  applyReservedAction(state, merchant);
  assert.deepEqual(state.citiesKnightsState.merchant, { playerId: 'p1', resource: 'WOOD' });
  assert.equal(state.players[0].victoryPoints, 3);
  const merchantTrade = { type: 'BANK_TRADE', playerId: 'p1', offeredResource: 'WOOD', requestedResource: 'BRICK', ratio: 2 };
  assert.equal(validateGameAction(state, merchantTrade).ok, true);

  const fleet = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'MERCHANT_FLEET', data: { resource: 'ORE' } };
  assert.equal(validateGameAction(state, fleet).ok, true);
  applyReservedAction(state, fleet);
  const fleetTrade = { type: 'BANK_TRADE', playerId: 'p1', offeredResource: 'ORE', requestedResource: 'BRICK', ratio: 2 };
  assert.equal(validateGameAction(state, fleetTrade).ok, true);
});

test('Cities & Knights Bishop moves the robber and takes one card from every bordering opponent', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.players[0].progressCards = ['BISHOP'];
  state.players[0].resources = resources();
  state.players[0].commodities = { COIN: 0, PAPER: 0, CLOTH: 0 };
  state.players[1].resources = resources({ WOOD: 1 });
  state.players[1].commodities = { COIN: 1, PAPER: 0, CLOTH: 0 };
  state.vertices[0].playerId = 'p2';
  const action = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'BISHOP', data: { tileId: 'land-1' } };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.tiles[0].hasRobber, true);
  assert.equal(state.players[0].resources.WOOD + state.players[0].commodities.COIN, 1);
  assert.equal(state.players[1].resources.WOOD + state.players[1].commodities.COIN, 1);
});

test('Cities & Knights Saboteur queues each leading human player to discard half their hand', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.players[0].progressCards = ['SABOTEUR'];
  state.players[0].victoryPoints = 2;
  state.players[1].victoryPoints = 4;
  state.players[1].resources = resources({ WOOD: 2, BRICK: 2 });
  state.players[1].commodities = { COIN: 2, PAPER: 0, CLOTH: 0 };
  const saboteur = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'SABOTEUR' };
  assert.equal(validateGameAction(state, saboteur).ok, true);
  applyReservedAction(state, saboteur);
  assert.equal(state.turnSubPhase, 'SABOTEUR_DISCARD');
  assert.deepEqual(state.citiesKnightsState.sabotageDiscardQueue, [{ playerId: 'p2', amount: 3 }]);
  const discard = { type: 'DISCARD_CARDS', playerId: 'p2', resourcesToDiscard: { WOOD: 2, BRICK: 1 }, commoditiesToDiscard: {} };
  assert.equal(validateGameAction(state, discard).ok, true);
  applyReservedAction(state, discard);
  assert.equal(state.turnSubPhase, 'TRADE_AND_BUILD');
  assert.equal(state.players[1].resources.WOOD + state.players[1].resources.BRICK, 1);
});

test('Cities & Knights Wedding, Deserter, and Commercial Harbor use the required response turns', () => {
  const weddingState = baseState();
  weddingState.activeExpansion = 'CITIES_AND_KNIGHTS';
  weddingState.players[0].progressCards = ['WEDDING'];
  weddingState.players[0].victoryPoints = 2;
  weddingState.players[1].victoryPoints = 4;
  weddingState.players[1].resources = resources({ WOOD: 2 });
  const wedding = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'WEDDING' };
  assert.equal(validateGameAction(weddingState, wedding).ok, true);
  applyReservedAction(weddingState, wedding);
  assert.equal(weddingState.turnSubPhase, 'WEDDING_GIVE');
  const weddingGive = { type: 'GIVE_PROGRESS_CARDS', playerId: 'p2', targetPlayerId: 'p1', resourcesToGive: { WOOD: 2 }, commoditiesToGive: {} };
  assert.equal(validateGameAction(weddingState, weddingGive).ok, true);
  applyReservedAction(weddingState, weddingGive);
  assert.equal(weddingState.players[0].resources.WOOD, 7);
  assert.equal(weddingState.turnSubPhase, 'TRADE_AND_BUILD');

  const deserterState = baseState();
  deserterState.activeExpansion = 'CITIES_AND_KNIGHTS';
  deserterState.players[0].progressCards = ['DESERTER'];
  deserterState.vertices[1].knight = { playerId: 'p2', level: 2, active: true };
  deserterState.edges[1] = { ...deserterState.edges[1], hasRoad: true, playerId: 'p1' };
  const deserter = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'DESERTER', data: { targetPlayerId: 'p2' } };
  assert.equal(validateGameAction(deserterState, deserter).ok, true);
  applyReservedAction(deserterState, deserter);
  const select = { type: 'SELECT_DESERTER_KNIGHT', playerId: 'p2', vertexId: deserterState.vertices[1].id };
  assert.equal(validateGameAction(deserterState, select).ok, true);
  applyReservedAction(deserterState, select);
  const place = { type: 'PLACE_DESERTER_KNIGHT', playerId: 'p1', vertexId: deserterState.vertices[2].id };
  assert.equal(validateGameAction(deserterState, place).ok, true);
  applyReservedAction(deserterState, place);
  assert.deepEqual(deserterState.vertices[2].knight, { playerId: 'p1', level: 2, active: true, actedThisTurn: false });

  const harborState = baseState();
  harborState.activeExpansion = 'CITIES_AND_KNIGHTS';
  harborState.players[0].progressCards = ['COMMERCIAL_HARBOR'];
  harborState.players[0].resources = resources({ BRICK: 1 });
  harborState.players[1].resources = resources({ WOOD: 1 });
  const harbor = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'COMMERCIAL_HARBOR' };
  assert.equal(validateGameAction(harborState, harbor).ok, true);
  applyReservedAction(harborState, harbor);
  const offer = { type: 'GIVE_PROGRESS_CARDS', playerId: 'p2', targetPlayerId: 'p1', resourcesToGive: { WOOD: 1 }, commoditiesToGive: {} };
  assert.equal(validateGameAction(harborState, offer).ok, true);
  applyReservedAction(harborState, offer);
  const returnCard = { type: 'GIVE_PROGRESS_CARDS', playerId: 'p1', targetPlayerId: 'p2', resourcesToGive: { BRICK: 1 }, commoditiesToGive: {} };
  assert.equal(validateGameAction(harborState, returnCard).ok, true);
  applyReservedAction(harborState, returnCard);
  assert.equal(harborState.players[0].resources.WOOD, 1);
  assert.equal(harborState.players[1].resources.BRICK, 1);
  assert.equal(harborState.turnSubPhase, 'TRADE_AND_BUILD');
});

test('Cities & Knights applies Engineer and Crane progress card discounts', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.vertices[0].structure = 'CITY';
  state.players[0].progressCards = ['ENGINEER', 'CRANE'];
  state.players[0].commodities = { COIN: 0, PAPER: 0, CLOTH: 0 };
  const engineer = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'ENGINEER', data: { vertexId: state.vertices[0].id } };
  assert.equal(validateGameAction(state, engineer).ok, true);
  applyReservedAction(state, engineer);
  assert.equal(state.vertices[0].cityWall, true);

  const crane = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'CRANE' };
  assert.equal(validateGameAction(state, crane).ok, true);
  applyReservedAction(state, crane);
  const improvement = { type: 'UPGRADE_CITY_IMPROVEMENT', playerId: 'p1', track: 'SCIENCE' };
  assert.equal(validateGameAction(state, improvement).ok, true);
  applyReservedAction(state, improvement);
  assert.equal(state.players[0].cityImprovements.SCIENCE, 1);
  assert.equal(state.players[0].commodities.PAPER, 0);
});

test('Cities & Knights irrigation pays per distinct adjacent field', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.tiles[0].type = 'WHEAT';
  state.vertices[0].structure = 'CITY';
  state.players[0].resources.WHEAT = 0;
  state.players[0].progressCards = ['IRRIGATION'];
  const action = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'IRRIGATION' };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.players[0].resources.WHEAT, 2);
  assert.equal(state.resourceBank.WHEAT, 17);
});

test('Cities & Knights Medicine upgrades a settlement for the reduced cost', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.players[0].victoryPoints = 2;
  state.players[0].resources = resources({ WHEAT: 1, ORE: 2 });
  state.players[0].progressCards = ['MEDICINE'];
  const action = { type: 'PLAY_PROGRESS_CARD', playerId: 'p1', cardId: 'MEDICINE', data: { vertexId: state.vertices[0].id } };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.vertices[0].structure, 'CITY');
  assert.equal(state.players[0].victoryPoints, 3);
  assert.deepEqual(state.players[0].resources, resources());
});

test('Cities & Knights barbarian defeat downgrades only the weakest eligible defenders', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.turnSubPhase = 'BEFORE_ROLL';
  state.vertices[0].structure = 'CITY';
  state.vertices[1] = { ...state.vertices[1], structure: 'CITY', playerId: 'p2' };
  state.vertices[2] = { ...state.vertices[2], knight: { playerId: 'p1', level: 1, active: true } };
  state.citiesKnightsState = { barbarianPosition: 6, metropolisOwners: {}, barbarianLossQueue: [] };
  const action = { type: 'ROLL_DICE', playerId: 'p1', diceValues: [1, 1, 1], eventDie: 'BARBARIAN' };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.deepEqual(state.citiesKnightsState.barbarianLossQueue, ['p2']);
  assert.equal(state.turnSubPhase, 'BARBARIAN_LOSS');
});

test('Cities & Knights displaces a weaker knight and lets its owner relocate it', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.vertices[0] = { ...state.vertices[0], structure: 'NONE', playerId: undefined, knight: { playerId: 'p1', level: 2, active: true, actedThisTurn: false } };
  state.vertices[2] = { ...state.vertices[2], knight: { playerId: 'p2', level: 1, active: true } };
  state.vertices.push({ id: 'v_0_120', structure: 'NONE' });
  state.edges[1] = { ...state.edges[1], hasRoad: true, playerId: 'p1' };
  state.edges.push({ id: 'e_v_0_60_v_0_120', hasRoad: true, playerId: 'p2', hasShip: false });
  const displace = { type: 'DISPLACE_KNIGHT', playerId: 'p1', fromVertexId: state.vertices[0].id, toVertexId: state.vertices[2].id };
  assert.equal(validateGameAction(state, displace).ok, true);
  applyReservedAction(state, displace);
  assert.equal(state.turnSubPhase, 'KNIGHT_DISPLACEMENT');
  assert.equal(state.vertices[2].knight.playerId, 'p1');
  const relocate = { type: 'RELOCATE_DISPLACED_KNIGHT', playerId: 'p2', toVertexId: 'v_0_120' };
  assert.equal(validateGameAction(state, relocate).ok, true);
  applyReservedAction(state, relocate);
  assert.equal(state.vertices.find(vertex => vertex.id === 'v_0_120').knight.playerId, 'p2');
  assert.equal(state.turnSubPhase, 'TRADE_AND_BUILD');
});

test('Cities & Knights requires discarding down to four progress cards', () => {
  const state = baseState();
  state.activeExpansion = 'CITIES_AND_KNIGHTS';
  state.turnSubPhase = 'PROGRESS_DISCARD';
  state.players[0].progressCards = ['ALCHEMIST', 'CRANE', 'ENGINEER', 'INVENTOR', 'IRRIGATION'];
  state.citiesKnightsState = { barbarianPosition: 0, metropolisOwners: {}, barbarianLossQueue: [], progressDiscardQueue: ['p1'] };
  const action = { type: 'DISCARD_PROGRESS_CARD', playerId: 'p1', cardId: 'CRANE' };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.players[0].progressCards.length, 4);
  assert.equal(state.citiesKnightsState.progressDecks.SCIENCE.includes('CRANE'), true);
  assert.equal(state.turnSubPhase, 'TRADE_AND_BUILD');
});

test('collects a Lost Tribe victory chit when a ship is built on its edge', () => {
  const state = baseState();
  state.vertices[1] = { ...state.vertices[1], structure: 'SETTLEMENT', playerId: 'p1' };
  state.edges[1].lostTribeReward = { id: 'vp-a', kind: 'VICTORY_POINT' };
  state.players[0].victoryPoints = 2;
  const action = { type: 'BUILD_SHIP', playerId: 'p1', edgeId: state.edges[1].id };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.players[0].victoryPoints, 3);
  assert.equal(state.edges[1].lostTribeReward.collectedBy, 'p1');
});

test('server authoritatively resolves a Pirate Islands fortress attack', () => {
  const state = baseState();
  state.selectedScenario = 'PIRATE_ISLANDS';
  state.players[0].victoryPoints = 9;
  state.vertices[2] = {
    ...state.vertices[2],
    pirateFortress: { playerId: 'p1', remainingTokens: 1, conquered: false },
  };
  state.vertices[1] = { ...state.vertices[1], pirateSettlementTarget: 'p1' };
  state.edges[0] = { ...state.edges[0], hasRoad: false, hasShip: true, shipPlayerId: 'p1', isWarship: true };
  state.edges[1] = { ...state.edges[1], hasShip: true, shipPlayerId: 'p1', isWarship: true };
  const action = { type: 'ATTACK_PIRATE_FORTRESS', playerId: 'p1', fortressVertexId: state.vertices[2].id, fortressPower: 1 };
  assert.equal(validateActionShape({ ...action, fortressPower: undefined }).ok, true);
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.vertices[2].pirateFortress.conquered, true);
  assert.equal(state.vertices[2].structure, 'SETTLEMENT');
  assert.equal(state.players[0].victoryPoints, 10);
  assert.equal(action.fortressOutcome, 'CONQUERED');
});

test('places a stored Lost Tribe harbor only on a legal coastal settlement edge', () => {
  const state = baseState();
  state.turnSubPhase = 'HARBOR_PLACEMENT';
  state.players[0].unplacedHarbors = ['WOOD'];
  state.players[0].harborReturnSubPhase = 'TRADE_AND_BUILD';
  state.tiles.push({ id: 'water-1', type: 'WATER', coord: { q: 1, r: 0, s: -1 } });
  const action = { type: 'PLACE_HARBOR', playerId: 'p1', edgeId: state.edges[0].id };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.edges[0].isHarbor, true);
  assert.equal(state.edges[0].harborType, 'WOOD');
  assert.deepEqual(state.players[0].unplacedHarbors, []);
  assert.equal(state.turnSubPhase, 'TRADE_AND_BUILD');
});

test('distributes an authoritative dice result from the finite bank', () => {
  const state = baseState();
  state.turnSubPhase = 'BEFORE_ROLL';
  state.tiles[0].numberToken = 8;
  state.vertices[0] = { id: 'v_52_-30', structure: 'CITY', playerId: 'p1' };
  state.resourceBank.WOOD = 2;
  state.players[0].resources.WOOD = 0;
  state.players[1].resources.WOOD = 0;
  const action = { type: 'ROLL_DICE', playerId: 'p1', diceValues: [4, 4] };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.players[0].resources.WOOD, 2);
  assert.equal(state.resourceBank.WOOD, 0);
  assert.equal(state.turnSubPhase, 'TRADE_AND_BUILD');
});

test('combines all gold-field rewards for the same player into one selection', () => {
  const state = baseState();
  state.turnSubPhase = 'BEFORE_ROLL';
  state.tiles[0] = { ...state.tiles[0], type: 'GOLD_FIELD', numberToken: 8 };
  state.vertices[0] = { id: 'v_52_-30', structure: 'SETTLEMENT', playerId: 'p1' };
  state.vertices[1] = { id: 'v_52_30', structure: 'CITY', playerId: 'p1' };

  applyReservedAction(state, { type: 'ROLL_DICE', playerId: 'p1', diceValues: [4, 4] });

  assert.deepEqual(state.goldSelectionQueue, [{ playerId: 'p1', amount: 3, tileId: 'land-1' }]);
  assert.equal(state.turnSubPhase, 'GOLD_RESOURCE_SELECTION');
});

test('enforces the settlement distance rule and connected network', () => {
  const state = baseState();
  const adjacent = validateGameAction(state, { type: 'BUILD_SETTLEMENT', playerId: 'p1', vertexId: 'v_52_30' });
  assert.equal(adjacent.ok, false);
  state.vertices[0].structure = 'NONE';
  const connected = validateGameAction(state, { type: 'BUILD_SETTLEMENT', playerId: 'p1', vertexId: 'v_52_30' });
  assert.equal(connected.ok, true);
});

test('server awards normal building points and records setup home islands', () => {
  const state = baseState();
  state.players[0].victoryPoints = 2;
  state.vertices[0].structure = 'NONE';
  const settlement = { type: 'BUILD_SETTLEMENT', playerId: 'p1', vertexId: 'v_52_30' };
  assert.equal(validateGameAction(state, settlement).ok, true);
  applyReservedAction(state, settlement);
  assert.equal(state.players[0].victoryPoints, 3);

  state.gamePhase = 'SETUP_ROUND_1';
  state.turnSubPhase = 'BEFORE_ROLL';
  state.vertices[0].structure = 'NONE';
  state.vertices[1].structure = 'NONE';
  state.edges[0].hasRoad = false;
  const setup = { type: 'BUILD_SETTLEMENT', playerId: 'p1', vertexId: 'v_52_-30' };
  assert.equal(validateGameAction(state, setup).ok, true);
  applyReservedAction(state, setup);
  assert.deepEqual(state.players[0].homeIslandIds, [1]);
});

test('rejects Lost Tribe settlements on a connected small island after setup', () => {
  const state = baseState();
  state.selectedScenario = 'THE_LOST_TRIBE';
  state.tiles[0].islandId = 2;
  state.vertices[0].structure = 'NONE';
  const action = { type: 'BUILD_SETTLEMENT', playerId: 'p1', vertexId: 'v_52_30' };
  assert.equal(validateGameAction(state, action).ok, false);
});

test('does not distribute Lost Tribe resources from a small island', () => {
  const state = baseState();
  state.selectedScenario = 'THE_LOST_TRIBE';
  state.turnSubPhase = 'BEFORE_ROLL';
  state.tiles[0] = { ...state.tiles[0], islandId: 2, numberToken: 8 };
  state.vertices[0] = { ...state.vertices[0], structure: 'CITY', playerId: 'p1' };
  state.players[0].resources.WOOD = 0;
  applyReservedAction(state, { type: 'ROLL_DICE', playerId: 'p1', diceValues: [4, 4] });
  assert.equal(state.players[0].resources.WOOD, 0);
  assert.equal(state.resourceBank.WOOD, 19);
});

test('reserves bank and player resources for a bank trade', () => {
  const state = baseState();
  const action = { type: 'BANK_TRADE', playerId: 'p1', offeredResource: 'WOOD', requestedResource: 'ORE', ratio: 4 };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.players[0].resources.WOOD, 1);
  assert.equal(state.players[0].resources.ORE, 6);
  assert.equal(state.resourceBank.WOOD, 23);
  assert.equal(state.resourceBank.ORE, 18);
});

test('enforces bank trade ratios from the player\'s actual harbor access', () => {
  const state = baseState();
  state.vertices[0] = { ...state.vertices[0], isHarbor: true, harborType: 'WOOD' };
  assert.equal(validateGameAction(state, { type: 'BANK_TRADE', playerId: 'p1', offeredResource: 'WOOD', requestedResource: 'ORE', ratio: 2 }).ok, true);
  assert.equal(validateGameAction(state, { type: 'BANK_TRADE', playerId: 'p1', offeredResource: 'WOOD', requestedResource: 'ORE', ratio: 3 }).ok, false);
  assert.equal(validateGameAction(state, { type: 'BANK_TRADE', playerId: 'p1', offeredResource: 'BRICK', requestedResource: 'ORE', ratio: 2 }).ok, false);
});

test('rejects a development card that is not on top of the shared deck', () => {
  const state = baseState();
  assert.equal(validateGameAction(state, { type: 'BUY_DEV_CARD', playerId: 'p1', cardType: 'MONOPOLY' }).ok, false);
  assert.equal(validateGameAction(state, { type: 'BUY_DEV_CARD', playerId: 'p1', cardType: 'KNIGHT' }).ok, true);
});

test('transfers every selected resource from all opponents when monopoly is played', () => {
  const state = baseState();
  state.players[0].developmentCards.MONOPOLY = 1;
  state.players.push({ id: 'p3', resources: resources({ WOOD: 3 }), developmentCards: {}, boughtDevCardsThisTurn: {} });

  const action = { type: 'PLAY_DEV_CARD', playerId: 'p1', cardType: 'MONOPOLY', data: { resource: 'WOOD' } };
  assert.equal(validateGameAction(state, action).ok, true);

  applyReservedAction(state, action);

  assert.equal(state.players[0].resources.WOOD, 10);
  assert.equal(state.players[1].resources.WOOD, 0);
  assert.equal(state.players[2].resources.WOOD, 0);
  assert.equal(state.players[0].developmentCards.MONOPOLY, 0);
  assert.equal(state.players[0].playedDevCardThisTurn, true);
});

test('Year of Plenty grants two resources only when the bank can supply both', () => {
  const state = baseState();
  state.players[0].developmentCards.YEAR_OF_PLENTY = 1;

  const action = { type: 'PLAY_DEV_CARD', playerId: 'p1', cardType: 'YEAR_OF_PLENTY', data: { resources: ['WOOD', 'WOOD'] } };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);

  assert.equal(state.players[0].resources.WOOD, 7);
  assert.equal(state.resourceBank.WOOD, 17);
  assert.equal(state.players[0].developmentCards.YEAR_OF_PLENTY, 0);

  const insufficientBankState = baseState();
  insufficientBankState.players[0].developmentCards.YEAR_OF_PLENTY = 1;
  insufficientBankState.resourceBank.WOOD = 1;
  assert.equal(validateGameAction(insufficientBankState, action).ok, false);
});

test('rejects forged fog contents and applies canonical discovery bonus', () => {
  const state = baseState();
  const forged = { type: 'DISCOVER_FOG', playerId: 'p1', tileId: 'fog-1', revealedTile: { type: 'WOOD', numberToken: 8 } };
  assert.equal(validateGameAction(state, forged).ok, false);
  const action = { ...forged, revealedTile: { type: 'ORE', numberToken: 8 } };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.tiles.find(tile => tile.id === 'fog-1').type, 'ORE');
  assert.equal(state.players[0].resources.ORE, 6);
  assert.equal(state.resourceBank.ORE, 18);
});

test('executes a player trade only when both parties can pay', () => {
  const state = baseState();
  const action = {
    type: 'EXECUTE_PLAYER_TRADE', playerId: 'p1', targetPlayerId: 'p2',
    offer: { BRICK: 1 }, request: { WOOD: 2 },
  };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.players[0].resources.BRICK, 4);
  assert.equal(state.players[0].resources.WOOD, 7);
  assert.equal(state.players[1].resources.BRICK, 1);
  assert.equal(state.players[1].resources.WOOD, 0);
});

test('allows a setup ship on an outer land-frame coast edge', () => {
  const state = baseState();
  state.gamePhase = 'SETUP_ROUND_1';
  state.turnSubPhase = 'BEFORE_ROLL';
  state.edges[0] = { id: 'e_v_52_-30_v_52_30', hasRoad: false, hasShip: false };
  state.setupState = {
    hasPlacedSettlement: true,
    hasPlacedRoad: false,
    lastSettlementVertexId: 'v_52_-30',
  };

  const action = { type: 'BUILD_SHIP', playerId: 'p1', edgeId: 'e_v_52_-30_v_52_30' };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.edges[0].hasShip, true);
  assert.equal(state.edges[0].shipPlayerId, 'p1');
  assert.equal(state.setupState.hasPlacedRoad, true);
});

test('enforces land robber, water pirate, and authoritative theft eligibility', () => {
  const state = baseState();
  const water = { id: 'water-1', type: 'WATER', coord: { q: 1, r: 0, s: -1 } };
  state.tiles.push(water);
  state.turnSubPhase = 'ROBBER_PLACEMENT';

  assert.equal(validateGameAction(state, {
    type: 'MOVE_ROBBER', playerId: 'p1', tileId: 'water-1', robberType: 'ROBBER',
  }).ok, false);
  assert.equal(validateGameAction(state, {
    type: 'MOVE_ROBBER', playerId: 'p1', tileId: 'land-1', robberType: 'PIRATE',
  }).ok, false);
  assert.equal(validateGameAction(state, {
    type: 'MOVE_ROBBER', playerId: 'p1', tileId: 'fog-1', robberType: 'PIRATE',
  }).ok, false);

  state.vertices[0] = { id: 'v_52_-30', structure: 'SETTLEMENT', playerId: 'p2' };
  const move = { type: 'MOVE_ROBBER', playerId: 'p1', tileId: 'land-1', robberType: 'ROBBER' };
  assert.equal(validateGameAction(state, move).ok, true);
  applyReservedAction(state, move);
  assert.deepEqual(state.eligibleStealPlayerIds, ['p2']);
  assert.equal(state.turnSubPhase, 'ROBBER_STEAL');

  const steal = { type: 'STEAL_RESOURCE', playerId: 'p1', victimPlayerId: 'p2', stolenResource: 'WOOD' };
  assert.equal(validateGameAction(state, steal).ok, true);
  state.players[1].resources.WOOD = 0;
  assert.equal(validateGameAction(state, steal).ok, false);
});

const shipMoveState = () => {
  const state = baseState();
  state.tiles = [{ id: 'sea', type: 'WATER', coord: { q: 0, r: 0, s: 0 } }];
  state.vertices = [
    { id: 'v_52_-30', structure: 'NONE' },
    { id: 'v_52_30', structure: 'NONE' },
    { id: 'v_0_60', structure: 'NONE' },
    { id: 'v_-52_30', structure: 'NONE' },
    { id: 'v_-52_-30', structure: 'NONE' },
    { id: 'v_0_-60', structure: 'NONE' },
  ];
  state.edges = [
    { id: 'e_v_52_-30_v_52_30', hasShip: true, shipPlayerId: 'p1', hasRoad: false },
    { id: 'e_v_0_60_v_52_30', hasShip: true, shipPlayerId: 'p1', hasRoad: false },
    { id: 'e_v_-52_30_v_0_60', hasShip: false, hasRoad: false },
    { id: 'e_v_-52_-30_v_-52_30', hasShip: false, hasRoad: false },
    { id: 'e_v_-52_-30_v_0_-60', hasShip: false, hasRoad: false },
    { id: 'e_v_0_-60_v_52_-30', hasShip: false, hasRoad: false },
  ];
  state.currentTurnBuiltShips = [];
  state.hasMovedShipThisTurn = false;
  return state;
};

test('allows moving only an open, older ship to a connected sea edge', () => {
  const state = shipMoveState();
  const action = {
    type: 'MOVE_SHIP', playerId: 'p1',
    fromEdgeId: 'e_v_52_-30_v_52_30', toEdgeId: 'e_v_-52_30_v_0_60',
  };
  assert.equal(validateGameAction(state, action).ok, true);
  applyReservedAction(state, action);
  assert.equal(state.edges[0].hasShip, false);
  assert.equal(state.edges[2].hasShip, true);
  assert.equal(state.hasMovedShipThisTurn, true);
});

test('rejects closed, newly-built, landlocked, and pirate-blocked ship moves', () => {
  const action = {
    type: 'MOVE_SHIP', playerId: 'p1',
    fromEdgeId: 'e_v_52_-30_v_52_30', toEdgeId: 'e_v_-52_30_v_0_60',
  };

  const newlyBuilt = shipMoveState();
  newlyBuilt.currentTurnBuiltShips = [action.fromEdgeId];
  assert.equal(validateGameAction(newlyBuilt, action).ok, false);

  const pirateBlocked = shipMoveState();
  pirateBlocked.tiles[0].hasPirate = true;
  assert.equal(validateGameAction(pirateBlocked, action).ok, false);

  const closed = shipMoveState();
  closed.edges[5] = { ...closed.edges[5], hasShip: true, shipPlayerId: 'p1' };
  assert.equal(validateGameAction(closed, action).ok, false);

  const landlocked = shipMoveState();
  landlocked.tiles = [];
  assert.equal(validateGameAction(landlocked, action).ok, false);
});
