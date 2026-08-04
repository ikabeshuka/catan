import React, { useState, useEffect } from 'react';
import { useGame, getPlayerTotalVP } from '../../context/GameContext';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useAppTrade } from '../../hooks/useAppTrade';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { WarningIcon } from '../common/Icons';

type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';

const RESOURCES: ResourceType[] = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];

const RESOURCE_LABELS: Record<ResourceType, string> = {
  WOOD: 'עץ',
  BRICK: 'לבנה',
  SHEEP: 'כבש',
  WHEAT: 'חיטה',
  ORE: 'ברזל',
};

const RESOURCE_IMAGES: Record<ResourceType, string> = {
  WOOD: '/wood1.png',
  BRICK: '/brick1.png',
  SHEEP: '/wool1.png',
  WHEAT: '/wheat1.png',
  ORE: '/rock1.png',
};

export const TradePanel: React.FC = () => {
  const {
    players,
    vertices,
    tiles,
    selectedScenario,
    longestRoadPlayerId,
    largestArmyPlayerId,
    setPlayers,
    addLog,
    setIsTradeModalOpen,
    roomId,
    myPlayerId,
    resourceBank,
    citiesKnightsState,
  } = useGame();
  const { tradeWithBank, turnSubPhase, isCurrentPlayerBot, currentPlayer } = useTurnManager();
  const { evaluateBotTradeDecision } = useAppTrade();

  const humanPlayer = (roomId
    ? players.find(p => p.id === myPlayerId)
    : players.find(p => !p.isBot) || players[0])!;
  const otherPlayers = players.filter(p => p.id !== humanPlayer.id);

  // Selector States
  const [giveRes, setGiveRes] = useState<ResourceType>('WOOD');
  const [giveAmt, setGiveAmt] = useState<number>(1);
  const [receiveRes, setReceiveRes] = useState<ResourceType>('BRICK');
  const [receiveAmt, setReceiveAmt] = useState<number>(1);

  // Targets Sub-Menu States
  const [showTargetsMenu, setShowTargetsMenu] = useState<boolean>(false);
  const [checkedTargets, setCheckedTargets] = useState<Record<string, boolean>>({});

  // Initialize all target players as checked by default
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    players.filter(p => p.id !== humanPlayer.id).forEach(p => {
      initial[p.id] = true;
    });
    setCheckedTargets(initial);
  }, [players, humanPlayer.id]); // Re-run if players list or local identity changes

  if (!humanPlayer) return null;

  const isWrongOnlinePlayer = !!roomId && (!myPlayerId || currentPlayer?.id !== myPlayerId);

  // Calculate owned harbors
  const ownedHarbors = vertices.filter(v =>
    v.playerId === humanPlayer.id &&
    v.structure !== 'NONE' &&
    v.isHarbor
  );

  const hasGenericHarbor = ownedHarbors.some(h => h.harborType === 'GENERIC');
  const hasSpecializedHarbor = ownedHarbors.some(h => h.harborType === giveRes);
  const hasMerchantTrade = citiesKnightsState?.merchant?.playerId === humanPlayer.id && citiesKnightsState.merchant.resource === giveRes;
  const hasMerchantFleetTrade = humanPlayer.merchantFleetResource === giveRes;
  const bankTradeRatio = (hasSpecializedHarbor || hasMerchantTrade || hasMerchantFleetTrade) ? 2 : hasGenericHarbor ? 3 : 4;

  const isProposeTradeEnabled =
    giveAmt > 0 &&
    receiveAmt > 0 &&
    giveRes !== receiveRes &&
    (humanPlayer.resources[giveRes] || 0) >= giveAmt &&
    !isCurrentPlayerBot &&
    !isWrongOnlinePlayer &&
    turnSubPhase === 'TRADE_AND_BUILD';

  const isBankTradeEnabled =
    giveAmt >= bankTradeRatio &&
    giveAmt % bankTradeRatio === 0 &&
    receiveAmt === giveAmt / bankTradeRatio &&
    giveRes !== receiveRes &&
    (humanPlayer.resources[giveRes] || 0) >= giveAmt &&
    !isCurrentPlayerBot &&
    !isWrongOnlinePlayer &&
    turnSubPhase === 'TRADE_AND_BUILD';

  const isHarborTradeEnabled = (() => {
    if (giveRes === receiveRes || isCurrentPlayerBot || isWrongOnlinePlayer || turnSubPhase !== 'TRADE_AND_BUILD') return false;
    const playerStock = humanPlayer.resources[giveRes] || 0;
    if (playerStock < giveAmt) return false;
    return bankTradeRatio < 4 && giveAmt >= bankTradeRatio && giveAmt % bankTradeRatio === 0 && receiveAmt === giveAmt / bankTradeRatio;
  })();

  const handleProposeTradeToPlayers = () => {
    const playerStock = humanPlayer.resources[giveRes] || 0;
    if (playerStock < giveAmt) {
      alert(`אין לך מספיק משאבים מסוג ${RESOURCE_LABELS[giveRes]} (יש לך ${playerStock})!`);
      return;
    }

    if (giveRes === receiveRes) {
      alert("לא ניתן לבצע עסקה על אותו משאב!");
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
        giveRes,
        giveAmt,
        receiveRes,
        receiveAmt
      );

      if (botAgreed) {
        dispatchGameAction({
          type: 'EXECUTE_PLAYER_TRADE', playerId: humanPlayer.id, targetPlayerId: bot.id,
          offer: { [giveRes]: giveAmt }, request: { [receiveRes]: receiveAmt },
        }, {
          roomId: roomId || undefined, isRemote: false,
          myPlayerId: roomId ? myPlayerId : humanPlayer.id,
          turnSubPhase, players, setPlayers, addLog,
        });
        /* Direct mutation replaced by dispatchGameAction.
        setPlayers((prevPlayers: any[]) => prevPlayers.map(p => {
          if (p.id === humanPlayer.id) {
            return {
              ...p,
              resources: {
                ...p.resources,
                [giveRes]: (p.resources[giveRes] || 0) - giveAmt,
                [receiveRes]: (p.resources[receiveRes] || 0) + receiveAmt
              }
            };
          } else if (p.id === bot.id) {
            return {
              ...p,
              resources: {
                ...p.resources,
                [giveRes]: (p.resources[giveRes] || 0) + giveAmt,
                [receiveRes]: (p.resources[receiveRes] || 0) - receiveAmt
              }
            };
          }
          return p;
        }));
        */

        addLog(`[מסחר] בוט ${bot.name} קיבל את ההצעה שלך והעסקה בוצעה!`);
        tradeExecuted = true;
        setShowTargetsMenu(false);
        break;
      } else {
        addLog(`[מסחר] בוט ${bot.name} סירב להצעת המסחר שלך.`);
      }
    }

    if (!tradeExecuted) {
      alert("כל הבוטים שסומנו סירבו להצעת המסחר שלך.");
    }
  };

  const handleTradeWithBank = () => {
    if (turnSubPhase !== 'TRADE_AND_BUILD') {
      alert("ניתן לסחור רק בשלב המסחר והבנייה!");
      return;
    }

    const playerStock = humanPlayer.resources[giveRes] || 0;
    if (playerStock < giveAmt) {
      alert(`אין לך מספיק משאבים מסוג ${RESOURCE_LABELS[giveRes]} (יש לך ${playerStock})!`);
      return;
    }

    const success = tradeWithBank(giveRes, receiveRes, giveAmt, receiveAmt);
    if (success) {
      // Reset inputs after successful bank trade
      setGiveAmt(1);
      setReceiveAmt(1);
    }
  };

  const playerStock = humanPlayer.resources[giveRes] || 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800/85 rounded-2xl p-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.45)] mt-2.5" dir="rtl">
      <button
        onClick={() => setIsTradeModalOpen(true)}
        className="w-full mb-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-2 px-4 rounded-xl shadow-lg hover:shadow-amber-500/10 hover:brightness-110 active:scale-[0.98] transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 border border-amber-400/80"
      >
        <span>פתח פאנל מסחר מלא ⤢</span>
      </button>

      <span className="font-extrabold text-slate-400 text-[11px] uppercase tracking-wider block border-b border-slate-850 pb-2 mb-3">
        או שלח הצעה מהירה:
      </span>

      {/* SELECTOR ROW */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* GIVING SELECTOR */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[10px] text-slate-400 font-bold">נותן:</span>
            <span className="text-xs font-black text-amber-400">יש לך: {playerStock}</span>
          </div>
          <select
            value={giveRes}
            onChange={(e) => {
              const res = e.target.value as ResourceType;
              setGiveRes(res);
              setGiveAmt(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold p-1.5 text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-none"
          >
            {RESOURCES.map(res => (
              <option key={res} value={res}>
                {RESOURCE_LABELS[res]} ({humanPlayer.resources[res] || 0})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={humanPlayer.resources[giveRes] || 0}
            value={giveAmt}
            onChange={(e) => setGiveAmt(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-center font-bold p-1 text-slate-100 focus:outline-none focus:border-amber-500 mt-1"
          />
        </div>

        {/* RECEIVING SELECTOR */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[10px] text-slate-400 font-bold">מקבל:</span>
          </div>
          <select
            value={receiveRes}
            onChange={(e) => setReceiveRes(e.target.value as ResourceType)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold p-1.5 text-slate-100 focus:ring-1 focus:ring-amber-500/50 focus:outline-none"
          >
            {RESOURCES.map(res => (
              <option key={res} value={res}>
                {RESOURCE_LABELS[res]}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={receiveAmt}
            onChange={(e) => setReceiveAmt(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-center font-bold p-1 text-slate-100 focus:outline-none focus:border-amber-500 mt-1"
          />
        </div>
      </div>

      {/* WARNINGS */}
      {playerStock < giveAmt && (
        <div className="text-red-400 text-[10px] font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20 mb-3 flex items-center gap-1.5">
          <WarningIcon size={12} className="text-red-500 inline-block flex-shrink-0" />
          <span>אין לך מספיק משאבי {RESOURCE_LABELS[giveRes]} להצעה זו!</span>
        </div>
      )}

      {/* ACTION BUTTONS (3 EQUAL COLUMNS) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Button 1: Propose Trade */}
        <button
          onClick={() => setShowTargetsMenu(prev => !prev)}
          disabled={!isProposeTradeEnabled}
          className={`font-extrabold py-2 px-1 rounded-xl shadow transition-all text-[10px] cursor-pointer flex flex-col items-center justify-center gap-0.5 min-h-[52px] leading-tight text-center border border-transparent
            ${isProposeTradeEnabled
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 active:scale-95'
              : 'bg-slate-800/40 text-slate-500 border-slate-800/50 opacity-45 cursor-not-allowed'
            }`}
        >
          <span className="font-black">הצע מסחר לשחקנים</span>
        </button>

        {/* Button 2: Bank Trade */}
        <button
          onClick={handleTradeWithBank}
          disabled={!isBankTradeEnabled}
          className={`font-extrabold py-2 px-1 rounded-xl shadow transition-all text-[10px] cursor-pointer flex flex-col items-center justify-center gap-0.5 min-h-[52px] leading-tight text-center border
            ${isBankTradeEnabled
              ? 'bg-gradient-to-l from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 hover:brightness-110 active:scale-95'
              : 'bg-slate-800/40 text-slate-500 border-slate-800/50 opacity-45 cursor-not-allowed'
            }`}
        >
          <span className="font-black">מסחר מול הבנק</span>
          <span className="text-[8px] opacity-75">(יחס {giveAmt}:{receiveAmt})</span>
        </button>

        {/* Button 3: Harbor Trade */}
        <button
          onClick={handleTradeWithBank}
          disabled={!isHarborTradeEnabled}
          className={`font-extrabold py-2 px-1 rounded-xl shadow transition-all text-[10px] cursor-pointer flex flex-col items-center justify-center gap-0.5 min-h-[52px] leading-tight text-center border
            ${isHarborTradeEnabled
              ? 'bg-gradient-to-l from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 hover:brightness-110 active:scale-95'
              : 'bg-slate-800/40 text-slate-500 border-slate-800/50 opacity-45 cursor-not-allowed'
            }`}
        >
          <span className="font-black">מסחר בנמל</span>
          <span className="text-[8px] opacity-75">(יחס {giveAmt}:{receiveAmt})</span>
        </button>
      </div>

      {/* TARGETS SUB-MENU */}
      {showTargetsMenu && isProposeTradeEnabled && (
        <div className="mt-3 p-2 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2 animate-fade-in">
          <label className="block text-[10px] font-bold text-slate-400 mb-1">שחקני יעד להצעה:</label>
          {otherPlayers.length === 0 ? (
            <span className="text-[10px] text-slate-500 italic">אין שחקנים אחרים</span>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 w-full">
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
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all duration-200 cursor-pointer text-center select-none min-h-[64px] shadow-sm ${
                      isChecked ? 'scale-[1.02] shadow-md font-black' : 'opacity-80 hover:opacity-100 hover:scale-[1.01]'
                    }`}
                  >
                    <span className="text-[10px] leading-tight block truncate max-w-full font-bold">
                      {p.name}
                    </span>
                    <span className="text-[8px] opacity-75 mt-0.5 block">
                      {p.isBot ? 'מחשב' : 'שחקן'}
                    </span>
                    <span className={`text-[9px] font-black mt-1 px-1 py-0.5 rounded ${
                      isChecked ? 'bg-black/20' : 'bg-slate-950/40 text-slate-300'
                    }`}>
                      🏆 {getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, false, vertices, tiles, selectedScenario)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={handleProposeTradeToPlayers}
            className="w-full mt-2 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] rounded-lg shadow hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            שלח הצעת מסחר
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/45 p-2">
        <span className="shrink-0 text-[10px] font-black text-slate-300">מלאי הבנק:</span>
        <div className="grid flex-1 grid-cols-5 gap-1">
          {RESOURCES.map(resource => (
            <div key={`trade-bank-${resource}`} className="flex min-w-0 items-center justify-center gap-0.5 rounded-md bg-slate-900/80 px-1 py-1" title={`${RESOURCE_LABELS[resource]}: ${resourceBank[resource] || 0}`}>
              <img src={RESOURCE_IMAGES[resource]} className="h-4 w-4 object-contain" alt="" />
              <span className="text-[10px] font-black text-emerald-400">{resourceBank[resource] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
