import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import type { Coordinates, PointOfInterest, TransitMode } from '@/types/core';
import type { 
  CurrentOBARouteDisplayData,
  ObaRoute,
  ObaRouteGeometry,
  ObaVehicleLocation,
  ObaArrivalDeparture
} from '@/types/oba';
import type { Route as RouteType } from '@/types/directions';
import type { SearchResults } from '@/types/api';

// Core data entities
export interface POIEntity extends PointOfInterest {
  lastAccessed?: number;
  searchHistory?: string[];
  favorites?: boolean;
  cachedArrivals?: ObaArrivalDeparture[];
  arrivalsLastFetched?: number;
}

export interface RouteEntity {
  id: string;
  obaRoute?: ObaRoute;
  mapboxRoute?: RouteType;
  geometry?: ObaRouteGeometry;
  vehicles?: ObaVehicleLocation[];
  stops?: POIEntity[];
  lastAccessed?: number;
  displayData?: CurrentOBARouteDisplayData;
  isActive?: boolean;
}

export interface SearchEntity {
  id: string;
  query: string;
  results: SearchResults;
  timestamp: number;
  location?: Coordinates;
}

// Data relationships - simplified
export interface DataRelationships {
  // POI to Routes mapping
  poiRoutes: Record<string, string[]>; // POI ID -> Route IDs
  // Route to POIs mapping  
  routePOIs: Record<string, string[]>; // Route ID -> POI IDs
}

// Store state interface
export interface DataStoreState {
  // Core data collections
  pois: Record<string, POIEntity>;
  routes: Record<string, RouteEntity>;
  searches: Record<string, SearchEntity>;
  relationships: DataRelationships;
  
  // App-wide configuration
  config: {
    mapboxAccessToken: string | null;
  };

  // User's location state - simplified
  location: {
    currentLocation: Coordinates | null;
    locationMode: 'gps' | 'manual' | 'none';
    isLoadingLocation: boolean;
    locationError: { code: number; message: string } | null;
    // POI creation state
    isCreatingPOI: boolean;
    poiCreationHandler: ((coords: Coordinates) => void) | null;
  };

  // Current active selections
  activePOI: string | null;
  activeRoute: string | null;
  activeSearch: string | null;
  
  // Navigation state
  mapInteractionDestination: Coordinates | null; // For map clicks -> directions form
  routeStart: Coordinates | null;
  routeEnd: Coordinates | null;

  // Directions-specific state
  directions: {
    start: Coordinates | null;
    destination: Coordinates | null;
    mode: TransitMode | null;
    route: RouteType | null; // The calculated Mapbox route
    isLoading: boolean;
    // whether to show turn markers on the map
    showTurnMarkers: boolean;
  };
  
  // Loading states
  loading: {
    pois: Set<string>;
    routes: Set<string>;
    arrivals: Set<string>;
    vehicles: Set<string>;
  };
  
  // Cache management
  cache: {
    maxAge: number;
    maxEntries: number;
    lastCleanup: number;
  };

  // Home management
  homePOI: POIEntity | null;
}

// Store actions interface
export interface DataStoreActions {
  // Home management
  setHomePOI: (poi: PointOfInterest) => void;
  clearHomePOI: () => void;
  // POI management
  addPOI: (poi: PointOfInterest) => string;
  updatePOI: (id: string, updates: Partial<POIEntity>) => void;
  deletePOI: (id: string) => void;
  getPOI: (id: string) => POIEntity | null;
  setPOIs: (pois: PointOfInterest[]) => void;
  selectPOI: (id: string | null) => void;
  favoritePOI: (id: string, favorite: boolean) => void;
  
  // Route management
  addRoute: (route: Partial<RouteEntity>) => string;
  updateRoute: (id: string, updates: Partial<RouteEntity>) => void;
  deleteRoute: (id: string) => void;
  getRoute: (id: string) => RouteEntity | null;
  selectRoute: (id: string | null) => void;
  clearAllRoutes: () => void;
  
  // Search management
  addSearch: (query: string, results: SearchResults, location?: Coordinates) => string;
  getSearch: (id: string) => SearchEntity | null;
  getRecentSearches: (limit?: number) => SearchEntity[];
  clearSearchHistory: () => void;
  
  // App Config
  setMapboxAccessToken: (token: string) => void;

  // Location
  setCurrentLocation: (location: Coordinates | null) => void;
  setLocationMode: (mode: 'gps' | 'manual' | 'none') => void;
  setLocationLoading: (loading: boolean) => void;
  setLocationError: (error: { code: number; message: string } | null) => void;

  // POI Creation
  startPOICreation: () => void;
  cancelPOICreation: () => void;
  setPOICreationHandler: (handler: ((coords: Coordinates) => void) | null) => void;
  createPOIAtLocation: (coords: Coordinates, type?: string, name?: string) => string;

  // Navigation
  setMapInteractionDestination: (coords: Coordinates | null) => void;
  setRouteCoordinates: (start: Coordinates | null, end: Coordinates | null) => void;
  
  // Directions
  getDirections: (start: Coordinates, end: Coordinates, mode: TransitMode) => Promise<void>;
  setDirectionsDestination: (coords: Coordinates | null) => void;
  clearDirections: () => void;
  toggleTurnMarkers: () => void;
  
  // Loading state management
  setLoading: (type: keyof DataStoreState['loading'], id: string, loading: boolean) => void;
  isLoading: (type: keyof DataStoreState['loading'], id?: string) => boolean;
  
  // Relationship management
  linkPOIToRoute: (poiId: string, routeId: string) => void;
  unlinkPOIFromRoute: (poiId: string, routeId: string) => void;
  getPOIsForRoute: (routeId: string) => POIEntity[];
  getRoutesForPOI: (poiId: string) => RouteEntity[];
  
  // Cache and lifecycle
  cleanupExpiredData: () => void;
  getDataStats: () => {
    poisCount: number;
    routesCount: number;
    searchesCount: number;
    cacheSize: number;
  };
  
  // Bulk operations
  importData: (data: Partial<DataStoreState>) => void;
  exportData: () => DataStoreState;
  resetStore: () => void;
}

// Initial state
const initialState: DataStoreState = {
  pois: {},
  routes: {},
  searches: {},
  relationships: {
    poiRoutes: {},
    routePOIs: {},
  },
  config: {
    mapboxAccessToken: null,
  },
  location: {
    currentLocation: null,
    locationMode: 'manual',
    isLoadingLocation: false,
    locationError: null,
    isCreatingPOI: false,
    poiCreationHandler: null,
  },
  activePOI: null,
  activeRoute: null,
  activeSearch: null,
  homePOI: null,
  mapInteractionDestination: null,
  routeStart: null,
  routeEnd: null,
  directions: {
    start: null,
    destination: null,
    mode: null,
    route: null,
    isLoading: false,
    showTurnMarkers: false,
  },
  loading: {
    pois: new Set(),
    routes: new Set(),
    arrivals: new Set(),
    vehicles: new Set(),
  },
  cache: {
    maxAge: 1000 * 60 * 30, // 30 minutes
    maxEntries: 1000,
    lastCleanup: Date.now(),
  },
};

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const isExpired = (timestamp: number, maxAge: number) => Date.now() - timestamp > maxAge;

// Create the store
export const useDataStore = create<DataStoreState & DataStoreActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Home management
        setHomePOI: (poi: PointOfInterest) => {
          const id = poi.id || generateId();
          const homeEntity: POIEntity = {
            ...poi,
            id,
            lastAccessed: Date.now(),
            searchHistory: [],
            favorites: false,
          };
          set({ homePOI: homeEntity });
        },
        clearHomePOI: () => set({ homePOI: null }),
        
        // POI management
        addPOI: (poi: PointOfInterest) => {
          const id = poi.id || generateId();
          const poiEntity: POIEntity = {
            ...poi,
            id,
            lastAccessed: Date.now(),
            searchHistory: [],
            favorites: false,
          };
          
          set((state) => ({
            pois: { ...state.pois, [id]: poiEntity },
          }));
          
          return id;
        },
        
        updatePOI: (id: string, updates: Partial<POIEntity>) => {
          set((state) => ({
            pois: {
              ...state.pois,
              [id]: state.pois[id] ? { ...state.pois[id], ...updates, lastAccessed: Date.now() } : state.pois[id],
            },
          }));
        },
        
        deletePOI: (id: string) => {
          set((state) => {
            const newPOIs = { ...state.pois };
            delete newPOIs[id];
            
            // Clean up relationships
            const newRelationships = { ...state.relationships };
            delete newRelationships.poiRoutes[id];
            
            // Remove from route relationships
            Object.keys(newRelationships.routePOIs).forEach(routeId => {
              newRelationships.routePOIs[routeId] = newRelationships.routePOIs[routeId].filter(poiId => poiId !== id);
            });
            
            return {
              pois: newPOIs,
              relationships: newRelationships,
              activePOI: state.activePOI === id ? null : state.activePOI,
            };
          });
        },
        
        getPOI: (id: string) => {
          const state = get();
          return state.pois[id] || null;
        },
        
        setPOIs: (pois: PointOfInterest[]) => {
          const poisMap: Record<string, POIEntity> = {};
          pois.forEach(poi => {
            const id = poi.id || generateId();
            poisMap[id] = {
              ...poi,
              id,
              lastAccessed: Date.now(),
              searchHistory: [],
              favorites: false,
            };
          });
          
          set((state) => ({
            pois: { ...state.pois, ...poisMap },
          }));
        },
        
        selectPOI: (id: string | null) => {
          set({ activePOI: id });
          if (id) {
            get().updatePOI(id, { lastAccessed: Date.now() });
          }
        },
        
        favoritePOI: (id: string, favorite: boolean) => {
          get().updatePOI(id, { favorites: favorite });
        },
        
        // Route management
        addRoute: (route: Partial<RouteEntity>) => {
          const id = route.id || generateId();
          const routeEntity: RouteEntity = {
            id,
            lastAccessed: Date.now(),
            isActive: false,
            ...route,
          };
          
          set((state) => ({
            routes: { ...state.routes, [id]: routeEntity },
          }));
          
          return id;
        },
        
        updateRoute: (id: string, updates: Partial<RouteEntity>) => {
          set((state) => ({
            routes: {
              ...state.routes,
              [id]: state.routes[id] ? { ...state.routes[id], ...updates, lastAccessed: Date.now() } : state.routes[id],
            },
          }));
        },
        
        deleteRoute: (id: string) => {
          set((state) => {
            const newRoutes = { ...state.routes };
            delete newRoutes[id];
            
            // Clean up relationships
            const newRelationships = { ...state.relationships };
            delete newRelationships.routePOIs[id];
            
            // Remove from POI relationships
            Object.keys(newRelationships.poiRoutes).forEach(poiId => {
              newRelationships.poiRoutes[poiId] = newRelationships.poiRoutes[poiId].filter(routeId => routeId !== id);
            });
            
            return {
              routes: newRoutes,
              relationships: newRelationships,
              activeRoute: state.activeRoute === id ? null : state.activeRoute,
            };
          });
        },
        
        getRoute: (id: string) => {
          const state = get();
          return state.routes[id] || null;
        },
        
        selectRoute: (id: string | null) => {
          set((state) => {
            // Deactivate previous route
            if (state.activeRoute && state.routes[state.activeRoute]) {
              state.routes[state.activeRoute].isActive = false;
            }
            // Activate new route
            if (id && state.routes[id]) {
              state.routes[id].isActive = true;
            }
            return { activeRoute: id };
          });
        },
        
        clearAllRoutes: () => {
          set((state) => ({
            routes: {},
            activeRoute: null,
            relationships: {
              ...state.relationships,
              routePOIs: {},
            },
          }));
        },
        
        // Search management
        addSearch: (query: string, results: SearchResults, location?: Coordinates) => {
          const id = generateId();
          const searchEntity: SearchEntity = {
            id,
            query,
            results: results,
            timestamp: Date.now(),
            location,
          };
          
          set((state) => ({
            searches: { ...state.searches, [id]: searchEntity },
            activeSearch: id,
          }));
          
          return id;
        },
        
        getSearch: (id: string) => {
          const state = get();
          return state.searches[id] || null;
        },
        
        getRecentSearches: (limit = 10) => {
          const state = get();
          return Object.values(state.searches)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
        },
        
        clearSearchHistory: () => {
          set({ searches: {} });
        },
        
        // App Config
        setMapboxAccessToken: (token: string) => {
          set(state => ({ config: { ...state.config, mapboxAccessToken: token } }));
        },

        // Location
        setCurrentLocation: (location: Coordinates | null) => {
          set(state => ({ 
            location: { 
              ...state.location, 
              currentLocation: location 
            } 
          }));
        },

        setLocationMode: (mode: 'gps' | 'manual' | 'none') => {
          set(state => ({
            location: { ...state.location, locationMode: mode }
          }));
        },

        setLocationLoading: (loading: boolean) => {
          set(state => ({
            location: { ...state.location, isLoadingLocation: loading }
          }));
        },

        setLocationError: (error: { code: number; message: string } | null) => {
          set(state => ({
            location: { ...state.location, locationError: error }
          }));
        },

        // POI Creation
        startPOICreation: () => {
          const store = get();
          
          // Create the POI creation handler that will be used by the map
          const poiCreationHandler = (coords: Coordinates) => {
            store.createPOIAtLocation(coords);
          };
          
          set(state => ({
            location: {
              ...state.location,
              isCreatingPOI: true,
              poiCreationHandler: poiCreationHandler
            }
          }));
        },

        cancelPOICreation: () => {
          set(state => ({
            location: {
              ...state.location,
              isCreatingPOI: false,
              poiCreationHandler: null
            }
          }));
        },

        setPOICreationHandler: (handler: ((coords: Coordinates) => void) | null) => {
          set(state => ({
            location: {
              ...state.location,
              poiCreationHandler: handler
            }
          }));
        },

        createPOIAtLocation: (coords: Coordinates, type?: string, name?: string) => {
          const id = generateId();
          const poiEntity: POIEntity = {
            id,
            lastAccessed: Date.now(),
            searchHistory: [],
            favorites: false,
            type: type || 'custom',
            name: name || 'Custom Location',
            longitude: coords.longitude,
            latitude: coords.latitude,
          };
          
          set((state) => ({
            pois: { ...state.pois, [id]: poiEntity },
            activePOI: id,
            location: {
              ...state.location,
              isCreatingPOI: false,
              poiCreationHandler: null
            }
          }));
          
          return id;
        },

        // Navigation
        setMapInteractionDestination: (coords: Coordinates | null) => {
          set({ mapInteractionDestination: coords });
        },
        setRouteCoordinates: (start: Coordinates | null, end: Coordinates | null) => {
          set({ routeStart: start, routeEnd: end });
        },

        // Directions
        setDirectionsDestination: (coords: Coordinates | null) => {
          set(state => ({ directions: { ...state.directions, destination: coords } }));
        },

        getDirections: async (start: Coordinates, end: Coordinates, mode: TransitMode) => {
          // Import the proper service layer implementation
          const { getDirections: getDirectionsService } = await import('@/services/mapbox');
          
          set(state => ({ directions: { ...state.directions, isLoading: true, start, destination: end, mode } }));

          try {
            const route = await getDirectionsService(start, end, mode);
            
            if (route) {
              set(state => ({ directions: { ...state.directions, route, isLoading: false } }));
            } else {
              throw new Error('No routes found');
            }
          } catch (error) {
            console.error("Error fetching directions:", error);
            set(state => ({ directions: { ...state.directions, isLoading: false, route: null } }));
          }
        },
        
        // Clear all directions (reset to initial state)
        clearDirections: () => {
          set(() => ({
            directions: { start: null, destination: null, mode: null, route: null, isLoading: false, showTurnMarkers: false }
          }));
        },
        
        // Toggle showing turn markers alongside the route
        toggleTurnMarkers: () => {
          set(state => ({ directions: { ...state.directions, showTurnMarkers: !state.directions.showTurnMarkers } }));
        },
        
        // Loading state management
        setLoading: (type: keyof DataStoreState['loading'], id: string, loading: boolean) => {
          set((state) => {
            const newLoadingSet = new Set(state.loading[type]);
            if (loading) {
              newLoadingSet.add(id);
            } else {
              newLoadingSet.delete(id);
            }
            return {
              loading: { ...state.loading, [type]: newLoadingSet },
            };
          });
        },
        
        isLoading: (type: keyof DataStoreState['loading'], id?: string) => {
          const state = get();
          if (id) {
            return state.loading[type].has(id);
          }
          return state.loading[type].size > 0;
        },
        
        // Relationship management
        linkPOIToRoute: (poiId: string, routeId: string) => {
          set((state) => {
            const newRelationships = { ...state.relationships };
            
            // Add to poiRoutes
            if (!newRelationships.poiRoutes[poiId]) {
              newRelationships.poiRoutes[poiId] = [];
            }
            if (!newRelationships.poiRoutes[poiId].includes(routeId)) {
              newRelationships.poiRoutes[poiId].push(routeId);
            }
            
            // Add to routePOIs
            if (!newRelationships.routePOIs[routeId]) {
              newRelationships.routePOIs[routeId] = [];
            }
            if (!newRelationships.routePOIs[routeId].includes(poiId)) {
              newRelationships.routePOIs[routeId].push(poiId);
            }
            
            return { relationships: newRelationships };
          });
        },
        
        unlinkPOIFromRoute: (poiId: string, routeId: string) => {
          set((state) => {
            const newRelationships = { ...state.relationships };
            
            // Remove from poiRoutes
            if (newRelationships.poiRoutes[poiId]) {
              newRelationships.poiRoutes[poiId] = newRelationships.poiRoutes[poiId].filter(id => id !== routeId);
            }
            
            // Remove from routePOIs
            if (newRelationships.routePOIs[routeId]) {
              newRelationships.routePOIs[routeId] = newRelationships.routePOIs[routeId].filter(id => id !== poiId);
            }
            
            return { relationships: newRelationships };
          });
        },
        
        getPOIsForRoute: (routeId: string) => {
          const state = get();
          const poiIds = state.relationships.routePOIs[routeId] || [];
          return poiIds.map(id => state.pois[id]).filter(Boolean);
        },
        
        getRoutesForPOI: (poiId: string) => {
          const state = get();
          const routeIds = state.relationships.poiRoutes[poiId] || [];
          return routeIds.map(id => state.routes[id]).filter(Boolean);
        },
        
        // Cache and lifecycle
        cleanupExpiredData: () => {
          const now = Date.now();
          set((state) => {
            const { maxAge } = state.cache;
            
            // Clean up expired searches
            const newSearches = Object.fromEntries(
              Object.entries(state.searches).filter(([_, search]) => !isExpired(search.timestamp, maxAge))
            );
            
            // Clean up old POI arrival cache
            const newPOIs = Object.fromEntries(
              Object.entries(state.pois).map(([id, poi]) => [
                id,
                {
                  ...poi,
                  cachedArrivals: poi.arrivalsLastFetched && isExpired(poi.arrivalsLastFetched, maxAge) 
                    ? undefined 
                    : poi.cachedArrivals,
                  arrivalsLastFetched: poi.arrivalsLastFetched && isExpired(poi.arrivalsLastFetched, maxAge) 
                    ? undefined 
                    : poi.arrivalsLastFetched,
                }
              ])
            );
            
            return {
              searches: newSearches,
              pois: newPOIs,
              cache: { ...state.cache, lastCleanup: now },
            };
          });
        },
        
        getDataStats: () => {
          const state = get();
          return {
            poisCount: Object.keys(state.pois).length,
            routesCount: Object.keys(state.routes).length,
            searchesCount: Object.keys(state.searches).length,
            cacheSize: JSON.stringify(state).length,
          };
        },
        
        // Bulk operations
        importData: (data: Partial<DataStoreState>) => {
          set((state) => ({ ...state, ...data }));
        },
        
        exportData: () => {
          return get();
        },
        
        resetStore: () => {
          set(initialState);
        },
      }),
      {
        name: 'slymaps-data-store',
        partialize: (state) => ({
          pois: state.pois,
          routes: state.routes,
          searches: state.searches,
          relationships: state.relationships,
          cache: state.cache,
        }),
      }
    )
  )
);

// Automatic cleanup - run every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const store = useDataStore.getState();
    const timeSinceLastCleanup = Date.now() - store.cache.lastCleanup;
    if (timeSinceLastCleanup > 5 * 60 * 1000) { // 5 minutes
      store.cleanupExpiredData();
    }
  }, 5 * 60 * 1000);
}

// Selectors for optimized reads
export const dataStoreSelectors = {
  activePOI: (state: DataStoreState) => state.activePOI ? state.pois[state.activePOI] : null,
  activeRoute: (state: DataStoreState) => state.activeRoute ? state.routes[state.activeRoute] : null,
  allPOIs: (state: DataStoreState) => Object.values(state.pois),
  favoritePOIs: (state: DataStoreState) => 
    Object.values(state.pois).filter(poi => poi.favorites),
  activeRoutes: (state: DataStoreState) => 
    Object.values(state.routes).filter(route => route.isActive),
  isDataLoading: (state: DataStoreState) => 
    state.loading.pois.size > 0 || 
    state.loading.routes.size > 0 ||
    state.loading.arrivals.size > 0 ||
    state.loading.vehicles.size > 0,
};