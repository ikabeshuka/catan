import { getCachedEdgeGeometry, getCachedTileGeometry } from './boardRenderCache';

export const getEdgeVertices = (eId: string): [string, string] => {
  return getCachedEdgeGeometry(eId).vertexIds;
};

export const getTileVertexIds = (t: any): string[] => {
  return getCachedTileGeometry(t).vertexIds;
};
