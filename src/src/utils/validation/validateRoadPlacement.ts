import { BoardVertex, BoardEdge } from '../../types/boardElements.types';

/**
 * בודקת האם שחקן יכול לבנות כביש בנתיב מסוים על הלוח
 */
export function validateRoadPlacement(
  edgeId: string,
  playerId: string,
  vertices: BoardVertex[],
  edges: BoardEdge[]
): boolean {
  // 1. בדיקה שהנתיב פנוי
  const targetEdge = edges.find(e => e.id === edgeId);
  if (!targetEdge || targetEdge.hasRoad) return false;

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
  const neighboringEdges = edges.filter(
    edge => edge.id !== edgeId && (edge.id.includes(v1Id) || edge.id.includes(v2Id))
  );

  const hasConnectedRoad = neighboringEdges.some(
    edge => edge.hasRoad && edge.playerId === playerId
  );

  return hasConnectedRoad;
}