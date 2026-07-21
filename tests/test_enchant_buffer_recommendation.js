import assert from 'node:assert/strict';
import * as recommendationModule from '../src/dnfHellTool/enchantBufferRecommendation.js';

const { createEnchantBufferRecommendation } = recommendationModule;

const DEPENDENCY_NAMES = [
  'OATH_DECISION_VARIANT_SOURCE_TYPES',
  'getReinforceSkillLevel',
  'getItemSkillLevelBonus',
  'isMaterialAcquisition',
  'compareMaterialEnchantOrder',
  'getCurrentCreatureArtifactBySlot',
  'adaptOathAcquisitionRecommendation',
  'getTitleBeadOnlyRow',
  'isFreeActionRecommendation',
  'getEffectSignature',
  'addEffects',
  'getRoleRelevantEffects',
  'getBufferSelectedStatEffect',
  'getBufferOathAcquisitionEvaluation',
  'getBufferAvatarEmblemChangesBySocket',
  'getBufferSwitchingAvatarEmblemOverlays',
  'resolveBufferSwitchingAvatarEmblemChanges',
  'getBufferCreatureArtifactBaseRelativeChanges',
  'getBufferCreatureBaseRelativeChanges',
  'getBufferAuraBaseRelativeChanges',
  'getBufferTitleBaseRelativeChanges',
  'getBufferSwitchingCreatureBaseRelativeChanges',
  'getBufferSwitchingTitleBaseRelativeChanges',
  'getBufferSwitchingPlatinumBaseRelativeChanges',
  'getBufferSwitchingAvatarBaseRelativeChanges',
  'getBufferAvatarPlatinumBaseRelativeChanges',
  'mergeBufferChangeMap',
  'getBufferEquipmentBodyBaseRelativeChanges',
  'getBufferUpgradeBaseRelativeChanges',
  'getBufferEquipmentTuneBaseRelativeChanges',
  'getBufferOathTuneBaseRelativeChanges',
  'getBufferEnchantBaseRelativeChanges',
  'resolveBufferNetChanges',
  'getCreatureArtifactType',
  'getBuffSimulatorTargetSlotId',
  'cloneSimulatorValue',
  'getBufferRecommendationScopeSimulator',
  'getBufferAvatarEmblemNetChanges',
  'getRecommendationGold',
  'getRoundedMetricKey',
  'getStableObjectSignature',
  'isPreferredDuplicateRecommendation',
  'removeInefficientLowerTierEnchants',
];

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function getReinforceSkillLevel(reinforceSkill = [], jobName = '', skillNames = null) {
  return (reinforceSkill || []).reduce((total, job) => {
    if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return total;
    return total + (job?.skills || []).reduce((sum, skill) => {
      if (skillNames && !skillNames.includes(skill?.name)) return sum;
      return sum + Number(skill?.value || 0);
    }, 0);
  }, 0);
}

function getItemSkillLevelBonus(item = {}, baseline = {}, skillName = '') {
  return Number(item?.skillLevels?.[skillName] || 0);
}

function isMaterialAcquisition(row = {}) {
  return Boolean(row?.acquisition?.label);
}

function compareMaterialEnchantOrder(a = {}, b = {}) {
  return Number(a.materialRank || 0) - Number(b.materialRank || 0);
}

function getEffectSignature(effects = {}) {
  return Object.keys(effects || {})
    .sort()
    .map((key) => `${key}:${Number(effects[key] || 0)}`)
    .join('|');
}

function addEffects(...effectRows) {
  const result = {};
  effectRows.forEach((effects) => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      result[key] = Number(result[key] || 0) + Number(value || 0);
    });
  });
  return result;
}

function getBufferSelectedStatEffect(effects = {}, baseline = {}) {
  if (Number.isFinite(effects?.allStat)) return Number(effects.allStat || 0);
  const key = baseline.statName === '힘'
    ? 'str'
    : baseline.statName === '체력'
      ? 'vit'
      : baseline.statName === '정신력'
        ? 'spr'
        : 'int';
  return Number(effects?.[key] || 0);
}

function getRecommendationGold(row = {}) {
  if (Number.isFinite(row.expectedGold)) return Number(row.expectedGold);
  return Number(row?.auction?.minUnitPrice || 0);
}

function getStableObjectSignature(value = {}) {
  if (!value || typeof value !== 'object') return String(value ?? '');
  return Object.keys(value)
    .sort()
    .map((key) => `${key}:${typeof value[key] === 'object' ? getStableObjectSignature(value[key]) : String(value[key] ?? '')}`)
    .join('|');
}

function isPreferredDuplicateRecommendation(row, previous) {
  if (!previous) return true;
  const isMaterial = isMaterialAcquisition(row);
  const previousIsMaterial = isMaterialAcquisition(previous);
  if (isMaterial !== previousIsMaterial) return isMaterial;
  if (isMaterial && previousIsMaterial) return false;
  return getRecommendationGold(row) + 1 < getRecommendationGold(previous);
}

function createDependencies(overrides = {}) {
  const nullChange = () => null;
  return {
    OATH_DECISION_VARIANT_SOURCE_TYPES: new Set(['oathTranscend', 'oathCraft']),
    getReinforceSkillLevel,
    getItemSkillLevelBonus,
    isMaterialAcquisition,
    compareMaterialEnchantOrder,
    getCurrentCreatureArtifactBySlot: (creature = {}) => new Map(
      (creature?.artifacts || []).map((artifact) => [artifact.slotColor, artifact]),
    ),
    adaptOathAcquisitionRecommendation: (row) => row,
    getTitleBeadOnlyRow: (row) => row,
    isFreeActionRecommendation: (row) => Boolean(row?.freeAction),
    getEffectSignature,
    addEffects,
    getRoleRelevantEffects: (effects) => effects || {},
    getBufferSelectedStatEffect,
    getBufferOathAcquisitionEvaluation: () => null,
    getBufferAvatarEmblemChangesBySocket: nullChange,
    getBufferSwitchingAvatarEmblemOverlays: nullChange,
    resolveBufferSwitchingAvatarEmblemChanges: nullChange,
    getBufferCreatureArtifactBaseRelativeChanges: nullChange,
    getBufferCreatureBaseRelativeChanges: nullChange,
    getBufferAuraBaseRelativeChanges: nullChange,
    getBufferTitleBaseRelativeChanges: nullChange,
    getBufferSwitchingCreatureBaseRelativeChanges: nullChange,
    getBufferSwitchingTitleBaseRelativeChanges: nullChange,
    getBufferSwitchingPlatinumBaseRelativeChanges: nullChange,
    getBufferSwitchingAvatarBaseRelativeChanges: nullChange,
    getBufferAvatarPlatinumBaseRelativeChanges: nullChange,
    mergeBufferChangeMap: () => null,
    getBufferEquipmentBodyBaseRelativeChanges: nullChange,
    getBufferUpgradeBaseRelativeChanges: nullChange,
    getBufferEquipmentTuneBaseRelativeChanges: nullChange,
    getBufferOathTuneBaseRelativeChanges: nullChange,
    getBufferEnchantBaseRelativeChanges: nullChange,
    resolveBufferNetChanges: () => ({}),
    getCreatureArtifactType: (row = {}) => String(row.slotColor || row.artifactType || '').trim(),
    getBuffSimulatorTargetSlotId: (row = {}) => String(row.targetSlotId || '').trim(),
    cloneSimulatorValue: clone,
    getBufferRecommendationScopeSimulator: (simulator) => simulator,
    getBufferAvatarEmblemNetChanges: () => ({}),
    getRecommendationGold,
    getRoundedMetricKey: (value) => Number(value || 0).toFixed(6),
    getStableObjectSignature,
    isPreferredDuplicateRecommendation,
    removeInefficientLowerTierEnchants: (rows) => rows,
    ...overrides,
  };
}

function createRecommendation(overrides = {}) {
  return createEnchantBufferRecommendation(createDependencies(overrides));
}

function assertClose(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function testFactoryContract() {
  assert.deepEqual(Object.keys(recommendationModule), ['createEnchantBufferRecommendation']);
  const dependencyReads = [];
  const dependencies = new Proxy(createDependencies(), {
    get(target, property, receiver) {
      dependencyReads.push(property);
      return Reflect.get(target, property, receiver);
    },
  });
  const recommendation = createEnchantBufferRecommendation(dependencies);
  assert.deepEqual(dependencyReads, DEPENDENCY_NAMES);
  assert.deepEqual(Object.keys(recommendation), [
    'calculateBufferScore',
    'compareBufferRecommendationOrder',
    'getBufferRecommendationRows',
  ]);
  Object.values(recommendation).forEach((value) => assert.equal(typeof value, 'function'));
}

function testCalculateBufferScoreFixturesAndEdges() {
  const { calculateBufferScore } = createRecommendation();
  const simpleBaseline = deepFreeze({
    bufferKey: 'maleCrusader',
    stat: 0,
    activeSelfStat: 0,
    switchingStatDelta: 0,
    buffPower: 0,
    buffAmplification: 0,
    switchingBuffAmplificationDelta: 0,
    buffSkillLevel: 1,
    awakeningSkillLevel: 30,
    auraStat: 0,
    auraAttack: 0,
  });
  assertClose(calculateBufferScore(simpleBaseline), 746.9929581619533);

  const representativeBaseline = deepFreeze({
    bufferKey: 'enchantress',
    stat: 12000,
    activeSelfStat: 400,
    switchingStatDelta: 300,
    buffPower: 22000,
    buffAmplification: 25,
    switchingBuffAmplificationDelta: 5,
    buffSkillLevel: 40,
    awakeningSkillLevel: 42,
    auraStat: 800,
    auraAttack: 120,
  });
  const representativeChanges = deepFreeze({
    statDelta: 150,
    currentStatDelta: 25,
    switchingStatDelta: 75,
    selfStatSkillDelta: 30,
    buffPowerDelta: 500,
    currentBuffAmplificationDelta: 2,
    switchingBuffAmplificationDelta: 3,
    buffSkillLevelDelta: 1,
    awakeningSkillLevelDelta: 1,
    auraStatDelta: 20,
    auraAttackDelta: 5,
  });
  assertClose(
    calculateBufferScore(representativeBaseline, representativeChanges),
    7350.66317181215,
  );
  assert.equal(calculateBufferScore({ ...simpleBaseline, bufferKey: 'unknown' }), 0);
  assert.equal(calculateBufferScore({ ...simpleBaseline, buffSkillLevel: 0 }), 0);
  assert.equal(calculateBufferScore({ ...simpleBaseline, awakeningSkillLevel: 0 }), 0);

  const clampedBaseline = {
    ...representativeBaseline,
    buffAmplification: 10,
    switchingBuffAmplificationDelta: -100,
  };
  assertClose(
    calculateBufferScore(clampedBaseline),
    calculateBufferScore({ ...clampedBaseline, switchingBuffAmplificationDelta: -1000 }),
  );
}

function testComparatorPolicy() {
  const { compareBufferRecommendationOrder } = createRecommendation();
  const efficient = { buffCostPerHundredPoints: 100 };
  const inefficient = { buffCostPerHundredPoints: 200 };
  const materialA = { acquisition: { label: '재료' }, materialRank: 1, buffCostPerHundredPoints: 9999 };
  const materialB = { acquisition: { label: '재료' }, materialRank: 2, buffCostPerHundredPoints: 1 };

  assert.ok(compareBufferRecommendationOrder(
    { ...inefficient, recommendationPriority: -1 },
    { ...materialA, recommendationPriority: 0 },
  ) < 0, 'recommendationPriority is the first key');
  assert.ok(compareBufferRecommendationOrder(materialA, efficient) < 0, 'material acquisition precedes priced rows');
  assert.ok(compareBufferRecommendationOrder(materialA, materialB) < 0, 'material rows delegate to material ordering');
  assert.ok(compareBufferRecommendationOrder(efficient, inefficient) < 0, 'positive efficiency sorts ascending');
  assert.ok(compareBufferRecommendationOrder({ buffCostPerHundredPoints: 0 }, efficient) > 0, 'non-positive efficiency sorts last');
  assert.ok(Number.isNaN(compareBufferRecommendationOrder({}, {})), 'two invalid efficiencies remain comparator-equal through NaN');
}

function testRecommendationRowBoundaries() {
  const { getBufferRecommendationRows } = createRecommendation();
  const baseline = {
    isBuffer: true,
    bufferKey: 'femaleCrusader',
    jobName: '프리스트(여)',
    statName: '지능',
    stat: 12000,
    activeSelfStat: 500,
    switchingStatDelta: 200,
    buffPower: 18000,
    buffAmplification: 20,
    switchingBuffAmplificationDelta: 5,
    buffSkillLevel: 40,
    awakeningSkillLevel: 40,
    auraStat: 500,
    auraAttack: 100,
    currentSelfStatSkills: {
      보조스킬: {
        currentStat: 100,
        nextStat: 120,
        previousStat: 90,
        currentPartyStat: 0,
        nextPartyStat: 0,
        previousPartyStat: 0,
        currentPartyAttack: 0,
        nextPartyAttack: 0,
        previousPartyAttack: 0,
      },
    },
  };
  const currentEnchants = [
    { slot: '무기', itemId: 'current-weapon', effects: { allStat: 0 }, reinforceSkill: [] },
    { slot: '상의', itemId: 'current-top', effects: {}, reinforceSkill: [] },
    { slot: '하의', itemId: 'current-bottom', effects: {}, reinforceSkill: [] },
    { slot: '벨트', itemId: 'same-item', effects: { allStat: 10 }, reinforceSkill: [] },
  ];
  const rows = [
    {
      sourceType: 'enchant', role: 'dealer', slot: '무기', itemId: 'dealer-only',
      effects: { allStat: 999 }, auction: { minUnitPrice: 1 },
    },
    {
      sourceType: 'unsupported', role: 'buffer', slot: '무기', itemId: 'unsupported',
      effects: { allStat: 999 }, auction: { minUnitPrice: 1 },
    },
    {
      sourceType: 'enchant', role: 'buffer', slot: '무기', itemId: 'no-price',
      effects: { allStat: 999 }, auction: {},
    },
    {
      sourceType: 'enchant', role: 'buffer', slot: '벨트', itemId: 'same-item',
      effects: { allStat: 10 }, auction: { minUnitPrice: 1 },
    },
    {
      sourceType: 'enchant', role: 'buffer', slot: '무기', itemId: 'expensive-duplicate',
      itemName: '비싼 후보', tier: '종결', effects: { allStat: 100 },
      auction: { minUnitPrice: 2000000 }, reinforceSkill: [],
    },
    {
      sourceType: 'enchant', role: 'buffer', slot: '무기', itemId: 'cheap-duplicate',
      itemName: '저렴한 후보', tier: '종결', effects: { allStat: 100 },
      auction: { minUnitPrice: 1000000 }, reinforceSkill: [],
    },
    {
      sourceType: 'enchant', role: 'buffer', slot: '상의', itemId: 'skill-plus-one',
      itemName: '스킬 +1', tier: '준종결', effects: {}, auction: { minUnitPrice: 500000 },
      reinforceSkill: [{ jobName: '공통', skills: [{ name: '보조스킬', value: 1 }] }],
    },
    {
      sourceType: 'enchant', role: 'buffer', slot: '하의', itemId: 'skill-plus-two',
      itemName: '스킬 +2', tier: '준종결', effects: {}, auction: { minUnitPrice: 1 },
      reinforceSkill: [{ jobName: '공통', skills: [{ name: '보조스킬', value: 2 }] }],
    },
  ];
  const beforeRows = clone(rows);
  const beforeCurrent = clone(currentEnchants);
  const result = getBufferRecommendationRows(
    deepFreeze(rows),
    deepFreeze(currentEnchants),
    null,
    null,
    null,
    deepFreeze(baseline),
  );

  assert.deepEqual(rows, beforeRows);
  assert.deepEqual(currentEnchants, beforeCurrent);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((row) => row.itemId).sort(), ['cheap-duplicate', 'skill-plus-one']);
  assert.ok(!result.some((row) => row.itemId === 'skill-plus-two'), 'non-adjacent +2 has no inferred exact skill value');

  const cheap = result.find((row) => row.itemId === 'cheap-duplicate');
  assert.equal(cheap.metricType, 'buffer');
  assert.equal(cheap.currentEnchant.itemId, 'current-weapon');
  assert.equal(cheap.bufferStatDelta, 100);
  assert.equal(cheap.bufferSimulatorSupported, false);
  assert.equal(cheap.bufferBaseRelativeChanges, null);
  assert.ok(cheap.candidateBufferScore > cheap.currentBufferScore);
  assertClose(cheap.incrementalBuffScore, cheap.candidateBufferScore - cheap.currentBufferScore);
  assertClose(
    cheap.buffCostPerHundredPoints,
    cheap.auction.minUnitPrice * 100 / cheap.incrementalBuffScore,
    1e-6,
  );
  assertClose(cheap.incrementalDamagePercent, cheap.incrementalBuffPercent);

  const skill = result.find((row) => row.itemId === 'skill-plus-one');
  assert.deepEqual(skill.bufferSkillDelta, {
    selfStatSkillDelta: 20,
    auraStatDelta: 0,
    auraAttackDelta: 0,
    primaryLevels: 1,
    auraLevels: 0,
  });
  assert.ok(skill.incrementalBuffScore > 0);

  assert.deepEqual(
    getBufferRecommendationRows([], [], null, null, null, { ...baseline, isBuffer: false }),
    [],
  );
}

function testSimulatorResolutionFailureFallsBackToBaseScoring() {
  const resolverCalls = [];
  const { getBufferRecommendationRows } = createRecommendation({
    getBufferEnchantBaseRelativeChanges: () => ({ statDelta: 50 }),
    resolveBufferNetChanges: (...args) => {
      resolverCalls.push(args);
      throw new RangeError('unsupported context');
    },
  });
  const baseline = {
    isBuffer: true,
    bufferKey: 'muse',
    statName: '정신력',
    stat: 10000,
    buffPower: 15000,
    buffAmplification: 20,
    buffSkillLevel: 40,
    awakeningSkillLevel: 40,
    currentSelfStatSkills: {},
  };
  const row = {
    sourceType: 'enchant',
    role: 'buffer',
    slot: '무기',
    itemId: 'candidate',
    effects: { allStat: 100 },
    auction: { minUnitPrice: 1000 },
  };
  const simulator = {
    role: 'buffer',
    bufferSkillContexts: {},
  };
  const [result] = getBufferRecommendationRows(
    [row],
    [{ slot: '무기', effects: {} }],
    null,
    null,
    null,
    baseline,
    false,
    simulator,
  );
  assert.equal(resolverCalls.length, 1, 'the initial simulator-support probe owns its catch boundary');
  assert.equal(result.bufferSimulatorSupported, false);
  assert.deepEqual(result.bufferBaseRelativeChanges, { statDelta: 50 });
  assert.ok(result.incrementalBuffScore > 0);
}

function testRelicCraftUsesNormalizedBodyAndBufferCallbackOnly() {
  const { getBufferRecommendationRows } = createRecommendation();
  const baseline = {
    isBuffer: true,
    bufferKey: 'femaleCrusader',
    jobName: '프리스트(여)',
    statName: '지능',
    stat: 12000,
    activeSelfStat: 500,
    switchingStatDelta: 200,
    buffPower: 18000,
    buffAmplification: 20,
    switchingBuffAmplificationDelta: 5,
    buffSkillName: '버프',
    buffSkillLevel: 40,
    awakeningSkillName: '각성',
    awakeningSkillLevel: 40,
    auraStat: 500,
    auraAttack: 100,
    currentSelfStatSkills: {},
  };
  const row = {
    sourceType: 'relicCraft',
    slot: '마법석',
    itemId: 'df77236c51ea1274a3deb79c3e470695',
    itemName: '우아한 기품의 향수',
    effects: { finalDamage: 45.67376612, buffPower: 6360 },
    currentEffects: { finalDamage: 25, buffPower: 11220 },
    targetEffects: { finalDamage: 70.67376612, buffPower: 17580 },
    currentEquipmentBody: {
      slotId: 'MAGIC_STON',
      itemId: 'current-magic-stone',
      effects: { finalDamage: 25, buffPower: 11220 },
      itemBuff: {
        explain: '30레벨 버프 스킬 Lv +1\n50레벨 액티브 스킬 Lv +2',
      },
    },
    targetEquipmentBody: {
      slotId: 'MAGIC_STON',
      itemId: 'df77236c51ea1274a3deb79c3e470695',
      effects: { finalDamage: 70.67376612, buffPower: 17580 },
      itemBuff: {
        explain: '30레벨 버프 스킬 Lv +1\n50레벨 액티브 스킬 Lv +2',
      },
    },
    equipmentTuneBuffPowerDelta: 0,
    expectedGold: 1000,
    auction: { minUnitPrice: 1000 },
  };
  const [result] = getBufferRecommendationRows(
    [deepFreeze(row)],
    [],
    null,
    null,
    null,
    deepFreeze(baseline),
  );
  assert.ok(result);
  assert.equal(result.bufferBuffPowerDelta, 6360);
  assert.equal(result.targetEffects.finalDamage, 70.67376612);
  assert.ok(result.incrementalBuffScore > 0);
}

const tests = [
  testFactoryContract,
  testCalculateBufferScoreFixturesAndEdges,
  testComparatorPolicy,
  testRecommendationRowBoundaries,
  testSimulatorResolutionFailureFallsBackToBaseScoring,
  testRelicCraftUsesNormalizedBodyAndBufferCallbackOnly,
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
