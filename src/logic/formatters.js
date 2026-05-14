// 화면 출력용 공통 포매터.

const SERVER_LABELS = {
  cain: '카인',
  diregie: '디레지에',
  siroco: '시로코',
  prey: '프레이',
  casillas: '카시야스',
  hilder: '힐더',
  anton: '안톤',
  bakal: '바칼',
};

export function fmtInt(value) {
  return Math.round(value).toLocaleString('ko-KR');
}

export function fmtCost(value) {
  return fmtInt(value);
}

export function fmtDecimal(value, digits = 3) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return '0';
  if (digits <= 0) return String(Math.round(normalized));
  return normalized.toFixed(digits).replace(/\.?0+$/, '');
}

export function fmtRevelation(value, digits = 1) {
  return `${fmtDecimal(value, digits)} 계시`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

export function getServerLabel(serverId) {
  return SERVER_LABELS[String(serverId || '').trim().toLowerCase()] || String(serverId || '').trim();
}
