export function bindToolEvents(ctx) {
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
  const setDevMode = (...args) => ctx.actions.setDevMode(...args);
  const setSortState = (...args) => ctx.actions.setSortState(...args);
  const syncPercentile = (...args) => ctx.actions.syncPercentile(...args);
  const updateCharacterAliveSetSelection = (...args) => ctx.actions.updateCharacterAliveSetSelection(...args);
  const clearCharacterData = (...args) => ctx.actions.clearCharacterData(...args);
  const getSupplyEntriesForFame = (...args) => ctx.actions.getSupplyEntriesForFame(...args);
  const normalizeSupplySelection = (...args) => ctx.actions.normalizeSupplySelection(...args);
  const getSupplyAccountSelectionCount = (...args) => ctx.actions.getSupplyAccountSelectionCount(...args);
  const getSupplyRosterCharactersByRole = (...args) => ctx.actions.getSupplyRosterCharactersByRole(...args);
  const getSupplySelectedCharacterKeys = (...args) => ctx.actions.getSupplySelectedCharacterKeys(...args);
  const setSupplySelectionOnly = (...args) => ctx.actions.setSupplySelectionOnly(...args);
  const toggleSupplySelection = (...args) => ctx.actions.toggleSupplySelection(...args);
  const selectSupplyRange = (...args) => ctx.actions.selectSupplyRange(...args);
  const clearSupplyCharacters = (...args) => ctx.actions.clearSupplyCharacters(...args);
  const updateSupplyCharactersByKeys = (...args) => ctx.actions.updateSupplyCharactersByKeys(...args);
  const getSupplyEditTargetKeys = (...args) => ctx.actions.getSupplyEditTargetKeys(...args);
  const updateSupplyCharacterSelection = (...args) => ctx.actions.updateSupplyCharacterSelection(...args);
  const updateSupplyCharacterHellSelection = (...args) => ctx.actions.updateSupplyCharacterHellSelection(...args);
  const setAllSupplyCharacterHellSelection = (...args) => ctx.actions.setAllSupplyCharacterHellSelection(...args);
  const resetAllSupplySelectionsToDefault = (...args) => ctx.actions.resetAllSupplySelectionsToDefault(...args);
  const applySupplyPreset = (...args) => ctx.actions.applySupplyPreset(...args);
  const renderSupplyView = (...args) => ctx.actions.renderSupplyView(...args);
  const setSupplyError = (...args) => ctx.actions.setSupplyError(...args);
  const addSupplyCharacter = (...args) => ctx.actions.addSupplyCharacter(...args);
  const refreshSupplyCharacters = (...args) => ctx.actions.refreshSupplyCharacters(...args);
  const refreshSupplyCharacterByKey = (...args) => ctx.actions.refreshSupplyCharacterByKey(...args);
  const deleteSupplyCharacter = (...args) => ctx.actions.deleteSupplyCharacter(...args);
  const setActiveTab = (...args) => ctx.actions.setActiveTab(...args);
  const removeCharacterByKey = (...args) => ctx.actions.removeCharacterByKey(...args);
  const addCharacterFromApi = (...args) => ctx.actions.addCharacterFromApi(...args);
  const refreshAllCharactersFromApi = (...args) => ctx.actions.refreshAllCharactersFromApi(...args);
  const setCalcMeta = (...args) => ctx.actions.setCalcMeta(...args);
  const updateDetailOnly = (...args) => ctx.actions.updateDetailOnly(...args);
  const scheduleRecalc = (...args) => ctx.actions.scheduleRecalc(...args);
  const recalcCharacterOnly = (...args) => ctx.actions.recalcCharacterOnly(...args);
  const RECENT_SEARCHES_STORAGE_KEY = 'dnf-pilot-recent-searches';
  const RECENT_SEARCH_LIMIT = 5;

  const setScreen = (screen) => {
    const isLanding = screen === 'landing';
    if (els.landingPage) els.landingPage.hidden = !isLanding;
    if (els.toolShell) els.toolShell.hidden = isLanding;
  };
  const updateResultUrl = (serverId, characterName, replace = false) => {
    const params = new URLSearchParams({ server: serverId, name: characterName });
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
  };
  const showLanding = (updateHistory = false) => {
    setScreen('landing');
    if (updateHistory) window.history.pushState({}, '', window.location.pathname);
    window.setTimeout(() => els.landingCharacterNameInput?.focus(), 0);
  };
  const loadRecentSearches = () => {
    try {
      const rows = JSON.parse(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter((row) => row?.serverId && row?.characterName) : [];
    } catch {
      return [];
    }
  };
  const renderRecentSearches = () => {
    if (!els.landingRecentSearches || !els.landingRecentSearchList) return;
    const rows = loadRecentSearches().slice(0, RECENT_SEARCH_LIMIT);
    els.landingRecentSearches.hidden = rows.length === 0;
    els.landingRecentSearchList.replaceChildren(...rows.map((row) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'landing-recent-button';
      button.dataset.serverId = row.serverId;
      button.dataset.characterName = row.characterName;
      button.textContent = `${getServerLabel(row.serverId)} / ${row.characterName}`;
      return button;
    }));
  };
  const saveRecentSearch = (serverId, characterName) => {
    const nextRows = [
      { serverId, characterName },
      ...loadRecentSearches().filter((row) => row.serverId !== serverId || row.characterName !== characterName),
    ].slice(0, RECENT_SEARCH_LIMIT);
    try {
      localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(nextRows));
    } catch {
      // 최근 검색 저장이 막혀도 캐릭터 조회는 계속한다.
    }
    renderRecentSearches();
  };
  const runEnchantSearch = ({ serverId, characterName, updateHistory = true, saveRecent = true } = {}) => {
    const normalizedServerId = String(serverId || els.enchantServerIdInput?.value || 'cain').trim();
    const normalizedName = String(characterName || els.enchantCharacterNameInput?.value || '').trim();
    if (!normalizedName) {
      if (els.landingSearchStatus) els.landingSearchStatus.textContent = '캐릭터명을 입력해 주세요.';
      els.landingCharacterNameInput?.focus();
      return;
    }
    if (els.enchantServerIdInput) els.enchantServerIdInput.value = normalizedServerId;
    if (els.enchantCharacterNameInput) els.enchantCharacterNameInput.value = normalizedName;
    if (els.landingServerIdInput) els.landingServerIdInput.value = normalizedServerId;
    if (els.landingCharacterNameInput) els.landingCharacterNameInput.value = normalizedName;
    if (els.landingSearchStatus) els.landingSearchStatus.textContent = '';
    setScreen('results');
    setActiveTab('enchantPanel');
    if (updateHistory) updateResultUrl(normalizedServerId, normalizedName);
    if (saveRecent) saveRecentSearch(normalizedServerId, normalizedName);
    ctx.actions.searchEnchantCharacter?.();
  };
  const runLandingSearch = () => runEnchantSearch({
    serverId: els.landingServerIdInput?.value,
    characterName: els.landingCharacterNameInput?.value,
  });
  const applyLocation = () => {
    const params = new URLSearchParams(window.location.search);
    const characterName = String(params.get('name') || '').trim();
    if (!characterName) {
      showLanding(false);
      return;
    }
    runEnchantSearch({
      serverId: params.get('server') || 'cain',
      characterName,
      updateHistory: false,
      saveRecent: false,
    });
  };

// -------------------------------------------------------------------------
// Event bindings and bootstrap
// -------------------------------------------------------------------------
  
if (els.devModeToggle) {
  els.devModeToggle.addEventListener('click', () => {
    setDevMode(!state.isDevMode);
  });
}
els.hellTabButton.addEventListener('click', () => {
  setActiveTab('hellPanel');
});
els.supplyTabButton.addEventListener('click', () => {
  setActiveTab('supplyPanel');
});
if (els.enchantTabButton) {
  els.enchantTabButton.addEventListener('click', () => {
    setActiveTab('enchantPanel');
  });
}
if (els.refreshEnchantCardsButton) {
  els.refreshEnchantCardsButton.addEventListener('click', () => {
    ctx.actions.loadEnchantCards?.(true);
  });
}
if (els.loadEnchantCharacterButton) {
  els.loadEnchantCharacterButton.addEventListener('click', () => {
    runEnchantSearch();
  });
}
if (els.enchantCharacterNameInput) {
  els.enchantCharacterNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runEnchantSearch();
    }
  });
}
if (els.landingSearchButton) {
  els.landingSearchButton.addEventListener('click', runLandingSearch);
}
if (els.landingCharacterNameInput) {
  els.landingCharacterNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runLandingSearch();
    }
  });
}
if (els.siteLogoHomeButton) {
  els.siteLogoHomeButton.addEventListener('click', () => showLanding(true));
}
if (els.landingRecentSearchList) {
  els.landingRecentSearchList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-server-id][data-character-name]');
    if (!button) return;
    runEnchantSearch({
      serverId: button.dataset.serverId,
      characterName: button.dataset.characterName,
    });
  });
}
window.addEventListener('popstate', applyLocation);
renderRecentSearches();
window.setTimeout(applyLocation, 0);
if (els.enchantSlotFilter) {
  els.enchantSlotFilter.addEventListener('change', () => {
    ctx.actions.renderEnchantTable?.();
  });
}
if (els.enchantTierFilter) {
  els.enchantTierFilter.addEventListener('change', () => {
    ctx.actions.renderEnchantTable?.();
  });
}
if (els.enchantIncludeControls) {
  els.enchantIncludeControls.addEventListener('change', (event) => {
    if (event.target?.matches?.('input[data-enchant-tier]')) {
      ctx.actions.renderEnchantTable?.();
    }
  });
}
if (els.enchantTitleBeadOnlyToggle) {
  els.enchantTitleBeadOnlyToggle.addEventListener('change', () => {
    ctx.actions.renderEnchantTable?.();
  });
}
els.percentileRange.addEventListener('input', () => syncPercentile(els.percentileRange));
els.percentileNumber.addEventListener('input', () => syncPercentile(els.percentileNumber));
els.selectedCharacter.addEventListener('change', () => {
  updateDetailOnly();
  if (!document.getElementById('enchantPanel')?.hidden) {
    state.enchantTargetCharacter = null;
    state.currentEnchantCharacterKey = '';
    state.currentCreatureCharacterKey = '';
    state.currentTitleCharacterKey = '';
    Promise.all([
      ctx.actions.loadCurrentEnchants?.(),
      ctx.actions.loadCurrentCreature?.(),
      ctx.actions.loadCurrentTitle?.(),
    ])
      .catch((error) => {
        if (els.enchantStatus) els.enchantStatus.textContent = error.message;
      })
      .finally(() => ctx.actions.renderEnchantTable?.());
  }
});
els.addCharacterButton.addEventListener('click', () => {
  addCharacterFromApi().catch((error) => {
    els.error.textContent = error.message;
    els.calcState.textContent = '오류';
    setCalcMeta('캐릭터 검색에 실패했습니다');
    els.searchStatus.textContent = error.message;
  });
});
els.refreshCharactersButton.addEventListener('click', () => {
  refreshAllCharactersFromApi().catch((error) => {
    const message = error instanceof Error ? error.message : String(error || '전체 갱신에 실패했습니다.');
    els.error.textContent = message;
    els.calcState.textContent = '오류';
    setCalcMeta('전체 갱신에 실패했습니다');
    els.searchStatus.textContent = message;
  });
});
els.clearCharactersButton.addEventListener('click', () => {
  clearCharacterData('캐릭터를 추가해 주세요.');
  els.characterNameInput.value = '';
  els.characterNameInput.focus();
});
[els.serverIdInput, els.characterNameInput].forEach((input) => {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      els.addCharacterButton.click();
    }
  });
});
els.sortButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setSortState(button.dataset.sortKey);
    updateDetailOnly();
  });
});
els.overviewTableBody.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('button[data-remove-key]');
  if (deleteButton) {
    event.preventDefault();
    event.stopPropagation();
    const key = deleteButton.dataset.removeKey;
    const label = deleteButton.dataset.removeLabel || '이 캐릭터';
    if (window.confirm(`${label}을(를) 삭제할까요?`)) {
      removeCharacterByKey(key);
    }
    return;
  }
  
  const row = event.target.closest('tr[data-name]');
  if (!row) return;
  els.selectedCharacter.value = row.dataset.name;
  updateDetailOnly();
});
els.setTableBody.addEventListener('change', (event) => {
  const checkbox = event.target.closest('input[data-alive-set-name]');
  if (!checkbox) return;
  const selectedName = els.selectedCharacter.value;
  const checkedInputs = Array.from(els.setTableBody.querySelectorAll('input[data-alive-set-name]:checked'));
  if (!checkedInputs.length) {
    checkbox.checked = true;
    return;
  }
  updateCharacterAliveSetSelection(selectedName, checkedInputs.map((input) => input.dataset.aliveSetName));
  recalcCharacterOnly(selectedName);
});
  
[
  els.setCount,
  els.epicRate,
  els.taechoRate,
  els.hellPerRun,
  els.recoveryAmount,
  els.epicCraftCost,
  els.taechoCraftCost,
  els.trials,
].forEach((element) => element.addEventListener('input', scheduleRecalc));
if (els.applySupplyHellCalcButton) {
  els.applySupplyHellCalcButton.addEventListener('click', () => {
    const derived = state.supplyDerivedHellCalc;
    if (!derived || !Number.isFinite(derived.hellPerRun) || !Number.isFinite(derived.recoveryAmount)) {
      if (els.supplyHellCalcMeta) els.supplyHellCalcMeta.textContent = '계시 관리에서 헬 운용 캐릭터를 먼저 계산하세요.';
      return;
    }
    els.hellPerRun.value = fmtDecimal(derived.hellPerRun, 3);
    els.recoveryAmount.value = fmtDecimal(derived.recoveryAmount, 3);
    if (els.supplyHellCalcMeta) {
      els.supplyHellCalcMeta.textContent = `소울/미광 ${fmtDecimal(derived.soulRecovery, 3)} + 이벤트 ${fmtDecimal(derived.eventRecovery, 3)}계시/판`;
    }
    scheduleRecalc();
  });
}
  
els.addSupplyCharacterButton.addEventListener('click', () => {
  addSupplyCharacter().catch((error) => {
    setSupplyError(error instanceof Error ? error.message : '캐릭터 추가 중 오류가 발생했습니다.');
    els.supplySearchStatus.textContent = '추가 실패';
  });
});
els.refreshSupplyCharactersButton.addEventListener('click', () => {
  refreshSupplyCharacters().catch((error) => {
    setSupplyError(error instanceof Error ? error.message : '전체 갱신 중 오류가 발생했습니다.');
    els.supplySearchStatus.textContent = '전체 갱신 실패';
  });
});
els.resetSupplySelectionsButton.addEventListener('click', () => {
  resetAllSupplySelectionsToDefault();
  els.supplySearchStatus.textContent = '전체 캐릭터 기본 선택으로 복원';
});
if (els.enableAllSupplyHellsButton) {
  els.enableAllSupplyHellsButton.addEventListener('click', () => {
    setAllSupplyCharacterHellSelection(true);
    els.supplySearchStatus.textContent = '헬 일괄 선택';
  });
}
if (els.disableAllSupplyHellsButton) {
  els.disableAllSupplyHellsButton.addEventListener('click', () => {
    setAllSupplyCharacterHellSelection(false);
    els.supplySearchStatus.textContent = '헬 일괄 해제';
  });
}
els.clearSupplyCharactersButton.addEventListener('click', () => {
  clearSupplyCharacters('캐릭터를 추가해 주세요.');
  els.supplyCharacterNameInput.value = '';
  els.supplyCharacterNameInput.focus();
});
els.supplyCharacterNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    els.addSupplyCharacterButton.click();
  }
});
const supplyRosterLists = [els.supplyHellRosterList, els.supplyAltRosterList].filter(Boolean);
let supplyRosterDragImage = null;
let pendingSupplyRefreshTimer = 0;
let pendingSupplySelectionUpdate = 0;
const scheduleSupplyCharacterRefresh = (rowKey) => {
  window.clearTimeout(pendingSupplyRefreshTimer);
  pendingSupplyRefreshTimer = window.setTimeout(() => {
    refreshSupplyCharacterByKey(rowKey).catch((error) => {
      setSupplyError(error instanceof Error ? error.message : '캐릭터 갱신 중 오류가 발생했습니다.');
      els.supplySearchStatus.textContent = '갱신 실패';
    });
  }, 350);
};
const scheduleSupplySelectionUpdate = (characterKey, nextKeys) => {
  window.cancelAnimationFrame(pendingSupplySelectionUpdate);
  pendingSupplySelectionUpdate = window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      updateSupplyCharacterSelection(characterKey, nextKeys);
    }, 0);
  });
};
const scheduleSupplyCharactersUpdate = (targetKeys, sourceLabel, updater) => {
  window.cancelAnimationFrame(pendingSupplySelectionUpdate);
  pendingSupplySelectionUpdate = window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      updateSupplyCharactersByKeys(targetKeys, sourceLabel, updater);
    }, 0);
  });
};
const syncSupplyContentCheckboxes = (nextKeys) => {
  const selectedKeySet = new Set((Array.isArray(nextKeys) ? nextKeys : []).map((key) => String(key || '').trim()));
  els.supplyContentControls?.querySelectorAll('input[data-supply-content-key]').forEach((input) => {
    const key = String(input.dataset.supplyContentKey || '').trim();
    input.checked = selectedKeySet.has(key);
  });
};
const clearSupplyRosterDragImage = () => {
  if (supplyRosterDragImage?.parentNode) {
    supplyRosterDragImage.parentNode.removeChild(supplyRosterDragImage);
  }
  supplyRosterDragImage = null;
};
const createSupplyRosterDragImage = (targetKeys) => {
  const keySet = new Set((Array.isArray(targetKeys) ? targetKeys : [])
    .map((key) => String(key || '').trim())
    .filter(Boolean));
  if (keySet.size <= 1 || typeof document === 'undefined' || !document.body) return null;
  
  const rows = supplyRosterLists
    .flatMap((list) => [...list.querySelectorAll('.supply-roster-item')])
    .filter((row) => keySet.has(String(row.dataset.supplyKey || '').trim()));
  if (rows.length <= 1) return null;
  
  clearSupplyRosterDragImage();
  const image = document.createElement('div');
  image.className = 'supply-roster-drag-image';
  rows.forEach((row) => {
    const clone = row.cloneNode(true);
    clone.classList.remove('dragging');
    clone.removeAttribute('id');
    clone.removeAttribute('draggable');
    image.appendChild(clone);
  });
  document.body.appendChild(image);
  supplyRosterDragImage = image;
  return image;
};
const handleSupplyRosterDrop = (event) => {
  const list = event.currentTarget;
  const role = String(list?.dataset.supplyDropRole || '').trim();
  const draggedKey = String(event.dataTransfer?.getData('text/plain') || '').trim();
  if (!draggedKey || !role) return;
  event.preventDefault();
  if (list) {
    list.classList.remove('drag-over');
  }
  const targetKeys = getSupplyEditTargetKeys(draggedKey);
  if (targetKeys.length > 1) {
    updateSupplyCharactersByKeys(targetKeys, '헬 선택 수정', (character) => ({
      ...character,
      runHell: role === 'hell',
    }));
    return;
  }
  updateSupplyCharacterHellSelection(draggedKey, role === 'hell', 'self');
};
  
if (els.moveSupplyToHellButton) {
  els.moveSupplyToHellButton.addEventListener('click', () => {
    const current = state.supplyCharacters.find((character) => character.key === state.supplyActiveCharacterKey) || state.supplyCharacters[0] || null;
    if (!current) return;
    updateSupplyCharacterHellSelection(current.key, true, 'next');
  });
}
if (els.moveSupplyToAltButton) {
  els.moveSupplyToAltButton.addEventListener('click', () => {
    const current = state.supplyCharacters.find((character) => character.key === state.supplyActiveCharacterKey) || state.supplyCharacters[0] || null;
    if (!current) return;
    updateSupplyCharacterHellSelection(current.key, false, 'next');
  });
}
  
supplyRosterLists.forEach((list) => {
  list.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('button[data-supply-delete]');
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      deleteSupplyCharacter(deleteButton.dataset.supplyDelete);
      return;
    }
  
    const hellBonusButton = event.target.closest('button[data-supply-hell-bonus]');
    if (hellBonusButton) {
      event.preventDefault();
      event.stopPropagation();
      const row = hellBonusButton.closest('.supply-roster-item');
      if (!row) return;
      const rowKey = String(row.dataset.supplyKey || '').trim();
      const targetKeys = getSupplyEditTargetKeys(rowKey);
      const bonusKey = String(hellBonusButton.dataset.supplyHellBonus || '').trim();
      if (!bonusKey) return;
      const nextEnabled = bonusKey === 'pcBang'
        ? !Boolean(state.supplyCharacters.find((character) => character.key === rowKey)?.pcBangBonus)
        : !Boolean(state.supplyCharacters.find((character) => character.key === rowKey)?.aradPassBonus);
      updateSupplyCharactersByKeys(targetKeys, '헬 비용 수정', (character) => {
        if (bonusKey === 'pcBang') {
          return { ...character, pcBangBonus: nextEnabled };
        }
        if (bonusKey === 'aradPass') {
          return { ...character, aradPassBonus: nextEnabled };
        }
        return character;
      });
      return;
    }
  
    const fatigueButton = event.target.closest('button[data-supply-fatigue-mode]');
    if (fatigueButton) {
      event.preventDefault();
      event.stopPropagation();
      const row = fatigueButton.closest('.supply-roster-item');
      if (!row) return;
      const rowKey = String(row.dataset.supplyKey || '').trim();
      const targetKeys = getSupplyEditTargetKeys(rowKey);
      const normalizedMode = normalizeSupplyCharacterFatigueMode(fatigueButton.dataset.supplyFatigueMode || '');
      if (!SUPPLY_CHARACTER_FATIGUE_PROFILES[normalizedMode]) return;
      updateSupplyCharactersByKeys(targetKeys, '피로도 수정', (character) => ({
        ...character,
        fatigueMode: normalizedMode,
      }));
      return;
    }
  
    const potionButton = event.target.closest('button[data-supply-fatigue-potion]');
    if (potionButton) {
      event.preventDefault();
      event.stopPropagation();
      const row = potionButton.closest('.supply-roster-item');
      if (!row) return;
      const rowKey = String(row.dataset.supplyKey || '').trim();
      const targetKeys = getSupplyEditTargetKeys(rowKey);
      const potionKey = String(potionButton.dataset.supplyFatiguePotion || '').trim();
      if (!SUPPLY_CHARACTER_FATIGUE_POTIONS[potionKey]) return;
      const currentKeys = new Set(getSupplyCharacterFatiguePotionKeys(state.supplyCharacters.find((character) => character.key === rowKey)));
      const nextEnabled = !currentKeys.has(potionKey);
      updateSupplyCharactersByKeys(targetKeys, '영약 수정', (character) => {
        const keys = new Set(getSupplyCharacterFatiguePotionKeys(character));
        if (nextEnabled) {
          keys.add(potionKey);
        } else {
          keys.delete(potionKey);
        }
        return {
          ...character,
          fatiguePotionKeys: [...keys],
        };
      });
      return;
    }
  
    const potionFoldToggle = event.target.closest('button[data-supply-fatigue-potion-fold-toggle]');
    if (potionFoldToggle) {
      event.preventDefault();
      event.stopPropagation();
      const row = potionFoldToggle.closest('.supply-roster-item');
      if (!row) return;
      const rowKey = String(row.dataset.supplyKey || '').trim();
      const targetKeys = getSupplyEditTargetKeys(rowKey);
      const nextOpen = !getSupplyCharacterFatiguePotionFoldOpen(state.supplyCharacters.find((character) => character.key === rowKey));
      updateSupplyCharactersByKeys(targetKeys, '영약 패널', (character) => ({
        ...character,
        fatiguePotionFoldOpen: nextOpen,
      }));
      return;
    }
  
    const row = event.target.closest('.supply-roster-item');
    if (!row) return;
    const rowKey = String(row.dataset.supplyKey || '').trim();
    if (!rowKey) return;
  
    if (event.shiftKey) {
      event.preventDefault();
      selectSupplyRange(rowKey);
      renderSupplyView();
      return;
    }
  
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      toggleSupplySelection(rowKey);
      renderSupplyView();
      return;
    }
  
    setSupplySelectionOnly(rowKey);
    renderSupplyView();
    scheduleSupplyCharacterRefresh(rowKey);
  });
  
  list.addEventListener('dragstart', (event) => {
    const row = event.target.closest('.supply-roster-item');
    if (!row) return;
    const rowKey = String(row.dataset.supplyKey || '').trim();
    const targetKeys = getSupplyEditTargetKeys(rowKey);
    const dragImage = createSupplyRosterDragImage(targetKeys);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', rowKey);
    if (dragImage) {
      event.dataTransfer.setDragImage(dragImage, 16, 16);
    }
    row.classList.add('dragging');
  });
  
  list.addEventListener('dragend', (event) => {
    const row = event.target.closest('.supply-roster-item');
    if (row) {
      row.classList.remove('dragging');
    }
    clearSupplyRosterDragImage();
  });
  
  list.addEventListener('dragover', (event) => {
    event.preventDefault();
    list.classList.add('drag-over');
  });
  
  list.addEventListener('dragleave', () => {
    list.classList.remove('drag-over');
  });
  
  list.addEventListener('drop', handleSupplyRosterDrop);
});
if (els.supplyContentControls) {
  els.supplyContentControls.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[data-supply-content-key]');
    if (!checkbox) return;
  
    const current = state.supplyCharacters.find((character) => character.key === state.supplyActiveCharacterKey) || state.supplyCharacters[0] || null;
    if (!current) return;
  
    const entryKey = String(checkbox.dataset.supplyContentKey || '').trim();
    const groupKey = String(checkbox.dataset.supplyGroupKey || '').trim();
    if (!entryKey) return;
  
    const getEntryTypeLimit = (entry) => {
      if (!entry) return 0;
      if (SUPPLY_ADVANCED_KEYS.has(entry.groupKey) || entry.contentType === 'advanced') return 2;
      if (entry.contentType === 'legion') return 1;
      return 0;
    };
    const getEntryComparableFame = (entry) => Number(entry?.minFame || 0);
    const buildNextContentKeys = (character) => {
      const currentSelectedKeys = normalizeSupplySelection(
        character.selectedContentKeys ?? character.selectedSupplyKeys ?? character.selectedAdvancedDungeonKeys ?? [],
        character.fame
      );
      const currentEntries = getSupplyEntriesForFame(character.fame, true);
      const entryMap = new Map(currentEntries.map((entry) => [entry.key, entry]));
      const targetEntry = entryMap.get(entryKey);
      if (!targetEntry || !targetEntry.available) return currentSelectedKeys;
      const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === (targetEntry?.groupKey || groupKey)) || null;
      const groupLimit = Math.max(0, Number(group?.accountLimit || targetEntry?.accountLimit || 0));
      const poolKey = String(group?.accountPoolKey || targetEntry?.accountPoolKey || groupKey || entryKey).trim();
      const alreadySelected = currentSelectedKeys.includes(entryKey);
    
      if (checkbox.checked && groupLimit > 0 && !alreadySelected) {
      const selectedCount = getSupplyAccountSelectionCount(poolKey);
      if (selectedCount >= groupLimit) {
          return currentSelectedKeys;
        }
      }
    
      const nextKeys = currentSelectedKeys.filter((key) => {
        const selectedEntry = entryMap.get(key);
        return selectedEntry && String(selectedEntry.accountPoolKey || selectedEntry.groupKey || selectedEntry.key || '').trim() !== poolKey;
      });
    
      if (checkbox.checked) {
        const typeLimit = getEntryTypeLimit(targetEntry);
        if (typeLimit > 0 && !alreadySelected) {
          const selectedTypeKeys = nextKeys.filter((key) => {
            const selectedEntry = entryMap.get(key);
            return getEntryTypeLimit(selectedEntry) === typeLimit && selectedEntry?.contentType === targetEntry?.contentType;
          });
          if (selectedTypeKeys.length >= typeLimit) {
            const targetFame = getEntryComparableFame(targetEntry);
            const sortedTypeKeys = [...selectedTypeKeys].sort((a, b) => {
              const fameDiff = getEntryComparableFame(entryMap.get(a)) - getEntryComparableFame(entryMap.get(b));
              if (fameDiff !== 0) return fameDiff;
              return a.localeCompare(b);
            });
            const removeKey = targetFame > getEntryComparableFame(entryMap.get(sortedTypeKeys[0]))
              ? sortedTypeKeys[0]
              : sortedTypeKeys[sortedTypeKeys.length - 1];
            const removeIndex = nextKeys.indexOf(removeKey);
            if (removeIndex >= 0) {
              nextKeys.splice(removeIndex, 1);
            }
          }
        }
        nextKeys.push(entryKey);
      }
    
      return nextKeys;
    };
  
    const targetKeys = getSupplySelectedCharacterKeys();
    if (targetKeys.length > 1) {
      const selectedCharacters = state.supplyCharacters.filter((character) => targetKeys.includes(character.key));
      const referenceCharacter = [...selectedCharacters].sort((a, b) => Number(b.fame || 0) - Number(a.fame || 0))[0] || current;
      const referenceKeys = buildNextContentKeys(referenceCharacter);
      syncSupplyContentCheckboxes(referenceKeys);
      scheduleSupplyCharactersUpdate(targetKeys, '선택 수정', (character) => {
        const selectedContentKeys = buildNextContentKeys(character);
        return {
          ...character,
          selectedContentKeys,
          selectedSupplyKeys: selectedContentKeys,
          selectedAdvancedDungeonKeys: selectedContentKeys,
        };
      });
      return;
    }
  
    const nextKeys = buildNextContentKeys(current);
    syncSupplyContentCheckboxes(nextKeys);
    scheduleSupplySelectionUpdate(current.key, nextKeys);
  });
}
if (els.supplySoulExcludeControls) {
  const normalizeSoulUsageRate = (value) => Math.max(0, Math.min(100, Number(value) || 0));
  const syncSoulUsageInputs = (input) => {
    const key = String(input.dataset.supplySoulUsageKey || '').trim();
    if (!key) return;
    const rate = normalizeSoulUsageRate(input.value);
    const container = input.closest('.supply-soul-usage-option');
    if (!container) return;
    container.querySelectorAll(`input[data-supply-soul-usage-key="${CSS.escape(key)}"]`).forEach((pairedInput) => {
      pairedInput.value = String(rate);
    });
  };
  const updateSoulUsageRate = (input) => {
    const key = String(input.dataset.supplySoulUsageKey || '').trim();
    if (!key) return;
    const rate = normalizeSoulUsageRate(input.value);
    const nextRates = state.supplySoulUsageRates && typeof state.supplySoulUsageRates === 'object'
      ? { ...state.supplySoulUsageRates }
      : {};
    if (rate >= 100) {
      delete nextRates[key];
    } else {
      nextRates[key] = rate;
    }
    const oldExcludedKeys = new Set(state.supplySoulExcludedKeys instanceof Set ? state.supplySoulExcludedKeys : []);
    oldExcludedKeys.delete(key);
    if (key === 'tuner') {
      [...oldExcludedKeys].forEach((currentKey) => {
        if (String(currentKey || '').startsWith('tuner:')) oldExcludedKeys.delete(currentKey);
      });
    }
    state.supplySoulExcludedKeys = oldExcludedKeys;
    state.supplySoulUsageRates = nextRates;
    localStorage.setItem(SUPPLY_SOUL_EXCLUDED_KEYS_STORAGE_KEY, JSON.stringify([...oldExcludedKeys]));
    localStorage.setItem(SUPPLY_SOUL_USAGE_RATES_STORAGE_KEY, JSON.stringify(nextRates));
    renderSupplyView();
  };
  els.supplySoulExcludeControls.addEventListener('change', (event) => {
    const checkbox = event.target.closest('input[data-supply-soul-exclude-key]');
    if (!checkbox) return;
    const key = String(checkbox.dataset.supplySoulExcludeKey || '').trim();
    if (!key) return;
    const nextKeys = new Set(state.supplySoulExcludedKeys instanceof Set ? state.supplySoulExcludedKeys : []);
    if (checkbox.checked) {
      nextKeys.add(key);
    } else {
      nextKeys.delete(key);
    }
    state.supplySoulExcludedKeys = nextKeys;
    localStorage.setItem(SUPPLY_SOUL_EXCLUDED_KEYS_STORAGE_KEY, JSON.stringify([...nextKeys]));
    renderSupplyView();
  });
  els.supplySoulExcludeControls.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-supply-soul-usage-key]');
    if (!input) return;
    syncSoulUsageInputs(input);
  });
  els.supplySoulExcludeControls.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-supply-soul-usage-key]');
    if (!input) return;
    syncSoulUsageInputs(input);
    updateSoulUsageRate(input);
  });
}
if (els.supplyDetailEditor) {
  els.supplyDetailEditor.addEventListener('click', (event) => {
    const selectionKeys = getSupplySelectedCharacterKeys();
    const current = state.supplyCharacters.find((character) => character.key === state.supplyActiveCharacterKey)
      || state.supplyCharacters.find((character) => selectionKeys.includes(character.key))
      || state.supplyCharacters[0] || null;
    if (!current) return;
    const targetKeys = selectionKeys.length > 1 ? selectionKeys : [current.key];
  
    const hellBonusButton = event.target.closest('button[data-supply-hell-bonus]');
    if (hellBonusButton) {
      event.preventDefault();
      event.stopPropagation();
      const bonusKey = String(hellBonusButton.dataset.supplyHellBonus || '').trim();
      if (!bonusKey) return;
      const nextEnabled = bonusKey === 'pcBang'
        ? !Boolean(current.pcBangBonus)
        : !Boolean(current.aradPassBonus);
      updateSupplyCharactersByKeys(targetKeys, '헬 비용 수정', (character) => {
        if (bonusKey === 'pcBang') {
          return { ...character, pcBangBonus: nextEnabled };
        }
        if (bonusKey === 'aradPass') {
          return { ...character, aradPassBonus: nextEnabled };
        }
        return character;
      });
      return;
    }
  
    const fatigueButton = event.target.closest('button[data-supply-fatigue-mode]');
    if (fatigueButton) {
      event.preventDefault();
      event.stopPropagation();
      const normalizedMode = normalizeSupplyCharacterFatigueMode(fatigueButton.dataset.supplyFatigueMode || '');
      if (!SUPPLY_CHARACTER_FATIGUE_PROFILES[normalizedMode]) return;
      updateSupplyCharactersByKeys(targetKeys, '피로도 수정', (character) => ({
        ...character,
        fatigueMode: normalizedMode,
      }));
      return;
    }
  
    const potionButton = event.target.closest('button[data-supply-fatigue-potion]');
    if (potionButton) {
      event.preventDefault();
      event.stopPropagation();
      const potionKey = String(potionButton.dataset.supplyFatiguePotion || '').trim();
      if (!SUPPLY_CHARACTER_FATIGUE_POTIONS[potionKey]) return;
      const currentKeys = new Set(getSupplyCharacterFatiguePotionKeys(current));
      const shouldEnable = !currentKeys.has(potionKey);
      updateSupplyCharactersByKeys(targetKeys, '영약 수정', (character) => {
        const nextKeys = new Set(getSupplyCharacterFatiguePotionKeys(character));
        if (shouldEnable) {
          nextKeys.add(potionKey);
        } else {
          nextKeys.delete(potionKey);
        }
        return {
          ...character,
          fatiguePotionKeys: [...nextKeys],
        };
      });
      return;
    }
  
    const potionFoldToggle = event.target.closest('button[data-supply-fatigue-potion-fold-toggle]');
    if (potionFoldToggle) {
      event.preventDefault();
      event.stopPropagation();
      const nextOpen = !getSupplyCharacterFatiguePotionFoldOpen(current);
      updateSupplyCharactersByKeys(targetKeys, '영약 패널', (character) => ({
        ...character,
        fatiguePotionFoldOpen: nextOpen,
      }));
    }
  });
}
els.supplyPresetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applySupplyPreset(button.dataset.supplyPreset);
  });
});
}
