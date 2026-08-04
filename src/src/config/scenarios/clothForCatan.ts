import { HexTile } from '../../types/hex.types';

type TileSpec = Pick<HexTile, 'type' | 'numberToken' | 'harbors' | 'lostTribeVillages' | 'lostTribeGeneralCloth'>;

const ROW_LENGTHS = [5, 6, 7, 8, 7, 6, 5];
const ROW_START_Q = [0, -1, -2, -3, -3, -3, -3];
const village = (id: string, number: number, vertexIndex: number) => ({ id, number, vertexIndex, clothRemaining: 5 });

const TILE_SPECS: TileSpec[] = [
  { type: 'WOOD', numberToken: 4, harbors: [{ type: 'WOOD', edgeIndex: 5 }] }, { type: 'SHEEP', numberToken: 6 }, { type: 'BRICK', numberToken: 5 }, { type: 'SHEEP', numberToken: 11, harbors: [{ type: 'SHEEP', edgeIndex: 4 }] }, { type: 'WHEAT', numberToken: 8 },
  { type: 'WHEAT', numberToken: 3, harbors: [{ type: 'WHEAT', edgeIndex: 3 }] }, { type: 'WOOD', numberToken: 12 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'WOOD', numberToken: 3 }, { type: 'ORE', numberToken: 9, harbors: [{ type: 'ORE', edgeIndex: 0 }] },
  { type: 'WHEAT', numberToken: 12, lostTribeGeneralCloth: 10 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'GOLD_FIELD', numberToken: null, lostTribeVillages: [village('village-15-top', 11, 5), village('village-15-bottom', 8, 2)] }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null },
  { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'DESERT', numberToken: null, lostTribeVillages: [village('village-21-top', 10, 5), village('village-21-bottom', 9, 2)] }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'DESERT', numberToken: null, lostTribeVillages: [village('village-24-top', 4, 5), village('village-24-bottom', 5, 2)] }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null },
  { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'GOLD_FIELD', numberToken: null, lostTribeVillages: [village('village-30-top', 6, 5), village('village-30-bottom', 3, 2)] }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'ORE', numberToken: 2, harbors: [{ type: 'GENERIC', edgeIndex: 0 }] },
  { type: 'BRICK', numberToken: 9, harbors: [{ type: 'BRICK', edgeIndex: 3 }] }, { type: 'WHEAT', numberToken: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'SHEEP', numberToken: 11 }, { type: 'ORE', numberToken: 4, harbors: [{ type: 'GENERIC', edgeIndex: 1 }] },
  { type: 'SHEEP', numberToken: 10 }, { type: 'WOOD', numberToken: 6, harbors: [{ type: 'GENERIC', edgeIndex: 2 }] }, { type: 'ORE', numberToken: 5 }, { type: 'WHEAT', numberToken: 10, harbors: [{ type: 'GENERIC', edgeIndex: 1 }] }, { type: 'BRICK', numberToken: 8 },
];

const MAIN_ISLAND_TILE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 33, 34, 35, 38, 39, 40, 41, 42, 43, 44]);
const VILLAGE_ISLAND_IDS: Record<number, number> = { 15: 2, 21: 3, 24: 4, 30: 5 };

const tiles: HexTile[] = [];
let index = 1;
ROW_LENGTHS.forEach((length, rowIndex) => {
  const r = rowIndex - 3;
  for (let offset = 0; offset < length; offset += 1) {
    const q = ROW_START_Q[rowIndex] + offset;
    const spec = TILE_SPECS[index - 1];
    tiles.push({ id: `hex_cfc_${index}`, coord: { q, r, s: -q - r }, type: spec.type, numberToken: spec.numberToken, hasRobber: index === 12, hasPirate: index === 26, islandId: MAIN_ISLAND_TILE_IDS.has(index) ? 1 : VILLAGE_ISLAND_IDS[index], harbors: spec.harbors?.map(harbor => ({ ...harbor })), lostTribeVillages: spec.lostTribeVillages?.map(entry => ({ ...entry })), lostTribeGeneralCloth: spec.lostTribeGeneralCloth });
    index += 1;
  }
});

export const seafarersClothForCatan: HexTile[] = tiles;
export const CLOTH_FOR_CATAN_MAIN_ISLAND_TILE_IDS = MAIN_ISLAND_TILE_IDS;
