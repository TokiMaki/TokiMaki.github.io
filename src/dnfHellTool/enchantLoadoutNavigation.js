export function createEnchantLoadoutNavigation({ escapeHtml, getPortraitContainer, getActiveTab, setActiveTab, renderPortrait }) {
  function renderEnchantLoadoutTabs(activeTab) {
    const tabs = [
      ['equipment', '장비'],
      ['oath', '서약'],
      ['avatar', '아바타'],
      ['buff', '버프강화'],
    ];
    return `
      <div class="enchant-loadout-tabs" role="tablist" aria-label="캐릭터 로드아웃">
        ${tabs.map(([value, label]) => `
          <button type="button" class="enchant-loadout-tab${activeTab === value ? ' is-active' : ''}" role="tab" aria-selected="${activeTab === value ? 'true' : 'false'}" data-enchant-loadout-tab="${escapeHtml(value)}">
            ${escapeHtml(label)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function bindEnchantLoadoutNavigation() {
    const container = getPortraitContainer();
    if (!container) return;
    container.addEventListener('click', (event) => {
      const target = event.target.closest('[data-enchant-loadout-tab]');
      if (!target) return;
      event.preventDefault();
      const requestedTab = String(target.dataset.enchantLoadoutTab || '');
      const nextTab = ['equipment', 'oath', 'avatar', 'buff'].includes(requestedTab) ? requestedTab : 'equipment';
      if (getActiveTab() === nextTab) return;
      setActiveTab(nextTab);
      renderPortrait();
    });
  }

  return {
    renderEnchantLoadoutTabs,
    bindEnchantLoadoutNavigation,
  };
}
