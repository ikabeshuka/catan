import React, { useEffect, useState, useRef } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { GameBoard3D } from './components/board/GameBoard3D';
import { ActionSidebar } from './components/actions/ActionSidebar';
import { ResourceContainer } from './components/playerPanel/ResourceContainer';
import { GameLog } from './components/notifications/GameLog';
import { DevelopmentCardsPanel } from './components/playerPanel/DevelopmentCardsPanel';
import { runAITurn } from './utils/ai/aiController';
import { getMediumBotTarget } from './utils/ai/getMediumBotTarget';
import { useTurnManager } from './hooks/useTurnManager';
import { PhaseGuide } from './components/notifications/PhaseGuide';
import { stealRandomCard } from './utils/gameEngine/robberSteal';
import { 
  WoodIcon, BrickIcon, SheepIcon, WheatIcon, OreIcon,
  DealIcon, MonopolyIcon,
  CrossIcon, WarningIcon
} from './components/common/Icons';
import { LobbyScreen } from './components/lobby/LobbyScreen';
import { DiscardOverlay } from './components/modals/DiscardOverlay';

const GameContent: React.FC = () => {
  const lastProcessedTurnRef = useRef<string>("");
  const lastStartedTurnRef = useRef<string>("");

  const [playerCount, setPlayerCount] = useState<3 | 4>(4);

  const [lobbyPlayers, setLobbyPlayers] = useState<Array<{
    id: string;
    name: string;
    color: string;
    isBot: boolean;
    difficulty?: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה';
  }>>([
    { id: 'p1', name: 'אתה', color: '#e53935', isBot: false, difficulty: undefined },
    { id: 'p2', name: 'בוט אומץ', color: '#1e88e5', isBot: true, difficulty: 'בינוני' },
    { id: 'p3', name: 'בוט ברזל', color: '#fdd835', isBot: true, difficulty: 'בינוני' },
    { id: 'p4', name: 'בוט פלדה', color: '#43a047', isBot: true, difficulty: 'בינוני' },
  ]);

  const togglePlayerType = (id: string, isBot: boolean) => {
    setLobbyPlayers(prev => prev.map((item, idx) => {
      if (item.id === id) {
        let newName = item.name;
        if (isBot) {
          newName = idx === 1 ? 'בוט אומץ' : idx === 2 ? 'בוט ברזל' : idx === 3 ? 'בוט פלדה' : 'בוט סופה';
        } else {
          newName = idx === 0 ? 'אתה' : `שחקן ${idx + 1}`;
        }
        return {
          ...item,
          isBot,
          name: newName
        };
      }
      return item;
    }));
  };
  const { 
    gamePhase, 
    setGamePhase,
    initNewGame, 
    players, 
    currentPlayerIndex, 
    turnSubPhase,
    tiles,
    vertices,
    edges,
    setVertices,
    setEdges,
    setPlayers,
    setTurnSubPhase,
    setCurrentPlayerIndex,
    addLog,
    roadBuildingRemaining,
    setRoadBuildingRemaining,
    resourcePosition,
    setResourcePosition,
    isResourceCollapsed,
    setIsResourceCollapsed,
    activePortTrade,
    setActivePortTrade,
    setTiles,
    robberyState,
    setRobberyState,
    showBuildingCostToast
  } = useGame();

  const { recordSetupPlacement, endTurn, handleDiceRoll, startTurn } = useTurnManager();

  const activePlayer = players[currentPlayerIndex];

  const humanPlayer = players.find(p => !p.isBot) || players[0];

  // States for trade system
  const [isDevPanelCollapsed, setIsDevPanelCollapsed] = useState(true);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isMonopolyModalOpen, setIsMonopolyModalOpen] = useState(false);
  const [isYearOfPlentyModalOpen, setIsYearOfPlentyModalOpen] = useState(false);
  const [yopRes1, setYopRes1] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('WOOD');
  const [yopRes2, setYopRes2] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('BRICK');
  const [prevRoadCount, setPrevRoadCount] = useState<number>(0);

  // States for award popups
  const [armyPopup, setArmyPopup] = useState<{ player: any; prevPlayer: any } | null>(null);
  const [roadPopup, setRoadPopup] = useState<{ player: any; prevPlayer: any } | null>(null);

  const prevLargestArmyRef = useRef<string | null>(null);
  const prevLongestRoadRef = useRef<string | null>(null);

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

  const longestRoadPlayerId = (() => {
    let maxRoad = 4; // Must have at least 5 segments
    let leaderId: string | null = null;
    players.forEach(p => {
      const roadLen = calculateLongestRoadForPlayer(p.id, edges, vertices);
      if (roadLen > maxRoad) {
        maxRoad = roadLen;
        leaderId = p.id;
      }
    });
    return leaderId;
  })();

  const largestArmyPlayerId = (() => {
    let maxKnights = 2; // Must have at least 3 knights
    let leaderId: string | null = null;
    players.forEach(p => {
      const kp = p.knightsPlayed || 0;
      if (kp > maxKnights) {
        maxKnights = kp;
        leaderId = p.id;
      }
    });
    return leaderId;
  })();

  useEffect(() => {
    if (gamePhase === 'LOBBY' || gamePhase === 'GAME_OVER') {
      prevLargestArmyRef.current = null;
      return;
    }
    if (largestArmyPlayerId && largestArmyPlayerId !== prevLargestArmyRef.current) {
      const player = players.find(p => p.id === largestArmyPlayerId) || null;
      const prevPlayer = players.find(p => p.id === prevLargestArmyRef.current) || null;
      setArmyPopup({ player, prevPlayer });
    }
    prevLargestArmyRef.current = largestArmyPlayerId;
  }, [largestArmyPlayerId, gamePhase, players]);

  useEffect(() => {
    if (gamePhase === 'LOBBY' || gamePhase === 'GAME_OVER') {
      prevLongestRoadRef.current = null;
      return;
    }
    if (longestRoadPlayerId && longestRoadPlayerId !== prevLongestRoadRef.current) {
      const player = players.find(p => p.id === longestRoadPlayerId) || null;
      const prevPlayer = players.find(p => p.id === prevLongestRoadRef.current) || null;
      setRoadPopup({ player, prevPlayer });
    }
    prevLongestRoadRef.current = longestRoadPlayerId;
  }, [longestRoadPlayerId, gamePhase, players]);

  const [giveRes, setGiveRes] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('WOOD');
  const [giveAmt, setGiveAmt] = useState<number>(1);
  const [receiveRes, setReceiveRes] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('BRICK');
  const [receiveAmt, setReceiveAmt] = useState<number>(1);
  const [targetBotId, setTargetBotId] = useState<string>('ALL');

  // States and execution for harbor trade
  const [harborGiveRes, setHarborGiveRes] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('WOOD');
  const [harborReceiveRes, setHarborReceiveRes] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('BRICK');

  const executeHarborTrade = (giveType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', receiveType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE', requiredGiveAmt: number) => {
    if (giveType === receiveType) {
      alert("לא ניתן להחליף משאב בעצמו!");
      return;
    }
    const currentStock = humanPlayer.resources[giveType] || 0;
    if (currentStock < requiredGiveAmt) {
      alert(`אין לך מספיק משאבים מסוג ${giveType} (נדרש ${requiredGiveAmt}, יש לך ${currentStock})!`);
      return;
    }

    setPlayers((prev: any[]) => prev.map(p => 
      p.id === humanPlayer.id ? {
        ...p,
        resources: {
          ...p.resources,
          [giveType]: p.resources[giveType] - requiredGiveAmt,
          [receiveType]: (p.resources[receiveType] || 0) + 1
        }
      } : p
    ));

    const resourceLabels: Record<string, string> = {
      WOOD: 'עץ',
      BRICK: 'לבנה',
      SHEEP: 'כבש',
      WHEAT: 'חיטה',
      ORE: 'ברזל'
    };

    addLog(`[נמל] ${humanPlayer.name} ניצל נמל והחליף ${requiredGiveAmt} ${resourceLabels[giveType]} תמורת 1 ${resourceLabels[receiveType]}.`);
    setActivePortTrade(null);
  };

  // הגדרות למגבלת זמן תגובה של בוטים וספירה לאחור
  const [botTimeLimit, setBotTimeLimit] = useState<number>(10);
  const [timeLeft, setTimeLeft] = useState<number>(10);

  // מעבר בטוח לתור הבא במקרה של עצירה ידנית או אוטומטית (זמן תם)
  const forceNextTurn = () => {
    if (gamePhase !== 'LOBBY' && activePlayer && activePlayer.isBot) {
      addLog(`[מערכת] תור הבוט ${activePlayer.name} הופסק ידנית או עקב חריגה מזמן התגובה (${botTimeLimit} שניות).`);
      
      if (gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2') {
        endTurn();
      } else {
        const nextIndex = (currentPlayerIndex + 1) % players.length;
        setCurrentPlayerIndex(nextIndex);
        setTurnSubPhase('BEFORE_ROLL');
      }
    }
  };

  // מניעת גלילה של חלון הדפדפן/התצוגה כדי להבטיח שהכותרת לא תיחתך ושלא יופיע שטח ריק למטה
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      const root = document.getElementById('root');
      if (root) {
        root.scrollTop = 0;
        root.scrollLeft = 0;
      }
    };

    const handleScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    resetScroll();

    // Reset multiple times to ensure layout rendering doesn't fight scroll position
    const timer1 = setTimeout(resetScroll, 50);
    const timer2 = setTimeout(resetScroll, 200);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [gamePhase]);

  // מעקב אחר בניית כבישים חינם לצורך הפחתה של מונה קלף בניית כבישים
  useEffect(() => {
    if (!humanPlayer) return;
    const currentRoadCount = edges.filter(e => e.hasRoad && e.playerId === humanPlayer.id).length;
    if (roadBuildingRemaining > 0 && currentRoadCount > prevRoadCount) {
      const diff = currentRoadCount - prevRoadCount;
      const nextRemaining = Math.max(0, roadBuildingRemaining - diff);
      setRoadBuildingRemaining(nextRemaining);
      addLog(`[בניית כבישים] כביש חינם נבנה בהצלחה! נותרו עוד ${nextRemaining} כבישים חינם לבנייה.`);
    }
    setPrevRoadCount(currentRoadCount);
  }, [edges, humanPlayer?.id, roadBuildingRemaining]);

  // אפקט שעוקב אחר זמן התגובה של הבוטים ומריץ ספירה לאחור
  useEffect(() => {
    if (gamePhase !== 'LOBBY' && activePlayer && activePlayer.isBot) {
      setTimeLeft(botTimeLimit);

      const intervalId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            forceNextTurn();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [currentPlayerIndex, turnSubPhase, gamePhase, activePlayer?.id, botTimeLimit]);

  // בדיקת תנאי ניצחון בתחילת כל תור (אנושי או בוט)
  useEffect(() => {
    if (gamePhase === 'MAIN_GAME' && turnSubPhase === 'BEFORE_ROLL') {
      const winner = players.find(p => p.victoryPoints >= 10);
      if (winner) {
        setGamePhase('GAME_OVER');
        addLog(`המשחק נגמר! ${winner.name} ניצח/ה עם ${winner.victoryPoints} נקודות ניצחון!`);
      }
    }
  }, [currentPlayerIndex, turnSubPhase, gamePhase, players]);

  // האפקט המרכזי שמזהה תור של בוט ומפעיל את ה-AI באופן אוטומטי
  useEffect(() => {
    // Check win condition for the current player at the start of their turn
    if (gamePhase === "MAIN_GAME" && activePlayer && !activePlayer.isBot && turnSubPhase === 'BEFORE_ROLL') {
      const turnKey = `${gamePhase}-${currentPlayerIndex}-${turnSubPhase}`;
      if (lastStartedTurnRef.current !== turnKey) {
        lastStartedTurnRef.current = turnKey;
        startTurn();
      }
      return;
    }

    // בדיקה שהמשחק פעיל ושהשחקן הנוכחי הוא אכן בוט (שחקן מחשב)
    if (gamePhase !== "LOBBY" && gamePhase !== "GAME_OVER" && activePlayer && activePlayer.isBot) {
      const turnKey = `${gamePhase}-${currentPlayerIndex}-${turnSubPhase}`;
      if (lastProcessedTurnRef.current === turnKey) {
        return;
      }
      lastProcessedTurnRef.current = turnKey;

      // פונקציית סיום תור מותאמת לבוט
      const endTurnForBot = () => {
        const nextIndex = (currentPlayerIndex + 1) % players.length;
        setCurrentPlayerIndex(nextIndex);
        setTurnSubPhase("BEFORE_ROLL");
      };

      // מגן למניעת עדכוני סטייט מאוחרים של בוטים שנעצרו או שזמנם עבר
      const guard = <T extends (...args: any[]) => any>(fn: T): T => {
        return ((...args: any[]) => {
          const latestTurnKey = `${gamePhase}-${currentPlayerIndex}-${turnSubPhase}`;
          if (latestTurnKey === turnKey) {
            return fn(...args);
          } else {
            console.warn(`[מערכת] נחסם ניסיון עדכון של בוט ישן לאחר שהתור כבר התקדם. מפתח תור צפוי: ${turnKey}, מפתח נוכחי: ${latestTurnKey}`);
          }
        }) as any;
      };

      // הפעלת ה-AI Controller עם הנתונים והסטייט הנוכחיים
      runAITurn({
        botPlayer: activePlayer,
        turnSubPhase,
        gamePhase,
        tiles,
        vertices,
        edges,
        players,
        addLog,
        handleDiceRoll: guard(handleDiceRoll),
        endTurn: guard((gamePhase === "SETUP_ROUND_1" || gamePhase === "SETUP_ROUND_2") ? endTurn : endTurnForBot),
        setVertices: guard(setVertices),
        setEdges: guard(setEdges),
        setPlayers: guard(setPlayers),
        recordSetupPlacement: guard(recordSetupPlacement),
        setTiles: guard(setTiles),
        setTurnSubPhase: guard(setTurnSubPhase)
      });
    }
  }, [currentPlayerIndex, turnSubPhase, gamePhase, activePlayer, endTurn, recordSetupPlacement, handleDiceRoll, players, addLog, setTiles, setTurnSubPhase, startTurn]);

  const handleStartGame = () => {
    lastProcessedTurnRef.current = "";
    lastStartedTurnRef.current = "";
    initNewGame();
    const selectedPlayers = lobbyPlayers.slice(0, playerCount).map((p, index) => {
      const difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_HARD' | undefined = p.isBot ? (p.difficulty === 'קל' ? 'EASY' : p.difficulty === 'קשה' ? 'HARD' : p.difficulty === 'סופר קשה' ? 'SUPER_HARD' : 'MEDIUM') : undefined;
      const archetype: 'BUILDER' | 'DEVELOPER' | undefined = (p.isBot && difficulty === 'HARD') ? (Math.random() < 0.5 ? 'BUILDER' : 'DEVELOPER') : undefined;

      return {
        id: p.id,
        name: p.name,
        color: p.color,
        isBot: p.isBot,
        difficulty,
        ...(archetype ? { archetype } : {}),
        victoryPoints: 2,
        resources: index === 0 ? { WOOD: 2, BRICK: 2, SHEEP: 1, WHEAT: 1, ORE: 0 } : { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
        developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
        knightsPlayed: 0
      };
    });
    setPlayers(selectedPlayers);
  };

  const handlePlayCard = (cardType: 'KNIGHT' | 'MONOPOLY' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY') => {
    if (activePlayer?.id !== humanPlayer.id || turnSubPhase !== 'TRADE_AND_BUILD') return;
    const devCards = humanPlayer.developmentCards || { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0 };
    if ((devCards[cardType] || 0) <= 0) return;

    if (cardType === 'KNIGHT') {
      setPlayers(prevPlayers => prevPlayers.map(p => {
        if (p.id === humanPlayer.id) {
          return {
            ...p,
            knightsPlayed: (p.knightsPlayed || 0) + 1,
            developmentCards: {
              ...p.developmentCards,
              KNIGHT: Math.max(0, p.developmentCards.KNIGHT - 1)
            }
          };
        }
        return p;
      }));
      setTurnSubPhase('ROBBER_PLACEMENT');
      addLog(`[קלף פיתוח] ${humanPlayer.name} הפעיל קלף אביר ומזיז את השודד!`);
    } else if (cardType === 'MONOPOLY') {
      setIsMonopolyModalOpen(true);
    } else if (cardType === 'ROAD_BUILDING') {
      setPlayers(prevPlayers => prevPlayers.map(p => {
        if (p.id === humanPlayer.id) {
          return {
            ...p,
            developmentCards: {
              ...p.developmentCards,
              ROAD_BUILDING: Math.max(0, p.developmentCards.ROAD_BUILDING - 1)
            }
          };
        }
        return p;
      }));
      setRoadBuildingRemaining(2);
      setPrevRoadCount(edges.filter(e => e.hasRoad && e.playerId === humanPlayer.id).length);
      addLog(`[קלף פיתוח] ${humanPlayer.name} הפעיל קלף בניית כבישים ומקבל 2 כבישים חינם לבנייה!`);
    } else if (cardType === 'YEAR_OF_PLENTY') {
      setIsYearOfPlentyModalOpen(true);
    }
  };

  const handleExecuteYearOfPlenty = () => {
    setPlayers(prevPlayers => prevPlayers.map(p => {
      if (p.id === humanPlayer.id) {
        return {
          ...p,
          resources: {
            ...p.resources,
            [yopRes1]: (p.resources[yopRes1] || 0) + 1,
            [yopRes2]: (p.resources[yopRes2] || 0) + 1
          },
          developmentCards: {
            ...p.developmentCards,
            YEAR_OF_PLENTY: Math.max(0, (p.developmentCards.YEAR_OF_PLENTY || 0) - 1)
          }
        };
      }
      return p;
    }));

    const resourceLabels: Record<string, string> = {
      WOOD: 'עץ',
      BRICK: 'לבנה',
      SHEEP: 'כבש',
      WHEAT: 'חיטה',
      ORE: 'ברזל'
    };

    addLog(`[קלף פיתוח] ${humanPlayer.name} הפעיל קלף שנת שפע וקיבל 1 ${resourceLabels[yopRes1]} ו-1 ${resourceLabels[yopRes2]} מהקופה!`);
    setIsYearOfPlentyModalOpen(false);
  };

  // Moved down outside GameContent below or defined properly


  // AI bot decision logic for trade
  const evaluateBotTradeDecision = (
    bot: typeof humanPlayer,
    offerResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE',
    offerAmount: number,
    demandResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE',
    demandAmount: number
  ): boolean => {
    // Check if the bot has the requested resource
    const botStock = bot.resources[demandResource] || 0;
    if (botStock < demandAmount) {
      return false; // Instant rejection if bot doesn't have enough
    }

    // Easy bot automatically accepts any fair trade (1 for 1) if it has the resource
    if (bot.difficulty === 'EASY' && offerAmount === 1 && demandAmount === 1) {
      return true;
    }

    // Bot resources structure
    const res = bot.resources;

    // Medium bot trading logic (direct target-oriented trading)
    if (bot.difficulty === 'MEDIUM') {
      const target = getMediumBotTarget(bot, gamePhase, tiles, vertices, edges);
      if (target) {
        // Must receive a resource we need for our target
        const isNeeded = (bot.resources[offerResource] || 0) < (target.cost[offerResource] || 0);
        if (!isNeeded) {
          return false; // Reject if what we get doesn't advance our target
        }
        // Must not give away a resource we need for our target
        const isGivingAwayNeeded = (target.cost[demandResource] || 0) > 0 && (bot.resources[demandResource] || 0) <= (target.cost[demandResource] || 0);
        if (isGivingAwayNeeded) {
          return false; // Reject if we give away something we need
        }
        
        // If it passes both, the trade is directly advancing and safe.
        // It'll accept with high probability, but also check ratio so it doesn't do a bad ratio trade.
        const ratio = offerAmount / demandAmount;
        let acceptProbability = 0.85;
        if (ratio < 1) {
          acceptProbability -= 0.35; // Bot dislikes giving more than receiving
        }
        return Math.random() < Math.max(0.1, acceptProbability);
      }
    }

    // Building costs
    const ROAD_COST = { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 };
    const SETTLEMENT_COST = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 };
    const CITY_COST = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 };

    // Function to calculate missing resources for a building
    const getMissingResources = (cost: typeof ROAD_COST) => {
      let missingCount = 0;
      const missingMap: Record<string, number> = {};
      let isAffordable = true;

      for (const key of ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const) {
        const needed = cost[key] || 0;
        const current = res[key] || 0;
        if (current < needed) {
          isAffordable = false;
          const diff = needed - current;
          missingCount += diff;
          missingMap[key] = diff;
        }
      }
      return { isAffordable, missingCount, missingMap };
    };

    const roadInfo = getMissingResources(ROAD_COST);
    const settlementInfo = getMissingResources(SETTLEMENT_COST);
    const cityInfo = getMissingResources(CITY_COST);

    // Filter pending goals (exclude already affordable ones)
    const goals = [
      { name: 'ROAD', ...roadInfo, cost: ROAD_COST },
      { name: 'SETTLEMENT', ...settlementInfo, cost: SETTLEMENT_COST },
      { name: 'CITY', ...cityInfo, cost: CITY_COST }
    ];

    const pendingGoals = goals.filter(g => !g.isAffordable && g.missingCount > 0);
    // Sort so closest goal is first
    pendingGoals.sort((a, b) => a.missingCount - b.missingCount);

    const closestGoal = pendingGoals[0];

    // Check if the resource player is giving (offerResource) is missing for the closest goal
    const isNeededForClosestGoal = closestGoal && (closestGoal.missingMap[offerResource] || 0) > 0;

    // Check if the resource player is requesting (demandResource) is critical for bot's closest goal
    // It's critical if the closest goal requires it and the bot does not have excess resources of this type.
    const isCritical = closestGoal && 
      (closestGoal.cost[demandResource] || 0) > 0 && 
      (res[demandResource] || 0) <= (closestGoal.cost[demandResource] || 0);

    let acceptProbability = 0.3; // Default fair trade probability

    if (isNeededForClosestGoal && !isCritical) {
      acceptProbability = 0.85; // High agreement rate if it helps the bot build next
    } else if (isCritical) {
      acceptProbability = 0.10; // Low agreement if we take something they critically need
    } else if (!isCritical && !isNeededForClosestGoal) {
      acceptProbability = 0.40; // Moderate if not critical and not immediately needed
    }

    // Ratio multiplier (player offers more resources for less)
    const ratio = offerAmount / demandAmount;
    if (ratio >= 2) {
      acceptProbability += 0.40; // Double resource trade bonus
    } else if (ratio > 1) {
      acceptProbability += 0.20;
    } else if (ratio < 1) {
      acceptProbability -= 0.35; // Bot hates giving more than they receive
    }

    // Clamp between 0 and 1
    acceptProbability = Math.max(0, Math.min(1, acceptProbability));

    return Math.random() < acceptProbability;
  };

  const handleProposeTrade = () => {
    // Validate player resources
    const playerStock = humanPlayer.resources[giveRes] || 0;
    if (playerStock < giveAmt) {
      alert(`אין לך מספיק משאבים מסוג ${giveRes} (יש לך ${playerStock})!`);
      return;
    }

    if (giveRes === receiveRes) {
      alert("לא ניתן לבצע עסקה על אותו משאב!");
      return;
    }

    // Find bot(s) to trade with
    const botsToTrade = players.filter(p => p.isBot && (targetBotId === 'ALL' || p.id === targetBotId));

    if (botsToTrade.length === 0) {
      alert("לא נמצאו בוטים מתאימים למסחר.");
      return;
    }

    let tradeExecuted = false;

    for (const bot of botsToTrade) {
      const botAgreed = evaluateBotTradeDecision(bot, giveRes, giveAmt, receiveRes, receiveAmt);

      if (botAgreed) {
        // EXECUTE TRADE
        setPlayers((prevPlayers: any[]) => prevPlayers.map(p => {
          if (p.id === humanPlayer.id) {
            return {
              ...p,
              resources: {
                ...p.resources,
                [giveRes]: (p.resources[giveRes] || 0) - giveAmt,
                [receiveRes]: (p.resources[receiveRes] || 0) + receiveAmt
              }
            };
          } else if (p.id === bot.id) {
            return {
              ...p,
              resources: {
                ...p.resources,
                [giveRes]: (p.resources[giveRes] || 0) + giveAmt,
                [receiveRes]: (p.resources[receiveRes] || 0) - receiveAmt
              }
            };
          }
          return p;
        }));

        addLog(`[מסחר] בוט ${bot.name} קיבל את ההצעה שלך והעסקה בוצעה!`);
        tradeExecuted = true;
        setIsTradeModalOpen(false);
        break; // Trade is completed with the first bot that accepts
      } else {
        addLog(`[מסחר] בוט ${bot.name} סירב להצעת המסחר שלך.`);
      }
    }

    if (!tradeExecuted) {
      alert("כל הבוטים סירבו להצעת המסחר שלך.");
    }
  };

  // תצוגת מסך הלובי / פתיחה - תומכת בגלילה פנימית כדי למנוע גלילה גלובלית ביישום
  if (gamePhase === 'LOBBY') {
    return (
      <LobbyScreen
        playerCount={playerCount}
        setPlayerCount={setPlayerCount}
        lobbyPlayers={lobbyPlayers}
        setLobbyPlayers={setLobbyPlayers}
        togglePlayerType={togglePlayerType}
        botTimeLimit={botTimeLimit}
        setBotTimeLimit={setBotTimeLimit}
        handleStartGame={handleStartGame}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen fixed inset-0 bg-slate-950 text-slate-100 font-sans p-4 gap-4 overflow-hidden">
      
      {/* פריסה צידית: מכילה את לוח השליטה (למעלה) ואת לוג ההיסטוריה (למטה) */}
      <aside className="w-64 flex flex-col gap-4 h-full z-10">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
          <ActionSidebar />
        </div>
        <GameLog />
      </aside>

      {/* האזור המרכזי: לוח המשחק והיד של השחקן */}
      <main className="flex-1 flex flex-col gap-4 h-full relative overflow-hidden">
        
        {/* כותרת עליונה ייעודית קבועה בפריסת Flex */}
        <header className="py-3 px-4 flex-none w-full flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur shadow-md select-none z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs md:text-sm font-bold text-slate-200">
              משחק כעת: <span className="player-name text-amber-400 font-extrabold">{activePlayer?.name}</span>
            </span>
          </div>

          {/* תצוגת מספר הקלפים של כל השחקנים בכל רגע נתון */}
          {players.length > 0 && (
            <div className="flex items-center gap-2.5 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800/60 shadow-inner">
              {players.map((p) => {
                const totalCards = Object.values(p.resources).reduce((sum, count) => sum + count, 0);
                const holdsLongestRoad = longestRoadPlayerId === p.id;
                const holdsLargestArmy = largestArmyPlayerId === p.id;
                return (
                  <div 
                    key={p.id} 
                    className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800/80 shadow"
                    style={{ borderRight: `3px solid ${p.color}` }}
                  >
                    <span className="text-slate-300 text-[11px] font-medium">{p.name}:</span>
                    <span className="text-amber-400 font-black font-mono text-[11px]">{totalCards} קלפים</span>
                    
                    {/* תעודות חיווי עשיר */}
                    {(holdsLongestRoad || holdsLargestArmy) && (
                      <div className="flex items-center gap-1 mr-1 border-r border-slate-800 pr-1.5">
                        {holdsLongestRoad && (
                          <img 
                            src="/badge_longest_road.png" 
                            alt="Longest Road" 
                            className="w-4 h-4 object-contain animate-bounce" 
                            style={{ animationDuration: '3s' }}
                            title="הדרך הארוכה ביותר (Longest Road)" 
                          />
                        )}
                        {holdsLargestArmy && (
                          <img 
                            src="/badge_largest_army.png" 
                            alt="Largest Army" 
                            className="w-4 h-4 object-contain animate-bounce"
                            style={{ animationDuration: '3s', animationDelay: '0.5s' }}
                            title="הצבא הגדול ביותר (Largest Army)" 
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* תצוגת מחזיקי התעודות המרכזית */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800/60 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-400 text-[10px]">הדרך הארוכה ביותר:</span>
              {players.find(p => p.id === longestRoadPlayerId) ? (
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 shadow" style={{ borderRight: `2.5px solid ${players.find(p => p.id === longestRoadPlayerId)?.color}` }}>
                  <img src="/badge_longest_road.png" alt="Longest Road" className="w-4 h-4 object-contain animate-pulse" />
                  <span className="text-slate-200 text-[11px]">{players.find(p => p.id === longestRoadPlayerId)?.name}</span>
                </div>
              ) : (
                <span className="text-slate-600 text-[11px] italic">אין מחזיק</span>
              )}
            </div>
            <div className="w-px h-4 bg-slate-800" />
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-400 text-[10px]">הצבא הגדול ביותר:</span>
              {players.find(p => p.id === largestArmyPlayerId) ? (
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 shadow" style={{ borderRight: `2.5px solid ${players.find(p => p.id === largestArmyPlayerId)?.color}` }}>
                  <img src="/badge_largest_army.png" alt="Largest Army" className="w-4 h-4 object-contain animate-pulse" />
                  <span className="text-slate-200 text-[11px]">{players.find(p => p.id === largestArmyPlayerId)?.name}</span>
                </div>
              ) : (
                <span className="text-slate-600 text-[11px] italic">אין מחזיק</span>
              )}
            </div>
          </div>
          
          {/* סרגל שליטה וניטור זמן תגובה בזמן אמת עבור הבוטים */}
          {activePlayer?.isBot && (
            <div className="flex items-center gap-4 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800/80 animate-fade-in shadow-inner">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>⏱️</span>
                <span className="font-bold">זמן תגובה:</span>
                <span className={`font-mono font-black px-1.5 py-0.5 rounded ${timeLeft <= 3 ? 'text-rose-400 bg-rose-500/10 animate-pulse font-extrabold' : 'text-amber-400 bg-amber-500/10'}`}>
                  {timeLeft} שניות
                </span>
              </div>
              <button
                onClick={forceNextTurn}
                className="bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/25 text-white text-xs font-black py-1 px-3 rounded-md transition-all duration-200 active:scale-95 cursor-pointer border border-rose-500"
                title="עצור את הבוט הנוכחי והמשך לשחקן הבא"
              >
                🛑 עצור
              </button>
            </div>
          )}

          <span className="text-[10px] md:text-xs text-slate-400 font-medium">Catan Premium Edition</span>
        </header>

        <PhaseGuide />

        {/* כפתור פתיחת ממשק מסחר */}
        {turnSubPhase === 'TRADE_AND_BUILD' && !activePlayer?.isBot && (
          <div className="flex justify-end px-4 z-10 -mb-2">
            <button
              onClick={() => setIsTradeModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-2.5 px-5 rounded-xl shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:brightness-110 active:scale-[0.97] transition-all text-sm cursor-pointer flex items-center gap-2 border border-amber-400 animate-pulse"
            >
              <DealIcon size={16} primaryColor="currentColor" secondaryColor="currentColor" />
              <span>הצעת עסקה לשחקנים</span>
            </button>
          </div>
        )}

        {/* התראה על בניית כבישים חינם */}
        {roadBuildingRemaining > 0 && (
          <div className="flex-none mx-4 mb-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-right flex items-center justify-between animate-pulse" dir="rtl">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎁</span>
              <div>
                <div className="text-sm font-bold text-emerald-400">קלף בניית כבישים פעיל!</div>
                <div className="text-xs text-slate-400">בחר עוד כבישים פנויים וחוקיים על הלוח כדי לבנותם בחינם.</div>
              </div>
            </div>
            <div className="text-emerald-400 font-extrabold text-sm px-3 py-1 bg-emerald-500/20 rounded-full">
              כבישים שנותרו: {roadBuildingRemaining}
            </div>
          </div>
        )}

        {/* פריסה דינמית המבוססת על מיקום פאנל המשאבים */}
        <div className={`flex flex-1 gap-4 min-h-0 w-full ${resourcePosition === 'right' ? 'flex-row' : 'flex-col'} overflow-hidden`}>
          
          {/* לוח ה-SVG המשושה - GameBoard3D */}
          <div className="flex-1 bg-slate-900/40 border-2 border-slate-800 rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center min-h-0">
            <GameBoard3D />
          </div>

          {/* פאנל המשאבים בצד ימין (אם נבחר מיקום ימני) */}
          {resourcePosition === 'right' && (
            <aside className={`flex-none transition-all duration-300 ${(isResourceCollapsed && isDevPanelCollapsed) ? 'w-24' : 'w-80'} h-full z-10 flex flex-col gap-4 overflow-y-auto`}>
              <div className="flex-none">
                <ResourceContainer 
                  resources={humanPlayer.resources} 
                  playerName={humanPlayer.name} 
                  position={resourcePosition}
                  isCollapsed={isResourceCollapsed}
                  onPositionChange={setResourcePosition}
                  onToggleCollapsed={() => setIsResourceCollapsed(prev => !prev)}
                />
              </div>
              <div className={`transition-all duration-300 ${isDevPanelCollapsed ? 'flex-none h-auto' : 'flex-1 min-h-[220px]'}`}>
                <DevelopmentCardsPanel 
                  handlePlayCard={handlePlayCard} 
                  isCollapsed={isDevPanelCollapsed}
                  onToggle={() => setIsDevPanelCollapsed(prev => !prev)}
                />
              </div>
            </aside>
          )}

          {/* פאנל המשאבים התחתון (אם נבחר מיקום תחתון) - ממוקם כחלק מהפריסה הדינמית למניעת הסתרה וחורים ריקים */}
          {resourcePosition === 'bottom' && (
            <footer className="w-full z-10 flex flex-col md:flex-row gap-4 flex-none">
              <div className="flex-1">
                <ResourceContainer 
                  resources={humanPlayer.resources} 
                  playerName={humanPlayer.name} 
                  position={resourcePosition}
                  isCollapsed={isResourceCollapsed}
                  onPositionChange={setResourcePosition}
                  onToggleCollapsed={() => setIsResourceCollapsed(prev => !prev)}
                />
              </div>
              <div className={`w-full md:w-96 flex-none transition-all duration-300 ${isDevPanelCollapsed ? 'h-auto' : 'h-[350px]'}`}>
                <DevelopmentCardsPanel 
                  handlePlayCard={handlePlayCard} 
                  isCollapsed={isDevPanelCollapsed}
                  onToggle={() => setIsDevPanelCollapsed(prev => !prev)}
                />
              </div>
            </footer>
          )}

        </div>

        {/* מודל מסחר אינטראקטיבי */}
        {isTradeModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-right" dir="rtl">
              <button 
                onClick={() => setIsTradeModalOpen(false)}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
              >
                <CrossIcon size={16} />
              </button>
              
              <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
                <DealIcon size={22} className="text-amber-500 inline-block" />
                <span>הצעת מסחר לשחקני המחשב</span>
              </h3>

              <div className="space-y-5">
                {/* GIVE SECTION */}
                <div>
                  <label className="block text-slate-300 text-sm font-bold mb-2">אני מציע לתת (Give):</label>
                  <div className="flex gap-3">
                    <select
                      value={giveRes}
                      onChange={(e) => setGiveRes(e.target.value as any)}
                      className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="WOOD">עץ 🪵 (יש לך: {humanPlayer.resources.WOOD || 0})</option>
                      <option value="BRICK">לבנה 🧱 (יש לך: {humanPlayer.resources.BRICK || 0})</option>
                      <option value="SHEEP">כבש 🐑 (יש לך: {humanPlayer.resources.SHEEP || 0})</option>
                      <option value="WHEAT">חיטה 🌾 (יש לך: {humanPlayer.resources.WHEAT || 0})</option>
                      <option value="ORE">ברזל 🪨 (יש לך: {humanPlayer.resources.ORE || 0})</option>
                    </select>
                    
                    <input
                      type="number"
                      min={1}
                      max={humanPlayer.resources[giveRes] || 0}
                      value={giveAmt}
                      onChange={(e) => setGiveAmt(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* RECEIVE SECTION */}
                <div>
                  <label className="block text-slate-300 text-sm font-bold mb-2">אני מבקש לקבל (Receive):</label>
                  <div className="flex gap-3">
                    <select
                      value={receiveRes}
                      onChange={(e) => setReceiveRes(e.target.value as any)}
                      className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="BRICK">לבנה 🧱</option>
                      <option value="WOOD">עץ 🪵</option>
                      <option value="SHEEP">כבש 🐑</option>
                      <option value="WHEAT">חיטה 🌾</option>
                      <option value="ORE">ברזל 🪨</option>
                    </select>
                    
                    <input
                      type="number"
                      min={1}
                      value={receiveAmt}
                      onChange={(e) => setReceiveAmt(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* TARGET BOT */}
                <div>
                  <label className="block text-slate-300 text-sm font-bold mb-2">שחקן יעד להצעה:</label>
                  <select
                    value={targetBotId}
                    onChange={(e) => setTargetBotId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="ALL">כל השחקנים (הבוט הראשון שמסכים יבצע את העסקה)</option>
                    {players.filter(p => p.isBot).map(bot => (
                      <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                  </select>
                </div>

                {/* VALIDATION WARNING */}
                {(humanPlayer.resources[giveRes] || 0) < giveAmt && (
                  <div className="text-red-400 text-xs font-bold bg-red-500/10 p-2.5 rounded-xl border border-red-500/25 flex items-center gap-2">
                    <WarningIcon size={16} className="text-red-500 inline-block" />
                    <span>שים לב: אין לך מספיק משאבים מסוג {giveRes} להצעה זו!</span>
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleProposeTrade}
                  disabled={(humanPlayer.resources[giveRes] || 0) < giveAmt || giveRes === receiveRes}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed transition-all text-sm"
                >
                  שלח הצעת מסחר
                </button>
                <button
                  onClick={() => setIsTradeModalOpen(false)}
                  className="px-6 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-700 hover:text-white transition-all text-sm"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* מודל מונופול לקבלת משאבים */}
        {isMonopolyModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right" dir="rtl">
              <button 
                onClick={() => setIsMonopolyModalOpen(false)}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
              >
                <CrossIcon size={16} />
              </button>
              
              <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
                <MonopolyIcon size={22} className="text-cyan-400 inline-block" />
                <span>קלף מונופול - בחירת משאב</span>
              </h3>

              <p className="text-sm text-slate-300 mb-6">
                בחר סוג משאב אחד. כל שאר הבוטים במשחק ייאלצו למסור לך את כל קלפי המשאב הזה שברשותם!
              </p>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { type: 'WOOD' as const, label: 'עץ', icon: <WoodIcon size={20} className="text-emerald-400" />, emojiStr: '🪵', hover: 'hover:bg-emerald-950/30 hover:border-emerald-500/50' },
                  { type: 'BRICK' as const, label: 'לבנה', icon: <BrickIcon size={20} className="text-orange-400" />, emojiStr: '🧱', hover: 'hover:bg-orange-950/30 hover:border-orange-500/50' },
                  { type: 'SHEEP' as const, label: 'כבש', icon: <SheepIcon size={20} className="text-lime-400" />, emojiStr: '🐑', hover: 'hover:bg-lime-950/30 hover:border-lime-500/50' },
                  { type: 'WHEAT' as const, label: 'חיטה', icon: <WheatIcon size={20} className="text-amber-400" />, emojiStr: '🌾', hover: 'hover:bg-amber-950/30 hover:border-amber-500/50' },
                  { type: 'ORE' as const, label: 'ברזל', icon: <OreIcon size={20} className="text-slate-400" />, emojiStr: '🪨', hover: 'hover:bg-slate-800/30 hover:border-slate-500/50' },
                ].map((res) => (
                  <button
                    key={res.type}
                    onClick={() => {
                      let stolen = 0;
                      players.forEach(p => {
                        if (p.id !== humanPlayer.id && p.isBot) {
                          stolen += p.resources[res.type] || 0;
                        }
                      });

                      setPlayers(prevPlayers => prevPlayers.map(p => {
                        if (p.id === humanPlayer.id) {
                          return {
                            ...p,
                            resources: {
                              ...p.resources,
                              [res.type]: (p.resources[res.type] || 0) + stolen
                            },
                            developmentCards: {
                              ...p.developmentCards,
                              MONOPOLY: Math.max(0, (p.developmentCards.MONOPOLY || 0) - 1)
                            }
                          };
                        } else if (p.isBot) {
                          return {
                            ...p,
                            resources: {
                              ...p.resources,
                              [res.type]: 0
                            }
                          };
                        }
                        return p;
                      }));

                      addLog(`[קלף פיתוח] ${humanPlayer.name} הפעיל קלף מונופול ומקבל את כל קלפי ה-${res.label}! נגזלו ${stolen} קלפים משאר השחקנים.`);
                      setIsMonopolyModalOpen(false);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 text-sm font-bold transition-all ${res.hover} active:scale-[0.98] cursor-pointer`}
                  >
                    <span className="flex items-center gap-3">
                      <span>{res.icon}</span>
                      <span>{res.label}</span>
                    </span>
                    <span className="text-slate-500 font-medium text-xs">בחר ➔</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* מודל שנת שפע לבחירת משאבים */}
        {isYearOfPlentyModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right" dir="rtl">
              <button 
                onClick={() => setIsYearOfPlentyModalOpen(false)}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
              >
                <CrossIcon size={16} />
              </button>
              
              <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>🌾 קלף שנת שפע - קבלת 2 משאבים</span>
              </h3>

              <p className="text-sm text-slate-300 mb-6">
                בחר שני משאבים לקבלתם באופן מיידי מהבנק:
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1.5">משאב ראשון:</label>
                  <select
                    value={yopRes1}
                    onChange={(e) => setYopRes1(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  >
                    <option value="WOOD">עץ 🪵</option>
                    <option value="BRICK">לבנה 🧱</option>
                    <option value="SHEEP">כבש 🐑</option>
                    <option value="WHEAT">חיטה 🌾</option>
                    <option value="ORE">ברזל 🪨</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-bold mb-1.5">משאב שני:</label>
                  <select
                    value={yopRes2}
                    onChange={(e) => setYopRes2(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  >
                    <option value="WOOD">עץ 🪵</option>
                    <option value="BRICK">לבנה 🧱</option>
                    <option value="SHEEP">כבש 🐑</option>
                    <option value="WHEAT">חיטה 🌾</option>
                    <option value="ORE">ברזל 🪨</option>
                  </select>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleExecuteYearOfPlenty}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm"
                >
                  אשר וקבל משאבים
                </button>
                <button
                  onClick={() => setIsYearOfPlentyModalOpen(false)}
                  className="px-6 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-700 hover:text-white transition-all text-sm"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* מודל מסחר בנמל מונחה-משתמש */}
        {activePortTrade && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right" dir="rtl">
              <button 
                onClick={() => setActivePortTrade(null)}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
              >
                <CrossIcon size={16} />
              </button>
              
              <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
                <DealIcon size={22} className="text-emerald-500 inline-block" />
                <span>
                  {activePortTrade.harborType === 'GENERIC' 
                    ? '⛵ מסחר בנמל כללי (3:1)' 
                    : `⚓ מסחר בנמל ${activePortTrade.harborType === 'WOOD' ? 'עץ (2:1)' : 
                       activePortTrade.harborType === 'BRICK' ? 'לבנה (2:1)' : 
                       activePortTrade.harborType === 'SHEEP' ? 'כבש (2:1)' : 
                       activePortTrade.harborType === 'WHEAT' ? 'חיטה (2:1)' : 'ברזל (2:1)'}`}
                </span>
              </h3>

              {/* כפתור שדרוג מהיר לעיר בראש פאנל המסחר */}
              {(() => {
                const liveVertex = vertices.find(v => v.id === activePortTrade.id);
                const canUpgrade = liveVertex && liveVertex.structure === 'SETTLEMENT' && liveVertex.playerId === humanPlayer.id;
                
                if (!canUpgrade) return null;

                const hasResources = humanPlayer.resources.WHEAT >= 2 && humanPlayer.resources.ORE >= 3;
                
                return (
                  <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/35 rounded-xl text-right flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-400">👑 ניתן לשדרג יישוב נמל זה לעיר!</div>
                      <div className="text-xs text-slate-400 mt-1">עלות: 3 ברזל, 2 חיטה (ברשותך: {humanPlayer.resources.ORE || 0} ברזל, {humanPlayer.resources.WHEAT || 0} חיטה)</div>
                    </div>
                    <button
                      onClick={() => {
                        showBuildingCostToast('CITY', hasResources);
                        if (!hasResources) {
                          addLog(`אין לך מספיק משאבים לשדרוג לעיר! נדרש: 3 ברזל, 2 חיטה.`);
                          return;
                        }
                        
                        // Deduct resources & add victory points
                        setPlayers((prev: any[]) => prev.map(p => p.id === humanPlayer.id 
                          ? {
                              ...p,
                              victoryPoints: p.victoryPoints + 1,
                              resources: {
                                ...p.resources,
                                WHEAT: p.resources.WHEAT - 2,
                                ORE: p.resources.ORE - 3
                              }
                            }
                          : p
                        ));

                        // Update the vertex on the board
                        setVertices((prevVertices: any[]) => prevVertices.map(v => 
                          v.id === activePortTrade.id 
                            ? { ...v, structure: 'CITY' } 
                            : v
                        ));

                        addLog(`שחקן ${humanPlayer.name} שדרג יישוב נמל לעיר! עלות: 3 ברזל, 2 חיטה.`);
                        setActivePortTrade(null);
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-lg hover:brightness-110 active:scale-[0.97] transition-all text-xs cursor-pointer shadow-md shadow-amber-500/10"
                    >
                      שדרג לעיר
                    </button>
                  </div>
                );
              })()}

              {activePortTrade.harborType !== 'GENERIC' ? (
                // --- SPECIALIZED HARBOR (2:1) ---
                <div className="space-y-5">
                  <p className="text-sm text-slate-300">
                    הנמל הנוכחי מאפשר לך להחליף <span className="font-bold text-amber-400">2 יחידות משאב נמל</span> תמורת <span className="font-bold text-emerald-400">יחידה אחת</span> של כל משאב אחר.
                  </p>

                  <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>אתה נותן (2 יחידות):</span>
                      <span className="font-mono text-amber-500 font-bold">
                        יש לך: {activePortTrade?.harborType ? (humanPlayer.resources[activePortTrade.harborType as 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'] || 0) : 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-bold text-sm text-slate-200">
                      {activePortTrade.harborType === 'WOOD' && <><WoodIcon size={18} className="text-emerald-500" /> <span>2 עץ</span></>}
                      {activePortTrade.harborType === 'BRICK' && <><BrickIcon size={18} className="text-orange-500" /> <span>2 לבנה</span></>}
                      {activePortTrade.harborType === 'SHEEP' && <><SheepIcon size={18} className="text-lime-500" /> <span>2 כבש</span></>}
                      {activePortTrade.harborType === 'WHEAT' && <><WheatIcon size={18} className="text-amber-500" /> <span>2 חיטה</span></>}
                      {activePortTrade.harborType === 'ORE' && <><OreIcon size={18} className="text-slate-500" /> <span>2 ברזל</span></>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-2">בחר משאב לקבל (Receive):</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const)
                        .filter(r => r !== activePortTrade.harborType)
                        .map(res => {
                          const labels: Record<string, string> = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };
                          const icons: Record<string, any> = { 
                            WOOD: <WoodIcon size={16} className="text-emerald-500" />,
                            BRICK: <BrickIcon size={16} className="text-orange-500" />,
                            SHEEP: <SheepIcon size={16} className="text-lime-500" />,
                            WHEAT: <WheatIcon size={16} className="text-amber-500" />,
                            ORE: <OreIcon size={16} className="text-slate-500" />
                          };
                          return (
                            <button
                              key={res}
                              onClick={() => executeHarborTrade(activePortTrade.harborType as any, res, 2)}
                              disabled={!activePortTrade?.harborType || (humanPlayer.resources[activePortTrade.harborType as 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'] || 0) < 2}
                              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 text-xs font-bold hover:bg-emerald-950/20 hover:border-emerald-500/30 transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {icons[res]}
                              <span>{labels[res]}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                // --- GENERIC HARBOR (3:1) ---
                <div className="space-y-5">
                  <p className="text-sm text-slate-300">
                    הנמל הנוכחי מאפשר לך להחליף <span className="font-bold text-amber-400">3 יחידות מכל משאב מאותו סוג</span> תמורת <span className="font-bold text-emerald-400">יחידה אחת</span> של כל משאב אחר.
                  </p>

                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-2">איזה משאב תרצה לתת (3 יחידות)?</label>
                    <select
                      value={harborGiveRes}
                      onChange={(e) => setHarborGiveRes(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                    >
                      <option value="WOOD">עץ 🪵 (יש לך: {humanPlayer.resources.WOOD || 0})</option>
                      <option value="BRICK">לבנה 🧱 (יש לך: {humanPlayer.resources.BRICK || 0})</option>
                      <option value="SHEEP">כבש 🐑 (יש לך: {humanPlayer.resources.SHEEP || 0})</option>
                      <option value="WHEAT">חיטה 🌾 (יש לך: {humanPlayer.resources.WHEAT || 0})</option>
                      <option value="ORE">ברזל 🪨 (יש לך: {humanPlayer.resources.ORE || 0})</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-bold mb-2">איזה משאב תרצה לקבל (יחידה אחת)?</label>
                    <select
                      value={harborReceiveRes}
                      onChange={(e) => setHarborReceiveRes(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                    >
                      <option value="BRICK">לבנה 🧱</option>
                      <option value="WOOD">עץ 🪵</option>
                      <option value="SHEEP">כבש 🐑</option>
                      <option value="WHEAT">חיטה 🌾</option>
                      <option value="ORE">ברזל 🪨</option>
                    </select>
                  </div>

                  {/* WARNING */}
                  {(humanPlayer.resources[harborGiveRes] || 0) < 3 && (
                    <div className="text-red-400 text-xs font-bold bg-red-500/10 p-2.5 rounded-xl border border-red-500/25 flex items-center gap-2">
                      <WarningIcon size={16} className="text-red-500 inline-block" />
                      <span>שים לב: אין לך 3 יחידות מסוג משאב זה!</span>
                    </div>
                  )}

                  {/* TRADE ACTION BUTTON */}
                  <button
                    onClick={() => executeHarborTrade(harborGiveRes, harborReceiveRes, 3)}
                    disabled={(humanPlayer.resources[harborGiveRes] || 0) < 3 || harborGiveRes === harborReceiveRes}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed transition-all text-sm cursor-pointer mt-4"
                  >
                    בצע החלפת נמל 3:1
                  </button>
                </div>
              )}

              <div className="flex gap-3 mt-6 border-t border-slate-800 pt-4">
                {(() => {
                  const liveVertex = vertices.find(v => v.id === activePortTrade.id);
                  const canUpgrade = liveVertex && liveVertex.structure === 'SETTLEMENT' && liveVertex.playerId === humanPlayer.id;
                  if (!canUpgrade) return null;

                  return (
                    <button
                      onClick={() => {
                        const hasResources = humanPlayer.resources.WHEAT >= 2 && humanPlayer.resources.ORE >= 3;
                        showBuildingCostToast('CITY', hasResources);
                        if (!hasResources) {
                          addLog(`אין לך מספיק משאבים לשדרוג לעיר! נדרש: 3 ברזל, 2 חיטה.`);
                          return;
                        }
                        
                        // Deduct resources & add victory points
                        setPlayers((prev: any[]) => prev.map(p => p.id === humanPlayer.id 
                          ? {
                              ...p,
                              victoryPoints: p.victoryPoints + 1,
                              resources: {
                                ...p.resources,
                                WHEAT: p.resources.WHEAT - 2,
                                ORE: p.resources.ORE - 3
                              }
                            }
                          : p
                        ));

                        // Update the vertex
                        setVertices((prevVertices: any[]) => prevVertices.map(v => 
                          v.id === activePortTrade.id 
                            ? { ...v, structure: 'CITY' } 
                            : v
                        ));

                        addLog(`שחקן ${humanPlayer.name} שדרג יישוב נמל לעיר! עלות: 3 ברזל, 2 חיטה.`);
                        setActivePortTrade(null);
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold py-2.5 rounded-xl hover:brightness-110 active:scale-[0.97] transition-all text-xs cursor-pointer"
                    >
                      👑 שדרג לעיר
                    </button>
                  );
                })()}
                <button
                  onClick={() => setActivePortTrade(null)}
                  className="w-full bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl hover:bg-slate-700 hover:text-white transition-all text-xs cursor-pointer"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        )}

        {/* פאנל בחירת שחקן לגניבת כרטיס (שודד) */}
        {robberyState && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right animate-fade-in" dir="rtl">
              <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>🥷 שודד - בחירת שחקן לגניבה</span>
              </h3>

              <p className="text-sm text-slate-300 mb-6">
                הזזת את השודד בהצלחה! כעת בחר שחקן אחד מהרשימה כדי לגנוב ממנו קלף משאב אקראי:
              </p>

              <div className="grid grid-cols-1 gap-3">
                {robberyState.targets.map((target) => {
                  const targetTotalCards = Object.values(target.resources).reduce((sum, count) => sum + count, 0);
                  return (
                    <button
                      key={target.id}
                      onClick={() => {
                        const { updatedPlayers, stolenResource } = stealRandomCard(humanPlayer.id, target.id, players);
                        setPlayers(updatedPlayers);
                        
                        const resourceLabels: Record<string, string> = {
                          WOOD: 'עץ',
                          BRICK: 'לבנה',
                          SHEEP: 'כבש',
                          WHEAT: 'חיטה',
                          ORE: 'ברזל'
                        };
                        const stolenLabel = stolenResource ? resourceLabels[stolenResource] : 'לא ידוע';

                        addLog(`[שודד] ${humanPlayer.name} שדד קלף משאב אקראי מ-${target.name}.`);
                        if (stolenResource) {
                          alert(`שדדת בהצלחה 1 קלף מסוג: ${stolenLabel}!`);
                        }
                        
                        setRobberyState(null);
                        setTurnSubPhase('TRADE_AND_BUILD');
                      }}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-200 text-sm font-bold transition-all hover:bg-rose-950/10 hover:border-rose-500/30 active:scale-[0.98] cursor-pointer"
                      style={{ borderRight: `4px solid ${target.color}` }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: target.color }}></span>
                        <span>{target.name}</span>
                      </span>
                      <span className="text-amber-500 font-extrabold text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        {targetTotalCards} קלפים
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* מודל הצבא הגדול ביותר */}
        {armyPopup && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center animate-fade-in" dir="rtl">
              <button 
                onClick={() => setArmyPopup(null)}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
              >
                <CrossIcon size={16} />
              </button>
              
              <img src="/badge_largest_army.png" alt="Largest Army" className="w-20 h-20 mx-auto mb-4 object-contain animate-bounce" style={{ animationDuration: '3s' }} />
              
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2">
                🏆 הצבא הגדול ביותר!
              </h3>

              {armyPopup.prevPlayer ? (
                <p className="text-slate-200 text-sm leading-relaxed mb-6">
                  השחקן <span className="font-extrabold" style={{ color: armyPopup.player.color }}>{armyPopup.player.name}</span> לקח את תעודת הצבא הגדול ביותר מידי <span className="font-extrabold" style={{ color: armyPopup.prevPlayer.color }}>{armyPopup.prevPlayer.name}</span>!
                </p>
              ) : (
                <p className="text-slate-200 text-sm leading-relaxed mb-6">
                  השחקן <span className="font-extrabold" style={{ color: armyPopup.player.color }}>{armyPopup.player.name}</span> זכה בתעודת הצבא הגדול ביותר בפעם הראשונה במשחק!
                </p>
              )}

              <button
                onClick={() => setArmyPopup(null)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer"
              >
                סגור (X)
              </button>
            </div>
          </div>
        )}

        {/* מודל הדרך הארוכה ביותר */}
        {roadPopup && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-center animate-fade-in" dir="rtl">
              <button 
                onClick={() => setRoadPopup(null)}
                className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800 flex items-center justify-center"
              >
                <CrossIcon size={16} />
              </button>
              
              <img src="/badge_longest_road.png" alt="Longest Road" className="w-20 h-20 mx-auto mb-4 object-contain animate-bounce" style={{ animationDuration: '3s' }} />
              
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2">
                🏆 הדרך הארוכה ביותר!
              </h3>

              {roadPopup.prevPlayer ? (
                <p className="text-slate-200 text-sm leading-relaxed mb-6">
                  השחקן <span className="font-extrabold" style={{ color: roadPopup.player.color }}>{roadPopup.player.name}</span> לקח את תעודת הדרך הארוכה ביותר מידי <span className="font-extrabold" style={{ color: roadPopup.prevPlayer.color }}>{roadPopup.prevPlayer.name}</span>!
                </p>
              ) : (
                <p className="text-slate-200 text-sm leading-relaxed mb-6">
                  השחקן <span className="font-extrabold" style={{ color: roadPopup.player.color }}>{roadPopup.player.name}</span> זכה בתעודת הדרך הארוכה ביותר בפעם הראשונה במשחק!
                </p>
              )}

              <button
                onClick={() => setRoadPopup(null)}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer"
              >
                סגור (X)
              </button>
            </div>
          </div>
        )}

        {/* קומפוננטת Overlay במסך מלא עבור זריקת משאבים כשהשודד מופעל */}
        <DiscardOverlay />

        {/* מודל סיום המשחק */}
        {gamePhase === 'GAME_OVER' && (() => {
          const winner = players.find(p => p.victoryPoints >= 10) || players.reduce((max, p) => p.victoryPoints > max.victoryPoints ? p : max, players[0]);
          return (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-slate-900 border-4 border-amber-500 rounded-3xl w-full max-w-2xl p-10 shadow-2xl relative text-center" dir="rtl">
                
                {/* Winner Crown Icon / Image */}
                <div className="w-32 h-32 mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                  <img 
                    src="/win5.png" 
                    alt="Victory" 
                    className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(245,158,11,0.3)] animate-bounce"
                    style={{ animationDuration: '4s' }}
                  />
                </div>

                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 mb-4 tracking-wider drop-shadow-sm leading-tight">
                  {winner ? `${winner.name} ניצח` : 'המשחק הסתיים'}
                </h1>
                
                <p className="text-xl text-slate-300 mb-8 font-medium">
                  {winner ? `כל הכבוד! ${winner.name} הגיע/ה ל-${winner.victoryPoints} נקודות ניצחון והוכתר/ה כשליט/ת קטאן!` : ''}
                </p>

                {/* Scoreboard table */}
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-6 mb-8 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-slate-400 mb-4 border-b border-slate-800 pb-2">טבלת הניקוד הסופית:</h3>
                  <div className="space-y-3">
                    {[...players]
                      .sort((a, b) => b.victoryPoints - a.victoryPoints)
                      .map((p, index) => (
                        <div 
                          key={p.id} 
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                          style={{ borderRight: `4px solid ${p.color}` }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 text-sm font-bold">#{index + 1}</span>
                            <span className="font-extrabold text-slate-100">{p.name}</span>
                            {p.isBot && <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">בוט</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg font-black text-amber-400">{p.victoryPoints}</span>
                            <span className="text-xs text-slate-500">נק׳</span>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                  <button
                    onClick={() => {
                      setGamePhase('LOBBY');
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-4 px-8 rounded-2xl shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all text-base cursor-pointer border border-amber-400"
                  >
                    חזור ללובי להתחלת משחק חדש
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </main>

    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}