import { useApp, useSafeArea, useViewport } from 'sunpeak';
import { Albums } from './components/albums';

/**
 * Production-ready Albums Resource
 *
 * This resource displays photo albums in a carousel layout with fullscreen viewing capability.
 * Can be dropped into any production environment without changes.
 */
export function AlbumsResource() {
  const { app } = useApp({
    appInfo: { name: 'AlbumsResource', version: '1.0.0' },
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
      <Albums app={app} />
    </div>
  );
}
