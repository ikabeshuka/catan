import type { MBScenario, SeafarersScenario } from './game.types';
import { isTreasuresDragonsAdventurersScenario } from '../config/treasuresDragonsAdventurers';

export type TreasureReward = 'RESOURCE_CHOICE' | 'TWO_RESOURCES' | 'DEVELOPMENT_CARD' | 'FREE_BUILD' | 'GRAIN_OR_BRICK';

export interface TreasureTokenState {
  id: string;
  vertexId: string;
  status: 'UNCLAIMED' | 'CLAIMED' | 'KEPT';
  claimedBy?: string;
}

export type ScenarioId = SeafarersScenario | MBScenario;

interface ScenarioStateBase {
  /** Increment only when a migration is supplied for saved or online games. */
  version: 1;
  scenarioId: ScenarioId;
}

export interface StandardScenarioState extends ScenarioStateBase { kind: 'STANDARD'; }
export interface TreasureScenarioState extends ScenarioStateBase {
  kind: 'TREASURE_ISLANDS' | 'INTO_THE_UNKNOWN';
  numberTokenSupply: number[];
  treasureTokens: Record<string, TreasureTokenState>;
  treasureDeck: TreasureReward[];
  pendingTreasureId?: string;
}
export interface GreaterCatanScenarioState extends ScenarioStateBase {
  kind: 'GREATER_CATAN'; numberTokenSupply: number[]; depletedHomeTileIds: string[];
}
export interface DesertDragonsScenarioState extends ScenarioStateBase {
  kind: 'DESERT_DRAGONS'; dragonTileIds: Record<string, string>; dragonsHaveAttacked: boolean;
}
export interface GreatCanalScenarioState extends ScenarioStateBase {
  kind: 'GREAT_CANAL'; completedCanalIds: string[]; isCanalComplete: boolean;
}
export interface EnchantedLandScenarioState extends ScenarioStateBase {
  kind: 'ENCHANTED_LAND';
  dragonVertexIds: Record<string, string>;
  knightOnIslandByPlayerId: Record<string, string>;
  defeatedDragonIdsByPlayerId: Record<string, string[]>;
}

/** The fishermen token supply is finite: 29 fish chits and one Old Boot. */
export type FishToken = 1 | 2 | 3;
export interface FishermenScenarioState extends ScenarioStateBase {
  kind: 'FISHERMEN_OF_CATAN';
  fishDrawPile: Array<FishToken | 'OLD_BOOT'>;
  fishDiscardPile: FishToken[];
}
export interface CaravanScenarioState extends ScenarioStateBase {
  kind: 'CARAVAN_ROUTE';
  camelEdgeIds: string[];
  remainingCamels: number;
  /** Every human player submits one sealed sheep/wheat offer, including zero. */
  pendingCaravanVote?: {
    initiatedByPlayerId: string;
    votesByPlayerId: Record<string, { SHEEP: number; WHEAT: number }>;
  };
  /** A unique high bidder chooses the next legal camel edge. */
  pendingCamelPlayerId?: string;
  /** Tied high bidders must independently name the same legal edge. */
  pendingCamelTie?: {
    playerIds: string[];
    choicesByPlayerId: Record<string, string>;
  };
}
export interface BarbarianAttackScenarioState extends ScenarioStateBase {
  kind: 'BARBARIAN_ATTACK';
  fortressTileId?: string;
  /** Each token retains its owner colour and advances independently toward Catan. */
  barbarians: Array<{ id: string; ownerPlayerId: string; tileId: string }>;
  remainingByPlayerId: Record<string, number>;
  capturedTileIds: string[];
  /** Knights live on paths (edges), rather than intersections as in Cities & Knights. */
  knights: Array<{ id: string; ownerPlayerId: string; edgeId: string; kind: 'KNIGHTHOOD' | 'STRONG_KNIGHT'; movedThisTurn?: boolean }>;
  prisonersByPlayerId: Record<string, number>;
  /** A drawn scenario card must be resolved before the player may continue. */
  pendingDevelopmentCard?: { playerId: string; cardType: 'KNIGHTHOOD' | 'STRONG_KNIGHT' | 'TREASON' | 'INTRIGUE' };
}
/** Serializable supply and board markers for scenario 5, Merchants & Barbarians. */
export type MerchantProduct = 'GLASS' | 'MARBLE' | 'SAND' | 'TOOLS';
export interface MerchantsAndBarbariansScenarioState extends ScenarioStateBase {
  kind: 'MERCHANTS_AND_BARBARIANS';
  /** The legal arrival vertices surrounding each target building. */
  targetVertexIdsByTileId: Record<string, string[]>;
  /** Face-down tokens supplied by each target building. */
  productDecksByTargetId: Record<string, MerchantProduct[]>;
  /** The three physical barbarians, each occupying at most one path. */
  barbarianEdgeIds: string[];
}

export type ScenarioState = StandardScenarioState | TreasureScenarioState | GreaterCatanScenarioState
  | DesertDragonsScenarioState | GreatCanalScenarioState | EnchantedLandScenarioState | FishermenScenarioState | CaravanScenarioState | BarbarianAttackScenarioState | MerchantsAndBarbariansScenarioState;

export const createFishermenFishDeck = (): Array<FishToken | 'OLD_BOOT'> => {
  const deck: Array<FishToken | 'OLD_BOOT'> = [
    ...Array<FishToken>(11).fill(1),
    ...Array<FishToken>(10).fill(2),
    ...Array<FishToken>(8).fill(3),
    'OLD_BOOT',
  ];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
};

/** Creates only serializable state; each future board preset fills its collections. */
export const createScenarioState = (scenarioId: ScenarioId, treasureVertexIds: string[] = []): ScenarioState => {
  if (scenarioId === 'FISHERMEN_OF_CATAN') {
    return {
      version: 1,
      scenarioId,
      kind: 'FISHERMEN_OF_CATAN',
      fishDrawPile: createFishermenFishDeck(),
      fishDiscardPile: [],
    };
  }
  if (scenarioId === 'CARAVAN_ROUTE') {
    return { version: 1, scenarioId, kind: 'CARAVAN_ROUTE', camelEdgeIds: [], remainingCamels: 22 };
  }
  if (scenarioId === 'BARBARIAN_ATTACK') {
    return { version: 1, scenarioId, kind: 'BARBARIAN_ATTACK', barbarians: [], remainingByPlayerId: {}, capturedTileIds: [], knights: [], prisonersByPlayerId: {} };
  }
  if (scenarioId === 'MERCHANTS_AND_BARBARIANS') {
    return { version: 1, scenarioId, kind: 'MERCHANTS_AND_BARBARIANS', targetVertexIdsByTileId: {}, productDecksByTargetId: {}, barbarianEdgeIds: [] };
  }
  if (!isTreasuresDragonsAdventurersScenario(scenarioId)) return { version: 1, scenarioId, kind: 'STANDARD' };
  switch (scenarioId) {
    case 'TREASURE_ISLANDS':
    case 'INTO_THE_UNKNOWN':
      return {
        version: 1,
        scenarioId,
        kind: scenarioId,
        numberTokenSupply: [],
        treasureTokens: Object.fromEntries(treasureVertexIds.map((vertexId, index) => [
          `treasure-${index + 1}`, { id: `treasure-${index + 1}`, vertexId, status: 'UNCLAIMED' },
        ])),
        treasureDeck: ['RESOURCE_CHOICE', 'TWO_RESOURCES', 'DEVELOPMENT_CARD', 'FREE_BUILD', 'GRAIN_OR_BRICK'].flatMap(reward => [reward, reward, reward, reward]) as TreasureReward[],
      };
    case 'GREATER_CATAN':
      return { version: 1, scenarioId, kind: 'GREATER_CATAN', numberTokenSupply: [], depletedHomeTileIds: [] };
    case 'DESERT_DRAGONS':
      return { version: 1, scenarioId, kind: 'DESERT_DRAGONS', dragonTileIds: {}, dragonsHaveAttacked: false };
    case 'GREAT_CANAL':
      return { version: 1, scenarioId, kind: 'GREAT_CANAL', completedCanalIds: [], isCanalComplete: false };
    case 'ENCHANTED_LAND':
      return { version: 1, scenarioId, kind: 'ENCHANTED_LAND', dragonVertexIds: {}, knightOnIslandByPlayerId: {}, defeatedDragonIdsByPlayerId: {} };
  }
};
