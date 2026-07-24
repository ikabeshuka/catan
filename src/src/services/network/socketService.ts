import { io, Socket } from 'socket.io-client';
import { GameAction } from '../../types/gameActions.types';

// כתובת שרת ה-Render ה-Live
const RENDER_SERVER_URL = 'https://catan-32o1.onrender.com';

class SocketService {
  private socket: Socket | null = null;

  // התחברות לשרת הרשת (ברירת מחדל: שרת Render)
  connect(serverUrl: string = RENDER_SERVER_URL) {
    if (this.socket?.connected) return;

    this.socket = io(serverUrl, {
      autoConnect: true,
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('🌐 התחברנו בהצלחה לשרת התקשורת:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 החיבור לשרת הרשת נתקע/נותק');
    });
  }

  // הצטרפות לחדר משחק
  joinRoom(roomId: string, playerName: string) {
    this.socket?.emit('join_room', { roomId, playerName });
  }

  // שידור פעולה לחדר
  sendAction(roomId: string, action: GameAction) {
    this.socket?.emit('send_game_action', { roomId, action });
  }

  // האזנה לפעולות נכנסות מיריבים
  onActionReceived(callback: (action: GameAction) => void) {
    this.socket?.off('receive_game_action');
    this.socket?.on('receive_game_action', (action: GameAction) => {
      console.log('📥 התקבלה פעולה מהרשת:', action.type);
      callback(action);
    });
  }

  // עדכון הגדרות המשחק בלובי
  updateGameSettings(roomId: string, settings: any) {
    this.socket?.emit('game_settings_update', { roomId, settings });
  }

  // האזנה לעדכון הגדרות מהלובי
  onGameSettingsUpdated(callback: (settings: any) => void) {
    this.socket?.off('game_settings_updated');
    this.socket?.on('game_settings_updated', (settings: any) => {
      console.log('📥 התקבל עדכון הגדרות מהלובי:', settings);
      callback(settings);
    });
  }

  // התחלת המשחק והפצת הלוח הראשוני על ידי ה-Host
  startGame(roomId: string, gameStartData: any) {
    this.socket?.emit('start_game', { roomId, gameStartData });
  }

  // האזנה להתחלת משחק והפצת לוח
  onGameStarted(callback: (gameStartData: any) => void) {
    this.socket?.off('game_started');
    this.socket?.on('game_started', (gameStartData: any) => {
      console.log('📥 המשחק הותחל על ידי ה-Host!');
      callback(gameStartData);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();