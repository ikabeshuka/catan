import { HexTile } from '../../../types/hex.types';
import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { validateRoadPlacement } from '../../validation/validateRoadPlacement';
import { evaluateVertices } from './evaluateVertices';
import { GamePhase } from '../../../context/GameContext';

interface EvaluatedEdge {
  edgeId: string;
  score: number;
}

/**
 * סורקת את הלוח ומדרגת את כל נתיבי הכביש החוקיים עבור הבוט.
 * כביש יקבל ציון גבוה יותר ככל שהוא מוביל לצומת פנוי בעל ערך משאבים גבוה יותר.
 */
export function evaluateEdges(
  botId: string,
  gamePhase: GamePhase,
  tiles: HexTile[],
  vertices: BoardVertex[],
  edges: BoardEdge[],
  botDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_HARD' // Added bot difficulty parameter
): EvaluatedEdge[] {
  const ratedEdges: EvaluatedEdge[] = [];

  // 1. שליפת הציונים של כל הצמתים על הלוח כדי לדעת לאן שווה להתקדם
  const vertexScores = evaluateVertices(botId, gamePhase, tiles, vertices, edges, botDifficulty);
  
  // העברת הציונים למפה (Map) בשביל שליפה מהירה ב-O(1) לפי מזהה הצומת
  const vertexScoreMap = new Map<string, number>(
    vertexScores.map(v => [v.vertexId, v.score])
  );

  // 2. סינון נתיבי כביש חוקיים בלבד עבור הבוט הנוכחי
  const validEdges = edges.filter(edge => 
    validateRoadPlacement(edge.id, botId, vertices, edges)
  );

  // 3. חישוב הציון לכל כביש אפשרי
  validEdges.forEach((edge) => {
    let score = 1; // ציון בסיס לכביש חוקי

    // פירוק ה-ID של הכביש כדי למצוא את שני הצמתים שהוא מחבר ביניהם
    const parts = edge.id.replace('e_v_', '').split('_v_');
    const v1Id = `v_${parts[0]}`;
    const v2Id = `v_${parts[1]}`;

    // בדיקה לאן הכביש מוביל
    const v1Score = vertexScoreMap.get(v1Id) || 0;
    const v2Score = vertexScoreMap.get(v2Id) || 0;

    // הבוט מעניק לכביש בונוס השווה לצומת הטוב ביותר אליו הכביש יכול להגיע
    score += Math.max(v1Score, v2Score);

    // בונוס קטן נוסף אם הכביש מתחבר לצומת שבו כבר יש לבוט יישוב (הרחבת רשת קיימת)
    const vertex1 = vertices.find(v => v.id === v1Id);
    const vertex2 = vertices.find(v => v.id === v2Id);
    if ((vertex1 && vertex1.playerId === botId) || (vertex2 && vertex2.playerId === botId)) {
      score += 0.5;
    }

    ratedEdges.push({
      edgeId: edge.id,
      score
    });
  });

  // 4. מיון הכבישים מהציון הגבוה ביותר (הכי אסטרטגי) לנמוך ביותר
  return ratedEdges.sort((a, b) => b.score - a.score);
}