import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { socketService } from '../services/network/socketService';
import { dispatchGameAction } from '../services/gameDispatcher';
import { createScenarioState } from '../types/scenarioState.types';

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
    if (snapshot.commodityBank) game.setCommodityBank(snapshot.commodityBank);
    if (snapshot.citiesKnightsState) game.setCitiesKnightsState(snapshot.citiesKnightsState);
    if (snapshot.scenarioState) game.setScenarioState(snapshot.scenarioState);
    else if (snapshot.selectedScenario) game.setScenarioState(createScenarioState(snapshot.selectedScenario));
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
    if (['PIRATE_ISLANDS', 'DESERT_DRAGONS'].includes(snapshot.selectedScenario) && snapshot.turnSubPhase === 'ROBBER_STEAL') {
      const activePlayer = snapshot.players?.[snapshot.currentPlayerIndex];
      const targets = (snapshot.players || []).filter((player: any) => player.id !== activePlayer?.id &&
        Object.values(player.resources || {}).reduce((sum: number, amount: any) => sum + Number(amount), 0) > 0);
      game.setRobberyState(targets.length ? { tile: snapshot.tiles?.find((tile: any) => tile.hasPirate) || snapshot.tiles?.[0], targets } : null);
      if (!targets.length) game.setTurnSubPhase('TRADE_AND_BUILD');
    } else {
      game.setRobberyState(null);
    }
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
        commodityBank: game.commodityBank,
        setCommodityBank: game.setCommodityBank,
        citiesKnightsState: game.citiesKnightsState,
        setCitiesKnightsState: game.setCitiesKnightsState,
        scenarioState: game.scenarioState,
        setScenarioState: game.setScenarioState,
        goldCoins: game.goldCoins,
        setGoldCoins: game.setGoldCoins,
        goldSelectionQueue: game.goldSelectionQueue,
        setGoldSelectionQueue: game.setGoldSelectionQueue,
      });
    });
  });

};
