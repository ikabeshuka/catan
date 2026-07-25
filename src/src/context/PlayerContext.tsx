import React, { createContext, useContext, useState, useRef, useMemo, useEffect, ReactNode } from 'react';
import { Player } from '../types/player.types';
import { TurnSubPhase, SetupTurnState } from '../types/game.types';
import { useBoard } from './BoardContext';
import { generateBoard } from '../utils/gameEngine/generateBoard';
import { generateVertices } from '../utils/gameEngine/generateVertices';
import { generateEdges } from '../utils/gameEngine/generateEdges';
import { standardCatanConfig } from '../config/standardVersion';
import { createSnapshot, restoreFromSnapshot, TurnSnapshot } from '../utils/gameEngine/turnSnapshots';
import { calculateLongestRoadForPlayer } from '../utils/gameEngine/checkLongestRoad';

export type GamePhase = 'LOBBY' | 'SETUP_ROUND_1' | 'SETUP_ROUND_2' | 'MAIN_GAME' | 'GAME_OVER';

export interface GoldSelectionPending {
  playerId: string;
  amount: number;
  tileId: string;
}

interface PlayerContextType {
  players: Player[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  turnSubPhase: TurnSubPhase;
  setupState: SetupTurnState;
  logs: string[];
  devCardDeck: string[];
  goldCoins: Record<string, number>;
  roadBuildingRemaining: number;
  longestRoadPlayerId: string | null;
  largestArmyPlayerId: string | null;
  turnStartSnapshot: TurnSnapshot | null;
  goldSelectionQueue: GoldSelectionPending[];
  currentTurnBuiltShips: string[];
  hasMovedShipThisTurn: boolean;
  selectedShipIdToMove: string | null;
  roomId: string | null;
  isHost: boolean;

  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setCurrentPlayerIndex: React.Dispatch<React.SetStateAction<number>>;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setTurnSubPhase: React.Dispatch<React.SetStateAction<TurnSubPhase>>;
  setSetupState: React.Dispatch<React.SetStateAction<SetupTurnState>>;
  setDevCardDeck: React.Dispatch<React.SetStateAction<string[]>>;
  setGoldCoins: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setRoadBuildingRemaining: React.Dispatch<React.SetStateAction<number>>;
  setGoldSelectionQueue: React.Dispatch<React.SetStateAction<GoldSelectionPending[]>>;
  setCurrentTurnBuiltShips: React.Dispatch<React.SetStateAction<string[]>>;
  setHasMovedShipThisTurn: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedShipIdToMove: React.Dispatch<React.SetStateAction<string | null>>;
  setRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsHost: React.Dispatch<React.SetStateAction<boolean>>;
  addLog: (message: string) => void;
  initNewGame: (
    playerCount?: number,
    presetTiles?: any[],
    presetVertices?: any[],
    presetEdges?: any[]
  ) => void;
  createTurnSnapshot: () => void;
  undoTurnActions: () => void;
  resolveGoldSelection: (chosenResources: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[]) => void;
  buyDevelopmentCard: (forcedCardType?: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    boardType,
    activeExpansion,
    selectedScenario,
    setTiles,
    setVertices,
    setEdges,
    vertices,
    edges,
  } = useBoard();

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('LOBBY');
  const [turnSubPhase, setTurnSubPhase] = useState<TurnSubPhase>('BEFORE_ROLL');
  const [setupState, setSetupState] = useState<SetupTurnState>({
    hasPlacedSettlement: false,
    hasPlacedRoad: false,
  });
  const [logs, setLogs] = useState<string[]>(['ברוכים הבאים לקטאן! המשחק ממתין לאתחול.']);
  const [devCardDeck, setDevCardDeck] = useState<string[]>([]);
  const [goldCoins, setGoldCoins] = useState<Record<string, number>>({});
  const [roadBuildingRemaining, setRoadBuildingRemaining] = useState<number>(0);
  const [turnStartSnapshot, setTurnStartSnapshot] = useState<TurnSnapshot | null>(null);
  const [goldSelectionQueue, setGoldSelectionQueue] = useState<GoldSelectionPending[]>([]);
  const [currentTurnBuiltShips, setCurrentTurnBuiltShips] = useState<string[]>([]);
  const [hasMovedShipThisTurn, setHasMovedShipThisTurn] = useState<boolean>(false);
  const [selectedShipIdToMove, setSelectedShipIdToMove] = useState<string | null>(null);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

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

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const createTurnSnapshot = () => {
    const snap = createSnapshot(players, vertices, edges);
    setTurnStartSnapshot(snap);
  };

  const undoTurnActions = () => {
    if (!turnStartSnapshot) return;

    const { restoredPlayers, restoredVertices, restoredEdges } = restoreFromSnapshot(turnStartSnapshot, players);

    setPlayers(restoredPlayers);
    setVertices(restoredVertices);
    setEdges(restoredEdges);

    addLog('🔄 פעולות התור בוטלו בהצלחה! הלוח והמשאבים שוחזרו (פרט לקלפי פיתוח שנרכשו).');
  };

  const buyDevelopmentCard = (forcedCardType?: string) => {
    if (devCardDeck.length === 0) {
      addLog('⚠️ חבילת קלפי הפיתוח ריקה!');
      return;
    }

    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) return;

    if (!forcedCardType) {
      const res = currentPlayer.resources;
      if ((res.WHEAT || 0) < 1 || (res.ORE || 0) < 1 || (res.SHEEP || 0) < 1) {
        addLog('❌ אין מספיק משאבים לקניית קלף פיתוח (נדרש: 1 חיטה, 1 ברזל, 1 כבש).');
        return;
      }
    }

    let cardDrawn = forcedCardType;
    let newDeck = [...devCardDeck];

    if (!cardDrawn) {
      cardDrawn = newDeck.shift();
    } else {
      const cardIdx = newDeck.indexOf(cardDrawn);
      if (cardIdx !== -1) {
        newDeck.splice(cardIdx, 1);
      }
    }

    if (!cardDrawn) return;

    setDevCardDeck(newDeck);

    const normalizedType = (cardDrawn.startsWith('win') || cardDrawn.startsWith('wun')) 
      ? 'VICTORY_POINT' 
      : cardDrawn;

    setPlayers(prev => prev.map((p, idx) => {
      if (idx === currentPlayerIndex) {
        return {
          ...p,
          resources: {
            ...p.resources,
            WHEAT: Math.max(0, (p.resources.WHEAT || 0) - 1),
            ORE: Math.max(0, (p.resources.ORE || 0) - 1),
            SHEEP: Math.max(0, (p.resources.SHEEP || 0) - 1),
          },
          developmentCards: {
            ...p.developmentCards,
            [normalizedType]: ((p.developmentCards as any)?.[normalizedType] || 0) + 1,
          }
        };
      }
      return p;
    }));

    const cardNames: Record<string, string> = {
      KNIGHT: 'אביר',
      ROAD_BUILDING: 'בניית כבישים',
      YEAR_OF_PLENTY: 'שנת שפע',
      MONOPOLY: 'מונופול',
      VICTORY_POINT: 'נקודת ניצחון',
    };

    addLog(`🎴 ${currentPlayer.name} קנה קלף פיתוח (${cardNames[normalizedType] || normalizedType})!`);
  };

  const resolveGoldSelection = (chosenResources: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[]) => {
    if (goldSelectionQueue.length === 0) return;
    const currentSelection = goldSelectionQueue[0];
    const player = players.find(p => p.id === currentSelection.playerId);
    if (!player) return;

    setPlayers(prevPlayers => prevPlayers.map(p => {
      if (p.id === player.id) {
        const updatedResources = { ...p.resources };
        chosenResources.forEach(res => {
          updatedResources[res] = (updatedResources[res] || 0) + 1;
        });
        return { ...p, resources: updatedResources };
      }
      return p;
    }));

    const labels: Record<string, string> = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };
    const chosenLabels = chosenResources.map(r => labels[r]);
    addLog(`🪙 ${player.name} בחר לקבל ${chosenLabels.join(' ו-')} מאריח הזהב.`);

    const nextQueue = goldSelectionQueue.slice(1);
    setGoldSelectionQueue(nextQueue);
    if (nextQueue.length === 0) {
      setTurnSubPhase('TRADE_AND_BUILD');
    }
  };

  useEffect(() => {
    if (turnSubPhase === 'GOLD_RESOURCE_SELECTION' && goldSelectionQueue.length > 0) {
      const currentSelection = goldSelectionQueue[0];
      const player = players.find(p => p.id === currentSelection.playerId);
      if (player && player.isBot) {
        const resourcesList: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[] = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];
        const chosenKeys: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[] = [];
        const chosenLabels: string[] = [];
        const labels: Record<string, string> = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };

        for (let i = 0; i < currentSelection.amount; i++) {
          const randRes = resourcesList[Math.floor(Math.random() * resourcesList.length)];
          chosenKeys.push(randRes);
          chosenLabels.push(labels[randRes]);
        }

        setPlayers(prevPlayers => prevPlayers.map(p => {
          if (p.id === player.id) {
            const updatedResources = { ...p.resources };
            chosenKeys.forEach(res => {
              updatedResources[res] = (updatedResources[res] || 0) + 1;
            });
            return { ...p, resources: updatedResources };
          }
          return p;
        }));

        addLog(`🤖 הבוט ${player.name} בחר לקבל ${chosenLabels.join(' ו-')} מאריח הזהב.`);

        const nextQueue = goldSelectionQueue.slice(1);
        setGoldSelectionQueue(nextQueue);
        if (nextQueue.length === 0) {
          setTurnSubPhase('TRADE_AND_BUILD');
        }
      }
    }
  }, [turnSubPhase, goldSelectionQueue, players, setTurnSubPhase, setGoldSelectionQueue, setPlayers]);

  const initNewGame = (
    playerCount?: number,
    presetTiles?: any[],
    presetVertices?: any[],
    presetEdges?: any[]
  ) => {
    const newTiles = presetTiles || generateBoard(standardCatanConfig, boardType, activeExpansion, selectedScenario, playerCount);
    const newVertices = presetVertices || generateVertices(newTiles, activeExpansion);
    const newEdges = presetEdges || generateEdges(newTiles, activeExpansion);

    const deck: string[] = [
      ...Array(14).fill('KNIGHT'),
      'ROAD_BUILDING',
      'ROAD_BUILDING',
      'YEAR_OF_PLENTY',
      'YEAR_OF_PLENTY',
      'MONOPOLY',
      'MONOPOLY',
      'win1',
      'win2',
      'win3',
      'wun4',
      'win5',
      'win6',
    ];

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const initialPlayers: Player[] = [
      {
        id: 'p1',
        name: 'פיבי',
        color: '#e53935',
        isBot: false,
        playerType: 'HUMAN',
        victoryPoints: 2,
        resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0,
      },
      {
        id: 'p2',
        name: 'רוס',
        color: '#1e88e5',
        isBot: true,
        playerType: 'LOCAL_BOT',
        victoryPoints: 2,
        resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0,
      },
      {
        id: 'p3',
        name: 'צ\'נדלר',
        color: '#fdd835',
        isBot: true,
        playerType: 'LOCAL_BOT',
        victoryPoints: 2,
        resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0,
      },
      {
        id: 'p4',
        name: 'ג\'ואי',
        color: '#43a047',
        isBot: true,
        playerType: 'LOCAL_BOT',
        victoryPoints: 2,
        resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0,
      },
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
      p4: 0,
    });
    setPlayers(initialPlayers);
    setGamePhase('SETUP_ROUND_1');
    setTurnSubPhase('BEFORE_ROLL');
    setGoldSelectionQueue([]);
    setCurrentTurnBuiltShips([]);
    setHasMovedShipThisTurn(false);
    setSelectedShipIdToMove(null);
    setCurrentPlayerIndex(0);
    setSetupState({ hasPlacedSettlement: false, hasPlacedRoad: false });
    setLogs(['המשחק התחיל! שלב ההקמה החל.']);
    setDevCardDeck(deck);
  };

  return (
    <PlayerContext.Provider
      value={{
        players,
        currentPlayerIndex,
        gamePhase,
        turnSubPhase,
        setupState,
        logs,
        devCardDeck,
        goldCoins,
        roadBuildingRemaining,
        longestRoadPlayerId,
        largestArmyPlayerId,
        turnStartSnapshot,
        goldSelectionQueue,
        currentTurnBuiltShips,
        hasMovedShipThisTurn,
        selectedShipIdToMove,
        roomId,
        isHost,
        setPlayers,
        setCurrentPlayerIndex,
        setGamePhase,
        setTurnSubPhase,
        setSetupState,
        setDevCardDeck,
        setGoldCoins,
        setRoadBuildingRemaining,
        setGoldSelectionQueue,
        setCurrentTurnBuiltShips,
        setHasMovedShipThisTurn,
        setSelectedShipIdToMove,
        setRoomId,
        setIsHost,
        addLog,
        initNewGame,
        createTurnSnapshot,
        undoTurnActions,
        resolveGoldSelection,
        buyDevelopmentCard,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};