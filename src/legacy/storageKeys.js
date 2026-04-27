export const API_BASE = location.protocol === 'file:' ? 'http://127.0.0.1:8787' : '';
export const STORAGE_NAMESPACE_KEY = 'dnf-hell-info:storage-namespace';
export const DEV_MODE_STORAGE_KEY = 'dnf-hell-info:dev-mode';
export const CHARACTER_CACHE_PREFIX = 'dnf-hell-info:api-character-list:';
export const CHARACTER_CACHE_BACKUP_KEY = 'dnf-hell-info:api-character-list:backup';
export const SUPPLY_CACHE_PREFIX = 'dnf-hell-info:supply-character-list:';
export const SUPPLY_CACHE_BACKUP_KEY = 'dnf-hell-info:supply-character-list:backup';
export const ACTIVE_TAB_STORAGE_KEY = 'dnf-hell-info:active-tab';
export const STORAGE_SCOPE_LABEL = '이 컴퓨터 저장소';
