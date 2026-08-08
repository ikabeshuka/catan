import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getMediumBotTarget } from '../utils/ai/getMediumBotTarget';
import { dispatchGameAction } from '../services/gameDispatcher';
import type { ResourceCards } from '../types/resources.types';

export const useAppTrade = () => {
  const {
    players,
    currentPlayerIndex,
    turnSubPhase,
    setPlayers,
    setEdges,
    setTurnSubPhase,
    addLog,
    edges,
    setRoadBuildingRemaining,
    setActivePortTrade,
    gamePhase,
    tiles,
    vertices,
    activeExpansion,
    selectedScenario,
    isTradeModalOpen,
    setIsTradeModalOpen,
    setActiveRobberType,
    roomId,
    myPlayerId,
    resourceBank,
    setResourceBank,
  } = useGame();

  const activePlayer = players[currentPlayerIndex];
  const humanPlayer = (roomId
    ? players.find(p => p.id === myPlayerId)
    : players.find(p => !p.isBot) || players[0])!;

  // States for dev cards / overlay / trade modals
  const [isDevCardsOverlayOpen, setIsDevCardsOverlayOpen] = useState(false);
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

  const handlePlayCard = (cardType: 'KNIGHT' | 'VICTORY_POINT' | 'MONOPOLY' | 'ROAD_BUILDING' | 'YEAR_OF_PLENTY') => {
    if (roomId && (!myPlayerId || activePlayer?.id !== myPlayerId)) return;
    const canPlayInCurrentPhase = turnSubPhase === 'BEFORE_ROLL' || turnSubPhase === 'TRADE_AND_BUILD';
    if (activePlayer?.id !== humanPlayer.id || !canPlayInCurrentPhase) return;
    if (humanPlayer.playedDevCardThisTurn) {
      alert("כבר שיחקת קלף פיתוח אחד בתור זה!");
      return;
    }
    const devCards: Record<string, number> = humanPlayer.developmentCards || { KNIGHT: 0, VICTORY_POINT: 0, MONOPOLY: 0, ROAD_BUILDING: 0, YEAR_OF_PLENTY: 0 };
    const boughtThisTurn = (humanPlayer.boughtDevCardsThisTurn as Record<string, number> | undefined)?.[cardType] || 0;
    if ((devCards[cardType] || 0) - boughtThisTurn <= 0) {
      alert("לא ניתן לשחק קלף פיתוח שנקנה באותו התור!");
      return;
    }

    if (selectedScenario === 'PIRATE_ISLANDS' && !['KNIGHT', 'VICTORY_POINT'].includes(cardType)) {
      alert('באיי הפיראטים אפשר להשתמש רק בקלף אביר כדי להפוך ספינה לספינת מלחמה.');
      return;
    }

    if (cardType === 'MONOPOLY') {
      setIsMonopolyModalOpen(true);
    } else if (cardType === 'YEAR_OF_PLENTY') {
      setIsYearOfPlentyModalOpen(true);
    } else {
      dispatchGameAction({ type: 'PLAY_DEV_CARD', playerId: humanPlayer.id, cardType }, {
        roomId: roomId || undefined,
        isRemote: false,
        myPlayerId: roomId ? myPlayerId : humanPlayer.id,
        turnSubPhase,
        players,
        setPlayers,
        setTurnSubPhase,
        setActiveRobberType,
        setRoadBuildingRemaining,
        selectedScenario,
        edges,
        setEdges,
        activeExpansion,
        addLog,
      });
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

    if ((resourceBank[receiveType] || 0) < 1) {
      alert('המשאב המבוקש אזל בבנק.');
      return;
    }
    dispatchGameAction({
      type: 'BANK_TRADE',
      playerId: humanPlayer.id,
      offeredResource: giveType,
      requestedResource: receiveType,
      ratio: requiredGiveAmt as 2 | 3 | 4,
    }, {
      roomId: roomId || undefined,
      isRemote: false,
      myPlayerId: roomId ? myPlayerId : humanPlayer.id,
      turnSubPhase,
      players,
      setPlayers,
      resourceBank,
      setResourceBank,
      addLog,
    });

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
    offerResourceOrOfferObj: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' | Record<string, number>,
    offerAmountOrRequestObj?: number | Record<string, number>,
    demandResource?: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE',
    demandAmount?: number
  ): boolean => {
    let offerObj: Partial<ResourceCards>;
    let requestObj: Partial<ResourceCards>;

    if (typeof offerResourceOrOfferObj === 'string') {
      offerObj = { [offerResourceOrOfferObj]: offerAmountOrRequestObj as number };
      requestObj = { [demandResource!]: demandAmount! };
    } else {
      offerObj = offerResourceOrOfferObj as Partial<ResourceCards>;
      requestObj = offerAmountOrRequestObj as Partial<ResourceCards>;
    }

    // Check if bot can actually pay the requestObj
    for (const [res, amt] of Object.entries(requestObj) as [keyof ResourceCards, number][]) {
      if ((bot.resources[res] || 0) < amt) {
        return false;
      }
    }

    const totalOfferAmt = Object.values(offerObj).reduce((sum, a) => sum + a, 0);
    const totalRequestAmt = Object.values(requestObj).reduce((sum, a) => sum + a, 0);

    if (bot.difficulty === 'EASY') {
      return totalOfferAmt >= totalRequestAmt;
    }

    if (bot.difficulty === 'MEDIUM') {
      const target = getMediumBotTarget(bot, gamePhase, tiles, vertices, edges);
      if (target) {
        let isNeeded = false;
        for (const [r, amt] of Object.entries(offerObj) as [keyof ResourceCards, number][]) {
          if (amt > 0 && (bot.resources[r] || 0) < (target.cost[r] || 0)) {
            isNeeded = true;
          }
        }
        if (!isNeeded && totalOfferAmt < totalRequestAmt) {
          return false;
        }
        let isGivingAwayNeeded = false;
        for (const [r, amt] of Object.entries(requestObj) as [keyof ResourceCards, number][]) {
          if (amt > 0 && (target.cost[r] || 0) > 0 && (bot.resources[r] || 0) <= (target.cost[r] || 0)) {
            isGivingAwayNeeded = true;
          }
        }
        if (isGivingAwayNeeded) {
          return false;
        }
        
        const ratio = totalOfferAmt / totalRequestAmt;
        let acceptProbability = 0.85;
        if (ratio < 1) {
          acceptProbability -= 0.35;
        }
        return Math.random() < Math.max(0.1, acceptProbability);
      }
    }

    // HARD DIFFICULTY (or fallback)
    let hasWantedResourceInOffer = false;
    let givingCriticalResource = false;

    for (const [r, amt] of Object.entries(offerObj) as [keyof ResourceCards, number][]) {
      if (amt > 0 && (bot.resources[r] || 0) <= 1) {
        hasWantedResourceInOffer = true;
      }
    }

    for (const [r, amt] of Object.entries(requestObj) as [keyof ResourceCards, number][]) {
      if (amt > 0 && (bot.resources[r] || 0) - amt <= 1) {
        givingCriticalResource = true;
      }
    }

    let acceptProbability = 0.3;

    if (hasWantedResourceInOffer && !givingCriticalResource) {
      acceptProbability = 0.85;
    } else if (givingCriticalResource) {
      acceptProbability = 0.10;
    } else if (!givingCriticalResource && !hasWantedResourceInOffer) {
      acceptProbability = 0.40;
    }

    const ratio = totalOfferAmt / totalRequestAmt;
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
        dispatchGameAction({
          type: 'EXECUTE_PLAYER_TRADE', playerId: humanPlayer.id, targetPlayerId: bot.id,
          offer: { [giveRes]: giveAmt }, request: { [receiveRes]: receiveAmt },
        }, {
          roomId: roomId || undefined, isRemote: false,
          myPlayerId: roomId ? myPlayerId : humanPlayer.id,
          turnSubPhase, players, setPlayers, addLog,
        });
        /* Direct mutation replaced by dispatchGameAction.
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
        */

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
    evaluateBotTradeDecision,
  };
};
