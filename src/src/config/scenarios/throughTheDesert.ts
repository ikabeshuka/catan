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

// 4. Through the Desert - 4 Players (44 Tiles Grid)
export const seafarers4PlayersThroughTheDesert: HexTile[] = [
  // שורה 1 (r = -3, indices 1..5)
  createTile(1, { type: 'GOLD_FIELD', numberToken: 10, islandId: 2 }), // טריטוריה זרה צפון-מערב
  createTile(2, { type: 'DESERT', numberToken: null, hasRobber: true, islandId: 1 }), // מדבר ראשון (השודד מתחיל כאן)
  createTile(3, { type: 'WOOD', numberToken: 5, islandId: 1 }), // אי מרכזי
  createTile(4, { type: 'WATER', hasPirate: true }), // שודד ים (מיקום "X" בתחילת המשחק)
  createTile(5, { type: 'ORE', numberToken: 9, islandId: 3 }), // אי זר צפון-מזרח

  // שורה 2 (r = -2, indices 6..11)
  createTile(6, { type: 'ORE', numberToken: 11, islandId: 2 }), // טריטוריה זרה צפון-מערב
  createTile(7, { type: 'DESERT', numberToken: null, islandId: 1 }), // מדבר שני
  createTile(8, { type: 'BRICK', numberToken: 3, islandId: 1 }),
  createTile(9, { type: 'SHEEP', numberToken: 6, islandId: 1 }),
  createTile(10, { type: 'WATER', harbors: [{ type: 'GENERIC', toTileId: 'hex_td_9' }] }),
  createTile(11, { type: 'WHEAT', numberToken: 4, islandId: 3 }), // אי זר צפון-מזרח

  // שורה 3 (r = -1, indices 12..18)
  createTile(12, { type: 'WHEAT', numberToken: 8, islandId: 2 }), // טריטוריה זרה צפון-מערב
  createTile(13, { type: 'DESERT', numberToken: null, islandId: 1 }), // מדבר שלישי
  createTile(14, { type: 'ORE', numberToken: 8, islandId: 1 }),
  createTile(15, { type: 'WHEAT', numberToken: 10, islandId: 1 }),
  createTile(16, { type: 'WOOD', numberToken: 4, islandId: 1 }),
  createTile(17, { type: 'WATER' }),
  createTile(18, { type: 'BRICK', numberToken: 2, islandId: 3 }), // אי זר מזרחי

  // שורה 4 (r = 0, indices 19..26)
  createTile(19, { type: 'WATER' }),
  createTile(20, { type: 'WATER', harbors: [{ type: 'ORE', toTileId: 'hex_td_21' }] }),
  createTile(21, { type: 'WOOD', numberToken: 10, islandId: 1 }),
  createTile(22, { type: 'BRICK', numberToken: 11, islandId: 1 }),
  createTile(23, { type: 'SHEEP', numberToken: 9, islandId: 1 }),
  createTile(24, { type: 'WATER' }),
  createTile(25, { type: 'WATER' }),
  createTile(26, { type: 'WATER' }),

  // שורה 5 (r = 1, indices 27..33)
  createTile(27, { type: 'BRICK', numberToken: 12, islandId: 1 }),
  createTile(28, { type: 'BRICK', numberToken: 6, islandId: 1 }),
  createTile(29, { type: 'WHEAT', numberToken: 5, islandId: 1 }),
  createTile(30, { type: 'WOOD', numberToken: 8, islandId: 1 }),
  createTile(31, { type: 'WATER', harbors: [{ type: 'GENERIC', toTileId: 'hex_td_30' }] }),
  createTile(32, { type: 'GOLD_FIELD', numberToken: 5, islandId: 4 }),
  createTile(33, { type: 'SHEEP', numberToken: 3, islandId: 4 }),

  // שורה 6 (r = 2, indices 34..39)
  createTile(34, { type: 'SHEEP', numberToken: 3, islandId: 1 }),
  createTile(35, { type: 'SHEEP', numberToken: 11, islandId: 1 }),
  createTile(36, { type: 'ORE', numberToken: 4, islandId: 1 }),
  createTile(37, { type: 'WATER' }),
  createTile(38, { type: 'WATER' }),
  createTile(39, { type: 'WATER' }),

  // שורה 7 (r = 3, indices 40..44)
  createTile(40, { type: 'WATER', harbors: [{ type: 'SHEEP', toTileId: 'hex_td_34' }] }),
  createTile(41, { type: 'WOOD', numberToken: 9, islandId: 1, harbors: [{ type: 'WOOD', edgeIndex: 2 }] }),
  createTile(42, { type: 'WATER', harbors: [{ type: 'GENERIC', toTileId: 'hex_td_41' }] }),
  createTile(43, { type: 'ORE', numberToken: 6, islandId: 4 }), // אי זר דרומי
  createTile(44, { type: 'WHEAT', numberToken: 12, islandId: 4 }) // אי זר דרומי
];
