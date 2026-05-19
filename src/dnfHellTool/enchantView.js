const EFFECT_LABELS = {
  finalDamage: '최종뎀',
  attack: '공격력',
  attackIncrease: '공격력 증가',
  attackAmplification: '공증',
  elementAll: '모속강',
  allStat: '올스탯',
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
  '상의 아바타',
  '하의 아바타',
  '무기 아바타',
  '오라 아바타',
  '피부 아바타',
];

const TIER_ORDER = ['가성비', '준종결', '종결', '일반', '플래티넘', '아바타', '엠블렘'];
const ENCHANT_INCLUDE_GROUPS = [
  { title: '마법부여', items: ['가성비', '준종결', '종결'] },
  { title: '오라/칭호/크리쳐', items: ['일반', '플래티넘'] },
  { title: '아바타', items: ['아바타', '엠블렘'] },
  { title: '강화/증폭', items: ['강화', '증폭'] },
  { title: '흑아', items: ['흑아'] },
];
const ENCHANT_INCLUDE_ORDER = ENCHANT_INCLUDE_GROUPS.flatMap((group) => group.items.map((item) => `${group.title}:${item}`));
const EFFECT_ORDER = ['finalDamage', 'attackIncrease', 'attackAmplification', 'attack', 'elementAll', 'allStat', 'str', 'int', 'critical'];
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
  const currentEffects = row.currentEnchant?.effects || {};
  const targetEffects = row.effects || {};
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
  return {
    stat,
    statName: baseline.statName === '지능' ? '지능' : '힘',
    baseStat,
    element: Number(baseline.element || 0) || ENCHANT_DAMAGE_BASELINE.element,
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

function getTitleRows(groups, currentTitle) {
  const currentLevelTag = Number(currentTitle?.levelTag || 0);
  return (groups || []).flatMap((group) => (group.candidates || [])
    .filter((candidate) => !currentLevelTag || !candidate.levelTag || Number(candidate.levelTag) === currentLevelTag)
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

function findBetterAmplificationTarget(equipment, currentLevel, upgradeDb, baseline) {
  const amplificationRows = upgradeDb.amplification?.normalAmplification || [];
  const currentEffects = getCumulativeUpgradeEffects(equipment.slot, currentLevel, 'reinforcement', upgradeDb);
  const currentMultiplier = estimateDamageMultiplier(currentEffects, baseline);
  return amplificationRows
    .slice()
    .sort((a, b) => Number(a.level) - Number(b.level))
    .find((row) => {
      const conversionEffects = getCumulativeUpgradeEffects(equipment.slot, Number(row.level), 'amplification', upgradeDb);
      return estimateDamageMultiplier(conversionEffects, baseline) > currentMultiplier + 0.000001;
    }) || null;
}

function getUpgradeRows(currentEquipmentUpgrades = [], upgradeDb = {}, baseline = {}) {
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
        ? findBetterAmplificationTarget(equipment, currentLevel, upgradeDb, baseline)
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
  return (finalDamageMultiplier * attackIncreaseMultiplier * attackAmplificationMultiplier * elementMultiplier * attackMultiplier * statMultiplier - 1) * 100;
}

function getRepresentativeRecommendationRows(rows, currentEnchants, currentCreature, currentTitle, currentAura, baseline) {
  const currentBySlot = getCurrentEnchantBySlot(currentEnchants, baseline);
  const bySlotTier = new Map();
  rows.forEach((row) => {
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
    if (row.sourceType === 'title' && current?.itemId && current.itemId === row.itemId) return;
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

    const titleLevelKey = row.sourceType === 'title' && currentTitle?.levelTag ? row.levelTag || 0 : 0;
    const key = ['creature', 'title', 'aura'].includes(row.sourceType)
      ? `${row.sourceType}:${row.slot}:${row.tier}:${titleLevelKey}:${getEffectSignature(row.effects)}`
      : row.sourceType === 'blackFang'
        ? `${row.sourceType}:${row.slot}:${getEffectSignature(row.effects)}`
      : row.sourceType === 'upgrade'
        ? `${row.sourceType}:${row.slot}:${row.upgradeMode}:${row.targetLevel}`
      : `${row.sourceType}:${row.slot}:${getEffectSignature(row.effects)}`;
    const previous = bySlotTier.get(key);
    const shouldReplace = !previous ||
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
  if (costPerPointOnePercent > 10000000) return 'rainbow';
  return 'scale';
}

const EFFICIENCY_COLOR_STOPS = [
  { value: 700000, label: '70만', color: '#22c55e' },
  { value: 1000000, label: '100만', color: '#a3e635' },
  { value: 1500000, label: '150만', color: '#facc15' },
  { value: 2000000, label: '200만', color: '#f97316' },
  { value: 5000000, label: '500만', color: '#ef4444' },
  { value: 10000000, label: '1000만', color: '#991b1b' },
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
  if (!Number.isFinite(cost) || cost <= EFFICIENCY_COLOR_STOPS[0].value) {
    return EFFICIENCY_COLOR_STOPS[0].color;
  }
  for (let index = 1; index < EFFICIENCY_COLOR_STOPS.length; index += 1) {
    const previous = EFFICIENCY_COLOR_STOPS[index - 1];
    const current = EFFICIENCY_COLOR_STOPS[index];
    if (cost <= current.value) {
      return mixHexColor(previous.color, current.color, (cost - previous.value) / (current.value - previous.value));
    }
  }
  return EFFICIENCY_COLOR_STOPS[EFFICIENCY_COLOR_STOPS.length - 1].color;
}

function getArrowBackground(fromCost, toCost) {
  if (Number(fromCost || 0) > 10000000 || Number(toCost || 0) > 10000000) {
    return 'linear-gradient(90deg, #ef4444, #f97316, #facc15, #22c55e, #38bdf8, #a855f7, #ef4444)';
  }
  const fromColor = getEfficiencyColor(fromCost);
  const toColor = getEfficiencyColor(toCost);
  if (fromColor === toColor) return fromColor;
  return `linear-gradient(90deg, ${fromColor} 0 50%, ${toColor} 50% 100%)`;
}

export function installEnchantView(ctx) {
  const { els, state } = ctx;
  const { API_BASE, parseApiJsonResponse } = ctx.constants;
  const { escapeHtml } = ctx.deps;

  state.enchantCards = [];
  state.creatureUpgradeGroups = [];
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

  function renderEnchantIncludeControls(includeKeys = ENCHANT_INCLUDE_ORDER) {
    if (!els.enchantIncludeControls) return;
    const checked = new Set(
      [...els.enchantIncludeControls.querySelectorAll('input[data-enchant-tier]:checked')]
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
                const isChecked = initialRender || checked.has(key);
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

  function renderEnchantTable() {
    const allRows = [
      ...getCardRows(state.enchantCards),
      ...getCreatureRows(state.creatureUpgradeGroups),
      ...getTitleRows(state.titleUpgradeGroups, state.currentTitle),
      ...getAuraRows(state.auraUpgradeGroups),
      ...getAvatarRows(state.currentAvatar),
      ...getUpgradeRows(state.currentEquipmentUpgrades, state.upgradeExpectedDb, state.currentDamageBaseline),
      ...getBlackFangRows(state.currentBlackFangRecommendations),
    ];
    renderEnchantFilters(allRows);

    const slotFilter = els.enchantSlotFilter?.value || 'all';
    const tierFilter = els.enchantTierFilter?.value || 'all';
    const includeTiers = getSelectedEnchantIncludeTiers();
    const rows = allRows
      .filter((row) => slotFilter === 'all' || row.slot === slotFilter)
      .filter((row) => tierFilter === 'all' || row.tier === tierFilter)
      .filter((row) => !includeTiers || includeTiers.has(getEnchantIncludeGroup(row)))
      .sort(sortByPriceAsc);

    renderEnchantRecommendations(rows, allRows);
  }

  function renderEfficiencyLegend(recommendations) {
    if (!els.enchantEfficiencyLegend) return;
    const items = [
      ...EFFICIENCY_COLOR_STOPS.map((stop) => ({
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
    const recommendations = getRepresentativeRecommendationRows(rows, state.currentEnchants, state.currentCreature, state.currentTitle, state.currentAura, state.currentDamageBaseline);
    renderEfficiencyLegend(recommendations);
    if (!recommendations.length) {
      els.enchantRecommendList.innerHTML = '<div class="table-empty-cell">현재 세팅보다 높은 후보가 없거나 가격을 찾지 못했습니다.</div>';
      return;
    }

    els.enchantRecommendList.innerHTML = recommendations.map((row, index) => {
      const band = getEfficiencyBand(row.costPerPointOnePercent);
      const bandColor = band === 'rainbow' ? '' : getEfficiencyColor(row.costPerPointOnePercent);
      const bandStyle = bandColor ? ` style="--enchant-band: ${escapeHtml(bandColor)}"` : '';
      const previousRow = recommendations[index - 1] || null;
      const connector = previousRow
        ? `<span class="enchant-recommend-connector" style="background: ${escapeHtml(getArrowBackground(previousRow.costPerPointOnePercent, row.costPerPointOnePercent))};" aria-hidden="true"></span>`
        : '<span class="enchant-recommend-connector enchant-recommend-connector-spacer" aria-hidden="true"></span>';
      const hasUpgradeWarning = hasHigherEnchantCandidate(row, recommendations);
      const showOptionText = !['creature', 'title', 'aura'].includes(row.sourceType);
      const effectText = row.sourceType === 'upgrade'
        ? formatUpgradeEffect(row)
        : row.sourceType === 'blackFang'
          ? formatBlackFangEffect(row)
        : row.sourceType === 'enchant'
          ? formatEnchantTransitionEffect(row)
        : showOptionText ? formatEffects(row.effects) : '';
      const displayName = row.sourceType === 'title'
        ? row.priceItem?.itemName || formatLevelOptionName(row.candidateName || row.itemName, Number(row.levelTag || 0))
        : row.sourceType === 'creature'
          ? row.priceItem?.itemName || formatLevelOptionName(row.candidateName || row.itemName, row.tier === '플래티넘')
          : row.sourceType === 'aura'
            ? row.priceItem?.itemName || row.candidateName || row.itemName
            : row.sourceType === 'avatar'
              ? `${row.itemName}${row.needCount > 1 ? ` x${row.needCount}` : ''}`
            : row.itemName;
      const acquisitionLabel = getAcquisitionLabel(row.acquisition);
      const acquisitionMarkup = getAcquisitionMarkup(row.acquisition, escapeHtml);
      const upgradeMaterialParts = row.sourceType === 'upgrade' ? getUpgradeMaterialParts(row.expectedMaterials, row.upgradeMode) : [];
      const upgradeMaterialsMarkup = upgradeMaterialParts.length
        ? `<span class="enchant-popover-material-label">예상 재료</span>${upgradeMaterialParts
          .map((part) => `<span class="enchant-popover-material-part" title="${escapeHtml(part.label)}">${part.iconUrl ? `<img src="${escapeHtml(part.iconUrl)}" alt="${escapeHtml(part.label)}" loading="lazy" />` : ''}<span>${escapeHtml(part.amount)}</span></span>`)
          .join('')}`
        : '';
      const tooltipRows = [
        { text: displayName, className: 'enchant-popover-name' },
        { text: showOptionText ? row.itemExplain : '', className: 'enchant-popover-muted' },
        { text: effectText, className: 'enchant-popover-effect' },
        { text: acquisitionLabel ? '재료 구매' : '', className: 'enchant-popover-label' },
        { text: acquisitionLabel, className: 'enchant-popover-material' },
        { text: acquisitionLabel ? '' : `${['upgrade', 'blackFang'].includes(row.sourceType) ? '예상 골드' : '최저가'} ${formatGold(row?.auction?.minUnitPrice)}`, className: 'enchant-popover-price' },
        { html: upgradeMaterialsMarkup, className: 'enchant-popover-material enchant-popover-material-list' },
        { text: row.materialText ? `필요 재료 ${row.materialText}` : '', className: 'enchant-popover-material' },
        { text: `교체 상승 ${formatPercent(row.incrementalDamagePercent)}`, className: 'enchant-popover-gain' },
        { text: acquisitionLabel ? '' : `0.1%당 ${formatGold(row.costPerPointOnePercent)}`, className: 'enchant-popover-cost' },
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
              <span class="enchant-recommend-sub">${escapeHtml(row.tier)}</span>
            </span>
            <span class="enchant-recommend-metric">
              <strong>${acquisitionMarkup || escapeHtml(formatCompactGold(row.costPerPointOnePercent))}</strong>
              ${acquisitionLabel ? '' : '<span>0.1%당</span>'}
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
    state.currentEnchantCharacterKey = characterKey;
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

  async function searchEnchantCharacter() {
    const serverId = String(els.enchantServerIdInput?.value || '').trim().toLowerCase();
    const characterName = String(els.enchantCharacterNameInput?.value || '').trim();
    if (!serverId || !characterName) {
      setEnchantCharacterStatus('서버와 캐릭터명을 입력해 주세요.');
      return;
    }

    if (els.loadEnchantCharacterButton) els.loadEnchantCharacterButton.disabled = true;
    setEnchantCharacterStatus(`${characterName} 검색 중...`);
    try {
      const query = new URLSearchParams({ serverId, characterName });
      const response = await fetch(`${API_BASE}/api/search?${query.toString()}`, { cache: 'no-store' });
      const payload = await parseApiJsonResponse(response, '캐릭터 검색에 실패했습니다.');
      const resolved = payload.resolved || {};
      if (!resolved.characterId) {
        throw new Error('캐릭터를 찾지 못했습니다.');
      }
      state.enchantTargetCharacter = {
        key: `${resolved.serverId || serverId}:${resolved.characterId}`,
        serverId: resolved.serverId || serverId,
        characterId: resolved.characterId,
        name: resolved.characterName || characterName,
      };
      state.currentEnchantCharacterKey = '';
      state.currentCreatureCharacterKey = '';
      state.currentTitleCharacterKey = '';
      state.currentAuraCharacterKey = '';
      state.currentAvatarCharacterKey = '';
      await Promise.all([loadCurrentEnchants(), loadCurrentCreature(), loadCurrentTitle(), loadCurrentAura(), loadCurrentAvatar()]);
      if (!state.enchantPriceLoaded) {
        await loadEnchantCards(false);
      } else {
        renderEnchantTable();
      }
    } catch (error) {
      setEnchantCharacterStatus(error.message);
    } finally {
      if (els.loadEnchantCharacterButton) els.loadEnchantCharacterButton.disabled = false;
    }
  }

  async function loadEnchantCards(forceRefresh = false) {
    if (!els.enchantStatus || state.enchantLoading) return;
    state.enchantLoading = true;
    if (forceRefresh) {
      state.currentAvatar = null;
      state.currentAvatarCharacterKey = '';
    }
    els.refreshEnchantCardsButton.disabled = true;
    setEnchantPriceStatus('시세 확인 중...', '경매장 가격을 가져오는 중...');
    try {
      const query = forceRefresh ? '?refresh=1' : '';
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
      state.titleUpgradeGroups = Array.isArray(titlePayload.groups) ? titlePayload.groups : [];
      state.auraUpgradeGroups = Array.isArray(auraPayload.groups) ? auraPayload.groups : [];
      state.enchantPriceLoaded = true;
      state.enchantPricedAt = payload.pricedAt || '';
      state.creaturePricedAt = creaturePayload.pricedAt || '';
      state.titlePricedAt = titlePayload.pricedAt || '';
      state.auraPricedAt = auraPayload.pricedAt || '';
      renderEnchantTable();
      const errorCount = Number(payload.errors?.length || 0) + Number(creaturePayload.errors?.length || 0) + Number(titlePayload.errors?.length || 0) + Number(auraPayload.errors?.length || 0);
      const creatureCount = getCreatureRows(state.creatureUpgradeGroups).length;
      const titleCount = getTitleRows(state.titleUpgradeGroups, state.currentTitle).length;
      const auraCount = getAuraRows(state.auraUpgradeGroups).length;
      const avatarCount = getAvatarRows(state.currentAvatar).length;
      const errorText = errorCount ? `, 실패 ${errorCount}개` : '';
      const refreshingText = payload.cache?.refreshing || creaturePayload.cache?.refreshing || titlePayload.cache?.refreshing || auraPayload.cache?.refreshing ? ', 백그라운드 갱신 중' : '';
      const pricedAtText = state.enchantPricedAt || state.creaturePricedAt || state.titlePricedAt || state.auraPricedAt || '캐시 준비 중';
      const devStatus = `${state.enchantCards.length}개 카드 + 크리쳐 ${creatureCount}개 + 칭호 ${titleCount}개 + 오라 ${auraCount}개 + 아바타 ${avatarCount}개 가격 불러오기 완료 · ${pricedAtText}${refreshingText}${errorText}`;
      setEnchantPriceStatus('시세 반영 완료', devStatus);

      Promise.all([loadCurrentEnchants(), loadCurrentCreature(), loadCurrentTitle(), loadCurrentAura(), loadCurrentAvatar()])
        .then(() => {
          renderEnchantTable();
        })
        .catch((error) => {
          state.currentEnchants = [];
          state.currentEquipmentUpgrades = [];
          state.currentBlackFangRecommendations = [];
          state.upgradeExpectedDb = null;
          state.currentCreature = null;
          state.currentTitle = null;
          state.currentAura = null;
          state.currentAvatar = null;
          state.currentDamageBaseline = null;
          state.currentEnchantCharacterKey = '';
          state.currentCreatureCharacterKey = '';
          state.currentTitleCharacterKey = '';
          state.currentAuraCharacterKey = '';
          state.currentAvatarCharacterKey = '';
          setEnchantPriceStatus('일부 정보를 확인하지 못했습니다.', `${devStatus}, 현재 세팅 미반영: ${error.message}`);
          renderEnchantTable();
        });
    } catch (error) {
      setEnchantPriceStatus(error.message);
    } finally {
      state.enchantLoading = false;
      els.refreshEnchantCardsButton.disabled = false;
    }
  }

  Object.assign(ctx.actions, {
    loadEnchantCards,
    loadCurrentEnchants,
    loadCurrentCreature,
    loadCurrentTitle,
    loadCurrentAura,
    loadCurrentAvatar,
    searchEnchantCharacter,
    renderEnchantTable,
    renderEnchantRecommendations,
  });

  renderEnchantIncludeControls();
  renderEfficiencyLegend();
}
