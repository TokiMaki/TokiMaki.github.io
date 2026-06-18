export function installHellApiState(ctx) {
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
    normalizeApiErrorMessage,
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
  const parseCharacters = (...args) => ctx.actions.parseCharacters(...args);
  const setCharacterData = (...args) => ctx.actions.setCharacterData(...args);
  const clearRenderedResults = (...args) => ctx.actions.clearRenderedResults(...args);
  const renderSupplyView = (...args) => ctx.actions.renderSupplyView(...args);
  const setCalcMeta = (...args) => ctx.actions.setCalcMeta(...args);
  const updateViewOnly = (...args) => ctx.actions.updateViewOnly(...args);
  const recalc = (...args) => ctx.actions.recalc(...args);

function setActiveTab(tabId, persist = true, options = {}) {
  const validTabIds = new Set(['hellPanel', 'supplyPanel', 'enchantPanel']);
  const requestedTabId = validTabIds.has(tabId) ? tabId : 'enchantPanel';
  const normalizedTabId = !state.isDevMode && requestedTabId !== 'enchantPanel'
    ? 'enchantPanel'
    : requestedTabId;
  const runSideEffects = options.runSideEffects !== false;
  
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.hidden = panel.id !== normalizedTabId;
  });
  
  els.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === normalizedTabId;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  
  if (persist) {
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, normalizedTabId);
    } catch {
      // 저장 실패는 무시한다.
    }
  }
  
  if (!runSideEffects) {
    return;
  }

  if (normalizedTabId === 'supplyPanel') {
    renderSupplyView();
  } else if (normalizedTabId === 'enchantPanel') {
    if (!state.enchantPriceLoaded) {
      ctx.actions.loadEnchantCards?.();
    } else {
      ctx.actions.loadCurrentEnchants?.()
        .catch((error) => {
          if (els.enchantStatus) els.enchantStatus.textContent = normalizeApiErrorMessage(error);
        })
        .finally(() => ctx.actions.renderEnchantTable?.());
    }
  } else {
    updateViewOnly();
  }
}

function loadActiveTab() {
  try {
    return localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || 'enchantPanel';
  } catch {
    return 'enchantPanel';
  }
}

function setSearchBusy(isBusy, statusText) {
  els.addCharacterButton.disabled = isBusy;
  els.refreshCharactersButton.disabled = isBusy;
  els.serverIdInput.disabled = isBusy;
  els.characterNameInput.disabled = isBusy;
  els.clearCharactersButton.disabled = isBusy;
  if (statusText) {
    els.searchStatus.textContent = statusText;
  }
}

function upsertCharacterSummary(summary) {
  const normalized = normalizeCharacters([summary])[0];
  const current = [...parseCharacters()];
  const index = current.findIndex((character) => character.key === normalized.key);
  if (index >= 0) {
    current[index] = normalized;
  } else {
    current.push(normalized);
  }
  setCharacterData(current, 'API 검색');
}

function removeCharacterByKey(key) {
  const current = [...parseCharacters()];
  const target = current.find((character) => character.key === key);
  if (!target) return;
  
  const next = current.filter((character) => character.key !== key);
  setCharacterData(next, next.length ? '수정' : '목록 비움');
  
  if (!next.length) {
    clearRenderedResults('캐릭터를 추가해 주세요.');
    return;
  }
  
  recalc();
}

async function addCharacterFromApi() {
  const serverId = String(els.serverIdInput.value || '').trim().toLowerCase();
  const characterName = String(els.characterNameInput.value || '').trim();
  if (!serverId) {
    throw new Error('서버를 선택해 주세요.');
  }
  if (!characterName) {
    throw new Error('캐릭터명을 입력해 주세요.');
  }
  
  setSearchBusy(true, `${serverId} / ${characterName} 검색 중...`);
  els.error.textContent = '';
  
  try {
    const summary = await fetchCharacterSummary(serverId, characterName);
    upsertCharacterSummary(summary);
    els.characterNameInput.value = '';
    recalc();
    els.searchStatus.textContent = `${state.activeCharactersSource} · ${state.activeCharacters.length.toLocaleString('ko-KR')}캐릭`;
  } catch (error) {
    const rawMessage = normalizeApiErrorMessage(error, '캐릭터 검색에 실패했습니다.');
    const message = /fetch/i.test(rawMessage)
      ? '로컬 API 서버를 먼저 실행해 주세요. python3 neople_hell_api_server.py'
      : (rawMessage || '캐릭터 검색에 실패했습니다.');
    els.error.textContent = message;
    els.calcState.textContent = '오류';
    setCalcMeta('캐릭터 검색에 실패했습니다');
    els.searchStatus.textContent = message;
  } finally {
    setSearchBusy(false);
    els.characterNameInput.focus();
  }
}

async function refreshAllCharactersFromApi() {
  if (!Array.isArray(state.activeCharacters) || state.activeCharacters.length === 0) {
    throw new Error('갱신할 캐릭터가 없습니다.');
  }
  
  setSearchBusy(true, `전체 갱신 중... (${state.activeCharacters.length}캐릭)`);
  els.error.textContent = '';
  
  try {
    const settled = await Promise.allSettled(state.activeCharacters.map(async (character) => {
      const summary = await fetchCharacterSummary(character.serverId, character.name);
      return normalizeCharacters([summary])[0];
    }));
  
    const refreshed = state.activeCharacters.map((character, index) => {
      const item = settled[index];
      return item.status === 'fulfilled' && item.value ? item.value : character;
    });
  
    const successCount = settled.filter((item) => item.status === 'fulfilled' && item.value).length;
    if (successCount === 0) {
      throw new Error('전체 갱신에 실패했습니다.');
    }
  
    const failedLabels = state.activeCharacters
      .filter((_, index) => settled[index].status !== 'fulfilled')
      .map((character) => getCharacterLabel(character));
  
    setCharacterData(refreshed, '전체 갱신');
    recalc();
  
    if (failedLabels.length > 0) {
      els.searchStatus.textContent = `${state.activeCharactersSource} · ${successCount}/${state.activeCharacters.length}캐릭 갱신 완료`;
      els.error.textContent = `일부 캐릭터 갱신 실패: ${failedLabels.join(', ')}`;
    } else {
      els.searchStatus.textContent = `${state.activeCharactersSource} · ${state.activeCharacters.length.toLocaleString('ko-KR')}캐릭 전체 갱신`;
    }
  } catch (error) {
    const message = normalizeApiErrorMessage(error, '전체 갱신에 실패했습니다.');
    els.error.textContent = message;
    els.calcState.textContent = '오류';
    setCalcMeta('전체 갱신에 실패했습니다');
    els.searchStatus.textContent = message;
  } finally {
    setSearchBusy(false);
  }
}

function buildApiUrl(path, params) {
  const query = new URLSearchParams(params);
  return `${API_BASE}${path}?${query.toString()}`;
}

async function fetchCharacterSummary(serverId, characterName) {
  const response = await fetch(buildApiUrl('/api/summarize', {
    serverId,
    characterName,
  }), {
    headers: {
      Accept: 'application/json',
    },
  });
  
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  
  if (!response.ok) {
    const message = (payload && (payload.error || payload.message)) || text || `API 응답 실패(${response.status})`;
    throw new Error(message);
  }
  
  if (!payload || !Array.isArray(payload.sets)) {
    throw new Error('API 응답 형식이 올바르지 않습니다.');
  }
  
  return payload;
}

  Object.assign(ctx.actions, {
    setActiveTab,
    loadActiveTab,
    setSearchBusy,
    upsertCharacterSummary,
    removeCharacterByKey,
    addCharacterFromApi,
    refreshAllCharactersFromApi,
    buildApiUrl,
    fetchCharacterSummary,
  });
}
