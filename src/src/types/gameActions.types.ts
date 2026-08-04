export type DevCardType = 'KNIGHT' | 'VICTORY_POINT' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY' | 'MONOPOLY';

export type ResourceType = 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
export type CommodityType = 'COIN' | 'PAPER' | 'CLOTH';
export type CityImprovementTrack = 'SCIENCE' | 'POLITICS' | 'TRADE';
export type CitiesKnightsEvent = 'BARBARIAN' | CityImprovementTrack;

export type GameAction =
  // --- תורות וקוביות ---
  | { type: 'ROLL_DICE'; playerId: string; diceValues?: [number, number] | [number, number, number]; eventDie?: CitiesKnightsEvent }
  | { type: 'END_TURN'; playerId: string }
  | { type: 'DISCARD_CARDS'; playerId: string; resourcesToDiscard: Partial<Record<ResourceType, number>>; commoditiesToDiscard?: Partial<Record<CommodityType, number>> }
  | { type: 'GIVE_PROGRESS_CARDS'; playerId: string; targetPlayerId: string; resourcesToGive: Partial<Record<ResourceType, number>>; commoditiesToGive?: Partial<Record<CommodityType, number>> }

  // --- בנייה ושדרוגים ---
  | { type: 'BUILD_SETTLEMENT'; playerId: string; vertexId: string }
  | { type: 'BUILD_CITY'; playerId: string; vertexId: string }
  | { type: 'BUILD_ROAD'; playerId: string; edgeId: string }
  | { type: 'BUILD_SHIP'; playerId: string; edgeId: string }

  // --- קלפי פיתוח ---
  | { type: 'BUY_DEV_CARD'; playerId: string; cardType: DevCardType }
  | {
      type: 'PLAY_DEV_CARD';
      playerId: string;
      cardType: DevCardType;
      data?: { resource?: ResourceType; resources?: [ResourceType, ResourceType] };
    }

  // --- שודד / שודד ים ---
  | {
      type: 'MOVE_ROBBER';
      playerId: string;
      tileId: string;
      robberType?: 'ROBBER' | 'PIRATE';
      hasEligibleVictims?: boolean;
      eligibleVictimPlayerIds?: string[];
    }
  | { type: 'STEAL_RESOURCE'; playerId: string; victimPlayerId: string; stolenResource?: ResourceType | CommodityType; stealKind?: 'RESOURCE' | 'CLOTH' }

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
  | {
      type: 'EXECUTE_PLAYER_TRADE';
      playerId: string;
      targetPlayerId: string;
      offer: Partial<Record<ResourceType, number>>;
      request: Partial<Record<ResourceType, number>>;
    }
  | { type: 'GOLD_TRADE'; playerId: string; requestedResource: ResourceType }

  // --- הרחבת יורדי הים (Seafarers) ---
  | { type: 'MOVE_SHIP'; playerId: string; fromEdgeId: string; toEdgeId: string }
  | { type: 'PLACE_HARBOR'; playerId: string; edgeId: string }
  | { type: 'DISCOVER_FOG'; playerId: string; tileId: string; revealedTile: any }
  | { type: 'SELECT_GOLD_RESOURCE'; playerId: string; resource: ResourceType }
  | { type: 'ATTACK_PIRATE_FORTRESS'; playerId: string; fortressVertexId: string; fortressPower?: number }

  // --- הרחבת סוחרים וברברים (Merchants & Barbarians) ---
  | { type: 'MOVE_WAGON'; playerId: string; targetVertexId: string; movementCost: number }
  | { type: 'UPGRADE_WAGON'; playerId: string; newLevel: 2 | 3; payment: 'RESOURCES' | 'GOLD' }
  // --- Cities & Knights ---
  | { type: 'BUILD_KNIGHT'; playerId: string; vertexId: string }
  | { type: 'ACTIVATE_KNIGHT'; playerId: string; vertexId: string }
  | { type: 'UPGRADE_KNIGHT'; playerId: string; vertexId: string }
  | { type: 'MOVE_KNIGHT'; playerId: string; fromVertexId: string; toVertexId: string }
  | { type: 'DISPLACE_KNIGHT'; playerId: string; fromVertexId: string; toVertexId: string }
  | { type: 'RELOCATE_DISPLACED_KNIGHT'; playerId: string; toVertexId?: string }
  | { type: 'SELECT_DESERTER_KNIGHT'; playerId: string; vertexId: string }
  | { type: 'PLACE_DESERTER_KNIGHT'; playerId: string; vertexId: string }
  | { type: 'BUILD_CITY_WALL'; playerId: string; vertexId: string }
  | { type: 'UPGRADE_CITY_IMPROVEMENT'; playerId: string; track: CityImprovementTrack }
  | { type: 'DOWNGRADE_CITY'; playerId: string; vertexId: string }
  | {
      type: 'PLAY_PROGRESS_CARD';
      playerId: string;
      cardId: string;
      data?: {
        vertexId?: string; targetVertexId?: string; targetEdgeId?: string; tileId?: string; tileAId?: string; tileBId?: string; resource?: ResourceType | CommodityType;
        targetPlayerId?: string; targetCardId?: string; selectedCards?: (ResourceType | CommodityType)[];
        diceValues?: [number, number, number]; eventDie?: CitiesKnightsEvent;
      };
    }
  | { type: 'DISCARD_PROGRESS_CARD'; playerId: string; cardId: string };
