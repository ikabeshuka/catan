import React from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

interface Pirate3DProps {
  position: [number, number, number];
  tile: any;
  pirateTexture: THREE.Texture;
  onTileHover: (tile: any, x: number, y: number) => void;
  onTileLeave: () => void;
}

export const Pirate3D: React.FC<Pirate3DProps> = ({
  position,
  tile,
  pirateTexture,
  onTileHover,
  onTileLeave,
}) => {
  return (
    <Billboard position={position}>
      <mesh 
        rotation={[0, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onTileHover(tile, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onTileHover(tile, e.clientX, e.clientY);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onTileLeave();
        }}
      >
        <planeGeometry args={[1.3, 1.95]} />
        <meshStandardMaterial 
          map={pirateTexture} 
          transparent={true} 
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
};
