import React from 'react';
import { useGame } from '../../context/GameContext';
import { useTurnManager } from '../../hooks/useTurnManager';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { getEdgeVertices } from '../../utils/hexMath/boardGeometryHelpers';

export const RiverBridgePanel: React.FC = () => {
  const { currentPlayer, turnSubPhase } = useTurnManager();
  const {
    edges, vertices, players, setEdges, setPlayers, resourceBank, setResourceBank,
    goldCoins, setGoldCoins, roomId, myPlayerId, addLog, mbScenarioId,
  } = useGame();
  if (!currentPlayer || mbScenarioId !== 'RIVERS_OF_CATAN') return null;

  const isWrongOnlinePlayer = Boolean(roomId && (!myPlayerId || currentPlayer.id !== myPlayerId));
  const bridgesBuilt = edges.filter(edge => edge.bridgePlayerId === currentPlayer.id).length;
  const canPay = currentPlayer.resources.WOOD >= 1 && currentPlayer.resources.BRICK >= 2;
  const crossings = edges.filter(edge => edge.isRiverCrossing);
  const canConnect = (edgeId: string) => getEdgeVertices(edgeId).some(vertexId =>
    vertices.some(vertex => vertex.id === vertexId && vertex.playerId === currentPlayer.id && ['SETTLEMENT', 'CITY'].includes(vertex.structure)) ||
    edges.some(edge => edge.id !== edgeId && ((edge.hasRoad && edge.playerId === currentPlayer.id) || edge.bridgePlayerId === currentPlayer.id) && getEdgeVertices(edge.id).includes(vertexId))
  );

  const build = (edgeId: string) => dispatchGameAction({ type: 'BUILD_BRIDGE', playerId: currentPlayer.id, edgeId }, {
    roomId: roomId || undefined,
    isRemote: false,
    myPlayerId: roomId ? myPlayerId : currentPlayer.id,
    turnSubPhase,
    mbScenarioId,
    players,
    setPlayers,
    edges,
    setEdges,
    vertices,
    resourceBank,
    setResourceBank,
    goldCoins,
    setGoldCoins,
    addLog,
  });

  return (
    <section className="rounded-2xl border border-cyan-500/35 bg-slate-900/90 p-3 text-right shadow-md">
      <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-cyan-300">🌉 גשרי הנהרות</span>
        <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">{bridgesBuilt}/3</span>
      </div>
      <p className="mb-2 text-[10px] font-medium text-slate-400">עלות: עץ 1 + לבנים 2. כל גשר מעניק 3 זהב ונחשב לדרך הארוכה ביותר.</p>
      <div className="grid grid-cols-2 gap-1.5">
        {crossings.map((edge, index) => {
          const enabled = !isWrongOnlinePlayer && turnSubPhase === 'TRADE_AND_BUILD' && !edge.bridgePlayerId && bridgesBuilt < 3 && canPay && canConnect(edge.id);
          return (
            <button key={edge.id} disabled={!enabled} onClick={() => build(edge.id)}
              className={`rounded-lg border px-2 py-1.5 text-[10px] font-bold transition ${enabled ? 'border-cyan-600 bg-cyan-950/45 text-cyan-200 hover:bg-cyan-900/70' : 'cursor-not-allowed border-slate-800 bg-slate-950/50 text-slate-600'}`}>
              {edge.bridgePlayerId ? `גשר ${index + 1} בנוי` : `בנה גשר ${index + 1}`}
            </button>
          );
        })}
      </div>
    </section>
  );
};
