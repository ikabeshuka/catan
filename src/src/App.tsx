import React, { useEffect, useState, useRef } from 'react';
import { GameProvider, useGame, getPlayerTotalVP } from './context/GameContext';
import { GameBoard3D } from './components/board/GameBoard3D';
import { generateBoard } from './utils/gameEngine/generateBoard';
import { generateVertices } from './utils/gameEngine/generateVertices';
import { generateEdges } from './utils/gameEngine/generateEdges';
import { standardCatanConfig } from './config/standardVersion';
import { socketService } from './services/network/socketService';
import { dispatchGameAction } from './services/gameDispatcher';
import { ActionSidebar } from './components/actions/ActionSidebar';
import { ResourceContainer } from './components/playerPanel/ResourceContainer';
import { GameLog } from './components/notifications/GameLog';
import { DevelopmentCardsPanel } from './components/playerPanel/DevelopmentCardsPanel';
import { runAITurn } from './utils/ai/aiController';
import { useTurnManager } from './hooks/useTurnManager';
import { stealRandomCard } from './utils/gameEngine/robberSteal';
import { 
  WoodIcon, BrickIcon, SheepIcon, WheatIcon, OreIcon,
  DealIcon, CardIcon,
  CrossIcon, WarningIcon
} from './components/common/Icons';
import { LobbyScreen } from './components/lobby/LobbyScreen';
import { DiscardOverlay } from './components/modals/DiscardOverlay';
import { MonopolyModal } from './components/modals/MonopolyModal';
import { YearOfPlentyModal } from './components/modals/YearOfPlentyModal';
import { GoldFieldSelectionModal } from './components/modals/GoldFieldSelectionModal';
import { TrophyPopup, TrophyDetailModal } from './components/modals/TrophyModal';
import { useAppTrade } from './hooks/useAppTrade';
import { useAppTrophies } from './hooks/useAppTrophies';

const GameContent: React.FC = () => {
  const lastProcessedTurnRef = useRef<string>("");
  const lastStartedTurnRef = useRef<string>("");

  const [botTimeLimit, setBotTimeLimit] = useState<number>(10);
  const [botTimeRemaining, setBotTimeRemaining] = useState<number>(10 * 1000);

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
    buyDevelopmentCard,
    resourcePosition,
    setResourcePosition,
    isResourceCollapsed,
    setIsResourceCollapsed,
    activePortTrade,
    setActivePortTrade,
    setTiles,
    robberyState,
    setRobberyState,
    showBuildingCostToast,
    longestRoadPlayerId,
    largestArmyPlayerId,
    activeExpansion,
    activeRobberType,
    setActiveRobberType,
    goldSelectionQueue,
    selectedScenario,
    setActiveExpansion,
    setSelectedScenario,
    boardType,
    setBoardType
  } = useGame();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const { recordSetupPlacement, endTurn, handleDiceRoll, startTurn } = useTurnManager();

  // Guest listens to game start and loads host's board
  useEffect(() => {
    if (roomId && !isHost) {
      socketService.onGameStarted((gameStartData) => {
        console.log('🎮 Game started by Host, loading board and players...', gameStartData);
        
        // 1. Set bot time limit
        setBotTimeLimit(gameStartData.botTimeLimit);

        // 2. Sync expansion & board type
        if (gameStartData.activeExpansion) {
          setActiveExpansion(gameStartData.activeExpansion);
        }
        if (gameStartData.selectedScenario) {
          setSelectedScenario(gameStartData.selectedScenario);
        }
        if (gameStartData.boardType) {
          setBoardType(gameStartData.boardType);
        }

        // 3. Initialize game using host-provided board data
        initNewGame(
          gameStartData.players.length,
          gameStartData.boardData.tiles,
          gameStartData.boardData.vertices,
          gameStartData.boardData.edges
        );

        // 4. Set players
        setPlayers(gameStartData.players);
      });
    }
  }, [roomId, isHost, initNewGame, setPlayers, setBotTimeLimit, setActiveExpansion, setSelectedScenario, setBoardType]);

// 2. האזנה לפעולות מרוחקות נכנסות מיריבים בחדר האונליין
  useEffect(() => {
    if (roomId) {
      socketService.onActionReceived((remoteAction) => {
        console.log('📥 התקבלה פעולה מרוחקת מהרשת:', remoteAction);
        dispatchGameAction(remoteAction, {
          roomId,
          isRemote: true,
          gamePhase,
          players,
          setVertices,
          setEdges,
          setPlayers,
          setTiles,
          showBuildingCostToast,
          addLog,
          recordSetupPlacement,
          handleDiceRoll,
          buyDevelopmentCard,
          endTurn,
          roadBuildingRemaining,
          setRoadBuildingRemaining,
          activeExpansion,
          tiles,
          activeRobberType,
          setRobberyState,
          setTurnSubPhase,
        });
      });
    }
  }, [
    roomId, gamePhase, players, tiles, vertices, edges,
    activeExpansion, activeRobberType, roadBuildingRemaining,
    handleDiceRoll, buyDevelopmentCard, endTurn, setVertices, setEdges, setPlayers, setTiles, showBuildingCostToast, addLog, recordSetupPlacement, setRoadBuildingRemaining, setRobberyState, setTurnSubPhase
  ]);

  const victoryGoal = activeExpansion === 'SEAFARERS'
    ? (selectedScenario === 'HEADING_FOR_NEW_SHORES' ? 14 : (selectedScenario === 'FOUR_ISLANDS' ? 13 : 10))
    : 10;

  const activePlayer = players[currentPlayerIndex];

  const humanPlayer = players.find(p => !p.isBot) || players[0];

  const {
    isDevCardsOverlayOpen,
    setIsDevCardsOverlayOpen,
    isTradeModalOpen,
    setIsTradeModalOpen,
    isMonopolyModalOpen,
    setIsMonopolyModalOpen,
    isYearOfPlentyModalOpen,
    setIsYearOfPlentyModalOpen,
    giveRes,
    setGiveRes,
    giveAmt,
    setGiveAmt,
    receiveRes,
    setReceiveRes,
    receiveAmt,
    setReceiveAmt,
    targetBotId,
    setTargetBotId,
    harborGiveRes,
    setHarborGiveRes,
    harborReceiveRes,
    setHarborReceiveRes,
    handlePlayCard,
    executeHarborTrade,
    handleProposeTrade,
  } = useAppTrade();

  const {
    armyPopup,
    setArmyPopup,
    roadPopup,
    setRoadPopup,
    activeTrophyModal,
    setActiveTrophyModal,
  } = useAppTrophies();

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


  // איפוס זמן התגובה בכל תחילת תור או החלפת שלב
  useEffect(() => {
    setBotTimeRemaining(botTimeLimit * 1000);
  }, [currentPlayerIndex, turnSubPhase, gamePhase, activePlayer?.id, botTimeLimit]);

  // זיהוי האם אנו ממתינים למהלך של השחקן האנושי (שיגרור הקפאה של הטיימר)
  const isWaitingForPlayerAction = 
    (turnSubPhase as string) === 'DISCARD_PHASE' ||
    (turnSubPhase === 'GOLD_RESOURCE_SELECTION' && goldSelectionQueue && goldSelectionQueue.length > 0 && goldSelectionQueue.some(item => {
      const p = players.find(pl => pl.id === item.playerId);
      return p && !p.isBot;
    })) ||
    (typeof window !== 'undefined' && (window as any).isBotTimerPaused === true);

  // אפקט שעוקב אחר זמן התגובה של הבוטים ומריץ ספירה לאחור עם אפשרות להקפאה והמשך
  useEffect(() => {
    if (gamePhase === 'LOBBY' || !activePlayer || !activePlayer.isBot) {
      return;
    }

    if (isWaitingForPlayerAction) {
      return;
    }

    const intervalId = setInterval(() => {
      setBotTimeRemaining(prev => {
        // בדיקה חוזרת בתוך הלולאה למקרה שהמצב השתנה ללא רינדור מחדש מיידי
        const currentlyPaused = 
          (turnSubPhase as string) === 'DISCARD_PHASE' ||
          (turnSubPhase === 'GOLD_RESOURCE_SELECTION' && goldSelectionQueue && goldSelectionQueue.length > 0 && goldSelectionQueue.some(item => {
            const p = players.find(pl => pl.id === item.playerId);
            return p && !p.isBot;
          })) ||
          (typeof window !== 'undefined' && (window as any).isBotTimerPaused === true);

        if (currentlyPaused) {
          return prev;
        }

        if (prev <= 100) {
          clearInterval(intervalId);
          forceNextTurn();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentPlayerIndex, turnSubPhase, gamePhase, activePlayer?.id, isWaitingForPlayerAction, botTimeLimit]);

  // בדיקת תנאי ניצחון דינמית בזמן אמת (אנושי או בוט)
  useEffect(() => {
    if (gamePhase === 'MAIN_GAME') {
      const winner = players.find(p => getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles) >= victoryGoal);
      if (winner) {
        const totalVP = getPlayerTotalVP(winner, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles);
        setGamePhase('GAME_OVER');
        addLog(`המשחק נגמר! ${winner.name} ניצח/ה עם ${totalVP} נקודות ניצחון!`);
      }
    }
  }, [players, longestRoadPlayerId, largestArmyPlayerId, gamePhase, vertices, tiles]);

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
        setTurnSubPhase: guard(setTurnSubPhase),
        gameState: {
          gamePhase, // Assuming gamePhase is part of gameState
          turnNumber: 0, // Placeholder, adjust if turnNumber is tracked elsewhere
        } as any, // Cast to any to bypass type checking for now
        boardState: {
          tiles, // Assuming tiles are part of boardState
          vertices, // Assuming vertices are part of boardState
          edges, // Assuming edges are part of boardState
        } as any, // Cast to any to bypass type checking for now
        playerState: { players } as any, // Cast to any to bypass type checking for now
        legalActions: {} as any, // Placeholder, will be replaced with actual legal actions
      });
    }
  }, [currentPlayerIndex, turnSubPhase, gamePhase, activePlayer, endTurn, recordSetupPlacement, handleDiceRoll, players, addLog, setTiles, setTurnSubPhase, startTurn]);

  // תצוגת מסך הלובי / פתיחה - תומכת בגלילה פנימית כדי למנוע גלילה גלובלית ביישום
  if (gamePhase === 'LOBBY') {
    return (
      <LobbyScreen
        roomId={roomId}
        setRoomId={setRoomId}
        isHost={isHost}
        setIsHost={setIsHost}
        onStartGame={(pCount, lobbyP, limit) => {
          setBotTimeLimit(limit);
          
          lastProcessedTurnRef.current = "";
          lastStartedTurnRef.current = "";

          // Generate board data
          const newTiles = generateBoard(standardCatanConfig, boardType, activeExpansion, selectedScenario, pCount);
          const newVertices = generateVertices(newTiles, activeExpansion);
          const newEdges = generateEdges(newTiles, activeExpansion);

          // Call initNewGame with presets
          initNewGame(pCount, newTiles, newVertices, newEdges);

          const selectedPlayers = lobbyP.slice(0, pCount).map((p) => {
            const difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_HARD' | undefined = p.isBot ? (p.difficulty === 'קל' ? 'EASY' : p.difficulty === 'קשה' ? 'HARD' : p.difficulty === 'סופר קשה' ? 'SUPER_HARD' : 'MEDIUM') : undefined;
            const archetype: 'BUILDER' | 'DEVELOPER' | undefined = (p.isBot && difficulty === 'HARD') ? (Math.random() < 0.5 ? 'BUILDER' : 'DEVELOPER') : undefined;

            return {
              id: p.id,
              name: p.name,
              color: p.color,
              isBot: p.isBot,
              playerType: p.playerType,
              difficulty,
              ...(archetype ? { archetype } : {}),
              victoryPoints: 2,
              resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
              developmentCards: { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 },
              knightsPlayed: 0
            };
          });
          setPlayers(selectedPlayers);

          // If in an online room as host, broadcast START_GAME!
          if (roomId && isHost) {
            socketService.startGame(roomId, {
              boardData: {
                tiles: newTiles,
                vertices: newVertices,
                edges: newEdges
              },
              players: selectedPlayers,
              botTimeLimit: limit,
              activeExpansion,
              selectedScenario,
              boardType
            });
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-black text-slate-100 font-sans p-4 gap-4">
      
      {/* פריסה צידית: מכילה את פאנל השליטה (למעלה) ולוג ההיסטוריה קבוע בתחתית (למטה) */}
      <aside className="w-[336px] flex flex-col gap-4 h-full z-10 flex-none">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
          <ActionSidebar />
        </div>
        <div className="flex-none">
          <GameLog />
        </div>
      </aside>

      {/* האזור המרכזי: לוח המשחק והיד של השחקן */}
      <main className="flex-grow w-full h-full relative flex flex-col gap-4 overflow-hidden">
        
        {/* ה-Header הוסר לחלוטין כדי לפנות שטח אנכי מקסימלי ללוח המשחק */}

        {/* חיווי ויזואלי של טיימר הבוט כולל זמני הקפאה והמתנה */}
        {activePlayer && activePlayer.isBot && (
          <div className="flex-none mx-4 mb-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-right flex items-center justify-between" dir="rtl">
            <div className="flex items-center gap-3">
              <span className="text-xl animate-pulse">⏱️</span>
              <div>
                <div className="text-sm font-bold text-amber-400">תור הבוט {activePlayer.name} פעיל...</div>
                <div className="text-xs text-slate-400">זמן שנותר למהלך: {Math.max(0, Math.ceil(botTimeRemaining / 1000))} שניות</div>
              </div>
            </div>
            {isWaitingForPlayerAction && (
              <div className="text-emerald-400 font-extrabold text-xs px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full animate-pulse">
                ⏳ הטיימר מושהה - ממתין לפעולת השחקן האנושי (השלכת קלפים, בחירת זהב או מענה למסחר)
              </div>
            )}
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
        <div className="flex flex-1 gap-4 min-h-0 w-full flex-col overflow-hidden">
          
          {/* לוח ה-SVG המשושה - GameBoard3D */}
          <div className="flex-1 bg-slate-900/40 border-2 border-slate-800 rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center min-h-0">
            <GameBoard3D />
          </div>

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
            </footer>
          )}

        </div>
      </main>

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
                  <label className="block text-slate-300 text-sm font-bold mb-3">אני מציע לתת (Give):</label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { type: 'WOOD' as const, label: 'עץ', img: '/wood1.png', activeBg: 'bg-emerald-950/45 border-emerald-500' },
                        { type: 'BRICK' as const, label: 'לבנה', img: '/brick1.png', activeBg: 'bg-orange-950/45 border-orange-500' },
                        { type: 'SHEEP' as const, label: 'כבש', img: '/wool1.png', activeBg: 'bg-lime-950/45 border-lime-500' },
                        { type: 'WHEAT' as const, label: 'חיטה', img: '/wheat1.png', activeBg: 'bg-amber-950/45 border-amber-500' },
                        { type: 'ORE' as const, label: 'ברזל', img: '/rock1.png', activeBg: 'bg-slate-800/50 border-slate-500' },
                      ].map((res) => {
                        const isActive = giveRes === res.type;
                        const stock = humanPlayer.resources[res.type] || 0;
                        return (
                          <button
                            key={res.type}
                            type="button"
                            onClick={() => {
                              setGiveRes(res.type);
                              setGiveAmt(1);
                            }}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer gap-1
                              ${isActive ? res.activeBg + ' ring-1 ring-amber-500/40 text-white font-black' : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-950/70'}`}
                          >
                            <img src={res.img} className="w-8 h-8 object-contain" alt={res.label} />
                            <span>{res.label}</span>
                            <span className="text-[8px] opacity-75">({stock})</span>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-bold">כמות:</span>
                      <input
                        type="number"
                        min={1}
                        max={humanPlayer.resources[giveRes] || 0}
                        value={giveAmt}
                        onChange={(e) => setGiveAmt(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 p-2 rounded-xl text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* RECEIVE SECTION */}
                <div>
                  <label className="block text-slate-300 text-sm font-bold mb-3">אני מבקש לקבל (Receive):</label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { type: 'WOOD' as const, label: 'עץ', img: '/wood1.png', activeBg: 'bg-emerald-950/45 border-emerald-500' },
                        { type: 'BRICK' as const, label: 'לבנה', img: '/brick1.png', activeBg: 'bg-orange-950/45 border-orange-500' },
                        { type: 'SHEEP' as const, label: 'כבש', img: '/wool1.png', activeBg: 'bg-lime-950/45 border-lime-500' },
                        { type: 'WHEAT' as const, label: 'חיטה', img: '/wheat1.png', activeBg: 'bg-amber-950/45 border-amber-500' },
                        { type: 'ORE' as const, label: 'ברזל', img: '/rock1.png', activeBg: 'bg-slate-800/50 border-slate-500' },
                      ].map((res) => {
                        const isActive = receiveRes === res.type;
                        return (
                          <button
                            key={res.type}
                            type="button"
                            onClick={() => setReceiveRes(res.type)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer gap-1
                              ${isActive ? res.activeBg + ' ring-1 ring-amber-500/40 text-white font-black' : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-950/70'}`}
                          >
                            <img src={res.img} className="w-8 h-8 object-contain" alt={res.label} />
                            <span>{res.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-bold">כמות:</span>
                      <input
                        type="number"
                        min={1}
                        value={receiveAmt}
                        onChange={(e) => setReceiveAmt(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 p-2 rounded-xl text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
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
        <MonopolyModal
          isOpen={isMonopolyModalOpen}
          onClose={() => setIsMonopolyModalOpen(false)}
          players={players}
          humanPlayer={humanPlayer}
          setPlayers={setPlayers}
          addLog={addLog}
        />

        {/* מודל שנת שפע לבחירת משאבים */}
        <YearOfPlentyModal
          isOpen={isYearOfPlentyModalOpen}
          onClose={() => setIsYearOfPlentyModalOpen(false)}
          humanPlayer={humanPlayer}
          setPlayers={setPlayers}
          addLog={addLog}
        />

        {/* מודל בחירת זהב ממכרה זהב */}
        <GoldFieldSelectionModal />

      {/* סיידבר ימני קבוע ומרונדר על המסך תמיד */}
      <aside className={`transition-all duration-300 flex flex-col gap-4 h-full z-10 flex-none ${
        isResourceCollapsed ? 'w-20' : 'w-80'
      }`}>
        {resourcePosition === 'bottom' ? (
          /* בגובה מלא ונוח לקריאה, ללא אפשרות כיווץ */
          <div className="flex-1 min-h-0">
            <DevelopmentCardsPanel 
              handlePlayCard={handlePlayCard} 
              isCollapsed={isResourceCollapsed}
              onToggle={() => {}}
              onTrophyClick={(type) => setActiveTrophyModal(type)}
              onHeaderClick={() => setIsDevCardsOverlayOpen(true)}
              onOfferTradeClick={() => setIsTradeModalOpen(true)}
            />
          </div>
        ) : (
          /* resourcePosition === 'right' */
          /* אגד את שני הרכיבים במבנה אנכי: פאנל המשאבים למעלה, ופאנל קלפי הפיתוח למטה */
          <div className="flex flex-col gap-4 h-full min-h-0">
            {/* פאנל המשאבים למעלה */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
              <ResourceContainer 
                resources={humanPlayer.resources} 
                playerName={humanPlayer.name} 
                position={resourcePosition}
                isCollapsed={isResourceCollapsed}
                onPositionChange={setResourcePosition}
                onToggleCollapsed={() => setIsResourceCollapsed(prev => !prev)}
              />
            </div>
            {/* פאנל קלפי פיתוח למטה */}
            <div className="flex-1 min-h-0">
              <DevelopmentCardsPanel 
                handlePlayCard={handlePlayCard} 
                isCollapsed={isResourceCollapsed}
                onToggle={() => {}}
                onTrophyClick={(type) => setActiveTrophyModal(type)}
                onHeaderClick={() => setIsDevCardsOverlayOpen(true)}
                onOfferTradeClick={() => setIsTradeModalOpen(true)}
              />
            </div>
          </div>
        )}
      </aside>

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
                    <label className="block text-slate-300 text-xs font-bold mb-3">איזה משאב תרצה לתת (3 יחידות)?</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).map(res => {
                        const labels: Record<string, string> = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };
                        const imgs: Record<string, string> = { WOOD: '/wood1.png', BRICK: '/brick1.png', SHEEP: '/wool1.png', WHEAT: '/wheat1.png', ORE: '/rock1.png' };
                        const stock = humanPlayer.resources[res] || 0;
                        const isSelected = harborGiveRes === res;
                        return (
                          <button
                            key={res}
                            type="button"
                            onClick={() => setHarborGiveRes(res)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] font-black transition-all cursor-pointer gap-1
                              ${isSelected ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-950/70'}`}
                          >
                            <img src={imgs[res]} className="w-7 h-7 object-contain" alt={labels[res]} />
                            <span>{labels[res]}</span>
                            <span className="text-[8px] opacity-75 font-mono">({stock})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-slate-300 text-xs font-bold mb-3">איזה משאב תרצה לקבל (יחידה אחת)?</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const)
                        .filter(r => r !== harborGiveRes)
                        .map(res => {
                          const labels: Record<string, string> = { WOOD: 'עץ', BRICK: 'לבנה', SHEEP: 'כבש', WHEAT: 'חיטה', ORE: 'ברזל' };
                          const imgs: Record<string, string> = { WOOD: '/wood1.png', BRICK: '/brick1.png', SHEEP: '/wool1.png', WHEAT: '/wheat1.png', ORE: '/rock1.png' };
                          const isSelected = harborReceiveRes === res;
                          return (
                            <button
                              key={res}
                              type="button"
                              onClick={() => setHarborReceiveRes(res)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] font-black transition-all cursor-pointer gap-1
                                ${isSelected ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300' : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-950/70'}`}
                            >
                              <img src={imgs[res]} className="w-7 h-7 object-contain" alt={labels[res]} />
                              <span>{labels[res]}</span>
                            </button>
                          );
                        })}
                    </div>
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
                  const targetTotalCards = Object.values(target.resources).reduce((sum: number, count: any) => sum + (count as number), 0);
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

        {/* פאנל בחירה בין שודד לפיראט בהרחבת יורדי הים */}
        {activeExpansion === 'SEAFARERS' && turnSubPhase === 'ROBBER_PLACEMENT' && !activePlayer?.isBot && activeRobberType === null && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-right animate-fade-in" dir="rtl">
              <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-6 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>🏴‍☠️ בחירת סוג שודד להזזה</span>
              </h3>
              
              <p className="text-sm text-slate-300 mb-6 font-semibold">
                על הלוח מופעל כעת שלב השודד. מכיוון שהנך משחק בהרחבת יורדי הים, באפשרותך לבחור את מי להזיז:
              </p>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => {
                    setActiveRobberType('ROBBER');
                    addLog(`[שודד] ${activePlayer.name} בחר להזיז את השודד היבשתי.`);
                  }}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border border-slate-850 bg-slate-950/60 hover:bg-amber-950/10 hover:border-amber-500/40 text-slate-100 text-sm font-black transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="text-3xl">🏜️</span>
                  <span className="text-amber-400 font-extrabold">הזז את השודד היבשתי</span>
                  <span className="text-xs text-slate-400 font-medium">(ניתן להציב רק על אריחי יבשה)</span>
                </button>

                <button
                  onClick={() => {
                    setActiveRobberType('PIRATE');
                    addLog(`[שודד] ${activePlayer.name} בחר להזיז את שודד הים.`);
                  }}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl border border-slate-850 bg-slate-950/60 hover:bg-indigo-950/10 hover:border-indigo-500/40 text-slate-100 text-sm font-black transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="text-3xl">🏴‍☠️</span>
                  <span className="text-indigo-400 font-extrabold">הזז את שודד הים</span>
                  <span className="text-xs text-slate-400 font-medium">(ניתן להציב רק על אריחי מים)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* מודל הצבא הגדול ביותר */}
        {armyPopup && (
          <TrophyPopup
            type="largest_army"
            player={armyPopup.player}
            prevPlayer={armyPopup.prevPlayer}
            onClose={() => setArmyPopup(null)}
          />
        )}

        {/* מודל הדרך הארוכה ביותר */}
        {roadPopup && (
          <TrophyPopup
            type="longest_road"
            player={roadPopup.player}
            prevPlayer={roadPopup.prevPlayer}
            onClose={() => setRoadPopup(null)}
          />
        )}

        {/* קומפוננטת Overlay במסך מלא עבור זריקת משאבים כשהשודד מופעל */}
        <DiscardOverlay />

        {/* מודל תארים צף גדול במרכז */}
        <TrophyDetailModal
          isOpen={!!activeTrophyModal}
          type={activeTrophyModal!}
          longestRoadPlayerId={longestRoadPlayerId}
          largestArmyPlayerId={largestArmyPlayerId}
          players={players}
          onClose={() => setActiveTrophyModal(null)}
        />

        {/* מודל קלפי פיתוח צף גדול במרכז */}
        {isDevCardsOverlayOpen && (() => {
          const devCards = humanPlayer?.developmentCards || { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 };
          const isOurTurn = activePlayer?.id === humanPlayer?.id && turnSubPhase === 'TRADE_AND_BUILD';
          
          return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-slate-900/95 border border-slate-700/50 backdrop-blur-xl rounded-3xl w-full max-w-3xl p-8 shadow-2xl relative text-right" dir="rtl">
                <button 
                  onClick={() => setIsDevCardsOverlayOpen(false)}
                  className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer p-1.5 rounded-xl hover:bg-slate-800 flex items-center justify-center border border-slate-850"
                >
                  <CrossIcon size={16} />
                </button>
                
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 mb-6 border-b border-slate-800/65 pb-3 flex items-center gap-2">
                  <CardIcon size={24} className="text-purple-400 inline-block animate-pulse" />
                  <span>קלפי הפיתוח שלך (מלאי ומדריך מפורט)</span>
                </h3>

                <p className="text-xs text-slate-300 mb-6 font-medium">
                  לחיצה על "הפעל" תפעיל את אפקט הקלף בתורך. קלפי נקודות ניצחון מופעלים אוטומטית באופן פסיבי.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {[
                    { id: 'KNIGHT' as const, name: 'אביר (Knight)', desc: 'מזיז את השודד לאריח אחר ומאפשר לגנוב משאב משחקן שכן. מסייע בהשגת תואר הצבא הגדול.', img: '/knite.png', count: devCards.KNIGHT || 0, playable: true },
                    { id: 'MONOPOLY' as const, name: 'מונופול (Monopoly)', desc: 'בחר משאב אחד. כל שחקני המחשב (בוטים) מחויבים למסור לך את כל הקלפים שברשותם מאותו סוג משאב.', img: '/monopoly.png', count: devCards.MONOPOLY || 0, playable: true },
                    { id: 'ROAD_BUILDING' as const, name: 'בניית כבישים (Road Building)', desc: 'מאפשר לך לסלול שני כבישים חדשים על הלוח באופן מיידי וללא עלות משאבים. מסייע בהשגת הדרך הארוכה.', img: '/2_ways.png', count: devCards.ROAD_BUILDING || 0, playable: true },
                    { id: 'YEAR_OF_PLENTY' as const, name: 'שנת שפע (Year of Plenty)', desc: 'קבל שני משאבים חופשיים לבחירתך מהבנק באופן מיידי.', img: '/year_of_plenty.png', count: devCards.YEAR_OF_PLENTY || 0, playable: true },
                    { id: 'VICTORY_POINT' as const, name: 'קלף נקודת ניצחון (Victory Point)', desc: 'מעניק לך נקודת ניצחון אחת באופן מיידי ופסיבי (נשמר בסוד משאר השחקנים).', img: '/win1.png', count: devCards.VICTORY_POINT || 0, playable: false },
                  ].map((card) => {
                    const hasCard = card.count > 0;
                    return (
                      <div key={card.id} className={`flex gap-4 p-4 rounded-2xl border transition-all ${hasCard ? 'bg-slate-950/60 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-slate-950/20 border-slate-900 opacity-50'}`}>
                        <div className="w-[60px] h-[84px] flex-none rounded-xl overflow-hidden border border-slate-800 shadow-md bg-slate-900">
                          <img src={card.img} alt={card.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-slate-100">{card.name}</span>
                              <span className="text-xs font-mono font-black text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                כמות: {card.count}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{card.desc}</p>
                          </div>
                          <div className="flex justify-end mt-2">
                            {card.playable ? (
                              <button
                                disabled={!isOurTurn || !hasCard}
                                onClick={() => {
                                  if (card.id !== 'VICTORY_POINT') {
                                    handlePlayCard(card.id);
                                  }
                                  setIsDevCardsOverlayOpen(false);
                                }}
                                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                  isOurTurn && hasCard
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 shadow-lg border border-purple-400 active:scale-95'
                                    : 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50'
                                }`}
                              >
                                הפעל קלף
                              </button>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-850">
                                אפקט פסיבי
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 border-t border-slate-800/80 pt-4 flex justify-end">
                  <button
                    onClick={() => setIsDevCardsOverlayOpen(false)}
                    className="px-6 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-all text-xs cursor-pointer"
                  >
                    סגור חלון
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* מודל סיום המשחק */}
        {gamePhase === 'GAME_OVER' && (() => {
          const winner = players.find(p => getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles) >= victoryGoal) || players.reduce((max, p) => getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles) > getPlayerTotalVP(max, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles) ? p : max, players[0]);
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
                  {winner ? `כל הכבוד! ${winner.name} הגיע/ה ל-${getPlayerTotalVP(winner, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles)} נקודות ניצחון והוכתר/ה כשליט/ת קטאן!` : ''}
                </p>

                {/* Scoreboard table */}
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-6 mb-8 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-slate-400 mb-4 border-b border-slate-800 pb-2">טבלת הניקוד הסופית:</h3>
                  <div className="space-y-3">
                    {[...players]
                      .sort((a, b) => getPlayerTotalVP(b, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles) - getPlayerTotalVP(a, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles))
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
                            <span className="text-lg font-black text-amber-400">{getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles)}</span>
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