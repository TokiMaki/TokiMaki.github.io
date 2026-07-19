import {
  hasAvatarEmblemIdentity,
  getAvatarSlotEmblems,
  getAvatarSlotPlatinumEmblems,
  isPlatinumAvatarEmblem,
  getAvatarEmblemBadgeColors,
  getAvatarEmblemDetailColor,
} from './enchantAvatarEmblemViewHelpers.js';

const AVATAR_LOADOUT_BG_URL = new URL('../../이미지/bg3.jpg', import.meta.url).href;
const AVATAR_LOADOUT_SLOT_ROWS = [
  [
    { key: 'avatarWeapon', label: '무기 아바타' },
    { key: 'hair', label: '머리' },
    { key: 'hat', label: '모자' },
    { key: 'face', label: '얼굴' },
  ],
  [
    { key: 'aura', label: '오라' },
    { key: 'neck', label: '목가슴' },
    { key: 'top', label: '상의' },
    { key: 'skin', label: '피부' },
  ],
  [
    null,
    { key: 'waist', label: '허리' },
    { key: 'bottom', label: '하의' },
    { key: 'shoes', label: '신발' },
  ],
];

export function createEnchantAvatarLoadoutBoard({
  escapeHtml,
  getCharacterAvatarUrl,
  getActiveAvatar,
  getActiveAura,
  mergeAuraBodyWithEmblems,
  getCurrentAvatarPlatinumSlots,
  getAvatarSweepEntry,
  avatarSlotIdByKey,
  avatarPlatinumSlotLabelByKey,
}) {
  function getAvatarLoadoutSlotsById() {
    const slots = getActiveAvatar()?.slots;
    if (!Array.isArray(slots)) {
      return {};
    }
    const slotsById = slots.reduce((map, slot) => {
      const slotId = String(slot?.slotId || '').trim();
      if (slotId) {
        map[slotId] = slot;
      }
      return map;
    }, {});
    const activeAura = getActiveAura();
    if (activeAura && Object.keys(activeAura).length) {
      const currentAuraSlot = slotsById.AURORA || {};
      slotsById.AURORA = {
        ...mergeAuraBodyWithEmblems(activeAura, currentAuraSlot),
        slotId: 'AURORA',
        slotName: currentAuraSlot.slotName || '오라 아바타',
      };
    }
    return slotsById;
  }

  function getAvatarPlatinumDetailLine(slotKey, avatarSlot = {}) {
    const slotLabel = avatarPlatinumSlotLabelByKey[slotKey];
    if (!slotLabel) {
      return null;
    }
    if (String(avatarSlot.itemRarity || '').trim() !== '레어') {
      return null;
    }
    const platinumEmblems = getAvatarSlotPlatinumEmblems(avatarSlot).filter(isPlatinumAvatarEmblem);
    const platinumName = String(
      platinumEmblems[0]?.itemName
        || platinumEmblems[0]?.name
        || platinumEmblems[0]?.emblemName
        || '',
    ).trim();
    const platinumSlots = getCurrentAvatarPlatinumSlots();
    const hasPlatinum = String(avatarSlot.itemRarity || '').trim() === '레어'
      && (Boolean(platinumName) || (Array.isArray(platinumSlots) && platinumSlots.includes(slotLabel)));
    return {
      text: platinumName || (hasPlatinum ? '플래티넘 엠블렘 이름 확인 불가' : '플래티넘 엠블렘 없음'),
      className: hasPlatinum
        ? 'enchant-portrait-detail-line-avatar-platinum'
        : 'enchant-portrait-detail-line-sub',
    };
  }

  function buildAvatarSlotDetailLines(slotKey, avatarSlot = {}) {
    const normalEmblems = getAvatarSlotEmblems(avatarSlot)
      .map((emblem) => (emblem && !isPlatinumAvatarEmblem(emblem) ? emblem : null));
    const lines = [];
    const platinumLine = getAvatarPlatinumDetailLine(slotKey, avatarSlot);
    if (platinumLine) {
      lines.push(platinumLine);
    }
    for (let index = 0; index < 2; index += 1) {
      const emblem = normalEmblems[index];
      if (!emblem) {
        lines.push({ text: '엠블렘 없음', className: 'enchant-portrait-detail-line-sub' });
        continue;
      }
      const color = getAvatarEmblemDetailColor(slotKey, emblem);
      lines.push({
        text: String(emblem.itemName || emblem.name || emblem.emblemName || '엠블렘 이름 확인 불가').trim(),
        className: `enchant-portrait-detail-line-avatar-emblem enchant-portrait-detail-line-avatar-${color}`,
      });
    }
    return lines;
  }

  function getAvatarPlatinumBadgeState(slotKey, avatarSlot = {}) {
    const slotLabel = avatarPlatinumSlotLabelByKey[slotKey];
    if (!slotLabel) {
      return '';
    }
    if (String(avatarSlot.itemRarity || '').trim() !== '레어') {
      return '';
    }
    const hasPlatinumEmblem = getAvatarSlotPlatinumEmblems(avatarSlot)
      .some((emblem) => isPlatinumAvatarEmblem(emblem) && hasAvatarEmblemIdentity(emblem));
    if (hasPlatinumEmblem) return 'filled';
    const platinumSlots = getCurrentAvatarPlatinumSlots();
    return Array.isArray(platinumSlots) && platinumSlots.includes(slotLabel) ? 'filled' : 'empty';
  }

  function renderAvatarLoadoutSlot(slot, slotsById) {
    if (!slot) {
      return '<span class="enchant-avatar-slot-gap" aria-hidden="true"></span>';
    }
    const label = String(slot?.label || '').trim();
    const key = String(slot?.key || '').trim();
    const slotId = avatarSlotIdByKey[key] || '';
    const avatarSlot = slotsById[slotId] || {};
    const hasAvatarItem = Boolean(String(avatarSlot.itemId || avatarSlot.itemName || '').trim());
    const itemName = String(avatarSlot.itemName || '').trim();
    const iconUrl = String(avatarSlot.iconUrl || '').trim();
    const emblemBadgeColors = hasAvatarItem ? getAvatarEmblemBadgeColors(key, avatarSlot) : [];
    const platinumBadgeState = hasAvatarItem ? getAvatarPlatinumBadgeState(key, avatarSlot) : '';
    const ariaLabel = itemName || label;
    const detailLines = itemName ? buildAvatarSlotDetailLines(key, avatarSlot) : [];
    const detailAttrs = itemName
      ? ` data-detail-title="${escapeHtml(ariaLabel)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}"`
      : '';
    const sweepEntry = getAvatarSweepEntry(slotId);
    const hasActiveSweep = Boolean(sweepEntry);
    const sweepElapsedMs = Math.max(0, Date.now() - Number(sweepEntry?.startedAt || Date.now()));
    const sweepStyle = hasActiveSweep
      ? ` style="--simulator-sweep-delay: -${Math.floor(sweepElapsedMs)}ms"`
      : '';
    return `
      <span class="enchant-avatar-slot${hasActiveSweep ? ' is-simulator-sweep' : ''}" data-avatar-slot-key="${escapeHtml(key)}" data-avatar-slot-id="${escapeHtml(slotId)}" data-emblem-colors="${escapeHtml(emblemBadgeColors.join(','))}"${platinumBadgeState ? ` data-platinum-emblem="${escapeHtml(platinumBadgeState)}"` : ''} tabindex="0" aria-label="${escapeHtml(ariaLabel)}"${detailAttrs}${sweepStyle}>
        <span class="enchant-avatar-slot-icon" aria-hidden="true">
          ${iconUrl
            ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" decoding="async" />`
            : '<span class="enchant-avatar-slot-placeholder"></span>'}
          ${platinumBadgeState
            ? `<span class="enchant-avatar-platinum-badge enchant-avatar-platinum-badge-${escapeHtml(platinumBadgeState)}"></span>`
            : ''}
          ${emblemBadgeColors.length
            ? `<span class="enchant-avatar-emblem-badges">
                ${emblemBadgeColors.map((color) => `<span class="enchant-avatar-emblem-badge enchant-avatar-emblem-badge-${escapeHtml(color)}"></span>`).join('')}
              </span>`
            : ''}
        </span>
      </span>
    `;
  }

  function renderAvatarLoadoutBoard(character) {
    const avatarUrl = getCharacterAvatarUrl(character, 1);
    const slotsById = getAvatarLoadoutSlotsById();
    return `
      <div class="enchant-avatar-board" aria-label="아바타 장착 정보">
        <div class="enchant-avatar-preview" aria-hidden="true">
          <img class="enchant-avatar-preview-bg" src="${escapeHtml(AVATAR_LOADOUT_BG_URL)}" alt="" loading="lazy" decoding="async" />
          ${avatarUrl
            ? `<img class="enchant-avatar-preview-img" data-character-avatar src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" decoding="async" />`
            : '<span class="enchant-avatar-preview-placeholder"></span>'}
        </div>
        <div class="enchant-avatar-slots">
          ${AVATAR_LOADOUT_SLOT_ROWS.flatMap((row) => row).map((slot) => renderAvatarLoadoutSlot(slot, slotsById)).join('')}
        </div>
      </div>
    `;
  }

  return { renderAvatarLoadoutBoard };
}
