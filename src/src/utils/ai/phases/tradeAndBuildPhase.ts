import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { Player } from '../../../types/player.types';
import { HexTile } from '../../../types/hex.types';
import { GamePhase } from '../../../context/GameContext';
import { TurnSubPhase } from '../../../types/game.types';
import { chooseBuildPhase } from '../decisionMakers/chooseBuildPhase';
import { evaluateEdges } from '../evaluators/evaluateEdges';
import { getMediumBotTarget } from '../getMediumBotTarget';

// New imports
import { calculateBotYields } from '../evaluators/aiYieldEvaluator';
import { evaluateAndExecuteTrades, getTradeRatio } from '../evaluators/aiTradeEvaluator';
import { handleDevelopmentCardsPlay, handleBuyDevCard } from '../helpers/devCardManager';
import { handleRiskManagement } from '../helpers/riskManager';
import { longestRoadStrategy } from '../strategies/longestRoadStrategy';
import { cityDevStrategy } from '../strategies/cityDevStrategy';
import { balancedPortStrategy } from '../strategies/balancedPortStrategy';

const STRATEGIES = {
  LONG_ROAD_EXPANSION: longestRoadStrategy,
  CITY_DEV_BURST: cityDevStrategy,
  BALANCED_PORT_TRADE: balancedPortStrategy
};

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
  buyDevelopmentCard: (forcedCardType?: string) => void;
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
  buyDevelopmentCard,
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

    const resourceLabels: Record<string, string> = {
      WOOD: 'עץ',
      BRICK: 'לבנה',
      SHEEP: 'כבש',
      WHEAT: 'חיטה',
      ORE: 'ברזל'
    };

    // Adaptive Strategy Selection for SUPER_HARD bot
    if (currentBot.difficulty === 'SUPER_HARD') {
      if (!currentBot.botStrategy) {
        // Analyze starting settlements to choose initial strategy
        const { yields, hasPort } = calculateBotYields(currentBot.id, currentVertices, tiles, true);
        const woodBrick = (yields.WOOD || 0) + (yields.BRICK || 0);
        const oreWheat = (yields.ORE || 0) + (yields.WHEAT || 0);

        if (hasPort) {
          currentBot.botStrategy = 'BALANCED_PORT_TRADE';
        } else if (woodBrick >= oreWheat) {
          currentBot.botStrategy = 'LONG_ROAD_EXPANSION';
        } else {
          currentBot.botStrategy = 'CITY_DEV_BURST';
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
      } else if (currentBot.turnsPlayed % 4 === 0) {
        // Re-evaluation Loop (Audit) every 4 turns
        const { yields, hasPort } = calculateBotYields(currentBot.id, currentVertices, tiles, false);
        let needsPivot = false;
        const currentStrat = currentBot.botStrategy;

        if (currentStrat === 'LONG_ROAD_EXPANSION') {
          const roadMoves = evaluateEdges(currentBot.id, gamePhase, tiles, currentVertices, currentEdges, 'HARD');
          if ((yields.WOOD || 0) + (yields.BRICK || 0) === 0 || roadMoves.length === 0) {
            needsPivot = true;
          }
        } else if (currentStrat === 'CITY_DEV_BURST') {
          if ((yields.ORE || 0) + (yields.WHEAT || 0) === 0) {
            needsPivot = true;
          }
        } else if (currentStrat === 'BALANCED_PORT_TRADE') {
          const totalActive = Object.values(yields).reduce((sum, val) => sum + val, 0);
          if (totalActive === 0) {
            needsPivot = true;
          }
        }

        if (needsPivot) {
          let newStrat: 'LONG_ROAD_EXPANSION' | 'CITY_DEV_BURST' | 'BALANCED_PORT_TRADE' = currentStrat;
          if (hasPort && Object.values(yields).some(y => y > 0)) {
            newStrat = 'BALANCED_PORT_TRADE';
          } else {
            const activeWoodBrick = (yields.WOOD || 0) + (yields.BRICK || 0);
            const activeOreWheatSum = (yields.ORE || 0) + (yields.WHEAT || 0);
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

    // --- PLAY DEVELOPMENT CARD ---
    const devCardPlayRes = handleDevelopmentCardsPlay({
      botPlayer: currentBot,
      tiles,
      vertices: currentVertices,
      edges: currentEdges,
      players: playersCopy,
      gamePhase,
      resourceLabels,
      addLog,
      setPlayers,
      setTurnSubPhase
    });

    if (devCardPlayRes.stopTurn) {
      return; // Stop execution of this turn, it will continue after robber is placed
    }

    currentBot = devCardPlayRes.updatedBot;
    currentEdges = devCardPlayRes.updatedEdges;
    playersCopy = devCardPlayRes.updatedPlayers;
    if (devCardPlayRes.played) {
      buildHappened = true;
    }

    // --- STEP 1: PLAYER & BOT TRADING ---
    const tradeRes = evaluateAndExecuteTrades({
      botPlayer: currentBot,
      players: playersCopy,
      vertices: currentVertices,
      edges: currentEdges,
      tiles,
      gamePhase,
      resourceLabels,
      addLog
    });

    currentBot = tradeRes.updatedBot;
    playersCopy = tradeRes.updatedPlayers;
    if (tradeRes.buildHappened) {
      buildHappened = true;
    }

    // --- STEP 2: BANK & PORT TRADING (STRATEGIC & ARCHETYPE OVERRIDES) ---
    const resourcesList = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;

    if (currentBot.difficulty === 'SUPER_HARD' && !buildHappened) {
      const strategyName = currentBot.botStrategy || 'LONG_ROAD_EXPANSION';
      const strategy = STRATEGIES[strategyName];
      if (strategy) {
        const stratTradeRes = strategy.executeStrategicTrade({
          botPlayer: currentBot,
          vertices: currentVertices,
          edges: currentEdges,
          tiles,
          gamePhase,
          getTradeRatio: (r) => getTradeRatio(currentBot.id, currentVertices, r),
          resourceLabels,
          addLog
        });
        if (stratTradeRes) {
          currentBot = stratTradeRes.updatedBot;
          buildHappened = stratTradeRes.buildHappened;
        }
      }
    }

    if (currentBot.difficulty === 'HARD' && !buildHappened) {
      // DEVELOPER Archetype
      if (currentBot.archetype === 'DEVELOPER') {
        const devCardCost = { SHEEP: 1, WHEAT: 1, ORE: 1 };
        const cityCost = { WHEAT: 2, ORE: 3 };

        const currentResources = { ...currentBot.resources };
        let missingDevCardRes: 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
        let missingDevCardCount = 0;
        for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
          if ((currentResources[r] || 0) < devCardCost[r]) {
            missingDevCardCount++;
            missingDevCardRes = r;
          }
        }

        let missingCityRes: 'WHEAT' | 'ORE' | null = null;
        let missingCityCount = 0;
        for (const r of ['WHEAT', 'ORE'] as const) {
          if ((currentResources[r] || 0) < cityCost[r]) {
            missingCityCount++;
            missingCityRes = r;
          }
        }

        if (missingCityCount === 1 && missingCityRes) {
          for (const r of resourcesList) {
            const ratio = getTradeRatio(currentBot.id, currentVertices, r);
            if ((currentBot.resources[r] || 0) >= ratio && r !== missingCityRes) {
              currentBot.resources[r] = (currentBot.resources[r] || 0) - ratio;
              currentBot.resources[missingCityRes] = (currentBot.resources[missingCityRes] || 0) + 1;
              buildHappened = true;
              if (addLog) {
                addLog(`[מסחר] בוט מסוג DEVELOPER (${currentBot.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingCityRes]} כדי לשדרג מהר לעיר (מתמקד בברזל וחיטה).`);
              }
              break;
            }
          }
        } else if (missingDevCardCount === 1 && missingDevCardRes && !buildHappened) {
          for (const r of resourcesList) {
            const ratio = getTradeRatio(currentBot.id, currentVertices, r);
            if ((currentBot.resources[r] || 0) >= ratio && r !== missingDevCardRes) {
              currentBot.resources[r] = (currentBot.resources[r] || 0) - ratio;
              currentBot.resources[missingDevCardRes] = (currentBot.resources[missingDevCardRes] || 0) + 1;
              buildHappened = true;
              if (addLog) {
                addLog(`[מסחר] בוט מסוג DEVELOPER (${currentBot.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingDevCardRes]} כדי לרכוש קלפי פיתוח.`);
              }
              break;
            }
          }
        }
      }

      // BUILDER Archetype
      if (currentBot.archetype === 'BUILDER' && !buildHappened) {
        const settlementCost = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 };
        const roadCost = { WOOD: 1, BRICK: 1 };

        const currentResources = { ...currentBot.resources };
        let missingSettlementRes: 'WOOD' | 'BRICK' | null = null;
        let missingSettlementCount = 0;
        for (const r of ['WOOD', 'BRICK'] as const) {
          if ((currentResources[r] || 0) < settlementCost[r]) {
            missingSettlementCount++;
            missingSettlementRes = r;
          }
        }

        let missingRoadRes: 'WOOD' | 'BRICK' | null = null;
        let missingRoadCount = 0;
        for (const r of ['WOOD', 'BRICK'] as const) {
          if ((currentResources[r] || 0) < roadCost[r]) {
            missingRoadCount++;
            missingRoadRes = r;
          }
        }

        if (missingSettlementCount === 1 && missingSettlementRes) {
          for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
            const ratio = getTradeRatio(currentBot.id, currentVertices, r);
            if ((currentBot.resources[r] || 0) >= ratio) {
              currentBot.resources[r] = (currentBot.resources[r] || 0) - ratio;
              currentBot.resources[missingSettlementRes] = (currentBot.resources[missingSettlementRes] || 0) + 1;
              buildHappened = true;
              if (addLog) {
                addLog(`[מסחר] בוט מסוג BUILDER (${currentBot.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingSettlementRes]} למען התפרסות מהירה ובניית יישוב.`);
              }
              break;
            }
          }
        } else if (missingRoadCount === 1 && missingRoadRes && !buildHappened) {
          for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
            const ratio = getTradeRatio(currentBot.id, currentVertices, r);
            if ((currentBot.resources[r] || 0) >= ratio) {
              currentBot.resources[r] = (currentBot.resources[r] || 0) - ratio;
              currentBot.resources[missingRoadRes] = (currentBot.resources[missingRoadRes] || 0) + 1;
              buildHappened = true;
              if (addLog) {
                addLog(`[מסחר] בוט מסוג BUILDER (${currentBot.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingRoadRes]} כדי לבנות כבישים ארוכים.`);
              }
              break;
            }
          }
        }
      }
    }

    // Regular bank/port trading (if no specific strategic trade happened)
    if (!buildHappened && currentBot.difficulty !== 'EASY') {
      const GOALS = [
        { type: 'CITY', cost: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 } },
        { type: 'SETTLEMENT', cost: { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 } },
        { type: 'ROAD', cost: { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 } },
        { type: 'SHIP', cost: { WOOD: 1, BRICK: 0, SHEEP: 1, WHEAT: 0, ORE: 0 } },
        { type: 'DEV_CARD', cost: { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 } }
      ];

      for (const r of resourcesList) {
        const ratio = getTradeRatio(currentBot.id, currentVertices, r);
        if ((currentBot.resources[r] || 0) >= ratio) {
          let targetRes: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
          
          if (currentBot.difficulty === 'MEDIUM') {
            const target = getMediumBotTarget(currentBot, gamePhase, tiles, currentVertices, currentEdges);
            if (target) {
              for (const needed of resourcesList) {
                if ((currentBot.resources[needed] || 0) < (target.cost[needed] || 0)) {
                  targetRes = needed;
                  break;
                }
              }
            }
          } else {
            for (const goal of GOALS) {
              for (const needed of resourcesList) {
                if ((currentBot.resources[needed] || 0) < goal.cost[needed]) {
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
                if ((currentBot.resources[r] || 0) - ratio < targetReq) {
                  isSafeToTrade = false;
                }
              }
            }

            if (isSafeToTrade) {
              currentBot = {
                ...currentBot,
                resources: {
                  ...currentBot.resources,
                  [r]: (currentBot.resources[r] || 0) - ratio,
                  [targetRes]: ((currentBot.resources[targetRes] || 0) + 1)
                }
              };
              buildHappened = true;
              if (addLog) {
                addLog(`[מסחר] בוט ${currentBot.name} החליף עם הבנק ${ratio} ${resourceLabels[r]} תמורת 1 ${resourceLabels[targetRes]}.`);
              }
              break;
            }
          }
        }
      }
    }

    // --- STEP 4: BUILDING LOOP ---
    while (true) {
      const action = chooseBuildPhase(currentBot, gamePhase, tiles, currentVertices, currentEdges);

      if (action.type === 'END_TURN') {
        break;
      }

      if (action.type === 'BUILD_SETTLEMENT' && action.targetId) {
        const targetVertexId = action.targetId;
        currentVertices = currentVertices.map(v =>
          v.id === targetVertexId ? { ...v, structure: 'SETTLEMENT', playerId: currentBot.id } : v
        );
        currentBot = {
          ...currentBot,
          victoryPoints: (currentBot.victoryPoints || 0) + 1,
          resources: {
            ...currentBot.resources,
            WOOD: (currentBot.resources.WOOD || 0) - 1,
            BRICK: (currentBot.resources.BRICK || 0) - 1,
            SHEEP: (currentBot.resources.SHEEP || 0) - 1,
            WHEAT: (currentBot.resources.WHEAT || 0) - 1
          }
        };
        if (addLog) {
          addLog(`[בנייה] הבוט ${currentBot.name} בנה יישוב!`);
        }
        buildHappened = true;
      } else if (action.type === 'BUILD_CITY' && action.targetId) {
        const targetVertexId = action.targetId;
        currentVertices = currentVertices.map(v =>
          v.id === targetVertexId ? { ...v, structure: 'CITY' } : v
        );
        currentBot = {
          ...currentBot,
          victoryPoints: (currentBot.victoryPoints || 0) + 1,
          resources: {
            ...currentBot.resources,
            WHEAT: (currentBot.resources.WHEAT || 0) - 2,
            ORE: (currentBot.resources.ORE || 0) - 3
          }
        };
        if (addLog) {
          addLog(`[בנייה] הבוט ${currentBot.name} שדרג יישוב לעיר!`);
        }
        buildHappened = true;
      } else if (action.type === 'BUILD_ROAD' && action.targetId) {
        const targetEdgeId = action.targetId;
        currentEdges = currentEdges.map(e =>
          e.id === targetEdgeId ? { ...e, hasRoad: true, playerId: currentBot.id } : e
        );
        currentBot = {
          ...currentBot,
          resources: {
            ...currentBot.resources,
            WOOD: (currentBot.resources.WOOD || 0) - 1,
            BRICK: (currentBot.resources.BRICK || 0) - 1
          }
        };
        if (addLog) {
          addLog(`[בנייה] הבוט ${currentBot.name} בנה כביש!`);
        }
        buildHappened = true;
      } else if (action.type === 'BUILD_SHIP' && action.targetId) {
        const targetEdgeId = action.targetId;
        currentEdges = currentEdges.map(e =>
          e.id === targetEdgeId ? { ...e, hasShip: true, shipPlayerId: currentBot.id, playerId: currentBot.id } : e
        );
        currentBot = {
          ...currentBot,
          resources: {
            ...currentBot.resources,
            WOOD: (currentBot.resources.WOOD || 0) - 1,
            SHEEP: (currentBot.resources.SHEEP || 0) - 1
          }
        };
        if (addLog) {
          addLog(`[בנייה] הבוט ${currentBot.name} בנה ספינה!`);
        }
        buildHappened = true;
      } else if (action.type === 'BUY_DEV_CARD') {
        // Commit all decisions made so far before the shared deck transaction.
        // Returning prevents the local bot snapshot from overwriting the card
        // drawn by PlayerContext's buyDevelopmentCard state update.
        setVertices(currentVertices);
        setEdges(currentEdges);
        playersCopy = playersCopy.map(p => p.id === currentBot.id ? currentBot : p);
        setPlayers(playersCopy);
        handleBuyDevCard(buyDevelopmentCard);
        endTurn();
        return;
      }
    }

    // --- STEP 5: RISK MANAGEMENT ---
    if (currentBot.difficulty === 'HARD') {
      const riskRes = handleRiskManagement({
        botPlayer: currentBot,
        getTradeRatio: (r) => getTradeRatio(currentBot.id, currentVertices, r),
        resourceLabels,
        addLog
      });
      currentBot = riskRes.updatedBot;
      if (riskRes.buildHappened) {
        buildHappened = true;
      }
    }

    if (buildHappened || currentBot.difficulty === 'SUPER_HARD') {
      setVertices(currentVertices);
      setEdges(currentEdges);
      playersCopy = playersCopy.map(p => p.id === currentBot.id ? currentBot : p);
      setPlayers(playersCopy);
    }

    endTurn();
  }, 1500);
}
