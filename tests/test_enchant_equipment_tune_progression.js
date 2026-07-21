import assert from 'node:assert/strict';
import * as equipmentTuneModule from '../src/dnfHellTool/enchantEquipmentTuneProgression.js';

const {
  EQUIPMENT_TUNE_MIN_SET_POINT,
  EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE,
  createEnchantEquipmentTuneProgression,
} = equipmentTuneModule;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function cloneSimulatorValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return clone(value);
}

function applyUpgradeMaterialPrices(materials = [], upgradeMode = '', materialPrices = {}) {
  return (materials || []).map((material) => {
    const priceRow = materialPrices?.[material.key] || {};
    return {
      ...material,
      priceKey: material.key,
      auction: priceRow.auction || material.auction || {},
      itemId: priceRow.itemId || material.itemId || '',
      itemName: priceRow.label || material.itemName || material.label || '',
      iconUrl: priceRow.iconUrl || material.iconUrl || '',
      upgradeMode,
    };
  });
}

const upgradeMaterialLabels = {
  legendarySoul: '레전더리 소울',
  epicSoul: '에픽 소울',
};

const progression = createEnchantEquipmentTuneProgression({
  applyUpgradeMaterialPrices,
  cloneSimulatorValue,
  upgradeMaterialLabels,
});

assert.deepEqual(new Set(Object.keys(equipmentTuneModule)), new Set([
  'EQUIPMENT_TUNE_MIN_SET_POINT',
  'EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE',
  'EQUIPMENT_TUNE_MEMORY_BUFF_POWER',
  'createEnchantEquipmentTuneProgression',
]));
assert.equal(EQUIPMENT_TUNE_MIN_SET_POINT, 2550);
assert.equal(EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE, 2);
assert.deepEqual(Object.keys(progression), [
  'getBufferEquipmentTuneBaseRelativeChanges',
  'getEquipmentTuneStage',
  'getEquipmentTuneSetPoint',
  'getEquipmentTuneDamageMultiplier',
  'applyEquipmentTunePlan',
  'getChangedEquipmentTuneSlots',
  'getEquipmentTuneRows',
  'getEquipmentTuneExclusiveGroupKey',
  'getEquipmentTuneCandidateSignature',
]);

for (const [point, expectedStage] of [
  [undefined, 0],
  [null, 0],
  [-1, 0],
  [2549, 0],
  [2550, 0],
  [2619, 0],
  [2620, 1],
  [2689, 1],
  [2690, 2],
  [2760, 3],
  [Number.POSITIVE_INFINITY, 0],
  ['not-a-number', 0],
]) {
  assert.equal(progression.getEquipmentTuneStage(point), expectedStage);
}

assert.equal(progression.getEquipmentTuneSetPoint([
  { tuneSetPoint: 2550 },
  { tuneSetPoint: '70' },
  { tuneSetPoint: 'not-a-number' },
  {},
]), 2620);
assert.equal(progression.getEquipmentTuneSetPoint(null), 0);

assert.equal(
  progression.getEquipmentTuneDamageMultiplier(
    [{ tuneSetPoint: 2619 }],
    [{ tuneSetPoint: 2620 }],
  ),
  1.02,
);
assert.equal(
  progression.getEquipmentTuneDamageMultiplier(
    [{ tuneSetPoint: 2620 }],
    [{ tuneSetPoint: 2690 }],
  ),
  1.04 / 1.02,
);
assert.equal(
  progression.getEquipmentTuneDamageMultiplier([{ tuneSetPoint: 2690 }]),
  1,
);

const materialPrices = {
  legendarySoul: {
    itemId: 'legendary-soul',
    label: '가격표 레전더리 소울',
    iconUrl: 'legendary.png',
    auction: { minUnitPrice: 100 },
  },
  epicSoul: {
    itemId: 'epic-soul',
    label: '가격표 에픽 소울',
    iconUrl: 'epic.png',
    auction: { minUnitPrice: 200 },
  },
};

const equipment = [
  {
    slot: '벨트',
    itemRarity: '에픽',
    itemName: '에픽 벨트',
    iconUrl: 'first-eligible.png',
    tuneLevel: 0,
    tuneRemaining: 3,
    tuneSetPoint: 0,
  },
  {
    slot: '알 수 없음',
    itemRarity: '레전더리',
    itemName: '레전더리 미지 슬롯',
    tuneLevel: 2,
    tuneRemaining: 1,
    tuneSetPoint: 0,
  },
  {
    slot: '상의',
    itemRarity: '레전더리',
    itemName: '레전더리 상의',
    tuneLevel: 0,
    tuneRemaining: 3,
    tuneSetPoint: 0,
  },
  {
    slot: '머리어깨',
    itemRarity: '레전더리',
    itemName: '레전더리 어깨',
    tuneLevel: 1,
    tuneRemaining: 2,
    tuneSetPoint: 0,
  },
  {
    slot: '신발',
    itemRarity: '에픽',
    itemName: '에픽 신발',
    tuneLevel: 0,
    tuneRemaining: 3,
    tuneSetPoint: 0,
  },
  {
    slot: '무기',
    itemRarity: '에픽',
    itemName: '에픽 무기',
    tuneLevel: 2,
    tuneRemaining: 1,
    tuneSetPoint: 0,
  },
  {
    slot: '팔찌',
    itemRarity: '에픽',
    itemName: '에픽 팔찌',
    tuneLevel: 2,
    tuneRemaining: 1,
    tuneSetPoint: 0,
  },
  {
    slot: '보조장비',
    itemRarity: '태초',
    itemName: '태초 심장',
    tuneLevel: 0,
    tuneRemaining: 3,
    tuneSetPoint: 2550,
  },
  {
    slot: '목걸이',
    itemRarity: '에픽',
    itemName: '고유 : 조율 제외',
    tuneLevel: 0,
    tuneRemaining: 3,
    tuneSetPoint: 0,
  },
  {
    slot: '반지',
    itemRarity: '레전더리',
    itemName: '업그레이드 불가',
    tuneLevel: 0,
    tuneRemaining: 3,
    tuneUpgradeable: false,
    tuneSetPoint: 0,
  },
  {
    slot: '귀걸이',
    itemRarity: '에픽',
    itemName: '이미 최대 조율',
    tuneLevel: 3,
    tuneRemaining: 3,
    tuneSetPoint: 0,
  },
  {
    slot: '마법석',
    itemRarity: '레전더리',
    itemName: '잘못된 조율 레벨',
    tuneLevel: 'not-a-number',
    tuneRemaining: 3,
    tuneSetPoint: 0,
  },
];

const equipmentBefore = clone(equipment);
const pricesBefore = clone(materialPrices);
const labelsBefore = clone(upgradeMaterialLabels);
const dealerRows = progression.getEquipmentTuneRows(
  deepFreeze(clone(equipment)),
  deepFreeze(clone(materialPrices)),
  null,
);
assert.deepEqual(equipment, equipmentBefore);
assert.deepEqual(materialPrices, pricesBefore);
assert.deepEqual(upgradeMaterialLabels, labelsBefore);
assert.equal(dealerRows.length, 1);

const dealerRow = dealerRows[0];
assert.deepEqual(Object.keys(dealerRow), [
  'sourceType',
  'slot',
  'tier',
  'itemName',
  'itemRarity',
  'iconUrl',
  'itemExplain',
  'effects',
  'auction',
  'expectedGold',
  'expectedMaterials',
  'tunePlan',
  'tuneSteps',
  'selectedTuneStepIndex',
  'currentSetPoint',
  'targetSetPoint',
  'currentTuneFinalDamage',
  'targetTuneFinalDamage',
  'currentTuneBuffPower',
  'targetTuneBuffPower',
  'tuneCount',
]);
assert.deepEqual({
  sourceType: dealerRow.sourceType,
  slot: dealerRow.slot,
  tier: dealerRow.tier,
  itemName: dealerRow.itemName,
  itemRarity: dealerRow.itemRarity,
  iconUrl: dealerRow.iconUrl,
  itemExplain: dealerRow.itemExplain,
  selectedTuneStepIndex: dealerRow.selectedTuneStepIndex,
}, {
  sourceType: 'equipmentTune',
  slot: '장비 조율',
  tier: '조율',
  itemName: '장비 조율',
  itemRarity: '',
  iconUrl: 'first-eligible.png',
  itemExplain: '',
  selectedTuneStepIndex: 0,
});
assert.deepEqual({
  effects: dealerRow.effects,
  auction: dealerRow.auction,
  expectedGold: dealerRow.expectedGold,
  currentSetPoint: dealerRow.currentSetPoint,
  targetSetPoint: dealerRow.targetSetPoint,
  currentTuneFinalDamage: dealerRow.currentTuneFinalDamage,
  targetTuneFinalDamage: dealerRow.targetTuneFinalDamage,
  currentTuneBuffPower: dealerRow.currentTuneBuffPower,
  targetTuneBuffPower: dealerRow.targetTuneBuffPower,
  tuneCount: dealerRow.tuneCount,
}, {
  effects: { skillDamageMultiplier: 1.02 },
  auction: { minUnitPrice: 5000000 },
  expectedGold: 5000000,
  currentSetPoint: 2550,
  targetSetPoint: 2620,
  currentTuneFinalDamage: 0,
  targetTuneFinalDamage: 2,
  currentTuneBuffPower: 0,
  targetTuneBuffPower: 400,
  tuneCount: 7,
});
assert.equal(dealerRow.tuneSteps.length, 1);
assert.deepEqual(
  dealerRow.tuneSteps.map((step) => ({
    index: step.index,
    tuneCount: step.tuneCount,
    currentSetPoint: step.currentSetPoint,
    targetSetPoint: step.targetSetPoint,
    currentFinalDamage: step.currentFinalDamage,
    targetFinalDamage: step.targetFinalDamage,
    currentBuffPower: step.currentBuffPower,
    targetBuffPower: step.targetBuffPower,
    expectedGold: step.expectedGold,
    effects: step.effects,
  })),
  [
    {
      index: 0,
      tuneCount: 7,
      currentSetPoint: 2550,
      targetSetPoint: 2620,
      currentFinalDamage: 0,
      targetFinalDamage: 2,
      currentBuffPower: 0,
      targetBuffPower: 400,
      expectedGold: 5000000,
      effects: { skillDamageMultiplier: 1.02 },
    },
  ],
);
assert.deepEqual(
  dealerRow.tuneSteps[0].tunePlan.slotChanges,
  [
    { slot: '머리어깨', fromTuneLevel: 1, toTuneLevel: 3, count: 2 },
    { slot: '상의', fromTuneLevel: 0, toTuneLevel: 3, count: 3 },
    { slot: '벨트', fromTuneLevel: 0, toTuneLevel: 2, count: 2 },
  ],
);
assert.deepEqual(
  dealerRow.tuneSteps[0].tunePlan.steps.map((step) => [
    step.slot,
    step.fromTuneLevel,
    step.toTuneLevel,
  ]),
  [
    ['머리어깨', 1, 2],
    ['머리어깨', 2, 3],
    ['상의', 0, 1],
    ['상의', 1, 2],
    ['상의', 2, 3],
    ['벨트', 0, 1],
    ['벨트', 1, 2],
  ],
);
assert.deepEqual(
  dealerRow.expectedMaterials.map((material) => ({
    key: material.key,
    label: material.label,
    amount: material.amount,
    priceKey: material.priceKey,
    auction: material.auction,
    itemId: material.itemId,
    itemName: material.itemName,
    iconUrl: material.iconUrl,
    upgradeMode: material.upgradeMode,
  })),
  [
    {
      key: 'legendarySoul',
      label: '레전더리 소울',
      amount: 100,
      priceKey: 'legendarySoul',
      auction: { minUnitPrice: 100 },
      itemId: 'legendary-soul',
      itemName: '레전더리 소울',
      iconUrl: 'legendary.png',
      upgradeMode: 'equipmentTune',
    },
    {
      key: 'epicSoul',
      label: '에픽 소울',
      amount: 20,
      priceKey: 'epicSoul',
      auction: { minUnitPrice: 200 },
      itemId: 'epic-soul',
      itemName: '에픽 소울',
      iconUrl: 'epic.png',
      upgradeMode: 'equipmentTune',
    },
  ],
);
assert.notEqual(dealerRow.tunePlan, dealerRow.tuneSteps[0].tunePlan);
assert.deepEqual(dealerRow.tunePlan, dealerRow.tuneSteps[0].tunePlan);

const bufferRows = progression.getEquipmentTuneRows(
  deepFreeze(clone(equipment)),
  deepFreeze(clone(materialPrices)),
  { isBuffer: true },
);
assert.equal(bufferRows.length, 1);
assert.deepEqual(bufferRows[0].effects, { buffPower: 400 });
assert.equal(bufferRows[0].expectedGold, 5000000);
assert.deepEqual(bufferRows[0].auction, { minUnitPrice: 5000000 });
assert.deepEqual(
  bufferRows[0].tuneSteps.map((step) => step.effects),
  [{ buffPower: 400 }],
);
assert.deepEqual(
  Object.keys(bufferRows[0]),
  Object.keys(dealerRow),
);
assert.deepEqual(bufferRows[0].tunePlan, dealerRow.tunePlan);

assert.deepEqual(
  progression.getEquipmentTuneRows([
    { itemRarity: '에픽', tuneLevel: 0, tuneRemaining: 3, tuneSetPoint: 2549 },
  ]),
  [],
);
assert.deepEqual(
  progression.getEquipmentTuneRows([
    { slot: '상의', itemRarity: '에픽', tuneLevel: 0, tuneRemaining: 3, tuneSetPoint: 2550 },
    { slot: '하의', itemRarity: '에픽', tuneLevel: 0, tuneRemaining: 3, tuneSetPoint: 0 },
  ]),
  [],
);
assert.deepEqual(
  progression.getEquipmentTuneRows([
    { slot: '상의', itemRarity: '태초', tuneLevel: 0, tuneRemaining: 3, tuneSetPoint: 2550 },
  ]),
  [],
);

const anniversaryEquipment = [
  { slot: '상의', itemRarity: '태초', tuneLevel: 0, tuneRemaining: 0, tuneSetPoint: 2120 },
  { slot: '보조장비', itemRarity: '태초', tuneLevel: 0, tuneRemaining: 0, tuneSetPoint: 145 },
  { slot: '귀걸이', itemRarity: '에픽', tuneLevel: 0, tuneRemaining: 3, tuneSetPoint: 215 },
  { slot: '마법석', itemRarity: '에픽', tuneLevel: 0, tuneRemaining: 3, tuneSetPoint: 215 },
  {
    slot: '보조무기',
    itemRarity: '에픽',
    itemName: '살룡검 발뭉',
    tuneLevel: 0,
    tuneRemaining: 3,
    tuneUpgradeable: true,
    tuneSetPoint: 0,
  },
];
assert.equal(progression.getEquipmentTuneSetPoint(anniversaryEquipment), 2695);
assert.deepEqual(
  progression.getEquipmentTuneRows(anniversaryEquipment, materialPrices),
  [],
);

const normalSevenTuneRows = progression.getEquipmentTuneRows([
  ...anniversaryEquipment.filter((row) => row.slot !== '보조무기'),
  {
    slot: '무기',
    itemRarity: '에픽',
    itemName: '정상 조율 무기',
    tuneLevel: 2,
    tuneRemaining: 1,
    tuneUpgradeable: true,
    tuneSetPoint: 0,
  },
], materialPrices);
assert.equal(normalSevenTuneRows.length, 1);
assert.deepEqual({
  currentSetPoint: normalSevenTuneRows[0].currentSetPoint,
  targetSetPoint: normalSevenTuneRows[0].targetSetPoint,
  tuneCount: normalSevenTuneRows[0].tuneCount,
  slotChanges: normalSevenTuneRows[0].tunePlan.slotChanges,
}, {
  currentSetPoint: 2695,
  targetSetPoint: 2765,
  tuneCount: 7,
  slotChanges: [
    { slot: '무기', fromTuneLevel: 2, toTuneLevel: 3, count: 1 },
    { slot: '귀걸이', fromTuneLevel: 0, toTuneLevel: 3, count: 3 },
    { slot: '마법석', fromTuneLevel: 0, toTuneLevel: 3, count: 3 },
  ],
});

const planEquipment = equipment.filter((row) => row.slot !== '마법석');
const planEquipmentBefore = clone(planEquipment);
const validPlan = deepFreeze(clone(dealerRow.tunePlan));
const validInput = deepFreeze(clone(planEquipment));
const applied = progression.applyEquipmentTunePlan(validInput, validPlan);
assert.ok(applied);
assert.notEqual(applied, validInput);
assert.deepEqual(validInput, planEquipmentBefore);
assert.deepEqual(validPlan, dealerRow.tunePlan);
const appliedBySlot = new Map(applied.map((row) => [row.slot, row]));
assert.deepEqual(
  ['머리어깨', '상의', '벨트'].map((slot) => ({
    slot,
    tuneLevel: appliedBySlot.get(slot).tuneLevel,
    tuneSetPoint: appliedBySlot.get(slot).tuneSetPoint,
    tuneRemaining: appliedBySlot.get(slot).tuneRemaining,
  })),
  [
    { slot: '머리어깨', tuneLevel: 3, tuneSetPoint: 20, tuneRemaining: 0 },
    { slot: '상의', tuneLevel: 3, tuneSetPoint: 30, tuneRemaining: 0 },
    { slot: '벨트', tuneLevel: 2, tuneSetPoint: 20, tuneRemaining: 1 },
  ],
);
assert.equal(progression.getEquipmentTuneSetPoint(applied), 2620);
assert.deepEqual(
  progression.getChangedEquipmentTuneSlots(equipment, applied),
  ['벨트', '상의', '머리어깨'],
);

const planWithoutSteps = progression.applyEquipmentTunePlan(planEquipment, {
  slotChanges: [{ slot: '상의', fromTuneLevel: 0, toTuneLevel: 1, count: 1 }],
  steps: [],
});
assert.ok(planWithoutSteps);
assert.equal(planWithoutSteps.find((row) => row.slot === '상의').tuneLevel, 1);
assert.deepEqual(planEquipment, planEquipmentBefore);

for (const invalidPlan of [
  {},
  { slotChanges: [], steps: [] },
  {
    slotChanges: [{ slot: '없는 슬롯', fromTuneLevel: 0, toTuneLevel: 1, count: 1 }],
    steps: [{ slot: '없는 슬롯', fromTuneLevel: 0, toTuneLevel: 1 }],
  },
  {
    slotChanges: [{ slot: '상의', fromTuneLevel: 1, toTuneLevel: 2, count: 1 }],
    steps: [{ slot: '상의', fromTuneLevel: 1, toTuneLevel: 2 }],
  },
  {
    slotChanges: [{ slot: '상의', fromTuneLevel: 0, toTuneLevel: 2, count: 1 }],
    steps: [{ slot: '상의', fromTuneLevel: 0, toTuneLevel: 1 }],
  },
  {
    slotChanges: [{ slot: '상의', fromTuneLevel: 0, toTuneLevel: 4, count: 4 }],
    steps: [
      { slot: '상의', fromTuneLevel: 0, toTuneLevel: 1 },
      { slot: '상의', fromTuneLevel: 1, toTuneLevel: 2 },
      { slot: '상의', fromTuneLevel: 2, toTuneLevel: 3 },
      { slot: '상의', fromTuneLevel: 3, toTuneLevel: 4 },
    ],
  },
  {
    slotChanges: [{ slot: '상의', fromTuneLevel: 0, toTuneLevel: 1, count: 1 }],
    steps: [
      { slot: '상의', fromTuneLevel: 0, toTuneLevel: 1 },
      { slot: '상의', fromTuneLevel: 1, toTuneLevel: 2 },
    ],
  },
]) {
  assert.equal(progression.applyEquipmentTunePlan(equipment, invalidPlan), null);
  assert.deepEqual(equipment, equipmentBefore);
}

const previousRows = [
  { slot: 'A', tuneLevel: 0 },
  { slot: 'B', tuneLevel: 1 },
  { slot: 'C', tuneLevel: 2 },
];
const nextRows = [
  { slot: 'C', tuneLevel: 3 },
  { slot: 'A', tuneLevel: 0 },
  { slot: 'D', tuneLevel: 1 },
  { slot: 'B', tuneLevel: 0 },
  { slot: 'E', tuneLevel: 0 },
  { tuneLevel: 2 },
];
assert.deepEqual(
  progression.getChangedEquipmentTuneSlots(previousRows, nextRows),
  ['C', 'D', 'B'],
);

assert.equal(
  progression.getEquipmentTuneExclusiveGroupKey(dealerRow),
  'equipmentTune',
);
assert.equal(
  progression.getEquipmentTuneExclusiveGroupKey({ ...dealerRow, sourceType: 'oathTune' }),
  '',
);
assert.equal(
  progression.getEquipmentTuneCandidateSignature(dealerRow),
  'equipmentTune:2550:2620:7',
);
assert.equal(
  progression.getEquipmentTuneCandidateSignature({
    sourceType: 'equipmentTune',
    currentSetPoint: 0,
    tuneSteps: [{ currentSetPoint: 2620, targetSetPoint: 2690, tuneCount: 7 }],
  }),
  'equipmentTune:2620:2690:7',
);
assert.equal(
  progression.getEquipmentTuneCandidateSignature({ sourceType: 'oathTune' }),
  '',
);

assert.deepEqual(
  progression.getBufferEquipmentTuneBaseRelativeChanges({
    sourceType: 'equipmentTune',
    effects: { buffPower: '400' },
  }),
  { buffPowerDelta: 400 },
);
for (const row of [
  { sourceType: 'oathTune', effects: { buffPower: 400 } },
  { sourceType: 'equipmentTune', effects: { buffPower: 0 } },
  { sourceType: 'equipmentTune', effects: { buffPower: -1 } },
  { sourceType: 'equipmentTune', effects: { buffPower: 'not-a-number' } },
]) {
  assert.equal(progression.getBufferEquipmentTuneBaseRelativeChanges(row), null);
}

console.log('enchant equipment tune progression: ok');
