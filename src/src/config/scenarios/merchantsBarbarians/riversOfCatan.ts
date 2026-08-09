import { MBScenarioConfig } from './fishermenOfCatan';

export const riversOfCatan: MBScenarioConfig = {
  id: 'RIVERS_OF_CATAN',
  name: 'הנהרות של קטאן (The Rivers of Catan)',
  description: 'תרחיש 2: הנהרות של קטאן - בנו גשרים מעל הנהרות הגדולים וצברו זהב ועושר.',
  vpTarget: 10,
  tileLayoutTemplate: [
    { id: 'mb_river_1', coord: { q: -1, r: 0, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
    { id: 'mb_river_2', coord: { q: 0, r: 0, s: 0 }, type: 'BRICK', numberToken: 5, hasRobber: false },
    { id: 'mb_river_3', coord: { q: 1, r: -1, s: 0 }, type: 'GOLD_FIELD', numberToken: 9, hasRobber: false },
  ]
};
