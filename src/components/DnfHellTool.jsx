import { useEffect } from 'react';
import { initDnfHellTool } from '../dnfHellTool/initDnfHellTool.js';
import DnfHellToolMarkup from './DnfHellToolMarkup.jsx';

export default function DnfHellTool() {
  useEffect(() => initDnfHellTool(), []);

  return <DnfHellToolMarkup />;
}
