import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { PROGRESS_CARD_ART, PROGRESS_CARD_BY_ID } from '../../config/citiesKnightsProgressCards';

const TRACKS = [
  { id: 'SCIENCE', label: 'מדע', commodity: 'PAPER', icon: '📜' },
  { id: 'POLITICS', label: 'פוליטיקה', commodity: 'COIN', icon: '🪙' },
  { id: 'TRADE', label: 'מסחר', commodity: 'CLOTH', icon: '🧶' },
] as const;

export const CitiesKnightsPanel: React.FC = () => {
  const game = useGame();
  const [knightVertexId, setKnightVertexId] = useState('');
  const [knightMoveTarget, setKnightMoveTarget] = useState<Record<string, string>>({});
  const [relocationTarget, setRelocationTarget] = useState('');
  const [alchemistDice, setAlchemistDice] = useState<[number, number, number]>([1, 1, 1]);
  const [alchemistEventDie, setAlchemistEventDie] = useState<'BARBARIAN' | 'SCIENCE' | 'POLITICS' | 'TRADE'>('SCIENCE');
  const [inventorTiles, setInventorTiles] = useState<[string, string]>(['', '']);
  const [monopolyResource, setMonopolyResource] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('WOOD');
  const [commodityMonopoly, setCommodityMonopoly] = useState<'COIN' | 'PAPER' | 'CLOTH'>('COIN');
  const [progressTargetId, setProgressTargetId] = useState('');
  const [masterMerchantCards, setMasterMerchantCards] = useState<[string, string]>(['', '']);
  const [spyCardId, setSpyCardId] = useState('');
  const [merchantTileId, setMerchantTileId] = useState('');
  const [merchantFleetResource, setMerchantFleetResource] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('WOOD');
  const [bishopTileId, setBishopTileId] = useState('');
  const [diplomatEdgeId, setDiplomatEdgeId] = useState('');
  const [intrigueVertexId, setIntrigueVertexId] = useState('');
  const player = game.roomId ? game.players.find(candidate => candidate.id === game.myPlayerId) : game.players.find(candidate => !candidate.isBot);
  const isTurn = Boolean(player && game.players[game.currentPlayerIndex]?.id === player.id && game.turnSubPhase === 'TRADE_AND_BUILD');
  const dispatch = (action: any) => dispatchGameAction(action, {
    roomId: game.roomId || undefined,
    isRemote: false,
    myPlayerId: game.roomId ? game.myPlayerId : player?.id,
    players: game.players,
    vertices: game.vertices,
    edges: game.edges,
    tiles: game.tiles,
    setTiles: game.setTiles,
    setPlayers: game.setPlayers,
    setVertices: game.setVertices,
    setResourceBank: game.setResourceBank,
    resourceBank: game.resourceBank,
    setCommodityBank: game.setCommodityBank,
    commodityBank: game.commodityBank,
    setCitiesKnightsState: game.setCitiesKnightsState,
    citiesKnightsState: game.citiesKnightsState,
    setRoadBuildingRemaining: game.setRoadBuildingRemaining,
    setTurnSubPhase: game.setTurnSubPhase,
    addLog: game.addLog,
  });

  const knightSpaces = useMemo(() => game.vertices.filter(vertex => vertex.structure === 'NONE' && !vertex.knight &&
    game.edges.some(edge => edge.hasRoad && edge.playerId === player?.id && edge.id.includes(vertex.id))), [game.vertices, game.edges, player?.id]);
  if (!player) return null;
  const ownKnights = game.vertices.filter(vertex => vertex.knight?.playerId === player.id);
  const ownCities = game.vertices.filter(vertex => vertex.playerId === player.id && vertex.structure === 'CITY');
  const ownSettlements = game.vertices.filter(vertex => vertex.playerId === player.id && vertex.structure === 'SETTLEMENT');
  const selectedTarget = game.players.find(candidate => candidate.id === progressTargetId);
  const targetCards = selectedTarget ? [
    ...(['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const).flatMap(resource => Array.from({ length: selectedTarget.resources?.[resource] || 0 }, () => resource)),
    ...(['COIN', 'PAPER', 'CLOTH'] as const).flatMap(commodity => Array.from({ length: selectedTarget.commodities?.[commodity] || 0 }, () => commodity)),
  ] : [];
  const canReachOnRoads = (fromId: string, toId: string) => {
    const endpoints = (edge: any) => {
      const parts = String(edge.id || '').replace(/^e_/, '').split('_v_');
      return parts.length === 2 ? [parts[0], `v_${parts[1]}`] : [];
    };
    const pending = [fromId];
    const visited = new Set(pending);
    while (pending.length) {
      const current = pending.shift()!;
      if (current === toId) return true;
      game.edges.filter(edge => edge.hasRoad && edge.playerId === player.id && endpoints(edge).includes(current)).forEach(edge =>
        endpoints(edge).filter(id => !visited.has(id)).forEach(id => { visited.add(id); pending.push(id); })
      );
    }
    return false;
  };
  const mustDowngrade = game.turnSubPhase === 'BARBARIAN_LOSS' && game.citiesKnightsState.barbarianLossQueue[0] === player.id;
  const pendingDisplacedKnight = game.citiesKnightsState.pendingDisplacedKnight;
  const mustRelocateKnight = game.turnSubPhase === 'KNIGHT_DISPLACEMENT' && pendingDisplacedKnight?.ownerId === player.id;
  const mustDiscardProgress = game.turnSubPhase === 'PROGRESS_DISCARD' && game.citiesKnightsState.progressDiscardQueue?.[0] === player.id;
  const deserterPending = game.citiesKnightsState.deserterPending;
  const mustChooseDeserter = game.turnSubPhase === 'DESERTER_SELECT' && deserterPending?.targetPlayerId === player.id;
  const mustPlaceDeserter = game.turnSubPhase === 'DESERTER_PLACE' && deserterPending?.actorId === player.id;
  const canUseAlchemist = game.players[game.currentPlayerIndex]?.id === player.id && game.turnSubPhase === 'BEFORE_ROLL';

  return (
    <section className="rounded-2xl border border-violet-400/25 bg-violet-950/20 p-3 text-right" dir="rtl">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black text-violet-200">ערים ואבירים</h3>
        <span className="rounded-full border border-rose-400/30 bg-rose-950/30 px-2 py-0.5 text-[10px] font-bold text-rose-200">ברברים: {game.citiesKnightsState.barbarianPosition}/7</span>
      </div>
      <div className="mb-3 flex gap-2 text-[11px] text-slate-200">
        <span>🪙 {player.commodities?.COIN || 0}</span><span>📜 {player.commodities?.PAPER || 0}</span><span>🧶 {player.commodities?.CLOTH || 0}</span>
      </div>
      {game.citiesKnightsState.merchant && <div className="mb-2 rounded bg-amber-950/35 px-2 py-1 text-[10px] text-amber-200">סוחר: {game.players.find(candidate => candidate.id === game.citiesKnightsState.merchant?.playerId)?.name || '—'} · {game.citiesKnightsState.merchant.resource} ביחס 2:1</div>}

      {(player.progressCards || []).length > 0 && <div className="mb-3 flex flex-wrap gap-1.5">
        {player.progressCards!.map((cardId, index) => {
          const card = PROGRESS_CARD_BY_ID[cardId as keyof typeof PROGRESS_CARD_BY_ID];
          return <div key={`${cardId}-${index}`} title={`קלף קִדמה: ${card?.name || cardId}`} className="relative h-12 w-8 overflow-hidden rounded border border-violet-300/40 bg-slate-900">
            <img src={card ? PROGRESS_CARD_ART[card.id] : '/win1.png'} alt="קלף קִדמה" className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-black/65 px-0.5 py-px text-center text-[7px] font-black text-white">{card?.name || cardId}</span>
            {mustDiscardProgress ? <button onClick={() => dispatch({ type: 'DISCARD_PROGRESS_CARD', playerId: player.id, cardId })} className="absolute inset-x-0 top-0 bg-rose-700/90 text-[8px] font-black text-white">השלך</button> : ['SABOTEUR', 'WEDDING', 'COMMERCIAL_HARBOR', 'WARLORD', 'ROAD_BUILDING', 'CRANE', 'SMITH', 'IRRIGATION', 'MINING'].includes(cardId) && <button disabled={!isTurn} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId })} className="absolute inset-x-0 top-0 bg-violet-700/85 text-[8px] font-black text-white opacity-0 transition-opacity hover:opacity-100 disabled:hidden">הפעל</button>}
          </div>
        })}
      </div>}
      {player.progressCards?.includes('ALCHEMIST') && canUseAlchemist && (
        <div className="mb-3 rounded-xl border border-cyan-400/40 bg-cyan-950/30 p-2 text-[10px] text-cyan-100">
          <div className="mb-1 font-black">אלכימאי — בחר את תוצאת כל הקוביות לפני ההטלה</div>
          <div className="flex gap-1">
            {alchemistDice.map((value, index) => <select key={index} value={value} onChange={event => setAlchemistDice(previous => previous.map((die, dieIndex) => dieIndex === index ? Number(event.target.value) : die) as [number, number, number])} className="w-9 rounded bg-slate-950 px-1 py-1">
              {[1, 2, 3, 4, 5, 6].map(option => <option key={option} value={option}>{option}</option>)}</select>)}
            <select value={alchemistEventDie} onChange={event => setAlchemistEventDie(event.target.value as typeof alchemistEventDie)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1">
              <option value="BARBARIAN">ברברים</option><option value="SCIENCE">מדע</option><option value="POLITICS">פוליטיקה</option><option value="TRADE">מסחר</option>
            </select>
            <button onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'ALCHEMIST', data: { diceValues: alchemistDice, eventDie: alchemistEventDie } })} className="rounded bg-cyan-700 px-2 py-1 font-black">הפעל</button>
          </div>
        </div>
      )}
      {player.progressCards?.includes('INVENTOR') && isTurn && (
        <div className="mb-3 rounded-xl border border-cyan-400/40 bg-cyan-950/30 p-2 text-[10px] text-cyan-100">
          <div className="mb-1 font-black">ממציא — החלף בין שני מספרים (לא 2 או 12)</div>
          <div className="flex gap-1">
            {[0, 1].map(index => <select key={index} value={inventorTiles[index]} onChange={event => setInventorTiles(previous => previous.map((tileId, tileIndex) => tileIndex === index ? event.target.value : tileId) as [string, string])} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1">
              <option value="">אריח</option>
              {game.tiles.filter(tile => Number.isInteger(tile.numberToken) && tile.numberToken !== 2 && tile.numberToken !== 12).map(tile => <option key={tile.id} value={tile.id}>{tile.type} ({tile.numberToken})</option>)}
            </select>)}
            <button disabled={!inventorTiles[0] || !inventorTiles[1] || inventorTiles[0] === inventorTiles[1]} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'INVENTOR', data: { tileAId: inventorTiles[0], tileBId: inventorTiles[1] } })} className="rounded bg-cyan-700 px-2 py-1 font-black disabled:opacity-40">החלף</button>
          </div>
        </div>
      )}
      {player.progressCards?.includes('BISHOP') && isTurn && (
        <div className="mb-3 flex gap-1 rounded-xl border border-indigo-400/40 bg-indigo-950/30 p-2 text-[10px] text-indigo-100"><select value={bishopTileId} onChange={event => setBishopTileId(event.target.value)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1"><option value="">בישוף: אריח יבשה לשודד</option>{game.tiles.filter(tile => tile.type !== 'WATER' && tile.type !== 'FOG').map(tile => <option key={tile.id} value={tile.id}>{tile.type} ({tile.numberToken ?? '—'})</option>)}</select><button disabled={!bishopTileId} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'BISHOP', data: { tileId: bishopTileId } })} className="rounded bg-indigo-700 px-2 py-1 font-black disabled:opacity-40">העבר שודד</button></div>
      )}
      {player.progressCards?.includes('DIPLOMAT') && isTurn && (
        <div className="mb-3 flex gap-1 rounded-xl border border-indigo-400/40 bg-indigo-950/30 p-2 text-[10px] text-indigo-100"><select value={diplomatEdgeId} onChange={event => setDiplomatEdgeId(event.target.value)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1"><option value="">דיפלומט: דרך פתוחה להסרה</option>{game.edges.filter(edge => edge.hasRoad && edge.playerId && edge.id).filter(edge => { const ids = edge.id.replace(/^e_/, '').split('_v_'); const endpoints = ids.length === 2 ? [ids[0], `v_${ids[1]}`] : []; return endpoints.every(id => game.vertices.find(vertex => vertex.id === id)?.structure === 'NONE'); }).map(edge => <option key={edge.id} value={edge.id}>{edge.id.replace('e_', '')}</option>)}</select><button disabled={!diplomatEdgeId} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'DIPLOMAT', data: { targetEdgeId: diplomatEdgeId } })} className="rounded bg-indigo-700 px-2 py-1 font-black disabled:opacity-40">הסר דרך</button></div>
      )}
      {player.progressCards?.includes('INTRIGUE') && isTurn && (
        <div className="mb-3 flex gap-1 rounded-xl border border-indigo-400/40 bg-indigo-950/30 p-2 text-[10px] text-indigo-100"><select value={intrigueVertexId} onChange={event => setIntrigueVertexId(event.target.value)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1"><option value="">תככים: אביר יריב ליד אביר פעיל שלך</option>{game.vertices.filter(vertex => vertex.knight && vertex.knight.playerId !== player.id).filter(vertex => game.edges.some(edge => edge.id.includes(vertex.id) && edge.hasRoad && edge.playerId === player.id && edge.id.split('_v_').some(part => { const id = part.startsWith('v_') ? part : `v_${part}`; return id !== vertex.id && game.vertices.find(candidate => candidate.id === id)?.knight?.playerId === player.id && game.vertices.find(candidate => candidate.id === id)?.knight?.active; }))).map(vertex => <option key={vertex.id} value={vertex.id}>{vertex.id.replace('v_', '')}</option>)}</select><button disabled={!intrigueVertexId} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'INTRIGUE', data: { targetVertexId: intrigueVertexId } })} className="rounded bg-indigo-700 px-2 py-1 font-black disabled:opacity-40">הזז אביר</button></div>
      )}
      {(player.progressCards?.includes('RESOURCE_MONOPOLY') || player.progressCards?.includes('TRADE_MONOPOLY')) && isTurn && (
        <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-950/25 p-2 text-[10px] text-amber-100">
          {player.progressCards?.includes('RESOURCE_MONOPOLY') && <div className="mb-1 flex gap-1"><select value={monopolyResource} onChange={event => setMonopolyResource(event.target.value as typeof monopolyResource)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1">{['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].map(resource => <option key={resource} value={resource}>{resource}</option>)}</select><button onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'RESOURCE_MONOPOLY', data: { resource: monopolyResource } })} className="rounded bg-amber-700 px-2 py-1 font-black">מונופול משאבים</button></div>}
          {player.progressCards?.includes('TRADE_MONOPOLY') && <div className="flex gap-1"><select value={commodityMonopoly} onChange={event => setCommodityMonopoly(event.target.value as typeof commodityMonopoly)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1">{['COIN', 'PAPER', 'CLOTH'].map(commodity => <option key={commodity} value={commodity}>{commodity}</option>)}</select><button onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'TRADE_MONOPOLY', data: { resource: commodityMonopoly } })} className="rounded bg-amber-700 px-2 py-1 font-black">מונופול סחורות</button></div>}
        </div>
      )}
      {(player.progressCards?.includes('MASTER_MERCHANT') || player.progressCards?.includes('SPY') || player.progressCards?.includes('DESERTER')) && isTurn && (
        <div className="mb-3 rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/25 p-2 text-[10px] text-fuchsia-100">
          <select value={progressTargetId} onChange={event => { setProgressTargetId(event.target.value); setMasterMerchantCards(['', '']); setSpyCardId(''); }} className="mb-1 w-full rounded bg-slate-950 px-1 py-1"><option value="">בחר שחקן יעד</option>{game.players.filter(candidate => candidate.id !== player.id).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select>
          {player.progressCards?.includes('MASTER_MERCHANT') && <div className="mb-1 flex gap-1"><select value={masterMerchantCards[0]} onChange={event => setMasterMerchantCards(previous => [event.target.value, previous[1]])} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1"><option value="">קלף ראשון</option>{targetCards.map((card, index) => <option key={`${card}-${index}`} value={card}>{card}</option>)}</select><select value={masterMerchantCards[1]} onChange={event => setMasterMerchantCards(previous => [previous[0], event.target.value])} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1"><option value="">קלף שני</option>{targetCards.map((card, index) => <option key={`${card}-${index}`} value={card}>{card}</option>)}</select><button disabled={!progressTargetId || !masterMerchantCards[0] || !masterMerchantCards[1]} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MASTER_MERCHANT', data: { targetPlayerId: progressTargetId, selectedCards: masterMerchantCards as any } })} className="rounded bg-fuchsia-700 px-2 py-1 font-black disabled:opacity-40">סוחר ראשי</button></div>}
          {player.progressCards?.includes('SPY') && <div className="flex gap-1"><select value={spyCardId} onChange={event => setSpyCardId(event.target.value)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1"><option value="">קלף קידמה</option>{(selectedTarget?.progressCards || []).map((card, index) => <option key={`${card}-${index}`} value={card}>{card}</option>)}</select><button disabled={!progressTargetId || !spyCardId} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'SPY', data: { targetPlayerId: progressTargetId, targetCardId: spyCardId } })} className="rounded bg-fuchsia-700 px-2 py-1 font-black disabled:opacity-40">מרגל</button></div>}
          {player.progressCards?.includes('DESERTER') && <button disabled={!progressTargetId || !selectedTarget || !game.vertices.some(vertex => vertex.knight?.playerId === progressTargetId)} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'DESERTER', data: { targetPlayerId: progressTargetId } })} className="rounded bg-indigo-700 px-2 py-1 font-black disabled:opacity-40">עריק: בחר אביר יריב</button>}
        </div>
      )}

      {mustChooseDeserter && <div className="mb-3 rounded-xl border border-rose-400/40 bg-rose-950/30 p-2 text-[10px] text-rose-100"><div className="font-black">עריק: בחר אביר שלך שיוחזר למלאי</div><div className="mt-1 flex flex-wrap gap-1">{ownKnights.map(vertex => <button key={vertex.id} onClick={() => dispatch({ type: 'SELECT_DESERTER_KNIGHT', playerId: player.id, vertexId: vertex.id })} className="rounded bg-rose-700 px-2 py-1">דרגה {vertex.knight!.level} · {vertex.knight!.active ? 'פעיל' : 'לא פעיל'}</button>)}</div></div>}
      {mustPlaceDeserter && <div className="mb-3 rounded-xl border border-indigo-400/40 bg-indigo-950/30 p-2 text-[10px] text-indigo-100"><div className="font-black">עריק: הצב בחינם אביר באותה דרגה ובאותו מצב</div><div className="mt-1 flex flex-wrap gap-1">{knightSpaces.map(vertex => <button key={vertex.id} onClick={() => dispatch({ type: 'PLACE_DESERTER_KNIGHT', playerId: player.id, vertexId: vertex.id })} className="rounded bg-indigo-700 px-2 py-1">{vertex.id.replace('v_', '')}</button>)}</div></div>}
      {(player.progressCards?.includes('MERCHANT') || player.progressCards?.includes('MERCHANT_FLEET')) && isTurn && (
        <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-950/25 p-2 text-[10px] text-amber-100">
          {player.progressCards?.includes('MERCHANT') && <div className="mb-1 flex gap-1"><select value={merchantTileId} onChange={event => setMerchantTileId(event.target.value)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1"><option value="">אריח משאב סמוך לבניין שלך</option>{game.tiles.filter(tile => ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].includes(tile.type)).map(tile => <option key={tile.id} value={tile.id}>{tile.type} ({tile.numberToken ?? '—'})</option>)}</select><button disabled={!merchantTileId} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MERCHANT', data: { tileId: merchantTileId } })} className="rounded bg-amber-700 px-2 py-1 font-black disabled:opacity-40">הצב סוחר</button></div>}
          {player.progressCards?.includes('MERCHANT_FLEET') && <div className="flex gap-1"><select value={merchantFleetResource} onChange={event => setMerchantFleetResource(event.target.value as typeof merchantFleetResource)} className="min-w-0 flex-1 rounded bg-slate-950 px-1 py-1">{['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].map(resource => <option key={resource} value={resource}>{resource}</option>)}</select><button onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MERCHANT_FLEET', data: { resource: merchantFleetResource } })} className="rounded bg-amber-700 px-2 py-1 font-black">צי סוחר 2:1</button></div>}
        </div>
      )}

      {mustDowngrade && (
        <div className="mb-3 rounded-xl border border-rose-400/40 bg-rose-950/40 p-2 text-xs text-rose-100">
          הברברים ניצחו — בחר עיר להורדה ליישוב.
          <div className="mt-2 flex flex-wrap gap-1">
            {ownCities.filter(vertex => !vertex.metropolis).map(vertex => <button key={vertex.id} onClick={() => dispatch({ type: 'DOWNGRADE_CITY', playerId: player.id, vertexId: vertex.id })} className="rounded bg-rose-600 px-2 py-1 font-bold">עיר</button>)}
          </div>
        </div>
      )}
      {mustRelocateKnight && <div className="mb-3 rounded-xl border border-sky-400/40 bg-sky-950/40 p-2 text-xs text-sky-100">
        אבירך נדחק — בחר מיקום חוקי ברשת הדרכים שלך.
        <div className="mt-2 flex gap-1">
          <select value={relocationTarget} onChange={event => setRelocationTarget(event.target.value)} className="min-w-0 flex-1 rounded bg-slate-950 px-2 py-1 text-[10px]">
            <option value="">מיקום חלופי</option>
            {game.vertices.filter(vertex => vertex.structure === 'NONE' && !vertex.knight && canReachOnRoads(pendingDisplacedKnight!.originVertexId, vertex.id)).map(vertex => <option key={vertex.id} value={vertex.id}>{vertex.id.replace('v_', '')}</option>)}
          </select>
          <button disabled={!relocationTarget} onClick={() => dispatch({ type: 'RELOCATE_DISPLACED_KNIGHT', playerId: player.id, toVertexId: relocationTarget })} className="rounded bg-sky-700 px-2 py-1 font-bold disabled:opacity-40">הצב</button>
          <button onClick={() => dispatch({ type: 'RELOCATE_DISPLACED_KNIGHT', playerId: player.id })} className="rounded bg-slate-700 px-2 py-1">הסר</button>
        </div>
      </div>}

      <div className="mb-3 flex gap-1.5">
        <select value={knightVertexId} onChange={event => setKnightVertexId(event.target.value)} className="min-w-0 flex-1 rounded bg-slate-950 px-2 py-1 text-[10px] text-slate-200">
          <option value="">מיקום אביר</option>
          {knightSpaces.map(vertex => <option key={vertex.id} value={vertex.id}>{vertex.id.replace('v_', '')}</option>)}
        </select>
        <button disabled={!isTurn || !knightVertexId} onClick={() => dispatch({ type: 'BUILD_KNIGHT', playerId: player.id, vertexId: knightVertexId })} className="rounded bg-violet-500 px-2 py-1 text-xs font-black text-white disabled:opacity-40">אביר</button>
      </div>

      {ownKnights.length > 0 && <div className="mb-3 space-y-1">
        {ownKnights.map(vertex => <div key={vertex.id} className="flex items-center justify-between rounded bg-slate-950/60 px-2 py-1 text-[11px]">
          <span>{vertex.knight!.active ? 'פעיל' : 'לא פעיל'} · דרגה {vertex.knight!.level}</span>
          <span className="flex gap-1">
            {!vertex.knight!.active && <button disabled={!isTurn} onClick={() => dispatch({ type: 'ACTIVATE_KNIGHT', playerId: player.id, vertexId: vertex.id })} className="rounded bg-emerald-600 px-1.5 py-0.5 disabled:opacity-40">הפעל</button>}
            {vertex.knight!.active && vertex.knight!.level < 3 && <button disabled={!isTurn} onClick={() => dispatch({ type: 'UPGRADE_KNIGHT', playerId: player.id, vertexId: vertex.id })} className="rounded bg-amber-600 px-1.5 py-0.5 disabled:opacity-40">שדרג</button>}
          </span>
          {vertex.knight!.active && !vertex.knight!.actedThisTurn && <span className="flex gap-1">
            <select value={knightMoveTarget[vertex.id] || ''} onChange={event => setKnightMoveTarget(previous => ({ ...previous, [vertex.id]: event.target.value }))} className="max-w-24 rounded bg-slate-800 px-1 text-[9px]">
              <option value="">יעד</option>
              {game.vertices.filter(target => (target.structure === 'NONE' && !target.knight) || (target.knight && target.knight.playerId !== player.id && target.knight.level < vertex.knight!.level)).filter(target => canReachOnRoads(vertex.id, target.id)).map(target => <option key={target.id} value={target.id}>{target.id.replace('v_', '')}{target.knight ? ' (דחיקה)' : ''}</option>)}
            </select>
            <button disabled={!isTurn || !knightMoveTarget[vertex.id]} onClick={() => {
              const target = game.vertices.find(candidate => candidate.id === knightMoveTarget[vertex.id]);
              dispatch({ type: target?.knight ? 'DISPLACE_KNIGHT' : 'MOVE_KNIGHT', playerId: player.id, fromVertexId: vertex.id, toVertexId: knightMoveTarget[vertex.id] });
            }} className="rounded bg-sky-700 px-1.5 py-0.5 disabled:opacity-40">הזז</button>
          </span>}
        </div>)}
      </div>}

      <div className="mb-3 flex flex-wrap gap-1">
        {ownCities.filter(vertex => !vertex.cityWall).map(vertex => <button key={vertex.id} disabled={!isTurn} onClick={() => dispatch({ type: 'BUILD_CITY_WALL', playerId: player.id, vertexId: vertex.id })} className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] disabled:opacity-40">חומה (2 לבנים)</button>)}
        {player.progressCards?.includes('ENGINEER') && ownCities.filter(vertex => !vertex.cityWall).map(vertex => <button key={`engineer-${vertex.id}`} disabled={!isTurn} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'ENGINEER', data: { vertexId: vertex.id } })} className="rounded border border-cyan-400/50 bg-cyan-950/70 px-2 py-1 text-[11px] disabled:opacity-40">מהנדס: חומה חינם</button>)}
        {player.progressCards?.includes('MEDICINE') && ownSettlements.map(vertex => <button key={`medicine-${vertex.id}`} disabled={!isTurn || player.resources.WHEAT < 1 || player.resources.ORE < 2} onClick={() => dispatch({ type: 'PLAY_PROGRESS_CARD', playerId: player.id, cardId: 'MEDICINE', data: { vertexId: vertex.id } })} className="rounded border border-emerald-400/50 bg-emerald-950/70 px-2 py-1 text-[11px] disabled:opacity-40">רפואה: עיר (1 חיטה, 2 ברזל)</button>)}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {TRACKS.map(track => {
          const level = player.cityImprovements?.[track.id] || 0;
          const cost = Math.max(0, level + 1 - (player.cityImprovementDiscount || 0));
          return <button key={track.id} disabled={!isTurn || level >= 5 || (player.commodities?.[track.commodity] || 0) < cost} onClick={() => dispatch({ type: 'UPGRADE_CITY_IMPROVEMENT', playerId: player.id, track: track.id })} className="rounded border border-violet-400/20 bg-slate-900 px-1 py-1.5 text-[10px] disabled:opacity-40">{track.icon} {track.label}<br />{level}/5 · {cost}</button>;
        })}
      </div>
    </section>
  );
};
