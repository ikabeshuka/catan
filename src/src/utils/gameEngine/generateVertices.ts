import { HexTile } from '../../types/hex.types';
import { BoardVertex } from '../../types/boardElements.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';
import { generateEdges } from './generateEdges';
import { parseEdgeId } from '../hexMath/parseEdgeId';

const HEX_SIZE = 60; // גודל קבוע של רדיוס אריח בפיקסלים

/**
 * מייצרת מערך של צמתים ייחודיים מתוך רשימת האריחים הקיימת
 */
export function generateVertices(tiles: HexTile[], activeExpansion?: string): BoardVertex[] {
  const vertexMap: Record<string, BoardVertex> = {};
  const boardTiles = tiles.filter(tile => !tile.isFrameSea);

  boardTiles.forEach((tile) => {
    // 1. מציאת מרכז האריח בפיקסלים
    const center = cubeToPixel(tile.coord, HEX_SIZE);

    // 2. חישוב 6 הקודקודים של המשושה (בסיבוב של 60 מעלות)
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i - 30); // פנייה כלפי מעלה (Pointy-topped)
      
      // מיקום הקודקוד הנוכחי
      const x = center.x + HEX_SIZE * Math.cos(angleRad);
      const y = center.y + HEX_SIZE * Math.sin(angleRad);

      // יצירת מזהה ייחודי מבוסס מיקום פיזי (מעוגל כדי למנוע כפילויות של שברים)
      const roundedX = Math.round(x * 10) / 10;
      const roundedY = Math.round(y * 10) / 10;
      const vertexId = `v_${roundedX}_${roundedY}`;

      // אם הצומת עדיין לא קיים במפה - נוסיף אותו
      if (!vertexMap[vertexId]) {
        vertexMap[vertexId] = {
          id: vertexId,
          playerId: null,
          structure: 'NONE',
          isHarbor: false
        };
      }
    }
  });

  // החלת לוגיקת הנמלים מקצוות לקודקודים המחוברים אליהם
  const edges = generateEdges(boardTiles, activeExpansion);
  edges.forEach((edge) => {
    if (edge.isHarbor && edge.harborType) {
      const { x1, y1, x2, y2 } = parseEdgeId(edge.id);
      const v1Id = `v_${x1}_${y1}`;
      const v2Id = `v_${x2}_${y2}`;

      if (vertexMap[v1Id]) {
        vertexMap[v1Id].isHarbor = true;
        vertexMap[v1Id].harborType = edge.harborType as any;
      }
      if (vertexMap[v2Id]) {
        vertexMap[v2Id].isHarbor = true;
        vertexMap[v2Id].harborType = edge.harborType as any;
      }
    }
  });

  return Object.values(vertexMap);
}
