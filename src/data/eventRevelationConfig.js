// 주간 이벤트 계시 수급량 설정.
// 운영자가 이벤트 기간/수급량을 수정해서 배포하면 모든 사용자에게 같은 값이 적용된다.

export const EVENT_REVELATION_SOURCES = [
  {
    id: 'kingdom-wind',
    name: '허만수태라',
    enabled: true,
    startDate: '2026-04-09T06:00:00+09:00',
    endDate: '2026-05-07T05:59:59+09:00',
    weeklyRevelation: 900,
    dailyRevelation: 250,
    note: '',
  },
  {
    id: 'space-survivor',
    name: '우주 서바이버',
    enabled: true,
    startDate: '2026-04-23T06:00:00+09:00',
    endDate: '2026-05-21T05:59:59+09:00',
    weeklyRevelation: 1000,
    dailyRevelation: 250,
    note: '',
  },
  {
    id: 'module-research',
    name: '모듈 장비 연구',
    enabled: true,
    startDate: '2026-03-26T06:00:00+09:00',
    endDate: '2026-05-14T05:59:59+09:00',
    weeklyRevelation: 3900,
    dailyRevelation: 300,
    note: '일주일 모듈 30개 기준',
  },
  {
    id: 'miracle-note',
    name: '미라클 탐구 노트',
    enabled: true,
    startDate: '2026-03-26T06:00:00+09:00',
    endDate: '2026-05-14T05:59:59+09:00',
    weeklyRevelation: 1900,
    dailyRevelation: 250,
    note: '',
  },
  {
    id: 'treasure-hunt',
    name: '보물 찾기',
    enabled: true,
    startDate: '2026-04-23T06:00:00+09:00',
    endDate: '2026-06-04T05:59:59+09:00',
    weeklyRevelation: 1900,
    dailyRevelation: 250,
    note: '',
  },
  {
    id: 'hell-event-shop',
    name: '오라클 상점',
    enabled: true,
    startDate: '2026-03-26T06:00:00+09:00',
    endDate: '2026-05-14T05:59:59+09:00',
    weeklyRevelation: 0,
    dailyRevelation: 0,
    perHellRunRewards: [
      { chance: 0.116, revelation: 30, label: '상점 30계시' },
      { chance: 0.0116, revelation: 100, label: '상점 100계시' },
    ],
    note: '헬 1판마다 이벤트 상점 기대값을 계산한다.',
  },
  {
    id: 'digming-secret-nest',
    name: '디그밍의 비밀둥지',
    enabled: true,
    startDate: '2026-04-30T06:00:00+09:00',
    endDate: '2026-05-07T05:59:59+09:00',
    weeklyRevelation: 0,
    dailyRevelation: 1000,
    note: '당일에 안하면 500개 손해',
  },
  {
    id: 'find-alien',
    name: '찾아라! 외계인',
    enabled: true,
    startDate: '2026-05-14T06:00:00+09:00',
    endDate: '2026-06-04T05:59:59+09:00',
    weeklyRevelation: 1000,
    dailyRevelation: 250,
    note: '',
  },
  {
    id: 'romeu-adventure',
    name: '로메우 모험기록',
    enabled: true,
    startDate: '2026-05-14T06:00:00+09:00',
    endDate: '2026-06-04T05:59:59+09:00',
    weeklyRevelation: 5000,
    dailyRevelation: 0,
    note: '',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_RESET_DAY = 4; // Thursday in getUTCDay() after KST offset.
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

function countDailyEventDaysInWeeklyWindow(event, weekStartTime, weekEndTime) {
  const startTime = Math.max(parseDateTime(event.startDate, Number.NEGATIVE_INFINITY), weekStartTime);
  const endTime = Math.min(parseDateTime(event.endDate, Number.POSITIVE_INFINITY), weekEndTime);
  if (endTime <= startTime) return 0;
  return Math.ceil((endTime - startTime) / DAY_MS);
}

function calcPerHellRunRevelation(event, weeklyHellRuns) {
  const rewards = Array.isArray(event.perHellRunRewards) ? event.perHellRunRewards : [];
  const expectedPerRun = rewards.reduce((sum, reward) => {
    return sum + (Number(reward.chance || 0) * Number(reward.revelation || 0));
  }, 0);
  return {
    rewards,
    expectedPerRun,
    weeklyHellRuns,
    boundRevelation: expectedPerRun * weeklyHellRuns,
  };
}

export function getActiveWeeklyEventBoundRevelationSources(now = new Date()) {
  const nowTime = now instanceof Date ? now.getTime() : Date.parse(now);
  const weekStartTime = getKstWeekResetStart(nowTime);
  const weekEndTime = weekStartTime + WEEK_MS;
  return EVENT_REVELATION_SOURCES.filter((event) => {
    if (!event?.enabled) return false;
    const startTime = parseDateTime(event.startDate, Number.NEGATIVE_INFINITY);
    const endTime = parseDateTime(event.endDate, Number.POSITIVE_INFINITY);
    return weekEndTime > startTime && weekStartTime <= endTime;
  }).map((event) => {
    const perHellRun = calcPerHellRunRevelation(event, 1);
    return {
      id: event.id,
      name: event.name,
      note: event.note,
      rewards: perHellRun.rewards,
      expectedPerRun: perHellRun.expectedPerRun,
    };
  }).filter((source) => Number(source.expectedPerRun || 0) > 0);
}

export function getActiveWeeklyEventBoundRevelationPerHellRun(now = new Date()) {
  return getActiveWeeklyEventBoundRevelationSources(now).reduce((sum, source) => {
    return sum + Number(source.expectedPerRun || 0);
  }, 0);
}

export function getActiveWeeklyEventRevelationSummary(now = new Date()) {
  const nowTime = now instanceof Date ? now.getTime() : Date.parse(now);
  const weekStartTime = getKstWeekResetStart(nowTime);
  const weekEndTime = weekStartTime + WEEK_MS;
  const activeEvents = EVENT_REVELATION_SOURCES.filter((event) => {
    if (!event?.enabled) return false;
    const startTime = parseDateTime(event.startDate, Number.NEGATIVE_INFINITY);
    const endTime = parseDateTime(event.endDate, Number.POSITIVE_INFINITY);
    return weekEndTime > startTime && weekStartTime <= endTime;
  }).map((event) => {
    const weeklyRevelation = Number(event.weeklyRevelation || event.weeklyAccountRevelation || 0);
    const dailyRevelation = Number(event.dailyRevelation || 0);
    const dailyCount = countDailyEventDaysInWeeklyWindow(event, weekStartTime, weekEndTime);
    const accountRevelation = weeklyRevelation + (dailyRevelation * dailyCount);
    return {
      ...event,
      weeklyRevelation,
      dailyRevelation,
      dailyCount,
      accountRevelation,
      totalRevelation: accountRevelation,
    };
  }).filter((event) => {
    return Number(event.totalRevelation || 0) > 0;
  });

  const accountRevelation = activeEvents.reduce((sum, event) => {
    return sum + Number(event.accountRevelation || 0);
  }, 0);
  return {
    events: activeEvents,
    accountRevelation,
    totalRevelation: accountRevelation,
    weekStartTime,
    weekEndTime,
  };
}
