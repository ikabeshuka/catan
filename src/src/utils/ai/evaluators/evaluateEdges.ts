import { HexTile } from '../../../types/hex.types';
import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { validateRoadPlacement } from '../../validation/validateRoadPlacement';
import { validateShipPlacement } from '../../validation/validateShipPlacement';
import { getTileEdgeIds } from '../../gameEngine/generateEdges';
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
  // Passing tiles and gamePhase to ensure water/sea boundaries are respected and roads are not placed on water edges
  const validEdges = edges.filter(edge => 
    validateRoadPlacement(edge.id, botId, vertices, edges, tiles, gamePhase)
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

/**
 * סורקת את הלוח ומדרגת את כל נתיבי הספינות החוקיים עבור הבוט.
 * ספינה תקבל בונוסים משמעותיים על קרבה לערפל ועל התפרסות לאיים משניים.
 */
export function evaluateShipEdges(
  botId: string,
  gamePhase: GamePhase,
  tiles: HexTile[],
  vertices: BoardVertex[],
  edges: BoardEdge[],
  botDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_HARD'
): EvaluatedEdge[] {
  const ratedEdges: EvaluatedEdge[] = [];

  // 1. שליפת הציונים של כל הצמתים על הלוח
  const vertexScores = evaluateVertices(botId, gamePhase, tiles, vertices, edges, botDifficulty);
  const vertexScoreMap = new Map<string, number>(
    vertexScores.map(v => [v.vertexId, v.score])
  );

  // 2. סינון נתיבי ספינה חוקיים בלבד עבור הבוט הנוכחי
  const validEdges = edges.filter(edge => 
    validateShipPlacement(edge.id, botId, vertices, edges, tiles, gamePhase)
  );

  // 3. חישוב הציון לכל ספינה אפשרית
  validEdges.forEach((edge) => {
    let score = 1; // ציון בסיס לספינה חוקית

    // פירוק ה-ID של הכביש/ספינה
    const parts = edge.id.replace('e_v_', '').split('_v_');
    const v1Id = `v_${parts[0]}`;
    const v2Id = `v_${parts[1]}`;

    // בדיקה לאן הספינה מובילה
    const v1Score = vertexScoreMap.get(v1Id) || 0;
    const v2Score = vertexScoreMap.get(v2Id) || 0;

    score += Math.max(v1Score, v2Score);

    // בונוס חיבור לרשת קיימת של השחקן (אם הצמד מחבר למבנה שלו או לספינה קיימת שלו)
    const vertex1 = vertices.find(v => v.id === v1Id);
    const vertex2 = vertices.find(v => v.id === v2Id);
    if ((vertex1 && vertex1.playerId === botId) || (vertex2 && vertex2.playerId === botId)) {
      score += 0.5;
    }

    // שליפת האריחים המשיקים לצלע הנוכחית
    const borderingTiles = tiles.filter(tile => getTileEdgeIds(tile).includes(edge.id));

    // בונוס גילוי ערפל (Fog Bonus): אם הצלע גובלת באריח FOG, הוסף +4.0
    const bordersFog = borderingTiles.some(tile => tile.type === 'FOG');
    if (bordersFog) {
      score += 4.0;
    }

    // בונוס התפשטות לאי משני (Island Expansion Bonus): אם הצלע מובילה או גובלת באריח עם islandId > 1, הוסף +3.0
    const bordersSecondaryIsland = borderingTiles.some(tile => tile.islandId !== undefined && tile.islandId > 1);
    if (bordersSecondaryIsland) {
      score += 3.0;
    }

    ratedEdges.push({
      edgeId: edge.id,
      score
    });
  });

  // 4. מיון הספינות מהציון הגבוה לנמוך ביותר
  return ratedEdges.sort((a, b) => b.score - a.score);
}
