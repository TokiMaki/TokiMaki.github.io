const OATH_BOARD_BG_URL = new URL('../../이미지/oathbg.png', import.meta.url).href;
const OATH_SYMBOL_ASSETS = import.meta.glob('../../이미지/Oath/*/*.{png,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
});
const OATH_SYMBOL_SET_FOLDERS = {
  basic: '00basic',
  shadow: '01shadow',
  fairy: '02fairy',
  gold: '03gold',
  dragon: '04dragon',
  purify: '05purify',
  serendipity: '06serendipity',
  limitless: '07limitless',
  nature: '08nature',
  valkyrie: '09valkyrie',
  fox: '10etherial',
  wolf: '11wolf',
  realm: '12realm',
};
const OATH_SYMBOL_FILES_BY_RARITY = {
  rare: 'rare.png',
  unique: 'unique.png',
  legendary: 'legendary.png',
  epic: 'epic.png',
  primeval: 'primeval.webp',
};
const OATH_SYMBOL_SET_KEYWORDS = [
  ['안개', 'basic'],
  ['그림자', 'shadow'],
  ['페어리', 'fairy'],
  ['황금', 'gold'],
  ['용투', 'dragon'],
  ['정화', 'purify'],
  ['행운', 'serendipity'],
  ['한계', 'limitless'],
  ['자연', 'nature'],
  ['발키리', 'valkyrie'],
  ['여우', 'fox'],
  ['무리', 'wolf'],
  ['마력', 'realm'],
];
const OATH_LOADOUT_SIDE_SLOT_COUNT = 4;
const OATH_LOADOUT_BOTTOM_SLOT_COUNT = 3;

export function createEnchantOathLoadoutBoard({
  escapeHtml,
  formatEffectValue,
  formatEffectNumber,
  getEffectLabel,
  getLoadoutRarityClass,
  getOathStageRarityClass,
  getDealerPrimaryStatKey,
  normalizeDealerEnchantDisplayEffects,
  getActiveOathUpgrades,
  arrangeOathCrystals,
  getBaseOathCrystal,
  getOathSweepState,
  getOathDetailContext,
}) {
  function formatOathStageRomanSuffix(stageName) {
    const name = String(stageName || '').trim();
    if (!name || name.startsWith('태초')) return '';
    const match = name.match(/(?:레어|유니크|레전더리|에픽)\s*([IV]+|[ⅠⅡⅢⅣⅤ]+)/i);
    const value = match?.[1] || '';
    const romanByGlyph = {
      'Ⅰ': 'I',
      'Ⅱ': 'II',
      'Ⅲ': 'III',
      'Ⅳ': 'IV',
      'Ⅴ': 'V',
    };
    return romanByGlyph[value] || value.toUpperCase();
  }

  function getOathLoadoutSlots() {
    const activeOath = getActiveOathUpgrades();
    const sortedCrystals = Array.isArray(activeOath?.crystals)
      ? activeOath.crystals
        .filter(Boolean)
        .slice()
        .sort((a, b) => Number(a?.index || 0) - Number(b?.index || 0))
      : [];
    const crystals = arrangeOathCrystals(sortedCrystals);
    const fillSlots = (items, count) => Array.from({ length: count }, (_, index) => items[index] || null);

    return {
      left: fillSlots(crystals.slice(0, OATH_LOADOUT_SIDE_SLOT_COUNT), OATH_LOADOUT_SIDE_SLOT_COUNT),
      right: fillSlots(crystals.slice(OATH_LOADOUT_SIDE_SLOT_COUNT, OATH_LOADOUT_SIDE_SLOT_COUNT * 2), OATH_LOADOUT_SIDE_SLOT_COUNT),
      bottom: fillSlots(crystals.slice(OATH_LOADOUT_SIDE_SLOT_COUNT * 2, OATH_LOADOUT_SIDE_SLOT_COUNT * 2 + OATH_LOADOUT_BOTTOM_SLOT_COUNT), OATH_LOADOUT_BOTTOM_SLOT_COUNT),
    };
  }

  function getOathCrystalRarityClass(crystal) {
    return getLoadoutRarityClass(crystal);
  }

  function getOathStatDisplayValue(effects = {}, statName = '') {
    const name = String(statName || '').trim();
    if (!name) return 0;
    const directKey = name === '힘' ? 'str' : name === '지능' ? 'int' : '';
    return Number(effects.allStat || 0) + (directKey ? Number(effects[directKey] || 0) : 0);
  }

  function buildOathDetailLines(oathItem = {}) {
    const effects = oathItem.effects || {};
    const detailContext = getOathDetailContext() || {};
    const isBuffer = Boolean(detailContext.isBuffer);
    const parts = [];
    if (isBuffer) {
      const buffPower = Number(effects.buffPower || 0);
      const statName = String(detailContext.statName || '').trim();
      const statValue = getOathStatDisplayValue(effects, statName);
      if (Number.isFinite(buffPower) && buffPower > 0) {
        parts.push(formatEffectValue('buffPower', buffPower));
      }
      if (statName && Number.isFinite(statValue) && statValue > 0) {
        parts.push(`${statName} +${formatEffectNumber(statValue)}`);
      }
    } else {
      const finalDamage = Number(effects.finalDamage || 0);
      const activeDamageBaseline = detailContext.damageBaseline || {};
      const primaryKey = getDealerPrimaryStatKey(activeDamageBaseline);
      const normalizedEffects = normalizeDealerEnchantDisplayEffects(effects, activeDamageBaseline);
      const primaryStat = Number(normalizedEffects[primaryKey] || 0);
      if (Number.isFinite(finalDamage) && finalDamage > 0) {
        parts.push(formatEffectValue('finalDamage', finalDamage));
      }
      if (primaryKey && Number.isFinite(primaryStat) && primaryStat > 0) {
        parts.push(`${getEffectLabel(primaryKey)} +${formatEffectNumber(primaryStat)}`);
      }
    }
    return parts.length
      ? [{ text: parts.join(' / '), className: 'enchant-portrait-detail-line-effect' }]
      : [{ text: '표시할 효과가 없습니다.', className: 'enchant-portrait-detail-line-sub' }];
  }

  function renderOathLoadoutSlot(crystal, index, area) {
    const itemName = String(crystal?.itemName || '').trim();
    const rarity = String(crystal?.itemRarity || '').trim();
    const iconUrl = String(crystal?.iconUrl || '').trim();
    const title = itemName || `빈 서약 슬롯 ${index + 1}`;
    const rarityClass = getOathCrystalRarityClass(crystal);
    const oathIndex = Number.isFinite(Number(crystal?.index)) ? Number(crystal.index) : index;
    const baseCrystal = getBaseOathCrystal(oathIndex);
    const acquisitionMethod = String(crystal?.simulatedAcquisitionMethod || '');
    const acquisitionBadge = acquisitionMethod === 'transcend'
      ? { label: '초월', className: 'is-transcend' }
      : acquisitionMethod === 'craft'
        ? { label: '정가', className: 'is-craft' }
        : null;
    const detailLines = crystal ? buildOathDetailLines(crystal) : [];
    const tuneLevel = Math.max(0, Math.min(3, Math.floor(Number(crystal?.tuneLevel || 0))));
    const baseTuneLevel = acquisitionMethod
      ? 0
      : Math.max(0, Math.min(tuneLevel, Math.floor(Number(baseCrystal?.tuneLevel || 0))));
    const isSimulatedTune = tuneLevel !== baseTuneLevel;
    const sweepState = getOathSweepState(oathIndex);
    const hasActiveSweep = Boolean(sweepState.active);
    const sweepEntry = sweepState.entry;
    const sweepStyle = hasActiveSweep
      ? ` style="--simulator-sweep-delay: ${Math.max(0, Math.min(120, Date.now() - Number(sweepEntry?.startedAt || Date.now())))}ms"`
      : '';
    const detailAttrs = crystal
      ? ` tabindex="0" data-oath-index="${escapeHtml(String(oathIndex))}" data-detail-title="${escapeHtml(title)}" data-detail-lines="${escapeHtml(JSON.stringify(detailLines))}"`
      : '';
    return `
      <span class="enchant-oath-slot${iconUrl ? '' : ' is-empty'} ${escapeHtml(rarityClass)}${hasActiveSweep ? ' is-simulator-sweep' : ''}" aria-label="${escapeHtml(title)}" data-oath-area="${escapeHtml(area)}"${detailAttrs}${sweepStyle}>
        ${iconUrl
          ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy" decoding="async" />`
          : '<span class="enchant-oath-slot-placeholder" aria-hidden="true"></span>'}
        ${acquisitionBadge
          ? `<span class="enchant-character-slot-enchant-badges"><span class="enchant-character-slot-enchant-badge enchant-oath-acquisition-badge ${acquisitionBadge.className}">${acquisitionBadge.label}</span></span>`
          : ''}
        ${crystal && tuneLevel > 0
          ? `<span class="enchant-character-slot-tune-mark${isSimulatedTune ? ' is-simulated-equipment-tune' : ''}" role="img" aria-label="조율 ${escapeHtml(String(tuneLevel))}회">${Array.from({ length: tuneLevel }).map((_, tuneIndex) => `<span class="enchant-character-slot-tune-bar${tuneIndex >= baseTuneLevel ? ' is-simulated' : ''}" aria-hidden="true"></span>`).join('')}</span>`
          : ''}
      </span>
    `;
  }

  function renderOathLoadoutColumn(slots, area) {
    return `
      <div class="enchant-oath-column enchant-oath-column-${escapeHtml(area)}">
        ${slots.map((crystal, index) => renderOathLoadoutSlot(crystal, index, area)).join('')}
      </div>
    `;
  }

  function getOathSymbolSetKey(oath = {}) {
    const text = String(oath.itemName || '');
    const match = OATH_SYMBOL_SET_KEYWORDS.find(([keyword]) => text.includes(keyword));
    return match?.[1] || '';
  }

  function getOathSymbolRarityKey(oath = {}) {
    const rarity = String(oath.itemRarity || '').trim();
    if (rarity.includes('레어')) return 'rare';
    if (rarity.includes('태초')) return 'primeval';
    if (rarity.includes('에픽')) return 'epic';
    if (rarity.includes('레전더리')) return 'legendary';
    if (rarity.includes('유니크')) return 'unique';
    return '';
  }

  function getLocalOathSymbolIconUrl(oath = {}) {
    const setKey = getOathSymbolSetKey(oath);
    const rarityKey = getOathSymbolRarityKey(oath);
    const folder = OATH_SYMBOL_SET_FOLDERS[setKey];
    const fileName = OATH_SYMBOL_FILES_BY_RARITY[rarityKey];
    if (!folder || !fileName) return '';
    return OATH_SYMBOL_ASSETS[`../../이미지/Oath/${folder}/${fileName}`] || '';
  }

  function renderOathLoadoutBoard() {
    const oath = getActiveOathUpgrades() || {};
    const slots = getOathLoadoutSlots();
    const setName = String(oath.setName || '').trim();
    const setOptionName = String(oath.setOptionName || '').trim();
    const setRarityName = String(oath.setRarityName || oath.itemRarity || '').trim();
    const setOptionSuffix = formatOathStageRomanSuffix(setRarityName);
    const setOptionTitle = setOptionName
      ? [setOptionName, setOptionSuffix].filter(Boolean).join(' ')
      : '';
    const setOptionRarityClass = getOathStageRarityClass(setRarityName);
    const setPoint = Number(oath.setPoint || 0);
    const oathIconUrl = getLocalOathSymbolIconUrl(oath) || String(oath.iconUrl || '').trim();
    const oathItemName = String(oath.itemName || '').trim();
    const oathRarityClass = getOathCrystalRarityClass(oath);
    const oathSymbolClass = ['enchant-oath-symbol', oathRarityClass].filter(Boolean).join(' ');
    const oathFallbackSymbolClass = ['enchant-oath-symbol', 'is-fallback', oathRarityClass].filter(Boolean).join(' ');
    const oathDetailLines = oathItemName ? buildOathDetailLines(oath) : [];
    const oathDetailAttrs = oathItemName
      ? ` tabindex="0" aria-label="${escapeHtml(oathItemName)}" data-oath-symbol-detail="1" data-detail-title="${escapeHtml(oathItemName)}" data-detail-lines="${escapeHtml(JSON.stringify(oathDetailLines))}"`
      : '';
    const hasCrystals = Array.isArray(oath.crystals) && oath.crystals.length > 0;
    return `
      <div class="enchant-oath-board" aria-label="서약 결정 장착 정보">
        <img class="enchant-oath-board-bg" src="${escapeHtml(OATH_BOARD_BG_URL)}" alt="" loading="lazy" decoding="async" aria-hidden="true" />
        ${renderOathLoadoutColumn(slots.left, 'left')}
        <div class="enchant-oath-center">
          ${oathIconUrl
            ? `<span class="${escapeHtml(oathSymbolClass)}"${oathDetailAttrs}><img src="${escapeHtml(oathIconUrl)}" alt="" loading="lazy" decoding="async" data-oath-symbol-image /><span class="enchant-oath-symbol-fallback" aria-hidden="true">서약</span></span>`
            : `<span class="${escapeHtml(oathFallbackSymbolClass)}"${oathDetailAttrs}><span class="enchant-oath-symbol-fallback" aria-hidden="true">서약</span></span>`}
          <strong class="enchant-oath-center-name enchant-oath-stage-${escapeHtml(setOptionRarityClass)}">${escapeHtml(setOptionTitle || (hasCrystals ? '' : '서약 정보 없음'))}</strong>
          ${Number.isFinite(setPoint) && setPoint > 0
            ? `<span class="enchant-oath-center-point">세트 포인트 ${escapeHtml(setPoint.toLocaleString('ko-KR'))}</span>`
            : ''}
        </div>
        ${renderOathLoadoutColumn(slots.right, 'right')}
        <div class="enchant-oath-bottom">
          ${slots.bottom.map((crystal, index) => renderOathLoadoutSlot(crystal, index, 'bottom')).join('')}
        </div>
      </div>
    `;
  }

  return { renderOathLoadoutBoard };
}
