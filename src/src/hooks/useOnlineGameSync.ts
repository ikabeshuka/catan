import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { socketService } from '../services/network/socketService';
import { dispatchGameAction } from '../services/gameDispatcher';

interface UseOnlineGameSyncProps {
  roomId: string | null;
  isHost: boolean;
  setBotTimeLimit: (limit: number) => void;
}

export const useOnlineGameSync = ({ roomId, isHost, setBotTimeLimit }: UseOnlineGameSyncProps) => {
  const game = useGame();
  const { myPlayerId, setIsHost } = game;
  const { recordSetupPlacement, endTurn, handleDiceRoll } = useTurnManager();

  const applySnapshot = (snapshot: any, becameHost?: boolean) => {
    if (!snapshot) return;
    if (Array.isArray(snapshot.tiles)) game.setTiles(snapshot.tiles);
    if (Array.isArray(snapshot.vertices)) game.setVertices(snapshot.vertices);
    if (Array.isArray(snapshot.edges)) game.setEdges(snapshot.edges);
    if (Array.isArray(snapshot.players)) game.setPlayers(snapshot.players);
    if (Array.isArray(snapshot.devCardDeck)) game.setDevCardDeck(snapshot.devCardDeck);
    if (snapshot.resourceBank) game.setResourceBank(snapshot.resourceBank);
    if (snapshot.goldCoins) game.setGoldCoins(snapshot.goldCoins);
    if (Array.isArray(snapshot.goldSelectionQueue)) game.setGoldSelectionQueue(snapshot.goldSelectionQueue);
    if (Array.isArray(snapshot.currentTurnBuiltShips)) game.setCurrentTurnBuiltShips(snapshot.currentTurnBuiltShips);
    if (Number.isInteger(snapshot.currentPlayerIndex)) game.setCurrentPlayerIndex(snapshot.currentPlayerIndex);
    if (typeof snapshot.gamePhase === 'string') game.setGamePhase(snapshot.gamePhase);
    if (typeof snapshot.turnSubPhase === 'string') game.setTurnSubPhase(snapshot.turnSubPhase);
    if (snapshot.setupState) game.setSetupState(snapshot.setupState);
    if (Number.isInteger(snapshot.roadBuildingRemaining)) game.setRoadBuildingRemaining(snapshot.roadBuildingRemaining);
    if (typeof snapshot.hasMovedShipThisTurn === 'boolean') game.setHasMovedShipThisTurn(snapshot.hasMovedShipThisTurn);
    if (snapshot.activeExpansion) game.setActiveExpansion(snapshot.activeExpansion);
    if (snapshot.selectedScenario) game.setSelectedScenario(snapshot.selectedScenario);
    if (snapshot.boardType) game.setBoardType(snapshot.boardType);
    if (becameHost !== undefined) game.setIsHost(becameHost);
  };
  const applySnapshotRef = useRef(applySnapshot);
  applySnapshotRef.current = applySnapshot;

  useEffect(() => {
    if (!roomId) return;
    return socketService.onHostChanged(({ roomId: changedRoomId, hostPlayerId }) => {
      if (changedRoomId === roomId) setIsHost(Boolean(myPlayerId && hostPlayerId === myPlayerId));
    });
  }, [roomId, myPlayerId, setIsHost]);

  useEffect(() => {
    if (!roomId) return;
    return socketService.onGameStateSnapshot((snapshot, becameHost) => applySnapshotRef.current(snapshot, becameHost));
  }, [roomId]);

  useEffect(() => {
    if (!roomId || isHost) return;
    let cancelled = false;
    socketService.requestGameState(roomId).then(snapshot => {
      if (!cancelled && snapshot) applySnapshotRef.current(snapshot, false);
    });
    return () => { cancelled = true; };
  }, [roomId, isHost]);

  useEffect(() => {
    if (!roomId || isHost) return;
    return socketService.onGameStarted((startData: any) => {
      setBotTimeLimit(startData.botTimeLimit);
      game.setActiveExpansion(startData.activeExpansion);
      game.setSelectedScenario(startData.selectedScenario);
      game.setBoardType(startData.boardType);
      const initial = startData.initialState;
      game.initNewGame(
        startData.players.length,
        startData.boardData.tiles,
        startData.boardData.vertices,
        startData.boardData.edges,
        initial.devCardDeck,
      );
      applySnapshot(initial);
    });
  });

  useEffect(() => {
    if (!roomId) return;
    return socketService.onActionReceived(remoteAction => {
      dispatchGameAction(remoteAction, {
        roomId,
        isRemote: true,
        myPlayerId: game.myPlayerId,
        gamePhase: game.gamePhase,
        turnSubPhase: game.turnSubPhase,
        players: game.players,
        vertices: game.vertices,
        edges: game.edges,
        tiles: game.tiles,
        setVertices: game.setVertices,
        setEdges: game.setEdges,
        setPlayers: game.setPlayers,
        setTiles: game.setTiles,
        showBuildingCostToast: game.showBuildingCostToast,
        addLog: game.addLog,
        recordSetupPlacement,
        handleDiceRoll,
        buyDevelopmentCard: game.buyDevelopmentCard,
        endTurn,
        roadBuildingRemaining: game.roadBuildingRemaining,
        setRoadBuildingRemaining: game.setRoadBuildingRemaining,
        activeExpansion: game.activeExpansion,
        activeRobberType: game.activeRobberType,
        setActiveRobberType: game.setActiveRobberType,
        setHasMovedShipThisTurn: game.setHasMovedShipThisTurn,
        setRobberyState: game.setRobberyState,
        setTurnSubPhase: game.setTurnSubPhase,
        selectedScenario: game.selectedScenario,
        resourceBank: game.resourceBank,
        setResourceBank: game.setResourceBank,
        goldCoins: game.goldCoins,
        setGoldCoins: game.setGoldCoins,
        goldSelectionQueue: game.goldSelectionQueue,
        setGoldSelectionQueue: game.setGoldSelectionQueue,
      });
    });
  });

  useEffect(() => {
    if (!roomId || !isHost || game.gamePhase === 'LOBBY' || game.isRolling) return;
    const timeoutId = window.setTimeout(() => {
      socketService.syncGameState(roomId, {
        players: game.players,
        tiles: game.tiles,
        vertices: game.vertices,
        edges: game.edges,
        currentPlayerIndex: game.currentPlayerIndex,
        gamePhase: game.gamePhase,
        turnSubPhase: game.turnSubPhase,
        setupState: game.setupState,
        devCardDeck: game.devCardDeck,
        resourceBank: game.resourceBank,
        goldCoins: game.goldCoins,
        roadBuildingRemaining: game.roadBuildingRemaining,
        goldSelectionQueue: game.goldSelectionQueue,
        currentTurnBuiltShips: game.currentTurnBuiltShips,
        hasMovedShipThisTurn: game.hasMovedShipThisTurn,
        activeExpansion: game.activeExpansion,
        selectedScenario: game.selectedScenario,
        boardType: game.boardType,
      });
    }, 75);
    return () => window.clearTimeout(timeoutId);
  }, [
    roomId, isHost, game.players, game.tiles, game.vertices, game.edges,
    game.currentPlayerIndex, game.gamePhase, game.turnSubPhase, game.setupState,
    game.devCardDeck, game.resourceBank, game.goldCoins, game.roadBuildingRemaining,
    game.goldSelectionQueue, game.currentTurnBuiltShips, game.hasMovedShipThisTurn,
    game.activeExpansion, game.selectedScenario, game.boardType, game.isRolling,
  ]);
};
