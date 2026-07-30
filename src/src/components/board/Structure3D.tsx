import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Billboard, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { BoardVertex } from '../../types/boardElements.types';
import { normalizeAndCenterModel } from '../../utils/hexMath/normalizeModel';

interface ModelWithOutlinesProps {
  object: THREE.Object3D;
  playerColor: string;
}

const ModelWithOutlines: React.FC<ModelWithOutlinesProps> = ({ object, playerColor }) => {
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
        >
          <Outlines color={playerColor} screenspace={false} thickness={0.08} />
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

interface Structure3DProps {
  vertex: BoardVertex;
  playerColor: string;
  textures: Record<string, THREE.Texture>;
  getVertexConfig: (vertex: BoardVertex) => { isClickable: boolean; isValidPlacement: boolean };
  onVertexClick: (vertex: BoardVertex) => void;
  is3DMode?: boolean;
  onHarborHover?: (harbor: BoardVertex, x: number, y: number) => void;
  onHarborLeave?: () => void;
}

export const Structure3D: React.FC<Structure3DProps> = ({
  vertex,
  playerColor,
  textures,
  getVertexConfig,
  onVertexClick,
  is3DMode = true,
  onHarborHover,
  onHarborLeave,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  // טעינת מודלי ה-GLB
  const { scene: settlementScene } = useGLTF('/models/settlement.glb');
  const { scene: cityScene } = useGLTF('/models/city.glb');

  const isSettlement = vertex.structure === 'SETTLEMENT';
  const activeScene = isSettlement ? settlementScene : cityScene;

  // ביצוע scene.clone() מבוקר כדי למנוע התנגשויות בין שכפולים של מודלים ונרמול מוגדל
  const clonedScene = React.useMemo(() => {
    const clone = activeScene.clone();
    // אל תדרוס את חומרי המודלים בצבע השחקן. השאר את המרקם/טקסטורה המקורית של המודל.
    const targetSize = isSettlement ? 0.9 : 1.3;
    return normalizeAndCenterModel(clone, targetSize);
  }, [activeScene, isSettlement]);

  // מדדי מטרה לאנימציית צמיחה (Scale Animation)
  const targetScale = useRef(0);

  // ברגע שהמבנה נוצר (Mount), נסמן לאנימציה להתחיל לצמוח מאפס ל-1
  useEffect(() => {
    if (vertex.structure !== 'NONE') {
      targetScale.current = 1;
    }
  }, [vertex.structure]);

  // מנוע האנימציות הדינמי למבנים (צמיחה + אפקט ריחוף קל ב-Hover)
  useFrame((state) => {
    const activeRef = is3DMode ? groupRef.current : meshRef.current;
    if (!activeRef) return;

    // 1. אנימציית צמיחה אלסטית (Lerp Scale)
    activeRef.scale.x = THREE.MathUtils.lerp(activeRef.scale.x, targetScale.current, 0.15);
    activeRef.scale.y = THREE.MathUtils.lerp(activeRef.scale.y, targetScale.current, 0.15);
    activeRef.scale.z = THREE.MathUtils.lerp(activeRef.scale.z, targetScale.current, 0.15);

    // 2. אנימציית ריחוף/נשימה עדינה (Hover Bounce)
    if (is3DMode && isHovered && vertex.structure !== 'NONE') {
      const time = state.clock.getElapsedTime();
      // הקפצה קלה של ה-Z (גובה) מעל האדמה בקצב סינוס
      activeRef.position.z = Math.sin(time * 6) * 0.03;
    } else {
      // חזרה לגובה הבסיס התקין (בדיוק על ה-Vertex, ללא Offset מיותר ב-3D)
      activeRef.position.z = THREE.MathUtils.lerp(activeRef.position.z, 0.0, 0.2);
    }
  });

  if (vertex.structure === 'NONE') return null;

  const texture = isSettlement ? textures.settlement : textures.city;
  const size = isSettlement ? 0.8 : 1.4;

  const commonEvents = {
    onClick: (e: any) => {
      e.stopPropagation();
      onVertexClick(vertex);
    },
    onPointerOver: (e: any) => {
      e.stopPropagation();
      const { isClickable } = getVertexConfig(vertex);
      if (isClickable) {
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }
      if (vertex.isHarbor && onHarborHover) {
        onHarborHover(vertex, e.clientX, e.clientY);
      }
    },
    onPointerOut: () => {
      setIsHovered(false);
      document.body.style.cursor = 'default';
      if (vertex.isHarbor && onHarborLeave) {
        onHarborLeave();
      }
    }
  };

  if (!is3DMode) {
    return (
      <Billboard
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <mesh
          ref={meshRef}
          position={[0, 0, 0]}
          scale={[0, 0, 0]}
          renderOrder={10}
          {...commonEvents}
        >
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial 
            map={texture} 
            transparent={true} 
            color={playerColor}
            side={THREE.DoubleSide}
            roughness={0.4}
            depthTest={true}
            depthWrite={true}
          />
        </mesh>
      </Billboard>
    );
  }

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]} // ממורכז בצורה מושלמת על הקודקוד
      scale={[0, 0, 0]}
      {...commonEvents}
    >
      <group rotation={[Math.PI / 2, 0, 0]}>
        <ModelWithOutlines object={clonedScene} playerColor={playerColor} />
      </group>
    </group>
  );
};

// Preloading for smooth async loading without lag
useGLTF.preload('/models/settlement.glb');
useGLTF.preload('/models/city.glb');
