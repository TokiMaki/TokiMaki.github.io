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
assert.match(viewSource, /getRequiredEquipmentTuneRow/);
assert.match(viewSource, /equipmentTuneRequired/);
assert.match(viewSource, /simulatorRemovalLocked/);
assert.match(viewSource, /isRelicCraftPrecisionBodyChange/);
assert.match(viewSource, /isApplied && !isRemovalLocked/);
assert.match(viewSource, /유일 장비 구성에 따라 자동 적용되는 조율입니다/);
assert.match(viewSource, /cardMetricLabel = isRequiredEquipmentTune \? '필수 비용'/);
assert.match(viewSource, /function reapplyEquipmentTuneSelectionToCurrentState/);
assert.match(viewSource, /Math\.min\(variants\.length - 1, Number\(previousSelection\.selectedVariantIndex/);
assert.match(viewSource, /return replaceAppliedEquipmentTuneVariant\(selectedVariantIndex, \{/);
assert.match(viewSource, /beforeTuneSnapshotOverride: beforeTuneSnapshot/);
assert.match(viewSource, /function replaceAppliedEquipmentTuneVariant\(stepIndex, options = \{\}\)/);
assert.match(viewSource, /function getEquipmentTuneSelectionForBodyChangeReapply/);
assert.match(viewSource, /previousRequiredTune\?\.actionType === 'equipmentTunePlan'/);
assert.match(viewSource, /!simulator\?\.activeSelectionByGroup\?\.equipmentTuneRequired/);
assert.equal(
  (viewSource.match(/const previousTuneForReapply = getEquipmentTuneSelectionForBodyChangeReapply/g) || []).length,
  2,
);
assert.match(viewSource, /const previousEquipmentTune = isPrecisionChange/);
assert.equal(
  (viewSource.match(/reapplyEquipmentTuneSelectionToCurrentState\(previousTuneForReapply\)/g) || []).length,
  2,
);

console.log('enchant relic precision ui: ok');
