import { shuffleArray } from '../../utils/array/shuffleArray';
import type { HexTile } from '../../types/hex.types';

type TileType = HexTile['type'];

type Layout = {
  rows: Array<{ r: number; qStart: number; count: number }>;
  home: string[];
  unknown: string[];
  faceUp: Array<{ key: string; type: 'DESERT' | 'GOLD_FIELD'; numberToken: number | null }>;
  homeTerrains: TileType[];
  homeNumbers: number[];
  fogTerrains: TileType[];
  fogNumbers: number[];
};

const threePlayerLayout: Layout = {
  rows: [
    { r: -3, qStart: -2, count: 6 }, { r: -2, qStart: -3, count: 7 },
    { r: -1, qStart: -4, count: 8 }, { r: 0, qStart: -4, count: 7 },
    { r: 1, qStart: -4, count: 8 }, { r: 2, qStart: -4, count: 7 },
    { r: 3, qStart: -4, count: 6 },
  ],
  // The face-up home island wraps the unexplored sea on the north and west.
  home: ['-2,-3', '-1,-3', '0,-3', '1,-3', '2,-3', '3,-3', '-3,-2', '-4,-1', '-4,0', '-4,1', '-4,2', '-4,3', '3,-2', '3,-1'],
  unknown: ['-2,-1', '-1,-1', '0,-1', '1,-1', '2,-1', '-3,0', '-2,0', '-1,0', '0,0', '1,0', '-3,1', '-2,1', '-1,1', '0,1', '1,1', '-3,2', '-2,2', '-1,2', '0,2', '-2,3', '-1,3', '0,3'],
  // The two deserts and two gold fields are the only treasure-island hexes
  // revealed during setup; the other eighteen remain face down.
  faceUp: [
    { key: '-2,3', type: 'DESERT', numberToken: null },
    { key: '-1,2', type: 'DESERT', numberToken: null },
    { key: '0,2', type: 'GOLD_FIELD', numberToken: 6 },
    { key: '0,3', type: 'GOLD_FIELD', numberToken: 8 },
  ],
  homeTerrains: ['DESERT', 'WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP'],
  homeNumbers: [2, 3, 4, 4, 5, 6, 6, 8, 8, 9, 10, 10, 11],
  fogTerrains: ['WOOD', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER'],
  // The printed 6 and 8 are already on the two face-up gold fields.
  fogNumbers: [2, 3, 3, 4, 5, 5, 9, 9, 10, 11, 11, 12],
};

const fourPlayerLayout: Layout = {
  rows: [
    { r: -3, qStart: -3, count: 8 }, { r: -2, qStart: -4, count: 9 },
    { r: -1, qStart: -5, count: 10 }, { r: 0, qStart: -5, count: 9 },
    { r: 1, qStart: -5, count: 10 }, { r: 2, qStart: -5, count: 9 },
    { r: 3, qStart: -5, count: 8 },
  ],
  home: ['-3,-3', '-2,-3', '-1,-3', '0,-3', '1,-3', '2,-3', '3,-3', '4,-3', '-4,-2', '-5,-1', '-5,0', '-5,1', '-5,2', '-5,3', '4,-2', '4,-1'],
  unknown: ['-3,-1', '-2,-1', '-1,-1', '0,-1', '1,-1', '2,-1', '-4,0', '-3,0', '-2,0', '-1,0', '0,0', '1,0', '2,0', '-4,1', '-3,1', '-2,1', '-1,1', '0,1', '1,1', '2,1', '-4,2', '-3,2', '-2,2', '-1,2', '0,2', '1,2', '-4,3', '-3,3', '-2,3', '-1,3', '0,3', '1,3'],
  faceUp: [
    { key: '-3,3', type: 'DESERT', numberToken: null },
    { key: '-2,2', type: 'DESERT', numberToken: null },
    { key: '1,2', type: 'DESERT', numberToken: null },
    { key: '-1,3', type: 'GOLD_FIELD', numberToken: 6 },
    { key: '0,3', type: 'GOLD_FIELD', numberToken: 8 },
  ],
  homeTerrains: ['WOOD', 'WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP'],
  homeNumbers: [2, 3, 4, 4, 5, 5, 6, 6, 6, 8, 8, 9, 9, 10, 10, 11],
  fogTerrains: ['WOOD', 'WOOD', 'WOOD', 'BRICK', 'BRICK', 'BRICK', 'BRICK', 'ORE', 'ORE', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT', 'SHEEP', 'SHEEP', 'SHEEP', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER'],
  // As above, the face-up gold fields carry the published 6 and 8.
  fogNumbers: [2, 3, 3, 3, 4, 4, 5, 5, 5, 9, 9, 9, 10, 10, 11, 11, 11, 12],
};

const keyFor = (q: number, r: number) => `${q},${r}`;

/**
 * Scenario 2. The rulebook supplies a distinct 3- and 4-player map: a
 * face-up home island, a face-down treasure-island area, and no printed
 * harbors.  Treasure tokens and special harbors are handled by scenario state.
 */
export const createIntoUnknownBoard = (playerCount: number): HexTile[] => {
  const layout = playerCount === 3 ? threePlayerLayout : fourPlayerLayout;
  const home = new Set(layout.home);
  const unknown = new Set(layout.unknown);
  const faceUp = new Map(layout.faceUp.map(tile => [tile.key, tile]));
  const homeTerrains: TileType[] = playerCount === 3
    ? [layout.homeTerrains.find(type => type === 'DESERT')!, ...shuffleArray(layout.homeTerrains.filter(type => type !== 'DESERT'))]
    : shuffleArray(layout.homeTerrains);
  const fogTerrains = shuffleArray(layout.fogTerrains);
  const fogNumbers = shuffleArray(layout.fogNumbers);
  let homeTerrainIndex = 0;
  let homeNumberIndex = 0;
  let fogTerrainIndex = 0;
  let fogNumberIndex = 0;

  return layout.rows.flatMap(({ r, qStart, count }) => Array.from({ length: count }, (_, offset) => {
    const q = qStart + offset;
    const key = keyFor(q, r);
    const fixed = faceUp.get(key);
    if (home.has(key)) {
      const type = homeTerrains[homeTerrainIndex++];
      return {
        id: `unknown_${playerCount}_${q}_${r}`,
        coord: { q, r, s: -q - r },
        type,
        numberToken: type === 'DESERT' ? null : layout.homeNumbers[homeNumberIndex++],
        hasRobber: type === 'DESERT',
        islandId: 1,
      } satisfies HexTile;
    }
    if (fixed) {
      return {
        id: `unknown_${playerCount}_${q}_${r}`,
        coord: { q, r, s: -q - r },
        type: fixed.type,
        numberToken: fixed.numberToken,
        hasRobber: playerCount === 4 && fixed.type === 'DESERT' && fixed.key === '-3,3',
        islandId: 2,
      } satisfies HexTile;
    }
    if (unknown.has(key)) {
      const originalType = fogTerrains[fogTerrainIndex++];
      return {
        id: `unknown_${playerCount}_${q}_${r}`,
        coord: { q, r, s: -q - r },
        type: 'FOG',
        originalType,
        originalNumberToken: originalType === 'WATER' ? null : fogNumbers[fogNumberIndex++],
        numberToken: null,
        hasRobber: false,
        isFog: true,
        islandId: originalType === 'WATER' ? undefined : 2,
      } satisfies HexTile;
    }
    return {
      id: `unknown_${playerCount}_${q}_${r}`,
      coord: { q, r, s: -q - r },
      type: 'WATER',
      numberToken: null,
      hasRobber: false,
    } satisfies HexTile;
  }));
};
