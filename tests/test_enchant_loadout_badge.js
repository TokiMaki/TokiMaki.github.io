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
assert.equal(
  rankingSource.includes("equipment.isRelic && Number(equipment.precisionPercent) >= 100 ? ' is-relic-precision-max' : ''"),
  true,
  'ranking relic sheen must only activate at 100 percent precision',
);

const rankingCss = readFileSync(
  new URL('../src/styles/setting-value-ranking.css', import.meta.url),
  'utf8',
);
assert.equal(
  rankingCss.includes('.setting-value-equipment-item.is-relic.is-relic-precision-max .enchant-character-slot::before'),
  true,
  'ranking internal relic sheen must require maximum precision',
);
assert.equal(
  rankingCss.includes('will-change: background-position, opacity'),
  true,
  'ranking relic sheen must hint the animated paint properties',
);
assert.equal(
  rankingCss.includes('90% { opacity: 1; }'),
  true,
  'ranking relic sheen must fade out before its loop resets',
);

const loadoutSource = readFileSync(
  new URL('../src/dnfHellTool/enchantEquipmentLoadoutBoard.js', import.meta.url),
  'utf8',
);
assert.equal(
  loadoutSource.includes("isEndEnchant: Boolean(enchant.isEnd || enchant.tier === '종결')"),
  true,
  'the upgrade-order loadout must retain the server-provided end-tier state',
);
assert.equal(
  loadoutSource.includes("${data.isEndEnchant ? ' is-end' : ''}${data.isSimulatedEnchant ? ' is-simulated' : ''}"),
  true,
  'simulated end enchants must render both classes so simulation styling can win',
);
assert.equal(
  loadoutSource.includes('isRelic: Boolean(equipment.isRelic)'),
  true,
  'the upgrade-order loadout must retain the server-provided relic state',
);
assert.equal(
  loadoutSource.includes('equipment.isRelic && Number(equipment.precisionPercent) >= 100'),
  true,
  'the internal relic sheen must only activate at 100 percent precision',
);
assert.equal(
  loadoutSource.includes("${data?.isMaxRelicPrecision ? ' is-relic-precision-max' : ''}"),
  true,
  'maximum-precision relic equipment must render the dedicated sheen class',
);
assert.equal(
  loadoutSource.includes("${data?.isRelic ? ' is-relic' : ''}"),
  true,
  'relic equipment must render the shared relic visual class',
);

const relicCss = readFileSync(
  new URL('../src/styles/equipment-relic-visual.css', import.meta.url),
  'utf8',
);
assert.equal(
  relicCss.includes('.enchant-character-slot-wrap.equipment-loadout-item.is-relic::after'),
  true,
  'the upgrade-order loadout must use the full prismatic relic frame',
);
assert.equal(
  relicCss.includes('.enchant-character-slot-wrap.equipment-loadout-item.is-relic::before'),
  true,
  'relic corner facets must use the wrapper layer so simulator sweep remains visible',
);
assert.equal(
  relicCss.includes('.is-relic.is-relic-precision-max .enchant-character-slot::before'),
  true,
  'the moving internal sheen must require maximum relic precision',
);
assert.equal(
  relicCss.includes('will-change: background-position, opacity'),
  true,
  'loadout relic sheen must hint the animated paint properties',
);
assert.equal(
  relicCss.includes('90% { opacity: 1; }'),
  true,
  'loadout relic sheen must fade out before its loop resets',
);

const supplyCss = readFileSync(
  new URL('../src/styles/supply.css', import.meta.url),
  'utf8',
);
const endStyleIndex = supplyCss.indexOf('.enchant-character-slot-enchant-badge.is-end');
const simulatedStyleIndex = supplyCss.indexOf('.enchant-character-slot-enchant-badge.is-simulated');
assert.equal(endStyleIndex >= 0, true, 'the end-tier enchant style must be shared');
assert.equal(
  simulatedStyleIndex > endStyleIndex,
  true,
  'simulation styling must follow and override the end-tier gold style',
);

console.log('enchant loadout badge tests passed');
