import { MBScenarioConfig } from './fishermenOfCatan';

export const barbarianAttack: MBScenarioConfig = {
  id: 'BARBARIAN_ATTACK',
  name: 'התקפת הברברים (Barbarian Attack)',
  description: 'תרחיש 4: התקפת הברברים - גייסו אבירים חסונים כדי להדוף את הפלישות הברבריות ולשחרר את ערי החוף השבויות.',
  vpTarget: 12,
  tileLayoutTemplate: [
    { id: 'mb_barb_1', coord: { q: -1, r: -1, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
    { id: 'mb_barb_2', coord: { q: 0, r: 0, s: 0 }, type: 'CASTLE', numberToken: null, hasRobber: false },
    { id: 'mb_barb_3', coord: { q: 1, r: -1, s: 0 }, type: 'WOOD', numberToken: 4, hasRobber: false },
  ]
};
