import React, { Suspense, useState, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { HexTile3D } from './HexTile3D';
import { NumberToken3D } from './NumberToken3D';
import { Clouds3D } from './Clouds3D';
import { Road3D } from './Road3D';
import { Structure3D } from './Structure3D';
import { WoodIcon, BrickIcon, SheepIcon, WheatIcon, OreIcon } from '../common/Icons';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { parseVertexId } from '../../utils/hexMath/parseVertexId';
import { parseEdgeId } from '../../utils/hexMath/parseEdgeId';
import { useTurnManager } from '../../hooks/useTurnManager';
import { moveRobber } from '../../utils/gameEngine/moveRobber';
import { getEligibleRobberyTargets } from '../../utils/gameEngine/robberSteal';
import { validateSettlementPlacement } from '../../utils/validation/validateSettlementPlacement';
import { validateRoadPlacement } from '../../utils/validation/validateRoadPlacement';
import { cubeToPixel } from '../../utils/hexMath/cubeToPixel';

const HEX_SIZE_2D = 60; // Base size for 2D calculations, remains consistent
const HEX_HEIGHT_3D = 3.0; // Visual height for 3D hexes
// const HEX_WIDTH_3D = HEX_HEIGHT_3D * (Math.sqrt(3) / 2); // Calculated width based on 3D height
const SCALE_3D = (HEX_HEIGHT_3D / 2) / HEX_SIZE_2D; // Scaling factor from 2D pixel to 3D unit

// Unused tileColors commented out to prevent unused variable compile errors
/*
const tileColors: Record<string, string> = {
  WOOD: '#1b4332',
  BRICK: '#b91c1c',
  SHEEP: '#a3e635',
  WHEAT: '#eab308',
  ORE: '#475569',
  DESERT: '#854d0e',
};
*/

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
  turnSubPhase: any;
  gamePhase: any;
  isSetupPhase: boolean;
  setupState: any;
  onTileClick: (tile: any) => void;
  onVertexClick: (vertex: any) => void;
  onEdgeClick: (edge: any) => void;
  onTileHover: (tile: any, x: number, y: number) => void;
  onTileLeave: () => void;
  onHarborHover: (harbor: any, x: number, y: number) => void;
  onHarborLeave: () => void;
  is3DMode: boolean;
}

interface HarborDock3DProps {
  vertex: any;
  vx: number;
  vy: number;
  fontUrl: string;
  onPointerOver: (e: any) => void;
  onPointerMove: (e: any) => void;
  onPointerOut: () => void;
  onClick: (e: any) => void;
}

const HarborDock3D: React.FC<HarborDock3DProps> = ({
  vertex,
  vx,
  vy,
  fontUrl,
  onPointerOver,
  onPointerMove,
  onPointerOut,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const balloonRef = useRef<THREE.Group>(null);
  const angle = Math.atan2(vy, vx);

  useFrame((state) => {
    if (balloonRef.current) {
      const time = state.clock.getElapsedTime();
      // Floating bobbing animation
      balloonRef.current.position.z = 0.5 + Math.sin(time * 2.0) * 0.08;
    }
  });

  return (
    <group 
      ref={groupRef} 
      rotation={[0, 0, angle]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      {/* Elongated box representing the wooden deck */}
      <mesh position={[0.2, 0, -0.05]}>
        <boxGeometry args={[0.6, 0.25, 0.08]} />
        <meshStandardMaterial color="#4e342e" roughness={0.8} />
      </mesh>

      {/* Two thin vertical wooden columns/posts entering the water */}
      <mesh position={[0.45, 0.1, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
        <meshStandardMaterial color="#2d1c18" roughness={0.9} />
      </mesh>
      <mesh position={[0.45, -0.1, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 12]} />
        <meshStandardMaterial color="#2d1c18" roughness={0.9} />
      </mesh>

      {/* Floating Balloon Billboard */}
      <group ref={balloonRef} position={[0.1, 0, 0.5]}>
        <Billboard>
          {/* Balloon backboard shape (glassmorphic circle/pill or golden shield) */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
            <meshStandardMaterial color="#ffc107" roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Icon */}
          <Text
            position={[0, 0, 0.04]}
            fontSize={0.2}
            color="#000000"
            fontWeight="bold"
            anchorX="center"
            anchorY="middle"
            font={fontUrl}
          >
            {vertex.harborType === 'GENERIC' && '⛵'}
            {vertex.harborType === 'WOOD' && '🪵'}
            {vertex.harborType === 'BRICK' && '🧱'}
            {vertex.harborType === 'SHEEP' && '🐑'}
            {vertex.harborType === 'WHEAT' && '🌾'}
            {vertex.harborType === 'ORE' && '🪨'}
          </Text>
        </Billboard>
      </group>
    </group>
  );
};

const removeWhiteBg = (shader: any) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
    #include <map_fragment>
    if (diffuseColor.r > 0.95 && diffuseColor.g > 0.95 && diffuseColor.b > 0.95) {
      discard;
    }
    `
  );
};

// const removeWhiteBgTiles = (shader: any) => {
//   shader.fragmentShader = shader.fragmentShader.replace(
//     '#include <map_fragment>',
//     `
//     #include <map_fragment>
//     #ifdef USE_MAP
//       vec4 sampledColor = sampledDiffuseColor;
//       if (sampledColor.r > 0.95 && sampledColor.g > 0.95 && sampledColor.b > 0.95) {
//         discard;
//       }
//     #endif
//     `
//   );
// };

const Board3DScene: React.FC<Board3DSceneProps> = ({
  tiles,
  vertices,
  edges,
  players,
  currentPlayerIndex,
  turnSubPhase,
  gamePhase,
  isSetupPhase,
  setupState,
  onTileClick,
  onVertexClick,
  onEdgeClick,
  onTileHover,
  onTileLeave,
  onHarborHover,
  onHarborLeave,
  is3DMode,
}) => {
  const handleVertexClick = onVertexClick;
  const FONT_URL = typeof window !== 'undefined' ? `${window.location.origin}/fonts/Rubik-Bold.ttf` : '/fonts/Rubik-Bold.ttf';
  // Load element textures
  const textures = useTexture({
    settlement: '/settlement.png',
    city: '/city.png',
    road: '/road.png',
    robber: '/robber.png',
    WOOD: '/wood.jpg',
    BRICK: '/brick.jpg',
    SHEEP: '/wool.jpg',
    WHEAT: '/wheat.jpg',
    ORE: '/rock.jpg',
    DESERT: '/desert.jpg',
    SEA: '/see.jpg',
  });

  // Configure textures wrapping and sharpness in useMemo
  React.useMemo(() => {
    const tileTypes = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE', 'DESERT', 'SEA'];
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
  }, [textures]);

  // Animate sea waves (offset of SEA texture)
  useFrame((state) => {
    if (textures.SEA) {
      const time = state.clock.getElapsedTime();
      textures.SEA.offset.x = time * 0.002 + Math.sin(time * 0.05) * 0.01;
      textures.SEA.offset.y = Math.cos(time * 0.05) * 0.01;
    }
  });

  // Is tile selectable for robber?
  const isSelectableForRobber = (tile: any) => {
    return turnSubPhase === 'ROBBER_PLACEMENT' && 
           !players[currentPlayerIndex]?.isBot && 
           !tile.hasRobber;
  };

  const getVertexConfig = (vertex: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedSettlement;
    const isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateSettlementPlacement(vertex.id, currentPlayer.id, gamePhase, vertices, edges)
      : false;

    const isOwnSettlement = vertex.structure === 'SETTLEMENT' && vertex.playerId === currentPlayer?.id;
    const canUpgradeToCity = currentPlayer && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD' && isOwnSettlement;
    const isOwnedHarbor = vertex.isHarbor && vertex.playerId === currentPlayer?.id;
    const isClickable = ((isValidPlacement || canUpgradeToCity) || (isOwnedHarbor && turnSubPhase === 'TRADE_AND_BUILD')) && !currentPlayer?.isBot;

    return { isValidPlacement, canUpgradeToCity, isOwnedHarbor, isClickable };
  };

  const getEdgeConfig = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedRoad;
    const isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges)
      : false;
    const isClickable = isValidPlacement && !currentPlayer?.isBot;

    return { isValidPlacement, isClickable };
  };

  return (
    <group rotation={[0, 0, 0]}>
      {/* Dynamic cyclic clouds system on the GPU/3D */}
      {is3DMode && <Clouds3D />}

      {/* Large peripheral sea ring background */}
      <mesh position={[0, 0, -0.76]}>
        <circleGeometry args={[45.0, 64]} />
        <meshStandardMaterial map={textures.SEA} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Render Hex Tiles */}
      {tiles.map((tile) => {
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
              <Billboard position={[tileX, tileY, getTokenZ(tile.type) + 0.05]}>
                <mesh 
                  rotation={[0, 0, 0]}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    onTileHover(tile, e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    onTileHover(tile, e.clientX, e.clientY);
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    onTileLeave();
                  }}
                >
                  <planeGeometry args={[1.3, 1.95]} />
                  <meshStandardMaterial 
                    map={textures.robber} 
                    transparent={true} 
                    side={THREE.DoubleSide}
                    onBeforeCompile={removeWhiteBg}
                  />
                </mesh>
              </Billboard>
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

        const builtPlayer = players.find(p => p.id === edge.playerId);
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

        return (
          <group key={vertex.id} position={[vx, vy, vertexZ]}>
            {/* Harbor (Port) Visual Elements */}
            {vertex.isHarbor && (
              <HarborDock3D
                vertex={vertex}
                vx={vx}
                vy={vy}
                fontUrl={FONT_URL}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onHarborHover(vertex, e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  e.stopPropagation();
                  onHarborHover(vertex, e.clientX, e.clientY);
                }}
                onPointerOut={() => {
                  onHarborLeave();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onVertexClick(vertex);
                }}
              />
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
                onVertexClick(vertex);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                const { isClickable } = getVertexConfig(vertex);
                if (isClickable) {
                  document.body.style.cursor = 'pointer';
                }
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
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
            />
          </group>
        );
      })}
    </group>
  );
};

const getHarborDescription = (type: string) => {
  switch (type) {
    case 'GENERIC':
      return {
        title: 'נמל כללי (Generic Port)',
        ratio: '3:1',
        description: 'החלף 3 משאבים זהים עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-blue-500/20 to-blue-950/40 border-blue-500/40 text-blue-300',
        icon: '⛵'
      };
    case 'WOOD':
      return {
        title: 'נמל עץ (Wood Port)',
        ratio: '2:1',
        description: 'החלף 2 עץ עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/40 text-emerald-300',
        icon: '🪵'
      };
    case 'BRICK':
      return {
        title: 'נמל לבנים (Brick Port)',
        ratio: '2:1',
        description: 'החלף 2 לבנים עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-red-500/20 to-red-950/40 border-red-500/40 text-red-300',
        icon: '🧱'
      };
    case 'SHEEP':
      return {
        title: 'נמל כבשים (Sheep Port)',
        ratio: '2:1',
        description: 'החלף 2 כבשים עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-lime-500/20 to-lime-950/40 border-lime-500/40 text-lime-300',
        icon: '🐑'
      };
    case 'WHEAT':
      return {
        title: 'נמל חיטה (Wheat Port)',
        ratio: '2:1',
        description: 'החלף 2 חיטה עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-amber-500/20 to-amber-950/40 border-amber-500/40 text-amber-300',
        icon: '🌾'
      };
    case 'ORE':
      return {
        title: 'נמל ברזל (Ore Port)',
        ratio: '2:1',
        description: 'החלף 2 ברזל עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-slate-400/20 to-slate-800/40 border-slate-500/40 text-slate-300',
        icon: '🪨'
      };
    default:
      return {
        title: 'נמל מסחר',
        ratio: '3:1',
        description: 'החלף משאבים עם הבנק ביחס מועדף.',
        color: 'from-slate-500/20 to-slate-950/40 border-slate-500/40 text-slate-300',
        icon: '⛵'
      };
  }
};

const getTileTooltipInfo = (type: string) => {
  switch (type) {
    case 'WOOD':
      return {
        name: 'יער (Forest)',
        produces: 'עץ (Wood)',
        icon: '🪵',
        description: 'מייצר עץ יקר ערך לבניית כבישים ויישובים.',
        color: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/40 text-emerald-300'
      };
    case 'BRICK':
      return {
        name: 'גבעת חמר (Clay Pit)',
        produces: 'לבנים (Brick)',
        icon: '🧱',
        description: 'מייצר לבני חמר לבניית כבישים ויישובים.',
        color: 'from-red-500/20 to-red-950/40 border-red-500/40 text-red-300'
      };
    case 'SHEEP':
      return {
        name: 'מרעה כבשים (Pasture)',
        produces: 'צמר (Wool)',
        icon: '🐑',
        description: 'מייצר צמר רך ועשיר להקמת יישובים וקניית קלפי פיתוח.',
        color: 'from-lime-500/20 to-lime-950/40 border-lime-500/40 text-lime-300'
      };
    case 'WHEAT':
      return {
        name: 'שדה חיטה (Fields)',
        produces: 'חיטה (Wheat)',
        icon: '🌾',
        description: 'מייצר חיטה מזינה להקמת יישובים, שדרוג ערים וקניית קלפי פיתוח.',
        color: 'from-amber-500/20 to-amber-950/40 border-amber-500/40 text-amber-300'
      };
    case 'ORE':
      return {
        name: 'הרים (Mountains)',
        produces: 'ברזל (Ore)',
        icon: '🪨',
        description: 'מפיק עפרת ברזל חזקה לשדרוג ערים וקניית קלפי פיתוח.',
        color: 'from-slate-400/20 to-slate-800/40 border-slate-500/40 text-slate-300'
      };
    case 'DESERT':
      return {
        name: 'מדבר (Desert)',
        produces: 'אין (Desert)',
        icon: '🏜️',
        description: 'מדבר שומם וצחיח שאינו מייצר משאבים. מקום מושבו של השודד.',
        color: 'from-orange-500/10 to-amber-950/20 border-orange-700/20 text-orange-200'
      };
    default:
      return {
        name: 'אריח משאב',
        produces: 'משאב',
        icon: '❓',
        description: 'מייצר משאבים עבור השחקנים.',
        color: 'from-slate-500/20 to-slate-950/40 border-slate-500/40 text-slate-300'
      };
  }
};

export const GameBoard3D: React.FC = () => {
  const orbitControlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      console.log('[GameBoard3D Canvas Wrapper Dimensions]', {
        width: rect.width,
        height: rect.height,
        clientWidth: containerRef.current.clientWidth,
        clientHeight: containerRef.current.clientHeight
      });
    }
  }, []);

  const handleResetCamera = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
  };

  const { 
    tiles, 
    vertices, 
    edges, 
    is3DMode, 
    setIs3DMode, 
    buildingToast, 
    setBuildingToast,
    players, 
    currentPlayerIndex, 
    turnSubPhase, 
    setTiles, 
    setTurnSubPhase, 
    addLog, 
    setRobberyState,
    setVertices,
    setPlayers,
    gamePhase,
    setEdges,
    roadBuildingRemaining,
    showBuildingCostToast,
    setActivePortTrade
  } = useGame();

  const { isSetupPhase, setupState, recordSetupPlacement } = useTurnManager();

  React.useEffect(() => {
    const updateCamera = () => {
      if (orbitControlsRef.current) {
        const controls = orbitControlsRef.current;
        const camera = controls.object;
        if (camera) {
          if (!is3DMode) {
            camera.position.set(0, 0, 40);
            controls.target.set(0, 0, 0);
            controls.update();
          } else {
            camera.position.set(0, -25, 35);
            controls.target.set(0, 0, 0);
            controls.update();
          }
        }
      }
    };

    updateCamera();
    const timer = setTimeout(updateCamera, 50);
    const timer2 = setTimeout(updateCamera, 150);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [is3DMode]);

  const [hoveredTile, setHoveredTile] = useState<{
    tile: any;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredHarbor, setHoveredHarbor] = useState<{
    harbor: any;
    x: number;
    y: number;
  } | null>(null);

  // Define click handlers that have access to the context outside of Canvas
  const isSelectableForRobber = (tile: any) => {
    return turnSubPhase === 'ROBBER_PLACEMENT' && 
           !players[currentPlayerIndex]?.isBot && 
           !tile.hasRobber;
  };

  const handleTileClick = (tile: any) => {
    if (!isSelectableForRobber(tile)) return;
    
    // Move robber (using moveRobber utility)
    setTiles(prevTiles => moveRobber(tile.id, prevTiles));
    
    const currentPlayerName = players[currentPlayerIndex]?.name || 'השחקן';
    addLog(`${currentPlayerName} הזיז את השודד לאריח מסוג ${tile.type}.`);

    const currentPlayingPlayer = players[currentPlayerIndex];
    const eligibleTargets = getEligibleRobberyTargets(tile, vertices, players, currentPlayingPlayer.id);

    if (eligibleTargets.length > 0) {
      setRobberyState({ tile, targets: eligibleTargets });
    } else {
      addLog(`[שודד] אין שחקנים יריבים עם קלפים באריח זה.`);
      setTurnSubPhase('TRADE_AND_BUILD');
    }
  };

  const getVertexConfig = (vertex: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedSettlement;
    const isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateSettlementPlacement(vertex.id, currentPlayer.id, gamePhase, vertices, edges)
      : false;

    const isOwnSettlement = vertex.structure === 'SETTLEMENT' && vertex.playerId === currentPlayer?.id;
    const canUpgradeToCity = currentPlayer && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD' && isOwnSettlement;
    const isOwnedHarbor = vertex.isHarbor && vertex.playerId === currentPlayer?.id;
    const isClickable = ((isValidPlacement || canUpgradeToCity) || (isOwnedHarbor && turnSubPhase === 'TRADE_AND_BUILD')) && !currentPlayer?.isBot;

    return { isValidPlacement, canUpgradeToCity, isOwnedHarbor, isClickable };
  };

  const handleVertexClick = (vertex: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer?.isBot) return;

    const { isValidPlacement, canUpgradeToCity, isOwnedHarbor } = getVertexConfig(vertex);

    // Harbor trade
    if (isOwnedHarbor && !isSetupPhase && turnSubPhase === 'TRADE_AND_BUILD') {
      setActivePortTrade(vertex);
      return;
    }

    // Setup phase
    if (isSetupPhase) {
      if (!isValidPlacement) return;
      setVertices(prevVertices => prevVertices.map(v => 
        v.id === vertex.id 
          ? { ...v, structure: 'SETTLEMENT', playerId: currentPlayer.id } 
          : v
      ));
      recordSetupPlacement?.('SETTLEMENT', vertex.id);
      showBuildingCostToast('SETTLEMENT', true, true);
      addLog(`שחקן ${currentPlayer.name} בנה יישוב בשלב ההקמה (חינם).`);
      return;
    }

    // Upgrade to city
    if (canUpgradeToCity) {
      const hasResources = currentPlayer.resources.WHEAT >= 2 && currentPlayer.resources.ORE >= 3;
      showBuildingCostToast('CITY', hasResources);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לשדרוג לעיר! נדרש: 3 ברזל, 2 חיטה.`);
        return;
      }

      setPlayers(prev => prev.map(p => p.id === currentPlayer.id 
        ? {
            ...p,
            victoryPoints: p.victoryPoints + 1,
            resources: {
              ...p.resources,
              WHEAT: p.resources.WHEAT - 2,
              ORE: p.resources.ORE - 3
            }
          }
        : p
      ));

      setVertices(prevVertices => prevVertices.map(v => 
        v.id === vertex.id 
          ? { ...v, structure: 'CITY' } 
          : v
      ));

      addLog(`שחקן ${currentPlayer.name} שדרג יישוב לעיר! עלות: 3 ברזל, 2 חיטה.`);
      return;
    }

    // Build regular settlement
    if (isValidPlacement) {
      if (turnSubPhase !== 'TRADE_AND_BUILD') return;

      const hasResources = currentPlayer.resources.WOOD >= 1 && 
                           currentPlayer.resources.BRICK >= 1 && 
                           currentPlayer.resources.SHEEP >= 1 && 
                           currentPlayer.resources.WHEAT >= 1;

      showBuildingCostToast('SETTLEMENT', hasResources);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לבניית יישוב! נדרש: 1 עץ, 1 לבנה, 1 כבש, 1 חיטה.`);
        return;
      }

      setPlayers(prev => prev.map(p => p.id === currentPlayer.id 
        ? {
            ...p,
            victoryPoints: p.victoryPoints + 1,
            resources: {
              ...p.resources,
              WOOD: p.resources.WOOD - 1,
              BRICK: p.resources.BRICK - 1,
              SHEEP: p.resources.SHEEP - 1,
              WHEAT: p.resources.WHEAT - 1
            }
          }
        : p
      ));

      setVertices(prevVertices => prevVertices.map(v => 
        v.id === vertex.id 
          ? { ...v, structure: 'SETTLEMENT', playerId: currentPlayer.id } 
          : v
      ));

      addLog(`שחקן ${currentPlayer.name} בנה יישוב! עלות: 1 עץ, 1 לבנה, 1 כבש, 1 חיטה.`);
      return;
    }
  };

  const getEdgeConfig = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    const isBlockedBySetup = isSetupPhase && setupState.hasPlacedRoad;
    const isValidPlacement = currentPlayer && !isBlockedBySetup
      ? validateRoadPlacement(edge.id, currentPlayer.id, vertices, edges)
      : false;
    const isClickable = isValidPlacement && !currentPlayer?.isBot;

    return { isValidPlacement, isClickable };
  };

  const handleEdgeClick = (edge: any) => {
    const currentPlayer = players[currentPlayerIndex];
    if (currentPlayer?.isBot) return;

    const { isValidPlacement } = getEdgeConfig(edge);

    if (isSetupPhase) {
      if (!isValidPlacement) return;
      setEdges(prevEdges => prevEdges.map(e => 
        e.id === edge.id 
          ? { ...e, hasRoad: true, playerId: currentPlayer.id } 
          : e
      ));
      recordSetupPlacement?.('ROAD', edge.id);
      showBuildingCostToast('ROAD', true, true);
      addLog(`שחקן ${currentPlayer.name} בנה כביש בשלב ההקמה (חינם).`);
      return;
    }

    if (isValidPlacement) {
      if (turnSubPhase !== 'TRADE_AND_BUILD') return;

      const isFreeRoad = roadBuildingRemaining > 0;
      const hasResources = isFreeRoad || (currentPlayer.resources.WOOD >= 1 && currentPlayer.resources.BRICK >= 1);

      showBuildingCostToast('ROAD', hasResources, isFreeRoad);

      if (!hasResources) {
        addLog(`אין לך מספיק משאבים לבניית כביש! נדרש: 1 עץ, 1 לבנה.`);
        return;
      }

      if (!isFreeRoad) {
        setPlayers(prev => prev.map(p => p.id === currentPlayer.id 
          ? {
              ...p,
              resources: {
                ...p.resources,
                WOOD: p.resources.WOOD - 1,
                BRICK: p.resources.BRICK - 1
              }
            }
          : p
        ));
      }

      setEdges(prevEdges => prevEdges.map(e => 
        e.id === edge.id 
          ? { ...e, hasRoad: true, playerId: currentPlayer.id } 
          : e
      ));

      addLog(`שחקן ${currentPlayer.name} בנה כביש! ${isFreeRoad ? '(חינם - קלף בניית כבישים)' : 'עלות: 1 עץ, 1 לבנה.'}`);
    }
  };

  if (tiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white text-xl">
        המשחק עוד לא התחיל. היכנס ללובי ולחץ על התחלה!
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
      {/* תצוגת עלות הבנייה בכל לחיצה - Toast מרהיב */}
      {buildingToast && (
        <div 
          className={`absolute top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border backdrop-blur-lg shadow-2xl text-center select-none cursor-pointer transition-all duration-300 transform scale-100 hover:scale-105 active:scale-95 animate-pulse
            ${buildingToast.success 
              ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-200 shadow-emerald-500/20' 
              : 'bg-red-950/85 border-red-500/50 text-red-200 shadow-red-500/20'
            }`}
          onClick={() => setBuildingToast(null)}
          dir="rtl"
        >
          <div className="text-xs font-black flex items-center gap-1.5 justify-center">
            <span>{buildingToast.success ? '🎉 הבנייה הושלמה בהצלחה!' : '❌ חסרים משאבים לבנייה זו!'}</span>
          </div>
          <div className="text-xs font-extrabold opacity-95">
            {buildingToast.type === 'ROAD' && (
              <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <span>עלות בניית כביש:</span>
                {buildingToast.isFree ? (
                  <span className="text-emerald-400 font-extrabold">חינם! (שלב הקמה / קלף בניית כבישים)</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1"><WoodIcon size={12} /> עץ x1</span>
                    <span>,</span>
                    <span className="inline-flex items-center gap-1"><BrickIcon size={12} /> לבנה x1</span>
                  </>
                )}
              </span>
            )}
            {buildingToast.type === 'SETTLEMENT' && (
              <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <span>עלות בניית יישוב:</span>
                {buildingToast.isFree ? (
                  <span className="text-emerald-400 font-extrabold">חינם! (שלב הקמה)</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1"><WoodIcon size={12} /> עץ x1</span>
                    <span>,</span>
                    <span className="inline-flex items-center gap-1"><BrickIcon size={12} /> לבנה x1</span>
                    <span>,</span>
                    <span className="inline-flex items-center gap-1"><SheepIcon size={12} /> כבש x1</span>
                    <span>,</span>
                    <span className="inline-flex items-center gap-1"><WheatIcon size={12} /> חיטה x1</span>
                  </>
                )}
              </span>
            )}
            {buildingToast.type === 'CITY' && (
              <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <span>עלות שדרוג לעיר:</span>
                <span className="inline-flex items-center gap-1"><OreIcon size={12} /> ברזל x3</span>
                <span>,</span>
                <span className="inline-flex items-center gap-1"><WheatIcon size={12} /> חיטה x2</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Premium Integrated Controls Container */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Premium Integrated 3D Toggle Switch */}
        <div className="group relative">
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`relative flex items-center w-20 h-9 p-1 rounded-full cursor-pointer select-none transition-all duration-300 ease-in-out border outline-none
              ${is3DMode 
                ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                : 'bg-slate-950/80 border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
              }`}
            aria-label="שנה זווית ראייה ללוח"
          >
            {/* Knob / Slider track */}
            <div 
              className={`absolute top-0.5 bottom-0.5 w-7 rounded-full flex items-center justify-center transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) shadow-md
                ${is3DMode 
                  ? 'left-[46px] bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30' 
                  : 'left-1 bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300'
                }`}
            >
              {is3DMode ? (
                /* Isometric Box SVG */
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Top face */}
                  <polygon points="12,2 22,7 12,12 2,7" fill="currentColor" fillOpacity="0.25" />
                  {/* Left & Right vertical lines / faces */}
                  <path d="M2,7 L2,17 M22,7 L22,17 M12,12 L12,22 M2,17 L12,22 L22,17" />
                  <path d="M12,2 L12,12" />
                </svg>
              ) : (
                /* Hexagon SVG */
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="currentColor" fillOpacity="0.2" />
                </svg>
              )}
            </div>

            {/* Static labels inside track */}
            <div className="w-full flex justify-between text-[10px] font-black px-2.5 text-slate-400 select-none pointer-events-none">
              <span className={`transition-all duration-300 ${!is3DMode ? 'text-slate-200 opacity-100 scale-100' : 'opacity-40 scale-90'}`}>2D</span>
              <span className={`transition-all duration-300 ${is3DMode ? 'text-amber-400 font-bold opacity-100 scale-100' : 'opacity-40 scale-90'}`}>3D</span>
            </div>
          </button>

          {/* Premium Tooltip */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 border border-slate-800 text-slate-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-2xl pointer-events-none opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-30" dir="rtl">
            שנה זווית ראייה ללוח
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950/95"></div>
          </div>
        </div>

        {/* Refresh / Reset Button */}
        <div className="group relative">
          <button
            onClick={handleResetCamera}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-950/80 border border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700 text-lg transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer outline-none active:scale-95"
            aria-label="איפוס סיבוב הלוח"
          >
            🔁
          </button>
          {/* Tooltip for Reset */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 border border-slate-800 text-slate-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-2xl pointer-events-none opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-30" dir="rtl">
            איפוס סיבוב הלוח
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950/95"></div>
          </div>
        </div>
      </div>

      {/* Main canvas viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }}>
        <Canvas camera={{ position: [0, 0, 44], fov: 30 }} style={{ touchAction: 'none' }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[10, 10, 20]} intensity={1.5} />
          <OrbitControls 
            ref={orbitControlsRef} 
            enableZoom={true} 
            enablePan={true}
            enableRotate={is3DMode}
            target={[0, 0, 0]} 
            mouseButtons={{
              LEFT: THREE.MOUSE.PAN,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.ROTATE
            }}
            touches={{
              ONE: THREE.TOUCH.PAN,
              TWO: THREE.TOUCH.DOLLY_PAN
            }}
          />
          <Suspense fallback={null}>
            <Board3DScene 
              tiles={tiles} 
              vertices={vertices} 
              edges={edges} 
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              turnSubPhase={turnSubPhase}
              gamePhase={gamePhase}
              isSetupPhase={isSetupPhase}
              setupState={setupState}
              onTileClick={handleTileClick}
              onVertexClick={handleVertexClick}
              onEdgeClick={handleEdgeClick}
              onTileHover={(tile, x, y) => setHoveredTile({ tile, x, y })}
              onTileLeave={() => setHoveredTile(null)}
              onHarborHover={(harbor, x, y) => setHoveredHarbor({ harbor, x, y })}
              onHarborLeave={() => setHoveredHarbor(null)}
              is3DMode={is3DMode}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* hoveredHarbor Glassmorphic Balloon Overlay */}
      {hoveredHarbor && (
        <div
          className="fixed pointer-events-none z-50 flex flex-col gap-1 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl transition-opacity duration-150 animate-fade-in text-right font-sans"
          style={{
            left: hoveredHarbor.x + 18,
            top: hoveredHarbor.y + 18,
            maxWidth: '280px',
            backgroundColor: 'rgba(15, 23, 42, 0.93)', // slate-900 with high opacity
            borderColor: 'rgba(51, 65, 85, 0.6)',      // slate-700/60
            ...(() => {
              const info = getHarborDescription(hoveredHarbor.harbor.harborType);
              return {
                backgroundImage: `linear-gradient(135deg, ${info.color.split(' ')[0].replace('from-', '')}, ${info.color.split(' ')[1].replace('to-', '')})`,
              };
            })()
          }}
          dir="rtl"
        >
          {(() => {
            const info = getHarborDescription(hoveredHarbor.harbor.harborType);
            return (
              <>
                {/* Header with Icon & Name */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl filter drop-shadow-md">{info.icon}</span>
                    <span className="text-sm font-black text-white leading-none">{info.title}</span>
                  </div>
                  <div className="bg-slate-950/50 px-2.5 py-1 rounded-lg border border-white/5 shadow flex items-center justify-center font-black text-xs text-amber-400">
                    {info.ratio}
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-200 leading-relaxed font-extrabold mt-1">
                  {info.description}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 opacity-75 font-bold">
                  לחץ כאן במהלך תורך לביצוע מסחר נמל מהיר!
                </span>
              </>
            );
          })()}
        </div>
      )}

      {/* Hover Tooltip / Explanation Balloon */}
      {hoveredTile && (
        <div
          className="fixed pointer-events-none z-50 flex flex-col gap-1 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl transition-opacity duration-150 animate-fade-in text-right"
          style={{
            left: hoveredTile.x + 18,
            top: hoveredTile.y + 18,
            maxWidth: '280px',
            backgroundColor: 'rgba(15, 23, 42, 0.93)', // slate-900 with high opacity
            borderColor: 'rgba(51, 65, 85, 0.6)',      // slate-700/60
            ...(() => {
              const info = getTileTooltipInfo(hoveredTile.tile.type);
              return {
                backgroundImage: `linear-gradient(135deg, ${info.color.split(' ')[0].replace('from-', '')}, ${info.color.split(' ')[1].replace('to-', '')})`,
              };
            })()
          }}
          dir="rtl"
        >
          {(() => {
            const info = getTileTooltipInfo(hoveredTile.tile.type);
            return (
              <>
                {/* Header with Icon & Name */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl filter drop-shadow-md">{info.icon}</span>
                    <span className="text-sm font-black text-white leading-none">{info.name}</span>
                  </div>
                  {/* Small SVG Resource Icon */}
                  <div className="bg-slate-950/50 p-1.5 rounded-lg border border-white/5 shadow flex items-center justify-center">
                    {hoveredTile.tile.type === 'WOOD' && <WoodIcon size={14} />}
                    {hoveredTile.tile.type === 'BRICK' && <BrickIcon size={14} />}
                    {hoveredTile.tile.type === 'SHEEP' && <SheepIcon size={14} />}
                    {hoveredTile.tile.type === 'WHEAT' && <WheatIcon size={14} />}
                    {hoveredTile.tile.type === 'ORE' && <OreIcon size={14} />}
                    {hoveredTile.tile.type === 'DESERT' && <span className="text-xs leading-none">🏜️</span>}
                  </div>
                </div>

                {/* Production Info */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <span className="opacity-75">תוצרת:</span>
                  <span className="text-white bg-slate-950/40 px-2 py-0.5 rounded border border-white/5 font-extrabold">
                    {info.produces}
                  </span>
                  {hoveredTile.tile.numberToken !== null && (
                    <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px] font-mono">
                      מספר: {hoveredTile.tile.numberToken}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium mt-1">
                  {info.description}
                </p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
