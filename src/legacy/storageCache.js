export function createNamespacedCache({
  prefix,
  backupKey,
  getNamespace,
}) {
  function getCacheKey() {
    return `${prefix}${encodeURIComponent(getNamespace())}`;
  }

  function readText() {
    try {
      const cacheKey = getCacheKey();
      const primary = localStorage.getItem(cacheKey) || '';
      if (primary) return primary;

      const backup = localStorage.getItem(backupKey) || '';
      if (backup) {
        localStorage.setItem(cacheKey, backup);
        return backup;
      }

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) {
          continue;
        }
        const value = localStorage.getItem(key) || '';
        if (value) {
          localStorage.setItem(cacheKey, value);
          localStorage.setItem(backupKey, value);
          return value;
        }
      }

      return '';
    } catch {
      return '';
    }
  }

  function writeText(text) {
    try {
      localStorage.setItem(getCacheKey(), text);
      localStorage.setItem(backupKey, text);
    } catch {
      // 저장 실패는 무시한다.
    }
  }

  function removeText() {
    try {
      localStorage.removeItem(getCacheKey());
      localStorage.removeItem(backupKey);
    } catch {
      // 저장 실패는 무시한다.
    }
  }

  return {
    getCacheKey,
    readText,
    writeText,
    removeText,
  };
}
