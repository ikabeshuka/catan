import { ResourceType } from './resources.types';

export interface HexCoordinate {
  q: number;
  r: number;
  s: number;
}

export interface HexTile {
  id: string;               // מזהה ייחודי (למשל "hex_1")
  coord: HexCoordinate;     // המיקום שלו על הלוח
  type: ResourceType;       // סוג המשאב (עץ, כבשה וכו')
  numberToken: number | null; // המספר שעל האריח (2-12), למדבר אין מספר
  hasRobber: boolean;       // האם השודד נמצא כרגע על האריח הזה?
  hasPirate?: boolean;      // האם שודד הים נמצא על אריח זה
  islandId?: number;        // מזהה האי אליו משתייך האריח
  harbors?: {
    type: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | 'GENERIC';
    toTileId?: string;
    edgeIndex?: number;
  }[];
}
