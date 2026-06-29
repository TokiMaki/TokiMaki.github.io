import { CHARACTER_AVATAR_CLASS_BY_JOB } from '../data/supplyConstants.js';
import { escapeHtml, fmtInt, getServerLabel } from '../logic/formatters.js';

const CHARACTER_PORTRAIT_BG_URL = new URL('../../이미지/bg3.jpg', import.meta.url).href;
const CHARACTER_FAME_ICON_URL = new URL('../../이미지/fame.png', import.meta.url).href;

export function getCharacterAvatarClass(character) {
  const jobName = String(character?.jobName ?? '').trim();
  return CHARACTER_AVATAR_CLASS_BY_JOB[jobName] || '';
}

export function getCharacterAvatarUrl(character, zoom = 1) {
  if (!character?.serverId || !character?.characterId) {
    return '';
  }

  return `https://img-api.neople.co.kr/df/servers/${encodeURIComponent(character.serverId)}/characters/${encodeURIComponent(character.characterId)}?zoom=${encodeURIComponent(zoom)}`;
}

export function getCharacterNameOnly(character) {
  return String(character?.name || '').trim();
}

export function getCharacterJobLabel(character) {
  const jobGrowName = String(character?.jobGrowName ?? '').trim();
  const jobName = String(character?.jobName ?? '').trim();
  return jobGrowName || jobName;
}

export function getCharacterServerJobLabel(character) {
  const serverLabel = character?.serverId ? getServerLabel(character.serverId) : '';
  const jobLabel = getCharacterJobLabel(character);
  return [serverLabel, jobLabel].filter(Boolean).join(' / ');
}

export function getCharacterLabel(character) {
  if (!character) return '';
  return character.serverId ? `${getServerLabel(character.serverId)} ${character.name}` : character.name;
}

export function getCharacterAvatarMarkup(character, options = {}) {
  const label = getCharacterLabel(character);
  const showName = options.showName !== false;
  const zoom = Number(options.zoom || 1) || 1;
  const avatarUrl = getCharacterAvatarUrl(character, zoom);
  const avatarClass = escapeHtml(getCharacterAvatarClass(character));
  const shellClass = options.shellClass ? ` ${escapeHtml(String(options.shellClass).trim())}` : '';
  const fallback = escapeHtml((character?.name || label || '?').trim().slice(0, 1) || '?');

  return `
    <span class="character-name">
      <span class="character-avatar-shell${shellClass} smallIcon ${avatarClass}" aria-hidden="true" style="background-image: url('${escapeHtml(avatarUrl)}');">
        <img class="character-avatar" data-character-avatar src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" decoding="async" />
        <span class="character-avatar-fallback" hidden>${fallback}</span>
      </span>
      ${showName ? `<span class="character-name-text">${escapeHtml(label)}</span>` : ''}
    </span>
  `;
}

export function getCharacterPortraitMarkup(character, options = {}) {
  const label = getCharacterLabel(character);
  const showName = options.showName !== false;
  const zoom = Number(options.zoom || 4) || 4;
  const avatarUrl = getCharacterAvatarUrl(character, zoom);
  const fameLabel = fmtInt(Number(character?.fame || 0));
  const adventureName = String(character?.adventureName || '').trim();
  const nameLabel = getCharacterNameOnly(character) || label;
  const serverJobLabel = getCharacterServerJobLabel(character);
  const slotItemsHtml = String(options.slotItemsHtml || '').trim();

  return `
      <span class="character-name">
      <span class="supply-detail-portrait-crop">
        ${slotItemsHtml ? `<span class="character-portrait-slot-layer">${slotItemsHtml}</span>` : ''}
        <span class="supply-detail-portrait-frame">
          <img class="supply-detail-portrait-bg" src="${escapeHtml(CHARACTER_PORTRAIT_BG_URL)}" alt="" loading="lazy" decoding="async" aria-hidden="true" />
          <img class="supply-detail-portrait-img" data-character-avatar src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async" />
        </span>
      </span>
      ${showName ? `
        <span class="supply-detail-portrait-meta">
          <span class="supply-detail-portrait-fame" title="명성 ${escapeHtml(fameLabel)}" aria-label="명성 ${escapeHtml(fameLabel)}"><img src="${escapeHtml(CHARACTER_FAME_ICON_URL)}" alt="" loading="lazy" decoding="async" />${escapeHtml(fameLabel)}</span>
          ${adventureName ? `<span class="supply-detail-portrait-adventure">${escapeHtml(adventureName)}</span>` : ''}
          <span class="supply-detail-portrait-name">${escapeHtml(nameLabel)}</span>
          ${serverJobLabel ? `<span class="supply-detail-portrait-sub">${escapeHtml(serverJobLabel)}</span>` : ''}
        </span>
      ` : ''}
    </span>
  `;
}

export function bindCharacterAvatars(root) {
  if (!root) return;

  root.querySelectorAll('img[data-character-avatar]').forEach((img) => {
    if (img.dataset.avatarBound === '1') {
      return;
    }

    img.dataset.avatarBound = '1';
    const shell = img.closest('.character-avatar-shell, .supply-detail-portrait-frame');
    const fallback = shell?.querySelector('.character-avatar-fallback');

    const showImage = () => {
      img.hidden = false;
      if (fallback) fallback.hidden = true;
    };

    const showFallback = () => {
      img.hidden = true;
      if (fallback) fallback.hidden = false;
    };

    if (img.complete) {
      if (img.naturalWidth > 0) {
        showImage();
      } else {
        showFallback();
      }
    } else {
      img.addEventListener('load', showImage, { once: true });
      img.addEventListener('error', showFallback, { once: true });
    }
  });
}
