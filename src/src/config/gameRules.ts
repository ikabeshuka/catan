import type { DevCardType } from '../types/gameActions.types';
import type { SeafarersScenario } from '../types/game.types';

export type GameExpansion = 'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS';

export const BASE_VICTORY_POINT_TARGET = 10;

export const SEAFARERS_VICTORY_POINT_TARGETS: Record<SeafarersScenario, number> = {
  HEADING_FOR_NEW_SHORES: 14,
  FOUR_ISLANDS: 13,
  FOG_ISLAND: 12,
  THROUGH_THE_DESERT: 14,
  THE_LOST_TRIBE: 13,
};

export const getVictoryPointTarget = (
  activeExpansion: GameExpansion,
  selectedScenario: SeafarersScenario,
): number => {
  if (activeExpansion !== 'SEAFARERS') {
    return BASE_VICTORY_POINT_TARGET;
  }

  return SEAFARERS_VICTORY_POINT_TARGETS[selectedScenario];
};

export const STANDARD_DEVELOPMENT_CARD_COUNTS: Readonly<Record<DevCardType, number>> = {
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
