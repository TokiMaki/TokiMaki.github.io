export function installSupplySelectionRules(ctx) {
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
  const isSupplyGroupUnlocked = (...args) => ctx.actions.isSupplyGroupUnlocked(...args);
  const getSupplyGroupKeyByEntryKey = (...args) => ctx.actions.getSupplyGroupKeyByEntryKey(...args);
  const isSupplyGroupDateUnlocked = (...args) => ctx.actions.isSupplyGroupDateUnlocked(...args);
  const getSupplyEntryOptionsForGroup = (...args) => ctx.actions.getSupplyEntryOptionsForGroup(...args);
  const getSupplyGroupRank = (...args) => ctx.actions.getSupplyGroupRank(...args);
  const getSupplyEntryFameByKey = (...args) => ctx.actions.getSupplyEntryFameByKey(...args);
  const getSupplyEntryForGroup = (...args) => ctx.actions.getSupplyEntryForGroup(...args);
  const getSupplyEntriesForFame = (...args) => ctx.actions.getSupplyEntriesForFame(...args);
  const compareSupplyGroupsByFameDesc = (...args) => ctx.actions.compareSupplyGroupsByFameDesc(...args);

function getAvailableSupplyKeys(fame) {
  const allowed = [];
  for (const group of SUPPLY_CONTENT_GROUPS) {
    const entries = getSupplyEntryOptionsForGroup(group, fame, true);
    entries
      .filter((entry) => entry.available)
      .forEach((entry) => allowed.push(entry.key));
  }
  
  return allowed;
}

function resolveSupplySelectionKey(key, fame) {
  const value = String(key || '').trim();
  if (!value) return '';
  
  const directEntry = getSupplyEntriesForFame(fame, true).find((entry) => entry.key === value || entry.key.endsWith(`:${value}`));
  if (directEntry) {
    return directEntry.available ? directEntry.key : '';
  }
  
  const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === value);
  if (!group) {
    return '';
  }
  
  const bestEntry = getSupplyEntryForGroup(group, fame);
  return bestEntry ? bestEntry.key : '';
}

function normalizeSupplySelection(keys, fame) {
  const allowedKeys = new Set(getAvailableSupplyKeys(fame));
  const normalized = [];
  for (const key of Array.isArray(keys) ? keys : []) {
    const value = resolveSupplySelectionKey(key, fame);
    if (value && allowedKeys.has(value) && !normalized.includes(value)) {
      normalized.push(value);
    }
  }
  
  if (!normalized.length) {
    return getDefaultSupplySelection(fame);
  }
  
  const next = [];
  let advancedCount = 0;
  let legionCount = 0;
  const selectedGroups = new Set();
  
  for (const key of normalized) {
    if (!allowedKeys.has(key)) {
      continue;
    }
  
    const entry = getSupplyEntriesForFame(fame, true).find((item) => item.key === key);
    if (!entry) {
      continue;
    }
  
    if (selectedGroups.has(entry.groupKey)) {
      const existingIndex = next.findIndex((item) => {
        const existingEntry = getSupplyEntriesForFame(fame, true).find((candidate) => candidate.key === item);
        return existingEntry && existingEntry.groupKey === entry.groupKey;
      });
      if (existingIndex >= 0) {
        next.splice(existingIndex, 1, key);
      }
      continue;
    }
  
    if (SUPPLY_ADVANCED_KEYS.has(entry.groupKey)) {
      if (advancedCount >= 2) {
        continue;
      }
      advancedCount += 1;
    } else if (entry.contentType === 'legion') {
      if (legionCount >= 1) {
        continue;
      }
      legionCount += 1;
    }
  
    next.push(key);
    selectedGroups.add(entry.groupKey);
  }
  
  return next;
}

function getDefaultSupplySelection(fame) {
  return buildDefaultSupplySelectionForFame(fame);
}

function buildDefaultSupplySelectionForFame(fame, options = {}) {
  const excludedPoolKeys = new Set(
    Array.isArray(options.excludedPoolKeys)
      ? options.excludedPoolKeys.map((key) => String(key || '').trim()).filter(Boolean)
      : []
  );
  const respectAccountLimits = options.respectAccountLimits !== false;
  const selected = [];
  let advancedCount = 0;
  let legionCount = 0;
  
  for (const group of [...SUPPLY_CONTENT_GROUPS].sort(compareSupplyGroupsByFameDesc)) {
    if (group.key === 'mukkisul') {
      continue;
    }
  
    const groupPoolKey = String(group.accountPoolKey || group.key || '').trim();
    if (groupPoolKey && excludedPoolKeys.has(groupPoolKey)) {
      continue;
    }
  
    const bestEntry = getSupplyEntryForGroup(group, fame);
    if (!bestEntry) {
      continue;
    }
  
    const groupLimit = Math.max(0, Number(group.accountLimit || 0));
    if (respectAccountLimits && groupLimit > 0) {
      if (groupPoolKey && getSupplyAccountSelectionCount(groupPoolKey) >= groupLimit) {
        continue;
      }
    }
  
    if (bestEntry.contentType === 'advanced') {
      if (advancedCount >= 2) continue;
      advancedCount += 1;
    } else if (bestEntry.contentType === 'legion') {
      if (legionCount >= 1) continue;
      legionCount += 1;
    }
  
    selected.push(bestEntry.key);
  }
  
  return selected;
}

function enforceSupplyAccountLimits(characters) {
  if (!Array.isArray(characters) || characters.length === 0) {
    return characters;
  }
  
  const nextCharacters = characters.map((character) => ({ ...character }));
  const rosterOrder = nextCharacters
    .map((character, index) => ({
      index,
      fame: Number(character?.fame || 0),
      label: getSupplyRosterLabel(character),
      runHell: Boolean(character?.runHell),
    }))
    .sort((a, b) => {
      const hellDiff = Number(b.runHell) - Number(a.runHell);
      if (hellDiff !== 0) return hellDiff;
      const fameDiff = b.fame - a.fame;
      if (fameDiff !== 0) return fameDiff;
      const labelDiff = a.label.localeCompare(b.label, 'ko-KR');
      if (labelDiff !== 0) return labelDiff;
      return a.index - b.index;
    });
  
  for (const group of SUPPLY_CONTENT_GROUPS) {
    const groupLimit = Math.max(0, Number(group.accountLimit || 0));
    const poolKey = String(group.accountPoolKey || group.key || '').trim();
    if (!groupLimit || !poolKey) {
      continue;
    }
  
    let kept = 0;
    for (const { index } of rosterOrder) {
      const character = nextCharacters[index];
      const selectedKeys = normalizeSupplySelection(
        character.selectedContentKeys ?? character.selectedSupplyKeys ?? character.selectedAdvancedDungeonKeys ?? [],
        character.fame
      );
      const currentEntries = getSupplyEntriesForFame(character.fame, true);
      const hasPoolEntry = currentEntries.some((entry) => {
        const entryPoolKey = String(entry.accountPoolKey || entry.groupKey || entry.key || '').trim();
        return selectedKeys.includes(entry.key) && entryPoolKey === poolKey;
      });
  
      if (!hasPoolEntry) {
        continue;
      }
  
      if (kept < groupLimit) {
        kept += 1;
        continue;
      }
  
      const filteredKeys = selectedKeys.filter((key) => {
        const entry = currentEntries.find((item) => item.key === key);
        return !entry || String(entry.accountPoolKey || entry.groupKey || entry.key || '').trim() !== poolKey;
      });
  
      const nextKeys = filteredKeys.length > 0
        ? normalizeSupplySelection(filteredKeys, character.fame)
        : buildDefaultSupplySelectionForFame(character.fame, {
            excludedPoolKeys: [poolKey],
            respectAccountLimits: false,
          });
  
      nextCharacters[index] = {
        ...character,
        selectedContentKeys: nextKeys,
        selectedSupplyKeys: nextKeys,
        selectedAdvancedDungeonKeys: nextKeys,
      };
    }
  }
  
  return nextCharacters;
}

function getSupplyPresetAnchorFame(presetKey) {
  const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
  if (!preset) {
    return 0;
  }
  
  if (preset.anchorFame) {
    return Number(preset.anchorFame) || 0;
  }
  
  if (preset.anchorKey) {
    return getSupplyEntryFameByKey(preset.anchorKey);
  }
  
  let anchorFame = 0;
  for (const groupKey of preset.advancedKeys || []) {
    const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === groupKey);
    if (!group) continue;
    const fame = getSupplyGroupRank(group);
    if (fame > anchorFame) {
      anchorFame = fame;
    }
  }
  return anchorFame;
}

function getSupplyPresetRequiredFame(presetKey) {
  const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
  if (!preset) {
    return 0;
  }
  
  if (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.length > 0) {
    return Math.max(...preset.forcedSelectionKeys.map((key) => getSupplyEntryFameByKey(key)));
  }
  
  if (preset.anchorFame) {
    return Number(preset.anchorFame) || 0;
  }
  
  if (preset.anchorKey) {
    return getSupplyEntryFameByKey(preset.anchorKey);
  }
  
  return getSupplyPresetAnchorFame(preset.key);
}

function isSupplyPresetAvailable(presetKey, fame) {
  const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
  if (!preset) return false;
  
  const numericFame = Number(fame) || 0;
  const requiredFame = getSupplyPresetRequiredFame(preset.key);
  if (requiredFame > 0 && numericFame < requiredFame) {
    return false;
  }
  
  const relatedGroupKeys = new Set();
  if (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.length > 0) {
    preset.forcedSelectionKeys.forEach((key) => {
      const groupKey = getSupplyGroupKeyByEntryKey(key);
      if (groupKey) relatedGroupKeys.add(groupKey);
    });
  }
  if (preset.anchorKey) {
    const groupKey = getSupplyGroupKeyByEntryKey(preset.anchorKey);
    if (groupKey) relatedGroupKeys.add(groupKey);
  }
  
  for (const groupKey of relatedGroupKeys) {
    const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === groupKey);
    if (group && !isSupplyGroupUnlocked(group, numericFame)) {
      return false;
    }
  }
  
  return true;
}

function updateSupplyPresetButtonStates(fame) {
  const numericFame = Number(fame) || 0;
  els.supplyPresetButtons.forEach((button) => {
    const presetKey = String(button.dataset.supplyPreset || '').trim();
    const requiredFame = getSupplyPresetRequiredFame(presetKey);
    const available = isSupplyPresetAvailable(presetKey, numericFame);
    button.disabled = !available;
    button.setAttribute('aria-disabled', available ? 'false' : 'true');
    const parts = [];
    if (presetKey === 'default-selection') {
      parts.push('명성 기준 기본 선택');
    }
    if (requiredFame > 0) {
      parts.push(`명성 ${fmtInt(requiredFame)} 이상`);
    }
    const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
    const requiresApocalypse = !!preset && (
      preset.key.includes('apocalypse')
      || (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.some((key) => String(key).startsWith('apocalypse:')))
    );
    if (requiresApocalypse) {
      const apocalypseGroup = SUPPLY_CONTENT_GROUPS.find((item) => item.key === 'apocalypse');
      if (apocalypseGroup && !isSupplyGroupDateUnlocked(apocalypseGroup)) {
        parts.unshift('4월 23일 해금');
      }
    }
    button.title = parts.join(' / ');
  });
}

function applySupplyForcedSelections(keys, fame, forcedSelectionKeys) {
  const currentKeys = normalizeSupplySelection(keys, fame);
  const entries = getSupplyEntriesForFame(fame, true);
  const entryMap = new Map(entries.map((entry) => [entry.key, entry]));
  const forcedEntries = (Array.isArray(forcedSelectionKeys) ? forcedSelectionKeys : [])
    .map((key) => entryMap.get(String(key || '').trim()))
    .filter(Boolean);
  const forcedGroups = new Set(forcedEntries.map((entry) => entry.groupKey));
  
  let next = currentKeys.filter((key) => {
    const entry = entryMap.get(key);
    return !entry || !forcedGroups.has(entry.groupKey);
  });
  
  for (const forcedKey of forcedSelectionKeys || []) {
    const key = String(forcedKey || '').trim();
    const entry = entryMap.get(key);
    if (!entry || !entry.available) continue;
    if (!next.includes(key)) {
      next.push(key);
    }
  }
  
  if (!next.length) {
    return buildDefaultSupplySelectionForFame(fame);
  }
  
  return normalizeSupplySelection(next, fame);
}

function getSupplyEntryDisplayLabel(entry) {
  if (!entry) return '';
  const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === entry.groupKey);
  if (!group) {
    return String(entry.label || '').trim();
  }
  
  const shortGroupLabel = SUPPLY_CONTENT_SHORT_LABELS[group.key] || group.label;
  if (Array.isArray(group.tiers) && group.tiers.length > 0) {
    const tierLabel = String(entry.tierLabel || entry.label || '').trim();
    if (group.key === 'nabel') {
      return tierLabel || shortGroupLabel;
    }
    if ((entry.contentType || group.contentType || 'advanced') === 'raid' || group.key === 'apocalypse') {
      return tierLabel.split('/').pop().trim() || shortGroupLabel;
    }
    if (group.key === 'venus') {
      return tierLabel || shortGroupLabel;
    }
    return tierLabel ? `${shortGroupLabel} ${tierLabel}` : shortGroupLabel;
  }
  
  return shortGroupLabel;
}

function getSupplyEntryDisplayMarkup(entry) {
  const label = getSupplyEntryDisplayLabel(entry);
  if (!label) return '';
  const fameLabel = fmtInt(Number(entry?.minFame || 0));
  return `
    <span class="supply-check-item-label">
      <span class="supply-check-item-name">${escapeHtml(label)}</span>
      <span class="supply-check-item-fame">${escapeHtml(fameLabel)}</span>
    </span>
  `;
}

function getSupplyRosterLabel(character) {
  return getCharacterNameOnly(character) || getCharacterLabel(character);
}

function getSupplyPresetResolvedKeys(preset, fame) {
  if (!preset) return [];
  
  if (Array.isArray(preset.advancedKeys) && preset.advancedKeys.length > 0) {
    const keys = [];
    for (const groupKey of preset.advancedKeys) {
      const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === groupKey);
      if (!group) return [];
      const entry = getSupplyEntryForGroup(group, fame);
      if (!entry) return [];
      keys.push(entry.key);
    }
    return keys.sort();
  }
  
  if (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.length > 0) {
    const keys = [];
    for (const forcedKey of preset.forcedSelectionKeys) {
      const resolvedKey = resolveSupplySelectionKey(forcedKey, fame);
      if (!resolvedKey) return [];
      keys.push(resolvedKey);
    }
    return keys.sort();
  }
  
  if (preset.anchorKey) {
    const resolvedKey = resolveSupplySelectionKey(preset.anchorKey, fame);
    return resolvedKey ? [resolvedKey] : [];
  }
  
  return [];
}

function getSupplyRosterTagLabel(character) {
  const fame = Number(character?.fame || 0);
  const selectedKeys = normalizeSupplySelection(
    character?.selectedContentKeys ?? character?.selectedSupplyKeys ?? character?.selectedAdvancedDungeonKeys ?? [],
    fame
  );
  if (!selectedKeys.length) {
    return '기본 선택';
  }
  
  const selectedEntries = getSupplyEntriesForFame(fame, true).filter((entry) => selectedKeys.includes(entry.key));
  const selectedAdvancedEntries = selectedEntries.filter((entry) => (entry.contentType || 'advanced') === 'advanced');
  
  for (const preset of SUPPLY_PRESET_DEFINITIONS) {
    if (preset.key === 'default-selection') {
      continue;
    }
  
    const presetKeys = getSupplyPresetResolvedKeys(preset, fame);
    if (!presetKeys.length) {
      continue;
    }
  
    if (Array.isArray(preset.advancedKeys) && preset.advancedKeys.length > 0) {
      const selectedAdvancedKeys = selectedAdvancedEntries.map((entry) => entry.key).sort();
      if (presetKeys.length === selectedAdvancedKeys.length
        && presetKeys.every((key, index) => key === selectedAdvancedKeys[index])) {
        return preset.label;
      }
      continue;
    }
  
    if (preset.anchorKey || Array.isArray(preset.forcedSelectionKeys)) {
      if (presetKeys.every((key) => selectedKeys.includes(key))) {
        return preset.label;
      }
    }
  }
  
  if (selectedAdvancedEntries.length > 0) {
    const fallbackLabels = selectedAdvancedEntries
      .slice()
      .sort((a, b) => {
        const fameDiff = Number(b.minFame || 0) - Number(a.minFame || 0);
        if (fameDiff !== 0) return fameDiff;
        return getSupplyEntryDisplayLabel(a).localeCompare(getSupplyEntryDisplayLabel(b), 'ko-KR');
      })
      .map((entry) => getSupplyEntryDisplayLabel(entry))
      .filter(Boolean);
  
    if (fallbackLabels.length > 0) {
      return fallbackLabels.slice(0, 2).join('+');
    }
  }
  
  const fallbackEntry = selectedEntries[0];
  return fallbackEntry ? getSupplyEntryDisplayLabel(fallbackEntry) : '기본 선택';
}

function getSupplyRosterSortOrder(character) {
  return [
    Number(character?.fame || 0) * -1,
    getSupplyRosterLabel(character).toLowerCase(),
  ];
}

function getSupplyAccountSelectionCount(poolKey) {
  const normalizedPoolKey = String(poolKey || '').trim();
  if (!normalizedPoolKey || !Array.isArray(state.supplyCharacters) || state.supplyCharacters.length === 0) {
    return 0;
  }
  
  return state.supplyCharacters.reduce((count, character) => {
    const selectedKeys = normalizeSupplySelection(
      character.selectedContentKeys ?? character.selectedSupplyKeys ?? character.selectedAdvancedDungeonKeys ?? [],
      character.fame
    );
    if (!selectedKeys.length) return count;
  
    const entries = getSupplyEntriesForFame(character.fame, true);
    const hasPoolEntry = entries.some((entry) => {
      const entryPoolKey = String(entry.accountPoolKey || entry.groupKey || entry.key || '').trim();
      return selectedKeys.includes(entry.key) && entryPoolKey === normalizedPoolKey;
    });
  
    return hasPoolEntry ? count + 1 : count;
  }, 0);
}

function getSupplyRosterCharactersByRole(characters, runHell) {
  return [...(Array.isArray(characters) ? characters : [])]
    .filter((character) => Boolean(character?.runHell) === Boolean(runHell))
    .sort((a, b) => {
      const fameDiff = Number(b.fame || 0) - Number(a.fame || 0);
      if (fameDiff !== 0) return fameDiff;
      return getSupplyRosterLabel(a).localeCompare(getSupplyRosterLabel(b), 'ko-KR');
    });
}

function getSupplyRosterDisplayCharacters(characters) {
  const source = Array.isArray(characters) ? characters : [];
  return [
    ...getSupplyRosterCharactersByRole(source, true),
    ...getSupplyRosterCharactersByRole(source, false),
  ];
}

function sortSupplyKeysByRosterOrder(keys, characters = state.supplyCharacters) {
  const order = new Map(getSupplyRosterDisplayCharacters(characters).map((character, index) => [character.key, index]));
  return [...new Set(Array.isArray(keys) ? keys : [])]
    .map((key) => String(key || '').trim())
    .filter((key) => key && order.has(key))
    .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

function normalizeSupplySelectionKeys(candidateKeys, characters = state.supplyCharacters, fallbackKey = '') {
  const normalized = sortSupplyKeysByRosterOrder(candidateKeys, characters);
  if (normalized.length > 0) {
    return normalized;
  }
  
  const availableKeys = new Set(getSupplyRosterDisplayCharacters(characters).map((character) => character.key));
  const preferredKey = String(fallbackKey || state.supplyActiveCharacterKey || state.supplySelectionAnchorKey || '').trim();
  if (preferredKey && availableKeys.has(preferredKey)) {
    return [preferredKey];
  }
  
  const firstKey = getSupplyRosterDisplayCharacters(characters)[0]?.key || '';
  return firstKey ? [firstKey] : [];
}

function setSupplySelectionState(nextKeys, options = {}) {
  const normalizedKeys = normalizeSupplySelectionKeys(nextKeys, state.supplyCharacters, options.activeKey || options.anchorKey);
  state.supplySelectedCharacterKeys = new Set(normalizedKeys);
  
  const availableKeys = new Set(getSupplyRosterDisplayCharacters(state.supplyCharacters).map((character) => character.key));
  const activeKey = String(options.activeKey || '').trim();
  const anchorKey = String(options.anchorKey || '').trim();
  
  state.supplyActiveCharacterKey = normalizedKeys.includes(activeKey)
    ? activeKey
    : (availableKeys.has(state.supplyActiveCharacterKey) ? state.supplyActiveCharacterKey : (normalizedKeys[0] || ''));
  state.supplySelectionAnchorKey = normalizedKeys.includes(anchorKey)
    ? anchorKey
    : (availableKeys.has(state.supplySelectionAnchorKey) ? state.supplySelectionAnchorKey : state.supplyActiveCharacterKey);
}

function getSupplySelectedCharacterKeys() {
  return sortSupplyKeysByRosterOrder([...state.supplySelectedCharacterKeys], state.supplyCharacters);
}

function getSupplySelectedCharacters(characters) {
  const source = Array.isArray(characters) ? characters : [];
  const characterMap = new Map(source.map((character) => [character.key, character]));
  return getSupplySelectedCharacterKeys()
    .map((key) => characterMap.get(key))
    .filter(Boolean);
}

function getSupplySelectionRangeKeys(targetKey) {
  const rosterKeys = getSupplyRosterDisplayCharacters(state.supplyCharacters).map((character) => character.key);
  const targetIndex = rosterKeys.indexOf(targetKey);
  if (targetIndex < 0) {
    return [];
  }
  
  const availableAnchor = String(state.supplySelectionAnchorKey || '').trim();
  const activeAnchor = String(state.supplyActiveCharacterKey || '').trim();
  const fallbackAnchor = getSupplySelectedCharacterKeys()[0] || '';
  const anchorKey = [availableAnchor, activeAnchor, fallbackAnchor].find((key) => key && rosterKeys.includes(key)) || targetKey;
  const anchorIndex = rosterKeys.indexOf(anchorKey);
  if (anchorIndex < 0) {
    return [targetKey];
  }
  
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return rosterKeys.slice(start, end + 1);
}

function setSupplySelectionOnly(targetKey) {
  const normalizedKey = String(targetKey || '').trim();
  if (!normalizedKey) return;
  setSupplySelectionState([normalizedKey], { activeKey: normalizedKey, anchorKey: normalizedKey });
}

function toggleSupplySelection(targetKey) {
  const normalizedKey = String(targetKey || '').trim();
  if (!normalizedKey) return;
  
  const currentKeys = getSupplySelectedCharacterKeys();
  const currentIndex = currentKeys.indexOf(normalizedKey);
  if (currentIndex >= 0) {
    if (currentKeys.length <= 1) {
      setSupplySelectionOnly(normalizedKey);
      return;
    }
  
    const nextKeys = currentKeys.filter((key) => key !== normalizedKey);
    const nextActiveKey = normalizedKey === state.supplyActiveCharacterKey
      ? (nextKeys[0] || normalizedKey)
      : state.supplyActiveCharacterKey;
    const nextAnchorKey = normalizedKey === state.supplySelectionAnchorKey
      ? (nextActiveKey || nextKeys[0] || normalizedKey)
      : state.supplySelectionAnchorKey;
    setSupplySelectionState(nextKeys, { activeKey: nextActiveKey, anchorKey: nextAnchorKey });
    return;
  }
  
  const nextKeys = sortSupplyKeysByRosterOrder([...currentKeys, normalizedKey], state.supplyCharacters);
  setSupplySelectionState(nextKeys, { activeKey: normalizedKey, anchorKey: normalizedKey });
}

function selectSupplyRange(targetKey) {
  const normalizedKey = String(targetKey || '').trim();
  if (!normalizedKey) return;
  const rangeKeys = getSupplySelectionRangeKeys(normalizedKey);
  if (!rangeKeys.length) {
    setSupplySelectionOnly(normalizedKey);
    return;
  }
  setSupplySelectionState(rangeKeys, { activeKey: normalizedKey, anchorKey: state.supplySelectionAnchorKey || normalizedKey });
}

function syncSupplySelectionState(characters = state.supplyCharacters) {
  const availableKeys = new Set(getSupplyRosterDisplayCharacters(characters).map((character) => character.key));
  const preservedKeys = getSupplySelectedCharacterKeys().filter((key) => availableKeys.has(key));
  const fallbackKey = availableKeys.has(state.supplyActiveCharacterKey)
    ? state.supplyActiveCharacterKey
    : (availableKeys.has(state.supplySelectionAnchorKey) ? state.supplySelectionAnchorKey : '');
  const nextKeys = preservedKeys.length > 0
    ? preservedKeys
    : normalizeSupplySelectionKeys([], characters, fallbackKey);
  
  state.supplySelectedCharacterKeys = new Set(nextKeys);
  state.supplyActiveCharacterKey = availableKeys.has(state.supplyActiveCharacterKey)
    ? state.supplyActiveCharacterKey
    : (nextKeys[0] || '');
  state.supplySelectionAnchorKey = availableKeys.has(state.supplySelectionAnchorKey)
    ? state.supplySelectionAnchorKey
    : (state.supplyActiveCharacterKey || nextKeys[0] || '');
}

function getSupplyRosterFocusKeyAfterMove(beforeCharacters, afterCharacters, movedKey) {
  const sourceCharacter = Array.isArray(beforeCharacters)
    ? beforeCharacters.find((character) => character.key === movedKey)
    : null;
  if (!sourceCharacter) {
    return movedKey;
  }
  
  const sourceRunHell = Boolean(sourceCharacter.runHell);
  const sourceBefore = getSupplyRosterCharactersByRole(beforeCharacters, sourceRunHell);
  const sourceAfter = getSupplyRosterCharactersByRole(afterCharacters, sourceRunHell);
  const sourceIndex = sourceBefore.findIndex((character) => character.key === movedKey);
  if (sourceIndex < 0) {
    return movedKey;
  }
  
  if (sourceAfter.length === 0) {
    const destAfter = getSupplyRosterCharactersByRole(afterCharacters, !sourceRunHell);
    return destAfter[0]?.key || movedKey;
  }
  
  return (
    sourceAfter[sourceIndex]?.key
    || sourceAfter[sourceIndex - 1]?.key
    || sourceAfter[sourceAfter.length - 1]?.key
    || movedKey
  );
}

  Object.assign(ctx.actions, {
    getAvailableSupplyKeys,
    resolveSupplySelectionKey,
    normalizeSupplySelection,
    getDefaultSupplySelection,
    buildDefaultSupplySelectionForFame,
    enforceSupplyAccountLimits,
    getSupplyPresetAnchorFame,
    getSupplyPresetRequiredFame,
    isSupplyPresetAvailable,
    updateSupplyPresetButtonStates,
    applySupplyForcedSelections,
    getSupplyEntryDisplayLabel,
    getSupplyEntryDisplayMarkup,
    getSupplyRosterLabel,
    getSupplyPresetResolvedKeys,
    getSupplyRosterTagLabel,
    getSupplyRosterSortOrder,
    getSupplyAccountSelectionCount,
    getSupplyRosterCharactersByRole,
    getSupplyRosterDisplayCharacters,
    sortSupplyKeysByRosterOrder,
    normalizeSupplySelectionKeys,
    setSupplySelectionState,
    getSupplySelectedCharacterKeys,
    getSupplySelectedCharacters,
    getSupplySelectionRangeKeys,
    setSupplySelectionOnly,
    toggleSupplySelection,
    selectSupplyRange,
    syncSupplySelectionState,
    getSupplyRosterFocusKeyAfterMove,
  });
}
