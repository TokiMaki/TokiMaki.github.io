import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { createEnchantEfficiencyLegend } from '../src/dnfHellTool/enchantEfficiencyLegend.js';
import {
  DAMAGE_EFFICIENCY_COLOR_STOPS,
  BUFFER_EFFICIENCY_COLOR_STOPS,
} from '../src/dnfHellTool/enchantEfficiencyScale.js';

const EXPECTED_HTML = {
  dealer: {
    length: 1444,
    sha256: '35d0b956af62d4b988bc14f6b0901efd869376647f0b0089e5c7c7a1461e395a',
  },
  buffer: {
    length: 1517,
    sha256: '85ac9722a6bcc950980bc14460c338115aa3c583f1ef8e3b1071d3ca8bd87ea7',
  },
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertExpectedHtml(html, mode) {
  assert.equal(html.length, EXPECTED_HTML[mode].length);
  assert.equal(sha256(html), EXPECTED_HTML[mode].sha256);
}

function renderLegacyEfficiencyLegend({ legendElement, isBuffer }, recommendations) {
  if (!legendElement) return;
  if (isBuffer) {
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

test('legend element가 없으면 아무 작업도 하지 않는다', () => {
  let getterCalls = 0;
  const { renderEfficiencyLegend } = createEnchantEfficiencyLegend({
    escapeHtml,
    legendElement: null,
    getIsBuffer: () => {
      getterCalls += 1;
      return true;
    },
  });

  assert.doesNotThrow(() => renderEfficiencyLegend([{ ignored: true }]));
  assert.equal(getterCalls, 0);
});

test('baseline이 없으면 dealer 범례를 렌더링한다', () => {
  const state = { currentBufferBaseline: null };
  const legendElement = { innerHTML: '' };
  const { renderEfficiencyLegend } = createEnchantEfficiencyLegend({
    escapeHtml,
    legendElement,
    getIsBuffer: () => Boolean(state.currentBufferBaseline?.isBuffer),
  });

  renderEfficiencyLegend();

  assertExpectedHtml(legendElement.innerHTML, 'dealer');
});

test('dealer와 buffer raw HTML 해시 및 길이가 원본 snapshot과 같다', () => {
  for (const [mode, isBuffer] of [['dealer', false], ['buffer', true]]) {
    const legendElement = { innerHTML: '' };
    const { renderEfficiencyLegend } = createEnchantEfficiencyLegend({
      escapeHtml,
      legendElement,
      getIsBuffer: () => isBuffer,
    });

    renderEfficiencyLegend([{ mode }]);

    assertExpectedHtml(legendElement.innerHTML, mode);
  }
});

test('같은 factory가 dealer에서 buffer로, 다시 dealer로 live 전환한다', () => {
  const state = { currentBufferBaseline: null };
  const legendElement = { innerHTML: '' };
  const { renderEfficiencyLegend } = createEnchantEfficiencyLegend({
    escapeHtml,
    legendElement,
    getIsBuffer: () => Boolean(state.currentBufferBaseline?.isBuffer),
  });

  renderEfficiencyLegend();
  const firstDealerHtml = legendElement.innerHTML;
  state.currentBufferBaseline = { isBuffer: true };
  renderEfficiencyLegend();
  const bufferHtml = legendElement.innerHTML;
  state.currentBufferBaseline = { isBuffer: false };
  renderEfficiencyLegend();
  const secondDealerHtml = legendElement.innerHTML;

  assertExpectedHtml(firstDealerHtml, 'dealer');
  assertExpectedHtml(bufferHtml, 'buffer');
  assert.equal(secondDealerHtml, firstDealerHtml);
  assert.notEqual(bufferHtml, firstDealerHtml);
});

test('recommendations 인자는 raw HTML에 영향을 주지 않는다', () => {
  const legendElement = { innerHTML: '' };
  const { renderEfficiencyLegend } = createEnchantEfficiencyLegend({
    escapeHtml,
    legendElement,
    getIsBuffer: () => false,
  });

  renderEfficiencyLegend();
  const withoutArgument = legendElement.innerHTML;
  renderEfficiencyLegend([{ arbitrary: 'value' }]);
  const withArrayArgument = legendElement.innerHTML;
  renderEfficiencyLegend({ nested: { ignored: true } });
  const withObjectArgument = legendElement.innerHTML;

  assert.equal(withArrayArgument, withoutArgument);
  assert.equal(withObjectArgument, withoutArgument);
});

test('새 factory의 raw HTML이 이동 전 함수와 완전히 같다', () => {
  for (const isBuffer of [false, true]) {
    const legacyElement = { innerHTML: '' };
    const factoryElement = { innerHTML: '' };
    renderLegacyEfficiencyLegend({ legendElement: legacyElement, isBuffer }, ['legacy']);
    const { renderEfficiencyLegend } = createEnchantEfficiencyLegend({
      escapeHtml,
      legendElement: factoryElement,
      getIsBuffer: () => isBuffer,
    });

    renderEfficiencyLegend(['factory']);

    assert.equal(factoryElement.innerHTML, legacyElement.innerHTML);
  }
});
