import { io, Socket } from 'socket.io-client';
import { GameAction } from '../types/gameActions.types';

class SocketService {
  private socket: Socket | null = null;

  // התחברות לשרת הרשת
  connect(serverUrl: string = 'http://localhost:3001') {
    if (this.socket?.connected) return;

    this.socket = io(serverUrl, {
      autoConnect: true,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('🌐 התחברנו בהצלחה לשרת התקשורת:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 החיבור לשרת הרשת נתרק');
    });
  }

  // הצטרפות לחדר
  joinRoom(roomId: string, playerName: string) {
    this.socket?.emit('join_room', { roomId, playerName });
  }

  // שידור פעולה לחדר
  sendAction(roomId: string, action: GameAction) {
    this.socket?.emit('send_game_action', { roomId, action });
  }

  // האזנה לפעולות נכנסות מיריבים והעברתן ל-gameDispatcher המקומי
  onActionReceived(callback: (action: GameAction) => void) {
    this.socket?.off('receive_game_action');
    this.socket?.on('receive_game_action', (action: GameAction) => {
      console.log('📥 התקבלה פעולה מהרשת:', action.type);
      callback(action);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();