import { HexTile } from '../types/hex.types';

function getNewShoresIslandId(q: number, r: number, is4Player: boolean = false): number {
  if (is4Player) {
    if (r === -3 && (q === -1 || q === 0)) return 8; // Top-middle
    if (r === -3 && q === 2) return 7; // Top-right
    if (r === -2 && (q === 2 || q === 3)) return 6; // Right island
    if (r === -1 && q === 3) return 6; // Right island
    if (r === -1 && q === 2) return 6; // Right island (Wood tile adjacent) - תיקון
    if (r === 0 && q === 2) return 6; // Right island (Gold Field adjacent) - תיקון
    if (r === 2 && q === 1) return 4; // Bottom island
    if (r === 3 && q === 0) return 4;
    return 1; // כל השאר שייכים לאי המרכזי!
  }
  
  if ((q === -3 && (r === 0 || r === 1 || r === 2)) || (q === -4 && (r === 1 || r === 2))) return 2; // Left gold
  if ((q === -2 || q === -3) && r === 3) return 3; // Bottom-left
  if ((q === 0 && r === 3) || (q === 1 && r === 2)) return 4; // Bottom
  if (q === 2 && r === 1) return 5; // Bottom-right
  if ((q === 3 && (r === 0 || r === -1 || r === -2)) || (q === 2 && (r === 0 || r === -2))) return 6; // Right gold
  if (q === 2 && r === -3) return 7; // Top-right
  if ((q === 1 || q === 0 || q === -1) && r === -3) return 8; // Top-middle
  if (q === -2 && r === -1) return 9; // Top-left
  return 1; // Main island
}

// 1. Heading for New Shores - 3 Players (37 Tiles)
const rawSeafarers3PlayersNewShores: HexTile[] = [
  // Row r = -3 (4 tiles): q from 0 to 3
  { id: 'hex_3p_1', coord: { q: 0, r: -3, s: 3 }, type: 'BRICK', numberToken: 12, hasRobber: false },
  { id: 'hex_3p_2', coord: { q: 1, r: -3, s: 2 }, type: 'GOLD_FIELD', numberToken: 5, hasRobber: false },
  { id: 'hex_3p_3', coord: { q: 2, r: -3, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_4', coord: { q: 3, r: -3, s: 0 }, type: 'WATER', numberToken: null, hasRobber: false },

  // Row r = -2 (5 tiles): q from -1 to 3
  { id: 'hex_3p_5', coord: { q: -1, r: -2, s: 3 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_6', coord: { q: 0, r: -2, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_7', coord: { q: 1, r: -2, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_8', coord: { q: 2, r: -2, s: 0 }, type: 'SHEEP', numberToken: 4, hasRobber: false },
  { id: 'hex_3p_9', coord: { q: 3, r: -2, s: -1 }, type: 'ORE', numberToken: 9, hasRobber: false },

  // Row r = -1 (6 tiles): q from -2 to 3
  { id: 'hex_3p_10', coord: { q: -2, r: -1, s: 3 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_11', coord: { q: -1, r: -1, s: 2 }, type: 'WHEAT', numberToken: 4, hasRobber: false, harbors: [{ type: 'WHEAT', toTileId: 'hex_3p_10' }] },
  { id: 'hex_3p_12', coord: { q: 0, r: -1, s: 1 }, type: 'SHEEP', numberToken: 6, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_3p_13' }] },
  { id: 'hex_3p_13', coord: { q: 1, r: -1, s: 0 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_14', coord: { q: 2, r: -1, s: -1 }, type: 'WHEAT', numberToken: 3, hasRobber: false },
  { id: 'hex_3p_15', coord: { q: 3, r: -1, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },

  // Row r = 0 (7 tiles): q from -3 to 3
  { id: 'hex_3p_16', coord: { q: -3, r: 0, s: 3 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_17', coord: { q: -2, r: 0, s: 2 }, type: 'SHEEP', numberToken: 2, hasRobber: false },
  { id: 'hex_3p_18', coord: { q: -1, r: 0, s: 1 }, type: 'ORE', numberToken: 5, hasRobber: false },
  { id: 'hex_3p_19', coord: { q: 0, r: 0, s: 0 }, type: 'WOOD', numberToken: 10, hasRobber: false },
  { id: 'hex_3p_20', coord: { q: 1, r: 0, s: -1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_21', coord: { q: 2, r: 0, s: -2 }, type: 'GOLD_FIELD', numberToken: 4, hasRobber: false },
  { id: 'hex_3p_22', coord: { q: 3, r: 0, s: -3 }, type: 'WATER', numberToken: null, hasRobber: false, hasPirate: true },

  // Row r = 1 (6 tiles): q from -3 to 2
  { id: 'hex_3p_23', coord: { q: -3, r: 1, s: 2 }, type: 'BRICK', numberToken: 8, hasRobber: false, harbors: [{ type: 'ORE', toTileId: 'hex_3p_16' }, { type: 'GENERIC', toTileId: 'hex_3p_29' }] },
  { id: 'hex_3p_24', coord: { q: -2, r: 1, s: 1 }, type: 'SHEEP', numberToken: 10, hasRobber: false },
  { id: 'hex_3p_25', coord: { q: -1, r: 1, s: 0 }, type: 'SHEEP', numberToken: 9, hasRobber: false },
  { id: 'hex_3p_26', coord: { q: 0, r: 1, s: -1 }, type: 'WOOD', numberToken: 8, hasRobber: false, harbors: [{ type: 'SHEEP', toTileId: 'hex_3p_20' }] },
  { id: 'hex_3p_27', coord: { q: 1, r: 1, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_28', coord: { q: 2, r: 1, s: -3 }, type: 'WATER', numberToken: null, hasRobber: false },

  // Row r = 2 (5 tiles): q from -3 to 1
  { id: 'hex_3p_29', coord: { q: -3, r: 2, s: 1 }, type: 'WHEAT', numberToken: 11, hasRobber: false },
  { id: 'hex_3p_30', coord: { q: -2, r: 2, s: 0 }, type: 'ORE', numberToken: 3, hasRobber: false },
  { id: 'hex_3p_31', coord: { q: -1, r: 2, s: -1 }, type: 'BRICK', numberToken: 11, hasRobber: false },
  { id: 'hex_3p_32', coord: { q: 0, r: 2, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_33', coord: { q: 1, r: 2, s: -3 }, type: 'ORE', numberToken: 8, hasRobber: false },

  // Row r = 3 (4 tiles): q from -3 to 0
  { id: 'hex_3p_34', coord: { q: -3, r: 3, s: 0 }, type: 'WHEAT', numberToken: 6, hasRobber: false, harbors: [{ type: 'BRICK', toTileId: 'hex_3p_29' }] },
  { id: 'hex_3p_35', coord: { q: -2, r: 3, s: -1 }, type: 'WOOD', numberToken: 5, hasRobber: false, harbors: [{ type: 'WOOD', toTileId: 'hex_3p_34' }, { type: 'GENERIC', toTileId: 'hex_3p_36' }] },
  { id: 'hex_3p_36', coord: { q: -1, r: 3, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_3p_37', coord: { q: 0, r: 3, s: -3 }, type: 'BRICK', numberToken: 10, hasRobber: false },
];

export const seafarers3PlayersNewShores: HexTile[] = rawSeafarers3PlayersNewShores.map(tile => {
  if (tile.type === 'WATER') return tile;
  return { ...tile, islandId: getNewShoresIslandId(tile.coord.q, tile.coord.r, false) };
});

// 2. Heading for New Shores - 4 Players (44 Tiles)
// Asymmetric layout with row counts (5,6,7,8,7,6,5) using axial coordinates (q, r, s)
const rawSeafarers4PlayersNewShores: HexTile[] = [
  // שורה 1 (r = -3, 5 אריחים)
  { id: 'hex_4p_1', coord: { q: -1, r: -3, s: 4 }, type: 'ORE', numberToken: 8, hasRobber: false },
  { id: 'hex_4p_2', coord: { q: 0, r: -3, s: 3 }, type: 'SHEEP', numberToken: 11, hasRobber: false },
  { id: 'hex_4p_3', coord: { q: 1, r: -3, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_4', coord: { q: 2, r: -3, s: 1 }, type: 'GOLD_FIELD', numberToken: 4, hasRobber: false },
  { id: 'hex_4p_5', coord: { q: 3, r: -3, s: 0 }, type: 'WATER', numberToken: null, hasRobber: false },

  // שורה 2 (r = -2, 6 אריחים)
  { id: 'hex_4p_6', coord: { q: -2, r: -2, s: 4 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_7', coord: { q: -1, r: -2, s: 3 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_8', coord: { q: 0, r: -2, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_9', coord: { q: 1, r: -2, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_10', coord: { q: 2, r: -2, s: 0 }, type: 'BRICK', numberToken: 5, hasRobber: false },
  { id: 'hex_4p_11', coord: { q: 3, r: -2, s: -1 }, type: 'ORE', numberToken: 2, hasRobber: false },

  // שורה 3 (r = -1, 7 אריחים)
  { id: 'hex_4p_12', coord: { q: -3, r: -1, s: 4 }, type: 'WATER', numberToken: null, hasRobber: false },
  // נמל א: מ-13 (כבשה 5) על 12 (ים) - כללי
  { id: 'hex_4p_13', coord: { q: -2, r: -1, s: 3 }, type: 'SHEEP', numberToken: 5, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_4p_12' }] },
  { id: 'hex_4p_14', coord: { q: -1, r: -1, s: 2 }, type: 'WOOD', numberToken: 6, hasRobber: false },
  // נמל ב: מ-15 (ברזל 4) על 8 (ים) - ברזל
  { id: 'hex_4p_15', coord: { q: 0, r: -1, s: 1 }, type: 'ORE', numberToken: 4, hasRobber: false, harbors: [{ type: 'ORE', toTileId: 'hex_4p_8' }] },
  { id: 'hex_4p_16', coord: { q: 1, r: -1, s: 0 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_17', coord: { q: 2, r: -1, s: -1 }, type: 'WOOD', numberToken: 9, hasRobber: false },
  { id: 'hex_4p_18', coord: { q: 3, r: -1, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },

  // שורה 4 (r = 0, 8 אריחים)
  { id: 'hex_4p_19', coord: { q: -4, r: 0, s: 4 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_20', coord: { q: -3, r: 0, s: 3 }, type: 'WHEAT', numberToken: 12, hasRobber: false },
  { id: 'hex_4p_21', coord: { q: -2, r: 0, s: 2 }, type: 'BRICK', numberToken: 11, hasRobber: false },
  { id: 'hex_4p_22', coord: { q: -1, r: 0, s: 1 }, type: 'WHEAT', numberToken: 3, hasRobber: false },
  // נמל ג: מ-23 (כבשה 9) על 16 (ים) - כללי
  { id: 'hex_4p_23', coord: { q: 0, r: 0, s: 0 }, type: 'SHEEP', numberToken: 9, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_4p_16' }] },
  { id: 'hex_4p_24', coord: { q: 1, r: 0, s: -1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_25', coord: { q: 2, r: 0, s: -2 }, type: 'GOLD_FIELD', numberToken: 10, hasRobber: false },
  { id: 'hex_4p_26', coord: { q: 3, r: 0, s: -3 }, type: 'WATER', numberToken: null, hasRobber: false, hasPirate: true },

  // שורה 5 (r = 1, 7 אריחים)
  // נמל ד: מ-27 (לבנים 6) על 19 (ים) - כבשים | נמל ה: מ-27 על המסגרת לכיוון 34 - לבנים (צלע 2)
  { id: 'hex_4p_27', coord: { q: -4, r: 1, s: 3 }, type: 'BRICK', numberToken: 6, hasRobber: false, harbors: [{ type: 'SHEEP', toTileId: 'hex_4p_19' }, { type: 'BRICK', edgeIndex: 2 }] },
  { id: 'hex_4p_28', coord: { q: -3, r: 1, s: 2 }, type: 'WOOD', numberToken: 10, hasRobber: false },
  { id: 'hex_4p_29', coord: { q: -2, r: 1, s: 1 }, type: 'DESERT', numberToken: null, hasRobber: true },
  { id: 'hex_4p_30', coord: { q: -1, r: 1, s: 0 }, type: 'WHEAT', numberToken: 11, hasRobber: false },
  // נמל ו: מ-31 (עץ 5) על 38 (ים) - חיטה
  { id: 'hex_4p_31', coord: { q: 0, r: 1, s: -1 }, type: 'WOOD', numberToken: 5, hasRobber: false, harbors: [{ type: 'WHEAT', toTileId: 'hex_4p_38' }] },
  { id: 'hex_4p_32', coord: { q: 1, r: 1, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_33', coord: { q: 2, r: 1, s: -3 }, type: 'WATER', numberToken: null, hasRobber: false },

  // שורה 6 (r = 2, 6 אריחים)
  { id: 'hex_4p_34', coord: { q: -4, r: 2, s: 2 }, type: 'ORE', numberToken: 3, hasRobber: false },
  { id: 'hex_4p_35', coord: { q: -3, r: 2, s: 1 }, type: 'SHEEP', numberToken: 4, hasRobber: false },
  { id: 'hex_4p_36', coord: { q: -2, r: 2, s: 0 }, type: 'BRICK', numberToken: 9, hasRobber: false },
  { id: 'hex_4p_37', coord: { q: -1, r: 2, s: -1 }, type: 'SHEEP', numberToken: 8, hasRobber: false },
  { id: 'hex_4p_38', coord: { q: 0, r: 2, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_39', coord: { q: 1, r: 2, s: -3 }, type: 'BRICK', numberToken: 3, hasRobber: false },

  // שורה 7 (r = 3, 5 אריחים)
  // נמל ז: מ-40 (חיטה 8) על המסגרת המערבית (צלע 3) - כללי
  { id: 'hex_4p_40', coord: { q: -4, r: 3, s: 1 }, type: 'WHEAT', numberToken: 8, hasRobber: false, harbors: [{ type: 'GENERIC', edgeIndex: 3 }] },
  // נמל ח: מ-41 (עץ 2) על המסגרת הדרומית (צלע 2) - עץ
  { id: 'hex_4p_41', coord: { q: -3, r: 3, s: 0 }, type: 'WOOD', numberToken: 2, hasRobber: false, harbors: [{ type: 'WOOD', edgeIndex: 2 }] },
  // נמל ט: מ-42 (ברזל 10) על 43 (ים) - כללי
  { id: 'hex_4p_42', coord: { q: -2, r: 3, s: -1 }, type: 'ORE', numberToken: 10, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_4p_43' }] },
  { id: 'hex_4p_43', coord: { q: -1, r: 3, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_4p_44', coord: { q: 0, r: 3, s: -3 }, type: 'WHEAT', numberToken: 6, hasRobber: false },
];

export const seafarers4PlayersNewShores: HexTile[] = rawSeafarers4PlayersNewShores.map(tile => {
  if (tile.type === 'WATER') return tile;
  return { ...tile, islandId: getNewShoresIslandId(tile.coord.q, tile.coord.r, true) };
});

// 3. Four Islands - 3 Players (37 Tiles)
// Made of 4 distinct land islands separated by water channels
const rawSeafarers3PlayersFourIslands: HexTile[] = [
  // Row 1
  { id: 'hex_fi3_1', coord: { q: 0, r: -3, s: 3 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_2', coord: { q: 1, r: -3, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_3', coord: { q: 2, r: -3, s: 1 }, type: 'WHEAT', numberToken: 4, hasRobber: false },
  { id: 'hex_fi3_4', coord: { q: 3, r: -3, s: 0 }, type: 'SHEEP', numberToken: 3, hasRobber: false },

  // Row 2
  { id: 'hex_fi3_5', coord: { q: -1, r: -2, s: 3 }, type: 'ORE', numberToken: 4, hasRobber: false },
  { id: 'hex_fi3_6', coord: { q: 0, r: -2, s: 2 }, type: 'WOOD', numberToken: 9, hasRobber: false, harbors: [{ type: 'ORE', toTileId: 'hex_fi3_12' }] },
  { id: 'hex_fi3_7', coord: { q: 1, r: -2, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_8', coord: { q: 2, r: -2, s: 0 }, type: 'WHEAT', numberToken: 9, hasRobber: false },
  { id: 'hex_fi3_9', coord: { q: 3, r: -2, s: -1 }, type: 'BRICK', numberToken: 5, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_fi3_4' }] },

  // Row 3
  { id: 'hex_fi3_10', coord: { q: -2, r: -1, s: 3 }, type: 'SHEEP', numberToken: 6, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_fi3_5' }] },
  { id: 'hex_fi3_11', coord: { q: -1, r: -1, s: 2 }, type: 'ORE', numberToken: 10, hasRobber: false },
  { id: 'hex_fi3_12', coord: { q: 0, r: -1, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_13', coord: { q: 1, r: -1, s: 0 }, type: 'WOOD', numberToken: 8, hasRobber: false },
  { id: 'hex_fi3_14', coord: { q: 2, r: -1, s: -1 }, type: 'BRICK', numberToken: 11, hasRobber: false, harbors: [{ type: 'BRICK', toTileId: 'hex_fi3_20' }] },
  { id: 'hex_fi3_15', coord: { q: 3, r: -1, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },

  // Row 4
  { id: 'hex_fi3_16', coord: { q: -3, r: 0, s: 3 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_17', coord: { q: -2, r: 0, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_18', coord: { q: -1, r: 0, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_19', coord: { q: 0, r: 0, s: 0 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_20', coord: { q: 1, r: 0, s: -1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_21', coord: { q: 2, r: 0, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_22', coord: { q: 3, r: 0, s: -3 }, type: 'WATER', numberToken: null, hasRobber: false },

  // Row 5
  { id: 'hex_fi3_23', coord: { q: -3, r: 1, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false, harbors: [{ type: 'WOOD', toTileId: 'hex_fi3_17' }] },
  { id: 'hex_fi3_24', coord: { q: -2, r: 1, s: 1 }, type: 'WHEAT', numberToken: 11, hasRobber: false },
  { id: 'hex_fi3_25', coord: { q: -1, r: 1, s: 0 }, type: 'ORE', numberToken: 8, hasRobber: false },
  { id: 'hex_fi3_26', coord: { q: 0, r: 1, s: -1 }, type: 'WOOD', numberToken: 3, hasRobber: false },
  { id: 'hex_fi3_27', coord: { q: 1, r: 1, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_28', coord: { q: 2, r: 1, s: -3 }, type: 'BRICK', numberToken: 10, hasRobber: false, harbors: [{ type: 'WHEAT', toTileId: 'hex_fi3_33' }] },

  // Row 6
  { id: 'hex_fi3_29', coord: { q: -3, r: 2, s: 1 }, type: 'BRICK', numberToken: 6, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_fi3_23' }] },
  { id: 'hex_fi3_30', coord: { q: -2, r: 2, s: 0 }, type: 'WOOD', numberToken: 5, hasRobber: false, harbors: [{ type: 'SHEEP', toTileId: 'hex_fi3_35' }] },
  { id: 'hex_fi3_31', coord: { q: -1, r: 2, s: -1 }, type: 'SHEEP', numberToken: 9, hasRobber: false },
  { id: 'hex_fi3_32', coord: { q: 0, r: 2, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_fi3_26' }] },
  { id: 'hex_fi3_33', coord: { q: 1, r: 2, s: -3 }, type: 'ORE', numberToken: 2, hasRobber: false },

  // Row 7
  { id: 'hex_fi3_34', coord: { q: -3, r: 3, s: 0 }, type: 'WHEAT', numberToken: 5, hasRobber: false },
  { id: 'hex_fi3_35', coord: { q: -2, r: 3, s: -1 }, type: 'SHEEP', numberToken: 12, hasRobber: true },
  { id: 'hex_fi3_36', coord: { q: -1, r: 3, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi3_37', coord: { q: 0, r: 3, s: -3 }, type: 'WATER', numberToken: null, hasRobber: false },
];

function getFourIslandsIslandId(q: number, r: number): number {
  if (r <= -1) {
    if (q <= 0) return 1;
    return 2;
  }
  if (r >= 1) {
    if (q <= 0) return 3;
    return 4;
  }
  return 5;
}

// 4. Four Islands - 4 Players (37 Tiles)
const rawSeafarers4PlayersFourIslands: HexTile[] = [
  // Row 1
  { id: 'hex_fi4_1', coord: { q: 0, r: -3, s: 3 }, type: 'SHEEP', numberToken: 8, hasRobber: false },
  { id: 'hex_fi4_2', coord: { q: 1, r: -3, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_3', coord: { q: 2, r: -3, s: 1 }, type: 'WOOD', numberToken: 9, hasRobber: false },
  { id: 'hex_fi4_4', coord: { q: 3, r: -3, s: 0 }, type: 'WOOD', numberToken: 11, hasRobber: false },

  // Row 2
  { id: 'hex_fi4_5', coord: { q: -1, r: -2, s: 3 }, type: 'BRICK', numberToken: 10, hasRobber: false, harbors: [{ type: 'WHEAT', toTileId: 'hex_fi4_10' }] },
  { id: 'hex_fi4_6', coord: { q: 0, r: -2, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_7', coord: { q: 1, r: -2, s: 1 }, type: 'ORE', numberToken: 3, hasRobber: false },
  { id: 'hex_fi4_8', coord: { q: 2, r: -2, s: 0 }, type: 'WHEAT', numberToken: 12, hasRobber: true },
  { id: 'hex_fi4_9', coord: { q: 3, r: -2, s: -1 }, type: 'SHEEP', numberToken: 5, hasRobber: false, harbors: [{ type: 'WOOD', toTileId: 'hex_fi4_15' }] },

  // Row 3
  { id: 'hex_fi4_10', coord: { q: -2, r: -1, s: 3 }, type: 'WHEAT', numberToken: 5, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_fi4_17' }] },
  { id: 'hex_fi4_11', coord: { q: -1, r: -1, s: 2 }, type: 'WOOD', numberToken: 3, hasRobber: false },
  { id: 'hex_fi4_12', coord: { q: 0, r: -1, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_13', coord: { q: 1, r: -1, s: 0 }, type: 'BRICK', numberToken: 5, hasRobber: false },
  { id: 'hex_fi4_14', coord: { q: 2, r: -1, s: -1 }, type: 'ORE', numberToken: 10, hasRobber: false },
  { id: 'hex_fi4_15', coord: { q: 3, r: -1, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },

  // Row 4
  { id: 'hex_fi4_16', coord: { q: -3, r: 0, s: 3 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_17', coord: { q: -2, r: 0, s: 2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_18', coord: { q: -1, r: 0, s: 1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_19', coord: { q: 0, r: 0, s: 0 }, type: 'WOOD', numberToken: 6, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_fi4_12' }] },
  { id: 'hex_fi4_20', coord: { q: 1, r: 0, s: -1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_21', coord: { q: 2, r: 0, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_22', coord: { q: 3, r: 0, s: -3 }, type: 'WATER', numberToken: null, hasRobber: false },

  // Row 5
  { id: 'hex_fi4_23', coord: { q: -3, r: 1, s: 2 }, type: 'BRICK', numberToken: 4, hasRobber: false, harbors: [{ type: 'BRICK', toTileId: 'hex_fi4_29' }] },
  { id: 'hex_fi4_24', coord: { q: -2, r: 1, s: 1 }, type: 'SHEEP', numberToken: 9, hasRobber: false },
  { id: 'hex_fi4_25', coord: { q: -1, r: 1, s: 0 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_26', coord: { q: 0, r: 1, s: -1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_27', coord: { q: 1, r: 1, s: -2 }, type: 'WOOD', numberToken: 9, hasRobber: false },
  { id: 'hex_fi4_28', coord: { q: 2, r: 1, s: -3 }, type: 'SHEEP', numberToken: 11, hasRobber: false, harbors: [{ type: 'ORE', toTileId: 'hex_fi4_21' }] },

  // Row 6
  { id: 'hex_fi4_29', coord: { q: -3, r: 2, s: 1 }, type: 'WHEAT', numberToken: 6, hasRobber: false },
  { id: 'hex_fi4_30', coord: { q: -2, r: 2, s: 0 }, type: 'ORE', numberToken: 4, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_fi4_25' }] },
  { id: 'hex_fi4_31', coord: { q: -1, r: 2, s: -1 }, type: 'BRICK', numberToken: 2, hasRobber: false },
  { id: 'hex_fi4_32', coord: { q: 0, r: 2, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_33', coord: { q: 1, r: 2, s: -3 }, type: 'ORE', numberToken: 8, hasRobber: false },

  // Row 7
  { id: 'hex_fi4_34', coord: { q: -3, r: 3, s: 0 }, type: 'SHEEP', numberToken: 10, hasRobber: false, harbors: [{ type: 'SHEEP', toTileId: 'hex_fi4_29' }] },
  { id: 'hex_fi4_35', coord: { q: -2, r: 3, s: -1 }, type: 'WHEAT', numberToken: 11, hasRobber: false },
  { id: 'hex_fi4_36', coord: { q: -1, r: 3, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_37', coord: { q: 0, r: 3, s: -3 }, type: 'WHEAT', numberToken: 4, hasRobber: false },
];

export const seafarers3PlayersFourIslands: HexTile[] = rawSeafarers3PlayersFourIslands.map(tile => {
  if (tile.type === 'WATER') return tile;
  return { ...tile, islandId: getFourIslandsIslandId(tile.coord.q, tile.coord.r) };
});

export const seafarers4PlayersFourIslands: HexTile[] = rawSeafarers4PlayersFourIslands.map(tile => {
  if (tile.type === 'WATER') return tile;
  return { ...tile, islandId: getFourIslandsIslandId(tile.coord.q, tile.coord.r) };
});

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
      originalNumberToken: idx % 4 === 0 ? 5 : idx % 4 === 1 ? 9 : idx % 4 === 2 ? 8 : 4,
      hasPirate: idx === 44 ? true : undefined // שודד הים ממוקם על צלע אריח 44
    })
  ),

  // אריחי יבשה גלויים
  createTileFromIndex(4, 'hex_fog3', { type: 'BRICK', numberToken: 6, harbors: [{ type: 'GENERIC', toTileId: 'hex_fog3_7' }] }),
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
    createTileFromIndex(idx, 'hex_fog3', { type: 'WATER' })
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
      originalNumberToken: idx % 4 === 0 ? 8 : idx % 4 === 1 ? 5 : idx % 4 === 2 ? 10 : 3,
      hasPirate: idx === 44 ? true : undefined // שודד הים ממוקם על צלע אריח 44 (בין 43 ל-44)
    })
  ),

  // אריחי יבשה גלויים
  createTileFromIndex(3, 'hex_fog4', { type: 'BRICK', numberToken: 4, harbors: [{ type: 'SHEEP', toTileId: 'hex_fog4_4' }] }),
  createTileFromIndex(4, 'hex_fog4', { type: 'WHEAT', numberToken: 10 }),
  createTileFromIndex(5, 'hex_fog4', { type: 'ORE', numberToken: 3, harbors: [{ type: 'WHEAT', toTileId: 'hex_fog4_4' }, { type: 'GENERIC', toTileId: 'hex_fog4_11' }] }),
  createTileFromIndex(9, 'hex_fog4', { type: 'SHEEP', numberToken: 9 }),
  createTileFromIndex(10, 'hex_fog4', { type: 'WOOD', numberToken: 6 }),
  createTileFromIndex(11, 'hex_fog4', { type: 'BRICK', numberToken: 12, hasRobber: true }), // השודד הרגיל ממוקם על אריח 11 (BRICK 12)
  createTileFromIndex(17, 'hex_fog4', { type: 'SHEEP', numberToken: 10 }),
  createTileFromIndex(18, 'hex_fog4', { type: 'ORE', numberToken: 8, harbors: [{ type: 'BRICK', toTileId: 'hex_fog4_11' }] }),
  createTileFromIndex(20, 'hex_fog4', { type: 'ORE', numberToken: 3, harbors: [{ type: 'WOOD', toTileId: 'hex_fog4_19' }] }),
  createTileFromIndex(25, 'hex_fog4', { type: 'WHEAT', numberToken: 11 }),
  createTileFromIndex(27, 'hex_fog4', { type: 'WHEAT', numberToken: 6, harbors: [{ type: 'ORE', toTileId: 'hex_fog4_34' }] }),
  createTileFromIndex(28, 'hex_fog4', { type: 'WOOD', numberToken: 4 }),
  createTileFromIndex(33, 'hex_fog4', { type: 'WOOD', numberToken: 5, harbors: [{ type: 'GENERIC', toTileId: 'hex_fog4_32' }] }),
  createTileFromIndex(34, 'hex_fog4', { type: 'BRICK', numberToken: 9 }),
  createTileFromIndex(35, 'hex_fog4', { type: 'SHEEP', numberToken: 8 }),
  createTileFromIndex(40, 'hex_fog4', { type: 'SHEEP', numberToken: 2, harbors: [{ type: 'GENERIC', toTileId: 'hex_fog4_34' }, { type: 'GENERIC', toTileId: 'hex_fog4_41' }] }),
  createTileFromIndex(41, 'hex_fog4', { type: 'WOOD', numberToken: 5 }),

  // אריחי ים (WATER)
  ...[2, 8, 12, 13, 15, 16, 19, 21, 24, 26, 29, 32, 36, 39, 42].map(idx => 
    createTileFromIndex(idx, 'hex_fog4', { type: 'WATER' })
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
