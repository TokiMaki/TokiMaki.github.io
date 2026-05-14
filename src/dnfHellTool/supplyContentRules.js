export function installSupplyContentRules(ctx) {
  const { els, state } = ctx;
  const { characterCache, supplyCache } = ctx.caches;
  const {
    applySelectedPercentile,
    calcCharacter,
    calcFragmentExpectation,
    calcNetCost,
    calcDailyContentWeeklySupply,
    calcResetUsageFromEntries,
    calcSoulRecoveryRows,
    calcSupplyParts,
    calcSupplyPartsFromEntries,
    calcTodayNeedFromCharacter,
    calcTodayUsageFromEntries,
    calcWeeklyUsageFromEntries,
    getSupplyCharacterFatigueLabel,
    getSupplyCharacterFatigueMode,
    getSupplyCharacterFatiguePotionDailyRuns,
    getSupplyCharacterFatiguePotionFoldOpen,
    getSupplyCharacterFatiguePotionKeys,
    getSupplyCharacterFatigueProfile,
    getSupplyCharacterHellRevelationPerRun,
    getSupplyCharacterWeeklyFatigue,
    mergeSupplyRecoveryRows,
    normalizeSupplyCharacterFatigueMode,
    normalizeSupplyCharacterFatiguePotions,
    normalizeSupplyParts,
    summarizeSoulRecoveryParts,
    escapeHtml,
    fmtCost,
    fmtDecimal,
    fmtInt,
    fmtRevelation,
    getServerLabel,
    bindCharacterAvatars,
    getCharacterAvatarMarkup,
    getCharacterLabel,
    getCharacterNameOnly,
    getCharacterPortraitMarkup,
    normalizeCharacters,
  } = ctx.deps;
  const {
    ACTIVE_TAB_STORAGE_KEY,
    API_BASE,
    DEV_MODE_STORAGE_KEY,
    STORAGE_NAMESPACE_KEY,
    STORAGE_SCOPE_LABEL,
    SUPPLY_CHARACTER_FATIGUE_POTIONS,
    SUPPLY_CHARACTER_FATIGUE_PROFILES,
    SUPPLY_USAGE_CONSTANTS,
  } = ctx.constants;
  const {
    SORT_CONFIG,
    SUPPLY_ADVANCED_KEYS,
    SUPPLY_CONTENT_GROUPS,
    SUPPLY_CONTENT_LABELS,
    SUPPLY_CONTENT_ORDER,
    SUPPLY_CONTENT_SHORT_LABELS,
    SUPPLY_CONTENT_TYPE_LABELS,
    SUPPLY_CONTENT_TYPE_ORDER,
    SUPPLY_PRESET_DEFINITIONS,
    SUPPLY_SHEET3_ROW_MAP,
    SUPPLY_SHEET3_ROWS,
  } = ctx.config;
  const normalizeSupplySelection = (...args) => ctx.actions.normalizeSupplySelection(...args);

function normalizeSupplyCharacters(parsed) {
  if (!Array.isArray(parsed)) {
    throw new Error('캐릭터 데이터는 배열이어야 합니다.');
  }
  
  return parsed.map((character, characterIndex) => {
    const serverId = String(character.serverId ?? '').trim().toLowerCase();
    const characterId = String(character.characterId ?? '').trim();
    const name = String(character.name ?? character.characterName ?? character.displayName ?? `캐릭 ${characterIndex + 1}`);
    const fame = Number(String(character.fame ?? 0).replace(/,/g, ''));
    const jobName = String(character.jobName ?? character.job_name ?? '').trim();
    const jobGrowName = String(character.jobGrowName ?? character.job_grow_name ?? '').trim();
    const rawRunHell = character.runHell ?? character.hellEnabled ?? character.supplyHellEnabled;
    const runHell = rawRunHell === undefined ? true : Boolean(rawRunHell);
    const rawPcBangBonus = character.pcBangBonus ?? character.pcBang ?? character.pcBangHell ?? character.hellPcBangBonus;
    const rawAradPassBonus = character.aradPassBonus ?? character.aradPass ?? character.aradPassHell ?? character.hellAradPassBonus;
    const pcBangBonus = rawPcBangBonus === undefined ? false : Boolean(rawPcBangBonus);
    const aradPassBonus = rawAradPassBonus === undefined ? false : Boolean(rawAradPassBonus);
    const fatigueMode = getSupplyCharacterFatigueMode(character);
    const fatiguePotionKeys = getSupplyCharacterFatiguePotionKeys(character);
    const fatiguePotionFoldOpen = getSupplyCharacterFatiguePotionFoldOpen(character);
    const selectedContentKeys = normalizeSupplySelection(
      character.selectedContentKeys ?? character.selectedSupplyKeys ?? character.selectedAdvancedDungeonKeys ?? [],
      fame
    );
    const key = String(
      character.key
      ?? (serverId && characterId ? `${serverId}:${characterId}` : '')
      ?? name
    ).trim() || name;
  
    return {
      key,
      serverId,
      characterId,
      name,
      fame: Number.isFinite(fame) ? fame : 0,
      jobName,
      jobGrowName,
      runHell,
      pcBangBonus,
      aradPassBonus,
      fatigueMode,
      fatiguePotionKeys,
      fatiguePotionFoldOpen,
      selectedContentKeys,
      selectedSupplyKeys: selectedContentKeys,
      selectedAdvancedDungeonKeys: selectedContentKeys,
    };
  });
}

function mergeSupplyCharacterSelection(character, previousCharacter = null) {
  const fame = Number(character?.fame || previousCharacter?.fame || 0);
  const rawRunHell = previousCharacter?.runHell
    ?? previousCharacter?.hellEnabled
    ?? previousCharacter?.supplyHellEnabled
    ?? character?.runHell
    ?? character?.hellEnabled
    ?? character?.supplyHellEnabled;
  const runHell = rawRunHell === undefined ? true : Boolean(rawRunHell);
  const rawPcBangBonus = previousCharacter?.pcBangBonus
    ?? previousCharacter?.pcBang
    ?? previousCharacter?.pcBangHell
    ?? previousCharacter?.hellPcBangBonus
    ?? character?.pcBangBonus
    ?? character?.pcBang
    ?? character?.pcBangHell
    ?? character?.hellPcBangBonus;
  const rawAradPassBonus = previousCharacter?.aradPassBonus
    ?? previousCharacter?.aradPass
    ?? previousCharacter?.aradPassHell
    ?? previousCharacter?.hellAradPassBonus
    ?? character?.aradPassBonus
    ?? character?.aradPass
    ?? character?.aradPassHell
    ?? character?.hellAradPassBonus;
  const pcBangBonus = rawPcBangBonus === undefined ? false : Boolean(rawPcBangBonus);
  const aradPassBonus = rawAradPassBonus === undefined ? false : Boolean(rawAradPassBonus);
  const fatigueMode = getSupplyCharacterFatigueMode(previousCharacter || character);
  const fatiguePotionKeys = getSupplyCharacterFatiguePotionKeys(previousCharacter || character);
  const fatiguePotionFoldOpen = getSupplyCharacterFatiguePotionFoldOpen(previousCharacter || character);
  const existingKeys = previousCharacter?.selectedContentKeys
    ?? previousCharacter?.selectedSupplyKeys
    ?? previousCharacter?.selectedAdvancedDungeonKeys
    ?? character?.selectedContentKeys
    ?? character?.selectedSupplyKeys
    ?? character?.selectedAdvancedDungeonKeys
    ?? [];
  const selectedContentKeys = normalizeSupplySelection(existingKeys, fame);
  
  return {
    ...character,
    runHell,
    pcBangBonus,
    aradPassBonus,
    fatigueMode,
    fatiguePotionKeys,
    fatiguePotionFoldOpen,
    selectedContentKeys,
    selectedSupplyKeys: selectedContentKeys,
    selectedAdvancedDungeonKeys: selectedContentKeys,
  };
}

function createSupplyEntry(group, source, available) {
  const boundSupply = Number(source.boundSupply ?? 0);
  const accountSupply = Number(source.accountSupply ?? source.supply ?? 0);
  const totalSupply = Number(source.totalSupply ?? (boundSupply + accountSupply));
  const supplyParts = normalizeSupplyParts(source.supplyParts, accountSupply);
  return {
    key: source.key,
    groupKey: group.key,
    groupLabel: group.label,
    label: source.label,
    tierLabel: source.tierLabel || source.label,
    contentType: group.contentType || 'advanced',
    minFame: source.minFame,
    supply: totalSupply,
    boundSupply,
    accountSupply,
    totalSupply,
    supplyParts,
    advancedDungeonKey: group.advancedDungeonKey || '',
    accountLimit: Number(group.accountLimit || 0),
    accountPoolKey: group.accountPoolKey || '',
    accountPoolLabel: group.accountPoolLabel || '',
    unlimitedFatigueCost: Number(source.unlimitedFatigueCost || group.unlimitedFatigueCost || 0),
    independentRarityKeys: source.independentRarityKeys || group.independentRarityKeys || [],
    independentRarityRates: source.independentRarityRates || group.independentRarityRates || null,
    available,
  };
}

function getSupplyGroupEntryFame(group) {
  if (Array.isArray(group.tiers) && group.tiers.length > 0) {
    const fameValues = group.tiers
      .map((tier) => Number(tier.minFame || 0))
      .filter((value) => Number.isFinite(value));
    if (fameValues.length) {
      return Math.min(...fameValues);
    }
  }
  return Number(group.minFame || 0);
}

function isSupplyGroupUnlocked(group, fame) {
  return isSupplyGroupDateUnlocked(group) && Number(fame) >= getSupplyGroupEntryFame(group);
}

function getSupplyGroupKeyByEntryKey(entryKey) {
  const value = String(entryKey || '').trim();
  if (!value) return '';
  for (const group of SUPPLY_CONTENT_GROUPS) {
    if (group.key === value) {
      return group.key;
    }
    if (Array.isArray(group.tiers) && group.tiers.some((tier) => tier.key === value)) {
      return group.key;
    }
  }
  return '';
}

function isSupplyGroupDateUnlocked(group) {
  const unlockDate = String(group?.unlockDate || '').trim();
  if (!unlockDate) return true;
  
  const unlockTime = Date.parse(unlockDate);
  if (!Number.isFinite(unlockTime)) return true;
  
  return Date.now() >= unlockTime;
}

function getSupplyEntryOptionsForGroup(group, fame, includeUnavailable = false) {
  const numericFame = Number(fame) || 0;
  if (!Array.isArray(group.tiers) || group.tiers.length === 0) {
    const available = numericFame >= Number(group.minFame || 0);
    const entry = createSupplyEntry(group, {
      key: group.key,
      label: group.label,
      tierLabel: group.label,
      minFame: Number(group.minFame || 0),
      boundSupply: Number(group.boundSupply || 0),
      accountSupply: Number(group.accountSupply ?? group.supply ?? 0),
      totalSupply: Number(group.totalSupply ?? group.supply ?? 0),
      supplyParts: group.supplyParts,
      unlimitedFatigueCost: Number(group.unlimitedFatigueCost || 0),
      independentRarityKeys: group.independentRarityKeys || [],
      independentRarityRates: group.independentRarityRates || null,
    }, available);
    return available || includeUnavailable ? [entry] : [];
  }
  
  if ((group.contentType || 'advanced') !== 'advanced') {
    const available = isSupplyGroupUnlocked(group, numericFame);
    const entries = group.tiers.map((tier) => createSupplyEntry(group, {
      key: `${group.key}:${tier.key}`,
      label: `${group.label} - ${tier.label}`,
      tierLabel: tier.label,
      minFame: Number(tier.minFame || 0),
      boundSupply: Number(tier.boundSupply || 0),
      accountSupply: Number(tier.accountSupply ?? (tier.supply || 0)),
      totalSupply: Number(tier.totalSupply ?? (tier.supply || 0)),
      supplyParts: tier.supplyParts,
    }, available));
    return available || includeUnavailable ? entries : [];
  }
  
  const entries = group.tiers
    .map((tier) => {
      const available = numericFame >= Number(tier.minFame || 0);
      return createSupplyEntry(group, {
        key: `${group.key}:${tier.key}`,
        label: `${group.label} - ${tier.label}`,
        tierLabel: tier.label,
        minFame: Number(tier.minFame || 0),
        boundSupply: Number(tier.boundSupply || 0),
        accountSupply: Number(tier.accountSupply ?? (tier.supply || 0)),
        totalSupply: Number(tier.totalSupply ?? (tier.supply || 0)),
        supplyParts: tier.supplyParts,
      }, available);
    })
    .filter((entry) => includeUnavailable || entry.available);
  
  return entries;
}

function getSupplyEntryOptionsForGroupByThreshold(group, fame, includeUnavailable = false) {
  const numericFame = Number(fame) || 0;
  if (!Array.isArray(group.tiers) || group.tiers.length === 0) {
    const available = numericFame >= Number(group.minFame || 0);
    const entry = createSupplyEntry(group, {
      key: group.key,
      label: group.label,
      tierLabel: group.label,
      minFame: Number(group.minFame || 0),
      supply: Number(group.supply || 0),
    }, available);
    return available || includeUnavailable ? [entry] : [];
  }
  
  const entries = group.tiers
    .map((tier) => {
      const available = numericFame >= Number(tier.minFame || 0);
      return createSupplyEntry(group, {
        key: `${group.key}:${tier.key}`,
        label: `${group.label} - ${tier.label}`,
        tierLabel: tier.label,
        minFame: Number(tier.minFame || 0),
        supply: Number(tier.supply || 0),
      }, available);
    })
    .filter((entry) => includeUnavailable || entry.available);
  
  return entries;
}

function getSupplyGroupRank(group) {
  if (Array.isArray(group.tiers) && group.tiers.length > 0) {
    return Math.max(...group.tiers.map((tier) => Number(tier.minFame || 0)));
  }
  return Number(group.minFame || 0);
}

function getSupplyEntryFameByKey(entryKey) {
  const key = String(entryKey || '').trim();
  if (!key) return 0;
  
  for (const group of SUPPLY_CONTENT_GROUPS) {
    if (group.key === key) {
      return getSupplyGroupRank(group);
    }
  
    if (Array.isArray(group.tiers)) {
      const tier = group.tiers.find((item) => item.key === key);
      if (tier) {
        return Number(tier.minFame || 0);
      }
    }
  }
  
  return 0;
}

function isSupplyHellEnabled(character) {
  return character?.runHell !== false;
}

function compareSupplyGroupsByFameDesc(left, right) {
  const fameDiff = getSupplyGroupRank(right) - getSupplyGroupRank(left);
  if (fameDiff !== 0) return fameDiff;
  const supplyLeft = Number(left.supply || 0);
  const supplyRight = Number(right.supply || 0);
  const supplyDiff = supplyRight - supplyLeft;
  if (supplyDiff !== 0) return supplyDiff;
  return String(left.label || '').localeCompare(String(right.label || ''), 'ko-KR');
}

function isSupplyGroupSelectable(group, fame) {
  if (!group) return false;
  if (Array.isArray(group.tiers) && group.tiers.length > 0) {
    return isSupplyGroupUnlocked(group, fame);
  }
  return Number(fame) >= Number(group.minFame || 0);
}

function getSupplyEntryForGroup(group, fame, includeUnavailable = false) {
  if (!includeUnavailable && !isSupplyGroupSelectable(group, fame)) {
    return null;
  }
  const entries = getSupplyEntryOptionsForGroupByThreshold(group, fame, includeUnavailable);
  if (!entries.length) return null;
  return [...entries].sort((a, b) => {
    const fameDiff = b.minFame - a.minFame;
    if (fameDiff !== 0) return fameDiff;
    const supplyDiff = b.supply - a.supply;
    if (supplyDiff !== 0) return supplyDiff;
    return a.label.localeCompare(b.label, 'ko-KR');
  })[0];
}

function getSupplyEntriesForFame(fame, includeUnavailable = false) {
  return SUPPLY_CONTENT_GROUPS
    .flatMap((group) => getSupplyEntryOptionsForGroup(group, fame, includeUnavailable))
    .sort((a, b) => {
      const typeDiff = SUPPLY_CONTENT_TYPE_ORDER.indexOf(a.contentType || 'advanced') - SUPPLY_CONTENT_TYPE_ORDER.indexOf(b.contentType || 'advanced');
      if (typeDiff !== 0) return typeDiff;
      const groupA = SUPPLY_CONTENT_GROUPS.find((group) => group.key === a.groupKey);
      const groupB = SUPPLY_CONTENT_GROUPS.find((group) => group.key === b.groupKey);
      const groupDiff = compareSupplyGroupsByFameDesc(groupA || a, groupB || b);
      if (groupDiff !== 0) return groupDiff;
      const fameDiff = b.minFame - a.minFame;
      if (fameDiff !== 0) return fameDiff;
      const supplyDiff = b.supply - a.supply;
      if (supplyDiff !== 0) return supplyDiff;
      return a.label.localeCompare(b.label, 'ko-KR');
    });
}

  Object.assign(ctx.actions, {
    normalizeSupplyCharacters,
    mergeSupplyCharacterSelection,
    createSupplyEntry,
    getSupplyGroupEntryFame,
    isSupplyGroupUnlocked,
    getSupplyGroupKeyByEntryKey,
    isSupplyGroupDateUnlocked,
    getSupplyEntryOptionsForGroup,
    getSupplyEntryOptionsForGroupByThreshold,
    getSupplyGroupRank,
    getSupplyEntryFameByKey,
    isSupplyHellEnabled,
    compareSupplyGroupsByFameDesc,
    isSupplyGroupSelectable,
    getSupplyEntryForGroup,
    getSupplyEntriesForFame,
  });
}
