import { HexTile } from '../../types/hex.types';
import { Player } from '../../types/player.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';

const HEX_SIZE = 60;

/**
 * מחלקת משאבי פתיחה לשחקן לפי האריחים המשיקים ליישוב השני שהוא בנה
 */
export function distributeInitialResources(
  vertexId: string,
  tiles: HexTile[],
  players: Player[],
  playerId: string
): Player[] {
  // חילוץ מיקום הפיקסלים של הצומת מה-ID
  const [, xStr, yStr] = vertexId.split('_');
  const vX = parseFloat(xStr);
  const vY = parseFloat(yStr);

  return players.map((player) => {
    if (player.id !== playerId) return player;

    // יצירת עותק של המשאבים הנוכחיים של השחקן
    const updatedResources = { ...player.resources };

    // סריקת האריחים כדי למצוא מי משיק לצומת
    tiles.forEach((tile) => {
      const center = cubeToPixel(tile.coord, HEX_SIZE);
      
      for (let i = 0; i < 6; i++) {
        const angleRad = (Math.PI / 180) * (60 * i - 30);
        const x = center.x + HEX_SIZE * Math.cos(angleRad);
        const y = center.y + HEX_SIZE * Math.sin(angleRad);
        
        const roundedX = Math.round(x * 10) / 10;
        const roundedY = Math.round(y * 10) / 10;

        // אם האריח משיק לצומת והוא אינו מדבר - השחקן מקבל משאב אחד ממנו
        if (roundedX === vX && roundedY === vY && tile.type !== 'DESERT') {
          updatedResources[tile.type] += 1;
        }
      }
    });

    return {
      ...player,
      resources: updatedResources,
    };
  });
}