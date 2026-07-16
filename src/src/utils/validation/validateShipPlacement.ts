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
  tiles: HexTile[]
): boolean {
  // 1. בדיקה שהנתיב פנוי לחלוטין (אין עליו כביש קיים ואין עליו ספינה קיימת)
  const targetEdge = edges.find(e => e.id === edgeId);
  if (!targetEdge || targetEdge.hasRoad || targetEdge.hasShip) {
    return false;
  }

  // 2. בדיקה שהצלע גובלת בלפחות אריח מים אחד ('WATER') (כדי למנוע בניית ספינות בלב יבשה)
  const borderingTiles = tiles.filter(tile => getTileEdgeIds(tile).includes(edgeId));
  const hasWater = borderingTiles.some(tile => tile.type === 'WATER');
  if (!hasWater) {
    return false;
  }

  // 3. בדיקה שהספינה מתחברת ישירות למבנה של השחקן (יישוב/עיר) השוכן בקו החוף, או לספינה קיימת של אותו שחקן
  // נחלץ את שני הצמתים המרכיבים את קצוות הצלע
  const parts = edgeId.replace('e_v_', '').split('_v_');
  const v1Id = `v_${parts[0]}`;
  const v2Id = `v_${parts[1]}`;

  const vertex1 = vertices.find(v => v.id === v1Id);
  const vertex2 = vertices.find(v => v.id === v2Id);

  // האם מחובר למבנה של השחקן (יישוב/עיר) בצומת של הצלע הנוכחית?
  const isConnectedToStructure =
    (vertex1 && vertex1.playerId === playerId && vertex1.structure !== 'NONE') ||
    (vertex2 && vertex2.playerId === playerId && vertex2.structure !== 'NONE');

  if (isConnectedToStructure) {
    return true;
  }

  // האם מחובר לספינה קיימת של אותו שחקן?
  // נמצא את כל הצלעות השכנות שנוגעות בצומת הראשון או השני של הצלע הנוכחית
  const neighboringEdges = edges.filter(edge => {
    if (edge.id === edgeId) return false;
    const parts = edge.id.replace('e_v_', '').split('_v_');
    const edgeV1Id = `v_${parts[0]}`;
    const edgeV2Id = `v_${parts[1]}`;
    return edgeV1Id === v1Id || edgeV2Id === v1Id || edgeV1Id === v2Id || edgeV2Id === v2Id;
  });

  const isConnectedToShip = neighboringEdges.some(
    edge => edge.hasShip && edge.shipPlayerId === playerId
  );

  return isConnectedToShip;
}
