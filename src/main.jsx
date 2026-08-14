import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/theme.css';
import './styles/global.css';

const rootElement = document.getElementById('root');
const app = <App />;
const canHydrate = rootElement.hasChildNodes()
  && !(window.location.pathname === '/ranking/' && window.location.search);

if (canHydrate) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
