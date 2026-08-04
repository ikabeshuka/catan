export type TurnSubPhase = 'BEFORE_ROLL' | 'DISCARD_PHASE' | 'SABOTEUR_DISCARD' | 'WEDDING_GIVE' | 'COMMERCIAL_HARBOR_GIVE' | 'COMMERCIAL_HARBOR_RETURN' | 'DESERTER_SELECT' | 'DESERTER_PLACE' | 'ROBBER_PLACEMENT' | 'ROBBER_STEAL' | 'TRADE_AND_BUILD' | 'GOLD_RESOURCE_SELECTION' | 'HARBOR_PLACEMENT' | 'BARBARIAN_LOSS' | 'KNIGHT_DISPLACEMENT' | 'PROGRESS_DISCARD';

export type SeafarersScenario = 'HEADING_FOR_NEW_SHORES' | 'FOUR_ISLANDS' | 'FOG_ISLAND' | 'THROUGH_THE_DESERT' | 'THE_LOST_TRIBE' | 'CLOTH_FOR_CATAN' | 'PIRATE_ISLANDS';

// מצב מעקב ייעודי עבור סבבי ההקמה הראשוניים
export interface SetupTurnState {
  hasPlacedSettlement: boolean;
  hasPlacedRoad: boolean;
  lastSettlementVertexId?: string;
}
