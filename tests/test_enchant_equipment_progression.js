import assert from 'node:assert/strict';
import {
  UPGRADE_SLOT_LABELS,
  createEnchantEquipmentProgression,
} from '../src/dnfHellTool/enchantEquipmentProgression.js';

function addEffects(...rows) {
  return rows.reduce((result, effects) => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      result[key] = Number(result[key] || 0) + Number(value || 0);
    });
    return result;
  }, {});
}

function subtractEffects(nextEffects = {}, currentEffects = {}) {
  const result = {};
  new Set([...Object.keys(nextEffects), ...Object.keys(currentEffects)]).forEach((key) => {
    const value = Number(nextEffects[key] || 0) - Number(currentEffects[key] || 0);
    if (Number.isFinite(value) && Math.abs(value) > 0.000001) result[key] = value;
  });
  return result;
}

function estimateDamageMultiplier(effects = {}) {
  return (1 + Number(effects.finalDamage || 0) / 100)
    * (1 + Number(effects.attack || 0) / 1000)
    * (1 + Number(effects.allStat || 0) / 10000);
}

function estimateDamagePercent(effects = {}) {
  return (estimateDamageMultiplier(effects) - 1) * 100;
}

function getUpgradeMaterials(stepCost = {}) {
  return Object.entries(stepCost || {})
    .filter(([key, value]) => key !== 'gold' && Number(value) > 0)
    .map(([key, value]) => ({ key, label: key, amount: Number(value) }));
}

function applyUpgradeMaterialPrices(materials = [], mode = '', materialPrices = {}) {
  return materials.map((material) => {
    const priceKey = material.key === 'protectionTicket'
      ? ['reinforcement', 'safeReinforcement'].includes(mode)
        ? 'reinforcementProtectionTicket'
        : 'amplificationProtectionTicket'
      : material.key;
    const price = materialPrices[priceKey] || {};
    return {
      ...material,
      priceKey,
      auction: price.auction || {},
      itemId: price.itemId || '',
      itemName: price.label || material.label,
      iconUrl: price.iconUrl || '',
    };
  });
}

function getFinalDamageReplacementMultiplier(currentEffects = {}, targetEffects = {}) {
  const currentMultiplier = 1 + Number(currentEffects.finalDamage || 0) / 100;
  const targetMultiplier = 1 + Number(targetEffects.finalDamage || 0) / 100;
  return currentMultiplier > 0 && Number.isFinite(targetMultiplier)
    ? targetMultiplier / currentMultiplier
    : 1;
}

const progression = createEnchantEquipmentProgression({
  addEffects,
  subtractEffects,
  estimateDamagePercent,
  estimateDamageMultiplier,
  applyUpgradeMaterialPrices,
  getUpgradeMaterials,
  getFinalDamageReplacementMultiplier,
});

const upgradeDb = {
  reinforcement: {
    effectsByLevel: [
      { level: 8, weapon: { attack: 80 } },
      { level: 10, weapon: { attack: 100 }, specialEquipment: { attack: 50 } },
      { level: 11, weapon: { attack: 120 }, specialEquipment: { attack: 70 } },
      {
        level: 12,
        common: { finalDamage: 2 },
        weapon: { attack: 150 },
        specialEquipment: { attack: 90 },
        armor: { attack: 40 },
        earring: { attack: 100 },
      },
      { level: 13, common: { finalDamage: 4 }, weapon: { attack: 250 }, specialEquipment: { attack: 110 } },
    ],
    weaponRefineIndependentAttackByLevel115: [
      { level: 0, independentAttack: 0 },
      { level: 8, independentAttack: 200 },
    ],
    reinforcement: [
      { level: 12, stepExpected: { weapon: { gold: 500 }, specialEquipment: { gold: 300, lionCore: 3 } } },
      { level: 13, stepExpected: { weapon: { gold: 700 }, specialEquipment: { gold: 450, lionCore: 4 } } },
    ],
    safeWeaponReinforcement: [
      { level: 8, expectedFromZero: { weapon: { gold: 100, lionCore: 1 } } },
      { level: 12, expectedFromZero: { weapon: { gold: 1200, lionCore: 12 } } },
    ],
  },
  amplification: {
    effectsByLevel: [
      { level: 9, weapon: { allStat: 80 }, armor: { allStat: 80 }, specialEquipment: { allStat: 80 } },
      { level: 10, weapon: { allStat: 100 }, armor: { allStat: 100 }, specialEquipment: { allStat: 100 } },
      { level: 11, weapon: { allStat: 300 }, armor: { allStat: 200 }, specialEquipment: { allStat: 300 } },
      {
        level: 12,
        common: { finalDamage: 2 },
        weapon: { allStat: 1000 },
        armor: { allStat: 400 },
        specialEquipment: { allStat: 1000 },
      },
    ],
    normalAmplification: [
      { level: 10, successRatePercent: 100 },
      { level: 11, successRatePercent: 50 },
      { level: 12, successRatePercent: 50 },
    ],
    safeAmplification: [
      { level: 9, expectedFromZero: { weapon: { gold: 80 }, nonWeapon: { gold: 60, contradictionCrystal: 12 } } },
      { level: 10, expectedFromZero: { weapon: { gold: 100 }, nonWeapon: { gold: 100, contradictionCrystal: 20 } } },
    ],
    safeAmplificationEvent: [
      { level: 9, expectedFromZero: { weapon: { gold: 20 }, nonWeapon: { gold: 10, contradictionCrystal: 2 } } },
      { level: 10, expectedFromZero: { weapon: { gold: 50 }, nonWeapon: { gold: 30, contradictionCrystal: 6 } } },
    ],
    rules: {
      normal: {
        goldPerAttempt: { weapon: 20, nonWeapon: 10 },
      },
    },
  },
};

const materialPrices = {
  contradictionCrystal: {
    itemId: 'contradiction',
    label: '모순의 결정체',
    iconUrl: 'contradiction.png',
    auction: { minUnitPrice: 7 },
  },
  lionCore: {
    itemId: 'lion',
    label: '라이언 코어',
    iconUrl: 'lion.png',
    auction: { minUnitPrice: 3 },
  },
  amplificationProtectionTicket: {
    itemId: 'amp-ticket',
    label: '증폭 보호권',
    iconUrl: 'amp-ticket.png',
    auction: { minUnitPrice: 1000 },
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

assert.deepEqual(UPGRADE_SLOT_LABELS, {
  무기: 'weapon',
  상의: 'armor',
  하의: 'armor',
  머리어깨: 'armor',
  벨트: 'armor',
  신발: 'armor',
  팔찌: 'accessory',
  목걸이: 'accessory',
  반지: 'accessory',
  보조장비: 'support',
  마법석: 'magicStone',
  귀걸이: 'earring',
});
assert.deepEqual(Object.keys(progression), [
  'getCumulativeUpgradeEffectsForEquipment',
  'getEquipmentProgressionMode',
  'getEquipmentProgressionEffectsTotal',
  'getEquipmentProgressionFinalDamageChangeMultiplier',
  'getUpgradeRows',
  'getEquipmentProgressionType',
  'getEquipmentProgressionExclusiveGroupKey',
  'getEquipmentProgressionCandidateSignature',
]);

const independentWeapon = {
  slot: '무기',
  itemId: 'weapon-1',
  itemName: '독립 무기',
  iconUrl: 'weapon.png',
  reinforce: 8,
  refine: 8,
  isAmplified: false,
};
const independentBaseline = { attackSource: 'independent' };
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment(
    independentWeapon,
    8,
    'reinforcement',
    upgradeDb,
    independentBaseline,
    false,
  ),
  { attack: 200 },
);
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment(
    independentWeapon,
    12,
    'amplification',
    upgradeDb,
    independentBaseline,
    false,
  ),
  { finalDamage: 2, allStat: 1000, attack: 200 },
);
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment(
    independentWeapon,
    8,
    'reinforcement',
    upgradeDb,
    independentBaseline,
    true,
  ),
  { attack: 80 },
);
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment(
    independentWeapon,
    13,
    'reinforcement',
    upgradeDb,
    independentBaseline,
    false,
  ),
  { finalDamage: 4, attack: 250 },
);
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment(
    { slot: '보조장비' },
    12,
    'reinforcement',
    upgradeDb,
  ),
  { finalDamage: 2, attack: 90 },
);
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment(
    { slot: '마법석' },
    12,
    'reinforcement',
    upgradeDb,
  ),
  { finalDamage: 2, attack: 90 },
);
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment(
    { slot: '귀걸이' },
    12,
    'reinforcement',
    upgradeDb,
  ),
  { finalDamage: 2, attack: 100 },
);
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment(
    { slot: '알 수 없음' },
    99,
    'reinforcement',
    upgradeDb,
  ),
  {},
);
assert.deepEqual(
  progression.getCumulativeUpgradeEffectsForEquipment({}, 0, 'unsupported', upgradeDb),
  {},
);

const aggregateEquipment = [
  independentWeapon,
  { slot: '상의', reinforce: 10, isAmplified: true },
];
assert.deepEqual(
  progression.getEquipmentProgressionEffectsTotal(
    aggregateEquipment,
    upgradeDb,
    independentBaseline,
  ),
  { attack: 200, allStat: 100 },
);
assert.equal(
  progression.getEquipmentProgressionFinalDamageChangeMultiplier(
    [{ slot: '보조장비', reinforce: 11, isAmplified: false }],
    [{ slot: '보조장비', reinforce: 12, isAmplified: false }],
    upgradeDb,
    {},
  ),
  1.02,
);

const matrixEquipment = [
  independentWeapon,
  {
    slot: '보조장비',
    itemId: 'support-1',
    itemName: '보조장비',
    reinforce: 11,
    isAmplified: false,
  },
  {
    slot: '상의',
    itemId: 'armor-1',
    itemName: '상의',
    reinforce: 9,
    isAmplified: true,
  },
  { slot: '지원하지 않음', reinforce: 10, isAmplified: false },
];
const matrixBefore = clone(matrixEquipment);
const dbBefore = clone(upgradeDb);
const pricesBefore = clone(materialPrices);
const dealerRows = progression.getUpgradeRows(
  matrixEquipment,
  upgradeDb,
  independentBaseline,
  null,
  false,
  materialPrices,
);
assert.deepEqual(
  dealerRows.map((row) => [row.slot, row.upgradeMode, row.currentLevel, row.targetLevel]),
  [
    ['무기', 'safeAmplification', 8, 10],
    ['보조장비', 'amplificationConversion', 11, 12],
    ['보조장비', 'reinforcement', 11, 12],
    ['상의', 'safeAmplification', 9, 10],
  ],
);
assert.equal(dealerRows[0].tier, '안전증폭');
assert.equal(dealerRows[0].expectedGold, 100);
assert.ok(dealerRows[0].incrementalDamagePercent > 0);
assert.equal(dealerRows[1].expectedGold, 460);
assert.deepEqual(
  dealerRows[1].expectedMaterials.map(({ key, amount }) => [key, amount]),
  [['contradictionCrystal', 208], ['protectionTicket', 3]],
);
assert.equal(dealerRows[2].expectedGold, 300);
assert.deepEqual(
  dealerRows[2].expectedMaterials.map(({ key, amount, auction }) => [key, amount, auction.minUnitPrice]),
  [['lionCore', 3, 3]],
);
assert.equal(dealerRows[3].expectedGold, 40);

const reinforcementPreferredDb = clone(upgradeDb);
reinforcementPreferredDb.amplification.safeAmplification
  .find((row) => Number(row.level) === 10)
  .expectedFromZero.weapon.gold = 100000;
const reinforcementPreferredRows = progression.getUpgradeRows(
  [independentWeapon],
  reinforcementPreferredDb,
  independentBaseline,
  null,
  false,
  materialPrices,
);
assert.equal(reinforcementPreferredRows[0].upgradeMode, 'safeReinforcement');

const bufferRows = progression.getUpgradeRows(
  matrixEquipment,
  upgradeDb,
  independentBaseline,
  { isBuffer: true },
  false,
  materialPrices,
);
assert.deepEqual(
  bufferRows.map((row) => [row.slot, row.upgradeMode, row.currentLevel, row.targetLevel]),
  [
    ['무기', 'safeReinforcement', 8, 12],
    ['보조장비', 'amplificationConversion', 11, 10],
    ['보조장비', 'reinforcement', 11, 12],
    ['상의', 'safeAmplification', 9, 10],
  ],
);
assert.deepEqual(bufferRows[0].effects, { finalDamage: 2, attack: 70 });
assert.equal(bufferRows[0].expectedGold, 1100);

const hybridRows = progression.getUpgradeRows(
  [{ slot: '상의', itemId: 'armor-2', itemName: '상의', reinforce: 10, isAmplified: true }],
  upgradeDb,
  {},
  null,
  false,
  materialPrices,
);
assert.equal(hybridRows.length, 1);
assert.deepEqual(
  hybridRows[0].expectedMaterials.map(({ key, amount, priceKey }) => [key, amount, priceKey]),
  [
    ['contradictionCrystal', 62, 'contradictionCrystal'],
    ['protectionTicket', 1, 'amplificationProtectionTicket'],
  ],
);
assert.equal(hybridRows[0].expectedGold, 120);
assert.deepEqual(Object.keys(hybridRows[0]), [
  'sourceType',
  'slot',
  'tier',
  'itemName',
  'itemId',
  'itemRarity',
  'iconUrl',
  'effects',
  'itemExplain',
  'auction',
  'expectedGold',
  'expectedMaterials',
  'currentLevel',
  'targetLevel',
  'upgradeMode',
]);

const eventRows = progression.getUpgradeRows(
  [{ slot: '상의', itemId: 'armor-3', reinforce: 9, isAmplified: true }],
  upgradeDb,
  {},
  null,
  true,
  materialPrices,
);
assert.equal(eventRows[0].expectedGold, 20);
assert.deepEqual(
  eventRows[0].expectedMaterials.map(({ key, amount }) => [key, amount]),
  [['contradictionCrystal', 4]],
);

const zeroLevelNonWeaponRows = progression.getUpgradeRows(
  [{ slot: '상의', reinforce: 0, isAmplified: false }],
  upgradeDb,
  {},
  null,
  false,
  materialPrices,
);
assert.deepEqual(
  zeroLevelNonWeaponRows.map((row) => [row.upgradeMode, row.currentLevel, row.targetLevel]),
  [['safeAmplification', 0, 10]],
);

assert.equal(progression.getEquipmentProgressionMode({ isAmplified: true }), 'amplification');
assert.equal(progression.getEquipmentProgressionMode({ isAmplified: 0 }), 'reinforcement');
for (const [upgradeMode, expected] of [
  ['amplification', 'amplify'],
  ['safeAmplification', 'amplify'],
  ['amplificationConversion', 'amplify'],
  ['reinforcement', 'reinforce'],
  ['safeReinforcement', 'reinforce'],
  ['unsupported', ''],
]) {
  assert.equal(progression.getEquipmentProgressionType({ upgradeMode }), expected);
}
const identityRow = {
  sourceType: 'upgrade',
  slot: '귀걸이',
  upgradeMode: 'safeReinforcement',
  targetLevel: '12',
};
assert.equal(
  progression.getEquipmentProgressionExclusiveGroupKey(identityRow),
  'equipmentProgression:귀걸이',
);
assert.equal(
  progression.getEquipmentProgressionCandidateSignature(identityRow),
  'equipmentProgression:귀걸이:reinforce:12',
);
assert.equal(progression.getEquipmentProgressionExclusiveGroupKey({ ...identityRow, sourceType: 'enchant' }), '');
assert.equal(progression.getEquipmentProgressionCandidateSignature({ ...identityRow, targetLevel: 'NaN' }), '');

assert.deepEqual(
  progression.getUpgradeRows(
    [{ slot: '상의', reinforce: 10, isAmplified: true }],
    { reinforcement: {}, amplification: { normalAmplification: [] } },
  ),
  [],
);
assert.deepEqual(progression.getUpgradeRows([{ slot: '없는 슬롯', reinforce: 10 }], upgradeDb), []);
progression.getUpgradeRows(
  deepFreeze(clone(matrixEquipment)),
  deepFreeze(clone(upgradeDb)),
  deepFreeze(clone(independentBaseline)),
  null,
  false,
  deepFreeze(clone(materialPrices)),
);
assert.deepEqual(matrixEquipment, matrixBefore);
assert.deepEqual(upgradeDb, dbBefore);
assert.deepEqual(materialPrices, pricesBefore);
assert.notEqual(dealerRows[2].expectedMaterials, materialPrices.lionCore);
dealerRows[2].expectedMaterials[0].amount = 999;
assert.deepEqual(materialPrices, pricesBefore);

console.log('enchant equipment progression: ok');
