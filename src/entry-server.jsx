import React from 'react';
import { renderToString } from 'react-dom/server';
import AboutPage from './components/AboutPage.jsx';
import DnfHellTool from './components/DnfHellTool.jsx';
import SettingValueRankingPage from './components/SettingValueRankingPage.jsx';

export function renderPath(pathname) {
  if (pathname === '/about/') {
    return renderToString(<AboutPage />);
  }
  if (pathname === '/ranking/') {
    return renderToString(<SettingValueRankingPage />);
  }
  return renderToString(
    <div>
      <DnfHellTool />
    </div>,
  );
}
