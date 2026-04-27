import { useEffect, useRef } from 'react';
import { legacyMarkup } from '../legacy/legacyMarkup.js';
import { initDnfHellTool } from '../legacy/initDnfHellTool.js';

export default function LegacyDnfHellTool() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return undefined;
    initializedRef.current = true;
    return initDnfHellTool();
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: legacyMarkup }} />;
}
