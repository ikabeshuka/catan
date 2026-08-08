import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { HexTile } from '../../types/hex.types';
import { TurnSubPhase } from '../../types/game.types';
import { GamePhase } from '../../context/GameContext';
import { setupPhase } from './phases/setupPhase';
import { robberPhase } from './phases/robberPhase';
import { tradeAndBuildPhase } from './phases/tradeAndBuildPhase';
import { serializeBoardState } from '../../services/gemini/boardSerializer';
import { getGeminiStrategy, DEFAULT_GEMINI_MODEL } from '../../services/gemini/geminiService';
import { LegalActions, GeminiStrategyPlan } from '../../services/gemini/geminiTypes';
import { GameAction } from '../../types/gameActions.types';
import { chooseBotReactiveAction, chooseCitiesKnightsBuildAction, getCitiesKnightsBotPlan } from './botReactiveActions';
import { chooseBuildPhase } from './decisionMakers/chooseBuildPhase';
import { canExtendPirateShippingLine, getPirateShippingPath, getPirateShippingLine } from '../gameEngine/pirateIslands';
import { calculateBotYields } from './evaluators/aiYieldEvaluator';

interface AIControllerParams {
  botPlayer: Player;
  turnSubPhase: TurnSubPhase;
  gamePhase: GamePhase;
  tiles: HexTile[];
  vertices: BoardVertex[];
  edges: BoardEdge[];
  players: Player[];
  addLog?: (message: string) => void;
  handleDiceRoll: () => any;
  endTurn: () => void;
  setVertices: React.Dispatch<React.SetStateAction<BoardVertex[]>>;
  setEdges: React.Dispatch<React.SetStateAction<BoardEdge[]>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  buyDevelopmentCard: (forcedCardType?: string) => void;
  recordSetupPlacement: (type: 'SETTLEMENT' | 'ROAD', targetId: string) => void;
  setTiles?: React.Dispatch<React.SetStateAction<HexTile[]>>;
  setTurnSubPhase?: React.Dispatch<React.SetStateAction<TurnSubPhase>>;
  gameState: any;
  boardState: any;
  playerState: any;
  legalActions: LegalActions;
  selectedScenario?: string;
  activeExpansion?: string;
  resourceBank?: any;
  commodityBank?: any;
  goldSelectionQueue?: any[];
  devCardDeck?: string[];
  robberyState?: any;
  citiesKnightsState?: any;
  hasMovedShipThisTurn?: boolean;
  currentTurnBuiltShips?: string[];
  isOnline?: boolean;
  dispatchAction?: (action: GameAction) => void;
}

export async function runAITurn(params: AIControllerParams): Promise<void> {
  const { 
    botPlayer, 
    turnSubPhase, 
    gamePhase, 
    addLog, 
    handleDiceRoll, 
    gameState,
    boardState,
    playerState,
    legalActions,
  } = params;

  // Keep params referenced to prevent TS compilation issues
  const { tiles, vertices, edges, players, setVertices, setEdges, setPlayers, buyDevelopmentCard, recordSetupPlacement, setTiles, setTurnSubPhase } = params;
  const _dummy = [tiles, vertices, edges, players, setVertices, setEdges, setPlayers, buyDevelopmentCard, recordSetupPlacement, setTiles, setTurnSubPhase];
  if (_dummy.length === 0) { console.log(_dummy); }

  const isSetupPhase = ['SETUP_ROUND_1', 'SETUP_ROUND_2', 'SETUP_ROUND_3'].includes(gamePhase);

  const dispatchBotAction = (action: GameAction, endAfter = false) => {
    if (!params.dispatchAction) return false;
    setTimeout(() => {
      params.dispatchAction?.(action);
      if (endAfter) setTimeout(() => params.dispatchAction?.({ type: 'END_TURN', playerId: botPlayer.id }), 500);
    }, 700);
    return true;
  };

  const toBuildAction = (build: ReturnType<typeof chooseBuildPhase>): GameAction | null => {
    if (build.type === 'BUILD_SETTLEMENT' && build.targetId) return { type: 'BUILD_SETTLEMENT', playerId: botPlayer.id, vertexId: build.targetId };
    if (build.type === 'BUILD_CITY' && build.targetId) return { type: 'BUILD_CITY', playerId: botPlayer.id, vertexId: build.targetId };
    if (build.type === 'BUILD_ROAD' && build.targetId) return { type: 'BUILD_ROAD', playerId: botPlayer.id, edgeId: build.targetId };
    if (build.type === 'BUILD_SHIP' && build.targetId) return { type: 'BUILD_SHIP', playerId: botPlayer.id, edgeId: build.targetId };
    if (build.type === 'BUY_DEV_CARD' && params.devCardDeck?.[0]) return { type: 'BUY_DEV_CARD', playerId: botPlayer.id, cardType: params.devCardDeck[0] as any };
    return null;
  };

  const refreshAdvancedStrategy = () => {
    if (!['HARD', 'SUPER_HARD'].includes(botPlayer.difficulty || '')) return;
    const { yields, hasPort } = calculateBotYields(botPlayer.id, vertices, tiles, false);
    const leader = players.filter(player => player.id !== botPlayer.id).sort((left, right) => (right.victoryPoints || 0) - (left.victoryPoints || 0))[0];
    const cityFocused = (botPlayer.resources.WHEAT || 0) + (botPlayer.resources.ORE || 0) >= 4 ||
      (leader?.victoryPoints || 0) > (botPlayer.victoryPoints || 0) + 2;
    if (botPlayer.difficulty === 'HARD') {
      (botPlayer as any).archetype = cityFocused || (yields.ORE || 0) + (yields.WHEAT || 0) > (yields.WOOD || 0) + (yields.BRICK || 0)
        ? 'DEVELOPER'
        : 'BUILDER';
      return;
    }
    (botPlayer as any).botStrategy = cityFocused
      ? 'CITY_DEV_BURST'
      : hasPort && Object.values(yields).some(value => value > 0)
        ? 'BALANCED_PORT_TRADE'
        : 'LONG_ROAD_EXPANSION';
  };

  // Mandatory and interrupting sub-phases never fall through to the old
  // build script.  This is especially important for bots in online rooms:
  // their choices are submitted as regular server-validated actions.
  const reactiveAction = chooseBotReactiveAction({
    botPlayer,
    turnSubPhase,
    players,
    vertices,
    edges,
    tiles,
    resourceBank: params.resourceBank,
    commodityBank: params.commodityBank,
    goldSelectionQueue: params.goldSelectionQueue,
    robberyState: params.robberyState,
    citiesKnightsState: params.citiesKnightsState,
    hasMovedShipThisTurn: params.hasMovedShipThisTurn,
    currentTurnBuiltShips: params.currentTurnBuiltShips,
  });
  if (reactiveAction && turnSubPhase !== 'TRADE_AND_BUILD') {
    dispatchBotAction(reactiveAction);
    return;
  }

  if (isSetupPhase) {
    setupPhase(params);
    return;
  }

  if (turnSubPhase === 'ROBBER_PLACEMENT') {
    robberPhase(params);
    return;
  }

  if (turnSubPhase === 'BEFORE_ROLL') {
    if (params.isOnline && params.dispatchAction) {
      dispatchBotAction({ type: 'ROLL_DICE', playerId: botPlayer.id });
    } else {
      setTimeout(() => { handleDiceRoll(); }, 1200);
    }
    return;
  }

  if (turnSubPhase === 'TRADE_AND_BUILD') {
    if (reactiveAction?.type === 'MOVE_SHIP' && params.dispatchAction) {
      dispatchBotAction(reactiveAction, true);
      return;
    }
    // Cities & Knights has an additional action economy. Execute its
    // priorities before the base-game builder, then finish the turn through
    // the dispatcher so that local and online games follow identical rules.
    if (['CITIES_AND_KNIGHTS', 'SEAFARERS_AND_CITIES_AND_KNIGHTS'].includes(params.activeExpansion || '') && params.dispatchAction) {
      const plan = getCitiesKnightsBotPlan({
        botPlayer, turnSubPhase, players, vertices, edges, tiles,
        resourceBank: params.resourceBank, commodityBank: params.commodityBank,
        goldSelectionQueue: params.goldSelectionQueue, robberyState: params.robberyState,
        citiesKnightsState: params.citiesKnightsState,
        hasMovedShipThisTurn: params.hasMovedShipThisTurn, currentTurnBuiltShips: params.currentTurnBuiltShips,
      });
      if (['HARD', 'SUPER_HARD'].includes(botPlayer.difficulty || '') && (botPlayer as any).lastCitiesKnightsPlan !== plan) {
        (botPlayer as any).lastCitiesKnightsPlan = plan;
        addLog?.(`[אסטרטגיה] ${botPlayer.name}: ${plan === 'DEFEND_CATAN' ? 'הגנת קטאן מפני הברברים' : plan === 'METROPOLIS_RACE' ? 'מרוץ למטרופולין' : plan === 'PRESSURE_LEADER' ? 'לחץ על המוביל' : 'התרחבות כלכלית'}.`);
      }
      const citiesKnightsAction = reactiveAction || chooseCitiesKnightsBuildAction({
        botPlayer,
        turnSubPhase,
        players,
        vertices,
        edges,
        tiles,
        resourceBank: params.resourceBank,
        commodityBank: params.commodityBank,
        goldSelectionQueue: params.goldSelectionQueue,
        robberyState: params.robberyState,
        citiesKnightsState: params.citiesKnightsState,
        hasMovedShipThisTurn: params.hasMovedShipThisTurn,
        currentTurnBuiltShips: params.currentTurnBuiltShips,
      });
      if (citiesKnightsAction) {
        dispatchBotAction(citiesKnightsAction, true);
      } else {
        refreshAdvancedStrategy();
        const baseBuildAction = toBuildAction(chooseBuildPhase(botPlayer, gamePhase, tiles, vertices, edges));
        dispatchBotAction(baseBuildAction || { type: 'END_TURN', playerId: botPlayer.id }, Boolean(baseBuildAction));
      }
      return;
    }

    if (params.selectedScenario === 'PIRATE_ISLANDS' && params.dispatchAction) {
      const fortress = vertices.find(vertex => vertex.pirateFortress?.playerId === botPlayer.id && !vertex.pirateFortress.conquered);
      const completedPath = getPirateShippingPath(tiles, vertices, edges, botPlayer.id);
      const warships = (completedPath || []).filter(edge => edge.isWarship);
      if (fortress && warships.length) {
        dispatchBotAction({ type: 'ATTACK_PIRATE_FORTRESS', playerId: botPlayer.id, fortressVertexId: fortress.id });
        return;
      }
      const shippingLine = getPirateShippingLine(tiles, vertices, edges, botPlayer.id);
      if (shippingLine?.length && !botPlayer.playedDevCardThisTurn && (botPlayer.developmentCards?.KNIGHT || 0) > (botPlayer.boughtDevCardsThisTurn?.KNIGHT || 0)) {
        dispatchBotAction({ type: 'PLAY_DEV_CARD', playerId: botPlayer.id, cardType: 'KNIGHT' }, true);
        return;
      }
      if ((botPlayer.resources.WOOD || 0) >= 1 && (botPlayer.resources.SHEEP || 0) >= 1) {
        const nextShip = edges.find(edge => !edge.hasRoad && !edge.hasShip && canExtendPirateShippingLine(tiles, vertices, edges, botPlayer.id, edge));
        if (nextShip) {
          dispatchBotAction({ type: 'BUILD_SHIP', playerId: botPlayer.id, edgeId: nextShip.id }, true);
          return;
        }
      }
    }

    // Online bots must not mutate a browser-only copy of the board. Submit a
    // single strategic build through the authoritative server, then finish.
    if (params.isOnline && params.dispatchAction) {
      refreshAdvancedStrategy();
      const action = toBuildAction(chooseBuildPhase(botPlayer, gamePhase, tiles, vertices, edges)) || { type: 'END_TURN', playerId: botPlayer.id } as GameAction;
      dispatchBotAction(action, action.type !== 'END_TURN');
      return;
    }
    const geminiApiKey = localStorage.getItem('CATAN_GEMINI_API_KEY');
    const savedModel = localStorage.getItem('CATAN_GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;

    if (botPlayer.playerType === 'GEMINI_AI' && geminiApiKey) {
      const activeStrategy: GeminiStrategyPlan | undefined = (botPlayer as any).activeStrategy;

      // בדיקה אם יריב תפס את צומת היעד המתוכנן (Target Stolen Trigger)
      const targetStolen = activeStrategy?.targetVertexId && 
        params.vertices.some(v => v.id === activeStrategy.targetVertexId && v.structure && v.playerId !== botPlayer.id);

      // פנייה ל-Gemini מתרחשת רק אם אין אסטרטגיה, אם פג תוקפה (TTL <= 0), או אם היעד נתפס!
      const needsNewStrategy = !activeStrategy || activeStrategy.ttlTurns <= 0 || targetStolen;

      if (needsNewStrategy) {
        addLog?.(`🤖 ${botPlayer.name} מנסח תוכנית אסטרטגית חדשה מול Gemini (${savedModel})...`);
        try {
          const boardSnapshot = serializeBoardState(gameState, boardState, playerState, botPlayer.id, legalActions);
          const strategyPlan = await getGeminiStrategy(geminiApiKey, boardSnapshot, savedModel);

          (botPlayer as any).activeStrategy = strategyPlan;
          addLog?.(`🤖 ${botPlayer.name} (אסטרטגיה): ${strategyPlan.reasoningInHebrew}`);
        } catch (error) {
          console.error('Gemini Strategy Request Failed:', error);
          addLog?.(`❌ ${botPlayer.name}: שגיאה ב-Gemini. מפעיל לוגיקה מקומית.`);
        }
      } else {
        // ניכוי תור אחד ממכסת התוקף (TTL) של האסטרטגיה הקיימת
        activeStrategy.ttlTurns -= 1;
        addLog?.(`🤖 ${botPlayer.name} פועל לפי תוכנית קיימת (${activeStrategy.goal}, נותרו עוד ${activeStrategy.ttlTurns} תורות לרענון).`);
      }
    }

    // ביצוע מהלכים טקטיים מקומיים ומהירים ללא קריאות רשת נוספות
    tradeAndBuildPhase(params);
    return;
  }
}
