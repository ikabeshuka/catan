import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useTurnManager } from './useTurnManager';
import { socketService } from '../services/network/socketService';
import { dispatchGameAction } from '../services/gameDispatcher';

interface UseOnlineGameSyncProps {
  roomId: string | null;
  isHost: boolean;
  setBotTimeLimit: (limit: number) => void;
}

export const useOnlineGameSync = ({
  roomId,
  isHost,
  setBotTimeLimit,
}: UseOnlineGameSyncProps) => {
  const {
    gamePhase,
    initNewGame,
    players,
    tiles,
    vertices,
    edges,
    setVertices,
    setEdges,
    setPlayers,
    setTurnSubPhase,
    addLog,
    roadBuildingRemaining,
    setRoadBuildingRemaining,
    buyDevelopmentCard,
    setTiles,
    setRobberyState,
    activeExpansion,
    activeRobberType,
    setActiveExpansion,
    setSelectedScenario,
    setBoardType,
    showBuildingCostToast,
  } = useGame();

  const { recordSetupPlacement, endTurn, handleDiceRoll } = useTurnManager();

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
};
