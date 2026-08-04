import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';

export const AuthModal: React.FC = () => {
  const { 
    currentUser, 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    isAuthModalOpen, 
    setIsAuthModalOpen 
  } = useUser();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTauri = !!(window as any).__TAURI_INTERNALS__;

  // Close modal if user gets successfully logged in
  useEffect(() => {
    if (currentUser && isAuthModalOpen) {
      setIsAuthModalOpen(false);
    }
  }, [currentUser, isAuthModalOpen, setIsAuthModalOpen]);

  // Reset local state when modal is opened/closed
  useEffect(() => {
    if (!isAuthModalOpen) {
      setEmail('');
      setPassword('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const translateFirebaseError = (code: string): string => {
    switch (code) {
      case 'auth/invalid-email':
        return 'כתובת אימייל לא תקינה';
      case 'auth/user-disabled':
        return 'משתמש זה הושבת';
      case 'auth/user-not-found':
        return 'לא נמצא משתמש עם אימייל זה';
      case 'auth/wrong-password':
        return 'סיסמה לא נכונה';
      case 'auth/email-already-in-use':
        return 'כתובת אימייל זו כבר נמצאת בשימוש';
      case 'auth/weak-password':
        return 'הסיסמה חלשה מדי (לפחות 6 תווים)';
      case 'auth/invalid-credential':
        return 'פרטי התחברות שגויים';
      case 'auth/popup-closed-by-user':
        return 'ההתחברות בוטלה על ידי המשתמש';
      default:
        return 'אירעה שגיאה בתהליך ההתחברות. נסה שנית';
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('נא למלא את כל השדות');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setErrorMsg(translateFirebaseError(err?.code || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(translateFirebaseError(err?.code || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" dir="rtl">
      {/* Backdrop */}
      <div 
        onClick={() => setIsAuthModalOpen(false)}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 z-10 flex flex-col gap-4 animate-fade-in">
        {/* Close button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors p-1"
          aria-label="סגור"
        >
          ✕
        </button>

        <div className="text-center">
          <h3 className="text-lg font-bold text-amber-500">
            {isRegisterMode ? 'יצירת חשבון חדש' : 'כניסה למערכת'}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            שמור על הדירוג, נקודות ה-XP וההישגים שלך בענן למשחק מכל מכשיר
          </p>
        </div>

        <form onSubmit={handleEmailAuthSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-slate-300">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors duration-200"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-slate-300">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors duration-200"
              required
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 px-3.5 py-2.5 rounded-lg text-right">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-amber-600/40 disabled:to-orange-600/40 text-slate-950 font-bold text-sm rounded-lg shadow-md transition-all duration-300"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : isRegisterMode ? (
              'הרשמה'
            ) : (
              'התחברות'
            )}
          </button>
        </form>

        <div className="flex justify-center items-center text-xs mt-1">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrorMsg(null);
            }}
            className="text-amber-500/80 hover:text-amber-400 underline transition-colors"
          >
            {isRegisterMode ? 'כבר יש לך חשבון? התחבר' : 'אין לך חשבון? הרשם כאן'}
          </button>
        </div>

        <div className="relative flex items-center justify-center my-1.5">
          <div className="absolute w-full border-t border-slate-800"></div>
          <span className="relative px-3 bg-slate-900 text-slate-500 text-[10px] uppercase font-semibold">
            או התחבר באמצעות
          </span>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-sm rounded-lg border border-slate-700 transition-all duration-300"
        >
          <span>🔑</span>
          <span>התחבר עם Google</span>
        </button>

        {isTauri && (
          <div className="text-[10px] text-slate-500 text-center leading-relaxed mt-1 px-1">
            ℹ️ בסביבת שולחן העבודה (Tauri), אם נתקלת בקושי בהתחברות עם Google, מומלץ להשתמש באימייל וסיסמה.
          </div>
        )}
      </div>
    </div>
  );
};
