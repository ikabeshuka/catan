import { BoardEdge, BoardVertex } from '../../types/boardElements.types';
import { HexTile } from '../../types/hex.types';
import { Player } from '../../types/player.types';
import { getEdgeVertices } from '../hexMath/boardGeometryHelpers';
import { getTileEdgeIds } from './generateEdges';
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
