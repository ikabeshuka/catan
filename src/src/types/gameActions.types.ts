export type GameAction =
  | { type: 'ROLL_DICE'; playerId: string }
  | { type: 'BUILD_SETTLEMENT'; playerId: string; vertexId: string }
  | { type: 'BUILD_CITY'; playerId: string; vertexId: string }
  | { type: 'BUILD_ROAD'; playerId: string; edgeId: string }
  | { type: 'BUILD_SHIP'; playerId: string; edgeId: string }
  | { type: 'BUY_DEV_CARD'; playerId: string }
  | { type: 'MOVE_ROBBER'; playerId: string; tileId: string; victimPlayerId?: string }
  | { type: 'END_TURN'; playerId: string };
