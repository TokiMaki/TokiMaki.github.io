import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  isRelicCraftEquipmentSetPointEligible,
  replaceEquipmentBodyInRows,
  replaceEquipmentBodyPreservingState,
  resolveCanonicalEquipmentSlotId,
  resolveCanonicalEquipmentSlotName,
} from '../src/dnfHellTool/enchantEquipmentBodyReplacement.js';

const base = {
  slotId: 'MAGIC_STON',
  slot: '마법석',
  itemId: 'current-magic-stone',
  itemName: '현재 마법석',
  itemRarity: '에픽',
  iconUrl: 'current-icon',
  bodyEffects: { finalDamage: 25, buffPower: 100 },
  bodyExplain: 'current explain',
  itemReinforceSkill: [{ jobName: '공통', skills: [] }],
  itemBuff: { explain: 'current buff' },
  tuneSetPoint: 215,
  tuneLevel: 2,
  tuneUpgradeable: true,
  tuneRemaining: 1,
  reinforce: 12,
  refine: 8,
  isAmplified: true,
  amplificationName: '차원의 지능',
  enchant: { itemId: 'enchant' },
  activeActionMarker: 'keep-me',
};
const perfume = {
  slotId: 'MAGIC_STON',
  slotName: '마법석',
  itemId: 'df77236c51ea1274a3deb79c3e470695',
  itemName: '우아한 기품의 향수',
  itemRarity: '태초',
  iconUrl: 'perfume-icon',
  effects: { finalDamage: 70.67376612, attackIncrease: 45, buffPower: 17580 },
  precisionPercent: 100,
  precisionAdventureFame: 1000,
  itemExplain: 'perfume explain',
  itemReinforceSkill: [{ jobName: '공통', skills: [{ name: '버프', value: 1 }] }],
  itemBuff: { explain: 'perfume buff' },
  tuneLevel: 0,
  tuneSetPoint: 145,
  tuneUpgradeable: false,
  tuneRemaining: 0,
};

assert.equal(resolveCanonicalEquipmentSlotId({ slotName: '마법석' }), 'MAGIC_STON');
assert.equal(resolveCanonicalEquipmentSlotName({ slotId: 'MAGIC_STON' }), '마법석');
assert.equal(isRelicCraftEquipmentSetPointEligible({ sourceType: 'blackFang' }), true);
assert.equal(isRelicCraftEquipmentSetPointEligible({
  sourceType: 'relicCraft',
  currentEquipmentSetPoint: 2620,
  minimumCurrentEquipmentSetPoint: 2620,
}), true);
assert.equal(isRelicCraftEquipmentSetPointEligible({
  sourceType: 'relicCraft',
  currentEquipmentSetPoint: 2619,
  minimumCurrentEquipmentSetPoint: 2620,
}), false);
assert.equal(isRelicCraftEquipmentSetPointEligible({
  sourceType: 'relicCraft',
  currentEquipmentSetPoint: 2619,
  minimumCurrentEquipmentSetPoint: 2620,
  requiredEquipmentTuneReachable: true,
}), true);
assert.equal(isRelicCraftEquipmentSetPointEligible({
  sourceType: 'relicCraft',
  currentEquipmentSetPoint: 2620,
  minimumCurrentEquipmentSetPoint: 2620,
  requiredEquipmentTuneReachable: false,
}), false);
assert.equal(isRelicCraftEquipmentSetPointEligible({ sourceType: 'relicCraft' }), true);

const applied = replaceEquipmentBodyPreservingState(base, perfume);
assert.equal(applied.itemId, perfume.itemId);
assert.deepEqual(applied.bodyEffects, perfume.effects);
assert.equal(applied.precisionPercent, 100);
assert.equal(applied.precisionAdventureFame, 1000);
assert.equal(applied.tuneSetPoint, 145);
assert.equal(applied.tuneLevel, 0);
assert.equal(applied.tuneUpgradeable, false);
assert.equal(applied.tuneRemaining, 0);
for (const key of [
  'reinforce', 'refine', 'isAmplified', 'amplificationName', 'enchant', 'activeActionMarker',
]) {
  assert.deepEqual(applied[key], base[key], `${key} is preserved`);
}
const tunableReplacement = replaceEquipmentBodyPreservingState(base, {
  ...perfume,
  itemRarity: '에픽',
  tuneLevel: undefined,
  tuneUpgradeable: true,
  tuneRemaining: undefined,
});
assert.equal(tunableReplacement.tuneLevel, base.tuneLevel);
assert.equal(tunableReplacement.tuneRemaining, base.tuneRemaining);
assert.equal(tunableReplacement.tuneUpgradeable, true);
const conditionalReplacement = replaceEquipmentBodyPreservingState(base, {
  ...perfume,
  conditionalEffects: {
    blackFangSynergy: {
      dealerFinalDamagePercentPerItem: 3,
      bufferBuffPowerPerItem: 75,
      maxCount: 3,
    },
  },
});
assert.deepEqual(conditionalReplacement.conditionalEffects, {
  blackFangSynergy: {
    dealerFinalDamagePercentPerItem: 3,
    bufferBuffPowerPerItem: 75,
    maxCount: 3,
  },
});
assert.deepEqual(applied.conditionalEffects, {});

const bodyThenProgression = { ...applied, reinforce: 13, activeActionMarker: 'other-action' };
const progressionThenBody = replaceEquipmentBodyPreservingState(
  { ...base, reinforce: 13, activeActionMarker: 'other-action' },
  perfume,
);
assert.deepEqual(bodyThenProgression, progressionThenBody, 'body replacement is order-independent');

const restored = replaceEquipmentBodyPreservingState(bodyThenProgression, {
  slotId: base.slotId,
  slot: base.slot,
  itemId: base.itemId,
  itemName: base.itemName,
  itemRarity: base.itemRarity,
  iconUrl: base.iconUrl,
  effects: base.bodyEffects,
  itemExplain: base.bodyExplain,
  itemReinforceSkill: base.itemReinforceSkill,
  itemBuff: base.itemBuff,
  tuneLevel: base.tuneLevel,
  tuneSetPoint: base.tuneSetPoint,
  tuneUpgradeable: base.tuneUpgradeable,
  tuneRemaining: base.tuneRemaining,
});
assert.equal(restored.itemId, base.itemId);
assert.deepEqual(restored.bodyEffects, base.bodyEffects);
assert.equal(restored.tuneLevel, base.tuneLevel);
assert.equal(restored.tuneUpgradeable, base.tuneUpgradeable);
assert.equal(restored.tuneRemaining, base.tuneRemaining);
assert.equal(restored.reinforce, 13, 'removal preserves other active progression state');
assert.equal(restored.activeActionMarker, 'other-action');

const rows = [
  { slotId: 'AMULET', slot: '목걸이', itemId: 'necklace' },
  base,
];
const replacedRows = replaceEquipmentBodyInRows(rows, perfume);
assert.equal(replacedRows[0].itemId, 'necklace');
assert.equal(replacedRows[1].itemId, perfume.itemId);
assert.equal(rows[1].itemId, base.itemId, 'input rows remain immutable');
assert.equal(replaceEquipmentBodyInRows(rows, { slotId: 'UNKNOWN', itemId: 'x' }), null);

const viewPath = fileURLToPath(new URL('../src/dnfHellTool/enchantView.js', import.meta.url));
const viewSource = readFileSync(viewPath, 'utf8');
const blackFangPresenterPath = fileURLToPath(new URL('../server/presenters/black_fang_presenter.py', import.meta.url));
const blackFangPresenterSource = readFileSync(blackFangPresenterPath, 'utf8');
assert.match(blackFangPresenterSource, /"sourceType":\s*"blackFang"/);
assert.doesNotMatch(viewSource, /replaceRelicCraftBody|replaceBlackFangBody/);
assert.match(viewSource, /applyType:\s*'replaceEquipmentBody'/);
assert.match(viewSource, /replaceEquipmentBodyInRows\(/);
assert.match(viewSource, /replaceEquipmentBody:\s*\{/);
assert.match(viewSource, /row\.conditionalEffectText/);
assert.match(viewSource, /\['보조장비', '마법석', '귀걸이'\]\.includes\(targetSlot\)/);
assert.match(viewSource, /function getEquipmentTuneRecommendationUpgrades\(\)/);
assert.match(viewSource, /getEquipmentTuneRows\(getEquipmentTuneRecommendationUpgrades\(\)/);
assert.match(viewSource, /function invalidateActiveEquipmentTuneSelectionForBodyChange\(\)/);
assert.match(viewSource, /delete simulator\.activeSelectionByGroup\.equipmentTune/);
const removeTuneStart = viewSource.indexOf('function removeSimulatedEquipmentTuneSelection');
const removeTuneEnd = viewSource.indexOf('function removeSimulatorAction', removeTuneStart);
const removeTuneSource = viewSource.slice(removeTuneStart, removeTuneEnd);
assert.match(removeTuneSource, /selection\.applyType === 'replaceEquipmentBody'/);
assert.doesNotMatch(removeTuneSource, /simulator\.role !== 'buffer'/);

console.log('ok - equipment body replacement common adapter');
