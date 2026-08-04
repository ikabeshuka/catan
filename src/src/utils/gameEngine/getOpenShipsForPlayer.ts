import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { getTileEdgeIds } from './generateEdges';
import { getClosedLostTribeShipIds } from './lostTribeHelpers';

/**
 * מזהה ומחזירה את כל הספינות הפתוחות של שחקן מסוים, הניתנות להזזה.
 * ספינה מוגדרת כפתוחה אם לפחות אחד מקצוותיה (קודקודים) אינו מכיל מבנה (יישוב/עיר)
 * ודרגת הקודקוד ברשת הספינות של השחקן היא בדיוק 1.
 */
export function getOpenShipsForPlayer(
  playerId: string,
  edges: BoardEdge[],
  vertices: BoardVertex[],
  currentTurnBuiltShips: string[] = [],
  tiles: HexTile[] = []
): BoardEdge[] {
  // מסננים רק ספינות של השחקן הנוכחי שלא נבנו בתור הזה
  const playerShips = edges.filter(
    e => e.hasShip && e.shipPlayerId === playerId && !currentTurnBuiltShips.includes(e.id)
  );
  const closedLostTribeShips = getClosedLostTribeShipIds(playerId, vertices, edges, tiles);

  const openShips: BoardEdge[] = [];

  playerShips.forEach(ship => {
    if (closedLostTribeShips.has(ship.id)) return;
    // חילוץ שני הקודקודים המרכיבים את הצלע
    const parts = ship.id.replace('e_v_', '').split('_v_');
    const v1Id = `v_${parts[0]}`;
    const v2Id = `v_${parts[1]}`;

    const vertex1 = vertices.find(v => v.id === v1Id);
    const vertex2 = vertices.find(v => v.id === v2Id);

    const isEndpointOpen = (vId: string, vertex: BoardVertex | undefined) => {
      if (!vertex) return false;
      
      // אסור שיהיה מבנה כלשהו (של אף שחקן) בנוי על הקודקוד
      if (vertex.structure && vertex.structure !== 'NONE') {
        return false;
      }

      // ספירת מספר הספינות של השחקן שנוגעות בקודקוד זה
      const touchingShipsCount = playerShips.filter(s => {
        const sParts = s.id.replace('e_v_', '').split('_v_');
        const sv1 = `v_${sParts[0]}`;
        const sv2 = `v_${sParts[1]}`;
        return sv1 === vId || sv2 === vId;
      }).length;

      // דרגת הצומת חייבת להיות בדיוק 1
      return touchingShipsCount === 1;
    };

    const isV1Open = isEndpointOpen(v1Id, vertex1);
    const isV2Open = isEndpointOpen(v2Id, vertex2);

    if (isV1Open || isV2Open) {
      openShips.push(ship);
    }
  });

  // סינון ספינות הנמצאות על צלעות של אריח עם שודד ים
  if (tiles && tiles.length > 0) {
    const pirateTiles = tiles.filter(t => t.hasPirate);
    if (pirateTiles.length > 0) {
      const pirateEdgeIds = new Set<string>();
      pirateTiles.forEach(tile => {
        getTileEdgeIds(tile).forEach(id => pirateEdgeIds.add(id));
      });
      return openShips.filter(ship => !pirateEdgeIds.has(ship.id));
    }
  }

  return openShips;
}
