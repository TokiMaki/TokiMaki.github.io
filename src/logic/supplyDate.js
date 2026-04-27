import {
  SUPPLY_DAY_MS,
  SUPPLY_KST_OFFSET_MS,
  SUPPLY_RESET_HOUR,
} from '../data/supplyConstants.js';

// KST 06시 리셋 기준 날짜 계산.

export function getSupplyKstParts(date = new Date()) {
  const shifted = new Date(date.getTime() + SUPPLY_KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  };
}

export function makeSupplyKstDateMs(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
  return Date.UTC(year, month, day, hour - 9, minute, second, millisecond);
}

export function getSupplyCurrentContentDayStartMs(date = new Date()) {
  const parts = getSupplyKstParts(date);
  const dayOffset = parts.hour < SUPPLY_RESET_HOUR ? -1 : 0;
  return makeSupplyKstDateMs(parts.year, parts.month, parts.day + dayOffset, SUPPLY_RESET_HOUR);
}

export function getSupplyNextResetMs(date = new Date()) {
  const parts = getSupplyKstParts(date);
  let daysUntilThursday = (4 - parts.dayOfWeek + 7) % 7;
  const currentMinutes = parts.hour * 60 + parts.minute + (parts.second / 60) + (parts.millisecond / 60000);
  if (daysUntilThursday === 0 && currentMinutes >= SUPPLY_RESET_HOUR * 60) {
    daysUntilThursday = 7;
  }
  return makeSupplyKstDateMs(parts.year, parts.month, parts.day + daysUntilThursday, SUPPLY_RESET_HOUR);
}

export function getSupplyResetWindowCounts(date = new Date()) {
  const startMs = getSupplyCurrentContentDayStartMs(date);
  const endMs = getSupplyNextResetMs(date);
  let weekdayCount = 0;
  let weekendCount = 0;
  let dayCount = 0;
  
  for (let dayMs = startMs; dayMs < endMs; dayMs += SUPPLY_DAY_MS) {
    const parts = getSupplyKstParts(new Date(dayMs));
    const isWeekend = parts.dayOfWeek === 0 || parts.dayOfWeek === 6;
    if (isWeekend) {
      weekendCount += 1;
    } else {
      weekdayCount += 1;
    }
    dayCount += 1;
  }
  
  return {
    startMs,
    endMs,
    weekdayCount,
    weekendCount,
    dayCount,
  };
}

export function getSupplyTodayWindowCounts(date = new Date()) {
  const startMs = getSupplyCurrentContentDayStartMs(date);
  const dayParts = getSupplyKstParts(new Date(startMs));
  const isWeekend = dayParts.dayOfWeek === 0 || dayParts.dayOfWeek === 6;
  return {
    startMs,
    endMs: startMs + SUPPLY_DAY_MS,
    weekdayCount: isWeekend ? 0 : 1,
    weekendCount: isWeekend ? 1 : 0,
    dayCount: 1,
  };
}
