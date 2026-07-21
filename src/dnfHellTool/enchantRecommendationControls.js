const TIER_ORDER = ['가성비', '준종결', '종결', '일반', '플래티넘', '아바타', '엠블렘', '조율'];
const ENCHANT_INCLUDE_GROUPS = [
  { title: '마법부여', items: ['가성비', '준종결', '종결'] },
  { title: '오라/칭호/크리쳐', items: ['일반', '플래티넘', '오라', '칭호', '크리쳐', '아티팩트'], splitAfter: '플래티넘', breakBefore: true },
  { title: '버프강화', items: ['칭호', '크리쳐', '짙편린', '아바타'], breakBefore: true },
  { title: '아바타', items: ['엠블렘', '플래티넘 엠블렘'] },
  { title: '강화/증폭', items: ['강화', '증폭'] },
  { title: '장비', items: ['조율'] },
  { title: '서약', items: ['조율', '초월/정가'] },
  { title: '흑아', items: ['흑아'] },
  { title: '유일', items: ['제작'] },
];
const ENCHANT_INCLUDE_ORDER = ENCHANT_INCLUDE_GROUPS.flatMap((group) => group.items.map((item) => `${group.title}:${item}`));
const DEFAULT_DISABLED_ENCHANT_INCLUDE_GROUPS = new Set(['서약:초월/정가']);
function setOptions(select, values, allLabel) {
  if (!select) return;
  const current = select.value || 'all';
  select.innerHTML = [
    `<option value="all">${allLabel}</option>`,
    ...values.map((value) => `<option value="${value}">${value}</option>`),
  ].join('');
  select.value = values.includes(current) ? current : 'all';
}

export function createEnchantRecommendationControls({
  escapeHtml,
  slotOrder,
  getIncludeKeysForRow,
  slotFilter,
  tierFilter,
  includeControls,
  includeFilterStorageKey,
  includeKnownFilterStorageKey,
  storage,
}) {
  function resetEnchantRecommendationFilters() {
    if (slotFilter) slotFilter.value = 'all';
    if (tierFilter) tierFilter.value = 'all';
  }

  function renderEnchantIncludeControls(includeKeys = ENCHANT_INCLUDE_ORDER) {
    if (!includeControls) return;
    let storedChecked = null;
    if (includeFilterStorageKey) {
      try {
        const parsed = JSON.parse(storage.getItem(includeFilterStorageKey) || 'null');
        if (Array.isArray(parsed)) storedChecked = new Set(parsed.filter((key) => typeof key === 'string'));
      } catch {
        storedChecked = null;
      }
    }
    if (storedChecked) {
      const legacyOathKeys = ['서약:초월', '서약:정가'];
      const hadLegacyOathSelection = legacyOathKeys.some((key) => storedChecked.has(key));
      legacyOathKeys.forEach((key) => storedChecked.delete(key));
      if (hadLegacyOathSelection) storedChecked.add('서약:초월/정가');
      let knownKeys = null;
      if (includeKnownFilterStorageKey) {
        try {
          const parsedKnown = JSON.parse(storage.getItem(includeKnownFilterStorageKey) || 'null');
          if (Array.isArray(parsedKnown)) knownKeys = new Set(parsedKnown.filter((key) => typeof key === 'string'));
        } catch {
          knownKeys = null;
        }
      }
      const hadKnownKeys = Boolean(knownKeys);
      knownKeys = knownKeys || new Set(ENCHANT_INCLUDE_ORDER);
      legacyOathKeys.forEach((key) => knownKeys.delete(key));
      let addedNewKey = false;
      ENCHANT_INCLUDE_ORDER.forEach((key) => {
        if (!knownKeys.has(key)) {
          if (!DEFAULT_DISABLED_ENCHANT_INCLUDE_GROUPS.has(key)) {
            storedChecked.add(key);
          }
          knownKeys.add(key);
          addedNewKey = true;
        }
      });
      if ((addedNewKey || hadLegacyOathSelection) && includeFilterStorageKey) {
        try {
          storage.setItem(includeFilterStorageKey, JSON.stringify([...storedChecked]));
        } catch {
          // 저장소를 쓸 수 없어도 현재 렌더에서는 신규 항목을 켠다.
        }
      }
      if ((!hadKnownKeys || addedNewKey) && includeKnownFilterStorageKey) {
        try {
          storage.setItem(includeKnownFilterStorageKey, JSON.stringify([...knownKeys]));
        } catch {
          // known 키 저장 실패는 현재 체크 상태에 영향 주지 않는다.
        }
      }
    }
    const checked = new Set(
      [...includeControls.querySelectorAll('input[data-enchant-tier]:checked')]
        .map((input) => input.value),
    );
    const existingKeys = new Set(
      [...includeControls.querySelectorAll('input[data-enchant-tier]')]
        .map((input) => input.value),
    );
    const initialRender = includeControls.childElementCount === 0;
    const includeKeySet = new Set(includeKeys);
    includeControls.innerHTML = ENCHANT_INCLUDE_GROUPS
      .map((group) => {
        const options = group.items
          .map((item) => ({ item, key: `${group.title}:${item}` }))
          .filter(({ key }) => includeKeySet.has(key));
        if (!options.length) return '';
        return `
          ${group.breakBefore ? '<span class="enchant-include-group-break" aria-hidden="true"></span>' : ''}
          <div class="enchant-include-group">
            <div class="enchant-include-group-title">${escapeHtml(group.title)}</div>
            <div class="enchant-include-group-options${group.splitAfter ? ' is-split' : ''}">
              ${options.map(({ item, key }) => {
                const isChecked = storedChecked
                  ? storedChecked.has(key)
                  : existingKeys.has(key)
                    ? checked.has(key)
                    : !DEFAULT_DISABLED_ENCHANT_INCLUDE_GROUPS.has(key);
                return `
                  <label class="enchant-include-option">
                    <input type="checkbox" data-enchant-tier="${escapeHtml(key)}" value="${escapeHtml(key)}" ${isChecked ? 'checked' : ''} />
                    <span>${escapeHtml(item)}</span>
                  </label>
                  ${group.splitAfter === item ? '<span class="enchant-include-option-break" aria-hidden="true"></span>' : ''}
                `;
              }).join('')}
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderEnchantFilters(rows) {
    const slots = [...new Set(rows.map((row) => row.slot))].sort((a, b) => {
      const indexA = slotOrder.includes(a) ? slotOrder.indexOf(a) : slotOrder.length;
      const indexB = slotOrder.includes(b) ? slotOrder.indexOf(b) : slotOrder.length;
      return indexA - indexB;
    });
    const tiers = [...new Set(rows.map((row) => row.tier))].sort((a, b) => {
      const indexA = TIER_ORDER.includes(a) ? TIER_ORDER.indexOf(a) : TIER_ORDER.length;
      const indexB = TIER_ORDER.includes(b) ? TIER_ORDER.indexOf(b) : TIER_ORDER.length;
      return indexA - indexB;
    });
    const includeTiers = [...new Set([...ENCHANT_INCLUDE_ORDER, ...rows.flatMap(getIncludeKeysForRow)])].sort((a, b) => {
      const indexA = ENCHANT_INCLUDE_ORDER.includes(a) ? ENCHANT_INCLUDE_ORDER.indexOf(a) : ENCHANT_INCLUDE_ORDER.length;
      const indexB = ENCHANT_INCLUDE_ORDER.includes(b) ? ENCHANT_INCLUDE_ORDER.indexOf(b) : ENCHANT_INCLUDE_ORDER.length;
      if (indexA !== indexB) return indexA - indexB;
      return String(a).localeCompare(String(b), 'ko-KR');
    });
    setOptions(slotFilter, slots, '전체');
    setOptions(tierFilter, tiers, '전체');
    renderEnchantIncludeControls(includeTiers);
  }

  function getSelectedEnchantIncludeTiers() {
    if (!includeControls) return null;
    const checked = [...includeControls.querySelectorAll('input[data-enchant-tier]:checked')]
      .map((input) => input.value);
    return checked.length ? new Set(checked) : new Set();
  }

  function isEnchantIncludeKeySelected(key, includeTiers) {
    if (!includeTiers) return true;
    if (includeTiers.has(key)) return true;
    if (String(key).startsWith('버프강화:아바타:')) return includeTiers.has('버프강화:아바타');
    return false;
  }

  return {
    resetEnchantRecommendationFilters,
    renderEnchantIncludeControls,
    renderEnchantFilters,
    getSelectedEnchantIncludeTiers,
    isEnchantIncludeKeySelected,
  };
}
