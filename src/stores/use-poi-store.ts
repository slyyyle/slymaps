import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { PointOfInterest, Coordinates } from '@/types/core';
import type { POIInteractionType } from '@/hooks/map/use-poi-interaction-manager';

/**
 * Segregated POI Store
 * 
 * Separates different types of POIs to prevent lifecycle conflicts:
 * - Stored POIs: Persistent user-saved locations
 * - Search Results: Temporary POIs from search (auto-cleanup)
 * - Created POIs: User-created custom POIs (persistent)
 * - Native POIs: Never stored here (ephemeral only)
 * - Active Selection: Tracks currently selected POI across all types
 */

export interface StoredPOI extends PointOfInterest {
  id: string;
  createdAt: number;
  lastAccessed?: number;
  isFavorite?: boolean;
  tags?: string[];
}

export interface SearchResultPOI extends PointOfInterest {
  id: string;
  searchQuery: string;
  retrievedAt: number;
  mapboxId?: string;
  category?: string;
  fullAddress?: string;
}

export interface CreatedPOI extends PointOfInterest {
  id: string;
  createdAt: number;
  customType?: string;
  notes?: string;
  color?: string;
  icon?: string;
}

export interface ActivePOISelection {
  poi: PointOfInterest;
  type: POIInteractionType;
  selectedAt: number;
}

// Nearby search caching
type NearbySearchParams = { lat: number; lng: number; radius: number; category: string };
const NEARBY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
function generateNearbyCacheKey(params: NearbySearchParams): string {
  return `${params.lat.toFixed(4)},${params.lng.toFixed(4)},${params.radius},${params.category}`;
}

interface POIStoreState {
  // Segregated POI collections
  storedPOIs: Record<string, StoredPOI>;
  searchResults: Record<string, SearchResultPOI>;
  createdPOIs: Record<string, CreatedPOI>;
  // Cache of nearby search results keyed by params
  nearbyCache: Record<string, { pois: PointOfInterest[]; timestamp: number }>;
  
  // Active selection (can be from any type)
  activeSelection: ActivePOISelection | null;
  
  // Search result cleanup settings
  searchResultTTL: number; // Time to live in ms
  maxSearchResults: number;
}

interface POIStoreActions {
  // Nearby search cache
  getNearbyCache: (params: NearbySearchParams) => PointOfInterest[] | null;
  setNearbyCache: (params: NearbySearchParams, pois: PointOfInterest[]) => void;
  
  // Stored POIs (imported from various sources)
  addStoredPOI: (poi: PointOfInterest) => string;
  updateStoredPOI: (id: string, updates: Partial<StoredPOI>) => void;
  deleteStoredPOI: (id: string) => void;
  getStoredPOI: (id: string) => StoredPOI | null;
  getAllStoredPOIs: () => StoredPOI[];
  toggleFavorite: (id: string) => void;
  
  // Search results (temporary)
  addSearchResult: (poi: PointOfInterest, searchQuery: string) => string;
  clearSearchResults: () => void;
  clearExpiredSearchResults: () => void;
  getSearchResults: () => SearchResultPOI[];
  promoteSearchResultToStored: (searchResultId: string) => string | null;
  
  // Created POIs (user-created)
  addCreatedPOI: (poi: PointOfInterest, customData?: Partial<CreatedPOI>) => string;
  updateCreatedPOI: (id: string, updates: Partial<CreatedPOI>) => void;
  deleteCreatedPOI: (id: string) => void;
  getCreatedPOI: (id: string) => CreatedPOI | null;
  getAllCreatedPOIs: () => CreatedPOI[];
  
  // Active selection management
  selectPOI: (poi: PointOfInterest, type: POIInteractionType) => void;
  clearSelection: () => void;
  getActiveSelection: () => ActivePOISelection | null;
  
  // Utility methods
  getAllPOIs: () => PointOfInterest[]; // Combined view for UI components
  searchPOIsByName: (query: string) => PointOfInterest[];
  getPOIsByLocation: (center: Coordinates, radiusKm: number) => PointOfInterest[];
  
  // Cleanup and maintenance
  cleanup: () => void;
  exportData: () => { storedPOIs: StoredPOI[]; createdPOIs: CreatedPOI[] };
  importData: (data: { storedPOIs?: StoredPOI[]; createdPOIs?: CreatedPOI[] }) => void;
}

type POIStore = POIStoreState & POIStoreActions;

const generateId = () => `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const usePOIStore = create<POIStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    storedPOIs: {},
    searchResults: {},
    createdPOIs: {},
    nearbyCache: {},
    activeSelection: null,
    searchResultTTL: 30 * 60 * 1000, // 30 minutes
    maxSearchResults: 20,

    // Stored POIs
    addStoredPOI: (poi: PointOfInterest) => {
      const id = generateId();
      const storedPoi: StoredPOI = {
        ...poi,
        id,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        isFavorite: false
      };
      
      set(state => ({
        storedPOIs: { ...state.storedPOIs, [id]: storedPoi }
      }));
      
      return id;
    },

    updateStoredPOI: (id: string, updates: Partial<StoredPOI>) => {
      set(state => {
        const existing = state.storedPOIs[id];
        if (!existing) return state;
        
        return {
          storedPOIs: {
            ...state.storedPOIs,
            [id]: { ...existing, ...updates, lastAccessed: Date.now() }
          }
        };
      });
    },

    deleteStoredPOI: (id: string) => {
      set(state => {
        const { [id]: deleted, ...rest } = state.storedPOIs;
        let newActiveSelection = state.activeSelection;
        
        // Clear selection if deleted POI was active
        if (state.activeSelection?.poi.id === id) {
          newActiveSelection = null;
        }
        
        return {
          storedPOIs: rest,
          activeSelection: newActiveSelection
        };
      });
    },

    getStoredPOI: (id: string) => {
      return get().storedPOIs[id] || null;
    },

    getAllStoredPOIs: () => {
      return Object.values(get().storedPOIs);
    },

    toggleFavorite: (id: string) => {
      set(state => {
        const poi = state.storedPOIs[id];
        if (!poi) return state;
        
        return {
          storedPOIs: {
            ...state.storedPOIs,
            [id]: { ...poi, isFavorite: !poi.isFavorite }
          }
        };
      });
    },

    // Search results
    addSearchResult: (poi: PointOfInterest, searchQuery: string) => {
      const state = get();
      
      // Auto-cleanup old results if at limit
      if (Object.keys(state.searchResults).length >= state.maxSearchResults) {
        get().clearExpiredSearchResults();
      }
      
      const id = `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const searchResult: SearchResultPOI = {
        ...poi,
        id,
        searchQuery,
        retrievedAt: Date.now(),
        isSearchResult: true
      };
      
      set(state => ({
        searchResults: { ...state.searchResults, [id]: searchResult }
      }));
      
      return id;
    },

    clearSearchResults: () => {
      set(state => {
        let newActiveSelection = state.activeSelection;
        
        // Clear selection if it's a search result
        if (state.activeSelection?.type === 'search') {
          newActiveSelection = null;
        }
        
        return {
          searchResults: {},
          activeSelection: newActiveSelection
        };
      });
    },

    clearExpiredSearchResults: () => {
      const { searchResults, searchResultTTL } = get();
      const now = Date.now();
      
      const validResults = Object.fromEntries(
        Object.entries(searchResults).filter(
          ([_, result]) => now - result.retrievedAt < searchResultTTL
        )
      );
      
      set(state => {
        let newActiveSelection = state.activeSelection;
        
        // Clear selection if expired search result was active
        if (
          state.activeSelection?.type === 'search' &&
          !validResults[state.activeSelection.poi.id]
        ) {
          newActiveSelection = null;
        }
        
        return {
          searchResults: validResults,
          activeSelection: newActiveSelection
        };
      });
    },

    getSearchResults: () => {
      // 🔧 FIX: Remove auto-cleanup from getter to prevent infinite loops
      // Cleanup should be done manually or on a timer, not on every read
      return Object.values(get().searchResults);
    },

    promoteSearchResultToStored: (searchResultId: string) => {
      const { searchResults, addStoredPOI } = get();
      const searchResult = searchResults[searchResultId];
      
      if (!searchResult) return null;
      
      // Create stored POI from search result
      const storedId = addStoredPOI({
        ...searchResult,
        isSearchResult: false, // Remove search result flag
        description: searchResult.fullAddress || searchResult.description
      });
      
      // Remove from search results
      set(state => {
        const { [searchResultId]: removed, ...rest } = state.searchResults;
        return { searchResults: rest };
      });
      
      return storedId;
    },

    // Created POIs
    addCreatedPOI: (poi: PointOfInterest, customData?: Partial<CreatedPOI>) => {
      const id = generateId();
      const createdPoi: CreatedPOI = {
        ...poi,
        id,
        createdAt: Date.now(),
        ...customData
      };
      
      set(state => ({
        createdPOIs: { ...state.createdPOIs, [id]: createdPoi }
      }));
      
      return id;
    },

    updateCreatedPOI: (id: string, updates: Partial<CreatedPOI>) => {
      set(state => {
        const existing = state.createdPOIs[id];
        if (!existing) return state;
        
        return {
          createdPOIs: {
            ...state.createdPOIs,
            [id]: { ...existing, ...updates }
          }
        };
      });
    },

    deleteCreatedPOI: (id: string) => {
      set(state => {
        const { [id]: deleted, ...rest } = state.createdPOIs;
        let newActiveSelection = state.activeSelection;
        
        // Clear selection if deleted POI was active
        if (state.activeSelection?.poi.id === id) {
          newActiveSelection = null;
        }
        
        return {
          createdPOIs: rest,
          activeSelection: newActiveSelection
        };
      });
    },

    getCreatedPOI: (id: string) => {
      return get().createdPOIs[id] || null;
    },

    getAllCreatedPOIs: () => {
      return Object.values(get().createdPOIs);
    },

    // Active selection
    selectPOI: (poi: PointOfInterest, type: POIInteractionType) => {
      set({
        activeSelection: {
          poi,
          type,
          selectedAt: Date.now()
        }
      });
    },

    clearSelection: () => {
      set({ activeSelection: null });
    },

    getActiveSelection: () => {
      return get().activeSelection;
    },

    // Utility methods
    getAllPOIs: () => {
      // 🔧 FIX: Direct access to prevent triggering getters that might cause side effects
      const state = get();
      return [
        ...Object.values(state.storedPOIs),
        ...Object.values(state.searchResults), // Direct access, no getter
        ...Object.values(state.createdPOIs)
      ];
    },

    searchPOIsByName: (query: string) => {
      // 🔧 FIX: Direct access to avoid calling getAllPOIs() which might trigger side effects
      const state = get();
      const allPOIs = [
        ...Object.values(state.storedPOIs),
        ...Object.values(state.searchResults),
        ...Object.values(state.createdPOIs)
      ];
      
      const lowerQuery = query.toLowerCase();
      return allPOIs.filter(poi =>
        poi.name.toLowerCase().includes(lowerQuery) ||
        poi.description?.toLowerCase().includes(lowerQuery)
      );
    },

    getPOIsByLocation: (center: Coordinates, radiusKm: number) => {
      // 🔧 FIX: Direct access to avoid calling getAllPOIs() which might trigger side effects
      const state = get();
      const allPOIs = [
        ...Object.values(state.storedPOIs),
        ...Object.values(state.searchResults),
        ...Object.values(state.createdPOIs)
      ];
      
      return allPOIs.filter(poi => {
        const distance = calculateDistance(center, {
          latitude: poi.latitude,
          longitude: poi.longitude
        });
        return distance <= radiusKm;
      });
    },

    // Cleanup and maintenance
    cleanup: () => {
      get().clearExpiredSearchResults();
    },

    exportData: () => {
      const state = get();
      return {
        storedPOIs: Object.values(state.storedPOIs),
        createdPOIs: Object.values(state.createdPOIs)
      };
    },

    importData: (data) => {
      set(state => {
        const newStoredPOIs = { ...state.storedPOIs };
        const newCreatedPOIs = { ...state.createdPOIs };
        
        if (data.storedPOIs) {
          data.storedPOIs.forEach(poi => {
            newStoredPOIs[poi.id] = poi;
          });
        }
        
        if (data.createdPOIs) {
          data.createdPOIs.forEach(poi => {
            newCreatedPOIs[poi.id] = poi;
          });
        }
        
        return {
          storedPOIs: newStoredPOIs,
          createdPOIs: newCreatedPOIs
        };
      });
    },

    // Nearby cache getters/setters
    getNearbyCache: (params: NearbySearchParams) => {
      const key = generateNearbyCacheKey(params);
      const entry = get().nearbyCache[key];
      if (!entry || Date.now() - entry.timestamp > NEARBY_CACHE_TTL) return null;
      return entry.pois;
    },

    setNearbyCache: (params: NearbySearchParams, pois: PointOfInterest[]) => {
      set(state => {
        const cache = { ...state.nearbyCache };
        cache[generateNearbyCacheKey(params)] = { pois, timestamp: Date.now() };
        return { nearbyCache: cache };
      });
    }
  }))
);

// Helper function to calculate distance between two coordinates
function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.latitude * Math.PI / 180) *
    Math.cos(point2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
} 