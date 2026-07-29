import type { HexTile } from '../../types/hex.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';

const HEX_SIZE = 60;

export const getVertexIslandIds = (vertexId: string, tiles: HexTile[]): number[] => {
  const islandIds = new Set<number>();

  tiles.forEach((tile) => {
    if (tile.type === 'WATER' || tile.islandId === undefined) return;

    const center = cubeToPixel(tile.coord, HEX_SIZE);
    for (let corner = 0; corner < 6; corner++) {
      const angleRad = (Math.PI / 180) * (60 * corner - 30);
      const x = Math.round((center.x + HEX_SIZE * Math.cos(angleRad)) * 10) / 10;
      const y = Math.round((center.y + HEX_SIZE * Math.sin(angleRad)) * 10) / 10;

      if (`v_${x}_${y}` === vertexId) {
        islandIds.add(tile.islandId);
        break;
      }
    }
  });

  return [...islandIds];
};
