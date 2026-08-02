import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';

type UpdateStatus = 'checking' | 'downloading' | 'ready' | 'current' | 'error' | null;

export const UpdateNotification: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus>(null);
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) return;

    let active = true;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const runUpdate = async () => {
      setStatus('checking');
      try {
        const update = await check();
        if (!active) return;
        if (!update) {
          setStatus('current');
          hideTimer = setTimeout(() => { if (active) setStatus(null); }, 3500);
          return;
        }

        setVersion(update.version);
        setStatus('downloading');
        await invoke('set_update_downloading', { downloading: true });

        let downloaded = 0;
        let total = 0;
        await update.downloadAndInstall(event => {
          if (!active) return;
          if (event.event === 'Started') {
            total = event.data.contentLength || 0;
            setProgress(0);
          } else if (event.event === 'Progress') {
            downloaded += event.data.chunkLength;
            setProgress(total > 0 ? Math.min(100, Math.round(downloaded / total * 100)) : 0);
          } else if (event.event === 'Finished') {
            setProgress(100);
          }
        });

        if (active) setStatus('ready');
        await invoke('set_update_downloading', { downloading: false });
      } catch (error) {
        console.error('Update check/download failed:', error);
        if (active) setStatus('error');
        try { await invoke('set_update_downloading', { downloading: false }); } catch { /* Browser/dev mode */ }
      }
    };

    void runUpdate();
    return () => {
      active = false;
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!status) return null;

  const message = status === 'checking' ? 'בודק אם קיים עדכון…'
    : status === 'downloading' ? `מוריד ומתקין גרסה ${version}${progress ? ` — ${progress}%` : '…'}`
    : status === 'ready' ? `גרסה ${version} הותקנה ותופעל בפתיחה הבאה.`
    : status === 'current' ? 'האפליקציה מעודכנת.'
    : 'בדיקת העדכון נכשלה. המשחק ממשיך כרגיל.';

  return (
    <div className="fixed left-1/2 top-4 z-[100] w-[min(92vw,430px)] -translate-x-1/2 rounded-2xl border border-cyan-400/40 bg-slate-950/95 p-4 text-right text-white shadow-2xl backdrop-blur" dir="rtl" role="status" aria-live="polite">
      {status === 'error' && (
        <button
          type="button"
          onClick={() => setStatus(null)}
          className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-md text-xl leading-none text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          aria-label="סגור הודעת שגיאת עדכון"
          title="סגור"
        >
          ×
        </button>
      )}
      <div className="flex items-center gap-3">
        <span className="text-xl">{status === 'ready' ? '✓' : status === 'error' ? '⚠️' : '⬇️'}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black">עדכון האפליקציה</div>
          <div className="text-xs text-slate-300">{message}</div>
          {status === 'downloading' && totalProgress(progress)}
        </div>
      </div>
    </div>
  );
};

function totalProgress(progress: number) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div className="h-full rounded-full bg-cyan-400 transition-[width]" style={{ width: `${progress || 8}%` }} />
    </div>
  );
}
