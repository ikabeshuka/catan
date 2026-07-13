import React from 'react';
import { Text } from '@react-three/drei';
import { HexTile } from '../../types/hex.types';

interface NumberToken3DProps {
  tile: HexTile;
  tileX: number;
  tileY: number;
  position?: [number, number, number];
  onTileClick: (tile: HexTile) => void;
  onTileHover: (tile: HexTile, x: number, y: number) => void;
  onTileLeave: () => void;
  isSelectableForRobber: (tile: HexTile) => boolean;
  getProbabilityDots3D: (num: number) => string;
}

export const NumberToken3D: React.FC<NumberToken3DProps> = ({
  tile,
  tileX,
  tileY,
  position,
  onTileClick,
  onTileHover,
  onTileLeave,
  isSelectableForRobber,
  getProbabilityDots3D,
}) => {
  if (tile.numberToken === null || tile.numberToken === undefined) return null;

  const isCritical = tile.numberToken === 6 || tile.numberToken === 8;
  const FONT_URL = typeof window !== 'undefined' ? `${window.location.origin}/fonts/Rubik-Bold.ttf` : '/fonts/Rubik-Bold.ttf';

  return (
    <group position={position || [tileX, tileY, 0.77]}>
      <mesh 
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onTileClick(tile);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onTileHover(tile, e.clientX, e.clientY);
          if (isSelectableForRobber(tile)) document.body.style.cursor = 'pointer';
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onTileHover(tile, e.clientX, e.clientY);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onTileLeave();
          document.body.style.cursor = 'default';
        }}
      >
        <cylinderGeometry args={[0.65, 0.65, 0.05, 32]} />
        <meshStandardMaterial 
          color={isCritical ? '#fee2e2' : '#fdfaf2'} 
          roughness={0.6} 
        />
      </mesh>
      <Text
        position={[0, 0.03, 0.04]}
        fontSize={0.58}
        color={isCritical ? '#b91c1c' : '#1e293b'}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
        font={FONT_URL}
        onClick={(e) => {
          e.stopPropagation();
          onTileClick(tile);
        }}
      >
        {tile.numberToken.toString()}
      </Text>
      <Text
        position={[0, -0.34, 0.04]}
        fontSize={0.23}
        color={isCritical ? '#b91c1c' : '#64748b'}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
        font={FONT_URL}
      >
        {getProbabilityDots3D(tile.numberToken)}
      </Text>
    </group>
  );
};
