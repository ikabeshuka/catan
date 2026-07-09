import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { GamePhase } from '../../context/GameContext';

/**
 * בודקת האם שחקן יכול לבנות יישוב בצומת מסוים על הלוח
 */
export function validateSettlementPlacement(
  vertexId: string,
  playerId: string,
  gamePhase: GamePhase,
  vertices: BoardVertex[],
  edges: BoardEdge[]
): boolean {
  // 1. בדיקה שהצומת ריק לחלוטין
  const targetVertex = vertices.find(v => v.id === vertexId);
  if (!targetVertex || targetVertex.structure !== 'NONE') return false;

  // הגבלה: לא ניתן לבנות יישוב על נמלים בשלב הפתיחה
  if ((gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2') && targetVertex.isHarbor) {
    return false;
  }

  // 2. חוק המרחק: מציאת הכבישים שיוצאים מהצומת הזה כדי לבדוק את הצמתים השכנים
  const connectedEdges = edges.filter(edge => edge.id.includes(vertexId));

  for (const edge of connectedEdges) {
    // פירוק ה-ID של הכביש כדי למצוא את שני הצמתים שהוא מחבר
    const parts = edge.id.replace('e_v_', '').split('_v_');
    const v1Id = `v_${parts[0]}`;
    const v2Id = `v_${parts[1]}`;
    
    // הצומת השכן הוא הצומת שאינו הצומת הנוכחי שלנו
    const adjacentVertexId = v1Id === vertexId ? v2Id : v1Id;
    const adjacentVertex = vertices.find(v => v.id === adjacentVertexId);

    // אם בצומת השכן בנוי יישוב או עיר - המהלך לא חוקי!
    if (adjacentVertex && adjacentVertex.structure !== 'NONE') {
      return false;
    }
  }

  // 3. חוק החיבור: במשחק הרגיל חייב להיות כביש מחובר של השחקן
  if (gamePhase === 'MAIN_GAME') {
    const hasConnectedRoad = connectedEdges.some(
      edge => edge.hasRoad && edge.playerId === playerId
    );
    if (!hasConnectedRoad) return false;
  }

  return true;
}