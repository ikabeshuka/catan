import { BoardEdge, BoardVertex } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { Player } from '../../types/player.types';
import { getEdgeVertices } from '../hexMath/boardGeometryHelpers';
import { getTileEdgeIds } from './generateEdges';
import { getTileVertexIds } from '../hexMath/boardGeometryHelpers';
import type { DevCardType } from '../../types/gameActions.types';

export function reserveLostTribeDevelopmentCards(deck: string[], edges: BoardEdge[]): string[] {
  const remainingDeck = [...deck];
  const developmentGiftEdges = edges
    .filter(edge => edge.lostTribeReward?.kind === 'DEV_CARD')
    .sort((left, right) => left.lostTribeReward!.id.localeCompare(right.lostTribeReward!.id));
  developmentGiftEdges.forEach(edge => {
    const reservedCard = remainingDeck.shift() as DevCardType | undefined;
    if (reservedCard && edge.lostTribeReward) edge.lostTribeReward.devCardType = reservedCard;
  });
  return remainingDeck;
}

export const isWaterTile = (tile: HexTile): boolean => (
  tile.type === 'WATER' || tile.type === 'SEA' || tile.type === 'FOG'
);

export interface LostTribeVillageRef {
  id: string;
  number: number;
  tileId: string;
  vertexId: string;
  clothRemaining: number;
  connectedPlayerIds: string[];
}

export const getLostTribeVillages = (tiles: HexTile[]): LostTribeVillageRef[] => (
  tiles.flatMap(tile => (tile.lostTribeVillages || []).map(village => ({
    id: village.id,
    number: village.number,
    tileId: tile.id,
    vertexId: getTileVertexIds(tile)[village.vertexIndex],
    clothRemaining: village.clothRemaining,
    connectedPlayerIds: village.connectedPlayerIds || [],
  })))
);

/** Villages reached by one continuous shipping route beginning at the player's settlement/city. */
export function getReachedLostTribeVillageIds(playerId: string, vertices: BoardVertex[], edges: BoardEdge[], tiles: HexTile[]): string[] {
  const playerShips = edges.filter(edge => edge.hasShip && edge.shipPlayerId === playerId);
  if (playerShips.length === 0) return [];
  const graph = new Map<string, string[]>();
  playerShips.forEach(edge => {
    const [a, b] = getEdgeVertices(edge.id);
    graph.set(a, [...(graph.get(a) || []), b]);
    graph.set(b, [...(graph.get(b) || []), a]);
  });
  const reached = new Set<string>();
  const queue = vertices
    .filter(vertex => vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure))
    .map(vertex => vertex.id);
  while (queue.length > 0) {
    const vertexId = queue.shift()!;
    if (reached.has(vertexId)) continue;
    reached.add(vertexId);
    (graph.get(vertexId) || []).forEach(next => queue.push(next));
  }
  return getLostTribeVillages(tiles).filter(village => reached.has(village.vertexId)).map(village => village.id);
}

/** A shipping component that joins a settlement to a village is permanently closed. */
export function getClosedLostTribeShipIds(playerId: string, vertices: BoardVertex[], edges: BoardEdge[], tiles: HexTile[]): Set<string> {
  const playerShips = edges.filter(edge => edge.hasShip && edge.shipPlayerId === playerId);
  const villageVertices = new Set(getLostTribeVillages(tiles).map(village => village.vertexId));
  const structureVertices = new Set(vertices
    .filter(vertex => vertex.playerId === playerId && ['SETTLEMENT', 'CITY'].includes(vertex.structure))
    .map(vertex => vertex.id));
  const byVertex = new Map<string, BoardEdge[]>();
  playerShips.forEach(edge => getEdgeVertices(edge.id).forEach(vertexId => byVertex.set(vertexId, [...(byVertex.get(vertexId) || []), edge])));
  const closed = new Set<string>();
  const visited = new Set<string>();
  playerShips.forEach(seed => {
    if (visited.has(seed.id)) return;
    const component = new Set<string>();
    const componentVertices = new Set<string>();
    const queue = [seed];
    while (queue.length) {
      const edge = queue.pop()!;
      if (visited.has(edge.id)) continue;
      visited.add(edge.id);
      component.add(edge.id);
      getEdgeVertices(edge.id).forEach(vertexId => {
        componentVertices.add(vertexId);
        (byVertex.get(vertexId) || []).forEach(next => queue.push(next));
      });
    }
    if ([...componentVertices].some(id => villageVertices.has(id)) && [...componentVertices].some(id => structureVertices.has(id))) {
      component.forEach(id => closed.add(id));
    }
  });
  return closed;
}

export function getEligibleHarborEdges(
  playerId: string,
  vertices: BoardVertex[],
  edges: BoardEdge[],
  tiles: HexTile[],
): BoardEdge[] {
  const harborEdges = edges.filter(edge => edge.isHarbor);
  const harborEdgeIdsByWaterTile = new Map<string, Set<string>>();
  tiles.filter(isWaterTile).forEach(tile => {
    const edgeIds = new Set(getTileEdgeIds(tile));
    const occupied = harborEdges.filter(edge => edgeIds.has(edge.id)).map(edge => edge.id);
    harborEdgeIdsByWaterTile.set(tile.id, new Set(occupied));
  });

  return edges.filter(edge => {
    if (edge.isHarbor) return false;
    const [v1Id, v2Id] = getEdgeVertices(edge.id);
    const ownsCoastalStructure = vertices.some(vertex =>
      (vertex.id === v1Id || vertex.id === v2Id) &&
      vertex.playerId === playerId &&
      (vertex.structure === 'SETTLEMENT' || vertex.structure === 'CITY')
    );
    if (!ownsCoastalStructure) return false;

    const borderingTiles = tiles.filter(tile => getTileEdgeIds(tile).includes(edge.id));
    const borderingWater = borderingTiles.filter(isWaterTile);
    const touchesLand = borderingTiles.some(tile => !isWaterTile(tile));
    if (borderingWater.length === 0 || !touchesLand) return false;

    const adjacentToHarbor = harborEdges.some(harborEdge => {
      const [h1, h2] = getEdgeVertices(harborEdge.id);
      return h1 === v1Id || h1 === v2Id || h2 === v1Id || h2 === v2Id;
    });
    if (adjacentToHarbor) return false;

    return borderingWater.every(tile => (harborEdgeIdsByWaterTile.get(tile.id)?.size || 0) === 0);
  });
}

export function claimLostTribeReward(player: Player, edge: BoardEdge): Player {
  const reward = edge.lostTribeReward;
  if (!reward || reward.collectedBy) return player;

  if (reward.kind === 'VICTORY_POINT') {
    return { ...player, victoryPoints: player.victoryPoints + 1 };
  }

  if (reward.kind === 'HARBOR' && reward.harborType) {
    return {
      ...player,
      unplacedHarbors: [...(player.unplacedHarbors || []), reward.harborType],
    };
  }

  if (reward.kind === 'DEV_CARD' && reward.devCardType) {
    const normalizedType = reward.devCardType;
    return {
      ...player,
      developmentCards: {
        ...player.developmentCards,
        [normalizedType]: (player.developmentCards[normalizedType] || 0) + 1,
      },
      boughtDevCardsThisTurn: normalizedType === 'VICTORY_POINT'
        ? player.boughtDevCardsThisTurn
        : {
            ...player.boughtDevCardsThisTurn,
            [normalizedType]: (player.boughtDevCardsThisTurn?.[normalizedType] || 0) + 1,
          },
    };
  }

  return player;
}

export function getLostTribeRewardLog(playerName: string, edge: BoardEdge): string | null {
  const reward = edge.lostTribeReward;
  if (!reward || reward.collectedBy) return null;
  if (reward.kind === 'VICTORY_POINT') return `🏆 ${playerName} קיבל אסימון קטאן ונקודת ניצחון!`;
  if (reward.kind === 'DEV_CARD') return `🎴 ${playerName} קיבל קלף פיתוח מהשבט האבוד.`;
  if (reward.kind === 'HARBOR') return `⚓ ${playerName} קיבל נמל מהשבט האבוד.`;
  return null;
}
