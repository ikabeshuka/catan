import React, { useState, useEffect } from 'react';
import { socketService } from '../../services/network/socketService';

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomJoined: (roomId: string) => void;
  playerName: string;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomJoined,
  playerName,
}) => {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // התחברות לשרת הרשת
      socketService.connect();
      setIsConnected(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // מחולל קוד חדר אקראי
  const generateRoomCode = () => {
    const code = 'CATAN-' + Math.floor(1000 + Math.random() * 9000);
    setRoomIdInput(code);
  };

  const handleJoin = async () => {
    const code = roomIdInput.trim().toUpperCase();
    if (!code) return;

    const assignedId = await socketService.joinRoom(code, playerName || 'שחקן');
    if (!assignedId) return;
    setActiveRoom(code);
    onRoomJoined(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl text-white">
        
        {/* כותרת וסטטוס */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
            <span>🌐</span> משחק אונליין לרשת
          </h3>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-rose-950 text-rose-400 border border-rose-700'}`}>
            {isConnected ? 'מחובר לשרת' : 'מתחבר...'}
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-5 leading-relaxed">
          צור חדר חדש ושתף את הקוד עם חבריך, או הזן קוד חדר קיים כדי להצטרף למשחק בזמן אמת.
        </p>

        {/* שדה הזנת/יצירת קוד */}
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-semibold text-slate-200">קוד חדר (Room Code):</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="למשל: CATAN-4921"
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-blue-200 tracking-wider font-mono focus:outline-none focus:border-blue-500 uppercase"
            />
            <button
              onClick={generateRoomCode}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-600 transition"
            >
              צור קוד
            </button>
          </div>
        </div>

        {/* חיווי חדר פעיל */}
        {activeRoom && (
          <div className="mb-5 p-3 bg-blue-950/50 border border-blue-800/60 rounded-lg text-center">
            <span className="text-xs text-blue-300 block mb-1">הצטרפת בהצלחה לחדר:</span>
            <span className="text-lg font-mono font-bold text-amber-400 tracking-widest">{activeRoom}</span>
          </div>
        )}

        {/* כפתורי פעולה */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
          >
            סגור
          </button>
          <button
            onClick={handleJoin}
            disabled={!roomIdInput.trim()}
            className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded shadow transition"
          >
            התחבר לחדר
          </button>
        </div>

      </div>
    </div>
  );
};
