export function installHellRenderCalc(ctx) {
  const { els, state } = ctx;
  const { characterCache, supplyCache } = ctx.caches;
  const {
    applySelectedPercentile,
    calcCharacter,
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
  const getSelectedPercentile = (...args) => ctx.actions.getSelectedPercentile(...args);
  const getCriterionDisplay = (...args) => ctx.actions.getCriterionDisplay(...args);
  const refreshModeLabels = (...args) => ctx.actions.refreshModeLabels(...args);
  const getSortedResults = (...args) => ctx.actions.getSortedResults(...args);
  const updateSortIndicators = (...args) => ctx.actions.updateSortIndicators(...args);
  const parseCharacters = (...args) => ctx.actions.parseCharacters(...args);

function renderCharacterOptions(results, selectedName) {
  const options = [...results].sort((a, b) => getCharacterLabel(a).localeCompare(getCharacterLabel(b), 'ko-KR'));
  els.selectedCharacter.innerHTML = options.map((result) => {
    const selected = result.key === selectedName ? 'selected' : '';
    return `<option value="${escapeHtml(result.key)}" ${selected}>${escapeHtml(getCharacterLabel(result))}</option>`;
  }).join('');
}

function renderOverview(results) {
  const sortedResults = getSortedResults(results);
  updateSortIndicators();
  els.overviewTableBody.innerHTML = sortedResults.map((result) => `
    <tr data-name="${escapeHtml(result.key)}" class="${els.selectedCharacter.value === result.key ? 'active' : ''}">
      <td>${getCharacterAvatarMarkup(result)}</td>
      <td>${fmtCost(result.selectedHellCost)}</td>
      <td>${fmtCost(result.craftBest.craftCost)}</td>
      <td>${result.ratio.toFixed(2)}x</td>
      <td><span class="badge ${result.verdict.className}">${result.verdict.text}</span></td>
      <td>${escapeHtml(result.craftBest.name)}</td>
      <td>
        <button
          type="button"
          class="ghost-button row-delete-button"
          data-remove-key="${escapeHtml(result.key)}"
          data-remove-label="${escapeHtml(getCharacterLabel(result))}"
        >삭제</button>
      </td>
    </tr>
  `).join('');
  bindCharacterAvatars(els.overviewTableBody);
}

function renderDetail(result, selectedPercentile) {
  if (!result) return;
  
  els.detailTitle.innerHTML = `${getCharacterAvatarMarkup(result)} <span class="detail-title-suffix">상세</span>`;
  const criterionText = getCriterionDisplay(selectedPercentile);
  const summaryPrefix = state.isDevMode ? `${criterionText} 기준` : '현재 기준';
  els.detailSummary.textContent = `${summaryPrefix}으로 살아있는 세트 ${fmtInt(result.aliveSetCount)}개 중 1개가 3태초+8에픽을 달성할 때의 헬 졸업 비용은 ${fmtCost(result.selectedHellCost)}이고, 최저 정가 비용은 ${fmtCost(result.craftBest.craftCost)}입니다. 기준은 ${fmtDecimal(result.hellPerRun)}계시/판, 회수는 ${fmtDecimal(result.recoveryAmount)}계시/판이라 순원가는 ${fmtDecimal(result.netCost)}계시/판입니다.`;
  els.detailBadge.textContent = result.verdict.text;
  els.detailBadge.className = `badge ${result.verdict.className}`;
  
  els.selectedHellCost.textContent = fmtCost(result.selectedHellCost);
  els.selectedHellRuns.textContent = `${criterionText} · 유효 ${fmtInt(result.aliveSetCount)}/${fmtInt(result.totalSetCount)}세트 중 1개 졸업까지 ${fmtInt(result.selectedRuns)}판`;
  els.craftCost.textContent = fmtCost(result.craftBest.craftCost);
  els.craftRoute.textContent = `최저 정가 루트: ${result.craftBest.name}`;
  els.verdictText.textContent = result.verdict.text;
  els.verdictSub.textContent = `헬/정가 비율: ${result.ratio.toFixed(2)}x`;
  els.quantileCompact.textContent = `${state.isDevMode ? 'P50' : '50'} ${fmtCost(result.p50Cost)} / ${state.isDevMode ? 'P66' : '66'} ${fmtCost(result.p66Cost)} / ${state.isDevMode ? 'P80' : '80'} ${fmtCost(result.p80Cost)}`;
  
  els.p50Cost.textContent = fmtCost(result.p50Cost);
  els.p50Runs.textContent = `${fmtInt(result.p50Runs)}판`;
  els.p66Cost.textContent = fmtCost(result.p66Cost);
  els.p66Runs.textContent = `${fmtInt(result.p66Runs)}판`;
  els.p80Cost.textContent = fmtCost(result.p80Cost);
  els.p80Runs.textContent = `${fmtInt(result.p80Runs)}판`;
  els.meanCost.textContent = fmtCost(result.meanCost);
  els.meanRuns.textContent = `${fmtInt(result.meanRuns)}판`;
  const aliveSetNameSet = new Set(result.aliveSetNames || []);
  
  els.setTableBody.innerHTML = result.allSetRows.map((row) => {
    const isAlive = aliveSetNameSet.has(row.name);
    return `
    <tr class="${isAlive ? '' : 'set-row-disabled'}">
      <td>
        <label class="set-table-toggle">
          <input type="checkbox" data-alive-set-name="${escapeHtml(row.name)}" ${isAlive ? 'checked' : ''} />
          <span>${escapeHtml(row.name)}</span>
        </label>
      </td>
      <td>${row.taecho}</td>
      <td>${row.epic}</td>
      <td>${row.taechoGap}</td>
      <td>${row.epicGap}</td>
      <td>${fmtCost(row.craftCost)}</td>
    </tr>
  `;
  }).join('');
  bindCharacterAvatars(els.detailTitle);
}

function updateOverviewSummary(results) {
  const counts = {
    good: results.filter((x) => x.verdict.className === 'good').length,
    warn: results.filter((x) => x.verdict.className === 'warn').length,
    priority: results.filter((x) => x.verdict.className === 'priority').length,
  };
  els.overviewSummary.textContent = `헬 유지 ${counts.good} / 대기 ${counts.warn} / 정가·초월 ${counts.priority}`;
}

function setCalcMeta(userText, devText = userText) {
  els.calcMeta.textContent = userText;
  if (els.calcMetaDev) {
    els.calcMetaDev.textContent = devText;
  }
}

function renderAll(results, selectedPercentile, preservedName) {
  els.totalCharacters.textContent = fmtInt(results.length);
  refreshModeLabels(selectedPercentile);
  
  let selectedName = preservedName;
  if (!results.some((result) => result.key === selectedName)) {
    selectedName = results[0]?.key ?? '';
  }
  
  renderCharacterOptions(results, selectedName);
  applySelectedPercentile(results, selectedPercentile);
  updateOverviewSummary(results);
  renderOverview(results);
  renderDetail(results.find((result) => result.key === selectedName), selectedPercentile);
}

function updateViewOnly() {
  if (!state.lastResults.length) return;
  
  const selectedPercentile = getSelectedPercentile();
  const selectedName = els.selectedCharacter.value;
  refreshModeLabels(selectedPercentile);
  updateOverviewSummary(state.lastResults);
  renderOverview(state.lastResults);
  renderDetail(state.lastResults.find((result) => result.key === selectedName), selectedPercentile);
}

function refreshPercentileOnly() {
  if (!state.lastResults.length) return;
  
  const selectedPercentile = getSelectedPercentile();
  applySelectedPercentile(state.lastResults, selectedPercentile);
  updateViewOnly();
}

function readHellCalcConfig() {
  const epicRatePercent = Number(els.epicRate.value);
  const taechoRatePercent = Number(els.taechoRate.value);
  const config = {
    setCount: Math.max(1, Math.round(Number(els.setCount.value) || 12)),
    epicRate: epicRatePercent / 100,
    epicRatePercent,
    taechoRate: taechoRatePercent / 100,
    taechoRatePercent,
    hellPerRun: Number(els.hellPerRun.value),
    recoveryAmount: Number(els.recoveryAmount.value),
    epicCraftCost: Number(els.epicCraftCost.value),
    taechoCraftCost: Number(els.taechoCraftCost.value),
    trials: Math.max(500, Math.round(Number(els.trials.value) || 3000)),
  };

  if (
    config.epicRatePercent < 0 ||
    config.epicRatePercent > 100 ||
    config.taechoRatePercent < 0 ||
    config.taechoRatePercent > 100 ||
    config.epicRate + config.taechoRate > 1
  ) {
    throw new Error('드랍률 값이 올바르지 않습니다.');
  }
  if (!Number.isFinite(config.hellPerRun) || config.hellPerRun < 0) {
    throw new Error('한판 계시량 값이 올바르지 않습니다.');
  }
  if (!Number.isFinite(config.recoveryAmount) || config.recoveryAmount < 0) {
    throw new Error('계시 회수량 값이 올바르지 않습니다.');
  }

  return config;
}

function recalc() {
  const start = performance.now();
  els.error.textContent = '';
  els.calcState.textContent = '계산 중';
  setCalcMeta('캐릭터 반영 중...', '전체 캐릭 반영 중');
  
  try {
    const selectedPercentile = getSelectedPercentile();
    const config = readHellCalcConfig();
  
    const characters = parseCharacters();
    for (const character of characters) {
      if (character.sets.length > config.setCount) {
        throw new Error(`${character.name}의 세트 개수가 전체 세트 수보다 많습니다.`);
      }
    }
  
    const preservedName = els.selectedCharacter.value;
    const results = characters
      .map((character) => calcCharacter(character, config));
  
    state.lastResults = results;
    renderAll(results, selectedPercentile, preservedName);
  
    const elapsed = performance.now() - start;
    els.calcState.textContent = '완료';
    const derivedNetCost = calcNetCost(config.hellPerRun, config.recoveryAmount);
    setCalcMeta(
      `${results.length.toLocaleString('ko-KR')}캐릭 계산 완료`,
      `${results.length.toLocaleString('ko-KR')}캐릭 · 캐릭당 ${config.trials.toLocaleString('ko-KR')}회 · ${fmtDecimal(config.hellPerRun)}계시/판 - ${fmtDecimal(config.recoveryAmount)}계시/판 · 순원가 ${fmtDecimal(derivedNetCost)}계시/판 · ${state.activeCharactersSource} · ${elapsed.toFixed(0)}ms`
    );
  } catch (error) {
    els.error.textContent = error.message;
    els.calcState.textContent = '오류';
    setCalcMeta('입력값을 확인해 주세요');
    state.lastResults = [];
    els.overviewTableBody.innerHTML = '';
    els.setTableBody.innerHTML = '';
  }
}

function recalcCharacterOnly(characterKey) {
  if (!state.lastResults.length) return false;
  const start = performance.now();
  els.error.textContent = '';

  try {
    const selectedPercentile = getSelectedPercentile();
    const config = readHellCalcConfig();
    const characters = parseCharacters();
    const character = characters.find((item) => item.key === characterKey);
    if (!character) return false;
    if (character.sets.length > config.setCount) {
      throw new Error(`${character.name}의 세트 개수가 전체 세트 수보다 많습니다.`);
    }

    const nextResult = calcCharacter(character, config);
    state.lastResults = state.lastResults.map((result) => (
      result.key === characterKey ? nextResult : result
    ));
    applySelectedPercentile(state.lastResults, selectedPercentile);
    renderAll(state.lastResults, selectedPercentile, characterKey);

    const elapsed = performance.now() - start;
    els.calcState.textContent = '완료';
    setCalcMeta(
      `${getCharacterLabel(nextResult)} 세트 기준 갱신`,
      `${getCharacterLabel(nextResult)} · 캐릭당 ${config.trials.toLocaleString('ko-KR')}회 · ${elapsed.toFixed(0)}ms`
    );
    return true;
  } catch (error) {
    els.error.textContent = error.message;
    els.calcState.textContent = '오류';
    setCalcMeta('입력값을 확인해 주세요');
    return false;
  }
}

function updateDetailOnly() {
  updateViewOnly();
}

function scheduleRecalc() {
  if (!state.hasCharacterData) {
    return;
  }
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(recalc, 120);
}

  Object.assign(ctx.actions, {
    renderCharacterOptions,
    renderOverview,
    renderDetail,
    updateOverviewSummary,
    setCalcMeta,
    renderAll,
    updateViewOnly,
    refreshPercentileOnly,
    recalc,
    recalcCharacterOnly,
    updateDetailOnly,
    scheduleRecalc,
  });
}
