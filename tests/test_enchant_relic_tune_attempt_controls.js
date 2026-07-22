import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function read(relativePath) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

const markup = read('../src/components/DnfHellToolMarkup.jsx');
const domRefs = read('../src/dnfHellTool/domRefs.js');
const storageKeys = read('../src/dnfHellTool/storageKeys.js');
const init = read('../src/dnfHellTool/initDnfHellTool.js');
const bindings = read('../src/dnfHellTool/eventBindings.js');
const view = read('../src/dnfHellTool/enchantView.js');

assert.match(markup, /id=\{'enchantRelicTuneAttemptRange'\}/);
assert.match(markup, /min=\{'10'\}/);
assert.match(markup, /max=\{'100'\}/);
assert.match(markup, /step=\{'5'\}/);
assert.match(markup, /defaultValue=\{'25'\}/);
assert.match(markup, /id=\{'enchantRelicTuneAttemptValue'\}/);

assert.match(domRefs, /enchantRelicTuneAttemptRange: \$id\('enchantRelicTuneAttemptRange'\)/);
assert.match(domRefs, /enchantRelicTuneAttemptValue: \$id\('enchantRelicTuneAttemptValue'\)/);
assert.match(storageKeys, /ENCHANT_RELIC_TUNE_ATTEMPT_STORAGE_KEY/);
assert.match(init, /ENCHANT_RELIC_TUNE_ATTEMPT_STORAGE_KEY/);

assert.match(bindings, /enchantRelicTuneAttemptRange\.addEventListener\('input'/);
assert.match(bindings, /renderEnchantTable\?\.\(\)/);
assert.match(bindings, /renderEnchantCharacterPortrait\?\.\(\)/);
assert.match(bindings, /ENCHANT_RELIC_TUNE_ATTEMPT_STORAGE_KEY/);

assert.match(view, /applyRelicCraftTuneAttemptCosts\(rawCandidate, tuneAttempts\)/);
assert.match(view, /getRelicCraftTuneAttempts\(\)/);
assert.match(view, /조율 재료 \('/);
assert.match(view, /selection\.appliedRecommendationSnapshot = adjustedSnapshot/);
assert.match(view, /selection\.goldWithoutMaterials = getRecommendationGold\(adjustedSnapshot, false\)/);
assert.match(view, /selection\.goldWithMaterials = getRecommendationGold\(adjustedSnapshot, true\)/);

console.log('enchant relic tune attempt controls: ok');
