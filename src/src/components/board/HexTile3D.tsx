import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HexTile } from '../../types/hex.types';
import { applyLowPolyHeights } from '../../utils/hexMath/tileGeometryEffects';

interface HexTile3DProps {
  tile: HexTile;
  tileX: number;
  tileY: number;
  textures: Record<string, THREE.Texture>;
  onTileClick: (tile: HexTile) => void;
  onTileHover: (tile: HexTile, x: number, y: number) => void;
  onTileLeave: () => void;
  isSelectableForRobber: (tile: HexTile) => boolean;
  is3DMode?: boolean;
}

export const HexTile3D: React.FC<HexTile3DProps> = ({
  tile,
  tileX,
  tileY,
  textures,
  onTileClick,
  onTileHover,
  onTileLeave,
  isSelectableForRobber,
  is3DMode = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const shaderRef = useRef<any>(null);

  // 1. בניית הגיאומטריה הפיזית של המשושה עם חלוקה פנימית (Subdivisions)
  const subdividedHexGeometry = useMemo(() => {
    // נשתמש בגליל בעל 6 צלעות (משושה מושלם)
    // חלוקה של 8 מקטעי גובה (Height Segments) מעניקה לנו מספיק קודקודים פנימיים לעיוות גיאומטרי עשיר
    const geometry = new THREE.CylinderGeometry(3.02, 3.02, 1.5, 6, 8, false, 0);
    
    // סיבוב פנימי של נקודות הגיאומטריה כדי שהמשושה ישכב שטוח על מישור X-Y (ציר Z פונה למעלה)
    // זה מונע את הצורך ברוטציות מסורבלות ברמת ה-Mesh ומאפס את הצירים ל-[0,0,0]
    geometry.rotateX(Math.PI / 2);

    // הזרקת אפקטי הגובה הגיאומטריים (Low-Poly Peak / Pit / Waves) בהתאם לסוג המשאב
    applyLowPolyHeights(geometry, tile.type, is3DMode);

    return geometry;
  }, [tile.type, is3DMode]);

  // 2. שליפה ואינטגרציה של הטקסטורות (צבע ומפת נורמלים)
  const currentTexture = useMemo(() => {
    const tex = textures[tile.type] || null;
    if (tex) {
      textureRef.current = tex;
      tex.center.set(0.5, 0.5);
      tex.rotation = Math.PI / 2; // יישור מושלם של 90 מעלות נגד כיוון השעון
      tex.needsUpdate = true;
    }
    return tex;
  }, [textures, tile.type]);

  // מפת נורמלים משלימה (ככל שקיימת בתיקיית המשאבים כגון 'wood_normal.jpg')
  const currentNormalTexture = useMemo(() => {
    return textures[`${tile.type}_NORMAL`] || null;
  }, [textures, tile.type]);

  // 3. מנוע האנימציות הדינמי בזמן אמת (60FPS)
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();

    // אריחי ים: הזזה רציפה ואיטית של הפיקסלים (Texture Offset) ליצירת זרימת מים ריאליסטית ומנצנצת
    if (tile.type === 'DESERT' && textureRef.current) { 
      // הערה: במידה והים מוגדר כסוג משאב ייחודי (למשל SEA), נחליף את התנאי בהתאם
      textureRef.current.offset.x = time * 0.005;
      textureRef.current.offset.y = Math.sin(time * 0.02) * 0.02;
    }

    // עדכון uTime עבור שיידר הרוח ב-GPU במידה והוא קיים
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = time;
    }

    // אריחי חיטה ויער: תנודה אלסטית עדינה ומחזורית של הפסגות (Sway) הועברה לשיידר קודקודים ב-GPU למניעת סדקים בבסיס האריח.
    meshRef.current.rotation.x = 0;
    meshRef.current.rotation.y = 0;
  });

  return (
    <group position={[tileX, tileY, 0]}>
      <mesh
        ref={meshRef}
        geometry={subdividedHexGeometry}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onTileClick(tile);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onTileHover(tile, e.clientX, e.clientY);
          if (isSelectableForRobber(tile)) document.body.style.cursor = 'pointer';
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onTileHover(tile, e.clientX, e.clientY);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onTileLeave();
          document.body.style.cursor = 'default';
        }}
      >
        {/* הגדרת חומר היברידי: שילוב של Flat Shading למשטחים חדים, יחד עם Normal Map לעושר הפיקסלים */}
        <meshStandardMaterial
          color="white"
          map={currentTexture}
          normalMap={currentNormalTexture}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          flatShading={true}
          roughness={tile.type === 'ORE' ? 0.7 : 0.4}
          metalness={tile.type === 'ORE' ? 0.2 : 0.0}
          side={THREE.DoubleSide}
          onBeforeCompile={
            is3DMode && (tile.type === 'WHEAT' || tile.type === 'WOOD')
              ? (shader) => {
                  shader.uniforms.uTime = { value: 0 };
                  shaderRef.current = shader;

                  shader.vertexShader = `
                    uniform float uTime;
                  ` + shader.vertexShader;

                  shader.vertexShader = shader.vertexShader.replace(
                    '#include <begin_vertex>',
                    `
                    #include <begin_vertex>
                    if (position.z > 0.15) {
                      float swayX = sin(uTime * 1.5 + position.x * 0.4 + position.y * 0.3) * 0.08;
                      float swayY = cos(uTime * 1.2 + position.x * 0.4 + position.y * 0.3) * 0.08;
                      transformed.x += swayX;
                      transformed.y += swayY;
                    }
                    `
                  );
                }
              : undefined
          }
        />
      </mesh>
      {/* פסי חול סביב האריח */}
      <mesh position={[0, 0, is3DMode ? 0.85 : 0.76]} rotation={[0, 0, Math.PI / 6]}>
        <ringGeometry args={[3.02, 3.14, 6]} />
        <meshStandardMaterial
          color="#dfc48c"
          roughness={1.0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};