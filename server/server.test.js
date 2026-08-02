const test = require('node:test');
const assert = require('node:assert/strict');
const { io: createClient } = require('socket.io-client');
const { createCatanServer } = require('./server');

const emitAck = (socket, event, payload) => new Promise(resolve => socket.emit(event, payload, resolve));
const once = (socket, event, timeout = 1500) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeout);
  socket.once(event, value => { clearTimeout(timer); resolve(value); });
});

test('room lifecycle rejects phantoms, authorizes actions and migrates host', async t => {
  const server = createCatanServer();
  await new Promise(resolve => server.httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = server.httpServer.address();
  const url = `http://127.0.0.1:${port}`;
  const host = createClient(url, { transports: ['websocket'], forceNew: true });
  const guest = createClient(url, { transports: ['websocket'], forceNew: true });
  t.after(async () => {
    host.disconnect();
    guest.disconnect();
    await new Promise(resolve => server.io.close(() => server.httpServer.close(resolve)));
  });
  await Promise.all([once(host, 'connect'), once(guest, 'connect')]);

  const missing = await emitAck(guest, 'join_room', { roomId: 'CATAN-NONE', playerName: 'Guest' });
  assert.equal(missing.success, false);
  assert.equal(missing.code, 'ROOM_NOT_FOUND');
  assert.equal(server.activeRooms.size, 0);

  const roomId = 'CATAN-TEST1';
  const created = await emitAck(host, 'create_room', {
    roomId, hostName: 'Host', expansion: 'BASE', scenario: 'HEADING_FOR_NEW_SHORES', boardType: 'RANDOM', maxPlayers: 2,
  });
  assert.equal(created.success, true);
  const hostJoin = await emitAck(host, 'join_room', { roomId, playerName: 'Host' });
  const guestJoin = await emitAck(guest, 'join_room', { roomId, playerName: 'Guest' });
  assert.equal(hostJoin.assignedPlayerId, 'p1');
  assert.equal(guestJoin.assignedPlayerId, 'p2');

  host.emit('start_game', { roomId, gameStartData: {
    players: [{ id: 'p1' }, { id: 'p2' }], boardData: { tiles: [], vertices: [], edges: [] },
    initialState: {
      gamePhase: 'SETUP_ROUND_1', turnSubPhase: 'BEFORE_ROLL', currentPlayerIndex: 0,
      players: [
        { id: 'p1', resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }, developmentCards: {} },
        { id: 'p2', resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }, developmentCards: {} },
      ],
      vertices: [], edges: [], tiles: [], resourceBank: { WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 },
      devCardDeck: [
        ...Array(14).fill('KNIGHT'), ...Array(5).fill('VICTORY_POINT'),
        ...Array(2).fill('ROAD_BUILDING'), ...Array(2).fill('YEAR_OF_PLENTY'), ...Array(2).fill('MONOPOLY'),
      ], goldCoins: {}, goldSelectionQueue: [],
    },
  }});
  await once(guest, 'game_started');
  const liveRoom = server.activeRooms.get(roomId);
  liveRoom.gameState.gamePhase = 'MAIN_GAME';
  liveRoom.gameState.turnSubPhase = 'BEFORE_ROLL';

  const unauthorized = await emitAck(guest, 'send_game_action', {
    roomId, action: { type: 'ROLL_DICE', playerId: 'p1' },
  });
  assert.equal(unauthorized.success, false);
  assert.equal(unauthorized.code, 'UNAUTHORIZED');

  const approvedEvent = once(guest, 'receive_game_action');
  const snapshotEvent = once(guest, 'game_state_snapshot');
  const approved = await emitAck(host, 'send_game_action', {
    roomId, action: { type: 'ROLL_DICE', playerId: 'p1' },
  });
  assert.equal(approved.success, true);
  const diceEnvelope = await approvedEvent;
  assert.equal(diceEnvelope.sequence, 1);
  assert.equal(diceEnvelope.action.diceValues.length, 2);
  assert.ok(diceEnvelope.action.diceValues.every(value => value >= 1 && value <= 6));
  assert.equal((await snapshotEvent).sequence, 1);

  const forgedOutcome = await emitAck(host, 'send_game_action', {
    roomId, action: { type: 'ROLL_DICE', playerId: 'p1', diceValues: [6, 6] },
  });
  assert.equal(forgedOutcome.success, false);
  assert.equal(forgedOutcome.code, 'INVALID_ACTION');

  liveRoom.gameState.turnSubPhase = 'ROBBER_STEAL';
  liveRoom.gameState.pendingRobberType = 'ROBBER';
  liveRoom.gameState.tiles = [{ id: 'land', type: 'WOOD', hasRobber: true, coord: { q: 0, r: 0, s: 0 } }];
  liveRoom.gameState.vertices = [{ id: 'v_52_-30', structure: 'SETTLEMENT', playerId: 'p2' }];
  liveRoom.gameState.players[1].resources.WOOD = 1;
  liveRoom.gameState.resourceBank.WOOD = 18;
  const theftEvent = once(guest, 'receive_game_action');
  const theft = await emitAck(host, 'send_game_action', {
    roomId, action: { type: 'STEAL_RESOURCE', playerId: 'p1', victimPlayerId: 'p2' },
  });
  assert.equal(theft.success, true);
  const theftEnvelope = await theftEvent;
  assert.equal(theftEnvelope.action.stolenResource, 'WOOD');
  assert.equal(liveRoom.gameState.players[0].resources.WOOD, 1);
  assert.equal(liveRoom.gameState.players[1].resources.WOOD, 0);

  const overwrite = await emitAck(host, 'sync_game_state', { roomId, snapshot: liveRoom.gameState });
  assert.equal(overwrite.success, false);
  assert.equal(overwrite.code, 'SERVER_AUTHORITATIVE');

  const hostChanged = once(guest, 'host_changed');
  host.disconnect();
  const migration = await hostChanged;
  assert.equal(migration.hostPlayerId, 'p2');
  assert.equal(server.activeRooms.get(roomId).hostSocketId, guest.id);
});

test('pauses a disconnected active turn, hands it to a hard bot, and restores the returning player', async t => {
  const server = createCatanServer({ disconnectedTurnPauseMs: 80 });
  await new Promise(resolve => server.httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = server.httpServer.address();
  const url = `http://127.0.0.1:${port}`;
  const host = createClient(url, { transports: ['websocket'], forceNew: true });
  const guest = createClient(url, { transports: ['websocket'], forceNew: true });
  let resumed;
  t.after(async () => {
    host.disconnect();
    guest.disconnect();
    resumed?.disconnect();
    await new Promise(resolve => server.io.close(() => server.httpServer.close(resolve)));
  });
  await Promise.all([once(host, 'connect'), once(guest, 'connect')]);

  const roomId = 'CATAN-PAUSE1';
  assert.equal((await emitAck(host, 'create_room', {
    roomId, hostName: 'Host', expansion: 'BASE', scenario: 'HEADING_FOR_NEW_SHORES', boardType: 'RANDOM', maxPlayers: 2,
  })).success, true);
  const hostJoin = await emitAck(host, 'join_room', { roomId, playerName: 'Host' });
  const guestJoin = await emitAck(guest, 'join_room', { roomId, playerName: 'Guest' });

  const started = once(guest, 'game_started');
  host.emit('start_game', { roomId, gameStartData: {
    players: [{ id: 'p1' }, { id: 'p2' }], boardData: { tiles: [], vertices: [], edges: [] },
    initialState: {
      gamePhase: 'SETUP_ROUND_1', turnSubPhase: 'BEFORE_ROLL', currentPlayerIndex: 1,
      players: [
        { id: 'p1', name: 'Host', isBot: false, resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }, developmentCards: {} },
        { id: 'p2', name: 'Guest', isBot: false, resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }, developmentCards: {} },
      ],
      vertices: [], edges: [], tiles: [], resourceBank: { WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 },
      devCardDeck: [
        ...Array(14).fill('KNIGHT'), ...Array(5).fill('VICTORY_POINT'),
        ...Array(2).fill('ROAD_BUILDING'), ...Array(2).fill('YEAR_OF_PLENTY'), ...Array(2).fill('MONOPOLY'),
      ], goldCoins: {}, goldSelectionQueue: [],
    },
  }});
  await started;
  const room = server.activeRooms.get(roomId);
  room.gameState.gamePhase = 'MAIN_GAME';
  room.gameState.turnSubPhase = 'BEFORE_ROLL';

  const paused = once(host, 'turn_paused_for_reconnect');
  const takeover = once(host, 'player_taken_over_by_bot');
  guest.disconnect();
  assert.deepEqual(await paused, { playerId: 'p2', playerName: 'Guest', remainingMs: 80 });

  const rejectedWhilePaused = await emitAck(host, 'send_game_action', {
    roomId, action: { type: 'ROLL_DICE', playerId: 'p1' },
  });
  assert.equal(rejectedWhilePaused.code, 'TURN_PAUSED_FOR_RECONNECT');
  assert.equal((await takeover).difficulty, 'HARD');
  assert.equal(room.gameState.players[1].isBot, true);
  assert.equal(room.gameState.players[1].difficulty, 'HARD');

  resumed = createClient(url, { transports: ['websocket'], forceNew: true });
  await once(resumed, 'connect');
  const restored = once(host, 'player_returned_from_bot');
  const resumeJoin = await emitAck(resumed, 'join_room', {
    roomId,
    playerName: 'Guest',
    requestedPlayerId: guestJoin.assignedPlayerId,
    sessionToken: guestJoin.sessionToken,
  });
  assert.equal(resumeJoin.success, true);
  assert.equal((await restored).playerId, 'p2');
  assert.equal(room.gameState.players[1].isBot, false);
  assert.equal(room.gameState.players[1].difficulty, undefined);
  assert.equal(hostJoin.assignedPlayerId, 'p1');
});
