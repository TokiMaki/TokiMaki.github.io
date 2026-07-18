export function createEnchantPortraitDetailPanel({ escapeHtml, getPortraitContainer }) {
  function resetEnchantPortraitDetailPanel() {
    const portraitRoot = getPortraitContainer()?.querySelector('.enchant-character-portrait');
    const panel = getPortraitContainer()?.querySelector('[data-enchant-portrait-detail]');
    if (!panel) return;
    if (portraitRoot) portraitRoot.classList.remove('is-detail-active');
    const titleEl = panel.querySelector('[data-enchant-portrait-detail-title]');
    const bodyEl = panel.querySelector('[data-enchant-portrait-detail-body]');
    if (titleEl) titleEl.textContent = '장비 상세';
    if (bodyEl) bodyEl.textContent = '장비에 마우스를 올리면 상세 정보가 표시됩니다.';
  }

  function setEnchantPortraitDetailPanel(title, lines = []) {
    const portraitRoot = getPortraitContainer()?.querySelector('.enchant-character-portrait');
    const panel = getPortraitContainer()?.querySelector('[data-enchant-portrait-detail]');
    if (!panel) return;
    if (portraitRoot) portraitRoot.classList.add('is-detail-active');
    const titleEl = panel.querySelector('[data-enchant-portrait-detail-title]');
    const bodyEl = panel.querySelector('[data-enchant-portrait-detail-body]');
    if (titleEl) titleEl.textContent = title || '장비 상세';
    if (bodyEl) {
      bodyEl.innerHTML = (lines || [])
        .filter(Boolean)
        .map((line) => {
          const text = typeof line === 'string' ? line : line?.text;
          const className = typeof line === 'string' ? '' : line?.className || '';
          return `<span class="enchant-portrait-detail-line ${escapeHtml(className)}">${escapeHtml(text || '')}</span>`;
        })
        .join('') || '<span class="enchant-portrait-detail-line enchant-portrait-detail-line-sub">표시할 정보가 없습니다.</span>';
    }
  }

  function bindEnchantPortraitDetailPanel() {
    if (!getPortraitContainer()) return;
    const slots = [...getPortraitContainer().querySelectorAll('.enchant-character-slot')];
    slots.forEach((slot) => {
      const title = String(slot.dataset.detailTitle || '').trim();
      let lines = [];
      try {
        lines = JSON.parse(slot.dataset.detailLines || '[]');
      } catch {
        lines = [];
      }
      const activate = () => setEnchantPortraitDetailPanel(title, lines);
      slot.addEventListener('mouseenter', activate);
      slot.addEventListener('focus', activate);
      slot.addEventListener('mouseleave', resetEnchantPortraitDetailPanel);
      slot.addEventListener('blur', resetEnchantPortraitDetailPanel);
    });
    resetEnchantPortraitDetailPanel();
  }

  function bindOathCrystalDetailPanel() {
    if (!getPortraitContainer()) return;
    const slots = [...getPortraitContainer().querySelectorAll('.enchant-oath-slot[data-oath-index], .enchant-oath-symbol[data-oath-symbol-detail]')];
    slots.forEach((slot) => {
      const title = String(slot.dataset.detailTitle || '').trim();
      let lines = [];
      try {
        lines = JSON.parse(slot.dataset.detailLines || '[]');
      } catch {
        lines = [];
      }
      const activate = () => setEnchantPortraitDetailPanel(title, lines);
      slot.addEventListener('mouseenter', activate);
      slot.addEventListener('focus', activate);
      slot.addEventListener('mouseleave', resetEnchantPortraitDetailPanel);
      slot.addEventListener('blur', resetEnchantPortraitDetailPanel);
    });
    resetEnchantPortraitDetailPanel();
  }

  function bindAvatarSlotDetailPanel() {
    if (!getPortraitContainer()) return;
    const slots = [...getPortraitContainer().querySelectorAll('.enchant-avatar-slot[data-avatar-slot-key][data-detail-title]')];
    slots.forEach((slot) => {
      const title = String(slot.dataset.detailTitle || '').trim();
      let lines = [];
      try {
        lines = JSON.parse(slot.dataset.detailLines || '[]');
      } catch {
        lines = [];
      }
      const activate = () => setEnchantPortraitDetailPanel(title, lines);
      slot.addEventListener('mouseenter', activate);
      slot.addEventListener('focus', activate);
      slot.addEventListener('mouseleave', resetEnchantPortraitDetailPanel);
      slot.addEventListener('blur', resetEnchantPortraitDetailPanel);
    });
    resetEnchantPortraitDetailPanel();
  }

  function bindBuffLoadoutDetailPanel() {
    if (!getPortraitContainer()) return;
    const slots = [...getPortraitContainer().querySelectorAll('[data-buff-loadout-detail]')];
    slots.forEach((slot) => {
      const title = String(slot.dataset.detailTitle || '').trim();
      let lines = [];
      try {
        lines = JSON.parse(slot.dataset.detailLines || '[]');
      } catch {
        lines = [];
      }
      const activate = () => setEnchantPortraitDetailPanel(title, lines);
      slot.addEventListener('mouseenter', activate);
      slot.addEventListener('focus', activate);
      slot.addEventListener('mouseleave', resetEnchantPortraitDetailPanel);
      slot.addEventListener('blur', resetEnchantPortraitDetailPanel);
    });
    resetEnchantPortraitDetailPanel();
  }

  return {
    bindEnchantPortraitDetailPanel,
    bindOathCrystalDetailPanel,
    bindAvatarSlotDetailPanel,
    bindBuffLoadoutDetailPanel,
  };
}
