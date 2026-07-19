import assert from 'node:assert/strict';
import * as buffMetricModule from '../src/dnfHellTool/enchantBuffEnhancementMetric.js';

const { createEnchantBuffEnhancementMetric } = buffMetricModule;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function assertClose(actual, expected, epsilon = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

const normalizationCalls = [];
let cloneCalls = 0;
function getBuffLoadoutRowsForMetric(value) {
  normalizationCalls.push(value);
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === 'object');
  return value && typeof value === 'object' ? [value] : [];
}

function cloneSimulatorValue(value) {
  cloneCalls += 1;
  return clone(value);
}

function getBuffSimulatorTargetSlotId(row = {}) {
  if (row.sourceType === 'switchingTitle') return 'TITLE';
  if (row.sourceType === 'switchingCreature') return 'CREATURE';
  if (row.sourceType === 'switchingFragment') {
    return String(row.targetBuffSlot || row.switchingSlot || '').trim();
  }
  if (row.sourceType === 'avatar' && ['switchingAvatar', 'switchingPlatinumEmblem'].includes(row.kind)) {
    if (row.targetSlotId) return String(row.targetSlotId).trim();
    return String(row.slot || '').includes('상의') ? 'JACKET' : 'PANTS';
  }
  return '';
}

function getBuffSimulatorExclusiveGroupKey(row = {}) {
  const targetSlotId = getBuffSimulatorTargetSlotId(row);
  if (!targetSlotId) return '';
  if (row.sourceType === 'switchingTitle') return 'buffTitle';
  if (row.sourceType === 'switchingCreature') return 'buffCreature';
  if (row.sourceType === 'switchingFragment') return `buffEquipment:${targetSlotId}`;
  if (row.kind === 'switchingAvatar') return `buffAvatarPackage:${targetSlotId}`;
  if (row.kind === 'switchingPlatinumEmblem') return `buffAvatarPlatinum:${targetSlotId}`;
  return '';
}

const metric = createEnchantBuffEnhancementMetric({
  getBuffLoadoutRowsForMetric,
  cloneSimulatorValue,
  getBuffSimulatorTargetSlotId,
  getBuffSimulatorExclusiveGroupKey,
});

assert.deepEqual(Object.keys(buffMetricModule), ['createEnchantBuffEnhancementMetric']);
assert.deepEqual(Object.keys(metric), [
  'getBuffLoadoutLevelContribution',
  'getBuffEnhancementMetricMultiplier',
  'adaptBuffEnhancementRecommendation',
]);

normalizationCalls.length = 0;
assert.equal(metric.getBuffLoadoutLevelContribution({
  equipment: {
    slotId: 'TITLE',
    buffContribution: { skillLevel: 2 },
  },
  avatar: [
    null,
    'invalid',
    {
      buffContribution: {
        topOptionSkillLevel: 1,
        itemSkillLevel: 1,
        platinumSkillLevel: 2,
      },
    },
  ],
  creature: {
    buffContribution: { skillLevel: 3 },
  },
}), 9);
assert.equal(normalizationCalls.length, 3);
assert.deepEqual(normalizationCalls.map((value) => (
  Array.isArray(value) ? 'array' : typeof value
)), ['object', 'array', 'object']);

assert.equal(metric.getBuffLoadoutLevelContribution(), 0);
assert.equal(metric.getBuffLoadoutLevelContribution({
  equipment: [null, false, 0, '', { slotId: 'NOT_TITLE', buffContribution: { skillLevel: 99 } }],
  avatar: 'invalid',
  creature: 123,
}), 0);

const upperCapBase = {
  skillInfo: { level: 19 },
  equipment: [],
  avatar: [],
  creature: [],
};
const upperCapSimulated = {
  ...clone(upperCapBase),
  equipment: [{ slotId: 'TITLE', buffContribution: { skillLevel: 5 } }],
};
assertClose(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: upperCapBase,
  simulatedBuffLoadout: upperCapSimulated,
}, 'equipmentScore'), 100 / 98);

const lowerCapBase = {
  skillInfo: { level: 1 },
  equipment: [{ slotId: 'TITLE', buffContribution: { skillLevel: 5 } }],
  avatar: [],
  creature: [],
};
const lowerCapSimulated = {
  ...clone(lowerCapBase),
  equipment: [],
};
assertClose(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: lowerCapBase,
  simulatedBuffLoadout: lowerCapSimulated,
}, 'equipmentScore'), 60 / 62);

const denseBase = {
  skillInfo: { level: 20 },
  equipment: [],
};
const denseSimulated = {
  skillInfo: { level: 20 },
  equipment: Array.from({ length: 15 }, (_, index) => ({
    slotName: `dense-${index}`,
    buffContribution: { isDenseFragment: true },
  })),
};
assertClose(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: denseBase,
  simulatedBuffLoadout: denseSimulated,
}, 'equipmentScore'), 103 / 100);

const actualBase = {
  skillInfo: {
    level: 10,
    currentCoefficients: [10],
    perLevelCoefficients: [2],
  },
  equipment: [],
  avatar: [],
  creature: [],
};
const actualSimulated = {
  ...clone(actualBase),
  equipment: [{ slotId: 'TITLE', buffContribution: { skillLevel: 1 } }],
};
const actualExpected = 1.12 / 1.10;
for (const mode of [undefined, 'actual', 'legacy', 'not-equipment-score']) {
  const simulator = {
    baseBuffLoadout: actualBase,
    simulatedBuffLoadout: actualSimulated,
  };
  const actual = mode === undefined
    ? metric.getBuffEnhancementMetricMultiplier(simulator)
    : metric.getBuffEnhancementMetricMultiplier(simulator, mode);
  assertClose(actual, actualExpected);
}
assertClose(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: actualBase,
  simulatedBuffLoadout: actualSimulated,
}, 'equipmentScore'), 82 / 80);
assert.equal(metric.getBuffEnhancementMetricMultiplier({}), 1);
assert.equal(metric.getBuffEnhancementMetricMultiplier({ baseBuffLoadout: {} }), 1);
assert.equal(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: { skillInfo: { currentCoefficients: [], perLevelCoefficients: [] } },
}), 1);
assert.equal(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: {
    skillInfo: { currentCoefficients: [10, 20], perLevelCoefficients: [1, 2, 3] },
  },
}), 1);

const scalarFragmentBase = {
  skillInfo: {
    level: 20,
    currentCoefficients: [10, 20],
    perLevelCoefficients: [0],
  },
  equipment: {
    slotName: '상의',
    buffContribution: { additionalRatePercent: 1 },
  },
};
const scalarFragmentSimulated = {
  ...clone(scalarFragmentBase),
  equipment: {
    slotName: '상의',
    buffContribution: { additionalRatePercent: 3 },
  },
};
assertClose(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: scalarFragmentBase,
  simulatedBuffLoadout: scalarFragmentSimulated,
}), (1.12 * 1.20) / (1.10 * 1.20));

const arrayFragmentBase = {
  skillInfo: {
    level: 20,
    currentCoefficients: [10, 20],
    perLevelCoefficients: [0, 0],
  },
  equipment: [{ buffContribution: { additionalRatePercents: [1, 2] } }],
};
const arrayFragmentSimulated = {
  ...clone(arrayFragmentBase),
  equipment: [{ buffContribution: { additionalRatePercents: [3, 5] } }],
};
assertClose(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: arrayFragmentBase,
  simulatedBuffLoadout: arrayFragmentSimulated,
}), (1.12 * 1.23) / (1.10 * 1.20));

const ratioBase = {
  skillInfo: {
    level: 10,
    currentCoefficients: [10],
    perLevelCoefficients: [2],
    damageApplicationRatio: 0.5,
  },
  equipment: [],
};
const ratioSimulated = {
  ...clone(ratioBase),
  equipment: [{ slotId: 'TITLE', buffContribution: { skillLevel: 1 } }],
};
assertClose(metric.getBuffEnhancementMetricMultiplier({
  baseBuffLoadout: ratioBase,
  simulatedBuffLoadout: ratioSimulated,
}), 1 + (actualExpected - 1) * 0.5);
for (const invalidRatio of [0, -1, 2, Number.NaN, null, undefined]) {
  const baseBuffLoadout = clone(ratioBase);
  baseBuffLoadout.skillInfo.damageApplicationRatio = invalidRatio;
  const simulatedBuffLoadout = clone(ratioSimulated);
  simulatedBuffLoadout.skillInfo.damageApplicationRatio = invalidRatio;
  assertClose(metric.getBuffEnhancementMetricMultiplier({
    baseBuffLoadout,
    simulatedBuffLoadout,
  }), actualExpected);
}

function createAdaptationSimulator(overrides = {}) {
  const baseBuffLoadout = {
    skillInfo: {
      level: 10,
      currentCoefficients: [10],
      perLevelCoefficients: [2],
    },
    equipment: [
      {
        slotId: 'TITLE',
        slotName: '칭호',
        itemId: 'base-title',
        buffContribution: { skillLevel: 0 },
      },
      {
        slotName: '벨트',
        itemId: 'base-fragment',
        buffContribution: {
          additionalRatePercent: 1,
          isDenseFragment: false,
        },
      },
    ],
    avatar: [
      {
        slotId: 'JACKET',
        itemId: 'base-jacket',
        buffContribution: { topOptionSkillLevel: 0, platinumSkillLevel: 0 },
      },
      {
        slotId: 'PANTS',
        itemId: 'base-pants',
        buffContribution: { platinumSkillLevel: 0 },
      },
    ],
    creature: [{
      slotId: 'CREATURE',
      itemId: 'base-creature',
      buffContribution: { skillLevel: 0 },
    }],
  };
  const simulatedBuffLoadout = clone(baseBuffLoadout);
  return {
    baseBuffLoadout,
    simulatedBuffLoadout,
    ...overrides,
  };
}

function assertAdaptationSuccess(row, simulator, expectedMultiplier) {
  const rowBefore = clone(row);
  const simulatorBefore = clone(simulator);
  const cloneCallsBefore = cloneCalls;
  const result = metric.adaptBuffEnhancementRecommendation(
    deepFreeze(row),
    deepFreeze(simulator),
  );
  assert.notEqual(result, row);
  assert.deepEqual(row, rowBefore);
  assert.deepEqual(simulator, simulatorBefore);
  assert.ok(cloneCalls > cloneCallsBefore);
  assertClose(result.skillDamageMultiplier, expectedMultiplier);
  assertClose(result.rawSkillDamageMultiplier, expectedMultiplier);
  assertClose(result.effects.skillDamageMultiplier, expectedMultiplier);
  assert.deepEqual(
    Object.fromEntries(Object.entries(result.effects).filter(([key]) => key !== 'skillDamageMultiplier')),
    row.effects || {},
  );
  return result;
}

const fragmentSimulator = createAdaptationSimulator();
fragmentSimulator.simulatedBuffLoadout.equipment[0].buffContribution.skillLevel = 1;
assertAdaptationSuccess({
  sourceType: 'switchingFragment',
  targetBuffSlot: '벨트',
  itemId: 'target-fragment',
  effects: { finalDamage: 7 },
  targetBuffChanges: {
    equipment: {
      itemId: 'target-fragment',
      buffContribution: {
        additionalRatePercent: 3,
        isDenseFragment: true,
      },
    },
  },
}, fragmentSimulator, 1.14 / 1.12);

assertAdaptationSuccess({
  sourceType: 'switchingTitle',
  itemId: 'target-title',
  candidateTitleContribution: 2,
  effects: {},
}, createAdaptationSimulator(), 1.14 / 1.10);

assertAdaptationSuccess({
  sourceType: 'switchingCreature',
  itemId: 'target-creature',
  candidateCreatureContribution: 1,
  effects: {},
}, createAdaptationSimulator(), 1.12 / 1.10);

assertAdaptationSuccess({
  sourceType: 'avatar',
  kind: 'switchingAvatar',
  targetSlotId: 'JACKET',
  itemId: 'target-jacket',
  effects: {},
  targetBuffChanges: {
    avatar: {
      itemId: 'target-jacket',
      buffContribution: { topOptionSkillLevel: 1, platinumSkillLevel: 1 },
    },
  },
}, createAdaptationSimulator(), 1.14 / 1.10);

const platinumSimulator = createAdaptationSimulator();
platinumSimulator.simulatedBuffLoadout.avatar[0] = {
  ...platinumSimulator.simulatedBuffLoadout.avatar[0],
  itemId: 'simulated-package',
  buffContribution: { topOptionSkillLevel: 1, platinumSkillLevel: 1 },
};
assertAdaptationSuccess({
  sourceType: 'avatar',
  kind: 'switchingPlatinumEmblem',
  targetSlotId: 'JACKET',
  itemId: 'target-platinum',
  effects: {},
  targetBuffChanges: {
    platinumEmblem: { skillLevel: 2 },
  },
}, platinumSimulator, 1.16 / 1.12);

const singletonSimulator = createAdaptationSimulator();
singletonSimulator.baseBuffLoadout.equipment = singletonSimulator.baseBuffLoadout.equipment[1];
singletonSimulator.simulatedBuffLoadout.equipment = clone(singletonSimulator.baseBuffLoadout.equipment);
assertAdaptationSuccess({
  sourceType: 'switchingFragment',
  targetBuffSlot: '벨트',
  itemId: 'singleton-target',
  effects: {},
  targetBuffChanges: {
    equipment: {
      itemId: 'singleton-target',
      buffContribution: { additionalRatePercent: 2 },
    },
  },
}, singletonSimulator, 1.11 / 1.10);

function assertNoOpIdentity(row, simulator) {
  const rowBefore = clone(row);
  const simulatorBefore = clone(simulator);
  const result = metric.adaptBuffEnhancementRecommendation(row, simulator);
  assert.strictEqual(result, row);
  assert.deepEqual(row, rowBefore);
  assert.deepEqual(simulator, simulatorBefore);
}

assertNoOpIdentity({ sourceType: 'other', effects: {} }, createAdaptationSimulator());

const rentalAvatarSimulator = createAdaptationSimulator();
rentalAvatarSimulator.baseBuffLoadout.avatar[0] = {
  ...rentalAvatarSimulator.baseBuffLoadout.avatar[0],
  itemId: 'rental-jacket',
  buffAvatarSource: 'wornFallback',
  buffContribution: {
    topOptionSkillLevel: 1,
    itemSkillLevel: 1,
    platinumSkillLevel: 0,
  },
};
rentalAvatarSimulator.simulatedBuffLoadout = clone(rentalAvatarSimulator.baseBuffLoadout);
assert.equal(
  metric.getBuffLoadoutLevelContribution(rentalAvatarSimulator.baseBuffLoadout),
  2,
);
assertNoOpIdentity({
  sourceType: 'avatar',
  kind: 'switchingAvatar',
  targetSlotId: 'JACKET',
  itemId: 'rare-jacket',
  effects: {},
  targetBuffChanges: {
    avatar: {
      itemId: 'rare-jacket',
      buffContribution: {
        topOptionSkillLevel: 1,
        itemSkillLevel: 0,
        platinumSkillLevel: 1,
      },
    },
  },
}, rentalAvatarSimulator);
assertNoOpIdentity({
  sourceType: 'switchingFragment',
  targetBuffSlot: '벨트',
}, createAdaptationSimulator());
assertNoOpIdentity({
  sourceType: 'switchingTitle',
  itemId: 'title',
  candidateTitleContribution: 1,
}, createAdaptationSimulator({
  baseBuffLoadout: { skillInfo: actualBase.skillInfo, equipment: null },
  simulatedBuffLoadout: { skillInfo: actualBase.skillInfo, equipment: null },
}));
assertNoOpIdentity({
  sourceType: 'switchingCreature',
  itemId: 'creature',
  candidateCreatureContribution: 1,
}, createAdaptationSimulator({
  baseBuffLoadout: { skillInfo: actualBase.skillInfo, creature: [] },
  simulatedBuffLoadout: { skillInfo: actualBase.skillInfo, creature: [] },
}));
assertNoOpIdentity({
  sourceType: 'avatar',
  kind: 'switchingAvatar',
  targetSlotId: 'JACKET',
  itemId: 'avatar',
  targetBuffChanges: {},
}, createAdaptationSimulator());
assertNoOpIdentity({
  sourceType: 'avatar',
  kind: 'switchingPlatinumEmblem',
  targetSlotId: 'JACKET',
  itemId: 'platinum',
  targetBuffChanges: { platinumEmblem: { skillLevel: 0 } },
}, createAdaptationSimulator());
assertNoOpIdentity({
  sourceType: 'switchingTitle',
  itemId: 'title',
  candidateTitleContribution: 1,
}, { baseBuffLoadout: {}, simulatedBuffLoadout: {} });

const equalTitleRow = {
  sourceType: 'switchingTitle',
  itemId: 'same-title',
  candidateTitleContribution: 0,
  effects: { attack: 3 },
};
assertNoOpIdentity(equalTitleRow, createAdaptationSimulator());

console.log('enchant buff enhancement metric: ok');
