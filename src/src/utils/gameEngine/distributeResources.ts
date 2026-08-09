import { HexTile } from '../../types/hex.types';
import { BoardVertex } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { ResourceCards } from '../../types/resources.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';
import { GoldSelectionPending } from '../../context/PlayerContext';
import { CommodityCards } from '../../types/citiesKnights.types';
import { isCitiesKnightsExpansion } from '../../config/gameRules';
import { getTileVertexIds } from '../hexMath/boardGeometryHelpers';
import { FishToken, ScenarioState } from '../../types/scenarioState.types';
import { recycleFishTokens } from './fishermenRules';

const HEX_SIZE = 60;
type Resource = keyof ResourceCards;

export interface ResourceFlow {
  id: string;
  resourceType: Resource;
  from: { x: number; y: number };
  playerName: string;
  isHuman: boolean;
  amount: number;
  playerId: string;
  tileCoord?: { q: number; r: number; s: number };
  tileId?: string;
}

interface Claim {
  playerId: string;
  resource: Resource;
  amount: number;
  tile: HexTile;
  vertex: BoardVertex;
  center: { x: number; y: number };
}

/** Distributes a roll while enforcing Catan's finite 19-card resource bank. */
export function distributeResources(
  diceRoll: number,
  tiles: HexTile[],
  vertices: BoardVertex[],
  players: Player[],
  resourceBank: ResourceCards,
  selectedScenario?: string,
  activeExpansion?: string,
  commodityBank?: CommodityCards,
  scenarioState?: ScenarioState,
): {
  updatedPlayers: Player[];
  updatedBank: ResourceCards;
  updatedCommodityBank?: CommodityCards;
  updatedScenarioState?: ScenarioState;
  flows: ResourceFlow[];
  goldSelections: GoldSelectionPending[];
} {
  const updatedPlayers = players.map(player => ({ ...player, resources: { ...player.resources }, commodities: { COIN: 0, PAPER: 0, CLOTH: 0, ...player.commodities } }));
  const updatedBank = { ...resourceBank };
  const updatedCommodityBank = isCitiesKnightsExpansion(activeExpansion)
    ? { COIN: 12, PAPER: 12, CLOTH: 12, ...commodityBank }
    : undefined;
  if (diceRoll === 7) return { updatedPlayers, updatedBank, updatedCommodityBank, updatedScenarioState: scenarioState, flows: [], goldSelections: [] };

  const vertexMap = new Map(vertices.map(vertex => [vertex.id, vertex]));
  const claims: Claim[] = [];
  const commodityClaims: { playerId: string; commodity: keyof CommodityCards }[] = [];
  const goldSelections: GoldSelectionPending[] = [];

  let updatedScenarioState = scenarioState;
  const drawFishToken = (): FishToken | 'OLD_BOOT' | undefined => {
    if (updatedScenarioState?.kind !== 'FISHERMEN_OF_CATAN') return undefined;
    const recycled = recycleFishTokens(updatedScenarioState);
    const [token, ...fishDrawPile] = recycled.fishDrawPile;
    updatedScenarioState = { ...recycled, fishDrawPile };
    return token;
  };

  tiles.filter(tile => {
    const isActivated = 
      tile.numberToken === diceRoll ||
      (tile.numberToken === '2/3' && (diceRoll === 2 || diceRoll === 3)) ||
      (tile.numberToken === '11/12' && (diceRoll === 11 || diceRoll === 12)) ||
      (tile.numberToken === '2/3/11/12' && (diceRoll === 2 || diceRoll === 3 || diceRoll === 11 || diceRoll === 12));

    return isActivated &&
      !tile.hasRobber &&
      !(scenarioState?.kind === 'BARBARIAN_ATTACK' && scenarioState.capturedTileIds.includes(tile.id)) &&
      !(selectedScenario === 'DESERT_DRAGONS' && (tile.scenarioMarker?.dragonIds || []).length > 0) &&
      !(selectedScenario === 'GREAT_CANAL' && tile.scenarioMarker?.infertileField) &&
      !((selectedScenario === 'THE_LOST_TRIBE' || selectedScenario === 'CLOTH_FOR_CATAN') && tile.islandId !== 1);
  }).forEach(tile => {
    const center = cubeToPixel(tile.coord, HEX_SIZE);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI / 180) * (60 * index - 30);
      const vertexId = `v_${Math.round((center.x + HEX_SIZE * Math.cos(angle)) * 10) / 10}_${Math.round((center.y + HEX_SIZE * Math.sin(angle)) * 10) / 10}`;
      const vertex = vertexMap.get(vertexId);
      if (!vertex?.playerId || vertex.structure === 'NONE') continue;
      const amount = vertex.structure === 'CITY' ? 2 : 1;
      
      if (tile.type === 'LAKE' || tile.type === 'FISHING_GROUND') {
        const player = updatedPlayers.find(p => p.id === vertex.playerId);
        if (player) {
          if (!player.fishTokens) player.fishTokens = [];
          if (player.fishCount === undefined) player.fishCount = 0;
          
          for (let i = 0; i < amount; i++) {
            // The official limit is seven fish chits. A future choice prompt
            // handles the optional bank exchange when this limit is reached.
            if (player.fishTokens.length >= 7) continue;
            const token = drawFishToken();
            if (!token) continue;
            if (token === 'OLD_BOOT') {
              player.hasOldBoot = true;
            } else {
              player.fishTokens.push(token);
              player.fishCount = (player.fishCount || 0) + token;
            }
          }
        }
      } else if (tile.type === 'GOLD_FIELD') {
        goldSelections.push({ playerId: vertex.playerId, amount, tileId: tile.id });
      } else if (['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'].includes(tile.type)) {
        const commodity = isCitiesKnightsExpansion(activeExpansion) && vertex.structure === 'CITY'
          ? ({ WOOD: 'PAPER', ORE: 'COIN', SHEEP: 'CLOTH' } as const)[tile.type as 'WOOD' | 'ORE' | 'SHEEP']
          : undefined;
        claims.push({ playerId: vertex.playerId, resource: tile.type as Resource, amount: commodity ? 1 : amount, tile, vertex, center });
        if (commodity) commodityClaims.push({ playerId: vertex.playerId, commodity });
      }
    }
  });
  if (selectedScenario === 'GREAT_CANAL' && diceRoll === 8 && !(scenarioState?.kind === 'GREAT_CANAL' && scenarioState.isCanalComplete)) {
    const minerIds = new Set(vertices.filter(vertex => vertex.knight?.playerId &&
      tiles.some(tile => tile.type === 'GOLD_FIELD' && tile.islandId !== 1 && getTileVertexIds(tile).includes(vertex.id)))
      .map(vertex => vertex.knight!.playerId));
    minerIds.forEach(playerId => goldSelections.push({ playerId, amount: 1, tileId: 'great-canal-gold-miner' }));
  }

  const flows: ResourceFlow[] = [];
  (['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as Resource[]).forEach(resource => {
    const resourceClaims = claims.filter(claim => claim.resource === resource);
    const totalDemand = resourceClaims.reduce((sum, claim) => sum + claim.amount, 0);
    const claimants = new Set(resourceClaims.map(claim => claim.playerId));
    if (totalDemand === 0 || (totalDemand > updatedBank[resource] && claimants.size > 1)) return;

    let available = updatedBank[resource];
    resourceClaims.forEach(claim => {
      const granted = Math.min(claim.amount, available);
      if (granted <= 0) return;
      const player = updatedPlayers.find(candidate => candidate.id === claim.playerId);
      if (!player) return;
      player.resources[resource] += granted;
      available -= granted;
      for (let index = 0; index < granted; index += 1) {
        flows.push({
          id: `flow_${claim.tile.id}_${claim.vertex.id}_${index}_${Date.now()}_${Math.random()}`,
          resourceType: resource,
          from: claim.center,
          playerName: player.name,
          isHuman: !player.isBot,
          amount: 1,
          playerId: player.id,
          tileCoord: claim.tile.coord,
          tileId: claim.tile.id,
        });
      }
    });
    updatedBank[resource] = available;
  });

  if (updatedCommodityBank) {
    (['COIN', 'PAPER', 'CLOTH'] as (keyof CommodityCards)[]).forEach(commodity => {
      const claimsForCommodity = commodityClaims.filter(claim => claim.commodity === commodity);
      const demand = claimsForCommodity.length;
      const claimantCount = new Set(claimsForCommodity.map(claim => claim.playerId)).size;
      if (demand === 0 || (demand > updatedCommodityBank[commodity] && claimantCount > 1)) return;
      let available = updatedCommodityBank[commodity];
      claimsForCommodity.forEach(claim => {
        if (available <= 0) return;
        const player = updatedPlayers.find(candidate => candidate.id === claim.playerId);
        if (!player) return;
        player.commodities![commodity] += 1;
        available -= 1;
      });
      updatedCommodityBank[commodity] = available;
    });
  }

  const combinedGoldSelections = Array.from(
    goldSelections.reduce((byPlayer, selection) => {
      const existing = byPlayer.get(selection.playerId);
      if (existing) {
        existing.amount += selection.amount;
      } else {
        byPlayer.set(selection.playerId, { ...selection });
      }
      return byPlayer;
    }, new Map<string, GoldSelectionPending>()).values()
  );

  return { updatedPlayers, updatedBank, updatedCommodityBank, updatedScenarioState, flows, goldSelections: combinedGoldSelections };
}
