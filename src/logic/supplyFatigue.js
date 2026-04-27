import {
  SUPPLY_CHARACTER_FATIGUE_POTIONS,
  SUPPLY_CHARACTER_FATIGUE_PROFILES,
  SUPPLY_USAGE_CONSTANTS,
} from '../data/supplyConstants.js';
import { fmtInt } from './formatters.js';

// 캐릭터별 피로도, 무료 헬, 계시 사용량 계산.

export function getSupplyCharacterHellRevelationPerRun(character) {
  const base = Number(SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun || 0);
  const discount = (Boolean(character?.pcBangBonus) ? SUPPLY_USAGE_CONSTANTS.hellPcBangDiscount : 0)
    + (Boolean(character?.aradPassBonus) ? SUPPLY_USAGE_CONSTANTS.hellAradPassDiscount : 0);
  return Math.max(0, base - discount);
}

export function normalizeSupplyCharacterFatigueMode(rawMode) {
  const normalized = String(rawMode || '').trim();
  if (normalized === 'pcBang' || normalized === 'weekendPcBang') return 'pcBang';
  return 'home';
}

export function normalizeSupplyCharacterFatiguePotions(rawPotions) {
  const source = Array.isArray(rawPotions)
    ? rawPotions
    : Object.keys(rawPotions || {}).filter((key) => Boolean(rawPotions?.[key]));
  
  const selected = [];
  source.forEach((rawKey) => {
    const key = String(rawKey || '').trim();
    if (SUPPLY_CHARACTER_FATIGUE_POTIONS[key] && !selected.includes(key)) {
      selected.push(key);
    }
  });
  return selected;
}

export function getSupplyCharacterFatigueMode(character) {
  const rawMode = character?.fatigueMode || character?.fatigueModeKey;
  return normalizeSupplyCharacterFatigueMode(rawMode);
}

export function getSupplyCharacterWeeklyFatigue(character) {
  const mode = getSupplyCharacterFatigueMode(character);
  const profile = SUPPLY_CHARACTER_FATIGUE_PROFILES[mode] || SUPPLY_CHARACTER_FATIGUE_PROFILES.home;
  return (
    Number(profile.weekdayFatigue || SUPPLY_USAGE_CONSTANTS.weekdayFatigue) * SUPPLY_USAGE_CONSTANTS.weekdayCount
    + Number(profile.weekendFatigue || SUPPLY_USAGE_CONSTANTS.weekendFatigue) * SUPPLY_USAGE_CONSTANTS.weekendCount
  );
}

export function getSupplyCharacterFatigueProfile(character) {
  const mode = getSupplyCharacterFatigueMode(character);
  return SUPPLY_CHARACTER_FATIGUE_PROFILES[mode] || SUPPLY_CHARACTER_FATIGUE_PROFILES.home;
}

export function getSupplyCharacterFatiguePotionKeys(character) {
  return normalizeSupplyCharacterFatiguePotions(
    character?.fatiguePotionKeys
    ?? character?.fatiguePotions
    ?? character?.fatigueBoostKeys
    ?? []
  );
}

export function getSupplyCharacterFatiguePotionFoldOpen(character) {
  return Boolean(character?.fatiguePotionFoldOpen);
}

export function getSupplyCharacterFatiguePotionDailyRuns(character) {
  return getSupplyCharacterFatiguePotionKeys(character)
    .reduce((sum, key) => sum + Math.max(1, Math.ceil(Number(SUPPLY_CHARACTER_FATIGUE_POTIONS[key]?.bonus || 0) / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun)), 0);
}

export function getSupplyCharacterFatigueLabel(character) {
  const mode = getSupplyCharacterFatigueMode(character);
  const profile = SUPPLY_CHARACTER_FATIGUE_PROFILES[mode] || SUPPLY_CHARACTER_FATIGUE_PROFILES.home;
  return `${profile.label} ${fmtInt(getSupplyCharacterWeeklyFatigue(character))}`;
}

export function calcHellUsageFromEntries(entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, fatigueMode = 'home', potionRunsPerDay = 0, dayCounts = null) {
  const profile = getSupplyCharacterFatigueProfile({ fatigueMode });
  const counts = dayCounts || {
    weekdayCount: SUPPLY_USAGE_CONSTANTS.weekdayCount,
    weekendCount: SUPPLY_USAGE_CONSTANTS.weekendCount,
    dayCount: SUPPLY_USAGE_CONSTANTS.weekdayCount + SUPPLY_USAGE_CONSTANTS.weekendCount,
  };
  const advancedCount = Array.isArray(entries)
    ? entries.filter((entry) => entry.contentType === 'advanced').length
    : 0;
  const hasHeaven = Array.isArray(entries)
    ? entries.some((entry) => String(entry?.key || entry?.accountPoolKey || '').trim() === 'heaven')
    : false;
  const weekdayRuns = Math.ceil(Number(profile.weekdayFatigue || SUPPLY_USAGE_CONSTANTS.weekdayFatigue) / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun)
    * Math.max(0, Number(counts.weekdayCount || 0));
  const weekendRuns = Math.ceil(Number(profile.weekendFatigue || SUPPLY_USAGE_CONSTANTS.weekendFatigue) / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun)
    * Math.max(0, Number(counts.weekendCount || 0));
  const advancedRunLoss = advancedCount * Math.ceil(SUPPLY_USAGE_CONSTANTS.advancedDungeonFatigue / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun);
  const fatigueHellRuns = Math.max(0, weekdayRuns + weekendRuns - advancedRunLoss);
  const freeHellRuns = hasHeaven ? SUPPLY_USAGE_CONSTANTS.freeHellPerDay * Math.max(0, Number(counts.dayCount || 0)) : 0;
  const totalPotionRuns = Math.max(0, Number(potionRunsPerDay || 0)) * Math.max(0, Number(counts.dayCount || 0));
  const revelationHellRuns = Math.max(0, fatigueHellRuns - freeHellRuns) + totalPotionRuns;
  const totalHellRuns = fatigueHellRuns + totalPotionRuns;
  const hellUsage = revelationHellRuns * Number(hellRevelationPerRun || 0);
  
  return {
    advancedCount,
    advancedRunLoss,
    hasHeaven,
    dayCount: Math.max(0, Number(counts.dayCount || 0)),
    weekdayRuns,
    weekendRuns,
    weeklyFatigue: Number(profile.weekdayFatigue || SUPPLY_USAGE_CONSTANTS.weekdayFatigue) * Math.max(0, Number(counts.weekdayCount || 0))
      + Number(profile.weekendFatigue || SUPPLY_USAGE_CONSTANTS.weekendFatigue) * Math.max(0, Number(counts.weekendCount || 0)),
    fatigueHellRuns,
    paidHellRuns: fatigueHellRuns,
    freeHellRuns,
    potionRuns: totalPotionRuns,
    revelationHellRuns,
    totalHellRuns,
    hellRevelationPerRun: Number(hellRevelationPerRun || 0),
    hellUsage,
  };
}

export function calcWeeklyUsageFromEntries(entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, fatigueMode = 'home', dailyPotionRuns = 0) {
  return calcHellUsageFromEntries(entries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, {
    weekdayCount: SUPPLY_USAGE_CONSTANTS.weekdayCount,
    weekendCount: SUPPLY_USAGE_CONSTANTS.weekendCount,
    dayCount: SUPPLY_USAGE_CONSTANTS.weekdayCount + SUPPLY_USAGE_CONSTANTS.weekendCount,
  });
}

export function calcResetUsageFromEntries(entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, fatigueMode = 'home', dailyPotionRuns = 0, date = new Date()) {
  return calcHellUsageFromEntries(entries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, getSupplyResetWindowCounts(date));
}

export function calcTodayUsageFromEntries(entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, fatigueMode = 'home', dailyPotionRuns = 0, date = new Date()) {
  return calcHellUsageFromEntries(entries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, getSupplyTodayWindowCounts(date));
}

export function calcTodayNeedFromCharacter(character, entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, date = new Date()) {
  const profile = getSupplyCharacterFatigueProfile(character);
  const counts = getSupplyTodayWindowCounts(date);
  const hasHeaven = Array.isArray(entries)
    ? entries.some((entry) => String(entry?.key || entry?.accountPoolKey || '').trim() === 'heaven')
    : false;
  const baseFatigue = (counts.weekendCount || 0) > 0
    ? profile.weekendFatigue
    : profile.weekdayFatigue;
  const todayFatigue = Number(baseFatigue || SUPPLY_USAGE_CONSTANTS.weekdayFatigue);
  const fatigueHellRuns = Math.ceil(todayFatigue / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun);
  const freeHellRuns = hasHeaven ? SUPPLY_USAGE_CONSTANTS.freeHellPerDay * Math.max(0, Number(counts.dayCount || 0)) : 0;
  const potionRuns = Number(getSupplyCharacterFatiguePotionDailyRuns(character) || 0);
  const revelationHellRuns = Math.max(0, fatigueHellRuns - freeHellRuns) + potionRuns;
  const hellUsage = revelationHellRuns * Number(hellRevelationPerRun || 0);
  return {
    dayCount: Math.max(0, Number(counts.dayCount || 0)),
    weekdayCount: Math.max(0, Number(counts.weekdayCount || 0)),
    weekendCount: Math.max(0, Number(counts.weekendCount || 0)),
    weeklyFatigue: todayFatigue,
    fatigueHellRuns,
    paidHellRuns: Math.max(0, fatigueHellRuns - freeHellRuns),
    freeHellRuns,
    potionRuns,
    revelationHellRuns,
    totalHellRuns: revelationHellRuns,
    hellRevelationPerRun: Number(hellRevelationPerRun || 0),
    hellUsage,
  };
}
