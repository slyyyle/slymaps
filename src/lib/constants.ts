import type { PointOfInterest, MapStyle } from '@/types';

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
  { id: 'streets', name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'outdoors', name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'light', name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
  { id: 'dark', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'satellite', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
];

export const INITIAL_POIS: PointOfInterest[] = [
  {
    id: 'poi-1',
    name: "Oddfellows Cafe + Bar",
    type: "Restaurant",
    latitude: 47.6141,
    longitude: -122.3224,
    description: "Trendy cafe with coffee, pastries & light American fare.",
    imageUrl: "https://placehold.co/300x200.png",
    dataAiHint: "cafe interior"
  },
  {
    id: 'poi-2',
    name: "Neumos",
    type: "Venue",
    latitude: 47.6146,
    longitude: -122.3208,
    description: "Iconic live music venue.",
    imageUrl: "https://placehold.co/300x200.png",
    dataAiHint: "concert venue"
  },
  {
    id: 'poi-3',
    name: "Unicorn",
    type: "Bar",
    latitude: 47.6143,
    longitude: -122.3216,
    description: "Quirky bar with carnival theme, arcade games & corn dogs.",
    imageUrl: "https://placehold.co/300x200.png",
    dataAiHint: "quirky bar"
  },
  {
    id: 'poi-4',
    name: "Elliott Bay Book Company",
    type: "Shop",
    latitude: 47.6139,
    longitude: -122.3229,
    description: "Large independent bookstore with a cafe.",
    imageUrl: "https://placehold.co/300x200.png",
    dataAiHint: "bookstore interior"
  },
  {
    id: 'poi-5',
    name: "Cal Anderson Park",
    type: "Park",
    latitude: 47.6179,
    longitude: -122.3202,
    description: "Urban park with fountain, sports fields & reflecting pool.",
    imageUrl: "https://placehold.co/300x200.png",
    dataAiHint: "city park"
  },
];

export const TRANSIT_MODES = [
  { id: 'driving-traffic', name: 'Driving' },
  { id: 'walking', name: 'Walking' },
  { id: 'cycling', name: 'Cycling' },
  // Mapbox Directions API supports 'transit' but it's often limited.
  // OneBusAway would be better for detailed public transit.
];
