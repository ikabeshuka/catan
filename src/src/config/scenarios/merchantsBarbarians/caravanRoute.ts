import { MBScenarioConfig } from './fishermenOfCatan';

export const caravanRoute: MBScenarioConfig = {
  id: 'CARAVAN_ROUTE',
  name: 'נתיב השיירות (The Caravan Route)',
  description: 'תרחיש 3: נתיב השיירות - הקימו שיירות גמלים החוצות את האי ומעלות את ערך דרכי המסחר.',
  vpTarget: 10,
  tileLayoutTemplate: [
    { id: 'mb_caravan_1', coord: { q: -1, r: 1, s: 0 }, type: 'DESERT', numberToken: null, hasRobber: false },
    { id: 'mb_caravan_2', coord: { q: 0, r: 0, s: 0 }, type: 'SHEEP', numberToken: 8, hasRobber: false },
    { id: 'mb_caravan_3', coord: { q: 1, r: -1, s: 0 }, type: 'ORE', numberToken: 10, hasRobber: false },
  ]
};
