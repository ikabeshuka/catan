import { HexTile } from '../../types/hex.types';
import { BoardVertex } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';
import type { ResourceCards } from '../../types/resources.types';

/**
 * מזהה את כל השחקנים שיש להם מבנים הצמודים לאריח שעליו ממוקם השודד,
 * ויש להם לפחות קלף משאב אחד ביד (לא כולל השחקן הנוכחי עצמו).
 */
export function getEligibleRobberyTargets(
  tile: HexTile,
  vertices: BoardVertex[],
  players: Player[],
  robberPlayerId: string
): Player[] {
  const HEX_SIZE = 60;
  const center = cubeToPixel(tile.coord, HEX_SIZE);
  const tileVertices: BoardVertex[] = [];

  vertices.forEach(vertex => {
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i - 30);
      const x = center.x + HEX_SIZE * Math.cos(angleRad);
      const y = center.y + HEX_SIZE * Math.sin(angleRad);

      const roundedX = Math.round(x * 10) / 10;
      const roundedY = Math.round(y * 10) / 10;
      const checkId = `v_${roundedX}_${roundedY}`;

      if (checkId === vertex.id) {
        tileVertices.push(vertex);
        break;
      }
    }
  });

  const candidatePlayerIds = new Set<string>();
  tileVertices.forEach(v => {
    if (v.playerId && v.playerId !== robberPlayerId && (v.structure === 'SETTLEMENT' || v.structure === 'CITY')) {
      candidatePlayerIds.add(v.playerId);
    }
  });

  return players.filter(p => {
    if (!candidatePlayerIds.has(p.id)) return false;
    const totalCards = Object.values(p.resources).reduce((sum, count) => sum + count, 0);
    return totalCards > 0;
  });
}

/**
 * גונב קלף אחד אקראי מהקורבן ומעביר אותו לשודד.
 */
export function stealRandomCard(
  stealerId: string,
  victimId: string,
  players: Player[]
): { updatedPlayers: Player[]; stolenResource: keyof ResourceCards | null } {
  const victim = players.find(p => p.id === victimId);
  const stealer = players.find(p => p.id === stealerId);

  if (!victim || !stealer) return { updatedPlayers: players, stolenResource: null };

  // איסוף כל המשאבים שיש לקורבן
  const availableResources: (keyof ResourceCards)[] = [];
  (Object.keys(victim.resources) as (keyof typeof victim.resources)[]).forEach(res => {
    const count = victim.resources[res] || 0;
    for (let i = 0; i < count; i++) {
      availableResources.push(res);
    }
  });

  if (availableResources.length === 0) {
    return { updatedPlayers: players, stolenResource: null };
  }

  // הגרלת קלף אחד אקראי
  const randomIndex = Math.floor(Math.random() * availableResources.length);
  const stolenResource = availableResources[randomIndex] as keyof typeof victim.resources;

  // עדכון המערך
  const updatedPlayers = players.map(p => {
    if (p.id === victim.id) {
      return {
        ...p,
        resources: {
          ...p.resources,
          [stolenResource]: p.resources[stolenResource] - 1
        }
      };
    }
    if (p.id === stealer.id) {
      return {
        ...p,
        resources: {
          ...p.resources,
          [stolenResource]: p.resources[stolenResource] + 1
        }
      };
    }
    return p;
  });

  return { updatedPlayers, stolenResource };
}
