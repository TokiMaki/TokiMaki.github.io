export function installSupplyStateActions(ctx) {
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
  const getSupplySheet3Row = (...args) => ctx.actions.getSupplySheet3Row(...args);
  const formatSupplySheet3Cell = (...args) => ctx.actions.formatSupplySheet3Cell(...args);
  const normalizeSupplyCharacters = (...args) => ctx.actions.normalizeSupplyCharacters(...args);
  const isSupplyHellEnabled = (...args) => ctx.actions.isSupplyHellEnabled(...args);
  const normalizeSupplySelection = (...args) => ctx.actions.normalizeSupplySelection(...args);
  const buildDefaultSupplySelectionForFame = (...args) => ctx.actions.buildDefaultSupplySelectionForFame(...args);
  const enforceSupplyAccountLimits = (...args) => ctx.actions.enforceSupplyAccountLimits(...args);
  const getSupplyPresetAnchorFame = (...args) => ctx.actions.getSupplyPresetAnchorFame(...args);
  const isSupplyPresetAvailable = (...args) => ctx.actions.isSupplyPresetAvailable(...args);
  const updateSupplyPresetButtonStates = (...args) => ctx.actions.updateSupplyPresetButtonStates(...args);

  function buildDetailSupplyPopoverMarkup(summaryText, detailRowsMarkup) {
    return `
      <span class="supply-event-popover-wrap">
        ${summaryText ? `<span class="supply-event-summary-text">${escapeHtml(summaryText)}</span>` : ''}
        <button type="button" class="supply-event-popover-trigger">상세</button>
        <span class="supply-event-popover" role="tooltip">
          <span class="supply-event-detail-list">${detailRowsMarkup}</span>
        </span>
      </span>
    `;
  }

  function buildDetailSupplyRows(rows) {
    return rows.filter(Boolean).map((row) => `
      <div class="supply-event-row">
        <span class="supply-event-name">${escapeHtml(row.label)}</span>
        <span class="supply-event-value">${escapeHtml(row.value)}</span>
      </div>
      ${row.detail ? `<div class="supply-event-detail">${escapeHtml(row.detail)}</div>` : ''}
    `).join('');
  }
  const applySupplyForcedSelections = (...args) => ctx.actions.applySupplyForcedSelections(...args);
  const getSupplyEntryDisplayLabel = (...args) => ctx.actions.getSupplyEntryDisplayLabel(...args);
  const getSupplyRosterLabel = (...args) => ctx.actions.getSupplyRosterLabel(...args);
  const getSupplySelectedCharacterKeys = (...args) => ctx.actions.getSupplySelectedCharacterKeys(...args);
  const syncSupplySelectionState = (...args) => ctx.actions.syncSupplySelectionState(...args);
  const getSupplyRosterFocusKeyAfterMove = (...args) => ctx.actions.getSupplyRosterFocusKeyAfterMove(...args);
  const renderSupplyDetailEditor = (...args) => ctx.actions.renderSupplyDetailEditor(...args);
  const renderSupplyDetailRecovery = (...args) => ctx.actions.renderSupplyDetailRecovery(...args);
  const renderSupplyContentControls = (...args) => ctx.actions.renderSupplyContentControls(...args);
  const clearSupplyRenderedResults = (...args) => ctx.actions.clearSupplyRenderedResults(...args);
  const renderSupplyView = (...args) => ctx.actions.renderSupplyView(...args);

function setSupplyCharacters(characters, sourceLabel) {
  const normalizedCharacters = normalizeSupplyCharacters(characters);
  state.supplyCharacters = enforceSupplyAccountLimits(normalizedCharacters);
  syncSupplySelectionState(state.supplyCharacters);
  state.supplyCharactersSource = `${STORAGE_SCOPE_LABEL} · ${sourceLabel}`;
  const previewText = JSON.stringify(state.supplyCharacters, null, 2);
  supplyCache.writeText(previewText);
  els.supplySearchStatus.textContent = `${state.supplyCharactersSource} · ${state.supplyCharacters.length.toLocaleString('ko-KR')}캐릭`;
  renderSupplyView();
}

function clearSupplyCharacters(message = '캐릭터를 추가해 주세요.') {
  state.supplyCharacters = [];
  state.supplyCharactersSource = `${STORAGE_SCOPE_LABEL} · 목록 비움`;
  state.supplyActiveCharacterKey = '';
  state.supplySelectionAnchorKey = '';
  state.supplySelectedCharacterKeys = new Set();
  els.supplySearchStatus.textContent = message;
  supplyCache.removeText();
  clearSupplyRenderedResults(message);
}

function loadCachedSupplyCharacters() {
  const cachedText = supplyCache.readText();
  if (!cachedText) return false;
  
  try {
    const parsed = JSON.parse(cachedText);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return false;
    }
    setSupplyCharacters(parsed, '캐시 복원');
    return true;
  } catch {
    supplyCache.removeText();
    return false;
  }
}

function hasMissingSupplyFame(characters) {
  return Array.isArray(characters) && characters.some((character) => {
    const fame = Number(character?.fame);
    return !Number.isFinite(fame) || fame <= 0;
  });
}

function setSupplySearchBusy(isBusy, statusText) {
  els.addSupplyCharacterButton.disabled = isBusy;
  els.refreshSupplyCharactersButton.disabled = isBusy;
  els.supplyServerIdInput.disabled = isBusy;
  els.supplyCharacterNameInput.disabled = isBusy;
  els.clearSupplyCharactersButton.disabled = isBusy;
  if (statusText) {
    els.supplySearchStatus.textContent = statusText;
  }
}

function buildSupplySelectionSummary(selectedCharacters) {
  const selection = Array.isArray(selectedCharacters) ? selectedCharacters.filter(Boolean) : [];
  const primary = selection[0] || null;
  if (!primary) {
    return null;
  }
  
  if (selection.length <= 1) {
    return {
      ...primary,
      primaryCharacter: primary,
      selectedCharacters: selection.length ? selection : [primary],
      selectionCount: 1,
      isMultiSelection: false,
      selectionLabel: getCharacterLabel(primary),
    };
  }
  
  const totalTodayNeedAccountSupply = selection.reduce((sum, character) => sum + (isSupplyHellEnabled(character) ? Number(character.todayNeedAccountSupply ?? character.todayUsage?.hellUsage ?? 0) : 0), 0);
  const totalTodayFatigue = selection.reduce((sum, character) => sum + Number(character.todayUsage?.weeklyFatigue || 0), 0);
  const totalTodayFatigueHellRuns = selection.reduce((sum, character) => sum + Number(character.todayUsage?.fatigueHellRuns || 0), 0);
  const totalTodayFreeRuns = selection.reduce((sum, character) => sum + Number(character.todayUsage?.freeHellRuns || 0), 0);
  const totalTodayPotionRuns = selection.reduce((sum, character) => sum + Number(character.todayUsage?.potionRuns || 0), 0);
  const totalWeeklyHellUsage = selection.reduce((sum, character) => sum + (isSupplyHellEnabled(character) ? Number(character.weeklyUsage?.hellUsage || 0) : 0), 0);
  const totalWeeklyBoundSupply = selection.reduce((sum, character) => sum + Number(character.weeklyBoundSupply || 0), 0);
  const totalContentWeeklyBoundSupply = selection.reduce((sum, character) => sum + Number(character.contentWeeklyBoundSupply || 0), 0);
  const totalEventWeeklyBoundSupply = selection.reduce((sum, character) => sum + Number(character.eventWeeklyBoundSupply || 0), 0);
  const totalEventWeeklyBoundRows = Array.from(selection.reduce((map, character) => {
    for (const row of Array.isArray(character.eventWeeklyBoundRows) ? character.eventWeeklyBoundRows : []) {
      const key = String(row.id || row.name || 'event').trim();
      const current = map.get(key) || {
        ...row,
        totalRevelation: 0,
        weeklyHellRuns: 0,
      };
      current.totalRevelation += Number(row.totalRevelation || 0);
      current.weeklyHellRuns += Number(row.weeklyHellRuns || 0);
      map.set(key, current);
    }
    return map;
  }, new Map()).values());
  const totalWeeklyRawAccountSupply = selection.reduce((sum, character) => sum + Number(character.weeklyRawAccountSupply || 0), 0);
  const totalWeeklyNeedAccountSupply = selection.reduce((sum, character) => {
    return sum + (isSupplyHellEnabled(character) ? Number(character.weeklyNeedAccountSupply || 0) : 0);
  }, 0);
  const totalWeeklyAccountSupply = selection.reduce((sum, character) => sum + Number(character.weeklyAccountSupply || 0), 0);
  const totalWeeklySoulRecoverySupply = selection.reduce((sum, character) => sum + Number(character.weeklySoulRecoverySupply || 0), 0);
  const totalWeeklyHellRuns = selection.reduce((sum, character) => sum + Number((character.weeklyHellRunsDisplay ?? character.weeklyHellRunsForRecovery) || 0), 0);
  const totalWeeklyFatigueHellRuns = selection.reduce((sum, character) => sum + Number(character.weeklyUsage?.fatigueHellRuns || 0), 0);
  const totalWeeklyPotionRuns = selection.reduce((sum, character) => sum + Number(character.weeklyUsage?.potionRuns || 0), 0);
  const totalResetHellUsage = selection.reduce((sum, character) => sum + Number(character.resetUsage?.hellUsage || 0), 0);
  
  return {
    ...primary,
    primaryCharacter: primary,
    selectedCharacters: selection,
    selectionCount: selection.length,
    isMultiSelection: true,
    selectionLabel: `${fmtInt(selection.length)}캐릭 선택`,
    todayUsage: {
      hellUsage: totalTodayNeedAccountSupply,
      weeklyFatigue: totalTodayFatigue,
      fatigueHellRuns: totalTodayFatigueHellRuns,
      freeHellRuns: totalTodayFreeRuns,
      potionRuns: totalTodayPotionRuns,
    },
    todayNeedAccountSupply: totalTodayNeedAccountSupply,
    weeklyUsage: {
      hellUsage: totalWeeklyHellUsage,
      totalHellRuns: totalWeeklyHellRuns,
      fatigueHellRuns: totalWeeklyFatigueHellRuns,
      potionRuns: totalWeeklyPotionRuns,
    },
    resetUsage: { hellUsage: totalResetHellUsage },
    weeklyHellRunsForRecovery: totalWeeklyHellRuns,
    weeklyHellRunsDisplay: totalWeeklyHellRuns,
    weeklyBoundSupply: totalWeeklyBoundSupply,
    contentWeeklyBoundSupply: totalContentWeeklyBoundSupply,
    eventWeeklyBoundSupply: totalEventWeeklyBoundSupply,
    eventWeeklyBoundRows: totalEventWeeklyBoundRows,
    weeklyRawAccountSupply: totalWeeklyRawAccountSupply,
    weeklyAccountSupply: totalWeeklyAccountSupply,
    weeklyNeedAccountSupply: totalWeeklyNeedAccountSupply,
    weeklySoulRecoverySupply: totalWeeklySoulRecoverySupply,
    supplyParts: summarizeSoulRecoveryParts(selection),
  };
}

function buildSupplySelectionTitleMarkup(result) {
  const selectedCharacters = Array.isArray(result?.selectedCharacters) ? result.selectedCharacters : [];
  if (selectedCharacters.length <= 1) {
    const primary = selectedCharacters[0] || result?.primaryCharacter || result || null;
    return primary ? getCharacterPortraitMarkup(primary, { zoom: 1 }) : '-';
  }
  
  const names = selectedCharacters.slice(0, 4).map((character) => escapeHtml(getCharacterLabel(character))).join('<br>');
  const moreCount = Math.max(0, selectedCharacters.length - 4);
  return `
    <div class="supply-detail-selection-card">
      <div class="supply-detail-selection-count">${escapeHtml(fmtInt(selectedCharacters.length))}캐릭 선택</div>
      <div class="supply-detail-selection-names">${names}</div>
      ${moreCount > 0 ? `<div class="supply-detail-selection-more">외 ${escapeHtml(fmtInt(moreCount))}캐릭</div>` : ''}
    </div>
  `;
}

function renderSupplyDetail(result) {
  if (!result) {
  els.supplyDetailTitle.textContent = '-';
  els.supplyDetailUsage.textContent = '-';
  if (els.supplyDetailUsageSub) els.supplyDetailUsageSub.textContent = '-';
  if (els.supplyDetailTodayNeed) els.supplyDetailTodayNeed.textContent = '-';
  if (els.supplyDetailTodayNeedSub) els.supplyDetailTodayNeedSub.textContent = '';
  if (els.supplyDetailTodayHell) els.supplyDetailTodayHell.textContent = '-';
  if (els.supplyDetailTodayHellSub) els.supplyDetailTodayHellSub.textContent = '-';
  els.supplyDetailBound.textContent = '-';
  if (els.supplyDetailBoundSub) els.supplyDetailBoundSub.textContent = '';
    if (els.supplyDetailRecovery) els.supplyDetailRecovery.textContent = '-';
    if (els.supplyDetailRecoverySub) els.supplyDetailRecoverySub.textContent = '-';
    els.supplyDetailAccount.textContent = '-';
    els.supplyDetailHell.textContent = '-';
    if (els.supplyDetailEditor) els.supplyDetailEditor.innerHTML = '';
    els.supplyDetailTableBody.innerHTML = '';
    renderSupplyContentControls(null);
    updateSupplyPresetButtonStates(0);
    return;
  }
  
  const selectionCount = Number(result.selectionCount || (Array.isArray(result.selectedCharacters) ? result.selectedCharacters.length : 1));
  const isMultiSelection = Boolean(result.isMultiSelection || selectionCount > 1);
  const selectedHellCharacters = Array.isArray(result.selectedCharacters)
    ? result.selectedCharacters.filter((character) => isSupplyHellEnabled(character))
    : (isSupplyHellEnabled(result) ? [result] : []);
  els.supplyDetailTitle.innerHTML = buildSupplySelectionTitleMarkup(result);
  
  const effectiveHellUsage = Number(result.weeklyUsage?.hellUsage || 0);
  const directAccountSupply = Math.max(0, Number(result.weeklyRawAccountSupply || 0));
  const weeklyNeedAccountSupply = Math.max(0, Number(result.weeklyNeedAccountSupply || 0));
  const todayNeedAccountSupply = Math.max(0, Number(result.todayNeedAccountSupply || result.todayUsage?.hellUsage || 0));
  const weeklyHellRuns = Number((result.weeklyHellRunsDisplay ?? result.weeklyHellRunsForRecovery) || 0);
  const weeklyFatigueHellRuns = Number(result.weeklyUsage?.fatigueHellRuns || 0);
  const weeklyFreeRuns = Number(result.weeklyUsage?.freeHellRuns || 0);
  const weeklyPotionRuns = Number(result.weeklyUsage?.potionRuns || 0);
  const weeklyPaidRuns = Math.max(0, weeklyFatigueHellRuns - weeklyFreeRuns);
  const todayUsage = result.todayUsage || {};
  const todayFatigueRuns = Number(todayUsage.fatigueHellRuns || 0);
  const todayFreeRuns = Number(todayUsage.freeHellRuns || 0);
  const todayPotionRuns = Number(todayUsage.potionRuns || 0);
  const todayHellRuns = Number(todayUsage.revelationHellRuns ?? todayUsage.totalHellRuns ?? todayFatigueRuns ?? 0);
  const todayPaidRuns = Math.max(0, todayFatigueRuns - todayFreeRuns);
  const hasHellSelection = selectedHellCharacters.length > 0;
  const isPureHellSelection = hasHellSelection && selectedHellCharacters.length === selectionCount;
  const isPureAltSelection = !hasHellSelection;
  const hellCostPerRun = Number(result.primaryCharacter?.hellRevelationPerRun || result.hellRevelationPerRun || 0);
  const formattedHellRuns = Number.isFinite(weeklyHellRuns) && Math.abs(weeklyHellRuns - Math.round(weeklyHellRuns)) < 0.05
    ? fmtInt(Math.round(weeklyHellRuns))
    : fmtDecimal(weeklyHellRuns, 1);
  const showNeedFormula = isMultiSelection ? selectedHellCharacters.length > 0 : isSupplyHellEnabled(result);
  els.supplyDetailUsage.textContent = showNeedFormula
    ? `${fmtDecimal(weeklyNeedAccountSupply, 1)} 계시`
    : '헬 제외';
  if (els.supplyDetailUsageSub) {
    els.supplyDetailUsageSub.textContent = showNeedFormula ? '교불계시 반영' : '헬 제외';
  }
  if (els.supplyDetailTodayNeed) {
    els.supplyDetailTodayNeed.textContent = showNeedFormula ? fmtRevelation(todayNeedAccountSupply, 1) : '헬 제외';
  }
  if (els.supplyDetailTodayNeedSub) {
    els.supplyDetailTodayNeedSub.textContent = '';
  }
  if (els.supplyDetailTodayHell) {
    els.supplyDetailTodayHell.textContent = showNeedFormula ? `${fmtInt(todayHellRuns)}판` : '헬 제외';
  }
  if (els.supplyDetailTodayHellSub) {
    els.supplyDetailTodayHellSub.style.whiteSpace = 'nowrap';
    if (!showNeedFormula) {
      els.supplyDetailTodayHellSub.textContent = '헬 제외';
    } else {
      els.supplyDetailTodayHellSub.textContent = `${fmtInt(todayPaidRuns)}판 + 영약 ${fmtInt(todayPotionRuns)}판`;
    }
  }
  els.supplyDetailBound.textContent = fmtRevelation(result.weeklyBoundSupply, 1);
  els.supplyDetailAccount.textContent = fmtRevelation(directAccountSupply, 1);
  if (els.supplyDetailBoundSub) {
    const contentBound = Number(result.contentWeeklyBoundSupply ?? result.weeklyBoundSupply ?? 0);
    const eventRows = Array.isArray(result.eventWeeklyBoundRows) ? result.eventWeeklyBoundRows : [];
    const rows = buildDetailSupplyRows([
      contentBound ? {
        label: '콘텐츠 교불',
        value: fmtRevelation(contentBound, Math.abs(contentBound) >= 10000 ? 0 : 1),
      } : null,
      ...eventRows.map((eventRow) => ({
        label: eventRow.name || eventRow.id || '이벤트',
        value: fmtRevelation(eventRow.totalRevelation, Math.abs(Number(eventRow.totalRevelation || 0)) >= 10000 ? 0 : 1),
        detail: `${fmtDecimal(eventRow.expectedPerRun, 3)} * ${fmtDecimal(eventRow.weeklyHellRuns, 1)}판`,
      })),
    ]);
    els.supplyDetailBoundSub.innerHTML = rows
      ? buildDetailSupplyPopoverMarkup('', rows)
      : '';
  }
  els.supplyDetailHell.textContent = `${formattedHellRuns}판`;
  if (els.supplyDetailHellSub) {
    if (isPureHellSelection || (!isMultiSelection && isSupplyHellEnabled(result))) {
      els.supplyDetailHellSub.textContent = `주당 ${fmtInt(weeklyPaidRuns)}판 + 영약 ${fmtInt(weeklyPotionRuns)}판`;
    } else if (isPureAltSelection || (!isMultiSelection && !isSupplyHellEnabled(result))) {
      els.supplyDetailHellSub.textContent = `${fmtRevelation(result.weeklyBoundSupply || 0, 1)} / ${fmtRevelation(hellCostPerRun, 1)}`;
    } else {
      els.supplyDetailHellSub.textContent = `주당 ${fmtInt(weeklyPaidRuns)}판 + 영약 ${fmtInt(weeklyPotionRuns)}판 · 교불계시 ${fmtRevelation(result.weeklyBoundSupply || 0, 1)} / ${fmtRevelation(hellCostPerRun, 1)} = ${formattedHellRuns}판`;
    }
  }
  renderSupplyDetailRecovery(result);
  renderSupplyDetailEditor(result);
  renderSupplyContentControls(result);
  updateSupplyPresetButtonStates(isMultiSelection ? Number(result.primaryCharacter?.fame || 0) : Number(result.fame || 0));
  
  if (isMultiSelection) {
    els.supplyDetailTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty-cell">여러 캐릭터를 선택한 상태에서는 하단 콘텐츠 표를 바꾸지 않는다.</td>
      </tr>
    `;
    return;
  }
  
  if (!result.supplyEntries.length) {
    els.supplyDetailTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty-cell">현재 명성으로 수급되는 콘텐츠가 없습니다.</td>
      </tr>
    `;
    return;
  }
  
  const detailRows = result.supplyEntries.map((entry) => {
    const row = getSupplySheet3Row(entry) || {
      label: getSupplyEntryDisplayLabel(entry),
      gearMultiplier: 0,
      tunerMultiplier: 0,
      boundSupply: entry.boundSupply ?? 0,
      accountSupply: entry.accountSupply ?? entry.supply ?? 0,
      note: '',
    };
    return `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td>${formatSupplySheet3Cell(row.gearMultiplier, { decimals: 0 })}</td>
        <td>${formatSupplySheet3Cell(row.tunerMultiplier, { decimals: 0 })}</td>
        <td>${formatSupplySheet3Cell(row.boundSupply, { decimals: 0, blankZero: true })}</td>
        <td>${formatSupplySheet3Cell(row.accountSupply, { decimals: 0, blankZero: true })}</td>
      </tr>
    `;
  });
  const totals = result.supplyEntries.reduce((sum, entry) => {
    const row = getSupplySheet3Row(entry) || {
      gearMultiplier: 0,
      tunerMultiplier: 0,
      boundSupply: entry.boundSupply ?? 0,
      accountSupply: entry.accountSupply ?? entry.supply ?? 0,
    };
    return {
      gearMultiplier: sum.gearMultiplier + Number(row.gearMultiplier || 0),
      tunerMultiplier: sum.tunerMultiplier + Number(row.tunerMultiplier || 0),
      boundSupply: sum.boundSupply + Number(row.boundSupply || 0),
      accountSupply: sum.accountSupply + Number(row.accountSupply || 0),
    };
  }, {
    gearMultiplier: 0,
    tunerMultiplier: 0,
    boundSupply: 0,
    accountSupply: 0,
  });
  detailRows.push(`
    <tr class="supply-detail-total-row">
      <td>합계</td>
      <td>${formatSupplySheet3Cell(totals.gearMultiplier, { decimals: 0 })}</td>
      <td>${formatSupplySheet3Cell(totals.tunerMultiplier, { decimals: 0 })}</td>
      <td>${formatSupplySheet3Cell(totals.boundSupply, { decimals: 0, blankZero: true })}</td>
      <td>${formatSupplySheet3Cell(totals.accountSupply, { decimals: 0, blankZero: true })}</td>
    </tr>
  `);
  els.supplyDetailTableBody.innerHTML = detailRows.join('');
}

function updateSupplyCharactersByKeys(characterKeys, sourceLabel, updater) {
  const keySet = new Set((Array.isArray(characterKeys) ? characterKeys : [characterKeys])
    .map((key) => String(key || '').trim())
    .filter(Boolean));
  if (!keySet.size || typeof updater !== 'function') {
    return;
  }
  
  const nextCharacters = state.supplyCharacters.map((character) => {
    if (!keySet.has(character.key)) {
      return character;
    }
    return updater(character);
  });
  
  setSupplyCharacters(nextCharacters, sourceLabel);
}

function getSupplyEditTargetKeys(referenceKey) {
  const normalizedReferenceKey = String(referenceKey || '').trim();
  const selectedKeys = getSupplySelectedCharacterKeys();
  if (selectedKeys.length > 1) {
    if (!normalizedReferenceKey || selectedKeys.includes(normalizedReferenceKey)) {
      return selectedKeys;
    }
  }
  return normalizedReferenceKey ? [normalizedReferenceKey] : selectedKeys;
}

function updateSupplyCharacterSelection(characterKey, nextKeys) {
  const current = [...state.supplyCharacters];
  const index = current.findIndex((character) => character.key === characterKey);
  if (index < 0) return;
  
  const selectedContentKeys = normalizeSupplySelection(nextKeys, current[index].fame);
  const target = current[index];
  current[index] = {
    ...target,
    selectedContentKeys,
    selectedSupplyKeys: selectedContentKeys,
    selectedAdvancedDungeonKeys: selectedContentKeys,
  };
  state.supplyActiveCharacterKey = current[index].key;
  setSupplyCharacters(current, '선택 수정');
}

function updateSupplyCharacterHellBonus(characterKey, bonusKey) {
  const current = [...state.supplyCharacters];
  const index = current.findIndex((character) => character.key === characterKey);
  if (index < 0) return;
  
  const normalizedBonusKey = String(bonusKey || '').trim();
  const target = current[index];
  const nextTarget = { ...target };
  
  if (normalizedBonusKey === 'pcBang') {
    nextTarget.pcBangBonus = !Boolean(target.pcBangBonus);
  } else if (normalizedBonusKey === 'aradPass') {
    nextTarget.aradPassBonus = !Boolean(target.aradPassBonus);
  } else {
    return;
  }
  
  current[index] = nextTarget;
  state.supplyActiveCharacterKey = nextTarget.key;
  setSupplyCharacters(current, '헬 비용 수정');
}

function updateSupplyCharacterFatigueMode(characterKey, fatigueMode) {
  const current = [...state.supplyCharacters];
  const index = current.findIndex((character) => character.key === characterKey);
  if (index < 0) return;
  
  const normalizedMode = normalizeSupplyCharacterFatigueMode(fatigueMode);
  if (!SUPPLY_CHARACTER_FATIGUE_PROFILES[normalizedMode]) return;
  
  const target = current[index];
  current[index] = {
    ...target,
    fatigueMode: normalizedMode,
  };
  
  state.supplyActiveCharacterKey = target.key;
  setSupplyCharacters(current, '피로도 수정');
}

function updateSupplyCharacterFatiguePotion(characterKey, potionKey) {
  const current = [...state.supplyCharacters];
  const index = current.findIndex((character) => character.key === characterKey);
  if (index < 0) return;
  
  const normalizedPotionKey = String(potionKey || '').trim();
  if (!SUPPLY_CHARACTER_FATIGUE_POTIONS[normalizedPotionKey]) return;
  
  const target = current[index];
  const currentKeys = new Set(getSupplyCharacterFatiguePotionKeys(target));
  if (currentKeys.has(normalizedPotionKey)) {
    currentKeys.delete(normalizedPotionKey);
  } else {
    currentKeys.add(normalizedPotionKey);
  }
  
  current[index] = {
    ...target,
    fatiguePotionKeys: [...currentKeys],
  };
  
  state.supplyActiveCharacterKey = target.key;
  setSupplyCharacters(current, '영약 수정');
}

function updateSupplyCharacterFatiguePotionFoldOpen(characterKey, open) {
  const current = [...state.supplyCharacters];
  const index = current.findIndex((character) => character.key === characterKey);
  if (index < 0) return;
  
  const target = current[index];
  current[index] = {
    ...target,
    fatiguePotionFoldOpen: Boolean(open),
  };
  
  state.supplyActiveCharacterKey = target.key;
  setSupplyCharacters(current, '영약 패널');
}

function updateSupplyCharacterHellSelection(characterKey, runHell, focusMode = 'next') {
  const current = [...state.supplyCharacters];
  const index = current.findIndex((character) => character.key === characterKey);
  if (index < 0) return;
  
  const nextRunHell = Boolean(runHell);
  const nextCharacters = current.map((character, currentIndex) => {
    if (currentIndex !== index) {
      return character;
    }
    return {
      ...character,
      runHell: nextRunHell,
    };
  });
  
  state.supplyActiveCharacterKey = focusMode === 'self'
    ? characterKey
    : getSupplyRosterFocusKeyAfterMove(state.supplyCharacters, nextCharacters, characterKey);
  setSupplyCharacters(nextCharacters, '헬 선택 수정');
}

function setAllSupplyCharacterHellSelection(runHell) {
  if (!Array.isArray(state.supplyCharacters) || state.supplyCharacters.length === 0) {
    return;
  }
  
  const nextCharacters = state.supplyCharacters.map((character) => ({
    ...character,
    runHell: Boolean(runHell),
  }));
  setSupplyCharacters(nextCharacters, runHell ? '헬 일괄 선택' : '헬 일괄 해제');
}

function resetAllSupplySelectionsToDefault() {
  if (!Array.isArray(state.supplyCharacters) || state.supplyCharacters.length === 0) {
    return;
  }
  
  const nextCharacters = [...state.supplyCharacters]
    .slice()
    .sort((a, b) => {
      const fameDiff = Number(b.fame || 0) - Number(a.fame || 0);
      if (fameDiff !== 0) return fameDiff;
      return getSupplyRosterLabel(a).localeCompare(getSupplyRosterLabel(b), 'ko-KR');
    })
    .map((character) => {
    const fame = Number(character.fame || 0);
    const selectedContentKeys = buildDefaultSupplySelectionForFame(fame, { respectAccountLimits: false });
    return {
      ...character,
      selectedContentKeys,
      selectedSupplyKeys: selectedContentKeys,
      selectedAdvancedDungeonKeys: selectedContentKeys,
    };
  });
  
  state.supplyActiveCharacterKey = state.supplyActiveCharacterKey
    && nextCharacters.some((character) => character.key === state.supplyActiveCharacterKey)
    ? state.supplyActiveCharacterKey
    : nextCharacters[0]?.key || '';
  
  setSupplyCharacters(nextCharacters, '전체 기본 복원');
}

function applySupplyPreset(presetKey) {
  const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
  const current = state.supplyCharacters.find((character) => character.key === state.supplyActiveCharacterKey) || state.supplyCharacters[0] || null;
  if (!preset || !current) return;
  
  if (!isSupplyPresetAvailable(preset.key, current.fame)) {
    return;
  }
  
  if (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.length > 0) {
    const currentKeys = current.selectedContentKeys ?? current.selectedSupplyKeys ?? current.selectedAdvancedDungeonKeys ?? [];
    updateSupplyCharacterSelection(current.key, applySupplyForcedSelections(currentKeys, current.fame, preset.forcedSelectionKeys));
    return;
  }
  
  if (preset.key === 'default-selection') {
    updateSupplyCharacterSelection(
      current.key,
      buildDefaultSupplySelectionForFame(current.fame, { respectAccountLimits: false })
    );
    return;
  }
  
  const presetFame = getSupplyPresetAnchorFame(preset.key);
  const effectiveFame = Math.min(Number(current.fame || 0), presetFame || Number(current.fame || 0));
  updateSupplyCharacterSelection(current.key, buildDefaultSupplySelectionForFame(effectiveFame || current.fame || 0));
}

  Object.assign(ctx.actions, {
    setSupplyCharacters,
    clearSupplyCharacters,
    loadCachedSupplyCharacters,
    hasMissingSupplyFame,
    setSupplySearchBusy,
    buildSupplySelectionSummary,
    buildSupplySelectionTitleMarkup,
    renderSupplyDetail,
    updateSupplyCharactersByKeys,
    getSupplyEditTargetKeys,
    updateSupplyCharacterSelection,
    updateSupplyCharacterHellBonus,
    updateSupplyCharacterFatigueMode,
    updateSupplyCharacterFatiguePotion,
    updateSupplyCharacterFatiguePotionFoldOpen,
    updateSupplyCharacterHellSelection,
    setAllSupplyCharacterHellSelection,
    resetAllSupplySelectionsToDefault,
    applySupplyPreset,
  });
}
