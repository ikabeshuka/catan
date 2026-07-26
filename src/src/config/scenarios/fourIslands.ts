import { HexTile } from '../../types/hex.types';

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
  { id: 'hex_fi4_5', coord: { q: -1, r: -2, s: 3 }, type: 'BRICK', numberToken: 10, hasRobber: false, harbors: [{ type: 'WHEAT', edgeIndex: 3 }] },
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
  { id: 'hex_fi4_23', coord: { q: -3, r: 1, s: 2 }, type: 'BRICK', numberToken: 4, hasRobber: false, harbors: [{ type: 'BRICK', edgeIndex: 4 }] },
  { id: 'hex_fi4_24', coord: { q: -2, r: 1, s: 1 }, type: 'SHEEP', numberToken: 9, hasRobber: false },
  { id: 'hex_fi4_25', coord: { q: -1, r: 1, s: 0 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_26', coord: { q: 0, r: 1, s: -1 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_27', coord: { q: 1, r: 1, s: -2 }, type: 'WOOD', numberToken: 9, hasRobber: false },
  { id: 'hex_fi4_28', coord: { q: 2, r: 1, s: -3 }, type: 'SHEEP', numberToken: 11, hasRobber: false, harbors: [{ type: 'GENERIC', edgeIndex: 1 }] },

  // Row 6
  { id: 'hex_fi4_29', coord: { q: -3, r: 2, s: 1 }, type: 'WHEAT', numberToken: 6, hasRobber: false },
  { id: 'hex_fi4_30', coord: { q: -2, r: 2, s: 0 }, type: 'ORE', numberToken: 4, hasRobber: false, harbors: [{ type: 'GENERIC', toTileId: 'hex_fi4_25' }] },
  { id: 'hex_fi4_31', coord: { q: -1, r: 2, s: -1 }, type: 'BRICK', numberToken: 2, hasRobber: false },
  { id: 'hex_fi4_32', coord: { q: 0, r: 2, s: -2 }, type: 'WATER', numberToken: null, hasRobber: false },
  { id: 'hex_fi4_33', coord: { q: 1, r: 2, s: -3 }, type: 'ORE', numberToken: 8, hasRobber: false },

  // Row 7
  { id: 'hex_fi4_34', coord: { q: -3, r: 3, s: 0 }, type: 'SHEEP', numberToken: 10, hasRobber: false, harbors: [{ type: 'SHEEP', edgeIndex: 3 }] },
  { id: 'hex_fi4_35', coord: { q: -2, r: 3, s: -1 }, type: 'WHEAT', numberToken: 11, hasRobber: false },
  { id: 'hex_fi4_36', coord: { q: -1, r: 3, s: -2 }, type: 'WHEAT', numberToken: 4, hasRobber: false },
  { id: 'hex_fi4_37', coord: { q: 0, r: 3, s: -3 }, type: 'WATER', numberToken: null, hasRobber: false },
];

export const seafarers3PlayersFourIslands: HexTile[] = rawSeafarers3PlayersFourIslands.map(tile => {
  if (tile.type === 'WATER') return tile;
  return { ...tile, islandId: getFourIslandsIslandId(tile.coord.q, tile.coord.r) };
});

export const seafarers4PlayersFourIslands: HexTile[] = rawSeafarers4PlayersFourIslands.map(tile => {
  if (tile.type === 'WATER') return tile;
  return { ...tile, islandId: getFourIslandsIslandId(tile.coord.q, tile.coord.r) };
});
