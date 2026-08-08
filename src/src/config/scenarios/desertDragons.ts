import { shuffleArray } from '../../utils/array/shuffleArray';
import type { HexTile } from '../../types/hex.types';

type TileType = HexTile['type'];
type HarborType = NonNullable<HexTile['harbors']>[number]['type'];

const ROWS = [
  { r: -3, qStart: -2, count: 7 }, { r: -2, qStart: -3, count: 8 },
  { r: -1, qStart: -4, count: 9 }, { r: 0, qStart: -4, count: 8 },
  { r: 1, qStart: -5, count: 9 }, { r: 2, qStart: -5, count: 8 },
  { r: 3, qStart: -5, count: 7 },
];

const HOME_KEYS = ['-2,-3', '-1,-3', '0,-3', '1,-3', '2,-3', '-2,-2', '-1,-2', '0,-2', '1,-2', '2,-2', '-3,-1', '-2,-1', '-1,-1', '0,-1', '1,-1', '-3,0', '-2,0', '-1,0', '0,0'];
const NEIGHBOR_THREE = ['3,-1', '4,-1', '2,0', '3,0', '-2,1', '-1,1', '0,1', '1,1', '2,1', '3,1', '-3,2', '-2,2', '-1,2', '0,2', '1,2', '2,2', '-3,3', '-2,3', '-1,3'];
const NEIGHBOR_FOUR = ['4,-3', '3,-2', '4,-2', '2,-1', '3,-1', '4,-1', '2,0', '3,0', '1,1', '2,1', '3,1', '-4,2', '-3,2', '-2,2', '-1,2', '0,2', '1,2', '2,2', '-3,3', '-2,3', '-1,3', '0,3'];

const HOME_TERRAINS: TileType[] = ['DESERT', 'DESERT', 'DESERT', 'WOOD', 'WOOD', 'SHEEP', 'SHEEP', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP'];
const HOME_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11];
const NEIGHBOR_TERRAINS: Record<3 | 4, TileType[]> = {
  3: ['WOOD', 'WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP', 'GOLD_FIELD'],
  4: ['WOOD', 'WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP', 'GOLD_FIELD', 'GOLD_FIELD'],
};
const NEIGHBOR_NUMBERS: Record<3 | 4, number[]> = {
  3: [2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
  4: [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12],
};

const HARBORS: Array<{ key: string; type: HarborType; edgeIndex: number }> = [
  { key: '-2,-3', type: 'GENERIC', edgeIndex: 5 }, { key: '2,-3', type: 'GENERIC', edgeIndex: 0 },
  { key: '-3,0', type: 'GENERIC', edgeIndex: 3 }, { key: '-3,3', type: 'GENERIC', edgeIndex: 3 },
  { key: '4,-1', type: 'WOOD', edgeIndex: 0 }, { key: '3,1', type: 'BRICK', edgeIndex: 0 },
  { key: '2,2', type: 'ORE', edgeIndex: 1 }, { key: '-2,3', type: 'WHEAT', edgeIndex: 2 },
  { key: '-1,3', type: 'SHEEP', edgeIndex: 2 },
];

/** Scenario 4: fixed three-desert home island, neighboring islands, and 18 dragons. */
export const createDesertDragonsBoard = (playerCount: number): HexTile[] => {
  const count = playerCount === 3 ? 3 : 4;
  const home = new Set(HOME_KEYS);
  const neighbor = new Set(count === 3 ? NEIGHBOR_THREE : NEIGHBOR_FOUR);
  const fixedHome = HOME_TERRAINS.slice(0, 7);
  const shuffledHome = shuffleArray(HOME_TERRAINS.slice(7));
  const homeTerrains = [...fixedHome, ...shuffledHome];
  const neighborTerrains = shuffleArray(NEIGHBOR_TERRAINS[count]);
  const neighborNumbers = shuffleArray(NEIGHBOR_NUMBERS[count]);
  let homeTerrainIndex = 0;
  let homeNumberIndex = 0;
  let neighborTerrainIndex = 0;
  let neighborNumberIndex = 0;

  return ROWS.flatMap(({ r, qStart, count: width }) => Array.from({ length: width }, (_, offset) => {
    const q = qStart + offset;
    const key = `${q},${r}`;
    const harbor = HARBORS.find(candidate => candidate.key === key);
    if (home.has(key)) {
      const type = homeTerrains[homeTerrainIndex++];
      return {
        id: `desert_dragons_${playerCount}_${q}_${r}`,
        coord: { q, r, s: -q - r }, type,
        numberToken: type === 'DESERT' ? null : HOME_NUMBERS[homeNumberIndex++],
        hasRobber: false, islandId: 1,
        harbors: harbor ? [{ type: harbor.type, edgeIndex: harbor.edgeIndex }] : undefined,
      } satisfies HexTile;
    }
    if (neighbor.has(key)) {
      const type = neighborTerrains[neighborTerrainIndex++];
      return {
        id: `desert_dragons_${playerCount}_${q}_${r}`,
        coord: { q, r, s: -q - r }, type,
        numberToken: neighborNumbers[neighborNumberIndex++],
        hasRobber: false, islandId: 2,
        harbors: harbor ? [{ type: harbor.type, edgeIndex: harbor.edgeIndex }] : undefined,
      } satisfies HexTile;
    }
    return {
      id: `desert_dragons_${playerCount}_${q}_${r}`,
      coord: { q, r, s: -q - r }, type: 'WATER', numberToken: null, hasRobber: false,
      harbors: harbor ? [{ type: harbor.type, edgeIndex: harbor.edgeIndex }] : undefined,
    } satisfies HexTile;
  }));
};
