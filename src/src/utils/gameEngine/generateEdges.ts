import { HexTile } from '../../types/hex.types';
import { BoardEdge } from '../../types/boardElements.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';

const HEX_SIZE = 60;

/**
 * מייצרת מערך של קצוות (נתיבי כביש) ייחודיים מתוך רשימת האריחים
 */
export function generateEdges(tiles: HexTile[]): BoardEdge[] {
  const edgeMap: Record<string, BoardEdge> = {};

  tiles.forEach((tile) => {
    const center = cubeToPixel(tile.coord, HEX_SIZE);
    const vertexIdsInHex: string[] = [];

    // 1. ראשית, נאסוף את מזהי הצמתים של המשושה הנוכחי לפי הסדר
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i - 30);
      const x = center.x + HEX_SIZE * Math.cos(angleRad);
      const y = center.y + HEX_SIZE * Math.sin(angleRad);
      
      const roundedX = Math.round(x * 10) / 10;
      const roundedY = Math.round(y * 10) / 10;
      vertexIdsInHex.push(`v_${roundedX}_${roundedY}`);
    }

    // 2. כעת נחבר כל צומת לצומת הבא אחריו כדי ליצור את 6 הקצוות של המשושה
    for (let i = 0; i < 6; i++) {
      const v1 = vertexIdsInHex[i];
      const v2 = vertexIdsInHex[(i + 1) % 6]; // האיבר הבא (האחרון מתחבר לראשון)

      // מיון אלפביתי של המזהים כדי למנוע כפילויות כיווניות (למשל: v1_v2 זהה ל-v2_v1)
      const sortedIds = [v1, v2].sort();
      const edgeId = `e_${sortedIds[0]}_${sortedIds[1]}`;

      if (!edgeMap[edgeId]) {
        edgeMap[edgeId] = {
          id: edgeId,
          playerId: null,
          hasRoad: false
        };
      }
    }
  });

  return Object.values(edgeMap);
}