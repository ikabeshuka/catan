import React from 'react';

interface Wagon3DProps {
  playerColor: string;
  position?: [number, number, number];
}

export const Wagon3D: React.FC<Wagon3DProps> = ({ playerColor, position = [0, 0, 0] }) => {
  return (
    <group position={position}>
      {/* Body of the wagon */}
      <mesh position={[0, 0, 0.15]}>
        <boxGeometry args={[0.5, 0.3, 0.25]} />
        <meshStandardMaterial color={playerColor} roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Wheels */}
      <mesh position={[-0.18, 0.18, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
        <meshStandardMaterial color="#422e1b" roughness={0.9} />
      </mesh>
      <mesh position={[0.18, 0.18, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
        <meshStandardMaterial color="#422e1b" roughness={0.9} />
      </mesh>
      <mesh position={[-0.18, -0.18, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
        <meshStandardMaterial color="#422e1b" roughness={0.9} />
      </mesh>
      <mesh position={[0.18, -0.18, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
        <meshStandardMaterial color="#422e1b" roughness={0.9} />
      </mesh>
    </group>
  );
};
