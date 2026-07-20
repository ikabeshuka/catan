import { Player } from '../../../types/player.types';

interface HandleRiskManagementParams {
  botPlayer: Player;
  getTradeRatio: (res: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE') => number;
  resourceLabels: Record<string, string>;
  addLog?: (message: string) => void;
}

export function handleRiskManagement({
  botPlayer,
  getTradeRatio,
  resourceLabels,
  addLog
}: HandleRiskManagementParams): { updatedBot: Player; buildHappened: boolean } {
  const currentBot = { ...botPlayer, resources: { ...botPlayer.resources } };
  const resourcesList = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;
  let totalCards = Object.values(currentBot.resources).reduce((sum, count) => sum + (count || 0), 0);
  let buildHappened = false;

  let attempts = 0;
  while (totalCards >= 8 && attempts < 5) {
    attempts++;
    let traded = false;

    for (const r of resourcesList) {
      const ratio = getTradeRatio(r);
      if ((currentBot.resources[r] || 0) >= ratio) {
        let targetRes: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
        let minCount = 999;

        for (const otherRes of resourcesList) {
          if (otherRes !== r && (currentBot.resources[otherRes] || 0) < minCount) {
            minCount = currentBot.resources[otherRes] || 0;
            targetRes = otherRes;
          }
        }

        if (targetRes) {
          currentBot.resources[r] = (currentBot.resources[r] || 0) - ratio;
          currentBot.resources[targetRes] = (currentBot.resources[targetRes] || 0) + 1;
          buildHappened = true;
          traded = true;
          totalCards = Object.values(currentBot.resources).reduce((sum, count) => sum + (count || 0), 0);

          if (addLog) {
            addLog(`[ניהול סיכונים] בוט ${botPlayer.name} (קשה) ביצע המרה מהירה של ${ratio} ${resourceLabels[r]} ל-1 ${resourceLabels[targetRes]} כדי לרדת מתחת ל-8 קלפים (מונע סיכון מרוסטר 7).`);
          }
          break;
        }
      }
    }

    if (!traded) {
      break;
    }
  }

  return { updatedBot: currentBot, buildHappened };
}
