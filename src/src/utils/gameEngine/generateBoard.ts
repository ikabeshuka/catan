import { HexTile, HexCoordinate } from '../../types/hex.types';
import { GameConfig } from '../../config/standardVersion';
import { shuffleArray } from '../array/shuffleArray';

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
        numberToken = shuffledTokens[tokenIndex];
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

  return tiles;
}