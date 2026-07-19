export function createEnchantBuffEnhancementMetric(deps) {
  const {
    getBuffLoadoutRowsForMetric,
    cloneSimulatorValue,
    getBuffSimulatorTargetSlotId,
    getBuffSimulatorExclusiveGroupKey,
  } = deps;

  function getBuffLoadoutLevelContribution(loadout = {}) {
    const titleLevel = getBuffLoadoutRowsForMetric(loadout.equipment)
      .filter((row) => String(row?.slotId || '').trim() === 'TITLE')
      .reduce((sum, row) => sum + Number(row?.buffContribution?.skillLevel || 0), 0);
    const avatarLevel = getBuffLoadoutRowsForMetric(loadout.avatar).reduce((sum, row) => (
      sum
      + Number(row?.buffContribution?.topOptionSkillLevel || 0)
      + Number(row?.buffContribution?.itemSkillLevel || 0)
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

  return {
    getBuffLoadoutLevelContribution,
    getBuffEnhancementMetricMultiplier,
    adaptBuffEnhancementRecommendation,
  };
}
