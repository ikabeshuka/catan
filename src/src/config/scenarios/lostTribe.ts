import { HexTile } from '../../types/hex.types';

type TileSpec = Pick<HexTile, 'type' | 'numberToken'>;

const ROW_LENGTHS = [6, 7, 8, 9, 8, 7, 6];
const ROW_START_Q = [0, -1, -2, -3, -3, -3, -3];

const TILE_SPECS: TileSpec[] = [
  { type: 'GOLD_FIELD', numberToken: null }, { type: 'ORE', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'DESERT', numberToken: null }, { type: 'ORE', numberToken: null }, { type: 'WHEAT', numberToken: null },
  ...Array.from({ length: 7 }, () => ({ type: 'WATER', numberToken: null } as TileSpec)),
  { type: 'WHEAT', numberToken: 6 }, { type: 'WOOD', numberToken: 9 }, { type: 'ORE', numberToken: 11 }, { type: 'BRICK', numberToken: 5 }, { type: 'WOOD', numberToken: 6 }, { type: 'ORE', numberToken: 4 }, { type: 'WATER', numberToken: null }, { type: 'SHEEP', numberToken: null },
  { type: 'WATER', numberToken: null }, { type: 'SHEEP', numberToken: 10 }, { type: 'WOOD', numberToken: 8 }, { type: 'SHEEP', numberToken: 4 }, { type: 'WHEAT', numberToken: 12 }, { type: 'WOOD', numberToken: 5 }, { type: 'SHEEP', numberToken: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null },
  { type: 'WOOD', numberToken: 11 }, { type: 'WHEAT', numberToken: 9 }, { type: 'ORE', numberToken: 3 }, { type: 'SHEEP', numberToken: 8 }, { type: 'BRICK', numberToken: 10 }, { type: 'WHEAT', numberToken: 3 }, { type: 'WATER', numberToken: null }, { type: 'WOOD', numberToken: null },
  ...Array.from({ length: 7 }, () => ({ type: 'WATER', numberToken: null } as TileSpec)),
  { type: 'DESERT', numberToken: null }, { type: 'BRICK', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'BRICK', numberToken: null }, { type: 'DESERT', numberToken: null }, { type: 'GOLD_FIELD', numberToken: null },
];

const MAIN_ISLAND_TILE_IDS = new Set([14, 15, 16, 17, 18, 19, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36]);
const REWARDS_BY_TILE: Record<number, NonNullable<HexTile['lostTribeRewards']>> = {
  1: [{ id: 'vp-a', edgeIndex: 5, kind: 'VICTORY_POINT' }, { id: 'dev-a', edgeIndex: 3, kind: 'DEV_CARD' }, { id: 'harbor-a', edgeIndex: 4, kind: 'HARBOR' }],
  4: [{ id: 'vp-b', edgeIndex: 5, kind: 'VICTORY_POINT' }, { id: 'harbor-b', edgeIndex: 4, kind: 'HARBOR' }],
  6: [{ id: 'vp-c', edgeIndex: 5, kind: 'VICTORY_POINT' }, { id: 'dev-b', edgeIndex: 0, kind: 'DEV_CARD' }],
  21: [{ id: 'vp-d', edgeIndex: 0, kind: 'VICTORY_POINT' }, { id: 'harbor-c', edgeIndex: 1, kind: 'HARBOR' }],
  38: [{ id: 'vp-e', edgeIndex: 0, kind: 'VICTORY_POINT' }, { id: 'harbor-d', edgeIndex: 1, kind: 'HARBOR' }],
  46: [{ id: 'vp-f', edgeIndex: 1, kind: 'VICTORY_POINT' }, { id: 'dev-c', edgeIndex: 3, kind: 'DEV_CARD' }, { id: 'harbor-e', edgeIndex: 2, kind: 'HARBOR' }],
  49: [{ id: 'vp-g', edgeIndex: 2, kind: 'VICTORY_POINT' }, { id: 'harbor-f', edgeIndex: 1, kind: 'HARBOR' }],
  51: [{ id: 'vp-h', edgeIndex: 1, kind: 'VICTORY_POINT' }, { id: 'dev-d', edgeIndex: 0, kind: 'DEV_CARD' }],
};

const tiles: HexTile[] = [];
let index = 1;
ROW_LENGTHS.forEach((length, rowIndex) => {
  const r = rowIndex - 3;
  for (let offset = 0; offset < length; offset += 1) {
    const q = ROW_START_Q[rowIndex] + offset;
    const spec = TILE_SPECS[index - 1];
    tiles.push({ id: `hex_lt_${index}`, coord: { q, r, s: -q - r }, type: spec.type, numberToken: spec.numberToken, hasRobber: false, hasPirate: index === 3, islandId: spec.type === 'WATER' ? undefined : (MAIN_ISLAND_TILE_IDS.has(index) ? 1 : 2), lostTribeRewards: REWARDS_BY_TILE[index]?.map(reward => ({ ...reward })) });
    index += 1;
  }
});

export const seafarersLostTribe: HexTile[] = tiles;
export const LOST_TRIBE_MAIN_ISLAND_TILE_IDS = MAIN_ISLAND_TILE_IDS;
export const LOST_TRIBE_RESTRICTED_NUMBER_TILE_IDS = new Set([19, 28, 36]);
