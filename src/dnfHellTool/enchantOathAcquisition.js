export function createEnchantOathAcquisition({
  oathDecisionVariantSourceTypes,
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
}) {
  const OATH_DECISION_VARIANT_SOURCE_TYPES = oathDecisionVariantSourceTypes;
  function getOathAcquisitionSlotIndex(selection = {}, groupKey = '') {
    const decisionSlotIndex = Number(selection.targetDecision?.slotIndex);
    if (Number.isInteger(decisionSlotIndex)) return decisionSlotIndex;
    return Number(String(selection.targetSlot || groupKey).split(':').pop());
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

  return {
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
  };
}
