import * as React from 'react';
import { useSafeArea, useMaxHeight } from 'sunpeak';
import { Albums } from './components/albums';

/**
 * Production-ready Albums Resource
 *
 * This resource displays photo albums in a carousel layout with fullscreen viewing capability.
 * Can be dropped into any production environment without changes.
 */
export const AlbumsResource = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const safeArea = useSafeArea();
  const maxHeight = useMaxHeight();

  return (
    <div
      ref={ref}
      className="h-full"
      style={{
        paddingTop: `${safeArea?.insets.top ?? 0}px`,
        paddingBottom: `${safeArea?.insets.bottom ?? 0}px`,
        paddingLeft: `${safeArea?.insets.left ?? 0}px`,
        paddingRight: `${safeArea?.insets.right ?? 0}px`,
        maxHeight: maxHeight ?? undefined,
      }}
    >
      <Albums />
    </div>
  );
});
AlbumsResource.displayName = 'AlbumsResource';
