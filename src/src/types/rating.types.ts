export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_HARD' | 'GEMINI_AI';

export interface PlayerRatingStats {
  ratingPoints: number;              // הניקוד הכללי של השחקן
  totalGames: number;                // סה"כ משחקים ששוחקו
  totalWins: number;                 // סה"כ ניצחונות
  totalLosses: number;               // סה"כ הפסדים
  gamesByBotType: Record<BotDifficulty, number>; // משחקים לפי סוג בוט
  winsByBotType: Record<BotDifficulty, number>;  // ניצחונות לפי סוג בוט
  humanGames: number;                // משחקים מול שחקנים אנושיים
  humanWins: number;                 // ניצחונות מול שחקנים אנושיים
}

export interface RoomParticipant {
  id: string;
  isHuman: boolean;
  botDifficulty?: BotDifficulty;
  ratingPoints?: number;             // דירוג נוכחי (לשחקן אנושי באונליין)
}

export interface RatingCalculationResult {
  baseRoomScore: number;            // ניקוד הבסיס של החדר (לפי 80/20)
  diminishingMultiplier: number;    // מקדם השחיקה (1.0, 0.5, 0.25, 0)
  finalPointsChanged: number;       // השינוי הסופי בנקודות (+ או -)
  reason: string;                   // הסבר בעברית לשחקן על אופן החישוב
}