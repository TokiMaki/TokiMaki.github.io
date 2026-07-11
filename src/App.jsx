import DnfHellTool from './components/DnfHellTool.jsx';
import AboutPage from './components/AboutPage.jsx';
import PrivacyPolicyPage from './components/PrivacyPolicyPage.jsx';

export default function App() {
  const spaRedirectPath = window.sessionStorage?.getItem('dunpilot:spa-redirect');
  if (spaRedirectPath) {
    window.sessionStorage.removeItem('dunpilot:spa-redirect');
    window.history.replaceState(null, '', spaRedirectPath);
  }

  if (window.location.pathname === '/privacy' || window.location.pathname === '/privacy/') {
    return <PrivacyPolicyPage />;
  }

  if (window.location.pathname === '/about' || window.location.pathname === '/about/') {
    return <AboutPage />;
  }

  if (window.location.pathname !== '/') {
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

  return <DnfHellTool />;
}
