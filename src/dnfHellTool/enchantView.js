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
  critical: '크리',
};
const BUFFER_SCORE_ICON_URL = new URL('../../이미지/bufferScore.png', import.meta.url).href;
const EQUIPMENT_SCORE_ICON_URL = new URL('../../이미지/equipmentScore.png', import.meta.url).href;
const CHARACTER_FAME_ICON_URL = new URL('../../이미지/fame.png', import.meta.url).href;
const OATH_BOARD_BG_URL = new URL('../../이미지/oathbg.png', import.meta.url).href;
const AVATAR_LOADOUT_BG_URL = new URL('../../이미지/bg3.jpg', import.meta.url).href;
const OATH_SYMBOL_ASSETS = import.meta.glob('../../이미지/Oath/*/*.{png,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
});
const SWITCHING_SKILL_ICON_ASSETS = import.meta.glob('../../이미지/스킬/*/*/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});
const OATH_SYMBOL_SET_FOLDERS = {
  basic: '00basic',
  shadow: '01shadow',
  fairy: '02fairy',
  gold: '03gold',
  dragon: '04dragon',
  purify: '05purify',
  serendipity: '06serendipity',
  limitless: '07limitless',
  nature: '08nature',
  valkyrie: '09valkyrie',
  fox: '10etherial',
  wolf: '11wolf',
  realm: '12realm',
};
const OATH_SYMBOL_FILES_BY_RARITY = {
  rare: 'rare.png',
  unique: 'unique.png',
  legendary: 'legendary.png',
  epic: 'epic.png',
  primeval: 'primeval.webp',
};
const OATH_SYMBOL_SET_KEYWORDS = [
  ['안개', 'basic'],
  ['그림자', 'shadow'],
  ['페어리', 'fairy'],
  ['황금', 'gold'],
  ['용투', 'dragon'],
  ['정화', 'purify'],
  ['행운', 'serendipity'],
  ['한계', 'limitless'],
  ['자연', 'nature'],
  ['발키리', 'valkyrie'],
  ['여우', 'fox'],
  ['무리', 'wolf'],
  ['마력', 'realm'],
];
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

const TIER_ORDER = ['가성비', '준종결', '종결', '일반', '플래티넘', '아바타', '엠블렘', '조율'];
const ENCHANT_INCLUDE_GROUPS = [
  { title: '마법부여', items: ['가성비', '준종결', '종결'] },
  { title: '오라/칭호/크리쳐', items: ['일반', '플래티넘', '오라', '칭호', '크리쳐', '아티팩트'], splitAfter: '플래티넘', breakBefore: true },
  { title: '버프강화', items: ['칭호', '크리쳐', '짙편린', '아바타'], breakBefore: true },
  { title: '아바타', items: ['엠블렘', '플래티넘 엠블렘'] },
  { title: '강화/증폭', items: ['강화', '증폭'] },
  { title: '장비', items: ['조율'] },
  { title: '서약', items: ['조율', '초월', '정가'] },
  { title: '흑아', items: ['흑아'] },
];
const ENCHANT_INCLUDE_ORDER = ENCHANT_INCLUDE_GROUPS.flatMap((group) => group.items.map((item) => `${group.title}:${item}`));
const DEFAULT_DISABLED_ENCHANT_INCLUDE_GROUPS = new Set(['서약:초월', '서약:정가']);
const EFFECT_ORDER = ['finalDamage', 'skillDamageMultiplier', 'attackIncrease', 'attackAmplification', 'buffPower', 'buffAmplification', 'attack', 'elementAll', 'elementFire', 'elementWater', 'elementLight', 'elementDark', 'allStat', 'bufferStat', 'str', 'int'];
const BUFFER_IRRELEVANT_EFFECT_KEYS = new Set(['finalDamage', 'skillDamageMultiplier', 'attackIncrease', 'attackAmplification', 'attack', 'elementAll', 'elementFire', 'elementWater', 'elementLight', 'elementDark', 'critical']);
const DAMAGE_IRRELEVANT_EFFECT_KEYS = new Set(['buffPower', 'buffAmplification', 'bufferStat']);
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
const OATH_LOADOUT_SIDE_SLOT_COUNT = 4;
const OATH_LOADOUT_BOTTOM_SLOT_COUNT = 3;
const OATH_SLOT_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const AVATAR_LOADOUT_SLOT_ROWS = [
  [
    { key: 'avatarWeapon', label: '무기 아바타' },
    { key: 'hair', label: '머리' },
    { key: 'hat', label: '모자' },
    { key: 'face', label: '얼굴' },
  ],
  [
    { key: 'aura', label: '오라' },
    { key: 'neck', label: '목가슴' },
    { key: 'top', label: '상의' },
    { key: 'skin', label: '피부' },
  ],
  [
    null,
    { key: 'waist', label: '허리' },
    { key: 'bottom', label: '하의' },
    { key: 'shoes', label: '신발' },
  ],
];
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
const AVATAR_FIXED_EMBLEM_COLOR_BY_SLOT_KEY = {
  hair: 'red',
  hat: 'red',
  face: 'yellow',
  neck: 'yellow',
  top: 'green',
  bottom: 'green',
  waist: 'blue',
  shoes: 'blue',
};
const AVATAR_PLATINUM_SLOT_LABEL_BY_KEY = {
  top: '상의 아바타',
  bottom: '하의 아바타',
};
const BUFF_LOADOUT_EQUIPMENT_SLOT_ROWS = [
  ['상의', '하의', '무기', '칭호'],
  ['머리어깨', '허리', '팔찌', '목걸이'],
  ['신발', null, '반지', '보조장비'],
  [null, null, '귀걸이', '마법석'],
];
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
const MIN_RECOMMENDED_AMPLIFICATION_LEVEL = 10;
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
  if (!includeMaterialCosts || !['upgrade', 'blackFang', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft'].includes(row?.sourceType)) return baseGold;
  const materialGold = ['upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft'].includes(row.sourceType)
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
    .filter(([key]) => !(Number.isFinite(effects.allStat) && ['str', 'int'].includes(key)))
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

function formatItemBuffLevelRanges(itemBuff = {}) {
  return (itemBuff?.reinforceSkill || []).flatMap((job) => (job?.levelRange || [])
    .filter((range) => Number(range?.value || 0) > 0)
    .map((range) => {
      const minimum = Number(range.minLevel || 0);
      const maximum = Number(range.maxLevel || 0);
      const levelText = minimum === maximum ? `${minimum}Lv` : `${minimum}~${maximum}Lv`;
      return `${levelText} 모든 스킬 Lv +${formatEffectNumber(Number(range.value))}`;
    }))
    .join(' / ');
}

function formatTitleMajorEffects(effects = {}, isBuffer = false, hasSingleElement = false) {
  const keys = isBuffer
    ? ['buffAmplification', 'allStat']
    : ['attackAmplification', 'elementAll', 'allStat'];
  return keys
    .filter((key) => Number.isFinite(effects?.[key]))
    .map((key) => (
      key === 'elementAll' && hasSingleElement
        ? `속강 +${formatEffectNumber(effects[key])}`
        : formatEffectValue(key, effects[key])
    ))
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

function formatTuneState(equipment = {}) {
  const level = Number(equipment.tuneLevel || 0);
  const setPoint = Number(equipment.tuneSetPoint || 0);
  if (!Number.isFinite(setPoint) || setPoint <= 0) return '';
  return `조율 ${Number.isFinite(level) ? level : 0}회`;
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

function getEquipmentTuneBadge(equipment = {}) {
  const level = Number(equipment.tuneLevel || 0);
  if (!Number.isFinite(level) || level <= 0) return null;
  const displayLevel = Math.max(1, Math.min(3, Math.floor(level)));
  return {
    level,
    displayLevel,
    label: `조율 ${level}회`,
  };
}

function getEnchantBadge(effects = {}, reinforceSkill = [], bufferBaseline = null) {
  if (bufferBaseline?.isBuffer) {
    const parts = [];
    const allStat = Number(effects.allStat || 0);
    const skillLevels = getReinforceSkillLevel(reinforceSkill, bufferBaseline.jobName || '');
    if (Number.isFinite(allStat) && allStat > 0) parts.push(formatEffectNumber(allStat));
    if (Number.isFinite(skillLevels) && skillLevels > 0) parts.push(`${formatEffectNumber(skillLevels)}Lv`);
    return parts.length ? { text: parts.join('/') } : null;
  }
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

function getRoleEquipmentBadge(effects = {}, isBuffer = false) {
  const parts = isBuffer
    ? [
      Number.isFinite(effects.buffAmplification) && Number(effects.buffAmplification) > 0
        ? `${formatEffectNumber(Number(effects.buffAmplification))}%`
        : '',
      Number.isFinite(effects.allStat) && Number(effects.allStat) > 0
        ? formatEffectNumber(Number(effects.allStat))
        : '',
    ]
    : [
      Number.isFinite(effects.attackAmplification) && Number(effects.attackAmplification) > 0
        ? `${formatEffectNumber(Number(effects.attackAmplification))}%`
        : '',
      Number.isFinite(effects.elementAll) && Number(effects.elementAll) > 0
        ? formatEffectNumber(Number(effects.elementAll))
        : '',
    ];
  const text = parts.filter(Boolean).join('/');
  return text ? { text } : null;
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
    .filter((key) => !(Number.isFinite(changedEffects.allStat) && ['str', 'int'].includes(key)));
  const parts = changedKeys
    .map((key) => formatEffectTransitionValue(key, Number(currentEffects[key] || 0), Number(targetEffects[key] || 0)));
  return parts.length ? parts.join(' / ') : formatEffects(changedEffects);
}

function getDealerPrimaryStatKey(baseline = {}) {
  if (baseline?.statName === '힘') return 'str';
  if (baseline?.statName === '지능') return 'int';
  return '';
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
    .filter((key) => !(Number.isFinite(currentEffects.allStat) && ['str', 'int'].includes(key)))
    .filter((key) => !(Number.isFinite(targetEffects.allStat) && ['str', 'int'].includes(key)));
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
    .filter((key) => !(Number.isFinite(currentEffects.allStat) && ['str', 'int'].includes(key)))
    .filter((key) => !(Number.isFinite(targetEffects.allStat) && ['str', 'int'].includes(key)));
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

function formatOathTranscendEffect(row, isBuffer = false) {
  const optionText = formatBlackFangEffect(row, isBuffer);
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

function formatOathStageRomanSuffix(stageName) {
  const name = String(stageName || '').trim();
  if (!name || name.startsWith('태초')) return '';
  const match = name.match(/(?:레어|유니크|레전더리|에픽)\s*([IV]+|[ⅠⅡⅢⅣⅤ]+)/i);
  const value = match?.[1] || '';
  const romanByGlyph = {
    'Ⅰ': 'I',
    'Ⅱ': 'II',
    'Ⅲ': 'III',
    'Ⅳ': 'IV',
    'Ⅴ': 'V',
  };
  return romanByGlyph[value] || value.toUpperCase();
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

function formatOathTranscendEffectHtml(row, isBuffer, escapeHtml) {
  const hasSetPoint = Number.isFinite(row.currentSetPoint) && Number.isFinite(row.targetSetPoint) && row.currentSetPoint !== row.targetSetPoint;
  if (!hasSetPoint || (!row.currentOathStageName && !row.targetOathStageName)) return '';
  const escape = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
  const optionText = formatBlackFangEffect(row, isBuffer);
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
  if (row.sourceType === 'oathTranscend') return ['서약:초월'];
  if (row.sourceType === 'oathCraft') return ['서약:정가'];
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

function formatReinforceSkills(reinforceSkill = [], jobName = '') {
  return (reinforceSkill || []).flatMap((job) => {
    if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return [];
    return (job?.skills || [])
      .filter((skill) => skill?.name && Number(skill?.value || 0) > 0)
      .map((skill) => `${skill.name} Lv +${formatEffectNumber(Number(skill.value))}`);
  }).join(' / ');
}

function formatMatchedReinforceSkills(skills = []) {
  return (skills || [])
    .filter((skill) => skill?.name && Number(skill?.value || 0) > 0)
    .map((skill) => `${skill.name} Lv +${formatEffectNumber(Number(skill.value))}`)
    .join(' / ');
}

function getBufferEnchantSkillDelta(row, current, baseline) {
  const jobName = baseline?.jobName || '';
  const candidateSkills = row?.reinforceSkill || [];
  const currentSkills = current?.reinforceSkill || [];
  const hasSkillValue = (info, fields) => fields.some((field) => Number(info?.[field] || 0) !== 0);
  return Object.entries(baseline.currentSelfStatSkills || {}).reduce((changes, [skillName, info]) => {
    const levelDelta = getReinforceSkillLevel(candidateSkills, jobName, [skillName])
      - getReinforceSkillLevel(currentSkills, jobName, [skillName]);
    changes.selfStatSkillDelta += getSkillValueDelta(info, 'Stat', levelDelta);
    changes.auraStatDelta += getSkillValueDelta(info, 'PartyStat', levelDelta);
    changes.auraAttackDelta += getSkillValueDelta(info, 'PartyAttack', levelDelta);
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

function getSkillValueDelta(info, field, levelDelta) {
  if (!levelDelta) return 0;
  const current = Number(info?.[`current${field}`] || 0);
  if (levelDelta > 0) return (Number(info?.[`next${field}`] || current) - current) * levelDelta;
  return (current - Number(info?.[`previous${field}`] || current)) * levelDelta;
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
    changes.statDelta += getSkillValueDelta(info, 'Stat', levelDelta);
    changes.auraStatDelta += getSkillValueDelta(info, 'PartyStat', levelDelta);
    changes.auraAttackDelta += getSkillValueDelta(info, 'PartyAttack', levelDelta);
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

function getBufferRecommendationRows(
  rows,
  currentEnchants,
  currentCreature,
  currentTitle,
  currentAura,
  baseline,
  includeMaterialCosts = false,
) {
  if (!baseline?.isBuffer) return [];
  const currentBySlot = new Map((currentEnchants || []).map((enchant) => [enchant.slot, enchant]));
  const currentArtifactBySlot = getCurrentCreatureArtifactBySlot(currentCreature);
  const currentScore = calculateBufferScore(baseline);
  const bySlotTier = new Map();
  (rows || []).forEach((row) => {
    if (row.sourceType === 'enchant' && row.role !== 'buffer') return;
    if (!['enchant', 'creature', 'creatureArtifact', 'title', 'switchingTitle', 'switchingCreature', 'aura', 'avatar', 'upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'blackFang'].includes(row.sourceType)) return;
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
    const candidateScore = calculateBufferScore(baseline, {
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
    });
    const incrementalBuffScore = candidateScore - currentScore;
    const incrementalBuffPercent = currentScore > 0 ? (candidateScore / currentScore - 1) * 100 : 0;
    if (incrementalBuffScore <= 0.0001) return;
    const price = getRecommendationGold(row, includeMaterialCosts);
    const buffCostPerHundredPoints = Number.isFinite(price) && price > 0
      ? price * 100 / incrementalBuffScore
      : 0;
    const key = row.sourceType === 'enchant'
      ? [
        row.sourceType,
        row.slot,
        getEffectSignature(scoringCurrentEffects),
        getEffectSignature(scoringTargetEffects),
        getRoundedMetricKey(incrementalBuffScore),
        getStableObjectSignature(skillDelta),
        getStableObjectSignature(itemSkillChanges),
      ].join(':')
      : ['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)
      ? `${row.sourceType}:${row.slot}:${row.upgradeMode}:${row.targetLevel}`
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
        currentBufferScore: currentScore,
        candidateBufferScore: candidateScore,
        incrementalBuffScore,
        incrementalBuffPercent,
        buffCostPerHundredPoints,
        bufferSkillDelta: skillDelta,
        bufferStatDelta: statDelta,
        bufferBuffPowerDelta: buffPowerDelta,
        bufferBuffAmplificationDelta: buffAmplificationDelta,
        incrementalDamagePercent: incrementalBuffPercent,
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
  return [...nonUpgradeRows, ...bestUpgradeBySlot.values()].sort((a, b) => {
    const priorityDiff = Number(a.recommendationPriority || 0) - Number(b.recommendationPriority || 0);
    if (priorityDiff) return priorityDiff;
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
    itemName: candidate.priceItem?.itemName || candidate.itemName || candidate.name,
    creatureItemName: candidate.itemName || candidate.name,
    itemRarity: candidate.itemRarity || '레어',
    fame: candidate.targetFame || group.targetFame,
    iconUrl: candidate.priceItem?.iconUrl || candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    creatureIconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    itemReinforceSkill: candidate.itemReinforceSkill || [],
    itemBuff: candidate.itemBuff || {},
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.name,
    groupName: group.groupName,
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 1),
    skillDamagePercent: Number(candidate.skillDamagePercent || 0),
    levelTag: candidate.levelTag,
    reinforceSkillName: candidate.reinforceSkillName || '',
    reinforceSkillLevel: Number(candidate.reinforceSkillLevel || 0),
    priceItem: candidate.priceItem || null,
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

function getSwitchingTitleRows(recommendations = []) {
  return (recommendations || []).map((candidate) => ({
    sourceType: 'switchingTitle',
    slot: candidate.slot === '버프강화 칭호' ? '벞강 칭호' : candidate.slot || '벞강 칭호',
    tier: candidate.tier === '스위칭' ? '버프강화' : candidate.tier || '버프강화',
    kind: candidate.kind || 'switchingTitle',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '레어',
    fame: candidate.fame,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    itemReinforceSkill: candidate.itemReinforceSkill || [],
    itemBuff: candidate.itemBuff || {},
    enchantEffects: candidate.enchantEffects || {},
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 1),
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.itemName,
    buffSkillName: candidate.buffSkillName || '',
    enchantBuffSkillLevelDelta: Number(candidate.enchantBuffSkillLevelDelta || 0),
    switchingStatDelta: Number(candidate.switchingStatDelta || 0),
    switchingBuffAmplificationDelta: Number(candidate.switchingBuffAmplificationDelta || 0),
    bufferBuffSkillLevelDelta: Number(candidate.bufferBuffSkillLevelDelta || 0),
    auraStatDelta: Number(candidate.auraStatDelta || 0),
    auraAttackDelta: Number(candidate.auraAttackDelta || 0),
    currentTitleContribution: Number(candidate.currentTitleContribution || 0),
    candidateTitleContribution: Number(candidate.candidateTitleContribution || 0),
    purchaseRoute: candidate.purchaseRoute || '',
    purchaseRouteLabel: candidate.purchaseRouteLabel || '',
    recommendationPriority: Number(candidate.recommendationPriority || 0),
  }));
}

function getSwitchingFragmentRows(recommendations = []) {
  return (recommendations || []).map((candidate) => ({
    sourceType: 'switchingFragment',
    slot: candidate.slot || '짙편린',
    tier: candidate.tier || '버프강화',
    kind: candidate.kind || 'switchingFragment',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '유니크',
    fame: candidate.fame,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 1),
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.itemName,
    switchingSlot: candidate.switchingSlot || '',
    purchaseRouteLabel: candidate.purchaseRouteLabel || '',
  }));
}

function getSwitchingCreatureRows(recommendations = []) {
  return (recommendations || []).map((candidate) => ({
    sourceType: 'switchingCreature',
    slot: candidate.slot || '벞강 크리쳐',
    tier: candidate.tier || '버프강화',
    kind: candidate.kind || 'switchingCreature',
    itemId: candidate.itemId,
    itemName: candidate.itemName,
    itemRarity: candidate.itemRarity || '레어',
    fame: candidate.fame,
    iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
    effects: candidate.effects || {},
    skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 1),
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    candidateName: candidate.itemName,
    buffSkillName: candidate.buffSkillName || '',
    switchingStatDelta: Number(candidate.switchingStatDelta || 0),
    switchingBuffAmplificationDelta: Number(candidate.switchingBuffAmplificationDelta || 0),
    bufferBuffSkillLevelDelta: Number(candidate.bufferBuffSkillLevelDelta || 0),
    currentCreatureContribution: Number(candidate.currentCreatureContribution || 0),
    candidateCreatureContribution: Number(candidate.candidateCreatureContribution || 0),
    purchaseRoute: candidate.purchaseRoute || '',
    purchaseRouteLabel: candidate.purchaseRouteLabel || '',
    targetCreatureName: candidate.targetCreatureName || '',
    freeAction: Boolean(candidate.freeAction),
    recommendationPriority: Number(candidate.recommendationPriority || 0),
  }));
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
    itemExplain: candidate.itemExplain || '',
    auction: candidate.auction || {},
    acquisition: candidate.acquisition || null,
    needCount: candidate.needCount || 0,
    unitPrice: candidate.unitPrice,
    targetSkill: candidate.targetSkill || '',
    bufferStatScope: candidate.bufferStatScope || '',
    bufferBuffSkillLevelDelta: Number(candidate.bufferBuffSkillLevelDelta || 0),
    bufferAwakeningSkillLevelDelta: Number(candidate.bufferAwakeningSkillLevelDelta || 0),
    bufferSkillStatDeltas: candidate.bufferSkillStatDeltas || {},
    bufferSkillLevels: candidate.bufferSkillLevels || {},
    currentPlatinumSkill: candidate.currentPlatinumSkill || '',
    priceWarningText: candidate.priceWarningText || '',
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

function isIndependentAttackBaseline(baseline = {}) {
  return String(baseline?.attackSource || '').trim() === 'independent';
}

function getWeaponRefineIndependentAttack(upgradeDb = {}, refineLevel = 0) {
  const rows = upgradeDb.reinforcement?.weaponRefineIndependentAttackByLevel115 || [];
  const level = Math.max(0, Math.min(8, Math.floor(Number(refineLevel || 0))));
  const row = rows.find((item) => Number(item.level) === level);
  return Number(row?.independentAttack || 0);
}

function getWeaponEnhanceIndependentAttack(upgradeDb = {}, level = 0) {
  return Number(getCumulativeUpgradeEffects('무기', level, 'reinforcement', upgradeDb).attack || 0);
}

function shouldApplyWeaponRefineIndependentAttack(equipment = {}, baseline = {}, isBuffer = false) {
  return !isBuffer
    && equipment?.slot === '무기'
    && isIndependentAttackBaseline(baseline)
    && Number(equipment?.refine || 0) > 0;
}

function shouldCompareIndependentWeaponAmplification(equipment = {}, baseline = {}, isBuffer = false) {
  return shouldApplyWeaponRefineIndependentAttack(equipment, baseline, isBuffer)
    && !equipment?.isAmplified
    && Number(equipment?.reinforce || 0) < 12;
}

function getCumulativeUpgradeEffectsForEquipment(
  equipment = {},
  level = 0,
  mode = 'reinforcement',
  upgradeDb = {},
  baseline = {},
  isBuffer = false,
) {
  const effects = getCumulativeUpgradeEffects(equipment.slot, level, mode, upgradeDb);
  if (!shouldApplyWeaponRefineIndependentAttack(equipment, baseline, isBuffer)) return effects;
  if (!['reinforcement', 'amplification'].includes(mode)) return effects;

  const refineAttack = getWeaponRefineIndependentAttack(upgradeDb, equipment.refine);
  const enhanceAttack = getWeaponEnhanceIndependentAttack(upgradeDb, level);
  const effectiveAttack = Math.max(enhanceAttack, refineAttack);
  const adjusted = { ...effects };
  if (effectiveAttack > 0) {
    adjusted.attack = effectiveAttack;
  } else {
    delete adjusted.attack;
  }
  return adjusted;
}

function getUpgradeEffectsForEquipment(
  equipment = {},
  currentLevel = 0,
  targetLevel = 0,
  mode = 'reinforcement',
  upgradeDb = {},
  baseline = {},
  isBuffer = false,
) {
  return subtractEffects(
    getCumulativeUpgradeEffectsForEquipment(equipment, targetLevel, mode, upgradeDb, baseline, isBuffer),
    getCumulativeUpgradeEffectsForEquipment(equipment, currentLevel, mode, upgradeDb, baseline, isBuffer),
  );
}

function getUpgradeRowEfficiency(row = {}) {
  const damage = Number(row.incrementalDamagePercent || 0);
  const price = Number(row.expectedGold || row.auction?.minUnitPrice || 0);
  if (!Number.isFinite(damage) || damage <= 0) return Number.POSITIVE_INFINITY;
  if (!Number.isFinite(price) || price <= 0) return Number.POSITIVE_INFINITY;
  return price / damage;
}

function chooseBestUpgradeChoice(rows = [], baseline = {}) {
  return rows
    .filter(Boolean)
    .map((row) => {
      const incrementalDamagePercent = estimateDamagePercent(row.effects || {}, baseline);
      return { ...row, incrementalDamagePercent };
    })
    .filter((row) => Number(row.incrementalDamagePercent || 0) > 0.0001)
    .sort((a, b) => {
      const efficiencyDelta = getUpgradeRowEfficiency(a) - getUpgradeRowEfficiency(b);
      if (Math.abs(efficiencyDelta) > 0.000001) return efficiencyDelta;
      return Number(b.incrementalDamagePercent || 0) - Number(a.incrementalDamagePercent || 0);
    })[0] || null;
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
) {
  const base = getDamageBaseline(baseBaseline);
  const effectDelta = subtractEffects(
    addEffects(
      addEffects(
        addEffects(getEnchantEffectsTotal(simulatedEnchants), simulatedAura?.effects || {}),
        simulatedCreature?.effects || {},
      ),
      addEffects(
        getTitleEffectsWithoutEnchantElement(simulatedTitle),
        addEffects(
          getEquipmentBodyEffectsTotal(simulatedEquipment),
          getOathCrystalEffectsTotal(simulatedOath),
        ),
      ),
    ),
    addEffects(
      addEffects(
        addEffects(getEnchantEffectsTotal(baseEnchants), baseAura?.effects || {}),
        baseCreature?.effects || {},
      ),
      addEffects(
        getTitleEffectsWithoutEnchantElement(baseTitle),
        addEffects(
          getEquipmentBodyEffectsTotal(baseEquipment),
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
    ...(baseBaseline || {}),
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

function getSimulatorCumulativeDamageMultiplier(simulator = {}) {
  if (!simulator?.baseDamageBaseline) return 1;
  const effectDelta = subtractEffects(
    addEffects(
      addEffects(
        addEffects(getEnchantEffectsTotal(simulator.simulatedEnchants), simulator.simulatedAura?.effects || {}),
        simulator.simulatedCreature?.effects || {},
      ),
      addEffects(
        getEquipmentBodyEffectsTotal(simulator.simulatedEquipmentUpgrades),
        getOathCrystalEffectsTotal(simulator.simulatedOathUpgrades),
      ),
    ),
    addEffects(
      addEffects(
        addEffects(getEnchantEffectsTotal(simulator.baseEnchants), simulator.baseAura?.effects || {}),
        simulator.baseCreature?.effects || {},
      ),
      addEffects(
        getEquipmentBodyEffectsTotal(simulator.baseEquipmentUpgrades),
        getOathCrystalEffectsTotal(simulator.baseOathUpgrades),
      ),
    ),
  );
  delete effectDelta.finalDamage;
  const delta = normalizeSimulatorDamageDelta(
    effectDelta,
    simulator.baseDamageBaseline,
  );
  const nonTitleMultiplier = estimateDamageMultiplier(delta, simulator.baseDamageBaseline)
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
    * getEquipmentBodyFinalDamageChangeMultiplier(
      simulator.baseEquipmentUpgrades,
      simulator.simulatedEquipmentUpgrades,
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
  return nonTitleMultiplier * (1 + titleDamagePercent / 100);
}

function getSimulatedEquipmentScore(baseScore, cumulativeDamageMultiplier) {
  const score = Number(baseScore);
  const multiplier = Number(cumulativeDamageMultiplier);
  if (!Number.isFinite(score) || score <= 0 || !Number.isFinite(multiplier) || multiplier <= 0) return null;
  return Math.round(score * multiplier);
}

function buildUpgradeRow({
  equipment,
  targetLevel,
  mode,
  dbRow,
  stepCost,
  effects,
  itemName,
  materialPrices,
}) {
  const expectedGold = Number(stepCost?.gold || 0);
  if (!Number.isFinite(expectedGold) || expectedGold <= 0) return null;
  const expectedMaterials = applyUpgradeMaterialPrices(getUpgradeMaterials(stepCost), mode, materialPrices);
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

function getOathTuneDbRows(db = {}, key) {
  return Array.isArray(db?.[key]) ? db[key] : [];
}

function getOathPointRow(rows = [], point = 0, pointKey = 'requiredPoint') {
  const value = Number(point || 0);
  return getOathTuneDbRows({ rows }, 'rows')
    .filter((row) => Number(row?.[pointKey]) <= value)
    .sort((a, b) => Number(b?.[pointKey] || 0) - Number(a?.[pointKey] || 0))[0] || null;
}

function getOathTuneState(db = {}, point = 0) {
  const stage = getOathPointRow(getOathTuneDbRows(db, 'stageRows'), point, 'requiredPoint');
  const blessing = getOathPointRow(getOathTuneDbRows(db, 'blessingRows'), point, 'startPoint');
  if (!stage || !blessing) return null;
  const stepPoint = Number(blessing.stepPoint || 25);
  const steps = stepPoint > 0
    ? Math.floor(Math.max(0, Number(point || 0) - Number(blessing.startPoint || 0)) / stepPoint)
    : 0;
  const blessingFinalDamage = Number(blessing.finalDamagePercent || 0)
    + steps * Number(blessing.finalDamagePerStep || 0);
  const blessingBuffPower = Number(blessing.buffPower || 0)
    + steps * Number(blessing.buffPowerPerStep || 0);
  const cooldownMultiplier = blessing.cooldownEquivalent
    ? Number(db.cooldownEquivalentMultiplier || 1)
    : 1;
  const damageMultiplier = (1 + Number(stage.finalDamagePercent || 0) / 100)
    * (1 + blessingFinalDamage / 100)
    * (Number.isFinite(cooldownMultiplier) && cooldownMultiplier > 0 ? cooldownMultiplier : 1);
  return {
    point: Number(point || 0),
    stageName: stage.name || '',
    stageRarity: stage.rarity || '',
    setFinalDamage: Number(stage.finalDamagePercent || 0),
    stageBuffPower: Number(stage.buffPower || 0),
    blessingFinalDamage,
    blessingBuffPower,
    damageMultiplier,
  };
}

function getOathTunePrimevalPoint(db = {}) {
  const primevalStage = getOathTuneDbRows(db, 'stageRows')
    .find((row) => row?.rarity === '태초' || row?.name === '태초');
  return Number(primevalStage?.requiredPoint || 2550);
}

function isOathTuneCandidate(crystal = {}, db = {}) {
  const rarity = String(crystal.itemRarity || '').trim();
  const itemName = String(crystal.itemName || '').trim();
  const uniqueKeyword = String(db.uniqueCrystalNameKeyword || '안개 결정').trim();
  const costByRarity = db.costByRarity || {};
  const level = Number(crystal.tuneLevel || 0);
  const maxLevel = Number(db.maxTuneLevel || 3);
  if (!costByRarity[rarity]) return false;
  if (uniqueKeyword && itemName.includes(uniqueKeyword)) return false;
  if (crystal.tuneUpgradeable === false) return false;
  return Number.isFinite(level) && Number.isFinite(maxLevel) && level < maxLevel;
}

function sortOathTuneCandidatesBySlotOrder(candidates = []) {
  const orderBySlot = new Map(OATH_SLOT_ORDER.map((slot, index) => [slot, index]));
  return candidates.slice().sort((a, b) => (
    Number(orderBySlot.get(Number(a.index)) ?? Number.MAX_SAFE_INTEGER)
    - Number(orderBySlot.get(Number(b.index)) ?? Number.MAX_SAFE_INTEGER)
  ));
}

function allocateOathTuneCost(candidates = [], tuneCount = 0, db = {}) {
  let remaining = Number(tuneCount || 0);
  const materialByKey = new Map();
  let gold = 0;
  const costByRarity = db.costByRarity || {};
  const sorted = sortOathTuneCandidatesBySlotOrder(candidates);
  const steps = [];
  const slotChanges = [];
  sorted.forEach((crystal) => {
    if (remaining <= 0) return;
    const count = Math.min(remaining, Number(crystal.tuneRemaining || 0));
    const cost = costByRarity[crystal.itemRarity];
    if (!cost || count <= 0) return;
    remaining -= count;
    gold += Number(cost.gold || 0) * count;
    const key = cost.materialKey || cost.materialLabel || 'material';
    const previous = materialByKey.get(key) || {
      key,
      label: cost.materialLabel || key,
      amount: 0,
    };
    previous.amount += Number(cost.materialAmount || 0) * count;
    materialByKey.set(key, previous);
    const slot = Number(crystal.index);
    const fromTuneLevel = Number(crystal.tuneLevel || 0);
    slotChanges.push({
      slot,
      fromTuneLevel,
      toTuneLevel: fromTuneLevel + count,
      count,
    });
    for (let offset = 0; offset < count; offset += 1) {
      steps.push({
        slot,
        fromTuneLevel: fromTuneLevel + offset,
        toTuneLevel: fromTuneLevel + offset + 1,
      });
    }
  });
  return remaining > 0 ? null : {
    gold,
    materials: [...materialByKey.values()],
    tunePlan: { steps, slotChanges },
  };
}

function applyOathTunePlan(oathUpgrades = {}, tunePlan = {}, pointPerTune = 10, maxTuneLevel = 3) {
  const nextOath = cloneSimulatorValue(oathUpgrades || {});
  const crystals = Array.isArray(nextOath.crystals) ? nextOath.crystals : [];
  const bySlot = new Map(crystals.map((crystal) => [Number(crystal?.index), crystal]));
  const slotChanges = Array.isArray(tunePlan?.slotChanges) ? tunePlan.slotChanges : [];
  const steps = Array.isArray(tunePlan?.steps) ? tunePlan.steps : [];
  const plannedCount = slotChanges.reduce((sum, change) => sum + Number(change?.count || 0), 0);
  if (!slotChanges.length || (steps.length && steps.length !== plannedCount)) return null;
  for (const change of slotChanges) {
    const crystal = bySlot.get(Number(change?.slot));
    const fromTuneLevel = Number(change?.fromTuneLevel);
    const toTuneLevel = Number(change?.toTuneLevel);
    const count = Number(change?.count);
    if (
      !crystal ||
      Number(crystal.tuneLevel || 0) !== fromTuneLevel ||
      !Number.isInteger(count) ||
      count <= 0 ||
      toTuneLevel !== fromTuneLevel + count ||
      toTuneLevel > maxTuneLevel
    ) return null;
  }
  slotChanges.forEach((change) => {
    const crystal = bySlot.get(Number(change.slot));
    const count = Number(change.count);
    crystal.tuneLevel = Number(change.toTuneLevel);
    crystal.tuneRemaining = Math.max(0, Number(crystal.tuneRemaining || 0) - count);
    crystal.setPoint = Number(crystal.setPoint || 0) + count * Number(pointPerTune || 0);
  });
  nextOath.setPoint = Number(nextOath.setPoint || 0) + plannedCount * Number(pointPerTune || 0);
  return nextOath;
}

function getChangedOathTuneSlots(previousOath = {}, nextOath = {}) {
  const previousBySlot = new Map(
    (previousOath?.crystals || []).map((crystal) => [Number(crystal?.index), crystal]),
  );
  return (nextOath?.crystals || [])
    .filter((crystal) => (
      Number(crystal?.tuneLevel || 0)
      !== Number(previousBySlot.get(Number(crystal?.index))?.tuneLevel || 0)
      || String(crystal?.itemId || '')
      !== String(previousBySlot.get(Number(crystal?.index))?.itemId || '')
    ))
    .map((crystal) => `oath:${Number(crystal.index)}`);
}

function arrangeSimulatedPrimevalOathSlots(crystals = [], simulator = {}) {
  const hasActivePrimevalAcquisition = Object.values(simulator.activeSelectionByGroup || {})
    .some((selection) => (
      selection?.applyType === 'acquireOathDecision' &&
      selection?.acquisitionTargetGroupKey === 'oathAcquireTarget:태초'
    ));
  if (!hasActivePrimevalAcquisition) return crystals;

  const arranged = crystals.slice();
  const positionBySlot = new Map(
    arranged.map((crystal, position) => [Number(crystal?.index), position]),
  );
  const preferredSlots = [8, 9, 10];
  const primevalSlots = arranged
    .filter((crystal) => String(crystal?.itemRarity || '').trim() === '태초')
    .map((crystal) => Number(crystal.index));
  const occupiedPreferredSlots = new Set(
    primevalSlots.filter((slot) => preferredSlots.includes(slot)),
  );
  const availablePreferredSlots = preferredSlots.filter((slot) => !occupiedPreferredSlots.has(slot));
  const movablePrimevalSlots = primevalSlots.filter((slot) => !occupiedPreferredSlots.has(slot));

  movablePrimevalSlots.forEach((sourceSlot, index) => {
    const targetSlot = availablePreferredSlots[index];
    const sourcePosition = positionBySlot.get(sourceSlot);
    const targetPosition = positionBySlot.get(targetSlot);
    if (sourcePosition == null || targetPosition == null || sourcePosition === targetPosition) return;
    [arranged[sourcePosition], arranged[targetPosition]] = [
      arranged[targetPosition],
      arranged[sourcePosition],
    ];
    positionBySlot.set(sourceSlot, targetPosition);
    positionBySlot.set(targetSlot, sourcePosition);
  });
  return arranged;
}

function getOathTuneDamageMultiplier(db = {}, baseOath = {}, simulatedOath = baseOath) {
  const baseState = getOathTuneState(db, Number(baseOath?.setPoint || 0));
  const simulatedState = getOathTuneState(db, Number(simulatedOath?.setPoint || 0));
  if (!baseState || !simulatedState || baseState.damageMultiplier <= 0) return 1;
  return simulatedState.damageMultiplier / baseState.damageMultiplier;
}

function getOathCrystalEffectsTotal(oathUpgrades = {}) {
  return (oathUpgrades?.crystals || []).reduce(
    (total, crystal) => addEffects(total, crystal?.effects || {}),
    {},
  );
}

function getOathCrystalFinalDamageMultiplier(oathUpgrades = {}) {
  return (oathUpgrades?.crystals || []).reduce((multiplier, crystal) => (
    multiplier * (1 + Number(crystal?.effects?.finalDamage || 0) / 100)
  ), 1);
}

function getOathCrystalFinalDamageChangeMultiplier(baseOath = {}, simulatedOath = baseOath) {
  const baseMultiplier = getOathCrystalFinalDamageMultiplier(baseOath);
  const simulatedMultiplier = getOathCrystalFinalDamageMultiplier(simulatedOath);
  return baseMultiplier > 0 && Number.isFinite(simulatedMultiplier)
    ? simulatedMultiplier / baseMultiplier
    : 1;
}

function syncOathTuneStageDisplay(oathUpgrades = {}, db = {}) {
  const stage = getOathTuneState(db, Number(oathUpgrades?.setPoint || 0));
  if (stage?.stageName) oathUpgrades.setRarityName = stage.stageName;
  return oathUpgrades;
}

function getOathTuneRows(oathUpgrades = {}, oathTuneDb = {}, materialPrices = {}, currentEquipmentUpgrades = [], bufferBaseline = null) {
  const db = oathTuneDb || {};
  const isBufferMetric = Boolean(bufferBaseline?.isBuffer);
  if (getEquipmentTuneSetPoint(currentEquipmentUpgrades) < EQUIPMENT_TUNE_MIN_SET_POINT) return [];
  const pointPerTune = Number(db.pointPerTune || 10);
  const totalSetPoint = Number(oathUpgrades?.setPoint || 0);
  if (!Number.isFinite(pointPerTune) || pointPerTune <= 0 || !Number.isFinite(totalSetPoint) || totalSetPoint <= 0) return [];
  const currentState = getOathTuneState(db, totalSetPoint);
  if (!currentState) return [];
  const maxLevel = Number(db.maxTuneLevel || 3);
  const candidates = sortOathTuneCandidatesBySlotOrder((oathUpgrades?.crystals || [])
    .filter((crystal) => isOathTuneCandidate(crystal, db))
    .map((crystal) => ({
      ...crystal,
      tuneRemaining: Math.max(0, Math.min(
        maxLevel - Number(crystal.tuneLevel || 0),
        Number.isFinite(Number(crystal.tuneRemaining))
          ? Number(crystal.tuneRemaining)
          : maxLevel - Number(crystal.tuneLevel || 0),
      )),
    }))
    .filter((crystal) => crystal.tuneRemaining > 0));
  const maxTuneCount = candidates.reduce((sum, crystal) => sum + Number(crystal.tuneRemaining || 0), 0);
  if (maxTuneCount <= 0) return [];

  const tuneSteps = [];
  const primevalPoint = getOathTunePrimevalPoint(db);
  const useStageThresholds = totalSetPoint < primevalPoint;
  let lastMultiplier = currentState.damageMultiplier;
  const currentBuffPower = currentState.blessingBuffPower + Number(currentState.stageBuffPower || 0);
  let lastBuffPower = currentBuffPower;
  let lastStageName = currentState.stageName;
  for (let tuneCount = 1; tuneCount <= maxTuneCount; tuneCount += 1) {
    const targetSetPoint = totalSetPoint + tuneCount * pointPerTune;
    const targetState = getOathTuneState(db, targetSetPoint);
    if (!targetState) continue;
    const targetBuffPower = targetState.blessingBuffPower + Number(targetState.stageBuffPower || 0);
    if (useStageThresholds) {
      if (!targetState.stageName || targetState.stageName === lastStageName) continue;
    } else if (
      isBufferMetric
        ? targetBuffPower <= lastBuffPower + 0.000001
        : targetState.damageMultiplier <= lastMultiplier + 0.000001
    ) {
      continue;
    }
    const cost = allocateOathTuneCost(candidates, tuneCount, db);
    if (!cost || cost.gold <= 0) continue;
    const expectedMaterials = applyUpgradeMaterialPrices(cost.materials, 'oathTune', materialPrices);
    const damageMultiplier = targetState.damageMultiplier / currentState.damageMultiplier;
    const displayCurrentStageName = currentState.stageName;
    const displayCurrentBuffPower = currentBuffPower;
    tuneSteps.push({
      index: tuneSteps.length,
      tuneCount,
      currentSetPoint: totalSetPoint,
      targetSetPoint,
      currentFinalDamage: currentState.blessingFinalDamage,
      targetFinalDamage: targetState.blessingFinalDamage,
      currentBuffPower: displayCurrentBuffPower,
      targetBuffPower,
      currentSetFinalDamage: currentState.setFinalDamage,
      targetSetFinalDamage: targetState.setFinalDamage,
      currentStageName: displayCurrentStageName,
      targetStageName: targetState.stageName,
      expectedGold: cost.gold,
      expectedMaterials,
      tunePlan: cost.tunePlan,
      effects: isBufferMetric
        ? { buffPower: targetBuffPower - currentBuffPower }
        : { skillDamageMultiplier: damageMultiplier },
    });
    lastMultiplier = targetState.damageMultiplier;
    lastBuffPower = targetBuffPower;
    lastStageName = targetState.stageName;
  }
  const first = tuneSteps[0];
  if (!first) return [];
  const iconCrystal = candidates.find((crystal) => crystal.iconUrl) || {};
  return [{
    sourceType: 'oathTune',
    slot: '서약 조율',
    tier: '조율',
    metricType: isBufferMetric ? 'buffer' : undefined,
    itemName: '서약 조율',
    itemRarity: '',
    iconUrl: iconCrystal.iconUrl || oathUpgrades.iconUrl || '',
    itemExplain: '',
    effects: first.effects,
    auction: { minUnitPrice: first.expectedGold },
    expectedGold: first.expectedGold,
    expectedMaterials: first.expectedMaterials,
    tuneSteps,
    selectedTuneStepIndex: 0,
    currentSetPoint: first.currentSetPoint,
    targetSetPoint: first.targetSetPoint,
    currentTuneFinalDamage: first.currentFinalDamage,
    targetTuneFinalDamage: first.targetFinalDamage,
    currentOathSetFinalDamage: first.currentSetFinalDamage,
    targetOathSetFinalDamage: first.targetSetFinalDamage,
    currentOathStageName: first.currentStageName,
    targetOathStageName: first.targetStageName,
    tuneCount: first.tuneCount,
  }];
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

function getSafeAmplificationExpectedFromZero(level, costKey, safeAmplificationRows = []) {
  const targetLevel = Number(level || 0);
  if (targetLevel <= 0) return {};
  return safeAmplificationRows
    .find((row) => Number(row.level) === targetLevel)?.expectedFromZero?.[costKey] || {};
}

function getSafeAmplificationTargetCost(row, equipment, currentLevel, safeAmplificationRows) {
  const costKey = getAmplificationCostKey(equipment.slot);
  const targetCost = getSafeAmplificationExpectedFromZero(Number(row?.level || 0), costKey, safeAmplificationRows);
  const currentCost = getSafeAmplificationExpectedFromZero(currentLevel, costKey, safeAmplificationRows);
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

function getHybridAmplificationExpectedFromZero(level, costKey, upgradeDb, safeAmplificationRows) {
  const targetLevel = Number(level || 0);
  if (targetLevel <= 0) return {};
  if (targetLevel <= 10) {
    return getSafeAmplificationExpectedFromZero(targetLevel, costKey, safeAmplificationRows);
  }

  const normalRows = upgradeDb.amplification?.normalAmplification || [];
  let total = getHybridAmplificationExpectedFromZero(10, costKey, upgradeDb, safeAmplificationRows);
  for (let nextLevel = 11; nextLevel <= targetLevel; nextLevel += 1) {
    const row = normalRows.find((normalRow) => Number(normalRow.level) === nextLevel);
    const stepCost = getHybridAmplificationStepCost(row, nextLevel - 1, costKey, upgradeDb, safeAmplificationRows);
    total = addCosts(total, stepCost);
  }
  return total;
}

function getHybridAmplificationStepCost(row, currentLevel, costKey, upgradeDb, safeAmplificationRows) {
  const successRate = Number(row?.successRatePercent || 0) / 100;
  if (!row || !Number.isFinite(successRate) || successRate <= 0) return row?.stepExpected?.[costKey] || null;
  const failureRate = Math.max(0, 1 - successRate);
  const directExpected = multiplyCost(getAmplificationAttemptCost(row, costKey, upgradeDb), 1 / successRate);
  const rebuildExpected = multiplyCost(
    getHybridAmplificationExpectedFromZero(currentLevel, costKey, upgradeDb, safeAmplificationRows),
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
  const currentEffects = getCumulativeUpgradeEffectsForEquipment(equipment, currentLevel, 'reinforcement', upgradeDb, baseline, isBuffer);
  if (isBuffer) {
    return amplificationRows
      .slice()
      .sort((a, b) => Number(a.level) - Number(b.level))
      .find((row) => {
        if (Number(row.level) < MIN_RECOMMENDED_AMPLIFICATION_LEVEL) return false;
        const conversionEffects = getCumulativeUpgradeEffectsForEquipment(equipment, Number(row.level), 'amplification', upgradeDb, baseline, isBuffer);
        return Number(conversionEffects.allStat || 0) > Number(currentEffects.allStat || 0);
      }) || null;
  }
  const currentMultiplier = estimateDamageMultiplier(currentEffects, baseline);
  return amplificationRows
    .slice()
    .sort((a, b) => Number(a.level) - Number(b.level))
    .find((row) => {
      if (Number(row.level) < MIN_RECOMMENDED_AMPLIFICATION_LEVEL) return false;
      const conversionEffects = getCumulativeUpgradeEffectsForEquipment(equipment, Number(row.level), 'amplification', upgradeDb, baseline, isBuffer);
      return estimateDamageMultiplier(conversionEffects, baseline) > currentMultiplier + 0.000001;
    }) || null;
}

function buildIndependentWeaponAmplificationChoiceRow({
  equipment,
  currentLevel,
  upgradeDb,
  baseline,
  isBuffer,
  safeAmplificationRows,
  materialPrices,
}) {
  const conversionRow = findBetterAmplificationTarget(equipment, currentLevel, upgradeDb, baseline, isBuffer);
  if (!conversionRow) return null;
  const conversionLevel = Number(conversionRow.level);
  const costKey = getAmplificationCostKey(equipment.slot);
  const safeConversionRow = conversionLevel <= 10
    ? safeAmplificationRows.find((row) => Number(row.level) === conversionLevel)
    : null;
  const expectedFromZero = safeConversionRow
    ? getSafeAmplificationExpectedFromZero(conversionLevel, costKey, safeAmplificationRows)
    : getHybridAmplificationExpectedFromZero(conversionLevel, costKey, upgradeDb, safeAmplificationRows);
  if (!expectedFromZero) return null;
  const currentEffects = getCumulativeUpgradeEffectsForEquipment(equipment, currentLevel, 'reinforcement', upgradeDb, baseline, isBuffer);
  const conversionEffects = getCumulativeUpgradeEffectsForEquipment(equipment, conversionLevel, 'amplification', upgradeDb, baseline, isBuffer);
  return buildUpgradeRow({
    equipment,
    targetLevel: conversionLevel,
    mode: conversionLevel <= 10 ? 'safeAmplification' : 'amplification',
    dbRow: conversionRow,
    stepCost: expectedFromZero,
    effects: subtractEffects(conversionEffects, currentEffects),
    itemName: `${equipment.slot} ${currentLevel}강화->${conversionLevel}증폭`,
    materialPrices,
  });
}

function getUpgradeRows(currentEquipmentUpgrades = [], upgradeDb = {}, baseline = {}, bufferBaseline = null, safeAmplificationEventEnabled = false, materialPrices = {}) {
  upgradeDb = upgradeDb || {};
  const reinforcementRows = upgradeDb.reinforcement?.reinforcement || [];
  const amplificationRows = upgradeDb.amplification?.normalAmplification || [];
  const safeAmplificationRows = safeAmplificationEventEnabled
    ? upgradeDb.amplification?.safeAmplificationEvent || upgradeDb.amplification?.safeAmplification || []
    : upgradeDb.amplification?.safeAmplification || [];
  return (currentEquipmentUpgrades || []).flatMap((equipment) => {
    const slotKey = UPGRADE_SLOT_LABELS[equipment.slot];
    if (!slotKey) return [];
    const currentLevel = Number(equipment.reinforce || 0);
    const isAmplified = Boolean(equipment.isAmplified);
    const treatAsAmplified = isAmplified || (currentLevel === 0 && equipment.slot !== '무기');
    const targetLevel = !treatAsAmplified && equipment.slot === '무기' && currentLevel < 12
      ? 12
      : treatAsAmplified && currentLevel < MIN_RECOMMENDED_AMPLIFICATION_LEVEL ? MIN_RECOMMENDED_AMPLIFICATION_LEVEL : currentLevel + 1;
    const rows = [];
    const allowReinforcement = REINFORCEMENT_RECOMMEND_SLOT_KEYS.has(slotKey);
    const isSafeAmplification = treatAsAmplified && targetLevel <= 10;
    const isBuffer = Boolean(bufferBaseline?.isBuffer);
    const shouldCompareWeaponAmplification = shouldCompareIndependentWeaponAmplification(equipment, baseline, isBuffer);
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
          ? getSafeAmplificationTargetCost(dbRow, equipment, currentLevel, safeAmplificationRows)
          : treatAsAmplified
            ? getHybridAmplificationStepCost(dbRow, currentLevel, getAmplificationCostKey(equipment.slot), upgradeDb, safeAmplificationRows)
        : getUpgradeStepCost(dbRow, equipment, currentLevel, treatAsAmplified);
      nextUpgradeRow = buildUpgradeRow({
        equipment,
        targetLevel,
        mode: isSafeAmplification ? 'safeAmplification' : treatAsAmplified ? 'amplification' : isSafeReinforcement ? 'safeReinforcement' : 'reinforcement',
        dbRow,
        stepCost,
        effects: getUpgradeEffectsForEquipment(
          equipment,
          currentLevel,
          targetLevel,
          treatAsAmplified ? 'amplification' : 'reinforcement',
          upgradeDb,
          baseline,
          isBuffer,
        ),
        itemName: `${equipment.slot} ${currentLevel}->${targetLevel} ${isSafeAmplification ? '안전증폭' : treatAsAmplified ? '증폭' : isSafeReinforcement ? '안전강화' : '강화'}`,
        materialPrices,
      });
      if (shouldCompareWeaponAmplification && isSafeReinforcement) {
        const amplificationChoiceRow = buildIndependentWeaponAmplificationChoiceRow({
          equipment,
          currentLevel,
          upgradeDb,
          baseline,
          isBuffer,
          safeAmplificationRows,
          materialPrices,
        });
        const bestChoice = chooseBestUpgradeChoice([nextUpgradeRow, amplificationChoiceRow], baseline);
        if (bestChoice) rows.push(bestChoice);
      } else if ((treatAsAmplified || isSafeReinforcement) && nextUpgradeRow) {
        rows.push(nextUpgradeRow);
      }
    }

    if (!treatAsAmplified && !isSafeReinforcement) {
      const currentEffects = getCumulativeUpgradeEffectsForEquipment(equipment, currentLevel, 'reinforcement', upgradeDb, baseline, isBuffer);
      const conversionRow = currentLevel > 0
        ? findBetterAmplificationTarget(equipment, currentLevel, upgradeDb, baseline, isBuffer)
        : null;
      if (conversionRow) {
        const conversionLevel = Number(conversionRow.level);
        const costKey = getAmplificationCostKey(equipment.slot);
        const safeConversionRow = conversionLevel <= 10
          ? safeAmplificationRows.find((row) => Number(row.level) === conversionLevel)
          : null;
        const expectedFromZero = safeConversionRow
          ? getSafeAmplificationExpectedFromZero(conversionLevel, costKey, safeAmplificationRows)
          : getHybridAmplificationExpectedFromZero(conversionLevel, costKey, upgradeDb, safeAmplificationRows);
        if (expectedFromZero) {
          const conversionEffects = getCumulativeUpgradeEffectsForEquipment(equipment, conversionLevel, 'amplification', upgradeDb, baseline, isBuffer);
          const incrementalEffects = subtractEffects(conversionEffects, currentEffects);
          const row = buildUpgradeRow({
            equipment,
            targetLevel: conversionLevel,
            mode: 'amplificationConversion',
            dbRow: conversionRow,
            stepCost: expectedFromZero,
            effects: incrementalEffects,
            itemName: `${equipment.slot} ${currentLevel}강화->${conversionLevel}증폭`,
            materialPrices,
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

function getOathTuneExclusiveGroupKey(row = {}) {
  return row.sourceType === 'oathTune' ? 'oathTune' : '';
}

function getOathTuneCandidateSignature(row = {}) {
  const groupKey = getOathTuneExclusiveGroupKey(row);
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

function getOathAcquisitionReferenceState(simulator = {}, targetGroupKey = '') {
  const referenceOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
  const crystals = Array.isArray(referenceOath.crystals) ? referenceOath.crystals : [];
  Object.entries(simulator.activeSelectionByGroup || {}).forEach(([groupKey, selection]) => {
    if (
      selection?.applyType !== 'acquireOathDecision' ||
      selection?.acquisitionTargetGroupKey !== targetGroupKey
    ) return;
    const slotIndex = Number(String(selection.targetSlot || groupKey).split(':').pop());
    const previousCrystal = (selection.beforeAcquisitionSnapshot?.simulatedOathUpgrades?.crystals || [])
      .find((crystal) => Number(crystal?.index) === slotIndex);
    const currentIndex = crystals.findIndex((crystal) => Number(crystal?.index) === slotIndex);
    if (!previousCrystal || currentIndex < 0) return;
    referenceOath.setPoint = Number(referenceOath.setPoint || 0)
      - Number(crystals[currentIndex]?.setPoint || 0)
      + Number(previousCrystal.setPoint || 0);
    crystals.splice(currentIndex, 1, cloneSimulatorValue(previousCrystal));
  });
  return referenceOath;
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
  const targetGroupKey = getOathAcquisitionTargetGroupKey(row);
  const targetRarity = String(row.targetRarity || row.itemRarity || '').trim();
  const requestedCount = Math.max(1, Number(row.variantCount || row.decisionPlan?.length || 1));
  const referenceOath = getOathAcquisitionReferenceState(simulator, targetGroupKey);
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
  };
}

function isAppliedOathAcquisitionRecommendation(row = {}, simulator = {}) {
  const descriptors = getOathAcquisitionSelectionDescriptors(row);
  if (!descriptors.length) return false;
  return descriptors.every((descriptor) => (
    simulator?.activeSelectionByGroup?.[descriptor.exclusiveGroupKey]?.candidateSignature
    === descriptor.candidateSignature
  )) && Object.values(simulator?.activeSelectionByGroup || {}).filter((selection) => (
    selection?.acquisitionVariantGroupKey === row.variantGroupKey
  )).length === descriptors.length;
}

function mergeAppliedOathAcquisitionSnapshots(rows = [], simulator = {}) {
  const mergedRows = rows.slice();
  const snapshotByAction = new Map();
  Object.values(simulator.activeSelectionByGroup || {}).forEach((selection) => {
    if (
      selection?.applyType !== 'acquireOathDecision' ||
      !selection?.acquisitionActionId ||
      !selection?.appliedRecommendationSnapshot
    ) return;
    if (!snapshotByAction.has(selection.acquisitionActionId)) {
      snapshotByAction.set(selection.acquisitionActionId, selection.appliedRecommendationSnapshot);
    }
  });
  snapshotByAction.forEach((snapshot) => {
    const adaptedSnapshot = adaptOathAcquisitionRecommendation(snapshot, simulator) || snapshot;
    if (!isAppliedOathAcquisitionRecommendation(adaptedSnapshot, simulator)) return;
    const alreadyRendered = mergedRows.some((row) => (
      row.variantGroupKey === adaptedSnapshot.variantGroupKey &&
      isAppliedOathAcquisitionRecommendation(row, simulator)
    ));
    if (!alreadyRendered) mergedRows.push(adaptedSnapshot);
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

function getSimulatorExclusiveGroupKey(row = {}) {
  return getEnchantExclusiveGroupKey(row)
    || getAuraExclusiveGroupKey(row)
    || getCreatureExclusiveGroupKey(row)
    || getTitleExclusiveGroupKey(row)
    || getEquipmentTuneExclusiveGroupKey(row)
    || getOathTuneExclusiveGroupKey(row)
    || getOathAcquisitionExclusiveGroupKey(row)
    || getBlackFangExclusiveGroupKey(row);
}

function getSimulatorCandidateSignature(row = {}) {
  return getEnchantCandidateSignature(row)
    || getAuraCandidateSignature(row)
    || getCreatureCandidateSignature(row)
    || getTitleCandidateSignature(row)
    || getEquipmentTuneCandidateSignature(row)
    || getOathTuneCandidateSignature(row)
    || getOathAcquisitionCandidateSignature(row)
    || getBlackFangCandidateSignature(row);
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
    .filter((artifact) => artifact?.slotColor)
    .map((artifact) => [artifact.slotColor, artifact]));
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
      : row.sourceType === 'aura'
        ? simulationOptions?.auraReferenceBaseline || baseline
      : row.sourceType === 'creature'
        ? simulationOptions?.creatureReferenceBaseline || baseline
      : row.sourceType === 'title'
        ? simulationOptions?.titleReferenceBaseline || baseline
      : row.sourceType === 'blackFang'
        ? simulationOptions?.blackFangReferenceBaselineBySlot?.get(row.slot) || baseline
        : baseline;
    const rowPreferredElement = getPreferredElementForRecommendationRow(
      row,
      evaluationBaseline,
      preferredArtifactElement,
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
          const artifact = currentArtifactBySlot.get(row.slotColor) || {};
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

function applyEquipmentTuneDisplayStep(row = {}, stepIndex = 0, includeMaterialCosts = false, baseline = {}, bufferBaseline = null) {
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
    const currentScore = calculateBufferScore(bufferBaseline);
    const candidateScore = calculateBufferScore(bufferBaseline, {
      buffPowerDelta: Number(displayRow.effects?.buffPower || 0),
    });
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
  state.currentBufferScoreStatus = 'idle';
  state.currentOfficialEquipmentScore = null;
  state.currentOfficialEquipmentScoreStatus = 'idle';
  state.currentOfficialEquipmentScoreCharacterKey = '';
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
  state.equipmentTunePopoverOpen = false;
  state.equipmentTunePopoverSource = '';
  state.dealerSimulator = null;
  state.dealerSimulatorRecommendations = new Map();
  state.dealerSimulatorSuppressClickUntil = 0;

  function isDealerSimulatorActive() {
    return Boolean(state.dealerSimulator && !state.currentBufferBaseline?.isBuffer);
  }

  function getActiveEnchants() {
    return isDealerSimulatorActive()
      ? state.dealerSimulator.simulatedEnchants
      : state.currentEnchants;
  }

  function getActiveEquipmentUpgrades() {
    return isDealerSimulatorActive()
      ? state.dealerSimulator.simulatedEquipmentUpgrades
      : state.currentEquipmentUpgrades;
  }

  function getActiveOathUpgrades() {
    return isDealerSimulatorActive()
      ? state.dealerSimulator.simulatedOathUpgrades
      : state.currentOathUpgrades;
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

  function getActiveAura() {
    return isDealerSimulatorActive()
      ? state.dealerSimulator.simulatedAura
      : getCanonicalCurrentAura();
  }

  function getCanonicalCurrentCreatureBody() {
    const creature = cloneSimulatorValue(state.currentCreature || {});
    delete creature.artifacts;
    return creature;
  }

  function getActiveCreature() {
    return isDealerSimulatorActive()
      ? state.dealerSimulator.simulatedCreature
      : getCanonicalCurrentCreatureBody();
  }

  function getActiveTitle() {
    return isDealerSimulatorActive()
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
    )).map((row) => adaptOathAcquisitionRecommendation(row, simulator)).filter(Boolean);
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
    );
    const baseEquipmentBySlot = new Map(
      simulator.baseEquipmentUpgrades.map((equipment) => [equipment?.slot, equipment]),
    );
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
        referenceTitle: simulator.baseTitle,
        titleReferenceBaseline,
        blackFangReferenceBaselineBySlot,
        preserveEligibleEnchantCandidates: eligibleSignatures.size > 0,
      },
    };
  }

  function resetDealerSimulator() {
    state.dealerSimulator = null;
    state.dealerSimulatorRecommendations = new Map();
    state.dealerSimulatorSuppressClickUntil = 0;
    renderDealerSimulatorActions();
  }

  function initializeDealerSimulator() {
    if (state.currentBufferBaseline?.isBuffer || !state.currentDamageBaseline) {
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
    const baseCreature = getCanonicalCurrentCreatureBody();
    const baseTitle = cloneSimulatorValue(state.currentTitle || {});
    const baseOathUpgrades = attachOathAcquisitionBaseCalculationData(
      state.currentOathUpgrades || {},
      [
        ...(state.currentOathTranscendRecommendations || []),
        ...(state.currentOathCraftRecommendations || []),
      ],
    );
    state.dealerSimulator = {
      baseEnchants,
      simulatedEnchants: cloneSimulatorValue(baseEnchants),
      baseEquipmentUpgrades,
      simulatedEquipmentUpgrades: cloneSimulatorValue(baseEquipmentUpgrades),
      baseAura,
      simulatedAura: cloneSimulatorValue(baseAura),
      baseCreature,
      simulatedCreature: cloneSimulatorValue(baseCreature),
      baseTitle,
      simulatedTitle: cloneSimulatorValue(baseTitle),
      baseOathUpgrades,
      simulatedOathUpgrades: cloneSimulatorValue(baseOathUpgrades),
      oathTuneDb: cloneSimulatorValue(state.oathTuneStageDb || {}),
      baseDamageBaseline,
      simulatedDamageBaseline: cloneSimulatorValue(baseDamageBaseline),
      baseEquipmentScore: Number(state.currentOfficialEquipmentScore) || null,
      totalGold: 0,
      history: [],
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
  }

  function syncDealerSimulatorAuraState() {
    const simulator = state.dealerSimulator;
    if (!simulator) return;
    const canonicalAura = getCanonicalCurrentAura();
    simulator.baseAura = canonicalAura;
    simulator.simulatedAura = simulator.activeSelectionByGroup?.aura
      ? mergeAuraBodyWithEmblems(simulator.simulatedAura || {}, canonicalAura)
      : cloneSimulatorValue(canonicalAura);
    rebuildDealerSimulatorCalculationState();
  }

  function syncDealerSimulatorCreatureState() {
    const simulator = state.dealerSimulator;
    if (!simulator) return;
    const canonicalCreature = getCanonicalCurrentCreatureBody();
    simulator.baseCreature = canonicalCreature;
    if (!simulator.activeSelectionByGroup?.creature) {
      simulator.simulatedCreature = cloneSimulatorValue(canonicalCreature);
    }
    rebuildDealerSimulatorCalculationState();
  }

  function syncDealerSimulatorTitleState() {
    const simulator = state.dealerSimulator;
    if (!simulator) return;
    const canonicalTitle = cloneSimulatorValue(state.currentTitle || {});
    simulator.baseTitle = canonicalTitle;
    if (!simulator.activeSelectionByGroup?.title) {
      simulator.simulatedTitle = cloneSimulatorValue(canonicalTitle);
    }
    rebuildDealerSimulatorCalculationState();
  }

  function rebuildDealerSimulatorCalculationState() {
    const simulator = state.dealerSimulator;
    if (!simulator) return;
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
    if (state.currentBufferBaseline?.isBuffer) return null;
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
    if (row.sourceType === 'title') {
      if (!row.itemId || !Object.keys(row.titlePackageEffects || row.effects || {}).length) return null;
      return {
        targetTab: 'equipment',
        targetSlot: '칭호',
        applyType: 'replaceTitle',
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

  function getDealerSimulatorSnapshot() {
    const simulator = state.dealerSimulator;
    if (!simulator) return null;
    return {
      simulatedEnchants: cloneSimulatorValue(simulator.simulatedEnchants),
      simulatedEquipmentUpgrades: cloneSimulatorValue(simulator.simulatedEquipmentUpgrades),
      simulatedAura: cloneSimulatorValue(simulator.simulatedAura),
      simulatedCreature: cloneSimulatorValue(simulator.simulatedCreature),
      simulatedTitle: cloneSimulatorValue(simulator.simulatedTitle),
      simulatedOathUpgrades: cloneSimulatorValue(simulator.simulatedOathUpgrades),
      totalGold: simulator.totalGold,
      activeSelectionByGroup: cloneSimulatorValue(simulator.activeSelectionByGroup || {}),
      suspendedOathTune: cloneSimulatorValue(simulator.suspendedOathTune || null),
      lastChangedTarget: simulator.lastChangedTarget ? { ...simulator.lastChangedTarget } : null,
    };
  }

  function restoreDealerSimulatorSnapshot(snapshot) {
    const simulator = state.dealerSimulator;
    if (!simulator || !snapshot) return;
    simulator.simulatedEnchants = cloneSimulatorValue(snapshot.simulatedEnchants || []);
    simulator.simulatedEquipmentUpgrades = cloneSimulatorValue(
      snapshot.simulatedEquipmentUpgrades || simulator.baseEquipmentUpgrades || [],
    );
    simulator.simulatedAura = cloneSimulatorValue(snapshot.simulatedAura || simulator.baseAura || {});
    simulator.simulatedCreature = cloneSimulatorValue(snapshot.simulatedCreature || simulator.baseCreature || {});
    simulator.simulatedTitle = cloneSimulatorValue(snapshot.simulatedTitle || simulator.baseTitle || {});
    simulator.simulatedOathUpgrades = cloneSimulatorValue(
      snapshot.simulatedOathUpgrades || simulator.baseOathUpgrades || {},
    );
    simulator.activeSelectionByGroup = cloneSimulatorValue(snapshot.activeSelectionByGroup || {});
    simulator.suspendedOathTune = cloneSimulatorValue(snapshot.suspendedOathTune || null);
    simulator.totalGold = getDealerSimulatorTotalGold(simulator);
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
    rebuildDealerSimulatorCalculationState();
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
    rebuildDealerSimulatorCalculationState();
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
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function replaceSimulatedTitle(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'replaceTitle') return false;
    simulator.simulatedTitle = {
      ...cloneSimulatorValue(row),
      itemName: row.titleItemName || row.candidateName || row.itemName || '',
      iconUrl: row.titleIconUrl || row.iconUrl || '',
      effects: cloneSimulatorValue(row.titlePackageEffects || row.effects || {}),
      enchantEffects: cloneSimulatorValue(row.targetTitleEnchantEffects || row.enchantEffects || {}),
    };
    rebuildDealerSimulatorCalculationState();
    return true;
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
    rebuildDealerSimulatorCalculationState();
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
    rebuildDealerSimulatorCalculationState();
    return true;
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

  function applySimulatedOathAcquisition(row, target) {
    const simulator = state.dealerSimulator;
    if (!simulator || target?.applyType !== 'acquireOathDecision') return false;
    const descriptors = target.selectionDescriptors || [];
    const acquisitionTargetGroupKey = getOathAcquisitionTargetGroupKey(row);
    const existingTargetSelection = Object.values(simulator.activeSelectionByGroup || {})
      .find((selection) => selection?.acquisitionTargetGroupKey === acquisitionTargetGroupKey);
    const existingPlanSelections = Object.entries(simulator.activeSelectionByGroup || {})
      .filter(([, selection]) => selection?.acquisitionVariantGroupKey === row.variantGroupKey);
    const existingBeforeSnapshot = existingPlanSelections[0]?.[1]?.beforeAcquisitionSnapshot;
    if (existingPlanSelections.length && existingBeforeSnapshot) {
      const currentCrystals = simulator.simulatedOathUpgrades?.crystals || [];
      existingPlanSelections.forEach(([groupKey, selection]) => {
        const slotIndex = Number(String(selection.targetSlot || groupKey).split(':').pop());
        const restoreSnapshot = selection.beforeAcquisitionSnapshot || existingBeforeSnapshot;
        const previousCrystal = (restoreSnapshot?.simulatedOathUpgrades?.crystals || [])
          .find((crystal) => Number(crystal?.index) === slotIndex);
        const currentIndex = currentCrystals.findIndex(
          (crystal) => Number(crystal?.index) === slotIndex,
        );
        if (previousCrystal && currentIndex >= 0) {
          simulator.simulatedOathUpgrades.setPoint = Number(simulator.simulatedOathUpgrades.setPoint || 0)
            - Number(currentCrystals[currentIndex]?.setPoint || 0)
            + Number(previousCrystal.setPoint || 0);
          currentCrystals.splice(currentIndex, 1, cloneSimulatorValue(previousCrystal));
        }
        delete simulator.activeSelectionByGroup[groupKey];
        const restoredSelection = restoreSnapshot.activeSelectionByGroup?.[groupKey];
        if (restoredSelection) {
          simulator.activeSelectionByGroup[groupKey] = cloneSimulatorValue(restoredSelection);
        }
      });
    }
    const currentBySlot = new Map(
      (simulator.simulatedOathUpgrades?.crystals || [])
        .map((crystal) => [Number(crystal?.index), crystal]),
    );
    const bodyChanged = descriptors.some(({ entry }) => (
      currentBySlot.get(Number(entry.slotIndex))?.itemId !== entry.targetItemId
    ));
    target.beforeAcquisitionSnapshot = cloneSimulatorValue(
      existingBeforeSnapshot || existingTargetSelection?.beforeAcquisitionSnapshot || getDealerSimulatorSnapshot(),
    );
    target.bodyChanged = bodyChanged;
    if (!bodyChanged) {
      target.changedSlots = [];
      return true;
    }
    const activeOathTune = simulator.activeSelectionByGroup?.oathTune;
    if (activeOathTune?.actionType === 'oathTunePlan') {
      if (!simulator.suspendedOathTune) {
        simulator.suspendedOathTune = {
          selection: cloneSimulatorValue(activeOathTune),
          oathUpgrades: cloneSimulatorValue(simulator.simulatedOathUpgrades || {}),
        };
      }
      simulator.simulatedOathUpgrades = cloneSimulatorValue(
        activeOathTune.beforeTuneSnapshot || simulator.baseOathUpgrades || {},
      );
      target.removedOathTuneSelection = cloneSimulatorValue(activeOathTune);
      delete simulator.activeSelectionByGroup.oathTune;
      state.tuneStepIndexBySource = {
        ...(state.tuneStepIndexBySource || {}),
        oathTune: 0,
      };
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
    if (!changedSlots.length) return false;
    syncOathTuneStageDisplay(nextOath, simulator.oathTuneDb);
    simulator.simulatedOathUpgrades = nextOath;
    target.changedSlots = changedSlots;
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function applySimulatorReplacement(row, target) {
    if (target?.applyType === 'replaceEnchant') return replaceSimulatedEnchant(row, target);
    if (target?.applyType === 'replaceAura') return replaceSimulatedAura(row, target);
    if (target?.applyType === 'replaceCreature') return replaceSimulatedCreature(row, target);
    if (target?.applyType === 'replaceTitle') return replaceSimulatedTitle(row, target);
    if (target?.applyType === 'replaceBlackFangBody') return replaceSimulatedBlackFangBody(row, target);
    if (target?.applyType === 'applyEquipmentTunePlan') return applySimulatedEquipmentTunePlan(row, target);
    if (target?.applyType === 'applyOathTunePlan') return applySimulatedOathTunePlan(row, target);
    if (target?.applyType === 'acquireOathDecision') return applySimulatedOathAcquisition(row, target);
    return false;
  }

  function closeDealerSimulatorSelection() {
    if (!state.dealerSimulator?.selectedRecommendationId) return;
    state.dealerSimulator.selectedRecommendationId = '';
    renderEnchantTable();
  }

  function getDealerSimulatorSelectionGold(selection = {}, includeMaterialCosts = false) {
    const selectedGold = includeMaterialCosts
      ? Number(selection.goldWithMaterials)
      : Number(selection.goldWithoutMaterials);
    if (Number.isFinite(selectedGold) && selectedGold >= 0) return selectedGold;
    const fallbackGold = Number(selection.appliedGold || 0);
    return Number.isFinite(fallbackGold) && fallbackGold >= 0 ? fallbackGold : 0;
  }

  function getOathAcquisitionEntryGold(entry = {}, includeMaterialCosts = false) {
    const baseGold = Number(entry.expectedGold || 0);
    if (!Number.isFinite(baseGold) || baseGold < 0) return 0;
    return includeMaterialCosts
      ? baseGold + getMaterialGold(entry.expectedMaterials || [])
      : baseGold;
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
    const simulator = state.dealerSimulator;
    if (!simulator) return;
    const includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true;
    Object.values(simulator.activeSelectionByGroup || {}).forEach((selection) => {
      selection.includeMaterialCost = includeMaterialCosts;
      selection.appliedGold = getDealerSimulatorSelectionGold(selection, includeMaterialCosts);
    });
    simulator.totalGold = getDealerSimulatorTotalGold(simulator, includeMaterialCosts);
  }

  const DEALER_SIMULATOR_SWEEP_DURATION_MS = 800;

  function triggerDealerSimulatorSweep(slot) {
    const simulator = state.dealerSimulator;
    if (!simulator || !slot) return;
    const token = simulator.sweepSequence + 1;
    simulator.sweepSequence = token;
    simulator.activeSweepSlots.set(slot, { token, startedAt: Date.now() });
    setTimeout(() => {
      if (state.dealerSimulator !== simulator) return;
      const activeSweep = simulator.activeSweepSlots.get(slot);
      if (activeSweep?.token === token) simulator.activeSweepSlots.delete(slot);
    }, DEALER_SIMULATOR_SWEEP_DURATION_MS);
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
    const snapshot = getDealerSimulatorSnapshot();
    simulator.applyingRecommendationId = recommendationId;
    try {
      if (!applySimulatorReplacement(row, target)) return;
      simulator.history.push(snapshot);
      if (isOathAcquisition) {
        const acquisitionTargetGroupKey = getOathAcquisitionTargetGroupKey(row);
        oathAcquisitionDescriptors.forEach((descriptor) => {
          const entryGoldWithoutMaterials = getOathAcquisitionEntryGold(descriptor.entry, false);
          const entryGoldWithMaterials = getOathAcquisitionEntryGold(descriptor.entry, true);
          simulator.activeSelectionByGroup[descriptor.exclusiveGroupKey] = {
            candidateSignature: descriptor.candidateSignature,
            acquisitionActionId: recommendationId,
            acquisitionVariantGroupKey: row.variantGroupKey || '',
            acquisitionTargetGroupKey,
            acquisitionMethod: descriptor.acquisitionMethod,
            appliedGold: includeMaterialCosts ? entryGoldWithMaterials : entryGoldWithoutMaterials,
            includeMaterialCost: includeMaterialCosts,
            goldWithoutMaterials: entryGoldWithoutMaterials,
            goldWithMaterials: entryGoldWithMaterials,
            materials: cloneSimulatorValue(descriptor.entry.materials || []),
            targetItemId: descriptor.entry.targetItemId,
            targetTab: target.targetTab,
            targetSlot: `oath:${descriptor.entry.slotIndex}`,
            applyType: target.applyType,
            appliedRecommendationSnapshot: cloneSimulatorValue(row),
            beforeAcquisitionSnapshot: cloneSimulatorValue(target.beforeAcquisitionSnapshot),
            removedOathTuneSelection: cloneSimulatorValue(target.removedOathTuneSelection || null),
          };
        });
      } else {
        simulator.activeSelectionByGroup[exclusiveGroupKey] = {
          candidateSignature,
          appliedGold: latestGold,
          includeMaterialCost: includeMaterialCosts,
          goldWithoutMaterials,
          goldWithMaterials,
          targetTab: target.targetTab,
          targetSlot: target.targetSlot,
          applyType: target.applyType,
          ...(['applyEquipmentTunePlan', 'applyOathTunePlan'].includes(target.applyType) ? {
            actionType: target.applyType === 'applyOathTunePlan' ? 'oathTunePlan' : 'equipmentTunePlan',
            selectedVariantIndex: Number(row.selectedTuneStepIndex || 0),
            beforeTuneSnapshot: cloneSimulatorValue(target.beforeTuneSnapshot || (target.applyType === 'applyOathTunePlan' ? {} : [])),
            pointPerTune: target.pointPerTune,
            maxTuneLevel: target.maxTuneLevel,
            variants: cloneSimulatorValue(row.tuneSteps || []),
            appliedVariantSnapshot: cloneSimulatorValue(row),
          } : {}),
        };
      }
      simulator.totalGold = getDealerSimulatorTotalGold(simulator);
      simulator.selectedRecommendationId = '';
      simulator.lastChangedTarget = target;
      const changedSlots = Array.isArray(target.changedSlots)
        ? target.changedSlots
        : [target.targetSlot];
      changedSlots.forEach(triggerDealerSimulatorSweep);
      state.enchantLoadoutTab = target.targetTab;
      renderEnchantCharacterPortrait();
      renderEnchantTable();
    } catch {
      restoreDealerSimulatorSnapshot(snapshot);
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
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function restoreSimulatedAuraToBase() {
    const simulator = state.dealerSimulator;
    if (!simulator) return false;
    simulator.simulatedAura = mergeAuraBodyWithEmblems(
      simulator.baseAura || {},
      simulator.simulatedAura || {},
    );
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function restoreSimulatedCreatureToBase() {
    const simulator = state.dealerSimulator;
    if (!simulator) return false;
    simulator.simulatedCreature = cloneSimulatorValue(simulator.baseCreature || {});
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function restoreSimulatedTitleToBase() {
    const simulator = state.dealerSimulator;
    if (!simulator) return false;
    simulator.simulatedTitle = cloneSimulatorValue(simulator.baseTitle || {});
    rebuildDealerSimulatorCalculationState();
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
    rebuildDealerSimulatorCalculationState();
    return true;
  }

  function removeActiveOathAcquisitionRecommendation(recommendationId) {
    const simulator = state.dealerSimulator;
    const row = state.dealerSimulatorRecommendations.get(recommendationId);
    if (!simulator || simulator.applyingRecommendationId || !row) return;
    const descriptors = getOathAcquisitionSelectionDescriptors(row);
    const selections = descriptors
      .map((descriptor) => simulator.activeSelectionByGroup?.[descriptor.exclusiveGroupKey])
      .filter(Boolean);
    if (!selections.length) return;
    const snapshot = getDealerSimulatorSnapshot();
    const previousOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const primaryRestoreSnapshot = selections[0]?.beforeAcquisitionSnapshot;
    descriptors.forEach((descriptor) => {
      const selection = simulator.activeSelectionByGroup?.[descriptor.exclusiveGroupKey];
      const restoreSnapshot = selection?.beforeAcquisitionSnapshot;
      const previousCrystal = (restoreSnapshot?.simulatedOathUpgrades?.crystals || [])
        .find((crystal) => Number(crystal?.index) === Number(descriptor.entry.slotIndex));
      const currentCrystals = simulator.simulatedOathUpgrades?.crystals || [];
      const currentIndex = currentCrystals.findIndex(
        (crystal) => Number(crystal?.index) === Number(descriptor.entry.slotIndex),
      );
      if (previousCrystal && currentIndex >= 0) {
        const currentSetPoint = Number(currentCrystals[currentIndex]?.setPoint || 0);
        const previousSetPoint = Number(previousCrystal.setPoint || 0);
        simulator.simulatedOathUpgrades.setPoint = Number(simulator.simulatedOathUpgrades.setPoint || 0)
          - currentSetPoint
          + previousSetPoint;
        currentCrystals.splice(currentIndex, 1, cloneSimulatorValue(previousCrystal));
      }
      delete simulator.activeSelectionByGroup[descriptor.exclusiveGroupKey];
      const restoredSelection = restoreSnapshot?.activeSelectionByGroup?.[descriptor.exclusiveGroupKey];
      if (restoredSelection) {
        simulator.activeSelectionByGroup[descriptor.exclusiveGroupKey] = cloneSimulatorValue(restoredSelection);
      }
    });
    const hasActiveOathAcquisition = Object.keys(simulator.activeSelectionByGroup || {})
      .some((groupKey) => groupKey.startsWith('oathAcquire:'));
    delete simulator.activeSelectionByGroup.oathTune;
    if (!hasActiveOathAcquisition && simulator.suspendedOathTune) {
      simulator.simulatedOathUpgrades = cloneSimulatorValue(
        simulator.suspendedOathTune.oathUpgrades || simulator.simulatedOathUpgrades,
      );
      simulator.activeSelectionByGroup.oathTune = cloneSimulatorValue(
        simulator.suspendedOathTune.selection,
      );
      simulator.suspendedOathTune = null;
    } else if (!hasActiveOathAcquisition && primaryRestoreSnapshot?.simulatedOathUpgrades) {
      simulator.simulatedOathUpgrades = cloneSimulatorValue(
        primaryRestoreSnapshot.simulatedOathUpgrades,
      );
    }
    syncOathTuneStageDisplay(simulator.simulatedOathUpgrades, simulator.oathTuneDb);
    const restoredOathTune = simulator.activeSelectionByGroup.oathTune;
    state.tuneStepIndexBySource = {
      ...(state.tuneStepIndexBySource || {}),
      oathTune: Number(restoredOathTune?.selectedVariantIndex || 0),
    };
    rebuildDealerSimulatorCalculationState();
    simulator.history.push(snapshot);
    simulator.totalGold = getDealerSimulatorTotalGold(simulator);
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
  }

  function removeActiveDealerSimulatorSelection(exclusiveGroupKey) {
    const simulator = state.dealerSimulator;
    if (!simulator || simulator.applyingRecommendationId || !exclusiveGroupKey) return;
    const selection = simulator.activeSelectionByGroup?.[exclusiveGroupKey];
    if (!selection) return;
    const snapshot = getDealerSimulatorSnapshot();
    if (selection.actionType === 'oathTunePlan') {
      const previousOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
      simulator.simulatedOathUpgrades = cloneSimulatorValue(
        selection.beforeTuneSnapshot || simulator.baseOathUpgrades || {},
      );
      rebuildDealerSimulatorCalculationState();
      simulator.history.push(snapshot);
      delete simulator.activeSelectionByGroup[exclusiveGroupKey];
      simulator.totalGold = getDealerSimulatorTotalGold(simulator);
      simulator.selectedRecommendationId = '';
      simulator.lastChangedTarget = {
        targetTab: selection.targetTab,
        targetSlot: selection.targetSlot,
        applyType: selection.applyType,
      };
      state.tuneStepIndexBySource = {
        ...(state.tuneStepIndexBySource || {}),
        oathTune: 0,
      };
      state.enchantLoadoutTab = selection.targetTab || 'oath';
      getChangedOathTuneSlots(previousOath, simulator.simulatedOathUpgrades)
        .forEach(triggerDealerSimulatorSweep);
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return;
    }
    if (selection.actionType === 'equipmentTunePlan') {
      const previousEquipment = cloneSimulatorValue(simulator.simulatedEquipmentUpgrades || []);
      simulator.simulatedEquipmentUpgrades = cloneSimulatorValue(
        selection.beforeTuneSnapshot || simulator.baseEquipmentUpgrades || [],
      );
      rebuildDealerSimulatorCalculationState();
      simulator.history.push(snapshot);
      delete simulator.activeSelectionByGroup[exclusiveGroupKey];
      simulator.totalGold = getDealerSimulatorTotalGold(simulator);
      simulator.selectedRecommendationId = '';
      simulator.lastChangedTarget = {
        targetTab: selection.targetTab,
        targetSlot: selection.targetSlot,
        applyType: selection.applyType,
      };
      state.tuneStepIndexBySource = {
        ...(state.tuneStepIndexBySource || {}),
        equipmentTune: 0,
      };
      state.equipmentTuneStepIndex = 0;
      state.enchantLoadoutTab = selection.targetTab || 'equipment';
      getChangedEquipmentTuneSlots(
        previousEquipment,
        simulator.simulatedEquipmentUpgrades,
      ).forEach(triggerDealerSimulatorSweep);
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return;
    }
    const restored = selection.applyType === 'replaceAura'
      ? restoreSimulatedAuraToBase()
      : selection.applyType === 'replaceCreature'
        ? restoreSimulatedCreatureToBase()
        : selection.applyType === 'replaceTitle'
          ? restoreSimulatedTitleToBase()
          : selection.applyType === 'replaceBlackFangBody'
            ? restoreSimulatedEquipmentBodyToBase(selection.targetSlot)
          : restoreSimulatedEnchantSlotToBase(selection.targetSlot);
    if (!restored) return;
    simulator.history.push(snapshot);
    delete simulator.activeSelectionByGroup[exclusiveGroupKey];
    simulator.totalGold = getDealerSimulatorTotalGold(simulator);
    simulator.selectedRecommendationId = '';
    simulator.lastChangedTarget = {
      targetTab: selection.targetTab,
      targetSlot: selection.targetSlot,
      applyType: selection.applyType,
    };
    state.enchantLoadoutTab = selection.targetTab || 'equipment';
    triggerDealerSimulatorSweep(selection.targetSlot);
    renderEnchantCharacterPortrait();
    renderEnchantTable();
  }

  function undoDealerSimulator() {
    const simulator = state.dealerSimulator;
    if (!simulator?.history.length || simulator.applyingRecommendationId) return;
    const snapshot = simulator.history.pop();
    const changedSlot = simulator.lastChangedTarget?.targetSlot || snapshot?.lastChangedTarget?.targetSlot || '';
    const changedTuneSlots = getChangedEquipmentTuneSlots(
      simulator.simulatedEquipmentUpgrades,
      snapshot?.simulatedEquipmentUpgrades,
    );
    const changedOathTuneSlots = getChangedOathTuneSlots(
      simulator.simulatedOathUpgrades,
      snapshot?.simulatedOathUpgrades,
    );
    restoreDealerSimulatorSnapshot(snapshot);
    if (changedOathTuneSlots.length) changedOathTuneSlots.forEach(triggerDealerSimulatorSweep);
    else if (changedTuneSlots.length) changedTuneSlots.forEach(triggerDealerSimulatorSweep);
    else triggerDealerSimulatorSweep(changedSlot);
    state.enchantLoadoutTab = changedOathTuneSlots.length
      ? 'oath'
      : snapshot?.lastChangedTarget?.targetTab || 'equipment';
    renderEnchantCharacterPortrait();
    renderEnchantTable();
  }

  function clearDealerSimulator() {
    const simulator = state.dealerSimulator;
    if (!simulator || simulator.applyingRecommendationId) return;
    simulator.simulatedEnchants = cloneSimulatorValue(simulator.baseEnchants);
    simulator.simulatedEquipmentUpgrades = cloneSimulatorValue(simulator.baseEquipmentUpgrades);
    simulator.simulatedAura = cloneSimulatorValue(simulator.baseAura);
    simulator.simulatedCreature = cloneSimulatorValue(simulator.baseCreature);
    simulator.simulatedTitle = cloneSimulatorValue(simulator.baseTitle);
    simulator.simulatedOathUpgrades = cloneSimulatorValue(simulator.baseOathUpgrades);
    rebuildDealerSimulatorCalculationState();
    simulator.totalGold = 0;
    simulator.history = [];
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
    state.equipmentTuneStepIndex = 0;
    state.enchantLoadoutTab = 'equipment';
    renderEnchantCharacterPortrait();
    renderEnchantTable();
  }

  function buildEnchantPortraitSlotData() {
    const equipmentBySlot = new Map(
      (getActiveEquipmentUpgrades() || [])
        .filter((item) => item?.slot)
        .map((item) => [item.slot, item]),
    );
    const baseEquipmentBySlot = new Map(
      (state.dealerSimulator?.baseEquipmentUpgrades || state.currentEquipmentUpgrades || [])
        .filter((item) => item?.slot)
        .map((item) => [item.slot, item]),
    );
    const enchantBySlot = new Map(
      (getActiveEnchants() || [])
        .filter((item) => item?.slot)
        .map((item) => [item.slot, item]),
    );

    const slotData = {};

    SLOT_ORDER.forEach((slot) => {
      if (equipmentBySlot.has(slot)) {
        const equipment = equipmentBySlot.get(slot) || {};
        const enchant = enchantBySlot.get(slot) || {};
        const reinforceSkillText = formatReinforceSkills(
          enchant.reinforceSkill || [],
          state.currentBufferBaseline?.jobName || '',
        );
        const enchantDetailText = [
          enchant.simulatedEnchantItemName ? `마법부여: ${enchant.simulatedEnchantItemName}` : '',
          formatEffects(enchant.effects || {}),
          reinforceSkillText,
        ].filter(Boolean).join(' / ') || '없음';
        const enchantBadge = getEnchantBadge(
          enchant.effects || {},
          enchant.reinforceSkill || [],
          state.currentBufferBaseline,
        );
        const baseTuneLevel = Number(baseEquipmentBySlot.get(slot)?.tuneLevel || 0);
        const simulatedTuneLevel = Number(equipment.tuneLevel || 0);
        const isSimulatedTune = simulatedTuneLevel !== baseTuneLevel;
        const isSimulatedEquipmentBody = Boolean(
          baseEquipmentBySlot.get(slot)?.itemId &&
          equipment.itemId !== baseEquipmentBySlot.get(slot)?.itemId,
        );
        const tuneBadge = getEquipmentTuneBadge(equipment);
        if (tuneBadge) {
          tuneBadge.baseDisplayLevel = Math.max(
            0,
            Math.min(tuneBadge.displayLevel, Math.floor(baseTuneLevel)),
          );
        }
        slotData[slot] = {
          label: slot,
          iconUrl: equipment.iconUrl || '',
          itemName: equipment.itemName || slot,
          itemRarity: equipment.itemRarity || '',
          enchantBadge,
          isSimulatedEnchant: Boolean(enchant.simulatedEnchantItemName),
          upgradeBadge: getUpgradeBadge(equipment),
          tuneBadge,
          isSimulatedTune,
          hoverLines: [
            isSimulatedEquipmentBody ? {
              text: `장비 옵션: ${formatEffects(equipment.bodyEffects || {}) || '없음'}`,
              className: 'enchant-portrait-detail-line-effect',
            } : null,
            { text: enchantDetailText, className: 'enchant-portrait-detail-line-effect' },
            getUpgradeDetailLine(equipment),
            isSimulatedTune ? {
              text: `조율 ${baseTuneLevel}회 → ${simulatedTuneLevel}회`,
              className: 'enchant-portrait-detail-line-effect',
            } : null,
          ].filter(Boolean),
        };
      }
    });

    const title = getActiveTitle() || {};
    const titleMainOption = formatTitleDetailMainOption(title);
    const titleBufferOption = state.currentBufferBaseline?.isBuffer
      ? String(title.itemBuff?.explain || '').replace(/\s+/g, ' ').trim()
      : '';
    const titleAllSkillOption = formatItemBuffLevelRanges(title.itemBuff || {});
    const titleStatOption = formatTitleMajorEffects(
      title.effects || {},
      state.currentBufferBaseline?.isBuffer,
      Boolean(title.titleEnchantElement),
    );
    slotData.칭호 = {
      label: '칭호',
      iconUrl: title.iconUrl || '',
      itemName: title.itemName || '칭호',
      itemRarity: title.itemRarity || '',
      enchantBadge: getRoleEquipmentBadge(title.effects || {}, state.currentBufferBaseline?.isBuffer),
      hoverLines: [
        titleMainOption ? { text: titleMainOption, className: 'enchant-portrait-detail-line-effect' } : null,
        titleBufferOption ? { text: titleBufferOption, className: 'enchant-portrait-detail-line-effect' } : null,
        titleAllSkillOption ? { text: titleAllSkillOption, className: 'enchant-portrait-detail-line-effect' } : null,
        { text: titleStatOption || '없음', className: 'enchant-portrait-detail-line-effect' },
      ],
    };

    const creature = getActiveCreature() || {};
    const creatureMainOption = formatCreatureDetailMainOption(creature);
    const creatureNamedSkillOption = formatMatchedReinforceSkills(creature.reinforceSkills || []);
    const creatureBufferOption = state.currentBufferBaseline?.isBuffer
      ? String(creature.itemBuff?.explain || '').replace(/\s+/g, ' ').trim()
      : '';
    const creatureAllSkillOption = formatItemBuffLevelRanges(creature.itemBuff || {});
    const creatureStatOption = formatTitleMajorEffects(
      creature.effects || {},
      state.currentBufferBaseline?.isBuffer,
    );
    const creatureHoverLines = [
      creatureMainOption,
      creatureBufferOption,
      creatureAllSkillOption,
      creatureNamedSkillOption,
      creatureStatOption,
    ].filter(Boolean);
    slotData.크리쳐 = {
      label: '크리쳐',
      iconUrl: creature.iconUrl || '',
      itemName: creature.itemName || '크리쳐',
      itemRarity: creature.itemRarity || '',
      artifacts: Array.isArray(state.currentCreature?.artifacts) ? state.currentCreature.artifacts : [],
      enchantBadge: getRoleEquipmentBadge(creature.effects || {}, state.currentBufferBaseline?.isBuffer),
      hoverLines: (creatureHoverLines.length ? creatureHoverLines : ['없음'])
        .map((text) => ({ text, className: 'enchant-portrait-detail-line-effect' })),
    };

    const aura = getActiveAura() || {};
    const auraNamedSkillOption = formatMatchedReinforceSkills(aura.reinforceSkills || []);
    const auraStatOption = formatTitleMajorEffects(
      aura.effects || {},
      state.currentBufferBaseline?.isBuffer,
    );
    const auraHoverLines = [auraNamedSkillOption, auraStatOption].filter(Boolean);
    slotData.오라 = {
      label: '오라',
      iconUrl: aura.iconUrl || '',
      itemName: aura.itemName || '오라',
      itemRarity: aura.itemRarity || '',
      enchantBadge: getRoleEquipmentBadge(aura.effects || {}, state.currentBufferBaseline?.isBuffer),
      hoverLines: (auraHoverLines.length ? auraHoverLines : ['없음'])
        .map((text) => ({ text, className: 'enchant-portrait-detail-line-effect' })),
    };

    return slotData;
  }

  function renderCreatureArtifactRail(artifacts = []) {
    const artifactByColor = new Map(
      artifacts
        .filter((artifact) => ['RED', 'BLUE', 'GREEN'].includes(String(artifact?.slotColor || '').trim().toUpperCase()))
        .map((artifact) => [String(artifact.slotColor).trim().toUpperCase(), artifact]),
    );
    return `
      <span class="enchant-creature-artifact-rail" aria-label="크리쳐 아티팩트">
        ${[
          ['RED', 'creatureArtifactRed'],
          ['BLUE', 'creatureArtifactBlue'],
          ['GREEN', 'creatureArtifactGreen'],
        ].map(([color, key]) => {
          const artifact = artifactByColor.get(color) || null;
          const itemName = String(artifact?.itemName || '').trim();
          const iconUrl = String(artifact?.iconUrl || '').trim();
          const rarityClass = getLoadoutRarityClass(artifact);
          const mainOptionText = artifact
            ? formatEffects(getCreatureArtifactDisplayEffects(
              { sourceType: 'creatureArtifact', ...artifact },
              getActiveDamageBaseline(),
              artifact.element,
            ))
            : '';
          const detailLines = itemName
            ? [{
              text: mainOptionText || '표시할 효과가 없습니다.',
              className: mainOptionText
                ? 'enchant-portrait-detail-line-effect'
                : 'enchant-portrait-detail-line-sub',
            }]
            : [];
          return `
            <span class="enchant-character-slot enchant-creature-artifact-slot enchant-creature-artifact-slot-${color.toLowerCase()}${itemName ? '' : ' is-empty'}${rarityClass ? ` ${escapeHtml(rarityClass)}` : ''}" data-creature-artifact-slot-key="${key}"${itemName ? ` tabindex="0" aria-label="${escapeHtml(itemName)}" data-detail-title="${escapeHtml(itemName)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}"` : ` aria-label="${color} 아티팩트 비어 있음"`}>
              ${iconUrl
                ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" decoding="async" />`
                : '<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>'}
            </span>
          `;
        }).join('')}
      </span>
    `;
  }

  function renderEnchantPortraitSlotMarkup(layout, slotData) {
    const { slot, key, side } = layout;
    const data = slotData?.[slot];
    const isEmpty = !data?.iconUrl;
    const title = data?.itemName || slot;
    const rarityClass = getLoadoutRarityClass(data?.itemRarity);
    const hoverLines = [title, ...((data?.hoverLines || []).filter(Boolean))];
    if (isEmpty) {
      hoverLines.splice(1, hoverLines.length - 1, { text: '장착 정보 없음', className: 'enchant-portrait-detail-line-sub' });
    }
    const detailLines = hoverLines.slice(1).map((line) => (typeof line === 'string' ? { text: line, className: '' } : line));
    const activeSweep = state.dealerSimulator?.activeSweepSlots?.get(slot);
    const sweepElapsedMs = activeSweep ? Date.now() - activeSweep.startedAt : DEALER_SIMULATOR_SWEEP_DURATION_MS;
    const hasActiveSweep = sweepElapsedMs >= 0 && sweepElapsedMs < DEALER_SIMULATOR_SWEEP_DURATION_MS;
    const sweepStyle = hasActiveSweep ? ` style="--simulator-sweep-delay: -${Math.floor(sweepElapsedMs)}ms"` : '';
    return `
      <span class="enchant-character-slot-wrap enchant-character-slot-wrap-${escapeHtml(key)} enchant-character-slot-wrap-${escapeHtml(side)}${hasActiveSweep ? ' is-simulator-sweep' : ''}"${sweepStyle}>
        <span class="enchant-character-slot${isEmpty ? ' is-empty' : ''}${rarityClass ? ` ${escapeHtml(rarityClass)}` : ''}" tabindex="0" aria-label="${escapeHtml(title)}" data-detail-title="${escapeHtml(title)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}">
          ${data?.iconUrl
            ? `<img src="${escapeHtml(data.iconUrl)}" alt="" loading="lazy" decoding="async" />`
            : `<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>`}
          ${data?.enchantBadge
            ? `<span class="enchant-character-slot-enchant-badges"><span class="enchant-character-slot-enchant-badge${data.isSimulatedEnchant ? ' is-simulated' : ''}">${escapeHtml(data.enchantBadge.text)}</span></span>`
            : ''}
        </span>
        ${data?.upgradeBadge
          ? `<span class="enchant-character-slot-badge enchant-character-slot-badge-${escapeHtml(data.upgradeBadge.kind)}">${escapeHtml(data.upgradeBadge.text)}</span>`
          : ''}
        ${data?.tuneBadge
          ? `<span class="enchant-character-slot-tune-mark${data.isSimulatedTune ? ' is-simulated-equipment-tune' : ''}" role="img" title="${escapeHtml(data.tuneBadge.label)}" aria-label="${escapeHtml(data.tuneBadge.label)}">${Array.from({ length: data.tuneBadge.displayLevel }).map((_, index) => `<span class="enchant-character-slot-tune-bar${index >= Number(data.tuneBadge.baseDisplayLevel || 0) ? ' is-simulated' : ''}" aria-hidden="true"></span>`).join('')}</span>`
          : ''}
        ${slot === '크리쳐' ? renderCreatureArtifactRail(data?.artifacts || []) : ''}
      </span>
    `;
  }

  function buildEnchantPortraitSlotMarkup() {
    const slotData = buildEnchantPortraitSlotData();
    return ENCHANT_PORTRAIT_SLOT_LAYOUT.map((layout) => renderEnchantPortraitSlotMarkup(layout, slotData)).join('');
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

  function getOathLoadoutSlots() {
    const activeOath = getActiveOathUpgrades();
    const sortedCrystals = Array.isArray(activeOath?.crystals)
      ? activeOath.crystals
        .filter(Boolean)
        .slice()
        .sort((a, b) => Number(a?.index || 0) - Number(b?.index || 0))
      : [];
    const crystals = arrangeSimulatedPrimevalOathSlots(
      sortedCrystals,
      state.dealerSimulator || {},
    );
    const fillSlots = (items, count) => Array.from({ length: count }, (_, index) => items[index] || null);

    return {
      left: fillSlots(crystals.slice(0, OATH_LOADOUT_SIDE_SLOT_COUNT), OATH_LOADOUT_SIDE_SLOT_COUNT),
      right: fillSlots(crystals.slice(OATH_LOADOUT_SIDE_SLOT_COUNT, OATH_LOADOUT_SIDE_SLOT_COUNT * 2), OATH_LOADOUT_SIDE_SLOT_COUNT),
      bottom: fillSlots(crystals.slice(OATH_LOADOUT_SIDE_SLOT_COUNT * 2, OATH_LOADOUT_SIDE_SLOT_COUNT * 2 + OATH_LOADOUT_BOTTOM_SLOT_COUNT), OATH_LOADOUT_BOTTOM_SLOT_COUNT),
    };
  }

  function getOathCrystalRarityClass(crystal) {
    return getLoadoutRarityClass(crystal);
  }

  function getOathStatDisplayValue(effects = {}, statName = '') {
    const name = String(statName || '').trim();
    if (!name) return 0;
    const directKey = name === '힘' ? 'str' : name === '지능' ? 'int' : '';
    return Number(effects.allStat || 0) + (directKey ? Number(effects[directKey] || 0) : 0);
  }

  function buildOathDetailLines(oathItem = {}) {
    const effects = oathItem.effects || {};
    const isBuffer = Boolean(state.currentBufferBaseline?.isBuffer);
    const parts = [];
    if (isBuffer) {
      const buffPower = Number(effects.buffPower || 0);
      const statName = String(state.currentBufferBaseline?.statName || '').trim();
      const statValue = getOathStatDisplayValue(effects, statName);
      if (Number.isFinite(buffPower) && buffPower > 0) {
        parts.push(formatEffectValue('buffPower', buffPower));
      }
      if (statName && Number.isFinite(statValue) && statValue > 0) {
        parts.push(`${statName} +${formatEffectNumber(statValue)}`);
      }
    } else {
      const finalDamage = Number(effects.finalDamage || 0);
      const activeDamageBaseline = getActiveDamageBaseline() || {};
      const primaryKey = getDealerPrimaryStatKey(activeDamageBaseline);
      const normalizedEffects = normalizeDealerEnchantDisplayEffects(effects, activeDamageBaseline);
      const primaryStat = Number(normalizedEffects[primaryKey] || 0);
      if (Number.isFinite(finalDamage) && finalDamage > 0) {
        parts.push(formatEffectValue('finalDamage', finalDamage));
      }
      if (primaryKey && Number.isFinite(primaryStat) && primaryStat > 0) {
        parts.push(`${EFFECT_LABELS[primaryKey]} +${formatEffectNumber(primaryStat)}`);
      }
    }
    return parts.length
      ? [{ text: parts.join(' / '), className: 'enchant-portrait-detail-line-effect' }]
      : [{ text: '표시할 효과가 없습니다.', className: 'enchant-portrait-detail-line-sub' }];
  }

  function renderOathLoadoutSlot(crystal, index, area) {
    const itemName = String(crystal?.itemName || '').trim();
    const rarity = String(crystal?.itemRarity || '').trim();
    const iconUrl = String(crystal?.iconUrl || '').trim();
    const title = itemName || `빈 서약 슬롯 ${index + 1}`;
    const rarityClass = getOathCrystalRarityClass(crystal);
    const oathIndex = Number.isFinite(Number(crystal?.index)) ? Number(crystal.index) : index;
    const baseCrystal = (state.dealerSimulator?.baseOathUpgrades?.crystals || [])
      .find((item) => Number(item?.index) === oathIndex);
    const detailLines = crystal ? buildOathDetailLines(crystal) : [];
    const tuneLevel = Math.max(0, Math.min(3, Math.floor(Number(crystal?.tuneLevel || 0))));
    const baseTuneLevel = Math.max(0, Math.min(tuneLevel, Math.floor(Number(baseCrystal?.tuneLevel || 0))));
    const isSimulatedTune = tuneLevel !== baseTuneLevel;
    const hasActiveSweep = Boolean(state.dealerSimulator?.activeSweepSlots?.has(`oath:${oathIndex}`));
    const sweepEntry = state.dealerSimulator?.activeSweepSlots?.get(`oath:${oathIndex}`);
    const sweepStyle = hasActiveSweep
      ? ` style="--simulator-sweep-delay: ${Math.max(0, Math.min(120, Date.now() - Number(sweepEntry?.startedAt || Date.now())))}ms"`
      : '';
    const detailAttrs = crystal
      ? ` tabindex="0" data-oath-index="${escapeHtml(String(oathIndex))}" data-detail-title="${escapeHtml(title)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}"`
      : '';
    return `
      <span class="enchant-oath-slot${iconUrl ? '' : ' is-empty'} ${escapeHtml(rarityClass)}${hasActiveSweep ? ' is-simulator-sweep' : ''}" aria-label="${escapeHtml(title)}" data-oath-area="${escapeHtml(area)}"${detailAttrs}${sweepStyle}>
        ${iconUrl
          ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" decoding="async" />`
          : '<span class="enchant-oath-slot-placeholder" aria-hidden="true"></span>'}
        ${crystal && tuneLevel > 0
          ? `<span class="enchant-character-slot-tune-mark${isSimulatedTune ? ' is-simulated-equipment-tune' : ''}" role="img" aria-label="조율 ${escapeHtml(String(tuneLevel))}회">${Array.from({ length: tuneLevel }).map((_, tuneIndex) => `<span class="enchant-character-slot-tune-bar${tuneIndex >= baseTuneLevel ? ' is-simulated' : ''}" aria-hidden="true"></span>`).join('')}</span>`
          : ''}
      </span>
    `;
  }

  function renderOathLoadoutColumn(slots, area) {
    return `
      <div class="enchant-oath-column enchant-oath-column-${escapeHtml(area)}">
        ${slots.map((crystal, index) => renderOathLoadoutSlot(crystal, index, area)).join('')}
      </div>
    `;
  }

  function getOathSymbolSetKey(oath = {}) {
    const text = String(oath.itemName || '');
    const match = OATH_SYMBOL_SET_KEYWORDS.find(([keyword]) => text.includes(keyword));
    return match?.[1] || '';
  }

  function getOathSymbolRarityKey(oath = {}) {
    const rarity = String(oath.itemRarity || '').trim();
    if (rarity.includes('레어')) return 'rare';
    if (rarity.includes('태초')) return 'primeval';
    if (rarity.includes('에픽')) return 'epic';
    if (rarity.includes('레전더리')) return 'legendary';
    if (rarity.includes('유니크')) return 'unique';
    return '';
  }

  function getLocalOathSymbolIconUrl(oath = {}) {
    const setKey = getOathSymbolSetKey(oath);
    const rarityKey = getOathSymbolRarityKey(oath);
    const folder = OATH_SYMBOL_SET_FOLDERS[setKey];
    const fileName = OATH_SYMBOL_FILES_BY_RARITY[rarityKey];
    if (!folder || !fileName) return '';
    return OATH_SYMBOL_ASSETS[`../../이미지/Oath/${folder}/${fileName}`] || '';
  }

  function renderOathLoadoutBoard() {
    const oath = getActiveOathUpgrades() || {};
    const slots = getOathLoadoutSlots();
    const setName = String(oath.setName || '').trim();
    const setOptionName = String(oath.setOptionName || '').trim();
    const setRarityName = String(oath.setRarityName || oath.itemRarity || '').trim();
    const setOptionSuffix = formatOathStageRomanSuffix(setRarityName);
    const setOptionTitle = setOptionName
      ? [setOptionName, setOptionSuffix].filter(Boolean).join(' ')
      : '';
    const setOptionRarityClass = getOathStageRarityClass(setRarityName);
    const setPoint = Number(oath.setPoint || 0);
    const oathIconUrl = getLocalOathSymbolIconUrl(oath) || String(oath.iconUrl || '').trim();
    const oathItemName = String(oath.itemName || '').trim();
    const oathRarityClass = getOathCrystalRarityClass(oath);
    const oathSymbolClass = ['enchant-oath-symbol', oathRarityClass].filter(Boolean).join(' ');
    const oathFallbackSymbolClass = ['enchant-oath-symbol', 'is-fallback', oathRarityClass].filter(Boolean).join(' ');
    const oathDetailLines = oathItemName ? buildOathDetailLines(oath) : [];
    const oathDetailAttrs = oathItemName
      ? ` tabindex="0" aria-label="${escapeHtml(oathItemName)}" data-oath-symbol-detail="1" data-detail-title="${escapeHtml(oathItemName)}" data-detail-lines="${escapeHtml(JSON.stringify(oathDetailLines))}"`
      : '';
    const hasCrystals = Array.isArray(oath.crystals) && oath.crystals.length > 0;
    return `
      <div class="enchant-oath-board" aria-label="서약 결정 장착 정보">
        <img class="enchant-oath-board-bg" src="${escapeHtml(OATH_BOARD_BG_URL)}" alt="" loading="lazy" decoding="async" aria-hidden="true" />
        ${renderOathLoadoutColumn(slots.left, 'left')}
        <div class="enchant-oath-center">
          ${oathIconUrl
            ? `<span class="${escapeHtml(oathSymbolClass)}"${oathDetailAttrs}><img src="${escapeHtml(oathIconUrl)}" alt="" loading="lazy" decoding="async" data-oath-symbol-image /><span class="enchant-oath-symbol-fallback" aria-hidden="true">서약</span></span>`
            : `<span class="${escapeHtml(oathFallbackSymbolClass)}"${oathDetailAttrs}><span class="enchant-oath-symbol-fallback" aria-hidden="true">서약</span></span>`}
          <strong class="enchant-oath-center-name enchant-oath-stage-${escapeHtml(setOptionRarityClass)}">${escapeHtml(setOptionTitle || (hasCrystals ? '' : '서약 정보 없음'))}</strong>
          ${Number.isFinite(setPoint) && setPoint > 0
            ? `<span class="enchant-oath-center-point">세트 포인트 ${escapeHtml(setPoint.toLocaleString('ko-KR'))}</span>`
            : ''}
        </div>
        ${renderOathLoadoutColumn(slots.right, 'right')}
        <div class="enchant-oath-bottom">
          ${slots.bottom.map((crystal, index) => renderOathLoadoutSlot(crystal, index, 'bottom')).join('')}
        </div>
      </div>
    `;
  }

  function getAvatarLoadoutSlotsById() {
    const slots = state.currentAvatar?.avatar?.slots;
    if (!Array.isArray(slots)) {
      return {};
    }
    const slotsById = slots.reduce((map, slot) => {
      const slotId = String(slot?.slotId || '').trim();
      if (slotId) {
        map[slotId] = slot;
      }
      return map;
    }, {});
    const activeAura = getActiveAura();
    if (activeAura && Object.keys(activeAura).length) {
      const currentAuraSlot = slotsById.AURORA || {};
      slotsById.AURORA = {
        ...currentAuraSlot,
        ...cloneSimulatorValue(activeAura),
        slotId: 'AURORA',
        slotName: currentAuraSlot.slotName || '오라 아바타',
      };
    }
    return slotsById;
  }

  function hasAvatarEmblemIdentity(emblem = {}) {
    return Boolean(String(
      emblem.itemId
        || emblem.itemName
        || emblem.name
        || emblem.emblemName
        || '',
    ).trim());
  }

  function getAvatarSlotEmblems(avatarSlot = {}) {
    const emblems = avatarSlot.emblems || avatarSlot.emblem || avatarSlot.emblemItems || [];
    return Array.isArray(emblems) ? emblems.filter(hasAvatarEmblemIdentity) : [];
  }

  function getAvatarSlotPlatinumEmblems(avatarSlot = {}) {
    const emblems = avatarSlot.platinumEmblems || avatarSlot.platinumEmblemItems || [];
    return Array.isArray(emblems) ? emblems.filter(hasAvatarEmblemIdentity) : [];
  }

  function isPlatinumAvatarEmblem(emblem = {}) {
    const text = [
      emblem.itemName,
      emblem.name,
      emblem.emblemName,
      emblem.slotColor,
      emblem.color,
    ].filter(Boolean).join(' ');
    return /플래티넘|platinum/i.test(text);
  }

  function getAvatarEmblemDisplayColor(itemName = '', slotColor = '') {
    const itemText = String(itemName || '').trim();
    const slotText = String(slotColor || '').trim();
    if (!itemText) return 'gray';
    const getFixedColor = (text) => {
      if (text.includes('붉은빛')) return 'red';
      if (/노란빛|옐로우/.test(text)) return 'yellow';
      if (/녹색빛|그린/.test(text)) return 'green';
      if (text.includes('푸른빛')) return 'blue';
      return '';
    };
    const fixedSlotColor = ['red', 'yellow', 'green', 'blue'].includes(slotText)
      ? slotText
      : getFixedColor(slotText);
    const isMulticolorSlot = slotText === '다색';
    if (fixedSlotColor) return fixedSlotColor;

    if (itemText.includes('듀얼')) {
      if (isMulticolorSlot) return /힘|지능/.test(itemText) ? 'red' : 'yellow';
      return 'gray';
    }

    const itemColor = getFixedColor(itemText);
    if (itemColor) return itemColor;
    if (itemText.includes('다색')) return 'red';
    return 'gray';
  }

  function getAvatarEmblemColor(slotKey, emblem = {}) {
    const itemName = emblem.itemName || emblem.name || emblem.emblemName || '';
    const slotColor = AVATAR_FIXED_EMBLEM_COLOR_BY_SLOT_KEY[slotKey]
      || emblem.slotColor
      || emblem.color
      || '';
    return getAvatarEmblemDisplayColor(itemName, slotColor);
  }

  function getAvatarEmblemBadgeColors(slotKey, avatarSlot = {}) {
    const normalEmblems = getAvatarSlotEmblems(avatarSlot).filter((emblem) => !isPlatinumAvatarEmblem(emblem));
    const colors = normalEmblems
      .slice(0, 2)
      .map((emblem) => getAvatarEmblemColor(slotKey, emblem));
    while (colors.length < 2) {
      colors.push('gray');
    }
    return colors;
  }

  function getAvatarEmblemDetailColor(slotKey, emblem = {}) {
    return getAvatarEmblemColor(slotKey, emblem);
  }

  function getAvatarPlatinumDetailLine(slotKey, avatarSlot = {}) {
    const slotLabel = AVATAR_PLATINUM_SLOT_LABEL_BY_KEY[slotKey];
    if (!slotLabel) {
      return null;
    }
    const platinumEmblems = getAvatarSlotPlatinumEmblems(avatarSlot).filter(isPlatinumAvatarEmblem);
    const platinumName = String(
      platinumEmblems[0]?.itemName
        || platinumEmblems[0]?.name
        || platinumEmblems[0]?.emblemName
        || '',
    ).trim();
    const platinumSlots = state.currentAvatar?.avatar?.platinumSlots;
    const hasPlatinum = String(avatarSlot.itemRarity || '').trim() === '레어'
      && (Boolean(platinumName) || (Array.isArray(platinumSlots) && platinumSlots.includes(slotLabel)));
    return {
      text: platinumName || (hasPlatinum ? '플래티넘 엠블렘 이름 확인 불가' : '플래티넘 엠블렘 없음'),
      className: hasPlatinum
        ? 'enchant-portrait-detail-line-avatar-platinum'
        : 'enchant-portrait-detail-line-sub',
    };
  }

  function buildAvatarSlotDetailLines(slotKey, avatarSlot = {}) {
    const normalEmblems = getAvatarSlotEmblems(avatarSlot)
      .filter((emblem) => !isPlatinumAvatarEmblem(emblem))
      .slice(0, 2);
    const lines = [];
    const platinumLine = getAvatarPlatinumDetailLine(slotKey, avatarSlot);
    if (platinumLine) {
      lines.push(platinumLine);
    }
    for (let index = 0; index < 2; index += 1) {
      const emblem = normalEmblems[index];
      if (!emblem) {
        lines.push({ text: '엠블렘 없음', className: 'enchant-portrait-detail-line-sub' });
        continue;
      }
      const color = getAvatarEmblemDetailColor(slotKey, emblem);
      lines.push({
        text: String(emblem.itemName || emblem.name || emblem.emblemName || '엠블렘 이름 확인 불가').trim(),
        className: `enchant-portrait-detail-line-avatar-emblem enchant-portrait-detail-line-avatar-${color}`,
      });
    }
    return lines;
  }

  function getAvatarPlatinumBadgeState(slotKey, avatarSlot = {}) {
    const slotLabel = AVATAR_PLATINUM_SLOT_LABEL_BY_KEY[slotKey];
    if (!slotLabel) {
      return '';
    }
    if (String(avatarSlot.itemRarity || '').trim() !== '레어') {
      return '';
    }
    const platinumSlots = state.currentAvatar?.avatar?.platinumSlots;
    return Array.isArray(platinumSlots) && platinumSlots.includes(slotLabel) ? 'filled' : 'empty';
  }

  function renderAvatarLoadoutSlot(slot, slotsById) {
    if (!slot) {
      return '<span class="enchant-avatar-slot-gap" aria-hidden="true"></span>';
    }
    const label = String(slot?.label || '').trim();
    const key = String(slot?.key || '').trim();
    const slotId = AVATAR_LOADOUT_SLOT_ID_BY_KEY[key] || '';
    const avatarSlot = slotsById[slotId] || {};
    const hasAvatarItem = Boolean(String(avatarSlot.itemId || avatarSlot.itemName || '').trim());
    const itemName = String(avatarSlot.itemName || '').trim();
    const iconUrl = String(avatarSlot.iconUrl || '').trim();
    const emblemBadgeColors = hasAvatarItem ? getAvatarEmblemBadgeColors(key, avatarSlot) : [];
    const platinumBadgeState = hasAvatarItem ? getAvatarPlatinumBadgeState(key, avatarSlot) : '';
    const ariaLabel = itemName || label;
    const detailLines = itemName ? buildAvatarSlotDetailLines(key, avatarSlot) : [];
    const detailAttrs = itemName
      ? ` data-detail-title="${escapeHtml(ariaLabel)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}"`
      : '';
    return `
      <span class="enchant-avatar-slot" data-avatar-slot-key="${escapeHtml(key)}" data-avatar-slot-id="${escapeHtml(slotId)}" data-emblem-colors="${escapeHtml(emblemBadgeColors.join(','))}"${platinumBadgeState ? ` data-platinum-emblem="${escapeHtml(platinumBadgeState)}"` : ''} tabindex="0" aria-label="${escapeHtml(ariaLabel)}"${detailAttrs}>
        <span class="enchant-avatar-slot-icon" aria-hidden="true">
          ${iconUrl
            ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" decoding="async" />`
            : '<span class="enchant-avatar-slot-placeholder"></span>'}
          ${platinumBadgeState
            ? `<span class="enchant-avatar-platinum-badge enchant-avatar-platinum-badge-${escapeHtml(platinumBadgeState)}"></span>`
            : ''}
          ${emblemBadgeColors.length
            ? `<span class="enchant-avatar-emblem-badges">
                ${emblemBadgeColors.map((color) => `<span class="enchant-avatar-emblem-badge enchant-avatar-emblem-badge-${escapeHtml(color)}"></span>`).join('')}
              </span>`
            : ''}
        </span>
      </span>
    `;
  }

  function renderAvatarLoadoutBoard(character) {
    const avatarUrl = getCharacterAvatarUrl(character, 1);
    const slotsById = getAvatarLoadoutSlotsById();
    return `
      <div class="enchant-avatar-board" aria-label="아바타 장착 정보">
        <div class="enchant-avatar-preview" aria-hidden="true">
          <img class="enchant-avatar-preview-bg" src="${escapeHtml(AVATAR_LOADOUT_BG_URL)}" alt="" loading="lazy" decoding="async" />
          ${avatarUrl
            ? `<img class="enchant-avatar-preview-img" data-character-avatar src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" decoding="async" />`
            : '<span class="enchant-avatar-preview-placeholder"></span>'}
        </div>
        <div class="enchant-avatar-slots">
          ${AVATAR_LOADOUT_SLOT_ROWS.flatMap((row) => row).map((slot) => renderAvatarLoadoutSlot(slot, slotsById)).join('')}
        </div>
      </div>
    `;
  }

  function getBuffLoadoutRows(value) {
    if (Array.isArray(value)) return value.filter((row) => row && typeof row === 'object');
    return value && typeof value === 'object' ? [value] : [];
  }

  function getSwitchingSkillIconUrl(skillId, className) {
    const normalizedSkillId = String(skillId || '').trim().toLowerCase();
    const normalizedClassName = String(className || '').trim();
    if (!normalizedSkillId || !normalizedClassName) return '';
    const classFolder = ['다크나이트', '크리에이터'].includes(normalizedClassName)
      ? '외전'
      : normalizedClassName;
    const pathPart = `/이미지/스킬/${classFolder}/`;
    const fileName = `/${normalizedSkillId}.png`;
    const entry = Object.entries(SWITCHING_SKILL_ICON_ASSETS).find(([assetPath]) => (
      assetPath.includes(pathPart) && assetPath.endsWith(fileName)
    ));
    return entry?.[1] || '';
  }

  function getBuffLoadoutData() {
    const loadout = state.currentBuffLoadout || {};
    const equipmentRows = getBuffLoadoutRows(loadout.equipment);
    const equipmentBySlotName = equipmentRows.reduce((map, row) => {
      const rawSlotName = String(row?.slotName || '').trim();
      const slotName = BUFF_LOADOUT_SLOT_NAME_ALIASES[rawSlotName] || rawSlotName;
      if (slotName) map[slotName] = row;
      return map;
    }, {});
    const avatarRows = getBuffLoadoutRows(loadout.avatar);
    const avatarBySlotId = avatarRows.reduce((map, row) => {
      const slotId = String(row?.slotId || '').trim();
      if (slotId) map[slotId] = row;
      return map;
    }, {});
    const creature = getBuffLoadoutRows(loadout.creature)[0] || null;
    const skillInfo = loadout.skillInfo || {};
    const baseline = state.currentBufferBaseline || {};
    const skillId = String(skillInfo.skillId || '').trim();
    const className = String(state.enchantTargetCharacter?.jobName || baseline.jobName || '').trim();
    const skillLevel = Number(skillInfo.level || baseline.buffSkillLevel || 0);
    const maxSkillLevel = Number(skillInfo.maxLevel || 0);
    return {
      equipmentBySlotName,
      avatarBySlotId,
      creature,
      skill: {
        skillId,
        name: String(skillInfo.name || baseline.buffSkillName || '').trim(),
        level: skillLevel,
        maxLevel: maxSkillLevel,
        isMax: maxSkillLevel > 0 && skillLevel >= maxSkillLevel,
        iconUrl: String(skillInfo.iconUrl || '').trim() || getSwitchingSkillIconUrl(skillId, className),
      },
    };
  }

  function getBuffContributionDetailLines(item, label, buffSkillName) {
    const contribution = item?.buffContribution;
    const effectClass = 'enchant-portrait-detail-line-effect';
    const subClass = 'enchant-portrait-detail-line-sub';
    const skillName = String(buffSkillName || '').trim() || '버프 스킬';
    if (!contribution || typeof contribution !== 'object') {
      return [{ text: '버프강화 효과 확인 불가', className: subClass }];
    }
    const levelLine = (prefix, value) => {
      if (value === null || value === undefined) {
        return { text: `${prefix ? `${prefix}: ` : ''}확인 불가`, className: subClass };
      }
      const level = Number(value);
      return Number.isFinite(level) && level > 0
        ? { text: `${prefix ? `${prefix}: ` : ''}${skillName} Lv +${level}`, className: effectClass }
        : { text: `${prefix ? `${prefix}: ` : ''}적용 없음`, className: subClass };
    };
    if (label === '칭호') {
      return [levelLine('', contribution.skillLevel)];
    }
    if (label === '상의 아바타') {
      return [
        levelLine('상의 옵션', contribution.topOptionSkillLevel),
        levelLine('플래티넘 엠블렘', contribution.platinumSkillLevel),
      ];
    }
    if (label === '하의 아바타') {
      return [levelLine('플래티넘 엠블렘', contribution.platinumSkillLevel)];
    }
    if (label === '크리쳐') {
      return [levelLine('', contribution.skillLevel)];
    }
    const rate = contribution.additionalRatePercent;
    if (rate === null || rate === undefined) {
      return [{ text: '버프강화 추가 증가율 확인 불가', className: subClass }];
    }
    const rateNumber = Number(rate);
    return Number.isFinite(rateNumber) && rateNumber > 0
      ? [{
        text: String(contribution.additionalRateText || '').trim()
          || `스킬 공격력 증가량 ${rateNumber.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}% 추가 증가`,
        className: effectClass,
      }]
      : [{ text: '버프강화 적용 효과 없음', className: subClass }];
  }

  function renderBuffLoadoutSlot(item, label, buffSkillName, extraClass = '') {
    if (!item) {
      return `
        <span class="enchant-buff-slot ${escapeHtml(extraClass)}" aria-label="${escapeHtml(label)} 비어 있음">
          <span class="enchant-character-slot is-empty">
            <span class="enchant-character-slot-placeholder" aria-hidden="true"></span>
          </span>
        </span>
      `;
    }
    const itemName = String(item.itemName || item.name || label).trim();
    const iconUrl = String(item.iconUrl || '').trim();
    const rarityClass = getLoadoutRarityClass(item);
    const detailLines = getBuffContributionDetailLines(item, label, buffSkillName);
    return `
      <span class="enchant-buff-slot ${escapeHtml(extraClass)}" tabindex="0" aria-label="${escapeHtml(itemName)}" data-buff-loadout-detail data-detail-title="${escapeHtml(itemName)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}">
        <span class="enchant-character-slot${iconUrl ? '' : ' is-empty'}${rarityClass ? ` ${escapeHtml(rarityClass)}` : ''}">
          ${iconUrl
            ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" decoding="async" />`
            : '<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>'}
        </span>
      </span>
    `;
  }

  function renderBuffLoadoutBoard() {
    const { equipmentBySlotName, avatarBySlotId, creature, skill } = getBuffLoadoutData();
    const skillDetailLines = skill.level > 0
      ? [{ text: `Lv. ${skill.level}`, className: 'enchant-portrait-detail-line-effect' }]
      : [];
    const skillDetailAttrs = skill.name
      ? ` tabindex="0" data-buff-loadout-detail data-detail-title="${escapeHtml(skill.name)}" data-detail-lines="${escapeHtml(JSON.stringify(skillDetailLines))}"`
      : '';
    return `
      <div class="enchant-buff-board" aria-label="버프강화 장착 정보">
        <section class="enchant-buff-section enchant-buff-section-skill">
          <h3>스킬</h3>
          <div class="enchant-buff-section-body enchant-buff-skill-body"${skillDetailAttrs}>
            <span class="enchant-character-slot${skill.iconUrl ? '' : ' is-empty'}">
              ${skill.iconUrl
                ? `<img src="${escapeHtml(skill.iconUrl)}" alt="" loading="lazy" decoding="async" />`
                : '<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>'}
            </span>
            ${skill.name ? `<span class="enchant-buff-skill-name" title="${escapeHtml(skill.name)}">${escapeHtml(skill.name)}</span>` : ''}
            ${skill.level > 0 ? `<span class="enchant-buff-skill-level">Lv. ${escapeHtml(String(skill.level))}</span>` : ''}
            ${skill.isMax ? '<span class="enchant-buff-skill-max">(MAX)</span>' : ''}
          </div>
        </section>
        <section class="enchant-buff-section enchant-buff-section-equipment">
          <h3>장비</h3>
          <div class="enchant-buff-section-body">
            <div class="enchant-buff-equipment-grid">
              ${BUFF_LOADOUT_EQUIPMENT_SLOT_ROWS.flatMap((row) => row).map((slotName) => (
                slotName
                  ? renderBuffLoadoutSlot(equipmentBySlotName[slotName], slotName, skill.name, `enchant-buff-slot-${slotName}`)
                  : '<span class="enchant-buff-slot-gap" aria-hidden="true"></span>'
              )).join('')}
            </div>
          </div>
        </section>
        <section class="enchant-buff-section enchant-buff-section-avatar">
          <h3>아바타</h3>
          <div class="enchant-buff-section-body">
            <div class="enchant-buff-avatar-stack">
              ${renderBuffLoadoutSlot(avatarBySlotId.JACKET, '상의 아바타', skill.name)}
              ${renderBuffLoadoutSlot(avatarBySlotId.PANTS, '하의 아바타', skill.name)}
            </div>
          </div>
        </section>
        <section class="enchant-buff-section enchant-buff-section-creature">
          <h3>크리쳐</h3>
          <div class="enchant-buff-section-body">
            ${renderBuffLoadoutSlot(creature, '크리쳐', skill.name)}
          </div>
        </section>
      </div>
    `;
  }

  function renderEnchantLoadoutTabs(activeTab) {
    const tabs = [
      ['equipment', '장비'],
      ['oath', '서약'],
      ['avatar', '아바타'],
      ['buff', '버프강화'],
    ];
    return `
      <div class="enchant-loadout-tabs" role="tablist" aria-label="캐릭터 로드아웃">
        ${tabs.map(([value, label]) => `
          <button type="button" class="enchant-loadout-tab${activeTab === value ? ' is-active' : ''}" role="tab" aria-selected="${activeTab === value ? 'true' : 'false'}" data-enchant-loadout-tab="${escapeHtml(value)}">
            ${escapeHtml(label)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function bindOathSymbolFallback() {
    els.enchantCharacterPortrait?.querySelectorAll('[data-oath-symbol-image]').forEach((img) => {
      const showFallback = () => {
        img.hidden = true;
        img.closest('.enchant-oath-symbol')?.classList.add('is-fallback');
      };
      if (img.complete && img.naturalWidth === 0) {
        showFallback();
        return;
      }
      img.addEventListener('error', showFallback, { once: true });
    });
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

  function bindOathCrystalDetailPanel() {
    if (!els.enchantCharacterPortrait) return;
    const slots = [...els.enchantCharacterPortrait.querySelectorAll('.enchant-oath-slot[data-oath-index], .enchant-oath-symbol[data-oath-symbol-detail]')];
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

  function bindAvatarSlotDetailPanel() {
    if (!els.enchantCharacterPortrait) return;
    const slots = [...els.enchantCharacterPortrait.querySelectorAll('.enchant-avatar-slot[data-avatar-slot-key][data-detail-title]')];
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

  function bindBuffLoadoutDetailPanel() {
    if (!els.enchantCharacterPortrait) return;
    const slots = [...els.enchantCharacterPortrait.querySelectorAll('[data-buff-loadout-detail]')];
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

  function renderDealerSimulatorActions() {
    if (!els.enchantSimulatorActions) return;
    const simulator = state.dealerSimulator;
    const hasChanges = Boolean(simulator?.history.length);
    els.enchantSimulatorActions.hidden = !hasChanges;
    const undoButton = els.enchantSimulatorActions.querySelector('[data-dealer-simulator-action="undo"]');
    const resetButton = els.enchantSimulatorActions.querySelector('[data-dealer-simulator-action="reset"]');
    if (undoButton) undoButton.disabled = !hasChanges;
    if (resetButton) resetButton.disabled = !hasChanges;
  }

  function renderDealerSimulatorMeta(originalCharacterMeta = '') {
    const simulator = state.dealerSimulator;
    const score = Number(state.currentOfficialEquipmentScore);
    const scoreReady = Number.isFinite(score) && score > 0;
    const hasSimulationChanges = Object.keys(simulator?.activeSelectionByGroup || {}).length > 0;
    const currentScoreText = state.currentOfficialEquipmentScoreStatus === 'loading'
      ? '확인 중'
      : scoreReady
        ? score.toLocaleString('ko-KR')
        : '확인 불가';
    if (!hasSimulationChanges) {
      return `
        <div class="enchant-portrait-equipment-score">
          <strong><img src="${escapeHtml(EQUIPMENT_SCORE_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(currentScoreText)}</strong>
        </div>
        ${originalCharacterMeta}
      `;
    }
    const cumulativeMultiplier = getSimulatorCumulativeDamageMultiplier(simulator);
    const simulatedScore = getSimulatedEquipmentScore(score, cumulativeMultiplier);
    const scoreDelta = Number.isFinite(simulatedScore) && scoreReady
      ? simulatedScore - score
      : null;
    const scoreDeltaText = Number.isFinite(scoreDelta)
      ? scoreDelta === 0
        ? '변동 없음'
        : `${scoreDelta > 0 ? '▲' : '▼'}${Math.abs(scoreDelta).toLocaleString('ko-KR')}`
      : '확인 불가';
    const simulatedScoreText = Number.isFinite(simulatedScore)
      ? simulatedScore.toLocaleString('ko-KR')
      : currentScoreText;
    const rawDamageIncreasePercent = Number.isFinite(cumulativeMultiplier)
      ? (cumulativeMultiplier - 1) * 100
      : 0;
    const damageIncreasePercent = Math.abs(rawDamageIncreasePercent) < 0.005
      ? 0
      : rawDamageIncreasePercent;
    const damageIncreaseText = `${damageIncreasePercent > 0 ? '+' : ''}${damageIncreasePercent.toFixed(2)}%`;
    const totalGold = Number.isFinite(Number(simulator?.totalGold))
      ? Math.round(Number(simulator.totalGold))
      : 0;
    const costPerPointOnePercent = damageIncreasePercent > 0
      ? totalGold * 0.1 / damageIncreasePercent
      : null;
    const efficiencyBand = Number.isFinite(costPerPointOnePercent)
      ? getEfficiencyBand(costPerPointOnePercent)
      : '';
    const efficiencyColor = efficiencyBand === 'scale'
      ? getEfficiencyColor(costPerPointOnePercent)
      : '';
    const efficiencyText = Number.isFinite(costPerPointOnePercent)
      ? costPerPointOnePercent === 0
        ? '0'
        : formatCompactGold(costPerPointOnePercent)
      : '-';
    return `
      <div class="enchant-portrait-info-split">
        <div class="enchant-portrait-info-simulation">
          <span class="enchant-portrait-info-label">예상 장비점수</span>
          <div class="enchant-portrait-equipment-score is-simulated">
            <strong><img src="${escapeHtml(EQUIPMENT_SCORE_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(simulatedScoreText)}</strong>
          </div>
          <span class="enchant-portrait-score-delta">${escapeHtml(scoreDeltaText)}</span>
          <span class="enchant-portrait-damage-increase">딜 상승률 <strong>${escapeHtml(damageIncreaseText)}</strong></span>
          <span class="enchant-simulator-summary">누적 골드 <strong>${escapeHtml(formatKoreanGoldUnits(totalGold))}</strong></span>
          <span class="enchant-simulator-efficiency${efficiencyBand === 'rainbow' ? ' is-rainbow' : ''}"${efficiencyColor ? ` style="--simulator-efficiency-color: ${escapeHtml(efficiencyColor)}"` : ''}>0.1%당 <strong>${escapeHtml(efficiencyText)}</strong></span>
        </div>
        <div class="enchant-portrait-info-original">
          <span class="enchant-portrait-info-label">현재 장비점수</span>
          <div class="enchant-portrait-equipment-score">
            <strong><img src="${escapeHtml(EQUIPMENT_SCORE_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(currentScoreText)}</strong>
          </div>
          ${originalCharacterMeta}
        </div>
      </div>
    `;
  }

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
      const bufferScore = calculateBufferScore(state.currentBufferBaseline);
      if (meta && Number.isFinite(bufferScore) && bufferScore > 0) {
        meta.insertAdjacentHTML('afterbegin', `
          <div class="enchant-portrait-buffer-score">
            <strong tabindex="0" data-tooltip="계산 방식과 소수점 처리에 따라 실측 버프점수와 차이가 날 수 있습니다." title="버프점수 ${escapeHtml(Math.round(bufferScore).toLocaleString('ko-KR'))}" aria-label="버프점수 ${escapeHtml(Math.round(bufferScore).toLocaleString('ko-KR'))}"><img src="${escapeHtml(BUFFER_SCORE_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(Math.round(bufferScore).toLocaleString('ko-KR'))}</strong>
          </div>
        `);
      }
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

  function setEnchantAnalysisPanel(mode, message = '') {
    const isLoading = mode === 'loading';
    const isError = mode === 'error';
    const showMessage = isLoading || isError;
    if (els.enchantIncludeCard) {
      els.enchantIncludeCard.hidden = showMessage;
    }
    if (els.enchantResultLayout) {
      els.enchantResultLayout.hidden = showMessage;
    }
    if (els.enchantCandidatePanel) {
      els.enchantCandidatePanel.hidden = true;
    }
    if (!els.enchantAnalysisLoading) return;
    els.enchantAnalysisLoading.hidden = !showMessage;
    els.enchantAnalysisLoading.classList.toggle('is-error', isError);
    const title = els.enchantAnalysisLoading.querySelector('.enchant-analysis-loading-title');
    const sub = els.enchantAnalysisLoading.querySelector('.enchant-analysis-loading-sub');
    if (isLoading) {
      if (title) {
        title.innerHTML = '<span>분석중이에양</span><span class="enchant-analysis-loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';
      }
      if (sub) sub.textContent = '스펙업 효율을 계산하고 있어양.';
    } else if (isError) {
      if (title) title.textContent = message || '분석에 실패했습니다.';
      if (sub) sub.textContent = getEnchantAnalysisErrorSubtext(message);
    }
  }

  function getEnchantAnalysisErrorSubtext(message) {
    const text = String(message || '');
    if (/점검|503|DNF980/.test(text)) {
      return '던파 점검 중이에양. 끝나고 찾아오세양.';
    }
    if (/서버 연결|API 서버/.test(text)) {
      return '서버 업데이트나 재시작 중일 수 있습니다. 잠시만 양해 부탁드립니다.';
    }
    return '캐릭터명이나 서버를 확인한 뒤 다시 검색해 주세요.';
  }

  function showEnchantAnalysisLoading() {
    setEnchantAnalysisPanel('loading');
  }

  function showEnchantAnalysisError(message) {
    setEnchantAnalysisPanel('error', message);
  }

  function showEnchantAnalysisResults() {
    setEnchantAnalysisPanel('ready');
  }

  function setEnchantCandidatePanel(mode, candidates = [], message = '') {
    if (els.enchantIncludeCard) {
      els.enchantIncludeCard.hidden = true;
    }
    if (els.enchantResultLayout) {
      els.enchantResultLayout.hidden = true;
    }
    if (els.enchantAnalysisLoading) {
      els.enchantAnalysisLoading.hidden = true;
    }
    if (!els.enchantCandidatePanel) return;
    els.enchantCandidatePanel.hidden = false;
    els.enchantCandidatePanel.classList.toggle('is-error', mode === 'error');
    els.enchantCandidatePanel.classList.toggle('is-message', mode !== 'ready' || !candidates.length);
    if (mode === 'loading') {
      els.enchantCandidatePanel.innerHTML = `
        <div class="enchant-candidate-empty enchant-loading-message">
          <div class="enchant-analysis-loading-title">
            <span>캐릭터 찾는 중이에양</span><span class="enchant-analysis-loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
          </div>
          <div class="enchant-analysis-loading-sub">검색어와 일치하는 캐릭터를 찾고 있습니다.</div>
        </div>
      `;
      return;
    }
    if (mode === 'error') {
      els.enchantCandidatePanel.innerHTML = `
        <div class="enchant-candidate-empty enchant-loading-message">
          <div class="enchant-analysis-loading-title">${escapeHtml(message || '캐릭터를 찾지 못했습니다.')}</div>
          <div class="enchant-analysis-loading-sub">잠시 후 다시 시도해 주세요.</div>
        </div>
      `;
      return;
    }
    els.enchantCandidatePanel.innerHTML = renderEnchantSearchCandidates(candidates, message);
    bindCharacterAvatars(els.enchantCandidatePanel);
  }

  function showEnchantCandidateLoading() {
    setEnchantCandidatePanel('loading');
  }

  function renderEnchantSearchCandidates(candidates = [], searchText = '') {
    const rows = Array.isArray(candidates) ? candidates : [];
    if (!rows.length) {
      const isAdventureSearch = state.enchantCandidateLookupType === 'adventure';
      return `
        <div class="enchant-candidate-empty enchant-loading-message">
          <div class="enchant-analysis-loading-title">${isAdventureSearch ? '캐릭터를 찾지 못했어요.' : '캐릭터를 찾지 못했습니다.'}</div>
          <div class="enchant-analysis-loading-sub">${isAdventureSearch ? '모험단 검색은 한 번 조회된 캐릭터 기록을 기준으로 보여줍니다.' : '검색어를 확인한 뒤 다시 시도해 주세요.'}</div>
        </div>
      `;
    }
    const searchLabel = String(searchText || '').trim();
    const searchTypeLabel = state.enchantCandidateLookupType === 'adventure' ? '모험단' : '전체 서버';
    return `
      <div class="enchant-candidate-head">
        <p>
          <span class="enchant-candidate-result-type">${escapeHtml(searchTypeLabel)}</span>
          ${searchLabel ? `<span class="enchant-candidate-search-keyword">${escapeHtml(searchLabel)}</span>` : ''}
          <span class="enchant-candidate-result-suffix">검색 결과</span>
        </p>
      </div>
      <div class="enchant-candidate-grid">
        ${rows.map((candidate) => {
          const serverId = String(candidate.serverId || '').trim().toLowerCase();
          const serverName = String(candidate.serverName || serverId).trim();
          const characterName = String(candidate.characterName || '').trim();
          const adventureName = String(candidate.adventureName || '').trim();
          const jobLabel = String(candidate.jobGrowName || candidate.jobName || '').trim();
          const fame = Number(candidate.fame || 0);
          const hasFame = candidate.fame !== undefined && candidate.fame !== null && String(candidate.fame).trim() !== '';
          const candidateCharacter = {
            serverId,
            characterId: String(candidate.characterId || '').trim(),
            name: characterName,
            characterName,
            adventureName: candidate.adventureName || '',
            jobName: candidate.jobName || '',
            jobGrowName: candidate.jobGrowName || '',
            fame: Number(candidate.fame || 0),
          };
          return `
            <button type="button" class="enchant-candidate-card" data-candidate-server-id="${escapeHtml(serverId)}" data-candidate-character-name="${escapeHtml(characterName)}">
              <span class="enchant-candidate-server">${escapeHtml(serverName)}</span>
              <span class="supply-detail-portrait enchant-candidate-portrait">
                ${getCharacterPortraitMarkup(candidateCharacter, { zoom: 1, showName: false })}
              </span>
              <span class="enchant-candidate-info">
                ${hasFame ? `<span class="enchant-candidate-fame" title="명성 ${escapeHtml(Math.round(fame).toLocaleString('ko-KR'))}" aria-label="명성 ${escapeHtml(Math.round(fame).toLocaleString('ko-KR'))}"><img src="${escapeHtml(CHARACTER_FAME_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(Math.round(fame).toLocaleString('ko-KR'))}</span>` : ''}
                <span class="enchant-candidate-name">${escapeHtml(characterName)}</span>
                ${adventureName ? `<span class="enchant-candidate-adventure">${escapeHtml(adventureName)}</span>` : ''}
                ${jobLabel ? `<span class="enchant-candidate-job">${escapeHtml(jobLabel)}</span>` : ''}
              </span>
            </button>
          `;
        }).join('')}
      </div>
    `;
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
    state.currentBufferScoreStatus = 'idle';
    state.currentOfficialEquipmentScore = null;
    state.currentOfficialEquipmentScoreStatus = 'idle';
    state.currentOfficialEquipmentScoreCharacterKey = '';
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
    state.equipmentTunePopoverOpen = false;
    state.equipmentTunePopoverSource = '';
  }

  function resetEnchantRecommendationFilters() {
    if (els.enchantSlotFilter) els.enchantSlotFilter.value = 'all';
    if (els.enchantTierFilter) els.enchantTierFilter.value = 'all';
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
    let storedChecked = null;
    if (ENCHANT_INCLUDE_FILTER_STORAGE_KEY) {
      try {
        const parsed = JSON.parse(localStorage.getItem(ENCHANT_INCLUDE_FILTER_STORAGE_KEY) || 'null');
        if (Array.isArray(parsed)) storedChecked = new Set(parsed.filter((key) => typeof key === 'string'));
      } catch {
        storedChecked = null;
      }
    }
    if (storedChecked) {
      let knownKeys = null;
      if (ENCHANT_INCLUDE_KNOWN_FILTER_STORAGE_KEY) {
        try {
          const parsedKnown = JSON.parse(localStorage.getItem(ENCHANT_INCLUDE_KNOWN_FILTER_STORAGE_KEY) || 'null');
          if (Array.isArray(parsedKnown)) knownKeys = new Set(parsedKnown.filter((key) => typeof key === 'string'));
        } catch {
          knownKeys = null;
        }
      }
      const hadKnownKeys = Boolean(knownKeys);
      knownKeys = knownKeys || new Set(ENCHANT_INCLUDE_ORDER);
      let addedNewKey = false;
      ENCHANT_INCLUDE_ORDER.forEach((key) => {
        if (!knownKeys.has(key)) {
          if (!DEFAULT_DISABLED_ENCHANT_INCLUDE_GROUPS.has(key)) {
            storedChecked.add(key);
          }
          knownKeys.add(key);
          addedNewKey = true;
        }
      });
      if (addedNewKey && ENCHANT_INCLUDE_FILTER_STORAGE_KEY) {
        try {
          localStorage.setItem(ENCHANT_INCLUDE_FILTER_STORAGE_KEY, JSON.stringify([...storedChecked]));
        } catch {
          // 저장소를 쓸 수 없어도 현재 렌더에서는 신규 항목을 켠다.
        }
      }
      if ((!hadKnownKeys || addedNewKey) && ENCHANT_INCLUDE_KNOWN_FILTER_STORAGE_KEY) {
        try {
          localStorage.setItem(ENCHANT_INCLUDE_KNOWN_FILTER_STORAGE_KEY, JSON.stringify([...knownKeys]));
        } catch {
          // known 키 저장 실패는 현재 체크 상태에 영향 주지 않는다.
        }
      }
    }
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
          ${group.breakBefore ? '<span class="enchant-include-group-break" aria-hidden="true"></span>' : ''}
          <div class="enchant-include-group">
            <div class="enchant-include-group-title">${escapeHtml(group.title)}</div>
            <div class="enchant-include-group-options${group.splitAfter ? ' is-split' : ''}">
              ${options.map(({ item, key }) => {
                const isChecked = storedChecked
                  ? storedChecked.has(key)
                  : existingKeys.has(key)
                    ? checked.has(key)
                    : !DEFAULT_DISABLED_ENCHANT_INCLUDE_GROUPS.has(key);
                return `
                  <label class="enchant-include-option">
                    <input type="checkbox" data-enchant-tier="${escapeHtml(key)}" value="${escapeHtml(key)}" ${isChecked ? 'checked' : ''} />
                    <span>${escapeHtml(item)}</span>
                  </label>
                  ${group.splitAfter === item ? '<span class="enchant-include-option-break" aria-hidden="true"></span>' : ''}
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
    const includeTiers = [...new Set([...ENCHANT_INCLUDE_ORDER, ...rows.flatMap(getEnchantIncludeGroups)])].sort((a, b) => {
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

  function isEnchantIncludeKeySelected(key, includeTiers) {
    if (!includeTiers) return true;
    if (includeTiers.has(key)) return true;
    if (String(key).startsWith('버프강화:아바타:')) return includeTiers.has('버프강화:아바타');
    return false;
  }

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
        state.currentEquipmentUpgrades,
        state.upgradeExpectedDb,
        activeDamageBaseline,
        state.currentBufferBaseline,
        els.safeAmplificationModeSelect?.value === 'event',
        state.upgradeMaterialPrices,
      ),
      ...getEquipmentTuneRows(state.currentEquipmentUpgrades, state.upgradeMaterialPrices, state.currentBufferBaseline),
      ...getOathTuneRows(state.currentOathUpgrades, state.oathTuneStageDb, state.upgradeMaterialPrices, state.currentEquipmentUpgrades, state.currentBufferBaseline),
      ...getOathTranscendRows(state.currentOathTranscendRecommendations, state.upgradeMaterialPrices),
      ...getOathTranscendRows(state.currentOathCraftRecommendations, state.upgradeMaterialPrices, 'oathCraft'),
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

  function fitEnchantRecommendTitles() {
    if (!els.enchantRecommendList) return;
    els.enchantRecommendList.querySelectorAll('.enchant-recommend-title').forEach((title) => {
      const text = title.querySelector('.enchant-recommend-title-text');
      if (!text) return;
      title.classList.remove('is-ellipsis');
      text.style.letterSpacing = '';
      text.style.transform = '';
      const availableWidth = title.clientWidth;
      if (!availableWidth) return;
      if (text.scrollWidth <= availableWidth) return;

      text.style.letterSpacing = '-0.03em';
      if (text.scrollWidth <= availableWidth) return;

      text.style.letterSpacing = '-0.05em';
      if (text.scrollWidth <= availableWidth) return;

      const scale = Math.max(0.95, Math.min(1, availableWidth / text.scrollWidth));
      if (scale < 1) {
        text.style.transform = `scaleX(${scale.toFixed(3)})`;
        if (text.getBoundingClientRect().width <= availableWidth + 0.5) return;
      }

      text.style.transform = '';
      title.classList.add('is-ellipsis');
    });
  }

  function scheduleFitEnchantRecommendTitles() {
    fitEnchantRecommendTitles();
    window.requestAnimationFrame(() => fitEnchantRecommendTitles());
  }

  function adjustRecommendPopoverShift(popover) {
    if (!popover) return;
    const margin = 8;
    popover.style.setProperty('--popover-shift-x', '0px');
    const viewportWidth = Math.min(
      window.innerWidth || document.documentElement.clientWidth || 0,
      document.documentElement.clientWidth || window.innerWidth || 0,
    );
    if (!viewportWidth) return;
    const rect = popover.getBoundingClientRect();
    const renderedScaleX = popover.offsetWidth > 0 ? rect.width / popover.offsetWidth : 1;
    const cssPixelRatio = renderedScaleX > 0 ? renderedScaleX : 1;
    let shiftX = 0;
    const overflowRight = rect.right - (viewportWidth - margin);
    if (overflowRight > 0) {
      shiftX -= overflowRight;
    }
    const overflowLeft = margin - (rect.left + shiftX);
    if (overflowLeft > 0) {
      shiftX += overflowLeft;
    }
    if (Math.abs(shiftX) > 0.5) {
      popover.style.setProperty('--popover-shift-x', `${Math.round(shiftX / cssPixelRatio)}px`);
    }
  }

  function scheduleRecommendPopoverShift(target) {
    const host = target?.closest?.('.enchant-recommend-item, .enchant-recommend-step-tune');
    const popover = host?.querySelector?.('.enchant-recommend-popover');
    if (!popover) return;
    window.requestAnimationFrame(() => adjustRecommendPopoverShift(popover));
  }

  function scheduleOpenTunePopoverShift() {
    window.requestAnimationFrame(() => {
      const popover = els.enchantRecommendList?.querySelector('.enchant-recommend-step-tune.is-tune-popover-open .enchant-recommend-popover');
      adjustRecommendPopoverShift(popover);
    });
  }

  function resetRecommendPopoverShift(target) {
    const host = target?.closest?.('.enchant-recommend-item, .enchant-recommend-step-tune');
    host?.querySelector?.('.enchant-recommend-popover')?.style.removeProperty('--popover-shift-x');
  }

  function isLeavingRecommendPopoverHost(event) {
    const host = event.target?.closest?.('.enchant-recommend-step-tune, .enchant-recommend-item');
    if (!host) return false;
    const related = event.relatedTarget;
    return !(related && host.contains(related));
  }

  function renderEnchantRecommendations(rows = getCardRows(state.enchantCards), allRows = rows, includeMaterialCosts = els.enchantMaterialCostToggle?.checked === true) {
    if (!els.enchantRecommendList) return;
    renderDealerSimulatorActions();
    const activeEnchants = getActiveEnchants();
    const activeDamageBaseline = getActiveDamageBaseline();
    const simulatorRecommendationContext = state.currentBufferBaseline?.isBuffer
      ? { rows, options: null }
      : getDealerSimulatorRecommendationContext(rows);
    let recommendations = state.currentBufferBaseline?.isBuffer
      ? getBufferRecommendationRows(
        rows,
        activeEnchants,
        state.currentCreature,
        state.currentTitle,
        state.currentAura,
        state.currentBufferBaseline,
        includeMaterialCosts,
      )
      : getRepresentativeRecommendationRows(
        simulatorRecommendationContext.rows,
        activeEnchants,
        state.currentCreature,
        state.currentTitle,
        getActiveAura(),
        activeDamageBaseline,
        includeMaterialCosts,
        simulatorRecommendationContext.options,
        getActiveCreature(),
      );
    recommendations = collapseOathDecisionRecommendationVariants(
      recommendations,
      state.oathDecisionVariantIndexByGroup,
    );
    const simulator = state.currentBufferBaseline?.isBuffer ? null : state.dealerSimulator;
    if (simulator) {
      recommendations = mergeAppliedOathAcquisitionSnapshots(recommendations, simulator);
    }
    if (simulator && !simulator.baseEligibleEnchantCandidateSignatures.length) {
      simulator.baseEligibleEnchantCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'enchant')
        .map(getEnchantCandidateSignature)
        .filter(Boolean);
    }
    if (simulator && !simulator.baseEligibleAuraCandidateSignatures.length) {
      simulator.baseEligibleAuraCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'aura')
        .map(getAuraCandidateSignature)
        .filter(Boolean);
    }
    if (simulator && !simulator.baseEligibleCreatureCandidateSignatures.length) {
      simulator.baseEligibleCreatureCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'creature')
        .map(getCreatureCandidateSignature)
        .filter(Boolean);
    }
    if (simulator && !simulator.baseEligibleTitleCandidateSignatures.length) {
      simulator.baseEligibleTitleCandidateSignatures = recommendations
        .filter((row) => row.sourceType === 'title')
        .map(getTitleCandidateSignature)
        .filter(Boolean);
    }
    const eligibleTitleSignatures = new Set(simulator?.baseEligibleTitleCandidateSignatures || []);
    if (simulator && Object.keys(simulator.activeSelectionByGroup || {}).length && eligibleTitleSignatures.size) {
      recommendations = recommendations.filter((row) => (
        row.sourceType !== 'title' || eligibleTitleSignatures.has(getTitleCandidateSignature(row))
      ));
    }
    if (simulator) {
      const equipmentTuneStepIndex = getTuneStepIndexBySource(state, 'equipmentTune');
      recommendations = recommendations.map((row) => (
        row.sourceType === 'equipmentTune'
          ? applyEquipmentTuneDisplayStep(
            row,
            equipmentTuneStepIndex,
            includeMaterialCosts,
            activeDamageBaseline,
            state.currentBufferBaseline,
          )
          : row
      ));
    }
    const decoratedRecommendations = recommendations.map((row) => {
      const exclusiveGroupKey = getSimulatorExclusiveGroupKey(row);
      const candidateSignature = getSimulatorCandidateSignature(row);
      const oathAcquisitionDescriptors = getOathAcquisitionSelectionDescriptors(row);
      const isApplied = oathAcquisitionDescriptors.length
        ? isAppliedOathAcquisitionRecommendation(row, simulator)
        : Boolean(
          exclusiveGroupKey &&
          candidateSignature &&
          simulator?.activeSelectionByGroup?.[exclusiveGroupKey]?.candidateSignature === candidateSignature
        );
      return {
        ...row,
        isApplied,
        exclusiveGroupKey,
        candidateSignature,
      };
    });
    const displayRecommendations = state.currentBufferBaseline?.isBuffer
      ? decoratedRecommendations
      : decoratedRecommendations.sort(compareDealerRecommendationOrder);
    state.dealerSimulatorRecommendations = new Map();
    renderEfficiencyLegend(recommendations);
    if (!displayRecommendations.length) {
      els.enchantRecommendList.innerHTML = '<div class="table-empty-cell">현재 세팅보다 높은 후보가 없거나 가격을 찾지 못했습니다.</div>';
      return;
    }

    els.enchantRecommendList.innerHTML = displayRecommendations.map((row, index) => {
      const isApplied = row.isApplied === true;
      const hasOathDecisionVariants = OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
        && Array.isArray(row.oathDecisionVariants)
        && row.oathDecisionVariants.length > 1;
      const hasVariantActions = TUNE_SOURCE_TYPES.has(row.sourceType) || hasOathDecisionVariants;
      const variantPopoverSource = hasOathDecisionVariants ? row.variantGroupKey : row.sourceType;
      const tuneStepIndex = TUNE_SOURCE_TYPES.has(row.sourceType)
        ? getTuneStepIndexBySource(state, row.sourceType)
        : state.equipmentTuneStepIndex;
      if (!isApplied || TUNE_SOURCE_TYPES.has(row.sourceType)) {
        row = applyEquipmentTuneDisplayStep(row, tuneStepIndex, includeMaterialCosts, activeDamageBaseline, state.currentBufferBaseline);
      }
      const simulatorTarget = isApplied ? null : resolveDealerSimulatorTarget(row);
      const oathAcquisitionRecommendationId = OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
        ? getDealerSimulatorRecommendationId(row)
        : '';
      const simulatorRecommendationId = simulatorTarget
        ? getDealerSimulatorRecommendationId(row)
        : oathAcquisitionRecommendationId;
      const appliedSelectionId = isApplied
        ? oathAcquisitionRecommendationId
          ? `applied-oath:${oathAcquisitionRecommendationId}`
          : `applied:${row.exclusiveGroupKey}`
        : '';
      const simulatorSelectionId = appliedSelectionId || simulatorRecommendationId;
      const simulatorSelected = simulatorSelectionId && state.dealerSimulator?.selectedRecommendationId === simulatorSelectionId;
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
        : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
          ? formatOathTranscendEffect(row, isBufferMetric)
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
        : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
          ? formatOathTranscendEffectHtml(row, isBufferMetric, escapeHtml)
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
          : row.sourceType === 'aura'
            ? row.priceItem?.itemName || row.candidateName || row.itemName
            : row.sourceType === 'avatar'
              ? `${row.itemName}${row.needCount > 1 ? ` x${row.needCount}` : ''}`
            : row.itemName;
      const displayTitle = TUNE_SOURCE_TYPES.has(row.sourceType)
        ? row.sourceType === 'oathTune' ? '서약 조율' : '장비 조율'
        : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
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
        : includeMaterialCosts && ['upgrade', 'blackFang', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft'].includes(row.sourceType)
        ? '재료 포함'
        : ['upgrade', 'blackFang', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft'].includes(row.sourceType) ? '예상 골드' : '최저가';
      const materialPartsLabel = row.sourceType === 'upgrade' ? '예상 재료' : '필요 재료';
      const materialPartsMarkup = materialParts.length
        ? `<span class="enchant-popover-material-label">${materialPartsLabel}</span>${materialParts
          .map((part) => `<span class="enchant-popover-material-part" title="${escapeHtml(part.label)}">${part.iconUrl ? `<img src="${escapeHtml(part.iconUrl)}" alt="${escapeHtml(part.label)}" loading="lazy" />` : ''}<span>${escapeHtml(part.amount)}</span></span>`)
          .join('')}`
        : '';
      const tuneStepControls = TUNE_SOURCE_TYPES.has(row.sourceType) && Array.isArray(row.tuneSteps) && row.tuneSteps.length > 1
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
        : '';
      const popoverName = row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
        ? [displayName, tierLabel].filter(Boolean).join(' ')
        : displayName;
      const itemExplainText = showOptionText || ['switchingTitle', 'switchingCreature', 'switchingFragment'].includes(row.sourceType) ? row.itemExplain : '';
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
        { text: !materialPartsMarkup && row.materialText ? `필요 재료 ${row.materialText}` : '', className: 'enchant-popover-material' },
        { text: isBufferMetric ? `${row.sourceType === 'equipmentTune' ? '버프점수' : '교체 시 버프점수'} +${Math.round(row.incrementalBuffScore).toLocaleString('ko-KR')}점` : `${TUNE_SOURCE_TYPES.has(row.sourceType) ? '딜 상승' : '교체 상승'} ${formatPercent(row.incrementalDamagePercent)}`, className: 'enchant-popover-gain' },
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
      return `
        <span class="enchant-recommend-step${hasVariantActions ? ` enchant-recommend-step-tune${state.equipmentTunePopoverOpen && state.equipmentTunePopoverSource === variantPopoverSource ? ' is-tune-popover-open' : ''}` : ''}"${hasVariantActions ? ` data-tune-source="${escapeHtml(variantPopoverSource)}"` : ''}>
          ${connector}
          <button type="button" class="enchant-recommend-item enchant-efficiency-${band}${hasUpgradeWarning ? ' enchant-has-upgrade-warning' : ''}${simulatorSelected ? ' is-touch-selected' : ''}${simulatorTarget ? ' is-simulator-supported' : ''}${isApplied ? ' is-applied' : ''}"${bandStyle}${simulatorRecommendationId && !isApplied ? ` data-simulator-recommendation-id="${escapeHtml(simulatorRecommendationId)}"` : ''}${isApplied && oathAcquisitionRecommendationId ? ` data-applied-oath-acquisition-id="${escapeHtml(oathAcquisitionRecommendationId)}"` : isApplied ? ` data-applied-simulator-group="${escapeHtml(row.exclusiveGroupKey)}"` : ''}${isApplied ? ` aria-label="${escapeHtml(`${displayTitle} 적용됨`)}"` : ''}>
            ${isApplied ? '<span class="enchant-simulator-applied-badge">✓ 적용됨</span>' : ''}
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
    if (!character?.serverId || !characterName || state.currentBufferBaseline?.isBuffer) {
      state.currentOfficialEquipmentScore = null;
      state.currentOfficialEquipmentScoreStatus = 'idle';
      state.currentOfficialEquipmentScoreCharacterKey = '';
      renderEnchantCharacterPortrait();
      return;
    }
    const characterKey = `${character.serverId}:${characterName}`;
    state.currentOfficialEquipmentScore = null;
    state.currentOfficialEquipmentScoreStatus = 'loading';
    state.currentOfficialEquipmentScoreCharacterKey = characterKey;
    renderEnchantCharacterPortrait();

    try {
      const query = new URLSearchParams({
        serverId: character.serverId,
        characterName,
      });
      const response = await fetch(`${API_BASE}/api/equipment-score?${query.toString()}`, { cache: 'no-store' });
      const payload = await parseApiJsonResponse(response, '장비점수 조회에 실패했습니다.');
      if (requestId !== state.enchantRequestId || state.currentOfficialEquipmentScoreCharacterKey !== characterKey) return;
      const score = Number(payload.equipmentScore);
      state.currentOfficialEquipmentScore = Number.isFinite(score) && score > 0 ? score : null;
      state.currentOfficialEquipmentScoreStatus = state.currentOfficialEquipmentScore ? 'ready' : 'error';
      if (state.dealerSimulator) {
        state.dealerSimulator.baseEquipmentScore = state.currentOfficialEquipmentScore;
      }
    } catch {
      if (requestId !== state.enchantRequestId || state.currentOfficialEquipmentScoreCharacterKey !== characterKey) return;
      state.currentOfficialEquipmentScore = null;
      state.currentOfficialEquipmentScoreStatus = 'error';
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
      if (!state.enchantPriceLoaded || !hasEnchantPriceRecommendationData()) {
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
      return getOathTuneRows(state.currentOathUpgrades, state.oathTuneStageDb, state.upgradeMaterialPrices, state.currentEquipmentUpgrades, state.currentBufferBaseline);
    }
    return getEquipmentTuneRows(state.currentEquipmentUpgrades, state.upgradeMaterialPrices, state.currentBufferBaseline);
  }

  function getEquipmentTuneVariantRow(stepIndex) {
    const row = getTuneRowsBySource('equipmentTune')[0];
    if (!row) return null;
    return applyEquipmentTuneDisplayStep(
      row,
      stepIndex,
      els.enchantMaterialCostToggle?.checked === true,
      getActiveDamageBaseline(),
      state.currentBufferBaseline,
    );
  }

  function getOathTuneVariantRow(stepIndex) {
    const row = getTuneRowsBySource('oathTune')[0];
    if (!row) return null;
    return applyEquipmentTuneDisplayStep(
      row,
      stepIndex,
      els.enchantMaterialCostToggle?.checked === true,
      getActiveDamageBaseline(),
      state.currentBufferBaseline,
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
    const rollbackSnapshot = getDealerSimulatorSnapshot();
    const rollbackHistory = cloneSimulatorValue(simulator.history || []);
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
      appliedGold: getRecommendationGold(row, els.enchantMaterialCostToggle?.checked === true),
      includeMaterialCost: els.enchantMaterialCostToggle?.checked === true,
      goldWithoutMaterials: getRecommendationGold(row, false),
      goldWithMaterials: getRecommendationGold(row, true),
      selectedVariantIndex: Number(row.selectedTuneStepIndex || 0),
      variants: cloneSimulatorValue(row.tuneSteps || []),
      appliedVariantSnapshot: cloneSimulatorValue(row),
    };
    try {
      simulator.simulatedEquipmentUpgrades = nextEquipment;
      simulator.activeSelectionByGroup.equipmentTune = updatedSelection;
      simulator.history.forEach((snapshot) => {
        if (!snapshot?.activeSelectionByGroup?.equipmentTune) return;
        const snapshotEquipmentBySlot = new Map(
          (snapshot.simulatedEquipmentUpgrades || []).map((equipment) => [equipment?.slot, equipment]),
        );
        snapshot.simulatedEquipmentUpgrades = cloneSimulatorValue(plannedEquipment.map((equipment) => {
          const snapshotEquipment = snapshotEquipmentBySlot.get(equipment?.slot);
          if (!snapshotEquipment || !BLACK_FANG_SIMULATOR_SLOTS.has(equipment?.slot)) return equipment;
          return replaceEquipmentBodyPreservingState(equipment, {
            itemId: snapshotEquipment.itemId,
            itemName: snapshotEquipment.itemName,
            iconUrl: snapshotEquipment.iconUrl,
            itemRarity: snapshotEquipment.itemRarity,
            effects: snapshotEquipment.bodyEffects,
            itemExplain: snapshotEquipment.bodyExplain,
          });
        }));
        snapshot.activeSelectionByGroup.equipmentTune = cloneSimulatorValue(updatedSelection);
        snapshot.totalGold = getDealerSimulatorTotalGold(snapshot);
      });
      simulator.totalGold = getDealerSimulatorTotalGold(simulator);
      simulator.lastChangedTarget = {
        targetTab: 'equipment',
        targetSlot: '장비 조율',
        applyType: 'applyEquipmentTunePlan',
      };
      rebuildDealerSimulatorCalculationState();
      getChangedEquipmentTuneSlots(previousEquipment, nextEquipment).forEach(triggerDealerSimulatorSweep);
      state.enchantLoadoutTab = 'equipment';
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return true;
    } catch {
      restoreDealerSimulatorSnapshot(rollbackSnapshot);
      simulator.history = rollbackHistory;
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
    const rollbackSnapshot = getDealerSimulatorSnapshot();
    const rollbackHistory = cloneSimulatorValue(simulator.history || []);
    const previousOath = cloneSimulatorValue(simulator.simulatedOathUpgrades || {});
    const updatedSelection = {
      ...selection,
      appliedGold: getRecommendationGold(row, els.enchantMaterialCostToggle?.checked === true),
      includeMaterialCost: els.enchantMaterialCostToggle?.checked === true,
      goldWithoutMaterials: getRecommendationGold(row, false),
      goldWithMaterials: getRecommendationGold(row, true),
      selectedVariantIndex: Number(row.selectedTuneStepIndex || 0),
      variants: cloneSimulatorValue(row.tuneSteps || []),
      appliedVariantSnapshot: cloneSimulatorValue(row),
    };
    try {
      simulator.simulatedOathUpgrades = plannedOath;
      simulator.activeSelectionByGroup.oathTune = updatedSelection;
      simulator.history.forEach((snapshot) => {
        if (!snapshot?.activeSelectionByGroup?.oathTune) return;
        snapshot.simulatedOathUpgrades = cloneSimulatorValue(plannedOath);
        snapshot.activeSelectionByGroup.oathTune = cloneSimulatorValue(updatedSelection);
        snapshot.totalGold = getDealerSimulatorTotalGold(snapshot);
      });
      simulator.totalGold = getDealerSimulatorTotalGold(simulator);
      simulator.lastChangedTarget = {
        targetTab: 'oath',
        targetSlot: '서약 조율',
        applyType: 'applyOathTunePlan',
      };
      rebuildDealerSimulatorCalculationState();
      getChangedOathTuneSlots(previousOath, plannedOath).forEach(triggerDealerSimulatorSweep);
      state.enchantLoadoutTab = 'oath';
      renderEnchantCharacterPortrait();
      renderEnchantTable();
      return true;
    } catch {
      restoreDealerSimulatorSnapshot(rollbackSnapshot);
      simulator.history = rollbackHistory;
      return false;
    }
  }

  function changeEquipmentTuneStep(delta, sourceType = 'equipmentTune') {
    const value = Number(delta || 0);
    if (!Number.isFinite(value) || value === 0) return;
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
    const currentIndex = Number(state.oathDecisionVariantIndexByGroup?.[groupKey] || 0);
    state.oathDecisionVariantIndexByGroup = {
      ...(state.oathDecisionVariantIndexByGroup || {}),
      [groupKey]: Math.max(0, Math.min(maximum, currentIndex + value)),
    };
    state.equipmentTunePopoverOpen = true;
    state.equipmentTunePopoverSource = groupKey;
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
    renderEnchantTable();
  });

  els.enchantRecommendList?.addEventListener('focusin', (event) => {
    scheduleRecommendPopoverShift(event.target);
  });

  els.enchantRecommendList?.addEventListener('focusout', (event) => {
    if (isLeavingRecommendPopoverHost(event)) {
      resetRecommendPopoverShift(event.target);
    }
  });

  els.enchantRecommendList?.addEventListener('pointerup', (event) => {
    if (!['touch', 'pen'].includes(event.pointerType)) return;
    const target = event.target.closest('[data-simulator-recommendation-id], [data-applied-simulator-group], [data-applied-oath-acquisition-id]');
    if (
      !target ||
      event.target.closest('[data-equipment-tune-step]') ||
      event.target.closest('[data-recommendation-variant-step]') ||
      event.target.closest('.enchant-recommend-popover')
    ) return;
    event.preventDefault();
    event.stopPropagation();
    state.dealerSimulatorSuppressClickUntil = Date.now() + 700;
    const appliedGroupKey = String(target.dataset.appliedSimulatorGroup || '');
    const appliedOathAcquisitionId = String(target.dataset.appliedOathAcquisitionId || '');
    const recommendationId = String(target.dataset.simulatorRecommendationId || '');
    const selectionId = appliedOathAcquisitionId
      ? `applied-oath:${appliedOathAcquisitionId}`
      : appliedGroupKey ? `applied:${appliedGroupKey}` : recommendationId;
    if (!selectionId || !state.dealerSimulator) return;
    if (state.dealerSimulator.selectedRecommendationId === selectionId) {
      if (appliedOathAcquisitionId) {
        removeActiveOathAcquisitionRecommendation(appliedOathAcquisitionId);
        return;
      }
      if (appliedGroupKey) {
        removeActiveDealerSimulatorSelection(appliedGroupKey);
        return;
      }
      applyDealerSimulatorRecommendation(recommendationId);
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
    if (event.target.closest('.enchant-recommend-popover')) return;
    const simulatorTarget = event.target.closest('[data-simulator-recommendation-id], [data-applied-simulator-group], [data-applied-oath-acquisition-id]');
    if (!simulatorTarget) return;
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() < state.dealerSimulatorSuppressClickUntil) return;
    const precisePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches === true;
    if (!precisePointer && event.detail > 0) return;
    const appliedGroupKey = String(simulatorTarget.dataset.appliedSimulatorGroup || '');
    const appliedOathAcquisitionId = String(simulatorTarget.dataset.appliedOathAcquisitionId || '');
    if (appliedOathAcquisitionId) {
      removeActiveOathAcquisitionRecommendation(appliedOathAcquisitionId);
      return;
    }
    if (appliedGroupKey) {
      removeActiveDealerSimulatorSelection(appliedGroupKey);
      return;
    }
    applyDealerSimulatorRecommendation(String(simulatorTarget.dataset.simulatorRecommendationId || ''));
  });

  els.enchantRecommendList?.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const target = event.target.closest('[data-equipment-tune-step]');
    const variantTarget = event.target.closest('[data-recommendation-variant-step]');
    if (!target && !variantTarget) return;
    event.preventDefault();
    event.stopPropagation();
    if (target) {
      if (target.classList.contains('is-disabled')) return;
      changeEquipmentTuneStep(Number(target.dataset.equipmentTuneStep || 0), target.dataset.tuneSource || 'equipmentTune');
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
    if (simulatorAction.dataset.dealerSimulatorAction === 'undo') undoDealerSimulator();
    if (simulatorAction.dataset.dealerSimulatorAction === 'reset') clearDealerSimulator();
  });

  els.enchantCharacterPortrait?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-enchant-loadout-tab]');
    if (!target) return;
    event.preventDefault();
    const requestedTab = String(target.dataset.enchantLoadoutTab || '');
    const nextTab = ['equipment', 'oath', 'avatar', 'buff'].includes(requestedTab) ? requestedTab : 'equipment';
    if (state.enchantLoadoutTab === nextTab) return;
    state.enchantLoadoutTab = nextTab;
    renderEnchantCharacterPortrait();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!state.dealerSimulator?.selectedRecommendationId) return;
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
