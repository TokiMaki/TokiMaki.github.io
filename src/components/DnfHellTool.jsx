import { useEffect, useRef } from 'react';
import { initDnfHellTool } from '../dnfHellTool/initDnfHellTool.js';
import DnfHellToolMarkup from './DnfHellToolMarkup.jsx';

export default function DnfHellTool() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return undefined;
    initializedRef.current = true;
    return initDnfHellTool();
  }, []);

  return <DnfHellToolMarkup />;
}
