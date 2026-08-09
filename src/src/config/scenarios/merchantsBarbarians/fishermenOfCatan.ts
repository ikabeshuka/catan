import { HexTile } from '../../../types/hex.types';

export interface MBScenarioConfig {
  id: 'FISHERMEN_OF_CATAN' | 'RIVERS_OF_CATAN' | 'CARAVAN_ROUTE' | 'BARBARIAN_ATTACK' | 'MERCHANTS_AND_BARBARIANS';
  name: string;
  description: string;
  vpTarget: number;
  tileLayoutTemplate: HexTile[];
}

export const fishermenOfCatan: MBScenarioConfig = {
  id: 'FISHERMEN_OF_CATAN',
  name: 'הדייגים של קטאן (The Fishermen of Catan)',
  description: 'תרחיש 1: הדייגים של קטאן - דוגו את הדגים באגמים ובחופים עבור הטבות מיוחדות.',
  vpTarget: 10,
  tileLayoutTemplate: [
    { id: 'mb_fish_1', coord: { q: 0, r: -1, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
    { id: 'mb_fish_2', coord: { q: 0, r: 0, s: 0 }, type: 'WOOD', numberToken: 6, hasRobber: false },
    { id: 'mb_fish_3', coord: { q: 1, r: -1, s: 0 }, type: 'WHEAT', numberToken: 8, hasRobber: false },
  ]
};
