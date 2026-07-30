/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GeneralPlayerStats, PlayerRatingStats, RoomParticipant, RatingCalculationResult } from '../types/rating.types';
import { calculateGameRating } from '../utils/ai/rating/ratingCalculator';

const STORAGE_KEY = 'CATAN_PLAYER_RATING_STATS';
const PROFILE_NAME_KEY = 'CATAN_PLAYER_PROFILE_NAME';
const GENERAL_STATS_KEY = 'CATAN_GENERAL_PLAYER_STATS';

const DEFAULT_STATS: PlayerRatingStats = {
  ratingPoints: 0,
  totalGames: 0,
  totalWins: 0,
  totalLosses: 0,
  gamesByBotType: {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
    SUPER_HARD: 0,
    GEMINI_AI: 0,
  },
  winsByBotType: {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
    SUPER_HARD: 0,
    GEMINI_AI: 0,
  },
  humanGames: 0,
  humanWins: 0,
};

interface UserContextType {
  playerStats: PlayerRatingStats;
  playerName: string;
  setPlayerName: (name: string) => void;
  generalStats: GeneralPlayerStats[];
  resetStats: () => void;
  lastRatingResult: RatingCalculationResult | null;
  setLastRatingResult: (result: RatingCalculationResult | null) => void;
  updateRatingAfterGame: (
    isWin: boolean,
    participants: RoomParticipant[],
    humanPlayerId: string
  ) => RatingCalculationResult;
  isStatsModalOpen: boolean;
  setIsStatsModalOpen: (open: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playerStats, setPlayerStats] = useState<PlayerRatingStats>(DEFAULT_STATS);
  const [playerName, setPlayerNameState] = useState('');
  const [generalStats, setGeneralStats] = useState<GeneralPlayerStats[]>([]);
  const [lastRatingResult, setLastRatingResult] = useState<RatingCalculationResult | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // טעינת הנתונים מ-localStorage בטעינת האפליקציה
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsedStats = saved ? JSON.parse(saved) : DEFAULT_STATS;
      const normalizedStats = {
        ...DEFAULT_STATS,
        ...parsedStats,
        gamesByBotType: { ...DEFAULT_STATS.gamesByBotType, ...parsedStats.gamesByBotType },
        winsByBotType: { ...DEFAULT_STATS.winsByBotType, ...parsedStats.winsByBotType },
      };
      const savedName = (localStorage.getItem(PROFILE_NAME_KEY) || '').trim();
      const savedGeneral = JSON.parse(localStorage.getItem(GENERAL_STATS_KEY) || '[]');
      const validGeneral: GeneralPlayerStats[] = Array.isArray(savedGeneral) ? savedGeneral : [];

      setPlayerStats(normalizedStats);
      setPlayerNameState(savedName);
      if (savedName) {
        const entry = { ...normalizedStats, playerName: savedName, updatedAt: new Date().toISOString() };
        const nextGeneral = [...validGeneral.filter(item => item.playerName !== savedName), entry];
        setGeneralStats(nextGeneral);
        localStorage.setItem(GENERAL_STATS_KEY, JSON.stringify(nextGeneral));
      } else {
        setGeneralStats(validGeneral);
      }
    } catch (err) {
      console.error('Failed to load player stats from localStorage:', err);
    }
  }, []);

  // שמירה ל-localStorage בכל עדכון סטטיסטיקות
  const saveGeneralEntry = (name: string, stats: PlayerRatingStats, previousName?: string) => {
    const trimmedName = name.trim().slice(0, 40);
    setGeneralStats(previous => {
      const withoutCurrent = previous.filter(item =>
        item.playerName !== trimmedName && (!previousName || item.playerName !== previousName)
      );
      const next = trimmedName
        ? [...withoutCurrent, { ...stats, playerName: trimmedName, updatedAt: new Date().toISOString() }]
        : withoutCurrent;
      localStorage.setItem(GENERAL_STATS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveStats = (newStats: PlayerRatingStats) => {
    setPlayerStats(newStats);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
      if (playerName) saveGeneralEntry(playerName, newStats);
    } catch (err) {
      console.error('Failed to save player stats to localStorage:', err);
    }
  };

  const setPlayerName = (name: string) => {
    const nextName = name.trim().slice(0, 40);
    const previousName = playerName;
    setPlayerNameState(nextName);
    localStorage.setItem(PROFILE_NAME_KEY, nextName);
    saveGeneralEntry(nextName, playerStats, previousName);
  };

  const resetStats = () => {
    const reset = {
      ...DEFAULT_STATS,
      gamesByBotType: { ...DEFAULT_STATS.gamesByBotType },
      winsByBotType: { ...DEFAULT_STATS.winsByBotType },
    };
    saveStats(reset);
    setLastRatingResult(null);
  };

  const updateRatingAfterGame = (
    isWin: boolean,
    participants: RoomParticipant[],
    humanPlayerId: string
  ): RatingCalculationResult => {
    // 1. חישוב הניקוד באמצעות המנוע
    const result = calculateGameRating(isWin, participants, playerStats, humanPlayerId);

    // 2. עדכון הסטטיסטיקות
    const updatedStats: PlayerRatingStats = {
      ...playerStats,
      ratingPoints: Math.max(0, playerStats.ratingPoints + result.finalPointsChanged),
      totalGames: playerStats.totalGames + 1,
      totalWins: isWin ? playerStats.totalWins + 1 : playerStats.totalWins,
      totalLosses: !isWin ? playerStats.totalLosses + 1 : playerStats.totalLosses,
      gamesByBotType: { ...playerStats.gamesByBotType },
      winsByBotType: { ...playerStats.winsByBotType },
    };

    // עדכון ספירת משחקים לפי סוג יריב
    participants.forEach(p => {
      if (p.id !== humanPlayerId) {
        if (!p.isHuman && p.botDifficulty) {
          const diff = p.botDifficulty;
          updatedStats.gamesByBotType[diff] = (updatedStats.gamesByBotType[diff] || 0) + 1;
          if (isWin) {
            updatedStats.winsByBotType[diff] = (updatedStats.winsByBotType[diff] || 0) + 1;
          }
        } else if (p.isHuman) {
          updatedStats.humanGames += 1;
          if (isWin) {
            updatedStats.humanWins += 1;
          }
        }
      }
    });

    saveStats(updatedStats);
    setLastRatingResult(result);
    return result;
  };

  return (
    <UserContext.Provider
      value={{
        playerStats,
        playerName,
        setPlayerName,
        generalStats,
        resetStats,
        lastRatingResult,
        setLastRatingResult,
        updateRatingAfterGame,
        isStatsModalOpen,
        setIsStatsModalOpen,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
