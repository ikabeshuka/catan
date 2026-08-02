import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { getTileEdgeIds } from '../gameEngine/generateEdges';
import { checkPieceLimit } from '../../hooks/useBuild';
import { BoardRenderCache, getBoardRenderCacheForEdges, getCachedEdgeGeometry } from '../hexMath/boardRenderCache';

/**
 * בודקת האם שחקן יכול לבנות כביש בנתיב מסוים על הלוח
 */
export function validateRoadPlacement(
  edgeId: string,
  playerId: string,
  vertices: BoardVertex[],
  edges: BoardEdge[],
  tiles?: HexTile[],
  gamePhase?: string,
  boardRenderCache?: BoardRenderCache
): boolean {
  boardRenderCache ||= getBoardRenderCacheForEdges(edges);
  // Check piece limit (max 15 roads)
  if (!checkPieceLimit(playerId, 'ROAD', vertices, edges)) {
    return false;
  }

  // 1. בדיקה שהנתיב פנוי
  const targetEdge = boardRenderCache?.edgeById.get(edgeId)?.edge || edges.find(e => e.id === edgeId);
  if (!targetEdge || targetEdge.hasRoad || targetEdge.hasShip) return false;

  const borderingTiles = boardRenderCache?.edgeById.get(edgeId)?.borderingTiles
    || tiles?.filter(tile => getTileEdgeIds(tile).includes(edgeId))
    || [];

  // בדיקה של איסור הצבה על/צמוד לערפל בשלבי הקמה
  if (tiles && (gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2')) {
    if (borderingTiles.some(tile => tile.type === 'FOG')) {
      return false;
    }
  }

  // Ensure roads can ONLY be placed on edges that border at least ONE Land tile (borderingLandTiles.length >= 1)
  // Explicitly reject road placement on edges with 0 Land tiles (such as Sea-Sea or Sea-Frame boundaries)
  if (tiles) {
    const borderingLandTiles = borderingTiles.filter(
      tile => tile.type !== 'WATER' && tile.type !== 'SEA' && tile.type !== 'FOG'
    );
    if (borderingLandTiles.length < 1) {
      return false;
    }
  }

  // 2. חילוץ מזהי שני הצמתים המרכיבים את הקצוות של הכביש הזה
  const parts = edgeId.replace('e_v_', '').split('_v_');
  const v1Id = `v_${parts[0]}`;
  const v2Id = `v_${parts[1]}`;

  const vertex1 = boardRenderCache?.vertexById.get(v1Id)?.vertex || vertices.find(v => v.id === v1Id);
  const vertex2 = boardRenderCache?.vertexById.get(v2Id)?.vertex || vertices.find(v => v.id === v2Id);
  const edgesAtVertex = (vertexId: string) => boardRenderCache?.edgesByVertexId.get(vertexId)
    || edges.filter(edge => getCachedEdgeGeometry(edge.id).vertexIds.includes(vertexId));
  const edgesAtV1 = edgesAtVertex(v1Id);
  const edgesAtV2 = edgesAtVertex(v2Id);

  const touchesRoadAtV1 = edgesAtV1.some(edge => edge.id !== edgeId && !!edge.hasRoad && edge.playerId === playerId);
  const touchesShipAtV1 = edgesAtV1.some(edge => edge.id !== edgeId && !!edge.hasShip && edge.shipPlayerId === playerId);
  const hasOwnStructureAtV1 = !!(vertex1 && vertex1.playerId === playerId && vertex1.structure !== 'NONE');
  const v1IsBlocked = !!(vertex1 && vertex1.structure !== 'NONE' && vertex1.playerId !== playerId);

  const canConnectAtV1 = hasOwnStructureAtV1 || (touchesRoadAtV1 && !v1IsBlocked) || (touchesShipAtV1 && hasOwnStructureAtV1);

  const touchesRoadAtV2 = edgesAtV2.some(edge => edge.id !== edgeId && !!edge.hasRoad && edge.playerId === playerId);
  const touchesShipAtV2 = edgesAtV2.some(edge => edge.id !== edgeId && !!edge.hasShip && edge.shipPlayerId === playerId);
  const hasOwnStructureAtV2 = !!(vertex2 && vertex2.playerId === playerId && vertex2.structure !== 'NONE');
  const v2IsBlocked = !!(vertex2 && vertex2.structure !== 'NONE' && vertex2.playerId !== playerId);

  const canConnectAtV2 = hasOwnStructureAtV2 || (touchesRoadAtV2 && !v2IsBlocked) || (touchesShipAtV2 && hasOwnStructureAtV2);

  return canConnectAtV1 || canConnectAtV2;
}
