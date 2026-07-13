import { BoardVertex } from '../../../types/boardElements.types';
import { Player } from '../../../types/player.types';
import { HexTile } from '../../../types/hex.types';
import { TurnSubPhase } from '../../../types/game.types';
import { cubeToPixel } from '../../hexMath/cubeToPixel';
import { moveRobber } from '../../gameEngine/moveRobber';
import { getEligibleRobberyTargets, stealRandomCard } from '../../gameEngine/robberSteal';

interface RobberPhaseParams {
  botPlayer: Player;
  tiles: HexTile[];
  vertices: BoardVertex[];
  players: Player[];
  addLog?: (message: string) => void;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setTiles?: React.Dispatch<React.SetStateAction<HexTile[]>>;
  setTurnSubPhase?: React.Dispatch<React.SetStateAction<TurnSubPhase>>;
}

export function robberPhase({
  botPlayer,
  tiles,
  vertices,
  players,
  addLog,
  setPlayers,
  setTiles,
  setTurnSubPhase
}: RobberPhaseParams): void {
  setTimeout(() => {
    const possibleTiles = tiles.filter(t => !t.hasRobber && t.type !== 'DESERT');
    if (possibleTiles.length === 0 || !setTiles || !setTurnSubPhase) {
      if (setTurnSubPhase) {
        setTurnSubPhase('TRADE_AND_BUILD');
      }
      return;
    }

    const TOKEN_WEIGHTS: Record<number, number> = {
      2: 1, 12: 1,
      3: 2, 11: 2,
      4: 3, 10: 3,
      5: 4, 9: 4,
      6: 5, 8: 5
    };

    const HEX_SIZE = 60;

    let bestTileId = possibleTiles[0].id;
    let highestScore = -1;

    possibleTiles.forEach(tile => {
      let tileScore = 0;
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

      tileVertices.forEach(v => {
        if (v.playerId && v.playerId !== botPlayer.id && (v.structure === 'SETTLEMENT' || v.structure === 'CITY')) {
          const buildingValue = v.structure === 'CITY' ? 2 : 1;
          const numWeight = tile.numberToken !== null ? (TOKEN_WEIGHTS[tile.numberToken] || 1) : 1;
          let baseScore = buildingValue * numWeight;
          
          // Anti-leader strategy: actively target players with 7+ victory points
          if (botPlayer.difficulty === 'HARD') {
            const targetPlayer = players.find(p => p.id === v.playerId);
            if (targetPlayer && targetPlayer.victoryPoints >= 7) {
              baseScore += 50; // Massively prioritize blocking leaders
            }
          }
          tileScore += baseScore;
        }
      });

      if (tileScore > highestScore) {
        highestScore = tileScore;
        bestTileId = tile.id;
      }
    });

    const chosenTile = tiles.find(t => t.id === bestTileId);
    if (chosenTile) {
      setTiles(prevTiles => moveRobber(bestTileId, prevTiles));
      if (addLog) {
        const resourceLabels: Record<string, string> = {
          WOOD: 'עץ',
          BRICK: 'לבנה',
          SHEEP: 'כבש',
          WHEAT: 'חיטה',
          ORE: 'ברזל',
          DESERT: 'מדבר'
        };
        const tileLabel = resourceLabels[chosenTile.type] || chosenTile.type;
        addLog(`[שודד] הבוט ${botPlayer.name} הזיז את השודד לאריח מסוג ${tileLabel}.`);
      }

      // HARD bot: Anti-leader strategy for robber placement and stealing
      if (botPlayer.difficulty === 'HARD') {
        const otherPlayers = players.filter(p => p.id !== botPlayer.id);
        const leadingPlayers = otherPlayers.filter(p => p.victoryPoints >= 7);

        let bestVictim = null;

        // Prioritize stealing from leading players on this tile
        const eligibleTargets = getEligibleRobberyTargets(chosenTile, vertices, players, botPlayer.id);
        const leadingTargets = eligibleTargets.filter(t => leadingPlayers.some(lp => lp.id === t.id));

        if (leadingTargets.length > 0) {
          // Steal from the leading player with most cards
          bestVictim = leadingTargets.sort((a, b) => Object.values(b.resources).reduce((sum, count) => sum + count, 0) - Object.values(a.resources).reduce((sum, count) => sum + count, 0))[0];
        } else if (eligibleTargets.length > 0) {
          // If no leading players on this tile, steal from any player with most cards
          bestVictim = eligibleTargets.sort((a, b) => Object.values(b.resources).reduce((sum, count) => sum + count, 0) - Object.values(a.resources).reduce((sum, count) => sum + count, 0))[0];
        }

        if (bestVictim) {
          const { updatedPlayers } = stealRandomCard(botPlayer.id, bestVictim.id, players);
          setPlayers(updatedPlayers);
          if (addLog) {
            addLog(`[שודד] הבוט ${botPlayer.name} שדד קלף אקראי מ-${bestVictim.name}.`);
          }
        } else {
          if (addLog) {
            addLog(`[שודד] אין שחקנים יריבים עם קלפים באריח זה.`);
          }
        }
      } else { // Existing logic for MEDIUM and EASY bots
        const eligibleTargets = getEligibleRobberyTargets(chosenTile, vertices, players, botPlayer.id);
        if (eligibleTargets.length > 0) {
          const chosenVictim = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
          const { updatedPlayers } = stealRandomCard(botPlayer.id, chosenVictim.id, players);
          setPlayers(updatedPlayers);
          if (addLog) {
            addLog(`[שודד] הבוט ${botPlayer.name} שדד קלף אקראי מ-${chosenVictim.name}.`);
          }
        } else {
          if (addLog) {
            addLog(`[שודד] אין שחקנים יריבים עם קלפים באריח זה.`);
          }
        }
      }
    }

    setTurnSubPhase('TRADE_AND_BUILD');
  }, 1500);
}
