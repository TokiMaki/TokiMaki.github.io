import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getEnchantLoadoutBadge } from '../src/dnfHellTool/enchantEquipmentLoadoutBoard.js';

assert.equal(
  getEnchantLoadoutBadge({ finalDamage: 3, elementAll: 15 })?.text,
  '3%/15',
);
assert.equal(
  getEnchantLoadoutBadge({ attackAmplification: 2.5, elementAll: 35 })?.text,
  '2.5%/35',
);
assert.equal(
  getEnchantLoadoutBadge(
    { int: 120 },
    [{ jobName: '마법사(여)', skills: [{ name: '퍼페티어', value: 3 }] }],
    { isBuffer: true, statName: '지능', jobName: '마법사(여)' },
  )?.text,
  '120/3Lv',
);
assert.equal(getEnchantLoadoutBadge({ attack: 110 }), null);

const rankingSource = readFileSync(
  new URL('../src/components/SettingValueRankingPage.jsx', import.meta.url),
  'utf8',
);
assert.equal(
  rankingSource.includes("enchant?.isEnd || enchant?.tier === '종결' ? ' is-end' : ''"),
  true,
  'end-tier enchants must keep the gold ranking badge class',
);

console.log('enchant loadout badge tests passed');
