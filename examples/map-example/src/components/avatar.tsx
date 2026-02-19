import * as React from 'react';

export interface AvatarProps {
  imageUrl?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ imageUrl, name, size = 32, className }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const initial = name?.charAt(0).toUpperCase() ?? '?';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-black/10 dark:bg-white/10 flex-shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size, minWidth: size }}
    >
      {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={name ?? ''}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-secondary font-medium leading-none" style={{ fontSize: size * 0.4 }}>
          {initial}
        </span>
      )}
    </span>
  );
}
