import * as THREE from 'three';

export function normalizeAndCenterModel(scene: THREE.Group, targetSize: number) {
  const cloned = scene.clone(true);
  const box = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();
  box.getSize(size);
  
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scaleFactor = targetSize / maxDim;
    cloned.scale.set(scaleFactor, scaleFactor, scaleFactor);
  }
  
  // Recalculate box after scaling to center bottom
  const scaledBox = new THREE.Box3().setFromObject(cloned);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  
  cloned.position.x -= center.x;
  cloned.position.y = -scaledBox.min.y; // Align bottom to Y = 0
  cloned.position.z -= center.z; // Center Z
  
  return cloned;
}

export function stretchAndCenterModel(scene: THREE.Group, targetX: number, targetY: number, targetZ: number) {
  const cloned = scene.clone(true);
  const box = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();
  box.getSize(size);

  const sX = targetX / (size.x || 1);
  const sY = targetY / (size.y || 1);
  const sZ = targetZ / (size.z || 1);
  cloned.scale.set(sX, sY, sZ);

  const scaledBox = new THREE.Box3().setFromObject(cloned);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  
  cloned.position.x -= center.x;
  cloned.position.y = -scaledBox.min.y; // Align bottom to Y = 0
  cloned.position.z -= center.z; // Center Z

  return cloned;
}
