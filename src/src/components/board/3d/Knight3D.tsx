import React from 'react';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { normalizeAndCenterModel } from '../../../utils/hexMath/normalizeModel';
import type { KnightPiece } from '../../../types/citiesKnights.types';

interface ModelWithOutlinesProps {
  object: THREE.Object3D;
  playerColor: string;
  showOutline: boolean;
}

const ModelWithOutlines: React.FC<ModelWithOutlinesProps> = ({ object, playerColor, showOutline }) => {
  const renderNode = (node: THREE.Object3D, index: number): React.ReactNode => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      return (
        <mesh
          key={mesh.uuid || index}
          geometry={mesh.geometry}
          material={mesh.material}
          position={mesh.position}
          rotation={mesh.rotation}
          scale={mesh.scale}
          frustumCulled={false}
        >
          {showOutline && <Outlines color={playerColor} screenspace={false} thickness={0.08} />}
          {mesh.children && mesh.children.length > 0 && mesh.children.map((child, i) => renderNode(child, i))}
        </mesh>
      );
    }

    if (node.children && node.children.length > 0) {
      return (
        <group
          key={node.uuid || index}
          position={node.position}
          rotation={node.rotation}
          scale={node.scale}
        >
          {node.children.map((child, i) => renderNode(child, i))}
        </group>
      );
    }

    return null;
  };

  return (
    <group position={object.position} rotation={object.rotation} scale={object.scale}>
      {object.children.map((child, i) => renderNode(child, i))}
    </group>
  );
};

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
      <ModelWithOutlines object={model} playerColor={playerColor} showOutline={true} />
      {Array.from({ length: knight.level }).map((_, index) => (
        <group
          key={index}
          position={[-0.28 + index * 0.17, 0, 0.34]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ModelWithOutlines object={flag} playerColor={playerColor} showOutline={false} />
        </group>
      ))}
      <pointLight color={playerColor} intensity={knight.active ? 0.35 : 0.08} distance={2} />
    </group>
  );
};

useGLTF.preload('/models/unactiv_knighte.glb');
useGLTF.preload('/models/activ_knighte.glb');
useGLTF.preload('/models/flag.glb');
