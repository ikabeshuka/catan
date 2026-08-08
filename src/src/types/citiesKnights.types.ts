/** Domain types shared by the Cities & Knights game engine and UI. */
export type CommodityType = 'COIN' | 'PAPER' | 'CLOTH';
export type CityImprovementTrack = 'SCIENCE' | 'POLITICS' | 'TRADE';
export type CitiesKnightsEvent = 'BARBARIAN' | CityImprovementTrack;

export type CommodityCards = Record<CommodityType, number>;

export interface KnightPiece {
  playerId: string;
  /** Basic, strong, or mighty. */
  level: 1 | 2 | 3;
  active: boolean;
  /** A knight may act once between two rolls. */
  actedThisTurn?: boolean;
  /** A knight can be promoted only once between two rolls. */
  promotedThisTurn?: boolean;
}

export interface CitiesKnightsState {
  /** The barbarian ship advances from 0 to 7; at 7 it attacks and returns. */
  barbarianPosition: number;
  lastEventDie?: CitiesKnightsEvent;
  lastCityDie?: number;
  metropolisOwners: Partial<Record<CityImprovementTrack, string>>;
  /** Players that must select a non-metropolis city to downgrade after an attack. */
  barbarianLossQueue: string[];
  /** A 7 does not move the robber before the first barbarian attack. */
  hasBarbarianAttacked?: boolean;
  /** Three separate, finite 18-card progress stacks. */
  progressDecks?: Record<CityImprovementTrack, string[]>;
  pendingDisplacedKnight?: {
    ownerId: string;
    knight: KnightPiece;
    originVertexId: string;
    /** Enchanted Land uses an island-only relocation rule. */
    relocationMode?: 'ENCHANTED_LAND';
  };
  progressDiscardQueue?: string[];
  merchant?: { playerId: string; resource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' };
  sabotageDiscardQueue?: { playerId: string; amount: number }[];
  weddingGiveQueue?: { playerId: string; recipientId: string; amount: number }[];
  deserterPending?: { actorId: string; targetPlayerId: string; knight?: KnightPiece };
  commercialHarborQueue?: { playerId: string; recipientId: string }[];
  commercialHarborOffer?: { playerId: string; recipientId: string; category: 'RESOURCE' | 'COMMODITY' };
}

export const EMPTY_COMMODITIES: CommodityCards = { COIN: 0, PAPER: 0, CLOTH: 0 };

export const createCitiesKnightsState = (): CitiesKnightsState => ({
  barbarianPosition: 0,
  metropolisOwners: {},
  barbarianLossQueue: [],
  progressDecks: {
    SCIENCE: ['ALCHEMIST', 'ALCHEMIST', 'CRANE', 'CRANE', 'ENGINEER', 'INVENTOR', 'INVENTOR', 'IRRIGATION', 'IRRIGATION', 'MEDICINE', 'MEDICINE', 'MINING', 'MINING', 'PRINTER', 'ROAD_BUILDING', 'ROAD_BUILDING', 'SMITH', 'SMITH'],
    POLITICS: ['BISHOP', 'BISHOP', 'CONSTITUTION', 'DESERTER', 'DESERTER', 'DIPLOMAT', 'DIPLOMAT', 'INTRIGUE', 'INTRIGUE', 'SABOTEUR', 'SABOTEUR', 'SPY', 'SPY', 'SPY', 'WARLORD', 'WARLORD', 'WEDDING', 'WEDDING'],
    TRADE: ['COMMERCIAL_HARBOR', 'COMMERCIAL_HARBOR', 'MASTER_MERCHANT', 'MASTER_MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT', 'MERCHANT_FLEET', 'MERCHANT_FLEET', 'RESOURCE_MONOPOLY', 'RESOURCE_MONOPOLY', 'RESOURCE_MONOPOLY', 'RESOURCE_MONOPOLY', 'TRADE_MONOPOLY', 'TRADE_MONOPOLY'],
  },
  progressDiscardQueue: [],
});
