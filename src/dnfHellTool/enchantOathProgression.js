export function createEnchantOathProgression({
  addEffects,
  applyUpgradeMaterialPrices,
  cloneSimulatorValue,
  getEquipmentTuneSetPoint,
  getEquipmentOathPointState,
  equipmentTuneMinSetPoint,
}) {

  const OATH_SLOT_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const OATH_BODY_RARITY_ORDER = ['유니크', '레전더리', '에픽', '태초'];

  function getBufferOathTuneBaseRelativeChanges(row = {}) {
    if (row.sourceType !== 'oathTune') return null;
    const buffPowerDelta = Number(row.effects?.buffPower);
    return Number.isFinite(buffPowerDelta) && buffPowerDelta > 0
      ? { buffPowerDelta }
      : null;
  }

  function getBufferOathUpgradeBaseRelativeChanges(row = {}) {
    if (row.sourceType !== 'oathUpgrade') return null;
    const buffPowerDelta = Number(row.effects?.buffPower);
    return Number.isFinite(buffPowerDelta) && buffPowerDelta > 0
      ? { buffPowerDelta }
      : null;
  }

  function replaceOathBody(oathUpgrades = {}, targetBody = {}) {
    const currentBodySetPoint = Number(oathUpgrades?.bodySetPoint || 0);
    const targetBodySetPoint = Number(targetBody?.setPoint || 0);
    if (!targetBody?.itemId || !Number.isFinite(targetBodySetPoint) || targetBodySetPoint <= 0) {
      return null;
    }
    return {
      ...cloneSimulatorValue(oathUpgrades || {}),
      itemId: targetBody.itemId,
      itemName: targetBody.itemName || '',
      itemRarity: targetBody.itemRarity || '태초',
      iconUrl: targetBody.iconUrl || '',
      effects: cloneSimulatorValue(targetBody.effects || {}),
      bodySetPoint: targetBodySetPoint,
      setPoint: Number(oathUpgrades?.setPoint || 0)
        - currentBodySetPoint
        + targetBodySetPoint,
    };
  }

  function reconcileOathSetPointState(oathUpgrades = {}, equipmentRows = []) {
    const pointState = getEquipmentOathPointState(equipmentRows, oathUpgrades);
    const rawOathSetPoint = Number(pointState?.rawOathSetPoint);
    const oathSetPoint = Number(pointState?.oathSetPoint);
    if (!Number.isFinite(rawOathSetPoint) || !Number.isFinite(oathSetPoint)) {
      return cloneSimulatorValue(oathUpgrades || {});
    }
    return {
      ...cloneSimulatorValue(oathUpgrades || {}),
      rawSetPoint: rawOathSetPoint,
      reportedSetPoint: oathSetPoint,
      borrowedSetPoint: Number(pointState?.borrowedSetPoint || 0),
      setPoint: oathSetPoint,
    };
  }

  function getOathBodyEffectsTotal(oathUpgrades = {}) {
    return cloneSimulatorValue(oathUpgrades?.effects || {});
  }

  function getOathBodyFinalDamageChangeMultiplier(baseOath = {}, simulatedOath = baseOath) {
    const baseMultiplier = 1 + Number(baseOath?.effects?.finalDamage || 0) / 100;
    const simulatedMultiplier = 1 + Number(simulatedOath?.effects?.finalDamage || 0) / 100;
    return baseMultiplier > 0 && Number.isFinite(simulatedMultiplier)
      ? simulatedMultiplier / baseMultiplier
      : 1;
  }

  function getOathBodyUpgradeRows(
    oathUpgrades = {},
    equipmentRows = [],
    db = {},
    isBuffer = false,
    baseOathUpgrades = oathUpgrades,
  ) {
    const currentRarityIndex = OATH_BODY_RARITY_ORDER.indexOf(oathUpgrades?.itemRarity);
    const isMistOath = String(oathUpgrades?.itemName || '').includes('안개');
    if (currentRarityIndex < 0) {
      return [];
    }
    const currentEffects = oathUpgrades.effects || {};
    const currentOathSetPoint = Number(
      getEquipmentOathPointState(equipmentRows, oathUpgrades)?.oathSetPoint || 0,
    );
    const currentState = getOathTuneState(db, currentOathSetPoint);
    const targetBodies = Array.isArray(oathUpgrades?.upgradeTargets)
      ? oathUpgrades.upgradeTargets
      : oathUpgrades?.primevalUpgradeTarget?.itemId
        ? [oathUpgrades.primevalUpgradeTarget]
        : [];
    return targetBodies.flatMap((targetBody) => {
      const targetRarityIndex = OATH_BODY_RARITY_ORDER.indexOf(targetBody?.itemRarity);
      if (!targetBody?.itemId || (!isMistOath && targetRarityIndex <= currentRarityIndex)) return [];
      const replacedTargetOath = replaceOathBody(oathUpgrades, targetBody);
      if (!replacedTargetOath) return [];
      const targetOath = reconcileOathSetPointState(replacedTargetOath, equipmentRows);
      const targetState = getOathTuneState(db, targetOath.setPoint);
      const oathSetDamageMultiplier = Number(currentState?.damageMultiplier || 0) > 0
        ? Number(targetState?.damageMultiplier || 1) / Number(currentState.damageMultiplier)
        : 1;
      const targetEffects = targetBody.effects || {};
      const effects = {};
      new Set([...Object.keys(currentEffects), ...Object.keys(targetEffects)]).forEach((key) => {
        const current = Number(currentEffects[key] || 0);
        const target = Number(targetEffects[key] || 0);
        if (key === 'finalDamage') {
          const multiplier = (1 + target / 100) / (1 + current / 100);
          if (multiplier > 1) effects.finalDamage = (multiplier - 1) * 100;
        } else if (target > current) {
          effects[key] = target - current;
        }
      });
      const bufferBaseOath = isBuffer ? baseOathUpgrades || oathUpgrades : oathUpgrades;
      const replacedBufferTargetOath = isBuffer ? replaceOathBody(bufferBaseOath, targetBody) : null;
      const bufferTargetOath = replacedBufferTargetOath
        ? reconcileOathSetPointState(replacedBufferTargetOath, equipmentRows)
        : null;
      const bufferBaseState = isBuffer
        ? getOathTuneState(
          db,
          Number(getEquipmentOathPointState(equipmentRows, bufferBaseOath)?.oathSetPoint || 0),
        )
        : null;
      const bufferTargetState = isBuffer
        ? getOathTuneState(db, Number(bufferTargetOath?.setPoint || 0))
        : null;
      const bufferBaseEffects = bufferBaseOath?.effects || {};
      const bufferBaseRelativeChanges = isBuffer && bufferTargetOath ? {
        statDelta: Number(targetEffects.allStat || 0) - Number(bufferBaseEffects.allStat || 0),
        buffPowerDelta: Number(targetEffects.buffPower || 0) - Number(bufferBaseEffects.buffPower || 0)
          + Number(bufferTargetState?.stageBuffPower || 0) + Number(bufferTargetState?.blessingBuffPower || 0)
          - Number(bufferBaseState?.stageBuffPower || 0) - Number(bufferBaseState?.blessingBuffPower || 0),
        currentBuffAmplificationDelta: Number(targetEffects.buffAmplification || 0)
          - Number(bufferBaseEffects.buffAmplification || 0),
        switchingBuffAmplificationDelta: Number(targetEffects.buffAmplification || 0)
          - Number(bufferBaseEffects.buffAmplification || 0),
      } : null;
      const isPrimevalTarget = targetBody.itemRarity === '태초';
      return [{
        sourceType: 'oathBodyUpgrade',
        slot: '서약',
        tier: targetBody.itemRarity,
        cardTitle: '빛의 서약',
        cardSubtitle: targetBody.itemRarity,
        itemId: targetBody.itemId,
        itemName: targetBody.itemName,
        itemRarity: targetBody.itemRarity,
        iconUrl: targetBody.iconUrl,
        itemExplain: `${oathUpgrades.itemName || '현재 서약'} -> ${targetBody.itemName}`,
        currentEffects: cloneSimulatorValue(currentEffects),
        targetEffects: cloneSimulatorValue(targetEffects),
        currentOathSetPoint,
        targetOathSetPoint: Number(targetOath.setPoint || 0),
        currentOathStageName: currentState?.stageName || '',
        targetOathStageName: targetState?.stageName || '',
        effects,
        targetOathBody: cloneSimulatorValue(targetBody),
        targetOathUpgrades: targetOath,
        acquisitionOptions: cloneSimulatorValue(targetBody.acquisitionOptions || []),
        acquisition: isPrimevalTarget
          ? { label: '광휘의 흔적 2개\n안개서약 Lv.100 정가' }
          : null,
        freeAction: true,
        auction: { minUnitPrice: 0 },
        expectedGold: 0,
        metricType: isBuffer ? 'buffer' : undefined,
        bufferSimulatorSupported: isBuffer,
        bufferBaseRelativeChanges,
        skillDamageMultiplier: oathSetDamageMultiplier,
      }];
    });
  }

  function getOathBodyUpgradeExclusiveGroupKey(row = {}) {
    return row.sourceType === 'oathBodyUpgrade' ? 'oathBodyUpgrade' : '';
  }

  function getOathBodyUpgradeCandidateSignature(row = {}) {
    const groupKey = getOathBodyUpgradeExclusiveGroupKey(row);
    return groupKey && row.itemId ? `${groupKey}:${row.itemId}` : '';
  }

  function getOathUpgradeConfig(db = {}) {
    return db?.oathUpgrade && typeof db.oathUpgrade === 'object'
      ? db.oathUpgrade
      : {};
  }

  function getOathUpgradeLevel(oathUpgrades = {}, db = {}) {
    const maxLevel = Math.max(0, Number(getOathUpgradeConfig(db).maxLevel || 9));
    return Math.max(0, Math.min(maxLevel, Math.floor(Number(oathUpgrades?.oathUpgradeLevel || 0))));
  }

  function applyOathUpgradeLevel(oathUpgrades = {}, targetLevel = 0, db = {}) {
    const currentLevel = getOathUpgradeLevel(oathUpgrades, db);
    const normalizedTargetLevel = getOathUpgradeLevel({ oathUpgradeLevel: targetLevel }, db);
    if (normalizedTargetLevel <= currentLevel) return null;
    return {
      ...cloneSimulatorValue(oathUpgrades || {}),
      oathUpgradeLevel: normalizedTargetLevel,
    };
  }

  function getOathUpgradeDamageMultiplier(db = {}, baseOath = {}, simulatedOath = baseOath) {
    const config = getOathUpgradeConfig(db);
    const damagePerLevelPercent = Number(config.damagePerLevelPercent || 0);
    if (!Number.isFinite(damagePerLevelPercent) || damagePerLevelPercent <= 0) return 1;
    const levelDelta = getOathUpgradeLevel(simulatedOath, db) - getOathUpgradeLevel(baseOath, db);
    return Math.pow(1 + damagePerLevelPercent / 100, levelDelta);
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

  function getOathTuneDamageMultiplier(
    db = {},
    baseOath = {},
    simulatedOath = baseOath,
    baseEquipment = null,
    simulatedEquipment = baseEquipment,
  ) {
    const hasEquipmentContext = Array.isArray(baseEquipment) && Array.isArray(simulatedEquipment);
    const baseSetPoint = hasEquipmentContext
      ? getEquipmentOathPointState(baseEquipment, baseOath).oathSetPoint
      : Number(baseOath?.setPoint || 0);
    const simulatedSetPoint = hasEquipmentContext
      ? getEquipmentOathPointState(simulatedEquipment, simulatedOath).oathSetPoint
      : Number(simulatedOath?.setPoint || 0);
    const baseState = getOathTuneState(db, baseSetPoint);
    const simulatedState = getOathTuneState(db, simulatedSetPoint);
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
    const pointState = getEquipmentOathPointState(currentEquipmentUpgrades, oathUpgrades);
    if (pointState.equipmentSetPoint < equipmentTuneMinSetPoint) return [];
    const pointPerTune = Number(db.pointPerTune || 10);
    const totalSetPoint = pointState.oathSetPoint;
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

  function getOathUpgradeRows(oathUpgrades = {}, oathTuneDb = {}, materialPrices = {}, bufferBaseline = null) {
    const config = getOathUpgradeConfig(oathTuneDb);
    const maxLevel = Math.max(0, Number(config.maxLevel || 0));
    const currentLevel = getOathUpgradeLevel(oathUpgrades, oathTuneDb);
    const stages = Array.isArray(config.stages) ? config.stages : [];
    const damagePerLevelPercent = Number(config.damagePerLevelPercent || 0);
    const buffPowerPerLevel = Number(config.buffPowerPerLevel || 0);
    const isBufferMetric = Boolean(bufferBaseline?.isBuffer);
    if (
      currentLevel >= maxLevel
      || stages.length < maxLevel
      || !Number.isFinite(damagePerLevelPercent)
      || damagePerLevelPercent <= 0
      || !Number.isFinite(buffPowerPerLevel)
      || buffPowerPerLevel <= 0
    ) return [];

    let expectedGold = 0;
    const materialTotals = new Map();
    const tuneSteps = [];
    for (let targetLevel = currentLevel + 1; targetLevel <= maxLevel; targetLevel += 1) {
      const stage = stages.find((row) => Number(row?.level) === targetLevel);
      if (!stage) return [];
      expectedGold += Number(stage.gold || 0);
      const materialKey = String(stage.materialKey || '').trim();
      if (materialKey) {
        const previous = materialTotals.get(materialKey) || {
          key: materialKey,
          label: stage.materialLabel || materialKey,
          amount: 0,
          iconUrl: stage.iconUrl || '',
        };
        previous.amount += Number(stage.materialAmount || 0);
        materialTotals.set(materialKey, previous);
      }
      const levelDelta = targetLevel - currentLevel;
      tuneSteps.push({
        index: tuneSteps.length,
        currentOathUpgradeLevel: currentLevel,
        targetOathUpgradeLevel: targetLevel,
        maxOathUpgradeLevel: maxLevel,
        tuneCount: levelDelta,
        expectedGold,
        expectedMaterials: applyUpgradeMaterialPrices(
          [...materialTotals.values()].map((material) => ({ ...material })),
          'oathUpgrade',
          materialPrices,
        ),
        effects: isBufferMetric
          ? { buffPower: levelDelta * buffPowerPerLevel }
          : { skillDamageMultiplier: Math.pow(1 + damagePerLevelPercent / 100, levelDelta) },
      });
    }
    const first = tuneSteps[0];
    const nextStage = stages.find((row) => Number(row?.level) === currentLevel + 1) || {};
    const nextMaterial = first?.expectedMaterials?.find(
      (material) => material.key === nextStage.materialKey,
    );
    if (!first || !Number.isFinite(first.expectedGold) || first.expectedGold <= 0) return [];
    return [{
      sourceType: 'oathUpgrade',
      slot: '묵언의 진의',
      tier: '업그레이드',
      cardTitle: '묵언의 진의',
      cardSubtitle: '업그레이드',
      metricType: isBufferMetric ? 'buffer' : undefined,
      itemName: '묵언의 진의',
      itemRarity: '',
      iconUrl: nextMaterial?.iconUrl || '',
      itemExplain: '',
      effects: first.effects,
      auction: { minUnitPrice: first.expectedGold },
      expectedGold: first.expectedGold,
      expectedMaterials: first.expectedMaterials,
      tuneSteps,
      selectedTuneStepIndex: 0,
      currentOathUpgradeLevel: currentLevel,
      targetOathUpgradeLevel: first.targetOathUpgradeLevel,
      maxOathUpgradeLevel: maxLevel,
      tuneCount: first.targetOathUpgradeLevel - currentLevel,
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

  function getOathUpgradeExclusiveGroupKey(row = {}) {
    return row.sourceType === 'oathUpgrade' ? 'oathUpgrade' : '';
  }

  function getOathUpgradeCandidateSignature(row = {}) {
    const groupKey = getOathUpgradeExclusiveGroupKey(row);
    if (!groupKey) return '';
    const steps = Array.isArray(row.tuneSteps) ? row.tuneSteps : [];
    return [
      groupKey,
      Number(row.currentOathUpgradeLevel || steps[0]?.currentOathUpgradeLevel || 0),
      steps.map((step) => `${Number(step.targetOathUpgradeLevel || 0)}:${Number(step.tuneCount || 0)}`).join(','),
    ].join(':');
  }

  return {
    getOathBodyUpgradeRows,
    replaceOathBody,
    reconcileOathSetPointState,
    getOathBodyEffectsTotal,
    getOathBodyFinalDamageChangeMultiplier,
    getOathBodyUpgradeExclusiveGroupKey,
    getOathBodyUpgradeCandidateSignature,
    getBufferOathTuneBaseRelativeChanges,
    getBufferOathUpgradeBaseRelativeChanges,
    getOathTuneState,
    applyOathUpgradeLevel,
    applyOathTunePlan,
    getChangedOathTuneSlots,
    getOathTuneDamageMultiplier,
    getOathUpgradeDamageMultiplier,
    getOathCrystalEffectsTotal,
    getOathCrystalFinalDamageChangeMultiplier,
    getOathTuneRows,
    getOathUpgradeRows,
    getOathTuneExclusiveGroupKey,
    getOathTuneCandidateSignature,
    getOathUpgradeExclusiveGroupKey,
    getOathUpgradeCandidateSignature,
  };
}
