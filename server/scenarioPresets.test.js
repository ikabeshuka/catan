const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { registerHooks } = require('node:module');
const test = require('node:test');
const { fileURLToPath, pathToFileURL } = require('node:url');
const ts = require('typescript');

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith('.') || specifier.startsWith('/')) && context.parentURL) {
      const basePath = fileURLToPath(new URL(specifier, context.parentURL));
      for (const candidate of [`${basePath}.ts`, `${basePath}/index.ts`]) {
        if (existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) {
      const source = readFileSync(fileURLToPath(url), 'utf8');
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2023
        }
      });
      return { format: 'module', shortCircuit: true, source: outputText };
    }
    return nextLoad(url, context);
  }
});

let generateBoard;
let generateEdges;
let evaluateVertices;
let getVertexIslandIds;
let reserveLostTribeDevelopmentCards;
const modulesReady = Promise.all([
  import('../src/src/utils/gameEngine/generateBoard.ts'),
  import('../src/src/utils/gameEngine/generateEdges.ts'),
  import('../src/src/utils/ai/evaluators/evaluateVertices.ts'),
  import('../src/src/utils/gameEngine/getVertexIslandIds.ts'),
  import('../src/src/utils/gameEngine/lostTribeHelpers.ts')
]).then(([boardModule, edgeModule, evaluatorModule, islandModule, lostTribeModule]) => {
  generateBoard = boardModule.generateBoard;
  generateEdges = edgeModule.generateEdges;
  evaluateVertices = evaluatorModule.evaluateVertices;
  getVertexIslandIds = islandModule.getVertexIslandIds;
  reserveLostTribeDevelopmentCards = lostTribeModule.reserveLostTribeDevelopmentCards;
});

const board = (scenario, playerCount) =>
  generateBoard({}, 'STARTER', 'SEAFARERS', scenario, playerCount);

const countBy = (values) => Object.fromEntries(
  [...values.reduce((counts, value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([a], [b]) => String(a).localeCompare(String(b)))
);

const tokenValues = (tiles) => tiles
  .map(tile => tile.numberToken)
  .filter(token => token !== null)
  .sort((a, b) => a - b);

const activeHarborCount = (tiles) =>
  generateEdges(tiles, 'SEAFARERS').filter(edge => edge.isHarbor).length;

const playableTiles = (tiles) => tiles.filter(tile => !tile.isFrameSea);

const assertHarbor = (tiles, tileId, type, destination) => {
  const tile = tiles.find(candidate => candidate.id === tileId);
  assert.ok(tile, `missing harbor source ${tileId}`);
  assert.ok(
    tile.harbors?.some(harbor => harbor.type === type && (
      'toTileId' in destination
        ? harbor.toTileId === destination.toTileId
        : harbor.edgeIndex === destination.edgeIndex
    )),
    `missing ${type} harbor on ${tileId} toward ${JSON.stringify(destination)}`
  );
};

test('Heading for New Shores 3-player main island contains all 14 official land hexes', async () => {
  await modulesReady;
  const tiles = board('HEADING_FOR_NEW_SHORES', 3);
  assert.equal(
    tiles.filter(tile => tile.type !== 'WATER' && tile.islandId === 1).length,
    14
  );
});

test('Heading for New Shores 4-player detached right island is not marked as the setup island', async () => {
  await modulesReady;
  const tiles = board('HEADING_FOR_NEW_SHORES', 4);
  for (const tileId of ['hex_4p_10', 'hex_4p_11', 'hex_4p_17', 'hex_4p_25']) {
    assert.equal(tiles.find(tile => tile.id === tileId)?.islandId, 6, `${tileId} must remain a foreign island`);
  }
});

test('Enchanted Land uses its dedicated 56-hex setup and published component inventory', async () => {
  await modulesReady;
  const tiles = playableTiles(generateBoard({}, 'STARTER', 'SEAFARERS_AND_CITIES_AND_KNIGHTS', 'ENCHANTED_LAND', 4));
  const home = tiles.filter(tile => tile.islandId === 1);
  const enchanted = tiles.filter(tile => tile.scenarioMarker?.isEnchantedLand);

  assert.equal(tiles.length, 56);
  assert.equal(home.length, 19);
  assert.equal(tiles.filter(tile => tile.type === 'WATER').length, 21);
  assert.deepEqual(countBy(enchanted.map(tile => tile.type)), {
    BRICK: 2, DESERT: 5, GOLD_FIELD: 2, ORE: 2, SHEEP: 1, WHEAT: 2, WOOD: 2,
  });
  assert.deepEqual(tokenValues(enchanted), [2, 3, 3, 4, 5, 5, 6, 8, 9, 10, 10]);
  const enchantedVertexIds = new Set(enchanted.flatMap(tile => generateEdges([tile], 'SEAFARERS').flatMap(edge => edge.id.match(/v_-?\d+(?:\.\d+)?_-?\d+(?:\.\d+)?/g) || [])));
  assert.ok(enchantedVertexIds.size >= 19, 'the island must provide a position for every dragon');
  assert.equal(tiles.filter(tile => tile.harbors?.length).length, 8);
  assert.equal(tiles.filter(tile => tile.hasRobber).length, 1);
  assert.equal(tiles.some(tile => tile.hasPirate), false);
});

test('Great Canal uses its dedicated home island, small islands, and nine canal sites', async () => {
  await modulesReady;
  const tiles = playableTiles(generateBoard({}, 'STARTER', 'SEAFARERS_AND_CITIES_AND_KNIGHTS', 'GREAT_CANAL', 4));
  const home = tiles.filter(tile => tile.islandId === 1);
  const small = tiles.filter(tile => tile.islandId === 2);

  assert.equal(tiles.length, 49);
  assert.equal(home.length, 25);
  assert.equal(tiles.filter(tile => tile.type === 'WATER').length, 19);
  assert.deepEqual(countBy(home.map(tile => tile.type)), {
    BRICK: 4, DESERT: 1, ORE: 5, SHEEP: 5, WHEAT: 6, WOOD: 4,
  });
  assert.deepEqual(countBy(small.map(tile => tile.type)), { DESERT: 3, GOLD_FIELD: 2 });
  assert.deepEqual(tokenValues(small), [8, 8]);
  assert.equal(tiles.filter(tile => tile.scenarioMarker?.canalId).length, 9);
  assert.equal(tiles.filter(tile => tile.scenarioMarker?.infertileField).length, 6);
  assert.equal(tiles.filter(tile => tile.harbors?.length).length, 8);
  assert.equal(tiles.filter(tile => tile.hasRobber).length, 1);
  assert.equal(tiles.some(tile => tile.hasPirate), false);
});

test('Greater Catan keeps every new-island terrain hex unnumbered until discovery', async () => {
  await modulesReady;
  for (const playerCount of [3, 4]) {
    const tiles = playableTiles(board('GREATER_CATAN', playerCount));
    const undiscoveredTerrain = tiles.filter(tile => tile.islandId && tile.islandId > 1 && !['WATER', 'DESERT'].includes(tile.type));
    assert.ok(undiscoveredTerrain.length > 0);
    assert.ok(undiscoveredTerrain.every(tile => tile.numberToken === null));
  }
});

test('Greater Catan uses the published 3- and 4-player component inventories', async () => {
  await modulesReady;
  const expectations = {
    3: { length: 49, water: 21, home: { BRICK: 2, ORE: 3, SHEEP: 3, WHEAT: 3, WOOD: 3 }, newLand: { BRICK: 3, ORE: 3, SHEEP: 2, WHEAT: 3, WOOD: 3 }, harbors: 8 },
    4: { length: 63, water: 25, home: { BRICK: 3, DESERT: 1, ORE: 3, SHEEP: 4, WHEAT: 4, WOOD: 4 }, newLand: { BRICK: 3, DESERT: 1, ORE: 4, SHEEP: 4, WHEAT: 3, WOOD: 4 }, harbors: 9 },
  };
  for (const playerCount of [3, 4]) {
    const tiles = playableTiles(board('GREATER_CATAN', playerCount));
    const expected = expectations[playerCount];
    assert.equal(tiles.length, expected.length);
    assert.equal(tiles.filter(tile => tile.type === 'WATER').length, expected.water);
    assert.deepEqual(countBy(tiles.filter(tile => tile.islandId === 1).map(tile => tile.type)), expected.home);
    assert.deepEqual(countBy(tiles.filter(tile => tile.islandId === 2).map(tile => tile.type)), expected.newLand);
    assert.equal(activeHarborCount(tiles), expected.harbors);
    assert.equal(tiles.filter(tile => tile.hasRobber).length, playerCount === 4 ? 1 : 0);
    assert.equal(tiles.filter(tile => tile.hasPirate).length, 1);
  }
});

test('Into the Unknown uses its published home and face-down treasure-island inventories', async () => {
  await modulesReady;
  const expectations = {
    3: {
      length: 49,
      home: { BRICK: 2, DESERT: 1, ORE: 2, SHEEP: 4, WHEAT: 2, WOOD: 3 },
      fog: { BRICK: 3, ORE: 3, SHEEP: 1, WATER: 6, WHEAT: 3, WOOD: 2 },
      fogTokens: [2, 3, 3, 4, 5, 5, 9, 9, 10, 11, 11, 12],
      faceUpDeserts: 2,
    },
    4: {
      length: 63,
      home: { BRICK: 3, ORE: 3, SHEEP: 4, WHEAT: 2, WOOD: 4 },
      fog: { BRICK: 4, ORE: 4, SHEEP: 3, WATER: 9, WHEAT: 4, WOOD: 3 },
      fogTokens: [2, 3, 3, 3, 4, 4, 5, 5, 5, 9, 9, 9, 10, 10, 11, 11, 11, 12],
      faceUpDeserts: 3,
    }
  };

  for (const playerCount of [3, 4]) {
    const tiles = board('INTO_THE_UNKNOWN', playerCount);
    const fog = tiles.filter(tile => tile.type === 'FOG');
    const home = tiles.filter(tile => tile.islandId === 1);
    const revealedTreasureLand = tiles.filter(tile => tile.islandId === 2 && tile.type !== 'FOG');
    const expected = expectations[playerCount];
    assert.equal(tiles.length, expected.length);
    assert.deepEqual(countBy(home.map(tile => tile.type)), expected.home);
    assert.deepEqual(countBy(fog.map(tile => tile.originalType)), expected.fog);
    assert.deepEqual(fog.map(tile => tile.originalNumberToken).filter(token => token !== null).sort((a, b) => a - b), expected.fogTokens);
    assert.equal(revealedTreasureLand.filter(tile => tile.type === 'DESERT').length, expected.faceUpDeserts);
    assert.deepEqual(revealedTreasureLand.filter(tile => tile.type === 'GOLD_FIELD').map(tile => tile.numberToken).sort((a, b) => a - b), [6, 8]);
    assert.equal(tiles.filter(tile => tile.hasRobber).length, 1);
    assert.equal(tiles.some(tile => tile.hasPirate), false);
  }
});

test('Desert Dragons uses its dedicated home and neighboring-island inventories', async () => {
  await modulesReady;
  const expectations = {
    3: {
      water: 18,
      neighbor: { BRICK: 3, GOLD_FIELD: 1, ORE: 3, SHEEP: 4, WHEAT: 4, WOOD: 4 },
      neighborTokens: [2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    },
    4: {
      water: 15,
      neighbor: { BRICK: 4, GOLD_FIELD: 2, ORE: 4, SHEEP: 4, WHEAT: 4, WOOD: 4 },
      neighborTokens: [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12],
    },
  };
  for (const playerCount of [3, 4]) {
    const tiles = board('DESERT_DRAGONS', playerCount);
    const home = tiles.filter(tile => tile.islandId === 1);
    const neighbor = tiles.filter(tile => tile.islandId === 2);
    const expected = expectations[playerCount];
    assert.equal(tiles.length, 56);
    assert.equal(tiles.filter(tile => tile.type === 'WATER').length, expected.water);
    assert.deepEqual(countBy(home.map(tile => tile.type)), { BRICK: 3, DESERT: 3, ORE: 3, SHEEP: 4, WHEAT: 3, WOOD: 3 });
    assert.deepEqual(countBy(neighbor.map(tile => tile.type)), expected.neighbor);
    assert.deepEqual(tokenValues(neighbor), expected.neighborTokens);
    assert.equal(activeHarborCount(tiles), 9);
    assert.equal(tiles.some(tile => tile.hasRobber || tile.hasPirate), false);
  }
});

test('Heading for New Shores setup bot only evaluates vertices on the main island', async () => {
  await modulesReady;
  const tiles = board('HEADING_FOR_NEW_SHORES', 4);
  const vertices = [...new Set(
    generateEdges(tiles, 'SEAFARERS').flatMap(edge => edge.id.match(/v_-?\d+(?:\.\d+)?_-?\d+(?:\.\d+)?/g) || [])
  )].map(id => ({ id, structure: 'NONE' }));
  const edges = generateEdges(tiles, 'SEAFARERS');
  const candidates = evaluateVertices(
    'bot-1',
    'SETUP_ROUND_1',
    tiles,
    vertices,
    edges,
    'MEDIUM',
    'HEADING_FOR_NEW_SHORES',
    'SEAFARERS'
  );

  assert.ok(candidates.length > 0);
  assert.ok(candidates.every(candidate => {
    const islandIds = getVertexIslandIds(candidate.vertexId, tiles);
    return islandIds.length > 0 && islandIds.every(id => id === 1);
  }));
});

test('Four Islands presets have official terrain, token, harbor, robber, and pirate data', async () => {
  await modulesReady;
  const expectations = {
    3: {
      terrain: { BRICK: 4, ORE: 4, SHEEP: 4, WATER: 17, WHEAT: 4, WOOD: 4 },
      tokens: [2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 11, 11, 12]
    },
    4: {
      terrain: { BRICK: 4, ORE: 4, SHEEP: 5, WATER: 14, WHEAT: 5, WOOD: 5 },
      tokens: [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12]
    }
  };

  for (const playerCount of [3, 4]) {
    const tiles = board('FOUR_ISLANDS', playerCount);
    assert.deepEqual(countBy(playableTiles(tiles).map(tile => tile.type)), expectations[playerCount].terrain);
    assert.deepEqual(tokenValues(tiles), expectations[playerCount].tokens);
    assert.equal(activeHarborCount(tiles), 9);

    const [robber] = tiles.filter(tile => tile.hasRobber);
    const [pirate] = tiles.filter(tile => tile.hasPirate);
    assert.equal(robber.numberToken, 12);
    assert.notEqual(robber.type, 'WATER');
    assert.equal(pirate.type, 'WATER');
    if (playerCount === 4) assert.equal(pirate.isFrameSea, true);
  }
});

test('Fog Islands use the exact official 12-tile discovery stack', async () => {
  await modulesReady;
  const expectedTerrain = {
    BRICK: 2,
    GOLD_FIELD: 2,
    ORE: 2,
    SHEEP: 1,
    WATER: 2,
    WHEAT: 2,
    WOOD: 1
  };
  const expectedTokens = {
    3: [3, 3, 4, 5, 6, 8, 9, 10, 11, 12],
    4: [3, 4, 5, 6, 8, 9, 10, 11, 11, 12]
  };

  for (const playerCount of [3, 4]) {
    const tiles = board('FOG_ISLAND', playerCount);
    const fogTiles = tiles.filter(tile => tile.type === 'FOG');
    assert.equal(fogTiles.length, 12);
    assert.deepEqual(countBy(fogTiles.map(tile => tile.originalType)), expectedTerrain);
    assert.deepEqual(
      fogTiles
        .map(tile => tile.originalNumberToken)
        .filter(token => token !== null)
        .sort((a, b) => a - b),
      expectedTokens[playerCount]
    );
    assert.equal(activeHarborCount(tiles), playerCount === 3 ? 8 : 9);
    assert.equal(tiles.find(tile => tile.hasPirate)?.type, 'WATER');
  }
});

test('Through the Desert selects dedicated official 3- and 4-player presets', async () => {
  await modulesReady;
  const expectations = {
    3: {
      length: 37,
      harbors: 8,
      terrain: {
        BRICK: 3,
        DESERT: 3,
        GOLD_FIELD: 2,
        ORE: 4,
        SHEEP: 4,
        WATER: 12,
        WHEAT: 4,
        WOOD: 5
      }
    },
    4: {
      length: 44,
      harbors: 9,
      terrain: {
        BRICK: 5,
        DESERT: 3,
        GOLD_FIELD: 2,
        ORE: 5,
        SHEEP: 5,
        WATER: 14,
        WHEAT: 5,
        WOOD: 5
      }
    }
  };

  for (const playerCount of [3, 4]) {
    const tiles = board('THROUGH_THE_DESERT', playerCount);
    assert.equal(playableTiles(tiles).length, expectations[playerCount].length);
    assert.deepEqual(countBy(playableTiles(tiles).map(tile => tile.type)), expectations[playerCount].terrain);
    assert.equal(activeHarborCount(tiles), expectations[playerCount].harbors);
    assert.equal(tiles.find(tile => tile.hasPirate)?.type, 'WATER');
    assert.equal(tiles.find(tile => tile.hasRobber)?.type, 'DESERT');
  }
});

test('Cloth for Catan uses the supplied 5-6-7-8-7-6-5 map, villages, ports, and markers', async () => {
  await modulesReady;
  for (const playerCount of [3, 4]) {
    const tiles = board('CLOTH_FOR_CATAN', playerCount);
    assert.equal(playableTiles(tiles).length, 44);
    assert.deepEqual(
      [...playableTiles(tiles).reduce((rows, tile) => rows.set(tile.coord.r, (rows.get(tile.coord.r) || 0) + 1), new Map()).values()],
      [5, 6, 7, 8, 7, 6, 5]
    );
    assert.equal(tiles.filter(tile => tile.islandId === 1).length, 20);
    assert.equal(tiles.find(tile => tile.hasPirate)?.id, 'hex_cfc_26');
    assert.equal(tiles.find(tile => tile.hasRobber)?.id, 'hex_cfc_12');
    assert.equal(activeHarborCount(tiles), 9);
    const villages = tiles.flatMap(tile => tile.lostTribeVillages || []);
    assert.equal(villages.length, 8);
    assert.deepEqual(villages.map(village => village.number).sort((a, b) => a - b), [3, 4, 5, 6, 8, 9, 10, 11]);
    assert.ok(villages.every(village => village.clothRemaining === 5));
    assert.equal(tiles.find(tile => tile.lostTribeGeneralCloth !== undefined)?.lostTribeGeneralCloth, 10);
  }
});

test('Cloth for Catan advanced setup only shuffles the two main islands', async () => {
  await modulesReady;
  for (let iteration = 0; iteration < 30; iteration++) {
    const tiles = generateBoard({}, 'RANDOM', 'SEAFARERS', 'CLOTH_FOR_CATAN', 4);
    assert.deepEqual(tiles.find(tile => tile.id === 'hex_cfc_15')?.lostTribeVillages?.map(village => village.number), [11, 8]);
    assert.deepEqual(tiles.find(tile => tile.id === 'hex_cfc_30')?.lostTribeVillages?.map(village => village.number), [6, 3]);
  }
});

test('The Lost Tribe keeps its original 6-7-8-9-8-7-6 map and all 18 gifts', async () => {
  await modulesReady;
  const tiles = board('THE_LOST_TRIBE', 4);
  assert.equal(playableTiles(tiles).length, 51);
  assert.deepEqual([...playableTiles(tiles).reduce((rows, tile) => rows.set(tile.coord.r, (rows.get(tile.coord.r) || 0) + 1), new Map()).values()], [6, 7, 8, 9, 8, 7, 6]);
  const rewardEdges = generateEdges(tiles, 'SEAFARERS').filter(edge => edge.lostTribeReward);
  assert.equal(rewardEdges.filter(edge => edge.lostTribeReward.kind === 'VICTORY_POINT').length, 8);
  assert.equal(rewardEdges.filter(edge => edge.lostTribeReward.kind === 'DEV_CARD').length, 4);
  assert.equal(rewardEdges.filter(edge => edge.lostTribeReward.kind === 'HARBOR').length, 6);
});

test('Pirate Islands has its fixed 51-tile layout, eight ports, and no robber', async () => {
  await modulesReady;
  const tiles = board('PIRATE_ISLANDS', 4);
  assert.equal(playableTiles(tiles).length, 51);
  assert.deepEqual(
    [...playableTiles(tiles).reduce((rows, tile) => rows.set(tile.coord.r, (rows.get(tile.coord.r) || 0) + 1), new Map()).values()],
    [6, 7, 8, 9, 8, 7, 6]
  );
  assert.equal(tiles.filter(tile => tile.hasRobber).length, 0);
  assert.equal(tiles.find(tile => tile.hasPirate)?.id, 'hex_pi_49');
  assert.equal(activeHarborCount(tiles), 8);
  assert.equal(tiles.find(tile => tile.id === 'hex_pi_36')?.numberToken, null);
  assert.equal(tiles.find(tile => tile.id === 'hex_pi_39')?.numberToken, null);
});

test('random Seafarers generation preserves every preset inventory and legal marker terrain', async () => {
  await modulesReady;
  const scenarios = {
    HEADING_FOR_NEW_SHORES: { 3: 8, 4: 9 },
    FOUR_ISLANDS: { 3: 9, 4: 9 },
    FOG_ISLAND: { 3: 8, 4: 9 },
    THROUGH_THE_DESERT: { 3: 8, 4: 9 }
  };

  for (const [scenario, harborCounts] of Object.entries(scenarios)) {
    for (const playerCount of [3, 4]) {
      const starter = board(scenario, playerCount);
      for (let iteration = 0; iteration < 5; iteration++) {
        const randomized = generateBoard({}, 'RANDOM', 'SEAFARERS', scenario, playerCount);
        assert.deepEqual(
          countBy(playableTiles(randomized).map(tile => tile.type)),
          countBy(playableTiles(starter).map(tile => tile.type))
        );
        assert.deepEqual(tokenValues(randomized), tokenValues(starter));
        assert.equal(activeHarborCount(randomized), harborCounts[playerCount]);
        assert.equal(randomized.find(tile => tile.hasPirate)?.type, 'WATER');
        assert.notEqual(randomized.find(tile => tile.hasRobber)?.type, 'WATER');
      }
    }
  }
});

test('reported 4-player harbor positions and types match the scenario diagrams', async () => {
  await modulesReady;

  const fourIslands = board('FOUR_ISLANDS', 4);
  assertHarbor(fourIslands, 'hex_fi4_23', 'BRICK', { edgeIndex: 2 });
  assertHarbor(fourIslands, 'hex_fi4_28', 'ORE', { toTileId: 'hex_fi4_21' });

  const fog = board('FOG_ISLAND', 4);
  assertHarbor(fog, 'hex_fog4_3', 'SHEEP', { edgeIndex: 5 });
  assertHarbor(fog, 'hex_fog4_5', 'WHEAT', { edgeIndex: 4 });
  assertHarbor(fog, 'hex_fog4_5', 'GENERIC', { edgeIndex: 0 });
  assertHarbor(fog, 'hex_fog4_18', 'BRICK', { edgeIndex: 5 });
  assertHarbor(fog, 'hex_fog4_27', 'ORE', { edgeIndex: 2 });
  assertHarbor(fog, 'hex_fog4_33', 'GENERIC', { toTileId: 'hex_fog4_32' });
  assertHarbor(fog, 'hex_fog4_40', 'GENERIC', { edgeIndex: 3 });
  assertHarbor(fog, 'hex_fog4_40', 'GENERIC', { edgeIndex: 1 });

  const desert = board('THROUGH_THE_DESERT', 4);
  assertHarbor(desert, 'hex_td_3', 'BRICK', { toTileId: 'hex_td_4' });
  assertHarbor(desert, 'hex_td_16', 'GENERIC', { toTileId: 'hex_td_10' });
  assertHarbor(desert, 'hex_td_16', 'GENERIC', { toTileId: 'hex_td_24' });
  assertHarbor(desert, 'hex_td_21', 'ORE', { toTileId: 'hex_td_20' });
  assertHarbor(desert, 'hex_td_30', 'GENERIC', { toTileId: 'hex_td_37' });
  assertHarbor(desert, 'hex_td_34', 'WHEAT', { edgeIndex: 3 });
  assertHarbor(desert, 'hex_td_34', 'ORE', { toTileId: 'hex_td_40' });
  assertHarbor(desert, 'hex_td_41', 'GENERIC', { edgeIndex: 2 });
  assertHarbor(desert, 'hex_td_41', 'WOOD', { toTileId: 'hex_td_42' });
  assert.equal(desert.find(tile => tile.id === 'hex_td_33').harbors, undefined);
});

test('frame sea targets are pirate-only board targets and do not create buildable edges', async () => {
  await modulesReady;
  const tiles = board('FOUR_ISLANDS', 4);
  const frameTiles = tiles.filter(tile => tile.isFrameSea);
  assert.ok(frameTiles.length > 0);
  assert.ok(frameTiles.every(tile => tile.type === 'WATER'));
  assert.equal(tiles.find(tile => tile.hasPirate)?.id, 'frame_4_0');
  assert.equal(generateEdges(tiles, 'SEAFARERS').length, generateEdges(playableTiles(tiles), 'SEAFARERS').length);
});
