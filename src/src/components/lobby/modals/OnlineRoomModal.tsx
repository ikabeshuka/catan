import React, { useState, useEffect } from 'react';
import { socketService } from '../../../services/network/socketService';

export interface RoomInfo {
  roomId: string;
  hostName: string;
  expansion: string;
  scenario?: string;
  boardType: string;
  currentPlayers: number;
  maxPlayers: number;
  status: 'WAITING' | 'IN_GAME';
}

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomJoined: (roomId: string, isHost: boolean, assignedId?: string) => void;
  onStartOnlineCreation?: () => void;
  playerName: string;
  currentSettings: {
    activeExpansion: string;
    selectedScenario: string;
    boardType: string;
    playerCount: number;
  };
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomJoined,
  onStartOnlineCreation,
  playerName,
  currentSettings,
}) => {
  const [publicRooms, setPublicRooms] = useState<RoomInfo[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'BROWSE' | 'CREATE' | 'MANUAL'>('BROWSE');

  useEffect(() => {
    if (isOpen) {
      socketService.connect();
      setIsConnected(true);
      fetchRooms();

      // רענון אוטומטי של רשימת החדרים כל 5 שניות
      const interval = setInterval(fetchRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchRooms = () => {
    socketService.getPublicRooms((rooms) => {
      setPublicRooms(rooms || []);
    });
  };

  if (!isOpen) return null;

  // 1. יצירת חדר חדש ע"י ה-Host על בסיס ההגדרות שנבחרו בשלבים 1-3
  const handleCreateRoom = () => {
    if (onStartOnlineCreation) {
      onStartOnlineCreation();
    }
    onClose();
  };

  // 2. הצטרפות לחדר מתוך הרשימה
  const handleJoinPublicRoom = (room: RoomInfo) => {
    socketService.joinRoom(room.roomId, playerName || 'שחקן').then((assignedId) => {
      if (!assignedId) return;
      onRoomJoined(room.roomId, false, assignedId);
      onClose();
    });
  };

  // 3. הצטרפות קוד ידני (חדר פרטי)
  const handleJoinManualCode = () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;

    socketService.joinRoom(code, playerName || 'שחקן').then((assignedId) => {
      if (!assignedId) return;
      onRoomJoined(code, false, assignedId);
      onClose();
    });
  };

  const getExpansionLabel = (exp: string) => {
    switch (exp) {
      case 'SEAFARERS': return '⛵ יורדי הים';
      case 'MERCHANTS_AND_BARBARIANS': return '🚚 סוחרים וברברים';
      default: return '🎲 קטאן הבסיס';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" dir="rtl">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl text-white flex flex-col max-h-[85vh]">
        
        {/* כותרת וסטטוס חיבור */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="text-xl font-extrabold text-amber-400 flex items-center gap-2">
              <span>🌐</span> חדרים אונליין
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">הצטרף לחדר פתוח או צור חדר חדש לחברים</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 ${isConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {isConnected ? 'מחובר לשרת' : 'מתחבר...'}
          </span>
        </div>

        {/* טאבים לניווט */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
          <button
            onClick={() => setActiveTab('BROWSE')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'BROWSE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📋 חדרים פתוחים ({publicRooms.length})
          </button>
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'CREATE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ➕ צור חדר חדש
          </button>
          <button
            onClick={() => setActiveTab('MANUAL')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'MANUAL' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🔑 קוד חדר פרטי
          </button>
        </div>

        {/* תוכן הטאבים */}
        <div className="flex-1 overflow-y-auto min-h-[250px] pr-1">
          
          {/* TAB 1: דפדפן חדרים פתוחים */}
          {activeTab === 'BROWSE' && (
            <div className="space-y-3">
              {publicRooms.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center gap-2">
                  <span className="text-3xl">🏜️</span>
                  <span>אין כרגע חדרים פתוחים ברשת.</span>
                  <button 
                    onClick={() => setActiveTab('CREATE')}
                    className="text-amber-400 font-bold underline mt-2 hover:text-amber-300"
                  >
                    היה הראשון ליצור חדר!
                  </button>
                </div>
              ) : (
                publicRooms.map((room) => (
                  <div 
                    key={room.roomId}
                    className="bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 flex items-center justify-between transition-all shadow-md group"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{room.hostName}'s Game</span>
                        <span className="text-[10px] font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
                          {room.roomId}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="font-semibold text-amber-400/90">{getExpansionLabel(room.expansion)}</span>
                        <span>•</span>
                        <span>מפה: {room.boardType === 'RANDOM' ? '🎲 אקראית' : '📜 קלאסית'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-slate-300 block">
                          👥 {room.currentPlayers}/{room.maxPlayers} שחקנים
                        </span>
                        <span className="text-[10px] text-emerald-400">ממתין בלובי</span>
                      </div>

                      <button
                        onClick={() => handleJoinPublicRoom(room)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition group-hover:scale-105"
                      >
                        הצטרף
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: יצירת חדר חדש ע"י ה-Host */}
          {activeTab === 'CREATE' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 text-center">
              <h4 className="text-sm font-bold text-amber-400">הגדרות החדר שייווצר (לפי השלבים שבחרת):</h4>
              
              <div className="grid grid-cols-2 gap-3 text-right bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">מארח (Host):</span>
                  <span className="font-bold text-slate-200">{playerName || 'שחקן'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">הרחבה נבחרת:</span>
                  <span className="font-bold text-amber-400">{getExpansionLabel(currentSettings.activeExpansion)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">סוג מפה:</span>
                  <span className="font-bold text-slate-200">{currentSettings.boardType === 'RANDOM' ? 'אקראית' : 'קלאסית למתחילים'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">כמות שחקנים:</span>
                  <span className="font-bold text-slate-200">{currentSettings.playerCount} שחקנים</span>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full py-3 bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black text-sm rounded-xl shadow-lg hover:brightness-110 transition mt-2"
              >
                🚀 צור חדר והזמן שחקנים
              </button>
            </div>
          )}

          {/* TAB 3: קוד ידני */}
          {activeTab === 'MANUAL' && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <label className="text-xs font-bold text-slate-300">הזן קוד חדר פרטי שנמסר לך:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="למשל: CATAN-4921"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-amber-300 font-mono focus:outline-none focus:border-amber-500 uppercase"
                />
                <button
                  onClick={handleJoinManualCode}
                  disabled={!manualCode.trim()}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-xl shadow transition"
                >
                  הכנס
                </button>
              </div>
            </div>
          )}

        </div>

        {/* סגירה */}
        <div className="flex justify-end mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
          >
            סגור
          </button>
        </div>

      </div>
    </div>
  );
};
