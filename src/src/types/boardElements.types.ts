import type { CityImprovementTrack, KnightPiece } from './citiesKnights.types';

export type VertexStructure = 'NONE' | 'SETTLEMENT' | 'CITY';

export interface BoardVertex {
  id: string;                  // מזהה ייחודי המבוסס על האריחים המשיקים לו
  playerId: string | null;     // מי השחקן שבנה כאן (null אם ריק)
  structure: VertexStructure;  // מה בנוי כאן (כלום, יישוב או עיר)
  isHarbor: boolean;           // האם יש כאן נמל?
  harborType?: 'GENERIC' | 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
  pirateFortress?: { color: 'RED' | 'WHITE' | 'BLUE' | 'ORANGE'; playerId?: string; remainingTokens: number; conquered: boolean; };
  pirateSettlementTarget?: string;
  /** Cities & Knights additions. A city wall replaces the normal city model. */
  cityWall?: boolean;
  metropolis?: CityImprovementTrack;
  knight?: KnightPiece;
}

export interface BoardEdge {
  id: string;                  // מזהה ייחודי בין שני צמתים
  playerId: string | null;     // מי השחקן שבנה כאן כביש
  hasRoad: boolean;            // האם בנוי כאן כביש?
  isHarbor?: boolean;
  harborType?: string;
  harborAngle?: number;
  hasShip?: boolean;           // האם בנויה כאן ספינה?
  shipPlayerId?: string | null; // מזהה השחקן שבנה את הספינה
  isWarship?: boolean;
  lostTribeReward?: {
    id: string;
    kind: 'VICTORY_POINT' | 'DEV_CARD' | 'HARBOR';
    harborType?: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | 'GENERIC';
    devCardType?: 'KNIGHT' | 'VICTORY_POINT' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY' | 'MONOPOLY';
    collectedBy?: string;
  };
}
