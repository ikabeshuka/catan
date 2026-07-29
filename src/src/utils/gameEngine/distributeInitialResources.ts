import { HexTile } from '../../types/hex.types';
import { Player } from '../../types/player.types';
import { ResourceCards } from '../../types/resources.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';

const HEX_SIZE = 60;
type Resource = keyof ResourceCards;

/** Grants the second setup settlement's adjacent resources from the bank. */
export function distributeInitialResources(
  vertexId: string,
  tiles: HexTile[],
  players: Player[],
  playerId: string,
  resourceBank: ResourceCards,
): { updatedPlayers: Player[]; updatedBank: ResourceCards } {
  const [, xText, yText] = vertexId.split('_');
  const targetX = Number(xText);
  const targetY = Number(yText);
  const updatedBank = { ...resourceBank };
  const grants: Partial<ResourceCards> = {};

  tiles.forEach(tile => {
    if (!['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].includes(tile.type)) return;
    const center = cubeToPixel(tile.coord, HEX_SIZE);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI / 180) * (60 * index - 30);
      const x = Math.round((center.x + HEX_SIZE * Math.cos(angle)) * 10) / 10;
      const y = Math.round((center.y + HEX_SIZE * Math.sin(angle)) * 10) / 10;
      if (x === targetX && y === targetY) {
        const resource = tile.type as Resource;
        if (updatedBank[resource] > 0) {
          updatedBank[resource] -= 1;
          grants[resource] = (grants[resource] || 0) + 1;
        }
        break;
      }
    }
  });

  return {
    updatedBank,
    updatedPlayers: players.map(player => {
      if (player.id !== playerId) return player;
      const resources = { ...player.resources };
      (Object.entries(grants) as [Resource, number][]).forEach(([resource, amount]) => {
        resources[resource] += amount;
      });
      return { ...player, resources };
    }),
  };
}
