import { BoardVertex } from '../../../types/boardElements.types';
import { HexTile } from '../../../types/hex.types';
import { cubeToPixel } from '../../hexMath/cubeToPixel';

export interface ResourceYields {
  WOOD: number;
  BRICK: number;
  SHEEP: number;
  WHEAT: number;
  ORE: number;
}

export function calculateBotYields(
  botId: string,
  vertices: BoardVertex[],
  tiles: HexTile[],
  ignoreRobber = false
): { yields: ResourceYields; hasPort: boolean } {
  const TOKEN_WEIGHTS_LOCAL: Record<number, number> = {
    2: 1, 12: 1,
    3: 2, 11: 2,
    4: 3, 10: 3,
    5: 4, 9: 4,
    6: 5, 8: 5
  };

  const botVertices = vertices.filter(v => v.playerId === botId);
  const yields: ResourceYields = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 };
  let hasPort = false;

  botVertices.forEach(vertex => {
    if (vertex.isHarbor) {
      hasPort = true;
    }
    tiles.forEach(tile => {
      if (!ignoreRobber && tile.hasRobber) return; // Skip tiles blocked by robber
      const center = cubeToPixel(tile.coord, 60);
      for (let i = 0; i < 6; i++) {
        const angleRad = (Math.PI / 180) * (60 * i - 30);
        const x = center.x + 60 * Math.cos(angleRad);
        const y = center.y + 60 * Math.sin(angleRad);
        const roundedX = Math.round(x * 10) / 10;
        const roundedY = Math.round(y * 10) / 10;
        const checkId = `v_${roundedX}_${roundedY}`;

        if (checkId === vertex.id && tile.type !== 'DESERT' && tile.numberToken !== null) {
          const resourceType = tile.type as keyof ResourceYields;
          yields[resourceType] += TOKEN_WEIGHTS_LOCAL[tile.numberToken] || 0;
        }
      }
    });
  });

  return { yields, hasPort };
}
