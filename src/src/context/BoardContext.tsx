/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { HexTile } from '../types/hex.types';
import { BoardVertex, BoardEdge } from '../types/boardElements.types';
import { SeafarersScenario } from '../types/game.types';
import { BoardRenderCache, createBoardRenderCache } from '../utils/hexMath/boardRenderCache';
import { CitiesKnightsState, createCitiesKnightsState } from '../types/citiesKnights.types';
import { GameExpansion } from '../config/gameRules';
import { ScenarioState, createScenarioState } from '../types/scenarioState.types';

export interface RobberyState {
  tile: HexTile;
  targets: any[]; // Player[]
}

interface BoardContextType {
  tiles: HexTile[];
  vertices: BoardVertex[];
  edges: BoardEdge[];
  robberyState: RobberyState | null;
  boardType: 'RANDOM' | 'STARTER';
  activeExpansion: GameExpansion;
  selectedScenario: SeafarersScenario;
  activeRobberType: 'ROBBER' | 'PIRATE' | null;
  citiesKnightsState: CitiesKnightsState;
  scenarioState: ScenarioState;
  boardRenderCache: BoardRenderCache;

  setTiles: React.Dispatch<React.SetStateAction<HexTile[]>>;
  setVertices: React.Dispatch<React.SetStateAction<BoardVertex[]>>;
  setEdges: React.Dispatch<React.SetStateAction<BoardEdge[]>>;
  setRobberyState: React.Dispatch<React.SetStateAction<RobberyState | null>>;
  setBoardType: React.Dispatch<React.SetStateAction<'RANDOM' | 'STARTER'>>;
  setActiveExpansion: React.Dispatch<React.SetStateAction<GameExpansion>>;
  setSelectedScenario: React.Dispatch<React.SetStateAction<SeafarersScenario>>;
  setActiveRobberType: React.Dispatch<React.SetStateAction<'ROBBER' | 'PIRATE' | null>>;
  setCitiesKnightsState: React.Dispatch<React.SetStateAction<CitiesKnightsState>>;
  setScenarioState: React.Dispatch<React.SetStateAction<ScenarioState>>;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tiles, setTiles] = useState<HexTile[]>([]);
  const [vertices, setVertices] = useState<BoardVertex[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [robberyState, setRobberyState] = useState<RobberyState | null>(null);
  const [boardType, setBoardType] = useState<'RANDOM' | 'STARTER'>('RANDOM');
  const [activeExpansion, setActiveExpansion] = useState<GameExpansion>('BASE');
  const [selectedScenario, setSelectedScenario] = useState<SeafarersScenario>('HEADING_FOR_NEW_SHORES');
  const [activeRobberType, setActiveRobberType] = useState<'ROBBER' | 'PIRATE' | null>(null);
  const [citiesKnightsState, setCitiesKnightsState] = useState<CitiesKnightsState>(createCitiesKnightsState());
  const [scenarioState, setScenarioState] = useState<ScenarioState>(() => createScenarioState('HEADING_FOR_NEW_SHORES'));
  const boardRenderCache = useMemo(
    () => createBoardRenderCache(tiles, vertices, edges),
    [tiles, vertices, edges]
  );

  return (
    <BoardContext.Provider
      value={{
        tiles,
        vertices,
        edges,
        robberyState,
        boardType,
        activeExpansion,
        selectedScenario,
        activeRobberType,
        citiesKnightsState,
        scenarioState,
        boardRenderCache,
        setTiles,
        setVertices,
        setEdges,
        setRobberyState,
        setBoardType,
        setActiveExpansion,
        setSelectedScenario,
        setActiveRobberType,
        setCitiesKnightsState,
        setScenarioState,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
};
