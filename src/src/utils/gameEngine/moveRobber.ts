import { HexTile } from '../../types/hex.types';

/**
 * מעבירה את השודד לאריח חדש ומנקה אותו מהאריח הקודם.
 * מחזירה מערך אריחים מעודכן.
 */
export function moveRobber(targetTileId: string, tiles: HexTile[]): HexTile[] {
  return tiles.map((tile) => {
    // אם זה האריח הנבחר - השודד עובר אליו
    if (tile.id === targetTileId) {
      return { ...tile, hasRobber: true };
    }
    // אם השודד היה על האריח הזה קודם - הוא מוסר ממנו
    if (tile.hasRobber) {
      return { ...tile, hasRobber: false };
    }
    // שאר האריחים נשארים ללא שינוי
    return tile;
  });
}