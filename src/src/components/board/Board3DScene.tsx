import React from 'react';
import * as THREE from 'three';
import { HexTile3D } from './HexTile3D';
import { NumberToken3D } from './NumberToken3D';
import { Clouds3D } from './Clouds3D';
import { Road3D } from './Road3D';
import { Structure3D } from './Structure3D';
import { Wagon3D } from './3d/Wagon3D';
import { Robber3D } from './3d/Robber3D';
import { Pirate3D } from './3d/Pirate3D';
import { Harbor3D } from './3d/Harbor3D';
import { Birds3D } from './3d/Birds3D';
import { SheepGroup3D } from './3d/SheepGroup3D';
import { Dolphin3D } from './3d/Dolphin3D';
import { parseVertexId } from '../../utils/hexMath/parseVertexId';
import { parseEdgeId } from '../../utils/hexMath/parseEdgeId';
import { cubeToPixel } from '../../utils/hexMath/cubeToPixel';
import { getTileEdgeIds } from '../../utils/gameEngine/generateEdges';
import { useBoardTextures } from '../../hooks/useBoardTextures';

const HEX_SIZE_2D = 60; // Base size for 2D calculations, remains consistent
const HEX_HEIGHT_3D = 3.0; // Visual height for 3D hexes
const SCALE_3D = (HEX_HEIGHT_3D / 2) / HEX_SIZE_2D; // Scaling factor from 2D pixel to 3D unit

function getProbabilityDots3D(num: number): string {
  const dotsMap: Record<number, string> = {
    2: '.', 12: '.',
    3: '..', 11: '..',
    4: '...', 10: '...',
    5: '....', 9: '....',
    6: '.....', 8: '.....'
  };
  return dotsMap[num] || '';
}

interface Board3DSceneProps {
  tiles: any[];
  vertices: any[];
  edges: any[];
  players: any[];
  currentPlayerIndex: number;
  onTileClick: (tile: any) => void;
  onVertexClick: (vertex: any) => void;
  onEdgeClick: (edge: any) => void;
  onTileHover: (tile: any, x: number, y: number) => void;
  onTileLeave: () => void;
  onHarborHover: (harbor: any, x: number, y: number) => void;
  onHarborLeave: () => void;
  is3DMode: boolean;
  isMovingWagon?: boolean;
  getVertexConfig: (vertex: any) => any;
  getEdgeConfig: (edge: any) => any;
  isSelectableForRobber: (tile: any) => boolean;
}

export const Board3DScene: React.FC<Board3DSceneProps> = ({
  tiles,
  vertices,
  edges,
  players,
  currentPlayerIndex,
  onTileClick,
  onVertexClick,
  onEdgeClick,
  onTileHover,
  onTileLeave,
  onHarborHover,
  onHarborLeave,
  is3DMode,
  isMovingWagon = false,
  getVertexConfig,
  getEdgeConfig,
  isSelectableForRobber,
}) => {
  const handleVertexClick = onVertexClick;

  const outerSeaDolphinLocations = React.useMemo(() => {
    // Generate 10 outer sea pod locations deterministically
    const pods = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count + (i * 0.15); // distribute around circle with slight offset
      const radius = 17 + (i * 1.7) % 18; // radius between 17 and 35
      const tileX = Math.cos(angle) * radius;
      const tileY = Math.sin(angle) * radius;
      pods.push({ tileX, tileY, index: 1000 + i });
    }
    return pods;
  }, []);

  // Use the custom hook to load textures and animate sea waves
  const textures = useBoardTextures(is3DMode);

  return (
    <group rotation={[0, 0, 0]}>
      {/* Dynamic cyclic clouds system on the GPU/3D */}
      {is3DMode && <Clouds3D />}
      {is3DMode && <Birds3D />}

      {/* Large peripheral sea ring background */}
      <mesh position={[0, 0, -0.76]}>
        <circleGeometry args={[90.0, 64]} />
        <meshStandardMaterial map={textures.SEA} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer Sea Dolphins */}
      {is3DMode && outerSeaDolphinLocations.map((pod) => (
        <Dolphin3D
          key={`outer-dolphin-${pod.index}`}
          tileX={pod.tileX}
          tileY={pod.tileY}
          index={pod.index}
        />
      ))}

      {/* Render Hex Tiles */}
      {tiles.map((tile, tileIdx) => {
        if (!tile) return null;
        // Pointy-top hex grid math with zero spacing and exact dimensions:
        const center2D = cubeToPixel(tile.coord, 60);
        const tileX = center2D.x * 0.05;
        const tileY = center2D.y * -0.05;

        const getTokenZ = (type: string) => {
          if (!is3DMode) return 0.76; // Flat on the surface
          switch (type) {
            case 'ORE': return 3.12;    // מעט מעל פסגת ההר שגובהה ~3.06
            case 'BRICK': return 0.32;  // גובה בטוח מעל קרקעית המכתש שנחפרת ל-0.25
            case 'SHEEP': return 0.95;  // מעט מעל הגבעה העדינה של המרעה
            case 'WHEAT': return 0.87;  // מעל תלמי החיטה
            case 'WOOD': return 0.85;   // מעל פני שטח היער
            default: return 0.80;       // גובה ברירת מחדל לאריחים שטוחים
          }
        };

        return (
          <group key={tile.id}>
            <HexTile3D
              tile={tile}
              tileX={tileX}
              tileY={tileY}
              textures={textures}
              onTileClick={onTileClick}
              onTileHover={onTileHover}
              onTileLeave={onTileLeave}
              isSelectableForRobber={isSelectableForRobber}
              is3DMode={is3DMode}
            />

            {/* Number Token */}
            <NumberToken3D
              tile={tile}
              tileX={tileX}
              tileY={tileY}
              position={[tileX, tileY, getTokenZ(tile.type)]}
              onTileClick={onTileClick}
              onTileHover={onTileHover}
              onTileLeave={onTileLeave}
              isSelectableForRobber={isSelectableForRobber}
              getProbabilityDots3D={getProbabilityDots3D}
            />

            {/* Robber */}
            {tile.hasRobber && (
              <Robber3D
                position={[tileX, tileY, getTokenZ(tile.type) + 0.05]}
                tile={tile}
                robberTexture={textures.robber}
                onTileHover={onTileHover}
                onTileLeave={onTileLeave}
              />
            )}

            {/* Pirate */}
            {tile.hasPirate && (
              <Pirate3D
                position={[tileX, tileY, getTokenZ(tile.type) + 0.05]}
                tile={tile}
                pirateTexture={textures.pirate}
                onTileHover={onTileHover}
                onTileLeave={onTileLeave}
              />
            )}

            {/* Sheep Group (for SHEEP tiles) */}
            {is3DMode && tile.type === 'SHEEP' && (
              <SheepGroup3D tileX={tileX} tileY={tileY} />
            )}

            {/* Jumping Dolphins (for WATER/SEA tiles) */}
            {is3DMode && (tile.type === 'WATER' || tile.type === 'SEA') && (
              <Dolphin3D tileX={tileX} tileY={tileY} index={tileIdx} />
            )}
          </group>
        );
      })}

      {/* Render Edges (Roads) */}
      {edges.map((edge) => {
        if (!edge || !edge.id) return null;
        const { x1, y1, x2, y2 } = parseEdgeId(edge.id);
        const mx = ((x1 + x2) / 2) * 0.05;
        const my = ((y1 + y2) / 2) * -0.05;

        const dx = (x2 - x1) * 0.05;
        const dy = (y2 - y1) * -0.05;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const builtPlayer = players.find(p => p.id === edge.playerId || p.id === edge.shipPlayerId);
        const playerColor = builtPlayer?.color || '#ff5722';
        
        const { isValidPlacement } = getEdgeConfig(edge);
        const currentPlayerColor = players[currentPlayerIndex]?.color || '#ffffff';

        // Debug console.log for built roads as requested
        if (edge.hasRoad) {
          console.log('[Road Built Debug3D]', {
            edgeId: edge.id,
            mx,
            my,
            length,
            angle,
            playerColor,
            isValidPlacement
          });
        }

        // Render road using physical mesh geometry as requested
        return (
          <Road3D
            key={edge.id}
            edge={edge}
            mx={mx}
            my={my}
            z={0.85}
            length={length}
            angle={angle}
            playerColor={playerColor}
            currentPlayerColor={currentPlayerColor}
            isValidPlacement={isValidPlacement}
            onEdgeClick={onEdgeClick}
            tiles={tiles}
            is3DMode={is3DMode}
            hasShip={edge.hasShip}
            shipPlayerId={edge.shipPlayerId}
          />
        );
      })}

      {/* Render Vertices (Settlements / Cities / Harbors) */}
      {vertices.map((vertex) => {
        if (!vertex || !vertex.id) return null;
        const { x, y } = parseVertexId(vertex.id);
        const vx = x * 0.05;
        const vy = y * -0.05;
        const safeScale3D = SCALE_3D || 0.025;
        const builtPlayer = players.find(p => p.id === vertex.playerId);
        const playerColor = builtPlayer?.color || '#ff5722';

        const vertexZ = !is3DMode ? 0.77 : 0.85;

        const currentPlayer = players[currentPlayerIndex];
        const isWagonSelectable = (() => {
          if (!isMovingWagon || !currentPlayer || !currentPlayer.wagonPosition || currentPlayer.wagonPosition === vertex.id) {
            return false;
          }
          const sortedIds = [currentPlayer.wagonPosition, vertex.id].sort();
          const edgeId = `e_${sortedIds[0]}_${sortedIds[1]}`;
          const edge = edges.find(e => e.id === edgeId);
          if (!edge) return false;
          const isOwner = edge.hasRoad && edge.playerId === currentPlayer.id;
          const cost = isOwner ? 1 : 2;
          const remainingPoints = currentPlayer.remainingMovementPoints !== undefined ? currentPlayer.remainingMovementPoints : 4;
          return remainingPoints >= cost;
        })();

        const playersWithWagons = players.filter(p => p.wagonPosition === vertex.id);

        return (
          <group key={vertex.id} position={[vx, vy, vertexZ]}>
            {/* Glow Indicator for Wagon Movement */}
            {isWagonSelectable && (
              <mesh position={[0, 0, 0.25]}>
                <torusGeometry args={[0.55, 0.09, 8, 24]} />
                <meshBasicMaterial color="#ffcc00" transparent={true} opacity={0.8} />
              </mesh>
            )}

            {/* Render Wagons on this vertex */}
            {playersWithWagons.map((p, idx) => (
              <Wagon3D 
                key={p.id} 
                playerColor={p.color} 
                position={[idx * 0.15, idx * 0.15, 0.2]} 
              />
            ))}

            {/* Visual element for unoccupied vertices */}
            {vertex.structure === 'NONE' && (
              <mesh
                position={[0, 0, 0.5 * safeScale3D]} // Slightly lift the sphere to be visible on the surface
              >
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial 
                  color={getVertexConfig(vertex).isValidPlacement ? players[currentPlayerIndex]?.color || '#ffffff' : '#ffffff'} 
                  opacity={getVertexConfig(vertex).isValidPlacement ? 0.6 : 0.25} 
                />
              </mesh>
            )}

            {/* Invisible vertex collider pillar (Hitbox) */}
            <mesh
              position={[0, 0, 0.9]}
              rotation={[Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onVertexClick(vertex);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                const { isClickable } = getVertexConfig(vertex);
                if (isClickable || isWagonSelectable) {
                  document.body.style.cursor = 'pointer';
                }
                if (vertex.isHarbor) {
                  onHarborHover(vertex, e.clientX, e.clientY);
                }
              }}
              onPointerMove={(e) => {
                e.stopPropagation();
                if (vertex.isHarbor) {
                  onHarborHover(vertex, e.clientX, e.clientY);
                }
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
                if (vertex.isHarbor) {
                  onHarborLeave();
                }
              }}
            >
              <cylinderGeometry args={[0.35, 0.35, 2.5, 8]} />
              <meshBasicMaterial transparent={true} opacity={0.001} depthWrite={false} />
            </mesh>

            <Structure3D
              vertex={vertex}
              playerColor={playerColor}
              textures={textures}
              getVertexConfig={getVertexConfig}
              onVertexClick={handleVertexClick}
              is3DMode={is3DMode}
              onHarborHover={onHarborHover}
              onHarborLeave={onHarborLeave}
            />
          </group>
        );
      })}

      {/* Render Edge Harbors */}
      {edges.map((edge) => {
        if (!edge || !edge.isHarbor) return null;
        
        const { x1, y1, x2, y2 } = parseEdgeId(edge.id);
        const vx1 = x1 * 0.05;
        const vy1 = y1 * -0.05;
        const vx2 = x2 * 0.05;
        const vy2 = y2 * -0.05;

        // Geometric center of the two vertices
        const mx = (vx1 + vx2) / 2;
        const my = (vy1 + vy2) / 2;
        const mz = !is3DMode ? 0.77 : 0.85;

        // Find the owner tile of this edge - prioritize land tiles (non-WATER) so Harbor3D points outwards
        const ownerTile = tiles.find(tile => {
          if (tile.type === 'WATER') return false;
          const edgeIds = getTileEdgeIds(tile);
          return edgeIds.includes(edge.id);
        }) || tiles.find(tile => {
          const edgeIds = getTileEdgeIds(tile);
          return edgeIds.includes(edge.id);
        });

        let tileX = 0;
        let tileY = 0;
        if (ownerTile) {
          const center2D = cubeToPixel(ownerTile.coord, 60);
          tileX = center2D.x * 0.05;
          tileY = center2D.y * -0.05;
        }

        // Get one of the connected vertices for tooltips/actions
        const v1Id = `v_${x1}_${y1}`;
        const connectedVertex = vertices.find(v => v.id === v1Id) || {
          id: v1Id,
          isHarbor: true,
          harborType: edge.harborType
        };

        return (
          <group key={`harbor_${edge.id}`} position={[mx, my, mz]}>
            <Harbor3D
              vertex={connectedVertex}
              vx={mx}
              vy={my}
              tileX={tileX}
              tileY={tileY}
              harborAngle={edge.harborAngle}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHarborHover(connectedVertex, e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                e.stopPropagation();
                onHarborHover(connectedVertex, e.clientX, e.clientY);
              }}
              onPointerOut={() => {
                onHarborLeave();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onVertexClick(connectedVertex);
              }}
            />
          </group>
        );
      })}
    </group>
  );
};
