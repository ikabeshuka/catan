import { HexTile } from '../../types/hex.types';

type TileType = HexTile['type'];

const ROWS: Array<{ r: number; qStart: number; count: number }> = [
  { r: -3, qStart: -2, count: 7 },
  { r: -2, qStart: -3, count: 8 },
  { r: -1, qStart: -4, count: 9 },
  { r: 0, qStart: -4, count: 8 },
  { r: 1, qStart: -5, count: 9 },
  { r: 2, qStart: -5, count: 8 },
  { r: 3, qStart: -5, count: 7 },
];

const homeLand = new Set([
  '-3,-2', '-2,-2', '-1,-2', '0,-2', '1,-2', '2,-2',
  '-4,-1', '-3,-1', '-2,-1', '-1,-1',
  '-4,0', '-3,0', '-2,0', '-1,0',
  '-5,1', '-4,1', '-3,1',
  '-5,2', '-4,2',
]);

const enchantedLand = new Set([
  '3,0',
  '-1,1', '0,1', '1,1', '2,1', '3,1',
  '-2,2', '-1,2', '0,2', '1,2', '2,2',
  '-3,3', '-2,3', '-1,3', '0,3', '1,3',
]);

// The printed scenario has shuffled home-island terrain but fixed number-token
// positions. This fixed pool preserves the official component inventory.
const HOME_TERRAINS: TileType[] = [
  'DESERT',
  'WOOD', 'WOOD', 'WOOD', 'WOOD',
  'BRICK', 'BRICK', 'BRICK',
  'ORE', 'ORE', 'ORE',
  'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT',
  'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP',
];
const HOME_NUMBERS = [12, 3, 8, 9, 4, 6, 5, 4, 10, 11, 9, 6, 11, 10, 5, 3, 8, 11];

const ENCHANTED_TERRAINS: TileType[] = [
  'WOOD', 'WOOD', 'BRICK', 'BRICK', 'ORE', 'ORE', 'WHEAT', 'WHEAT', 'SHEEP',
  'DESERT', 'DESERT', 'DESERT', 'DESERT', 'DESERT', 'GOLD_FIELD', 'GOLD_FIELD',
];
const ENCHANTED_NUMBERS = [4, 8, 3, 9, 5, 10, 10, 5, 2, 6, 3];

const HARBORS: Array<{ key: string; type: NonNullable<HexTile['harbors']>[number]['type']; edgeIndex: number }> = [
  { key: '-3,-2', type: 'WOOD', edgeIndex: 5 },
  { key: '2,-2', type: 'BRICK', edgeIndex: 0 },
  { key: '-5,1', type: 'SHEEP', edgeIndex: 3 },
  { key: '-5,2', type: 'WHEAT', edgeIndex: 3 },
  { key: '-4,2', type: 'ORE', edgeIndex: 2 },
  { key: '-4,-1', type: 'GENERIC', edgeIndex: 4 },
  { key: '-4,0', type: 'GENERIC', edgeIndex: 3 },
  { key: '3,0', type: 'GENERIC', edgeIndex: 0 },
];

/**
 * Scenario 6: a 40-hex home area (19 land + 21 sea) and a 16-hex enchanted
 * island. The component counts, fixed number chits and all eight ports follow
 * the published setup table; the home terrain pool remains intentionally mixed.
 */
export const createEnchantedLandBoard = (): HexTile[] => {
  let homeTerrainIndex = 0;
  let homeNumberIndex = 0;
  let enchantedTerrainIndex = 0;
  let enchantedNumberIndex = 0;

  const tiles = ROWS.flatMap(({ r, qStart, count }) => Array.from({ length: count }, (_, offset) => {
    const q = qStart + offset;
    const key = `${q},${r}`;
    const isHomeLand = homeLand.has(key);
    const isEnchanted = enchantedLand.has(key);
    const type = isHomeLand
      ? HOME_TERRAINS[homeTerrainIndex++]
      : isEnchanted
        ? ENCHANTED_TERRAINS[enchantedTerrainIndex++]
        : 'WATER';
    const numberToken = type === 'DESERT' || type === 'WATER'
      ? null
      : isHomeLand
        ? HOME_NUMBERS[homeNumberIndex++]
        : ENCHANTED_NUMBERS[enchantedNumberIndex++];
    const harbor = HARBORS.find(candidate => candidate.key === key);

    return {
      id: `enchanted_${q}_${r}`,
      coord: { q, r, s: -q - r },
      type,
      numberToken,
      hasRobber: type === 'DESERT' && isHomeLand,
      islandId: isHomeLand ? 1 : isEnchanted ? 2 : undefined,
      harbors: harbor ? [{ type: harbor.type, edgeIndex: harbor.edgeIndex }] : undefined,
      scenarioMarker: isEnchanted ? { isEnchantedLand: true } : undefined,
    } satisfies HexTile;
  }));

  return tiles;
};
