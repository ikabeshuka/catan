import React from 'react';
import { BoardEdge } from '../../types/boardElements.types';
import { useGame } from '../../context/GameContext';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { stretchAndCenterModel } from '../../utils/hexMath/normalizeModel';

interface ModelWithOutlinesProps {
  object: THREE.Object3D;
  playerColor: string;
}

const ModelWithOutlines: React.FC<ModelWithOutlinesProps> = ({ object, playerColor }) => {
  const renderNode = (node: THREE.Object3D, index: number): React.ReactNode => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      return (
        <mesh
          key={mesh.uuid || index}
          geometry={mesh.geometry}
          material={mesh.material}
          position={mesh.position}
          rotation={mesh.rotation}
          scale={mesh.scale}
        >
          <Outlines color={playerColor} screenspace={false} thickness={0.08} />
          {mesh.children && mesh.children.length > 0 && mesh.children.map((child, i) => renderNode(child, i))}
        </mesh>
      );
    }

    if (node.children && node.children.length > 0) {
      return (
        <group
          key={node.uuid || index}
          position={node.position}
          rotation={node.rotation}
          scale={node.scale}
        >
          {node.children.map((child, i) => renderNode(child, i))}
        </group>
      );
    }

    return null;
  };

  return (
    <group position={object.position} rotation={object.rotation} scale={object.scale}>
      {object.children.map((child, i) => renderNode(child, i))}
    </group>
  );
};

interface Road3DProps {
  edge: BoardEdge;
  mx: number;
  my: number;
  length: number;
  angle: number;
  playerColor: string;
  currentPlayerColor: string;
  isValidPlacement: boolean;
  onEdgeClick: (edge: BoardEdge) => void;
  tiles: any[];
  z?: number;
  is3DMode?: boolean;
  hasShip?: boolean;
  shipPlayerId?: string;
}

export const Road3D: React.FC<Road3DProps> = ({
  edge,
  mx,
  my,
  length,
  angle,
  playerColor,
  currentPlayerColor,
  isValidPlacement,
  onEdgeClick,
  tiles: _tiles,
  z: _z,
  is3DMode = true,
  hasShip,
}) => {
  const { currentAction } = useGame();

  // טעינת מודלי GLB
  const { scene: roadScene } = useGLTF('/models/road.glb');
  const { scene: shipScene } = useGLTF('/models/ship.glb');

  // פונקציית עזר ליצירת שכפול מתוח/מנורמל של הסצנה לצלעות (ללא דריסת צבע חומרים)
  const createStretchedClone = React.useCallback((baseScene: THREE.Group, targetX: number, targetY: number, targetZ: number) => {
    const clone = baseScene.clone();
    // שימוש במתיחה ייעודית לפי הצירים (אורך, רוחב, גובה)
    return stretchAndCenterModel(clone, targetX, targetY, targetZ);
  }, []);

  const roadModel = React.useMemo(() => {
    if (edge.hasShip || hasShip || !edge.hasRoad || !is3DMode) return null;
    // מתיחה (Scale) לאורך ציר האורך length * 0.95 ושמירה על דרך מונחת שטוח
    return createStretchedClone(roadScene, length * 0.95, 0.45, 0.3);
  }, [edge.hasRoad, edge.hasShip, hasShip, roadScene, length, is3DMode, createStretchedClone]);

  const shipModel = React.useMemo(() => {
    if ((!edge.hasShip && !hasShip) || !is3DMode) return null;
    return createStretchedClone(shipScene, length * 0.9, 0.45, 0.35);
  }, [edge.hasShip, hasShip, shipScene, length, is3DMode, createStretchedClone]);

  const isShipMode = currentAction === 'BUILD_SHIP' || currentAction === 'MOVE_SHIP_PLACE';

  // תצוגה מקדימה של ספינה - נבנה מודל חצי שקוף
  const shipPreviewModel = React.useMemo(() => {
    if (edge.hasRoad || edge.hasShip || !isValidPlacement || !isShipMode || !is3DMode) return null;
    const clone = shipScene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(m => {
              const newM = m.clone();
              newM.transparent = true;
              newM.opacity = 0.5;
              return newM;
            });
          } else {
            const newM = mesh.material.clone();
            newM.transparent = true;
            newM.opacity = 0.5;
            mesh.material = newM;
          }
        }
      }
    });
    return stretchAndCenterModel(clone, length * 0.9, 0.45, 0.35);
  }, [edge.hasRoad, edge.hasShip, isValidPlacement, isShipMode, shipScene, length, is3DMode]);
  
  // גובה Z מעודכן לפי הדרישות: 0.88 ל-3D, ו-0.77 לדו-מימד
  const roadZ = !is3DMode ? 0.77 : 0.88;

  return (
    <group
      position={[mx, my, roadZ]}
      rotation={[0, 0, angle]}
      visible={edge.hasRoad || edge.hasShip || isValidPlacement}
    >
      {is3DMode ? (
        <>
          {/* מצב תלת-ממדי */}
          {edge.hasRoad && !edge.hasShip && !hasShip && roadModel && (
            <group rotation={[Math.PI / 2, 0, 0]}>
              <ModelWithOutlines object={roadModel} playerColor={playerColor} />
            </group>
          )}

          {(edge.hasShip || hasShip) && shipModel && (
            <group rotation={[Math.PI / 2, 0, 0]}>
              <ModelWithOutlines object={shipModel} playerColor={playerColor} />
            </group>
          )}

          {!edge.hasRoad && !edge.hasShip && isValidPlacement && (
            <>
              {isShipMode ? (
                shipPreviewModel && (
                  <primitive 
                    object={shipPreviewModel} 
                    rotation={[Math.PI / 2, 0, 0]} 
                  />
                )
              ) : (
                /* תצוגה מקדימה לבניית דרך: פס דק ועדין חצי-שקוף בצבע השחקן בלבד */
                <mesh rotation={[0, 0, 0]}>
                  <boxGeometry args={[length * 0.95, 0.08, 0.03]} />
                  <meshStandardMaterial
                    color={currentPlayerColor}
                    transparent={true}
                    opacity={0.5}
                    roughness={0.5}
                  />
                </mesh>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {/* מצב דו-ממדי שטוח מקורי */}
          {edge.hasRoad && (
            <mesh>
              <boxGeometry args={[length, 0.15, 0.12]} />
              <meshStandardMaterial
                color={playerColor}
                roughness={0.5}
                flatShading={true}
              />
            </mesh>
          )}

          {(edge.hasShip || hasShip) && (
            <group>
              {/* Hull */}
              <mesh>
                <boxGeometry args={[length * 0.7, 0.18, 0.25]} />
                <meshStandardMaterial color={playerColor} />
              </mesh>
              {/* Wooden Mast */}
              <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.45]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              {/* White Sail */}
              <mesh position={[0.08, 0.28, 0]} rotation={[0, 0, 0.1]}>
                <coneGeometry args={[0.12, 0.35, 4]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
            </group>
          )}

          {!edge.hasRoad && !edge.hasShip && isValidPlacement && (
            <>
              {isShipMode ? (
                /* Ship Preview Hint */
                <group>
                  <mesh position={[0, 0, 0.05]}>
                    <boxGeometry args={[length * 0.7, 0.22, 0.15]} />
                    <meshStandardMaterial
                      color={currentPlayerColor}
                      roughness={0.5}
                      transparent={true}
                      opacity={0.5}
                      flatShading={true}
                    />
                  </mesh>
                  <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
                    <meshStandardMaterial
                      color="#4d2c18"
                      transparent={true}
                      opacity={0.5}
                    />
                  </mesh>
                  <mesh position={[0.08, 0, 0.3]} rotation={[0, Math.PI / 6, 0]}>
                    <boxGeometry args={[0.15, 0.02, 0.3]} />
                    <meshStandardMaterial
                      color="#f8fafc"
                      transparent={true}
                      opacity={0.5}
                    />
                  </mesh>
                </group>
              ) : (
                /* Road Preview Hint */
                <mesh>
                  <boxGeometry args={[length, 0.15, 0.12]} />
                  <meshStandardMaterial
                    color={currentPlayerColor}
                    roughness={0.5}
                    transparent={true}
                    opacity={0.5}
                    flatShading={true}
                  />
                </mesh>
              )}
            </>
          )}
        </>
      )}

      {/* 4. Thicker interactive box to increase click area */}
      <mesh
        position={[0, 0, 0.8]}
        onClick={(e) => {
          e.stopPropagation();
          onEdgeClick(edge);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (isValidPlacement) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[length, 0.5, 0.3]} />
        <meshBasicMaterial
          transparent={true}
          opacity={0.001}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// Preloading for smooth async loading without lag
useGLTF.preload('/models/road.glb');
useGLTF.preload('/models/ship.glb');
