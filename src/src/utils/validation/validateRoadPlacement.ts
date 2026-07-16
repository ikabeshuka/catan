import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { getTileEdgeIds } from '../gameEngine/generateEdges';

/**
 * בודקת האם שחקן יכול לבנות כביש בנתיב מסוים על הלוח
 */
export function validateRoadPlacement(
  edgeId: string,
  playerId: string,
  vertices: BoardVertex[],
  edges: BoardEdge[],
  tiles?: HexTile[]
): boolean {
  // 1. בדיקה שהנתיב פנוי
  const targetEdge = edges.find(e => e.id === edgeId);
  if (!targetEdge || targetEdge.hasRoad) return false;

  // בדיקה שהצלע המבוקשת אינה גובלת בשני אריחי מים ('WATER') במקביל
  if (tiles) {
    const borderingTiles = tiles.filter(tile => getTileEdgeIds(tile).includes(edgeId));
    const waterBorderingTiles = borderingTiles.filter(tile => tile.type === 'WATER');
    if (waterBorderingTiles.length >= 2) {
      return false; // חסום לחלוטין בלב ים!
    }
  }

  // 2. חילוץ מזהי שני הצמתים המרכיבים את הקצוות של הכביש הזה
  const parts = edgeId.replace('e_v_', '').split('_v_');
  const v1Id = `v_${parts[0]}`;
  const v2Id = `v_${parts[1]}`;

  // 3. בדיקה א': האם יש לשחקן יישוב או עיר באחד משני הקצוות?
  const vertex1 = vertices.find(v => v.id === v1Id);
  const vertex2 = vertices.find(v => v.id === v2Id);

  if (
    (vertex1 && vertex1.playerId === playerId && vertex1.structure !== 'NONE') ||
    (vertex2 && vertex2.playerId === playerId && vertex2.structure !== 'NONE')
  ) {
    return true; // מחובר ישירות למבנה שלו
  }

  // 4. בדיקה ב': האם הכביש מחובר לכביש אחר של השחקן?
  // נמצא את כל הכבישים האחרים שנוגעים בצומת הראשון או השני
  const neighboringEdges = edges.filter(edge => {
    if (edge.id === edgeId) return false;
    const parts = edge.id.replace('e_v_', '').split('_v_');
    const edgeV1Id = `v_${parts[0]}`;
    const edgeV2Id = `v_${parts[1]}`;
    return edgeV1Id === v1Id || edgeV2Id === v1Id || edgeV1Id === v2Id || edgeV2Id === v2Id;
  });

  const hasConnectedRoad = neighboringEdges.some(
    edge => edge.hasRoad && edge.playerId === playerId
  );

  return hasConnectedRoad;
}
