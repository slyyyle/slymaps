// === MAPBOX TYPES ===
// Types related to Mapbox services and APIs

// 2025 Mapbox Search Box API types - Suggest endpoint
export interface MapboxSuggestion {
  name: string;
  name_preferred?: string;
  mapbox_id: string;
  feature_type: string;
  address?: string;
  full_address?: string;
  place_formatted: string;
  context: {
    country?: {
      id?: string;
      name: string;
      country_code: string;
      country_code_alpha_3: string;
    };
    region?: {
      id?: string;
      name: string;
      region_code: string;
      region_code_full: string;
    };
    postcode?: {
      id?: string;
      name: string;
    };
    district?: {
      id?: string;
      name: string;
    };
    place?: {
      id?: string;
      name: string;
    };
    locality?: {
      id?: string;
      name: string;
    };
    neighborhood?: {
      id?: string;
      name: string;
    };
    address?: {
      id?: string;
      name: string;
      address_number?: string;
      street_name?: string;
    };
    street?: {
      id?: string;
      name: string;
    };
  };
  language: string;
  maki?: string;
  poi_category?: string[];
  poi_category_ids?: string[];
  brand?: string[];
  brand_id?: string[];
  external_ids?: Record<string, string>;
  metadata?: Record<string, unknown>;
  distance?: number;
  eta?: number;
  added_distance?: number;
  added_time?: number;
}

export interface MapboxSuggestResponse {
  suggestions: MapboxSuggestion[];
  attribution: string;
}

// 2025 Mapbox Search Box API types - Retrieve endpoint
export interface MapboxRetrieveFeature {
  type: "Feature";
  geometry: {
    coordinates: [number, number];
    type: "Point";
  };
  properties: {
    name: string;
    name_preferred?: string;
    mapbox_id: string;
    feature_type: string;
    address?: string;
    full_address?: string;
    place_formatted?: string;
    context: MapboxSuggestion['context'];
    coordinates: {
      latitude: number;
      longitude: number;
      accuracy?: string;
      routable_points?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        note?: string;
      }>;
    };
    bbox?: [number, number, number, number];
    language?: string;
    maki?: string;
    poi_category?: string[];
    poi_category_ids?: string[];
    brand?: string[];
    brand_id?: string[];
    external_ids?: Record<string, string>;
    metadata?: Record<string, unknown>;
  };
}

export interface MapboxRetrieveResponse {
  type: "FeatureCollection";
  features: MapboxRetrieveFeature[];
  attribution: string;
}

// Legacy types for backward compatibility
export interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: {
    mapbox_id?: string;
    name?: string;
    category?: string;
    address?: string;
    maki?: string;
    wikidata?: string;
    short_code?: string;
  };
  text: string;
  place_name: string;
  center: [number, number];
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  context?: Array<{ id: string; text: string }>;
}

export interface MapboxSearchResponse {
  type: string;
  query: string[];
  suggestions: MapboxFeature[];
  attribution: string;
}

// Mapbox Geocoding API types (kept for backward compatibility)
export interface MapboxGeocodingResponse {
  type: string;
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export interface MapboxFeatureProperties {
  name?: string;
  class?: string;
  category?: string;
  [key: string]: unknown;
}

export interface MapboxInteractionFeature {
  id: string | number;
  properties: MapboxFeatureProperties;
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
  };
}

export interface MapboxInteractionEvent {
  feature: MapboxInteractionFeature;
  point: [number, number];
  lngLat: {
    lat: number;
    lng: number;
  };
}

export type MapboxInteractionHandler = (event: MapboxInteractionEvent) => boolean | void;

export interface MapboxInteractionConfig {
  type: 'click' | 'mouseenter' | 'mouseleave';
  target: { featuresetId: string; importId: string };
  handler: MapboxInteractionHandler;
} 