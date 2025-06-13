/**
 * Search Configuration Constants - June 2025 Best Practices
 * Centralized configuration for Mapbox SearchBox and search-related functionality
 */

export const SEARCH_CONFIG = {
  MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  // Default search options for Mapbox SearchBox
  DEFAULT_OPTIONS: {
    language: 'en',
    country: 'us',
    limit: 5,
    zoom: 14,
  },
  
  // Search types by use case
  SEARCH_TYPES: {
    GENERAL: 'place,address,poi',
  },
  
  // Zoom levels by feature accuracy/type
  ZOOM_LEVELS: {
    COUNTRY: 4,
    REGION: 6,
    CITY: 10,
    NEIGHBORHOOD: 14,
    ADDRESS: 16,
    POI: 17,
    PRECISE: 18
  },
  
  // Session management configuration
  SESSION: {
    TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    MAX_SUGGESTIONS_PER_SESSION: 100,
    MAX_RETRIEVALS_PER_SESSION: 20
  },
  
  // Performance and UX settings
  PERFORMANCE: {
    DEBOUNCE_MS: 300,
    FLY_TO_DURATION_MS: 2000,
  },
  
  // Analytics and monitoring
  ANALYTICS: {
    DEBUG_MODE: process.env.NODE_ENV === 'development',
    LOG_INTERVAL: 10,
  }
} as const;

// Type exports for TypeScript
export type SearchType = keyof typeof SEARCH_CONFIG.SEARCH_TYPES;
export type ZoomLevel = keyof typeof SEARCH_CONFIG.ZOOM_LEVELS; 