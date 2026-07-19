import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createEnchantDevelopmentTiming } from '../src/dnfHellTool/enchantDevelopmentTiming.js';

function createHarness({ devMode = true, nowValues = [], logError = null } = {}) {
  let isDevMode = devMode;
  let timing = null;
  let lastSummary;
  let nowIndex = 0;
  let currentLogError = logError;
  const events = [];
  const logs = [];

  const api = createEnchantDevelopmentTiming({
    getIsDevMode: () => {
      events.push(['getIsDevMode', isDevMode]);
      return isDevMode;
    },
    getTiming: () => {
      events.push(['getTiming', timing]);
      return timing;
    },
    setTiming: (value) => {
      events.push(['setTiming', value]);
      timing = value;
    },
    now: () => {
      const value = nowValues[nowIndex] ?? nowValues.at(-1) ?? 0;
      nowIndex += 1;
      events.push(['now', value]);
      return value;
    },
    setLastSummary: (summary) => {
      events.push(['setLastSummary', summary]);
      lastSummary = summary;
    },
    logInfo: (message, summary) => {
      events.push(['logInfo', message, summary]);
      logs.push([message, summary]);
      if (currentLogError) throw currentLogError;
    },
  });

  return {
    ...api,
    events,
    logs,
    get devMode() {
      return isDevMode;
    },
    set devMode(value) {
      isDevMode = value;
    },
    get timing() {
      return timing;
    },
    get lastSummary() {
      return lastSummary;
    },
    get nowCallCount() {
      return nowIndex;
    },
    setLogError(value) {
      currentLogError = value;
    },
    clearEvents() {
      events.length = 0;
    },
  };
}

test('non-dev is a no-op and dev mode is read dynamically', () => {
  const harness = createHarness({ devMode: false, nowValues: [10, 11] });

  assert.equal(harness.beginEnchantTiming('disabled'), false);
  assert.equal(harness.timing, null);
  assert.equal(harness.nowCallCount, 0);

  harness.devMode = true;
  assert.equal(harness.beginEnchantTiming('enabled'), true);
  assert.deepEqual(harness.timing, {
    label: 'enabled',
    startedAt: 10,
    steps: [],
  });

  harness.devMode = false;
  harness.recordEnchantTimingStep('hidden', 10);
  harness.flushEnchantTiming('hidden');
  assert.equal(harness.timing.label, 'enabled');
  assert.deepEqual(harness.timing.steps, []);
  assert.equal(harness.lastSummary, undefined);
  assert.equal(harness.logs.length, 0);

  harness.devMode = true;
  harness.flushEnchantTiming('visible');
  assert.equal(harness.lastSummary.status, 'visible');
  assert.equal(harness.timing, null);
});

test('begin overwrites an existing timing without an ownership check', () => {
  const harness = createHarness({ nowValues: [1, 2] });

  assert.equal(harness.beginEnchantTiming('first'), true);
  const firstTiming = harness.timing;
  firstTiming.steps.push({ name: 'first-step', ms: 0 });

  assert.equal(harness.beginEnchantTiming('second'), true);
  assert.notStrictEqual(harness.timing, firstTiming);
  assert.deepEqual(harness.timing, {
    label: 'second',
    startedAt: 2,
    steps: [],
  });
});

test('record rejects invalid starts, accepts zero, rounds to 0.1ms, and lets extra override name/ms', () => {
  const harness = createHarness({ nowValues: [0, 1.26, 2.06] });
  harness.beginEnchantTiming('record');

  harness.recordEnchantTimingStep('nan', Number.NaN);
  harness.recordEnchantTimingStep('infinity', Number.POSITIVE_INFINITY);
  harness.recordEnchantTimingStep('string', '0');
  assert.deepEqual(harness.timing.steps, []);
  assert.equal(harness.nowCallCount, 1);

  harness.recordEnchantTimingStep('zero-start', 0, { detail: 'kept' });
  harness.recordEnchantTimingStep('original', 1, {
    name: 'overridden',
    ms: 99,
    rows: 3,
  });

  assert.deepEqual(harness.timing.steps, [
    { name: 'zero-start', ms: 1.3, detail: 'kept' },
    { name: 'overridden', ms: 99, rows: 3 },
  ]);
  assert.equal(typeof harness.timing.steps[0].ms, 'number');
});

test('flush keeps the steps reference and orders last-summary, log, then timing reset', () => {
  const harness = createHarness({ nowValues: [5.01, 7.28] });
  harness.beginEnchantTiming('ordered');
  const timing = harness.timing;
  const steps = timing.steps;
  steps.push({ name: 'seed', ms: 0.1 });
  harness.clearEvents();

  harness.flushEnchantTiming('complete');

  assert.strictEqual(harness.lastSummary.steps, steps);
  assert.deepEqual(harness.lastSummary, {
    label: 'ordered',
    status: 'complete',
    totalMs: 2.3,
    steps,
  });
  assert.deepEqual(harness.logs, [[
    '[enchant-timing] ordered · complete',
    harness.lastSummary,
  ]]);
  assert.equal(harness.timing, null);
  assert.deepEqual(harness.events.map(([name]) => name), [
    'getIsDevMode',
    'getTiming',
    'getTiming',
    'now',
    'getTiming',
    'getTiming',
    'setLastSummary',
    'logInfo',
    'setTiming',
  ]);
});

test('logger failure preserves the active timing after publishing the last summary', () => {
  const loggerError = new Error('logger failed');
  const harness = createHarness({ nowValues: [1, 2], logError: loggerError });
  harness.beginEnchantTiming('logger');
  const timing = harness.timing;

  assert.throws(() => harness.flushEnchantTiming('error'), loggerError);
  assert.strictEqual(harness.timing, timing);
  assert.equal(harness.lastSummary.status, 'error');
  assert.equal(harness.events.some(([name, value]) => name === 'setTiming' && value === null), false);
});

test('a second flush is a no-op', () => {
  const harness = createHarness({ nowValues: [10, 11, 99] });
  harness.beginEnchantTiming('single');
  harness.flushEnchantTiming('complete');
  const summary = harness.lastSummary;

  harness.flushEnchantTiming('second');

  assert.strictEqual(harness.lastSummary, summary);
  assert.equal(harness.logs.length, 1);
  assert.equal(harness.nowCallCount, 2);
  assert.equal(harness.timing, null);
});

test('error flush makes the following complete flush a no-op', () => {
  const harness = createHarness({ nowValues: [3, 4, 5] });
  harness.beginEnchantTiming('double-flush');
  harness.flushEnchantTiming('error');
  harness.flushEnchantTiming('complete');

  assert.equal(harness.lastSummary.status, 'error');
  assert.deepEqual(harness.logs.map(([, summary]) => summary.status), ['error']);
  assert.equal(harness.nowCallCount, 2);
});

test('nested ownership short-circuits and preserves the outer timing', () => {
  const harness = createHarness({ nowValues: [100, 200] });
  harness.beginEnchantTiming('search');
  const outerTiming = harness.timing;

  const ownsTiming = !harness.timing && harness.beginEnchantTiming('price-load');

  assert.equal(ownsTiming, false);
  assert.strictEqual(harness.timing, outerTiming);
  assert.equal(harness.timing.label, 'search');
  assert.equal(harness.nowCallCount, 1);
});

test('standalone ownership begins and flushes its own timing', () => {
  const harness = createHarness({ nowValues: [20, 25] });

  const ownsTiming = !harness.timing && harness.beginEnchantTiming('price-load');
  assert.equal(ownsTiming, true);
  if (ownsTiming) harness.flushEnchantTiming('complete');

  assert.equal(harness.lastSummary.label, 'price-load');
  assert.equal(harness.lastSummary.status, 'complete');
  assert.equal(harness.lastSummary.totalMs, 5);
  assert.equal(harness.timing, null);
});

test('enchantView keeps initialization, adapter fallback, and ownership orchestration in place', () => {
  const source = readFileSync(
    new URL('../src/dnfHellTool/enchantView.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /import \{ createEnchantDevelopmentTiming \} from '\.\/enchantDevelopmentTiming\.js';/);
  assert.match(source, /state\.enchantTiming = null;/);
  assert.match(source, /const ownsTiming = !state\.enchantTiming && beginEnchantTiming\(forceRefresh \? 'price-refresh' : 'price-load'\);/);
  assert.match(source, /typeof performance !== 'undefined' && typeof performance\.now === 'function'[\s\S]*return performance\.now\(\);[\s\S]*return Date\.now\(\);/);
  assert.doesNotMatch(source, /function getEnchantNowMs\(/);
  assert.doesNotMatch(source, /function beginEnchantTiming\(/);
  assert.doesNotMatch(source, /function recordEnchantTimingStep\(/);
  assert.doesNotMatch(source, /function flushEnchantTiming\(/);
  assert.equal((source.match(/state\.enchantTiming/g) || []).length, 4);
  assert.equal((source.match(/flushEnchantTiming\('error'\)/g) || []).length, 3);
  assert.equal((source.match(/flushEnchantTiming\('complete'\)/g) || []).length, 2);
  assert.equal((source.match(/flushEnchantTiming\('candidate-select'\)/g) || []).length, 1);
});
