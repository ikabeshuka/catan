import { HexTile } from '../../types/hex.types';

type TileType = HexTile['type'];

const ROWS: Array<{ r: number; qStart: number; count: number }> = [
  { r: -3, qStart: -2, count: 6 },
  { r: -2, qStart: -3, count: 7 },
  { r: -1, qStart: -4, count: 8 },
  { r: 0, qStart: -4, count: 7 },
  { r: 1, qStart: -5, count: 8 },
  { r: 2, qStart: -5, count: 7 },
  { r: 3, qStart: -5, count: 6 },
];

const smallIsland = new Set(['-4,1', '-3,2', '-5,3', '-1,3', '0,3']);
const homeLand = new Set([
  '-2,-3', '-1,-3', '0,-3',
  '-3,-2', '-2,-2', '-1,-2', '0,-2', '1,-2',
  '-3,-1', '-2,-1', '-1,-1', '0,-1', '1,-1', '2,-1',
  '-2,0', '-1,0', '0,0', '1,0', '2,0',
  '-1,1', '0,1', '1,1', '2,1',
  '0,2', '1,2',
]);

const HOME_TERRAINS: TileType[] = [
  'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT',
  'ORE', 'ORE', 'ORE', 'ORE', 'ORE',
  'WOOD', 'WOOD', 'WOOD', 'WOOD',
  'BRICK', 'BRICK', 'BRICK', 'BRICK',
  'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP',
  'DESERT',
];
const HOME_NUMBERS = [6, 5, 3, 10, 12, 4, 2, 3, 4, 5, 6, 8, 9, 10, 11, 3, 4, 5, 6, 8, 9, 10, 11, 9];
const SMALL_TERRAINS: TileType[] = ['DESERT', 'GOLD_FIELD', 'DESERT', 'GOLD_FIELD', 'DESERT'];
const CANAL_KEYS = ['-2,-3', '-1,-3', '0,-3', '-3,-2', '-2,-2', '-1,-2', '0,-2', '1,-2', '1,-1'];
const INFERTILE_FIELD_KEYS = ['-2,-3', '-1,-3', '0,-3', '-3,-2', '-1,-2', '0,-2'];

const HARBORS: Array<{ key: string; type: NonNullable<HexTile['harbors']>[number]['type']; edgeIndex: number }> = [
  { key: '-2,-3', type: 'GENERIC', edgeIndex: 5 },
  { key: '0,-3', type: 'GENERIC', edgeIndex: 0 },
  { key: '-3,-2', type: 'WOOD', edgeIndex: 4 },
  { key: '1,-2', type: 'BRICK', edgeIndex: 0 },
  { key: '-3,-1', type: 'WHEAT', edgeIndex: 4 },
  { key: '2,-1', type: 'ORE', edgeIndex: 1 },
  { key: '-4,1', type: 'GENERIC', edgeIndex: 3 },
  { key: '1,2', type: 'GENERIC', edgeIndex: 2 },
];

/** Published 3-4 player setup: 44 home/sea hexes and five small-island hexes. */
export const createGreatCanalBoard = (): HexTile[] => {
  let homeTerrainIndex = 0;
  let homeNumberIndex = 0;
  let smallTerrainIndex = 0;

  return ROWS.flatMap(({ r, qStart, count }) => Array.from({ length: count }, (_, offset) => {
    const q = qStart + offset;
    const key = `${q},${r}`;
    const isSmallIsland = smallIsland.has(key);
    const isHomeLand = homeLand.has(key);
    const type = isSmallIsland
      ? SMALL_TERRAINS[smallTerrainIndex++]
      : isHomeLand
        ? HOME_TERRAINS[homeTerrainIndex++]
        : 'WATER';
    const numberToken = type === 'WATER' || type === 'DESERT'
      ? null
      : isSmallIsland
        ? 8
        : HOME_NUMBERS[homeNumberIndex++];
    const harbor = HARBORS.find(candidate => candidate.key === key);

    return {
      id: `canal_${q}_${r}`,
      coord: { q, r, s: -q - r },
      type,
      numberToken,
      hasRobber: type === 'DESERT' && isHomeLand,
      islandId: isSmallIsland ? 2 : isHomeLand ? 1 : undefined,
      harbors: harbor ? [{ type: harbor.type, edgeIndex: harbor.edgeIndex }] : undefined,
      scenarioMarker: isHomeLand && CANAL_KEYS.includes(key)
        ? { canalId: `canal-${CANAL_KEYS.indexOf(key) + 1}`, infertileField: INFERTILE_FIELD_KEYS.includes(key) }
        : undefined,
    } satisfies HexTile;
  }));
};
