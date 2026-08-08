import { HexTile } from '../../types/hex.types';
import { BoardEdge } from '../../types/boardElements.types';
import { parseEdgeId } from '../hexMath/parseEdgeId';
import { getCachedTileGeometry } from '../hexMath/boardRenderCache';

export function getTileEdgeIds(tile: HexTile): string[] {
  return getCachedTileGeometry(tile).edgeIds;
}

/**
 * מייצרת מערך של קצוות (נתיבי כביש) ייחודיים מתוך רשימת האריחים
 */
export function generateEdges(tiles: HexTile[], activeExpansion?: string): BoardEdge[] {
  const edgeMap: Record<string, BoardEdge> = {};
  const boardTiles = tiles.filter(tile => !tile.isFrameSea);

  boardTiles.forEach((tile) => {
    const edgeIds = getTileEdgeIds(tile);
    edgeIds.forEach((edgeId) => {
      if (!edgeMap[edgeId]) {
        edgeMap[edgeId] = {
          id: edgeId,
          playerId: null,
          hasRoad: false
        };
      }
    });
  });

  // Count how many times each edge ID is shared in the game board to find external/coast edges
  const edgeCount: Record<string, number> = {};
  boardTiles.forEach((tile) => {
    const edgeIds = getTileEdgeIds(tile);
    edgeIds.forEach((edgeId) => {
      edgeCount[edgeId] = (edgeCount[edgeId] || 0) + 1;
    });
  });

  const isExternalEdge = (edgeId: string) => edgeCount[edgeId] === 1;

  boardTiles.forEach(tile => {
    if (!tile.lostTribeRewards) return;
    const edgeIds = getTileEdgeIds(tile);
    tile.lostTribeRewards.forEach(reward => {
      const edge = edgeMap[edgeIds[reward.edgeIndex]];
      if (!edge) return;
      edge.lostTribeReward = {
        id: reward.id,
        kind: reward.kind,
        harborType: reward.harborType,
      };
    });
  });

  if (activeExpansion === 'SEAFARERS' || activeExpansion === 'SEAFARERS_AND_CITIES_AND_KNIGHTS') {
    const findSharedEdge = (t1: HexTile, t2: HexTile): string | null => {
      if (!t1 || !t2) return null;
      const edges1 = getTileEdgeIds(t1);
      const edges2 = getTileEdgeIds(t2);
      
      const distSq = (x1: number, y1: number, x2: number, y2: number) => {
        return (x1 - x2) ** 2 + (y1 - y2) ** 2;
      };

      for (const e1Id of edges1) {
        const e1 = parseEdgeId(e1Id);
        for (const e2Id of edges2) {
          const e2 = parseEdgeId(e2Id);
          
          const matchDirect = 
            distSq(e1.x1, e1.y1, e2.x1, e2.y1) < 5.0 && 
            distSq(e1.x2, e1.y2, e2.x2, e2.y2) < 5.0;
            
          const matchReversed = 
            distSq(e1.x1, e1.y1, e2.x2, e2.y2) < 5.0 && 
            distSq(e1.x2, e1.y2, e2.x1, e2.y1) < 5.0;
            
          if (matchDirect || matchReversed) {
            return e1Id;
          }
        }
      }
      return null;
    };

    boardTiles.forEach((tile) => {
      if (tile.harbors) {
        tile.harbors.forEach((h: any) => {
          if (h.edgeIndex !== undefined) {
            const edgeIds = getTileEdgeIds(tile);
            const edgeId = edgeIds[h.edgeIndex];
            if (edgeId && edgeMap[edgeId]) {
              edgeMap[edgeId].isHarbor = true;
              edgeMap[edgeId].harborType = h.type;
              edgeMap[edgeId].harborAngle = undefined;
            }
          } else if (h.toTileId) {
            const toTile = boardTiles.find(t => t.id === h.toTileId);
            if (toTile) {
              const sharedEdge = findSharedEdge(tile, toTile);
              if (sharedEdge && edgeMap[sharedEdge]) {
                edgeMap[sharedEdge].isHarbor = true;
                edgeMap[sharedEdge].harborType = h.type;
                edgeMap[sharedEdge].harborAngle = undefined;
              }
            }
          }
        });
      }
    });
  } else {
    // Align 9 ports strictly to the external coast edges of the perimeter tiles
    const harborConfigs = [
      { coord: { q: 0, r: -2, s: 2 }, edgeIndex: 4, type: 'GENERIC' },
      { coord: { q: 1, r: -2, s: 1 }, edgeIndex: 5, type: 'WHEAT' },
      { coord: { q: -1, r: -1, s: 2 }, edgeIndex: 3, type: 'WOOD' },
      { coord: { q: 2, r: -1, s: -1 }, edgeIndex: 5, type: 'ORE' },
      { coord: { q: 2, r: 0, s: -2 }, edgeIndex: 0, type: 'GENERIC' },
      { coord: { q: -2, r: 1, s: 1 }, edgeIndex: 2, type: 'BRICK' },
      { coord: { q: 1, r: 1, s: -2 }, edgeIndex: 1, type: 'SHEEP' },
      { coord: { q: -2, r: 2, s: 0 }, edgeIndex: 2, type: 'GENERIC' },
      { coord: { q: -1, r: 2, s: -1 }, edgeIndex: 1, type: 'GENERIC' },
    ];

    harborConfigs.forEach(({ coord, edgeIndex, type }) => {
      const tile = boardTiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
      if (tile) {
        const edgeIds = getTileEdgeIds(tile);
        const edgeId = edgeIds[edgeIndex];
        if (isExternalEdge(edgeId)) {
          if (edgeMap[edgeId]) {
            edgeMap[edgeId].isHarbor = true;
            edgeMap[edgeId].harborType = type;
            edgeMap[edgeId].harborAngle = undefined; // Force dynamic calculation
          }
        } else {
          // Fallback: find any external edge on this tile to place harbor
          const firstExtEdge = edgeIds.find(isExternalEdge);
          if (firstExtEdge && edgeMap[firstExtEdge]) {
            edgeMap[firstExtEdge].isHarbor = true;
            edgeMap[firstExtEdge].harborType = type;
            edgeMap[firstExtEdge].harborAngle = undefined;
          }
        }
      }
    });
  }

  // Synchronize harbor data between geometrically identical/close edges
  const allEdges = Object.values(edgeMap);
  const distSq = (x1: number, y1: number, x2: number, y2: number) => {
    return (x1 - x2) ** 2 + (y1 - y2) ** 2;
  };
  
  allEdges.forEach((e1) => {
    if (e1.isHarbor) {
      const parsed1 = parseEdgeId(e1.id);
      allEdges.forEach((e2) => {
        if (!e2.isHarbor) {
          const parsed2 = parseEdgeId(e2.id);
          const matchDirect = 
            distSq(parsed1.x1, parsed1.y1, parsed2.x1, parsed2.y1) < 1.0 && 
            distSq(parsed1.x2, parsed1.y2, parsed2.x2, parsed2.y2) < 1.0;
            
          const matchReversed = 
            distSq(parsed1.x1, parsed1.y1, parsed2.x2, parsed2.y2) < 1.0 && 
            distSq(parsed1.x2, parsed1.y2, parsed2.x1, parsed2.y1) < 1.0;
            
          if (matchDirect || matchReversed) {
            e2.isHarbor = true;
            e2.harborType = e1.harborType;
            e2.harborAngle = e1.harborAngle;
          }
        }
      });
    }
  });

  return Object.values(edgeMap);
}
