import { GeminiBoardSnapshot, LegalActions } from './geminiTypes';

export function serializeBoardState(
  gameState: any,
  boardState: any,
  playerState: any,
  currentPlayerId: string,
  legalActionsData: LegalActions
): GeminiBoardSnapshot {
  const players = playerState?.players || [];
  const currentPlayer = players.find((p: any) => p.id === currentPlayerId) || {
    id: currentPlayerId,
    name: 'Bot',
    color: 'red',
    victoryPoints: 0,
    resources: {},
  };

  const opponents = players
    .filter((p: any) => p.id !== currentPlayerId)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      victoryPoints: p.victoryPoints || 0,
      resourceCardCount: Object.values(p.resources || {}).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number,
      isLeading: (p.victoryPoints || 0) >= 7,
    }));

  const tiles = boardState?.tiles || [];
  const fogTiles = tiles.filter((t: any) => t.type === 'FOG' || t.isFog);

  return {
    gamePhase: gameState?.gamePhase || 'MAIN_GAME',
    turnNumber: gameState?.turnNumber || 1,
    currentPlayer: {
      id: currentPlayer.id,
      name: currentPlayer.name,
      color: currentPlayer.color,
      victoryPoints: currentPlayer.victoryPoints || 0,
      resources: currentPlayer.resources || {},
    },
    opponents,
    legalActions: legalActionsData,
    boardSummary: {
      fogTilesRemaining: fogTiles.length,
      hasPirateOnBoard: tiles.some((t: any) => t.hasPirate),
      unexploredFogEdges: legalActionsData.validShipEdges.slice(0, 5),
    },
  };
}