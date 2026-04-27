// 계시 수급/피로도 계산에서 여러 화면이 함께 쓰는 상수.

export const CHARACTER_AVATAR_CLASS_BY_JOB = {
  '귀검사(남)': 'gh-m',
  '귀검사(여)': 'gh-f',
  '거너(남)': 'gn-m',
  '거너(여)': 'gn-f',
  '마법사(남)': 'mg-m',
  '마법사(여)': 'mg-f',
  '프리스트(남)': 'pr-m',
  '프리스트(여)': 'pr-f',
  '격투가(남)': 'fi-m',
  '격투가(여)': 'fi-f',
  '도적': 'th',
  '나이트': 'kng',
  '마창사': 'mc',
  '총검사': 'gs',
  '아처': 'ac',
};

export const SUPPLY_FORMULA_CONSTANTS = {
  gearRecoveryPerRun: 5.48,
  tuningRecoveryPerRun: 6.52,
  hellCostPerRun: 44,
  recoveryPerHell: 14.602180152211282,
};

export const SUPPLY_SOUL_RECOVERY_RARITIES = [
  { key: 'rare', label: '레어 소울', decisionLabel: '레어 결정', gearRate: 0.25, tunerRate: 0.25, tunerHellRate: 0.25, gearValue: 2, dimSoulCount: 1 },
  { key: 'unique', label: '유니크 소울', decisionLabel: '유니크 결정', gearRate: 0.2, tunerRate: 0.2, tunerHellRate: 0.3, gearValue: 4, dimSoulCount: 2 },
  { key: 'legendary', label: '레전더리 소울', decisionLabel: '레전더리 결정', gearRate: 0.036, tunerRate: 0.035, tunerHellRate: 0.055673674040252148, gearValue: 30, dimSoulCount: 10 },
  { key: 'epic', label: '에픽 소울', decisionLabel: '에픽 결정', gearRate: 0.016, tunerRate: 0.016, tunerHellRate: 0.021113092839497527, gearValue: 90, dimSoulCount: 30 },
  { key: 'taecho', label: '태초 소울', decisionLabel: '태초 결정', gearRate: 0.00166, tunerRate: 0.0015, tunerHellRate: 0.0024041551246537394, gearValue: 1000, dimSoulCount: 100 },
];

export const SUPPLY_USAGE_CONSTANTS = {
  weekdayFatigue: 156,
  weekendFatigue: 176,
  weekdayCount: 5,
  weekendCount: 2,
  advancedDungeonFatigue: 30,
  hellFatiguePerRun: 8,
  hellRevelationPerRun: 49,
  hellPcBangDiscount: 5,
  hellAradPassDiscount: 5,
  freeHellPerDay: 2,
  freeHellDaysPerWeek: 7,
};

export const SUPPLY_KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const SUPPLY_DAY_MS = 24 * 60 * 60 * 1000;
export const SUPPLY_RESET_HOUR = 6;

export const SUPPLY_CHARACTER_FATIGUE_PROFILES = {
  home: { label: '집', weekdayFatigue: 156, weekendFatigue: 176 },
  pcBang: { label: '피시방', weekdayFatigue: 234, weekendFatigue: 274 },
};

export const SUPPLY_CHARACTER_FATIGUE_POTIONS = {
  auction30: { label: '경매장 영약', bonus: 30 },
  seraShop30: { label: '세라샵 30', bonus: 30 },
  seraShop1: { label: '세라샵 1', bonus: 1 },
  pcBangToken10: { label: '피시방 10', bonus: 10 },
  pcBangToken30: { label: '피시방 30', bonus: 30 },
};
