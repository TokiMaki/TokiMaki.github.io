export const UPGRADE_SLOT_LABELS = {
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

const MIN_RECOMMENDED_AMPLIFICATION_LEVEL = 10;

export function createEnchantEquipmentProgression({
  addEffects,
  subtractEffects,
  estimateDamagePercent,
  estimateDamageMultiplier,
  applyUpgradeMaterialPrices,
  getUpgradeMaterials,
  getFinalDamageReplacementMultiplier,
}) {

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

  function getEquipmentProgressionMode(equipment = {}) {
    return equipment.isAmplified ? 'amplification' : 'reinforcement';
  }

  function getEquipmentProgressionEffectsTotal(equipmentRows = [], upgradeDb = {}, baseline = {}) {
    return (equipmentRows || []).reduce((total, equipment) => addEffects(
      total,
      getCumulativeUpgradeEffectsForEquipment(
        equipment,
        Number(equipment?.reinforce || 0),
        getEquipmentProgressionMode(equipment),
        upgradeDb,
        baseline,
        false,
      ),
    ), {});
  }

  function getEquipmentProgressionFinalDamageChangeMultiplier(
    baseEquipment = [],
    simulatedEquipment = baseEquipment,
    upgradeDb = {},
    baseline = {},
  ) {
    const baseBySlot = new Map((baseEquipment || []).map((equipment) => [equipment?.slot, equipment]));
    const simulatedBySlot = new Map((simulatedEquipment || []).map((equipment) => [equipment?.slot, equipment]));
    const slots = new Set([...baseBySlot.keys(), ...simulatedBySlot.keys()]);
    return [...slots].reduce((multiplier, slot) => {
      const baseRow = baseBySlot.get(slot) || {};
      const simulatedRow = simulatedBySlot.get(slot) || baseRow;
      return multiplier * getFinalDamageReplacementMultiplier(
        getCumulativeUpgradeEffectsForEquipment(
          baseRow,
          Number(baseRow.reinforce || 0),
          getEquipmentProgressionMode(baseRow),
          upgradeDb,
          baseline,
          false,
        ),
        getCumulativeUpgradeEffectsForEquipment(
          simulatedRow,
          Number(simulatedRow.reinforce || 0),
          getEquipmentProgressionMode(simulatedRow),
          upgradeDb,
          baseline,
          false,
        ),
      );
    }, 1);
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

  function getEquipmentProgressionType(row = {}) {
    return ['amplification', 'safeAmplification', 'amplificationConversion'].includes(row.upgradeMode)
      ? 'amplify'
      : ['reinforcement', 'safeReinforcement'].includes(row.upgradeMode)
        ? 'reinforce'
        : '';
  }

  function getEquipmentProgressionExclusiveGroupKey(row = {}) {
    const slot = String(row.slot || '').trim();
    return row.sourceType === 'upgrade' && slot && UPGRADE_SLOT_LABELS[slot]
      ? `equipmentProgression:${slot}`
      : '';
  }

  function getEquipmentProgressionCandidateSignature(row = {}) {
    const groupKey = getEquipmentProgressionExclusiveGroupKey(row);
    const progressionType = getEquipmentProgressionType(row);
    const targetLevel = Number(row.targetLevel);
    if (!groupKey || !progressionType || !Number.isFinite(targetLevel)) return '';
    return `${groupKey}:${progressionType}:${targetLevel}`;
  }

  return {
    getCumulativeUpgradeEffectsForEquipment,
    getEquipmentProgressionMode,
    getEquipmentProgressionEffectsTotal,
    getEquipmentProgressionFinalDamageChangeMultiplier,
    getUpgradeRows,
    getEquipmentProgressionType,
    getEquipmentProgressionExclusiveGroupKey,
    getEquipmentProgressionCandidateSignature,
  };
}
