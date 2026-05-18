export function installSupplyViewApi(ctx) {
  const { els, state } = ctx;
  const { characterCache, supplyCache } = ctx.caches;
  const {
    applySelectedPercentile,
    calcCharacter,
    calcFragmentExpectation,
    calcNetCost,
    calcDailyContentWeeklySupply,
    calcIndependentSupplyParts,
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
    parseApiJsonResponse,
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
    getActiveWeeklyAccountRevelationSummary,
    getActiveWeeklyEventBoundRevelationSources,
    getActiveWeeklyEventBoundRevelationPerHellRun,
    getActiveWeeklyEventRevelationSummary,
  } = ctx.config;
  const buildSoulRecoveryRowsMarkup = (...args) => ctx.actions.buildSoulRecoveryRowsMarkup(...args);
  const getEffectiveSoulRecoveryTotal = (...args) => ctx.actions.getEffectiveSoulRecoveryTotal(...args);
  const mergeSupplyCharacterSelection = (...args) => ctx.actions.mergeSupplyCharacterSelection(...args);
  const isSupplyHellEnabled = (...args) => ctx.actions.isSupplyHellEnabled(...args);
  const getSupplyEntriesForFame = (...args) => ctx.actions.getSupplyEntriesForFame(...args);
  const normalizeSupplySelection = (...args) => ctx.actions.normalizeSupplySelection(...args);
  const getDefaultSupplySelection = (...args) => ctx.actions.getDefaultSupplySelection(...args);
  const getSupplyRosterCharactersByRole = (...args) => ctx.actions.getSupplyRosterCharactersByRole(...args);
  const getSupplySelectedCharacters = (...args) => ctx.actions.getSupplySelectedCharacters(...args);
  const syncSupplySelectionState = (...args) => ctx.actions.syncSupplySelectionState(...args);
  const renderSupplyRosterList = (...args) => ctx.actions.renderSupplyRosterList(...args);
  const renderSupplyReferenceTable = (...args) => ctx.actions.renderSupplyReferenceTable(...args);
  const clearSupplyRenderedResults = (...args) => ctx.actions.clearSupplyRenderedResults(...args);
  const setSupplyCharacters = (...args) => ctx.actions.setSupplyCharacters(...args);
  const clearSupplyCharacters = (...args) => ctx.actions.clearSupplyCharacters(...args);
  const setSupplySearchBusy = (...args) => ctx.actions.setSupplySearchBusy(...args);

  function buildEventRevelationSummaryMarkup(summary) {
    const events = Array.isArray(summary?.events) ? summary.events : [];
    if (!events.length) return '활성 이벤트 없음';

    const totalDaily = events.reduce((sum, event) => sum + Number(event.dailyRevelation || 0), 0);
    const totalWeekly = events.reduce((sum, event) => sum + Number(event.weeklyRevelation || 0), 0);
    const shortDetails = [
      totalDaily ? `일 ${fmtDecimal(totalDaily, Math.abs(totalDaily) >= 10000 ? 0 : 1)}` : '',
      totalWeekly ? `주 ${fmtDecimal(totalWeekly, Math.abs(totalWeekly) >= 10000 ? 0 : 1)}` : '',
    ].filter(Boolean).join(' + ');
    const eventRows = events.map((event) => {
      const total = Number(event.totalRevelation || 0);
      const weekly = Number(event.weeklyRevelation || 0);
      const daily = Number(event.dailyRevelation || 0);
      const detail = [
        daily ? `일 ${fmtDecimal(daily, Math.abs(daily) >= 10000 ? 0 : 1)}` : '',
        weekly ? `주 ${fmtDecimal(weekly, Math.abs(weekly) >= 10000 ? 0 : 1)}` : '',
      ].filter(Boolean).join(' + ');
      return `
        <div class="supply-event-row">
          <span class="supply-event-name">${escapeHtml(event.name || event.id || '이벤트')}</span>
          <span class="supply-event-value">${escapeHtml(fmtRevelation(total, Math.abs(total) >= 10000 ? 0 : 1))}</span>
        </div>
        ${detail ? `<div class="supply-event-detail">${escapeHtml(detail)}</div>` : ''}
      `;
    }).join('');

    return buildSupplySummaryPopoverMarkup(shortDetails || '이벤트 상세', eventRows);
  }

  function buildSupplySummaryPopoverMarkup(summaryText, detailRowsMarkup) {
    return `
      <span class="supply-event-popover-wrap">
        <span class="supply-event-summary-text">${escapeHtml(summaryText)}</span>
        <button type="button" class="supply-event-popover-trigger">상세</button>
        <span class="supply-event-popover" role="tooltip">
          <span class="supply-event-detail-list">${detailRowsMarkup}</span>
        </span>
      </span>
    `;
  }

  function buildContentAccountRevelationRows(characters) {
    const rowMap = new Map();
    for (const character of Array.isArray(characters) ? characters : []) {
      for (const entry of Array.isArray(character?.supplyEntries) ? character.supplyEntries : []) {
        const amount = Number(entry.accountSupply ?? entry.supply ?? 0);
        if (amount <= 0) continue;
        const label = String(entry.label || entry.key || '콘텐츠');
        const key = `${label}:${amount}`;
        const current = rowMap.get(key) || {
          label,
          amount,
          count: 0,
          total: 0,
        };
        current.count += 1;
        current.total += amount;
        rowMap.set(key, current);
      }
    }
    return [...rowMap.values()].sort((a, b) => {
      const totalDiff = Number(b.total || 0) - Number(a.total || 0);
      if (totalDiff !== 0) return totalDiff;
      return String(a.label).localeCompare(String(b.label), 'ko-KR');
    });
  }

  function buildAccountRevelationSummaryMarkup(summary, contentRows = []) {
    const sources = Array.isArray(summary?.sources) ? summary.sources : [];
    const contentTotal = contentRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    if (!sources.length && !contentRows.length) return '추가 수급 없음';

    const totalDaily = sources.reduce((sum, source) => sum + Number(source.dailyRevelation || 0), 0);
    const totalWeekly = sources.reduce((sum, source) => sum + Number(source.weeklyRevelation || 0), 0);
    const shortDetails = [
      contentTotal ? `콘텐츠 ${fmtDecimal(contentTotal, Math.abs(contentTotal) >= 10000 ? 0 : 1)}` : '',
      totalDaily ? `일 ${fmtDecimal(totalDaily, Math.abs(totalDaily) >= 10000 ? 0 : 1)}` : '',
      totalWeekly ? `주 ${fmtDecimal(totalWeekly, Math.abs(totalWeekly) >= 10000 ? 0 : 1)}` : '',
    ].filter(Boolean).join(' + ');
    const contentRowsMarkup = contentRows.map((row) => `
      <div class="supply-event-row">
        <span class="supply-event-name">${escapeHtml(row.label)}</span>
        <span class="supply-event-value">${escapeHtml(fmtRevelation(row.total, Math.abs(row.total) >= 10000 ? 0 : 1))}</span>
      </div>
      <div class="supply-event-detail">${escapeHtml(fmtInt(row.amount))} * ${escapeHtml(fmtInt(row.count))}캐릭</div>
    `).join('');
    const sourceRows = sources.map((source) => {
      const total = Number(source.totalRevelation || 0);
      const weekly = Number(source.weeklyRevelation || 0);
      const daily = Number(source.dailyRevelation || 0);
      const detail = [
        daily ? `일 ${fmtDecimal(daily, Math.abs(daily) >= 10000 ? 0 : 1)}` : '',
        weekly ? `주 ${fmtDecimal(weekly, Math.abs(weekly) >= 10000 ? 0 : 1)}` : '',
      ].filter(Boolean).join(' ');
      return `
        <div class="supply-event-row">
          <span class="supply-event-name">${escapeHtml(source.name || source.id || '추가 수급')}</span>
          <span class="supply-event-value">${escapeHtml(fmtRevelation(total, Math.abs(total) >= 10000 ? 0 : 1))}</span>
        </div>
        ${detail ? `<div class="supply-event-detail">${escapeHtml(detail)}</div>` : ''}
      `;
    }).join('');

    return buildSupplySummaryPopoverMarkup(shortDetails || '추가 수급 상세', `${contentRowsMarkup}${sourceRows}`);
  }
  const buildSupplySelectionSummary = (...args) => ctx.actions.buildSupplySelectionSummary(...args);
  const renderSupplyDetail = (...args) => ctx.actions.renderSupplyDetail(...args);

function renderSupplyView() {
  const source = Array.isArray(state.supplyCharacters) ? state.supplyCharacters : [];
  if (source.length === 0) {
    clearSupplyRenderedResults();
    els.supplySearchStatus.textContent = state.supplyCharactersSource;
    return;
  }
  
  syncSupplySelectionState(source);
  const eventBoundRevelationSources = getActiveWeeklyEventBoundRevelationSources();
  const eventBoundRevelationPerHellRun = getActiveWeeklyEventBoundRevelationPerHellRun();
  
  const rawDecorated = source.map((character, index) => {
    const selectedContentKeys = normalizeSupplySelection(character.selectedContentKeys ?? character.selectedSupplyKeys ?? character.selectedAdvancedDungeonKeys, character.fame);
    const candidateEntries = getSupplyEntriesForFame(character.fame);
    const selectedEntries = candidateEntries.filter((entry) => {
      return selectedContentKeys.includes(entry.key);
    });
    const hellRevelationPerRun = getSupplyCharacterHellRevelationPerRun(character);
    const weeklyFatigue = getSupplyCharacterWeeklyFatigue(character);
    const fatigueMode = getSupplyCharacterFatigueMode(character);
    const dailyPotionRuns = getSupplyCharacterFatiguePotionDailyRuns(character);
    const weeklyPotionRuns = dailyPotionRuns * (SUPPLY_USAGE_CONSTANTS.weekdayCount + SUPPLY_USAGE_CONSTANTS.weekendCount);
    const todayUsage = calcTodayNeedFromCharacter(character, selectedEntries, hellRevelationPerRun);
    const todayIncomeUsage = calcTodayUsageFromEntries(selectedEntries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, new Date(), eventBoundRevelationPerHellRun);
    const weeklyUsage = calcWeeklyUsageFromEntries(selectedEntries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, eventBoundRevelationPerHellRun);
    const resetUsage = calcResetUsageFromEntries(selectedEntries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, new Date(), eventBoundRevelationPerHellRun);
    return {
      ...character,
      runHell: isSupplyHellEnabled(character),
      key: character.key || `${character.serverId}:${character.characterId}` || `supply-${index + 1}`,
      selectedContentKeys,
      selectedSupplyKeys: selectedContentKeys,
      selectedAdvancedDungeonKeys: selectedContentKeys,
      rawSupplyEntries: selectedEntries,
      hellRevelationPerRun,
      weeklyFatigue,
      dailyPotionRuns,
      weeklyPotionRuns,
      todayUsage,
      todayIncomeUsage,
      weeklyUsage,
      resetUsage,
    };
  });
  
  const decorated = rawDecorated.map((character, index) => {
    const supplyEntries = [...character.rawSupplyEntries].sort((a, b) => {
      const fameDiff = b.minFame - a.minFame;
      if (fameDiff !== 0) return fameDiff;
      const supplyDiff = Number(b.totalSupply ?? b.supply ?? 0) - Number(a.totalSupply ?? a.supply ?? 0);
      if (supplyDiff !== 0) return supplyDiff;
      return a.label.localeCompare(b.label, 'ko-KR');
    });
    const totalSupply = supplyEntries.reduce((sum, entry) => sum + Number(entry.totalSupply ?? entry.supply ?? 0), 0);
    const weeklyUsage = character.weeklyUsage || calcWeeklyUsageFromEntries(
      supplyEntries,
      character.hellRevelationPerRun,
      getSupplyCharacterFatigueMode(character),
      character.dailyPotionRuns,
      eventBoundRevelationPerHellRun
    );
    const resetUsage = character.resetUsage || calcResetUsageFromEntries(
      supplyEntries,
      character.hellRevelationPerRun,
      getSupplyCharacterFatigueMode(character),
      character.dailyPotionRuns,
      new Date(),
      eventBoundRevelationPerHellRun
    );
    const contentWeeklyBoundSupply = supplyEntries
      .reduce((sum, entry) => sum + Number(entry.boundSupply || 0), 0);
    const weeklyUsageByEntryKey = new Map(supplyEntries.map((entry) => [entry.key, entry]));
    for (const entry of weeklyUsageByEntryKey.values()) {
      if (Number(entry.unlimitedFatigueCost || 0) > 0) {
        const runCount = Number(weeklyUsage.unlimitedRuns || 0);
        entry.supplyParts = calcIndependentSupplyParts(
          runCount,
          entry.independentRarityKeys || ['rare', 'unique', 'legendary'],
          entry.boundSupply || 0,
          entry.accountSupply || 0,
          entry.independentRarityRates || null
        ).supplyParts;
      }
    }
    const weeklyHellRunsForRecovery = isSupplyHellEnabled(character)
      ? Number(weeklyUsage.revelationHellRuns || 0)
      : Number(weeklyUsage.contentBoundHellRuns || 0);
    const resetHellRunsForRecovery = isSupplyHellEnabled(character)
      ? Number(resetUsage.revelationHellRuns || 0)
      : Number(resetUsage.contentBoundHellRuns || 0);
    const todayIncomeUsage = character.todayIncomeUsage || calcTodayUsageFromEntries(
      supplyEntries,
      character.hellRevelationPerRun,
      getSupplyCharacterFatigueMode(character),
      character.dailyPotionRuns,
      new Date(),
      eventBoundRevelationPerHellRun
    );
    const todayHellRunsForRecovery = isSupplyHellEnabled(character)
      ? Number(character.todayUsage?.revelationHellRuns || 0)
      : Number(todayIncomeUsage.contentBoundHellRuns || 0);
    const weeklyMukkisulRuns = Number(weeklyUsage.unlimitedRuns || 0);
    const resetMukkisulRuns = Number(resetUsage.unlimitedRuns || 0);
    const todayMukkisulRuns = Number(todayIncomeUsage.unlimitedRuns || 0);
    const weeklyEventEligibleRuns = weeklyHellRunsForRecovery + weeklyMukkisulRuns;
    const resetEventEligibleRuns = resetHellRunsForRecovery + resetMukkisulRuns;
    const todayEventEligibleRuns = todayHellRunsForRecovery + todayMukkisulRuns;
    const eventWeeklyBoundSupply = weeklyEventEligibleRuns > 0
      ? (eventBoundRevelationPerHellRun * weeklyEventEligibleRuns)
      : 0;
    const eventResetBoundSupply = resetEventEligibleRuns > 0
      ? (eventBoundRevelationPerHellRun * resetEventEligibleRuns)
      : 0;
    const eventTodayBoundSupply = todayEventEligibleRuns > 0
      ? (eventBoundRevelationPerHellRun * todayEventEligibleRuns)
      : 0;
    const eventWeeklyBoundRows = weeklyEventEligibleRuns > 0
      ? eventBoundRevelationSources.map((source) => ({
          ...source,
          weeklyHellRuns: weeklyEventEligibleRuns,
          totalRevelation: Number(source.expectedPerRun || 0) * weeklyEventEligibleRuns,
        })).filter((source) => Number(source.totalRevelation || 0) > 0)
      : [];
    const weeklyBoundSupply = contentWeeklyBoundSupply + eventWeeklyBoundSupply;
    const resetBoundSupply = Number(resetUsage.contentBoundSupply || 0) + eventResetBoundSupply;
    const todayBoundSupply = Number(todayIncomeUsage.contentBoundSupply || 0) + eventTodayBoundSupply;
    const weeklyHellRunsDisplay = isSupplyHellEnabled(character)
      ? Number(weeklyUsage.revelationHellRuns || 0)
      : Number(weeklyHellRunsForRecovery || 0);
    const eventFundedHellRunsForRecovery = isSupplyHellEnabled(character) && Number(weeklyUsage.contentBoundHellRunsForUsage || 0) <= 0
      ? (eventWeeklyBoundSupply / Math.max(1, Number(character.hellRevelationPerRun || 0)))
      : 0;
    const weeklySoulRecoveryHellRuns = weeklyHellRunsForRecovery + eventFundedHellRunsForRecovery;
    const accountSupplySummary = calcSupplyPartsFromEntries(
      supplyEntries,
      weeklySoulRecoveryHellRuns,
      false
    );
    const weeklyRawAccountSupply = accountSupplySummary.accountSupply;
    const weeklyAccountSupply = Math.max(0, weeklyRawAccountSupply);
    const weeklyNeedAccountSupply = isSupplyHellEnabled(character)
      ? Math.max(0, weeklyUsage.hellUsage - weeklyBoundSupply)
      : 0;
    const todayNeedAccountSupply = isSupplyHellEnabled(character)
      ? Math.max(0, Number(character.todayUsage?.hellUsage || 0) - todayBoundSupply)
      : 0;
    return {
      ...character,
      supplyEntries,
      totalSupply,
      weeklyUsage,
      resetUsage,
      todayIncomeUsage,
      todayNeedAccountSupply,
      todayBoundSupply,
      weeklyBoundSupply,
      resetBoundSupply,
      contentWeeklyBoundSupply,
      eventWeeklyBoundSupply,
      eventResetBoundSupply,
      eventWeeklyBoundRows,
      weeklyRawAccountSupply,
      weeklyAccountSupply,
      weeklySoulRecoverySupply: accountSupplySummary.parts.soulRecoveryTotal,
      supplyParts: accountSupplySummary.parts,
      weeklyHellRunsForRecovery,
      weeklyHellRunsDisplay,
      weeklyMukkisulRuns,
      weeklyEventEligibleRuns,
      weeklySoulRecoveryHellRuns,
      weeklyNeedAccountSupply,
    };
  }).sort((a, b) => {
    const supplyDiff = b.totalSupply - a.totalSupply;
    if (supplyDiff !== 0) return supplyDiff;
    const fameDiff = b.fame - a.fame;
    if (fameDiff !== 0) return fameDiff;
    return getCharacterLabel(a).localeCompare(getCharacterLabel(b), 'ko-KR');
  });
  
  if (!state.supplyActiveCharacterKey || !decorated.some((character) => character.key === state.supplyActiveCharacterKey)) {
    state.supplyActiveCharacterKey = decorated[0]?.key || '';
  }
  
  const selectedCharacters = getSupplySelectedCharacters(decorated);
  const selected = buildSupplySelectionSummary(selectedCharacters)
    || decorated.find((character) => character.key === state.supplyActiveCharacterKey)
    || decorated[0]
    || null;
  const enabledCharacters = decorated.filter((character) => isSupplyHellEnabled(character));
  const totalTodayUsage = enabledCharacters.reduce((sum, character) => sum + Number(character.todayNeedAccountSupply || 0), 0);
  const totalNeedAccountSupply = enabledCharacters.reduce((sum, character) => {
    return sum + Number(character.weeklyNeedAccountSupply || 0);
  }, 0);
  const totalResetUsage = enabledCharacters.reduce((sum, character) => {
    return sum + Math.max(0, Number(character.resetUsage?.hellUsage || 0) - Number(character.resetBoundSupply || 0));
  }, 0);
  const totalSoulRecoverySummary = summarizeSoulRecoveryParts(decorated);
  const excludedSoulKeys = state.supplySoulExcludedKeys instanceof Set ? state.supplySoulExcludedKeys : new Set();
  const soulUsageRates = state.supplySoulUsageRates && typeof state.supplySoulUsageRates === 'object' ? state.supplySoulUsageRates : {};
  const totalSoulRecoverySupply = getEffectiveSoulRecoveryTotal(totalSoulRecoverySummary, excludedSoulKeys, soulUsageRates);
  const accountRevelationSummary = getActiveWeeklyAccountRevelationSummary();
  const contentAccountRevelationRows = buildContentAccountRevelationRows(decorated);
  const totalBoundSupply = decorated.reduce((sum, character) => sum + Number(character.weeklyBoundSupply || 0), 0);
  const contentAccountSupply = decorated.reduce((sum, character) => sum + Number(character.weeklyRawAccountSupply || 0), 0);
  const totalAccountSupply = contentAccountSupply + Number(accountRevelationSummary.totalRevelation || 0);
  const eventRevelationSummary = getActiveWeeklyEventRevelationSummary();
  const totalWeeklyHellRuns = decorated.reduce((sum, character) => sum + Number(character.weeklyHellRunsDisplay || 0), 0);
  const totalRawHellCost = enabledCharacters.reduce((sum, character) => sum + Number(character.weeklyUsage?.hellUsage || 0), 0);
  const perRunSoulRecoveries = calcSoulRecoveryRows(0, 0, 1);
  const perRunGearRows = mergeSupplyRecoveryRows(perRunSoulRecoveries.filter((row) => String(row.key || '').startsWith('gear:')));
  const perRunDimRows = mergeSupplyRecoveryRows(perRunSoulRecoveries.filter((row) => String(row.key || '').startsWith('tuner:')));
  const perRunSoulRecovery = getEffectiveSoulRecoveryTotal(
    { gearRows: perRunGearRows, dimRows: perRunDimRows },
    excludedSoulKeys,
    soulUsageRates
  );
  const perRunRecovery = perRunSoulRecovery + Number(eventBoundRevelationPerHellRun || 0);
  state.supplyDerivedHellCalc = totalWeeklyHellRuns > 0
    ? {
        hellPerRun: totalRawHellCost / totalWeeklyHellRuns,
        recoveryAmount: perRunRecovery,
        weeklyHellRuns: totalWeeklyHellRuns,
        eventRevelation: Number(eventBoundRevelationPerHellRun || 0),
        soulRecovery: perRunSoulRecovery,
        eventRecovery: Number(eventBoundRevelationPerHellRun || 0),
      }
    : null;
  
  if (els.supplyTotalTodayUsage) els.supplyTotalTodayUsage.textContent = fmtRevelation(totalTodayUsage, 1);
  els.supplyTotalUsage.textContent = fmtRevelation(totalNeedAccountSupply, 1);
  if (els.supplyTotalResetUsage) els.supplyTotalResetUsage.textContent = fmtRevelation(totalResetUsage, 1);
  if (els.supplyTotalSoul) {
    els.supplyTotalSoul.textContent = fmtRevelation(totalSoulRecoverySupply, Math.abs(totalSoulRecoverySupply) >= 10000 ? 0 : 1);
  }
  if (els.supplySoulExcludeControls) {
    const controlRows = [
      ...totalSoulRecoverySummary.gearRows,
      Number(totalSoulRecoverySummary.dimSoulCount || 0) > 0
        ? {
            key: 'tuner',
            label: '미광',
            expectedCount: totalSoulRecoverySummary.dimSoulCount,
          }
        : null,
    ].filter((row) => Number(row.expectedCount || 0) > 0);
    els.supplySoulExcludeControls.innerHTML = controlRows.length ? `
      <div class="supply-soul-exclude-title">계시 환산 제외 / 미광 사용 비율</div>
      <div class="supply-soul-exclude-list">
        ${controlRows.map((row) => {
          const key = String(row.key || '').trim();
          const label = String(row.label || key).replace(' 소울', '');
          const legacyExcluded = key === 'tuner'
            ? (excludedSoulKeys.has('tuner') || totalSoulRecoverySummary.dimRows.some((dimRow) => excludedSoulKeys.has(String(dimRow?.key || '').trim())))
            : excludedSoulKeys.has(key);
          const usageRate = Object.prototype.hasOwnProperty.call(soulUsageRates, key)
            ? Math.max(0, Math.min(100, Number(soulUsageRates[key]) || 0))
            : (legacyExcluded ? 0 : 100);
          if (key !== 'tuner') {
            return `
              <label class="supply-soul-exclude-option">
                <input type="checkbox" data-supply-soul-exclude-key="${escapeHtml(key)}" ${legacyExcluded ? 'checked' : ''}>
                <span>${escapeHtml(label)}</span>
              </label>
            `;
          }
          return `
            <label class="supply-soul-exclude-option supply-soul-usage-option">
              <span>${escapeHtml(label)}</span>
              <input type="range" min="0" max="100" step="1" value="${escapeHtml(String(usageRate))}" data-supply-soul-usage-key="${escapeHtml(key)}">
              <input type="number" min="0" max="100" step="1" value="${escapeHtml(String(usageRate))}" data-supply-soul-usage-key="${escapeHtml(key)}" aria-label="${escapeHtml(label)} 사용 비율">
              <span>%</span>
            </label>
          `;
        }).join('')}
      </div>
    ` : '';
  }
  if (els.supplyTotalSoulSub) {
    els.supplyTotalSoulSub.innerHTML = buildSoulRecoveryRowsMarkup(
      totalSoulRecoverySummary.gearRows,
      totalSoulRecoverySummary.dimSoulCount,
      totalSoulRecoverySummary.dimSoulValue,
      {
        dimRows: totalSoulRecoverySummary.dimRows,
        listClass: 'supply-detail-recovery-list supply-total-soul-list',
        showDimDetails: true,
        showReveal: true,
        compactLargeNumbers: true,
        excludedKeys: excludedSoulKeys,
        usageRates: soulUsageRates,
      }
    );
  }
  if (els.supplyTotalBound) els.supplyTotalBound.textContent = fmtRevelation(totalBoundSupply, 1);
  els.supplyTotalAccount.textContent = fmtRevelation(totalAccountSupply, 1);
  if (els.supplyTotalAccountSub) {
    els.supplyTotalAccountSub.innerHTML = buildAccountRevelationSummaryMarkup(accountRevelationSummary, contentAccountRevelationRows);
  }
  if (els.supplyTotalEvent) {
    els.supplyTotalEvent.textContent = fmtRevelation(eventRevelationSummary.totalRevelation, Math.abs(eventRevelationSummary.totalRevelation) >= 10000 ? 0 : 1);
  }
  if (els.supplyTotalEventSub) {
    els.supplyTotalEventSub.innerHTML = buildEventRevelationSummaryMarkup(eventRevelationSummary);
  }
  
  const hellCharacters = getSupplyRosterCharactersByRole(decorated, true);
  const altCharacters = getSupplyRosterCharactersByRole(decorated, false);
  renderSupplyRosterList(els.supplyHellRosterList, hellCharacters, 'hell');
  renderSupplyRosterList(els.supplyAltRosterList, altCharacters, 'alt');
  if (els.supplyHellRosterCount) els.supplyHellRosterCount.textContent = `${hellCharacters.length.toLocaleString('ko-KR')}캐릭`;
  if (els.supplyAltRosterCount) els.supplyAltRosterCount.textContent = `${altCharacters.length.toLocaleString('ko-KR')}캐릭`;
  bindCharacterAvatars(els.supplyHellRosterList);
  bindCharacterAvatars(els.supplyAltRosterList);
  renderSupplyDetail(selected);
  renderSupplyReferenceTable();
  els.supplySearchStatus.textContent = `${state.supplyCharactersSource} · 헬 ${hellCharacters.length.toLocaleString('ko-KR')}캐릭 · 배럭 ${altCharacters.length.toLocaleString('ko-KR')}캐릭`;
  els.supplyError.textContent = '';
}

function setSupplyError(message = '') {
  els.supplyError.textContent = message;
}

async function lookupSupplyCharacter(serverId, characterName) {
  const url = `${API_BASE}/api/search?serverId=${encodeURIComponent(serverId)}&characterName=${encodeURIComponent(characterName)}`;
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await parseApiJsonResponse(response, '캐릭터 검색에 실패했습니다.');
  
  const resolved = payload.resolved || {};
  const resolvedServerId = String(resolved.serverId || serverId).trim().toLowerCase();
  const resolvedCharacterId = String(resolved.characterId || '').trim();
  const resolvedName = String(resolved.characterName || characterName).trim();
  
  return {
    key: resolvedServerId && resolvedCharacterId ? `${resolvedServerId}:${resolvedCharacterId}` : resolvedName,
    serverId: resolvedServerId,
    characterId: resolvedCharacterId,
    name: resolvedName,
    fame: Number(String(resolved.fame ?? 0).replace(/,/g, '')) || 0,
    jobName: String(resolved.jobName || '').trim(),
    jobGrowName: String(resolved.jobGrowName || '').trim(),
    runHell: true,
    fatigueMode: 'home',
    fatiguePotionKeys: [],
    fatiguePotionFoldOpen: false,
    selectedContentKeys: getDefaultSupplySelection(Number(String(resolved.fame ?? 0).replace(/,/g, '')) || 0),
    selectedSupplyKeys: getDefaultSupplySelection(Number(String(resolved.fame ?? 0).replace(/,/g, '')) || 0),
    selectedAdvancedDungeonKeys: getDefaultSupplySelection(Number(String(resolved.fame ?? 0).replace(/,/g, '')) || 0),
  };
}

async function addSupplyCharacter() {
  const serverId = String(els.supplyServerIdInput.value || '').trim().toLowerCase();
  const characterName = String(els.supplyCharacterNameInput.value || '').trim();
  if (!serverId || !characterName) {
    setSupplyError('서버와 캐릭터명을 입력해 주세요.');
    return;
  }
  
  setSupplySearchBusy(true, `조회 중... ${getServerLabel(serverId)} / ${characterName}`);
  setSupplyError('');
  
  try {
    const previousCharacter = state.supplyCharacters.find((character) => character.serverId === serverId && character.name === characterName)
      || state.supplyCharacters.find((character) => character.key === `${serverId}:${characterName}`)
      || null;
    const resolved = mergeSupplyCharacterSelection(await lookupSupplyCharacter(serverId, characterName), previousCharacter);
    const nextCharacters = [...state.supplyCharacters.filter((character) => character.key !== resolved.key), resolved];
    state.supplyActiveCharacterKey = resolved.key;
    setSupplyCharacters(nextCharacters, '검색 반영');
    els.supplyCharacterNameInput.value = '';
  } catch (error) {
    setSupplyError(error instanceof Error ? error.message : '캐릭터 추가 중 오류가 발생했습니다.');
    els.supplySearchStatus.textContent = '추가 실패';
  } finally {
    setSupplySearchBusy(false);
    els.supplyCharacterNameInput.focus();
  }
}

async function refreshSupplyCharacters() {
  if (!Array.isArray(state.supplyCharacters) || state.supplyCharacters.length === 0) {
    setSupplyError('갱신할 캐릭터가 없습니다.');
    return;
  }
  
  setSupplySearchBusy(true, `전체 갱신 중... (${state.supplyCharacters.length.toLocaleString('ko-KR')}캐릭)`);
  setSupplyError('');
  
  try {
    const settled = await Promise.allSettled(
      state.supplyCharacters.map((character) => lookupSupplyCharacter(character.serverId, character.name))
    );
  
    const refreshed = state.supplyCharacters.map((character, index) => {
      const item = settled[index];
      if (item && item.status === 'fulfilled') {
        return mergeSupplyCharacterSelection(item.value, character);
      }
      return character;
    });
  
    const failedLabels = state.supplyCharacters
      .map((character, index) => (settled[index] && settled[index].status === 'rejected' ? getCharacterLabel(character) : ''))
      .filter(Boolean);
  
    const successCount = refreshed.length - failedLabels.length;
    state.supplyActiveCharacterKey = state.supplyActiveCharacterKey && refreshed.some((character) => character.key === state.supplyActiveCharacterKey)
      ? state.supplyActiveCharacterKey
      : refreshed[0]?.key || '';
  
    setSupplyCharacters(refreshed, '전체 갱신');
    if (failedLabels.length > 0) {
      setSupplyError(`일부 캐릭터 갱신 실패: ${failedLabels.join(', ')}`);
      els.supplySearchStatus.textContent = `${state.supplyCharactersSource} · ${successCount}/${refreshed.length}캐릭 갱신 완료`;
    } else {
      els.supplySearchStatus.textContent = `${state.supplyCharactersSource} · ${refreshed.length.toLocaleString('ko-KR')}캐릭 전체 갱신`;
    }
  } catch (error) {
    setSupplyError(error instanceof Error ? error.message : '전체 갱신 중 오류가 발생했습니다.');
  } finally {
    setSupplySearchBusy(false);
  }
}

async function refreshSupplyCharacterByKey(characterKey) {
  const normalizedKey = String(characterKey || '').trim();
  const target = state.supplyCharacters.find((character) => character.key === normalizedKey);
  if (!target) return;
  
  els.supplySearchStatus.textContent = `${getCharacterLabel(target)} 갱신 중...`;
  setSupplyError('');
  
  try {
    const resolved = mergeSupplyCharacterSelection(
      await lookupSupplyCharacter(target.serverId, target.name),
      target
    );
    const nextCharacters = state.supplyCharacters.map((character) => (
      character.key === normalizedKey ? resolved : character
    ));
    state.supplyActiveCharacterKey = resolved.key || normalizedKey;
    setSupplyCharacters(nextCharacters, '단일 갱신');
    els.supplySearchStatus.textContent = `${state.supplyCharactersSource} · ${getCharacterLabel(resolved)} 갱신 완료`;
  } catch (error) {
    setSupplyError(error instanceof Error ? error.message : '캐릭터 갱신 중 오류가 발생했습니다.');
    els.supplySearchStatus.textContent = `${getCharacterLabel(target)} 갱신 실패`;
  }
}

function deleteSupplyCharacter(characterKey) {
  const target = state.supplyCharacters.find((character) => character.key === characterKey);
  if (!target) return;
  
  const confirmed = window.confirm(`${getCharacterLabel(target)}를 목록에서 삭제할까요?`);
  if (!confirmed) return;
  
  const nextCharacters = state.supplyCharacters.filter((character) => character.key !== characterKey);
  state.supplyActiveCharacterKey = state.supplyActiveCharacterKey === characterKey ? (nextCharacters[0]?.key || '') : state.supplyActiveCharacterKey;
  
  if (nextCharacters.length === 0) {
    clearSupplyCharacters('삭제 후 목록이 비었습니다.');
    return;
  }
  
  setSupplyCharacters(nextCharacters, '목록 수정');
  els.supplySearchStatus.textContent = `${state.supplyCharactersSource} · ${nextCharacters.length.toLocaleString('ko-KR')}캐릭`;
}

  Object.assign(ctx.actions, {
    renderSupplyView,
    setSupplyError,
    lookupSupplyCharacter,
    addSupplyCharacter,
    refreshSupplyCharacters,
    refreshSupplyCharacterByKey,
    deleteSupplyCharacter,
  });
}
