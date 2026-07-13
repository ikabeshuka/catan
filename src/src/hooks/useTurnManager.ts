import { useGame } from '../context/GameContext';
import { rollDice } from '../utils/gameEngine/rollDice';
import { distributeResources } from '../utils/gameEngine/distributeResources';
import { distributeInitialResources } from '../utils/gameEngine/distributeInitialResources';
import { GamePhase } from '../context/GameContext';
import { Player } from '../types/player.types';
import { ResourceType, ResourceCards } from '../types/resources.types';

export function useTurnManager() {
  const {
    tiles,
    vertices,
    players,
    currentPlayerIndex,
    gamePhase,
    turnSubPhase,
    setPlayers,
    setCurrentPlayerIndex,
    setTurnSubPhase,
    setGamePhase,
    addLog,
    setupState,
    setSetupState,
    setResourceFlows,
    isRolling,
    setIsRolling,
    setRollValues,
    setLastRoll
  } = useGame();

  const { devCardDeck, setDevCardDeck, createTurnSnapshot, undoTurnActions } = useGame();
  const currentPlayer = players[currentPlayerIndex];
  const isSetupPhase = gamePhase === 'SETUP_ROUND_1' || gamePhase === 'SETUP_ROUND_2';

  const getNextTurnConfig = (currentIndex: number, currentPhase: GamePhase, playersCount: number) => {
    if (currentPhase === 'SETUP_ROUND_1') {
      if (currentIndex < playersCount - 1) {
        return { nextIndex: currentIndex + 1, nextPhase: 'SETUP_ROUND_1' as GamePhase };
      } else {
        return { nextIndex: playersCount - 1, nextPhase: 'SETUP_ROUND_2' as GamePhase };
      }
    }
    if (currentPhase === 'SETUP_ROUND_2') {
      if (currentIndex > 0) {
        return { nextIndex: currentIndex - 1, nextPhase: 'SETUP_ROUND_2' as GamePhase };
      } else {
        return { nextIndex: 0, nextPhase: 'MAIN_GAME' as GamePhase };
      }
    }
    return { nextIndex: (currentIndex + 1) % playersCount, nextPhase: 'MAIN_GAME' as GamePhase };
  };

  const startTurn = () => {
    console.log(`[TurnManager] Turn Started for: ${currentPlayer?.name} (ID: ${currentPlayer?.id}). Phase: ${gamePhase}, SubPhase: ${turnSubPhase}`);
    if (currentPlayer && !currentPlayer.isBot) {
      createTurnSnapshot();
    }
    // Check for win condition at the very start of the turn
    if (checkIfGameEnds(currentPlayer)) {
      return;
    }
    // If not game over, proceed with the turn (e.g., allow dice roll)
    // This effectively sets the sub-phase to BEFORE_ROLL if not already set
    setTurnSubPhase('BEFORE_ROLL');
  };

  /**
   * הטלת קוביות: אם יוצא 7, עוברים למצב שודד
   */
  const handleDiceRoll = () => {
    if (isSetupPhase || turnSubPhase !== 'BEFORE_ROLL' || isRolling) return null;

    setIsRolling(true);

    const interval = setInterval(() => {
      setRollValues({
        d1: Math.floor(Math.random() * 6) + 1,
        d2: Math.floor(Math.random() * 6) + 1,
      });
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      const diceResult = rollDice();
      
      setLastRoll({ d1: diceResult.dice1, d2: diceResult.dice2 });
      setRollValues({ d1: diceResult.dice1, d2: diceResult.dice2 });
      setIsRolling(false);

      addLog(`${currentPlayer.name} הטיל קוביות וקיבל ${diceResult.total}!`);

      if (diceResult.total === 7) {
        addLog(`המספר 7 עלה! השודד הופעל.`);
        
        const humanPlayer = players.find(p => !p.isBot);
        const humanTotalCards = humanPlayer ? Object.values(humanPlayer.resources).reduce((a, b) => a + b, 0) : 0;
        const humanNeedsToDiscard = humanTotalCards > 7;

        if (humanNeedsToDiscard) {
          addLog(`השודד הגיע! שחקן אנושי מחזיק ${humanTotalCards} קלפים ונאלץ לזרוק ${Math.floor(humanTotalCards / 2)} קלפים לקופה.`);
          setTurnSubPhase('DISCARD_PHASE');
        } else {
          addLog(`השודד הופעל. יש למקם את השודד באריח חדש.`);
          setTurnSubPhase('ROBBER_PLACEMENT');
        }
        
        // חוק חצי הקלפים: שחקנים עם יותר מ-7 קלפים מאבדים חצי (לוגיקה פשוטה)
        setPlayers((prevPlayers: Player[]) => prevPlayers.map(p => {
          if (!p.isBot && humanNeedsToDiscard) {
            // שחקן אנושי יזרוק ידנית בשלב ה-DISCARD_PHASE
            return p;
          }
          const totalCards = Object.values(p.resources).reduce((a, b) => a + b, 0);
          if (totalCards > 7) {
            const toDiscard = Math.floor(totalCards / 2);
            addLog(`שחקן ${p.name} מחזיק ${totalCards} קלפים ונאלץ לזרוק ${toDiscard} קלפים לקופה.`);
            // לצורך פשטות המנוע, נוריד זמנית מהמשאבים הזמינים ביותר שלו
            const updatedRes = { ...p.resources };
            let discarded = 0;
            (Object.keys(updatedRes) as (keyof ResourceCards)[]).forEach(k => {
              while (updatedRes[k] > 0 && discarded < toDiscard) {
                updatedRes[k]--;
                discarded++;
              }
            });
            return { ...p, resources: updatedRes };
          }
          return p;
        }));
      } else {
        const { updatedPlayers, flows } = distributeResources(diceResult.total, tiles, vertices, players);
        setResourceFlows(flows);
        
        // Compare resources before and after distribution to log who received what
        players.forEach((oldPlayer) => {
          const newPlayer = updatedPlayers.find(p => p.id === oldPlayer.id);
          if (newPlayer) {
            const received: string[] = [];
            (Object.keys(oldPlayer.resources) as (keyof ResourceCards)[]).forEach((resKey) => {
              const diff = newPlayer.resources[resKey] - oldPlayer.resources[resKey];
              if (diff > 0) {
                const resLabel = resKey === 'WOOD' ? 'עץ' : resKey === 'BRICK' ? 'לבנה' : resKey === 'SHEEP' ? 'כבש' : resKey === 'WHEAT' ? 'חיטה' : 'ברזל';
                received.push(`${diff} ${resLabel}`);
              }
            });
            if (received.length > 0) {
              addLog(`${oldPlayer.name} קיבל ${received.join(' ו-')} מהקוביות.`);
            }
          }
        });

        setPlayers(updatedPlayers);
        setTurnSubPhase('TRADE_AND_BUILD');
      }
    }, 600);

    return null;
  };

  /**
   * מסחר מול הבנק (יחס ברירת מחדל של 4 ל-1, או משופר באמצעות נמלים)
   */
  const tradeWithBank = (giveResource: ResourceType, receiveResource: ResourceType) => {
    if (turnSubPhase !== 'TRADE_AND_BUILD') return false;
    if (giveResource === 'DESERT' || receiveResource === 'DESERT') return false;
    
    const giveKey = giveResource as keyof ResourceCards;
    const receiveKey = receiveResource as keyof ResourceCards;

    // בדיקה האם יש לשחקן הנוכחי יישוב או עיר על אחד מהקודקודים של הנמלים
    const ownedHarbors = vertices.filter(v => 
      v.playerId === currentPlayer.id && 
      (v.structure === 'SETTLEMENT' || v.structure === 'CITY') && 
      v.isHarbor
    );

    const hasSpecializedHarbor = ownedHarbors.some(h => h.harborType === giveResource);
    const hasGenericHarbor = ownedHarbors.some(h => h.harborType === 'GENERIC');

    let requiredCount = 4;
    let usedHarborType: string | null = null;

    if (hasSpecializedHarbor) {
      requiredCount = 2;
      usedHarborType = giveResource;
    } else if (hasGenericHarbor) {
      requiredCount = 3;
      usedHarborType = 'GENERIC';
    }
    
    if (currentPlayer.resources[giveKey] < requiredCount) {
      if (!currentPlayer.isBot) {
        addLog(`אין לך מספיק משאבים מסוג ${giveResource} בשביל מסחר של ${requiredCount}:1.`);
      }
      return false;
    }

    setPlayers((prev: Player[]) => prev.map(p => 
      p.id === currentPlayer.id ? {
        ...p,
        resources: {
          ...p.resources,
          [giveKey]: p.resources[giveKey] - requiredCount,
          [receiveKey]: p.resources[receiveKey] + 1
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

    const giveLabel = resourceLabels[giveKey] || giveResource;
    const receiveLabel = resourceLabels[receiveKey] || receiveResource;

    if (usedHarborType) {
      const harborLabel = usedHarborType === 'GENERIC' ? '3:1 כללי' : `${resourceLabels[usedHarborType] || usedHarborType} 2:1`;
      addLog(`[נמל] ${currentPlayer.name} ניצל נמל ${harborLabel} והחליף משאבים ביחס משופר!`);
    }

    addLog(`${currentPlayer.name} ביצע מסחר מול הבנק: החליף ${requiredCount} ${giveLabel} תמורת 1 ${receiveLabel}.`);
    return true;
  };

  /**
   * רכישת קלף פיתוח (עלות: כבש, חיטה, ברזל)
   */
  const buyDevelopmentCard = () => {
    console.log(`[TurnManager] Player ${currentPlayer?.name} attempting to buy development card. Resources before:`, currentPlayer?.resources);
    if (turnSubPhase !== 'TRADE_AND_BUILD') return false;
    const res = currentPlayer.resources;

    if (res.SHEEP < 1 || res.WHEAT < 1 || res.ORE < 1) {
      addLog(`אין לך מספיק משאבים לרכישת קלף פיתוח (נדרש: כבש, חיטה, ברזל).`);
      return false;
    }

    if (!devCardDeck || devCardDeck.length === 0) {
      addLog(`חפיסת קלפי הפיתוח ריקה! לא נותרו קלפים לרכישה.`);
      return false;
    }

    // Draw card from deck:
    const deckCopy = [...devCardDeck];
    const drawnCard = deckCopy.shift()!;
    setDevCardDeck(deckCopy);

    setPlayers((prev: Player[]) => prev.map(p => {
      if (p.id === currentPlayer.id) {
        const updatedPlayer = {
          ...p,
          resources: {
            ...p.resources,
            SHEEP: p.resources.SHEEP - 1,
            WHEAT: p.resources.WHEAT - 1,
            ORE: p.resources.ORE - 1
          }
        };
        // If it's a victory point card (win1, win2, win3, wun4, win5, win6)
        if (drawnCard.startsWith('win') || drawnCard.startsWith('wun')) {
          updatedPlayer.victoryPoints += 1;
          updatedPlayer.developmentCards = {
            ...updatedPlayer.developmentCards,
            VICTORY_POINT: (updatedPlayer.developmentCards.VICTORY_POINT || 0) + 1
          };
        } else {
          const cardKey = drawnCard as 'KNIGHT' | 'ROAD_BUILDING' | 'MONOPOLY' | 'YEAR_OF_PLENTY';
          updatedPlayer.developmentCards = {
            ...updatedPlayer.developmentCards,
            [cardKey]: (updatedPlayer.developmentCards[cardKey] || 0) + 1
          };
        }
        return updatedPlayer;
      }
      return p;
    }));

    const cardNamesHE: Record<string, string> = {
      KNIGHT: 'אביר',
      ROAD_BUILDING: 'בניית 2 דרכים',
      YEAR_OF_PLENTY: 'שנת שפע',
      MONOPOLY: 'מונופול'
    };
    const cardName = cardNamesHE[drawnCard] || 'נקודת ניצחון';

    addLog(`${currentPlayer.name} רכש קלף פיתוח מהקופה וקיבל: ${cardName}.`);
    return true;
  };

  const recordSetupPlacement = (type: 'SETTLEMENT' | 'ROAD', targetId: string) => {
    if (!isSetupPhase) return;
    if (type === 'SETTLEMENT') {
      setSetupState(prev => ({ ...prev, hasPlacedSettlement: true }));
      if (gamePhase === 'SETUP_ROUND_2') {
        const oldPlayer = players.find(p => p.id === currentPlayer.id);
        const updatedPlayers = distributeInitialResources(targetId, tiles, players, currentPlayer.id);
        
        if (oldPlayer) {
          const newPlayer = updatedPlayers.find(p => p.id === currentPlayer.id);
          if (newPlayer) {
            const received: string[] = [];
            (Object.keys(oldPlayer.resources) as (keyof ResourceCards)[]).forEach((resKey) => {
              const diff = newPlayer.resources[resKey] - oldPlayer.resources[resKey];
              if (diff > 0) {
                const resLabel = resKey === 'WOOD' ? 'עץ' : resKey === 'BRICK' ? 'לבנה' : resKey === 'SHEEP' ? 'כבש' : resKey === 'WHEAT' ? 'חיטה' : 'ברזל';
                received.push(`${diff} ${resLabel}`);
              }
            });
            if (received.length > 0) {
              addLog(`${currentPlayer.name} קיבל ${received.join(' ו-')} כמשאבי פתיחה.`);
            }
          }
        }
        
        setPlayers(updatedPlayers);
      }
    } else {
      setSetupState(prev => ({ ...prev, hasPlacedRoad: true }));
    }
  };

  const endTurn = () => {
    if (isSetupPhase) {
      const isBot = currentPlayer?.isBot;
      if (!isBot && (!setupState.hasPlacedSettlement || !setupState.hasPlacedRoad)) return;
      const config = getNextTurnConfig(currentPlayerIndex, gamePhase, players.length);
      setSetupState({ hasPlacedSettlement: false, hasPlacedRoad: false });
      setCurrentPlayerIndex(config.nextIndex);
      setGamePhase(config.nextPhase);
      if (config.nextPhase === 'MAIN_GAME') {
        setTurnSubPhase('BEFORE_ROLL');
        addLog(`סבב ההקמה הסתיים! המשחק מתחיל.`);
      }
      return;
    }

    if (turnSubPhase !== 'TRADE_AND_BUILD') return;
    const nextIndex = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextIndex);
    setTurnSubPhase('BEFORE_ROLL');
  };

  const checkIfGameEnds = (player: Player) => {
    if (player.victoryPoints >= 10) {
      setGamePhase('GAME_OVER');
      addLog(`המשחק נגמר! ${player.name} ניצח/ה עם ${player.victoryPoints} נקודות ניצחון!`);
      return true;
    }
    return false;
  };

  return {
    currentPlayer,
    turnSubPhase,
    isSetupPhase,
    setupState,
    isCurrentPlayerBot: currentPlayer?.isBot || false,
    handleDiceRoll,
    recordSetupPlacement,
    tradeWithBank,
    buyDevelopmentCard,
    endTurn,
    startTurn,
    undoTurnActions
  };
}
