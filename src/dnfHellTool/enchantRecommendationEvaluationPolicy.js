export function createEnchantRecommendationEvaluationPolicy(deps) {
  const {
    getRecommendationGold,
    materialEnchantMaterialOrder: MATERIAL_ENCHANT_MATERIAL_ORDER,
  } = deps;

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

  return {
    getCostPerPointOnePercent,
    isMaterialAcquisition,
    isFreeActionRecommendation,
    isMaterialEnchantAcquisition,
    compareMaterialEnchantOrder,
    getRoundedMetricKey,
    isPreferredDuplicateRecommendation,
    removeInefficientLowerTierEnchants,
  };
}
