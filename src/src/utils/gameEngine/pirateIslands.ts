import { BoardEdge, BoardVertex } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import {
  PIRATE_ISLANDS_FORTRESSES,
  PIRATE_ISLANDS_SETTLEMENT_TARGETS,
  PIRATE_ISLANDS_STARTS,
} from '../../config/scenarios/pirateIslands';
import { getTileEdgeIds } from './generateEdges';
import { getTileVertexIds } from '../hexMath/boardGeometryHelpers';
import { getVertexIslandIds } from './getVertexIslandIds';
import { getEdgeVertices } from '../hexMath/boardGeometryHelpers';

const numberedTile = (tiles: HexTile[], index: number) => tiles.find(tile => tile.id === `hex_pi_${index}`);

const sharedId = (collections: string[][]): string | undefined =>
  collections.reduce((shared, ids) => shared.filter(id => ids.includes(id))).at(0);

const playerForSlot = (slot: number, playerIds: string[]) => {
  // White is removed in the three-player game, while blue and orange stay.
  const index = playerIds.length === 3 && slot > 0 ? slot - 1 : slot;
  return playerIds[index];
};

export function applyPirateIslandsSetup(
  tiles: HexTile[],
  vertices: BoardVertex[],
  edges: BoardEdge[],
  playerIds: string[],
): { vertices: BoardVertex[]; edges: BoardEdge[] } {
  const vertexUpdates = new Map<string, Partial<BoardVertex>>();
  const edgeUpdates = new Map<string, Partial<BoardEdge>>();

  PIRATE_ISLANDS_STARTS.forEach(start => {
    const playerId = playerForSlot(start.playerIndex, playerIds);
    if (!playerId) return;
    const vertexId = sharedId(start.vertexTiles.map(index => getTileVertexIds(numberedTile(tiles, index)!)));
    const edgeId = sharedId(start.shipTiles.map(index => getTileEdgeIds(numberedTile(tiles, index)!)));
    if (vertexId) vertexUpdates.set(vertexId, { structure: 'SETTLEMENT', playerId });
    if (edgeId) edgeUpdates.set(edgeId, { hasShip: true, shipPlayerId: playerId, isWarship: false });
  });

  PIRATE_ISLANDS_FORTRESSES.forEach(fortress => {
    const playerId = playerForSlot(fortress.playerIndex, playerIds);
    if (!playerId) return;
    const tileVertexIds = fortress.tileIds.map(index => getTileVertexIds(numberedTile(tiles, index)!));
    const vertexId = !('vertexIndex' in fortress)
      ? sharedId(tileVertexIds)
      : tileVertexIds[0][fortress.vertexIndex];
    if (vertexId) vertexUpdates.set(vertexId, {
      pirateFortress: { color: fortress.color, playerId, remainingTokens: 3, conquered: false },
    });
  });

  PIRATE_ISLANDS_SETTLEMENT_TARGETS.forEach(target => {
    const playerId = playerForSlot(target.playerIndex, playerIds);
    if (!playerId) return;
    const vertexId = sharedId(target.tileIds.map(index => getTileVertexIds(numberedTile(tiles, index)!)));
    if (vertexId) vertexUpdates.set(vertexId, {
      ...(vertexUpdates.get(vertexId) || {}),
      pirateSettlementTarget: playerId,
    });
  });

  return {
    vertices: vertices.map(vertex => vertexUpdates.has(vertex.id) ? { ...vertex, ...vertexUpdates.get(vertex.id) } : vertex),
    edges: edges.map(edge => edgeUpdates.has(edge.id) ? { ...edge, ...edgeUpdates.get(edge.id) } : edge),
  };
}

export const countWarships = (edges: BoardEdge[], playerId: string) =>
  edges.filter(edge => edge.shipPlayerId === playerId && edge.hasShip && edge.isWarship).length;

const isShipEdge = (edge: BoardEdge, tiles: HexTile[]) => {
  const borderingTiles = tiles.filter(tile => getTileEdgeIds(tile).includes(edge.id));
  return borderingTiles.some(tile => ['WATER', 'SEA', 'FOG'].includes(tile.type)) ||
    (borderingTiles.length === 1 && !['WATER', 'SEA', 'FOG'].includes(borderingTiles[0].type));
};

const shortestDistance = (startId: string, destinationId: string, edges: BoardEdge[], tiles: HexTile[]) => {
  const graph = new Map<string, BoardEdge[]>();
  edges.filter(edge => isShipEdge(edge, tiles)).forEach(edge => getEdgeVertices(edge.id).forEach(vertexId =>
    graph.set(vertexId, [...(graph.get(vertexId) || []), edge])
  ));
  const queue: Array<{ vertexId: string; distance: number }> = [{ vertexId: startId, distance: 0 }];
  const seen = new Set([startId]);
  while (queue.length) {
    const { vertexId, distance } = queue.shift()!;
    if (vertexId === destinationId) return distance;
    (graph.get(vertexId) || []).forEach(edge => {
      const next = getEdgeVertices(edge.id).find(id => id !== vertexId);
      if (next && !seen.has(next)) { seen.add(next); queue.push({ vertexId: next, distance: distance + 1 }); }
    });
  }
  return Infinity;
};

/** The player's one allowed line, ordered from its eastern starting settlement. */
export const getPirateShippingLine = (tiles: HexTile[], vertices: BoardVertex[], edges: BoardEdge[], playerId: string): BoardEdge[] | null => {
  const ships = edges.filter(edge => edge.hasShip && edge.shipPlayerId === playerId);
  if (ships.length === 0) return [];
  const byVertex = new Map<string, BoardEdge[]>();
  ships.forEach(edge => getEdgeVertices(edge.id).forEach(vertexId => byVertex.set(vertexId, [...(byVertex.get(vertexId) || []), edge])));
  if ([...byVertex.values()].some(incident => incident.length > 2)) return null;
  const start = vertices.find(vertex => vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) &&
    getVertexIslandIds(vertex.id, tiles).includes(1) && (byVertex.get(vertex.id)?.length || 0) === 1);
  if (!start) return null;
  const path: BoardEdge[] = [];
  let previousEdgeId: string | undefined;
  let vertexId = start.id;
  while (true) {
    const next = (byVertex.get(vertexId) || []).find(edge => edge.id !== previousEdgeId);
    if (!next) break;
    path.push(next);
    previousEdgeId = next.id;
    vertexId = getEdgeVertices(next.id).find(id => id !== vertexId)!;
  }
  return path.length === ships.length ? path : null;
};

/** The completed line from the eastern settlement through the marked intersection to the fortress. */
export const getPirateShippingPath = (tiles: HexTile[], vertices: BoardVertex[], edges: BoardEdge[], playerId: string): BoardEdge[] | null => {
  const line = getPirateShippingLine(tiles, vertices, edges, playerId);
  const fortress = vertices.find(vertex => vertex.pirateFortress?.playerId === playerId);
  const target = vertices.find(vertex => vertex.pirateSettlementTarget === playerId);
  if (!line || !fortress || !target || line.length === 0) return null;
  const start = getEdgeVertices(line[0].id).find(vertexId => vertices.some(vertex => vertex.id === vertexId &&
    vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && getVertexIslandIds(vertex.id, tiles).includes(1)));
  if (!start) return null;
  let vertexId = start;
  const visitedVertices = new Set([start]);
  line.forEach(edge => { vertexId = getEdgeVertices(edge.id).find(id => id !== vertexId)!; visitedVertices.add(vertexId); });
  return vertexId === fortress.id && visitedVertices.has(target.id) ? line : null;
};

export const canExtendPirateShippingLine = (tiles: HexTile[], vertices: BoardVertex[], edges: BoardEdge[], playerId: string, nextEdge: BoardEdge): boolean => {
  if (getPirateShippingPath(tiles, vertices, edges, playerId)) return false;
  const ships = [...edges.filter(edge => edge.hasShip && edge.shipPlayerId === playerId), nextEdge];
  const degree = new Map<string, number>();
  ships.forEach(edge => getEdgeVertices(edge.id).forEach(vertexId => degree.set(vertexId, (degree.get(vertexId) || 0) + 1)));
  if ([...degree.values()].some(value => value > 2)) return false;
  const connected = new Set<string>();
  const pending = [ships[0]];
  while (pending.length) {
    const edge = pending.pop()!;
    if (connected.has(edge.id)) continue;
    connected.add(edge.id);
    const endpoints = new Set(getEdgeVertices(edge.id));
    ships.forEach(other => { if (!connected.has(other.id) && getEdgeVertices(other.id).some(vertexId => endpoints.has(vertexId))) pending.push(other); });
  }
  if (connected.size !== ships.length) return false;

  const line = getPirateShippingLine(tiles, vertices, [...edges.filter(edge => edge.id !== nextEdge.id), { ...nextEdge, hasShip: true, shipPlayerId: playerId }], playerId);
  const fortress = vertices.find(vertex => vertex.pirateFortress?.playerId === playerId);
  const target = vertices.find(vertex => vertex.pirateSettlementTarget === playerId);
  if (!line || !fortress || !target || line.length === 0) return false;
  const start = getEdgeVertices(line[0].id).find(vertexId => vertices.some(vertex => vertex.id === vertexId &&
    vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && getVertexIslandIds(vertex.id, tiles).includes(1)));
  if (!start) return false;
  let endpoint = start;
  const lineVertices = new Set([start]);
  line.forEach(edge => { endpoint = getEdgeVertices(edge.id).find(id => id !== endpoint)!; lineVertices.add(endpoint); });
  const required = shortestDistance(start, target.id, edges, tiles) + shortestDistance(target.id, fortress.id, edges, tiles);
  if (lineVertices.has(fortress.id)) return lineVertices.has(target.id) && line.length === required;
  const remaining = lineVertices.has(target.id)
    ? shortestDistance(endpoint, fortress.id, edges, tiles)
    : shortestDistance(endpoint, target.id, edges, tiles) + shortestDistance(target.id, fortress.id, edges, tiles);
  return Number.isFinite(required) && line.length + remaining === required;
};
