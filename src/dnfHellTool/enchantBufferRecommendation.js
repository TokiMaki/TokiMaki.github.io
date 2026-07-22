import { isEquipmentBodyReplacementSource } from './enchantEquipmentBodyReplacement.js';
import { getPlagueHeartBufferPower, getPlagueHeartBufferRecommendationPower, getPlagueHeartConditionalEffectText } from './enchantPlagueHeartSynergy.js';

export function createEnchantBufferRecommendation(deps) {
  const {
    OATH_DECISION_VARIANT_SOURCE_TYPES,
    getReinforceSkillLevel,
    getItemSkillLevelBonus,
    isMaterialAcquisition,
    compareMaterialEnchantOrder,
    getCurrentCreatureArtifactBySlot,
    adaptOathAcquisitionRecommendation,
    getTitleBeadOnlyRow,
    isFreeActionRecommendation,
    getEffectSignature,
    addEffects,
    getRoleRelevantEffects,
    getBufferSelectedStatEffect,
    getBufferOathAcquisitionEvaluation,
    getBufferAvatarEmblemChangesBySocket,
    getBufferSwitchingAvatarEmblemOverlays,
    resolveBufferSwitchingAvatarEmblemChanges,
    getBufferCreatureArtifactBaseRelativeChanges,
    getBufferCreatureBaseRelativeChanges,
    getBufferAuraBaseRelativeChanges,
    getBufferTitleBaseRelativeChanges,
    getBufferSwitchingCreatureBaseRelativeChanges,
    getBufferSwitchingTitleBaseRelativeChanges,
    getBufferSwitchingPlatinumBaseRelativeChanges,
    getBufferSwitchingAvatarBaseRelativeChanges,
    getBufferAvatarPlatinumBaseRelativeChanges,
    mergeBufferChangeMap,
    getBufferEquipmentBodyBaseRelativeChanges,
    getBufferUpgradeBaseRelativeChanges,
    getBufferEquipmentTuneBaseRelativeChanges,
    getBufferOathTuneBaseRelativeChanges,
    getBufferEnchantBaseRelativeChanges,
    resolveBufferNetChanges,
    getCreatureArtifactType,
    getBuffSimulatorTargetSlotId,
    cloneSimulatorValue,
    getBufferRecommendationScopeSimulator,
    getBufferAvatarEmblemNetChanges,
    getRecommendationGold,
    getRoundedMetricKey,
    getStableObjectSignature,
    isPreferredDuplicateRecommendation,
    removeInefficientLowerTierEnchants,
  } = deps;

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

  function getBufferEnchantSkillDelta(row, current, baseline) {
    const jobName = baseline?.jobName || '';
    const candidateSkills = row?.reinforceSkill || [];
    const currentSkills = current?.reinforceSkill || [];
    const hasSkillValue = (info, fields) => fields.some((field) => Number(info?.[field] || 0) !== 0);
    return Object.entries(baseline.currentSelfStatSkills || {}).reduce((changes, [skillName, info]) => {
      const levelDelta = getReinforceSkillLevel(candidateSkills, jobName, [skillName])
        - getReinforceSkillLevel(currentSkills, jobName, [skillName]);
      changes.selfStatSkillDelta += getExactAdjacentSkillValueDelta(info, 'Stat', levelDelta);
      changes.auraStatDelta += getExactAdjacentSkillValueDelta(info, 'PartyStat', levelDelta);
      changes.auraAttackDelta += getExactAdjacentSkillValueDelta(info, 'PartyAttack', levelDelta);
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

  function getExactAdjacentSkillValueDelta(info, field, levelDelta) {
    if (!levelDelta) return 0;
    if (!Number.isInteger(levelDelta) || Math.abs(levelDelta) !== 1) return 0;
    const currentField = `current${field}`;
    const targetField = `${levelDelta > 0 ? 'next' : 'previous'}${field}`;
    if (
      !Object.prototype.hasOwnProperty.call(info || {}, currentField)
      || !Object.prototype.hasOwnProperty.call(info || {}, targetField)
    ) return 0;
    const current = Number(info[currentField]);
    const target = Number(info[targetField]);
    return Number.isFinite(current) && Number.isFinite(target) ? target - current : 0;
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
    if (isEquipmentBodyReplacementSource(row)) {
      const targetItem = row.targetEquipmentBody || {};
      const currentItem = row.currentEquipmentBody || {};
      return {
        buffSkillLevelDelta: getItemSkillLevelBonus(
          targetItem,
          baseline,
          baseline.buffSkillName,
          30,
        ) - getItemSkillLevelBonus(currentItem, baseline, baseline.buffSkillName, 30),
        awakeningSkillLevelDelta: getItemSkillLevelBonus(
          targetItem,
          baseline,
          baseline.awakeningSkillName,
          50,
        ) - getItemSkillLevelBonus(currentItem, baseline, baseline.awakeningSkillName, 50),
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
      changes.statDelta += getExactAdjacentSkillValueDelta(info, 'Stat', levelDelta);
      changes.auraStatDelta += getExactAdjacentSkillValueDelta(info, 'PartyStat', levelDelta);
      changes.auraAttackDelta += getExactAdjacentSkillValueDelta(info, 'PartyAttack', levelDelta);
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

  function compareBufferRecommendationOrder(a = {}, b = {}) {
    const priorityDiff = Number(a.recommendationPriority || 0) - Number(b.recommendationPriority || 0);
    if (priorityDiff) return priorityDiff;
    const materialDiff = Number(isMaterialAcquisition(b)) - Number(isMaterialAcquisition(a));
    if (materialDiff) return materialDiff;
    if (isMaterialAcquisition(a) && isMaterialAcquisition(b)) return compareMaterialEnchantOrder(a, b);
    const aEfficiency = Number(a.buffCostPerHundredPoints || 0);
    const bEfficiency = Number(b.buffCostPerHundredPoints || 0);
    const normalizedA = Number.isFinite(aEfficiency) && aEfficiency > 0
      ? aEfficiency
      : Number.POSITIVE_INFINITY;
    const normalizedB = Number.isFinite(bEfficiency) && bEfficiency > 0
      ? bEfficiency
      : Number.POSITIVE_INFINITY;
    return normalizedA - normalizedB;
  }

  function getBufferRecommendationRows(
    rows,
    currentEnchants,
    currentCreature,
    currentTitle,
    currentAura,
    baseline,
    includeMaterialCosts = false,
    simulator = null,
    currentEquipmentRows = [],
  ) {
    if (!baseline?.isBuffer) return [];
    const currentBySlot = new Map((currentEnchants || []).map((enchant) => [enchant.slot, enchant]));
    const currentArtifactBySlot = getCurrentCreatureArtifactBySlot(currentCreature);
    const equipmentRows = simulator?.simulatedEquipmentUpgrades || currentEquipmentRows || [];
    const baseScore = calculateBufferScore(baseline, {
      buffPowerDelta: getPlagueHeartBufferPower(equipmentRows),
    });
    const bySlotTier = new Map();
    (rows || []).forEach((row) => {
      if (row.sourceType === 'enchant' && row.role !== 'buffer') return;
      if (!['enchant', 'creature', 'creatureArtifact', 'title', 'switchingTitle', 'switchingCreature', 'aura', 'avatar', 'upgrade', 'equipmentTune', 'oathTune', 'oathTranscend', 'oathCraft', 'blackFang', 'relicCraft'].includes(row.sourceType)) return;
      if (OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType) && simulator?.role === 'buffer') {
        row = adaptOathAcquisitionRecommendation(row, simulator);
        if (!row) return;
      }
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
      const conditionalEffectText = getPlagueHeartConditionalEffectText(row, equipmentRows, true);
      if (conditionalEffectText) row = { ...row, conditionalEffectText };
      const currentPlagueHeartBuffPower = getPlagueHeartBufferRecommendationPower(
        row,
        equipmentRows,
        false,
      );
      const targetPlagueHeartBuffPower = getPlagueHeartBufferRecommendationPower(
        row,
        equipmentRows,
        true,
      );
      const current = ['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)
        ? {}
        : isEquipmentBodyReplacementSource(row)
          ? row.currentEquipmentBody || { effects: row.currentEffects || {} }
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
        row.sourceType !== 'relicCraft' &&
        row.sourceType !== 'oathTranscend' &&
        row.sourceType !== 'oathCraft' &&
        current?.itemId &&
        current.itemId === row.itemId &&
        getEffectSignature(current.effects || {}) === getEffectSignature(row.effects || {})
      ) return;
      const targetEffects = isEquipmentBodyReplacementSource(row)
        ? row.targetEquipmentBody?.effects || row.targetEffects || addEffects(row.currentEffects, row.effects)
        : row.sourceType === 'oathTranscend' || row.sourceType === 'oathCraft'
          ? row.targetEffects || row.effects || {}
        : row.effects || {};
      const scoringTargetEffects = getRoleRelevantEffects(targetEffects, true);
      const scoringCurrentEffects = getRoleRelevantEffects(current.effects || {}, true);
      const statDelta = row.sourceType === 'upgrade'
        ? Number(row.effects?.allStat || 0)
        : row.sourceType === 'enchant'
          ? getBufferSelectedStatEffect(scoringTargetEffects, baseline)
            - getBufferSelectedStatEffect(scoringCurrentEffects, baseline)
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
      const equipmentTuneBuffPowerDelta = isEquipmentBodyReplacementSource(row)
        ? Number(row.equipmentTuneBuffPowerDelta || 0)
        : 0;
      const baseBuffPowerDelta = row.sourceType === 'upgrade'
        ? 0
        : Number(scoringTargetEffects?.buffPower || 0)
          - Number(scoringCurrentEffects?.buffPower || 0)
          + oathSetBuffPowerDelta
          + equipmentTuneBuffPowerDelta;
      const buffPowerDelta = baseBuffPowerDelta
        + targetPlagueHeartBuffPower
        - currentPlagueHeartBuffPower;
      const candidateBuffPowerChange = baseBuffPowerDelta + targetPlagueHeartBuffPower;
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
      const baseCandidateChanges = {
        statDelta: Number(replacementStatChanges.statDelta || 0)
          + Number(avatarStatChanges.statDelta || 0)
          + Number(itemSkillChanges.statDelta || 0),
        buffPowerDelta: candidateBuffPowerChange,
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
      };
      const oathAcquisitionEvaluation = OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
        ? getBufferOathAcquisitionEvaluation(row, simulator)
        : null;
      const bufferAvatarEmblemChangesBySocket = row.sourceType === 'avatar'
        && row.kind === 'brilliantEmblem'
        && row.bufferStatScope !== 'switching'
        ? getBufferAvatarEmblemChangesBySocket(row, baseline)
        : null;
      const bufferSwitchingAvatarEmblemOverlaysBySocket = getBufferSwitchingAvatarEmblemOverlays(row);
      const bufferSwitchingAvatarEmblemChangesBySocket = bufferSwitchingAvatarEmblemOverlaysBySocket
        ? resolveBufferSwitchingAvatarEmblemChanges(
          simulator,
          bufferSwitchingAvatarEmblemOverlaysBySocket,
          baseline,
        )
        : null;
      const bufferBaseRelativeChanges = row.sourceType === 'creatureArtifact'
        ? getBufferCreatureArtifactBaseRelativeChanges(row, current)
        : row.sourceType === 'creature'
          ? getBufferCreatureBaseRelativeChanges(row, currentCreature || {}, baseline)
        : row.sourceType === 'aura'
          ? getBufferAuraBaseRelativeChanges(row, currentAura || {}, baseline)
        : row.sourceType === 'title'
          ? getBufferTitleBaseRelativeChanges(row, simulator?.baseTitle || currentTitle || {}, baseline)
        : row.sourceType === 'switchingCreature'
          ? getBufferSwitchingCreatureBaseRelativeChanges(row)
        : row.sourceType === 'switchingTitle'
          ? getBufferSwitchingTitleBaseRelativeChanges(row)
        : row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem'
          ? getBufferSwitchingPlatinumBaseRelativeChanges(row)
        : row.sourceType === 'avatar' && row.kind === 'switchingAvatar'
          ? getBufferSwitchingAvatarBaseRelativeChanges(row)
        : row.sourceType === 'avatar' && row.kind === 'platinumEmblem'
          ? getBufferAvatarPlatinumBaseRelativeChanges(row, baseline)
        : row.sourceType === 'avatar' && row.kind === 'brilliantEmblem'
          ? (bufferAvatarEmblemChangesBySocket || bufferSwitchingAvatarEmblemChangesBySocket)
            ? mergeBufferChangeMap(
              bufferAvatarEmblemChangesBySocket || bufferSwitchingAvatarEmblemChangesBySocket,
            )
            : null
        : isEquipmentBodyReplacementSource(row)
          ? getBufferEquipmentBodyBaseRelativeChanges(row, baseline)
        : row.sourceType === 'upgrade'
          ? getBufferUpgradeBaseRelativeChanges(row, simulator)
          : row.sourceType === 'equipmentTune'
            ? getBufferEquipmentTuneBaseRelativeChanges(row)
          : row.sourceType === 'oathTune'
            ? getBufferOathTuneBaseRelativeChanges(row)
          : OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
            ? oathAcquisitionEvaluation?.candidateChanges || null
          : getBufferEnchantBaseRelativeChanges(row, current, baseline);
      let bufferSimulatorSupported = simulator?.role === 'buffer' && Boolean(bufferBaseRelativeChanges);
      let baseCandidateScore = calculateBufferScore(baseline, baseCandidateChanges);
      if (bufferSimulatorSupported) {
        try {
          baseCandidateScore = calculateBufferScore(
            baseline,
            resolveBufferNetChanges(
              row.sourceType === 'enchant' ? { [row.slot]: bufferBaseRelativeChanges } : {},
              simulator.bufferSkillContexts,
              row.sourceType === 'creatureArtifact'
                ? { [getCreatureArtifactType(row)]: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'upgrade'
                ? { [row.slot]: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'equipmentTune'
                ? { equipmentTune: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'oathTune'
                ? { oathTune: bufferBaseRelativeChanges }
                : {},
              OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
                ? { oathAcquisition: bufferBaseRelativeChanges }
                : {},
              isEquipmentBodyReplacementSource(row)
                ? { [row.slot]: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'creature'
                ? { creature: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'aura'
                ? { aura: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'title'
                ? { title: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'switchingCreature'
                ? { switchingCreature: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'switchingTitle'
                ? { switchingTitle: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'avatar' && row.kind === 'switchingAvatar'
                ? { [getBuffSimulatorTargetSlotId(row)]: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem'
                ? { [getBuffSimulatorTargetSlotId(row)]: bufferBaseRelativeChanges }
                : {},
              row.sourceType === 'avatar' && row.kind === 'brilliantEmblem'
                ? bufferAvatarEmblemChangesBySocket || bufferSwitchingAvatarEmblemChangesBySocket
                : row.sourceType === 'avatar' && row.kind === 'platinumEmblem'
                  ? { [row.targetSlotId]: bufferBaseRelativeChanges }
                  : {},
              getBufferRecommendationScopeSimulator(simulator, row, true),
            ),
          );
        } catch {
          bufferSimulatorSupported = false;
        }
      }
      const baseIncrementalBuffScore = baseCandidateScore - baseScore;
      if (baseIncrementalBuffScore <= 0.0001) return;
      let candidateScore = baseCandidateScore;
      let comparisonScore = baseScore;
      if (bufferSimulatorSupported) {
        const referenceChangesBySlot = { ...(simulator.enchantChangesBySlot || {}) };
        const referenceArtifactChangesByType = { ...(simulator.artifactChangesByType || {}) };
        const referenceUpgradeChangesBySlot = { ...(simulator.upgradeChangesBySlot || {}) };
        const referenceEquipmentTuneChangesBySource = {
          ...(simulator.equipmentTuneChangesBySource || {}),
        };
        const referenceOathTuneChangesBySource = {
          ...(simulator.oathTuneChangesBySource || {}),
        };
        const referenceOathAcquisitionChangesBySource = {
          ...(simulator.oathAcquisitionChangesBySource || {}),
        };
        const referenceEquipmentBodyChangesBySlot = {
          ...(simulator.equipmentBodyChangesBySlot || {}),
        };
        const referenceCreatureChangesBySource = {
          ...(simulator.creatureChangesBySource || {}),
        };
        const referenceAuraChangesBySource = {
          ...(simulator.auraChangesBySource || {}),
        };
        const referenceTitleChangesBySource = {
          ...(simulator.titleChangesBySource || {}),
        };
        const referenceSwitchingCreatureChangesBySource = {
          ...(simulator.switchingCreatureChangesBySource || {}),
        };
        const referenceSwitchingTitleChangesBySource = {
          ...(simulator.switchingTitleChangesBySource || {}),
        };
        const referenceSwitchingAvatarChangesBySlot = {
          ...(simulator.switchingAvatarChangesBySlot || {}),
        };
        const referenceSwitchingPlatinumChangesBySlot = {
          ...(simulator.switchingPlatinumChangesBySlot || {}),
        };
        const referenceAvatarEmblemChangesBySocket = {
          ...(simulator.avatarEmblemChangesBySocket || {}),
        };
        const referenceSwitchingAvatarEmblemOverlaysBySocket = {
          ...(simulator.switchingAvatarEmblemOverlaysBySocket || {}),
        };
        const referenceAvatarPlatinumChangesBySlot = {
          ...(simulator.avatarPlatinumChangesBySlot || {}),
        };
        if (row.sourceType === 'enchant') delete referenceChangesBySlot[row.slot];
        if (row.sourceType === 'creatureArtifact') {
          delete referenceArtifactChangesByType[getCreatureArtifactType(row)];
        }
        if (row.sourceType === 'upgrade') delete referenceUpgradeChangesBySlot[row.slot];
        if (row.sourceType === 'equipmentTune') {
          delete referenceEquipmentTuneChangesBySource.equipmentTune;
        }
        if (row.sourceType === 'oathTune') {
          delete referenceOathTuneChangesBySource.oathTune;
        }
        if (OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)) {
          delete referenceOathAcquisitionChangesBySource.oathAcquisition;
          if (oathAcquisitionEvaluation?.referenceChanges) {
            referenceOathAcquisitionChangesBySource.oathAcquisition =
              oathAcquisitionEvaluation.referenceChanges;
          }
        }
        if (isEquipmentBodyReplacementSource(row)) {
          delete referenceEquipmentBodyChangesBySlot[row.slot];
        }
        if (row.sourceType === 'creature') delete referenceCreatureChangesBySource.creature;
        if (row.sourceType === 'aura') delete referenceAuraChangesBySource.aura;
        if (row.sourceType === 'title') delete referenceTitleChangesBySource.title;
        if (row.sourceType === 'switchingCreature') {
          delete referenceSwitchingCreatureChangesBySource.switchingCreature;
        }
        if (row.sourceType === 'switchingTitle') {
          delete referenceSwitchingTitleChangesBySource.switchingTitle;
        }
        if (row.sourceType === 'avatar' && row.kind === 'switchingAvatar') {
          delete referenceSwitchingAvatarChangesBySlot[getBuffSimulatorTargetSlotId(row)];
        }
        if (row.sourceType === 'avatar' && row.kind === 'switchingPlatinumEmblem') {
          delete referenceSwitchingPlatinumChangesBySlot[getBuffSimulatorTargetSlotId(row)];
        }
        if (row.sourceType === 'avatar' && row.kind === 'brilliantEmblem') {
          const socketPrefix = `${String(row.targetSlotId || '').trim()}:`;
          const targetMap = row.bufferStatScope === 'switching'
            ? referenceSwitchingAvatarEmblemOverlaysBySocket
            : referenceAvatarEmblemChangesBySocket;
          Object.keys(targetMap).forEach((socketKey) => {
            if (socketKey.startsWith(socketPrefix)) delete targetMap[socketKey];
          });
        }
        if (row.sourceType === 'avatar' && row.kind === 'platinumEmblem') {
          delete referenceAvatarPlatinumChangesBySlot[row.targetSlotId];
        }
        const candidateChangesBySlot = row.sourceType === 'enchant'
          ? { ...referenceChangesBySlot, [row.slot]: bufferBaseRelativeChanges }
          : referenceChangesBySlot;
        const candidateArtifactChangesByType = row.sourceType === 'creatureArtifact'
          ? {
            ...referenceArtifactChangesByType,
            [getCreatureArtifactType(row)]: bufferBaseRelativeChanges,
          }
          : referenceArtifactChangesByType;
        const candidateUpgradeChangesBySlot = row.sourceType === 'upgrade'
          ? { ...referenceUpgradeChangesBySlot, [row.slot]: bufferBaseRelativeChanges }
          : referenceUpgradeChangesBySlot;
        const candidateEquipmentTuneChangesBySource = row.sourceType === 'equipmentTune'
          ? { ...referenceEquipmentTuneChangesBySource, equipmentTune: bufferBaseRelativeChanges }
          : referenceEquipmentTuneChangesBySource;
        const candidateOathTuneChangesBySource = row.sourceType === 'oathTune'
          ? { ...referenceOathTuneChangesBySource, oathTune: bufferBaseRelativeChanges }
          : referenceOathTuneChangesBySource;
        const candidateOathAcquisitionChangesBySource = OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
          ? { oathAcquisition: bufferBaseRelativeChanges }
          : referenceOathAcquisitionChangesBySource;
        const candidateEquipmentBodyChangesBySlot = isEquipmentBodyReplacementSource(row)
          ? { ...referenceEquipmentBodyChangesBySlot, [row.slot]: bufferBaseRelativeChanges }
          : referenceEquipmentBodyChangesBySlot;
        const candidateCreatureChangesBySource = row.sourceType === 'creature'
          ? { creature: bufferBaseRelativeChanges }
          : referenceCreatureChangesBySource;
        const candidateAuraChangesBySource = row.sourceType === 'aura'
          ? { aura: bufferBaseRelativeChanges }
          : referenceAuraChangesBySource;
        const candidateTitleChangesBySource = row.sourceType === 'title'
          ? { title: bufferBaseRelativeChanges }
          : referenceTitleChangesBySource;
        const candidateSwitchingCreatureChangesBySource = row.sourceType === 'switchingCreature'
          ? { switchingCreature: bufferBaseRelativeChanges }
          : referenceSwitchingCreatureChangesBySource;
        const candidateSwitchingTitleChangesBySource = row.sourceType === 'switchingTitle'
          ? { switchingTitle: bufferBaseRelativeChanges }
          : referenceSwitchingTitleChangesBySource;
        const candidateSwitchingAvatarChangesBySlot = row.sourceType === 'avatar'
          && row.kind === 'switchingAvatar'
          ? {
            ...referenceSwitchingAvatarChangesBySlot,
            [getBuffSimulatorTargetSlotId(row)]: {
              ...bufferBaseRelativeChanges,
              regularEmblems: cloneSimulatorValue(row.targetBuffChanges?.avatar?.emblems || []),
            },
          }
          : referenceSwitchingAvatarChangesBySlot;
        const candidateSwitchingPlatinumChangesBySlot = row.sourceType === 'avatar'
          && row.kind === 'switchingPlatinumEmblem'
          ? {
            ...referenceSwitchingPlatinumChangesBySlot,
            [getBuffSimulatorTargetSlotId(row)]: bufferBaseRelativeChanges,
          }
          : referenceSwitchingPlatinumChangesBySlot;
        const candidateAvatarEmblemChangesBySocket = row.sourceType === 'avatar'
          && row.kind === 'brilliantEmblem'
          && row.bufferStatScope !== 'switching'
          ? {
            ...referenceAvatarEmblemChangesBySocket,
            ...bufferAvatarEmblemChangesBySocket,
          }
          : referenceAvatarEmblemChangesBySocket;
        const candidateSwitchingAvatarEmblemOverlaysBySocket = row.sourceType === 'avatar'
          && row.kind === 'brilliantEmblem'
          && row.bufferStatScope === 'switching'
          ? {
            ...referenceSwitchingAvatarEmblemOverlaysBySocket,
            ...bufferSwitchingAvatarEmblemOverlaysBySocket,
          }
          : referenceSwitchingAvatarEmblemOverlaysBySocket;
        const candidateAvatarPlatinumChangesBySlot = row.sourceType === 'avatar'
          && row.kind === 'platinumEmblem'
          ? {
            ...referenceAvatarPlatinumChangesBySlot,
            [row.targetSlotId]: bufferBaseRelativeChanges,
          }
          : referenceAvatarPlatinumChangesBySlot;
        const referenceScopeSimulator = getBufferRecommendationScopeSimulator(simulator, row, false);
        const candidateScopeSimulator = getBufferRecommendationScopeSimulator(simulator, row, true);
        try {
          comparisonScore = calculateBufferScore(
            baseline,
            resolveBufferNetChanges(
              referenceChangesBySlot,
              simulator.bufferSkillContexts,
              referenceArtifactChangesByType,
              referenceUpgradeChangesBySlot,
              referenceEquipmentTuneChangesBySource,
              referenceOathTuneChangesBySource,
              referenceOathAcquisitionChangesBySource,
              referenceEquipmentBodyChangesBySlot,
              referenceCreatureChangesBySource,
              referenceAuraChangesBySource,
              referenceTitleChangesBySource,
              referenceSwitchingCreatureChangesBySource,
              referenceSwitchingTitleChangesBySource,
              referenceSwitchingAvatarChangesBySlot,
              referenceSwitchingPlatinumChangesBySlot,
              {
                ...getBufferAvatarEmblemNetChanges(
                  simulator,
                  referenceAvatarEmblemChangesBySocket,
                  referenceSwitchingAvatarEmblemOverlaysBySocket,
                  referenceSwitchingAvatarChangesBySlot,
                ),
                ...referenceAvatarPlatinumChangesBySlot,
              },
              referenceScopeSimulator,
            ),
          );
          candidateScore = calculateBufferScore(
            baseline,
            resolveBufferNetChanges(
              candidateChangesBySlot,
              simulator.bufferSkillContexts,
              candidateArtifactChangesByType,
              candidateUpgradeChangesBySlot,
              candidateEquipmentTuneChangesBySource,
              candidateOathTuneChangesBySource,
              candidateOathAcquisitionChangesBySource,
              candidateEquipmentBodyChangesBySlot,
              candidateCreatureChangesBySource,
              candidateAuraChangesBySource,
              candidateTitleChangesBySource,
              candidateSwitchingCreatureChangesBySource,
              candidateSwitchingTitleChangesBySource,
              candidateSwitchingAvatarChangesBySlot,
              candidateSwitchingPlatinumChangesBySlot,
              {
                ...getBufferAvatarEmblemNetChanges(
                  simulator,
                  candidateAvatarEmblemChangesBySocket,
                  candidateSwitchingAvatarEmblemOverlaysBySocket,
                  candidateSwitchingAvatarChangesBySlot,
                ),
                ...candidateAvatarPlatinumChangesBySlot,
              },
              candidateScopeSimulator,
            ),
          );
        } catch {
          bufferSimulatorSupported = false;
          candidateScore = baseCandidateScore;
          comparisonScore = baseScore;
        }
      }
      const incrementalBuffScore = candidateScore - comparisonScore;
      const incrementalBuffPercent = comparisonScore > 0 ? (candidateScore / comparisonScore - 1) * 100 : 0;
      const price = getRecommendationGold(row, includeMaterialCosts);
      const buffCostPerHundredPoints = Number.isFinite(price) && price > 0 && incrementalBuffScore > 0
        ? price * 100 / incrementalBuffScore
        : 0;
      const key = row.sourceType === 'enchant'
        ? [
          row.sourceType,
          row.slot,
          getEffectSignature(scoringCurrentEffects),
          getEffectSignature(scoringTargetEffects),
          getRoundedMetricKey(baseIncrementalBuffScore),
          getStableObjectSignature(skillDelta),
          getStableObjectSignature(itemSkillChanges),
        ].join(':')
        : ['upgrade', 'equipmentTune', 'oathTune'].includes(row.sourceType)
        ? `${row.sourceType}:${row.slot}:${row.upgradeMode}:${row.targetLevel}`
        : OATH_DECISION_VARIANT_SOURCE_TYPES.has(row.sourceType)
          ? `${row.sourceType}:${row.variantGroupKey}:${Number(row.variantCount || 1)}`
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
          currentBufferScore: comparisonScore,
          candidateBufferScore: candidateScore,
          incrementalBuffScore,
          incrementalBuffPercent,
          buffCostPerHundredPoints,
          bufferSkillDelta: skillDelta,
          bufferStatDelta: statDelta,
          bufferBuffPowerDelta: buffPowerDelta,
          bufferBuffAmplificationDelta: buffAmplificationDelta,
          incrementalDamagePercent: incrementalBuffPercent,
          bufferSimulatorSupported,
          bufferBaseRelativeChanges,
          bufferAvatarEmblemChangesBySocket,
          bufferSwitchingAvatarEmblemOverlaysBySocket,
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
    return [...nonUpgradeRows, ...bestUpgradeBySlot.values()].sort(compareBufferRecommendationOrder);
  }

  return {
    calculateBufferScore,
    compareBufferRecommendationOrder,
    getBufferRecommendationRows,
  };
}
