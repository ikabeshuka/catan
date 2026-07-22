import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { normalizeAndCenterModel } from '../../../utils/hexMath/normalizeModel';

interface SheepGroup3DProps {
  tileX: number;
  tileY: number;
}

export const SheepGroup3D: React.FC<SheepGroup3DProps> = ({ tileX, tileY }) => {
  const { scene } = useGLTF('/models/sheep.glb');
  const groupRef = useRef<THREE.Group>(null);

  // פיזור בשולי האריח ברדיוס 0.8 עד 1.2 כדי לא לכסות את אסימון המספר במרכז
  const sheepList = useMemo(() => {
    return [
      { id: 1, radius: 0.85, baseAngle: 0, speed: 0.15, phase: 0.0 },
      { id: 2, radius: 1.10, baseAngle: (2 * Math.PI) / 3, speed: 0.11, phase: 2.5 },
      { id: 3, radius: 0.95, baseAngle: (4 * Math.PI) / 3, speed: 0.18, phase: 4.8 },
    ].map((s) => ({
      ...s,
      scene: normalizeAndCenterModel(scene.clone(), 0.22),
    }));
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    const children = groupRef.current.children;

    sheepList.forEach((s, idx) => {
      const child = children[idx];
      if (child) {
        // תנועת שוטטות ורעייה דינמית איטית לאורך קשתות מחוץ למרכז
        const angleOffset = Math.sin(time * s.speed + s.phase) * 0.6;
        const currentAngle = s.baseAngle + angleOffset;

        // מיקום X ו-Y מעודכנים לפי זווית ורדיוס
        const x = Math.cos(currentAngle) * s.radius;
        const y = Math.sin(currentAngle) * s.radius;

        child.position.x = tileX + x;
        child.position.y = tileY + y;

        // קצב התקדמות הזווית (נגזרת הזווית ביחס לזמן)
        const angleDot = Math.cos(time * s.speed + s.phase) * s.speed * 0.6;

        // דילוגי רעייה קלים (גובה Z)
        child.position.z = 0.85 + Math.abs(Math.sin(time * 1.5 + s.phase)) * 0.03;

        // התאמת זווית הסיבוב של הכבשה לכיוון התנועה שלה (משיק למעגל בכיוון ההליכה)
        if (Math.abs(angleDot) > 0.001) {
          const movementDirection = angleDot > 0 ? 1 : -1;
          const heading = currentAngle + movementDirection * (Math.PI / 2);
          child.rotation.z = heading;
        } else {
          child.rotation.z = currentAngle + Math.PI / 2;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {sheepList.map((s) => (
        <group
          key={s.id}
          position={[tileX + Math.cos(s.baseAngle) * s.radius, tileY + Math.sin(s.baseAngle) * s.radius, 0.85]}
        >
          <primitive
            object={s.scene}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      ))}
    </group>
  );
};

// Preloading for smooth async loading without lag
useGLTF.preload('/models/sheep.glb');
