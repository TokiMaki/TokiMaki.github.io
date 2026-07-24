import { createSupplyContentConfig } from '../data/supplyContentConfig.js';
import { getActiveWeeklyAccountRevelationSummary } from '../data/accountRevelationConfig.js';
import {
  getActiveWeeklyEventBoundRevelationSources,
  getActiveWeeklyEventBoundRevelationPerHellRun,
  getActiveWeeklyEventRevelationSummary,
} from '../data/eventRevelationConfig.js';
import {
  SUPPLY_CHARACTER_FATIGUE_POTIONS,
  SUPPLY_CHARACTER_FATIGUE_PROFILES,
  SUPPLY_USAGE_CONSTANTS,
} from '../data/supplyConstants.js';
import {
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
  getCharacterAvatarUrl,
  getCharacterLabel,
  getCharacterNameOnly,
  getCharacterPortraitMarkup,
} from './characterPresentation.js';
import { createToolDomRefs } from './domRefs.js';
import { normalizeCharacters } from './hellCharacterData.js';
import { createNamespacedCache } from './storageCache.js';
import {
  ACTIVE_TAB_STORAGE_KEY,
  API_BASE,
  CHARACTER_CACHE_BACKUP_KEY,
  CHARACTER_CACHE_PREFIX,
  DEV_MODE_STORAGE_KEY,
  ENCHANT_INCLUDE_FILTER_STORAGE_KEY,
  ENCHANT_INCLUDE_KNOWN_FILTER_STORAGE_KEY,
  ENCHANT_MATERIAL_COST_STORAGE_KEY,
  ENCHANT_RELIC_TUNE_ATTEMPT_STORAGE_KEY,
  ENABLE_DEV_MODE,
  normalizeApiErrorMessage,
  parseApiJsonResponse,
  STORAGE_NAMESPACE_KEY,
  STORAGE_SCOPE_LABEL,
  SUPPLY_CACHE_BACKUP_KEY,
  SUPPLY_CACHE_PREFIX,
  SUPPLY_SOUL_EXCLUDED_KEYS_STORAGE_KEY,
  SUPPLY_SOUL_USAGE_RATES_STORAGE_KEY,
} from './storageKeys.js';
import { installBrowserState } from './browserState.js';
import { installSupplySheetRows } from './supplySheetRows.js';
import { installHellCharacterState } from './hellCharacterState.js';
import { installSupplyContentRules } from './supplyContentRules.js';
import { installSupplySelectionRules } from './supplySelectionRules.js';
import { installSupplyRenderSections } from './supplyRenderSections.js';
import { installSupplyStateActions } from './supplyStateActions.js';
import { installSupplyViewApi } from './supplyViewApi.js';
import { installHellApiState } from './hellApiState.js';
import { installHellRenderCalc } from './hellRenderCalc.js';
import { installEnchantView } from './enchantView.js';
import { bindToolEvents } from './eventBindings.js';
import { installBootstrap } from './bootstrap.js';
import { createToolLifecycle } from './toolLifecycle.js';

function createToolState() {
  return {
    debounceTimer: null,
    lastResults: [],
    activeCharacters: null,
    activeCharactersSource: '로드 대기',
    hasCharacterData: false,
    storageNamespace: '',
    isDevMode: false,
    sortState: { key: 'selectedHellCost', direction: 'asc' },
    supplyCharacters: [],
    supplyCharactersSource: '로드 대기',
    supplyActiveCharacterKey: '',
    supplySelectedCharacterKeys: new Set(),
    supplySelectionAnchorKey: '',
    supplySoulExcludedKeys: new Set(),
    supplySoulUsageRates: {},
    supplyDerivedHellCalc: null,
  };
}

function createToolConfig() {
  const SORT_CONFIG = {
    name: { type: 'string', getValue: (result) => getCharacterLabel(result) },
    selectedHellCost: { type: 'number', getValue: (result) => result.selectedHellCost },
    craftCost: { type: 'number', getValue: (result) => result.craftBest.craftCost },
    ratio: { type: 'number', getValue: (result) => result.ratio },
  };
  return {
    SORT_CONFIG,
    ...createSupplyContentConfig({ calcSupplyParts, calcIndependentSupplyParts, calcDailyContentWeeklySupply }),
    getActiveWeeklyAccountRevelationSummary,
    getActiveWeeklyEventBoundRevelationSources,
    getActiveWeeklyEventBoundRevelationPerHellRun,
    getActiveWeeklyEventRevelationSummary,
  };
}

function createToolContext(els, lifecycle) {
  const state = createToolState();
  const config = createToolConfig();
  const deps = {
    applySelectedPercentile, calcCharacter, calcFragmentExpectation, calcNetCost,
    calcDailyContentWeeklySupply, calcIndependentSupplyParts, calcResetUsageFromEntries, calcSoulRecoveryRows, calcSupplyParts, calcSupplyPartsFromEntries,
    calcTodayNeedFromCharacter, calcTodayUsageFromEntries, calcWeeklyUsageFromEntries,
    getSupplyCharacterFatigueLabel, getSupplyCharacterFatigueMode, getSupplyCharacterFatiguePotionDailyRuns,
    getSupplyCharacterFatiguePotionFoldOpen, getSupplyCharacterFatiguePotionKeys, getSupplyCharacterFatigueProfile,
    getSupplyCharacterHellRevelationPerRun, getSupplyCharacterWeeklyFatigue, mergeSupplyRecoveryRows,
    normalizeSupplyCharacterFatigueMode, normalizeSupplyCharacterFatiguePotions, normalizeSupplyParts, summarizeSoulRecoveryParts,
    escapeHtml, fmtCost, fmtDecimal, fmtInt, fmtRevelation, getServerLabel,
    bindCharacterAvatars, getCharacterAvatarMarkup, getCharacterAvatarUrl, getCharacterLabel, getCharacterNameOnly, getCharacterPortraitMarkup, normalizeCharacters,
  };
  const constants = {
    ACTIVE_TAB_STORAGE_KEY, API_BASE, DEV_MODE_STORAGE_KEY, ENCHANT_INCLUDE_FILTER_STORAGE_KEY, ENCHANT_INCLUDE_KNOWN_FILTER_STORAGE_KEY, ENCHANT_MATERIAL_COST_STORAGE_KEY, ENCHANT_RELIC_TUNE_ATTEMPT_STORAGE_KEY, ENABLE_DEV_MODE, normalizeApiErrorMessage, parseApiJsonResponse, STORAGE_NAMESPACE_KEY, STORAGE_SCOPE_LABEL, SUPPLY_SOUL_EXCLUDED_KEYS_STORAGE_KEY, SUPPLY_SOUL_USAGE_RATES_STORAGE_KEY,
    SUPPLY_CHARACTER_FATIGUE_POTIONS, SUPPLY_CHARACTER_FATIGUE_PROFILES, SUPPLY_USAGE_CONSTANTS,
  };
  const ctx = { els, state, config, deps, constants, lifecycle, caches: {}, actions: {}, disposers: [] };

  installBrowserState(ctx);
  ctx.caches.characterCache = createNamespacedCache({
    prefix: CHARACTER_CACHE_PREFIX,
    backupKey: CHARACTER_CACHE_BACKUP_KEY,
    getNamespace: ctx.actions.getStorageNamespace,
  });
  ctx.caches.supplyCache = createNamespacedCache({
    prefix: SUPPLY_CACHE_PREFIX,
    backupKey: SUPPLY_CACHE_BACKUP_KEY,
    getNamespace: ctx.actions.getStorageNamespace,
  });

  installSupplySheetRows(ctx);
  installHellCharacterState(ctx);
  installSupplyContentRules(ctx);
  installSupplySelectionRules(ctx);
  installSupplyRenderSections(ctx);
  installSupplyStateActions(ctx);
  installSupplyViewApi(ctx);
  installHellApiState(ctx);
  installHellRenderCalc(ctx);
  ctx.disposers.push(installEnchantView(ctx));
  installBootstrap(ctx);
  return ctx;
}

export function initDnfHellTool() {
  const lifecycle = createToolLifecycle();
  let ctx = null;
  const cleanup = (preservedError = null) => {
    let cleanupError = null;
    const disposers = ctx?.disposers?.splice(0).reverse() || [];
    disposers.forEach((dispose) => {
      try {
        dispose?.();
      } catch (error) {
        cleanupError ||= error;
      }
    });
    try {
      lifecycle.dispose();
    } catch (error) {
      cleanupError ||= error;
    }
    if (preservedError) throw preservedError;
    if (cleanupError) throw cleanupError;
  };

  try {
    const els = createToolDomRefs();
    ctx = createToolContext(els, lifecycle);
    ctx.disposers.push(bindToolEvents(ctx));
    ctx.actions.bootstrap();
    return cleanup;
  } catch (error) {
    cleanup(error);
  }
}
