export function createEnchantSimulatorIdentity(deps) {
  const {
    effectOrder: EFFECT_ORDER,
    blackFangSimulatorSlots: BLACK_FANG_SIMULATOR_SLOTS,
    resolveCanonicalEquipmentSlotId,
    resolveCanonicalEquipmentSlotName,
  } = deps;

  function getEffectSignature(effects = {}) {
    return EFFECT_ORDER
      .map((key) => `${key}:${Number(effects[key] || 0)}`)
      .join('|');
  }

  function getEnchantExclusiveGroupKey(row = {}) {
    const slot = String(row.slot || '').trim();
    return row.sourceType === 'enchant' && slot ? `enchant:${slot}` : '';
  }

  function getEnchantCandidateSignature(row = {}) {
    const groupKey = getEnchantExclusiveGroupKey(row);
    if (!groupKey) return '';
    return [
      groupKey,
      row.itemId || '',
      row.tier || '',
      getEffectSignature(row.effects || {}),
      getStableObjectSignature(row.reinforceSkill || []),
    ].join(':');
  }

  function getAuraExclusiveGroupKey(row = {}) {
    return row.sourceType === 'aura' ? 'aura' : '';
  }

  function getAuraCandidateSignature(row = {}) {
    const groupKey = getAuraExclusiveGroupKey(row);
    if (!groupKey) return '';
    return [
      groupKey,
      row.itemId || '',
      row.tier || '',
      getEffectSignature(row.effects || {}),
      getStableObjectSignature(row.itemReinforceSkill || row.reinforceSkills || []),
      Number(row.skillDamageMultiplier || 1).toFixed(8),
    ].join(':');
  }

  function getCreatureExclusiveGroupKey(row = {}) {
    return row.sourceType === 'creature' ? 'creature' : '';
  }

  function getCreatureCandidateSignature(row = {}) {
    const groupKey = getCreatureExclusiveGroupKey(row);
    if (!groupKey) return '';
    return [
      groupKey,
      row.itemId || '',
      row.tier || '',
      getEffectSignature(row.effects || {}),
      getStableObjectSignature(row.itemReinforceSkill || row.reinforceSkills || []),
      Number(row.skillDamageMultiplier || 1).toFixed(8),
    ].join(':');
  }

  const CREATURE_ARTIFACT_TYPES = new Set(['RED', 'BLUE', 'GREEN']);

  function getCreatureArtifactType(row = {}) {
    const artifactType = String(row.artifactType || row.slotColor || '').trim().toUpperCase();
    return CREATURE_ARTIFACT_TYPES.has(artifactType) ? artifactType : '';
  }

  function getCreatureArtifactExclusiveGroupKey(row = {}) {
    const artifactType = getCreatureArtifactType(row);
    return row.sourceType === 'creatureArtifact' && artifactType
      ? `creatureArtifact:${artifactType}`
      : '';
  }

  function getCreatureArtifactCandidateSignature(row = {}) {
    const groupKey = getCreatureArtifactExclusiveGroupKey(row);
    return groupKey && row.itemId ? `${groupKey}:${row.itemId}` : '';
  }

  function getTitleExclusiveGroupKey(row = {}) {
    return row.sourceType === 'title' ? 'title' : '';
  }

  function getTitleCandidateSignature(row = {}) {
    const groupKey = getTitleExclusiveGroupKey(row);
    if (!groupKey) return '';
    return [
      groupKey,
      row.itemId || '',
      row.tier || '',
      getEffectSignature(row.titlePackageEffects || row.effects || {}),
      row.titleEnchantElement || '',
      getEffectSignature(row.targetTitleEnchantEffects || row.enchantEffects || {}),
      row.titleBead?.itemId || '',
      row.purchaseRoute || '',
      row.priceItem?.itemId || '',
    ].join(':');
  }

  function getBlackFangExclusiveGroupKey(row = {}) {
    const slot = String(row.slot || '').trim();
    return row.sourceType === 'blackFang' && BLACK_FANG_SIMULATOR_SLOTS.has(slot)
      ? `blackFang:${slot}`
      : '';
  }

  function getBlackFangCandidateSignature(row = {}) {
    const groupKey = getBlackFangExclusiveGroupKey(row);
    if (!groupKey || !row.targetItemId) return '';
    return [
      groupKey,
      row.targetItemId,
      getEffectSignature(row.targetEffects || {}),
    ].join(':');
  }

  function getRelicCraftExclusiveGroupKey(row = {}) {
    const targetBody = row.targetEquipmentBody || row;
    const targetSlotId = resolveCanonicalEquipmentSlotId(targetBody);
    const targetSlotName = resolveCanonicalEquipmentSlotName(targetBody);
    const declaredTargetSlotId = resolveCanonicalEquipmentSlotId({
      slotId: row.targetSlotId,
      slot: row.slot,
    });
    if (declaredTargetSlotId && targetSlotId !== declaredTargetSlotId) return '';
    return row.sourceType === 'relicCraft' && targetSlotId && targetSlotName
      ? `relicCraft:${targetSlotName}`
      : '';
  }

  function getRelicCraftCandidateSignature(row = {}) {
    const groupKey = getRelicCraftExclusiveGroupKey(row);
    const targetBody = row.targetEquipmentBody || {};
    if (!groupKey || !targetBody.itemId) return '';
    return [
      groupKey,
      targetBody.itemId,
      getEffectSignature(targetBody.effects || {}),
    ].join(':');
  }

  function getAvatarEmblemExclusiveGroupKey(row = {}) {
    const targetSlotId = String(row.targetSlotId || '').trim();
    return row.sourceType === 'avatar' && row.kind === 'brilliantEmblem' && targetSlotId
      ? row.bufferStatScope === 'switching'
        ? `buffAvatarEmblem:${targetSlotId}`
        : `avatarEmblem:${targetSlotId}`
      : '';
  }

  function getAvatarEmblemCandidateSignature(row = {}) {
    const groupKey = getAvatarEmblemExclusiveGroupKey(row);
    if (!groupKey || !Array.isArray(row.socketChanges) || !row.socketChanges.length) return '';
    return [
      groupKey,
      row.itemId || '',
      row.socketChanges.map((change) => [
        change?.socketKey || `regular:${Number(change?.socketIndex)}`,
        change?.targetEmblem?.itemId || row.itemId || '',
        getEffectSignature(change?.targetEmblem?.effects || {}),
      ].join(':')).join(','),
    ].join(':');
  }

  function getAvatarPlatinumExclusiveGroupKey(row = {}) {
    const targetSlotId = String(row.targetSlotId || '').trim();
    return row.sourceType === 'avatar' && row.kind === 'platinumEmblem' && targetSlotId
      ? `avatarPlatinum:${targetSlotId}`
      : '';
  }

  function getAvatarPlatinumCandidateSignature(row = {}) {
    const groupKey = getAvatarPlatinumExclusiveGroupKey(row);
    if (!groupKey || !row.targetPlatinumEmblem?.itemId) return '';
    return [
      groupKey,
      row.targetPlatinumEmblem.itemId,
      row.targetPlatinumEmblem.targetSkill || row.targetSkill || '',
    ].join(':');
  }

  function getBuffSimulatorTargetSlotId(row = {}) {
    if (row.sourceType === 'switchingTitle') return 'TITLE';
    if (row.sourceType === 'switchingCreature') return 'CREATURE';
    if (row.sourceType === 'switchingFragment') {
      return String(row.targetBuffSlot || row.switchingSlot || '').trim();
    }
    if (row.sourceType === 'avatar' && ['switchingAvatar', 'switchingPlatinumEmblem'].includes(row.kind)) {
      if (row.targetSlotId) return String(row.targetSlotId).trim();
      return String(row.slot || '').includes('상의') ? 'JACKET' : 'PANTS';
    }
    return '';
  }

  function getBuffSimulatorExclusiveGroupKey(row = {}) {
    const targetSlotId = getBuffSimulatorTargetSlotId(row);
    if (!targetSlotId) return '';
    if (row.sourceType === 'switchingTitle') return 'buffTitle';
    if (row.sourceType === 'switchingCreature') return 'buffCreature';
    if (row.sourceType === 'switchingFragment') return `buffEquipment:${targetSlotId}`;
    if (row.kind === 'switchingAvatar') return `buffAvatarPackage:${targetSlotId}`;
    if (row.kind === 'switchingPlatinumEmblem') return `buffAvatarPlatinum:${targetSlotId}`;
    return '';
  }

  function getBuffSimulatorCandidateSignature(row = {}) {
    const groupKey = getBuffSimulatorExclusiveGroupKey(row);
    if (!groupKey) return '';
    return [
      groupKey,
      row.itemId || '',
      row.targetSkill || '',
      row.candidateTitleContribution || row.candidateCreatureContribution || '',
      getStableObjectSignature(row.targetBuffChanges || {}),
      row.priceMode || '',
    ].join(':');
  }

  function getStableObjectSignature(value = {}) {
    if (!value || typeof value !== 'object') return String(value ?? '');
    return Object.keys(value)
      .sort()
      .map((key) => `${key}:${typeof value[key] === 'object' ? getStableObjectSignature(value[key]) : String(value[key] ?? '')}`)
      .join('|');
  }

  function getCurrentCreatureArtifactBySlot(currentCreature) {
    return new Map((currentCreature?.artifacts || [])
      .map((artifact) => [getCreatureArtifactType(artifact), artifact])
      .filter(([artifactType]) => artifactType));
  }

  return {
    getEffectSignature,
    getEnchantExclusiveGroupKey,
    getEnchantCandidateSignature,
    getAuraExclusiveGroupKey,
    getAuraCandidateSignature,
    getCreatureExclusiveGroupKey,
    getCreatureCandidateSignature,
    getCreatureArtifactType,
    getCreatureArtifactExclusiveGroupKey,
    getCreatureArtifactCandidateSignature,
    getTitleExclusiveGroupKey,
    getTitleCandidateSignature,
    getBlackFangExclusiveGroupKey,
    getBlackFangCandidateSignature,
    getRelicCraftExclusiveGroupKey,
    getRelicCraftCandidateSignature,
    getAvatarEmblemExclusiveGroupKey,
    getAvatarEmblemCandidateSignature,
    getAvatarPlatinumExclusiveGroupKey,
    getAvatarPlatinumCandidateSignature,
    getBuffSimulatorTargetSlotId,
    getBuffSimulatorExclusiveGroupKey,
    getBuffSimulatorCandidateSignature,
    getStableObjectSignature,
    getCurrentCreatureArtifactBySlot,
    creatureArtifactTypes: CREATURE_ARTIFACT_TYPES,
  };
}
