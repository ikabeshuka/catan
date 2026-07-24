import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { HexTile } from '../../types/hex.types';
import { TurnSubPhase } from '../../types/game.types';
import { GamePhase } from '../../context/GameContext';
import { setupPhase } from './phases/setupPhase';
import { robberPhase } from './phases/robberPhase';
import { tradeAndBuildPhase } from './phases/tradeAndBuildPhase';
import { serializeBoardState } from '../../services/gemini/boardSerializer';
import { getGeminiMove } from '../../services/gemini/geminiService';
import { LegalActions } from '../../services/gemini/geminiTypes';

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
    endTurn, 
    gameState,
    boardState,
    playerState,
    legalActions,
  } = params;

  // Keep params referenced to prevent TS compilation issues
  const { tiles, vertices, edges, players, setVertices, setEdges, setPlayers, recordSetupPlacement, setTiles, setTurnSubPhase } = params;
  const _dummy = [tiles, vertices, edges, players, setVertices, setEdges, setPlayers, recordSetupPlacement, setTiles, setTurnSubPhase];
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

    if (botPlayer.playerType === 'GEMINI_AI' && geminiApiKey) {
      addLog?.(`🤖 ${botPlayer.name} מתייעץ עם Gemini AI...`);
      try {
        const boardSnapshot = serializeBoardState(gameState, boardState, playerState, botPlayer.id, legalActions);
        const geminiResponse = await getGeminiMove(geminiApiKey, boardSnapshot);
        
        addLog?.(`🤖 ${botPlayer.name} (Gemini): ${geminiResponse.reasoningInHebrew}`);

        switch (geminiResponse.action) {
          case 'BUILD_SETTLEMENT':
            // Implement build settlement logic here
            // For now, just log and end turn
            addLog?.(`🤖 ${botPlayer.name} (Gemini) רוצה לבנות יישוב ב-${geminiResponse.targetId}`);
            endTurn();
            break;
          case 'BUILD_CITY':
            // Implement build city logic here
            // For now, just log and end turn
            addLog?.(`🤖 ${botPlayer.name} (Gemini) רוצה לבנות עיר ב-${geminiResponse.targetId}`);
            endTurn();
            break;
          case 'BUILD_ROAD':
            // Implement build road logic here
            // For now, just log and end turn
            addLog?.(`🤖 ${botPlayer.name} (Gemini) רוצה לבנות כביש ב-${geminiResponse.targetId}`);
            endTurn();
            break;
          case 'BUILD_SHIP':
            // Implement build ship logic here
            // For now, just log and end turn
            addLog?.(`🤖 ${botPlayer.name} (Gemini) רוצה לבנות ספינה ב-${geminiResponse.targetId}`);
            endTurn();
            break;
          case 'BUY_DEV_CARD':
            // Implement buy dev card logic here
            // For now, just log and end turn
            addLog?.(`🤖 ${botPlayer.name} (Gemini) רוצה לקנות קלף פיתוח`);
            endTurn();
            break;
          case 'END_TURN':
            endTurn();
            break;
          default:
            console.warn('Unknown Gemini action:', geminiResponse.action);
            endTurn();
        }

      } catch (error) {
        console.error('Gemini AI integration failed:', error);
        addLog?.(`❌ ${botPlayer.name}: שגיאה ב-Gemini AI. מפעיל לוגיקה מקומית.`);
        tradeAndBuildPhase(params);
      }
    } else {
      tradeAndBuildPhase(params);
    }
    return;
  }
}
