import type { HexTile } from '../../types/hex.types';

/** The oasis replaces the desert at the centre of the normal Catan board. */
export const applyCaravanRouteTiles = (tiles: HexTile[]): HexTile[] => {
  const center = tiles.find(tile => tile.coord.q === 0 && tile.coord.r === 0 && tile.coord.s === 0);
  if (!center) return tiles;
  const desert = tiles.find(tile => tile.type === 'DESERT');
  if (desert && desert.id !== center.id) {
    const originalCenter = { type: center.type, numberToken: center.numberToken, hasRobber: center.hasRobber };
    center.type = 'DESERT';
    center.numberToken = null;
    center.hasRobber = true;
    desert.type = originalCenter.type;
    desert.numberToken = originalCenter.numberToken;
    desert.hasRobber = originalCenter.hasRobber;
  }
  center.type = 'OASIS';
  center.numberToken = null;
  center.hasRobber = false;
  center.scenarioMarker = { ...center.scenarioMarker, isOasis: true };
  return tiles;
};
