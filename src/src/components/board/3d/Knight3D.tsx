import React from 'react';
import { useGLTF } from '@react-three/drei';
import { normalizeAndCenterModel } from '../../../utils/hexMath/normalizeModel';
import type { KnightPiece } from '../../../types/citiesKnights.types';

interface Knight3DProps {
  knight: KnightPiece;
  playerColor: string;
}

export const Knight3D: React.FC<Knight3DProps> = ({ knight, playerColor }) => {
  const { scene: inactiveScene } = useGLTF('/models/unactiv_knighte.glb');
  const { scene: activeScene } = useGLTF('/models/activ_knighte.glb');
  const { scene: flagScene } = useGLTF('/models/flag.glb');
  const model = React.useMemo(() => normalizeAndCenterModel(knight.active ? activeScene : inactiveScene, 0.72), [knight.active, activeScene, inactiveScene]);
  const flag = React.useMemo(() => normalizeAndCenterModel(flagScene, 0.23), [flagScene]);

  return (
    <group position={[0.28, -0.24, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
      <primitive object={model} />
      {Array.from({ length: knight.level }).map((_, index) => (
        <primitive
          key={index}
          object={flag.clone()}
          position={[-0.28 + index * 0.17, 0, 0.34]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}
      <pointLight color={playerColor} intensity={knight.active ? 0.35 : 0.08} distance={2} />
    </group>
  );
};

useGLTF.preload('/models/unactiv_knighte.glb');
useGLTF.preload('/models/activ_knighte.glb');
useGLTF.preload('/models/flag.glb');
