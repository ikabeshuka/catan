import { HexCoordinate } from '../../types/hex.types';

// הגדרת 6 הכיוונים האפשריים סביב משושה במרחב קוביה
const HEX_DIRECTIONS: HexCoordinate[] = [
  { q: 1, r: -1, s: 0 },  // צפון-מזרח
  { q: 1, r: 0, s: -1 },  // מזרח
  { q: 0, r: 1, s: -1 },  // דרום-מזרח
  { q: -1, r: 1, s: 0 },  // דרום-מערב
  { q: -1, r: 0, s: 1 },  // מערב
  { q: 0, r: -1, s: 1 }   // צפון-מערב
];

/**
 * מחזירה את הקואורדינטות של 6 האריחים השכנים של אריח נתון
 */
export function getHexNeighbors(coord: HexCoordinate): HexCoordinate[] {
  return HEX_DIRECTIONS.map(dir => ({
    q: coord.q + dir.q,
    r: coord.r + dir.r,
    s: coord.s + dir.s
  }));
}