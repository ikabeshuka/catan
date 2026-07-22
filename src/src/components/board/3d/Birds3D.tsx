import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { normalizeAndCenterModel } from '../../../utils/hexMath/normalizeModel';

export const Birds3D: React.FC = () => {
  const { scene } = useGLTF('/models/seagull.glb');
  const groupRef = useRef<THREE.Group>(null);

  const seagullCount = 4;

  // יצירת שכפולים מבוקרים ומנורמלים של השחפים (גודל יעד 0.2)
  const seagulls = useMemo(() => {
    return Array.from({ length: seagullCount }).map((_, i) => ({
      id: i,
      scene: normalizeAndCenterModel(scene, 0.2),
      phase: i * (Math.PI * 2 / seagullCount),
      radius: 6.0 + i * 1.2,
      speed: 0.4 + i * 0.05,
    }));
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const children = groupRef.current.children;

    seagulls.forEach((g, idx) => {
      const child = children[idx];
      if (child) {
        // חישוב הזווית הנוכחית של השחף
        const angle = time * g.speed + g.phase;
        const currentRadius = g.radius + Math.sin(time * 0.3 + idx) * 0.8;

        // חישוב מיקום אליפטי רחב בגובה Z=8.0 מעל מרכז הלוח
        child.position.x = Math.sin(angle) * currentRadius;
        child.position.y = Math.cos(angle) * currentRadius;
        child.position.z = 8.0 + Math.sin(time * 1.5 + idx) * 0.25; // תנודת גובה קלה

        // כיוון הפנים של השחף לכיוון התעופה (משיק למעגל)
        child.rotation.z = -angle + Math.PI; // כיוון סיבוב
        child.rotation.x = Math.PI / 2; // עמידה זקופה
        child.rotation.y = Math.sin(time * 2.0 + idx) * 0.1; // נענוע כנפיים/גוף קל
      }
    });
  });

  return (
    <group ref={groupRef}>
      {seagulls.map((g) => (
        <group key={g.id}>
          <primitive 
            object={g.scene} 
          />
        </group>
      ))}
    </group>
  );
};

// Preloading for smooth async loading without lag
useGLTF.preload('/models/seagull.glb');
