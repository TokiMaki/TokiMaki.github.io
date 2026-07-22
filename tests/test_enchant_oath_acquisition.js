import assert from 'node:assert/strict';
import { createEnchantOathAcquisition } from '../src/dnfHellTool/enchantOathAcquisition.js';

const cloneSimulatorValue = (value) => structuredClone(value);

function getMaterialGold(materials = []) {
  return (materials || []).reduce((sum, material) => (
    sum + Number(material.amount || 0) * Number(material.auction?.minUnitPrice || 0)
  ), 0);
}

function getRecommendationGold(row = {}, includeMaterialCosts = false) {
  const baseGold = Number.isFinite(row.expectedGold)
    ? row.expectedGold
    : Number(row.auction?.minUnitPrice || 0);
  if (!Number.isFinite(baseGold) || baseGold <= 0) return 0;
  return includeMaterialCosts
    ? baseGold + getMaterialGold(row.expectedMaterials || [])
    : baseGold;
}

function mergeUpgradeMaterials(...materialGroups) {
  const merged = new Map();
  materialGroups.flat().filter(Boolean).forEach((material) => {
    const key = material.priceKey || material.key || material.itemId || material.itemName;
    if (!key) return;
    const previous = merged.get(key);
    merged.set(key, {
      ...(previous || {}),
      ...cloneSimulatorValue(material),
      amount: Number(previous?.amount || 0) + Number(material.amount || 0),
    });
  });
  return [...merged.values()];
}

function applyUpgradeMaterialPrices(materials = [], sourceType = '', prices = {}) {
  return (materials || []).map((material) => ({
    ...cloneSimulatorValue(material),
    sourceType,
    auction: {
      minUnitPrice: Number(prices?.[material.key]?.auction?.minUnitPrice || 0),
    },
  }));
}

function getCostPerPointOnePercent(row = {}) {
  const price = getRecommendationGold(row, false);
  return Number(row.incrementalDamagePercent || 0) > 0
    ? price * 0.1 / Number(row.incrementalDamagePercent)
    : 0;
}

function getRoleRelevantEffects(effects = {}, isBuffer = false) {
  const hidden = isBuffer
    ? new Set(['finalDamage', 'skillDamageMultiplier', 'attack'])
    : new Set(['buffPower', 'buffAmplification']);
  return Object.fromEntries(
    Object.entries(effects || {}).filter(([key]) => !hidden.has(key)),
  );
}

function getOathTuneState(_db = {}, point = 0) {
  const value = Number(point || 0);
  return {
    stageName: value >= 260 ? '에픽' : '레전더리',
    blessingFinalDamage: value / 100,
    blessingBuffPower: value * 2,
    setFinalDamage: value / 200,
    stageBuffPower: value >= 260 ? 100 : 0,
    damageMultiplier: 1 + value / 10000,
  };
}

function syncOathTuneStageDisplay(oath = {}, db = {}) {
  oath.setRarityName = getOathTuneState(db, oath.setPoint).stageName;
  return oath;
}

let acquisition;
const getSimulatorExclusiveGroupKey = (row) => (
  acquisition.getOathAcquisitionExclusiveGroupKey(row)
);
const getSimulatorCandidateSignature = (row) => (
  acquisition.getOathAcquisitionCandidateSignature(row)
);

acquisition = createEnchantOathAcquisition({
  oathDecisionVariantSourceTypes: new Set(['oathTranscend', 'oathCraft']),
  applyUpgradeMaterialPrices,
  cloneSimulatorValue,
  getRecommendationGold,
  mergeUpgradeMaterials,
  getCostPerPointOnePercent,
  getRoleRelevantEffects,
  getOathTuneState,
  syncOathTuneStageDisplay,
  getSimulatorExclusiveGroupKey,
  getSimulatorCandidateSignature,
});

const rawRecommendation = {
  targetRarity: '에픽',
  variantGroupKey: 'epic-transcend',
  variantCount: 1,
  decisionPlan: [{
    slotIndex: 0,
    targetItemId: 'epic-a',
    targetItemName: '에픽 A',
    targetRarity: '에픽',
    targetEffects: { finalDamage: 3, allStat: 20 },
    targetSlotSetPoint: 120,
    expectedGold: 1000,
    materials: [
      { key: 'solidSoul', amount: 2 },
      { key: 'radiantSoul', amount: 1 },
    ],
  }],
};
const rawRecommendationSnapshot = cloneSimulatorValue(rawRecommendation);
const pricedRows = acquisition.getOathTranscendRows(
  [rawRecommendation],
  {
    solidSoul: { auction: { minUnitPrice: 50 } },
    radiantSoul: { auction: { minUnitPrice: 100 } },
  },
);
assert.equal(pricedRows.length, 1);
assert.equal(pricedRows[0].sourceType, 'oathTranscend');
assert.deepEqual(
  pricedRows[0].decisionPlan[0].expectedMaterials.map((material) => material.key),
  ['radiantSoul'],
);
assert.deepEqual(rawRecommendation, rawRecommendationSnapshot);

const craftRows = acquisition.getOathTranscendRows(
  [rawRecommendation],
  { radiantSoul: { auction: { minUnitPrice: 100 } } },
  'oathCraft',
);
assert.equal(craftRows[0].sourceType, 'oathCraft');
assert.deepEqual(
  craftRows[0].decisionPlan[0].expectedMaterials.map((material) => material.key),
  ['radiantSoul'],
);

const baseOath = {
  setPoint: 190,
  crystals: [
    { index: 0, itemId: 'unique-a', itemName: '유니크 A', itemRarity: '유니크', effects: { allStat: 5 }, setPoint: 90 },
    { index: 1, itemId: 'legend-b', itemName: '레전더리 B', itemRarity: '레전더리', effects: { allStat: 8 }, setPoint: 100 },
  ],
};
const baseOathSnapshot = cloneSimulatorValue(baseOath);
const attached = acquisition.attachOathAcquisitionBaseCalculationData(baseOath, [{
  decisionPlan: [{
    slotIndex: 0,
    currentEffects: { allStat: 11, buffPower: 30 },
    currentSlotSetPoint: 95,
  }],
}]);
assert.deepEqual(attached.crystals[0].effects, { allStat: 11, buffPower: 30 });
assert.equal(attached.crystals[0].setPoint, 95);
assert.deepEqual(baseOath, baseOathSnapshot);

const candidateRow = {
  ...pricedRows[0],
  decisionCandidatePool: [
    {
      slotIndex: 0,
      targetItemId: 'epic-a',
      targetItemName: '에픽 A',
      targetRarity: '에픽',
      targetEffects: { finalDamage: 2, allStat: 20, buffPower: 40 },
      targetSlotSetPoint: 120,
      expectedGold: 1000,
      materials: [{ key: 'radiantSoul', amount: 1 }],
      expectedMaterials: [{ key: 'radiantSoul', amount: 1, auction: { minUnitPrice: 100 } }],
    },
    {
      slotIndex: 1,
      targetItemId: 'epic-b',
      targetItemName: '에픽 B',
      targetRarity: '에픽',
      targetEffects: { finalDamage: 5, allStat: 30, buffPower: 70 },
      targetSlotSetPoint: 130,
      expectedGold: 1200,
      materials: [{ key: 'radiantSoul', amount: 2 }],
      expectedMaterials: [{ key: 'radiantSoul', amount: 2, auction: { minUnitPrice: 100 } }],
    },
  ],
};
const simulator = {
  role: 'dealer',
  baseOathUpgrades: cloneSimulatorValue(baseOath),
  simulatedOathUpgrades: cloneSimulatorValue(baseOath),
  activeSelectionByGroup: {},
  oathTuneDb: { maxTuneLevel: 3 },
};
const candidateSnapshot = cloneSimulatorValue(candidateRow);
const simulatorSnapshot = cloneSimulatorValue(simulator);
const adapted = acquisition.adaptOathAcquisitionRecommendation(candidateRow, simulator);
assert.ok(adapted);
assert.equal(adapted.decisionPlan.length, 1);
assert.equal(adapted.decisionPlan[0].slotIndex, 0);
assert.equal(adapted.itemId, 'epic-a');
assert.equal(adapted.currentSetPoint, 190);
assert.equal(adapted.targetSetPoint, 220);
assert.deepEqual(candidateRow, candidateSnapshot);
assert.deepEqual(simulator, simulatorSnapshot);

const descriptors = acquisition.getOathAcquisitionSelectionDescriptors(adapted);
assert.deepEqual(descriptors.map((descriptor) => descriptor.exclusiveGroupKey), ['oathAcquire:0']);
assert.equal(
  acquisition.getOathAcquisitionCandidateSignature(adapted),
  'oathAcquire:0:transcend:epic-a',
);

const adaptedTwoDecisions = acquisition.adaptOathAcquisitionRecommendation({
  ...candidateRow,
  variantCount: 2,
}, simulator);
assert.deepEqual(
  adaptedTwoDecisions.decisionPlan.map((entry) => entry.slotIndex),
  [0, 1],
  '2/2는 유니크를 먼저, 레전더리를 다음으로 교체한다',
);

const bufferSimulator = {
  ...cloneSimulatorValue(simulator),
  role: 'buffer',
};
const evaluation = acquisition.getBufferOathAcquisitionEvaluation(adapted, bufferSimulator);
assert.ok(evaluation?.referenceChanges);
assert.ok(evaluation?.candidateChanges);
assert.ok(evaluation.candidateChanges.statDelta > evaluation.referenceChanges.statDelta);
assert.deepEqual(bufferSimulator, { ...simulatorSnapshot, role: 'buffer' });

const transcendVariants = [1, 2].map((count) => ({
  ...cloneSimulatorValue(adapted),
  sourceType: 'oathTranscend',
  variantGroupKey: 'epic-transcend',
  variantCount: count,
  expectedGold: 1000 * count,
  expectedMaterials: [{ key: 'radiantSoul', amount: count, auction: { minUnitPrice: 100 } }],
  materials: [{ key: 'radiantSoul', amount: count }],
  incrementalDamagePercent: count,
}));
const craftVariants = [1, 2].map((count) => ({
  ...cloneSimulatorValue(adapted),
  sourceType: 'oathCraft',
  variantGroupKey: 'epic-craft',
  variantCount: count,
  expectedGold: 1500 * count,
  expectedMaterials: [{ key: 'radiantSoul', amount: count * 2, auction: { minUnitPrice: 100 } }],
  materials: [{ key: 'radiantSoul', amount: count * 2 }],
  incrementalDamagePercent: count,
}));
const collapsed = acquisition.collapseOathDecisionRecommendationVariants(
  [...transcendVariants, ...craftVariants],
  { 'epic-transcend': 0, 'epic-craft': 0 },
);
assert.equal(collapsed.length, 2);
assert.equal(collapsed[0].oathDecisionVariants.length, 2);
const collapsedSnapshot = cloneSimulatorValue(collapsed);
const combined = acquisition.combineOathAcquisitionRecommendationRows(
  collapsed,
  {},
  { 'oathDecision:에픽': { transcend: 1, craft: 1 } },
  true,
);
assert.equal(combined.length, 1);
assert.equal(combined[0].sourceType, 'oathAcquisitionCombined');
assert.equal(combined[0].transcendCount, 1);
assert.equal(combined[0].craftCount, 1);
assert.equal(combined[0].variantCount, 2);
assert.equal(combined[0].expectedGold, 2500);
assert.deepEqual(combined[0].expectedMaterials.map(({ key, amount }) => ({ key, amount })), [
  { key: 'radiantSoul', amount: 3 },
]);
assert.deepEqual(collapsed, collapsedSnapshot);

const appliedRow = cloneSimulatorValue(adapted);
const appliedDescriptor = acquisition.getOathAcquisitionSelectionDescriptors(appliedRow)[0];
const appliedSimulator = {
  ...cloneSimulatorValue(simulator),
  activeSelectionByGroup: {
    [appliedDescriptor.exclusiveGroupKey]: {
      applyType: 'acquireOathDecision',
      candidateSignature: appliedDescriptor.candidateSignature,
      acquisitionVariantGroupKey: appliedRow.variantGroupKey,
      acquisitionTargetGroupKey: acquisition.getOathAcquisitionTargetGroupKey(appliedRow),
      acquisitionMethod: 'transcend',
      targetDecision: cloneSimulatorValue(appliedDescriptor.entry),
      appliedRecommendationSnapshot: cloneSimulatorValue(appliedRow),
    },
  },
};
assert.equal(acquisition.isAppliedOathAcquisitionRecommendation(appliedRow, appliedSimulator), true);
assert.deepEqual(
  acquisition.getActiveOathAcquisitionMethodCounts(appliedSimulator, [appliedRow]),
  { transcend: 1, craft: 0 },
);
const appliedSimulatorSnapshot = cloneSimulatorValue(appliedSimulator);
const mergedSnapshots = acquisition.mergeAppliedOathAcquisitionSnapshots([], appliedSimulator);
assert.equal(mergedSnapshots.length, 1);
assert.equal(
  acquisition.getOathAcquisitionCandidateSignature(mergedSnapshots[0]),
  appliedDescriptor.candidateSignature,
);
assert.deepEqual(appliedSimulator, appliedSimulatorSnapshot);


const protectedEpicDecision = {
  slotIndex: 0,
  targetItemId: 'epic-from-legend',
  targetItemName: '초월 에픽',
  targetRarity: '에픽',
  targetEffects: { finalDamage: 8 },
  targetSlotSetPoint: 130,
};
const crossRarityBaseCrystals = [
  { index: 0, itemId: 'legend-a', itemName: '레전더리 A', itemRarity: '레전더리', effects: { finalDamage: 1 }, setPoint: 90 },
  { index: 1, itemId: 'native-epic-b', itemName: '기존 에픽 B', itemRarity: '에픽', effects: { finalDamage: 4 }, setPoint: 120 },
  { index: 2, itemId: 'legend-c', itemName: '레전더리 C', itemRarity: '레전더리', effects: { finalDamage: 2 }, setPoint: 95 },
];
const crossRaritySimulatedCrystals = crossRarityBaseCrystals.map((crystal) => (
  crystal.index === 0
    ? acquisition.replaceOathDecisionBody(crystal, protectedEpicDecision, 3)
    : cloneSimulatorValue(crystal)
));
const sumSetPoint = (crystals) => crystals.reduce(
  (sum, crystal) => sum + Number(crystal.setPoint || 0),
  0,
);
const crossRaritySimulator = {
  role: 'dealer',
  oathTuneDb: { maxTuneLevel: 3, uniqueCrystalNameKeyword: '안개 결정' },
  baseOathUpgrades: {
    setPoint: sumSetPoint(crossRarityBaseCrystals),
    crystals: cloneSimulatorValue(crossRarityBaseCrystals),
  },
  simulatedOathUpgrades: {
    setPoint: sumSetPoint(crossRaritySimulatedCrystals),
    crystals: cloneSimulatorValue(crossRaritySimulatedCrystals),
  },
  activeSelectionByGroup: {
    'oathAcquire:0': {
      applyType: 'acquireOathDecision',
      candidateSignature: 'oathAcquire:0:transcend:epic-from-legend',
      acquisitionVariantGroupKey: 'oathTranscend:에픽',
      acquisitionTargetGroupKey: 'oathAcquireTarget:에픽',
      acquisitionMethod: 'transcend',
      targetDecision: cloneSimulatorValue(protectedEpicDecision),
    },
  },
};
const primevalAfterEpicRow = {
  sourceType: 'oathTranscend',
  targetRarity: '태초',
  itemRarity: '태초',
  variantGroupKey: 'oathTranscend:태초',
  variantCount: 1,
  decisionCandidatePool: [
    {
      slotIndex: 0,
      targetItemId: 'primeval-protected-slot',
      targetItemName: '태초 보호 슬롯',
      targetRarity: '태초',
      targetEffects: { finalDamage: 40 },
      targetSlotSetPoint: 145,
      expectedGold: 1000,
    },
    {
      slotIndex: 2,
      targetItemId: 'primeval-legend',
      targetItemName: '태초 레전더리',
      targetRarity: '태초',
      targetEffects: { finalDamage: 20 },
      targetSlotSetPoint: 145,
      expectedGold: 1000,
    },
  ],
};
const adaptedPrimevalAfterEpic = acquisition.adaptOathAcquisitionRecommendation(
  primevalAfterEpicRow,
  crossRaritySimulator,
);
assert.ok(adaptedPrimevalAfterEpic);
assert.equal(
  adaptedPrimevalAfterEpic.decisionPlan[0].slotIndex,
  2,
  '태초는 에픽보다 남아 있는 레전더리를 먼저 교체한다',
);

const recompositionBaseCrystals = [
  { index: 0, itemId: 'unique-weak', itemName: '유니크 약', itemRarity: '유니크', effects: { finalDamage: 1 }, setPoint: 80 },
  { index: 1, itemId: 'legend-mid', itemName: '레전더리 중', itemRarity: '레전더리', effects: { finalDamage: 2 }, setPoint: 90 },
  { index: 2, itemId: 'legend-high', itemName: '레전더리 강', itemRarity: '레전더리', effects: { finalDamage: 3 }, setPoint: 95 },
];
const recompositionSimulator = {
  role: 'dealer',
  oathTuneDb: { maxTuneLevel: 3, uniqueCrystalNameKeyword: '안개 결정' },
  baseOathUpgrades: {
    setPoint: sumSetPoint(recompositionBaseCrystals),
    crystals: cloneSimulatorValue(recompositionBaseCrystals),
  },
  simulatedOathUpgrades: {
    setPoint: sumSetPoint(recompositionBaseCrystals),
    crystals: cloneSimulatorValue(recompositionBaseCrystals),
  },
  activeSelectionByGroup: {},
};
const recompositionEpicRow = {
  sourceType: 'oathTranscend',
  targetRarity: '에픽',
  itemRarity: '에픽',
  variantGroupKey: 'oathTranscend:에픽',
  variantCount: 1,
  decisionCandidatePool: [
    { slotIndex: 0, targetItemId: 'epic-slot-0', targetItemName: '에픽 0', targetRarity: '에픽', targetEffects: { finalDamage: 10 }, targetSlotSetPoint: 120 },
    { slotIndex: 1, targetItemId: 'epic-slot-1', targetItemName: '에픽 1', targetRarity: '에픽', targetEffects: { finalDamage: 20 }, targetSlotSetPoint: 130 },
  ],
};
const recompositionPrimevalRow = {
  sourceType: 'oathTranscend',
  targetRarity: '태초',
  itemRarity: '태초',
  variantGroupKey: 'oathTranscend:태초',
  variantCount: 1,
  decisionCandidatePool: [
    { slotIndex: 0, targetItemId: 'primeval-slot-0', targetItemName: '태초 0', targetRarity: '태초', targetEffects: { finalDamage: 40 }, targetSlotSetPoint: 145 },
    { slotIndex: 1, targetItemId: 'primeval-slot-1', targetItemName: '태초 1', targetRarity: '태초', targetEffects: { finalDamage: 30 }, targetSlotSetPoint: 145 },
    { slotIndex: 2, targetItemId: 'primeval-slot-2', targetItemName: '태초 2', targetRarity: '태초', targetEffects: { finalDamage: 20 }, targetSlotSetPoint: 145 },
  ],
};
const recomposedPlans = acquisition.rebuildOathAcquisitionPlansFromBase(
  recompositionSimulator,
  [recompositionPrimevalRow, recompositionEpicRow],
);
assert.ok(recomposedPlans);
assert.deepEqual(
  recomposedPlans.recommendations.map((row) => row.targetRarity),
  ['에픽', '태초'],
  '전체 계획은 입력 순서와 관계없이 에픽 다음 태초로 배치한다',
);
assert.equal(recomposedPlans.oathUpgrades.crystals[0].itemId, 'epic-slot-0');
assert.equal(recomposedPlans.oathUpgrades.crystals[1].itemId, 'primeval-slot-1');
assert.equal(recomposedPlans.oathUpgrades.crystals[2].itemId, 'legend-high');
assert.deepEqual(recompositionSimulator.simulatedOathUpgrades.crystals, recompositionBaseCrystals);

const recomposedFullPlans = acquisition.rebuildOathAcquisitionPlansFromBase(
  recompositionSimulator,
  [
    { ...recompositionEpicRow, variantCount: 2 },
    recompositionPrimevalRow,
  ],
);
assert.deepEqual(
  recomposedFullPlans.oathUpgrades.crystals.map((crystal) => crystal.itemRarity),
  ['에픽', '에픽', '태초'],
  '에픽 2개를 먼저 배치하고 남은 슬롯에 태초 1개를 배치한다',
);
const recomposedPrimevalOnly = acquisition.rebuildOathAcquisitionPlansFromBase(
  recompositionSimulator,
  [recompositionPrimevalRow],
);
assert.deepEqual(
  recomposedPrimevalOnly.oathUpgrades.crystals.map((crystal) => crystal.itemId),
  ['primeval-slot-0', 'legend-mid', 'legend-high'],
  '에픽 계획을 제거하면 이전 배치를 유지하지 않고 base에서 태초 계획만 다시 선택한다',
);

const surplusEpicCrystals = Array.from({ length: 11 }, (_, index) => ({
  index,
  itemId: `surplus-epic-${index}`,
  itemName: `기존 에픽 ${index}`,
  itemRarity: '에픽',
  effects: { finalDamage: 4 + index / 10 },
  setPoint: 120,
}));
const surplusEpicSimulator = {
  role: 'dealer',
  oathTuneDb: { maxTuneLevel: 3, uniqueCrystalNameKeyword: '안개 결정' },
  baseOathUpgrades: {
    setPoint: sumSetPoint(surplusEpicCrystals),
    crystals: cloneSimulatorValue(surplusEpicCrystals),
  },
  simulatedOathUpgrades: {
    setPoint: sumSetPoint(surplusEpicCrystals),
    crystals: cloneSimulatorValue(surplusEpicCrystals),
  },
  activeSelectionByGroup: {},
};
const surplusPrimevalRow = {
  sourceType: 'oathTranscend',
  targetRarity: '태초',
  itemRarity: '태초',
  variantGroupKey: 'oathTranscend:태초',
  variantCount: 1,
  decisionCandidatePool: [{
    slotIndex: 0,
    targetItemId: 'primeval-from-surplus-epic',
    targetItemName: '태초 잉여 에픽',
    targetRarity: '태초',
    targetEffects: { finalDamage: 20 },
    targetSlotSetPoint: 145,
    expectedGold: 1000,
  }],
};
const adaptedSurplusPrimeval = acquisition.adaptOathAcquisitionRecommendation(
  surplusPrimevalRow,
  surplusEpicSimulator,
);
assert.ok(adaptedSurplusPrimeval);
assert.equal(
  adaptedSurplusPrimeval.decisionPlan[0].slotIndex,
  0,
  '처음부터 장착 중인 일반 에픽은 기존 선택 기준대로 태초 후보가 될 수 있다',
);

const protectedPrimevalDecision = {
  slotIndex: 2,
  targetItemId: 'primeval-from-legend',
  targetItemName: '초월 태초',
  targetRarity: '태초',
  targetEffects: { finalDamage: 25 },
  targetSlotSetPoint: 145,
};
const reverseSimulator = cloneSimulatorValue(crossRaritySimulator);
reverseSimulator.simulatedOathUpgrades.crystals = crossRarityBaseCrystals.map((crystal) => (
  crystal.index === 2
    ? acquisition.replaceOathDecisionBody(crystal, protectedPrimevalDecision, 3)
    : cloneSimulatorValue(crystal)
));
reverseSimulator.simulatedOathUpgrades.setPoint = sumSetPoint(reverseSimulator.simulatedOathUpgrades.crystals);
reverseSimulator.activeSelectionByGroup = {
  'oathAcquire:2': {
    applyType: 'acquireOathDecision',
    candidateSignature: 'oathAcquire:2:transcend:primeval-from-legend',
    acquisitionVariantGroupKey: 'oathTranscend:태초',
    acquisitionTargetGroupKey: 'oathAcquireTarget:태초',
    acquisitionMethod: 'transcend',
    targetDecision: cloneSimulatorValue(protectedPrimevalDecision),
  },
};
const epicAfterPrimevalRow = {
  sourceType: 'oathTranscend',
  targetRarity: '에픽',
  itemRarity: '에픽',
  variantGroupKey: 'oathTranscend:에픽',
  variantCount: 1,
  decisionCandidatePool: [
    {
      slotIndex: 2,
      targetItemId: 'epic-protected-primeval',
      targetItemName: '에픽 보호 태초',
      targetRarity: '에픽',
      targetEffects: { finalDamage: 35 },
      targetSlotSetPoint: 130,
      expectedGold: 1000,
    },
    {
      slotIndex: 0,
      targetItemId: 'epic-legend-a',
      targetItemName: '에픽 레전더리 A',
      targetRarity: '에픽',
      targetEffects: { finalDamage: 10 },
      targetSlotSetPoint: 130,
      expectedGold: 1000,
    },
  ],
};
const adaptedEpicAfterPrimeval = acquisition.adaptOathAcquisitionRecommendation(
  epicAfterPrimevalRow,
  reverseSimulator,
);
assert.ok(adaptedEpicAfterPrimeval);
assert.equal(adaptedEpicAfterPrimeval.decisionPlan[0].slotIndex, 0);

console.log('test_enchant_oath_acquisition: ok');
