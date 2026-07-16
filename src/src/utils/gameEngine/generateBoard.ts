import { HexTile, HexCoordinate } from '../../types/hex.types';
import { GameConfig } from '../../config/standardVersion';
import { shuffleArray } from '../array/shuffleArray';
import { starterBoardPreset } from '../../config/starterBoardPreset';
import { seafarersNewShoresPreset } from '../../config/seafarersBoardPreset';

/**
 * פונקציית עזר לבדיקת שכנות קובייה (isNeighbor שבה המרחק הגיאומטרי בין המשושים שווה ל-1)
 */
function isNeighbor(c1: HexCoordinate, c2: HexCoordinate): boolean {
  return (Math.abs(c1.q - c2.q) + Math.abs(c1.r - c2.r) + Math.abs(c1.s - c2.s)) / 2 === 1;
}

/**
 * מייצרת לוח משחק מלא (מערך של אריחים משושים) על פי חוקי הקונפיגורציה שסופקה
 */
export function generateBoard(config: GameConfig, boardType?: 'RANDOM' | 'STARTER', expansion?: 'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS'): HexTile[] {
  if (boardType === 'STARTER') {
    if (expansion === 'SEAFARERS') {
      const tiles = JSON.parse(JSON.stringify(seafarersNewShoresPreset)) as HexTile[];
      tiles.sort((a, b) => a.coord.r - b.coord.r || a.coord.q - b.coord.q);
      const preset = seafarersNewShoresPreset;
      tiles.forEach((tile, index) => {
        tile.type = preset[index].type;
        tile.numberToken = preset[index].numberToken;
        tile.hasRobber = preset[index].hasRobber;
        tile.id = `hex_${index + 1}`;
      });
      return tiles;
    }

    const tiles = JSON.parse(JSON.stringify(starterBoardPreset)) as HexTile[];
    
    // Sort 19 tiles row-by-row by coordinates
    tiles.sort((a, b) => a.coord.r - b.coord.r || a.coord.q - b.coord.q);
    
    // Dress with resources, tokens, robber and id from the original starterBoardPreset order
    const preset = starterBoardPreset;
    tiles.forEach((tile, index) => {
      tile.type = preset[index].type;
      tile.numberToken = preset[index].numberToken;
      tile.hasRobber = preset[index].hasRobber;
      tile.id = `hex_${index + 1}`;
    });

    if (expansion === 'MERCHANTS_AND_BARBARIANS') {
      tiles.forEach(tile => {
        const { q, r, s } = tile.coord;
        if (q === 0 && r === 0 && s === 0) {
          tile.type = 'CASTLE';
          tile.numberToken = null;
        } else if (q === 0 && r === -2 && s === 2) {
          tile.type = 'QUARRY';
          tile.numberToken = null;
        } else if (q === 0 && r === 2 && s === -2) {
          tile.type = 'GLASSWORKS';
          tile.numberToken = null;
        }
      });
    }
    return tiles;
  }

  const tiles: HexTile[] = [];
  
  // 1. ערבוב המשאבים והמספרים כדי שהלוח יהיה אקראי בכל משחק
  const shuffledResources = shuffleArray(config.resourcePool);
  const shuffledTokens = shuffleArray(config.tokenPool);
  
  let resourceIndex = 0;
  let tokenIndex = 0;
  let hexIdCounter = 1;

  // Pools for Seafarers outer ring (radius 3)
  const seafarersOuterPool: HexTile['type'][] = expansion === 'SEAFARERS' ? shuffleArray([
    'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER', 'WATER',
    'GOLD_FIELD', 'GOLD_FIELD', 'WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE', 'GOLD_FIELD', 'ORE'
  ]) : [];
  const seafarersOuterTokens = expansion === 'SEAFARERS' ? shuffleArray([3, 4, 5, 6, 8, 9, 10, 11, 12]) : [];
  let outerResIndex = 0;
  let outerTokenIndex = 0;

  // 2. יצירת רשת הקואורדינטות הגיאומטרית לפי הרדיוס
  const radius = expansion === 'SEAFARERS' ? 3 : config.boardRadius;
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    
    for (let r = rMin; r <= rMax; r++) {
      const s = -q - r; // הכלל בקואורדינטות קוביה: q + r + s = 0
      const coord: HexCoordinate = { q, r, s };
      const isOuterRing = Math.abs(q) === 3 || Math.abs(r) === 3 || Math.abs(s) === 3;

      let type: HexTile['type'];
      let numberToken: number | null = null;
      let hasRobber = false;

      if (expansion === 'SEAFARERS' && isOuterRing) {
        type = seafarersOuterPool[outerResIndex++];
        if (type !== 'WATER') {
          numberToken = seafarersOuterTokens[outerTokenIndex++];
        }
      } else {
        // שליפת המשאב הבא מהמערך המעורבב
        type = shuffledResources[resourceIndex];
        resourceIndex++;

        // התאמת מספר אסימון: למדבר אין מספר, והשודד מתחיל עליו
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

  if (expansion === 'MERCHANTS_AND_BARBARIANS') {
    tiles.forEach(tile => {
      const { q, r, s } = tile.coord;
      if (q === 0 && r === 0 && s === 0) {
        tile.type = 'CASTLE';
        tile.numberToken = null;
      } else if (q === 0 && r === -2 && s === 2) {
        tile.type = 'QUARRY';
        tile.numberToken = null;
      } else if (q === 0 && r === 2 && s === -2) {
        tile.type = 'GLASSWORKS';
        tile.numberToken = null;
      }
    });
  }

  return tiles;
}
