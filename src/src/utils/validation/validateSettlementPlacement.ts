import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { GamePhase } from '../../context/GameContext';
import { HexTile } from '../../types/hex.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';

/**
 * בודקת האם שחקן יכול לבנות יישוב בצומת מסוים על הלוח
 */
export function validateSettlementPlacement(
  vertexId: string,
  playerId: string,
  gamePhase: GamePhase,
  vertices: BoardVertex[],
  edges: BoardEdge[],
  tiles?: HexTile[]
): boolean {
  // 1. בדיקה שהצומת ריק לחלוטין
  const targetVertex = vertices.find(v => v.id === vertexId);
  if (!targetVertex || targetVertex.structure !== 'NONE') return false;

  // הגבלה: לא ניתן לבנות יישוב על נמלים בשלב הפתיחה (בוטל בהתאם לחוקים הרשמיים)
  // if ((gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2') && targetVertex.isHarbor) {
  //   return false;
  // }

  // 2. חוק המרחק: מציאת הכבישים שיוצאים מהצומת הזה כדי לבדוק את הצמתים השכנים
  const connectedEdges = edges.filter(edge => {
    const parts = edge.id.replace('e_v_', '').split('_v_');
    const v1Id = `v_${parts[0]}`;
    const v2Id = `v_${parts[1]}`;
    return v1Id === vertexId || v2Id === vertexId;
  });

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

  // 4. חסימת יישוב בלב ים (לפחות אריח יבשה אחד משיק לצומת)
  if (tiles) {
    const [, xStr, yStr] = vertexId.split('_');
    const vX = parseFloat(xStr);
    const vY = parseFloat(yStr);

    const borderingTiles = tiles.filter((tile) => {
      const center = cubeToPixel(tile.coord, 60);
      for (let i = 0; i < 6; i++) {
        const angleRad = (Math.PI / 180) * (60 * i - 30);
        const x = center.x + 60 * Math.cos(angleRad);
        const y = center.y + 60 * Math.sin(angleRad);
        
        const roundedX = Math.round(x * 10) / 10;
        const roundedY = Math.round(y * 10) / 10;

        if (roundedX === vX && roundedY === vY) {
          return true;
        }
      }
      return false;
    });

    if (borderingTiles.length > 0 && borderingTiles.every(tile => tile.type === 'WATER')) {
      return false;
    }

    // Seafarers Setup Restriction: Setup settlements allowed ONLY on the main island (islandId === 1)
    if (gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2') {
      const touchesMainIsland = borderingTiles.some(tile => tile.islandId === 1);
      const touchesForeignIsland = borderingTiles.some(tile => tile.islandId !== undefined && tile.islandId > 1);
      if (touchesForeignIsland && !touchesMainIsland) {
        return false;
      }
    }
  }

  return true;
}
