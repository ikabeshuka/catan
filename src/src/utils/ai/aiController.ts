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

  const isSetupPhase = gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2';

  if (isSetupPhase) {
    setupPhase(params);
    return;
  }

  if (turnSubPhase === 'ROBBER_PLACEMENT') {
    robberPhase(params);
    return;
  }

  if (turnSubPhase === 'BEFORE_ROLL') {
    setTimeout(() => { handleDiceRoll(); }, 1200);
    return;
  }

  if (turnSubPhase === 'TRADE_AND_BUILD') {
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