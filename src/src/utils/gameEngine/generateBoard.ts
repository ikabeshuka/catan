import { HexTile, HexCoordinate } from '../../types/hex.types';
import { GameConfig } from '../../config/standardVersion';
import { shuffleArray } from '../array/shuffleArray';
import { starterBoardPreset } from '../../config/starterBoardPreset';
import { SeafarersScenario } from '../../types/game.types';
import type { GameExpansion } from '../../config/gameRules';
import { 
  seafarers3PlayersNewShores, 
  seafarers4PlayersNewShores, 
  seafarers3PlayersFourIslands, 
  seafarers4PlayersFourIslands,
  seafarers3PlayersFogIsland,
  seafarers4PlayersFogIsland,
  seafarers3PlayersThroughTheDesert,
  seafarers4PlayersThroughTheDesert,
  seafarersLostTribe,
  seafarersClothForCatan,
  seafarersPirateIslands,
  LOST_TRIBE_RESTRICTED_NUMBER_TILE_IDS
} from '../../config/seafarersPresets';

/**
 * פונקציית עזר לבדיקת שכנות קובייה (isNeighbor שבה המרחק הגיאומטרי בין המשושים שווה ל-1)
 */
function isNeighbor(c1: HexCoordinate, c2: HexCoordinate): boolean {
  return (Math.abs(c1.q - c2.q) + Math.abs(c1.r - c2.r) + Math.abs(c1.s - c2.s)) / 2 === 1;
}

const FRAME_NEIGHBOR_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

/**
 * The cardboard frame is sea too. These virtual cells make every exposed
 * side of a Seafarers board a legal pirate target without adding buildable
 * edges or visible hexes to the scenario layout.
 */
export function addFrameSeaTargets(tiles: HexTile[]): HexTile[] {
  const boardTiles = tiles.filter(tile => !tile.isFrameSea);
  const occupied = new Set(boardTiles.map(tile => `${tile.coord.q},${tile.coord.r}`));
  const frameCoords = new Map<string, HexCoordinate>();

  boardTiles.forEach(tile => {
    FRAME_NEIGHBOR_DIRECTIONS.forEach(direction => {
      const q = tile.coord.q + direction.q;
      const r = tile.coord.r + direction.r;
      const key = `${q},${r}`;
      if (!occupied.has(key)) frameCoords.set(key, { q, r, s: -q - r });
    });
  });

  const frameTiles: HexTile[] = [...frameCoords.values()].map(coord => ({
    id: `frame_${coord.q}_${coord.r}`,
    coord,
    type: 'WATER',
    numberToken: null,
    hasRobber: false,
    hasPirate: false,
    isFrameSea: true,
  }));

  return [...boardTiles, ...frameTiles].sort((a, b) => a.coord.r - b.coord.r || a.coord.q - b.coord.q);
}

/**
 * מייצרת לוח משחק מלא (מערך של אריחים משושים) על פי חוקי הקונפיגורציה שסופקה
 */
export function generateBoard(
  config: GameConfig,
  boardType?: 'RANDOM' | 'STARTER',
  expansion?: GameExpansion,
  scenario?: SeafarersScenario,
  playerCount: number = 4
): HexTile[] {
  if (expansion === 'SEAFARERS') {
    switch (scenario) {
      case 'HEADING_FOR_NEW_SHORES': {
        const preset = playerCount === 3 ? seafarers3PlayersNewShores : seafarers4PlayersNewShores;
        const tiles = JSON.parse(JSON.stringify(preset)) as HexTile[];

        if (boardType === 'RANDOM') {
          // 1. Shuffling main island (islandId === 1) land tiles
          const mainIslandLandTiles = tiles.filter(t => t.islandId === 1 && t.type !== 'WATER');
          const mainResources = shuffleArray(mainIslandLandTiles.map(t => t.type));
          const mainTokens = shuffleArray(mainIslandLandTiles.filter(t => t.type !== 'DESERT').map(t => t.numberToken as number));

          let mainResourceIndex = 0;
          let mainTokenIndex = 0;

          // Assign them back
          mainIslandLandTiles.forEach(tile => {
            tile.type = mainResources[mainResourceIndex++];
            if (tile.type === 'DESERT') {
              tile.numberToken = null;
            } else {
              tile.numberToken = mainTokens[mainTokenIndex++];
            }
          });

          // Shuffle main island harbors (defined on island 1, or on water tiles pointing to island 1)
          const mainHarborTiles = tiles.filter(t => {
            const hasMainParent = t.islandId === 1;
            const hasMainTo = t.harbors?.some(h => {
              const toTile = tiles.find(x => x.id === h.toTileId);
              return toTile && toTile.islandId === 1;
            });
            return hasMainParent || hasMainTo;
          });

          const mainHarborsList: { tileId: string; harborIndex: number; type: string }[] = [];
          mainHarborTiles.forEach(tile => {
            if (tile.harbors) {
              tile.harbors.forEach((h, idx) => {
                mainHarborsList.push({ tileId: tile.id, harborIndex: idx, type: h.type });
              });
            }
          });

          const mainHarborTypes = shuffleArray(mainHarborsList.map(h => h.type));
          let mainHarborTypeIndex = 0;
          mainHarborsList.forEach(item => {
            const tile = tiles.find(t => t.id === item.tileId);
            if (tile && tile.harbors && tile.harbors[item.harborIndex]) {
              tile.harbors[item.harborIndex].type = mainHarborTypes[mainHarborTypeIndex++] as any;
            }
          });

          // Resolve conflicts of adjacent red numbers (6 and 8) on the main island
          let hasConflict = true;
          let attempts = 0;
          while (hasConflict && attempts < 50) {
            hasConflict = false;
            attempts++;
            for (let i = 0; i < mainIslandLandTiles.length; i++) {
              const tileA = mainIslandLandTiles[i];
              if (tileA.type === 'DESERT' || tileA.numberToken === null) continue;
              const valA = tileA.numberToken;
              if (valA === 6 || valA === 8) {
                const hasConflictNeighbor = mainIslandLandTiles.some(tileB =>
                  tileB.id !== tileA.id &&
                  tileB.type !== 'DESERT' &&
                  (tileB.numberToken === 6 || tileB.numberToken === 8) &&
                  isNeighbor(tileA.coord, tileB.coord)
                );
                if (hasConflictNeighbor) {
                  // Find a swap candidate on the main island
                  const candidate = mainIslandLandTiles.find(tileC => {
                    if (tileC.id === tileA.id) return false;
                    if (tileC.type === 'DESERT' || tileC.numberToken === null) return false;
                    if (tileC.numberToken === 6 || tileC.numberToken === 8) return false;
                    const hasNeighbor6or8 = mainIslandLandTiles.some(n =>
                      n.id !== tileC.id &&
                      (n.numberToken === 6 || n.numberToken === 8) &&
                      isNeighbor(tileC.coord, n.coord)
                    );
                    return !hasNeighbor6or8;
                  });
                  if (candidate) {
                    const temp = tileA.numberToken;
                    tileA.numberToken = candidate.numberToken;
                    candidate.numberToken = temp;
                    hasConflict = true;
                    break;
                  }
                }
              }
            }
          }

          // 2. Shuffling perimeter land tiles (islandId > 1, type !== 'WATER')
          const perimeterLandTiles = tiles.filter(t => t.islandId !== undefined && t.islandId > 1 && t.type !== 'WATER');
          if (perimeterLandTiles.length > 0) {
            const perimeterResources = shuffleArray(perimeterLandTiles.map(t => t.type));
            const perimeterTokens = shuffleArray(perimeterLandTiles.map(t => t.numberToken).filter(n => n !== null) as number[]);

            let periResIndex = 0;
            let periTokenIndex = 0;
            perimeterLandTiles.forEach(tile => {
              tile.type = perimeterResources[periResIndex++];
              tile.numberToken = perimeterTokens[periTokenIndex++];
            });

            // Ensure no adjacent 6 and 8 on the small islands (activated for 4 players)
            if (playerCount === 4) {
              let periConflict = true;
              let periAttempts = 0;
              while (periConflict && periAttempts < 50) {
                periConflict = false;
                periAttempts++;
                for (let i = 0; i < perimeterLandTiles.length; i++) {
                  const tileA = perimeterLandTiles[i];
                  if (tileA.numberToken === null) continue;
                  const valA = tileA.numberToken;
                  if (valA === 6 || valA === 8) {
                    const hasConflictNeighbor = perimeterLandTiles.some(tileB =>
                      tileB.id !== tileA.id &&
                      (tileB.numberToken === 6 || tileB.numberToken === 8) &&
                      isNeighbor(tileA.coord, tileB.coord)
                    );
                    if (hasConflictNeighbor) {
                      const candidate = perimeterLandTiles.find(tileC => {
                        if (tileC.id === tileA.id) return false;
                        if (tileC.numberToken === null || tileC.numberToken === 6 || tileC.numberToken === 8) return false;
                        const hasNeighbor6or8 = perimeterLandTiles.some(n =>
                          n.id !== tileC.id &&
                          (n.numberToken === 6 || n.numberToken === 8) &&
                          isNeighbor(tileC.coord, n.coord)
                        );
                        return !hasNeighbor6or8;
                      });
                      if (candidate) {
                        const temp = tileA.numberToken;
                        tileA.numberToken = candidate.numberToken;
                        candidate.numberToken = temp;
                        periConflict = true;
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Set initial pirate and robber positions
        const pirateTargetId = playerCount === 3 ? 'hex_3p_22' : 'hex_4p_26';
        tiles.forEach(t => {
          t.hasPirate = t.id === pirateTargetId;
          t.hasRobber = false;
        });

        const desertTile = tiles.find(t => t.type === 'DESERT');
        if (desertTile) {
          desertTile.hasRobber = true;
        } else {
          const token12Tile = tiles.find(t => t.numberToken === 12);
          if (token12Tile) {
            token12Tile.hasRobber = true;
          }
        }

        return addFrameSeaTargets(tiles);
      }
      case 'FOUR_ISLANDS': {
        const preset = playerCount === 3 ? seafarers3PlayersFourIslands : seafarers4PlayersFourIslands;
        const tiles = JSON.parse(JSON.stringify(preset)) as HexTile[];

        if (boardType === 'RANDOM') {
          // Shuffle land tiles across all islands (type !== 'WATER')
          const landTiles = tiles.filter(t => t.type !== 'WATER');
          const resources = shuffleArray(landTiles.map(t => t.type));
          const tokens = shuffleArray(landTiles.map(t => t.numberToken).filter(n => n !== null) as number[]);
          const harborTypes = shuffleArray(landTiles.flatMap(t => t.harbors || []).map(h => h.type));

          let resIndex = 0;
          let tokenIndex = 0;
          let harborTypeIndex = 0;

          landTiles.forEach(tile => {
            tile.type = resources[resIndex++];
            tile.numberToken = tokens[tokenIndex++];
            if (tile.harbors) {
              tile.harbors = tile.harbors.map(h => ({
                ...h,
                type: harborTypes[harborTypeIndex++]
              }));
            }
          });

          // Resolve adjacent 6/8 conflicts globally
          let hasConflict = true;
          let attempts = 0;
          while (hasConflict && attempts < 50) {
            hasConflict = false;
            attempts++;
            for (let i = 0; i < landTiles.length; i++) {
              const tileA = landTiles[i];
              if (tileA.numberToken === null) continue;
              const valA = tileA.numberToken;
              if (valA === 6 || valA === 8) {
                const hasConflictNeighbor = landTiles.some(tileB =>
                  tileB.id !== tileA.id &&
                  (tileB.numberToken === 6 || tileB.numberToken === 8) &&
                  isNeighbor(tileA.coord, tileB.coord)
                );
                if (hasConflictNeighbor) {
                  const candidate = landTiles.find(tileC => {
                    if (tileC.id === tileA.id) return false;
                    if (tileC.numberToken === null || tileC.numberToken === 6 || tileC.numberToken === 8) return false;
                    const hasNeighbor6or8 = landTiles.some(n =>
                      n.id !== tileC.id &&
                      (n.numberToken === 6 || n.numberToken === 8) &&
                      isNeighbor(tileC.coord, n.coord)
                    );
                    return !hasNeighbor6or8;
                  });
                  if (candidate) {
                    const temp = tileA.numberToken;
                    tileA.numberToken = candidate.numberToken;
                    candidate.numberToken = temp;
                    hasConflict = true;
                    break;
                  }
                }
              }
            }
          }
        }

        // Set initial pirate and robber positions
        const pirateTargetId = tiles.find(t => t.hasPirate && t.type === 'WATER')?.id;
        tiles.forEach(t => {
          t.hasPirate = pirateTargetId !== undefined && t.id === pirateTargetId;
          t.hasRobber = false;
        });

        const robberTile = tiles.find(t => t.type !== 'WATER' && t.numberToken === 12);
        if (robberTile) robberTile.hasRobber = true;

        // In Four Islands the pirate opens on the surrounding sea frame.
        // Keep the marker just outside the right-hand frame where the old
        // preset incorrectly placed it on an in-board sea hex.
        const framedTiles = addFrameSeaTargets(tiles);
        if (playerCount === 4) {
          framedTiles.forEach(tile => { tile.hasPirate = tile.id === 'frame_4_0'; });
        }
        return framedTiles;
      }
      case 'FOG_ISLAND': {
        const preset = playerCount === 3 ? seafarers3PlayersFogIsland : seafarers4PlayersFogIsland;
        const tiles = JSON.parse(JSON.stringify(preset)) as HexTile[];

        // The official face-down stack always contains exactly 12 terrain
        // hexes: 2 sea, 2 gold, 2 fields, 2 hills, 2 mountains,
        // 1 pasture, and 1 forest.
        const fogResourcesPool = shuffleArray([
          'WATER', 'WATER',
          'GOLD_FIELD', 'GOLD_FIELD',
          'WHEAT', 'WHEAT',
          'BRICK', 'BRICK',
          'ORE', 'ORE',
          'SHEEP',
          'WOOD'
        ]);
        const fogTokensPool = shuffleArray(playerCount === 3
          ? [3, 3, 4, 5, 6, 8, 9, 10, 11, 12]
          : [3, 4, 5, 6, 8, 9, 10, 11, 11, 12]);

        let resIdx = 0;
        let tokIdx = 0;

        tiles.forEach(tile => {
          if (tile.type === 'FOG') {
            const rawType = fogResourcesPool[resIdx] as HexTile['type'];
            resIdx++;
            tile.originalType = rawType;

            if (rawType === 'WATER' || rawType === 'DESERT') {
              tile.originalNumberToken = null;
            } else {
              tile.originalNumberToken = fogTokensPool[tokIdx];
              tokIdx++;
            }
          }
        });

        return addFrameSeaTargets(tiles);
      }
      case 'THROUGH_THE_DESERT': {
        const preset = playerCount === 3
          ? seafarers3PlayersThroughTheDesert
          : seafarers4PlayersThroughTheDesert;
        const tiles = JSON.parse(JSON.stringify(preset)) as HexTile[];

        if (boardType === 'RANDOM') {
          // Shuffle land tiles that are not desert/water on the main island (islandId === 1)
          const mainIslandLandTiles = tiles.filter(t => t.islandId === 1 && t.type !== 'WATER' && t.type !== 'DESERT');
          const mainResources = shuffleArray(mainIslandLandTiles.map(t => t.type));
          const mainTokens = shuffleArray(mainIslandLandTiles.map(t => t.numberToken as number));

          let mainResourceIndex = 0;
          let mainTokenIndex = 0;

          mainIslandLandTiles.forEach(tile => {
            tile.type = mainResources[mainResourceIndex++];
            tile.numberToken = mainTokens[mainTokenIndex++];
          });

          // Shuffle other land tiles (islandId > 1)
          const foreignLandTiles = tiles.filter(t => t.islandId !== undefined && t.islandId > 1 && t.type !== 'WATER' && t.type !== 'DESERT');
          if (foreignLandTiles.length > 0) {
            const foreignResources = shuffleArray(foreignLandTiles.map(t => t.type));
            const foreignTokens = shuffleArray(foreignLandTiles.map(t => t.numberToken as number));

            let foreignResIndex = 0;
            let foreignTokIndex = 0;
            foreignLandTiles.forEach(tile => {
              tile.type = foreignResources[foreignResIndex++];
              tile.numberToken = foreignTokens[foreignTokIndex++];
            });
          }
        }

        // Ensure robber starts on the desert tile and pirate starts on a water tile
        const pirateTargetId = tiles.find(t => t.hasPirate && t.type === 'WATER')?.id;
        tiles.forEach(t => {
          t.hasPirate = pirateTargetId !== undefined && t.id === pirateTargetId;
          t.hasRobber = false;
        });

        const desertTile = tiles.find(t => t.type === 'DESERT');
        if (desertTile) {
          desertTile.hasRobber = true;
        }

        return addFrameSeaTargets(tiles);
      }
      case 'THE_LOST_TRIBE': {
        const tiles = JSON.parse(JSON.stringify(seafarersLostTribe)) as HexTile[];
        const mainIslandTiles = tiles.filter(tile => tile.islandId === 1);

        if (boardType === 'RANDOM') {
          const resources = shuffleArray(mainIslandTiles.map(tile => tile.type));
          let tokens = shuffleArray(mainIslandTiles.map(tile => tile.numberToken as number));
          let attempts = 0;
          while (attempts < 200) {
            const restrictedHasStrongNumber = mainIslandTiles.some((tile, tileIndex) => {
              const numericId = Number(tile.id.split('_').pop());
              return LOST_TRIBE_RESTRICTED_NUMBER_TILE_IDS.has(numericId) && [5, 6, 8, 9].includes(tokens[tileIndex]);
            });
            if (!restrictedHasStrongNumber) break;
            tokens = shuffleArray(tokens);
            attempts += 1;
          }

          mainIslandTiles.forEach((tile, tileIndex) => {
            tile.type = resources[tileIndex];
            tile.numberToken = tokens[tileIndex];
          });
        }

        const harborTypes = shuffleArray<NonNullable<NonNullable<HexTile['lostTribeRewards']>[number]['harborType']>>([
          'WOOD', 'BRICK', 'SHEEP', 'WHEAT', 'ORE', 'GENERIC',
        ]);
        let harborIndex = 0;
        tiles.forEach(tile => {
          tile.lostTribeRewards?.forEach(reward => {
            if (reward.kind === 'HARBOR') reward.harborType = harborTypes[harborIndex++];
          });
        });
        const deserts = tiles.filter(tile => tile.type === 'DESERT');
        const robberStart = deserts[Math.floor(Math.random() * deserts.length)];
        tiles.forEach(tile => {
          tile.hasPirate = tile.id === 'hex_lt_3';
          tile.hasRobber = tile.id === robberStart?.id;
          tile.robberStartLocked = tile.id === robberStart?.id;
        });

        return addFrameSeaTargets(tiles);
      }
      case 'CLOTH_FOR_CATAN': {
        const tiles = JSON.parse(JSON.stringify(seafarersClothForCatan)) as HexTile[];
        const mainIslandTiles = tiles.filter(tile => tile.islandId === 1);
        if (boardType === 'RANDOM') {
          const resources = shuffleArray(mainIslandTiles.map(tile => tile.type));
          const tokens = shuffleArray(mainIslandTiles.map(tile => tile.numberToken as number));
          mainIslandTiles.forEach((tile, tileIndex) => { tile.type = resources[tileIndex]; tile.numberToken = tokens[tileIndex]; });
        }
        tiles.forEach(tile => { tile.hasPirate = tile.id === 'hex_cfc_26'; tile.hasRobber = tile.id === 'hex_cfc_12'; tile.robberStartLocked = false; });
        return addFrameSeaTargets(tiles);
      }
      case 'PIRATE_ISLANDS': {
        const tiles = JSON.parse(JSON.stringify(seafarersPirateIslands)) as HexTile[];
        tiles.forEach(tile => { tile.hasRobber = false; tile.hasPirate = tile.id === 'hex_pi_49'; });
        return addFrameSeaTargets(tiles);
      }
      default: {
        const preset = playerCount === 3 ? seafarers3PlayersNewShores : seafarers4PlayersNewShores;
        const tiles = JSON.parse(JSON.stringify(preset)) as HexTile[];

        // Set initial pirate and robber positions (Heading for New Shores rules)
        const pirateTargetId = playerCount === 3 ? 'hex_3p_22' : 'hex_4p_26';
        tiles.forEach(t => {
          t.hasPirate = t.id === pirateTargetId;
          t.hasRobber = false;
        });

        const desertTile = tiles.find(t => t.type === 'DESERT');
        if (desertTile) {
          desertTile.hasRobber = true;
        } else {
          const token12Tile = tiles.find(t => t.numberToken === 12);
          if (token12Tile) {
            token12Tile.hasRobber = true;
          }
        }

        return addFrameSeaTargets(tiles);
      }
    }
  }

  if (boardType === 'STARTER') {
    const tiles = JSON.parse(JSON.stringify(starterBoardPreset)) as HexTile[];
    
    // Sort 19 tiles row-by-row by coordinates
    tiles.sort((a, b) => a.coord.r - b.coord.r || a.coord.q - b.coord.q);

    if (expansion === 'MERCHANTS_AND_BARBARIANS') {
      tiles.forEach(tile => {
        const { q, r, s } = tile.coord;
        if (q === 0 && r === 0 && s === 0) {
          tile.type = 'CASTLE';
          tile.numberToken = null;
        } else if (q === 0 && r === -2 && s === 2) {
          tile.type = 'QUARRY';
          tile.numberToken = null;
        } else if (q === 0 && r === 2 && s === -2) {
          tile.type = 'GLASSWORKS';
          tile.numberToken = null;
        }
      });
    }
    return tiles;
  }

  const tiles: HexTile[] = [];
  
  // 1. ערבוב המשאבים והמספרים כדי שהלוח יהיה אקראי בכל משחק
  const shuffledResources = shuffleArray(config.resourcePool);
  const shuffledTokens = shuffleArray(config.tokenPool);
  
  let resourceIndex = 0;
  let tokenIndex = 0;
  let hexIdCounter = 1;

  // 2. יצירת רשת הקואורדינטות הגיאומטרית לפי הרדיוס
  const radius = config.boardRadius;
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    
    for (let r = rMin; r <= rMax; r++) {
      const s = -q - r; // הכלל בקואורדינטות קוביה: q + r + s = 0
      const coord: HexCoordinate = { q, r, s };

      let type: HexTile['type'];
      let numberToken: number | null = null;
      let hasRobber = false;

      // שליפת המשאב הבא מהמערך המעורבב
      type = shuffledResources[resourceIndex];
      resourceIndex++;

      // התאמת מספר אסימון: למדבר אין מספר, והשודד מתחיל עליו
      if (type === 'DESERT') {
        hasRobber = true;
      } else {
        let currentToken = shuffledTokens[tokenIndex];
        if (currentToken === 6 || currentToken === 8) {
          const hasHighRiskNeighbor = tiles.some(t => 
            t.numberToken !== null && 
            (t.numberToken === 6 || t.numberToken === 8) && 
            isNeighbor(coord, t.coord)
          );
          if (hasHighRiskNeighbor) {
            let swapIndex = tokenIndex + 1;
            while (swapIndex < shuffledTokens.length && (shuffledTokens[swapIndex] === 6 || shuffledTokens[swapIndex] === 8)) {
              swapIndex++;
            }
            if (swapIndex < shuffledTokens.length) {
              shuffledTokens[tokenIndex] = shuffledTokens[swapIndex];
              shuffledTokens[swapIndex] = currentToken;
              currentToken = shuffledTokens[tokenIndex];
            }
          }
        }
        numberToken = currentToken;
        tokenIndex++;
      }

      // הוספת האריח המוכן למערך הלוח
      tiles.push({
        id: `hex_${hexIdCounter++}`,
        coord,
        type,
        numberToken,
        hasRobber
      });
    }
  }

  // 3. Post-processing loop: Resolve any adjacent 6/8 conflicts globally to guarantee a valid tournament board
  let hasConflict = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (hasConflict && attempts < maxAttempts) {
    hasConflict = false;
    attempts++;

    for (let i = 0; i < tiles.length; i++) {
      const tileA = tiles[i];
      if (tileA.type === 'DESERT' || tileA.numberToken === null) continue;

      const valA = tileA.numberToken;
      if (valA === 6 || valA === 8) {
        // Check if it has a neighbor with 6 or 8
        const hasConflictNeighbor = tiles.some(tileB => 
          tileB.id !== tileA.id &&
          tileB.type !== 'DESERT' &&
          (tileB.numberToken === 6 || tileB.numberToken === 8) &&
          isNeighbor(tileA.coord, tileB.coord)
        );

        if (hasConflictNeighbor) {
          // Find a valid distant swap candidate (not desert, not 6 or 8, and has no neighbors with 6 or 8)
          const candidate = tiles.find(tileC => {
            if (tileC.id === tileA.id) return false;
            if (tileC.type === 'DESERT' || tileC.numberToken === null) return false;
            if (tileC.numberToken === 6 || tileC.numberToken === 8) return false;

            // Must not have any neighbor with 6 or 8
            const hasNeighbor6or8 = tiles.some(n => 
              n.id !== tileC.id &&
              (n.numberToken === 6 || n.numberToken === 8) &&
              isNeighbor(tileC.coord, n.coord)
            );

            return !hasNeighbor6or8;
          });

          if (candidate) {
            // Swap tokens
            const temp = tileA.numberToken;
            tileA.numberToken = candidate.numberToken;
            candidate.numberToken = temp;
            hasConflict = true; // Something changed, re-run verification
            break; // Restart scan to ensure all constraints are met
          }
        }
      }
    }
  }

  if (expansion === 'MERCHANTS_AND_BARBARIANS') {
    tiles.forEach(tile => {
      const { q, r, s } = tile.coord;
      if (q === 0 && r === 0 && s === 0) {
        tile.type = 'CASTLE';
        tile.numberToken = null;
      } else if (q === 0 && r === -2 && s === 2) {
        tile.type = 'QUARRY';
        tile.numberToken = null;
      } else if (q === 0 && r === 2 && s === -2) {
        tile.type = 'GLASSWORKS';
        tile.numberToken = null;
      }
    });
  }

  return tiles;
}
