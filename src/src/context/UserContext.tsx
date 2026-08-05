/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, logoutUser, registerWithEmail, loginWithEmail } from '../services/firebase';
import { socketService } from '../services/network/socketService';
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
  currentUser: User | null;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<User | void>;
  loginWithEmail: (email: string, pass: string) => Promise<User | void>;
  registerWithEmail: (email: string, pass: string) => Promise<User | void>;
  logout: () => Promise<void>;
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
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [playerStats, setPlayerStats] = useState<PlayerRatingStats>(DEFAULT_STATS);
  const [playerName, setPlayerNameState] = useState('');
  const [generalStats, setGeneralStats] = useState<GeneralPlayerStats[]>([]);
  const [lastRatingResult, setLastRatingResult] = useState<RatingCalculationResult | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. מאזין להתחברות/התנתקות ב-Firebase Auth
  useEffect(() => {
    // Safety fallback timeout to guarantee isAuthLoading is set to false
    const fallbackTimer = setTimeout(() => {
      setIsAuthLoading((loading) => {
        if (loading) {
          console.warn('Authentication/profile loading took too long, resolving loading state.');
          loadUserDataFromLocalStorage();
        }
        return false;
      });
    }, 3500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // משתמש מחובר -> טעינת פרופיל מ-Firestore
        await loadUserDataFromFirestore(user);
      } else {
        // משתמש אורח -> טעינה מ-localStorage
        loadUserDataFromLocalStorage();
      }
      clearTimeout(fallbackTimer);
      setIsAuthLoading(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // טעינה מ-localStorage
  const loadUserDataFromLocalStorage = () => {
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
      setGeneralStats(validGeneral);
    } catch (err) {
      console.error('Failed to load player stats from localStorage:', err);
    }
  };

  // טעינה מ-Firestore (דרך השרת באמצעות סוקטים)
  const loadUserDataFromFirestore = async (user: User) => {
    try {
      console.log('[UserContext] Requesting user profile via Socket for UID:', user.uid);
      const res = await socketService.getUserProfile({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });

      if (res?.success && res.profile) {
        console.log('[UserContext] Successfully loaded user profile:', res.profile);
        const data = res.profile;
        const fetchedStats = data.playerStats || DEFAULT_STATS;
        const normalizedStats = {
          ...DEFAULT_STATS,
          ...fetchedStats,
          gamesByBotType: { ...DEFAULT_STATS.gamesByBotType, ...fetchedStats.gamesByBotType },
          winsByBotType: { ...DEFAULT_STATS.winsByBotType, ...fetchedStats.winsByBotType },
        };
        const fetchedName = data.playerName || user.displayName || user.email?.split('@')[0] || 'שחקן';

        setPlayerStats(normalizedStats);
        setPlayerNameState(fetchedName);
      } else {
        console.error('Failed to get user profile from socket server:', res?.message);
      }
    } catch (err) {
      console.error('Failed to load user data from Firestore via Socket:', err);
    }
  };

  // שמירה ל-localStorage ו-Firestore
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

  const saveStats = async (newStats: PlayerRatingStats) => {
    setPlayerStats(newStats);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
      if (playerName) saveGeneralEntry(playerName, newStats);

      // אם יש משתמש מחובר -> שמירה לענן דרך השרת באמצעות סוקטים
      if (auth.currentUser) {
        await socketService.syncUserProfile({
          uid: auth.currentUser.uid,
          playerName,
          playerStats: newStats,
        });
      }
    } catch (err) {
      console.error('Failed to save player stats:', err);
    }
  };

  const setPlayerName = async (name: string) => {
    const nextName = name.trim().slice(0, 40);
    const previousName = playerName;
    setPlayerNameState(nextName);
    localStorage.setItem(PROFILE_NAME_KEY, nextName);
    saveGeneralEntry(nextName, playerStats, previousName);

    if (auth.currentUser) {
      try {
        await socketService.syncUserProfile({
          uid: auth.currentUser.uid,
          playerName: nextName,
        });
      } catch (err) {
        console.error('Failed to update name in Firestore via Socket:', err);
      }
    }
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
    const result = calculateGameRating(isWin, participants, playerStats, humanPlayerId);

    const updatedStats: PlayerRatingStats = {
      ...playerStats,
      ratingPoints: Math.max(0, playerStats.ratingPoints + result.finalPointsChanged),
      totalGames: playerStats.totalGames + 1,
      totalWins: isWin ? playerStats.totalWins + 1 : playerStats.totalWins,
      totalLosses: !isWin ? playerStats.totalLosses + 1 : playerStats.totalLosses,
      gamesByBotType: { ...playerStats.gamesByBotType },
      winsByBotType: { ...playerStats.winsByBotType },
    };

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

  const loginWithGoogleHandler = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        await loadUserDataFromFirestore(user);
      }
      return user;
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const loginWithEmailHandler = async (email: string, pass: string) => {
    try {
      const user = await loginWithEmail(email, pass);
      if (user) {
        await loadUserDataFromFirestore(user);
      }
      return user;
    } catch (err) {
      console.error('Email Login failed:', err);
      throw err;
    }
  };

  const registerWithEmailHandler = async (email: string, pass: string) => {
    try {
      const user = await registerWithEmail(email, pass);
      if (user) {
        await loadUserDataFromFirestore(user);
      }
      return user;
    } catch (err) {
      console.error('Email Registration failed:', err);
      throw err;
    }
  };

  const logoutHandler = async () => {
    await logoutUser();
    loadUserDataFromLocalStorage();
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        isAuthLoading,
        loginWithGoogle: loginWithGoogleHandler,
        loginWithEmail: loginWithEmailHandler,
        registerWithEmail: registerWithEmailHandler,
        logout: logoutHandler,
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
        isAuthModalOpen,
        setIsAuthModalOpen,
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