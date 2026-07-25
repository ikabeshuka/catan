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

  // 1. בקשת רשימת חדרים פתוחים מכלל הלקוחות
  socket.on('get_public_rooms', () => {
    const roomsList = Array.from(activeRooms.values()).filter(r => r.status === 'WAITING');
    socket.emit('public_rooms_list', roomsList);
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
    });

    console.log(`🏠 נוצר חדר חדש: ${roomId} ע"י ${hostName}`);
    // עדכון כל הלקוחות המחוברים ברשימת החדרים החדשה
    io.emit('public_rooms_list', Array.from(activeRooms.values()).filter(r => r.status === 'WAITING'));
  });

  // 3. הצטרפות לחדר משחק דינמי
  socket.on('join_room', ({ roomId, playerName }) => {
    socket.join(roomId);
    console.log(`👤 ${playerName} (${socket.id}) הצטרף לחדר: ${roomId}`);

    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);
      const roomSockets = io.sockets.adapter.rooms.get(roomId);
      room.currentPlayers = roomSockets ? roomSockets.size : room.currentPlayers;
      activeRooms.set(roomId, room);
      io.emit('public_rooms_list', Array.from(activeRooms.values()).filter(r => r.status === 'WAITING'));
    }

    // דיווח לשאר השחקנים בחדר
    socket.to(roomId).emit('player_joined', { playerId: socket.id, playerName });
  });

  // 4. קבלת GameAction משחקן אחד ושידורו בלעדית לשאר השחקנים בחדר
  socket.on('send_game_action', ({ roomId, action }) => {
    console.log(`🎲 פעולה התקבלה בחדר ${roomId}:`, action.type);
    socket.to(roomId).emit('receive_game_action', action);
  });

  // 5. קבלת עדכון הגדרות לובי ושידור לכל שאר השחקנים בחדר
  socket.on('game_settings_update', ({ roomId, settings }) => {
    console.log(`⚙️ עדכון הגדרות התקבל עבור חדר ${roomId}`);
    socket.to(roomId).emit('game_settings_updated', settings);
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