import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { Player } from '../../../types/player.types';
import { HexTile } from '../../../types/hex.types';
import { GamePhase } from '../../../context/GameContext';
import { evaluateVertices } from '../evaluators/evaluateVertices';
import { evaluateEdges } from '../evaluators/evaluateEdges';
import { GameAction } from '../../../types/gameActions.types';

interface SetupPhaseParams {
  botPlayer: Player;
  gamePhase: GamePhase;
  tiles: HexTile[];
  vertices: BoardVertex[];
  edges: BoardEdge[];
  selectedScenario?: string;
  activeExpansion?: string;
  endTurn: () => void;
  setVertices: React.Dispatch<React.SetStateAction<BoardVertex[]>>;
  setEdges: React.Dispatch<React.SetStateAction<BoardEdge[]>>;
  recordSetupPlacement: (type: 'SETTLEMENT' | 'ROAD', targetId: string) => void;
  isOnline?: boolean;
  dispatchAction?: (action: GameAction) => void;
}

const SETUP_SETTLEMENT_DISPLAY_MS = 350;
const SETUP_ROAD_DISPLAY_MS = 350;

export function setupPhase({
  botPlayer,
  gamePhase,
  tiles,
  vertices,
  edges,
  selectedScenario,
  activeExpansion,
  endTurn,
  setVertices,
  setEdges,
  recordSetupPlacement,
  isOnline,
  dispatchAction
}: SetupPhaseParams): void {
  setTimeout(() => {
    // 1. מציאת הצומת האסטרטגי ביותר שחוקי לבנייה
    const bestVertices = evaluateVertices(
      botPlayer.id,
      gamePhase,
      tiles,
      vertices,
      edges,
      botPlayer.difficulty || 'MEDIUM',
      selectedScenario,
      activeExpansion
    );
    if (bestVertices.length === 0) {
      endTurn();
      return;
    }
    const targetVertexId = bestVertices[0].vertexId;

    // 2. בניית היישוב בסטייט ודיווח למערכת ההקמה
    const setupStructure = activeExpansion === 'CITIES_AND_KNIGHTS' && gamePhase === 'SETUP_ROUND_2'
      ? 'CITY' as const
      : 'SETTLEMENT' as const;
    const updatedVertices = vertices.map(v =>
      v.id === targetVertexId ? { ...v, structure: setupStructure, playerId: botPlayer.id } : v
    );
    if (isOnline && dispatchAction) {
      dispatchAction({ type: setupStructure === 'CITY' ? 'BUILD_CITY' : 'BUILD_SETTLEMENT', playerId: botPlayer.id, vertexId: targetVertexId });
    } else {
      setVertices(updatedVertices);
      recordSetupPlacement('SETTLEMENT', targetVertexId);
    }

    // 3. מציאת כביש חוקי שמחובר ישירות ליישוב החדש שהבוט הרגע בנה
    setTimeout(() => {
      const bestEdges = evaluateEdges(botPlayer.id, gamePhase, tiles, updatedVertices, edges, botPlayer.difficulty || 'MEDIUM');
      const connectedEdges = bestEdges.filter(e => {
        const parts = e.edgeId.replace('e_v_', '').split('_v_');
        const v1Id = `v_${parts[0]}`;
        const v2Id = `v_${parts[1]}`;
        return v1Id === targetVertexId || v2Id === targetVertexId;
      });

      if (connectedEdges.length > 0) {
        const targetEdgeId = connectedEdges[0].edgeId;
        if (isOnline && dispatchAction) {
          dispatchAction({ type: 'BUILD_ROAD', playerId: botPlayer.id, edgeId: targetEdgeId });
        } else {
          setEdges(prev => prev.map(e =>
            e.id === targetEdgeId ? { ...e, hasRoad: true, playerId: botPlayer.id } : e
          ));
          recordSetupPlacement('ROAD', targetEdgeId);
        }
      }

      setTimeout(() => {
        if (isOnline && dispatchAction) dispatchAction({ type: 'END_TURN', playerId: botPlayer.id });
        else endTurn();
      }, SETUP_ROAD_DISPLAY_MS);
    }, SETUP_SETTLEMENT_DISPLAY_MS);

    // 4. סיום התור בהקמה
  }, 1500);
}
