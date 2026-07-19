import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_PATH = path.join(ROOT, 'src/dnfHellTool/enchantOathSymbolFallback.js');
const VIEW_PATH = path.join(ROOT, 'src/dnfHellTool/enchantView.js');
const CHARACTERIZATION_JSON_SHA256 = '7f75fbf46f009ec16ae790a908a25c383bd1ccb5e4239c6bf773cb8046750fb9';

async function loadFactory() {
  const source = fs.readFileSync(MODULE_PATH, 'utf8');
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return (await import(url)).createEnchantOathSymbolFallback;
}

class FakeClassList {
  constructor() {
    this.values = new Set();
    this.addCalls = [];
  }

  add(value) {
    this.addCalls.push(value);
    this.values.add(value);
  }

  contains(value) {
    return this.values.has(value);
  }
}

class FakeWrapper {
  constructor() {
    this.classList = new FakeClassList();
  }
}

class FakeImage {
  constructor({ complete = false, naturalWidth = 0, hasWrapper = true } = {}) {
    this.complete = complete;
    this.naturalWidth = naturalWidth;
    this.hidden = false;
    this.wrapper = hasWrapper ? new FakeWrapper() : null;
    this.closestCalls = [];
    this.registrations = [];
    this.listeners = new Map();
  }

  closest(selector) {
    this.closestCalls.push(selector);
    return this.wrapper;
  }

  addEventListener(type, handler, options) {
    const listener = { handler, once: Boolean(options?.once) };
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
    this.registrations.push({ type, once: listener.once });
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }

  dispatch(type) {
    const initial = [...(this.listeners.get(type) || [])];
    let invoked = 0;
    initial.forEach((listener) => {
      const current = this.listeners.get(type) || [];
      if (!current.includes(listener)) return;
      listener.handler();
      invoked += 1;
      if (listener.once) {
        this.listeners.set(type, current.filter((item) => item !== listener));
      }
    });
    return invoked;
  }
}

class FakeContainer {
  constructor(images = []) {
    this.images = images;
    this.queryCount = 0;
    this.selectors = [];
  }

  querySelectorAll(selector) {
    this.queryCount += 1;
    this.selectors.push(selector);
    return this.images;
  }
}

function snapshotImage(image) {
  return {
    hidden: image.hidden,
    fallback: Boolean(image.wrapper?.classList.contains('is-fallback')),
    fallbackAddCalls: image.wrapper?.classList.addCalls.length || 0,
    errorListeners: image.listenerCount('error'),
    registrations: image.registrations.map((row) => ({ ...row })),
    closestCalls: [...image.closestCalls],
  };
}

function createLegacyFactory({ getPortraitContainer }) {
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

function runCharacterization(createFactory) {
  const result = {};

  {
    let getterCalls = 0;
    const { bindOathSymbolFallback } = createFactory({
      getPortraitContainer: () => {
        getterCalls += 1;
        return null;
      },
    });
    const getterCallsAfterFactory = getterCalls;
    bindOathSymbolFallback();
    result.nullContainer = { getterCallsAfterFactory, getterCallsAfterBind: getterCalls };
  }

  {
    let getterCalls = 0;
    const container = new FakeContainer([]);
    const { bindOathSymbolFallback } = createFactory({
      getPortraitContainer: () => {
        getterCalls += 1;
        return container;
      },
    });
    bindOathSymbolFallback();
    result.noImage = {
      getterCalls,
      queryCount: container.queryCount,
      selectors: [...container.selectors],
    };
  }

  {
    const image = new FakeImage({ complete: true, naturalWidth: 0 });
    const container = new FakeContainer([image]);
    createFactory({ getPortraitContainer: () => container }).bindOathSymbolFallback();
    result.immediateBroken = snapshotImage(image);
  }

  {
    const image = new FakeImage({ complete: true, naturalWidth: 64 });
    const container = new FakeContainer([image]);
    createFactory({ getPortraitContainer: () => container }).bindOathSymbolFallback();
    const before = snapshotImage(image);
    const firstDispatchInvocations = image.dispatch('error');
    const afterFirst = snapshotImage(image);
    const secondDispatchInvocations = image.dispatch('error');
    result.completeValid = {
      before,
      firstDispatchInvocations,
      afterFirst,
      secondDispatchInvocations,
      afterSecond: snapshotImage(image),
    };
  }

  {
    const image = new FakeImage({ complete: false, naturalWidth: 0 });
    const container = new FakeContainer([image]);
    createFactory({ getPortraitContainer: () => container }).bindOathSymbolFallback();
    const before = snapshotImage(image);
    const firstDispatchInvocations = image.dispatch('error');
    const secondDispatchInvocations = image.dispatch('error');
    result.pendingOnce = {
      before,
      firstDispatchInvocations,
      secondDispatchInvocations,
      after: snapshotImage(image),
    };
  }

  {
    const image = new FakeImage({ complete: true, naturalWidth: 0, hasWrapper: false });
    const container = new FakeContainer([image]);
    createFactory({ getPortraitContainer: () => container }).bindOathSymbolFallback();
    result.noWrapper = snapshotImage(image);
  }

  {
    const immediate = new FakeImage({ complete: true, naturalWidth: 0 });
    const pending = new FakeImage({ complete: false, naturalWidth: 0 });
    const container = new FakeContainer([immediate, pending]);
    createFactory({ getPortraitContainer: () => container }).bindOathSymbolFallback();
    const beforePendingError = {
      immediate: snapshotImage(immediate),
      pending: snapshotImage(pending),
    };
    const pendingDispatchInvocations = pending.dispatch('error');
    result.multipleIndependent = {
      beforePendingError,
      pendingDispatchInvocations,
      afterPendingError: {
        immediate: snapshotImage(immediate),
        pending: snapshotImage(pending),
      },
    };
  }

  {
    let getterCalls = 0;
    const first = new FakeImage({ complete: false, naturalWidth: 0 });
    const second = new FakeImage({ complete: false, naturalWidth: 0 });
    const container = new FakeContainer([first]);
    const { bindOathSymbolFallback } = createFactory({
      getPortraitContainer: () => {
        getterCalls += 1;
        return container;
      },
    });
    bindOathSymbolFallback();
    container.images = [second];
    bindOathSymbolFallback();
    result.subtreeReplacement = {
      getterCalls,
      queryCount: container.queryCount,
      selectors: [...container.selectors],
      first: snapshotImage(first),
      second: snapshotImage(second),
    };
  }

  {
    const image = new FakeImage({ complete: false, naturalWidth: 0 });
    const container = new FakeContainer([image]);
    const { bindOathSymbolFallback } = createFactory({ getPortraitContainer: () => container });
    bindOathSymbolFallback();
    bindOathSymbolFallback();
    const before = snapshotImage(image);
    const firstDispatchInvocations = image.dispatch('error');
    const secondDispatchInvocations = image.dispatch('error');
    result.duplicateRebind = {
      queryCount: container.queryCount,
      before,
      firstDispatchInvocations,
      secondDispatchInvocations,
      after: snapshotImage(image),
    };
  }

  return result;
}

test('factory 생성 시 container 또는 NodeList를 읽지 않고 null container를 허용한다', async () => {
  const createFactory = await loadFactory();
  let getterCalls = 0;
  const { bindOathSymbolFallback } = createFactory({
    getPortraitContainer: () => {
      getterCalls += 1;
      return null;
    },
  });
  assert.equal(getterCalls, 0);
  assert.doesNotThrow(bindOathSymbolFallback);
  assert.equal(getterCalls, 1);
});

test('image가 없으면 현재 container를 한 번 조회하고 끝낸다', async () => {
  const createFactory = await loadFactory();
  const container = new FakeContainer([]);
  createFactory({ getPortraitContainer: () => container }).bindOathSymbolFallback();
  assert.equal(container.queryCount, 1);
  assert.deepEqual(container.selectors, ['[data-oath-symbol-image]']);
});

test('complete + naturalWidth 0은 즉시 fallback하고 listener를 추가하지 않는다', async () => {
  const createFactory = await loadFactory();
  const image = new FakeImage({ complete: true, naturalWidth: 0 });
  createFactory({ getPortraitContainer: () => new FakeContainer([image]) }).bindOathSymbolFallback();
  assert.equal(image.hidden, true);
  assert.equal(image.wrapper.classList.contains('is-fallback'), true);
  assert.equal(image.listenerCount('error'), 0);
});

test('complete + valid width도 error once listener를 유지한다', async () => {
  const createFactory = await loadFactory();
  const image = new FakeImage({ complete: true, naturalWidth: 128 });
  createFactory({ getPortraitContainer: () => new FakeContainer([image]) }).bindOathSymbolFallback();
  assert.equal(image.hidden, false);
  assert.deepEqual(image.registrations, [{ type: 'error', once: true }]);
  assert.equal(image.dispatch('error'), 1);
  assert.equal(image.hidden, true);
  assert.equal(image.listenerCount('error'), 0);
});

test('pending image의 error handler는 한 번만 실행된다', async () => {
  const createFactory = await loadFactory();
  const image = new FakeImage({ complete: false, naturalWidth: 0 });
  createFactory({ getPortraitContainer: () => new FakeContainer([image]) }).bindOathSymbolFallback();
  assert.equal(image.dispatch('error'), 1);
  assert.equal(image.wrapper.classList.addCalls.length, 1);
  assert.equal(image.dispatch('error'), 0);
  assert.equal(image.wrapper.classList.addCalls.length, 1);
});

test('wrapper가 없어도 image는 숨기고 예외를 내지 않는다', async () => {
  const createFactory = await loadFactory();
  const image = new FakeImage({ complete: true, naturalWidth: 0, hasWrapper: false });
  assert.doesNotThrow(() => {
    createFactory({ getPortraitContainer: () => new FakeContainer([image]) }).bindOathSymbolFallback();
  });
  assert.equal(image.hidden, true);
  assert.deepEqual(image.closestCalls, ['.enchant-oath-symbol']);
});

test('복수 image의 즉시 fallback과 pending listener는 독립적이다', async () => {
  const createFactory = await loadFactory();
  const immediate = new FakeImage({ complete: true, naturalWidth: 0 });
  const pending = new FakeImage({ complete: false, naturalWidth: 0 });
  createFactory({
    getPortraitContainer: () => new FakeContainer([immediate, pending]),
  }).bindOathSymbolFallback();
  assert.equal(immediate.hidden, true);
  assert.equal(immediate.listenerCount('error'), 0);
  assert.equal(pending.hidden, false);
  assert.equal(pending.listenerCount('error'), 1);
  pending.dispatch('error');
  assert.equal(pending.hidden, true);
});

test('하위 트리가 교체되면 다음 bind에서 현재 NodeList를 다시 조회한다', async () => {
  const createFactory = await loadFactory();
  const first = new FakeImage({ complete: false, naturalWidth: 0 });
  const second = new FakeImage({ complete: false, naturalWidth: 0 });
  const container = new FakeContainer([first]);
  let getterCalls = 0;
  const { bindOathSymbolFallback } = createFactory({
    getPortraitContainer: () => {
      getterCalls += 1;
      return container;
    },
  });
  bindOathSymbolFallback();
  container.images = [second];
  bindOathSymbolFallback();
  assert.equal(getterCalls, 2);
  assert.equal(container.queryCount, 2);
  assert.equal(first.listenerCount('error'), 1);
  assert.equal(second.listenerCount('error'), 1);
});

test('같은 DOM에 다시 bind하면 기존처럼 중복 once listener가 각각 등록된다', async () => {
  const createFactory = await loadFactory();
  const image = new FakeImage({ complete: false, naturalWidth: 0 });
  const container = new FakeContainer([image]);
  const { bindOathSymbolFallback } = createFactory({ getPortraitContainer: () => container });
  bindOathSymbolFallback();
  bindOathSymbolFallback();
  assert.equal(image.listenerCount('error'), 2);
  assert.equal(image.dispatch('error'), 2);
  assert.equal(image.wrapper.classList.addCalls.length, 2);
  assert.equal(image.listenerCount('error'), 0);
});

test('새 모듈은 기록된 원본 characterization fixture 동작을 정확히 재현한다', async () => {
  const createFactory = await loadFactory();
  const legacy = runCharacterization(createLegacyFactory);
  const current = runCharacterization(createFactory);
  assert.deepEqual(current, legacy);
  assert.equal(
    crypto.createHash('sha256').update(JSON.stringify(current)).digest('hex'),
    CHARACTERIZATION_JSON_SHA256,
  );
  assert.equal(
    crypto.createHash('sha256').update(JSON.stringify(legacy)).digest('hex'),
    CHARACTERIZATION_JSON_SHA256,
  );
});

test('enchantView source contract와 binder 호출 순서를 유지한다', () => {
  const moduleSource = fs.readFileSync(MODULE_PATH, 'utf8');
  const viewSource = fs.readFileSync(VIEW_PATH, 'utf8');

  assert.equal(
    (moduleSource.match(/export function createEnchantOathSymbolFallback/g) || []).length,
    1,
  );
  assert.equal((moduleSource.match(/\bexport\b/g) || []).length, 1);
  assert.match(
    viewSource,
    /import \{ createEnchantOathSymbolFallback \} from '\.\/enchantOathSymbolFallback\.js';/,
  );
  assert.doesNotMatch(viewSource, /function bindOathSymbolFallback\s*\(/);

  const navigationIndex = viewSource.indexOf('} = createEnchantLoadoutNavigation({');
  const fallbackIndex = viewSource.indexOf('const { bindOathSymbolFallback } = createEnchantOathSymbolFallback({');
  const detailIndex = viewSource.indexOf('} = createEnchantPortraitDetailPanel({');
  assert.ok(navigationIndex >= 0 && navigationIndex < fallbackIndex);
  assert.ok(fallbackIndex < detailIndex);

  const renderStart = viewSource.indexOf('function renderEnchantCharacterPortrait()');
  const renderEnd = viewSource.indexOf('function getSelectedEnchantCharacter()', renderStart);
  const renderSource = viewSource.slice(renderStart, renderEnd);
  const avatarsIndex = renderSource.indexOf('bindCharacterAvatars(els.enchantCharacterPortrait);');
  const oathFallbackIndex = renderSource.indexOf('bindOathSymbolFallback();');
  const oathDetailIndex = renderSource.indexOf('bindOathCrystalDetailPanel();');
  assert.ok(avatarsIndex >= 0 && avatarsIndex < oathFallbackIndex);
  assert.ok(oathFallbackIndex < oathDetailIndex);
});
