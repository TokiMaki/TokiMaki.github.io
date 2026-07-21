import assert from 'node:assert/strict';
import * as sourceIdentityModule from '../src/dnfHellTool/enchantBufferSimulatorSourceIdentity.js';

const { createEnchantBufferSimulatorSourceIdentity } = sourceIdentityModule;

const PUBLIC_FUNCTIONS = [
  'getBufferEnchantExclusiveGroupKey',
  'getBufferEnchantCandidateSignature',
  'getBufferBlackFangExclusiveGroupKey',
  'getBufferBlackFangCandidateSignature',
  'getBufferRelicCraftExclusiveGroupKey',
  'getBufferRelicCraftCandidateSignature',
  'getBufferCreatureExclusiveGroupKey',
  'getBufferCreatureCandidateSignature',
  'getBufferAuraExclusiveGroupKey',
  'getBufferAuraCandidateSignature',
  'getBufferTitleExclusiveGroupKey',
  'getBufferTitleCandidateSignature',
  'getBufferSwitchingCreatureExclusiveGroupKey',
  'getBufferSwitchingCreatureCandidateSignature',
  'getBufferSwitchingTitleExclusiveGroupKey',
  'getBufferSwitchingTitleCandidateSignature',
  'getBufferSwitchingAvatarExclusiveGroupKey',
  'getBufferSwitchingAvatarCandidateSignature',
  'getBufferSwitchingPlatinumExclusiveGroupKey',
  'getBufferSwitchingPlatinumCandidateSignature',
  'getBufferCreatureArtifactExclusiveGroupKey',
  'getBufferCreatureArtifactCandidateSignature',
  'getBufferUpgradeExclusiveGroupKey',
  'getBufferUpgradeCandidateSignature',
];

const DEPENDENCY_NAMES = [
  'getEffectSignature',
  'getStableObjectSignature',
  'blackFangSimulatorSlots',
  'getTitleCandidateSignature',
  'getBuffSimulatorExclusiveGroupKey',
  'getBuffSimulatorCandidateSignature',
  'getCreatureArtifactType',
  'upgradeSlotLabels',
  'getEquipmentProgressionType',
];

const evaluationLog = [];
let dealerTitleSignature = '';

function getEffectSignature(value = {}) {
  evaluationLog.push('getEffectSignature');
  return `effect:${JSON.stringify(value)}`;
}

function getStableObjectSignature(value = {}) {
  evaluationLog.push('getStableObjectSignature');
  return `stable:${JSON.stringify(value)}`;
}

function getTitleCandidateSignature(row = {}) {
  evaluationLog.push('getTitleCandidateSignature');
  return dealerTitleSignature || `title:${row.itemId || ''}:dealer`;
}

function getBuffSimulatorExclusiveGroupKey(row = {}) {
  evaluationLog.push('getBuffSimulatorExclusiveGroupKey');
  if (row.sourceType === 'switchingCreature') return 'buffCreature';
  if (row.sourceType === 'switchingTitle') return 'buffTitle';
  if (row.sourceType === 'avatar' && row.kind === 'switchingAvatar') {
    return `buffAvatarPackage:${row.targetSlotId || ''}`;
  }
  if (row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem') {
    return `buffAvatarPlatinum:${row.targetSlotId || ''}`;
  }
  return '';
}

function getBuffSimulatorCandidateSignature(row = {}) {
  evaluationLog.push('getBuffSimulatorCandidateSignature');
  return `buffCandidate:${row.itemId || ''}:${row.targetSlotId || ''}`;
}

function getCreatureArtifactType(row = {}) {
  evaluationLog.push('getCreatureArtifactType');
  const type = String(row.artifactType || row.slotColor || '').trim().toUpperCase();
  return ['RED', 'BLUE', 'GREEN'].includes(type) ? type : '';
}

const upgradeSlotLabels = new Proxy({
  상의: '상의',
  하의: '하의',
}, {
  get(target, property, receiver) {
    evaluationLog.push(`upgradeSlotLabels:${String(property)}`);
    return Reflect.get(target, property, receiver);
  },
});

function getEquipmentProgressionType(row = {}) {
  evaluationLog.push('getEquipmentProgressionType');
  return row.progressionType || '';
}

const dependencyReads = [];
const dependencies = new Proxy({
  getEffectSignature,
  getStableObjectSignature,
  blackFangSimulatorSlots: new Set(['목걸이', '팔찌', '반지']),
  getTitleCandidateSignature,
  getBuffSimulatorExclusiveGroupKey,
  getBuffSimulatorCandidateSignature,
  getCreatureArtifactType,
  upgradeSlotLabels,
  getEquipmentProgressionType,
}, {
  get(target, property, receiver) {
    dependencyReads.push(property);
    return Reflect.get(target, property, receiver);
  },
});

const identity = createEnchantBufferSimulatorSourceIdentity(dependencies);

assert.deepEqual(Object.keys(sourceIdentityModule), ['createEnchantBufferSimulatorSourceIdentity']);
assert.deepEqual(dependencyReads, DEPENDENCY_NAMES);
assert.deepEqual(Object.keys(identity), PUBLIC_FUNCTIONS);

const enchantRow = {
  sourceType: 'enchant',
  role: 'buffer',
  slot: ' 상의 ',
  itemId: 'enchant-1',
  tier: '종결',
  effects: { allStat: 10 },
  reinforceSkill: [{ name: '패시브', value: 1 }],
};
assert.equal(identity.getBufferEnchantExclusiveGroupKey(enchantRow), 'bufferEnchant:상의');
evaluationLog.length = 0;
assert.equal(
  identity.getBufferEnchantCandidateSignature(enchantRow),
  'bufferEnchant:상의:enchant-1:종결:effect:{"allStat":10}:stable:[{"name":"패시브","value":1}]',
);
assert.deepEqual(evaluationLog, ['getEffectSignature', 'getStableObjectSignature']);
assert.equal(identity.getBufferEnchantExclusiveGroupKey({ ...enchantRow, role: 'dealer' }), '');
assert.equal(identity.getBufferEnchantExclusiveGroupKey({ ...enchantRow, slot: '  ' }), '');
assert.equal(identity.getBufferEnchantCandidateSignature({ ...enchantRow, sourceType: 'title' }), '');

const blackFangRow = {
  bufferSimulatorSupported: true,
  sourceType: 'blackFang',
  slot: ' 목걸이 ',
  targetItemId: 'black-fang-1',
  targetEffects: { buffPower: 40 },
};
assert.equal(identity.getBufferBlackFangExclusiveGroupKey(blackFangRow), 'bufferBlackFang:목걸이');
assert.equal(
  identity.getBufferBlackFangCandidateSignature(blackFangRow),
  'bufferBlackFang:목걸이:black-fang-1:effect:{"buffPower":40}',
);
assert.equal(identity.getBufferBlackFangExclusiveGroupKey({ ...blackFangRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferBlackFangExclusiveGroupKey({ ...blackFangRow, slot: '무기' }), '');
assert.equal(identity.getBufferBlackFangCandidateSignature({ ...blackFangRow, targetItemId: '' }), '');

const relicCraftRow = {
  bufferSimulatorSupported: true,
  sourceType: 'relicCraft',
  slot: ' 마법석 ',
  targetItemId: 'perfume-1',
  targetEffects: { buffPower: 17580 },
};
assert.equal(identity.getBufferRelicCraftExclusiveGroupKey(relicCraftRow), 'bufferRelicCraft:마법석');
assert.equal(
  identity.getBufferRelicCraftCandidateSignature(relicCraftRow),
  'bufferRelicCraft:마법석:perfume-1:effect:{"buffPower":17580}',
);
assert.equal(identity.getBufferRelicCraftExclusiveGroupKey({ ...relicCraftRow, slot: '보조장비' }), '');
assert.equal(identity.getBufferRelicCraftCandidateSignature({ ...relicCraftRow, targetItemId: '' }), '');

const creatureRow = {
  bufferSimulatorSupported: true,
  sourceType: 'creature',
  itemId: 'creature-1',
  effects: { buffPower: 20 },
  itemReinforceSkill: [{ name: '스킬', value: 1 }],
  itemBuff: { explain: '버프' },
};
assert.equal(identity.getBufferCreatureExclusiveGroupKey(creatureRow), 'bufferCreature');
assert.equal(
  identity.getBufferCreatureCandidateSignature(creatureRow),
  'bufferCreature:creature-1:effect:{"buffPower":20}:stable:[{"name":"스킬","value":1}]:stable:{"explain":"버프"}',
);
assert.equal(identity.getBufferCreatureExclusiveGroupKey({ ...creatureRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferCreatureExclusiveGroupKey({ ...creatureRow, sourceType: 'aura' }), '');
assert.equal(identity.getBufferCreatureCandidateSignature({ ...creatureRow, itemId: '' }), '');

const auraRow = {
  bufferSimulatorSupported: true,
  sourceType: 'aura',
  itemId: 'aura-1',
  tier: '플래티넘',
  effects: { allStat: 30 },
  reinforceSkills: [{ name: '오라', value: 2 }],
  itemBuff: { value: 3 },
};
assert.equal(identity.getBufferAuraExclusiveGroupKey(auraRow), 'bufferAura');
assert.equal(
  identity.getBufferAuraCandidateSignature(auraRow),
  'bufferAura:aura-1:플래티넘:effect:{"allStat":30}:stable:[{"name":"오라","value":2}]:stable:{"value":3}',
);
assert.equal(identity.getBufferAuraExclusiveGroupKey({ ...auraRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferAuraExclusiveGroupKey({ ...auraRow, sourceType: 'creature' }), '');
assert.equal(identity.getBufferAuraCandidateSignature({ ...auraRow, itemId: '' }), '');

const titleRow = {
  bufferSimulatorSupported: true,
  sourceType: 'title',
  itemId: 'title-1',
};
assert.equal(identity.getBufferTitleExclusiveGroupKey(titleRow), 'bufferTitle');
dealerTitleSignature = 'title:title-1:bead:title';
assert.equal(
  identity.getBufferTitleCandidateSignature(titleRow),
  'bufferTitle:title-1:bead:title',
);
dealerTitleSignature = 'dealer:title:title-1';
assert.equal(
  identity.getBufferTitleCandidateSignature(titleRow),
  'dealer:title:title-1',
);
dealerTitleSignature = '';
assert.equal(identity.getBufferTitleExclusiveGroupKey({ ...titleRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferTitleExclusiveGroupKey({ ...titleRow, sourceType: 'enchant' }), '');

const switchingCreatureRow = {
  bufferSimulatorSupported: true,
  sourceType: 'switchingCreature',
  itemId: 'switch-creature-1',
};
assert.equal(identity.getBufferSwitchingCreatureExclusiveGroupKey(switchingCreatureRow), 'buffCreature');
assert.equal(
  identity.getBufferSwitchingCreatureCandidateSignature(switchingCreatureRow),
  'buffCandidate:switch-creature-1:',
);
assert.equal(identity.getBufferSwitchingCreatureExclusiveGroupKey({ ...switchingCreatureRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferSwitchingCreatureExclusiveGroupKey({ ...switchingCreatureRow, sourceType: 'creature' }), '');

const switchingTitleRow = {
  bufferSimulatorSupported: true,
  sourceType: 'switchingTitle',
  itemId: 'switch-title-1',
};
assert.equal(identity.getBufferSwitchingTitleExclusiveGroupKey(switchingTitleRow), 'buffTitle');
assert.equal(
  identity.getBufferSwitchingTitleCandidateSignature(switchingTitleRow),
  'buffCandidate:switch-title-1:',
);
assert.equal(identity.getBufferSwitchingTitleExclusiveGroupKey({ ...switchingTitleRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferSwitchingTitleExclusiveGroupKey({ ...switchingTitleRow, sourceType: 'title' }), '');

const switchingAvatarRow = {
  bufferSimulatorSupported: true,
  sourceType: 'avatar',
  kind: 'switchingAvatar',
  targetSlotId: 'JACKET',
  itemId: 'switch-avatar-1',
};
assert.equal(
  identity.getBufferSwitchingAvatarExclusiveGroupKey(switchingAvatarRow),
  'buffAvatarPackage:JACKET',
);
assert.equal(
  identity.getBufferSwitchingAvatarCandidateSignature(switchingAvatarRow),
  'buffCandidate:switch-avatar-1:JACKET',
);
assert.equal(identity.getBufferSwitchingAvatarExclusiveGroupKey({ ...switchingAvatarRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferSwitchingAvatarExclusiveGroupKey({ ...switchingAvatarRow, sourceType: 'switchingAvatar' }), '');
assert.equal(identity.getBufferSwitchingAvatarExclusiveGroupKey({ ...switchingAvatarRow, kind: 'switchingPlatinumEmblem' }), '');

const switchingPlatinumRow = {
  bufferSimulatorSupported: true,
  sourceType: 'avatar',
  kind: 'switchingPlatinumEmblem',
  targetSlotId: 'PANTS',
  itemId: 'switch-platinum-1',
};
assert.equal(
  identity.getBufferSwitchingPlatinumExclusiveGroupKey(switchingPlatinumRow),
  'buffAvatarPlatinum:PANTS',
);
assert.equal(
  identity.getBufferSwitchingPlatinumCandidateSignature(switchingPlatinumRow),
  'buffCandidate:switch-platinum-1:PANTS',
);
assert.equal(identity.getBufferSwitchingPlatinumExclusiveGroupKey({ ...switchingPlatinumRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferSwitchingPlatinumExclusiveGroupKey({ ...switchingPlatinumRow, sourceType: 'switchingPlatinumEmblem' }), '');
assert.equal(identity.getBufferSwitchingPlatinumExclusiveGroupKey({ ...switchingPlatinumRow, kind: 'switchingAvatar' }), '');

const artifactRow = {
  bufferSimulatorSupported: true,
  sourceType: 'creatureArtifact',
  slotColor: ' red ',
  itemId: 'artifact-1',
};
assert.equal(
  identity.getBufferCreatureArtifactExclusiveGroupKey(artifactRow),
  'bufferCreatureArtifact:RED',
);
assert.equal(
  identity.getBufferCreatureArtifactCandidateSignature(artifactRow),
  'bufferCreatureArtifact:RED:artifact-1',
);
assert.equal(identity.getBufferCreatureArtifactExclusiveGroupKey({ ...artifactRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferCreatureArtifactExclusiveGroupKey({ ...artifactRow, sourceType: 'creature' }), '');
assert.equal(identity.getBufferCreatureArtifactExclusiveGroupKey({ ...artifactRow, slotColor: 'yellow' }), '');
assert.equal(identity.getBufferCreatureArtifactCandidateSignature({ ...artifactRow, itemId: '' }), '');

const upgradeRow = {
  bufferSimulatorSupported: true,
  sourceType: 'upgrade',
  slot: ' 상의 ',
  progressionType: 'amplify',
  targetLevel: 10,
};
assert.equal(identity.getBufferUpgradeExclusiveGroupKey(upgradeRow), 'bufferUpgrade:상의');
assert.equal(
  identity.getBufferUpgradeCandidateSignature(upgradeRow),
  'bufferUpgrade:상의:amplify:10',
);
assert.equal(identity.getBufferUpgradeExclusiveGroupKey({ ...upgradeRow, bufferSimulatorSupported: false }), '');
assert.equal(identity.getBufferUpgradeExclusiveGroupKey({ ...upgradeRow, sourceType: 'enchant' }), '');
assert.equal(identity.getBufferUpgradeExclusiveGroupKey({ ...upgradeRow, slot: '무기' }), '');
assert.equal(identity.getBufferUpgradeCandidateSignature({ ...upgradeRow, progressionType: '' }), '');
assert.equal(identity.getBufferUpgradeCandidateSignature({ ...upgradeRow, targetLevel: Number.NaN }), '');
assert.equal(
  identity.getBufferUpgradeCandidateSignature({ ...upgradeRow, targetLevel: 0 }),
  'bufferUpgrade:상의:amplify:0',
);

evaluationLog.length = 0;
const orderedTargetLevel = {
  valueOf() {
    evaluationLog.push('targetLevel:valueOf');
    return 0;
  },
};
assert.equal(
  identity.getBufferUpgradeCandidateSignature({ ...upgradeRow, targetLevel: orderedTargetLevel }),
  'bufferUpgrade:상의:amplify:0',
);
assert.deepEqual(evaluationLog, [
  'upgradeSlotLabels:상의',
  'getEquipmentProgressionType',
  'targetLevel:valueOf',
]);

evaluationLog.length = 0;
const nanTargetLevel = {
  valueOf() {
    evaluationLog.push('targetLevel:valueOf');
    return Number.NaN;
  },
};
assert.equal(
  identity.getBufferUpgradeCandidateSignature({ ...upgradeRow, targetLevel: nanTargetLevel }),
  '',
);
assert.deepEqual(evaluationLog, [
  'upgradeSlotLabels:상의',
  'getEquipmentProgressionType',
  'targetLevel:valueOf',
]);

evaluationLog.length = 0;
assert.equal(identity.getBufferUpgradeCandidateSignature({
  ...upgradeRow,
  sourceType: 'enchant',
  targetLevel: {
    valueOf() {
      evaluationLog.push('targetLevel:valueOf');
      return 5;
    },
  },
}), '');
assert.deepEqual(evaluationLog, [
  'getEquipmentProgressionType',
  'targetLevel:valueOf',
]);

console.log('enchant buffer simulator source identity: ok');
