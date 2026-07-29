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

test('rejects malformed dice and forged action types', () => {
  assert.equal(validateActionShape({ type: 'ROLL_DICE', playerId: 'p1', diceValues: [0, 7] }).ok, false);
  assert.equal(validateActionShape({ type: 'ADMIN_WIN', playerId: 'p1' }).ok, false);
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
