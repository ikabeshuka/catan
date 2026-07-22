import React, { useMemo, useRef, useEffect } from 'react';
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
  const customTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const shaderRef = useRef<any>(null);

  const texturesRef = useRef(textures);
  texturesRef.current = textures;

  const windTexture = useMemo(() => {
    const tex = texturesRef.current.WHEAT;
    if (!tex) return null;
    const cloned = tex.clone();
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.needsUpdate = true;
    return cloned;
  }, [textures.WHEAT]);

  useEffect(() => {
    return () => {
      if (customTextureRef.current) {
        customTextureRef.current.dispose();
        customTextureRef.current = null;
      }
      if (windTexture) {
        windTexture.dispose();
      }
    };
  }, [tile.type, is3DMode, windTexture]);

  // 1. בניית הגיאומטריה הפיזית של המשושה עם חלוקה פנימית (Subdivisions)
  const subdividedHexGeometry = useMemo(() => {
    // נשתמש בגליל בעל 6 צלעות (משושה מושלם)
    // חלוקה של 8 מקטעי גובה (Height Segments) מעניקה לנו מספיק קודקודים פנימיים לעיוות גיאומטרי עשיר
    const geometry = new THREE.CylinderGeometry(3.02, 3.4, 1.5, 6, 8, false, 0);
    
    // סיבוב פנימי של נקודות הגיאומטריה כדי שהמשושה ישכב שטוח על מישור X-Y (ציר Z פונה למעלה)
    // זה מונע את הצורך ברוטציות מסורבלות ברמת ה-Mesh ומאפס את הצירים ל-[0,0,0]
    geometry.rotateX(Math.PI / 2);

    // הזרקת אפקטי הגובה הגיאומטריים (Low-Poly Peak / Pit / Waves) בהתאם לסוג המשאב
    applyLowPolyHeights(geometry, tile.type, is3DMode);

    return geometry;
  }, [tile.type, is3DMode]);

  // 2. שליפה ואינטגרציה של הטקסטורות (צבע ומפת נורמלים) עם מנגנון Canvas Texture Blending מובנה
  const currentTexture = useMemo(() => {
    const tex = texturesRef.current[tile.type] || null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if ((tile.type === 'CASTLE' || tile.type === 'QUARRY' || tile.type === 'GLASSWORKS' || tile.type === 'GOLD_FIELD') && !tex) {
          // Special expansion tile styles
          let bgColor = '#8e24aa'; // Castle Purple
          let icon = '🏰';
          let label = 'הטירה';
          let subtitle = 'CASTLE';

          if (tile.type === 'QUARRY') {
            bgColor = '#555555'; // Quarry Gray
            icon = '⛰️';
            label = 'מחצבת שיש';
            subtitle = 'QUARRY';
          } else if (tile.type === 'GLASSWORKS') {
            bgColor = '#0097a7'; // Glassworks Cyan
            icon = '🏭';
            label = 'בית מלאכת';
            subtitle = 'GLASSWORKS';
          } else if (tile.type === 'GOLD_FIELD') {
            bgColor = '#d4af37'; // Luxurious metallic gold
            icon = '🪙';
            label = 'נהר הזהב';
            subtitle = 'GOLD FIELD';
          }

          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, 512, 512);

          // Draw double frame border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 12;
          ctx.strokeRect(24, 24, 464, 464);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 4;
          ctx.strokeRect(44, 44, 424, 424);

          // Draw Icon
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '120px sans-serif';
          ctx.fillText(icon, 256, 170);

          // Draw Hebrew label
          ctx.font = 'bold 55px sans-serif';
          ctx.fillText(label, 256, 310);

          // Draw English label
          ctx.font = 'black 38px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(subtitle, 256, 395);
        } else if (tex && tex.image) {
          // צביעת הרקע של הקנבס בצבע חול אטום וניטרלי
          ctx.fillStyle = '#b59966';
          ctx.fillRect(0, 0, 512, 512);

          // ציור המשאב המקורי
          ctx.drawImage(tex.image as any, 0, 0, 512, 512);
        } else {
          // Fallback static background for missing texture
          ctx.fillStyle = '#b59966';
          ctx.fillRect(0, 0, 512, 512);
        }

        if (is3DMode) {
          // יצירת מעבר רך, הדרגתי ומטושטש (Feather/Blur) המתמוסס אל תוך רקע החול בשוליים (רק 5% הקיצוניים ביותר של השוליים: מפיקסל 243.2 עד 256)
          const grad = ctx.createRadialGradient(256, 256, 243.2, 256, 256, 256);
          grad.addColorStop(0, 'rgba(181, 153, 102, 0)');
          grad.addColorStop(1, 'rgba(181, 153, 102, 1)');

          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 512, 512);
        } else {
          // צבע את רקע שולי הקנבס בצבע אחיד, חלק ושטוח לחלוטין (רק 5% הקיצוניים ביותר של השוליים: מפיקסל 243.2 עד 256)
          ctx.beginPath();
          ctx.rect(0, 0, 512, 512);
          ctx.arc(256, 256, 243.2, 0, Math.PI * 2);
          ctx.fillStyle = '#b59966';
          ctx.fill('evenodd');
        }

        const blendedTexture = new THREE.CanvasTexture(canvas);
        blendedTexture.center.set(0.5, 0.5);
        blendedTexture.rotation = Math.PI / 2;
        blendedTexture.needsUpdate = true;
        
        if (customTextureRef.current) {
          customTextureRef.current.dispose();
        }
        customTextureRef.current = blendedTexture;
        textureRef.current = blendedTexture;
        return blendedTexture;
      }
    } catch (err) {
      console.error("Blending error:", err);
    }

    if (tex) {
      textureRef.current = tex;
      tex.center.set(0.5, 0.5);
      tex.rotation = Math.PI / 2;
      tex.needsUpdate = true;
      return tex;
    }
    return null;
  }, [tile.type, is3DMode]);

  // מפת נורמלים משלימה (ככל שקיימת בתיקיית המשאבים כגון 'wood_normal.jpg')
  const currentNormalTexture = useMemo(() => {
    return textures[`${tile.type}_NORMAL`] || null;
  }, [textures, tile.type]);

  // 3. מנוע האנימציות הדינמי בזמן אמת (60FPS)
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();

    // אריחי ים: הזזה רציפה ואיטית של הפיקסלים (Texture Offset) ליצירת זרימת מים ריאליסטית ומנצנצת.
    // שאר האריחים (כולל המדבר) נשארים סטטיים לחלוטין ומיושרים למרכז (ללא הזזה).
    const isSea = (tile.type as string) === 'SEA' || tile.type === 'WATER';
    if (is3DMode && isSea && textureRef.current) { 
      textureRef.current.offset.x = time * 0.005;
      textureRef.current.offset.y = Math.sin(time * 0.02) * 0.02;
    } else if (textureRef.current) {
      textureRef.current.offset.x = 0;
      textureRef.current.offset.y = 0;
    }

    // wind texture animation for WHEAT
    if (is3DMode && tile.type === 'WHEAT' && windTexture) {
      windTexture.offset.x = Math.sin(time * 1.5) * 0.08 + time * 0.02;
      windTexture.offset.y = Math.cos(time * 1.2) * 0.08 + time * 0.015;
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
        {/* לחומר הצידי (attach="material-0") הגדר גוון חול קבוע, מט ועמוק: #b59966 */}
        <meshStandardMaterial
          attach="material-0"
          map={textures.dast}
          roughness={1.0}
          flatShading={true}
        />

        {/* לחומר העליון (attach="material-1") הגדר את טקסטורת המשאב שמעורבבת עם החול המטושטש בשוליים */}
        <meshStandardMaterial
          attach="material-1"
          color="white"
          map={currentTexture}
          normalMap={currentNormalTexture}
          normalScale={new THREE.Vector2(0.6, 0.6)}
          flatShading={true}
          roughness={tile.type === 'ORE' ? 0.7 : 0.4}
          metalness={tile.type === 'ORE' ? 0.2 : 0.0}
          side={THREE.DoubleSide}
          onBeforeCompile={
            is3DMode && tile.type === 'WHEAT'
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
                      float swayX = sin(uTime * 0.9 + position.x * 0.25 + position.y * 0.2) * 0.05;
                      float swayY = cos(uTime * 0.7 + position.x * 0.25 + position.y * 0.2) * 0.04;
                      transformed.x += swayX;
                      transformed.y += swayY;
                    }
                    `
                  );
                }
              : undefined
          }
        />

        {/* לחומר התחתון (attach="material-2") הגדר גוון חול קבוע */}
        <meshStandardMaterial
          attach="material-2"
          color="#b59966"
          roughness={1.0}
          flatShading={true}
        />
      </mesh>

      {is3DMode && tile.type === 'WHEAT' && windTexture && (
        <mesh
          geometry={subdividedHexGeometry}
          position={[0, 0, 0.08]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            attach="material-0"
            transparent={true}
            opacity={0}
          />
          <meshStandardMaterial
            attach="material-1"
            color="white"
            map={windTexture}
            transparent={true}
            opacity={0.25}
            flatShading={true}
            roughness={0.4}
            side={THREE.DoubleSide}
          />
          <meshStandardMaterial
            attach="material-2"
            transparent={true}
            opacity={0}
          />
        </mesh>
      )}
    </group>
  );
};
