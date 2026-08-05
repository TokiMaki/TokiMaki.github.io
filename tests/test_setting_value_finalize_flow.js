import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const eventBindingsSource = readFileSync(
  new URL('../src/dnfHellTool/eventBindings.js', import.meta.url),
  'utf8',
);
const enchantViewSource = readFileSync(
  new URL('../src/dnfHellTool/enchantView.js', import.meta.url),
  'utf8',
);

assert.equal(
  eventBindingsSource.includes('/api/character-setting-value'),
  false,
  'character search must not trigger the old standalone setting-value analysis',
);
assert.equal(
  enchantViewSource.includes('/api/character-setting-value'),
  false,
  'enchant view must not use the old standalone setting-value analysis',
);
assert.equal(
  enchantViewSource.includes('/api/setting-value/finalize'),
  true,
  'enchant view must finalize the value from the completed upgrade-order context',
);
assert.equal(
  enchantViewSource.includes('settingValue.details'),
  true,
  'developer console must read itemized setting-value details',
);
assert.equal(
  enchantViewSource.includes("item.kind === 'enchant' ? formatEffects(item.effects || {})"),
  true,
  'developer console must reuse upgrade-order effect formatting for current enchants',
);
assert.equal(
  enchantViewSource.includes('가격기준: item.priceItemName'),
  true,
  'developer console must show the priced equivalent used for each row',
);

const loadFunctionStart = enchantViewSource.indexOf('async function loadEnchantRecommendationsAsync');
const loadFunctionEnd = enchantViewSource.indexOf('async function searchEnchantCharacter', loadFunctionStart);
const loadFunctionSource = enchantViewSource.slice(loadFunctionStart, loadFunctionEnd);
const renderIndex = loadFunctionSource.indexOf('renderEnchantTable();');
const timingIndex = loadFunctionSource.indexOf("flushEnchantTiming('complete');");
const scoreWaitIndex = loadFunctionSource.indexOf('await officialScorePromise;');
const finalizeIndex = loadFunctionSource.indexOf('void finalizeCurrentSettingValue(requestId);');

assert.ok(loadFunctionStart >= 0 && loadFunctionEnd > loadFunctionStart);
assert.ok(renderIndex >= 0, 'upgrade-order render must remain in the completed load flow');
assert.ok(timingIndex > renderIndex, 'completed timing must remain after the render');
assert.ok(scoreWaitIndex > timingIndex, 'official score must complete before the ranking snapshot is saved');
assert.ok(finalizeIndex > scoreWaitIndex, 'setting-value finalize must run only after upgrade-order loading and score lookup complete');

console.log('setting value finalize flow tests passed');
