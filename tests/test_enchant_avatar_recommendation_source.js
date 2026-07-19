import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as avatarSourceModule from '../src/dnfHellTool/enchantAvatarRecommendationSource.js';

const { createEnchantAvatarRecommendationSource } = avatarSourceModule;

const DEPENDENCY_NAMES = [
  'avatarPlatinumSlotLabelByKey',
  'cloneSimulatorValue',
  'getDealerPrimaryStatKey',
  'addEffects',
  'getDamageBaseline',
  'normalizeSimulatorDamageDelta',
  'subtractEffects',
  'getSelectedStatEffect',
];

const PUBLIC_FUNCTIONS = [
  'getAvatarPlatinumDamageMultiplier',
  'getDealerAvatarPlatinumEquipmentScoreMultiplier',
  'getAvatarPlatinumRecommendationMultiplier',
  'getAvatarRows',
  'normalizeAvatarSimulatorState',
  'getAvatarRegularEmblemEffectsTotal',
  'getAvatarEmblemMetricBaseline',
];

function cloneSimulatorValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function getDealerPrimaryStatKey(baseline = {}) {
  if (baseline?.statName === '힘') return 'str';
  if (baseline?.statName === '지능') return 'int';
  return '';
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

function getDamageBaseline(baseline = {}) {
  return {
    ...(baseline || {}),
    stat: Number(baseline?.stat || 0),
    statName: baseline?.statName === '지능' ? '지능' : '힘',
    baseStat: Number(baseline?.baseStat || 0),
  };
}

function normalizeSimulatorDamageDelta(effects = {}, baseline = {}) {
  const normalized = { ...(effects || {}) };
  const primaryKey = getDealerPrimaryStatKey(baseline);
  if (!primaryKey) return normalized;
  normalized[primaryKey] = Number(effects.allStat || 0) + Number(effects[primaryKey] || 0);
  delete normalized.allStat;
  delete normalized[primaryKey === 'str' ? 'int' : 'str'];
  return normalized;
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

function getSelectedStatEffect(effects = {}, baseline = {}) {
  effects = effects || {};
  baseline = baseline || {};
  if (Number.isFinite(effects.allStat)) return Number(effects.allStat || 0);
  return baseline.statName === '지능'
    ? Number(effects.int || 0)
    : Number(effects.str || 0);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function createDependencies(overrides = {}) {
  return {
    avatarPlatinumSlotLabelByKey: {
      top: '상의 아바타',
      bottom: '하의 아바타',
    },
    cloneSimulatorValue,
    getDealerPrimaryStatKey,
    addEffects,
    getDamageBaseline,
    normalizeSimulatorDamageDelta,
    subtractEffects,
    getSelectedStatEffect,
    ...overrides,
  };
}

function createAvatarSource(overrides = {}) {
  return createEnchantAvatarRecommendationSource(createDependencies(overrides));
}

function assertClose(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function testFactoryDependencyAndPublicPrivateContract() {
  assert.deepEqual(Object.keys(avatarSourceModule), ['createEnchantAvatarRecommendationSource']);
  const dependencyReads = [];
  const dependencies = new Proxy(createDependencies(), {
    get(target, property, receiver) {
      dependencyReads.push(property);
      return Reflect.get(target, property, receiver);
    },
  });
  const source = createEnchantAvatarRecommendationSource(dependencies);
  assert.deepEqual(dependencyReads, DEPENDENCY_NAMES);
  assert.deepEqual(Object.keys(source), PUBLIC_FUNCTIONS);
  Object.values(source).forEach((value) => assert.equal(typeof value, 'function'));
  for (const privateName of [
    'resolveDealerAvatarSkillCoefficient',
    'getDealerTitleRecognizedLevelContribution',
    'getDealerAvatarRecognizedLevel',
    'AVATAR_EQUIPMENT_SCORE_RED_SLOT_IDS',
    'AVATAR_EQUIPMENT_SCORE_GREEN_YELLOW_SLOT_IDS',
    'AVATAR_EQUIPMENT_SCORE_STAT_BY_GRADE',
  ]) {
    assert.equal(privateName in source, false);
    assert.equal(privateName in avatarSourceModule, false);
  }
}

function testGetAvatarRowsFullPayloadAndReferenceSemantics() {
  const { getAvatarRows } = createAvatarSource();
  const effects = { skillDamageMultiplier: 1.04, finalDamage: 3 };
  const auction = { minUnitPrice: 1234567 };
  const acquisition = { label: '상점 구매' };
  const targetPlatinumEmblem = { itemId: 'platinum-target', targetSkill: '주력기' };
  const targetBuffChanges = { avatar: { itemId: 'buff-avatar' } };
  const socketChanges = [{ socketIndex: 0, targetEmblem: { itemId: 'emblem-target' } }];
  const equivalentTargetSkills = ['주력기', '동급기'];
  const bufferSimulatorChanges = { statDelta: 25 };
  const bufferSkillStatDeltas = { 주력기: 10 };
  const bufferSkillLevels = { 주력기: 2 };
  const baseSkillContributions = [{ name: '주력기', value: 1 }];
  const targetSkillContributions = [{ name: '주력기', value: 2 }];
  const candidate = {
    kind: 'platinumEmblem',
    slot: '상의 아바타',
    tier: '플래티넘 엠블렘',
    itemId: 'avatar-item',
    itemName: '찬란한 플래티넘 엠블렘',
    itemRarity: '레전더리',
    iconUrl: 'avatar-icon',
    effects,
    skillDamageMultiplier: '1.04',
    itemExplain: '설명',
    auction,
    expectedGold: 1234567,
    acquisition,
    needCount: 2,
    unitPrice: 600000,
    targetSlotId: 'JACKET',
    targetPlatinumEmblem,
    targetBuffSlot: 'JACKET',
    targetBuffChanges,
    socketChanges,
    targetSkill: '주력기',
    equivalentTargetSkills,
    currentSwitchingMultiplier: '1.1',
    candidateSwitchingMultiplier: '1.2',
    priceMode: 'complete',
    bufferStatScope: 'current',
    bufferBuffSkillLevelDelta: '1',
    bufferAwakeningSkillLevelDelta: '2',
    bufferSimulatorChanges,
    bufferSkillStatDeltas,
    bufferSkillLevels,
    currentPlatinumSkill: '기존기',
    baseSkillContributions,
    targetSkillContributions,
    skillContributionScope: 'dealer',
    priceWarningText: '최근 거래가 기준',
    recommendationPriority: '-3',
  };
  const [row] = getAvatarRows({ recommendations: [candidate] });
  assert.deepEqual(row, {
    sourceType: 'avatar',
    kind: 'platinumEmblem',
    slot: '상의 아바타',
    tier: '플래티넘 엠블렘',
    itemId: 'avatar-item',
    itemName: '찬란한 플래티넘 엠블렘',
    itemRarity: '레전더리',
    fame: 0,
    iconUrl: 'avatar-icon',
    effects,
    skillDamageMultiplier: 1.04,
    baseRelativeSkillDamageMultiplier: 1.04,
    itemExplain: '설명',
    auction,
    expectedGold: 1234567,
    acquisition,
    needCount: 2,
    unitPrice: 600000,
    targetSlotId: 'JACKET',
    targetPlatinumEmblem,
    targetBuffSlot: 'JACKET',
    targetBuffChanges,
    socketChanges,
    targetSkill: '주력기',
    equivalentTargetSkills,
    currentSwitchingMultiplier: 1.1,
    candidateSwitchingMultiplier: 1.2,
    priceMode: 'complete',
    bufferStatScope: 'current',
    bufferBuffSkillLevelDelta: 1,
    bufferAwakeningSkillLevelDelta: 2,
    bufferSimulatorChanges,
    bufferSkillStatDeltas,
    bufferSkillLevels,
    currentPlatinumSkill: '기존기',
    baseSkillContributions,
    targetSkillContributions,
    hasExactSkillContributions: true,
    skillContributionScope: 'dealer',
    priceWarningText: '최근 거래가 기준',
    recommendationPriority: -3,
  });
  for (const key of [
    'effects',
    'auction',
    'acquisition',
    'targetPlatinumEmblem',
    'targetBuffChanges',
    'socketChanges',
    'equivalentTargetSkills',
    'bufferSimulatorChanges',
    'bufferSkillStatDeltas',
    'bufferSkillLevels',
    'baseSkillContributions',
    'targetSkillContributions',
  ]) {
    assert.strictEqual(row[key], candidate[key], `${key} keeps the original payload reference`);
  }

  const [fallback] = getAvatarRows({ recommendations: [{ itemId: 'fallback/id' }] });
  assert.deepEqual(fallback, {
    sourceType: 'avatar',
    kind: '',
    slot: '아바타',
    tier: '아바타',
    itemId: 'fallback/id',
    itemName: undefined,
    itemRarity: '',
    fame: 0,
    iconUrl: 'https://img-api.neople.co.kr/df/items/fallback%2Fid',
    effects: {},
    skillDamageMultiplier: 0,
    baseRelativeSkillDamageMultiplier: 0,
    itemExplain: '',
    auction: {},
    expectedGold: undefined,
    acquisition: null,
    needCount: 0,
    unitPrice: undefined,
    targetSlotId: '',
    targetPlatinumEmblem: null,
    targetBuffSlot: '',
    targetBuffChanges: null,
    socketChanges: [],
    targetSkill: '',
    equivalentTargetSkills: [],
    currentSwitchingMultiplier: 0,
    candidateSwitchingMultiplier: 0,
    priceMode: '',
    bufferStatScope: '',
    bufferBuffSkillLevelDelta: 0,
    bufferAwakeningSkillLevelDelta: 0,
    bufferSimulatorChanges: null,
    bufferSkillStatDeltas: {},
    bufferSkillLevels: {},
    currentPlatinumSkill: '',
    baseSkillContributions: [],
    targetSkillContributions: [],
    hasExactSkillContributions: false,
    skillContributionScope: '',
    priceWarningText: '',
    recommendationPriority: 0,
  });
  assert.deepEqual(getAvatarRows(null), []);
}

function testNormalizeAvatarSimulatorStateCloneAndRecognition() {
  const { normalizeAvatarSimulatorState } = createAvatarSource({
    avatarPlatinumSlotLabelByKey: { top: 'TOP-LABEL', bottom: 'BOTTOM-LABEL' },
  });
  const firstEmblem = { itemId: 'first', socketKey: 'legacy', nested: { value: 1 } };
  const thirdEmblem = { itemId: 'third' };
  const avatar = deepFreeze({
    jacket: { topOptionMatched: true },
    platinumSlots: ['TOP-LABEL'],
    slots: [
      {
        slotId: 'JACKET',
        recognizedPlatinumLevelContribution: 99,
        emblems: [firstEmblem, null, thirdEmblem],
      },
      {
        slotId: 'PANTS',
        recognizedPlatinumLevelContribution: 99,
        emblems: [{ itemId: 'pants' }],
      },
      {
        slotId: 'FACE',
        recognizedPlatinumLevelContribution: 99,
        emblems: 'invalid',
      },
    ],
  });
  const normalized = normalizeAvatarSimulatorState(avatar);
  assert.notStrictEqual(normalized, avatar);
  assert.equal(normalized.recognizedTopOptionLevelContribution, 1);
  assert.equal(normalized.slots[0].recognizedPlatinumLevelContribution, 1);
  assert.equal(normalized.slots[1].recognizedPlatinumLevelContribution, 0);
  assert.equal(normalized.slots[2].recognizedPlatinumLevelContribution, 0);
  assert.equal(normalized.slots[0].emblems.length, 2);
  assert.deepEqual(normalized.slots[0].emblems[0], {
    itemId: 'first',
    socketKey: 'regular:0',
    nested: { value: 1 },
    socketIndex: 0,
  });
  assert.strictEqual(normalized.slots[0].emblems[1], null);
  assert.deepEqual(normalized.slots[1].emblems, [
    { itemId: 'pants', socketKey: 'regular:0', socketIndex: 0 },
    null,
  ]);
  assert.deepEqual(normalized.slots[2].emblems, [null, null]);
  assert.notStrictEqual(normalized.slots[0], avatar.slots[0]);
  assert.notStrictEqual(normalized.slots[0].emblems[0], firstEmblem);
  assert.notStrictEqual(normalized.slots[0].emblems[0].nested, firstEmblem.nested);
  assert.equal(avatar.slots[0].emblems.length, 3);
  assert.strictEqual(avatar.slots[0].emblems[2], thirdEmblem);

  const empty = normalizeAvatarSimulatorState();
  assert.deepEqual(empty, {
    recognizedTopOptionLevelContribution: 0,
    slots: [],
  });
}

function testAvatarEmblemActualEquipmentScoreAndBaselineIdentity() {
  const {
    getAvatarRegularEmblemEffectsTotal,
    getAvatarEmblemMetricBaseline,
  } = createAvatarSource();
  const avatar = deepFreeze({
    slots: [
      {
        slotId: 'HEADGEAR',
        emblems: [{ grade: 'shining', effects: { int: 100, attack: 7 } }, null],
      },
      {
        slotId: 'FACE',
        emblems: [{ grade: 'ornate', effects: { allStat: 5 } }],
      },
      {
        slotId: 'JACKET',
        emblems: [{ grade: 'brilliant', effects: { int: 20 } }],
      },
      {
        slotId: 'PANTS',
        emblems: [{ grade: 'shining', effects: { int: 999 } }],
      },
      {
        slotId: 'SHOES',
        emblems: [{ grade: 'brilliant', effects: { int: 30 } }],
      },
    ],
  });
  const baseline = deepFreeze({ stat: 1000, statName: '지능', baseStat: 100, marker: 'same' });
  assert.deepEqual(getAvatarRegularEmblemEffectsTotal(avatar, 'actual', baseline), {
    int: 1149,
    attack: 7,
    allStat: 5,
  });
  assert.deepEqual(getAvatarRegularEmblemEffectsTotal(avatar, 'equipmentScore', baseline), {
    int: 35,
  });
  assert.strictEqual(getAvatarEmblemMetricBaseline(baseline, avatar, 'actual'), baseline);
  const equipmentScoreBaseline = getAvatarEmblemMetricBaseline(
    baseline,
    avatar,
    'equipmentScore',
  );
  assert.notStrictEqual(equipmentScoreBaseline, baseline);
  assert.deepEqual(equipmentScoreBaseline, {
    stat: -119,
    statName: '지능',
    baseStat: 100,
    marker: 'same',
  });
  assert.equal(baseline.stat, 1000);
}

function testPlatinumMultipliersAndTitleJobFiltering() {
  const {
    getAvatarPlatinumDamageMultiplier,
    getDealerAvatarPlatinumEquipmentScoreMultiplier,
    getAvatarPlatinumRecommendationMultiplier,
  } = createAvatarSource();
  assertClose(getAvatarPlatinumDamageMultiplier({
    top: { skillDamageMultiplier: 1.1 },
    ignoredZero: { skillDamageMultiplier: 0 },
    ignoredInvalid: { skillDamageMultiplier: Number.NaN },
    bottom: { skillDamageMultiplier: '1.2' },
    missing: null,
  }), 1.32);
  assert.equal(getAvatarPlatinumDamageMultiplier(null), 1);

  const simulator = deepFreeze({
    baseDamageBaseline: { jobName: '검신' },
    baseAvatar: {
      slots: [
        { recognizedPlatinumLevelContribution: 1 },
        { recognizedPlatinumLevelContribution: 0 },
      ],
    },
    simulatedAvatar: {
      recognizedTopOptionLevelContribution: 1,
      slots: [
        { recognizedPlatinumLevelContribution: 1 },
        { recognizedPlatinumLevelContribution: 1 },
      ],
    },
    simulatedTitle: {
      itemReinforceSkill: [
        { jobName: '공통', skills: [{ value: 1 }, { value: 2 }] },
        { jobName: '검신', skills: [{ value: 3 }] },
        { jobName: '다른 직업', skills: [{ value: 50 }] },
      ],
      itemBuff: {
        reinforceSkill: [
          { jobName: '검신', levelRange: [{ value: 4 }] },
          { jobName: '다른 직업', levelRange: [{ value: 60 }] },
        ],
      },
    },
  });
  assertClose(
    getDealerAvatarPlatinumEquipmentScoreMultiplier(simulator),
    (1.20 + 7 * 0.02) / (1.20 + 6 * 0.02),
  );

  assert.equal(getAvatarPlatinumRecommendationMultiplier({
    baseRelativeSkillDamageMultiplier: 1.07,
    skillDamageMultiplier: 1.08,
    effects: { skillDamageMultiplier: 1.09, finalDamage: 20 },
  }), 1.07);
  assert.equal(getAvatarPlatinumRecommendationMultiplier({
    baseRelativeSkillDamageMultiplier: 0,
    skillDamageMultiplier: 1.08,
    effects: { skillDamageMultiplier: 1.09, finalDamage: 20 },
  }), 1.08);
  assert.equal(getAvatarPlatinumRecommendationMultiplier({
    baseRelativeSkillDamageMultiplier: Number.NaN,
    skillDamageMultiplier: 0,
    effects: { skillDamageMultiplier: 1.09, finalDamage: 20 },
  }), 1.09);
  assert.equal(getAvatarPlatinumRecommendationMultiplier({
    baseRelativeSkillDamageMultiplier: 'invalid',
    skillDamageMultiplier: 1.5,
    effects: { skillDamageMultiplier: 1.6, finalDamage: 10 },
  }), 1.1, 'a truthy invalid first fallback remains authoritative before Number conversion');
  assert.equal(getAvatarPlatinumRecommendationMultiplier({ effects: { finalDamage: 7 } }), 1.07);
  assert.equal(getAvatarPlatinumRecommendationMultiplier({ effects: { finalDamage: -7 } }), 1);
}

function testEnchantViewImportAndAssemblyContract() {
  const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
  const source = readFileSync(viewPath, 'utf8');
  assert.match(
    source,
    /import \{ createEnchantAvatarRecommendationSource \} from '\.\/enchantAvatarRecommendationSource\.js';/,
  );

  const factoryIndex = source.indexOf('} = createEnchantAvatarRecommendationSource({');
  assert.ok(factoryIndex >= 0, 'avatar recommendation source factory is assembled');
  const factoryBlock = source.slice(
    source.lastIndexOf('const {', factoryIndex),
    source.indexOf('});', factoryIndex) + 3,
  );
  PUBLIC_FUNCTIONS.forEach((name) => {
    assert.match(factoryBlock, new RegExp(`\\b${name}\\b`));
  });
  assert.match(
    factoryBlock,
    /avatarPlatinumSlotLabelByKey:\s*AVATAR_PLATINUM_SLOT_LABEL_BY_KEY/,
  );
}

const tests = [
  testFactoryDependencyAndPublicPrivateContract,
  testGetAvatarRowsFullPayloadAndReferenceSemantics,
  testNormalizeAvatarSimulatorStateCloneAndRecognition,
  testAvatarEmblemActualEquipmentScoreAndBaselineIdentity,
  testPlatinumMultipliersAndTitleJobFiltering,
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
