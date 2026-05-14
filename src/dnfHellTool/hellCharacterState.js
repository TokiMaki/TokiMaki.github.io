export function installHellCharacterState(ctx) {
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
  const refreshModeLabels = (...args) => ctx.actions.refreshModeLabels(...args);
  const renderCharacterOptions = (...args) => ctx.actions.renderCharacterOptions(...args);
  const setCalcMeta = (...args) => ctx.actions.setCalcMeta(...args);
  const refreshPercentileOnly = (...args) => ctx.actions.refreshPercentileOnly(...args);

function compareForSort(a, b, config) {
  const av = config.getValue(a);
  const bv = config.getValue(b);
  
  if (config.type === 'string') {
    return String(av).localeCompare(String(bv), 'ko-KR');
  }
  
  return Number(av) - Number(bv);
}

function getSortedResults(results) {
  const config = SORT_CONFIG[state.sortState.key] ?? SORT_CONFIG.selectedHellCost;
  const sorted = [...results].sort((a, b) => {
    const primary = compareForSort(a, b, config);
    if (primary !== 0) {
      return state.sortState.direction === 'asc' ? primary : -primary;
    }
  
    return getCharacterLabel(a).localeCompare(getCharacterLabel(b), 'ko-KR');
  });
  
  return sorted;
}

function updateSortIndicators() {
  els.sortButtons.forEach((button) => {
    const isActive = button.dataset.sortKey === state.sortState.key;
    const arrow = button.querySelector('.sort-arrow');
    button.classList.toggle('active', isActive);
    if (arrow) {
      arrow.textContent = isActive ? (state.sortState.direction === 'asc' ? '▲' : '▼') : '';
    }
  
    const th = button.closest('th');
    if (th) {
      th.setAttribute('aria-sort', isActive ? (state.sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none');
    }
  });
}

function setSortState(key) {
  if (!SORT_CONFIG[key]) return;
  
  if (state.sortState.key === key) {
    state.sortState = {
      key,
      direction: state.sortState.direction === 'asc' ? 'desc' : 'asc',
    };
  } else {
    state.sortState = {
      key,
      direction: 'asc',
    };
  }
}

function syncPercentile(source) {
  const raw = Number(source.value);
  const value = Math.max(1, Math.min(99, Number.isFinite(raw) ? raw : 66));
  els.percentileRange.value = value;
  els.percentileNumber.value = value;
  refreshModeLabels(value);
  refreshPercentileOnly();
}

function parseCharacters() {
  if (Array.isArray(state.activeCharacters)) {
    return state.activeCharacters;
  }
  
  const parsed = JSON.parse(els.charactersJson.value || '[]');
  return normalizeCharacters(parsed);
}

function setCharacterData(characters, sourceLabel) {
  state.activeCharacters = normalizeCharacters(characters);
  state.activeCharactersSource = `${STORAGE_SCOPE_LABEL} · ${sourceLabel}`;
  state.hasCharacterData = state.activeCharacters.length > 0;
  const previewText = JSON.stringify(state.activeCharacters, null, 2);
  els.charactersJson.value = previewText;
  els.searchStatus.textContent = `${state.activeCharactersSource} · ${state.activeCharacters.length.toLocaleString('ko-KR')}캐릭`;
  characterCache.writeText(previewText);
}

function updateCharacterAliveSetSelection(characterKey, aliveSetNames) {
  if (!Array.isArray(state.activeCharacters)) return;
  const normalizedNames = Array.isArray(aliveSetNames) ? aliveSetNames.map((name) => String(name)) : [];
  const nextCharacters = state.activeCharacters.map((character) => {
    if (character.key !== characterKey) return character;
    const validSetNames = new Set(character.sets.map((set) => set.name));
    const nextAliveSetNames = [...new Set(normalizedNames.filter((name) => validSetNames.has(name)))];
    return {
      ...character,
      aliveSetNames: nextAliveSetNames.length ? nextAliveSetNames : character.aliveSetNames,
    };
  });
  setCharacterData(nextCharacters, '살아있는 세트 수정');
}

function clearCharacterData(message = '캐릭터를 추가해 주세요.') {
  state.activeCharacters = [];
  state.activeCharactersSource = `${STORAGE_SCOPE_LABEL} · 목록 비움`;
  state.hasCharacterData = false;
  els.charactersJson.value = '[]';
  els.searchStatus.textContent = message;
  characterCache.removeText();
  clearRenderedResults(message);
}

function clearRenderedResults(message = '캐릭터를 추가해 주세요.') {
  state.lastResults = [];
  els.totalCharacters.textContent = '0';
  refreshModeLabels();
  els.calcState.textContent = '대기';
  setCalcMeta(message);
  els.overviewSummary.textContent = '-';
  els.overviewTableBody.innerHTML = '';
  els.detailTitle.textContent = '-';
  els.detailSummary.textContent = message;
  els.detailBadge.textContent = '대기';
  els.detailBadge.className = 'badge warn';
  els.selectedHellCost.textContent = '-';
  els.selectedHellRuns.textContent = '-';
  els.craftCost.textContent = '-';
  els.craftRoute.textContent = '-';
  els.verdictText.textContent = '-';
  els.verdictSub.textContent = '-';
  els.quantileCompact.textContent = '-';
  els.p50Cost.textContent = '-';
  els.p50Runs.textContent = '-';
  els.p66Cost.textContent = '-';
  els.p66Runs.textContent = '-';
  els.p80Cost.textContent = '-';
  els.p80Runs.textContent = '-';
  els.meanCost.textContent = '-';
  els.meanRuns.textContent = '-';
  els.setTableBody.innerHTML = '';
  renderCharacterOptions([], '');
  updateSortIndicators();
}

function loadCachedCharacterData() {
  const cachedText = characterCache.readText();
  if (!cachedText) return false;
  
  try {
    const parsed = JSON.parse(cachedText);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return false;
    }
    setCharacterData(parsed, '캐시 복원');
    return true;
  } catch {
    characterCache.removeText();
    return false;
  }
}

  Object.assign(ctx.actions, {
    compareForSort,
    getSortedResults,
    updateSortIndicators,
    setSortState,
    syncPercentile,
    parseCharacters,
    setCharacterData,
    updateCharacterAliveSetSelection,
    clearCharacterData,
    clearRenderedResults,
    loadCachedCharacterData,
  });
}
