import { Player } from '../../../types/player.types';
import { HexTile } from '../../../types/hex.types';
import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { GamePhase } from '../../../context/GameContext';
import { TurnSubPhase } from '../../../types/game.types';
import { cubeToPixel } from '../../hexMath/cubeToPixel';
import { evaluateEdges } from '../evaluators/evaluateEdges';

interface HandleDevCardPlayParams {
  botPlayer: Player;
  tiles: HexTile[];
  vertices: BoardVertex[];
  edges: BoardEdge[];
  players: Player[];
  gamePhase: GamePhase;
  resourceLabels: Record<string, string>;
  addLog?: (message: string) => void;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setTurnSubPhase?: React.Dispatch<React.SetStateAction<TurnSubPhase>>;
}

export function handleDevelopmentCardsPlay({
  botPlayer,
  tiles,
  vertices,
  edges,
  players,
  gamePhase,
  resourceLabels,
  addLog,
  setPlayers,
  setTurnSubPhase
}: HandleDevCardPlayParams): {
  updatedBot: Player;
  updatedEdges: BoardEdge[];
  updatedPlayers: Player[];
  played: boolean;
  stopTurn: boolean;
} {
  if (botPlayer.playedDevCardThisTurn) {
    return { updatedBot: botPlayer, updatedEdges: edges, updatedPlayers: players, played: false, stopTurn: false };
  }

  let currentBot = { ...botPlayer, developmentCards: { ...botPlayer.developmentCards } };
  let currentEdges = [...edges];
  let playersCopy = players.map(p => ({ ...p, resources: { ...p.resources } }));
  let played = false;

  const botDevCards = currentBot.developmentCards || { KNIGHT: 0, MONOPOLY: 0, ROAD_BUILDING: 0 };

  // 1. Play Knight Card
  const boughtKnightThisTurn = botPlayer.boughtDevCardsThisTurn?.KNIGHT || 0;
  const playableKnights = (botDevCards.KNIGHT || 0) - boughtKnightThisTurn;
  if (playableKnights > 0) {
    // Check if robber is blocking bot's productive hexes
    const HEX_SIZE = 60;
    const isRobberBlockingBot = tiles.some(tile => {
      if (!tile.hasRobber) return false;
      const center = cubeToPixel(tile.coord, HEX_SIZE);
      return vertices.some(v => {
        if (v.playerId !== botPlayer.id) return false;
        if (v.structure !== 'SETTLEMENT' && v.structure !== 'CITY') return false;
        const parts = v.id.split('_');
        const vx = parseFloat(parts[1]);
        const vy = parseFloat(parts[2]);
        if (isNaN(vx) || isNaN(vy)) return false;
        const dist = Math.sqrt((vx - center.x) ** 2 + (vy - center.y) ** 2);
        return dist < 65; // Vertex is on this tile
      });
    });

    // If robber is blocking, or 40% random chance to play Knight anyway (e.g. to get Largest Army)
    if (isRobberBlockingBot || Math.random() < 0.4) {
      if (addLog) {
        addLog(`[קלף פיתוח] בוט ${botPlayer.name} הפעיל קלף אביר ומזיז את השודד!`);
      }
      currentBot.developmentCards = {
        ...currentBot.developmentCards,
        KNIGHT: Math.max(0, (currentBot.developmentCards.KNIGHT || 0) - 1)
      };
      currentBot.knightsPlayed = (currentBot.knightsPlayed || 0) + 1;
      currentBot.playedDevCardThisTurn = true;
      playersCopy = playersCopy.map(p => p.id === botPlayer.id ? currentBot : p);
      setPlayers(playersCopy);
      if (setTurnSubPhase) {
        setTurnSubPhase('ROBBER_PLACEMENT');
      }
      return { updatedBot: currentBot, updatedEdges: currentEdges, updatedPlayers: playersCopy, played: true, stopTurn: true };
    }
  }

  // 2. Play Road Building Card
  const boughtRoadBuildingThisTurn = botPlayer.boughtDevCardsThisTurn?.ROAD_BUILDING || 0;
  const playableRoadBuilding = (botDevCards.ROAD_BUILDING || 0) - boughtRoadBuildingThisTurn;
  if (playableRoadBuilding > 0) {
    // Find best edges to build roads
    let tempEdges = [...currentEdges];
    const bestEdges1 = evaluateEdges(botPlayer.id, gamePhase, tiles, vertices, tempEdges, botPlayer.difficulty || 'MEDIUM');
    if (bestEdges1.length > 0) {
      const firstRoadId = bestEdges1[0].edgeId;
      tempEdges = tempEdges.map(e => e.id === firstRoadId ? { ...e, hasRoad: true, playerId: botPlayer.id } : e);

      const bestEdges2 = evaluateEdges(botPlayer.id, gamePhase, tiles, vertices, tempEdges, botPlayer.difficulty || 'MEDIUM');
      let secondRoadId = '';
      if (bestEdges2.length > 0) {
        secondRoadId = bestEdges2[0].edgeId;
        tempEdges = tempEdges.map(e => e.id === secondRoadId ? { ...e, hasRoad: true, playerId: botPlayer.id } : e);
      }

      currentEdges = tempEdges;
      currentBot.developmentCards = {
        ...currentBot.developmentCards,
        ROAD_BUILDING: Math.max(0, (currentBot.developmentCards.ROAD_BUILDING || 0) - 1)
      };
      currentBot.playedDevCardThisTurn = true;
      played = true;

      if (addLog) {
        addLog(`[קלף פיתוח] בוט ${botPlayer.name} הפעיל קלף בניית כבישים ובנה כבישים חינם!`);
      }
    }
  }

  // 3. Play Monopoly Card
  const boughtMonopolyThisTurn = botPlayer.boughtDevCardsThisTurn?.MONOPOLY || 0;
  const playableMonopoly = (botDevCards.MONOPOLY || 0) - boughtMonopolyThisTurn;
  if (playableMonopoly > 0 && !played) {
    const resourceTypes = ['WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE'] as const;
    let bestResource: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE' = resourceTypes[0];
    let maxStolen = -1;

    // Choose the resource that we can steal the most of
    resourceTypes.forEach(resType => {
      let count = 0;
      playersCopy.forEach(p => {
        if (p.id !== botPlayer.id) {
          count += p.resources[resType] || 0;
        }
      });
      if (count > maxStolen) {
        maxStolen = count;
        bestResource = resType;
      }
    });

    // Execute monopoly steal
    let stolen = 0;
    playersCopy = playersCopy.map(p => {
      if (p.id !== botPlayer.id) {
        const amount = p.resources[bestResource] || 0;
        stolen += amount;
        return {
          ...p,
          resources: {
            ...p.resources,
            [bestResource]: 0
          }
        };
      }
      return p;
    });

    currentBot.resources = {
      ...currentBot.resources,
      [bestResource]: (currentBot.resources[bestResource] || 0) + stolen
    };
    currentBot.developmentCards = {
      ...currentBot.developmentCards,
      MONOPOLY: Math.max(0, (currentBot.developmentCards.MONOPOLY || 0) - 1)
    };
    currentBot.playedDevCardThisTurn = true;
    played = true;

    if (addLog) {
      addLog(`[קלף פיתוח] בוט ${botPlayer.name} הפעיל קלף מונופול וגזל ${stolen} קלפי ${resourceLabels[bestResource]} משאר השחקנים!`);
    }
  }

  playersCopy = playersCopy.map(p => p.id === botPlayer.id ? currentBot : p);
  return { updatedBot: currentBot, updatedEdges: currentEdges, updatedPlayers: playersCopy, played, stopTurn: false };
}

export function handleBuyDevCard(
  botPlayer: Player,
  addLog?: (message: string) => void
): Player {
  const cardTypes = ['KNIGHT', 'VICTORY_POINT', 'ROAD_BUILDING', 'MONOPOLY', 'YEAR_OF_PLENTY'];
  const randomCard = cardTypes[Math.floor(Math.random() * cardTypes.length)];
  
  const currentBot = {
    ...botPlayer,
    resources: {
      ...botPlayer.resources,
      SHEEP: (botPlayer.resources.SHEEP || 0) - 1,
      WHEAT: (botPlayer.resources.WHEAT || 0) - 1,
      ORE: (botPlayer.resources.ORE || 0) - 1
    },
    developmentCards: { ...botPlayer.developmentCards },
    boughtDevCardsThisTurn: { ...botPlayer.boughtDevCardsThisTurn }
  };

  if (randomCard === 'VICTORY_POINT') {
    currentBot.developmentCards = {
      ...currentBot.developmentCards,
      VICTORY_POINT: (currentBot.developmentCards.VICTORY_POINT || 0) + 1
    };
  } else {
    const cardKey = randomCard as 'KNIGHT' | 'ROAD_BUILDING' | 'MONOPOLY' | 'YEAR_OF_PLENTY';
    currentBot.developmentCards = {
      ...currentBot.developmentCards,
      [cardKey]: (currentBot.developmentCards[cardKey] || 0) + 1
    };
    currentBot.boughtDevCardsThisTurn = {
      ...currentBot.boughtDevCardsThisTurn,
      [cardKey]: ((currentBot.boughtDevCardsThisTurn?.[cardKey]) || 0) + 1
    };
  }

  const cardLabels: Record<string, string> = {
    KNIGHT: 'אביר',
    VICTORY_POINT: 'נקודת ניצחון',
    ROAD_BUILDING: 'בניית 2 דרכים',
    MONOPOLY: 'מונופול',
    YEAR_OF_PLENTY: 'שנת שפע'
  };

  if (addLog) {
    addLog(`[קלף פיתוח] הבוט ${botPlayer.name} רכש קלף פיתוח מהקופה וקיבל: ${cardLabels[randomCard] || randomCard}!`);
  }

  return currentBot;
}
