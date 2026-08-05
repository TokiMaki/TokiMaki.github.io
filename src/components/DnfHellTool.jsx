import { memo, useEffect } from 'react';
import { initDnfHellTool } from '../dnfHellTool/initDnfHellTool.js';
import DnfHellToolMarkup from './DnfHellToolMarkup.jsx';

function DnfHellTool() {
  useEffect(() => initDnfHellTool(), []);

  return <DnfHellToolMarkup />;
}

export default memo(DnfHellTool);
