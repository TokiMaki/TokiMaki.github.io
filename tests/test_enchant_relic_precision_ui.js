import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function read(relativePath) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

const viewSource = read('../src/dnfHellTool/enchantView.js');
const replacementSource = read('../src/dnfHellTool/enchantEquipmentBodyReplacement.js');

assert.match(viewSource, /정밀 재료/);
assert.match(viewSource, /회 상당/);
assert.match(viewSource, /formatMaterialAmount\(Number\(row\.precisionOperationCount/);
assert.match(viewSource, /Number\.isInteger\(value\)/);
assert.match(viewSource, /precisionPercent: Number\(currentBody\.precisionPercent \|\| 0\)/);
assert.match(viewSource, /precisionAdventureFame: Number\(currentBody\.precisionAdventureFame \|\| 0\)/);
assert.match(viewSource, /function formatRelicCraftEffect\(row, isBuffer = false\)/);
assert.match(viewSource, /row\.relicCraftMode !== 'precision'/);
assert.match(viewSource, /row\.currentPrecisionEffects \|\| \{\}/);
assert.match(viewSource, /row\.targetPrecisionEffects \|\| \{\}/);
assert.match(viewSource, /const effectKey = isBuffer \? 'buffPower' : 'finalDamage'/);
assert.match(viewSource, /formatRelicCraftEffect\(row, isBufferMetric\)/);
assert.match(replacementSource, /targetBody\.precisionPercent/);
assert.match(replacementSource, /targetBody\.precisionAdventureFame/);

console.log('enchant relic precision ui: ok');
