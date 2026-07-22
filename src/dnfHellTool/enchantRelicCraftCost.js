export const RELIC_CRAFT_TUNE_ATTEMPT_MIN = 10;
export const RELIC_CRAFT_TUNE_ATTEMPT_MAX = 100;
export const RELIC_CRAFT_TUNE_ATTEMPT_STEP = 5;
export const RELIC_CRAFT_TUNE_ATTEMPT_DEFAULT = 25;

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeRelicCraftTuneAttempts(value, fallback = RELIC_CRAFT_TUNE_ATTEMPT_DEFAULT) {
  const safeFallback = Math.min(
    RELIC_CRAFT_TUNE_ATTEMPT_MAX,
    Math.max(RELIC_CRAFT_TUNE_ATTEMPT_MIN, finiteNumber(fallback, RELIC_CRAFT_TUNE_ATTEMPT_DEFAULT)),
  );
  const requested = value === null || value === ''
    ? safeFallback
    : finiteNumber(value, safeFallback);
  const stepped = Math.round(requested / RELIC_CRAFT_TUNE_ATTEMPT_STEP)
    * RELIC_CRAFT_TUNE_ATTEMPT_STEP;
  return Math.min(RELIC_CRAFT_TUNE_ATTEMPT_MAX, Math.max(RELIC_CRAFT_TUNE_ATTEMPT_MIN, stepped));
}

export function applyRelicCraftTuneAttemptCosts(row = {}, tuneAttempts = RELIC_CRAFT_TUNE_ATTEMPT_DEFAULT) {
  if (row?.sourceType !== 'relicCraft') return row;
  const attempts = normalizeRelicCraftTuneAttempts(tuneAttempts, row.precisionOperationCount);
  const craftFixedGold = finiteNumber(row.craftFixedGold);
  const tuneFixedGoldPerAttempt = finiteNumber(row.tuneFixedGoldPerAttempt);
  const hasSplitFixedGold = craftFixedGold > 0 || tuneFixedGoldPerAttempt > 0;
  const expectedGold = hasSplitFixedGold
    ? craftFixedGold + tuneFixedGoldPerAttempt * attempts
    : finiteNumber(row.expectedGold, finiteNumber(row.auction?.minUnitPrice));
  const materials = (row.materials || []).map((material) => {
    const craftAmount = finiteNumber(material?.craftAmount);
    const tuneAmountPerAttempt = finiteNumber(material?.tuneAmountPerAttempt);
    const tuneAmount = tuneAmountPerAttempt > 0
      ? tuneAmountPerAttempt * attempts
      : finiteNumber(material?.tuneAmount);
    return {
      ...material,
      craftAmount,
      tuneAmountPerAttempt,
      tuneAmount,
      amount: craftAmount + tuneAmount,
    };
  });
  return {
    ...row,
    expectedGold,
    auction: {
      ...(row.auction || {}),
      minUnitPrice: expectedGold,
      averagePrice: expectedGold,
    },
    materials,
    precisionOperationCount: attempts,
  };
}
