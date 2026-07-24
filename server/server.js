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

console.log('🚀 שרת Catan Relay מתאתחל...');

io.on('connection', (socket) => {
  console.log(`🔌 שחקן התחבר: ${socket.id}`);

  // הצטרפות לחדר משחק דינמי (לפי קוד חדר)
  socket.on('join_room', ({ roomId, playerName }) => {
    socket.join(roomId);
    console.log(`👤 ${playerName} (${socket.id}) הצטרף לחדר: ${roomId}`);
    
    // דיווח לשאר השחקנים בחדר
    socket.to(roomId).emit('player_joined', { playerId: socket.id, playerName });
  });

  // קבלת GameAction משחקן אחד ושידורו בלעדית לשאר השחקנים בחדר
  socket.on('send_game_action', ({ roomId, action }) => {
    console.log(`🎲 פעולה התקבלה בחדר ${roomId}:`, action.type);
    socket.to(roomId).emit('receive_game_action', action);
  });

  // קבלת עדכון הגדרות לובי ושידור לכל שאר השחקנים בחדר
  socket.on('game_settings_update', ({ roomId, settings }) => {
    console.log(`⚙️ עדכון הגדרות התקבל עבור חדר ${roomId}`);
    socket.to(roomId).emit('game_settings_updated', settings);
  });

  // קבלת אירוע התחלת משחק ושידורו לכל שאר השחקנים בחדר
  socket.on('start_game', ({ roomId, gameStartData }) => {
    console.log(`🎮 אירוע התחלת משחק התקבל עבור חדר ${roomId}`);
    socket.to(roomId).emit('game_started', gameStartData);
  });

  socket.on('disconnect', () => {
    console.log(`❌ שחקן התנתק: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ שרת Catan מורץ בהצלחה על פורט ${PORT}`);
});