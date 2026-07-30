import React, { useEffect, useState, useRef } from 'react';
import { GameProvider, useGame, getPlayerTotalVP } from './context/GameContext';
import { GameBoard3D } from './components/board/GameBoard3D';
import { ResourceFlowOverlay } from './components/board/ResourceFlowOverlay';
import { generateBoard } from './utils/gameEngine/generateBoard';
import { generateVertices } from './utils/gameEngine/generateVertices';
import { generateEdges } from './utils/gameEngine/generateEdges';
import { standardCatanConfig } from './config/standardVersion';
import { socketService } from './services/network/socketService';
import { ActionSidebar } from './components/actions/ActionSidebar';
import { ResourceContainer } from './components/playerPanel/ResourceContainer';
import { GameLog } from './components/notifications/GameLog';
import { DevelopmentCardsPanel } from './components/playerPanel/DevelopmentCardsPanel';
import { TradePanel } from './components/actions/TradePanel';
import { runAITurn } from './utils/ai/aiController';
import { useTurnManager } from './hooks/useTurnManager';
import { stealRandomCard } from './utils/gameEngine/robberSteal';
import { Player } from './types/player.types';
import { 
  CardIcon,
  CrossIcon
} from './components/common/Icons';
import { LobbyScreen } from './components/lobby/LobbyScreen';
import { TrophyPopup } from './components/modals/TrophyModal';
import { useAppTrade } from './hooks/useAppTrade';
import { useAppTrophies } from './hooks/useAppTrophies';
import { UpdateNotification } from './services/network/UpdateNotification';
import { useBotTimer } from './hooks/useBotTimer';
import { useOnlineGameSync } from './hooks/useOnlineGameSync';
import { BotTimerIndicator } from './components/common/BotTimerIndicator';
import { GameModalsManager } from './components/modals/GameModalsManager';
import { UnifiedTradeModal } from './components/modals/UnifiedTradeModal';
import { getVictoryPointTarget } from './config/gameRules';
import { dispatchGameAction } from './services/gameDispatcher';
import { useUser } from './context/UserContext';
import { RoomParticipant } from './types/rating.types';

const GameContent: React.FC = () => {
  const lastProcessedTurnRef = useRef<string>("");
  const lastStartedTurnRef = useRef<string>("");
  const hasRecordedExitLossRef = useRef(false);
  const { updateRatingAfterGame, setLastRatingResult } = useUser();

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
    setResourcePosition,
    isResourceCollapsed,
    setIsResourceCollapsed,
    setActivePortTrade,
    setTiles,
    robberyState,
    setRobberyState,
    longestRoadPlayerId,
    largestArmyPlayerId,
    activeExpansion,
    activeRobberType,
    setActiveRobberType,
    selectedScenario,
    boardType,
    roomId,
    setRoomId,
    isHost,
    setIsHost,
    myPlayerId,
    buyDevelopmentCard,
  } = useGame();

  const [activeRightTab, setActiveRightTab] = useState<'DEV_CARDS' | 'TRADE'>('DEV_CARDS');
  const { recordSetupPlacement, endTurn, handleDiceRoll, startTurn, checkIfGameEnds } = useTurnManager();

  const {
    setBotTimeLimit,
    botTimeRemaining,
    isWaitingForPlayerAction,
  } = useBotTimer();

  useOnlineGameSync({
    roomId,
    isHost,
    setBotTimeLimit,
  });

  const victoryGoal = getVictoryPointTarget(activeExpansion, selectedScenario);

  const activePlayer = players[currentPlayerIndex];
  const currentTurnPlayerId = activePlayer?.id;

  const humanPlayer = (roomId
    ? players.find(p => p.id === myPlayerId)
    : players.find(p => !p.isBot) || players[0])!;

  useEffect(() => {
    if (gamePhase === 'LOBBY') return;

    const preventRefresh = (event: KeyboardEvent) => {
      const isRefreshShortcut = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');
      if (!isRefreshShortcut) return;
      event.preventDefault();
      event.stopPropagation();
      addLog('רענון הדף חסום בזמן משחק פעיל. השתמשו בכפתור "צא מהמשחק".');
    };
    const confirmRefresh = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('keydown', preventRefresh, true);
    window.addEventListener('beforeunload', confirmRefresh);
    return () => {
      window.removeEventListener('keydown', preventRefresh, true);
      window.removeEventListener('beforeunload', confirmRefresh);
    };
  }, [gamePhase, addLog]);

  const exitGame = () => {
    if (!window.confirm('לצאת מהמשחק? היציאה תירשם כהפסד.')) return;

    if (!hasRecordedExitLossRef.current && humanPlayer && gamePhase !== 'GAME_OVER') {
      hasRecordedExitLossRef.current = true;
      const participants: RoomParticipant[] = players.map(player => ({
        id: player.id,
        isHuman: !player.isBot,
        botDifficulty: player.isBot
          ? ((player.difficulty as RoomParticipant['botDifficulty']) || (player.playerType === 'GEMINI_AI' ? 'GEMINI_AI' : 'MEDIUM'))
          : undefined,
        ratingPoints: (player as Player & { ratingPoints?: number }).ratingPoints || 0,
      }));
      updateRatingAfterGame(false, participants, humanPlayer.id);
      // Leaving is an immediate navigation back to the lobby, so do not carry
      // the end-of-game rating dialog into the next game.
      setLastRatingResult(null);
    }

    if (roomId) socketService.leaveRoom(roomId);
    setRoomId(null);
    setIsHost(false);
    setGamePhase('LOBBY');
  };

  const {
    isDevCardsOverlayOpen,
    setIsDevCardsOverlayOpen,
    isTradeModalOpen,
    setIsTradeModalOpen,
    isMonopolyModalOpen,
    setIsMonopolyModalOpen,
    isYearOfPlentyModalOpen,
    setIsYearOfPlentyModalOpen,
    handlePlayCard,
  } = useAppTrade();

  const {
    armyPopup,
    setArmyPopup,
    roadPopup,
    setRoadPopup,
    activeTrophyModal,
    setActiveTrophyModal,
  } = useAppTrophies();

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

  // בדיקת תנאי ניצחון דינמית בזמן אמת (אנושי או בוט)
  useEffect(() => {
    if (gamePhase === 'MAIN_GAME' && currentTurnPlayerId) {
      const winner = players.find(p =>
        p.id === currentTurnPlayerId &&
        getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario) >= victoryGoal
      );
      if (winner) {
        checkIfGameEnds(winner);
        return;
        /* Legacy direct mutation replaced by checkIfGameEnds.
        const totalVP = getPlayerTotalVP(winner, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario);
        setGamePhase('GAME_OVER');
        addLog(`המשחק נגמר! ${winner.name} ניצח/ה עם ${totalVP} נקודות ניצחון!`);
        */
      }
    }
  }, [players, currentTurnPlayerId, longestRoadPlayerId, largestArmyPlayerId, gamePhase, vertices, tiles, victoryGoal, selectedScenario, checkIfGameEnds]);

  // האפקט המרכזי שמזהה תור של בוט ומפעיל את ה-AI באופן אוטומטי
  useEffect(() => {
    // In online rooms only the host advances bots. Its canonical snapshots
    // are replicated to every guest.
    if (roomId && !isHost) return;
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
        const nextPlayer = players[nextIndex];
        setPlayers((prev: Player[]) => prev.map(p => {
          if (p.id === nextPlayer.id) {
            return {
              ...p,
              playedDevCardThisTurn: false,
              boughtDevCardsThisTurn: {}
            };
          }
          return p;
        }));
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
        buyDevelopmentCard: guard(buyDevelopmentCard),
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
  }, [roomId, isHost, currentPlayerIndex, turnSubPhase, gamePhase, activePlayer, endTurn, recordSetupPlacement, handleDiceRoll, buyDevelopmentCard, players, addLog, setTiles, setTurnSubPhase, startTurn, tiles, vertices, edges, setPlayers, setVertices, setEdges, setCurrentPlayerIndex]);

  // תצוגת מסך הלובי / פתיחה - תומכת בגלילה פנימית כדי למנוע גלילה גלובלית ביישום
  if (gamePhase === 'LOBBY') {
    return (
      <>
        <LobbyScreen
          roomId={roomId}
          setRoomId={setRoomId}
          isHost={isHost}
          setIsHost={setIsHost}
          onStartGame={(pCount, lobbyP, limit) => {
            hasRecordedExitLossRef.current = false;
            setBotTimeLimit(limit);
            
            lastProcessedTurnRef.current = "";
            lastStartedTurnRef.current = "";

            // Generate board data
            const newTiles = generateBoard(standardCatanConfig, boardType, activeExpansion, selectedScenario, pCount);
            const newVertices = generateVertices(newTiles, activeExpansion);
            const newEdges = generateEdges(newTiles, activeExpansion);

            // Call initNewGame with presets
            const initialDeck = initNewGame(pCount, newTiles, newVertices, newEdges);

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
                boardType,
                initialState: {
                  players: selectedPlayers,
                  tiles: newTiles,
                  vertices: newVertices,
                  edges: newEdges,
                  currentPlayerIndex: 0,
                  gamePhase: 'SETUP_ROUND_1',
                  turnSubPhase: 'BEFORE_ROLL',
                  setupState: { hasPlacedSettlement: false, hasPlacedRoad: false },
                  devCardDeck: initialDeck,
                  resourceBank: { WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 },
                  goldCoins: Object.fromEntries(selectedPlayers.map(player => [player.id, 0])),
                  roadBuildingRemaining: 0,
                  goldSelectionQueue: [],
                  currentTurnBuiltShips: [],
                  hasMovedShipThisTurn: false,
                  activeExpansion,
                  selectedScenario,
                  boardType,
                }
              });
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-black text-slate-100 font-sans p-4 gap-4">
      <ResourceFlowOverlay />
      
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
        <button
          onClick={exitGame}
          className="absolute right-4 top-4 z-30 rounded-xl border border-rose-500/60 bg-rose-950/90 px-4 py-2 text-xs font-black text-rose-200 shadow-xl backdrop-blur hover:bg-rose-900"
          dir="rtl"
        >
          צא מהמשחק
        </button>
        
        {/* ה-Header הוסר לחלוטין כדי לפנות שטח אנכי מקסימלי ללוח המשחק */}

        {/* חיווי ויזואלי של טיימר הבוט כולל זמני הקפאה והמתנה */}
        <BotTimerIndicator
          activePlayer={activePlayer}
          botTimeRemaining={botTimeRemaining}
          isWaitingForPlayerAction={isWaitingForPlayerAction}
        />

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
          <div id="game-board-wrapper" className="flex-1 bg-slate-900/40 border-2 border-slate-800 rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center min-h-0">
            <GameBoard3D />
          </div>


        </div>
      </main>

        {/* פאנל מסחר מאוחד */}
        {isTradeModalOpen && (
          <UnifiedTradeModal
            onClose={() => {
              setIsTradeModalOpen(false);
              setActivePortTrade(null);
            }}
          />
        )}

        {/* מנהל מודאלים מופרד */}
        <GameModalsManager
          isMonopolyModalOpen={isMonopolyModalOpen}
          setIsMonopolyModalOpen={setIsMonopolyModalOpen}
          isYearOfPlentyModalOpen={isYearOfPlentyModalOpen}
          setIsYearOfPlentyModalOpen={setIsYearOfPlentyModalOpen}
          players={players}
          humanPlayer={humanPlayer}
          setPlayers={setPlayers}
          addLog={addLog}
          activeTrophyModal={activeTrophyModal}
          setActiveTrophyModal={setActiveTrophyModal}
          longestRoadPlayerId={longestRoadPlayerId}
          largestArmyPlayerId={largestArmyPlayerId}
        />

      {/* סיידבר ימני קבוע ומרונדר על המסך תמיד */}
      <aside className={`transition-all duration-300 flex flex-col gap-4 h-full z-10 flex-none ${
        isResourceCollapsed ? 'w-20' : 'w-80'
      }`}>
        <ResourceContainer
          resources={humanPlayer.resources}
          playerName={humanPlayer.name}
          position="right"
          isCollapsed={isResourceCollapsed}
          onPositionChange={setResourcePosition}
          onToggleCollapsed={() => setIsResourceCollapsed(prev => !prev)}
          playerId={humanPlayer.id}
        />

        {!isResourceCollapsed && (
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800" dir="rtl">
            <button
              onClick={() => setActiveRightTab('DEV_CARDS')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeRightTab === 'DEV_CARDS'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              קלפי פיתוח ותארים
            </button>
            <button
              onClick={() => setActiveRightTab('TRADE')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                activeRightTab === 'TRADE'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              מסחר והצעות
            </button>
          </div>
        )}

        {activeRightTab === 'DEV_CARDS' ? (
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
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
            <TradePanel />
          </div>
        )}
      </aside>


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
                        const stolenResource = roomId
                          ? undefined
                          : stealRandomCard(humanPlayer.id, target.id, players).stolenResource || undefined;
                        
                        const resourceLabels: Record<string, string> = {
                          WOOD: 'עץ',
                          BRICK: 'לבנה',
                          SHEEP: 'כבש',
                          WHEAT: 'חיטה',
                          ORE: 'ברזל'
                        };
                        const stolenLabel = stolenResource ? resourceLabels[stolenResource] : 'לא ידוע';

                        if (roomId || stolenResource) {
                          dispatchGameAction({
                            type: 'STEAL_RESOURCE',
                            playerId: humanPlayer.id,
                            victimPlayerId: target.id,
                            stolenResource,
                          }, {
                            roomId: roomId || undefined,
                            isRemote: false,
                            myPlayerId: roomId ? myPlayerId : humanPlayer.id,
                            players,
                            setPlayers,
                            setRobberyState,
                            setTurnSubPhase,
                            addLog,
                          });
                          alert(roomId
                            ? 'הגניבה נשלחה לשרת; סוג המשאב יוגרל ויעודכן ביומן.'
                            : `שדדת בהצלחה 1 קלף מסוג: ${stolenLabel}!`);
                        } else {
                          setRobberyState(null);
                          const returnSubPhase = humanPlayer.devCardReturnSubPhase || 'TRADE_AND_BUILD';
                          setPlayers(prev => prev.map(player =>
                            player.id === humanPlayer.id ? { ...player, devCardReturnSubPhase: undefined } : player
                          ));
                          setTurnSubPhase(returnSubPhase);
                        }
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


        {/* מודל קלפי פיתוח צף גדול במרכז */}
        {isDevCardsOverlayOpen && (() => {
          const devCards = humanPlayer?.developmentCards || { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0, VICTORY_POINT: 0 };
          const isOurTurn = activePlayer?.id === humanPlayer?.id
            && (turnSubPhase === 'BEFORE_ROLL' || turnSubPhase === 'TRADE_AND_BUILD');
          
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
                          {card.img ? <img src={card.img} alt={card.name} className="w-full h-full object-cover" /> : null}
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
          const winner = players.find(p =>
            p.id === currentTurnPlayerId &&
            getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario) >= victoryGoal
          ) || players.reduce((max, p) => getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario) > getPlayerTotalVP(max, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario) ? p : max, players[0]);
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
                  {winner ? `כל הכבוד! ${winner.name} הגיע/ה ל-${getPlayerTotalVP(winner, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario)} נקודות ניצחון והוכתר/ה כשליט/ת קטאן!` : ''}
                </p>

                {/* Scoreboard table */}
                <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-6 mb-8 max-w-md mx-auto">
                  <h3 className="text-lg font-bold text-slate-400 mb-4 border-b border-slate-800 pb-2">טבלת הניקוד הסופית:</h3>
                  <div className="space-y-3">
                    {[...players]
                      .sort((a, b) => getPlayerTotalVP(b, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario) - getPlayerTotalVP(a, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario))
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
                            <span className="text-lg font-black text-amber-400">{getPlayerTotalVP(p, longestRoadPlayerId, largestArmyPlayerId, true, vertices, tiles, selectedScenario)}</span>
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
    <>
      <UpdateNotification />
      <GameProvider>
        <GameContent />
      </GameProvider>
    </>
  );
}
