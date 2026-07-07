import DnfHellTool from './components/DnfHellTool.jsx';
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

  return <DnfHellTool />;
}
