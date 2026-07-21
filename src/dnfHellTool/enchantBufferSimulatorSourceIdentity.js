export function createEnchantBufferSimulatorSourceIdentity(deps) {
  const {
    getEffectSignature,
    getStableObjectSignature,
    blackFangSimulatorSlots: BLACK_FANG_SIMULATOR_SLOTS,
    getTitleCandidateSignature,
    getBuffSimulatorExclusiveGroupKey,
    getBuffSimulatorCandidateSignature,
    getCreatureArtifactType,
    upgradeSlotLabels: UPGRADE_SLOT_LABELS,
    getEquipmentProgressionType,
    resolveCanonicalEquipmentSlotId,
    resolveCanonicalEquipmentSlotName,
  } = deps;

  function getBufferEnchantExclusiveGroupKey(row = {}) {
    const slot = String(row.slot || '').trim();
    return row.sourceType === 'enchant' && row.role === 'buffer' && slot
      ? `bufferEnchant:${slot}`
      : '';
  }

  function getBufferEnchantCandidateSignature(row = {}) {
    const groupKey = getBufferEnchantExclusiveGroupKey(row);
    if (!groupKey) return '';
    return [
      groupKey,
      row.itemId || '',
      row.tier || '',
      getEffectSignature(row.effects || {}),
      getStableObjectSignature(row.reinforceSkill || []),
    ].join(':');
  }

  function getBufferBlackFangExclusiveGroupKey(row = {}) {
    const slot = String(row.slot || '').trim();
    return row.bufferSimulatorSupported && row.sourceType === 'blackFang' && BLACK_FANG_SIMULATOR_SLOTS.has(slot)
      ? `bufferBlackFang:${slot}`
      : '';
  }

  function getBufferBlackFangCandidateSignature(row = {}) {
    const groupKey = getBufferBlackFangExclusiveGroupKey(row);
    if (!groupKey || !row.targetItemId) return '';
    return [groupKey, row.targetItemId, getEffectSignature(row.targetEffects || {})].join(':');
  }

  function getBufferRelicCraftExclusiveGroupKey(row = {}) {
    const targetBody = row.targetEquipmentBody || row;
    const targetSlotId = resolveCanonicalEquipmentSlotId(targetBody);
    const targetSlotName = resolveCanonicalEquipmentSlotName(targetBody);
    const declaredTargetSlotId = resolveCanonicalEquipmentSlotId({
      slotId: row.targetSlotId,
      slot: row.slot,
    });
    if (declaredTargetSlotId && targetSlotId !== declaredTargetSlotId) return '';
    return row.bufferSimulatorSupported
      && row.sourceType === 'relicCraft'
      && targetSlotId
      && targetSlotName
      ? `bufferRelicCraft:${targetSlotName}`
      : '';
  }

  function getBufferRelicCraftCandidateSignature(row = {}) {
    const groupKey = getBufferRelicCraftExclusiveGroupKey(row);
    if (!groupKey || !row.targetItemId) return '';
    return [groupKey, row.targetItemId, getEffectSignature(row.targetEffects || {})].join(':');
  }

  function getBufferCreatureExclusiveGroupKey(row = {}) {
    return row.bufferSimulatorSupported && row.sourceType === 'creature'
      ? 'bufferCreature'
      : '';
  }

  function getBufferCreatureCandidateSignature(row = {}) {
    const groupKey = getBufferCreatureExclusiveGroupKey(row);
    if (!groupKey || !row.itemId) return '';
    return [
      groupKey,
      row.itemId,
      getEffectSignature(row.effects || {}),
      getStableObjectSignature(row.itemReinforceSkill || []),
      getStableObjectSignature(row.itemBuff || {}),
    ].join(':');
  }

  function getBufferAuraExclusiveGroupKey(row = {}) {
    return row.bufferSimulatorSupported && row.sourceType === 'aura'
      ? 'bufferAura'
      : '';
  }

  function getBufferAuraCandidateSignature(row = {}) {
    const groupKey = getBufferAuraExclusiveGroupKey(row);
    if (!groupKey || !row.itemId) return '';
    return [
      groupKey,
      row.itemId,
      row.tier || '',
      getEffectSignature(row.effects || {}),
      getStableObjectSignature(row.itemReinforceSkill || row.reinforceSkills || []),
      getStableObjectSignature(row.itemBuff || {}),
    ].join(':');
  }

  function getBufferTitleExclusiveGroupKey(row = {}) {
    return row.bufferSimulatorSupported && row.sourceType === 'title'
      ? 'bufferTitle'
      : '';
  }

  function getBufferTitleCandidateSignature(row = {}) {
    const groupKey = getBufferTitleExclusiveGroupKey(row);
    if (!groupKey) return '';
    const dealerSignature = getTitleCandidateSignature(row);
    return dealerSignature ? dealerSignature.replace(/^title:/, `${groupKey}:`) : '';
  }

  function getBufferSwitchingCreatureExclusiveGroupKey(row = {}) {
    return row.bufferSimulatorSupported && row.sourceType === 'switchingCreature'
      ? getBuffSimulatorExclusiveGroupKey(row)
      : '';
  }

  function getBufferSwitchingCreatureCandidateSignature(row = {}) {
    return getBufferSwitchingCreatureExclusiveGroupKey(row)
      ? getBuffSimulatorCandidateSignature(row)
      : '';
  }

  function getBufferSwitchingTitleExclusiveGroupKey(row = {}) {
    return row.bufferSimulatorSupported && row.sourceType === 'switchingTitle'
      ? getBuffSimulatorExclusiveGroupKey(row)
      : '';
  }

  function getBufferSwitchingTitleCandidateSignature(row = {}) {
    return getBufferSwitchingTitleExclusiveGroupKey(row)
      ? getBuffSimulatorCandidateSignature(row)
      : '';
  }

  function getBufferSwitchingAvatarExclusiveGroupKey(row = {}) {
    return row.bufferSimulatorSupported
      && row.sourceType === 'avatar'
      && row.kind === 'switchingAvatar'
      ? getBuffSimulatorExclusiveGroupKey(row)
      : '';
  }

  function getBufferSwitchingAvatarCandidateSignature(row = {}) {
    return getBufferSwitchingAvatarExclusiveGroupKey(row)
      ? getBuffSimulatorCandidateSignature(row)
      : '';
  }

  function getBufferSwitchingPlatinumExclusiveGroupKey(row = {}) {
    return row.bufferSimulatorSupported
      && row.sourceType === 'avatar'
      && row.kind === 'switchingPlatinumEmblem'
      ? getBuffSimulatorExclusiveGroupKey(row)
      : '';
  }

  function getBufferSwitchingPlatinumCandidateSignature(row = {}) {
    return getBufferSwitchingPlatinumExclusiveGroupKey(row)
      ? getBuffSimulatorCandidateSignature(row)
      : '';
  }

  function getBufferCreatureArtifactExclusiveGroupKey(row = {}) {
    const artifactType = getCreatureArtifactType(row);
    return row.bufferSimulatorSupported && row.sourceType === 'creatureArtifact' && artifactType
      ? `bufferCreatureArtifact:${artifactType}`
      : '';
  }

  function getBufferCreatureArtifactCandidateSignature(row = {}) {
    const groupKey = getBufferCreatureArtifactExclusiveGroupKey(row);
    return groupKey && row.itemId ? `${groupKey}:${row.itemId}` : '';
  }

  function getBufferUpgradeExclusiveGroupKey(row = {}) {
    const slot = String(row.slot || '').trim();
    return row.bufferSimulatorSupported && row.sourceType === 'upgrade' && slot && UPGRADE_SLOT_LABELS[slot]
      ? `bufferUpgrade:${slot}`
      : '';
  }

  function getBufferUpgradeCandidateSignature(row = {}) {
    const groupKey = getBufferUpgradeExclusiveGroupKey(row);
    const progressionType = getEquipmentProgressionType(row);
    const targetLevel = Number(row.targetLevel);
    if (!groupKey || !progressionType || !Number.isFinite(targetLevel)) return '';
    return `${groupKey}:${progressionType}:${targetLevel}`;
  }

  return {
    getBufferEnchantExclusiveGroupKey,
    getBufferEnchantCandidateSignature,
    getBufferBlackFangExclusiveGroupKey,
    getBufferBlackFangCandidateSignature,
    getBufferRelicCraftExclusiveGroupKey,
    getBufferRelicCraftCandidateSignature,
    getBufferCreatureExclusiveGroupKey,
    getBufferCreatureCandidateSignature,
    getBufferAuraExclusiveGroupKey,
    getBufferAuraCandidateSignature,
    getBufferTitleExclusiveGroupKey,
    getBufferTitleCandidateSignature,
    getBufferSwitchingCreatureExclusiveGroupKey,
    getBufferSwitchingCreatureCandidateSignature,
    getBufferSwitchingTitleExclusiveGroupKey,
    getBufferSwitchingTitleCandidateSignature,
    getBufferSwitchingAvatarExclusiveGroupKey,
    getBufferSwitchingAvatarCandidateSignature,
    getBufferSwitchingPlatinumExclusiveGroupKey,
    getBufferSwitchingPlatinumCandidateSignature,
    getBufferCreatureArtifactExclusiveGroupKey,
    getBufferCreatureArtifactCandidateSignature,
    getBufferUpgradeExclusiveGroupKey,
    getBufferUpgradeCandidateSignature,
  };
}
