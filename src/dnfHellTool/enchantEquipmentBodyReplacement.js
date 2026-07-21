const EQUIPMENT_SLOT_NAME_BY_ID = {
  WEAPON: '무기',
  JACKET: '상의',
  PANTS: '하의',
  SHOULDER: '머리어깨',
  WAIST: '벨트',
  SHOES: '신발',
  WRIST: '팔찌',
  AMULET: '목걸이',
  RING: '반지',
  SUPPORT: '보조장비',
  MAGIC_STON: '마법석',
  EARRING: '귀걸이',
};
const EQUIPMENT_SLOT_ID_BY_NAME = Object.fromEntries(
  Object.entries(EQUIPMENT_SLOT_NAME_BY_ID).map(([slotId, slotName]) => [slotName, slotId]),
);

function cloneValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function resolveCanonicalEquipmentSlotId(row = {}) {
  const slotId = String(row?.slotId || '').trim();
  if (EQUIPMENT_SLOT_NAME_BY_ID[slotId]) return slotId;
  const slotName = String(row?.slotName || row?.slot || '').trim();
  return EQUIPMENT_SLOT_ID_BY_NAME[slotName] || '';
}

export function resolveCanonicalEquipmentSlotName(row = {}) {
  const slotId = resolveCanonicalEquipmentSlotId(row);
  return EQUIPMENT_SLOT_NAME_BY_ID[slotId]
    || String(row?.slotName || row?.slot || '').trim();
}

export function replaceEquipmentBodyPreservingState(currentEquipment = {}, targetBody = {}) {
  const nextEquipment = cloneValue(currentEquipment || {});
  const targetSlotId = resolveCanonicalEquipmentSlotId(targetBody);
  if (targetSlotId) {
    nextEquipment.slotId = targetSlotId;
    nextEquipment.slot = resolveCanonicalEquipmentSlotName(targetBody);
  }
  nextEquipment.itemId = targetBody.itemId || '';
  nextEquipment.itemName = targetBody.itemName || nextEquipment.itemName || '';
  nextEquipment.iconUrl = targetBody.iconUrl || '';
  nextEquipment.itemRarity = targetBody.itemRarity || nextEquipment.itemRarity || '';
  nextEquipment.bodyEffects = cloneValue(targetBody.effects || {});
  nextEquipment.bodyExplain = targetBody.itemExplain || '';
  nextEquipment.itemReinforceSkill = cloneValue(targetBody.itemReinforceSkill || []);
  nextEquipment.itemBuff = cloneValue(targetBody.itemBuff || {});
  if (Number.isFinite(Number(targetBody.tuneSetPoint))) {
    nextEquipment.tuneSetPoint = Number(targetBody.tuneSetPoint);
  }
  return nextEquipment;
}

export function replaceEquipmentBodyInRows(equipmentRows = [], targetBody = {}) {
  const targetSlotId = resolveCanonicalEquipmentSlotId(targetBody);
  if (!targetSlotId) return null;
  let replaced = false;
  const rows = cloneValue(equipmentRows || []).map((equipment) => {
    if (resolveCanonicalEquipmentSlotId(equipment) !== targetSlotId) return equipment;
    replaced = true;
    return replaceEquipmentBodyPreservingState(equipment, targetBody);
  });
  return replaced ? rows : null;
}
