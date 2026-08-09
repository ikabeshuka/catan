import type { DevCardType } from '../types/gameActions.types';
import type { MBScenario, SeafarersScenario } from '../types/game.types';
import {
  getTreasuresDragonsAdventurersVictoryTarget,
  isTreasuresDragonsAdventurersScenario,
} from './treasuresDragonsAdventurers';

export type GameExpansion =
  | 'BASE'
  | 'MERCHANTS_AND_BARBARIANS'
  | 'SEAFARERS'
  | 'CITIES_AND_KNIGHTS'
  | 'SEAFARERS_AND_CITIES_AND_KNIGHTS';

export const isSeafarersExpansion = (expansion?: GameExpansion | string): boolean =>
  expansion === 'SEAFARERS' || expansion === 'SEAFARERS_AND_CITIES_AND_KNIGHTS';

export const isCitiesKnightsExpansion = (expansion?: GameExpansion | string): boolean =>
  expansion === 'CITIES_AND_KNIGHTS' || expansion === 'SEAFARERS_AND_CITIES_AND_KNIGHTS';

export const BASE_VICTORY_POINT_TARGET = 10;

export const SEAFARERS_VICTORY_POINT_TARGETS: Record<SeafarersScenario, number> = {
  HEADING_FOR_NEW_SHORES: 14,
  FOUR_ISLANDS: 13,
  FOG_ISLAND: 12,
  THROUGH_THE_DESERT: 14,
  THE_LOST_TRIBE: 13,
  CLOTH_FOR_CATAN: 14,
  PIRATE_ISLANDS: 10,
  TREASURE_ISLANDS: 14,
  INTO_THE_UNKNOWN: 12,
  GREATER_CATAN: 18,
  DESERT_DRAGONS: 13,
  GREAT_CANAL: 18,
  ENCHANTED_LAND: 18,
};

/** Published victory targets for the five standalone Merchants & Barbarians scenarios. */
export const MERCHANTS_BARBARIANS_VICTORY_POINT_TARGETS: Record<MBScenario, number> = {
  FISHERMEN_OF_CATAN: 10,
  RIVERS_OF_CATAN: 10,
  CARAVAN_ROUTE: 12,
  BARBARIAN_ATTACK: 12,
  MERCHANTS_AND_BARBARIANS: 13,
};

export const getVictoryPointTarget = (
  activeExpansion: GameExpansion,
  selectedScenario: SeafarersScenario,
  playerCount: number = 4,
  selectedMBScenario?: MBScenario,
): number => {
  if (activeExpansion === 'MERCHANTS_AND_BARBARIANS') {
    return MERCHANTS_BARBARIANS_VICTORY_POINT_TARGETS[selectedMBScenario || 'FISHERMEN_OF_CATAN'];
  }
  if (isTreasuresDragonsAdventurersScenario(selectedScenario)) {
    return getTreasuresDragonsAdventurersVictoryTarget(selectedScenario, activeExpansion, playerCount)
      ?? SEAFARERS_VICTORY_POINT_TARGETS[selectedScenario];
  }
  if (activeExpansion === 'SEAFARERS_AND_CITIES_AND_KNIGHTS') {
    return 15;
  }
  if (activeExpansion === 'CITIES_AND_KNIGHTS') {
    return 13;
  }
  if (!isSeafarersExpansion(activeExpansion)) {
    return BASE_VICTORY_POINT_TARGET;
  }

  return SEAFARERS_VICTORY_POINT_TARGETS[selectedScenario];
};

export const STANDARD_DEVELOPMENT_CARD_COUNTS: Readonly<Record<'KNIGHT' | 'VICTORY_POINT' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY' | 'MONOPOLY', number>> = {
  KNIGHT: 14,
  VICTORY_POINT: 5,
  ROAD_BUILDING: 2,
  YEAR_OF_PLENTY: 2,
  MONOPOLY: 2,
};

export const createStandardDevelopmentDeck = (): DevCardType[] => (
  Object.entries(STANDARD_DEVELOPMENT_CARD_COUNTS).flatMap(([cardType, count]) =>
    Array<DevCardType>(count).fill(cardType as DevCardType)
  )
);

/** Published Barbarian Attack deck: 14 Knighthood, 4 Strong Knight, 4 Treason, 4 Intrigue. */
export const createBarbarianAttackDevelopmentDeck = (): DevCardType[] => [
  ...Array<DevCardType>(14).fill('KNIGHTHOOD'),
  ...Array<DevCardType>(4).fill('STRONG_KNIGHT'),
  ...Array<DevCardType>(4).fill('TREASON'),
  ...Array<DevCardType>(4).fill('INTRIGUE'),
];

/** Published scenario-5 deck: 16 knights, 2 road building, 2 swift journey, 5 VP. */
export const createMerchantsAndBarbariansDevelopmentDeck = (): DevCardType[] => [
  ...Array<DevCardType>(16).fill('KNIGHT'),
  ...Array<DevCardType>(2).fill('ROAD_BUILDING'),
  ...Array<DevCardType>(2).fill('SWIFT_JOURNEY'),
  ...Array<DevCardType>(5).fill('VICTORY_POINT'),
];
