import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { getTileEdgeIds } from '../gameEngine/generateEdges';

/**
 * בודקת האם שחקן יכול לבנות כביש בנתיב מסוים על הלוח
 */
export function validateRoadPlacement(
  edgeId: string,
  playerId: string,
  vertices: BoardVertex[],
  edges: BoardEdge[],
  tiles?: HexTile[]
): boolean {
  // 1. בדיקה שהנתיב פנוי
  const targetEdge = edges.find(e => e.id === edgeId);
  if (!targetEdge || targetEdge.hasRoad || targetEdge.hasShip) return false;

  // בדיקה שהצלע המבוקשת אינה גובלת בשני אריחי מים ('WATER') במקביל
  if (tiles) {
    const borderingTiles = tiles.filter(tile => getTileEdgeIds(tile).includes(edgeId));
    const waterBorderingTiles = borderingTiles.filter(tile => tile.type === 'WATER');
    if (waterBorderingTiles.length >= 2) {
      return false; // חסום לחלוטין בלב ים!
    }
  }

  // 2. חילוץ מזהי שני הצמתים המרכיבים את הקצוות של הכביש הזה
  const parts = edgeId.replace('e_v_', '').split('_v_');
  const v1Id = `v_${parts[0]}`;
  const v2Id = `v_${parts[1]}`;

  const vertex1 = vertices.find(v => v.id === v1Id);
  const vertex2 = vertices.find(v => v.id === v2Id);

  const edgeTouchesVertex = (eId: string, vId: string) => {
    const parts = eId.replace('e_v_', '').split('_v_');
    return `v_${parts[0]}` === vId || `v_${parts[1]}` === vId;
  };

  const touchesRoadAtV1 = edges.some(edge => edge.id !== edgeId && !!edge.hasRoad && edge.playerId === playerId && edgeTouchesVertex(edge.id, v1Id));
  const touchesShipAtV1 = edges.some(edge => edge.id !== edgeId && !!edge.hasShip && edge.shipPlayerId === playerId && edgeTouchesVertex(edge.id, v1Id));
  const hasOwnStructureAtV1 = !!(vertex1 && vertex1.playerId === playerId && vertex1.structure !== 'NONE');
  const v1IsBlocked = !!(vertex1 && vertex1.structure !== 'NONE' && vertex1.playerId !== playerId);

  const canConnectAtV1 = hasOwnStructureAtV1 || (touchesRoadAtV1 && !v1IsBlocked) || (touchesShipAtV1 && hasOwnStructureAtV1);

  const touchesRoadAtV2 = edges.some(edge => edge.id !== edgeId && !!edge.hasRoad && edge.playerId === playerId && edgeTouchesVertex(edge.id, v2Id));
  const touchesShipAtV2 = edges.some(edge => edge.id !== edgeId && !!edge.hasShip && edge.shipPlayerId === playerId && edgeTouchesVertex(edge.id, v2Id));
  const hasOwnStructureAtV2 = !!(vertex2 && vertex2.playerId === playerId && vertex2.structure !== 'NONE');
  const v2IsBlocked = !!(vertex2 && vertex2.structure !== 'NONE' && vertex2.playerId !== playerId);

  const canConnectAtV2 = hasOwnStructureAtV2 || (touchesRoadAtV2 && !v2IsBlocked) || (touchesShipAtV2 && hasOwnStructureAtV2);

  return canConnectAtV1 || canConnectAtV2;
}
