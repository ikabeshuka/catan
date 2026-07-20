import { HexTile } from '../../types/hex.types';
import { BoardEdge } from '../../types/boardElements.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';
import { parseEdgeId } from '../hexMath/parseEdgeId';

const HEX_SIZE = 60;

export function getTileEdgeIds(tile: HexTile): string[] {
  const center = cubeToPixel(tile.coord, HEX_SIZE);
  const vertexIdsInHex: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    const x = center.x + HEX_SIZE * Math.cos(angleRad);
    const y = center.y + HEX_SIZE * Math.sin(angleRad);
    // שינוי לעיגול עשרוני אחיד ומסונכרן
    const roundedX = Math.round(x * 10) / 10;
    const roundedY = Math.round(y * 10) / 10;
    vertexIdsInHex.push(`v_${roundedX}_${roundedY}`);
  }
  const edgeIds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const v1 = vertexIdsInHex[i];
    const v2 = vertexIdsInHex[(i + 1) % 6];
    const sortedIds = [v1, v2].sort();
    edgeIds.push(`e_${sortedIds[0]}_${sortedIds[1]}`);
  }
  return edgeIds;
}

/**
 * מייצרת מערך של קצוות (נתיבי כביש) ייחודיים מתוך רשימת האריחים
 */
export function generateEdges(tiles: HexTile[], activeExpansion?: string): BoardEdge[] {
  const edgeMap: Record<string, BoardEdge> = {};

  tiles.forEach((tile) => {
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
  tiles.forEach((tile) => {
    const edgeIds = getTileEdgeIds(tile);
    edgeIds.forEach((edgeId) => {
      edgeCount[edgeId] = (edgeCount[edgeId] || 0) + 1;
    });
  });

  const isExternalEdge = (edgeId: string) => edgeCount[edgeId] === 1;

  if (activeExpansion === 'SEAFARERS') {
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

    tiles.forEach((tile) => {
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
            const toTile = tiles.find(t => t.id === h.toTileId);
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
      const tile = tiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
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
