export function installBootstrap(ctx) {
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
    SUPPLY_SOUL_EXCLUDED_KEYS_STORAGE_KEY,
    SUPPLY_SOUL_USAGE_RATES_STORAGE_KEY,
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
  const readDevModePreference = (...args) => ctx.actions.readDevModePreference(...args);
  const setDevMode = (...args) => ctx.actions.setDevMode(...args);
  const updateSortIndicators = (...args) => ctx.actions.updateSortIndicators(...args);
  const syncPercentile = (...args) => ctx.actions.syncPercentile(...args);
  const clearCharacterData = (...args) => ctx.actions.clearCharacterData(...args);
  const loadCachedCharacterData = (...args) => ctx.actions.loadCachedCharacterData(...args);
  const clearSupplyCharacters = (...args) => ctx.actions.clearSupplyCharacters(...args);
  const loadCachedSupplyCharacters = (...args) => ctx.actions.loadCachedSupplyCharacters(...args);
  const hasMissingSupplyFame = (...args) => ctx.actions.hasMissingSupplyFame(...args);
  const refreshSupplyCharacters = (...args) => ctx.actions.refreshSupplyCharacters(...args);
  const setActiveTab = (...args) => ctx.actions.setActiveTab(...args);
  const loadActiveTab = (...args) => ctx.actions.loadActiveTab(...args);
  const recalc = (...args) => ctx.actions.recalc(...args);

async function bootstrap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUPPLY_SOUL_EXCLUDED_KEYS_STORAGE_KEY) || '[]');
    state.supplySoulExcludedKeys = new Set(Array.isArray(parsed) ? parsed.map((key) => String(key || '').trim()).filter(Boolean) : []);
  } catch {
    state.supplySoulExcludedKeys = new Set();
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(SUPPLY_SOUL_USAGE_RATES_STORAGE_KEY) || '{}');
    state.supplySoulUsageRates = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    state.supplySoulUsageRates = {};
  }
  setDevMode(readDevModePreference());
  syncPercentile(els.percentileNumber);
  updateSortIndicators();
  const loadedSupply = loadCachedSupplyCharacters();
  const loadedHell = loadCachedCharacterData();
  const activeTab = loadActiveTab();
  
  if (!loadedSupply) {
    clearSupplyCharacters('이 브라우저 저장소에 저장된 캐릭터가 없습니다.');
  } else if (hasMissingSupplyFame(state.supplyCharacters)) {
    els.supplySearchStatus.textContent = `${state.supplyCharactersSource} · 명성 미확인 캐릭터 있음`;
  }
  
  setActiveTab(activeTab, false, { runSideEffects: false });
  
  if (loadedHell) {
    els.calcState.textContent = '계산 대기';
    const scheduleInitialRecalc = window.requestIdleCallback
      ? (callback) => window.requestIdleCallback(callback, { timeout: 1200 })
      : (callback) => window.setTimeout(callback, 120);
    scheduleInitialRecalc(() => recalc());
  } else {
    clearCharacterData('이 브라우저 저장소에 저장된 캐릭터가 없습니다.');
  }
}

  Object.assign(ctx.actions, {
    bootstrap,
  });
}
