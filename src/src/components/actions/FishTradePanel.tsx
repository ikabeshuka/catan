import React, { useState } from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useGame, getPlayerTotalVP } from '../../context/GameContext';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { canPayFish } from '../../utils/gameEngine/fishermenRules';

const RESOURCE_IMAGES = {
  WOOD: '/wood1.png',
  BRICK: '/brick1.png',
  SHEEP: '/wool1.png',
  WHEAT: '/wheat1.png',
  ORE: '/rock1.png',
};

export const FishTradePanel: React.FC = () => {
  const { currentPlayer, turnSubPhase } = useTurnManager();
  const {
    players,
    setPlayers,
    addLog,
    roomId,
    myPlayerId,
    resourceBank,
    setResourceBank,
    devCardDeck,
    setDevCardDeck,
    roadBuildingRemaining,
    setRoadBuildingRemaining,
    setTiles,
    scenarioState,
    setScenarioState,
    longestRoadPlayerId,
    largestArmyPlayerId,
    vertices,
    tiles,
    selectedScenario,
  } = useGame();

  const [activeChoice, setActiveChoice] = useState<'NONE' | 'STEAL_PLAYER' | 'BANK_RESOURCE' | 'PASS_BOOT'>('NONE');

  if (!currentPlayer) return null;

  const fishTokens = currentPlayer.fishTokens || [];
  const fishCount = fishTokens.reduce((total, token) => total + token, 0);
  const isWrongOnlinePlayer = !!roomId && (!myPlayerId || currentPlayer.id !== myPlayerId);
  const isMyTurn = !currentPlayer.isBot && !isWrongOnlinePlayer && turnSubPhase === 'TRADE_AND_BUILD';

  const otherPlayers = players.filter(p => p.id !== currentPlayer.id);
  const currentPlayerVP = getPlayerTotalVP(currentPlayer, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario);

  // Eligible targets for Old Boot transfer (players with equal or more VPs)
  const bootTargets = otherPlayers.filter(p => {
    const targetVP = getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario);
    return targetVP >= currentPlayerVP;
  });

  const handleSpendFish = (actionType: 'MOVE_ROBBER' | 'STEAL_CARD' | 'TAKE_BANK_RESOURCE' | 'FREE_ROAD' | 'FREE_DEV_CARD', targetId?: string, resource?: any) => {
    dispatchGameAction({
      type: 'SPEND_FISH_ACTION',
      playerId: currentPlayer.id,
      actionType,
      targetPlayerId: targetId,
      resource,
    }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : currentPlayer.id,
      turnSubPhase,
      players,
      setPlayers,
      resourceBank,
      setResourceBank,
      devCardDeck,
      setDevCardDeck,
      roadBuildingRemaining,
      setRoadBuildingRemaining,
      setTiles,
      scenarioState,
      setScenarioState,
      addLog,
    });
    setActiveChoice('NONE');
  };

  const handlePassBoot = (targetId: string) => {
    dispatchGameAction({
      type: 'PASS_OLD_BOOT',
      playerId: currentPlayer.id,
      targetPlayerId: targetId,
    }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : currentPlayer.id,
      turnSubPhase,
      players,
      setPlayers,
      longestRoadPlayerId,
      largestArmyPlayerId,
      vertices,
      tiles,
      selectedScenario,
      addLog,
    });
    setActiveChoice('NONE');
  };

  return (
    <div className="relative overflow-hidden bg-slate-900/90 p-3 rounded-2xl border border-sky-500/35 shadow-md flex flex-col gap-2.5 text-right" dir="rtl">
      {/* כותרת מלאי דגים ומגף */}
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🎣</span>
            <span className="text-xs font-bold text-sky-400">חנות הדייגים (דגים):</span>
          </div>
          <span className="text-lg font-black font-mono text-sky-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
            {fishCount} דגים
          </span>
        </div>

        {/* תצוגת אסימוני דגים ומגף בתור תמונות */}
        <div className="flex flex-wrap gap-1.5 justify-start bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
          {(!currentPlayer.fishTokens || currentPlayer.fishTokens.length === 0) && !currentPlayer.hasOldBoot && (
            <span className="text-[10px] text-slate-500">אין ברשותך אסימוני דגים</span>
          )}
          {currentPlayer.fishTokens?.map((token: number, index: number) => {
            const imgSrc = token === 1 ? '/fish1.jpg' : token === 2 ? '/fish2.jpg' : '/fish3.jpg';
            return (
              <img 
                key={index} 
                src={imgSrc} 
                className="w-10 h-10 object-cover rounded-lg border border-slate-700 shadow-md hover:scale-105 transition-transform" 
                title={`אסימון דג בשווי ${token}`} 
                alt={`${token} fish`} 
              />
            );
          })}
          {currentPlayer.hasOldBoot && (
            <img 
              src="/old_boot.jpg" 
              className="w-10 h-10 object-cover rounded-lg border border-amber-500/50 shadow-md hover:scale-105 transition-transform" 
              title="המגף הישן" 
              alt="boot" 
            />
          )}
        </div>
      </div>

      {/* דפים ראשיים של בחירה */}
      {isMyTurn && activeChoice === 'NONE' && (
        <div className="flex flex-col gap-1.5">
          <button
            disabled={!canPayFish(fishTokens, 'MOVE_ROBBER')}
            onClick={() => handleSpendFish('MOVE_ROBBER')}
            className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between cursor-pointer
              ${canPayFish(fishTokens, 'MOVE_ROBBER') 
                ? 'bg-slate-950 border-sky-500/35 text-sky-200 hover:bg-sky-950/20' 
                : 'bg-slate-950/30 border-slate-800/50 text-slate-500 cursor-not-allowed'
              }`}
          >
            <span>🐱 2 דגים: סלק שודד/פיראט</span>
            <span className="font-mono text-[9px] bg-slate-900 px-1 py-0.5 rounded text-sky-400">2 דגים</span>
          </button>

          <button
            disabled={!canPayFish(fishTokens, 'STEAL_CARD')}
            onClick={() => setActiveChoice('STEAL_PLAYER')}
            className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between cursor-pointer
              ${canPayFish(fishTokens, 'STEAL_CARD') 
                ? 'bg-slate-950 border-sky-500/35 text-sky-200 hover:bg-sky-950/20' 
                : 'bg-slate-950/30 border-slate-800/50 text-slate-500 cursor-not-allowed'
              }`}
          >
            <span>🥷 3 דגים: גנוב קלף אקראי משחקן</span>
            <span className="font-mono text-[9px] bg-slate-900 px-1 py-0.5 rounded text-sky-400">3 דגים</span>
          </button>

          <button
            disabled={!canPayFish(fishTokens, 'TAKE_BANK_RESOURCE')}
            onClick={() => setActiveChoice('BANK_RESOURCE')}
            className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between cursor-pointer
              ${canPayFish(fishTokens, 'TAKE_BANK_RESOURCE') 
                ? 'bg-slate-950 border-sky-500/35 text-sky-200 hover:bg-sky-950/20' 
                : 'bg-slate-950/30 border-slate-800/50 text-slate-500 cursor-not-allowed'
              }`}
          >
            <span>🏦 4 דגים: קח משאב לבחירה מהבנק</span>
            <span className="font-mono text-[9px] bg-slate-900 px-1 py-0.5 rounded text-sky-400">4 דגים</span>
          </button>

          <button
            disabled={!canPayFish(fishTokens, 'FREE_ROAD')}
            onClick={() => handleSpendFish('FREE_ROAD')}
            className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between cursor-pointer
              ${canPayFish(fishTokens, 'FREE_ROAD') 
                ? 'bg-slate-950 border-sky-500/35 text-sky-200 hover:bg-sky-950/20' 
                : 'bg-slate-950/30 border-slate-800/50 text-slate-500 cursor-not-allowed'
              }`}
          >
            <span>🛣️ 5 דגים: בנה כביש/ספינה חינם</span>
            <span className="font-mono text-[9px] bg-slate-900 px-1 py-0.5 rounded text-sky-400">5 דגים</span>
          </button>

          <button
            disabled={!canPayFish(fishTokens, 'FREE_DEV_CARD')}
            onClick={() => handleSpendFish('FREE_DEV_CARD')}
            className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between cursor-pointer
              ${canPayFish(fishTokens, 'FREE_DEV_CARD') 
                ? 'bg-slate-950 border-sky-500/35 text-sky-200 hover:bg-sky-950/20' 
                : 'bg-slate-950/30 border-slate-800/50 text-slate-500 cursor-not-allowed'
              }`}
          >
            <span>📜 7 דגים: משוך קלף פיתוח חינם</span>
            <span className="font-mono text-[9px] bg-slate-900 px-1 py-0.5 rounded text-sky-400">7 דגים</span>
          </button>

          {currentPlayer.hasOldBoot && (
            <button
              disabled={bootTargets.length === 0}
              onClick={() => setActiveChoice('PASS_BOOT')}
              className={`w-full mt-2 py-1.5 px-3 rounded-lg text-[10px] font-black border transition-all flex items-center justify-between cursor-pointer
                ${bootTargets.length > 0 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 hover:brightness-110' 
                  : 'bg-slate-950/30 border-slate-800/50 text-slate-500 cursor-not-allowed'
                }`}
            >
              <span>👢 מסור מגף ישן (נדרש שחקן עם ≥ נקודות)</span>
              <span className="font-mono text-[9px] bg-amber-600/30 px-1.5 py-0.5 rounded text-slate-950 font-black">העבר</span>
            </button>
          )}
        </div>
      )}

      {/* תצוגת חלון בחירת שחקן לגניבה */}
      {isMyTurn && activeChoice === 'STEAL_PLAYER' && (
        <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-[10px] text-slate-400 font-bold block text-center">בחר שחקן יריב לגניבת קלף אקראי:</span>
          <div className="flex flex-col gap-1">
            {otherPlayers.map(p => {
              const countCards = Object.values(p.resources).reduce((sum, c) => sum + (c as number), 0);
              return (
                <button
                  key={p.id}
                  disabled={countCards === 0}
                  onClick={() => handleSpendFish('STEAL_CARD', p.id)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-850 flex items-center justify-between cursor-pointer text-xs font-bold"
                  style={{ borderRight: `3px solid ${p.color}` }}
                >
                  <span>{p.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{countCards} קלפים</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setActiveChoice('NONE')}
            className="w-full py-1 mt-1 text-[9px] font-bold text-rose-400 bg-slate-900 hover:bg-rose-950/10 rounded border border-slate-850 cursor-pointer"
          >
            ביטול
          </button>
        </div>
      )}

      {/* תצוגת חלון בחירת משאב מהבנק */}
      {isMyTurn && activeChoice === 'BANK_RESOURCE' && (
        <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-[10px] text-slate-400 font-bold block text-center">בחר משאב לקבל מהבנק תמורת 4 דגים:</span>
          <div className="grid grid-cols-5 gap-1">
            {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).map((res) => {
              const labelsHE = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };
              const isAvailable = (resourceBank?.[res] || 0) > 0;
              return (
                <button
                  key={res}
                  disabled={!isAvailable}
                  onClick={() => handleSpendFish('TAKE_BANK_RESOURCE', undefined, res)}
                  className={`p-1 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer
                    ${isAvailable 
                      ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700' 
                      : 'bg-slate-900/30 border-slate-950 text-slate-600 opacity-40 cursor-not-allowed'
                    }`}
                >
                  <img src={RESOURCE_IMAGES[res]} className="w-5 h-5 object-contain" alt={labelsHE[res]} />
                  <span className="text-[9px] font-bold text-slate-300">{labelsHE[res]}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setActiveChoice('NONE')}
            className="w-full py-1 text-[9px] font-bold text-rose-400 bg-slate-900 hover:bg-rose-950/10 rounded border border-slate-850 cursor-pointer"
          >
            ביטול
          </button>
        </div>
      )}

      {/* תצוגת חלון העברת המגף הישן */}
      {isMyTurn && activeChoice === 'PASS_BOOT' && (
        <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-[10px] text-slate-400 font-bold block text-center">בחר שחקן להעברת המגף הישן (חייב ≥ נקודות ממך):</span>
          <div className="flex flex-col gap-1">
            {bootTargets.map(p => {
              const targetVP = getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario);
              return (
                <button
                  key={p.id}
                  onClick={() => handlePassBoot(p.id)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-850 flex items-center justify-between cursor-pointer text-xs font-bold"
                  style={{ borderRight: `3px solid ${p.color}` }}
                >
                  <span>{p.name}</span>
                  <span className="text-[10px] text-amber-400 font-extrabold font-mono">🏆 {targetVP} נק׳</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setActiveChoice('NONE')}
            className="w-full py-1 mt-1 text-[9px] font-bold text-rose-400 bg-slate-900 hover:bg-rose-950/10 rounded border border-slate-850 cursor-pointer"
          >
            ביטול
          </button>
        </div>
      )}

      {/* הודעת פלאש למצב שבו זה לא תורך */}
      {(!isMyTurn || turnSubPhase !== 'TRADE_AND_BUILD') && (
        <p className="text-[10px] text-slate-400 leading-normal text-center bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
          ניתן לרכוש הטבות או להעביר את המגף הישן רק במהלך שלב המסחר והבנייה בתורך.
        </p>
      )}
    </div>
  );
};
