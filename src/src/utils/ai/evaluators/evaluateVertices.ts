import { HexTile } from '../../../types/hex.types';
import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { GamePhase } from '../../../context/GameContext';
import { validateSettlementPlacement } from '../../validation/validateSettlementPlacement';
import { cubeToPixel } from '../../hexMath/cubeToPixel';

const HEX_SIZE = 60;

// מיפוי של כמות נקודות ההסתברות לכל מספר (מ-2 עד 12)
const TOKEN_WEIGHTS: Record<number, number> = {
  2: 1, 12: 1,
  3: 2, 11: 2,
  4: 3, 10: 3,
  5: 4, 9: 4,
  6: 5, 8: 5
};

interface EvaluatedVertex {
  vertexId: string;
  score: number;
}

/**
 * סורקת את הלוח ומחזירה רשימה של כל הצמתים החוקיים לבנייה עבור הבוט,
 * כשהם ממוינים מהציון הגבוה ביותר (הכי משתלם) לנמוך ביותר.
 */
export function evaluateVertices(
  botId: string,
  gamePhase: GamePhase,
  tiles: HexTile[],
  vertices: BoardVertex[],
  edges: BoardEdge[],
  botDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_HARD',
  selectedScenario?: string,
  activeExpansion?: string
): EvaluatedVertex[] {
  const ratedVertices: EvaluatedVertex[] = [];

  // 1. סינון הצמתים - נבדוק רק צמתים שבהם הבוט באמת מורשה לבנות מבחינה חוקית
  const validVertices = vertices.filter(vertex => 
    validateSettlementPlacement(
      vertex.id,
      botId,
      gamePhase,
      vertices,
      edges,
      tiles,
      selectedScenario,
      activeExpansion
    )
  );

  // 2. חישוב ציון לכל צומת חוקי
  validVertices.forEach((vertex) => {
    let score = 0;
    const uniqueResourceTypes = new Set<string>();
    const numberTokens = new Set<number>(); // To track unique number tokens

    // נבדוק אילו אריחים משיקים לצומת הנוכחי
    tiles.forEach((tile) => {
      const center = cubeToPixel(tile.coord, HEX_SIZE);

      // נבדוק את 6 הקודקודים של האריח כדי לראות אם אחד מהם הוא הצומת שלנו
      for (let i = 0; i < 6; i++) {
        const angleRad = (Math.PI / 180) * (60 * i - 30);
        const x = center.x + HEX_SIZE * Math.cos(angleRad);
        const y = center.y + HEX_SIZE * Math.sin(angleRad);

        const roundedX = Math.round(x * 10) / 10;
        const roundedY = Math.round(y * 10) / 10;
        const checkId = `v_${roundedX}_${roundedY}`;

        // אם האריח הזה נוגע בצומת שלנו
        if (checkId === vertex.id) {
          // א) הוספת משקל המספר (הסתברות הפקה) לציון
          if (tile.numberToken !== null) {
            score += TOKEN_WEIGHTS[tile.numberToken] || 0;
            numberTokens.add(tile.numberToken); // Track unique number tokens
          }

          // ב) בונוס על גיוון משאבים (עדיף לבנות על צומת שמניב סוגים שונים של משאבים)
          if (tile.type !== 'DESERT') {
            uniqueResourceTypes.add(tile.type);
          }
        }
      }
    });

    // הוספת נקודה אחת לציון על כל סוג משאב ייחודי שהצומת הזה נוגע בו (גיוון)
    score += uniqueResourceTypes.size;

    // HARD/SUPER_HARD bot: Dice probability calculations for 5, 6, 8, 9, max yield, and number token diversity
    if (botDifficulty === 'HARD' || botDifficulty === 'SUPER_HARD') {
      let probabilityScore = 0;
      let targetNumbersCount = 0;
      
      tiles.forEach((tile) => {
        const center = cubeToPixel(tile.coord, HEX_SIZE);
        for (let i = 0; i < 6; i++) {
          const angleRad = (Math.PI / 180) * (60 * i - 30);
          const x = center.x + HEX_SIZE * Math.cos(angleRad);
          const y = center.y + HEX_SIZE * Math.sin(angleRad);
          const roundedX = Math.round(x * 10) / 10;
          const roundedY = Math.round(y * 10) / 10;
          const checkId = `v_${roundedX}_${roundedY}`;

          if (checkId === vertex.id && tile.numberToken !== null) {
            const num = tile.numberToken;
            if (num === 6 || num === 8) {
              probabilityScore += 5;
              targetNumbersCount++;
            } else if (num === 5 || num === 9) {
              probabilityScore += 4;
              targetNumbersCount++;
            } else if (num === 4 || num === 10) {
              probabilityScore += 3;
            } else if (num === 3 || num === 11) {
              probabilityScore += 2;
            } else if (num === 2 || num === 12) {
              probabilityScore += 1;
            }
          }
        }
      });

      // Extra bonus for maximum statistical yield, number diversity, and specific target numbers (6, 8, 5, 9)
      score += probabilityScore * 1.5;
      score += numberTokens.size * 2.0;
      score += targetNumbersCount * 1.0;
    }

    ratedVertices.push({
      vertexId: vertex.id,
      score
    });
  });

  // 3. מיון התוצאות מהציון הגבוה ביותר לנמוך ביותר
  return ratedVertices.sort((a, b) => b.score - a.score);
}
