import type { BoardEdge } from '../../types/boardElements.types';
import type { HexTile } from '../../types/hex.types';
import { parseEdgeId } from '../hexMath/parseEdgeId';

/**
 * The seven printed bridge construction areas in the Rivers of Catan layout.
 * Coordinates are expressed in the board's canonical pixel space, so the
 * markers survive both 2D and 3D rendering and do not depend on tile ids.
 */
const BRIDGE_SITE_CENTERS = [
  { x: -78, y: -45 }, { x: 0, y: -45 }, { x: 78, y: -45 },
  { x: -104, y: 75 }, { x: -26, y: 75 }, { x: 52, y: 75 }, { x: 130, y: 75 },
];

const edgeCenter = (edge: BoardEdge) => {
  const parsed = parseEdgeId(edge.id);
  return { x: (parsed.x1 + parsed.x2) / 2, y: (parsed.y1 + parsed.y2) / 2 };
};

/** Adds the two river paths to a standard 19-hex board. */
export const markRiversOfCatanEdges = (edges: BoardEdge[]): BoardEdge[] => {
  const selectedIds = new Set<string>();
  BRIDGE_SITE_CENTERS.forEach(site => {
    const nearest = edges
      .filter(edge => !selectedIds.has(edge.id))
      .map(edge => {
        const center = edgeCenter(edge);
        return { edge, distance: (center.x - site.x) ** 2 + (center.y - site.y) ** 2 };
      })
      .sort((left, right) => left.distance - right.distance)[0];
    if (nearest) selectedIds.add(nearest.edge.id);
  });

  const crossingEndpoints = new Set<string>();
  edges.filter(edge => selectedIds.has(edge.id)).forEach(edge => {
    const parsed = parseEdgeId(edge.id);
    crossingEndpoints.add(`v_${parsed.x1}_${parsed.y1}`);
    crossingEndpoints.add(`v_${parsed.x2}_${parsed.y2}`);
  });

  return edges.map(edge => {
    if (selectedIds.has(edge.id)) return { ...edge, isRiverCrossing: true, isRiverBank: false };
    const parsed = parseEdgeId(edge.id);
    const touchesRiver = crossingEndpoints.has(`v_${parsed.x1}_${parsed.y1}`) || crossingEndpoints.has(`v_${parsed.x2}_${parsed.y2}`);
    return touchesRiver ? { ...edge, isRiverBank: true } : edge;
  });
};

export const isRiverSettlementVertex = (vertexId: string, edges: BoardEdge[]): boolean =>
  edges.some(edge => edge.isRiverCrossing && (() => {
    const parsed = parseEdgeId(edge.id);
    return vertexId === `v_${parsed.x1}_${parsed.y1}` || vertexId === `v_${parsed.x2}_${parsed.y2}`;
  })());

const RIVER_NORTH = [
  { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
];
const RIVER_SOUTH = [
  { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];
const SWAMPS = [{ q: -2, r: 0 }, { q: 1, r: 1 }];
const hasCoord = (tile: HexTile, coord: { q: number; r: number }) => tile.coord.q === coord.q && tile.coord.r === coord.r;

/** Applies the two river paths, two swamps, and no-desert rule to the 19-hex board. */
export const applyRiversOfCatanTiles = (tiles: HexTile[]): HexTile[] => {
  const swampIds = new Set(tiles.filter(tile => SWAMPS.some(coord => hasCoord(tile, coord))).map(tile => tile.id));
  const swampTokens = tiles.filter(tile => swampIds.has(tile.id)).map(tile => tile.numberToken).filter((token): token is number => typeof token === 'number');
  const desert = tiles.find(tile => tile.type === 'DESERT' && !swampIds.has(tile.id));
  const robberSwampId = tiles.find(tile => swampIds.has(tile.id))?.id;

  return tiles.map(tile => {
    const isSwamp = swampIds.has(tile.id);
    const north = RIVER_NORTH.some(coord => hasCoord(tile, coord));
    const south = RIVER_SOUTH.some(coord => hasCoord(tile, coord));
    if (isSwamp) return { ...tile, type: 'SWAMP', numberToken: null, hasRobber: tile.id === robberSwampId, scenarioMarker: { ...tile.scenarioMarker } };
    const riverId = north ? 'NORTH' as const : south ? 'SOUTH' as const : undefined;
    if (tile.id === desert?.id) return { ...tile, type: 'SHEEP', numberToken: swampTokens.shift() ?? 5, hasRobber: false, scenarioMarker: { ...tile.scenarioMarker, ...(riverId ? { riverId } : {}) } };
    return { ...tile, hasRobber: tile.hasRobber && tile.type !== 'DESERT', scenarioMarker: { ...tile.scenarioMarker, ...(riverId ? { riverId } : {}) } };
  });
};
