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
const modulesReady = Promise.all([
  import('../src/src/utils/gameEngine/generateBoard.ts'),
  import('../src/src/utils/gameEngine/generateEdges.ts')
]).then(([boardModule, edgeModule]) => {
  generateBoard = boardModule.generateBoard;
  generateEdges = edgeModule.generateEdges;
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
