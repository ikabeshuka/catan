import React, { createContext, useContext, useState, ReactNode } from 'react';
import { HexTile } from '../types/hex.types';
import { BoardVertex, BoardEdge } from '../types/boardElements.types';
import { SeafarersScenario } from '../types/game.types';

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
  activeExpansion: 'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS';
  selectedScenario: SeafarersScenario;
  activeRobberType: 'ROBBER' | 'PIRATE' | null;

  setTiles: React.Dispatch<React.SetStateAction<HexTile[]>>;
  setVertices: React.Dispatch<React.SetStateAction<BoardVertex[]>>;
  setEdges: React.Dispatch<React.SetStateAction<BoardEdge[]>>;
  setRobberyState: React.Dispatch<React.SetStateAction<RobberyState | null>>;
  setBoardType: React.Dispatch<React.SetStateAction<'RANDOM' | 'STARTER'>>;
  setActiveExpansion: React.Dispatch<React.SetStateAction<'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS'>>;
  setSelectedScenario: React.Dispatch<React.SetStateAction<SeafarersScenario>>;
  setActiveRobberType: React.Dispatch<React.SetStateAction<'ROBBER' | 'PIRATE' | null>>;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tiles, setTiles] = useState<HexTile[]>([]);
  const [vertices, setVertices] = useState<BoardVertex[]>([]);
  const [edges, setEdges] = useState<BoardEdge[]>([]);
  const [robberyState, setRobberyState] = useState<RobberyState | null>(null);
  const [boardType, setBoardType] = useState<'RANDOM' | 'STARTER'>('RANDOM');
  const [activeExpansion, setActiveExpansion] = useState<'BASE' | 'MERCHANTS_AND_BARBARIANS' | 'SEAFARERS'>('BASE');
  const [selectedScenario, setSelectedScenario] = useState<SeafarersScenario>('HEADING_FOR_NEW_SHORES');
  const [activeRobberType, setActiveRobberType] = useState<'ROBBER' | 'PIRATE' | null>(null);

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
        setTiles,
        setVertices,
        setEdges,
        setRobberyState,
        setBoardType,
        setActiveExpansion,
        setSelectedScenario,
        setActiveRobberType,
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
