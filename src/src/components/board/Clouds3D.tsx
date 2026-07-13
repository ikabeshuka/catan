import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CloudInfo {
  x: number;
  y: number;
  z: number;
  speed: number;
  scaleX: number;
  scaleY: number;
}

export const Clouds3D: React.FC = () => {
  // Generate 5 clouds with slightly different initial positions, speeds, and sizes
  const cloudsData = useMemo<CloudInfo[]>(() => [
    { x: -20, y: 10, z: 6.5, speed: 0.8, scaleX: 6, scaleY: 3 },
    { x: -10, y: -8, z: 6.5, speed: 1.1, scaleX: 7, scaleY: 3.5 },
    { x: 5, y: 15, z: 6.5, speed: 0.6, scaleX: 5, scaleY: 2.5 },
    { x: 15, y: -12, z: 6.5, speed: 1.3, scaleX: 8, scaleY: 4 },
    { x: 0, y: 2, z: 6.5, speed: 0.9, scaleX: 6.5, scaleY: 3.2 },
  ], []);

  const groupRef = useRef<THREE.Group>(null);

  // Soft fluffy procedural cloud texture using HTML5 Canvas
  const cloudTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 128);
      const drawPuff = (x: number, y: number, r: number) => {
        const gradient = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.75)');
        gradient.addColorStop(0.6, 'rgba(240, 248, 255, 0.35)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      };
      drawPuff(128, 64, 45);
      drawPuff(90, 64, 35);
      drawPuff(166, 64, 35);
      drawPuff(110, 50, 30);
      drawPuff(146, 50, 30);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    groupRef.current.children.forEach((child, index) => {
      const data = cloudsData[index];
      if (child && data) {
        // Move along X
        child.position.x += data.speed * delta;
        
        // If passes x > 25, reset to x = -25 with a random Y coordinate
        if (child.position.x > 25.0) {
          child.position.x = -25.0;
          child.position.y = (Math.random() - 0.5) * 36;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {cloudsData.map((cloud, index) => (
        <mesh 
          key={index} 
          position={[cloud.x, cloud.y, cloud.z]}
        >
          <planeGeometry args={[cloud.scaleX, cloud.scaleY]} />
          <meshBasicMaterial 
            map={cloudTexture} 
            transparent={true} 
            opacity={0.5} 
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};
