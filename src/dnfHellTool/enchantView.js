import {
  DAMAGE_EFFICIENCY_COLOR_STOPS,
  BUFFER_EFFICIENCY_COLOR_STOPS,
  getEfficiencyBand,
  getEfficiencyColor,
  getArrowBackground,
  getBufferEfficiencyBand,
  getBufferEfficiencyColor,
  getBufferArrowBackground,
} from './enchantEfficiencyScale.js';
import { createEnchantEfficiencyLegend } from './enchantEfficiencyLegend.js';
import { createEnchantRecommendationControls } from './enchantRecommendationControls.js';
import { createEnchantRecommendationLayout } from './enchantRecommendationLayout.js';
import { createEnchantSearchPanels } from './enchantSearchPanels.js';
import { getCreatureRows, getCreatureArtifactRows } from './enchantCreatureRows.js';
import { getSwitchingTitleRows, getSwitchingFragmentRows, getSwitchingCreatureRows } from './enchantSwitchingRows.js';
import { createEnchantOathLoadoutBoard } from './enchantOathLoadoutBoard.js';
import { createEnchantAvatarLoadoutBoard } from './enchantAvatarLoadoutBoard.js';
import { createEnchantBuffLoadoutBoard } from './enchantBuffLoadoutBoard.js';
import { createEnchantBufferSimulatorCalculation } from './enchantBufferSimulatorCalculation.js';
import { createEnchantBufferSimulatorSourceCalculation } from './enchantBufferSimulatorSourceCalculation.js';
import { createEnchantBufferSimulatorSourceIdentity } from './enchantBufferSimulatorSourceIdentity.js';
import { createEnchantSimulatorIdentity } from './enchantSimulatorIdentity.js';
import { createEnchantBuffEnhancementMetric } from './enchantBuffEnhancementMetric.js';
import { createEnchantEquipmentLoadoutBoard } from './enchantEquipmentLoadoutBoard.js';
import { createEnchantPortraitDetailPanel } from './enchantPortraitDetailPanel.js';
import { createEnchantLoadoutNavigation } from './enchantLoadoutNavigation.js';
import { createEnchantOathSymbolFallback } from './enchantOathSymbolFallback.js';
import { createEnchantDevelopmentTiming } from './enchantDevelopmentTiming.js';
import { createEnchantSimulatorDisplay } from './enchantSimulatorDisplay.js';
import {
  UPGRADE_SLOT_LABELS,
  createEnchantEquipmentProgression,
} from './enchantEquipmentProgression.js';
import {
  EQUIPMENT_TUNE_MIN_SET_POINT,
  EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE,
  EQUIPMENT_TUNE_MEMORY_BUFF_POWER,
  createEnchantEquipmentTuneProgression,
} from './enchantEquipmentTuneProgression.js';
import { createEnchantOathProgression } from './enchantOathProgression.js';
import { createEnchantOathAcquisition } from './enchantOathAcquisition.js';
import { createEnchantAvatarRecommendationSource } from './enchantAvatarRecommendationSource.js';
import { createEnchantTitleRecommendationSource } from './enchantTitleRecommendationSource.js';
import { createEnchantDealerDamageMetric } from './enchantDealerDamageMetric.js';
import { createEnchantRecommendationEvaluationPolicy } from './enchantRecommendationEvaluationPolicy.js';
import { createEnchantBufferRecommendation } from './enchantBufferRecommendation.js';
import { createEnchantDealerRecommendation } from './enchantDealerRecommendation.js';
import { createEnchantDealerSimulatorCalculation } from './enchantDealerSimulatorCalculation.js';
import {
  isEquipmentBodyReplacementSource,
  replaceEquipmentBodyInRows,
  replaceEquipmentBodyPreservingState,
  resolveCanonicalEquipmentSlotId,
  resolveCanonicalEquipmentSlotName,
} from './enchantEquipmentBodyReplacement.js';

const EFFECT_LABELS = {
  finalDamage: '최종뎀',
  skillDamageMultiplier: '스킬 공격력',
  attack: '공격력',
  attackIncrease: '공격력 증가',
  attackAmplification: '공증',
  buffPower: '버프력',
  buffAmplification: '벞증',
  elementAll: '모속강',
  elementFire: '화속강',
  elementWater: '수속강',
  elementLight: '명속강',
  elementDark: '암속강',
  allStat: '올스탯',
  bufferStat: '버퍼 주스탯',
  str: '힘',
  int: '지능',
  vit: '체력',
  spr: '정신력',
  critical: '크리',
};
const BUFFER_SCORE_ICON_URL = new URL('../../이미지/bufferScore.png', import.meta.url).href;
const SLOT_ORDER = [
  '무기',
  '상의',
  '하의',
  '머리어깨',
  '벨트',
  '신발',
  '팔찌',
  '목걸이',
  '반지',
  '보조장비',
  '귀걸이',
  '마법석',
  '크리쳐',
  '칭호',
  '벞강 칭호',
  '아바타',
  '모자 아바타',
  '머리 아바타',
  '얼굴 아바타',
  '목가슴 아바타',
  '상의 아바타',
  '하의 아바타',
  '벞강 상의',
  '벞강 하의',
  '무기 아바타',
  '오라 아바타',
  '피부 아바타',
  '장비 조율',
  '서약 조율',
];

const EFFECT_ORDER = ['finalDamage', 'skillDamageMultiplier', 'attackIncrease', 'attackAmplification', 'buffPower', 'buffAmplification', 'attack', 'elementAll', 'elementFire', 'elementWater', 'elementLight', 'elementDark', 'allStat', 'bufferStat', 'str', 'int', 'vit', 'spr'];
const BUFFER_IRRELEVANT_EFFECT_KEYS = new Set(['finalDamage', 'skillDamageMultiplier', 'attackIncrease', 'attackAmplification', 'attack', 'elementAll', 'elementFire', 'elementWater', 'elementLight', 'elementDark', 'critical']);
const DAMAGE_IRRELEVANT_EFFECT_KEYS = new Set(['buffPower', 'buffAmplification', 'bufferStat', 'vit', 'spr']);
const AVATAR_LOADOUT_SLOT_ID_BY_KEY = {
  avatarWeapon: 'WEAPON',
  hair: 'HAIR',
  hat: 'HEADGEAR',
  face: 'FACE',
  aura: 'AURORA',
  neck: 'BREAST',
  top: 'JACKET',
  skin: 'SKIN',
  waist: 'WAIST',
  bottom: 'PANTS',
  shoes: 'SHOES',
};
const AVATAR_PLATINUM_SLOT_LABEL_BY_KEY = {
  top: '상의 아바타',
  bottom: '하의 아바타',
};
const ELEMENT_EFFECT_KEY_BY_NAME = {
  fire: 'elementFire',
  water: 'elementWater',
  light: 'elementLight',
  dark: 'elementDark',
};
const ELEMENT_LABEL_BY_NAME = {
  fire: '화속성',
  water: '수속성',
  light: '명속성',
  dark: '암속성',
  all: '모든속성',
};
const MATERIAL_ENCHANT_MATERIAL_ORDER = ['은화', '비단', '잔해', '소명'];
const BUFFER_JOB_GROW_NAMES = new Set(['眞 크루세이더', '眞 인챈트리스', '眞 뮤즈', '眞 패러메딕']);
const UPGRADE_MATERIAL_LABELS = {
  harmonyCrystal: '조화의 결정체',
  contradictionCrystal: '모순의 결정체',
  colorlessCube: '무색 큐브 조각',
  lionCore: '라이언 코어',
  epicSoul: '에픽 소울',
  legendarySoul: '레전더리 소울',
  radiantSoul: '광휘의 소울',
};
const UPGRADE_MATERIAL_ICON_IDS = {
  harmonyCrystal: 'ab8eab6848ed81b8bdd65d1c5a6ae8b2',
  contradictionCrystal: 'f1afc13118b2b07ec1e3b8c2f1958b03',
  colorlessCube: '785e56a0ed4e3efd573da1f56a45217d',
  lionCore: '3840051cf487429c5a757c8bdb00e33b',
  amplificationProtectionTicket: '55be75a1c024aac3ef84ed3bed5b8db9',
  reinforcementProtectionTicket: '8bc063c2b80179bc002f7dfb8203c4ab',
  epicSoul: 'c7d845c65ab9dbcff6e55dc910fbea87',
  legendarySoul: 'c6947ff630cc59aebdcbabfb449258d1',
  radiantSoul: '6307b8165444a9bd5c4c4aa2d7eae41d',
};
const BLACK_FANG_SIMULATOR_SLOTS = new Set(['목걸이', '팔찌', '반지']);
const TUNE_SOURCE_TYPES = new Set(['equipmentTune', 'oathTune']);
const OATH_DECISION_VARIANT_SOURCE_TYPES = new Set(['oathTranscend', 'oathCraft']);
function formatGold(value) {
  if (!Number.isFinite(value) || value <= 0) return '-';
  return `${Math.round(value).toLocaleString('ko-KR')} 골드`;
}

function formatCompactGold(value) {
  if (!Number.isFinite(value) || value <= 0) return '-';
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(value >= 1000000000 ? 1 : 2).replace(/\.?0+$/, '')}억`;
  }
  if (value >= 10000) {
    return `${Math.round(value / 10000).toLocaleString('ko-KR')}만`;
  }
  return Math.round(value).toLocaleString('ko-KR');
}

function formatKoreanGoldUnits(value) {
  const gold = Math.max(0, Math.floor(Number(value) || 0));
  const eok = Math.floor(gold / 100000000);
  const man = Math.floor((gold % 100000000) / 10000);
  if (eok > 0) {
    return `${eok.toLocaleString('ko-KR')}억${man > 0 ? ` ${man.toLocaleString('ko-KR')}만` : ''}`;
  }
  if (man > 0) return `${man.toLocaleString('ko-KR')}만`;
  return gold.toLocaleString('ko-KR');
}

function formatMaterialAmount(value) {
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value >= 100) return Math.round(value).toLocaleString('ko-KR');
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function getUpgradeMaterials(stepCost = {}) {
  return Object.entries(stepCost || {})
    .filter(([key, value]) => key !== 'gold' && Number.isFinite(Number(value)) && Number(value) > 0)
    .map(([key, value]) => ({
      key,
      label: UPGRADE_MATERIAL_LABELS[key] || key,
      amount: Number(value),
    }));
}

function getUpgradeMaterialLabel(material, upgradeMode) {
  if (material.key === 'protectionTicket') {
    return ['reinforcement', 'safeReinforcement'].includes(upgradeMode)
      ? '강화 보호권'
      : '증폭 보호권';
  }
  return material.label;
}

function getUpgradeMaterialIconId(material, upgradeMode) {
  if (material.key === 'protectionTicket') {
    return ['reinforcement', 'safeReinforcement'].includes(upgradeMode)
      ? UPGRADE_MATERIAL_ICON_IDS.reinforcementProtectionTicket
      : UPGRADE_MATERIAL_ICON_IDS.amplificationProtectionTicket;
  }
  return UPGRADE_MATERIAL_ICON_IDS[material.key] || '';
}

function getUpgradeMaterialPriceKey(material, upgradeMode) {
  if (material.key === 'protectionTicket') {
    return ['reinforcement', 'safeReinforcement'].includes(upgradeMode)
      ? 'reinforcementProtectionTicket'
      : 'amplificationProtectionTicket';
  }
  return material.key;
}

function applyUpgradeMaterialPrices(materials = [], upgradeMode = '', materialPrices = {}) {
  return (materials || []).map((material) => {
    const priceKey = getUpgradeMaterialPriceKey(material, upgradeMode);
    const priceRow = materialPrices?.[priceKey] || {};
    return {
      ...material,
      priceKey,
      auction: priceRow.auction || material.auction || {},
      itemId: priceRow.itemId || material.itemId || '',
      itemName: priceRow.label || material.itemName || material.label || '',
      iconUrl: priceRow.iconUrl || material.iconUrl || '',
    };
  });
}

function getMaterialGold(materials = []) {
  return (materials || []).reduce((sum, material) => {
    const amount = Number(material.amount || 0);
    const unitPrice = Number(material.auction?.minUnitPrice || 0);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) return sum;
    return sum + amount * unitPrice;
  }, 0);
}

function getRecommendationGold(row, includeMaterialCosts = false) {
  const baseGold = Number.isFinite(row?.expectedGold) ? row.expectedGold : Number(row?.auction?.minUnitPrice || 0);
  if (!Number.isFinite(baseGold) || baseGold <= 0) return 0;
  if (!includeMaterialCosts || !['upgrade', 'blackFang', 'relicCraft', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'oathAcquisitionCombined'].includes(row?.sourceType)) return baseGold;
  const materialGold = ['upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'oathAcquisitionCombined'].includes(row.sourceType)
    ? getMaterialGold(row.expectedMaterials)
    : getMaterialGold(row.materials);
  return baseGold + materialGold;
}

function getUpgradeMaterialParts(materials = [], upgradeMode = '') {
  return (materials || [])
    .map((material) => {
      const amount = formatMaterialAmount(material.amount);
      const iconId = getUpgradeMaterialIconId(material, upgradeMode);
      const useBaseMaterialIcon = material.key === 'radiantSoul' || material.priceKey === 'radiantSoul';
      const iconUrl = useBaseMaterialIcon && iconId
        ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(iconId)}`
        : material.iconUrl || (iconId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(iconId)}` : '');
      return amount ? {
        label: material.itemName || getUpgradeMaterialLabel(material, upgradeMode),
        amount,
        iconUrl,
      } : null;
    })
    .filter(Boolean);
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

function getBlackFangMaterialParts(materials = []) {
  return (materials || [])
    .map((material) => {
      const amount = formatMaterialAmount(Number(material.amount || 0));
      const label = material.itemName || material.label || '';
      const iconUrl = material.iconUrl || (material.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(material.itemId)}` : '');
      return label ? { label, amount, iconUrl } : null;
    })
    .filter(Boolean);
}

function isMaterialEnchantRecommendation(row) {
  if (row?.sourceType !== 'enchant') return false;
  const acquisition = row.acquisition || {};
  return Boolean(acquisition.materialLabel || acquisition.materialItemName || acquisition.materialName || acquisition.materialIconUrl || acquisition.materialItemId);
}

function getMaterialEnchantMaterialParts(row) {
  if (Array.isArray(row?.materials) && row.materials.length > 0) {
    return getBlackFangMaterialParts(row.materials);
  }
  const acquisition = row?.acquisition || {};
  const label = acquisition.materialLabel || acquisition.materialItemName || acquisition.materialName || acquisition.label || '';
  const amount = Number(acquisition.amount || 0);
  if (!label || !Number.isFinite(amount) || amount <= 0) return [];
  return getBlackFangMaterialParts([{
    label,
    amount,
    itemId: acquisition.materialItemId,
    iconUrl: acquisition.materialIconUrl,
  }]);
}

function formatEffectNumber(value) {
  if (!Number.isFinite(value)) return value;
  const roundedInteger = Math.round(value);
  if (Math.abs(value - roundedInteger) < 0.000001) return String(roundedInteger);
  return value.toFixed(3).replace(/\.?0+$/, '');
}

function formatEffectValue(key, value) {
  if (key === 'skillDamageMultiplier') {
    const percent = (Number(value || 1) - 1) * 100;
    const sign = percent < 0 ? '' : '+';
    return `${EFFECT_LABELS[key]} ${sign}${formatEffectNumber(percent)}%`;
  }
  const suffix = ['finalDamage', 'attackIncrease', 'attackAmplification', 'buffAmplification', 'critical'].includes(key) ? '%' : '';
  const sign = Number(value) < 0 ? '' : '+';
  return `${EFFECT_LABELS[key] || key} ${sign}${formatEffectNumber(value)}${suffix}`;
}

function formatEffects(effects = {}) {
  return EFFECT_ORDER.map((key) => [key, effects[key]])
    .filter(([key]) => !(Number.isFinite(effects.allStat) && ['str', 'int', 'vit', 'spr'].includes(key)))
    .filter(([, value]) => Number.isFinite(value))
    .map(([key, value]) => formatEffectValue(key, value))
    .join(' / ');
}

function getRoleRelevantEffects(effects = {}, isBuffer = false) {
  const hiddenKeys = isBuffer ? BUFFER_IRRELEVANT_EFFECT_KEYS : DAMAGE_IRRELEVANT_EFFECT_KEYS;
  return Object.fromEntries(
    Object.entries(effects || {}).filter(([key]) => !hiddenKeys.has(key)),
  );
}

function formatEffectTransitionValue(key, currentValue, targetValue) {
  const suffix = ['finalDamage', 'attackIncrease', 'attackAmplification', 'buffAmplification', 'critical'].includes(key) ? '%' : '';
  return `${EFFECT_LABELS[key] || key} ${formatEffectNumber(currentValue)}${suffix} -> ${formatEffectNumber(targetValue)}${suffix}`;
}

function formatBlackFangEffect(row, isBuffer = false) {
  const currentEffects = row.currentEffects || {};
  const targetEffects = row.targetEffects || {};
  const changedEffects = getRoleRelevantEffects(row.effects || {}, isBuffer);
  const changedKeys = EFFECT_ORDER
    .filter((key) => Number.isFinite(changedEffects?.[key]))
    .filter((key) => !(Number.isFinite(changedEffects.allStat) && ['str', 'int', 'vit', 'spr'].includes(key)));
  const parts = changedKeys
    .map((key) => formatEffectTransitionValue(key, Number(currentEffects[key] || 0), Number(targetEffects[key] || 0)));
  return parts.length ? parts.join(' / ') : formatEffects(changedEffects);
}

function getBufferPrimaryStatKey(baseline = {}) {
  return {
    힘: 'str',
    지능: 'int',
    체력: 'vit',
    정신력: 'spr',
  }[String(baseline?.statName || '').trim()] || '';
}

function getBufferSelectedStatEffect(effects = {}, baseline = {}) {
  effects = effects || {};
  if (Number.isFinite(effects.allStat)) return Number(effects.allStat || 0);
  const primaryKey = getBufferPrimaryStatKey(baseline);
  return primaryKey ? Number(effects[primaryKey] || 0) : 0;
}

function normalizeDealerEnchantDisplayEffects(effects = {}, baseline = {}) {
  const primaryKey = getDealerPrimaryStatKey(baseline);
  if (!primaryKey) return effects || {};
  const normalized = { ...(effects || {}) };
  const hasPrimaryStat = Number.isFinite(Number(effects?.[primaryKey]));
  const hasAllStat = Number.isFinite(Number(effects?.allStat));
  const primaryValue = Number(effects?.[primaryKey] || 0);
  const allStatValue = Number(effects?.allStat || 0);
  if (hasPrimaryStat || hasAllStat) {
    normalized[primaryKey] =
      (Number.isFinite(primaryValue) ? primaryValue : 0) +
      (Number.isFinite(allStatValue) ? allStatValue : 0);
  }
  delete normalized.allStat;
  delete normalized[primaryKey === 'str' ? 'int' : 'str'];
  return normalized;
}

function formatEnchantTransitionEffect(row, isBuffer = false, baseline = {}) {
  let currentEffects = row.currentEnchant?.displayEffects || row.currentEnchant?.effects || {};
  let targetEffects = row.displayEffects || row.effects || {};
  if (!isBuffer && row.sourceType === 'enchant') {
    currentEffects = normalizeDealerEnchantDisplayEffects(currentEffects, baseline);
    targetEffects = normalizeDealerEnchantDisplayEffects(targetEffects, baseline);
  }
  const changedKeys = EFFECT_ORDER
    .filter((key) => Number.isFinite(currentEffects[key]) || Number.isFinite(targetEffects[key]))
    .filter((key) => Number(currentEffects[key] || 0) !== Number(targetEffects[key] || 0))
    .filter((key) => !(
      isBuffer &&
      row.sourceType === 'enchant' &&
      key === 'allStat' &&
      Number.isFinite(row.bufferStatDelta) &&
      Math.abs(Number(row.bufferStatDelta || 0)) <= 0.000001
    ))
    .filter((key) => !(
      isBuffer &&
      row.sourceType === 'enchant' &&
      key === 'buffPower' &&
      Number.isFinite(row.bufferBuffPowerDelta) &&
      Math.abs(Number(row.bufferBuffPowerDelta || 0)) <= 0.000001
    ))
    .filter((key) => !(
      isBuffer &&
      row.sourceType === 'enchant' &&
      key === 'buffAmplification' &&
      Number.isFinite(row.bufferBuffAmplificationDelta) &&
      Math.abs(Number(row.bufferBuffAmplificationDelta || 0)) <= 0.000001
    ))
    .filter((key) => !(Number.isFinite(currentEffects.allStat) && ['str', 'int', 'vit', 'spr'].includes(key)))
    .filter((key) => !(Number.isFinite(targetEffects.allStat) && ['str', 'int', 'vit', 'spr'].includes(key)));
  const parts = changedKeys
    .map((key) => formatEffectTransitionValue(key, Number(currentEffects[key] || 0), Number(targetEffects[key] || 0)));
  if (row.sourceType === 'enchant' && (isBuffer || getDealerPrimaryStatKey(baseline))) return parts.join(' / ');
  return parts.length ? parts.join(' / ') : formatEffects(row.effects);
}

function getTitleBeadDisplayEffects(effects = {}, element = '') {
  const displayEffects = { ...(effects || {}) };
  const elementKey = ELEMENT_EFFECT_KEY_BY_NAME[element];
  const elementAll = Number(displayEffects.elementAll || 0);
  if (elementKey && Number.isFinite(elementAll) && elementAll !== 0) {
    delete displayEffects.elementAll;
    displayEffects[elementKey] = Number(displayEffects[elementKey] || 0) + elementAll;
  }
  return displayEffects;
}

function formatTitleBeadTransitionEffect(row, isBuffer = false) {
  const currentEffects = getRoleRelevantEffects(
    getTitleBeadDisplayEffects(row.currentTitleEnchantEffects || {}, row.currentTitleEnchantElement || ''),
    isBuffer,
  );
  const targetEffects = getRoleRelevantEffects(
    getTitleBeadDisplayEffects(row.targetTitleEnchantEffects || row.enchantEffects || {}, row.titleEnchantElement || ''),
    isBuffer,
  );
  const changedKeys = EFFECT_ORDER
    .filter((key) => Number.isFinite(currentEffects[key]) || Number.isFinite(targetEffects[key]))
    .filter((key) => Number(currentEffects[key] || 0) !== Number(targetEffects[key] || 0))
    .filter((key) => !(Number.isFinite(currentEffects.allStat) && ['str', 'int', 'vit', 'spr'].includes(key)))
    .filter((key) => !(Number.isFinite(targetEffects.allStat) && ['str', 'int', 'vit', 'spr'].includes(key)));
  const parts = changedKeys
    .map((key) => formatEffectTransitionValue(key, Number(currentEffects[key] || 0), Number(targetEffects[key] || 0)));
  return parts.length ? parts.join(' / ') : formatEffects(targetEffects);
}

function formatUpgradeEffect(row) {
  const parts = formatEffects(row.effects).split(' / ').filter(Boolean);
  const finalDamage = row.effects?.finalDamage;
  if (Number.isFinite(finalDamage) && finalDamage > 0 && !parts.some((part) => part.includes('최종뎀'))) {
    parts.unshift(formatEffectValue('finalDamage', finalDamage));
  }
  return parts.join(' / ');
}

function formatEquipmentTuneEffect(row) {
  const pointText = `태초 ${formatEffectNumber(row.currentSetPoint)} -> 태초 ${formatEffectNumber(row.targetSetPoint)}`;
  if (row.metricType === 'buffer') {
    const buffPowerText = `버프력 +${formatEffectNumber(row.currentTuneBuffPower)} -> +${formatEffectNumber(row.targetTuneBuffPower)}`;
    return `${pointText} / ${buffPowerText}`;
  }
  const damageText = `최종뎀 +${formatEffectNumber(row.currentTuneFinalDamage)}% -> +${formatEffectNumber(row.targetTuneFinalDamage)}%`;
  return `${pointText} / ${damageText}`;
}

function formatOathTuneEffect(row) {
  const formatStagePoint = (stageName, setPoint) => `${stageName || '서약'} ${formatEffectNumber(setPoint)}`;
  const pointText = row.currentOathStageName || row.targetOathStageName
    ? `${formatStagePoint(row.currentOathStageName, row.currentSetPoint)} -> ${formatStagePoint(row.targetOathStageName, row.targetSetPoint)}`
    : `${formatEffectNumber(row.currentSetPoint)} -> ${formatEffectNumber(row.targetSetPoint)}`;
  if (Number(row.currentSetPoint || 0) < EQUIPMENT_TUNE_MIN_SET_POINT) return pointText;
  const tuneText = row.metricType === 'buffer'
    ? `버프력 ${formatEffectNumber(row.currentTuneBuffPower)} -> ${formatEffectNumber(row.targetTuneBuffPower)}`
    : `최종뎀 ${formatEffectNumber(row.currentTuneFinalDamage)}% -> ${formatEffectNumber(row.targetTuneFinalDamage)}%`;
  return `${pointText} / ${tuneText}`;
}

function formatOathTranscendEffect(row, isBuffer = false, setPointOnly = false) {
  const optionText = setPointOnly ? '' : formatBlackFangEffect(row, isBuffer);
  const hasSetPoint = Number.isFinite(row.currentSetPoint) && Number.isFinite(row.targetSetPoint) && row.currentSetPoint !== row.targetSetPoint;
  if (!hasSetPoint) return optionText;
  const formatStagePoint = (stageName, setPoint, requiredPoint) => {
    return `${stageName || '서약'} ${formatEffectNumber(setPoint)}`;
  };
  const pointText = row.currentOathStageName || row.targetOathStageName
    ? `${formatStagePoint(row.currentOathStageName, row.currentSetPoint, row.currentOathStageRequiredPoint)} -> ${formatStagePoint(row.targetOathStageName, row.targetSetPoint, row.targetOathStageRequiredPoint)}`
    : '';
  return [pointText, optionText].filter(Boolean).join(' / ');
}

function getOathStageRarityClass(stageName) {
  const name = String(stageName || '').trim();
  if (name.startsWith('레어')) return 'rare';
  if (name.startsWith('유니크')) return 'unique';
  if (name.startsWith('레전더리')) return 'legendary';
  if (name.startsWith('에픽')) return 'epic';
  if (name.startsWith('태초')) return 'primeval';
  return 'unknown';
}

function formatOathStageNameHtml(stageName, escapeHtml) {
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
  const rarityClass = getOathStageRarityClass(stageName);
  return `<span class="enchant-oath-stage enchant-oath-stage-${escape(rarityClass)}">${escape(stageName)}</span>`;
}

function formatOathTuneEffectHtml(row, escapeHtml) {
  if (!row.currentOathStageName && !row.targetOathStageName) return '';
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
  const formatStagePoint = (stageName, setPoint) => formatOathStageNameHtml(`${stageName || '서약'} ${formatEffectNumber(setPoint)}`, escape);
  const pointHtml = `${formatStagePoint(row.currentOathStageName, row.currentSetPoint)} <span class="enchant-oath-stage-arrow">-&gt;</span> ${formatStagePoint(row.targetOathStageName, row.targetSetPoint)}`;
  if (Number(row.currentSetPoint || 0) < EQUIPMENT_TUNE_MIN_SET_POINT) return pointHtml;
  const tuneText = row.metricType === 'buffer'
    ? `버프력 ${formatEffectNumber(row.currentTuneBuffPower)} -> ${formatEffectNumber(row.targetTuneBuffPower)}`
    : `최종뎀 ${formatEffectNumber(row.currentTuneFinalDamage)}% -> ${formatEffectNumber(row.targetTuneFinalDamage)}%`;
  return `${pointHtml} / ${escape(tuneText)}`;
}

function formatEquipmentTuneEffectHtml(row, escapeHtml) {
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
  const currentPoint = formatOathStageNameHtml(`태초 ${formatEffectNumber(row.currentSetPoint)}`, escape);
  const targetPoint = formatOathStageNameHtml(`태초 ${formatEffectNumber(row.targetSetPoint)}`, escape);
  const pointHtml = `${currentPoint} <span class="enchant-oath-stage-arrow">-&gt;</span> ${targetPoint}`;
  const tuneText = row.metricType === 'buffer'
    ? `버프력 +${formatEffectNumber(row.currentTuneBuffPower)} -> +${formatEffectNumber(row.targetTuneBuffPower)}`
    : `최종뎀 +${formatEffectNumber(row.currentTuneFinalDamage)}% -> +${formatEffectNumber(row.targetTuneFinalDamage)}%`;
  return `${pointHtml} / ${escape(tuneText)}`;
}

function formatOathTranscendEffectHtml(row, isBuffer, escapeHtml, setPointOnly = false) {
  const hasSetPoint = Number.isFinite(row.currentSetPoint) && Number.isFinite(row.targetSetPoint) && row.currentSetPoint !== row.targetSetPoint;
  if (!hasSetPoint || (!row.currentOathStageName && !row.targetOathStageName)) return '';
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
  const optionText = setPointOnly ? '' : formatBlackFangEffect(row, isBuffer);
  const formatStagePoint = (stageName, setPoint, requiredPoint) => {
    return formatOathStageNameHtml(`${stageName || '서약'} ${formatEffectNumber(setPoint)}`, escape);
  };
  const pointHtml = `${formatStagePoint(row.currentOathStageName, row.currentSetPoint, row.currentOathStageRequiredPoint)} <span class="enchant-oath-stage-arrow">-&gt;</span> ${formatStagePoint(row.targetOathStageName, row.targetSetPoint, row.targetOathStageRequiredPoint)}`;
  return [pointHtml, optionText ? escape(optionText) : ''].filter(Boolean).join(' / ');
}

function formatLevelOptionName(name, levelOption) {
  const cleanName = String(name || '').trim();
  if (!cleanName || !levelOption) return cleanName;
  const levelTag = Number(levelOption || 0);
  const levelLabel = Number.isFinite(levelTag) && levelTag > 0 ? `${levelTag}Lv` : 'xxLv';
  return `${cleanName.replace(/\[\d+Lv\]/g, '').trim()}[${levelLabel}]`;
}

function formatPercent(value, digits = 3) {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

const {
  getDealerPrimaryStatKey,
  getDamageBaseline,
  getEquipmentScoreEffectiveStat,
  getSelectedStatEffect,
  estimateDamagePercent,
  estimateDamageMultiplier,
  regionAttackFlat: REGION_ATTACK_FLAT,
  elementDamagePerElement: ELEMENT_DAMAGE_PER_ELEMENT,
} = createEnchantDealerDamageMetric({
  elementEffectKeyByName: ELEMENT_EFFECT_KEY_BY_NAME,
});

const {
  getCostPerPointOnePercent,
  isMaterialAcquisition,
  isFreeActionRecommendation,
  isMaterialEnchantAcquisition,
  compareMaterialEnchantOrder,
  getRoundedMetricKey,
  isPreferredDuplicateRecommendation,
  removeInefficientLowerTierEnchants,
} = createEnchantRecommendationEvaluationPolicy({
  getRecommendationGold,
  materialEnchantMaterialOrder: MATERIAL_ENCHANT_MATERIAL_ORDER,
});

function getEnchantIncludeGroups(row = {}) {
  const materialLabel = row?.acquisition?.materialLabel || row?.acquisition?.materialItemName || '';
  if (row.sourceType === 'enchant' && MATERIAL_ENCHANT_MATERIAL_ORDER.some((label) => String(materialLabel).includes(label))) {
    return ['마법부여:가성비'];
  }
  if (row.sourceType === 'enchant') return [`마법부여:${row.tier || '일반'}`];
  if (row.sourceType === 'creatureArtifact') return ['오라/칭호/크리쳐:아티팩트'];
  if (row.sourceType === 'switchingTitle') return ['버프강화:칭호'];
  if (row.sourceType === 'switchingCreature') return ['버프강화:크리쳐'];
  if (row.sourceType === 'switchingFragment') return ['버프강화:짙편린'];
  if (row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem') return ['버프강화:아바타:플래티넘 엠블렘'];
  if (row.sourceType === 'avatar' && row.kind === 'switchingAvatar') return ['버프강화:아바타'];
  if (['creature', 'title', 'aura'].includes(row.sourceType)) {
    const typeLabel = { creature: '크리쳐', title: '칭호', aura: '오라' }[row.sourceType];
    return [
      `오라/칭호/크리쳐:${typeLabel}`,
      `오라/칭호/크리쳐:${row.tier === '플래티넘' ? '플래티넘' : '일반'}`,
    ];
  }
  if (row.sourceType === 'avatar') {
    return [`아바타:${row.kind === 'platinumEmblem' ? '플래티넘 엠블렘' : '엠블렘'}`];
  }
  if (row.sourceType === 'blackFang') return ['흑아:흑아'];
  if (row.sourceType === 'relicCraft') return ['유일:제작'];
  if (row.sourceType === 'equipmentTune') return ['장비:조율'];
  if (row.sourceType === 'oathTune') return ['서약:조율'];
  if (OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)) return ['서약:초월/정가'];
  if (row.sourceType === 'oathAcquisitionCombined') return ['서약:초월/정가'];
  if (row.tier === '안전증폭' || row.tier === '증폭 전환') {
    return ['강화/증폭:증폭'];
  }
  if (row.tier === '증폭') return ['강화/증폭:증폭'];
  if (row.tier === '강화') return ['강화/증폭:강화'];
  return [`기타:${row.tier || '일반'}`];
}

function getAcquisitionLabel(acquisition = {}) {
  acquisition = acquisition || {};
  const amount = Number(acquisition.amount || 0);
  const materialName = acquisition.materialLabel || acquisition.materialItemName || acquisition.materialName || '';
  if (Number.isFinite(amount) && amount > 0 && materialName) {
    return `${materialName} ${amount.toLocaleString('ko-KR')}개`;
  }
  return acquisition.label || materialName;
}

function getAcquisitionMarkup(acquisition = {}, escapeHtml) {
  acquisition = acquisition || {};
  const label = getAcquisitionLabel(acquisition);
  if (!label) return '';
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
  const icon = acquisition.materialIconUrl
    ? `<img src="${escape(acquisition.materialIconUrl)}" alt="" loading="lazy" decoding="async" />`
    : '';
  return `<span class="enchant-material-cost">${icon}<span>${escape(label)}</span></span>`;
}

function getCardRows(cards) {
  return cards.flatMap((card) => (card.sources || []).map((source) => ({
    sourceType: 'enchant',
    ...source,
    role: source.role || card.role || 'dealer',
    itemId: card.itemId,
    itemName: card.priceItem?.itemName || card.displayName || card.itemName,
    itemRarity: card.itemRarity,
    fame: card.fame,
    iconUrl: card.priceItem?.iconUrl || card.iconUrl || `https://img-api.neople.co.kr/df/items/${encodeURIComponent(card.itemId)}`,
    auction: card.auction || {},
    priceItem: card.priceItem || null,
    acquisition: card.acquisition || null,
  })));
}

function getReinforceSkillLevel(reinforceSkill = [], jobName = '', skillNames = null) {
  return (reinforceSkill || []).reduce((total, job) => {
    if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return total;
    return total + (job?.skills || []).reduce((sum, skill) => {
      if (skillNames && !skillNames.includes(skill?.name)) return sum;
      return sum + Number(skill?.value || 0);
    }, 0);
  }, 0);
}

const {
  getEffectSignature,
  getEnchantExclusiveGroupKey,
  getEnchantCandidateSignature,
  getAuraExclusiveGroupKey,
  getAuraCandidateSignature,
  getCreatureExclusiveGroupKey,
  getCreatureCandidateSignature,
  getCreatureArtifactType,
  getCreatureArtifactExclusiveGroupKey,
  getCreatureArtifactCandidateSignature,
  getTitleExclusiveGroupKey,
  getTitleCandidateSignature,
  getBlackFangExclusiveGroupKey,
  getBlackFangCandidateSignature,
  getRelicCraftExclusiveGroupKey,
  getRelicCraftCandidateSignature,
  getAvatarEmblemExclusiveGroupKey,
  getAvatarEmblemCandidateSignature,
  getAvatarPlatinumExclusiveGroupKey,
  getAvatarPlatinumCandidateSignature,
  getBuffSimulatorTargetSlotId,
  getBuffSimulatorExclusiveGroupKey,
  getBuffSimulatorCandidateSignature,
  getStableObjectSignature,
  getCurrentCreatureArtifactBySlot,
  creatureArtifactTypes: CREATURE_ARTIFACT_TYPES,
} = createEnchantSimulatorIdentity({
  effectOrder: EFFECT_ORDER,
  blackFangSimulatorSlots: BLACK_FANG_SIMULATOR_SLOTS,
  resolveCanonicalEquipmentSlotId,
  resolveCanonicalEquipmentSlotName,
});

const {
  buildSimulatedTitleTarget,
  getTitleRows,
  isSameTitleBase,
  getTitleBeadOnlyRow,
} = createEnchantTitleRecommendationSource({
  cloneSimulatorValue,
  addEffects,
  subtractEffects,
  getEffectSignature,
});

function getItemSkillLevelBonus(item, baseline, skillName, requiredLevel) {
  const jobName = baseline?.jobName || '';
  const namedBonus = getReinforceSkillLevel(item?.itemReinforceSkill || [], jobName, [skillName]);
  const rangeBonus = (item?.itemBuff?.reinforceSkill || []).reduce((total, job) => {
    if (job?.jobName && !['공통', jobName].includes(job.jobName)) return total;
    return total + (job?.levelRange || []).reduce((sum, range) => {
      const minimum = Number(range?.minLevel || 0);
      const maximum = Number(range?.maxLevel || 0);
      return minimum <= requiredLevel && requiredLevel <= maximum
        ? sum + Number(range?.value || 0)
        : sum;
    }, 0);
  }, 0);
  if (requiredLevel !== 50) return namedBonus + rangeBonus;
  const explain = String(item?.itemBuff?.explain || '');
  const explicitBonus = [...explain.matchAll(/50\s*(?:레벨|Lv)\s*액티브\s*스킬\s*Lv\s*\+\s*(\d+)/gi)]
    .reduce((total, match) => total + Number(match[1] || 0), 0);
  return namedBonus + rangeBonus + explicitBonus;
}

function getAuraRows(groups) {
  return (groups || []).flatMap((group) => (group.candidates || []).map((candidate) => ({
    sourceType: 'aura',
    slot: '오라',
    tier: candidate.variant || '일반',
    itemId: candidate.itemId,
    itemName: candidate.priceItem?.itemName || candidate.itemName || candidate.name,
    auraItemName: candidate.itemName || candidate.name,
    itemRarity: candidate.itemRarity || '레어',
    fame: candidate.fame,
    iconUrl: candidate.priceItem?.iconUrl || candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    auraIconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    itemReinforceSkill: candidate.itemReinforceSkill || [],
    itemBuff: candidate.itemBuff || {},
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.name,
    groupName: group.groupName,
    priceItem: candidate.priceItem || null,
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 1),
    skillDamagePercent: Number(candidate.skillDamagePercent || 0),
    reinforceSkillName: candidate.reinforceSkillName || '',
    reinforceSkillLevel: Number(candidate.reinforceSkillLevel || 0),
  })));
}

function getBlackFangRows(recommendations = []) {
  return (recommendations || []).map((candidate) => {
    const slot = candidate.slot;
    const targetEquipmentBody = candidate.targetEquipmentBody || {
      slotId: resolveCanonicalEquipmentSlotId({ slot }),
      slot,
      itemId: candidate.targetItemId || '',
      itemName: candidate.targetItemName || '',
      itemRarity: candidate.targetItemRarity || '',
      iconUrl: candidate.targetIconUrl || '',
      effects: candidate.targetEffects || {},
      itemExplain: candidate.targetItemExplain || '',
    };
    const targetSlotId = resolveCanonicalEquipmentSlotId(targetEquipmentBody);
    const currentEquipmentBody = candidate.currentEquipmentBody || {
      slotId: targetSlotId,
      slot,
      slotName: slot,
      itemId: candidate.currentItemId || '',
      itemName: candidate.currentItemName || '',
      itemRarity: candidate.currentItemRarity || '',
      effects: candidate.currentEffects || {},
      itemReinforceSkill: candidate.currentItemReinforceSkill || [],
      itemBuff: candidate.currentItemBuff || {},
    };
    return {
      sourceType: 'blackFang',
      slot,
      targetSlotId,
      tier: candidate.tier || '흑아',
      itemId: candidate.itemId,
      itemName: candidate.itemName,
      itemRarity: candidate.itemRarity || '',
      fame: 0,
      iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
      effects: candidate.effects || {},
      currentEffects: candidate.currentEffects || {},
      targetEffects: targetEquipmentBody.effects || {},
      currentEquipmentBody,
      targetEquipmentBody,
      itemExplain: candidate.itemExplain || '',
      auction: candidate.auction || {},
      expectedGold: candidate.expectedGold,
      materials: Array.isArray(candidate.materials) ? candidate.materials : [],
      materialText: candidate.materialText || '',
      targetItemName: targetEquipmentBody.itemName || '',
      targetItemId: targetEquipmentBody.itemId || '',
      targetItemRarity: targetEquipmentBody.itemRarity || '',
      targetIconUrl: targetEquipmentBody.iconUrl || '',
      targetItemExplain: targetEquipmentBody.itemExplain || '',
    };
  });
}

function getRelicCraftRows(recommendations = [], equipmentUpgrades = []) {
  return (recommendations || []).flatMap((candidate) => {
    const targetEquipmentBody = candidate.targetEquipmentBody || null;
    const targetSlotId = resolveCanonicalEquipmentSlotId(targetEquipmentBody || {});
    const targetSlotName = resolveCanonicalEquipmentSlotName(targetEquipmentBody || {});
    if (
      candidate.sourceType !== 'relicCraft'
      || !targetSlotId
      || !targetSlotName
      || !targetEquipmentBody?.itemId
      || !Object.keys(targetEquipmentBody.effects || {}).length
    ) return [];
    const targetEquipmentUpgrades = replaceEquipmentBodyInRows(
      equipmentUpgrades,
      targetEquipmentBody,
    );
    if (!targetEquipmentUpgrades) return [];
    const currentSetPoint = getEquipmentTuneSetPoint(equipmentUpgrades);
    const targetSetPoint = getEquipmentTuneSetPoint(targetEquipmentUpgrades);
    const currentTuneBuffPower = getEquipmentTuneStage(currentSetPoint)
      * EQUIPMENT_TUNE_MEMORY_BUFF_POWER;
    const targetTuneBuffPower = getEquipmentTuneStage(targetSetPoint)
      * EQUIPMENT_TUNE_MEMORY_BUFF_POWER;
    const currentEffects = candidate.currentEffects
      || candidate.currentEquipmentBody?.effects
      || {};
    const targetEffects = targetEquipmentBody.effects || {};
    return [{
      ...candidate,
      sourceType: 'relicCraft',
      slot: targetSlotName,
      targetSlotId,
      tier: candidate.tier || targetEquipmentBody.itemRarity || '',
      cardTitle: candidate.cardTitle || '유물 제작',
      cardSubtitle: candidate.cardSubtitle || targetSlotName,
      effects: subtractEffects(targetEffects, currentEffects),
      currentEffects,
      targetEffects,
      targetEquipmentBody,
      currentEquipmentSetPoint: currentSetPoint,
      targetEquipmentSetPoint: targetSetPoint,
      equipmentTuneBuffPowerDelta: targetTuneBuffPower - currentTuneBuffPower,
      skillDamageMultiplier: getEquipmentTuneDamageMultiplier(
        equipmentUpgrades,
        targetEquipmentUpgrades,
      ),
      materials: Array.isArray(candidate.materials) ? candidate.materials : [],
      simulatorSupported: true,
    }];
  });
}

function attachEquipmentBodyBaseData(equipmentRows = [], recommendations = []) {
  const recommendationBySlotId = new Map(
    (recommendations || [])
      .filter((row) => isEquipmentBodyReplacementSource(row))
      .map((row) => [
        resolveCanonicalEquipmentSlotId(row.targetEquipmentBody || row),
        row,
      ])
      .filter(([slotId]) => slotId),
  );
  return cloneSimulatorValue(equipmentRows || []).map((equipment) => {
    const recommendation = recommendationBySlotId.get(
      resolveCanonicalEquipmentSlotId(equipment),
    );
    if (!recommendation) return equipment;
    const currentBody = recommendation.currentEquipmentBody || {};
    return {
      ...equipment,
      bodyEffects: cloneSimulatorValue(
        currentBody.effects || recommendation.currentEffects || {},
      ),
      bodyExplain: currentBody.itemExplain || '',
      itemReinforceSkill: cloneSimulatorValue(currentBody.itemReinforceSkill || []),
      itemBuff: cloneSimulatorValue(currentBody.itemBuff || {}),
    };
  });
}

function addEffects(...effectRows) {
  const result = {};
  effectRows.forEach((effects) => {
    Object.entries(effects || {}).forEach(([key, value]) => {
      result[key] = Number(result[key] || 0) + Number(value || 0);
    });
  });
  return result;
}

function subtractEffects(nextEffects = {}, currentEffects = {}) {
  const keys = new Set([...Object.keys(nextEffects), ...Object.keys(currentEffects)]);
  const result = {};
  keys.forEach((key) => {
    const value = Number(nextEffects[key] || 0) - Number(currentEffects[key] || 0);
    if (Number.isFinite(value) && Math.abs(value) > 0.000001) {
      result[key] = value;
    }
  });
  return result;
}

function cloneSimulatorValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function getFinalDamageReplacementMultiplier(currentEffects = {}, targetEffects = {}) {
  const currentMultiplier = 1 + Number(currentEffects.finalDamage || 0) / 100;
  const targetMultiplier = 1 + Number(targetEffects.finalDamage || 0) / 100;
  return currentMultiplier > 0 && Number.isFinite(targetMultiplier)
    ? targetMultiplier / currentMultiplier
    : 1;
}

const {
  getCumulativeUpgradeEffectsForEquipment,
  getEquipmentProgressionMode,
  getEquipmentProgressionEffectsTotal,
  getEquipmentProgressionFinalDamageChangeMultiplier,
  getUpgradeRows,
  getEquipmentProgressionType,
  getEquipmentProgressionExclusiveGroupKey,
  getEquipmentProgressionCandidateSignature,
} = createEnchantEquipmentProgression({
  addEffects,
  subtractEffects,
  estimateDamagePercent,
  estimateDamageMultiplier,
  applyUpgradeMaterialPrices,
  getUpgradeMaterials,
  getFinalDamageReplacementMultiplier,
});

const {
  getBufferEquipmentTuneBaseRelativeChanges,
  getEquipmentTuneStage,
  getEquipmentTuneSetPoint,
  getEquipmentTuneDamageMultiplier,
  applyEquipmentTunePlan,
  getChangedEquipmentTuneSlots,
  getEquipmentTuneRows,
  getEquipmentTuneExclusiveGroupKey,
  getEquipmentTuneCandidateSignature,
} = createEnchantEquipmentTuneProgression({
  applyUpgradeMaterialPrices,
  cloneSimulatorValue,
  upgradeMaterialLabels: UPGRADE_MATERIAL_LABELS,
});

function normalizeSimulatorDamageDelta(effects = {}, baseline = {}) {
  const normalized = { ...(effects || {}) };
  const primaryKey = getDealerPrimaryStatKey(baseline);
  if (!primaryKey) return normalized;
  normalized[primaryKey] = Number(effects.allStat || 0) + Number(effects[primaryKey] || 0);
  delete normalized.allStat;
  delete normalized[primaryKey === 'str' ? 'int' : 'str'];
  return normalized;
}

const {
  getAvatarPlatinumDamageMultiplier,
  getDealerAvatarPlatinumEquipmentScoreMultiplier,
  getAvatarPlatinumRecommendationMultiplier,
  getAvatarRows,
  normalizeAvatarSimulatorState,
  getAvatarRegularEmblemEffectsTotal,
  getAvatarEmblemMetricBaseline,
} = createEnchantAvatarRecommendationSource({
  avatarPlatinumSlotLabelByKey: AVATAR_PLATINUM_SLOT_LABEL_BY_KEY,
  cloneSimulatorValue,
  getDealerPrimaryStatKey,
  addEffects,
  getDamageBaseline,
  normalizeSimulatorDamageDelta,
  subtractEffects,
  getSelectedStatEffect,
});

function getBuffLoadoutRowsForMetric(value) {
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === 'object');
  return value && typeof value === 'object' ? [value] : [];
}

const {
  getBufferSkillContributionMap,
  normalizeBuffLoadoutEquipmentSlotName,
  getBufferBaselineSkillContexts,
  mergeBufferSkillContexts,
  resolveBufferNetChanges,
  getBufferRecommendationScopeSimulator,
  getBufferAvatarEmblemChangesBySocket,
  getBufferSwitchingAvatarEmblemOverlays,
  resolveBufferSwitchingAvatarEmblemChanges,
  mergeBufferChangeMap,
  getBufferAvatarEmblemNetChanges,
  getBufferAvatarPlatinumBaseRelativeChanges,
  getBufferAvatarNetChanges,
} = createEnchantBufferSimulatorCalculation({
  getBuffLoadoutRowsForMetric,
  cloneSimulatorValue,
  getBuffSimulatorTargetSlotId,
  getSelectedStatEffect,
});

const {
  getBufferEnchantBaseRelativeChanges,
  getBufferCreatureArtifactBaseRelativeChanges,
  getBufferEquipmentBodyBaseRelativeChanges,
  getBufferCreatureBaseRelativeChanges,
  getBufferAuraBaseRelativeChanges,
  getBufferTitleBaseRelativeChanges,
  getBufferSwitchingCreatureBaseRelativeChanges,
  getBufferSwitchingTitleBaseRelativeChanges,
  getBufferSwitchingAvatarBaseRelativeChanges,
  getBufferSwitchingPlatinumBaseRelativeChanges,
  getBufferUpgradeBaseRelativeChanges,
} = createEnchantBufferSimulatorSourceCalculation({
  getReinforceSkillLevel,
  getBufferSkillContributionMap,
  getRoleRelevantEffects,
  getBufferSelectedStatEffect,
  getCreatureArtifactType,
  blackFangSimulatorSlots: BLACK_FANG_SIMULATOR_SLOTS,
  getItemSkillLevelBonus,
  buildSimulatedTitleTarget,
  getEquipmentProgressionType,
  getEquipmentProgressionMode,
  getCumulativeUpgradeEffectsForEquipment,
  resolveCanonicalEquipmentSlotId,
});

const {
  getBufferEnchantExclusiveGroupKey,
  getBufferEnchantCandidateSignature,
  getBufferBlackFangExclusiveGroupKey,
  getBufferBlackFangCandidateSignature,
  getBufferRelicCraftExclusiveGroupKey,
  getBufferRelicCraftCandidateSignature,
  getBufferCreatureExclusiveGroupKey,
  getBufferCreatureCandidateSignature,
  getBufferAuraExclusiveGroupKey,
  getBufferAuraCandidateSignature,
  getBufferTitleExclusiveGroupKey,
  getBufferTitleCandidateSignature,
  getBufferSwitchingCreatureExclusiveGroupKey,
  getBufferSwitchingCreatureCandidateSignature,
  getBufferSwitchingTitleExclusiveGroupKey,
  getBufferSwitchingTitleCandidateSignature,
  getBufferSwitchingAvatarExclusiveGroupKey,
  getBufferSwitchingAvatarCandidateSignature,
  getBufferSwitchingPlatinumExclusiveGroupKey,
  getBufferSwitchingPlatinumCandidateSignature,
  getBufferCreatureArtifactExclusiveGroupKey,
  getBufferCreatureArtifactCandidateSignature,
  getBufferUpgradeExclusiveGroupKey,
  getBufferUpgradeCandidateSignature,
} = createEnchantBufferSimulatorSourceIdentity({
  getEffectSignature,
  getStableObjectSignature,
  blackFangSimulatorSlots: BLACK_FANG_SIMULATOR_SLOTS,
  getTitleCandidateSignature,
  getBuffSimulatorExclusiveGroupKey,
  getBuffSimulatorCandidateSignature,
  getCreatureArtifactType,
  upgradeSlotLabels: UPGRADE_SLOT_LABELS,
  getEquipmentProgressionType,
  resolveCanonicalEquipmentSlotId,
  resolveCanonicalEquipmentSlotName,
});

const {
  getBuffLoadoutLevelContribution,
  getBuffEnhancementMetricMultiplier,
  adaptBuffEnhancementRecommendation,
} = createEnchantBuffEnhancementMetric({
  getBuffLoadoutRowsForMetric,
  cloneSimulatorValue,
  getBuffSimulatorTargetSlotId,
  getBuffSimulatorExclusiveGroupKey,
});

const {
  getBufferOathTuneBaseRelativeChanges,
  getOathTuneState,
  applyOathTunePlan,
  getChangedOathTuneSlots,
  getOathTuneDamageMultiplier,
  getOathCrystalEffectsTotal,
  getOathCrystalFinalDamageChangeMultiplier,
  getOathTuneRows,
  getOathTuneExclusiveGroupKey,
  getOathTuneCandidateSignature,
} = createEnchantOathProgression({
  addEffects,
  applyUpgradeMaterialPrices,
  cloneSimulatorValue,
  getEquipmentTuneSetPoint,
  equipmentTuneMinSetPoint: EQUIPMENT_TUNE_MIN_SET_POINT,
});

const {
  getOathAcquisitionSlotIndex,
  getOathTranscendRows,
  collapseOathDecisionRecommendationVariants,
  getOathAcquisitionVariantRows,
  getOathAcquisitionCombinedPairKey,
  getOathAcquisitionVariantFromRecommendations,
  getActiveOathAcquisitionSelectionEntries,
  getActiveOathAcquisitionSelections,
  getActiveOathAcquisitionMethodCounts,
  combineOathAcquisitionRecommendationRows,
  attachOathAcquisitionBaseCalculationData,
  replaceOathDecisionBody,
  getBufferOathStateBaseRelativeChanges,
  getBufferOathAcquisitionEvaluation,
  getOathAcquisitionSelectionDescriptors,
  getOathAcquisitionExclusiveGroupKey,
  getOathAcquisitionCandidateSignature,
  getOathAcquisitionTargetGroupKey,
  adaptOathAcquisitionRecommendation,
  isAppliedOathAcquisitionRecommendation,
  getActiveOathAcquisitionCountByVariantGroup,
  mergeAppliedOathAcquisitionSnapshots,
} = createEnchantOathAcquisition({
  oathDecisionVariantSourceTypes: OATH_DECISION_VARIANT_SOURCE_TYPES,
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

const {
  calculateBufferScore,
  compareBufferRecommendationOrder,
  getBufferRecommendationRows,
} = createEnchantBufferRecommendation({
  OATH_DECISION_VARIANT_SOURCE_TYPES,
  getReinforceSkillLevel,
  getItemSkillLevelBonus,
  isMaterialAcquisition,
  compareMaterialEnchantOrder,
  getCurrentCreatureArtifactBySlot,
  adaptOathAcquisitionRecommendation,
  getTitleBeadOnlyRow,
  isFreeActionRecommendation,
  getEffectSignature,
  addEffects,
  getRoleRelevantEffects,
  getBufferSelectedStatEffect,
  getBufferOathAcquisitionEvaluation,
  getBufferAvatarEmblemChangesBySocket,
  getBufferSwitchingAvatarEmblemOverlays,
  resolveBufferSwitchingAvatarEmblemChanges,
  getBufferCreatureArtifactBaseRelativeChanges,
  getBufferCreatureBaseRelativeChanges,
  getBufferAuraBaseRelativeChanges,
  getBufferTitleBaseRelativeChanges,
  getBufferSwitchingCreatureBaseRelativeChanges,
  getBufferSwitchingTitleBaseRelativeChanges,
  getBufferSwitchingPlatinumBaseRelativeChanges,
  getBufferSwitchingAvatarBaseRelativeChanges,
  getBufferAvatarPlatinumBaseRelativeChanges,
  mergeBufferChangeMap,
  getBufferEquipmentBodyBaseRelativeChanges,
  getBufferUpgradeBaseRelativeChanges,
  getBufferEquipmentTuneBaseRelativeChanges,
  getBufferOathTuneBaseRelativeChanges,
  getBufferEnchantBaseRelativeChanges,
  resolveBufferNetChanges,
  getCreatureArtifactType,
  getBuffSimulatorTargetSlotId,
  cloneSimulatorValue,
  getBufferRecommendationScopeSimulator,
  getBufferAvatarEmblemNetChanges,
  getRecommendationGold,
  getRoundedMetricKey,
  getStableObjectSignature,
  isPreferredDuplicateRecommendation,
  removeInefficientLowerTierEnchants,
});

function getOrderedOathAcquisitionEntries(entries = []) {
  const methodGroups = new Map();
  entries.forEach((entry) => {
    const method = String(entry.selection?.acquisitionMethod || '');
    if (!method) return;
    const group = methodGroups.get(method) || [];
    group.push(entry);
    methodGroups.set(method, group);
  });
  methodGroups.forEach((group) => group.sort((a, b) => a.slot - b.slot));
  return [...methodGroups.entries()]
    .sort(([, aEntries], [, bEntries]) => (
      bEntries.length - aEntries.length || aEntries[0].slot - bEntries[0].slot
    ))
    .flatMap(([, group]) => group);
}

function arrangeSimulatedOathAcquisitionSlots(crystals = [], simulator = {}) {
  const acquisitionEntries = Object.entries(simulator.activeSelectionByGroup || {})
    .filter(([, selection]) => (
      selection?.applyType === 'acquireOathDecision' &&
      selection?.acquisitionTargetGroupKey &&
      selection?.acquisitionMethod
    ))
    .map(([groupKey, selection]) => ({
      groupKey,
      selection,
      slot: getOathAcquisitionSlotIndex(selection, groupKey),
    }))
    .filter(({ slot }) => Number.isInteger(slot));
  if (!acquisitionEntries.length) return crystals;

  const acquisitionMethodBySlot = new Map(
    acquisitionEntries.map(({ slot, selection }) => [slot, selection.acquisitionMethod]),
  );
  const arranged = crystals.map((crystal) => {
    const acquisitionMethod = acquisitionMethodBySlot.get(Number(crystal?.index));
    return acquisitionMethod
      ? { ...crystal, simulatedAcquisitionMethod: acquisitionMethod }
      : crystal;
  });
  const placeCrystals = (selectedCrystals, targetPositions) => {
    const selected = selectedCrystals.filter(Boolean).slice(0, targetPositions.length);
    if (!selected.length) return;
    const selectedSet = new Set(selected);
    const sourcePositions = selected.map((crystal) => arranged.indexOf(crystal));
    const affectedPositions = [...new Set([...sourcePositions, ...targetPositions])]
      .filter((position) => position >= 0 && position < arranged.length)
      .sort((a, b) => a - b);
    const displacedCrystals = affectedPositions
      .map((position) => arranged[position])
      .filter((crystal) => crystal && !selectedSet.has(crystal));
    const targetSet = new Set(targetPositions);
    const openPositions = affectedPositions.filter((position) => !targetSet.has(position));
    targetPositions.forEach((position, index) => {
      if (position >= 0 && position < arranged.length) arranged[position] = selected[index];
    });
    openPositions.forEach((position, index) => {
      if (displacedCrystals[index]) arranged[position] = displacedCrystals[index];
    });
  };
  const crystalBySlot = new Map(
    arranged.map((crystal) => [Number(crystal?.index), crystal]),
  );
  const epicEntries = acquisitionEntries.filter(({ selection }) => (
    selection.acquisitionTargetGroupKey === 'oathAcquireTarget:에픽'
  ));
  const orderedEpicCrystals = getOrderedOathAcquisitionEntries(epicEntries)
    .map(({ slot }) => crystalBySlot.get(slot));
  placeCrystals(
    orderedEpicCrystals,
    Array.from({ length: orderedEpicCrystals.length }, (_, index) => index),
  );

  const primevalEntries = acquisitionEntries.filter(({ selection }) => (
    selection.acquisitionTargetGroupKey === 'oathAcquireTarget:태초'
  ));
  if (primevalEntries.length) {
    const methodBySlot = new Map(
      primevalEntries.map(({ slot, selection }) => [slot, selection.acquisitionMethod]),
    );
    const methodCounts = new Map();
    primevalEntries.forEach(({ selection }) => {
      const method = String(selection.acquisitionMethod || '');
      methodCounts.set(method, Number(methodCounts.get(method) || 0) + 1);
    });
    const methodFirstSlots = new Map();
    primevalEntries.forEach(({ slot, selection }) => {
      const method = String(selection.acquisitionMethod || '');
      methodFirstSlots.set(method, Math.min(Number(methodFirstSlots.get(method) ?? slot), slot));
    });
    const primevalCrystals = arranged
      .filter((crystal) => String(crystal?.itemRarity || '').trim() === '태초')
      .sort((a, b) => {
        const aIndex = Number(a?.index);
        const bIndex = Number(b?.index);
        const aMethod = String(methodBySlot.get(aIndex) || '');
        const bMethod = String(methodBySlot.get(bIndex) || '');
        return Number(methodCounts.get(bMethod) || 0) - Number(methodCounts.get(aMethod) || 0)
          || Number(methodFirstSlots.get(aMethod) ?? Number.MAX_SAFE_INTEGER)
            - Number(methodFirstSlots.get(bMethod) ?? Number.MAX_SAFE_INTEGER)
          || aIndex - bIndex;
      });
    placeCrystals(primevalCrystals, [8, 9, 10].slice(0, primevalCrystals.length));
  }
  return arranged;
}

function syncOathTuneStageDisplay(oathUpgrades = {}, db = {}) {
  const stage = getOathTuneState(db, Number(oathUpgrades?.setPoint || 0));
  if (stage?.stageName) oathUpgrades.setRarityName = stage.stageName;
  return oathUpgrades;
}

function restorePreviousOathAcquisitionSelection(simulator = {}, groupKey = '', selection = {}) {
  const slotIndex = getOathAcquisitionSlotIndex(selection, groupKey);
  const currentCrystals = simulator.simulatedOathUpgrades?.crystals || [];
  const currentIndex = currentCrystals.findIndex(
    (crystal) => Number(crystal?.index) === slotIndex,
  );
  if (currentIndex < 0) return false;
  const previousSelection = cloneSimulatorValue(selection.replacedAcquisitionSelection || null);
  const baseCrystal = (simulator.baseOathUpgrades?.crystals || [])
    .find((crystal) => Number(crystal?.index) === slotIndex);
  const previousCrystal = previousSelection?.targetDecision?.targetItemId
    ? replaceOathDecisionBody(
      currentCrystals[currentIndex],
      previousSelection.targetDecision,
      Number(simulator.oathTuneDb?.maxTuneLevel || 3),
    )
    : cloneSimulatorValue(baseCrystal || null);
  if (!previousCrystal) return false;
  simulator.simulatedOathUpgrades.setPoint = Number(simulator.simulatedOathUpgrades.setPoint || 0)
    - Number(currentCrystals[currentIndex]?.setPoint || 0)
    + Number(previousCrystal.setPoint || 0);
  currentCrystals.splice(currentIndex, 1, previousCrystal);
  if (previousSelection) {
    simulator.activeSelectionByGroup[groupKey] = previousSelection;
  } else {
    delete simulator.activeSelectionByGroup[groupKey];
  }
  return true;
}

function sortByPriceAsc(a, b) {
  const priceA = Number.isFinite(a?.auction?.minUnitPrice) ? a.auction.minUnitPrice : Number.POSITIVE_INFINITY;
  const priceB = Number.isFinite(b?.auction?.minUnitPrice) ? b.auction.minUnitPrice : Number.POSITIVE_INFINITY;
  if (priceA !== priceB) return priceA - priceB;
  const slotA = SLOT_ORDER.includes(a.slot) ? SLOT_ORDER.indexOf(a.slot) : SLOT_ORDER.length;
  const slotB = SLOT_ORDER.includes(b.slot) ? SLOT_ORDER.indexOf(b.slot) : SLOT_ORDER.length;
  if (slotA !== slotB) return slotA - slotB;
  return a.itemName.localeCompare(b.itemName, 'ko-KR');
}

function getAppliedSelectionRecommendationSnapshot(selection = {}) {
  return selection.appliedVariantSnapshot || selection.appliedRecommendationSnapshot || null;
}

function mergeAppliedSimulatorSnapshots(rows = [], simulator = {}) {
  if (!simulator) return rows;
  const snapshotsByIdentity = new Map();
  Object.entries(simulator.activeSelectionByGroup || {}).forEach(([exclusiveGroupKey, selection]) => {
    const snapshot = getAppliedSelectionRecommendationSnapshot(selection);
    if (!snapshot || !selection?.candidateSignature) return;
    const snapshotGroupKey = getSimulatorExclusiveGroupKey(snapshot);
    const snapshotSignature = getSimulatorCandidateSignature(snapshot);
    if (
      snapshotGroupKey !== exclusiveGroupKey
      || snapshotSignature !== selection.candidateSignature
    ) return;
    snapshotsByIdentity.set(
      `${exclusiveGroupKey}\u0000${selection.candidateSignature}`,
      cloneSimulatorValue(snapshot),
    );
  });
  const mergedRows = rows.map((row) => {
    const identity = `${getSimulatorExclusiveGroupKey(row)}\u0000${getSimulatorCandidateSignature(row)}`;
    const snapshot = snapshotsByIdentity.get(identity);
    return snapshot ? { ...row, ...cloneSimulatorValue(snapshot) } : row;
  });
  const renderedIdentities = new Set(mergedRows.map((row) => (
    `${getSimulatorExclusiveGroupKey(row)}\u0000${getSimulatorCandidateSignature(row)}`
  )));
  snapshotsByIdentity.forEach((snapshot, identity) => {
    if (!renderedIdentities.has(identity)) mergedRows.push(snapshot);
  });
  return mergedRows;
}

function getSimulatorExclusiveGroupKey(row = {}) {
  return getBufferEnchantExclusiveGroupKey(row)
    || getBufferCreatureArtifactExclusiveGroupKey(row)
    || getBufferUpgradeExclusiveGroupKey(row)
    || getBufferBlackFangExclusiveGroupKey(row)
    || getBufferRelicCraftExclusiveGroupKey(row)
    || getBufferCreatureExclusiveGroupKey(row)
    || getBufferAuraExclusiveGroupKey(row)
    || getBufferTitleExclusiveGroupKey(row)
    || getBufferSwitchingCreatureExclusiveGroupKey(row)
    || getBufferSwitchingTitleExclusiveGroupKey(row)
    || getBufferSwitchingAvatarExclusiveGroupKey(row)
    || getBufferSwitchingPlatinumExclusiveGroupKey(row)
    || getEnchantExclusiveGroupKey(row)
    || getAuraExclusiveGroupKey(row)
    || getCreatureExclusiveGroupKey(row)
    || getCreatureArtifactExclusiveGroupKey(row)
    || getTitleExclusiveGroupKey(row)
    || getEquipmentTuneExclusiveGroupKey(row)
    || getOathTuneExclusiveGroupKey(row)
    || getOathAcquisitionExclusiveGroupKey(row)
    || getBlackFangExclusiveGroupKey(row)
    || getRelicCraftExclusiveGroupKey(row)
    || getEquipmentProgressionExclusiveGroupKey(row)
    || getAvatarEmblemExclusiveGroupKey(row)
    || getAvatarPlatinumExclusiveGroupKey(row)
    || getBuffSimulatorExclusiveGroupKey(row);
}

function getSimulatorCandidateSignature(row = {}) {
  return getBufferEnchantCandidateSignature(row)
    || getBufferCreatureArtifactCandidateSignature(row)
    || getBufferUpgradeCandidateSignature(row)
    || getBufferBlackFangCandidateSignature(row)
    || getBufferRelicCraftCandidateSignature(row)
    || getBufferCreatureCandidateSignature(row)
    || getBufferAuraCandidateSignature(row)
    || getBufferTitleCandidateSignature(row)
    || getBufferSwitchingCreatureCandidateSignature(row)
    || getBufferSwitchingTitleCandidateSignature(row)
    || getBufferSwitchingAvatarCandidateSignature(row)
    || getBufferSwitchingPlatinumCandidateSignature(row)
    || getEnchantCandidateSignature(row)
    || getAuraCandidateSignature(row)
    || getCreatureCandidateSignature(row)
    || getCreatureArtifactCandidateSignature(row)
    || getTitleCandidateSignature(row)
    || getEquipmentTuneCandidateSignature(row)
    || getOathTuneCandidateSignature(row)
    || getOathAcquisitionCandidateSignature(row)
    || getBlackFangCandidateSignature(row)
    || getRelicCraftCandidateSignature(row)
    || getEquipmentProgressionCandidateSignature(row)
    || getAvatarEmblemCandidateSignature(row)
    || getAvatarPlatinumCandidateSignature(row)
    || getBuffSimulatorCandidateSignature(row);
}

const {
  getSkillDamageMultiplier,
  getReplacementIncrementalDamagePercent,
  getAdjustedElementBaselineForRecommendation,
  getElementAdjustedReplacementIncrementalDamagePercent,
  getCreatureArtifactEffectsTotal,
  getCreatureArtifactReplacementMultiplier,
  getCreatureArtifactDisplayEffects,
  getRepresentativeRecommendationRows,
  compareDealerRecommendationOrder,
} = createEnchantDealerRecommendation({
  tuneSourceTypes: TUNE_SOURCE_TYPES,
  creatureArtifactTypes: CREATURE_ARTIFACT_TYPES,
  elementEffectKeyByName: ELEMENT_EFFECT_KEY_BY_NAME,
  regionAttackFlat: REGION_ATTACK_FLAT,
  elementDamagePerElement: ELEMENT_DAMAGE_PER_ELEMENT,
  estimateDamagePercent,
  addEffects,
  subtractEffects,
  getDamageBaseline,
  getFinalDamageReplacementMultiplier,
  estimateDamageMultiplier,
  getSelectedStatEffect,
  getEquipmentScoreEffectiveStat,
  getCurrentCreatureArtifactBySlot,
  getCreatureArtifactType,
  isSameTitleBase,
  getTitleBeadOnlyRow,
  getCostPerPointOnePercent,
  getEffectSignature,
  getRoleRelevantEffects,
  getRoundedMetricKey,
  isMaterialAcquisition,
  isFreeActionRecommendation,
  isMaterialEnchantAcquisition,
  compareMaterialEnchantOrder,
  isPreferredDuplicateRecommendation,
  removeInefficientLowerTierEnchants,
});

const {
  buildSimulatedDamageBaseline,
  getSimulatorCumulativeDamageMultiplier,
} = createEnchantDealerSimulatorCalculation({
  addEffects,
  getFinalDamageReplacementMultiplier,
  getAvatarEmblemMetricBaseline,
  getDamageBaseline,
  getCreatureArtifactEffectsTotal,
  subtractEffects,
  getAvatarRegularEmblemEffectsTotal,
  getEquipmentProgressionEffectsTotal,
  getOathCrystalEffectsTotal,
  normalizeSimulatorDamageDelta,
  getSelectedStatEffect,
  elementDamagePerElement: ELEMENT_DAMAGE_PER_ELEMENT,
  getAdjustedElementBaselineForRecommendation,
  estimateDamageMultiplier,
  getSkillDamageMultiplier,
  getCreatureArtifactReplacementMultiplier,
  getEquipmentProgressionFinalDamageChangeMultiplier,
  getEquipmentTuneDamageMultiplier,
  getOathCrystalFinalDamageChangeMultiplier,
  getOathTuneDamageMultiplier,
  getElementAdjustedReplacementIncrementalDamagePercent,
  getReplacementIncrementalDamagePercent,
  getDealerAvatarPlatinumEquipmentScoreMultiplier,
  getAvatarPlatinumDamageMultiplier,
  getBuffEnhancementMetricMultiplier,
});

function hasHigherEnchantCandidate(row, recommendationRows) {
  if (row.sourceType !== 'enchant') return false;
  return (recommendationRows || []).some((candidate) => (
    candidate.sourceType === 'enchant' &&
    candidate.slot === row.slot &&
    candidate.incrementalDamagePercent > row.incrementalDamagePercent + 0.0001
  ));
}

function getSelectedEquipmentTuneStep(row = {}, stepIndex = 0) {
  const steps = Array.isArray(row.tuneSteps) ? row.tuneSteps : [];
  if (!steps.length) return null;
  const index = Math.max(0, Math.min(steps.length - 1, Number(stepIndex || 0)));
  return steps[index] || steps[0] || null;
}

function applyEquipmentTuneDisplayStep(
  row = {},
  stepIndex = 0,
  includeMaterialCosts = false,
  baseline = {},
  bufferBaseline = null,
  bufferSimulator = null,
) {
  if (!TUNE_SOURCE_TYPES.has(row.sourceType)) return row;
  const step = getSelectedEquipmentTuneStep(row, stepIndex);
  if (!step) return row;
  const displayRow = {
    ...row,
    itemName: row.sourceType === 'oathTune' ? '서약 조율' : '장비 조율',
    effects: step.effects || row.effects,
    auction: { ...(row.auction || {}), minUnitPrice: step.expectedGold },
    expectedGold: step.expectedGold,
    expectedMaterials: step.expectedMaterials || [],
    ...(TUNE_SOURCE_TYPES.has(row.sourceType) ? {
      tunePlan: cloneSimulatorValue(step.tunePlan || { steps: [], slotChanges: [] }),
    } : {}),
    selectedTuneStepIndex: step.index,
    currentSetPoint: step.currentSetPoint,
    targetSetPoint: step.targetSetPoint,
    currentTuneFinalDamage: step.currentFinalDamage,
    targetTuneFinalDamage: step.targetFinalDamage,
    currentTuneBuffPower: step.currentBuffPower,
    targetTuneBuffPower: step.targetBuffPower,
    currentOathSetFinalDamage: step.currentSetFinalDamage,
    targetOathSetFinalDamage: step.targetSetFinalDamage,
    currentOathStageName: step.currentStageName,
    targetOathStageName: step.targetStageName,
    tuneCount: step.tuneCount,
  };
  if (displayRow.metricType === 'buffer' && bufferBaseline?.isBuffer) {
    const isOathTune = displayRow.sourceType === 'oathTune';
    displayRow.bufferBaseRelativeChanges = isOathTune
      ? getBufferOathTuneBaseRelativeChanges(displayRow)
      : getBufferEquipmentTuneBaseRelativeChanges(displayRow);
    const referenceEquipmentTuneChanges = {
      ...(bufferSimulator?.equipmentTuneChangesBySource || {}),
    };
    const referenceOathTuneChanges = {
      ...(bufferSimulator?.oathTuneChangesBySource || {}),
    };
    if (isOathTune) delete referenceOathTuneChanges.oathTune;
    else delete referenceEquipmentTuneChanges.equipmentTune;
    const currentChanges = bufferSimulator?.role === 'buffer'
      ? resolveBufferNetChanges(
        bufferSimulator.enchantChangesBySlot,
        bufferSimulator.bufferSkillContexts,
        bufferSimulator.artifactChangesByType,
        bufferSimulator.upgradeChangesBySlot,
        referenceEquipmentTuneChanges,
        referenceOathTuneChanges,
        bufferSimulator.oathAcquisitionChangesBySource,
        bufferSimulator.equipmentBodyChangesBySlot,
        bufferSimulator.creatureChangesBySource,
        bufferSimulator.auraChangesBySource,
        bufferSimulator.titleChangesBySource,
        bufferSimulator.switchingCreatureChangesBySource,
        bufferSimulator.switchingTitleChangesBySource,
        bufferSimulator.switchingAvatarChangesBySlot,
        bufferSimulator.switchingPlatinumChangesBySlot,
        getBufferAvatarNetChanges(bufferSimulator),
        bufferSimulator,
      )
      : {};
    const candidateChanges = bufferSimulator?.role === 'buffer'
      ? resolveBufferNetChanges(
        bufferSimulator.enchantChangesBySlot,
        bufferSimulator.bufferSkillContexts,
        bufferSimulator.artifactChangesByType,
        bufferSimulator.upgradeChangesBySlot,
        isOathTune
          ? referenceEquipmentTuneChanges
          : {
            ...referenceEquipmentTuneChanges,
            equipmentTune: displayRow.bufferBaseRelativeChanges,
          },
        isOathTune
          ? {
            ...referenceOathTuneChanges,
            oathTune: displayRow.bufferBaseRelativeChanges,
          }
          : referenceOathTuneChanges,
        bufferSimulator.oathAcquisitionChangesBySource,
        bufferSimulator.equipmentBodyChangesBySlot,
        bufferSimulator.creatureChangesBySource,
        bufferSimulator.auraChangesBySource,
        bufferSimulator.titleChangesBySource,
        bufferSimulator.switchingCreatureChangesBySource,
        bufferSimulator.switchingTitleChangesBySource,
        bufferSimulator.switchingAvatarChangesBySlot,
        bufferSimulator.switchingPlatinumChangesBySlot,
        getBufferAvatarNetChanges(bufferSimulator),
        bufferSimulator,
      )
      : displayRow.bufferBaseRelativeChanges;
    const currentScore = calculateBufferScore(bufferBaseline, currentChanges);
    const candidateScore = calculateBufferScore(bufferBaseline, candidateChanges);
    const incrementalBuffScore = candidateScore - currentScore;
    const incrementalBuffPercent = currentScore > 0 ? (candidateScore / currentScore - 1) * 100 : 0;
    displayRow.currentBufferScore = currentScore;
    displayRow.candidateBufferScore = candidateScore;
    displayRow.incrementalBuffScore = incrementalBuffScore;
    displayRow.incrementalBuffPercent = incrementalBuffPercent;
    displayRow.buffCostPerHundredPoints = incrementalBuffScore > 0
      ? getRecommendationGold(displayRow, includeMaterialCosts) * 100 / incrementalBuffScore
      : 0;
    displayRow.incrementalDamagePercent = incrementalBuffPercent;
    return displayRow;
  }
  const selectedDamage = estimateDamagePercent(displayRow.effects || {}, baseline);
  displayRow.incrementalDamagePercent = selectedDamage;
  displayRow.costPerPointOnePercent = getCostPerPointOnePercent({
    ...displayRow,
    incrementalDamagePercent: selectedDamage,
  }, includeMaterialCosts);
  return displayRow;
}

function getTuneStepIndexBySource(state = {}, sourceType = 'equipmentTune') {
  const bySource = state.tuneStepIndexBySource || {};
  if (Object.prototype.hasOwnProperty.call(bySource, sourceType)) {
    return Number(bySource[sourceType] || 0);
  }
  return sourceType === 'equipmentTune' ? Number(state.equipmentTuneStepIndex || 0) : 0;
}

function formatTitlePurchaseRouteLabel(row) {
  const elementLabel = row?.titleEnchantElement
    ? ELEMENT_LABEL_BY_NAME[row.titleEnchantElement] || row.titleEnchantElement
    : '';
  if (row?.purchaseRoute === 'cleanTitlePlusBead') {
    return elementLabel ? `무보주 칭호 + ${elementLabel} 칭호 보주` : '무보주 칭호 + 칭호 보주';
  }
  if (row?.purchaseRoute === 'titleBeadOnly') {
    return elementLabel ? `${elementLabel} 칭호 보주 교체` : '칭호 보주 교체';
  }
  if (row?.purchaseRoute === 'attachedBead') {
    return elementLabel ? `보주 발린 칭호 / ${elementLabel}` : '보주 발린 칭호';
  }
  return row?.purchaseRouteLabel || '';
}

export function installEnchantView(ctx) {
  const { els, state } = ctx;
  const {
    API_BASE,
    ENCHANT_INCLUDE_FILTER_STORAGE_KEY,
    ENCHANT_INCLUDE_KNOWN_FILTER_STORAGE_KEY,
    normalizeApiErrorMessage,
    parseApiJsonResponse,
  } = ctx.constants;
  const { bindCharacterAvatars, escapeHtml, getCharacterAvatarUrl, getCharacterPortraitMarkup } = ctx.deps;

  const { renderEfficiencyLegend } = createEnchantEfficiencyLegend({
    escapeHtml,
    legendElement: els.enchantEfficiencyLegend,
    getIsBuffer: () => Boolean(state.currentBufferBaseline?.isBuffer),
  });

  const {
    resetEnchantRecommendationFilters,
    renderEnchantIncludeControls,
    renderEnchantFilters,
    getSelectedEnchantIncludeTiers,
    isEnchantIncludeKeySelected,
  } = createEnchantRecommendationControls({
    escapeHtml,
    slotOrder: SLOT_ORDER,
    getIncludeKeysForRow: getEnchantIncludeGroups,
    slotFilter: els.enchantSlotFilter,
    tierFilter: els.enchantTierFilter,
    includeControls: els.enchantIncludeControls,
    includeFilterStorageKey: ENCHANT_INCLUDE_FILTER_STORAGE_KEY,
    includeKnownFilterStorageKey: ENCHANT_INCLUDE_KNOWN_FILTER_STORAGE_KEY,
    storage: {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
    },
  });

  const {
    showEnchantAnalysisLoading,
    showEnchantAnalysisError,
    showEnchantAnalysisResults,
    setEnchantCandidatePanel,
    showEnchantCandidateLoading,
  } = createEnchantSearchPanels({
    els,
    state,
    escapeHtml,
    bindCharacterAvatars,
    getCharacterPortraitMarkup,
  });

  const { renderOathLoadoutBoard } = createEnchantOathLoadoutBoard({
    escapeHtml,
    formatEffectValue,
    formatEffectNumber,
    getEffectLabel: (key) => EFFECT_LABELS[key],
    getLoadoutRarityClass,
    getOathStageRarityClass,
    getDealerPrimaryStatKey,
    normalizeDealerEnchantDisplayEffects,
    getActiveOathUpgrades,
    arrangeOathCrystals: (crystals) => arrangeSimulatedOathAcquisitionSlots(
      crystals,
      state.dealerSimulator || {},
    ),
    getBaseOathCrystal: (oathIndex) => (
      state.dealerSimulator?.baseOathUpgrades?.crystals || []
    ).find((item) => Number(item?.index) === oathIndex),
    getOathSweepState: (oathIndex) => {
      const activeSweepSlots = state.dealerSimulator?.activeSweepSlots;
      const key = `oath:${oathIndex}`;
      return {
        active: Boolean(activeSweepSlots?.has(key)),
        entry: activeSweepSlots?.get(key),
      };
    },
    getOathDetailContext: () => (
      state.currentBufferBaseline?.isBuffer
        ? {
          isBuffer: true,
          statName: state.currentBufferBaseline?.statName,
        }
        : {
          isBuffer: false,
          damageBaseline: getActiveDamageBaseline() || {},
        }
    ),
  });

  const { renderAvatarLoadoutBoard } = createEnchantAvatarLoadoutBoard({
    escapeHtml,
    getCharacterAvatarUrl,
    getActiveAvatar,
    getActiveAura,
    mergeAuraBodyWithEmblems,
    getCurrentAvatarPlatinumSlots: () => state.currentAvatar?.avatar?.platinumSlots,
    getAvatarSweepEntry: (slotId) => (
      state.dealerSimulator?.activeSweepSlots?.get(`avatar:${slotId}`)
    ),
    avatarSlotIdByKey: AVATAR_LOADOUT_SLOT_ID_BY_KEY,
    avatarPlatinumSlotLabelByKey: AVATAR_PLATINUM_SLOT_LABEL_BY_KEY,
  });

  const { renderBuffLoadoutBoard } = createEnchantBuffLoadoutBoard({
    escapeHtml,
    getLoadoutRarityClass,
    getBuffLoadoutBoardContext: () => ({
      simulatedBuffLoadout: state.dealerSimulator?.simulatedBuffLoadout,
      baseBuffLoadout: state.dealerSimulator?.baseBuffLoadout,
      currentBuffLoadout: state.currentBuffLoadout,
      currentBufferBaseline: state.currentBufferBaseline,
      targetJobName: state.enchantTargetCharacter?.jobName,
      simulatorRole: state.dealerSimulator?.role,
    }),
    getBuffSweepEntry: (key) => state.dealerSimulator?.activeSweepSlots?.get(key),
    getBuffLoadoutLevelContribution,
    normalizeBuffLoadoutEquipmentSlotName,
    avatarSlotIdByKey: AVATAR_LOADOUT_SLOT_ID_BY_KEY,
  });

  state.enchantCards = [];
  state.creatureUpgradeGroups = [];
  state.creatureArtifactGroups = [];
  state.titleUpgradeGroups = [];
  state.auraUpgradeGroups = [];
  state.enchantPriceLoaded = false;
  state.currentEnchants = [];
  state.currentCreature = null;
  state.currentTitle = null;
  state.currentAura = null;
  state.currentAvatar = null;
  state.currentBuffLoadout = null;
  state.switchingTitleRecommendations = [];
  state.switchingCreatureRecommendations = [];
  state.switchingFragmentRecommendations = [];
  state.currentEquipmentUpgrades = [];
  state.currentOathUpgrades = null;
  state.enchantLoadoutTab = 'equipment';
  state.enchantSearchCandidates = [];
  state.currentOathTranscendRecommendations = [];
  state.currentOathCraftRecommendations = [];
  state.oathTuneStageDb = null;
  state.currentBlackFangRecommendations = [];
  state.currentRelicCraftRecommendations = [];
  state.upgradeExpectedDb = null;
  state.upgradeMaterialPrices = {};
  state.currentDamageBaseline = null;
  state.currentBufferBaseline = null;
  state.currentBufferSkillContexts = {};
  state.currentBufferScoreStatus = 'idle';
  state.currentOfficialEquipmentScore = null;
  state.currentOfficialEquipmentScoreStatus = 'idle';
  state.currentOfficialEquipmentScoreCharacterKey = '';
  state.currentOfficialBufferScore = null;
  state.currentOfficialBufferScoreStatus = 'idle';
  state.currentOfficialBufferScoreCharacterKey = '';
  state.currentEnchantCharacterKey = '';
  state.currentCreatureCharacterKey = '';
  state.currentTitleCharacterKey = '';
  state.currentAuraCharacterKey = '';
  state.currentAvatarCharacterKey = '';
  state.enchantTargetCharacter = null;
  state.enchantRecommendationLoading = false;
  state.enchantSearchMode = 'analysis';
  state.enchantPricedAt = '';
  state.creaturePricedAt = '';
  state.titlePricedAt = '';
  state.auraPricedAt = '';
  state.enchantLoading = false;
  state.enchantTiming = null;
  state.enchantRequestId = 0;
  state.equipmentTuneStepIndex = 0;
  state.tuneStepIndexBySource = {};
  state.oathDecisionVariantIndexByGroup = {};
  state.oathAcquisitionCombinedCountsByPair = {};
  state.lastRecommendationDisplayOrder = [];
  state.frozenRecommendationDisplayKey = '';
  state.frozenRecommendationDisplayIndex = -1;
  state.equipmentTunePopoverOpen = false;
  state.equipmentTunePopoverSource = '';
  state.dealerSimulator = null;
  state.dealerSimulatorRecommendations = new Map();
  state.renderedOathAcquisitionCombinedRows = new Map();
  state.dealerSimulatorSuppressClickUntil = 0;

  function getActiveSimulator() {
    return state.dealerSimulator;
  }

  function isDealerSimulatorActive() {
    return state.dealerSimulator?.role === 'dealer';
  }

  function isBufferSimulatorActive() {
    return state.dealerSimulator?.role === 'buffer';
  }

  function getActiveEnchants() {
    return isDealerSimulatorActive() || isBufferSimulatorActive()
      ? state.dealerSimulator.simulatedEnchants
      : state.currentEnchants;
  }

  function getActiveEquipmentUpgrades() {
    return isDealerSimulatorActive() || isBufferSimulatorActive()
      ? state.dealerSimulator.simulatedEquipmentUpgrades
      : state.currentEquipmentUpgrades;
  }

  function getActiveOathUpgrades() {
    return isDealerSimulatorActive() || isBufferSimulatorActive()
      ? state.dealerSimulator.simulatedOathUpgrades
      : state.currentOathUpgrades;
  }

  function getDisplayOrderedOathTuneUpgrades(oathUpgrades) {
    if (!oathUpgrades || !state.dealerSimulator) return oathUpgrades;
    const arrangedCrystals = arrangeSimulatedOathAcquisitionSlots(
      (oathUpgrades.crystals || []).slice().sort(
        (a, b) => Number(a?.index || 0) - Number(b?.index || 0),
      ),
      state.dealerSimulator,
    );
    return {
      ...oathUpgrades,
      crystals: arrangedCrystals.map((crystal, index) => ({
        ...crystal,
        simulatedTuneOrder: index,
      })),
    };
  }

  function getOathTuneRecommendationUpgrades() {
    const activeTune = state.dealerSimulator?.activeSelectionByGroup?.oathTune;
    const oathUpgrades = activeTune?.actionType === 'oathTunePlan' && activeTune.beforeTuneSnapshot
      ? activeTune.beforeTuneSnapshot
      : getActiveOathUpgrades();
    return getDisplayOrderedOathTuneUpgrades(oathUpgrades);
  }

  function getCurrentAvatarAuraSlot() {
    const slots = state.currentAvatar?.avatar?.slots;
    return Array.isArray(slots)
      ? slots.find((slot) => String(slot?.slotId || '').trim() === 'AURORA') || null
      : null;
  }

  function mergeAuraBodyWithEmblems(auraBody = {}, emblemSource = {}) {
    const merged = cloneSimulatorValue(auraBody || {});
    ['emblems', 'emblem', 'emblemItems', 'emblemSlots', 'platinumEmblems', 'platinumEmblemItems']
      .forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(emblemSource || {}, key)) {
          merged[key] = cloneSimulatorValue(emblemSource[key]);
        }
      });
    return merged;
  }

  function getCanonicalCurrentAura() {
    return mergeAuraBodyWithEmblems(state.currentAura || {}, getCurrentAvatarAuraSlot() || {});
  }

  function getCanonicalCurrentAvatar() {
    return normalizeAvatarSimulatorState(state.currentAvatar?.avatar || {});
  }

  function getActiveAvatar() {
    return isDealerSimulatorActive() || isBufferSimulatorActive()
      ? state.dealerSimulator.simulatedAvatar
      : getCanonicalCurrentAvatar();
  }

  function getActiveAura() {
    return isDealerSimulatorActive() || isBufferSimulatorActive()
      ? state.dealerSimulator.simulatedAura
      : getCanonicalCurrentAura();
  }

  function getCanonicalCurrentCreatureBody() {
    const creature = cloneSimulatorValue(state.currentCreature || {});
    delete creature.artifacts;
    return creature;
  }

  function getCanonicalCurrentCreatureArtifacts() {
    return cloneSimulatorValue(state.currentCreature?.artifacts || []);
  }

  function getActiveCreatureArtifacts() {
    return isDealerSimulatorActive() || isBufferSimulatorActive()
      ? state.dealerSimulator.simulatedCreatureArtifacts
      : getCanonicalCurrentCreatureArtifacts();
  }

  function getActiveCreatureWithArtifacts() {
    return {
      ...(getActiveCreature() || {}),
      artifacts: cloneSimulatorValue(getActiveCreatureArtifacts()),
    };
  }

  function getActiveCreature() {
    return isDealerSimulatorActive() || isBufferSimulatorActive()
      ? state.dealerSimulator.simulatedCreature
      : getCanonicalCurrentCreatureBody();
  }

  function getActiveTitle() {
    return isDealerSimulatorActive() || isBufferSimulatorActive()
      ? state.dealerSimulator.simulatedTitle
      : state.currentTitle;
  }

  function getActiveDamageBaseline() {
    return isDealerSimulatorActive()
      ? state.dealerSimulator.simulatedDamageBaseline
      : state.currentDamageBaseline;
  }

  function getDealerSimulatorRecommendationContext(rows = []) {
    const simulator = state.dealerSimulator;
    const hasActiveSelections = Boolean(Object.keys(simulator?.activeSelectionByGroup || {}).length);
    if (!simulator || !hasActiveSelections) return { rows, options: null };
    const eligibleSignatures = new Set(simulator.baseEligibleEnchantCandidateSignatures || []);
    const eligibleAuraSignatures = new Set(simulator.baseEligibleAuraCandidateSignatures || []);
    const eligibleCreatureSignatures = new Set(simulator.baseEligibleCreatureCandidateSignatures || []);
    const candidateRows = rows.filter((row) => (
      (row.sourceType !== 'enchant' || !eligibleSignatures.size || eligibleSignatures.has(getEnchantCandidateSignature(row))) &&
      (row.sourceType !== 'aura' || !eligibleAuraSignatures.size || eligibleAuraSignatures.has(getAuraCandidateSignature(row))) &&
      (row.sourceType !== 'creature' || !eligibleCreatureSignatures.size || eligibleCreatureSignatures.has(getCreatureCandidateSignature(row)))
    )).map((row) => adaptOathAcquisitionRecommendation(row, simulator)).filter(Boolean)
      .map((row) => {
        if (row.sourceType !== 'avatar' || row.kind !== 'platinumEmblem') return row;
        const {
          finalDamage: _finalDamage,
          skillDamageMultiplier: _skillDamageMultiplier,
          ...displayNeutralEffects
        } = row.effects || {};
        const currentMultiplier = Number(
          simulator.avatarPlatinumChangesBySlot?.[row.targetSlotId]?.skillDamageMultiplier || 1,
        );
        const targetMultiplier = getAvatarPlatinumRecommendationMultiplier(row);
        const relativeMultiplier = currentMultiplier > 0 ? targetMultiplier / currentMultiplier : 0;
        return {
          ...row,
          skillDamageMultiplier: relativeMultiplier,
          effects: {
            ...displayNeutralEffects,
            skillDamageMultiplier: relativeMultiplier,
          },
        };
      });
    const referenceEnchantBySlot = new Map(simulator.baseEnchants
      .filter((enchant) => enchant?.slot)
      .map((enchant) => [enchant.slot, enchant]));
    const referenceBaselineBySlot = new Map();
    candidateRows.forEach((row) => {
      if (row.sourceType !== 'enchant' || referenceBaselineBySlot.has(row.slot)) return;
      const referenceEnchants = simulator.simulatedEnchants
        .filter((enchant) => enchant?.slot !== row.slot)
        .map(cloneSimulatorValue);
      const baseEnchant = referenceEnchantBySlot.get(row.slot);
      if (baseEnchant) referenceEnchants.push(cloneSimulatorValue(baseEnchant));
      referenceBaselineBySlot.set(
        row.slot,
        buildSimulatedDamageBaseline(
          simulator.baseDamageBaseline,
          simulator.baseEnchants,
          referenceEnchants,
          simulator.baseAura,
          simulator.simulatedAura,
          simulator.baseCreature,
          simulator.simulatedCreature,
          simulator.baseTitle,
          simulator.simulatedTitle,
          simulator.baseEquipmentUpgrades,
          simulator.simulatedEquipmentUpgrades,
          simulator.baseOathUpgrades,
          simulator.simulatedOathUpgrades,
          simulator.baseAvatar,
          simulator.simulatedAvatar,
          'actual',
          simulator.baseCreatureArtifacts,
          simulator.simulatedCreatureArtifacts,
          simulator.upgradeDb,
        ),
      );
    });
    const auraReferenceBaseline = buildSimulatedDamageBaseline(
      simulator.baseDamageBaseline,
      simulator.baseEnchants,
      simulator.simulatedEnchants,
      simulator.baseAura,
      simulator.baseAura,
      simulator.baseCreature,
      simulator.simulatedCreature,
      simulator.baseTitle,
      simulator.simulatedTitle,
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
      simulator.baseOathUpgrades,
      simulator.simulatedOathUpgrades,
      simulator.baseAvatar,
      simulator.simulatedAvatar,
      'actual',
      simulator.baseCreatureArtifacts,
      simulator.simulatedCreatureArtifacts,
      simulator.upgradeDb,
    );
    const creatureReferenceBaseline = buildSimulatedDamageBaseline(
      simulator.baseDamageBaseline,
      simulator.baseEnchants,
      simulator.simulatedEnchants,
      simulator.baseAura,
      simulator.simulatedAura,
      simulator.baseCreature,
      simulator.baseCreature,
      simulator.baseTitle,
      simulator.simulatedTitle,
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
      simulator.baseOathUpgrades,
      simulator.simulatedOathUpgrades,
      simulator.baseAvatar,
      simulator.simulatedAvatar,
      'actual',
      simulator.baseCreatureArtifacts,
      simulator.simulatedCreatureArtifacts,
      simulator.upgradeDb,
    );
    const titleReferenceBaseline = buildSimulatedDamageBaseline(
      simulator.baseDamageBaseline,
      simulator.baseEnchants,
      simulator.simulatedEnchants,
      simulator.baseAura,
      simulator.simulatedAura,
      simulator.baseCreature,
      simulator.simulatedCreature,
      simulator.baseTitle,
      simulator.baseTitle,
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
      simulator.baseOathUpgrades,
      simulator.simulatedOathUpgrades,
      simulator.baseAvatar,
      simulator.simulatedAvatar,
      'actual',
      simulator.baseCreatureArtifacts,
      simulator.simulatedCreatureArtifacts,
      simulator.upgradeDb,
    );
    const baseEquipmentBySlot = new Map(
      simulator.baseEquipmentUpgrades.map((equipment) => [equipment?.slot, equipment]),
    );
    const progressionReferenceBaselineBySlot = new Map();
    Object.values(simulator.activeSelectionByGroup || {}).forEach((selection) => {
      if (selection?.applyType !== 'replaceEquipmentProgression' || !selection.targetSlot) return;
      const baseEquipment = baseEquipmentBySlot.get(selection.targetSlot);
      if (!baseEquipment) return;
      const referenceEquipment = simulator.simulatedEquipmentUpgrades.map((equipment) => {
        if (equipment?.slot !== selection.targetSlot) return cloneSimulatorValue(equipment);
        const reference = cloneSimulatorValue(equipment);
        reference.reinforce = Number(baseEquipment.reinforce || 0);
        reference.isAmplified = Boolean(baseEquipment.isAmplified);
        reference.amplificationName = baseEquipment.amplificationName || '';
        return reference;
      });
      progressionReferenceBaselineBySlot.set(
        selection.targetSlot,
        buildSimulatedDamageBaseline(
          simulator.baseDamageBaseline,
          simulator.baseEnchants,
          simulator.simulatedEnchants,
          simulator.baseAura,
          simulator.simulatedAura,
          simulator.baseCreature,
          simulator.simulatedCreature,
          simulator.baseTitle,
          simulator.simulatedTitle,
          simulator.baseEquipmentUpgrades,
          referenceEquipment,
          simulator.baseOathUpgrades,
          simulator.simulatedOathUpgrades,
          simulator.baseAvatar,
          simulator.simulatedAvatar,
          'actual',
          simulator.baseCreatureArtifacts,
          simulator.simulatedCreatureArtifacts,
          simulator.upgradeDb,
        ),
      );
    });
    const equipmentBodyReferenceBaselineBySlot = new Map();
    candidateRows.forEach((row) => {
      if (!isEquipmentBodyReplacementSource(row) || equipmentBodyReferenceBaselineBySlot.has(row.slot)) return;
      const referenceEquipment = simulator.simulatedEquipmentUpgrades.map((equipment) => (
        equipment?.slot === row.slot && baseEquipmentBySlot.has(row.slot)
          ? cloneSimulatorValue(baseEquipmentBySlot.get(row.slot))
          : cloneSimulatorValue(equipment)
      ));
      equipmentBodyReferenceBaselineBySlot.set(
        row.slot,
        buildSimulatedDamageBaseline(
          simulator.baseDamageBaseline,
          simulator.baseEnchants,
          simulator.simulatedEnchants,
          simulator.baseAura,
          simulator.simulatedAura,
          simulator.baseCreature,
          simulator.simulatedCreature,
          simulator.baseTitle,
          simulator.simulatedTitle,
          simulator.baseEquipmentUpgrades,
          referenceEquipment,
          simulator.baseOathUpgrades,
          simulator.simulatedOathUpgrades,
          simulator.baseAvatar,
          simulator.simulatedAvatar,
          'actual',
          simulator.baseCreatureArtifacts,
          simulator.simulatedCreatureArtifacts,
          simulator.upgradeDb,
        ),
      );
    });
    const baseAvatarBySlotId = new Map(
      (simulator.baseAvatar?.slots || []).map((slot) => [slot?.slotId, slot]),
    );
    const avatarReferenceBaselineBySlotId = new Map();
    candidateRows.forEach((row) => {
      if (
        row.sourceType !== 'avatar'
        || row.kind !== 'brilliantEmblem'
        || !row.targetSlotId
        || avatarReferenceBaselineBySlotId.has(row.targetSlotId)
      ) return;
      const referenceAvatar = cloneSimulatorValue(simulator.simulatedAvatar || {});
      const referenceSlot = (referenceAvatar.slots || [])
        .find((slot) => slot?.slotId === row.targetSlotId);
      const baseSlot = baseAvatarBySlotId.get(row.targetSlotId);
      if (!referenceSlot || !baseSlot) return;
      referenceSlot.emblems = cloneSimulatorValue(baseSlot.emblems || [null, null]);
      avatarReferenceBaselineBySlotId.set(
        row.targetSlotId,
        buildSimulatedDamageBaseline(
          simulator.baseDamageBaseline,
          simulator.baseEnchants,
          simulator.simulatedEnchants,
          simulator.baseAura,
          simulator.simulatedAura,
          simulator.baseCreature,
          simulator.simulatedCreature,
          simulator.baseTitle,
          simulator.simulatedTitle,
          simulator.baseEquipmentUpgrades,
          simulator.simulatedEquipmentUpgrades,
          simulator.baseOathUpgrades,
          simulator.simulatedOathUpgrades,
          simulator.baseAvatar,
          referenceAvatar,
          'actual',
          simulator.baseCreatureArtifacts,
          simulator.simulatedCreatureArtifacts,
          simulator.upgradeDb,
        ),
      );
    });
    const baseCreatureArtifactByType = getCurrentCreatureArtifactBySlot({
      artifacts: simulator.baseCreatureArtifacts,
    });
    const referenceCreatureArtifactByType = new Map();
    const referenceCreatureByArtifactType = new Map();
    const creatureArtifactReferenceBaselineByType = new Map();
    candidateRows.forEach((row) => {
      const artifactType = getCreatureArtifactType(row);
      if (row.sourceType !== 'creatureArtifact' || !artifactType || referenceCreatureByArtifactType.has(artifactType)) return;
      const referenceArtifacts = cloneSimulatorValue(simulator.simulatedCreatureArtifacts || [])
        .filter((artifact) => getCreatureArtifactType(artifact) !== artifactType);
      const baseArtifact = baseCreatureArtifactByType.get(artifactType);
      if (baseArtifact) referenceArtifacts.push(cloneSimulatorValue(baseArtifact));
      const referenceCreature = {
        ...(simulator.simulatedCreature || {}),
        artifacts: referenceArtifacts,
      };
      referenceCreatureArtifactByType.set(artifactType, baseArtifact || {});
      referenceCreatureByArtifactType.set(artifactType, referenceCreature);
      creatureArtifactReferenceBaselineByType.set(
        artifactType,
        buildSimulatedDamageBaseline(
          simulator.baseDamageBaseline,
          simulator.baseEnchants,
          simulator.simulatedEnchants,
          simulator.baseAura,
          simulator.simulatedAura,
          simulator.baseCreature,
          simulator.simulatedCreature,
          simulator.baseTitle,
          simulator.simulatedTitle,
          simulator.baseEquipmentUpgrades,
          simulator.simulatedEquipmentUpgrades,
          simulator.baseOathUpgrades,
          simulator.simulatedOathUpgrades,
          simulator.baseAvatar,
          simulator.simulatedAvatar,
          'actual',
          simulator.baseCreatureArtifacts,
          referenceArtifacts,
          simulator.upgradeDb,
        ),
      );
    });
    return {
      rows: candidateRows,
      options: {
        referenceEnchantBySlot,
        referenceBaselineBySlot,
        referenceAura: simulator.baseAura,
        auraReferenceBaseline,
        referenceCreature: simulator.baseCreature,
        creatureReferenceBaseline,
        referenceCreatureArtifactByType,
        referenceCreatureByArtifactType,
        creatureArtifactReferenceBaselineByType,
        referenceTitle: simulator.baseTitle,
        titleReferenceBaseline,
        progressionReferenceBaselineBySlot,
        equipmentBodyReferenceBaselineBySlot,
        avatarReferenceBaselineBySlotId,
        preserveEligibleEnchantCandidates: eligibleSignatures.size > 0,
      },
    };
  }

  function resetDealerSimulator() {
    state.dealerSimulator = null;
    state.dealerSimulatorRecommendations = new Map();
    state.renderedOathAcquisitionCombinedRows = new Map();
    state.dealerSimulatorSuppressClickUntil = 0;
    renderDealerSimulatorActions();
  }

  function initializeDealerSimulator() {
    if (state.currentBufferBaseline?.isBuffer) {
      const baseEnchants = cloneSimulatorValue(state.currentEnchants || []);
      const bufferSkillContexts = mergeBufferSkillContexts(
        getBufferBaselineSkillContexts(state.currentBufferBaseline),
        cloneSimulatorValue(state.currentBufferSkillContexts || {}),
      );
      const baseBaseline = {
        ...cloneSimulatorValue(state.currentBufferBaseline || {}),
        bufferSkillContexts,
      };
      const baseBufferScore = calculateBufferScore(baseBaseline);
      const baseAura = getCanonicalCurrentAura();
      const baseAvatar = getCanonicalCurrentAvatar();
      const baseCreature = getCanonicalCurrentCreatureBody();
      const baseCreatureArtifacts = getCanonicalCurrentCreatureArtifacts();
      const baseTitle = cloneSimulatorValue(state.currentTitle || {});
      const baseBuffLoadout = cloneSimulatorValue(state.currentBuffLoadout || {});
      const baseEquipmentUpgrades = attachEquipmentBodyBaseData(
        state.currentEquipmentUpgrades || [],
        [
          ...(state.currentBlackFangRecommendations || []),
          ...(state.currentRelicCraftRecommendations || []),
        ],
      );
      const baseOathUpgrades = attachOathAcquisitionBaseCalculationData(
        state.currentOathUpgrades || {},
        [
          ...(state.currentOathTranscendRecommendations || []),
          ...(state.currentOathCraftRecommendations || []),
        ],
      );
      state.dealerSimulator = {
        role: 'buffer',
        baseBaseline,
        baseBufferScore,
        currentBufferScore: baseBufferScore,
        baseEnchants,
        simulatedEnchants: cloneSimulatorValue(baseEnchants),
        enchantChangesBySlot: {},
        baseAura,
        simulatedAura: cloneSimulatorValue(baseAura),
        auraChangesBySource: {},
        baseAvatar,
        simulatedAvatar: cloneSimulatorValue(baseAvatar),
        avatarEmblemChangesBySocket: {},
        avatarPlatinumChangesBySlot: {},
        baseCreature,
        simulatedCreature: cloneSimulatorValue(baseCreature),
        creatureChangesBySource: {},
        baseCreatureArtifacts,
        simulatedCreatureArtifacts: cloneSimulatorValue(baseCreatureArtifacts),
        artifactChangesByType: {},
        baseTitle,
        simulatedTitle: cloneSimulatorValue(baseTitle),
        titleChangesBySource: {},
        baseBuffLoadout,
        simulatedBuffLoadout: cloneSimulatorValue(baseBuffLoadout),
        switchingCreatureChangesBySource: {},
        switchingTitleChangesBySource: {},
        switchingAvatarChangesBySlot: {},
        switchingPlatinumChangesBySlot: {},
        switchingAvatarEmblemOverlaysBySocket: {},
        baseEquipmentUpgrades,
        simulatedEquipmentUpgrades: cloneSimulatorValue(baseEquipmentUpgrades),
        upgradeChangesBySlot: {},
        equipmentTuneChangesBySource: {},
        baseOathUpgrades,
        simulatedOathUpgrades: cloneSimulatorValue(baseOathUpgrades),
        oathTuneChangesBySource: {},
        oathAcquisitionChangesBySource: {},
        equipmentBodyChangesBySlot: {},
        oathTuneDb: cloneSimulatorValue(state.oathTuneStageDb || {}),
        upgradeDb: cloneSimulatorValue(state.upgradeExpectedDb || {}),
        bufferSkillContexts: cloneSimulatorValue(bufferSkillContexts),
        totalGold: 0,
        activeSelectionByGroup: {},
        selectedRecommendationId: '',
        applyingRecommendationId: '',
        lastChangedTarget: null,
        activeSweepSlots: new Map(),
        sweepSequence: 0,
      };
      state.dealerSimulatorRecommendations = new Map();
      state.renderedOathAcquisitionCombinedRows = new Map();
      return;
    }
    if (!state.currentDamageBaseline) {
      resetDealerSimulator();
      return;
    }
    const baseEnchants = cloneSimulatorValue(state.currentEnchants || []);
    const baseEquipmentUpgrades = attachEquipmentBodyBaseData(
      state.currentEquipmentUpgrades || [],
      [
        ...(state.currentBlackFangRecommendations || []),
        ...(state.currentRelicCraftRecommendations || []),
      ],
    );
    const baseDamageBaseline = cloneSimulatorValue(state.currentDamageBaseline || {});
    const baseAura = getCanonicalCurrentAura();
    const baseAvatar = getCanonicalCurrentAvatar();
    const baseCreature = getCanonicalCurrentCreatureBody();
    const baseCreatureArtifacts = getCanonicalCurrentCreatureArtifacts();
    const baseTitle = cloneSimulatorValue(state.currentTitle || {});
    const baseBuffLoadout = cloneSimulatorValue(state.currentBuffLoadout || {});
    const baseOathUpgrades = attachOathAcquisitionBaseCalculationData(
      state.currentOathUpgrades || {},
      [
        ...(state.currentOathTranscendRecommendations || []),
        ...(state.currentOathCraftRecommendations || []),
      ],
    );
    state.dealerSimulator = {
      role: 'dealer',
      baseEnchants,
      simulatedEnchants: cloneSimulatorValue(baseEnchants),
      baseEquipmentUpgrades,
      simulatedEquipmentUpgrades: cloneSimulatorValue(baseEquipmentUpgrades),
      baseAura,
      simulatedAura: cloneSimulatorValue(baseAura),
      baseAvatar,
      simulatedAvatar: cloneSimulatorValue(baseAvatar),
      avatarPlatinumChangesBySlot: {},
      baseCreature,
      simulatedCreature: cloneSimulatorValue(baseCreature),
      baseCreatureArtifacts,
      simulatedCreatureArtifacts: cloneSimulatorValue(baseCreatureArtifacts),
      baseTitle,
      simulatedTitle: cloneSimulatorValue(baseTitle),
      baseBuffLoadout,
      simulatedBuffLoadout: cloneSimulatorValue(baseBuffLoadout),
      baseOathUpgrades,
      simulatedOathUpgrades: cloneSimulatorValue(baseOathUpgrades),
      oathTuneDb: cloneSimulatorValue(state.oathTuneStageDb || {}),
      upgradeDb: cloneSimulatorValue(state.upgradeExpectedDb || {}),
      baseDamageBaseline,
      simulatedDamageBaseline: cloneSimulatorValue(baseDamageBaseline),
      baseEquipmentScore: Number(state.currentOfficialEquipmentScore) || null,
      totalGold: 0,
      activeSelectionByGroup: {},
      suspendedOathTune: null,
      baseEligibleEnchantCandidateSignatures: [],
      baseEligibleAuraCandidateSignatures: [],
      baseEligibleCreatureCandidateSignatures: [],
      baseEligibleTitleCandidateSignatures: [],
      selectedRecommendationId: '',
      applyingRecommendationId: '',
      lastChangedTarget: null,
      activeSweepSlots: new Map(),
      sweepSequence: 0,
    };
    state.dealerSimulatorRecommendations = new Map();
    state.renderedOathAcquisitionCombinedRows = new Map();
  }

  function syncDealerSimulatorAuraState() {
    const simulator = state.dealerSimulator;
    if (!['dealer', 'buffer'].includes(simulator?.role)) return;
    const canonicalAura = getCanonicalCurrentAura();
    simulator.baseAura = canonicalAura;
    const auraGroupKey = simulator.role === 'buffer' ? 'bufferAura' : 'aura';
    simulator.simulatedAura = simulator.activeSelectionByGroup?.[auraGroupKey]
      ? mergeAuraBodyWithEmblems(simulator.simulatedAura || {}, canonicalAura)
      : cloneSimulatorValue(canonicalAura);
    if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
    else rebuildDealerSimulatorCalculationState();
  }

  function syncDealerSimulatorAvatarState() {
    const simulator = state.dealerSimulator;
    if (simulator?.role !== 'dealer') return;
    const canonicalAvatar = getCanonicalCurrentAvatar();
    simulator.baseAvatar = canonicalAvatar;
    const hasAvatarEmblemSelection = Object.keys(simulator.activeSelectionByGroup || {})
      .some((groupKey) => groupKey.startsWith('avatarEmblem:'));
    if (!hasAvatarEmblemSelection) {
      simulator.simulatedAvatar = cloneSimulatorValue(canonicalAvatar);
    }
    rebuildDealerSimulatorCalculationState();
  }

  function syncDealerSimulatorCreatureState() {
    const simulator = state.dealerSimulator;
    if (!['dealer', 'buffer'].includes(simulator?.role)) return;
    const canonicalCreature = getCanonicalCurrentCreatureBody();
    const canonicalArtifacts = getCanonicalCurrentCreatureArtifacts();
    simulator.baseCreature = canonicalCreature;
    simulator.baseCreatureArtifacts = canonicalArtifacts;
    const creatureGroupKey = simulator.role === 'buffer' ? 'bufferCreature' : 'creature';
    if (!simulator.activeSelectionByGroup?.[creatureGroupKey]) {
      simulator.simulatedCreature = cloneSimulatorValue(canonicalCreature);
    }
    const artifactGroupPrefix = simulator.role === 'buffer'
      ? 'bufferCreatureArtifact:'
      : 'creatureArtifact:';
    const activeArtifactTypes = new Set(Object.keys(simulator.activeSelectionByGroup || {})
      .filter((groupKey) => groupKey.startsWith(artifactGroupPrefix))
      .map((groupKey) => groupKey.split(':').pop()));
    const selectedArtifacts = (simulator.simulatedCreatureArtifacts || []).filter(
      (artifact) => activeArtifactTypes.has(getCreatureArtifactType(artifact)),
    );
    simulator.simulatedCreatureArtifacts = [
      ...canonicalArtifacts.filter(
        (artifact) => !activeArtifactTypes.has(getCreatureArtifactType(artifact)),
      ),
      ...selectedArtifacts,
    ].map(cloneSimulatorValue);
    if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
    else rebuildDealerSimulatorCalculationState();
  }

  function syncDealerSimulatorTitleState() {
    const simulator = state.dealerSimulator;
    if (!['dealer', 'buffer'].includes(simulator?.role)) return;
    const canonicalTitle = cloneSimulatorValue(state.currentTitle || {});
    simulator.baseTitle = canonicalTitle;
    const titleGroupKey = simulator.role === 'buffer' ? 'bufferTitle' : 'title';
    if (!simulator.activeSelectionByGroup?.[titleGroupKey]) {
      simulator.simulatedTitle = cloneSimulatorValue(canonicalTitle);
    }
    if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
    else rebuildDealerSimulatorCalculationState();
  }

  function rebuildDealerSimulatorCalculationState() {
    const simulator = state.dealerSimulator;
    if (simulator?.role !== 'dealer') return;
    const simulatedDamageBaseline = buildSimulatedDamageBaseline(
      simulator.baseDamageBaseline,
      simulator.baseEnchants,
      simulator.simulatedEnchants,
      simulator.baseAura,
      simulator.simulatedAura,
      simulator.baseCreature,
      simulator.simulatedCreature,
      simulator.baseTitle,
      simulator.simulatedTitle,
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
      simulator.baseOathUpgrades,
      simulator.simulatedOathUpgrades,
      simulator.baseAvatar,
      simulator.simulatedAvatar,
      'actual',
      simulator.baseCreatureArtifacts,
      simulator.simulatedCreatureArtifacts,
      simulator.upgradeDb,
    );
    const equipmentTuneSetPoint = getEquipmentTuneSetPoint(simulator.simulatedEquipmentUpgrades);
    simulator.simulatedDamageBaseline = {
      ...simulatedDamageBaseline,
      equipmentTuneSetPoint,
      equipmentTuneFinalDamage: getEquipmentTuneStage(equipmentTuneSetPoint) * EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE,
    };
  }

  function getDealerSimulatorRecommendationId(row = {}) {
    return [
      row.sourceType || '',
      row.slot || '',
      row.tier || '',
      row.itemId || row.itemName || '',
      getEffectSignature(row.effects || {}),
      row.purchaseRoute || '',
    ].join('|');
  }

  function resolveDealerSimulatorTarget(row = {}) {
    if (
      state.currentBufferBaseline?.isBuffer
      && !OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
    ) return null;
    if (OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)) {
      const descriptors = getOathAcquisitionSelectionDescriptors(row);
      if (!descriptors.length) return null;
      return {
        targetTab: 'oath',
        targetSlot: `oath:${descriptors[0].entry.slotIndex}`,
        targetSlots: descriptors.map((descriptor) => `oath:${descriptor.entry.slotIndex}`),
        applyType: 'acquireOathDecision',
        selectionDescriptors: descriptors,
      };
    }
    if (row.sourceType === 'upgrade') {
      const targetSlot = String(row.slot || '').trim();
      const progressionType = getEquipmentProgressionType(row);
      const currentLevel = Number(row.currentLevel);
      const targetLevel = Number(row.targetLevel);
      if (
        !targetSlot
        || !UPGRADE_SLOT_LABELS[targetSlot]
        || !progressionType
        || !Number.isFinite(currentLevel)
        || !Number.isFinite(targetLevel)
        || (row.upgradeMode !== 'amplificationConversion' && targetLevel <= currentLevel)
      ) return null;
      return {
        targetTab: 'equipment',
        targetSlot,
        progressionType,
        applyType: 'replaceEquipmentProgression',
      };
    }
    if (isEquipmentBodyReplacementSource(row)) {
      const targetEquipmentBody = row.targetEquipmentBody || {};
      const targetSlotId = resolveCanonicalEquipmentSlotId(targetEquipmentBody || row);
      const targetSlot = resolveCanonicalEquipmentSlotName(targetEquipmentBody || row);
      const isSupportedSlot = row.sourceType === 'blackFang'
        ? BLACK_FANG_SIMULATOR_SLOTS.has(targetSlot)
        : targetSlotId === 'MAGIC_STON';
      if (
        !isSupportedSlot
        || !targetEquipmentBody.itemId
        || !Object.keys(targetEquipmentBody.effects || {}).length
      ) return null;
      return {
        targetTab: 'equipment',
        targetSlot,
        targetSlotId,
        applyType: 'replaceEquipmentBody',
      };
    }
    if (row.sourceType === 'equipmentTune') {
      if (!Array.isArray(row.tunePlan?.slotChanges) || !row.tunePlan.slotChanges.length) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '장비 조율',
        applyType: 'applyEquipmentTunePlan',
      };
    }
    if (row.sourceType === 'oathTune') {
      if (!Array.isArray(row.tunePlan?.slotChanges) || !row.tunePlan.slotChanges.length) return null;
      return {
        targetTab: 'oath',
        targetSlot: '서약 조율',
        applyType: 'applyOathTunePlan',
      };
    }
    if (row.sourceType === 'aura') {
      const hasDamageEffect = Boolean(row.effects && Object.keys(row.effects).length);
      const hasSkillDamageEffect = Math.abs(getSkillDamageMultiplier(row) - 1) > 0.000001;
      if (!row.itemId || (!hasDamageEffect && !hasSkillDamageEffect)) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '오라',
        applyType: 'replaceAura',
      };
    }
    if (row.sourceType === 'creature') {
      const hasDamageEffect = Boolean(row.effects && Object.keys(row.effects).length);
      const hasSkillDamageEffect = Math.abs(getSkillDamageMultiplier(row) - 1) > 0.000001;
      if (!row.itemId || (!hasDamageEffect && !hasSkillDamageEffect)) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '크리쳐',
        applyType: 'replaceCreature',
      };
    }
    if (row.sourceType === 'creatureArtifact') {
      const artifactType = getCreatureArtifactType(row);
      if (!artifactType || !row.itemId || !Object.keys(row.effects || {}).length) return null;
      return {
        targetTab: 'equipment',
        targetSlot: `creatureArtifact:${artifactType}`,
        changedSlots: [`creatureArtifact:${artifactType}`, '크리쳐'],
        artifactType,
        applyType: 'replaceCreatureArtifact',
      };
    }
    if (row.sourceType === 'title') {
      if (!row.itemId || !Object.keys(row.titlePackageEffects || row.effects || {}).length) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '칭호',
        applyType: 'replaceTitle',
      };
    }
    if (row.sourceType === 'avatar' && row.kind === 'brilliantEmblem') {
      const targetSlotId = String(row.targetSlotId || '').trim();
      const socketChanges = Array.isArray(row.socketChanges) ? row.socketChanges : [];
      const socketIndexes = socketChanges.map((change) => Number(change?.socketIndex));
      const validSocketChanges = socketChanges.every((change) => (
        Number.isInteger(Number(change?.socketIndex))
        && Number(change.socketIndex) >= 0
        && Number(change.socketIndex) < 2
        && change?.targetEmblem
      ));
      if (
        !targetSlotId
        || !socketChanges.length
        || !validSocketChanges
        || new Set(socketIndexes).size !== socketIndexes.length
      ) return null;
      return {
        targetTab: 'avatar',
        targetSlot: `avatar:${targetSlotId}`,
        targetSlotId,
        applyType: 'replaceAvatarEmblems',
      };
    }
    if (row.sourceType === 'avatar' && row.kind === 'platinumEmblem') {
      const targetSlotId = String(row.targetSlotId || '').trim();
      const baseSlot = (state.dealerSimulator?.baseAvatar?.slots || [])
        .find((slot) => slot?.slotId === targetSlotId);
      if (
        !targetSlotId
        || !baseSlot
        || !String(baseSlot.itemRarity || '').includes('레어')
        || !row.targetPlatinumEmblem?.itemId
      ) return null;
      const dealerMultiplier = getAvatarPlatinumRecommendationMultiplier(row);
      if (!(dealerMultiplier > 1)) return null;
      return {
        targetTab: 'avatar',
        targetSlot: `avatar:${targetSlotId}`,
        targetSlotId,
        applyType: 'replaceAvatarPlatinumEmblem',
        dealerMultiplier,
      };
    }
    if (row.sourceType === 'switchingFragment') {
      const targetSlot = getBuffSimulatorTargetSlotId(row);
      const targetEquipment = row.targetBuffChanges?.equipment;
      if (!targetSlot || !targetEquipment?.itemId) return null;
      return {
        targetTab: 'buff',
        targetSlot: `buffEquipment:${targetSlot}`,
        buffSlotId: targetSlot,
        applyType: 'replaceBuffEquipment',
      };
    }
    if (row.sourceType === 'switchingTitle' && row.itemId) {
      return {
        targetTab: 'buff',
        targetSlot: 'buffTitle',
        buffSlotId: 'TITLE',
        applyType: 'replaceBuffTitle',
      };
    }
    if (row.sourceType === 'switchingCreature' && row.itemId) {
      return {
        targetTab: 'buff',
        targetSlot: 'buffCreature',
        buffSlotId: 'CREATURE',
        applyType: 'replaceBuffCreature',
      };
    }
    if (
      row.sourceType === 'avatar'
      && ['switchingAvatar', 'switchingPlatinumEmblem'].includes(row.kind)
    ) {
      const targetSlotId = getBuffSimulatorTargetSlotId(row);
      if (!targetSlotId || !row.itemId) return null;
      return {
        targetTab: 'buff',
        targetSlot: `buffAvatar:${targetSlotId}`,
        buffSlotId: targetSlotId,
        applyType: row.kind === 'switchingAvatar'
          ? 'replaceBuffAvatarPackage'
          : 'replaceBuffAvatarPlatinum',
      };
    }
    if (row.sourceType !== 'enchant') return null;
    const targetSlot = String(row.slot || '').trim();
    if (!targetSlot || !SLOT_ORDER.includes(targetSlot)) return null;
    if (!row.effects || !Object.keys(row.effects).length) return null;
    return {
      targetTab: 'equipment',
      targetSlot,
      applyType: 'replaceEnchant',
    };
  }

  function resolveBufferSimulatorTarget(row = {}) {
    if (!isBufferSimulatorActive() || !row?.bufferSimulatorSupported) return null;
    const simulator = state.dealerSimulator;
    if (row.sourceType === 'equipmentTune') {
      if (
        !Array.isArray(row.tunePlan?.slotChanges)
        || !row.tunePlan.slotChanges.length
        || !row.bufferBaseRelativeChanges
      ) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '장비 조율',
        applyType: 'applyEquipmentTunePlan',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'creature') {
      if (!row.itemId || !row.bufferBaseRelativeChanges) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '크리쳐',
        applyType: 'replaceCreature',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'aura') {
      if (!row.itemId || !row.bufferBaseRelativeChanges) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '오라',
        applyType: 'replaceAura',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'title') {
      if (!row.itemId || !row.bufferBaseRelativeChanges) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '칭호',
        applyType: 'replaceTitle',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'avatar' && row.kind === 'brilliantEmblem') {
      const targetSlotId = String(row.targetSlotId || '').trim();
      if (row.bufferStatScope === 'switching') {
        const hasBaseHost = getBuffLoadoutRowsForMetric(simulator.baseBuffLoadout?.avatar)
          .some((item) => (
            String(item?.slotId || '').trim() === targetSlotId
            && item?.buffAvatarSource === 'actual'
          ));
        const hasPackageHost = Boolean(
          simulator.activeSelectionByGroup?.[`buffAvatarPackage:${targetSlotId}`],
        );
        if (
          !targetSlotId
          || (!hasBaseHost && !hasPackageHost)
          || !row.bufferBaseRelativeChanges
          || !row.bufferSwitchingAvatarEmblemOverlaysBySocket
        ) return null;
        return {
          targetTab: 'buff',
          targetSlot: `buffAvatar:${targetSlotId}`,
          buffSlotId: targetSlotId,
          applyType: 'replaceBuffAvatarEmblems',
          overlaysBySocket: cloneSimulatorValue(
            row.bufferSwitchingAvatarEmblemOverlaysBySocket,
          ),
        };
      }
      if (
        !targetSlotId
        || !['common', 'current'].includes(row.bufferStatScope)
        || !row.bufferBaseRelativeChanges
        || !row.bufferAvatarEmblemChangesBySocket
      ) return null;
      return {
        targetTab: 'avatar',
        targetSlot: `avatar:${targetSlotId}`,
        targetSlotId,
        applyType: 'replaceAvatarEmblems',
        baseRelativeChangesBySocket: cloneSimulatorValue(
          row.bufferAvatarEmblemChangesBySocket,
        ),
      };
    }
    if (row.sourceType === 'avatar' && row.kind === 'platinumEmblem') {
      const targetSlotId = String(row.targetSlotId || '').trim();
      const baseSlot = (simulator.baseAvatar?.slots || [])
        .find((slot) => slot?.slotId === targetSlotId);
      if (
        !targetSlotId
        || !baseSlot
        || !String(baseSlot.itemRarity || '').includes('레어')
        || !row.targetPlatinumEmblem?.itemId
        || !row.bufferBaseRelativeChanges
      ) return null;
      return {
        targetTab: 'avatar',
        targetSlot: `avatar:${targetSlotId}`,
        targetSlotId,
        applyType: 'replaceAvatarPlatinumEmblem',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'switchingCreature') {
      if (!row.itemId || !row.bufferBaseRelativeChanges) return null;
      return {
        targetTab: 'buff',
        targetSlot: 'buffCreature',
        buffSlotId: 'CREATURE',
        applyType: 'replaceBuffCreature',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'switchingTitle') {
      if (!row.itemId || !row.bufferBaseRelativeChanges) return null;
      return {
        targetTab: 'buff',
        targetSlot: 'buffTitle',
        buffSlotId: 'TITLE',
        applyType: 'replaceBuffTitle',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'avatar' && row.kind === 'switchingAvatar') {
      const targetSlotId = getBuffSimulatorTargetSlotId(row);
      if (
        !targetSlotId
        || !row.itemId
        || !row.targetBuffChanges?.avatar
        || !row.bufferBaseRelativeChanges
      ) return null;
      return {
        targetTab: 'buff',
        targetSlot: `buffAvatar:${targetSlotId}`,
        buffSlotId: targetSlotId,
        applyType: 'replaceBuffAvatarPackage',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem') {
      const targetSlotId = getBuffSimulatorTargetSlotId(row);
      const hasBaseHost = getBuffLoadoutRowsForMetric(simulator.baseBuffLoadout?.avatar)
        .some((item) => (
          String(item?.slotId || '').trim() === targetSlotId
          && item?.buffAvatarSource === 'actual'
        ));
      const hasPackageHost = Boolean(
        simulator.activeSelectionByGroup?.[`buffAvatarPackage:${targetSlotId}`],
      );
      if (
        !targetSlotId
        || (!hasBaseHost && !hasPackageHost)
        || !row.itemId
        || !row.targetBuffChanges?.platinumEmblem
        || !row.bufferBaseRelativeChanges
      ) return null;
      return {
        targetTab: 'buff',
        targetSlot: `buffAvatar:${targetSlotId}`,
        buffSlotId: targetSlotId,
        applyType: 'replaceBuffAvatarPlatinum',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'oathTune') {
      if (
        !Array.isArray(row.tunePlan?.slotChanges)
        || !row.tunePlan.slotChanges.length
        || !row.bufferBaseRelativeChanges
      ) return null;
      return {
        targetTab: 'oath',
        targetSlot: '서약 조율',
        applyType: 'applyOathTunePlan',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'upgrade') {
      const targetSlot = String(row.slot || '').trim();
      const progressionType = getEquipmentProgressionType(row);
      const targetLevel = Number(row.targetLevel);
      if (
        !targetSlot
        || !UPGRADE_SLOT_LABELS[targetSlot]
        || !progressionType
        || !Number.isFinite(targetLevel)
        || !row.bufferBaseRelativeChanges
      ) return null;
      return {
        targetTab: 'equipment',
        targetSlot,
        progressionType,
        targetLevel,
        applyType: 'replaceBufferEquipmentProgression',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (row.sourceType === 'creatureArtifact') {
      const artifactType = getCreatureArtifactType(row);
      if (!artifactType || !row.itemId || !row.bufferBaseRelativeChanges) return null;
      return {
        targetTab: 'equipment',
        targetSlot: `creatureArtifact:${artifactType}`,
        changedSlots: [`creatureArtifact:${artifactType}`, '크리쳐'],
        artifactType,
        applyType: 'replaceBufferCreatureArtifact',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    if (isEquipmentBodyReplacementSource(row)) {
      const targetEquipmentBody = row.targetEquipmentBody || {};
      const targetSlotId = resolveCanonicalEquipmentSlotId(targetEquipmentBody || row);
      const targetSlot = resolveCanonicalEquipmentSlotName(targetEquipmentBody || row);
      const isSupportedSlot = row.sourceType === 'blackFang'
        ? BLACK_FANG_SIMULATOR_SLOTS.has(targetSlot)
        : targetSlotId === 'MAGIC_STON';
      if (
        !isSupportedSlot
        || !targetEquipmentBody.itemId
        || !Object.keys(targetEquipmentBody.effects || {}).length
        || !row.bufferBaseRelativeChanges
      ) return null;
      return {
        targetTab: 'equipment',
        targetSlot,
        targetSlotId,
        applyType: 'replaceEquipmentBody',
        baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
      };
    }
    const targetSlot = String(row.slot || '').trim();
    if (!targetSlot || !SLOT_ORDER.includes(targetSlot) || !row.bufferBaseRelativeChanges) return null;
    return {
      targetTab: 'equipment',
      targetSlot,
      applyType: 'replaceBufferEnchant',
      baseRelativeChanges: cloneSimulatorValue(row.bufferBaseRelativeChanges),
    };
  }

  function resolveActiveSimulatorTarget(row = {}) {
    return isBufferSimulatorActive()
      ? resolveBufferSimulatorTarget(row)
      : resolveDealerSimulatorTarget(row);
  }

  function rebuildBufferSimulatorCalculationState() {
    const simulator = state.dealerSimulator;
    if (simulator?.role !== 'buffer') return;
    simulator.currentBufferScore = calculateBufferScore(
      simulator.baseBaseline,
      resolveBufferNetChanges(
        simulator.enchantChangesBySlot,
        simulator.bufferSkillContexts,
        simulator.artifactChangesByType,
        simulator.upgradeChangesBySlot,
        simulator.equipmentTuneChangesBySource,
        simulator.oathTuneChangesBySource,
        simulator.oathAcquisitionChangesBySource,
        simulator.equipmentBodyChangesBySlot,
        simulator.creatureChangesBySource,
        simulator.auraChangesBySource,
        simulator.titleChangesBySource,
        simulator.switchingCreatureChangesBySource,
        simulator.switchingTitleChangesBySource,
        simulator.switchingAvatarChangesBySlot,
        simulator.switchingPlatinumChangesBySlot,
        getBufferAvatarNetChanges(simulator),
        simulator,
      ),
    );
  }

  function replaceSimulatedBufferEnchant(row, target) {
    const simulator = state.dealerSimulator;
    if (simulator?.role !== 'buffer' || target?.applyType !== 'replaceBufferEnchant') return false;
    const targetSlot = target.targetSlot;
    const currentIndex = simulator.simulatedEnchants.findIndex((enchant) => enchant?.slot === targetSlot);
    const baseEnchant = simulator.baseEnchants.find((enchant) => enchant?.slot === targetSlot) || {};
    const current = currentIndex >= 0 ? simulator.simulatedEnchants[currentIndex] : baseEnchant;
    const nextEnchant = {
      ...cloneSimulatorValue(current),
      slot: targetSlot,
      effects: cloneSimulatorValue(row.effects || {}),
      reinforceSkill: cloneSimulatorValue(row.reinforceSkill || []),
      bufferSkillContributions: cloneSimulatorValue(row.bufferSkillContributions || []),
      simulatedEnchantItemName: row.itemName || '',
    };
    if (currentIndex >= 0) simulator.simulatedEnchants.splice(currentIndex, 1, nextEnchant);
    else simulator.simulatedEnchants.push(nextEnchant);
    simulator.enchantChangesBySlot[targetSlot] = cloneSimulatorValue(target.baseRelativeChanges);
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedBufferCreatureArtifact(row, target) {
    const simulator = state.dealerSimulator;
    const artifactType = getCreatureArtifactType(target || row);
    if (
      simulator?.role !== 'buffer'
      || target?.applyType !== 'replaceBufferCreatureArtifact'
      || !artifactType
      || !row.itemId
    ) return false;
    const artifacts = simulator.simulatedCreatureArtifacts || [];
    const currentIndex = artifacts.findIndex(
      (artifact) => getCreatureArtifactType(artifact) === artifactType,
    );
    const nextArtifact = {
      ...cloneSimulatorValue(row),
      slotColor: artifactType,
      itemName: row.candidateName || row.itemName || '',
      iconUrl: row.iconUrl || '',
      effects: cloneSimulatorValue(row.effects || {}),
    };
    if (currentIndex >= 0) artifacts.splice(currentIndex, 1, nextArtifact);
    else artifacts.push(nextArtifact);
    simulator.simulatedCreatureArtifacts = artifacts;
    simulator.artifactChangesByType[artifactType] = cloneSimulatorValue(target.baseRelativeChanges);
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedBufferEquipmentProgression(row, target) {
    const simulator = state.dealerSimulator;
    if (simulator?.role !== 'buffer' || target?.applyType !== 'replaceBufferEquipmentProgression') return false;
    const equipmentIndex = simulator.simulatedEquipmentUpgrades.findIndex((equipment) => (
      resolveCanonicalEquipmentSlotId(equipment) === target.targetSlotId
    ));
    if (equipmentIndex < 0) return false;
    const targetLevel = Number(target.targetLevel);
    if (!Number.isFinite(targetLevel) || targetLevel < 0) return false;
    const current = simulator.simulatedEquipmentUpgrades[equipmentIndex];
    const next = cloneSimulatorValue(current);
    next.reinforce = targetLevel;
    next.isAmplified = target.progressionType === 'amplify';
    next.amplificationName = next.isAmplified
      ? String(current.amplificationName || '').trim()
        || `차원의 ${String(simulator.baseBaseline?.statName || '지능').trim() || '지능'}`
      : '';
    simulator.simulatedEquipmentUpgrades.splice(equipmentIndex, 1, next);
    simulator.upgradeChangesBySlot[target.targetSlot] = cloneSimulatorValue(target.baseRelativeChanges);
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  const SIMULATOR_LOADOUT_BASE_KEY_BY_STATE = {
    simulatedEnchants: 'baseEnchants',
    simulatedEquipmentUpgrades: 'baseEquipmentUpgrades',
    simulatedAura: 'baseAura',
    simulatedAvatar: 'baseAvatar',
    simulatedCreature: 'baseCreature',
    simulatedCreatureArtifacts: 'baseCreatureArtifacts',
    simulatedTitle: 'baseTitle',
    simulatedBuffLoadout: 'baseBuffLoadout',
    simulatedOathUpgrades: 'baseOathUpgrades',
  };
  const SIMULATOR_CHANGE_STATE_KEYS = [
    'enchantChangesBySlot',
    'artifactChangesByType',
    'upgradeChangesBySlot',
    'equipmentTuneChangesBySource',
    'oathTuneChangesBySource',
    'oathAcquisitionChangesBySource',
    'equipmentBodyChangesBySlot',
    'creatureChangesBySource',
    'auraChangesBySource',
    'titleChangesBySource',
    'switchingCreatureChangesBySource',
    'switchingTitleChangesBySource',
    'switchingAvatarChangesBySlot',
    'switchingPlatinumChangesBySlot',
    'avatarEmblemChangesBySocket',
    'avatarPlatinumChangesBySlot',
    'switchingAvatarEmblemOverlaysBySocket',
  ];
  const SIMULATOR_SNAPSHOT_STATE_KEYS = [
    ...Object.keys(SIMULATOR_LOADOUT_BASE_KEY_BY_STATE),
    ...SIMULATOR_CHANGE_STATE_KEYS,
    'activeSelectionByGroup',
    'suspendedOathTune',
    'totalGold',
    'currentBufferScore',
    'lastChangedTarget',
  ];

  function createSimulatorSnapshot() {
    const simulator = state.dealerSimulator;
    if (!simulator) return null;
    return SIMULATOR_SNAPSHOT_STATE_KEYS.reduce((snapshot, key) => {
      if (key in simulator) snapshot[key] = cloneSimulatorValue(simulator[key]);
      return snapshot;
    }, {});
  }

  function restoreSimulatorSnapshot(snapshot) {
    const simulator = state.dealerSimulator;
    if (!simulator || !snapshot) return;
    SIMULATOR_SNAPSHOT_STATE_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
        simulator[key] = cloneSimulatorValue(snapshot[key]);
      }
    });
    simulator.totalGold = getDealerSimulatorTotalGold(simulator);
    syncOathAcquisitionVariantIndexes(true);
    const equipmentTuneStepIndex = Number(
      simulator.activeSelectionByGroup.equipmentTune?.selectedVariantIndex || 0,
    );
    const oathTuneStepIndex = Number(
      simulator.activeSelectionByGroup.oathTune?.selectedVariantIndex || 0,
    );
    state.tuneStepIndexBySource = {
      ...(state.tuneStepIndexBySource || {}),
      equipmentTune: equipmentTuneStepIndex,
      oathTune: oathTuneStepIndex,
    };
    state.equipmentTuneStepIndex = equipmentTuneStepIndex;
    simulator.lastChangedTarget = snapshot.lastChangedTarget ? { ...snapshot.lastChangedTarget } : null;
    simulator.selectedRecommendationId = '';
    if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
    else rebuildDealerSimulatorCalculationState();
  }

  function replaceSimulatedEnchant(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceEnchant') return false;
    const targetSlot = target.targetSlot;
    const currentIndex = simulator.simulatedEnchants.findIndex((enchant) => enchant?.slot === targetSlot);
    const equipment = (state.currentEquipmentUpgrades || []).find((item) => item?.slot === targetSlot) || {};
    const current = currentIndex >= 0 ? simulator.simulatedEnchants[currentIndex] : {};
    const nextEnchant = {
      ...current,
      slot: targetSlot,
      itemName: current.itemName || equipment.itemName || targetSlot,
      effects: cloneSimulatorValue(row.effects || {}),
      reinforceSkill: cloneSimulatorValue(row.reinforceSkill || []),
      simulatedEnchantItemName: row.itemName || '',
    };
    if (currentIndex >= 0) {
      simulator.simulatedEnchants.splice(currentIndex, 1, nextEnchant);
    } else {
      simulator.simulatedEnchants.push(nextEnchant);
    }
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedAura(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceAura') return false;
    const currentAura = simulator.simulatedAura || simulator.baseAura || {};
    simulator.simulatedAura = mergeAuraBodyWithEmblems({
      ...cloneSimulatorValue(row),
      itemName: row.auraItemName || row.candidateName || row.itemName || '',
      iconUrl: row.auraIconUrl || row.iconUrl || '',
      reinforceSkills: row.reinforceSkillName && Number(row.reinforceSkillLevel || 0) > 0
        ? [{ name: row.reinforceSkillName, value: Number(row.reinforceSkillLevel) }]
        : [],
    }, currentAura);
    if (simulator.role === 'buffer') {
      simulator.auraChangesBySource.aura = cloneSimulatorValue(target.baseRelativeChanges);
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function replaceSimulatedCreature(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceCreature') return false;
    simulator.simulatedCreature = {
      ...cloneSimulatorValue(row),
      itemName: row.creatureItemName || row.candidateName || row.itemName || '',
      iconUrl: row.creatureIconUrl || row.iconUrl || '',
      reinforceSkills: row.reinforceSkillName && Number(row.reinforceSkillLevel || 0) > 0
        ? [{ name: row.reinforceSkillName, value: Number(row.reinforceSkillLevel) }]
        : [],
    };
    if (simulator.role === 'buffer') {
      simulator.creatureChangesBySource.creature = cloneSimulatorValue(
        target.baseRelativeChanges,
      );
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function replaceSimulatedCreatureArtifact(row, target) {
    const simulator = state.dealerSimulator;
    const artifactType = getCreatureArtifactType(target || row);
    if (
      !simulator
      || target?.applyType !== 'replaceCreatureArtifact'
      || !artifactType
      || !row.itemId
    ) return false;
    const artifacts = simulator.simulatedCreatureArtifacts || [];
    const currentIndex = artifacts.findIndex(
      (artifact) => getCreatureArtifactType(artifact) === artifactType,
    );
    const nextArtifact = {
      ...cloneSimulatorValue(row),
      slotColor: artifactType,
      itemName: row.candidateName || row.itemName || '',
      iconUrl: row.iconUrl || '',
      effects: cloneSimulatorValue(row.effects || {}),
    };
    if (currentIndex >= 0) artifacts.splice(currentIndex, 1, nextArtifact);
    else artifacts.push(nextArtifact);
    simulator.simulatedCreatureArtifacts = artifacts;
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedTitle(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceTitle') return false;
    simulator.simulatedTitle = buildSimulatedTitleTarget(row);
    if (simulator.role === 'buffer') {
      simulator.titleChangesBySource.title = cloneSimulatorValue(target.baseRelativeChanges);
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function replaceSimulatedAvatarEmblems(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceAvatarEmblems') return false;
    const slot = (simulator.simulatedAvatar?.slots || [])
      .find((avatarSlot) => avatarSlot?.slotId === target.targetSlotId);
    const baseSlot = (simulator.baseAvatar?.slots || [])
      .find((avatarSlot) => avatarSlot?.slotId === target.targetSlotId);
    if (!slot || !baseSlot) return false;
    const regularSockets = cloneSimulatorValue(baseSlot.emblems || []).slice(0, 2);
    while (regularSockets.length < 2) regularSockets.push(null);
    for (const change of row.socketChanges || []) {
      const socketIndex = Number(change?.socketIndex);
      if (!Number.isInteger(socketIndex) || socketIndex < 0 || socketIndex >= 2 || !change?.targetEmblem) {
        return false;
      }
      regularSockets[socketIndex] = {
        ...cloneSimulatorValue(change.targetEmblem),
        socketKey: `regular:${socketIndex}`,
        socketIndex,
      };
    }
    slot.emblems = regularSockets;
    if (simulator.role === 'buffer') {
      const socketPrefix = `${target.targetSlotId}:`;
      Object.keys(simulator.avatarEmblemChangesBySocket || {}).forEach((socketKey) => {
        if (socketKey.startsWith(socketPrefix)) {
          delete simulator.avatarEmblemChangesBySocket[socketKey];
        }
      });
      Object.assign(
        simulator.avatarEmblemChangesBySocket,
        cloneSimulatorValue(target.baseRelativeChangesBySocket || {}),
      );
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function replaceSimulatedAvatarPlatinumEmblem(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceAvatarPlatinumEmblem') return false;
    const slot = (simulator.simulatedAvatar?.slots || [])
      .find((avatarSlot) => avatarSlot?.slotId === target.targetSlotId);
    if (!slot || !String(slot.itemRarity || '').includes('레어') || !row.targetPlatinumEmblem) {
      return false;
    }
    slot.platinumEmblems = [{
      ...cloneSimulatorValue(row.targetPlatinumEmblem),
      slotColor: '플래티넘',
    }];
    slot.recognizedPlatinumLevelContribution = Number(
      row.targetPlatinumEmblem.recognizedLevelContribution || 0,
    );
    if (simulator.role === 'buffer') {
      simulator.avatarPlatinumChangesBySlot[target.targetSlotId] = cloneSimulatorValue(
        target.baseRelativeChanges,
      );
      rebuildBufferSimulatorCalculationState();
    } else {
      simulator.avatarPlatinumChangesBySlot[target.targetSlotId] = {
        skillDamageMultiplier: Number(target.dealerMultiplier || 1),
      };
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function replaceBuffLoadoutRow(collectionName, predicate, nextRow) {
    const simulator = state.dealerSimulator;
    if (!simulator) return false;
    const rows = getBuffLoadoutRowsForMetric(simulator.simulatedBuffLoadout?.[collectionName]);
    const index = rows.findIndex(predicate);
    if (index >= 0) rows.splice(index, 1, nextRow);
    else rows.push(nextRow);
    simulator.simulatedBuffLoadout[collectionName] = rows;
    if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
    else rebuildDealerSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedBuffEquipment(row, target) {
    const targetBody = row.targetBuffChanges?.equipment;
    if (!targetBody?.itemId || !target?.buffSlotId) return false;
    const current = getBuffLoadoutRowsForMetric(state.dealerSimulator?.simulatedBuffLoadout?.equipment)
      .find((item) => String(item?.slotName || '').trim() === target.buffSlotId) || {};
    return replaceBuffLoadoutRow(
      'equipment',
      (item) => String(item?.slotName || '').trim() === target.buffSlotId,
      {
        ...cloneSimulatorValue(current),
        ...cloneSimulatorValue(targetBody),
        slotId: current.slotId || targetBody.slotId || '',
        slotName: target.buffSlotId,
      },
    );
  }

  function replaceSimulatedBuffTitle(row) {
    const current = getBuffLoadoutRowsForMetric(state.dealerSimulator?.simulatedBuffLoadout?.equipment)
      .find((item) => String(item?.slotId || '').trim() === 'TITLE') || {};
    return replaceBuffLoadoutRow(
      'equipment',
      (item) => String(item?.slotId || '').trim() === 'TITLE',
      {
        ...cloneSimulatorValue(current),
        slotId: 'TITLE',
        slotName: current.slotName || '칭호',
        itemId: row.itemId,
        itemName: row.itemName,
        itemRarity: row.itemRarity,
        iconUrl: row.iconUrl,
        optionAbility: row.itemExplain || '',
        buffContribution: {
          skillLevel: Number(row.candidateTitleContribution || 0),
        },
      },
    );
  }

  function replaceSimulatedBuffCreature(row) {
    const current = getBuffLoadoutRowsForMetric(state.dealerSimulator?.simulatedBuffLoadout?.creature)[0] || {};
    return replaceBuffLoadoutRow(
      'creature',
      () => true,
      {
        ...cloneSimulatorValue(current),
        itemId: row.itemId,
        itemName: row.targetCreatureName || row.itemName,
        itemRarity: row.itemRarity,
        iconUrl: row.iconUrl,
        optionAbility: row.itemExplain || '',
        buffContribution: {
          skillLevel: Number(row.candidateCreatureContribution || 0),
        },
      },
    );
  }

  function replaceSimulatedBufferSwitchingCreature(row, target) {
    const simulator = state.dealerSimulator;
    if (
      simulator?.role !== 'buffer'
      || target?.applyType !== 'replaceBuffCreature'
      || !target.baseRelativeChanges
    ) return false;
    if (!replaceSimulatedBuffCreature(row, target)) return false;
    simulator.switchingCreatureChangesBySource.switchingCreature = cloneSimulatorValue(
      target.baseRelativeChanges,
    );
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedBufferSwitchingTitle(row, target) {
    const simulator = state.dealerSimulator;
    if (
      simulator?.role !== 'buffer'
      || target?.applyType !== 'replaceBuffTitle'
      || !target.baseRelativeChanges
    ) return false;
    if (!replaceSimulatedBuffTitle(row, target)) return false;
    simulator.switchingTitleChangesBySource.switchingTitle = cloneSimulatorValue(
      target.baseRelativeChanges,
    );
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedBufferSwitchingAvatar(row, target) {
    const simulator = state.dealerSimulator;
    const targetSlotId = target?.buffSlotId;
    if (
      simulator?.role !== 'buffer'
      || target?.applyType !== 'replaceBuffAvatarPackage'
      || !targetSlotId
      || !target.baseRelativeChanges
    ) return false;
    if (!replaceSimulatedBuffAvatar(row, target, false)) return false;
    simulator.switchingAvatarChangesBySlot[targetSlotId] = {
      ...cloneSimulatorValue(target.baseRelativeChanges),
      regularEmblems: cloneSimulatorValue(row.targetBuffChanges?.avatar?.emblems || []),
    };
    applySwitchingAvatarEmblemOverlaysToLoadout(
      targetSlotId,
      {},
      row.targetBuffChanges?.avatar?.emblems,
    );
    applyActiveSwitchingPlatinumToLoadout(targetSlotId);
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  function applyActiveSwitchingPlatinumToLoadout(targetSlotId) {
    const simulator = state.dealerSimulator;
    const target = simulator?.activeSelectionByGroup
      ?.[`buffAvatarPlatinum:${targetSlotId}`]
      ?.appliedRecommendationSnapshot
      ?.targetBuffChanges
      ?.platinumEmblem;
    if (!target) return true;
    const rows = getBuffLoadoutRowsForMetric(simulator.simulatedBuffLoadout?.avatar);
    const index = rows.findIndex((item) => String(item?.slotId || '').trim() === targetSlotId);
    if (index < 0) return false;
    rows[index] = {
      ...rows[index],
      buffContribution: {
        ...(rows[index].buffContribution || {}),
        platinumSkillLevel: Number(target.skillLevel || 0),
      },
      platinumEmblems: [{
        itemId: target.itemId || '',
        itemName: target.itemName || '',
        slotColor: '플래티넘',
      }],
      simulatedPlatinumEmblem: cloneSimulatorValue(target),
    };
    simulator.simulatedBuffLoadout.avatar = rows;
    return true;
  }

  function applySwitchingAvatarEmblemOverlaysToLoadout(
    targetSlotId,
    baseOverlays = {},
    underlayEmblems = null,
  ) {
    const simulator = state.dealerSimulator;
    const avatarRows = getBuffLoadoutRowsForMetric(simulator?.simulatedBuffLoadout?.avatar);
    const rowIndex = avatarRows.findIndex(
      (item) => String(item?.slotId || '').trim() === targetSlotId,
    );
    if (rowIndex < 0) return false;
    const activeOverlays = Object.fromEntries(Object.entries(
      simulator.switchingAvatarEmblemOverlaysBySocket || {},
    ).filter(([, overlay]) => overlay?.slotId === targetSlotId));
    const overlays = { ...baseOverlays, ...activeOverlays };
    const nextRow = cloneSimulatorValue(avatarRows[rowIndex]);
    const packageEmblems = simulator.activeSelectionByGroup
      ?.[`buffAvatarPackage:${targetSlotId}`]
      ?.appliedRecommendationSnapshot
      ?.targetBuffChanges
      ?.avatar
      ?.emblems;
    const baseRow = getBuffLoadoutRowsForMetric(simulator.baseBuffLoadout?.avatar)
      .find((item) => String(item?.slotId || '').trim() === targetSlotId);
    const regularSockets = cloneSimulatorValue(
      Array.isArray(underlayEmblems)
        ? underlayEmblems
        : Array.isArray(packageEmblems) ? packageEmblems : baseRow?.emblems || [],
    ).slice(0, 2);
    while (regularSockets.length < 2) regularSockets.push(null);
    Object.values(overlays).forEach((overlay) => {
      const socketIndex = Number(overlay?.socketIndex);
      if (!Number.isInteger(socketIndex) || socketIndex < 0 || socketIndex >= 2) return;
      if (!regularSockets[socketIndex] && overlay?.baseEmblem) {
        regularSockets[socketIndex] = cloneSimulatorValue(overlay.baseEmblem);
      }
      if (activeOverlays[`${targetSlotId}:${socketIndex}`]?.targetEmblem) {
        regularSockets[socketIndex] = cloneSimulatorValue(
          activeOverlays[`${targetSlotId}:${socketIndex}`].targetEmblem,
        );
      }
    });
    nextRow.emblems = regularSockets;
    avatarRows.splice(rowIndex, 1, nextRow);
    simulator.simulatedBuffLoadout.avatar = avatarRows;
    return true;
  }

  function replaceSimulatedBufferSwitchingAvatarEmblems(row, target) {
    const simulator = state.dealerSimulator;
    const targetSlotId = String(target?.buffSlotId || '').trim();
    if (
      simulator?.role !== 'buffer'
      || target?.applyType !== 'replaceBuffAvatarEmblems'
      || !targetSlotId
      || !target.overlaysBySocket
    ) return false;
    const hasHost = getBuffLoadoutRowsForMetric(simulator.simulatedBuffLoadout?.avatar)
      .some((item) => String(item?.slotId || '').trim() === targetSlotId);
    if (!hasHost) return false;
    const socketPrefix = `${targetSlotId}:`;
    Object.keys(simulator.switchingAvatarEmblemOverlaysBySocket || {}).forEach((socketKey) => {
      if (socketKey.startsWith(socketPrefix)) {
        delete simulator.switchingAvatarEmblemOverlaysBySocket[socketKey];
      }
    });
    Object.assign(
      simulator.switchingAvatarEmblemOverlaysBySocket,
      cloneSimulatorValue(target.overlaysBySocket),
    );
    if (!applySwitchingAvatarEmblemOverlaysToLoadout(targetSlotId, target.overlaysBySocket)) {
      return false;
    }
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedBufferSwitchingPlatinum(row, target) {
    const simulator = state.dealerSimulator;
    const targetSlotId = target?.buffSlotId;
    if (
      simulator?.role !== 'buffer'
      || target?.applyType !== 'replaceBuffAvatarPlatinum'
      || !targetSlotId
      || !target.baseRelativeChanges
    ) return false;
    if (!replaceSimulatedBuffAvatar(row, target, true)) return false;
    simulator.switchingPlatinumChangesBySlot[targetSlotId] = cloneSimulatorValue(
      target.baseRelativeChanges,
    );
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedBuffAvatar(row, target, platinumOnly = false) {
    const targetSlotId = target?.buffSlotId;
    if (!targetSlotId) return false;
    const current = getBuffLoadoutRowsForMetric(state.dealerSimulator?.simulatedBuffLoadout?.avatar)
      .find((item) => String(item?.slotId || '').trim() === targetSlotId) || {};
    const currentContribution = cloneSimulatorValue(current.buffContribution || {});
    const targetAvatar = row.targetBuffChanges?.avatar || {};
    const targetPlatinum = row.targetBuffChanges?.platinumEmblem || {};
    const packagePlatinum = targetAvatar.platinumEmblems?.[0] || null;
    const nextContribution = platinumOnly
      ? { ...currentContribution, platinumSkillLevel: Number(targetPlatinum.skillLevel || 0) }
      : { ...currentContribution, ...cloneSimulatorValue(targetAvatar.buffContribution || {}) };
    const nextRow = platinumOnly
      ? {
        ...cloneSimulatorValue(current),
        buffContribution: nextContribution,
        platinumEmblems: [{
          itemId: targetPlatinum.itemId || row.itemId,
          itemName: targetPlatinum.itemName || row.itemName,
          slotColor: '플래티넘',
        }],
        simulatedPlatinumEmblem: {
          itemId: targetPlatinum.itemId || row.itemId,
          itemName: targetPlatinum.itemName || row.itemName,
          itemRarity: targetPlatinum.itemRarity || row.itemRarity,
          iconUrl: targetPlatinum.iconUrl || row.iconUrl,
          targetSkill: targetPlatinum.targetSkill || row.targetSkill,
        },
      }
      : {
        ...cloneSimulatorValue(current),
        slotId: targetSlotId,
        slotName: targetAvatar.slotName || current.slotName || (targetSlotId === 'JACKET' ? '상의' : '하의'),
        itemId: targetAvatar.itemId || row.itemId,
        itemName: targetAvatar.itemName || row.itemName,
        itemRarity: targetAvatar.itemRarity || row.itemRarity,
        iconUrl: targetAvatar.iconUrl || row.iconUrl,
        optionAbility: targetAvatar.optionAbility || '',
        emblems: cloneSimulatorValue(targetAvatar.emblems || current.emblems || []),
        platinumEmblems: cloneSimulatorValue(
          targetAvatar.platinumEmblems || current.platinumEmblems || [],
        ),
        buffAvatarSource: 'simulatedPackage',
        buffContribution: nextContribution,
        simulatedPlatinumEmblem: cloneSimulatorValue(packagePlatinum),
      };
    return replaceBuffLoadoutRow(
      'avatar',
      (item) => String(item?.slotId || '').trim() === targetSlotId,
      nextRow,
    );
  }

  function replaceSimulatedEquipmentBody(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceEquipmentBody') return false;
    const targetSlotId = target.targetSlotId
      || resolveCanonicalEquipmentSlotId(row.targetEquipmentBody || row);
    const equipmentIndex = simulator.simulatedEquipmentUpgrades.findIndex(
      (equipment) => resolveCanonicalEquipmentSlotId(equipment) === targetSlotId,
    );
    if (equipmentIndex < 0) return false;
    simulator.simulatedEquipmentUpgrades.splice(
      equipmentIndex,
      1,
      replaceEquipmentBodyPreservingState(
        simulator.simulatedEquipmentUpgrades[equipmentIndex],
        row.targetEquipmentBody || {
          slotId: row.targetSlotId,
          slot: row.slot,
          itemId: row.targetItemId,
          itemName: row.targetItemName,
          iconUrl: row.targetIconUrl,
          itemRarity: row.targetItemRarity,
          effects: row.targetEffects,
          itemExplain: row.targetItemExplain,
        },
      ),
    );
    if (simulator.role === 'buffer') {
      simulator.equipmentBodyChangesBySlot[target.targetSlot] = cloneSimulatorValue(
        target.baseRelativeChanges,
      );
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function replaceSimulatedEquipmentProgression(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceEquipmentProgression') return false;
    const equipmentIndex = simulator.simulatedEquipmentUpgrades.findIndex(
      (equipment) => equipment?.slot === target.targetSlot,
    );
    if (equipmentIndex < 0) return false;
    const targetLevel = Number(row.targetLevel);
    if (!Number.isFinite(targetLevel) || targetLevel < 0) return false;
    const current = simulator.simulatedEquipmentUpgrades[equipmentIndex];
    const next = cloneSimulatorValue(current);
    next.reinforce = targetLevel;
    next.isAmplified = target.progressionType === 'amplify';
    next.amplificationName = next.isAmplified
      ? String(current.amplificationName || '').trim()
        || `차원의 ${getDamageBaseline(simulator.baseDamageBaseline).statName}`
      : '';
    simulator.simulatedEquipmentUpgrades.splice(equipmentIndex, 1, next);
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function applySimulatedEquipmentTunePlan(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'applyEquipmentTunePlan') return false;
    const beforeTuneSnapshot = cloneSimulatorValue(simulator.simulatedEquipmentUpgrades || []);
    const nextEquipment = applyEquipmentTunePlan(beforeTuneSnapshot, row.tunePlan);
    if (!nextEquipment) return false;
    target.changedSlots = getChangedEquipmentTuneSlots(beforeTuneSnapshot, nextEquipment);
    target.beforeTuneSnapshot = beforeTuneSnapshot;
    simulator.simulatedEquipmentUpgrades = nextEquipment;
    if (simulator.role === 'buffer') {
      simulator.equipmentTuneChangesBySource.equipmentTune = cloneSimulatorValue(
        target.baseRelativeChanges || row.bufferBaseRelativeChanges,
      );
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function applySimulatedOathTunePlan(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'applyOathTunePlan') return false;
    const beforeTuneSnapshot = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const pointPerTune = Number(simulator.oathTuneDb?.pointPerTune || 10);
    const maxTuneLevel = Number(simulator.oathTuneDb?.maxTuneLevel || 3);
    const nextOath = applyOathTunePlan(beforeTuneSnapshot, row.tunePlan, pointPerTune, maxTuneLevel);
    if (!nextOath || Number(nextOath.setPoint || 0) !== Number(row.targetSetPoint || 0)) return false;
    syncOathTuneStageDisplay(nextOath, simulator.oathTuneDb);
    target.changedSlots = getChangedOathTuneSlots(beforeTuneSnapshot, nextOath);
    target.beforeTuneSnapshot = beforeTuneSnapshot;
    target.pointPerTune = pointPerTune;
    target.maxTuneLevel = maxTuneLevel;
    simulator.simulatedOathUpgrades = nextOath;
    if (simulator.role === 'buffer') {
      simulator.oathTuneChangesBySource.oathTune = cloneSimulatorValue(
        target.baseRelativeChanges || row.bufferBaseRelativeChanges,
      );
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function reapplyOathTuneSelectionToCurrentState(previousSelection = null) {
    const simulator = state.dealerSimulator;
    if (!simulator || previousSelection?.actionType !== 'oathTunePlan') return false;
    const beforeTuneSnapshot = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    if (simulator.role === 'buffer') {
      const acquisitionChanges = getBufferOathStateBaseRelativeChanges(
        simulator.baseOathUpgrades,
        beforeTuneSnapshot,
        simulator.oathTuneDb,
      );
      if (!acquisitionChanges) return false;
      simulator.oathAcquisitionChangesBySource.oathAcquisition = acquisitionChanges;
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    const baseRow = getOathTuneRows(
      getDisplayOrderedOathTuneUpgrades(beforeTuneSnapshot),
      simulator.oathTuneDb,
      state.upgradeMaterialPrices,
      getActiveEquipmentUpgrades(),
      state.currentBufferBaseline,
    )[0];
    const variants = baseRow?.tuneSteps || [];
    if (!baseRow || !variants.length) return false;
    const selectedVariantIndex = Math.max(
      0,
      Math.min(variants.length - 1, Number(previousSelection.selectedVariantIndex || 0)),
    );
    const row = applyEquipmentTuneDisplayStep(
      baseRow,
      selectedVariantIndex,
      els.enchantMaterialCostToggle?.checked === true,
      getActiveDamageBaseline(),
      state.currentBufferBaseline,
      simulator.role === 'buffer' ? simulator : null,
    );
    const pointPerTune = Number(simulator.oathTuneDb?.pointPerTune || 10);
    const maxTuneLevel = Number(simulator.oathTuneDb?.maxTuneLevel || 3);
    const plannedOath = applyOathTunePlan(
      beforeTuneSnapshot,
      row.tunePlan,
      pointPerTune,
      maxTuneLevel,
    );
    if (!plannedOath || Number(plannedOath.setPoint || 0) !== Number(row.targetSetPoint || 0)) {
      return false;
    }
    syncOathTuneStageDisplay(plannedOath, simulator.oathTuneDb);
    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    simulator.simulatedOathUpgrades = plannedOath;
    const nextSelection = {
      ...cloneSimulatorValue(previousSelection),
      candidateSignature: getOathTuneCandidateSignature(row),
      appliedGold: getRecommendationGold(row, includeMaterialCosts),
      includeMaterialCost: includeMaterialCosts,
      goldWithoutMaterials: getRecommendationGold(row, false),
      goldWithMaterials: getRecommendationGold(row, true),
      selectedVariantIndex,
      beforeTuneSnapshot,
      pointPerTune,
      maxTuneLevel,
      variants: cloneSimulatorValue(variants),
      appliedVariantSnapshot: cloneSimulatorValue(row),
      baseRelativeChanges: simulator.role === 'buffer'
        ? cloneSimulatorValue(row.bufferBaseRelativeChanges)
        : previousSelection.baseRelativeChanges,
    };
    simulator.activeSelectionByGroup.oathTune = nextSelection;
    if (simulator.role === 'buffer') {
      simulator.oathTuneChangesBySource.oathTune = cloneSimulatorValue(
        row.bufferBaseRelativeChanges,
      );
    }
    state.tuneStepIndexBySource = {
      ...(state.tuneStepIndexBySource || {}),
      oathTune: selectedVariantIndex,
    };
    return true;
  }

  function syncBufferOathAcquisitionChanges() {
    const simulator = state.dealerSimulator;
    if (simulator?.role !== 'buffer') return true;
    const hasAcquisition = Object.values(simulator.activeSelectionByGroup || {}).some(
      (selection) => selection?.applyType === 'acquireOathDecision',
    );
    if (!hasAcquisition) {
      delete simulator.oathAcquisitionChangesBySource.oathAcquisition;
      return true;
    }
    const acquisitionOath = simulator.activeSelectionByGroup?.oathTune?.beforeTuneSnapshot
      || simulator.simulatedOathUpgrades;
    const changes = getBufferOathStateBaseRelativeChanges(
      simulator.baseOathUpgrades,
      acquisitionOath,
      simulator.oathTuneDb,
    );
    if (!changes) return false;
    simulator.oathAcquisitionChangesBySource.oathAcquisition = changes;
    return true;
  }

  function applySimulatedOathAcquisition(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'acquireOathDecision') return false;
    const rollbackOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const rollbackSelections = cloneSimulatorValue(simulator.activeSelectionByGroup || {});
    const restoreMutation = () => {
      simulator.simulatedOathUpgrades = rollbackOath;
      simulator.activeSelectionByGroup = rollbackSelections;
    };
    const descriptors = target.selectionDescriptors || [];
    const existingPlanSelections = Object.entries(simulator.activeSelectionByGroup || {})
      .filter(([, selection]) => selection?.acquisitionVariantGroupKey === row.variantGroupKey);
    const replacementSelections = (row.replacedAcquisitionGroupKeys || [])
      .map((groupKey) => [groupKey, simulator.activeSelectionByGroup?.[groupKey]])
      .filter(([, selection]) => selection);
    const occupiedTargetSelections = descriptors
      .map((descriptor) => [
        descriptor.exclusiveGroupKey,
        simulator.activeSelectionByGroup?.[descriptor.exclusiveGroupKey],
      ])
      .filter(([, selection]) => selection);
    const selectionsToRestore = new Map([
      ...existingPlanSelections,
      ...replacementSelections,
      ...occupiedTargetSelections,
    ]);
    const originalCrystals = simulator.simulatedOathUpgrades?.crystals || [];
    const originalBySlot = new Map(
      originalCrystals.map((crystal) => [Number(crystal?.index), crystal]),
    );
    const descriptorBySlot = new Map(
      descriptors.map((descriptor) => [Number(descriptor.entry.slotIndex), descriptor]),
    );
    const acquisitionTargetGroupKey = getOathAcquisitionTargetGroupKey(row);
    target.replacedAcquisitionSelectionsByGroup = {};
    selectionsToRestore.forEach((selection, groupKey) => {
      const slotIndex = getOathAcquisitionSlotIndex(selection, groupKey);
      if (!descriptorBySlot.has(slotIndex)) return;
      const previousSelection = selection.acquisitionTargetGroupKey === acquisitionTargetGroupKey
        ? selection.replacedAcquisitionSelection
        : selection;
      if (previousSelection) {
        target.replacedAcquisitionSelectionsByGroup[groupKey] = cloneSimulatorValue(previousSelection);
      }
    });
    const bodyChangedByTarget = descriptors.some(({ entry }) => (
      originalBySlot.get(Number(entry.slotIndex))?.itemId !== entry.targetItemId
    ));
    const bodyChangedByRemoval = [...selectionsToRestore.entries()].some(([groupKey, selection]) => {
      const slotIndex = getOathAcquisitionSlotIndex(selection, groupKey);
      if (descriptorBySlot.has(slotIndex)) return false;
      const previousCrystal = (simulator.baseOathUpgrades?.crystals || [])
        .find((crystal) => Number(crystal?.index) === slotIndex);
      return Boolean(
        previousCrystal && originalBySlot.get(slotIndex)?.itemId !== previousCrystal.itemId,
      );
    });
    const bodyChanged = bodyChangedByTarget || bodyChangedByRemoval;
    target.bodyChanged = bodyChanged;
    if (!bodyChanged) {
      selectionsToRestore.forEach((selection, groupKey) => {
        delete simulator.activeSelectionByGroup[groupKey];
      });
      target.changedSlots = [];
      return true;
    }
    let activeOathTune = simulator.activeSelectionByGroup?.oathTune;
    if (activeOathTune?.actionType === 'oathTunePlan') {
      const removedVariantIndex = Number(activeOathTune.selectedVariantIndex || 0);
      simulator.simulatedOathUpgrades = cloneSimulatorValue(
        activeOathTune.beforeTuneSnapshot || simulator.baseOathUpgrades || {},
      );
      delete simulator.activeSelectionByGroup.oathTune;
      if (simulator.role === 'buffer') {
        delete simulator.oathTuneChangesBySource.oathTune;
      }
      state.tuneStepIndexBySource = {
        ...(state.tuneStepIndexBySource || {}),
        oathTune: removedVariantIndex,
      };
    }
    if (selectionsToRestore.size) {
      selectionsToRestore.forEach((selection, groupKey) => {
        const slotIndex = getOathAcquisitionSlotIndex(selection, groupKey);
        restorePreviousOathAcquisitionSelection(simulator, groupKey, selection);
        if (descriptorBySlot.has(slotIndex)) delete simulator.activeSelectionByGroup[groupKey];
      });
    }
    const nextOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const crystals = Array.isArray(nextOath.crystals) ? nextOath.crystals : [];
    const maxTuneLevel = Number(simulator.oathTuneDb?.maxTuneLevel || 3);
    const changedSlots = [];
    descriptors.forEach(({ entry }) => {
      const crystalIndex = crystals.findIndex(
        (crystal) => Number(crystal?.index) === Number(entry.slotIndex),
      );
      if (crystalIndex < 0 || crystals[crystalIndex]?.itemId === entry.targetItemId) return;
      const currentSetPoint = Number(
        crystals[crystalIndex]?.setPoint || entry.currentSlotSetPoint || 0,
      );
      const targetSetPoint = Number(entry.targetSlotSetPoint || 0);
      nextOath.setPoint = Number(nextOath.setPoint || 0) - currentSetPoint + targetSetPoint;
      crystals.splice(
        crystalIndex,
        1,
        replaceOathDecisionBody(crystals[crystalIndex], entry, maxTuneLevel),
      );
      changedSlots.push(`oath:${Number(entry.slotIndex)}`);
    });
    if (!changedSlots.length) {
      restoreMutation();
      return false;
    }
    syncOathTuneStageDisplay(nextOath, simulator.oathTuneDb);
    simulator.simulatedOathUpgrades = nextOath;
    if (activeOathTune && !reapplyOathTuneSelectionToCurrentState(activeOathTune)) {
      restoreMutation();
      return false;
    }
    target.changedSlots = getChangedOathTuneSlots(
      rollbackOath,
      simulator.simulatedOathUpgrades,
    );
    if (!target.changedSlots.length) target.changedSlots = changedSlots;
    if (simulator.role !== 'buffer') {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  const simulatorActionAdapters = {
    replaceEnchant: {
      apply: replaceSimulatedEnchant,
      remove: (selection) => restoreSimulatedEnchantSlotToBase(selection.targetSlot),
    },
    replaceBufferEnchant: {
      apply: replaceSimulatedBufferEnchant,
      remove: (selection) => restoreSimulatedEnchantSlotToBase(selection.targetSlot),
    },
    replaceAura: { apply: replaceSimulatedAura, remove: restoreSimulatedAuraToBase },
    replaceCreature: { apply: replaceSimulatedCreature, remove: restoreSimulatedCreatureToBase },
    replaceCreatureArtifact: {
      apply: replaceSimulatedCreatureArtifact,
      remove: (selection) => restoreSimulatedCreatureArtifactToBase(selection.artifactType),
    },
    replaceBufferCreatureArtifact: {
      apply: replaceSimulatedBufferCreatureArtifact,
      remove: (selection) => restoreSimulatedCreatureArtifactToBase(selection.artifactType),
    },
    replaceTitle: { apply: replaceSimulatedTitle, remove: restoreSimulatedTitleToBase },
    replaceAvatarEmblems: {
      apply: replaceSimulatedAvatarEmblems,
      remove: (selection) => restoreSimulatedAvatarEmblemsToBase(
        String(selection.targetSlot || '').replace(/^avatar:/, ''),
      ),
    },
    replaceAvatarPlatinumEmblem: {
      apply: replaceSimulatedAvatarPlatinumEmblem,
      remove: (selection) => restoreSimulatedAvatarPlatinumEmblemToBase(
        String(selection.targetSlot || '').replace(/^avatar:/, ''),
      ),
    },
    replaceBuffAvatarEmblems: {
      apply: replaceSimulatedBufferSwitchingAvatarEmblems,
      remove: restoreSimulatedBufferSwitchingAvatarEmblemsToBase,
    },
    replaceBuffEquipment: {
      apply: replaceSimulatedBuffEquipment,
      remove: restoreSimulatedBuffSelectionToBase,
    },
    replaceBuffTitle: {
      apply: (row, target) => state.dealerSimulator?.role === 'buffer'
        ? replaceSimulatedBufferSwitchingTitle(row, target)
        : replaceSimulatedBuffTitle(row, target),
      remove: restoreSimulatedBuffSelectionToBase,
    },
    replaceBuffCreature: {
      apply: (row, target) => state.dealerSimulator?.role === 'buffer'
        ? replaceSimulatedBufferSwitchingCreature(row, target)
        : replaceSimulatedBuffCreature(row, target),
      remove: restoreSimulatedBuffSelectionToBase,
    },
    replaceBuffAvatarPackage: {
      apply: (row, target) => state.dealerSimulator?.role === 'buffer'
        ? replaceSimulatedBufferSwitchingAvatar(row, target)
        : replaceSimulatedBuffAvatar(row, target, false),
      remove: restoreSimulatedBuffSelectionToBase,
    },
    replaceBuffAvatarPlatinum: {
      apply: (row, target) => state.dealerSimulator?.role === 'buffer'
        ? replaceSimulatedBufferSwitchingPlatinum(row, target)
        : replaceSimulatedBuffAvatar(row, target, true),
      remove: restoreSimulatedBuffSelectionToBase,
    },
    replaceEquipmentBody: {
      apply: replaceSimulatedEquipmentBody,
      remove: restoreSimulatedEquipmentBodyToBase,
    },
    replaceEquipmentProgression: {
      apply: replaceSimulatedEquipmentProgression,
      remove: (selection) => restoreSimulatedEquipmentProgressionToBase(selection.targetSlot),
    },
    replaceBufferEquipmentProgression: {
      apply: replaceSimulatedBufferEquipmentProgression,
      remove: (selection) => restoreSimulatedEquipmentProgressionToBase(selection.targetSlot),
    },
    applyEquipmentTunePlan: {
      apply: applySimulatedEquipmentTunePlan,
      remove: removeSimulatedEquipmentTuneSelection,
    },
    applyOathTunePlan: {
      apply: applySimulatedOathTunePlan,
      remove: removeSimulatedOathTuneSelection,
    },
    acquireOathDecision: { apply: applySimulatedOathAcquisition },
  };

  function getSimulatorActionAdapter(applyType) {
    return simulatorActionAdapters[applyType] || null;
  }

  function applySimulatorAction(row, target) {
    const adapter = getSimulatorActionAdapter(target?.applyType);
    return adapter?.apply ? adapter.apply(row, target) : false;
  }

  function closeDealerSimulatorSelection() {
    if (state.dealerSimulator) state.dealerSimulator.selectedRecommendationId = '';
    state.equipmentTunePopoverOpen = false;
    state.equipmentTunePopoverSource = '';
    releaseRecommendationOrderAfterEditing();
    renderEnchantTable();
  }

  function getDealerSimulatorSelectionGold(selection = {}, includeMaterialCosts = false) {
    const selectedGold = includeMaterialCosts
      ? Number(selection.goldWithMaterials)
      : Number(selection.goldWithoutMaterials);
    const ownGold = Number.isFinite(selectedGold) && selectedGold >= 0
      ? selectedGold
      : Number(selection.appliedGold || 0);
    const normalizedOwnGold = Number.isFinite(ownGold) && ownGold >= 0 ? ownGold : 0;
    if (
      selection.applyType === 'acquireOathDecision'
      && selection.replacedAcquisitionSelection
    ) {
      return normalizedOwnGold + getDealerSimulatorSelectionGold(
        selection.replacedAcquisitionSelection,
        includeMaterialCosts,
      );
    }
    return normalizedOwnGold;
  }

  function getOathAcquisitionEntryGold(entry = {}, includeMaterialCosts = false) {
    const baseGold = Number(entry.expectedGold || 0);
    if (!Number.isFinite(baseGold) || baseGold < 0) return 0;
    return includeMaterialCosts
      ? baseGold + getMaterialGold(entry.expectedMaterials || [])
      : baseGold;
  }

  function buildAppliedEquipmentProgressionSelection(
    row,
    target,
    previousSelection,
    goldWithoutMaterials,
    goldWithMaterials,
    includeMaterialCosts,
  ) {
    const simulator = state.dealerSimulator;
    const isBuffer = simulator?.role === 'buffer';
    const baseEquipment = simulator?.baseEquipmentUpgrades?.find(
      (equipment) => equipment?.slot === target.targetSlot,
    );
    const simulatedEquipment = simulator?.simulatedEquipmentUpgrades?.find(
      (equipment) => equipment?.slot === target.targetSlot,
    );
    if (!simulator || !baseEquipment || !simulatedEquipment) return null;
    const isContinuousStep = Boolean(
      previousSelection
      && previousSelection.applyType === target.applyType
      && previousSelection.progressionType === target.progressionType
      && Number(previousSelection.targetLevel) === Number(row.currentLevel),
    );
    const cumulativeGoldWithoutMaterials = (isContinuousStep
      ? Number(previousSelection.goldWithoutMaterials || 0)
      : 0) + goldWithoutMaterials;
    const cumulativeGoldWithMaterials = (isContinuousStep
      ? Number(previousSelection.goldWithMaterials || 0)
      : 0) + goldWithMaterials;
    const expectedMaterials = isContinuousStep
      ? mergeUpgradeMaterials(
        previousSelection.appliedRecommendationSnapshot?.expectedMaterials || [],
        row.expectedMaterials || [],
      )
      : cloneSimulatorValue(row.expectedMaterials || []);
    const effects = isBuffer
      ? { allStat: Number(target.baseRelativeChanges?.statDelta || 0) }
      : subtractEffects(
        getCumulativeUpgradeEffectsForEquipment(
          simulatedEquipment,
          Number(simulatedEquipment.reinforce || 0),
          getEquipmentProgressionMode(simulatedEquipment),
          simulator.upgradeDb,
          simulator.baseDamageBaseline,
          false,
        ),
        getCumulativeUpgradeEffectsForEquipment(
          baseEquipment,
          Number(baseEquipment.reinforce || 0),
          getEquipmentProgressionMode(baseEquipment),
          simulator.upgradeDb,
          simulator.baseDamageBaseline,
          false,
        ),
      );
    const appliedSnapshot = {
      ...cloneSimulatorValue(row),
      itemName: `${target.targetSlot} ${Number(baseEquipment.reinforce || 0)}->${Number(simulatedEquipment.reinforce || 0)} ${target.progressionType === 'amplify' ? '증폭' : '강화'}`,
      effects,
      currentLevel: Number(baseEquipment.reinforce || 0),
      targetLevel: Number(simulatedEquipment.reinforce || 0),
      upgradeMode: target.progressionType === 'amplify' ? 'amplification' : 'reinforcement',
      expectedGold: cumulativeGoldWithoutMaterials,
      auction: { ...(row.auction || {}), minUnitPrice: cumulativeGoldWithoutMaterials },
      expectedMaterials,
      isAppliedProgressionSnapshot: true,
    };
    return {
      candidateSignature: isBuffer
        ? getBufferUpgradeCandidateSignature(appliedSnapshot)
        : getEquipmentProgressionCandidateSignature(appliedSnapshot),
      appliedGold: includeMaterialCosts ? cumulativeGoldWithMaterials : cumulativeGoldWithoutMaterials,
      includeMaterialCost: includeMaterialCosts,
      goldWithoutMaterials: cumulativeGoldWithoutMaterials,
      goldWithMaterials: cumulativeGoldWithMaterials,
      targetTab: target.targetTab,
      targetSlot: target.targetSlot,
      progressionType: target.progressionType,
      baseLevel: Number(baseEquipment.reinforce || 0),
      targetLevel: Number(simulatedEquipment.reinforce || 0),
      applyType: target.applyType,
      baseRelativeChanges: isBuffer
        ? cloneSimulatorValue(target.baseRelativeChanges)
        : undefined,
      appliedRecommendationSnapshot: appliedSnapshot,
    };
  }

  function setActiveOathAcquisitionSelections(
    row,
    target,
    acquisitionActionId,
    includeMaterialCosts,
  ) {
    const simulator = state.dealerSimulator;
    const descriptors = target?.selectionDescriptors || [];
    if (!simulator || !descriptors.length) return [];
    const acquisitionTargetGroupKey = getOathAcquisitionTargetGroupKey(row);
    descriptors.forEach((descriptor) => {
      const entryGoldWithoutMaterials = getOathAcquisitionEntryGold(descriptor.entry, false);
      const entryGoldWithMaterials = getOathAcquisitionEntryGold(descriptor.entry, true);
      simulator.activeSelectionByGroup[descriptor.exclusiveGroupKey] = {
        candidateSignature: descriptor.candidateSignature,
        acquisitionActionId,
        acquisitionVariantGroupKey: row.variantGroupKey || '',
        acquisitionTargetGroupKey,
        acquisitionMethod: descriptor.acquisitionMethod,
        appliedGold: includeMaterialCosts ? entryGoldWithMaterials : entryGoldWithoutMaterials,
        includeMaterialCost: includeMaterialCosts,
        goldWithoutMaterials: entryGoldWithoutMaterials,
        goldWithMaterials: entryGoldWithMaterials,
        materials: cloneSimulatorValue(descriptor.entry.materials || []),
        targetItemId: descriptor.entry.targetItemId,
        targetDecision: cloneSimulatorValue(descriptor.entry),
        targetTab: target.targetTab,
        targetSlot: `oath:${descriptor.entry.slotIndex}`,
        applyType: target.applyType,
        appliedRecommendationSnapshot: cloneSimulatorValue(row),
        replacedAcquisitionSelection: cloneSimulatorValue(
          target.replacedAcquisitionSelectionsByGroup?.[descriptor.exclusiveGroupKey] || null,
        ),
        removedOathTuneSelection: cloneSimulatorValue(target.removedOathTuneSelection || null),
      };
    });
    const selectedVariantIndex = Math.max(0, descriptors.length - 1);
    state.oathDecisionVariantIndexByGroup = {
      ...(state.oathDecisionVariantIndexByGroup || {}),
      [row.variantGroupKey]: selectedVariantIndex,
    };
    if (simulator.role === 'buffer') {
      if (!syncBufferOathAcquisitionChanges()) return [];
      rebuildBufferSimulatorCalculationState();
    }
    return descriptors;
  }

  function syncOathAcquisitionVariantIndexes(resetInactive = false) {
    const activeCounts = getActiveOathAcquisitionCountByVariantGroup(state.dealerSimulator || {});
    const nextIndexes = resetInactive
      ? {}
      : { ...(state.oathDecisionVariantIndexByGroup || {}) };
    activeCounts.forEach((count, groupKey) => {
      nextIndexes[groupKey] = Math.max(0, Number(count || 0) - 1);
    });
    state.oathDecisionVariantIndexByGroup = nextIndexes;
  }

  function getDealerSimulatorTotalGold(
    simulator = state.dealerSimulator,
    includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true,
  ) {
    return Object.values(simulator?.activeSelectionByGroup || {}).reduce(
      (sum, selection) => sum + getDealerSimulatorSelectionGold(selection, includeMaterialCosts),
      0,
    );
  }

  function syncDealerSimulatorMaterialCostState() {
    const simulator = getActiveSimulator();
    if (!simulator) return;
    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    Object.values(simulator.activeSelectionByGroup || {}).forEach((selection) => {
      selection.includeMaterialCost = includeMaterialCosts;
      selection.appliedGold = getDealerSimulatorSelectionGold(selection, includeMaterialCosts);
    });
    simulator.totalGold = getDealerSimulatorTotalGold(simulator, includeMaterialCosts);
  }

  const DEALER_SIMULATOR_SWEEP_DURATION_MS = 800;

  const { buildEnchantPortraitSlotMarkup } = createEnchantEquipmentLoadoutBoard({
    escapeHtml,
    formatEffectNumber,
    formatEffectValue,
    formatEffects,
    getBufferSelectedStatEffect,
    getReinforceSkillLevel,
    getCreatureArtifactDisplayEffects,
    getLoadoutRarityClass,
    slotOrder: SLOT_ORDER,
    sweepDurationMs: DEALER_SIMULATOR_SWEEP_DURATION_MS,
    now: () => Date.now(),
    getSweepEntry: (key) => state.dealerSimulator?.activeSweepSlots?.get(key),
    getEquipmentLoadoutBoardContext: () => ({
      activeEquipmentUpgrades: getActiveEquipmentUpgrades(),
      baseEquipmentUpgrades: state.dealerSimulator?.baseEquipmentUpgrades,
      currentEquipmentUpgrades: state.currentEquipmentUpgrades,
      activeEnchants: getActiveEnchants(),
      activeTitle: getActiveTitle(),
      activeCreature: getActiveCreature(),
      activeCreatureArtifacts: getActiveCreatureArtifacts(),
      activeAura: getActiveAura(),
      currentBufferBaseline: state.currentBufferBaseline,
      activeDamageBaseline: getActiveDamageBaseline(),
    }),
  });

  function triggerDealerSimulatorSweep(slot) {
    const simulator = getActiveSimulator();
    if (!simulator || !slot) return;
    const token = simulator.sweepSequence + 1;
    simulator.sweepSequence = token;
    simulator.activeSweepSlots.set(slot, { token, startedAt: Date.now() });
    setTimeout(() => {
      if (getActiveSimulator() !== simulator) return;
      const activeSweep = simulator.activeSweepSlots.get(slot);
      if (activeSweep?.token === token) simulator.activeSweepSlots.delete(slot);
    }, DEALER_SIMULATOR_SWEEP_DURATION_MS);
  }

  function createActiveSimulatorSelection({
    row,
    target,
    candidateSignature,
    previousSelection,
    goldWithoutMaterials,
    goldWithMaterials,
    includeMaterialCosts,
  }) {
    if (['replaceEquipmentProgression', 'replaceBufferEquipmentProgression'].includes(target.applyType)) {
      return buildAppliedEquipmentProgressionSelection(
        row,
        target,
        previousSelection,
        goldWithoutMaterials,
        goldWithMaterials,
        includeMaterialCosts,
      );
    }
    return {
      candidateSignature,
      appliedGold: includeMaterialCosts ? goldWithMaterials : goldWithoutMaterials,
      includeMaterialCost: includeMaterialCosts,
      goldWithoutMaterials,
      goldWithMaterials,
      targetTab: target.targetTab,
      targetSlot: target.targetSlot,
      artifactType: target.artifactType || '',
      buffSlotId: target.buffSlotId || '',
      applyType: target.applyType,
      baseRelativeChanges: cloneSimulatorValue(target.baseRelativeChanges),
      appliedRecommendationSnapshot: cloneSimulatorValue(row),
      ...(['applyEquipmentTunePlan', 'applyOathTunePlan'].includes(target.applyType) ? {
        actionType: target.applyType === 'applyOathTunePlan'
          ? 'oathTunePlan'
          : 'equipmentTunePlan',
        selectedVariantIndex: Number(row.selectedTuneStepIndex || 0),
        beforeTuneSnapshot: cloneSimulatorValue(
          target.beforeTuneSnapshot || (target.applyType === 'applyOathTunePlan' ? {} : []),
        ),
        pointPerTune: target.pointPerTune,
        maxTuneLevel: target.maxTuneLevel,
        variants: cloneSimulatorValue(row.tuneSteps || []),
        appliedVariantSnapshot: cloneSimulatorValue(row),
      } : {}),
    };
  }

  function finishSimulatorActionApplication(target, includeMaterialCosts) {
    const simulator = state.dealerSimulator;
    simulator.totalGold = simulator.role === 'buffer'
      ? getDealerSimulatorTotalGold(simulator, includeMaterialCosts)
      : getDealerSimulatorTotalGold(simulator);
    simulator.selectedRecommendationId = '';
    simulator.lastChangedTarget = target;
    const changedSlots = Array.isArray(target.changedSlots)
      ? target.changedSlots
      : [target.targetSlot];
    changedSlots.forEach(triggerDealerSimulatorSweep);
    state.enchantLoadoutTab = target.targetTab;
    renderEnchantCharacterPortrait();
    renderEnchantTable();
  }

  function applyBufferSimulatorRecommendation(recommendationId) {
    const simulator = state.dealerSimulator;
    if (simulator?.role !== 'buffer' || simulator.applyingRecommendationId) return;
    const row = state.dealerSimulatorRecommendations.get(recommendationId);
    const target = resolveBufferSimulatorTarget(row);
    if (!row || !target) return;
    const exclusiveGroupKey = getSimulatorExclusiveGroupKey(row);
    const candidateSignature = getSimulatorCandidateSignature(row);
    if (!exclusiveGroupKey || !candidateSignature) return;
    if (simulator.activeSelectionByGroup?.[exclusiveGroupKey]?.candidateSignature === candidateSignature) return;
    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    const goldWithoutMaterials = getRecommendationGold(row, false);
    const goldWithMaterials = getRecommendationGold(row, true);
    const appliedGold = includeMaterialCosts ? goldWithMaterials : goldWithoutMaterials;
    if (!Number.isFinite(appliedGold) || appliedGold < 0) return;
    const snapshot = createSimulatorSnapshot();
    const previousSelection = cloneSimulatorValue(
      simulator.activeSelectionByGroup?.[exclusiveGroupKey] || null,
    );
    simulator.applyingRecommendationId = recommendationId;
    try {
      const applied = applySimulatorAction(row, target);
      if (!applied) {
        restoreSimulatorSnapshot(snapshot);
        return;
      }
      const selection = createActiveSimulatorSelection({
        row,
        target,
        candidateSignature,
        previousSelection,
        goldWithoutMaterials,
        goldWithMaterials,
        includeMaterialCosts,
      });
      if (!selection?.candidateSignature) throw new Error('Buffer selection missing');
      simulator.activeSelectionByGroup[exclusiveGroupKey] = selection;
      finishSimulatorActionApplication(target, includeMaterialCosts);
    } catch {
      restoreSimulatorSnapshot(snapshot);
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      setEnchantCharacterStatus('시뮬레이션 적용에 실패했습니다.');
    } finally {
      simulator.applyingRecommendationId = '';
    }
  }

  function applyActiveSimulatorRecommendation(recommendationId) {
    if (isBufferSimulatorActive()) applyBufferSimulatorRecommendation(recommendationId);
    else applyDealerSimulatorRecommendation(recommendationId);
  }

  function applyDealerSimulatorRecommendation(recommendationId) {
    const simulator = state.dealerSimulator;
    if (!simulator || simulator.applyingRecommendationId) return;
    const row = state.dealerSimulatorRecommendations.get(recommendationId);
    const target = resolveDealerSimulatorTarget(row);
    if (!row || !target) return;
    const exclusiveGroupKey = getSimulatorExclusiveGroupKey(row);
    const candidateSignature = getSimulatorCandidateSignature(row);
    if (!exclusiveGroupKey || !candidateSignature) return;
    const oathAcquisitionDescriptors = getOathAcquisitionSelectionDescriptors(row);
    const isOathAcquisition = target.applyType === 'acquireOathDecision';
    const previousSelection = cloneSimulatorValue(
      simulator.activeSelectionByGroup?.[exclusiveGroupKey] || null,
    );
    const isAlreadyApplied = isOathAcquisition
      ? oathAcquisitionDescriptors.length > 0 && oathAcquisitionDescriptors.every((descriptor) => (
        simulator.activeSelectionByGroup?.[descriptor.exclusiveGroupKey]?.candidateSignature
        === descriptor.candidateSignature
      )) && Object.values(simulator.activeSelectionByGroup || {}).filter((selection) => (
        selection?.acquisitionVariantGroupKey === row.variantGroupKey
      )).length === oathAcquisitionDescriptors.length
      : simulator.activeSelectionByGroup?.[exclusiveGroupKey]?.candidateSignature === candidateSignature;
    if (isAlreadyApplied) return;
    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    const goldWithoutMaterials = getRecommendationGold(row, false);
    const goldWithMaterials = getRecommendationGold(row, true);
    const latestGold = includeMaterialCosts ? goldWithMaterials : goldWithoutMaterials;
    if (!Number.isFinite(latestGold) || latestGold < 0) return;
    const snapshot = createSimulatorSnapshot();
    simulator.applyingRecommendationId = recommendationId;
    try {
      if (!applySimulatorAction(row, target)) {
        restoreSimulatorSnapshot(snapshot);
        return;
      }
      if (target.applyType === 'replaceBuffAvatarPackage') {
        delete simulator.activeSelectionByGroup[`buffAvatarPlatinum:${target.buffSlotId}`];
      }
      if (isOathAcquisition) {
        const appliedDescriptors = setActiveOathAcquisitionSelections(
          row,
          target,
          recommendationId,
          includeMaterialCosts,
        );
        if (!appliedDescriptors.length) throw new Error('Oath acquisition selection missing');
        syncOathAcquisitionVariantIndexes();
      } else {
        const selection = createActiveSimulatorSelection({
          row,
          target,
          candidateSignature,
          previousSelection,
          goldWithoutMaterials,
          goldWithMaterials,
          includeMaterialCosts,
        });
        if (!selection?.candidateSignature) throw new Error('Dealer selection missing');
        simulator.activeSelectionByGroup[exclusiveGroupKey] = selection;
      }
      finishSimulatorActionApplication(target, includeMaterialCosts);
    } catch {
      restoreSimulatorSnapshot(snapshot);
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      setEnchantCharacterStatus('시뮬레이션 적용에 실패했습니다.');
    } finally {
      simulator.applyingRecommendationId = '';
    }
  }

  function restoreSimulatedEnchantSlotToBase(targetSlot) {
    const simulator = state.dealerSimulator;
    if (!simulator || !targetSlot) return false;
    const baseEnchant = simulator.baseEnchants.find((enchant) => enchant?.slot === targetSlot);
    const currentIndex = simulator.simulatedEnchants.findIndex((enchant) => enchant?.slot === targetSlot);
    if (baseEnchant) {
      const restoredEnchant = cloneSimulatorValue(baseEnchant);
      if (currentIndex >= 0) simulator.simulatedEnchants.splice(currentIndex, 1, restoredEnchant);
      else simulator.simulatedEnchants.push(restoredEnchant);
    } else if (currentIndex >= 0) {
      simulator.simulatedEnchants.splice(currentIndex, 1);
    }
    if (simulator.role === 'buffer') {
      delete simulator.enchantChangesBySlot[targetSlot];
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function restoreSimulatedEquipmentProgressionToBase(targetSlot) {
    const simulator = state.dealerSimulator;
    if (!simulator || !targetSlot) return false;
    const baseEquipment = simulator.baseEquipmentUpgrades.find(
      (equipment) => equipment?.slot === targetSlot,
    );
    const equipmentIndex = simulator.simulatedEquipmentUpgrades.findIndex(
      (equipment) => equipment?.slot === targetSlot,
    );
    if (!baseEquipment || equipmentIndex < 0) return false;
    const current = cloneSimulatorValue(simulator.simulatedEquipmentUpgrades[equipmentIndex]);
    current.reinforce = Number(baseEquipment.reinforce || 0);
    current.isAmplified = Boolean(baseEquipment.isAmplified);
    current.amplificationName = baseEquipment.amplificationName || '';
    simulator.simulatedEquipmentUpgrades.splice(equipmentIndex, 1, current);
    if (simulator.role === 'buffer') {
      delete simulator.upgradeChangesBySlot[targetSlot];
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function restoreSimulatedAuraToBase() {
    const simulator = state.dealerSimulator;
    if (!simulator) return false;
    simulator.simulatedAura = mergeAuraBodyWithEmblems(
      simulator.baseAura || {},
      simulator.simulatedAura || {},
    );
    if (simulator.role === 'buffer') {
      delete simulator.auraChangesBySource.aura;
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function restoreSimulatedCreatureToBase() {
    const simulator = state.dealerSimulator;
    if (!simulator) return false;
    simulator.simulatedCreature = cloneSimulatorValue(simulator.baseCreature || {});
    if (simulator.role === 'buffer') {
      delete simulator.creatureChangesBySource.creature;
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function restoreSimulatedCreatureArtifactToBase(artifactType) {
    const simulator = state.dealerSimulator;
    const normalizedType = getCreatureArtifactType({ slotColor: artifactType });
    if (!simulator || !normalizedType) return false;
    const baseArtifact = (simulator.baseCreatureArtifacts || []).find(
      (artifact) => getCreatureArtifactType(artifact) === normalizedType,
    );
    const currentIndex = (simulator.simulatedCreatureArtifacts || []).findIndex(
      (artifact) => getCreatureArtifactType(artifact) === normalizedType,
    );
    if (baseArtifact) {
      const restoredArtifact = cloneSimulatorValue(baseArtifact);
      if (currentIndex >= 0) simulator.simulatedCreatureArtifacts.splice(currentIndex, 1, restoredArtifact);
      else simulator.simulatedCreatureArtifacts.push(restoredArtifact);
    } else if (currentIndex >= 0) {
      simulator.simulatedCreatureArtifacts.splice(currentIndex, 1);
    }
    if (simulator.role === 'buffer') {
      delete simulator.artifactChangesByType[normalizedType];
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function restoreSimulatedTitleToBase() {
    const simulator = state.dealerSimulator;
    if (!simulator) return false;
    simulator.simulatedTitle = cloneSimulatorValue(simulator.baseTitle || {});
    if (simulator.role === 'buffer') {
      delete simulator.titleChangesBySource.title;
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function restoreSimulatedAvatarEmblemsToBase(targetSlotId) {
    const simulator = state.dealerSimulator;
    if (!simulator || !targetSlotId) return false;
    const baseSlot = (simulator.baseAvatar?.slots || [])
      .find((slot) => slot?.slotId === targetSlotId);
    const simulatedSlot = (simulator.simulatedAvatar?.slots || [])
      .find((slot) => slot?.slotId === targetSlotId);
    if (!baseSlot || !simulatedSlot) return false;
    simulatedSlot.emblems = cloneSimulatorValue(baseSlot.emblems || [null, null]);
    if (simulator.role === 'buffer') {
      const socketPrefix = `${targetSlotId}:`;
      Object.keys(simulator.avatarEmblemChangesBySocket || {}).forEach((socketKey) => {
        if (socketKey.startsWith(socketPrefix)) {
          delete simulator.avatarEmblemChangesBySocket[socketKey];
        }
      });
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function restoreSimulatedAvatarPlatinumEmblemToBase(targetSlotId) {
    const simulator = state.dealerSimulator;
    if (!simulator || !targetSlotId) return false;
    const baseSlot = (simulator.baseAvatar?.slots || [])
      .find((slot) => slot?.slotId === targetSlotId);
    const simulatedSlot = (simulator.simulatedAvatar?.slots || [])
      .find((slot) => slot?.slotId === targetSlotId);
    if (!baseSlot || !simulatedSlot) return false;
    simulatedSlot.platinumEmblems = cloneSimulatorValue(baseSlot.platinumEmblems || []);
    simulatedSlot.recognizedPlatinumLevelContribution = Number(
      baseSlot.recognizedPlatinumLevelContribution || 0,
    );
    delete simulator.avatarPlatinumChangesBySlot[targetSlotId];
    if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
    else rebuildDealerSimulatorCalculationState();
    return true;
  }

  function restoreSimulatedBufferSwitchingAvatarEmblemsToBase(selection = {}) {
    const simulator = state.dealerSimulator;
    const targetSlotId = String(
      selection.buffSlotId || selection.targetSlot || '',
    ).replace(/^buffAvatar:/, '').trim();
    if (simulator?.role !== 'buffer' || !targetSlotId) return false;
    const removedOverlays = {};
    const socketPrefix = `${targetSlotId}:`;
    Object.keys(simulator.switchingAvatarEmblemOverlaysBySocket || {}).forEach((socketKey) => {
      if (!socketKey.startsWith(socketPrefix)) return;
      removedOverlays[socketKey] = cloneSimulatorValue(
        simulator.switchingAvatarEmblemOverlaysBySocket[socketKey],
      );
      delete simulator.switchingAvatarEmblemOverlaysBySocket[socketKey];
    });
    const hasHost = getBuffLoadoutRowsForMetric(simulator.simulatedBuffLoadout?.avatar)
      .some((item) => String(item?.slotId || '').trim() === targetSlotId);
    if (hasHost) {
      applySwitchingAvatarEmblemOverlaysToLoadout(targetSlotId, removedOverlays);
    }
    rebuildBufferSimulatorCalculationState();
    return true;
  }

  function restoreSimulatedEquipmentBodyToBase(selection = {}) {
    const simulator = state.dealerSimulator;
    const targetSlotId = selection.targetSlotId
      || resolveCanonicalEquipmentSlotId({ slot: selection.targetSlot });
    if (!simulator || !targetSlotId) return false;
    const baseEquipment = simulator.baseEquipmentUpgrades.find((equipment) => (
      resolveCanonicalEquipmentSlotId(equipment) === targetSlotId
    ));
    const equipmentIndex = simulator.simulatedEquipmentUpgrades.findIndex((equipment) => (
      resolveCanonicalEquipmentSlotId(equipment) === targetSlotId
    ));
    if (!baseEquipment || equipmentIndex < 0) return false;
    const targetSlot = resolveCanonicalEquipmentSlotName(baseEquipment);
    simulator.simulatedEquipmentUpgrades.splice(
      equipmentIndex,
      1,
      replaceEquipmentBodyPreservingState(
        simulator.simulatedEquipmentUpgrades[equipmentIndex],
        {
          slotId: targetSlotId,
          slot: targetSlot,
          itemId: baseEquipment.itemId,
          itemName: baseEquipment.itemName,
          iconUrl: baseEquipment.iconUrl,
          itemRarity: baseEquipment.itemRarity,
          effects: baseEquipment.bodyEffects,
          itemExplain: baseEquipment.bodyExplain,
          itemReinforceSkill: baseEquipment.itemReinforceSkill,
          itemBuff: baseEquipment.itemBuff,
          tuneSetPoint: baseEquipment.tuneSetPoint,
        },
      ),
    );
    if (simulator.role === 'buffer') {
      delete simulator.equipmentBodyChangesBySlot[targetSlot];
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    return true;
  }

  function restoreSimulatedBuffSelectionToBase(selection = {}) {
    const simulator = state.dealerSimulator;
    if (!simulator) return false;
    const applyType = selection.applyType;
    if (applyType === 'replaceBuffCreature') {
      simulator.simulatedBuffLoadout.creature = cloneSimulatorValue(
        simulator.baseBuffLoadout?.creature || [],
      );
      if (simulator.role === 'buffer') {
        delete simulator.switchingCreatureChangesBySource.switchingCreature;
      }
    } else if (applyType === 'replaceBuffTitle' || applyType === 'replaceBuffEquipment') {
      const targetSlotId = applyType === 'replaceBuffTitle'
        ? 'TITLE'
        : String(
          selection.buffSlotId
          || selection.targetSlot
          || '',
        ).replace(/^buffEquipment:/, '').trim();
      const baseRows = getBuffLoadoutRowsForMetric(simulator.baseBuffLoadout?.equipment);
      const simulatedRows = getBuffLoadoutRowsForMetric(simulator.simulatedBuffLoadout?.equipment);
      const baseRow = baseRows.find((item) => (
        applyType === 'replaceBuffTitle'
          ? String(item?.slotId || '').trim() === 'TITLE'
          : String(item?.slotName || '').trim() === targetSlotId
      ));
      const index = simulatedRows.findIndex((item) => (
        applyType === 'replaceBuffTitle'
          ? String(item?.slotId || '').trim() === 'TITLE'
          : String(item?.slotName || '').trim() === targetSlotId
      ));
      if (index >= 0 && baseRow) simulatedRows.splice(index, 1, cloneSimulatorValue(baseRow));
      else if (index >= 0) simulatedRows.splice(index, 1);
      simulator.simulatedBuffLoadout.equipment = simulatedRows;
      if (simulator.role === 'buffer' && applyType === 'replaceBuffTitle') {
        delete simulator.switchingTitleChangesBySource.switchingTitle;
      }
    } else if (['replaceBuffAvatarPackage', 'replaceBuffAvatarPlatinum'].includes(applyType)) {
      const targetSlotId = String(
        selection.buffSlotId
        || selection.targetSlot
        || '',
      ).replace(/^buffAvatar:/, '').trim();
      const baseRow = getBuffLoadoutRowsForMetric(simulator.baseBuffLoadout?.avatar)
        .find((item) => String(item?.slotId || '').trim() === targetSlotId);
      const hasPhysicalBaseHost = baseRow?.buffAvatarSource === 'actual';
      const simulatedRows = getBuffLoadoutRowsForMetric(simulator.simulatedBuffLoadout?.avatar);
      const index = simulatedRows.findIndex(
        (item) => String(item?.slotId || '').trim() === targetSlotId,
      );
      if (applyType === 'replaceBuffAvatarPackage') {
        const emblemGroupKey = `buffAvatarEmblem:${targetSlotId}`;
        const emblemSelection = simulator.activeSelectionByGroup?.[emblemGroupKey];
        if (!hasPhysicalBaseHost && emblemSelection) {
          const emblemRemoveResult = removeSimulatorAction(emblemSelection);
          if (!emblemRemoveResult) return false;
          delete simulator.activeSelectionByGroup[emblemGroupKey];
        }
        const platinumGroupKey = `buffAvatarPlatinum:${targetSlotId}`;
        const dependentPlatinumSelection = simulator.activeSelectionByGroup?.[platinumGroupKey];
        if (!hasPhysicalBaseHost && dependentPlatinumSelection) {
          const platinumRemoveResult = removeSimulatorAction(dependentPlatinumSelection);
          if (!platinumRemoveResult) return false;
          delete simulator.activeSelectionByGroup[platinumGroupKey];
        }
        if (index >= 0 && baseRow) simulatedRows.splice(index, 1, cloneSimulatorValue(baseRow));
        else if (index >= 0) simulatedRows.splice(index, 1);
        const platinumSelection = simulator.activeSelectionByGroup?.[`buffAvatarPlatinum:${targetSlotId}`];
        const platinumTarget = platinumSelection?.appliedRecommendationSnapshot?.targetBuffChanges?.platinumEmblem;
        const restoredIndex = simulatedRows.findIndex(
          (item) => String(item?.slotId || '').trim() === targetSlotId,
        );
        if (platinumTarget && restoredIndex >= 0) {
          simulatedRows[restoredIndex] = {
            ...simulatedRows[restoredIndex],
            buffContribution: {
              ...(simulatedRows[restoredIndex].buffContribution || {}),
              platinumSkillLevel: Number(platinumTarget.skillLevel || 0),
            },
            simulatedPlatinumEmblem: cloneSimulatorValue(platinumTarget),
          };
        }
      } else {
        if (index < 0) {
          simulator.simulatedBuffLoadout.avatar = simulatedRows;
          rebuildDealerSimulatorCalculationState();
          return true;
        }
        const current = simulatedRows[index];
        const packageSelection = simulator.activeSelectionByGroup?.[`buffAvatarPackage:${targetSlotId}`];
        const packageTarget = packageSelection?.appliedRecommendationSnapshot?.targetBuffChanges?.avatar;
        const packagePlatinum = packageTarget?.platinumEmblems?.[0] || null;
        const restoredPlatinumLevel = packageTarget
          ? Number(packageTarget?.buffContribution?.platinumSkillLevel || 0)
          : Number(baseRow?.buffContribution?.platinumSkillLevel || 0);
        simulatedRows.splice(index, 1, {
          ...current,
          buffContribution: {
            ...(current.buffContribution || {}),
            platinumSkillLevel: restoredPlatinumLevel,
          },
          platinumEmblems: cloneSimulatorValue(
            packageTarget ? packageTarget.platinumEmblems || [] : baseRow?.platinumEmblems || [],
          ),
          simulatedPlatinumEmblem: cloneSimulatorValue(
            packageTarget ? packagePlatinum : baseRow?.simulatedPlatinumEmblem || null,
          ),
        });
      }
      simulator.simulatedBuffLoadout.avatar = simulatedRows;
      if (simulator.role === 'buffer' && applyType === 'replaceBuffAvatarPackage') {
        delete simulator.switchingAvatarChangesBySlot[targetSlotId];
        if (baseRow && simulator.activeSelectionByGroup?.[`buffAvatarEmblem:${targetSlotId}`]) {
          applySwitchingAvatarEmblemOverlaysToLoadout(
            targetSlotId,
            {},
            cloneSimulatorValue(baseRow.emblems || []),
          );
        }
      }
      if (simulator.role === 'buffer' && applyType === 'replaceBuffAvatarPlatinum') {
        delete simulator.switchingPlatinumChangesBySlot[targetSlotId];
      }
    } else {
      return false;
    }
    if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
    else rebuildDealerSimulatorCalculationState();
    return true;
  }

  function removeSimulatedOathTuneSelection(selection = {}) {
    const simulator = state.dealerSimulator;
    const previousOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    simulator.simulatedOathUpgrades = cloneSimulatorValue(
      selection.beforeTuneSnapshot || simulator.baseOathUpgrades || {},
    );
    if (simulator.role === 'buffer') {
      delete simulator.oathTuneChangesBySource.oathTune;
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    state.tuneStepIndexBySource = {
      ...(state.tuneStepIndexBySource || {}),
      oathTune: simulator.role === 'buffer' ? Number(selection.selectedVariantIndex || 0) : 0,
    };
    return {
      changedSlots: getChangedOathTuneSlots(previousOath, simulator.simulatedOathUpgrades),
    };
  }

  function removeSimulatedEquipmentTuneSelection(selection = {}) {
    const simulator = state.dealerSimulator;
    const previousEquipment = cloneSimulatorValue(simulator.simulatedEquipmentUpgrades || []);
    const currentEquipmentBySlot = new Map(
      previousEquipment.map((equipment) => [equipment?.slot, equipment]),
    );
    simulator.simulatedEquipmentUpgrades = cloneSimulatorValue(
      selection.beforeTuneSnapshot || simulator.baseEquipmentUpgrades || [],
    ).map((equipment) => {
      const currentEquipment = currentEquipmentBySlot.get(equipment?.slot);
      const equipmentBodySelection = Object.values(
        simulator.activeSelectionByGroup || {},
      ).find((selection) => (
        selection?.targetSlot === equipment?.slot
        && selection.applyType === 'replaceEquipmentBody'
      ));
      if (!currentEquipment || !equipmentBodySelection) {
        return equipment;
      }
      return replaceEquipmentBodyPreservingState(equipment, {
        itemId: currentEquipment.itemId,
        itemName: currentEquipment.itemName,
        iconUrl: currentEquipment.iconUrl,
        itemRarity: currentEquipment.itemRarity,
        effects: currentEquipment.bodyEffects,
        itemExplain: currentEquipment.bodyExplain,
        tuneSetPoint: currentEquipment.tuneSetPoint,
      });
    });
    if (simulator.role === 'buffer') {
      delete simulator.equipmentTuneChangesBySource.equipmentTune;
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    const selectedVariantIndex = Number(selection.selectedVariantIndex || 0);
    state.tuneStepIndexBySource = {
      ...(state.tuneStepIndexBySource || {}),
      equipmentTune: selectedVariantIndex,
    };
    state.equipmentTuneStepIndex = selectedVariantIndex;
    return {
      changedSlots: getChangedEquipmentTuneSlots(
        previousEquipment,
        simulator.simulatedEquipmentUpgrades,
      ),
    };
  }

  function removeSimulatorAction(selection = {}) {
    const adapter = getSimulatorActionAdapter(selection.applyType);
    if (!adapter?.remove) return null;
    const result = adapter.remove(selection);
    if (!result) return null;
    return result === true ? {} : result;
  }

  function finishActiveSimulatorSelectionRemoval(exclusiveGroupKey, selection, result = {}) {
    const simulator = state.dealerSimulator;
    delete simulator.activeSelectionByGroup[exclusiveGroupKey];
    simulator.totalGold = getDealerSimulatorTotalGold(simulator);
    simulator.selectedRecommendationId = '';
    simulator.lastChangedTarget = {
      targetTab: selection.targetTab,
      targetSlot: selection.targetSlot,
      applyType: selection.applyType,
    };
    state.enchantLoadoutTab = selection.targetTab || 'equipment';
    const changedSlots = Array.isArray(result.changedSlots) && result.changedSlots.length
      ? result.changedSlots
      : [selection.targetSlot];
    changedSlots.forEach(triggerDealerSimulatorSweep);
    if (['replaceCreatureArtifact', 'replaceBufferCreatureArtifact'].includes(selection.applyType)) {
      triggerDealerSimulatorSweep('크리쳐');
    }
    renderEnchantCharacterPortrait();
    renderEnchantTable();
  }

  function removeActiveOathAcquisitionRecommendation(recommendationId, targetGroupKey = '') {
    const simulator = state.dealerSimulator;
    const row = state.dealerSimulatorRecommendations.get(recommendationId);
    if (!simulator || simulator.applyingRecommendationId || (!row && !targetGroupKey)) return false;
    const activeEntries = getActiveOathAcquisitionSelectionEntries(simulator)
      .filter(({ selection }) => (
        selection?.applyType === 'acquireOathDecision'
        && (targetGroupKey
          ? selection.acquisitionTargetGroupKey === targetGroupKey
          : selection.acquisitionVariantGroupKey === row.variantGroupKey)
      ));
    const activeDescriptors = activeEntries
      .map(({ exclusiveGroupKey, selection }) => {
        const slotIndex = getOathAcquisitionSlotIndex(selection, exclusiveGroupKey);
        return {
          exclusiveGroupKey,
          entry: {
            ...cloneSimulatorValue(selection.targetDecision || {}),
            slotIndex,
          },
        };
      })
      .filter(({ entry }) => Number.isInteger(entry.slotIndex));
    const descriptors = (targetGroupKey || simulator.role === 'buffer') && activeDescriptors.length
      ? activeDescriptors
      : getOathAcquisitionSelectionDescriptors(row);
    const removalEntries = activeEntries.length
      ? activeEntries
      : descriptors
        .map((descriptor) => ({
          exclusiveGroupKey: descriptor.exclusiveGroupKey,
          selection: simulator.activeSelectionByGroup?.[descriptor.exclusiveGroupKey],
          parentSelection: null,
          depth: 0,
        }))
        .filter(({ selection }) => selection);
    if (!removalEntries.length) return false;
    const rollbackSnapshot = createSimulatorSnapshot();
    const previousOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    let activeOathTune = cloneSimulatorValue(simulator.activeSelectionByGroup?.oathTune || null);
    if (activeOathTune?.actionType === 'oathTunePlan') {
      simulator.simulatedOathUpgrades = cloneSimulatorValue(
        activeOathTune.beforeTuneSnapshot || simulator.baseOathUpgrades || {},
      );
      delete simulator.activeSelectionByGroup.oathTune;
      if (simulator.role === 'buffer') {
        delete simulator.oathTuneChangesBySource.oathTune;
      }
    }
    removalEntries
      .slice()
      .sort((a, b) => b.depth - a.depth)
      .forEach(({ exclusiveGroupKey, selection, parentSelection }) => {
        if (parentSelection) {
          parentSelection.replacedAcquisitionSelection = cloneSimulatorValue(
            selection.replacedAcquisitionSelection || null,
          );
        } else {
          restorePreviousOathAcquisitionSelection(
            simulator,
            exclusiveGroupKey,
            selection,
          );
        }
      });
    const hasActiveOathAcquisition = Object.keys(simulator.activeSelectionByGroup || {})
      .some((groupKey) => groupKey.startsWith('oathAcquire:'));
    if (!activeOathTune && !hasActiveOathAcquisition && simulator.suspendedOathTune) {
      simulator.simulatedOathUpgrades = cloneSimulatorValue(
        simulator.suspendedOathTune.selection?.beforeTuneSnapshot
          || simulator.suspendedOathTune.oathUpgrades
          || simulator.simulatedOathUpgrades,
      );
      activeOathTune = cloneSimulatorValue(simulator.suspendedOathTune.selection);
      simulator.suspendedOathTune = null;
    }
    if (activeOathTune && !reapplyOathTuneSelectionToCurrentState(activeOathTune)) {
      restoreSimulatorSnapshot(rollbackSnapshot);
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return false;
    }
    syncOathTuneStageDisplay(simulator.simulatedOathUpgrades, simulator.oathTuneDb);
    const restoredOathTune = simulator.activeSelectionByGroup.oathTune;
    state.tuneStepIndexBySource = {
      ...(state.tuneStepIndexBySource || {}),
      oathTune: Number(restoredOathTune?.selectedVariantIndex || 0),
    };
    if (simulator.role === 'buffer') {
      if (!syncBufferOathAcquisitionChanges()) {
        restoreSimulatorSnapshot(rollbackSnapshot);
        return false;
      }
      rebuildBufferSimulatorCalculationState();
    } else {
      rebuildDealerSimulatorCalculationState();
    }
    simulator.totalGold = getDealerSimulatorTotalGold(simulator);
    syncOathAcquisitionVariantIndexes(true);
    simulator.selectedRecommendationId = '';
    simulator.lastChangedTarget = {
      targetTab: 'oath',
      targetSlot: `oath:${descriptors[0]?.entry?.slotIndex ?? 0}`,
      applyType: 'acquireOathDecision',
    };
    state.enchantLoadoutTab = 'oath';
    getChangedOathTuneSlots(previousOath, simulator.simulatedOathUpgrades)
      .forEach(triggerDealerSimulatorSweep);
    renderEnchantCharacterPortrait();
    renderEnchantTable();
    return true;
  }

  function removeActiveSimulatorSelection(exclusiveGroupKey) {
    const simulator = state.dealerSimulator;
    if (!simulator || simulator.applyingRecommendationId || !exclusiveGroupKey) return;
    const selection = simulator.activeSelectionByGroup?.[exclusiveGroupKey];
    if (!selection) return;
    const snapshot = createSimulatorSnapshot();
    try {
      const result = removeSimulatorAction(selection);
      if (!result) {
        restoreSimulatorSnapshot(snapshot);
        return;
      }
      finishActiveSimulatorSelectionRemoval(exclusiveGroupKey, selection, result);
    } catch {
      restoreSimulatorSnapshot(snapshot);
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      setEnchantCharacterStatus('시뮬레이션 적용 해제에 실패했습니다.');
    }
  }

  function clearDealerSimulator() {
    const simulator = state.dealerSimulator;
    if (!simulator || simulator.applyingRecommendationId) return;
    Object.entries(SIMULATOR_LOADOUT_BASE_KEY_BY_STATE).forEach(([stateKey, baseKey]) => {
      if (baseKey in simulator) simulator[stateKey] = cloneSimulatorValue(simulator[baseKey]);
    });
    SIMULATOR_CHANGE_STATE_KEYS.forEach((key) => {
      if (key in simulator) simulator[key] = {};
    });
    if (simulator.role === 'buffer') simulator.currentBufferScore = simulator.baseBufferScore;
    else rebuildDealerSimulatorCalculationState();
    simulator.totalGold = 0;
    simulator.activeSelectionByGroup = {};
    simulator.suspendedOathTune = null;
    simulator.selectedRecommendationId = '';
    simulator.lastChangedTarget = null;
    simulator.activeSweepSlots.clear();
    state.tuneStepIndexBySource = {
      ...(state.tuneStepIndexBySource || {}),
      equipmentTune: 0,
      oathTune: 0,
    };
    state.oathDecisionVariantIndexByGroup = {};
    state.oathAcquisitionCombinedCountsByPair = {};
    state.lastRecommendationDisplayOrder = [];
    state.frozenRecommendationDisplayKey = '';
    state.frozenRecommendationDisplayIndex = -1;
    state.equipmentTuneStepIndex = 0;
    state.equipmentTunePopoverOpen = false;
    state.equipmentTunePopoverSource = '';
    state.enchantLoadoutTab = 'equipment';
    renderEnchantCharacterPortrait();
    renderEnchantTable();
  }

  function getLoadoutRarityClass(itemOrRarity) {
    const rarity = typeof itemOrRarity === 'string'
      ? itemOrRarity.trim()
      : String(itemOrRarity?.itemRarity || '').trim();
    if (rarity.includes('레어')) return 'is-rare';
    if (rarity.includes('태초')) return 'is-primeval';
    if (rarity.includes('에픽')) return 'is-epic';
    if (rarity.includes('레전더리')) return 'is-legendary';
    if (rarity.includes('유니크')) return 'is-unique';
    return '';
  }

  const {
    renderEnchantLoadoutTabs,
    bindEnchantLoadoutNavigation,
  } = createEnchantLoadoutNavigation({
    escapeHtml,
    getPortraitContainer: () => els.enchantCharacterPortrait,
    getActiveTab: () => state.enchantLoadoutTab,
    setActiveTab: (tab) => { state.enchantLoadoutTab = tab; },
    renderPortrait: renderEnchantCharacterPortrait,
  });

  const { bindOathSymbolFallback } = createEnchantOathSymbolFallback({
    getPortraitContainer: () => els.enchantCharacterPortrait,
  });

  const {
    bindEnchantPortraitDetailPanel,
    bindOathCrystalDetailPanel,
    bindAvatarSlotDetailPanel,
    bindBuffLoadoutDetailPanel,
  } = createEnchantPortraitDetailPanel({
    escapeHtml,
    getPortraitContainer: () => els.enchantCharacterPortrait,
  });

  const {
    renderDealerSimulatorActions,
    renderBufferSimulatorMeta,
    renderDealerSimulatorMeta,
  } = createEnchantSimulatorDisplay({
    escapeHtml,
    calculateBufferScore,
    getSimulatorCumulativeDamageMultiplier,
    formatCompactGold,
    formatKoreanGoldUnits,
    getDisplayContext: () => ({
      simulator: state.dealerSimulator,
      currentBufferBaseline: state.currentBufferBaseline,
      currentOfficialBufferScore: state.currentOfficialBufferScore,
      currentOfficialEquipmentScore: state.currentOfficialEquipmentScore,
      currentOfficialEquipmentScoreStatus: state.currentOfficialEquipmentScoreStatus,
      simulatorHintElement: els.enchantSimulatorHint,
      simulatorActionsElement: els.enchantSimulatorActions,
    }),
    bufferScoreIconUrl: BUFFER_SCORE_ICON_URL,
  });

  function renderEnchantCharacterPortrait() {
    if (!els.enchantCharacterPortrait) return;
    const character = state.enchantTargetCharacter;
    if (!character?.serverId || !character?.characterId) {
      els.enchantCharacterPortrait.innerHTML = '<div class="table-empty-cell">캐릭터 검색을 해주세요.</div>';
      return;
    }
    const activeTab = ['equipment', 'oath', 'avatar', 'buff'].includes(state.enchantLoadoutTab)
      ? state.enchantLoadoutTab
      : 'equipment';
    const loadoutMarkup = `
      <div class="supply-detail-portrait enchant-character-portrait">
        ${getCharacterPortraitMarkup(character, {
          zoom: 1,
          slotItemsHtml: activeTab === 'equipment' ? buildEnchantPortraitSlotMarkup() : '',
          cropHtml: activeTab === 'oath'
            ? renderOathLoadoutBoard()
            : activeTab === 'avatar'
              ? renderAvatarLoadoutBoard(character)
              : activeTab === 'buff'
                ? renderBuffLoadoutBoard()
              : '',
        })}
      </div>
    `;
    els.enchantCharacterPortrait.innerHTML = `
      ${renderEnchantLoadoutTabs(activeTab)}
      <div class="enchant-loadout-panel enchant-loadout-panel-${escapeHtml(activeTab)}">
        ${loadoutMarkup}
      </div>
    `;
    const characterName = els.enchantCharacterPortrait.querySelector('.enchant-character-portrait .character-name');
    if (activeTab === 'equipment' && characterName) {
      characterName.insertAdjacentHTML('beforeend', `
        <div class="enchant-portrait-detail-panel" data-enchant-portrait-detail>
          <div class="enchant-portrait-detail-title" data-enchant-portrait-detail-title>장비 상세</div>
          <div class="enchant-portrait-detail-body" data-enchant-portrait-detail-body>장비에 마우스를 올리면 상세 정보가 표시됩니다.</div>
        </div>
      `);
    } else if (activeTab === 'oath' && characterName) {
      characterName.insertAdjacentHTML('beforeend', `
        <div class="enchant-portrait-detail-panel" data-enchant-portrait-detail>
          <div class="enchant-portrait-detail-title" data-enchant-portrait-detail-title>서약 결정 상세</div>
          <div class="enchant-portrait-detail-body" data-enchant-portrait-detail-body>서약 결정에 마우스를 올리면 상세 정보가 표시됩니다.</div>
        </div>
      `);
    } else if (activeTab === 'avatar' && characterName) {
      characterName.insertAdjacentHTML('beforeend', `
        <div class="enchant-portrait-detail-panel enchant-portrait-detail-panel-avatar" data-enchant-portrait-detail>
          <div class="enchant-portrait-detail-title" data-enchant-portrait-detail-title>아바타 슬롯</div>
          <div class="enchant-portrait-detail-body" data-enchant-portrait-detail-body>클론 레어 아바타 기준 임시 표시입니다.</div>
        </div>
      `);
    } else if (activeTab === 'buff' && characterName) {
      characterName.insertAdjacentHTML('beforeend', `
        <div class="enchant-portrait-detail-panel" data-enchant-portrait-detail>
          <div class="enchant-portrait-detail-title" data-enchant-portrait-detail-title>버프강화 상세</div>
          <div class="enchant-portrait-detail-body" data-enchant-portrait-detail-body>버프강화 슬롯에 마우스를 올리면 상세 정보가 표시됩니다.</div>
        </div>
      `);
    }
    const meta = els.enchantCharacterPortrait.querySelector('.enchant-character-portrait .supply-detail-portrait-meta');
    if (state.currentBufferBaseline?.isBuffer) {
      if (meta) meta.innerHTML = renderBufferSimulatorMeta(meta.innerHTML);
    } else if (meta && state.currentBufferScoreStatus === 'loading') {
      meta.insertAdjacentHTML('afterbegin', `
        <div class="enchant-portrait-buffer-score">
          <strong tabindex="0" data-tooltip="계산 방식과 소수점 처리에 따라 실측 버프점수와 차이가 날 수 있습니다." title="버프점수 계산 중" aria-label="버프점수 계산 중"><img src="${escapeHtml(BUFFER_SCORE_ICON_URL)}" alt="" loading="lazy" decoding="async" />계산 중</strong>
        </div>
      `);
    } else if (meta) {
      meta.innerHTML = renderDealerSimulatorMeta(meta.innerHTML);
    }
    bindCharacterAvatars(els.enchantCharacterPortrait);
    if (activeTab === 'oath') {
      bindOathSymbolFallback();
      bindOathCrystalDetailPanel();
    } else if (activeTab === 'avatar') {
      bindAvatarSlotDetailPanel();
    } else if (activeTab === 'buff') {
      bindBuffLoadoutDetailPanel();
    } else if (activeTab === 'equipment') {
      bindEnchantPortraitDetailPanel();
    }
  }

  function getSelectedEnchantCharacter() {
    if (state.enchantTargetCharacter?.serverId && state.enchantTargetCharacter?.characterId) {
      return state.enchantTargetCharacter;
    }
    const selectedKey = els.selectedCharacter?.value || '';
    const results = Array.isArray(state.lastResults) ? state.lastResults : [];
    const activeCharacters = Array.isArray(state.activeCharacters) ? state.activeCharacters : [];
    return results.find((character) => character.key === selectedKey)
      || activeCharacters.find((character) => character.key === selectedKey)
      || results[0]
      || activeCharacters[0]
      || null;
  }

  function isLikelyBufferCharacter(character) {
    const jobGrowName = String(character?.jobGrowName || '').trim();
    return BUFFER_JOB_GROW_NAMES.has(jobGrowName);
  }

  function setEnchantCharacterStatus(text) {
    if (els.enchantCharacterStatus) {
      els.enchantCharacterStatus.textContent = text;
    }
  }

  function setEnchantPriceStatus(text, devText = text) {
    if (els.enchantStatus) {
      els.enchantStatus.textContent = state.isDevMode ? devText : text;
    }
  }

  function resetCurrentEnchantCharacterState() {
    resetDealerSimulator();
    state.currentEnchants = [];
    state.currentEquipmentUpgrades = [];
    state.currentOathUpgrades = null;
    state.enchantLoadoutTab = 'equipment';
    state.enchantSearchCandidates = [];
    state.currentOathTranscendRecommendations = [];
    state.currentOathCraftRecommendations = [];
    state.oathTuneStageDb = null;
    state.currentBlackFangRecommendations = [];
    state.currentRelicCraftRecommendations = [];
    state.upgradeExpectedDb = null;
    state.upgradeMaterialPrices = {};
    state.currentDamageBaseline = null;
    state.currentBufferBaseline = null;
    state.currentBufferSkillContexts = {};
    state.currentBufferScoreStatus = 'idle';
    state.currentOfficialEquipmentScore = null;
    state.currentOfficialEquipmentScoreStatus = 'idle';
    state.currentOfficialEquipmentScoreCharacterKey = '';
    state.currentOfficialBufferScore = null;
    state.currentOfficialBufferScoreStatus = 'idle';
    state.currentOfficialBufferScoreCharacterKey = '';
    state.currentCreature = null;
    state.currentTitle = null;
    state.currentAura = null;
    state.currentAvatar = null;
    state.currentBuffLoadout = null;
    state.switchingTitleRecommendations = [];
    state.switchingCreatureRecommendations = [];
    state.switchingFragmentRecommendations = [];
    state.currentEnchantCharacterKey = '';
    state.currentCreatureCharacterKey = '';
    state.currentTitleCharacterKey = '';
    state.currentAuraCharacterKey = '';
    state.currentAvatarCharacterKey = '';
    state.equipmentTuneStepIndex = 0;
    state.tuneStepIndexBySource = {};
    state.oathDecisionVariantIndexByGroup = {};
    state.oathAcquisitionCombinedCountsByPair = {};
    state.lastRecommendationDisplayOrder = [];
    state.frozenRecommendationDisplayKey = '';
    state.frozenRecommendationDisplayIndex = -1;
    state.equipmentTunePopoverOpen = false;
    state.equipmentTunePopoverSource = '';
  }

  function hasEnchantPriceRecommendationData() {
    return (
      state.enchantCards.length > 0
      || state.creatureUpgradeGroups.length > 0
      || state.creatureArtifactGroups.length > 0
      || state.titleUpgradeGroups.length > 0
      || state.switchingTitleRecommendations.length > 0
      || state.switchingCreatureRecommendations.length > 0
      || state.switchingFragmentRecommendations.length > 0
      || state.currentOathTranscendRecommendations.length > 0
      || state.currentOathCraftRecommendations.length > 0
      || state.currentRelicCraftRecommendations.length > 0
      || state.auraUpgradeGroups.length > 0
    );
  }

  const {
    getEnchantNowMs,
    beginEnchantTiming,
    recordEnchantTimingStep,
    flushEnchantTiming,
  } = createEnchantDevelopmentTiming({
    getIsDevMode: () => state.isDevMode,
    getTiming: () => state.enchantTiming,
    setTiming: (timing) => {
      state.enchantTiming = timing;
    },
    now: () => {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
      }
      return Date.now();
    },
    setLastSummary: (summary) => {
      globalThis.__enchantTimingLast = summary;
    },
    logInfo: (...args) => console.info(...args),
  });

  function isTitleRouteAllowed(row) {
    if (row?.sourceType !== 'title') return true;
    const beadIncluded = els.enchantTitleBeadOnlyToggle?.checked !== false;
    if (beadIncluded) return row.purchaseRoute !== 'cleanTitle';
    return row.purchaseRoute === 'cleanTitle';
  }

  function renderEnchantTable() {
    if (state.enchantRecommendationLoading) {
      if (state.enchantSearchMode === 'candidate') {
        showEnchantCandidateLoading();
      } else {
        showEnchantAnalysisLoading();
      }
      return;
    }
    syncDealerSimulatorMaterialCostState();
    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    const activeDamageBaseline = getActiveDamageBaseline();
    const renderStartedAt = getEnchantNowMs();
    const allRows = [
      ...getCardRows(state.enchantCards),
      ...getCreatureRows(state.creatureUpgradeGroups),
      ...getCreatureArtifactRows(state.creatureArtifactGroups),
      ...getTitleRows(state.titleUpgradeGroups, state.currentTitle),
      ...getSwitchingTitleRows(state.switchingTitleRecommendations),
      ...getSwitchingCreatureRows(state.switchingCreatureRecommendations),
      ...getSwitchingFragmentRows(state.switchingFragmentRecommendations),
      ...getAuraRows(state.auraUpgradeGroups),
      ...getAvatarRows(state.currentAvatar),
      ...getUpgradeRows(
        getActiveEquipmentUpgrades(),
        state.upgradeExpectedDb,
        activeDamageBaseline,
        state.currentBufferBaseline,
        els.safeAmplificationModeSelect?.value === 'event',
        state.upgradeMaterialPrices,
      ),
      ...getEquipmentTuneRows(state.currentEquipmentUpgrades, state.upgradeMaterialPrices, state.currentBufferBaseline),
      ...getOathTuneRows(getOathTuneRecommendationUpgrades(), state.oathTuneStageDb, state.upgradeMaterialPrices, getActiveEquipmentUpgrades(), state.currentBufferBaseline),
      ...getOathTranscendRows(state.currentOathTranscendRecommendations, state.upgradeMaterialPrices),
      ...getOathTranscendRows(state.currentOathCraftRecommendations, state.upgradeMaterialPrices, 'oathCraft'),
      ...getBlackFangRows(state.currentBlackFangRecommendations),
      ...getRelicCraftRows(
        state.currentRelicCraftRecommendations,
        getActiveEquipmentUpgrades(),
      ),
    ].map((row) => adaptBuffEnhancementRecommendation(row, state.dealerSimulator));
    renderEnchantFilters(allRows);

    const slotFilter = els.enchantSlotFilter?.value || 'all';
    const tierFilter = els.enchantTierFilter?.value || 'all';
    const includeTiers = getSelectedEnchantIncludeTiers();
    const isBuffer = Boolean(state.currentBufferBaseline?.isBuffer);
    const rows = allRows
      .filter((row) => (
        isBuffer
          ? (
            (row.sourceType === 'enchant' && row.role === 'buffer') ||
            ['creature', 'creatureArtifact', 'title', 'switchingTitle', 'switchingCreature', 'switchingFragment', 'aura', 'avatar', 'upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'blackFang', 'relicCraft'].includes(row.sourceType)
          )
          : row.sourceType !== 'enchant' || row.role !== 'buffer'
      ))
      .filter((row) => slotFilter === 'all' || row.slot === slotFilter)
      .filter((row) => tierFilter === 'all' || row.tier === tierFilter)
      .filter((row) => getEnchantIncludeGroups(row).every((key) => isEnchantIncludeKeySelected(key, includeTiers)))
      .filter(isTitleRouteAllowed)
      .sort(sortByPriceAsc);

    renderEnchantRecommendations(rows, allRows, includeMaterialCosts);
    showEnchantAnalysisResults();
    recordEnchantTimingStep('renderEnchantTable', renderStartedAt, {
      rows: rows.length,
      allRows: allRows.length,
    });
  }

  const {
    scheduleFitEnchantRecommendTitles,
    scheduleRecommendPopoverShift,
    scheduleOpenTunePopoverShift,
    resetRecommendPopoverShift,
    isLeavingRecommendPopoverHost,
  } = createEnchantRecommendationLayout({
    getRecommendList: () => els.enchantRecommendList,
  });

  function applyDealerSimulatorRecommendationEligibility(recommendations, dealerSimulator) {
    if (dealerSimulator && !dealerSimulator.baseEligibleEnchantCandidateSignatures.length) {
      dealerSimulator.baseEligibleEnchantCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'enchant')
        .map(getEnchantCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleAuraCandidateSignatures.length) {
      dealerSimulator.baseEligibleAuraCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'aura')
        .map(getAuraCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleCreatureCandidateSignatures.length) {
      dealerSimulator.baseEligibleCreatureCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'creature')
        .map(getCreatureCandidateSignature)
        .filter(Boolean);
    }
    if (dealerSimulator && !dealerSimulator.baseEligibleTitleCandidateSignatures.length) {
      dealerSimulator.baseEligibleTitleCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'title')
        .map(getTitleCandidateSignature)
        .filter(Boolean);
    }
    const eligibleTitleSignatures = new Set(dealerSimulator?.baseEligibleTitleCandidateSignatures || []);
    if (dealerSimulator && Object.keys(dealerSimulator.activeSelectionByGroup || {}).length && eligibleTitleSignatures.size) {
      recommendations = recommendations.filter((row) => (
        row.sourceType !== 'title' || eligibleTitleSignatures.has(getTitleCandidateSignature(row))
      ));
    }
    return recommendations;
  }

  function decorateEnchantRecommendationApplicationState(recommendations, simulator) {
    return recommendations.map((row) => {
      const isCombinedOathAcquisition = row.sourceType === 'oathAcquisitionCombined';
      const exclusiveGroupKey = isCombinedOathAcquisition
        ? `oathAcquisitionCombined:${row.oathAcquisitionPairKey}`
        : getSimulatorExclusiveGroupKey(row);
      const candidateSignature = isCombinedOathAcquisition
        ? `${exclusiveGroupKey}:${Number(row.transcendCount || 0)}:${Number(row.craftCount || 0)}`
        : getSimulatorCandidateSignature(row);
      const oathAcquisitionDescriptors = getOathAcquisitionSelectionDescriptors(row);
      const activeCombinedCounts = isCombinedOathAcquisition
        ? getActiveOathAcquisitionMethodCounts(
          simulator,
          [
            ...(row.transcendRecommendations || [row.transcendRecommendation]),
            ...(row.craftRecommendations || [row.craftRecommendation]),
          ].filter(Boolean),
        )
        : null;
      const activeSelection = exclusiveGroupKey
        ? simulator?.activeSelectionByGroup?.[exclusiveGroupKey]
        : null;
      const isAppliedBufferUpgrade = Boolean(
        simulator?.role === 'buffer'
        && row.sourceType === 'upgrade'
        && activeSelection?.applyType === 'replaceBufferEquipmentProgression'
        && activeSelection.progressionType === getEquipmentProgressionType(row)
        && Number(activeSelection.targetLevel) === Number(row.targetLevel),
      );
      const isApplied = isCombinedOathAcquisition
        ? activeCombinedCounts.transcend + activeCombinedCounts.craft > 0
          && activeCombinedCounts.transcend === Number(row.transcendCount || 0)
          && activeCombinedCounts.craft === Number(row.craftCount || 0)
        : oathAcquisitionDescriptors.length
        ? isAppliedOathAcquisitionRecommendation(row, simulator)
        : isAppliedBufferUpgrade || Boolean(
          exclusiveGroupKey &&
          candidateSignature &&
          activeSelection?.candidateSignature === candidateSignature
        );
      return {
        ...row,
        isApplied,
        exclusiveGroupKey,
        candidateSignature,
      };
    });
  }

  function getRecommendationDisplayOrderKey(row = {}) {
    if (row.sourceType === 'oathAcquisitionCombined') {
      return `oathCombined:${row.oathAcquisitionPairKey}`;
    }
    if (TUNE_SOURCE_TYPES.has(row.sourceType)) return `tune:${row.sourceType}`;
    if (OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType) && row.variantGroupKey) {
      return `oathDecision:${row.variantGroupKey}`;
    }
    return getDealerSimulatorRecommendationId(row);
  }

  function orderEnchantRecommendationDisplay(recommendations) {
    let displayRecommendations = state.currentBufferBaseline?.isBuffer
      ? recommendations.sort(compareBufferRecommendationOrder)
      : recommendations.sort(compareDealerRecommendationOrder);
    if (state.equipmentTunePopoverOpen && state.frozenRecommendationDisplayKey) {
      const frozenRowIndex = displayRecommendations.findIndex(
        (row) => getRecommendationDisplayOrderKey(row) === state.frozenRecommendationDisplayKey,
      );
      if (frozenRowIndex >= 0) {
        const [frozenRow] = displayRecommendations.splice(frozenRowIndex, 1);
        const targetIndex = Math.max(
          0,
          Math.min(
            displayRecommendations.length,
            Number(state.frozenRecommendationDisplayIndex || 0),
          ),
        );
        displayRecommendations.splice(targetIndex, 0, frozenRow);
      }
    }
    state.lastRecommendationDisplayOrder = displayRecommendations.map(
      getRecommendationDisplayOrderKey,
    );
    return displayRecommendations;
  }

  function freezeRecommendationOrderWhileEditing(sourceType = '') {
    if (state.frozenRecommendationDisplayKey) return;
    const candidateKeys = [
      `tune:${sourceType}`,
      `oathCombined:${sourceType}`,
      `oathDecision:${sourceType}`,
    ];
    const displayOrder = state.lastRecommendationDisplayOrder || [];
    const key = candidateKeys.find((candidate) => displayOrder.includes(candidate)) || '';
    if (!key) return;
    state.frozenRecommendationDisplayKey = key;
    state.frozenRecommendationDisplayIndex = displayOrder.indexOf(key);
  }

  function releaseRecommendationOrderAfterEditing() {
    state.frozenRecommendationDisplayKey = '';
    state.frozenRecommendationDisplayIndex = -1;
  }

  function renderEnchantRecommendations(rows = getCardRows(state.enchantCards), allRows = rows, includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true) {
    if (!els.enchantRecommendList) return;
    renderDealerSimulatorActions();
    const simulator = getActiveSimulator();
    const dealerSimulator = simulator?.role === 'dealer' ? simulator : null;
    if (simulator) syncOathAcquisitionVariantIndexes();
    const activeEnchants = getActiveEnchants();
    const activeDamageBaseline = getActiveDamageBaseline();
    const simulatorRecommendationContext = state.currentBufferBaseline?.isBuffer
      ? { rows, options: null }
      : getDealerSimulatorRecommendationContext(rows);
    let recommendations = state.currentBufferBaseline?.isBuffer
      ? getBufferRecommendationRows(
        rows,
        state.currentEnchants,
        state.currentCreature,
        state.currentTitle,
        state.currentAura,
        simulator?.role === 'buffer' ? simulator.baseBaseline : state.currentBufferBaseline,
        includeMaterialCosts,
        simulator,
      )
      : getRepresentativeRecommendationRows(
        simulatorRecommendationContext.rows,
        activeEnchants,
        getActiveCreatureWithArtifacts(),
        getActiveTitle(),
        getActiveAura(),
        activeDamageBaseline,
        includeMaterialCosts,
        simulatorRecommendationContext.options,
        getActiveCreature(),
      );
    if (simulator) recommendations = mergeAppliedSimulatorSnapshots(recommendations, simulator);
    recommendations = collapseOathDecisionRecommendationVariants(
      recommendations,
      state.oathDecisionVariantIndexByGroup,
    );
    if (simulator) {
      recommendations = mergeAppliedOathAcquisitionSnapshots(recommendations, simulator);
    }
    recommendations = combineOathAcquisitionRecommendationRows(
      recommendations,
      simulator || {},
      state.oathAcquisitionCombinedCountsByPair,
      includeMaterialCosts,
      state.currentBufferBaseline?.isBuffer === true && simulator?.role !== 'buffer',
    );
    recommendations = recommendations.map((row) => (
      TUNE_SOURCE_TYPES.has(row.sourceType)
        ? applyEquipmentTuneDisplayStep(
          row,
          getTuneStepIndexBySource(state, row.sourceType),
          includeMaterialCosts,
          activeDamageBaseline,
          state.currentBufferBaseline,
          simulator?.role === 'buffer' ? simulator : null,
        )
        : row
    ));
    recommendations = applyDealerSimulatorRecommendationEligibility(recommendations, dealerSimulator);
    if (dealerSimulator) {
      const equipmentTuneStepIndex = getTuneStepIndexBySource(state, 'equipmentTune');
      recommendations = recommendations.map((row) => (
        row.sourceType === 'equipmentTune'
          ? applyEquipmentTuneDisplayStep(
            row,
            equipmentTuneStepIndex,
            includeMaterialCosts,
            activeDamageBaseline,
            state.currentBufferBaseline,
            null,
          )
          : row
      ));
    }
    const decoratedRecommendations = decorateEnchantRecommendationApplicationState(recommendations, simulator);
    let displayRecommendations = orderEnchantRecommendationDisplay(decoratedRecommendations);
    state.dealerSimulatorRecommendations = new Map();
    state.renderedOathAcquisitionCombinedRows = new Map();
    renderEfficiencyLegend(recommendations);
    if (!displayRecommendations.length) {
      els.enchantRecommendList.innerHTML = '<div class="table-empty-cell">현재 세팅보다 높은 후보가 없거나 가격을 찾지 못했습니다.</div>';
      return;
    }

    els.enchantRecommendList.innerHTML = displayRecommendations.map((row, index) => {
      const isApplied = row.isApplied === true;
      const isCombinedOathAcquisition = row.sourceType === 'oathAcquisitionCombined';
      const isCombinedPreviewOnly = isCombinedOathAcquisition && row.previewOnly === true;
      if (isCombinedOathAcquisition) {
        state.renderedOathAcquisitionCombinedRows.set(row.oathAcquisitionPairKey, row);
      }
      const hasOathDecisionVariants = OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
        && Array.isArray(row.oathDecisionVariants)
        && row.oathDecisionVariants.length > 1;
      const hasVariantActions = TUNE_SOURCE_TYPES.has(row.sourceType)
        || hasOathDecisionVariants
        || isCombinedOathAcquisition;
      const variantPopoverSource = isCombinedOathAcquisition
        ? row.oathAcquisitionPairKey
        : hasOathDecisionVariants ? row.variantGroupKey : row.sourceType;
      const tuneStepIndex = TUNE_SOURCE_TYPES.has(row.sourceType)
        ? getTuneStepIndexBySource(state, row.sourceType)
        : state.equipmentTuneStepIndex;
      if (!isApplied || TUNE_SOURCE_TYPES.has(row.sourceType)) {
        row = applyEquipmentTuneDisplayStep(
          row,
          tuneStepIndex,
          includeMaterialCosts,
          activeDamageBaseline,
          state.currentBufferBaseline,
          simulator?.role === 'buffer' ? simulator : null,
        );
      }
      const simulatorTarget = isCombinedOathAcquisition
        ? simulator && !isCombinedPreviewOnly
          && Number(row.transcendCount || 0) + Number(row.craftCount || 0) > 0
          && !isApplied
          ? { applyType: 'proxyOathAcquisitionCombined' }
          : null
        : isApplied ? null : resolveActiveSimulatorTarget(row);
      const oathAcquisitionRecommendationId = simulator && OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
        ? getDealerSimulatorRecommendationId(row)
        : '';
      const combinedRecommendationId = simulator && isCombinedOathAcquisition && !isCombinedPreviewOnly
        ? `oath-combined:${row.oathAcquisitionPairKey}:${Number(row.transcendCount || 0)}:${Number(row.craftCount || 0)}`
        : '';
      const simulatorRecommendationId = combinedRecommendationId || (simulatorTarget
        ? getDealerSimulatorRecommendationId(row)
        : oathAcquisitionRecommendationId);
      const appliedSelectionId = isApplied
        ? isCombinedOathAcquisition
          ? `applied-oath-combined:${row.oathAcquisitionPairKey}`
          : oathAcquisitionRecommendationId
          ? `applied-oath:${oathAcquisitionRecommendationId}`
          : `applied:${row.exclusiveGroupKey}`
        : '';
      const simulatorSelectionId = appliedSelectionId || simulatorRecommendationId;
      const simulatorSelected = simulatorSelectionId && simulator?.selectedRecommendationId === simulatorSelectionId;
      const isBufferMetric = row.metricType === 'buffer';
      const materialAcquisition = isMaterialAcquisition(row);
      const band = materialAcquisition
        ? 'scale'
        : isBufferMetric
        ? getBufferEfficiencyBand(row.buffCostPerHundredPoints)
        : getEfficiencyBand(row.costPerPointOnePercent);
      const bandColor = band === 'rainbow'
        ? ''
        : materialAcquisition
          ? (isBufferMetric ? BUFFER_EFFICIENCY_COLOR_STOPS : DAMAGE_EFFICIENCY_COLOR_STOPS)[0].color
        : isBufferMetric
          ? getBufferEfficiencyColor(row.buffCostPerHundredPoints)
          : getEfficiencyColor(row.costPerPointOnePercent);
      const bandStyle = bandColor ? ` style="--enchant-band: ${escapeHtml(bandColor)}"` : '';
      const previousRow = displayRecommendations[index - 1] || null;
      const connector = previousRow
        ? `<span class="enchant-recommend-connector" style="background: ${escapeHtml(materialAcquisition || isMaterialAcquisition(previousRow) ? (isBufferMetric ? BUFFER_EFFICIENCY_COLOR_STOPS : DAMAGE_EFFICIENCY_COLOR_STOPS)[0].color : isBufferMetric ? getBufferArrowBackground(previousRow.buffCostPerHundredPoints, row.buffCostPerHundredPoints) : getArrowBackground(previousRow.costPerPointOnePercent, row.costPerPointOnePercent))};" aria-hidden="true"></span>`
        : '<span class="enchant-recommend-connector enchant-recommend-connector-spacer" aria-hidden="true"></span>';
      const hasUpgradeWarning = hasHigherEnchantCandidate(row, recommendations);
      if (simulatorRecommendationId) {
        state.dealerSimulatorRecommendations.set(simulatorRecommendationId, {
          ...row,
          simulatorHasUpgradeWarning: hasUpgradeWarning,
        });
      }
      if (simulator && isCombinedOathAcquisition) {
        [
          ...(row.transcendRecommendations || [row.transcendRecommendation]),
          ...(row.craftRecommendations || [row.craftRecommendation]),
        ].filter(Boolean).forEach((recommendation) => {
          getOathAcquisitionVariantRows(recommendation).forEach((variant) => {
            state.dealerSimulatorRecommendations.set(getDealerSimulatorRecommendationId(variant), variant);
          });
        });
      }
      const isTitleBeadOnly = row.sourceType === 'title' && row.purchaseRoute === 'titleBeadOnly';
      const showOptionText = !['creature', 'title', 'switchingTitle', 'switchingCreature', 'switchingFragment', 'aura', 'creatureArtifact'].includes(row.sourceType);
      const displayEffects = row.sourceType === 'avatar'
        ? row.kind === 'switchingAvatar'
          ? {}
          : Object.fromEntries(Object.entries(row.effects || {}).filter(([key]) => key !== 'skillDamageMultiplier'))
        : row.effects;
      const baseEffectText = row.sourceType === 'upgrade'
        ? formatUpgradeEffect(row)
        : row.sourceType === 'equipmentTune'
          ? formatEquipmentTuneEffect(row)
        : row.sourceType === 'oathTune'
          ? formatOathTuneEffect(row)
        : row.sourceType === 'oathTranscend'
          || row.sourceType === 'oathCraft'
          || row.sourceType === 'oathAcquisitionCombined'
          ? formatOathTranscendEffect(row, isBufferMetric, row.sourceType === 'oathAcquisitionCombined')
        : row.sourceType === 'blackFang'
          ? formatBlackFangEffect(row, isBufferMetric)
        : row.sourceType === 'relicCraft'
          ? formatBlackFangEffect(row, isBufferMetric)
        : row.sourceType === 'enchant'
          ? formatEnchantTransitionEffect(row, isBufferMetric, activeDamageBaseline)
        : row.sourceType === 'creatureArtifact'
          ? formatEnchantTransitionEffect(row)
        : isTitleBeadOnly
          ? formatTitleBeadTransitionEffect(row, isBufferMetric)
        : showOptionText ? formatEffects(displayEffects) : '';
      const bufferSkillEffectText = isBufferMetric
        ? [
          row.bufferSkillDelta?.primaryLevels
            ? `패시브 ${row.bufferSkillDelta.primaryLevels > 0 ? '+' : ''}${row.bufferSkillDelta.primaryLevels}Lv`
            : '',
          row.bufferSkillDelta?.auraLevels
            ? `오라 패시브 ${row.bufferSkillDelta.auraLevels > 0 ? '+' : ''}${row.bufferSkillDelta.auraLevels}Lv`
            : '',
        ].filter(Boolean).join(' / ')
        : '';
      const effectText = [baseEffectText, bufferSkillEffectText].filter(Boolean).join(' / ');
      const effectHtml = row.sourceType === 'equipmentTune'
        ? formatEquipmentTuneEffectHtml(row, escapeHtml)
        : row.sourceType === 'oathTune'
          ? formatOathTuneEffectHtml(row, escapeHtml)
        : row.sourceType === 'oathTranscend'
          || row.sourceType === 'oathCraft'
          || row.sourceType === 'oathAcquisitionCombined'
          ? formatOathTranscendEffectHtml(row, isBufferMetric, escapeHtml, row.sourceType === 'oathAcquisitionCombined')
        : '';
      const titleElementLabel = row.sourceType === 'title' && row.titleEnchantElement
        ? ELEMENT_LABEL_BY_NAME[row.titleEnchantElement] || row.titleEnchantElement
        : '';
      const titleRouteLabel = row.sourceType === 'title'
        ? formatTitlePurchaseRouteLabel(row)
        : row.sourceType === 'switchingTitle'
          ? row.purchaseRouteLabel || (row.buffSkillName && row.enchantBuffSkillLevelDelta ? `[${row.buffSkillName} +${row.enchantBuffSkillLevelDelta}Lv]` : '')
        : row.sourceType === 'switchingCreature'
          ? isFreeActionRecommendation(row) ? '' : row.purchaseRouteLabel || ''
        : row.sourceType === 'switchingFragment'
          ? row.purchaseRouteLabel || ''
        : '';
      const tierLabel = row.sourceType === 'title'
        ? row.purchaseRoute === 'titleBeadOnly'
          ? '보주'
          : row.tier === '플래티넘' ? '플래티넘' : '일반'
        : row.sourceType === 'oathTranscend'
          ? '초월'
        : row.sourceType === 'oathCraft'
          ? '정가'
        : row.sourceType === 'oathAcquisitionCombined'
          ? '초월/정가'
        : row.sourceType === 'relicCraft'
          ? row.cardSubtitle || '마법석'
        : row.tier || '';
      const displayName = row.sourceType === 'title'
        ? row.priceItem?.itemName || formatLevelOptionName(row.candidateName || row.itemName, Number(row.levelTag || 0))
        : TUNE_SOURCE_TYPES.has(row.sourceType)
          ? `${row.sourceType === 'oathTune' ? '서약 조율' : '장비 조율'} ${Number(row.tuneCount || 0).toLocaleString('ko-KR')}회`
        : row.sourceType === 'switchingTitle'
          ? row.itemName
        : row.sourceType === 'switchingCreature'
          ? row.itemName
        : row.sourceType === 'switchingFragment'
          ? row.itemName
        : row.sourceType === 'creature'
          ? row.priceItem?.itemName || formatLevelOptionName(row.candidateName || row.itemName, Number(row.levelTag || 0) || (row.tier === '플래티넘'))
        : row.sourceType === 'creatureArtifact'
            ? row.candidateName || row.itemName
          : row.sourceType === 'oathAcquisitionCombined'
            ? `${row.targetRarity || row.itemRarity || ''} 서약 결정 ${Number(row.variantCount || 0)}개`.trim()
          : row.sourceType === 'aura'
            ? row.priceItem?.itemName || row.candidateName || row.itemName
            : row.sourceType === 'avatar'
              ? `${row.itemName}${row.needCount > 1 ? ` x${row.needCount}` : ''}`
            : row.itemName;
      const displayTitle = TUNE_SOURCE_TYPES.has(row.sourceType)
        ? row.sourceType === 'oathTune' ? '서약 조율' : '장비 조율'
        : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
          ? '서약 결정'
        : row.sourceType === 'oathAcquisitionCombined'
          ? '서약 결정'
        : row.sourceType === 'relicCraft'
          ? row.cardTitle || '유물 제작'
        : row.slot;
      const acquisitionLabel = getAcquisitionLabel(row.acquisition);
      const isMaterialEnchant = isMaterialEnchantRecommendation(row);
      const legacyAcquisitionLabel = isMaterialEnchant ? '' : acquisitionLabel;
      const acquisitionMarkup = legacyAcquisitionLabel || isMaterialEnchant ? getAcquisitionMarkup(row.acquisition, escapeHtml) : '';
      const materialParts = ['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)
        ? getUpgradeMaterialParts(row.expectedMaterials, row.upgradeMode)
        : isMaterialEnchant
          ? getMaterialEnchantMaterialParts(row)
        : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
          ? getBlackFangMaterialParts(row.materials)
        : isEquipmentBodyReplacementSource(row)
          ? getBlackFangMaterialParts(row.materials)
          : [];
      const rowGold = getRecommendationGold(row, includeMaterialCosts);
      const rowGoldText = isFreeActionRecommendation(row) ? '0 골드' : formatGold(rowGold);
      const priceLabel = isFreeActionRecommendation(row)
        ? '비용'
        : includeMaterialCosts && ['upgrade', 'blackFang', 'relicCraft', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'oathAcquisitionCombined'].includes(row.sourceType)
        ? '재료 포함'
        : ['upgrade', 'blackFang', 'relicCraft', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'oathAcquisitionCombined'].includes(row.sourceType) ? '예상 골드' : '최저가';
      const materialPartsLabel = row.sourceType === 'upgrade' ? '예상 재료' : '필요 재료';
      const materialPartsMarkup = materialParts.length
        ? `<span class="enchant-popover-material-label">${materialPartsLabel}</span>${materialParts
          .map((part) => `<span class="enchant-popover-material-part" title="${escapeHtml(part.label)}">${part.iconUrl ? `<img src="${escapeHtml(part.iconUrl)}" alt="${escapeHtml(part.label)}" loading="lazy" />` : ''}<span>${escapeHtml(part.amount)}</span></span>`)
          .join('')}`
        : '';
      const formatCombinedAcquisitionMaterials = (label, variant) => {
        if (!variant) return '';
        const parts = getBlackFangMaterialParts(variant.materials || []);
        if (!parts.length) return '';
        return `<span class="enchant-oath-combined-material-group">
          <strong>${escapeHtml(label)}</strong>
          <span class="enchant-popover-material-list">${parts
            .map((part) => `<span class="enchant-popover-material-part" title="${escapeHtml(part.label)}">${part.iconUrl ? `<img src="${escapeHtml(part.iconUrl)}" alt="${escapeHtml(part.label)}" loading="lazy" />` : ''}<span>${escapeHtml(part.amount)}</span></span>`)
            .join('')}</span>
        </span>`;
      };
      const combinedAcquisitionMaterialsMarkup = isCombinedOathAcquisition
        ? `<span class="enchant-popover-material-label">필요 재료</span>${[
          formatCombinedAcquisitionMaterials('초월', row.transcendVariant),
          formatCombinedAcquisitionMaterials('정가', row.craftVariant),
        ].filter(Boolean).join('')}`
        : '';
      const combinedAcquisitionControls = isCombinedOathAcquisition
        ? `<span class="enchant-oath-combined-controls">
          ${[
            ['transcend', '초월', Number(row.transcendCount || 0)],
            ['craft', '정가', Number(row.craftCount || 0)],
          ].map(([method, label, count]) => `<span class="enchant-oath-combined-control">
            <strong>${label}</strong>
            <span class="enchant-oath-combined-control-row">
              <span class="enchant-tune-step-button${count <= 0 ? ' is-disabled' : ''}" role="button" tabindex="0" data-oath-combined-step="-1" data-oath-combined-method="${method}" data-oath-combined-pair="${escapeHtml(row.oathAcquisitionPairKey)}" aria-label="${label} 개수 줄이기">-</span>
              <span class="enchant-tune-step-label">${count} / ${Number(row.maxDecisionCount || 0)}</span>
              <span class="enchant-tune-step-button${count >= Number(row.maxDecisionCount || 0) ? ' is-disabled' : ''}" role="button" tabindex="0" data-oath-combined-step="1" data-oath-combined-method="${method}" data-oath-combined-pair="${escapeHtml(row.oathAcquisitionPairKey)}" aria-label="${label} 개수 늘리기">+</span>
            </span>
          </span>`).join('')}
        </span>`
        : '';
      const tuneStepControls = combinedAcquisitionControls || (TUNE_SOURCE_TYPES.has(row.sourceType) && Array.isArray(row.tuneSteps) && row.tuneSteps.length > 1
        ? `<span class="enchant-tune-step-controls">
            <span class="enchant-tune-step-button${row.selectedTuneStepIndex <= 0 ? ' is-disabled' : ''}" role="button" tabindex="0" data-equipment-tune-step="-1" data-tune-source="${escapeHtml(row.sourceType)}" aria-label="이전 조율 단계">-</span>
            <span class="enchant-tune-step-label">${Number(row.selectedTuneStepIndex || 0) + 1} / ${row.tuneSteps.length}</span>
            <span class="enchant-tune-step-button${row.selectedTuneStepIndex >= row.tuneSteps.length - 1 ? ' is-disabled' : ''}" role="button" tabindex="0" data-equipment-tune-step="1" data-tune-source="${escapeHtml(row.sourceType)}" aria-label="다음 조율 단계">+</span>
          </span>`
        : hasOathDecisionVariants
          ? `<span class="enchant-tune-step-controls">
            <span class="enchant-tune-step-button${row.selectedVariantIndex <= 0 ? ' is-disabled' : ''}" role="button" tabindex="0" data-recommendation-variant-step="-1" data-variant-group="${escapeHtml(row.variantGroupKey)}" data-variant-max="${row.oathDecisionVariants.length - 1}" aria-label="이전 적용 개수">-</span>
            <span class="enchant-tune-step-label">${Number(row.variantCount || 1)} / ${row.oathDecisionVariants.length}</span>
            <span class="enchant-tune-step-button${row.selectedVariantIndex >= row.oathDecisionVariants.length - 1 ? ' is-disabled' : ''}" role="button" tabindex="0" data-recommendation-variant-step="1" data-variant-group="${escapeHtml(row.variantGroupKey)}" data-variant-max="${row.oathDecisionVariants.length - 1}" aria-label="다음 적용 개수">+</span>
          </span>`
        : '');
      const popoverName = row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
        ? [displayName, tierLabel].filter(Boolean).join(' ')
        : displayName;
      const itemExplainText = row.sourceType === 'oathAcquisitionCombined'
        ? ''
        : showOptionText || ['switchingTitle', 'switchingCreature', 'switchingFragment'].includes(row.sourceType) ? row.itemExplain : '';
      const itemExplainHtml = String(itemExplainText || '').includes('\n')
        ? String(itemExplainText || '').split('\n').map((part) => escapeHtml(part)).join('<br>')
        : '';
      const tooltipRows = [
        { text: popoverName, className: 'enchant-popover-name' },
        { text: titleRouteLabel, className: 'enchant-popover-muted' },
        itemExplainHtml
          ? { html: itemExplainHtml, className: 'enchant-popover-muted' }
          : { text: itemExplainText, className: 'enchant-popover-muted' },
        effectHtml
          ? { html: effectHtml, className: 'enchant-popover-effect' }
          : { text: effectText, className: 'enchant-popover-effect' },
        { text: row.priceWarningText ? `⚠ ${row.priceWarningText}` : '', className: 'enchant-recommend-warning' },
        { text: legacyAcquisitionLabel ? '재료 구매' : '', className: 'enchant-popover-label' },
        { text: legacyAcquisitionLabel, className: 'enchant-popover-material' },
        { text: legacyAcquisitionLabel || isMaterialEnchant ? '' : `${priceLabel} ${rowGoldText}`, className: 'enchant-popover-price' },
        { html: materialPartsMarkup, className: 'enchant-popover-material enchant-popover-material-list' },
        { html: combinedAcquisitionMaterialsMarkup, className: 'enchant-popover-material enchant-oath-combined-materials' },
        { text: !isCombinedOathAcquisition && !materialPartsMarkup && row.materialText ? `필요 재료 ${row.materialText}` : '', className: 'enchant-popover-material' },
        { text: isBufferMetric ? `${row.sourceType === 'equipmentTune' ? '버프점수' : '교체 시 버프점수'} ${Number(row.incrementalBuffScore || 0) > 0 ? '+' : ''}${Math.round(row.incrementalBuffScore).toLocaleString('ko-KR')}점` : `${TUNE_SOURCE_TYPES.has(row.sourceType) ? '딜 상승' : '교체 상승'} ${formatPercent(row.incrementalDamagePercent)}`, className: 'enchant-popover-gain' },
        { text: isBufferMetric ? `버프점수 ${Math.round(row.currentBufferScore).toLocaleString('ko-KR')} → ${Math.round(row.candidateBufferScore).toLocaleString('ko-KR')}` : '', className: 'enchant-popover-muted' },
        { text: legacyAcquisitionLabel || isMaterialEnchant ? '' : isBufferMetric ? `버프점수 100점당 ${isFreeActionRecommendation(row) ? '0 골드' : formatGold(row.buffCostPerHundredPoints)}` : `딜 0.1%당 ${isFreeActionRecommendation(row) ? '0 골드' : formatGold(row.costPerPointOnePercent)}`, className: 'enchant-popover-cost' },
        { html: tuneStepControls, className: 'enchant-popover-tune-controls' },
        { text: isApplied ? '한 번 더 눌러 시뮬레이터 적용 해제' : '', className: 'enchant-simulator-touch-hint' },
        { text: simulatorTarget ? '한 번 더 눌러 시뮬레이터에 적용' : '', className: 'enchant-simulator-touch-hint' },
      ].filter((item) => item.text || item.html);
      const popover = `
        <span class="enchant-recommend-popover${hasVariantActions ? ' has-actions' : ''}" role="tooltip">
          ${hasUpgradeWarning ? '<span class="enchant-recommend-warning">⚠ 상위 마법부여 존재</span>' : ''}
          ${tooltipRows.map((item) => `<span class="${escapeHtml(item.className)}">${item.html || escapeHtml(item.text)}</span>`).join('')}
        </span>
      `;
      const combinedCardAttributes = isCombinedOathAcquisition && !isCombinedPreviewOnly
        ? ` data-oath-acquisition-combined-key="${escapeHtml(row.oathAcquisitionPairKey)}"`
        : '';
      const appliedCardAttributes = isCombinedOathAcquisition
        ? combinedCardAttributes
        : isApplied && oathAcquisitionRecommendationId
          ? ` data-applied-oath-acquisition-id="${escapeHtml(oathAcquisitionRecommendationId)}"`
          : isApplied
            ? ` data-applied-simulator-group="${escapeHtml(row.exclusiveGroupKey)}"`
            : '';
      return `
        <span class="enchant-recommend-step${hasVariantActions ? ` enchant-recommend-step-tune${state.equipmentTunePopoverOpen && state.equipmentTunePopoverSource === variantPopoverSource ? ' is-tune-popover-open' : ''}` : ''}"${hasVariantActions ? ` data-tune-source="${escapeHtml(variantPopoverSource)}"` : ''}>
          ${connector}
          <button type="button" class="enchant-recommend-item enchant-efficiency-${band}${hasUpgradeWarning ? ' enchant-has-upgrade-warning' : ''}${simulatorSelected ? ' is-touch-selected' : ''}${simulatorTarget ? ' is-simulator-supported' : ''}${isApplied ? ' is-applied' : ''}"${bandStyle}${simulatorRecommendationId && !isApplied ? ` data-simulator-recommendation-id="${escapeHtml(simulatorRecommendationId)}"` : ''}${appliedCardAttributes}${isApplied ? ` aria-label="${escapeHtml(`${displayTitle} 적용됨`)}"` : ''}>
            ${isApplied ? '<span class="enchant-simulator-applied-badge">✓ 적용</span>' : ''}
            <span class="enchant-recommend-icon">${row.iconUrl ? `<img src="${escapeHtml(row.iconUrl)}" alt="" loading="lazy" />` : ''}</span>
            <span class="enchant-recommend-main">
              <span class="enchant-recommend-title" title="${escapeHtml(displayTitle)}"><span class="enchant-recommend-title-text">${escapeHtml(displayTitle)}</span></span>
              <span class="enchant-recommend-sub">${escapeHtml(tierLabel)}</span>
            </span>
            <span class="enchant-recommend-metric">
              <strong>${acquisitionMarkup || escapeHtml(isFreeActionRecommendation(row) ? '0' : formatCompactGold(isBufferMetric ? row.buffCostPerHundredPoints : row.costPerPointOnePercent))}</strong>
              ${legacyAcquisitionLabel || isMaterialEnchant ? '' : `<span>${isBufferMetric ? '100점당' : '0.1%당'}</span>`}
            </span>
            ${popover}
          </button>
        </span>
      `;
    }).join('');
    scheduleFitEnchantRecommendTitles();
  }

  async function loadCurrentEnchants() {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) {
      state.currentEnchants = [];
      state.currentEquipmentUpgrades = [];
      state.currentOathUpgrades = null;
      state.currentOathTranscendRecommendations = [];
      state.currentOathCraftRecommendations = [];
      state.oathTuneStageDb = null;
      state.currentBlackFangRecommendations = [];
      state.currentRelicCraftRecommendations = [];
      state.upgradeExpectedDb = null;
      state.upgradeMaterialPrices = {};
      state.currentDamageBaseline = null;
      state.currentBufferBaseline = null;
      state.currentEnchantCharacterKey = '';
      setEnchantCharacterStatus('캐릭터를 검색해 주세요.');
      return;
    }
    const characterKey = character.key || `${character.serverId}:${character.characterId}`;
    if (state.currentEnchantCharacterKey === characterKey && state.currentEnchants.length) {
      return;
    }

    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const response = await fetch(`${API_BASE}/api/character-enchants?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '캐릭터 마법부여 조회에 실패했습니다.');
    state.currentEnchants = Array.isArray(payload.enchants) ? payload.enchants : [];
    state.currentEquipmentUpgrades = Array.isArray(payload.equipmentUpgrades) ? payload.equipmentUpgrades : [];
    state.currentOathUpgrades = payload.oathUpgrades || null;
    state.currentOathTranscendRecommendations = Array.isArray(payload.oathTranscendRecommendations) ? payload.oathTranscendRecommendations : [];
    state.currentOathCraftRecommendations = Array.isArray(payload.oathCraftRecommendations) ? payload.oathCraftRecommendations : [];
    state.oathTuneStageDb = payload.oathTuneStageDb || null;
    state.currentBlackFangRecommendations = Array.isArray(payload.blackFangRecommendations) ? payload.blackFangRecommendations : [];
    state.currentRelicCraftRecommendations = Array.isArray(payload.relicCraftRecommendations) ? payload.relicCraftRecommendations : [];
    state.upgradeExpectedDb = payload.upgradeExpectedDb || null;
    state.upgradeMaterialPrices = payload.upgradeMaterialPrices || {};
    state.currentDamageBaseline = payload.damageBaseline || null;
    state.currentBufferBaseline = payload.bufferBaseline || null;
    state.currentBufferScoreStatus = state.currentBufferBaseline?.isBuffer ? 'ready' : 'idle';
    initializeDealerSimulator();
    state.currentEnchantCharacterKey = characterKey;
    state.enchantTargetCharacter = {
      ...state.enchantTargetCharacter,
      serverId: payload.serverId || character.serverId,
      characterId: payload.characterId || character.characterId,
      name: payload.characterName || character.name || character.characterName || '',
      fame: Number(payload.fame || state.enchantTargetCharacter?.fame || 0),
      jobGrowName: payload.damageBaseline?.jobGrowName || state.enchantTargetCharacter?.jobGrowName || '',
    };
    renderEnchantCharacterPortrait();
    const label = payload.characterName || character.name || character.characterName || character.characterId;
    setEnchantCharacterStatus(state.isDevMode
      ? `${label} 기준 · 현재 마부 ${state.currentEnchants.length}부위 · 강화/증폭 ${state.currentEquipmentUpgrades.length}부위 · 흑아 ${state.currentBlackFangRecommendations.length}부위`
      : `${label} 기준`);
  }

  async function loadCurrentCreature() {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) {
      state.currentCreature = null;
      state.currentCreatureCharacterKey = '';
      return;
    }
    const characterKey = character.key || `${character.serverId}:${character.characterId}`;
    if (state.currentCreatureCharacterKey === characterKey && state.currentCreature) {
      return;
    }

    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const response = await fetch(`${API_BASE}/api/character-creature?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '캐릭터 크리쳐 조회에 실패했습니다.');
    state.currentCreature = payload.creature || null;
    state.currentCreatureCharacterKey = characterKey;
    syncDealerSimulatorCreatureState();
    renderEnchantCharacterPortrait();
  }

  async function loadCurrentTitle() {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) {
      state.currentTitle = null;
      state.currentTitleCharacterKey = '';
      return;
    }
    const characterKey = character.key || `${character.serverId}:${character.characterId}`;
    if (state.currentTitleCharacterKey === characterKey && state.currentTitle) {
      return;
    }

    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const response = await fetch(`${API_BASE}/api/character-title?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '캐릭터 칭호 조회에 실패했습니다.');
    state.currentTitle = payload.title || null;
    state.currentTitleCharacterKey = characterKey;
    syncDealerSimulatorTitleState();
    renderEnchantCharacterPortrait();
  }

  async function loadCurrentAura() {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) {
      state.currentAura = null;
      state.currentAuraCharacterKey = '';
      return;
    }
    const characterKey = character.key || `${character.serverId}:${character.characterId}`;
    if (state.currentAuraCharacterKey === characterKey && state.currentAura) {
      return;
    }

    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const response = await fetch(`${API_BASE}/api/character-aura?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '캐릭터 오라 조회에 실패했습니다.');
    state.currentAura = payload.aura || null;
    state.currentAuraCharacterKey = characterKey;
    syncDealerSimulatorAuraState();
    renderEnchantCharacterPortrait();
  }

  async function loadCurrentAvatar() {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) {
      state.currentAvatar = null;
      state.currentAvatarCharacterKey = '';
      return;
    }
    const characterKey = character.key || `${character.serverId}:${character.characterId}`;
    if (state.currentAvatarCharacterKey === characterKey && state.currentAvatar) {
      return;
    }

    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const response = await fetch(`${API_BASE}/api/character-avatar?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '캐릭터 아바타 조회에 실패했습니다.');
    state.currentAvatar = payload || null;
    state.currentAvatarCharacterKey = characterKey;
    syncDealerSimulatorAuraState();
    syncDealerSimulatorAvatarState();
    renderEnchantCharacterPortrait();
  }

  async function loadCurrentCharacterPreview(requestId = state.enchantRequestId) {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) return;
    const characterKey = character.key || `${character.serverId}:${character.characterId}`;
    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const response = await fetch(`${API_BASE}/api/character-preview?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '캐릭터 장비 조회에 실패했습니다.');
    if (requestId !== state.enchantRequestId) return;
    state.currentEnchants = Array.isArray(payload.enchants) ? payload.enchants : [];
    state.currentEquipmentUpgrades = Array.isArray(payload.equipmentUpgrades) ? payload.equipmentUpgrades : [];
    state.currentOathUpgrades = null;
    state.currentOathTranscendRecommendations = [];
    state.currentOathCraftRecommendations = [];
    state.oathTuneStageDb = null;
    state.currentCreature = payload.creature || null;
    state.currentTitle = payload.title || null;
    state.currentAura = payload.aura || null;
    state.switchingTitleRecommendations = [];
    state.switchingCreatureRecommendations = [];
    state.switchingFragmentRecommendations = [];
    state.currentEnchantCharacterKey = characterKey;
    state.currentCreatureCharacterKey = characterKey;
    state.currentTitleCharacterKey = characterKey;
    state.currentAuraCharacterKey = characterKey;
    state.enchantTargetCharacter = {
      ...state.enchantTargetCharacter,
      serverId: payload.serverId || character.serverId,
      characterId: payload.characterId || character.characterId,
      name: payload.characterName || character.name || character.characterName || '',
      adventureName: payload.adventureName || state.enchantTargetCharacter?.adventureName || '',
      fame: Number(payload.fame || state.enchantTargetCharacter?.fame || 0),
    };
    renderEnchantCharacterPortrait();
  }

  async function loadCurrentOfficialEquipmentScore(requestId = state.enchantRequestId) {
    const character = getSelectedEnchantCharacter();
    const characterName = character?.name || character?.characterName || '';
    if (!character?.serverId || !characterName) {
      state.currentOfficialEquipmentScore = null;
      state.currentOfficialEquipmentScoreStatus = 'idle';
      state.currentOfficialEquipmentScoreCharacterKey = '';
      state.currentOfficialBufferScore = null;
      state.currentOfficialBufferScoreStatus = 'idle';
      state.currentOfficialBufferScoreCharacterKey = '';
      renderEnchantCharacterPortrait();
      return;
    }
    const isBuffer = Boolean(state.currentBufferBaseline?.isBuffer);
    const characterKey = `${character.serverId}:${characterName}`;
    if (isBuffer) {
      state.currentOfficialBufferScore = null;
      state.currentOfficialBufferScoreStatus = 'loading';
      state.currentOfficialBufferScoreCharacterKey = characterKey;
    } else {
      state.currentOfficialEquipmentScore = null;
      state.currentOfficialEquipmentScoreStatus = 'loading';
      state.currentOfficialEquipmentScoreCharacterKey = characterKey;
    }
    renderEnchantCharacterPortrait();

    try {
      const query = new URLSearchParams({
        serverId: character.serverId,
        characterName,
      });
      const response = await fetch(`${API_BASE}/api/equipment-score?${query.toString()}`, { cache: 'no-store' });
      const payload = await parseApiJsonResponse(response, '공식 점수 조회에 실패했습니다.');
      const activeCharacterKey = isBuffer
        ? state.currentOfficialBufferScoreCharacterKey
        : state.currentOfficialEquipmentScoreCharacterKey;
      if (requestId !== state.enchantRequestId || activeCharacterKey !== characterKey) return;
      if (isBuffer) {
        const score = Number(payload.buffScore);
        state.currentOfficialBufferScore = Number.isFinite(score) && score > 0 ? score : null;
        state.currentOfficialBufferScoreStatus = state.currentOfficialBufferScore ? 'ready' : 'error';
      } else {
        const score = Number(payload.equipmentScore);
        state.currentOfficialEquipmentScore = Number.isFinite(score) && score > 0 ? score : null;
        state.currentOfficialEquipmentScoreStatus = state.currentOfficialEquipmentScore ? 'ready' : 'error';
      }
      if (!isBuffer && state.dealerSimulator) {
        state.dealerSimulator.baseEquipmentScore = state.currentOfficialEquipmentScore;
      }
    } catch {
      const activeCharacterKey = isBuffer
        ? state.currentOfficialBufferScoreCharacterKey
        : state.currentOfficialEquipmentScoreCharacterKey;
      if (requestId !== state.enchantRequestId || activeCharacterKey !== characterKey) return;
      if (isBuffer) {
        state.currentOfficialBufferScore = null;
        state.currentOfficialBufferScoreStatus = 'error';
      } else {
        state.currentOfficialEquipmentScore = null;
        state.currentOfficialEquipmentScoreStatus = 'error';
      }
    }
    renderEnchantCharacterPortrait();
  }

  async function loadCurrentCharacterLoadout(requestId = state.enchantRequestId) {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) {
      resetCurrentEnchantCharacterState();
      setEnchantCharacterStatus('캐릭터를 검색해 주세요.');
      return;
    }
    const characterKey = character.key || `${character.serverId}:${character.characterId}`;
    if (
      state.currentEnchantCharacterKey === characterKey
      && state.currentCreatureCharacterKey === characterKey
      && state.currentTitleCharacterKey === characterKey
      && state.currentAuraCharacterKey === characterKey
      && state.currentAvatarCharacterKey === characterKey
      && state.currentEnchants.length
    ) {
      return;
    }
    if (isLikelyBufferCharacter(character)) {
      state.currentBufferScoreStatus = 'loading';
      state.currentOfficialEquipmentScore = null;
      state.currentOfficialEquipmentScoreStatus = 'idle';
      state.currentOfficialEquipmentScoreCharacterKey = '';
      renderEnchantCharacterPortrait();
    }

    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const startedAt = getEnchantNowMs();
    const response = await fetch(`${API_BASE}/api/character-loadout?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '캐릭터 세팅 조회에 실패했습니다.');
    if (requestId !== state.enchantRequestId) return;
    state.currentEnchants = Array.isArray(payload.enchants) ? payload.enchants : [];
    state.currentEquipmentUpgrades = Array.isArray(payload.equipmentUpgrades) ? payload.equipmentUpgrades : [];
    state.currentOathUpgrades = payload.oathUpgrades || null;
    state.currentOathTranscendRecommendations = Array.isArray(payload.oathTranscendRecommendations) ? payload.oathTranscendRecommendations : [];
    state.currentOathCraftRecommendations = Array.isArray(payload.oathCraftRecommendations) ? payload.oathCraftRecommendations : [];
    state.oathTuneStageDb = payload.oathTuneStageDb || null;
    state.currentBlackFangRecommendations = Array.isArray(payload.blackFangRecommendations) ? payload.blackFangRecommendations : [];
    state.currentRelicCraftRecommendations = Array.isArray(payload.relicCraftRecommendations) ? payload.relicCraftRecommendations : [];
    state.upgradeExpectedDb = payload.upgradeExpectedDb || null;
    state.upgradeMaterialPrices = payload.upgradeMaterialPrices || {};
    state.currentDamageBaseline = payload.damageBaseline || null;
    state.currentBufferBaseline = payload.bufferBaseline || null;
    state.currentBufferScoreStatus = state.currentBufferBaseline?.isBuffer ? 'ready' : 'idle';
    state.currentCreature = payload.creature || null;
    state.currentTitle = payload.title || null;
    state.currentAura = payload.aura || null;
    state.currentAvatar = payload.avatar || null;
    state.currentBuffLoadout = payload.buffLoadout || null;
    state.currentBufferSkillContexts = mergeBufferSkillContexts(
      state.currentBufferSkillContexts,
      payload.bufferSkillContexts && typeof payload.bufferSkillContexts === 'object'
        ? payload.bufferSkillContexts
        : {},
    );
    state.switchingTitleRecommendations = Array.isArray(payload.switchingTitleRecommendations) ? payload.switchingTitleRecommendations : [];
    state.switchingCreatureRecommendations = Array.isArray(payload.switchingCreatureRecommendations) ? payload.switchingCreatureRecommendations : [];
    state.switchingFragmentRecommendations = Array.isArray(payload.switchingFragmentRecommendations) ? payload.switchingFragmentRecommendations : [];
    initializeDealerSimulator();
    state.currentEnchantCharacterKey = characterKey;
    state.currentCreatureCharacterKey = characterKey;
    state.currentTitleCharacterKey = characterKey;
    state.currentAuraCharacterKey = characterKey;
    state.currentAvatarCharacterKey = characterKey;
    state.enchantTargetCharacter = {
      ...state.enchantTargetCharacter,
      serverId: payload.serverId || character.serverId,
      characterId: payload.characterId || character.characterId,
      name: payload.characterName || character.name || character.characterName || '',
      adventureName: payload.adventureName || state.enchantTargetCharacter?.adventureName || '',
      fame: Number(payload.fame || state.enchantTargetCharacter?.fame || 0),
      jobGrowName: payload.damageBaseline?.jobGrowName || state.enchantTargetCharacter?.jobGrowName || '',
    };
    renderEnchantCharacterPortrait();
    void loadCurrentOfficialEquipmentScore(requestId);
    const label = payload.characterName || character.name || character.characterName || character.characterId;
    setEnchantCharacterStatus(state.isDevMode
      ? `${label} 기준 · 현재 마부 ${state.currentEnchants.length}부위 · 강화/증폭 ${state.currentEquipmentUpgrades.length}부위 · 흑아 ${state.currentBlackFangRecommendations.length}부위`
      : `${label} 기준`);
    recordEnchantTimingStep('character-loadout', startedAt, {
      enchants: state.currentEnchants.length,
      upgrades: state.currentEquipmentUpgrades.length,
      serverTiming: payload.debugTimings || null,
    });
  }

  async function loadCharacterAuraUpgradeGroups(requestId = state.enchantRequestId) {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) return;
    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const response = await fetch(`${API_BASE}/api/aura-upgrades?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '오라 후보 조회에 실패했습니다.');
    if (requestId !== state.enchantRequestId) return;
    state.auraUpgradeGroups = Array.isArray(payload.groups) ? payload.groups : [];
  }

  async function loadCharacterCreatureUpgradeGroups(requestId = state.enchantRequestId) {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) return;
    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const response = await fetch(`${API_BASE}/api/creature-upgrades?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '크리쳐 후보 조회에 실패했습니다.');
    if (requestId !== state.enchantRequestId) return;
    state.creatureUpgradeGroups = Array.isArray(payload.groups) ? payload.groups : [];
    state.creatureArtifactGroups = Array.isArray(payload.artifactGroups) ? payload.artifactGroups : [];
  }

  async function loadEnchantRecommendationsAsync(requestId) {
    try {
      await loadCurrentCharacterLoadout(requestId);
      if (requestId !== state.enchantRequestId) return;
      if (
        state.currentBufferBaseline?.isBuffer
        || !state.enchantPriceLoaded
        || !hasEnchantPriceRecommendationData()
      ) {
        await loadEnchantCards(false, { refreshCurrentCharacter: false, skipImmediateRender: true, requestId });
      } else {
        await Promise.all([
          loadCharacterAuraUpgradeGroups(requestId),
          loadCharacterCreatureUpgradeGroups(requestId),
        ]);
      }
      if (requestId !== state.enchantRequestId) return;
      state.enchantRecommendationLoading = false;
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      flushEnchantTiming('complete');
    } catch (error) {
      if (requestId !== state.enchantRequestId) return;
      state.currentBufferScoreStatus = 'idle';
      state.enchantRecommendationLoading = false;
      const errorMessage = normalizeApiErrorMessage(error, '스펙업 순서 추천을 불러오지 못했습니다.');
      showEnchantAnalysisError(errorMessage);
      setEnchantCharacterStatus(errorMessage);
      flushEnchantTiming('error');
    }
  }

  async function searchEnchantCharacter(options = {}) {
    const serverId = String(options.serverId || els.enchantServerIdInput?.value || '').trim().toLowerCase();
    const characterName = String(options.characterName || els.enchantCharacterNameInput?.value || '').trim();
    const isAdventureSearch = serverId === 'adventure';
    if (!characterName) {
      state.enchantRecommendationLoading = false;
      setEnchantCharacterStatus(isAdventureSearch ? '모험단명을 입력해 주세요.' : '캐릭터명을 입력해 주세요.');
      return;
    }

    const isAllServerSearch = !serverId || serverId === 'all';
    const isCandidateSearch = isAllServerSearch || isAdventureSearch;
    state.enchantRecommendationLoading = true;
    state.enchantSearchMode = isCandidateSearch ? 'candidate' : 'analysis';
    state.enchantCandidateLookupType = isAdventureSearch ? 'adventure' : isAllServerSearch ? 'all' : '';
    const requestId = state.enchantRequestId + 1;
    state.enchantRequestId = requestId;
    state.enchantTargetCharacter = null;
    resetCurrentEnchantCharacterState();
    if (isCandidateSearch) {
      setEnchantCandidatePanel('loading');
    } else {
      showEnchantAnalysisLoading();
    }
    if (els.loadEnchantCharacterButton) els.loadEnchantCharacterButton.disabled = true;
    setEnchantCharacterStatus(isAdventureSearch
      ? `${characterName} 모험단 검색 중...`
      : isAllServerSearch
        ? `${characterName} 전체 서버 검색 중...`
        : `${characterName} 검색 중...`);
    beginEnchantTiming(`${serverId || 'all'}:${characterName}`);
    try {
      if (isCandidateSearch) {
        const query = new URLSearchParams({ serverId: isAdventureSearch ? 'adventure' : 'all', characterName });
        const searchStartedAt = getEnchantNowMs();
        const response = await fetch(`${API_BASE}/api/search-all?${query.toString()}`, { cache: 'no-store' });
        const payload = await parseApiJsonResponse(response, '캐릭터 검색에 실패했습니다.');
        if (requestId !== state.enchantRequestId) return;
        const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
        recordEnchantTimingStep(isAdventureSearch ? 'search-adventure-cache' : 'search-all', searchStartedAt, {
          matchCount: candidates.length,
          failures: Array.isArray(payload.failures) ? payload.failures.length : 0,
          cacheOnly: payload.cacheOnly === true,
        });
        state.enchantRecommendationLoading = false;
        state.enchantSearchCandidates = candidates;
        setEnchantCharacterStatus(candidates.length ? `${candidates.length}개 캐릭터를 찾았습니다.` : '캐릭터를 찾지 못했습니다.');
        setEnchantCandidatePanel(candidates.length ? 'ready' : 'empty', candidates, characterName);
        flushEnchantTiming('candidate-select');
        return;
      }
      const query = new URLSearchParams({ serverId, characterName });
      const searchStartedAt = getEnchantNowMs();
      const response = await fetch(`${API_BASE}/api/search?${query.toString()}`, { cache: 'no-store' });
      const payload = await parseApiJsonResponse(response, '캐릭터 검색에 실패했습니다.');
      if (requestId !== state.enchantRequestId) return;
      recordEnchantTimingStep('search', searchStartedAt, {
        matchCount: Number(payload.matchCount || 0),
      });
      const resolved = payload.resolved || {};
      if (!resolved.characterId) {
        throw new Error('캐릭터를 찾지 못했습니다.');
      }
      state.enchantTargetCharacter = {
        key: `${resolved.serverId || serverId}:${resolved.characterId}`,
        serverId: resolved.serverId || serverId,
        characterId: resolved.characterId,
        name: resolved.characterName || characterName,
        adventureName: resolved.adventureName || '',
        fame: Number(resolved.fame || 0),
        jobName: resolved.jobName || '',
        jobGrowName: resolved.jobGrowName || '',
      };
      resetCurrentEnchantCharacterState();
      if (isLikelyBufferCharacter(state.enchantTargetCharacter)) {
        state.currentBufferScoreStatus = 'loading';
        state.currentOfficialBufferScoreStatus = 'loading';
        state.currentOfficialBufferScoreCharacterKey = `${state.enchantTargetCharacter.serverId}:${state.enchantTargetCharacter.name}`;
      } else {
        state.currentOfficialEquipmentScoreStatus = 'loading';
        state.currentOfficialEquipmentScoreCharacterKey = `${state.enchantTargetCharacter.serverId}:${state.enchantTargetCharacter.name}`;
      }
      resetEnchantRecommendationFilters();
      showEnchantAnalysisLoading();
      void loadEnchantRecommendationsAsync(requestId);
      return {
        serverId: state.enchantTargetCharacter.serverId,
        characterName: state.enchantTargetCharacter.name,
      };
    } catch (error) {
      if (requestId !== state.enchantRequestId) return;
      const errorMessage = String(error?.message || '').includes('캐릭터를 찾지 못했습니다')
        ? '캐릭터를 찾지 못했습니다.'
        : normalizeApiErrorMessage(error, '캐릭터 검색에 실패했습니다.');
      state.enchantRecommendationLoading = false;
      if (isCandidateSearch) {
        setEnchantCandidatePanel('error', [], errorMessage);
      } else {
        showEnchantAnalysisError(errorMessage);
      }
      setEnchantCharacterStatus(errorMessage);
      flushEnchantTiming('error');
    } finally {
      if (requestId === state.enchantRequestId && els.loadEnchantCharacterButton) {
        els.loadEnchantCharacterButton.disabled = false;
      }
    }
  }

  async function loadEnchantCards(forceRefresh = false, options = {}) {
    const hasRequestGuard = Object.prototype.hasOwnProperty.call(options, 'requestId');
    const { refreshCurrentCharacter = true, skipImmediateRender = false, requestId = state.enchantRequestId } = options;
    if (state.enchantLoading && !hasRequestGuard) return;
    const startedRequestId = state.enchantRequestId;
    const isStalePriceRequest = () => (hasRequestGuard ? requestId !== state.enchantRequestId : startedRequestId !== state.enchantRequestId);
    state.enchantLoading = true;
    const ownsTiming = !state.enchantTiming && beginEnchantTiming(forceRefresh ? 'price-refresh' : 'price-load');
    if (forceRefresh) {
      state.currentAvatar = null;
      state.switchingTitleRecommendations = [];
      state.switchingCreatureRecommendations = [];
      state.switchingFragmentRecommendations = [];
      state.currentAvatarCharacterKey = '';
    }
    if (els.refreshEnchantCardsButton) els.refreshEnchantCardsButton.disabled = true;
    setEnchantPriceStatus('시세 확인 중...', '경매장 가격을 가져오는 중...');
    try {
      const queryParams = new URLSearchParams();
      if (forceRefresh) queryParams.set('refresh', '1');
      const currentCharacter = state.enchantTargetCharacter || {};
      if (currentCharacter.serverId && currentCharacter.characterId) {
        queryParams.set('serverId', currentCharacter.serverId);
        queryParams.set('characterId', currentCharacter.characterId);
        if (state.currentBufferBaseline?.isBuffer) queryParams.set('role', 'buffer');
      }
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const priceStartedAt = getEnchantNowMs();
      const [enchantResponse, creatureResponse, titleResponse, auraResponse] = await Promise.all([
        fetch(`${API_BASE}/api/enchant-cards${query}`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/creature-upgrades${query}`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/title-upgrades${query}`, { cache: 'no-store' }),
        fetch(`${API_BASE}/api/aura-upgrades${query}`, { cache: 'no-store' }),
      ]);
      const payload = await parseApiJsonResponse(enchantResponse, '마법부여 가격 조회에 실패했습니다.');
      const creaturePayload = await parseApiJsonResponse(creatureResponse, '크리쳐 가격 조회에 실패했습니다.');
      const titlePayload = await parseApiJsonResponse(titleResponse, '칭호 가격 조회에 실패했습니다.');
      const auraPayload = await parseApiJsonResponse(auraResponse, '오라 가격 조회에 실패했습니다.');
      if (isStalePriceRequest()) return;
      state.enchantCards = Array.isArray(payload.cards) ? payload.cards : [];
      state.currentBufferSkillContexts = mergeBufferSkillContexts(
        state.currentBufferSkillContexts,
        payload.bufferSkillContexts && typeof payload.bufferSkillContexts === 'object'
          ? payload.bufferSkillContexts
          : {},
      );
      if (state.currentBufferBaseline?.isBuffer) initializeDealerSimulator();
      state.creatureUpgradeGroups = Array.isArray(creaturePayload.groups) ? creaturePayload.groups : [];
      state.creatureArtifactGroups = Array.isArray(creaturePayload.artifactGroups) ? creaturePayload.artifactGroups : [];
      state.titleUpgradeGroups = Array.isArray(titlePayload.groups) ? titlePayload.groups : [];
      state.auraUpgradeGroups = Array.isArray(auraPayload.groups) ? auraPayload.groups : [];
      state.enchantPriceLoaded = hasEnchantPriceRecommendationData();
      state.enchantPricedAt = payload.pricedAt || '';
      state.creaturePricedAt = creaturePayload.pricedAt || '';
      state.titlePricedAt = titlePayload.pricedAt || '';
      state.auraPricedAt = auraPayload.pricedAt || '';
      recordEnchantTimingStep('price-load', priceStartedAt, {
        enchantCards: state.enchantCards.length,
        creatureGroups: state.creatureUpgradeGroups.length,
        titleGroups: state.titleUpgradeGroups.length,
        auraGroups: state.auraUpgradeGroups.length,
      });
      if (!skipImmediateRender) {
        renderEnchantTable();
      }
      const errorCount = Number(payload.errors?.length || 0) + Number(creaturePayload.errors?.length || 0) + Number(titlePayload.errors?.length || 0) + Number(auraPayload.errors?.length || 0);
      const creatureCount = getCreatureRows(state.creatureUpgradeGroups).length;
      const artifactCount = getCreatureArtifactRows(state.creatureArtifactGroups).length;
      const titleCount = getTitleRows(state.titleUpgradeGroups, state.currentTitle).length + getSwitchingTitleRows(state.switchingTitleRecommendations).length;
      const auraCount = getAuraRows(state.auraUpgradeGroups).length;
      const avatarCount = getAvatarRows(state.currentAvatar).length;
      const errorText = errorCount ? `, 실패 ${errorCount}개` : '';
      const refreshingText = payload.cache?.refreshing || creaturePayload.cache?.refreshing || titlePayload.cache?.refreshing || auraPayload.cache?.refreshing ? ', 백그라운드 갱신 중' : '';
      const pricedAtText = state.enchantPricedAt || state.creaturePricedAt || state.titlePricedAt || state.auraPricedAt || '캐시 준비 중';
      const devStatus = `${state.enchantCards.length}개 카드 + 크리쳐 ${creatureCount}개 + 아티팩트 ${artifactCount}개 + 칭호 ${titleCount}개 + 오라 ${auraCount}개 + 아바타 ${avatarCount}개 가격 불러오기 완료 · ${pricedAtText}${refreshingText}${errorText}`;
      setEnchantPriceStatus('시세 반영 완료', devStatus);

      if (refreshCurrentCharacter) {
        loadCurrentCharacterLoadout(requestId)
          .then(() => {
            if (isStalePriceRequest()) return;
            renderEnchantTable();
          })
          .catch((error) => {
            if (isStalePriceRequest()) return;
            resetCurrentEnchantCharacterState();
            setEnchantPriceStatus('일부 정보를 확인하지 못했습니다.', `${devStatus}, 현재 세팅 미반영: ${normalizeApiErrorMessage(error)}`);
            renderEnchantTable();
          });
      }
    } catch (error) {
      if (isStalePriceRequest()) return;
      setEnchantPriceStatus(normalizeApiErrorMessage(error, '가격 정보를 불러오지 못했습니다.'));
      if (ownsTiming) flushEnchantTiming('error');
    } finally {
      if (!isStalePriceRequest()) {
        state.enchantLoading = false;
        if (els.refreshEnchantCardsButton) els.refreshEnchantCardsButton.disabled = false;
        if (ownsTiming) flushEnchantTiming('complete');
      }
    }
  }

  function getTuneRowsBySource(sourceType) {
    if (sourceType === 'oathTune') {
      return getOathTuneRows(getOathTuneRecommendationUpgrades(), state.oathTuneStageDb, state.upgradeMaterialPrices, getActiveEquipmentUpgrades(), state.currentBufferBaseline);
    }
    return getEquipmentTuneRows(state.currentEquipmentUpgrades, state.upgradeMaterialPrices, state.currentBufferBaseline);
  }

  function getEquipmentTuneVariantRow(stepIndex) {
    const row = getTuneRowsBySource('equipmentTune')[0];
    if (!row) return null;
    return applyEquipmentTuneDisplayStep(
      state.currentBufferBaseline?.isBuffer ? { ...row, metricType: 'buffer' } : row,
      stepIndex,
      els.enchantMaterialCostToggle?.checked === true,
      getActiveDamageBaseline(),
      state.currentBufferBaseline,
      state.dealerSimulator?.role === 'buffer' ? state.dealerSimulator : null,
    );
  }

  function getOathTuneVariantRow(stepIndex) {
    const row = getTuneRowsBySource('oathTune')[0];
    if (!row) return null;
    return applyEquipmentTuneDisplayStep(
      state.currentBufferBaseline?.isBuffer ? { ...row, metricType: 'buffer' } : row,
      stepIndex,
      els.enchantMaterialCostToggle?.checked === true,
      getActiveDamageBaseline(),
      state.currentBufferBaseline,
      state.dealerSimulator?.role === 'buffer' ? state.dealerSimulator : null,
    );
  }

  function replaceAppliedEquipmentTuneVariant(stepIndex) {
    const simulator = state.dealerSimulator;
    const selection = simulator?.activeSelectionByGroup?.equipmentTune;
    if (!simulator || !selection || selection.actionType !== 'equipmentTunePlan') return false;
    const row = getEquipmentTuneVariantRow(stepIndex);
    if (!row || Number(row.selectedTuneStepIndex || 0) === Number(selection.selectedVariantIndex || 0)) return false;
    const plannedEquipment = applyEquipmentTunePlan(selection.beforeTuneSnapshot || [], row.tunePlan);
    if (!plannedEquipment) return false;
    const rollbackSnapshot = createSimulatorSnapshot();
    const previousEquipment = cloneSimulatorValue(simulator.simulatedEquipmentUpgrades || []);
    const currentEquipmentBySlot = new Map(
      previousEquipment.map((equipment) => [equipment?.slot, equipment]),
    );
    const nextEquipment = plannedEquipment.map((equipment) => {
      const currentEquipment = currentEquipmentBySlot.get(equipment?.slot);
      const equipmentBodySelection = Object.values(
        simulator.activeSelectionByGroup || {},
      ).find((activeSelection) => (
        activeSelection?.applyType === 'replaceEquipmentBody'
        && activeSelection.targetSlot === equipment?.slot
      ));
      if (!currentEquipment || !equipmentBodySelection) return equipment;
      return replaceEquipmentBodyPreservingState(equipment, {
        slotId: resolveCanonicalEquipmentSlotId(currentEquipment),
        slot: resolveCanonicalEquipmentSlotName(currentEquipment),
        itemId: currentEquipment.itemId,
        itemName: currentEquipment.itemName,
        iconUrl: currentEquipment.iconUrl,
        itemRarity: currentEquipment.itemRarity,
        effects: currentEquipment.bodyEffects,
        itemExplain: currentEquipment.bodyExplain,
        itemReinforceSkill: currentEquipment.itemReinforceSkill,
        itemBuff: currentEquipment.itemBuff,
        tuneSetPoint: currentEquipment.tuneSetPoint,
      });
    });
    const updatedSelection = {
      ...selection,
      candidateSignature: getSimulatorCandidateSignature(row),
      appliedGold: getRecommendationGold(row, els.enchantMaterialCostToggle?.checked === true),
      includeMaterialCost: els.enchantMaterialCostToggle?.checked === true,
      goldWithoutMaterials: getRecommendationGold(row, false),
      goldWithMaterials: getRecommendationGold(row, true),
      selectedVariantIndex: Number(row.selectedTuneStepIndex || 0),
      variants: cloneSimulatorValue(row.tuneSteps || []),
      appliedVariantSnapshot: cloneSimulatorValue(row),
      baseRelativeChanges: simulator.role === 'buffer'
        ? cloneSimulatorValue(row.bufferBaseRelativeChanges)
        : selection.baseRelativeChanges,
    };
    try {
      simulator.simulatedEquipmentUpgrades = nextEquipment;
      simulator.activeSelectionByGroup.equipmentTune = updatedSelection;
      if (simulator.role === 'buffer') {
        simulator.equipmentTuneChangesBySource.equipmentTune = cloneSimulatorValue(
          row.bufferBaseRelativeChanges,
        );
      }
      simulator.totalGold = getDealerSimulatorTotalGold(simulator);
      simulator.lastChangedTarget = {
        targetTab: 'equipment',
        targetSlot: '장비 조율',
        applyType: 'applyEquipmentTunePlan',
      };
      if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
      else rebuildDealerSimulatorCalculationState();
      getChangedEquipmentTuneSlots(previousEquipment, nextEquipment).forEach(triggerDealerSimulatorSweep);
      state.enchantLoadoutTab = 'equipment';
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return true;
    } catch {
      restoreSimulatorSnapshot(rollbackSnapshot);
      return false;
    }
  }

  function replaceAppliedOathTuneVariant(stepIndex) {
    const simulator = state.dealerSimulator;
    const selection = simulator?.activeSelectionByGroup?.oathTune;
    if (!simulator || !selection || selection.actionType !== 'oathTunePlan') return false;
    const row = getOathTuneVariantRow(stepIndex);
    if (!row || Number(row.selectedTuneStepIndex || 0) === Number(selection.selectedVariantIndex || 0)) return false;
    const plannedOath = applyOathTunePlan(
      selection.beforeTuneSnapshot || {},
      row.tunePlan,
      Number(selection.pointPerTune || simulator.oathTuneDb?.pointPerTune || 10),
      Number(selection.maxTuneLevel || simulator.oathTuneDb?.maxTuneLevel || 3),
    );
    if (!plannedOath || Number(plannedOath.setPoint || 0) !== Number(row.targetSetPoint || 0)) return false;
    syncOathTuneStageDisplay(plannedOath, simulator.oathTuneDb);
    const rollbackSnapshot = createSimulatorSnapshot();
    const previousOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const updatedSelection = {
      ...selection,
      candidateSignature: getSimulatorCandidateSignature(row),
      appliedGold: getRecommendationGold(row, els.enchantMaterialCostToggle?.checked === true),
      includeMaterialCost: els.enchantMaterialCostToggle?.checked === true,
      goldWithoutMaterials: getRecommendationGold(row, false),
      goldWithMaterials: getRecommendationGold(row, true),
      selectedVariantIndex: Number(row.selectedTuneStepIndex || 0),
      variants: cloneSimulatorValue(row.tuneSteps || []),
      appliedVariantSnapshot: cloneSimulatorValue(row),
      baseRelativeChanges: simulator.role === 'buffer'
        ? cloneSimulatorValue(row.bufferBaseRelativeChanges)
        : selection.baseRelativeChanges,
    };
    try {
      simulator.simulatedOathUpgrades = plannedOath;
      simulator.activeSelectionByGroup.oathTune = updatedSelection;
      if (simulator.role === 'buffer') {
        simulator.oathTuneChangesBySource.oathTune = cloneSimulatorValue(
          row.bufferBaseRelativeChanges,
        );
      }
      simulator.totalGold = getDealerSimulatorTotalGold(simulator);
      simulator.lastChangedTarget = {
        targetTab: 'oath',
        targetSlot: '서약 조율',
        applyType: 'applyOathTunePlan',
      };
      if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
      else rebuildDealerSimulatorCalculationState();
      getChangedOathTuneSlots(previousOath, plannedOath).forEach(triggerDealerSimulatorSweep);
      state.enchantLoadoutTab = 'oath';
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return true;
    } catch {
      restoreSimulatorSnapshot(rollbackSnapshot);
      return false;
    }
  }

  function replaceAppliedOathAcquisitionVariant(groupKey, variantIndex) {
    const simulator = state.dealerSimulator;
    if (!simulator || !groupKey || simulator.applyingRecommendationId) return false;
    const activeSelections = Object.values(simulator.activeSelectionByGroup || {})
      .filter((selection) => selection?.acquisitionVariantGroupKey === groupKey);
    if (!activeSelections.length) return false;
    const renderedRows = [...state.dealerSimulatorRecommendations.values()]
      .filter((row) => row?.variantGroupKey === groupKey);
    const appliedSnapshotRows = simulator.role === 'buffer'
      ? activeSelections
        .map((selection) => selection?.appliedRecommendationSnapshot)
        .filter(Boolean)
      : [];
    const variants = [...renderedRows, ...appliedSnapshotRows]
      .flatMap((row) => Array.isArray(row.oathDecisionVariants) ? row.oathDecisionVariants : [row])
      .filter((row, index, rows) => rows.findIndex(
        (candidate) => Number(candidate.variantCount || 1) === Number(row.variantCount || 1),
      ) === index)
      .slice()
      .sort((a, b) => Number(a.variantCount || 1) - Number(b.variantCount || 1));
    const selectedVariantIndex = Math.max(
      0,
      Math.min(variants.length - 1, Number(variantIndex || 0)),
    );
    const selectedVariant = simulator.role === 'buffer' && variants[selectedVariantIndex]
      ? adaptOathAcquisitionRecommendation(variants[selectedVariantIndex], simulator)
      : variants[selectedVariantIndex];
    const row = selectedVariant ? {
      ...selectedVariant,
      selectedVariantIndex,
      oathDecisionVariants: variants,
    } : null;
    if (!row || Number(row.variantCount || 1) === activeSelections.length) return false;
    const target = resolveDealerSimulatorTarget(row);
    if (!target) return false;

    const rollbackSnapshot = createSimulatorSnapshot();
    const previousOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const acquisitionActionId = activeSelections[0]?.acquisitionActionId
      || getDealerSimulatorRecommendationId(row);
    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    simulator.applyingRecommendationId = acquisitionActionId;
    try {
      if (!applySimulatedOathAcquisition(row, target)) {
        restoreSimulatorSnapshot(rollbackSnapshot);
        return false;
      }
      const appliedDescriptors = setActiveOathAcquisitionSelections(
        row,
        target,
        acquisitionActionId,
        includeMaterialCosts,
      );
      if (!appliedDescriptors.length) throw new Error('Oath acquisition selection missing');
      syncOathAcquisitionVariantIndexes();
      simulator.totalGold = getDealerSimulatorTotalGold(simulator, includeMaterialCosts);
      simulator.selectedRecommendationId = '';
      simulator.lastChangedTarget = target;
      state.enchantLoadoutTab = 'oath';
      getChangedOathTuneSlots(previousOath, simulator.simulatedOathUpgrades)
        .forEach(triggerDealerSimulatorSweep);
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return true;
    } catch {
      restoreSimulatorSnapshot(rollbackSnapshot);
      return false;
    } finally {
      simulator.applyingRecommendationId = '';
    }
  }

  function changeEquipmentTuneStep(delta, sourceType = 'equipmentTune') {
    const value = Number(delta || 0);
    if (!Number.isFinite(value) || value === 0) return;
    freezeRecommendationOrderWhileEditing(sourceType);
    const maxIndex = Math.max(
      0,
      ...getTuneRowsBySource(sourceType)
        .map((row) => (Array.isArray(row.tuneSteps) ? row.tuneSteps.length - 1 : 0)),
    );
    const currentIndex = getTuneStepIndexBySource(state, sourceType);
    state.tuneStepIndexBySource = {
      ...(state.tuneStepIndexBySource || {}),
      [sourceType]: Math.max(0, Math.min(maxIndex, currentIndex + value)),
    };
    if (sourceType === 'equipmentTune') {
      state.equipmentTuneStepIndex = state.tuneStepIndexBySource[sourceType];
    }
    state.equipmentTunePopoverOpen = true;
    state.equipmentTunePopoverSource = sourceType;
    if (sourceType === 'equipmentTune' && state.dealerSimulator?.activeSelectionByGroup?.equipmentTune) {
      if (replaceAppliedEquipmentTuneVariant(state.tuneStepIndexBySource[sourceType])) return;
      state.tuneStepIndexBySource[sourceType] = currentIndex;
      state.equipmentTuneStepIndex = currentIndex;
      renderEnchantTable();
      return;
    }
    if (sourceType === 'oathTune' && state.dealerSimulator?.activeSelectionByGroup?.oathTune) {
      if (replaceAppliedOathTuneVariant(state.tuneStepIndexBySource[sourceType])) return;
      state.tuneStepIndexBySource[sourceType] = currentIndex;
      renderEnchantTable();
      return;
    }
    const selectedRow = state.dealerSimulatorRecommendations.get(state.dealerSimulator?.selectedRecommendationId || '');
    if (sourceType === 'equipmentTune' && selectedRow?.sourceType === sourceType) {
      const nextRow = getEquipmentTuneVariantRow(state.tuneStepIndexBySource[sourceType]);
      state.dealerSimulator.selectedRecommendationId = nextRow
        ? getDealerSimulatorRecommendationId(nextRow)
        : '';
    }
    if (sourceType === 'oathTune' && selectedRow?.sourceType === sourceType) {
      const nextRow = getOathTuneVariantRow(state.tuneStepIndexBySource[sourceType]);
      state.dealerSimulator.selectedRecommendationId = nextRow
        ? getDealerSimulatorRecommendationId(nextRow)
        : '';
    }
    renderEnchantTable();
    scheduleOpenTunePopoverShift();
  }

  function changeOathDecisionVariantStep(delta, groupKey, maxIndex) {
    const value = Number(delta || 0);
    const maximum = Math.max(0, Number(maxIndex || 0));
    if (!groupKey || !Number.isFinite(value) || value === 0) return;
    freezeRecommendationOrderWhileEditing(groupKey);
    const currentIndex = Number(state.oathDecisionVariantIndexByGroup?.[groupKey] || 0);
    const nextIndex = Math.max(0, Math.min(maximum, currentIndex + value));
    const activeCount = Number(
      getActiveOathAcquisitionCountByVariantGroup(state.dealerSimulator || {}).get(groupKey) || 0,
    );
    if (replaceAppliedOathAcquisitionVariant(groupKey, nextIndex)) {
      state.equipmentTunePopoverOpen = true;
      state.equipmentTunePopoverSource = groupKey;
      scheduleOpenTunePopoverShift();
      return;
    }
    if (activeCount > 0 && nextIndex !== activeCount - 1) {
      state.oathDecisionVariantIndexByGroup = {
        ...(state.oathDecisionVariantIndexByGroup || {}),
        [groupKey]: Math.max(0, activeCount - 1),
      };
      renderEnchantTable();
      return;
    }
    state.oathDecisionVariantIndexByGroup = {
      ...(state.oathDecisionVariantIndexByGroup || {}),
      [groupKey]: nextIndex,
    };
    state.equipmentTunePopoverOpen = true;
    state.equipmentTunePopoverSource = groupKey;
    renderEnchantTable();
    scheduleOpenTunePopoverShift();
  }

  function getRenderedCombinedOathAcquisition(pairKey) {
    return state.renderedOathAcquisitionCombinedRows?.get(pairKey)
      || [...state.dealerSimulatorRecommendations.values()].find((row) => (
      row?.sourceType === 'oathAcquisitionCombined'
      && row.oathAcquisitionPairKey === pairKey
      ))
      || null;
  }

  function getCombinedOathAcquisitionCounts(row) {
    return getActiveOathAcquisitionMethodCounts(
      state.dealerSimulator || {},
      [
        ...(row?.transcendRecommendations || [row?.transcendRecommendation]),
        ...(row?.craftRecommendations || [row?.craftRecommendation]),
      ].filter(Boolean),
    );
  }

  function storeAppliedOathAcquisitionCombinedSnapshot(
    row,
    transcendCount,
    craftCount,
    preservedBaselineSnapshot = null,
  ) {
    const simulator = state.dealerSimulator;
    const pairKey = row?.oathAcquisitionPairKey || '';
    const targetRarity = pairKey.startsWith('oathDecision:')
      ? pairKey.slice('oathDecision:'.length)
      : '';
    const targetGroupKey = targetRarity ? `oathAcquireTarget:${targetRarity}` : '';
    if (!simulator || !pairKey || !targetGroupKey) return;
    const activeSelections = getActiveOathAcquisitionSelections(simulator).filter(
      (selection) => (
        selection?.applyType === 'acquireOathDecision'
        && selection.acquisitionTargetGroupKey === targetGroupKey
      ),
    );
    const previousCombinedSnapshot = activeSelections
      .map((selection) => selection.appliedCombinedRecommendationSnapshot)
      .find((snapshot) => snapshot?.oathAcquisitionPairKey === pairKey);
    const baselineSnapshot = preservedBaselineSnapshot || previousCombinedSnapshot || row;
    const totalCount = Number(transcendCount || 0) + Number(craftCount || 0);
    const effectSnapshot = getOathAcquisitionVariantFromRecommendations(
      baselineSnapshot.transcendRecommendations || [baselineSnapshot.transcendRecommendation],
      totalCount,
    ) || getOathAcquisitionVariantFromRecommendations(
      baselineSnapshot.craftRecommendations || [baselineSnapshot.craftRecommendation],
      totalCount,
    ) || baselineSnapshot;
    const snapshot = {
      ...cloneSimulatorValue(effectSnapshot),
      oathAcquisitionPairKey: pairKey,
      transcendRecommendation: cloneSimulatorValue(baselineSnapshot.transcendRecommendation),
      craftRecommendation: cloneSimulatorValue(baselineSnapshot.craftRecommendation),
      transcendRecommendations: cloneSimulatorValue(baselineSnapshot.transcendRecommendations),
      craftRecommendations: cloneSimulatorValue(baselineSnapshot.craftRecommendations),
      transcendCount,
      craftCount,
      variantCount: totalCount,
    };
    activeSelections.forEach((selection) => {
      selection.appliedCombinedRecommendationSnapshot = cloneSimulatorValue(snapshot);
    });
  }

  function setOathAcquisitionMethodCount(pairKey, method, requestedCount) {
    let combinedRow = getRenderedCombinedOathAcquisition(pairKey);
    if (!combinedRow) return false;
    const recommendations = method === 'craft'
      ? combinedRow.craftRecommendations || [combinedRow.craftRecommendation]
      : combinedRow.transcendRecommendations || [combinedRow.transcendRecommendation];
    const recommendation = recommendations.find(Boolean);
    const groupKey = recommendation?.variantGroupKey;
    const desiredCount = Number(requestedCount || 0);
    if (!groupKey || !Number.isInteger(desiredCount) || desiredCount < 0) return false;
    const currentCount = Number(getCombinedOathAcquisitionCounts(combinedRow)[method] || 0);
    if (currentCount === desiredCount) return true;
    if (desiredCount === 0) {
      const activeVariant = getOathAcquisitionVariantFromRecommendations(recommendations, currentCount);
      if (!activeVariant) return false;
      removeActiveOathAcquisitionRecommendation(getDealerSimulatorRecommendationId(activeVariant));
    } else if (currentCount > 0) {
      if (!replaceAppliedOathAcquisitionVariant(groupKey, desiredCount - 1)) return false;
    } else {
      let targetVariant = getOathAcquisitionVariantFromRecommendations(recommendations, desiredCount);
      if (!targetVariant && state.dealerSimulator?.role === 'buffer') {
        const sourceRows = method === 'craft'
          ? getOathTranscendRows(
            state.currentOathCraftRecommendations,
            state.upgradeMaterialPrices,
            'oathCraft',
          )
          : getOathTranscendRows(
            state.currentOathTranscendRecommendations,
            state.upgradeMaterialPrices,
          );
        const sourceVariant = sourceRows.find((variant) => (
          variant?.variantGroupKey === groupKey
          && Number(variant.variantCount || 1) === desiredCount
        ));
        targetVariant = sourceVariant
          ? adaptOathAcquisitionRecommendation(sourceVariant, state.dealerSimulator)
          : null;
      }
      if (!targetVariant) return false;
      const targetRecommendationId = getDealerSimulatorRecommendationId(targetVariant);
      if (!state.dealerSimulatorRecommendations.has(targetRecommendationId)) {
        state.dealerSimulatorRecommendations.set(targetRecommendationId, targetVariant);
      }
      applyDealerSimulatorRecommendation(targetRecommendationId);
    }
    combinedRow = getRenderedCombinedOathAcquisition(pairKey);
    return Boolean(
      combinedRow
      && Number(getCombinedOathAcquisitionCounts(combinedRow)[method] || 0) === desiredCount
    );
  }

  function redistributeActiveOathAcquisitionMethods(row, transcendCount, craftCount) {
    const simulator = state.dealerSimulator;
    if (!simulator || !row) return false;
    const previousTunedOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const activeOathTune = cloneSimulatorValue(
      simulator.activeSelectionByGroup?.oathTune || null,
    );
    const targetRarity = String(
      row.transcendRecommendation?.targetRarity
      || row.craftRecommendation?.targetRarity
      || row.targetRarity
      || row.itemRarity
      || '',
    ).trim();
    const acquisitionTargetGroupKey = targetRarity ? `oathAcquireTarget:${targetRarity}` : '';
    if (!acquisitionTargetGroupKey) return false;
    const activeEntries = getActiveOathAcquisitionSelectionEntries(simulator)
      .filter(({ selection }) => (
        selection?.applyType === 'acquireOathDecision'
        && (
          selection.acquisitionTargetGroupKey === acquisitionTargetGroupKey
          || String(
            selection.targetDecision?.targetRarity
            || selection.targetDecision?.itemRarity
            || '',
          ).trim() === targetRarity
        )
      ))
      .map(({ exclusiveGroupKey, selection }) => [exclusiveGroupKey, selection])
      .sort((a, b) => (
        getOathAcquisitionSlotIndex(a[1], a[0]) - getOathAcquisitionSlotIndex(b[1], b[0])
      ));
    const totalCount = Number(transcendCount || 0) + Number(craftCount || 0);
    if (!totalCount || activeEntries.length !== totalCount) return false;

    const resolveVariant = (method, count) => {
      if (count <= 0) return null;
      const recommendations = method === 'craft'
        ? row.craftRecommendations || [row.craftRecommendation]
        : row.transcendRecommendations || [row.transcendRecommendation];
      const renderedVariant = getOathAcquisitionVariantFromRecommendations(recommendations, count);
      if (renderedVariant) return renderedVariant;
      const sourceRows = method === 'craft'
        ? getOathTranscendRows(
          state.currentOathCraftRecommendations,
          state.upgradeMaterialPrices,
          'oathCraft',
        )
        : getOathTranscendRows(
          state.currentOathTranscendRecommendations,
          state.upgradeMaterialPrices,
        );
      return sourceRows.find((variant) => (
        String(variant.targetRarity || variant.itemRarity || '').trim() === targetRarity
        && Number(variant.variantCount || 1) === Number(count)
      )) || null;
    };
    const transcendVariant = resolveVariant('transcend', Number(transcendCount || 0));
    const craftVariant = resolveVariant('craft', Number(craftCount || 0));
    if ((transcendCount > 0 && !transcendVariant) || (craftCount > 0 && !craftVariant)) return false;

    if (activeOathTune?.actionType === 'oathTunePlan') {
      simulator.simulatedOathUpgrades = cloneSimulatorValue(
        activeOathTune.beforeTuneSnapshot || simulator.simulatedOathUpgrades || {},
      );
      delete simulator.activeSelectionByGroup.oathTune;
      if (simulator.role === 'buffer') delete simulator.oathTuneChangesBySource.oathTune;
    }

    const currentTranscend = activeEntries.filter(([, selection]) => selection.acquisitionMethod === 'transcend');
    const currentCraft = activeEntries.filter(([, selection]) => selection.acquisitionMethod === 'craft');
    const nextTranscend = currentTranscend.slice(0, transcendCount);
    const nextCraft = currentCraft.slice(0, craftCount);
    const unassigned = activeEntries.filter((entry) => (
      !nextTranscend.includes(entry) && !nextCraft.includes(entry)
    ));
    while (nextTranscend.length < transcendCount) nextTranscend.push(unassigned.shift());
    while (nextCraft.length < craftCount) nextCraft.push(unassigned.shift());
    if (nextTranscend.some((entry) => !entry) || nextCraft.some((entry) => !entry)) return false;

    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    const changedMethodSlots = new Set();
    const updateSelections = (entries, method, variant) => {
      const plan = variant?.decisionPlan || [];
      entries.forEach(([groupKey, selection], index) => {
        const priceEntry = plan[index] || plan[plan.length - 1] || {};
        const goldWithoutMaterials = getOathAcquisitionEntryGold(priceEntry, false);
        const goldWithMaterials = getOathAcquisitionEntryGold(priceEntry, true);
        const targetItemId = String(selection.targetItemId || selection.targetDecision?.targetItemId || '');
        if (selection.acquisitionMethod !== method) {
          const slotIndex = getOathAcquisitionSlotIndex(selection, groupKey);
          changedMethodSlots.add(`oath:${slotIndex}`);
        }
        selection.acquisitionMethod = method;
        selection.acquisitionVariantGroupKey = variant.variantGroupKey || '';
        selection.acquisitionActionId = getDealerSimulatorRecommendationId(variant);
        selection.candidateSignature = [groupKey, method, targetItemId].join(':');
        selection.appliedGold = includeMaterialCosts ? goldWithMaterials : goldWithoutMaterials;
        selection.includeMaterialCost = includeMaterialCosts;
        selection.goldWithoutMaterials = goldWithoutMaterials;
        selection.goldWithMaterials = goldWithMaterials;
        selection.materials = cloneSimulatorValue(priceEntry.materials || []);
        selection.appliedRecommendationSnapshot = cloneSimulatorValue(variant);
      });
      state.oathDecisionVariantIndexByGroup = {
        ...(state.oathDecisionVariantIndexByGroup || {}),
        [variant?.variantGroupKey]: Math.max(0, entries.length - 1),
      };
    };
    if (nextTranscend.length) updateSelections(nextTranscend, 'transcend', transcendVariant);
    if (nextCraft.length) updateSelections(nextCraft, 'craft', craftVariant);
    if (
      activeOathTune?.actionType === 'oathTunePlan'
      && !reapplyOathTuneSelectionToCurrentState(activeOathTune)
    ) return false;
    simulator.totalGold = getDealerSimulatorTotalGold(simulator, includeMaterialCosts);
    syncOathAcquisitionVariantIndexes(true);
    changedMethodSlots.forEach(triggerDealerSimulatorSweep);
    if (activeOathTune?.actionType === 'oathTunePlan') {
      getChangedOathTuneSlots(previousTunedOath, simulator.simulatedOathUpgrades)
        .forEach(triggerDealerSimulatorSweep);
    }
    return true;
  }

  function replaceCombinedOathAcquisitionTotalPlan(row, totalCount) {
    const simulator = state.dealerSimulator;
    if (!simulator || !row || totalCount <= 0) return false;
    const previousOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const allRecommendations = [
      ...(row.transcendRecommendations || [row.transcendRecommendation]),
      ...(row.craftRecommendations || [row.craftRecommendation]),
    ].filter(Boolean);
    const seedVariant = getOathAcquisitionVariantFromRecommendations(
      allRecommendations,
      totalCount,
    );
    if (!seedVariant) return false;
    const activePairGroupKeys = Object.entries(simulator.activeSelectionByGroup || {})
      .filter(([, selection]) => (
        selection?.applyType === 'acquireOathDecision'
        && getOathAcquisitionCombinedPairKey({
          sourceType: selection.acquisitionMethod === 'craft' ? 'oathCraft' : 'oathTranscend',
          targetRarity: selection.targetDecision?.targetRarity
            || selection.targetDecision?.itemRarity
            || row.targetRarity
            || row.itemRarity,
        }) === row.oathAcquisitionPairKey
      ))
      .map(([groupKey]) => groupKey);
    const variantWithCurrentPlanReplaced = {
      ...seedVariant,
      replacedAcquisitionGroupKeys: [
        ...new Set([
          ...(seedVariant.replacedAcquisitionGroupKeys || []),
          ...activePairGroupKeys,
        ]),
      ],
    };
    const adaptedVariant = simulator.role === 'buffer'
      ? adaptOathAcquisitionRecommendation(variantWithCurrentPlanReplaced, simulator)
      : variantWithCurrentPlanReplaced;
    if (!adaptedVariant) return false;
    const targetRow = {
      ...adaptedVariant,
      replacedAcquisitionGroupKeys: [
        ...new Set([
          ...(adaptedVariant.replacedAcquisitionGroupKeys || []),
          ...activePairGroupKeys,
        ]),
      ],
    };
    const target = resolveDealerSimulatorTarget(targetRow);
    if (!target || !applySimulatedOathAcquisition(targetRow, target)) return false;
    const actionId = getDealerSimulatorRecommendationId(targetRow);
    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    const appliedDescriptors = setActiveOathAcquisitionSelections(
      targetRow,
      target,
      actionId,
      includeMaterialCosts,
    );
    if (!appliedDescriptors.length) return false;
    simulator.lastChangedTarget = target;
    getChangedOathTuneSlots(
      previousOath,
      simulator.simulatedOathUpgrades,
    ).forEach(triggerDealerSimulatorSweep);
    return true;
  }

  function applyOathAcquisitionCombinedCounts(pairKey, transcendCount, craftCount) {
    const simulator = state.dealerSimulator;
    const row = getRenderedCombinedOathAcquisition(pairKey);
    if (!simulator || !row || simulator.applyingRecommendationId) return false;
    const nextTranscendCount = Number(transcendCount || 0);
    const nextCraftCount = Number(craftCount || 0);
    const maxDecisionCount = Number(row.maxDecisionCount || 0);
    if (
      !Number.isInteger(nextTranscendCount)
      || !Number.isInteger(nextCraftCount)
      || nextTranscendCount < 0
      || nextCraftCount < 0
      || nextTranscendCount + nextCraftCount > maxDecisionCount
    ) return false;
    const rollbackSnapshot = createSimulatorSnapshot();
    const previousPreview = cloneSimulatorValue(
      state.oathAcquisitionCombinedCountsByPair?.[pairKey] || null,
    );
    const previousSelectionId = simulator.selectedRecommendationId;
    state.oathAcquisitionCombinedCountsByPair = {
      ...(state.oathAcquisitionCombinedCountsByPair || {}),
      [pairKey]: { transcend: nextTranscendCount, craft: nextCraftCount },
    };
    try {
      const currentCounts = getCombinedOathAcquisitionCounts(row);
      const currentTotalCount = currentCounts.transcend + currentCounts.craft;
      const nextTotalCount = nextTranscendCount + nextCraftCount;
      const preservedCombinedSnapshot = Object.values(simulator.activeSelectionByGroup || {})
        .map((selection) => selection?.appliedCombinedRecommendationSnapshot)
        .find((snapshot) => snapshot?.oathAcquisitionPairKey === pairKey) || null;
      if (nextTotalCount > 0 && currentTotalCount !== nextTotalCount) {
        if (!replaceCombinedOathAcquisitionTotalPlan(row, nextTotalCount)) {
          throw new Error('oath acquisition total plan replacement failed');
        }
        const finalRow = getRenderedCombinedOathAcquisition(pairKey) || row;
        if (!redistributeActiveOathAcquisitionMethods(
          finalRow,
          nextTranscendCount,
          nextCraftCount,
        )) throw new Error('oath acquisition method redistribution failed');
        storeAppliedOathAcquisitionCombinedSnapshot(
          row,
          nextTranscendCount,
          nextCraftCount,
          preservedCombinedSnapshot,
        );
        simulator.selectedRecommendationId = `applied-oath-combined:${pairKey}`;
        state.enchantLoadoutTab = 'oath';
        renderEnchantCharacterPortrait();
        renderEnchantTable();
        scheduleOpenTunePopoverShift();
        return true;
      }
      const activeTargetCount = Object.values(simulator.activeSelectionByGroup || {}).filter(
        (selection) => (
          selection?.applyType === 'acquireOathDecision'
          && getOathAcquisitionCombinedPairKey({
            sourceType: selection.acquisitionMethod === 'craft' ? 'oathCraft' : 'oathTranscend',
            targetRarity: selection.targetDecision?.targetRarity
              || selection.targetDecision?.itemRarity
              || row.targetRarity
              || row.itemRarity,
          }) === pairKey
        ),
      ).length;
      if (
        nextTotalCount > 0
        && (currentTotalCount === nextTotalCount || activeTargetCount === nextTotalCount)
      ) {
        if (!redistributeActiveOathAcquisitionMethods(
          row,
          nextTranscendCount,
          nextCraftCount,
        )) throw new Error('oath acquisition method redistribution failed');
        storeAppliedOathAcquisitionCombinedSnapshot(
          row,
          nextTranscendCount,
          nextCraftCount,
        );
        simulator.selectedRecommendationId = `applied-oath-combined:${pairKey}`;
        renderEnchantCharacterPortrait();
        renderEnchantTable();
        scheduleOpenTunePopoverShift();
        return true;
      }
      const reductions = [
        ['transcend', nextTranscendCount, currentCounts.transcend],
        ['craft', nextCraftCount, currentCounts.craft],
      ].filter(([, desired, current]) => desired < current);
      const increases = [
        ['transcend', nextTranscendCount, currentCounts.transcend],
        ['craft', nextCraftCount, currentCounts.craft],
      ].filter(([, desired, current]) => desired > current);
      for (const [method, desired] of [...reductions, ...increases]) {
        if (!setOathAcquisitionMethodCount(pairKey, method, desired)) throw new Error('oath acquisition count update failed');
      }
      const finalRow = getRenderedCombinedOathAcquisition(pairKey);
      const finalCounts = getCombinedOathAcquisitionCounts(finalRow);
      if (
        finalCounts.transcend !== nextTranscendCount
        || finalCounts.craft !== nextCraftCount
      ) throw new Error('oath acquisition count mismatch');
      simulator.selectedRecommendationId = nextTranscendCount + nextCraftCount > 0
        ? `applied-oath-combined:${pairKey}`
        : '';
      renderEnchantTable();
      scheduleOpenTunePopoverShift();
      return true;
    } catch {
      restoreSimulatorSnapshot(rollbackSnapshot);
      if (previousPreview) {
        state.oathAcquisitionCombinedCountsByPair[pairKey] = previousPreview;
      } else {
        delete state.oathAcquisitionCombinedCountsByPair[pairKey];
      }
      simulator.selectedRecommendationId = previousSelectionId;
      if (simulator.role === 'buffer') rebuildBufferSimulatorCalculationState();
      else rebuildDealerSimulatorCalculationState();
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return false;
    }
  }

  function removeAppliedOathAcquisitionCombined(pairKey) {
    const row = getRenderedCombinedOathAcquisition(pairKey);
    if (!row) return false;
    const targetRarity = pairKey.startsWith('oathDecision:')
      ? pairKey.slice('oathDecision:'.length)
      : '';
    const targetGroupKey = targetRarity ? `oathAcquireTarget:${targetRarity}` : '';
    if (!targetGroupKey) return false;
    const preservedCounts = {
      transcend: Number(row.transcendCount || 0),
      craft: Number(row.craftCount || 0),
    };
    if (!removeActiveOathAcquisitionRecommendation('', targetGroupKey)) return false;
    state.oathAcquisitionCombinedCountsByPair = {
      ...(state.oathAcquisitionCombinedCountsByPair || {}),
      [pairKey]: preservedCounts,
    };
    renderEnchantTable();
    return true;
  }

  function changeOathAcquisitionCombinedCount(delta, pairKey, method) {
    const value = Number(delta || 0);
    const row = getRenderedCombinedOathAcquisition(pairKey);
    if (!row || !['transcend', 'craft'].includes(method) || !Number.isFinite(value) || value === 0) return;
    freezeRecommendationOrderWhileEditing(pairKey);
    const nextCounts = {
      transcend: Number(row.transcendCount || 0),
      craft: Number(row.craftCount || 0),
    };
    nextCounts[method] = Math.max(0, nextCounts[method] + value);
    const maxDecisionCount = Number(row.maxDecisionCount || 0);
    if (nextCounts.transcend + nextCounts.craft > maxDecisionCount) {
      const oppositeMethod = method === 'transcend' ? 'craft' : 'transcend';
      nextCounts[oppositeMethod] = Math.max(
        0,
        nextCounts[oppositeMethod] - (nextCounts.transcend + nextCounts.craft - maxDecisionCount),
      );
    }
    if (nextCounts.transcend + nextCounts.craft === 0) {
      const oppositeMethod = method === 'transcend' ? 'craft' : 'transcend';
      nextCounts[oppositeMethod] = 1;
    }
    if (nextCounts.transcend + nextCounts.craft > maxDecisionCount) return;
    state.equipmentTunePopoverOpen = true;
    state.equipmentTunePopoverSource = pairKey;
    if (row.previewOnly === true) {
      state.oathAcquisitionCombinedCountsByPair = {
        ...(state.oathAcquisitionCombinedCountsByPair || {}),
        [pairKey]: nextCounts,
      };
      renderEnchantTable();
      scheduleOpenTunePopoverShift();
      return;
    }
    const activeCounts = getCombinedOathAcquisitionCounts(row);
    if (activeCounts.transcend + activeCounts.craft > 0) {
      applyOathAcquisitionCombinedCounts(pairKey, nextCounts.transcend, nextCounts.craft);
      return;
    }
    state.oathAcquisitionCombinedCountsByPair = {
      ...(state.oathAcquisitionCombinedCountsByPair || {}),
      [pairKey]: nextCounts,
    };
    renderEnchantTable();
    scheduleOpenTunePopoverShift();
  }

  els.enchantRecommendList?.addEventListener('mouseover', (event) => {
    const step = event.target.closest('.enchant-recommend-step-tune');
    if (!step) {
      scheduleRecommendPopoverShift(event.target);
      return;
    }
    const sourceType = step.dataset.tuneSource || 'equipmentTune';
    freezeRecommendationOrderWhileEditing(sourceType);
    if (state.equipmentTunePopoverOpen && state.equipmentTunePopoverSource === sourceType) {
      scheduleRecommendPopoverShift(step);
      return;
    }
    state.equipmentTunePopoverOpen = true;
    state.equipmentTunePopoverSource = sourceType;
    renderEnchantTable();
    scheduleOpenTunePopoverShift();
  });

  els.enchantRecommendList?.addEventListener('mouseout', (event) => {
    if (isLeavingRecommendPopoverHost(event)) {
      resetRecommendPopoverShift(event.target);
    }
    const step = event.target.closest('.enchant-recommend-step-tune');
    if (!step) return;
    const related = event.relatedTarget;
    if (related && step.contains(related)) return;
    if (!state.equipmentTunePopoverOpen) return;
    state.equipmentTunePopoverOpen = false;
    state.equipmentTunePopoverSource = '';
    if (state.dealerSimulator) state.dealerSimulator.selectedRecommendationId = '';
    releaseRecommendationOrderAfterEditing();
    renderEnchantTable();
  });

  els.enchantRecommendList?.addEventListener('focusin', (event) => {
    const step = event.target.closest('.enchant-recommend-step-tune');
    if (step) {
      const sourceType = step.dataset.tuneSource || 'equipmentTune';
      freezeRecommendationOrderWhileEditing(sourceType);
      state.equipmentTunePopoverOpen = true;
      state.equipmentTunePopoverSource = sourceType;
    }
    scheduleRecommendPopoverShift(event.target);
  });

  els.enchantRecommendList?.addEventListener('focusout', (event) => {
    if (isLeavingRecommendPopoverHost(event)) {
      resetRecommendPopoverShift(event.target);
      const step = event.target.closest('.enchant-recommend-step-tune');
      if (step) {
        const sourceType = step.dataset.tuneSource || 'equipmentTune';
        window.requestAnimationFrame(() => {
          if (state.equipmentTunePopoverSource !== sourceType) return;
          const editingStep = [...(els.enchantRecommendList?.querySelectorAll('.enchant-recommend-step-tune') || [])]
            .find((candidate) => (
              candidate.dataset.tuneSource === sourceType
              && (
                candidate.matches(':hover')
                || candidate.contains(document.activeElement)
                || candidate.querySelector('.enchant-recommend-item.is-touch-selected')
              )
            ));
          if (editingStep) return;
          state.equipmentTunePopoverOpen = false;
          state.equipmentTunePopoverSource = '';
          if (state.dealerSimulator) state.dealerSimulator.selectedRecommendationId = '';
          releaseRecommendationOrderAfterEditing();
          renderEnchantTable();
        });
      }
    }
  });

  els.enchantRecommendList?.addEventListener('pointerup', (event) => {
    if (!['touch', 'pen'].includes(event.pointerType)) return;
    const target = event.target.closest('[data-simulator-recommendation-id], [data-applied-simulator-group], [data-applied-oath-acquisition-id], [data-oath-acquisition-combined-key]');
    if (
      !target ||
      event.target.closest('[data-equipment-tune-step]') ||
      event.target.closest('[data-recommendation-variant-step]') ||
      event.target.closest('[data-oath-combined-step]') ||
      event.target.closest('.enchant-recommend-popover')
    ) return;
    event.preventDefault();
    event.stopPropagation();
    state.dealerSimulatorSuppressClickUntil = Date.now() + 700;
    const tuneStep = target.closest('.enchant-recommend-step-tune');
    if (tuneStep) {
      const sourceType = tuneStep.dataset.tuneSource || 'equipmentTune';
      freezeRecommendationOrderWhileEditing(sourceType);
      state.equipmentTunePopoverOpen = true;
      state.equipmentTunePopoverSource = sourceType;
    }
    const appliedGroupKey = String(target.dataset.appliedSimulatorGroup || '');
    const appliedOathAcquisitionId = String(target.dataset.appliedOathAcquisitionId || '');
    const combinedPairKey = String(target.dataset.oathAcquisitionCombinedKey || '');
    const recommendationId = String(target.dataset.simulatorRecommendationId || '');
    const combinedRow = combinedPairKey ? getRenderedCombinedOathAcquisition(combinedPairKey) : null;
    const combinedCounts = combinedRow ? getCombinedOathAcquisitionCounts(combinedRow) : null;
    const combinedIsApplied = Number(combinedCounts?.transcend || 0) + Number(combinedCounts?.craft || 0) > 0;
    const selectionId = combinedPairKey
      ? combinedIsApplied ? `applied-oath-combined:${combinedPairKey}` : recommendationId
      : appliedOathAcquisitionId
      ? `applied-oath:${appliedOathAcquisitionId}`
      : appliedGroupKey ? `applied:${appliedGroupKey}` : recommendationId;
    if (!selectionId || !state.dealerSimulator) return;
    if (state.dealerSimulator.selectedRecommendationId === selectionId) {
      if (combinedPairKey && combinedRow) {
        if (combinedIsApplied) {
          removeAppliedOathAcquisitionCombined(combinedPairKey);
        } else {
          applyOathAcquisitionCombinedCounts(
            combinedPairKey,
            Number(combinedRow.transcendCount || 0),
            Number(combinedRow.craftCount || 0),
          );
        }
        return;
      }
      if (appliedOathAcquisitionId) {
        removeActiveOathAcquisitionRecommendation(appliedOathAcquisitionId);
        return;
      }
      if (appliedGroupKey) {
        removeActiveSimulatorSelection(appliedGroupKey);
        return;
      }
      applyActiveSimulatorRecommendation(recommendationId);
      return;
    }
    state.dealerSimulator.selectedRecommendationId = selectionId;
    renderEnchantTable();
    const selected = els.enchantRecommendList?.querySelector('.enchant-recommend-item.is-touch-selected');
    scheduleRecommendPopoverShift(selected);
  });

  els.enchantRecommendList?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-equipment-tune-step]');
    if (target) {
      event.preventDefault();
      event.stopPropagation();
      if (target.classList.contains('is-disabled')) return;
      changeEquipmentTuneStep(Number(target.dataset.equipmentTuneStep || 0), target.dataset.tuneSource || 'equipmentTune');
      return;
    }
    const variantTarget = event.target.closest('[data-recommendation-variant-step]');
    if (variantTarget) {
      event.preventDefault();
      event.stopPropagation();
      if (variantTarget.classList.contains('is-disabled')) return;
      changeOathDecisionVariantStep(
        Number(variantTarget.dataset.recommendationVariantStep || 0),
        String(variantTarget.dataset.variantGroup || ''),
        Number(variantTarget.dataset.variantMax || 0),
      );
      return;
    }
    const combinedStepTarget = event.target.closest('[data-oath-combined-step]');
    if (combinedStepTarget) {
      event.preventDefault();
      event.stopPropagation();
      if (combinedStepTarget.classList.contains('is-disabled')) return;
      changeOathAcquisitionCombinedCount(
        Number(combinedStepTarget.dataset.oathCombinedStep || 0),
        String(combinedStepTarget.dataset.oathCombinedPair || ''),
        String(combinedStepTarget.dataset.oathCombinedMethod || ''),
      );
      return;
    }
    if (event.target.closest('.enchant-recommend-popover')) return;
    const simulatorTarget = event.target.closest('[data-simulator-recommendation-id], [data-applied-simulator-group], [data-applied-oath-acquisition-id], [data-oath-acquisition-combined-key]');
    if (!simulatorTarget) return;
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() < state.dealerSimulatorSuppressClickUntil) return;
    const precisePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches === true;
    if (!precisePointer && event.detail > 0) return;
    const appliedGroupKey = String(simulatorTarget.dataset.appliedSimulatorGroup || '');
    const appliedOathAcquisitionId = String(simulatorTarget.dataset.appliedOathAcquisitionId || '');
    const combinedPairKey = String(simulatorTarget.dataset.oathAcquisitionCombinedKey || '');
    if (combinedPairKey) {
      const row = getRenderedCombinedOathAcquisition(combinedPairKey);
      if (!row) return;
      const activeCounts = getCombinedOathAcquisitionCounts(row);
      const isApplied = activeCounts.transcend + activeCounts.craft > 0;
      if (isApplied) {
        removeAppliedOathAcquisitionCombined(combinedPairKey);
      } else {
        applyOathAcquisitionCombinedCounts(
          combinedPairKey,
          Number(row.transcendCount || 0),
          Number(row.craftCount || 0),
        );
      }
      return;
    }
    if (appliedOathAcquisitionId) {
      removeActiveOathAcquisitionRecommendation(appliedOathAcquisitionId);
      return;
    }
    if (appliedGroupKey) {
      removeActiveSimulatorSelection(appliedGroupKey);
      return;
    }
    applyActiveSimulatorRecommendation(String(simulatorTarget.dataset.simulatorRecommendationId || ''));
  });

  els.enchantRecommendList?.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const target = event.target.closest('[data-equipment-tune-step]');
    const variantTarget = event.target.closest('[data-recommendation-variant-step]');
    const combinedStepTarget = event.target.closest('[data-oath-combined-step]');
    if (!target && !variantTarget && !combinedStepTarget) return;
    event.preventDefault();
    event.stopPropagation();
    if (target) {
      if (target.classList.contains('is-disabled')) return;
      changeEquipmentTuneStep(Number(target.dataset.equipmentTuneStep || 0), target.dataset.tuneSource || 'equipmentTune');
      return;
    }
    if (combinedStepTarget) {
      if (combinedStepTarget.classList.contains('is-disabled')) return;
      changeOathAcquisitionCombinedCount(
        Number(combinedStepTarget.dataset.oathCombinedStep || 0),
        String(combinedStepTarget.dataset.oathCombinedPair || ''),
        String(combinedStepTarget.dataset.oathCombinedMethod || ''),
      );
      return;
    }
    if (variantTarget.classList.contains('is-disabled')) return;
    changeOathDecisionVariantStep(
      Number(variantTarget.dataset.recommendationVariantStep || 0),
      String(variantTarget.dataset.variantGroup || ''),
      Number(variantTarget.dataset.variantMax || 0),
    );
  });

  els.enchantSimulatorActions?.addEventListener('click', (event) => {
    const simulatorAction = event.target.closest('[data-dealer-simulator-action]');
    if (!simulatorAction) return;
    event.preventDefault();
    event.stopPropagation();
    if (simulatorAction.dataset.dealerSimulatorAction === 'reset') clearDealerSimulator();
  });

  bindEnchantLoadoutNavigation();

  document.addEventListener('pointerdown', (event) => {
    if (
      !state.dealerSimulator?.selectedRecommendationId
      && !state.equipmentTunePopoverOpen
    ) return;
    if (event.target.closest?.('.enchant-recommend-item')) return;
    closeDealerSimulatorSelection();
  });

  Object.assign(ctx.actions, {
    loadEnchantCards,
    loadCurrentEnchants,
    loadCurrentCreature,
    loadCurrentTitle,
    loadCurrentAura,
    loadCurrentAvatar,
    loadCurrentCharacterPreview,
    loadCurrentCharacterLoadout,
    searchEnchantCharacter,
    showEnchantAnalysisLoading,
    showEnchantCandidateLoading,
    renderEnchantCharacterPortrait,
    renderEnchantTable,
    renderEnchantRecommendations,
  });

  renderEnchantCharacterPortrait();
  renderEnchantIncludeControls();
  renderEfficiencyLegend();
}
