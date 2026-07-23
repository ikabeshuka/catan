export interface GeminiConfig {
  apiKey: string;
  modelName: string; // למשל: 'gemini-2.5-flash'
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

export interface GeminiActionResponse {
  thought: string;
  reasoningInHebrew: string;
  action: 'BUILD_SETTLEMENT' | 'BUILD_CITY' | 'BUILD_ROAD' | 'BUILD_SHIP' | 'BUY_DEV_CARD' | 'END_TURN';
  targetId?: string;
}