import { Player } from '../../../types/player.types';
import { HexTile } from '../../../types/hex.types';
import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { GamePhase } from '../../../context/GameContext';

export interface StrategicTradeResult {
  buildHappened: boolean;
  updatedBot: Player;
}

export interface AIStrategy {
  name: 'LONG_ROAD_EXPANSION' | 'CITY_DEV_BURST' | 'BALANCED_PORT_TRADE';
  label: string;
  executeStrategicTrade(params: {
    botPlayer: Player;
    vertices: BoardVertex[];
    edges: BoardEdge[];
    tiles: HexTile[];
    gamePhase: GamePhase;
    getTradeRatio: (res: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE') => number;
    resourceLabels: Record<string, string>;
    addLog?: (message: string) => void;
  }): StrategicTradeResult | null;
}
