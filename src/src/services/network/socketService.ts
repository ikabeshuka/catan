import { io, Socket } from 'socket.io-client';
import type { GameAction } from '../../types/gameActions.types';

const RENDER_SERVER_URL = 'https://catan-32o1.onrender.com';
const SESSION_STORAGE_KEY = 'CATAN_ONLINE_SESSION';

interface OnlineSession {
  roomId: string;
  playerName: string;
  playerId: string;
  sessionToken: string;
}

interface ActionEnvelope {
  action: GameAction;
  sequence: number;
}

type Cleanup = () => void;

class SocketService {
  private socket: Socket | null = null;
  private session: OnlineSession | null = null;
  private lastActionSequence = 0;
  private snapshotCallbacks = new Set<(snapshot: any, isHost?: boolean) => void>();

  constructor() {
    try {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null;
      this.session = saved ? JSON.parse(saved) as OnlineSession : null;
    } catch {
      this.session = null;
    }
  }

  private showConnectionError(message: string) {
    console.error(`Online game: ${message}`);
    if (typeof window !== 'undefined') window.alert(message);
  }

  private saveSession(session: OnlineSession | null) {
    this.session = session;
    try {
      if (typeof window === 'undefined') return;
      if (session) sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // A private browser session may deny storage. Reconnect still works in-memory.
    }
  }

  private resumeSession() {
    if (!this.socket || !this.session) return;
    const session = this.session;
    this.socket.emit('join_room', {
      roomId: session.roomId,
      playerName: session.playerName,
      sessionToken: session.sessionToken,
      requestedPlayerId: session.playerId,
    }, (response: any) => {
      if (!response?.success) {
        this.showConnectionError(response?.message || 'לא ניתן היה להתחבר מחדש לחדר');
        this.saveSession(null);
        return;
      }
      this.lastActionSequence = Number(response.actionSequence || 0);
      if (response.gameState) {
        this.snapshotCallbacks.forEach(callback => callback(response.gameState, Boolean(response.isHost)));
      }
    });
  }

  connect(serverUrl: string = RENDER_SERVER_URL) {
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }
    this.socket = io(serverUrl, { autoConnect: true, transports: ['websocket', 'polling'], reconnection: true });
    this.socket.on('connect', () => this.resumeSession());
    this.socket.on('room_not_found', (error: { message?: string }) => this.showConnectionError(error?.message || 'החדר המבוקש לא נמצא'));
    this.socket.on('authorization_error', (error: { message?: string }) => this.showConnectionError(error?.message || 'אין הרשאה לבצע פעולה זו'));
    this.socket.on('invalid_request', (error: { message?: string }) => this.showConnectionError(error?.message || 'השרת דחה בקשה לא תקינה'));
  }

  createRoom(roomData: {
    roomId: string;
    hostName: string;
    expansion: string;
    scenario: string;
    boardType: string;
    maxPlayers: number;
  }): Promise<boolean> {
    return new Promise(resolve => {
      if (!this.socket) return resolve(false);
      this.socket.emit('create_room', roomData, (response: any) => {
        if (!response?.success) this.showConnectionError(response?.message || 'יצירת החדר נכשלה');
        resolve(Boolean(response?.success));
      });
    });
  }

  joinRoom(roomId: string, playerName: string): Promise<string | null> {
    return new Promise(resolve => {
      if (!this.socket) { this.showConnectionError('אין חיבור פעיל לשרת המשחק'); resolve(null); return; }
      this.socket.emit('join_room', { roomId, playerName }, (response: any) => {
        if (response?.success && typeof response.assignedPlayerId === 'string' && typeof response.sessionToken === 'string') {
          this.lastActionSequence = Number(response.actionSequence || 0);
          this.saveSession({ roomId, playerName, playerId: response.assignedPlayerId, sessionToken: response.sessionToken });
          resolve(response.assignedPlayerId);
          return;
        }
        if (response?.code !== 'ROOM_NOT_FOUND') this.showConnectionError(response?.message || 'לא ניתן היה להצטרף לחדר');
        resolve(null);
      });
    });
  }

  leaveRoom(roomId: string) {
    this.socket?.emit('leave_room', { roomId });
    this.saveSession(null);
    this.lastActionSequence = 0;
  }

  getPublicRooms(callback: (rooms: any[]) => void): Cleanup {
    const handler = (rooms: any[]) => callback(rooms);
    this.socket?.on('public_rooms_list', handler);
    this.socket?.emit('get_public_rooms');
    return () => this.socket?.off('public_rooms_list', handler);
  }

  sendAction(roomId: string, action: GameAction) {
    this.socket?.emit('send_game_action', { roomId, action }, (response: any) => {
      if (!response?.success) this.showConnectionError(response?.message || 'הפעולה נדחתה על ידי השרת');
    });
  }

  onActionReceived(callback: (action: GameAction) => void): Cleanup {
    const handler = (payload: ActionEnvelope | GameAction) => {
      const envelope = 'action' in payload ? payload : { action: payload, sequence: this.lastActionSequence + 1 };
      if (envelope.sequence <= this.lastActionSequence) return;
      this.lastActionSequence = envelope.sequence;
      callback(envelope.action);
    };
    this.socket?.on('receive_game_action', handler);
    return () => this.socket?.off('receive_game_action', handler);
  }

  syncGameState(roomId: string, snapshot: Record<string, unknown>) {
    this.socket?.emit('sync_game_state', { roomId, snapshot });
  }

  requestGameState(roomId: string): Promise<any | null> {
    return new Promise(resolve => {
      this.socket?.emit('request_game_state', { roomId }, (response: any) => {
        if (response?.success) {
          this.lastActionSequence = Number(response.sequence || 0);
          resolve(response.snapshot);
        } else resolve(null);
      });
    });
  }

  onGameStateSnapshot(callback: (snapshot: any, isHost?: boolean) => void): Cleanup {
    const remoteHandler = (payload: any) => {
      this.lastActionSequence = Math.max(this.lastActionSequence, Number(payload?.sequence || 0));
      callback(payload?.snapshot, false);
    };
    this.snapshotCallbacks.add(callback);
    this.socket?.on('game_state_snapshot', remoteHandler);
    return () => {
      this.socket?.off('game_state_snapshot', remoteHandler);
      this.snapshotCallbacks.delete(callback);
    };
  }

  updateGameSettings(roomId: string, settings: any) { this.socket?.emit('game_settings_update', { roomId, settings }); }
  updateSlotStatus(roomId: string, slotId: string, status: 'OPEN' | 'LOCKED_BOT') { this.socket?.emit('update_slot_status', { roomId, slotId, status }); }
  startGame(roomId: string, gameStartData: any) { this.socket?.emit('start_game', { roomId, gameStartData }); }
  sendChatMessage(roomId: string, message: { text: string; sender: string; color?: string; time?: string }) { this.socket?.emit('send_chat_message', { roomId, message }); }

  private listen<T>(event: string, callback: (data: T) => void): Cleanup {
    this.socket?.on(event, callback);
    return () => this.socket?.off(event, callback);
  }

  onGameSettingsUpdated(callback: (settings: any) => void) { return this.listen('game_settings_updated', callback); }
  onPlayerJoined(callback: (data: { playerId: string; playerName: string }) => void) { return this.listen('player_joined', callback); }
  onPlayerLeft(callback: (data: { playerId: string; playerName: string; currentPlayers: number }) => void) { return this.listen('player_left', callback); }
  onHostChanged(callback: (data: { roomId: string; hostPlayerId: string; hostName: string }) => void) { return this.listen('host_changed', callback); }
  onGameStarted(callback: (gameStartData: any) => void) { return this.listen('game_started', callback); }
  onChatMessageReceived(callback: (message: { text: string; sender: string; color?: string; time?: string }) => void) { return this.listen('receive_chat_message', callback); }

  offHostChanged() { this.socket?.off('host_changed'); }

  disconnect() {
    if (this.session) this.leaveRoom(this.session.roomId);
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
