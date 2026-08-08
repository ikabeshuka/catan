import React, { useState } from 'react';
import { useGame, getPlayerTotalVP } from '../../context/GameContext';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useAppTrade } from '../../hooks/useAppTrade';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { CrossIcon, DealIcon } from '../common/Icons';
import { TransparentImage } from '../common/TransparentImage';

const RESOURCE_IMAGES: Record<string, string> = {
  WOOD: '/wood1.png',
  BRICK: '/brick1.png',
  SHEEP: '/wool1.png',
  WHEAT: '/wheat1.png',
  ORE: '/rock1.png',
};

const RESOURCE_LABELS: Record<string, string> = {
  WOOD: 'עץ',
  BRICK: 'לבנה',
  SHEEP: 'כבש',
  WHEAT: 'חיטה',
  ORE: 'ברזל',
};

interface UnifiedTradeModalProps {
  onClose: () => void;
}

export const UnifiedTradeModal: React.FC<UnifiedTradeModalProps> = ({ onClose }) => {
  const {
    players,
    vertices,
    tiles,
    selectedScenario,
    longestRoadPlayerId,
    largestArmyPlayerId,
    setPlayers,
    addLog,
    activePortTrade,
    roomId,
    myPlayerId,
    resourceBank,
  } = useGame();
  const { tradeWithBank, turnSubPhase, currentPlayer } = useTurnManager();
  const { evaluateBotTradeDecision } = useAppTrade();

  // Multi-resource offer and request states
  const [offer, setOffer] = useState<Record<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', number>>({
    WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0
  });
  const [request, setRequest] = useState<Record<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', number>>({
    WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0
  });

  const humanPlayer = (roomId
    ? players.find(p => p.id === myPlayerId)
    : players.find(p => !p.isBot) || players[0])!;
  const otherPlayers = players.filter(p => p.id !== humanPlayer.id);
  const isWrongOnlinePlayer = !!roomId && (!myPlayerId || currentPlayer?.id !== myPlayerId);

  // Pre-select harbor resource if opened via clicking a specific harbor node
  React.useEffect(() => {
    if (activePortTrade && activePortTrade.harborType && activePortTrade.harborType !== 'GENERIC') {
      const res = activePortTrade.harborType as 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
      setOffer(prev => ({ ...prev, [res]: 2 }));
    }
  }, [activePortTrade]);

  // Initialize targets mapping state (default: all checked)
  const [checkedTargets, setCheckedTargets] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    otherPlayers.forEach(p => {
      initial[p.id] = true;
    });
    return initial;
  });

  // Calculate owned harbors
  const ownedHarbors = vertices.filter(v =>
    v.playerId === humanPlayer.id &&
    v.structure !== 'NONE' &&
    v.isHarbor
  );

  const hasGenericHarbor = ownedHarbors.some(h => h.harborType === 'GENERIC');

  // Extract non-zero entries for single-resource checks (for bank/port trade)
  const offerEntries = Object.entries(offer).filter(([_, amt]) => amt > 0) as ['WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', number][];
  const requestEntries = Object.entries(request).filter(([_, amt]) => amt > 0) as ['WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', number][];

  const isSingleResourceTrade = offerEntries.length === 1 && requestEntries.length === 1;
  const singleGiveRes = offerEntries[0]?.[0];
  const singleGiveAmt = offerEntries[0]?.[1] || 0;
  const singleReceiveRes = requestEntries[0]?.[0];
  const singleReceiveAmt = requestEntries[0]?.[1] || 0;

  const hasSpecializedHarbor = singleGiveRes ? ownedHarbors.some(h => h.harborType === singleGiveRes) : false;

  const handleOfferCardClick = (res: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE') => {
    const isCurrentlyActive = (offer[res] || 0) > 0;
    if (isCurrentlyActive) {
      setOffer({ WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    } else {
      setOffer({
        WOOD: res === 'WOOD' ? 1 : 0,
        BRICK: res === 'BRICK' ? 1 : 0,
        SHEEP: res === 'SHEEP' ? 1 : 0,
        WHEAT: res === 'WHEAT' ? 1 : 0,
        ORE: res === 'ORE' ? 1 : 0,
      });
    }
  };

  const handleRequestCardClick = (res: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE') => {
    const isCurrentlyActive = (request[res] || 0) > 0;
    if (isCurrentlyActive) {
      setRequest({ WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    } else {
      setRequest({
        WOOD: res === 'WOOD' ? 1 : 0,
        BRICK: res === 'BRICK' ? 1 : 0,
        SHEEP: res === 'SHEEP' ? 1 : 0,
        WHEAT: res === 'WHEAT' ? 1 : 0,
        ORE: res === 'ORE' ? 1 : 0,
      });
    }
  };

  const handleProposeTradeToPlayers = () => {
    if (isWrongOnlinePlayer) return;

    // Verify player has enough resources
    for (const [res, amt] of Object.entries(offer)) {
      const stock = humanPlayer.resources[res as keyof typeof humanPlayer.resources] || 0;
      if (stock < amt) {
        alert(`אין לך מספיק משאבים מסוג ${RESOURCE_LABELS[res]} (יש לך ${stock}, נדרש ${amt})!`);
        return;
      }
    }

    const totalOfferAmt = Object.values(offer).reduce((sum, a) => sum + a, 0);
    const totalRequestAmt = Object.values(request).reduce((sum, a) => sum + a, 0);

    if (totalOfferAmt === 0 || totalRequestAmt === 0) {
      alert("הצעת המסחר חייבת לכלול לפחות משאב אחד מוצע ומשאב אחד מבוקש!");
      return;
    }

    const checkedTargetsList = otherPlayers.filter(p => checkedTargets[p.id]);

    if (checkedTargetsList.length === 0) {
      alert("לא נבחרו שחקני יעד למסחר.");
      return;
    }

    const botsToTrade = checkedTargetsList.filter(p => p.isBot);

    if (botsToTrade.length === 0) {
      alert("לא נמצאו בוטים מתאימים למסחר מבין שחקני היעד המסומנים.");
      return;
    }

    let tradeExecuted = false;

    for (const bot of botsToTrade) {
      const botAgreed = evaluateBotTradeDecision(
        bot,
        offer,
        request
      );

      if (botAgreed) {
        dispatchGameAction({
          type: 'EXECUTE_PLAYER_TRADE', playerId: humanPlayer.id, targetPlayerId: bot.id,
          offer, request,
        }, {
          roomId: roomId || undefined, isRemote: false,
          myPlayerId: roomId ? myPlayerId : humanPlayer.id,
          turnSubPhase, players, setPlayers, addLog,
        });

        addLog(`[מסחר] בוט ${bot.name} קיבל את ההצעה שלך והעסקה בוצעה!`);
        tradeExecuted = true;
        onClose();
        break;
      } else {
        addLog(`[מסחר] בוט ${bot.name} סירב להצעת המסחר שלך.`);
      }
    }

    if (!tradeExecuted) {
      alert("כל הבוטים שסומנו סירבו להצעת המסחר שלך.");
    }
  };

  const isBankTradeEnabled = (() => {
    if (isWrongOnlinePlayer || !isSingleResourceTrade || singleGiveRes === singleReceiveRes || turnSubPhase !== 'TRADE_AND_BUILD') return false;
    const playerStock = humanPlayer.resources[singleGiveRes] || 0;
    return singleGiveAmt >= 4 && singleGiveAmt % 4 === 0 && singleReceiveAmt === singleGiveAmt / 4 && playerStock >= singleGiveAmt;
  })();

  const isHarborTradeEnabled = (() => {
    if (isWrongOnlinePlayer || !isSingleResourceTrade || singleGiveRes === singleReceiveRes || turnSubPhase !== 'TRADE_AND_BUILD') return false;
    const playerStock = humanPlayer.resources[singleGiveRes] || 0;
    if (playerStock < singleGiveAmt) return false;
    if (hasSpecializedHarbor && singleGiveAmt >= 2 && singleGiveAmt % 2 === 0 && singleReceiveAmt === singleGiveAmt / 2) {
      return true;
    }
    if (hasGenericHarbor && singleGiveAmt >= 3 && singleGiveAmt % 3 === 0 && singleReceiveAmt === singleGiveAmt / 3) {
      return true;
    }
    return false;
  })();

  const handleTradeWithBank = () => {
    if (isWrongOnlinePlayer) return;
    if (!isSingleResourceTrade) {
      alert("לא ניתן לבצע מסחר בנמל/בנק המורכב מכמה סוגי משאבים!");
      return;
    }
    if (turnSubPhase !== 'TRADE_AND_BUILD') {
      alert("ניתן לסחור רק בשלב המסחר והבנייה!");
      return;
    }

    const playerStock = humanPlayer.resources[singleGiveRes] || 0;
    if (playerStock < singleGiveAmt) {
      alert(`אין לך מספיק משאבים מסוג ${RESOURCE_LABELS[singleGiveRes]} (יש לך ${playerStock})!`);
      return;
    }

    const success = tradeWithBank(singleGiveRes, singleReceiveRes, singleGiveAmt, singleReceiveAmt);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-right" dir="rtl">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
        >
          <CrossIcon size={16} />
        </button>

        <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
          <DealIcon size={22} className="text-amber-500 inline-block" />
          <span>פאנל מסחר מאוחד (שחקנים / בנק / נמל)</span>
        </h3>

        {/* HARBOR ACCESS BADGES */}
        {ownedHarbors.length > 0 && (
          <div className="mb-5 bg-slate-950/40 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
            <span className="text-xs text-slate-400 font-bold">גישה פעילה לנמלים:</span>
            <div className="flex flex-wrap gap-3">
              {ownedHarbors.some(h => h.harborType === 'GENERIC') && (
                <div className="flex flex-col items-center bg-slate-900/80 border border-amber-500/20 px-3 py-1.5 rounded-lg text-center min-w-[60px]">
                  <div className="w-10 h-10 bg-slate-100/90 rounded-xl flex items-center justify-center p-1 shadow-sm">
                    <TransparentImage src="/gold1.png" className="object-contain w-full h-full" alt="נמל כללי" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">כללי 3:1</span>
                </div>
              )}
              {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).map(res => {
                const hasPort = ownedHarbors.some(h => h.harborType === res);
                if (!hasPort) return null;
                return (
                  <div key={res} className="flex flex-col items-center bg-slate-900/80 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-center min-w-[60px]">
                    <div className="w-10 h-10 bg-slate-100/90 rounded-xl flex items-center justify-center p-1 shadow-sm">
                      <TransparentImage src={RESOURCE_IMAGES[res]} className="object-contain w-full h-full" alt={RESOURCE_LABELS[res]} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">{RESOURCE_LABELS[res]} 2:1</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* GIVING RESOURCE ROW */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-slate-300 text-sm font-bold">אני מציע לתת (Offering):</label>
              <button
                type="button"
                onClick={() => setOffer({ WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 })}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition-colors font-bold cursor-pointer"
              >
                איפוס
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).map((res) => {
                const count = offer[res] || 0;
                const stock = humanPlayer.resources[res] || 0;
                
                const bgStyle = count > 0
                  ? { background: 'linear-gradient(to top, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.15) 42%, rgba(245, 158, 11, 0.01) 50%, transparent 100%)' }
                  : undefined;
                const borderClass = count > 0
                  ? 'border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.15)] scale-[1.01]'
                  : 'border-slate-800/80 hover:border-slate-700/80';

                return (
                  <div
                    key={res}
                    style={bgStyle}
                    onClick={() => handleOfferCardClick(res)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border bg-slate-950/40 text-slate-400 gap-1 transition-all duration-200 cursor-pointer select-none ${borderClass}`}
                  >
                    <div className="w-10 h-10 bg-slate-100/90 rounded-xl flex items-center justify-center p-1 shadow-sm pointer-events-none">
                      <TransparentImage src={RESOURCE_IMAGES[res]} className="object-contain w-full h-full" alt={RESOURCE_LABELS[res]} />
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold pointer-events-none">{RESOURCE_LABELS[res]}</span>
                    <span className="text-[10px] text-slate-400 font-semibold pointer-events-none">(מלאי: {stock})</span>
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        disabled={count <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOffer(prev => ({ ...prev, [res]: Math.max(0, count - 1) }));
                        }}
                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-slate-100 rounded flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className={`text-xs font-black min-w-[14px] text-center ${count > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{count}</span>
                      <button
                        type="button"
                        disabled={count >= stock}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOffer(prev => ({ ...prev, [res]: Math.min(stock, count + 1) }));
                        }}
                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-slate-100 rounded flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REQUESTING RESOURCE ROW */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-slate-300 text-sm font-bold">אני מבקש לקבל (Requesting):</label>
              <button
                type="button"
                onClick={() => setRequest({ WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 })}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded transition-colors font-bold cursor-pointer"
              >
                איפוס
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).map((res) => {
                const count = request[res] || 0;
                
                const bgStyle = count > 0
                  ? { background: 'linear-gradient(to top, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.15) 42%, rgba(16, 185, 129, 0.01) 50%, transparent 100%)' }
                  : undefined;
                const borderClass = count > 0
                  ? 'border-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.15)] scale-[1.01]'
                  : 'border-slate-800/80 hover:border-slate-700/80';

                return (
                  <div
                    key={res}
                    style={bgStyle}
                    onClick={() => handleRequestCardClick(res)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border bg-slate-950/40 text-slate-400 gap-1 transition-all duration-200 cursor-pointer select-none ${borderClass}`}
                  >
                    <div className="w-10 h-10 bg-slate-100/90 rounded-xl flex items-center justify-center p-1 shadow-sm pointer-events-none">
                      <TransparentImage src={RESOURCE_IMAGES[res]} className="object-contain w-full h-full" alt={RESOURCE_LABELS[res]} />
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold pointer-events-none">{RESOURCE_LABELS[res]}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        disabled={count <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequest(prev => ({ ...prev, [res]: Math.max(0, count - 1) }));
                        }}
                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-slate-100 rounded flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className={`text-xs font-black min-w-[14px] text-center ${count > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{count}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequest(prev => ({ ...prev, [res]: count + 1 }));
                        }}
                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TARGET SELECTION CHECKBOXES */}
          <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-800">
            <label className="block text-slate-300 text-xs font-bold mb-2">הצעת מסחר - שחקני יעד:</label>
            {otherPlayers.length === 0 ? (
              <span className="text-xs text-slate-500 italic">אין שחקנים אחרים פנויים</span>
            ) : (
              <div className="grid grid-cols-3 gap-3 w-full">
                {otherPlayers.map(p => {
                  const isChecked = !!checkedTargets[p.id];
                  const baseColor = p.color;
                  
                  // Active: bottom half filled with color, fading at the meeting point. Unactive: transparent, only border.
                  // The colors are brighter and lighter.
                  const bgStyle = isChecked 
                    ? `linear-gradient(to top, ${baseColor}a5 0%, ${baseColor}80 42%, ${baseColor}05 50%, transparent 100%)`
                    : 'transparent';
                  
                  const borderStyle = isChecked 
                    ? `2px solid ${baseColor}` 
                    : `1px solid ${baseColor}bf`; // Brighter inactive border
                    
                  const textColor = '#f1f5f9'; // Always bright text because the top half of the card is dark/transparent

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCheckedTargets(prev => ({
                          ...prev,
                          [p.id]: !prev[p.id]
                        }));
                      }}
                      style={{
                        background: bgStyle,
                        border: borderStyle,
                        color: textColor,
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 cursor-pointer text-center select-none min-h-[72px] shadow-sm ${
                        isChecked ? 'scale-[1.02] shadow-md font-black' : 'opacity-80 hover:opacity-100 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="text-xs leading-tight block truncate max-w-full font-bold">
                        {p.name}
                      </span>
                      <span className="text-[10px] opacity-75 mt-0.5 block">
                        {p.isBot ? 'מחשב' : 'שחקן'}
                      </span>
                      <span className={`text-[11px] font-black mt-1.5 px-2 py-0.5 rounded ${
                        isChecked ? 'bg-black/20' : 'bg-slate-950/40 text-slate-300'
                      }`}>
                        🏆 {getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, false, vertices, tiles, selectedScenario)} נק'
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* TRADE ACTIONS */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {/* Button 1: Propose Trade */}
          <button
            onClick={handleProposeTradeToPlayers}
            disabled={isWrongOnlinePlayer || Object.values(offer).reduce((sum, a) => sum + a, 0) <= 0 || Object.values(request).reduce((sum, a) => sum + a, 0) <= 0}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold py-3 px-1 rounded-xl shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed transition-all text-xs cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[64px]"
          >
            <span className="font-black text-center leading-tight">הצע מסחר לשחקנים</span>
          </button>

          {/* Button 2: Bank Trade */}
          <button
            onClick={handleTradeWithBank}
            disabled={!isBankTradeEnabled}
            className={`font-extrabold py-3 px-1 rounded-xl shadow-lg transition-all text-xs cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[64px] border
              ${isBankTradeEnabled
                ? 'bg-gradient-to-l from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 hover:brightness-110 active:scale-95'
                : 'bg-slate-800/40 text-slate-500 border-slate-800/50 opacity-45 cursor-not-allowed'
              }`}
            title={!isSingleResourceTrade && (Object.values(offer).reduce((s, x) => s + (x > 0 ? 1 : 0), 0) > 1 || Object.values(request).reduce((s, x) => s + (x > 0 ? 1 : 0), 0) > 1) ? 'מסחר מול הבנק אינו זמין במסחר של סוגי משאבים שונים' : ''}
          >
            <span className="font-black text-center leading-tight">מסחר מול הבנק</span>
            {isSingleResourceTrade && <span className="text-[9px] opacity-75">(יחס {singleGiveAmt}:{singleReceiveAmt})</span>}
          </button>

          {/* Button 3: Harbor Trade */}
          <button
            onClick={handleTradeWithBank}
            disabled={!isHarborTradeEnabled}
            className={`font-extrabold py-3 px-1 rounded-xl shadow-lg transition-all text-xs cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[64px] border
              ${isHarborTradeEnabled
                ? 'bg-gradient-to-l from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 hover:brightness-110 active:scale-95'
                : 'bg-slate-800/40 text-slate-500 border-slate-800/50 opacity-45 cursor-not-allowed'
              }`}
            title={!isSingleResourceTrade && (Object.values(offer).reduce((s, x) => s + (x > 0 ? 1 : 0), 0) > 1 || Object.values(request).reduce((s, x) => s + (x > 0 ? 1 : 0), 0) > 1) ? 'מסחר בנמל אינו זמין במסחר של סוגי משאבים שונים' : ''}
          >
            <span className="font-black text-center leading-tight">מסחר בנמל</span>
            {isSingleResourceTrade && <span className="text-[9px] opacity-75">(יחס {singleGiveAmt}:{singleReceiveAmt})</span>}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
          <span className="shrink-0 text-xs font-black text-slate-300">מלאי הבנק:</span>
          <div className="grid flex-1 grid-cols-5 gap-2">
            {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).map(resource => (
              <div key={`modal-bank-${resource}`} className="flex items-center justify-center gap-1 rounded-lg bg-slate-900/80 px-1.5 py-1" title={`${RESOURCE_LABELS[resource]}: ${resourceBank[resource] || 0}`}>
                <TransparentImage src={RESOURCE_IMAGES[resource]} className="h-5 w-5 object-contain" alt="" />
                <span className="text-xs font-black text-emerald-400">{resourceBank[resource] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
