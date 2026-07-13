import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { BoardVertex } from '../../types/boardElements.types';

interface Structure3DProps {
  vertex: BoardVertex;
  playerColor: string;
  textures: Record<string, THREE.Texture>;
  getVertexConfig: (vertex: BoardVertex) => { isClickable: boolean; isValidPlacement: boolean };
  onVertexClick: (vertex: BoardVertex) => void;
  is3DMode?: boolean;
}

export const Structure3D: React.FC<Structure3DProps> = ({
  vertex,
  playerColor,
  textures,
  getVertexConfig,
  onVertexClick,
  is3DMode = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  
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
    if (!meshRef.current) return;

    // 1. אנימציית צמיחה אלסטית (Lerp Scale)
    meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale.current, 0.15);
    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale.current, 0.15);
    meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale.current, 0.15);

    // 2. אנימציית ריחוף/נשימה עדינה (Hover Bounce)
    if (is3DMode && isHovered && vertex.structure !== 'NONE') {
      const time = state.clock.getElapsedTime();
      // הקפצה קלה של ה-Z (גובה) מעל האדמה בקצב סינוס
      meshRef.current.position.z = 0.15 + Math.sin(time * 6) * 0.03;
    } else {
      // חזרה לגובה הבסיס התקין
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, is3DMode ? 0.15 : 0.0, 0.2);
    }
  });

  if (vertex.structure === 'NONE') return null;

  const isSettlement = vertex.structure === 'SETTLEMENT';
  const texture = isSettlement ? textures.settlement : textures.city;
  const size = isSettlement ? 0.8 : 1.4; // עיר גדולה ובולטת בהרבה מהיישוב

  return (
    /* Billboard דואג שהציור הדו-ממדי יסתובב אוטומטית ויביט תמיד אל המצלמה */
    <Billboard
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
    >
      <mesh
        ref={meshRef}
        position={[0, 0, is3DMode ? 0.15 : 0.0]}
        scale={[0, 0, 0]} // מתחיל מאפס בשביל אנימציית הצמיחה
        onClick={(e) => {
          e.stopPropagation();
          onVertexClick(vertex);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          const { isClickable } = getVertexConfig(vertex);
          if (isClickable) {
            setIsHovered(true);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          setIsHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial 
          map={texture} 
          transparent={true} 
          color={playerColor}
          side={THREE.DoubleSide}
          roughness={0.4}
        />
      </mesh>
    </Billboard>
  );
};