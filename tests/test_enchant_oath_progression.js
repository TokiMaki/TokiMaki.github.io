import assert from 'node:assert/strict';
import { createEnchantOathProgression } from '../src/dnfHellTool/enchantOathProgression.js';

function addEffects(...rows) {
  return rows.reduce((result, effects) => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      result[key] = Number(result[key] || 0) + Number(value || 0);
    });
    return result;
  }, {});
}

function applyUpgradeMaterialPrices(materials = [], mode = '', materialPrices = {}) {
  return materials.map((material) => {
    const price = materialPrices[material.key] || {};
    return {
      ...material,
      priceKey: material.key,
      auction: price.auction || {},
      itemId: price.itemId || '',
      itemName: price.label || material.label || '',
      iconUrl: price.iconUrl || '',
      mode,
    };
  });
}

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function getEquipmentTuneSetPoint(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row?.tuneSetPoint || 0), 0);
}

function closeTo(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

const progression = createEnchantOathProgression({
  addEffects,
  applyUpgradeMaterialPrices,
  cloneSimulatorValue: clone,
  getEquipmentTuneSetPoint,
  equipmentTuneMinSetPoint: 2550,
});

assert.deepEqual(Object.keys(progression), [
  'getBufferOathTuneBaseRelativeChanges',
  'getOathTuneState',
  'applyOathTunePlan',
  'getChangedOathTuneSlots',
  'getOathTuneDamageMultiplier',
  'getOathCrystalEffectsTotal',
  'getOathCrystalFinalDamageChangeMultiplier',
  'getOathTuneRows',
  'getOathTuneExclusiveGroupKey',
  'getOathTuneCandidateSignature',
]);

const oathTuneDb = {
  pointPerTune: 10,
  maxTuneLevel: 3,
  cooldownEquivalentMultiplier: 1.1,
  stageRows: [
    { requiredPoint: 2550, name: '태초', rarity: '태초', finalDamagePercent: 10, buffPower: 200 },
    { requiredPoint: 0, name: '레어', rarity: '레어', finalDamagePercent: 0, buffPower: 0 },
    { requiredPoint: 2500, name: '에픽', rarity: '에픽', finalDamagePercent: 5, buffPower: 50 },
  ],
  blessingRows: [
    {
      startPoint: 2550,
      stepPoint: 25,
      finalDamagePercent: 0,
      finalDamagePerStep: 1,
      buffPower: 0,
      buffPowerPerStep: 100,
      cooldownEquivalent: true,
    },
    {
      startPoint: 0,
      stepPoint: 25,
      finalDamagePercent: 0,
      finalDamagePerStep: 0,
      buffPower: 0,
      buffPowerPerStep: 0,
    },
  ],
  costByRarity: {
    레전더리: {
      gold: 100,
      materialKey: 'legendarySoul',
      materialLabel: '레전더리 소울',
      materialAmount: 2,
    },
    에픽: {
      gold: 200,
      materialKey: 'epicSoul',
      materialLabel: '에픽 소울',
      materialAmount: 3,
    },
  },
};

assert.equal(progression.getOathTuneState({}, 2550), null);
assert.equal(progression.getOathTuneState(oathTuneDb, -1), null);
const stateAt2550 = progression.getOathTuneState(oathTuneDb, 2550);
assert.deepEqual(stateAt2550, {
  point: 2550,
  stageName: '태초',
  stageRarity: '태초',
  setFinalDamage: 10,
  stageBuffPower: 200,
  blessingFinalDamage: 0,
  blessingBuffPower: 0,
  damageMultiplier: 1.1 * 1 * 1.1,
});
const stateAt2580 = progression.getOathTuneState(oathTuneDb, 2580);
assert.equal(stateAt2580.blessingFinalDamage, 1);
assert.equal(stateAt2580.blessingBuffPower, 100);
closeTo(stateAt2580.damageMultiplier, 1.1 * 1.01 * 1.1);

const zeroStepPointDb = {
  stageRows: [{ requiredPoint: 0, name: '기본', rarity: '레어' }],
  blessingRows: [{ startPoint: 0, stepPoint: 0, finalDamagePerStep: 1, buffPowerPerStep: 10 }],
};
const zeroStepPointState = progression.getOathTuneState(zeroStepPointDb, 50);
assert.equal(zeroStepPointState.blessingFinalDamage, 2);
assert.equal(zeroStepPointState.blessingBuffPower, 20);

const frozenDb = deepFreeze(clone(oathTuneDb));
const frozenDbBefore = clone(frozenDb);
progression.getOathTuneState(frozenDb, 2550);
assert.deepEqual(frozenDb, frozenDbBefore);

const baseOath = {
  setPoint: 2530,
  setRarityName: '에픽',
  iconUrl: 'oath.png',
  crystals: [
    {
      index: 5,
      simulatedTuneOrder: 2,
      itemId: 'epic-five',
      itemName: '에픽 결정 5',
      itemRarity: '에픽',
      iconUrl: 'epic-five.png',
      tuneLevel: 0,
      tuneRemaining: 3,
      setPoint: 230,
      effects: { allStat: 5 },
    },
    {
      index: 9,
      simulatedTuneOrder: 0,
      itemId: 'legend-nine',
      itemName: '레전더리 결정 9',
      itemRarity: '레전더리',
      tuneLevel: 0,
      tuneRemaining: 1,
      setPoint: 230,
      effects: { finalDamage: 3 },
    },
    {
      index: 1,
      itemId: 'epic-one',
      itemName: '에픽 결정 1',
      itemRarity: '에픽',
      tuneLevel: 0,
      tuneRemaining: 3,
      tuneUpgradeable: 0,
      setPoint: 230,
      effects: { attack: 10 },
    },
    {
      index: 99,
      itemId: 'unknown-slot',
      itemName: '알 수 없는 슬롯',
      itemRarity: '에픽',
      tuneLevel: 0,
      tuneRemaining: 1,
      setPoint: 230,
    },
    {
      index: 0,
      simulatedTuneOrder: -1,
      itemId: 'unique-epic',
      itemName: '안개 결정 특별판',
      itemRarity: '에픽',
      tuneLevel: 0,
      tuneRemaining: 3,
      setPoint: 230,
    },
    {
      index: 2,
      itemId: 'disabled',
      itemName: '조율 불가',
      itemRarity: '에픽',
      tuneLevel: 0,
      tuneRemaining: 3,
      tuneUpgradeable: false,
      setPoint: 230,
    },
    {
      index: 3,
      itemId: 'maxed',
      itemName: '최대 조율',
      itemRarity: '에픽',
      tuneLevel: 3,
      tuneRemaining: 3,
      setPoint: 230,
    },
    {
      index: 4,
      itemId: 'unsupported',
      itemName: '지원하지 않는 등급',
      itemRarity: '유니크',
      tuneLevel: 0,
      tuneRemaining: 3,
      setPoint: 230,
    },
  ],
};
const materialPrices = {
  legendarySoul: {
    itemId: 'legendary-soul',
    label: '레전더리 소울',
    iconUrl: 'legendary.png',
    auction: { minUnitPrice: 7 },
  },
  epicSoul: {
    itemId: 'epic-soul',
    label: '에픽 소울',
    iconUrl: 'epic.png',
    auction: { minUnitPrice: 11 },
  },
};
const unlockedEquipment = [{ tuneSetPoint: 2550 }];
const prePrimevalRows = progression.getOathTuneRows(
  deepFreeze(clone(baseOath)),
  deepFreeze(clone(oathTuneDb)),
  deepFreeze(clone(materialPrices)),
  deepFreeze(clone(unlockedEquipment)),
  null,
);
assert.equal(prePrimevalRows.length, 1);
const prePrimevalRow = prePrimevalRows[0];
assert.equal(prePrimevalRow.metricType, undefined);
assert.equal(Object.prototype.hasOwnProperty.call(prePrimevalRow, 'tunePlan'), false);
assert.deepEqual(prePrimevalRow.tuneSteps.map((step) => step.tuneCount), [2]);
assert.equal(prePrimevalRow.currentOathStageName, '에픽');
assert.equal(prePrimevalRow.targetOathStageName, '태초');
assert.equal(prePrimevalRow.expectedGold, 300);
assert.deepEqual(
  prePrimevalRow.expectedMaterials.map(({ key, amount, itemId, mode }) => [key, amount, itemId, mode]),
  [
    ['legendarySoul', 2, 'legendary-soul', 'oathTune'],
    ['epicSoul', 3, 'epic-soul', 'oathTune'],
  ],
);
assert.deepEqual(
  prePrimevalRow.tuneSteps[0].tunePlan.steps.map(({ slot, fromTuneLevel, toTuneLevel }) => (
    [slot, fromTuneLevel, toTuneLevel]
  )),
  [
    [9, 0, 1],
    [1, 0, 1],
  ],
);
assert.equal(prePrimevalRow.effects.skillDamageMultiplier > 1, true);

assert.deepEqual(
  progression.getOathTuneRows(baseOath, oathTuneDb, materialPrices, [{ tuneSetPoint: 2549 }]),
  [],
);
assert.deepEqual(
  progression.getOathTuneRows(
    { ...baseOath, crystals: [baseOath.crystals[1]] },
    oathTuneDb,
    materialPrices,
    unlockedEquipment,
  ),
  [],
);

const postPrimevalOath = {
  ...clone(baseOath),
  setPoint: 2550,
  setRarityName: '태초',
};
const dealerRows = progression.getOathTuneRows(
  postPrimevalOath,
  oathTuneDb,
  materialPrices,
  unlockedEquipment,
);
const bufferRows = progression.getOathTuneRows(
  postPrimevalOath,
  oathTuneDb,
  materialPrices,
  unlockedEquipment,
  { isBuffer: true },
);
assert.deepEqual(dealerRows[0].tuneSteps.map((step) => step.tuneCount), [3, 5, 8]);
assert.deepEqual(bufferRows[0].tuneSteps.map((step) => step.tuneCount), [3, 5, 8]);
assert.equal(dealerRows[0].metricType, undefined);
assert.equal(bufferRows[0].metricType, 'buffer');
assert.ok(dealerRows[0].tuneSteps[0].effects.skillDamageMultiplier > 1);
assert.deepEqual(bufferRows[0].tuneSteps[0].effects, { buffPower: 100 });
assert.deepEqual(
  dealerRows[0].tuneSteps[2].tunePlan.steps.map((step) => step.slot),
  [9, 1, 1, 1, 5, 5, 5, 99],
);

const planBase = deepFreeze(clone(baseOath));
const plan = deepFreeze({
  steps: [],
  slotChanges: [
    { slot: 9, fromTuneLevel: 0, toTuneLevel: 1, count: 1 },
    { slot: 1, fromTuneLevel: 0, toTuneLevel: 2, count: 2 },
  ],
});
const applied = progression.applyOathTunePlan(planBase, plan, 10, 3);
assert.notEqual(applied, planBase);
assert.notEqual(applied.crystals, planBase.crystals);
assert.equal(applied.setPoint, 2560);
assert.equal(applied.setRarityName, '에픽');
assert.deepEqual(
  applied.crystals.filter((crystal) => [9, 1].includes(crystal.index))
    .map((crystal) => [crystal.index, crystal.tuneLevel, crystal.tuneRemaining, crystal.setPoint]),
  [
    [9, 1, 0, 240],
    [1, 2, 1, 250],
  ],
);
assert.deepEqual(planBase, baseOath);
assert.equal(progression.applyOathTunePlan(baseOath, { steps: [], slotChanges: [] }), null);
assert.equal(progression.applyOathTunePlan(baseOath, {
  steps: [{ slot: 9 }],
  slotChanges: [{ slot: 9, fromTuneLevel: 0, toTuneLevel: 2, count: 2 }],
}), null);
assert.equal(progression.applyOathTunePlan(baseOath, {
  steps: [],
  slotChanges: [{ slot: 9, fromTuneLevel: 1, toTuneLevel: 2, count: 1 }],
}), null);
assert.equal(progression.applyOathTunePlan(baseOath, {
  steps: [],
  slotChanges: [{ slot: 9, fromTuneLevel: 0, toTuneLevel: 4, count: 4 }],
}), null);

const changedSlots = progression.getChangedOathTuneSlots(
  {
    crystals: [
      { index: 1, itemId: 'one', tuneLevel: 0, effects: { allStat: 1 }, setPoint: 10 },
      { index: 2, itemId: 'two', tuneLevel: 1, effects: { allStat: 2 }, setPoint: 20 },
    ],
  },
  {
    crystals: [
      { index: 2, itemId: 'two', tuneLevel: 1, effects: { allStat: 999 }, setPoint: 999 },
      { index: 1, itemId: 'one-new', tuneLevel: 0, effects: { allStat: 1 }, setPoint: 10 },
      { index: 3, itemId: 'three', tuneLevel: 1 },
    ],
  },
);
assert.deepEqual(changedSlots, ['oath:1', 'oath:3']);

assert.deepEqual(progression.getOathCrystalEffectsTotal({
  crystals: [
    { effects: { allStat: 5, finalDamage: 10 } },
    { effects: { allStat: 7, finalDamage: 20, attack: 3 } },
  ],
}), { allStat: 12, finalDamage: 30, attack: 3 });
closeTo(
  progression.getOathCrystalFinalDamageChangeMultiplier(
    { crystals: [{ effects: { finalDamage: 10 } }, { effects: { finalDamage: 20 } }] },
    { crystals: [{ effects: { finalDamage: 5 } }, { effects: { finalDamage: 30 } }] },
  ),
  (1.05 * 1.3) / (1.1 * 1.2),
);
closeTo(
  progression.getOathTuneDamageMultiplier(
    oathTuneDb,
    { setPoint: 2550 },
    { setPoint: 2580 },
  ),
  stateAt2580.damageMultiplier / stateAt2550.damageMultiplier,
);
assert.equal(progression.getOathTuneDamageMultiplier({}, { setPoint: 1 }, { setPoint: 2 }), 1);

assert.deepEqual(
  progression.getBufferOathTuneBaseRelativeChanges({ sourceType: 'oathTune', effects: { buffPower: 100 } }),
  { buffPowerDelta: 100 },
);
assert.equal(
  progression.getBufferOathTuneBaseRelativeChanges({ sourceType: 'oathTune', effects: { buffPower: 0 } }),
  null,
);
assert.equal(
  progression.getBufferOathTuneBaseRelativeChanges({ sourceType: 'equipmentTune', effects: { buffPower: 100 } }),
  null,
);

const identityRow = {
  sourceType: 'oathTune',
  currentSetPoint: 2550,
  tuneSteps: [
    { targetSetPoint: 2580, tuneCount: 3 },
    { targetSetPoint: 2600, tuneCount: 5 },
  ],
};
assert.equal(progression.getOathTuneExclusiveGroupKey(identityRow), 'oathTune');
assert.equal(
  progression.getOathTuneCandidateSignature(identityRow),
  'oathTune:2550:2580:3,2600:5',
);
assert.equal(progression.getOathTuneExclusiveGroupKey({ sourceType: 'equipmentTune' }), '');
assert.equal(progression.getOathTuneCandidateSignature({ sourceType: 'equipmentTune' }), '');

const baseBeforeRows = clone(baseOath);
const dbBeforeRows = clone(oathTuneDb);
const pricesBeforeRows = clone(materialPrices);
const equipmentBeforeRows = clone(unlockedEquipment);
progression.getOathTuneRows(baseOath, oathTuneDb, materialPrices, unlockedEquipment, { isBuffer: true });
assert.deepEqual(baseOath, baseBeforeRows);
assert.deepEqual(oathTuneDb, dbBeforeRows);
assert.deepEqual(materialPrices, pricesBeforeRows);
assert.deepEqual(unlockedEquipment, equipmentBeforeRows);

console.log('enchant oath progression: ok');
