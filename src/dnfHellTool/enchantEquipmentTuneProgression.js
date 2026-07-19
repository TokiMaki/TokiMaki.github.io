export const EQUIPMENT_TUNE_MIN_SET_POINT = 2550;
const EQUIPMENT_TUNE_STEP_POINT = 10;
const EQUIPMENT_TUNE_MEMORY_POINT = 70;
export const EQUIPMENT_TUNE_MEMORY_FINAL_DAMAGE = 2;
const EQUIPMENT_TUNE_MEMORY_BUFF_POWER = 400;
const EQUIPMENT_TUNE_MAX_LEVEL = 3;
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

export function createEnchantEquipmentTuneProgression({
  applyUpgradeMaterialPrices,
  cloneSimulatorValue,
  upgradeMaterialLabels,
}) {

  function getBufferEquipmentTuneBaseRelativeChanges(row = {}) {
    if (row.sourceType !== 'equipmentTune') return null;
    const buffPowerDelta = Number(row.effects?.buffPower);
    return Number.isFinite(buffPowerDelta) && buffPowerDelta > 0
      ? { buffPowerDelta }
      : null;
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
      label: upgradeMaterialLabels[key] || key,
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

  return {
    getBufferEquipmentTuneBaseRelativeChanges,
    getEquipmentTuneStage,
    getEquipmentTuneSetPoint,
    getEquipmentTuneDamageMultiplier,
    applyEquipmentTunePlan,
    getChangedEquipmentTuneSlots,
    getEquipmentTuneRows,
    getEquipmentTuneExclusiveGroupKey,
    getEquipmentTuneCandidateSignature,
  };
}
