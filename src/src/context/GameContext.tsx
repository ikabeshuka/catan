import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { HexTile } from '../types/hex.types';
import { BoardVertex, BoardEdge } from '../types/boardElements.types';
import { generateBoard } from '../utils/gameEngine/generateBoard';
import { generateVertices } from '../utils/gameEngine/generateVertices';
import { generateEdges } from '../utils/gameEngine/generateEdges';
import { standardCatanConfig } from '../config/standardVersion';
import { Player } from '../types/player.types';
import { TurnSubPhase, SetupTurnState } from '../types/game.types';

// הגדרת שלבי המשחק האפשריים
export type GamePhase = 'LOBBY' | 'SETUP_ROUND_1' | 'SETUP_ROUND_2' | 'MAIN_GAME' | 'GAME_OVER';

// מבנה הנתונים שיהיה שמור בתוך ה-Context
export interface BuildingToast {
  type: 'ROAD' | 'SETTLEMENT' | 'CITY';
  success: boolean;
  isFree?: boolean;
}

export interface ResourceFlow {
  id: string;
  resourceType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
  from: { x: number; y: number };
  playerName: string;
  isHuman: boolean;
  amount: number;
}

export interface RobberyState {
  tile: HexTile;
  targets: Player[];
}

interface GameContextType {
  robberyState: RobberyState | null;
  setRobberyState: React.Dispatch<React.SetStateAction<RobberyState | null>>;
  tiles: HexTile[];
  vertices: BoardVertex[];
  edges: BoardEdge[];
  gamePhase: GamePhase;
  currentPlayerIndex: number;
  players: Player[];
  turnSubPhase: TurnSubPhase;
  logs: string[];
  is3DMode: boolean;
  setupState: SetupTurnState;
  setSetupState: React.Dispatch<React.SetStateAction<SetupTurnState>>;
  setIs3DMode: React.Dispatch<React.SetStateAction<boolean>>;
  setTiles: React.Dispatch<React.SetStateAction<HexTile[]>>;
  setVertices: React.Dispatch<React.SetStateAction<BoardVertex[]>>;
  setEdges: React.Dispatch<React.SetStateAction<BoardEdge[]>>;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setCurrentPlayerIndex: React.Dispatch<React.SetStateAction<number>>;
  setTurnSubPhase: React.Dispatch<React.SetStateAction<TurnSubPhase>>;
  addLog: (message: string) => void;
  initNewGame: () => void;
  buildingToast: BuildingToast | null;
  setBuildingToast: React.Dispatch<React.SetStateAction<BuildingToast | null>>;
  showBuildingCostToast: (type: 'ROAD' | 'SETTLEMENT' | 'CITY', success: boolean, isFree?: boolean) => void;
  roadBuildingRemaining: number;
  setRoadBuildingRemaining: React.Dispatch<React.SetStateAction<number>>;
  resourceFlows: ResourceFlow[];
  setResourceFlows: React.Dispatch<React.SetStateAction<ResourceFlow[]>>;
  resourcePosition: 'bottom' | 'right';
  setResourcePosition: React.Dispatch<React.SetStateAction<'bottom' | 'right'>>;
  isResourceCollapsed: boolean;
  setIsResourceCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  activePortTrade: BoardVertex | null;
  setActivePortTrade: React.Dispatch<React.SetStateAction<BoardVertex | null>>;
  isRolling: boolean;
  setIsRolling: React.Dispatch<React.SetStateAction<boolean>>;
  rollValues: { d1: number; d2: number };
  setRollValues: React.Dispatch<React.SetStateAction<{ d1: number; d2: number }>>;
  lastRoll: { d1: number; d2: number } | null;
  setLastRoll: React.Dispatch<React.SetStateAction<{ d1: number; d2: number } | null>>;
  devCardDeck: string[];
  setDevCardDeck: React.Dispatch<React.SetStateAction<string[]>>;
}

// יצירת ה-Context עצמו
const GameContext = createContext<GameContextType | undefined>(undefined);

// רכיב ה-Provider שיעטוף את האפליקציה
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [robberyState, setRobberyState] = useState<RobberyState | null>(null);
  const [tiles, setTiles] = useState<HexTile[]>([]);
  const [vertices, setVertices] = useState<BoardVertex[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('LOBBY');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [turnSubPhase, setTurnSubPhase] = useState<TurnSubPhase>('BEFORE_ROLL');
  const [logs, setLogs] = useState<string[]>(['ברוכים הבאים לקטאן! המשחק ממתין לאתחול.']);
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [setupState, setSetupState] = useState<SetupTurnState>({
    hasPlacedSettlement: false,
    hasPlacedRoad: false
  });
  const [buildingToast, setBuildingToast] = useState<BuildingToast | null>(null);
  const [roadBuildingRemaining, setRoadBuildingRemaining] = useState<number>(0);
  const [resourceFlows, setResourceFlows] = useState<ResourceFlow[]>([]);
  const [resourcePosition, setResourcePosition] = useState<'bottom' | 'right'>('bottom');
  const [isResourceCollapsed, setIsResourceCollapsed] = useState<boolean>(false);
  const [activePortTrade, setActivePortTrade] = useState<BoardVertex | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollValues, setRollValues] = useState<{ d1: number; d2: number }>({ d1: 1, d2: 1 });
  const [lastRoll, setLastRoll] = useState<{ d1: number; d2: number } | null>(null);
  const [devCardDeck, setDevCardDeck] = useState<string[]>([]);
  const toastTimeoutRef = useRef<any>(null);

  const showBuildingCostToast = (type: 'ROAD' | 'SETTLEMENT' | 'CITY', success: boolean, isFree?: boolean) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setBuildingToast({ type, success, isFree });
    toastTimeoutRef.current = setTimeout(() => {
      setBuildingToast(null);
    }, 4500);
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  /**
   * פונקציה לאתחול משחק חדש - מפעילה את מנועי הייצור שכתבנו
   */
  const initNewGame = () => {
    const newTiles = generateBoard(standardCatanConfig);
    const newVertices = generateVertices(newTiles);
    const newEdges = generateEdges(newTiles);

    // Create 25 Catan development cards:
    // 14 KNIGHT
    // 2 ROAD_BUILDING
    // 2 YEAR_OF_PLENTY
    // 2 MONOPOLY
    // 6 VICTORY_POINT cards: 'win1', 'win2', 'win3', 'wun4', 'win5', 'win6'
    const deck: string[] = [
      ...Array(14).fill('KNIGHT'),
      'ROAD_BUILDING', 'ROAD_BUILDING',
      'YEAR_OF_PLENTY', 'YEAR_OF_PLENTY',
      'MONOPOLY', 'MONOPOLY',
      'win1', 'win2', 'win3', 'wun4', 'win5', 'win6'
    ];
    
    // Shuffle the deck:
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const initialPlayers: Player[] = [
      { id: 'p1', name: 'אתה', color: '#e53935', isBot: false, victoryPoints: 2, resources: { WOOD: 2, BRICK: 2, SHEEP: 1, WHEAT: 1, ORE: 0 }, developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 }, knightsPlayed: 0 },
      { id: 'p2', name: 'בוט אלעד', color: '#1e88e5', isBot: true, victoryPoints: 2, resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }, developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 }, knightsPlayed: 0 },
      { id: 'p3', name: 'בוט רעות', color: '#fdd835', isBot: true, victoryPoints: 2, resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }, developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 }, knightsPlayed: 0 },
      { id: 'p4', name: 'בוט משה', color: '#43a047', isBot: true, victoryPoints: 2, resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }, developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 }, knightsPlayed: 0 },
    ];

    setTiles(newTiles);
    setVertices(newVertices);
    setEdges(newEdges);
    setPlayers(initialPlayers);
    setGamePhase('SETUP_ROUND_1');
    setTurnSubPhase('BEFORE_ROLL');
    setCurrentPlayerIndex(0);
    setSetupState({ hasPlacedSettlement: false, hasPlacedRoad: false });
    setLogs(['המשחק התחיל! שלב ההקמה החל.']);
    setIsRolling(false);
    setRollValues({ d1: 1, d2: 1 });
    setLastRoll(null);
    setDevCardDeck(deck);
  };

  return (
    <GameContext.Provider value={{
      robberyState,
      setRobberyState,
      tiles,
      vertices,
      edges,
      gamePhase,
      currentPlayerIndex,
      players,
      turnSubPhase,
      logs,
      is3DMode,
      setupState,
      setSetupState,
      setIs3DMode,
      setTiles,
      setVertices,
      setEdges,
      setGamePhase,
      setPlayers,
      setCurrentPlayerIndex,
      setTurnSubPhase,
      addLog,
      initNewGame,
      buildingToast,
      setBuildingToast,
      showBuildingCostToast,
      roadBuildingRemaining,
      setRoadBuildingRemaining,
      resourceFlows,
      setResourceFlows,
      resourcePosition,
      setResourcePosition,
      isResourceCollapsed,
      setIsResourceCollapsed,
      activePortTrade,
      setActivePortTrade,
      isRolling,
      setIsRolling,
      rollValues,
      setRollValues,
      lastRoll,
      setLastRoll,
      devCardDeck,
      setDevCardDeck
    }}>
      {children}
    </GameContext.Provider>
  );
};

// Hook מותאם אישית (Custom Hook) כדי לשלוף בקלות את המידע בכל רכיב זקוק לו
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};