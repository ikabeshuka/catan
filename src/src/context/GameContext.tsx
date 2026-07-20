import React, { ReactNode } from 'react';
import { BoardProvider, useBoard, RobberyState } from './BoardContext';
import { PlayerProvider, usePlayer, GamePhase } from './PlayerContext';
import { GameUIProvider, useGameUI, BuildingToast, ResourceFlow } from './GameUIContext';
import { Player } from '../types/player.types';
import { BoardVertex } from '../types/boardElements.types';
import { HexTile } from '../types/hex.types';
import { cubeToPixel } from '../utils/hexMath/cubeToPixel';

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
  tiles?: HexTile[]
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

  // Calculate victory point bonus for foreign islands
  if (vertices && tiles) {
    const foreignIslandsVisited = new Set<number>();
    
    // Find all settlements and cities belonging to this player
    const playerStructures = vertices.filter(
      v => v.playerId === player.id && (v.structure === 'SETTLEMENT' || v.structure === 'CITY')
    );

    playerStructures.forEach(vertex => {
      // Find bordering tiles for this vertex
      const borderingTiles = tiles.filter(tile => {
        const center = cubeToPixel(tile.coord, 60);
        for (let i = 0; i < 6; i++) {
          const angleRad = (Math.PI / 180) * (60 * i - 30);
          const x = center.x + 60 * Math.cos(angleRad);
          const y = center.y + 60 * Math.sin(angleRad);
          const roundedX = Math.round(x * 10) / 10;
          const roundedY = Math.round(y * 10) / 10;
          const checkId = `v_${roundedX}_${roundedY}`;
          if (checkId === vertex.id) {
            return true;
          }
        }
        return false;
      });

      // Find unique islandIds > 1 bordering this structure
      const structureIslandIds = new Set<number>();
      borderingTiles.forEach(tile => {
        if (tile.islandId !== undefined && tile.islandId > 1) {
          structureIslandIds.add(tile.islandId);
        }
      });

      // Add 2 VP for the first structure on each foreign island
      structureIslandIds.forEach(islandId => {
        if (!foreignIslandsVisited.has(islandId)) {
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
