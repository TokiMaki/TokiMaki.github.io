import {
  isEquipmentBodyReplacementSource,
  replaceEquipmentBodyInRows,
} from './enchantEquipmentBodyReplacement.js';

export const PLAGUE_HEART_ITEM_NAME = '만병을 잉태한 역병의 심장';

const BLACK_FANG_SLOT_IDS = new Set(['AMULET', 'WRIST', 'RING']);
const DEFAULT_SYNERGY = {
  dealerFinalDamagePercentPerItem: 3,
  bufferBuffPowerPerItem: 75,
  maxCount: 3,
};

function cleanText(value) {
  return String(value || '').trim();
}

function getSlotId(row = {}) {
  const slotId = cleanText(row.slotId);
  if (slotId) return slotId;
  return {
    목걸이: 'AMULET',
    팔찌: 'WRIST',
    반지: 'RING',
    보조장비: 'SUPPORT',
  }[cleanText(row.slot || row.slotName)] || '';
}

function getSynergyConfig(heart = {}) {
  const config = heart?.conditionalEffects?.blackFangSynergy || {};
  const dealerFinalDamagePercentPerItem = Number(
    config.dealerFinalDamagePercentPerItem
      ?? DEFAULT_SYNERGY.dealerFinalDamagePercentPerItem,
  );
  const bufferBuffPowerPerItem = Number(
    config.bufferBuffPowerPerItem
      ?? DEFAULT_SYNERGY.bufferBuffPowerPerItem,
  );
  const maxCount = Number(config.maxCount ?? DEFAULT_SYNERGY.maxCount);
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
  };
}

export function isPlagueHeartEquipment(row = {}) {
  return cleanText(row.itemName) === PLAGUE_HEART_ITEM_NAME;
}

export function isBlackFangEquipment(row = {}) {
  return BLACK_FANG_SLOT_IDS.has(getSlotId(row))
    && cleanText(row.itemName).startsWith('흑아 :');
}

export function countBlackFangEquipment(equipmentRows = [], maxCount = 3) {
  const count = (equipmentRows || []).filter(isBlackFangEquipment).length;
  return Math.min(Math.max(0, Math.floor(Number(maxCount) || 0)), count);
}

function getPlagueHeart(equipmentRows = []) {
  return (equipmentRows || []).find(isPlagueHeartEquipment) || null;
}

export function getPlagueHeartDealerMultiplier(equipmentRows = []) {
  const heart = getPlagueHeart(equipmentRows);
  if (!heart) return 1;
  const config = getSynergyConfig(heart);
  const count = countBlackFangEquipment(equipmentRows, config.maxCount);
  return (1 + config.dealerFinalDamagePercentPerItem / 100) ** count;
}

export function getPlagueHeartBufferPower(equipmentRows = []) {
  const heart = getPlagueHeart(equipmentRows);
  if (!heart) return 0;
  const config = getSynergyConfig(heart);
  return countBlackFangEquipment(equipmentRows, config.maxCount)
    * config.bufferBuffPowerPerItem;
}

export function getEquipmentRowsForRecommendation(
  row = {},
  equipmentRows = [],
  useTarget = true,
) {
  if (!isEquipmentBodyReplacementSource(row)) return equipmentRows || [];
  const body = useTarget ? row.targetEquipmentBody : row.currentEquipmentBody;
  if (!body) return equipmentRows || [];
  return replaceEquipmentBodyInRows(equipmentRows, body) || equipmentRows || [];
}

export function getPlagueHeartDealerRecommendationMultiplier(row = {}, equipmentRows = []) {
  if (!isEquipmentBodyReplacementSource(row)) return 1;
  const referenceRows = getEquipmentRowsForRecommendation(row, equipmentRows, false);
  const targetRows = getEquipmentRowsForRecommendation(row, equipmentRows, true);
  const referenceMultiplier = getPlagueHeartDealerMultiplier(referenceRows);
  const targetMultiplier = getPlagueHeartDealerMultiplier(targetRows);
  return referenceMultiplier > 0 ? targetMultiplier / referenceMultiplier : 1;
}

export function getPlagueHeartBufferRecommendationPower(row = {}, equipmentRows = [], useTarget = true) {
  return getPlagueHeartBufferPower(
    getEquipmentRowsForRecommendation(row, equipmentRows, useTarget),
  );
}

export function getPlagueHeartConditionalEffectText(row = {}, equipmentRows = [], isBuffer = false) {
  if (row.sourceType !== 'blackFang') return '';
  const referenceRows = getEquipmentRowsForRecommendation(row, equipmentRows, false);
  const targetRows = getEquipmentRowsForRecommendation(row, equipmentRows, true);
  const referenceHeart = referenceRows.find(isPlagueHeartEquipment);
  if (!referenceHeart) return '';
  if (isBuffer) {
    const delta = getPlagueHeartBufferPower(targetRows) - getPlagueHeartBufferPower(referenceRows);
    return delta > 0 ? `심장 연동 버프력 +${delta}` : '';
  }
  const multiplier = getPlagueHeartDealerMultiplier(targetRows)
    / getPlagueHeartDealerMultiplier(referenceRows);
  const percent = (multiplier - 1) * 100;
  return percent > 0.000001 ? `심장 연동 최종 데미지 +${percent.toFixed(0)}%` : '';
}
