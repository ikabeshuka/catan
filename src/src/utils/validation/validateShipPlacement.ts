import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { getTileEdgeIds } from '../gameEngine/generateEdges';
import { checkPieceLimit } from '../../hooks/useBuild';
import { BoardRenderCache, getBoardRenderCacheForEdges, getCachedEdgeGeometry } from '../hexMath/boardRenderCache';

/**
 * בודקת האם שחקן יכול למקם ספינה על צלע מסוימת
 */
export function validateShipPlacement(
  edgeId: string,
  playerId: string,
  vertices: BoardVertex[],
  edges: BoardEdge[],
  tiles: HexTile[],
  gamePhase?: string,
  boardRenderCache?: BoardRenderCache
): boolean {
  boardRenderCache ||= getBoardRenderCacheForEdges(edges);
  // Check piece limit (max 15 ships)
  if (!checkPieceLimit(playerId, 'SHIP', vertices, edges)) {
    return false;
  }

  // 1. בדיקה שהנתיב פנוי לחלוטין (אין עליו כביש קיים ואין עליו ספינה קיימת)
  const targetEdge = boardRenderCache?.edgeById.get(edgeId)?.edge || edges.find(e => e.id === edgeId);
  if (!targetEdge || targetEdge.hasRoad || targetEdge.hasShip) {
    return false;
  }

  // בדיקה של איסור הצבה על/צמוד לערפל בשלבי הקמה
  if (tiles && (gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2')) {
    const borderingTiles = boardRenderCache?.edgeById.get(edgeId)?.borderingTiles
      || tiles.filter(tile => getTileEdgeIds(tile).includes(edgeId));
    if (borderingTiles.some(tile => tile.type === 'FOG')) {
      return false;
    }
  }

  // 2. Allow ships on coastal edges (Land-Sea) and aquatic edges (Sea-Sea or Sea-Frame).
  // Ensure ship placement is valid if the edge touches at least one Water/Sea/Fog tile OR if it lies on a coastal perimeter connected to the player's network.
  const borderingTiles = boardRenderCache?.edgeById.get(edgeId)?.borderingTiles
    || tiles.filter(tile => getTileEdgeIds(tile).includes(edgeId));
  const borderingWaterOrFogTiles = borderingTiles.filter(
    tile => tile.type === 'WATER' || tile.type === 'SEA' || tile.type === 'FOG'
  );
  const borderingLandTiles = borderingTiles.filter(
    tile => tile.type !== 'WATER' && tile.type !== 'SEA' && tile.type !== 'FOG'
  );

  const touchesWater = borderingWaterOrFogTiles.length >= 1;
  const isCoastline = borderingLandTiles.length >= 1 && borderingWaterOrFogTiles.length >= 1;
  const isLandFrame = borderingTiles.length === 1 && borderingLandTiles.length === 1; // Land-Frame perimeter boundary

  if (!touchesWater && !isCoastline && !isLandFrame) {
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

  const vertex1 = boardRenderCache?.vertexById.get(v1Id)?.vertex || vertices.find(v => v.id === v1Id);
  const vertex2 = boardRenderCache?.vertexById.get(v2Id)?.vertex || vertices.find(v => v.id === v2Id);
  const edgesAtVertex = (vertexId: string) => boardRenderCache?.edgesByVertexId.get(vertexId)
    || edges.filter(edge => getCachedEdgeGeometry(edge.id).vertexIds.includes(vertexId));
  const edgesAtV1 = edgesAtVertex(v1Id);
  const edgesAtV2 = edgesAtVertex(v2Id);

  const isVertexOnSeaCoast = (vId: string) => {
    const borderingTiles = boardRenderCache?.tilesByVertexId.get(vId)
      || tiles.filter(tile => getTileEdgeIds(tile).some(eId => getCachedEdgeGeometry(eId).vertexIds.includes(vId)));
    return borderingTiles.some(tile => tile.type === 'WATER' || tile.type === 'SEA' || tile.type === 'FOG');
  };

  const touchesRoadAtV1 = edgesAtV1.some(edge => edge.id !== edgeId && !!edge.hasRoad && edge.playerId === playerId);
  const touchesShipAtV1 = edgesAtV1.some(edge => edge.id !== edgeId && !!edge.hasShip && edge.shipPlayerId === playerId);
  const hasOwnStructureAtV1 = !!(vertex1 && vertex1.playerId === playerId && vertex1.structure !== 'NONE');
  const v1IsBlocked = !!(vertex1 && vertex1.structure !== 'NONE' && vertex1.playerId !== playerId);

  const canConnectAtV1 = (hasOwnStructureAtV1 && isVertexOnSeaCoast(v1Id)) || (touchesShipAtV1 && !v1IsBlocked) || (touchesRoadAtV1 && hasOwnStructureAtV1 && isVertexOnSeaCoast(v1Id));

  const touchesRoadAtV2 = edgesAtV2.some(edge => edge.id !== edgeId && !!edge.hasRoad && edge.playerId === playerId);
  const touchesShipAtV2 = edgesAtV2.some(edge => edge.id !== edgeId && !!edge.hasShip && edge.shipPlayerId === playerId);
  const hasOwnStructureAtV2 = !!(vertex2 && vertex2.playerId === playerId && vertex2.structure !== 'NONE');
  const v2IsBlocked = !!(vertex2 && vertex2.structure !== 'NONE' && vertex2.playerId !== playerId);

  const canConnectAtV2 = (hasOwnStructureAtV2 && isVertexOnSeaCoast(v2Id)) || (touchesShipAtV2 && !v2IsBlocked) || (touchesRoadAtV2 && hasOwnStructureAtV2 && isVertexOnSeaCoast(v2Id));

  return canConnectAtV1 || canConnectAtV2;
}
