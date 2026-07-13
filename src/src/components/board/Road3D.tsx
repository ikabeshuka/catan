import React from 'react';
import { BoardEdge } from '../../types/boardElements.types';
import { cubeToPixel } from '../../utils/hexMath/cubeToPixel';

interface Road3DProps {
  edge: BoardEdge;
  mx: number;
  my: number;
  length: number;
  angle: number;
  playerColor: string;
  currentPlayerColor: string;
  isValidPlacement: boolean;
  onEdgeClick: (edge: BoardEdge) => void;
  tiles: any[];
  z?: number;
  is3DMode?: boolean;
}

export const Road3D: React.FC<Road3DProps> = ({
  edge,
  mx,
  my,
  length,
  angle,
  playerColor,
  currentPlayerColor,
  isValidPlacement,
  onEdgeClick,
  tiles,
  z,
  is3DMode = true,
}) => {
  // Find neighboring tiles to the road (distance < 2.8 units from the road's mid-position)
  const neighbors = (tiles || []).filter((tile) => {
    const center2D = cubeToPixel(tile.coord, 60);
    const tileX = center2D.x * 0.05;
    const tileY = center2D.y * -0.05;
    const dist = Math.sqrt((tileX - mx) ** 2 + (tileY - my) ** 2);
    return dist < 2.8;
  });

  let avgOffset = 0.06;
  if (neighbors.length > 0) {
    const offsets = neighbors.map((tile) => {
      if (tile.type === 'ORE') return 0.35;
      if (tile.type === 'WOOD') return 0.15;
      return 0.06;
    });
    avgOffset = offsets.reduce((sum, val) => sum + val, 0) / offsets.length;
  }
  const roadZ = !is3DMode ? 0.77 : (z !== undefined ? z : 0.85 + avgOffset);

  return (
    <group
      position={[mx, my, roadZ]}
      rotation={[0, 0, angle]}
      visible={edge.hasRoad || isValidPlacement}
    >
      {/* 1. Thin aesthetic visual road component */}
      <mesh>
        <boxGeometry args={[length, 0.15, 0.12]} />
        <meshStandardMaterial
          color={edge.hasRoad ? playerColor : currentPlayerColor}
          roughness={0.5}
          transparent={!edge.hasRoad}
          opacity={edge.hasRoad ? 1.0 : 0.5}
          flatShading={true}
        />
      </mesh>

      {/* 2. Invisible, thicker interactive deep box component to increase click area */}
      <mesh
        position={[0, 0, 0.8]}
        onClick={(e) => {
          e.stopPropagation();
          onEdgeClick(edge);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (isValidPlacement) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[length, 0.5, 2.3]} />
        <meshBasicMaterial
          transparent={true}
          opacity={0.001}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
