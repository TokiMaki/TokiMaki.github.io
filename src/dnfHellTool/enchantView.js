const EFFECT_LABELS = {
  finalDamage: '최종뎀',
  attack: '공격력',
  attackIncrease: '공격력 증가',
  attackAmplification: '공증',
  elementAll: '모속강',
  elementFire: '화속강',
  elementWater: '수속강',
  elementLight: '명속강',
  elementDark: '암속강',
  allStat: '올스탯',
  bufferStat: '버퍼 주스탯',
  str: '힘',
  int: '지능',
  critical: '크리',
};
const UPGRADE_SLOT_LABELS = {
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
};
const REINFORCEMENT_RECOMMEND_SLOT_KEYS = new Set(['weapon', 'support', 'magicStone', 'earring']);

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
  '아바타',
  '모자 아바타',
  '머리 아바타',
  '얼굴 아바타',
  '목가슴 아바타',
  '상의 아바타',
  '하의 아바타',
  '벞강 상의 압',
  '벞강 하의 압',
  '무기 아바타',
  '오라 아바타',
  '피부 아바타',
];

const TIER_ORDER = ['가성비', '준종결', '종결', '일반', '플래티넘', '아바타', '엠블렘'];
const ENCHANT_INCLUDE_GROUPS = [
  { title: '마법부여', items: ['가성비', '준종결', '종결'] },
  { title: '오라/칭호/크리쳐', items: ['일반', '플래티넘', '아티팩트'] },
  { title: '아바타', items: ['아바타', '엠블렘'] },
  { title: '강화/증폭', items: ['강화', '증폭'] },
  { title: '흑아', items: ['흑아'] },
];
const ENCHANT_INCLUDE_ORDER = ENCHANT_INCLUDE_GROUPS.flatMap((group) => group.items.map((item) => `${group.title}:${item}`));
const EFFECT_ORDER = ['finalDamage', 'attackIncrease', 'attackAmplification', 'attack', 'elementAll', 'elementFire', 'elementWater', 'elementLight', 'elementDark', 'allStat', 'bufferStat', 'str', 'int'];
const ENCHANT_PORTRAIT_SLOT_LAYOUT = [
  { slot: '머리어깨', key: 'shoulder', side: 'left' },
  { slot: '상의', key: 'top', side: 'left' },
  { slot: '하의', key: 'pants', side: 'left' },
  { slot: '벨트', key: 'belt', side: 'left' },
  { slot: '신발', key: 'shoes', side: 'left' },
  { slot: '오라', key: 'aura', side: 'left' },
  { slot: '크리쳐', key: 'creature', side: 'left' },
  { slot: '무기', key: 'weapon', side: 'right' },
  { slot: '칭호', key: 'title', side: 'right' },
  { slot: '팔찌', key: 'bracelet', side: 'right' },
  { slot: '목걸이', key: 'necklace', side: 'right' },
  { slot: '보조장비', key: 'support', side: 'right' },
  { slot: '반지', key: 'ring', side: 'right' },
  { slot: '귀걸이', key: 'earring', side: 'right' },
  { slot: '마법석', key: 'magic-stone', side: 'right' },
];
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
    activeSelfStat: 732,
    auraStat: 456, auraAttack: 53, auraSkills: ['신념의 오라'],
  },
  femaleCrusader: {
    jobCoefficient: 1.016, buffMultiplier: 1.12,
    activeSelfStat: 622,
    auraStat: 622 + 318, auraAttack: 0, auraSkills: ['신실한 열정'],
  },
  enchantress: {
    jobCoefficient: 0.9765, buffMultiplier: 1.155,
    activeSelfStat: 667,
    auraStat: 667, auraAttack: 0, auraSkills: ['소악마'],
  },
  muse: {
    jobCoefficient: 1.0177, buffMultiplier: 1.10,
    activeSelfStat: 683,
    auraStat: 622, auraAttack: 0, auraSkills: ['유명세'],
  },
  paramedic: {
    jobCoefficient: 1.025, buffMultiplier: 1.12,
    activeSelfStat: 687,
    auraStat: 416, auraAttack: 0, auraSkills: ['대응체계'],
  },
};
const BUFFER_PRIMARY_STAT_PER_LEVEL = 16;
const BUFFER_AURA_SELF_STAT_PER_LEVEL = 23;
const BUFFER_AURA_PARTY_STAT_PER_LEVEL = 23;
const UPGRADE_MATERIAL_LABELS = {
  harmonyCrystal: '조화의 결정체',
  contradictionCrystal: '모순의 결정체',
  colorlessCube: '무색 큐브 조각',
  lionCore: '라이언 코어',
};
const UPGRADE_MATERIAL_ICON_IDS = {
  harmonyCrystal: 'ab8eab6848ed81b8bdd65d1c5a6ae8b2',
  contradictionCrystal: 'f1afc13118b2b07ec1e3b8c2f1958b03',
  colorlessCube: '785e56a0ed4e3efd573da1f56a45217d',
  lionCore: '3840051cf487429c5a757c8bdb00e33b',
  amplificationProtectionTicket: '55be75a1c024aac3ef84ed3bed5b8db9',
  reinforcementProtectionTicket: '8bc063c2b80179bc002f7dfb8203c4ab',
};
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

function getUpgradeMaterialParts(materials = [], upgradeMode = '') {
  return (materials || [])
    .map((material) => {
      const amount = formatMaterialAmount(material.amount);
      const iconId = getUpgradeMaterialIconId(material, upgradeMode);
      return amount ? {
        label: getUpgradeMaterialLabel(material, upgradeMode),
        amount,
        iconUrl: iconId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(iconId)}` : '',
      } : null;
    })
    .filter(Boolean);
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

function formatEffectNumber(value) {
  if (!Number.isFinite(value)) return value;
  const roundedInteger = Math.round(value);
  if (Math.abs(value - roundedInteger) < 0.000001) return String(roundedInteger);
  return value.toFixed(3).replace(/\.?0+$/, '');
}

function formatEffectValue(key, value) {
  const suffix = ['finalDamage', 'attackIncrease', 'attackAmplification', 'critical'].includes(key) ? '%' : '';
  const sign = Number(value) < 0 ? '' : '+';
  return `${EFFECT_LABELS[key] || key} ${sign}${formatEffectNumber(value)}${suffix}`;
}

function formatEffects(effects = {}) {
  return EFFECT_ORDER.map((key) => [key, effects[key]])
    .filter(([key]) => !(Number.isFinite(effects.allStat) && ['str', 'int'].includes(key)))
    .filter(([, value]) => Number.isFinite(value))
    .map(([key, value]) => formatEffectValue(key, value))
    .join(' / ');
}

function extractActiveSkillOptionText(text = '') {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const match = normalized.match(/(\d+)(?:\s*~\s*\d+)?\s*(?:Lv|레벨)[^%]*?액티브\s*스킬[^%]*?(\d+(?:\.\d+)?)%\s*증가/i);
  if (!match) return '';
  return `${match[1]}레벨 액티브 스킬 공격력 ${formatEffectNumber(Number(match[2]))}% 증가`;
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

function formatTitleDetailMainOption(title = {}) {
  const explainText = extractActiveSkillOptionText(title.itemExplain || '');
  if (explainText) return explainText;
  const levelTag = Number(title.levelTag || 0);
  const skillDamagePercent = Number(title.skillDamagePercent || 0);
  if (levelTag > 0 && skillDamagePercent > 0) {
    return `${levelTag}레벨 액티브 스킬 공격력 ${formatEffectNumber(skillDamagePercent)}% 증가`;
  }
  return '';
}

function formatCreatureDetailMainOption(creature = {}) {
  const explainText = extractActiveSkillOptionText(creature.itemExplain || '');
  if (explainText) return explainText;
  const levelTag = Number(creature.levelTag || 0);
  const skillDamagePercent = Number(creature.skillDamagePercent || 0);
  if (levelTag > 0 && skillDamagePercent > 0) {
    return `${levelTag}레벨 액티브 스킬 공격력 ${formatEffectNumber(skillDamagePercent)}% 증가`;
  }
  return '';
}

function formatEffectSummary(prefix, effects = {}) {
  const text = formatEffects(effects);
  return `${prefix}: ${text || '없음'}`;
}

function formatUpgradeState(equipment = {}) {
  const level = Number(equipment.reinforce || 0);
  if (equipment.isAmplified) {
    return `증폭: ${level > 0 ? `${level}증폭` : '없음'}`;
  }
  return `강화: ${level > 0 ? `${level}강화` : '없음'}`;
}

function getUpgradeDetailLine(equipment = {}) {
  const level = Number(equipment.reinforce || 0);
  if (!Number.isFinite(level) || level <= 0) return null;
  if (equipment.isAmplified) {
    return {
      text: `+${level} ${String(equipment.amplificationName || '').trim() || '증폭'}`,
      className: 'enchant-portrait-detail-line-amplify',
    };
  }
  return {
    text: `+${level} 강화`,
    className: 'enchant-portrait-detail-line-reinforce',
  };
}

function getUpgradeBadge(equipment = {}) {
  const level = Number(equipment.reinforce || 0);
  if (!Number.isFinite(level) || level <= 0) return null;
  if (equipment.isAmplified) {
    return { text: `+${level}`, kind: 'amplify' };
  }
  return { text: `+${level}`, kind: 'reinforce' };
}

function getEnchantBadge(effects = {}) {
  const parts = [];
  const attackAmplification = Number(effects.attackAmplification || 0);
  const finalDamage = Number(effects.finalDamage || 0);
  const elementAll = Number(effects.elementAll || 0);
  if (Number.isFinite(attackAmplification) && attackAmplification > 0) {
    parts.push(`${attackAmplification}%`);
  }
  if (Number.isFinite(finalDamage) && finalDamage > 0) {
    parts.push(`${finalDamage}%`);
  }
  if (Number.isFinite(elementAll) && elementAll > 0) {
    parts.push(`${elementAll}`);
  }
  if (!parts.length) return null;
  return { text: parts.join('/') };
}

function formatEffectTransitionValue(key, currentValue, targetValue) {
  const suffix = ['finalDamage', 'attackIncrease', 'attackAmplification', 'critical'].includes(key) ? '%' : '';
  return `${EFFECT_LABELS[key] || key} ${formatEffectNumber(currentValue)}${suffix} -> ${formatEffectNumber(targetValue)}${suffix}`;
}

function formatBlackFangEffect(row) {
  const currentEffects = row.currentEffects || {};
  const targetEffects = row.targetEffects || {};
  const changedKeys = EFFECT_ORDER
    .filter((key) => Number.isFinite(row.effects?.[key]))
    .filter((key) => !(Number.isFinite(row.effects?.allStat) && ['str', 'int'].includes(key)));
  const parts = changedKeys
    .map((key) => formatEffectTransitionValue(key, Number(currentEffects[key] || 0), Number(targetEffects[key] || 0)));
  return parts.length ? parts.join(' / ') : formatEffects(row.effects);
}

function formatEnchantTransitionEffect(row) {
  const currentEffects = row.currentEnchant?.displayEffects || row.currentEnchant?.effects || {};
  const targetEffects = row.displayEffects || row.effects || {};
  const changedKeys = EFFECT_ORDER
    .filter((key) => Number.isFinite(currentEffects[key]) || Number.isFinite(targetEffects[key]))
    .filter((key) => Number(currentEffects[key] || 0) !== Number(targetEffects[key] || 0))
    .filter((key) => !(Number.isFinite(currentEffects.allStat) && ['str', 'int'].includes(key)))
    .filter((key) => !(Number.isFinite(targetEffects.allStat) && ['str', 'int'].includes(key)));
  const parts = changedKeys
    .map((key) => formatEffectTransitionValue(key, Number(currentEffects[key] || 0), Number(targetEffects[key] || 0)));
  return parts.length ? parts.join(' / ') : formatEffects(row.effects);
}

function formatUpgradeEffect(row) {
  const parts = formatEffects(row.effects).split(' / ').filter(Boolean);
  const finalDamage = row.effects?.finalDamage;
  if (Number.isFinite(finalDamage) && finalDamage > 0 && !parts.some((part) => part.includes('최종뎀'))) {
    parts.unshift(formatEffectValue('finalDamage', finalDamage));
  }
  return parts.join(' / ');
}

function formatLevelOptionName(name, hasLevelOption) {
  const cleanName = String(name || '').trim();
  if (!cleanName || !hasLevelOption) return cleanName;
  return `${cleanName.replace(/\[\d+Lv\]/g, '').trim()}[xxLv]`;
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
  return {
    stat,
    statName: baseline.statName === '지능' ? '지능' : '힘',
    baseStat,
    element: Number(baseline.element || 0) || ENCHANT_DAMAGE_BASELINE.element,
    elementName: elementNames[0] || '',
    elementNames,
    elementDamage: Number.isFinite(Number(baseline.elementDamage))
      ? Number(baseline.elementDamage)
      : ELEMENT_BASE_DAMAGE_PERCENT + (Number(baseline.element || 0) || ENCHANT_DAMAGE_BASELINE.element) * ELEMENT_DAMAGE_PER_ELEMENT,
    attack: Number(baseline.attack || 0) || ENCHANT_DAMAGE_BASELINE.attack,
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
  return finalDamageMultiplier * attackIncreaseMultiplier * attackAmplificationMultiplier * elementMultiplier * attackMultiplier * statMultiplier;
}

function getCostPerPointOnePercent(row) {
  const price = Number.isFinite(row?.expectedGold) ? row.expectedGold : row?.auction?.minUnitPrice;
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(row.incrementalDamagePercent) || row.incrementalDamagePercent <= 0) return 0;
  return price * 0.1 / row.incrementalDamagePercent;
}

function isMaterialAcquisition(row) {
  return Boolean(row?.acquisition?.label);
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

function getEnchantIncludeGroup(row = {}) {
  const materialLabel = row?.acquisition?.materialLabel || row?.acquisition?.materialItemName || '';
  if (row.sourceType === 'enchant' && MATERIAL_ENCHANT_MATERIAL_ORDER.some((label) => String(materialLabel).includes(label))) {
    return '마법부여:가성비';
  }
  if (row.sourceType === 'enchant') return `마법부여:${row.tier || '일반'}`;
  if (row.sourceType === 'creatureArtifact') return '오라/칭호/크리쳐:아티팩트';
  if (['creature', 'title', 'aura'].includes(row.sourceType)) return `오라/칭호/크리쳐:${row.tier || '일반'}`;
  if (row.sourceType === 'avatar') return `아바타:${row.tier || '아바타'}`;
  if (row.sourceType === 'blackFang') return '흑아:흑아';
  if (row.tier === '안전증폭' || row.tier === '증폭 전환') {
    return '강화/증폭:증폭';
  }
  if (row.tier === '증폭') return '강화/증폭:증폭';
  if (row.tier === '강화') return '강화/증폭:강화';
  return `기타:${row.tier || '일반'}`;
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
    if (jobName && job?.jobName && job.jobName !== jobName) return total;
    return total + (job?.skills || []).reduce((sum, skill) => {
      if (skillNames && !skillNames.includes(skill?.name)) return sum;
      return sum + Number(skill?.value || 0);
    }, 0);
  }, 0);
}

function getBufferEnchantSkillDelta(row, current, baseline, config) {
  const jobName = baseline?.jobName || '';
  const candidateSkills = row?.reinforceSkill || [];
  const currentSkills = current?.reinforceSkill || [];
  const auraSkillNames = config?.auraSkills || [];
  const candidateTotal = getReinforceSkillLevel(candidateSkills, jobName);
  const currentTotal = getReinforceSkillLevel(currentSkills, jobName);
  const candidateAura = getReinforceSkillLevel(candidateSkills, jobName, auraSkillNames);
  const currentAura = getReinforceSkillLevel(currentSkills, jobName, auraSkillNames);
  return {
    primaryLevels: (candidateTotal - candidateAura) - (currentTotal - currentAura),
    auraLevels: candidateAura - currentAura,
  };
}

function calculateBufferScore(baseline = {}, changes = {}) {
  const config = BUFFER_SCORE_CONFIG[baseline.bufferKey];
  if (!config) return 0;
  const commonStatDelta = Number(changes.statDelta || 0);
  const currentStatDelta = Number(changes.currentStatDelta || 0);
  const switchingStatDelta = Number(changes.switchingStatDelta || 0);
  const primaryLevels = Number(changes.primaryLevels || 0);
  const auraLevels = Number(changes.auraLevels || 0);
  const passiveStatDelta =
    primaryLevels * BUFFER_PRIMARY_STAT_PER_LEVEL +
    auraLevels * BUFFER_AURA_SELF_STAT_PER_LEVEL;
  const baseAppliedStat = Number(baseline.stat || 0) + config.activeSelfStat + passiveStatDelta;
  const appliedStat = baseAppliedStat + commonStatDelta + currentStatDelta;
  const switchingStat = baseAppliedStat
    + Number(baseline.switchingStatDelta || 0)
    + commonStatDelta
    + switchingStatDelta;
  const buffPower = Number(baseline.buffPower || 0);
  const currentAmp = Number(baseline.buffAmplification || 0) / 100;
  const switchingAmp = Math.max(0, Number(baseline.buffAmplification || 0) - 2) / 100;
  const buffFactor = (1 + switchingStat / 2993) * (2 + buffPower * (1 + switchingAmp) / 4800);
  const buffSkillLevel = Number(baseline.buffSkillLevel || 0);
  const awakeningSkillLevel = Number(baseline.awakeningSkillLevel || 0);
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
  const auraStat = config.auraStat + auraLevels * BUFFER_AURA_PARTY_STAT_PER_LEVEL;
  const totalStat = buffStat + awakeStat + auraStat;
  const totalAttack = buffAttack + config.auraAttack;
  return (25000 + totalStat) / 25000 * (3300 + totalAttack) / 3300 * 333 * 1.165;
}

function getBufferRecommendationRows(
  rows,
  currentEnchants,
  currentCreature,
  currentTitle,
  currentAura,
  baseline,
) {
  if (!baseline?.isBuffer) return [];
  const currentBySlot = new Map((currentEnchants || []).map((enchant) => [enchant.slot, enchant]));
  const currentArtifactBySlot = getCurrentCreatureArtifactBySlot(currentCreature);
  const currentScore = calculateBufferScore(baseline);
  const bySlotTier = new Map();
  (rows || []).forEach((row) => {
    if (row.sourceType === 'enchant' && row.role !== 'buffer') return;
    if (!['enchant', 'creature', 'creatureArtifact', 'title', 'aura', 'avatar', 'upgrade'].includes(row.sourceType)) return;
    if (row.sourceType === 'avatar' && row.kind !== 'brilliantEmblem') return;
    row = row.sourceType === 'upgrade'
      ? {
        ...row,
        effects: {
          allStat: Number(row.effects?.allStat || 0),
        },
      }
      : row;
    if (!isMaterialAcquisition(row) && (!Number.isFinite(row?.auction?.minUnitPrice) || row.auction.minUnitPrice <= 0)) return;
    const current = row.sourceType === 'upgrade'
      ? {}
      : row.sourceType === 'creature'
        ? currentCreature || {}
        : row.sourceType === 'creatureArtifact'
          ? currentArtifactBySlot.get(row.slotColor) || {}
          : row.sourceType === 'title'
            ? currentTitle || {}
            : row.sourceType === 'aura'
              ? currentAura || {}
              : currentBySlot.get(row.slot) || {};
    if (
      row.sourceType !== 'upgrade' &&
      current?.itemId &&
      current.itemId === row.itemId &&
      getEffectSignature(current.effects || {}) === getEffectSignature(row.effects || {})
    ) return;
    const statDelta = row.sourceType === 'upgrade'
      ? Number(row.effects?.allStat || 0)
      : Number(row.effects?.allStat || 0) - Number(current.effects?.allStat || 0);
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
        BUFFER_SCORE_CONFIG[baseline.bufferKey],
      )
      : { primaryLevels: 0, auraLevels: 0 };
    const candidateScore = calculateBufferScore(baseline, {
      statDelta,
      ...avatarStatChanges,
      ...skillDelta,
    });
    const incrementalBuffScore = candidateScore - currentScore;
    const incrementalBuffPercent = currentScore > 0 ? (candidateScore / currentScore - 1) * 100 : 0;
    if (incrementalBuffScore <= 0.0001) return;
    const price = row?.auction?.minUnitPrice;
    const buffCostPerHundredPoints = Number.isFinite(price) && price > 0
      ? price * 100 / incrementalBuffScore
      : 0;
    const key = row.sourceType === 'upgrade'
      ? `${row.sourceType}:${row.slot}:${row.upgradeMode}:${row.targetLevel}`
      : `${row.sourceType}:${row.slot}:${row.tier}:${getEffectSignature(row.effects)}:${bufferStatScope}:${skillDelta.primaryLevels}:${skillDelta.auraLevels}`;
    const previous = bySlotTier.get(key);
    if (
      !previous ||
      (isMaterialAcquisition(row) && !isMaterialAcquisition(previous)) ||
      (
        isMaterialAcquisition(row) === isMaterialAcquisition(previous) &&
        Number(row?.auction?.minUnitPrice || 0) < Number(previous?.auction?.minUnitPrice || 0)
      )
    ) {
      bySlotTier.set(key, {
        ...row,
        currentEnchant: current,
        metricType: 'buffer',
        currentBufferScore: currentScore,
        candidateBufferScore: candidateScore,
        incrementalBuffScore,
        incrementalBuffPercent,
        buffCostPerHundredPoints,
        bufferSkillDelta: skillDelta,
        incrementalDamagePercent: incrementalBuffPercent,
      });
    }
  });
  const bestUpgradeBySlot = new Map();
  const nonUpgradeRows = [];
  [...bySlotTier.values()].forEach((row) => {
    if (row.sourceType !== 'upgrade') {
      nonUpgradeRows.push(row);
      return;
    }
    const previous = bestUpgradeBySlot.get(row.slot);
    if (!previous || row.buffCostPerHundredPoints < previous.buffCostPerHundredPoints) {
      bestUpgradeBySlot.set(row.slot, row);
    }
  });
  return [...nonUpgradeRows, ...bestUpgradeBySlot.values()].sort((a, b) => {
    const materialDiff = Number(isMaterialAcquisition(b)) - Number(isMaterialAcquisition(a));
    if (materialDiff) return materialDiff;
    if (isMaterialAcquisition(a) && isMaterialAcquisition(b)) return compareMaterialEnchantOrder(a, b);
    return a.buffCostPerHundredPoints - b.buffCostPerHundredPoints;
  });
}

function getCreatureRows(groups) {
  return (groups || []).flatMap((group) => (group.candidates || []).map((candidate) => ({
    sourceType: 'creature',
    slot: '크리쳐',
    tier: candidate.variant || '일반',
    itemId: candidate.itemId,
    itemName: candidate.itemName || candidate.name,
    itemRarity: '레어',
    fame: candidate.targetFame || group.targetFame,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.name,
    groupName: group.groupName,
  })));
}

function getCreatureArtifactRows(groups) {
  return (groups || []).flatMap((group) => (group.candidates || []).map((candidate) => ({
    sourceType: 'creatureArtifact',
    slot: candidate.slot || group.slot || '크리쳐 아티팩트',
    tier: '아티팩트',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '유니크',
    fame: candidate.fame,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    element: candidate.element || '',
    artifactAllElement: Number(candidate.artifactAllElement || 0),
    artifactSingleElement: Number(candidate.artifactSingleElement || 0),
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.itemName,
    groupName: group.groupName,
    slotColor: candidate.slotColor || group.slotColor,
  })));
}

function getTitleRows(groups, currentTitle) {
  return (groups || []).flatMap((group) => (group.candidates || [])
    .map((candidate) => ({
      sourceType: 'title',
      slot: '칭호',
      tier: candidate.variant || '일반',
      itemId: candidate.itemId,
      itemName: candidate.itemName || candidate.name,
      itemRarity: candidate.itemRarity || '레어',
      fame: candidate.fame,
      iconUrl: candidate.priceItem?.iconUrl || candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
      effects: candidate.effects || {},
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
}

function getAuraRows(groups) {
  return (groups || []).flatMap((group) => (group.candidates || []).map((candidate) => ({
    sourceType: 'aura',
    slot: '오라',
    tier: candidate.variant || '일반',
    itemId: candidate.itemId,
    itemName: candidate.priceItem?.itemName || candidate.itemName || candidate.name,
    itemRarity: candidate.itemRarity || '레어',
    fame: candidate.fame,
    iconUrl: candidate.priceItem?.iconUrl || candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
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
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    acquisition: candidate.acquisition || null,
    needCount: candidate.needCount || 0,
    unitPrice: candidate.unitPrice,
    targetSkill: candidate.targetSkill || '',
    bufferStatScope: candidate.bufferStatScope || '',
    recommendationPriority: Number(candidate.recommendationPriority || 0),
  }));
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
  }));
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

function getUpgradeEffectGroup(slot) {
  const slotKey = UPGRADE_SLOT_LABELS[slot];
  if (['support', 'magicStone'].includes(slotKey)) {
    return 'specialEquipment';
  }
  return slotKey;
}

function getEffectsByLevel(source = {}, slot, level) {
  const groupKey = getUpgradeEffectGroup(slot);
  const row = (source.effectsByLevel || []).find((item) => Number(item.level) === Number(level));
  return addEffects(row?.common, row?.[groupKey]);
}

function getUpgradeEffects(slot, level, mode, upgradeDb = {}) {
  return subtractEffects(
    getCumulativeUpgradeEffects(slot, level, mode, upgradeDb),
    getCumulativeUpgradeEffects(slot, level - 1, mode, upgradeDb),
  );
}

function addEffectValue(effects, key, value) {
  const amount = Number(value || 0);
  if (Number.isFinite(amount) && amount !== 0) {
    effects[key] = Number(effects[key] || 0) + amount;
  }
}

function getCumulativeUpgradeEffects(slot, level, mode, upgradeDb = {}) {
  if (level <= 0) return {};
  if (mode === 'amplification') {
    return getEffectsByLevel(upgradeDb.amplification, slot, level);
  }
  return getEffectsByLevel(upgradeDb.reinforcement, slot, level);
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

function buildUpgradeRow({
  equipment,
  targetLevel,
  mode,
  dbRow,
  stepCost,
  effects,
  itemName,
}) {
  const expectedGold = Number(stepCost?.gold || 0);
  if (!Number.isFinite(expectedGold) || expectedGold <= 0) return null;
  const expectedMaterials = getUpgradeMaterials(stepCost);
  return {
    sourceType: 'upgrade',
    slot: equipment.slot,
    tier: mode === 'amplification'
      ? '증폭'
      : mode === 'safeAmplification'
        ? '안전증폭'
      : mode === 'amplificationConversion'
        ? '증폭 전환'
        : '강화',
    itemName,
    itemId: equipment.itemId || '',
    itemRarity: '',
    iconUrl: equipment.iconUrl || (equipment.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(equipment.itemId)}` : ''),
    effects,
    itemExplain: equipment.itemName || '',
    auction: { minUnitPrice: expectedGold },
    expectedGold,
    expectedMaterials,
    currentLevel: Number(equipment.reinforce || 0),
    targetLevel,
    upgradeMode: mode,
  };
}

function getAmplificationCostKey(slot) {
  return slot === '무기' ? 'weapon' : 'nonWeapon';
}

function getUpgradeStepCost(row, equipment, currentLevel, isAmplified) {
  if (!row) return null;
  if (isAmplified) {
    const costKey = getAmplificationCostKey(equipment.slot);
    if (currentLevel < 10 && Number(row.level) === 10) {
      return row.expectedByStartLevel?.[costKey]?.[String(currentLevel)] || null;
    }
    return row.stepExpected?.[costKey] || null;
  }
  const costKey = equipment.slot === '무기' ? 'weapon' : 'specialEquipment';
  return row.stepExpected?.[costKey] || null;
}

function getSafeAmplificationTargetCost(row, equipment, currentLevel, upgradeDb) {
  const costKey = getAmplificationCostKey(equipment.slot);
  const targetCost = row?.expectedFromZero?.[costKey];
  if (!targetCost) return null;
  const currentCost = currentLevel > 0
    ? (upgradeDb.amplification?.safeAmplification || [])
      .find((safeRow) => Number(safeRow.level) === currentLevel)?.expectedFromZero?.[costKey] || {}
    : {};
  return subtractCost(targetCost, currentCost);
}

function subtractCost(nextCost = {}, currentCost = {}) {
  const result = {};
  const keys = new Set([...Object.keys(nextCost || {}), ...Object.keys(currentCost || {})]);
  keys.forEach((key) => {
    const value = Number(nextCost?.[key] || 0) - Number(currentCost?.[key] || 0);
    if (Number.isFinite(value) && Math.abs(value) > 0.000001) {
      result[key] = value;
    }
  });
  return result;
}

function addCosts(...costs) {
  const result = {};
  costs.forEach((cost) => {
    Object.entries(cost || {}).forEach(([key, value]) => {
      const amount = Number(value || 0);
      if (Number.isFinite(amount) && amount !== 0) {
        result[key] = Number(result[key] || 0) + amount;
      }
    });
  });
  return result;
}

function multiplyCost(cost = {}, multiplier = 1) {
  const result = {};
  Object.entries(cost || {}).forEach(([key, value]) => {
    const amount = Number(value || 0) * multiplier;
    if (Number.isFinite(amount) && Math.abs(amount) > 0.000001) {
      result[key] = amount;
    }
  });
  return result;
}

function getAmplificationAttemptCost(row, costKey, upgradeDb) {
  const targetLevel = Number(row?.level || 0);
  const goldPerAttempt = Number(upgradeDb.amplification?.rules?.normal?.goldPerAttempt?.[costKey] || 0);
  return {
    gold: goldPerAttempt,
    contradictionCrystal: targetLevel + 10,
  };
}

function getHybridAmplificationExpectedFromZero(level, costKey, upgradeDb) {
  const targetLevel = Number(level || 0);
  if (targetLevel <= 0) return {};
  if (targetLevel <= 10) {
    return (upgradeDb.amplification?.safeAmplification || [])
      .find((row) => Number(row.level) === targetLevel)?.expectedFromZero?.[costKey] || {};
  }

  const normalRows = upgradeDb.amplification?.normalAmplification || [];
  let total = getHybridAmplificationExpectedFromZero(10, costKey, upgradeDb);
  for (let nextLevel = 11; nextLevel <= targetLevel; nextLevel += 1) {
    const row = normalRows.find((normalRow) => Number(normalRow.level) === nextLevel);
    const stepCost = getHybridAmplificationStepCost(row, nextLevel - 1, costKey, upgradeDb);
    total = addCosts(total, stepCost);
  }
  return total;
}

function getHybridAmplificationStepCost(row, currentLevel, costKey, upgradeDb) {
  const successRate = Number(row?.successRatePercent || 0) / 100;
  if (!row || !Number.isFinite(successRate) || successRate <= 0) return row?.stepExpected?.[costKey] || null;
  const failureRate = Math.max(0, 1 - successRate);
  const directExpected = multiplyCost(getAmplificationAttemptCost(row, costKey, upgradeDb), 1 / successRate);
  const rebuildExpected = multiplyCost(
    getHybridAmplificationExpectedFromZero(currentLevel, costKey, upgradeDb),
    failureRate / successRate,
  );
  return addCosts(directExpected, rebuildExpected, { protectionTicket: failureRate / successRate });
}

function getSafeWeaponTargetCost(row, currentLevel, upgradeDb) {
  const targetCost = row?.expectedFromZero?.weapon;
  if (!targetCost) return null;
  const currentCost = currentLevel > 0
    ? (upgradeDb.reinforcement?.safeWeaponReinforcement || [])
      .find((safeRow) => Number(safeRow.level) === currentLevel)?.expectedFromZero?.weapon || {}
    : {};
  return subtractCost(targetCost, currentCost);
}

function getReinforcementRowForNextLevel(equipment, targetLevel, upgradeDb, reinforcementRows) {
  if (equipment.slot === '무기' && targetLevel <= 12) {
    return (upgradeDb.reinforcement?.safeWeaponReinforcement || [])
      .find((row) => Number(row.level) === targetLevel) || null;
  }
  return reinforcementRows.find((row) => Number(row.level) === targetLevel) || null;
}

function findBetterAmplificationTarget(equipment, currentLevel, upgradeDb, baseline, isBuffer = false) {
  const amplificationRows = upgradeDb.amplification?.normalAmplification || [];
  const currentEffects = getCumulativeUpgradeEffects(equipment.slot, currentLevel, 'reinforcement', upgradeDb);
  if (isBuffer) {
    return amplificationRows
      .slice()
      .sort((a, b) => Number(a.level) - Number(b.level))
      .find((row) => {
        const conversionEffects = getCumulativeUpgradeEffects(equipment.slot, Number(row.level), 'amplification', upgradeDb);
        return Number(conversionEffects.allStat || 0) > Number(currentEffects.allStat || 0);
      }) || null;
  }
  const currentMultiplier = estimateDamageMultiplier(currentEffects, baseline);
  return amplificationRows
    .slice()
    .sort((a, b) => Number(a.level) - Number(b.level))
    .find((row) => {
      const conversionEffects = getCumulativeUpgradeEffects(equipment.slot, Number(row.level), 'amplification', upgradeDb);
      return estimateDamageMultiplier(conversionEffects, baseline) > currentMultiplier + 0.000001;
    }) || null;
}

function getUpgradeRows(currentEquipmentUpgrades = [], upgradeDb = {}, baseline = {}, bufferBaseline = null) {
  upgradeDb = upgradeDb || {};
  const reinforcementRows = upgradeDb.reinforcement?.reinforcement || [];
  const amplificationRows = upgradeDb.amplification?.normalAmplification || [];
  const safeAmplificationRows = upgradeDb.amplification?.safeAmplification || [];
  return (currentEquipmentUpgrades || []).flatMap((equipment) => {
    const slotKey = UPGRADE_SLOT_LABELS[equipment.slot];
    if (!slotKey) return [];
    const currentLevel = Number(equipment.reinforce || 0);
    const isAmplified = Boolean(equipment.isAmplified);
    const treatAsAmplified = isAmplified || (currentLevel === 0 && equipment.slot !== '무기');
    const targetLevel = !treatAsAmplified && equipment.slot === '무기' && currentLevel < 12
      ? 12
      : treatAsAmplified && currentLevel < 10 ? 10 : currentLevel + 1;
    const rows = [];
    const allowReinforcement = REINFORCEMENT_RECOMMEND_SLOT_KEYS.has(slotKey);
    const isSafeAmplification = treatAsAmplified && targetLevel <= 10;
    const dbRow = treatAsAmplified
      ? (isSafeAmplification ? safeAmplificationRows : amplificationRows)
        .find((row) => Number(row.level) === targetLevel)
      : allowReinforcement ? getReinforcementRowForNextLevel(equipment, targetLevel, upgradeDb, reinforcementRows) : null;
    const isSafeReinforcement = !treatAsAmplified && equipment.slot === '무기' && targetLevel <= 12;
    let nextUpgradeRow = null;
    if (dbRow) {
      const stepCost = isSafeReinforcement
        ? getSafeWeaponTargetCost(dbRow, currentLevel, upgradeDb)
        : isSafeAmplification
          ? getSafeAmplificationTargetCost(dbRow, equipment, currentLevel, upgradeDb)
          : treatAsAmplified
            ? getHybridAmplificationStepCost(dbRow, currentLevel, getAmplificationCostKey(equipment.slot), upgradeDb)
        : getUpgradeStepCost(dbRow, equipment, currentLevel, treatAsAmplified);
      nextUpgradeRow = buildUpgradeRow({
        equipment,
        targetLevel,
        mode: isSafeAmplification ? 'safeAmplification' : treatAsAmplified ? 'amplification' : isSafeReinforcement ? 'safeReinforcement' : 'reinforcement',
        dbRow,
        stepCost,
        effects: treatAsAmplified && currentLevel < 10
          ? subtractEffects(
            getCumulativeUpgradeEffects(equipment.slot, targetLevel, 'amplification', upgradeDb),
            getCumulativeUpgradeEffects(equipment.slot, currentLevel, 'amplification', upgradeDb),
          )
          : isSafeReinforcement
            ? subtractEffects(
              getCumulativeUpgradeEffects(equipment.slot, targetLevel, 'reinforcement', upgradeDb),
              getCumulativeUpgradeEffects(equipment.slot, currentLevel, 'reinforcement', upgradeDb),
            )
            : getUpgradeEffects(equipment.slot, targetLevel, treatAsAmplified ? 'amplification' : 'reinforcement', upgradeDb),
        itemName: `${equipment.slot} ${currentLevel}->${targetLevel} ${isSafeAmplification ? '안전증폭' : treatAsAmplified ? '증폭' : isSafeReinforcement ? '안전강화' : '강화'}`,
      });
      if ((treatAsAmplified || isSafeReinforcement) && nextUpgradeRow) rows.push(nextUpgradeRow);
    }

    if (!treatAsAmplified && !isSafeReinforcement) {
      const currentEffects = getCumulativeUpgradeEffects(equipment.slot, currentLevel, 'reinforcement', upgradeDb);
      const conversionRow = currentLevel > 0
        ? findBetterAmplificationTarget(equipment, currentLevel, upgradeDb, baseline, Boolean(bufferBaseline?.isBuffer))
        : null;
      if (conversionRow) {
        const conversionLevel = Number(conversionRow.level);
        const costKey = getAmplificationCostKey(equipment.slot);
        const safeConversionRow = conversionLevel <= 10
          ? safeAmplificationRows.find((row) => Number(row.level) === conversionLevel)
          : null;
        const expectedFromZero = safeConversionRow
          ? safeConversionRow.expectedFromZero?.[costKey]
          : getHybridAmplificationExpectedFromZero(conversionLevel, costKey, upgradeDb);
        if (expectedFromZero) {
          const conversionEffects = getCumulativeUpgradeEffects(equipment.slot, conversionLevel, 'amplification', upgradeDb);
          const incrementalEffects = subtractEffects(conversionEffects, currentEffects);
          const row = buildUpgradeRow({
            equipment,
            targetLevel: conversionLevel,
            mode: 'amplificationConversion',
            dbRow: conversionRow,
            stepCost: expectedFromZero,
            effects: incrementalEffects,
            itemName: `${equipment.slot} ${currentLevel}강화->${conversionLevel}증폭`,
          });
          if (row) rows.push(row);
        }
      }
      if (nextUpgradeRow) rows.push(nextUpgradeRow);
    }
    return rows;
  });
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

function setOptions(select, values, allLabel) {
  if (!select) return;
  const current = select.value || 'all';
  select.innerHTML = [
    `<option value="all">${allLabel}</option>`,
    ...values.map((value) => `<option value="${value}">${value}</option>`),
  ].join('');
  select.value = values.includes(current) ? current : 'all';
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

function getRecommendationDamageEffects(row, current) {
  if (row.sourceType === 'upgrade') return row.effects || {};
  if (row.sourceType === 'blackFang') {
    return subtractEffects(
      row.targetEffects || addEffects(row.currentEffects, row.effects),
      row.currentEffects || {},
    );
  }
  if (['avatar'].includes(row.sourceType)) return row.effects || {};
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
  const baseFinalDamage = Math.max(0, base.finalDamage - Number(currentEffects.finalDamage || 0));
  const currentFinalDamageMultiplier = 1 + (baseFinalDamage + Number(currentEffects.finalDamage || 0)) / 100;
  const targetFinalDamageMultiplier = 1 + (baseFinalDamage + Number(targetEffects.finalDamage || 0)) / 100;
  const finalDamageMultiplier = targetFinalDamageMultiplier / currentFinalDamageMultiplier;
  const baseAttackIncrease = Math.max(0, base.attackIncrease - Number(currentEffects.attackIncrease || 0));
  const currentAttackIncreaseMultiplier = 1 + (baseAttackIncrease + Number(currentEffects.attackIncrease || 0)) / 100;
  const targetAttackIncreaseMultiplier = 1 + (baseAttackIncrease + Number(targetEffects.attackIncrease || 0)) / 100;
  const attackIncreaseMultiplier = targetAttackIncreaseMultiplier / currentAttackIncreaseMultiplier;
  const baseAttackAmplification = Math.max(0, base.attackAmplification - Number(currentEffects.attackAmplification || 0));
  const currentAttackAmplificationMultiplier = 1 + (baseAttackAmplification + Number(currentEffects.attackAmplification || 0)) / 100;
  const targetAttackAmplificationMultiplier = 1 + (baseAttackAmplification + Number(targetEffects.attackAmplification || 0)) / 100;
  const attackAmplificationMultiplier = targetAttackAmplificationMultiplier / currentAttackAmplificationMultiplier;
  const elementMultiplier = estimateDamageMultiplier(getElementDeltaEffects(targetEffects, currentEffects), baseline);
  const currentAttack = base.attack + REGION_ATTACK_FLAT + Number(currentEffects.attack || 0);
  const targetAttack = base.attack + REGION_ATTACK_FLAT + Number(targetEffects.attack || 0);
  const attackMultiplier = targetAttack / currentAttack;
  const currentStatValue = getSelectedStatEffect(currentEffects, base);
  const targetStatValue = getSelectedStatEffect(targetEffects, base);
  const currentEffectiveStat = getEquipmentScoreEffectiveStat(base.stat + currentStatValue, base.baseStat);
  const targetEffectiveStat = getEquipmentScoreEffectiveStat(base.stat + targetStatValue, base.baseStat);
  const statMultiplier = (1 + targetEffectiveStat / 250) / (1 + currentEffectiveStat / 250);
  const currentSkillDamageMultiplier = getSkillDamageMultiplier(current);
  const targetSkillDamageMultiplier = getSkillDamageMultiplier(row);
  const skillDamageMultiplier = targetSkillDamageMultiplier / currentSkillDamageMultiplier;
  return (finalDamageMultiplier * attackIncreaseMultiplier * attackAmplificationMultiplier * elementMultiplier * attackMultiplier * statMultiplier * skillDamageMultiplier - 1) * 100;
}

function getCurrentCreatureArtifactBySlot(currentCreature) {
  return new Map((currentCreature?.artifacts || [])
    .filter((artifact) => artifact?.slotColor)
    .map((artifact) => [artifact.slotColor, artifact]));
}

function getPreferredElementForElementalUpgrades(rows, baseline) {
  const base = getDamageBaseline(baseline);
  const topElements = base.elementNames || [];
  if (topElements.length <= 1) return topElements[0] || '';
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
  return ranked[0]?.element || topElements[0] || '';
}

function isPreferredCreatureArtifactElement(row, baseline, preferredElement = '') {
  if (row?.sourceType !== 'creatureArtifact') return true;
  if (!['RED', 'BLUE'].includes(row.slotColor)) return true;
  const base = getDamageBaseline(baseline);
  const element = preferredElement || base.elementName;
  if (!element) return true;
  return row.element === element;
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

function getRepresentativeRecommendationRows(rows, currentEnchants, currentCreature, currentTitle, currentAura, baseline) {
  const currentBySlot = getCurrentEnchantBySlot(currentEnchants, baseline);
  const currentArtifactBySlot = getCurrentCreatureArtifactBySlot(currentCreature);
  const preferredArtifactElement = getPreferredElementForElementalUpgrades(rows, baseline);
  const bySlotTier = new Map();
  rows.forEach((row) => {
    if (!isPreferredCreatureArtifactElement(row, baseline, preferredArtifactElement)) return;
    if (!isPreferredTitleEnchantElement(row, baseline, preferredArtifactElement)) return;
    row = row.sourceType === 'creatureArtifact'
      ? {
        ...row,
        effects: getCreatureArtifactEffectiveEffects(row, baseline, preferredArtifactElement),
        displayEffects: getCreatureArtifactDisplayEffects(row, baseline, preferredArtifactElement),
      }
      : row;
    if (!isMaterialAcquisition(row) && (!Number.isFinite(row?.auction?.minUnitPrice) || row.auction.minUnitPrice <= 0)) return;
    const current = row.sourceType === 'upgrade'
      ? { effects: {} }
      : row.sourceType === 'blackFang'
        ? { effects: {} }
      : row.sourceType === 'avatar'
        ? { effects: {} }
      : row.sourceType === 'creature'
      ? {
        ...currentCreature,
        estimatedDamagePercent: estimateDamagePercent(currentCreature?.effects || {}, baseline),
      }
      : row.sourceType === 'creatureArtifact'
        ? (() => {
          const artifact = currentArtifactBySlot.get(row.slotColor) || {};
          const effectiveEffects = getCreatureArtifactEffectiveEffects({ sourceType: 'creatureArtifact', ...artifact }, baseline, preferredArtifactElement);
          return {
            ...artifact,
            effects: effectiveEffects,
            displayEffects: getCreatureArtifactDisplayEffects({ sourceType: 'creatureArtifact', ...artifact }, baseline, preferredArtifactElement),
            estimatedDamagePercent: estimateDamagePercent(effectiveEffects, baseline),
          };
        })()
      : row.sourceType === 'title'
        ? {
          ...currentTitle,
          estimatedDamagePercent: estimateDamagePercent(currentTitle?.effects || {}, baseline),
        }
        : row.sourceType === 'aura'
          ? {
            ...currentAura,
            estimatedDamagePercent: estimateDamagePercent(currentAura?.effects || {}, baseline),
          }
        : currentBySlot.get(row.slot);
    if (row.sourceType === 'creature' && current?.itemId && current.itemId === row.itemId) return;
    if (row.sourceType === 'creatureArtifact' && current?.itemId && current.itemId === row.itemId) return;
    if (
      row.sourceType === 'title' &&
      current?.itemId &&
      current.itemId === row.itemId &&
      getEffectSignature(current.effects || {}) === getEffectSignature(row.effects || {})
    ) return;
    if (row.sourceType === 'aura' && current?.itemId && current.itemId === row.itemId) return;
    const isReplacement = !['upgrade', 'avatar'].includes(row.sourceType);
    const damageEffects = getRecommendationDamageEffects(row, current);
    const estimatedDamagePercent = isReplacement
      ? getReplacementIncrementalDamagePercent(
        row.sourceType === 'blackFang'
          ? { ...row, effects: row.targetEffects || addEffects(row.currentEffects, row.effects) }
          : row,
        row.sourceType === 'blackFang' ? { effects: row.currentEffects || {} } : current,
        baseline,
      )
      : estimateDamagePercent(damageEffects, baseline);
    const currentDamagePercent = 0;
    const incrementalDamagePercent = estimatedDamagePercent;
    if (incrementalDamagePercent <= 0.0001) return;

    const titleSkillKey = row.sourceType === 'title'
      ? getSkillDamageMultiplier(row).toFixed(8)
      : '';
    const auraSkillKey = row.sourceType === 'aura'
      ? `${row.reinforceSkillName || ''}:${Number(row.reinforceSkillLevel || 0)}:${Number(row.skillDamageMultiplier || 1).toFixed(8)}`
      : '';
    const key = row.sourceType === 'creatureArtifact'
      ? `${row.sourceType}:${row.slot}:${row.tier}`
      : ['creature', 'title', 'aura'].includes(row.sourceType)
      ? `${row.sourceType}:${row.slot}:${row.tier}:${titleSkillKey}:${getEffectSignature(row.effects)}:${auraSkillKey}`
      : row.sourceType === 'blackFang'
        ? `${row.sourceType}:${row.slot}:${getEffectSignature(row.effects)}`
        : row.sourceType === 'upgrade'
        ? `${row.sourceType}:${row.slot}:${row.upgradeMode}:${row.targetLevel}`
      : `${row.sourceType}:${row.slot}:${getEffectSignature(row.effects)}`;
    const previous = bySlotTier.get(key);
    const shouldReplace = row.sourceType === 'creatureArtifact'
      ? (
        !previous ||
        Math.abs(incrementalDamagePercent - previous.incrementalDamagePercent) <= 0.0001 &&
          (row?.auction?.minUnitPrice || 0) < (previous?.auction?.minUnitPrice || 0)
      )
      : !previous ||
      (isMaterialAcquisition(row) && !isMaterialAcquisition(previous)) ||
      (
        isMaterialAcquisition(row) === isMaterialAcquisition(previous) &&
        (row?.auction?.minUnitPrice || 0) < (previous?.auction?.minUnitPrice || 0)
      );
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
      costPerPointOnePercent: getCostPerPointOnePercent(row),
    }));
  const bestUpgradeBySlot = new Map();
  const nonUpgradeRows = [];
  representativeRows.forEach((row) => {
    if (row.sourceType !== 'upgrade') {
      nonUpgradeRows.push(row);
      return;
    }
    const previous = bestUpgradeBySlot.get(row.slot);
    if (!previous || row.costPerPointOnePercent < previous.costPerPointOnePercent) {
      bestUpgradeBySlot.set(row.slot, row);
    }
  });
  return [...nonUpgradeRows, ...bestUpgradeBySlot.values()]
    .sort((a, b) => {
      const priorityDiff = Number(a.recommendationPriority || 0) - Number(b.recommendationPriority || 0);
      if (priorityDiff) return priorityDiff;
      if (a.kind === 'brilliantEmblem' && b.kind === 'brilliantEmblem') {
        const priceA = Number.isFinite(a?.auction?.minUnitPrice) ? a.auction.minUnitPrice : Number.POSITIVE_INFINITY;
        const priceB = Number.isFinite(b?.auction?.minUnitPrice) ? b.auction.minUnitPrice : Number.POSITIVE_INFINITY;
        if (priceA !== priceB) return priceA - priceB;
      }
      const materialDiff = Number(isMaterialAcquisition(b)) - Number(isMaterialAcquisition(a));
      if (materialDiff) return materialDiff;
      if (isMaterialAcquisition(a) && isMaterialAcquisition(b)) {
        if (isMaterialEnchantAcquisition(a) && isMaterialEnchantAcquisition(b)) {
          return compareMaterialEnchantOrder(a, b);
        }
        return b.incrementalDamagePercent - a.incrementalDamagePercent;
      }
      return a.costPerPointOnePercent - b.costPerPointOnePercent;
    });
}

function hasHigherEnchantCandidate(row, recommendationRows) {
  if (row.sourceType !== 'enchant') return false;
  return (recommendationRows || []).some((candidate) => (
    candidate.sourceType === 'enchant' &&
    candidate.slot === row.slot &&
    candidate.incrementalDamagePercent > row.incrementalDamagePercent + 0.0001
  ));
}

function getEfficiencyBand(costPerPointOnePercent) {
  if (Number(costPerPointOnePercent || 0) > DAMAGE_EFFICIENCY_COLOR_STOPS.at(-1).value) return 'rainbow';
  return 'scale';
}

const DAMAGE_EFFICIENCY_COLOR_STOPS = [
  { value: 700000, label: '70만', color: '#22c55e' },
  { value: 1000000, label: '100만', color: '#a3e635' },
  { value: 1500000, label: '150만', color: '#facc15' },
  { value: 2000000, label: '200만', color: '#f97316' },
  { value: 5000000, label: '500만', color: '#ef4444' },
  { value: 10000000, label: '1000만', color: '#991b1b' },
];
const BUFFER_EFFICIENCY_COLOR_STOPS = [
  { value: 1000000, label: '100만', color: '#22c55e' },
  { value: 2000000, label: '200만', color: '#a3e635' },
  { value: 4000000, label: '400만', color: '#facc15' },
  { value: 10000000, label: '1000만', color: '#f97316' },
  { value: 20000000, label: '2000만', color: '#ef4444' },
  { value: 33333333, label: '3333만', color: '#991b1b' },
];

function parseHexColor(color) {
  const normalized = String(color || '').replace('#', '');
  if (normalized.length !== 6) return [100, 116, 139];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function mixHexColor(fromColor, toColor, ratio) {
  const from = parseHexColor(fromColor);
  const to = parseHexColor(toColor);
  const clamped = Math.max(0, Math.min(1, ratio));
  const mixed = from.map((value, index) => Math.round(value + (to[index] - value) * clamped));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function getEfficiencyColor(costPerPointOnePercent) {
  const cost = Number(costPerPointOnePercent || 0);
  if (!Number.isFinite(cost) || cost <= DAMAGE_EFFICIENCY_COLOR_STOPS[0].value) {
    return DAMAGE_EFFICIENCY_COLOR_STOPS[0].color;
  }
  for (let index = 1; index < DAMAGE_EFFICIENCY_COLOR_STOPS.length; index += 1) {
    const previous = DAMAGE_EFFICIENCY_COLOR_STOPS[index - 1];
    const current = DAMAGE_EFFICIENCY_COLOR_STOPS[index];
    if (cost <= current.value) {
      return mixHexColor(previous.color, current.color, (cost - previous.value) / (current.value - previous.value));
    }
  }
  return DAMAGE_EFFICIENCY_COLOR_STOPS.at(-1).color;
}

function getArrowBackground(fromCost, toCost) {
  if (
    Number(fromCost || 0) > DAMAGE_EFFICIENCY_COLOR_STOPS.at(-1).value ||
    Number(toCost || 0) > DAMAGE_EFFICIENCY_COLOR_STOPS.at(-1).value
  ) {
    return 'linear-gradient(90deg, #ef4444, #f97316, #facc15, #22c55e, #38bdf8, #a855f7, #ef4444)';
  }
  const fromColor = getEfficiencyColor(fromCost);
  const toColor = getEfficiencyColor(toCost);
  if (fromColor === toColor) return fromColor;
  return `linear-gradient(90deg, ${fromColor} 0 50%, ${toColor} 50% 100%)`;
}

function getBufferEfficiencyBand(costPerHundredPoints) {
  if (Number(costPerHundredPoints || 0) > BUFFER_EFFICIENCY_COLOR_STOPS.at(-1).value) return 'rainbow';
  return 'scale';
}

function getBufferEfficiencyColor(costPerHundredPoints) {
  const cost = Number(costPerHundredPoints || 0);
  if (!Number.isFinite(cost) || cost <= BUFFER_EFFICIENCY_COLOR_STOPS[0].value) {
    return BUFFER_EFFICIENCY_COLOR_STOPS[0].color;
  }
  for (let index = 1; index < BUFFER_EFFICIENCY_COLOR_STOPS.length; index += 1) {
    const previous = BUFFER_EFFICIENCY_COLOR_STOPS[index - 1];
    const current = BUFFER_EFFICIENCY_COLOR_STOPS[index];
    if (cost <= current.value) {
      return mixHexColor(previous.color, current.color, (cost - previous.value) / (current.value - previous.value));
    }
  }
  return BUFFER_EFFICIENCY_COLOR_STOPS.at(-1).color;
}

function getBufferArrowBackground(fromCost, toCost) {
  if (
    Number(fromCost || 0) > BUFFER_EFFICIENCY_COLOR_STOPS.at(-1).value ||
    Number(toCost || 0) > BUFFER_EFFICIENCY_COLOR_STOPS.at(-1).value
  ) {
    return 'linear-gradient(90deg, #ef4444, #f97316, #facc15, #22c55e, #38bdf8, #a855f7, #ef4444)';
  }
  const fromColor = getBufferEfficiencyColor(fromCost);
  const toColor = getBufferEfficiencyColor(toCost);
  if (fromColor === toColor) return fromColor;
  return `linear-gradient(90deg, ${fromColor} 0 50%, ${toColor} 50% 100%)`;
}

function formatTitlePurchaseRouteLabel(row) {
  const elementLabel = row?.titleEnchantElement
    ? ELEMENT_LABEL_BY_NAME[row.titleEnchantElement] || row.titleEnchantElement
    : '';
  if (row?.purchaseRoute === 'cleanTitlePlusBead') {
    return elementLabel ? `무보주 칭호 + ${elementLabel} 칭호 보주` : '무보주 칭호 + 칭호 보주';
  }
  if (row?.purchaseRoute === 'attachedBead') {
    return elementLabel ? `보주 발린 칭호 · ${elementLabel}` : '보주 발린 칭호';
  }
  return row?.purchaseRouteLabel || '';
}

export function installEnchantView(ctx) {
  const { els, state } = ctx;
  const { API_BASE, parseApiJsonResponse } = ctx.constants;
  const { bindCharacterAvatars, escapeHtml, getCharacterPortraitMarkup } = ctx.deps;

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
  state.currentEquipmentUpgrades = [];
  state.currentBlackFangRecommendations = [];
  state.upgradeExpectedDb = null;
  state.currentDamageBaseline = null;
  state.currentBufferBaseline = null;
  state.currentEnchantCharacterKey = '';
  state.currentCreatureCharacterKey = '';
  state.currentTitleCharacterKey = '';
  state.currentAuraCharacterKey = '';
  state.currentAvatarCharacterKey = '';
  state.enchantTargetCharacter = null;
  state.enchantPricedAt = '';
  state.creaturePricedAt = '';
  state.titlePricedAt = '';
  state.auraPricedAt = '';
  state.enchantLoading = false;
  state.enchantTiming = null;
  state.enchantRequestId = 0;

  function buildEnchantPortraitSlotData() {
    const equipmentBySlot = new Map(
      (state.currentEquipmentUpgrades || [])
        .filter((item) => item?.slot)
        .map((item) => [item.slot, item]),
    );
    const enchantBySlot = new Map(
      (state.currentEnchants || [])
        .filter((item) => item?.slot)
        .map((item) => [item.slot, item]),
    );

    const slotData = {};

    SLOT_ORDER.forEach((slot) => {
      if (equipmentBySlot.has(slot)) {
        const equipment = equipmentBySlot.get(slot) || {};
        const enchant = enchantBySlot.get(slot) || {};
        slotData[slot] = {
          label: slot,
          iconUrl: equipment.iconUrl || '',
          itemName: equipment.itemName || slot,
          enchantBadge: getEnchantBadge(enchant.effects || {}),
          upgradeBadge: getUpgradeBadge(equipment),
          hoverLines: [
            { text: formatEffects(enchant.effects || {}) || '없음', className: 'enchant-portrait-detail-line-effect' },
            getUpgradeDetailLine(equipment),
          ],
        };
      }
    });

    const title = state.currentTitle || {};
    const titleMainOption = formatTitleDetailMainOption(title);
    slotData.칭호 = {
      label: '칭호',
      iconUrl: title.iconUrl || '',
      itemName: title.itemName || '칭호',
      hoverLines: [
        titleMainOption ? { text: titleMainOption, className: 'enchant-portrait-detail-line-effect' } : null,
      ],
    };

    const creature = state.currentCreature || {};
    const creatureMainOption = formatCreatureDetailMainOption(creature);
    slotData.크리쳐 = {
      label: '크리쳐',
      iconUrl: creature.iconUrl || '',
      itemName: creature.itemName || '크리쳐',
      hoverLines: [
        creatureMainOption ? { text: creatureMainOption, className: 'enchant-portrait-detail-line-effect' } : null,
      ],
    };

    const aura = state.currentAura || {};
    slotData.오라 = {
      label: '오라',
      iconUrl: aura.iconUrl || '',
      itemName: aura.itemName || '오라',
      hoverLines: [
        { text: formatEffects(aura.effects || {}) || '없음', className: 'enchant-portrait-detail-line-effect' },
      ],
    };

    return slotData;
  }

  function renderEnchantPortraitSlotMarkup(layout, slotData) {
    const { slot, key, side } = layout;
    const data = slotData?.[slot];
    const isEmpty = !data?.iconUrl;
    const title = data?.itemName || slot;
    const hoverLines = [title, ...((data?.hoverLines || []).filter(Boolean))];
    if (isEmpty) {
      hoverLines.splice(1, hoverLines.length - 1, { text: '장착 정보 없음', className: 'enchant-portrait-detail-line-sub' });
    }
    const detailLines = hoverLines.slice(1).map((line) => (typeof line === 'string' ? { text: line, className: '' } : line));
    return `
      <span class="enchant-character-slot-wrap enchant-character-slot-wrap-${escapeHtml(key)} enchant-character-slot-wrap-${escapeHtml(side)}">
        <span class="enchant-character-slot${isEmpty ? ' is-empty' : ''}" tabindex="0" aria-label="${escapeHtml(title)}" data-detail-title="${escapeHtml(title)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}">
          ${data?.iconUrl
            ? `<img src="${escapeHtml(data.iconUrl)}" alt="" loading="lazy" decoding="async" />`
            : `<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>`}
          ${data?.enchantBadge
            ? `<span class="enchant-character-slot-enchant-badges"><span class="enchant-character-slot-enchant-badge">${escapeHtml(data.enchantBadge.text)}</span></span>`
            : ''}
          ${data?.upgradeBadge
            ? `<span class="enchant-character-slot-badge enchant-character-slot-badge-${escapeHtml(data.upgradeBadge.kind)}">${escapeHtml(data.upgradeBadge.text)}</span>`
            : ''}
        </span>
      </span>
    `;
  }

  function buildEnchantPortraitSlotMarkup() {
    const slotData = buildEnchantPortraitSlotData();
    return ENCHANT_PORTRAIT_SLOT_LAYOUT.map((layout) => renderEnchantPortraitSlotMarkup(layout, slotData)).join('');
  }

  function resetEnchantPortraitDetailPanel() {
    const portraitRoot = els.enchantCharacterPortrait?.querySelector('.enchant-character-portrait');
    const panel = els.enchantCharacterPortrait?.querySelector('[data-enchant-portrait-detail]');
    if (!panel) return;
    if (portraitRoot) portraitRoot.classList.remove('is-detail-active');
    const titleEl = panel.querySelector('[data-enchant-portrait-detail-title]');
    const bodyEl = panel.querySelector('[data-enchant-portrait-detail-body]');
    if (titleEl) titleEl.textContent = '장비 상세';
    if (bodyEl) bodyEl.textContent = '장비에 마우스를 올리면 상세 정보가 표시됩니다.';
  }

  function setEnchantPortraitDetailPanel(title, lines = []) {
    const portraitRoot = els.enchantCharacterPortrait?.querySelector('.enchant-character-portrait');
    const panel = els.enchantCharacterPortrait?.querySelector('[data-enchant-portrait-detail]');
    if (!panel) return;
    if (portraitRoot) portraitRoot.classList.add('is-detail-active');
    const titleEl = panel.querySelector('[data-enchant-portrait-detail-title]');
    const bodyEl = panel.querySelector('[data-enchant-portrait-detail-body]');
    if (titleEl) titleEl.textContent = title || '장비 상세';
    if (bodyEl) {
      bodyEl.innerHTML = (lines || [])
        .filter(Boolean)
        .map((line) => {
          const text = typeof line === 'string' ? line : line?.text;
          const className = typeof line === 'string' ? '' : line?.className || '';
          return `<span class="enchant-portrait-detail-line ${escapeHtml(className)}">${escapeHtml(text || '')}</span>`;
        })
        .join('') || '<span class="enchant-portrait-detail-line enchant-portrait-detail-line-sub">표시할 정보가 없습니다.</span>';
    }
  }

  function bindEnchantPortraitDetailPanel() {
    if (!els.enchantCharacterPortrait) return;
    const slots = [...els.enchantCharacterPortrait.querySelectorAll('.enchant-character-slot')];
    slots.forEach((slot) => {
      const title = String(slot.dataset.detailTitle || '').trim();
      let lines = [];
      try {
        lines = JSON.parse(slot.dataset.detailLines || '[]');
      } catch {
        lines = [];
      }
      const activate = () => setEnchantPortraitDetailPanel(title, lines);
      slot.addEventListener('mouseenter', activate);
      slot.addEventListener('focus', activate);
      slot.addEventListener('mouseleave', resetEnchantPortraitDetailPanel);
      slot.addEventListener('blur', resetEnchantPortraitDetailPanel);
    });
    resetEnchantPortraitDetailPanel();
  }

  function renderEnchantCharacterPortrait() {
    if (!els.enchantCharacterPortrait) return;
    const character = state.enchantTargetCharacter;
    if (!character?.serverId || !character?.characterId) {
      els.enchantCharacterPortrait.innerHTML = '<div class="table-empty-cell">캐릭터 검색을 해주세요.</div>';
      return;
    }
    const slotItemsMarkup = buildEnchantPortraitSlotMarkup();
    els.enchantCharacterPortrait.innerHTML = `
      <div class="supply-detail-portrait enchant-character-portrait">
        ${getCharacterPortraitMarkup(character, {
          zoom: 1,
          slotItemsHtml: slotItemsMarkup,
        })}
      </div>
    `;
    const characterName = els.enchantCharacterPortrait.querySelector('.enchant-character-portrait .character-name');
    if (characterName) {
      characterName.insertAdjacentHTML('beforeend', `
        <div class="enchant-portrait-detail-panel" data-enchant-portrait-detail>
          <div class="enchant-portrait-detail-title" data-enchant-portrait-detail-title>장비 상세</div>
          <div class="enchant-portrait-detail-body" data-enchant-portrait-detail-body>장비에 마우스를 올리면 상세 정보가 표시됩니다.</div>
        </div>
      `);
    }
    bindCharacterAvatars(els.enchantCharacterPortrait);
    bindEnchantPortraitDetailPanel();
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

  function resetCurrentEnchantCharacterState() {
    state.currentEnchants = [];
    state.currentEquipmentUpgrades = [];
    state.currentBlackFangRecommendations = [];
    state.upgradeExpectedDb = null;
    state.currentDamageBaseline = null;
    state.currentBufferBaseline = null;
    state.currentCreature = null;
    state.currentTitle = null;
    state.currentAura = null;
    state.currentAvatar = null;
    state.currentEnchantCharacterKey = '';
    state.currentCreatureCharacterKey = '';
    state.currentTitleCharacterKey = '';
    state.currentAuraCharacterKey = '';
    state.currentAvatarCharacterKey = '';
  }

  function resetEnchantRecommendationFilters() {
    if (els.enchantSlotFilter) els.enchantSlotFilter.value = 'all';
    if (els.enchantTierFilter) els.enchantTierFilter.value = 'all';
    if (els.enchantIncludeControls) {
      els.enchantIncludeControls
        .querySelectorAll('input[data-enchant-tier]')
        .forEach((input) => {
          input.checked = true;
        });
    }
  }

  function hasEnchantPriceRecommendationData() {
    return (
      state.enchantCards.length > 0
      || state.creatureUpgradeGroups.length > 0
      || state.creatureArtifactGroups.length > 0
      || state.titleUpgradeGroups.length > 0
      || state.auraUpgradeGroups.length > 0
    );
  }

  function getEnchantNowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  function beginEnchantTiming(label) {
    if (!state.isDevMode) return false;
    state.enchantTiming = {
      label,
      startedAt: getEnchantNowMs(),
      steps: [],
    };
    return true;
  }

  function recordEnchantTimingStep(name, startedAt, extra = {}) {
    if (!state.isDevMode || !state.enchantTiming || !Number.isFinite(startedAt)) return;
    state.enchantTiming.steps.push({
      name,
      ms: Math.round((getEnchantNowMs() - startedAt) * 10) / 10,
      ...extra,
    });
  }

  function flushEnchantTiming(status = 'done') {
    if (!state.isDevMode || !state.enchantTiming) return;
    const summary = {
      label: state.enchantTiming.label,
      status,
      totalMs: Math.round((getEnchantNowMs() - state.enchantTiming.startedAt) * 10) / 10,
      steps: state.enchantTiming.steps,
    };
    globalThis.__enchantTimingLast = summary;
    console.info(`[enchant-timing] ${summary.label} · ${status}`, summary);
    state.enchantTiming = null;
  }

  function renderEnchantIncludeControls(includeKeys = ENCHANT_INCLUDE_ORDER) {
    if (!els.enchantIncludeControls) return;
    const checked = new Set(
      [...els.enchantIncludeControls.querySelectorAll('input[data-enchant-tier]:checked')]
        .map((input) => input.value),
    );
    const existingKeys = new Set(
      [...els.enchantIncludeControls.querySelectorAll('input[data-enchant-tier]')]
        .map((input) => input.value),
    );
    const initialRender = els.enchantIncludeControls.childElementCount === 0;
    const includeKeySet = new Set(includeKeys);
    els.enchantIncludeControls.innerHTML = ENCHANT_INCLUDE_GROUPS
      .map((group) => {
        const options = group.items
          .map((item) => ({ item, key: `${group.title}:${item}` }))
          .filter(({ key }) => includeKeySet.has(key));
        if (!options.length) return '';
        return `
          <div class="enchant-include-group">
            <div class="enchant-include-group-title">${escapeHtml(group.title)}</div>
            <div class="enchant-include-group-options">
              ${options.map(({ item, key }) => {
                const isChecked = initialRender || !existingKeys.has(key) || checked.has(key);
                return `
                  <label class="enchant-include-option">
                    <input type="checkbox" data-enchant-tier="${escapeHtml(key)}" value="${escapeHtml(key)}" ${isChecked ? 'checked' : ''} />
                    <span>${escapeHtml(item)}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderEnchantFilters(rows) {
    const slots = [...new Set(rows.map((row) => row.slot))].sort((a, b) => {
      const indexA = SLOT_ORDER.includes(a) ? SLOT_ORDER.indexOf(a) : SLOT_ORDER.length;
      const indexB = SLOT_ORDER.includes(b) ? SLOT_ORDER.indexOf(b) : SLOT_ORDER.length;
      return indexA - indexB;
    });
    const tiers = [...new Set(rows.map((row) => row.tier))].sort((a, b) => {
      const indexA = TIER_ORDER.includes(a) ? TIER_ORDER.indexOf(a) : TIER_ORDER.length;
      const indexB = TIER_ORDER.includes(b) ? TIER_ORDER.indexOf(b) : TIER_ORDER.length;
      return indexA - indexB;
    });
    const includeTiers = [...new Set([...ENCHANT_INCLUDE_ORDER, ...rows.map(getEnchantIncludeGroup)])].sort((a, b) => {
      const indexA = ENCHANT_INCLUDE_ORDER.includes(a) ? ENCHANT_INCLUDE_ORDER.indexOf(a) : ENCHANT_INCLUDE_ORDER.length;
      const indexB = ENCHANT_INCLUDE_ORDER.includes(b) ? ENCHANT_INCLUDE_ORDER.indexOf(b) : ENCHANT_INCLUDE_ORDER.length;
      if (indexA !== indexB) return indexA - indexB;
      return String(a).localeCompare(String(b), 'ko-KR');
    });
    setOptions(els.enchantSlotFilter, slots, '전체');
    setOptions(els.enchantTierFilter, tiers, '전체');
    renderEnchantIncludeControls(includeTiers);
  }

  function getSelectedEnchantIncludeTiers() {
    if (!els.enchantIncludeControls) return null;
    const checked = [...els.enchantIncludeControls.querySelectorAll('input[data-enchant-tier]:checked')]
      .map((input) => input.value);
    return checked.length ? new Set(checked) : new Set();
  }

  function isTitleRouteAllowed(row) {
    if (row?.sourceType !== 'title') return true;
    const beadIncluded = els.enchantTitleBeadOnlyToggle?.checked !== false;
    if (beadIncluded) return row.purchaseRoute !== 'cleanTitle';
    return row.purchaseRoute === 'cleanTitle';
  }

  function renderEnchantTable() {
    const renderStartedAt = getEnchantNowMs();
    const allRows = [
      ...getCardRows(state.enchantCards),
      ...getCreatureRows(state.creatureUpgradeGroups),
      ...getCreatureArtifactRows(state.creatureArtifactGroups),
      ...getTitleRows(state.titleUpgradeGroups, state.currentTitle),
      ...getAuraRows(state.auraUpgradeGroups),
      ...getAvatarRows(state.currentAvatar),
      ...getUpgradeRows(state.currentEquipmentUpgrades, state.upgradeExpectedDb, state.currentDamageBaseline, state.currentBufferBaseline),
      ...getBlackFangRows(state.currentBlackFangRecommendations),
    ];
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
            ['creature', 'creatureArtifact', 'title', 'aura', 'avatar', 'upgrade'].includes(row.sourceType)
          )
          : row.sourceType !== 'enchant' || row.role !== 'buffer'
      ))
      .filter((row) => slotFilter === 'all' || row.slot === slotFilter)
      .filter((row) => tierFilter === 'all' || row.tier === tierFilter)
      .filter((row) => !includeTiers || includeTiers.has(getEnchantIncludeGroup(row)))
      .filter(isTitleRouteAllowed)
      .sort(sortByPriceAsc);

    renderEnchantRecommendations(rows, allRows);
    recordEnchantTimingStep('renderEnchantTable', renderStartedAt, {
      rows: rows.length,
      allRows: allRows.length,
    });
  }

  function renderEfficiencyLegend(recommendations) {
    if (!els.enchantEfficiencyLegend) return;
    if (state.currentBufferBaseline?.isBuffer) {
      const items = [
        ...BUFFER_EFFICIENCY_COLOR_STOPS.map((stop) => ({
          className: 'scale',
          label: `100점당 ${stop.label}`,
          color: stop.color,
        })),
        { className: 'rainbow', label: '100점당 3333만 초과', color: '' },
      ];
      els.enchantEfficiencyLegend.innerHTML = items
        .map((item) => `
          <span class="enchant-efficiency-legend-item enchant-efficiency-${item.className}"${item.color ? ` style="--enchant-band: ${escapeHtml(item.color)}"` : ''}>
            <span class="enchant-efficiency-dot"></span>
            ${escapeHtml(item.label)}
          </span>
        `).join('');
      return;
    }
    const items = [
      ...DAMAGE_EFFICIENCY_COLOR_STOPS.map((stop) => ({
        className: 'scale',
        label: `0.1%당 ${stop.label}`,
        color: stop.color,
      })),
      { className: 'rainbow', label: '0.1%당 1000만 초과', color: '' },
    ];
    els.enchantEfficiencyLegend.innerHTML = items
      .map((item) => `
        <span class="enchant-efficiency-legend-item enchant-efficiency-${item.className}"${item.color ? ` style="--enchant-band: ${escapeHtml(item.color)}"` : ''}>
          <span class="enchant-efficiency-dot"></span>
          ${escapeHtml(item.label)}
        </span>
      `).join('');
  }

  function renderEnchantRecommendations(rows = getCardRows(state.enchantCards), allRows = rows) {
    if (!els.enchantRecommendList) return;
    const recommendations = state.currentBufferBaseline?.isBuffer
      ? getBufferRecommendationRows(
        rows,
        state.currentEnchants,
        state.currentCreature,
        state.currentTitle,
        state.currentAura,
        state.currentBufferBaseline,
      )
      : getRepresentativeRecommendationRows(rows, state.currentEnchants, state.currentCreature, state.currentTitle, state.currentAura, state.currentDamageBaseline);
    renderEfficiencyLegend(recommendations);
    if (!recommendations.length) {
      els.enchantRecommendList.innerHTML = '<div class="table-empty-cell">현재 세팅보다 높은 후보가 없거나 가격을 찾지 못했습니다.</div>';
      return;
    }

    els.enchantRecommendList.innerHTML = recommendations.map((row, index) => {
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
      const previousRow = recommendations[index - 1] || null;
      const connector = previousRow
        ? `<span class="enchant-recommend-connector" style="background: ${escapeHtml(materialAcquisition || isMaterialAcquisition(previousRow) ? (isBufferMetric ? BUFFER_EFFICIENCY_COLOR_STOPS : DAMAGE_EFFICIENCY_COLOR_STOPS)[0].color : isBufferMetric ? getBufferArrowBackground(previousRow.buffCostPerHundredPoints, row.buffCostPerHundredPoints) : getArrowBackground(previousRow.costPerPointOnePercent, row.costPerPointOnePercent))};" aria-hidden="true"></span>`
        : '<span class="enchant-recommend-connector enchant-recommend-connector-spacer" aria-hidden="true"></span>';
      const hasUpgradeWarning = hasHigherEnchantCandidate(row, recommendations);
      const showOptionText = !['creature', 'title', 'aura', 'creatureArtifact'].includes(row.sourceType);
      const baseEffectText = row.sourceType === 'upgrade'
        ? formatUpgradeEffect(row)
        : row.sourceType === 'blackFang'
          ? formatBlackFangEffect(row)
        : row.sourceType === 'enchant'
          ? formatEnchantTransitionEffect(row)
        : row.sourceType === 'creatureArtifact'
          ? formatEnchantTransitionEffect(row)
        : showOptionText ? formatEffects(row.effects) : '';
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
      const titleElementLabel = row.sourceType === 'title' && row.titleEnchantElement
        ? ELEMENT_LABEL_BY_NAME[row.titleEnchantElement] || row.titleEnchantElement
        : '';
      const titleRouteLabel = row.sourceType === 'title'
        ? formatTitlePurchaseRouteLabel(row)
        : '';
      const displayName = row.sourceType === 'title'
        ? row.priceItem?.itemName || formatLevelOptionName(row.candidateName || row.itemName, Number(row.levelTag || 0))
        : row.sourceType === 'creature'
          ? row.priceItem?.itemName || formatLevelOptionName(row.candidateName || row.itemName, row.tier === '플래티넘')
          : row.sourceType === 'creatureArtifact'
            ? row.candidateName || row.itemName
          : row.sourceType === 'aura'
            ? row.priceItem?.itemName || row.candidateName || row.itemName
            : row.sourceType === 'avatar'
              ? `${row.itemName}${row.needCount > 1 ? ` x${row.needCount}` : ''}`
            : row.itemName;
      const acquisitionLabel = getAcquisitionLabel(row.acquisition);
      const acquisitionMarkup = getAcquisitionMarkup(row.acquisition, escapeHtml);
      const materialParts = row.sourceType === 'upgrade'
        ? getUpgradeMaterialParts(row.expectedMaterials, row.upgradeMode)
        : row.sourceType === 'blackFang'
          ? getBlackFangMaterialParts(row.materials)
          : [];
      const materialPartsLabel = row.sourceType === 'upgrade' ? '예상 재료' : '필요 재료';
      const materialPartsMarkup = materialParts.length
        ? `<span class="enchant-popover-material-label">${materialPartsLabel}</span>${materialParts
          .map((part) => `<span class="enchant-popover-material-part" title="${escapeHtml(part.label)}">${part.iconUrl ? `<img src="${escapeHtml(part.iconUrl)}" alt="${escapeHtml(part.label)}" loading="lazy" />` : ''}<span>${escapeHtml(part.amount)}</span></span>`)
          .join('')}`
        : '';
      const tooltipRows = [
        { text: displayName, className: 'enchant-popover-name' },
        { text: titleRouteLabel, className: 'enchant-popover-muted' },
        { text: showOptionText ? row.itemExplain : '', className: 'enchant-popover-muted' },
        { text: effectText, className: 'enchant-popover-effect' },
        { text: acquisitionLabel ? '재료 구매' : '', className: 'enchant-popover-label' },
        { text: acquisitionLabel, className: 'enchant-popover-material' },
        { text: acquisitionLabel ? '' : `${['upgrade', 'blackFang'].includes(row.sourceType) ? '예상 골드' : '최저가'} ${formatGold(row?.auction?.minUnitPrice)}`, className: 'enchant-popover-price' },
        { html: materialPartsMarkup, className: 'enchant-popover-material enchant-popover-material-list' },
        { text: !materialPartsMarkup && row.materialText ? `필요 재료 ${row.materialText}` : '', className: 'enchant-popover-material' },
        { text: isBufferMetric ? `교체 시 버프점수 +${Math.round(row.incrementalBuffScore).toLocaleString('ko-KR')}점` : `교체 상승 ${formatPercent(row.incrementalDamagePercent)}`, className: 'enchant-popover-gain' },
        { text: isBufferMetric ? `버프점수 ${Math.round(row.currentBufferScore).toLocaleString('ko-KR')} → ${Math.round(row.candidateBufferScore).toLocaleString('ko-KR')}` : '', className: 'enchant-popover-muted' },
        { text: acquisitionLabel ? '' : isBufferMetric ? `버프점수 100점당 ${formatGold(row.buffCostPerHundredPoints)}` : `딜 0.1%당 ${formatGold(row.costPerPointOnePercent)}`, className: 'enchant-popover-cost' },
      ].filter((item) => item.text || item.html);
      const popover = `
        <span class="enchant-recommend-popover" role="tooltip">
          ${hasUpgradeWarning ? '<span class="enchant-recommend-warning">⚠ 상위 마법부여 존재</span>' : ''}
          ${tooltipRows.map((item) => `<span class="${escapeHtml(item.className)}">${item.html || escapeHtml(item.text)}</span>`).join('')}
        </span>
      `;
      return `
        <span class="enchant-recommend-step">
          ${connector}
          <button type="button" class="enchant-recommend-item enchant-efficiency-${band}${hasUpgradeWarning ? ' enchant-has-upgrade-warning' : ''}"${bandStyle}>
            <span class="enchant-recommend-icon">${row.iconUrl ? `<img src="${escapeHtml(row.iconUrl)}" alt="" loading="lazy" />` : ''}</span>
            <span class="enchant-recommend-main">
              <span class="enchant-recommend-title">${escapeHtml(row.slot)}</span>
              <span class="enchant-recommend-sub">${escapeHtml(row.sourceType === 'title' && titleElementLabel ? `${row.tier} · ${titleElementLabel}` : row.tier)}</span>
            </span>
            <span class="enchant-recommend-metric">
              <strong>${acquisitionMarkup || escapeHtml(formatCompactGold(isBufferMetric ? row.buffCostPerHundredPoints : row.costPerPointOnePercent))}</strong>
              ${acquisitionLabel ? '' : `<span>${isBufferMetric ? '100점당' : '0.1%당'}</span>`}
            </span>
            ${popover}
          </button>
        </span>
      `;
    }).join('');
  }

  async function loadCurrentEnchants() {
    const character = getSelectedEnchantCharacter();
    if (!character?.serverId || !character?.characterId) {
      state.currentEnchants = [];
      state.currentEquipmentUpgrades = [];
      state.currentBlackFangRecommendations = [];
      state.upgradeExpectedDb = null;
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
    state.currentBlackFangRecommendations = Array.isArray(payload.blackFangRecommendations) ? payload.blackFangRecommendations : [];
    state.upgradeExpectedDb = payload.upgradeExpectedDb || null;
    state.currentDamageBaseline = payload.damageBaseline || null;
    state.currentBufferBaseline = payload.bufferBaseline || null;
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
    state.currentCreature = payload.creature || null;
    state.currentTitle = payload.title || null;
    state.currentAura = payload.aura || null;
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

  async function loadCurrentCharacterLoadout() {
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

    const query = new URLSearchParams({
      serverId: character.serverId,
      characterId: character.characterId,
    });
    const startedAt = getEnchantNowMs();
    const response = await fetch(`${API_BASE}/api/character-loadout?${query.toString()}`, { cache: 'no-store' });
    const payload = await parseApiJsonResponse(response, '캐릭터 세팅 조회에 실패했습니다.');
    state.currentEnchants = Array.isArray(payload.enchants) ? payload.enchants : [];
    state.currentEquipmentUpgrades = Array.isArray(payload.equipmentUpgrades) ? payload.equipmentUpgrades : [];
    state.currentBlackFangRecommendations = Array.isArray(payload.blackFangRecommendations) ? payload.blackFangRecommendations : [];
    state.upgradeExpectedDb = payload.upgradeExpectedDb || null;
    state.currentDamageBaseline = payload.damageBaseline || null;
    state.currentBufferBaseline = payload.bufferBaseline || null;
    state.currentCreature = payload.creature || null;
    state.currentTitle = payload.title || null;
    state.currentAura = payload.aura || null;
    state.currentAvatar = payload.avatar || null;
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

  async function loadEnchantRecommendationsAsync(requestId) {
    try {
      const tasks = [loadCurrentCharacterLoadout()];
      if (!state.enchantPriceLoaded || !hasEnchantPriceRecommendationData()) {
        tasks.push(loadEnchantCards(false, { refreshCurrentCharacter: false, skipImmediateRender: true }));
      }
      await Promise.all(tasks);
      if (requestId !== state.enchantRequestId) return;
      renderEnchantTable();
      flushEnchantTiming('complete');
    } catch (error) {
      if (requestId !== state.enchantRequestId) return;
      renderEnchantRecommendLoading(error.message || '스펙업 순서 추천을 불러오지 못했습니다.');
      flushEnchantTiming('error');
    }
  }

  async function searchEnchantCharacter() {
    const serverId = String(els.enchantServerIdInput?.value || '').trim().toLowerCase();
    const characterName = String(els.enchantCharacterNameInput?.value || '').trim();
    if (!serverId || !characterName) {
      setEnchantCharacterStatus('서버와 캐릭터명을 입력해 주세요.');
      return;
    }

    if (els.loadEnchantCharacterButton) els.loadEnchantCharacterButton.disabled = true;
    setEnchantCharacterStatus(`${characterName} 검색 중...`);
    beginEnchantTiming(`${serverId}:${characterName}`);
    try {
      const query = new URLSearchParams({ serverId, characterName });
      const searchStartedAt = getEnchantNowMs();
      const response = await fetch(`${API_BASE}/api/search?${query.toString()}`, { cache: 'no-store' });
      const payload = await parseApiJsonResponse(response, '캐릭터 검색에 실패했습니다.');
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
        jobGrowName: resolved.jobGrowName || '',
      };
      resetCurrentEnchantCharacterState();
      resetEnchantRecommendationFilters();
      renderEnchantCharacterPortrait();
      renderEnchantRecommendLoading();
      const requestId = state.enchantRequestId + 1;
      state.enchantRequestId = requestId;
      void loadCurrentCharacterPreview(requestId).catch((error) => {
        if (requestId !== state.enchantRequestId) return;
        setEnchantCharacterStatus(error.message);
      });
      void loadEnchantRecommendationsAsync(requestId);
    } catch (error) {
      setEnchantCharacterStatus(error.message);
      flushEnchantTiming('error');
    } finally {
      if (els.loadEnchantCharacterButton) els.loadEnchantCharacterButton.disabled = false;
    }
  }

  async function loadEnchantCards(forceRefresh = false, options = {}) {
    if (state.enchantLoading) return;
    const { refreshCurrentCharacter = true, skipImmediateRender = false } = options;
    state.enchantLoading = true;
    const ownsTiming = !state.enchantTiming && beginEnchantTiming(forceRefresh ? 'price-refresh' : 'price-load');
    if (forceRefresh) {
      state.currentAvatar = null;
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
      state.enchantCards = Array.isArray(payload.cards) ? payload.cards : [];
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
      const titleCount = getTitleRows(state.titleUpgradeGroups, state.currentTitle).length;
      const auraCount = getAuraRows(state.auraUpgradeGroups).length;
      const avatarCount = getAvatarRows(state.currentAvatar).length;
      const errorText = errorCount ? `, 실패 ${errorCount}개` : '';
      const refreshingText = payload.cache?.refreshing || creaturePayload.cache?.refreshing || titlePayload.cache?.refreshing || auraPayload.cache?.refreshing ? ', 백그라운드 갱신 중' : '';
      const pricedAtText = state.enchantPricedAt || state.creaturePricedAt || state.titlePricedAt || state.auraPricedAt || '캐시 준비 중';
      const devStatus = `${state.enchantCards.length}개 카드 + 크리쳐 ${creatureCount}개 + 아티팩트 ${artifactCount}개 + 칭호 ${titleCount}개 + 오라 ${auraCount}개 + 아바타 ${avatarCount}개 가격 불러오기 완료 · ${pricedAtText}${refreshingText}${errorText}`;
      setEnchantPriceStatus('시세 반영 완료', devStatus);

      if (refreshCurrentCharacter) {
        loadCurrentCharacterLoadout()
          .then(() => {
          renderEnchantTable();
        })
        .catch((error) => {
            resetCurrentEnchantCharacterState();
            setEnchantPriceStatus('일부 정보를 확인하지 못했습니다.', `${devStatus}, 현재 세팅 미반영: ${error.message}`);
            renderEnchantTable();
          });
      }
    } catch (error) {
      setEnchantPriceStatus(error.message);
      if (ownsTiming) flushEnchantTiming('error');
    } finally {
      state.enchantLoading = false;
      if (els.refreshEnchantCardsButton) els.refreshEnchantCardsButton.disabled = false;
      if (ownsTiming) flushEnchantTiming('complete');
    }
  }

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
    renderEnchantTable,
    renderEnchantRecommendations,
  });

  renderEnchantCharacterPortrait();
  renderEnchantIncludeControls();
  renderEfficiencyLegend();
}
