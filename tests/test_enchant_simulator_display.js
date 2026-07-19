import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createEnchantSimulatorDisplay } from '../src/dnfHellTool/enchantSimulatorDisplay.js';
import {
  getEfficiencyBand,
  getEfficiencyColor,
  getBufferEfficiencyBand,
  getBufferEfficiencyColor,
} from '../src/dnfHellTool/enchantEfficiencyScale.js';

const BUFFER_ICON_URL = 'buffer<&>.png';
const EQUIPMENT_ICON_URL = new URL('../이미지/equipmentScore.png', import.meta.url).href;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCompactGold(value) {
  if (!Number.isFinite(value) || value <= 0) return '-';
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(value >= 1000000000 ? 1 : 2).replace(/\.?0+$/, '')}억`;
  }
  if (value >= 10000) {
    return `${Math.round(value / 10000).toLocaleString('ko-KR')}만`;
  }
  return Math.round(value).toLocaleString('ko-KR');
}

function formatKoreanGoldUnits(value) {
  const gold = Math.max(0, Math.floor(Number(value) || 0));
  const eok = Math.floor(gold / 100000000);
  const man = Math.floor((gold % 100000000) / 10000);
  if (eok > 0) {
    return `${eok.toLocaleString('ko-KR')}억${man > 0 ? ` ${man.toLocaleString('ko-KR')}만` : ''}`;
  }
  if (man > 0) return `${man.toLocaleString('ko-KR')}만`;
  return gold.toLocaleString('ko-KR');
}

function createHarness(overrides = {}) {
  const calls = {
    context: 0,
    calculateBufferScore: [],
    damageMultiplier: [],
  };
  let context = {
    simulator: null,
    currentBufferBaseline: null,
    currentOfficialBufferScore: null,
    currentOfficialEquipmentScore: null,
    currentOfficialEquipmentScoreStatus: 'idle',
    simulatorHintElement: null,
    simulatorActionsElement: null,
    ...overrides.context,
  };
  let bufferScore = overrides.bufferScore ?? 1000;
  let multipliers = {
    actual: 1,
    equipmentScore: 1,
    ...overrides.multipliers,
  };
  const display = createEnchantSimulatorDisplay({
    escapeHtml,
    calculateBufferScore: (baseline) => {
      calls.calculateBufferScore.push(baseline);
      return bufferScore;
    },
    getSimulatorCumulativeDamageMultiplier: (simulator, mode) => {
      calls.damageMultiplier.push({ simulator, mode });
      return multipliers[mode];
    },
    formatCompactGold,
    formatKoreanGoldUnits,
    getDisplayContext: () => {
      calls.context += 1;
      return context;
    },
    bufferScoreIconUrl: BUFFER_ICON_URL,
  });
  return {
    ...display,
    calls,
    get context() {
      return context;
    },
    setContext(next) {
      context = { ...context, ...next };
    },
    setBufferScore(next) {
      bufferScore = next;
    },
    setMultipliers(next) {
      multipliers = { ...multipliers, ...next };
    },
  };
}

function expectIncludes(html, fragments) {
  for (const fragment of fragments) {
    assert.ok(html.includes(fragment), `Expected HTML to include: ${fragment}\n${html}`);
  }
}

function testActions() {
  const hint = { hidden: false };
  const actions = { hidden: false };
  const harness = createHarness({
    context: {
      simulatorHintElement: hint,
      simulatorActionsElement: actions,
    },
  });

  harness.renderDealerSimulatorActions();
  assert.equal(hint.hidden, true, 'null simulator hides the hint');
  assert.equal(actions.hidden, true, 'null simulator hides actions');
  assert.equal(harness.calls.context, 1, 'context is read once per public call');

  harness.setContext({ simulator: { role: 'dealer', activeSelectionByGroup: {} } });
  harness.renderDealerSimulatorActions();
  assert.equal(hint.hidden, false, 'empty dealer simulator shows hint');
  assert.equal(actions.hidden, true, 'empty dealer simulator hides actions');

  harness.setContext({
    simulator: { role: 'dealer', activeSelectionByGroup: { enchant: {} } },
  });
  harness.renderDealerSimulatorActions();
  assert.equal(hint.hidden, true, 'changed dealer simulator hides hint');
  assert.equal(actions.hidden, false, 'changed dealer simulator shows actions');

  harness.setContext({
    simulator: { role: 'buffer', activeSelectionByGroup: { enchant: {} } },
  });
  harness.renderDealerSimulatorActions();
  assert.equal(hint.hidden, true, 'changed buffer simulator hides hint');
  assert.equal(actions.hidden, false, 'changed buffer simulator shows actions');

  harness.setContext({
    simulator: { role: 'buffer', activeSelectionByGroup: {} },
    simulatorHintElement: null,
    simulatorActionsElement: null,
  });
  assert.doesNotThrow(() => harness.renderDealerSimulatorActions());
  assert.equal(harness.calls.context, 5, 'missing elements still use one fresh context read');
}

function testBufferMetaFallbacksAndBoundaries() {
  const rawMeta = '<span data-raw="yes">A&B</span>';
  const harness = createHarness({
    bufferScore: 1000,
    context: {
      currentBufferBaseline: { marker: 'baseline' },
      currentOfficialBufferScore: 5000,
      simulator: null,
    },
  });

  const baseHtml = harness.renderBufferSimulatorMeta(rawMeta);
  assert.equal(baseHtml, `
        <div class="enchant-portrait-buffer-score">
          <strong><img src="buffer&lt;&amp;&gt;.png" alt="" loading="lazy" decoding="async" />5,000</strong>
        </div>
        ${rawMeta}
      `);
  assert.equal(harness.calls.calculateBufferScore.length, 1);
  assert.equal(harness.calls.context, 1);
  assert.ok(baseHtml.includes(rawMeta), 'original character meta is inserted raw');

  harness.setContext({ currentOfficialBufferScore: 0 });
  const zeroOfficial = harness.renderBufferSimulatorMeta(rawMeta);
  expectIncludes(zeroOfficial, ['>1,000</strong>', rawMeta]);

  harness.setContext({ currentOfficialBufferScore: Number.NaN });
  const nanOfficial = harness.renderBufferSimulatorMeta(rawMeta);
  expectIncludes(nanOfficial, ['>1,000</strong>', rawMeta]);

  harness.setContext({
    currentOfficialBufferScore: 5000,
    simulator: {
      role: 'buffer',
      baseBufferScore: 1000,
      currentBufferScore: 1000.49,
      totalGold: 1000.4,
      activeSelectionByGroup: { enchant: {} },
    },
  });
  const belowBoundary = harness.renderBufferSimulatorMeta(rawMeta);
  const belowCost = 1000 * 100 / 0.49;
  expectIncludes(belowBoundary, [
    '>5,000</strong>',
    '>변동 없음</span>',
    '버프점수 상승률 <strong>+0.01%</strong>',
    'data-full-gold="1,000 골드"',
    `100점당 <strong>${formatCompactGold(belowCost)}</strong>`,
    rawMeta,
  ]);
  assert.equal(getBufferEfficiencyBand(belowCost), 'scale');
  expectIncludes(belowBoundary, [
    `style="--simulator-efficiency-color: ${getBufferEfficiencyColor(belowCost)}"`,
  ]);

  harness.setContext({
    simulator: {
      role: 'buffer',
      baseBufferScore: 1000,
      currentBufferScore: 1000.5,
      totalGold: 200000,
      activeSelectionByGroup: { enchant: {} },
    },
  });
  const atBoundary = harness.renderBufferSimulatorMeta(rawMeta);
  expectIncludes(atBoundary, [
    '>▲1</span>',
    '버프점수 상승률 <strong>+0.01%</strong>',
    'class="enchant-simulator-efficiency is-rainbow"',
    '100점당 <strong>4,000만</strong>',
  ]);
  assert.equal(getBufferEfficiencyBand(200000 * 100 / 0.5), 'rainbow');
  assert.ok(!atBoundary.includes('--simulator-efficiency-color:'), 'rainbow omits scale style');

  harness.setContext({
    simulator: {
      role: 'buffer',
      baseBufferScore: 1000,
      currentBufferScore: 999.49,
      totalGold: 999.6,
      activeSelectionByGroup: { enchant: {} },
    },
  });
  const negative = harness.renderBufferSimulatorMeta(rawMeta);
  expectIncludes(negative, [
    '>▼1</span>',
    '버프점수 상승률 <strong>-0.01%</strong>',
    'data-full-gold="1,000 골드"',
    '100점당 <strong>-</strong>',
  ]);
  assert.ok(!negative.includes('is-rainbow'));
  assert.ok(!negative.includes('--simulator-efficiency-color:'), 'negative delta has no efficiency style');

  harness.setContext({
    simulator: {
      role: 'dealer',
      baseBufferScore: 1000,
      currentBufferScore: 1100,
      totalGold: 100,
      activeSelectionByGroup: { enchant: {} },
    },
  });
  const dealerRole = harness.renderBufferSimulatorMeta(rawMeta);
  assert.ok(!dealerRole.includes('enchant-portrait-info-split'), 'buffer meta requires buffer role for simulated split');
}

function testBufferMetaExactSimulatedHtml() {
  const rawMeta = '<b class="raw">RAW</b>';
  const harness = createHarness({
    context: {
      currentOfficialBufferScore: 2000,
      currentBufferBaseline: {},
      simulator: {
        role: 'buffer',
        baseBufferScore: 1000,
        currentBufferScore: 1010,
        totalGold: 12345.6,
        activeSelectionByGroup: { one: {} },
      },
    },
  });
  const scoreDelta = 10;
  const currentScore = 2010;
  const increasePercent = (currentScore / 2000 - 1) * 100;
  const totalGold = 12346;
  const cost = totalGold * 100 / scoreDelta;
  const color = getBufferEfficiencyColor(cost);
  const actual = harness.renderBufferSimulatorMeta(rawMeta);
  const expected = `
      <div class="enchant-portrait-info-split">
        <div class="enchant-portrait-info-simulation">
          <span class="enchant-portrait-info-label">예상 버프점수</span>
          <div class="enchant-portrait-buffer-score is-simulated">
            <strong tabindex="0" data-tooltip="현재 적용 중인 버퍼 시뮬레이션 결과입니다."><img src="buffer&lt;&amp;&gt;.png" alt="" loading="lazy" decoding="async" />2,010</strong>
          </div>
          <span class="enchant-portrait-score-delta">▲10</span>
          <span class="enchant-portrait-damage-increase">버프점수 상승률 <strong>+${increasePercent.toFixed(2)}%</strong></span>
          <span class="enchant-simulator-summary" tabindex="0" data-full-gold="12,346 골드" aria-label="누적 골드 12,346 골드">누적 골드 <strong>1만</strong></span>
          <span class="enchant-simulator-efficiency" style="--simulator-efficiency-color: ${color}">100점당 <strong>${formatCompactGold(cost)}</strong></span>
        </div>
        <div class="enchant-portrait-info-original">
          <span class="enchant-portrait-info-label">현재 버프점수</span>
          <div class="enchant-portrait-buffer-score">
            <strong><img src="buffer&lt;&amp;&gt;.png" alt="" loading="lazy" decoding="async" />2,000</strong>
          </div>
          ${rawMeta}
        </div>
      </div>
    `;
  assert.equal(actual, expected);
}

function testDealerMetaStatesAndBoundaries() {
  const rawMeta = '<i data-raw="dealer">A&B</i>';
  const harness = createHarness({
    context: {
      currentOfficialEquipmentScoreStatus: 'loading',
      currentOfficialEquipmentScore: 12345,
      simulator: null,
    },
  });

  const loading = harness.renderDealerSimulatorMeta(rawMeta);
  assert.equal(loading, `
        <div class="enchant-portrait-equipment-score">
          <strong><img src="${escapeHtml(EQUIPMENT_ICON_URL)}" alt="" loading="lazy" decoding="async" />확인 중</strong>
        </div>
        ${rawMeta}
      `);
  assert.equal(harness.calls.damageMultiplier.length, 0);
  assert.equal(harness.calls.context, 1);

  harness.setContext({
    currentOfficialEquipmentScoreStatus: 'ready',
    currentOfficialEquipmentScore: 12345,
  });
  const ready = harness.renderDealerSimulatorMeta(rawMeta);
  expectIncludes(ready, ['>12,345</strong>', rawMeta]);

  harness.setContext({ currentOfficialEquipmentScore: Number.NaN });
  const invalid = harness.renderDealerSimulatorMeta(rawMeta);
  expectIncludes(invalid, ['>확인 불가</strong>', rawMeta]);

  const simulator = {
    role: 'buffer',
    totalGold: 1000.4,
    activeSelectionByGroup: { any: {} },
  };
  harness.setContext({
    simulator,
    currentOfficialEquipmentScoreStatus: 'ready',
    currentOfficialEquipmentScore: 10000,
  });
  harness.setMultipliers({ actual: 1.000049, equipmentScore: 1.1 });
  const belowBoundary = harness.renderDealerSimulatorMeta(rawMeta);
  expectIncludes(belowBoundary, [
    '>11,000</strong>',
    '>▲1,000</span>',
    '딜 상승률 <strong>0.00%</strong>',
    'data-full-gold="1,000 골드"',
    '0.1%당 <strong>-</strong>',
    rawMeta,
  ]);
  assert.deepEqual(
    harness.calls.damageMultiplier.slice(-2).map((entry) => entry.mode),
    ['actual', 'equipmentScore'],
    'actual and equipment-score multipliers are resolved independently',
  );
  assert.equal(harness.calls.damageMultiplier.at(-2).simulator, simulator);

  harness.setMultipliers({ actual: 1.00005, equipmentScore: 1 });
  const atBoundary = harness.renderDealerSimulatorMeta(rawMeta);
  const rawBoundaryPercent = (1.00005 - 1) * 100;
  const boundaryCost = 1000 * 0.1 / rawBoundaryPercent;
  expectIncludes(atBoundary, [
    '>변동 없음</span>',
    `딜 상승률 <strong>+${rawBoundaryPercent.toFixed(2)}%</strong>`,
    `0.1%당 <strong>${formatCompactGold(boundaryCost)}</strong>`,
    `style="--simulator-efficiency-color: ${getEfficiencyColor(boundaryCost)}"`,
  ]);
  assert.equal(getEfficiencyBand(boundaryCost), 'scale');

  harness.setContext({
    simulator: {
      ...simulator,
      totalGold: 600000,
    },
  });
  const rainbow = harness.renderDealerSimulatorMeta(rawMeta);
  expectIncludes(rainbow, [
    'class="enchant-simulator-efficiency is-rainbow"',
    '0.1%당 <strong>1,200만</strong>',
  ]);
  assert.ok(!rainbow.includes('--simulator-efficiency-color:'), 'rainbow omits scale style');

  harness.setMultipliers({ actual: 0.9999, equipmentScore: 0.9999 });
  const negative = harness.renderDealerSimulatorMeta(rawMeta);
  expectIncludes(negative, [
    '>▼1</span>',
    '딜 상승률 <strong>-0.01%</strong>',
    '0.1%당 <strong>-</strong>',
  ]);
  assert.ok(!negative.includes('is-rainbow'));

  harness.setMultipliers({ actual: Number.NaN, equipmentScore: 0 });
  const invalidMultipliers = harness.renderDealerSimulatorMeta(rawMeta);
  expectIncludes(invalidMultipliers, [
    '>확인 불가</span>',
    '딜 상승률 <strong>0.00%</strong>',
    '0.1%당 <strong>-</strong>',
  ]);

  harness.setContext({ currentOfficialEquipmentScore: Number.NaN });
  const invalidScoreWithChanges = harness.renderDealerSimulatorMeta(rawMeta);
  expectIncludes(invalidScoreWithChanges, [
    '>확인 불가</strong>',
    '>확인 불가</span>',
    rawMeta,
  ]);
}

function testDealerMetaExactSimulatedHtml() {
  const rawMeta = '<u class="raw">RAW</u>';
  const simulator = {
    role: 'dealer',
    totalGold: 12345.6,
    activeSelectionByGroup: { one: {} },
  };
  const harness = createHarness({
    context: {
      simulator,
      currentOfficialEquipmentScore: 10000,
      currentOfficialEquipmentScoreStatus: 'ready',
    },
    multipliers: {
      actual: 1.01,
      equipmentScore: 1.005,
    },
  });
  const rawDamagePercent = (1.01 - 1) * 100;
  const totalGold = 12346;
  const cost = totalGold * 0.1 / rawDamagePercent;
  const color = getEfficiencyColor(cost);
  const actual = harness.renderDealerSimulatorMeta(rawMeta);
  const expected = `
      <div class="enchant-portrait-info-split">
        <div class="enchant-portrait-info-simulation">
          <span class="enchant-portrait-info-label">예상 장비점수</span>
          <div class="enchant-portrait-equipment-score is-simulated">
            <strong><img src="${escapeHtml(EQUIPMENT_ICON_URL)}" alt="" loading="lazy" decoding="async" />10,050</strong>
          </div>
          <span class="enchant-portrait-score-delta">▲50</span>
          <span class="enchant-portrait-damage-increase">딜 상승률 <strong>+${rawDamagePercent.toFixed(2)}%</strong></span>
          <span class="enchant-simulator-summary" tabindex="0" data-full-gold="12,346 골드" aria-label="누적 골드 12,346 골드">누적 골드 <strong>1만</strong></span>
          <span class="enchant-simulator-efficiency" style="--simulator-efficiency-color: ${color}">0.1%당 <strong>${formatCompactGold(cost)}</strong></span>
        </div>
        <div class="enchant-portrait-info-original">
          <span class="enchant-portrait-info-label">현재 장비점수</span>
          <div class="enchant-portrait-equipment-score">
            <strong><img src="${escapeHtml(EQUIPMENT_ICON_URL)}" alt="" loading="lazy" decoding="async" />10,000</strong>
          </div>
          ${rawMeta}
        </div>
      </div>
    `;
  assert.equal(actual, expected);
}

function testEightHtmlAndActionsFixtureHash() {
  const hint = { hidden: false };
  const actions = { hidden: false };
  const harness = createHarness({
    context: {
      simulatorHintElement: hint,
      simulatorActionsElement: actions,
      currentBufferBaseline: {},
    },
  });
  const outputs = [];

  outputs.push(harness.renderBufferSimulatorMeta('<raw>buffer-empty</raw>'));
  harness.setContext({ currentOfficialBufferScore: 7777 });
  outputs.push(harness.renderBufferSimulatorMeta('<raw>buffer-official</raw>'));
  harness.setContext({
    simulator: {
      role: 'buffer',
      baseBufferScore: 1000,
      currentBufferScore: 1010,
      totalGold: 12345.6,
      activeSelectionByGroup: { b: {} },
    },
  });
  outputs.push(harness.renderBufferSimulatorMeta('<raw>buffer-scale</raw>'));
  harness.setContext({
    simulator: {
      role: 'buffer',
      baseBufferScore: 1000,
      currentBufferScore: 1000.5,
      totalGold: 200000,
      activeSelectionByGroup: { b: {} },
    },
  });
  outputs.push(harness.renderBufferSimulatorMeta('<raw>buffer-rainbow</raw>'));

  harness.setContext({
    simulator: null,
    currentOfficialEquipmentScore: 10000,
    currentOfficialEquipmentScoreStatus: 'loading',
  });
  outputs.push(harness.renderDealerSimulatorMeta('<raw>dealer-loading</raw>'));
  harness.setContext({ currentOfficialEquipmentScoreStatus: 'ready' });
  outputs.push(harness.renderDealerSimulatorMeta('<raw>dealer-ready</raw>'));
  harness.setContext({
    simulator: {
      role: 'dealer',
      totalGold: 12345.6,
      activeSelectionByGroup: { d: {} },
    },
  });
  harness.setMultipliers({ actual: 1.01, equipmentScore: 1.005 });
  outputs.push(harness.renderDealerSimulatorMeta('<raw>dealer-scale</raw>'));
  harness.setContext({
    simulator: {
      role: 'dealer',
      totalGold: 200000000,
      activeSelectionByGroup: { d: {} },
    },
  });
  outputs.push(harness.renderDealerSimulatorMeta('<raw>dealer-rainbow</raw>'));

  harness.setContext({ simulator: null });
  harness.renderDealerSimulatorActions();
  const actionStates = [[hint.hidden, actions.hidden]];
  harness.setContext({ simulator: { role: 'dealer', activeSelectionByGroup: {} } });
  harness.renderDealerSimulatorActions();
  actionStates.push([hint.hidden, actions.hidden]);
  harness.setContext({ simulator: { role: 'buffer', activeSelectionByGroup: { b: {} } } });
  harness.renderDealerSimulatorActions();
  actionStates.push([hint.hidden, actions.hidden]);

  const portableOutputs = outputs.map((html) => (
    html.replaceAll(EQUIPMENT_ICON_URL, '<EQUIPMENT_SCORE_ICON_URL>')
  ));
  const serialized = JSON.stringify({ outputs: portableOutputs, actionStates });
  const hash = createHash('sha256').update(serialized).digest('hex');
  assert.equal(
    hash,
    '81262c4344f5b892103d1eddd433f2b612d6366e1e238c0dc5f7a7eec3a64104',
    'the eight HTML outputs and integrated actions fixture stay byte-identical',
  );
}

const tests = [
  testActions,
  testBufferMetaFallbacksAndBoundaries,
  testBufferMetaExactSimulatedHtml,
  testDealerMetaStatesAndBoundaries,
  testDealerMetaExactSimulatedHtml,
  testEightHtmlAndActionsFixtureHash,
];

let failures = 0;
for (const test of tests) {
  try {
    test();
    console.log(`ok - ${test.name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${test.name}`);
    console.error(error?.stack || error);
  }
}

if (failures) process.exitCode = 1;
