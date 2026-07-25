export type DevCardType = 'KNIGHT' | 'VICTORY_POINT' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY' | 'MONOPOLY';

export type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';

export type GameAction =
  // --- תורות וקוביות ---
  | { type: 'ROLL_DICE'; playerId: string; diceValues: [number, number] }
  | { type: 'END_TURN'; playerId: string }

  // --- בנייה ושדרוגים ---
  | { type: 'BUILD_SETTLEMENT'; playerId: string; vertexId: string }
  | { type: 'BUILD_CITY'; playerId: string; vertexId: string }
  | { type: 'BUILD_ROAD'; playerId: string; edgeId: string }
  | { type: 'BUILD_SHIP'; playerId: string; edgeId: string }

  // --- קלפי פיתוח ---
  | { type: 'BUY_DEV_CARD'; playerId: string; cardType: DevCardType }
  | { type: 'PLAY_DEV_CARD'; playerId: string; cardType: DevCardType; data?: any }

  // --- שודד / שודד ים ---
  | {
      type: 'MOVE_ROBBER';
      playerId: string;
      tileId: string;
      victimPlayerId?: string;
      stolenResource?: ResourceType | null;
    }

  // --- מסחר ---
  | {
      type: 'PROPOSE_TRADE';
      playerId: string;
      tradeOffer: {
        offer: Partial<Record<ResourceType, number>>;
        request: Partial<Record<ResourceType, number>>;
      };
    }
  | { type: 'ACCEPT_TRADE'; playerId: string; targetPlayerId: string }
  | { type: 'DECLINE_TRADE'; playerId: string }
  | {
      type: 'BANK_TRADE';
      playerId: string;
      offeredResource: ResourceType;
      requestedResource: ResourceType;
      ratio: number;
    }

  // --- הרחבת יורדי הים (Seafarers) ---
  | { type: 'MOVE_SHIP'; playerId: string; fromEdgeId: string; toEdgeId: string }
  | { type: 'DISCOVER_FOG'; playerId: string; tileId: string; revealedTile: any }
  | { type: 'SELECT_GOLD_RESOURCE'; playerId: string; resource: ResourceType }

  // --- הרחבת סוחרים וברברים (Merchants & Barbarians) ---
  | { type: 'MOVE_WAGON'; playerId: string; targetVertexId: string; movementCost: number }
  | { type: 'UPGRADE_WAGON'; playerId: string; newLevel: number };