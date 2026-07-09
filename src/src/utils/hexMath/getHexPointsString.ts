/**
 * מחשבת את 6 נקודות הקצה של משושה (Pointy-topped)
 * ומחזירה מחרוזת נקודות המתאימה לתגית polygon של SVG
 */
export function getHexPointsString(centerX: number, centerY: number, size: number): string {
    const points: string[] = [];
    
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i - 30);
      const x = centerX + size * Math.cos(angleRad);
      const y = centerY + size * Math.sin(angleRad);
      points.push(`${x},${y}`);
    }
    
    return points.join(' ');
  }