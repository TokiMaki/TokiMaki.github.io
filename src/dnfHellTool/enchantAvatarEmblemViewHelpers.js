const AVATAR_FIXED_EMBLEM_COLOR_BY_SLOT_KEY = {
  hair: 'red',
  hat: 'red',
  face: 'yellow',
  neck: 'yellow',
  top: 'green',
  bottom: 'green',
  waist: 'blue',
  shoes: 'blue',
};

export function hasAvatarEmblemIdentity(emblem = {}) {
  return Boolean(String(
    emblem.itemId
      || emblem.itemName
      || emblem.name
      || emblem.emblemName
      || '',
  ).trim());
}

export function getAvatarSlotEmblems(avatarSlot = {}) {
  const emblems = avatarSlot.emblems || avatarSlot.emblem || avatarSlot.emblemItems || [];
  return Array.isArray(emblems) ? emblems.slice(0, 2) : [];
}

export function getAvatarSlotPlatinumEmblems(avatarSlot = {}) {
  const emblems = avatarSlot.platinumEmblems || avatarSlot.platinumEmblemItems || [];
  return Array.isArray(emblems) ? emblems.filter(hasAvatarEmblemIdentity) : [];
}

export function isPlatinumAvatarEmblem(emblem = {}) {
  const text = [
    emblem.itemName,
    emblem.name,
    emblem.emblemName,
    emblem.slotColor,
    emblem.color,
  ].filter(Boolean).join(' ');
  return /플래티넘|platinum/i.test(text);
}

export function getAvatarEmblemDisplayColor(itemName = '', slotColor = '') {
  const itemText = String(itemName || '').trim();
  const slotText = String(slotColor || '').trim();
  if (!itemText) return 'gray';
  const getFixedColor = (text) => {
    if (text.includes('붉은빛')) return 'red';
    if (/노란빛|옐로우/.test(text)) return 'yellow';
    if (/녹색빛|그린/.test(text)) return 'green';
    if (text.includes('푸른빛')) return 'blue';
    return '';
  };
  const fixedSlotColor = ['red', 'yellow', 'green', 'blue'].includes(slotText)
    ? slotText
    : getFixedColor(slotText);
  const isMulticolorSlot = slotText === '다색';
  if (fixedSlotColor) return fixedSlotColor;

  if (itemText.includes('듀얼')) {
    if (isMulticolorSlot) return /힘|지능/.test(itemText) ? 'red' : 'yellow';
    return 'gray';
  }

  const itemColor = getFixedColor(itemText);
  if (itemColor) return itemColor;
  if (itemText.includes('다색')) return 'red';
  return 'gray';
}

export function getAvatarEmblemColor(slotKey, emblem = {}) {
  const itemName = emblem.itemName || emblem.name || emblem.emblemName || '';
  const slotColor = AVATAR_FIXED_EMBLEM_COLOR_BY_SLOT_KEY[slotKey]
    || emblem.slotColor
    || emblem.color
    || '';
  return getAvatarEmblemDisplayColor(itemName, slotColor);
}

export function getAvatarEmblemBadgeColors(slotKey, avatarSlot = {}) {
  const colors = getAvatarSlotEmblems(avatarSlot)
    .map((emblem) => (
      emblem && !isPlatinumAvatarEmblem(emblem)
        ? getAvatarEmblemColor(slotKey, emblem)
        : 'gray'
    ));
  while (colors.length < 2) {
    colors.push('gray');
  }
  return colors;
}

export function getAvatarEmblemDetailColor(slotKey, emblem = {}) {
  return getAvatarEmblemColor(slotKey, emblem);
}
