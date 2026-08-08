import { ResourceCards } from './resources.types';
import { CommodityCards, CityImprovementTrack } from './citiesKnights.types';

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
  /** Cloth rolls collected from Lost Tribe villages. Two rolls are one VP. */
  clothRolls?: number;
  /** Unrevealed treasure tokens kept in the Into the Unknown scenario. */
  keptTreasureTokens?: number;
  /** Treasure-island ids on which this player already earned the first-settlement VP. */
  treasureIslandIds?: number[];
  /** Victory-point CATAN chits earned while constructing the Great Canal. */
  canalChits?: number;
  /** Village ids to which this player has established a shipping connection. */
  lostTribeVillageIds?: string[];
  developmentCards: {
    KNIGHT: number;
    MONOPOLY: number;
    ROAD_BUILDING: number;
    YEAR_OF_PLENTY?: number;
    VICTORY_POINT?: number;
  };
  playedDevCardThisTurn?: boolean;
  unplacedHarbors?: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | 'GENERIC')[];
  harborReturnSubPhase?: 'BEFORE_ROLL' | 'TRADE_AND_BUILD';
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
  /** Cities & Knights commodity cards. */
  commodities?: CommodityCards;
  /** Levels 0–5 for science, politics, and trade. */
  cityImprovements?: Record<CityImprovementTrack, number>;
  /** Progress cards are deliberately separate from the base development deck. */
  progressCards?: string[];
  /** Victory points received as Defender of Catan. */
  defenderOfCatanPoints?: number;
  /** Temporary Cities & Knights progress-card effects, cleared at turn end. */
  cityImprovementDiscount?: number;
  freeKnightPromotions?: number;
  alchemistDice?: [number, number, number];
  alchemistEventDie?: 'BARBARIAN' | CityImprovementTrack;
  merchantFleetResource?: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
}
