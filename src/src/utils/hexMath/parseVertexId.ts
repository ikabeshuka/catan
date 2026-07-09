/**
 * מקבלת מזהה צומת (למשל "v_10.5_-20.2") ומחזירה את קואורדינטות ה-x וה-y שלו כמספרים
 */
export function parseVertexId(id: string): { x: number; y: number } {
  if (!id) return { x: 0, y: 0 };
  // המזהה בנוי כחלקים מופרדים בקו תחתון: ["v", "x", "y"]
  const parts = id.split('_');
  const xStr = parts[1];
  const yStr = parts[2];
  const x = parseFloat(xStr);
  const y = parseFloat(yStr);
  return {
    x: isNaN(x) ? 0 : x,
    y: isNaN(y) ? 0 : y
  };
}
