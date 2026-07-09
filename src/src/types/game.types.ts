export type TurnSubPhase = 'BEFORE_ROLL' | 'ROBBER_PLACEMENT' | 'TRADE_AND_BUILD';

// מצב מעקב ייעודי עבור סבבי ההקמה הראשוניים
export interface SetupTurnState {
  hasPlacedSettlement: boolean;
  hasPlacedRoad: boolean;
}

// הוספת שלב מיקום השודד
export interface SetupTurnState {
  hasPlacedSettlement: boolean;
  hasPlacedRoad: boolean;
}