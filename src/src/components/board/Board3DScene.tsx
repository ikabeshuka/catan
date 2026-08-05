import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { HexTile3D } from './HexTile3D';
import { NumberToken3D } from './NumberToken3D';
import { Road3D } from './Road3D';
import { Structure3D } from './Structure3D';
import { Wagon3D } from './3d/Wagon3D';
import { Robber3D } from './3d/Robber3D';
import { Pirate3D } from './3d/Pirate3D';
import { Harbor3D } from './3d/Harbor3D';
import { Dolphin3D } from './3d/Dolphin3D';
import { SheepGroup3D } from './3d/SheepGroup3D';
import { Birds3D } from './3d/Birds3D';
import { Knight3D } from './3d/Knight3D';
import { BarbarianShip3D } from './3d/BarbarianShip3D';
import { useBoardTextures } from '../../hooks/useBoardTextures';
import { BoardRenderCache } from '../../utils/hexMath/boardRenderCache';
import { getTokenZ, getVertex3DCoords } from '../../utils/hexMath/board3DMath';
import { useGame } from '../../context/GameContext';
import { cubeToPixel } from '../../utils/hexMath/cubeToPixel';

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
  boardRenderCache: BoardRenderCache;
  players: any[];
  currentPlayerIndex: number;
  onTileClick: (tile: any) => void;
  onVertexClick: (vertex: any, event?: any) => void;
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
  activeExpansion?: string;
  citiesKnightsState?: { barbarianPosition?: number };
}

export const Board3DScene: React.FC<Board3DSceneProps> = ({
  boardRenderCache,
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
  activeExpansion,
  citiesKnightsState,
}) => {
  const handleVertexClick = onVertexClick;

  const { tiles, selectedScenario } = useGame();

  const isUnbuildableClothVertex = React.useCallback((vertexId: string) => {
    if (selectedScenario !== 'CLOTH_FOR_CATAN' || !tiles) return false;
    
    const [, xStr, yStr] = vertexId.split('_');
    const vX = parseFloat(xStr);
    const vY = parseFloat(yStr);

    const borderingTiles = tiles.filter((tile) => {
      const center = cubeToPixel(tile.coord, 60);
      for (let i = 0; i < 6; i++) {
        const angleRad = (Math.PI / 180) * (60 * i - 30);
        const x = center.x + 60 * Math.cos(angleRad);
        const y = center.y + 60 * Math.sin(angleRad);
        
        const roundedX = Math.round(x * 10) / 10;
        const roundedY = Math.round(y * 10) / 10;

        if (roundedX === vX && roundedY === vY) {
          return true;
        }
      }
      return false;
    });

    return borderingTiles.some(tile => (tile.lostTribeVillages?.length || 0) > 0);
  }, [selectedScenario, tiles]);

  const { camera } = useThree();
  React.useEffect(() => {
    (window as any).threeCamera = camera;
    return () => {
      delete (window as any).threeCamera;
    };
  }, [camera]);

  // Use the custom hook to load textures and animate sea waves
  const textures = useBoardTextures(is3DMode);

  const edgeSurfaceTextures = React.useMemo(() => {
    const prepareTexture = (source: THREE.Texture) => {
      const texture = source.clone();
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1.65, 1);
      texture.anisotropy = 16;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      return texture;
    };

    return {
      land: prepareTexture(textures.dast),
      sea: prepareTexture(textures.FOG),
    };
  }, [textures.dast, textures.FOG]);

  React.useEffect(() => () => {
    edgeSurfaceTextures.land.dispose();
    edgeSurfaceTextures.sea.dispose();
  }, [edgeSurfaceTextures]);

  const playerById = React.useMemo(
    () => new Map(players.map(player => [player.id, player])),
    [players]
  );

  return (
    <group rotation={[0, 0, 0]}>
      {/* Large peripheral sea ring background */}
      <mesh position={[0, 0, -0.76]}>
        <circleGeometry args={[90.0, 64]} />
        <meshStandardMaterial map={textures.SEA} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Birds floating over the island */}
      {is3DMode && <Birds3D />}
      {activeExpansion === 'CITIES_AND_KNIGHTS' && <BarbarianShip3D position={citiesKnightsState?.barbarianPosition || 0} />}

      {/* Render Hex Tiles */}
      {boardRenderCache.tiles.map(({ tile, position3D, vertexIds }, tileIndex) => {
        if (!tile) return null;
        const tileX = position3D.x;
        const tileY = position3D.y;

        if (tile.isFrameSea) {
          const selectable = isSelectableForRobber(tile);
          return (
            <group key={tile.id} position={[tileX, tileY, 0]}>
              <mesh
                onClick={(event) => {
                  event.stopPropagation();
                  onTileClick(tile);
                }}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  onTileHover(tile, event.clientX, event.clientY);
                  if (selectable) document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(event) => {
                  event.stopPropagation();
                  onTileLeave();
                  document.body.style.cursor = 'default';
                }}
              >
                <circleGeometry args={[2.65, 6]} />
                <meshBasicMaterial
                  color="#38bdf8"
                  transparent
                  opacity={selectable ? 0.12 : 0.001}
                  depthWrite={false}
                />
              </mesh>
              {tile.hasPirate && (
                <Pirate3D
                  position={[0, 0, 0.85]}
                  tile={tile}
                  pirateTexture={textures.pirate}
                  onTileHover={onTileHover}
                  onTileLeave={onTileLeave}
                />
              )}
              {/* Dolphin Group in external frame sea (Only some tiles for better performance) */}
              {is3DMode && (tileIndex % 4 === 0) && (
                <Dolphin3D tileX={0} tileY={0} index={tileIndex} />
              )}
            </group>
          );
        }

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
              position={[tileX, tileY, getTokenZ(tile.type, is3DMode)]}
              onTileClick={onTileClick}
              onTileHover={onTileHover}
              onTileLeave={onTileLeave}
              isSelectableForRobber={isSelectableForRobber}
              getProbabilityDots3D={getProbabilityDots3D}
            />

            {tile.lostTribeVillages?.map(village => {
              const { vx, vy } = getVertex3DCoords(vertexIds[village.vertexIndex]);
              return (
                <NumberToken3D
                  key={village.id}
                  tile={tile}
                  value={village.number}
                  clothRemaining={village.clothRemaining}
                  tileX={vx}
                  tileY={vy}
                  position={[vx, vy, getTokenZ(tile.type, is3DMode) + 0.12]}
                  onTileClick={onTileClick}
                  onTileHover={onTileHover}
                  onTileLeave={onTileLeave}
                  isSelectableForRobber={isSelectableForRobber}
                  getProbabilityDots3D={getProbabilityDots3D}
                />
              );
            })}

            {/* Robber */}
            {tile.hasRobber && (
              <Robber3D
                position={[tileX, tileY, getTokenZ(tile.type, is3DMode) + 0.05]}
                tile={tile}
                robberTexture={textures.robber}
                onTileHover={onTileHover}
                onTileLeave={onTileLeave}
              />
            )}

            {/* Pirate */}
            {tile.hasPirate && (
              <Pirate3D
                position={[tileX, tileY, getTokenZ(tile.type, is3DMode) + 0.05]}
                tile={tile}
                pirateTexture={textures.pirate}
                onTileHover={onTileHover}
                onTileLeave={onTileLeave}
              />
            )}

            {/* Sheep Group on pasture tiles */}
            {is3DMode && tile.type === 'SHEEP' && (
              <SheepGroup3D tileX={tileX} tileY={tileY} />
            )}

            {/* Dolphin Group on inner sea/water tiles (Only some tiles for better performance) */}
            {is3DMode && (tile.type === 'WATER' || tile.type === 'SEA' || tile.type === 'FOG') && (tileIndex % 3 === 0) && (
              <Dolphin3D tileX={tileX} tileY={tileY} index={tileIndex} />
            )}

          </group>
        );
      })}

      {/* Render Edges (Roads) */}
      {boardRenderCache.edges.map((edgeData) => {
        const { edge, center3D, length3D, angleRad3D, usesSeaSurface, borderingTiles } = edgeData;
        if (!edge || !edge.id) return null;

        const builtPlayer = playerById.get(edge.playerId || edge.shipPlayerId);
        const playerColor = builtPlayer?.color || '#ff5722';
        
        const { isValidPlacement } = getEdgeConfig(edge);
        const currentPlayerColor = players[currentPlayerIndex]?.color || '#ffffff';

        // A plane's local +Y is the left side of its direction. Assign each
        // real neighbour to that side; an absent neighbour uses the sea frame.
        let leftNeighborTexture = textures.SEA;
        let rightNeighborTexture = textures.SEA;
        const edgeDirectionX = Math.cos(angleRad3D);
        const edgeDirectionY = Math.sin(angleRad3D);
        borderingTiles.forEach((tile) => {
          const tilePosition = boardRenderCache.tileById.get(tile.id)?.position3D;
          if (!tilePosition) return;

          const relativeX = tilePosition.x - center3D.x;
          const relativeY = tilePosition.y - center3D.y;
          const isOnLeft = edgeDirectionX * relativeY - edgeDirectionY * relativeX >= 0;
          const tileTexture = (textures as Record<string, THREE.Texture>)[tile.type] || textures.SEA;

          if (isOnLeft) {
            leftNeighborTexture = tileTexture;
          } else {
            rightNeighborTexture = tileTexture;
          }
        });

        // Debug console.log for built roads as requested
        // if (edge.hasRoad) {
        //   console.log('[Road Built Debug3D]', {
        //     edgeId: edge.id,
        //     mx,
        //     my,
        //     length,
        //     angle,
        //     playerColor,
        //     isValidPlacement
        //   });
        // }

        // Render road using physical mesh geometry as requested
        return (
          <Road3D
            key={edge.id}
            edge={edge}
            mx={center3D.x}
            my={center3D.y}
            z={0.85}
            length={length3D}
            angle={angleRad3D}
            playerColor={playerColor}
            currentPlayerColor={currentPlayerColor}
            isValidPlacement={isValidPlacement}
            onEdgeClick={onEdgeClick}
            is3DMode={is3DMode}
            hasShip={edge.hasShip}
            surfaceTexture={usesSeaSurface ? edgeSurfaceTextures.sea : edgeSurfaceTextures.land}
            leftNeighborTexture={leftNeighborTexture}
            rightNeighborTexture={rightNeighborTexture}
          />
        );
      })}

      {/* Render Vertices (Settlements / Cities / Harbors) */}
      {boardRenderCache.vertices.map(({ vertex, position3D }) => {
        if (!vertex || !vertex.id) return null;
        if (isUnbuildableClothVertex(vertex.id)) return null;
        if (!boardRenderCache.edgesByVertexId.has(vertex.id)) return null;
        const vx = position3D.x;
        const vy = position3D.y;
        const safeScale3D = SCALE_3D || 0.025;
        const builtPlayer = playerById.get(vertex.playerId);
        const playerColor = builtPlayer?.color || '#ff5722';

        const vertexZ = !is3DMode ? 0.77 : 0.85;

        const currentPlayer = players[currentPlayerIndex];
        const isWagonSelectable = (() => {
          if (!isMovingWagon || !currentPlayer || !currentPlayer.wagonPosition || currentPlayer.wagonPosition === vertex.id) {
            return false;
          }
          const sortedIds = [currentPlayer.wagonPosition, vertex.id].sort();
          const edgeId = `e_${sortedIds[0]}_${sortedIds[1]}`;
          const edge = boardRenderCache.edgeById.get(edgeId)?.edge;
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

            {vertex.pirateFortress && !vertex.pirateFortress.conquered && (
              <group position={[0, 0, 0.18]}>
                {[0, 1, 2].slice(0, vertex.pirateFortress.remainingTokens).map(level => (
                  <mesh key={level} position={[0, 0, level * 0.12]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.34, 0.34, 0.1, 20]} />
                    <meshStandardMaterial color={{ RED: '#dc2626', WHITE: '#f8fafc', BLUE: '#2563eb', ORANGE: '#f97316' }[vertex.pirateFortress!.color]} emissive="#3f1d2e" />
                  </mesh>
                ))}
                <mesh position={[0, 0, 0.48]}>
                  <coneGeometry args={[0.28, 0.45, 4]} />
                  <meshStandardMaterial color="#111827" />
                </mesh>
              </group>
            )}

            {vertex.pirateSettlementTarget && vertex.structure === 'NONE' && (
              <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.29, 0.045, 10, 24]} />
                <meshBasicMaterial color={playerById.get(vertex.pirateSettlementTarget)?.color || '#fbbf24'} transparent opacity={0.9} />
              </mesh>
            )}

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
                onVertexClick(vertex, e);
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
            {vertex.knight && <Knight3D knight={vertex.knight} playerColor={playerColor} />}
          </group>
        );
      })}

      {/* Render Edge Harbors */}
      {boardRenderCache.edges.map((edgeData) => {
        const { edge, center3D, vertexIds, borderingTiles } = edgeData;
        if (!edge || !edge.isHarbor) return null;

        // Geometric center of the two vertices
        const mx = center3D.x;
        const my = center3D.y;
        const mz = !is3DMode ? 0.77 : 0.85;

        // Find the owner tile of this edge - prioritize land tiles (non-WATER) so Harbor3D points outwards
        const ownerTile = borderingTiles.find(tile => tile.type !== 'WATER') || borderingTiles[0];

        const ownerTilePosition = ownerTile
          ? boardRenderCache.tileById.get(ownerTile.id)?.position3D
          : undefined;
        const tileX = ownerTilePosition?.x || 0;
        const tileY = ownerTilePosition?.y || 0;

        // Get one of the connected vertices for tooltips/actions
        const v1Id = vertexIds[0];
        const connectedVertex = boardRenderCache.vertexById.get(v1Id)?.vertex || {
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
              onPointerOut={() => {
                onHarborLeave();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onVertexClick(connectedVertex, e);
              }}
            />
          </group>
        );
      })}
    </group>
  );
};
