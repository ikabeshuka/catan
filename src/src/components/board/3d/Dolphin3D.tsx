import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { normalizeAndCenterModel } from '../../../utils/hexMath/normalizeModel';

interface Dolphin3DProps {
  tileX: number;
  tileY: number;
  index: number;
}

export const Dolphin3D: React.FC<Dolphin3DProps> = ({ tileX, tileY, index }) => {
  const { scene } = useGLTF('/models/dolphin.glb');
  const groupRefs = useRef<THREE.Group[]>([]);

  // הגדרת להקה של 4 דולפינים בפיזור קל סביב אריח המים ופאזות שונות
  const dolphins = useMemo(() => [
    { id: 0, phase: index * 1.7 + 0.0, offsetX: -0.4, offsetY: -0.4, scale: 0.35, speed: 1.1 },
    { id: 1, phase: index * 1.7 + 1.2, offsetX: 0.4, offsetY: -0.3, scale: 0.35, speed: 0.95 },
    { id: 2, phase: index * 1.7 + 2.4, offsetX: -0.3, offsetY: 0.4, scale: 0.35, speed: 1.05 },
    { id: 3, phase: index * 1.7 + 3.6, offsetX: 0.3, offsetY: 0.3, scale: 0.35, speed: 0.85 },
  ], [index]);

  // שכפול ונרמול ל-targetSize = 0.35 לכל דולפין
  const clonedScenes = useMemo(() => {
    return dolphins.map(d => {
      const clone = scene.clone();
      return normalizeAndCenterModel(clone, d.scale);
    });
  }, [scene, dolphins]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    dolphins.forEach((d, i) => {
      const ref = groupRefs.current[i];
      if (!ref) return;

      const jumpSpeed = d.speed * 1.5; // מהירות מחזור הקפיצה
      const phaseOffset = d.phase;
      
      // 1. מחזור הקפיצה (מ-0 עד PI)
      const jumpPhase = ((time * jumpSpeed + phaseOffset) % (Math.PI * 2));

      // קפיצה מתרחשת רק בחצי המחזור הראשון (0 עד PI)
      if (jumpPhase < Math.PI) {
        ref.visible = true;

        const maxJumpHeight = 1.0;
        const jumpSpan = 1.6;
        const progress = jumpPhase / Math.PI; // 0 עד 1
        
        // כיוון השחייה האופקית במישור הים (X/Y של האריח)
        const yawAngle = 0.0; // כיוון שחייה לרוחב (ציר ה-X)

        const forwardDist = (progress - 0.5) * jumpSpan;
        const dx = forwardDist * Math.cos(yawAngle);
        const dy = forwardDist * Math.sin(yawAngle);

        ref.position.x = tileX + d.offsetX + dx;
        ref.position.y = tileY + d.offsetY + dy;

        // גובה Z לפי סינוס
        const z = -0.15 + Math.sin(jumpPhase) * maxJumpHeight;
        ref.position.z = z;

        // מהירות אנכית (נגזרת של הסינוס = קוסינוס)
        const vZ = Math.cos(jumpPhase) * maxJumpHeight;
        const vXY = jumpSpan / Math.PI; // מהירות התקדמות אופקית

        // זווית ההטיה (Pitch) - אף עולה ביציאה ואף יורד בצלילה
        const pitchAngle = Math.atan2(vZ, vXY);

        // החלת זווית ה-Pitch וה-Yaw על הצירים המתאימים ביחס לכיוון השחייה
        ref.rotation.z = yawAngle + Math.PI / 2;
        ref.rotation.x = Math.PI / 2 + pitchAngle;
        ref.rotation.y = 0;
      } else {
        // כשהדולפין מתחת למים - הסתר/אפס גובה
        ref.visible = false;
        ref.position.z = -0.2;
      }
    });
  });

  return (
    <group>
      {dolphins.map((d, i) => (
        <group
          key={d.id}
          ref={(el) => {
            if (el) groupRefs.current[i] = el;
          }}
        >
          <primitive object={clonedScenes[i]} rotation={[0, 0, -Math.PI / 2]} />
        </group>
      ))}
    </group>
  );
};

// Preloading for smooth async loading without lag
useGLTF.preload('/models/dolphin.glb');
