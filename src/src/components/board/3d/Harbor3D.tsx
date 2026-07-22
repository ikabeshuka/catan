import React, { useRef } from 'react';
import { useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { normalizeAndCenterModel } from '../../../utils/hexMath/normalizeModel';

interface Harbor3DProps {
  vertex: any;
  vx: number;
  vy: number;
  tileX: number;
  tileY: number;
  harborAngle?: number;
  onPointerOver: (e: any) => void;
  onPointerMove: (e: any) => void;
  onPointerOut: () => void;
  onClick: (e: any) => void;
}

export const Harbor3D: React.FC<Harbor3DProps> = ({
  vertex,
  vx,
  vy,
  tileX,
  tileY,
  harborAngle,
  onPointerOver,
  onPointerMove,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const angle = harborAngle !== undefined ? (harborAngle * Math.PI) / 180 : Math.atan2(vy - tileY, vx - tileX);

  const portTextureImage = useTexture('/port.png');

  // טעינת מודל עץ דקל דינמי לחוף
  const { scene: palmScene } = useGLTF('/models/palm_tree.glb');
  
  // שימוש ב-clone כדי למנוע התנגשויות של רכיבי מודל משותפים
  const clonedPalmLeft = React.useMemo(() => {
    return normalizeAndCenterModel(palmScene.clone(), 0.45);
  }, [palmScene]);

  const clonedPalmRight = React.useMemo(() => {
    return normalizeAndCenterModel(palmScene.clone(), 0.35);
  }, [palmScene]);
  
  // Prevent unused variable compilation error
  if (vertex) {
    // Read variable
  }

  return (
    <group 
      ref={groupRef} 
      rotation={[0, 0, angle]}
      scale={[1.2, 1.2, 1.2]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      {/* Elongated bridge/dock represented by the clean transparent port.png texture */}
      <mesh position={[0.4, 0, 0.05]} rotation={[0, 0, -Math.PI / 2]} scale={[1.0, 1.0, 1.0]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshStandardMaterial map={portTextureImage} transparent={true} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Two thin vertical wooden columns/posts entering the water */}
      <mesh position={[0.45, 0.1, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
        <meshStandardMaterial color="#2d1c18" roughness={0.9} />
      </mesh>
      <mesh position={[0.45, -0.1, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
        <meshStandardMaterial color="#2d1c18" roughness={0.9} />
      </mesh>

      {/* עצי דקל קטנים בחוף ליד הנמל */}
      <group position={[-0.15, 0.25, 0.05]}>
        <primitive 
          object={clonedPalmLeft} 
          rotation={[Math.PI / 2, 0, 0]} 
        />
      </group>
      <group position={[-0.15, -0.25, 0.05]}>
        <primitive 
          object={clonedPalmRight} 
          rotation={[Math.PI / 2, 0.1, -0.5]} 
        />
      </group>
    </group>
  );
};

// Preloading for smooth async loading without lag
useGLTF.preload('/models/palm_tree.glb');
