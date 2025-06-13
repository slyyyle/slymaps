// === CORE TYPES ===
// Fundamental types used throughout the application

import type { AddressInput } from '@/utils/address-utils';

export type Coordinates = {
  longitude: number;
  latitude: number;
};

export type TransitMode = 'driving-traffic' | 'walking' | 'cycling' | 'transit';

export interface PointOfInterest {
  id: string;
  name: string;
  type: string; // e.g., Restaurant, Bar, Venue, Park, Shop, Bus Stop
  latitude: number;
  longitude: number;
  description?: AddressInput;
  imageUrl?: string;
  dataAiHint?: string;
  // OBA specific fields
  isObaStop?: boolean;
  direction?: string; // e.g., "N", "S", "W", "E", "NB", "SB"  
  code?: string; // Stop code
  routeIds?: string[]; // List of route IDs serving this stop
  locationType?: number; // OBA specific: 0 for stop, 1 for station
  wheelchairBoarding?: string; // OBA specific
  // Mapbox native POI flag
  isNativePoi?: boolean; // Flag for native map POIs to exclude from custom markers
  properties?: Record<string, unknown>; // Additional properties from Mapbox
  // Search result specific fields
  isSearchResult?: boolean; // True if this POI comes from search results
  searchQuery?: string; // The original search query that found this result
  retrievedData?: Record<string, unknown>; // Additional data from Mapbox retrieve API
  suggestionData?: Record<string, unknown>; // Additional data from Mapbox suggestion selection
  // Standard Style feature flag
  isStandardStyleFeature?: boolean; // True if this POI comes from Standard Style featuresets
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  coordinates: Coordinates;
  type: 'poi' | 'address' | 'route' | 'stop';
  source: 'mapbox' | 'oba' | 'custom';
  properties?: Record<string, unknown>;
}

// Map interaction event types
export interface MapClickEvent {
  lngLat: {
    lat: number;
    lng: number;
  };
  point: [number, number];
  originalEvent: MouseEvent;
}

export interface MapStyle {
  id: string;
  name: string;
  url: string;
}

export type MapCursorStyle = 'default' | 'pointer' | 'crosshair' | 'copy' | 'move';

export interface EnhancedMapState {
  isDestinationSettingMode: boolean;
  isPoiCreationMode: boolean;
  cursorStyle: MapCursorStyle;
  temporaryDestination: Coordinates | null;
} 