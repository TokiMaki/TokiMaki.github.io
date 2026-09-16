import React from 'react';
import { renderToString } from 'react-dom/server';
import AboutPage from './components/AboutPage.jsx';
import DnfHellTool from './components/DnfHellTool.jsx';
import PrivacyPolicyPage from './components/PrivacyPolicyPage.jsx';
import SettingValueRankingPage from './components/SettingValueRankingPage.jsx';

export function renderPath(pathname) {
  if (pathname === '/about/') {
    return renderToString(<AboutPage />);
  }
  if (pathname === '/ranking/') {
    return renderToString(<SettingValueRankingPage />);
  }
  if (pathname === '/privacy/') {
    return renderToString(<PrivacyPolicyPage />);
  }
  return renderToString(
    <div>
      <DnfHellTool />
    </div>,
  );
}
