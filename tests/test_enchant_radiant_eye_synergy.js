import assert from 'node:assert/strict';
import {
  countRadiantEyeArmor,
  getRadiantEyeBufferPower,
  getRadiantEyeBufferRecommendationPower,
  getRadiantEyeDealerMultiplier,
  getRadiantEyeDealerRecommendationMultiplier,
  getRadiantEyeEquipmentScoreMultiplier,
} from '../src/dnfHellTool/enchantRadiantEyeSynergy.js';

const eye = {
  slotId: 'RING',
  slot: '반지',
  itemId: 'radiant-eye',
  itemName: '광휘를 머금은 눈동자',
  conditionalEffects: {
    sanctifiedArmorSynergy: {
      dealerFinalDamagePercentPerItem: 1,
      bufferBuffPowerPerItem: 200,
      maxCount: 5,
      eligibleStages: ['consecrated', 'relic'],
    },
  },
};
const equipment = [
  eye,
  { slotId: 'SHOULDER', itemId: 'base-shoulder', raidArmorStage: 'base' },
  { slotId: 'JACKET', itemId: 'consecrated-jacket', raidArmorStage: 'consecrated' },
  { slotId: 'PANTS', itemId: 'relic-pants', raidArmorStage: 'relic' },
  { slotId: 'WAIST', itemId: 'encroached-waist', raidArmorStage: 'encroached' },
  { slotId: 'SHOES', itemId: 'plain-shoes', raidArmorStage: '' },
];

assert.equal(countRadiantEyeArmor(equipment), 2);
assert.equal(getRadiantEyeDealerMultiplier(equipment), 1.01 ** 2);
assert.equal(getRadiantEyeEquipmentScoreMultiplier(equipment), 1.01 ** 5);
assert.equal(getRadiantEyeBufferPower(equipment), 400);

const craftRow = {
  sourceType: 'relicCraft',
  currentEquipmentBody: {
    slotId: 'RING',
    itemId: 'current-ring',
    itemName: '현재 반지',
  },
  targetEquipmentBody: eye,
};
const withoutEye = equipment.map((row) => (
  row.slotId === 'RING' ? craftRow.currentEquipmentBody : row
));
assert.equal(getRadiantEyeEquipmentScoreMultiplier(withoutEye), 1);
assert.equal(getRadiantEyeDealerRecommendationMultiplier(craftRow, withoutEye), 1.01 ** 2);
assert.equal(getRadiantEyeBufferRecommendationPower(craftRow, withoutEye, false), 0);
assert.equal(getRadiantEyeBufferRecommendationPower(craftRow, withoutEye, true), 400);

const armorUpgradeRow = {
  sourceType: 'raidArmorUpgrade',
  currentEquipmentBody: equipment[1],
  targetEquipmentBody: {
    ...equipment[1],
    itemId: 'consecrated-shoulder',
    raidArmorStage: 'consecrated',
  },
};
assert.ok(
  Math.abs(getRadiantEyeDealerRecommendationMultiplier(armorUpgradeRow, equipment) - 1.01) < 1e-12,
);
assert.equal(getRadiantEyeBufferRecommendationPower(armorUpgradeRow, equipment, true), 600);

console.log('enchant radiant eye synergy: ok');
