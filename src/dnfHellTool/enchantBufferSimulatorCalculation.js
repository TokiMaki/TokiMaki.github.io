const BUFF_LOADOUT_SLOT_NAME_ALIASES = {
  벨트: '허리',
};

const BUFFER_SIMULATOR_CHANGE_KEYS = [
  'statDelta',
  'currentStatDelta',
  'switchingStatDelta',
  'selfStatSkillDelta',
  'buffPowerDelta',
  'currentBuffAmplificationDelta',
  'switchingBuffAmplificationDelta',
  'buffSkillLevelDelta',
  'awakeningSkillLevelDelta',
  'auraStatDelta',
  'auraAttackDelta',
];

export function createEnchantBufferSimulatorCalculation(deps) {
  const {
    getBuffLoadoutRowsForMetric,
    cloneSimulatorValue,
    getBuffSimulatorTargetSlotId,
    getSelectedStatEffect,
  } = deps;

  function getBufferSkillContributionMap(contributions = []) {
    if (!Array.isArray(contributions)) return null;
    const result = {};
    for (const contribution of contributions) {
      const contextKey = String(contribution?.contextKey || '').trim();
      const levelContribution = Number(contribution?.levelContribution);
      if (!contextKey || !Number.isFinite(levelContribution)) return null;
      result[contextKey] = (result[contextKey] || 0) + levelContribution;
    }
    return result;
  }

  function normalizeBuffLoadoutEquipmentSlotName(value) {
    const rawSlotName = String(value || '').trim();
    return BUFF_LOADOUT_SLOT_NAME_ALIASES[rawSlotName] || rawSlotName;
  }

  function hasBuffLoadoutCollection(loadout, collectionName) {
    return Boolean(
      loadout
      && typeof loadout === 'object'
      && Object.prototype.hasOwnProperty.call(loadout, collectionName),
    );
  }

  function getBufferCurrentSourceScope(scopeSimulator = {}, sourceType = '', targetSlot = '') {
    const loadout = scopeSimulator?.simulatedBuffLoadout || scopeSimulator?.baseBuffLoadout || {};
    if (sourceType === 'title') {
      if (!hasBuffLoadoutCollection(loadout, 'equipment')) {
        return scopeSimulator?.baseBaseline?.switchingTitleUsesCurrent === false ? 'current' : 'shared';
      }
      const hasSeparateTitle = getBuffLoadoutRowsForMetric(loadout.equipment).some((row) => (
        String(row?.slotId || '').trim() === 'TITLE'
        || normalizeBuffLoadoutEquipmentSlotName(row?.slotName) === '칭호'
      ));
      return hasSeparateTitle ? 'current' : 'shared';
    }
    if (sourceType === 'creature') {
      if (!hasBuffLoadoutCollection(loadout, 'creature')) return 'shared';
      return getBuffLoadoutRowsForMetric(loadout.creature).length ? 'current' : 'shared';
    }
    if (sourceType === 'aura') {
      if (!hasBuffLoadoutCollection(loadout, 'avatar')) return 'shared';
      const aura = getBuffLoadoutRowsForMetric(loadout.avatar)
        .find((row) => String(row?.slotId || '').trim() === 'AURORA');
      const source = String(aura?.buffAvatarSource || '').trim();
      if (source === 'wornFallback') return 'shared';
      return ['actual', 'simulatedPackage'].includes(source) ? 'current' : 'shared';
    }
    if (sourceType === 'equipment') {
      const slotName = normalizeBuffLoadoutEquipmentSlotName(targetSlot);
      if (!slotName || !hasBuffLoadoutCollection(loadout, 'equipment')) return 'shared';
      const hasSeparateEquipment = getBuffLoadoutRowsForMetric(loadout.equipment).some((row) => (
        normalizeBuffLoadoutEquipmentSlotName(row?.slotName) === slotName
        || (slotName === '칭호' && String(row?.slotId || '').trim() === 'TITLE')
      ));
      return hasSeparateEquipment ? 'current' : 'shared';
    }
    return 'shared';
  }

  function scopeBufferCurrentChanges(slotChanges = {}, scope = 'shared') {
    if (scope !== 'current') return slotChanges;
    return {
      ...slotChanges,
      statDelta: 0,
      currentStatDelta: Number(slotChanges.currentStatDelta || 0)
        + Number(slotChanges.statDelta || 0)
        + Number(slotChanges.selfStatSkillDelta || 0),
      switchingStatDelta: 0,
      selfStatSkillDelta: 0,
      switchingBuffAmplificationDelta: 0,
      buffSkillLevelDelta: 0,
      skillContributionScope: 'current',
    };
  }

  function scopeBufferCurrentChangesBySlot(changesBySlot = {}, scopeSimulator = {}) {
    return Object.fromEntries(Object.entries(changesBySlot || {}).map(([slotName, slotChanges]) => [
      slotName,
      scopeBufferCurrentChanges(
        slotChanges,
        getBufferCurrentSourceScope(scopeSimulator, 'equipment', slotName),
      ),
    ]));
  }

  function scopeBufferCurrentChangesBySource(changesBySource = {}, scopeSimulator = {}, sourceType = '') {
    const scope = getBufferCurrentSourceScope(scopeSimulator, sourceType);
    return Object.fromEntries(Object.entries(changesBySource || {}).map(([sourceKey, slotChanges]) => [
      sourceKey,
      scopeBufferCurrentChanges(slotChanges, scope),
    ]));
  }

  function getBufferBaselineSkillContexts(baseline = {}) {
    return Object.entries(baseline.currentSelfStatSkills || {}).reduce((contexts, [skillName, info]) => {
      const contextKey = String(info?.contextKey || '').trim();
      const currentLevel = Number(info?.level);
      if (!contextKey || !Number.isInteger(currentLevel) || currentLevel <= 0) return contexts;
      const hasOwnFiniteValue = (field) => Object.prototype.hasOwnProperty.call(info || {}, field)
        && Number.isFinite(Number(info?.[field]));
      const getAdjacentChanges = (prefix) => {
        const fieldPairs = [
          ['affectsSelfStat', `${prefix}Stat`, 'currentStat', 'selfStatSkillDelta'],
          ['affectsAuraStat', `${prefix}PartyStat`, 'currentPartyStat', 'auraStatDelta'],
          ['affectsAuraAttack', `${prefix}PartyAttack`, 'currentPartyAttack', 'auraAttackDelta'],
        ];
        const changes = {};
        for (const [affectsField, targetField, currentField, changeField] of fieldPairs) {
          if (!info?.[affectsField]) {
            changes[changeField] = 0;
            continue;
          }
          if (!hasOwnFiniteValue(targetField) || !hasOwnFiniteValue(currentField)) return null;
          changes[changeField] = Number(info[targetField]) - Number(info[currentField]);
        }
        return changes;
      };
      const currentChanges = {
        selfStatSkillDelta: 0,
        auraStatDelta: 0,
        auraAttackDelta: 0,
      };
      const previousChanges = currentLevel > 1 ? getAdjacentChanges('previous') : null;
      const nextChanges = getAdjacentChanges('next');
      const netChangesByLevel = {
        ...(previousChanges ? { [String(currentLevel - 1)]: previousChanges } : {}),
        [String(currentLevel)]: currentChanges,
        ...(nextChanges ? { [String(currentLevel + 1)]: nextChanges } : {}),
      };
      const availableLevels = Object.keys(netChangesByLevel).map(Number).filter(Number.isInteger);
      contexts[contextKey] = {
        jobId: info.jobId || '',
        skillId: info.skillId || '',
        skillName,
        currentLevel,
        minReachableLevel: Math.min(...availableLevels),
        maxReachableLevel: Math.max(...availableLevels),
        netChangesByLevel,
      };
      return contexts;
    }, {});
  }

  function mergeBufferSkillContexts(...contextCollections) {
    return contextCollections.reduce((merged, contexts) => {
      Object.entries(contexts || {}).forEach(([contextKey, context]) => {
        if (!context || typeof context !== 'object') return;
        const previous = merged[contextKey] || {};
        const netChangesByLevel = {
          ...(previous.netChangesByLevel || {}),
          ...(context.netChangesByLevel || {}),
        };
        const levels = Object.keys(netChangesByLevel).map(Number).filter(Number.isInteger);
        merged[contextKey] = {
          ...previous,
          ...cloneSimulatorValue(context),
          minReachableLevel: levels.length ? Math.min(...levels) : context.minReachableLevel,
          maxReachableLevel: levels.length ? Math.max(...levels) : context.maxReachableLevel,
          netChangesByLevel,
        };
      });
      return merged;
    }, {});
  }

  function resolveBufferNetChanges(
    changesBySlot = {},
    skillContexts = {},
    artifactChangesByType = {},
    upgradeChangesBySlot = {},
    equipmentTuneChangesBySource = {},
    oathTuneChangesBySource = {},
    oathAcquisitionChangesBySource = {},
    blackFangChangesBySlot = {},
    creatureChangesBySource = {},
    auraChangesBySource = {},
    titleChangesBySource = {},
    switchingCreatureChangesBySource = {},
    switchingTitleChangesBySource = {},
    switchingAvatarChangesBySlot = {},
    switchingPlatinumChangesBySlot = {},
    avatarEmblemChangesBySocket = {},
    scopeSimulator = {},
  ) {
    const resolvedSwitchingPlatinumChangesBySlot = Object.fromEntries(
      Object.entries(switchingPlatinumChangesBySlot || {}).map(([slotId, slotChanges]) => {
        const packageChanges = switchingAvatarChangesBySlot?.[slotId];
        if (!packageChanges) return [slotId, slotChanges];
        const targetPlatinumSkillLevel = Number(slotChanges?.targetPlatinumSkillLevel);
        const packagePlatinumSkillLevel = Number(packageChanges?.targetPlatinumSkillLevel);
        if (!Number.isFinite(targetPlatinumSkillLevel) || !Number.isFinite(packagePlatinumSkillLevel)) {
          throw new TypeError(`Invalid switching platinum contribution: ${slotId}`);
        }
        return [slotId, {
          ...slotChanges,
          buffSkillLevelDelta: targetPlatinumSkillLevel - packagePlatinumSkillLevel,
        }];
      }),
    );
    const scopedChangesBySlot = scopeBufferCurrentChangesBySlot(changesBySlot, scopeSimulator);
    const scopedUpgradeChangesBySlot = scopeBufferCurrentChangesBySlot(
      upgradeChangesBySlot,
      scopeSimulator,
    );
    const scopedBlackFangChangesBySlot = scopeBufferCurrentChangesBySlot(
      blackFangChangesBySlot,
      scopeSimulator,
    );
    const scopedCreatureChangesBySource = scopeBufferCurrentChangesBySource(
      creatureChangesBySource,
      scopeSimulator,
      'creature',
    );
    const scopedAuraChangesBySource = scopeBufferCurrentChangesBySource(
      auraChangesBySource,
      scopeSimulator,
      'aura',
    );
    const scopedTitleChangesBySource = scopeBufferCurrentChangesBySource(
      titleChangesBySource,
      scopeSimulator,
      'title',
    );
    const changes = [
      ...Object.values(scopedChangesBySlot),
      ...Object.values(artifactChangesByType || {}),
      ...Object.values(scopedUpgradeChangesBySlot),
      ...Object.values(equipmentTuneChangesBySource || {}),
      ...Object.values(oathTuneChangesBySource || {}),
      ...Object.values(oathAcquisitionChangesBySource || {}),
      ...Object.values(scopedBlackFangChangesBySlot),
      ...Object.values(scopedCreatureChangesBySource),
      ...Object.values(scopedAuraChangesBySource),
      ...Object.values(scopedTitleChangesBySource),
      ...Object.values(switchingCreatureChangesBySource || {}),
      ...Object.values(switchingTitleChangesBySource || {}),
      ...Object.values(switchingAvatarChangesBySlot || {}),
      ...Object.values(resolvedSwitchingPlatinumChangesBySlot),
      ...Object.values(avatarEmblemChangesBySocket || {}),
    ];
    const total = changes.reduce((result, slotChanges) => {
      BUFFER_SIMULATOR_CHANGE_KEYS.forEach((key) => {
        const value = slotChanges?.[key] == null ? 0 : Number(slotChanges[key]);
        if (!Number.isFinite(value)) throw new TypeError(`Invalid buffer simulator change: ${key}`);
        result[key] += value;
      });
      return result;
    }, Object.fromEntries(BUFFER_SIMULATOR_CHANGE_KEYS.map((key) => [key, 0])));

    const levelDeltaByScope = { common: {}, current: {}, switching: {} };
    changes.forEach((slotChanges) => {
      const baseMap = getBufferSkillContributionMap(slotChanges?.baseSkillContributions || []);
      const targetMap = getBufferSkillContributionMap(slotChanges?.targetSkillContributions || []);
      if (baseMap == null || targetMap == null) throw new TypeError('Invalid buffer skill contribution');
      const scope = ['current', 'switching'].includes(slotChanges?.skillContributionScope)
        ? slotChanges.skillContributionScope
        : 'common';
      new Set([...Object.keys(baseMap), ...Object.keys(targetMap)]).forEach((contextKey) => {
        levelDeltaByScope[scope][contextKey] = (levelDeltaByScope[scope][contextKey] || 0)
          + Number(targetMap[contextKey] || 0)
          - Number(baseMap[contextKey] || 0);
      });
    });

    const changedContextKeys = new Set([
      ...Object.keys(levelDeltaByScope.common),
      ...Object.keys(levelDeltaByScope.current),
      ...Object.keys(levelDeltaByScope.switching),
    ]);
    changedContextKeys.forEach((contextKey) => {
      const commonLevelDelta = Number(levelDeltaByScope.common[contextKey] || 0);
      const currentLevelDelta = Number(levelDeltaByScope.current[contextKey] || 0);
      const switchingLevelDelta = Number(levelDeltaByScope.switching[contextKey] || 0);
      if (!commonLevelDelta && !currentLevelDelta && !switchingLevelDelta) return;

      const currentContext = skillContexts?.[contextKey];
      const switchingContextKey = `${contextKey}:switching`;
      const requiresSwitchingContext = Boolean(commonLevelDelta || switchingLevelDelta);
      const switchingContext = skillContexts?.[switchingContextKey]
        || (requiresSwitchingContext ? null : currentContext);
      const currentBaseLevel = Number(currentContext?.currentLevel);
      const switchingBaseLevel = Number(switchingContext?.currentLevel);
      const commonCurrentLevel = currentBaseLevel + commonLevelDelta;
      const currentOnlyLevel = commonCurrentLevel + currentLevelDelta;
      const commonSwitchingLevel = switchingBaseLevel + commonLevelDelta;
      const switchingOnlyLevel = commonSwitchingLevel + switchingLevelDelta;
      const commonCurrentNetChanges = currentContext?.netChangesByLevel?.[String(commonCurrentLevel)];
      const currentOnlyNetChanges = currentContext?.netChangesByLevel?.[String(currentOnlyLevel)];
      const commonSwitchingNetChanges = switchingContext?.netChangesByLevel?.[String(commonSwitchingLevel)];
      const switchingOnlyNetChanges = switchingContext?.netChangesByLevel?.[String(switchingOnlyLevel)];
      if (
        !currentContext
        || !switchingContext
        || !Number.isInteger(commonCurrentLevel)
        || !Number.isInteger(currentOnlyLevel)
        || !Number.isInteger(commonSwitchingLevel)
        || !Number.isInteger(switchingOnlyLevel)
        || !commonCurrentNetChanges
        || !currentOnlyNetChanges
        || !commonSwitchingNetChanges
        || !switchingOnlyNetChanges
      ) {
        throw new RangeError(
          `Unsupported buffer skill level: ${contextKey}:${currentOnlyLevel}/${switchingOnlyLevel}`,
        );
      }
      ['selfStatSkillDelta', 'auraStatDelta', 'auraAttackDelta'].forEach((key) => {
        const commonCurrentValue = Number(commonCurrentNetChanges[key] || 0);
        const currentOnlyValue = Number(currentOnlyNetChanges[key] || 0);
        const commonSwitchingValue = Number(commonSwitchingNetChanges[key] || 0);
        const switchingOnlyValue = Number(switchingOnlyNetChanges[key] || 0);
        if ([
          commonCurrentValue,
          currentOnlyValue,
          commonSwitchingValue,
          switchingOnlyValue,
        ].some((value) => !Number.isFinite(value))) {
          throw new TypeError(`Invalid buffer skill change: ${contextKey}:${key}`);
        }
        if (key === 'selfStatSkillDelta') {
          total.selfStatSkillDelta += commonCurrentValue;
          total.currentStatDelta += currentOnlyValue - commonCurrentValue;
          total.switchingStatDelta += switchingOnlyValue - commonCurrentValue;
        } else {
          total[key] += currentOnlyValue;
        }
      });
    });
    return total;
  }

  function replaceBufferScopeLoadoutRow(loadout = {}, collectionName = '', predicate, nextRow = null) {
    const rows = getBuffLoadoutRowsForMetric(loadout?.[collectionName]);
    const index = rows.findIndex(predicate);
    if (index >= 0 && nextRow) rows.splice(index, 1, cloneSimulatorValue(nextRow));
    else if (index >= 0) rows.splice(index, 1);
    else if (nextRow) rows.push(cloneSimulatorValue(nextRow));
    loadout[collectionName] = rows;
  }

  function getBufferRecommendationScopeSimulator(simulator = {}, row = {}, useCandidate = false) {
    const targetSlotId = getBuffSimulatorTargetSlotId(row);
    const changesSwitchingSource = row.sourceType === 'switchingTitle'
      || row.sourceType === 'switchingCreature'
      || row.sourceType === 'switchingFragment'
      || (row.sourceType === 'avatar' && row.kind === 'switchingAvatar');
    if (!changesSwitchingSource || !targetSlotId) return simulator;
    const loadout = cloneSimulatorValue(simulator.simulatedBuffLoadout || simulator.baseBuffLoadout || {});
    const baseLoadout = simulator.baseBuffLoadout || {};
    if (row.sourceType === 'switchingTitle') {
      const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.equipment)
        .find((item) => String(item?.slotId || '').trim() === 'TITLE') || null;
      replaceBufferScopeLoadoutRow(
        loadout,
        'equipment',
        (item) => String(item?.slotId || '').trim() === 'TITLE',
        useCandidate
          ? { ...(row.targetBuffChanges?.equipment || {}), slotId: 'TITLE', slotName: '칭호' }
          : baseRow,
      );
    } else if (row.sourceType === 'switchingCreature') {
      loadout.creature = useCandidate
        ? [{ ...(row.targetBuffChanges?.creature || {}), slotId: 'CREATURE' }]
        : cloneSimulatorValue(baseLoadout.creature || []);
    } else if (row.sourceType === 'switchingFragment') {
      const normalizedTargetSlot = normalizeBuffLoadoutEquipmentSlotName(targetSlotId);
      const matchesTargetSlot = (item) => (
        normalizeBuffLoadoutEquipmentSlotName(item?.slotName) === normalizedTargetSlot
      );
      const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.equipment)
        .find(matchesTargetSlot) || null;
      replaceBufferScopeLoadoutRow(
        loadout,
        'equipment',
        matchesTargetSlot,
        useCandidate
          ? { ...(row.targetBuffChanges?.equipment || {}), slotName: normalizedTargetSlot }
          : baseRow,
      );
    } else {
      const baseRow = getBuffLoadoutRowsForMetric(baseLoadout.avatar)
        .find((item) => String(item?.slotId || '').trim() === targetSlotId) || null;
      replaceBufferScopeLoadoutRow(
        loadout,
        'avatar',
        (item) => String(item?.slotId || '').trim() === targetSlotId,
        useCandidate
          ? {
            ...(row.targetBuffChanges?.avatar || {}),
            slotId: targetSlotId,
            buffAvatarSource: 'simulatedPackage',
          }
          : baseRow,
      );
    }
    return { ...simulator, simulatedBuffLoadout: loadout };
  }

  function getBufferAvatarEmblemChangesBySocket(row = {}, baseline = {}) {
    if (
      row.sourceType !== 'avatar'
      || row.kind !== 'brilliantEmblem'
    ) return null;
    const targetSlotId = String(row.targetSlotId || '').trim();
    const socketChanges = Array.isArray(row.socketChanges) ? row.socketChanges : [];
    if (!targetSlotId || !socketChanges.length) return null;
    const changeKey = row.bufferStatScope === 'switching'
      ? 'switchingStatDelta'
      : row.bufferStatScope === 'current'
        ? 'currentStatDelta'
        : 'statDelta';
    const changesBySocket = {};
    for (const change of socketChanges) {
      const socketIndex = Number(change?.socketIndex);
      if (!Number.isInteger(socketIndex) || socketIndex < 0 || socketIndex >= 2 || !change?.targetEmblem) {
        return null;
      }
      const currentValue = getSelectedStatEffect(change.currentEmblem?.effects || {}, baseline);
      const targetValue = getSelectedStatEffect(change.targetEmblem.effects || {}, baseline);
      if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) return null;
      changesBySocket[`${targetSlotId}:${socketIndex}`] = {
        [changeKey]: targetValue - currentValue,
      };
    }
    return changesBySocket;
  }

  function getBufferSwitchingAvatarEmblemOverlays(row = {}) {
    if (
      row.sourceType !== 'avatar'
      || row.kind !== 'brilliantEmblem'
      || row.bufferStatScope !== 'switching'
    ) return null;
    const targetSlotId = String(row.targetBuffSlot || row.targetSlotId || '').trim();
    const socketChanges = Array.isArray(row.socketChanges) ? row.socketChanges : [];
    if (!targetSlotId || !socketChanges.length) return null;
    const overlays = {};
    for (const change of socketChanges) {
      const socketIndex = Number(change?.socketIndex);
      if (!Number.isInteger(socketIndex) || socketIndex < 0 || socketIndex >= 2 || !change?.targetEmblem) {
        return null;
      }
      overlays[`${targetSlotId}:${socketIndex}`] = {
        slotId: targetSlotId,
        socketIndex,
        baseEmblem: cloneSimulatorValue(change.currentEmblem || null),
        targetEmblem: cloneSimulatorValue(change.targetEmblem),
      };
    }
    return overlays;
  }

  function resolveBufferSwitchingAvatarEmblemChanges(
    simulator = {},
    overlaysBySocket = null,
    baseline = null,
    packageChangesBySlot = null,
  ) {
    simulator = simulator || {};
    overlaysBySocket ||= simulator.switchingAvatarEmblemOverlaysBySocket || {};
    baseline ||= simulator.baseBaseline || {};
    packageChangesBySlot ||= simulator.switchingAvatarChangesBySlot || {};
    const changesBySocket = {};
    for (const [socketKey, overlay] of Object.entries(overlaysBySocket || {})) {
      const slotId = String(overlay?.slotId || '').trim();
      const socketIndex = Number(overlay?.socketIndex);
      const packageState = packageChangesBySlot?.[slotId];
      const packageEmblems = packageState?.regularEmblems;
      const underlayEmblem = packageState
        ? Array.isArray(packageEmblems) ? packageEmblems[socketIndex] || null : undefined
        : overlay?.baseEmblem || null;
      if (!slotId || !Number.isInteger(socketIndex) || underlayEmblem === undefined || !overlay?.targetEmblem) {
        return null;
      }
      const currentValue = getSelectedStatEffect(underlayEmblem?.effects || {}, baseline);
      const targetValue = getSelectedStatEffect(overlay.targetEmblem.effects || {}, baseline);
      if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) return null;
      changesBySocket[socketKey] = { switchingStatDelta: targetValue - currentValue };
    }
    return changesBySocket;
  }

  function mergeBufferChangeMap(changesByKey = {}) {
    return Object.values(changesByKey || {}).reduce((result, changes) => {
      BUFFER_SIMULATOR_CHANGE_KEYS.forEach((key) => {
        result[key] += Number(changes?.[key] || 0);
      });
      return result;
    }, Object.fromEntries(BUFFER_SIMULATOR_CHANGE_KEYS.map((key) => [key, 0])));
  }

  function getBufferAvatarEmblemNetChanges(
    simulator = {},
    avatarChangesBySocket = null,
    switchingOverlaysBySocket = null,
    packageChangesBySlot = null,
  ) {
    simulator = simulator || {};
    avatarChangesBySocket ||= simulator.avatarEmblemChangesBySocket || {};
    switchingOverlaysBySocket ||= simulator.switchingAvatarEmblemOverlaysBySocket || {};
    packageChangesBySlot ||= simulator.switchingAvatarChangesBySlot || {};
    const switchingChanges = resolveBufferSwitchingAvatarEmblemChanges(
      simulator,
      switchingOverlaysBySocket,
      simulator.baseBaseline || {},
      packageChangesBySlot,
    );
    if (switchingChanges == null) throw new RangeError('Unsupported switching avatar emblem underlay');
    const mergedChanges = { ...avatarChangesBySocket };
    Object.entries(switchingChanges).forEach(([socketKey, changes]) => {
      mergedChanges[socketKey] = {
        ...(mergedChanges[socketKey] || {}),
        ...changes,
      };
    });
    return mergedChanges;
  }

  function getBufferAvatarPlatinumBaseRelativeChanges(row = {}, baseline = {}) {
    if (row.sourceType !== 'avatar' || row.kind !== 'platinumEmblem') return null;
    const selfStatSkills = baseline.currentSelfStatSkills || {};
    const getContribution = (skillName) => {
      const info = selfStatSkills?.[skillName];
      return info?.contextKey ? [{
        contextKey: info.contextKey,
        jobId: info.jobId || '',
        skillId: info.skillId || '',
        skillName,
        levelContribution: 1,
      }] : [];
    };
    const baseSkillContributions = getContribution(row.currentPlatinumSkill || '');
    const targetSkillContributions = getContribution(row.targetSkill || '');
    const usesSelfStatContext = baseSkillContributions.length || targetSkillContributions.length;
    const statDelta = usesSelfStatContext ? 0 : Number(row.effects?.bufferStat || 0);
    const changes = {
      ...(row.bufferStatScope === 'current'
        ? { currentStatDelta: statDelta }
        : { statDelta }),
      buffSkillLevelDelta: Number(row.bufferBuffSkillLevelDelta || 0),
      awakeningSkillLevelDelta: Number(row.bufferAwakeningSkillLevelDelta || 0),
      baseSkillContributions,
      targetSkillContributions,
      skillContributionScope: row.bufferStatScope === 'current' ? 'current' : 'common',
    };
    return [statDelta, changes.buffSkillLevelDelta, changes.awakeningSkillLevelDelta].every(Number.isFinite)
      ? changes
      : null;
  }

  function getBufferAvatarNetChanges(simulator = {}) {
    return {
      ...getBufferAvatarEmblemNetChanges(simulator),
      ...(simulator.avatarPlatinumChangesBySlot || {}),
    };
  }

  return {
    getBufferSkillContributionMap,
    normalizeBuffLoadoutEquipmentSlotName,
    getBufferBaselineSkillContexts,
    mergeBufferSkillContexts,
    resolveBufferNetChanges,
    getBufferRecommendationScopeSimulator,
    getBufferAvatarEmblemChangesBySocket,
    getBufferSwitchingAvatarEmblemOverlays,
    resolveBufferSwitchingAvatarEmblemChanges,
    mergeBufferChangeMap,
    getBufferAvatarEmblemNetChanges,
    getBufferAvatarPlatinumBaseRelativeChanges,
    getBufferAvatarNetChanges,
  };
}
