const EQUIPMENT_SLOTS = ['무기', '상의', '하의', '머리어깨', '벨트', '신발', '팔찌', '목걸이', '반지', '보조장비', '마법석', '귀걸이'];
const EQUIPMENT_ICON_IDS = [
  '157903e48399874bc18b35d276b3ef1b',
  'bc6170dcd3dd57209653e48c8aa6d7be',
  'fc0e7580aba2a53340fc2ca3ca1526b9',
  'eb390b33bfa5d2a59048c1d55338fd60',
  '395c319e0b61d490f3cb6955fc2b8586',
  'e26df89782c543dfa433cb3e3f3ce7a0',
  'b4d3acb705238a02f05700924519c9be',
  'eb3505a57a935c78fe27b97bda2ae4b2',
  '3e1bbfc7ed75c0419d41346f766d0b26',
  '6e1fcf6e59ed8d5a95dc152b84fe93ce',
  'df77236c51ea1274a3deb79c3e470695',
  '14449881bc371352c250502e7b201506',
];

function createEquipment(reinforceLevels, tuneLevels, relicSlots = [], endEnchantSlots = []) {
  const enchantBadges = ['15', '2%', '2%', '15', '15', '15', '15', '15', '15', '15', '2%', '2%'];
  return EQUIPMENT_SLOTS.map((slot, index) => ({
    slot,
    itemId: EQUIPMENT_ICON_IDS[index],
    rarity: relicSlots.includes(slot) ? 'primeval' : 'epic',
    reinforce: reinforceLevels[index],
    isAmplified: slot !== '무기',
    enchantBadge: enchantBadges[index],
    enchantTier: endEnchantSlots.includes(slot) ? 'end' : 'normal',
    tuneLevel: tuneLevels[index],
    isRelic: relicSlots.includes(slot),
  }));
}

export const SETTING_VALUE_RANKING_ROWS = [
  {
    rank: 1,
    character: {
      serverId: 'cain',
      characterId: 'e71f5681f80b9ba49bed82e659cd92aa',
      name: '마키로그',
      jobName: '도적',
      jobGrowName: '眞 로그',
    },
    serverLabel: '카인',
    equipmentScore: 150173,
    fame: 116721,
    settingValue: '4억 2,300만 골드',
    equipment: createEquipment(
      [13, 13, 14, 15, 16, 17, 13, 14, 15, 16, 17, 14],
      [0, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
      ['보조장비', '마법석', '귀걸이'],
      ['무기', '상의', '하의', '머리어깨', '보조장비', '마법석'],
    ),
    oathOffset: 0,
  },
  {
    rank: 2,
    character: {
      serverId: 'cain',
      characterId: 'd4913759db0fc8ae10bbdc992f643559',
      name: '마키남멬',
      jobName: '거너(남)',
      jobGrowName: '眞 메카닉',
    },
    serverLabel: '카인',
    equipmentScore: 89142,
    fame: 111707,
    settingValue: '2억 8,700만 골드',
    equipment: createEquipment(
      [12, 12, 12, 12, 11, 11, 12, 12, 11, 12, 12, 12],
      [0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3],
      ['마법석'],
      ['무기', '상의', '팔찌'],
    ),
    oathOffset: 1,
  },
  {
    rank: 3,
    character: {
      serverId: 'cain',
      characterId: '76e12fe9fc840006da46e5ebb4c8835d',
      name: '마키남슾',
      jobName: '격투가(남)',
      jobGrowName: '眞 스트리트파이터',
    },
    serverLabel: '카인',
    equipmentScore: 89436,
    fame: 111396,
    settingValue: '1억 9,600만 골드',
    equipment: createEquipment(
      [13, 11, 11, 12, 11, 11, 12, 12, 11, 12, 12, 12],
      [0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 3, 3],
      ['보조장비'],
      ['무기', '귀걸이'],
    ),
    oathOffset: 2,
  },
];
