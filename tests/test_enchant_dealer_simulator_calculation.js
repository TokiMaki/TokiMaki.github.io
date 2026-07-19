import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as dealerSimulatorModule from '../src/dnfHellTool/enchantDealerSimulatorCalculation.js';

const { createEnchantDealerSimulatorCalculation } = dealerSimulatorModule;

const DEPENDENCY_NAMES = [
  'addEffects',
  'getFinalDamageReplacementMultiplier',
  'blackFangSimulatorSlots',
  'getAvatarEmblemMetricBaseline',
  'getDamageBaseline',
  'getCreatureArtifactEffectsTotal',
  'subtractEffects',
  'getAvatarRegularEmblemEffectsTotal',
  'getEquipmentProgressionEffectsTotal',
  'getOathCrystalEffectsTotal',
  'normalizeSimulatorDamageDelta',
  'getSelectedStatEffect',
  'elementDamagePerElement',
  'getAdjustedElementBaselineForRecommendation',
  'estimateDamageMultiplier',
  'getSkillDamageMultiplier',
  'getCreatureArtifactReplacementMultiplier',
  'getEquipmentProgressionFinalDamageChangeMultiplier',
  'getEquipmentTuneDamageMultiplier',
  'getOathCrystalFinalDamageChangeMultiplier',
  'getOathTuneDamageMultiplier',
  'getElementAdjustedReplacementIncrementalDamagePercent',
  'getReplacementIncrementalDamagePercent',
  'getDealerAvatarPlatinumEquipmentScoreMultiplier',
  'getAvatarPlatinumDamageMultiplier',
  'getBuffEnhancementMetricMultiplier',
];

const PUBLIC_FUNCTIONS = [
  'buildSimulatedDamageBaseline',
  'getSimulatorCumulativeDamageMultiplier',
];

const PRIVATE_FUNCTIONS = [
  'getEnchantEffectsTotal',
  'getEnchantFinalDamageChangeMultiplier',
  'getTitleEffectsWithoutEnchantElement',
  'getEquipmentBodyEffectsTotal',
  'getEquipmentBodyFinalDamageChangeMultiplier',
];

function addEffects(...effectRows) {
  const result = {};
  effectRows.forEach((effects) => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      result[key] = Number(result[key] || 0) + Number(value || 0);
    });
  });
  return result;
}

function subtractEffects(nextEffects = {}, currentEffects = {}) {
  const keys = new Set([...Object.keys(nextEffects), ...Object.keys(currentEffects)]);
  const result = {};
  keys.forEach((key) => {
    const value = Number(nextEffects[key] || 0) - Number(currentEffects[key] || 0);
    if (Number.isFinite(value) && Math.abs(value) > 0.000001) {
      result[key] = value;
    }
  });
  return result;
}

function getDamageBaseline(baseline = {}) {
  return {
    ...(baseline || {}),
    stat: Number(baseline?.stat || 0),
    statName: baseline?.statName === '지능' ? '지능' : '힘',
    baseStat: Number(baseline?.baseStat || 0),
    element: Number(baseline?.element || 0),
    elementDamage: Number(baseline?.elementDamage || 0),
    elementValues: { ...(baseline?.elementValues || {}) },
    attack: Number(baseline?.attack || 0),
    finalDamage: Number(baseline?.finalDamage || 0),
    attackIncrease: Number(baseline?.attackIncrease || 0),
    attackAmplification: Number(baseline?.attackAmplification || 0),
  };
}

function normalizeSimulatorDamageDelta(effects = {}, baseline = {}) {
  const normalized = { ...(effects || {}) };
  const primaryKey = baseline?.statName === '지능' ? 'int' : 'str';
  normalized[primaryKey] = Number(effects.allStat || 0) + Number(effects[primaryKey] || 0);
  delete normalized.allStat;
  delete normalized[primaryKey === 'str' ? 'int' : 'str'];
  return normalized;
}

function getSelectedStatEffect(effects = {}, baseline = {}) {
  if (Number.isFinite(effects.allStat)) return Number(effects.allStat || 0);
  return baseline?.statName === '지능'
    ? Number(effects.int || 0)
    : Number(effects.str || 0);
}

function sumRows(rows = [], key) {
  return (rows || []).reduce((total, row) => addEffects(total, row?.[key] || {}), {});
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function assertClose(actual, expected, tolerance = 1e-12) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance * scale,
    `expected ${actual} to be within ${tolerance * scale} of ${expected}`,
  );
}

function createDependencies(overrides = {}) {
  return {
    addEffects,
    getFinalDamageReplacementMultiplier: () => 1,
    blackFangSimulatorSlots: new Set(['목걸이', '팔찌', '반지']),
    getAvatarEmblemMetricBaseline: (baseline) => baseline,
    getDamageBaseline,
    getCreatureArtifactEffectsTotal: (artifacts) => sumRows(artifacts, 'effects'),
    subtractEffects,
    getAvatarRegularEmblemEffectsTotal: (avatar) => avatar?.regularEffects || {},
    getEquipmentProgressionEffectsTotal: (equipment) => sumRows(equipment, 'progressionEffects'),
    getOathCrystalEffectsTotal: (oath) => sumRows(oath?.crystals, 'effects'),
    normalizeSimulatorDamageDelta,
    getSelectedStatEffect,
    elementDamagePerElement: 0.5,
    getAdjustedElementBaselineForRecommendation: () => null,
    estimateDamageMultiplier: () => 1,
    getSkillDamageMultiplier: () => 1,
    getCreatureArtifactReplacementMultiplier: () => 1,
    getEquipmentProgressionFinalDamageChangeMultiplier: () => 1,
    getEquipmentTuneDamageMultiplier: () => 1,
    getOathCrystalFinalDamageChangeMultiplier: () => 1,
    getOathTuneDamageMultiplier: () => 1,
    getElementAdjustedReplacementIncrementalDamagePercent: () => 0,
    getReplacementIncrementalDamagePercent: () => 0,
    getDealerAvatarPlatinumEquipmentScoreMultiplier: () => 1,
    getAvatarPlatinumDamageMultiplier: () => 1,
    getBuffEnhancementMetricMultiplier: () => 1,
    ...overrides,
  };
}

function createCalculation(overrides = {}) {
  return createEnchantDealerSimulatorCalculation(createDependencies(overrides));
}

function testFactoryDependencyReadAndPublicPrivateContract() {
  assert.deepEqual(Object.keys(dealerSimulatorModule), ['createEnchantDealerSimulatorCalculation']);
  const reads = [];
  const dependencies = new Proxy(createDependencies(), {
    get(target, property, receiver) {
      reads.push(property);
      return Reflect.get(target, property, receiver);
    },
  });
  const calculation = createEnchantDealerSimulatorCalculation(dependencies);
  assert.deepEqual(reads, DEPENDENCY_NAMES);
  assert.deepEqual(Object.keys(calculation), PUBLIC_FUNCTIONS);
  Object.values(calculation).forEach((value) => assert.equal(typeof value, 'function'));
  for (const privateName of PRIVATE_FUNCTIONS) {
    assert.equal(privateName in calculation, false);
    assert.equal(privateName in dealerSimulatorModule, false);
  }
}

function testBuildSimulatedDamageBaselineAllSourcesAdjustedFallbackAndImmutability() {
  const calls = {
    metric: [],
    artifacts: [],
    avatar: [],
    progression: [],
    oath: [],
    normalize: [],
    adjusted: [],
  };
  let adjustedResult = null;
  const calculation = createCalculation({
    getAvatarEmblemMetricBaseline: (baseline, avatar, mode) => {
      calls.metric.push({ baseline, avatar, mode });
      return { ...baseline, metricMarker: mode };
    },
    getCreatureArtifactEffectsTotal: (artifacts, baseline, title) => {
      calls.artifacts.push({ artifacts, baseline, title });
      return sumRows(artifacts, 'effects');
    },
    getAvatarRegularEmblemEffectsTotal: (avatar, mode, baseline) => {
      calls.avatar.push({ avatar, mode, baseline });
      return avatar?.regularEffects || {};
    },
    getEquipmentProgressionEffectsTotal: (equipment, upgradeDb, baseline) => {
      calls.progression.push({ equipment, upgradeDb, baseline });
      return sumRows(equipment, 'progressionEffects');
    },
    getOathCrystalEffectsTotal: (oath) => {
      calls.oath.push(oath);
      return sumRows(oath?.crystals, 'effects');
    },
    normalizeSimulatorDamageDelta: (effects, baseline) => {
      calls.normalize.push({ effects: { ...effects }, baseline });
      return normalizeSimulatorDamageDelta(effects, baseline);
    },
    getAdjustedElementBaselineForRecommendation: (row, current, baseline) => {
      calls.adjusted.push({ row, current, baseline });
      return adjustedResult;
    },
  });

  const baseBaseline = deepFreeze({
    stat: 1000,
    statName: '지능',
    baseStat: 100,
    element: 300,
    elementDamage: 155,
    elementValues: { fire: 300, water: 290, light: 280, dark: 270 },
    attack: 4000,
    finalDamage: 12,
    attackIncrease: 20,
    attackAmplification: 5,
    marker: 'base',
  });
  const baseEnchants = deepFreeze([{ slot: '상의', effects: { allStat: 10, attack: 1, finalDamage: 2 } }]);
  const simulatedEnchants = deepFreeze([{ slot: '상의', effects: { allStat: 15, attack: 3, finalDamage: 99 } }]);
  const baseAura = deepFreeze({ effects: { int: 2, elementAll: 1, finalDamage: 3 } });
  const simulatedAura = deepFreeze({ effects: { int: 5, elementAll: 4, finalDamage: 100 } });
  const baseCreature = deepFreeze({ effects: { int: 1, attackIncrease: 2, finalDamage: 4 } });
  const simulatedCreature = deepFreeze({ effects: { int: 4, attackIncrease: 5, finalDamage: 101 } });
  const baseTitle = deepFreeze({
    itemId: 'base-title',
    effects: { int: 5, elementAll: 8, finalDamage: 7 },
    enchantEffects: { elementAll: 3 },
  });
  const simulatedTitle = deepFreeze({
    itemId: 'simulated-title',
    effects: { int: 11, elementAll: 15, finalDamage: 104 },
    enchantEffects: { elementAll: 5 },
  });
  const baseEquipment = deepFreeze([{
    slot: '목걸이',
    bodyEffects: { int: 6, attack: 4, finalDamage: 8 },
    progressionEffects: { int: 7, attackIncrease: 3, finalDamage: 9 },
  }]);
  const simulatedEquipment = deepFreeze([{
    slot: '목걸이',
    bodyEffects: { int: 14, attack: 10, finalDamage: 105 },
    progressionEffects: { int: 16, attackIncrease: 9, finalDamage: 106 },
  }]);
  const baseOath = deepFreeze({ crystals: [{ effects: { int: 8, attackAmplification: 2, finalDamage: 10 } }] });
  const simulatedOath = deepFreeze({ crystals: [{ effects: { int: 18, attackAmplification: 7, finalDamage: 107 } }] });
  const baseAvatar = deepFreeze({ regularEffects: { int: 4, attack: 2, finalDamage: 6 } });
  const simulatedAvatar = deepFreeze({ regularEffects: { int: 9, attack: 8, finalDamage: 103 } });
  const baseArtifacts = deepFreeze([{ effects: { int: 3, attackAmplification: 1, finalDamage: 5 } }]);
  const simulatedArtifacts = deepFreeze([{ effects: { int: 7, attackAmplification: 4, finalDamage: 102 } }]);
  const upgradeDb = deepFreeze({ marker: 'upgrade-db' });

  const args = [
    baseBaseline,
    baseEnchants,
    simulatedEnchants,
    baseAura,
    simulatedAura,
    baseCreature,
    simulatedCreature,
    baseTitle,
    simulatedTitle,
    baseEquipment,
    simulatedEquipment,
    baseOath,
    simulatedOath,
    baseAvatar,
    simulatedAvatar,
    'equipmentScore',
    baseArtifacts,
    simulatedArtifacts,
    upgradeDb,
  ];

  const fallbackBaseline = calculation.buildSimulatedDamageBaseline(...args);
  assert.deepEqual(fallbackBaseline, {
    ...baseBaseline,
    metricMarker: 'equipmentScore',
    stat: 1053,
    element: 308,
    elementDamage: 159,
    elementValues: { fire: 308, water: 298, light: 288, dark: 278 },
    attack: 4014,
    finalDamage: 12,
    attackIncrease: 29,
    attackAmplification: 13,
  });
  assert.equal('finalDamage' in calls.normalize[0].effects, false, 'finalDamage is removed before normalization');
  assert.deepEqual(calls.normalize[0].effects, {
    allStat: 5,
    attack: 14,
    int: 48,
    elementAll: 8,
    attackIncrease: 9,
    attackAmplification: 8,
  });
  assert.deepEqual(calls.metric, [{ baseline: baseBaseline, avatar: baseAvatar, mode: 'equipmentScore' }]);
  assert.equal(calls.artifacts.length, 2);
  assert.strictEqual(calls.artifacts[0].baseline, calls.artifacts[1].baseline);
  assert.strictEqual(calls.artifacts[0].title, baseTitle);
  assert.strictEqual(calls.artifacts[1].title, simulatedTitle);
  assert.equal(calls.avatar.length, 2);
  assert.equal(calls.progression.length, 2);
  assert.equal(calls.oath.length, 2);
  assert.deepEqual(calls.adjusted[0].row, { sourceType: 'title', ...simulatedTitle });
  assert.strictEqual(calls.adjusted[0].current, baseTitle);
  assert.strictEqual(calls.adjusted[0].baseline, fallbackBaseline);

  const adjustedSentinel = deepFreeze({ adjusted: true, marker: 'adjusted-result' });
  adjustedResult = adjustedSentinel;
  const adjustedBaseline = calculation.buildSimulatedDamageBaseline(...args);
  assert.strictEqual(adjustedBaseline, adjustedSentinel, 'truthy adjusted baseline is returned by identity');

  assert.equal(baseBaseline.stat, 1000);
  assert.equal(baseTitle.effects.elementAll, 8);
  assert.equal(simulatedTitle.effects.elementAll, 15);
  assert.equal(baseEquipment[0].bodyEffects.int, 6);
  assert.equal(simulatedEquipment[0].progressionEffects.int, 16);
}

function createCumulativeHarness({ adjusted = true } = {}) {
  const calls = [];
  const record = (name, value) => (...args) => {
    calls.push({ name, args });
    return typeof value === 'function' ? value(...args) : value;
  };
  const replacementMultipliers = new Map([
    ['enchant-base>enchant-sim', 1.02],
    ['aura-base>aura-sim', 1.03],
    ['creature-base>creature-sim', 1.05],
    ['body-base>body-sim', 1.08],
  ]);
  const dependencies = createDependencies({
    addEffects: record('addEffects', addEffects),
    getFinalDamageReplacementMultiplier: record(
      'getFinalDamageReplacementMultiplier',
      (current, target) => replacementMultipliers.get(`${current?.marker || ''}>${target?.marker || ''}`) || 1,
    ),
    blackFangSimulatorSlots: new Set(['목걸이']),
    getAvatarEmblemMetricBaseline: record('getAvatarEmblemMetricBaseline', (baseline) => baseline),
    getDamageBaseline: record('getDamageBaseline', getDamageBaseline),
    getCreatureArtifactEffectsTotal: record('getCreatureArtifactEffectsTotal', () => ({})),
    subtractEffects: record('subtractEffects', subtractEffects),
    getAvatarRegularEmblemEffectsTotal: record('getAvatarRegularEmblemEffectsTotal', () => ({})),
    getEquipmentProgressionEffectsTotal: record('getEquipmentProgressionEffectsTotal', () => ({})),
    getOathCrystalEffectsTotal: record('getOathCrystalEffectsTotal', () => ({})),
    normalizeSimulatorDamageDelta: record('normalizeSimulatorDamageDelta', normalizeSimulatorDamageDelta),
    getSelectedStatEffect: record('getSelectedStatEffect', getSelectedStatEffect),
    elementDamagePerElement: 0.5,
    getAdjustedElementBaselineForRecommendation: record(
      'getAdjustedElementBaselineForRecommendation',
      (row) => adjusted && row?.itemId === 'sim-title' ? { adjusted: true } : null,
    ),
    estimateDamageMultiplier: record('estimateDamageMultiplier', 1.01),
    getSkillDamageMultiplier: record('getSkillDamageMultiplier', (row) => ({
      'aura-base': 1,
      'aura-sim': 1.04,
      'creature-base': 1,
      'creature-sim': 1.06,
    }[row?.marker] || 1)),
    getCreatureArtifactReplacementMultiplier: record('getCreatureArtifactReplacementMultiplier', 1.07),
    getEquipmentProgressionFinalDamageChangeMultiplier: record('getEquipmentProgressionFinalDamageChangeMultiplier', 1.09),
    getEquipmentTuneDamageMultiplier: record('getEquipmentTuneDamageMultiplier', 1.10),
    getOathCrystalFinalDamageChangeMultiplier: record('getOathCrystalFinalDamageChangeMultiplier', 1.11),
    getOathTuneDamageMultiplier: record('getOathTuneDamageMultiplier', 1.12),
    getElementAdjustedReplacementIncrementalDamagePercent: record('getElementAdjustedReplacementIncrementalDamagePercent', 13),
    getReplacementIncrementalDamagePercent: record('getReplacementIncrementalDamagePercent', 17),
    getDealerAvatarPlatinumEquipmentScoreMultiplier: record('getDealerAvatarPlatinumEquipmentScoreMultiplier', 1.15),
    getAvatarPlatinumDamageMultiplier: record('getAvatarPlatinumDamageMultiplier', 1.14),
    getBuffEnhancementMetricMultiplier: record('getBuffEnhancementMetricMultiplier', 1.16),
  });
  const simulator = deepFreeze({
    baseDamageBaseline: {
      stat: 1000,
      statName: '힘',
      baseStat: 100,
      element: 300,
      elementDamage: 140,
      elementValues: { fire: 300, water: 290, light: 280, dark: 270 },
      attack: 4000,
      finalDamage: 0,
      attackIncrease: 0,
      attackAmplification: 0,
    },
    baseEnchants: [{ slot: '상의', effects: { marker: 'enchant-base' } }],
    simulatedEnchants: [{ slot: '상의', effects: { marker: 'enchant-sim' } }],
    baseAura: { marker: 'aura-base', effects: { marker: 'aura-base' } },
    simulatedAura: { marker: 'aura-sim', effects: { marker: 'aura-sim' } },
    baseCreature: { marker: 'creature-base', effects: { marker: 'creature-base' } },
    simulatedCreature: { marker: 'creature-sim', effects: { marker: 'creature-sim' } },
    baseCreatureArtifacts: [{ marker: 'artifact-base' }],
    simulatedCreatureArtifacts: [{ marker: 'artifact-sim' }],
    baseTitle: { itemId: 'base-title', effects: {} },
    simulatedTitle: { itemId: 'sim-title', effects: {} },
    baseEquipmentUpgrades: [{ slot: '목걸이', bodyEffects: { marker: 'body-base' } }],
    simulatedEquipmentUpgrades: [{ slot: '목걸이', bodyEffects: { marker: 'body-sim' } }],
    baseOathUpgrades: { crystals: [] },
    simulatedOathUpgrades: { crystals: [] },
    baseAvatar: { slots: [] },
    simulatedAvatar: { slots: [] },
    avatarPlatinumChangesBySlot: { top: { skillDamageMultiplier: 1.2 } },
    baseBuffLoadout: { skillInfo: {} },
    simulatedBuffLoadout: { skillInfo: {} },
    upgradeDb: { marker: 'upgrade-db' },
    oathTuneDb: { marker: 'oath-db' },
  });
  return {
    calculation: createEnchantDealerSimulatorCalculation(dependencies),
    calls,
    simulator,
  };
}

function testCumulativeMultiplierAllSentinelsTitleAdjustedAndMetricBranches() {
  const actualHarness = createCumulativeHarness({ adjusted: true });
  const actual = actualHarness.calculation.getSimulatorCumulativeDamageMultiplier(
    actualHarness.simulator,
    'actual',
  );
  const common = 1.01 * 1.02 * 1.03 * 1.04 * 1.05 * 1.06 * 1.07
    * 1.08 * 1.09 * 1.10 * 1.11 * 1.12 * 1.13;
  assertClose(actual, common * 1.14 * 1.16);
  const actualNames = actualHarness.calls.map(({ name }) => name);
  for (const name of [
    'addEffects',
    'getFinalDamageReplacementMultiplier',
    'getAvatarEmblemMetricBaseline',
    'getDamageBaseline',
    'getCreatureArtifactEffectsTotal',
    'subtractEffects',
    'getAvatarRegularEmblemEffectsTotal',
    'getEquipmentProgressionEffectsTotal',
    'getOathCrystalEffectsTotal',
    'normalizeSimulatorDamageDelta',
    'getSelectedStatEffect',
    'getAdjustedElementBaselineForRecommendation',
    'estimateDamageMultiplier',
    'getSkillDamageMultiplier',
    'getCreatureArtifactReplacementMultiplier',
    'getEquipmentProgressionFinalDamageChangeMultiplier',
    'getEquipmentTuneDamageMultiplier',
    'getOathCrystalFinalDamageChangeMultiplier',
    'getOathTuneDamageMultiplier',
    'getElementAdjustedReplacementIncrementalDamagePercent',
    'getAvatarPlatinumDamageMultiplier',
    'getBuffEnhancementMetricMultiplier',
  ]) {
    assert.ok(actualNames.includes(name), `${name} participates in the adjusted actual branch`);
  }
  assert.equal(actualNames.includes('getReplacementIncrementalDamagePercent'), false);
  assert.equal(actualNames.includes('getDealerAvatarPlatinumEquipmentScoreMultiplier'), false);
  const actualBuffCall = actualHarness.calls.find(({ name }) => name === 'getBuffEnhancementMetricMultiplier');
  assert.strictEqual(actualBuffCall.args[0], actualHarness.simulator);
  assert.equal(actualBuffCall.args[1], 'actual');

  const scoreHarness = createCumulativeHarness({ adjusted: true });
  const equipmentScore = scoreHarness.calculation.getSimulatorCumulativeDamageMultiplier(
    scoreHarness.simulator,
    'equipmentScore',
  );
  assertClose(equipmentScore, common * 1.15 * 1.16);
  const scoreNames = scoreHarness.calls.map(({ name }) => name);
  assert.ok(scoreNames.includes('getDealerAvatarPlatinumEquipmentScoreMultiplier'));
  assert.equal(scoreNames.includes('getAvatarPlatinumDamageMultiplier'), false);
  const metricCall = scoreHarness.calls.find(({ name }) => name === 'getAvatarEmblemMetricBaseline');
  assert.equal(metricCall.args[2], 'equipmentScore');
  const scoreBuffCall = scoreHarness.calls.find(({ name }) => name === 'getBuffEnhancementMetricMultiplier');
  assert.equal(scoreBuffCall.args[1], 'equipmentScore');
}

function testCumulativeTitleFallbackAndMissingBaseShortCircuit() {
  const fallbackHarness = createCumulativeHarness({ adjusted: false });
  const fallback = fallbackHarness.calculation.getSimulatorCumulativeDamageMultiplier(
    fallbackHarness.simulator,
    'actual',
  );
  const commonWithoutTitle = 1.01 * 1.02 * 1.03 * 1.04 * 1.05 * 1.06 * 1.07
    * 1.08 * 1.09 * 1.10 * 1.11 * 1.12;
  assertClose(fallback, commonWithoutTitle * 1.17 * 1.14 * 1.16);
  const names = fallbackHarness.calls.map(({ name }) => name);
  assert.ok(names.includes('getReplacementIncrementalDamagePercent'));
  assert.equal(names.includes('getElementAdjustedReplacementIncrementalDamagePercent'), false);

  let invoked = false;
  const throwingDependencies = Object.fromEntries(DEPENDENCY_NAMES.map((name) => [
    name,
    name === 'blackFangSimulatorSlots'
      ? new Set()
      : name === 'elementDamagePerElement'
        ? 0.5
        : () => {
          invoked = true;
          throw new Error(`unexpected dependency call: ${name}`);
        },
  ]));
  const shortCircuit = createEnchantDealerSimulatorCalculation(throwingDependencies);
  assert.equal(shortCircuit.getSimulatorCumulativeDamageMultiplier({}), 1);
  assert.equal(invoked, false, 'missing baseDamageBaseline returns before dependency calls');
}

function testEnchantViewImportAndAssemblyContract() {
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const source = readFileSync(viewPath, 'utf8');
  assert.match(
    source,
    /import \{ createEnchantDealerSimulatorCalculation \} from '\.\/enchantDealerSimulatorCalculation\.js';/,
  );

  const factoryIndex = source.indexOf('} = createEnchantDealerSimulatorCalculation({');
  assert.ok(factoryIndex >= 0, 'dealer simulator calculation factory is assembled');
  const factoryBlock = source.slice(
    source.lastIndexOf('const {', factoryIndex),
    source.indexOf('});', factoryIndex) + 3,
  );
  PUBLIC_FUNCTIONS.forEach((name) => {
    assert.match(factoryBlock, new RegExp(`\\b${name}\\b`));
  });
  assert.match(factoryBlock, /blackFangSimulatorSlots:\s*BLACK_FANG_SIMULATOR_SLOTS/);
  assert.match(factoryBlock, /elementDamagePerElement:\s*ELEMENT_DAMAGE_PER_ELEMENT/);
  assert.match(factoryBlock, /\bnormalizeSimulatorDamageDelta\b/);
  assert.match(factoryBlock, /\bgetFinalDamageReplacementMultiplier\b/);
}

const tests = [
  testFactoryDependencyReadAndPublicPrivateContract,
  testBuildSimulatedDamageBaselineAllSourcesAdjustedFallbackAndImmutability,
  testCumulativeMultiplierAllSentinelsTitleAdjustedAndMetricBranches,
  testCumulativeTitleFallbackAndMissingBaseShortCircuit,
  testEnchantViewImportAndAssemblyContract,
];

let failures = 0;
for (const test of tests) {
  try {
    test();
    console.log(`ok - ${test.name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${test.name}`);
    console.error(error?.stack || error);
  }
}

if (failures) process.exitCode = 1;
