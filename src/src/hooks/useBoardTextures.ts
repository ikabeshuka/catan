import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const useBoardTextures = (is3DMode: boolean) => {
  // Load element textures
  const textures = useTexture({
    settlement: '/settlement.png',
    city: '/city.png',
    road: '/road.png',
    robber: '/robber.png',
    pirate: '/pirat.jpg',
    WOOD: '/wood.jpg',
    BRICK: '/brick.jpg',
    SHEEP: '/wool.jpg',
    WHEAT: '/wheat.png',
    ORE: '/rock.jpg',
    DESERT: '/desert.jpg',
    SEA: '/see.jpg',
    WATER: '/see.jpg',
    GOLD_FIELD: '/gold.jpg',
    FOG: '/fog.jpg',
    victory_island: '/victory_island.jpg',
    ship: '/ship.jpg',
    dast: '/dast.png',
  });

  // Configure textures wrapping and sharpness in useMemo
  useMemo(() => {
    const tileTypes = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE', 'DESERT', 'SEA', 'WATER'];
    tileTypes.forEach((type) => {
      const tex = textures[type as keyof typeof textures];
      if (tex) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 16;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
      }
    });
    if (textures.dast) {
      textures.dast.wrapS = THREE.RepeatWrapping;
      textures.dast.wrapT = THREE.RepeatWrapping;
      textures.dast.anisotropy = 16;
      textures.dast.minFilter = THREE.LinearMipmapLinearFilter;
      textures.dast.magFilter = THREE.LinearFilter;
    }
  }, [textures]);

  // Animate sea waves (offset of SEA texture)
  useFrame((state) => {
    if (!is3DMode) return;
    if (textures.SEA) {
      const time = state.clock.getElapsedTime();
      textures.SEA.offset.x = time * 0.012 + Math.sin(time * 0.15) * 0.035;
      textures.SEA.offset.y = Math.cos(time * 0.18) * 0.025;
    }
  });

  return textures;
};
