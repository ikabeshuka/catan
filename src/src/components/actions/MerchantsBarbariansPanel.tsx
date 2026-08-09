import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useTurnManager } from '../../hooks/useTurnManager';
import { dispatchGameAction } from '../../services/gameDispatcher';

/** The focused choice required after rolling 7 in scenario 5. */
export const MerchantsBarbariansPanel: React.FC = () => {
  const { currentPlayer, turnSubPhase } = useTurnManager();
  const { edges, scenarioState, roomId, myPlayerId, setScenarioState, setPlayers, setTurnSubPhase, players, addLog } = useGame();
  const choices = useMemo(() => edges.filter(edge => !(scenarioState as any)?.barbarianEdgeIds?.includes(edge.id)), [edges, scenarioState]);
  const [edgeId, setEdgeId] = useState('');
  if (!currentPlayer || turnSubPhase !== 'MERCHANTS_BARBARIAN_PLACEMENT') return null;
  const disabled = !edgeId || currentPlayer.isBot || (!!roomId && currentPlayer.id !== myPlayerId);
  return <div className="rounded-2xl border border-rose-600/40 bg-rose-950/30 p-3 text-xs" dir="rtl">
    <p className="mb-2 font-black text-rose-300">גלגול 7: הצב ברברי על שביל או דרך.</p>
    <select className="mb-2 w-full rounded bg-slate-950 p-2" value={edgeId} onChange={event => setEdgeId(event.target.value)}>
      <option value="">בחר שביל</option>
      {choices.map(edge => <option key={edge.id} value={edge.id}>{edge.id}{edge.hasRoad ? ' — דרך בנויה' : ''}</option>)}
    </select>
    <button disabled={disabled} className="w-full rounded bg-rose-600 px-2 py-2 font-black disabled:opacity-40" onClick={() => dispatchGameAction({ type: 'PLACE_MERCHANTS_BARBARIAN', playerId: currentPlayer.id, edgeId }, {
      roomId: roomId || undefined, isRemote: false, myPlayerId: roomId ? myPlayerId : currentPlayer.id,
      players, edges, scenarioState, setScenarioState, setPlayers, setTurnSubPhase, turnSubPhase, addLog,
    })}>הצב ברברי</button>
  </div>;
};
