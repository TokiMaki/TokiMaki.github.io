// 계시 수급 탭에서 쓰는 콘텐츠 표/프리셋 정의.

export function createSupplyContentConfig({ calcSupplyParts, calcDailyContentWeeklySupply }) {
  const HEAVEN_WEEKLY_BOUND_SUPPLY = calcDailyContentWeeklySupply(36, 31);

  const SUPPLY_CONTENT_GROUPS = [
    {
      key: 'apocalypse',
      label: '아포칼립스 : 안티엔바이',
      kind: 'tiered',
      contentType: 'legion',
      unlockDate: '2026-04-23T00:00:00+09:00',
      tiers: [
        { key: 'apocalypse-match', label: '매칭', minFame: 73993, ...calcSupplyParts(12, 9, 180) },
        { key: 'apocalypse-1', label: '1단', minFame: 98171, ...calcSupplyParts(12, 14, 240) },
        { key: 'apocalypse-2', label: '2단', minFame: 105881, ...calcSupplyParts(12, 17, 260) },
      ],
    },
    {
      key: 'venus',
      label: '미의 여신 베누스',
      kind: 'tiered',
      contentType: 'legion',
      tiers: [
        { key: 'venus-1', label: '1단', minFame: 41929, ...calcSupplyParts(5, 0, 60) },
        { key: 'venus-2', label: '2단/강림', minFame: 51527, ...calcSupplyParts(8, 0, 100) },
      ],
    },
    {
      key: 'nabel',
      label: '만들어진 신 나벨',
      kind: 'tiered',
      contentType: 'raid',
      tiers: [
        { key: 'nabel-single', label: '싱글', minFame: 47684, ...calcSupplyParts(7, 0, 90) },
        { key: 'nabel-match', label: '매칭', minFame: 47684, ...calcSupplyParts(8, 0, 110) },
        { key: 'nabel-normal', label: '일반/하드', minFame: 61757, ...calcSupplyParts(12, 0, 200) },
      ],
    },
    {
      key: 'diregie',
      label: '검은 질병의 디레지에',
      kind: 'tiered',
      contentType: 'raid',
      tiers: [
        { key: 'diregie-single', label: '싱글', minFame: 63257, ...calcSupplyParts(9, 5, 140) },
        { key: 'diregie-match', label: '매칭', minFame: 63257, ...calcSupplyParts(10, 6, 160) },
        { key: 'diregie-normal', label: '일반', minFame: 77399, ...calcSupplyParts(12, 9, 180) },
        { key: 'diregie-hard', label: '악연', minFame: 81799, ...calcSupplyParts(12, 10, 0, 180) },
      ],
    },
    {
      key: 'starbook',
      label: '별거북 대서고',
      minFame: 91631,
      ...calcSupplyParts(12, 12, 220),
      advancedDungeonKey: 'starbook',
      contentType: 'advanced',
    },
    {
      key: 'apostate',
      label: '배교자의 성',
      minFame: 101853,
      ...calcSupplyParts(12, 15, 240),
      advancedDungeonKey: 'apostate',
      contentType: 'advanced',
    },
    {
      key: 'dream',
      label: '해방된 흉몽',
      minFame: 71179,
      ...calcSupplyParts(12, 9, 180),
      advancedDungeonKey: 'dream',
      contentType: 'advanced',
    },
    {
      key: 'goddess',
      label: '죽음의 여신전',
      minFame: 48988,
      ...calcSupplyParts(11, 7, 140),
      advancedDungeonKey: 'goddess',
      contentType: 'advanced',
    },
    {
      key: 'azure',
      label: '애쥬어 메인',
      minFame: 44929,
      ...calcSupplyParts(10, 4, 100),
      advancedDungeonKey: 'azure',
      contentType: 'advanced',
    },
    {
      key: 'lake',
      label: '달이 잠긴 호수',
      minFame: 34749,
      ...calcSupplyParts(7, 3, 60),
      advancedDungeonKey: 'lake',
      contentType: 'advanced',
    },
    {
      key: 'heaven',
      label: '계시 : 천해를 품은 하늘',
      minFame: 33249,
      ...calcSupplyParts(14, 14, HEAVEN_WEEKLY_BOUND_SUPPLY),
      accountLimit: 20,
      accountPoolKey: 'heaven',
      contentType: 'bound',
    },
    {
      key: 'inner_twilight',
      label: '이내 황혼전',
      minFame: 72688,
      ...calcSupplyParts(12, 0, 0, 180),
      accountLimit: 8,
      accountPoolKey: 'inner-twilight',
      contentType: 'raid',
    },
  ];
    
  const SUPPLY_SHEET3_ROWS = [
    { key: 'apocalypse:apocalypse-2', label: '아포칼립스 2단계', gearMultiplier: 12, tunerMultiplier: 17, boundSupply: 260, accountSupply: 0, note: '' },
    { key: 'apocalypse:apocalypse-1', label: '아포칼립스 1단계', gearMultiplier: 12, tunerMultiplier: 14, boundSupply: 240, accountSupply: 0, note: '' },
    { key: 'apocalypse:apocalypse-match', label: '아포칼립스 매칭', gearMultiplier: 12, tunerMultiplier: 9, boundSupply: 180, accountSupply: 0, note: '' },
    { key: 'apostate', label: '배교자', gearMultiplier: 12, tunerMultiplier: 15, boundSupply: 240, accountSupply: 0, note: '' },
    { key: 'starbook', label: '별거북', gearMultiplier: 12, tunerMultiplier: 12, boundSupply: 220, accountSupply: 0, note: '' },
    { key: 'dream', label: '흉몽', gearMultiplier: 12, tunerMultiplier: 9, boundSupply: 180, accountSupply: 0, note: '' },
    { key: 'goddess', label: '여신전', gearMultiplier: 11, tunerMultiplier: 7, boundSupply: 140, accountSupply: 0, note: '' },
    { key: 'azure', label: '애쥬어', gearMultiplier: 10, tunerMultiplier: 4, boundSupply: 100, accountSupply: 0, note: '' },
    { key: 'lake', label: '호수', gearMultiplier: 7, tunerMultiplier: 3, boundSupply: 60, accountSupply: 0, note: '' },
    { key: 'diregie:diregie-hard', label: '디레 악연', gearMultiplier: 12, tunerMultiplier: 10, boundSupply: 0, accountSupply: 180, note: '' },
    { key: 'diregie:diregie-normal', label: '디레 보통', gearMultiplier: 12, tunerMultiplier: 9, boundSupply: 180, accountSupply: 0, note: '' },
    { key: 'diregie:diregie-match', label: '디레 매칭', gearMultiplier: 10, tunerMultiplier: 6, boundSupply: 160, accountSupply: 0, note: '' },
    { key: 'diregie:diregie-single', label: '디레 싱글', gearMultiplier: 9, tunerMultiplier: 5, boundSupply: 140, accountSupply: 0, note: '' },
    { key: 'inner_twilight', label: '이내황혼전', gearMultiplier: 12, tunerMultiplier: 0, boundSupply: 0, accountSupply: 180, note: '' },
    { key: 'nabel:nabel-normal', label: '나벨 레이드', gearMultiplier: 12, tunerMultiplier: 0, boundSupply: 200, accountSupply: 0, note: '' },
    { key: 'nabel:nabel-match', label: '나벨 매칭', gearMultiplier: 8, tunerMultiplier: 0, boundSupply: 110, accountSupply: 0, note: '' },
    { key: 'nabel:nabel-single', label: '나벨 싱글', gearMultiplier: 7, tunerMultiplier: 0, boundSupply: 90, accountSupply: 0, note: '' },
    { key: 'venus:venus-2', label: '베누스 2/3단계', gearMultiplier: 8, tunerMultiplier: 0, boundSupply: 100, accountSupply: 0, note: '' },
    { key: 'venus:venus-1', label: '베누스 1단계', gearMultiplier: 5, tunerMultiplier: 0, boundSupply: 60, accountSupply: 0, note: '' },
    { key: 'heaven', label: '계시:천해를 품은 하늘', gearMultiplier: 14, tunerMultiplier: 14, boundSupply: 345, accountSupply: 0, note: '일일컨텐츠, 하루에 피로도 8*2' },
  ];
  const SUPPLY_SHEET3_ROW_MAP = new Map(SUPPLY_SHEET3_ROWS.map((row) => [row.key, row]));

  const SUPPLY_CONTENT_TYPE_ORDER = ['bound', 'advanced', 'raid', 'legion'];
  const SUPPLY_CONTENT_TYPE_LABELS = {
    bound: '일일 콘텐츠',
    advanced: '상던',
    raid: '레이드',
    legion: '레기온',
  };
  const SUPPLY_CONTENT_ORDER = ['apostate', 'starbook', 'dream', 'goddess', 'azure', 'lake', 'heaven', 'apocalypse', 'nabel', 'diregie', 'venus', 'inner_twilight'];
  const SUPPLY_CONTENT_LABELS = {
    lake: '달이 잠긴 호수',
    azure: '애쥬어 메인',
    goddess: '죽음의 여신전',
    dream: '해방된 흉몽',
    starbook: '별거북 대서고',
    apostate: '배교자의 성',
    heaven: '계시 : 천해를 품은 하늘',
    apocalypse: '아포칼립스 : 안티엔바이',
    nabel: '만들어진 신 나벨',
    diregie: '검은 질병의 디레지에',
    venus: '미의 여신 베누스',
    inner_twilight: '이내 황혼전',
  };
  const SUPPLY_CONTENT_SHORT_LABELS = {
    lake: '호수',
    azure: '애쥬어',
    goddess: '여신전',
    dream: '흉몽',
    starbook: '별거북',
    apostate: '배교자',
    heaven: '천해',
    apocalypse: '아포칼립스',
    nabel: '나벨',
    diregie: '디레지에',
    venus: '베누스',
    inner_twilight: '이내 황혼전',
  };
    
  const SUPPLY_PRESET_DEFINITIONS = [
    { key: 'apocalypse-2', label: '아포칼립스 2단', anchorKey: 'apocalypse-2' },
    { key: 'apostate-starbook', label: '배교자+별거북', advancedKeys: ['apostate', 'starbook'] },
    { key: 'apocalypse-1', label: '아포칼립스 1단', anchorKey: 'apocalypse-1' },
    { key: 'starbook-dream', label: '별거북+흉몽', advancedKeys: ['starbook', 'dream'] },
    { key: 'apocalypse-match', label: '아포칼립스 매칭', anchorKey: 'apocalypse-match' },
    { key: 'dream-goddess', label: '흉몽+여신전', advancedKeys: ['dream', 'goddess'] },
    { key: 'diregie-match', label: '디레 매칭', anchorKey: 'diregie-match' },
    { key: 'venus-2', label: '베누스 2단', anchorKey: 'venus-2' },
    { key: 'goddess-azure', label: '여신전+애쥬어', advancedKeys: ['goddess', 'azure'] },
    { key: 'azure-lake', label: '애쥬어+호수', advancedKeys: ['azure', 'lake'] },
    { key: 'apocalypse-carry', label: '아포칼립스 업둥/쩔', forcedSelectionKeys: ['apocalypse:apocalypse-2'] },
    { key: 'diregie-carry', label: '디레지에 업둥/쩔', forcedSelectionKeys: ['diregie:diregie-hard'] },
    { key: 'all-carry', label: '전체 쩔/업둥', forcedSelectionKeys: ['diregie:diregie-hard', 'apocalypse:apocalypse-2'] },
    { key: 'default-selection', label: '자동 선택' },
  ];
  const SUPPLY_ADVANCED_KEYS = new Set(
    SUPPLY_CONTENT_GROUPS
      .filter((group) => group.contentType === 'advanced')
      .map((group) => group.key)
  );

  return {
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
  };
}
