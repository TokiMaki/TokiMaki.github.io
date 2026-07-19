import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createEnchantRecommendationLayout } from '../src/dnfHellTool/enchantRecommendationLayout.js';

const PRE_MOVE_FIXTURE_HASHES = Object.freeze({
  titleAndGeometry: '1aecf143bada3ee06456ef4f99c8c29000db94e60dbe5c9be38050a41ef08856',
  correctedSchedulerAndLeave: 'a1724753292a99c95cb3e2db3b4386eae0a0ad3d0b1e5d580ba9b8ba373ab816',
});
const CHARACTERIZATION_JSON_SHA256 = 'f3c8a77b7d6fcdb8a7d9178015c1cea8560260424a59de599f628b5609e17858';

function createEmbeddedLegacyLayout(els) {
  function fitEnchantRecommendTitles() {
    if (!els.enchantRecommendList) return;
    els.enchantRecommendList.querySelectorAll('.enchant-recommend-title').forEach((title) => {
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
      const popover = els.enchantRecommendList?.querySelector('.enchant-recommend-step-tune.is-tune-popover-open .enchant-recommend-popover');
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

class FakeStyle {
  constructor() {
    this.letterSpacing = '';
    this.transform = '';
    this.properties = new Map();
  }

  setProperty(name, value) {
    this.properties.set(name, String(value));
  }

  removeProperty(name) {
    this.properties.delete(name);
  }

  getPropertyValue(name) {
    return this.properties.get(name) || '';
  }
}

class FakeClassList {
  constructor(values = []) {
    this.values = new Set(values);
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  contains(value) {
    return this.values.has(value);
  }

  snapshot() {
    return [...this.values].sort();
  }
}

function createText({ widths = {}, rectWidth = null, initialLetterSpacing = 'legacy', initialTransform = 'scaleX(0.500)' } = {}) {
  const style = new FakeStyle();
  style.letterSpacing = initialLetterSpacing;
  style.transform = initialTransform;
  const text = {
    style,
    get scrollWidth() {
      if (Object.prototype.hasOwnProperty.call(widths, style.letterSpacing)) {
        return widths[style.letterSpacing];
      }
      return widths.default ?? 0;
    },
    getBoundingClientRect() {
      const width = typeof rectWidth === 'function' ? rectWidth(text) : rectWidth;
      return { width: width ?? text.scrollWidth };
    },
  };
  return text;
}

function createTitle({ clientWidth = 100, text = createText(), classes = ['is-ellipsis'] } = {}) {
  const classList = new FakeClassList(classes);
  return {
    clientWidth,
    classList,
    querySelector(selector) {
      return selector === '.enchant-recommend-title-text' ? text : null;
    },
    snapshot() {
      return {
        clientWidth,
        classes: classList.snapshot(),
        letterSpacing: text?.style?.letterSpacing ?? null,
        transform: text?.style?.transform ?? null,
      };
    },
  };
}

function createTitleList(titles = []) {
  return {
    queryCount: 0,
    querySelectorAll(selector) {
      assert.equal(selector, '.enchant-recommend-title');
      this.queryCount += 1;
      return titles;
    },
  };
}

function createPopover({ rect, offsetWidth = rect.width } = {}) {
  const style = new FakeStyle();
  return {
    style,
    offsetWidth,
    getBoundingClientRect() {
      return { ...rect };
    },
    snapshot() {
      return style.getPropertyValue('--popover-shift-x');
    },
  };
}

function createHost(getPopover, insideValues = new Set()) {
  return {
    querySelector(selector) {
      assert.equal(selector, '.enchant-recommend-popover');
      return getPopover();
    },
    contains(value) {
      return value === this || insideValues.has(value);
    },
  };
}

function createTarget(getHost) {
  return {
    closest(selector) {
      assert.ok([
        '.enchant-recommend-item, .enchant-recommend-step-tune',
        '.enchant-recommend-step-tune, .enchant-recommend-item',
      ].includes(selector));
      return getHost();
    },
  };
}

function installBrowser({ innerWidth = 1000, clientWidth = 1000 } = {}) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const frames = [];
  globalThis.window = {
    innerWidth,
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
  };
  globalThis.document = {
    documentElement: { clientWidth },
  };
  return {
    frames,
    flushOne() {
      const callback = frames.shift();
      if (callback) callback();
    },
    flushAll() {
      while (frames.length) this.flushOne();
    },
    restore() {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
    },
  };
}

function createLayout(kind, getRecommendList) {
  if (kind === 'legacy') {
    return createEmbeddedLegacyLayout({
      get enchantRecommendList() {
        return getRecommendList();
      },
    });
  }
  return createEnchantRecommendationLayout({ getRecommendList });
}

function runTitleHarness(kind) {
  const browser = installBrowser();
  try {
    const nullTextTitle = createTitle({ text: null });
    const widthZeroTitle = createTitle({
      clientWidth: 0,
      text: createText({ widths: { '': 200 } }),
    });
    const initialFitTitle = createTitle({
      clientWidth: 100,
      text: createText({ widths: { '': 100 } }),
    });
    const minus003Title = createTitle({
      clientWidth: 100,
      text: createText({ widths: { '': 110, '-0.03em': 100 } }),
    });
    const minus005Title = createTitle({
      clientWidth: 100,
      text: createText({ widths: { '': 115, '-0.03em': 105, '-0.05em': 100 } }),
    });
    const roundedScaleTitle = createTitle({
      clientWidth: 100,
      text: createText({
        widths: { '': 120, '-0.03em': 110, '-0.05em': 102.6 },
        rectWidth: 100.4,
      }),
    });
    const clampEllipsisTitle = createTitle({
      clientWidth: 95,
      text: createText({
        widths: { '': 140, '-0.03em': 130, '-0.05em': 120 },
        rectWidth: 114,
      }),
    });
    const boundaryPassTitle = createTitle({
      clientWidth: 100,
      text: createText({
        widths: { '': 120, '-0.03em': 110, '-0.05em': 104 },
        rectWidth: 100.5,
      }),
    });
    const boundaryFailTitle = createTitle({
      clientWidth: 100,
      text: createText({
        widths: { '': 120, '-0.03em': 110, '-0.05em': 104 },
        rectWidth: 100.501,
      }),
    });
    const titles = [
      nullTextTitle,
      widthZeroTitle,
      initialFitTitle,
      minus003Title,
      minus005Title,
      roundedScaleTitle,
      clampEllipsisTitle,
      boundaryPassTitle,
      boundaryFailTitle,
    ];
    let list = createTitleList(titles);
    let getterCalls = 0;
    const layout = createLayout(kind, () => {
      getterCalls += 1;
      return list;
    });
    const getterCallsAfterFactory = getterCalls;
    layout.scheduleFitEnchantRecommendTitles();
    const sync = {
      getterCalls,
      listQueries: list.queryCount,
      titles: titles.map((title) => title.snapshot()),
      frames: browser.frames.length,
    };
    browser.flushAll();
    const afterFrame = {
      getterCalls,
      listQueries: list.queryCount,
      titles: titles.map((title) => title.snapshot()),
      frames: browser.frames.length,
    };

    list = null;
    layout.scheduleFitEnchantRecommendTitles();
    const nullListSync = { getterCalls, frames: browser.frames.length };
    browser.flushAll();
    const nullListFrame = { getterCalls, frames: browser.frames.length };

    const emptyList = createTitleList([]);
    list = emptyList;
    layout.scheduleFitEnchantRecommendTitles();
    browser.flushAll();

    return {
      getterCallsAfterFactory,
      sync,
      afterFrame,
      nullListSync,
      nullListFrame,
      emptyTitleQueries: emptyList.queryCount,
    };
  } finally {
    browser.restore();
  }
}

function runGeometryCase(kind, { innerWidth = 1000, clientWidth = 1000, rect, offsetWidth }) {
  const browser = installBrowser({ innerWidth, clientWidth });
  try {
    const popover = createPopover({ rect, offsetWidth });
    const host = createHost(() => popover);
    const target = createTarget(() => host);
    const layout = createLayout(kind, () => null);
    layout.scheduleRecommendPopoverShift(target);
    const beforeFrame = popover.snapshot();
    browser.flushAll();
    return {
      beforeFrame,
      afterFrame: popover.snapshot(),
      frames: browser.frames.length,
    };
  } finally {
    browser.restore();
  }
}

function runGeometryHarness(kind) {
  const cases = {
    viewport0: runGeometryCase(kind, {
      innerWidth: 0,
      clientWidth: 0,
      rect: { left: -100, right: 1100, width: 1200 },
      offsetWidth: 1200,
    }),
    inside: runGeometryCase(kind, {
      rect: { left: 100, right: 900, width: 800 },
      offsetWidth: 800,
    }),
    right: runGeometryCase(kind, {
      rect: { left: 900, right: 1005, width: 105 },
      offsetWidth: 105,
    }),
    left: runGeometryCase(kind, {
      rect: { left: -3, right: 100, width: 103 },
      offsetWidth: 103,
    }),
    both: runGeometryCase(kind, {
      rect: { left: -100, right: 1100, width: 1200 },
      offsetWidth: 1200,
    }),
    offsetWidth0: runGeometryCase(kind, {
      rect: { left: 900, right: 1005, width: 105 },
      offsetWidth: 0,
    }),
    transformedScale: runGeometryCase(kind, {
      rect: { left: 897, right: 997, width: 100 },
      offsetWidth: 200,
    }),
    shiftBoundary: runGeometryCase(kind, {
      rect: { left: 900, right: 992.5, width: 92.5 },
      offsetWidth: 92.5,
    }),
    roundRight: runGeometryCase(kind, {
      rect: { left: 900, right: 1002.6, width: 102.6 },
      offsetWidth: 102.6,
    }),
    roundLeft: runGeometryCase(kind, {
      rect: { left: -2.6, right: 100, width: 102.6 },
      offsetWidth: 102.6,
    }),
  };

  const browser = installBrowser();
  try {
    const popover = createPopover({
      rect: { left: 900, right: 1005, width: 105 },
      offsetWidth: 105,
    });
    const host = createHost(() => popover);
    const target = createTarget(() => host);
    const layout = createLayout(kind, () => null);
    layout.scheduleRecommendPopoverShift(target);
    browser.flushAll();
    const beforeReset = popover.snapshot();
    layout.resetRecommendPopoverShift(target);
    cases.reset = { beforeReset, afterReset: popover.snapshot() };

    const noHostTarget = createTarget(() => null);
    layout.scheduleRecommendPopoverShift(noHostTarget);
    cases.noHost = { queuedFrames: browser.frames.length };

    const noPopoverHost = createHost(() => null);
    layout.scheduleRecommendPopoverShift(createTarget(() => noPopoverHost));
    cases.noPopover = { queuedFrames: browser.frames.length };
  } finally {
    browser.restore();
  }

  return cases;
}

function runSchedulerCaptureHarness(kind) {
  const browser = installBrowser();
  try {
    const popoverA = createPopover({
      rect: { left: 900, right: 1005, width: 105 },
      offsetWidth: 105,
    });
    const popoverB = createPopover({
      rect: { left: -3, right: 100, width: 103 },
      offsetWidth: 103,
    });
    let currentPopover = popoverA;
    const host = createHost(() => currentPopover);
    const target = createTarget(() => host);
    let listQueryCountA = 0;
    let listQueryCountB = 0;
    const listA = {
      querySelector(selector) {
        assert.equal(selector, '.enchant-recommend-step-tune.is-tune-popover-open .enchant-recommend-popover');
        listQueryCountA += 1;
        return popoverA;
      },
    };
    const listB = {
      querySelector(selector) {
        assert.equal(selector, '.enchant-recommend-step-tune.is-tune-popover-open .enchant-recommend-popover');
        listQueryCountB += 1;
        return popoverB;
      },
    };
    let currentList = listA;
    let getterCalls = 0;
    const layout = createLayout(kind, () => {
      getterCalls += 1;
      return currentList;
    });
    const getterCallsAfterFactory = getterCalls;

    layout.scheduleRecommendPopoverShift(target);
    currentPopover = popoverB;
    browser.flushOne();
    const normalCapture = {
      popoverA: popoverA.snapshot(),
      popoverB: popoverB.snapshot(),
    };

    popoverA.style.removeProperty('--popover-shift-x');
    popoverB.style.removeProperty('--popover-shift-x');
    layout.scheduleOpenTunePopoverShift();
    currentList = listB;
    browser.flushOne();
    const tuneRequery = {
      popoverA: popoverA.snapshot(),
      popoverB: popoverB.snapshot(),
      listQueryCountA,
      listQueryCountB,
      getterCalls,
    };

    return {
      getterCallsAfterFactory,
      normalCapture,
      tuneRequery,
      remainingFrames: browser.frames.length,
    };
  } finally {
    browser.restore();
  }
}

function runLeaveHarness(kind) {
  const browser = installBrowser();
  try {
    const inside = {};
    const outside = {};
    const insideValues = new Set([inside]);
    const host = createHost(() => null, insideValues);
    const hostTarget = createTarget(() => host);
    const noHostTarget = createTarget(() => null);
    const layout = createLayout(kind, () => null);
    return {
      noHost: layout.isLeavingRecommendPopoverHost({ target: noHostTarget, relatedTarget: outside }),
      relatedInside: layout.isLeavingRecommendPopoverHost({ target: hostTarget, relatedTarget: inside }),
      relatedSelf: layout.isLeavingRecommendPopoverHost({ target: hostTarget, relatedTarget: host }),
      relatedOutside: layout.isLeavingRecommendPopoverHost({ target: hostTarget, relatedTarget: outside }),
      relatedNull: layout.isLeavingRecommendPopoverHost({ target: hostTarget, relatedTarget: null }),
    };
  } finally {
    browser.restore();
  }
}

function runHarness(kind) {
  return {
    baselineHashes: PRE_MOVE_FIXTURE_HASHES,
    titles: runTitleHarness(kind),
    geometry: runGeometryHarness(kind),
    schedulers: runSchedulerCaptureHarness(kind),
    leaving: runLeaveHarness(kind),
  };
}

const legacyResult = runHarness('legacy');
const moduleResult = runHarness('module');
assert.deepEqual(moduleResult, legacyResult);

assert.deepEqual(PRE_MOVE_FIXTURE_HASHES, {
  titleAndGeometry: '1aecf143bada3ee06456ef4f99c8c29000db94e60dbe5c9be38050a41ef08856',
  correctedSchedulerAndLeave: 'a1724753292a99c95cb3e2db3b4386eae0a0ad3d0b1e5d580ba9b8ba373ab816',
});

assert.equal(moduleResult.titles.getterCallsAfterFactory, 0);
assert.equal(moduleResult.titles.sync.listQueries, 1);
assert.equal(moduleResult.titles.sync.frames, 1);
assert.equal(moduleResult.titles.afterFrame.listQueries, 2);
assert.equal(moduleResult.titles.afterFrame.frames, 0);
assert.equal(moduleResult.titles.nullListSync.frames, 1);
assert.equal(moduleResult.titles.nullListFrame.frames, 0);
assert.equal(moduleResult.titles.emptyTitleQueries, 2);

const syncTitles = moduleResult.titles.sync.titles;
assert.deepEqual(syncTitles[0], {
  clientWidth: 100,
  classes: ['is-ellipsis'],
  letterSpacing: null,
  transform: null,
});
assert.deepEqual(syncTitles[1], {
  clientWidth: 0,
  classes: [],
  letterSpacing: '',
  transform: '',
});
assert.deepEqual(syncTitles[2], {
  clientWidth: 100,
  classes: [],
  letterSpacing: '',
  transform: '',
});
assert.equal(syncTitles[3].letterSpacing, '-0.03em');
assert.equal(syncTitles[3].transform, '');
assert.equal(syncTitles[4].letterSpacing, '-0.05em');
assert.equal(syncTitles[4].transform, '');
assert.equal(syncTitles[5].letterSpacing, '-0.05em');
assert.equal(syncTitles[5].transform, 'scaleX(0.975)');
assert.equal(syncTitles[6].letterSpacing, '-0.05em');
assert.equal(syncTitles[6].transform, '');
assert.deepEqual(syncTitles[6].classes, ['is-ellipsis']);
assert.equal(syncTitles[7].transform, 'scaleX(0.962)');
assert.deepEqual(syncTitles[7].classes, []);
assert.equal(syncTitles[8].transform, '');
assert.deepEqual(syncTitles[8].classes, ['is-ellipsis']);

assert.equal(moduleResult.geometry.viewport0.afterFrame, '0px');
assert.equal(moduleResult.geometry.inside.afterFrame, '0px');
assert.equal(moduleResult.geometry.right.afterFrame, '-13px');
assert.equal(moduleResult.geometry.left.afterFrame, '11px');
assert.equal(moduleResult.geometry.both.afterFrame, '108px');
assert.equal(moduleResult.geometry.offsetWidth0.afterFrame, '-13px');
assert.equal(moduleResult.geometry.transformedScale.afterFrame, '-10px');
assert.equal(moduleResult.geometry.shiftBoundary.afterFrame, '0px');
assert.equal(moduleResult.geometry.roundRight.afterFrame, '-11px');
assert.equal(moduleResult.geometry.roundLeft.afterFrame, '11px');
assert.equal(moduleResult.geometry.reset.beforeReset, '-13px');
assert.equal(moduleResult.geometry.reset.afterReset, '');
assert.equal(moduleResult.geometry.noHost.queuedFrames, 0);
assert.equal(moduleResult.geometry.noPopover.queuedFrames, 0);

assert.equal(moduleResult.schedulers.getterCallsAfterFactory, 0);
assert.deepEqual(moduleResult.schedulers.normalCapture, {
  popoverA: '-13px',
  popoverB: '',
});
assert.deepEqual(moduleResult.schedulers.tuneRequery, {
  popoverA: '',
  popoverB: '11px',
  listQueryCountA: 0,
  listQueryCountB: 1,
  getterCalls: 1,
});
assert.equal(moduleResult.schedulers.remainingFrames, 0);

assert.deepEqual(moduleResult.leaving, {
  noHost: false,
  relatedInside: false,
  relatedSelf: false,
  relatedOutside: true,
  relatedNull: true,
});

const currentHarnessHash = createHash('sha256')
  .update(JSON.stringify(moduleResult))
  .digest('hex');
assert.equal(currentHarnessHash, CHARACTERIZATION_JSON_SHA256);

console.log(`enchant recommendation layout: ok (${currentHarnessHash})`);
