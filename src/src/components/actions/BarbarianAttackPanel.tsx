import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { dispatchGameAction } from '../../services/gameDispatcher';

const CARD_NAMES: Record<string, string> = {
  KNIGHTHOOD: 'משמר אבירים',
  STRONG_KNIGHT: 'אביר חזק',
  TREASON: 'בגידה',
  INTRIGUE: 'קנוניה',
};

/** Immediate-resolution controls for the Barbarian Attack development deck. */
export const BarbarianAttackPanel: React.FC = () => {
  const game = useGame();
  const { scenarioState, players, currentPlayerIndex, roomId, myPlayerId, edges, tiles, turnSubPhase } = game;
  const [edgeId, setEdgeId] = useState('');
  const [tileId, setTileId] = useState('');
  const [sourceA, setSourceA] = useState('');
  const [sourceB, setSourceB] = useState('');
  const [targetA, setTargetA] = useState('');
  const [targetB, setTargetB] = useState('');
  const [knightId, setKnightId] = useState('');
  const [payWheat, setPayWheat] = useState(false);
  if (scenarioState.kind !== 'BARBARIAN_ATTACK') return null;
  const currentPlayer = players[currentPlayerIndex];
  const humanPlayer = roomId ? players.find(player => player.id === myPlayerId) : players.find(player => !player.isBot) || currentPlayer;
  const isOurTurn = Boolean(currentPlayer && humanPlayer && currentPlayer.id === humanPlayer.id && turnSubPhase === 'TRADE_AND_BUILD');
  const pending = scenarioState.pendingDevelopmentCard;
  const playerKnights = scenarioState.knights.filter(knight => knight.ownerPlayerId === humanPlayer?.id);
  const barbarians = scenarioState.barbarians;
  const edgeOptions = useMemo(() => edges.filter(edge => !scenarioState.knights.some(knight => knight.edgeId === edge.id)), [edges, scenarioState.knights]);
  const submit = (action: any) => dispatchGameAction(action, {
    roomId: roomId || undefined,
    isRemote: false,
    myPlayerId: roomId ? myPlayerId : currentPlayer?.id,
    players, edges, tiles, scenarioState,
    setPlayers: game.setPlayers, setEdges: game.setEdges, setTiles: game.setTiles,
    setScenarioState: game.setScenarioState, setResourceBank: game.setResourceBank,
    setGoldCoins: game.setGoldCoins, setDevCardDeck: game.setDevCardDeck,
    addLog: game.addLog,
  });
  const select = (value: string, onChange: (value: string) => void, options: Array<{ id: string; label: string }>) => (
    <select value={value} onChange={event => onChange(event.target.value)} className="w-full rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-100">
      <option value="">בחרו מיקום</option>
      {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  );
  return (
    <section className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-right" dir="rtl">
      <div className="mb-2 flex items-center justify-between text-xs font-black text-red-200"><span>⚔️ התקפת הברברים</span><span>אסירים: {scenarioState.prisonersByPlayerId[humanPlayer?.id || ''] || 0}</span></div>
      {pending && pending.playerId === humanPlayer?.id && (
        <div className="space-y-2 rounded-lg bg-slate-950/70 p-2 text-xs">
          <div className="font-bold text-amber-200">קלף מיידי: {CARD_NAMES[pending.cardType]}</div>
          {['KNIGHTHOOD', 'STRONG_KNIGHT'].includes(pending.cardType) && select(edgeId, setEdgeId, edgeOptions
            .filter(edge => pending.cardType === 'STRONG_KNIGHT' || edge.isBarbarianFortressRoute)
            .map(edge => ({ id: edge.id, label: edge.isBarbarianFortressRoute ? `שביל מבצר - ${edge.id}` : edge.id })))}
          {pending.cardType === 'INTRIGUE' && select(tileId, setTileId, barbarians.map(barbarian => ({ id: barbarian.tileId, label: `ברברי ב-${barbarian.tileId}` })))}
          {pending.cardType === 'TREASON' && <div className="grid grid-cols-2 gap-1">
            {select(sourceA, setSourceA, barbarians.map(barbarian => ({ id: barbarian.tileId, label: `מ-${barbarian.tileId}` })))}
            {select(sourceB, setSourceB, barbarians.map(barbarian => ({ id: barbarian.tileId, label: `מ-${barbarian.tileId}` })))}
            {select(targetA, setTargetA, tiles.map(tile => ({ id: tile.id, label: `אל ${tile.id}` })))}
            {select(targetB, setTargetB, tiles.map(tile => ({ id: tile.id, label: `אל ${tile.id}` })))}
          </div>}
          <button disabled={!isOurTurn} onClick={() => {
            const action: any = { type: 'RESOLVE_BARBARIAN_CARD', playerId: humanPlayer!.id };
            if (['KNIGHTHOOD', 'STRONG_KNIGHT'].includes(pending.cardType)) action.edgeId = edgeId;
            else if (pending.cardType === 'INTRIGUE') action.tileId = tileId;
            else { action.sourceTileIds = [sourceA, sourceB]; action.targetTileIds = [targetA, targetB]; }
            submit(action);
          }} className="w-full rounded bg-red-700 px-2 py-1 font-bold text-white disabled:opacity-40">בצעו מיד</button>
        </div>
      )}
      {playerKnights.length > 0 && isOurTurn && !pending && <div className="mt-2 space-y-1 text-xs">
        <div className="font-bold text-slate-200">תנועת אבירים - עד 3 שבילים, או עד 5 תמורת חיטה</div>
        {select(knightId, setKnightId, playerKnights.map(knight => ({ id: knight.id, label: `${knight.kind === 'STRONG_KNIGHT' ? 'אביר חזק' : 'משמר'} - ${knight.edgeId}` })))}
        {select(edgeId, setEdgeId, edgeOptions.filter(edge => !edge.isBarbarianFortressRoute).map(edge => ({ id: edge.id, label: edge.id })))}
        <label className="flex items-center gap-1 text-slate-300"><input type="checkbox" checked={payWheat} onChange={event => setPayWheat(event.target.checked)} /> שלמו חיטה ל-5 שבילים</label>
        <button onClick={() => submit({ type: 'MOVE_BARBARIAN_KNIGHT', playerId: humanPlayer!.id, knightId, edgeId, payWheat })} className="w-full rounded bg-amber-700 px-2 py-1 font-bold text-white">הזיזו אביר</button>
      </div>}
    </section>
  );
};
