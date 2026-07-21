import assert from 'node:assert/strict';
import * as calculationModule from '../src/dnfHellTool/enchantBufferSimulatorCalculation.js';

const { createEnchantBufferSimulatorCalculation } = calculationModule;

const BUFFER_CHANGE_KEYS = [
  'statDelta',
  'currentStatDelta',
  'switchingStatDelta',
  'selfStatSkillDelta',
  'buffPowerDelta',
  'currentBuffAmplificationDelta',
  'switchingBuffAmplificationDelta',
  'buffSkillLevelDelta',
  'awakeningSkillLevelDelta',
  'auraStatDelta',
  'auraAttackDelta',
];

const PUBLIC_FUNCTIONS = [
  'getBufferSkillContributionMap',
  'normalizeBuffLoadoutEquipmentSlotName',
  'getBufferBaselineSkillContexts',
  'mergeBufferSkillContexts',
  'resolveBufferNetChanges',
  'getBufferRecommendationScopeSimulator',
  'getBufferAvatarEmblemChangesBySocket',
  'getBufferSwitchingAvatarEmblemOverlays',
  'resolveBufferSwitchingAvatarEmblemChanges',
  'mergeBufferChangeMap',
  'getBufferAvatarEmblemNetChanges',
  'getBufferAvatarPlatinumBaseRelativeChanges',
  'getBufferAvatarNetChanges',
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

function getBuffLoadoutRowsForMetric(value) {
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === 'object');
  return value && typeof value === 'object' ? [value] : [];
}

function cloneSimulatorValue(value) {
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

function getSelectedStatEffect(effects = {}, baseline = {}) {
  effects = effects || {};
  baseline = baseline || {};
  if (Number.isFinite(effects.allStat)) return Number(effects.allStat || 0);
  return baseline.statName === '지능'
    ? Number(effects.int || 0)
    : Number(effects.str || 0);
}

const dependencyReads = [];
const dependencies = new Proxy({
  getBuffLoadoutRowsForMetric,
  cloneSimulatorValue,
  getBuffSimulatorTargetSlotId,
  getSelectedStatEffect,
}, {
  get(target, property, receiver) {
    dependencyReads.push(property);
    return Reflect.get(target, property, receiver);
  },
});

const calculation = createEnchantBufferSimulatorCalculation(dependencies);

assert.deepEqual(Object.keys(calculationModule), ['createEnchantBufferSimulatorCalculation']);
assert.deepEqual(dependencyReads, [
  'getBuffLoadoutRowsForMetric',
  'cloneSimulatorValue',
  'getBuffSimulatorTargetSlotId',
  'getSelectedStatEffect',
]);
assert.deepEqual(Object.keys(calculation), PUBLIC_FUNCTIONS);

assert.deepEqual(
  getBuffLoadoutRowsForMetric([null, false, 'invalid', { id: 1 }, { id: 2 }]),
  [{ id: 1 }, { id: 2 }],
);
assert.deepEqual(getBuffLoadoutRowsForMetric({ id: 1 }), [{ id: 1 }]);
assert.deepEqual(getBuffLoadoutRowsForMetric(null), []);
assert.deepEqual(getBuffLoadoutRowsForMetric('invalid'), []);

assert.equal(calculation.normalizeBuffLoadoutEquipmentSlotName(' 벨트 '), '허리');
assert.equal(calculation.normalizeBuffLoadoutEquipmentSlotName(' 허리 '), '허리');
assert.equal(calculation.normalizeBuffLoadoutEquipmentSlotName(null), '');

assert.deepEqual(calculation.getBufferSkillContributionMap([
  { contextKey: ' job:skill ', levelContribution: 1 },
  { contextKey: 'job:skill', levelContribution: 2 },
  { contextKey: 'job:other', levelContribution: -1 },
]), {
  'job:skill': 3,
  'job:other': -1,
});
assert.equal(calculation.getBufferSkillContributionMap(null), null);
assert.equal(calculation.getBufferSkillContributionMap([
  { contextKey: '', levelContribution: 1 },
]), null);
assert.equal(calculation.getBufferSkillContributionMap([
  { contextKey: 'job:skill', levelContribution: Number.NaN },
]), null);

assert.deepEqual(Object.keys(calculation.mergeBufferChangeMap({})), BUFFER_CHANGE_KEYS);
assert.deepEqual(Object.keys(calculation.resolveBufferNetChanges()), BUFFER_CHANGE_KEYS);

const fallback = calculation.getBufferBaselineSkillContexts({
  currentSelfStatSkills: {
    passive: {
      contextKey: 'job:skill',
      jobId: 'job',
      skillId: 'skill',
      level: 10,
      affectsSelfStat: true,
      affectsAuraStat: false,
      affectsAuraAttack: false,
      previousStat: 90,
      currentStat: 100,
      nextStat: 110,
    },
    aura: {
      contextKey: 'job:aura',
      jobId: 'job',
      skillId: 'aura',
      level: 20,
      affectsSelfStat: false,
      affectsAuraStat: true,
      affectsAuraAttack: true,
      previousPartyStat: 40,
      currentPartyStat: 50,
      nextPartyStat: 65,
      previousPartyAttack: 15,
      currentPartyAttack: 20,
      nextPartyAttack: 28,
    },
    ignored: {
      contextKey: '',
      level: 10,
    },
  },
});
assert.deepEqual(fallback['job:skill'], {
  jobId: 'job',
  skillId: 'skill',
  skillName: 'passive',
  currentLevel: 10,
  minReachableLevel: 9,
  maxReachableLevel: 11,
  netChangesByLevel: {
    9: { selfStatSkillDelta: -10, auraStatDelta: 0, auraAttackDelta: 0 },
    10: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
    11: { selfStatSkillDelta: 10, auraStatDelta: 0, auraAttackDelta: 0 },
  },
});
assert.deepEqual(fallback['job:aura'].netChangesByLevel, {
  19: { selfStatSkillDelta: 0, auraStatDelta: -10, auraAttackDelta: -5 },
  20: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
  21: { selfStatSkillDelta: 0, auraStatDelta: 15, auraAttackDelta: 8 },
});
assert.ok(!Object.hasOwn(fallback, ''));

const missingPrevious = calculation.getBufferBaselineSkillContexts({
  currentSelfStatSkills: {
    passive: {
      contextKey: 'job:missing',
      level: 10,
      affectsSelfStat: true,
      affectsAuraStat: false,
      affectsAuraAttack: false,
      currentStat: 100,
      nextStat: 115,
    },
  },
});
assert.ok(!Object.hasOwn(missingPrevious['job:missing'].netChangesByLevel, '9'));
assert.equal(missingPrevious['job:missing'].netChangesByLevel['11'].selfStatSkillDelta, 15);

const formal = {
  'job:skill': {
    jobId: 'formal-job',
    skillId: 'formal-skill',
    skillName: 'formal passive',
    currentLevel: 10,
    minReachableLevel: 10,
    maxReachableLevel: 12,
    netChangesByLevel: {
      10: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
      11: { selfStatSkillDelta: 15, auraStatDelta: 0, auraAttackDelta: 0 },
      12: { selfStatSkillDelta: 31, auraStatDelta: 0, auraAttackDelta: 0 },
    },
  },
};
const fallbackBeforeMerge = clone(fallback);
const formalBeforeMerge = clone(formal);
const merged = calculation.mergeBufferSkillContexts(
  deepFreeze(fallback),
  deepFreeze(formal),
);
assert.equal(merged['job:skill'].jobId, 'formal-job');
assert.equal(merged['job:skill'].netChangesByLevel['9'].selfStatSkillDelta, -10);
assert.equal(merged['job:skill'].netChangesByLevel['11'].selfStatSkillDelta, 15);
assert.equal(merged['job:skill'].maxReachableLevel, 12);
assert.notStrictEqual(merged['job:skill'], formal['job:skill']);
assert.deepEqual(fallback, fallbackBeforeMerge);
assert.deepEqual(formal, formalBeforeMerge);

function resolveWith({
  changesBySlot = {},
  skillContexts = {},
  artifactChangesByType = {},
  upgradeChangesBySlot = {},
  equipmentTuneChangesBySource = {},
  oathTuneChangesBySource = {},
  oathAcquisitionChangesBySource = {},
  equipmentBodyChangesBySlot = {},
  creatureChangesBySource = {},
  auraChangesBySource = {},
  titleChangesBySource = {},
  switchingCreatureChangesBySource = {},
  switchingTitleChangesBySource = {},
  switchingAvatarChangesBySlot = {},
  switchingPlatinumChangesBySlot = {},
  avatarEmblemChangesBySocket = {},
  scopeSimulator = {},
} = {}) {
  return calculation.resolveBufferNetChanges(
    changesBySlot,
    skillContexts,
    artifactChangesByType,
    upgradeChangesBySlot,
    equipmentTuneChangesBySource,
    oathTuneChangesBySource,
    oathAcquisitionChangesBySource,
    equipmentBodyChangesBySlot,
    creatureChangesBySource,
    auraChangesBySource,
    titleChangesBySource,
    switchingCreatureChangesBySource,
    switchingTitleChangesBySource,
    switchingAvatarChangesBySlot,
    switchingPlatinumChangesBySlot,
    avatarEmblemChangesBySocket,
    scopeSimulator,
  );
}

assert.throws(() => resolveWith({
  changesBySlot: {
    SLOT: {
      statDelta: Number.POSITIVE_INFINITY,
      baseSkillContributions: [],
      targetSkillContributions: [],
    },
  },
}), /Invalid buffer simulator change: statDelta/);
assert.throws(() => resolveWith({
  changesBySlot: {
    SLOT: {
      baseSkillContributions: 'invalid',
      targetSkillContributions: [],
    },
  },
}), /Invalid buffer skill contribution/);
assert.throws(() => resolveWith({
  changesBySlot: {
    SLOT: {
      baseSkillContributions: [],
      targetSkillContributions: [{ contextKey: 'job:skill', levelContribution: 3 }],
    },
  },
  skillContexts: formal,
}), /Unsupported buffer skill level: job:skill:13\//);
assert.throws(() => resolveWith({
  changesBySlot: {
    SLOT: {
      baseSkillContributions: [],
      targetSkillContributions: [{ contextKey: 'job:skill', levelContribution: 1 }],
    },
  },
  skillContexts: { 'job:skill': formal['job:skill'] },
}), /Unsupported buffer skill level/);
assert.throws(() => resolveWith({
  changesBySlot: {
    SLOT: {
      baseSkillContributions: [],
      targetSkillContributions: [{ contextKey: 'bad', levelContribution: 1 }],
    },
  },
  skillContexts: {
    bad: {
      currentLevel: 1,
      netChangesByLevel: {
        1: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
        2: { selfStatSkillDelta: Number.POSITIVE_INFINITY, auraStatDelta: 0, auraAttackDelta: 0 },
      },
    },
    'bad:switching': {
      currentLevel: 1,
      netChangesByLevel: {
        1: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
        2: { selfStatSkillDelta: 1, auraStatDelta: 0, auraAttackDelta: 0 },
      },
    },
  },
}), /Invalid buffer skill change: bad:selfStatSkillDelta/);

const scopedContexts = {
  'job:skill': {
    currentLevel: 10,
    netChangesByLevel: {
      10: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
      11: { selfStatSkillDelta: 15, auraStatDelta: 0, auraAttackDelta: 0 },
    },
  },
  'job:skill:switching': {
    currentLevel: 12,
    netChangesByLevel: {
      12: { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 },
      13: { selfStatSkillDelta: 17, auraStatDelta: 0, auraAttackDelta: 0 },
    },
  },
};
const scopeInput = {
  baseSkillContributions: [],
  targetSkillContributions: [{ contextKey: 'job:skill', levelContribution: 1 }],
};
const commonInput = { SLOT: clone(scopeInput) };
const commonBefore = clone(commonInput);
const commonResult = resolveWith({ changesBySlot: deepFreeze(commonInput), skillContexts: scopedContexts });
assert.equal(commonResult.selfStatSkillDelta, 15);
assert.equal(commonResult.currentStatDelta, 0);
assert.equal(commonResult.switchingStatDelta, 2);
assert.deepEqual(commonInput, commonBefore);

const currentResult = resolveWith({
  changesBySlot: {
    SLOT: { ...scopeInput, skillContributionScope: 'current' },
  },
  skillContexts: scopedContexts,
});
assert.equal(currentResult.selfStatSkillDelta, 0);
assert.equal(currentResult.currentStatDelta, 15);
assert.equal(currentResult.switchingStatDelta, 0);

const switchingResult = resolveWith({
  changesBySlot: {
    SLOT: { ...scopeInput, skillContributionScope: 'switching' },
  },
  skillContexts: scopedContexts,
});
assert.equal(switchingResult.selfStatSkillDelta, 0);
assert.equal(switchingResult.currentStatDelta, 0);
assert.equal(switchingResult.switchingStatDelta, 17);

const currentOnlyFallback = resolveWith({
  changesBySlot: {
    SLOT: { ...scopeInput, skillContributionScope: 'current' },
  },
  skillContexts: fallback,
});
assert.equal(currentOnlyFallback.currentStatDelta, 10);
assert.equal(currentOnlyFallback.switchingStatDelta, 0);

const directScopeChanges = {
  statDelta: 10,
  currentStatDelta: 2,
  switchingStatDelta: 4,
  selfStatSkillDelta: 3,
  switchingBuffAmplificationDelta: 5,
  buffSkillLevelDelta: 1,
};
function assertSharedProjection(result) {
  assert.equal(result.statDelta, 10);
  assert.equal(result.currentStatDelta, 2);
  assert.equal(result.switchingStatDelta, 4);
  assert.equal(result.selfStatSkillDelta, 3);
  assert.equal(result.switchingBuffAmplificationDelta, 5);
  assert.equal(result.buffSkillLevelDelta, 1);
}
function assertCurrentProjection(result) {
  assert.equal(result.statDelta, 0);
  assert.equal(result.currentStatDelta, 15);
  assert.equal(result.switchingStatDelta, 0);
  assert.equal(result.selfStatSkillDelta, 0);
  assert.equal(result.switchingBuffAmplificationDelta, 0);
  assert.equal(result.buffSkillLevelDelta, 0);
}
function resolveEquipmentScope(scopeSimulator, targetSlot = '허리') {
  return resolveWith({
    changesBySlot: { [targetSlot]: directScopeChanges },
    scopeSimulator,
  });
}
function resolveSourceScope(sourceType, scopeSimulator) {
  const key = `${sourceType}ChangesBySource`;
  return resolveWith({
    [key]: { [sourceType]: directScopeChanges },
    scopeSimulator,
  });
}

assertSharedProjection(resolveEquipmentScope({}));
assertCurrentProjection(resolveEquipmentScope({
  simulatedBuffLoadout: { equipment: { slotName: '벨트' } },
}));
assertSharedProjection(resolveEquipmentScope({
  simulatedBuffLoadout: { equipment: null },
}));
assertSharedProjection(resolveEquipmentScope({
  simulatedBuffLoadout: { equipment: 'malformed' },
}));
assertSharedProjection(resolveEquipmentScope({
  simulatedBuffLoadout: { equipment: {} },
}));

assertSharedProjection(resolveSourceScope('title', {}));
assertCurrentProjection(resolveSourceScope('title', {
  baseBaseline: { switchingTitleUsesCurrent: false },
}));
assertCurrentProjection(resolveSourceScope('title', {
  simulatedBuffLoadout: { equipment: { slotId: 'TITLE' } },
}));
assertCurrentProjection(resolveSourceScope('title', {
  simulatedBuffLoadout: { equipment: { slotName: '칭호' } },
}));
assertSharedProjection(resolveSourceScope('title', {
  simulatedBuffLoadout: { equipment: null },
}));
assertSharedProjection(resolveSourceScope('title', {
  simulatedBuffLoadout: { equipment: {} },
}));

assertSharedProjection(resolveSourceScope('creature', {}));
assertCurrentProjection(resolveSourceScope('creature', {
  simulatedBuffLoadout: { creature: {} },
}));
assertSharedProjection(resolveSourceScope('creature', {
  simulatedBuffLoadout: { creature: null },
}));
assertSharedProjection(resolveSourceScope('creature', {
  simulatedBuffLoadout: { creature: 'malformed' },
}));

assertSharedProjection(resolveSourceScope('aura', {}));
assertCurrentProjection(resolveSourceScope('aura', {
  simulatedBuffLoadout: { avatar: { slotId: 'AURORA', buffAvatarSource: 'actual' } },
}));
assertCurrentProjection(resolveSourceScope('aura', {
  simulatedBuffLoadout: {
    avatar: { slotId: 'AURORA', buffAvatarSource: 'simulatedPackage' },
  },
}));
assertSharedProjection(resolveSourceScope('aura', {
  simulatedBuffLoadout: { avatar: { slotId: 'AURORA', buffAvatarSource: 'wornFallback' } },
}));
assertSharedProjection(resolveSourceScope('aura', {
  simulatedBuffLoadout: { avatar: { slotId: 'AURORA', buffAvatarSource: 'malformed' } },
}));
assertSharedProjection(resolveSourceScope('aura', {
  simulatedBuffLoadout: { avatar: null },
}));

function createScopeSimulator() {
  return {
    marker: { preserve: true },
    baseBuffLoadout: {
      equipment: [
        { slotId: 'TITLE', slotName: '칭호', itemId: 'base-title' },
        { slotName: '허리', itemId: 'base-belt' },
      ],
      creature: { slotId: 'CREATURE', itemId: 'base-creature' },
      avatar: { slotId: 'JACKET', itemId: 'base-jacket', buffAvatarSource: 'actual' },
    },
    simulatedBuffLoadout: {
      equipment: [
        { slotId: 'TITLE', slotName: '칭호', itemId: 'sim-title' },
        { slotName: '허리', itemId: 'sim-belt' },
      ],
      creature: { slotId: 'CREATURE', itemId: 'sim-creature' },
      avatar: { slotId: 'JACKET', itemId: 'sim-jacket', buffAvatarSource: 'simulatedPackage' },
    },
  };
}

const noOpSimulator = createScopeSimulator();
assert.strictEqual(
  calculation.getBufferRecommendationScopeSimulator(noOpSimulator, { sourceType: 'other' }, false),
  noOpSimulator,
);
assert.strictEqual(
  calculation.getBufferRecommendationScopeSimulator(noOpSimulator, {
    sourceType: 'avatar',
    kind: 'switchingPlatinumEmblem',
    targetSlotId: 'JACKET',
  }, true),
  noOpSimulator,
);

function assertScopeSimulation(row, inspectReference, inspectCandidate) {
  const simulator = createScopeSimulator();
  const before = clone(simulator);
  const reference = calculation.getBufferRecommendationScopeSimulator(
    deepFreeze(simulator),
    deepFreeze(row),
    false,
  );
  const candidate = calculation.getBufferRecommendationScopeSimulator(
    deepFreeze(simulator),
    deepFreeze(row),
    true,
  );
  assert.notStrictEqual(reference, simulator);
  assert.notStrictEqual(candidate, simulator);
  assert.notStrictEqual(reference.simulatedBuffLoadout, simulator.simulatedBuffLoadout);
  assert.notStrictEqual(candidate.simulatedBuffLoadout, simulator.simulatedBuffLoadout);
  assert.strictEqual(reference.marker, simulator.marker);
  assert.strictEqual(candidate.marker, simulator.marker);
  inspectReference(reference);
  inspectCandidate(candidate);
  assert.deepEqual(simulator, before);
}

assertScopeSimulation({
  sourceType: 'switchingTitle',
  targetBuffChanges: { equipment: { itemId: 'target-title', custom: true } },
}, (reference) => {
  const title = getBuffLoadoutRowsForMetric(reference.simulatedBuffLoadout.equipment)
    .find((row) => row.slotId === 'TITLE');
  assert.equal(title.itemId, 'base-title');
}, (candidate) => {
  const title = getBuffLoadoutRowsForMetric(candidate.simulatedBuffLoadout.equipment)
    .find((row) => row.slotId === 'TITLE');
  assert.deepEqual(title, {
    itemId: 'target-title',
    custom: true,
    slotId: 'TITLE',
    slotName: '칭호',
  });
});

assertScopeSimulation({
  sourceType: 'switchingCreature',
  targetBuffChanges: { creature: { itemId: 'target-creature', custom: true } },
}, (reference) => {
  assert.deepEqual(reference.simulatedBuffLoadout.creature, {
    slotId: 'CREATURE',
    itemId: 'base-creature',
  });
}, (candidate) => {
  assert.deepEqual(candidate.simulatedBuffLoadout.creature, [{
    itemId: 'target-creature',
    custom: true,
    slotId: 'CREATURE',
  }]);
});

assertScopeSimulation({
  sourceType: 'switchingFragment',
  targetBuffSlot: '벨트',
  targetBuffChanges: { equipment: { itemId: 'target-belt', custom: true } },
}, (reference) => {
  const belt = getBuffLoadoutRowsForMetric(reference.simulatedBuffLoadout.equipment)
    .find((row) => row.slotName === '허리');
  assert.equal(belt.itemId, 'base-belt');
}, (candidate) => {
  const belt = getBuffLoadoutRowsForMetric(candidate.simulatedBuffLoadout.equipment)
    .find((row) => row.slotName === '허리');
  assert.deepEqual(belt, { itemId: 'target-belt', custom: true, slotName: '허리' });
});

assertScopeSimulation({
  sourceType: 'avatar',
  kind: 'switchingAvatar',
  targetSlotId: 'JACKET',
  targetBuffChanges: { avatar: { itemId: 'target-jacket', custom: true } },
}, (reference) => {
  assert.deepEqual(reference.simulatedBuffLoadout.avatar, [{
    slotId: 'JACKET',
    itemId: 'base-jacket',
    buffAvatarSource: 'actual',
  }]);
}, (candidate) => {
  assert.deepEqual(candidate.simulatedBuffLoadout.avatar, [{
    itemId: 'target-jacket',
    custom: true,
    slotId: 'JACKET',
    buffAvatarSource: 'simulatedPackage',
  }]);
});

const packageAndPlatinum = resolveWith({
  switchingAvatarChangesBySlot: {
    JACKET: {
      buffSkillLevelDelta: 1,
      targetPlatinumSkillLevel: 1,
    },
  },
  switchingPlatinumChangesBySlot: {
    JACKET: {
      buffSkillLevelDelta: 999,
      targetPlatinumSkillLevel: 3,
    },
  },
});
assert.equal(packageAndPlatinum.buffSkillLevelDelta, 3);

const platinumOnly = resolveWith({
  switchingPlatinumChangesBySlot: {
    JACKET: {
      buffSkillLevelDelta: 2,
      targetPlatinumSkillLevel: 3,
    },
  },
});
assert.equal(platinumOnly.buffSkillLevelDelta, 2);

assert.throws(() => resolveWith({
  switchingAvatarChangesBySlot: {
    JACKET: { targetPlatinumSkillLevel: 1 },
  },
  switchingPlatinumChangesBySlot: {
    JACKET: { targetPlatinumSkillLevel: Number.NaN },
  },
}), /Invalid switching platinum contribution: JACKET/);
assert.throws(() => resolveWith({
  switchingAvatarChangesBySlot: {
    JACKET: { targetPlatinumSkillLevel: Number.NaN },
  },
  switchingPlatinumChangesBySlot: {
    JACKET: { targetPlatinumSkillLevel: 2 },
  },
}), /Invalid switching platinum contribution: JACKET/);

const emblemBaseline = { statName: '지능' };
function createEmblemRow(bufferStatScope = 'common') {
  return {
    sourceType: 'avatar',
    kind: 'brilliantEmblem',
    targetSlotId: 'JACKET',
    targetBuffSlot: 'JACKET',
    bufferStatScope,
    socketChanges: [
      {
        socketIndex: 0,
        currentEmblem: { itemId: 'current-0', effects: { int: 10 } },
        targetEmblem: { itemId: 'target-0', effects: { int: 25 } },
      },
      {
        socketIndex: 1,
        currentEmblem: { itemId: 'current-1', effects: { allStat: 8 } },
        targetEmblem: { itemId: 'target-1', effects: { allStat: 20 } },
      },
    ],
  };
}

const regularRow = createEmblemRow('common');
const regularBefore = clone(regularRow);
assert.deepEqual(calculation.getBufferAvatarEmblemChangesBySocket(
  deepFreeze(regularRow),
  deepFreeze(emblemBaseline),
), {
  'JACKET:0': { statDelta: 15 },
  'JACKET:1': { statDelta: 12 },
});
assert.deepEqual(regularRow, regularBefore);
assert.deepEqual(calculation.getBufferAvatarEmblemChangesBySocket(
  createEmblemRow('current'),
  emblemBaseline,
), {
  'JACKET:0': { currentStatDelta: 15 },
  'JACKET:1': { currentStatDelta: 12 },
});
assert.deepEqual(calculation.getBufferAvatarEmblemChangesBySocket(
  createEmblemRow('switching'),
  emblemBaseline,
), {
  'JACKET:0': { switchingStatDelta: 15 },
  'JACKET:1': { switchingStatDelta: 12 },
});
assert.equal(calculation.getBufferAvatarEmblemChangesBySocket({
  ...createEmblemRow(),
  socketChanges: [{ socketIndex: 2, targetEmblem: {} }],
}, emblemBaseline), null);
assert.equal(calculation.getBufferAvatarEmblemChangesBySocket({
  sourceType: 'avatar',
  kind: 'platinumEmblem',
}, emblemBaseline), null);

const switchingEmblemRow = createEmblemRow('switching');
const overlays = calculation.getBufferSwitchingAvatarEmblemOverlays(
  deepFreeze(switchingEmblemRow),
);
assert.deepEqual(overlays, {
  'JACKET:0': {
    slotId: 'JACKET',
    socketIndex: 0,
    baseEmblem: { itemId: 'current-0', effects: { int: 10 } },
    targetEmblem: { itemId: 'target-0', effects: { int: 25 } },
  },
  'JACKET:1': {
    slotId: 'JACKET',
    socketIndex: 1,
    baseEmblem: { itemId: 'current-1', effects: { allStat: 8 } },
    targetEmblem: { itemId: 'target-1', effects: { allStat: 20 } },
  },
});
assert.notStrictEqual(overlays['JACKET:0'].baseEmblem, switchingEmblemRow.socketChanges[0].currentEmblem);
assert.notStrictEqual(overlays['JACKET:0'].targetEmblem, switchingEmblemRow.socketChanges[0].targetEmblem);
assert.equal(calculation.getBufferSwitchingAvatarEmblemOverlays(createEmblemRow('common')), null);
assert.equal(calculation.getBufferSwitchingAvatarEmblemOverlays({
  ...createEmblemRow('switching'),
  socketChanges: [{ socketIndex: -1, targetEmblem: {} }],
}), null);

const overlayBefore = clone(overlays);
const packageChanges = {
  JACKET: {
    regularEmblems: [
      { itemId: 'package-0', effects: { int: 5 } },
      { itemId: 'package-1', effects: { allStat: 4 } },
    ],
  },
};
const packageBefore = clone(packageChanges);
assert.deepEqual(calculation.resolveBufferSwitchingAvatarEmblemChanges(
  {},
  deepFreeze(overlays),
  emblemBaseline,
  deepFreeze(packageChanges),
), {
  'JACKET:0': { switchingStatDelta: 20 },
  'JACKET:1': { switchingStatDelta: 16 },
});
assert.deepEqual(overlays, overlayBefore);
assert.deepEqual(packageChanges, packageBefore);
assert.deepEqual(calculation.resolveBufferSwitchingAvatarEmblemChanges(
  {},
  overlays,
  emblemBaseline,
  {},
), {
  'JACKET:0': { switchingStatDelta: 15 },
  'JACKET:1': { switchingStatDelta: 12 },
});
assert.equal(calculation.resolveBufferSwitchingAvatarEmblemChanges(
  {},
  overlays,
  emblemBaseline,
  { JACKET: {} },
), null);

const defaultOverlaySimulator = {
  baseBaseline: emblemBaseline,
  switchingAvatarEmblemOverlaysBySocket: overlays,
  switchingAvatarChangesBySlot: packageChanges,
};
assert.deepEqual(calculation.resolveBufferSwitchingAvatarEmblemChanges(
  defaultOverlaySimulator,
), {
  'JACKET:0': { switchingStatDelta: 20 },
  'JACKET:1': { switchingStatDelta: 16 },
});

const regularChanges = {
  'JACKET:0': { statDelta: 7, switchingStatDelta: 999 },
  'PANTS:0': { currentStatDelta: 3 },
};
const regularChangesBefore = clone(regularChanges);
const combinedEmblemChanges = calculation.getBufferAvatarEmblemNetChanges(
  {
    baseBaseline: emblemBaseline,
  },
  deepFreeze(regularChanges),
  deepFreeze({ 'JACKET:0': overlays['JACKET:0'] }),
  deepFreeze(packageChanges),
);
assert.deepEqual(combinedEmblemChanges, {
  'JACKET:0': { statDelta: 7, switchingStatDelta: 20 },
  'PANTS:0': { currentStatDelta: 3 },
});
assert.deepEqual(regularChanges, regularChangesBefore);
assert.throws(() => calculation.getBufferAvatarEmblemNetChanges(
  { baseBaseline: emblemBaseline },
  {},
  overlays,
  { JACKET: {} },
), /Unsupported switching avatar emblem underlay/);

const mergedMapInput = {
  first: { statDelta: 3, currentStatDelta: 2, ignored: 100 },
  second: { statDelta: 4, switchingStatDelta: -1 },
};
const mergedMapBefore = clone(mergedMapInput);
const mergedMap = calculation.mergeBufferChangeMap(deepFreeze(mergedMapInput));
assert.deepEqual(mergedMap, {
  statDelta: 7,
  currentStatDelta: 2,
  switchingStatDelta: -1,
  selfStatSkillDelta: 0,
  buffPowerDelta: 0,
  currentBuffAmplificationDelta: 0,
  switchingBuffAmplificationDelta: 0,
  buffSkillLevelDelta: 0,
  awakeningSkillLevelDelta: 0,
  auraStatDelta: 0,
  auraAttackDelta: 0,
});
assert.deepEqual(mergedMapInput, mergedMapBefore);

const platinumBaseline = {
  currentSelfStatSkills: {
    currentPassive: {
      contextKey: 'context:current',
      jobId: 'job-current',
      skillId: 'skill-current',
    },
    targetPassive: {
      contextKey: 'context:target',
      jobId: 'job-target',
      skillId: 'skill-target',
    },
  },
};
const platinumContextRow = {
  sourceType: 'avatar',
  kind: 'platinumEmblem',
  currentPlatinumSkill: 'currentPassive',
  targetSkill: 'targetPassive',
  bufferStatScope: 'current',
  effects: { bufferStat: 50 },
  bufferBuffSkillLevelDelta: 1,
  bufferAwakeningSkillLevelDelta: -1,
};
assert.deepEqual(calculation.getBufferAvatarPlatinumBaseRelativeChanges(
  platinumContextRow,
  platinumBaseline,
), {
  currentStatDelta: 0,
  buffSkillLevelDelta: 1,
  awakeningSkillLevelDelta: -1,
  baseSkillContributions: [{
    contextKey: 'context:current',
    jobId: 'job-current',
    skillId: 'skill-current',
    skillName: 'currentPassive',
    levelContribution: 1,
  }],
  targetSkillContributions: [{
    contextKey: 'context:target',
    jobId: 'job-target',
    skillId: 'skill-target',
    skillName: 'targetPassive',
    levelContribution: 1,
  }],
  skillContributionScope: 'current',
});
assert.deepEqual(calculation.getBufferAvatarPlatinumBaseRelativeChanges({
  sourceType: 'avatar',
  kind: 'platinumEmblem',
  currentPlatinumSkill: 'unknown',
  targetSkill: 'unknown',
  effects: { bufferStat: 42 },
  bufferBuffSkillLevelDelta: 0,
  bufferAwakeningSkillLevelDelta: 0,
}, platinumBaseline), {
  statDelta: 42,
  buffSkillLevelDelta: 0,
  awakeningSkillLevelDelta: 0,
  baseSkillContributions: [],
  targetSkillContributions: [],
  skillContributionScope: 'common',
});
assert.equal(calculation.getBufferAvatarPlatinumBaseRelativeChanges({
  sourceType: 'avatar',
  kind: 'platinumEmblem',
  effects: { bufferStat: Number.POSITIVE_INFINITY },
}, {}), null);
assert.equal(calculation.getBufferAvatarPlatinumBaseRelativeChanges({
  sourceType: 'avatar',
  kind: 'brilliantEmblem',
}, {}), null);

const avatarNetSimulator = {
  baseBaseline: emblemBaseline,
  avatarEmblemChangesBySocket: {
    JACKET: { statDelta: 1 },
  },
  switchingAvatarEmblemOverlaysBySocket: {},
  switchingAvatarChangesBySlot: {},
  avatarPlatinumChangesBySlot: {
    JACKET: { statDelta: 9, buffSkillLevelDelta: 1 },
  },
};
const avatarNetBefore = clone(avatarNetSimulator);
assert.deepEqual(calculation.getBufferAvatarNetChanges(deepFreeze(avatarNetSimulator)), {
  JACKET: { statDelta: 9, buffSkillLevelDelta: 1 },
});
assert.deepEqual(avatarNetSimulator, avatarNetBefore);

console.log('enchant buffer simulator calculation: ok');
