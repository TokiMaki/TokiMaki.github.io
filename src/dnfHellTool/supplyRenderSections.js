const SUPPLY_PC_BANG_ICON_URL = new URL('../../이미지/pcroom.png', import.meta.url).href;
const SUPPLY_ARAD_PASS_ICON_URL = new URL('../../이미지/aradpass.png', import.meta.url).href;
const SUPPLY_FAME_ICON_URL = new URL('../../이미지/fame.png', import.meta.url).href;

export function installSupplyRenderSections(ctx) {
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
  const formatSupplySheet3Cell = (...args) => ctx.actions.formatSupplySheet3Cell(...args);
  const buildSoulRecoveryRowsMarkup = (...args) => ctx.actions.buildSoulRecoveryRowsMarkup(...args);
  const isSupplyHellEnabled = (...args) => ctx.actions.isSupplyHellEnabled(...args);
  const getSupplyEntriesForFame = (...args) => ctx.actions.getSupplyEntriesForFame(...args);
  const getAvailableSupplyKeys = (...args) => ctx.actions.getAvailableSupplyKeys(...args);
  const getDefaultSupplySelection = (...args) => ctx.actions.getDefaultSupplySelection(...args);
  const getSupplyEntryDisplayMarkup = (...args) => ctx.actions.getSupplyEntryDisplayMarkup(...args);
  const getSupplyRosterLabel = (...args) => ctx.actions.getSupplyRosterLabel(...args);
  const getSupplyRosterTagLabel = (...args) => ctx.actions.getSupplyRosterTagLabel(...args);
  const getSupplyAccountSelectionCount = (...args) => ctx.actions.getSupplyAccountSelectionCount(...args);
  const compareSupplyGroupsByFameDesc = (...args) => ctx.actions.compareSupplyGroupsByFameDesc(...args);

function getSupplyCharacterEffectiveHellUsage(character) {
  return isSupplyHellEnabled(character)
    ? Number(character?.weeklyUsage?.hellUsage || 0)
    : 0;
}

function getSupplyRosterItemMarkup(character, roleLabel) {
  const label = escapeHtml(getSupplyRosterLabel(character));
  const tagLabel = escapeHtml(getSupplyRosterTagLabel(character));
  const fameLabel = fmtInt(Number(character?.fame || 0));
  const avatar = getCharacterAvatarMarkup(character, { showName: false });
  const potionKeys = getSupplyCharacterFatiguePotionKeys(character);
  const dailyPotionRuns = getSupplyCharacterFatiguePotionDailyRuns(character);
  const active = state.supplyActiveCharacterKey === character.key ? 'active' : '';
  const selected = state.supplySelectedCharacterKeys.has(character.key) ? 'selected' : '';
  const bonusIcons = [
    character?.pcBangBonus
      ? `<span class="supply-roster-bonus-icon" title="피시방 지정" aria-label="피시방 지정"><img src="${escapeHtml(SUPPLY_PC_BANG_ICON_URL)}" alt="" loading="lazy" decoding="async" /></span>`
      : null,
    character?.aradPassBonus
      ? `<span class="supply-roster-bonus-icon" title="아라드패스 지정" aria-label="아라드패스 지정"><img src="${escapeHtml(SUPPLY_ARAD_PASS_ICON_URL)}" alt="" loading="lazy" decoding="async" /></span>`
      : null,
  ].filter(Boolean).join('');
  const summaryChips = [
    roleLabel === 'alt'
      ? null
      : `<span class="supply-roster-cost">영약 ${escapeHtml(fmtInt(potionKeys.length))}개 +${escapeHtml(fmtInt(dailyPotionRuns))}판</span>`,
    bonusIcons ? `<span class="supply-roster-bonus-icons">${bonusIcons}</span>` : null,
  ].filter(Boolean).join('');
  return `
    <div
      class="supply-roster-item ${active} ${selected}"
      draggable="true"
      data-supply-key="${escapeHtml(character.key)}"
      data-supply-role="${roleLabel}"
      aria-selected="${selected ? 'true' : 'false'}"
    >
      ${avatar}
      <div class="supply-roster-item-main">
      <div class="supply-roster-item-top">
          <span class="supply-roster-item-name">${label}</span>
        <span class="supply-roster-item-tag">${tagLabel}</span>
        <span class="supply-roster-item-badge" title="명성 ${escapeHtml(fameLabel)}" aria-label="명성 ${escapeHtml(fameLabel)}"><img src="${escapeHtml(SUPPLY_FAME_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(fameLabel)}</span>
        ${selected ? '<span class="supply-roster-item-selected-pill">선택</span>' : ''}
      </div>
      <div class="supply-roster-item-summary">${summaryChips}</div>
      </div>
      <div class="supply-roster-item-actions">
        <button type="button" class="ghost-button row-delete-button" data-supply-delete="${escapeHtml(character.key)}">삭제</button>
      </div>
    </div>
  `;
}

function renderSupplyRosterList(container, characters, roleLabel) {
  if (!container) return;
  
  container.innerHTML = characters.length
    ? characters.map((character) => getSupplyRosterItemMarkup(character, roleLabel)).join('')
    : `<div class="supply-note supply-note-empty">비어 있음</div>`;
  container.dataset.supplyDropRole = roleLabel;
}

function renderSupplyReferenceTable() {
  if (!els.supplyReferenceTableBody) return;
  
  els.supplyReferenceTableBody.innerHTML = SUPPLY_SHEET3_ROWS.map((row) => `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${formatSupplySheet3Cell(row.gearMultiplier, { decimals: 0 })}</td>
      <td>${formatSupplySheet3Cell(row.tunerMultiplier, { decimals: 0 })}</td>
      <td>${formatSupplySheet3Cell(row.boundSupply, { decimals: 0, blankZero: true })}</td>
      <td>${formatSupplySheet3Cell(row.accountSupply, { decimals: 0, blankZero: true })}</td>
    </tr>
  `).join('');
}

function renderSupplyDetailEditor(result) {
  if (!els.supplyDetailEditor) return;
  if (!result) {
    els.supplyDetailEditor.innerHTML = '';
    return;
  }
  
  const selectedCharacters = Array.isArray(result.selectedCharacters) ? result.selectedCharacters.filter(Boolean) : [];
  const isMultiSelection = Boolean(result.isMultiSelection || selectedCharacters.length > 1);
  const referenceCharacter = selectedCharacters[0] || result.primaryCharacter || result;
  const selectedKeys = (isMultiSelection ? selectedCharacters : [referenceCharacter]).map((character) => character.key).filter(Boolean);
  const fatigueMode = getSupplyCharacterFatigueMode(referenceCharacter);
  const pcBangActive = Boolean(referenceCharacter?.pcBangBonus);
  const aradPassActive = Boolean(referenceCharacter?.aradPassBonus);
  const potionKeys = getSupplyCharacterFatiguePotionKeys(referenceCharacter);
  const weeklyPotionRuns = Number(result?.weeklyUsage?.potionRuns || 0);
  const hellCost = getSupplyCharacterHellRevelationPerRun(referenceCharacter);
  const batchPillMarkup = isMultiSelection
    ? `
      <span class="supply-detail-editor-pill">${escapeHtml(fmtInt(selectedCharacters.length))}캐릭 선택</span>
      <span class="supply-detail-editor-pill">일괄 적용</span>
    `
    : `
      <span class="supply-detail-editor-pill">피로도 ${escapeHtml(getSupplyCharacterFatigueLabel(referenceCharacter))}</span>
      <span class="supply-detail-editor-pill">영약 +${escapeHtml(fmtInt(weeklyPotionRuns))}판</span>
      <span class="supply-detail-editor-pill">${escapeHtml(fmtInt(hellCost))}계시/판</span>
    `;
  
  els.supplyDetailEditor.innerHTML = `
    <div class="panel supply-detail-editor-shell">
      <div class="supply-detail-editor-head">
        <div class="supply-detail-editor-meta">
          ${batchPillMarkup}
        </div>
      </div>
      ${isMultiSelection ? `<div class="supply-note supply-detail-editor-note">선택된 캐릭터 ${escapeHtml(fmtInt(selectedCharacters.length))}개에 동시에 적용한다.</div>` : ''}
      <div class="supply-detail-editor-controls">
        <div class="supply-detail-editor-group">
          <div class="supply-detail-editor-group-head">
            <span class="supply-detail-editor-group-title">피로도</span>
          </div>
          <div class="supply-roster-item-options">
            ${Object.entries(SUPPLY_CHARACTER_FATIGUE_PROFILES).map(([mode, info]) => `
              <button type="button" class="supply-roster-hell-toggle ${fatigueMode === mode ? 'active' : ''}" data-supply-fatigue-mode="${escapeHtml(mode)}">${escapeHtml(info.label)}</button>
            `).join('')}
          </div>
        </div>
        <div class="supply-detail-editor-group">
          <div class="supply-detail-editor-group-head">
            <span class="supply-detail-editor-group-title">헬 비용</span>
          </div>
          <div class="supply-roster-item-options">
            <button type="button" class="supply-roster-hell-toggle ${pcBangActive ? 'active' : ''}" data-supply-hell-bonus="pcBang">피시방 -5</button>
            <button type="button" class="supply-roster-hell-toggle ${aradPassActive ? 'active' : ''}" data-supply-hell-bonus="aradPass">아라드 패스 -5</button>
          </div>
        </div>
        <div class="supply-detail-editor-group">
          <div class="supply-detail-editor-group-head">
            <span class="supply-detail-editor-group-title">영약</span>
          </div>
          <div class="supply-roster-potion-fold" data-supply-key="${escapeHtml(result.key)}">
            <div class="supply-roster-potion-fold-content">
              ${Object.entries(SUPPLY_CHARACTER_FATIGUE_POTIONS).map(([key, info]) => `
                <button type="button" class="supply-roster-hell-toggle ${potionKeys.includes(key) ? 'active' : ''}" data-supply-fatigue-potion="${escapeHtml(key)}">${escapeHtml(info.label)}</button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const targetKeys = selectedKeys.length > 0 ? selectedKeys : [referenceCharacter.key].filter(Boolean);
  els.supplyDetailEditor.dataset.multiSelect = isMultiSelection ? 'true' : 'false';
  els.supplyDetailEditor.dataset.selectionKeys = JSON.stringify(targetKeys);
}

function renderSupplyDetailRecovery(result) {
  if (!els.supplyDetailRecovery || !els.supplyDetailRecoverySub) return;
  if (!result) {
    els.supplyDetailRecovery.textContent = '-';
    els.supplyDetailRecoverySub.textContent = '-';
    return;
  }
  
  const supplyParts = normalizeSupplyParts(result?.supplyParts, result?.weeklyRawAccountSupply || 0);
  const excludedSoulKeys = state.supplySoulExcludedKeys instanceof Set ? state.supplySoulExcludedKeys : new Set();
  const soulUsageRates = state.supplySoulUsageRates && typeof state.supplySoulUsageRates === 'object' ? state.supplySoulUsageRates : {};
  const gearRows = Array.isArray(supplyParts.gearRows) ? supplyParts.gearRows : [];
  const dimRows = Array.isArray(supplyParts.dimRows) ? supplyParts.dimRows : [];
  const dimSoulCount = Number(supplyParts.dimSoulCount || dimRows.reduce((sum, row) => sum + Number(row.expectedCount || 0), 0));
  const dimSoulValue = Number(supplyParts.dimSoulValue || (dimSoulCount * 4));
  const soulRecoveryTotal = ctx.actions.getEffectiveSoulRecoveryTotal(supplyParts, excludedSoulKeys, soulUsageRates);
  
  els.supplyDetailRecovery.textContent = fmtRevelation(soulRecoveryTotal, 1);
  els.supplyDetailRecoverySub.innerHTML = buildSoulRecoveryRowsMarkup(gearRows, dimSoulCount, dimSoulValue, {
    dimRows,
    showDimDetails: true,
    excludedKeys: excludedSoulKeys,
    usageRates: soulUsageRates,
  });
}

function renderSupplyContentControls(result) {
  if (!els.supplyContentControls) return;
  
  if (!result) {
    els.supplyContentControls.innerHTML = `
      <div class="supply-note supply-note-wide">캐릭터를 선택하면 콘텐츠를 고를 수 있다.</div>
    `;
    return;
  }
  
  const selectedCharacters = Array.isArray(result.selectedCharacters) ? result.selectedCharacters.filter(Boolean) : [];
  const referenceCharacter = result.isMultiSelection
    ? [...selectedCharacters].sort((a, b) => Number(b.fame || 0) - Number(a.fame || 0))[0] || result.primaryCharacter || result
    : result;
  const referenceFame = Number(referenceCharacter?.fame || result.fame || 0);
  const selectedKeys = new Set(referenceCharacter?.selectedContentKeys || referenceCharacter?.selectedSupplyKeys || referenceCharacter?.selectedAdvancedDungeonKeys || getDefaultSupplySelection(referenceFame));
  const availableKeys = new Set(getAvailableSupplyKeys(referenceFame));
  const groupedEntries = new Map(SUPPLY_CONTENT_TYPE_ORDER.map((type) => [type, new Map()]));
  
  for (const entry of getSupplyEntriesForFame(referenceFame, true)) {
    const type = entry.contentType || 'advanced';
    if (!groupedEntries.has(type)) {
      groupedEntries.set(type, new Map());
    }
    const typeGroups = groupedEntries.get(type);
    if (!typeGroups.has(entry.groupKey)) {
      typeGroups.set(entry.groupKey, []);
    }
    typeGroups.get(entry.groupKey).push(entry);
  }
  
  const typeToColumn = {
    bound: 'left',
    advanced: 'left',
    raid: 'mid',
    legion: 'right',
  };
  const columnBlocks = {
    left: [],
    mid: [],
    right: [],
  };
  const contentTypeLimits = {
    advanced: 2,
    legion: 1,
  };
  const getSelectedTypeCount = (type) => {
    let count = 0;
    const typeGroups = groupedEntries.get(type) || new Map();
    typeGroups.forEach((entries) => {
      entries.forEach((entry) => {
        if (selectedKeys.has(entry.key)) count += 1;
      });
    });
    return count;
  };
  
  const buildTypeSection = (type, typeGroups) => {
    const groupBlocks = [];
  
    if (type === 'advanced') {
      const entries = Array.from(typeGroups.values()).flat().sort((a, b) => {
        const fameDiff = b.minFame - a.minFame;
        if (fameDiff !== 0) return fameDiff;
        const supplyDiff = Number(b.totalSupply ?? b.supply ?? 0) - Number(a.totalSupply ?? a.supply ?? 0);
        if (supplyDiff !== 0) return supplyDiff;
        return a.label.localeCompare(b.label, 'ko-KR');
      });
  
      if (entries.length) {
        groupBlocks.push(`
          <div class="supply-category-grid supply-category-grid-advanced">
            ${entries.map((entry) => {
              const checked = selectedKeys.has(entry.key) ? 'checked' : '';
              const disabled = entry.available && availableKeys.has(entry.key) ? '' : 'disabled';
              const ariaDisabled = entry.available && availableKeys.has(entry.key) ? 'false' : 'true';
              return `
                <label class="supply-check-item" data-supply-content-item="${escapeHtml(entry.key)}" aria-disabled="${ariaDisabled}">
                  <input type="checkbox" data-supply-content-key="${escapeHtml(entry.key)}" data-supply-group-key="${escapeHtml(entry.groupKey)}" ${checked} ${disabled} />
                  ${getSupplyEntryDisplayMarkup(entry)}
                </label>
              `;
            }).join('')}
          </div>
        `);
      }
    } else {
      for (const group of [...SUPPLY_CONTENT_GROUPS].filter((group) => (group.contentType || 'advanced') === type).sort(compareSupplyGroupsByFameDesc)) {
        const entries = (typeGroups.get(group.key) || []).sort((a, b) => {
          const fameDiff = b.minFame - a.minFame;
          if (fameDiff !== 0) return fameDiff;
          const supplyDiff = b.supply - a.supply;
          if (supplyDiff !== 0) return supplyDiff;
          return a.label.localeCompare(b.label, 'ko-KR');
        });
  
        if (!entries.length) continue;
  
        const groupLimit = Math.max(0, Number(group.accountLimit || 0));
        const groupPoolKey = String(group.accountPoolKey || group.key || '').trim();
        const groupCount = groupLimit > 0 ? getSupplyAccountSelectionCount(groupPoolKey) : 0;
  
        const blockHtml = `
          <div class="supply-content-group">
            <div class="supply-content-group-head">
              <div class="supply-category-title">${escapeHtml(group.label)}</div>
              ${groupLimit > 0 ? `<span class="supply-limit-pill ${groupCount >= groupLimit ? 'full' : ''}">모험단 (${groupCount}/${groupLimit})</span>` : ''}
            </div>
            <div class="supply-category-grid">
              ${entries.map((entry) => {
                const checked = selectedKeys.has(entry.key) ? 'checked' : '';
                const limitReached = groupLimit > 0 && groupCount >= groupLimit;
                const canSelect = entry.available && availableKeys.has(entry.key) && (!limitReached || checked === 'checked');
                const disabled = canSelect ? '' : 'disabled';
                const ariaDisabled = canSelect ? 'false' : 'true';
                return `
                  <label class="supply-check-item" data-supply-content-item="${escapeHtml(entry.key)}" aria-disabled="${ariaDisabled}">
                    <input type="checkbox" data-supply-content-key="${escapeHtml(entry.key)}" data-supply-group-key="${escapeHtml(group.key)}" ${checked} ${disabled} />
                    ${getSupplyEntryDisplayMarkup(entry)}
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `;
  
        groupBlocks.push(blockHtml);
      }
    }
  
    if (!groupBlocks.length) return '';
    const typeLimit = Math.max(0, Number(contentTypeLimits[type] || 0));
    const typeCount = typeLimit > 0 ? getSelectedTypeCount(type) : 0;
  
    return `
      <section class="supply-category">
        <div class="supply-category-head">
          <div>
            <div class="supply-category-title">${escapeHtml(SUPPLY_CONTENT_TYPE_LABELS[type] || type)}</div>
          </div>
          ${typeLimit > 0 ? `<span class="supply-limit-pill ${typeCount >= typeLimit ? 'full' : ''}">(${typeCount}/${typeLimit})</span>` : ''}
        </div>
        <div class="supply-content-groups">
          ${groupBlocks.join('')}
        </div>
      </section>
    `;
  };
  
  for (const type of SUPPLY_CONTENT_TYPE_ORDER) {
    const typeGroups = groupedEntries.get(type) || new Map();
    const sectionHtml = buildTypeSection(type, typeGroups);
    if (!sectionHtml) continue;
    const columnKey = typeToColumn[type] || 'left';
    columnBlocks[columnKey].push(sectionHtml);
  }
  
  els.supplyContentControls.innerHTML = `
    <div class="supply-content-layout">
      <div class="supply-content-column supply-content-column-stack">
        ${columnBlocks.left.join('')}
      </div>
      <div class="supply-content-column">
        ${columnBlocks.mid.join('')}
      </div>
      <div class="supply-content-column">
        ${columnBlocks.right.join('')}
      </div>
    </div>
  `;
}

function clearSupplyRenderedResults(message = '캐릭터를 추가해 주세요.') {
  els.supplyTotalUsage.textContent = '-';
  if (els.supplyTotalResetUsage) els.supplyTotalResetUsage.textContent = '-';
  if (els.supplyTotalSoul) els.supplyTotalSoul.textContent = '-';
  if (els.supplyTotalSoulSub) els.supplyTotalSoulSub.textContent = '-';
  if (els.supplyTotalEvent) els.supplyTotalEvent.textContent = '-';
  if (els.supplyTotalEventSub) els.supplyTotalEventSub.textContent = '-';
  if (els.supplyTotalTodayUsage) els.supplyTotalTodayUsage.textContent = '-';
  if (els.supplyTotalBound) els.supplyTotalBound.textContent = '-';
  els.supplyTotalAccount.textContent = '-';
  if (els.supplyTotalAccountSub) els.supplyTotalAccountSub.textContent = '-';
  if (els.supplyHellRosterList) els.supplyHellRosterList.innerHTML = '';
  if (els.supplyAltRosterList) els.supplyAltRosterList.innerHTML = '';
  if (els.supplyHellRosterCount) els.supplyHellRosterCount.textContent = '0';
  if (els.supplyAltRosterCount) els.supplyAltRosterCount.textContent = '0';
  els.supplyDetailTitle.textContent = '-';
  els.supplyDetailUsage.textContent = '-';
  if (els.supplyDetailUsageSub) els.supplyDetailUsageSub.textContent = '-';
  els.supplyDetailBound.textContent = '-';
  if (els.supplyDetailRecovery) els.supplyDetailRecovery.textContent = '-';
  if (els.supplyDetailRecoverySub) els.supplyDetailRecoverySub.textContent = '-';
  els.supplyDetailAccount.textContent = '-';
  els.supplyDetailHell.textContent = '-';
  if (els.supplyDetailHellSub) els.supplyDetailHellSub.textContent = '-';
  els.supplyDetailTableBody.innerHTML = '';
  renderSupplyContentControls(null);
  renderSupplyReferenceTable();
}

  Object.assign(ctx.actions, {
    getSupplyCharacterEffectiveHellUsage,
    getSupplyRosterItemMarkup,
    renderSupplyRosterList,
    renderSupplyReferenceTable,
    renderSupplyDetailEditor,
    renderSupplyDetailRecovery,
    renderSupplyContentControls,
    clearSupplyRenderedResults,
  });
}
