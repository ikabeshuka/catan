import React, { createContext, useContext, useState, useRef, useMemo, ReactNode } from 'react';
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
  type: 'ROAD' | 'SETTLEMENT' | 'CITY' | 'SHIP';
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
  showBuildingCostToast: (type: 'ROAD' | 'SETTLEMENT' | 'CITY' | 'SHIP', success: boolean, isFree?: boolean) => void;
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
  turnStartSnapshot: {
    players: Player[];
    vertices: BoardVertex[];
    edges: BoardEdge[];
  } | null;
  createTurnSnapshot: () => void;
  undoTurnActions: () => void;
  longestRoadPlayerId: string | null;
  largestArmyPlayerId: string | null;
  boardType: 'RANDOM' | 'STARTER';
  setBoardType: React.Dispatch<React.SetStateAction<'RANDOM' | 'STARTER'>>;
  activeExpansion: 'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS';
  setActiveExpansion: React.Dispatch<React.SetStateAction<'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS'>>;
  goldCoins: Record<string, number>;
  setGoldCoins: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  barbarianPositions?: any[];
  setBarbarianPositions?: React.Dispatch<React.SetStateAction<any[]>>;
  merchantConvoys?: any[];
  setMerchantConvoys?: React.Dispatch<React.SetStateAction<any[]>>;
  isMovingWagon?: boolean;
  setIsMovingWagon?: React.Dispatch<React.SetStateAction<boolean>>;
  currentAction: 'BUILD_ROAD' | 'BUILD_SHIP' | null;
  setCurrentAction: React.Dispatch<React.SetStateAction<'BUILD_ROAD' | 'BUILD_SHIP' | null>>;
}

// יצירת ה-Context עצמו
const GameContext = createContext<GameContextType | undefined>(undefined);

// רכיב ה-Provider שיעטוף את האפליקציה
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [boardType, setBoardType] = useState<'RANDOM' | 'STARTER'>('RANDOM');
  const [activeExpansion, setActiveExpansion] = useState<'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS'>('BASE');
  const [goldCoins, setGoldCoins] = useState<Record<string, number>>({});
  const [barbarianPositions, setBarbarianPositions] = useState<any[]>([]);
  const [merchantConvoys, setMerchantConvoys] = useState<any[]>([]);
  const [isMovingWagon, setIsMovingWagon] = useState<boolean>(false);
  const [currentAction, setCurrentAction] = useState<'BUILD_ROAD' | 'BUILD_SHIP' | null>(null);

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
  const [turnStartSnapshot, setTurnStartSnapshot] = useState<{
    players: Player[];
    vertices: BoardVertex[];
    edges: BoardEdge[];
  } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const prevLongestRoadRef = useRef<string | null>(null);
  const prevLargestArmyRef = useRef<string | null>(null);

  const longestRoadPlayerId = useMemo(() => {
    let prevLeader = prevLongestRoadRef.current;
    let currentMax = prevLeader ? calculateLongestRoadForPlayer(prevLeader, edges, vertices) : 4;
    if (currentMax < 4) currentMax = 4;

    let leaderId = prevLeader;
    players.forEach(p => {
      if (p.id === prevLeader) return;
      const roadLen = calculateLongestRoadForPlayer(p.id, edges, vertices);
      if (roadLen > currentMax) {
        currentMax = roadLen;
        leaderId = p.id;
      }
    });

    if (leaderId) {
      const leaderRoadLen = calculateLongestRoadForPlayer(leaderId, edges, vertices);
      if (leaderRoadLen < 5) {
        let absoluteMax = 4;
        let absoluteLeader: string | null = null;
        players.forEach(p => {
          const roadLen = calculateLongestRoadForPlayer(p.id, edges, vertices);
          if (roadLen > absoluteMax) {
            absoluteMax = roadLen;
            absoluteLeader = p.id;
          }
        });
        leaderId = absoluteLeader;
      }
    }

    prevLongestRoadRef.current = leaderId;
    return leaderId;
  }, [edges, vertices, players]);

  const largestArmyPlayerId = useMemo(() => {
    let prevLeader = prevLargestArmyRef.current;
    let currentMax = prevLeader ? (players.find(p => p.id === prevLeader)?.knightsPlayed || 0) : 2;
    if (currentMax < 2) currentMax = 2;

    let leaderId = prevLeader;
    players.forEach(p => {
      if (p.id === prevLeader) return;
      const kp = p.knightsPlayed || 0;
      if (kp > currentMax) {
        currentMax = kp;
        leaderId = p.id;
      }
    });

    if (leaderId) {
      const leaderKnights = players.find(p => p.id === leaderId)?.knightsPlayed || 0;
      if (leaderKnights < 3) {
        leaderId = null;
      }
    }

    prevLargestArmyRef.current = leaderId;
    return leaderId;
  }, [players]);

  const showBuildingCostToast = (type: 'ROAD' | 'SETTLEMENT' | 'CITY' | 'SHIP', success: boolean, isFree?: boolean) => {
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

  const createTurnSnapshot = () => {
    setTurnStartSnapshot({
      players: JSON.parse(JSON.stringify(players)),
      vertices: JSON.parse(JSON.stringify(vertices)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
  };

  const undoTurnActions = () => {
    if (!turnStartSnapshot) return;

    const currentHuman = players.find(p => !p.isBot);
    const snapshotHuman = turnStartSnapshot.players.find(p => !p.isBot);

    if (!currentHuman || !snapshotHuman) return;

    const totalCurrentCards = Object.values(currentHuman.developmentCards).reduce((sum, val) => sum + val, 0);
    const totalSnapshotCards = Object.values(snapshotHuman.developmentCards).reduce((sum, val) => sum + val, 0);
    const N = Math.max(0, totalCurrentCards - totalSnapshotCards);

    const updatedResources = {
      ...snapshotHuman.resources,
      SHEEP: Math.max(0, snapshotHuman.resources.SHEEP - N),
      WHEAT: Math.max(0, snapshotHuman.resources.WHEAT - N),
      ORE: Math.max(0, snapshotHuman.resources.ORE - N),
    };

    const diffVP = (currentHuman.developmentCards.VICTORY_POINT || 0) - (snapshotHuman.developmentCards.VICTORY_POINT || 0);

    const updatedHuman: Player = {
      ...snapshotHuman,
      resources: updatedResources,
      developmentCards: { ...currentHuman.developmentCards },
      victoryPoints: snapshotHuman.victoryPoints + Math.max(0, diffVP),
    };

    const restoredPlayers = turnStartSnapshot.players.map(p => {
      if (!p.isBot) {
        return updatedHuman;
      }
      return p;
    });

    setPlayers(restoredPlayers);
    setVertices(JSON.parse(JSON.stringify(turnStartSnapshot.vertices)));
    setEdges(JSON.parse(JSON.stringify(turnStartSnapshot.edges)));
    
    addLog('🔄 פעולות התור בוטלו בהצלחה! הלוח והמשאבים שוחזרו (פרט לקלפי פיתוח שנרכשו).');
  };

  /**
   * פונקציה לאתחול משחק חדש - מפעילה את מנועי הייצור שכתבנו
   */
  const initNewGame = () => {
    const newTiles = generateBoard(standardCatanConfig, boardType, activeExpansion);
    const newVertices = generateVertices(newTiles, activeExpansion);
    const newEdges = generateEdges(newTiles, activeExpansion);

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
    prevLongestRoadRef.current = null;
    prevLargestArmyRef.current = null;

    setGoldCoins({
      p1: 0,
      p2: 0,
      p3: 0,
      p4: 0
    });
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
      setDevCardDeck,
      turnStartSnapshot,
      createTurnSnapshot,
      undoTurnActions,
      longestRoadPlayerId,
      largestArmyPlayerId,
      boardType,
      setBoardType,
      activeExpansion,
      setActiveExpansion,
      goldCoins,
      setGoldCoins,
      barbarianPositions,
      setBarbarianPositions,
      merchantConvoys,
      setMerchantConvoys,
      isMovingWagon,
      setIsMovingWagon,
      currentAction,
      setCurrentAction
    }}>
      {children}
    </GameContext.Provider>
  );
};

// Helper to parse edge vertices from edge ID
const getEdgeVertices = (edgeId: string) => {
  const withoutPrefix = edgeId.replace('e_', '');
  const parts = withoutPrefix.split('_v_');
  const v1 = parts[0];
  const v2 = 'v_' + parts[1];
  return [v1, v2];
};

// Helper to calculate longest road for a player
const calculateLongestRoadForPlayer = (playerId: string, allEdges: any[], allVertices: any[]): number => {
  const playerRoads = allEdges.filter(e => e.hasRoad && e.playerId === playerId);
  if (playerRoads.length === 0) return 0;

  const adj: Record<string, { edgeId: string, targetVertex: string }[]> = {};
  
  playerRoads.forEach(road => {
    try {
      const [v1, v2] = getEdgeVertices(road.id);
      if (v1 && v2) {
        if (!adj[v1]) adj[v1] = [];
        if (!adj[v2]) adj[v2] = [];
        adj[v1].push({ edgeId: road.id, targetVertex: v2 });
        adj[v2].push({ edgeId: road.id, targetVertex: v1 });
      }
    } catch (err) {
      // Safe fallback if parsing fails
    }
  });

  const isVertexBroken = (vertexId: string) => {
    const vertex = allVertices.find(v => v.id === vertexId);
    if (!vertex) return false;
    return vertex.playerId !== null && vertex.playerId !== playerId && vertex.structure !== 'NONE';
  };

  let maxPathLength = 0;
  const visitedEdges = new Set<string>();

  const dfs = (vertex: string, currentLength: number) => {
    maxPathLength = Math.max(maxPathLength, currentLength);
    
    if (isVertexBroken(vertex)) return;

    const neighbors = adj[vertex] || [];
    for (const neighbor of neighbors) {
      if (!visitedEdges.has(neighbor.edgeId)) {
        visitedEdges.add(neighbor.edgeId);
        dfs(neighbor.targetVertex, currentLength + 1);
        visitedEdges.delete(neighbor.edgeId);
      }
    }
  };

  Object.keys(adj).forEach(v => {
    dfs(v, 0);
  });

  return maxPathLength;
};

export const getPlayerTotalVP = (
  player: Player,
  longestRoadPlayerId: string | null,
  largestArmyPlayerId: string | null,
  includeHidden: boolean = false
): number => {
  let vp = player.victoryPoints || 0;
  if (longestRoadPlayerId === player.id) {
    vp += 2;
  }
  if (largestArmyPlayerId === player.id) {
    vp += 2;
  }
  if (includeHidden) {
    vp += player.developmentCards?.VICTORY_POINT || 0;
  }
  return vp;
};

// Hook מותאם אישית (Custom Hook) כדי לשלוף בקלות את המידע בכל רכיב זקוק לו
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};