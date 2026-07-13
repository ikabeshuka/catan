import * as THREE from 'three';
import { ResourceType } from '../../types/resources.types';

/**
 * פונקציית עזר לייצור רעש פסאודו-אקראי דטרמיניסטי (מניעת שימוש בספריות כבדות)
 * מעניקה לכל נקודה גובה ייחודי קבוע כדי שהרשת תיראה אורגנית
 */
function getPseudoNoise(x: number, y: number): number {
  return Math.sin(x * 2.5 + y * 1.2) * Math.cos(y * 1.8 - x * 0.9);
}

/**
 * מעוותת את קודקודי הגיאומטריה (Vertices) של האריח ליצירת מראה Low-Poly עשיר בגבהים
 * @param geometry הגיאומטריה התלת-ממדית המפוצלת (Subdivided) של האריח
 * @param type סוג המשאב של האריח
 */
export function applyLowPolyHeights(geometry: THREE.BufferGeometry, type: ResourceType, is3DMode: boolean = true): void {
  const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
  if (!positionAttribute) return;

  const vertexCount = positionAttribute.count;

  if (!is3DMode) {
    for (let i = 0; i < vertexCount; i++) {
      let z = positionAttribute.getZ(i);
      // If it's a top-facing vertex (z > 0), ensure it is exactly 0.75
      if (z > 0) {
        positionAttribute.setZ(i, 0.75);
      }
    }
    geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;
    return;
  }
  
  for (let i = 0; i < vertexCount; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    let z = positionAttribute.getZ(i);

    // חישוב המרחק של הקודקוד הנוכחי ממרכז האריח (0,0)
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    const noise = getPseudoNoise(x, y);

    switch (type) {
      case 'ORE': // הרים: פסגה גבוהה וחדה במרכז, עם מדרונות סלעיים פראיים
        if (distanceFromCenter < 2.8) {
          const t = distanceFromCenter / 2.8; 
          const smoothFactor = (1.0 + Math.cos(t * Math.PI)) / 2.0; 
          const mountainPeak = smoothFactor * 1.6; 
          z += mountainPeak + noise * 0.15;
        }
        break;

      case 'BRICK': // מכרה לבנים: חפירה ומכתש מדורג כלפי מטה בתוך מישור האריח
        if (distanceFromCenter < 2.5) {
          const tPit = Math.min(1.0, distanceFromCenter / 2.5);
          const smoothPit = (1.0 - tPit * tPit) * 0.5;
          z -= smoothPit - Math.abs(noise) * 0.08;
        }
        break;

      case 'WOOD': // יער: גבעות בינוניות וצפופות המדמות צמרות עצים מרובות
        z += (Math.sin(x * 1.8) * Math.cos(y * 1.8) * 0.22) + (noise * 0.05);
        break;

      case 'WHEAT': // שדות חיטה: גלים עדינים ואחידים המדמים תלמים חקלאיים
        z += (Math.sin(x * 1.2) * 0.12) + (noise * 0.03);
        break;

      case 'SHEEP': // מרעה: גבעות דשא רכות, רחבות ונמוכות
        z += (Math.cos(distanceFromCenter * 0.8) * 0.15) + (noise * 0.04);
        break;

      case 'DESERT': // מדבר: דיונות חול אסימטריות ומתמשכות
        z += (Math.sin(x * 0.8 + y * 0.5) * 0.14) + (noise * 0.02);
        break;

      default:
        break;
    }

    // עדכון קואורדינטת ה-Z החדשה של הקודקוד
    positionAttribute.setZ(i, z);
  }

  // חישוב מחדש של ה-Normals כדי שהתאורה הדינמית (Flat Shading) תישבר בצורה חדה ומושלמת על הפאות החדשות
  geometry.computeVertexNormals();
  positionAttribute.needsUpdate = true;
}
