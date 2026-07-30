const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { validateActionShape, validateGameAction, applyReservedAction, DEV_CARD_TYPES, RESOURCE_TYPES } = require('./gameRules');

const DEFAULT_PORT = 3001;
const RECONNECT_GRACE_MS = Number(process.env.RECONNECT_GRACE_MS || 15000);
const MAX_PAYLOAD_BYTES = 512 * 1024;
const ROOM_ID_PATTERN = /^CATAN-[A-Z0-9]{4,12}$/;
const SLOT_STATUSES = new Set(['OPEN', 'LOCKED_BOT']);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://catan-32o1.onrender.com,http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(value => value.trim()).filter(Boolean);

const isPlainObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isShortString = (value, max = 80) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const clone = value => JSON.parse(JSON.stringify(value));
const createSessionToken = () => crypto.randomBytes(24).toString('hex');
const payloadFits = value => {
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_PAYLOAD_BYTES; } catch { return false; }
};
const STANDARD_DEV_COUNTS = { KNIGHT: 14, VICTORY_POINT: 5, ROAD_BUILDING: 2, YEAR_OF_PLENTY: 2, MONOPOLY: 2 };
const validateRuntimeGameState = (state, room) => {
  if (!isPlainObject(state) || !Array.isArray(state.players) || state.players.length < 2 || state.players.length > room.maxPlayers ||
      !Array.isArray(state.tiles) || !Array.isArray(state.vertices) || !Array.isArray(state.edges) ||
      !Number.isInteger(state.currentPlayerIndex) || state.currentPlayerIndex < 0 || state.currentPlayerIndex >= state.players.length ||
      !['SETUP_ROUND_1', 'SETUP_ROUND_2', 'MAIN_GAME', 'GAME_OVER'].includes(state.gamePhase) ||
      !isPlainObject(state.resourceBank) || !Array.isArray(state.devCardDeck)) return false;
  const playerIds = state.players.map(player => player?.id);
  if (new Set(playerIds).size !== playerIds.length || playerIds.some((id, index) => id !== `p${index + 1}`)) return false;
  if (state.players.some(player => !isPlainObject(player.resources) || RESOURCE_TYPES.some(resource =>
    !Number.isInteger(player.resources[resource]) || player.resources[resource] < 0))) return false;
  if (RESOURCE_TYPES.some(resource => !Number.isInteger(state.resourceBank[resource]) || state.resourceBank[resource] < 0 ||
      state.resourceBank[resource] + state.players.reduce((sum, player) => sum + player.resources[resource], 0) !== 19)) return false;
  return state.devCardDeck.every(card => DEV_CARD_TYPES.includes(card));
};
const validateInitialGameState = (state, room) => {
  if (!validateRuntimeGameState(state, room) || !['SETUP_ROUND_1', 'SETUP_ROUND_2'].includes(state.gamePhase) || state.devCardDeck.length !== 25) return false;
  const playerIds = state.players.map(player => player?.id);
  if (new Set(playerIds).size !== playerIds.length || playerIds.some((id, index) => id !== `p${index + 1}`)) return false;
  if (state.players.some(player => !isPlainObject(player.resources) || RESOURCE_TYPES.some(resource =>
    !Number.isInteger(player.resources[resource]) || player.resources[resource] < 0))) return false;
  if (RESOURCE_TYPES.some(resource => !Number.isInteger(state.resourceBank[resource]) || state.resourceBank[resource] < 0)) return false;
  const deckCounts = Object.fromEntries(DEV_CARD_TYPES.map(type => [type, 0]));
  for (const card of state.devCardDeck) {
    if (!DEV_CARD_TYPES.includes(card)) return false;
    deckCounts[card] += 1;
  }
  return DEV_CARD_TYPES.every(type => deckCounts[type] === STANDARD_DEV_COUNTS[type]);
};

function createCatanServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed'));
      },
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: MAX_PAYLOAD_BYTES,
  });
  const activeRooms = new Map();

  app.get('/health', (_request, response) => response.json({ ok: true, rooms: activeRooms.size }));

  const getConnectedRoomPlayers = room => (room.slots || [])
    .filter(slot => Boolean(slot.socketId))
    .map(slot => ({ playerId: slot.id, playerName: slot.playerName || 'שחקן' }));

  const getPublicRoomsList = () => Array.from(activeRooms.values())
    .filter(room => room.status === 'WAITING')
    .map(room => {
      const lockedCount = room.slots.filter(slot => slot.status === 'LOCKED_BOT').length;
      return {
        roomId: room.roomId,
        hostName: room.hostName,
        expansion: room.expansion,
        scenario: room.scenario,
        boardType: room.boardType,
        currentPlayers: room.currentPlayers,
        maxPlayers: Math.max(1, room.maxPlayers - lockedCount),
        status: room.status,
      };
    });

  const emitError = (socket, event, message, details = {}) => socket.emit(event, { message, ...details });

  const clearDisconnectTimer = slot => {
    if (slot?.disconnectTimer) clearTimeout(slot.disconnectTimer);
    if (slot) delete slot.disconnectTimer;
  };

  const broadcastRoomState = room => {
    room.currentPlayers = getConnectedRoomPlayers(room).length;
    io.to(room.roomId).emit('room_players_updated', getConnectedRoomPlayers(room));
    io.emit('public_rooms_list', getPublicRoomsList());
  };

  const migrateHost = room => {
    const nextHostSlot = room.slots.find(slot => slot.socketId && io.sockets.sockets.has(slot.socketId));
    if (!nextHostSlot) return;
    room.hostSocketId = nextHostSlot.socketId;
    room.hostName = nextHostSlot.playerName || room.hostName;
    const update = { roomId: room.roomId, hostPlayerId: nextHostSlot.id, hostName: room.hostName };
    io.to(room.roomId).emit('host_changed', update);
    io.to(room.roomId).emit('room_updated', {
      ...update,
      currentPlayers: room.currentPlayers,
      players: getConnectedRoomPlayers(room),
      status: room.status,
    });
  };

  const releaseSocketFromRoom = (socket, roomId, immediate = false) => {
    const room = activeRooms.get(roomId);
    if (!room) return;
    const slot = room.slots.find(candidate => candidate.socketId === socket.id);
    if (!slot) return;
    slot.socketId = null;
    slot.disconnectedAt = Date.now();
    room.currentPlayers = getConnectedRoomPlayers(room).length;
    if (room.hostSocketId === socket.id && room.currentPlayers > 0) migrateHost(room);
    activeRooms.set(roomId, room);
    broadcastRoomState(room);

    const finalize = () => {
      clearDisconnectTimer(slot);
      if (slot.socketId) return;
      const wasHost = room.hostSocketId === socket.id;
      slot.playerName = null;
      slot.sessionToken = null;
      delete slot.disconnectedAt;
      room.currentPlayers = getConnectedRoomPlayers(room).length;
      if (room.currentPlayers === 0) {
        activeRooms.delete(roomId);
        io.emit('public_rooms_list', getPublicRoomsList());
        return;
      }
      if (wasHost) migrateHost(room);
      activeRooms.set(roomId, room);
      io.to(roomId).emit('player_left', {
        playerId: slot.id,
        playerName: socket.data.playerName || 'שחקן',
        currentPlayers: room.currentPlayers,
        players: getConnectedRoomPlayers(room),
      });
      broadcastRoomState(room);
    };

    if (immediate) finalize();
    else {
      slot.disconnectTimer = setTimeout(finalize, RECONNECT_GRACE_MS);
      slot.disconnectTimer.unref?.();
    }
  };

  io.on('connection', socket => {
    socket.on('get_public_rooms', () => socket.emit('public_rooms_list', getPublicRoomsList()));

    socket.on('create_room', (roomData = {}, callback) => {
      if (!isPlainObject(roomData) || !ROOM_ID_PATTERN.test(roomData.roomId || '') ||
          !isShortString(roomData.hostName, 40) || !Number.isInteger(roomData.maxPlayers) ||
          roomData.maxPlayers < 2 || roomData.maxPlayers > 4) {
        const error = { success: false, code: 'INVALID_REQUEST', message: 'נתוני החדר אינם תקינים' };
        callback?.(error); emitError(socket, 'invalid_request', error.message); return;
      }
      if (activeRooms.has(roomData.roomId)) {
        const error = { success: false, code: 'ROOM_EXISTS', message: 'מזהה החדר כבר קיים; נסו שוב' };
        callback?.(error); emitError(socket, 'room_exists', error.message, { roomId: roomData.roomId }); return;
      }
      const slots = Array.from({ length: 4 }, (_, index) => ({ id: `p${index + 1}`, status: 'OPEN' }));
      activeRooms.set(roomData.roomId, {
        roomId: roomData.roomId,
        hostName: roomData.hostName.trim(),
        hostSocketId: socket.id,
        expansion: isShortString(roomData.expansion) ? roomData.expansion : 'BASE',
        scenario: isShortString(roomData.scenario) ? roomData.scenario : 'HEADING_FOR_NEW_SHORES',
        boardType: isShortString(roomData.boardType) ? roomData.boardType : 'RANDOM',
        currentPlayers: 0,
        maxPlayers: roomData.maxPlayers,
        status: 'WAITING',
        slots,
        actionSequence: 0,
        gameState: null,
      });
      callback?.({ success: true });
      io.emit('public_rooms_list', getPublicRoomsList());
    });

    socket.on('join_room', (payload = {}, callback) => {
      if (!isPlainObject(payload) || !ROOM_ID_PATTERN.test(payload.roomId || '') || !isShortString(payload.playerName, 40)) {
        callback?.({ success: false, code: 'INVALID_REQUEST', message: 'בקשת ההצטרפות אינה תקינה' }); return;
      }
      const { roomId, playerName, sessionToken, requestedPlayerId } = payload;
      const room = activeRooms.get(roomId);
      if (!room) {
        const error = { roomId, message: 'החדר המבוקש לא נמצא' };
        socket.emit('room_not_found', error); callback?.({ success: false, code: 'ROOM_NOT_FOUND', ...error }); return;
      }

      if (socket.data.roomId && socket.data.roomId !== roomId) {
        releaseSocketFromRoom(socket, socket.data.roomId, true);
        socket.leave(socket.data.roomId);
      }

      const eligibleSlots = room.slots.slice(0, room.maxPlayers);
      let assignedSlot = eligibleSlots.find(slot => slot.socketId === socket.id);
      const resumedSlot = isShortString(sessionToken, 100) && isShortString(requestedPlayerId, 10)
        ? eligibleSlots.find(slot => slot.id === requestedPlayerId && slot.sessionToken === sessionToken)
        : null;
      if (!assignedSlot && resumedSlot) assignedSlot = resumedSlot;
      if (!assignedSlot && room.status === 'IN_GAME') {
        callback?.({ success: false, code: 'GAME_IN_PROGRESS', message: 'לא ניתן להצטרף למשחק שכבר התחיל' }); return;
      }
      if (!assignedSlot && socket.id === room.hostSocketId) assignedSlot = eligibleSlots[0];
      if (!assignedSlot) assignedSlot = eligibleSlots.find(slot => slot.status === 'OPEN' && !slot.socketId && !slot.sessionToken);
      if (!assignedSlot) {
        callback?.({ success: false, code: 'ROOM_FULL', message: 'החדר מלא או נעול' }); return;
      }

      clearDisconnectTimer(assignedSlot);
      assignedSlot.socketId = socket.id;
      assignedSlot.playerName = playerName.trim();
      assignedSlot.sessionToken ||= createSessionToken();
      delete assignedSlot.disconnectedAt;
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.assignedPlayerId = assignedSlot.id;
      socket.data.playerName = assignedSlot.playerName;
      socket.data.sessionToken = assignedSlot.sessionToken;
      if (resumedSlot && room.hostSocketId && !io.sockets.sockets.has(room.hostSocketId) && assignedSlot.id === 'p1') {
        room.hostSocketId = socket.id;
      }
      activeRooms.set(roomId, room);
      broadcastRoomState(room);
      socket.to(roomId).emit('player_joined', { playerId: assignedSlot.id, playerName: assignedSlot.playerName });
      callback?.({
        success: true,
        assignedPlayerId: assignedSlot.id,
        sessionToken: assignedSlot.sessionToken,
        resumed: Boolean(resumedSlot),
        isHost: room.hostSocketId === socket.id,
        gameState: resumedSlot ? room.gameState : null,
        actionSequence: room.actionSequence,
      });
    });

    socket.on('send_game_action', (payload = {}, callback) => {
      if (!isPlainObject(payload) || !isShortString(payload.roomId, 32) || !payloadFits(payload)) {
        callback?.({ success: false, code: 'INVALID_REQUEST', message: 'בקשת הפעולה אינה תקינה' }); return;
      }
      const room = activeRooms.get(payload.roomId);
      if (!room) { callback?.({ success: false, code: 'ROOM_NOT_FOUND', message: 'החדר לא נמצא' }); return; }
      const slot = room.slots.find(candidate => candidate.socketId === socket.id);
      if (!slot || !socket.rooms.has(payload.roomId) || socket.data.roomId !== payload.roomId || payload.action?.playerId !== slot.id) {
        callback?.({ success: false, code: 'UNAUTHORIZED', message: 'אין הרשאה לבצע פעולה זו' }); return;
      }
      const shape = validateActionShape(payload.action);
      if (!shape.ok) { callback?.({ success: false, code: 'INVALID_ACTION', message: shape.message }); return; }
      const approvedAction = clone(payload.action);
      if (approvedAction.type === 'ROLL_DICE') {
        approvedAction.diceValues = [crypto.randomInt(1, 7), crypto.randomInt(1, 7)];
      } else if (approvedAction.type === 'STEAL_RESOURCE') {
        const victim = room.gameState?.players?.find(candidate => candidate.id === approvedAction.victimPlayerId);
        const availableCards = [];
        RESOURCE_TYPES.forEach(resource => {
          for (let count = 0; count < (victim?.resources?.[resource] || 0); count += 1) availableCards.push(resource);
        });
        if (availableCards.length === 0) {
          callback?.({ success: false, code: 'ILLEGAL_ACTION', message: 'The victim has no resource cards' }); return;
        }
        approvedAction.stolenResource = availableCards[crypto.randomInt(availableCards.length)];
      }
      const legality = validateGameAction(room.gameState, approvedAction);
      if (!legality.ok) { callback?.({ success: false, code: 'ILLEGAL_ACTION', message: legality.message }); return; }

      applyReservedAction(room.gameState, approvedAction);
      if (approvedAction.type === 'MOVE_ROBBER') {
        approvedAction.eligibleVictimPlayerIds = [...(room.gameState.eligibleStealPlayerIds || [])];
        approvedAction.hasEligibleVictims = approvedAction.eligibleVictimPlayerIds.length > 0;
      }
      room.actionSequence += 1;
      activeRooms.set(payload.roomId, room);
      io.to(payload.roomId).emit('receive_game_action', { action: approvedAction, sequence: room.actionSequence });
      io.to(payload.roomId).emit('game_state_snapshot', { snapshot: clone(room.gameState), sequence: room.actionSequence });
      callback?.({ success: true, sequence: room.actionSequence });
    });

    socket.on('sync_game_state', (payload = {}, callback) => {
      if (!isPlainObject(payload) || !isShortString(payload.roomId, 32) || !isPlainObject(payload.snapshot) || !payloadFits(payload)) {
        callback?.({ success: false, code: 'INVALID_REQUEST' }); return;
      }
      const room = activeRooms.get(payload.roomId);
      if (!room || room.hostSocketId !== socket.id || socket.data.roomId !== payload.roomId) {
        callback?.({ success: false, code: 'UNAUTHORIZED' }); return;
      }
      if (room.status === 'IN_GAME') {
        callback?.({ success: false, code: 'SERVER_AUTHORITATIVE' }); return;
      }
      if (!validateRuntimeGameState(payload.snapshot, room)) {
        callback?.({ success: false, code: 'INVALID_STATE' }); return;
      }
      room.gameState = clone(payload.snapshot);
      activeRooms.set(payload.roomId, room);
      socket.to(payload.roomId).emit('game_state_snapshot', { snapshot: room.gameState, sequence: room.actionSequence });
      callback?.({ success: true, sequence: room.actionSequence });
    });

    socket.on('request_game_state', (payload = {}, callback) => {
      const room = activeRooms.get(payload.roomId);
      const slot = room?.slots.find(candidate => candidate.socketId === socket.id);
      if (!room || !slot || socket.data.roomId !== payload.roomId) { callback?.({ success: false }); return; }
      callback?.({ success: true, snapshot: room.gameState, sequence: room.actionSequence });
    });

    socket.on('game_settings_update', (payload = {}) => {
      const room = activeRooms.get(payload.roomId);
      if (!room) { emitError(socket, 'room_not_found', 'החדר לא נמצא', { roomId: payload.roomId }); return; }
      if (room.hostSocketId !== socket.id || room.status !== 'WAITING') { emitError(socket, 'authorization_error', 'רק המארח רשאי לעדכן הגדרות'); return; }
      if (!isPlainObject(payload.settings) || !payloadFits(payload.settings)) { emitError(socket, 'invalid_request', 'הגדרות לא תקינות'); return; }
      if (Array.isArray(payload.settings.lobbyPlayers)) {
        const previous = room.slots;
        room.slots = payload.settings.lobbyPlayers.slice(0, room.maxPlayers).map((player, index) => {
          const oldSlot = previous.find(slot => slot.id === player.id) || previous[index] || {};
          return {
            id: `p${index + 1}`,
            status: player.playerType === 'LOCAL_BOT' || player.playerType === 'GEMINI_AI' ? 'LOCKED_BOT' : 'OPEN',
            socketId: oldSlot.socketId,
            sessionToken: oldSlot.sessionToken,
            playerName: oldSlot.playerName,
          };
        });
      }
      activeRooms.set(payload.roomId, room);
      socket.to(payload.roomId).emit('game_settings_updated', payload.settings);
      broadcastRoomState(room);
    });

    socket.on('update_slot_status', (payload = {}) => {
      const room = activeRooms.get(payload.roomId);
      if (!room || room.hostSocketId !== socket.id || room.status !== 'WAITING') { emitError(socket, 'authorization_error', 'רק המארח רשאי לשנות סלוטים'); return; }
      if (!isShortString(payload.slotId, 10) || !SLOT_STATUSES.has(payload.status)) { emitError(socket, 'invalid_request', 'סטטוס סלוט אינו תקין'); return; }
      const slot = room.slots.find(candidate => candidate.id === payload.slotId);
      if (!slot || slot.socketId || slot.id === 'p1') { emitError(socket, 'invalid_request', 'לא ניתן לשנות סלוט זה'); return; }
      slot.status = payload.status;
      activeRooms.set(payload.roomId, room);
      broadcastRoomState(room);
    });

    socket.on('start_game', (payload = {}) => {
      const room = activeRooms.get(payload.roomId);
      if (!room) { emitError(socket, 'room_not_found', 'החדר לא נמצא'); return; }
      if (room.hostSocketId !== socket.id || room.status !== 'WAITING') { emitError(socket, 'authorization_error', 'רק המארח רשאי להתחיל את המשחק'); return; }
      if (!isPlainObject(payload.gameStartData) || !isPlainObject(payload.gameStartData.initialState) || !payloadFits(payload.gameStartData)) {
        emitError(socket, 'invalid_request', 'נתוני פתיחת המשחק אינם תקינים'); return;
      }
      if (!validateInitialGameState(payload.gameStartData.initialState, room)) {
        emitError(socket, 'invalid_request', 'מצב המשחק ההתחלתי אינו חוקי'); return;
      }
      room.status = 'IN_GAME';
      room.gameState = clone(payload.gameStartData.initialState);
      room.actionSequence = 0;
      activeRooms.set(payload.roomId, room);
      io.emit('public_rooms_list', getPublicRoomsList());
      socket.to(payload.roomId).emit('game_started', payload.gameStartData);
    });

    socket.on('send_chat_message', (payload = {}) => {
      const room = activeRooms.get(payload.roomId);
      const slot = room?.slots.find(candidate => candidate.socketId === socket.id);
      if (!room || !slot || socket.data.roomId !== payload.roomId || !isPlainObject(payload.message) || !isShortString(payload.message.text, 500)) {
        emitError(socket, 'invalid_request', 'הודעת הצ׳אט אינה תקינה'); return;
      }
      const safeMessage = {
        text: payload.message.text.trim(),
        sender: slot.playerName || 'שחקן',
        color: typeof payload.message.color === 'string' ? payload.message.color.slice(0, 32) : undefined,
        time: new Date().toISOString(),
      };
      io.to(payload.roomId).emit('receive_chat_message', safeMessage);
    });

    socket.on('leave_room', (payload = {}) => {
      if (isShortString(payload.roomId, 32)) {
        releaseSocketFromRoom(socket, payload.roomId, true);
        socket.leave(payload.roomId);
      }
      socket.data.roomId = null;
      socket.data.assignedPlayerId = null;
    });

    socket.on('disconnect', () => {
      if (socket.data.roomId) releaseSocketFromRoom(socket, socket.data.roomId, false);
    });
  });

  return { app, httpServer, io, activeRooms };
}

if (require.main === module) {
  const { httpServer } = createCatanServer();
  const port = Number(process.env.PORT || DEFAULT_PORT);
  httpServer.listen(port, () => console.log(`Catan server listening on port ${port}`));
}

module.exports = { createCatanServer };
