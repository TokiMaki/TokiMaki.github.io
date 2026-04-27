import { createSupplyContentConfig } from '../data/supplyContentConfig.js';
import {
  SUPPLY_CHARACTER_FATIGUE_POTIONS,
  SUPPLY_CHARACTER_FATIGUE_PROFILES,
  SUPPLY_USAGE_CONSTANTS,
} from '../data/supplyConstants.js';
import {
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
} from '../logic/supplyCalculator.js';
import {
  applySelectedPercentile,
  calcCharacter,
  calcFragmentExpectation,
  calcNetCost,
} from '../logic/hellCalculator.js';
import {
  escapeHtml,
  fmtCost,
  fmtDecimal,
  fmtInt,
  fmtRevelation,
  getServerLabel,
} from '../logic/formatters.js';
import {
  bindCharacterAvatars,
  getCharacterAvatarMarkup,
  getCharacterLabel,
  getCharacterNameOnly,
  getCharacterPortraitMarkup,
} from './characterPresentation.js';
import { createLegacyDomRefs } from './domRefs.js';
import { normalizeCharacters } from './hellCharacterData.js';
import { createNamespacedCache } from './storageCache.js';
import {
  ACTIVE_TAB_STORAGE_KEY,
  API_BASE,
  CHARACTER_CACHE_BACKUP_KEY,
  CHARACTER_CACHE_PREFIX,
  DEV_MODE_STORAGE_KEY,
  STORAGE_NAMESPACE_KEY,
  STORAGE_SCOPE_LABEL,
  SUPPLY_CACHE_BACKUP_KEY,
  SUPPLY_CACHE_PREFIX,
} from './storageKeys.js';

// 기존 단일 HTML의 <script> 내용을 React 마운트 시점에 실행한다.
// 1차 목표는 기능 보존이다. 이후 계산/상태/UI를 단계적으로 React 컴포넌트로 분리한다.
export function initDnfHellTool() {
  const els = createLegacyDomRefs();
  
      // Core constants and mutable app state
      let debounceTimer = null;
      let lastResults = [];
      let activeCharacters = null;
      let activeCharactersSource = '로드 대기';
      let hasCharacterData = false;
      let storageNamespace = '';
      let isDevMode = false;
      let sortState = { key: 'selectedHellCost', direction: 'asc' };
      let supplyCharacters = [];
      let supplyCharactersSource = '로드 대기';
      let supplyActiveCharacterKey = '';
      let supplySelectedCharacterKeys = new Set();
      let supplySelectionAnchorKey = '';
  
      const SORT_CONFIG = {
        name: {
          type: 'string',
          getValue: (result) => getCharacterLabel(result),
        },
        selectedHellCost: {
          type: 'number',
          getValue: (result) => result.selectedHellCost,
        },
        craftCost: {
          type: 'number',
          getValue: (result) => result.craftBest.craftCost,
        },
        ratio: {
          type: 'number',
          getValue: (result) => result.ratio,
        },
      };
  
      // -------------------------------------------------------------------------
      // Shared formatting and browser-state helpers
      // -------------------------------------------------------------------------
  
      function getSelectedPercentile() {
        return Math.max(1, Math.min(99, Number(els.percentileNumber.value) || 66));
      }
  
      function readDevModePreference() {
        try {
          return localStorage.getItem(DEV_MODE_STORAGE_KEY) === '1';
        } catch {
          return false;
        }
      }
  
      function writeDevModePreference(enabled) {
        try {
          localStorage.setItem(DEV_MODE_STORAGE_KEY, enabled ? '1' : '0');
        } catch {
          // 저장 실패는 무시한다.
        }
      }
  
      function getCriterionDisplay(percentile) {
        return isDevMode ? `P${percentile}` : `${percentile}`;
      }
  
      function refreshModeLabels(selectedPercentile = getSelectedPercentile()) {
        els.percentileSectionLabel.textContent = isDevMode ? '기본 퍼센타일 기준' : '상위';
        els.percentileNumberLabel.textContent = isDevMode ? '직접 입력' : '숫자 입력';
        els.selectedPercentileCardLabel.textContent = isDevMode ? '선택 퍼센타일' : '상위';
        els.percentileLabel.textContent = getCriterionDisplay(selectedPercentile);
        els.selectedPercentileCard.textContent = getCriterionDisplay(selectedPercentile);
        if (els.devModeToggle) {
          els.devModeToggle.textContent = isDevMode ? '사용자 모드' : '개발자 모드';
          els.devModeToggle.setAttribute('aria-pressed', isDevMode ? 'true' : 'false');
        }
      }
  
      function setDevMode(enabled) {
        isDevMode = Boolean(enabled);
        document.body.classList.toggle('dev-mode', isDevMode);
        writeDevModePreference(isDevMode);
        refreshModeLabels();
        if (lastResults.length) {
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
        if (storageNamespace) {
          return storageNamespace;
        }
  
        try {
          const existing = localStorage.getItem(STORAGE_NAMESPACE_KEY);
          if (existing) {
            storageNamespace = existing;
            return storageNamespace;
          }
  
          storageNamespace = generateStorageNamespace();
          localStorage.setItem(STORAGE_NAMESPACE_KEY, storageNamespace);
          return storageNamespace;
        } catch {
          storageNamespace = storageNamespace || generateStorageNamespace();
          return storageNamespace;
        }
      }
  
      const characterCache = createNamespacedCache({
        prefix: CHARACTER_CACHE_PREFIX,
        backupKey: CHARACTER_CACHE_BACKUP_KEY,
        getNamespace: getStorageNamespace,
      });

      const supplyCache = createNamespacedCache({
        prefix: SUPPLY_CACHE_PREFIX,
        backupKey: SUPPLY_CACHE_BACKUP_KEY,
        getNamespace: getStorageNamespace,
      });
  
      // -------------------------------------------------------------------------
      // Character image and supply-calculation configuration
      // -------------------------------------------------------------------------
  
      // Character image and supply-calculation configuration lives in src/data/supplyConstants.js.
  
      // -------------------------------------------------------------------------
      // Revelation management date, fatigue, and supply math
      // -------------------------------------------------------------------------
  
  
  
  
  
  
  
  
  
  
  
  
  
  
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
  
      function buildSoulRecoveryRowsMarkup(gearRows, dimSoulCount, dimSoulValue, options = {}) {
        const listClass = options.listClass || 'supply-detail-recovery-list';
        const showReveal = options.showReveal !== false;
        return `
          <div class="${escapeHtml(listClass)}">
            ${gearRows.map((row) => `
              <span class="supply-detail-recovery-item ${escapeHtml(getSoulRecoveryRowClass(row))}">
                <span class="supply-detail-recovery-label">${escapeHtml(row.label.replace(' 소울', ''))}</span>
                <span class="supply-detail-recovery-count">${escapeHtml(fmtDecimal(row.expectedCount, 1))}개</span>
                ${showReveal ? `<span class="supply-detail-recovery-reveal">${escapeHtml(fmtDecimal(row.valueTotal, 1))}계시</span>` : ''}
              </span>
            `).join('')}
            <span class="supply-detail-recovery-item rarity-dim">
              <span class="supply-detail-recovery-label">미광</span>
              <span class="supply-detail-recovery-count">${escapeHtml(fmtDecimal(dimSoulCount, 1))}개</span>
              ${showReveal ? `<span class="supply-detail-recovery-reveal">${escapeHtml(fmtDecimal(dimSoulValue, 1))}계시</span>` : ''}
            </span>
          </div>
        `;
      }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
      const {
        SUPPLY_CONTENT_GROUPS,
        SUPPLY_SHEET3_ROWS,
        SUPPLY_SHEET3_ROW_MAP,
        SUPPLY_CONTENT_TYPE_ORDER,
        SUPPLY_CONTENT_TYPE_LABELS,
        SUPPLY_CONTENT_ORDER,
        SUPPLY_CONTENT_LABELS,
        SUPPLY_CONTENT_SHORT_LABELS,
        SUPPLY_PRESET_DEFINITIONS,
        SUPPLY_ADVANCED_KEYS,
      } = createSupplyContentConfig({
        calcSupplyParts,
        calcDailyContentWeeklySupply,
      });
  
      // Character presentation helpers live in src/legacy/characterPresentation.js.

      // -------------------------------------------------------------------------
      // Hell calculator sorting, cache, and rendering
      // -------------------------------------------------------------------------
  
      function compareForSort(a, b, config) {
        const av = config.getValue(a);
        const bv = config.getValue(b);
  
        if (config.type === 'string') {
          return String(av).localeCompare(String(bv), 'ko-KR');
        }
  
        return Number(av) - Number(bv);
      }
  
      function getSortedResults(results) {
        const config = SORT_CONFIG[sortState.key] ?? SORT_CONFIG.selectedHellCost;
        const sorted = [...results].sort((a, b) => {
          const primary = compareForSort(a, b, config);
          if (primary !== 0) {
            return sortState.direction === 'asc' ? primary : -primary;
          }
  
          return getCharacterLabel(a).localeCompare(getCharacterLabel(b), 'ko-KR');
        });
  
        return sorted;
      }
  
      function updateSortIndicators() {
        els.sortButtons.forEach((button) => {
          const isActive = button.dataset.sortKey === sortState.key;
          const arrow = button.querySelector('.sort-arrow');
          button.classList.toggle('active', isActive);
          if (arrow) {
            arrow.textContent = isActive ? (sortState.direction === 'asc' ? '▲' : '▼') : '';
          }
  
          const th = button.closest('th');
          if (th) {
            th.setAttribute('aria-sort', isActive ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none');
          }
        });
      }
  
      function setSortState(key) {
        if (!SORT_CONFIG[key]) return;
  
        if (sortState.key === key) {
          sortState = {
            key,
            direction: sortState.direction === 'asc' ? 'desc' : 'asc',
          };
        } else {
          sortState = {
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
        if (Array.isArray(activeCharacters)) {
          return activeCharacters;
        }
  
        const parsed = JSON.parse(els.charactersJson.value || '[]');
        return normalizeCharacters(parsed);
      }
  
      function setCharacterData(characters, sourceLabel) {
        activeCharacters = normalizeCharacters(characters);
        activeCharactersSource = `${STORAGE_SCOPE_LABEL} · ${sourceLabel}`;
        hasCharacterData = activeCharacters.length > 0;
        const previewText = JSON.stringify(activeCharacters, null, 2);
        els.charactersJson.value = previewText;
        els.searchStatus.textContent = `${activeCharactersSource} · ${activeCharacters.length.toLocaleString('ko-KR')}캐릭`;
        characterCache.writeText(previewText);
      }
  
      function clearCharacterData(message = '캐릭터를 추가해 주세요.') {
        activeCharacters = [];
        activeCharactersSource = `${STORAGE_SCOPE_LABEL} · 목록 비움`;
        hasCharacterData = false;
        els.charactersJson.value = '[]';
        els.searchStatus.textContent = message;
        characterCache.removeText();
        clearRenderedResults(message);
      }
  
      function clearRenderedResults(message = '캐릭터를 추가해 주세요.') {
        lastResults = [];
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
        if (els.fragmentNeedCost) els.fragmentNeedCost.textContent = '-';
        if (els.fragmentNeedPieces) els.fragmentNeedPieces.textContent = '-';
        if (els.fragmentNeedBreakdown) els.fragmentNeedBreakdown.textContent = '-';
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
  
      // -------------------------------------------------------------------------
      // Revelation management cache and data normalization
      // -------------------------------------------------------------------------
  
      function normalizeSupplyCharacters(parsed) {
        if (!Array.isArray(parsed)) {
          throw new Error('캐릭터 데이터는 배열이어야 합니다.');
        }
  
        return parsed.map((character, characterIndex) => {
          const serverId = String(character.serverId ?? '').trim().toLowerCase();
          const characterId = String(character.characterId ?? '').trim();
          const name = String(character.name ?? character.characterName ?? character.displayName ?? `캐릭 ${characterIndex + 1}`);
          const fame = Number(String(character.fame ?? 0).replace(/,/g, ''));
          const jobName = String(character.jobName ?? character.job_name ?? '').trim();
          const jobGrowName = String(character.jobGrowName ?? character.job_grow_name ?? '').trim();
          const rawRunHell = character.runHell ?? character.hellEnabled ?? character.supplyHellEnabled;
          const runHell = rawRunHell === undefined ? true : Boolean(rawRunHell);
          const rawPcBangBonus = character.pcBangBonus ?? character.pcBang ?? character.pcBangHell ?? character.hellPcBangBonus;
          const rawAradPassBonus = character.aradPassBonus ?? character.aradPass ?? character.aradPassHell ?? character.hellAradPassBonus;
          const pcBangBonus = rawPcBangBonus === undefined ? false : Boolean(rawPcBangBonus);
          const aradPassBonus = rawAradPassBonus === undefined ? false : Boolean(rawAradPassBonus);
          const fatigueMode = getSupplyCharacterFatigueMode(character);
          const fatiguePotionKeys = getSupplyCharacterFatiguePotionKeys(character);
          const fatiguePotionFoldOpen = getSupplyCharacterFatiguePotionFoldOpen(character);
          const selectedContentKeys = normalizeSupplySelection(
            character.selectedContentKeys ?? character.selectedSupplyKeys ?? character.selectedAdvancedDungeonKeys ?? [],
            fame
          );
          const key = String(
            character.key
            ?? (serverId && characterId ? `${serverId}:${characterId}` : '')
            ?? name
          ).trim() || name;
  
          return {
            key,
            serverId,
            characterId,
            name,
            fame: Number.isFinite(fame) ? fame : 0,
            jobName,
            jobGrowName,
            runHell,
            pcBangBonus,
            aradPassBonus,
            fatigueMode,
            fatiguePotionKeys,
            fatiguePotionFoldOpen,
            selectedContentKeys,
            selectedSupplyKeys: selectedContentKeys,
            selectedAdvancedDungeonKeys: selectedContentKeys,
          };
        });
      }
  
      function mergeSupplyCharacterSelection(character, previousCharacter = null) {
        const fame = Number(character?.fame || previousCharacter?.fame || 0);
        const rawRunHell = previousCharacter?.runHell
          ?? previousCharacter?.hellEnabled
          ?? previousCharacter?.supplyHellEnabled
          ?? character?.runHell
          ?? character?.hellEnabled
          ?? character?.supplyHellEnabled;
        const runHell = rawRunHell === undefined ? true : Boolean(rawRunHell);
        const rawPcBangBonus = previousCharacter?.pcBangBonus
          ?? previousCharacter?.pcBang
          ?? previousCharacter?.pcBangHell
          ?? previousCharacter?.hellPcBangBonus
          ?? character?.pcBangBonus
          ?? character?.pcBang
          ?? character?.pcBangHell
          ?? character?.hellPcBangBonus;
        const rawAradPassBonus = previousCharacter?.aradPassBonus
          ?? previousCharacter?.aradPass
          ?? previousCharacter?.aradPassHell
          ?? previousCharacter?.hellAradPassBonus
          ?? character?.aradPassBonus
          ?? character?.aradPass
          ?? character?.aradPassHell
          ?? character?.hellAradPassBonus;
        const pcBangBonus = rawPcBangBonus === undefined ? false : Boolean(rawPcBangBonus);
        const aradPassBonus = rawAradPassBonus === undefined ? false : Boolean(rawAradPassBonus);
        const fatigueMode = getSupplyCharacterFatigueMode(previousCharacter || character);
        const fatiguePotionKeys = getSupplyCharacterFatiguePotionKeys(previousCharacter || character);
        const fatiguePotionFoldOpen = getSupplyCharacterFatiguePotionFoldOpen(previousCharacter || character);
        const existingKeys = previousCharacter?.selectedContentKeys
          ?? previousCharacter?.selectedSupplyKeys
          ?? previousCharacter?.selectedAdvancedDungeonKeys
          ?? character?.selectedContentKeys
          ?? character?.selectedSupplyKeys
          ?? character?.selectedAdvancedDungeonKeys
          ?? [];
        const selectedContentKeys = normalizeSupplySelection(existingKeys, fame);
  
        return {
          ...character,
          runHell,
          pcBangBonus,
          aradPassBonus,
          fatigueMode,
          fatiguePotionKeys,
          fatiguePotionFoldOpen,
          selectedContentKeys,
          selectedSupplyKeys: selectedContentKeys,
          selectedAdvancedDungeonKeys: selectedContentKeys,
        };
      }
  
      function createSupplyEntry(group, source, available) {
        const boundSupply = Number(source.boundSupply ?? 0);
        const accountSupply = Number(source.accountSupply ?? source.supply ?? 0);
        const totalSupply = Number(source.totalSupply ?? (boundSupply + accountSupply));
        const supplyParts = normalizeSupplyParts(source.supplyParts, accountSupply);
        return {
          key: source.key,
          groupKey: group.key,
          groupLabel: group.label,
          label: source.label,
          tierLabel: source.tierLabel || source.label,
          contentType: group.contentType || 'advanced',
          minFame: source.minFame,
          supply: totalSupply,
          boundSupply,
          accountSupply,
          totalSupply,
          supplyParts,
          advancedDungeonKey: group.advancedDungeonKey || '',
          accountLimit: Number(group.accountLimit || 0),
          accountPoolKey: group.accountPoolKey || '',
          accountPoolLabel: group.accountPoolLabel || '',
          available,
        };
      }
  
      function getSupplyGroupEntryFame(group) {
        if (Array.isArray(group.tiers) && group.tiers.length > 0) {
          const fameValues = group.tiers
            .map((tier) => Number(tier.minFame || 0))
            .filter((value) => Number.isFinite(value));
          if (fameValues.length) {
            return Math.min(...fameValues);
          }
        }
        return Number(group.minFame || 0);
      }
  
      function isSupplyGroupUnlocked(group, fame) {
        return isSupplyGroupDateUnlocked(group) && Number(fame) >= getSupplyGroupEntryFame(group);
      }
  
      function getSupplyGroupKeyByEntryKey(entryKey) {
        const value = String(entryKey || '').trim();
        if (!value) return '';
        for (const group of SUPPLY_CONTENT_GROUPS) {
          if (group.key === value) {
            return group.key;
          }
          if (Array.isArray(group.tiers) && group.tiers.some((tier) => tier.key === value)) {
            return group.key;
          }
        }
        return '';
      }
  
      function isSupplyGroupDateUnlocked(group) {
        const unlockDate = String(group?.unlockDate || '').trim();
        if (!unlockDate) return true;
  
        const unlockTime = Date.parse(unlockDate);
        if (!Number.isFinite(unlockTime)) return true;
  
        return Date.now() >= unlockTime;
      }
  
      function getSupplyEntryOptionsForGroup(group, fame, includeUnavailable = false) {
        const numericFame = Number(fame) || 0;
        if (!Array.isArray(group.tiers) || group.tiers.length === 0) {
          const available = numericFame >= Number(group.minFame || 0);
          const entry = createSupplyEntry(group, {
            key: group.key,
            label: group.label,
            tierLabel: group.label,
            minFame: Number(group.minFame || 0),
            boundSupply: Number(group.boundSupply || 0),
            accountSupply: Number(group.accountSupply ?? group.supply ?? 0),
            totalSupply: Number(group.totalSupply ?? group.supply ?? 0),
            supplyParts: group.supplyParts,
          }, available);
          return available || includeUnavailable ? [entry] : [];
        }
  
        if ((group.contentType || 'advanced') !== 'advanced') {
          const available = isSupplyGroupUnlocked(group, numericFame);
          const entries = group.tiers.map((tier) => createSupplyEntry(group, {
            key: `${group.key}:${tier.key}`,
            label: `${group.label} - ${tier.label}`,
            tierLabel: tier.label,
            minFame: Number(tier.minFame || 0),
            boundSupply: Number(tier.boundSupply || 0),
            accountSupply: Number(tier.accountSupply ?? (tier.supply || 0)),
            totalSupply: Number(tier.totalSupply ?? (tier.supply || 0)),
            supplyParts: tier.supplyParts,
          }, available));
          return available || includeUnavailable ? entries : [];
        }
  
        const entries = group.tiers
          .map((tier) => {
            const available = numericFame >= Number(tier.minFame || 0);
            return createSupplyEntry(group, {
              key: `${group.key}:${tier.key}`,
              label: `${group.label} - ${tier.label}`,
              tierLabel: tier.label,
              minFame: Number(tier.minFame || 0),
              boundSupply: Number(tier.boundSupply || 0),
              accountSupply: Number(tier.accountSupply ?? (tier.supply || 0)),
              totalSupply: Number(tier.totalSupply ?? (tier.supply || 0)),
              supplyParts: tier.supplyParts,
            }, available);
          })
          .filter((entry) => includeUnavailable || entry.available);
  
        return entries;
      }
  
      function getSupplyEntryOptionsForGroupByThreshold(group, fame, includeUnavailable = false) {
        const numericFame = Number(fame) || 0;
        if (!Array.isArray(group.tiers) || group.tiers.length === 0) {
          const available = numericFame >= Number(group.minFame || 0);
          const entry = createSupplyEntry(group, {
            key: group.key,
            label: group.label,
            tierLabel: group.label,
            minFame: Number(group.minFame || 0),
            supply: Number(group.supply || 0),
          }, available);
          return available || includeUnavailable ? [entry] : [];
        }
  
        const entries = group.tiers
          .map((tier) => {
            const available = numericFame >= Number(tier.minFame || 0);
            return createSupplyEntry(group, {
              key: `${group.key}:${tier.key}`,
              label: `${group.label} - ${tier.label}`,
              tierLabel: tier.label,
              minFame: Number(tier.minFame || 0),
              supply: Number(tier.supply || 0),
            }, available);
          })
          .filter((entry) => includeUnavailable || entry.available);
  
        return entries;
      }
  
      function getSupplyGroupRank(group) {
        if (Array.isArray(group.tiers) && group.tiers.length > 0) {
          return Math.max(...group.tiers.map((tier) => Number(tier.minFame || 0)));
        }
        return Number(group.minFame || 0);
      }
  
      function getSupplyEntryFameByKey(entryKey) {
        const key = String(entryKey || '').trim();
        if (!key) return 0;
  
        for (const group of SUPPLY_CONTENT_GROUPS) {
          if (group.key === key) {
            return getSupplyGroupRank(group);
          }
  
          if (Array.isArray(group.tiers)) {
            const tier = group.tiers.find((item) => item.key === key);
            if (tier) {
              return Number(tier.minFame || 0);
            }
          }
        }
  
        return 0;
      }
  
      function isSupplyHellEnabled(character) {
        return character?.runHell !== false;
      }
  
      function compareSupplyGroupsByFameDesc(left, right) {
        const fameDiff = getSupplyGroupRank(right) - getSupplyGroupRank(left);
        if (fameDiff !== 0) return fameDiff;
        const supplyLeft = Number(left.supply || 0);
        const supplyRight = Number(right.supply || 0);
        const supplyDiff = supplyRight - supplyLeft;
        if (supplyDiff !== 0) return supplyDiff;
        return String(left.label || '').localeCompare(String(right.label || ''), 'ko-KR');
      }
  
      function isSupplyGroupSelectable(group, fame) {
        if (!group) return false;
        if (Array.isArray(group.tiers) && group.tiers.length > 0) {
          return isSupplyGroupUnlocked(group, fame);
        }
        return Number(fame) >= Number(group.minFame || 0);
      }
  
      function getSupplyEntryForGroup(group, fame, includeUnavailable = false) {
        if (!includeUnavailable && !isSupplyGroupSelectable(group, fame)) {
          return null;
        }
        const entries = getSupplyEntryOptionsForGroupByThreshold(group, fame, includeUnavailable);
        if (!entries.length) return null;
        return [...entries].sort((a, b) => {
          const fameDiff = b.minFame - a.minFame;
          if (fameDiff !== 0) return fameDiff;
          const supplyDiff = b.supply - a.supply;
          if (supplyDiff !== 0) return supplyDiff;
          return a.label.localeCompare(b.label, 'ko-KR');
        })[0];
      }
  
      function getSupplyEntriesForFame(fame, includeUnavailable = false) {
        return SUPPLY_CONTENT_GROUPS
          .flatMap((group) => getSupplyEntryOptionsForGroup(group, fame, includeUnavailable))
          .sort((a, b) => {
            const typeDiff = SUPPLY_CONTENT_TYPE_ORDER.indexOf(a.contentType || 'advanced') - SUPPLY_CONTENT_TYPE_ORDER.indexOf(b.contentType || 'advanced');
            if (typeDiff !== 0) return typeDiff;
            const groupA = SUPPLY_CONTENT_GROUPS.find((group) => group.key === a.groupKey);
            const groupB = SUPPLY_CONTENT_GROUPS.find((group) => group.key === b.groupKey);
            const groupDiff = compareSupplyGroupsByFameDesc(groupA || a, groupB || b);
            if (groupDiff !== 0) return groupDiff;
            const fameDiff = b.minFame - a.minFame;
            if (fameDiff !== 0) return fameDiff;
            const supplyDiff = b.supply - a.supply;
            if (supplyDiff !== 0) return supplyDiff;
            return a.label.localeCompare(b.label, 'ko-KR');
          });
      }
  
      // -------------------------------------------------------------------------
      // Revelation management content catalog and selection rules
      // -------------------------------------------------------------------------
  
      // Supply content definitions live in src/data/supplyContentConfig.js.
  
      function getAvailableSupplyKeys(fame) {
        const allowed = [];
        for (const group of SUPPLY_CONTENT_GROUPS) {
          const entries = getSupplyEntryOptionsForGroup(group, fame, true);
          entries
            .filter((entry) => entry.available)
            .forEach((entry) => allowed.push(entry.key));
        }
  
        return allowed;
      }
  
      function resolveSupplySelectionKey(key, fame) {
        const value = String(key || '').trim();
        if (!value) return '';
  
        const directEntry = getSupplyEntriesForFame(fame, true).find((entry) => entry.key === value || entry.key.endsWith(`:${value}`));
        if (directEntry) {
          return directEntry.available ? directEntry.key : '';
        }
  
        const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === value);
        if (!group) {
          return '';
        }
  
        const bestEntry = getSupplyEntryForGroup(group, fame);
        return bestEntry ? bestEntry.key : '';
      }
  
      function normalizeSupplySelection(keys, fame) {
        const allowedKeys = new Set(getAvailableSupplyKeys(fame));
        const normalized = [];
        for (const key of Array.isArray(keys) ? keys : []) {
          const value = resolveSupplySelectionKey(key, fame);
          if (value && allowedKeys.has(value) && !normalized.includes(value)) {
            normalized.push(value);
          }
        }
  
        if (!normalized.length) {
          return getDefaultSupplySelection(fame);
        }
  
        const next = [];
        let advancedCount = 0;
        let legionCount = 0;
        const selectedGroups = new Set();
  
        for (const key of normalized) {
          if (!allowedKeys.has(key)) {
            continue;
          }
  
          const entry = getSupplyEntriesForFame(fame, true).find((item) => item.key === key);
          if (!entry) {
            continue;
          }
  
          if (selectedGroups.has(entry.groupKey)) {
            const existingIndex = next.findIndex((item) => {
              const existingEntry = getSupplyEntriesForFame(fame, true).find((candidate) => candidate.key === item);
              return existingEntry && existingEntry.groupKey === entry.groupKey;
            });
            if (existingIndex >= 0) {
              next.splice(existingIndex, 1, key);
            }
            continue;
          }
  
          if (SUPPLY_ADVANCED_KEYS.has(entry.groupKey)) {
            if (advancedCount >= 2) {
              continue;
            }
            advancedCount += 1;
          } else if (entry.contentType === 'legion') {
            if (legionCount >= 1) {
              continue;
            }
            legionCount += 1;
          }
  
          next.push(key);
          selectedGroups.add(entry.groupKey);
        }
  
        return next;
      }
  
      function getDefaultSupplySelection(fame) {
        return buildDefaultSupplySelectionForFame(fame);
      }
  
      function buildDefaultSupplySelectionForFame(fame, options = {}) {
        const excludedPoolKeys = new Set(
          Array.isArray(options.excludedPoolKeys)
            ? options.excludedPoolKeys.map((key) => String(key || '').trim()).filter(Boolean)
            : []
        );
        const respectAccountLimits = options.respectAccountLimits !== false;
        const selected = [];
        let advancedCount = 0;
        let legionCount = 0;
  
        for (const group of [...SUPPLY_CONTENT_GROUPS].sort(compareSupplyGroupsByFameDesc)) {
          const groupPoolKey = String(group.accountPoolKey || group.key || '').trim();
          if (groupPoolKey && excludedPoolKeys.has(groupPoolKey)) {
            continue;
          }
  
          const bestEntry = getSupplyEntryForGroup(group, fame);
          if (!bestEntry) {
            continue;
          }
  
          const groupLimit = Math.max(0, Number(group.accountLimit || 0));
          if (respectAccountLimits && groupLimit > 0) {
            if (groupPoolKey && getSupplyAccountSelectionCount(groupPoolKey) >= groupLimit) {
              continue;
            }
          }
  
          if (bestEntry.contentType === 'advanced') {
            if (advancedCount >= 2) continue;
            advancedCount += 1;
          } else if (bestEntry.contentType === 'legion') {
            if (legionCount >= 1) continue;
            legionCount += 1;
          }
  
          selected.push(bestEntry.key);
        }
  
        return selected;
      }
  
      function enforceSupplyAccountLimits(characters) {
        if (!Array.isArray(characters) || characters.length === 0) {
          return characters;
        }
  
        const nextCharacters = characters.map((character) => ({ ...character }));
        const rosterOrder = nextCharacters
          .map((character, index) => ({
            index,
            fame: Number(character?.fame || 0),
            label: getSupplyRosterLabel(character),
            runHell: Boolean(character?.runHell),
          }))
          .sort((a, b) => {
            const hellDiff = Number(b.runHell) - Number(a.runHell);
            if (hellDiff !== 0) return hellDiff;
            const fameDiff = b.fame - a.fame;
            if (fameDiff !== 0) return fameDiff;
            const labelDiff = a.label.localeCompare(b.label, 'ko-KR');
            if (labelDiff !== 0) return labelDiff;
            return a.index - b.index;
          });
  
        for (const group of SUPPLY_CONTENT_GROUPS) {
          const groupLimit = Math.max(0, Number(group.accountLimit || 0));
          const poolKey = String(group.accountPoolKey || group.key || '').trim();
          if (!groupLimit || !poolKey) {
            continue;
          }
  
          let kept = 0;
          for (const { index } of rosterOrder) {
            const character = nextCharacters[index];
            const selectedKeys = normalizeSupplySelection(
              character.selectedContentKeys ?? character.selectedSupplyKeys ?? character.selectedAdvancedDungeonKeys ?? [],
              character.fame
            );
            const currentEntries = getSupplyEntriesForFame(character.fame, true);
            const hasPoolEntry = currentEntries.some((entry) => {
              const entryPoolKey = String(entry.accountPoolKey || entry.groupKey || entry.key || '').trim();
              return selectedKeys.includes(entry.key) && entryPoolKey === poolKey;
            });
  
            if (!hasPoolEntry) {
              continue;
            }
  
            if (kept < groupLimit) {
              kept += 1;
              continue;
            }
  
            const filteredKeys = selectedKeys.filter((key) => {
              const entry = currentEntries.find((item) => item.key === key);
              return !entry || String(entry.accountPoolKey || entry.groupKey || entry.key || '').trim() !== poolKey;
            });
  
            const nextKeys = filteredKeys.length > 0
              ? normalizeSupplySelection(filteredKeys, character.fame)
              : buildDefaultSupplySelectionForFame(character.fame, {
                  excludedPoolKeys: [poolKey],
                  respectAccountLimits: false,
                });
  
            nextCharacters[index] = {
              ...character,
              selectedContentKeys: nextKeys,
              selectedSupplyKeys: nextKeys,
              selectedAdvancedDungeonKeys: nextKeys,
            };
          }
        }
  
        return nextCharacters;
      }
  
      function getSupplyPresetAnchorFame(presetKey) {
        const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
        if (!preset) {
          return 0;
        }
  
        if (preset.anchorFame) {
          return Number(preset.anchorFame) || 0;
        }
  
        if (preset.anchorKey) {
          return getSupplyEntryFameByKey(preset.anchorKey);
        }
  
        let anchorFame = 0;
        for (const groupKey of preset.advancedKeys || []) {
          const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === groupKey);
          if (!group) continue;
          const fame = getSupplyGroupRank(group);
          if (fame > anchorFame) {
            anchorFame = fame;
          }
        }
        return anchorFame;
      }
  
      function getSupplyPresetRequiredFame(presetKey) {
        const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
        if (!preset) {
          return 0;
        }
  
        if (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.length > 0) {
          return Math.max(...preset.forcedSelectionKeys.map((key) => getSupplyEntryFameByKey(key)));
        }
  
        if (preset.anchorFame) {
          return Number(preset.anchorFame) || 0;
        }
  
        if (preset.anchorKey) {
          return getSupplyEntryFameByKey(preset.anchorKey);
        }
  
        return getSupplyPresetAnchorFame(preset.key);
      }
  
      function isSupplyPresetAvailable(presetKey, fame) {
        const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
        if (!preset) return false;
  
        const numericFame = Number(fame) || 0;
        const requiredFame = getSupplyPresetRequiredFame(preset.key);
        if (requiredFame > 0 && numericFame < requiredFame) {
          return false;
        }
  
        const relatedGroupKeys = new Set();
        if (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.length > 0) {
          preset.forcedSelectionKeys.forEach((key) => {
            const groupKey = getSupplyGroupKeyByEntryKey(key);
            if (groupKey) relatedGroupKeys.add(groupKey);
          });
        }
        if (preset.anchorKey) {
          const groupKey = getSupplyGroupKeyByEntryKey(preset.anchorKey);
          if (groupKey) relatedGroupKeys.add(groupKey);
        }
  
        for (const groupKey of relatedGroupKeys) {
          const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === groupKey);
          if (group && !isSupplyGroupUnlocked(group, numericFame)) {
            return false;
          }
        }
  
        return true;
      }
  
      function updateSupplyPresetButtonStates(fame) {
        const numericFame = Number(fame) || 0;
        els.supplyPresetButtons.forEach((button) => {
          const presetKey = String(button.dataset.supplyPreset || '').trim();
          const requiredFame = getSupplyPresetRequiredFame(presetKey);
          const available = isSupplyPresetAvailable(presetKey, numericFame);
          button.disabled = !available;
          button.setAttribute('aria-disabled', available ? 'false' : 'true');
          const parts = [];
          if (presetKey === 'default-selection') {
            parts.push('명성 기준 기본 선택');
          }
          if (requiredFame > 0) {
            parts.push(`명성 ${fmtInt(requiredFame)} 이상`);
          }
          const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
          const requiresApocalypse = !!preset && (
            preset.key.includes('apocalypse')
            || (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.some((key) => String(key).startsWith('apocalypse:')))
          );
          if (requiresApocalypse) {
            const apocalypseGroup = SUPPLY_CONTENT_GROUPS.find((item) => item.key === 'apocalypse');
            if (apocalypseGroup && !isSupplyGroupDateUnlocked(apocalypseGroup)) {
              parts.unshift('4월 23일 해금');
            }
          }
          button.title = parts.join(' / ');
        });
      }
  
      function applySupplyForcedSelections(keys, fame, forcedSelectionKeys) {
        const currentKeys = normalizeSupplySelection(keys, fame);
        const entries = getSupplyEntriesForFame(fame, true);
        const entryMap = new Map(entries.map((entry) => [entry.key, entry]));
        const forcedEntries = (Array.isArray(forcedSelectionKeys) ? forcedSelectionKeys : [])
          .map((key) => entryMap.get(String(key || '').trim()))
          .filter(Boolean);
        const forcedGroups = new Set(forcedEntries.map((entry) => entry.groupKey));
  
        let next = currentKeys.filter((key) => {
          const entry = entryMap.get(key);
          return !entry || !forcedGroups.has(entry.groupKey);
        });
  
        for (const forcedKey of forcedSelectionKeys || []) {
          const key = String(forcedKey || '').trim();
          const entry = entryMap.get(key);
          if (!entry || !entry.available) continue;
          if (!next.includes(key)) {
            next.push(key);
          }
        }
  
        if (!next.length) {
          return buildDefaultSupplySelectionForFame(fame);
        }
  
        return normalizeSupplySelection(next, fame);
      }
  
      function getSupplyEntryDisplayLabel(entry) {
        if (!entry) return '';
        const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === entry.groupKey);
        if (!group) {
          return String(entry.label || '').trim();
        }
  
        const shortGroupLabel = SUPPLY_CONTENT_SHORT_LABELS[group.key] || group.label;
        if (Array.isArray(group.tiers) && group.tiers.length > 0) {
          const tierLabel = String(entry.tierLabel || entry.label || '').trim();
          if (group.key === 'nabel') {
            return tierLabel || shortGroupLabel;
          }
          if ((entry.contentType || group.contentType || 'advanced') === 'raid' || group.key === 'apocalypse') {
            return tierLabel.split('/').pop().trim() || shortGroupLabel;
          }
          if (group.key === 'venus') {
            return tierLabel || shortGroupLabel;
          }
          return tierLabel ? `${shortGroupLabel} ${tierLabel}` : shortGroupLabel;
        }
  
        return shortGroupLabel;
      }
  
      function getSupplyEntryDisplayMarkup(entry) {
        const label = getSupplyEntryDisplayLabel(entry);
        if (!label) return '';
        const fameLabel = fmtInt(Number(entry?.minFame || 0));
        return `
          <span class="supply-check-item-label">
            <span class="supply-check-item-name">${escapeHtml(label)}</span>
            <span class="supply-check-item-fame">${escapeHtml(fameLabel)}</span>
          </span>
        `;
      }
  
      function getSupplyRosterLabel(character) {
        return getCharacterNameOnly(character) || getCharacterLabel(character);
      }
  
      function getSupplyPresetResolvedKeys(preset, fame) {
        if (!preset) return [];
  
        if (Array.isArray(preset.advancedKeys) && preset.advancedKeys.length > 0) {
          const keys = [];
          for (const groupKey of preset.advancedKeys) {
            const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === groupKey);
            if (!group) return [];
            const entry = getSupplyEntryForGroup(group, fame);
            if (!entry) return [];
            keys.push(entry.key);
          }
          return keys.sort();
        }
  
        if (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.length > 0) {
          const keys = [];
          for (const forcedKey of preset.forcedSelectionKeys) {
            const resolvedKey = resolveSupplySelectionKey(forcedKey, fame);
            if (!resolvedKey) return [];
            keys.push(resolvedKey);
          }
          return keys.sort();
        }
  
        if (preset.anchorKey) {
          const resolvedKey = resolveSupplySelectionKey(preset.anchorKey, fame);
          return resolvedKey ? [resolvedKey] : [];
        }
  
        return [];
      }
  
      function getSupplyRosterTagLabel(character) {
        const fame = Number(character?.fame || 0);
        const selectedKeys = normalizeSupplySelection(
          character?.selectedContentKeys ?? character?.selectedSupplyKeys ?? character?.selectedAdvancedDungeonKeys ?? [],
          fame
        );
        if (!selectedKeys.length) {
          return '기본 선택';
        }
  
        const selectedEntries = getSupplyEntriesForFame(fame, true).filter((entry) => selectedKeys.includes(entry.key));
        const selectedAdvancedEntries = selectedEntries.filter((entry) => (entry.contentType || 'advanced') === 'advanced');
  
        for (const preset of SUPPLY_PRESET_DEFINITIONS) {
          if (preset.key === 'default-selection') {
            continue;
          }
  
          const presetKeys = getSupplyPresetResolvedKeys(preset, fame);
          if (!presetKeys.length) {
            continue;
          }
  
          if (Array.isArray(preset.advancedKeys) && preset.advancedKeys.length > 0) {
            const selectedAdvancedKeys = selectedAdvancedEntries.map((entry) => entry.key).sort();
            if (presetKeys.length === selectedAdvancedKeys.length
              && presetKeys.every((key, index) => key === selectedAdvancedKeys[index])) {
              return preset.label;
            }
            continue;
          }
  
          if (preset.anchorKey || Array.isArray(preset.forcedSelectionKeys)) {
            if (presetKeys.every((key) => selectedKeys.includes(key))) {
              return preset.label;
            }
          }
        }
  
        if (selectedAdvancedEntries.length > 0) {
          const fallbackLabels = selectedAdvancedEntries
            .slice()
            .sort((a, b) => {
              const fameDiff = Number(b.minFame || 0) - Number(a.minFame || 0);
              if (fameDiff !== 0) return fameDiff;
              return getSupplyEntryDisplayLabel(a).localeCompare(getSupplyEntryDisplayLabel(b), 'ko-KR');
            })
            .map((entry) => getSupplyEntryDisplayLabel(entry))
            .filter(Boolean);
  
          if (fallbackLabels.length > 0) {
            return fallbackLabels.slice(0, 2).join('+');
          }
        }
  
        const fallbackEntry = selectedEntries[0];
        return fallbackEntry ? getSupplyEntryDisplayLabel(fallbackEntry) : '기본 선택';
      }
  
      function getSupplyRosterSortOrder(character) {
        return [
          Number(character?.fame || 0) * -1,
          getSupplyRosterLabel(character).toLowerCase(),
        ];
      }
  
      function getSupplyAccountSelectionCount(poolKey) {
        const normalizedPoolKey = String(poolKey || '').trim();
        if (!normalizedPoolKey || !Array.isArray(supplyCharacters) || supplyCharacters.length === 0) {
          return 0;
        }
  
        return supplyCharacters.reduce((count, character) => {
          const selectedKeys = normalizeSupplySelection(
            character.selectedContentKeys ?? character.selectedSupplyKeys ?? character.selectedAdvancedDungeonKeys ?? [],
            character.fame
          );
          if (!selectedKeys.length) return count;
  
          const entries = getSupplyEntriesForFame(character.fame, true);
          const hasPoolEntry = entries.some((entry) => {
            const entryPoolKey = String(entry.accountPoolKey || entry.groupKey || entry.key || '').trim();
            return selectedKeys.includes(entry.key) && entryPoolKey === normalizedPoolKey;
          });
  
          return hasPoolEntry ? count + 1 : count;
        }, 0);
      }
  
      function getSupplyRosterCharactersByRole(characters, runHell) {
        return [...(Array.isArray(characters) ? characters : [])]
          .filter((character) => Boolean(character?.runHell) === Boolean(runHell))
          .sort((a, b) => {
            const fameDiff = Number(b.fame || 0) - Number(a.fame || 0);
            if (fameDiff !== 0) return fameDiff;
            return getSupplyRosterLabel(a).localeCompare(getSupplyRosterLabel(b), 'ko-KR');
          });
      }
  
      function getSupplyRosterDisplayCharacters(characters) {
        const source = Array.isArray(characters) ? characters : [];
        return [
          ...getSupplyRosterCharactersByRole(source, true),
          ...getSupplyRosterCharactersByRole(source, false),
        ];
      }
  
      function sortSupplyKeysByRosterOrder(keys, characters = supplyCharacters) {
        const order = new Map(getSupplyRosterDisplayCharacters(characters).map((character, index) => [character.key, index]));
        return [...new Set(Array.isArray(keys) ? keys : [])]
          .map((key) => String(key || '').trim())
          .filter((key) => key && order.has(key))
          .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      }
  
      function normalizeSupplySelectionKeys(candidateKeys, characters = supplyCharacters, fallbackKey = '') {
        const normalized = sortSupplyKeysByRosterOrder(candidateKeys, characters);
        if (normalized.length > 0) {
          return normalized;
        }
  
        const availableKeys = new Set(getSupplyRosterDisplayCharacters(characters).map((character) => character.key));
        const preferredKey = String(fallbackKey || supplyActiveCharacterKey || supplySelectionAnchorKey || '').trim();
        if (preferredKey && availableKeys.has(preferredKey)) {
          return [preferredKey];
        }
  
        const firstKey = getSupplyRosterDisplayCharacters(characters)[0]?.key || '';
        return firstKey ? [firstKey] : [];
      }
  
      function setSupplySelectionState(nextKeys, options = {}) {
        const normalizedKeys = normalizeSupplySelectionKeys(nextKeys, supplyCharacters, options.activeKey || options.anchorKey);
        supplySelectedCharacterKeys = new Set(normalizedKeys);
  
        const availableKeys = new Set(getSupplyRosterDisplayCharacters(supplyCharacters).map((character) => character.key));
        const activeKey = String(options.activeKey || '').trim();
        const anchorKey = String(options.anchorKey || '').trim();
  
        supplyActiveCharacterKey = normalizedKeys.includes(activeKey)
          ? activeKey
          : (availableKeys.has(supplyActiveCharacterKey) ? supplyActiveCharacterKey : (normalizedKeys[0] || ''));
        supplySelectionAnchorKey = normalizedKeys.includes(anchorKey)
          ? anchorKey
          : (availableKeys.has(supplySelectionAnchorKey) ? supplySelectionAnchorKey : supplyActiveCharacterKey);
      }
  
      function getSupplySelectedCharacterKeys() {
        return sortSupplyKeysByRosterOrder([...supplySelectedCharacterKeys], supplyCharacters);
      }
  
      function getSupplySelectedCharacters(characters) {
        const source = Array.isArray(characters) ? characters : [];
        const characterMap = new Map(source.map((character) => [character.key, character]));
        return getSupplySelectedCharacterKeys()
          .map((key) => characterMap.get(key))
          .filter(Boolean);
      }
  
      function getSupplySelectionRangeKeys(targetKey) {
        const rosterKeys = getSupplyRosterDisplayCharacters(supplyCharacters).map((character) => character.key);
        const targetIndex = rosterKeys.indexOf(targetKey);
        if (targetIndex < 0) {
          return [];
        }
  
        const availableAnchor = String(supplySelectionAnchorKey || '').trim();
        const activeAnchor = String(supplyActiveCharacterKey || '').trim();
        const fallbackAnchor = getSupplySelectedCharacterKeys()[0] || '';
        const anchorKey = [availableAnchor, activeAnchor, fallbackAnchor].find((key) => key && rosterKeys.includes(key)) || targetKey;
        const anchorIndex = rosterKeys.indexOf(anchorKey);
        if (anchorIndex < 0) {
          return [targetKey];
        }
  
        const start = Math.min(anchorIndex, targetIndex);
        const end = Math.max(anchorIndex, targetIndex);
        return rosterKeys.slice(start, end + 1);
      }
  
      function setSupplySelectionOnly(targetKey) {
        const normalizedKey = String(targetKey || '').trim();
        if (!normalizedKey) return;
        setSupplySelectionState([normalizedKey], { activeKey: normalizedKey, anchorKey: normalizedKey });
      }
  
      function toggleSupplySelection(targetKey) {
        const normalizedKey = String(targetKey || '').trim();
        if (!normalizedKey) return;
  
        const currentKeys = getSupplySelectedCharacterKeys();
        const currentIndex = currentKeys.indexOf(normalizedKey);
        if (currentIndex >= 0) {
          if (currentKeys.length <= 1) {
            setSupplySelectionOnly(normalizedKey);
            return;
          }
  
          const nextKeys = currentKeys.filter((key) => key !== normalizedKey);
          const nextActiveKey = normalizedKey === supplyActiveCharacterKey
            ? (nextKeys[0] || normalizedKey)
            : supplyActiveCharacterKey;
          const nextAnchorKey = normalizedKey === supplySelectionAnchorKey
            ? (nextActiveKey || nextKeys[0] || normalizedKey)
            : supplySelectionAnchorKey;
          setSupplySelectionState(nextKeys, { activeKey: nextActiveKey, anchorKey: nextAnchorKey });
          return;
        }
  
        const nextKeys = sortSupplyKeysByRosterOrder([...currentKeys, normalizedKey], supplyCharacters);
        setSupplySelectionState(nextKeys, { activeKey: normalizedKey, anchorKey: normalizedKey });
      }
  
      function selectSupplyRange(targetKey) {
        const normalizedKey = String(targetKey || '').trim();
        if (!normalizedKey) return;
        const rangeKeys = getSupplySelectionRangeKeys(normalizedKey);
        if (!rangeKeys.length) {
          setSupplySelectionOnly(normalizedKey);
          return;
        }
        setSupplySelectionState(rangeKeys, { activeKey: normalizedKey, anchorKey: supplySelectionAnchorKey || normalizedKey });
      }
  
      function syncSupplySelectionState(characters = supplyCharacters) {
        const availableKeys = new Set(getSupplyRosterDisplayCharacters(characters).map((character) => character.key));
        const preservedKeys = getSupplySelectedCharacterKeys().filter((key) => availableKeys.has(key));
        const fallbackKey = availableKeys.has(supplyActiveCharacterKey)
          ? supplyActiveCharacterKey
          : (availableKeys.has(supplySelectionAnchorKey) ? supplySelectionAnchorKey : '');
        const nextKeys = preservedKeys.length > 0
          ? preservedKeys
          : normalizeSupplySelectionKeys([], characters, fallbackKey);
  
        supplySelectedCharacterKeys = new Set(nextKeys);
        supplyActiveCharacterKey = availableKeys.has(supplyActiveCharacterKey)
          ? supplyActiveCharacterKey
          : (nextKeys[0] || '');
        supplySelectionAnchorKey = availableKeys.has(supplySelectionAnchorKey)
          ? supplySelectionAnchorKey
          : (supplyActiveCharacterKey || nextKeys[0] || '');
      }
  
      function getSupplyRosterFocusKeyAfterMove(beforeCharacters, afterCharacters, movedKey) {
        const sourceCharacter = Array.isArray(beforeCharacters)
          ? beforeCharacters.find((character) => character.key === movedKey)
          : null;
        if (!sourceCharacter) {
          return movedKey;
        }
  
        const sourceRunHell = Boolean(sourceCharacter.runHell);
        const sourceBefore = getSupplyRosterCharactersByRole(beforeCharacters, sourceRunHell);
        const sourceAfter = getSupplyRosterCharactersByRole(afterCharacters, sourceRunHell);
        const sourceIndex = sourceBefore.findIndex((character) => character.key === movedKey);
        if (sourceIndex < 0) {
          return movedKey;
        }
  
        if (sourceAfter.length === 0) {
          const destAfter = getSupplyRosterCharactersByRole(afterCharacters, !sourceRunHell);
          return destAfter[0]?.key || movedKey;
        }
  
        return (
          sourceAfter[sourceIndex]?.key
          || sourceAfter[sourceIndex - 1]?.key
          || sourceAfter[sourceAfter.length - 1]?.key
          || movedKey
        );
      }
  
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
        const hellCost = getSupplyCharacterHellRevelationPerRun(character);
        const potionKeys = getSupplyCharacterFatiguePotionKeys(character);
        const dailyPotionRuns = getSupplyCharacterFatiguePotionDailyRuns(character);
        const active = supplyActiveCharacterKey === character.key ? 'active' : '';
        const selected = supplySelectedCharacterKeys.has(character.key) ? 'selected' : '';
        const summaryChips = [
          roleLabel === 'alt'
            ? null
            : `<span class="supply-roster-cost">영약 ${escapeHtml(fmtInt(potionKeys.length))}개 · +${escapeHtml(fmtInt(dailyPotionRuns))}판</span>`,
          `<span class="supply-roster-cost">판당 ${escapeHtml(fmtInt(hellCost))}계시</span>`,
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
              <span class="supply-roster-item-badge">${escapeHtml(fameLabel)}</span>
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
  
      // -------------------------------------------------------------------------
      // Revelation management rendering
      // -------------------------------------------------------------------------
  
      function renderSupplyRosterList(container, characters, roleLabel) {
        if (!container) return;
  
        container.innerHTML = characters.length
          ? characters.map((character) => getSupplyRosterItemMarkup(character, roleLabel)).join('')
          : `<div class="supply-note" style="padding: 4px 2px;">비어 있음</div>`;
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
        const gearRows = Array.isArray(supplyParts.gearRows) ? supplyParts.gearRows : [];
        const dimRows = Array.isArray(supplyParts.dimRows) ? supplyParts.dimRows : [];
        const dimSoulCount = Number(supplyParts.dimSoulCount || dimRows.reduce((sum, row) => sum + Number(row.expectedCount || 0), 0));
        const dimSoulValue = Number(supplyParts.dimSoulValue || (dimSoulCount * 4));
        const soulRecoveryTotal = Number(supplyParts.soulRecoveryTotal || ((Number(supplyParts.gearRecoveryTotal || 0)) + dimSoulValue));
  
        els.supplyDetailRecovery.textContent = fmtRevelation(soulRecoveryTotal, 1);
        els.supplyDetailRecoverySub.innerHTML = buildSoulRecoveryRowsMarkup(gearRows, dimSoulCount, dimSoulValue);
      }
  
      function renderSupplyContentControls(result) {
        if (!els.supplyContentControls) return;
  
        if (!result) {
          els.supplyContentControls.innerHTML = `
            <div class="supply-note" style="grid-column: 1 / -1;">캐릭터를 선택하면 콘텐츠를 고를 수 있다.</div>
          `;
          return;
        }
  
        if (result.isMultiSelection) {
          els.supplyContentControls.innerHTML = `
            <div class="supply-note" style="grid-column: 1 / -1;">여러 캐릭터를 선택한 상태에서는 뭐 돌 건지를 바꿀 수 없다.</div>
          `;
          return;
        }
  
        const selectedKeys = new Set(result.selectedContentKeys || result.selectedSupplyKeys || result.selectedAdvancedDungeonKeys || getDefaultSupplySelection(result.fame));
        const availableKeys = new Set(getAvailableSupplyKeys(result.fame));
        const groupedEntries = new Map(SUPPLY_CONTENT_TYPE_ORDER.map((type) => [type, new Map()]));
  
        for (const entry of getSupplyEntriesForFame(result.fame, true)) {
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
                    ${groupLimit > 0 ? `<span class="supply-limit-pill ${groupCount >= groupLimit ? 'full' : ''}">${groupCount}/${groupLimit}</span>` : ''}
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
  
          return `
            <section class="supply-category">
              <div class="supply-category-head">
                <div>
                  <div class="supply-category-title">${escapeHtml(SUPPLY_CONTENT_TYPE_LABELS[type] || type)}</div>
                </div>
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
  
      // -------------------------------------------------------------------------
      // Revelation management state updates
      // -------------------------------------------------------------------------
  
      function clearSupplyRenderedResults(message = '캐릭터를 추가해 주세요.') {
        els.supplyTotalUsage.textContent = '-';
        if (els.supplyTotalResetUsage) els.supplyTotalResetUsage.textContent = '-';
        if (els.supplyTotalSoul) els.supplyTotalSoul.textContent = '-';
        if (els.supplyTotalSoulSub) els.supplyTotalSoulSub.textContent = '-';
        if (els.supplyTotalTodayUsage) els.supplyTotalTodayUsage.textContent = '-';
        if (els.supplyTotalBound) els.supplyTotalBound.textContent = '-';
        els.supplyTotalAccount.textContent = '-';
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
  
      function setSupplyCharacters(characters, sourceLabel) {
        const normalizedCharacters = normalizeSupplyCharacters(characters);
        supplyCharacters = enforceSupplyAccountLimits(normalizedCharacters);
        syncSupplySelectionState(supplyCharacters);
        supplyCharactersSource = `${STORAGE_SCOPE_LABEL} · ${sourceLabel}`;
        const previewText = JSON.stringify(supplyCharacters, null, 2);
        supplyCache.writeText(previewText);
        els.supplySearchStatus.textContent = `${supplyCharactersSource} · ${supplyCharacters.length.toLocaleString('ko-KR')}캐릭`;
        renderSupplyView();
      }
  
      function clearSupplyCharacters(message = '캐릭터를 추가해 주세요.') {
        supplyCharacters = [];
        supplyCharactersSource = `${STORAGE_SCOPE_LABEL} · 목록 비움`;
        supplyActiveCharacterKey = '';
        supplySelectionAnchorKey = '';
        supplySelectedCharacterKeys = new Set();
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
        const weeklyPotionRuns = Number(result.weeklyUsage?.potionRuns || 0);
        const todayUsage = result.todayUsage || {};
        const todayFatigueRuns = Number(todayUsage.fatigueHellRuns || 0);
        const todayFreeRuns = Number(todayUsage.freeHellRuns || 0);
        const todayPotionRuns = Number(todayUsage.potionRuns || 0);
        const todayHellRuns = Number(todayUsage.totalHellRuns || todayFatigueRuns || 0);
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
        els.supplyDetailHell.textContent = `${formattedHellRuns}판`;
        if (els.supplyDetailHellSub) {
          if (isPureHellSelection || (!isMultiSelection && isSupplyHellEnabled(result))) {
            els.supplyDetailHellSub.textContent = `주당 ${fmtInt(weeklyFatigueHellRuns)}판 + 영약 ${fmtInt(weeklyPotionRuns)}판`;
          } else if (isPureAltSelection || (!isMultiSelection && !isSupplyHellEnabled(result))) {
            els.supplyDetailHellSub.textContent = `교불계시 ${fmtRevelation(result.weeklyBoundSupply || 0, 1)} / ${fmtRevelation(hellCostPerRun, 1)} = ${formattedHellRuns}판`;
          } else {
            els.supplyDetailHellSub.textContent = `주당 ${fmtInt(weeklyFatigueHellRuns)}판 + 영약 ${fmtInt(weeklyPotionRuns)}판 · 교불계시 ${fmtRevelation(result.weeklyBoundSupply || 0, 1)} / ${fmtRevelation(hellCostPerRun, 1)} = ${formattedHellRuns}판`;
          }
        }
        renderSupplyDetailRecovery(result);
        renderSupplyDetailEditor(result);
        renderSupplyContentControls(result);
        updateSupplyPresetButtonStates(isMultiSelection ? Number(result.primaryCharacter?.fame || 0) : Number(result.fame || 0));
  
        if (isMultiSelection) {
          els.supplyDetailTableBody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align:center;color:var(--muted);">여러 캐릭터를 선택한 상태에서는 하단 콘텐츠 표를 바꾸지 않는다.</td>
            </tr>
          `;
          return;
        }
  
        if (!result.supplyEntries.length) {
          els.supplyDetailTableBody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align:center;color:var(--muted);">현재 명성으로 수급되는 콘텐츠가 없습니다.</td>
            </tr>
          `;
          return;
        }
  
        els.supplyDetailTableBody.innerHTML = result.supplyEntries.map((entry) => {
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
        }).join('');
      }
  
      function updateSupplyCharactersByKeys(characterKeys, sourceLabel, updater) {
        const keySet = new Set((Array.isArray(characterKeys) ? characterKeys : [characterKeys])
          .map((key) => String(key || '').trim())
          .filter(Boolean));
        if (!keySet.size || typeof updater !== 'function') {
          return;
        }
  
        const nextCharacters = supplyCharacters.map((character) => {
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
        const current = [...supplyCharacters];
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
        supplyActiveCharacterKey = current[index].key;
        setSupplyCharacters(current, '선택 수정');
      }
  
      function updateSupplyCharacterHellBonus(characterKey, bonusKey) {
        const current = [...supplyCharacters];
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
        supplyActiveCharacterKey = nextTarget.key;
        setSupplyCharacters(current, '헬 비용 수정');
      }
  
      function updateSupplyCharacterFatigueMode(characterKey, fatigueMode) {
        const current = [...supplyCharacters];
        const index = current.findIndex((character) => character.key === characterKey);
        if (index < 0) return;
  
        const normalizedMode = normalizeSupplyCharacterFatigueMode(fatigueMode);
        if (!SUPPLY_CHARACTER_FATIGUE_PROFILES[normalizedMode]) return;
  
        const target = current[index];
        current[index] = {
          ...target,
          fatigueMode: normalizedMode,
        };
  
        supplyActiveCharacterKey = target.key;
        setSupplyCharacters(current, '피로도 수정');
      }
  
      function updateSupplyCharacterFatiguePotion(characterKey, potionKey) {
        const current = [...supplyCharacters];
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
  
        supplyActiveCharacterKey = target.key;
        setSupplyCharacters(current, '영약 수정');
      }
  
      function updateSupplyCharacterFatiguePotionFoldOpen(characterKey, open) {
        const current = [...supplyCharacters];
        const index = current.findIndex((character) => character.key === characterKey);
        if (index < 0) return;
  
        const target = current[index];
        current[index] = {
          ...target,
          fatiguePotionFoldOpen: Boolean(open),
        };
  
        supplyActiveCharacterKey = target.key;
        setSupplyCharacters(current, '영약 패널');
      }
  
      function setAllSupplyCharacterFatiguePotionsFromActive() {
        if (!Array.isArray(supplyCharacters) || supplyCharacters.length === 0) {
          return;
        }
  
        const sourceCharacter = supplyCharacters.find((character) => character.key === supplyActiveCharacterKey && isSupplyHellEnabled(character))
          || supplyCharacters.find((character) => isSupplyHellEnabled(character))
          || null;
        if (!sourceCharacter) {
          return;
        }
  
        const sourceKeys = getSupplyCharacterFatiguePotionKeys(sourceCharacter);
        const nextCharacters = supplyCharacters.map((character) => {
          if (!isSupplyHellEnabled(character)) {
            return character;
          }
          return {
            ...character,
            fatiguePotionKeys: [...sourceKeys],
          };
        });
  
        setSupplyCharacters(nextCharacters, '영약 일괄 설정');
      }
  
      function setAllSupplyCharacterHellBonus(bonusKey, enabled) {
        if (!Array.isArray(supplyCharacters) || supplyCharacters.length === 0) {
          return;
        }
  
        const normalizedBonusKey = String(bonusKey || '').trim();
        const nextCharacters = supplyCharacters.map((character) => {
          if (!isSupplyHellEnabled(character)) {
            return character;
          }
  
          if (normalizedBonusKey === 'pcBang') {
            return { ...character, pcBangBonus: Boolean(enabled) };
          }
  
          if (normalizedBonusKey === 'aradPass') {
            return { ...character, aradPassBonus: Boolean(enabled) };
          }
  
          return character;
        });
  
        setSupplyCharacters(nextCharacters, Boolean(enabled) ? '헬 비용 일괄 선택' : '헬 비용 일괄 해제');
      }
  
      function updateSupplyCharacterHellSelection(characterKey, runHell, focusMode = 'next') {
        const current = [...supplyCharacters];
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
  
        supplyActiveCharacterKey = focusMode === 'self'
          ? characterKey
          : getSupplyRosterFocusKeyAfterMove(supplyCharacters, nextCharacters, characterKey);
        setSupplyCharacters(nextCharacters, '헬 선택 수정');
      }
  
      function setAllSupplyCharacterHellSelection(runHell) {
        if (!Array.isArray(supplyCharacters) || supplyCharacters.length === 0) {
          return;
        }
  
        const nextCharacters = supplyCharacters.map((character) => ({
          ...character,
          runHell: Boolean(runHell),
        }));
        setSupplyCharacters(nextCharacters, runHell ? '헬 일괄 선택' : '헬 일괄 해제');
      }
  
      function resetAllSupplySelectionsToDefault() {
        if (!Array.isArray(supplyCharacters) || supplyCharacters.length === 0) {
          return;
        }
  
        const nextCharacters = [...supplyCharacters]
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
  
        supplyActiveCharacterKey = supplyActiveCharacterKey
          && nextCharacters.some((character) => character.key === supplyActiveCharacterKey)
          ? supplyActiveCharacterKey
          : nextCharacters[0]?.key || '';
  
        setSupplyCharacters(nextCharacters, '전체 기본 복원');
      }
  
      function applySupplyPreset(presetKey) {
        const preset = SUPPLY_PRESET_DEFINITIONS.find((item) => item.key === presetKey);
        const current = supplyCharacters.find((character) => character.key === supplyActiveCharacterKey) || supplyCharacters[0] || null;
        if (!preset || !current) return;
  
        if (!isSupplyPresetAvailable(preset.key, current.fame)) {
          return;
        }
  
        if (Array.isArray(preset.forcedSelectionKeys) && preset.forcedSelectionKeys.length > 0) {
          const currentKeys = current.selectedContentKeys ?? current.selectedSupplyKeys ?? current.selectedAdvancedDungeonKeys ?? [];
          updateSupplyCharacterSelection(current.key, applySupplyForcedSelections(currentKeys, current.fame, preset.forcedSelectionKeys));
          return;
        }
  
        const presetFame = getSupplyPresetAnchorFame(preset.key);
        const effectiveFame = Math.min(Number(current.fame || 0), presetFame || Number(current.fame || 0));
        updateSupplyCharacterSelection(current.key, buildDefaultSupplySelectionForFame(effectiveFame || current.fame || 0));
      }
  
      function renderSupplyView() {
        const source = Array.isArray(supplyCharacters) ? supplyCharacters : [];
        if (source.length === 0) {
          clearSupplyRenderedResults();
          els.supplySearchStatus.textContent = supplyCharactersSource;
          return;
        }
  
        syncSupplySelectionState(source);
  
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
          const weeklyUsage = calcWeeklyUsageFromEntries(selectedEntries, hellRevelationPerRun, fatigueMode, dailyPotionRuns);
          const resetUsage = calcResetUsageFromEntries(selectedEntries, hellRevelationPerRun, fatigueMode, dailyPotionRuns);
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
            todayNeedAccountSupply: Number(todayUsage.hellUsage || 0),
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
            character.dailyPotionRuns
          );
          const resetUsage = character.resetUsage || calcResetUsageFromEntries(
            supplyEntries,
            character.hellRevelationPerRun,
            getSupplyCharacterFatigueMode(character),
            character.dailyPotionRuns
          );
          const weeklyBoundSupply = supplyEntries
            .reduce((sum, entry) => sum + Number(entry.boundSupply || 0), 0);
          const weeklyHellRunsForRecovery = isSupplyHellEnabled(character)
            ? Number(weeklyUsage.totalHellRuns || 0)
            : (weeklyBoundSupply / Math.max(1, Number(character.hellRevelationPerRun || 0)));
          const weeklyHellRunsDisplay = isSupplyHellEnabled(character)
            ? Number(weeklyUsage.revelationHellRuns || 0)
            : Math.max(0, Number(weeklyHellRunsForRecovery || 0) - Number(weeklyUsage.freeHellRuns || 0));
          const accountSupplySummary = calcSupplyPartsFromEntries(
            supplyEntries,
            weeklyHellRunsDisplay,
            false
          );
          const weeklyRawAccountSupply = accountSupplySummary.accountSupply;
          const weeklyAccountSupply = Math.max(0, weeklyRawAccountSupply);
          const weeklyNeedAccountSupply = isSupplyHellEnabled(character)
            ? Math.max(0, weeklyUsage.hellUsage - weeklyBoundSupply)
            : 0;
          return {
            ...character,
            supplyEntries,
            totalSupply,
            weeklyUsage,
            resetUsage,
            todayNeedAccountSupply: Number(character.todayNeedAccountSupply || character.todayUsage?.hellUsage || 0),
            weeklyBoundSupply,
            weeklyRawAccountSupply,
            weeklyAccountSupply,
            weeklySoulRecoverySupply: accountSupplySummary.parts.soulRecoveryTotal,
            supplyParts: accountSupplySummary.parts,
            weeklyHellRunsForRecovery,
            weeklyHellRunsDisplay,
            weeklyNeedAccountSupply,
          };
        }).sort((a, b) => {
          const supplyDiff = b.totalSupply - a.totalSupply;
          if (supplyDiff !== 0) return supplyDiff;
          const fameDiff = b.fame - a.fame;
          if (fameDiff !== 0) return fameDiff;
          return getCharacterLabel(a).localeCompare(getCharacterLabel(b), 'ko-KR');
        });
  
        if (!supplyActiveCharacterKey || !decorated.some((character) => character.key === supplyActiveCharacterKey)) {
          supplyActiveCharacterKey = decorated[0]?.key || '';
        }
  
        const selectedCharacters = getSupplySelectedCharacters(decorated);
        const selected = buildSupplySelectionSummary(selectedCharacters)
          || decorated.find((character) => character.key === supplyActiveCharacterKey)
          || decorated[0]
          || null;
        const enabledCharacters = decorated.filter((character) => isSupplyHellEnabled(character));
        const totalTodayUsage = enabledCharacters.reduce((sum, character) => sum + Number(character.todayUsage?.hellUsage || 0), 0);
        const totalNeedAccountSupply = enabledCharacters.reduce((sum, character) => {
          return sum + Number(character.weeklyNeedAccountSupply || 0);
        }, 0);
        const totalResetUsage = enabledCharacters.reduce((sum, character) => sum + Number(character.resetUsage?.hellUsage || 0), 0);
        const totalSoulRecoverySummary = summarizeSoulRecoveryParts(decorated);
        const totalSoulRecoverySupply = Number(totalSoulRecoverySummary.total || 0);
        const totalBoundSupply = decorated.reduce((sum, character) => sum + Number(character.weeklyBoundSupply || 0), 0);
        const totalAccountSupply = decorated.reduce((sum, character) => sum + Number(character.weeklyRawAccountSupply || 0), 0);
  
        if (els.supplyTotalTodayUsage) els.supplyTotalTodayUsage.textContent = fmtRevelation(totalTodayUsage, 1);
        els.supplyTotalUsage.textContent = fmtRevelation(totalNeedAccountSupply, 1);
        if (els.supplyTotalResetUsage) els.supplyTotalResetUsage.textContent = fmtRevelation(totalResetUsage, 1);
        if (els.supplyTotalSoul) els.supplyTotalSoul.textContent = fmtRevelation(totalSoulRecoverySupply, 1);
        if (els.supplyTotalSoulSub) {
          els.supplyTotalSoulSub.innerHTML = buildSoulRecoveryRowsMarkup(
            totalSoulRecoverySummary.gearRows,
            totalSoulRecoverySummary.dimSoulCount,
            totalSoulRecoverySummary.dimSoulValue,
            {
              listClass: 'supply-detail-recovery-list supply-total-soul-list',
              showReveal: true,
            }
          );
        }
        if (els.supplyTotalBound) els.supplyTotalBound.textContent = fmtRevelation(totalBoundSupply, 1);
        els.supplyTotalAccount.textContent = fmtRevelation(totalAccountSupply, 1);
  
        const hellCharacters = getSupplyRosterCharactersByRole(decorated, true);
        const altCharacters = getSupplyRosterCharactersByRole(decorated, false);
        renderSupplyRosterList(els.supplyHellRosterList, hellCharacters, 'hell');
        renderSupplyRosterList(els.supplyAltRosterList, altCharacters, 'alt');
        if (els.supplyHellRosterCount) els.supplyHellRosterCount.textContent = `${hellCharacters.length.toLocaleString('ko-KR')}캐릭`;
        if (els.supplyAltRosterCount) els.supplyAltRosterCount.textContent = `${altCharacters.length.toLocaleString('ko-KR')}캐릭`;
        if (els.setAllSupplyHellPcBangButton) {
          const allPcBang = hellCharacters.length > 0 && hellCharacters.every((character) => Boolean(character?.pcBangBonus));
          els.setAllSupplyHellPcBangButton.classList.toggle('active', allPcBang);
          els.setAllSupplyHellPcBangButton.setAttribute('aria-pressed', allPcBang ? 'true' : 'false');
        }
        if (els.setAllSupplyHellAradPassButton) {
          const allAradPass = hellCharacters.length > 0 && hellCharacters.every((character) => Boolean(character?.aradPassBonus));
          els.setAllSupplyHellAradPassButton.classList.toggle('active', allAradPass);
          els.setAllSupplyHellAradPassButton.setAttribute('aria-pressed', allAradPass ? 'true' : 'false');
        }
        bindCharacterAvatars(els.supplyHellRosterList);
        bindCharacterAvatars(els.supplyAltRosterList);
        renderSupplyDetail(selected);
        renderSupplyReferenceTable();
        els.supplySearchStatus.textContent = `${supplyCharactersSource} · 헬 ${hellCharacters.length.toLocaleString('ko-KR')}캐릭 · 배럭 ${altCharacters.length.toLocaleString('ko-KR')}캐릭`;
        els.supplyError.textContent = '';
      }
  
      function setSupplyError(message = '') {
        els.supplyError.textContent = message;
      }
  
      async function lookupSupplyCharacter(serverId, characterName) {
        const url = `${API_BASE}/api/search?serverId=${encodeURIComponent(serverId)}&characterName=${encodeURIComponent(characterName)}`;
        const response = await fetch(url, { cache: 'no-store' });
        const payload = await response.json();
  
        if (!response.ok || payload.error) {
          throw new Error(payload.error || '캐릭터를 찾지 못했습니다.');
        }
  
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
          const previousCharacter = supplyCharacters.find((character) => character.serverId === serverId && character.name === characterName)
            || supplyCharacters.find((character) => character.key === `${serverId}:${characterName}`)
            || null;
          const resolved = mergeSupplyCharacterSelection(await lookupSupplyCharacter(serverId, characterName), previousCharacter);
          const nextCharacters = [...supplyCharacters.filter((character) => character.key !== resolved.key), resolved];
          supplyActiveCharacterKey = resolved.key;
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
        if (!Array.isArray(supplyCharacters) || supplyCharacters.length === 0) {
          setSupplyError('갱신할 캐릭터가 없습니다.');
          return;
        }
  
        setSupplySearchBusy(true, `전체 갱신 중... (${supplyCharacters.length.toLocaleString('ko-KR')}캐릭)`);
        setSupplyError('');
  
        try {
          const settled = await Promise.allSettled(
            supplyCharacters.map((character) => lookupSupplyCharacter(character.serverId, character.name))
          );
  
          const refreshed = supplyCharacters.map((character, index) => {
            const item = settled[index];
            if (item && item.status === 'fulfilled') {
              return mergeSupplyCharacterSelection(item.value, character);
            }
            return character;
          });
  
          const failedLabels = supplyCharacters
            .map((character, index) => (settled[index] && settled[index].status === 'rejected' ? getCharacterLabel(character) : ''))
            .filter(Boolean);
  
          const successCount = refreshed.length - failedLabels.length;
          supplyActiveCharacterKey = supplyActiveCharacterKey && refreshed.some((character) => character.key === supplyActiveCharacterKey)
            ? supplyActiveCharacterKey
            : refreshed[0]?.key || '';
  
          setSupplyCharacters(refreshed, '전체 갱신');
          if (failedLabels.length > 0) {
            setSupplyError(`일부 캐릭터 갱신 실패: ${failedLabels.join(', ')}`);
            els.supplySearchStatus.textContent = `${supplyCharactersSource} · ${successCount}/${refreshed.length}캐릭 갱신 완료`;
          } else {
            els.supplySearchStatus.textContent = `${supplyCharactersSource} · ${refreshed.length.toLocaleString('ko-KR')}캐릭 전체 갱신`;
          }
        } catch (error) {
          setSupplyError(error instanceof Error ? error.message : '전체 갱신 중 오류가 발생했습니다.');
        } finally {
          setSupplySearchBusy(false);
        }
      }
  
      // -------------------------------------------------------------------------
      // Revelation management API and list actions
      // -------------------------------------------------------------------------
  
      function deleteSupplyCharacter(characterKey) {
        const target = supplyCharacters.find((character) => character.key === characterKey);
        if (!target) return;
  
        const confirmed = window.confirm(`${getCharacterLabel(target)}를 목록에서 삭제할까요?`);
        if (!confirmed) return;
  
        const nextCharacters = supplyCharacters.filter((character) => character.key !== characterKey);
        supplyActiveCharacterKey = supplyActiveCharacterKey === characterKey ? (nextCharacters[0]?.key || '') : supplyActiveCharacterKey;
  
        if (nextCharacters.length === 0) {
          clearSupplyCharacters('삭제 후 목록이 비었습니다.');
          return;
        }
  
        setSupplyCharacters(nextCharacters, '목록 수정');
        els.supplySearchStatus.textContent = `${supplyCharactersSource} · ${nextCharacters.length.toLocaleString('ko-KR')}캐릭`;
      }
  
      // -------------------------------------------------------------------------
      // Tab switching and hell-character API access
      // -------------------------------------------------------------------------
  
      function setActiveTab(tabId, persist = true) {
        const normalizedTabId = tabId === 'supplyPanel' ? 'supplyPanel' : 'hellPanel';
  
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
  
        if (normalizedTabId === 'supplyPanel') {
          renderSupplyView();
        } else {
          updateViewOnly();
        }
      }
  
      function loadActiveTab() {
        try {
          return localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || 'hellPanel';
        } catch {
          return 'hellPanel';
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
          els.characterNameInput.focus();
          recalc();
          els.searchStatus.textContent = `${activeCharactersSource} · ${activeCharacters.length.toLocaleString('ko-KR')}캐릭`;
        } catch (error) {
          const rawMessage = error instanceof Error ? error.message : String(error || '');
          const message = /fetch/i.test(rawMessage)
            ? '로컬 API 서버를 먼저 실행해 주세요. python3 neople_hell_api_server.py'
            : (rawMessage || '캐릭터 검색에 실패했습니다.');
          els.error.textContent = message;
          els.calcState.textContent = '오류';
          setCalcMeta('캐릭터 검색에 실패했습니다');
          els.searchStatus.textContent = message;
        } finally {
          setSearchBusy(false);
        }
      }
  
      async function refreshAllCharactersFromApi() {
        if (!Array.isArray(activeCharacters) || activeCharacters.length === 0) {
          throw new Error('갱신할 캐릭터가 없습니다.');
        }
  
        setSearchBusy(true, `전체 갱신 중... (${activeCharacters.length}캐릭)`);
        els.error.textContent = '';
  
        try {
          const settled = await Promise.allSettled(activeCharacters.map(async (character) => {
            const summary = await fetchCharacterSummary(character.serverId, character.name);
            return normalizeCharacters([summary])[0];
          }));
  
          const refreshed = activeCharacters.map((character, index) => {
            const item = settled[index];
            return item.status === 'fulfilled' && item.value ? item.value : character;
          });
  
          const successCount = settled.filter((item) => item.status === 'fulfilled' && item.value).length;
          if (successCount === 0) {
            throw new Error('전체 갱신에 실패했습니다.');
          }
  
          const failedLabels = activeCharacters
            .filter((_, index) => settled[index].status !== 'fulfilled')
            .map((character) => getCharacterLabel(character));
  
          setCharacterData(refreshed, '전체 갱신');
          recalc();
  
          if (failedLabels.length > 0) {
            els.searchStatus.textContent = `${activeCharactersSource} · ${successCount}/${activeCharacters.length}캐릭 갱신 완료`;
            els.error.textContent = `일부 캐릭터 갱신 실패: ${failedLabels.join(', ')}`;
          } else {
            els.searchStatus.textContent = `${activeCharactersSource} · ${activeCharacters.length.toLocaleString('ko-KR')}캐릭 전체 갱신`;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error || '전체 갱신에 실패했습니다.');
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
  
      // -------------------------------------------------------------------------
      // Hell calculator simulation and rendering
      // -------------------------------------------------------------------------
  
      // Hell calculator math lives in src/logic/hellCalculator.js.

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
  
        els.detailTitle.innerHTML = `${getCharacterAvatarMarkup(result)} <span style="font-size: 0.72em; color: var(--muted); margin-left: 6px;">상세</span>`;
        const criterionText = getCriterionDisplay(selectedPercentile);
        const summaryPrefix = isDevMode ? `${criterionText} 기준` : '현재 기준';
        els.detailSummary.textContent = `${summaryPrefix}으로 아무 세트 1개가 3태초+8에픽을 달성할 때의 헬 졸업 비용은 ${fmtCost(result.selectedHellCost)}이고, 최저 정가 비용은 ${fmtCost(result.craftBest.craftCost)}입니다. 기준은 ${fmtDecimal(result.hellPerRun)}계시/판, 회수는 ${fmtDecimal(result.recoveryAmount)}계시/판이라 순원가는 ${fmtDecimal(result.netCost)}계시/판입니다.`;
        els.detailBadge.textContent = result.verdict.text;
        els.detailBadge.className = `badge ${result.verdict.className}`;
  
        els.selectedHellCost.textContent = fmtCost(result.selectedHellCost);
        els.selectedHellRuns.textContent = `${criterionText} · 아무 세트 1개 졸업까지 ${fmtInt(result.selectedRuns)}판`;
        els.craftCost.textContent = fmtCost(result.craftBest.craftCost);
        els.craftRoute.textContent = `최저 정가 루트: ${result.craftBest.name}`;
        const fragmentExpectation = calcFragmentExpectation(result.craftBest, result.netCost);
        if (els.fragmentNeedCost) els.fragmentNeedCost.textContent = fmtCost(fragmentExpectation.expectedCost);
        if (els.fragmentNeedPieces) els.fragmentNeedPieces.textContent = `정가 필요 조각 ${fmtInt(fragmentExpectation.requiredPieces)}개`;
        if (els.fragmentNeedBreakdown) {
          els.fragmentNeedBreakdown.textContent = `태초 조각 ${fmtInt(fragmentExpectation.taechoPieces)}개 / 에픽 조각 ${fmtInt(fragmentExpectation.epicPieces)}개`;
        }
        els.verdictText.textContent = result.verdict.text;
        els.verdictSub.textContent = `헬/정가 비율: ${result.ratio.toFixed(2)}x`;
        els.quantileCompact.textContent = `${isDevMode ? 'P50' : '50'} ${fmtCost(result.p50Cost)} / ${isDevMode ? 'P66' : '66'} ${fmtCost(result.p66Cost)} / ${isDevMode ? 'P80' : '80'} ${fmtCost(result.p80Cost)}`;
  
        els.p50Cost.textContent = fmtCost(result.p50Cost);
        els.p50Runs.textContent = `${fmtInt(result.p50Runs)}판`;
        els.p66Cost.textContent = fmtCost(result.p66Cost);
        els.p66Runs.textContent = `${fmtInt(result.p66Runs)}판`;
        els.p80Cost.textContent = fmtCost(result.p80Cost);
        els.p80Runs.textContent = `${fmtInt(result.p80Runs)}판`;
        els.meanCost.textContent = fmtCost(result.meanCost);
        els.meanRuns.textContent = `${fmtInt(result.meanRuns)}판`;
  
        els.setTableBody.innerHTML = result.setRows.map((row) => `
          <tr>
            <td>${row.name}</td>
            <td>${row.taecho}</td>
            <td>${row.epic}</td>
            <td>${row.taechoGap}</td>
            <td>${row.epicGap}</td>
            <td>${fmtCost(row.craftCost)}</td>
          </tr>
        `).join('');
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
        if (!lastResults.length) return;
  
        const selectedPercentile = getSelectedPercentile();
        const selectedName = els.selectedCharacter.value;
        refreshModeLabels(selectedPercentile);
        updateOverviewSummary(lastResults);
        renderOverview(lastResults);
        renderDetail(lastResults.find((result) => result.key === selectedName), selectedPercentile);
      }
  
      function refreshPercentileOnly() {
        if (!lastResults.length) return;
  
        const selectedPercentile = getSelectedPercentile();
        applySelectedPercentile(lastResults, selectedPercentile);
        updateViewOnly();
      }
  
      function recalc() {
        const start = performance.now();
        els.error.textContent = '';
        els.calcState.textContent = '계산 중';
        setCalcMeta('캐릭터 반영 중...', '전체 캐릭 반영 중');
  
        try {
          const selectedPercentile = getSelectedPercentile();
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
  
          const characters = parseCharacters();
          for (const character of characters) {
            if (character.sets.length > config.setCount) {
              throw new Error(`${character.name}의 세트 개수가 전체 세트 수보다 많습니다.`);
            }
          }
  
          const preservedName = els.selectedCharacter.value;
          const results = characters
            .map((character) => calcCharacter(character, config));
  
          lastResults = results;
          renderAll(results, selectedPercentile, preservedName);
  
          const elapsed = performance.now() - start;
          els.calcState.textContent = '완료';
          const derivedNetCost = calcNetCost(config.hellPerRun, config.recoveryAmount);
          setCalcMeta(
            `${results.length.toLocaleString('ko-KR')}캐릭 계산 완료`,
            `${results.length.toLocaleString('ko-KR')}캐릭 · 캐릭당 ${config.trials.toLocaleString('ko-KR')}회 · ${fmtDecimal(config.hellPerRun)}계시/판 - ${fmtDecimal(config.recoveryAmount)}계시/판 · 순원가 ${fmtDecimal(derivedNetCost)}계시/판 · ${activeCharactersSource} · ${elapsed.toFixed(0)}ms`
          );
        } catch (error) {
          els.error.textContent = error.message;
          els.calcState.textContent = '오류';
          setCalcMeta('입력값을 확인해 주세요');
          lastResults = [];
          els.overviewTableBody.innerHTML = '';
          els.setTableBody.innerHTML = '';
        }
      }
  
      function updateDetailOnly() {
        updateViewOnly();
      }
  
      function scheduleRecalc() {
        if (!hasCharacterData) {
          return;
        }
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(recalc, 120);
      }
  
      // -------------------------------------------------------------------------
      // Event bindings and bootstrap
      // -------------------------------------------------------------------------
  
      els.devModeToggle.addEventListener('click', () => {
        setDevMode(!isDevMode);
      });
      els.hellTabButton.addEventListener('click', () => {
        setActiveTab('hellPanel');
      });
      els.supplyTabButton.addEventListener('click', () => {
        setActiveTab('supplyPanel');
      });
      els.percentileRange.addEventListener('input', () => syncPercentile(els.percentileRange));
      els.percentileNumber.addEventListener('input', () => syncPercentile(els.percentileNumber));
      els.selectedCharacter.addEventListener('change', updateDetailOnly);
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
      if (els.setAllSupplyHellPcBangButton) {
        els.setAllSupplyHellPcBangButton.addEventListener('click', () => {
          const hellCharacters = getSupplyRosterCharactersByRole(Array.isArray(supplyCharacters) ? supplyCharacters : [], true);
          const allActive = hellCharacters.length > 0 && hellCharacters.every((character) => Boolean(character?.pcBangBonus));
          setAllSupplyCharacterHellBonus('pcBang', !allActive);
          els.supplySearchStatus.textContent = !allActive ? '피시방 일괄 적용' : '피시방 일괄 해제';
        });
      }
      if (els.setAllSupplyHellPotionsButton) {
        els.setAllSupplyHellPotionsButton.addEventListener('click', () => {
          setAllSupplyCharacterFatiguePotionsFromActive();
          els.supplySearchStatus.textContent = '영약 일괄 설정';
        });
      }
      if (els.setAllSupplyHellAradPassButton) {
        els.setAllSupplyHellAradPassButton.addEventListener('click', () => {
          const hellCharacters = getSupplyRosterCharactersByRole(Array.isArray(supplyCharacters) ? supplyCharacters : [], true);
          const allActive = hellCharacters.length > 0 && hellCharacters.every((character) => Boolean(character?.aradPassBonus));
          setAllSupplyCharacterHellBonus('aradPass', !allActive);
          els.supplySearchStatus.textContent = !allActive ? '아라드패스 일괄 적용' : '아라드패스 일괄 해제';
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
      const handleSupplyRosterDrop = (event) => {
        const list = event.currentTarget;
        const role = String(list?.dataset.supplyDropRole || '').trim();
        const draggedKey = String(event.dataTransfer?.getData('text/plain') || '').trim();
        if (!draggedKey || !role) return;
        event.preventDefault();
        if (list) {
          list.classList.remove('drag-over');
        }
        updateSupplyCharacterHellSelection(draggedKey, role === 'hell', 'self');
      };
  
      if (els.moveSupplyToHellButton) {
        els.moveSupplyToHellButton.addEventListener('click', () => {
          const current = supplyCharacters.find((character) => character.key === supplyActiveCharacterKey) || supplyCharacters[0] || null;
          if (!current) return;
          updateSupplyCharacterHellSelection(current.key, true, 'next');
        });
      }
      if (els.moveSupplyToAltButton) {
        els.moveSupplyToAltButton.addEventListener('click', () => {
          const current = supplyCharacters.find((character) => character.key === supplyActiveCharacterKey) || supplyCharacters[0] || null;
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
              ? !Boolean(supplyCharacters.find((character) => character.key === rowKey)?.pcBangBonus)
              : !Boolean(supplyCharacters.find((character) => character.key === rowKey)?.aradPassBonus);
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
            const currentKeys = new Set(getSupplyCharacterFatiguePotionKeys(supplyCharacters.find((character) => character.key === rowKey)));
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
            const nextOpen = !getSupplyCharacterFatiguePotionFoldOpen(supplyCharacters.find((character) => character.key === rowKey));
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
        });
  
        list.addEventListener('dragstart', (event) => {
          const row = event.target.closest('.supply-roster-item');
          if (!row) return;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', row.dataset.supplyKey || '');
          row.classList.add('dragging');
        });
  
        list.addEventListener('dragend', (event) => {
          const row = event.target.closest('.supply-roster-item');
          if (row) {
            row.classList.remove('dragging');
          }
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
  
          const current = supplyCharacters.find((character) => character.key === supplyActiveCharacterKey) || supplyCharacters[0] || null;
          if (!current) return;
  
          const entryKey = String(checkbox.dataset.supplyContentKey || '').trim();
          const groupKey = String(checkbox.dataset.supplyGroupKey || '').trim();
          if (!entryKey) return;
  
          const currentSelectedKeys = normalizeSupplySelection(
            current.selectedContentKeys ?? current.selectedSupplyKeys ?? current.selectedAdvancedDungeonKeys ?? [],
            current.fame
          );
          const currentEntries = getSupplyEntriesForFame(current.fame, true);
          const entryMap = new Map(currentEntries.map((entry) => [entry.key, entry]));
          const targetEntry = entryMap.get(entryKey);
          const group = SUPPLY_CONTENT_GROUPS.find((item) => item.key === (targetEntry?.groupKey || groupKey)) || null;
          const groupLimit = Math.max(0, Number(group?.accountLimit || targetEntry?.accountLimit || 0));
          const poolKey = String(group?.accountPoolKey || targetEntry?.accountPoolKey || groupKey || entryKey).trim();
          const alreadySelected = currentSelectedKeys.includes(entryKey);
  
          if (checkbox.checked && groupLimit > 0 && !alreadySelected) {
            const selectedCount = getSupplyAccountSelectionCount(poolKey);
            if (selectedCount >= groupLimit) {
              checkbox.checked = false;
              return;
            }
          }
  
          const nextKeys = currentSelectedKeys.filter((key) => {
            const selectedEntry = entryMap.get(key);
            return selectedEntry && String(selectedEntry.accountPoolKey || selectedEntry.groupKey || selectedEntry.key || '').trim() !== poolKey;
          });
  
          if (checkbox.checked) {
            nextKeys.push(entryKey);
          }
  
          updateSupplyCharacterSelection(current.key, nextKeys);
        });
      }
      if (els.supplyDetailEditor) {
        els.supplyDetailEditor.addEventListener('click', (event) => {
          const selectionKeys = getSupplySelectedCharacterKeys();
          const current = supplyCharacters.find((character) => character.key === supplyActiveCharacterKey)
            || supplyCharacters.find((character) => selectionKeys.includes(character.key))
            || supplyCharacters[0] || null;
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
  
      async function bootstrap() {
        setDevMode(readDevModePreference());
        syncPercentile(els.percentileNumber);
        updateSortIndicators();
        const loadedSupply = loadCachedSupplyCharacters();
        const loadedHell = loadCachedCharacterData();
        const activeTab = loadActiveTab();
  
        if (!loadedSupply) {
          clearSupplyCharacters('이 브라우저 저장소에 저장된 캐릭터가 없습니다.');
        } else if (hasMissingSupplyFame(supplyCharacters)) {
          void refreshSupplyCharacters();
        }
  
        setActiveTab(activeTab, false);
  
        if (loadedHell) {
          recalc();
        } else {
          clearCharacterData('이 브라우저 저장소에 저장된 캐릭터가 없습니다.');
        }
      }
  
      bootstrap();

  return () => {
    // 현재 레거시 컨트롤러는 이벤트 정리를 개별로 하지 않는다.
    // React StrictMode를 사용하지 않으면 개발 환경에서 중복 초기화 문제는 발생하지 않는다.
  };
}
