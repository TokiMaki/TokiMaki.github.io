import assert from 'node:assert/strict';
import { installSupplySelectionRules } from '../src/dnfHellTool/supplySelectionRules.js';

const entries = [
  { key: 'advanced-low', groupKey: 'advanced-low-group', contentType: 'advanced', minFame: 100, available: true },
  { key: 'advanced-mid', groupKey: 'advanced-mid-group', contentType: 'advanced', minFame: 200, available: true },
  { key: 'advanced-high', groupKey: 'advanced-high-group', contentType: 'advanced', minFame: 300, available: true },
  { key: 'legion-low', groupKey: 'legion-low-group', contentType: 'legion', minFame: 100, available: true },
  { key: 'legion-high', groupKey: 'legion-high-group', contentType: 'legion', minFame: 300, available: true },
  { key: 'account-old', groupKey: 'account-group', accountPoolKey: 'account-pool', contentType: 'weekly', minFame: 100, available: true },
  { key: 'account-new', groupKey: 'account-group', accountPoolKey: 'account-pool', contentType: 'weekly', minFame: 200, available: true },
];

const ctx = {
  els: {},
  state: {},
  caches: {},
  deps: {},
  constants: {},
  config: {
    SORT_CONFIG: {},
    SUPPLY_ADVANCED_KEYS: new Set(['advanced-low-group', 'advanced-mid-group', 'advanced-high-group']),
    SUPPLY_CONTENT_GROUPS: [
      { key: 'advanced-low-group' },
      { key: 'advanced-mid-group' },
      { key: 'advanced-high-group' },
      { key: 'legion-low-group' },
      { key: 'legion-high-group' },
      { key: 'account-group', accountPoolKey: 'account-pool', accountLimit: 1 },
    ],
    SUPPLY_CONTENT_LABELS: {},
    SUPPLY_CONTENT_ORDER: [],
    SUPPLY_CONTENT_SHORT_LABELS: {},
    SUPPLY_CONTENT_TYPE_LABELS: {},
    SUPPLY_CONTENT_TYPE_ORDER: [],
    SUPPLY_PRESET_DEFINITIONS: [],
    SUPPLY_SHEET3_ROW_MAP: {},
    SUPPLY_SHEET3_ROWS: [],
  },
  actions: {
    isSupplyGroupUnlocked: () => true,
    getSupplyGroupKeyByEntryKey: () => '',
    isSupplyGroupDateUnlocked: () => true,
    getSupplyEntryOptionsForGroup: () => entries,
    getSupplyGroupRank: () => 0,
    getSupplyEntryFameByKey: () => 0,
    getSupplyEntryForGroup: () => null,
    getSupplyEntriesForFame: () => entries,
    compareSupplyGroupsByFameDesc: () => 0,
    getSupplyAccountSelectionCount: () => 0,
  },
};

installSupplySelectionRules(ctx);

const character = (selectedContentKeys) => ({ fame: 500, selectedContentKeys });

assert.deepEqual(
  ctx.actions.buildNextSupplyContentKeys(
    character(['advanced-low', 'advanced-mid']),
    { entryKey: 'advanced-high', groupKey: 'advanced-high-group', checked: true },
  ),
  ['advanced-mid', 'advanced-high'],
  'a higher-fame advanced entry should replace the lowest of two selected entries',
);

assert.deepEqual(
  ctx.actions.buildNextSupplyContentKeys(
    character(['legion-low']),
    { entryKey: 'legion-high', groupKey: 'legion-high-group', checked: true },
  ),
  ['legion-high'],
  'a legion entry should replace the existing legion selection',
);

assert.deepEqual(
  ctx.actions.buildNextSupplyContentKeys(
    character(['account-old']),
    { entryKey: 'account-new', groupKey: 'account-group', checked: true },
  ),
  ['account-new'],
  'entries in the same account pool should replace each other',
);

ctx.actions.getSupplyAccountSelectionCount = () => 1;
assert.deepEqual(
  ctx.actions.buildNextSupplyContentKeys(
    character(['advanced-low']),
    { entryKey: 'account-new', groupKey: 'account-group', checked: true },
  ),
  ['advanced-low'],
  'an exhausted account limit should preserve the current selection',
);

console.log('supply selection rules tests passed');
