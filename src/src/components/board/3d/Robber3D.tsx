import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Robber3DProps {
  position: [number, number, number];
  tile: any;
  robberTexture: THREE.Texture;
  onTileHover: (tile: any, x: number, y: number) => void;
  onTileLeave: () => void;
}

export const Robber3D: React.FC<Robber3DProps> = ({
  position,
  tile,
  onTileHover,
  onTileLeave,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/robber.glb');

  // ביצוע scene.clone() מבוקר כדי למנוע התנגשויות בין שכפולים של מודלים
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  // הוספת תנועת שוטטות אליפטית/מעגלית איטית סביב מרכז המשושה בתוך useFrame
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    const tileX = position[0];
    const tileY = position[1];
    
    // חישוב המיקום החדש
    groupRef.current.position.x = tileX + Math.sin(time * 1.2) * 0.15;
    groupRef.current.position.y = tileY + Math.cos(time * 1.2) * 0.15;
    // שמירה על הגובה המקורי (Z)
    groupRef.current.position.z = position[2];
  });

  const modelScale = 0.18;

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onTileHover(tile, e.clientX, e.clientY);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onTileLeave();
      }}
    >
      <primitive 
        object={clonedScene} 
        scale={[modelScale, modelScale, modelScale]} 
        rotation={[Math.PI / 2, 0, 0]} 
      />
    </group>
  );
};

// Preloading for smooth async loading without lag
useGLTF.preload('/models/robber.glb');
