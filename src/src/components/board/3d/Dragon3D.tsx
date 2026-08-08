import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Dragon3DProps {
  position: [number, number, number];
  /** A desert may hold a small stack; the model shows up to three clearly. */
  count?: number;
  strength?: 1 | 2 | 3;
}

export const Dragon3D: React.FC<Dragon3DProps> = ({ position, count = 1, strength }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/dragon.glb');
  const dragons = useMemo(
    () => Array.from({ length: Math.min(3, Math.max(1, count)) }, () => scene.clone()),
    [count, scene],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    groupRef.current.rotation.z = Math.sin(time * 0.65) * 0.1;
    groupRef.current.position.z = position[2] + Math.sin(time * 1.1) * 0.06;
  });

  return (
    <group ref={groupRef} position={position} rotation={[Math.PI / 2, 0, Math.PI * 0.15]}>
      {dragons.map((dragon, index) => (
        <primitive
          key={index}
          object={dragon}
          position={[(index - (dragons.length - 1) / 2) * 0.28, index % 2 ? 0.16 : -0.06, index * 0.05]}
          scale={[0.13, 0.13, 0.13]}
        />
      ))}
      {strength && (
        <mesh position={[0.34, -0.24, 0.18]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" emissive="#7c2d12" emissiveIntensity={0.55} />
        </mesh>
      )}
    </group>
  );
};

useGLTF.preload('/models/dragon.glb');
