import type { Place } from '../core';
import type { MapboxFeature } from '../mapbox';
import type { ObaRouteSearchResult } from '../transit/oba';

// === API & UTILITY TYPES ===
// Types for API responses, search results, and utility functions

// Search results container for the Zustand store
export interface SearchResults {
  mapboxFeatures: MapboxFeature[];
  pois: Place[];
  routes: ObaRouteSearchResult[];
}

// === UTILITY TYPES ===
// Helpful utility types for the modern architecture

export type LoadingState = Record<string, boolean>;
export type ErrorState = Record<string, string | null>;

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
} 