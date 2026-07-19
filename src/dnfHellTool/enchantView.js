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
import { createEnchantOathProgression } from './enchantOathProgression.js';

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
const AVATAR_EQUIPMENT_SCORE_RED_SLOT_IDS = new Set(['HEADGEAR', 'HAIR', 'WEAPON', 'AURORA', 'SKIN']);
const AVATAR_EQUIPMENT_SCORE_GREEN_YELLOW_SLOT_IDS = new Set(['FACE', 'BREAST', 'JACKET', 'PANTS']);
const AVATAR_EQUIPMENT_SCORE_STAT_BY_GRADE = {
  red: { shining: 10, ornate: 17, brilliant: 25 },
  greenYellow: { shining: 0, ornate: 10, brilliant: 15 },
};
const BUFF_LOADOUT_SLOT_NAME_ALIASES = {
  벨트: '허리',
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
const MATERIAL_ENCHANT_SLOT_ORDER = [
  '무기',
  '상의',
  '하의',
  '머리어깨',
  '벨트',
  '신발',
  '목걸이',
  '팔찌',
  '반지',
  '보조장비',
  '마법석',
  '귀걸이',
];
const BUFFER_SCORE_CONFIG = {
  maleCrusader: {
    jobCoefficient: 1.0188, buffMultiplier: 1.12,
  },
  femaleCrusader: {
    jobCoefficient: 1.016, buffMultiplier: 1.12,
  },
  enchantress: {
    jobCoefficient: 0.9765, buffMultiplier: 1.155,
  },
  muse: {
    jobCoefficient: 1.0177, buffMultiplier: 1.10,
  },
  paramedic: {
    jobCoefficient: 1.025, buffMultiplier: 1.12,
  },
};
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
const EQUIPMENT_TUNE_MIN_SET_POINT = 2550;
const EQUIPMENT_TUNE_STEP_POINT = 10;
const EQUIPMENT_TUNE_MEMORY_POINT = 70;
const EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE = 2;
const EQUIPMENT_TUNE_MEMORY_BUFF_POWER = 400;
const EQUIPMENT_TUNE_MAX_LEVEL = 3;
const EQUIPMENT_TUNE_COST_BY_RARITY = {
  레전더리: { gold: 600000, materialKey: 'legendarySoul', materialAmount: 20, order: 0 },
  에픽: { gold: 1000000, materialKey: 'epicSoul', materialAmount: 10, order: 1 },
};
const EQUIPMENT_TUNE_SLOT_ORDER = [
  '머리어깨',
  '상의',
  '하의',
  '벨트',
  '신발',
  '무기',
  '팔찌',
  '목걸이',
  '보조장비',
  '반지',
  '귀걸이',
  '마법석',
];
const BLACK_FANG_SIMULATOR_SLOTS = new Set(['목걸이', '팔찌', '반지']);
const TUNE_SOURCE_TYPES = new Set(['equipmentTune', 'oathTune']);
const OATH_DECISION_VARIANT_SOURCE_TYPES = new Set(['oathTranscend', 'oathCraft']);
const ENCHANT_DAMAGE_BASELINE = {
  stat: 6500,
  baseStat: 800,
  element: 330,
  attack: 4000,
  attackIncrease: 0,
  attackAmplification: 0,
};
const REGION_STAT_FLAT_A = 168350;
const REGION_STAT_FLAT_B = 297900;
const REGION_STAT_SCALE = 3.08;
const REGION_STAT_OFFSET = 2886;
const REGION_ATTACK_FLAT = 31215;
const ELEMENT_DAMAGE_PER_ELEMENT = 0.45;
const ELEMENT_BASE_DAMAGE_PERCENT = 5;

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
  if (!includeMaterialCosts || !['upgrade', 'blackFang', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'oathAcquisitionCombined'].includes(row?.sourceType)) return baseGold;
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

function formatRoleRelevantEquipmentEffects(effects = {}, isBuffer = false) {
  return formatEffects(Object.fromEntries(
    Object.entries(getRoleRelevantEffects(effects, isBuffer)),
  ));
}

function getFilteredExplainSegments(text = '') {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[•●]/g, '·')
    .trim();
  if (!normalized) return [];
  return normalized
    .split(/\s*[·|/]\s*/)
    .map((part) => part
      .replace(/\d+(?:\s*~\s*\d+)?\s*(?:Lv|레벨)[^%]*?액티브\s*스킬[^%]*?\d+(?:\.\d+)?%\s*증가/ig, '')
      .replace(/최종\s*데미지\s*\d+(?:\.\d+)?%\s*증가/ig, '')
      .replace(/물리크리티컬|마법크리티컬|크리티컬/ig, '')
      .replace(/^[,:·/\s]+|[,:·/\s]+$/g, '')
      .trim())
    .filter(Boolean)
    .filter((part) => part !== '% 증가');
}

function getExplainDetailText(text = '') {
  return getFilteredExplainSegments(text).join(' / ');
}

function subtractDetailEffects(base = {}, removed = {}) {
  const result = {};
  [...new Set([...Object.keys(base || {}), ...Object.keys(removed || {})])].forEach((key) => {
    const value = Number(base?.[key] || 0) - Number(removed?.[key] || 0);
    if (Number.isFinite(value) && Math.abs(value) > 0.000001) {
      result[key] = value;
    }
  });
  return result;
}

function formatEffectSummary(prefix, effects = {}) {
  const text = formatEffects(effects);
  return `${prefix}: ${text || '없음'}`;
}

function formatTuneState(equipment = {}) {
  const level = Number(equipment.tuneLevel || 0);
  const setPoint = Number(equipment.tuneSetPoint || 0);
  if (!Number.isFinite(setPoint) || setPoint <= 0) return '';
  return `조율 ${Number.isFinite(level) ? level : 0}회`;
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

function getDealerPrimaryStatKey(baseline = {}) {
  if (baseline?.statName === '힘') return 'str';
  if (baseline?.statName === '지능') return 'int';
  return '';
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

function getDamageBaseline(baseline = {}) {
  baseline = baseline || {};
  const stat = Number(baseline.stat || 0) || ENCHANT_DAMAGE_BASELINE.stat;
  const baseStat = Number(baseline.baseStat || 0) || ENCHANT_DAMAGE_BASELINE.baseStat;
  const elementNames = Array.isArray(baseline.elementNames)
    ? baseline.elementNames.filter(Boolean)
    : (baseline.elementName ? [baseline.elementName] : []);
  const elementValues = Object.fromEntries(Object.keys(ELEMENT_EFFECT_KEY_BY_NAME)
    .map((element) => [element, Number(baseline.elementValues?.[element] || 0)]));
  return {
    stat,
    statName: baseline.statName === '지능' ? '지능' : '힘',
    baseStat,
    element: Number(baseline.element || 0) || ENCHANT_DAMAGE_BASELINE.element,
    elementName: elementNames[0] || '',
    elementNames,
    elementValues,
    elementDamage: Number.isFinite(Number(baseline.elementDamage))
      ? Number(baseline.elementDamage)
      : ELEMENT_BASE_DAMAGE_PERCENT + (Number(baseline.element || 0) || ENCHANT_DAMAGE_BASELINE.element) * ELEMENT_DAMAGE_PER_ELEMENT,
    attack: Number(baseline.attack || 0) || ENCHANT_DAMAGE_BASELINE.attack,
    attackSource: String(baseline.attackSource || '').trim(),
    finalDamage: Number(baseline.finalDamage || 0),
    attackIncrease: Number(baseline.attackIncrease || 0) || ENCHANT_DAMAGE_BASELINE.attackIncrease,
    attackAmplification: Number(baseline.attackAmplification || 0) || ENCHANT_DAMAGE_BASELINE.attackAmplification,
  };
}

function getEquipmentScoreEffectiveStat(stat, baseStat) {
  return stat +
    REGION_STAT_FLAT_A +
    REGION_STAT_FLAT_B +
    Math.trunc(REGION_STAT_SCALE * (stat - baseStat) + REGION_STAT_OFFSET);
}

function getSelectedStatEffect(effects = {}, baseline = {}) {
  effects = effects || {};
  baseline = baseline || {};
  if (Number.isFinite(effects.allStat)) return Number(effects.allStat || 0);
  return baseline.statName === '지능'
    ? Number(effects.int || 0)
    : Number(effects.str || 0);
}

function estimateDamagePercent(effects = {}, baseline = {}) {
  effects = effects || {};
  return (estimateDamageMultiplier(effects, baseline) / estimateDamageMultiplier({}, baseline) - 1) * 100;
}

function estimateDamageMultiplier(effects = {}, baseline = {}) {
  effects = effects || {};
  const base = getDamageBaseline(baseline);
  const currentFinalDamageMultiplier = 1 + base.finalDamage / 100;
  const candidateFinalDamageMultiplier = 1 + (base.finalDamage + Number(effects.finalDamage || 0)) / 100;
  const finalDamageMultiplier = candidateFinalDamageMultiplier / currentFinalDamageMultiplier;
  const currentAttackIncreaseMultiplier = 1 + base.attackIncrease / 100;
  const candidateAttackIncreaseMultiplier = 1 + (base.attackIncrease + Number(effects.attackIncrease || 0)) / 100;
  const attackIncreaseMultiplier = candidateAttackIncreaseMultiplier / currentAttackIncreaseMultiplier;
  const currentAttackAmplificationMultiplier = 1 + base.attackAmplification / 100;
  const candidateAttackAmplificationMultiplier = 1 + (base.attackAmplification + Number(effects.attackAmplification || 0)) / 100;
  const attackAmplificationMultiplier = candidateAttackAmplificationMultiplier / currentAttackAmplificationMultiplier;
  const currentElementDamage = base.elementDamage;
  const candidateElementDamage = currentElementDamage + Number(effects.elementAll || 0) * ELEMENT_DAMAGE_PER_ELEMENT;
  const currentElementMultiplier = 1 + currentElementDamage / 100;
  const candidateElementMultiplier = 1 + candidateElementDamage / 100;
  const elementMultiplier = candidateElementMultiplier / currentElementMultiplier;
  const effectiveAttack = base.attack + REGION_ATTACK_FLAT;
  const attackMultiplier = (effectiveAttack + Number(effects.attack || 0)) / effectiveAttack;
  const statValue = getSelectedStatEffect(effects, base);
  const currentEffectiveStat = getEquipmentScoreEffectiveStat(base.stat, base.baseStat);
  const candidateEffectiveStat = getEquipmentScoreEffectiveStat(base.stat + statValue, base.baseStat);
  const statMultiplier = (1 + candidateEffectiveStat / 250) / (1 + currentEffectiveStat / 250);
  const explicitSkillDamageMultiplier = Number(effects.skillDamageMultiplier || 0);
  const skillDamageMultiplier = Number.isFinite(explicitSkillDamageMultiplier) && explicitSkillDamageMultiplier > 0
    ? explicitSkillDamageMultiplier
    : 1;
  return finalDamageMultiplier * attackIncreaseMultiplier * attackAmplificationMultiplier * elementMultiplier * attackMultiplier * statMultiplier * skillDamageMultiplier;
}

function getCostPerPointOnePercent(row, includeMaterialCosts = false) {
  const price = getRecommendationGold(row, includeMaterialCosts);
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(row.incrementalDamagePercent) || row.incrementalDamagePercent <= 0) return 0;
  return price * 0.1 / row.incrementalDamagePercent;
}

function isMaterialAcquisition(row) {
  return Boolean(row?.acquisition?.label);
}

function isFreeActionRecommendation(row) {
  return Boolean(row?.freeAction);
}

function isMaterialEnchantAcquisition(row) {
  return row?.sourceType === 'enchant' && isMaterialAcquisition(row);
}

function getMaterialEnchantMaterialRank(row) {
  const label = row?.acquisition?.materialLabel || row?.acquisition?.materialItemName || row?.tier || '';
  const index = MATERIAL_ENCHANT_MATERIAL_ORDER.findIndex((material) => String(label).includes(material));
  return index >= 0 ? index : MATERIAL_ENCHANT_MATERIAL_ORDER.length;
}

function getMaterialEnchantSlotRank(row) {
  const slot = row?.slot === '어깨' ? '머리어깨' : row?.slot === '보조' ? '보조장비' : row?.slot;
  const index = MATERIAL_ENCHANT_SLOT_ORDER.indexOf(slot);
  return index >= 0 ? index : MATERIAL_ENCHANT_SLOT_ORDER.length;
}

function compareMaterialEnchantOrder(a, b) {
  const materialDiff = getMaterialEnchantMaterialRank(a) - getMaterialEnchantMaterialRank(b);
  if (materialDiff) return materialDiff;
  const slotDiff = getMaterialEnchantSlotRank(a) - getMaterialEnchantSlotRank(b);
  if (slotDiff) return slotDiff;
  return b.incrementalDamagePercent - a.incrementalDamagePercent;
}

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

function getBufferEnchantSkillDelta(row, current, baseline) {
  const jobName = baseline?.jobName || '';
  const candidateSkills = row?.reinforceSkill || [];
  const currentSkills = current?.reinforceSkill || [];
  const hasSkillValue = (info, fields) => fields.some((field) => Number(info?.[field] || 0) !== 0);
  return Object.entries(baseline.currentSelfStatSkills || {}).reduce((changes, [skillName, info]) => {
    const levelDelta = getReinforceSkillLevel(candidateSkills, jobName, [skillName])
      - getReinforceSkillLevel(currentSkills, jobName, [skillName]);
    changes.selfStatSkillDelta += getExactAdjacentSkillValueDelta(info, 'Stat', levelDelta);
    changes.auraStatDelta += getExactAdjacentSkillValueDelta(info, 'PartyStat', levelDelta);
    changes.auraAttackDelta += getExactAdjacentSkillValueDelta(info, 'PartyAttack', levelDelta);
    if (!levelDelta) return changes;
    const hasAuraValue = hasSkillValue(info, [
      'previousPartyStat',
      'currentPartyStat',
      'nextPartyStat',
      'previousPartyAttack',
      'currentPartyAttack',
      'nextPartyAttack',
    ]);
    const hasPrimaryValue = hasSkillValue(info, ['previousStat', 'currentStat', 'nextStat']);
    if (hasAuraValue) {
      changes.auraLevels += levelDelta;
    } else if (hasPrimaryValue) {
      changes.primaryLevels += levelDelta;
    }
    return changes;
  }, { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0, primaryLevels: 0, auraLevels: 0 });
}

const BUFFER_SIMULATOR_CHANGE_KEYS = [
  'statDelta',
  'currentStatDelta',
  'switchingStatDelta',
  'selfStatSkillDelta',
  'buffPowerDelta',
  'currentBuffAmplificationDelta',
  'switchingBuffAmplificationDelta',
  'buffSkillLevelDelta',
  'awakeningSkillLevelDelta',
  'auraStatDelta',
  'auraAttackDelta',
];

function getBufferSkillContributionMap(contributions = []) {
  if (!Array.isArray(contributions)) return null;
  const result = {};
  for (const contribution of contributions) {
    const contextKey = String(contribution?.contextKey || '').trim();
    const levelContribution = Number(contribution?.levelContribution);
    if (!contextKey || !Number.isFinite(levelContribution)) return null;
    result[contextKey] = (result[contextKey] || 0) + levelContribution;
  }
  return result;
}

function normalizeBuffLoadoutEquipmentSlotName(value) {
  const rawSlotName = String(value || '').trim();
  return BUFF_LOADOUT_SLOT_NAME_ALIASES[rawSlotName] || rawSlotName;
}

function hasBuffLoadoutCollection(loadout, collectionName) {
  return Boolean(
    loadout
    && typeof loadout === 'object'
    && Object.prototype.hasOwnProperty.call(loadout, collectionName),
  );
}

function getBufferCurrentSourceScope(scopeSimulator = {}, sourceType = '', targetSlot = '') {
  const loadout = scopeSimulator?.simulatedBuffLoadout || scopeSimulator?.baseBuffLoadout || {};
  if (sourceType === 'title') {
    if (!hasBuffLoadoutCollection(loadout, 'equipment')) {
      return scopeSimulator?.baseBaseline?.switchingTitleUsesCurrent === false ? 'current' : 'shared';
    }
    const hasSeparateTitle = getBuffLoadoutRowsForMetric(loadout.equipment).some((row) => (
      String(row?.slotId || '').trim() === 'TITLE'
      || normalizeBuffLoadoutEquipmentSlotName(row?.slotName) === '칭호'
    ));
    return hasSeparateTitle ? 'current' : 'shared';
  }
  if (sourceType === 'creature') {
    if (!hasBuffLoadoutCollection(loadout, 'creature')) return 'shared';
    return getBuffLoadoutRowsForMetric(loadout.creature).length ? 'current' : 'shared';
  }
  if (sourceType === 'aura') {
    if (!hasBuffLoadoutCollection(loadout, 'avatar')) return 'shared';
    const aura = getBuffLoadoutRowsForMetric(loadout.avatar)
      .find((row) => String(row?.slotId || '').trim() === 'AURORA');
    const source = String(aura?.buffAvatarSource || '').trim();
    if (source === 'wornFallback') return 'shared';
    return ['actual', 'simulatedPackage'].includes(source) ? 'current' : 'shared';
  }
  if (sourceType === 'equipment') {
    const slotName = normalizeBuffLoadoutEquipmentSlotName(targetSlot);
    if (!slotName || !hasBuffLoadoutCollection(loadout, 'equipment')) return 'shared';
    const hasSeparateEquipment = getBuffLoadoutRowsForMetric(loadout.equipment).some((row) => (
      normalizeBuffLoadoutEquipmentSlotName(row?.slotName) === slotName
      || (slotName === '칭호' && String(row?.slotId || '').trim() === 'TITLE')
    ));
    return hasSeparateEquipment ? 'current' : 'shared';
  }
  return 'shared';
}

function scopeBufferCurrentChanges(slotChanges = {}, scope = 'shared') {
  if (scope !== 'current') return slotChanges;
  return {
    ...slotChanges,
    statDelta: 0,
    currentStatDelta: Number(slotChanges.currentStatDelta || 0)
      + Number(slotChanges.statDelta || 0)
      + Number(slotChanges.selfStatSkillDelta || 0),
    switchingStatDelta: 0,
    selfStatSkillDelta: 0,
    switchingBuffAmplificationDelta: 0,
    buffSkillLevelDelta: 0,
    skillContributionScope: 'current',
  };
}

function scopeBufferCurrentChangesBySlot(changesBySlot = {}, scopeSimulator = {}) {
  return Object.fromEntries(Object.entries(changesBySlot || {}).map(([slotName, slotChanges]) => [
    slotName,
    scopeBufferCurrentChanges(
      slotChanges,
      getBufferCurrentSourceScope(scopeSimulator, 'equipment', slotName),
    ),
  ]));
}

function scopeBufferCurrentChangesBySource(changesBySource = {}, scopeSimulator = {}, sourceType = '') {
  const scope = getBufferCurrentSourceScope(scopeSimulator, sourceType);
  return Object.fromEntries(Object.entries(changesBySource || {}).map(([sourceKey, slotChanges]) => [
    sourceKey,
    scopeBufferCurrentChanges(slotChanges, scope),
  ]));
}

function getBufferBaselineSkillContexts(baseline = {}) {
  return Object.entries(baseline.currentSelfStatSkills || {}).reduce((contexts, [skillName, info]) => {
    const contextKey = String(info?.contextKey || '').trim();
    const currentLevel = Number(info?.level);
    if (!contextKey || !Number.isInteger(currentLevel) || currentLevel <= 0) return contexts;
    const hasOwnFiniteValue = (field) => Object.prototype.hasOwnProperty.call(info || {}, field)
      && Number.isFinite(Number(info?.[field]));
    const getAdjacentChanges = (prefix) => {
      const fieldPairs = [
        ['affectsSelfStat', `${prefix}Stat`, 'currentStat', 'selfStatSkillDelta'],
        ['affectsAuraStat', `${prefix}PartyStat`, 'currentPartyStat', 'auraStatDelta'],
        ['affectsAuraAttack', `${prefix}PartyAttack`, 'currentPartyAttack', 'auraAttackDelta'],
      ];
      const changes = {};
      for (const [affectsField, targetField, currentField, changeField] of fieldPairs) {
        if (!info?.[affectsField]) {
          changes[changeField] = 0;
          continue;
        }
        if (!hasOwnFiniteValue(targetField) || !hasOwnFiniteValue(currentField)) return null;
        changes[changeField] = Number(info[targetField]) - Number(info[currentField]);
      }
      return changes;
    };
    const currentChanges = {
      selfStatSkillDelta: 0,
      auraStatDelta: 0,
      auraAttackDelta: 0,
    };
    const previousChanges = currentLevel > 1 ? getAdjacentChanges('previous') : null;
    const nextChanges = getAdjacentChanges('next');
    const netChangesByLevel = {
      ...(previousChanges ? { [String(currentLevel - 1)]: previousChanges } : {}),
      [String(currentLevel)]: currentChanges,
      ...(nextChanges ? { [String(currentLevel + 1)]: nextChanges } : {}),
    };
    const availableLevels = Object.keys(netChangesByLevel).map(Number).filter(Number.isInteger);
    contexts[contextKey] = {
      jobId: info.jobId || '',
      skillId: info.skillId || '',
      skillName,
      currentLevel,
      minReachableLevel: Math.min(...availableLevels),
      maxReachableLevel: Math.max(...availableLevels),
      netChangesByLevel,
    };
    return contexts;
  }, {});
}

function mergeBufferSkillContexts(...contextCollections) {
  return contextCollections.reduce((merged, contexts) => {
    Object.entries(contexts || {}).forEach(([contextKey, context]) => {
      if (!context || typeof context !== 'object') return;
      const previous = merged[contextKey] || {};
      const netChangesByLevel = {
        ...(previous.netChangesByLevel || {}),
        ...(context.netChangesByLevel || {}),
      };
      const levels = Object.keys(netChangesByLevel).map(Number).filter(Number.isInteger);
      merged[contextKey] = {
        ...previous,
        ...cloneSimulatorValue(context),
        minReachableLevel: levels.length ? Math.min(...levels) : context.minReachableLevel,
        maxReachableLevel: levels.length ? Math.max(...levels) : context.maxReachableLevel,
        netChangesByLevel,
      };
    });
    return merged;
  }, {});
}

function resolveBufferNetChanges(
  changesBySlot = {},
  skillContexts = {},
  artifactChangesByType = {},
  upgradeChangesBySlot = {},
  equipmentTuneChangesBySource = {},
  oathTuneChangesBySource = {},
  oathAcquisitionChangesBySource = {},
  blackFangChangesBySlot = {},
  creatureChangesBySource = {},
  auraChangesBySource = {},
  titleChangesBySource = {},
  switchingCreatureChangesBySource = {},
  switchingTitleChangesBySource = {},
  switchingAvatarChangesBySlot = {},
  switchingPlatinumChangesBySlot = {},
  avatarEmblemChangesBySocket = {},
  scopeSimulator = {},
) {
  const resolvedSwitchingPlatinumChangesBySlot = Object.fromEntries(
    Object.entries(switchingPlatinumChangesBySlot || {}).map(([slotId, slotChanges]) => {
      const packageChanges = switchingAvatarChangesBySlot?.[slotId];
      if (!packageChanges) return [slotId, slotChanges];
      const targetPlatinumSkillLevel = Number(slotChanges?.targetPlatinumSkillLevel);
      const packagePlatinumSkillLevel = Number(packageChanges?.targetPlatinumSkillLevel);
      if (!Number.isFinite(targetPlatinumSkillLevel) || !Number.isFinite(packagePlatinumSkillLevel)) {
        throw new TypeError(`Invalid switching platinum contribution: ${slotId}`);
      }
      return [slotId, {
        ...slotChanges,
        buffSkillLevelDelta: targetPlatinumSkillLevel - packagePlatinumSkillLevel,
      }];
    }),
  );
  const scopedChangesBySlot = scopeBufferCurrentChangesBySlot(changesBySlot, scopeSimulator);
  const scopedUpgradeChangesBySlot = scopeBufferCurrentChangesBySlot(
    upgradeChangesBySlot,
    scopeSimulator,
  );
  const scopedBlackFangChangesBySlot = scopeBufferCurrentChangesBySlot(
    blackFangChangesBySlot,
    scopeSimulator,
  );
  const scopedCreatureChangesBySource = scopeBufferCurrentChangesBySource(
    creatureChangesBySource,
    scopeSimulator,
    'creature',
  );
  const scopedAuraChangesBySource = scopeBufferCurrentChangesBySource(
    auraChangesBySource,
    scopeSimulator,
    'aura',
  );
  const scopedTitleChangesBySource = scopeBufferCurrentChangesBySource(
    titleChangesBySource,
    scopeSimulator,
    'title',
  );
  const changes = [
    ...Object.values(scopedChangesBySlot),
    ...Object.values(artifactChangesByType || {}),
    ...Object.values(scopedUpgradeChangesBySlot),
    ...Object.values(equipmentTuneChangesBySource || {}),
    ...Object.values(oathTuneChangesBySource || {}),
    ...Object.values(oathAcquisitionChangesBySource || {}),
    ...Object.values(scopedBlackFangChangesBySlot),
    ...Object.values(scopedCreatureChangesBySource),
    ...Object.values(scopedAuraChangesBySource),
    ...Object.values(scopedTitleChangesBySource),
    ...Object.values(switchingCreatureChangesBySource || {}),
    ...Object.values(switchingTitleChangesBySource || {}),
    ...Object.values(switchingAvatarChangesBySlot || {}),
    ...Object.values(resolvedSwitchingPlatinumChangesBySlot),
    ...Object.values(avatarEmblemChangesBySocket || {}),
  ];
  const total = changes.reduce((result, slotChanges) => {
    BUFFER_SIMULATOR_CHANGE_KEYS.forEach((key) => {
      const value = slotChanges?.[key] == null ? 0 : Number(slotChanges[key]);
      if (!Number.isFinite(value)) throw new TypeError(`Invalid buffer simulator change: ${key}`);
      result[key] += value;
    });
    return result;
  }, Object.fromEntries(BUFFER_SIMULATOR_CHANGE_KEYS.map((key) => [key, 0])));

  const levelDeltaByScope = { common: {}, current: {}, switching: {} };
  changes.forEach((slotChanges) => {
    const baseMap = getBufferSkillContributionMap(slotChanges?.baseSkillContributions || []);
    const targetMap = getBufferSkillContributionMap(slotChanges?.targetSkillContributions || []);
    if (baseMap == null || targetMap == null) throw new TypeError('Invalid buffer skill contribution');
    const scope = ['current', 'switching'].includes(slotChanges?.skillContributionScope)
      ? slotChanges.skillContributionScope
      : 'common';
    new Set([...Object.keys(baseMap), ...Object.keys(targetMap)]).forEach((contextKey) => {
      levelDeltaByScope[scope][contextKey] = (levelDeltaByScope[scope][contextKey] || 0)
        + Number(targetMap[contextKey] || 0)
        - Number(baseMap[contextKey] || 0);
    });
  });

  const changedContextKeys = new Set([
    ...Object.keys(levelDeltaByScope.common),
    ...Object.keys(levelDeltaByScope.current),
    ...Object.keys(levelDeltaByScope.switching),
  ]);
  changedContextKeys.forEach((contextKey) => {
    const commonLevelDelta = Number(levelDeltaByScope.common[contextKey] || 0);
    const currentLevelDelta = Number(levelDeltaByScope.current[contextKey] || 0);
    const switchingLevelDelta = Number(levelDeltaByScope.switching[contextKey] || 0);
    if (!commonLevelDelta && !currentLevelDelta && !switchingLevelDelta) return;

    const currentContext = skillContexts?.[contextKey];
    const switchingContextKey = `${contextKey}:switching`;
    const requiresSwitchingContext = Boolean(commonLevelDelta || switchingLevelDelta);
    const switchingContext = skillContexts?.[switchingContextKey]
      || (requiresSwitchingContext ? null : currentContext);
    const currentBaseLevel = Number(currentContext?.currentLevel);
    const switchingBaseLevel = Number(switchingContext?.currentLevel);
    const commonCurrentLevel = currentBaseLevel + commonLevelDelta;
    const currentOnlyLevel = commonCurrentLevel + currentLevelDelta;
    const commonSwitchingLevel = switchingBaseLevel + commonLevelDelta;
    const switchingOnlyLevel = commonSwitchingLevel + switchingLevelDelta;
    const commonCurrentNetChanges = currentContext?.netChangesByLevel?.[String(commonCurrentLevel)];
    const currentOnlyNetChanges = currentContext?.netChangesByLevel?.[String(currentOnlyLevel)];
    const commonSwitchingNetChanges = switchingContext?.netChangesByLevel?.[String(commonSwitchingLevel)];
    const switchingOnlyNetChanges = switchingContext?.netChangesByLevel?.[String(switchingOnlyLevel)];
    if (
      !currentContext
      || !switchingContext
      || !Number.isInteger(commonCurrentLevel)
      || !Number.isInteger(currentOnlyLevel)
      || !Number.isInteger(commonSwitchingLevel)
      || !Number.isInteger(switchingOnlyLevel)
      || !commonCurrentNetChanges
      || !currentOnlyNetChanges
      || !commonSwitchingNetChanges
      || !switchingOnlyNetChanges
    ) {
      throw new RangeError(
        `Unsupported buffer skill level: ${contextKey}:${currentOnlyLevel}/${switchingOnlyLevel}`,
      );
    }
    ['selfStatSkillDelta', 'auraStatDelta', 'auraAttackDelta'].forEach((key) => {
      const commonCurrentValue = Number(commonCurrentNetChanges[key] || 0);
      const currentOnlyValue = Number(currentOnlyNetChanges[key] || 0);
      const commonSwitchingValue = Number(commonSwitchingNetChanges[key] || 0);
      const switchingOnlyValue = Number(switchingOnlyNetChanges[key] || 0);
      if ([
        commonCurrentValue,
        currentOnlyValue,
        commonSwitchingValue,
        switchingOnlyValue,
      ].some((value) => !Number.isFinite(value))) {
        throw new TypeError(`Invalid buffer skill change: ${contextKey}:${key}`);
      }
      if (key === 'selfStatSkillDelta') {
        total.selfStatSkillDelta += commonCurrentValue;
        total.currentStatDelta += currentOnlyValue - commonCurrentValue;
        total.switchingStatDelta += switchingOnlyValue - commonCurrentValue;
      } else {
        total[key] += currentOnlyValue;
      }
    });
  });
  return total;
}

function replaceBufferScopeLoadoutRow(loadout = {}, collectionName = '', predicate, nextRow = null) {
  const rows = getBuffLoadoutRowsForMetric(loadout?.[collectionName]);
  const index = rows.findIndex(predicate);
  if (index >= 0 && nextRow) rows.splice(index, 1, cloneSimulatorValue(nextRow));
  else if (index >= 0) rows.splice(index, 1);
  else if (nextRow) rows.push(cloneSimulatorValue(nextRow));
  loadout[collectionName] = rows;
}

function getBufferRecommendationScopeSimulator(simulator = {}, row = {}, useCandidate = false) {
  const targetSlotId = getBuffSimulatorTargetSlotId(row);
  const changesSwitchingSource = row.sourceType === 'switchingTitle'
    || row.sourceType === 'switchingCreature'
    || row.sourceType === 'switchingFragment'
    || (row.sourceType === 'avatar' && row.kind === 'switchingAvatar');
  if (!changesSwitchingSource || !targetSlotId) return simulator;
  const loadout = cloneSimulatorValue(simulator.simulatedBuffLoadout || simulator.baseBuffLoadout || {});
  const baseLoadout = simulator.baseBuffLoadout || {};
  if (row.sourceType === 'switchingTitle') {
    const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.equipment)
      .find((item) => String(item?.slotId || '').trim() === 'TITLE') || null;
    replaceBufferScopeLoadoutRow(
      loadout,
      'equipment',
      (item) => String(item?.slotId || '').trim() === 'TITLE',
      useCandidate
        ? { ...(row.targetBuffChanges?.equipment || {}), slotId: 'TITLE', slotName: '칭호' }
        : baseRow,
    );
  } else if (row.sourceType === 'switchingCreature') {
    loadout.creature = useCandidate
      ? [{ ...(row.targetBuffChanges?.creature || {}), slotId: 'CREATURE' }]
      : cloneSimulatorValue(baseLoadout.creature || []);
  } else if (row.sourceType === 'switchingFragment') {
    const normalizedTargetSlot = normalizeBuffLoadoutEquipmentSlotName(targetSlotId);
    const matchesTargetSlot = (item) => (
      normalizeBuffLoadoutEquipmentSlotName(item?.slotName) === normalizedTargetSlot
    );
    const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.equipment)
      .find(matchesTargetSlot) || null;
    replaceBufferScopeLoadoutRow(
      loadout,
      'equipment',
      matchesTargetSlot,
      useCandidate
        ? { ...(row.targetBuffChanges?.equipment || {}), slotName: normalizedTargetSlot }
        : baseRow,
    );
  } else {
    const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.avatar)
      .find((item) => String(item?.slotId || '').trim() === targetSlotId) || null;
    replaceBufferScopeLoadoutRow(
      loadout,
      'avatar',
      (item) => String(item?.slotId || '').trim() === targetSlotId,
      useCandidate
        ? {
          ...(row.targetBuffChanges?.avatar || {}),
          slotId: targetSlotId,
          buffAvatarSource: 'simulatedPackage',
        }
        : baseRow,
    );
  }
  return { ...simulator, simulatedBuffLoadout: loadout };
}

function getBufferAvatarEmblemChangesBySocket(row = {}, baseline = {}) {
  if (
    row.sourceType !== 'avatar'
    || row.kind !== 'brilliantEmblem'
  ) return null;
  const targetSlotId = String(row.targetSlotId || '').trim();
  const socketChanges = Array.isArray(row.socketChanges) ? row.socketChanges : [];
  if (!targetSlotId || !socketChanges.length) return null;
  const changeKey = row.bufferStatScope === 'switching'
    ? 'switchingStatDelta'
    : row.bufferStatScope === 'current'
      ? 'currentStatDelta'
      : 'statDelta';
  const changesBySocket = {};
  for (const change of socketChanges) {
    const socketIndex = Number(change?.socketIndex);
    if (!Number.isInteger(socketIndex) || socketIndex < 0 || socketIndex >= 2 || !change?.targetEmblem) {
      return null;
    }
    const currentValue = getSelectedStatEffect(change.currentEmblem?.effects || {}, baseline);
    const targetValue = getSelectedStatEffect(change.targetEmblem.effects || {}, baseline);
    if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) return null;
    changesBySocket[`${targetSlotId}:${socketIndex}`] = {
      [changeKey]: targetValue - currentValue,
    };
  }
  return changesBySocket;
}

function getBufferSwitchingAvatarEmblemOverlays(row = {}) {
  if (
    row.sourceType !== 'avatar'
    || row.kind !== 'brilliantEmblem'
    || row.bufferStatScope !== 'switching'
  ) return null;
  const targetSlotId = String(row.targetBuffSlot || row.targetSlotId || '').trim();
  const socketChanges = Array.isArray(row.socketChanges) ? row.socketChanges : [];
  if (!targetSlotId || !socketChanges.length) return null;
  const overlays = {};
  for (const change of socketChanges) {
    const socketIndex = Number(change?.socketIndex);
    if (!Number.isInteger(socketIndex) || socketIndex < 0 || socketIndex >= 2 || !change?.targetEmblem) {
      return null;
    }
    overlays[`${targetSlotId}:${socketIndex}`] = {
      slotId: targetSlotId,
      socketIndex,
      baseEmblem: cloneSimulatorValue(change.currentEmblem || null),
      targetEmblem: cloneSimulatorValue(change.targetEmblem),
    };
  }
  return overlays;
}

function resolveBufferSwitchingAvatarEmblemChanges(
  simulator = {},
  overlaysBySocket = null,
  baseline = null,
  packageChangesBySlot = null,
) {
  simulator = simulator || {};
  overlaysBySocket ||= simulator.switchingAvatarEmblemOverlaysBySocket || {};
  baseline ||= simulator.baseBaseline || {};
  packageChangesBySlot ||= simulator.switchingAvatarChangesBySlot || {};
  const changesBySocket = {};
  for (const [socketKey, overlay] of Object.entries(overlaysBySocket || {})) {
    const slotId = String(overlay?.slotId || '').trim();
    const socketIndex = Number(overlay?.socketIndex);
    const packageState = packageChangesBySlot?.[slotId];
    const packageEmblems = packageState?.regularEmblems;
    const underlayEmblem = packageState
      ? Array.isArray(packageEmblems) ? packageEmblems[socketIndex] || null : undefined
      : overlay?.baseEmblem || null;
    if (!slotId || !Number.isInteger(socketIndex) || underlayEmblem === undefined || !overlay?.targetEmblem) {
      return null;
    }
    const currentValue = getSelectedStatEffect(underlayEmblem?.effects || {}, baseline);
    const targetValue = getSelectedStatEffect(overlay.targetEmblem.effects || {}, baseline);
    if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) return null;
    changesBySocket[socketKey] = { switchingStatDelta: targetValue - currentValue };
  }
  return changesBySocket;
}

function mergeBufferChangeMap(changesByKey = {}) {
  return Object.values(changesByKey || {}).reduce((result, changes) => {
    BUFFER_SIMULATOR_CHANGE_KEYS.forEach((key) => {
      result[key] += Number(changes?.[key] || 0);
    });
    return result;
  }, Object.fromEntries(BUFFER_SIMULATOR_CHANGE_KEYS.map((key) => [key, 0])));
}

function getBufferAvatarEmblemNetChanges(
  simulator = {},
  avatarChangesBySocket = null,
  switchingOverlaysBySocket = null,
  packageChangesBySlot = null,
) {
  simulator = simulator || {};
  avatarChangesBySocket ||= simulator.avatarEmblemChangesBySocket || {};
  switchingOverlaysBySocket ||= simulator.switchingAvatarEmblemOverlaysBySocket || {};
  packageChangesBySlot ||= simulator.switchingAvatarChangesBySlot || {};
  const switchingChanges = resolveBufferSwitchingAvatarEmblemChanges(
    simulator,
    switchingOverlaysBySocket,
    simulator.baseBaseline || {},
    packageChangesBySlot,
  );
  if (switchingChanges == null) throw new RangeError('Unsupported switching avatar emblem underlay');
  const mergedChanges = { ...avatarChangesBySocket };
  Object.entries(switchingChanges).forEach(([socketKey, changes]) => {
    mergedChanges[socketKey] = {
      ...(mergedChanges[socketKey] || {}),
      ...changes,
    };
  });
  return mergedChanges;
}

function getBufferAvatarPlatinumBaseRelativeChanges(row = {}, baseline = {}) {
  if (row.sourceType !== 'avatar' || row.kind !== 'platinumEmblem') return null;
  const selfStatSkills = baseline.currentSelfStatSkills || {};
  const getContribution = (skillName) => {
    const info = selfStatSkills?.[skillName];
    return info?.contextKey ? [{
      contextKey: info.contextKey,
      jobId: info.jobId || '',
      skillId: info.skillId || '',
      skillName,
      levelContribution: 1,
    }] : [];
  };
  const baseSkillContributions = getContribution(row.currentPlatinumSkill || '');
  const targetSkillContributions = getContribution(row.targetSkill || '');
  const usesSelfStatContext = baseSkillContributions.length || targetSkillContributions.length;
  const statDelta = usesSelfStatContext ? 0 : Number(row.effects?.bufferStat || 0);
  const changes = {
    ...(row.bufferStatScope === 'current'
      ? { currentStatDelta: statDelta }
      : { statDelta }),
    buffSkillLevelDelta: Number(row.bufferBuffSkillLevelDelta || 0),
    awakeningSkillLevelDelta: Number(row.bufferAwakeningSkillLevelDelta || 0),
    baseSkillContributions,
    targetSkillContributions,
    skillContributionScope: row.bufferStatScope === 'current' ? 'current' : 'common',
  };
  return [statDelta, changes.buffSkillLevelDelta, changes.awakeningSkillLevelDelta].every(Number.isFinite)
    ? changes
    : null;
}

function getBufferAvatarNetChanges(simulator = {}) {
  return {
    ...getBufferAvatarEmblemNetChanges(simulator),
    ...(simulator.avatarPlatinumChangesBySlot || {}),
  };
}

function getAvatarPlatinumDamageMultiplier(changesBySlot = {}) {
  return Object.values(changesBySlot || {}).reduce((multiplier, changes) => {
    const value = Number(changes?.skillDamageMultiplier || 1);
    return multiplier * (Number.isFinite(value) && value > 0 ? value : 1);
  }, 1);
}

function resolveDealerAvatarSkillCoefficient(recognizedLevel) {
  const level = Number(recognizedLevel);
  return 1.20 + (Number.isFinite(level) && level > 0 ? level : 0) * 0.02;
}

function getDealerTitleRecognizedLevelContribution(title = {}, jobName = '') {
  const namedLevels = (title.itemReinforceSkill || []).flatMap((job) => {
    if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return [];
    return (job?.skills || []).map((skill) => Number(skill?.value || 0));
  });
  const rangeLevels = (title.itemBuff?.reinforceSkill || []).flatMap((job) => {
    if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return [];
    return (job?.levelRange || []).map((range) => Number(range?.value || 0));
  });
  return Math.max(
    0,
    ...namedLevels.filter(Number.isFinite),
    ...rangeLevels.filter(Number.isFinite),
  );
}

function getDealerAvatarRecognizedLevel(
  avatar = {},
  title = {},
  jobName = '',
  useBasePlatinum = false,
) {
  const topOptionLevel = Number(avatar?.recognizedTopOptionLevelContribution || 0);
  const platinumAvatar = useBasePlatinum ? avatar?.basePlatinumSlots : avatar?.slots;
  const platinumLevel = (platinumAvatar || []).reduce((sum, slot) => (
    sum + Number(slot?.recognizedPlatinumLevelContribution || 0)
  ), 0);
  return getDealerTitleRecognizedLevelContribution(title, jobName)
    + (Number.isFinite(topOptionLevel) ? topOptionLevel : 0)
    + platinumLevel;
}

function getDealerAvatarPlatinumEquipmentScoreMultiplier(simulator = {}) {
  const simulatedAvatar = simulator.simulatedAvatar || {};
  const jobName = simulator.baseDamageBaseline?.jobName || '';
  const currentLevel = getDealerAvatarRecognizedLevel(
    {
      ...simulatedAvatar,
      basePlatinumSlots: simulator.baseAvatar?.slots || [],
    },
    simulator.simulatedTitle || {},
    jobName,
    true,
  );
  const targetLevel = getDealerAvatarRecognizedLevel(
    simulatedAvatar,
    simulator.simulatedTitle || {},
    jobName,
  );
  return resolveDealerAvatarSkillCoefficient(targetLevel)
    / resolveDealerAvatarSkillCoefficient(currentLevel);
}

function getAvatarPlatinumRecommendationMultiplier(row = {}) {
  const explicit = Number(
    row.baseRelativeSkillDamageMultiplier
    || row.skillDamageMultiplier
    || row.effects?.skillDamageMultiplier
    || 0,
  );
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const finalDamage = Number(row.effects?.finalDamage || 0);
  return finalDamage > 0 ? 1 + finalDamage / 100 : 1;
}

function getBufferEnchantBaseRelativeChanges(row, baseEnchant, baseline) {
  if (row?.sourceType !== 'enchant' || row?.role !== 'buffer') return null;
  const jobName = baseline?.jobName || '';
  const rawSkillLevel = getReinforceSkillLevel(row.reinforceSkill || [], jobName);
  const rawBaseSkillLevel = getReinforceSkillLevel(baseEnchant?.reinforceSkill || [], jobName);
  if (rawSkillLevel && !Array.isArray(row.bufferSkillContributions)) return null;
  if (rawBaseSkillLevel && !Array.isArray(baseEnchant?.bufferSkillContributions)) return null;
  const targetSkillContributions = row.bufferSkillContributions || [];
  const baseSkillContributions = baseEnchant?.bufferSkillContributions || [];
  const targetContributionMap = getBufferSkillContributionMap(targetSkillContributions);
  const baseContributionMap = getBufferSkillContributionMap(baseSkillContributions);
  if (targetContributionMap == null || baseContributionMap == null) return null;
  const contextKeys = new Set([
    ...Object.keys(targetContributionMap),
    ...Object.keys(baseContributionMap),
  ]);
  if ([...contextKeys].some((contextKey) => !baseline?.bufferSkillContexts?.[contextKey])) return null;
  const targetEffects = getRoleRelevantEffects(row.effects || {}, true);
  const currentEffects = getRoleRelevantEffects(baseEnchant?.effects || {}, true);
  const changedKeys = new Set([
    ...Object.keys(targetEffects || {}),
    ...Object.keys(currentEffects || {}),
  ].filter((key) => Number(targetEffects?.[key] || 0) !== Number(currentEffects?.[key] || 0)));
  if ([...changedKeys].some((key) => !['allStat', 'str', 'int', 'vit', 'spr'].includes(key))) return null;
  const statDelta = getBufferSelectedStatEffect(targetEffects, baseline)
    - getBufferSelectedStatEffect(currentEffects, baseline);
  if (!Number.isFinite(statDelta)) return null;
  return {
    statDelta,
    baseSkillContributions,
    targetSkillContributions,
  };
}

function getBufferEnchantExclusiveGroupKey(row = {}) {
  const slot = String(row.slot || '').trim();
  return row.sourceType === 'enchant' && row.role === 'buffer' && slot
    ? `bufferEnchant:${slot}`
    : '';
}

function getBufferEnchantCandidateSignature(row = {}) {
  const groupKey = getBufferEnchantExclusiveGroupKey(row);
  if (!groupKey) return '';
  return [
    groupKey,
    row.itemId || '',
    row.tier || '',
    getEffectSignature(row.effects || {}),
    getStableObjectSignature(row.reinforceSkill || []),
  ].join(':');
}

function getBufferCreatureArtifactBaseRelativeChanges(row, baseArtifact) {
  if (row?.sourceType !== 'creatureArtifact' || !getCreatureArtifactType(row)) return null;
  const targetEffects = getRoleRelevantEffects(row.effects || {}, true);
  const baseEffects = getRoleRelevantEffects(baseArtifact?.effects || {}, true);
  const changedKeys = new Set([
    ...Object.keys(targetEffects),
    ...Object.keys(baseEffects),
  ].filter((key) => Number(targetEffects[key] || 0) !== Number(baseEffects[key] || 0)));
  if ([...changedKeys].some((key) => !['allStat', 'buffPower', 'buffAmplification'].includes(key))) return null;
  const statDelta = Number(targetEffects.allStat || 0) - Number(baseEffects.allStat || 0);
  const buffPowerDelta = Number(targetEffects.buffPower || 0) - Number(baseEffects.buffPower || 0);
  const buffAmplificationDelta = Number(targetEffects.buffAmplification || 0)
    - Number(baseEffects.buffAmplification || 0);
  if (![statDelta, buffPowerDelta, buffAmplificationDelta].every(Number.isFinite)) return null;
  return {
    statDelta,
    buffPowerDelta,
    currentBuffAmplificationDelta: buffAmplificationDelta,
    switchingBuffAmplificationDelta: buffAmplificationDelta,
  };
}

function getBufferBlackFangBaseRelativeChanges(row = {}) {
  const targetSlot = String(row.slot || '').trim();
  if (row.sourceType !== 'blackFang' || !BLACK_FANG_SIMULATOR_SLOTS.has(targetSlot)) return null;
  const targetEffects = getRoleRelevantEffects(row.targetEffects || {}, true);
  const baseEffects = getRoleRelevantEffects(row.currentEffects || {}, true);
  const changedKeys = new Set([
    ...Object.keys(targetEffects),
    ...Object.keys(baseEffects),
  ].filter((key) => Number(targetEffects[key] || 0) !== Number(baseEffects[key] || 0)));
  if ([...changedKeys].some((key) => !['allStat', 'buffPower', 'buffAmplification'].includes(key))) return null;
  const statDelta = Number(targetEffects.allStat || 0) - Number(baseEffects.allStat || 0);
  const buffPowerDelta = Number(targetEffects.buffPower || 0) - Number(baseEffects.buffPower || 0);
  const buffAmplificationDelta = Number(targetEffects.buffAmplification || 0)
    - Number(baseEffects.buffAmplification || 0);
  if (![statDelta, buffPowerDelta, buffAmplificationDelta].every(Number.isFinite)) return null;
  return {
    statDelta,
    buffPowerDelta,
    currentBuffAmplificationDelta: buffAmplificationDelta,
    switchingBuffAmplificationDelta: buffAmplificationDelta,
  };
}

function getBufferBlackFangExclusiveGroupKey(row = {}) {
  const slot = String(row.slot || '').trim();
  return row.bufferSimulatorSupported && row.sourceType === 'blackFang' && BLACK_FANG_SIMULATOR_SLOTS.has(slot)
    ? `bufferBlackFang:${slot}`
    : '';
}

function getBufferBlackFangCandidateSignature(row = {}) {
  const groupKey = getBufferBlackFangExclusiveGroupKey(row);
  if (!groupKey || !row.targetItemId) return '';
  return [groupKey, row.targetItemId, getEffectSignature(row.targetEffects || {})].join(':');
}

function getAuthoritativeItemSkillLevelBonus(item = {}, baseline = {}, skillName = '', requiredLevel = 0) {
  const jobName = baseline?.jobName || '';
  const reinforceSkillGroups = [
    ...(item?.itemReinforceSkill || []),
    ...(item?.reinforceSkill || []),
    ...(item?.enchant?.reinforceSkill || []),
  ];
  const namedBonus = getReinforceSkillLevel(reinforceSkillGroups, jobName, [skillName]);
  const rangeBonus = [
    ...reinforceSkillGroups,
    ...(item?.itemBuff?.reinforceSkill || []),
  ].reduce((total, job) => {
    if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return total;
    return total + (job?.levelRange || []).reduce((sum, range) => {
      const minimum = Number(range?.minLevel || 0);
      const maximum = Number(range?.maxLevel || 0);
      return minimum <= requiredLevel && requiredLevel <= maximum
        ? sum + Number(range?.value || 0)
        : sum;
    }, 0);
  }, 0);
  return namedBonus + rangeBonus;
}

function getBufferItemSkillContributions(item = {}, baseline = {}) {
  return Object.entries(baseline.currentSelfStatSkills || {}).flatMap(([skillName, info]) => {
    const contextKey = String(info?.contextKey || '').trim();
    if (!contextKey) return [];
    const levelContribution = getAuthoritativeItemSkillLevelBonus(
      item,
      baseline,
      skillName,
      Number(info?.requiredLevel || 0),
    );
    return levelContribution ? [{ contextKey, levelContribution }] : [];
  });
}

function getBufferEquippedItemBaseRelativeChanges(row = {}, baseItem = {}, baseline = {}, sourceType = '') {
  if (row.sourceType !== sourceType) return null;
  const targetEffects = getRoleRelevantEffects(row.effects || {}, true);
  const baseEffects = getRoleRelevantEffects(baseItem.effects || {}, true);
  const changedKeys = new Set([
    ...Object.keys(targetEffects),
    ...Object.keys(baseEffects),
  ].filter((key) => Number(targetEffects[key] || 0) !== Number(baseEffects[key] || 0)));
  if ([...changedKeys].some((key) => !['allStat', 'buffPower', 'buffAmplification'].includes(key))) return null;
  const statDelta = Number(targetEffects.allStat || 0) - Number(baseEffects.allStat || 0);
  const buffPowerDelta = Number(targetEffects.buffPower || 0) - Number(baseEffects.buffPower || 0);
  const buffAmplificationDelta = Number(targetEffects.buffAmplification || 0)
    - Number(baseEffects.buffAmplification || 0);
  const buffSkillLevelDelta = getItemSkillLevelBonus(row, baseline, baseline.buffSkillName, 30)
    - getItemSkillLevelBonus(baseItem, baseline, baseline.buffSkillName, 30);
  const awakeningSkillLevelDelta = getItemSkillLevelBonus(row, baseline, baseline.awakeningSkillName, 50)
    - getItemSkillLevelBonus(baseItem, baseline, baseline.awakeningSkillName, 50);
  if (![statDelta, buffPowerDelta, buffAmplificationDelta, buffSkillLevelDelta, awakeningSkillLevelDelta]
    .every(Number.isFinite)) return null;
  return {
    statDelta,
    buffPowerDelta,
    currentBuffAmplificationDelta: buffAmplificationDelta,
    switchingBuffAmplificationDelta: buffAmplificationDelta,
    buffSkillLevelDelta,
    awakeningSkillLevelDelta,
    baseSkillContributions: getBufferItemSkillContributions(baseItem, baseline),
    targetSkillContributions: getBufferItemSkillContributions(row, baseline),
  };
}

function getBufferCreatureBaseRelativeChanges(row = {}, baseCreature = {}, baseline = {}) {
  return getBufferEquippedItemBaseRelativeChanges(row, baseCreature, baseline, 'creature');
}

function getBufferCreatureExclusiveGroupKey(row = {}) {
  return row.bufferSimulatorSupported && row.sourceType === 'creature'
    ? 'bufferCreature'
    : '';
}

function getBufferCreatureCandidateSignature(row = {}) {
  const groupKey = getBufferCreatureExclusiveGroupKey(row);
  if (!groupKey || !row.itemId) return '';
  return [
    groupKey,
    row.itemId,
    getEffectSignature(row.effects || {}),
    getStableObjectSignature(row.itemReinforceSkill || []),
    getStableObjectSignature(row.itemBuff || {}),
  ].join(':');
}

function getBufferAuraBaseRelativeChanges(row = {}, baseAura = {}, baseline = {}) {
  return getBufferEquippedItemBaseRelativeChanges(row, baseAura, baseline, 'aura');
}

function getBufferAuraExclusiveGroupKey(row = {}) {
  return row.bufferSimulatorSupported && row.sourceType === 'aura'
    ? 'bufferAura'
    : '';
}

function getBufferAuraCandidateSignature(row = {}) {
  const groupKey = getBufferAuraExclusiveGroupKey(row);
  if (!groupKey || !row.itemId) return '';
  return [
    groupKey,
    row.itemId,
    row.tier || '',
    getEffectSignature(row.effects || {}),
    getStableObjectSignature(row.itemReinforceSkill || row.reinforceSkills || []),
    getStableObjectSignature(row.itemBuff || {}),
  ].join(':');
}

function buildSimulatedTitleTarget(row = {}) {
  return {
    ...cloneSimulatorValue(row),
    itemName: row.titleItemName || row.candidateName || row.itemName || '',
    iconUrl: row.titleIconUrl || row.iconUrl || '',
    effects: cloneSimulatorValue(row.titlePackageEffects || row.effects || {}),
    enchantEffects: cloneSimulatorValue(
      row.targetTitleEnchantEffects || row.enchantEffects || {},
    ),
  };
}

function getBufferTitleBaseRelativeChanges(row = {}, baseTitle = {}, baseline = {}) {
  if (row.sourceType !== 'title') return null;
  return getBufferEquippedItemBaseRelativeChanges(
    buildSimulatedTitleTarget(row),
    baseTitle,
    baseline,
    'title',
  );
}

function getBufferTitleExclusiveGroupKey(row = {}) {
  return row.bufferSimulatorSupported && row.sourceType === 'title'
    ? 'bufferTitle'
    : '';
}

function getBufferTitleCandidateSignature(row = {}) {
  const groupKey = getBufferTitleExclusiveGroupKey(row);
  if (!groupKey) return '';
  const dealerSignature = getTitleCandidateSignature(row);
  return dealerSignature ? dealerSignature.replace(/^title:/, `${groupKey}:`) : '';
}

function getBufferSwitchingCreatureBaseRelativeChanges(row = {}) {
  if (row.sourceType !== 'switchingCreature') return null;
  const hasSkillContributions = row.hasExactSkillContributions === true;
  const changes = {
    switchingStatDelta: Number(
      hasSkillContributions ? row.switchingDirectStatDelta || 0 : row.switchingStatDelta || 0,
    ),
    switchingBuffAmplificationDelta: Number(row.switchingBuffAmplificationDelta || 0),
    buffSkillLevelDelta: Number(row.bufferBuffSkillLevelDelta || 0),
    auraStatDelta: Number(row.auraStatDelta || 0),
    auraAttackDelta: Number(row.auraAttackDelta || 0),
  };
  return Object.values(changes).every(Number.isFinite) ? {
    ...changes,
    baseSkillContributions: hasSkillContributions ? row.baseSkillContributions : [],
    targetSkillContributions: hasSkillContributions ? row.targetSkillContributions : [],
    skillContributionScope: hasSkillContributions ? row.skillContributionScope || 'switching' : 'common',
  } : null;
}

function getBufferSwitchingCreatureExclusiveGroupKey(row = {}) {
  return row.bufferSimulatorSupported && row.sourceType === 'switchingCreature'
    ? getBuffSimulatorExclusiveGroupKey(row)
    : '';
}

function getBufferSwitchingCreatureCandidateSignature(row = {}) {
  return getBufferSwitchingCreatureExclusiveGroupKey(row)
    ? getBuffSimulatorCandidateSignature(row)
    : '';
}

function getBufferSwitchingTitleBaseRelativeChanges(row = {}) {
  if (row.sourceType !== 'switchingTitle') return null;
  const hasSkillContributions = row.hasExactSkillContributions === true;
  const changes = {
    switchingStatDelta: Number(
      hasSkillContributions ? row.switchingDirectStatDelta || 0 : row.switchingStatDelta || 0,
    ),
    switchingBuffAmplificationDelta: Number(row.switchingBuffAmplificationDelta || 0),
    buffSkillLevelDelta: Number(row.bufferBuffSkillLevelDelta || 0),
    auraStatDelta: Number(row.auraStatDelta || 0),
    auraAttackDelta: Number(row.auraAttackDelta || 0),
  };
  return Object.values(changes).every(Number.isFinite) ? {
    ...changes,
    baseSkillContributions: hasSkillContributions ? row.baseSkillContributions : [],
    targetSkillContributions: hasSkillContributions ? row.targetSkillContributions : [],
    skillContributionScope: hasSkillContributions ? row.skillContributionScope || 'switching' : 'common',
  } : null;
}

function getBufferSwitchingTitleExclusiveGroupKey(row = {}) {
  return row.bufferSimulatorSupported && row.sourceType === 'switchingTitle'
    ? getBuffSimulatorExclusiveGroupKey(row)
    : '';
}

function getBufferSwitchingTitleCandidateSignature(row = {}) {
  return getBufferSwitchingTitleExclusiveGroupKey(row)
    ? getBuffSimulatorCandidateSignature(row)
    : '';
}

function getBufferSwitchingAvatarBaseRelativeChanges(row = {}) {
  if (row.sourceType !== 'avatar' || row.kind !== 'switchingAvatar') return null;
  const source = row.bufferSimulatorChanges || {};
  const hasSkillContributions = row.hasExactSkillContributions === true;
  const changes = {
    switchingStatDelta: Number(
      hasSkillContributions ? source.switchingDirectStatDelta || 0 : source.switchingStatDelta || 0,
    ),
    buffSkillLevelDelta: Number(source.buffSkillLevelDelta || 0),
    targetPlatinumSkillLevel: Number(
      row.targetBuffChanges?.avatar?.buffContribution?.platinumSkillLevel || 0,
    ),
  };
  return Object.values(changes).every(Number.isFinite) ? {
    ...changes,
    baseSkillContributions: hasSkillContributions ? row.baseSkillContributions : [],
    targetSkillContributions: hasSkillContributions ? row.targetSkillContributions : [],
    skillContributionScope: hasSkillContributions ? row.skillContributionScope || 'switching' : 'common',
  } : null;
}

function getBufferSwitchingAvatarExclusiveGroupKey(row = {}) {
  return row.bufferSimulatorSupported
    && row.sourceType === 'avatar'
    && row.kind === 'switchingAvatar'
    ? getBuffSimulatorExclusiveGroupKey(row)
    : '';
}

function getBufferSwitchingAvatarCandidateSignature(row = {}) {
  return getBufferSwitchingAvatarExclusiveGroupKey(row)
    ? getBuffSimulatorCandidateSignature(row)
    : '';
}

function getBufferSwitchingPlatinumBaseRelativeChanges(row = {}) {
  if (row.sourceType !== 'avatar' || row.kind !== 'switchingPlatinumEmblem') return null;
  const source = row.bufferSimulatorChanges || {};
  const hasSkillContributions = row.hasExactSkillContributions === true;
  const changes = {
    switchingStatDelta: Number(
      hasSkillContributions ? source.switchingDirectStatDelta || 0 : source.switchingStatDelta || 0,
    ),
    buffSkillLevelDelta: Number(source.buffSkillLevelDelta || 0),
    targetPlatinumSkillLevel: Number(
      row.targetBuffChanges?.platinumEmblem?.skillLevel || 0,
    ),
  };
  return Object.values(changes).every(Number.isFinite) ? {
    ...changes,
    baseSkillContributions: hasSkillContributions ? row.baseSkillContributions : [],
    targetSkillContributions: hasSkillContributions ? row.targetSkillContributions : [],
    skillContributionScope: hasSkillContributions ? row.skillContributionScope || 'switching' : 'common',
  } : null;
}

function getBufferSwitchingPlatinumExclusiveGroupKey(row = {}) {
  return row.bufferSimulatorSupported
    && row.sourceType === 'avatar'
    && row.kind === 'switchingPlatinumEmblem'
    ? getBuffSimulatorExclusiveGroupKey(row)
    : '';
}

function getBufferSwitchingPlatinumCandidateSignature(row = {}) {
  return getBufferSwitchingPlatinumExclusiveGroupKey(row)
    ? getBuffSimulatorCandidateSignature(row)
    : '';
}

function getBufferCreatureArtifactExclusiveGroupKey(row = {}) {
  const artifactType = getCreatureArtifactType(row);
  return row.bufferSimulatorSupported && row.sourceType === 'creatureArtifact' && artifactType
    ? `bufferCreatureArtifact:${artifactType}`
    : '';
}

function getBufferCreatureArtifactCandidateSignature(row = {}) {
  const groupKey = getBufferCreatureArtifactExclusiveGroupKey(row);
  return groupKey && row.itemId ? `${groupKey}:${row.itemId}` : '';
}

function getBufferUpgradeBaseRelativeChanges(row = {}, simulator = {}) {
  if (row.sourceType !== 'upgrade' || simulator?.role !== 'buffer') return null;
  const targetSlot = String(row.slot || '').trim();
  const progressionType = getEquipmentProgressionType(row);
  const targetLevel = Number(row.targetLevel);
  const baseEquipment = (simulator.baseEquipmentUpgrades || []).find(
    (equipment) => equipment?.slot === targetSlot,
  );
  if (!baseEquipment || !progressionType || !Number.isFinite(targetLevel)) return null;
  const baseMode = getEquipmentProgressionMode(baseEquipment);
  const targetMode = progressionType === 'amplify' ? 'amplification' : 'reinforcement';
  const targetEffects = getRoleRelevantEffects(
    getCumulativeUpgradeEffectsForEquipment(
      baseEquipment,
      targetLevel,
      targetMode,
      simulator.upgradeDb,
      simulator.baseBaseline,
      true,
    ),
    true,
  );
  const baseEffects = getRoleRelevantEffects(
    getCumulativeUpgradeEffectsForEquipment(
      baseEquipment,
      Number(baseEquipment.reinforce || 0),
      baseMode,
      simulator.upgradeDb,
      simulator.baseBaseline,
      true,
    ),
    true,
  );
  const changedKeys = new Set([
    ...Object.keys(targetEffects),
    ...Object.keys(baseEffects),
  ].filter((key) => Number(targetEffects[key] || 0) !== Number(baseEffects[key] || 0)));
  if ([...changedKeys].some((key) => key !== 'allStat')) return null;
  const statDelta = Number(targetEffects.allStat || 0) - Number(baseEffects.allStat || 0);
  return Number.isFinite(statDelta) ? { statDelta } : null;
}

function getBufferEquipmentTuneBaseRelativeChanges(row = {}) {
  if (row.sourceType !== 'equipmentTune') return null;
  const buffPowerDelta = Number(row.effects?.buffPower);
  return Number.isFinite(buffPowerDelta) && buffPowerDelta > 0
    ? { buffPowerDelta }
    : null;
}


function getBufferUpgradeExclusiveGroupKey(row = {}) {
  const slot = String(row.slot || '').trim();
  return row.bufferSimulatorSupported && row.sourceType === 'upgrade' && slot && UPGRADE_SLOT_LABELS[slot]
    ? `bufferUpgrade:${slot}`
    : '';
}

function getBufferUpgradeCandidateSignature(row = {}) {
  const groupKey = getBufferUpgradeExclusiveGroupKey(row);
  const progressionType = getEquipmentProgressionType(row);
  const targetLevel = Number(row.targetLevel);
  if (!groupKey || !progressionType || !Number.isFinite(targetLevel)) return '';
  return `${groupKey}:${progressionType}:${targetLevel}`;
}

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

function getExactAdjacentSkillValueDelta(info, field, levelDelta) {
  if (!levelDelta) return 0;
  if (!Number.isInteger(levelDelta) || Math.abs(levelDelta) !== 1) return 0;
  const currentField = `current${field}`;
  const targetField = `${levelDelta > 0 ? 'next' : 'previous'}${field}`;
  if (
    !Object.prototype.hasOwnProperty.call(info || {}, currentField)
    || !Object.prototype.hasOwnProperty.call(info || {}, targetField)
  ) return 0;
  const current = Number(info[currentField]);
  const target = Number(info[targetField]);
  return Number.isFinite(current) && Number.isFinite(target) ? target - current : 0;
}

function getBufferItemSkillChanges(row, current, baseline) {
  if (['switchingTitle', 'switchingCreature'].includes(row.sourceType)) {
    return {
      switchingStatDelta: Number(row.switchingStatDelta || 0),
      switchingBuffAmplificationDelta: Number(row.switchingBuffAmplificationDelta || 0),
      buffSkillLevelDelta: Number(row.bufferBuffSkillLevelDelta || 0),
      auraStatDelta: Number(row.auraStatDelta || 0),
      auraAttackDelta: Number(row.auraAttackDelta || 0),
    };
  }
  if (!['creature', 'title', 'aura'].includes(row.sourceType)) return {};
  const buffSkillLevelDelta = getItemSkillLevelBonus(row, baseline, baseline.buffSkillName, 30)
    - getItemSkillLevelBonus(current, baseline, baseline.buffSkillName, 30);
  const awakeningSkillLevelDelta = getItemSkillLevelBonus(row, baseline, baseline.awakeningSkillName, 50)
    - getItemSkillLevelBonus(current, baseline, baseline.awakeningSkillName, 50);
  const skillChanges = Object.entries(baseline.currentSelfStatSkills || {}).reduce((changes, [skillName, info]) => {
    const levelDelta = getItemSkillLevelBonus(row, baseline, skillName, Number(info?.requiredLevel || 0))
      - getItemSkillLevelBonus(current, baseline, skillName, Number(info?.requiredLevel || 0));
    changes.statDelta += getExactAdjacentSkillValueDelta(info, 'Stat', levelDelta);
    changes.auraStatDelta += getExactAdjacentSkillValueDelta(info, 'PartyStat', levelDelta);
    changes.auraAttackDelta += getExactAdjacentSkillValueDelta(info, 'PartyAttack', levelDelta);
    return changes;
  }, { statDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 });
  if (row.sourceType === 'title') {
    return baseline.switchingTitleUsesCurrent
      ? {
        selfStatSkillDelta: skillChanges.statDelta,
        auraStatDelta: skillChanges.auraStatDelta,
        auraAttackDelta: skillChanges.auraAttackDelta,
        buffSkillLevelDelta,
        awakeningSkillLevelDelta,
      }
      : {
        currentStatDelta: skillChanges.statDelta,
        auraStatDelta: skillChanges.auraStatDelta,
        auraAttackDelta: skillChanges.auraAttackDelta,
        awakeningSkillLevelDelta,
      };
  }
  return {
    ...skillChanges,
    buffSkillLevelDelta,
    awakeningSkillLevelDelta,
  };
}

function calculateBufferScore(baseline = {}, changes = {}) {
  const config = BUFFER_SCORE_CONFIG[baseline.bufferKey];
  if (!config) return 0;
  const commonStatDelta = Number(changes.statDelta || 0);
  const currentStatDelta = Number(changes.currentStatDelta || 0);
  const switchingStatDelta = Number(changes.switchingStatDelta || 0);
  const passiveStatDelta = Number(changes.selfStatSkillDelta || 0);
  const baseAppliedStat = Number(baseline.stat || 0) + Number(baseline.activeSelfStat || 0) + passiveStatDelta;
  const appliedStat = baseAppliedStat + commonStatDelta + currentStatDelta;
  const switchingStat = baseAppliedStat
    + Number(baseline.switchingStatDelta || 0)
    + commonStatDelta
    + switchingStatDelta;
  const buffPower = Number(baseline.buffPower || 0) + Number(changes.buffPowerDelta || 0);
  const currentBuffAmplificationDelta = Number(changes.currentBuffAmplificationDelta || 0);
  const switchingBuffAmplificationDelta = Number(changes.switchingBuffAmplificationDelta || 0);
  const currentAmp = (Number(baseline.buffAmplification || 0) + currentBuffAmplificationDelta) / 100;
  const switchingAmp = Math.max(
    0,
    Number(baseline.buffAmplification || 0)
      + Number(baseline.switchingBuffAmplificationDelta || 0)
      + switchingBuffAmplificationDelta,
  ) / 100;
  const buffFactor = (1 + switchingStat / 2993) * (2 + buffPower * (1 + switchingAmp) / 4800);
  const buffSkillLevel = Number(baseline.buffSkillLevel || 0) + Number(changes.buffSkillLevelDelta || 0);
  const awakeningSkillLevel = Number(baseline.awakeningSkillLevel || 0) + Number(changes.awakeningSkillLevelDelta || 0);
  if (!buffSkillLevel || !awakeningSkillLevel) return 0;
  const buffStatBase = 150 + 11 * buffSkillLevel;
  const buffAttackBase = 36 + 1.8 * buffSkillLevel;
  const buffMultiplier = config.jobCoefficient * config.buffMultiplier;
  const buffStat = buffStatBase * buffFactor * buffMultiplier;
  const buffAttack = buffAttackBase * buffFactor * buffMultiplier;
  const awakeningStatBase = 986 + 92 * (awakeningSkillLevel - 30);
  const awakeStat = awakeningStatBase
    * (20 * (1 + appliedStat / 15000) * (1 + buffPower * (1 + currentAmp) / 85000) - 1)
    * 1.15;
  const auraStat = Number(baseline.auraStat || 0) + Number(changes.auraStatDelta || 0);
  const totalStat = buffStat + awakeStat + auraStat;
  const totalAttack = buffAttack + Number(baseline.auraAttack || 0) + Number(changes.auraAttackDelta || 0);
  return (25000 + totalStat) / 25000 * (3300 + totalAttack) / 3300 * 333 * 1.165;
}

function compareBufferRecommendationOrder(a = {}, b = {}) {
  const priorityDiff = Number(a.recommendationPriority || 0) - Number(b.recommendationPriority || 0);
  if (priorityDiff) return priorityDiff;
  const materialDiff = Number(isMaterialAcquisition(b)) - Number(isMaterialAcquisition(a));
  if (materialDiff) return materialDiff;
  if (isMaterialAcquisition(a) && isMaterialAcquisition(b)) return compareMaterialEnchantOrder(a, b);
  const aEfficiency = Number(a.buffCostPerHundredPoints || 0);
  const bEfficiency = Number(b.buffCostPerHundredPoints || 0);
  const normalizedA = Number.isFinite(aEfficiency) && aEfficiency > 0
    ? aEfficiency
    : Number.POSITIVE_INFINITY;
  const normalizedB = Number.isFinite(bEfficiency) && bEfficiency > 0
    ? bEfficiency
    : Number.POSITIVE_INFINITY;
  return normalizedA - normalizedB;
}

function getBufferRecommendationRows(
  rows,
  currentEnchants,
  currentCreature,
  currentTitle,
  currentAura,
  baseline,
  includeMaterialCosts = false,
  simulator = null,
) {
  if (!baseline?.isBuffer) return [];
  const currentBySlot = new Map((currentEnchants || []).map((enchant) => [enchant.slot, enchant]));
  const currentArtifactBySlot = getCurrentCreatureArtifactBySlot(currentCreature);
  const baseScore = calculateBufferScore(baseline);
  const bySlotTier = new Map();
  (rows || []).forEach((row) => {
    if (row.sourceType === 'enchant' && row.role !== 'buffer') return;
    if (!['enchant', 'creature', 'creatureArtifact', 'title', 'switchingTitle', 'switchingCreature', 'aura', 'avatar', 'upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'blackFang'].includes(row.sourceType)) return;
    if (OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType) && simulator?.role === 'buffer') {
      row = adaptOathAcquisitionRecommendation(row, simulator);
      if (!row) return;
    }
    if (['creature', 'title'].includes(row.sourceType) && row.tier === '플래티넘') return;
    if (row.sourceType === 'avatar' && !['brilliantEmblem', 'platinumEmblem', 'switchingPlatinumEmblem', 'switchingAvatar'].includes(row.kind)) return;
    row = row.sourceType === 'upgrade'
      ? {
        ...row,
        effects: {
          allStat: Number(row.effects?.allStat || 0),
        },
      }
    : row;
    const current = ['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)
      ? {}
      : row.sourceType === 'blackFang'
        ? { effects: row.currentEffects || {} }
      : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
        ? { effects: row.currentEffects || {} }
      : row.sourceType === 'creature'
        ? currentCreature || {}
        : row.sourceType === 'creatureArtifact'
          ? currentArtifactBySlot.get(row.slotColor) || {}
          : row.sourceType === 'title'
            ? currentTitle || {}
            : row.sourceType === 'switchingTitle'
              ? {}
              : row.sourceType === 'switchingCreature'
                ? {}
              : row.sourceType === 'aura'
              ? currentAura || {}
              : currentBySlot.get(row.slot) || {};
    row = getTitleBeadOnlyRow(row, current);
    if (!isMaterialAcquisition(row) && !isFreeActionRecommendation(row) && (!Number.isFinite(row?.auction?.minUnitPrice) || row.auction.minUnitPrice <= 0)) return;
    if (
      !['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType) &&
      row.sourceType !== 'blackFang' &&
      row.sourceType !== 'oathTranscend' &&
      row.sourceType !== 'oathCraft' &&
      current?.itemId &&
      current.itemId === row.itemId &&
      getEffectSignature(current.effects || {}) === getEffectSignature(row.effects || {})
    ) return;
    const targetEffects = row.sourceType === 'blackFang'
      ? row.targetEffects || addEffects(row.currentEffects, row.effects)
      : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
        ? row.targetEffects || row.effects || {}
      : row.effects || {};
    const scoringTargetEffects = getRoleRelevantEffects(targetEffects, true);
    const scoringCurrentEffects = getRoleRelevantEffects(current.effects || {}, true);
    const statDelta = row.sourceType === 'upgrade'
      ? Number(row.effects?.allStat || 0)
      : row.sourceType === 'enchant'
        ? getBufferSelectedStatEffect(scoringTargetEffects, baseline)
          - getBufferSelectedStatEffect(scoringCurrentEffects, baseline)
        : Number(scoringTargetEffects?.allStat || 0) - Number(scoringCurrentEffects?.allStat || 0);
    const titleAppliesToSwitching = row.sourceType === 'title' && baseline.switchingTitleUsesCurrent;
    const replacementStatChanges = row.sourceType === 'title' && !titleAppliesToSwitching
      ? { currentStatDelta: statDelta }
      : { statDelta };
    const buffAmplificationDelta = row.sourceType === 'upgrade'
      ? 0
      : Number(scoringTargetEffects?.buffAmplification || 0) - Number(scoringCurrentEffects?.buffAmplification || 0);
    const oathSetBuffPowerDelta = row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
      ? Number(row.oathSetBuffPowerDelta || 0)
      : 0;
    const buffPowerDelta = row.sourceType === 'upgrade'
      ? 0
      : Number(scoringTargetEffects?.buffPower || 0) - Number(scoringCurrentEffects?.buffPower || 0) + oathSetBuffPowerDelta;
    const buffAmplificationChanges = row.sourceType === 'title' && !titleAppliesToSwitching
      ? { currentBuffAmplificationDelta: buffAmplificationDelta }
      : {
        currentBuffAmplificationDelta: buffAmplificationDelta,
        switchingBuffAmplificationDelta: buffAmplificationDelta,
      };
    const bufferStatGain = row.sourceType === 'avatar'
      ? Number(row.effects?.bufferStat || 0)
      : 0;
    const bufferStatScope = row.sourceType === 'avatar' ? row.bufferStatScope || 'common' : '';
    const avatarStatChanges = row.sourceType !== 'avatar'
      ? {}
      : bufferStatScope === 'current'
        ? { currentStatDelta: bufferStatGain }
        : bufferStatScope === 'switching'
          ? { switchingStatDelta: bufferStatGain }
          : { statDelta: bufferStatGain };
    const skillDelta = row.sourceType === 'enchant'
      ? getBufferEnchantSkillDelta(
        row,
        current,
        baseline,
      )
      : { selfStatSkillDelta: 0, auraStatDelta: 0, auraAttackDelta: 0 };
    const avatarSkillLevelChanges = row.sourceType === 'avatar'
      ? {
        buffSkillLevelDelta: Number(row.bufferBuffSkillLevelDelta || 0),
        awakeningSkillLevelDelta: Number(row.bufferAwakeningSkillLevelDelta || 0),
      }
      : {};
    const itemSkillChanges = getBufferItemSkillChanges(row, current, baseline);
    const baseCandidateChanges = {
      statDelta: Number(replacementStatChanges.statDelta || 0)
        + Number(avatarStatChanges.statDelta || 0)
        + Number(itemSkillChanges.statDelta || 0),
      buffPowerDelta,
      ...buffAmplificationChanges,
      switchingBuffAmplificationDelta: Number(buffAmplificationChanges.switchingBuffAmplificationDelta || 0)
        + Number(itemSkillChanges.switchingBuffAmplificationDelta || 0),
      currentStatDelta: Number(replacementStatChanges.currentStatDelta || 0)
        + Number(avatarStatChanges.currentStatDelta || 0)
        + Number(itemSkillChanges.currentStatDelta || 0),
      switchingStatDelta: Number(avatarStatChanges.switchingStatDelta || 0)
        + Number(itemSkillChanges.switchingStatDelta || 0),
      ...skillDelta,
      auraStatDelta: Number(skillDelta.auraStatDelta || 0)
        + Number(itemSkillChanges.auraStatDelta || 0),
      auraAttackDelta: Number(skillDelta.auraAttackDelta || 0)
        + Number(itemSkillChanges.auraAttackDelta || 0),
      buffSkillLevelDelta: Number(avatarSkillLevelChanges.buffSkillLevelDelta || 0)
        + Number(itemSkillChanges.buffSkillLevelDelta || 0),
      awakeningSkillLevelDelta: Number(avatarSkillLevelChanges.awakeningSkillLevelDelta || 0)
        + Number(itemSkillChanges.awakeningSkillLevelDelta || 0),
    };
    const oathAcquisitionEvaluation = OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
      ? getBufferOathAcquisitionEvaluation(row, simulator)
      : null;
    const bufferAvatarEmblemChangesBySocket = row.sourceType === 'avatar'
      && row.kind === 'brilliantEmblem'
      && row.bufferStatScope !== 'switching'
      ? getBufferAvatarEmblemChangesBySocket(row, baseline)
      : null;
    const bufferSwitchingAvatarEmblemOverlaysBySocket = getBufferSwitchingAvatarEmblemOverlays(row);
    const bufferSwitchingAvatarEmblemChangesBySocket = bufferSwitchingAvatarEmblemOverlaysBySocket
      ? resolveBufferSwitchingAvatarEmblemChanges(
        simulator,
        bufferSwitchingAvatarEmblemOverlaysBySocket,
        baseline,
      )
      : null;
    const bufferBaseRelativeChanges = row.sourceType === 'creatureArtifact'
      ? getBufferCreatureArtifactBaseRelativeChanges(row, current)
      : row.sourceType === 'creature'
        ? getBufferCreatureBaseRelativeChanges(row, currentCreature || {}, baseline)
      : row.sourceType === 'aura'
        ? getBufferAuraBaseRelativeChanges(row, currentAura || {}, baseline)
      : row.sourceType === 'title'
        ? getBufferTitleBaseRelativeChanges(row, simulator?.baseTitle || currentTitle || {}, baseline)
      : row.sourceType === 'switchingCreature'
        ? getBufferSwitchingCreatureBaseRelativeChanges(row)
      : row.sourceType === 'switchingTitle'
        ? getBufferSwitchingTitleBaseRelativeChanges(row)
      : row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem'
        ? getBufferSwitchingPlatinumBaseRelativeChanges(row)
      : row.sourceType === 'avatar' && row.kind === 'switchingAvatar'
        ? getBufferSwitchingAvatarBaseRelativeChanges(row)
      : row.sourceType === 'avatar' && row.kind === 'platinumEmblem'
        ? getBufferAvatarPlatinumBaseRelativeChanges(row, baseline)
      : row.sourceType === 'avatar' && row.kind === 'brilliantEmblem'
        ? (bufferAvatarEmblemChangesBySocket || bufferSwitchingAvatarEmblemChangesBySocket)
          ? mergeBufferChangeMap(
            bufferAvatarEmblemChangesBySocket || bufferSwitchingAvatarEmblemChangesBySocket,
          )
          : null
      : row.sourceType === 'blackFang'
        ? getBufferBlackFangBaseRelativeChanges(row)
      : row.sourceType === 'upgrade'
        ? getBufferUpgradeBaseRelativeChanges(row, simulator)
        : row.sourceType === 'equipmentTune'
          ? getBufferEquipmentTuneBaseRelativeChanges(row)
        : row.sourceType === 'oathTune'
          ? getBufferOathTuneBaseRelativeChanges(row)
        : OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
          ? oathAcquisitionEvaluation?.candidateChanges || null
        : getBufferEnchantBaseRelativeChanges(row, current, baseline);
    let bufferSimulatorSupported = simulator?.role === 'buffer' && Boolean(bufferBaseRelativeChanges);
    let baseCandidateScore = calculateBufferScore(baseline, baseCandidateChanges);
    if (bufferSimulatorSupported) {
      try {
        baseCandidateScore = calculateBufferScore(
          baseline,
          resolveBufferNetChanges(
            row.sourceType === 'enchant' ? { [row.slot]: bufferBaseRelativeChanges } : {},
            simulator.bufferSkillContexts,
            row.sourceType === 'creatureArtifact'
              ? { [getCreatureArtifactType(row)]: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'upgrade'
              ? { [row.slot]: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'equipmentTune'
              ? { equipmentTune: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'oathTune'
              ? { oathTune: bufferBaseRelativeChanges }
              : {},
            OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
              ? { oathAcquisition: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'blackFang'
              ? { [row.slot]: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'creature'
              ? { creature: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'aura'
              ? { aura: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'title'
              ? { title: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'switchingCreature'
              ? { switchingCreature: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'switchingTitle'
              ? { switchingTitle: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'avatar' && row.kind === 'switchingAvatar'
              ? { [getBuffSimulatorTargetSlotId(row)]: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem'
              ? { [getBuffSimulatorTargetSlotId(row)]: bufferBaseRelativeChanges }
              : {},
            row.sourceType === 'avatar' && row.kind === 'brilliantEmblem'
              ? bufferAvatarEmblemChangesBySocket || bufferSwitchingAvatarEmblemChangesBySocket
              : row.sourceType === 'avatar' && row.kind === 'platinumEmblem'
                ? { [row.targetSlotId]: bufferBaseRelativeChanges }
                : {},
            simulator,
          ),
        );
      } catch {
        bufferSimulatorSupported = false;
      }
    }
    const baseIncrementalBuffScore = baseCandidateScore - baseScore;
    if (baseIncrementalBuffScore <= 0.0001) return;
    let candidateScore = baseCandidateScore;
    let comparisonScore = baseScore;
    if (bufferSimulatorSupported) {
      const referenceChangesBySlot = { ...(simulator.enchantChangesBySlot || {}) };
      const referenceArtifactChangesByType = { ...(simulator.artifactChangesByType || {}) };
      const referenceUpgradeChangesBySlot = { ...(simulator.upgradeChangesBySlot || {}) };
      const referenceEquipmentTuneChangesBySource = {
        ...(simulator.equipmentTuneChangesBySource || {}),
      };
      const referenceOathTuneChangesBySource = {
        ...(simulator.oathTuneChangesBySource || {}),
      };
      const referenceOathAcquisitionChangesBySource = {
        ...(simulator.oathAcquisitionChangesBySource || {}),
      };
      const referenceBlackFangChangesBySlot = {
        ...(simulator.blackFangChangesBySlot || {}),
      };
      const referenceCreatureChangesBySource = {
        ...(simulator.creatureChangesBySource || {}),
      };
      const referenceAuraChangesBySource = {
        ...(simulator.auraChangesBySource || {}),
      };
      const referenceTitleChangesBySource = {
        ...(simulator.titleChangesBySource || {}),
      };
      const referenceSwitchingCreatureChangesBySource = {
        ...(simulator.switchingCreatureChangesBySource || {}),
      };
      const referenceSwitchingTitleChangesBySource = {
        ...(simulator.switchingTitleChangesBySource || {}),
      };
      const referenceSwitchingAvatarChangesBySlot = {
        ...(simulator.switchingAvatarChangesBySlot || {}),
      };
      const referenceSwitchingPlatinumChangesBySlot = {
        ...(simulator.switchingPlatinumChangesBySlot || {}),
      };
      const referenceAvatarEmblemChangesBySocket = {
        ...(simulator.avatarEmblemChangesBySocket || {}),
      };
      const referenceSwitchingAvatarEmblemOverlaysBySocket = {
        ...(simulator.switchingAvatarEmblemOverlaysBySocket || {}),
      };
      const referenceAvatarPlatinumChangesBySlot = {
        ...(simulator.avatarPlatinumChangesBySlot || {}),
      };
      if (row.sourceType === 'enchant') delete referenceChangesBySlot[row.slot];
      if (row.sourceType === 'creatureArtifact') {
        delete referenceArtifactChangesByType[getCreatureArtifactType(row)];
      }
      if (row.sourceType === 'upgrade') delete referenceUpgradeChangesBySlot[row.slot];
      if (row.sourceType === 'equipmentTune') {
        delete referenceEquipmentTuneChangesBySource.equipmentTune;
      }
      if (row.sourceType === 'oathTune') {
        delete referenceOathTuneChangesBySource.oathTune;
      }
      if (OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)) {
        delete referenceOathAcquisitionChangesBySource.oathAcquisition;
        if (oathAcquisitionEvaluation?.referenceChanges) {
          referenceOathAcquisitionChangesBySource.oathAcquisition =
            oathAcquisitionEvaluation.referenceChanges;
        }
      }
      if (row.sourceType === 'blackFang') delete referenceBlackFangChangesBySlot[row.slot];
      if (row.sourceType === 'creature') delete referenceCreatureChangesBySource.creature;
      if (row.sourceType === 'aura') delete referenceAuraChangesBySource.aura;
      if (row.sourceType === 'title') delete referenceTitleChangesBySource.title;
      if (row.sourceType === 'switchingCreature') {
        delete referenceSwitchingCreatureChangesBySource.switchingCreature;
      }
      if (row.sourceType === 'switchingTitle') {
        delete referenceSwitchingTitleChangesBySource.switchingTitle;
      }
      if (row.sourceType === 'avatar' && row.kind === 'switchingAvatar') {
        delete referenceSwitchingAvatarChangesBySlot[getBuffSimulatorTargetSlotId(row)];
      }
      if (row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem') {
        delete referenceSwitchingPlatinumChangesBySlot[getBuffSimulatorTargetSlotId(row)];
      }
      if (row.sourceType === 'avatar' && row.kind === 'brilliantEmblem') {
        const socketPrefix = `${String(row.targetSlotId || '').trim()}:`;
        const targetMap = row.bufferStatScope === 'switching'
          ? referenceSwitchingAvatarEmblemOverlaysBySocket
          : referenceAvatarEmblemChangesBySocket;
        Object.keys(targetMap).forEach((socketKey) => {
          if (socketKey.startsWith(socketPrefix)) delete targetMap[socketKey];
        });
      }
      if (row.sourceType === 'avatar' && row.kind === 'platinumEmblem') {
        delete referenceAvatarPlatinumChangesBySlot[row.targetSlotId];
      }
      const candidateChangesBySlot = row.sourceType === 'enchant'
        ? { ...referenceChangesBySlot, [row.slot]: bufferBaseRelativeChanges }
        : referenceChangesBySlot;
      const candidateArtifactChangesByType = row.sourceType === 'creatureArtifact'
        ? {
          ...referenceArtifactChangesByType,
          [getCreatureArtifactType(row)]: bufferBaseRelativeChanges,
        }
        : referenceArtifactChangesByType;
      const candidateUpgradeChangesBySlot = row.sourceType === 'upgrade'
        ? { ...referenceUpgradeChangesBySlot, [row.slot]: bufferBaseRelativeChanges }
        : referenceUpgradeChangesBySlot;
      const candidateEquipmentTuneChangesBySource = row.sourceType === 'equipmentTune'
        ? { ...referenceEquipmentTuneChangesBySource, equipmentTune: bufferBaseRelativeChanges }
        : referenceEquipmentTuneChangesBySource;
      const candidateOathTuneChangesBySource = row.sourceType === 'oathTune'
        ? { ...referenceOathTuneChangesBySource, oathTune: bufferBaseRelativeChanges }
        : referenceOathTuneChangesBySource;
      const candidateOathAcquisitionChangesBySource = OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
        ? { oathAcquisition: bufferBaseRelativeChanges }
        : referenceOathAcquisitionChangesBySource;
      const candidateBlackFangChangesBySlot = row.sourceType === 'blackFang'
        ? { ...referenceBlackFangChangesBySlot, [row.slot]: bufferBaseRelativeChanges }
        : referenceBlackFangChangesBySlot;
      const candidateCreatureChangesBySource = row.sourceType === 'creature'
        ? { creature: bufferBaseRelativeChanges }
        : referenceCreatureChangesBySource;
      const candidateAuraChangesBySource = row.sourceType === 'aura'
        ? { aura: bufferBaseRelativeChanges }
        : referenceAuraChangesBySource;
      const candidateTitleChangesBySource = row.sourceType === 'title'
        ? { title: bufferBaseRelativeChanges }
        : referenceTitleChangesBySource;
      const candidateSwitchingCreatureChangesBySource = row.sourceType === 'switchingCreature'
        ? { switchingCreature: bufferBaseRelativeChanges }
        : referenceSwitchingCreatureChangesBySource;
      const candidateSwitchingTitleChangesBySource = row.sourceType === 'switchingTitle'
        ? { switchingTitle: bufferBaseRelativeChanges }
        : referenceSwitchingTitleChangesBySource;
      const candidateSwitchingAvatarChangesBySlot = row.sourceType === 'avatar'
        && row.kind === 'switchingAvatar'
        ? {
          ...referenceSwitchingAvatarChangesBySlot,
          [getBuffSimulatorTargetSlotId(row)]: {
            ...bufferBaseRelativeChanges,
            regularEmblems: cloneSimulatorValue(row.targetBuffChanges?.avatar?.emblems || []),
          },
        }
        : referenceSwitchingAvatarChangesBySlot;
      const candidateSwitchingPlatinumChangesBySlot = row.sourceType === 'avatar'
        && row.kind === 'switchingPlatinumEmblem'
        ? {
          ...referenceSwitchingPlatinumChangesBySlot,
          [getBuffSimulatorTargetSlotId(row)]: bufferBaseRelativeChanges,
        }
        : referenceSwitchingPlatinumChangesBySlot;
      const candidateAvatarEmblemChangesBySocket = row.sourceType === 'avatar'
        && row.kind === 'brilliantEmblem'
        && row.bufferStatScope !== 'switching'
        ? {
          ...referenceAvatarEmblemChangesBySocket,
          ...bufferAvatarEmblemChangesBySocket,
        }
        : referenceAvatarEmblemChangesBySocket;
      const candidateSwitchingAvatarEmblemOverlaysBySocket = row.sourceType === 'avatar'
        && row.kind === 'brilliantEmblem'
        && row.bufferStatScope === 'switching'
        ? {
          ...referenceSwitchingAvatarEmblemOverlaysBySocket,
          ...bufferSwitchingAvatarEmblemOverlaysBySocket,
        }
        : referenceSwitchingAvatarEmblemOverlaysBySocket;
      const candidateAvatarPlatinumChangesBySlot = row.sourceType === 'avatar'
        && row.kind === 'platinumEmblem'
        ? {
          ...referenceAvatarPlatinumChangesBySlot,
          [row.targetSlotId]: bufferBaseRelativeChanges,
        }
        : referenceAvatarPlatinumChangesBySlot;
      const referenceScopeSimulator = getBufferRecommendationScopeSimulator(simulator, row, false);
      const candidateScopeSimulator = getBufferRecommendationScopeSimulator(simulator, row, true);
      try {
        comparisonScore = calculateBufferScore(
          baseline,
          resolveBufferNetChanges(
            referenceChangesBySlot,
            simulator.bufferSkillContexts,
            referenceArtifactChangesByType,
            referenceUpgradeChangesBySlot,
            referenceEquipmentTuneChangesBySource,
            referenceOathTuneChangesBySource,
            referenceOathAcquisitionChangesBySource,
            referenceBlackFangChangesBySlot,
            referenceCreatureChangesBySource,
            referenceAuraChangesBySource,
            referenceTitleChangesBySource,
            referenceSwitchingCreatureChangesBySource,
            referenceSwitchingTitleChangesBySource,
            referenceSwitchingAvatarChangesBySlot,
            referenceSwitchingPlatinumChangesBySlot,
            {
              ...getBufferAvatarEmblemNetChanges(
                simulator,
                referenceAvatarEmblemChangesBySocket,
                referenceSwitchingAvatarEmblemOverlaysBySocket,
                referenceSwitchingAvatarChangesBySlot,
              ),
              ...referenceAvatarPlatinumChangesBySlot,
            },
            referenceScopeSimulator,
          ),
        );
        candidateScore = calculateBufferScore(
          baseline,
          resolveBufferNetChanges(
            candidateChangesBySlot,
            simulator.bufferSkillContexts,
            candidateArtifactChangesByType,
            candidateUpgradeChangesBySlot,
            candidateEquipmentTuneChangesBySource,
            candidateOathTuneChangesBySource,
            candidateOathAcquisitionChangesBySource,
            candidateBlackFangChangesBySlot,
            candidateCreatureChangesBySource,
            candidateAuraChangesBySource,
            candidateTitleChangesBySource,
            candidateSwitchingCreatureChangesBySource,
            candidateSwitchingTitleChangesBySource,
            candidateSwitchingAvatarChangesBySlot,
            candidateSwitchingPlatinumChangesBySlot,
            {
              ...getBufferAvatarEmblemNetChanges(
                simulator,
                candidateAvatarEmblemChangesBySocket,
                candidateSwitchingAvatarEmblemOverlaysBySocket,
                candidateSwitchingAvatarChangesBySlot,
              ),
              ...candidateAvatarPlatinumChangesBySlot,
            },
            candidateScopeSimulator,
          ),
        );
      } catch {
        bufferSimulatorSupported = false;
        candidateScore = baseCandidateScore;
        comparisonScore = baseScore;
      }
    }
    const incrementalBuffScore = candidateScore - comparisonScore;
    const incrementalBuffPercent = comparisonScore > 0 ? (candidateScore / comparisonScore - 1) * 100 : 0;
    const price = getRecommendationGold(row, includeMaterialCosts);
    const buffCostPerHundredPoints = Number.isFinite(price) && price > 0 && incrementalBuffScore > 0
      ? price * 100 / incrementalBuffScore
      : 0;
    const key = row.sourceType === 'enchant'
      ? [
        row.sourceType,
        row.slot,
        getEffectSignature(scoringCurrentEffects),
        getEffectSignature(scoringTargetEffects),
        getRoundedMetricKey(baseIncrementalBuffScore),
        getStableObjectSignature(skillDelta),
        getStableObjectSignature(itemSkillChanges),
      ].join(':')
      : ['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)
      ? `${row.sourceType}:${row.slot}:${row.upgradeMode}:${row.targetLevel}`
      : OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
        ? `${row.sourceType}:${row.variantGroupKey}:${Number(row.variantCount || 1)}`
      : row.sourceType === 'blackFang'
        ? `${row.sourceType}:${row.slot}:${getEffectSignature(scoringTargetEffects)}`
      : row.sourceType === 'creature'
        ? `${row.sourceType}:${row.slot}:${row.tier}`
      : `${row.sourceType}:${row.slot}:${row.tier}:${getEffectSignature(row.effects)}:${bufferStatScope}:${JSON.stringify(skillDelta)}:${JSON.stringify(itemSkillChanges)}`;
    const previous = bySlotTier.get(key);
    if (
      row.sourceType === 'creature'
        ? (
          !previous ||
          buffCostPerHundredPoints > 0 &&
            (!previous.buffCostPerHundredPoints || buffCostPerHundredPoints < previous.buffCostPerHundredPoints)
        )
        : isPreferredDuplicateRecommendation(row, previous, includeMaterialCosts)
    ) {
      bySlotTier.set(key, {
        ...row,
        currentEnchant: current,
        metricType: 'buffer',
        currentBufferScore: comparisonScore,
        candidateBufferScore: candidateScore,
        incrementalBuffScore,
        incrementalBuffPercent,
        buffCostPerHundredPoints,
        bufferSkillDelta: skillDelta,
        bufferStatDelta: statDelta,
        bufferBuffPowerDelta: buffPowerDelta,
        bufferBuffAmplificationDelta: buffAmplificationDelta,
        incrementalDamagePercent: incrementalBuffPercent,
        bufferSimulatorSupported,
        bufferBaseRelativeChanges,
        bufferAvatarEmblemChangesBySocket,
        bufferSwitchingAvatarEmblemOverlaysBySocket,
      });
    }
  });
  const efficiencyFilteredRows = removeInefficientLowerTierEnchants([...bySlotTier.values()], true);
  const bestUpgradeBySlot = new Map();
  const nonUpgradeRows = [];
  efficiencyFilteredRows.forEach((row) => {
    if (!['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)) {
      nonUpgradeRows.push(row);
      return;
    }
    const previous = bestUpgradeBySlot.get(row.slot);
    if (!previous || row.buffCostPerHundredPoints < previous.buffCostPerHundredPoints) {
      bestUpgradeBySlot.set(row.slot, row);
    }
  });
  return [...nonUpgradeRows, ...bestUpgradeBySlot.values()].sort(compareBufferRecommendationOrder);
}

function getTitleRows(groups, currentTitle) {
  const titleRows = (groups || []).flatMap((group) => (group.candidates || [])
    .map((candidate) => ({
      sourceType: 'title',
      slot: '칭호',
      tier: candidate.variant || '일반',
      itemId: candidate.itemId,
      itemName: candidate.itemName || candidate.name,
      titleItemName: candidate.itemName || candidate.name,
      itemRarity: candidate.itemRarity || '레어',
      fame: candidate.fame,
      iconUrl: candidate.priceItem?.iconUrl || candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
      titleIconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
      effects: candidate.effects || {},
      titlePackageEffects: candidate.effects || {},
      itemReinforceSkill: candidate.itemReinforceSkill || [],
      itemBuff: candidate.itemBuff || {},
      itemExplain: candidate.itemExplain || '',
      auction: candidate.auction || {},
      candidateName: candidate.name,
      groupName: group.groupName,
      levelTag: candidate.levelTag,
      skillDamagePercent: candidate.skillDamagePercent,
      priceItem: candidate.priceItem || null,
      titleEnchantElement: candidate.titleEnchantElement || '',
      enchantEffects: candidate.enchantEffects || {},
      purchaseRoute: candidate.purchaseRoute || '',
      purchaseRouteLabel: candidate.purchaseRouteLabel || '',
      titleBead: candidate.titleBead || null,
    })));
  return [
    ...titleRows,
    ...getCurrentTitleBeadRows(titleRows, currentTitle),
  ];
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

function getAvatarRows(currentAvatar) {
  return (currentAvatar?.recommendations || []).map((candidate) => ({
    sourceType: 'avatar',
    kind: candidate.kind || '',
    slot: candidate.slot || '아바타',
    tier: candidate.tier || '아바타',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '',
    fame: 0,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 0),
    baseRelativeSkillDamageMultiplier: Number(candidate.skillDamageMultiplier || 0),
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    expectedGold: candidate.expectedGold,
    acquisition: candidate.acquisition || null,
    needCount: candidate.needCount || 0,
    unitPrice: candidate.unitPrice,
    targetSlotId: candidate.targetSlotId || '',
    targetPlatinumEmblem: candidate.targetPlatinumEmblem || null,
    targetBuffSlot: candidate.targetBuffSlot || '',
    targetBuffChanges: candidate.targetBuffChanges || null,
    socketChanges: Array.isArray(candidate.socketChanges) ? candidate.socketChanges : [],
    targetSkill: candidate.targetSkill || '',
    equivalentTargetSkills: candidate.equivalentTargetSkills || [],
    currentSwitchingMultiplier: Number(candidate.currentSwitchingMultiplier || 0),
    candidateSwitchingMultiplier: Number(candidate.candidateSwitchingMultiplier || 0),
    priceMode: candidate.priceMode || '',
    bufferStatScope: candidate.bufferStatScope || '',
    bufferBuffSkillLevelDelta: Number(candidate.bufferBuffSkillLevelDelta || 0),
    bufferAwakeningSkillLevelDelta: Number(candidate.bufferAwakeningSkillLevelDelta || 0),
    bufferSimulatorChanges: candidate.bufferSimulatorChanges || null,
    bufferSkillStatDeltas: candidate.bufferSkillStatDeltas || {},
    bufferSkillLevels: candidate.bufferSkillLevels || {},
    currentPlatinumSkill: candidate.currentPlatinumSkill || '',
    baseSkillContributions: candidate.baseSkillContributions || [],
    targetSkillContributions: candidate.targetSkillContributions || [],
    hasExactSkillContributions: Array.isArray(candidate.baseSkillContributions)
      && Array.isArray(candidate.targetSkillContributions),
    skillContributionScope: candidate.skillContributionScope || '',
    priceWarningText: candidate.priceWarningText || '',
    recommendationPriority: Number(candidate.recommendationPriority || 0),
  }));
}

function normalizeAvatarSimulatorState(avatar = {}) {
  const normalized = cloneSimulatorValue(avatar || {});
  const platinumSlots = new Set(normalized.platinumSlots || []);
  normalized.recognizedTopOptionLevelContribution = normalized.jacket?.topOptionMatched ? 1 : 0;
  normalized.slots = (normalized.slots || []).map((slot) => {
    const regularSockets = Array.isArray(slot?.emblems) ? slot.emblems.slice(0, 2) : [];
    while (regularSockets.length < 2) regularSockets.push(null);
    const slotLabel = slot?.slotId === 'JACKET'
      ? AVATAR_PLATINUM_SLOT_LABEL_BY_KEY.top
      : slot?.slotId === 'PANTS'
        ? AVATAR_PLATINUM_SLOT_LABEL_BY_KEY.bottom
        : '';
    return {
      ...slot,
      recognizedPlatinumLevelContribution: slotLabel && platinumSlots.has(slotLabel) ? 1 : 0,
      emblems: regularSockets.map((emblem, socketIndex) => (
        emblem
          ? { ...emblem, socketKey: `regular:${socketIndex}`, socketIndex }
          : null
      )),
    };
  });
  return normalized;
}

function getAvatarRegularEmblemEffectsTotal(avatar = {}, mode = 'actual', baseline = {}) {
  const statKey = getDealerPrimaryStatKey(baseline);
  return (avatar?.slots || []).reduce((total, slot) => {
    const slotId = String(slot?.slotId || '').trim();
    return (slot?.emblems || []).reduce((slotTotal, emblem) => {
      if (!emblem) return slotTotal;
      if (mode === 'equipmentScore') {
        const grade = String(emblem.grade || '').trim();
        const scoreGroup = AVATAR_EQUIPMENT_SCORE_RED_SLOT_IDS.has(slotId)
          ? 'red'
          : AVATAR_EQUIPMENT_SCORE_GREEN_YELLOW_SLOT_IDS.has(slotId)
            ? 'greenYellow'
            : '';
        const recognizedStat = Number(AVATAR_EQUIPMENT_SCORE_STAT_BY_GRADE[scoreGroup]?.[grade] || 0);
        return recognizedStat ? addEffects(slotTotal, { [statKey]: recognizedStat }) : slotTotal;
      }
      return addEffects(slotTotal, emblem.effects || {});
    }, total);
  }, {});
}

function getAvatarEmblemMetricBaseline(baseBaseline = {}, baseAvatar = {}, mode = 'actual') {
  if (mode !== 'equipmentScore') return baseBaseline;
  const base = getDamageBaseline(baseBaseline);
  const recognitionDelta = normalizeSimulatorDamageDelta(
    subtractEffects(
      getAvatarRegularEmblemEffectsTotal(baseAvatar, 'equipmentScore', base),
      getAvatarRegularEmblemEffectsTotal(baseAvatar, 'actual', base),
    ),
    base,
  );
  return {
    ...baseBaseline,
    stat: base.stat + getSelectedStatEffect(recognitionDelta, base),
  };
}

function getBlackFangRows(recommendations = []) {
  return (recommendations || []).map((candidate) => ({
    sourceType: 'blackFang',
    slot: candidate.slot,
    tier: candidate.tier || '흑아',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '',
    fame: 0,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    currentEffects: candidate.currentEffects || {},
    targetEffects: candidate.targetEffects || {},
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    expectedGold: candidate.expectedGold,
    materials: Array.isArray(candidate.materials) ? candidate.materials : [],
    materialText: candidate.materialText || '',
    targetItemName: candidate.targetItemName || '',
    targetItemId: candidate.targetItemId || '',
    targetItemRarity: candidate.targetItemRarity || '',
    targetIconUrl: candidate.targetIconUrl || '',
    targetItemExplain: candidate.targetItemExplain || '',
  }));
}

function attachBlackFangBaseBodyData(equipmentRows = [], recommendations = []) {
  const recommendationBySlot = new Map(
    (recommendations || [])
      .filter((row) => BLACK_FANG_SIMULATOR_SLOTS.has(String(row?.slot || '').trim()))
      .map((row) => [row.slot, row]),
  );
  return cloneSimulatorValue(equipmentRows || []).map((equipment) => {
    const recommendation = recommendationBySlot.get(equipment?.slot);
    if (!recommendation) return equipment;
    return {
      ...equipment,
      bodyEffects: cloneSimulatorValue(recommendation.currentEffects || {}),
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

function getEnchantEffectsTotal(enchants = []) {
  return (enchants || []).reduce((total, enchant) => addEffects(total, enchant?.effects || {}), {});
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

function getEnchantFinalDamageChangeMultiplier(baseEnchants = [], simulatedEnchants = []) {
  const baseBySlot = new Map((baseEnchants || [])
    .filter((enchant) => enchant?.slot)
    .map((enchant) => [enchant.slot, enchant.effects || {}]));
  const simulatedBySlot = new Map((simulatedEnchants || [])
    .filter((enchant) => enchant?.slot)
    .map((enchant) => [enchant.slot, enchant.effects || {}]));
  const slots = new Set([...baseBySlot.keys(), ...simulatedBySlot.keys()]);
  return [...slots].reduce((multiplier, slot) => (
    multiplier * getFinalDamageReplacementMultiplier(
      baseBySlot.get(slot) || {},
      simulatedBySlot.get(slot) || {},
    )
  ), 1);
}

function normalizeSimulatorDamageDelta(effects = {}, baseline = {}) {
  const normalized = { ...(effects || {}) };
  const primaryKey = getDealerPrimaryStatKey(baseline);
  if (!primaryKey) return normalized;
  normalized[primaryKey] = Number(effects.allStat || 0) + Number(effects[primaryKey] || 0);
  delete normalized.allStat;
  delete normalized[primaryKey === 'str' ? 'int' : 'str'];
  return normalized;
}

function getTitleEffectsWithoutEnchantElement(title = {}) {
  const effects = { ...(title?.effects || {}) };
  const enchantElement = Number(title?.enchantEffects?.elementAll || 0);
  if (enchantElement) {
    effects.elementAll = Number(effects.elementAll || 0) - enchantElement;
    if (Math.abs(effects.elementAll) <= 0.000001) delete effects.elementAll;
  }
  return effects;
}

function getEquipmentBodyEffectsTotal(equipmentRows = []) {
  return (equipmentRows || []).reduce(
    (total, equipment) => addEffects(total, equipment?.bodyEffects || {}),
    {},
  );
}

function getEquipmentBodyFinalDamageChangeMultiplier(baseEquipment = [], simulatedEquipment = baseEquipment) {
  const baseBySlot = new Map((baseEquipment || []).map((equipment) => [equipment?.slot, equipment]));
  const simulatedBySlot = new Map((simulatedEquipment || []).map((equipment) => [equipment?.slot, equipment]));
  return [...BLACK_FANG_SIMULATOR_SLOTS].reduce((multiplier, slot) => (
    multiplier * getFinalDamageReplacementMultiplier(
      baseBySlot.get(slot)?.bodyEffects || {},
      simulatedBySlot.get(slot)?.bodyEffects || baseBySlot.get(slot)?.bodyEffects || {},
    )
  ), 1);
}

function buildSimulatedDamageBaseline(
  baseBaseline = {},
  baseEnchants = [],
  simulatedEnchants = [],
  baseAura = {},
  simulatedAura = baseAura,
  baseCreature = {},
  simulatedCreature = baseCreature,
  baseTitle = {},
  simulatedTitle = baseTitle,
  baseEquipment = [],
  simulatedEquipment = baseEquipment,
  baseOath = {},
  simulatedOath = baseOath,
  baseAvatar = {},
  simulatedAvatar = baseAvatar,
  avatarEmblemMode = 'actual',
  baseCreatureArtifacts = [],
  simulatedCreatureArtifacts = baseCreatureArtifacts,
  upgradeDb = {},
) {
  const metricBaseBaseline = getAvatarEmblemMetricBaseline(
    baseBaseline,
    baseAvatar,
    avatarEmblemMode,
  );
  const base = getDamageBaseline(metricBaseBaseline);
  const baseArtifactEffects = getCreatureArtifactEffectsTotal(
    baseCreatureArtifacts,
    metricBaseBaseline,
    baseTitle,
  );
  const simulatedArtifactEffects = getCreatureArtifactEffectsTotal(
    simulatedCreatureArtifacts,
    metricBaseBaseline,
    simulatedTitle,
  );
  const effectDelta = subtractEffects(
    addEffects(
      addEffects(
        addEffects(
          addEffects(getEnchantEffectsTotal(simulatedEnchants), simulatedAura?.effects || {}),
          addEffects(simulatedCreature?.effects || {}, simulatedArtifactEffects),
        ),
        getAvatarRegularEmblemEffectsTotal(simulatedAvatar, avatarEmblemMode, base),
      ),
      addEffects(
        getTitleEffectsWithoutEnchantElement(simulatedTitle),
        addEffects(
          addEffects(
            getEquipmentBodyEffectsTotal(simulatedEquipment),
            getEquipmentProgressionEffectsTotal(simulatedEquipment, upgradeDb, metricBaseBaseline),
          ),
          getOathCrystalEffectsTotal(simulatedOath),
        ),
      ),
    ),
    addEffects(
      addEffects(
        addEffects(
          addEffects(getEnchantEffectsTotal(baseEnchants), baseAura?.effects || {}),
          addEffects(baseCreature?.effects || {}, baseArtifactEffects),
        ),
        getAvatarRegularEmblemEffectsTotal(baseAvatar, avatarEmblemMode, base),
      ),
      addEffects(
        getTitleEffectsWithoutEnchantElement(baseTitle),
        addEffects(
          addEffects(
            getEquipmentBodyEffectsTotal(baseEquipment),
            getEquipmentProgressionEffectsTotal(baseEquipment, upgradeDb, metricBaseBaseline),
          ),
          getOathCrystalEffectsTotal(baseOath),
        ),
      ),
    ),
  );
  delete effectDelta.finalDamage;
  const delta = normalizeSimulatorDamageDelta(
    effectDelta,
    base,
  );
  const selectedStatDelta = getSelectedStatEffect(delta, base);
  const elementDelta = Number(delta.elementAll || 0);
  const simulatedBaseline = {
    ...(metricBaseBaseline || {}),
    stat: base.stat + selectedStatDelta,
    element: base.element + elementDelta,
    elementDamage: base.elementDamage + elementDelta * ELEMENT_DAMAGE_PER_ELEMENT,
    elementValues: Object.fromEntries(Object.entries(base.elementValues || {}).map(([key, value]) => [
      key,
      Number(value || 0) + elementDelta,
    ])),
    attack: base.attack + Number(delta.attack || 0),
    finalDamage: base.finalDamage,
    attackIncrease: base.attackIncrease + Number(delta.attackIncrease || 0),
    attackAmplification: base.attackAmplification + Number(delta.attackAmplification || 0),
  };
  return getAdjustedElementBaselineForRecommendation(
    { sourceType: 'title', ...simulatedTitle },
    baseTitle,
    simulatedBaseline,
  ) || simulatedBaseline;
}

function getSimulatorCumulativeDamageMultiplier(simulator = {}, avatarEmblemMode = 'actual') {
  if (!simulator?.baseDamageBaseline) return 1;
  const metricBaseBaseline = getAvatarEmblemMetricBaseline(
    simulator.baseDamageBaseline,
    simulator.baseAvatar,
    avatarEmblemMode,
  );
  const baseArtifactEffects = getCreatureArtifactEffectsTotal(
    simulator.baseCreatureArtifacts,
    metricBaseBaseline,
    simulator.baseTitle,
  );
  const simulatedArtifactEffects = getCreatureArtifactEffectsTotal(
    simulator.simulatedCreatureArtifacts,
    metricBaseBaseline,
    simulator.simulatedTitle,
  );
  const effectDelta = subtractEffects(
    addEffects(
      addEffects(
        addEffects(
          addEffects(getEnchantEffectsTotal(simulator.simulatedEnchants), simulator.simulatedAura?.effects || {}),
          addEffects(simulator.simulatedCreature?.effects || {}, simulatedArtifactEffects),
        ),
        getAvatarRegularEmblemEffectsTotal(simulator.simulatedAvatar, avatarEmblemMode, metricBaseBaseline),
      ),
      addEffects(
        addEffects(
          getEquipmentBodyEffectsTotal(simulator.simulatedEquipmentUpgrades),
          getEquipmentProgressionEffectsTotal(
            simulator.simulatedEquipmentUpgrades,
            simulator.upgradeDb,
            metricBaseBaseline,
          ),
        ),
        getOathCrystalEffectsTotal(simulator.simulatedOathUpgrades),
      ),
    ),
    addEffects(
      addEffects(
        addEffects(
          addEffects(getEnchantEffectsTotal(simulator.baseEnchants), simulator.baseAura?.effects || {}),
          addEffects(simulator.baseCreature?.effects || {}, baseArtifactEffects),
        ),
        getAvatarRegularEmblemEffectsTotal(simulator.baseAvatar, avatarEmblemMode, metricBaseBaseline),
      ),
      addEffects(
        addEffects(
          getEquipmentBodyEffectsTotal(simulator.baseEquipmentUpgrades),
          getEquipmentProgressionEffectsTotal(
            simulator.baseEquipmentUpgrades,
            simulator.upgradeDb,
            metricBaseBaseline,
          ),
        ),
        getOathCrystalEffectsTotal(simulator.baseOathUpgrades),
      ),
    ),
  );
  delete effectDelta.finalDamage;
  const delta = normalizeSimulatorDamageDelta(
    effectDelta,
    metricBaseBaseline,
  );
  const nonTitleMultiplier = estimateDamageMultiplier(delta, metricBaseBaseline)
    * getEnchantFinalDamageChangeMultiplier(
      simulator.baseEnchants,
      simulator.simulatedEnchants,
    )
    * getFinalDamageReplacementMultiplier(
      simulator.baseAura?.effects || {},
      simulator.simulatedAura?.effects || {},
    )
    * (getSkillDamageMultiplier(simulator.simulatedAura) / getSkillDamageMultiplier(simulator.baseAura))
    * getFinalDamageReplacementMultiplier(
      simulator.baseCreature?.effects || {},
      simulator.simulatedCreature?.effects || {},
    )
    * (getSkillDamageMultiplier(simulator.simulatedCreature) / getSkillDamageMultiplier(simulator.baseCreature))
    * getCreatureArtifactReplacementMultiplier(
      simulator.baseCreatureArtifacts,
      simulator.simulatedCreatureArtifacts,
    )
    * getEquipmentBodyFinalDamageChangeMultiplier(
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
    )
    * getEquipmentProgressionFinalDamageChangeMultiplier(
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
      simulator.upgradeDb,
      metricBaseBaseline,
    )
    * getEquipmentTuneDamageMultiplier(
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
    )
    * getOathCrystalFinalDamageChangeMultiplier(
      simulator.baseOathUpgrades,
      simulator.simulatedOathUpgrades,
    )
    * getOathTuneDamageMultiplier(
      simulator.oathTuneDb,
      simulator.baseOathUpgrades,
      simulator.simulatedOathUpgrades,
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
    avatarEmblemMode,
    simulator.baseCreatureArtifacts,
    simulator.simulatedCreatureArtifacts,
    simulator.upgradeDb,
  );
  const simulatedTitleRow = { sourceType: 'title', ...(simulator.simulatedTitle || {}) };
  const adjustedTitleBaseline = getAdjustedElementBaselineForRecommendation(
    simulatedTitleRow,
    simulator.baseTitle,
    titleReferenceBaseline,
  );
  const titleDamagePercent = adjustedTitleBaseline
    ? getElementAdjustedReplacementIncrementalDamagePercent(
      simulatedTitleRow,
      simulator.baseTitle,
      titleReferenceBaseline,
      adjustedTitleBaseline,
    )
    : getReplacementIncrementalDamagePercent(
      simulatedTitleRow,
      simulator.baseTitle,
      titleReferenceBaseline,
    );
  return nonTitleMultiplier
    * (1 + titleDamagePercent / 100)
    * (avatarEmblemMode === 'equipmentScore'
      ? getDealerAvatarPlatinumEquipmentScoreMultiplier(simulator)
      : getAvatarPlatinumDamageMultiplier(simulator.avatarPlatinumChangesBySlot))
    * getBuffEnhancementMetricMultiplier(simulator, avatarEmblemMode);
}

function getBuffLoadoutRowsForMetric(value) {
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === 'object');
  return value && typeof value === 'object' ? [value] : [];
}

function getBuffLoadoutLevelContribution(loadout = {}) {
  const titleLevel = getBuffLoadoutRowsForMetric(loadout.equipment)
    .filter((row) => String(row?.slotId || '').trim() === 'TITLE')
    .reduce((sum, row) => sum + Number(row?.buffContribution?.skillLevel || 0), 0);
  const avatarLevel = getBuffLoadoutRowsForMetric(loadout.avatar).reduce((sum, row) => (
    sum
    + Number(row?.buffContribution?.topOptionSkillLevel || 0)
    + Number(row?.buffContribution?.platinumSkillLevel || 0)
  ), 0);
  const creatureLevel = getBuffLoadoutRowsForMetric(loadout.creature)
    .reduce((sum, row) => sum + Number(row?.buffContribution?.skillLevel || 0), 0);
  return titleLevel + avatarLevel + creatureLevel;
}

function getBuffLoadoutDenseFragmentCount(loadout = {}) {
  return Math.max(0, Math.min(12, getBuffLoadoutRowsForMetric(loadout.equipment)
    .filter((row) => row?.buffContribution?.isDenseFragment === true)
    .length));
}

function getBuffLoadoutFragmentCoefficients(loadout = {}, coefficientCount = 0) {
  const result = Array.from({ length: Math.max(0, coefficientCount) }, () => 0);
  getBuffLoadoutRowsForMetric(loadout.equipment).forEach((row) => {
    const contribution = row?.buffContribution || {};
    const values = Array.isArray(contribution.additionalRatePercents)
      ? contribution.additionalRatePercents
      : [contribution.additionalRatePercent];
    result.forEach((_, index) => {
      result[index] += Number(values[index] || 0);
    });
  });
  return result;
}

function getBuffEnhancementState(loadout = {}, baseLoadout = loadout) {
  const skillInfo = baseLoadout?.skillInfo || loadout?.skillInfo || {};
  const baseLevel = Number(skillInfo.level || 0);
  const levelDelta = getBuffLoadoutLevelContribution(loadout)
    - getBuffLoadoutLevelContribution(baseLoadout);
  const effectiveLevel = Math.max(0, Math.min(20, baseLevel + levelDelta));
  return {
    effectiveLevel,
    denseFragmentCount: getBuffLoadoutDenseFragmentCount(loadout),
  };
}

function getBuffEquipmentScoreCoefficient(loadout = {}, baseLoadout = loadout) {
  const { effectiveLevel, denseFragmentCount } = getBuffEnhancementState(loadout, baseLoadout);
  return 100 - (20 - effectiveLevel) * 2 + denseFragmentCount * 0.25;
}

function getBuffActualDamageMultiplier(loadout = {}, baseLoadout = loadout) {
  const skillInfo = baseLoadout?.skillInfo || {};
  const currentCoefficients = (skillInfo.currentCoefficients || []).map(Number);
  let perLevelCoefficients = (skillInfo.perLevelCoefficients || []).map(Number);
  if (!currentCoefficients.length) return 1;
  if (perLevelCoefficients.length === 1 && currentCoefficients.length > 1) {
    perLevelCoefficients = Array.from({ length: currentCoefficients.length }, () => perLevelCoefficients[0]);
  }
  if (perLevelCoefficients.length !== currentCoefficients.length) return 1;
  const { effectiveLevel } = getBuffEnhancementState(loadout, baseLoadout);
  const baseEffectiveLevel = getBuffEnhancementState(baseLoadout, baseLoadout).effectiveLevel;
  const levelDelta = effectiveLevel - baseEffectiveLevel;
  const baseFragmentCoefficients = getBuffLoadoutFragmentCoefficients(
    baseLoadout,
    currentCoefficients.length,
  );
  const simulatedFragmentCoefficients = getBuffLoadoutFragmentCoefficients(
    loadout,
    currentCoefficients.length,
  );
  const simulatedCoefficients = currentCoefficients.map((value, index) => (
    value
    + levelDelta * Number(perLevelCoefficients[index] || 0)
    - Number(baseFragmentCoefficients[index] || 0)
    + Number(simulatedFragmentCoefficients[index] || 0)
  ));
  const coefficientMultiplier = (values) => values.reduce(
    (multiplier, value) => multiplier * (1 + Number(value || 0) / 100),
    1,
  );
  const baseMultiplier = coefficientMultiplier(currentCoefficients);
  if (!(baseMultiplier > 0)) return 1;
  const rawMultiplier = coefficientMultiplier(simulatedCoefficients) / baseMultiplier;
  const applicationRatio = Number(skillInfo.damageApplicationRatio || 1);
  const safeRatio = applicationRatio > 0 && applicationRatio <= 1 ? applicationRatio : 1;
  return 1 + (rawMultiplier - 1) * safeRatio;
}

function getBuffEnhancementMetricMultiplier(simulator = {}, mode = 'actual') {
  const baseLoadout = simulator.baseBuffLoadout || {};
  const simulatedLoadout = simulator.simulatedBuffLoadout || baseLoadout;
  if (!baseLoadout?.skillInfo) return 1;
  if (mode === 'equipmentScore') {
    const baseCoefficient = getBuffEquipmentScoreCoefficient(baseLoadout, baseLoadout);
    const simulatedCoefficient = getBuffEquipmentScoreCoefficient(simulatedLoadout, baseLoadout);
    return baseCoefficient > 0 ? simulatedCoefficient / baseCoefficient : 1;
  }
  return getBuffActualDamageMultiplier(simulatedLoadout, baseLoadout);
}

function replaceBuffMetricRow(loadout, collectionName, predicate, nextRow) {
  const rows = getBuffLoadoutRowsForMetric(loadout?.[collectionName]);
  const index = rows.findIndex(predicate);
  if (index >= 0) rows.splice(index, 1, cloneSimulatorValue(nextRow));
  else rows.push(cloneSimulatorValue(nextRow));
  loadout[collectionName] = rows;
}

function adaptBuffEnhancementRecommendation(row = {}, simulator = {}) {
  const groupKey = getBuffSimulatorExclusiveGroupKey(row);
  const baseLoadout = simulator?.baseBuffLoadout;
  if (!groupKey || !baseLoadout?.skillInfo) return row;
  const reference = cloneSimulatorValue(simulator.simulatedBuffLoadout || baseLoadout);
  const candidate = cloneSimulatorValue(reference);
  const targetSlotId = getBuffSimulatorTargetSlotId(row);
  if (row.sourceType === 'switchingFragment') {
    const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.equipment)
      .find((item) => String(item?.slotName || '').trim() === targetSlotId) || {
      slotName: targetSlotId,
      buffContribution: {
        additionalRatePercent: 0,
        additionalRatePercents: [],
        isDenseFragment: false,
      },
    };
    const targetRow = row.targetBuffChanges?.equipment;
    if (!targetRow) return row;
    replaceBuffMetricRow(reference, 'equipment', (item) => (
      String(item?.slotName || '').trim() === targetSlotId
    ), baseRow);
    replaceBuffMetricRow(candidate, 'equipment', (item) => (
      String(item?.slotName || '').trim() === targetSlotId
    ), { ...baseRow, ...targetRow });
  } else if (row.sourceType === 'switchingTitle') {
    const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.equipment)
      .find((item) => String(item?.slotId || '').trim() === 'TITLE');
    if (!baseRow) return row;
    replaceBuffMetricRow(reference, 'equipment', (item) => (
      String(item?.slotId || '').trim() === 'TITLE'
    ), baseRow);
    replaceBuffMetricRow(candidate, 'equipment', (item) => (
      String(item?.slotId || '').trim() === 'TITLE'
    ), {
      ...baseRow,
      itemId: row.itemId,
      buffContribution: { skillLevel: Number(row.candidateTitleContribution || 0) },
    });
  } else if (row.sourceType === 'switchingCreature') {
    const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.creature)[0];
    if (!baseRow) return row;
    reference.creature = [cloneSimulatorValue(baseRow)];
    candidate.creature = [{
      ...cloneSimulatorValue(baseRow),
      itemId: row.itemId,
      buffContribution: { skillLevel: Number(row.candidateCreatureContribution || 0) },
    }];
  } else if (row.kind === 'switchingAvatar') {
    const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.avatar)
      .find((item) => String(item?.slotId || '').trim() === targetSlotId);
    const targetRow = row.targetBuffChanges?.avatar;
    if (!baseRow || !targetRow) return row;
    replaceBuffMetricRow(reference, 'avatar', (item) => (
      String(item?.slotId || '').trim() === targetSlotId
    ), baseRow);
    replaceBuffMetricRow(candidate, 'avatar', (item) => (
      String(item?.slotId || '').trim() === targetSlotId
    ), { ...baseRow, ...targetRow });
  } else if (row.kind === 'switchingPlatinumEmblem') {
    const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.avatar)
      .find((item) => String(item?.slotId || '').trim() === targetSlotId);
    const targetLevel = Number(row.targetBuffChanges?.platinumEmblem?.skillLevel || 0);
    if (!baseRow || targetLevel <= 0) return row;
    const currentRow = getBuffLoadoutRowsForMetric(reference.avatar)
      .find((item) => String(item?.slotId || '').trim() === targetSlotId) || baseRow;
    replaceBuffMetricRow(reference, 'avatar', (item) => (
      String(item?.slotId || '').trim() === targetSlotId
    ), {
      ...currentRow,
      buffContribution: {
        ...(currentRow.buffContribution || {}),
        platinumSkillLevel: Number(baseRow?.buffContribution?.platinumSkillLevel || 0),
      },
    });
    replaceBuffMetricRow(candidate, 'avatar', (item) => (
      String(item?.slotId || '').trim() === targetSlotId
    ), {
      ...currentRow,
      buffContribution: {
        ...(currentRow.buffContribution || {}),
        platinumSkillLevel: targetLevel,
      },
    });
  } else {
    return row;
  }
  const referenceMultiplier = getBuffActualDamageMultiplier(reference, baseLoadout);
  const candidateMultiplier = getBuffActualDamageMultiplier(candidate, baseLoadout);
  if (!(referenceMultiplier > 0) || !(candidateMultiplier > referenceMultiplier)) return row;
  const skillDamageMultiplier = candidateMultiplier / referenceMultiplier;
  return {
    ...row,
    effects: { ...(row.effects || {}), skillDamageMultiplier },
    skillDamageMultiplier,
    rawSkillDamageMultiplier: skillDamageMultiplier,
  };
}

function getTuneDetailLine(equipment = {}) {
  const text = formatTuneState(equipment);
  return text ? {
    text,
    className: 'enchant-portrait-detail-line-effect',
  } : null;
}

function isEquipmentTuneCandidate(equipment = {}) {
  const rarity = String(equipment.itemRarity || '').trim();
  const itemName = String(equipment.itemName || '').trim();
  const level = Number(equipment.tuneLevel || 0);
  if (!EQUIPMENT_TUNE_COST_BY_RARITY[rarity]) return false;
  if (/^고유\s*[:\-]/.test(itemName)) return false;
  if (equipment.tuneUpgradeable === false) return false;
  return Number.isFinite(level) && level < EQUIPMENT_TUNE_MAX_LEVEL;
}

function getEquipmentTuneStage(point) {
  const value = Number(point || 0);
  if (!Number.isFinite(value) || value < EQUIPMENT_TUNE_MIN_SET_POINT) return 0;
  return Math.floor((value - EQUIPMENT_TUNE_MIN_SET_POINT) / EQUIPMENT_TUNE_MEMORY_POINT);
}

function addMaterialAmount(materials, key, amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) return;
  const row = materials.find((material) => material.key === key);
  if (row) {
    row.amount += value;
    return;
  }
  materials.push({
    key,
    label: UPGRADE_MATERIAL_LABELS[key] || key,
    amount: value,
  });
}

function allocateEquipmentTuneCost(candidates = [], tuneCount = 0) {
  let remaining = Number(tuneCount || 0);
  const materials = [];
  const steps = [];
  const slotChanges = [];
  let gold = 0;
  const sorted = candidates
    .slice()
    .sort((a, b) => {
      const costA = EQUIPMENT_TUNE_COST_BY_RARITY[a.itemRarity] || {};
      const costB = EQUIPMENT_TUNE_COST_BY_RARITY[b.itemRarity] || {};
      const orderDiff = Number(costA.order || 0) - Number(costB.order || 0);
      if (orderDiff) return orderDiff;
      const slotIndexA = EQUIPMENT_TUNE_SLOT_ORDER.indexOf(a.slot);
      const slotIndexB = EQUIPMENT_TUNE_SLOT_ORDER.indexOf(b.slot);
      return (slotIndexA < 0 ? EQUIPMENT_TUNE_SLOT_ORDER.length : slotIndexA)
        - (slotIndexB < 0 ? EQUIPMENT_TUNE_SLOT_ORDER.length : slotIndexB);
    });
  sorted.forEach((equipment) => {
    if (remaining <= 0) return;
    const count = Math.min(remaining, Number(equipment.tuneRemaining || 0));
    const cost = EQUIPMENT_TUNE_COST_BY_RARITY[equipment.itemRarity];
    if (!cost || count <= 0) return;
    remaining -= count;
    gold += Number(cost.gold || 0) * count;
    addMaterialAmount(materials, cost.materialKey, Number(cost.materialAmount || 0) * count);
    const fromTuneLevel = Number(equipment.tuneLevel || 0);
    const toTuneLevel = fromTuneLevel + count;
    slotChanges.push({
      slot: equipment.slot,
      fromTuneLevel,
      toTuneLevel,
      count,
    });
    for (let level = fromTuneLevel; level < toTuneLevel; level += 1) {
      steps.push({
        slot: equipment.slot,
        fromTuneLevel: level,
        toTuneLevel: level + 1,
      });
    }
  });
  return remaining > 0 ? null : {
    gold,
    materials,
    tunePlan: { steps, slotChanges },
  };
}

function getEquipmentTuneSetPoint(currentEquipmentUpgrades = []) {
  return (currentEquipmentUpgrades || []).reduce((sum, equipment) => {
    const setPoint = Number(equipment.tuneSetPoint || 0);
    return sum + (Number.isFinite(setPoint) ? setPoint : 0);
  }, 0);
}

function getEquipmentTuneDamageMultiplier(baseEquipment = [], simulatedEquipment = baseEquipment) {
  const baseStage = getEquipmentTuneStage(getEquipmentTuneSetPoint(baseEquipment));
  const simulatedStage = getEquipmentTuneStage(getEquipmentTuneSetPoint(simulatedEquipment));
  const baseMultiplier = 1 + baseStage * EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE / 100;
  const simulatedMultiplier = 1 + simulatedStage * EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE / 100;
  return baseMultiplier > 0 ? simulatedMultiplier / baseMultiplier : 1;
}

function applyEquipmentTunePlan(equipmentRows = [], tunePlan = {}) {
  const nextEquipment = cloneSimulatorValue(equipmentRows || []);
  const bySlot = new Map(nextEquipment.filter((equipment) => equipment?.slot).map((equipment) => [equipment.slot, equipment]));
  const slotChanges = Array.isArray(tunePlan?.slotChanges) ? tunePlan.slotChanges : [];
  const steps = Array.isArray(tunePlan?.steps) ? tunePlan.steps : [];
  const plannedCount = slotChanges.reduce((sum, change) => sum + Number(change?.count || 0), 0);
  if (!slotChanges.length || (steps.length && steps.length !== plannedCount)) return null;
  for (const change of slotChanges) {
    const equipment = bySlot.get(change?.slot);
    const fromTuneLevel = Number(change?.fromTuneLevel);
    const toTuneLevel = Number(change?.toTuneLevel);
    const count = Number(change?.count);
    if (
      !equipment ||
      Number(equipment.tuneLevel || 0) !== fromTuneLevel ||
      !Number.isInteger(count) ||
      count <= 0 ||
      toTuneLevel !== fromTuneLevel + count ||
      toTuneLevel > EQUIPMENT_TUNE_MAX_LEVEL
    ) return null;
  }
  slotChanges.forEach((change) => {
    const equipment = bySlot.get(change.slot);
    const count = Number(change.count);
    equipment.tuneLevel = Number(change.toTuneLevel);
    equipment.tuneSetPoint = Number(equipment.tuneSetPoint || 0) + count * EQUIPMENT_TUNE_STEP_POINT;
    equipment.tuneRemaining = Math.max(0, Number(equipment.tuneRemaining || 0) - count);
  });
  return nextEquipment;
}

function getChangedEquipmentTuneSlots(previousRows = [], nextRows = []) {
  const previousBySlot = new Map((previousRows || []).filter((row) => row?.slot).map((row) => [row.slot, row]));
  return (nextRows || [])
    .filter((row) => row?.slot && Number(row.tuneLevel || 0) !== Number(previousBySlot.get(row.slot)?.tuneLevel || 0))
    .map((row) => row.slot);
}

function getEquipmentTuneRows(currentEquipmentUpgrades = [], materialPrices = {}, bufferBaseline = null) {
  const totalSetPoint = getEquipmentTuneSetPoint(currentEquipmentUpgrades);
  if (totalSetPoint < EQUIPMENT_TUNE_MIN_SET_POINT) return [];
  const candidates = (currentEquipmentUpgrades || [])
    .filter(isEquipmentTuneCandidate)
    .map((equipment) => ({
      ...equipment,
      tuneRemaining: Math.max(0, Math.min(
        EQUIPMENT_TUNE_MAX_LEVEL - Number(equipment.tuneLevel || 0),
        Number.isFinite(Number(equipment.tuneRemaining))
          ? Number(equipment.tuneRemaining)
          : EQUIPMENT_TUNE_MAX_LEVEL - Number(equipment.tuneLevel || 0),
      )),
    }))
    .filter((equipment) => equipment.tuneRemaining > 0);
  const maxTuneCount = candidates.reduce((sum, equipment) => sum + Number(equipment.tuneRemaining || 0), 0);
  if (maxTuneCount <= 0) return [];
  const currentStage = getEquipmentTuneStage(totalSetPoint);
  const maxStage = getEquipmentTuneStage(totalSetPoint + maxTuneCount * EQUIPMENT_TUNE_STEP_POINT);
  if (maxStage <= currentStage) return [];

  const tuneSteps = [];
  for (let stage = currentStage + 1; stage <= maxStage; stage += 1) {
    const threshold = EQUIPMENT_TUNE_MIN_SET_POINT + stage * EQUIPMENT_TUNE_MEMORY_POINT;
    const tuneCount = Math.ceil((threshold - totalSetPoint) / EQUIPMENT_TUNE_STEP_POINT);
    if (tuneCount <= 0 || tuneCount > maxTuneCount) continue;
    const cost = allocateEquipmentTuneCost(candidates, tuneCount);
    if (!cost || cost.gold <= 0) continue;
    const targetSetPoint = totalSetPoint + tuneCount * EQUIPMENT_TUNE_STEP_POINT;
    const expectedMaterials = applyUpgradeMaterialPrices(cost.materials, 'equipmentTune', materialPrices)
      .map((material) => ({
        ...material,
        itemName: material.label || material.itemName,
      }));
    const finalDamageBefore = currentStage * EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE;
    const finalDamageAfter = stage * EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE;
    const damageMultiplier = (1 + finalDamageAfter / 100) / (1 + finalDamageBefore / 100);
    const buffPowerBefore = currentStage * EQUIPMENT_TUNE_MEMORY_BUFF_POWER;
    const buffPowerAfter = stage * EQUIPMENT_TUNE_MEMORY_BUFF_POWER;
    const isBuffer = Boolean(bufferBaseline?.isBuffer);
    tuneSteps.push({
      index: tuneSteps.length,
      tuneCount,
      currentSetPoint: totalSetPoint,
      targetSetPoint,
      currentFinalDamage: finalDamageBefore,
      targetFinalDamage: finalDamageAfter,
      currentBuffPower: buffPowerBefore,
      targetBuffPower: buffPowerAfter,
      expectedGold: cost.gold,
      expectedMaterials,
      tunePlan: cloneSimulatorValue(cost.tunePlan),
      effects: isBuffer
        ? { buffPower: buffPowerAfter - buffPowerBefore }
        : { skillDamageMultiplier: damageMultiplier },
    });
  }
  const first = tuneSteps[0];
  if (!first) return [];
  const iconEquipment = candidates.find((equipment) => equipment.iconUrl) || {};
  return [{
    sourceType: 'equipmentTune',
    slot: '장비 조율',
    tier: '조율',
    itemName: '장비 조율',
    itemRarity: '',
    iconUrl: iconEquipment.iconUrl || '',
    itemExplain: '',
    effects: first.effects,
    auction: { minUnitPrice: first.expectedGold },
    expectedGold: first.expectedGold,
    expectedMaterials: first.expectedMaterials,
    tunePlan: cloneSimulatorValue(first.tunePlan),
    tuneSteps,
    selectedTuneStepIndex: 0,
    currentSetPoint: first.currentSetPoint,
    targetSetPoint: first.targetSetPoint,
    currentTuneFinalDamage: first.currentFinalDamage,
    targetTuneFinalDamage: first.targetFinalDamage,
    currentTuneBuffPower: first.currentBuffPower,
    targetTuneBuffPower: first.targetBuffPower,
    tuneCount: first.tuneCount,
  }];
}

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

function getOathAcquisitionSlotIndex(selection = {}, groupKey = '') {
  const decisionSlotIndex = Number(selection.targetDecision?.slotIndex);
  if (Number.isInteger(decisionSlotIndex)) return decisionSlotIndex;
  return Number(String(selection.targetSlot || groupKey).split(':').pop());
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


function getOathTranscendRows(recommendations = [], materialPrices = {}, sourceType = 'oathTranscend') {
  return (recommendations || []).map((candidate) => {
    const materials = candidate.materials || [];
    const pricedMaterials = sourceType === 'oathCraft'
      ? materials.filter((material) => material?.key === 'radiantSoul')
      : materials.filter((material) => material?.key !== 'solidSoul');
    const expectedMaterials = applyUpgradeMaterialPrices(
      pricedMaterials,
      sourceType,
      materialPrices,
    );
    const priceDecisionEntry = (entry) => {
      const entryMaterials = entry.materials || [];
      const pricedEntryMaterials = sourceType === 'oathCraft'
        ? entryMaterials.filter((material) => material?.key === 'radiantSoul')
        : entryMaterials.filter((material) => material?.key !== 'solidSoul');
      return {
        ...cloneSimulatorValue(entry),
        expectedMaterials: applyUpgradeMaterialPrices(
          pricedEntryMaterials,
          sourceType,
          materialPrices,
        ),
      };
    };
    const decisionPlan = (candidate.decisionPlan || []).map(priceDecisionEntry);
    const decisionCandidatePool = (candidate.decisionCandidatePool || candidate.decisionPlan || [])
      .map(priceDecisionEntry);
    return {
      sourceType,
      kind: candidate.kind || (sourceType === 'oathCraft' ? 'oath_craft' : 'oath_transcend'),
      slot: candidate.slot || (sourceType === 'oathCraft' ? '서약 정가' : '서약 초월'),
      tier: candidate.tier || (sourceType === 'oathCraft' ? '정가' : '서약 초월'),
      itemId: candidate.itemId || '',
      itemName: candidate.itemName || candidate.targetItemName || '서약 초월',
      itemRarity: candidate.itemRarity || candidate.targetRarity || '',
      iconUrl: candidate.iconUrl || '',
      itemExplain: candidate.itemExplain || '',
      effects: candidate.effects || {},
      currentEffects: candidate.currentEffects || {},
      targetEffects: candidate.targetEffects || {},
      skillDamageMultiplier: candidate.skillDamageMultiplier,
      oathSetBuffPowerDelta: candidate.oathSetBuffPowerDelta,
      currentSetPoint: candidate.currentSetPoint,
      targetSetPoint: candidate.targetSetPoint,
      currentSlotSetPoint: candidate.currentSlotSetPoint,
      targetSlotSetPoint: candidate.targetSlotSetPoint,
      currentTuneFinalDamage: candidate.currentTuneFinalDamage,
      targetTuneFinalDamage: candidate.targetTuneFinalDamage,
      currentTuneBuffPower: candidate.currentTuneBuffPower,
      targetTuneBuffPower: candidate.targetTuneBuffPower,
      currentOathSetFinalDamage: candidate.currentOathSetFinalDamage,
      targetOathSetFinalDamage: candidate.targetOathSetFinalDamage,
      currentOathStageName: candidate.currentOathStageName,
      targetOathStageName: candidate.targetOathStageName,
      currentOathStageRequiredPoint: candidate.currentOathStageRequiredPoint,
      targetOathStageRequiredPoint: candidate.targetOathStageRequiredPoint,
      auction: candidate.auction || { minUnitPrice: candidate.expectedGold || 0 },
      expectedGold: candidate.expectedGold,
      expectedMaterials,
      materials,
      materialText: candidate.materialText || '',
      currentItemName: candidate.currentItemName || '',
      currentRarity: candidate.currentRarity || '',
      targetItemName: candidate.targetItemName || candidate.itemName || '',
      targetRarity: candidate.targetRarity || candidate.itemRarity || '',
      variantGroupKey: candidate.variantGroupKey || '',
      variantIndex: Number(candidate.variantIndex || 0),
      variantCount: Number(candidate.variantCount || 1),
      variantTotal: Number(candidate.variantTotal || 1),
      decisionPlan,
      decisionCandidatePool,
    };
  });
}

function collapseOathDecisionRecommendationVariants(rows = [], selectedIndexByGroup = {}) {
  const variantsByGroup = new Map();
  (rows || []).forEach((row) => {
    if (!OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType) || !row.variantGroupKey) return;
    const variants = variantsByGroup.get(row.variantGroupKey) || [];
    variants.push(row);
    variantsByGroup.set(row.variantGroupKey, variants);
  });
  variantsByGroup.forEach((variants) => {
    variants.sort((a, b) => Number(a.variantCount || 1) - Number(b.variantCount || 1));
  });
  const emittedGroups = new Set();
  return (rows || []).flatMap((row) => {
    const variants = variantsByGroup.get(row.variantGroupKey);
    if (!variants?.length) return [row];
    if (emittedGroups.has(row.variantGroupKey)) return [];
    emittedGroups.add(row.variantGroupKey);
    const selectedIndex = Math.max(
      0,
      Math.min(variants.length - 1, Number(selectedIndexByGroup[row.variantGroupKey] || 0)),
    );
    return [{
      ...variants[selectedIndex],
      selectedVariantIndex: selectedIndex,
      oathDecisionVariants: variants,
    }];
  });
}

function getOathAcquisitionVariantRows(row = {}) {
  return (Array.isArray(row.oathDecisionVariants) && row.oathDecisionVariants.length
    ? row.oathDecisionVariants
    : [row])
    .filter(Boolean)
    .slice()
    .sort((a, b) => Number(a.variantCount || 1) - Number(b.variantCount || 1));
}

function getOathAcquisitionVariantForCount(row = {}, count = 0) {
  const requestedCount = Number(count || 0);
  if (!Number.isInteger(requestedCount) || requestedCount <= 0) return null;
  return getOathAcquisitionVariantRows(row)
    .find((variant) => Number(variant.variantCount || 1) === requestedCount) || null;
}

function getOathAcquisitionCombinedPairKey(row = {}) {
  if (!OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)) return '';
  const targetRarity = String(row.targetRarity || row.itemRarity || '').trim();
  return targetRarity ? `oathDecision:${targetRarity}` : '';
}

function getOathAcquisitionVariantFromRecommendations(recommendations = [], count = 0) {
  const requestedCount = Number(count || 0);
  if (!Number.isInteger(requestedCount) || requestedCount <= 0) return null;
  return recommendations
    .flatMap(getOathAcquisitionVariantRows)
    .find((variant) => Number(variant.variantCount || 1) === requestedCount) || null;
}

function getActiveOathAcquisitionSelectionEntries(simulator = {}) {
  const entries = [];
  Object.entries(simulator?.activeSelectionByGroup || {}).forEach(([
    exclusiveGroupKey,
    selection,
  ]) => {
    const visited = new Set();
    let current = selection;
    let parentSelection = null;
    let depth = 0;
    while (current?.applyType === 'acquireOathDecision' && !visited.has(current)) {
      visited.add(current);
      entries.push({
        exclusiveGroupKey,
        selection: current,
        parentSelection,
        depth,
      });
      parentSelection = current;
      current = current.replacedAcquisitionSelection;
      depth += 1;
    }
  });
  return entries;
}

function getActiveOathAcquisitionSelections(simulator = {}) {
  return getActiveOathAcquisitionSelectionEntries(simulator)
    .map(({ selection }) => selection);
}

function getActiveOathAcquisitionMethodCounts(simulator = {}, rows = []) {
  const targetGroupKeys = new Set(
    rows.map(getOathAcquisitionTargetGroupKey).filter(Boolean),
  );
  const variantGroupKeys = new Set(rows.map((row) => row?.variantGroupKey).filter(Boolean));
  return getActiveOathAcquisitionSelections(simulator).reduce((counts, selection) => {
    const matchesTargetGroup = targetGroupKeys.size > 0
      && targetGroupKeys.has(selection?.acquisitionTargetGroupKey);
    const matchesVariantGroup = targetGroupKeys.size === 0
      && variantGroupKeys.has(selection?.acquisitionVariantGroupKey);
    if (
      selection?.applyType !== 'acquireOathDecision'
      || (!matchesTargetGroup && !matchesVariantGroup)
    ) return counts;
    const method = selection.acquisitionMethod === 'craft' ? 'craft' : 'transcend';
    counts[method] += 1;
    return counts;
  }, { transcend: 0, craft: 0 });
}

function combineOathAcquisitionRecommendationRows(
  rows = [],
  simulator = {},
  previewCountsByPair = {},
  includeMaterialCosts = false,
  previewOnly = false,
) {
  const rowsByPair = new Map();
  rows.forEach((row, index) => {
    const pairKey = getOathAcquisitionCombinedPairKey(row);
    if (!pairKey) return;
    const pair = rowsByPair.get(pairKey) || { index, transcend: [], craft: [] };
    pair[row.sourceType === 'oathCraft' ? 'craft' : 'transcend'].push(row);
    rowsByPair.set(pairKey, pair);
  });
  const emittedPairs = new Set();
  return rows.flatMap((row) => {
    const pairKey = getOathAcquisitionCombinedPairKey(row);
    const pair = rowsByPair.get(pairKey);
    if (!pairKey || !pair?.transcend.length || !pair?.craft.length) return [row];
    if (emittedPairs.has(pairKey)) return [];
    emittedPairs.add(pairKey);
    const pickRepresentative = (candidates) => (
      candidates.find((candidate) => isAppliedOathAcquisitionRecommendation(candidate, simulator))
      || candidates.find((candidate) => Array.isArray(candidate.oathDecisionVariants))
      || candidates[0]
    );
    const transcendRecommendations = pair.transcend.slice();
    const craftRecommendations = pair.craft.slice();
    const transcendRecommendation = pickRepresentative(transcendRecommendations);
    const craftRecommendation = pickRepresentative(craftRecommendations);
    const activeCounts = getActiveOathAcquisitionMethodCounts(
      simulator,
      [...transcendRecommendations, ...craftRecommendations],
    );
    const maxDecisionCount = Math.max(
      activeCounts.transcend + activeCounts.craft,
      ...transcendRecommendations.flatMap(getOathAcquisitionVariantRows)
        .map((variant) => Number(variant.variantCount || 1)),
      ...craftRecommendations.flatMap(getOathAcquisitionVariantRows)
        .map((variant) => Number(variant.variantCount || 1)),
    );
    if (maxDecisionCount <= 0) return [row];
    const hasActiveCounts = activeCounts.transcend + activeCounts.craft > 0;
    const previewCounts = previewCountsByPair?.[pairKey] || {};
    const defaultMethod = row.sourceType === 'oathCraft' ? 'craft' : 'transcend';
    let transcendCount = hasActiveCounts
      ? activeCounts.transcend
      : Number.isInteger(Number(previewCounts.transcend))
        ? Number(previewCounts.transcend)
        : defaultMethod === 'transcend' ? Math.min(1, maxDecisionCount) : 0;
    let craftCount = hasActiveCounts
      ? activeCounts.craft
      : Number.isInteger(Number(previewCounts.craft))
        ? Number(previewCounts.craft)
        : defaultMethod === 'craft' ? Math.min(1, maxDecisionCount) : 0;
    transcendCount = Math.max(0, Math.min(maxDecisionCount, transcendCount));
    craftCount = Math.max(0, Math.min(maxDecisionCount - transcendCount, craftCount));
    const totalCount = transcendCount + craftCount;
    const transcendVariant = getOathAcquisitionVariantFromRecommendations(
      transcendRecommendations,
      transcendCount,
    );
    const craftVariant = getOathAcquisitionVariantFromRecommendations(
      craftRecommendations,
      craftCount,
    );
    const appliedCombinedSnapshot = hasActiveCounts
      ? getActiveOathAcquisitionSelections(simulator)
        .map((selection) => selection?.appliedCombinedRecommendationSnapshot)
        .find((snapshot) => (
          snapshot?.oathAcquisitionPairKey === pairKey
          && Number(snapshot.transcendCount || 0) === transcendCount
          && Number(snapshot.craftCount || 0) === craftCount
        ))
      : null;
    const effectVariant = appliedCombinedSnapshot
      || getOathAcquisitionVariantFromRecommendations(transcendRecommendations, totalCount)
      || getOathAcquisitionVariantFromRecommendations(craftRecommendations, totalCount)
      || transcendRecommendation;
    const priceRows = [transcendVariant, craftVariant].filter(Boolean);
    const goldWithoutMaterials = priceRows.reduce(
      (sum, priceRow) => sum + getRecommendationGold(priceRow, false),
      0,
    );
    const goldWithMaterials = priceRows.reduce(
      (sum, priceRow) => sum + getRecommendationGold(priceRow, true),
      0,
    );
    const expectedMaterials = mergeUpgradeMaterials(
      transcendVariant?.expectedMaterials || [],
      craftVariant?.expectedMaterials || [],
    );
    const materials = mergeUpgradeMaterials(
      transcendVariant?.materials || [],
      craftVariant?.materials || [],
    );
    const combinedRow = {
      ...cloneSimulatorValue(effectVariant),
      sourceType: 'oathAcquisitionCombined',
      kind: 'oathAcquisitionCombined',
      previewOnly,
      characterRole: effectVariant.metricType === 'buffer' ? 'buffer' : 'dealer',
      slot: '서약 결정',
      tier: '초월/정가',
      itemName: `${effectVariant.targetRarity || effectVariant.itemRarity || ''} 서약 결정 획득 ${totalCount}개`.trim(),
      expectedGold: goldWithoutMaterials,
      auction: { ...(effectVariant.auction || {}), minUnitPrice: goldWithoutMaterials },
      expectedMaterials,
      materials,
      costPerPointOnePercent: getCostPerPointOnePercent({
        ...effectVariant,
        expectedGold: includeMaterialCosts ? goldWithMaterials : goldWithoutMaterials,
        expectedMaterials: [],
      }),
      oathAcquisitionPairKey: pairKey,
      transcendRecommendation,
      craftRecommendation,
      transcendRecommendations,
      craftRecommendations,
      transcendVariant,
      craftVariant,
      transcendCount,
      craftCount,
      maxDecisionCount,
      variantCount: totalCount,
      variantTotal: maxDecisionCount,
    };
    if (combinedRow.metricType === 'buffer') {
      const incrementalBuffScore = totalCount > 0
        ? Number(effectVariant.incrementalBuffScore || 0)
        : 0;
      const currentBufferScore = Number(effectVariant.currentBufferScore || 0);
      combinedRow.currentBufferScore = currentBufferScore;
      combinedRow.candidateBufferScore = totalCount > 0
        ? Number(effectVariant.candidateBufferScore || currentBufferScore)
        : currentBufferScore;
      combinedRow.incrementalBuffScore = incrementalBuffScore;
      combinedRow.incrementalBuffPercent = totalCount > 0
        ? Number(effectVariant.incrementalBuffPercent || 0)
        : 0;
      combinedRow.incrementalDamagePercent = combinedRow.incrementalBuffPercent;
      combinedRow.buffCostPerHundredPoints = incrementalBuffScore > 0
        ? getRecommendationGold(combinedRow, includeMaterialCosts) * 100 / incrementalBuffScore
        : 0;
      if (totalCount === 0) {
        combinedRow.targetSetPoint = combinedRow.currentSetPoint;
        combinedRow.targetOathStageName = combinedRow.currentOathStageName;
      }
    }
    return [combinedRow];
  });
}

function attachOathAcquisitionBaseCalculationData(oathUpgrades = {}, recommendations = []) {
  const nextOath = cloneSimulatorValue(oathUpgrades || {});
  const crystalBySlot = new Map(
    (nextOath.crystals || []).map((crystal) => [Number(crystal?.index), crystal]),
  );
  (recommendations || []).forEach((recommendation) => {
    (recommendation?.decisionPlan || []).forEach((entry) => {
      const crystal = crystalBySlot.get(Number(entry?.slotIndex));
      if (!crystal) return;
      if (entry.currentEffects && Object.keys(entry.currentEffects).length) {
        crystal.effects = cloneSimulatorValue(entry.currentEffects);
      }
      if (Number(entry.currentSlotSetPoint) > 0) {
        crystal.setPoint = Number(entry.currentSlotSetPoint);
      }
    });
  });
  return nextOath;
}

function replaceOathDecisionBody(currentCrystal = {}, planEntry = {}, maxTuneLevel = 3) {
  return {
    ...cloneSimulatorValue(currentCrystal || {}),
    itemId: planEntry.targetItemId || '',
    itemName: planEntry.targetItemName || '',
    itemRarity: planEntry.targetRarity || '',
    iconUrl: planEntry.targetIconUrl || '',
    effects: cloneSimulatorValue(planEntry.targetEffects || {}),
    setPoint: Number(planEntry.targetSlotSetPoint || 0),
    tuneLevel: 0,
    tuneUpgradeable: ['레어', '유니크', '레전더리', '에픽'].includes(planEntry.targetRarity),
    tuneRemaining: planEntry.targetRarity === '에픽' ? maxTuneLevel : 0,
  };
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

function getBufferOathStateBaseRelativeChanges(baseOath = {}, targetOath = {}, db = {}) {
  const baseEffects = getRoleRelevantEffects(
    combineOathDecisionEffects(baseOath.crystals || [], 'effects'),
    true,
  );
  const targetEffects = getRoleRelevantEffects(
    combineOathDecisionEffects(targetOath.crystals || [], 'effects'),
    true,
  );
  const changedKeys = new Set([
    ...Object.keys(baseEffects),
    ...Object.keys(targetEffects),
  ].filter((key) => Number(baseEffects[key] || 0) !== Number(targetEffects[key] || 0)));
  if ([...changedKeys].some((key) => !['allStat', 'buffPower', 'buffAmplification'].includes(key))) {
    return null;
  }
  const baseState = getOathTuneState(db, Number(baseOath.setPoint || 0));
  const targetState = getOathTuneState(db, Number(targetOath.setPoint || 0));
  if (!baseState || !targetState) return null;
  const baseSetBuffPower = Number(baseState.blessingBuffPower || 0)
    + Number(baseState.stageBuffPower || 0);
  const targetSetBuffPower = Number(targetState.blessingBuffPower || 0)
    + Number(targetState.stageBuffPower || 0);
  const buffAmplificationDelta = Number(targetEffects.buffAmplification || 0)
    - Number(baseEffects.buffAmplification || 0);
  return {
    statDelta: Number(targetEffects.allStat || 0) - Number(baseEffects.allStat || 0),
    buffPowerDelta: Number(targetEffects.buffPower || 0) - Number(baseEffects.buffPower || 0)
      + targetSetBuffPower - baseSetBuffPower,
    currentBuffAmplificationDelta: buffAmplificationDelta,
    switchingBuffAmplificationDelta: buffAmplificationDelta,
  };
}

function getBufferOathAcquisitionEvaluation(row = {}, simulator = {}) {
  if (simulator?.role !== 'buffer' || !OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)) {
    return null;
  }
  const requestedCount = Math.max(1, Number(row.variantCount || row.decisionPlan?.length || 1));
  const { referenceOath } = getOathAcquisitionReferenceState(simulator, row, requestedCount);
  const candidateOath = cloneSimulatorValue(referenceOath);
  const crystals = Array.isArray(candidateOath.crystals) ? candidateOath.crystals : [];
  const maxTuneLevel = Number(simulator.oathTuneDb?.maxTuneLevel || 3);
  for (const entry of row.decisionPlan || []) {
    const crystalIndex = crystals.findIndex(
      (crystal) => Number(crystal?.index) === Number(entry?.slotIndex),
    );
    if (crystalIndex < 0 || !entry?.targetItemId) return null;
    const currentSetPoint = Number(crystals[crystalIndex]?.setPoint || 0);
    const targetSetPoint = Number(entry.targetSlotSetPoint || 0);
    candidateOath.setPoint = Number(candidateOath.setPoint || 0) - currentSetPoint + targetSetPoint;
    crystals.splice(
      crystalIndex,
      1,
      replaceOathDecisionBody(crystals[crystalIndex], entry, maxTuneLevel),
    );
  }
  syncOathTuneStageDisplay(candidateOath, simulator.oathTuneDb);
  const referenceChanges = getBufferOathStateBaseRelativeChanges(
    simulator.baseOathUpgrades,
    referenceOath,
    simulator.oathTuneDb,
  );
  const candidateChanges = getBufferOathStateBaseRelativeChanges(
    simulator.baseOathUpgrades,
    candidateOath,
    simulator.oathTuneDb,
  );
  return referenceChanges && candidateChanges
    ? { referenceChanges, candidateChanges }
    : null;
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

function getCurrentEnchantBySlot(currentEnchants, baseline) {
  const bySlot = new Map();
  (currentEnchants || []).forEach((enchant) => {
    bySlot.set(enchant.slot, {
      ...enchant,
      estimatedDamagePercent: estimateDamagePercent(enchant.effects, baseline),
    });
  });
  return bySlot;
}

function getEffectSignature(effects = {}) {
  return EFFECT_ORDER
    .map((key) => `${key}:${Number(effects[key] || 0)}`)
    .join('|');
}

function getEnchantExclusiveGroupKey(row = {}) {
  const slot = String(row.slot || '').trim();
  return row.sourceType === 'enchant' && slot ? `enchant:${slot}` : '';
}

function getEnchantCandidateSignature(row = {}) {
  const groupKey = getEnchantExclusiveGroupKey(row);
  if (!groupKey) return '';
  return [
    groupKey,
    row.itemId || '',
    row.tier || '',
    getEffectSignature(row.effects || {}),
    getStableObjectSignature(row.reinforceSkill || []),
  ].join(':');
}

function getAuraExclusiveGroupKey(row = {}) {
  return row.sourceType === 'aura' ? 'aura' : '';
}

function getAuraCandidateSignature(row = {}) {
  const groupKey = getAuraExclusiveGroupKey(row);
  if (!groupKey) return '';
  return [
    groupKey,
    row.itemId || '',
    row.tier || '',
    getEffectSignature(row.effects || {}),
    getStableObjectSignature(row.itemReinforceSkill || row.reinforceSkills || []),
    Number(row.skillDamageMultiplier || 1).toFixed(8),
  ].join(':');
}

function getCreatureExclusiveGroupKey(row = {}) {
  return row.sourceType === 'creature' ? 'creature' : '';
}

function getCreatureCandidateSignature(row = {}) {
  const groupKey = getCreatureExclusiveGroupKey(row);
  if (!groupKey) return '';
  return [
    groupKey,
    row.itemId || '',
    row.tier || '',
    getEffectSignature(row.effects || {}),
    getStableObjectSignature(row.itemReinforceSkill || row.reinforceSkills || []),
    Number(row.skillDamageMultiplier || 1).toFixed(8),
  ].join(':');
}

const CREATURE_ARTIFACT_TYPES = new Set(['RED', 'BLUE', 'GREEN']);

function getCreatureArtifactType(row = {}) {
  const artifactType = String(row.artifactType || row.slotColor || '').trim().toUpperCase();
  return CREATURE_ARTIFACT_TYPES.has(artifactType) ? artifactType : '';
}

function getCreatureArtifactExclusiveGroupKey(row = {}) {
  const artifactType = getCreatureArtifactType(row);
  return row.sourceType === 'creatureArtifact' && artifactType
    ? `creatureArtifact:${artifactType}`
    : '';
}

function getCreatureArtifactCandidateSignature(row = {}) {
  const groupKey = getCreatureArtifactExclusiveGroupKey(row);
  return groupKey && row.itemId ? `${groupKey}:${row.itemId}` : '';
}

function getTitleExclusiveGroupKey(row = {}) {
  return row.sourceType === 'title' ? 'title' : '';
}

function getTitleCandidateSignature(row = {}) {
  const groupKey = getTitleExclusiveGroupKey(row);
  if (!groupKey) return '';
  return [
    groupKey,
    row.itemId || '',
    row.tier || '',
    getEffectSignature(row.titlePackageEffects || row.effects || {}),
    row.titleEnchantElement || '',
    getEffectSignature(row.targetTitleEnchantEffects || row.enchantEffects || {}),
    row.titleBead?.itemId || '',
    row.purchaseRoute || '',
    row.priceItem?.itemId || '',
  ].join(':');
}

function getEquipmentTuneExclusiveGroupKey(row = {}) {
  return row.sourceType === 'equipmentTune' ? 'equipmentTune' : '';
}

function getEquipmentTuneCandidateSignature(row = {}) {
  const groupKey = getEquipmentTuneExclusiveGroupKey(row);
  if (!groupKey) return '';
  const steps = Array.isArray(row.tuneSteps) ? row.tuneSteps : [];
  return [
    groupKey,
    Number(row.currentSetPoint || steps[0]?.currentSetPoint || 0),
    steps.map((step) => `${Number(step.targetSetPoint || 0)}:${Number(step.tuneCount || 0)}`).join(','),
  ].join(':');
}


function getOathAcquisitionSelectionDescriptors(row = {}) {
  if (!OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)) return [];
  const acquisitionMethod = row.sourceType === 'oathCraft' ? 'craft' : 'transcend';
  return (row.decisionPlan || [])
    .filter((entry) => Number.isInteger(Number(entry?.slotIndex)) && entry?.targetItemId)
    .map((entry) => {
      const slotIndex = Number(entry.slotIndex);
      const exclusiveGroupKey = `oathAcquire:${slotIndex}`;
      return {
        exclusiveGroupKey,
        candidateSignature: [
          exclusiveGroupKey,
          acquisitionMethod,
          entry.targetItemId,
        ].join(':'),
        acquisitionMethod,
        entry,
      };
    });
}

function getOathAcquisitionExclusiveGroupKey(row = {}) {
  return getOathAcquisitionSelectionDescriptors(row)[0]?.exclusiveGroupKey || '';
}

function getOathAcquisitionCandidateSignature(row = {}) {
  const descriptors = getOathAcquisitionSelectionDescriptors(row);
  return descriptors.length
    ? descriptors.map((descriptor) => descriptor.candidateSignature).join('|')
    : '';
}

function getOathAcquisitionTargetGroupKey(row = {}) {
  const targetRarity = String(row.targetRarity || row.itemRarity || '').trim();
  return OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType) && targetRarity
    ? `oathAcquireTarget:${targetRarity}`
    : '';
}

function combineOathDecisionEffects(entries = [], effectKey = 'currentEffects') {
  const combined = {};
  let finalDamageMultiplier = 1;
  entries.forEach((entry) => {
    Object.entries(entry?.[effectKey] || {}).forEach(([key, value]) => {
      const amount = Number(value || 0);
      if (!Number.isFinite(amount) || amount === 0) return;
      if (key === 'finalDamage') {
        finalDamageMultiplier *= 1 + amount / 100;
      } else {
        combined[key] = Number(combined[key] || 0) + amount;
      }
    });
  });
  if (Math.abs(finalDamageMultiplier - 1) > 0.0000001) {
    combined.finalDamage = (finalDamageMultiplier - 1) * 100;
  }
  return combined;
}

function getOathDecisionEffectDelta(targetEffects = {}, currentEffects = {}) {
  const delta = {};
  const keys = new Set([...Object.keys(currentEffects || {}), ...Object.keys(targetEffects || {})]);
  keys.forEach((key) => {
    const currentValue = Number(currentEffects?.[key] || 0);
    const targetValue = Number(targetEffects?.[key] || 0);
    const value = key === 'finalDamage'
      ? (1 + targetValue / 100) / (1 + currentValue / 100) * 100 - 100
      : targetValue - currentValue;
    if (Number.isFinite(value) && value > 0) delta[key] = value;
  });
  return delta;
}

function mergeOathDecisionMaterials(entries = [], key = 'materials') {
  const merged = new Map();
  entries.forEach((entry) => {
    (entry?.[key] || []).forEach((material) => {
      const materialKey = material?.key || material?.priceKey || material?.label || material?.itemName;
      if (!materialKey) return;
      const previous = merged.get(materialKey) || { ...cloneSimulatorValue(material), amount: 0 };
      previous.amount = Number(previous.amount || 0) + Number(material.amount || 0);
      merged.set(materialKey, previous);
    });
  });
  return [...merged.values()];
}

function getOathAcquisitionReferenceState(simulator = {}, row = {}, requestedCount = 1) {
  const referenceOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
  const crystals = Array.isArray(referenceOath.crystals) ? referenceOath.crystals : [];
  const targetGroupKey = getOathAcquisitionTargetGroupKey(row);
  const ownVariantGroupKey = row.variantGroupKey || '';
  const targetRarity = String(row.targetRarity || row.itemRarity || '').trim();
  const targetLimit = targetRarity === '태초' ? 3 : 8;
  const targetSelections = Object.entries(simulator.activeSelectionByGroup || {})
    .filter(([, selection]) => (
      selection?.applyType === 'acquireOathDecision' &&
      selection?.acquisitionTargetGroupKey === targetGroupKey
    ));
  const explicitlyReplacedGroupKeys = new Set(row.replacedAcquisitionGroupKeys || []);
  const restoreSelection = ([groupKey, selection]) => {
    const slotIndex = getOathAcquisitionSlotIndex(selection, groupKey);
    const previousCrystal = (simulator.baseOathUpgrades?.crystals || [])
      .find((crystal) => Number(crystal?.index) === slotIndex);
    const currentIndex = crystals.findIndex((crystal) => Number(crystal?.index) === slotIndex);
    if (!previousCrystal || currentIndex < 0) return;
    referenceOath.setPoint = Number(referenceOath.setPoint || 0)
      - Number(crystals[currentIndex]?.setPoint || 0)
      + Number(previousCrystal.setPoint || 0);
    crystals.splice(currentIndex, 1, cloneSimulatorValue(previousCrystal));
  };
  targetSelections
    .filter(([groupKey, selection]) => (
      selection?.acquisitionVariantGroupKey === ownVariantGroupKey
      || explicitlyReplacedGroupKeys.has(groupKey)
    ))
    .forEach(restoreSelection);

  const uniqueKeyword = String(simulator.oathTuneDb?.uniqueCrystalNameKeyword || '안개 결정').trim();
  const getCurrentTargetCount = () => crystals.filter((crystal) => {
    const rarity = String(crystal?.itemRarity || '').trim();
    if (targetRarity === '태초') return rarity === '태초';
    return rarity === '에픽' && !(uniqueKeyword && String(crystal?.itemName || '').includes(uniqueKeyword));
  }).length;
  const replacementCount = Math.max(
    0,
    Number(requestedCount || 0) - Math.max(0, targetLimit - getCurrentTargetCount()),
  );
  const replacedAcquisitionGroupKeys = targetSelections
    .filter(([groupKey, selection]) => (
      selection?.acquisitionVariantGroupKey !== ownVariantGroupKey
      && !explicitlyReplacedGroupKeys.has(groupKey)
    ))
    .sort((a, b) => (
      getOathAcquisitionSlotIndex(b[1], b[0])
      - getOathAcquisitionSlotIndex(a[1], a[0])
    ))
    .slice(0, replacementCount)
    .map(([groupKey]) => groupKey);
  explicitlyReplacedGroupKeys.forEach((groupKey) => {
    if (!replacedAcquisitionGroupKeys.includes(groupKey)) {
      replacedAcquisitionGroupKeys.push(groupKey);
    }
  });
  replacedAcquisitionGroupKeys
    .map((groupKey) => [groupKey, simulator.activeSelectionByGroup?.[groupKey]])
    .filter(([, selection]) => selection)
    .forEach(restoreSelection);
  return { referenceOath, replacedAcquisitionGroupKeys };
}

function isOathAcquisitionCandidateForTarget(crystal = {}, targetRarity = '', db = {}) {
  const currentRarity = String(crystal.itemRarity || '').trim();
  const itemName = String(crystal.itemName || '').trim();
  const uniqueKeyword = String(db.uniqueCrystalNameKeyword || '안개 결정').trim();
  const isUniqueEpic = currentRarity === '에픽' && uniqueKeyword && itemName.includes(uniqueKeyword);
  if (targetRarity === '에픽') {
    return ['유니크', '레전더리'].includes(currentRarity) || isUniqueEpic;
  }
  if (targetRarity === '태초') {
    return ['유니크', '레전더리', '에픽'].includes(currentRarity);
  }
  return false;
}

function getOathAcquisitionCandidateScore(entry = {}, currentCrystal = {}, referenceOath = {}, db = {}) {
  const currentEffects = currentCrystal.effects || entry.currentEffects || {};
  const targetEffects = entry.targetEffects || {};
  const effectDelta = getOathDecisionEffectDelta(targetEffects, currentEffects);
  const currentSetPoint = Number(referenceOath.setPoint || 0);
  const currentSlotSetPoint = Number(currentCrystal.setPoint || entry.currentSlotSetPoint || 0);
  const targetSlotSetPoint = Number(entry.targetSlotSetPoint || 0);
  const targetSetPoint = currentSetPoint - currentSlotSetPoint + targetSlotSetPoint;
  const currentState = getOathTuneState(db, currentSetPoint);
  const targetState = getOathTuneState(db, targetSetPoint);
  const skillDamageMultiplier = currentState?.damageMultiplier > 0
    ? Number(targetState?.damageMultiplier || 0) / currentState.damageMultiplier
    : 1;
  const finalDamageMultiplier = 1 + Number(effectDelta.finalDamage || 0) / 100;
  return {
    score: (finalDamageMultiplier * skillDamageMultiplier - 1) * 100,
    setPointDelta: targetSlotSetPoint - currentSlotSetPoint,
  };
}

function adaptOathAcquisitionRecommendation(row = {}, simulator = {}) {
  if (!OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)) return row;
  const targetRarity = String(row.targetRarity || row.itemRarity || '').trim();
  const requestedCount = Math.max(1, Number(row.variantCount || row.decisionPlan?.length || 1));
  const { referenceOath, replacedAcquisitionGroupKeys } = getOathAcquisitionReferenceState(
    simulator,
    row,
    requestedCount,
  );
  const referenceBySlot = new Map(
    (referenceOath.crystals || []).map((crystal) => [Number(crystal?.index), crystal]),
  );
  const uniqueKeyword = String(simulator.oathTuneDb?.uniqueCrystalNameKeyword || '안개 결정').trim();
  const currentTargetCount = (referenceOath.crystals || []).filter((crystal) => {
    const rarity = String(crystal?.itemRarity || '').trim();
    if (targetRarity === '태초') return rarity === '태초';
    return rarity === '에픽' && !(uniqueKeyword && String(crystal?.itemName || '').includes(uniqueKeyword));
  }).length;
  const targetLimit = targetRarity === '태초' ? 3 : 8;
  if (requestedCount > Math.max(0, targetLimit - currentTargetCount)) return null;
  const pool = Array.isArray(row.decisionCandidatePool) && row.decisionCandidatePool.length
    ? row.decisionCandidatePool
    : row.decisionPlan || [];
  const selectedPoolEntries = pool
    .map((entry, poolIndex) => {
      const currentCrystal = referenceBySlot.get(Number(entry?.slotIndex)) || {};
      return {
        entry,
        poolIndex,
        currentCrystal,
        ...getOathAcquisitionCandidateScore(
          entry,
          currentCrystal,
          referenceOath,
          simulator.oathTuneDb,
        ),
      };
    })
    .filter(({ currentCrystal }) => (
      isOathAcquisitionCandidateForTarget(currentCrystal, targetRarity, simulator.oathTuneDb)
    ))
    .sort((a, b) => (
      b.score - a.score ||
      b.setPointDelta - a.setPointDelta ||
      a.poolIndex - b.poolIndex
    ))
    .slice(0, requestedCount);
  if (selectedPoolEntries.length !== requestedCount) return null;

  const decisionPlan = selectedPoolEntries.map(({ entry }) => {
    const currentCrystal = referenceBySlot.get(Number(entry.slotIndex)) || {};
    return {
      ...cloneSimulatorValue(entry),
      currentItemName: currentCrystal.itemName || entry.currentItemName || '',
      currentEffects: cloneSimulatorValue(currentCrystal.effects || entry.currentEffects || {}),
      currentSlotSetPoint: Number(currentCrystal.setPoint || entry.currentSlotSetPoint || 0),
    };
  });
  const currentEffects = combineOathDecisionEffects(decisionPlan, 'currentEffects');
  const targetEffects = combineOathDecisionEffects(decisionPlan, 'targetEffects');
  const currentSlotSetPoint = decisionPlan.reduce(
    (sum, entry) => sum + Number(entry.currentSlotSetPoint || 0),
    0,
  );
  const targetSlotSetPoint = decisionPlan.reduce(
    (sum, entry) => sum + Number(entry.targetSlotSetPoint || 0),
    0,
  );
  const currentSetPoint = Number(referenceOath.setPoint || 0);
  const targetSetPoint = currentSetPoint - currentSlotSetPoint + targetSlotSetPoint;
  const currentState = getOathTuneState(simulator.oathTuneDb, currentSetPoint);
  const targetState = getOathTuneState(simulator.oathTuneDb, targetSetPoint);
  if (!currentState || !targetState) return null;
  const expectedGold = decisionPlan.reduce((sum, entry) => sum + Number(entry.expectedGold || 0), 0);
  const materials = mergeOathDecisionMaterials(decisionPlan, 'materials');
  const expectedMaterials = mergeOathDecisionMaterials(decisionPlan, 'expectedMaterials');
  return {
    ...row,
    itemId: decisionPlan[0]?.targetItemId || row.itemId,
    itemName: requestedCount > 1
      ? `${row.targetRarity || row.itemRarity} 서약 결정 ${requestedCount}개`
      : decisionPlan[0]?.targetItemName || row.itemName,
    iconUrl: decisionPlan[0]?.targetIconUrl || row.iconUrl,
    currentEffects,
    targetEffects,
    effects: getOathDecisionEffectDelta(targetEffects, currentEffects),
    currentSetPoint,
    targetSetPoint,
    currentSlotSetPoint,
    targetSlotSetPoint,
    currentTuneFinalDamage: currentState.blessingFinalDamage,
    targetTuneFinalDamage: targetState.blessingFinalDamage,
    currentTuneBuffPower: currentState.blessingBuffPower,
    targetTuneBuffPower: targetState.blessingBuffPower,
    currentOathSetFinalDamage: currentState.setFinalDamage,
    targetOathSetFinalDamage: targetState.setFinalDamage,
    currentOathStageName: currentState.stageName,
    targetOathStageName: targetState.stageName,
    skillDamageMultiplier: currentState.damageMultiplier > 0
      ? targetState.damageMultiplier / currentState.damageMultiplier
      : 1,
    expectedGold,
    auction: { ...(row.auction || {}), minUnitPrice: expectedGold },
    materials,
    expectedMaterials,
    decisionPlan,
    replacedAcquisitionGroupKeys,
  };
}

function isAppliedOathAcquisitionRecommendation(row = {}, simulator = {}) {
  const descriptors = getOathAcquisitionSelectionDescriptors(row);
  if (!descriptors.length) return false;
  const activeSelections = getActiveOathAcquisitionSelections(simulator);
  return descriptors.every((descriptor) => (
    activeSelections.some((selection) => (
      selection?.candidateSignature === descriptor.candidateSignature
    ))
  )) && activeSelections.filter((selection) => (
    selection?.acquisitionVariantGroupKey === row.variantGroupKey
  )).length === descriptors.length;
}

function getActiveOathAcquisitionCountByVariantGroup(simulator = {}) {
  return getActiveOathAcquisitionSelections(simulator).reduce((counts, selection) => {
    if (selection?.applyType !== 'acquireOathDecision' || !selection.acquisitionVariantGroupKey) {
      return counts;
    }
    counts.set(
      selection.acquisitionVariantGroupKey,
      Number(counts.get(selection.acquisitionVariantGroupKey) || 0) + 1,
    );
    return counts;
  }, new Map());
}

function mergeAppliedOathAcquisitionSnapshots(rows = [], simulator = {}) {
  const mergedRows = rows.slice();
  const snapshotByVariantGroup = new Map();
  getActiveOathAcquisitionSelections(simulator).forEach((selection) => {
    if (
      selection?.applyType !== 'acquireOathDecision' ||
      !selection?.acquisitionVariantGroupKey ||
      !selection?.appliedRecommendationSnapshot
    ) return;
    if (!snapshotByVariantGroup.has(selection.acquisitionVariantGroupKey)) {
      snapshotByVariantGroup.set(
        selection.acquisitionVariantGroupKey,
        selection.appliedRecommendationSnapshot,
      );
    }
  });
  const activeCounts = getActiveOathAcquisitionCountByVariantGroup(simulator);
  snapshotByVariantGroup.forEach((snapshot, variantGroupKey) => {
    const activeCount = Number(activeCounts.get(variantGroupKey) || 0);
    const variants = Array.isArray(snapshot.oathDecisionVariants)
      ? snapshot.oathDecisionVariants
      : [snapshot];
    const countSnapshot = variants.find(
      (variant) => Number(variant?.variantCount || 1) === activeCount,
    ) || snapshot;
    const adaptedSnapshot = adaptOathAcquisitionRecommendation(countSnapshot, simulator) || countSnapshot;
    if (!isAppliedOathAcquisitionRecommendation(adaptedSnapshot, simulator)) return;
    const snapshotGroupKey = getSimulatorExclusiveGroupKey(adaptedSnapshot);
    const snapshotSignature = getSimulatorCandidateSignature(adaptedSnapshot);
    const alreadyRendered = mergedRows.some((row) => (
      getSimulatorExclusiveGroupKey(row) === snapshotGroupKey
      && getSimulatorCandidateSignature(row) === snapshotSignature
    ));
    if (!alreadyRendered) mergedRows.push(adaptedSnapshot);
  });
  return mergedRows;
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

function getBlackFangExclusiveGroupKey(row = {}) {
  const slot = String(row.slot || '').trim();
  return row.sourceType === 'blackFang' && BLACK_FANG_SIMULATOR_SLOTS.has(slot)
    ? `blackFang:${slot}`
    : '';
}

function getBlackFangCandidateSignature(row = {}) {
  const groupKey = getBlackFangExclusiveGroupKey(row);
  if (!groupKey || !row.targetItemId) return '';
  return [
    groupKey,
    row.targetItemId,
    getEffectSignature(row.targetEffects || {}),
  ].join(':');
}

function getAvatarEmblemExclusiveGroupKey(row = {}) {
  const targetSlotId = String(row.targetSlotId || '').trim();
  return row.sourceType === 'avatar' && row.kind === 'brilliantEmblem' && targetSlotId
    ? row.bufferStatScope === 'switching'
      ? `buffAvatarEmblem:${targetSlotId}`
      : `avatarEmblem:${targetSlotId}`
    : '';
}

function getAvatarEmblemCandidateSignature(row = {}) {
  const groupKey = getAvatarEmblemExclusiveGroupKey(row);
  if (!groupKey || !Array.isArray(row.socketChanges) || !row.socketChanges.length) return '';
  return [
    groupKey,
    row.itemId || '',
    row.socketChanges.map((change) => [
      change?.socketKey || `regular:${Number(change?.socketIndex)}`,
      change?.targetEmblem?.itemId || row.itemId || '',
      getEffectSignature(change?.targetEmblem?.effects || {}),
    ].join(':')).join(','),
  ].join(':');
}

function getAvatarPlatinumExclusiveGroupKey(row = {}) {
  const targetSlotId = String(row.targetSlotId || '').trim();
  return row.sourceType === 'avatar' && row.kind === 'platinumEmblem' && targetSlotId
    ? `avatarPlatinum:${targetSlotId}`
    : '';
}

function getAvatarPlatinumCandidateSignature(row = {}) {
  const groupKey = getAvatarPlatinumExclusiveGroupKey(row);
  if (!groupKey || !row.targetPlatinumEmblem?.itemId) return '';
  return [
    groupKey,
    row.targetPlatinumEmblem.itemId,
    row.targetPlatinumEmblem.targetSkill || row.targetSkill || '',
  ].join(':');
}

function getBuffSimulatorTargetSlotId(row = {}) {
  if (row.sourceType === 'switchingTitle') return 'TITLE';
  if (row.sourceType === 'switchingCreature') return 'CREATURE';
  if (row.sourceType === 'switchingFragment') {
    return String(row.targetBuffSlot || row.switchingSlot || '').trim();
  }
  if (row.sourceType === 'avatar' && ['switchingAvatar', 'switchingPlatinumEmblem'].includes(row.kind)) {
    if (row.targetSlotId) return String(row.targetSlotId).trim();
    return String(row.slot || '').includes('상의') ? 'JACKET' : 'PANTS';
  }
  return '';
}

function getBuffSimulatorExclusiveGroupKey(row = {}) {
  const targetSlotId = getBuffSimulatorTargetSlotId(row);
  if (!targetSlotId) return '';
  if (row.sourceType === 'switchingTitle') return 'buffTitle';
  if (row.sourceType === 'switchingCreature') return 'buffCreature';
  if (row.sourceType === 'switchingFragment') return `buffEquipment:${targetSlotId}`;
  if (row.kind === 'switchingAvatar') return `buffAvatarPackage:${targetSlotId}`;
  if (row.kind === 'switchingPlatinumEmblem') return `buffAvatarPlatinum:${targetSlotId}`;
  return '';
}

function getBuffSimulatorCandidateSignature(row = {}) {
  const groupKey = getBuffSimulatorExclusiveGroupKey(row);
  if (!groupKey) return '';
  return [
    groupKey,
    row.itemId || '',
    row.targetSkill || '',
    row.candidateTitleContribution || row.candidateCreatureContribution || '',
    getStableObjectSignature(row.targetBuffChanges || {}),
    row.priceMode || '',
  ].join(':');
}

function getSimulatorExclusiveGroupKey(row = {}) {
  return getBufferEnchantExclusiveGroupKey(row)
    || getBufferCreatureArtifactExclusiveGroupKey(row)
    || getBufferUpgradeExclusiveGroupKey(row)
    || getBufferBlackFangExclusiveGroupKey(row)
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
    || getEquipmentProgressionCandidateSignature(row)
    || getAvatarEmblemCandidateSignature(row)
    || getAvatarPlatinumCandidateSignature(row)
    || getBuffSimulatorCandidateSignature(row);
}

function getStableObjectSignature(value = {}) {
  if (!value || typeof value !== 'object') return String(value ?? '');
  return Object.keys(value)
    .sort()
    .map((key) => `${key}:${typeof value[key] === 'object' ? getStableObjectSignature(value[key]) : String(value[key] ?? '')}`)
    .join('|');
}

function getRoundedMetricKey(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toFixed(6) : '0.000000';
}

function getComparableRecommendationGold(row, includeMaterialCosts = false) {
  if (isFreeActionRecommendation(row)) return 0;
  const gold = getRecommendationGold(row, includeMaterialCosts);
  return Number.isFinite(gold) && gold > 0 ? gold : Number.POSITIVE_INFINITY;
}

function isPreferredDuplicateRecommendation(row, previous, includeMaterialCosts = false) {
  if (!previous) return true;
  const isMaterial = isMaterialAcquisition(row);
  const previousIsMaterial = isMaterialAcquisition(previous);
  if (isMaterial !== previousIsMaterial) return isMaterial;
  if (isMaterial && previousIsMaterial) return false;
  const price = getComparableRecommendationGold(row, includeMaterialCosts);
  const previousPrice = getComparableRecommendationGold(previous, includeMaterialCosts);
  if (Math.abs(price - previousPrice) > 1) return price < previousPrice;
  return false;
}

function getEnchantTierRank(row = {}) {
  if (isMaterialEnchantAcquisition(row)) return 0;
  const tier = String(row.tier || '').trim();
  if (tier === '가성비') return 0;
  if (tier === '준종결') return 1;
  if (tier === '종결') return 2;
  return null;
}

function getEnchantEfficiencyValue(row = {}, isBuffer = false) {
  const value = isBuffer ? Number(row.buffCostPerHundredPoints || 0) : Number(row.costPerPointOnePercent || 0);
  return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
}

function removeInefficientLowerTierEnchants(rows = [], isBuffer = false) {
  const enchantRows = rows.filter((row) => row.sourceType === 'enchant');
  if (enchantRows.length <= 1) return rows;
  const groups = new Map();
  enchantRows.forEach((row) => {
    const tierRank = getEnchantTierRank(row);
    if (tierRank === null) return;
    const key = row.slot || '';
    const list = groups.get(key) || [];
    list.push({ row, tierRank, efficiency: getEnchantEfficiencyValue(row, isBuffer) });
    groups.set(key, list);
  });
  const excluded = new Set();
  groups.forEach((items) => {
    items.forEach((item) => {
      if (item.tierRank >= 2 || !Number.isFinite(item.efficiency)) return;
      const hasMoreEfficientHigherTier = items.some((candidate) => (
        candidate.tierRank > item.tierRank &&
        Number.isFinite(candidate.efficiency) &&
        candidate.efficiency + 0.000001 < item.efficiency
      ));
      if (hasMoreEfficientHigherTier) excluded.add(item.row);
    });
  });
  if (!excluded.size) return rows;
  return rows.filter((row) => !excluded.has(row));
}

function getRecommendationDamageEffects(row, current) {
  if (['upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft'].includes(row.sourceType)) return row.effects || {};
  if (row.sourceType === 'blackFang') {
    return subtractEffects(
      row.targetEffects || addEffects(row.currentEffects, row.effects),
      row.currentEffects || {},
    );
  }
  if (['avatar', 'switchingTitle', 'switchingCreature', 'switchingFragment'].includes(row.sourceType)) return row.effects || {};
  return subtractEffects(row.effects || {}, current?.effects || {});
}

function getElementDeltaEffects(targetEffects = {}, currentEffects = {}) {
  const elementDelta = Number(targetEffects.elementAll || 0) - Number(currentEffects.elementAll || 0);
  return elementDelta ? { elementAll: elementDelta } : {};
}

function getSkillDamageMultiplier(row = {}) {
  const explicitMultiplier = Number(row?.skillDamageMultiplier || 0);
  if (Number.isFinite(explicitMultiplier) && explicitMultiplier > 0) return explicitMultiplier;
  return 1;
}

function getReplacementIncrementalDamagePercent(row, current, baseline) {
  const currentEffects = current?.effects || {};
  const targetEffects = row.effects || {};
  const base = getDamageBaseline(baseline);
  const finalDamageMultiplier = getFinalDamageReplacementMultiplier(currentEffects, targetEffects);
  const baseAttackIncrease = Math.max(0, base.attackIncrease - Number(currentEffects.attackIncrease || 0));
  const currentAttackIncreaseMultiplier = 1 + (baseAttackIncrease + Number(currentEffects.attackIncrease || 0)) / 100;
  const targetAttackIncreaseMultiplier = 1 + (baseAttackIncrease + Number(targetEffects.attackIncrease || 0)) / 100;
  const attackIncreaseMultiplier = targetAttackIncreaseMultiplier / currentAttackIncreaseMultiplier;
  const baseAttackAmplification = Math.max(0, base.attackAmplification - Number(currentEffects.attackAmplification || 0));
  const currentAttackAmplificationMultiplier = 1 + (baseAttackAmplification + Number(currentEffects.attackAmplification || 0)) / 100;
  const targetAttackAmplificationMultiplier = 1 + (baseAttackAmplification + Number(targetEffects.attackAmplification || 0)) / 100;
  const attackAmplificationMultiplier = targetAttackAmplificationMultiplier / currentAttackAmplificationMultiplier;
  const elementMultiplier = estimateDamageMultiplier(getElementDeltaEffects(targetEffects, currentEffects), baseline);
  const baseAttack = base.attack - Number(currentEffects.attack || 0);
  const currentAttack = baseAttack + REGION_ATTACK_FLAT + Number(currentEffects.attack || 0);
  const targetAttack = baseAttack + REGION_ATTACK_FLAT + Number(targetEffects.attack || 0);
  const attackMultiplier = targetAttack / currentAttack;
  const currentStatValue = getSelectedStatEffect(currentEffects, base);
  const targetStatValue = getSelectedStatEffect(targetEffects, base);
  const baseStat = base.stat - currentStatValue;
  const currentEffectiveStat = getEquipmentScoreEffectiveStat(baseStat + currentStatValue, base.baseStat);
  const targetEffectiveStat = getEquipmentScoreEffectiveStat(baseStat + targetStatValue, base.baseStat);
  const statMultiplier = (1 + targetEffectiveStat / 250) / (1 + currentEffectiveStat / 250);
  const currentSkillDamageMultiplier = getSkillDamageMultiplier(current);
  const targetSkillDamageMultiplier = getSkillDamageMultiplier(row);
  const skillDamageMultiplier = targetSkillDamageMultiplier / currentSkillDamageMultiplier;
  return (finalDamageMultiplier * attackIncreaseMultiplier * attackAmplificationMultiplier * elementMultiplier * attackMultiplier * statMultiplier * skillDamageMultiplier - 1) * 100;
}

function getCurrentCreatureArtifactBySlot(currentCreature) {
  return new Map((currentCreature?.artifacts || [])
    .map((artifact) => [getCreatureArtifactType(artifact), artifact])
    .filter(([artifactType]) => artifactType));
}

function getCurrentElementPreferenceOrder(currentCreature, currentTitle, topElements = []) {
  const counts = new Map(topElements.map((element) => [element, 0]));
  const currentTitleElement = currentTitle?.titleEnchantElement;
  if (currentTitleElement && currentTitleElement !== 'all' && counts.has(currentTitleElement)) {
    counts.set(currentTitleElement, counts.get(currentTitleElement) + 1);
  }
  (currentCreature?.artifacts || []).forEach((artifact) => {
    if (!['RED', 'BLUE'].includes(artifact?.slotColor)) return;
    if (!counts.has(artifact?.element)) return;
    counts.set(artifact.element, counts.get(artifact.element) + 1);
  });
  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([element]) => element);
}

function getPreferredElementForElementalUpgrades(rows, baseline, currentCreature, currentTitle) {
  const base = getDamageBaseline(baseline);
  const topElements = base.elementNames || [];
  if (topElements.length <= 1) return topElements[0] || '';
  const currentPreferenceOrder = getCurrentElementPreferenceOrder(currentCreature, currentTitle, topElements);
  if (currentPreferenceOrder.length === 1) return currentPreferenceOrder[0];
  const artifactCandidates = (rows || []).filter((row) => (
    row?.sourceType === 'creatureArtifact' &&
    ['RED', 'BLUE'].includes(row.slotColor) &&
    topElements.includes(row.element) &&
    Number.isFinite(row?.auction?.minUnitPrice) &&
    row.auction.minUnitPrice > 0
  ));
  const titleCandidates = (rows || []).filter((row) => (
    row?.sourceType === 'title' &&
    topElements.includes(row.titleEnchantElement) &&
    Number.isFinite(row?.auction?.minUnitPrice) &&
    row.auction.minUnitPrice > 0
  ));
  const ranked = topElements.map((element) => {
    const artifactPrice = ['RED', 'BLUE'].reduce((sum, slotColor) => {
      const slotPrices = artifactCandidates
        .filter((row) => row.element === element && row.slotColor === slotColor)
        .map((row) => row.auction.minUnitPrice);
      return sum + Math.min(...slotPrices, Number.POSITIVE_INFINITY);
    }, 0);
    const titlePrice = Math.min(
      ...titleCandidates
        .filter((row) => row.titleEnchantElement === element)
        .map((row) => row.auction.minUnitPrice),
      Number.POSITIVE_INFINITY,
    );
    const prices = [artifactPrice, titlePrice].filter(Number.isFinite);
    return {
      element,
      totalPrice: prices.length ? prices.reduce((sum, price) => sum + price, 0) : Number.POSITIVE_INFINITY,
    };
  }).filter((row) => Number.isFinite(row.totalPrice));
  ranked.sort((a, b) => a.totalPrice - b.totalPrice);
  if (currentPreferenceOrder.length > 1) {
    const currentPreferenceRank = new Map(currentPreferenceOrder.map((element, index) => [element, index]));
    ranked.sort((a, b) => {
      const rankA = currentPreferenceRank.has(a.element) ? currentPreferenceRank.get(a.element) : Number.POSITIVE_INFINITY;
      const rankB = currentPreferenceRank.has(b.element) ? currentPreferenceRank.get(b.element) : Number.POSITIVE_INFINITY;
      return (rankA - rankB) || a.totalPrice - b.totalPrice;
    });
  }
  return ranked[0]?.element || currentPreferenceOrder[0] || topElements[0] || '';
}

function isTitleBeadReplacementCandidate(row, currentTitle) {
  if (row?.sourceType !== 'title' || !currentTitle?.itemId) return false;
  if (row.purchaseRoute === 'titleBeadOnly') return true;
  return Boolean(row.titleBead) && isSameTitleBase(row, currentTitle);
}

function getTitleEffectiveEffects(row = {}, preferredElement = '') {
  const effects = { ...(row?.effects || {}) };
  if (!preferredElement) return effects;
  const element = row?.titleEnchantElement || row?.currentTitleEnchantElement || '';
  if (!element || element === 'all' || element === preferredElement) return effects;
  const enchantEffects = row?.enchantEffects || row?.currentTitleEnchantEffects || {};
  if (!Number(enchantEffects.elementAll || 0)) return effects;
  const adjusted = { ...effects };
  adjusted.elementAll = Number(adjusted.elementAll || 0) - Number(enchantEffects.elementAll || 0);
  if (Math.abs(adjusted.elementAll) <= 0.000001) {
    delete adjusted.elementAll;
  }
  return adjusted;
}

function isPreferredCreatureArtifactElement(row, baseline, preferredElement = '') {
  if (row?.sourceType !== 'creatureArtifact') return true;
  if (!['RED', 'BLUE'].includes(row.slotColor)) return true;
  const base = getDamageBaseline(baseline);
  const element = preferredElement || base.elementName;
  if (!element) return true;
  return row.element === element;
}

function getCurrentElementAlignment(currentCreature, currentTitle) {
  const artifacts = currentCreature?.artifacts || [];
  const findArtifactElement = (slotColor) => (
    artifacts.find((artifact) => artifact?.slotColor === slotColor)?.element || ''
  );
  return {
    titleElement: currentTitle?.titleEnchantElement || '',
    redElement: findArtifactElement('RED'),
    blueElement: findArtifactElement('BLUE'),
  };
}

function addElementValueDelta(deltas, element, value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || Math.abs(amount) <= 0.000001) return;
  if (element === 'all') {
    Object.keys(ELEMENT_EFFECT_KEY_BY_NAME).forEach((key) => {
      deltas[key] = Number(deltas[key] || 0) + amount;
    });
    return;
  }
  if (!ELEMENT_EFFECT_KEY_BY_NAME[element]) return;
  deltas[element] = Number(deltas[element] || 0) + amount;
}

function getTitleElementValueDeltas(row = {}, current = {}) {
  if (row?.sourceType !== 'title') return {};
  const deltas = {};
  const currentElement = current?.titleEnchantElement || row.currentTitleEnchantElement || '';
  const currentEffects = current?.enchantEffects || row.currentTitleEnchantEffects || {};
  const targetElement = row.titleEnchantElement || '';
  const targetEffects = row.targetTitleEnchantEffects || row.enchantEffects || {};
  addElementValueDelta(deltas, currentElement, -Number(currentEffects.elementAll || 0));
  addElementValueDelta(deltas, targetElement, Number(targetEffects.elementAll || 0));
  return deltas;
}

function getCreatureArtifactElementValueDeltas(row = {}, current = {}) {
  if (row?.sourceType !== 'creatureArtifact') return {};
  const deltas = {};
  addElementValueDelta(deltas, 'all', -Number(current?.artifactAllElement || 0));
  addElementValueDelta(deltas, current?.element || '', -Number(current?.artifactSingleElement || 0));
  addElementValueDelta(deltas, 'all', Number(row.artifactAllElement || 0));
  addElementValueDelta(deltas, row.element || '', Number(row.artifactSingleElement || 0));
  return deltas;
}

function getElementValueDeltasForRecommendation(row = {}, current = {}) {
  if (row?.sourceType === 'title') return getTitleElementValueDeltas(row, current);
  if (row?.sourceType === 'creatureArtifact') return getCreatureArtifactElementValueDeltas(row, current);
  return {};
}

function getAdjustedElementBaselineForRecommendation(row = {}, current = {}, baseline = {}) {
  const base = getDamageBaseline(baseline);
  const currentValues = base.elementValues || {};
  if (!Object.keys(ELEMENT_EFFECT_KEY_BY_NAME).some((element) => Number(currentValues[element] || 0) > 0)) {
    return null;
  }
  const deltas = getElementValueDeltasForRecommendation(row, current);
  if (!Object.values(deltas).some((value) => Math.abs(Number(value || 0)) > 0.000001)) {
    return null;
  }
  const nextValues = Object.fromEntries(Object.keys(ELEMENT_EFFECT_KEY_BY_NAME).map((element) => [
    element,
    Number(currentValues[element] || 0) + Number(deltas[element] || 0),
  ]));
  const currentMax = Math.max(...Object.values(currentValues).map((value) => Number(value || 0)));
  const nextMax = Math.max(...Object.values(nextValues).map((value) => Number(value || 0)));
  if (!Number.isFinite(currentMax) || !Number.isFinite(nextMax) || nextMax <= 0) return null;
  const nextElements = Object.entries(nextValues)
    .filter(([, value]) => Number(value || 0) === nextMax)
    .map(([element]) => element);
  return {
    ...baseline,
    element: nextMax,
    elementName: nextElements[0] || base.elementName,
    elementNames: nextElements,
    elementValues: nextValues,
    elementDamage: base.elementDamage + (nextMax - currentMax) * ELEMENT_DAMAGE_PER_ELEMENT,
  };
}

function getElementAdjustedReplacementIncrementalDamagePercent(row, current, baseline, adjustedBaseline) {
  const currentEffects = current?.effects || {};
  const targetEffects = row.effects || {};
  const base = getDamageBaseline(baseline);
  const adjustedBase = getDamageBaseline(adjustedBaseline);
  const finalDamageMultiplier = getFinalDamageReplacementMultiplier(currentEffects, targetEffects);
  const baseAttackIncrease = Math.max(0, base.attackIncrease - Number(currentEffects.attackIncrease || 0));
  const currentAttackIncreaseMultiplier = 1 + (baseAttackIncrease + Number(currentEffects.attackIncrease || 0)) / 100;
  const targetAttackIncreaseMultiplier = 1 + (baseAttackIncrease + Number(targetEffects.attackIncrease || 0)) / 100;
  const attackIncreaseMultiplier = targetAttackIncreaseMultiplier / currentAttackIncreaseMultiplier;
  const baseAttackAmplification = Math.max(0, base.attackAmplification - Number(currentEffects.attackAmplification || 0));
  const currentAttackAmplificationMultiplier = 1 + (baseAttackAmplification + Number(currentEffects.attackAmplification || 0)) / 100;
  const targetAttackAmplificationMultiplier = 1 + (baseAttackAmplification + Number(targetEffects.attackAmplification || 0)) / 100;
  const attackAmplificationMultiplier = targetAttackAmplificationMultiplier / currentAttackAmplificationMultiplier;
  const elementMultiplier = (1 + adjustedBase.elementDamage / 100) / (1 + base.elementDamage / 100);
  const baseAttack = base.attack - Number(currentEffects.attack || 0);
  const currentAttack = baseAttack + REGION_ATTACK_FLAT + Number(currentEffects.attack || 0);
  const targetAttack = baseAttack + REGION_ATTACK_FLAT + Number(targetEffects.attack || 0);
  const attackMultiplier = targetAttack / currentAttack;
  const currentStatValue = getSelectedStatEffect(currentEffects, base);
  const targetStatValue = getSelectedStatEffect(targetEffects, base);
  const baseStat = base.stat - currentStatValue;
  const currentEffectiveStat = getEquipmentScoreEffectiveStat(baseStat + currentStatValue, base.baseStat);
  const targetEffectiveStat = getEquipmentScoreEffectiveStat(baseStat + targetStatValue, base.baseStat);
  const statMultiplier = (1 + targetEffectiveStat / 250) / (1 + currentEffectiveStat / 250);
  const currentSkillDamageMultiplier = getSkillDamageMultiplier(current);
  const targetSkillDamageMultiplier = getSkillDamageMultiplier(row);
  const skillDamageMultiplier = targetSkillDamageMultiplier / currentSkillDamageMultiplier;
  return (finalDamageMultiplier * attackIncreaseMultiplier * attackAmplificationMultiplier * elementMultiplier * attackMultiplier * statMultiplier * skillDamageMultiplier - 1) * 100;
}

function isFinitePositivePrice(row) {
  return Number.isFinite(row?.auction?.minUnitPrice) && row.auction.minUnitPrice > 0;
}

function getElementAlignmentCandidateScore(row, current, baseline, includeMaterialCosts = false, adjustedBaseline = null) {
  if (!row || !current || !isFinitePositivePrice(row)) return null;
  if (row.sourceType === 'creatureArtifact' && current?.itemId && current.itemId === row.itemId) return null;
  if (
    row.sourceType === 'title' &&
    current?.itemId &&
    current.itemId === row.itemId &&
    getEffectSignature(current.effects || {}) === getEffectSignature(row.effects || {})
  ) return null;
  const incrementalDamagePercent = adjustedBaseline
    ? getElementAdjustedReplacementIncrementalDamagePercent(row, current, baseline, adjustedBaseline)
    : getReplacementIncrementalDamagePercent(row, current, baseline);
  if (!Number.isFinite(incrementalDamagePercent) || incrementalDamagePercent <= 0.0001) return null;
  const costPerPointOnePercent = getCostPerPointOnePercent(
    { ...row, incrementalDamagePercent },
    includeMaterialCosts,
  );
  if (!Number.isFinite(costPerPointOnePercent) || costPerPointOnePercent <= 0) return null;
  return {
    row,
    incrementalDamagePercent,
    costPerPointOnePercent,
  };
}

function getBestElementAlignmentCandidate(candidates = []) {
  return candidates
    .filter(Boolean)
    .sort((a, b) => (
      a.costPerPointOnePercent - b.costPerPointOnePercent ||
      b.incrementalDamagePercent - a.incrementalDamagePercent
    ))[0] || null;
}

function getBestRedArtifactAlignmentCandidate(rows, baseline, currentArtifactBySlot, targetElement, includeMaterialCosts = false) {
  if (!targetElement) return null;
  const currentArtifact = currentArtifactBySlot.get('RED') || {};
  const current = {
    ...currentArtifact,
    effects: getCreatureArtifactEffectiveEffects({ sourceType: 'creatureArtifact', ...currentArtifact }, baseline, targetElement),
  };
  return getBestElementAlignmentCandidate(
    (rows || [])
      .filter((row) => (
        row?.sourceType === 'creatureArtifact' &&
        row.slotColor === 'RED' &&
        row.element === targetElement
      ))
      .map((row) => {
        const candidate = {
          ...row,
          effects: getCreatureArtifactEffectiveEffects(row, baseline, targetElement),
          displayEffects: getCreatureArtifactDisplayEffects(row, baseline, targetElement),
        };
        return getElementAlignmentCandidateScore(
          candidate,
          current,
          baseline,
          includeMaterialCosts,
          getAdjustedElementBaselineForRecommendation(candidate, current, baseline),
        );
      }),
  );
}

function getBestTitleBeadAlignmentCandidate(rows, baseline, currentTitle, targetElement, includeMaterialCosts = false) {
  if (!targetElement || !currentTitle?.itemId) return null;
  const current = {
    ...currentTitle,
    effects: getTitleEffectiveEffects(currentTitle, targetElement),
  };
  return getBestElementAlignmentCandidate(
    (rows || [])
      .filter((row) => (
        row?.sourceType === 'title' &&
        row.titleEnchantElement === targetElement &&
        isTitleBeadReplacementCandidate(row, currentTitle)
      ))
      .map((row) => {
        const titleRow = getTitleBeadOnlyRow(row, currentTitle);
        const candidate = {
          ...titleRow,
          effects: getTitleEffectiveEffects(titleRow, targetElement),
        };
        return getElementAlignmentCandidateScore(
          candidate,
          current,
          baseline,
          includeMaterialCosts,
          getAdjustedElementBaselineForRecommendation(candidate, current, baseline),
        );
      }),
  );
}

function getElementAlignmentOverride(rows, baseline, currentCreature, currentTitle, currentArtifactBySlot, includeMaterialCosts = false) {
  const {
    titleElement,
    redElement,
    blueElement,
  } = getCurrentElementAlignment(currentCreature, currentTitle);
  if (!titleElement || titleElement === 'all' || !redElement || redElement === 'all' || titleElement === redElement) {
    return null;
  }

  const titleCandidate = getBestTitleBeadAlignmentCandidate(
    rows,
    baseline,
    currentTitle,
    redElement,
    includeMaterialCosts,
  );
  const redCandidate = getBestRedArtifactAlignmentCandidate(
    rows,
    baseline,
    currentArtifactBySlot,
    titleElement,
    includeMaterialCosts,
  );

  if (blueElement && blueElement === redElement && titleCandidate) {
    return { type: 'title', titleElement: redElement };
  }
  if (blueElement && blueElement === titleElement && redCandidate) {
    return { type: 'redArtifact', redElement: titleElement };
  }
  if (!blueElement || (blueElement !== titleElement && blueElement !== redElement)) {
    const selected = getBestElementAlignmentCandidate([titleCandidate, redCandidate]);
    if (selected?.row?.sourceType === 'title') {
      return { type: 'title', titleElement: redElement };
    }
    if (selected?.row?.sourceType === 'creatureArtifact') {
      return { type: 'redArtifact', redElement: titleElement };
    }
  }
  return null;
}

function getPreferredElementForRecommendationRow(row, baseline, preferredElement = '', alignmentOverride = null, currentTitle = null) {
  if (
    alignmentOverride?.type === 'title' &&
    row?.sourceType === 'title' &&
    isTitleBeadReplacementCandidate(row, currentTitle)
  ) {
    return alignmentOverride.titleElement || preferredElement;
  }
  if (
    alignmentOverride?.type === 'redArtifact' &&
    row?.sourceType === 'creatureArtifact' &&
    row.slotColor === 'RED'
  ) {
    return alignmentOverride.redElement || preferredElement;
  }
  return preferredElement || getDamageBaseline(baseline).elementName;
}

function shouldSkipByElementAlignmentOverride(row, alignmentOverride = null, currentTitle = null) {
  if (!alignmentOverride) return false;
  if (
    alignmentOverride.type === 'title' &&
    row?.sourceType === 'creatureArtifact' &&
    row.slotColor === 'RED'
  ) {
    return true;
  }
  if (
    alignmentOverride.type === 'redArtifact' &&
    row?.sourceType === 'title' &&
    isTitleBeadReplacementCandidate(row, currentTitle)
  ) {
    return true;
  }
  return false;
}

function isPreferredTitleEnchantElement(row, baseline, preferredElement = '') {
  if (row?.sourceType !== 'title') return true;
  if (!row.titleEnchantElement) return true;
  if (row.titleEnchantElement === 'all') return false;
  const base = getDamageBaseline(baseline);
  const element = preferredElement || base.elementName;
  if (!element) return true;
  return row.titleEnchantElement === element;
}

function getTitleBaseEffectSignature(title) {
  return getEffectSignature(subtractEffects(title?.effects || {}, title?.enchantEffects || {}));
}

function getCurrentTitleBeadRows(titleRows = [], currentTitle = null) {
  if (!currentTitle?.itemId) return [];
  const beadByElement = new Map();
  titleRows.forEach((row) => {
    const bead = row?.titleBead;
    const element = bead?.element || row?.titleEnchantElement || '';
    const auction = bead?.auction || {};
    if (!element || !bead?.itemId || !Number.isFinite(auction.minUnitPrice) || auction.minUnitPrice <= 0) return;
    const previous = beadByElement.get(element);
    if (!previous || auction.minUnitPrice < ((previous.auction || {}).minUnitPrice || Number.POSITIVE_INFINITY)) {
      beadByElement.set(element, bead);
    }
  });
  const currentBaseEffects = subtractEffects(currentTitle.effects || {}, currentTitle.enchantEffects || {});
  return [...beadByElement.values()].map((bead) => ({
    sourceType: 'title',
    slot: '칭호',
    tier: currentTitle.variant || currentTitle.tier || '일반',
    itemId: currentTitle.itemId,
    itemName: bead.itemName,
    titleItemName: currentTitle.itemName,
    itemRarity: currentTitle.itemRarity || '레어',
    fame: currentTitle.fame,
    iconUrl: bead.iconUrl || currentTitle.iconUrl || '',
    titleIconUrl: currentTitle.iconUrl || '',
    effects: addEffects(currentBaseEffects, bead.effects || {}),
    titlePackageEffects: addEffects(currentBaseEffects, bead.effects || {}),
    itemReinforceSkill: currentTitle.itemReinforceSkill || [],
    itemBuff: currentTitle.itemBuff || {},
    itemExplain: currentTitle.itemExplain || '',
    auction: bead.auction || {},
    candidateName: currentTitle.itemName,
    groupName: '칭호 보주',
    levelTag: currentTitle.levelTag,
    skillDamagePercent: currentTitle.skillDamagePercent,
    priceItem: {
      itemId: bead.itemId,
      itemName: bead.itemName,
      iconUrl: bead.iconUrl,
    },
    titleEnchantElement: bead.element || '',
    enchantEffects: bead.effects || {},
    currentTitleEnchantElement: currentTitle.titleEnchantElement || '',
    currentTitleEnchantEffects: currentTitle.enchantEffects || {},
    targetTitleEnchantEffects: bead.effects || {},
    purchaseRoute: 'titleBeadOnly',
    purchaseRouteLabel: '칭호 보주 교체',
    titleBead: bead,
  }));
}

function isSameTitleBase(row, currentTitle) {
  if (row?.sourceType !== 'title' || !currentTitle) return false;
  if ((row.tier || '일반') !== (currentTitle.variant || currentTitle.tier || '일반')) return false;
  if (Number(row.levelTag || 0) !== Number(currentTitle.levelTag || 0)) return false;
  if (Number(row.skillDamagePercent || 0) !== Number(currentTitle.skillDamagePercent || 0)) return false;
  return getTitleBaseEffectSignature(row) === getTitleBaseEffectSignature(currentTitle);
}

function getTitleBeadOnlyRow(row, currentTitle) {
  if (
    !isSameTitleBase(row, currentTitle) ||
    !row.titleBead?.auction
  ) {
    return row;
  }
  return {
    ...row,
    itemId: currentTitle.itemId,
    titleItemName: currentTitle.itemName,
    titleIconUrl: currentTitle.iconUrl || '',
    titlePackageEffects: addEffects(
      subtractEffects(currentTitle.effects || {}, currentTitle.enchantEffects || {}),
      row.titleBead.effects || row.enchantEffects || {},
    ),
    auction: row.titleBead.auction,
    priceItem: {
      itemId: row.titleBead.itemId,
      itemName: row.titleBead.itemName,
      iconUrl: row.titleBead.iconUrl,
    },
    currentTitleEnchantElement: currentTitle.titleEnchantElement || '',
    currentTitleEnchantEffects: currentTitle.enchantEffects || {},
    targetTitleEnchantEffects: row.titleBead.effects || row.enchantEffects || {},
    purchaseRoute: 'titleBeadOnly',
    purchaseRouteLabel: '칭호 보주 교체',
  };
}

function getCreatureArtifactEffectiveEffects(row, baseline, preferredElement = '') {
  const effects = { ...(row?.effects || {}) };
  if (row?.sourceType !== 'creatureArtifact') return effects;
  const base = getDamageBaseline(baseline);
  const element = preferredElement || base.elementName;
  const allElement = Number(row.artifactAllElement || 0);
  const singleElement = Number(row.artifactSingleElement || 0);
  if (allElement || singleElement) {
    effects.elementAll = allElement + (row.element === element ? singleElement : 0);
  }
  return effects;
}

function getCreatureArtifactEffectsTotal(artifacts = [], baseline = {}, currentTitle = {}) {
  const creature = { artifacts: artifacts || [] };
  const preferredElement = getPreferredElementForElementalUpgrades(
    [],
    baseline,
    creature,
    currentTitle,
  );
  return (artifacts || []).reduce((total, artifact) => addEffects(
    total,
    getCreatureArtifactEffectiveEffects(
      { sourceType: 'creatureArtifact', ...artifact },
      baseline,
      preferredElement,
    ),
  ), {});
}

function getCreatureArtifactReplacementMultiplier(baseArtifacts = [], simulatedArtifacts = []) {
  const baseByType = getCurrentCreatureArtifactBySlot({ artifacts: baseArtifacts });
  const simulatedByType = getCurrentCreatureArtifactBySlot({ artifacts: simulatedArtifacts });
  return [...CREATURE_ARTIFACT_TYPES].reduce((multiplier, artifactType) => {
    const baseArtifact = baseByType.get(artifactType) || {};
    const simulatedArtifact = simulatedByType.get(artifactType) || {};
    return multiplier
      * getFinalDamageReplacementMultiplier(baseArtifact.effects || {}, simulatedArtifact.effects || {})
      * (getSkillDamageMultiplier(simulatedArtifact) / getSkillDamageMultiplier(baseArtifact));
  }, 1);
}

function getCreatureArtifactDisplayEffects(row, baseline, preferredElement = '') {
  const effects = { ...(row?.effects || {}) };
  if (row?.sourceType !== 'creatureArtifact') return effects;
  const base = getDamageBaseline(baseline);
  const element = preferredElement || base.elementName;
  const elementKey = ELEMENT_EFFECT_KEY_BY_NAME[row.element];
  const allElement = Number(row.artifactAllElement || 0);
  const singleElement = Number(row.artifactSingleElement || 0);
  if (allElement || singleElement) {
    effects.elementAll = allElement;
    if (singleElement && row.element === element && elementKey) {
      effects[elementKey] = singleElement;
    }
  }
  return effects;
}

function getRepresentativeRecommendationRows(
  rows,
  currentEnchants,
  currentCreature,
  currentTitle,
  currentAura,
  baseline,
  includeMaterialCosts = false,
  simulationOptions = null,
  currentCreatureBody = currentCreature,
) {
  const currentBySlot = getCurrentEnchantBySlot(currentEnchants, baseline);
  const currentArtifactBySlot = getCurrentCreatureArtifactBySlot(currentCreature);
  const preferredArtifactElement = getPreferredElementForElementalUpgrades(rows, baseline, currentCreature, currentTitle);
  const elementAlignmentOverride = getElementAlignmentOverride(
    rows,
    baseline,
    currentCreature,
    currentTitle,
    currentArtifactBySlot,
    includeMaterialCosts,
  );
  const bySlotTier = new Map();
  rows.forEach((row) => {
    if (shouldSkipByElementAlignmentOverride(row, elementAlignmentOverride, currentTitle)) return;
    const evaluationBaseline = row.sourceType === 'enchant'
      ? simulationOptions?.referenceBaselineBySlot?.get(row.slot) || baseline
      : row.sourceType === 'avatar' && row.kind === 'brilliantEmblem'
        ? simulationOptions?.avatarReferenceBaselineBySlotId?.get(row.targetSlotId) || baseline
      : row.sourceType === 'aura'
        ? simulationOptions?.auraReferenceBaseline || baseline
      : row.sourceType === 'creature'
        ? simulationOptions?.creatureReferenceBaseline || baseline
      : row.sourceType === 'creatureArtifact'
        ? simulationOptions?.creatureArtifactReferenceBaselineByType?.get(getCreatureArtifactType(row)) || baseline
      : row.sourceType === 'title'
        ? simulationOptions?.titleReferenceBaseline || baseline
      : row.sourceType === 'blackFang'
        ? simulationOptions?.blackFangReferenceBaselineBySlot?.get(row.slot) || baseline
        : baseline;
    const artifactReferenceCreature = row.sourceType === 'creatureArtifact'
      ? simulationOptions?.referenceCreatureByArtifactType?.get(getCreatureArtifactType(row))
      : null;
    const rowPreferredElement = getPreferredElementForRecommendationRow(
      row,
      evaluationBaseline,
      artifactReferenceCreature
        ? getPreferredElementForElementalUpgrades(rows, evaluationBaseline, artifactReferenceCreature, currentTitle)
        : preferredArtifactElement,
      elementAlignmentOverride,
      currentTitle,
    );
    if (!isPreferredCreatureArtifactElement(row, baseline, rowPreferredElement)) return;
    if (!isPreferredTitleEnchantElement(row, baseline, rowPreferredElement)) return;
    row = row.sourceType === 'creatureArtifact'
      ? {
        ...row,
        effects: getCreatureArtifactEffectiveEffects(row, evaluationBaseline, rowPreferredElement),
        displayEffects: getCreatureArtifactDisplayEffects(row, evaluationBaseline, rowPreferredElement),
      }
      : row;
    let current = row.sourceType === 'upgrade'
      ? { effects: {} }
      : TUNE_SOURCE_TYPES.has(row.sourceType)
        ? { effects: {} }
      : row.sourceType === 'blackFang'
        ? { effects: {} }
      : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
        ? { effects: row.currentEffects || {} }
      : row.sourceType === 'avatar'
        ? { effects: {} }
      : row.sourceType === 'switchingTitle'
        ? { effects: {} }
      : row.sourceType === 'switchingCreature'
        ? { effects: {} }
      : row.sourceType === 'switchingFragment'
        ? { effects: {} }
      : row.sourceType === 'creature'
      ? {
        ...(simulationOptions?.referenceCreature || currentCreatureBody),
        estimatedDamagePercent: estimateDamagePercent(
          (simulationOptions?.referenceCreature || currentCreatureBody)?.effects || {},
          evaluationBaseline,
        ),
      }
      : row.sourceType === 'creatureArtifact'
        ? (() => {
          const artifact = simulationOptions?.referenceCreatureArtifactByType?.get(getCreatureArtifactType(row))
            || currentArtifactBySlot.get(getCreatureArtifactType(row))
            || {};
          const effectiveEffects = getCreatureArtifactEffectiveEffects({ sourceType: 'creatureArtifact', ...artifact }, evaluationBaseline, rowPreferredElement);
          return {
            ...artifact,
            effects: effectiveEffects,
            displayEffects: getCreatureArtifactDisplayEffects({ sourceType: 'creatureArtifact', ...artifact }, evaluationBaseline, rowPreferredElement),
            estimatedDamagePercent: estimateDamagePercent(effectiveEffects, evaluationBaseline),
          };
        })()
      : row.sourceType === 'title'
        ? {
          ...(simulationOptions?.referenceTitle || currentTitle),
          estimatedDamagePercent: estimateDamagePercent(
            (simulationOptions?.referenceTitle || currentTitle)?.effects || {},
            evaluationBaseline,
          ),
        }
        : row.sourceType === 'aura'
          ? {
            ...(simulationOptions?.referenceAura || currentAura),
            estimatedDamagePercent: estimateDamagePercent(
              (simulationOptions?.referenceAura || currentAura)?.effects || {},
              evaluationBaseline,
            ),
          }
        : row.sourceType === 'enchant'
          ? simulationOptions?.referenceEnchantBySlot
            ? simulationOptions.referenceEnchantBySlot.get(row.slot) || { slot: row.slot, effects: {} }
            : currentBySlot.get(row.slot)
          : currentBySlot.get(row.slot);
    row = getTitleBeadOnlyRow(row, current);
    if (row.sourceType === 'title') {
      row = {
        ...row,
        effects: getTitleEffectiveEffects(row, rowPreferredElement),
      };
      current = {
        ...current,
        effects: getTitleEffectiveEffects(current, rowPreferredElement),
      };
    }
    const useElementAdjustedScoring = (
      elementAlignmentOverride?.type === 'title' &&
      row.sourceType === 'title' &&
      isTitleBeadReplacementCandidate(row, currentTitle)
    ) || (
      elementAlignmentOverride?.type === 'redArtifact' &&
      row.sourceType === 'creatureArtifact' &&
      row.slotColor === 'RED'
    );
    const adjustedElementBaseline = useElementAdjustedScoring
      ? getAdjustedElementBaselineForRecommendation(row, current, evaluationBaseline)
      : null;
    if (!isMaterialAcquisition(row) && !isFreeActionRecommendation(row) && (!Number.isFinite(row?.auction?.minUnitPrice) || row.auction.minUnitPrice <= 0)) return;
    if (row.sourceType === 'creature' && current?.itemId && current.itemId === row.itemId) return;
    if (row.sourceType === 'creatureArtifact' && current?.itemId && current.itemId === row.itemId) return;
    if (
      row.sourceType === 'title' &&
      current?.itemId &&
      current.itemId === row.itemId &&
      getEffectSignature(current.effects || {}) === getEffectSignature(row.effects || {})
    ) return;
    if (row.sourceType === 'aura' && current?.itemId && current.itemId === row.itemId) return;
    const isReplacement = !['upgrade', 'equipmentTune', 'oathTune', 'avatar', 'switchingTitle', 'switchingCreature', 'switchingFragment'].includes(row.sourceType);
    const damageEffects = getRecommendationDamageEffects(row, current);
    const estimatedDamagePercent = isReplacement
      ? (
        adjustedElementBaseline
          ? getElementAdjustedReplacementIncrementalDamagePercent(row, current, evaluationBaseline, adjustedElementBaseline)
          : getReplacementIncrementalDamagePercent(
            row.sourceType === 'blackFang'
              ? { ...row, effects: row.targetEffects || addEffects(row.currentEffects, row.effects) }
              : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
                ? { ...row, effects: row.targetEffects || row.effects || {} }
              : row,
            row.sourceType === 'blackFang' || row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft' ? { effects: row.currentEffects || {} } : current,
            evaluationBaseline,
          )
      )
      : estimateDamagePercent(damageEffects, evaluationBaseline);
    const currentDamagePercent = 0;
    const incrementalDamagePercent = estimatedDamagePercent;
    if (incrementalDamagePercent <= 0.0001) return;

    const titleSkillKey = row.sourceType === 'title'
      ? getSkillDamageMultiplier(row).toFixed(8)
      : '';
    const itemSkillKey = ['creature', 'aura'].includes(row.sourceType)
      ? `${row.reinforceSkillName || ''}:${Number(row.reinforceSkillLevel || 0)}:${Number(row.skillDamageMultiplier || 1).toFixed(8)}`
      : '';
    const key = row.sourceType === 'enchant'
      ? [
        row.sourceType,
        row.slot,
        getEffectSignature(getRoleRelevantEffects(current?.effects || {}, false)),
        getEffectSignature(getRoleRelevantEffects(row.effects || {}, false)),
        getEffectSignature(getRoleRelevantEffects(damageEffects || {}, false)),
        getRoundedMetricKey(incrementalDamagePercent),
      ].join(':')
      : row.sourceType === 'creatureArtifact'
      ? `${row.sourceType}:${row.slot}:${row.tier}`
      : row.sourceType === 'switchingCreature'
        ? `${row.sourceType}:${row.itemId || row.itemName}:${getEffectSignature(row.effects)}`
      : row.sourceType === 'switchingFragment'
        ? `${row.sourceType}:${row.switchingSlot || row.itemId || row.itemName}:${getEffectSignature(row.effects)}`
      : row.sourceType === 'creature'
        ? `${row.sourceType}:${row.slot}:${row.tier}`
      : ['creature', 'title', 'switchingTitle', 'switchingCreature', 'aura'].includes(row.sourceType)
      ? `${row.sourceType}:${row.slot}:${row.tier}:${titleSkillKey}:${getEffectSignature(row.effects)}:${itemSkillKey}`
      : row.sourceType === 'blackFang'
        ? `${row.sourceType}:${row.slot}:${getEffectSignature(row.effects)}`
        : ['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)
        ? `${row.sourceType}:${row.slot}:${row.upgradeMode}:${row.targetLevel}`
      : `${row.sourceType}:${row.slot}:${getEffectSignature(row.effects)}`;
    const previous = bySlotTier.get(key);
    const shouldReplace = row.sourceType === 'creatureArtifact'
      ? (
        !previous ||
        Math.abs(incrementalDamagePercent - previous.incrementalDamagePercent) <= 0.0001 &&
          (row?.auction?.minUnitPrice || 0) < (previous?.auction?.minUnitPrice || 0)
      )
      : row.sourceType === 'creature'
        ? (
          !previous ||
          getCostPerPointOnePercent({ ...row, incrementalDamagePercent }, includeMaterialCosts) <
            getCostPerPointOnePercent(previous, includeMaterialCosts)
        )
      : isPreferredDuplicateRecommendation(row, previous, includeMaterialCosts);
    if (shouldReplace) {
      bySlotTier.set(key, {
        ...row,
        currentEnchant: current || null,
        estimatedDamagePercent,
        currentDamagePercent,
        incrementalDamagePercent,
        costPerPointOnePercent: 0,
      });
    }
  });
  const representativeRows = [...bySlotTier.values()]
    .map((row) => ({
      ...row,
      costPerPointOnePercent: getCostPerPointOnePercent(row, includeMaterialCosts),
    }));
  const efficiencyFilteredRows = simulationOptions?.preserveEligibleEnchantCandidates
    ? representativeRows
    : removeInefficientLowerTierEnchants(representativeRows, false);
  const bestUpgradeBySlot = new Map();
  const nonUpgradeRows = [];
  efficiencyFilteredRows.forEach((row) => {
    if (!['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)) {
      nonUpgradeRows.push(row);
      return;
    }
    const previous = bestUpgradeBySlot.get(row.slot);
    if (!previous || row.costPerPointOnePercent < previous.costPerPointOnePercent) {
      bestUpgradeBySlot.set(row.slot, row);
    }
  });
  return [...nonUpgradeRows, ...bestUpgradeBySlot.values()]
    .sort(compareDealerRecommendationOrder);
}

function compareDealerRecommendationOrder(a, b) {
  const priorityDiff = Number(a.recommendationPriority || 0) - Number(b.recommendationPriority || 0);
  if (priorityDiff) return priorityDiff;
  const materialDiff = Number(isMaterialAcquisition(b)) - Number(isMaterialAcquisition(a));
  if (materialDiff) return materialDiff;
  if (isMaterialAcquisition(a) && isMaterialAcquisition(b)) {
    if (isMaterialEnchantAcquisition(a) && isMaterialEnchantAcquisition(b)) {
      return compareMaterialEnchantOrder(a, b);
    }
    return b.incrementalDamagePercent - a.incrementalDamagePercent;
  }
  return a.costPerPointOnePercent - b.costPerPointOnePercent;
}

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
        bufferSimulator.blackFangChangesBySlot,
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
        bufferSimulator.blackFangChangesBySlot,
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
    const blackFangReferenceBaselineBySlot = new Map();
    candidateRows.forEach((row) => {
      if (row.sourceType !== 'blackFang' || blackFangReferenceBaselineBySlot.has(row.slot)) return;
      const referenceEquipment = simulator.simulatedEquipmentUpgrades.map((equipment) => (
        equipment?.slot === row.slot && baseEquipmentBySlot.has(row.slot)
          ? cloneSimulatorValue(baseEquipmentBySlot.get(row.slot))
          : cloneSimulatorValue(equipment)
      ));
      blackFangReferenceBaselineBySlot.set(
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
        blackFangReferenceBaselineBySlot,
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
      const baseEquipmentUpgrades = attachBlackFangBaseBodyData(
        state.currentEquipmentUpgrades || [],
        state.currentBlackFangRecommendations || [],
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
        blackFangChangesBySlot: {},
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
    const baseEquipmentUpgrades = attachBlackFangBaseBodyData(
      state.currentEquipmentUpgrades || [],
      state.currentBlackFangRecommendations || [],
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
    if (row.sourceType === 'blackFang') {
      const targetSlot = String(row.slot || '').trim();
      if (
        !BLACK_FANG_SIMULATOR_SLOTS.has(targetSlot) ||
        !row.targetItemId ||
        !Object.keys(row.targetEffects || {}).length
      ) return null;
      return {
        targetTab: 'equipment',
        targetSlot,
        applyType: 'replaceBlackFangBody',
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
    if (row.sourceType === 'blackFang') {
      const targetSlot = String(row.slot || '').trim();
      if (
        !BLACK_FANG_SIMULATOR_SLOTS.has(targetSlot)
        || !row.targetItemId
        || !Object.keys(row.targetEffects || {}).length
        || !row.bufferBaseRelativeChanges
      ) return null;
      return {
        targetTab: 'equipment',
        targetSlot,
        applyType: 'replaceBlackFangBody',
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
        simulator.blackFangChangesBySlot,
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
    const equipmentIndex = simulator.simulatedEquipmentUpgrades.findIndex(
      (equipment) => equipment?.slot === target.targetSlot,
    );
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
    'blackFangChangesBySlot',
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

  function replaceEquipmentBodyPreservingState(currentEquipment = {}, targetBody = {}) {
    const nextEquipment = cloneSimulatorValue(currentEquipment || {});
    nextEquipment.itemId = targetBody.itemId || '';
    nextEquipment.itemName = targetBody.itemName || nextEquipment.itemName || '';
    nextEquipment.iconUrl = targetBody.iconUrl || '';
    nextEquipment.itemRarity = targetBody.itemRarity || nextEquipment.itemRarity || '';
    nextEquipment.bodyEffects = cloneSimulatorValue(targetBody.effects || {});
    nextEquipment.bodyExplain = targetBody.itemExplain || '';
    return nextEquipment;
  }

  function replaceSimulatedBlackFangBody(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceBlackFangBody') return false;
    const equipmentIndex = simulator.simulatedEquipmentUpgrades.findIndex(
      (equipment) => equipment?.slot === target.targetSlot,
    );
    if (equipmentIndex < 0) return false;
    simulator.simulatedEquipmentUpgrades.splice(
      equipmentIndex,
      1,
      replaceEquipmentBodyPreservingState(
        simulator.simulatedEquipmentUpgrades[equipmentIndex],
        {
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
      simulator.blackFangChangesBySlot[target.targetSlot] = cloneSimulatorValue(
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
    replaceBlackFangBody: {
      apply: replaceSimulatedBlackFangBody,
      remove: (selection) => restoreSimulatedEquipmentBodyToBase(selection.targetSlot),
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

  function restoreSimulatedEquipmentBodyToBase(targetSlot) {
    const simulator = state.dealerSimulator;
    if (!simulator || !BLACK_FANG_SIMULATOR_SLOTS.has(targetSlot)) return false;
    const baseEquipment = simulator.baseEquipmentUpgrades.find((equipment) => equipment?.slot === targetSlot);
    const equipmentIndex = simulator.simulatedEquipmentUpgrades.findIndex(
      (equipment) => equipment?.slot === targetSlot,
    );
    if (!baseEquipment || equipmentIndex < 0) return false;
    simulator.simulatedEquipmentUpgrades.splice(
      equipmentIndex,
      1,
      replaceEquipmentBodyPreservingState(
        simulator.simulatedEquipmentUpgrades[equipmentIndex],
        {
          itemId: baseEquipment.itemId,
          itemName: baseEquipment.itemName,
          iconUrl: baseEquipment.iconUrl,
          itemRarity: baseEquipment.itemRarity,
          effects: baseEquipment.bodyEffects,
          itemExplain: baseEquipment.bodyExplain,
        },
      ),
    );
    if (simulator.role === 'buffer') {
      delete simulator.blackFangChangesBySlot[targetSlot];
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
      if (simulator.role !== 'buffer') return equipment;
      const currentEquipment = currentEquipmentBySlot.get(equipment?.slot);
      const blackFangSelection = simulator.activeSelectionByGroup?.[
        `bufferBlackFang:${equipment?.slot}`
      ];
      if (!currentEquipment || blackFangSelection?.applyType !== 'replaceBlackFangBody') {
        return equipment;
      }
      return replaceEquipmentBodyPreservingState(equipment, {
        itemId: currentEquipment.itemId,
        itemName: currentEquipment.itemName,
        iconUrl: currentEquipment.iconUrl,
        itemRarity: currentEquipment.itemRarity,
        effects: currentEquipment.bodyEffects,
        itemExplain: currentEquipment.bodyExplain,
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

  function renderEnchantRecommendLoading(text = '스펙업 순서 추천을 불러오는 중입니다...') {
    if (!els.enchantRecommendList) return;
    els.enchantRecommendList.innerHTML = `<div class="table-empty-cell">${escapeHtml(text)}</div>`;
  }

  function renderEnchantCharacterMessage(text) {
    if (!els.enchantCharacterPortrait) return;
    els.enchantCharacterPortrait.innerHTML = `<div class="table-empty-cell">${escapeHtml(text)}</div>`;
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
            ['creature', 'creatureArtifact', 'title', 'switchingTitle', 'switchingCreature', 'switchingFragment', 'aura', 'avatar', 'upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'blackFang'].includes(row.sourceType)
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
        : row.sourceType === 'blackFang'
          ? getBlackFangMaterialParts(row.materials)
          : [];
      const rowGold = getRecommendationGold(row, includeMaterialCosts);
      const rowGoldText = isFreeActionRecommendation(row) ? '0 골드' : formatGold(rowGold);
      const priceLabel = isFreeActionRecommendation(row)
        ? '비용'
        : includeMaterialCosts && ['upgrade', 'blackFang', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'oathAcquisitionCombined'].includes(row.sourceType)
        ? '재료 포함'
        : ['upgrade', 'blackFang', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'oathAcquisitionCombined'].includes(row.sourceType) ? '예상 골드' : '최저가';
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
      if (!currentEquipment || !BLACK_FANG_SIMULATOR_SLOTS.has(equipment?.slot)) return equipment;
      return replaceEquipmentBodyPreservingState(equipment, {
        itemId: currentEquipment.itemId,
        itemName: currentEquipment.itemName,
        iconUrl: currentEquipment.iconUrl,
        itemRarity: currentEquipment.itemRarity,
        effects: currentEquipment.bodyEffects,
        itemExplain: currentEquipment.bodyExplain,
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
