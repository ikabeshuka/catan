import { HexTile } from '../../types/hex.types';
import { Player } from '../../types/player.types';
import { ResourceCards } from '../../types/resources.types';
import { ScenarioState } from '../../types/scenarioState.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';
import { recycleFishTokens } from './fishermenRules';

const HEX_SIZE = 60;
type Resource = keyof ResourceCards;

/** Grants the second setup settlement's adjacent resources from the bank. */
export function distributeInitialResources(
  vertexId: string,
  tiles: HexTile[],
  players: Player[],
  playerId: string,
  resourceBank: ResourceCards,
  scenarioState?: ScenarioState,
): { updatedPlayers: Player[]; updatedBank: ResourceCards; updatedScenarioState?: ScenarioState } {
  const [, xText, yText] = vertexId.split('_');
  const targetX = Number(xText);
  const targetY = Number(yText);
  const updatedBank = { ...resourceBank };
  const grants: Partial<ResourceCards> = {};
  let updatedScenarioState = scenarioState;
  let fishTokens: number[] | undefined;
  let receivedOldBoot = false;

  tiles.forEach(tile => {
    const center = cubeToPixel(tile.coord, HEX_SIZE);
    const isAdjacent = Array.from({ length: 6 }, (_, index) => {
      const angle = (Math.PI / 180) * (60 * index - 30);
      const x = Math.round((center.x + HEX_SIZE * Math.cos(angle)) * 10) / 10;
      const y = Math.round((center.y + HEX_SIZE * Math.sin(angle)) * 10) / 10;
      return x === targetX && y === targetY;
    }).some(Boolean);
    if (!isAdjacent) return;

    if (['FISHING_GROUND', 'LAKE'].includes(tile.type) && updatedScenarioState?.kind === 'FISHERMEN_OF_CATAN') {
      const player = players.find(candidate => candidate.id === playerId);
      fishTokens ||= [...(player?.fishTokens || [])];
      if (fishTokens.length >= 7) return;
      const recyclable = recycleFishTokens(updatedScenarioState);
      const drawn = recyclable.fishDrawPile[0];
      if (drawn === undefined) return;
      updatedScenarioState = { ...recyclable, fishDrawPile: recyclable.fishDrawPile.slice(1) };
      if (drawn === 'OLD_BOOT') receivedOldBoot = true;
      else fishTokens.push(drawn);
      return;
    }

    if (!['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].includes(tile.type)) return;
    const resource = tile.type as Resource;
    if (updatedBank[resource] > 0) {
      updatedBank[resource] -= 1;
      grants[resource] = (grants[resource] || 0) + 1;
    }
    /*
     * A vertex is adjacent to a tile only once. Keeping this loop-free after
     * the geometry check also makes fishing areas and land hexes behave alike.
     */
  });

  return {
    updatedBank,
    updatedPlayers: players.map(player => {
      if (player.id !== playerId) return player;
      const resources = { ...player.resources };
      (Object.entries(grants) as [Resource, number][]).forEach(([resource, amount]) => {
        resources[resource] += amount;
      });
      return {
        ...player,
        resources,
        ...(fishTokens ? { fishTokens, fishCount: fishTokens.reduce((total, token) => total + token, 0) } : {}),
        ...(receivedOldBoot ? { hasOldBoot: true } : {}),
      };
    }),
    updatedScenarioState,
  };
}
