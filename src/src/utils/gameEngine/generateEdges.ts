import { HexTile } from '../../types/hex.types';
import { BoardEdge } from '../../types/boardElements.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';

const HEX_SIZE = 60;

export function getTileEdgeIds(tile: HexTile): string[] {
  const center = cubeToPixel(tile.coord, HEX_SIZE);
  const vertexIdsInHex: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    const x = center.x + HEX_SIZE * Math.cos(angleRad);
    const y = center.y + HEX_SIZE * Math.sin(angleRad);
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

  // Align 9 ports strictly to the external coast edges of the perimeter tiles
  let harborConfigs = [
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

  if (activeExpansion === 'SEAFARERS') {
    harborConfigs = [
      { coord: { q: -3, r: 1, s: 2 }, edgeIndex: 4, type: 'GENERIC' },
      { coord: { q: -3, r: 2, s: 1 }, edgeIndex: 3, type: 'WHEAT' },
      { coord: { q: -2, r: 3, s: -1 }, edgeIndex: 3, type: 'WOOD' },
      { coord: { q: 0, r: 3, s: -3 }, edgeIndex: 0, type: 'SHEEP' },
      { coord: { q: 2, r: 1, s: -3 }, edgeIndex: 0, type: 'BRICK' },
      { coord: { q: 3, r: -1, s: -2 }, edgeIndex: 1, type: 'ORE' },
      { coord: { q: 3, r: -2, s: -1 }, edgeIndex: 2, type: 'GENERIC' },
      { coord: { q: 2, r: -3, s: 1 }, edgeIndex: 5, type: 'GENERIC' },
      { coord: { q: 0, r: -3, s: 3 }, edgeIndex: 5, type: 'GENERIC' },
    ];
  }

  harborConfigs.forEach(({ coord, edgeIndex, type }) => {
    // If Seafarers, we could have a random board where the specific target coordinate is WATER.
    // In that case, we can find a nearby non-water external edge, but for STARTER / typical RANDOM,
    // let's place it on the specified outer tile if it is land/gold, or fallback to any external edge on that tile.
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
    } else if (activeExpansion === 'SEAFARERS') {
      // If the specific coordinate wasn't found (e.g. custom/random board difference),
      // we can map to the closest existing external land/gold tile at radius 3
      const outerLandTiles = tiles.filter(t => (Math.abs(t.coord.q) === 3 || Math.abs(t.coord.r) === 3 || Math.abs(t.coord.s) === 3) && t.type !== 'WATER');
      if (outerLandTiles.length > 0) {
        // Pick one that doesn't have a harbor yet
        const freeTile = outerLandTiles.find(t => {
          const eIds = getTileEdgeIds(t);
          return !eIds.some(eid => edgeMap[eid]?.isHarbor);
        }) || outerLandTiles[0];
        const edgeIds = getTileEdgeIds(freeTile);
        const extEdge = edgeIds.find(isExternalEdge);
        if (extEdge && edgeMap[extEdge]) {
          edgeMap[extEdge].isHarbor = true;
          edgeMap[extEdge].harborType = type;
          edgeMap[extEdge].harborAngle = undefined;
        }
      }
    }
  });

  return Object.values(edgeMap);
}
