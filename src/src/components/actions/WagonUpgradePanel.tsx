import React from 'react';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useGame } from '../../context/GameContext';
import { dispatchGameAction } from '../../services/gameDispatcher';

export const WagonUpgradePanel: React.FC = () => {
  const { currentPlayer, turnSubPhase } = useTurnManager();
  const { 
    players, 
    goldCoins, 
    setGoldCoins, 
    setPlayers, 
    addLog, 
    isMovingWagon, 
    setIsMovingWagon,
    roomId,
    myPlayerId,
    resourceBank,
    setResourceBank,
  } = useGame();

  if (!currentPlayer) return null;

  const humanPlayer = (roomId
    ? players.find((p) => p.id === myPlayerId)
    : players.find((p) => !p.isBot) || players[0])!;
  const isWrongOnlinePlayer = !!roomId && (!myPlayerId || currentPlayer.id !== myPlayerId);

  // Helper to check if human player has a specific resource and count
  const checkHumanResource = (type: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', amount: number): boolean => {
    return (humanPlayer.resources[type] || 0) >= amount;
  };

  // Wagon variables
  const wagonLevel = currentPlayer.wagonLevel || 1;
  const remainingPoints = currentPlayer.remainingMovementPoints !== undefined ? currentPlayer.remainingMovementPoints : 4;
  const maxPoints = wagonLevel <= 1 ? 4 : wagonLevel <= 3 ? 5 : 6;
  const wagonPosition = currentPlayer.wagonPosition || '';

  const handleToggleWagonMovement = () => {
    if (setIsMovingWagon) {
      setIsMovingWagon(!isMovingWagon);
    }
  };

  const canUpgradeWithResources = !isWrongOnlinePlayer && checkHumanResource('WOOD', 1) && checkHumanResource('ORE', 1) && wagonLevel < 5;
  const canUpgradeWithGold = !isWrongOnlinePlayer && (goldCoins[currentPlayer.id] || 0) >= 3 && wagonLevel < 5;

  const dispatchUpgrade = (payment: 'RESOURCES' | 'GOLD') => dispatchGameAction({
    type: 'UPGRADE_WAGON',
    playerId: currentPlayer.id,
    newLevel: (wagonLevel + 1) as 2 | 3 | 4 | 5,
    payment,
  }, {
    roomId: roomId || undefined,
    isRemote: false,
    myPlayerId: roomId ? myPlayerId : currentPlayer.id,
    players,
    setPlayers,
    goldCoins,
    setGoldCoins,
    resourceBank,
    setResourceBank,
    addLog,
  });

  const upgradeWagonWithResources = () => {
    if (!canUpgradeWithResources) return;
    dispatchUpgrade('RESOURCES');
    /* Legacy direct mutation replaced by dispatchUpgrade.
    return;
    setPlayers((prevPlayers: Player[]) => prevPlayers.map(p => {
      if (p.id === currentPlayer.id) {
        const nextLevel = (p.wagonLevel || 1) + 1;
        const nextMax = nextLevel === 2 ? 5 : 6;
        return {
          ...p,
          wagonLevel: nextLevel,
          resources: {
            ...p.resources,
            WOOD: p.resources.WOOD - 1,
            ORE: p.resources.ORE - 1
          },
          remainingMovementPoints: nextMax
        };
      }
      return p;
    }));
    addLog(`🚚 ${currentPlayer.name} שדרג/ה את עגלת המסחר לרמה ${wagonLevel + 1} באמצעות משאבים (1 עץ + 1 ברזל)!`);
    */
  };

  const upgradeWagonWithGold = () => {
    if (!canUpgradeWithGold) return;
    dispatchUpgrade('GOLD');
    /* Legacy direct mutation replaced by dispatchUpgrade.
    return;
    setGoldCoins((prev: Record<string, number>) => ({
      ...prev,
      [currentPlayer.id]: (prev[currentPlayer.id] || 0) - 3
    }));
    setPlayers((prevPlayers: Player[]) => prevPlayers.map(p => {
      if (p.id === currentPlayer.id) {
        const nextLevel = (p.wagonLevel || 1) + 1;
        const nextMax = nextLevel === 2 ? 5 : 6;
        return {
          ...p,
          wagonLevel: nextLevel,
          remainingMovementPoints: nextMax
        };
      }
      return p;
    }));
    addLog(`🚚 ${currentPlayer.name} שדרג/ה את עגלת המסחר לרמה ${wagonLevel + 1} באמצעות 3 מטבעות זהב!`);
    */
  };

  return (
    <div className="relative overflow-hidden bg-slate-900/90 p-3 rounded-2xl border border-blue-500/30 shadow-md flex flex-col gap-2.5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xl">🚚</span>
          <span className="text-xs font-bold text-blue-400">עגלת המסחר (Baggage Train):</span>
        </div>
        <span className="text-xs font-black bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300">
          רמה {wagonLevel}/3
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-300 bg-slate-950/50 p-2 rounded-xl border border-slate-800/40">
        <div>
          <span className="text-slate-400 block text-[9px]">מיקום נוכחי:</span>
          <span className="font-mono text-slate-200 truncate block max-w-full" title={wagonPosition}>
            {wagonPosition ? wagonPosition.replace('v_', '') : 'לא נקבע'}
          </span>
        </div>
        <div className="text-left">
          <span className="text-slate-400 block text-[9px]">נקודות תנועה:</span>
          <span className="text-amber-400 font-mono text-xs">
            {remainingPoints} / {maxPoints}
          </span>
        </div>
      </div>

      {!currentPlayer.isBot && !isWrongOnlinePlayer && turnSubPhase === 'TRADE_AND_BUILD' && (
        <div className="flex flex-col gap-2">
          {/* כפתור הנעת עגלה */}
          <button
            onClick={handleToggleWagonMovement}
            className={`w-full py-2 px-3 rounded-xl font-black text-xs transition-all duration-200 border cursor-pointer flex items-center justify-center gap-1.5
              ${isMovingWagon
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:brightness-110 active:scale-[0.98]'
                : 'bg-slate-950 text-blue-400 border-blue-900/60 hover:bg-blue-950/20 active:scale-[0.98]'
              }`}
          >
            <span>{isMovingWagon ? '🛑 בטל מצב תנועה' : '🚚 הנע עגלה'}</span>
          </button>

          {/* כפתורי שדרוג עגלה */}
          {wagonLevel < 5 ? (
            <div className="flex flex-col gap-1.5 border-t border-slate-800/60 pt-2.5">
              <span className="text-[10px] text-slate-400 font-bold block text-center mb-0.5">שדרג עגלה לרמה {wagonLevel + 1}:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {/* שדרוג באמצעות משאבים */}
                <button
                  disabled={!canUpgradeWithResources}
                  onClick={upgradeWagonWithResources}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition-all duration-200 border cursor-pointer flex flex-col items-center justify-center gap-1
                    ${canUpgradeWithResources
                      ? 'bg-slate-950 text-emerald-400 border-emerald-900 hover:bg-emerald-950/20 active:scale-[0.97]'
                      : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
                    }`}
                >
                  <span className="leading-none">שדרוג משאבים</span>
                  <span className="text-[8px] opacity-75 font-normal">(1 ברזל + 1 עץ)</span>
                </button>

                {/* שדרוג באמצעות זהב */}
                <button
                  disabled={!canUpgradeWithGold}
                  onClick={upgradeWagonWithGold}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[10px] transition-all duration-200 border cursor-pointer flex flex-col items-center justify-center gap-1
                    ${canUpgradeWithGold
                      ? 'bg-slate-950 text-amber-400 border-amber-900 hover:bg-amber-950/20 active:scale-[0.97]'
                      : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed opacity-50'
                    }`}
                >
                  <span className="leading-none">שדרוג זהב</span>
                  <span className="text-[8px] opacity-75 font-normal">(3 זהב)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-emerald-500 font-bold text-center border-t border-slate-800/60 pt-2">
              ⭐ עגלת המסחר ברמה המקסימלית!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
