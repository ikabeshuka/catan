import { Player } from '../../../types/player.types';
import { HexTile } from '../../../types/hex.types';
import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { GamePhase } from '../../../context/GameContext';
import { evaluateVertices } from '../evaluators/evaluateVertices';
import { evaluateEdges } from '../evaluators/evaluateEdges';
import { getMediumBotTarget } from '../getMediumBotTarget';

// הגדרת מבנה הפעולה שה-AI מחזיר למנוע המשחק
export interface AIAction {
  type: 'BUILD_SETTLEMENT' | 'BUILD_CITY' | 'BUILD_ROAD' | 'BUY_DEV_CARD' | 'END_TURN';
  targetId?: string; // מזהה הצומת או הכביש שבו הבוט רוצה לבנות
}

function isWastingResourcesOnSideAction(
  res: Record<string, number>,
  targetCost: Record<string, number>,
  actionCost: Record<string, number>
): boolean {
  for (const r of ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const) {
    const current = res[r] || 0;
    const requiredForAction = actionCost[r] || 0;
    const requiredForTarget = targetCost[r] || 0;
    if (current - requiredForAction < requiredForTarget) {
      return true;
    }
  }
  return false;
}

/**
 * מנתחת את המשאבים והלוח של הבוט ומחליטה על פעולת הבנייה הבאה שלו
 */
export function chooseBuildPhase(
  bot: Player,
  gamePhase: GamePhase,
  tiles: HexTile[],
  vertices: BoardVertex[],
  edges: BoardEdge[]
): AIAction {
  const res = bot.resources;

  // שליפת יעד הבנייה עבור בוט ברמת MEDIUM
  const target = bot.difficulty === 'MEDIUM' 
    ? getMediumBotTarget(bot, gamePhase, tiles, vertices, edges)
    : null;

  // Cost definitions for readability and reusability
  const CITY_COST = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 };
  const SETTLEMENT_COST = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 };
  const ROAD_COST = { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 };
  const DEV_CARD_COST = { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 };

  // Helper to check if bot can afford a given cost
  const canAfford = (cost: Record<string, number>): boolean => {
    for (const r of ["WOOD", "BRICK", "SHEEP", "WHEAT", "ORE"] as const) {
      if (res[r] < (cost[r] || 0)) return false;
    }
    return true;
  };

  // SUPER_HARD difficulty adaptive strategies overrides
  if (bot.difficulty === 'SUPER_HARD') {
    const strategy = bot.botStrategy || 'LONG_ROAD_EXPANSION';

    if (strategy === 'LONG_ROAD_EXPANSION') {
      // 1. Settlement
      if (canAfford(SETTLEMENT_COST)) {
        const bestVertices = evaluateVertices(bot.id, gamePhase, tiles, vertices, edges, 'HARD');
        if (bestVertices.length > 0) {
          return { type: 'BUILD_SETTLEMENT', targetId: bestVertices[0].vertexId };
        }
      }
      // 2. Road
      if (canAfford(ROAD_COST)) {
        const bestEdges = evaluateEdges(bot.id, gamePhase, tiles, vertices, edges, 'HARD');
        if (bestEdges.length > 0) {
          return { type: 'BUILD_ROAD', targetId: bestEdges[0].edgeId };
        }
      }
      // 3. City
      if (canAfford(CITY_COST)) {
        const mySettlements = vertices.filter(v => v.playerId === bot.id && v.structure === 'SETTLEMENT');
        if (mySettlements.length > 0) {
          return { type: 'BUILD_CITY', targetId: mySettlements[0].id };
        }
      }
      // 4. Dev Card
      if (canAfford(DEV_CARD_COST)) {
        return { type: 'BUY_DEV_CARD' };
      }
    }

    if (strategy === 'CITY_DEV_BURST') {
      // 1. City
      if (canAfford(CITY_COST)) {
        const mySettlements = vertices.filter(v => v.playerId === bot.id && v.structure === 'SETTLEMENT');
        if (mySettlements.length > 0) {
          return { type: 'BUILD_CITY', targetId: mySettlements[0].id };
        }
      }
      // 2. Dev Card
      if (canAfford(DEV_CARD_COST)) {
        return { type: 'BUY_DEV_CARD' };
      }
      // 3. Settlement
      if (canAfford(SETTLEMENT_COST)) {
        const bestVertices = evaluateVertices(bot.id, gamePhase, tiles, vertices, edges, 'HARD');
        if (bestVertices.length > 0) {
          return { type: 'BUILD_SETTLEMENT', targetId: bestVertices[0].vertexId };
        }
      }
      // 4. Road
      if (canAfford(ROAD_COST)) {
        const bestEdges = evaluateEdges(bot.id, gamePhase, tiles, vertices, edges, 'HARD');
        if (bestEdges.length > 0) {
          return { type: 'BUILD_ROAD', targetId: bestEdges[0].edgeId };
        }
      }
    }

    if (strategy === 'BALANCED_PORT_TRADE') {
      // 1. Settlement
      if (canAfford(SETTLEMENT_COST)) {
        const bestVertices = evaluateVertices(bot.id, gamePhase, tiles, vertices, edges, 'HARD');
        if (bestVertices.length > 0) {
          return { type: 'BUILD_SETTLEMENT', targetId: bestVertices[0].vertexId };
        }
      }
      // 2. City
      if (canAfford(CITY_COST)) {
        const mySettlements = vertices.filter(v => v.playerId === bot.id && v.structure === 'SETTLEMENT');
        if (mySettlements.length > 0) {
          return { type: 'BUILD_CITY', targetId: mySettlements[0].id };
        }
      }
      // 3. Road
      if (canAfford(ROAD_COST)) {
        const bestEdges = evaluateEdges(bot.id, gamePhase, tiles, vertices, edges, 'HARD');
        if (bestEdges.length > 0) {
          return { type: 'BUILD_ROAD', targetId: bestEdges[0].edgeId };
        }
      }
      // 4. Dev Card
      if (canAfford(DEV_CARD_COST)) {
        return { type: 'BUY_DEV_CARD' };
      }
    }

    return { type: 'END_TURN' };
  }

  // Special prioritization for BUILDER archetype (Settlement -> Road -> City -> Dev Card)
  if (bot.difficulty === 'HARD' && bot.archetype === 'BUILDER') {
    if (canAfford(SETTLEMENT_COST)) {
      const bestVertices = evaluateVertices(bot.id, gamePhase, tiles, vertices, edges, bot.difficulty || 'MEDIUM');
      if (bestVertices.length > 0) {
        return { type: 'BUILD_SETTLEMENT', targetId: bestVertices[0].vertexId };
      }
    }
    if (canAfford(ROAD_COST)) {
      const bestEdges = evaluateEdges(bot.id, gamePhase, tiles, vertices, edges, bot.difficulty || 'MEDIUM');
      if (bestEdges.length > 0) {
        return { type: 'BUILD_ROAD', targetId: bestEdges[0].edgeId };
      }
    }
    if (canAfford(CITY_COST)) {
      const mySettlements = vertices.filter(
        v => v.playerId === bot.id && v.structure === 'SETTLEMENT'
      );
      if (mySettlements.length > 0) {
        return { type: 'BUILD_CITY', targetId: mySettlements[0].id };
      }
    }
    if (canAfford(DEV_CARD_COST)) {
      return { type: 'BUY_DEV_CARD' };
    }
    return { type: 'END_TURN' };
  }

  // 1. עדיפות ראשונה: שדרוג לעיר (עלות: 3 ברזל, 2 חיטה)
  if (canAfford(CITY_COST)) {
    const isWasting = target && target.type !== 'CITY' && isWastingResourcesOnSideAction(res as any, target.cost as any, CITY_COST);
    
    if (!isWasting) {
      const mySettlements = vertices.filter(
        v => v.playerId === bot.id && v.structure === 'SETTLEMENT'
      );
      if (mySettlements.length > 0) {
        return { type: 'BUILD_CITY', targetId: mySettlements[0].id };
      }
    }
  }

  // 2. עדיפות שנייה: בניית יישוב חדש (עלות: 1 עץ, 1 לבנה, 1 כבש, 1 חיטה)
  if (canAfford(SETTLEMENT_COST)) {
    const isWasting = target && target.type !== 'SETTLEMENT' && isWastingResourcesOnSideAction(res as any, target.cost as any, SETTLEMENT_COST);

    if (!isWasting) {
      const bestVertices = evaluateVertices(bot.id, gamePhase, tiles, vertices, edges, bot.difficulty || 'MEDIUM');
      if (bestVertices.length > 0) {
        return { type: 'BUILD_SETTLEMENT', targetId: bestVertices[0].vertexId };
      }
    }
  }

  // 3. עדיפות שלישית: בניית כביש כדי להתרחב (עלות: 1 עץ, 1 לבנה)
  if (canAfford(ROAD_COST)) {
    const isWasting = target && target.type !== 'ROAD' && isWastingResourcesOnSideAction(res as any, target.cost as any, ROAD_COST);

    if (!isWasting) {
      const bestEdges = evaluateEdges(bot.id, gamePhase, tiles, vertices, edges, bot.difficulty || 'MEDIUM');
      if (bestEdges.length > 0) {
        // BUILDER archetype prioritizes roads even more
        if (bot.difficulty === 'HARD' && bot.archetype === 'BUILDER') {
          // Implement more aggressive road building logic here if needed,
          // currently, the scoring in evaluateEdges already reflects path to good vertices.
          return { type: 'BUILD_ROAD', targetId: bestEdges[0].edgeId };
        }
        return { type: 'BUILD_ROAD', targetId: bestEdges[0].edgeId };
      }
    }
  }

  // 4. עדיפות רביעית: קניית קלף פיתוח (עלות: 1 כבש, 1 חיטה, 1 ברזל)
  if (canAfford(DEV_CARD_COST)) {
    const isWasting = target && isWastingResourcesOnSideAction(res as any, target.cost as any, DEV_CARD_COST);

    if (!isWasting) {
      // DEVELOPER archetype prioritizes dev cards
      if (bot.difficulty === 'HARD' && bot.archetype === 'DEVELOPER') {
        return { type: 'BUY_DEV_CARD' };
      }
      // Other bots also buy dev cards if they can afford it and it's not wasting resources
      return { type: 'BUY_DEV_CARD' };
    }
  }

  // 5. ברירת מחדל: אם אין משאבים מתאימים או אין מיקומים חוקיים פנויים - מסיימים תור
  return { type: 'END_TURN' };
}
