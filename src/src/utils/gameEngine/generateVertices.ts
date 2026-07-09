import { HexTile } from '../../types/hex.types';
import { BoardVertex } from '../../types/boardElements.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';

const HEX_SIZE = 60; // גודל קבוע של רדיוס אריח בפיקסלים

/**
 * מייצרת מערך של צמתים ייחודיים מתוך רשימת האריחים הקיימת
 */
export function generateVertices(tiles: HexTile[]): BoardVertex[] {
  const vertexMap: Record<string, BoardVertex> = {};
  const touchCounts: Record<string, number> = {};

  tiles.forEach((tile) => {
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

      touchCounts[vertexId] = (touchCounts[vertexId] || 0) + 1;

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

  const allVertices = Object.values(vertexMap);

  // Filter coastal vertices (touching fewer than 3 tiles)
  const coastalVertices = allVertices.filter(v => touchCounts[v.id] < 3);

  // Sort coastal vertices by angle from board center (0,0)
  coastalVertices.sort((a, b) => {
    const [, aXStr, aYStr] = a.id.split('_');
    const aX = parseFloat(aXStr);
    const aY = parseFloat(aYStr);
    const aAngle = Math.atan2(aY, aX);

    const [, bXStr, bYStr] = b.id.split('_');
    const bX = parseFloat(bXStr);
    const bY = parseFloat(bYStr);
    const bAngle = Math.atan2(bY, bX);

    return aAngle - bAngle;
  });

  // Pick exactly 9 indices evenly spaced from coastalVertices
  const portIndices = [0, 3, 7, 10, 14, 17, 21, 24, 28];
  const portTypes: ('GENERIC' | 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[] = [
    'GENERIC',
    'WOOD',
    'GENERIC',
    'BRICK',
    'GENERIC',
    'SHEEP',
    'WHEAT',
    'GENERIC',
    'ORE'
  ];

  portIndices.forEach((coastalIndex, idx) => {
    if (coastalVertices[coastalIndex]) {
      const targetVertex = coastalVertices[coastalIndex];
      targetVertex.isHarbor = true;
      targetVertex.harborType = portTypes[idx];
    }
  });

  return allVertices;
}
