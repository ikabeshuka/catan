import { starterBoardPreset } from '../starterBoardPreset';
import type { HexTile } from '../../types/hex.types';

const HIDDEN_ISLAND_COORDS = [
  [-4, 0], [-4, 1], [-3, -1], [-3, 0], [-2, -2],
  [-1, -3], [0, -3], [1, -3], [2, -3], [3, -2],
  [4, -2], [4, -1], [4, 0], [3, 1], [2, 2],
] as const;

// The cardboard frame clips five outer-radius cells; omitting them gives the
// rulebook inventory of 56 hexes (19 home, 22 sea, 15 hidden islands).
const OMITTED_FRAME_COORDS = new Set(['-4,4', '-3,4', '-2,4', '3,-4', '4,-4']);

const HIDDEN_TYPES: HexTile['type'][] = [
  'WOOD', 'BRICK', 'BRICK', 'ORE', 'ORE', 'WHEAT', 'WHEAT',
  'SHEEP', 'DESERT', 'DESERT', 'GOLD_FIELD', 'GOLD_FIELD',
  'WATER', 'WATER', 'WATER',
];

// The ten number chits specified for the hidden islands. They remain hidden
// until a road or ship first reaches the corresponding hex.
const HIDDEN_NUMBERS = [2, 3, 4, 4, 5, 6, 8, 9, 10, 11];

const key = (q: number, r: number) => `${q},${r}`;

/**
 * The rulebook uses one shared layout for 3 and 4 players: a base-game home
 * island, 22 sea hexes, and 15 face-down treasure-island hexes.
 */
export const createTreasureIslandsBoard = (): HexTile[] => {
  const homeByCoord = new Map(starterBoardPreset.map(tile => [key(tile.coord.q, tile.coord.r), tile]));
  const hiddenByCoord = new Map(HIDDEN_ISLAND_COORDS.map((coord, index) => [key(coord[0], coord[1]), index]));
  let hiddenNumberIndex = 0;
  let id = 1;
  const tiles: HexTile[] = [];

  for (let q = -4; q <= 4; q += 1) {
    for (let r = -4; r <= 4; r += 1) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > 4) continue;
      if (OMITTED_FRAME_COORDS.has(key(q, r))) continue;
      const homeTile = homeByCoord.get(key(q, r));
      const hiddenIndex = hiddenByCoord.get(key(q, r));
      if (homeTile) {
        tiles.push({ ...homeTile, id: `ti_${id++}`, islandId: 1 });
        continue;
      }
      if (hiddenIndex !== undefined) {
        const originalType = HIDDEN_TYPES[hiddenIndex];
        const originalNumberToken = ['WATER', 'DESERT'].includes(originalType)
          ? null
          : HIDDEN_NUMBERS[hiddenNumberIndex++];
        tiles.push({
          id: `ti_${id++}`,
          coord: { q, r, s },
          type: 'FOG',
          originalType,
          originalNumberToken,
          isFog: true,
          numberToken: null,
          hasRobber: false,
          islandId: 2 + hiddenIndex,
        });
        continue;
      }
      tiles.push({ id: `ti_${id++}`, coord: { q, r, s }, type: 'WATER', numberToken: null, hasRobber: false });
    }
  }

  const desert = tiles.find(tile => tile.islandId === 1 && tile.type === 'DESERT');
  if (desert) desert.hasRobber = true;
  const pirate = tiles.find(tile => tile.type === 'WATER' && tile.coord.q === -4 && tile.coord.r === 0);
  if (pirate) pirate.hasPirate = true;
  return tiles;
};
