export type VertexStructure = 'NONE' | 'SETTLEMENT' | 'CITY';

export interface BoardVertex {
  id: string;                  // מזהה ייחודי המבוסס על האריחים המשיקים לו
  playerId: string | null;     // מי השחקן שבנה כאן (null אם ריק)
  structure: VertexStructure;  // מה בנוי כאן (כלום, יישוב או עיר)
  isHarbor: boolean;           // האם יש כאן נמל?
  harborType?: 'GENERIC' | 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
}

export interface BoardEdge {
  id: string;                  // מזהה ייחודי בין שני צמתים
  playerId: string | null;     // מי השחקן שבנה כאן כביש
  hasRoad: boolean;            // האם בנוי כאן כביש?
}