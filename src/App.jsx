import DnfHellTool from './components/DnfHellTool.jsx';
import PrivacyPolicyPage from './components/PrivacyPolicyPage.jsx';

export default function App() {
  if (window.location.pathname === '/privacy') {
    return <PrivacyPolicyPage />;
  }
  return <DnfHellTool />;
}
