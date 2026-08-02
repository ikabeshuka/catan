import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Billboard, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { BoardVertex } from '../../types/boardElements.types';
import { normalizeAndCenterModel } from '../../utils/hexMath/normalizeModel';

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

const PlacedStructure3D: React.FC<Structure3DProps> = ({
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
  const [isAppearanceComplete, setIsAppearanceComplete] = useState(false);

  // טעינת מודלי ה-GLB
  const { scene: settlementScene } = useGLTF('/models/settlement.glb');
  const { scene: cityScene } = useGLTF('/models/city.glb');

  const isSettlement = vertex.structure === 'SETTLEMENT';
  const activeScene = isSettlement ? settlementScene : cityScene;

  // ביצוע scene.clone() מבוקר כדי למנוע התנגשויות בין שכפולים של מודלים ונרמול מוגדל
  const clonedScene = React.useMemo(() => {
    // אל תדרוס את חומרי המודלים בצבע השחקן. השאר את המרקם/טקסטורה המקורית של המודל.
    const targetSize = isSettlement ? 0.9 : 1.3;
    // normalizeAndCenterModel already makes the deep clone required per piece.
    return normalizeAndCenterModel(activeScene, targetSize);
  }, [activeScene, isSettlement]);

  // מדדי מטרה לאנימציית צמיחה (Scale Animation)
  const appearanceProgress = useRef(0);
  const appearanceFinishedRef = useRef(false);

  // ברגע שהמבנה נוצר (Mount), נסמן לאנימציה להתחיל לצמוח מאפס ל-1
  useEffect(() => {
    appearanceProgress.current = 0;
    appearanceFinishedRef.current = false;
    setIsAppearanceComplete(false);
  }, [vertex.id, vertex.structure]);

  // מנוע האנימציות הדינמי למבנים (צמיחה + אפקט ריחוף קל ב-Hover)
  useFrame((state, delta) => {
    const activeRef = is3DMode ? groupRef.current : meshRef.current;
    if (!activeRef) return;

    // 1. אנימציית צמיחה אלסטית (Lerp Scale)
    appearanceProgress.current = Math.min(1, appearanceProgress.current + delta / 0.2);
    const inverseProgress = 1 - appearanceProgress.current;
    const scale = 1 - inverseProgress * inverseProgress * inverseProgress;
    activeRef.scale.setScalar(scale);
    if (appearanceProgress.current === 1 && !appearanceFinishedRef.current) {
      appearanceFinishedRef.current = true;
      setIsAppearanceComplete(true);
    }

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
        <ModelWithOutlines object={clonedScene} playerColor={playerColor} showOutline={isHovered || isAppearanceComplete} />
      </group>
    </group>
  );
};

// Board3DScene keeps a component at every vertex for interaction purposes.
// Empty vertices must not pay for GLTF hooks, cloning, or frame animation.
export const Structure3D: React.FC<Structure3DProps> = (props) => {
  if (props.vertex.structure === 'NONE') return null;
  return <PlacedStructure3D {...props} />;
};

// Preloading for smooth async loading without lag
useGLTF.preload('/models/settlement.glb');
useGLTF.preload('/models/city.glb');
