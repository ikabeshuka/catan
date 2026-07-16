import React from 'react';
import { BoardEdge } from '../../types/boardElements.types';
import { cubeToPixel } from '../../utils/hexMath/cubeToPixel';
import { useGame } from '../../context/GameContext';

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
  hasShip?: boolean;
  shipPlayerId?: string;
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
  hasShip,
}) => {
  const { currentAction } = useGame();

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

  const isShipMode = currentAction === 'BUILD_SHIP';

  return (
    <group
      position={[mx, my, roadZ]}
      rotation={[0, 0, angle]}
      visible={edge.hasRoad || edge.hasShip || isValidPlacement}
    >
      {/* 1. Road built mesh */}
      {edge.hasRoad && (
        <mesh>
          <boxGeometry args={[length, 0.15, 0.12]} />
          <meshStandardMaterial
            color={playerColor}
            roughness={0.5}
            flatShading={true}
          />
        </mesh>
      )}

      {/* 2. Ship built mesh */}
      {(edge.hasShip || hasShip) && (
        <group>
          {/* Hull */}
          <mesh>
            <boxGeometry args={[length * 0.7, 0.18, 0.25]} />
            <meshStandardMaterial color={playerColor} />
          </mesh>
          {/* Wooden Mast */}
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.45]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          {/* White Sail */}
          <mesh position={[0.08, 0.28, 0]} rotation={[0, 0, 0.1]}>
            <coneGeometry args={[0.12, 0.35, 4]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      )}

      {/* 3. Placement Preview Hint */}
      {!edge.hasRoad && !edge.hasShip && isValidPlacement && (
        <>
          {isShipMode ? (
            /* Ship Preview Hint */
            <group>
              <mesh position={[0, 0, 0.05]}>
                <boxGeometry args={[length * 0.7, 0.22, 0.15]} />
                <meshStandardMaterial
                  color={currentPlayerColor}
                  roughness={0.5}
                  transparent={true}
                  opacity={0.5}
                  flatShading={true}
                />
              </mesh>
              <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                <meshStandardMaterial
                  color="#4d2c18"
                  transparent={true}
                  opacity={0.5}
                />
              </mesh>
              <mesh position={[0.08, 0, 0.3]} rotation={[0, Math.PI / 6, 0]}>
                <boxGeometry args={[0.15, 0.02, 0.3]} />
                <meshStandardMaterial
                  color="#f8fafc"
                  transparent={true}
                  opacity={0.5}
                />
              </mesh>
            </group>
          ) : (
            /* Road Preview Hint */
            <mesh>
              <boxGeometry args={[length, 0.15, 0.12]} />
              <meshStandardMaterial
                color={currentPlayerColor}
                roughness={0.5}
                transparent={true}
                opacity={0.5}
                flatShading={true}
              />
            </mesh>
          )}
        </>
      )}

      {/* 4. Thicker interactive box to increase click area */}
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
        <boxGeometry args={[length, 0.5, 0.3]} />
        <meshBasicMaterial
          transparent={true}
          opacity={0.001}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
