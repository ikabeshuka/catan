import { parseVertexId } from './parseVertexId';
import { parseEdgeId } from './parseEdgeId';
import { cubeToPixel } from './cubeToPixel';

export const HEX_SIZE_2D = 60; // Base size for 2D calculations, remains consistent
export const HEX_HEIGHT_3D = 3.0; // Visual height for 3D hexes
export const SCALE_3D = (HEX_HEIGHT_3D / 2) / HEX_SIZE_2D; // Scaling factor from 2D pixel to 3D unit
export const COORDINATE_SCALE_3D = 0.05;

export function getProbabilityDots3D(num: number): string {
  const dotsMap: Record<number, string> = {
    2: '.', 12: '.',
    3: '..', 11: '..',
    4: '...', 10: '...',
    5: '....', 9: '....',
    6: '.....', 8: '.....'
  };
  return dotsMap[num] || '';
}

export const getTokenZ = (type: string, is3DMode: boolean) => {
  if (!is3DMode) return 0.76; // Flat on the surface
  switch (type) {
    case 'ORE': return 3.12;    // מעט מעל פסגת ההר שגובהה ~3.06
    case 'BRICK': return 0.32;  // גובה בטוח מעל קרקעית המכתש שנחפרת ל-0.25
    case 'SHEEP': return 0.95;  // מעט מעל הגבעה העדינה של המרעה
    case 'WHEAT': return 0.87;  // מעל תלמי החיטה
    case 'WOOD': return 0.85;   // מעל פני שטח היער
    default: return 0.80;       // גובה ברירת מחדל לאריחים שטוחים
  }
};

export const getTile3DCoords = (coord: { q: number, r: number, s: number }) => {
  const center2D = cubeToPixel(coord, HEX_SIZE_2D);
  return {
    tileX: center2D.x * COORDINATE_SCALE_3D,
    tileY: center2D.y * -COORDINATE_SCALE_3D,
  };
};

export const getVertex3DCoords = (id: string) => {
  const { x, y } = parseVertexId(id);
  return {
    vx: x * COORDINATE_SCALE_3D,
    vy: y * -COORDINATE_SCALE_3D,
  };
};

export const getEdge3DCoords = (id: string) => {
  const { x1, y1, x2, y2 } = parseEdgeId(id);
  const mx = ((x1 + x2) / 2) * COORDINATE_SCALE_3D;
  const my = ((y1 + y2) / 2) * -COORDINATE_SCALE_3D;

  const dx = (x2 - x1) * COORDINATE_SCALE_3D;
  const dy = (y2 - y1) * -COORDINATE_SCALE_3D;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return { mx, my, length, angle };
};
