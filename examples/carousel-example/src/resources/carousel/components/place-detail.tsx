import { Button } from '@/components/button';
import { Star } from '@/components/icon';

export interface PlaceDetailData {
  id: string;
  name: string;
  rating: number;
  category: string;
  location: string;
  image: string;
  description: string;
  address?: string;
  phone?: string;
  hours?: string;
  priceRange?: string;
  tips?: string[];
  highlights?: string[];
}

interface PlaceDetailProps {
  place: PlaceDetailData;
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg';
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < fullStars
              ? 'text-[var(--color-text-warning)]'
              : i === fullStars && hasHalf
                ? 'text-[var(--color-text-warning)] opacity-50'
                : 'text-[var(--color-border-tertiary)]'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating}</span>
    </span>
  );
}

export function PlaceDetail({ place, buttonSize = 'sm' }: PlaceDetailProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-semibold truncate">{place.name}</h1>
      </div>

      {/* Hero image */}
      <div className="px-4 flex justify-center">
        <img src={place.image} alt={place.name} className="max-w-full h-auto rounded-xl" />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Rating and category */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <RatingStars rating={place.rating} />
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-background-secondary)]">
              {place.category}
            </span>
            {place.priceRange && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-background-secondary)]">
                {place.priceRange}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed">{place.description}</p>

        {/* Info grid */}
        <div className="grid grid-cols-1 gap-3">
          {place.address && <InfoRow label="Address" value={place.address} />}
          {place.hours && <InfoRow label="Hours" value={place.hours} />}
          {place.phone && <InfoRow label="Phone" value={place.phone} />}
        </div>

        {/* Highlights */}
        {place.highlights && place.highlights.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Highlights</h3>
            <div className="flex flex-wrap gap-2">
              {place.highlights.map((h) => (
                <span
                  key={h}
                  className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-background-info)] text-[var(--color-text-info)]"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {place.tips && place.tips.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Tips</h3>
            <ul className="space-y-2">
              {place.tips.map((tip, i) => (
                <li
                  key={i}
                  className="text-sm text-[var(--color-text-secondary)] pl-4 border-l-2 border-[var(--color-border-tertiary)]"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="solid"
            color="primary"
            size={buttonSize}
            onClick={() => console.log(`Visit ${place.name}`)}
          >
            Visit
          </Button>
          <Button
            variant="soft"
            color="secondary"
            size={buttonSize}
            onClick={() => console.log(`Learn more about ${place.name}`)}
          >
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-[var(--color-text-secondary)] shrink-0 w-16">{label}</span>
      <span>{value}</span>
    </div>
  );
}
