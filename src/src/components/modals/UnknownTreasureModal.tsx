import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { dispatchGameAction } from '../../services/gameDispatcher';
import { getTileVertexIds } from '../../utils/hexMath/boardGeometryHelpers';

/** The irrevocable choice made when an Into the Unknown chest is reached. */
export const UnknownTreasureModal: React.FC = () => {
  const {
    scenarioState, setScenarioState, players, currentPlayerIndex, roomId, myPlayerId,
    vertices, edges, tiles, setVertices, setEdges, setTiles, setPlayers, setTurnSubPhase, resourceBank,
    setResourceBank, setGoldSelectionQueue, setRoadBuildingRemaining, devCardDeck,
    setDevCardDeck, citiesKnightsState, setCitiesKnightsState, addLog,
  } = useGame();
  // Keep hooks unconditional: this modal is mounted for the whole game and
  // may legitimately switch between an inactive and an active treasure.
  const [harborType, setHarborType] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('WOOD');
  const [progressTrack, setProgressTrack] = useState<'SCIENCE' | 'POLITICS' | 'TRADE'>('SCIENCE');
  if (scenarioState.kind !== 'INTO_THE_UNKNOWN' || !scenarioState.pendingTreasureId) return null;
  const player = players[currentPlayerIndex];
  const treasureId = scenarioState.pendingTreasureId;
  if (!player || player.isBot || (roomId && player.id !== myPlayerId)) return null;
  const earnsHarbor = (player.keptTreasureTokens || 0) === 1;
  const needsProgressCardChoice = Boolean(citiesKnightsState && scenarioState.treasureDeck?.[0] === 'DEVELOPMENT_CARD');

  const decide = (keep: boolean) => {
    dispatchGameAction({ type: keep ? 'KEEP_TREASURE' : 'CLAIM_TREASURE', playerId: player.id, treasureId,
      ...(keep && earnsHarbor ? { harborType } : {}), ...(!keep ? { mode: 'REVEAL' as const, ...(needsProgressCardChoice ? { progressTrack } : {}) } : {}) }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : player.id,
      players, vertices, edges, tiles, setVertices, setEdges, setPlayers, setTurnSubPhase,
      scenarioState, setScenarioState, resourceBank, setResourceBank, setGoldSelectionQueue,
      setRoadBuildingRemaining, devCardDeck, setDevCardDeck, citiesKnightsState, setCitiesKnightsState, addLog,
    });
    // The scenario explicitly resolves the chest before its adjacent unknown
    // hexes. Revealing here also preserves that order for online action replay.
    const treasureVertexId = vertices.find(vertex => vertex.treasureToken?.id === treasureId)?.id;
    if (treasureVertexId) {
      tiles.filter(tile => tile.type === 'FOG' && getTileVertexIds(tile).includes(treasureVertexId)).forEach(tile => {
        dispatchGameAction({
          type: 'DISCOVER_FOG', playerId: player.id, tileId: tile.id,
          revealedTile: { type: tile.originalType || 'WOOD', numberToken: tile.originalNumberToken ?? null, revealed: true },
        }, {
          roomId: roomId || undefined, isRemote: false, myPlayerId: roomId ? myPlayerId : player.id,
          players, tiles, setTiles, setPlayers, resourceBank, setResourceBank, setGoldSelectionQueue, setTurnSubPhase, addLog,
        });
      });
    }
    setScenarioState(previous => ({ ...previous, pendingTreasureId: undefined }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-amber-400/60 bg-slate-900 p-6 text-right shadow-2xl">
        <div className="mb-3 text-4xl">🧰</div>
        <h2 className="text-xl font-black text-amber-300">מצאת אוצר</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">אפשר לחשוף אותו עכשיו ולקבל תגמול, או לשמור אותו סגור. שמירת אוצר אינה הפיכה: ב־3 אוצרות שמורים תקבל/י נקודת ניצחון, וב־4 תקבל/י שתיים. עד 4 אוצרות שמורים מגנים מפני השלכה עד יותר מ־9 קלפים ומאפשרים נמל מיוחד ב־2 אוצרות.</p>
        {earnsHarbor && <label className="mt-4 block text-sm font-bold text-cyan-200">סוג הנמל המיוחד
          <select value={harborType} onChange={event => setHarborType(event.target.value as typeof harborType)} className="mt-1 w-full rounded bg-slate-950 p-2 text-slate-100">
            <option value="WOOD">עץ 2:1</option><option value="BRICK">לבנים 2:1</option><option value="SHEEP">כבשים 2:1</option><option value="WHEAT">חיטה 2:1</option><option value="ORE">ברזל 2:1</option>
          </select>
        </label>}
        {needsProgressCardChoice && <label className="mt-4 block text-sm font-bold text-violet-200">בחר/י ערימת קלפי קידמה
          <select value={progressTrack} onChange={event => setProgressTrack(event.target.value as typeof progressTrack)} className="mt-1 w-full rounded bg-slate-950 p-2 text-slate-100">
            <option value="SCIENCE">מדע</option><option value="POLITICS">פוליטיקה</option><option value="TRADE">מסחר</option>
          </select>
        </label>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => decide(false)} className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950">לחשוף ולקבל תגמול</button>
          <button type="button" onClick={() => decide(true)} disabled={(player.keptTreasureTokens || 0) >= 4} className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-black text-slate-100 disabled:opacity-40">לשמור סגור</button>
        </div>
      </div>
    </div>
  );
};
