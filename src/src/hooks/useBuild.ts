import { BoardVertex, BoardEdge } from '../types/boardElements.types';

/**
 * Enforces standard Catan piece limits per player.
 * - Max 15 Roads
 * - Max 5 Settlements
 * - Max 4 Cities
 * - Max 15 Ships
 */
export function checkPieceLimit(
  playerId: string,
  type: 'ROAD' | 'SETTLEMENT' | 'CITY' | 'SHIP',
  vertices: BoardVertex[],
  edges: BoardEdge[]
): boolean {
  if (type === 'ROAD') {
    const roadsCount = edges.filter(e => e.playerId === playerId && e.hasRoad).length;
    return roadsCount < 15;
  }
  if (type === 'SETTLEMENT') {
    const settlementsCount = vertices.filter(v => v.playerId === playerId && v.structure === 'SETTLEMENT').length;
    return settlementsCount < 5;
  }
  if (type === 'CITY') {
    const citiesCount = vertices.filter(v => v.playerId === playerId && v.structure === 'CITY').length;
    return citiesCount < 4;
  }
  if (type === 'SHIP') {
    const shipsCount = edges.filter(e => e.shipPlayerId === playerId && e.hasShip).length;
    return shipsCount < 15;
  }
  return true;
}
