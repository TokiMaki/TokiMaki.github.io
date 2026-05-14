function resolveApiBase() {
  const configuredApiBase = import.meta.env.VITE_API_BASE?.trim();
  if (configuredApiBase) {
    return configuredApiBase.replace(/\/$/, '');
  }

  if (location.protocol === 'file:') {
    return 'http://127.0.0.1:8787';
  }

  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return location.port === '8787' ? '' : 'http://127.0.0.1:8787';
  }

  return '';
}

export const API_BASE = resolveApiBase();
export const STORAGE_NAMESPACE_KEY = 'dnf-hell-info:storage-namespace';
export const DEV_MODE_STORAGE_KEY = 'dnf-hell-info:dev-mode';
export const CHARACTER_CACHE_PREFIX = 'dnf-hell-info:api-character-list:';
export const CHARACTER_CACHE_BACKUP_KEY = 'dnf-hell-info:api-character-list:backup';
export const SUPPLY_CACHE_PREFIX = 'dnf-hell-info:supply-character-list:';
export const SUPPLY_CACHE_BACKUP_KEY = 'dnf-hell-info:supply-character-list:backup';
export const ACTIVE_TAB_STORAGE_KEY = 'dnf-hell-info:active-tab';
export const SUPPLY_SOUL_EXCLUDED_KEYS_STORAGE_KEY = 'dnf-hell-info:supply-soul-excluded-keys';
export const SUPPLY_SOUL_USAGE_RATES_STORAGE_KEY = 'dnf-hell-info:supply-soul-usage-rates';
export const STORAGE_SCOPE_LABEL = '이 컴퓨터 저장소';
