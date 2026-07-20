import React from 'react';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

interface Robber3DProps {
  position: [number, number, number];
  tile: any;
  robberTexture: THREE.Texture;
  onTileHover: (tile: any, x: number, y: number) => void;
  onTileLeave: () => void;
}

const removeWhiteBg = (shader: any) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
    #include <map_fragment>
    if (diffuseColor.r > 0.95 && diffuseColor.g > 0.95 && diffuseColor.b > 0.95) {
      discard;
    }
    `
  );
};

export const Robber3D: React.FC<Robber3DProps> = ({
  position,
  tile,
  robberTexture,
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
          map={robberTexture} 
          transparent={true} 
          side={THREE.DoubleSide}
          onBeforeCompile={removeWhiteBg}
        />
      </mesh>
    </Billboard>
  );
};
