export function createEnchantDealerRecommendation(deps) {
  const {
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
  } = deps;

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

  function getRecommendationDamageEffects(row, current) {
    if (['upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft'].includes(row.sourceType)) return row.effects || {};
    if (row.sourceType === 'blackFang' || row.sourceType === 'relicCraft') {
      const targetEffects = row.targetEquipmentBody?.effects
        || row.targetEffects
        || addEffects(row.currentEffects, row.effects);
      const currentEffects = row.currentEquipmentBody?.effects || row.currentEffects || {};
      return subtractEffects(targetEffects, currentEffects);
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
        : row.sourceType === 'blackFang' || row.sourceType === 'relicCraft'
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
        : row.sourceType === 'blackFang' || row.sourceType === 'relicCraft'
          ? row.currentEquipmentBody || { effects: row.currentEffects || {} }
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
              row.sourceType === 'blackFang' || row.sourceType === 'relicCraft'
                ? {
                  ...row,
                  effects: row.targetEquipmentBody?.effects
                    || row.targetEffects
                    || addEffects(row.currentEffects, row.effects),
                }
                : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
                  ? { ...row, effects: row.targetEffects || row.effects || {} }
                : row,
              row.sourceType === 'blackFang' || row.sourceType === 'relicCraft'
                ? row.currentEquipmentBody || { effects: row.currentEffects || {} }
                : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
                  ? { effects: row.currentEffects || {} }
                  : current,
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
        : row.sourceType === 'blackFang' || row.sourceType === 'relicCraft'
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

  return {
    getSkillDamageMultiplier,
    getReplacementIncrementalDamagePercent,
    getAdjustedElementBaselineForRecommendation,
    getElementAdjustedReplacementIncrementalDamagePercent,
    getCreatureArtifactEffectsTotal,
    getCreatureArtifactReplacementMultiplier,
    getCreatureArtifactDisplayEffects,
    getRepresentativeRecommendationRows,
    compareDealerRecommendationOrder,
  };
}
