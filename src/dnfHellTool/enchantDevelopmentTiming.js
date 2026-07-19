export function createEnchantDevelopmentTiming({
  getIsDevMode,
  getTiming,
  setTiming,
  now,
  setLastSummary,
  logInfo,
}) {
  function getEnchantNowMs() {
    return now();
  }

  function beginEnchantTiming(label) {
    if (!getIsDevMode()) return false;
    setTiming({
      label,
      startedAt: getEnchantNowMs(),
      steps: [],
    });
    return true;
  }

  function recordEnchantTimingStep(name, startedAt, extra = {}) {
    if (!getIsDevMode() || !getTiming() || !Number.isFinite(startedAt)) return;
    getTiming().steps.push({
      name,
      ms: Math.round((getEnchantNowMs() - startedAt) * 10) / 10,
      ...extra,
    });
  }

  function flushEnchantTiming(status = 'done') {
    if (!getIsDevMode() || !getTiming()) return;
    const summary = {
      label: getTiming().label,
      status,
      totalMs: Math.round((getEnchantNowMs() - getTiming().startedAt) * 10) / 10,
      steps: getTiming().steps,
    };
    setLastSummary(summary);
    logInfo(`[enchant-timing] ${summary.label} · ${status}`, summary);
    setTiming(null);
  }

  return {
    getEnchantNowMs,
    beginEnchantTiming,
    recordEnchantTimingStep,
    flushEnchantTiming,
  };
}
