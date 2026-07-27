const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// הגדרת Socket.io עם הרשאות CORS פתוחות
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// זיכרון מקומי בשרת לניהול רשימת החדרים הפתוחים ברשת
const activeRooms = new Map();

console.log('🚀 שרת Catan Relay מתאתחל...');

io.on('connection', (socket) => {
  console.log(`🔌 שחקן התחבר: ${socket.id}`);

  // helper to get public rooms list with dynamically adjusted max players based on locked slots
  const getPublicRoomsList = () => {
    return Array.from(activeRooms.values())
      .filter(r => r.status === 'WAITING')
      .map(r => {
        const lockedCount = r.slots ? r.slots.filter(s => s.status === 'LOCKED_BOT').length : 0;
        return {
          ...r,
          maxPlayers: Math.max(1, r.maxPlayers - lockedCount)
        };
      });
  };

  // 1. בקשת רשימת חדרים פתוחים מכלל הלקוחות
  socket.on('get_public_rooms', () => {
    socket.emit('public_rooms_list', getPublicRoomsList());
  });

  // 2. יצירת חדר חדש עם מטא-דתה מלאה (Host)
  socket.on('create_room', (roomData) => {
    const { roomId, hostName, expansion, scenario, boardType, maxPlayers } = roomData;
    
    activeRooms.set(roomId, {
      roomId,
      hostName,
      expansion: expansion || 'BASE',
      scenario: scenario || 'HEADING_FOR_NEW_SHORES',
      boardType: boardType || 'RANDOM',
      currentPlayers: 1,
      maxPlayers: maxPlayers || 4,
      status: 'WAITING',
      slots: [
        { id: 'p1', status: 'OPEN' },
        { id: 'p2', status: 'OPEN' },
        { id: 'p3', status: 'OPEN' },
        { id: 'p4', status: 'OPEN' }
      ]
    });

    console.log(`🏠 נוצר חדר חדש: ${roomId} ע"י ${hostName}`);
    // עדכון כל הלקוחות המחוברים ברשימת החדרים החדשה
    io.emit('public_rooms_list', getPublicRoomsList());
  });

  // 3. הצטרפות לחדר משחק דינמי
  socket.on('join_room', ({ roomId, playerName }, callback) => {
    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);
      const totalSlots = room.maxPlayers || 4;
      const lockedSlotsCount = room.slots ? room.slots.filter(s => s.status === 'LOCKED_BOT').length : 0;
      const maxHumanPlayers = totalSlots - lockedSlotsCount;
      
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      const currentHumanPlayers = roomSockets ? roomSockets.size : 0;

      if (currentHumanPlayers >= maxHumanPlayers) {
        console.log(`⚠️ הצטרפות נדחתה: חדר ${roomId} מלא בשל סלוטים נעולים לבוטים (${currentHumanPlayers}/${maxHumanPlayers} אנושיים)`);
        socket.emit('join_failed', { message: 'החדר מלא או נעול על ידי בוטים' });
        if (callback) {
          callback({ success: false, message: 'החדר מלא או נעול על ידי בוטים' });
        }
        return;
      }
    }

    socket.join(roomId);
    console.log(`👤 ${playerName} (${socket.id}) הצטרף לחדר: ${roomId}`);

    let assignedPlayerId = 'p2';

    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);
      
      const hostSlot = room.slots.find(s => s.id === 'p1');
      if (hostSlot && (!hostSlot.socketId || hostSlot.socketId === socket.id)) {
        hostSlot.socketId = socket.id;
        assignedPlayerId = 'p1';
      } else {
        const availableSlot = room.slots.find(s => s.status === 'OPEN' && !s.socketId);
        if (availableSlot) {
          availableSlot.socketId = socket.id;
          assignedPlayerId = availableSlot.id;
        } else {
          const firstOpenSlot = room.slots.find(s => s.status === 'OPEN');
          if (firstOpenSlot) {
            firstOpenSlot.socketId = socket.id;
            assignedPlayerId = firstOpenSlot.id;
          }
        }
      }

      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      room.currentPlayers = roomSockets ? roomSockets.size : room.currentPlayers;
      activeRooms.set(roomId, room);
      io.emit('public_rooms_list', getPublicRoomsList());
    }

    // דיווח לשאר השחקנים בחדר
    socket.to(roomId).emit('player_joined', { playerId: socket.id, playerName, assignedPlayerId });

    if (callback) {
      callback({ success: true, assignedPlayerId });
    }
  });

  // 4. קבלת GameAction משחקן אחד ושידורו בלעדית לשאר השחקנים בחדר
  socket.on('send_game_action', ({ roomId, action }) => {
    console.log(`🎲 פעולה התקבלה בחדר ${roomId}:`, action.type);
    socket.to(roomId).emit('receive_game_action', action);
  });

  // 5. קבלת עדכון הגדרות לובי ושידור לכל שאר השחקנים בחדר
  socket.on('game_settings_update', ({ roomId, settings }) => {
    console.log(`⚙️ עדכון הגדרות התקבל עבור חדר ${roomId}`);
    if (activeRooms.has(roomId) && settings.lobbyPlayers) {
      const room = activeRooms.get(roomId);
      room.slots = settings.lobbyPlayers.map(p => ({
        id: p.id,
        status: (p.playerType === 'LOCAL_BOT' || p.playerType === 'GEMINI_AI') ? 'LOCKED_BOT' : 'OPEN'
      }));
      activeRooms.set(roomId, room);
      io.emit('public_rooms_list', getPublicRoomsList());
    }
    socket.to(roomId).emit('game_settings_updated', settings);
  });

  // עדכון סטטוס סלוט שחקן בודד
  socket.on('update_slot_status', ({ roomId, slotId, status }) => {
    console.log(`⚙️ עדכון סטטוס סלוט התקבל עבור חדר ${roomId}: ${slotId} -> ${status}`);
    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);
      if (!room.slots) {
        room.slots = [];
      }
      const existingSlot = room.slots.find(s => s.id === slotId);
      if (existingSlot) {
        existingSlot.status = status;
      } else {
        room.slots.push({ id: slotId, status });
      }
      activeRooms.set(roomId, room);
      io.emit('public_rooms_list', getPublicRoomsList());
    }
  });

  // 6. קבלת אירוע התחלת משחק והפצת הלוח ההתחלתי לכל השחקנים בחדר
  socket.on('start_game', ({ roomId, gameStartData }) => {
    console.log(`🎮 אירוע התחלת משחק התקבל עבור חדר ${roomId}`);
    
    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);
      room.status = 'IN_GAME';
      activeRooms.set(roomId, room);
      io.emit('public_rooms_list', Array.from(activeRooms.values()).filter(r => r.status === 'WAITING'));
    }

    socket.to(roomId).emit('game_started', gameStartData);
  });

  // 7. מערכת צ'אט בזמן אמת
  socket.on('send_chat_message', ({ roomId, message }) => {
    console.log(`💬 הודעת צ'אט בחדר ${roomId} מאת ${message.sender}: ${message.text}`);
    socket.to(roomId).emit('receive_chat_message', message);
  });

  socket.on('disconnect', () => {
    console.log(`❌ שחקן התנתק: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ שרת Catan מורץ בהצלחה על פורט ${PORT}`);
});