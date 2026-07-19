export function createEnchantAvatarRecommendationSource(deps) {
  const {
    avatarPlatinumSlotLabelByKey: AVATAR_PLATINUM_SLOT_LABEL_BY_KEY,
    cloneSimulatorValue,
    getDealerPrimaryStatKey,
    addEffects,
    getDamageBaseline,
    normalizeSimulatorDamageDelta,
    subtractEffects,
    getSelectedStatEffect,
  } = deps;
  const AVATAR_EQUIPMENT_SCORE_RED_SLOT_IDS = new Set(['HEADGEAR', 'HAIR', 'WEAPON', 'AURORA', 'SKIN']);
  const AVATAR_EQUIPMENT_SCORE_GREEN_YELLOW_SLOT_IDS = new Set(['FACE', 'BREAST', 'JACKET', 'PANTS']);
  const AVATAR_EQUIPMENT_SCORE_STAT_BY_GRADE = {
    red: { shining: 10, ornate: 17, brilliant: 25 },
    greenYellow: { shining: 0, ornate: 10, brilliant: 15 },
  };

  function getAvatarPlatinumDamageMultiplier(changesBySlot = {}) {
    return Object.values(changesBySlot || {}).reduce((multiplier, changes) => {
      const value = Number(changes?.skillDamageMultiplier || 1);
      return multiplier * (Number.isFinite(value) && value > 0 ? value : 1);
    }, 1);
  }

  function resolveDealerAvatarSkillCoefficient(recognizedLevel) {
    const level = Number(recognizedLevel);
    return 1.20 + (Number.isFinite(level) && level > 0 ? level : 0) * 0.02;
  }

  function getDealerTitleRecognizedLevelContribution(title = {}, jobName = '') {
    const namedLevels = (title.itemReinforceSkill || []).flatMap((job) => {
      if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return [];
      return (job?.skills || []).map((skill) => Number(skill?.value || 0));
    });
    const rangeLevels = (title.itemBuff?.reinforceSkill || []).flatMap((job) => {
      if (jobName && job?.jobName && !['공통', jobName].includes(job.jobName)) return [];
      return (job?.levelRange || []).map((range) => Number(range?.value || 0));
    });
    return Math.max(
      0,
      ...namedLevels.filter(Number.isFinite),
      ...rangeLevels.filter(Number.isFinite),
    );
  }

  function getDealerAvatarRecognizedLevel(
    avatar = {},
    title = {},
    jobName = '',
    useBasePlatinum = false,
  ) {
    const topOptionLevel = Number(avatar?.recognizedTopOptionLevelContribution || 0);
    const platinumAvatar = useBasePlatinum ? avatar?.basePlatinumSlots : avatar?.slots;
    const platinumLevel = (platinumAvatar || []).reduce((sum, slot) => (
      sum + Number(slot?.recognizedPlatinumLevelContribution || 0)
    ), 0);
    return getDealerTitleRecognizedLevelContribution(title, jobName)
      + (Number.isFinite(topOptionLevel) ? topOptionLevel : 0)
      + platinumLevel;
  }

  function getDealerAvatarPlatinumEquipmentScoreMultiplier(simulator = {}) {
    const simulatedAvatar = simulator.simulatedAvatar || {};
    const jobName = simulator.baseDamageBaseline?.jobName || '';
    const currentLevel = getDealerAvatarRecognizedLevel(
      {
        ...simulatedAvatar,
        basePlatinumSlots: simulator.baseAvatar?.slots || [],
      },
      simulator.simulatedTitle || {},
      jobName,
      true,
    );
    const targetLevel = getDealerAvatarRecognizedLevel(
      simulatedAvatar,
      simulator.simulatedTitle || {},
      jobName,
    );
    return resolveDealerAvatarSkillCoefficient(targetLevel)
      / resolveDealerAvatarSkillCoefficient(currentLevel);
  }

  function getAvatarPlatinumRecommendationMultiplier(row = {}) {
    const explicit = Number(
      row.baseRelativeSkillDamageMultiplier
      || row.skillDamageMultiplier
      || row.effects?.skillDamageMultiplier
      || 0,
    );
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const finalDamage = Number(row.effects?.finalDamage || 0);
    return finalDamage > 0 ? 1 + finalDamage / 100 : 1;
  }

  function getAvatarRows(currentAvatar) {
    return (currentAvatar?.recommendations || []).map((candidate) => ({
      sourceType: 'avatar',
      kind: candidate.kind || '',
      slot: candidate.slot || '아바타',
      tier: candidate.tier || '아바타',
      itemId: candidate.itemId,
      itemName: candidate.itemName,
      itemRarity: candidate.itemRarity || '',
      fame: 0,
      iconUrl: candidate.iconUrl || (candidate.itemId ? `https://img-api.neople.co.kr/df/items/${encodeURIComponent(candidate.itemId)}` : ''),
      effects: candidate.effects || {},
      skillDamageMultiplier: Number(candidate.skillDamageMultiplier || 0),
      baseRelativeSkillDamageMultiplier: Number(candidate.skillDamageMultiplier || 0),
      itemExplain: candidate.itemExplain || '',
      auction: candidate.auction || {},
      expectedGold: candidate.expectedGold,
      acquisition: candidate.acquisition || null,
      needCount: candidate.needCount || 0,
      unitPrice: candidate.unitPrice,
      targetSlotId: candidate.targetSlotId || '',
      targetPlatinumEmblem: candidate.targetPlatinumEmblem || null,
      targetBuffSlot: candidate.targetBuffSlot || '',
      targetBuffChanges: candidate.targetBuffChanges || null,
      socketChanges: Array.isArray(candidate.socketChanges) ? candidate.socketChanges : [],
      targetSkill: candidate.targetSkill || '',
      equivalentTargetSkills: candidate.equivalentTargetSkills || [],
      currentSwitchingMultiplier: Number(candidate.currentSwitchingMultiplier || 0),
      candidateSwitchingMultiplier: Number(candidate.candidateSwitchingMultiplier || 0),
      priceMode: candidate.priceMode || '',
      bufferStatScope: candidate.bufferStatScope || '',
      bufferBuffSkillLevelDelta: Number(candidate.bufferBuffSkillLevelDelta || 0),
      bufferAwakeningSkillLevelDelta: Number(candidate.bufferAwakeningSkillLevelDelta || 0),
      bufferSimulatorChanges: candidate.bufferSimulatorChanges || null,
      bufferSkillStatDeltas: candidate.bufferSkillStatDeltas || {},
      bufferSkillLevels: candidate.bufferSkillLevels || {},
      currentPlatinumSkill: candidate.currentPlatinumSkill || '',
      baseSkillContributions: candidate.baseSkillContributions || [],
      targetSkillContributions: candidate.targetSkillContributions || [],
      hasExactSkillContributions: Array.isArray(candidate.baseSkillContributions)
        && Array.isArray(candidate.targetSkillContributions),
      skillContributionScope: candidate.skillContributionScope || '',
      priceWarningText: candidate.priceWarningText || '',
      recommendationPriority: Number(candidate.recommendationPriority || 0),
    }));
  }

  function normalizeAvatarSimulatorState(avatar = {}) {
    const normalized = cloneSimulatorValue(avatar || {});
    const platinumSlots = new Set(normalized.platinumSlots || []);
    normalized.recognizedTopOptionLevelContribution = normalized.jacket?.topOptionMatched ? 1 : 0;
    normalized.slots = (normalized.slots || []).map((slot) => {
      const regularSockets = Array.isArray(slot?.emblems) ? slot.emblems.slice(0, 2) : [];
      while (regularSockets.length < 2) regularSockets.push(null);
      const slotLabel = slot?.slotId === 'JACKET'
        ? AVATAR_PLATINUM_SLOT_LABEL_BY_KEY.top
        : slot?.slotId === 'PANTS'
          ? AVATAR_PLATINUM_SLOT_LABEL_BY_KEY.bottom
          : '';
      return {
        ...slot,
        recognizedPlatinumLevelContribution: slotLabel && platinumSlots.has(slotLabel) ? 1 : 0,
        emblems: regularSockets.map((emblem, socketIndex) => (
          emblem
            ? { ...emblem, socketKey: `regular:${socketIndex}`, socketIndex }
            : null
        )),
      };
    });
    return normalized;
  }

  function getAvatarRegularEmblemEffectsTotal(avatar = {}, mode = 'actual', baseline = {}) {
    const statKey = getDealerPrimaryStatKey(baseline);
    return (avatar?.slots || []).reduce((total, slot) => {
      const slotId = String(slot?.slotId || '').trim();
      return (slot?.emblems || []).reduce((slotTotal, emblem) => {
        if (!emblem) return slotTotal;
        if (mode === 'equipmentScore') {
          const grade = String(emblem.grade || '').trim();
          const scoreGroup = AVATAR_EQUIPMENT_SCORE_RED_SLOT_IDS.has(slotId)
            ? 'red'
            : AVATAR_EQUIPMENT_SCORE_GREEN_YELLOW_SLOT_IDS.has(slotId)
              ? 'greenYellow'
              : '';
          const recognizedStat = Number(AVATAR_EQUIPMENT_SCORE_STAT_BY_GRADE[scoreGroup]?.[grade] || 0);
          return recognizedStat ? addEffects(slotTotal, { [statKey]: recognizedStat }) : slotTotal;
        }
        return addEffects(slotTotal, emblem.effects || {});
      }, total);
    }, {});
  }

  function getAvatarEmblemMetricBaseline(baseBaseline = {}, baseAvatar = {}, mode = 'actual') {
    if (mode !== 'equipmentScore') return baseBaseline;
    const base = getDamageBaseline(baseBaseline);
    const recognitionDelta = normalizeSimulatorDamageDelta(
      subtractEffects(
        getAvatarRegularEmblemEffectsTotal(baseAvatar, 'equipmentScore', base),
        getAvatarRegularEmblemEffectsTotal(baseAvatar, 'actual', base),
      ),
      base,
    );
    return {
      ...baseBaseline,
      stat: base.stat + getSelectedStatEffect(recognitionDelta, base),
    };
  }

  return {
    getAvatarPlatinumDamageMultiplier,
    getDealerAvatarPlatinumEquipmentScoreMultiplier,
    getAvatarPlatinumRecommendationMultiplier,
    getAvatarRows,
    normalizeAvatarSimulatorState,
    getAvatarRegularEmblemEffectsTotal,
    getAvatarEmblemMetricBaseline,
  };
}
