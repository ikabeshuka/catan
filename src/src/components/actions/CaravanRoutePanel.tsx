import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useTurnManager } from '../../hooks/useTurnManager';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { getCaravanCamelCandidates } from '../../utils/gameEngine/caravanRouteRules';

export const CaravanRoutePanel: React.FC = () => {
  const { currentPlayer } = useTurnManager();
  const {
    scenarioState, edges, tiles, vertices, players, setEdges, setPlayers, setScenarioState,
    resourceBank, setResourceBank, roomId, myPlayerId, addLog, mbScenarioId,
  } = useGame();
  const [sheep, setSheep] = useState(0);
  const [wheat, setWheat] = useState(0);
  if (!currentPlayer || mbScenarioId !== 'CARAVAN_ROUTE' || scenarioState.kind !== 'CARAVAN_ROUTE') return null;

  const actor = roomId ? players.find(player => player.id === myPlayerId) : currentPlayer;
  if (!actor) return null;

  const isOwner = scenarioState.pendingCamelPlayerId === actor.id;
  const hasVoted = Boolean(scenarioState.pendingCaravanVote?.votesByPlayerId[actor.id]);
  const isTieVoter = Boolean(scenarioState.pendingCamelTie?.playerIds.includes(actor.id));
  const hasChosenTie = Boolean(scenarioState.pendingCamelTie?.choicesByPlayerId[actor.id]);
  const candidates = getCaravanCamelCandidates(tiles, edges, scenarioState.camelEdgeIds);
  const placeCamel = (edgeId: string) => dispatchGameAction({ type: 'PLACE_CARAVAN_CAMEL', playerId: actor.id, edgeId }, {
    roomId: roomId || undefined,
    isRemote: false,
    myPlayerId: roomId ? myPlayerId : actor.id,
    scenarioState,
    setScenarioState,
    edges,
    setEdges,
    tiles,
    vertices,
    players,
    setPlayers,
    addLog,
  });
  const castVote = () => dispatchGameAction({ type: 'CAST_CARAVAN_VOTE', playerId: actor.id, cards: { SHEEP: sheep, WHEAT: wheat } }, {
    roomId: roomId || undefined, isRemote: false, myPlayerId: roomId ? myPlayerId : actor.id,
    scenarioState, setScenarioState, players, setPlayers, resourceBank, setResourceBank, addLog,
  });
  const chooseTieLocation = (edgeId: string) => dispatchGameAction({ type: 'CHOOSE_CARAVAN_TIE_LOCATION', playerId: actor.id, edgeId }, {
    roomId: roomId || undefined, isRemote: false, myPlayerId: roomId ? myPlayerId : actor.id,
    scenarioState, setScenarioState, edges, setEdges, tiles, vertices, players, setPlayers, addLog,
  });

  return (
    <section className="rounded-2xl border border-amber-500/35 bg-slate-900/90 p-3 text-right shadow-md" dir="rtl">
      <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-amber-300">🐪 נתיב השיירות</span>
        <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-300">{scenarioState.remainingCamels} גמלים</span>
      </div>
      {scenarioState.pendingCaravanVote ? (
        hasVoted ? <p className="text-[10px] text-slate-400">הקול שלך נרשם. ממתינים לשאר השחקנים.</p> : (
          <>
            <p className="mb-2 text-[10px] text-amber-100">הציעו כל מספר של קלפי כבשה וחיטה; ההצעה הגבוהה בוחרת את מיקום הגמל.</p>
            <div className="mb-2 grid grid-cols-2 gap-2 text-center text-[11px]">
              {([
                ['כבשה', sheep, setSheep, actor.resources.SHEEP],
                ['חיטה', wheat, setWheat, actor.resources.WHEAT],
              ] as const).map(([label, value, setValue, available]) => (
                <div key={label} className="rounded-lg border border-slate-700 bg-slate-950/70 p-1.5">
                  <div className="mb-1 text-slate-300">{label}: {value}/{available}</div>
                  <div className="flex justify-center gap-1">
                    <button onClick={() => setValue(Math.max(0, value - 1))} className="rounded bg-slate-700 px-2">−</button>
                    <button onClick={() => setValue(Math.min(available, value + 1))} className="rounded bg-amber-700 px-2">+</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={castVote} className="w-full rounded-lg bg-amber-700 px-2 py-1.5 text-[11px] font-black text-white hover:bg-amber-600">הצבעה ({sheep + wheat} קלפים)</button>
          </>
        )
      ) : isTieVoter ? (
        hasChosenTie ? <p className="text-[10px] text-slate-400">הבחירה שלך נרשמה. ממתינים להסכמה.</p> : (
          <>
            <p className="mb-2 text-[10px] text-amber-100">יש תיקו בהצבעה. בחרו כולם באותו מיקום כדי להציב גמל.</p>
            <div className="grid grid-cols-3 gap-1.5">{candidates.map((edgeId, index) => <button key={edgeId} onClick={() => chooseTieLocation(edgeId)} className="rounded-lg border border-amber-600 bg-amber-950/45 px-2 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/70">מיקום {index + 1}</button>)}</div>
          </>
        )
      ) : isOwner ? (
        <>
          <p className="mb-2 text-[10px] text-amber-100">הבנייה הושלמה — הניחו עכשיו גמל בקצה שיירה או ביציאה פנויה מנווה המדבר.</p>
          <div className="grid grid-cols-3 gap-1.5">
            {candidates.map((edgeId, index) => (
              <button key={edgeId} onClick={() => placeCamel(edgeId)}
                className="rounded-lg border border-amber-600 bg-amber-950/45 px-2 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/70">
                מיקום {index + 1}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[10px] text-slate-400">לאחר בניית יישוב או שדרוג לעיר, השחקן שבנה מציב גמל. יישוב או עיר בין שני גמלים שווים נקודת ניצחון נוספת.</p>
      )}
    </section>
  );
};
