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
      const ENDPOINT_URL = 'https://github.com/ikabeshuka/catan/releases/latest/download/latest.json';
      let update;

      try {
        try {
          update = await check();
        } catch (error: any) {
          const errMsg = error?.message || String(error);
          const errStack = error?.stack || 'No stack trace available';
          const detailedMsg = `[Auto-Updater Check Failure]\nEndpoint: ${ENDPOINT_URL}\nError: ${errMsg}\nStack: ${errStack}`;
          console.error(detailedMsg, error);
          alert(detailedMsg);
          throw error;
        }

        if (!active) return;
        if (!update) {
          setStatus('current');
          hideTimer = setTimeout(() => { if (active) setStatus(null); }, 3500);
          return;
        }

        setVersion(update.version);
        
        let isPortable = false;
        try {
          isPortable = await invoke<boolean>('check_is_portable');
        } catch (err) {
          console.warn('Failed to check if running as portable:', err);
        }

        setStatus('downloading');
        await invoke('set_update_downloading', { downloading: true });

        if (isPortable) {
          console.log('Running in Portable Mode. Preparing in-place executable update...');
          const platforms = update.rawJson?.platforms as any;
          const setupUrl = platforms?.['windows-x86_64']?.url;
          if (!setupUrl) {
            throw new Error('No download URL found for Windows platform in update manifest.');
          }

          // Convert installer setup url to portable exe url
          const urlParts = setupUrl.split('/');
          urlParts[urlParts.length - 1] = 'catan-portable.exe';
          const downloadUrl = urlParts.join('/');
          
          if (!downloadUrl.endsWith('.exe')) {
            throw new Error(`Invalid download URL: ${downloadUrl}. The download URL must point strictly to a .exe release asset.`);
          }
          console.log(`Downloading portable update from: ${downloadUrl}`);

          setProgress(35); // Simulated starting download state
          await invoke('update_portable_app', { downloadUrl });
          setProgress(100);
        } else {
          let downloaded = 0;
          let total = 0;
          try {
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
          } catch (error: any) {
            const errMsg = error?.message || String(error);
            const errStack = error?.stack || 'No stack trace available';
            const detailedMsg = `[Auto-Updater Download/Install Failure]\nEndpoint: ${ENDPOINT_URL}\nError: ${errMsg}\nStack: ${errStack}`;
            console.error(detailedMsg, error);
            alert(detailedMsg);
            throw error;
          }
        }

        if (active) setStatus('ready');
        await invoke('set_update_downloading', { downloading: false });
      } catch (error) {
        console.error('Update check/download failed:', error);
        const errMsg = error instanceof Error ? error.message : String(error);
        if (active) {
          setStatus('error');
          setVersion(errMsg); // Display error detail inside notification block
        }
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
