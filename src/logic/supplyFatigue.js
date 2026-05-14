import {
  SUPPLY_CHARACTER_FATIGUE_POTIONS,
  SUPPLY_CHARACTER_FATIGUE_PROFILES,
  SUPPLY_USAGE_CONSTANTS,
} from '../data/supplyConstants.js';
import {
  getSupplyResetWindowCounts,
  getSupplyTodayWindowCounts,
} from './supplyDate.js';
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

function calcBoundFundedHellRuns(boundSupply, hellRevelationPerRun, eventBoundRevelationPerHellRun = 0) {
  const cost = Math.max(1, Number(hellRevelationPerRun || 0));
  const baseSupply = Math.max(0, Number(boundSupply || 0));
  const eventPerRun = Math.max(0, Number(eventBoundRevelationPerHellRun || 0));
  if (eventPerRun <= 0 || eventPerRun >= cost) {
    return Math.floor(baseSupply / cost);
  }
  
  let runs = Math.floor(baseSupply / cost);
  for (let index = 0; index < 100; index += 1) {
    const nextRuns = Math.floor((baseSupply + runs * eventPerRun) / cost);
    if (nextRuns === runs) return runs;
    runs = nextRuns;
  }
  return runs;
}

function calcUnlimitedRunPlan({
  baseBoundSupply,
  hellRevelationPerRun,
  eventBoundRevelationPerHellRun,
  unlimitedBaseRuns,
  unlimitedAdvancedRunLoss,
  unlimitedFatigueCost,
}) {
  const cost = Math.max(1, Number(hellRevelationPerRun || 0));
  const baseSupply = Math.max(0, Number(baseBoundSupply || 0));
  const eventPerRun = Math.max(0, Number(eventBoundRevelationPerHellRun || 0));
  const baseRuns = Math.max(0, Number(unlimitedBaseRuns || 0) - Number(unlimitedAdvancedRunLoss || 0));
  const fatigueCost = Math.max(1, Number(unlimitedFatigueCost || 0));
  let boundHellRuns = Math.floor(baseSupply / cost);
  let unlimitedRuns = baseRuns;
  
  for (let index = 0; index < 100; index += 1) {
    const boundHellRunLoss = Math.ceil((boundHellRuns * SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun) / fatigueCost);
    const nextUnlimitedRuns = Math.max(0, baseRuns - boundHellRunLoss);
    const eventEligibleRuns = boundHellRuns + nextUnlimitedRuns;
    const nextBoundHellRuns = eventPerRun > 0 && eventPerRun < cost
      ? Math.floor((baseSupply + (eventEligibleRuns * eventPerRun)) / cost)
      : Math.floor(baseSupply / cost);
    
    if (nextBoundHellRuns === boundHellRuns && nextUnlimitedRuns === unlimitedRuns) {
      unlimitedRuns = nextUnlimitedRuns;
      break;
    }
    boundHellRuns = nextBoundHellRuns;
    unlimitedRuns = nextUnlimitedRuns;
  }
  
  const boundHellRunLoss = Math.ceil((boundHellRuns * SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun) / fatigueCost);
  const eventEligibleRuns = boundHellRuns + unlimitedRuns;
  return {
    boundHellRuns,
    boundHellRunLoss,
    unlimitedRuns,
    eventEligibleRuns,
    eventBoundSupply: eventEligibleRuns * eventPerRun,
  };
}

export function calcHellUsageFromEntries(entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, fatigueMode = 'home', potionRunsPerDay = 0, dayCounts = null, eventBoundRevelationPerHellRun = 0) {
  const profile = getSupplyCharacterFatigueProfile({ fatigueMode });
  const counts = dayCounts || {
    weekdayCount: SUPPLY_USAGE_CONSTANTS.weekdayCount,
    weekendCount: SUPPLY_USAGE_CONSTANTS.weekendCount,
    mwfCount: 3,
    dayCount: SUPPLY_USAGE_CONSTANTS.weekdayCount + SUPPLY_USAGE_CONSTANTS.weekendCount,
  };
  const advancedCount = Array.isArray(entries)
    ? entries.filter((entry) => entry.contentType === 'advanced').length
    : 0;
  const unlimitedFatigueCost = (Array.isArray(entries) ? entries : [])
    .reduce((maxCost, entry) => Math.max(maxCost, Number(entry.unlimitedFatigueCost || 0)), 0);
  const hasHeaven = Array.isArray(entries)
    ? entries.some((entry) => String(entry?.key || entry?.accountPoolKey || '').trim() === 'heaven')
    : false;
  const contentBoundSupply = (Array.isArray(entries) ? entries : [])
    .reduce((sum, entry) => {
      const dailyBase = Number(entry.dailyBoundSupplyBase || 0);
      const dailyMwfBonus = Number(entry.dailyMwfBoundSupplyBonus || 0);
      if (dailyBase > 0 || dailyMwfBonus > 0) {
        return sum
          + dailyBase * Math.max(0, Number(counts.dayCount || 0))
          + dailyMwfBonus * Math.max(0, Number(counts.mwfCount || 0));
      }
      return sum + Number(entry.boundSupply || 0);
    }, 0);
  const weekdayRuns = Math.ceil(Number(profile.weekdayFatigue || SUPPLY_USAGE_CONSTANTS.weekdayFatigue) / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun)
    * Math.max(0, Number(counts.weekdayCount || 0));
  const weekendRuns = Math.ceil(Number(profile.weekendFatigue || SUPPLY_USAGE_CONSTANTS.weekendFatigue) / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun)
    * Math.max(0, Number(counts.weekendCount || 0));
  const advancedRunLoss = advancedCount * Math.ceil(SUPPLY_USAGE_CONSTANTS.advancedDungeonFatigue / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun);
  const weeklyFatigue = Number(profile.weekdayFatigue || SUPPLY_USAGE_CONSTANTS.weekdayFatigue) * Math.max(0, Number(counts.weekdayCount || 0))
      + Number(profile.weekendFatigue || SUPPLY_USAGE_CONSTANTS.weekendFatigue) * Math.max(0, Number(counts.weekendCount || 0));
  const heavenDailyFatigue = hasHeaven ? SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun * SUPPLY_USAGE_CONSTANTS.freeHellPerDay : 0;
  const baseContentFatigue = advancedCount * SUPPLY_USAGE_CONSTANTS.advancedDungeonFatigue
    + heavenDailyFatigue * Math.max(0, Number(counts.dayCount || 0));
  const remainingWeekdayFatigue = Math.max(0, Number(profile.weekdayFatigue || SUPPLY_USAGE_CONSTANTS.weekdayFatigue) - heavenDailyFatigue);
  const remainingWeekendFatigue = Math.max(0, Number(profile.weekendFatigue || SUPPLY_USAGE_CONSTANTS.weekendFatigue) - heavenDailyFatigue);
  const unlimitedAdvancedRunLoss = advancedCount * Math.ceil(SUPPLY_USAGE_CONSTANTS.advancedDungeonFatigue / Math.max(1, unlimitedFatigueCost));
  const unlimitedBaseRuns = unlimitedFatigueCost > 0
    ? (
        Math.ceil(remainingWeekdayFatigue / unlimitedFatigueCost) * Math.max(0, Number(counts.weekdayCount || 0))
        + Math.ceil(remainingWeekendFatigue / unlimitedFatigueCost) * Math.max(0, Number(counts.weekendCount || 0))
      )
    : 0;
  const unlimitedPlan = unlimitedFatigueCost > 0
    ? calcUnlimitedRunPlan({
        baseBoundSupply: contentBoundSupply,
        hellRevelationPerRun,
        eventBoundRevelationPerHellRun,
        unlimitedBaseRuns,
        unlimitedAdvancedRunLoss,
        unlimitedFatigueCost,
      })
    : null;
  const contentBoundHellRuns = unlimitedPlan
    ? unlimitedPlan.boundHellRuns
    : calcBoundFundedHellRuns(contentBoundSupply, hellRevelationPerRun, eventBoundRevelationPerHellRun);
  const eventBoundSupplyForContentHell = unlimitedPlan
    ? unlimitedPlan.eventBoundSupply
    : contentBoundHellRuns * Math.max(0, Number(eventBoundRevelationPerHellRun || 0));
  const contentBoundHellFatigue = contentBoundHellRuns * SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun;
  const contentFatigue = baseContentFatigue + contentBoundHellFatigue;
  const remainingFatigue = Math.max(0, weeklyFatigue - contentFatigue);
  const unlimitedBoundHellRunLoss = unlimitedPlan
    ? unlimitedPlan.boundHellRunLoss
    : Math.ceil(contentBoundHellFatigue / Math.max(1, unlimitedFatigueCost));
  const unlimitedRuns = unlimitedPlan ? unlimitedPlan.unlimitedRuns : 0;
  const unlimitedRunLoss = unlimitedRuns * Math.ceil(unlimitedFatigueCost / SUPPLY_USAGE_CONSTANTS.hellFatiguePerRun);
  const fatigueHellRuns = unlimitedFatigueCost > 0
    ? 0
    : Math.max(0, weekdayRuns + weekendRuns - advancedRunLoss);
  const freeHellRuns = hasHeaven ? SUPPLY_USAGE_CONSTANTS.freeHellPerDay * Math.max(0, Number(counts.dayCount || 0)) : 0;
  const totalPotionRuns = Math.max(0, Number(potionRunsPerDay || 0)) * Math.max(0, Number(counts.dayCount || 0));
  const revelationHellRuns = Math.max(0, fatigueHellRuns - freeHellRuns) + totalPotionRuns;
  const contentBoundHellRunsForUsage = unlimitedFatigueCost > 0 ? contentBoundHellRuns : 0;
  const totalHellRuns = fatigueHellRuns + totalPotionRuns + contentBoundHellRunsForUsage;
  const hellUsage = revelationHellRuns * Number(hellRevelationPerRun || 0);
  
  return {
    advancedCount,
    advancedRunLoss,
    contentFatigue,
    remainingFatigue,
    contentBoundSupply,
    eventBoundSupplyForContentHell,
    contentBoundHellRuns,
    contentBoundHellFatigue,
    contentBoundHellRunsForUsage,
    unlimitedRuns,
    unlimitedRunLoss,
    unlimitedBoundHellRunLoss,
    hasHeaven,
    dayCount: Math.max(0, Number(counts.dayCount || 0)),
    weekdayRuns,
    weekendRuns,
    weeklyFatigue,
    fatigueHellRuns,
    paidHellRuns: revelationHellRuns,
    freeHellRuns,
    potionRuns: totalPotionRuns,
    revelationHellRuns,
    totalHellRuns,
    hellRevelationPerRun: Number(hellRevelationPerRun || 0),
    hellUsage,
  };
}

export function calcWeeklyUsageFromEntries(entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, fatigueMode = 'home', dailyPotionRuns = 0, eventBoundRevelationPerHellRun = 0) {
  return calcHellUsageFromEntries(entries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, {
    weekdayCount: SUPPLY_USAGE_CONSTANTS.weekdayCount,
    weekendCount: SUPPLY_USAGE_CONSTANTS.weekendCount,
    mwfCount: 3,
    dayCount: SUPPLY_USAGE_CONSTANTS.weekdayCount + SUPPLY_USAGE_CONSTANTS.weekendCount,
  }, eventBoundRevelationPerHellRun);
}

function isRecurringWindowEntry(entry) {
  return Number(entry?.dailyBoundSupplyBase || 0) > 0
    || Number(entry?.dailyMwfBoundSupplyBonus || 0) > 0
    || Number(entry?.unlimitedFatigueCost || 0) > 0;
}

export function calcResetUsageFromEntries(entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, fatigueMode = 'home', dailyPotionRuns = 0, date = new Date(), eventBoundRevelationPerHellRun = 0) {
  const resetEntries = Array.isArray(entries)
    ? entries.filter(isRecurringWindowEntry)
    : entries;
  return calcHellUsageFromEntries(resetEntries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, getSupplyResetWindowCounts(date), eventBoundRevelationPerHellRun);
}

export function calcTodayUsageFromEntries(entries, hellRevelationPerRun = SUPPLY_USAGE_CONSTANTS.hellRevelationPerRun, fatigueMode = 'home', dailyPotionRuns = 0, date = new Date(), eventBoundRevelationPerHellRun = 0) {
  const todayEntries = Array.isArray(entries)
    ? entries.filter(isRecurringWindowEntry)
    : entries;
  return calcHellUsageFromEntries(todayEntries, hellRevelationPerRun, fatigueMode, dailyPotionRuns, getSupplyTodayWindowCounts(date), eventBoundRevelationPerHellRun);
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
  const totalHellRuns = fatigueHellRuns + potionRuns;
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
    totalHellRuns,
    hellRevelationPerRun: Number(hellRevelationPerRun || 0),
    hellUsage,
  };
}
