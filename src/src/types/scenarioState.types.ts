import type { SeafarersScenario } from './game.types';
import { isTreasuresDragonsAdventurersScenario } from '../config/treasuresDragonsAdventurers';

export type TreasureReward = 'RESOURCE_CHOICE' | 'TWO_RESOURCES' | 'DEVELOPMENT_CARD' | 'FREE_BUILD' | 'GRAIN_OR_BRICK';

export interface TreasureTokenState {
  id: string;
  vertexId: string;
  status: 'UNCLAIMED' | 'CLAIMED' | 'KEPT';
  claimedBy?: string;
}

interface ScenarioStateBase {
  /** Increment only when a migration is supplied for saved or online games. */
  version: 1;
  scenarioId: SeafarersScenario;
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

export type ScenarioState = StandardScenarioState | TreasureScenarioState | GreaterCatanScenarioState
  | DesertDragonsScenarioState | GreatCanalScenarioState | EnchantedLandScenarioState;

/** Creates only serializable state; each future board preset fills its collections. */
export const createScenarioState = (scenarioId: SeafarersScenario, treasureVertexIds: string[] = []): ScenarioState => {
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
