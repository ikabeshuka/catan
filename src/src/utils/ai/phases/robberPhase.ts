import { BoardVertex, BoardEdge } from '../../../types/boardElements.types';
import { Player } from '../../../types/player.types';
import { HexTile } from '../../../types/hex.types';
import { TurnSubPhase } from '../../../types/game.types';
import { cubeToPixel } from '../../hexMath/cubeToPixel';
import { moveRobber } from '../../gameEngine/moveRobber';
import { getEligibleRobberyTargets, stealRandomCard } from '../../gameEngine/robberSteal';
import { parseEdgeId } from '../../hexMath/parseEdgeId';

interface RobberPhaseParams {
  botPlayer: Player;
  tiles: HexTile[];
  vertices: BoardVertex[];
  edges?: BoardEdge[];
  players: Player[];
  addLog?: (message: string) => void;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setTiles?: React.Dispatch<React.SetStateAction<HexTile[]>>;
  setTurnSubPhase?: React.Dispatch<React.SetStateAction<TurnSubPhase>>;
}

export function movePirate(targetTileId: string, tiles: HexTile[]): HexTile[] {
  return tiles.map((tile) => {
    if (tile.id === targetTileId) {
      return { ...tile, hasPirate: true };
    }
    if (tile.hasPirate) {
      return { ...tile, hasPirate: false };
    }
    return tile;
  });
}

export function robberPhase({
  botPlayer,
  tiles,
  vertices,
  edges = [],
  players,
  addLog,
  setPlayers,
  setTiles,
  setTurnSubPhase
}: RobberPhaseParams): void {
  setTimeout(() => {
    if (!setTiles || !setTurnSubPhase) {
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

    // --- 1. EVALUATE LAND ROBBER ---
    const isLostTribe = tiles.some(tile => tile.robberStartLocked);
    const possibleLandTiles = tiles.filter(t =>
      t.type !== 'WATER' && t.type !== 'DESERT' && !t.hasRobber &&
      (!isLostTribe || (t.islandId === 1 && !t.robberStartLocked))
    );
    let bestLandTileId = possibleLandTiles.length > 0 ? possibleLandTiles[0].id : null;
    let highestLandScore = -1;

    possibleLandTiles.forEach(tile => {
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
          if (botPlayer.difficulty === 'HARD' || botPlayer.difficulty === 'SUPER_HARD') {
            const targetPlayer = players.find(p => p.id === v.playerId);
            if (targetPlayer && targetPlayer.victoryPoints >= 7) {
              baseScore += 50; // Massively prioritize blocking leaders
            }
          }
          tileScore += baseScore;
        }
      });

      if (tileScore > highestLandScore) {
        highestLandScore = tileScore;
        bestLandTileId = tile.id;
      }
    });

    // --- 2. EVALUATE WATER PIRATE ---
    const possibleWaterTiles = tiles.filter(t => t.type === 'WATER' && !t.hasPirate);
    let bestWaterTileId = possibleWaterTiles.length > 0 ? possibleWaterTiles[0].id : null;
    let highestWaterScore = -1;

    possibleWaterTiles.forEach(tile => {
      let tileScore = 0;
      const center = cubeToPixel(tile.coord, HEX_SIZE);

      const tileVertexIds = new Set<string>();
      vertices.forEach(vertex => {
        for (let i = 0; i < 6; i++) {
          const angleRad = (Math.PI / 180) * (60 * i - 30);
          const x = center.x + HEX_SIZE * Math.cos(angleRad);
          const y = center.y + HEX_SIZE * Math.sin(angleRad);

          const roundedX = Math.round(x * 10) / 10;
          const roundedY = Math.round(y * 10) / 10;
          const checkId = `v_${roundedX}_${roundedY}`;

          if (checkId === vertex.id) {
            tileVertexIds.add(vertex.id);
            break;
          }
        }
      });

      edges.forEach(edge => {
        if (edge.hasShip && edge.shipPlayerId && edge.shipPlayerId !== botPlayer.id) {
          const { x1, y1, x2, y2 } = parseEdgeId(edge.id);
          const v1Id = `v_${x1}_${y1}`;
          const v2Id = `v_${x2}_${y2}`;
          if (tileVertexIds.has(v1Id) && tileVertexIds.has(v2Id)) {
            let baseScore = 3; // base weight for a ship
            if (botPlayer.difficulty === 'HARD' || botPlayer.difficulty === 'SUPER_HARD') {
              const targetPlayer = players.find(p => p.id === edge.shipPlayerId);
              if (targetPlayer && targetPlayer.victoryPoints >= 7) {
                baseScore += 50;
              }
            }
            tileScore += baseScore;
          }
        }
      });

      if (tileScore > highestWaterScore) {
        highestWaterScore = tileScore;
        bestWaterTileId = tile.id;
      }
    });

    // --- 3. MAKE DECISION: LAND ROBBER OR WATER PIRATE? ---
    const isSeafarers = tiles.some(t => t.type === 'WATER');
    const shouldPlacePirate = isSeafarers && bestWaterTileId !== null && (highestWaterScore > highestLandScore || bestLandTileId === null);

    if (shouldPlacePirate && bestWaterTileId) {
      // Place Pirate
      const chosenTile = tiles.find(t => t.id === bestWaterTileId);
      if (chosenTile) {
        setTiles(prevTiles => movePirate(bestWaterTileId!, prevTiles));
        if (addLog) {
          addLog(`[שודד ים] הבוט ${botPlayer.name} הזיז את שודד הים לאריח מים.`);
        }

        // Identify pirate victims (players with ships bordering this water tile)
        const center = cubeToPixel(chosenTile.coord, HEX_SIZE);
        const tileVertexIds = new Set<string>();
        vertices.forEach(vertex => {
          for (let i = 0; i < 6; i++) {
            const angleRad = (Math.PI / 180) * (60 * i - 30);
            const x = center.x + HEX_SIZE * Math.cos(angleRad);
            const y = center.y + HEX_SIZE * Math.sin(angleRad);

            const roundedX = Math.round(x * 10) / 10;
            const roundedY = Math.round(y * 10) / 10;
            const checkId = `v_${roundedX}_${roundedY}`;

            if (checkId === vertex.id) {
              tileVertexIds.add(vertex.id);
              break;
            }
          }
        });

        const candidatePlayerIds = new Set<string>();
        edges.forEach(edge => {
          if (edge.hasShip && edge.shipPlayerId && edge.shipPlayerId !== botPlayer.id) {
            const { x1, y1, x2, y2 } = parseEdgeId(edge.id);
            const v1Id = `v_${x1}_${y1}`;
            const v2Id = `v_${x2}_${y2}`;
            if (tileVertexIds.has(v1Id) && tileVertexIds.has(v2Id)) {
              candidatePlayerIds.add(edge.shipPlayerId);
            }
          }
        });

        const eligibleTargets = players.filter(p => {
          if (!candidatePlayerIds.has(p.id)) return false;
          const totalCards = Object.values(p.resources).reduce((sum, count) => sum + (count as number), 0);
          return totalCards > 0;
        });

        if (eligibleTargets.length > 0) {
          let chosenVictim = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
          if (botPlayer.difficulty === 'HARD' || botPlayer.difficulty === 'SUPER_HARD') {
            const leadingVictims = eligibleTargets.filter(p => p.victoryPoints >= 7);
            if (leadingVictims.length > 0) {
              chosenVictim = leadingVictims.sort((a, b) => Object.values(b.resources).reduce((sum, count) => sum + count, 0) - Object.values(a.resources).reduce((sum, count) => sum + count, 0))[0];
            } else {
              chosenVictim = eligibleTargets.sort((a, b) => Object.values(b.resources).reduce((sum, count) => sum + count, 0) - Object.values(a.resources).reduce((sum, count) => sum + count, 0))[0];
            }
          }

          const { updatedPlayers } = stealRandomCard(botPlayer.id, chosenVictim.id, players);
          setPlayers(updatedPlayers);
          if (addLog) {
            addLog(`[שודד ים] הבוט ${botPlayer.name} שדד קלף אקראי מ-${chosenVictim.name}.`);
          }
        } else {
          if (addLog) {
            addLog(`[שודד ים] אין שחקנים יריבים עם קלפים באריח זה.`);
          }
        }
      }
    } else if (bestLandTileId) {
      // Place Robber
      const chosenTile = tiles.find(t => t.id === bestLandTileId);
      if (chosenTile) {
        setTiles(prevTiles => moveRobber(bestLandTileId!, prevTiles));
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

        const eligibleTargets = getEligibleRobberyTargets(chosenTile, vertices, players, botPlayer.id);
        if (eligibleTargets.length > 0) {
          let chosenVictim = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
          if (botPlayer.difficulty === 'HARD' || botPlayer.difficulty === 'SUPER_HARD') {
            const leadingVictims = eligibleTargets.filter(p => p.victoryPoints >= 7);
            if (leadingVictims.length > 0) {
              chosenVictim = leadingVictims.sort((a, b) => Object.values(b.resources).reduce((sum, count) => sum + count, 0) - Object.values(a.resources).reduce((sum, count) => sum + count, 0))[0];
            } else {
              chosenVictim = eligibleTargets.sort((a, b) => Object.values(b.resources).reduce((sum, count) => sum + count, 0) - Object.values(a.resources).reduce((sum, count) => sum + count, 0))[0];
            }
          }

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
