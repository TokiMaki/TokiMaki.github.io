import { useEffect, useState } from 'react';
import DnfHellTool from './components/DnfHellTool.jsx';
import AboutPage from './components/AboutPage.jsx';
import PrivacyPolicyPage from './components/PrivacyPolicyPage.jsx';
import SettingValueRankingPage from './components/SettingValueRankingPage.jsx';
import { applyMetadataForLocation } from './seo/pageMetadata.js';

const SPA_PATHS = new Set(['/', '/about', '/about/', '/privacy', '/privacy/', '/stats', '/stats/']);

function normalizeSpaPath(pathname) {
  if (pathname === '/about') return '/about/';
  if (pathname === '/privacy') return '/privacy/';
  if (pathname === '/stats') return '/stats/';
  return pathname;
}

export default function App() {
  const spaRedirectPath = window.sessionStorage?.getItem('dunpilot:spa-redirect');
  if (spaRedirectPath) {
    window.sessionStorage.removeItem('dunpilot:spa-redirect');
    window.history.replaceState(null, '', spaRedirectPath);
  }

  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [hasToolMounted, setHasToolMounted] = useState(() => window.location.pathname === '/');
  useEffect(() => {
    applyMetadataForLocation(window.location);
    if (pathname === '/') setHasToolMounted(true);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
      applyMetadataForLocation(window.location);
    };

    const handleDocumentClick = (event) => {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) return;

      const anchor = event.target instanceof Element
        ? event.target.closest('a[href]')
        : null;
      if (
        !anchor
        || anchor.hasAttribute('download')
        || (anchor.target && anchor.target.toLowerCase() !== '_self')
      ) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !SPA_PATHS.has(url.pathname)) return;

      const nextPathname = normalizeSpaPath(url.pathname);
      const nextUrl = `${nextPathname}${url.search}${url.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl === currentUrl) return;

      event.preventDefault();
      window.history.pushState({}, '', nextUrl);
      setPathname(nextPathname);
      applyMetadataForLocation(window.location);
      window.dispatchEvent(new Event('dunpilot:locationchange'));
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClick);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  if (pathname === '/privacy' || pathname === '/privacy/') {
    return <PrivacyPolicyPage />;
  }

  if (pathname === '/about' || pathname === '/about/') {
    return <AboutPage />;
  }

  const isStatsPage = pathname === '/stats' || pathname === '/stats/';
  if (pathname !== '/' && !isStatsPage) {
    return (
      <main className={'not-found-page'}>
        <section className={'not-found-panel'}>
          <h1>페이지를 찾을 수 없습니다.</h1>
          <p>요청한 주소가 올바른지 확인해주세요.</p>
          <a href={'/'}>던파일럿으로 돌아가기</a>
        </section>
      </main>
    );
  }

  const shouldRenderTool = hasToolMounted || pathname === '/';
  return (
    <>
      {shouldRenderTool ? (
        <div hidden={isStatsPage}>
          <DnfHellTool />
        </div>
      ) : null}
      {isStatsPage ? <SettingValueRankingPage /> : null}
    </>
  );
}
