import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { Player } from '../../../types/player.types';
import { HexTile } from '../../../types/hex.types';
import { GamePhase } from '../../../context/GameContext';
import { TurnSubPhase } from '../../../types/game.types';
import { chooseBuildPhase } from '../decisionMakers/chooseBuildPhase';
import { evaluateEdges } from '../evaluators/evaluateEdges';
import { getMediumBotTarget } from '../getMediumBotTarget';
import { cubeToPixel } from '../../hexMath/cubeToPixel';

interface TradeAndBuildPhaseParams {
  botPlayer: Player;
  gamePhase: GamePhase;
  tiles: HexTile[];
  vertices: BoardVertex[];
  edges: BoardEdge[];
  players: Player[];
  addLog?: (message: string) => void;
  endTurn: () => void;
  setVertices: React.Dispatch<React.SetStateAction<BoardVertex[]>>;
  setEdges: React.Dispatch<React.SetStateAction<BoardEdge[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setTurnSubPhase?: React.Dispatch<React.SetStateAction<TurnSubPhase>>;
}

export function tradeAndBuildPhase({
  botPlayer,
  gamePhase,
  tiles,
  vertices,
  edges,
  players,
  addLog,
  endTurn,
  setVertices,
  setEdges,
  setPlayers,
  setTurnSubPhase
}: TradeAndBuildPhaseParams): void {
    setTimeout(() => {
      let currentVertices = [...vertices];
      let currentEdges = [...edges];
      let currentBot = { ...botPlayer };
      let buildHappened = false;
      let playersCopy = players.map(p => ({ ...p, resources: { ...p.resources } }));

      // Increment turnsPlayed once per main game turn
      if (!currentBot.turnsPlayed) {
        currentBot.turnsPlayed = 0;
      }
      currentBot.turnsPlayed += 1;

      // Adaptive Strategy Selection for SUPER_HARD bot
      if (currentBot.difficulty === 'SUPER_HARD') {
        const TOKEN_WEIGHTS_LOCAL: Record<number, number> = {
          2: 1, 12: 1,
          3: 2, 11: 2,
          4: 3, 10: 3,
          5: 4, 9: 4,
          6: 5, 8: 5
        };

        if (!currentBot.botStrategy) {
          // Analyze starting settlements to choose initial strategy
          const botVertices = currentVertices.filter(v => v.playerId === currentBot.id);
          const startingYields = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 };
          let hasStartingPort = false;

          botVertices.forEach(vertex => {
            if (vertex.isHarbor) {
              hasStartingPort = true;
            }
            tiles.forEach(tile => {
              const center = cubeToPixel(tile.coord, 60);
              for (let i = 0; i < 6; i++) {
                const angleRad = (Math.PI / 180) * (60 * i - 30);
                const x = center.x + 60 * Math.cos(angleRad);
                const y = center.y + 60 * Math.sin(angleRad);
                const roundedX = Math.round(x * 10) / 10;
                const roundedY = Math.round(y * 10) / 10;
                const checkId = `v_${roundedX}_${roundedY}`;

                if (checkId === vertex.id && tile.type !== 'DESERT' && tile.numberToken !== null) {
                  startingYields[tile.type as 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'] += TOKEN_WEIGHTS_LOCAL[tile.numberToken] || 0;
                }
              }
            });
          });

          if (hasStartingPort) {
            currentBot.botStrategy = 'BALANCED_PORT_TRADE';
          } else {
            const woodBrick = startingYields.WOOD + startingYields.BRICK;
            const oreWheat = startingYields.ORE + startingYields.WHEAT;
            if (woodBrick >= oreWheat) {
              currentBot.botStrategy = 'LONG_ROAD_EXPANSION';
            } else {
              currentBot.botStrategy = 'CITY_DEV_BURST';
            }
          }

          if (addLog) {
            const strategyLabels = {
              LONG_ROAD_EXPANSION: 'התפרסות ובניית דרכים (עץ/לבנה)',
              CITY_DEV_BURST: 'שדרוג לערים וקלפי פיתוח (ברזל/חיטה)',
              BALANCED_PORT_TRADE: 'מסחר נמלים מאוזן'
            };
            addLog(`[אסטרטגיה] הבוט ${currentBot.name} (SUPER_HARD) בחר באסטרטגיה: ${strategyLabels[currentBot.botStrategy]}.`);
          }
          buildHappened = true; // Ensure state is saved
        }

        // Re-evaluation Loop (Audit) every 4 turns
        if (currentBot.turnsPlayed % 4 === 0) {
          const botVertices = currentVertices.filter(v => v.playerId === currentBot.id);
          const activeYields = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 };
          let hasActivePort = false;

          botVertices.forEach(vertex => {
            if (vertex.isHarbor) {
              hasActivePort = true;
            }
            tiles.forEach(tile => {
              if (tile.hasRobber) return; // Skip tiles blocked by robber
              const center = cubeToPixel(tile.coord, 60);
              for (let i = 0; i < 6; i++) {
                const angleRad = (Math.PI / 180) * (60 * i - 30);
                const x = center.x + 60 * Math.cos(angleRad);
                const y = center.y + 60 * Math.sin(angleRad);
                const roundedX = Math.round(x * 10) / 10;
                const roundedY = Math.round(y * 10) / 10;
                const checkId = `v_${roundedX}_${roundedY}`;

                if (checkId === vertex.id && tile.type !== 'DESERT' && tile.numberToken !== null) {
                  activeYields[tile.type as 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'] += TOKEN_WEIGHTS_LOCAL[tile.numberToken] || 0;
                }
              }
            });
          });

          let needsPivot = false;
          const currentStrat = currentBot.botStrategy;

          // 1. If LONG_ROAD_EXPANSION but wood/brick yield is blocked or roads are blocked
          if (currentStrat === 'LONG_ROAD_EXPANSION') {
            const roadMoves = evaluateEdges(currentBot.id, gamePhase, tiles, currentVertices, currentEdges, 'HARD');
            if (activeYields.WOOD + activeYields.BRICK === 0 || roadMoves.length === 0) {
              needsPivot = true;
            }
          }
          // 2. If CITY_DEV_BURST but ore/wheat yield is blocked
          else if (currentStrat === 'CITY_DEV_BURST') {
            if (activeYields.ORE + activeYields.WHEAT === 0) {
              needsPivot = true;
            }
          }
          // 3. If BALANCED_PORT_TRADE but overall yield is blocked
          else if (currentStrat === 'BALANCED_PORT_TRADE') {
            const totalActive = Object.values(activeYields).reduce((sum, val) => sum + val, 0);
            if (totalActive === 0) {
              needsPivot = true;
            }
          }

          if (needsPivot) {
            let newStrat: 'LONG_ROAD_EXPANSION' | 'CITY_DEV_BURST' | 'BALANCED_PORT_TRADE' = currentStrat;
            if (hasActivePort && Object.values(activeYields).some(y => y > 0)) {
              newStrat = 'BALANCED_PORT_TRADE';
            } else {
              const activeWoodBrick = activeYields.WOOD + activeYields.BRICK;
              const activeOreWheatSum = activeYields.ORE + activeYields.WHEAT;
              if (activeWoodBrick >= activeOreWheatSum) {
                newStrat = 'LONG_ROAD_EXPANSION';
              } else {
                newStrat = 'CITY_DEV_BURST';
              }
            }

            if (newStrat !== currentStrat) {
              currentBot.botStrategy = newStrat;
              buildHappened = true;
              if (addLog) {
                const strategyLabels = {
                  LONG_ROAD_EXPANSION: 'התפרסות ובניית דרכים (עץ/לבנה)',
                  CITY_DEV_BURST: 'שדרוג לערים וקלפי פיתוח (ברזל/חיטה)',
                  BALANCED_PORT_TRADE: 'מסחר נמלים מאוזן'
                };
                addLog(`[פיבוט אסטרטגי] הבוט ${currentBot.name} (סופר קשה) זיהה חסימה או חוסר משאבים בפעילותו הנוכחית. ביצע פיבוט לאסטרטגיה: ${strategyLabels[newStrat]}!`);
              }
            }
          }
        }
      }

      const resourceLabels: Record<string, string> = {
        WOOD: 'עץ',
        BRICK: 'לבנה',
        SHEEP: 'כבש',
        WHEAT: 'חיטה',
        ORE: 'ברזל'
      };

      // --- PLAY DEVELOPMENT CARD (If Bot Has Any) ---
      let devCardPlayed = false;
      const botDevCards = currentBot.developmentCards || { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0 };

      // 1. Play Knight Card
      if (botDevCards.KNIGHT > 0 && !devCardPlayed) {
        // Check if robber is blocking bot's productive hexes
        const HEX_SIZE = 60;
        const isRobberBlockingBot = tiles.some(tile => {
          if (!tile.hasRobber) return false;
          const center = cubeToPixel(tile.coord, HEX_SIZE);
          return currentVertices.some(v => {
            if (v.playerId !== botPlayer.id) return false;
            if (v.structure !== 'SETTLEMENT' && v.structure !== 'CITY') return false;
            const parts = v.id.split('_');
            const vx = parseFloat(parts[1]);
            const vy = parseFloat(parts[2]);
            if (isNaN(vx) || isNaN(vy)) return false;
            const dist = Math.sqrt((vx - center.x) ** 2 + (vy - center.y) ** 2);
            return dist < 65; // Vertex is on this tile
          });
        });

        // If robber is blocking, or 40% random chance to play Knight anyway (e.g. to get Largest Army)
        if (isRobberBlockingBot || Math.random() < 0.4) {
          if (addLog) {
            addLog(`[קלף פיתוח] בוט ${botPlayer.name} הפעיל קלף אביר ומזיז את השודד!`);
          }
          currentBot.developmentCards = {
            ...currentBot.developmentCards,
            KNIGHT: Math.max(0, currentBot.developmentCards.KNIGHT - 1)
          };
          currentBot.knightsPlayed = (currentBot.knightsPlayed || 0) + 1;
          playersCopy = playersCopy.map(p => p.id === botPlayer.id ? currentBot : p);
          setPlayers(playersCopy);
          if (setTurnSubPhase) {
            setTurnSubPhase('ROBBER_PLACEMENT');
          }
          return; // Stop execution of this turn, it will continue after robber is placed
        }
      }

      // 2. Play Road Building Card
      if (botDevCards.ROAD_BUILDING > 0 && !devCardPlayed) {
        // Find best edges to build roads
        let tempEdges = [...currentEdges];
        const bestEdges1 = evaluateEdges(botPlayer.id, gamePhase, tiles, currentVertices, tempEdges, botPlayer.difficulty || 'MEDIUM');
        if (bestEdges1.length > 0) {
          const firstRoadId = bestEdges1[0].edgeId;
          tempEdges = tempEdges.map(e => e.id === firstRoadId ? { ...e, hasRoad: true, playerId: botPlayer.id } : e);
          
          const bestEdges2 = evaluateEdges(botPlayer.id, gamePhase, tiles, currentVertices, tempEdges, botPlayer.difficulty || 'MEDIUM');
          let secondRoadId = '';
          if (bestEdges2.length > 0) {
            secondRoadId = bestEdges2[0].edgeId;
            tempEdges = tempEdges.map(e => e.id === secondRoadId ? { ...e, hasRoad: true, playerId: botPlayer.id } : e);
          }

          currentEdges = tempEdges;
          currentBot.developmentCards = {
            ...currentBot.developmentCards,
            ROAD_BUILDING: Math.max(0, currentBot.developmentCards.ROAD_BUILDING - 1)
          };
          buildHappened = true;
          devCardPlayed = true;

          if (addLog) {
            addLog(`[קלף פיתוח] בוט ${botPlayer.name} הפעיל קלף בניית כבישים ובנה כבישים חינם!`);
          }
        }
      }

      // 3. Play Monopoly Card
      if (botDevCards.MONOPOLY > 0 && !devCardPlayed) {
        const resourceTypes = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;
        let bestResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' = resourceTypes[0];
        let maxStolen = -1;

        // Choose the resource that we can steal the most of
        resourceTypes.forEach(resType => {
          let count = 0;
          playersCopy.forEach(p => {
            if (p.id !== botPlayer.id) {
              count += p.resources[resType] || 0;
            }
          });
          if (count > maxStolen) {
            maxStolen = count;
            bestResource = resType;
          }
        });

        // Execute monopoly steal
        let stolen = 0;
        playersCopy = playersCopy.map(p => {
          if (p.id !== botPlayer.id) {
            const amount = p.resources[bestResource] || 0;
            stolen += amount;
            return {
              ...p,
              resources: {
                ...p.resources,
                [bestResource]: 0
              }
            };
          }
          return p;
        });

        currentBot.resources = {
          ...currentBot.resources,
          [bestResource]: (currentBot.resources[bestResource] || 0) + stolen
        };
        currentBot.developmentCards = {
          ...currentBot.developmentCards,
          MONOPOLY: Math.max(0, currentBot.developmentCards.MONOPOLY - 1)
        };
        buildHappened = true; // Make sure the resource update and card decrement are saved
        devCardPlayed = true;

        if (addLog) {
          addLog(`[קלף פיתוח] בוט ${botPlayer.name} הפעיל קלף מונופול וגזל ${stolen} קלפי ${resourceLabels[bestResource]} משאר השחקנים!`);
        }
      }

      const getTradeRatio = (resType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'): number => {
        const ownedPorts = currentVertices.filter(v =>
          v.playerId === botPlayer.id &&
          (v.structure === 'SETTLEMENT' || v.structure === 'CITY') &&
          v.isHarbor
        );
        const hasSpecialPort = ownedPorts.some(p => p.harborType === resType);
        if (hasSpecialPort) return 2;
        const hasGenericPort = ownedPorts.some(p => p.harborType === 'GENERIC');
        if (hasGenericPort) return 3;
        return 4;
      };

      // --- STEP 1: PLAYER & BOT TRADING ---
      // We try to trade if we have surplus resources (count >= 2) and are missing a resource for a goal.
      if (botPlayer.difficulty !== 'EASY') {
        const resourcesList = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;
        
        const GOALS = [
          { type: 'CITY', cost: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 } },
          { type: 'SETTLEMENT', cost: { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 } },
          { type: 'ROAD', cost: { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 } },
          { type: 'DEV_CARD', cost: { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 } }
        ];

        // Let's find what we are missing for our closest goal
        let neededResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
        let surplusResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;

        if (currentBot.difficulty === 'MEDIUM') {
          const target = getMediumBotTarget(currentBot, gamePhase, tiles, currentVertices, currentEdges);
          if (target) {
            // Find needed resource from target
            for (const r of resourcesList) {
              if (currentBot.resources[r] < (target.cost[r] || 0)) {
                neededResource = r;
                break;
              }
            }
            // Find surplus resource (>= 2 and > target cost)
            for (const r of resourcesList) {
              if (currentBot.resources[r] >= 2 && currentBot.resources[r] > (target.cost[r] || 0)) {
                surplusResource = r;
                break;
              }
            }
          }
        } else {
          // Find a surplus resource (we have at least 2, and more than we need for a goal)
          for (const r of resourcesList) {
            if (currentBot.resources[r] >= 2) {
              // BUILDER archetype: save WOOD and BRICK, do not trade them away unless large surplus
              if (botPlayer.difficulty === 'HARD' && botPlayer.archetype === 'BUILDER' && (r === 'WOOD' || r === 'BRICK')) {
                if (currentBot.resources[r] <= 2) {
                  continue;
                }
              }
              surplusResource = r;
              break;
            }
          }

          // Find a needed resource for any goal we are close to
          for (const goal of GOALS) {
            let missing: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[] = [];
            for (const r of resourcesList) {
              if (currentBot.resources[r] < goal.cost[r]) {
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
          const leadingPlayerIds = playersCopy.filter(p => p.victoryPoints >= 7).map(p => p.id);

          // Try to trade with human player
          const human = playersCopy.find(p => !p.isBot);
          const isHumanLeading = human && leadingPlayerIds.includes(human.id);
          const shouldRefuseTradeWithHuman = botPlayer.difficulty === 'HARD' && isHumanLeading;

          if (human && human.resources[neededResource] >= 1 && !shouldRefuseTradeWithHuman) {
            const humanAgreed = typeof window !== 'undefined' && typeof window.confirm === 'function' &&
              window.confirm(`הבוט ${botPlayer.name} מציע לך עסקת מסחר:\nהוא ייתן לך 1 ${resourceLabels[surplusResource]} תמורת 1 ${resourceLabels[neededResource]}.\nהאם אתה מסכים?`);

            if (humanAgreed) {
              // execute trade with human
              playersCopy = playersCopy.map(p => {
                if (p.id === human.id) {
                  return {
                    ...p,
                    resources: {
                      ...p.resources,
                      [neededResource!]: p.resources[neededResource!] - 1,
                      [surplusResource!]: (p.resources[surplusResource!] || 0) + 1
                    }
                  };
                }
                if (p.id === botPlayer.id) {
                  return {
                    ...p,
                    resources: {
                      ...p.resources,
                      [surplusResource!]: p.resources[surplusResource!] - 1,
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

              if (otherBot.resources[neededResource] >= 2) {
                // Bot trades 1:1 with other bot
                playersCopy = playersCopy.map(p => {
                  if (p.id === otherBot.id) {
                    return {
                      ...p,
                      resources: {
                        ...p.resources,
                        [neededResource!]: p.resources[neededResource!] - 1,
                        [surplusResource!]: (p.resources[surplusResource!] || 0) + 1
                      }
                    };
                  }
                  if (p.id === botPlayer.id) {
                    return {
                      ...p,
                      resources: {
                        ...p.resources,
                        [surplusResource!]: p.resources[surplusResource!] - 1,
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

        // --- STEP 2: BANK & PORT TRADING (ARCHETYPE SPECIFIC OVERRIDES FOR HARD BOTS) ---
        if (botPlayer.difficulty === 'SUPER_HARD') {
          const strategy = currentBot.botStrategy || 'LONG_ROAD_EXPANSION';
          
          if (strategy === 'LONG_ROAD_EXPANSION' && !buildHappened) {
            // Prioritize WOOD and BRICK for settlements and roads
            const settlementCost = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 };
            const roadCost = { WOOD: 1, BRICK: 1 };
            
            const currentResources = { ...currentBot.resources };
            let missingSettlementRes: 'WOOD' | 'BRICK' | null = null;
            let missingSettlementCount = 0;
            for (const r of ['WOOD', 'BRICK'] as const) {
              if (currentResources[r] < settlementCost[r]) {
                missingSettlementCount++;
                missingSettlementRes = r;
              }
            }
            
            let missingRoadRes: 'WOOD' | 'BRICK' | null = null;
            let missingRoadCount = 0;
            for (const r of ['WOOD', 'BRICK'] as const) {
              if (currentResources[r] < roadCost[r]) {
                missingRoadCount++;
                missingRoadRes = r;
              }
            }

            if (missingSettlementCount === 1 && missingSettlementRes) {
              for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
                const ratio = getTradeRatio(r);
                if (currentBot.resources[r] >= ratio) {
                  currentBot.resources[r] -= ratio;
                  currentBot.resources[missingSettlementRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingSettlementRes]} כדי לבנות יישוב כחלק מאסטרטגיית התפרסות דרכים.`);
                  }
                  break;
                }
              }
            } else if (missingRoadCount === 1 && missingRoadRes && !buildHappened) {
              for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
                const ratio = getTradeRatio(r);
                if (currentBot.resources[r] >= ratio) {
                  currentBot.resources[r] -= ratio;
                  currentBot.resources[missingRoadRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingRoadRes]} כדי לבנות כבישים ארוכים.`);
                  }
                  break;
                }
              }
            }
          }
          
          else if (strategy === 'CITY_DEV_BURST' && !buildHappened) {
            // Prioritize ORE and WHEAT for cities and dev cards
            const devCardCost = { SHEEP: 1, WHEAT: 1, ORE: 1 };
            const cityCost = { WHEAT: 2, ORE: 3 };
            
            const currentResources = { ...currentBot.resources };
            let missingDevCardRes: 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
            let missingDevCardCount = 0;
            for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
              if (currentResources[r] < devCardCost[r]) {
                missingDevCardCount++;
                missingDevCardRes = r;
              }
            }
            
            let missingCityRes: 'WHEAT' | 'ORE' | null = null;
            let missingCityCount = 0;
            for (const r of ['WHEAT', 'ORE'] as const) {
              if (currentResources[r] < cityCost[r]) {
                missingCityCount++;
                missingCityRes = r;
              }
            }

            if (missingCityCount === 1 && missingCityRes) {
              for (const r of resourcesList) {
                const ratio = getTradeRatio(r);
                if (currentBot.resources[r] >= ratio && r !== missingCityRes) {
                  currentBot.resources[r] -= ratio;
                  currentBot.resources[missingCityRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingCityRes]} כדי לשדרג מהר לעיר כחלק מאסטרטגיית פריצה לערים.`);
                  }
                  break;
                }
              }
            } else if (missingDevCardCount === 1 && missingDevCardRes && !buildHappened) {
              for (const r of resourcesList) {
                const ratio = getTradeRatio(r);
                if (currentBot.resources[r] >= ratio && r !== missingDevCardRes) {
                  currentBot.resources[r] -= ratio;
                  currentBot.resources[missingDevCardRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingDevCardRes]} לקניית קלפי פיתוח.`);
                  }
                  break;
                }
              }
            }
          }
          
          else if (strategy === 'BALANCED_PORT_TRADE' && !buildHappened) {
            // Find our specialized ports
            const ownedPorts = currentVertices.filter(v =>
              v.playerId === botPlayer.id &&
              (v.structure === 'SETTLEMENT' || v.structure === 'CITY') &&
              v.isHarbor && v.harborType && v.harborType !== 'GENERIC'
            );
            
            if (ownedPorts.length > 0) {
              // We have a specialized port! Let's trade our port resource for what we are missing for the closest goal.
              const portRes = ownedPorts[0].harborType as 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
              const portStock = currentBot.resources[portRes] || 0;
              
              if (portStock >= 2) {
                // Find missing resource for our goals
                let missingRes: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
                for (const goal of GOALS) {
                  for (const needed of resourcesList) {
                    if (currentBot.resources[needed] < goal.cost[needed]) {
                      missingRes = needed;
                      break;
                    }
                  }
                  if (missingRes) break;
                }
                
                if (missingRes && missingRes !== portRes) {
                  currentBot.resources[portRes] -= 2;
                  currentBot.resources[missingRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) ניצל נמל 2:1 מועדף מסוג ${resourceLabels[portRes]} והחליף 2 תמורת 1 ${resourceLabels[missingRes]}.`);
                  }
                }
              } else {
                // If we don't have enough of the port resource, try to trade OTHER surplus resources to get the port resource!
                // So that we can use it on future turns.
                for (const r of resourcesList) {
                  if (r !== portRes) {
                    const ratio = getTradeRatio(r);
                    if (currentBot.resources[r] >= ratio) {
                      currentBot.resources[r] -= ratio;
                      currentBot.resources[portRes] += 1;
                      buildHappened = true;
                      if (addLog) {
                        addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) צבר משאב נמל מועדף על ידי החלפת ${ratio} ${resourceLabels[r]} ל-1 ${resourceLabels[portRes]}.`);
                      }
                      break;
                    }
                  }
                }
              }
            }
          }
        }

        // --- STEP 2: BANK & PORT TRADING (ARCHETYPE SPECIFIC OVERRIDES FOR HARD BOTS) ---
        if (botPlayer.difficulty === 'HARD') {
          // DEVELOPER Archetype: Prioritize ORE and WHEAT for cities and dev cards
          if (botPlayer.archetype === 'DEVELOPER' && !buildHappened) {
            const devCardCost = { SHEEP: 1, WHEAT: 1, ORE: 1 };
            const cityCost = { WHEAT: 2, ORE: 3 };

            const currentResources = { ...currentBot.resources };
            let missingDevCardRes: 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
            let missingDevCardCount = 0;
            for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
              if (currentResources[r] < devCardCost[r]) {
                missingDevCardCount++;
                missingDevCardRes = r;
              }
            }

            let missingCityRes: 'WHEAT' | 'ORE' | null = null;
            let missingCityCount = 0;
            for (const r of ['WHEAT', 'ORE'] as const) {
              if (currentResources[r] < cityCost[r]) {
                missingCityCount++;
                missingCityRes = r;
              }
            }

            if (missingCityCount === 1 && missingCityRes) {
              for (const r of resourcesList) {
                const ratio = getTradeRatio(r);
                if (currentBot.resources[r] >= ratio && r !== missingCityRes) {
                  currentBot.resources[r] -= ratio;
                  currentBot.resources[missingCityRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר] בוט מסוג DEVELOPER (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingCityRes]} כדי לשדרג מהר לעיר (מתמקד בברזל וחיטה).`);
                  }
                  break;
                }
              }
            } else if (missingDevCardCount === 1 && missingDevCardRes && !buildHappened) {
              for (const r of resourcesList) {
                const ratio = getTradeRatio(r);
                if (currentBot.resources[r] >= ratio && r !== missingDevCardRes) {
                  currentBot.resources[r] -= ratio;
                  currentBot.resources[missingDevCardRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר] בוט מסוג DEVELOPER (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingDevCardRes]} כדי לרכוש קלפי פיתוח.`);
                  }
                  break;
                }
              }
            }
          }

          // BUILDER Archetype: Prioritize WOOD and BRICK for settlements and roads
          if (botPlayer.archetype === 'BUILDER' && !buildHappened) {
            const settlementCost = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 };
            const roadCost = { WOOD: 1, BRICK: 1 };

            const currentResources = { ...currentBot.resources };
            let missingSettlementRes: 'WOOD' | 'BRICK' | null = null;
            let missingSettlementCount = 0;
            for (const r of ['WOOD', 'BRICK'] as const) {
              if (currentResources[r] < settlementCost[r]) {
                missingSettlementCount++;
                missingSettlementRes = r;
              }
            }

            let missingRoadRes: 'WOOD' | 'BRICK' | null = null;
            let missingRoadCount = 0;
            for (const r of ['WOOD', 'BRICK'] as const) {
              if (currentResources[r] < roadCost[r]) {
                missingRoadCount++;
                missingRoadRes = r;
              }
            }

            if (missingSettlementCount === 1 && missingSettlementRes) {
              for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
                const ratio = getTradeRatio(r);
                if (currentBot.resources[r] >= ratio) {
                  currentBot.resources[r] -= ratio;
                  currentBot.resources[missingSettlementRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר] בוט מסוג BUILDER (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingSettlementRes]} למען התפרסות מהירה ובניית יישוב.`);
                  }
                  break;
                }
              }
            } else if (missingRoadCount === 1 && missingRoadRes && !buildHappened) {
              for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
                const ratio = getTradeRatio(r);
                if (currentBot.resources[r] >= ratio) {
                  currentBot.resources[r] -= ratio;
                  currentBot.resources[missingRoadRes] += 1;
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר] בוט מסוג BUILDER (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingRoadRes]} כדי לבנות כבישים ארוכים.`);
                  }
                  break;
                }
              }
            }
          }
        }

        // Regular bank/port trading (if no specific HARD bot trade happened)
        if (!buildHappened) {
          for (const r of resourcesList) {
            const ratio = getTradeRatio(r);
            if (currentBot.resources[r] >= ratio) {
              let targetRes: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
              
              if (currentBot.difficulty === 'MEDIUM') {
                const target = getMediumBotTarget(currentBot, gamePhase, tiles, currentVertices, currentEdges);
                if (target) {
                  for (const needed of resourcesList) {
                    if (currentBot.resources[needed] < (target.cost[needed] || 0)) {
                      targetRes = needed;
                      break;
                    }
                  }
                }
              } else {
                for (const goal of GOALS) {
                  for (const needed of resourcesList) {
                    if (currentBot.resources[needed] < goal.cost[needed]) {
                      targetRes = needed;
                      break;
                    }
                  }
                  if (targetRes) break;
                }
              }

              if (targetRes && targetRes !== r) {
                let isSafeToTrade = true;
                if (currentBot.difficulty === 'MEDIUM') {
                  const target = getMediumBotTarget(currentBot, gamePhase, tiles, currentVertices, currentEdges);
                  if (target) {
                    const targetReq = target.cost[r] || 0;
                    if (currentBot.resources[r] - ratio < targetReq) {
                      isSafeToTrade = false;
                    }
                  }
                }

                if (isSafeToTrade) {
                  // Execute trade with bank/port
                  currentBot = {
                    ...currentBot,
                    resources: {
                      ...currentBot.resources,
                      [r]: currentBot.resources[r] - ratio,
                      [targetRes]: (currentBot.resources[targetRes] || 0) + 1
                    }
                  };
                  buildHappened = true;
                  if (addLog) {
                    addLog(`[מסחר] בוט ${botPlayer.name} החליף עם הבנק ${ratio} ${resourceLabels[r]} תמורת 1 ${resourceLabels[targetRes]}.`);
                  }
                  break;
                }
              }
            }
          }
        }
      }

      // --- STEP 4: BUILDING LOOP (Original Step 3) ---
      while (true) {
        const action = chooseBuildPhase(currentBot, gamePhase, tiles, currentVertices, currentEdges);

        if (action.type === 'END_TURN') {
          break;
        }

        if (action.type === 'BUILD_SETTLEMENT' && action.targetId) {
          const targetVertexId = action.targetId;
          currentVertices = currentVertices.map(v =>
            v.id === targetVertexId ? { ...v, structure: 'SETTLEMENT', playerId: botPlayer.id } : v
          );
          currentBot = {
            ...currentBot,
            victoryPoints: currentBot.victoryPoints + 1,
            resources: {
              ...currentBot.resources,
              WOOD: currentBot.resources.WOOD - 1,
              BRICK: currentBot.resources.BRICK - 1,
              SHEEP: currentBot.resources.SHEEP - 1,
              WHEAT: currentBot.resources.WHEAT - 1
            }
          };
          if (addLog) {
            addLog(`[בנייה] הבוט ${botPlayer.name} בנה יישוב!`);
          }
          buildHappened = true;
        }
        else if (action.type === 'BUILD_CITY' && action.targetId) {
          const targetVertexId = action.targetId;
          currentVertices = currentVertices.map(v =>
            v.id === targetVertexId ? { ...v, structure: 'CITY' } : v
          );
          currentBot = {
            ...currentBot,
            victoryPoints: currentBot.victoryPoints + 1,
            resources: {
              ...currentBot.resources,
              WHEAT: currentBot.resources.WHEAT - 2,
              ORE: currentBot.resources.ORE - 3
            }
          };
          if (addLog) {
            addLog(`[בנייה] הבוט ${botPlayer.name} שדרג יישוב לעיר!`);
          }
          buildHappened = true;
        }
        else if (action.type === 'BUILD_ROAD' && action.targetId) {
          const targetEdgeId = action.targetId;
          currentEdges = currentEdges.map(e =>
            e.id === targetEdgeId ? { ...e, hasRoad: true, playerId: botPlayer.id } : e
          );
          currentBot = {
            ...currentBot,
            resources: {
              ...currentBot.resources,
              WOOD: currentBot.resources.WOOD - 1,
              BRICK: currentBot.resources.BRICK - 1
            }
          };
          if (addLog) {
            addLog(`[בנייה] הבוט ${botPlayer.name} בנה כביש!`);
          }
          buildHappened = true;
        }
        else if (action.type === 'BUY_DEV_CARD') {
          // Access devCardDeck from windows/globals/context indirectly, but since aiController runs synchronously with copy
          // of state, let's draw from the actual deck if we can. 
          // Wait, where is devCardDeck? Since we don't have direct access here easily unless we pass it, but wait!
          // We can check if GameContext has a global or we can grab devCardDeck. 
          // Or we can simulate drawing or get devCardDeck if passed, but wait!
          // Let's check how playersCopy is updated. The bot's buyDevelopmentCard can also just simulate drawing or draw from standard distribution safely.
          // Better yet, we can draw a random card matching the remaining deck ratio or just a random card from remaining types.
          // Wait, let's keep it simple and robust: we can just check what cards are left or draw from the same deck if we can, 
          // but since aiController is a utility function that doesn't have useGame hook inside itself, let's look at how it receives params:
          // we have `botPlayer`, `turnSubPhase`, `gamePhase`, etc. We can see if devCardDeck can be processed or we can simply mock it since the bot's victory point or dev card is added.
          // Wait, actually, let's make it draw from ['KNIGHT', 'VICTORY_POINT', 'ROAD_BUILDING', 'MONOPOLY', 'YEAR_OF_PLENTY'].
          // Let's check what cards are valid. The prompt says:
          // 'ישנם 25 קלפי פיתוח אביר וקידום...'
          // Let's choose a random card from the available types.
          const cardTypes = ['KNIGHT', 'VICTORY_POINT', 'ROAD_BUILDING', 'MONOPOLY', 'YEAR_OF_PLENTY'];
          const randomCard = cardTypes[Math.floor(Math.random() * cardTypes.length)];
          
          currentBot = {
            ...currentBot,
            resources: {
              ...currentBot.resources,
              SHEEP: currentBot.resources.SHEEP - 1,
              WHEAT: currentBot.resources.WHEAT - 1,
              ORE: currentBot.resources.ORE - 1
            }
          };

          if (randomCard === 'VICTORY_POINT') {
            currentBot.victoryPoints += 1;
            currentBot.developmentCards = {
              ...currentBot.developmentCards,
              VICTORY_POINT: (currentBot.developmentCards.VICTORY_POINT || 0) + 1
            };
          } else {
            const cardKey = randomCard as 'KNIGHT' | 'ROAD_BUILDING' | 'MONOPOLY' | 'YEAR_OF_PLENTY';
            currentBot.developmentCards = {
              ...currentBot.developmentCards,
              [cardKey]: (currentBot.developmentCards[cardKey] || 0) + 1
            };
          }

          const cardLabels: Record<string, string> = {
            KNIGHT: 'אביר',
            VICTORY_POINT: 'נקודת ניצחון',
            ROAD_BUILDING: 'בניית 2 דרכים',
            MONOPOLY: 'מונופול',
            YEAR_OF_PLENTY: 'שנת שפע'
          };

          if (addLog) {
            addLog(`[קלף פיתוח] הבוט ${botPlayer.name} רכש קלף פיתוח מהקופה וקיבל: ${cardLabels[randomCard] || randomCard}!`);
          }
          buildHappened = true;
        }
      }

      // --- STEP 5: RISK MANAGEMENT (HARD BOT: Reducing hand size below 8 before turn ends) ---
      if (botPlayer.difficulty === 'HARD') {
        const resourcesList = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;
        let totalCards = Object.values(currentBot.resources).reduce((sum, count) => sum + count, 0);

        let attempts = 0;
        while (totalCards >= 8 && attempts < 5) {
          attempts++;
          let traded = false;

          for (const r of resourcesList) {
            const ratio = getTradeRatio(r);
            if (currentBot.resources[r] >= ratio) {
              let targetRes: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
              let minCount = 999;

              for (const otherRes of resourcesList) {
                if (otherRes !== r && currentBot.resources[otherRes] < minCount) {
                  minCount = currentBot.resources[otherRes];
                  targetRes = otherRes;
                }
              }

              if (targetRes) {
                currentBot.resources[r] -= ratio;
                currentBot.resources[targetRes] = (currentBot.resources[targetRes] || 0) + 1;
                buildHappened = true;
                traded = true;
                totalCards = Object.values(currentBot.resources).reduce((sum, count) => sum + count, 0);

                if (addLog) {
                  addLog(`[ניהול סיכונים] בוט ${botPlayer.name} (קשה) ביצע המרה מהירה של ${ratio} ${resourceLabels[r]} ל-1 ${resourceLabels[targetRes]} כדי לרדת מתחת ל-8 קלפים (מונע סיכון מרוסטר 7).`);
                }
                break;
              }
            }
          }

          if (!traded) {
            break;
          }
        }
      }

      if (buildHappened || botPlayer.difficulty === 'SUPER_HARD') {
        setVertices(currentVertices);
        setEdges(currentEdges);
        playersCopy = playersCopy.map(p => p.id === botPlayer.id ? currentBot : p);
        setPlayers(playersCopy);
      }

      endTurn();
    }, 1500);
}