import { shuffleArray } from '../../utils/array/shuffleArray';
import type { HexTile } from '../../types/hex.types';

type TileType = HexTile['type'];
type HarborType = NonNullable<HexTile['harbors']>[number]['type'];

const THREE_ROWS = [
  { r: -3, qStart: -2, count: 6 }, { r: -2, qStart: -3, count: 7 },
  { r: -1, qStart: -4, count: 8 }, { r: 0, qStart: -4, count: 7 },
  { r: 1, qStart: -4, count: 8 }, { r: 2, qStart: -4, count: 7 },
  { r: 3, qStart: -4, count: 6 },
];
const FOUR_ROWS = [
  { r: -3, qStart: -3, count: 8 }, { r: -2, qStart: -4, count: 9 },
  { r: -1, qStart: -5, count: 10 }, { r: 0, qStart: -5, count: 9 },
  { r: 1, qStart: -5, count: 10 }, { r: 2, qStart: -5, count: 9 },
  { r: 3, qStart: -5, count: 8 },
];

const HOME_THREE = ['-1,-1', '0,-1', '-1,0', '0,0', '1,0', '-2,1', '-1,1', '0,1', '1,1', '-2,2', '-1,2', '0,2', '-1,3', '0,3'];
const NEW_THREE = ['-2,-3', '-1,-3', '-3,-2', '-2,-2', '-4,-1', '-3,-1', '-4,0', '-3,0', '-4,1', '-3,1', '1,-3', '2,-3', '3,-3', '2,-2', '3,-2', '2,-1', '3,-1', '2,0', '2,1', '1,2'];
const HOME_FOUR = ['-1,-2', '0,-2', '1,-2', '-2,-1', '-1,-1', '0,-1', '1,-1', '-2,0', '-1,0', '0,0', '1,0', '2,0', '-2,1', '-1,1', '0,1', '1,1', '-1,2', '0,2', '1,2'];
const NEW_FOUR = ['-3,-3', '-2,-3', '-1,-3', '-4,-2', '-3,-2', '-2,-2', '-5,-1', '-4,-1', '-3,-1', '-5,0', '-4,0', '-3,0', '-5,1', '2,-3', '3,-3', '4,-3', '2,-2', '3,-2', '4,-2', '2,-1', '3,-1', '4,-1', '3,0', '2,1', '3,1', '2,2'];

const HOME_TERRAINS: Record<3 | 4, TileType[]> = {
  3: ['WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'SHEEP'],
  4: ['DESERT', 'WOOD', 'WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP'],
};
const HOME_NUMBERS: Record<3 | 4, number[]> = {
  3: [2, 3, 4, 4, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11],
  4: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
};
const NEW_TERRAINS: Record<3 | 4, TileType[]> = {
  3: ['WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER'],
  4: ['WOOD', 'WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP', 'DESERT', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER'],
};

const HARBORS: Array<{ key: string; type: HarborType; edgeIndex: number }> = [
  { key: '-2,-3', type: 'GENERIC', edgeIndex: 5 }, { key: '2,-3', type: 'GENERIC', edgeIndex: 0 },
  { key: '-3,-2', type: 'GENERIC', edgeIndex: 4 }, { key: '3,-2', type: 'GENERIC', edgeIndex: 1 },
  { key: '-4,-1', type: 'WOOD', edgeIndex: 4 }, { key: '3,-1', type: 'BRICK', edgeIndex: 1 },
  { key: '-4,0', type: 'ORE', edgeIndex: 3 }, { key: '2,1', type: 'WHEAT', edgeIndex: 1 },
  { key: '-3,1', type: 'SHEEP', edgeIndex: 3 },
];

/** Scenario 3: home island with numbered land and unnumbered new islands. */
export const createGreaterCatanBoard = (playerCount: number): HexTile[] => {
  const count = playerCount === 3 ? 3 : 4;
  const home = new Set(count === 3 ? HOME_THREE : HOME_FOUR);
  const newlyExplored = new Set(count === 3 ? NEW_THREE : NEW_FOUR);
  const rows = count === 3 ? THREE_ROWS : FOUR_ROWS;
  const harbors = count === 3 ? HARBORS.filter((_, index) => index !== 3) : HARBORS;
  const homeTerrains = shuffleArray(HOME_TERRAINS[count]);
  const newTerrains = shuffleArray(NEW_TERRAINS[count]);
  const pirateKey = count === 3 ? '-4,2' : '-5,2';
  let homeTerrainIndex = 0;
  let homeNumberIndex = 0;
  let newTerrainIndex = 0;

  return rows.flatMap(({ r, qStart, count: width }) => Array.from({ length: width }, (_, offset) => {
    const q = qStart + offset;
    const key = `${q},${r}`;
    const hasPirate = key === pirateKey;
    const harbor = harbors.find(candidate => candidate.key === key);
    if (home.has(key)) {
      const type = homeTerrains[homeTerrainIndex++];
      return {
        id: `greater_catan_${playerCount}_${q}_${r}`,
        coord: { q, r, s: -q - r }, type,
        numberToken: type === 'DESERT' ? null : HOME_NUMBERS[count][homeNumberIndex++],
        hasRobber: type === 'DESERT', hasPirate, islandId: 1,
        harbors: harbor ? [{ type: harbor.type, edgeIndex: harbor.edgeIndex }] : undefined,
      } satisfies HexTile;
    }
    if (newlyExplored.has(key)) {
      const type = newTerrains[newTerrainIndex++];
      return {
        id: `greater_catan_${playerCount}_${q}_${r}`,
        coord: { q, r, s: -q - r }, type,
        // Number chits are drawn from the finite scenario supply only when
        // a route first reaches a new terrain hex.
        numberToken: null, hasRobber: false, hasPirate,
        islandId: type === 'WATER' ? undefined : 2,
        harbors: harbor ? [{ type: harbor.type, edgeIndex: harbor.edgeIndex }] : undefined,
      } satisfies HexTile;
    }
    return {
      id: `greater_catan_${playerCount}_${q}_${r}`,
      coord: { q, r, s: -q - r }, type: 'WATER', numberToken: null, hasRobber: false,
      hasPirate,
      harbors: harbor ? [{ type: harbor.type, edgeIndex: harbor.edgeIndex }] : undefined,
    } satisfies HexTile;
  }));
};
