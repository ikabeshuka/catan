/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useRef, useMemo, useEffect, ReactNode } from 'react';
import { Player } from '../types/player.types';
import { TurnSubPhase, SetupTurnState } from '../types/game.types';
import { useBoard } from './BoardContext';
import { generateBoard } from '../utils/gameEngine/generateBoard';
import { generateVertices } from '../utils/gameEngine/generateVertices';
import { generateEdges } from '../utils/gameEngine/generateEdges';
import { standardCatanConfig } from '../config/standardVersion';
import { createBarbarianAttackDevelopmentDeck, createMerchantsAndBarbariansDevelopmentDeck, createStandardDevelopmentDeck, isCitiesKnightsExpansion } from '../config/gameRules';
import { createSnapshot, restoreFromSnapshot, TurnSnapshot } from '../utils/gameEngine/turnSnapshots';
import { calculateLongestRoadForPlayer } from '../utils/gameEngine/checkLongestRoad';
import { ResourceCards } from '../types/resources.types';
import { CommodityCards } from '../types/citiesKnights.types';
import { reserveLostTribeDevelopmentCards } from '../utils/gameEngine/lostTribeHelpers';
import { markRiversOfCatanEdges } from '../utils/gameEngine/riversOfCatanRules';
import { caravanScoreByPlayer } from '../utils/gameEngine/caravanRouteRules';

export type GamePhase = 'LOBBY' | 'SETUP_ROUND_1' | 'SETUP_ROUND_2' | 'SETUP_ROUND_3' | 'MAIN_GAME' | 'GAME_OVER';

export interface GoldSelectionPending {
  playerId: string;
  amount: number;
  tileId: string;
  /** A treasure may limit the otherwise-free resource selection. */
  allowedResources?: Array<keyof ResourceCards>;
  source?: 'GOLD_FIELD' | 'TREASURE';
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
  resourceBank: ResourceCards;
  commodityBank: CommodityCards;
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
  myPlayerId: string | null;

  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setCurrentPlayerIndex: React.Dispatch<React.SetStateAction<number>>;
  setGamePhase: React.Dispatch<React.SetStateAction<GamePhase>>;
  setTurnSubPhase: React.Dispatch<React.SetStateAction<TurnSubPhase>>;
  setSetupState: React.Dispatch<React.SetStateAction<SetupTurnState>>;
  setDevCardDeck: React.Dispatch<React.SetStateAction<string[]>>;
  setGoldCoins: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setResourceBank: React.Dispatch<React.SetStateAction<ResourceCards>>;
  setCommodityBank: React.Dispatch<React.SetStateAction<CommodityCards>>;
  setRoadBuildingRemaining: React.Dispatch<React.SetStateAction<number>>;
  setGoldSelectionQueue: React.Dispatch<React.SetStateAction<GoldSelectionPending[]>>;
  setCurrentTurnBuiltShips: React.Dispatch<React.SetStateAction<string[]>>;
  setHasMovedShipThisTurn: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedShipIdToMove: React.Dispatch<React.SetStateAction<string | null>>;
  setRoomId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsHost: React.Dispatch<React.SetStateAction<boolean>>;
  setMyPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  addLog: (message: string) => void;
  initNewGame: (
    playerCount?: number,
    presetTiles?: any[],
    presetVertices?: any[],
    presetEdges?: any[],
    presetDeck?: string[]
  ) => string[];
  createTurnSnapshot: () => void;
  undoTurnActions: () => void;
  resolveGoldSelection: (chosenResources: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[]) => void;
  buyDevelopmentCard: (forcedCardType?: string, targetPlayerId?: string) => boolean;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    boardType,
    activeExpansion,
    selectedScenario,
    mbScenarioId,
    setTiles,
    setVertices,
    setEdges,
    vertices,
    edges,
    scenarioState,
    setScenarioState,
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
  const [resourceBank, setResourceBank] = useState<ResourceCards>({ WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 });
  const [commodityBank, setCommodityBank] = useState<CommodityCards>({ COIN: 12, PAPER: 12, CLOTH: 12 });
  const [roadBuildingRemaining, setRoadBuildingRemaining] = useState<number>(0);
  const [turnStartSnapshot, setTurnStartSnapshot] = useState<TurnSnapshot | null>(null);
  const [goldSelectionQueue, setGoldSelectionQueue] = useState<GoldSelectionPending[]>([]);
  const [currentTurnBuiltShips, setCurrentTurnBuiltShips] = useState<string[]>([]);
  const [hasMovedShipThisTurn, setHasMovedShipThisTurn] = useState<boolean>(false);
  const [selectedShipIdToMove, setSelectedShipIdToMove] = useState<string | null>(null);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  const prevLongestRoadRef = useRef<string | null>(null);
  const prevLargestArmyRef = useRef<string | null>(null);

  // Resource cards only ever move between players and the 19-card bank.
  // Reconciliation also covers host-controlled bot moves that update players
  // in a single AI transaction.
  useEffect(() => {
    const reconciled = (['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as (keyof ResourceCards)[])
      .reduce((bank, resource) => {
        bank[resource] = Math.max(0, 19 - players.reduce((sum, player) => sum + (player.resources[resource] || 0), 0));
        return bank;
      }, {} as ResourceCards);
    setResourceBank(previous => (Object.keys(reconciled) as (keyof ResourceCards)[])
      .every(resource => previous[resource] === reconciled[resource]) ? previous : reconciled);
  }, [players]);

  // Rivers of Catan updates both cards whenever the gold distribution changes.
  useEffect(() => {
    if (activeExpansion !== 'MERCHANTS_AND_BARBARIANS' || mbScenarioId !== 'RIVERS_OF_CATAN') return;
    const amounts = players.map(player => goldCoins[player.id] || 0);
    if (!amounts.length) return;
    const richestAmount = Math.max(...amounts);
    const poorestAmount = Math.min(...amounts);
    const uniqueRichestId = amounts.filter(amount => amount === richestAmount).length === 1
      ? players[amounts.indexOf(richestAmount)].id
      : undefined;
    setPlayers(previous => {
      const next = previous.map(player => ({
        ...player,
        riverScoreModifier: (player.id === uniqueRichestId ? 1 : 0) + ((goldCoins[player.id] || 0) === poorestAmount ? -2 : 0),
      }));
      return next.every((player, index) => player.riverScoreModifier === previous[index].riverScoreModifier) ? previous : next;
    });
  }, [activeExpansion, mbScenarioId, goldCoins, players]);

  useEffect(() => {
    if (activeExpansion !== 'MERCHANTS_AND_BARBARIANS' || mbScenarioId !== 'CARAVAN_ROUTE') return;
    const scores = caravanScoreByPlayer(edges, vertices);
    setPlayers(previous => {
      const next = previous.map(player => ({ ...player, caravanScoreModifier: scores[player.id] || 0 }));
      return next.every((player, index) => player.caravanScoreModifier === previous[index].caravanScoreModifier) ? previous : next;
    });
  }, [activeExpansion, mbScenarioId, edges, vertices]);

  const longestRoadPlayerId = useMemo(() => {
    if (selectedScenario === 'CLOTH_FOR_CATAN' || selectedScenario === 'PIRATE_ISLANDS') {
      prevLongestRoadRef.current = null;
      return null;
    }
    const prevLeader = prevLongestRoadRef.current;
    const roadLengths = players.map(player => ({
      playerId: player.id,
      length: calculateLongestRoadForPlayer(player.id, edges, vertices),
    }));
    const longestLength = Math.max(0, ...roadLengths.map(result => result.length));
    const tiedLeaders = longestLength >= 5
      ? roadLengths.filter(result => result.length === longestLength)
      : [];

    // The incumbent keeps the card when tied for the longest eligible road.
    // If the incumbent is no longer among the leaders, a tie leaves the card
    // unowned until one player has a strictly longer road.
    let leaderId: string | null = null;
    if (prevLeader && tiedLeaders.some(result => result.playerId === prevLeader)) {
      leaderId = prevLeader;
    } else if (tiedLeaders.length === 1) {
      leaderId = tiedLeaders[0].playerId;
    }

    prevLongestRoadRef.current = leaderId;
    return leaderId;
  }, [edges, vertices, players, selectedScenario]);

  const largestArmyPlayerId = useMemo(() => {
    if (selectedScenario === 'PIRATE_ISLANDS' || selectedScenario === 'DESERT_DRAGONS' || isCitiesKnightsExpansion(activeExpansion)) {
      prevLargestArmyRef.current = null;
      return null;
    }
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
  }, [players, selectedScenario, activeExpansion]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const createTurnSnapshot = () => {
    const snap = createSnapshot(players, vertices, edges);
    setTurnStartSnapshot(snap);
  };

  const undoTurnActions = () => {
    if (!turnStartSnapshot) return;
    if (roomId) {
      addLog('ביטול פעולות אינו זמין במשחק מקוון.');
      return;
    }

    const activePlayerId = players[currentPlayerIndex]?.id;
    if (!activePlayerId) return;
    const { restoredPlayers, restoredVertices, restoredEdges } = restoreFromSnapshot(turnStartSnapshot, players, activePlayerId);

    setPlayers(restoredPlayers);
    setVertices(restoredVertices);
    setEdges(restoredEdges);

    addLog('🔄 פעולות התור בוטלו בהצלחה! הלוח והמשאבים שוחזרו (פרט לקלפי פיתוח שנרכשו).');
  };

  const buyDevelopmentCard = (forcedCardType?: string, targetPlayerId?: string): boolean => {
    if (devCardDeck.length === 0) {
      addLog('⚠️ חבילת קלפי הפיתוח ריקה!');
      return false;
    }

    const currentPlayer = targetPlayerId
      ? players.find(player => player.id === targetPlayerId)
      : players[currentPlayerIndex];
    if (!currentPlayer) return false;

    const res = currentPlayer.resources;
    if ((res.WHEAT || 0) < 1 || (res.ORE || 0) < 1 || (res.SHEEP || 0) < 1) {
      addLog('❌ אין מספיק משאבים לקניית קלף פיתוח (נדרש: 1 חיטה, 1 ברזל, 1 כבש).');
      return false;
    }

    let cardDrawn = forcedCardType;
    let newDeck = [...devCardDeck];

    if (!cardDrawn) {
      cardDrawn = newDeck.shift();
    } else {
      if (newDeck[0] !== cardDrawn) {
        addLog('❌ הקלף שנשלח אינו הקלף הבא בחבילה.');
        return false;
      }
      newDeck.shift();
    }

    if (!cardDrawn) return false;

    setDevCardDeck(newDeck);

    const normalizedType = (cardDrawn.startsWith('win') || cardDrawn.startsWith('wun')) 
      ? 'VICTORY_POINT' 
      : cardDrawn;

    const isBarbarianCard = activeExpansion === 'MERCHANTS_AND_BARBARIANS' && mbScenarioId === 'BARBARIAN_ATTACK' &&
      ['KNIGHTHOOD', 'STRONG_KNIGHT', 'TREASON', 'INTRIGUE'].includes(normalizedType);
    setPlayers(prev => prev.map((p) => {
      if (p.id === currentPlayer.id) {
        const boughtDevCardsThisTurn = normalizedType === 'VICTORY_POINT'
          ? p.boughtDevCardsThisTurn
          : {
              ...p.boughtDevCardsThisTurn,
              [normalizedType]: ((p.boughtDevCardsThisTurn as any)?.[normalizedType] || 0) + 1,
            };
        return {
          ...p,
          resources: {
            ...p.resources,
            WHEAT: Math.max(0, (p.resources.WHEAT || 0) - 1),
            ORE: Math.max(0, (p.resources.ORE || 0) - 1),
            SHEEP: Math.max(0, (p.resources.SHEEP || 0) - 1),
          },
          developmentCards: isBarbarianCard ? p.developmentCards : {
            ...p.developmentCards,
            [normalizedType]: ((p.developmentCards as any)?.[normalizedType] || 0) + 1,
          },
          boughtDevCardsThisTurn,
        };
      }
      return p;
    }));
    if (isBarbarianCard && scenarioState.kind === 'BARBARIAN_ATTACK') {
      setScenarioState(previous => previous.kind !== 'BARBARIAN_ATTACK' ? previous : {
        ...previous,
        pendingDevelopmentCard: { playerId: currentPlayer.id, cardType: normalizedType as 'KNIGHTHOOD' | 'STRONG_KNIGHT' | 'TREASON' | 'INTRIGUE' },
      });
    }
    setResourceBank(prev => ({ ...prev, WHEAT: prev.WHEAT + 1, ORE: prev.ORE + 1, SHEEP: prev.SHEEP + 1 }));

    addLog(`🎴 ${currentPlayer.name} קנה קלף פיתוח.`);
    return true;
  };

  const resolveGoldSelection = (chosenResources: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[]) => {
    if (goldSelectionQueue.length === 0) return;
    const currentSelection = goldSelectionQueue[0];
    const player = players.find(p => p.id === currentSelection.playerId);
    if (!player) return;
    const requested = chosenResources.reduce<Record<string, number>>((counts, resource) => {
      counts[resource] = (counts[resource] || 0) + 1;
      return counts;
    }, {});
    if (Object.entries(requested).some(([resource, count]) => resourceBank[resource as keyof ResourceCards] < count)) return;

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
    setResourceBank(previous => {
      const next = { ...previous };
      chosenResources.forEach(resource => { next[resource] -= 1; });
      return next;
    });

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
    if (roomId && !isHost) return;
    if (turnSubPhase === 'GOLD_RESOURCE_SELECTION' && goldSelectionQueue.length > 0) {
      const currentSelection = goldSelectionQueue[0];
      const player = players.find(p => p.id === currentSelection.playerId);
      if (player && player.isBot) {
        const resourcesList: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[] = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'];
        const chosenKeys: ('WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE')[] = [];
        const chosenLabels: string[] = [];
        const labels: Record<string, string> = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };

        for (let i = 0; i < currentSelection.amount; i++) {
          const availableResources = resourcesList.filter(resource =>
            resourceBank[resource] > chosenKeys.filter(chosen => chosen === resource).length
          );
          if (availableResources.length === 0) break;
          const randRes = availableResources[Math.floor(Math.random() * availableResources.length)];
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
        setResourceBank(previous => {
          const next = { ...previous };
          chosenKeys.forEach(resource => { next[resource] -= 1; });
          return next;
        });

        addLog(`🤖 הבוט ${player.name} בחר לקבל ${chosenLabels.join(' ו-')} מאריח הזהב.`);

        const nextQueue = goldSelectionQueue.slice(1);
        setGoldSelectionQueue(nextQueue);
        if (nextQueue.length === 0) {
          setTurnSubPhase('TRADE_AND_BUILD');
        }
      }
    }
  }, [turnSubPhase, goldSelectionQueue, players, resourceBank, roomId, isHost, setTurnSubPhase, setGoldSelectionQueue, setPlayers]);

  const initNewGame = (
    playerCount?: number,
    presetTiles?: any[],
    presetVertices?: any[],
    presetEdges?: any[],
    presetDeck?: string[]
  ) => {
    const newTiles = presetTiles || generateBoard(standardCatanConfig, boardType, activeExpansion, selectedScenario, playerCount, mbScenarioId);
    const newVertices = presetVertices || generateVertices(newTiles, activeExpansion);
    const generatedEdges = presetEdges || generateEdges(newTiles, activeExpansion);
    const newEdges = activeExpansion === 'MERCHANTS_AND_BARBARIANS' && mbScenarioId === 'RIVERS_OF_CATAN'
      ? markRiversOfCatanEdges(generatedEdges)
      : generatedEdges;

    let deck: string[] = presetDeck ? [...presetDeck]
      : activeExpansion === 'MERCHANTS_AND_BARBARIANS' && mbScenarioId === 'BARBARIAN_ATTACK'
        ? createBarbarianAttackDevelopmentDeck()
        : activeExpansion === 'MERCHANTS_AND_BARBARIANS' && mbScenarioId === 'MERCHANTS_AND_BARBARIANS'
          ? createMerchantsAndBarbariansDevelopmentDeck()
        : createStandardDevelopmentDeck();

    if (!presetDeck) {
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }

    if (!presetDeck && selectedScenario === 'THE_LOST_TRIBE') {
      deck = reserveLostTribeDevelopmentCards(deck, newEdges);
    }
    if (!presetDeck && selectedScenario === 'PIRATE_ISLANDS' && playerCount === 3) {
      deck = deck.filter(card => card !== 'VICTORY_POINT');
    }

    const initialPlayers: Player[] = [
      {
        id: 'p1',
        name: 'פיבי',
        color: '#e53935',
        isBot: false,
        playerType: 'HUMAN',
        victoryPoints: isCitiesKnightsExpansion(activeExpansion) ? 3 : 2,
        clothRolls: 0,
        lostTribeVillageIds: [],
        resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0,
        fishTokens: [],
        fishCount: 0,
        hasOldBoot: false,
      },
      {
        id: 'p2',
        name: 'רוס',
        color: '#1e88e5',
        isBot: true,
        playerType: 'LOCAL_BOT',
        victoryPoints: isCitiesKnightsExpansion(activeExpansion) ? 3 : 2,
        clothRolls: 0,
        lostTribeVillageIds: [],
        resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0,
        fishTokens: [],
        fishCount: 0,
        hasOldBoot: false,
      },
      {
        id: 'p3',
        name: 'צ\'נדלר',
        color: '#fdd835',
        isBot: true,
        playerType: 'LOCAL_BOT',
        victoryPoints: isCitiesKnightsExpansion(activeExpansion) ? 3 : 2,
        clothRolls: 0,
        lostTribeVillageIds: [],
        resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0,
        fishTokens: [],
        fishCount: 0,
        hasOldBoot: false,
      },
      {
        id: 'p4',
        name: 'ג\'ואי',
        color: '#43a047',
        isBot: true,
        playerType: 'LOCAL_BOT',
        victoryPoints: isCitiesKnightsExpansion(activeExpansion) ? 3 : 2,
        clothRolls: 0,
        lostTribeVillageIds: [],
        resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0,
        fishTokens: [],
        fishCount: 0,
        hasOldBoot: false,
      },
    ];

    setTiles(newTiles);
    setVertices(newVertices);
    setEdges(newEdges);
    prevLongestRoadRef.current = null;
    prevLargestArmyRef.current = null;

    const initialGold = activeExpansion === 'MERCHANTS_AND_BARBARIANS' && mbScenarioId === 'MERCHANTS_AND_BARBARIANS' ? 5 : 0;
    setGoldCoins({ p1: initialGold, p2: initialGold, p3: initialGold, p4: initialGold });
    setResourceBank({ WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 });
    setCommodityBank({ COIN: 12, PAPER: 12, CLOTH: 12 });
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
    return deck;
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
        resourceBank,
        commodityBank,
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
        myPlayerId,
        setPlayers,
        setCurrentPlayerIndex,
        setGamePhase,
        setTurnSubPhase,
        setSetupState,
        setDevCardDeck,
        setGoldCoins,
        setResourceBank,
        setCommodityBank,
        setRoadBuildingRemaining,
        setGoldSelectionQueue,
        setCurrentTurnBuiltShips,
        setHasMovedShipThisTurn,
        setSelectedShipIdToMove,
        setRoomId,
        setIsHost,
        setMyPlayerId,
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
