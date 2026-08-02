import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameUI } from '../context/GameUIContext';

export const useBoardTextures = (is3DMode: boolean) => {
  const { isAlternativeTheme } = useGameUI();

  // Load element textures
  const textures = useTexture({
    settlement: '/settlement.png',
    city: '/city.png',
    road: '/road.png',
    robber: '/robber.png',
    pirate: '/pirat.jpg',
    WOOD: isAlternativeTheme ? '/wood1.jpg' : '/wood.jpg',
    BRICK: isAlternativeTheme ? '/brick1.jpg' : '/brick.jpg',
    SHEEP: isAlternativeTheme ? '/wool1.jpg' : '/wool.jpg',
    WHEAT: isAlternativeTheme ? '/wheat1.jpg' : '/wheat.png',
    ORE: isAlternativeTheme ? '/rock1.jpg' : '/rock.jpg',
    DESERT: isAlternativeTheme ? '/desert1.jpg' : '/desert.jpg',
    SEA: '/see.jpg',
    WATER: '/see.jpg',
    GOLD_FIELD: '/gold.jpg',
    FOG: '/fog.jpg',
    victory_island: '/victory_island.jpg',
    ship: '/ship.jpg',
    dast: isAlternativeTheme ? '/dast1.jpg' : '/dast.jpg',
  });

  // Configure textures wrapping and sharpness in useMemo
  useMemo(() => {
    const tileTypes = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE', 'DESERT', 'SEA', 'WATER', 'FOG', 'GOLD_FIELD'];
    tileTypes.forEach((type) => {
      const tex = textures[type as keyof typeof textures];
      if (tex) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 16;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.center.set(0.5, 0.5);
        tex.rotation = Math.PI / 2;
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
