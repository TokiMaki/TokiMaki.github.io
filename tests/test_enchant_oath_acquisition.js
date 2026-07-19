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
assert.equal(adapted.decisionPlan[0].slotIndex, 1);
assert.equal(adapted.itemId, 'epic-b');
assert.equal(adapted.currentSetPoint, 190);
assert.equal(adapted.targetSetPoint, 220);
assert.deepEqual(candidateRow, candidateSnapshot);
assert.deepEqual(simulator, simulatorSnapshot);

const descriptors = acquisition.getOathAcquisitionSelectionDescriptors(adapted);
assert.deepEqual(descriptors.map((descriptor) => descriptor.exclusiveGroupKey), ['oathAcquire:1']);
assert.equal(
  acquisition.getOathAcquisitionCandidateSignature(adapted),
  'oathAcquire:1:transcend:epic-b',
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

console.log('test_enchant_oath_acquisition: ok');
