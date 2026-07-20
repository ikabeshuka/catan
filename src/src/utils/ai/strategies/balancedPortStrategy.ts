import { AIStrategy, StrategicTradeResult } from './types';

export const balancedPortStrategy: AIStrategy = {
  name: 'BALANCED_PORT_TRADE',
  label: 'מסחר נמלים מאוזן',
  executeStrategicTrade({
    botPlayer,
    vertices,
    getTradeRatio,
    resourceLabels,
    addLog
  }): StrategicTradeResult | null {
    const resourcesList = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;
    const GOALS = [
      { type: 'CITY', cost: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 } },
      { type: 'SETTLEMENT', cost: { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 } },
      { type: 'ROAD', cost: { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      { type: 'DEV_CARD', cost: { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 } }
    ];

    const currentBot = { ...botPlayer, resources: { ...botPlayer.resources } };
    const currentResources = currentBot.resources;
    let buildHappened = false;

    // Find our specialized ports
    const ownedPorts = vertices.filter(v =>
      v.playerId === botPlayer.id &&
      (v.structure === 'SETTLEMENT' || v.structure === 'CITY') &&
      v.isHarbor && v.harborType && v.harborType !== 'GENERIC'
    );
    
    if (ownedPorts.length > 0) {
      // We have a specialized port! Let's trade our port resource for what we are missing for the closest goal.
      const portRes = ownedPorts[0].harborType as 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
      const portStock = currentResources[portRes] || 0;
      
      if (portStock >= 2) {
        // Find missing resource for our goals
        let missingRes: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | null = null;
        for (const goal of GOALS) {
          for (const needed of resourcesList) {
            if ((currentResources[needed] || 0) < goal.cost[needed]) {
              missingRes = needed;
              break;
            }
          }
          if (missingRes) break;
        }
        
        if (missingRes && missingRes !== portRes) {
          currentResources[portRes] -= 2;
          currentResources[missingRes] = (currentResources[missingRes] || 0) + 1;
          buildHappened = true;
          if (addLog) {
            addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) ניצל נמל 2:1 מועדף מסוג ${resourceLabels[portRes]} והחליף 2 תמורת 1 ${resourceLabels[missingRes]}.`);
          }
        }
      } else {
        // If we don't have enough of the port resource, try to trade OTHER surplus resources to get the port resource!
        // So that we can use it on future turns.
        for (const r of resourcesList) {
          if (r !== portRes) {
            const ratio = getTradeRatio(r);
            if ((currentResources[r] || 0) >= ratio) {
              currentResources[r] -= ratio;
              currentResources[portRes] = (currentResources[portRes] || 0) + 1;
              buildHappened = true;
              if (addLog) {
                addLog(`[מסחר אסטרטגי] בוט SUPER_HARD (${botPlayer.name}) צבר משאב נמל מועדף על ידי החלפת ${ratio} ${resourceLabels[r]} ל-1 ${resourceLabels[portRes]}.`);
              }
              break;
            }
          }
        }
      }
    }

    if (buildHappened) {
      return { buildHappened, updatedBot: currentBot };
    }
    return null;
  }
};
