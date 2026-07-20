import { HexTile } from '../types/hex.types';

function getNewShoresIslandId(q: number, r: number, is4Player: boolean = false): number {
  if (is4Player) {
    if (r === -3 && (q === -1 || q === 0)) return 8; // Top-middle
    if (r === -3 && q === 2) return 7; // Top-right (Gold Field 4)
    if (r === -2 && (q === 2 || q === 3)) return 6; // Right island
    if (r === -1 && q === 3) return 6; // Right island (Gold Field 10)
    if (r === 2 && q === 1) return 4; // Bottom island (Gold Field 5)
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
