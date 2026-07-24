export function createToolLifecycle() {
  let active = true;
  const timeoutIds = new Set();
  const animationFrameIds = new Set();
  const idleCallbackIds = new Set();
  const requestControllers = new Set();
  const eventListenerCaptureStack = [];
  const eventListenerCaptures = new Set();

  function restoreFinishedEventListenerCaptures() {
    while (eventListenerCaptureStack.at(-1)?.finished) {
      const capture = eventListenerCaptureStack.pop();
      if (capture.prototype.addEventListener === capture.trackedAddEventListener) {
        capture.prototype.addEventListener = capture.originalAddEventListener;
      }
    }
  }

  function disposeCapturedEventListeners(capture) {
    if (capture.listenersDisposed) return;
    capture.listenersDisposed = true;
    capture.records.splice(0).reverse().forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });
  }

  function beginEventListenerCapture() {
    const prototype = globalThis.EventTarget?.prototype;
    if (!prototype?.addEventListener || !prototype?.removeEventListener) {
      return () => () => {};
    }

    const capture = {
      prototype,
      originalAddEventListener: prototype.addEventListener,
      records: [],
      finished: false,
      listenersDisposed: false,
      trackedAddEventListener: null,
    };
    capture.trackedAddEventListener = function addTrackedEventListener(type, listener, options) {
      capture.originalAddEventListener.call(this, type, listener, options);
      capture.records.push({ target: this, type, listener, options });
    };
    eventListenerCaptureStack.push(capture);
    eventListenerCaptures.add(capture);
    prototype.addEventListener = capture.trackedAddEventListener;

    return function finishEventListenerCapture() {
      capture.finished = true;
      restoreFinishedEventListenerCaptures();
      return () => disposeCapturedEventListeners(capture);
    };
  }

  function setTimeoutTracked(callback, delay, ...args) {
    const timeoutId = globalThis.setTimeout(() => {
      timeoutIds.delete(timeoutId);
      if (active) callback(...args);
    }, delay);
    timeoutIds.add(timeoutId);
    return timeoutId;
  }

  function clearTimeoutTracked(timeoutId) {
    timeoutIds.delete(timeoutId);
    globalThis.clearTimeout(timeoutId);
  }

  function requestAnimationFrameTracked(callback) {
    const request = globalThis.requestAnimationFrame
      || ((next) => globalThis.setTimeout(() => next(Date.now()), 16));
    const frameId = request((timestamp) => {
      animationFrameIds.delete(frameId);
      if (active) callback(timestamp);
    });
    animationFrameIds.add(frameId);
    return frameId;
  }

  function cancelAnimationFrameTracked(frameId) {
    animationFrameIds.delete(frameId);
    const cancel = globalThis.cancelAnimationFrame || globalThis.clearTimeout;
    cancel(frameId);
  }

  function requestIdleCallbackTracked(callback, options) {
    const request = globalThis.requestIdleCallback
      || ((next) => globalThis.setTimeout(() => next({ didTimeout: false, timeRemaining: () => 0 }), 1));
    const callbackId = request((deadline) => {
      idleCallbackIds.delete(callbackId);
      if (active) callback(deadline);
    }, options);
    idleCallbackIds.add(callbackId);
    return callbackId;
  }

  async function fetchTracked(input, init = {}) {
    if (!active) throw new DOMException('Tool lifecycle disposed', 'AbortError');
    const controller = new AbortController();
    const externalSignal = init.signal;
    const abortFromExternalSignal = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted) {
      abortFromExternalSignal();
    } else {
      externalSignal?.addEventListener?.('abort', abortFromExternalSignal, { once: true });
    }
    requestControllers.add(controller);
    try {
      return await globalThis.fetch(input, { ...init, signal: controller.signal });
    } finally {
      requestControllers.delete(controller);
      externalSignal?.removeEventListener?.('abort', abortFromExternalSignal);
    }
  }

  function dispose() {
    if (!active) return;
    active = false;
    eventListenerCaptureStack.forEach((capture) => {
      capture.finished = true;
    });
    restoreFinishedEventListenerCaptures();
    eventListenerCaptures.forEach(disposeCapturedEventListeners);
    eventListenerCaptures.clear();
    requestControllers.forEach((controller) => controller.abort());
    requestControllers.clear();
    timeoutIds.forEach((timeoutId) => globalThis.clearTimeout(timeoutId));
    timeoutIds.clear();
    const cancelFrame = globalThis.cancelAnimationFrame || globalThis.clearTimeout;
    animationFrameIds.forEach((frameId) => cancelFrame(frameId));
    animationFrameIds.clear();
    const cancelIdle = globalThis.cancelIdleCallback || globalThis.clearTimeout;
    idleCallbackIds.forEach((callbackId) => cancelIdle(callbackId));
    idleCallbackIds.clear();
  }

  return {
    get active() {
      return active;
    },
    beginEventListenerCapture,
    setTimeout: setTimeoutTracked,
    clearTimeout: clearTimeoutTracked,
    requestAnimationFrame: requestAnimationFrameTracked,
    cancelAnimationFrame: cancelAnimationFrameTracked,
    requestIdleCallback: requestIdleCallbackTracked,
    fetch: fetchTracked,
    dispose,
  };
}
