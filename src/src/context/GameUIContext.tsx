import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { BoardVertex } from '../types/boardElements.types';

export interface BuildingToast {
  type: 'ROAD' | 'SETTLEMENT' | 'CITY' | 'SHIP';
  success: boolean;
  isFree?: boolean;
  errorMessage?: string;
}

export interface ResourceFlow {
  id: string;
  resourceType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
  from: { x: number; y: number };
  playerName: string;
  isHuman: boolean;
  amount: number;
}

interface GameUIContextType {
  is3DMode: boolean;
  buildingToast: BuildingToast | null;
  resourceFlows: ResourceFlow[];
  resourcePosition: 'bottom' | 'right';
  isResourceCollapsed: boolean;
  activePortTrade: BoardVertex | null;
  isRolling: boolean;
  rollValues: { d1: number; d2: number };
  lastRoll: { d1: number; d2: number } | null;
  currentAction: 'BUILD_ROAD' | 'BUILD_SHIP' | 'MOVE_SHIP_SELECT' | 'MOVE_SHIP_PLACE' | null;
  barbarianPositions: any[];
  merchantConvoys: any[];
  isMovingWagon: boolean;

  setIs3DMode: React.Dispatch<React.SetStateAction<boolean>>;
  setBuildingToast: React.Dispatch<React.SetStateAction<BuildingToast | null>>;
  setResourceFlows: React.Dispatch<React.SetStateAction<ResourceFlow[]>>;
  setResourcePosition: React.Dispatch<React.SetStateAction<'bottom' | 'right'>>;
  setIsResourceCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setActivePortTrade: React.Dispatch<React.SetStateAction<BoardVertex | null>>;
  setIsRolling: React.Dispatch<React.SetStateAction<boolean>>;
  setRollValues: React.Dispatch<React.SetStateAction<{ d1: number; d2: number }>>;
  setLastRoll: React.Dispatch<React.SetStateAction<{ d1: number; d2: number } | null>>;
  setCurrentAction: React.Dispatch<React.SetStateAction<'BUILD_ROAD' | 'BUILD_SHIP' | 'MOVE_SHIP_SELECT' | 'MOVE_SHIP_PLACE' | null>>;
  setBarbarianPositions: React.Dispatch<React.SetStateAction<any[]>>;
  setMerchantConvoys: React.Dispatch<React.SetStateAction<any[]>>;
  setIsMovingWagon: React.Dispatch<React.SetStateAction<boolean>>;
  showBuildingCostToast: (type: 'ROAD' | 'SETTLEMENT' | 'CITY' | 'SHIP', success: boolean, isFree?: boolean, errorMessage?: string) => void;
}

const GameUIContext = createContext<GameUIContextType | undefined>(undefined);

export const GameUIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [buildingToast, setBuildingToast] = useState<BuildingToast | null>(null);
  const [resourceFlows, setResourceFlows] = useState<ResourceFlow[]>([]);
  const [resourcePosition, setResourcePosition] = useState<'bottom' | 'right'>('bottom');
  const [isResourceCollapsed, setIsResourceCollapsed] = useState<boolean>(false);
  const [activePortTrade, setActivePortTrade] = useState<BoardVertex | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [rollValues, setRollValues] = useState<{ d1: number; d2: number }>({ d1: 1, d2: 1 });
  const [lastRoll, setLastRoll] = useState<{ d1: number; d2: number } | null>(null);
  const [currentAction, setCurrentAction] = useState<'BUILD_ROAD' | 'BUILD_SHIP' | 'MOVE_SHIP_SELECT' | 'MOVE_SHIP_PLACE' | null>(null);
  const [barbarianPositions, setBarbarianPositions] = useState<any[]>([]);
  const [merchantConvoys, setMerchantConvoys] = useState<any[]>([]);
  const [isMovingWagon, setIsMovingWagon] = useState<boolean>(false);
  const toastTimeoutRef = useRef<any>(null);

  const showBuildingCostToast = (type: 'ROAD' | 'SETTLEMENT' | 'CITY' | 'SHIP', success: boolean, isFree?: boolean, errorMessage?: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setBuildingToast({ type, success, isFree, errorMessage });
    toastTimeoutRef.current = setTimeout(() => {
      setBuildingToast(null);
    }, 4500);
  };

  return (
    <GameUIContext.Provider
      value={{
        is3DMode,
        buildingToast,
        resourceFlows,
        resourcePosition,
        isResourceCollapsed,
        activePortTrade,
        isRolling,
        rollValues,
        lastRoll,
        currentAction,
        barbarianPositions,
        merchantConvoys,
        isMovingWagon,
        setIs3DMode,
        setBuildingToast,
        setResourceFlows,
        setResourcePosition,
        setIsResourceCollapsed,
        setActivePortTrade,
        setIsRolling,
        setRollValues,
        setLastRoll,
        setCurrentAction,
        setBarbarianPositions,
        setMerchantConvoys,
        setIsMovingWagon,
        showBuildingCostToast,
      }}
    >
      {children}
    </GameUIContext.Provider>
  );
};

export const useGameUI = () => {
  const context = useContext(GameUIContext);
  if (!context) {
    throw new Error('useGameUI must be used within a GameUIProvider');
  }
  return context;
};
