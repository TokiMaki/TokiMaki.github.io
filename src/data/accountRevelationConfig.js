// 주간 계귀계시 추가 수급량 설정.
// 콘텐츠 표에 아직 반영되지 않은 계정 단위 계귀계시 수급원이 생기면 여기에 추가한다.

export const ACCOUNT_REVELATION_SOURCES = [
  {
    id: 'raid-shop',
    name: '레이드 상점',
    enabled: true,
    startDate: '',
    endDate: '',
    weeklyRevelation: 8000,
    dailyRevelation: 0,
    note: '',
  },
  {
    id: 'mysterious-power-book',
    name: '신비한 힘의 마법서',
    enabled: true,
    startDate: '',
    endDate: '',
    weeklyRevelation: 1000,
    dailyRevelation: 0,
    note: '',
  },
  {
    id: 'paradox-maze',
    name: '역설의 미궁',
    enabled: true,
    startDate: '',
    endDate: '',
    weeklyRevelation: 0,
    dailyRevelation: 100,
    note: '',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_RESET_DAY = 4;
const WEEK_RESET_HOUR = 6;

function parseDateTime(value, fallback) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  const time = Date.parse(text);
  return Number.isFinite(time) ? time : fallback;
}

function getKstWeekResetStart(time) {
  const shifted = new Date(time + KST_OFFSET_MS);
  const day = shifted.getUTCDay();
  const hour = shifted.getUTCHours();
  const daysSinceResetDay = (day - WEEK_RESET_DAY + 7) % 7;
  const resetDate = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - daysSinceResetDay,
    WEEK_RESET_HOUR,
    0,
    0,
    0
  ) - KST_OFFSET_MS;

  return day === WEEK_RESET_DAY && hour < WEEK_RESET_HOUR
    ? resetDate - WEEK_MS
    : resetDate;
}

function countDailySourceDaysInWeeklyWindow(source, weekStartTime, weekEndTime) {
  const startTime = Math.max(parseDateTime(source.startDate, Number.NEGATIVE_INFINITY), weekStartTime);
  const endTime = Math.min(parseDateTime(source.endDate, Number.POSITIVE_INFINITY), weekEndTime);
  if (endTime <= startTime) return 0;
  return Math.ceil((endTime - startTime) / DAY_MS);
}

export function getActiveWeeklyAccountRevelationSummary(now = new Date()) {
  const nowTime = now instanceof Date ? now.getTime() : Date.parse(now);
  const weekStartTime = getKstWeekResetStart(nowTime);
  const weekEndTime = weekStartTime + WEEK_MS;
  const activeSources = ACCOUNT_REVELATION_SOURCES.filter((source) => {
    if (!source?.enabled) return false;
    const startTime = parseDateTime(source.startDate, Number.NEGATIVE_INFINITY);
    const endTime = parseDateTime(source.endDate, Number.POSITIVE_INFINITY);
    return weekEndTime > startTime && weekStartTime <= endTime;
  }).map((source) => {
    const weeklyRevelation = Number(source.weeklyRevelation || 0);
    const dailyRevelation = Number(source.dailyRevelation || 0);
    const dailyCount = countDailySourceDaysInWeeklyWindow(source, weekStartTime, weekEndTime);
    const totalRevelation = weeklyRevelation + (dailyRevelation * dailyCount);
    return {
      ...source,
      weeklyRevelation,
      dailyRevelation,
      dailyCount,
      totalRevelation,
    };
  });

  const totalRevelation = activeSources.reduce((sum, source) => sum + Number(source.totalRevelation || 0), 0);

  return {
    sources: activeSources,
    totalRevelation,
    weekStartTime,
    weekEndTime,
  };
}
