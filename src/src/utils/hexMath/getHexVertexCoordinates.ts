interface PixelCoordinate {
  x: number;
  y: number;
}

interface Vertex3DCoordinate {
  x: number;
  y: number;
  z: number;
}

const HEX_SIZE_2D = 60; // Base size for 2D calculations, remains consistent
const HEX_HEIGHT_3D = 3.0; // Visual height for 3D hexes
const SCALE_3D = (HEX_HEIGHT_3D / 2) / HEX_SIZE_2D; // Scaling factor from 2D pixel to 3D unit

/**
 * מחשבת את 3D קואורדינטות של קודקוד בהתבסס על המיקום הדו-מימדי שלו ואריחי המשושה הסמוכים.
 * המטרה היא למקם את הקודקודים בדיוק בפינות המשושים, בגובה מעט מעל פני האריח.
 */
export function getHexVertexCoordinates(vertex2D: PixelCoordinate, tiles: any[]): Vertex3DCoordinate {
  let minDistance = Infinity;
  let closestTile = null;
  let closestTileCenter2D: PixelCoordinate = { x: 0, y: 0 };

  const safeTiles = tiles || [];

  // מציאת האריח הקרוב ביותר לנקודת הקודקוד הדו-מימדית
  for (const tile of safeTiles) {
    if (!tile || !tile.coord) continue;
    const q = tile.coord.q ?? 0;
    const r = tile.coord.r ?? 0;
    const tileX2D = HEX_SIZE_2D * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const tileY2D = HEX_SIZE_2D * (1.5 * r);
    const vx = vertex2D?.x ?? 0;
    const vy = vertex2D?.y ?? 0;
    const dist = Math.sqrt((vx - tileX2D) ** 2 + (vy - tileY2D) ** 2);
    if (dist < minDistance) {
      minDistance = dist;
      closestTile = tile;
      closestTileCenter2D = { x: tileX2D, y: tileY2D };
    }
  }

  const defaultScale = SCALE_3D || 0.025;
  const defaultHeight = HEX_HEIGHT_3D || 3.0;

  if (!closestTile) {
    // אם לא נמצא אריח קרוב, נחזיר מיקום 3D סקיילד ישירות, עם גובה בסיסי
    const vx = vertex2D?.x ?? 0;
    const vy = vertex2D?.y ?? 0;
    return { x: vx * defaultScale, y: -vy * defaultScale, z: 0 };
  }

  // חישוב מיקום ה-3D של האריח הקרוב
  const cq = closestTile.coord?.q ?? 0;
  const cr = closestTile.coord?.r ?? 0;
  const tileX3D = defaultHeight * (Math.sqrt(3) / 2) * (cq + cr / 2); // Correctly use HEX_WIDTH_3D logic
  const tileY3D = -defaultHeight * 0.75 * cr;

  // התאמת מיקום ה-3D של הקודקוד ביחס למרכז האריח הקרוב
  const vx = vertex2D?.x ?? 0;
  const vy = vertex2D?.y ?? 0;
  const dx = vx - (closestTileCenter2D?.x ?? 0);
  const dy = vy - (closestTileCenter2D?.y ?? 0);

  const x3d = tileX3D + dx * defaultScale;
  const y3d = tileY3D - dy * defaultScale;

  // גובה ה-Z של הקודקוד צריך להיות מעט מעל פני השטח של האריחים
  const z3d = defaultHeight * 0.1;

  return {
    x: isNaN(x3d) ? 0 : x3d,
    y: isNaN(y3d) ? 0 : y3d,
    z: isNaN(z3d) ? 0.3 : z3d
  };
}
