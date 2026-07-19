export function createEnchantRecommendationLayout({ getRecommendList }) {
  function fitEnchantRecommendTitles() {
    if (!getRecommendList()) return;
    getRecommendList().querySelectorAll('.enchant-recommend-title').forEach((title) => {
      const text = title.querySelector('.enchant-recommend-title-text');
      if (!text) return;
      title.classList.remove('is-ellipsis');
      text.style.letterSpacing = '';
      text.style.transform = '';
      const availableWidth = title.clientWidth;
      if (!availableWidth) return;
      if (text.scrollWidth <= availableWidth) return;

      text.style.letterSpacing = '-0.03em';
      if (text.scrollWidth <= availableWidth) return;

      text.style.letterSpacing = '-0.05em';
      if (text.scrollWidth <= availableWidth) return;

      const scale = Math.max(0.95, Math.min(1, availableWidth / text.scrollWidth));
      if (scale < 1) {
        text.style.transform = `scaleX(${scale.toFixed(3)})`;
        if (text.getBoundingClientRect().width <= availableWidth + 0.5) return;
      }

      text.style.transform = '';
      title.classList.add('is-ellipsis');
    });
  }

  function scheduleFitEnchantRecommendTitles() {
    fitEnchantRecommendTitles();
    window.requestAnimationFrame(() => fitEnchantRecommendTitles());
  }

  function adjustRecommendPopoverShift(popover) {
    if (!popover) return;
    const margin = 8;
    popover.style.setProperty('--popover-shift-x', '0px');
    const viewportWidth = Math.min(
      window.innerWidth || document.documentElement.clientWidth || 0,
      document.documentElement.clientWidth || window.innerWidth || 0,
    );
    if (!viewportWidth) return;
    const rect = popover.getBoundingClientRect();
    const renderedScaleX = popover.offsetWidth > 0 ? rect.width / popover.offsetWidth : 1;
    const cssPixelRatio = renderedScaleX > 0 ? renderedScaleX : 1;
    let shiftX = 0;
    const overflowRight = rect.right - (viewportWidth - margin);
    if (overflowRight > 0) {
      shiftX -= overflowRight;
    }
    const overflowLeft = margin - (rect.left + shiftX);
    if (overflowLeft > 0) {
      shiftX += overflowLeft;
    }
    if (Math.abs(shiftX) > 0.5) {
      popover.style.setProperty('--popover-shift-x', `${Math.round(shiftX / cssPixelRatio)}px`);
    }
  }

  function scheduleRecommendPopoverShift(target) {
    const host = target?.closest?.('.enchant-recommend-item, .enchant-recommend-step-tune');
    const popover = host?.querySelector?.('.enchant-recommend-popover');
    if (!popover) return;
    window.requestAnimationFrame(() => adjustRecommendPopoverShift(popover));
  }

  function scheduleOpenTunePopoverShift() {
    window.requestAnimationFrame(() => {
      const popover = getRecommendList()?.querySelector('.enchant-recommend-step-tune.is-tune-popover-open .enchant-recommend-popover');
      adjustRecommendPopoverShift(popover);
    });
  }

  function resetRecommendPopoverShift(target) {
    const host = target?.closest?.('.enchant-recommend-item, .enchant-recommend-step-tune');
    host?.querySelector?.('.enchant-recommend-popover')?.style.removeProperty('--popover-shift-x');
  }

  function isLeavingRecommendPopoverHost(event) {
    const host = event.target?.closest?.('.enchant-recommend-step-tune, .enchant-recommend-item');
    if (!host) return false;
    const related = event.relatedTarget;
    return !(related && host.contains(related));
  }

  return {
    scheduleFitEnchantRecommendTitles,
    scheduleRecommendPopoverShift,
    scheduleOpenTunePopoverShift,
    resetRecommendPopoverShift,
    isLeavingRecommendPopoverHost,
  };
}
