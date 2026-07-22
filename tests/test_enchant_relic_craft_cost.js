import assert from 'node:assert/strict';
import {
  RELIC_CRAFT_TUNE_ATTEMPT_DEFAULT,
  applyRelicCraftTuneAttemptCosts,
  normalizeRelicCraftTuneAttempts,
} from '../src/dnfHellTool/enchantRelicCraftCost.js';

assert.equal(normalizeRelicCraftTuneAttempts(undefined), RELIC_CRAFT_TUNE_ATTEMPT_DEFAULT);
assert.equal(normalizeRelicCraftTuneAttempts(null), RELIC_CRAFT_TUNE_ATTEMPT_DEFAULT);
assert.equal(normalizeRelicCraftTuneAttempts(9), 10);
assert.equal(normalizeRelicCraftTuneAttempts(12), 10);
assert.equal(normalizeRelicCraftTuneAttempts(13), 15);
assert.equal(normalizeRelicCraftTuneAttempts(103), 100);

const baseRow = Object.freeze({
  sourceType: 'relicCraft',
  expectedGold: 200000000,
  craftFixedGold: 100000000,
  tuneFixedGoldPerAttempt: 4000000,
  precisionOperationCount: 25,
  auction: { minUnitPrice: 200000000, averagePrice: 200000000 },
  materials: [
    {
      key: 'shared',
      craftAmount: 1000,
      tuneAmountPerAttempt: 20,
      tuneAmount: 500,
      amount: 1500,
      auction: { minUnitPrice: 10 },
    },
    {
      key: 'craft-only',
      craftAmount: 5,
      tuneAmountPerAttempt: 0,
      tuneAmount: 0,
      amount: 5,
      auction: { minUnitPrice: 20 },
    },
  ],
});

const adjusted = applyRelicCraftTuneAttemptCosts(baseRow, 50);
assert.equal(adjusted.expectedGold, 300000000);
assert.equal(adjusted.auction.minUnitPrice, 300000000);
assert.equal(adjusted.precisionOperationCount, 50);
assert.deepEqual(adjusted.materials.map(({ amount, craftAmount, tuneAmount, tuneAmountPerAttempt }) => ({
  amount,
  craftAmount,
  tuneAmount,
  tuneAmountPerAttempt,
})), [
  { amount: 2000, craftAmount: 1000, tuneAmount: 1000, tuneAmountPerAttempt: 20 },
  { amount: 5, craftAmount: 5, tuneAmount: 0, tuneAmountPerAttempt: 0 },
]);
assert.equal(baseRow.expectedGold, 200000000);
assert.equal(baseRow.materials[0].amount, 1500);

const precisionOnlyRow = {
  sourceType: 'relicCraft',
  relicCraftMode: 'precision',
  currentPrecisionPercent: 25,
  fullPrecisionOperationCount: 25,
  precisionOperationCount: 18.75,
  expectedGold: 75000000,
  craftFixedGold: 0,
  tuneFixedGoldPerAttempt: 4000000,
  auction: { minUnitPrice: 75000000, averagePrice: 75000000 },
  materials: [{
    key: 'precision-only',
    craftAmount: 0,
    tuneAmountPerAttempt: 20,
    tuneAmount: 375,
    amount: 375,
    auction: { minUnitPrice: 10 },
  }],
};
const precisionAdjusted = applyRelicCraftTuneAttemptCosts(precisionOnlyRow, 50);
assert.equal(precisionAdjusted.fullPrecisionOperationCount, 50);
assert.equal(precisionAdjusted.precisionOperationCount, 37.5);
assert.equal(precisionAdjusted.expectedGold, 150000000);
assert.equal(precisionAdjusted.materials[0].craftAmount, 0);
assert.equal(precisionAdjusted.materials[0].tuneAmount, 750);
assert.equal(precisionAdjusted.materials[0].amount, 750);

const normalRow = { sourceType: 'upgrade', expectedGold: 123 };
assert.strictEqual(applyRelicCraftTuneAttemptCosts(normalRow, 50), normalRow);

console.log('enchant relic craft cost: ok');
