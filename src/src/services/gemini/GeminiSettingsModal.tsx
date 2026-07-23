import React, { useState, useEffect } from 'react';

interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('CATAN_GEMINI_API_KEY') || '';
    setApiKey(savedKey);
  }, []);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('CATAN_GEMINI_API_KEY', apiKey.trim());
    setStatusMessage('✅ המפתח נשמר בהצלחה בבלוק המקומי!');
    setTimeout(() => {
      setStatusMessage('');
      onClose();
    }, 1200);
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setStatusMessage('❌ אנא הזן מפתח API');
      return;
    }

    setIsTesting(true);
    setStatusMessage('מתחבר ל-Google AI Studio...');

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello, confirm API active.' }] }],
          }),
        }
      );

      if (res.ok) {
        setStatusMessage('🎉 החיבור הצליח! Gemini AI מוכן לשימוש!');
      } else {
        setStatusMessage('❌ המפתח אינו תקין או שאין הרשאת גישה.');
      }
    } catch (err) {
      setStatusMessage('❌ שגיאת רשת בבדיקת המפתח.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl text-white">
        <h3 className="text-xl font-bold mb-3 text-amber-400 flex items-center gap-2">
          <span>🤖</span> הגדרות Google AI Studio (Gemini API)
        </h3>
        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          הכנס את מפתח ה-API שלך מ-Google AI Studio כדי לאפשר לבוטים לפעול באמצעות מודל שפה מתקדם בזמן אמת.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1 text-slate-200">API Key:</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-amber-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {statusMessage && (
          <div className="mb-4 text-xs font-medium text-amber-300 bg-amber-950/40 p-2.5 rounded border border-amber-800/50">
            {statusMessage}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-6">
          <button
            onClick={handleTestKey}
            disabled={isTesting}
            className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600 transition"
          >
            {isTesting ? 'בודק...' : 'בדיקת תקינות'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-500 text-black font-bold rounded shadow transition"
            >
              שמור וסגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};