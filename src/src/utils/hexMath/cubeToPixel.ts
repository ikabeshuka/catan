import { HexCoordinate } from '../../types/hex.types';

interface PixelCoordinate {
  x: number;
  y: number;
}

/**
 * מומרת קואורדינטות קוביה (q, r, s) למיקום פיקסלים (x, y) על המסך
 * מותאם למשושים עם קודקוד כלפי מעלה (Pointy-topped)
 */
export function cubeToPixel(coord: HexCoordinate, size: number): PixelCoordinate {
  const x = size * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r);
  const y = size * ((3 / 2) * coord.r);
  
  return { x, y };
}