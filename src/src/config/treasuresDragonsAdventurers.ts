import type { GameExpansion } from './gameRules';
import type { SeafarersScenario } from '../types/game.types';

/** Scenario ids from the Treasures, Dragons & Adventurers expansion. */
export const TREASURES_DRAGONS_ADVENTURERS_SCENARIOS = [
  'TREASURE_ISLANDS',
  'INTO_THE_UNKNOWN',
  'GREATER_CATAN',
  'DESERT_DRAGONS',
  'GREAT_CANAL',
  'ENCHANTED_LAND',
] as const satisfies readonly SeafarersScenario[];

export type TreasuresDragonsAdventurersScenario =
  typeof TREASURES_DRAGONS_ADVENTURERS_SCENARIOS[number];

type PlayerCount = 3 | 4;
type VictoryTargets = Partial<Record<GameExpansion, Record<PlayerCount, number>>>;

export interface TreasuresDragonsAdventurersScenarioMetadata {
  titleHe: string;
  shortDescriptionHe: string;
  supportedPlayerCounts: readonly PlayerCount[];
  requiredExpansion: GameExpansion;
  supportedExpansions: readonly GameExpansion[];
  victoryTargets: VictoryTargets;
}

export const TREASURES_DRAGONS_ADVENTURERS_METADATA: Record<
  TreasuresDragonsAdventurersScenario,
  TreasuresDragonsAdventurersScenarioMetadata
> = {
  TREASURE_ISLANDS: {
    titleHe: 'איי האוצרות',
    shortDescriptionHe: 'גלו איים נסתרים, מצאו אוצרות והקימו יישובים מעבר לים.',
    supportedPlayerCounts: [3, 4],
    requiredExpansion: 'SEAFARERS',
    supportedExpansions: ['SEAFARERS', 'SEAFARERS_AND_CITIES_AND_KNIGHTS'],
    victoryTargets: { SEAFARERS: { 3: 15, 4: 14 }, SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 16, 4: 17 } },
  },
  INTO_THE_UNKNOWN: {
    titleHe: 'אל הלא־נודע',
    shortDescriptionHe: 'הפליגו אל ים לא ממופה ובחרו אם להשתמש באוצר או לשמור אותו.',
    supportedPlayerCounts: [3, 4],
    requiredExpansion: 'SEAFARERS',
    supportedExpansions: ['SEAFARERS', 'SEAFARERS_AND_CITIES_AND_KNIGHTS'],
    victoryTargets: { SEAFARERS: { 3: 12, 4: 12 }, SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 14, 4: 14 } },
  },
  GREATER_CATAN: {
    titleHe: 'קטאן הגדולה',
    shortDescriptionHe: 'המשאבים באי הבית מידלדלים, וההתרחבות אל האיים החדשים נעשית חיונית.',
    supportedPlayerCounts: [3, 4],
    requiredExpansion: 'SEAFARERS',
    supportedExpansions: ['SEAFARERS', 'SEAFARERS_AND_CITIES_AND_KNIGHTS'],
    victoryTargets: { SEAFARERS: { 3: 18, 4: 18 }, SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 20, 4: 20 } },
  },
  DESERT_DRAGONS: {
    titleHe: 'דרקוני המדבר',
    shortDescriptionHe: 'הדרקונים עוזבים את המדבר וחוסמים את האי; אבירים מסלקים אותם.',
    supportedPlayerCounts: [3, 4],
    requiredExpansion: 'SEAFARERS',
    supportedExpansions: ['SEAFARERS'],
    victoryTargets: { SEAFARERS: { 3: 13, 4: 13 } },
  },
  GREAT_CANAL: {
    titleHe: 'התעלה הגדולה',
    shortDescriptionHe: 'אבירים חופרים יחד תעלה שתשקה מחדש את השדות במערב האי.',
    supportedPlayerCounts: [3, 4],
    requiredExpansion: 'SEAFARERS_AND_CITIES_AND_KNIGHTS',
    supportedExpansions: ['SEAFARERS_AND_CITIES_AND_KNIGHTS'],
    victoryTargets: { SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 21, 4: 18 } },
  },
  ENCHANTED_LAND: {
    titleHe: 'הארץ המכושפת',
    shortDescriptionHe: 'שלחו אבירים אל האי המכושף, הביסו דרקונים וצברו נקודות ניצחון.',
    supportedPlayerCounts: [3, 4],
    requiredExpansion: 'SEAFARERS_AND_CITIES_AND_KNIGHTS',
    supportedExpansions: ['SEAFARERS_AND_CITIES_AND_KNIGHTS'],
    victoryTargets: { SEAFARERS_AND_CITIES_AND_KNIGHTS: { 3: 21, 4: 18 } },
  },
};

export const isTreasuresDragonsAdventurersScenario = (
  scenario: SeafarersScenario | string,
): scenario is TreasuresDragonsAdventurersScenario =>
  (TREASURES_DRAGONS_ADVENTURERS_SCENARIOS as readonly string[]).includes(scenario);

export const getTreasuresDragonsAdventurersVictoryTarget = (
  scenario: TreasuresDragonsAdventurersScenario,
  expansion: GameExpansion,
  playerCount: number,
): number | undefined => {
  if (playerCount !== 3 && playerCount !== 4) return undefined;
  return TREASURES_DRAGONS_ADVENTURERS_METADATA[scenario].victoryTargets[expansion]?.[playerCount];
};
