import { AIStrategy, StrategicTradeResult } from './types';

export const longestRoadStrategy: AIStrategy = {
  name: 'LONG_ROAD_EXPANSION',
  label: 'התפרסות ובניית דרכים (עץ/לבנה)',
  executeStrategicTrade({
    botPlayer,
    getTradeRatio,
    resourceLabels,
    addLog
  }): StrategicTradeResult | null {
    const settlementCost = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1 };
    const roadCost = { WOOD: 1, BRICK: 1 };
    
    const currentBot = { ...botPlayer, resources: { ...botPlayer.resources } };
    const currentResources = currentBot.resources;
    let buildHappened = false;

    let missingSettlementRes: 'WOOD' | 'BRICK' | null = null;
    let missingSettlementCount = 0;
    for (const r of ['WOOD', 'BRICK'] as const) {
      if ((currentResources[r] || 0) < settlementCost[r]) {
        missingSettlementCount++;
        missingSettlementRes = r;
      }
    }
    
    let missingRoadRes: 'WOOD' | 'BRICK' | null = null;
    let missingRoadCount = 0;
    for (const r of ['WOOD', 'BRICK'] as const) {
      if ((currentResources[r] || 0) < roadCost[r]) {
        missingRoadCount++;
        missingRoadRes = r;
      }
    }

    if (missingSettlementCount === 1 && missingSettlementRes) {
      for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
        const ratio = getTradeRatio(r);
        if ((currentResources[r] || 0) >= ratio) {
          currentResources[r] -= ratio;
          currentResources[missingSettlementRes] = (currentResources[missingSettlementRes] || 0) + 1;
          buildHappened = true;
          if (addLog) {
            addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingSettlementRes]} כדי לבנות יישוב כחלק מאסטרטגיית התפרסות דרכים.`);
          }
          break;
        }
      }
    } else if (missingRoadCount === 1 && missingRoadRes && !buildHappened) {
      for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
        const ratio = getTradeRatio(r);
        if ((currentResources[r] || 0) >= ratio) {
          currentResources[r] -= ratio;
          currentResources[missingRoadRes] = (currentResources[missingRoadRes] || 0) + 1;
          buildHappened = true;
          if (addLog) {
            addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingRoadRes]} כדי לבנות כבישים ארוכים.`);
          }
          break;
        }
      }
    }

    if (buildHappened) {
      return { buildHappened, updatedBot: currentBot };
    }
    return null;
  }
};
