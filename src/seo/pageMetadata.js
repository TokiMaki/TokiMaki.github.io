const SITE_URL = 'https://www.dunpilot.com/';
const SITE_IMAGE_URL = `${SITE_URL}Icon.png`;

const ROOT_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '던파일럿',
  alternateName: ['DUNPILOT', 'DunPilot', '던파파일럿'],
  url: SITE_URL,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  description: '던파일럿은 던전앤파이터 캐릭터의 현재 장비와 세팅을 분석해 스펙업 상승량과 예상 비용을 비교하고, 골드 효율이 좋은 스펙업 순서를 추천하는 웹 애플리케이션입니다.',
  featureList: [
    '캐릭터 장비와 세팅 분석',
    '장비점수와 버프점수 변화 확인',
    '골드 대비 스펙업 순서 추천',
    '딜러와 버퍼 스펙업 시뮬레이터',
  ],
};

const ROOT_METADATA = {
  title: '던파 스펙업 순서·골드 효율 | 던파일럿',
  description: '던파 캐릭터의 현재 장비와 세팅을 분석해 가성비 좋은 스펙업 순서를 추천합니다. 장비점수·버프점수 변화, 예상 비용을 비교하고 시뮬레이터로 적용 결과를 확인하세요.',
  robots: 'index,follow',
  canonical: SITE_URL,
  openGraph: {
    title: '던파일럿 | 던파 스펙업 순서·골드 효율',
    description: '던파 캐릭터별 스펙업 상승량과 비용을 비교해 가성비 좋은 순서를 추천하고, 장비점수·버프점수 변화를 시뮬레이션합니다.',
    url: SITE_URL,
    type: 'website',
    image: SITE_IMAGE_URL,
  },
  twitter: {
    card: 'summary',
    title: '던파일럿 | 던파 스펙업 순서·골드 효율',
    description: '캐릭터별 스펙업 상승량과 비용, 장비점수·버프점수 변화를 비교합니다.',
    image: SITE_IMAGE_URL,
  },
  structuredData: ROOT_STRUCTURED_DATA,
};

const ABOUT_METADATA = {
  title: '던파일럿 이용 가이드 | 던파 스펙업 순서·시뮬레이터',
  description: '던파일럿이 캐릭터별 던파 스펙업 순서와 골드 효율을 계산하는 방법, 장비점수·버프점수, 딜러·버퍼 시뮬레이터 이용 방법을 안내합니다.',
  robots: 'index,follow',
  canonical: `${SITE_URL}about/`,
  openGraph: {
    title: '던파일럿 이용 가이드 | 던파 스펙업 순서·시뮬레이터',
    description: '캐릭터 검색부터 스펙업 추천 적용, 누적 골드와 랭킹 확인까지 던파일럿 이용 방법을 안내합니다.',
    url: `${SITE_URL}about/`,
    type: 'website',
    image: SITE_IMAGE_URL,
  },
  twitter: {
    card: 'summary',
    title: '던파일럿 이용 가이드 | 던파 스펙업 순서·시뮬레이터',
    description: '캐릭터 검색부터 스펙업 추천 적용, 누적 골드와 랭킹 확인까지 던파일럿 이용 방법을 안내합니다.',
    image: SITE_IMAGE_URL,
  },
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: '던파일럿 이용 가이드',
    url: `${SITE_URL}about/`,
    description: '던파일럿의 캐릭터 분석, 스펙업 추천, 시뮬레이터와 랭킹 이용 방법을 안내합니다.',
    isPartOf: {
      '@type': 'WebSite',
      name: '던파일럿',
      url: SITE_URL,
    },
  },
};

const STATS_METADATA = {
  title: '랭킹 | 던파일럿',
  description: '던파일럿에서 갱신된 캐릭터의 장비와 서약 결정, 장비점수, 명성과 현재가 기준 세팅 추정 가치를 함께 확인합니다.',
  robots: 'noindex,follow',
  canonical: `${SITE_URL}stats/`,
  openGraph: {
    title: '랭킹 | 던파일럿',
    description: '캐릭터의 장비와 서약 결정, 현재가 기준 세팅 추정 가치를 한 화면에서 확인합니다.',
    url: `${SITE_URL}stats/`,
    type: 'website',
    image: SITE_IMAGE_URL,
  },
  twitter: {
    card: 'summary',
    title: '랭킹 | 던파일럿',
    description: '캐릭터별 장비와 서약 결정, 세팅 추정 가치를 함께 확인합니다.',
    image: SITE_IMAGE_URL,
  },
  structuredData: null,
};

const PRIVACY_METADATA = {
  title: '개인정보 처리방침 | 던파일럿',
  description: '던파일럿의 캐릭터 검색·분석 정보, 브라우저 저장 정보, 로그와 광고 관련 개인정보 처리 기준을 안내합니다.',
  robots: 'noindex,follow',
  canonical: `${SITE_URL}privacy/`,
  openGraph: {
    title: '개인정보 처리방침 | 던파일럿',
    description: '던파일럿 서비스의 개인정보 처리 기준을 안내합니다.',
    url: `${SITE_URL}privacy/`,
    type: 'website',
    image: SITE_IMAGE_URL,
  },
  twitter: {
    card: 'summary',
    title: '개인정보 처리방침 | 던파일럿',
    description: '던파일럿 서비스의 개인정보 처리 기준을 안내합니다.',
    image: SITE_IMAGE_URL,
  },
  structuredData: null,
};

function cloneMetadata(metadata) {
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph },
    twitter: { ...metadata.twitter },
    structuredData: metadata.structuredData ? structuredClone(metadata.structuredData) : null,
  };
}

function createCharacterResultMetadata(serverId, characterName) {
  const normalizedServerId = String(serverId || 'all').trim() || 'all';
  const normalizedName = String(characterName || '').trim();
  const query = new URLSearchParams({ server: normalizedServerId, name: normalizedName });
  const resultUrl = `${SITE_URL}?${query.toString()}`;
  const displayName = normalizedName || '캐릭터';
  return {
    title: `${displayName} 캐릭터 분석 결과 | 던파일럿`,
    description: `${displayName} 캐릭터의 장비와 세팅, 장비점수·버프점수 변화, 골드 대비 스펙업 추천과 시뮬레이션 결과를 확인합니다.`,
    robots: 'noindex,follow',
    canonical: SITE_URL,
    openGraph: {
      title: `${displayName} 캐릭터 분석 결과 | 던파일럿`,
      description: '던파일럿 캐릭터 장비 분석과 골드 대비 스펙업 추천 결과입니다.',
      url: resultUrl,
      type: 'website',
      image: SITE_IMAGE_URL,
    },
    twitter: {
      card: 'summary',
      title: `${displayName} 캐릭터 분석 결과 | 던파일럿`,
      description: '던파일럿 캐릭터 장비 분석과 골드 대비 스펙업 추천 결과입니다.',
      image: SITE_IMAGE_URL,
    },
    structuredData: ROOT_STRUCTURED_DATA,
  };
}

function createNotFoundMetadata(pathname) {
  const normalizedPath = String(pathname || '/').startsWith('/') ? String(pathname || '/') : `/${pathname}`;
  const pageUrl = new URL(normalizedPath, SITE_URL).href;
  return {
    title: '페이지를 찾을 수 없습니다 | 던파일럿',
    description: '요청한 던파일럿 페이지를 찾을 수 없습니다.',
    robots: 'noindex,follow',
    canonical: pageUrl,
    openGraph: {
      title: '페이지를 찾을 수 없습니다 | 던파일럿',
      description: '요청한 던파일럿 페이지를 찾을 수 없습니다.',
      url: pageUrl,
      type: 'website',
      image: SITE_IMAGE_URL,
    },
    twitter: {
      card: 'summary',
      title: '페이지를 찾을 수 없습니다 | 던파일럿',
      description: '요청한 던파일럿 페이지를 찾을 수 없습니다.',
      image: SITE_IMAGE_URL,
    },
    structuredData: null,
  };
}

export function getPageMetadataForLocation(locationLike) {
  const pathname = String(locationLike?.pathname || '/');
  if (pathname === '/') {
    const params = new URLSearchParams(String(locationLike?.search || ''));
    const characterName = String(params.get('name') || '').trim();
    if (characterName) {
      return createCharacterResultMetadata(params.get('server') || 'all', characterName);
    }
    return cloneMetadata(ROOT_METADATA);
  }
  if (pathname === '/about' || pathname === '/about/') return cloneMetadata(ABOUT_METADATA);
  if (pathname === '/stats' || pathname === '/stats/') return cloneMetadata(STATS_METADATA);
  if (pathname === '/privacy' || pathname === '/privacy/') return cloneMetadata(PRIVACY_METADATA);
  return createNotFoundMetadata(pathname);
}

function setMetaContent(documentRef, selector, attributes, content) {
  let element = documentRef.querySelector(selector);
  if (!element) {
    element = documentRef.createElement('meta');
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    documentRef.head.append(element);
  }
  element.setAttribute('content', content);
}

export function applyPageMetadata(metadata, documentRef = document) {
  documentRef.title = metadata.title;
  setMetaContent(documentRef, 'meta[name="description"]', { name: 'description' }, metadata.description);
  setMetaContent(documentRef, 'meta[name="robots"]', { name: 'robots' }, metadata.robots);

  let canonical = documentRef.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = documentRef.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    documentRef.head.append(canonical);
  }
  canonical.setAttribute('href', metadata.canonical);

  setMetaContent(documentRef, 'meta[property="og:site_name"]', { property: 'og:site_name' }, '던파일럿');
  setMetaContent(documentRef, 'meta[property="og:title"]', { property: 'og:title' }, metadata.openGraph.title);
  setMetaContent(documentRef, 'meta[property="og:description"]', { property: 'og:description' }, metadata.openGraph.description);
  setMetaContent(documentRef, 'meta[property="og:url"]', { property: 'og:url' }, metadata.openGraph.url);
  setMetaContent(documentRef, 'meta[property="og:type"]', { property: 'og:type' }, metadata.openGraph.type);
  setMetaContent(documentRef, 'meta[property="og:image"]', { property: 'og:image' }, metadata.openGraph.image);
  setMetaContent(documentRef, 'meta[name="twitter:card"]', { name: 'twitter:card' }, metadata.twitter.card);
  setMetaContent(documentRef, 'meta[name="twitter:title"]', { name: 'twitter:title' }, metadata.twitter.title);
  setMetaContent(documentRef, 'meta[name="twitter:description"]', { name: 'twitter:description' }, metadata.twitter.description);
  setMetaContent(documentRef, 'meta[name="twitter:image"]', { name: 'twitter:image' }, metadata.twitter.image);

  let structuredData = documentRef.getElementById('pageStructuredData');
  if (!metadata.structuredData) {
    structuredData?.remove();
    return;
  }
  if (!structuredData) {
    structuredData = documentRef.createElement('script');
    structuredData.id = 'pageStructuredData';
    structuredData.type = 'application/ld+json';
    documentRef.head.append(structuredData);
  }
  structuredData.textContent = JSON.stringify(metadata.structuredData);
}

export function applyMetadataForLocation(locationLike = window.location) {
  applyPageMetadata(getPageMetadataForLocation(locationLike));
}

export function applyRootMetadata() {
  applyPageMetadata(cloneMetadata(ROOT_METADATA));
}

export function applyCharacterResultMetadata(serverId, characterName) {
  applyPageMetadata(createCharacterResultMetadata(serverId, characterName));
}
