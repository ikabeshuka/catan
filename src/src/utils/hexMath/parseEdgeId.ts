/**
 * מקבלת מזהה קצה (למשל "e_v_x1_y1_v_x2_y2") ומחזירה את נקודות ההתחלה והסוף שלו
 */
export function parseEdgeId(id: string): { x1: number; y1: number; x2: number; y2: number } {
  if (!id) return { x1: 0, y1: 0, x2: 0, y2: 0 };
  // המזהה מורכב משני צמתים, למשל: "e_v_10_20_v_30_40"
  // פיצול לפי "_v_" ייתן לנו את שני חלקי הצמתים
  const cleaned = id.startsWith('e_v_') ? id.slice(4) : id;
  const parts = cleaned.split('_v_');
  
  const p1 = parts[0]?.split('_') || [];
  const p2 = parts[1]?.split('_') || [];

  const x1Val = parseFloat(p1[0]);
  const y1Val = parseFloat(p1[1]);
  const x2Val = parseFloat(p2[0]);
  const y2Val = parseFloat(p2[1]);

  return {
    x1: isNaN(x1Val) ? 0 : x1Val,
    y1: isNaN(y1Val) ? 0 : y1Val,
    x2: isNaN(x2Val) ? 0 : x2Val,
    y2: isNaN(y2Val) ? 0 : y2Val
  };
}
