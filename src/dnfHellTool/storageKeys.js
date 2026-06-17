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
export const ENABLE_DEV_MODE = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_MODE === '1';

export async function parseApiJsonResponse(response, fallbackMessage = 'API 요청에 실패했습니다.') {
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    const trimmed = text.trim().toLowerCase();
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      throw new Error('API 서버가 연결되지 않았습니다. GitHub Pages에서는 /api 요청을 처리할 수 없으므로 별도 API 서버 주소를 VITE_API_BASE로 설정해야 합니다.');
    }
    throw new Error(`${fallbackMessage} JSON 응답이 아닙니다.`);
  }

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || payload?.message || `${fallbackMessage} (${response.status})`);
  }

  return payload;
}

export const STORAGE_NAMESPACE_KEY = 'dnf-hell-info:storage-namespace';
export const DEV_MODE_STORAGE_KEY = 'dnf-hell-info:dev-mode';
export const CHARACTER_CACHE_PREFIX = 'dnf-hell-info:api-character-list:';
export const CHARACTER_CACHE_BACKUP_KEY = 'dnf-hell-info:api-character-list:backup';
export const SUPPLY_CACHE_PREFIX = 'dnf-hell-info:supply-character-list:';
export const SUPPLY_CACHE_BACKUP_KEY = 'dnf-hell-info:supply-character-list:backup';
export const ACTIVE_TAB_STORAGE_KEY = 'dnf-hell-info:active-tab';
export const ENCHANT_INCLUDE_FILTER_STORAGE_KEY = 'dnf-hell-info:enchant-include-filter';
export const ENCHANT_MATERIAL_COST_STORAGE_KEY = 'dnf-hell-info:enchant-material-cost';
export const SUPPLY_SOUL_EXCLUDED_KEYS_STORAGE_KEY = 'dnf-hell-info:supply-soul-excluded-keys';
export const SUPPLY_SOUL_USAGE_RATES_STORAGE_KEY = 'dnf-hell-info:supply-soul-usage-rates';
export const STORAGE_SCOPE_LABEL = '이 컴퓨터 저장소';
