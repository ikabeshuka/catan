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
  // Generate 18 clouds with slightly different initial positions, speeds, and sizes
  const cloudsData = useMemo<CloudInfo[]>(() => [
    { x: -35, y: 15, z: 7.5, speed: 0.6, scaleX: 14, scaleY: 7 },
    { x: -20, y: -15, z: 9.2, speed: 1.2, scaleX: 16, scaleY: 8 },
    { x: 10, y: 25, z: 8.0, speed: 0.7, scaleX: 12, scaleY: 6 },
    { x: 30, y: -20, z: 10.5, speed: 1.6, scaleX: 18, scaleY: 9 },
    { x: 0, y: 4, z: 8.8, speed: 1.0, scaleX: 15, scaleY: 7.5 },
    { x: -25, y: -8, z: 7.8, speed: 0.5, scaleX: 11, scaleY: 5.5 },
    { x: -8, y: 20, z: 10.0, speed: 1.4, scaleX: 17, scaleY: 8.5 },
    { x: 18, y: -4, z: 8.3, speed: 0.9, scaleX: 14, scaleY: 7 },
    { x: 35, y: 12, z: 9.6, speed: 1.3, scaleX: 13, scaleY: 6.5 },
    { x: -40, y: -25, z: 9.0, speed: 1.1, scaleX: 16, scaleY: 8 },
    { x: -4, y: -18, z: 10.2, speed: 1.7, scaleX: 19, scaleY: 9.5 },
    { x: -15, y: 30, z: 8.5, speed: 0.8, scaleX: 13, scaleY: 6.5 },
    { x: 25, y: 5, z: 9.0, speed: 1.1, scaleX: 15, scaleY: 7.5 },
    { x: -5, y: -5, z: 7.5, speed: 0.6, scaleX: 12, scaleY: 6 },
    { x: -30, y: 8, z: 8.2, speed: 1.0, scaleX: 14, scaleY: 7 },
    { x: 15, y: -30, z: 9.8, speed: 1.5, scaleX: 17, scaleY: 8.5 },
    { x: 5, y: -10, z: 8.0, speed: 0.7, scaleX: 13, scaleY: 6.5 },
    { x: -18, y: 18, z: 9.5, speed: 1.3, scaleX: 16, scaleY: 8 },
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
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
        gradient.addColorStop(0.6, 'rgba(240, 248, 255, 0.5)');
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
        
        // If passes x > 45, reset to x = -45 with a random Y coordinate
        if (child.position.x > 45.0) {
          child.position.x = -45.0;
          child.position.y = (Math.random() - 0.5) * 60;
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
            opacity={0.82} 
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};
