import React, { useState, useEffect, useRef } from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { AuthWidget } from '../auth/AuthWidget';
import { useGame, getPlayerTotalVP } from '../../context/GameContext';
import { RollDiceContainer } from './RollDiceContainer';
import { GoldTradePanel } from './GoldTradePanel';
import { WagonUpgradePanel } from './WagonUpgradePanel';
import { BuildActionsPanel } from './BuildActionsPanel';
import { SettlementIcon, RoadIcon } from '../common/Icons';
import { socketService } from '../../services/network/socketService';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { GameRulesModal } from '../modals/GameRulesModal';
import { CitiesKnightsPanel } from './CitiesKnightsPanel';

interface ChatMessage {
  text: string;
  sender: string;
  color?: string;
  time?: string;
}

export const ActionSidebar: React.FC = () => {
  const {
    currentPlayer,
    turnSubPhase,
    isCurrentPlayerBot,
    endTurn,
    isSetupPhase,
    setupState,
  } = useTurnManager();

  const { 
    activeExpansion,
    selectedScenario,
    longestRoadPlayerId, 
    largestArmyPlayerId,
    vertices,
    tiles,
    roomId,
    myPlayerId,
    players,
  } = useGame();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const humanPlayer = roomId
    ? players?.find(p => p.id === myPlayerId)
    : players?.find(p => !p.isBot) || currentPlayer;
  const lostTribeGeneralCloth = tiles.find(tile => tile.lostTribeGeneralCloth !== undefined)?.lostTribeGeneralCloth || 0;

  // האזנה להודעות צ'אט נכנסות ברשת
  useEffect(() => {
    if (roomId) {
      socketService.onChatMessageReceived((msg) => {
        setChatMessages(prev => [...prev, msg]);
      });
    }
  }, [roomId]);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomId) return;

    const newMsg: ChatMessage = {
      text: chatInput.trim(),
      sender: humanPlayer?.name || 'שחקן',
      color: humanPlayer?.color || '#f59e0b',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socketService.sendChatMessage(roomId, newMsg);
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  if (!currentPlayer) return null;

  const handleEndTurn = () => {
    dispatchGameAction({ type: 'END_TURN', playerId: currentPlayer.id }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : currentPlayer.id,
      endTurn,
    });
  };

  const isWrongOnlinePlayer = !!roomId && (!myPlayerId || currentPlayer.id !== myPlayerId);

  const showEndTurnButton =
    turnSubPhase === 'TRADE_AND_BUILD' ||
    (isSetupPhase && setupState.hasPlacedSettlement && setupState.hasPlacedRoad);

  const getGuideText = (): React.ReactNode => {
    if (isCurrentPlayerBot) {
      return <span>שחקן המחשב מקבל החלטות ומבצע מהלכים...</span>;
    }
    if (isSetupPhase) {
      const hasSettlement = setupState?.hasPlacedSettlement;
      const hasRoad = setupState?.hasPlacedRoad;

      if (!hasSettlement || !hasRoad) {
        return (
          <span className="flex flex-col gap-1.5 items-start mt-1">
            <span>שלב ההקמה: נא למקם על גבי הלוח:</span>
            <span className="flex gap-2 items-center text-[10px] text-slate-300">
              {!hasSettlement && (
                <span className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  <SettlementIcon size={12} className="text-amber-500" /> יישוב
                </span>
              )}
              {!hasRoad && (
                <span className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  <RoadIcon size={12} className="text-emerald-500" /> כביש
                </span>
              )}
            </span>
          </span>
        );
      }
      return <span>כל הכבוד! נא ללחוץ על "סיום תור" כדי להמשיך</span>;
    }
    switch (turnSubPhase) {
      case 'BEFORE_ROLL':
        return <span>נא לזרוק קוביות</span>;
      case 'TRADE_AND_BUILD':
        return <span>שלב נוכחי: מסחר ובנייה</span>;
      case 'ROBBER_PLACEMENT':
        return <span>שלב השודד: נא להציב את השודד באריח אחר על הלוח</span>;
      case 'HARBOR_PLACEMENT':
        return <span>בחר צלע חוף מודגשת כדי להציב את הנמל שקיבלת</span>;
      default:
        return <span>נא לבצע את הפעולה הבאה</span>;
    }
  };

  const activePlayerVP = getPlayerTotalVP(
    currentPlayer,
    longestRoadPlayerId,
    largestArmyPlayerId,
    currentPlayer.id === humanPlayer?.id,
    vertices,
    tiles,
    selectedScenario,
  );

  return (
    <div className="min-h-full flex flex-col gap-2.5 bg-slate-950 p-1 text-white text-right" dir="rtl">
      
      <AuthWidget />

      {/* א. שם השחקן הנוכחי וב. תצוגת נקודות הניצחון */}
      <div data-player-id={currentPlayer.id} className="relative overflow-hidden bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full inline-block shadow border border-white/20" 
              style={{ backgroundColor: currentPlayer.color }} 
            />
            <h2 className="font-serif text-sm font-extrabold text-slate-100 tracking-wide">
              התור של {currentPlayer.name} {isCurrentPlayerBot && '(מחשב)'}
            </h2>
          </div>

          {/* כפתור צ'אט במידה והמשחק מנוהל בחדר אונליין */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsRulesModalOpen(true)}
              className="cursor-pointer rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-300 transition hover:bg-sky-500/20"
            >
              📜 הוראות משחק
            </button>
            {roomId && (
              <button
                onClick={() => setIsChatOpen(prev => !prev)}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                💬 צ'אט {chatMessages.length > 0 && `(${chatMessages.length})`}
              </button>
            )}
          </div>
        </div>

        {/* תצוגת נקודות הניצחון (Victory Points) */}
        <div className="flex items-center justify-between bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-800/40">
          <span className="text-[11px] text-slate-400 font-bold">נקודות ניצחון (Victory Points)</span>
          <span className="text-sm font-black text-amber-400 font-mono">🏆 {activePlayerVP}</span>
        </div>

        {selectedScenario === 'CLOTH_FOR_CATAN' && (
          <div className="flex items-center justify-between bg-indigo-950/35 px-3 py-2 rounded-xl border border-indigo-400/20">
            <span className="text-[11px] text-indigo-200 font-bold">גלילי בד</span>
            <span className="text-sm font-black text-indigo-200 font-mono">🧵 {currentPlayer.clothRolls || 0} · {Math.floor((currentPlayer.clothRolls || 0) / 2)} נק׳ · קופה {lostTribeGeneralCloth}</span>
          </div>
        )}

        <p className="font-sans text-[11px] text-slate-400 font-medium leading-relaxed border-t border-slate-800/50 pt-2">
          {getGuideText()}
        </p>
      </div>

      <GameRulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />

      {/* חלון צ'אט נפתח תוך-כדי משחק (In-Game Chat Overlay Panel) */}
      {roomId && isChatOpen && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3 flex flex-col h-56 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center text-xs font-bold text-amber-400 border-b border-slate-800 pb-2 mb-2">
            <span>💬 צ'אט החדר ({roomId})</span>
            <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 text-xs pr-1">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-500 text-[10px] my-auto">אין הודעות צ'אט עדיין...</div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800/60">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-[10px]" style={{ color: msg.color || '#f59e0b' }}>
                      {msg.sender}
                    </span>
                    <span className="text-[8px] text-slate-500">{msg.time}</span>
                  </div>
                  <p className="text-slate-200 text-[11px]">{msg.text}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="flex gap-1.5 mt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="כתוב הודעה..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
            >
              שלח
            </button>
          </form>
        </div>
      )}

      {/* אזור פעולת הקוביות */}
      <div className="relative z-0 shrink-0">
        <RollDiceContainer />
      </div>

      {/* כפתור סיום תור */}
      <div className="w-full">
        <button
          onClick={handleEndTurn}
          disabled={!showEndTurnButton || isCurrentPlayerBot || isWrongOnlinePlayer}
          className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs tracking-wide shadow-lg transition-all duration-300 border
            ${(showEndTurnButton && !isCurrentPlayerBot && !isWrongOnlinePlayer)
              ? 'bg-emerald-700 text-white hover:bg-emerald-600 border-emerald-600 shadow-emerald-700/20 cursor-pointer animate-gentle-pulse'
              : 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed opacity-50'
            }`}
        >
          {isCurrentPlayerBot ? 'הבוט חושב...' : 'סיום תור ➔'}
        </button>
      </div>

      {/* פאנל זהב מיוחד עבור הרחבת סוחרים וברברים */}
      {activeExpansion === 'MERCHANTS_AND_BARBARIANS' && (
        <GoldTradePanel />
      )}

      {/* פאנל עגלת המסחר */}
      {activeExpansion === 'MERCHANTS_AND_BARBARIANS' && (
        <WagonUpgradePanel />
      )}

      {activeExpansion === 'CITIES_AND_KNIGHTS' && <CitiesKnightsPanel />}

      {/* פאנל הצעות לבנייה */}
      <BuildActionsPanel />

    </div>
  );
};
