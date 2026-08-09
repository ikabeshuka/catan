import React from 'react';
import { Text } from '@react-three/drei';
import { HexTile } from '../../types/hex.types';

interface NumberToken3DProps {
  tile: HexTile;
  value?: number | string;
  clothRemaining?: number;
  tileX: number;
  tileY: number;
  position?: [number, number, number];
  onTileClick: (tile: HexTile) => void;
  onTileHover: (tile: HexTile, x: number, y: number) => void;
  onTileLeave: () => void;
  isSelectableForRobber: (tile: HexTile) => boolean;
  getProbabilityDots3D: (num: number | string) => string;
}

export const NumberToken3D: React.FC<NumberToken3DProps> = ({
  tile,
  value,
  clothRemaining,
  tileX,
  tileY,
  position,
  onTileClick,
  onTileHover,
  onTileLeave,
  isSelectableForRobber,
  getProbabilityDots3D,
}) => {
  const tokenValue = value ?? tile.numberToken;
  if (tokenValue === null || tokenValue === undefined) return null;

  const isCritical = tokenValue === 6 || tokenValue === 8;
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
        {tokenValue.toString()}
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
        {getProbabilityDots3D(tokenValue)}
      </Text>
      {clothRemaining !== undefined && (
        <Text
          position={[0, -0.68, 0.04]}
          fontSize={0.25}
          color="#fef3c7"
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          font={FONT_URL}
        >
          {`🧵 ${clothRemaining}`}
        </Text>
      )}
    </group>
  );
};
