import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

export const useAppTrophies = () => {
  const {
    gamePhase,
    players,
    largestArmyPlayerId,
    longestRoadPlayerId,
  } = useGame();

  // States for award popups
  const [armyPopup, setArmyPopup] = useState<{ player: any; prevPlayer: any } | null>(null);
  const [roadPopup, setRoadPopup] = useState<{ player: any; prevPlayer: any } | null>(null);
  const [activeTrophyModal, setActiveTrophyModal] = useState<'longest_road' | 'largest_army' | null>(null);

  const prevLargestArmyRef = useRef<string | null>(null);
  const prevLongestRoadRef = useRef<string | null>(null);

  useEffect(() => {
    if (gamePhase === 'LOBBY' || gamePhase === 'GAME_OVER') {
      prevLargestArmyRef.current = null;
      return;
    }
    if (largestArmyPlayerId && largestArmyPlayerId !== prevLargestArmyRef.current) {
      const player = players.find(p => p.id === largestArmyPlayerId) || null;
      const prevPlayer = players.find(p => p.id === prevLargestArmyRef.current) || null;
      setArmyPopup({ player, prevPlayer });
    }
    prevLargestArmyRef.current = largestArmyPlayerId;
  }, [largestArmyPlayerId, gamePhase, players]);

  useEffect(() => {
    if (gamePhase === 'LOBBY' || gamePhase === 'GAME_OVER') {
      prevLongestRoadRef.current = null;
      return;
    }
    if (longestRoadPlayerId && longestRoadPlayerId !== prevLongestRoadRef.current) {
      const player = players.find(p => p.id === longestRoadPlayerId) || null;
      const prevPlayer = players.find(p => p.id === prevLongestRoadRef.current) || null;
      setRoadPopup({ player, prevPlayer });
    }
    prevLongestRoadRef.current = longestRoadPlayerId;
  }, [longestRoadPlayerId, gamePhase, players]);

  return {
    armyPopup,
    setArmyPopup,
    roadPopup,
    setRoadPopup,
    activeTrophyModal,
    setActiveTrophyModal,
  };
};
