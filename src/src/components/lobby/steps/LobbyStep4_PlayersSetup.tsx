import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { 
  UserIcon, BotIcon, EasyIcon, MediumIcon, HardIcon, SuperHardIcon 
} from '../../common/Icons';
import { LobbyPlayer, CATAN_COLORS } from '../types';
import { PlayerType } from '../../../types/player.types';

interface LobbyStep4PlayersSetupProps {
  playerCount: 3 | 4;
  lobbyPlayers: LobbyPlayer[];
  setLobbyPlayers: React.Dispatch<React.SetStateAction<LobbyPlayer[]>>;
  togglePlayerType: (id: string, playerType: PlayerType) => void;
  isGlobalDifficulty: boolean;
  setIsGlobalDifficulty: (global: boolean) => void;
  globalDifficulty: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה';
  setGlobalDifficulty: (diff: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה') => void;
  botTimeLimit: number;
  setBotTimeLimit: (limit: number) => void;
  onPrev: () => void;
  onStartGame: () => void;
  isGuest?: boolean;
  highlightedPlayerId?: string;
}

const PAWN_MODELS: Record<string, string> = {
  '#e53935': '/models/red_pown.glb',
  '#1e88e5': '/models/blue_pown.glb',
  '#fdd835': '/models/yelow_pown.glb',
  '#43a047': '/models/green_pown.glb',
};

const PawnModel = ({ modelPath }: { modelPath: string }) => {
  const { scene: sourceScene } = useGLTF(modelPath);
  const scene = useMemo(() => sourceScene.clone(true), [sourceScene]);

  return <primitive object={scene} position={[0, -0.035, 0]} rotation={[0, -0.35, 0]} scale={3.1} />;
};

const Pawn3D = ({ color, label }: { color: string; label: string }) => {
  const modelPath = PAWN_MODELS[color.toLowerCase()] || PAWN_MODELS['#e53935'];

  return (
    <div className="lobby-pawn-model h-24 w-20" role="img" aria-label={label}>
      <Canvas
        camera={{ position: [0, 0.03, 1.7], fov: 25 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={2.2} />
        <directionalLight position={[2, 3, 4]} intensity={3.2} />
        <directionalLight position={[-2, 1, 2]} intensity={1.2} />
        <Suspense fallback={null}>
          <PawnModel modelPath={modelPath} />
        </Suspense>
      </Canvas>
    </div>
  );
};

Object.values(PAWN_MODELS).forEach(modelPath => useGLTF.preload(modelPath));

export const LobbyStep4_PlayersSetup: React.FC<LobbyStep4PlayersSetupProps> = ({
  playerCount,
  lobbyPlayers,
  setLobbyPlayers,
  togglePlayerType,
  isGlobalDifficulty,
  setIsGlobalDifficulty,
  globalDifficulty,
  setGlobalDifficulty,
  botTimeLimit,
  setBotTimeLimit,
  onPrev,
  onStartGame,
  isGuest = false,
  highlightedPlayerId,
}) => {
  const activePlayers = lobbyPlayers.slice(0, playerCount);
  const hasBots = activePlayers.some(p => p.isBot);

  // State to track which player's color picker popover is currently open
  const [activePopoverPlayerId, setActivePopoverPlayerId] = useState<string | null>(null);

  const getDifficultyIcon = (diff: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה') => {
    switch (diff) {
      case 'קל': return <EasyIcon size={14} />;
      case 'בינוני': return <MediumIcon size={14} />;
      case 'קשה': return <HardIcon size={14} />;
      case 'סופר קשה': return <SuperHardIcon size={14} />;
    }
  };

  // Automated Color Swapping Logic
  const handleColorSelect = (playerId: string, selectedColorHex: string) => {
    setLobbyPlayers(prev => {
      const currentPlayers = [...prev];
      const currentPlayer = currentPlayers.find(pl => pl.id === playerId);
      if (!currentPlayer) return prev;

      const previousColorHex = currentPlayer.color;

      // Find if another active player is already using this color
      const otherActivePlayer = currentPlayers.slice(0, 4).find(
        pl => pl.id !== playerId && pl.color === selectedColorHex
      );

      if (otherActivePlayer) {
        // Swap colors between the two players!
        return currentPlayers.map(pl => {
          if (pl.id === playerId) {
            return { ...pl, color: selectedColorHex };
          }
          if (pl.id === otherActivePlayer.id) {
            return { ...pl, color: previousColorHex };
          }
          return pl;
        });
      } else {
        // Just change the color normally
        return currentPlayers.map(pl => {
          if (pl.id === playerId) {
            return { ...pl, color: selectedColorHex };
          }
          return pl;
        });
      }
    });

    // Close the popover after selection
    setActivePopoverPlayerId(null);
  };

  return (
    <div className="w-full animate-fade-in flex flex-col items-center gap-6" dir="rtl">
      <style>{`
        @keyframes lobby-pawn-hover {
          0%, 100% { transform: scale(1.08) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-2deg); }
          75% { transform: scale(1.1) rotate(2deg); }
        }
        .lobby-pawn-trigger:hover .lobby-pawn-model {
          animation: lobby-pawn-hover 420ms ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .lobby-pawn-trigger:hover .lobby-pawn-model { animation: none; transform: scale(1.05); }
        }
      `}</style>
      
      {/* 🔹 הגדרת המשתתפים */}
      <h2 className="text-xl font-bold text-slate-100 text-center">הגדרת משתתפים וצבעים:</h2>
      
      {/* grid grid-cols-4 gap-4 structure */}
      <div className={`grid gap-4 w-full max-w-4xl relative ${playerCount === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {activePlayers.map((p, index) => {
          const isPopoverOpen = activePopoverPlayerId === p.id;
          const isHighlightedPlayer = p.id === highlightedPlayerId;

          return (
            <div 
              key={p.id}
              className={`lobby-player-card flex flex-col items-center p-5 rounded-2xl gap-5 relative transition-all duration-300 hover:-translate-y-1 overflow-visible ${
                isHighlightedPlayer
                  ? 'z-10 bg-slate-950 border border-amber-500/70 shadow-[0_16px_45px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/25'
                  : 'bg-slate-950/85 border border-slate-800/70 shadow-xl hover:border-slate-700'
              }`}
            >
              {/* Badge indicating player index */}
              <div className="absolute top-3 right-3 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-bold text-slate-500">
                שחקן {index + 1}
              </div>

              {/* 1. Triple Segmented Control (Human / Local Bot / Gemini AI Toggle) */}
              <div className="w-full mt-2 relative">
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner relative w-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => togglePlayerType(p.id, 'HUMAN')}
                    disabled={isGuest}
                    className={`flex-1 py-1 px-0.5 rounded-lg text-[10px] font-bold transition-all duration-200 relative z-10 flex flex-col items-center justify-center gap-1 ${
                      isGuest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${
                      p.playerType === 'HUMAN' 
                        ? 'text-amber-400 font-extrabold' 
                        : 'text-slate-500 hover:text-slate-400'
                    }`}
                    title="שחקן אנושי"
                  >
                    <UserIcon size={12} />
                    <span>אדם</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePlayerType(p.id, 'LOCAL_BOT')}
                    disabled={isGuest}
                    className={`flex-1 py-1 px-0.5 rounded-lg text-[10px] font-bold transition-all duration-200 relative z-10 flex flex-col items-center justify-center gap-1 ${
                      isGuest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${
                      p.playerType === 'LOCAL_BOT' 
                        ? 'text-amber-400 font-extrabold' 
                        : 'text-slate-500 hover:text-slate-400'
                    }`}
                    title="מחשב מקומי"
                  >
                    <BotIcon size={12} />
                    <span>מחשב</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePlayerType(p.id, 'GEMINI_AI')}
                    disabled={isGuest}
                    className={`flex-1 py-1 px-0.5 rounded-lg text-[10px] font-bold transition-all duration-200 relative z-10 flex flex-col items-center justify-center gap-1 ${
                      isGuest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    } ${
                      p.playerType === 'GEMINI_AI' 
                        ? 'text-amber-400 font-extrabold' 
                        : 'text-slate-500 hover:text-slate-400'
                    }`}
                    title="שחקן Gemini AI"
                  >
                    <span className="text-[12px] leading-none">🧠</span>
                    <span>Gemini</span>
                  </button>
                  {/* Sliding gold slider backdrop */}
                  <div 
                    className="absolute top-1 bottom-1 bg-amber-500/10 border border-amber-400/30 rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                    style={{
                      width: 'calc(33.333% - 4px)',
                      left: p.playerType === 'GEMINI_AI' ? '4px' : p.playerType === 'LOCAL_BOT' ? 'calc(33.333% + 2px)' : 'calc(66.666% + 2px)',
                    }}
                  />
                </div>
              </div>

              {/* API Key Reminder for Gemini AI inside the card */}
              {p.playerType === 'GEMINI_AI' && (
                <div className="w-full text-center mt-1 p-1.5 bg-purple-950/20 border border-purple-500/25 rounded-xl text-[9px] text-purple-300 font-medium leading-relaxed animate-fade-in">
                  🧠 ודא שהוזן מפתח API בהגדרות Gemini למטה
                </div>
              )}

              {/* 2. Player Name and Pawn/Soldier */}
              <div className={`w-full flex flex-col items-center gap-4 transition-transform duration-300 ${isHighlightedPlayer ? 'scale-105' : 'scale-95'}`}>
                {/* חייל תלת־ממדי לחיץ לבחירת צבע */}
                <button
                  type="button"
                  onClick={() => setActivePopoverPlayerId(isPopoverOpen ? null : p.id)}
                  className={`lobby-pawn-trigger relative flex h-28 w-24 items-center justify-center rounded-[45%] border transition-all duration-300 cursor-pointer group active:scale-95 ${
                    isHighlightedPlayer
                      ? 'bg-gradient-to-b from-amber-400/15 to-slate-950 border-amber-500/45 shadow-[0_12px_28px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-900/45 border-slate-800/70 shadow-lg opacity-65 hover:opacity-100'
                  }`}
                  title="לחץ לבחירת צבע"
                >
                  <Pawn3D color={p.color} label={`חייל תלת־ממדי של ${p.name}`} />
                  {isHighlightedPlayer && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-400/40 bg-amber-500 px-2 py-0.5 text-[9px] font-black text-slate-950 shadow-lg">
                      השחקן שלך
                    </span>
                  )}
                  {/* Interactivity indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[8px] text-amber-400 font-black">
                    🎨
                  </span>
                </button>

                {/* Name Input with user icon / bot icon prefix */}
                <div className="w-full relative">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLobbyPlayers(prev => prev.map(item => item.id === p.id ? { ...item, name: val } : item));
                    }}
                    className="w-full text-center bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-2 py-1.5 text-slate-100 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                    placeholder="שם השחקן..."
                  />
                </div>
              </div>

              {/* 3. Popover Color Selector Dropdown */}
              {isPopoverOpen && (
                <>
                  {/* Backdrop click closer overlay */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setActivePopoverPlayerId(null)}
                  />
                  
                  {/* Color Picker Popover panel */}
                  <div className="absolute bottom-16 z-50 bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-2xl flex gap-2 animate-fade-in animate-duration-150">
                    {CATAN_COLORS.map(colorOption => {
                      const isSelected = p.color === colorOption.hex;
                      const isTakenByOther = activePlayers.some(
                        other => other.id !== p.id && other.color === colorOption.hex
                      );

                      return (
                        <button
                          key={colorOption.hex}
                          type="button"
                          onClick={() => handleColorSelect(p.id, colorOption.hex)}
                          className={`w-7 h-7 rounded-full border border-slate-950 relative transition-all duration-150 cursor-pointer ${
                            isSelected 
                              ? 'ring-2 ring-amber-500 scale-110 shadow-md' 
                              : 'hover:scale-105 border-white/10'
                          }`}
                          style={{ backgroundColor: colorOption.hex }}
                          title={isTakenByOther ? `${colorOption.name} (יגרום להחלפה)` : colorOption.name}
                        >
                          {isSelected && (
                            <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-black">
                              ✓
                            </span>
                          )}
                          {isTakenByOther && !isSelected && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500/90 border border-slate-900 rounded-full flex items-center justify-center text-[8px] text-slate-950 font-black">
                              ⇄
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

            </div>
          );
        })}
      </div>

      {/* 🔹 הגדרת בינה מלאכותית ומגבלת זמן (רק אם יש בוטים) */}
      {hasBots && (
        <div className="w-full max-w-2xl flex flex-col gap-6 mt-4">
          
          {/* בוטים בודדים - רק אם קושי גלובלי מכובה */}
          {!isGlobalDifficulty && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-400">הגדרת קושי אינדיבידואלית לבוטים:</h3>
              {activePlayers.filter(p => p.isBot).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-bold text-slate-200">{p.name}</span>
                  </div>

                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800/80">
                    {(['קל', 'בינוני', 'קשה', 'סופר קשה'] as const).map(diff => {
                      const isSelected = p.difficulty === diff || (!p.difficulty && diff === 'בינוני');
                      return (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => {
                            setLobbyPlayers(prev => prev.map(item => item.id === p.id ? { ...item, difficulty: diff } : item));
                          }}
                          className={`py-1.5 px-3 rounded text-xs font-bold transition-all duration-150 cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-500 text-slate-950 font-extrabold shadow' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {diff}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* לוח בקרה ראשי לבוטים וזמן תור */}
          <div className="w-full bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row gap-6 shadow-xl justify-between items-center backdrop-blur-sm">
            
            {/* קושי אחיד גלובלי */}
            <div className="flex flex-col gap-4 w-full md:w-1/2 border-b md:border-b-0 md:border-l border-slate-800/80 pb-4 md:pb-0 md:pl-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col text-right">
                  <span className="text-sm font-bold text-slate-200">קושי אחיד לכל הבוטים</span>
                  <span className="text-xs text-slate-500">החל רמת קושי זהה לכל בוט של שחקן מחשב</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={isGlobalDifficulty} 
                    onChange={(e) => setIsGlobalDifficulty(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-950 peer-checked:after:border-amber-400"></div>
                </label>
              </div>

              {isGlobalDifficulty && (
                <div className="grid grid-cols-4 gap-1.5 w-full mt-2">
                  {(['קל', 'בינוני', 'קשה', 'סופר קשה'] as const).map(diff => {
                    const isSelected = globalDifficulty === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setGlobalDifficulty(diff)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-500 border-amber-400 text-slate-950 font-extrabold shadow-md' 
                            : 'border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {getDifficultyIcon(diff)}
                        <span>{diff}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* מגבלת זמן תגובה */}
            <div className="flex flex-col items-start w-full md:w-1/2">
              <label className="text-slate-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                <span>⏱️</span> הגבלת זמן תגובה לבוטים (Turn Timer):
              </label>
              <div className="flex items-center gap-3 w-full">
                <input
                  type="range"
                  min={3}
                  max={30}
                  value={botTimeLimit}
                  onChange={(e) => setBotTimeLimit(parseInt(e.target.value))}
                  className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono font-black text-amber-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 min-w-[50px] text-center">
                  {botTimeLimit} שנ'
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">הבוט יפנה את תורו באופן אוטומטי במקרה של השהייה</p>
            </div>

          </div>

        </div>
      )}

      {/* כפתורי ניווט והפעלה ישירה */}
      <div className="w-full flex items-center justify-between mt-6 border-t border-slate-800/80 pt-6 max-w-2xl">
        <button
          type="button"
          onClick={onPrev}
          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold py-2.5 px-6 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          חזור
        </button>

        {isGuest ? (
          <div className="text-amber-400 font-black text-sm animate-pulse bg-amber-500/10 border border-amber-500/20 rounded-xl py-2.5 px-6" dir="rtl">
            ⏳ ממתין למנהל החדר (Host) שיתחיל את המשחק...
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartGame}
            className="bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 font-black py-3.5 px-10 rounded-xl text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-200 tracking-wide hover:brightness-110 cursor-pointer"
          >
            צור לוח וצא לדרך!
          </button>
        )}
      </div>
    </div>
  );
};
