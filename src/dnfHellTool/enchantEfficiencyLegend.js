import {
  DAMAGE_EFFICIENCY_COLOR_STOPS,
  BUFFER_EFFICIENCY_COLOR_STOPS,
} from './enchantEfficiencyScale.js';

export function createEnchantEfficiencyLegend({ escapeHtml, legendElement, getIsBuffer }) {
  function renderEfficiencyLegend(recommendations) {
    if (!legendElement) return;
    if (getIsBuffer()) {
      const items = [
        ...BUFFER_EFFICIENCY_COLOR_STOPS.map((stop) => ({
          className: 'scale',
          label: `100점당 ${stop.label}`,
          color: stop.color,
        })),
        { className: 'rainbow', label: '100점당 3333만 초과', color: '' },
      ];
      legendElement.innerHTML = items
        .map((item) => `
          <span class="enchant-efficiency-legend-item enchant-efficiency-${item.className}"${item.color ? ` style="--enchant-band: ${escapeHtml(item.color)}"` : ''}>
            <span class="enchant-efficiency-dot"></span>
            ${escapeHtml(item.label)}
          </span>
        `).join('');
      return;
    }
    const items = [
      ...DAMAGE_EFFICIENCY_COLOR_STOPS.map((stop) => ({
        className: 'scale',
        label: `0.1%당 ${stop.label}`,
        color: stop.color,
      })),
      { className: 'rainbow', label: '0.1%당 1000만 초과', color: '' },
    ];
    legendElement.innerHTML = items
      .map((item) => `
        <span class="enchant-efficiency-legend-item enchant-efficiency-${item.className}"${item.color ? ` style="--enchant-band: ${escapeHtml(item.color)}"` : ''}>
          <span class="enchant-efficiency-dot"></span>
          ${escapeHtml(item.label)}
        </span>
      `).join('');
  }

  return { renderEfficiencyLegend };
}
