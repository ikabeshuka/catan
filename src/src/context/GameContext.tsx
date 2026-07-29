/* oxlint-disable react/only-export-components */
import React, { ReactNode } from 'react';
import { BoardProvider, useBoard, RobberyState } from './BoardContext';
import { PlayerProvider, usePlayer, GamePhase } from './PlayerContext';
import { GameUIProvider, useGameUI, BuildingToast, ResourceFlow } from './GameUIContext';
import { Player } from '../types/player.types';
import { BoardVertex } from '../types/boardElements.types';
import { HexTile } from '../types/hex.types';
import { getVertexIslandIds } from '../utils/gameEngine/getVertexIslandIds';
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
  if (longestRoadPlayerId === player.id) {
    vp += 2;
  }
  if (largestArmyPlayerId === player.id) {
    vp += 2;
  }
  if (includeHidden) {
    vp += player.developmentCards?.VICTORY_POINT || 0;
  }

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
