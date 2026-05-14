export function installSupplySheetRows(ctx) {
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

function getSupplySheet3Row(entry) {
  if (!entry) return null;
  return SUPPLY_SHEET3_ROW_MAP.get(String(entry.key || '').trim()) || null;
}

function formatSupplySheet3Cell(value, { decimals = 0, blankZero = false } = {}) {
  const numeric = Number(value || 0);
  if (blankZero && numeric === 0) return '';
  return decimals > 0 ? fmtDecimal(numeric, decimals) : fmtInt(numeric);
}

function getSoulRecoveryRowClass(row) {
  const key = String(row?.key || '').split(':')[1] || '';
  if (key === 'rare') return 'rarity-rare';
  if (key === 'unique') return 'rarity-unique';
  if (key === 'legendary') return 'rarity-legendary';
  if (key === 'epic') return 'rarity-epic';
  if (key === 'taecho') return 'rarity-taecho';
  return 'rarity-dim';
}

function getTunerDecisionLabel(row) {
  const label = String(row?.label || '').trim();
  const match = label.match(/^미광\((.*)\)$/);
  return match ? match[1] : label.replace('미광', '').trim() || '서약 결정';
}

function formatSoulRecoveryNumber(value, compactLargeNumbers) {
  const numeric = Number(value);
  const digits = compactLargeNumbers && Math.abs(numeric) >= 10000 ? 0 : 1;
  return fmtDecimal(numeric, digits);
}

const DIM_SOUL_EXCLUDE_KEY = 'tuner';

function getSoulUsageRate(row, excludedKeys = new Set(), usageRates = {}) {
  const key = String(row?.key || '').trim();
  if (!key) return 100;
  const rateKey = key.startsWith('tuner:') ? DIM_SOUL_EXCLUDE_KEY : key;
  if (Object.prototype.hasOwnProperty.call(usageRates || {}, rateKey)) {
    return Math.max(0, Math.min(100, Number(usageRates[rateKey]) || 0));
  }
  return isSoulRecoveryExcluded(row, excludedKeys) ? 0 : 100;
}

function isSoulRecoveryExcluded(row, excludedKeys = new Set()) {
  const key = String(row?.key || '').trim();
  if (!key) return false;
  if (key.startsWith('tuner:')) {
    return excludedKeys.has(DIM_SOUL_EXCLUDE_KEY) || excludedKeys.has(key);
  }
  return excludedKeys.has(key);
}

function getEffectiveSoulRecoveryTotal(parts, excludedKeys = new Set(), usageRates = {}) {
  const supplyParts = normalizeSupplyParts(parts);
  const gearRows = Array.isArray(supplyParts.gearRows) ? supplyParts.gearRows : [];
  const dimRows = Array.isArray(supplyParts.dimRows) ? supplyParts.dimRows : [];
  const gearTotal = gearRows.reduce((sum, row) => (
    sum + Number(row.valueTotal || 0) * (getSoulUsageRate(row, excludedKeys, usageRates) / 100)
  ), 0);
  const dimTotal = dimRows.reduce((sum, row) => (
    sum + Number(row.valueTotal || 0) * (getSoulUsageRate(row, excludedKeys, usageRates) / 100)
  ), 0);
  return gearTotal + dimTotal + Number(supplyParts.boundRecovery || 0);
}

function buildSoulRecoveryRowsMarkup(gearRows, dimSoulCount, dimSoulValue, options = {}) {
  const listClass = options.listClass || 'supply-detail-recovery-list';
  const showReveal = options.showReveal !== false;
  const dimRows = Array.isArray(options.dimRows) ? options.dimRows : [];
  const showDimDetails = options.showDimDetails && dimRows.length > 0;
  const compactLargeNumbers = options.compactLargeNumbers === true;
  const excludedKeys = options.excludedKeys instanceof Set ? options.excludedKeys : new Set();
  const usageRates = options.usageRates && typeof options.usageRates === 'object' ? options.usageRates : {};
  const dimUsageRate = Object.prototype.hasOwnProperty.call(usageRates, DIM_SOUL_EXCLUDE_KEY)
    ? Math.max(0, Math.min(100, Number(usageRates[DIM_SOUL_EXCLUDE_KEY]) || 0))
    : ((excludedKeys.has(DIM_SOUL_EXCLUDE_KEY) || dimRows.some((row) => excludedKeys.has(String(row?.key || '').trim()))) ? 0 : 100);
  const effectiveDimSoulValue = dimRows.reduce((sum, row) => (
    sum + Number(row.valueTotal || 0) * (getSoulUsageRate(row, excludedKeys, usageRates) / 100)
  ), 0);
  return `
    <div class="${escapeHtml(listClass)}">
      ${gearRows.map((row) => {
        const usageRate = getSoulUsageRate(row, excludedKeys, usageRates);
        const effectiveValue = Number(row.valueTotal || 0) * (usageRate / 100);
        return `
        <span class="supply-detail-recovery-item ${escapeHtml(getSoulRecoveryRowClass(row))}${usageRate <= 0 ? ' is-excluded' : ''}">
          <span class="supply-detail-recovery-label">${escapeHtml(row.label.replace(' 소울', ''))}</span>
          <span class="supply-detail-recovery-count">${escapeHtml(formatSoulRecoveryNumber(row.expectedCount, compactLargeNumbers))}개</span>
          ${showReveal ? `<span class="supply-detail-recovery-reveal">${usageRate <= 0 ? '계시 제외' : `${escapeHtml(formatSoulRecoveryNumber(effectiveValue, compactLargeNumbers))}계시${usageRate < 100 ? ` (${escapeHtml(formatSoulRecoveryNumber(usageRate, false))}%)` : ''}`}</span>` : ''}
        </span>
      `;
      }).join('')}
      ${showDimDetails ? `
        <details class="supply-detail-recovery-details">
          <summary class="supply-detail-recovery-item rarity-dim${dimUsageRate <= 0 ? ' is-excluded' : ''}">
            <span class="supply-detail-recovery-label">미광</span>
            <span class="supply-detail-recovery-count">${escapeHtml(formatSoulRecoveryNumber(dimSoulCount, compactLargeNumbers))}개</span>
            ${showReveal ? `<span class="supply-detail-recovery-reveal">${dimUsageRate <= 0 ? '계시 제외' : `${escapeHtml(formatSoulRecoveryNumber(dimRows.length ? effectiveDimSoulValue : dimSoulValue * (dimUsageRate / 100), compactLargeNumbers))}계시`}</span>` : ''}
          </summary>
          <div class="supply-detail-recovery-detail-list">
            ${dimRows.map((row) => {
              const decisionCount = Number(row.tunerExpectedCount || 0) + Number(row.tunerHellExpectedCount || 0);
              const usageRate = getSoulUsageRate(row, excludedKeys, usageRates);
              const effectiveValue = Number(row.valueTotal || 0) * (usageRate / 100);
              return `
                <span class="supply-detail-recovery-item ${escapeHtml(getSoulRecoveryRowClass(row))}${usageRate <= 0 ? ' is-excluded' : ''}">
                  <span class="supply-detail-recovery-label">${escapeHtml(getTunerDecisionLabel(row))}</span>
                  <span class="supply-detail-recovery-count">${escapeHtml(formatSoulRecoveryNumber(decisionCount, compactLargeNumbers))}개</span>
                  ${showReveal ? `<span class="supply-detail-recovery-reveal">${usageRate <= 0 ? '계시 제외' : `${escapeHtml(formatSoulRecoveryNumber(effectiveValue, compactLargeNumbers))}계시`}</span>` : ''}
                </span>
              `;
            }).join('')}
          </div>
        </details>
      ` : `
        <span class="supply-detail-recovery-item rarity-dim">
          <span class="supply-detail-recovery-label">미광</span>
          <span class="supply-detail-recovery-count">${escapeHtml(formatSoulRecoveryNumber(dimSoulCount, compactLargeNumbers))}개</span>
          ${showReveal ? `<span class="supply-detail-recovery-reveal">${escapeHtml(formatSoulRecoveryNumber(dimSoulValue, compactLargeNumbers))}계시</span>` : ''}
        </span>
      `}
    </div>
  `;
}

  Object.assign(ctx.actions, {
    getSupplySheet3Row,
    formatSupplySheet3Cell,
    getSoulRecoveryRowClass,
    buildSoulRecoveryRowsMarkup,
    getEffectiveSoulRecoveryTotal,
  });
}
