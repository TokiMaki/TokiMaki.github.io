import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createEnchantRecommendationDisplayOrder } from '../src/dnfHellTool/enchantRecommendationDisplayOrder.js';

const PRE_MOVE_FIXTURE_JSON_SHA256 = 'd3e625baf5b1aadc9600d928754de5c79ea3a574fddc9b8203489066093c6192';
const PRE_MOVE_ENCHANT_VIEW_SHA256 = '54f4b793ae4a5a1eeed2eff03b652f229c3dea5ab06bf2925e5732511e82c58f';
const LEGACY_KEY_BLOCK_SHA256 = '111ab5c7ed7205a1864a818fb09150c7c6e801f64f7afe5a4d037417ecfb6661';
const LEGACY_FREEZE_BLOCK_SHA256 = '5c17932f8e6490322b4342cbcbaaa4d92000cf83e3b062324da5477865434a04';
const LEGACY_RELEASE_BLOCK_SHA256 = 'f8bae6574f8a93a160d4b84b2e17c89d4dff726d34fd912efd73a2dfb57b428b';
const LEGACY_RENDERER_BLOCK_SHA256 = 'f22ba119c2d7cb13604a5a619f366d58a181825ce4a9b5e5988193bf902d0472';
const HTML_MAP_LF_BLOCK_SHA256 = 'b1e928aca8315e0cff2d93b514e9d12457310dd68061c25dd12a6a1d1b164641';
const PROTECTED_FILE_SHA256 = Object.freeze({
  applicationStateModule: '18433dc58de22f4b48ac35cecb85b96efd0615b0d6cbe8b6ff2b3688dc9e944d',
  layoutModule: '7b37b254b2fd4c135f8286061ca93a26d621389bf1d2b02fbf2d3b2449160265',
  layoutTest: 'e3db0e5f8d3999fe3cb3f5f00f6fa0daac509456e281dd56fb9c2b6c2f5c90a9',
  eventBindings: '02d28f0f55a05c9d51b1ec8a6405b3352124d26e9adabfe91d07e27e6f34c31f',
  initDnfHellTool: 'c9999ba2b1b727afe699d7377128ad47d8673052b361b2436a8206c684b146df',
});

const LEGACY_KEY_BLOCK = `  function getRecommendationDisplayOrderKey(row = {}) {
    if (row.sourceType === 'oathAcquisitionCombined') {
      return \`oathCombined:\${row.oathAcquisitionPairKey}\`;
    }
    if (TUNE_SOURCE_TYPES.has(row.sourceType)) return \`tune:\${row.sourceType}\`;
    if (OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType) && row.variantGroupKey) {
      return \`oathDecision:\${row.variantGroupKey}\`;
    }
    return getDealerSimulatorRecommendationId(row);
  }`;

const LEGACY_FREEZE_BLOCK = `  function freezeRecommendationOrderWhileEditing(sourceType = '') {
    if (state.frozenRecommendationDisplayKey) return;
    const candidateKeys = [
      \`tune:\${sourceType}\`,
      \`oathCombined:\${sourceType}\`,
      \`oathDecision:\${sourceType}\`,
    ];
    const displayOrder = state.lastRecommendationDisplayOrder || [];
    const key = candidateKeys.find((candidate) => displayOrder.includes(candidate)) || '';
    if (!key) return;
    state.frozenRecommendationDisplayKey = key;
    state.frozenRecommendationDisplayIndex = displayOrder.indexOf(key);
  }`;

const LEGACY_RELEASE_BLOCK = `  function releaseRecommendationOrderAfterEditing() {
    state.frozenRecommendationDisplayKey = '';
    state.frozenRecommendationDisplayIndex = -1;
  }`;

const LEGACY_RENDERER_BLOCK = `    let displayRecommendations = state.currentBufferBaseline?.isBuffer
      ? decoratedRecommendations.sort(compareBufferRecommendationOrder)
      : decoratedRecommendations.sort(compareDealerRecommendationOrder);
    if (state.equipmentTunePopoverOpen && state.frozenRecommendationDisplayKey) {
      const frozenRowIndex = displayRecommendations.findIndex(
        (row) => getRecommendationDisplayOrderKey(row) === state.frozenRecommendationDisplayKey,
      );
      if (frozenRowIndex >= 0) {
        const [frozenRow] = displayRecommendations.splice(frozenRowIndex, 1);
        const targetIndex = Math.max(
          0,
          Math.min(
            displayRecommendations.length,
            Number(state.frozenRecommendationDisplayIndex || 0),
          ),
        );
        displayRecommendations.splice(targetIndex, 0, frozenRow);
      }
    }
    state.lastRecommendationDisplayOrder = displayRecommendations.map(
      getRecommendationDisplayOrderKey,
    );`;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeLf(value) {
  return value.replaceAll('\r\n', '\n');
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const DISPLAY_STATE_KEYS = [
  'isBuffer',
  'equipmentTunePopoverOpen',
  'lastRecommendationDisplayOrder',
  'frozenRecommendationDisplayKey',
  'frozenRecommendationDisplayIndex',
];

function assertDisplayStateSnapshot(snapshot) {
  assert.deepEqual(Object.keys(snapshot), DISPLAY_STATE_KEYS);
}

function createEmbeddedLegacyDisplayOrder({
  tuneSourceTypes,
  oathDecisionVariantSourceTypes,
  getDealerSimulatorRecommendationId,
  compareBufferRecommendationOrder,
  compareDealerRecommendationOrder,
  state,
}) {
  function getRecommendationDisplayOrderKey(row = {}) {
    if (row.sourceType === 'oathAcquisitionCombined') {
      return `oathCombined:${row.oathAcquisitionPairKey}`;
    }
    if (tuneSourceTypes.has(row.sourceType)) return `tune:${row.sourceType}`;
    if (oathDecisionVariantSourceTypes.has(row.sourceType) && row.variantGroupKey) {
      return `oathDecision:${row.variantGroupKey}`;
    }
    return getDealerSimulatorRecommendationId(row);
  }

  function orderEnchantRecommendationDisplay(recommendations) {
    let displayRecommendations = state.isBuffer
      ? recommendations.sort(compareBufferRecommendationOrder)
      : recommendations.sort(compareDealerRecommendationOrder);
    if (state.equipmentTunePopoverOpen && state.frozenRecommendationDisplayKey) {
      const frozenRowIndex = displayRecommendations.findIndex(
        (row) => getRecommendationDisplayOrderKey(row) === state.frozenRecommendationDisplayKey,
      );
      if (frozenRowIndex >= 0) {
        const [frozenRow] = displayRecommendations.splice(frozenRowIndex, 1);
        const targetIndex = Math.max(
          0,
          Math.min(
            displayRecommendations.length,
            Number(state.frozenRecommendationDisplayIndex || 0),
          ),
        );
        displayRecommendations.splice(targetIndex, 0, frozenRow);
      }
    }
    state.lastRecommendationDisplayOrder = displayRecommendations.map(
      getRecommendationDisplayOrderKey,
    );
    return displayRecommendations;
  }

  function freezeRecommendationOrderWhileEditing(sourceType = '') {
    if (state.frozenRecommendationDisplayKey) return;
    const candidateKeys = [
      `tune:${sourceType}`,
      `oathCombined:${sourceType}`,
      `oathDecision:${sourceType}`,
    ];
    const displayOrder = state.lastRecommendationDisplayOrder || [];
    const key = candidateKeys.find((candidate) => displayOrder.includes(candidate)) || '';
    if (!key) return;
    state.frozenRecommendationDisplayKey = key;
    state.frozenRecommendationDisplayIndex = displayOrder.indexOf(key);
  }

  function releaseRecommendationOrderAfterEditing() {
    state.frozenRecommendationDisplayKey = '';
    state.frozenRecommendationDisplayIndex = -1;
  }

  return {
    orderEnchantRecommendationDisplay,
    freezeRecommendationOrderWhileEditing,
    releaseRecommendationOrderAfterEditing,
  };
}

function createStateProxy(initialState, setterCalls) {
  return new Proxy({ ...initialState }, {
    set(target, key, value) {
      setterCalls.push([String(key), value]);
      target[key] = value;
      return true;
    },
  });
}

function createHarness(kind, initialState) {
  const comparatorCalls = [];
  const setterCalls = [];
  const displayStateCalls = [];
  const state = createStateProxy(initialState, setterCalls);
  const common = {
    tuneSourceTypes: new Set(['equipmentTune', 'oathTune']),
    oathDecisionVariantSourceTypes: new Set(['oathTranscend', 'oathCraft']),
    getDealerSimulatorRecommendationId(row) {
      return `id:${row.id}`;
    },
    compareBufferRecommendationOrder(a, b) {
      comparatorCalls.push(`buffer:${a.id}:${b.id}`);
      return a.orderRank - b.orderRank;
    },
    compareDealerRecommendationOrder(a, b) {
      comparatorCalls.push(`dealer:${a.id}:${b.id}`);
      return a.orderRank - b.orderRank;
    },
  };
  if (kind === 'legacy') {
    return {
      api: createEmbeddedLegacyDisplayOrder({ ...common, state }),
      state,
      comparatorCalls,
      setterCalls,
      displayStateCalls,
    };
  }
  const api = createEnchantRecommendationDisplayOrder({
    ...common,
    getDisplayOrderState() {
      const snapshot = {
        isBuffer: state.isBuffer,
        equipmentTunePopoverOpen: state.equipmentTunePopoverOpen,
        lastRecommendationDisplayOrder: state.lastRecommendationDisplayOrder,
        frozenRecommendationDisplayKey: state.frozenRecommendationDisplayKey,
        frozenRecommendationDisplayIndex: state.frozenRecommendationDisplayIndex,
      };
      displayStateCalls.push(snapshot);
      return snapshot;
    },
    setLastRecommendationDisplayOrder(value) {
      state.lastRecommendationDisplayOrder = value;
    },
    setFrozenRecommendationDisplayKey(value) {
      state.frozenRecommendationDisplayKey = value;
    },
    setFrozenRecommendationDisplayIndex(value) {
      state.frozenRecommendationDisplayIndex = value;
    },
  });
  return { api, state, comparatorCalls, setterCalls, displayStateCalls };
}

function row(id, orderRank, extra = {}) {
  return {
    id,
    sourceType: 'enchant',
    orderRank,
    nested: { id: `nested:${id}` },
    ...extra,
  };
}

function createOrderScenarios() {
  return [
    {
      name: 'dealer-stable',
      rows: [row('d1', 2), row('d2', 1), row('d3', 1)],
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: false,
        lastRecommendationDisplayOrder: ['old:dealer'],
        frozenRecommendationDisplayKey: '',
        frozenRecommendationDisplayIndex: -1,
      },
    },
    {
      name: 'buffer-only',
      rows: [row('b1', 2), row('b2', 1), row('b3', 1)],
      state: {
        isBuffer: 'buffer',
        equipmentTunePopoverOpen: false,
        lastRecommendationDisplayOrder: ['old:buffer'],
        frozenRecommendationDisplayKey: '',
        frozenRecommendationDisplayIndex: -1,
      },
    },
    {
      name: 'frozen-tune-string-index',
      rows: [
        row('tune', 0, { sourceType: 'equipmentTune' }),
        row('normal-a', 1),
        row('normal-b', 2),
      ],
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: ['old:tune'],
        frozenRecommendationDisplayKey: 'tune:equipmentTune',
        frozenRecommendationDisplayIndex: '1',
      },
    },
    {
      name: 'frozen-combined-negative-clamp',
      rows: [
        row('normal', 1),
        row('combined', 0, {
          sourceType: 'oathAcquisitionCombined',
          oathAcquisitionPairKey: 'pair-a',
        }),
      ],
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: ['old:combined'],
        frozenRecommendationDisplayKey: 'oathCombined:pair-a',
        frozenRecommendationDisplayIndex: -9,
      },
    },
    {
      name: 'frozen-oath-overflow-clamp',
      rows: [
        row('oath', 0, {
          sourceType: 'oathTranscend',
          variantGroupKey: 'group-a',
        }),
        row('normal', 1),
      ],
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: ['old:oath'],
        frozenRecommendationDisplayKey: 'oathDecision:group-a',
        frozenRecommendationDisplayIndex: 99,
      },
    },
    {
      name: 'frozen-missing',
      rows: [row('m2', 1), row('m1', 0)],
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: ['old:missing'],
        frozenRecommendationDisplayKey: 'tune:not-found',
        frozenRecommendationDisplayIndex: 1,
      },
    },
    {
      name: 'popover-closed',
      rows: [
        row('tune-closed', 0, { sourceType: 'equipmentTune' }),
        row('closed-normal', 1),
      ],
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: false,
        lastRecommendationDisplayOrder: ['old:closed'],
        frozenRecommendationDisplayKey: 'tune:equipmentTune',
        frozenRecommendationDisplayIndex: 1,
      },
    },
    {
      name: 'empty',
      rows: [],
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: ['old:empty'],
        frozenRecommendationDisplayKey: '',
        frozenRecommendationDisplayIndex: -1,
      },
    },
  ];
}

function runOrderScenario(kind, scenario) {
  const recommendations = scenario.rows;
  const initialArray = recommendations;
  const originalRowsById = new Map(recommendations.map((item) => [item.id, item]));
  const originalRowSnapshots = new Map(recommendations.map((item) => [item.id, cloneJson(item)]));
  const initialLastOrder = scenario.state.lastRecommendationDisplayOrder;
  const harness = createHarness(kind, scenario.state);
  assert.deepEqual(Object.keys(harness.api), [
    'orderEnchantRecommendationDisplay',
    'freezeRecommendationOrderWhileEditing',
    'releaseRecommendationOrderAfterEditing',
  ]);
  assert.equal(harness.displayStateCalls.length, 0, `${scenario.name}: factory must not read display state`);
  const output = harness.api.orderEnchantRecommendationDisplay(recommendations);
  const outputIds = output.map((item) => item.id);
  const expectedOrderIds = {
    'dealer-stable': ['d2', 'd3', 'd1'],
    'buffer-only': ['b2', 'b3', 'b1'],
    'frozen-tune-string-index': ['normal-a', 'tune', 'normal-b'],
    'frozen-combined-negative-clamp': ['combined', 'normal'],
    'frozen-oath-overflow-clamp': ['normal', 'oath'],
    'frozen-missing': ['m1', 'm2'],
    'popover-closed': ['tune-closed', 'closed-normal'],
    empty: [],
  }[scenario.name];
  assert.deepEqual(outputIds, expectedOrderIds, `${scenario.name}: exact id order`);
  assert.deepEqual(
    output.map((item) => [item.sourceType, item.id]),
    expectedOrderIds.map((id) => [originalRowsById.get(id).sourceType, id]),
    `${scenario.name}: exact sourceType/id order`,
  );

  assert.equal(output, initialArray, `${scenario.name}: same input/output array reference`);
  assert.equal(output.length, originalRowsById.size, `${scenario.name}: recommendation count`);
  assert.ok(output.every((item) => item === originalRowsById.get(item.id)), `${scenario.name}: row identity`);
  assert.ok(output.every((item) => item.nested === originalRowsById.get(item.id).nested), `${scenario.name}: nested identity`);
  output.forEach((item) => {
    assert.deepEqual(item, originalRowSnapshots.get(item.id), `${scenario.name}: row unchanged ${item.id}`);
  });
  assert.notEqual(harness.state.lastRecommendationDisplayOrder, initialLastOrder, `${scenario.name}: last order new array`);
  assert.deepEqual(
    harness.setterCalls,
    [['lastRecommendationDisplayOrder', harness.state.lastRecommendationDisplayOrder]],
    `${scenario.name}: last-order setter sequence`,
  );
  if (kind === 'module') {
    assert.equal(harness.displayStateCalls.length, 1, `${scenario.name}: one state read per order call`);
    assertDisplayStateSnapshot(harness.displayStateCalls[0]);
    assert.equal(harness.displayStateCalls[0].lastRecommendationDisplayOrder, initialLastOrder);
  }

  return {
    name: scenario.name,
    order: outputIds,
    keys: harness.state.lastRecommendationDisplayOrder.slice(),
    calls: harness.comparatorCalls.slice(),
    sameArray: output === initialArray,
    sameRows: output.every((item) => item === originalRowsById.get(item.id)),
    sameNested: output.every((item) => item.nested === originalRowsById.get(item.id).nested),
    lastOrderReplaced: harness.state.lastRecommendationDisplayOrder !== initialLastOrder,
    frozenKey: harness.state.frozenRecommendationDisplayKey,
    frozenIndex: harness.state.frozenRecommendationDisplayIndex,
  };
}

function createFreezeScenarios() {
  return [
    {
      name: 'candidate-priority-and-release',
      sourceType: 'same',
      release: true,
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: [
          'id:before',
          'oathCombined:same',
          'tune:same',
          'oathDecision:same',
        ],
        frozenRecommendationDisplayKey: '',
        frozenRecommendationDisplayIndex: -1,
      },
    },
    {
      name: 'already-frozen',
      sourceType: 'same',
      release: false,
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: ['tune:same'],
        frozenRecommendationDisplayKey: 'existing',
        frozenRecommendationDisplayIndex: 4,
      },
    },
    {
      name: 'candidate-missing',
      sourceType: 'none',
      release: false,
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: ['id:only'],
        frozenRecommendationDisplayKey: '',
        frozenRecommendationDisplayIndex: -1,
      },
    },
    {
      name: 'missing-order',
      sourceType: 'same',
      release: false,
      state: {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: null,
        frozenRecommendationDisplayKey: '',
        frozenRecommendationDisplayIndex: -1,
      },
    },
  ];
}

function runFreezeScenario(kind, scenario) {
  const initialOrder = scenario.state.lastRecommendationDisplayOrder;
  const harness = createHarness(kind, scenario.state);
  assert.equal(harness.displayStateCalls.length, 0, `${scenario.name}: factory must not read display state`);
  harness.api.freezeRecommendationOrderWhileEditing(scenario.sourceType);
  const afterFreeze = {
    key: harness.state.frozenRecommendationDisplayKey,
    index: harness.state.frozenRecommendationDisplayIndex,
    sameOrderRef: harness.state.lastRecommendationDisplayOrder === initialOrder,
  };
  const expectedFreezeSetters = scenario.name === 'candidate-priority-and-release'
    ? [
      ['frozenRecommendationDisplayKey', 'tune:same'],
      ['frozenRecommendationDisplayIndex', 2],
    ]
    : [];
  assert.deepEqual(harness.setterCalls, expectedFreezeSetters, `${scenario.name}: freeze setter order`);
  if (kind === 'module') {
    assert.equal(harness.displayStateCalls.length, 1, `${scenario.name}: one state read per freeze call`);
    assertDisplayStateSnapshot(harness.displayStateCalls[0]);
    assert.equal(harness.displayStateCalls[0].lastRecommendationDisplayOrder, initialOrder);
  }

  let afterRelease = null;
  if (scenario.release) {
    harness.api.releaseRecommendationOrderAfterEditing();
    afterRelease = {
      key: harness.state.frozenRecommendationDisplayKey,
      index: harness.state.frozenRecommendationDisplayIndex,
    };
    assert.deepEqual(harness.setterCalls, [
      ...expectedFreezeSetters,
      ['frozenRecommendationDisplayKey', ''],
      ['frozenRecommendationDisplayIndex', -1],
    ], `${scenario.name}: release setter order`);
    if (kind === 'module') {
      assert.equal(harness.displayStateCalls.length, 1, `${scenario.name}: release does not read state`);
    }
  }

  return {
    name: scenario.name,
    afterFreeze,
    afterRelease,
    calls: harness.comparatorCalls.slice(),
  };
}

function testBehaviorAndFixture() {
  const legacyOrder = createOrderScenarios().map((scenario) => runOrderScenario('legacy', scenario));
  const moduleOrder = createOrderScenarios().map((scenario) => runOrderScenario('module', scenario));
  assert.deepEqual(moduleOrder, legacyOrder);

  const legacyFreeze = createFreezeScenarios().map((scenario) => runFreezeScenario('legacy', scenario));
  const moduleFreeze = createFreezeScenarios().map((scenario) => runFreezeScenario('module', scenario));
  assert.deepEqual(moduleFreeze, legacyFreeze);

  const portableFixture = {
    schema: 'enchantRecommendationDisplayOrder/pre-move-v1',
    orderScenarios: legacyOrder,
    freezeScenarios: legacyFreeze,
  };
  const fixtureJson = JSON.stringify(portableFixture);
  assert.equal(sha256(fixtureJson), PRE_MOVE_FIXTURE_JSON_SHA256);
  return PRE_MOVE_FIXTURE_JSON_SHA256;
}

function testErrorsAndDefaultSignature() {
  for (const recommendations of [undefined, null]) {
    for (const kind of ['legacy', 'module']) {
      const lastOrder = ['unchanged'];
      const harness = createHarness(kind, {
        isBuffer: false,
        equipmentTunePopoverOpen: true,
        lastRecommendationDisplayOrder: lastOrder,
        frozenRecommendationDisplayKey: '',
        frozenRecommendationDisplayIndex: -1,
      });
      assert.throws(
        () => harness.api.orderEnchantRecommendationDisplay(recommendations),
        TypeError,
        `${kind}: ${recommendations} preserves sort TypeError`,
      );
      assert.equal(harness.state.lastRecommendationDisplayOrder, lastOrder);
      assert.deepEqual(harness.setterCalls, []);
      if (kind === 'module') assert.equal(harness.displayStateCalls.length, 1);
    }
  }

  for (const kind of ['legacy', 'module']) {
    const harness = createHarness(kind, {
      isBuffer: false,
      equipmentTunePopoverOpen: true,
      lastRecommendationDisplayOrder: ['oathDecision:', 'oathCombined:', 'tune:'],
      frozenRecommendationDisplayKey: '',
      frozenRecommendationDisplayIndex: -1,
    });
    harness.api.freezeRecommendationOrderWhileEditing();
    assert.equal(harness.state.frozenRecommendationDisplayKey, 'tune:');
    assert.equal(harness.state.frozenRecommendationDisplayIndex, 2);
  }
}

function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `missing ${signature}`);
  const bodyStart = start + signature.length - 1;
  assert.equal(source[bodyStart], '{');
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated ${signature}`);
}

function testMechanicalSourceContract() {
  assert.equal(sha256(LEGACY_KEY_BLOCK), LEGACY_KEY_BLOCK_SHA256);
  assert.equal(LEGACY_KEY_BLOCK.split('\n').length, 10);
  assert.equal(sha256(LEGACY_FREEZE_BLOCK), LEGACY_FREEZE_BLOCK_SHA256);
  assert.equal(LEGACY_FREEZE_BLOCK.split('\n').length, 13);
  assert.equal(sha256(LEGACY_RELEASE_BLOCK), LEGACY_RELEASE_BLOCK_SHA256);
  assert.equal(LEGACY_RELEASE_BLOCK.split('\n').length, 4);
  assert.equal(sha256(LEGACY_RENDERER_BLOCK), LEGACY_RENDERER_BLOCK_SHA256);
  assert.equal(LEGACY_RENDERER_BLOCK.split('\n').length, 22);

  const modulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationDisplayOrder.js', import.meta.url));
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const applicationStateModulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationApplicationState.js', import.meta.url));
  const layoutModulePath = fileURLToPath(new URL('../src/dnfHellTool/enchantRecommendationLayout.js', import.meta.url));
  const layoutTestPath = fileURLToPath(new URL('./test_enchant_recommendation_layout.js', import.meta.url));
  const eventBindingsPath = fileURLToPath(new URL('../src/dnfHellTool/eventBindings.js', import.meta.url));
  const initPath = fileURLToPath(new URL('../src/dnfHellTool/initDnfHellTool.js', import.meta.url));

  const moduleSource = normalizeLf(readFileSync(modulePath, 'utf8'));
  assert.equal((moduleSource.match(/export function createEnchantRecommendationDisplayOrder/g) || []).length, 1);
  assert.equal((moduleSource.match(/\bexport\b/g) || []).length, 1);
  for (const forbidden of [
    /^import\s/m,
    /export\s+default/,
    /\bclass\b/,
    /\bstate\b/,
    /\bels\b/,
    /\bdocument\b/,
    /\bwindow\b/,
    /innerHTML/,
    /\bMap\b/,
    /\.\.\./,
    /Boolean\s*\(/,
    /function compareBufferRecommendationOrder/,
    /function compareDealerRecommendationOrder/,
  ]) {
    assert.ok(!forbidden.test(moduleSource), `new module forbids ${forbidden}`);
  }
  assert.ok(moduleSource.includes('  function orderEnchantRecommendationDisplay(recommendations) {'));
  assert.ok(moduleSource.includes("  function freezeRecommendationOrderWhileEditing(sourceType = '') {"));
  assert.ok(moduleSource.includes('  function releaseRecommendationOrderAfterEditing() {'));
  assert.equal((moduleSource.match(/getDisplayOrderState\(\)/g) || []).length, 2);
  assert.equal((moduleSource.match(/recommendations\.sort\(compareBufferRecommendationOrder\)/g) || []).length, 1);
  assert.equal((moduleSource.match(/recommendations\.sort\(compareDealerRecommendationOrder\)/g) || []).length, 1);

  const moduleKeyBlock = extractFunction(
    moduleSource,
    '  function getRecommendationDisplayOrderKey(row = {}) {',
  )
    .replaceAll('tuneSourceTypes', 'TUNE_SOURCE_TYPES')
    .replaceAll('oathDecisionVariantSourceTypes', 'OATH_DECISION_VARIANT_SOURCE_TYPES');
  assert.equal(moduleKeyBlock, LEGACY_KEY_BLOCK, 'private key helper is mechanically moved');

  const moduleOrderFunction = extractFunction(
    moduleSource,
    '  function orderEnchantRecommendationDisplay(recommendations) {',
  );
  const moduleOrderCoreStart = moduleOrderFunction.indexOf('    let displayRecommendations = isBuffer');
  const moduleOrderCoreEnd = moduleOrderFunction.indexOf('    return displayRecommendations;');
  const normalizedOrderCore = moduleOrderFunction
    .slice(moduleOrderCoreStart, moduleOrderCoreEnd)
    .trimEnd()
    .replace('    let displayRecommendations = isBuffer', '    let displayRecommendations = state.currentBufferBaseline?.isBuffer')
    .replaceAll('recommendations.sort(', 'decoratedRecommendations.sort(')
    .replaceAll('equipmentTunePopoverOpen', 'state.equipmentTunePopoverOpen')
    .replaceAll('frozenRecommendationDisplayKey', 'state.frozenRecommendationDisplayKey')
    .replaceAll('frozenRecommendationDisplayIndex', 'state.frozenRecommendationDisplayIndex')
    .replace(
      '    setLastRecommendationDisplayOrder(displayRecommendations.map(\n      getRecommendationDisplayOrderKey,\n    ));',
      '    state.lastRecommendationDisplayOrder = displayRecommendations.map(\n      getRecommendationDisplayOrderKey,\n    );',
    );
  assert.equal(normalizedOrderCore, LEGACY_RENDERER_BLOCK, 'renderer order block is mechanically moved');

  const moduleFreezeFunction = extractFunction(
    moduleSource,
    "  function freezeRecommendationOrderWhileEditing(sourceType = '') {",
  );
  const normalizedFreeze = moduleFreezeFunction
    .replace(
      '    const {\n      lastRecommendationDisplayOrder,\n      frozenRecommendationDisplayKey,\n    } = getDisplayOrderState();\n',
      '',
    )
    .replaceAll('frozenRecommendationDisplayKey', 'state.frozenRecommendationDisplayKey')
    .replaceAll('lastRecommendationDisplayOrder', 'state.lastRecommendationDisplayOrder')
    .replace(
      '    setFrozenRecommendationDisplayKey(key);',
      '    state.frozenRecommendationDisplayKey = key;',
    )
    .replace(
      '    setFrozenRecommendationDisplayIndex(displayOrder.indexOf(key));',
      '    state.frozenRecommendationDisplayIndex = displayOrder.indexOf(key);',
    );
  assert.equal(normalizedFreeze, LEGACY_FREEZE_BLOCK, 'freeze helper is mechanically moved');

  const moduleReleaseFunction = extractFunction(
    moduleSource,
    '  function releaseRecommendationOrderAfterEditing() {',
  );
  const normalizedRelease = moduleReleaseFunction
    .replace(
      "    setFrozenRecommendationDisplayKey('');",
      "    state.frozenRecommendationDisplayKey = '';",
    )
    .replace(
      '    setFrozenRecommendationDisplayIndex(-1);',
      '    state.frozenRecommendationDisplayIndex = -1;',
    );
  assert.equal(normalizedRelease, LEGACY_RELEASE_BLOCK, 'release helper is mechanically moved');

  const returnBlock = `  return {
    orderEnchantRecommendationDisplay,
    freezeRecommendationOrderWhileEditing,
    releaseRecommendationOrderAfterEditing,
  };`;
  assert.equal(moduleSource.split(returnBlock).length - 1, 1, 'public key order is exact');

  const viewBytes = readFileSync(viewPath);
  const viewSource = viewBytes.toString('utf8');
  const applicationImport = "import { createEnchantRecommendationApplicationState } from './enchantRecommendationApplicationState.js';\r\n";
  const displayImport = "import { createEnchantRecommendationDisplayOrder } from './enchantRecommendationDisplayOrder.js';\r\n";
  assert.equal(viewSource.split(displayImport).length - 1, 1);
  assert.ok(viewSource.includes(applicationImport + displayImport), 'display import follows application-state import');

  const applicationInstall = [
    '  const { decorateEnchantRecommendationApplicationState } =',
    '    createEnchantRecommendationApplicationState({',
    '      getSimulatorExclusiveGroupKey,',
    '      getSimulatorCandidateSignature,',
    '      getOathAcquisitionSelectionDescriptors,',
    '      getActiveOathAcquisitionMethodCounts,',
    '      getEquipmentProgressionType,',
    '      isAppliedOathAcquisitionRecommendation,',
    '    });',
  ].join('\r\n');
  const displayInstall = [
    '  const {',
    '    orderEnchantRecommendationDisplay,',
    '    freezeRecommendationOrderWhileEditing,',
    '    releaseRecommendationOrderAfterEditing,',
    '  } = createEnchantRecommendationDisplayOrder({',
    '    tuneSourceTypes: TUNE_SOURCE_TYPES,',
    '    oathDecisionVariantSourceTypes: OATH_DECISION_VARIANT_SOURCE_TYPES,',
    '    getDealerSimulatorRecommendationId,',
    '    compareBufferRecommendationOrder,',
    '    compareDealerRecommendationOrder,',
    '    getDisplayOrderState: () => ({',
    '      isBuffer: state.currentBufferBaseline?.isBuffer,',
    '      equipmentTunePopoverOpen: state.equipmentTunePopoverOpen,',
    '      lastRecommendationDisplayOrder: state.lastRecommendationDisplayOrder,',
    '      frozenRecommendationDisplayKey: state.frozenRecommendationDisplayKey,',
    '      frozenRecommendationDisplayIndex: state.frozenRecommendationDisplayIndex,',
    '    }),',
    '    setLastRecommendationDisplayOrder: (value) => {',
    '      state.lastRecommendationDisplayOrder = value;',
    '    },',
    '    setFrozenRecommendationDisplayKey: (value) => {',
    '      state.frozenRecommendationDisplayKey = value;',
    '    },',
    '    setFrozenRecommendationDisplayIndex: (value) => {',
    '      state.frozenRecommendationDisplayIndex = value;',
    '    },',
    '  });',
  ].join('\r\n');
  assert.ok(
    viewSource.includes(`${applicationInstall}\r\n\r\n${displayInstall}\r\n\r\n  function renderEnchantRecommendations`),
    'display-order factory is installed immediately after application-state factory at helper location',
  );
  assert.ok(!viewSource.includes('  function getRecommendationDisplayOrderKey(row = {}) {'));
  assert.ok(!viewSource.includes("  function freezeRecommendationOrderWhileEditing(sourceType = '') {"));
  assert.ok(!viewSource.includes('  function releaseRecommendationOrderAfterEditing() {'));

  const orderCall = '    let displayRecommendations = orderEnchantRecommendationDisplay(decoratedRecommendations);\r\n';
  assert.equal(viewSource.split(orderCall).length - 1, 1);
  assert.ok(!viewSource.includes('    let displayRecommendations = state.currentBufferBaseline?.isBuffer'));

  const callOrderAnchors = [
    '    const decoratedRecommendations = decorateEnchantRecommendationApplicationState(recommendations, simulator);',
    '    let displayRecommendations = orderEnchantRecommendationDisplay(decoratedRecommendations);',
    '    state.dealerSimulatorRecommendations = new Map();',
    '    state.renderedOathAcquisitionCombinedRows = new Map();',
    '    renderEfficiencyLegend(recommendations);',
    '    if (!displayRecommendations.length) {',
    '    els.enchantRecommendList.innerHTML = displayRecommendations.map((row, index) => {',
    '    scheduleFitEnchantRecommendTitles();',
  ];
  let previousIndex = -1;
  for (const anchor of callOrderAnchors) {
    const index = viewSource.indexOf(anchor, previousIndex + 1);
    assert.ok(index > previousIndex, `renderer call order keeps ${anchor}`);
    previousIndex = index;
  }

  const lfView = normalizeLf(viewSource);
  const htmlStart = lfView.indexOf('    els.enchantRecommendList.innerHTML = displayRecommendations.map((row, index) => {');
  const htmlEndMarker = "    }).join('');";
  const htmlEnd = lfView.indexOf(htmlEndMarker, htmlStart) + htmlEndMarker.length;
  assert.ok(htmlStart >= 0 && htmlEnd > htmlStart);
  const htmlMapBlock = lfView.slice(htmlStart, htmlEnd);
  assert.equal(htmlMapBlock.split('\n').length, 325);
  assert.equal(sha256(htmlMapBlock), HTML_MAP_LF_BLOCK_SHA256);

  const oldHelpers = [LEGACY_KEY_BLOCK, '', LEGACY_FREEZE_BLOCK, '', LEGACY_RELEASE_BLOCK]
    .join('\n')
    .replaceAll('\n', '\r\n');
  const oldRenderer = LEGACY_RENDERER_BLOCK.replaceAll('\n', '\r\n');
  let reconstructed = viewSource;
  reconstructed = reconstructed.replace(displayImport, '');
  reconstructed = reconstructed.replace(displayInstall, oldHelpers);
  reconstructed = reconstructed.replace(orderCall.trimEnd(), oldRenderer);
  assert.equal(sha256(Buffer.from(reconstructed, 'utf8')), PRE_MOVE_ENCHANT_VIEW_SHA256);

  assert.equal(sha256(readFileSync(applicationStateModulePath)), PROTECTED_FILE_SHA256.applicationStateModule);
  assert.equal(sha256(readFileSync(layoutModulePath)), PROTECTED_FILE_SHA256.layoutModule);
  assert.equal(sha256(readFileSync(layoutTestPath)), PROTECTED_FILE_SHA256.layoutTest);
  assert.equal(sha256(readFileSync(eventBindingsPath)), PROTECTED_FILE_SHA256.eventBindings);
  assert.equal(sha256(readFileSync(initPath)), PROTECTED_FILE_SHA256.initDnfHellTool);
}

const fixtureHash = testBehaviorAndFixture();
testErrorsAndDefaultSignature();
testMechanicalSourceContract();

console.log(`enchant recommendation display order: ok (${fixtureHash})`);
