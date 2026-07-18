export function getEfficiencyBand(costPerPointOnePercent) {
  if (Number(costPerPointOnePercent || 0) > DAMAGE_EFFICIENCY_COLOR_STOPS.at(-1).value) return 'rainbow';
  return 'scale';
}

export const DAMAGE_EFFICIENCY_COLOR_STOPS = [
  { value: 700000, label: '70만', color: '#22c55e' },
  { value: 1000000, label: '100만', color: '#a3e635' },
  { value: 1500000, label: '150만', color: '#facc15' },
  { value: 2000000, label: '200만', color: '#f97316' },
  { value: 5000000, label: '500만', color: '#ef4444' },
  { value: 10000000, label: '1000만', color: '#991b1b' },
];
export const BUFFER_EFFICIENCY_COLOR_STOPS = [
  { value: 1000000, label: '100만', color: '#22c55e' },
  { value: 2000000, label: '200만', color: '#a3e635' },
  { value: 4000000, label: '400만', color: '#facc15' },
  { value: 10000000, label: '1000만', color: '#f97316' },
  { value: 20000000, label: '2000만', color: '#ef4444' },
  { value: 33333333, label: '3333만', color: '#991b1b' },
];

function parseHexColor(color) {
  const normalized = String(color || '').replace('#', '');
  if (normalized.length !== 6) return [100, 116, 139];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function mixHexColor(fromColor, toColor, ratio) {
  const from = parseHexColor(fromColor);
  const to = parseHexColor(toColor);
  const clamped = Math.max(0, Math.min(1, ratio));
  const mixed = from.map((value, index) => Math.round(value + (to[index] - value) * clamped));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function getEfficiencyColor(costPerPointOnePercent) {
  const cost = Number(costPerPointOnePercent || 0);
  if (!Number.isFinite(cost) || cost <= DAMAGE_EFFICIENCY_COLOR_STOPS[0].value) {
    return DAMAGE_EFFICIENCY_COLOR_STOPS[0].color;
  }
  for (let index = 1; index < DAMAGE_EFFICIENCY_COLOR_STOPS.length; index += 1) {
    const previous = DAMAGE_EFFICIENCY_COLOR_STOPS[index - 1];
    const current = DAMAGE_EFFICIENCY_COLOR_STOPS[index];
    if (cost <= current.value) {
      return mixHexColor(previous.color, current.color, (cost - previous.value) / (current.value - previous.value));
    }
  }
  return DAMAGE_EFFICIENCY_COLOR_STOPS.at(-1).color;
}

export function getArrowBackground(fromCost, toCost) {
  if (
    Number(fromCost || 0) > DAMAGE_EFFICIENCY_COLOR_STOPS.at(-1).value ||
    Number(toCost || 0) > DAMAGE_EFFICIENCY_COLOR_STOPS.at(-1).value
  ) {
    return 'linear-gradient(90deg, #ef4444, #f97316, #facc15, #22c55e, #38bdf8, #a855f7, #ef4444)';
  }
  const fromColor = getEfficiencyColor(fromCost);
  const toColor = getEfficiencyColor(toCost);
  if (fromColor === toColor) return fromColor;
  return `linear-gradient(90deg, ${fromColor} 0 50%, ${toColor} 50% 100%)`;
}

export function getBufferEfficiencyBand(costPerHundredPoints) {
  if (Number(costPerHundredPoints || 0) > BUFFER_EFFICIENCY_COLOR_STOPS.at(-1).value) return 'rainbow';
  return 'scale';
}

export function getBufferEfficiencyColor(costPerHundredPoints) {
  const cost = Number(costPerHundredPoints || 0);
  if (!Number.isFinite(cost) || cost <= BUFFER_EFFICIENCY_COLOR_STOPS[0].value) {
    return BUFFER_EFFICIENCY_COLOR_STOPS[0].color;
  }
  for (let index = 1; index < BUFFER_EFFICIENCY_COLOR_STOPS.length; index += 1) {
    const previous = BUFFER_EFFICIENCY_COLOR_STOPS[index - 1];
    const current = BUFFER_EFFICIENCY_COLOR_STOPS[index];
    if (cost <= current.value) {
      return mixHexColor(previous.color, current.color, (cost - previous.value) / (current.value - previous.value));
    }
  }
  return BUFFER_EFFICIENCY_COLOR_STOPS.at(-1).color;
}

export function getBufferArrowBackground(fromCost, toCost) {
  if (
    Number(fromCost || 0) > BUFFER_EFFICIENCY_COLOR_STOPS.at(-1).value ||
    Number(toCost || 0) > BUFFER_EFFICIENCY_COLOR_STOPS.at(-1).value
  ) {
    return 'linear-gradient(90deg, #ef4444, #f97316, #facc15, #22c55e, #38bdf8, #a855f7, #ef4444)';
  }
  const fromColor = getBufferEfficiencyColor(fromCost);
  const toColor = getBufferEfficiencyColor(toCost);
  if (fromColor === toColor) return fromColor;
  return `linear-gradient(90deg, ${fromColor} 0 50%, ${toColor} 50% 100%)`;
}
