export function createEnchantOathProgression({
  addEffects,
  applyUpgradeMaterialPrices,
  cloneSimulatorValue,
  getEquipmentTuneSetPoint,
  equipmentTuneMinSetPoint,
}) {

  const OATH_SLOT_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  function getBufferOathTuneBaseRelativeChanges(row = {}) {
    if (row.sourceType !== 'oathTune') return null;
    const buffPowerDelta = Number(row.effects?.buffPower);
    return Number.isFinite(buffPowerDelta) && buffPowerDelta > 0
      ? { buffPowerDelta }
      : null;
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
      Number(a.simulatedTuneOrder ?? orderBySlot.get(Number(a.index)) ?? Number.MAX_SAFE_INTEGER)
      - Number(b.simulatedTuneOrder ?? orderBySlot.get(Number(b.index)) ?? Number.MAX_SAFE_INTEGER)
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

  function getOathTuneRows(oathUpgrades = {}, oathTuneDb = {}, materialPrices = {}, currentEquipmentUpgrades = [], bufferBaseline = null) {
    const db = oathTuneDb || {};
    const isBufferMetric = Boolean(bufferBaseline?.isBuffer);
    if (getEquipmentTuneSetPoint(currentEquipmentUpgrades) < equipmentTuneMinSetPoint) return [];
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

  return {
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
  };
}
