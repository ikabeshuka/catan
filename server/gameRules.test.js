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
