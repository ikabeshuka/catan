import { getEdgeVertices, getTileVertexIds } from '../hexMath/boardGeometryHelpers';

export interface RevealFogParams {
  edgeId: string;
  tiles: any[];
  players: any[];
  currentPlayerIndex: number;
  setTiles: (update: any[] | ((prev: any[]) => any[])) => void;
  setPlayers: (update: any[] | ((prev: any[]) => any[])) => void;
  addLog: (log: string) => void;
  setGoldSelectionQueue: (update: any[] | ((prev: any[]) => any[])) => void;
  setTurnSubPhase: (subPhase: any) => void;
}

export const revealFogAdjacentToEdge = ({
  edgeId,
  tiles,
  players,
  currentPlayerIndex,
  setTiles,
  setPlayers,
  addLog,
  setGoldSelectionQueue,
  setTurnSubPhase,
}: RevealFogParams) => {
  if (!tiles || tiles.length === 0) return;
  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) return;

  const [v1, v2] = getEdgeVertices(edgeId);

  setTiles(prevTiles => prevTiles.map(tile => {
    // Find and reveal adjacent fog tiles by checking if they share either vertex of the placed edge
    if (tile.type === 'FOG') {
      const tileVertices = getTileVertexIds(tile);
      if (tileVertices.includes(v1) || tileVertices.includes(v2)) {
        const originalType = tile.originalType || 'WOOD';
        const originalNumberToken = tile.originalNumberToken !== undefined ? tile.originalNumberToken : null;

        const resourceHebrewNames: Record<string, string> = {
          WOOD: 'עץ',
          BRICK: 'לבנים',
          SHEEP: 'כבשים',
          WHEAT: 'חיטה',
          ORE: 'ברזל',
          DESERT: 'מדבר',
          GOLD_FIELD: 'אדמת זהב',
          WATER: 'מים',
          SEA: 'ים',
        };
        const resourceName = resourceHebrewNames[originalType] || originalType;
        addLog(`שחקן ${currentPlayer.name} גילה אריח ערפל! נחשף אריח מסוג ${resourceName}${originalNumberToken ? ` עם המספר ${originalNumberToken}` : ''}.`);

        // Discovery Bonus:
        if (originalType !== 'WATER' && originalType !== 'DESERT') {
          if (originalType === 'GOLD_FIELD') {
            setGoldSelectionQueue(prevQueue => [
              ...prevQueue,
              {
                playerId: currentPlayer.id,
                amount: 1,
                tileId: tile.id
              }
            ]);
            setTurnSubPhase('GOLD_RESOURCE_SELECTION');
            addLog(`🪙 אדמת זהב נחשפה! השחקן ${currentPlayer.name} מקבל משאב 1 לבחירה.`);
          } else {
            setPlayers(prevPlayers => prevPlayers.map(p => {
              if (p.id === currentPlayer.id) {
                return {
                  ...p,
                  resources: {
                    ...p.resources,
                    [originalType]: (p.resources[originalType as keyof typeof p.resources] || 0) + 1
                  }
                };
              }
              return p;
            }));
            addLog(`בונוס גילוי! שחקן ${currentPlayer.name} קיבל קלף משאב 1 מסוג ${resourceName}.`);
          }
        }

        return {
          ...tile,
          type: originalType,
          numberToken: originalNumberToken,
          revealed: true
        };
      }
    }
    return tile;
  }));
};
