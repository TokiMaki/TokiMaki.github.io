import assert from 'node:assert/strict';
import { getEquipmentUpgradeVisualClass } from '../src/dnfHellTool/equipmentUpgradeVisual.js';

assert.equal(
  getEquipmentUpgradeVisualClass({ slot: '상의', reinforce: 10, isAmplified: true }),
  '',
);
assert.equal(
  getEquipmentUpgradeVisualClass({ slot: '상의', reinforce: 12, isAmplified: true }),
  'is-high-amplification is-amplification-12',
);
assert.equal(
  getEquipmentUpgradeVisualClass({ slot: '상의', reinforce: 19, isAmplified: true }),
  'is-high-amplification is-amplification-17',
);
assert.equal(
  getEquipmentUpgradeVisualClass({ slot: '무기', reinforce: 13, isAmplified: false }),
  '',
);
assert.equal(
  getEquipmentUpgradeVisualClass({ slot: '무기', reinforce: 14, isAmplified: false }),
  'is-high-reinforcement is-reinforcement-14',
);
assert.equal(getEquipmentUpgradeVisualClass({ slot: '상의', reinforce: 15, isAmplified: false }), '');
