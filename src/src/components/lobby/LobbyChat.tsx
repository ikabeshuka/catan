import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../../services/network/socketService';

interface ChatMessage {
  text: string;
  sender: string;
  color?: string;
  time?: string;
}

interface LobbyChatProps {
  roomId: string;
  playerName: string;
  playerColor?: string;
}

export const LobbyChat: React.FC<LobbyChatProps> = ({
  roomId,
  playerName,
  playerColor = '#f59e0b',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // האזנה להודעות נכנסות מהרשת
    socketService.onChatMessageReceived((msg) => {
      setMessages((prev) => [...prev, msg]);
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      text: inputMessage.trim(),
      sender: playerName || 'שחקן',
      color: playerColor,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socketService.sendChatMessage(roomId, newMsg);
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col h-64 shadow-xl" dir="rtl">
      <div className="text-xs font-bold text-amber-400 mb-2 border-b border-slate-800 pb-2 flex justify-between items-center">
        <span>💬 צ'אט החדר ({roomId})</span>
        <span className="text-[10px] text-emerald-400">אונליין</span>
      </div>

      {/* אזור ההודעות */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="text-center text-slate-600 my-auto text-[11px]">אין הודעות עדיין... רשום משהו!</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-extrabold text-[11px]" style={{ color: msg.color || '#f59e0b' }}>
                  {msg.sender}
                </span>
                <span className="text-[9px] text-slate-500">{msg.time}</span>
              </div>
              <p className="text-slate-200 text-xs leading-snug">{msg.text}</p>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* שדה הזנה */}
      <form onSubmit={handleSendMessage} className="flex gap-2 mt-3">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="כתוב הודעה לחברי החדר..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
        >
          שלח
        </button>
      </form>
    </div>
  );
};