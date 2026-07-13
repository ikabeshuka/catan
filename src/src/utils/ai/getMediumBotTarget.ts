import { Player } from '../../types/player.types';
import { GamePhase } from '../../context/GameContext';
import { HexTile } from '../../types/hex.types';
import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { evaluateVertices } from './evaluators/evaluateVertices';
import { evaluateEdges } from './evaluators/evaluateEdges';

export interface BuildTarget {
  type: 'SETTLEMENT' | 'CITY' | 'ROAD';
  cost: Record<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', number>;
  missingCount: number;
}

export function getMediumBotTarget(
  bot: Player,
  gamePhase: GamePhase,
  tiles: HexTile[],
  vertices: BoardVertex[],
  edges: BoardEdge[]
): BuildTarget | null {
  const res = bot.resources;
  const candidates: BuildTarget[] = [];

  // 1. Settlement (Cost: 1 Wood, 1 Brick, 1 Sheep, 1 Wheat)
  const bestVertices = evaluateVertices(bot.id, gamePhase, tiles, vertices, edges, bot.difficulty || 'MEDIUM');
  if (bestVertices.length > 0) {
    const cost = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 };
    const missingCount = Math.max(0, 1 - (res.WOOD || 0)) +
                         Math.max(0, 1 - (res.BRICK || 0)) +
                         Math.max(0, 1 - (res.SHEEP || 0)) +
                         Math.max(0, 1 - (res.WHEAT || 0));
    candidates.push({ type: 'SETTLEMENT', cost, missingCount });
  }

  // 2. Road (Cost: 1 Wood, 1 Brick)
  const bestEdges = evaluateEdges(bot.id, gamePhase, tiles, vertices, edges, bot.difficulty || 'MEDIUM');
  if (bestEdges.length > 0) {
    const cost = { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 };
    const missingCount = Math.max(0, 1 - (res.WOOD || 0)) +
                         Math.max(0, 1 - (res.BRICK || 0));
    candidates.push({ type: 'ROAD', cost, missingCount });
  }

  // 3. City (Cost: 2 Wheat, 3 Ore)
  const mySettlements = vertices.filter(v => v.playerId === bot.id && v.structure === 'SETTLEMENT');
  if (mySettlements.length > 0) {
    const cost = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 };
    const missingCount = Math.max(0, 2 - (res.WHEAT || 0)) +
                         Math.max(0, 3 - (res.ORE || 0));
    candidates.push({ type: 'CITY', cost, missingCount });
  }

  if (candidates.length === 0) return null;

  // We sort candidates by missingCount.
  // The candidate with the lowest missing resource count is our closest target.
  candidates.sort((a, b) => a.missingCount - b.missingCount);
  return candidates[0];
}
