import { BoardEdge, BoardVertex } from '../../types/boardElements.types';

/**
 * מפרק מזהה צלע (Edge ID) לשני מזהי הקודקודים המרכיבים אותה.
 * מזהה טיפוסי נראה כך: e_v_0_1_v_0_2
 */
export const getEdgeVertices = (edgeId: string): [string, string] => {
  const withoutPrefix = edgeId.replace('e_', '');
  const parts = withoutPrefix.split('_v_');
  const v1 = parts[0];
  const v2 = 'v_' + parts[1];
  return [v1, v2];
};

/**
 * מחשב את אורך הדרך הארוכה ביותר של שחקן (כבישים וספינות משולבים).
 * האלגוריתם משתמש בסריקת עומק (DFS) רקורסיבית מלאה עם Backtracking.
 * 
 * חוקים קריטיים:
 * 1. חסימת יריב (Rival Blockage): יישוב או עיר של שחקן יריב קוטעים את הרצף מיידית.
 * 2. חוק המעבר (Transition Rule): מעבר בין כביש לספינה (או להפך) מחייב יישוב/עיר של השחקן בנקודת החיבור.
 */
export const calculateLongestRoadForPlayer = (
  playerId: string,
  allEdges: BoardEdge[],
  allVertices: BoardVertex[]
): number => {
  // סינון הצלעות השייכות לשחקן (כבישים או ספינות)
  const playerEdges = allEdges.filter(
    e => (e.hasRoad && e.playerId === playerId) || (e.hasShip && e.shipPlayerId === playerId)
  );
  if (playerEdges.length === 0) return 0;

  // בניית גרף שכנויות (Adjacency List)
  const adj: Record<string, { edgeId: string; type: 'ROAD' | 'SHIP'; targetVertex: string }[]> = {};

  playerEdges.forEach(edge => {
    try {
      const [v1, v2] = getEdgeVertices(edge.id);
      if (v1 && v2) {
        const edgeType = (edge.hasShip && edge.shipPlayerId === playerId) ? 'SHIP' : 'ROAD';
        if (!adj[v1]) adj[v1] = [];
        if (!adj[v2]) adj[v2] = [];
        adj[v1].push({ edgeId: edge.id, type: edgeType, targetVertex: v2 });
        adj[v2].push({ edgeId: edge.id, type: edgeType, targetVertex: v1 });
      }
    } catch {
      // גיבוי בטוח למקרה של כשל בפרסור המזהה
    }
  });

  // בודק האם הצומת חסום על ידי מבנה של שחקן יריב
  const isVertexBroken = (vertexId: string) => {
    const vertex = allVertices.find(v => v.id === vertexId);
    if (!vertex) return false;
    return vertex.playerId !== null && vertex.playerId !== playerId && vertex.structure !== 'NONE';
  };

  // בודק האם יש לשחקן הנוכחי יישוב או עיר בצומת הנוכחי
  const hasOwnStructureAtVertex = (vertexId: string) => {
    const vertex = allVertices.find(v => v.id === vertexId);
    if (!vertex) return false;
    return vertex.playerId === playerId && (vertex.structure === 'SETTLEMENT' || vertex.structure === 'CITY');
  };

  let maxPathLength = 0;
  const visitedEdges = new Set<string>();

  const dfs = (vertex: string, currentLength: number, lastType: 'ROAD' | 'SHIP' | null) => {
    maxPathLength = Math.max(maxPathLength, currentLength);

    // אם הקודקוד הנוכחי חסום על ידי יישוב/עיר של יריב, אי אפשר להמשיך ממנו
    if (isVertexBroken(vertex)) return;

    const neighbors = adj[vertex] || [];
    for (const neighbor of neighbors) {
      if (!visitedEdges.has(neighbor.edgeId)) {
        // אכיפת חוק המעבר (Transition Rule) בין כביש לספינה
        if (lastType !== null && lastType !== neighbor.type) {
          if (!hasOwnStructureAtVertex(vertex)) {
            // אין לשחקן מבנה בצומת המשותף, המעבר חסום!
            continue;
          }
        }

        visitedEdges.add(neighbor.edgeId);
        dfs(neighbor.targetVertex, currentLength + 1, neighbor.type);
        visitedEdges.delete(neighbor.edgeId); // Backtracking
      }
    }
  };

  // איסוף כל נקודות המוצא האפשריות (כל קודקוד שמחובר לצלעות השחקן)
  const startVertices = new Set<string>();
  playerEdges.forEach(edge => {
    const [v1, v2] = getEdgeVertices(edge.id);
    if (v1) startVertices.add(v1);
    if (v2) startVertices.add(v2);
  });

  // הרצת DFS מכל קודקוד התחלה אפשרי כדי למצוא את המסלול המקסימלי
  startVertices.forEach(v => {
    dfs(v, 0, null);
  });

  return maxPathLength;
};
