import { BoardEdge, BoardVertex } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { cubeToPixel } from './cubeToPixel';
import { getHexPointsString } from './getHexPointsString';
import { parseEdgeId } from './parseEdgeId';
import { parseVertexId } from './parseVertexId';

export const BOARD_HEX_SIZE_2D = 60;
export const BOARD_SCALE_3D = 0.05;

const MAX_STATIC_CACHE_ENTRIES = 1024;

export interface CachedTileGeometry {
  center2D: { x: number; y: number };
  position3D: { x: number; y: number };
  points2D: string;
  vertexIds: string[];
  edgeIds: string[];
}

export interface CachedEdgeGeometry {
  vertexIds: [string, string];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  center2D: { x: number; y: number };
  length2D: number;
  angleDeg2D: number;
  center3D: { x: number; y: number };
  length3D: number;
  angleRad3D: number;
}

export interface CachedVertexGeometry {
  position2D: { x: number; y: number };
  position3D: { x: number; y: number };
}

export interface CachedTileRenderData extends CachedTileGeometry {
  tile: HexTile;
  type: HexTile['type'];
}

export interface CachedEdgeRenderData extends CachedEdgeGeometry {
  edge: BoardEdge;
  borderingTiles: HexTile[];
  hasLand: boolean;
  hasWater: boolean;
  isCoast: boolean;
  usesSeaSurface: boolean;
}

export interface CachedVertexRenderData extends CachedVertexGeometry {
  vertex: BoardVertex;
}

export interface BoardRenderCache {
  tiles: CachedTileRenderData[];
  edges: CachedEdgeRenderData[];
  vertices: CachedVertexRenderData[];
  tileById: Map<string, CachedTileRenderData>;
  edgeById: Map<string, CachedEdgeRenderData>;
  vertexById: Map<string, CachedVertexRenderData>;
  edgesByVertexId: Map<string, BoardEdge[]>;
  tilesByVertexId: Map<string, HexTile[]>;
}

const tileGeometryCache = new Map<string, CachedTileGeometry>();
const edgeGeometryCache = new Map<string, CachedEdgeGeometry>();
const vertexGeometryCache = new Map<string, CachedVertexGeometry>();
const renderCacheByEdges = new WeakMap<BoardEdge[], BoardRenderCache>();

const keepCacheBounded = <T,>(cache: Map<string, T>) => {
  if (cache.size >= MAX_STATIC_CACHE_ENTRIES) cache.clear();
};

export function getCachedTileGeometry(tile: HexTile): CachedTileGeometry {
  const key = `${tile.coord.q}_${tile.coord.r}_${tile.coord.s}`;
  const cached = tileGeometryCache.get(key);
  if (cached) return cached;

  const center2D = cubeToPixel(tile.coord, BOARD_HEX_SIZE_2D);
  const vertexIds: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    const x = center2D.x + BOARD_HEX_SIZE_2D * Math.cos(angleRad);
    const y = center2D.y + BOARD_HEX_SIZE_2D * Math.sin(angleRad);
    vertexIds.push(`v_${Math.round(x * 10) / 10}_${Math.round(y * 10) / 10}`);
  }

  const edgeIds = vertexIds.map((vertexId, index) => {
    const nextVertexId = vertexIds[(index + 1) % vertexIds.length];
    const sortedIds = [vertexId, nextVertexId].sort();
    return `e_${sortedIds[0]}_${sortedIds[1]}`;
  });

  const geometry: CachedTileGeometry = {
    center2D,
    position3D: {
      x: center2D.x * BOARD_SCALE_3D,
      y: center2D.y * -BOARD_SCALE_3D,
    },
    points2D: getHexPointsString(center2D.x, center2D.y, BOARD_HEX_SIZE_2D),
    vertexIds,
    edgeIds,
  };
  keepCacheBounded(tileGeometryCache);
  tileGeometryCache.set(key, geometry);
  return geometry;
}

export function getCachedEdgeGeometry(id: string): CachedEdgeGeometry {
  const cached = edgeGeometryCache.get(id);
  if (cached) return cached;

  const { x1, y1, x2, y2 } = parseEdgeId(id);
  const dx2D = x2 - x1;
  const dy2D = y2 - y1;
  const dx3D = dx2D * BOARD_SCALE_3D;
  const dy3D = dy2D * -BOARD_SCALE_3D;
  const geometry: CachedEdgeGeometry = {
    vertexIds: [`v_${x1}_${y1}`, `v_${x2}_${y2}`],
    x1,
    y1,
    x2,
    y2,
    center2D: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
    length2D: Math.hypot(dx2D, dy2D),
    angleDeg2D: (Math.atan2(dy2D, dx2D) * 180) / Math.PI,
    center3D: {
      x: ((x1 + x2) / 2) * BOARD_SCALE_3D,
      y: ((y1 + y2) / 2) * -BOARD_SCALE_3D,
    },
    length3D: Math.hypot(dx3D, dy3D),
    angleRad3D: Math.atan2(dy3D, dx3D),
  };
  keepCacheBounded(edgeGeometryCache);
  edgeGeometryCache.set(id, geometry);
  return geometry;
}

export function getCachedVertexGeometry(id: string): CachedVertexGeometry {
  const cached = vertexGeometryCache.get(id);
  if (cached) return cached;

  const position2D = parseVertexId(id);
  const geometry: CachedVertexGeometry = {
    position2D,
    position3D: {
      x: position2D.x * BOARD_SCALE_3D,
      y: position2D.y * -BOARD_SCALE_3D,
    },
  };
  keepCacheBounded(vertexGeometryCache);
  vertexGeometryCache.set(id, geometry);
  return geometry;
}

const isWaterTile = (tile: HexTile) => (
  tile.type === 'WATER' || tile.type === 'SEA' || tile.type === 'FOG'
);

export function createBoardRenderCache(
  tiles: HexTile[],
  vertices: BoardVertex[],
  edges: BoardEdge[],
): BoardRenderCache {
  const cachedTiles = tiles.map((tile) => ({
    tile,
    type: tile.type,
    ...getCachedTileGeometry(tile),
  }));
  const tileById = new Map(cachedTiles.map((entry) => [entry.tile.id, entry]));
  const tilesByVertexId = new Map<string, HexTile[]>();

  const borderingTilesByEdgeId = new Map<string, HexTile[]>();
  cachedTiles.forEach((entry) => {
    if (entry.tile.isFrameSea) return;
    entry.vertexIds.forEach((vertexId) => {
      const borderingTiles = tilesByVertexId.get(vertexId);
      if (borderingTiles) borderingTiles.push(entry.tile);
      else tilesByVertexId.set(vertexId, [entry.tile]);
    });
    entry.edgeIds.forEach((edgeId) => {
      const borderingTiles = borderingTilesByEdgeId.get(edgeId);
      if (borderingTiles) borderingTiles.push(entry.tile);
      else borderingTilesByEdgeId.set(edgeId, [entry.tile]);
    });
  });

  const cachedEdges = edges.map((edge) => {
    const borderingTiles = borderingTilesByEdgeId.get(edge.id) || [];
    const hasWater = borderingTiles.some(isWaterTile);
    const hasLand = borderingTiles.some((tile) => !isWaterTile(tile));
    return {
      edge,
      ...getCachedEdgeGeometry(edge.id),
      borderingTiles,
      hasLand,
      hasWater,
      isCoast: (hasLand && hasWater) || (borderingTiles.length === 1 && hasLand),
      usesSeaSurface: borderingTiles.length > 0 && borderingTiles.every(isWaterTile),
    };
  });
  const edgeById = new Map(cachedEdges.map((entry) => [entry.edge.id, entry]));
  const edgesByVertexId = new Map<string, BoardEdge[]>();
  cachedEdges.forEach((entry) => {
    entry.vertexIds.forEach((vertexId) => {
      const connectedEdges = edgesByVertexId.get(vertexId);
      if (connectedEdges) connectedEdges.push(entry.edge);
      else edgesByVertexId.set(vertexId, [entry.edge]);
    });
  });

  const cachedVertices = vertices.map((vertex) => ({
    vertex,
    ...getCachedVertexGeometry(vertex.id),
  }));
  const vertexById = new Map(cachedVertices.map((entry) => [entry.vertex.id, entry]));

  const renderCache: BoardRenderCache = {
    tiles: cachedTiles,
    edges: cachedEdges,
    vertices: cachedVertices,
    tileById,
    edgeById,
    vertexById,
    edgesByVertexId,
    tilesByVertexId,
  };
  renderCacheByEdges.set(edges, renderCache);
  return renderCache;
}

export function getBoardRenderCacheForEdges(edges: BoardEdge[]): BoardRenderCache | undefined {
  return renderCacheByEdges.get(edges);
}
