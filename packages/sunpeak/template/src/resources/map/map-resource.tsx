import { useApp, useSafeArea, useViewport } from 'sunpeak';
import { Map } from './components/map';

/**
 * Production-ready Map Resource
 *
 * This resource displays a pizza restaurant finder with an interactive map,
 * place listings, and detailed inspector view.
 * Can be dropped into any production environment without changes.
 */
export function MapResource() {
  const { app } = useApp({
    appInfo: { name: 'MapResource', version: '1.0.0' },
    capabilities: {},
  });

  const safeArea = useSafeArea(app);
  const viewport = useViewport(app);

  return (
    <div
      className="h-full"
      style={{
        paddingTop: `${safeArea.top}px`,
        paddingBottom: `${safeArea.bottom}px`,
        paddingLeft: `${safeArea.left}px`,
        paddingRight: `${safeArea.right}px`,
        maxHeight: viewport?.maxHeight ?? undefined,
      }}
    >
      <Map app={app} />
    </div>
  );
}
