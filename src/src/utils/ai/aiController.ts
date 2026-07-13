import { BoardVertex, BoardEdge } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { HexTile } from '../../types/hex.types';
import { TurnSubPhase } from '../../types/game.types';
import { GamePhase } from '../../context/GameContext';
import { setupPhase } from './phases/setupPhase';
import { robberPhase } from './phases/robberPhase';
import { tradeAndBuildPhase } from './phases/tradeAndBuildPhase';

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
}

export function runAITurn(params: AIControllerParams): void {
  const { turnSubPhase, gamePhase, handleDiceRoll } = params;
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
    tradeAndBuildPhase(params);
    return;
  }
}
