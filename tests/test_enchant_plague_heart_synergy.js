import assert from 'node:assert/strict';
import {
  countBlackFangEquipment,
  getPlagueHeartBufferPower,
  getPlagueHeartBufferRecommendationPower,
  getPlagueHeartConditionalEffectText,
  getPlagueHeartDealerMultiplier,
  getPlagueHeartDealerRecommendationMultiplier,
  getPlagueHeartEquipmentScoreMultiplier,
} from '../src/dnfHellTool/enchantPlagueHeartSynergy.js';

const heartBody = {
  slotId: 'SUPPORT',
  slot: '보조장비',
  itemId: 'heart',
  itemName: '만병을 잉태한 역병의 심장',
  effects: { finalDamage: 65.22, buffPower: 17430 },
  conditionalEffects: {
    blackFangSynergy: {
      dealerFinalDamagePercentPerItem: 3,
      dealerEquipmentScoreMultiplier: 1.092552,
      bufferBuffPowerPerItem: 75,
      maxCount: 3,
      aggregation: 'multiplicative',
    },
  },
};
const normalSupport = {
  slotId: 'SUPPORT',
  slot: '보조장비',
  itemId: 'normal-support',
  itemName: '일반 보조장비',
  effects: { finalDamage: 30, buffPower: 10000 },
};
const blackFang = (slotId, slot, index) => ({
  slotId,
  slot,
  itemId: `black-${index}`,
  itemName: `흑아 : 장비 ${index}`,
  effects: { finalDamage: 40 + index },
});
const normalAccessory = (slotId, slot, index) => ({
  slotId,
  slot,
  itemId: `normal-${index}`,
  itemName: `일반 장비 ${index}`,
  effects: { finalDamage: 30 + index },
});
const blackRows = [
  blackFang('AMULET', '목걸이', 1),
  blackFang('WRIST', '팔찌', 2),
  blackFang('RING', '반지', 3),
];

function assertClose(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function testCountAndStandaloneSynergy() {
  assert.equal(countBlackFangEquipment([normalSupport, ...blackRows]), 3);
  assert.equal(countBlackFangEquipment([normalSupport, ...blackRows, blackFang('AMULET', '목걸이', 4)]), 3);
  assert.equal(getPlagueHeartDealerMultiplier([normalSupport, ...blackRows]), 1);
  assert.equal(getPlagueHeartEquipmentScoreMultiplier([normalSupport, ...blackRows]), 1);
  assert.equal(getPlagueHeartBufferPower([normalSupport, ...blackRows]), 0);
  for (let count = 0; count <= 3; count += 1) {
    const equipment = [heartBody, ...blackRows.slice(0, count)];
    assertClose(getPlagueHeartDealerMultiplier(equipment), 1.03 ** count);
    assertClose(getPlagueHeartEquipmentScoreMultiplier(equipment), 1.092552);
    assert.equal(getPlagueHeartBufferPower(equipment), 75 * count);
  }
}

function testBlackFangFirstThenHeart() {
  const equipment = [normalSupport, ...blackRows.slice(0, 2)];
  const heartRow = {
    sourceType: 'relicCraft',
    slot: '보조장비',
    currentEquipmentBody: normalSupport,
    targetEquipmentBody: heartBody,
  };
  assertClose(getPlagueHeartDealerRecommendationMultiplier(heartRow, equipment), 1.03 ** 2);
  assert.equal(getPlagueHeartBufferRecommendationPower(heartRow, equipment, false), 0);
  assert.equal(getPlagueHeartBufferRecommendationPower(heartRow, equipment, true), 150);
}

function testHeartFirstThenBlackFang() {
  const currentNecklace = normalAccessory('AMULET', '목걸이', 1);
  const equipment = [heartBody, currentNecklace, ...blackRows.slice(1, 3)];
  const blackFangRow = {
    sourceType: 'blackFang',
    slot: '목걸이',
    currentEquipmentBody: currentNecklace,
    targetEquipmentBody: blackRows[0],
  };
  assertClose(getPlagueHeartDealerRecommendationMultiplier(blackFangRow, equipment), 1.03);
  assert.equal(getPlagueHeartBufferRecommendationPower(blackFangRow, equipment, false), 150);
  assert.equal(getPlagueHeartBufferRecommendationPower(blackFangRow, equipment, true), 225);
  assert.equal(
    getPlagueHeartConditionalEffectText(blackFangRow, equipment, false),
    '[검은 숨결] 최종 데미지 +3%',
  );
  assert.equal(
    getPlagueHeartConditionalEffectText(blackFangRow, equipment, true),
    '[검은 숨결] 버프력 +75',
  );
}

function testOrderIndependentFinalState() {
  const twoBlack = [blackRows[0], blackRows[1]];
  const heartAfterBlack = [heartBody, ...twoBlack];
  const blackAfterHeart = [heartBody, ...twoBlack];
  assertClose(
    getPlagueHeartDealerMultiplier(heartAfterBlack),
    getPlagueHeartDealerMultiplier(blackAfterHeart),
  );
  assert.equal(
    getPlagueHeartBufferPower(heartAfterBlack),
    getPlagueHeartBufferPower(blackAfterHeart),
  );
}

for (const test of [
  testCountAndStandaloneSynergy,
  testBlackFangFirstThenHeart,
  testHeartFirstThenBlackFang,
  testOrderIndependentFinalState,
]) {
  test();
  console.log(`ok - ${test.name}`);
}
