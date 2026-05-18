export function installBrowserState(ctx) {
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
    ENABLE_DEV_MODE,
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
  const updateViewOnly = (...args) => ctx.actions.updateViewOnly(...args);

function getSelectedPercentile() {
  return Math.max(1, Math.min(99, Number(els.percentileNumber.value) || 66));
}

function readDevModePreference() {
  if (!ENABLE_DEV_MODE) return false;
  try {
    return localStorage.getItem(DEV_MODE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDevModePreference(enabled) {
  if (!ENABLE_DEV_MODE) return;
  try {
    localStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // 저장 실패는 무시한다.
  }
}

function getCriterionDisplay(percentile) {
  return state.isDevMode ? `P${percentile}` : `${percentile}`;
}

function refreshModeLabels(selectedPercentile = getSelectedPercentile()) {
  els.percentileSectionLabel.textContent = state.isDevMode ? '기본 퍼센타일 기준' : '상위';
  els.percentileNumberLabel.textContent = state.isDevMode ? '직접 입력' : '숫자 입력';
  els.selectedPercentileCardLabel.textContent = state.isDevMode ? '선택 퍼센타일' : '상위';
  els.percentileLabel.textContent = getCriterionDisplay(selectedPercentile);
  els.selectedPercentileCard.textContent = getCriterionDisplay(selectedPercentile);
  if (els.devModeToggle) {
    els.devModeToggle.textContent = state.isDevMode ? '사용자 모드' : '개발자 모드';
    els.devModeToggle.setAttribute('aria-pressed', state.isDevMode ? 'true' : 'false');
  }
}

function setDevMode(enabled) {
  if (!ENABLE_DEV_MODE) {
    enabled = false;
  }
  state.isDevMode = Boolean(enabled);
  document.body.classList.toggle('dev-mode', state.isDevMode);
  writeDevModePreference(state.isDevMode);
  refreshModeLabels();
  if (state.lastResults.length) {
    updateViewOnly();
  }
}

function generateStorageNamespace() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ns-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStorageNamespace() {
  if (state.storageNamespace) {
    return state.storageNamespace;
  }
  
  try {
    const existing = localStorage.getItem(STORAGE_NAMESPACE_KEY);
    if (existing) {
      state.storageNamespace = existing;
      return state.storageNamespace;
    }
  
    state.storageNamespace = generateStorageNamespace();
    localStorage.setItem(STORAGE_NAMESPACE_KEY, state.storageNamespace);
    return state.storageNamespace;
  } catch {
    state.storageNamespace = state.storageNamespace || generateStorageNamespace();
    return state.storageNamespace;
  }
}

  Object.assign(ctx.actions, {
    getSelectedPercentile,
    readDevModePreference,
    writeDevModePreference,
    getCriterionDisplay,
    refreshModeLabels,
    setDevMode,
    generateStorageNamespace,
    getStorageNamespace,
  });
}
