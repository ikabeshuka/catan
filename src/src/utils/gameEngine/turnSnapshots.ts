import { Player } from '../../types/player.types';
import { BoardVertex, BoardEdge } from '../../types/boardElements.types';

export interface TurnSnapshot {
  players: Player[];
  vertices: BoardVertex[];
  edges: BoardEdge[];
}

/**
 * Creates a deep copy of the current players and board elements for backing up the turn state.
 */
export const createSnapshot = (
  players: Player[],
  vertices: BoardVertex[],
  edges: BoardEdge[]
): TurnSnapshot => {
  return {
    players: JSON.parse(JSON.stringify(players)),
    vertices: JSON.parse(JSON.stringify(vertices)),
    edges: JSON.parse(JSON.stringify(edges)),
  };
};

/**
 * Restores the players and board elements from the given snapshot.
 * Preserves newly purchased development cards for the human player.
 */
export const restoreFromSnapshot = (
  snapshot: TurnSnapshot,
  currentPlayers: Player[],
  activePlayerId: string
): {
  restoredPlayers: Player[];
  restoredVertices: BoardVertex[];
  restoredEdges: BoardEdge[];
} => {
  const currentHuman = currentPlayers.find(p => p.id === activePlayerId);
  const snapshotHuman = snapshot.players.find(p => p.id === activePlayerId);

  if (!currentHuman || !snapshotHuman) {
    return {
      restoredPlayers: snapshot.players,
      restoredVertices: JSON.parse(JSON.stringify(snapshot.vertices)),
      restoredEdges: JSON.parse(JSON.stringify(snapshot.edges)),
    };
  }

  const totalCurrentCards = Object.values(currentHuman.developmentCards).reduce((sum, val) => sum + val, 0);
  const totalSnapshotCards = Object.values(snapshotHuman.developmentCards).reduce((sum, val) => sum + val, 0);
  const N = Math.max(0, totalCurrentCards - totalSnapshotCards);

  const updatedResources = {
    ...snapshotHuman.resources,
    SHEEP: Math.max(0, snapshotHuman.resources.SHEEP - N),
    WHEAT: Math.max(0, snapshotHuman.resources.WHEAT - N),
    ORE: Math.max(0, snapshotHuman.resources.ORE - N),
  };

  const updatedHuman: Player = {
    ...snapshotHuman,
    resources: updatedResources,
    developmentCards: { ...currentHuman.developmentCards },
    victoryPoints: snapshotHuman.victoryPoints,
  };

  const restoredPlayers = snapshot.players.map(p => {
    if (p.id === activePlayerId) {
      return updatedHuman;
    }
    return p;
  });

  return {
    restoredPlayers,
    restoredVertices: JSON.parse(JSON.stringify(snapshot.vertices)),
    restoredEdges: JSON.parse(JSON.stringify(snapshot.edges)),
  };
};
