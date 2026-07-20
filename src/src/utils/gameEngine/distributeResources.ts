import { HexTile } from '../../types/hex.types';
import { BoardVertex } from '../../types/boardElements.types';
import { Player } from '../../types/player.types';
import { cubeToPixel } from '../hexMath/cubeToPixel';
import { GoldSelectionPending } from '../../context/PlayerContext';

const HEX_SIZE = 60;

export interface ResourceFlow {
  id: string;
  resourceType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
  from: { x: number; y: number };
  playerName: string;
  isHuman: boolean;
  amount: number;
}

/**
 * מחשבת ומחלקת משאבים לשחקנים בהתאם לתוצאת הקוביות שהוטלו.
 * מחזירה מערך שחקנים חדש ומעודכן ואת פירוט המשאבים ה'עפים'.
 */
export function distributeResources(
  diceRoll: number,
  tiles: HexTile[],
  vertices: BoardVertex[],
  players: Player[]
): { updatedPlayers: Player[]; flows: ResourceFlow[]; goldSelections: GoldSelectionPending[] } {
  // אם יצא 7, אף שחקן לא מקבל משאבים (השודד מופעל - נטפל בזה בהמשך בנפרד)
  if (diceRoll === 7) return { updatedPlayers: players, flows: [], goldSelections: [] };

  // 1. יצירת עותק עמוק של השחקנים כדי לשמור על עקרון האימוטביליות ב-React
  const updatedPlayers = players.map(player => ({
    ...player,
    resources: { ...player.resources }
  }));

  const flows: ResourceFlow[] = [];
  const goldSelections: GoldSelectionPending[] = [];

  // יצירת מפה (Map) של הצמתים לפי ה-ID שלהם לגישה מהירה ב-O(1)
  const vertexMap = new Map<string, BoardVertex>(vertices.map(v => [v.id, v]));

  // 2. סינון האריחים שמתאימים למספר שהוטל בקוביות ושאין עליהם שודד
  const activeTiles = tiles.filter(tile => tile.numberToken === diceRoll && !tile.hasRobber);

  // 3. ריצה על כל האריחים הפעילים וחלוקת המשאבים
  activeTiles.forEach((tile) => {
    // מציאת מרכז האריח בפיקסלים
    const center = cubeToPixel(tile.coord, HEX_SIZE);

    // בדיקת 6 הצמתים שמקיפים את האריח הנוכחי
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i - 30);
      const x = center.x + HEX_SIZE * Math.cos(angleRad);
      const y = center.y + HEX_SIZE * Math.sin(angleRad);

      const roundedX = Math.round(x * 10) / 10;
      const roundedY = Math.round(y * 10) / 10;
      const vertexId = `v_${roundedX}_${roundedY}`;

      // שליפת הנתונים הסטטיים של הצומת הזה מהמפה
      const vertex = vertexMap.get(vertexId);

      // אם יש מבנה על הצומת ויש לו שחקן משויך
      if (vertex && vertex.playerId && vertex.structure !== 'NONE') {
        // מציאת השחקן במערך המעודכן שלנו
        const playerToReward = updatedPlayers.find(p => p.id === vertex.playerId);

        if (playerToReward) {
          // קביעת כמות המשאבים: יישוב נותן 1, עיר נותנת 2
          const amountToGive = vertex.structure === 'SETTLEMENT' ? 1 : 2;
          
          if (tile.type === 'GOLD_FIELD') {
            goldSelections.push({
              playerId: playerToReward.id,
              amount: amountToGive,
              tileId: tile.id
            });
          } else {
            // הוספת המשאב לארנק של השחקן (רק עבור משאבים חוקיים שמיוצרים)
            const resourceType = tile.type;
            if (
              resourceType === 'WOOD' ||
              resourceType === 'BRICK' ||
              resourceType === 'SHEEP' ||
              resourceType === 'WHEAT' ||
              resourceType === 'ORE'
            ) {
              playerToReward.resources[resourceType] += amountToGive;

              // יצירת פריטי תנועה ("עופים") של המשאב לשחקן
              for (let j = 0; j < amountToGive; j++) {
                flows.push({
                  id: `flow_${tile.id}_${vertex.id}_${j}_${Date.now()}_${Math.random()}`,
                  resourceType: resourceType,
                  from: { x: center.x, y: center.y },
                  playerName: playerToReward.name,
                  isHuman: !playerToReward.isBot,
                  amount: 1
                });
              }
            }
          }
        }
      }
    }
  });

  return { updatedPlayers, flows, goldSelections };
}
