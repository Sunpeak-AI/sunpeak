/**
 * Types for map components
 */

export interface Place {
  id: string;
  name: string;
  coords: [number, number];
  description: string;
  city: string;
  rating: number;
  price: string;
  thumbnail: string;
}

export interface MapData extends Record<string, unknown> {
  places: Place[];
}
