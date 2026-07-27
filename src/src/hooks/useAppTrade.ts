import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { getMediumBotTarget } from '../utils/ai/getMediumBotTarget';

export const useAppTrade = () => {
  const {
    players,
    currentPlayerIndex,
    turnSubPhase,
    setPlayers,
    setTurnSubPhase,
    addLog,
    edges,
    roadBuildingRemaining,
    setRoadBuildingRemaining,
    setActivePortTrade,
    gamePhase,
    tiles,
    vertices,
    activeExpansion,
  } = useGame();

  const activePlayer = players[currentPlayerIndex];
  const humanPlayer = players.find(p => !p.isBot) || players[0];

  // States for dev cards / overlay / trade modals
  const [isDevCardsOverlayOpen, setIsDevCardsOverlayOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isMonopolyModalOpen, setIsMonopolyModalOpen] = useState(false);
  const [isYearOfPlentyModalOpen, setIsYearOfPlentyModalOpen] = useState(false);

  // States for player trading
  const [giveRes, setGiveRes] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('WOOD');
  const [giveAmt, setGiveAmt] = useState<number>(1);
  const [receiveRes, setReceiveRes] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('BRICK');
  const [receiveAmt, setReceiveAmt] = useState<number>(1);
  const [targetBotId, setTargetBotId] = useState<string>('ALL');

  // States for harbor trading
  const [harborGiveRes, setHarborGiveRes] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('WOOD');
  const [harborReceiveRes, setHarborReceiveRes] = useState<'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE'>('BRICK');

  const [prevRoadCount, setPrevRoadCount] = useState<number>(0);
  const [prevShipCount, setPrevShipCount] = useState<number>(0);

  // Track free road / ship building from Road Building card
  useEffect(() => {
    if (!humanPlayer) return;
    const currentRoadCount = edges.filter(e => e.hasRoad && e.playerId === humanPlayer.id).length;
    const currentShipCount = edges.filter(e => e.hasShip && e.shipPlayerId === humanPlayer.id).length;

    if (roadBuildingRemaining > 0) {
      if (currentRoadCount > prevRoadCount) {
        const diff = currentRoadCount - prevRoadCount;
        const nextRemaining = Math.max(0, roadBuildingRemaining - diff);
        setRoadBuildingRemaining(nextRemaining);
        addLog(`[בניית כבישים] כביש חינם נבנה בהצלחה! נותרו עוד ${nextRemaining} מבנים חינם לבנייה.`);
      } else if (currentShipCount > prevShipCount && activeExpansion === 'SEAFARERS') {
        const diff = currentShipCount - prevShipCount;
        const nextRemaining = Math.max(0, roadBuildingRemaining - diff);
        setRoadBuildingRemaining(nextRemaining);
        addLog(`[בניית ספינות] ספינה חינם נבנתה בהצלחה! נותרו עוד ${nextRemaining} מבנים חינם לבנייה.`);
      }
    }
    setPrevRoadCount(currentRoadCount);
    setPrevShipCount(currentShipCount);
  }, [edges, humanPlayer?.id, roadBuildingRemaining, activeExpansion, prevRoadCount, prevShipCount]);

  const handlePlayCard = (cardType: 'KNIGHT' | 'MONOPOLY' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY') => {
    if (activePlayer?.id !== humanPlayer.id || turnSubPhase !== 'TRADE_AND_BUILD') return;
    if (humanPlayer.playedDevCardThisTurn) {
      alert("כבר שיחקת קלף פיתוח אחד בתור זה!");
      return;
    }
    const devCards = humanPlayer.developmentCards || { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0 };
    const boughtThisTurn = humanPlayer.boughtDevCardsThisTurn?.[cardType] || 0;
    if ((devCards[cardType] || 0) - boughtThisTurn <= 0) {
      alert("לא ניתן לשחק קלף פיתוח שנקנה באותו התור!");
      return;
    }

    if (cardType === 'KNIGHT') {
      setPlayers((prevPlayers: any[]) => prevPlayers.map(p => {
        if (p.id === humanPlayer.id) {
          return {
            ...p,
            knightsPlayed: (p.knightsPlayed || 0) + 1,
            playedDevCardThisTurn: true,
            developmentCards: {
              ...p.developmentCards,
              KNIGHT: Math.max(0, p.developmentCards.KNIGHT - 1)
            }
          };
        }
        return p;
      }));
      setTurnSubPhase('ROBBER_PLACEMENT');
      addLog(`[קלף פיתוח] ${humanPlayer.name} הפעיל קלף אביר ומזיז את השודד!`);
    } else if (cardType === 'MONOPOLY') {
      setIsMonopolyModalOpen(true);
    } else if (cardType === 'ROAD_BUILDING') {
      setPlayers((prevPlayers: any[]) => prevPlayers.map(p => {
        if (p.id === humanPlayer.id) {
          return {
            ...p,
            playedDevCardThisTurn: true,
            developmentCards: {
              ...p.developmentCards,
              ROAD_BUILDING: Math.max(0, p.developmentCards.ROAD_BUILDING - 1)
            }
          };
        }
        return p;
      }));
      setRoadBuildingRemaining(2);
      setPrevRoadCount(edges.filter(e => e.hasRoad && e.playerId === humanPlayer.id).length);
      setPrevShipCount(edges.filter(e => e.hasShip && e.shipPlayerId === humanPlayer.id).length);
      if (activeExpansion === 'SEAFARERS') {
        addLog(`[קלף פיתוח] ${humanPlayer.name} הפעיל קלף בניית כבישים ומקבל 2 בנייות חינם (דרכים או ספינות)!`);
      } else {
        addLog(`[קלף פיתוח] ${humanPlayer.name} הפעיל קלף בניית כבישים ומקבל 2 כבישים חינם לבנייה!`);
      }
    } else if (cardType === 'YEAR_OF_PLENTY') {
      setIsYearOfPlentyModalOpen(true);
    }
  };

  const executeHarborTrade = (
    giveType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE',
    receiveType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE',
    requiredGiveAmt: number
  ) => {
    if (giveType === receiveType) {
      alert("לא ניתן להחליף משאב בעצמו!");
      return;
    }
    const currentStock = humanPlayer.resources[giveType] || 0;
    if (currentStock < requiredGiveAmt) {
      alert(`אין לך מספיק משאבים מסוג ${giveType} (נדרש ${requiredGiveAmt}, יש לך ${currentStock})!`);
      return;
    }

    setPlayers((prev: any[]) => prev.map(p => 
      p.id === humanPlayer.id ? {
        ...p,
        resources: {
          ...p.resources,
          [giveType]: p.resources[giveType] - requiredGiveAmt,
          [receiveType]: (p.resources[receiveType] || 0) + 1
        }
      } : p
    ));

    const resourceLabels: Record<string, string> = {
      WOOD: 'עץ',
      BRICK: 'לבנה',
      SHEEP: 'כבש',
      WHEAT: 'חיטה',
      ORE: 'ברזל'
    };

    addLog(`[נמל] ${humanPlayer.name} ניצל נמל והחליף ${requiredGiveAmt} ${resourceLabels[giveType]} תמורת 1 ${resourceLabels[receiveType]}.`);
    setActivePortTrade(null);
  };

  const evaluateBotTradeDecision = (
    bot: typeof humanPlayer,
    offerResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE',
    offerAmount: number,
    demandResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE',
    demandAmount: number
  ): boolean => {
    const botStock = bot.resources[demandResource] || 0;
    if (botStock < demandAmount) {
      return false;
    }

    if (bot.difficulty === 'EASY' && offerAmount === 1 && demandAmount === 1) {
      return true;
    }

    const res = bot.resources;

    if (bot.difficulty === 'MEDIUM') {
      const target = getMediumBotTarget(bot, gamePhase, tiles, vertices, edges);
      if (target) {
        const isNeeded = (bot.resources[offerResource] || 0) < (target.cost[offerResource] || 0);
        if (!isNeeded) {
          return false;
        }
        const isGivingAwayNeeded = (target.cost[demandResource] || 0) > 0 && (bot.resources[demandResource] || 0) <= (target.cost[demandResource] || 0);
        if (isGivingAwayNeeded) {
          return false;
        }
        
        const ratio = offerAmount / demandAmount;
        let acceptProbability = 0.85;
        if (ratio < 1) {
          acceptProbability -= 0.35;
        }
        return Math.random() < Math.max(0.1, acceptProbability);
      }
    }

    const ROAD_COST = { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 };
    const SETTLEMENT_COST = { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 };
    const CITY_COST = { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 };

    const getMissingResources = (cost: typeof ROAD_COST) => {
      let missingCount = 0;
      const missingMap: Record<string, number> = {};
      let isAffordable = true;

      for (const key of ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const) {
        const needed = cost[key] || 0;
        const current = res[key] || 0;
        if (current < needed) {
          isAffordable = false;
          const diff = needed - current;
          missingCount += diff;
          missingMap[key] = diff;
        }
      }
      return { isAffordable, missingCount, missingMap };
    };

    const roadInfo = getMissingResources(ROAD_COST);
    const settlementInfo = getMissingResources(SETTLEMENT_COST);
    const cityInfo = getMissingResources(CITY_COST);

    const goals = [
      { name: 'ROAD', ...roadInfo, cost: ROAD_COST },
      { name: 'SETTLEMENT', ...settlementInfo, cost: SETTLEMENT_COST },
      { name: 'CITY', ...cityInfo, cost: CITY_COST }
    ];

    const pendingGoals = goals.filter(g => !g.isAffordable && g.missingCount > 0);
    pendingGoals.sort((a, b) => a.missingCount - b.missingCount);

    const closestGoal = pendingGoals[0];
    const isNeededForClosestGoal = closestGoal && (closestGoal.missingMap[offerResource] || 0) > 0;
    const isCritical = closestGoal && 
      (closestGoal.cost[demandResource] || 0) > 0 && 
      (res[demandResource] || 0) <= (closestGoal.cost[demandResource] || 0);

    let acceptProbability = 0.3;

    if (isNeededForClosestGoal && !isCritical) {
      acceptProbability = 0.85;
    } else if (isCritical) {
      acceptProbability = 0.10;
    } else if (!isCritical && !isNeededForClosestGoal) {
      acceptProbability = 0.40;
    }

    const ratio = offerAmount / demandAmount;
    if (ratio >= 2) {
      acceptProbability += 0.40;
    } else if (ratio > 1) {
      acceptProbability += 0.20;
    } else if (ratio < 1) {
      acceptProbability -= 0.35;
    }

    acceptProbability = Math.max(0, Math.min(1, acceptProbability));
    return Math.random() < acceptProbability;
  };

  const handleProposeTrade = () => {
    const playerStock = humanPlayer.resources[giveRes] || 0;
    if (playerStock < giveAmt) {
      alert(`אין לך מספיק משאבים מסוג ${giveRes} (יש לך ${playerStock})!`);
      return;
    }

    if (giveRes === receiveRes) {
      alert("לא ניתן לבצע עסקה על אותו משאב!");
      return;
    }

    const botsToTrade = players.filter(p => p.isBot && (targetBotId === 'ALL' || p.id === targetBotId));

    if (botsToTrade.length === 0) {
      alert("לא נמצאו בוטים מתאימים למסחר.");
      return;
    }

    let tradeExecuted = false;

    for (const bot of botsToTrade) {
      const botAgreed = evaluateBotTradeDecision(bot, giveRes, giveAmt, receiveRes, receiveAmt);

      if (botAgreed) {
        setPlayers((prevPlayers: any[]) => prevPlayers.map(p => {
          if (p.id === humanPlayer.id) {
            return {
              ...p,
              resources: {
                ...p.resources,
                [giveRes]: (p.resources[giveRes] || 0) - giveAmt,
                [receiveRes]: (p.resources[receiveRes] || 0) + receiveAmt
              }
            };
          } else if (p.id === bot.id) {
            return {
              ...p,
              resources: {
                ...p.resources,
                [giveRes]: (p.resources[giveRes] || 0) + giveAmt,
                [receiveRes]: (p.resources[receiveRes] || 0) - receiveAmt
              }
            };
          }
          return p;
        }));

        addLog(`[מסחר] בוט ${bot.name} קיבל את ההצעה שלך והעסקה בוצעה!`);
        tradeExecuted = true;
        setIsTradeModalOpen(false);
        break;
      } else {
        addLog(`[מסחר] בוט ${bot.name} סירב להצעת המסחר שלך.`);
      }
    }

    if (!tradeExecuted) {
      alert("כל הבוטים סירבו להצעת המסחר שלך.");
    }
  };

  return {
    isDevCardsOverlayOpen,
    setIsDevCardsOverlayOpen,
    isTradeModalOpen,
    setIsTradeModalOpen,
    isMonopolyModalOpen,
    setIsMonopolyModalOpen,
    isYearOfPlentyModalOpen,
    setIsYearOfPlentyModalOpen,
    giveRes,
    setGiveRes,
    giveAmt,
    setGiveAmt,
    receiveRes,
    setReceiveRes,
    receiveAmt,
    setReceiveAmt,
    targetBotId,
    setTargetBotId,
    harborGiveRes,
    setHarborGiveRes,
    harborReceiveRes,
    setHarborReceiveRes,
    handlePlayCard,
    executeHarborTrade,
    handleProposeTrade,
  };
};
