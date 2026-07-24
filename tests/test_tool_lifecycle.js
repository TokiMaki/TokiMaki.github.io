import assert from 'node:assert/strict';
import { createToolLifecycle } from '../src/dnfHellTool/toolLifecycle.js';

function testMountCleanupRemount() {
  const target = new EventTarget();
  let oldContextCalls = 0;
  let newContextCalls = 0;

  const firstLifecycle = createToolLifecycle();
  const finishFirstCapture = firstLifecycle.beginEventListenerCapture();
  target.addEventListener('tool-event', () => {
    oldContextCalls += 1;
  });
  const disposeFirstListeners = finishFirstCapture();

  target.dispatchEvent(new Event('tool-event'));
  assert.equal(oldContextCalls, 1);

  disposeFirstListeners();
  disposeFirstListeners();
  firstLifecycle.dispose();
  firstLifecycle.dispose();
  target.dispatchEvent(new Event('tool-event'));
  assert.equal(oldContextCalls, 1, 'unmounted context handler must not run');

  const secondLifecycle = createToolLifecycle();
  const finishSecondCapture = secondLifecycle.beginEventListenerCapture();
  target.addEventListener('tool-event', () => {
    newContextCalls += 1;
  });
  const disposeSecondListeners = finishSecondCapture();

  target.dispatchEvent(new Event('tool-event'));
  target.dispatchEvent(new Event('tool-event'));
  assert.equal(oldContextCalls, 1, 'remount must not restore the previous handler');
  assert.equal(newContextCalls, 2, 'remount must register exactly one current handler');

  disposeSecondListeners();
  secondLifecycle.dispose();
  target.dispatchEvent(new Event('tool-event'));
  assert.equal(newContextCalls, 2, 'disposed remount handler must stay removed');
}

function testUnfinishedCaptureRestoredOnDispose() {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const target = new EventTarget();
  let calls = 0;
  const lifecycle = createToolLifecycle();

  lifecycle.beginEventListenerCapture();
  target.addEventListener('unfinished-capture', () => {
    calls += 1;
  });
  assert.notEqual(EventTarget.prototype.addEventListener, originalAddEventListener);

  lifecycle.dispose();
  lifecycle.dispose();
  assert.equal(EventTarget.prototype.addEventListener, originalAddEventListener);
  target.dispatchEvent(new Event('unfinished-capture'));
  assert.equal(calls, 0, 'dispose must remove listeners from an unfinished capture');
}

function testCaptureExceptionRollback() {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const lifecycle = createToolLifecycle();
  try {
    lifecycle.beginEventListenerCapture();
    throw new Error('capture initialization failed');
  } catch (error) {
    lifecycle.dispose();
    assert.equal(error.message, 'capture initialization failed');
  }
  assert.equal(EventTarget.prototype.addEventListener, originalAddEventListener);
}

function testNestedCaptureRestoration() {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const lifecycle = createToolLifecycle();
  const finishOuter = lifecycle.beginEventListenerCapture();
  const outerAddEventListener = EventTarget.prototype.addEventListener;
  const finishInner = lifecycle.beginEventListenerCapture();

  assert.notEqual(EventTarget.prototype.addEventListener, outerAddEventListener);
  const disposeInner = finishInner();
  assert.equal(EventTarget.prototype.addEventListener, outerAddEventListener);
  const disposeOuter = finishOuter();
  assert.equal(EventTarget.prototype.addEventListener, originalAddEventListener);

  disposeInner();
  disposeOuter();
  lifecycle.dispose();
}

async function testAsyncResourceCleanup() {
  const previous = {
    fetch: globalThis.fetch,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    requestIdleCallback: globalThis.requestIdleCallback,
    cancelIdleCallback: globalThis.cancelIdleCallback,
  };
  const frameCallbacks = new Map();
  const idleCallbacks = new Map();
  const cancelledFrames = [];
  const cancelledIdleCallbacks = [];
  let nextFrameId = 1;
  let nextIdleId = 1;
  let requestSignal = null;

  globalThis.requestAnimationFrame = (callback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    frameCallbacks.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    cancelledFrames.push(id);
    frameCallbacks.delete(id);
  };
  globalThis.requestIdleCallback = (callback) => {
    const id = nextIdleId;
    nextIdleId += 1;
    idleCallbacks.set(id, callback);
    return id;
  };
  globalThis.cancelIdleCallback = (id) => {
    cancelledIdleCallbacks.push(id);
    idleCallbacks.delete(id);
  };
  globalThis.fetch = (_input, init = {}) => new Promise((_resolve, reject) => {
    requestSignal = init.signal;
    init.signal.addEventListener('abort', () => {
      reject(new DOMException('aborted', 'AbortError'));
    }, { once: true });
  });

  try {
    const lifecycle = createToolLifecycle();
    let timerCalls = 0;
    let frameCalls = 0;
    let idleCalls = 0;

    lifecycle.setTimeout(() => {
      timerCalls += 1;
    }, 5);
    const frameId = lifecycle.requestAnimationFrame(() => {
      frameCalls += 1;
    });
    const idleId = lifecycle.requestIdleCallback(() => {
      idleCalls += 1;
    });
    const pendingRequest = lifecycle.fetch('/lifecycle-test');

    lifecycle.dispose();
    lifecycle.dispose();

    await assert.rejects(pendingRequest, (error) => error?.name === 'AbortError');
    assert.equal(requestSignal?.aborted, true);
    assert.deepEqual(cancelledFrames, [frameId]);
    assert.deepEqual(cancelledIdleCallbacks, [idleId]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(timerCalls, 0);
    assert.equal(frameCalls, 0);
    assert.equal(idleCalls, 0);
  } finally {
    globalThis.fetch = previous.fetch;
    globalThis.requestAnimationFrame = previous.requestAnimationFrame;
    globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
    globalThis.requestIdleCallback = previous.requestIdleCallback;
    globalThis.cancelIdleCallback = previous.cancelIdleCallback;
  }
}

testMountCleanupRemount();
testUnfinishedCaptureRestoredOnDispose();
testCaptureExceptionRollback();
testNestedCaptureRestoration();
await testAsyncResourceCleanup();

console.log('tool lifecycle tests passed');
