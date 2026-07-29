export interface GeminiConfig {
  apiKey: string;
  modelName: string; // למשל: 'gemini-3.5-flash'
  enabled: boolean;
}

export interface LegalActions {
  canBuildCity: boolean;
  canBuildSettlement: boolean;
  canBuildRoad: boolean;
  canBuildShip: boolean;
  canBuyDevCard: boolean;
  validSettlementVertices: string[];
  validCityVertices: string[];
  validRoadEdges: string[];
  validShipEdges: string[];
}

export interface GeminiBoardSnapshot {
  gamePhase: string;
  turnNumber: number;
  currentPlayer: {
    id: string;
    name: string;
    color: string;
    victoryPoints: number;
    resources: Record<string, number>;
  };
  opponents: Array<{
    id: string;
    name: string;
    victoryPoints: number;
    resourceCardCount: number;
    isLeading: boolean;
  }>;
  legalActions: LegalActions;
  boardSummary: {
    fogTilesRemaining: number;
    hasPirateOnBoard: boolean;
    unexploredFogEdges: string[];
  };
}

// תגובה בודדת מהגרסה הישנה (נשמר לתאימות מלאה)
export interface GeminiActionResponse {
  thought: string;
  reasoningInHebrew: string;
  action: 'BUILD_SETTLEMENT' | 'BUILD_CITY' | 'BUILD_ROAD' | 'BUILD_SHIP' | 'BUY_DEV_CARD' | 'END_TURN';
  targetId?: string;
}

// מבנה התכנון האסטרטגי ההיברידי החדש (Multi-turn Strategy Plan)
export interface GeminiStrategyPlan {
  thought: string;
  reasoningInHebrew: string;
  goal: 'EXPAND_TO_FOG_ISLAND' | 'UPGRADE_CITIES' | 'BUILD_ROAD_NETWORK' | 'BUY_DEV_CARDS';
  targetVertexId?: string;
  targetEdgeId?: string;
  ttlTurns: number; // מספר תורות שבהם התוכנית בתוקף (למשל: 5)
}