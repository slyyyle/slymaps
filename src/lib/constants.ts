import type { MapStyle } from '@/types';

export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
export const ONEBUSAWAY_API_KEY = process.env.NEXT_PUBLIC_ONEBUSAWAY_API_KEY || '';

export const CAPITOL_HILL_COORDS = {
  longitude: -122.3207,
  latitude: 47.6250,
  zoom: 13,
};

export const INITIAL_VIEW_STATE = {
  longitude: CAPITOL_HILL_COORDS.longitude,
  latitude: CAPITOL_HILL_COORDS.latitude,
  zoom: CAPITOL_HILL_COORDS.zoom,
  pitch: 45, // For 3D view
  bearing: 0,
};

export const MAP_STYLES: MapStyle[] = [
  { id: 'standard', name: 'Standard', url: 'mapbox://styles/mapbox/standard' },
  { id: 'standard-satellite', name: 'Standard Satellite', url: 'mapbox://styles/mapbox/standard-satellite' },
];

export const TRANSIT_MODES = [
  { id: 'driving-traffic', name: 'Driving' },
  { id: 'walking', name: 'Walking' },
  { id: 'cycling', name: 'Cycling' },
  // Mapbox Directions API supports 'transit' but it's often limited.
  // OneBusAway would be better for detailed public transit.
];
