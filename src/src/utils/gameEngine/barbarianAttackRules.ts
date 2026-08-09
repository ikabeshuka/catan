import type { HexTile } from '../../types/hex.types';
import type { BarbarianAttackScenarioState } from '../../types/scenarioState.types';

const distanceToCatan = (tile: HexTile) => Math.abs(tile.coord.q) + Math.abs(tile.coord.r) + Math.abs(tile.coord.s);

/** The fortress is printed at the southwest edge of the published island board. */
export const applyBarbarianAttackTiles = (tiles: HexTile[]): HexTile[] => {
  const fortress = tiles.find(tile => tile.coord.q === -2 && tile.coord.r === 2 && tile.coord.s === 0)
    || tiles.filter(tile => !['WATER', 'SEA', 'FOG'].includes(tile.type)).sort((a, b) => a.coord.q - b.coord.q || b.coord.r - a.coord.r)[0];
  if (fortress) fortress.scenarioMarker = { ...fortress.scenarioMarker, barbarianFortress: true };
  return tiles;
};

export const initializeBarbarianAttack = (state: BarbarianAttackScenarioState, tiles: HexTile[], playerIds: string[]): BarbarianAttackScenarioState => {
  const fortress = tiles.find(tile => tile.scenarioMarker?.barbarianFortress);
  if (!fortress) return state;
  return {
    ...state,
    fortressTileId: fortress.id,
    barbarians: playerIds.map(ownerPlayerId => ({ id: `barbarian-${ownerPlayerId}-1`, ownerPlayerId, tileId: fortress.id })),
    remainingByPlayerId: Object.fromEntries(playerIds.map(playerId => [playerId, 5])),
    capturedTileIds: [],
    knights: [],
    prisonersByPlayerId: Object.fromEntries(playerIds.map(playerId => [playerId, 0])),
  };
};

const isCoastal = (tile: HexTile, tiles: HexTile[]) => distanceToCatan(tile) === Math.max(...tiles.filter(candidate => !['WATER', 'SEA', 'FOG'].includes(candidate.type)).map(distanceToCatan));

/** A settlement or city immediately triggers three distinct non-7 barbarian attacks. */
export const placeBarbarianAttacks = (
  state: BarbarianAttackScenarioState,
  tiles: HexTile[],
  playerId: string,
  rolls: number[],
): BarbarianAttackScenarioState => {
  const remaining = { ...state.remainingByPlayerId };
  const barbarians = [...state.barbarians];
  rolls.forEach(roll => {
    if ((remaining[playerId] || 0) <= 0) return;
    const target = tiles.find(tile => tile.numberToken === roll && isCoastal(tile, tiles) &&
      barbarians.filter(barbarian => barbarian.tileId === tile.id).length < 3);
    if (!target) return;
    const ordinal = 6 - remaining[playerId] + 1;
    remaining[playerId] -= 1;
    barbarians.push({ id: `barbarian-${playerId}-${ordinal}`, ownerPlayerId: playerId, tileId: target.id });
  });
  const capturedTileIds = tiles.filter(tile => barbarians.filter(barbarian => barbarian.tileId === tile.id).length >= 3).map(tile => tile.id);
  return { ...state, remainingByPlayerId: remaining, barbarians, capturedTileIds };
};
