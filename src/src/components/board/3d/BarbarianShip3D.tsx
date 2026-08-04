import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { normalizeAndCenterModel } from '../../../utils/hexMath/normalizeModel';

export const BarbarianShip3D: React.FC<{ position: number }> = ({ position }) => {
  const groupRef = React.useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/bararian_ship.glb');
  const model = React.useMemo(() => normalizeAndCenterModel(scene, 1.05), [scene]);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.z = 1.15 + Math.sin(clock.getElapsedTime() * 1.8) * 0.06;
  });
  return (
    <group ref={groupRef} position={[-12 + position * 3.4, 9.2, 1.15]} rotation={[Math.PI / 2, 0, -0.22]}>
      <primitive object={model} />
    </group>
  );
};

useGLTF.preload('/models/bararian_ship.glb');
