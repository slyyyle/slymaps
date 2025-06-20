import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Place, Coordinates } from '@/types/core';
import type { PlaceInteractionType } from '@/hooks/map/use-poi-interaction-manager';

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

export interface StoredPlace extends Place {
  id: string;
  createdAt: number;
  lastAccessed?: number;
  isFavorite?: boolean;
  tags?: string[];
}

export interface SearchResultPlace extends Place {
  id: string;
  searchQuery: string;
  retrievedAt: number;
  mapboxId?: string;
  category?: string;
  fullAddress?: string;
}

export interface CreatedPlace extends Place {
  id: string;
  createdAt: number;
  customType?: string;
  notes?: string;
  color?: string;
  icon?: string;
}

export interface ActivePlaceSelection {
  poi: Place;
  type: PlaceInteractionType;
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
  storedPOIs: Record<string, StoredPlace>;
  searchResults: Record<string, SearchResultPlace>;
  createdPOIs: Record<string, CreatedPlace>;
  // Cache of nearby search results keyed by params
  nearbyCache: Record<string, { pois: Place[]; timestamp: number }>;
  
  // Active selection (can be from any type)
  activeSelection: ActivePlaceSelection | null;
  
  // Search result cleanup settings
  searchResultTTL: number; // Time to live in ms
  maxSearchResults: number;
}

interface POIStoreActions {
  // Nearby search cache
  getNearbyCache: (params: NearbySearchParams) => Place[] | null;
  setNearbyCache: (params: NearbySearchParams, pois: Place[]) => void;
  
  // Stored POIs (imported from various sources)
  addStoredPlace: (poi: Place) => string;
  updateStoredPlace: (id: string, updates: Partial<StoredPlace>) => void;
  deleteStoredPlace: (id: string) => void;
  getStoredPlace: (id: string) => StoredPlace | null;
  getAllStoredPlaces: () => StoredPlace[];
  toggleFavorite: (id: string) => void;
  
  // Search results (temporary)
  addSearchResult: (poi: Place, searchQuery: string) => string;
  clearSearchResults: () => void;
  deleteSearchResult: (id: string) => void;
  clearExpiredSearchResults: () => void;
  getSearchResults: () => SearchResultPlace[];
  promoteSearchResultToStored: (searchResultId: string) => string | null;
  
  // Created places (user-created)
  addCreatedPlace: (poi: Place, customData?: Partial<CreatedPlace>) => string;
  updateCreatedPlace: (id: string, updates: Partial<CreatedPlace>) => void;
  deleteCreatedPlace: (id: string) => void;
  getCreatedPlace: (id: string) => CreatedPlace | null;
  getAllCreatedPlaces: () => CreatedPlace[];
  
  // Active selection management
  selectPOI: (poi: Place, type: PlaceInteractionType) => void;
  clearSelection: () => void;
  getActiveSelection: () => ActivePlaceSelection | null;
  
  // Utility methods
  getAllPOIs: () => Place[]; // Combined view for UI components
  searchPOIsByName: (query: string) => Place[];
  getPOIsByLocation: (center: Coordinates, radiusKm: number) => Place[];
  
  // Cleanup and maintenance
  cleanup: () => void;
  exportData: () => { storedPOIs: StoredPlace[]; createdPOIs: CreatedPlace[] };
  importData: (data: { storedPOIs?: StoredPlace[]; createdPOIs?: CreatedPlace[] }) => void;
}

type POIStore = POIStoreState & POIStoreActions;

const generateId = () => `poi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const usePlaceStore = create<POIStore>()(
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
    addStoredPlace: (poi: Place) => {
      const id = generateId();
      const storedPoi: StoredPlace = {
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

    updateStoredPlace: (id: string, updates: Partial<StoredPlace>) => {
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

    deleteStoredPlace: (id: string) => {
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

    getStoredPlace: (id: string) => {
      return get().storedPOIs[id] || null;
    },

    getAllStoredPlaces: () => {
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
    addSearchResult: (poi: Place, searchQuery: string) => {
      const state = get();
      
      // Auto-cleanup old results if at limit
      if (Object.keys(state.searchResults).length >= state.maxSearchResults) {
        get().clearExpiredSearchResults();
      }
      
      const id = `search_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const searchResult: SearchResultPlace = {
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

    deleteSearchResult: (id: string) => {
      set(state => {
        const { [id]: removed, ...rest } = state.searchResults;
        let newActiveSelection = state.activeSelection;
        if (state.activeSelection?.type === 'search' && state.activeSelection.poi.id === id) {
          newActiveSelection = null;
        }
        return { searchResults: rest, activeSelection: newActiveSelection };
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
      const { searchResults, addStoredPlace } = get();
      const searchResult = searchResults[searchResultId];
      
      if (!searchResult) return null;
      
      // Create stored POI from search result
      const storedId = addStoredPlace({
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

    // Created places (user-created)
    addCreatedPlace: (poi: Place, customData?: Partial<CreatedPlace>) => {
      const id = generateId();
      const createdPoi: CreatedPlace = {
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

    updateCreatedPlace: (id: string, updates: Partial<CreatedPlace>) => {
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

    deleteCreatedPlace: (id: string) => {
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

    getCreatedPlace: (id: string) => {
      return get().createdPOIs[id] || null;
    },

    getAllCreatedPlaces: () => {
      return Object.values(get().createdPOIs);
    },

    // Active selection
    selectPOI: (poi: Place, type: PlaceInteractionType) => {
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
      return allPOIs.filter(poi => {
        const nameMatch = poi.name.toLowerCase().includes(lowerQuery);
        const desc = poi.description;
        const descMatch = typeof desc === 'string' && desc.toLowerCase().includes(lowerQuery);
        return nameMatch || descMatch;
      });
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
        const newStoredPlaces = { ...state.storedPOIs };
        const newCreatedPlaces = { ...state.createdPOIs };
        
        if (data.storedPOIs) {
          data.storedPOIs.forEach(poi => {
            newStoredPlaces[poi.id] = poi;
          });
        }
        
        if (data.createdPOIs) {
          data.createdPOIs.forEach(poi => {
            newCreatedPlaces[poi.id] = poi;
          });
        }
        
        return {
          storedPOIs: newStoredPlaces,
          createdPOIs: newCreatedPlaces
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

    setNearbyCache: (params: NearbySearchParams, pois: Place[]) => {
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