import {
  isEquipmentBodyReplacementSource,
  replaceEquipmentBodiesInRows,
  replaceEquipmentBodyInRows,
} from './enchantEquipmentBodyReplacement.js';

export const RADIANT_EYE_ITEM_NAME = '광휘를 머금은 눈동자';

const ARMOR_SLOT_IDS = new Set(['SHOULDER', 'JACKET', 'PANTS', 'WAIST', 'SHOES']);
const DEFAULT_SYNERGY = {
  dealerFinalDamagePercentPerItem: 1,
  bufferBuffPowerPerItem: 200,
  maxCount: 5,
  eligibleStages: ['consecrated', 'relic'],
};

function cleanText(value) {
  return String(value || '').trim();
}

function getSlotId(row = {}) {
  const slotId = cleanText(row.slotId);
  if (slotId) return slotId;
  return {
    머리어깨: 'SHOULDER',
    상의: 'JACKET',
    하의: 'PANTS',
    벨트: 'WAIST',
    신발: 'SHOES',
    반지: 'RING',
  }[cleanText(row.slot || row.slotName)] || '';
}

function getSynergyConfig(eye = {}) {
  const configured = eye?.conditionalEffects?.sanctifiedArmorSynergy || {};
  const dealerFinalDamagePercentPerItem = Number(
    configured.dealerFinalDamagePercentPerItem
      ?? DEFAULT_SYNERGY.dealerFinalDamagePercentPerItem,
  );
  const bufferBuffPowerPerItem = Number(
    configured.bufferBuffPowerPerItem
      ?? DEFAULT_SYNERGY.bufferBuffPowerPerItem,
  );
  const maxCount = Number(configured.maxCount ?? DEFAULT_SYNERGY.maxCount);
  const eligibleStages = Array.isArray(configured.eligibleStages)
    ? configured.eligibleStages.map(cleanText).filter(Boolean)
    : DEFAULT_SYNERGY.eligibleStages;
  return {
    dealerFinalDamagePercentPerItem: Number.isFinite(dealerFinalDamagePercentPerItem)
      ? dealerFinalDamagePercentPerItem
      : DEFAULT_SYNERGY.dealerFinalDamagePercentPerItem,
    bufferBuffPowerPerItem: Number.isFinite(bufferBuffPowerPerItem)
      ? bufferBuffPowerPerItem
      : DEFAULT_SYNERGY.bufferBuffPowerPerItem,
    maxCount: Number.isFinite(maxCount) && maxCount > 0
      ? Math.floor(maxCount)
      : DEFAULT_SYNERGY.maxCount,
    eligibleStages: eligibleStages.length ? eligibleStages : DEFAULT_SYNERGY.eligibleStages,
  };
}

function getRadiantEye(equipmentRows = []) {
  return (equipmentRows || []).find(
    (equipment) => cleanText(equipment.itemName) === RADIANT_EYE_ITEM_NAME,
  ) || null;
}

export function countRadiantEyeArmor(equipmentRows = [], config = DEFAULT_SYNERGY) {
  const eligibleStages = new Set(config.eligibleStages || DEFAULT_SYNERGY.eligibleStages);
  const count = (equipmentRows || []).filter((equipment) => (
    ARMOR_SLOT_IDS.has(getSlotId(equipment))
    && eligibleStages.has(cleanText(equipment.raidArmorStage))
  )).length;
  return Math.min(Math.max(0, Number(config.maxCount) || 0), count);
}

export function getRadiantEyeDealerMultiplier(equipmentRows = []) {
  const eye = getRadiantEye(equipmentRows);
  if (!eye) return 1;
  const config = getSynergyConfig(eye);
  return (1 + config.dealerFinalDamagePercentPerItem / 100)
    ** countRadiantEyeArmor(equipmentRows, config);
}

export function getRadiantEyeEquipmentScoreMultiplier(equipmentRows = []) {
  const eye = getRadiantEye(equipmentRows);
  if (!eye) return 1;
  const config = getSynergyConfig(eye);
  return (1 + config.dealerFinalDamagePercentPerItem / 100) ** config.maxCount;
}

export function getRadiantEyeBufferPower(equipmentRows = []) {
  const eye = getRadiantEye(equipmentRows);
  if (!eye) return 0;
  const config = getSynergyConfig(eye);
  return countRadiantEyeArmor(equipmentRows, config) * config.bufferBuffPowerPerItem;
}

function getEquipmentRowsForRecommendation(row = {}, equipmentRows = [], useTarget = true) {
  if (!isEquipmentBodyReplacementSource(row)) return equipmentRows || [];
  if (Array.isArray(row.equipmentBodyChanges) && row.equipmentBodyChanges.length) {
    const bodies = row.equipmentBodyChanges.map((change) => (
      useTarget ? change.targetEquipmentBody : change.currentEquipmentBody
    ));
    return replaceEquipmentBodiesInRows(equipmentRows, bodies) || equipmentRows || [];
  }
  const body = useTarget ? row.targetEquipmentBody : row.currentEquipmentBody;
  if (!body) return equipmentRows || [];
  return replaceEquipmentBodyInRows(equipmentRows, body) || equipmentRows || [];
}

export function getRadiantEyeDealerRecommendationMultiplier(row = {}, equipmentRows = []) {
  const currentRows = getEquipmentRowsForRecommendation(row, equipmentRows, false);
  const targetRows = getEquipmentRowsForRecommendation(row, equipmentRows, true);
  const currentMultiplier = getRadiantEyeDealerMultiplier(currentRows);
  const targetMultiplier = getRadiantEyeDealerMultiplier(targetRows);
  return currentMultiplier > 0 ? targetMultiplier / currentMultiplier : 1;
}

export function getRadiantEyeBufferRecommendationPower(
  row = {},
  equipmentRows = [],
  useTarget = true,
) {
  return getRadiantEyeBufferPower(
    getEquipmentRowsForRecommendation(row, equipmentRows, useTarget),
  );
}

export function getRadiantEyeConditionalEffectText(row = {}, equipmentRows = [], isBuffer = false) {
  const currentRows = getEquipmentRowsForRecommendation(row, equipmentRows, false);
  const targetRows = getEquipmentRowsForRecommendation(row, equipmentRows, true);
  if (isBuffer) {
    const delta = getRadiantEyeBufferPower(targetRows) - getRadiantEyeBufferPower(currentRows);
    return delta > 0 ? `[천상의 빛] 버프력 +${delta}` : '';
  }
  const multiplier = getRadiantEyeDealerMultiplier(targetRows)
    / getRadiantEyeDealerMultiplier(currentRows);
  const percent = (multiplier - 1) * 100;
  return percent > 0.000001 ? `[천상의 빛] 최종 데미지 +${percent.toFixed(0)}%` : '';
}
