import { isEquipmentBodyReplacementSource } from './enchantEquipmentBodyReplacement.js';

export function createEnchantBufferSimulatorSourceCalculation(deps) {
  const {
    getReinforceSkillLevel,
    getBufferSkillContributionMap,
    getRoleRelevantEffects,
    getBufferSelectedStatEffect,
    getCreatureArtifactType,
    getItemSkillLevelBonus,
    buildSimulatedTitleTarget,
    getEquipmentProgressionType,
    getEquipmentProgressionMode,
    getCumulativeUpgradeEffectsForEquipment,
    resolveCanonicalEquipmentSlotId,
  } = deps;

  function getBufferEnchantBaseRelativeChanges(row, baseEnchant, baseline) {
    if (row?.sourceType !== 'enchant' || row?.role !== 'buffer') return null;
    const jobName = baseline?.jobName || '';
    const rawSkillLevel = getReinforceSkillLevel(row.reinforceSkill || [], jobName);
    const rawBaseSkillLevel = getReinforceSkillLevel(baseEnchant?.reinforceSkill || [], jobName);
    if (rawSkillLevel && !Array.isArray(row.bufferSkillContributions)) return null;
    if (rawBaseSkillLevel && !Array.isArray(baseEnchant?.bufferSkillContributions)) return null;
    const targetSkillContributions = row.bufferSkillContributions || [];
    const baseSkillContributions = baseEnchant?.bufferSkillContributions || [];
    const targetContributionMap = getBufferSkillContributionMap(targetSkillContributions);
    const baseContributionMap = getBufferSkillContributionMap(baseSkillContributions);
    if (targetContributionMap == null || baseContributionMap == null) return null;
    const contextKeys = new Set([
      ...Object.keys(targetContributionMap),
      ...Object.keys(baseContributionMap),
    ]);
    if ([...contextKeys].some((contextKey) => !baseline?.bufferSkillContexts?.[contextKey])) return null;
    const targetEffects = getRoleRelevantEffects(row.effects || {}, true);
    const currentEffects = getRoleRelevantEffects(baseEnchant?.effects || {}, true);
    const changedKeys = new Set([
      ...Object.keys(targetEffects || {}),
      ...Object.keys(currentEffects || {}),
    ].filter((key) => Number(targetEffects?.[key] || 0) !== Number(currentEffects?.[key] || 0)));
    if ([...changedKeys].some((key) => !['allStat', 'str', 'int', 'vit', 'spr'].includes(key))) return null;
    const statDelta = getBufferSelectedStatEffect(targetEffects, baseline)
      - getBufferSelectedStatEffect(currentEffects, baseline);
    if (!Number.isFinite(statDelta)) return null;
    return {
      statDelta,
      baseSkillContributions,
      targetSkillContributions,
    };
  }

  function getBufferCreatureArtifactBaseRelativeChanges(row, baseArtifact) {
    if (row?.sourceType !== 'creatureArtifact' || !getCreatureArtifactType(row)) return null;
    const targetEffects = getRoleRelevantEffects(row.effects || {}, true);
    const baseEffects = getRoleRelevantEffects(baseArtifact?.effects || {}, true);
    const changedKeys = new Set([
      ...Object.keys(targetEffects),
      ...Object.keys(baseEffects),
    ].filter((key) => Number(targetEffects[key] || 0) !== Number(baseEffects[key] || 0)));
    if ([...changedKeys].some((key) => !['allStat', 'buffPower', 'buffAmplification'].includes(key))) return null;
    const statDelta = Number(targetEffects.allStat || 0) - Number(baseEffects.allStat || 0);
    const buffPowerDelta = Number(targetEffects.buffPower || 0) - Number(baseEffects.buffPower || 0);
    const buffAmplificationDelta = Number(targetEffects.buffAmplification || 0)
      - Number(baseEffects.buffAmplification || 0);
    if (![statDelta, buffPowerDelta, buffAmplificationDelta].every(Number.isFinite)) return null;
    return {
      statDelta,
      buffPowerDelta,
      currentBuffAmplificationDelta: buffAmplificationDelta,
      switchingBuffAmplificationDelta: buffAmplificationDelta,
    };
  }

  function getBufferEquipmentBodyBaseRelativeChanges(row = {}, baseline = {}) {
    const targetBody = row.targetEquipmentBody || {};
    const currentBody = row.currentEquipmentBody || {};
    const targetSlotId = resolveCanonicalEquipmentSlotId(targetBody || row);
    const currentSlotId = resolveCanonicalEquipmentSlotId(currentBody || row);
    if (
      !isEquipmentBodyReplacementSource(row)
      || !targetSlotId
      || targetSlotId !== currentSlotId
      || !targetBody.itemId
    ) return null;
    const targetEffects = getRoleRelevantEffects(targetBody.effects || {}, true);
    const baseEffects = getRoleRelevantEffects(currentBody.effects || {}, true);
    const changedKeys = new Set([
      ...Object.keys(targetEffects),
      ...Object.keys(baseEffects),
    ].filter((key) => Number(targetEffects[key] || 0) !== Number(baseEffects[key] || 0)));
    if ([...changedKeys].some((key) => ![
      'allStat', 'str', 'int', 'vit', 'spr', 'buffPower', 'buffAmplification',
    ].includes(key))) return null;
    const statDelta = getBufferSelectedStatEffect(targetEffects, baseline)
      - getBufferSelectedStatEffect(baseEffects, baseline);
    const buffPowerDelta = Number(targetEffects.buffPower || 0)
      - Number(baseEffects.buffPower || 0)
      + Number(row.equipmentTuneBuffPowerDelta || 0);
    const buffAmplificationDelta = Number(targetEffects.buffAmplification || 0)
      - Number(baseEffects.buffAmplification || 0);
    const buffSkillLevelDelta = getItemSkillLevelBonus(
      targetBody,
      baseline,
      baseline.buffSkillName,
      30,
    ) - getItemSkillLevelBonus(currentBody, baseline, baseline.buffSkillName, 30);
    const awakeningSkillLevelDelta = getItemSkillLevelBonus(
      targetBody,
      baseline,
      baseline.awakeningSkillName,
      50,
    ) - getItemSkillLevelBonus(currentBody, baseline, baseline.awakeningSkillName, 50);
    if (![
      statDelta,
      buffPowerDelta,
      buffAmplificationDelta,
      buffSkillLevelDelta,
      awakeningSkillLevelDelta,
    ].every(Number.isFinite)) return null;
    return {
      statDelta,
      buffPowerDelta,
      currentBuffAmplificationDelta: buffAmplificationDelta,
      switchingBuffAmplificationDelta: buffAmplificationDelta,
      buffSkillLevelDelta,
      awakeningSkillLevelDelta,
      baseSkillContributions: getBufferItemSkillContributions(currentBody, baseline),
      targetSkillContributions: getBufferItemSkillContributions(targetBody, baseline),
    };
  }

  function getAuthoritativeItemSkillLevelBonus(item = {}, baseline = {}, skillName = '', requiredLevel = 0) {
    const jobName = baseline?.jobName || '';
    const reinforceSkillGroups = [
      ...(item?.itemReinforceSkill || []),
      ...(item?.reinforceSkill || []),
      ...(item?.enchant?.reinforceSkill || []),
    ];
    const namedBonus = getReinforceSkillLevel(reinforceSkillGroups, jobName, [skillName]);
    const rangeBonus = [
      ...reinforceSkillGroups,
      ...(item?.itemBuff?.reinforceSkill || []),
    ].reduce((total, job) => {
      if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return total;
      return total + (job?.levelRange || []).reduce((sum, range) => {
        const minimum = Number(range?.minLevel || 0);
        const maximum = Number(range?.maxLevel || 0);
        return minimum <= requiredLevel && requiredLevel <= maximum
          ? sum + Number(range?.value || 0)
          : sum;
      }, 0);
    }, 0);
    return namedBonus + rangeBonus;
  }

  function getBufferItemSkillContributions(item = {}, baseline = {}) {
    return Object.entries(baseline.currentSelfStatSkills || {}).flatMap(([skillName, info]) => {
      const contextKey = String(info?.contextKey || '').trim();
      if (!contextKey) return [];
      const levelContribution = getAuthoritativeItemSkillLevelBonus(
        item,
        baseline,
        skillName,
        Number(info?.requiredLevel || 0),
      );
      return levelContribution ? [{ contextKey, levelContribution }] : [];
    });
  }

  function getBufferEquippedItemBaseRelativeChanges(row = {}, baseItem = {}, baseline = {}, sourceType = '') {
    if (row.sourceType !== sourceType) return null;
    const targetEffects = getRoleRelevantEffects(row.effects || {}, true);
    const baseEffects = getRoleRelevantEffects(baseItem.effects || {}, true);
    const changedKeys = new Set([
      ...Object.keys(targetEffects),
      ...Object.keys(baseEffects),
    ].filter((key) => Number(targetEffects[key] || 0) !== Number(baseEffects[key] || 0)));
    if ([...changedKeys].some((key) => !['allStat', 'buffPower', 'buffAmplification'].includes(key))) return null;
    const statDelta = Number(targetEffects.allStat || 0) - Number(baseEffects.allStat || 0);
    const buffPowerDelta = Number(targetEffects.buffPower || 0) - Number(baseEffects.buffPower || 0);
    const buffAmplificationDelta = Number(targetEffects.buffAmplification || 0)
      - Number(baseEffects.buffAmplification || 0);
    const buffSkillLevelDelta = getItemSkillLevelBonus(row, baseline, baseline.buffSkillName, 30)
      - getItemSkillLevelBonus(baseItem, baseline, baseline.buffSkillName, 30);
    const awakeningSkillLevelDelta = getItemSkillLevelBonus(row, baseline, baseline.awakeningSkillName, 50)
      - getItemSkillLevelBonus(baseItem, baseline, baseline.awakeningSkillName, 50);
    if (![statDelta, buffPowerDelta, buffAmplificationDelta, buffSkillLevelDelta, awakeningSkillLevelDelta]
      .every(Number.isFinite)) return null;
    return {
      statDelta,
      buffPowerDelta,
      currentBuffAmplificationDelta: buffAmplificationDelta,
      switchingBuffAmplificationDelta: buffAmplificationDelta,
      buffSkillLevelDelta,
      awakeningSkillLevelDelta,
      baseSkillContributions: getBufferItemSkillContributions(baseItem, baseline),
      targetSkillContributions: getBufferItemSkillContributions(row, baseline),
    };
  }

  function getBufferCreatureBaseRelativeChanges(row = {}, baseCreature = {}, baseline = {}) {
    return getBufferEquippedItemBaseRelativeChanges(row, baseCreature, baseline, 'creature');
  }

  function getBufferAuraBaseRelativeChanges(row = {}, baseAura = {}, baseline = {}) {
    return getBufferEquippedItemBaseRelativeChanges(row, baseAura, baseline, 'aura');
  }

  function getBufferTitleBaseRelativeChanges(row = {}, baseTitle = {}, baseline = {}) {
    if (row.sourceType !== 'title') return null;
    return getBufferEquippedItemBaseRelativeChanges(
      buildSimulatedTitleTarget(row),
      baseTitle,
      baseline,
      'title',
    );
  }

  function getBufferSwitchingCreatureBaseRelativeChanges(row = {}) {
    if (row.sourceType !== 'switchingCreature') return null;
    const hasSkillContributions = row.hasExactSkillContributions === true;
    const changes = {
      switchingStatDelta: Number(
        hasSkillContributions ? row.switchingDirectStatDelta || 0 : row.switchingStatDelta || 0,
      ),
      switchingBuffAmplificationDelta: Number(row.switchingBuffAmplificationDelta || 0),
      buffSkillLevelDelta: Number(row.bufferBuffSkillLevelDelta || 0),
      auraStatDelta: Number(row.auraStatDelta || 0),
      auraAttackDelta: Number(row.auraAttackDelta || 0),
    };
    return Object.values(changes).every(Number.isFinite) ? {
      ...changes,
      baseSkillContributions: hasSkillContributions ? row.baseSkillContributions : [],
      targetSkillContributions: hasSkillContributions ? row.targetSkillContributions : [],
      skillContributionScope: hasSkillContributions ? row.skillContributionScope || 'switching' : 'common',
    } : null;
  }

  function getBufferSwitchingTitleBaseRelativeChanges(row = {}) {
    if (row.sourceType !== 'switchingTitle') return null;
    const hasSkillContributions = row.hasExactSkillContributions === true;
    const changes = {
      switchingStatDelta: Number(
        hasSkillContributions ? row.switchingDirectStatDelta || 0 : row.switchingStatDelta || 0,
      ),
      switchingBuffAmplificationDelta: Number(row.switchingBuffAmplificationDelta || 0),
      buffSkillLevelDelta: Number(row.bufferBuffSkillLevelDelta || 0),
      auraStatDelta: Number(row.auraStatDelta || 0),
      auraAttackDelta: Number(row.auraAttackDelta || 0),
    };
    return Object.values(changes).every(Number.isFinite) ? {
      ...changes,
      baseSkillContributions: hasSkillContributions ? row.baseSkillContributions : [],
      targetSkillContributions: hasSkillContributions ? row.targetSkillContributions : [],
      skillContributionScope: hasSkillContributions ? row.skillContributionScope || 'switching' : 'common',
    } : null;
  }

  function getBufferSwitchingAvatarBaseRelativeChanges(row = {}) {
    if (row.sourceType !== 'avatar' || row.kind !== 'switchingAvatar') return null;
    const source = row.bufferSimulatorChanges || {};
    const hasSkillContributions = row.hasExactSkillContributions === true;
    const changes = {
      switchingStatDelta: Number(
        hasSkillContributions ? source.switchingDirectStatDelta || 0 : source.switchingStatDelta || 0,
      ),
      buffSkillLevelDelta: Number(source.buffSkillLevelDelta || 0),
      targetPlatinumSkillLevel: Number(
        row.targetBuffChanges?.avatar?.buffContribution?.platinumSkillLevel || 0,
      ),
    };
    return Object.values(changes).every(Number.isFinite) ? {
      ...changes,
      baseSkillContributions: hasSkillContributions ? row.baseSkillContributions : [],
      targetSkillContributions: hasSkillContributions ? row.targetSkillContributions : [],
      skillContributionScope: hasSkillContributions ? row.skillContributionScope || 'switching' : 'common',
    } : null;
  }

  function getBufferSwitchingPlatinumBaseRelativeChanges(row = {}) {
    if (row.sourceType !== 'avatar' || row.kind !== 'switchingPlatinumEmblem') return null;
    const source = row.bufferSimulatorChanges || {};
    const hasSkillContributions = row.hasExactSkillContributions === true;
    const changes = {
      switchingStatDelta: Number(
        hasSkillContributions ? source.switchingDirectStatDelta || 0 : source.switchingStatDelta || 0,
      ),
      buffSkillLevelDelta: Number(source.buffSkillLevelDelta || 0),
      targetPlatinumSkillLevel: Number(
        row.targetBuffChanges?.platinumEmblem?.skillLevel || 0,
      ),
    };
    return Object.values(changes).every(Number.isFinite) ? {
      ...changes,
      baseSkillContributions: hasSkillContributions ? row.baseSkillContributions : [],
      targetSkillContributions: hasSkillContributions ? row.targetSkillContributions : [],
      skillContributionScope: hasSkillContributions ? row.skillContributionScope || 'switching' : 'common',
    } : null;
  }

  function getBufferUpgradeBaseRelativeChanges(row = {}, simulator = {}) {
    if (row.sourceType !== 'upgrade' || simulator?.role !== 'buffer') return null;
    const targetSlot = String(row.slot || '').trim();
    const progressionType = getEquipmentProgressionType(row);
    const targetLevel = Number(row.targetLevel);
    const baseEquipment = (simulator.baseEquipmentUpgrades || []).find(
      (equipment) => equipment?.slot === targetSlot,
    );
    if (!baseEquipment || !progressionType || !Number.isFinite(targetLevel)) return null;
    const baseMode = getEquipmentProgressionMode(baseEquipment);
    const targetMode = progressionType === 'amplify' ? 'amplification' : 'reinforcement';
    const targetEffects = getRoleRelevantEffects(
      getCumulativeUpgradeEffectsForEquipment(
        baseEquipment,
        targetLevel,
        targetMode,
        simulator.upgradeDb,
        simulator.baseBaseline,
        true,
      ),
      true,
    );
    const baseEffects = getRoleRelevantEffects(
      getCumulativeUpgradeEffectsForEquipment(
        baseEquipment,
        Number(baseEquipment.reinforce || 0),
        baseMode,
        simulator.upgradeDb,
        simulator.baseBaseline,
        true,
      ),
      true,
    );
    const changedKeys = new Set([
      ...Object.keys(targetEffects),
      ...Object.keys(baseEffects),
    ].filter((key) => Number(targetEffects[key] || 0) !== Number(baseEffects[key] || 0)));
    if ([...changedKeys].some((key) => key !== 'allStat')) return null;
    const statDelta = Number(targetEffects.allStat || 0) - Number(baseEffects.allStat || 0);
    return Number.isFinite(statDelta) ? { statDelta } : null;
  }

  return {
    getBufferEnchantBaseRelativeChanges,
    getBufferCreatureArtifactBaseRelativeChanges,
    getBufferEquipmentBodyBaseRelativeChanges,
    getBufferCreatureBaseRelativeChanges,
    getBufferAuraBaseRelativeChanges,
    getBufferTitleBaseRelativeChanges,
    getBufferSwitchingCreatureBaseRelativeChanges,
    getBufferSwitchingTitleBaseRelativeChanges,
    getBufferSwitchingAvatarBaseRelativeChanges,
    getBufferSwitchingPlatinumBaseRelativeChanges,
    getBufferUpgradeBaseRelativeChanges,
  };
}
