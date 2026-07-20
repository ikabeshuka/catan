import { Player } from '../../../types/player.types';
import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { HexTile } from '../../../types/hex.types';
import { GamePhase } from '../../../context/GameContext';
import { getMediumBotTarget } from '../getMediumBotTarget';

export function getTradeRatio(
  botId: string,
  vertices: BoardVertex[],
  resType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'
): number {
  const ownedPorts = vertices.filter(v =>
    v.playerId === botId &&
    (v.structure === 'SETTLEMENT' || v.structure === 'CITY') &&
    v.isHarbor
  );
  const hasSpecialPort = ownedPorts.some(p => p.harborType === resType);
  if (hasSpecialPort) return 2;
  const hasGenericPort = ownedPorts.some(p => p.harborType === 'GENERIC');
  if (hasGenericPort) return 3;
  return 4;
}

interface EvaluateAndExecuteTradesParams {
  botPlayer: Player;
  players: Player[];
  vertices: BoardVertex[];
  edges: BoardEdge[];
  tiles: HexTile[];
  gamePhase: GamePhase;
  resourceLabels: Record<string, string>;
  addLog?: (message: string) => void;
}

export function evaluateAndExecuteTrades({
  botPlayer,
  players,
  vertices,
  edges,
  tiles,
  gamePhase,
  resourceLabels,
  addLog
}: EvaluateAndExecuteTradesParams): { updatedBot: Player; updatedPlayers: Player[]; buildHappened: boolean } {
  let currentBot = { ...botPlayer, resources: { ...botPlayer.resources } };
  let playersCopy = players.map(p => ({ ...p, resources: { ...p.resources } }));
  let buildHappened = false;

  if (botPlayer.difficulty === 'EASY') {
    return { updatedBot: currentBot, updatedPlayers: playersCopy, buildHappened };
  }

  const resourcesList = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;
  
  const GOALS = [
    { type: 'CITY', cost: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 } },
    { type: 'SETTLEMENT', cost: { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 } },
    { type: 'ROAD', cost: { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 } },
    { type: 'DEV_CARD', cost: { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 } }
  ];

  // Find what we are missing for our closest goal
  let neededResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
  let surplusResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;

  if (currentBot.difficulty === 'MEDIUM') {
    const target = getMediumBotTarget(currentBot, gamePhase, tiles, vertices, edges);
    if (target) {
      // Find needed resource from target
      for (const r of resourcesList) {
        if ((currentBot.resources[r] || 0) < (target.cost[r] || 0)) {
          neededResource = r;
          break;
        }
      }
      // Find surplus resource (>= 2 and > target cost)
      for (const r of resourcesList) {
        if ((currentBot.resources[r] || 0) >= 2 && (currentBot.resources[r] || 0) > (target.cost[r] || 0)) {
          surplusResource = r;
          break;
        }
      }
    }
  } else {
    // Find a surplus resource (we have at least 2, and more than we need for a goal)
    for (const r of resourcesList) {
      if ((currentBot.resources[r] || 0) >= 2) {
        // BUILDER archetype: save WOOD and BRICK, do not trade them away unless large surplus
        if (botPlayer.difficulty === 'HARD' && botPlayer.archetype === 'BUILDER' && (r === 'WOOD' || r === 'BRICK')) {
          if ((currentBot.resources[r] || 0) <= 2) {
            continue;
          }
        }
        surplusResource = r;
        break;
      }
    }

    // Find a needed resource for any goal we are close to
    for (const goal of GOALS) {
      const missing: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[] = [];
      for (const r of resourcesList) {
        if ((currentBot.resources[r] || 0) < goal.cost[r]) {
          missing.push(r);
        }
      }
      if (missing.length === 1 && surplusResource && surplusResource !== missing[0]) {
        neededResource = missing[0];
        break;
      }
    }
  }

  if (surplusResource && neededResource) {
    const leadingPlayerIds = playersCopy.filter(p => (p.victoryPoints || 0) >= 7).map(p => p.id);

    // Try to trade with human player
    const human = playersCopy.find(p => !p.isBot);
    const isHumanLeading = human && leadingPlayerIds.includes(human.id);
    const shouldRefuseTradeWithHuman = botPlayer.difficulty === 'HARD' && isHumanLeading;

    if (human && (human.resources[neededResource] || 0) >= 1 && !shouldRefuseTradeWithHuman) {
      if (typeof window !== 'undefined') {
        (window as any).isBotTimerPaused = true;
      }
      const humanAgreed = typeof window !== 'undefined' && typeof window.confirm === 'function' &&
        window.confirm(`הבוט ${botPlayer.name} מציע לך עסקת מסחר:\nהוא ייתן לך 1 ${resourceLabels[surplusResource]} תמורת 1 ${resourceLabels[neededResource]}.\nהאם אתה מסכים?`);
      if (typeof window !== 'undefined') {
        (window as any).isBotTimerPaused = false;
      }

      if (humanAgreed) {
        // execute trade with human
        playersCopy = playersCopy.map(p => {
          if (p.id === human.id) {
            return {
              ...p,
              resources: {
                ...p.resources,
                [neededResource!]: (p.resources[neededResource!] || 0) - 1,
                [surplusResource!]: (p.resources[surplusResource!] || 0) + 1
              }
            };
          }
          if (p.id === botPlayer.id) {
            return {
              ...p,
              resources: {
                ...p.resources,
                [surplusResource!]: (p.resources[surplusResource!] || 0) - 1,
                [neededResource!]: (p.resources[neededResource!] || 0) + 1
              }
            };
          }
          return p;
        });
        currentBot = playersCopy.find(p => p.id === botPlayer.id)!;
        buildHappened = true;
        if (addLog) {
          addLog(`[מסחר] ביצעת עסקת מסחר עם בוט ${botPlayer.name}: נתת 1 ${resourceLabels[neededResource]} וקיבלת 1 ${resourceLabels[surplusResource]}.`);
        }
      }
    } else if (shouldRefuseTradeWithHuman && addLog) {
      addLog(`[מסחר] הבוט ${botPlayer.name} (קשה) סירב לחלוטין לסחור עם ${human?.name} בגלל שהוא מוביל (7+ נקודות).`);
    }

    // If trade with human didn't happen, try to trade with other bots
    if (!buildHappened) {
      const otherBots = playersCopy.filter(p => p.isBot && p.id !== botPlayer.id);
      for (const otherBot of otherBots) {
        const isOtherBotLeading = leadingPlayerIds.includes(otherBot.id);
        if (botPlayer.difficulty === 'HARD' && isOtherBotLeading) {
          if (addLog) {
            addLog(`[מסחר] הבוט ${botPlayer.name} (קשה) סירב לחלוטין לסחור עם הבוט ${otherBot.name} בגלל שהוא מוביל (7+ נקודות).`);
          }
          continue;
        }

        if ((otherBot.resources[neededResource] || 0) >= 2) {
          // Bot trades 1:1 with other bot
          playersCopy = playersCopy.map(p => {
            if (p.id === otherBot.id) {
              return {
                ...p,
                resources: {
                  ...p.resources,
                  [neededResource!]: (p.resources[neededResource!] || 0) - 1,
                  [surplusResource!]: (p.resources[surplusResource!] || 0) + 1
                }
              };
            }
            if (p.id === botPlayer.id) {
              return {
                ...p,
                resources: {
                  ...p.resources,
                  [surplusResource!]: (p.resources[surplusResource!] || 0) - 1,
                  [neededResource!]: (p.resources[neededResource!] || 0) + 1
                }
              };
            }
            return p;
          });
          currentBot = playersCopy.find(p => p.id === botPlayer.id)!;
          buildHappened = true;
          if (addLog) {
            addLog(`[מסחר] בוט ${botPlayer.name} ביצע עסקת מסחר עם בוט ${otherBot.name}: החליף 1 ${resourceLabels[surplusResource]} תמורת 1 ${resourceLabels[neededResource]}.`);
          }
          break; // Trade done
        }
      }
    }
  }

  return { updatedBot: currentBot, updatedPlayers: playersCopy, buildHappened };
}
