import { MBScenarioConfig } from './fishermenOfCatan';

export const merchantsAndBarbarians: MBScenarioConfig = {
  id: 'MERCHANTS_AND_BARBARIANS',
  name: 'סוחרים וברברים (Merchants & Barbarians)',
  description: 'תרחיש 5: סוחרים וברברים - בנו מחדש את טירת קטאן על ידי הובלת זכוכית, שיש וכלים תחת איום מתמיד של שודדי ברברים.',
  vpTarget: 12,
  tileLayoutTemplate: [
    { id: 'mb_main_1', coord: { q: -1, r: -1, s: 2 }, type: 'GLASSWORKS', numberToken: null, hasRobber: false },
    { id: 'mb_main_2', coord: { q: 0, r: 0, s: 0 }, type: 'CASTLE', numberToken: null, hasRobber: false },
    { id: 'mb_main_3', coord: { q: 1, r: -1, s: 0 }, type: 'QUARRY', numberToken: null, hasRobber: false },
  ]
};
