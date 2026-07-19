export function createEnchantOathSymbolFallback({ getPortraitContainer }) {
  function bindOathSymbolFallback() {
    getPortraitContainer()?.querySelectorAll('[data-oath-symbol-image]').forEach((img) => {
      const showFallback = () => {
        img.hidden = true;
        img.closest('.enchant-oath-symbol')?.classList.add('is-fallback');
      };
      if (img.complete && img.naturalWidth === 0) {
        showFallback();
        return;
      }
      img.addEventListener('error', showFallback, { once: true });
    });
  }

  return { bindOathSymbolFallback };
}
