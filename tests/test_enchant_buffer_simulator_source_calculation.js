import assert from 'node:assert/strict';
import * as sourceCalculationModule from '../src/dnfHellTool/enchantBufferSimulatorSourceCalculation.js';

const { createEnchantBufferSimulatorSourceCalculation } = sourceCalculationModule;

const PUBLIC_FUNCTIONS = [
  'getBufferEnchantBaseRelativeChanges',
  'getBufferCreatureArtifactBaseRelativeChanges',
  'getBufferEquipmentBodyBaseRelativeChanges',
  'getBufferCreatureBaseRelativeChanges',
  'getBufferAuraBaseRelativeChanges',
  'getBufferTitleBaseRelativeChanges',
  'getBufferSwitchingCreatureBaseRelativeChanges',
  'getBufferSwitchingTitleBaseRelativeChanges',
  'getBufferSwitchingAvatarBaseRelativeChanges',
  'getBufferSwitchingPlatinumBaseRelativeChanges',
  'getBufferUpgradeBaseRelativeChanges',
];

const DEPENDENCY_NAMES = [
  'getReinforceSkillLevel',
  'getBufferSkillContributionMap',
  'getRoleRelevantEffects',
  'getBufferSelectedStatEffect',
  'getCreatureArtifactType',
  'getItemSkillLevelBonus',
  'buildSimulatedTitleTarget',
  'getEquipmentProgressionType',
  'getEquipmentProgressionMode',
  'getCumulativeUpgradeEffectsForEquipment',
  'resolveCanonicalEquipmentSlotId',
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

function getBufferSkillContributionMap(contributions = []) {
  if (!Array.isArray(contributions)) return null;
  const result = {};
  for (const contribution of contributions) {
    const contextKey = String(contribution?.contextKey || '').trim();
    const levelContribution = Number(contribution?.levelContribution);
    if (!contextKey || !Number.isFinite(levelContribution)) return null;
    result[contextKey] = Number(result[contextKey] || 0) + levelContribution;
  }
  return result;
}

function getRoleRelevantEffects(effects = {}, isBuffer = false) {
  assert.equal(isBuffer, true);
  return { ...(effects || {}) };
}

function getBufferSelectedStatEffect(effects = {}, baseline = {}) {
  if (Number.isFinite(effects?.allStat)) return Number(effects.allStat || 0);
  const key = { 힘: 'str', 지능: 'int', 체력: 'vit', 정신력: 'spr' }[baseline?.statName];
  return key ? Number(effects?.[key] || 0) : 0;
}

function getCreatureArtifactType(row = {}) {
  const value = String(row.artifactType || row.slotColor || '').trim().toUpperCase();
  return ['RED', 'BLUE', 'GREEN'].includes(value) ? value : '';
}

function resolveCanonicalEquipmentSlotId(row = {}) {
  const slotId = String(row?.slotId || '').trim();
  if (slotId) return slotId;
  return {
    목걸이: 'AMULET',
    팔찌: 'WRIST',
    반지: 'RING',
    마법석: 'MAGIC_STON',
  }[String(row?.slotName || row?.slot || '').trim()] || '';
}

function getItemSkillLevelBonus(item = {}, baseline = {}, skillName = '', requiredLevel = 0) {
  return Number(item?._skillBonuses?.[`${skillName}:${requiredLevel}`] || 0);
}

const titleBuildCalls = [];
function buildSimulatedTitleTarget(row = {}) {
  titleBuildCalls.push(row);
  return {
    ...clone(row),
    itemName: row.titleItemName || row.itemName || '',
    effects: clone(row.titlePackageEffects || row.effects || {}),
  };
}

function getEquipmentProgressionType(row = {}) {
  return row.progressionType || '';
}

function getEquipmentProgressionMode(equipment = {}) {
  return equipment.mode || '';
}

const cumulativeUpgradeCalls = [];
function getCumulativeUpgradeEffectsForEquipment(...args) {
  cumulativeUpgradeCalls.push(args);
  const [equipment, level, mode] = args;
  if (equipment?.effectByCall?.[`${level}:${mode}`]) {
    return clone(equipment.effectByCall[`${level}:${mode}`]);
  }
  return { allStat: Number(level || 0) };
}

const dependencyReads = [];
const dependencies = new Proxy({
  getReinforceSkillLevel,
  getBufferSkillContributionMap,
  getRoleRelevantEffects,
  getBufferSelectedStatEffect,
  getCreatureArtifactType,
  getItemSkillLevelBonus,
  buildSimulatedTitleTarget,
  getEquipmentProgressionType,
  getEquipmentProgressionMode,
  getCumulativeUpgradeEffectsForEquipment,
  resolveCanonicalEquipmentSlotId,
}, {
  get(target, property, receiver) {
    dependencyReads.push(property);
    return Reflect.get(target, property, receiver);
  },
});

const calculation = createEnchantBufferSimulatorSourceCalculation(dependencies);

assert.deepEqual(Object.keys(sourceCalculationModule), ['createEnchantBufferSimulatorSourceCalculation']);
assert.deepEqual(dependencyReads, DEPENDENCY_NAMES);
assert.deepEqual(Object.keys(calculation), PUBLIC_FUNCTIONS);
assert.equal('getAuthoritativeItemSkillLevelBonus' in calculation, false);
assert.equal('getBufferItemSkillContributions' in calculation, false);
assert.equal('getBufferEquippedItemBaseRelativeChanges' in calculation, false);

const enchantBaseline = {
  jobName: '버퍼',
  statName: '지능',
  bufferSkillContexts: {
    'ctx:buff': {},
    'ctx:passive': {},
  },
};
const baseEnchant = {
  effects: { int: 10 },
  reinforceSkill: [],
  bufferSkillContributions: [{ contextKey: 'ctx:buff', levelContribution: 1 }],
};
const enchantRow = {
  sourceType: 'enchant',
  role: 'buffer',
  effects: { int: 35 },
  reinforceSkill: [],
  bufferSkillContributions: [
    { contextKey: 'ctx:buff', levelContribution: 2 },
    { contextKey: 'ctx:passive', levelContribution: 1 },
  ],
};
const enchantBefore = clone(enchantRow);
const baseEnchantBefore = clone(baseEnchant);
const enchantBaselineBefore = clone(enchantBaseline);
assert.deepEqual(calculation.getBufferEnchantBaseRelativeChanges(
  deepFreeze(enchantRow),
  deepFreeze(baseEnchant),
  deepFreeze(enchantBaseline),
), {
  statDelta: 25,
  baseSkillContributions: [{ contextKey: 'ctx:buff', levelContribution: 1 }],
  targetSkillContributions: [
    { contextKey: 'ctx:buff', levelContribution: 2 },
    { contextKey: 'ctx:passive', levelContribution: 1 },
  ],
});
assert.deepEqual(enchantRow, enchantBefore);
assert.deepEqual(baseEnchant, baseEnchantBefore);
assert.deepEqual(enchantBaseline, enchantBaselineBefore);
assert.equal(calculation.getBufferEnchantBaseRelativeChanges({ ...enchantRow, role: 'dealer' }, baseEnchant, enchantBaseline), null);
assert.equal(calculation.getBufferEnchantBaseRelativeChanges({ ...enchantRow, sourceType: 'title' }, baseEnchant, enchantBaseline), null);
assert.equal(calculation.getBufferEnchantBaseRelativeChanges({
  ...enchantRow,
  reinforceSkill: [{ jobName: '버퍼', skills: [{ name: 'buff', value: 1 }] }],
  bufferSkillContributions: undefined,
}, baseEnchant, enchantBaseline), null);
assert.equal(calculation.getBufferEnchantBaseRelativeChanges(enchantRow, {
  ...baseEnchant,
  reinforceSkill: [{ jobName: '버퍼', skills: [{ name: 'buff', value: 1 }] }],
  bufferSkillContributions: undefined,
}, enchantBaseline), null);
assert.equal(calculation.getBufferEnchantBaseRelativeChanges({
  ...enchantRow,
  bufferSkillContributions: [{ contextKey: 'ctx:missing', levelContribution: 1 }],
}, baseEnchant, enchantBaseline), null);
assert.equal(calculation.getBufferEnchantBaseRelativeChanges({
  ...enchantRow,
  effects: { int: 35, buffPower: 1 },
}, baseEnchant, enchantBaseline), null);
assert.equal(calculation.getBufferEnchantBaseRelativeChanges({
  ...enchantRow,
  effects: { int: Number.POSITIVE_INFINITY },
}, baseEnchant, enchantBaseline), null);

const artifactRow = {
  sourceType: 'creatureArtifact',
  slotColor: 'red',
  effects: { allStat: 30, buffPower: 50, buffAmplification: 4 },
};
const artifactBase = { effects: { allStat: 10, buffPower: 20, buffAmplification: 1 } };
assert.deepEqual(calculation.getBufferCreatureArtifactBaseRelativeChanges(
  deepFreeze(artifactRow),
  deepFreeze(artifactBase),
), {
  statDelta: 20,
  buffPowerDelta: 30,
  currentBuffAmplificationDelta: 3,
  switchingBuffAmplificationDelta: 3,
});
assert.equal(calculation.getBufferCreatureArtifactBaseRelativeChanges({ ...artifactRow, slotColor: 'invalid' }, artifactBase), null);
assert.equal(calculation.getBufferCreatureArtifactBaseRelativeChanges({ ...artifactRow, effects: { attack: 1 } }, artifactBase), null);

const bodyReplacementBaseline = {
  statName: '지능',
  buffSkillName: '버프',
  awakeningSkillName: '각성',
  currentSelfStatSkills: {},
};
const blackFangRow = {
  sourceType: 'blackFang',
  currentEquipmentBody: {
    slotId: 'AMULET',
    itemId: 'current-necklace',
    effects: { allStat: 4, buffPower: 10, buffAmplification: 1 },
  },
  targetEquipmentBody: {
    slotId: 'AMULET',
    itemId: 'target-necklace',
    effects: { allStat: 14, buffPower: 35, buffAmplification: 2.5 },
  },
};
assert.deepEqual(calculation.getBufferEquipmentBodyBaseRelativeChanges(
  deepFreeze(blackFangRow),
  deepFreeze(bodyReplacementBaseline),
), {
  statDelta: 10,
  buffPowerDelta: 25,
  currentBuffAmplificationDelta: 1.5,
  switchingBuffAmplificationDelta: 1.5,
  buffSkillLevelDelta: 0,
  awakeningSkillLevelDelta: 0,
  baseSkillContributions: [],
  targetSkillContributions: [],
});
const perfumeRow = {
  sourceType: 'relicCraft',
  equipmentTuneBuffPowerDelta: 0,
  currentEquipmentBody: {
    slotId: 'MAGIC_STON',
    itemId: 'current-magic-stone',
    effects: { buffPower: 11220, finalDamage: 25 },
    _skillBonuses: { '버프:30': 1, '각성:50': 2 },
  },
  targetEquipmentBody: {
    slotId: 'MAGIC_STON',
    itemId: 'df77236c51ea1274a3deb79c3e470695',
    effects: { buffPower: 17580, finalDamage: 70.67376612 },
    _skillBonuses: { '버프:30': 1, '각성:50': 2 },
  },
};
const bufferBodyCalculation = createEnchantBufferSimulatorSourceCalculation({
  getReinforceSkillLevel,
  getBufferSkillContributionMap,
  getRoleRelevantEffects: (effects = {}) => Object.fromEntries(
    Object.entries(effects).filter(([key]) => ![
      'finalDamage', 'skillDamageMultiplier', 'attackIncrease', 'attackAmplification',
      'attack', 'elementAll', 'critical',
    ].includes(key)),
  ),
  getBufferSelectedStatEffect,
  getCreatureArtifactType,
  getItemSkillLevelBonus,
  buildSimulatedTitleTarget,
  getEquipmentProgressionType,
  getEquipmentProgressionMode,
  getCumulativeUpgradeEffectsForEquipment,
  resolveCanonicalEquipmentSlotId,
});
assert.deepEqual(bufferBodyCalculation.getBufferEquipmentBodyBaseRelativeChanges(
  deepFreeze(perfumeRow),
  deepFreeze(bodyReplacementBaseline),
), {
  statDelta: 0,
  buffPowerDelta: 6360,
  currentBuffAmplificationDelta: 0,
  switchingBuffAmplificationDelta: 0,
  buffSkillLevelDelta: 0,
  awakeningSkillLevelDelta: 0,
  baseSkillContributions: [],
  targetSkillContributions: [],
});
assert.equal(
  calculation.getBufferEquipmentBodyBaseRelativeChanges({
    ...blackFangRow,
    targetEquipmentBody: { ...blackFangRow.targetEquipmentBody, slotId: 'RING' },
  }, bodyReplacementBaseline),
  null,
);
assert.equal(calculation.getBufferEquipmentBodyBaseRelativeChanges({ ...blackFangRow, sourceType: 'upgrade' }, bodyReplacementBaseline), null);
assert.equal(calculation.getBufferEquipmentBodyBaseRelativeChanges({
  ...blackFangRow,
  targetEquipmentBody: {
    ...blackFangRow.targetEquipmentBody,
    effects: { buffPower: 35, attack: 1 },
  },
}, bodyReplacementBaseline), null);

const equippedBaseline = {
  jobName: '버퍼',
  statName: '지능',
  buffSkillName: '버프',
  awakeningSkillName: '각성',
  currentSelfStatSkills: {
    패시브: { contextKey: 'ctx:passive', requiredLevel: 20 },
    오라: { contextKey: 'ctx:aura', requiredLevel: 30 },
    무시: { contextKey: '', requiredLevel: 10 },
  },
};
const baseEquipped = {
  effects: { allStat: 5, buffPower: 10, buffAmplification: 1 },
  _skillBonuses: { '버프:30': 1, '각성:50': 0 },
  itemReinforceSkill: [{
    jobName: '버퍼',
    skills: [{ name: '패시브', value: 1 }],
    levelRange: [{ minLevel: 30, maxLevel: 30, value: 1 }],
  }],
};
const targetEquipped = {
  effects: { allStat: 17, buffPower: 25, buffAmplification: 3 },
  _skillBonuses: { '버프:30': 3, '각성:50': 1 },
  itemReinforceSkill: [{
    jobName: '버퍼',
    skills: [{ name: '패시브', value: 2 }],
    levelRange: [{ minLevel: 30, maxLevel: 30, value: 2 }],
  }],
  reinforceSkill: [{
    jobName: '공통',
    skills: [{ name: '패시브', value: 1 }],
  }],
  enchant: {
    reinforceSkill: [{
      jobName: '버퍼',
      skills: [{ name: '오라', value: 1 }],
    }],
  },
  itemBuff: {
    reinforceSkill: [{
      jobName: '버퍼',
      levelRange: [{ minLevel: 20, maxLevel: 30, value: 1 }],
    }],
  },
};
const expectedEquippedChanges = {
  statDelta: 12,
  buffPowerDelta: 15,
  currentBuffAmplificationDelta: 2,
  switchingBuffAmplificationDelta: 2,
  buffSkillLevelDelta: 2,
  awakeningSkillLevelDelta: 1,
  baseSkillContributions: [
    { contextKey: 'ctx:passive', levelContribution: 1 },
    { contextKey: 'ctx:aura', levelContribution: 1 },
  ],
  targetSkillContributions: [
    { contextKey: 'ctx:passive', levelContribution: 4 },
    { contextKey: 'ctx:aura', levelContribution: 4 },
  ],
};
for (const [functionName, sourceType] of [
  ['getBufferCreatureBaseRelativeChanges', 'creature'],
  ['getBufferAuraBaseRelativeChanges', 'aura'],
]) {
  const row = { ...clone(targetEquipped), sourceType };
  const rowBefore = clone(row);
  const baseBefore = clone(baseEquipped);
  assert.deepEqual(calculation[functionName](
    deepFreeze(row),
    deepFreeze(baseEquipped),
    deepFreeze(equippedBaseline),
  ), expectedEquippedChanges);
  assert.deepEqual(row, rowBefore);
  assert.deepEqual(baseEquipped, baseBefore);
}
assert.equal(calculation.getBufferCreatureBaseRelativeChanges({ ...targetEquipped, sourceType: 'aura' }, baseEquipped, equippedBaseline), null);
assert.equal(calculation.getBufferAuraBaseRelativeChanges({ ...targetEquipped, sourceType: 'aura', effects: { attack: 1 } }, baseEquipped, equippedBaseline), null);

const titleRow = {
  ...clone(targetEquipped),
  sourceType: 'title',
  effects: { allStat: 999 },
  titlePackageEffects: clone(targetEquipped.effects),
  titleItemName: 'target title',
};
const titleRowBefore = clone(titleRow);
const titleCallsBefore = titleBuildCalls.length;
assert.deepEqual(calculation.getBufferTitleBaseRelativeChanges(
  deepFreeze(titleRow),
  deepFreeze(baseEquipped),
  deepFreeze(equippedBaseline),
), expectedEquippedChanges);
assert.equal(titleBuildCalls.length, titleCallsBefore + 1);
assert.strictEqual(titleBuildCalls.at(-1), titleRow);
assert.deepEqual(titleRow, titleRowBefore);
assert.equal(calculation.getBufferTitleBaseRelativeChanges({ ...titleRow, sourceType: 'aura' }, baseEquipped, equippedBaseline), null);

const exactContributions = [{ contextKey: 'ctx:exact', levelContribution: 1 }];
const exactSwitchingCreature = {
  sourceType: 'switchingCreature',
  hasExactSkillContributions: true,
  switchingDirectStatDelta: 44,
  switchingStatDelta: 999,
  switchingBuffAmplificationDelta: 3,
  bufferBuffSkillLevelDelta: 2,
  auraStatDelta: 5,
  auraAttackDelta: 7,
  baseSkillContributions: [],
  targetSkillContributions: exactContributions,
};
assert.deepEqual(calculation.getBufferSwitchingCreatureBaseRelativeChanges(
  deepFreeze(exactSwitchingCreature),
), {
  switchingStatDelta: 44,
  switchingBuffAmplificationDelta: 3,
  buffSkillLevelDelta: 2,
  auraStatDelta: 5,
  auraAttackDelta: 7,
  baseSkillContributions: [],
  targetSkillContributions: exactContributions,
  skillContributionScope: 'switching',
});
const legacySwitchingTitle = {
  sourceType: 'switchingTitle',
  switchingStatDelta: 18,
  switchingDirectStatDelta: 999,
  switchingBuffAmplificationDelta: 1,
  bufferBuffSkillLevelDelta: 1,
  auraStatDelta: 2,
  auraAttackDelta: 3,
};
assert.deepEqual(calculation.getBufferSwitchingTitleBaseRelativeChanges(
  deepFreeze(legacySwitchingTitle),
), {
  switchingStatDelta: 18,
  switchingBuffAmplificationDelta: 1,
  buffSkillLevelDelta: 1,
  auraStatDelta: 2,
  auraAttackDelta: 3,
  baseSkillContributions: [],
  targetSkillContributions: [],
  skillContributionScope: 'common',
});
const exactSwitchingAvatar = {
  sourceType: 'avatar',
  kind: 'switchingAvatar',
  hasExactSkillContributions: true,
  bufferSimulatorChanges: {
    switchingDirectStatDelta: 31,
    switchingStatDelta: 999,
    buffSkillLevelDelta: 2,
  },
  targetBuffChanges: {
    avatar: { buffContribution: { platinumSkillLevel: 3 } },
  },
  baseSkillContributions: [],
  targetSkillContributions: exactContributions,
  skillContributionScope: 'current',
};
assert.deepEqual(calculation.getBufferSwitchingAvatarBaseRelativeChanges(
  deepFreeze(exactSwitchingAvatar),
), {
  switchingStatDelta: 31,
  buffSkillLevelDelta: 2,
  targetPlatinumSkillLevel: 3,
  baseSkillContributions: [],
  targetSkillContributions: exactContributions,
  skillContributionScope: 'current',
});
const legacySwitchingPlatinum = {
  sourceType: 'avatar',
  kind: 'switchingPlatinumEmblem',
  bufferSimulatorChanges: {
    switchingStatDelta: 12,
    switchingDirectStatDelta: 999,
    buffSkillLevelDelta: 1,
  },
  targetBuffChanges: { platinumEmblem: { skillLevel: 2 } },
};
assert.deepEqual(calculation.getBufferSwitchingPlatinumBaseRelativeChanges(
  deepFreeze(legacySwitchingPlatinum),
), {
  switchingStatDelta: 12,
  buffSkillLevelDelta: 1,
  targetPlatinumSkillLevel: 2,
  baseSkillContributions: [],
  targetSkillContributions: [],
  skillContributionScope: 'common',
});
assert.equal(calculation.getBufferSwitchingCreatureBaseRelativeChanges({ sourceType: 'creature' }), null);
assert.equal(calculation.getBufferSwitchingTitleBaseRelativeChanges({ sourceType: 'title' }), null);
assert.equal(calculation.getBufferSwitchingAvatarBaseRelativeChanges({ sourceType: 'avatar', kind: 'platinumEmblem' }), null);
assert.equal(calculation.getBufferSwitchingPlatinumBaseRelativeChanges({ sourceType: 'avatar', kind: 'switchingAvatar' }), null);
assert.equal(calculation.getBufferSwitchingCreatureBaseRelativeChanges({
  ...exactSwitchingCreature,
  switchingDirectStatDelta: Number.POSITIVE_INFINITY,
}), null);
assert.equal(calculation.getBufferSwitchingTitleBaseRelativeChanges({
  ...legacySwitchingTitle,
  auraAttackDelta: Number.POSITIVE_INFINITY,
}), null);
assert.equal(calculation.getBufferSwitchingAvatarBaseRelativeChanges({
  ...exactSwitchingAvatar,
  targetBuffChanges: { avatar: { buffContribution: { platinumSkillLevel: Number.POSITIVE_INFINITY } } },
}), null);
assert.equal(calculation.getBufferSwitchingPlatinumBaseRelativeChanges({
  ...legacySwitchingPlatinum,
  bufferSimulatorChanges: { switchingStatDelta: Number.POSITIVE_INFINITY },
}), null);

const baseEquipment = {
  slot: '상의',
  reinforce: 7,
  mode: 'safeReinforcement',
  effectByCall: {
    '10:amplification': { allStat: 120 },
    '10:reinforcement': { allStat: 90 },
    '7:safeReinforcement': { allStat: 35 },
  },
};
const upgradeSimulator = {
  role: 'buffer',
  baseEquipmentUpgrades: [baseEquipment],
  upgradeDb: { marker: 'db' },
  baseBaseline: { marker: 'baseline' },
};
const upgradeRow = {
  sourceType: 'upgrade',
  slot: '상의',
  progressionType: 'amplify',
  targetLevel: 10,
};
const upgradeSimulatorBefore = clone(upgradeSimulator);
const upgradeRowBefore = clone(upgradeRow);
cumulativeUpgradeCalls.length = 0;
assert.deepEqual(calculation.getBufferUpgradeBaseRelativeChanges(
  deepFreeze(upgradeRow),
  deepFreeze(upgradeSimulator),
), { statDelta: 85 });
assert.equal(cumulativeUpgradeCalls.length, 2);
assert.deepEqual(cumulativeUpgradeCalls[0], [
  baseEquipment,
  10,
  'amplification',
  upgradeSimulator.upgradeDb,
  upgradeSimulator.baseBaseline,
  true,
]);
assert.deepEqual(cumulativeUpgradeCalls[1], [
  baseEquipment,
  7,
  'safeReinforcement',
  upgradeSimulator.upgradeDb,
  upgradeSimulator.baseBaseline,
  true,
]);
assert.equal(cumulativeUpgradeCalls[0].at(-1), true);
assert.equal(cumulativeUpgradeCalls[1].at(-1), true);
assert.deepEqual(upgradeSimulator, upgradeSimulatorBefore);
assert.deepEqual(upgradeRow, upgradeRowBefore);

cumulativeUpgradeCalls.length = 0;
assert.deepEqual(calculation.getBufferUpgradeBaseRelativeChanges({
  ...upgradeRow,
  progressionType: 'reinforce',
}, upgradeSimulator), { statDelta: 55 });
assert.equal(cumulativeUpgradeCalls[0][2], 'reinforcement');
assert.equal(cumulativeUpgradeCalls[1][2], 'safeReinforcement');
assert.equal(cumulativeUpgradeCalls[0].at(-1), true);
assert.equal(cumulativeUpgradeCalls[1].at(-1), true);

assert.equal(calculation.getBufferUpgradeBaseRelativeChanges({ ...upgradeRow, sourceType: 'enchant' }, upgradeSimulator), null);
assert.equal(calculation.getBufferUpgradeBaseRelativeChanges(upgradeRow, { ...upgradeSimulator, role: 'dealer' }), null);
assert.equal(calculation.getBufferUpgradeBaseRelativeChanges({ ...upgradeRow, slot: '하의' }, upgradeSimulator), null);
assert.equal(calculation.getBufferUpgradeBaseRelativeChanges({ ...upgradeRow, progressionType: '' }, upgradeSimulator), null);
assert.equal(calculation.getBufferUpgradeBaseRelativeChanges({ ...upgradeRow, targetLevel: Number.NaN }, upgradeSimulator), null);

const unsupportedEquipment = {
  ...baseEquipment,
  effectByCall: {
    ...baseEquipment.effectByCall,
    '10:amplification': { allStat: 120, buffPower: 1 },
  },
};
assert.equal(calculation.getBufferUpgradeBaseRelativeChanges(upgradeRow, {
  ...upgradeSimulator,
  baseEquipmentUpgrades: [unsupportedEquipment],
}), null);
const nonFiniteEquipment = {
  ...baseEquipment,
  effectByCall: {
    ...baseEquipment.effectByCall,
    '10:amplification': { allStat: Number.POSITIVE_INFINITY },
  },
};
assert.equal(calculation.getBufferUpgradeBaseRelativeChanges(upgradeRow, {
  ...upgradeSimulator,
  baseEquipmentUpgrades: [nonFiniteEquipment],
}), null);

console.log('enchant buffer simulator source calculation: ok');
