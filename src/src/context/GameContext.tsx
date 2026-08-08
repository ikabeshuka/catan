/* oxlint-disable react/only-export-components */
import React, { ReactNode } from 'react';
import { BoardProvider, useBoard, RobberyState } from './BoardContext';
import { PlayerProvider, usePlayer, GamePhase } from './PlayerContext';
import { GameUIProvider, useGameUI, BuildingToast, ResourceFlow } from './GameUIContext';
import { Player } from '../types/player.types';
import { BoardVertex } from '../types/boardElements.types';
import { HexTile } from '../types/hex.types';
import { getVertexIslandIds } from '../utils/gameEngine/getVertexIslandIds';
import { getTileVertexIds } from '../utils/hexMath/boardGeometryHelpers';
import { SeafarersScenario } from '../types/game.types';

// Re-export types for backward compatibility
export type { RobberyState, GamePhase, BuildingToast, ResourceFlow };

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <BoardProvider>
      <PlayerProvider>
        <GameUIProvider>
          {children}
        </GameUIProvider>
      </PlayerProvider>
    </BoardProvider>
  );
};

export const getPlayerTotalVP = (
  player: Player,
  longestRoadPlayerId: string | null,
  largestArmyPlayerId: string | null,
  includeHidden: boolean = false,
  vertices?: BoardVertex[],
  tiles?: HexTile[],
  selectedScenario?: SeafarersScenario
): number => {
  let vp = player.victoryPoints || 0;
  // Cities & Knights replaces both the Longest Road and Largest Army awards
  // with city improvements, progress cards, and Defender of Catan points.
  const disablesTrophies = selectedScenario === 'CLOTH_FOR_CATAN' || selectedScenario === 'PIRATE_ISLANDS' || selectedScenario === 'DESERT_DRAGONS' || Boolean(player.cityImprovements);
  if (!disablesTrophies && longestRoadPlayerId === player.id) {
    vp += 2;
  }
  if (!disablesTrophies && largestArmyPlayerId === player.id) {
    vp += 2;
  }
  if (includeHidden && selectedScenario !== 'PIRATE_ISLANDS' && !player.cityImprovements) {
    vp += player.developmentCards?.VICTORY_POINT || 0;
  }
  if (selectedScenario === 'CLOTH_FOR_CATAN') {
    vp += Math.floor((player.clothRolls || 0) / 2);
  }
  if (selectedScenario === 'DESERT_DRAGONS' && vertices && tiles) {
    vertices.filter(vertex => vertex.playerId === player.id && (vertex.structure === 'SETTLEMENT' || vertex.structure === 'CITY')).forEach(vertex => {
      const adjacentLand = tiles.filter(tile => getTileVertexIds(tile).includes(vertex.id) && tile.type !== 'WATER');
      if (adjacentLand.length > 0 && adjacentLand.every(tile => (tile.scenarioMarker?.dragonIds || []).length > 0)) vp -= 1;
    });
  }
  vp += player.defenderOfCatanPoints || 0;

  // A foreign island is relative to the player's own setup island, not a
  // globally hard-coded island number.
  const foreignIslandBonusScenarios: SeafarersScenario[] = [
    'HEADING_FOR_NEW_SHORES', 'FOUR_ISLANDS', 'THROUGH_THE_DESERT',
  ];
  const homeIslandIds = player.homeIslandIds?.length
    ? player.homeIslandIds
    : player.homeIslandId !== undefined ? [player.homeIslandId] : [];
  if (vertices && tiles && selectedScenario && foreignIslandBonusScenarios.includes(selectedScenario) && homeIslandIds.length > 0) {
    const foreignIslandsVisited = new Set<number>();
    
    // Find all settlements and cities belonging to this player
    const playerStructures = vertices.filter(
      v => v.playerId === player.id && (v.structure === 'SETTLEMENT' || v.structure === 'CITY')
    );

    playerStructures.forEach(vertex => {
      const structureIslandIds = getVertexIslandIds(vertex.id, tiles);
      // Add 2 VP for the first structure on each foreign island
      structureIslandIds.forEach(islandId => {
        if (!homeIslandIds.includes(islandId) && !foreignIslandsVisited.has(islandId)) {
          foreignIslandsVisited.add(islandId);
          vp += 2;
        }
      });
    });
  }

  return vp;
};

// Unified custom hook that aggregates all contexts for backwards compatibility
export const useGame = () => {
  const boardContext = useBoard();
  const playerContext = usePlayer();
  const uiContext = useGameUI();

  return {
    ...boardContext,
    ...playerContext,
    ...uiContext,
  };
};
export default useGame;
