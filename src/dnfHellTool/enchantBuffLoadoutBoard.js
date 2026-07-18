import {
  hasAvatarEmblemIdentity,
  getAvatarSlotEmblems,
  getAvatarSlotPlatinumEmblems,
  isPlatinumAvatarEmblem,
  getAvatarEmblemBadgeColors,
  getAvatarEmblemDetailColor,
} from './enchantAvatarEmblemViewHelpers.js';

const SWITCHING_SKILL_ICON_ASSETS = import.meta.glob('../../이미지/스킬/*/*/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});

const BUFF_LOADOUT_EQUIPMENT_SLOT_ROWS = [
  ['상의', '하의', '무기', '칭호'],
  ['머리어깨', '허리', '팔찌', '목걸이'],
  ['신발', null, '반지', '보조장비'],
  [null, null, '귀걸이', '마법석'],
];

const DEALER_SWITCHING_MAX_LEVEL_BONUS = 7;

export function createEnchantBuffLoadoutBoard(deps) {
  const {
    escapeHtml,
    getLoadoutRarityClass,
    getBuffLoadoutBoardContext,
    getBuffSweepEntry,
    getBuffLoadoutLevelContribution,
    normalizeBuffLoadoutEquipmentSlotName,
    avatarSlotIdByKey,
  } = deps;

  function getBuffLoadoutRows(value) {
    if (Array.isArray(value)) return value.filter((row) => row && typeof row === 'object');
    return value && typeof value === 'object' ? [value] : [];
  }

  function getSwitchingSkillIconUrl(skillId, className) {
    const normalizedSkillId = String(skillId || '').trim().toLowerCase();
    const normalizedClassName = String(className || '').trim();
    if (!normalizedSkillId || !normalizedClassName) return '';
    const classFolder = ['다크나이트', '크리에이터'].includes(normalizedClassName)
      ? '외전'
      : normalizedClassName;
    const pathPart = `/이미지/스킬/${classFolder}/`;
    const fileName = `/${normalizedSkillId}.png`;
    const entry = Object.entries(SWITCHING_SKILL_ICON_ASSETS).find(([assetPath]) => (
      assetPath.includes(pathPart) && assetPath.endsWith(fileName)
    ));
    return entry?.[1] || '';
  }

  function getBuffLoadoutData() {
    const {
      simulatedBuffLoadout,
      baseBuffLoadout,
      currentBuffLoadout,
      currentBufferBaseline,
      targetJobName,
      simulatorRole,
    } = getBuffLoadoutBoardContext();
    const loadout = simulatedBuffLoadout || currentBuffLoadout || {};
    const equipmentRows = getBuffLoadoutRows(loadout.equipment);
    const equipmentBySlotName = equipmentRows.reduce((map, row) => {
      const rawSlotName = String(row?.slotName || '').trim();
      const slotName = normalizeBuffLoadoutEquipmentSlotName(rawSlotName);
      if (slotName) map[slotName] = row;
      return map;
    }, {});
    const avatarRows = getBuffLoadoutRows(loadout.avatar);
    const avatarBySlotId = avatarRows.reduce((map, row) => {
      const slotId = String(row?.slotId || '').trim();
      if (slotId) map[slotId] = row;
      return map;
    }, {});
    const creature = getBuffLoadoutRows(loadout.creature)[0] || null;
    const skillInfo = loadout.skillInfo || {};
    const baseline = currentBufferBaseline || {};
    const skillId = String(skillInfo.skillId || '').trim();
    const className = String(targetJobName || baseline.jobName || '').trim();
    const skillLevel = baseBuffLoadout
      ? Math.max(
        0,
        Number(baseBuffLoadout?.skillInfo?.level || baseline.buffSkillLevel || 0)
          + getBuffLoadoutLevelContribution(loadout)
          - getBuffLoadoutLevelContribution(baseBuffLoadout),
      )
      : Number(skillInfo.level || baseline.buffSkillLevel || 0);
    const isDealer = simulatorRole
      ? simulatorRole !== 'buffer'
      : baseline.isBuffer !== true;
    const switchingLevelBonus = getBuffLoadoutLevelContribution(loadout);
    return {
      equipmentBySlotName,
      avatarBySlotId,
      creature,
      skill: {
        skillId,
        name: String(skillInfo.name || baseline.buffSkillName || '').trim(),
        level: skillLevel,
        isMax: isDealer && switchingLevelBonus >= DEALER_SWITCHING_MAX_LEVEL_BONUS,
        iconUrl: String(skillInfo.iconUrl || '').trim() || getSwitchingSkillIconUrl(skillId, className),
      },
    };
  }

  function getBuffContributionDetailLines(item, label, buffSkillName) {
    const contribution = item?.buffContribution;
    const effectClass = 'enchant-portrait-detail-line-effect';
    const subClass = 'enchant-portrait-detail-line-sub';
    const skillName = String(buffSkillName || '').trim() || '버프 스킬';
    if (!contribution || typeof contribution !== 'object') {
      return [{ text: '버프강화 효과 확인 불가', className: subClass }];
    }
    const levelLine = (prefix, value) => {
      if (value === null || value === undefined) {
        return { text: `${prefix ? `${prefix}: ` : ''}확인 불가`, className: subClass };
      }
      const level = Number(value);
      return Number.isFinite(level) && level > 0
        ? { text: `${prefix ? `${prefix}: ` : ''}${skillName} Lv +${level}`, className: effectClass }
        : { text: `${prefix ? `${prefix}: ` : ''}적용 없음`, className: subClass };
    };
    if (label === '칭호') {
      return [levelLine('', contribution.skillLevel)];
    }
    if (label === '상의 아바타') {
      return [
        levelLine('상의 옵션', contribution.topOptionSkillLevel),
        levelLine('플래티넘 엠블렘', contribution.platinumSkillLevel),
      ];
    }
    if (label === '하의 아바타') {
      return [levelLine('플래티넘 엠블렘', contribution.platinumSkillLevel)];
    }
    if (label === '크리쳐') {
      return [levelLine('', contribution.skillLevel)];
    }
    const rate = contribution.additionalRatePercent;
    if (rate === null || rate === undefined) {
      return [{ text: '버프강화 추가 증가율 확인 불가', className: subClass }];
    }
    const rateNumber = Number(rate);
    return Number.isFinite(rateNumber) && rateNumber > 0
      ? [{
        text: String(contribution.additionalRateText || '').trim()
          || `스킬 공격력 증가량 ${rateNumber.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}% 추가 증가`,
        className: effectClass,
      }]
      : [{ text: '버프강화 적용 효과 없음', className: subClass }];
  }

  function renderBuffLoadoutSlot(item, label, buffSkillName, extraClass = '', sweepKey = '') {
    const sweepEntry = getBuffSweepEntry(sweepKey);
    const hasActiveSweep = Boolean(sweepEntry);
    const sweepStyle = hasActiveSweep
      ? ` style="--simulator-sweep-sequence:${Number(sweepEntry.token || 0)}"`
      : '';
    if (!item) {
      return `
        <span class="enchant-buff-slot ${escapeHtml(extraClass)}${hasActiveSweep ? ' is-simulator-sweep' : ''}" aria-label="${escapeHtml(label)} 비어 있음"${sweepStyle}>
          <span class="enchant-character-slot is-empty">
            <span class="enchant-character-slot-placeholder" aria-hidden="true"></span>
          </span>
        </span>
      `;
    }
    const itemName = String(item.itemName || item.name || label).trim();
    const iconUrl = String(item.iconUrl || '').trim();
    const rarityClass = getLoadoutRarityClass(item);
    let detailLines = getBuffContributionDetailLines(item, label, buffSkillName);
    const isBuffAvatarSlot = String(sweepKey || '').startsWith('buffAvatar:');
    const avatarSlotKey = isBuffAvatarSlot
      ? Object.entries(avatarSlotIdByKey)
        .find(([, slotId]) => slotId === String(item.slotId || '').trim())?.[0] || ''
      : '';
    const simulatedPlatinum = item.simulatedPlatinumEmblem || null;
    const equippedPlatinum = avatarSlotKey
      ? getAvatarSlotPlatinumEmblems(item).find(isPlatinumAvatarEmblem) || null
      : null;
    const platinumEmblem = simulatedPlatinum || equippedPlatinum;
    const platinumBadgeState = avatarSlotKey && String(item.itemRarity || '').includes('레어')
      ? hasAvatarEmblemIdentity(platinumEmblem || {}) ? 'filled' : 'empty'
      : '';
    if (platinumBadgeState) {
      detailLines = detailLines.filter(
        (line) => !String(line?.text || '').startsWith('플래티넘 엠블렘:'),
      );
      if (platinumBadgeState === 'filled') {
        detailLines.push({
          text: String(platinumEmblem.itemName || platinumEmblem.name || '플래티넘 엠블렘 이름 확인 불가').trim(),
          className: 'enchant-portrait-detail-line-avatar-platinum',
        });
      } else {
        detailLines.push({
          text: '플래티넘 엠블렘 없음',
          className: 'enchant-portrait-detail-line-sub',
        });
      }
    }
    const regularEmblems = avatarSlotKey ? getAvatarSlotEmblems(item) : [];
    regularEmblems.filter(Boolean).forEach((emblem) => {
      detailLines.push({
        text: String(emblem.itemName || '엠블렘 이름 확인 불가').trim(),
        className: `enchant-portrait-detail-line-avatar-emblem enchant-portrait-detail-line-avatar-${getAvatarEmblemDetailColor(avatarSlotKey, emblem)}`,
      });
    });
    const emblemBadgeColors = avatarSlotKey ? getAvatarEmblemBadgeColors(avatarSlotKey, item) : [];
    return `
      <span class="enchant-buff-slot ${escapeHtml(extraClass)}${hasActiveSweep ? ' is-simulator-sweep' : ''}" tabindex="0" aria-label="${escapeHtml(itemName)}" data-buff-loadout-detail data-detail-title="${escapeHtml(itemName)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}"${sweepStyle}>
        <span class="enchant-character-slot${iconUrl ? '' : ' is-empty'}${rarityClass ? ` ${escapeHtml(rarityClass)}` : ''}">
          ${iconUrl
            ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" decoding="async" />`
            : '<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>'}
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

  function renderBuffLoadoutBoard() {
    const { equipmentBySlotName, avatarBySlotId, creature, skill } = getBuffLoadoutData();
    const skillDetailLines = skill.level > 0
      ? [{ text: `Lv. ${skill.level}`, className: 'enchant-portrait-detail-line-effect' }]
      : [];
    const skillDetailAttrs = skill.name
      ? ` tabindex="0" data-buff-loadout-detail data-detail-title="${escapeHtml(skill.name)}" data-detail-lines="${escapeHtml(JSON.stringify(skillDetailLines))}"`
      : '';
    return `
      <div class="enchant-buff-board" aria-label="버프강화 장착 정보">
        <section class="enchant-buff-section enchant-buff-section-skill">
          <h3>스킬</h3>
          <div class="enchant-buff-section-body enchant-buff-skill-body"${skillDetailAttrs}>
            <span class="enchant-character-slot${skill.iconUrl ? '' : ' is-empty'}">
              ${skill.iconUrl
                ? `<img src="${escapeHtml(skill.iconUrl)}" alt="" loading="lazy" decoding="async" />`
                : '<span class="enchant-character-slot-placeholder" aria-hidden="true"></span>'}
            </span>
            ${skill.name ? `<span class="enchant-buff-skill-name" title="${escapeHtml(skill.name)}">${escapeHtml(skill.name)}</span>` : ''}
            ${skill.level > 0 ? `<span class="enchant-buff-skill-level">Lv. ${escapeHtml(String(skill.level))}</span>` : ''}
            ${skill.isMax ? '<span class="enchant-buff-skill-max">(MAX)</span>' : ''}
          </div>
        </section>
        <section class="enchant-buff-section enchant-buff-section-equipment">
          <h3>장비</h3>
          <div class="enchant-buff-section-body">
            <div class="enchant-buff-equipment-grid">
              ${BUFF_LOADOUT_EQUIPMENT_SLOT_ROWS.flatMap((row) => row).map((slotName) => (
                slotName
                  ? renderBuffLoadoutSlot(
                    equipmentBySlotName[slotName],
                    slotName,
                    skill.name,
                    `enchant-buff-slot-${slotName}`,
                    slotName === '칭호' ? 'buffTitle' : `buffEquipment:${slotName}`,
                  )
                  : '<span class="enchant-buff-slot-gap" aria-hidden="true"></span>'
              )).join('')}
            </div>
          </div>
        </section>
        <section class="enchant-buff-section enchant-buff-section-avatar">
          <h3>아바타</h3>
          <div class="enchant-buff-section-body">
            <div class="enchant-buff-avatar-stack">
              ${renderBuffLoadoutSlot(avatarBySlotId.JACKET, '상의 아바타', skill.name, '', 'buffAvatar:JACKET')}
              ${renderBuffLoadoutSlot(avatarBySlotId.PANTS, '하의 아바타', skill.name, '', 'buffAvatar:PANTS')}
            </div>
          </div>
        </section>
        <section class="enchant-buff-section enchant-buff-section-creature">
          <h3>크리쳐</h3>
          <div class="enchant-buff-section-body">
            ${renderBuffLoadoutSlot(creature, '크리쳐', skill.name, '', 'buffCreature')}
          </div>
        </section>
      </div>
    `;
  }

  return { renderBuffLoadoutBoard };
}
