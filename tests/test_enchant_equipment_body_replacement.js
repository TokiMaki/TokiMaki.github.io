import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
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
  itemExplain: 'perfume explain',
  itemReinforceSkill: [{ jobName: '공통', skills: [{ name: '버프', value: 1 }] }],
  itemBuff: { explain: 'perfume buff' },
  tuneSetPoint: 187,
};

assert.equal(resolveCanonicalEquipmentSlotId({ slotName: '마법석' }), 'MAGIC_STON');
assert.equal(resolveCanonicalEquipmentSlotName({ slotId: 'MAGIC_STON' }), '마법석');

const applied = replaceEquipmentBodyPreservingState(base, perfume);
assert.equal(applied.itemId, perfume.itemId);
assert.deepEqual(applied.bodyEffects, perfume.effects);
assert.equal(applied.tuneSetPoint, 187);
for (const key of [
  'tuneLevel', 'tuneRemaining', 'reinforce', 'refine', 'isAmplified',
  'amplificationName', 'enchant', 'activeActionMarker',
]) {
  assert.deepEqual(applied[key], base[key], `${key} is preserved`);
}

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
  tuneSetPoint: base.tuneSetPoint,
});
assert.equal(restored.itemId, base.itemId);
assert.deepEqual(restored.bodyEffects, base.bodyEffects);
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
assert.doesNotMatch(viewSource, /replaceRelicCraftBody|replaceBlackFangBody/);
assert.match(viewSource, /applyType:\s*'replaceEquipmentBody'/);
assert.match(viewSource, /replaceEquipmentBodyInRows\(/);
assert.match(viewSource, /replaceEquipmentBody:\s*\{/);
const removeTuneStart = viewSource.indexOf('function removeSimulatedEquipmentTuneSelection');
const removeTuneEnd = viewSource.indexOf('function removeSimulatorAction', removeTuneStart);
const removeTuneSource = viewSource.slice(removeTuneStart, removeTuneEnd);
assert.match(removeTuneSource, /selection\.applyType === 'replaceEquipmentBody'/);
assert.doesNotMatch(removeTuneSource, /simulator\.role !== 'buffer'/);

console.log('ok - equipment body replacement common adapter');
