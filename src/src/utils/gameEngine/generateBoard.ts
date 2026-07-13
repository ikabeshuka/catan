import { HexTile, HexCoordinate } from '../../types/hex.types';
import { GameConfig } from '../../config/standardVersion';
import { shuffleArray } from '../array/shuffleArray';

/**
 * פונקציית עזר לבדיקת שכנות קובייה (isNeighbor שבה המרחק הגיאומטרי בין המשושים שווה ל-1)
 */
function isNeighbor(c1: HexCoordinate, c2: HexCoordinate): boolean {
  return (Math.abs(c1.q - c2.q) + Math.abs(c1.r - c2.r) + Math.abs(c1.s - c2.s)) / 2 === 1;
}

/**
 * מייצרת לוח משחק מלא (מערך של אריחים משושים) על פי חוקי הקונפיגורציה שסופקה
 */
export function generateBoard(config: GameConfig): HexTile[] {
  const tiles: HexTile[] = [];
  
  // 1. ערבוב המשאבים והמספרים כדי שהלוח יהיה אקראי בכל משחק
  const shuffledResources = shuffleArray(config.resourcePool);
  const shuffledTokens = shuffleArray(config.tokenPool);
  
  let resourceIndex = 0;
  let tokenIndex = 0;
  let hexIdCounter = 1;

  // 2. יצירת רשת הקואורדינטות הגיאומטרית לפי הרדיוס (עבור רדיוס 2, הצירים נעים בין 2- ל-2)
  const radius = config.boardRadius;
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    
    for (let r = rMin; r <= rMax; r++) {
      const s = -q - r; // הכלל בקואורדינטות קוביה: q + r + s = 0
      const coord: HexCoordinate = { q, r, s };
      
      // שליפת המשאב הבא מהמערך המעורבב
      const type = shuffledResources[resourceIndex];
      resourceIndex++;

      // התאמת מספר אסימון: למדבר אין מספר, והשודד מתחיל עליו
      let numberToken: number | null = null;
      let hasRobber = false;

      if (type === 'DESERT') {
        hasRobber = true;
      } else {
        let currentToken = shuffledTokens[tokenIndex];
        if (currentToken === 6 || currentToken === 8) {
          const hasHighRiskNeighbor = tiles.some(t => 
            t.numberToken !== null && 
            (t.numberToken === 6 || t.numberToken === 8) && 
            isNeighbor(coord, t.coord)
          );
          if (hasHighRiskNeighbor) {
            let swapIndex = tokenIndex + 1;
            while (swapIndex < shuffledTokens.length && (shuffledTokens[swapIndex] === 6 || shuffledTokens[swapIndex] === 8)) {
              swapIndex++;
            }
            if (swapIndex < shuffledTokens.length) {
              shuffledTokens[tokenIndex] = shuffledTokens[swapIndex];
              shuffledTokens[swapIndex] = currentToken;
              currentToken = shuffledTokens[tokenIndex];
            }
          }
        }
        numberToken = currentToken;
        tokenIndex++;
      }

      // הוספת האריח המוכן למערך הלוח
      tiles.push({
        id: `hex_${hexIdCounter++}`,
        coord,
        type,
        numberToken,
        hasRobber
      });
    }
  }

  // 3. Post-processing loop: Resolve any adjacent 6/8 conflicts globally to guarantee a valid tournament board
  let hasConflict = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (hasConflict && attempts < maxAttempts) {
    hasConflict = false;
    attempts++;

    for (let i = 0; i < tiles.length; i++) {
      const tileA = tiles[i];
      if (tileA.type === 'DESERT' || tileA.numberToken === null) continue;

      const valA = tileA.numberToken;
      if (valA === 6 || valA === 8) {
        // Check if it has a neighbor with 6 or 8
        const hasConflictNeighbor = tiles.some(tileB => 
          tileB.id !== tileA.id &&
          tileB.type !== 'DESERT' &&
          (tileB.numberToken === 6 || tileB.numberToken === 8) &&
          isNeighbor(tileA.coord, tileB.coord)
        );

        if (hasConflictNeighbor) {
          // Find a valid distant swap candidate (not desert, not 6 or 8, and has no neighbors with 6 or 8)
          const candidate = tiles.find(tileC => {
            if (tileC.id === tileA.id) return false;
            if (tileC.type === 'DESERT' || tileC.numberToken === null) return false;
            if (tileC.numberToken === 6 || tileC.numberToken === 8) return false;

            // Must not have any neighbor with 6 or 8
            const hasNeighbor6or8 = tiles.some(n => 
              n.id !== tileC.id &&
              (n.numberToken === 6 || n.numberToken === 8) &&
              isNeighbor(tileC.coord, n.coord)
            );

            return !hasNeighbor6or8;
          });

          if (candidate) {
            // Swap tokens
            const temp = tileA.numberToken;
            tileA.numberToken = candidate.numberToken;
            candidate.numberToken = temp;
            hasConflict = true; // Something changed, re-run verification
            break; // Restart scan to ensure all constraints are met
          }
        }
      }
    }
  }

  return tiles;
}
