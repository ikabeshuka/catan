export type TurnSubPhase = 'BEFORE_ROLL' | 'DISCARD_PHASE' | 'ROBBER_PLACEMENT' | 'TRADE_AND_BUILD' | 'GOLD_RESOURCE_SELECTION';

export type SeafarersScenario = 'HEADING_FOR_NEW_SHORES' | 'FOUR_ISLANDS' | 'FOG_ISLAND';

// מצב מעקב ייעודי עבור סבבי ההקמה הראשוניים
export interface SetupTurnState {
  hasPlacedSettlement: boolean;
  hasPlacedRoad: boolean;
  lastSettlementVertexId?: string;
}
