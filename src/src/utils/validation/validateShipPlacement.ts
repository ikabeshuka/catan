import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { getTileEdgeIds } from '../gameEngine/generateEdges';

/**
 * בודקת האם שחקן יכול למקם ספינה על צלע מסוימת
 */
export function validateShipPlacement(
  edgeId: string,
  playerId: string,
  vertices: BoardVertex[],
  edges: BoardEdge[],
  tiles: HexTile[],
  gamePhase?: string
): boolean {
  // 1. בדיקה שהנתיב פנוי לחלוטין (אין עליו כביש קיים ואין עליו ספינה קיימת)
  const targetEdge = edges.find(e => e.id === edgeId);
  if (!targetEdge || targetEdge.hasRoad || targetEdge.hasShip) {
    return false;
  }

  // בדיקה של איסור הצבה על/צמוד לערפל בשלבי הקמה
  if (tiles && (gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2')) {
    const borderingTiles = tiles.filter(tile => getTileEdgeIds(tile).includes(edgeId));
    if (borderingTiles.some(tile => tile.type === 'FOG')) {
      return false;
    }
  }

  // 2. בדיקה שהצלע גובלת בלפחות אריח מים אחד ('WATER', 'SEA', 'FOG') (כדי למנוע בניית ספינות בלב יבשה)
  const borderingTiles = tiles.filter(tile => getTileEdgeIds(tile).includes(edgeId));
  const borderingWaterOrFogTiles = borderingTiles.filter(
    tile => tile.type === 'WATER' || tile.type === 'SEA' || tile.type === 'FOG'
  );
  if (borderingWaterOrFogTiles.length === 0) {
    return false;
  }

  // 3. חסימת בניית ספינה אם באריח המים המשיק לצלע יש שודד ים (hasPirate === true)
  const isBlockedByPirate = borderingWaterOrFogTiles.some(waterTile => waterTile.hasPirate);

  if (isBlockedByPirate) {
    return false;
  }

  // 4. בדיקה שהספינה מתחברת ישירות למבנה של השחקן (יישוב/עיר) השוכן בקו החוף, או לספינה קיימת של אותו שחקן
  // נחלץ את שני הצמתים המרכיבים את קצוות הצלע
  const parts = edgeId.replace('e_v_', '').split('_v_');
  const v1Id = `v_${parts[0]}`;
  const v2Id = `v_${parts[1]}`;

  const vertex1 = vertices.find(v => v.id === v1Id);
  const vertex2 = vertices.find(v => v.id === v2Id);

  const edgeTouchesVertex = (eId: string, vId: string) => {
    const parts = eId.replace('e_v_', '').split('_v_');
    return `v_${parts[0]}` === vId || `v_${parts[1]}` === vId;
  };

  const isVertexOnSeaCoast = (vId: string) => {
    const borderingTiles = tiles.filter(tile => {
      const edgeIds = getTileEdgeIds(tile);
      return edgeIds.some(eId => {
        const parts = eId.replace('e_v_', '').split('_v_');
        return `v_${parts[0]}` === vId || `v_${parts[1]}` === vId;
      });
    });
    return borderingTiles.some(tile => tile.type === 'WATER' || tile.type === 'SEA' || tile.type === 'FOG');
  };

  const touchesRoadAtV1 = edges.some(edge => edge.id !== edgeId && !!edge.hasRoad && edge.playerId === playerId && edgeTouchesVertex(edge.id, v1Id));
  const touchesShipAtV1 = edges.some(edge => edge.id !== edgeId && !!edge.hasShip && edge.shipPlayerId === playerId && edgeTouchesVertex(edge.id, v1Id));
  const hasOwnStructureAtV1 = !!(vertex1 && vertex1.playerId === playerId && vertex1.structure !== 'NONE');
  const v1IsBlocked = !!(vertex1 && vertex1.structure !== 'NONE' && vertex1.playerId !== playerId);

  const canConnectAtV1 = (hasOwnStructureAtV1 && isVertexOnSeaCoast(v1Id)) || (touchesShipAtV1 && !v1IsBlocked) || (touchesRoadAtV1 && hasOwnStructureAtV1 && isVertexOnSeaCoast(v1Id));

  const touchesRoadAtV2 = edges.some(edge => edge.id !== edgeId && !!edge.hasRoad && edge.playerId === playerId && edgeTouchesVertex(edge.id, v2Id));
  const touchesShipAtV2 = edges.some(edge => edge.id !== edgeId && !!edge.hasShip && edge.shipPlayerId === playerId && edgeTouchesVertex(edge.id, v2Id));
  const hasOwnStructureAtV2 = !!(vertex2 && vertex2.playerId === playerId && vertex2.structure !== 'NONE');
  const v2IsBlocked = !!(vertex2 && vertex2.structure !== 'NONE' && vertex2.playerId !== playerId);

  const canConnectAtV2 = (hasOwnStructureAtV2 && isVertexOnSeaCoast(v2Id)) || (touchesShipAtV2 && !v2IsBlocked) || (touchesRoadAtV2 && hasOwnStructureAtV2 && isVertexOnSeaCoast(v2Id));

  return canConnectAtV1 || canConnectAtV2;
}
