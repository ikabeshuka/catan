import { HexTile } from '../../types/hex.types';
import { INDEX_TO_COORD_44 } from './fogIsland';

function createTile(index: number, updates: Partial<HexTile>): HexTile {
  const coord = INDEX_TO_COORD_44[index];
  if (!coord) throw new Error(`Invalid index ${index}`);
  return {
    id: `hex_td_${index}`,
    coord: { q: coord.q, r: coord.r, s: -coord.q - coord.r },
    type: 'WATER',
    numberToken: null,
    hasRobber: false,
    ...updates
  };
}

const INDEX_TO_COORD_37: Record<number, { q: number; r: number }> = {
  1: { q: 0, r: -3 }, 2: { q: 1, r: -3 }, 3: { q: 2, r: -3 }, 4: { q: 3, r: -3 },
  5: { q: -1, r: -2 }, 6: { q: 0, r: -2 }, 7: { q: 1, r: -2 }, 8: { q: 2, r: -2 }, 9: { q: 3, r: -2 },
  10: { q: -2, r: -1 }, 11: { q: -1, r: -1 }, 12: { q: 0, r: -1 }, 13: { q: 1, r: -1 }, 14: { q: 2, r: -1 }, 15: { q: 3, r: -1 },
  16: { q: -3, r: 0 }, 17: { q: -2, r: 0 }, 18: { q: -1, r: 0 }, 19: { q: 0, r: 0 }, 20: { q: 1, r: 0 }, 21: { q: 2, r: 0 }, 22: { q: 3, r: 0 },
  23: { q: -3, r: 1 }, 24: { q: -2, r: 1 }, 25: { q: -1, r: 1 }, 26: { q: 0, r: 1 }, 27: { q: 1, r: 1 }, 28: { q: 2, r: 1 },
  29: { q: -3, r: 2 }, 30: { q: -2, r: 2 }, 31: { q: -1, r: 2 }, 32: { q: 0, r: 2 }, 33: { q: 1, r: 2 },
  34: { q: -3, r: 3 }, 35: { q: -2, r: 3 }, 36: { q: -1, r: 3 }, 37: { q: 0, r: 3 }
};

function createThreePlayerTile(index: number, updates: Partial<HexTile>): HexTile {
  const coord = INDEX_TO_COORD_37[index];
  if (!coord) throw new Error(`Invalid 3-player index ${index}`);
  return {
    id: `hex_td3_${index}`,
    coord: { q: coord.q, r: coord.r, s: -coord.q - coord.r },
    type: 'WATER',
    numberToken: null,
    hasRobber: false,
    ...updates
  };
}

// Through the Desert - 3 Players (37 digital tiles: 35 official components
// plus 2 water tiles used to complete the digital sea frame).
export const seafarers3PlayersThroughTheDesert: HexTile[] = [
  createThreePlayerTile(1, { type: 'WATER', harbors: [{ type: 'WHEAT', toTileId: 'hex_td3_2' }] }),
  createThreePlayerTile(2, { type: 'WOOD', numberToken: 11, islandId: 1 }),
  createThreePlayerTile(3, { type: 'WATER', harbors: [{ type: 'WOOD', toTileId: 'hex_td3_2' }] }),
  createThreePlayerTile(4, { type: 'WHEAT', numberToken: 6, islandId: 2 }),

  createThreePlayerTile(5, { type: 'ORE', numberToken: 10, islandId: 1 }),
  createThreePlayerTile(6, { type: 'BRICK', numberToken: 6, islandId: 1 }),
  createThreePlayerTile(7, { type: 'WATER', harbors: [{ type: 'SHEEP', toTileId: 'hex_td3_6' }] }),
  createThreePlayerTile(8, { type: 'DESERT', numberToken: null, hasRobber: true, islandId: 1 }),
  createThreePlayerTile(9, { type: 'WOOD', numberToken: 3, islandId: 2 }),

  createThreePlayerTile(10, { type: 'SHEEP', numberToken: 8, islandId: 1 }),
  createThreePlayerTile(11, { type: 'WHEAT', numberToken: 9, islandId: 1 }),
  createThreePlayerTile(12, { type: 'ORE', numberToken: 3, islandId: 1 }),
  createThreePlayerTile(13, { type: 'BRICK', numberToken: 5, islandId: 1 }),
  createThreePlayerTile(14, { type: 'DESERT', numberToken: null, islandId: 1 }),
  createThreePlayerTile(15, { type: 'GOLD_FIELD', numberToken: 4, islandId: 2 }),

  createThreePlayerTile(16, { type: 'WATER', harbors: [{ type: 'BRICK', toTileId: 'hex_td3_10' }] }),
  createThreePlayerTile(17, { type: 'SHEEP', numberToken: 4, islandId: 1 }),
  createThreePlayerTile(18, { type: 'WOOD', numberToken: 8, islandId: 1 }),
  createThreePlayerTile(19, { type: 'WHEAT', numberToken: 2, islandId: 1 }),
  createThreePlayerTile(20, { type: 'WOOD', numberToken: 10, islandId: 1 }),
  createThreePlayerTile(21, { type: 'DESERT', numberToken: null, islandId: 1 }),
  createThreePlayerTile(22, { type: 'WATER' }),

  createThreePlayerTile(23, { type: 'WATER', harbors: [{ type: 'ORE', toTileId: 'hex_td3_17' }] }),
  createThreePlayerTile(24, { type: 'WATER', harbors: [{ type: 'GENERIC', toTileId: 'hex_td3_18' }] }),
  createThreePlayerTile(25, { type: 'BRICK', numberToken: 9, islandId: 1 }),
  createThreePlayerTile(26, { type: 'SHEEP', numberToken: 6, islandId: 1 }),
  createThreePlayerTile(27, { type: 'WATER', harbors: [{ type: 'GENERIC', toTileId: 'hex_td3_20' }] }),
  createThreePlayerTile(28, { type: 'WOOD', numberToken: 4, islandId: 1 }),

  createThreePlayerTile(29, { type: 'ORE', numberToken: 5, islandId: 3 }),
  createThreePlayerTile(30, { type: 'WHEAT', numberToken: 9, islandId: 3 }),
  createThreePlayerTile(31, { type: 'GOLD_FIELD', numberToken: 5, islandId: 4 }),
  createThreePlayerTile(32, { type: 'WATER', harbors: [{ type: 'GENERIC', toTileId: 'hex_td3_26' }] }),
  createThreePlayerTile(33, { type: 'ORE', numberToken: 8, islandId: 5 }),

  createThreePlayerTile(34, { type: 'WATER' }),
  createThreePlayerTile(35, { type: 'WATER', hasPirate: true }),
  createThreePlayerTile(36, { type: 'WATER' }),
  createThreePlayerTile(37, { type: 'SHEEP', numberToken: 11, islandId: 5 })
];

// Through the Desert - 4 Players (44 Tiles Grid)
export const seafarers4PlayersThroughTheDesert: HexTile[] = [
  // שורה 1 (r = -3, indices 1..5)
  createTile(1, { type: 'GOLD_FIELD', numberToken: 10, islandId: 2 }), // טריטוריה זרה צפון-מערב
  createTile(2, { type: 'DESERT', numberToken: null, hasRobber: true, islandId: 1 }), // מדבר ראשון (השודד מתחיל כאן)
  createTile(3, { type: 'WOOD', numberToken: 5, islandId: 1, harbors: [{ type: 'BRICK', toTileId: 'hex_td_4' }] }), // אי מרכזי
  createTile(4, { type: 'WATER', hasPirate: true }), // שודד ים (מיקום "X" בתחילת המשחק)
  createTile(5, { type: 'ORE', numberToken: 9, islandId: 3 }), // אי זר צפון-מזרח

  // שורה 2 (r = -2, indices 6..11)
  createTile(6, { type: 'ORE', numberToken: 11, islandId: 2 }), // טריטוריה זרה צפון-מערב
  createTile(7, { type: 'DESERT', numberToken: null, islandId: 1 }), // מדבר שני
  createTile(8, { type: 'BRICK', numberToken: 3, islandId: 1 }),
  createTile(9, { type: 'SHEEP', numberToken: 6, islandId: 1 }),
  createTile(10, { type: 'WATER' }),
  createTile(11, { type: 'WHEAT', numberToken: 4, islandId: 3 }), // אי זר צפון-מזרח

  // שורה 3 (r = -1, indices 12..18)
  createTile(12, { type: 'WHEAT', numberToken: 8, islandId: 2 }), // טריטוריה זרה צפון-מערב
  createTile(13, { type: 'DESERT', numberToken: null, islandId: 1 }), // מדבר שלישי
  createTile(14, { type: 'ORE', numberToken: 8, islandId: 1 }),
  createTile(15, { type: 'WHEAT', numberToken: 10, islandId: 1 }),
  createTile(16, { type: 'WOOD', numberToken: 4, islandId: 1, harbors: [{ type: 'GENERIC', toTileId: 'hex_td_10' }, { type: 'GENERIC', toTileId: 'hex_td_24' }] }),
  createTile(17, { type: 'WATER' }),
  createTile(18, { type: 'BRICK', numberToken: 2, islandId: 3 }), // אי זר מזרחי

  // שורה 4 (r = 0, indices 19..26)
  createTile(19, { type: 'WATER' }),
  createTile(20, { type: 'WATER' }),
  createTile(21, { type: 'WOOD', numberToken: 10, islandId: 1, harbors: [{ type: 'ORE', toTileId: 'hex_td_20' }] }),
  createTile(22, { type: 'BRICK', numberToken: 11, islandId: 1 }),
  createTile(23, { type: 'SHEEP', numberToken: 9, islandId: 1 }),
  createTile(24, { type: 'WATER' }),
  createTile(25, { type: 'WATER' }),
  createTile(26, { type: 'WATER' }),

  // שורה 5 (r = 1, indices 27..33)
  createTile(27, { type: 'BRICK', numberToken: 12, islandId: 1 }),
  createTile(28, { type: 'BRICK', numberToken: 6, islandId: 1 }),
  createTile(29, { type: 'WHEAT', numberToken: 5, islandId: 1 }),
  createTile(30, { type: 'WOOD', numberToken: 8, islandId: 1, harbors: [{ type: 'GENERIC', toTileId: 'hex_td_37' }] }),
  createTile(31, { type: 'WATER' }),
  createTile(32, { type: 'GOLD_FIELD', numberToken: 5, islandId: 4 }),
  createTile(33, { type: 'SHEEP', numberToken: 3, islandId: 4 }),

  // שורה 6 (r = 2, indices 34..39)
  createTile(34, { type: 'SHEEP', numberToken: 3, islandId: 1, harbors: [{ type: 'WHEAT', edgeIndex: 3 }, { type: 'ORE', toTileId: 'hex_td_40' }] }),
  createTile(35, { type: 'SHEEP', numberToken: 11, islandId: 1 }),
  createTile(36, { type: 'ORE', numberToken: 4, islandId: 1 }),
  createTile(37, { type: 'WATER' }),
  createTile(38, { type: 'WATER' }),
  createTile(39, { type: 'WATER' }),

  // שורה 7 (r = 3, indices 40..44)
  createTile(40, { type: 'WATER' }),
  createTile(41, { type: 'WOOD', numberToken: 9, islandId: 1, harbors: [{ type: 'GENERIC', edgeIndex: 2 }, { type: 'WOOD', toTileId: 'hex_td_42' }] }),
  createTile(42, { type: 'WATER' }),
  createTile(43, { type: 'ORE', numberToken: 6, islandId: 4 }), // אי זר דרומי
  createTile(44, { type: 'WHEAT', numberToken: 12, islandId: 4 }) // אי זר דרומי
];
