export function getEquipmentUpgradeVisualClass(equipment = {}) {
  const level = Math.floor(Number(equipment.reinforce || 0));
  if (!Number.isFinite(level) || level <= 0) return '';

  if (equipment.isAmplified && level >= 12) {
    return `is-high-amplification is-amplification-${Math.min(17, level)}`;
  }

  const slot = String(equipment.slot || equipment.slotName || '').trim();
  if (!equipment.isAmplified && slot === '무기' && level >= 14) {
    return `is-high-reinforcement is-reinforcement-${Math.min(17, level)}`;
  }

  return '';
}
