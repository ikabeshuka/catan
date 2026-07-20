import { AIStrategy, StrategicTradeResult } from './types';

export const cityDevStrategy: AIStrategy = {
  name: 'CITY_DEV_BURST',
  label: 'שדרוג לערים וקלפי פיתוח (ברזל/חיטה)',
  executeStrategicTrade({
    botPlayer,
    getTradeRatio,
    resourceLabels,
    addLog
  }): StrategicTradeResult | null {
    const devCardCost = { SHEEP: 1, WHEAT: 1, ORE: 1 };
    const cityCost = { WHEAT: 2, ORE: 3 };
    const resourcesList = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;

    const currentBot = { ...botPlayer, resources: { ...botPlayer.resources } };
    const currentResources = currentBot.resources;
    let buildHappened = false;

    let missingDevCardRes: 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
    let missingDevCardCount = 0;
    for (const r of ['SHEEP', 'WHEAT', 'ORE'] as const) {
      if ((currentResources[r] || 0) < devCardCost[r]) {
        missingDevCardCount++;
        missingDevCardRes = r;
      }
    }
    
    let missingCityRes: 'WHEAT' | 'ORE' | null = null;
    let missingCityCount = 0;
    for (const r of ['WHEAT', 'ORE'] as const) {
      if ((currentResources[r] || 0) < cityCost[r]) {
        missingCityCount++;
        missingCityRes = r;
      }
    }

    if (missingCityCount === 1 && missingCityRes) {
      for (const r of resourcesList) {
        const ratio = getTradeRatio(r);
        if ((currentResources[r] || 0) >= ratio && r !== missingCityRes) {
          currentResources[r] -= ratio;
          currentResources[missingCityRes] = (currentResources[missingCityRes] || 0) + 1;
          buildHappened = true;
          if (addLog) {
            addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingCityRes]} כדי לשדרג מהר לעיר כחלק מאסטרטגיית פריצה לערים.`);
          }
          break;
        }
      }
    } else if (missingDevCardCount === 1 && missingDevCardRes && !buildHappened) {
      for (const r of resourcesList) {
        const ratio = getTradeRatio(r);
        if ((currentResources[r] || 0) >= ratio && r !== missingDevCardRes) {
          currentResources[r] -= ratio;
          currentResources[missingDevCardRes] = (currentResources[missingDevCardRes] || 0) + 1;
          buildHappened = true;
          if (addLog) {
            addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) המיר ${ratio} קלפי ${resourceLabels[r]} תמורת 1 ${resourceLabels[missingDevCardRes]} לקניית קלפי פיתוח.`);
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
