import type { AddressInput } from '@/utils/address-utils';

// === CORE TYPES ===
// Fundamental types used throughout the application

export type Coordinates = {
  longitude: number;
  latitude: number;
};

export type TransitMode = 'driving' | 'walking' | 'cycling' | 'transit';

export interface Place {
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
  isNativePoi?: boolean;
  properties?: Record<string, unknown>;
  // Search result specific fields
  isSearchResult?: boolean;
  searchQuery?: string;
  retrievedData?: Record<string, unknown>;
  suggestionData?: Record<string, unknown>;
  // Standard Style feature flag
  isStandardStyleFeature?: boolean;
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