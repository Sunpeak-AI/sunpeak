import * as React from 'react';
import { useSafeArea, useMaxHeight } from 'sunpeak';
import { Map } from '../components/map/map';

/**
 * Production-ready Map Resource
 *
 * This resource displays a pizza restaurant finder with an interactive map,
 * place listings, and detailed inspector view.
 * Can be dropped into any production environment without changes.
 */
export const MapResource = React.forwardRef<HTMLDivElement>((_props, ref) => {
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
      <Map />
    </div>
  );
});
MapResource.displayName = 'MapResource';
