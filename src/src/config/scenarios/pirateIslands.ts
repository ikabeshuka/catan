import { HexTile } from '../../types/hex.types';

/** Official 6-7-8-9-8-7-6 Pirate Islands layout. */
const ROWS = [6, 7, 8, 9, 8, 7, 6];

const coordForIndex = (index: number) => {
  let first = 1;
  for (let row = 0; row < ROWS.length; row += 1) {
    const count = ROWS[row];
    if (index >= first && index < first + count) {
      const r = row - 3;
      const q = -row + Math.max(0, row - 3) + (index - first);
      return { q, r, s: -q - r };
    }
    first += count;
  }
  throw new Error(`Invalid Pirate Islands tile index: ${index}`);
};

type TileSpec = Pick<HexTile, 'type' | 'numberToken' | 'harbors' | 'islandId'>;

const specs: TileSpec[] = [
  { type: 'GOLD_FIELD', numberToken: 11, islandId: 2 }, { type: 'ORE', numberToken: 6, islandId: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'WHEAT', numberToken: 4, islandId: 1, harbors: [{ type: 'GENERIC', edgeIndex: 4 }] }, { type: 'BRICK', numberToken: 5, islandId: 1, harbors: [{ type: 'GENERIC', edgeIndex: 4 }, { type: 'GENERIC', edgeIndex: 0 }] },
  { type: 'BRICK', numberToken: null, islandId: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'DESERT', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'ORE', numberToken: 9, islandId: 1 }, { type: 'WOOD', numberToken: 10, islandId: 1, harbors: [{ type: 'GENERIC', edgeIndex: 0 }] },
  { type: 'WHEAT', numberToken: 4, islandId: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'DESERT', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'WOOD', numberToken: 3, islandId: 1 }, { type: 'SHEEP', numberToken: 8, islandId: 1 }, { type: 'WOOD', numberToken: 5, islandId: 1 },
  { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'ORE', numberToken: 8, islandId: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'WHEAT', numberToken: 6, islandId: 1 }, { type: 'BRICK', numberToken: 9, islandId: 1 }, { type: 'SHEEP', numberToken: 12, islandId: 1, harbors: [{ type: 'GENERIC', edgeIndex: 0 }] }, { type: 'WATER', numberToken: null },
  { type: 'WHEAT', numberToken: 10, islandId: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'DESERT', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'SHEEP', numberToken: null, islandId: 3 }, { type: 'WOOD', numberToken: 8, islandId: 1 }, { type: 'SHEEP', numberToken: 9, islandId: 1, harbors: [{ type: 'GENERIC', edgeIndex: 1 }] },
  { type: 'BRICK', numberToken: null, islandId: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'SHEEP', numberToken: null, islandId: 3 }, { type: 'WATER', numberToken: null }, { type: 'ORE', numberToken: 5, islandId: 1 }, { type: 'WOOD', numberToken: 2, islandId: 1, harbors: [{ type: 'GENERIC', edgeIndex: 1 }] },
  { type: 'GOLD_FIELD', numberToken: 3, islandId: 2 }, { type: 'ORE', numberToken: 6, islandId: 2 }, { type: 'WATER', numberToken: null }, { type: 'WATER', numberToken: null }, { type: 'WHEAT', numberToken: 10, islandId: 1, harbors: [{ type: 'GENERIC', edgeIndex: 1 }] }, { type: 'BRICK', numberToken: 4, islandId: 1 },
];

export const seafarersPirateIslands: HexTile[] = specs.map((spec, zeroIndex) => {
  const index = zeroIndex + 1;
  return { id: `hex_pi_${index}`, coord: coordForIndex(index), type: spec.type, numberToken: spec.numberToken, hasRobber: false, hasPirate: index === 49, islandId: spec.islandId, harbors: spec.harbors?.map(harbor => ({ ...harbor })) };
});

export const PIRATE_ISLANDS_FLEET_ROUTE = [49, 48, 41, 33, 25, 16, 9, 3, 4, 11, 18, 26, 35, 43];
export const PIRATE_ISLANDS_FORTRESSES = [
  { playerIndex: 0, color: 'RED', tileIds: [1], vertexIndex: 0 },
  { playerIndex: 1, color: 'YELLOW', tileIds: [15, 16, 24] },
  { playerIndex: 2, color: 'BLUE', tileIds: [31, 32, 39] },
  { playerIndex: 3, color: 'GREEN', tileIds: [46], vertexIndex: 3 },
] as const;
// The two prose references that do not form a shared vertex are corrected
// here from the resource labels supplied with the scenario.
export const PIRATE_ISLANDS_STARTS = [
  { playerIndex: 0, vertexTiles: [5, 11, 12], shipTiles: [5, 11] },
  { playerIndex: 1, vertexTiles: [7, 14, 15], shipTiles: [7, 15] },
  { playerIndex: 2, vertexTiles: [27, 35, 36], shipTiles: [27, 35] },
  { playerIndex: 3, vertexTiles: [43, 44, 50], shipTiles: [43, 50] },
] as const;
export const PIRATE_ISLANDS_SETTLEMENT_TARGETS = [
  { playerIndex: 0, tileIds: [2, 3] }, { playerIndex: 1, tileIds: [15, 16, 24] },
  { playerIndex: 2, tileIds: [24, 32, 33] }, { playerIndex: 3, tileIds: [47, 48] },
] as const;
