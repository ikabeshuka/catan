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
  numberToken: number | string | null; // המספר שעל האריח (2-12), למדבר אין מספר
  hasRobber: boolean;       // האם השודד נמצא כרגע על האריח הזה?
  hasPirate?: boolean;      // האם שודד הים נמצא על אריח זה
  isFrameSea?: boolean;     // יעד ים וירטואלי על מסגרת הלוח (אינו אריח משחק רגיל)
  islandId?: number;        // מזהה האי אליו משתייך האריח
  harbors?: {
    type: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | 'GENERIC';
    toTileId?: string;
    edgeIndex?: number;
  }[];
  isFog?: boolean;                // מסמן האם האריח נוצר מאריח ערפל
  revealed?: boolean;             // האם האריח כבר נחשף
  originalType?: ResourceType;    // סוג המשאב הנסתר מתחת לערפל
  originalNumberToken?: number | null; // המספר הנסתר מתחת לערפל
  lostTribeRewards?: {
    id: string;
    edgeIndex: number;
    kind: 'VICTORY_POINT' | 'DEV_CARD' | 'HARBOR';
    harborType?: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | 'GENERIC';
  }[];
  /** Villages of the Lost Tribe used by the Cloth for Catan scenario. */
  lostTribeVillages?: {
    id: string;
    number: number;
    vertexIndex: number;
    clothRemaining: number;
    connectedPlayerIds?: string[];
  }[];
  /** The shared reserve of ten cloth rolls for this scenario (stored on one tile). */
  lostTribeGeneralCloth?: number;
  robberStartLocked?: boolean;
  /** Scenario-specific markers are data-only until a scenario renderer is added. */
  scenarioMarker?: {
    treasureId?: string;
    dragonIds?: string[];
    canalId?: string;
    canalBuilt?: boolean;
    infertileField?: boolean;
    isEnchantedLand?: boolean;
    /** One of the two printed river paths in the Rivers of Catan scenario. */
    riverId?: 'NORTH' | 'SOUTH';
    isOasis?: boolean;
    barbarianFortress?: boolean;
    barbarianCaptured?: boolean;
  };
}
