/**
 * Search Utility Functions - June 2025 Best Practices
 * Helper functions for search functionality and result processing
 */

import { SEARCH_CONFIG } from '@/constants/search-config';
import type { MapboxSuggestion } from '@/types/mapbox';
import type { UnifiedSearchSuggestion } from '@/types/oba';

/**
 * Determine optimal zoom level based on Mapbox accuracy metadata
 */
export function determineOptimalZoom(accuracy?: string): number {
  switch (accuracy) {
    case 'rooftop':
    case 'parcel':
      return SEARCH_CONFIG.ZOOM_LEVELS.PRECISE;
    case 'point':
      return SEARCH_CONFIG.ZOOM_LEVELS.POI;
    case 'interpolated':
      return SEARCH_CONFIG.ZOOM_LEVELS.ADDRESS;
    case 'street':
      return SEARCH_CONFIG.ZOOM_LEVELS.NEIGHBORHOOD;
    default:
      return SEARCH_CONFIG.ZOOM_LEVELS.ADDRESS; // Default
  }
}

/**
 * Generate a UUIDv4 session token as recommended by Mapbox
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Format search result for display
 */
export function formatSearchResult(feature: any): string {
  const name = feature.properties?.name || feature.place_name;
  const category = feature.properties?.category;
  
  if (category && category !== name) {
    return `${name} (${category})`;
  }
  
  return name;
}

/**
 * Extract address components from Mapbox feature context
 */
export function extractAddressComponents(feature: any) {
  const context = feature.context || [];
  
  return {
    full: feature.place_name,
    street: feature.properties?.address,
    city: context.find((c: any) => c.id.startsWith('place'))?.text,
    region: context.find((c: any) => c.id.startsWith('region'))?.text,
    country: context.find((c: any) => c.id.startsWith('country'))?.text,
    postcode: context.find((c: any) => c.id.startsWith('postcode'))?.text
  };
}

/**
 * Check if a search session has exceeded limits
 */
export function isSessionLimitExceeded(
  suggestionsCount: number, 
  retrievalsCount: number
): boolean {
  return suggestionsCount > SEARCH_CONFIG.SESSION.MAX_SUGGESTIONS_PER_SESSION ||
         retrievalsCount > SEARCH_CONFIG.SESSION.MAX_RETRIEVALS_PER_SESSION;
}

/**
 * Check if a search session has timed out
 */
export function isSessionExpired(sessionStartTime: number): boolean {
  return Date.now() - sessionStartTime > SEARCH_CONFIG.SESSION.TIMEOUT_MS;
}

/**
 * Create enhanced search result metadata
 */
export function createSearchMetadata(feature: any, sessionToken: string) {
  return {
    accuracy: feature.properties?.accuracy,
    relevance: feature.relevance,
    maki: feature.properties?.maki, // Icon identifier
    wikidata: feature.properties?.wikidata,
    short_code: feature.properties?.short_code,
    sessionToken: sessionToken,
    retrievedAt: new Date().toISOString(),
    source: 'mapbox_search'
  };
}

/**
 * Validate search configuration
 */
export function validateSearchConfig(options: Record<string, any>): boolean {
  const required = ['language', 'country', 'limit'];
  return required.every(key => key in options);
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = SEARCH_CONFIG.PERFORMANCE.DEBOUNCE_MS
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Converts Mapbox suggestions to the unified search suggestion format
 * for display in the unified suggestions dropdown
 */
export function convertMapboxSuggestionsToUnified(suggestions: MapboxSuggestion[]): UnifiedSearchSuggestion[] {
  return suggestions.map((suggestion) => ({
    type: 'place' as const,
    id: suggestion.mapbox_id,
    title: suggestion.name,
    subtitle: suggestion.place_formatted || suggestion.full_address,
    data: suggestion as unknown as Record<string, unknown>, // Safe cast for the union type
  }));
} 