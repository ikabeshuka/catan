import { BotDifficulty, PlayerRatingStats, RoomParticipant, RatingCalculationResult } from '../../../types/rating.types';

// ניקוד בסיס לפי דרגת קושי של בוט
const BOT_BASE_SCORES: Record<BotDifficulty, number> = {
  EASY: 1,
  MEDIUM: 3,
  HARD: 5,
  SUPER_HARD: 8,
  GEMINI_AI: 10,
};

/**
 * מנסח ומחשב את הניקוד שיוענק או יורד בסיום משחק
 */
export function calculateGameRating(
  isWin: boolean,
  participants: RoomParticipant[],
  playerStats: PlayerRatingStats,
  currentPlayerId: string
): RatingCalculationResult {
  const opponents = participants.filter(p => p.id !== currentPlayerId);
  if (opponents.length === 0) {
    return { baseRoomScore: 0, diminishingMultiplier: 1, finalPointsChanged: 0, reason: 'אין יריבים בחדר' };
  }

  // --- 1. חישוב משקל החדר (80% ליריב החזק + 20% לשאר היריבים) ---
  const opponentScores = opponents.map(op => {
    if (op.isHuman) {
      // חישוב מול שחקן אנושי: 6 בסיס + פער דירוג (עד 8 נוספות)
      const playerRating = playerStats.ratingPoints || 0;
      const opponentRating = op.ratingPoints || 0;
      const gapBonus = Math.min(8, Math.max(0, Math.floor((opponentRating - playerRating + 20) / 5)));
      return 6 + gapBonus;
    }
    return BOT_BASE_SCORES[op.botDifficulty || 'EASY'];
  });

  const maxScore = Math.max(...opponentScores);
  const otherScores = opponentScores.filter((_, idx) => idx !== opponentScores.indexOf(maxScore));
  const avgOtherScore = otherScores.length > 0 
    ? otherScores.reduce((a, b) => a + b, 0) / otherScores.length 
    : maxScore;

  const baseRoomScore = Number((0.8 * maxScore + 0.2 * avgOtherScore).toFixed(2));

  // במקרה של הפסד - מורידים חצי משווי החדר (לפחות 1 נקודה)
  if (!isWin) {
    const penalty = Math.max(1, Math.round(baseRoomScore * 0.5));
    return {
      baseRoomScore,
      diminishingMultiplier: 1,
      finalPointsChanged: -penalty,
      reason: `הפסד במשחק - ירידה של ${penalty} נקודות דירוג`,
    };
  }

  // --- 2. חישוב מקדם שחיקה (Diminishing Returns) ---
  let multiplier = 1.0;
  let reason = 'ניקוד מלא';

  const totalGames = playerStats.totalGames;
  const totalWins = playerStats.totalWins || 1;

  // מציאת הבוט הראשי שנלחמו מולו
  const dominantBot = opponents.find(op => !op.isHuman && BOT_BASE_SCORES[op.botDifficulty || 'EASY'] === maxScore)?.botDifficulty;

  if (dominantBot) {
    const winsAgainstBot = playerStats.winsByBotType[dominantBot] || 0;
    const winRatioVsBot = winsAgainstBot / totalWins;

    // חסימה מוחלטת של בוט קל מעל 80% ניצחונות
    if (dominantBot === 'EASY' && winRatioVsBot > 0.8) {
      return {
        baseRoomScore,
        diminishingMultiplier: 0,
        finalPointsChanged: 0,
        reason: 'נחסם ניקוד מול בוט קל (למעלה מ-80% מהניצחונות שלך מול בוט קל)',
      };
    }

    // שחיקה לפי אחוז ניצחונות מול בוט מסוים (כששיחק מעל 10 משחקים)
    if (totalGames > 10) {
      if (winRatioVsBot > 0.8) {
        multiplier = 0.25;
        reason = `שחיקת ניקוד (25%): מעל 80% מניצחונותיך מול בוט ${dominantBot}`;
      } else if (winRatioVsBot > 0.5) {
        multiplier = 0.5;
        reason = `שחיקת ניקוד (50%): מעל 50% מניצחונותיך מול בוט ${dominantBot}`;
      }
    }
  }

  // בדיקת תנאי שילוב קל + בינוני
  const gamesEasyMedium = (playerStats.gamesByBotType.EASY || 0) + (playerStats.gamesByBotType.MEDIUM || 0);
  if (totalGames > 10 && (gamesEasyMedium / totalGames) > 0.7) {
    multiplier = Math.min(multiplier, 0.5);
    reason = 'שחיקת ניקוד: מעל 70% ממשחקיך שוחקו מול בוט קל/בינוני';
  }

  // חסימת וותק מעל 50 משחקים עם מעל 95% מול קל ובינוני
  if (totalGames > 50 && (gamesEasyMedium / totalGames) >= 0.95 && (dominantBot === 'EASY' || dominantBot === 'MEDIUM')) {
    return {
      baseRoomScore,
      diminishingMultiplier: 0,
      finalPointsChanged: 0,
      reason: 'נחסם ניקוד: מעל 50 משחקים עם כמעט בלעדיות מול דרגות קלות',
    };
  }

  const finalPointsChanged = Math.max(1, Math.round(baseRoomScore * multiplier));

  return {
    baseRoomScore,
    diminishingMultiplier: multiplier,
    finalPointsChanged,
    reason,
  };
}