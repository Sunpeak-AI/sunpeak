import * as React from 'react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Avatar } from '@openai/apps-sdk-ui/components/Avatar';
import { X, Star } from '@openai/apps-sdk-ui/components/Icon';
import { cn } from '../../../lib/index';
import type { Place } from './types';

export type PlaceInspectorProps = {
  place: Place;
  onClose: () => void;
  className?: string;
};

const REVIEWS = [
  {
    user: 'Leo M.',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
    text: 'Fantastic crust and balanced toppings. The marinara is spot on!',
  },
  {
    user: 'Priya S.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    text: 'Cozy vibe and friendly staff. Quick service on a Friday night.',
  },
  {
    user: 'Maya R.',
    avatar: 'https://images.unsplash.com/photo-1759197332955-f6bf401a45bf?w=100&h=100&fit=crop',
    text: 'Great for sharing. Will definitely come back with friends.',
  },
];

export const PlaceInspector = React.forwardRef<HTMLDivElement, PlaceInspectorProps>(
  ({ place, onClose, className }, ref) => {
    if (!place) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'map-inspector absolute z-30 top-0 bottom-4 left-0 right-auto xl:left-auto xl:right-6 md:z-20 w-[340px] xl:w-[360px] xl:top-6 xl:bottom-8 pointer-events-auto',
          'animate-in fade-in slide-in-from-left-2 xl:slide-in-from-right-2 duration-200',
          className
        )}
      >
        {/* Close button */}
        <Button
          variant="solid"
          color="secondary"
          size="sm"
          className="absolute z-10 top-4 left-4 xl:top-4 xl:left-4 shadow-xl rounded-full"
          onClick={onClose}
          aria-label="Close details"
        >
          <X className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>

        <div className="relative h-full overflow-y-auto rounded-none xl:rounded-3xl bg-surface xl:shadow-xl xl:ring ring-black/10 dark:ring-white/10">
          {/* Thumbnail */}
          <div className="relative mt-2 xl:mt-0 px-2 xl:px-0">
            <img
              src={place.thumbnail}
              alt={place.name}
              className="w-full rounded-3xl xl:rounded-none h-80 object-cover xl:rounded-t-2xl"
              loading="lazy"
            />
          </div>

          <div className="h-[calc(100%-11rem)] sm:h-[calc(100%-14rem)]">
            {/* Place info */}
            <div className="p-4 sm:p-5">
              <div className="text-2xl font-medium truncate text-primary">{place.name}</div>
              <div className="text-sm mt-1 text-secondary flex items-center gap-1">
                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                {place.rating.toFixed(1)}
                {place.price && <span>· {place.price}</span>}
                <span>· {place.city}</span>
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex flex-row items-center gap-3 font-medium">
                <Button
                  variant="solid"
                  color="warning"
                  size="sm"
                  className="rounded-full"
                  onClick={() => console.log('Add to favorites:', place.id)}
                >
                  Add to favorites
                </Button>
                <Button
                  variant="outline"
                  color="primary"
                  size="sm"
                  className="rounded-full"
                  style={{ color: '#F46C21' }}
                  onClick={() => console.log('Contact:', place.id)}
                >
                  Contact
                </Button>
              </div>

              {/* Description */}
              <div className="text-sm mt-5 text-primary">
                {place.description} Enjoy a slice at one of SF&apos;s favorites. Fresh ingredients,
                great crust, and cozy vibes.
              </div>
            </div>

            {/* Reviews */}
            <div className="px-4 sm:px-5 pb-4">
              <div className="text-lg font-medium mb-2 text-primary">Reviews</div>
              <ul className="space-y-3 divide-y divide-black/5 dark:divide-white/5">
                {REVIEWS.map((review, idx) => (
                  <li key={idx} className="py-3">
                    <div className="flex items-start gap-3">
                      <Avatar imageUrl={review.avatar} name={review.user} size={32} />
                      <div className="min-w-0 gap-1 flex flex-col">
                        <div className="text-xs font-medium text-secondary">{review.user}</div>
                        <div className="text-sm text-primary">{review.text}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
PlaceInspector.displayName = 'PlaceInspector';
