import { HexTile } from '../../types/hex.types';

// 5. Fog Island - 3 Players (37 Tiles, now using complete 44 layout mapping)
export const INDEX_TO_COORD_44: Record<number, { q: number; r: number }> = {
  // שורה 1 (5 אריחים, r = -3, q: -1..3)
  1: { q: -1, r: -3 }, 2: { q: 0, r: -3 }, 3: { q: 1, r: -3 }, 4: { q: 2, r: -3 }, 5: { q: 3, r: -3 },

  // שורה 2 (6 אריחים, r = -2, q: -2..3)
  6: { q: -2, r: -2 }, 7: { q: -1, r: -2 }, 8: { q: 0, r: -2 }, 9: { q: 1, r: -2 }, 10: { q: 2, r: -2 }, 11: { q: 3, r: -2 },

  // שורה 3 (7 אריחים, r = -1, q: -3..3)
  12: { q: -3, r: -1 }, 13: { q: -2, r: -1 }, 14: { q: -1, r: -1 }, 15: { q: 0, r: -1 }, 16: { q: 1, r: -1 }, 17: { q: 2, r: -1 }, 18: { q: 3, r: -1 },

  // שורה 4 (8 אריחים, r = 0, q: -4..3)
  19: { q: -4, r: 0 }, 20: { q: -3, r: 0 }, 21: { q: -2, r: 0 }, 22: { q: -1, r: 0 }, 23: { q: 0, r: 0 }, 24: { q: 1, r: 0 }, 25: { q: 2, r: 0 }, 26: { q: 3, r: 0 },

  // שורה 5 (7 אריחים, r = 1, q: -4..2)
  27: { q: -4, r: 1 }, 28: { q: -3, r: 1 }, 29: { q: -2, r: 1 }, 30: { q: -1, r: 1 }, 31: { q: 0, r: 1 }, 32: { q: 1, r: 1 }, 33: { q: 2, r: 1 },

  // שורה 6 (6 אריחים, r = 2, q: -4..1)
  34: { q: -4, r: 2 }, 35: { q: -3, r: 2 }, 36: { q: -2, r: 2 }, 37: { q: -1, r: 2 }, 38: { q: 0, r: 2 }, 39: { q: 1, r: 2 },

  // שורה 7 (5 אריחים, r = 3, q: -4..0)
  40: { q: -4, r: 3 }, 41: { q: -3, r: 3 }, 42: { q: -2, r: 3 }, 43: { q: -1, r: 3 }, 44: { q: 0, r: 3 }
};

function createTileFromIndex(index: number, idPrefix: string, updates: Partial<HexTile>): HexTile {
  const coord = INDEX_TO_COORD_44[index];
  if (!coord) throw new Error(`Invalid index ${index}`);
  return {
    id: `${idPrefix}_${index}`,
    coord: { q: coord.q, r: coord.r, s: -coord.q - coord.r },
    type: 'WATER',
    numberToken: null,
    hasRobber: false,
    ...updates
  };
}

const rawSeafarers3PlayersFogIsland: HexTile[] = [
  // אריחי FOG (ערפל נסתר)
  ...[1, 2, 6, 7, 8, 15, 23, 31, 38, 39, 43, 44].map(idx => 
    createTileFromIndex(idx, 'hex_fog3', { 
      type: 'FOG', 
      isFog: true, 
      originalType: idx % 3 === 0 ? 'WOOD' : idx % 3 === 1 ? 'WHEAT' : 'SHEEP', 
      originalNumberToken: idx % 4 === 0 ? 5 : idx % 4 === 1 ? 9 : idx % 4 === 2 ? 8 : 4
    })
  ),

  // אריחי יבשה גלויים
  createTileFromIndex(4, 'hex_fog3', { type: 'BRICK', numberToken: 6, harbors: [{ type: 'GENERIC', toTileId: 'hex_fog3_3' }] }),
  createTileFromIndex(5, 'hex_fog3', { type: 'WOOD', numberToken: 11, harbors: [{ type: 'SHEEP', toTileId: 'hex_fog3_11' }] }),
  createTileFromIndex(10, 'hex_fog3', { type: 'WOOD', numberToken: 5 }),
  createTileFromIndex(11, 'hex_fog3', { type: 'WHEAT', numberToken: 3 }),
  createTileFromIndex(17, 'hex_fog3', { type: 'SHEEP', numberToken: 8 }),
  createTileFromIndex(18, 'hex_fog3', { type: 'SHEEP', numberToken: 9, harbors: [{ type: 'WHEAT', toTileId: 'hex_fog3_11' }] }),
  createTileFromIndex(20, 'hex_fog3', { type: 'WOOD', numberToken: 6, harbors: [{ type: 'ORE', toTileId: 'hex_fog3_27' }] }),
  createTileFromIndex(21, 'hex_fog3', { type: 'SHEEP', numberToken: 5 }),
  createTileFromIndex(25, 'hex_fog3', { type: 'ORE', numberToken: 4, harbors: [{ type: 'GENERIC', toTileId: 'hex_fog3_26' }] }),
  createTileFromIndex(28, 'hex_fog3', { type: 'BRICK', numberToken: 11, harbors: [{ type: 'WOOD', toTileId: 'hex_fog3_34' }] }),
  createTileFromIndex(29, 'hex_fog3', { type: 'WOOD', numberToken: 9 }),
  createTileFromIndex(35, 'hex_fog3', { type: 'ORE', numberToken: 8 }),
  createTileFromIndex(36, 'hex_fog3', { type: 'WHEAT', numberToken: 10, harbors: [{ type: 'BRICK', toTileId: 'hex_fog3_42' }] }),
  createTileFromIndex(41, 'hex_fog3', { type: 'SHEEP', numberToken: 12, hasRobber: true, harbors: [{ type: 'GENERIC', toTileId: 'hex_fog3_40' }] }), // השודד הרגיל ממוקם על אריח 41

  // אריחי ים (WATER)
  ...[3, 9, 12, 13, 14, 16, 19, 22, 24, 26, 27, 30, 32, 33, 34, 37, 40, 42].map(idx => 
    createTileFromIndex(idx, 'hex_fog3', { type: 'WATER', hasPirate: idx === 3 ? true : undefined })
  )
].sort((a, b) => {
  const aIdx = parseInt(a.id.split('_')[2]);
  const bIdx = parseInt(b.id.split('_')[2]);
  return aIdx - bIdx;
});

export const seafarers3PlayersFogIsland: HexTile[] = rawSeafarers3PlayersFogIsland.map(tile => {
  if (tile.type === 'WATER' || tile.type === 'FOG') return tile;
  return { ...tile, islandId: 1 };
});

// 6. Fog Island - 4 Players (44 Tiles)
const rawSeafarers4PlayersFogIsland: HexTile[] = [
  // אריחי FOG (ערפל נסתר)
  ...[1, 6, 7, 14, 22, 23, 30, 31, 37, 38, 43, 44].map(idx => 
    createTileFromIndex(idx, 'hex_fog4', { 
      type: 'FOG', 
      isFog: true, 
      originalType: idx % 3 === 0 ? 'ORE' : idx % 3 === 1 ? 'SHEEP' : 'WOOD', 
      originalNumberToken: idx % 4 === 0 ? 8 : idx % 4 === 1 ? 5 : idx % 4 === 2 ? 10 : 3
    })
  ),

  // אריחי יבשה גלויים
  createTileFromIndex(3, 'hex_fog4', { type: 'BRICK', numberToken: 4, harbors: [{ type: 'SHEEP', edgeIndex: 5 }] }),
  createTileFromIndex(4, 'hex_fog4', { type: 'WHEAT', numberToken: 10 }),
  createTileFromIndex(5, 'hex_fog4', { type: 'ORE', numberToken: 3, harbors: [{ type: 'WHEAT', edgeIndex: 4 }, { type: 'GENERIC', edgeIndex: 0 }] }),
  createTileFromIndex(9, 'hex_fog4', { type: 'SHEEP', numberToken: 9 }),
  createTileFromIndex(10, 'hex_fog4', { type: 'WOOD', numberToken: 6 }),
  createTileFromIndex(11, 'hex_fog4', { type: 'BRICK', numberToken: 12, hasRobber: true }), // השודד הרגיל ממוקם על אריח 11 (BRICK 12)
  createTileFromIndex(17, 'hex_fog4', { type: 'SHEEP', numberToken: 10 }),
  createTileFromIndex(18, 'hex_fog4', { type: 'ORE', numberToken: 8, harbors: [{ type: 'BRICK', edgeIndex: 5 }] }),
  createTileFromIndex(20, 'hex_fog4', { type: 'ORE', numberToken: 3, harbors: [{ type: 'WOOD', toTileId: 'hex_fog4_19' }] }),
  createTileFromIndex(25, 'hex_fog4', { type: 'WHEAT', numberToken: 11 }),
  createTileFromIndex(27, 'hex_fog4', { type: 'WHEAT', numberToken: 6, harbors: [{ type: 'ORE', edgeIndex: 2 }] }),
  createTileFromIndex(28, 'hex_fog4', { type: 'WOOD', numberToken: 4 }),
  createTileFromIndex(33, 'hex_fog4', { type: 'WOOD', numberToken: 5, harbors: [{ type: 'GENERIC', toTileId: 'hex_fog4_32' }] }),
  createTileFromIndex(34, 'hex_fog4', { type: 'BRICK', numberToken: 9 }),
  createTileFromIndex(35, 'hex_fog4', { type: 'SHEEP', numberToken: 8 }),
  createTileFromIndex(40, 'hex_fog4', { type: 'SHEEP', numberToken: 2, harbors: [{ type: 'GENERIC', edgeIndex: 3 }, { type: 'GENERIC', edgeIndex: 1 }] }),
  createTileFromIndex(41, 'hex_fog4', { type: 'WOOD', numberToken: 5 }),

  // אריחי ים (WATER)
  ...[2, 8, 12, 13, 15, 16, 19, 21, 24, 26, 29, 32, 36, 39, 42].map(idx => 
    createTileFromIndex(idx, 'hex_fog4', { type: 'WATER', hasPirate: idx === 2 ? true : undefined })
  )
].sort((a, b) => {
  const aIdx = parseInt(a.id.split('_')[2]);
  const bIdx = parseInt(b.id.split('_')[2]);
  return aIdx - bIdx;
});

export const seafarers4PlayersFogIsland: HexTile[] = rawSeafarers4PlayersFogIsland.map(tile => {
  if (tile.type === 'WATER' || tile.type === 'FOG') return tile;
  return { ...tile, islandId: 1 };
});
