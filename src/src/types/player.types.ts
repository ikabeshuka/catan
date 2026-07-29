import { ResourceCards } from './resources.types';

export type PlayerType = 'HUMAN' | 'LOCAL_BOT' | 'GEMINI_AI';

export interface Player {
  id: string;
  name: string;
  color: string;        // קוד צבע ב-Hex (למשל: אדום, כחול, כתום, לבן)
  isBot: boolean;       // true אם מדובר בשחקן מחשב, false אם שחקן אנושי
  playerType: PlayerType;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_HARD';
  archetype?: 'BUILDER' | 'DEVELOPER';
  turnsPlayed?: number;
  botStrategy?: 'LONG_ROAD_EXPANSION' | 'CITY_DEV_BURST' | 'BALANCED_PORT_TRADE';
  homeIslandId?: number;
  homeIslandIds?: number[];
  goldTradesThisTurn?: number;
  resources: ResourceCards; // כמות הכרטיסים שיש לו ביד מכל משאב
  victoryPoints: number; // נקודות הניצחון הנוכחיות שלו
  developmentCards: {
    KNIGHT: number;
    MONOPOLY: number;
    ROAD_BUILDING: number;
    YEAR_OF_PLENTY?: number;
    VICTORY_POINT?: number;
  };
  playedDevCardThisTurn?: boolean;
  devCardReturnSubPhase?: 'BEFORE_ROLL' | 'TRADE_AND_BUILD';
  boughtDevCardsThisTurn?: {
    KNIGHT?: number;
    MONOPOLY?: number;
    ROAD_BUILDING?: number;
    YEAR_OF_PLENTY?: number;
  };
  knightsPlayed?: number;
  wagonPosition?: string; // mazahe vertexId
  wagonLevel?: number; // 1-3
  remainingMovementPoints?: number;
}
