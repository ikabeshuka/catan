import { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';

export const useBotTimer = () => {
  const {
    gamePhase,
    players,
    currentPlayerIndex,
    turnSubPhase,
    goldSelectionQueue,
    addLog,
    setCurrentPlayerIndex,
    setTurnSubPhase,
  } = useGame();

  const { endTurn } = useTurnManager();

  const [botTimeLimit, setBotTimeLimit] = useState<number>(10);
  const [botTimeRemaining, setBotTimeRemaining] = useState<number>(10 * 1000);

  const activePlayer = players[currentPlayerIndex];

  // מעבר בטוח לתור הבא במקרה של עצירה ידנית או אוטומטית (זמן תם)
  const forceNextTurn = useCallback(() => {
    if (gamePhase !== 'LOBBY' && activePlayer && activePlayer.isBot) {
      addLog(`[מערכת] תור הבוט ${activePlayer.name} הופסק ידנית או עקב חריגה מזמן התגובה (${botTimeLimit} שניות).`);
      
      if (gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2') {
        endTurn();
      } else {
        const nextIndex = (currentPlayerIndex + 1) % players.length;
        setCurrentPlayerIndex(nextIndex);
        setTurnSubPhase('BEFORE_ROLL');
      }
    }
  }, [gamePhase, activePlayer, addLog, botTimeLimit, endTurn, currentPlayerIndex, players, setCurrentPlayerIndex, setTurnSubPhase]);

  // איפוס זמן התגובה בכל תחילת תור או החלפת שלב
  useEffect(() => {
    setBotTimeRemaining(botTimeLimit * 1000);
  }, [currentPlayerIndex, turnSubPhase, gamePhase, activePlayer?.id, botTimeLimit]);

  // זיהוי האם אנו ממתינים למהלך של השחקן האנושי (שיגרור הקפאה של הטיימר)
  const isWaitingForPlayerAction = 
    (turnSubPhase as string) === 'DISCARD_PHASE' ||
    (turnSubPhase === 'GOLD_RESOURCE_SELECTION' && goldSelectionQueue && goldSelectionQueue.length > 0 && goldSelectionQueue.some(item => {
      const p = players.find(pl => pl.id === item.playerId);
      return p && !p.isBot;
    })) ||
    (typeof window !== 'undefined' && (window as any).isBotTimerPaused === true);

  // אפקט שעוקב אחר זמן התגובה של הבוטים ומריץ ספירה לאחור עם אפשרות להקפאה והמשך
  useEffect(() => {
    if (gamePhase === 'LOBBY' || !activePlayer || !activePlayer.isBot) {
      return;
    }

    if (isWaitingForPlayerAction) {
      return;
    }

    const intervalId = setInterval(() => {
      setBotTimeRemaining(prev => {
        // בדיקה חוזרת בתוך הלולאה למקרה שהמצב השתנה ללא רינדור מחדש מיידי
        const currentlyPaused = 
          (turnSubPhase as string) === 'DISCARD_PHASE' ||
          (turnSubPhase === 'GOLD_RESOURCE_SELECTION' && goldSelectionQueue && goldSelectionQueue.length > 0 && goldSelectionQueue.some(item => {
            const p = players.find(pl => pl.id === item.playerId);
            return p && !p.isBot;
          })) ||
          (typeof window !== 'undefined' && (window as any).isBotTimerPaused === true);

        if (currentlyPaused) {
          return prev;
        }

        if (prev <= 1000) {
          clearInterval(intervalId);
          forceNextTurn();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentPlayerIndex, turnSubPhase, gamePhase, activePlayer, isWaitingForPlayerAction, botTimeLimit, forceNextTurn, goldSelectionQueue, players]);

  return {
    botTimeLimit,
    setBotTimeLimit,
    botTimeRemaining,
    setBotTimeRemaining,
    isWaitingForPlayerAction,
    forceNextTurn,
  };
};
