import type { BoardEdge } from '../../types/boardElements.types';
import type { HexTile } from '../../types/hex.types';
import { getTileEdgeIds } from './generateEdges';
import { getEdgeVertices } from '../hexMath/boardGeometryHelpers';

const caravanComponents = (edgeIds: string[], edges: BoardEdge[]): number => {
  const byVertex = new Map<string, string[]>();
  edges.filter(edge => edgeIds.includes(edge.id)).forEach(edge => getEdgeVertices(edge.id).forEach(vertexId => {
    byVertex.set(vertexId, [...(byVertex.get(vertexId) || []), edge.id]);
  }));
  const unseen = new Set(edgeIds);
  let result = 0;
  while (unseen.size) {
    result += 1;
    const [first] = unseen;
    const queue = [first];
    unseen.delete(first);
    while (queue.length) {
      const edge = edges.find(candidate => candidate.id === queue.shift());
      if (!edge) continue;
      getEdgeVertices(edge.id).forEach(vertexId => (byVertex.get(vertexId) || []).forEach(next => {
        if (unseen.delete(next)) queue.push(next);
      }));
    }
  }
  return result;
};

/** A camel extends either open end, or starts one of the three caravans at the oasis. */
export const getCaravanCamelCandidates = (tiles: HexTile[], edges: BoardEdge[], camelEdgeIds: string[]): string[] => {
  const occupied = new Set(camelEdgeIds);
  const degree = new Map<string, number>();
  edges.filter(edge => occupied.has(edge.id)).forEach(edge => getEdgeVertices(edge.id).forEach(vertexId =>
    degree.set(vertexId, (degree.get(vertexId) || 0) + 1)));
  const endpoints = new Set([...degree.entries()].filter(([, count]) => count === 1).map(([vertexId]) => vertexId));
  const extensions = edges.filter(edge => !occupied.has(edge.id) && getEdgeVertices(edge.id).some(vertexId => endpoints.has(vertexId))).map(edge => edge.id);
  const oasis = tiles.find(tile => tile.type === 'OASIS');
  const starts = oasis && caravanComponents(camelEdgeIds, edges) < 3
    ? getTileEdgeIds(oasis).filter(edgeId => !occupied.has(edgeId))
    : [];
  return [...new Set([...starts, ...extensions])];
};

export const caravanScoreByPlayer = (edges: BoardEdge[], vertices: Array<{ id: string; playerId: string | null; structure: string }>): Record<string, number> => {
  const camelDegree = new Map<string, number>();
  edges.filter(edge => edge.camelCount).forEach(edge => getEdgeVertices(edge.id).forEach(vertexId =>
    camelDegree.set(vertexId, (camelDegree.get(vertexId) || 0) + 1)));
  return vertices.reduce<Record<string, number>>((scores, vertex) => {
    if (vertex.playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure) && (camelDegree.get(vertex.id) || 0) >= 2) {
      scores[vertex.playerId] = (scores[vertex.playerId] || 0) + 1;
    }
    return scores;
  }, {});
};
