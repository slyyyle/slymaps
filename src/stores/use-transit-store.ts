import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Coordinates } from '@/types/core';
import type { 
  ObaRoute, 
  ObaRouteGeometry, 
  ObaVehicleLocation,
  ObaStopSearchResult,
  ObaScheduleEntry
} from '@/types/transit/oba';
import type { Route as MapboxRoute } from '@/types/transit/directions';
import type { Place } from '@/types/core';

export interface RouteEntity {
  id: string;
  createdAt: number;
  isFavorite?: boolean;
  lastAccessed?: number;
  isRecentSearch?: boolean; // Flag to indicate this is from a recent search
  
  // OBA Data
  obaRoute?: ObaRoute;
  // individual route segments for OBA shapes
  segments?: ObaRouteGeometry[];
  // branch variants (headsign branches)
  branches?: Array<{ branchIdx: number; name: string; segments: ObaRouteGeometry[]; stops: Place[] }>;
  // stops per segment for OBA shapes
  stopsBySegment?: Place[][];
  // fallback single geometry (first segment)
  geometry?: ObaRouteGeometry;
  vehicles?: ObaVehicleLocation[];
  // currently selected segment index
  selectedSegmentIndex?: number;
  stops?: Place[];  // legacy flattened list
  // schedule entries for this route
  schedule?: ObaScheduleEntry[];
  
  // Mapbox Data  
  mapboxRoute?: MapboxRoute;
  
  // State
  isActive?: boolean;
  isLoading?: boolean;
}

interface TransitStoreState {
  // Route collections
  routes: Record<string, RouteEntity>;
  
  // Active route
  activeRouteId: string | null;
  
  // Navigation state
  routeStart: Coordinates | null;
  routeEnd: Coordinates | null;
  // Currently active stop for stepping-stone jumps
  activeStopId: string | null;
  // Currently hovered stop in sidebar
  hoveredStopId: string | null;
  // Currently hovered vehicle (for map marker scaling)
  hoveredVehicleId: string | null;
  // Currently selected vehicle for unified vehicle-centric popups
  selectedVehicleId: string | null;
  // Selected alternative index for non-transit Mapbox routes
  selectedAlternativeIndex?: number;
}

interface TransitStoreActions {
  // Route management
  addRoute: (route: Partial<RouteEntity>) => string;
  updateRoute: (id: string, updates: Partial<RouteEntity>) => void;
  deleteRoute: (id: string) => void;
  getRoute: (id: string) => RouteEntity | null;
  getAllRoutes: () => RouteEntity[];
  
  // Active route
  selectRoute: (id: string | null) => void;
  getActiveRoute: () => RouteEntity | null;
  
  // Navigation
  setRouteCoordinates: (start: Coordinates | null, end: Coordinates | null) => void;
  getRouteCoordinates: () => { start: Coordinates | null; end: Coordinates | null };
  setSelectedAlternativeIndex: (index: number) => void;
  // Active stop setter for stepping-stone jumps
  setActiveStop: (stopId: string | null) => void;
  // Hovered stop setter for sidebar hover
  setHoveredStop: (stopId: string | null) => void;
  // Hovered vehicle setter for map marker hover
  setHoveredVehicle: (vehicleId: string | null) => void;
  // Active stop getter for stepping-stone jumps
  getActiveStopId: () => string | null;
  // Selected vehicle setter for unified vehicle selection
  setSelectedVehicleId: (vehicleId: string | null) => void;
  // Selected vehicle getter
  getSelectedVehicleId: () => string | null;
  
  // Cleanup
  clearAllRoutes: () => void;
  cleanup: () => void;
  exportData: () => { routes: RouteEntity[] };
  importData: (data: { routes?: RouteEntity[] }) => void;
  
  // Toggle favorite for routes
  toggleFavoriteRoute: (id: string) => void;
}

export type TransitStore = TransitStoreState & TransitStoreActions;

const generateId = () => `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useTransitStore = create<TransitStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    routes: {},
    activeRouteId: null,
    routeStart: null,
    routeEnd: null,
    activeStopId: null,
    hoveredStopId: null,
    hoveredVehicleId: null,
    selectedVehicleId: null,
    selectedAlternativeIndex: 0,

    // Route management
    addRoute: (route: Partial<RouteEntity>) => {
      const id = route.id || generateId();
      const routeEntity: RouteEntity = {
        id,
        createdAt: Date.now(),
        isFavorite: false,
        lastAccessed: Date.now(),
        ...route,
      };

      set(state => ({
        routes: { ...state.routes, [id]: routeEntity }
      }));

      return id;
    },

    updateRoute: (id: string, updates: Partial<RouteEntity>) => {
      set(state => {
        const existing = state.routes[id];
        if (!existing) return state;

        return {
          routes: {
            ...state.routes,
            [id]: { 
              ...existing, 
              ...updates, 
              lastAccessed: Date.now() 
            }
          }
        };
      });
    },

    deleteRoute: (id: string) => {
      set(state => {
        const { [id]: deleted, ...rest } = state.routes;
        
        return {
          routes: rest,
          activeRouteId: state.activeRouteId === id ? null : state.activeRouteId
        };
      });
    },

    getRoute: (id: string) => {
      return get().routes[id] || null;
    },

    getAllRoutes: () => {
      return Object.values(get().routes);
    },

    // Active route
    selectRoute: (id: string | null) => {
      set({ activeRouteId: id });
      
      if (id) {
        // Update last accessed
        const { updateRoute } = get();
        updateRoute(id, { lastAccessed: Date.now() });
      }
    },

    getActiveRoute: () => {
      const { routes, activeRouteId } = get();
      return activeRouteId ? routes[activeRouteId] || null : null;
    },

    // Navigation
    setRouteCoordinates: (start: Coordinates | null, end: Coordinates | null) => {
      set({ routeStart: start, routeEnd: end });
    },

    getRouteCoordinates: () => {
      const { routeStart, routeEnd } = get();
      return { start: routeStart, end: routeEnd };
    },

    setSelectedAlternativeIndex: (index: number) => set({ selectedAlternativeIndex: index }),

    // Active stop getter for stepping-stone jumps
    getActiveStopId: () => get().activeStopId,

    // Active stop setter for stepping-stone jumps
    setActiveStop: (stopId: string | null) => {
      set({ activeStopId: stopId });
    },
    // Hovered stop setter for sidebar hover interactions
    setHoveredStop: (stopId: string | null) => {
      set({ hoveredStopId: stopId });
    },

    // Cleanup
    clearAllRoutes: () => {
      set(state => {
        // Preserve favorite routes when clearing
        const favoriteRoutes: Record<string, RouteEntity> = {};
        Object.entries(state.routes).forEach(([id, route]) => {
          if (route.isFavorite) {
            favoriteRoutes[id] = route;
          }
        });
        
        return {
          routes: favoriteRoutes,
          activeRouteId: null,
          routeStart: null,
          routeEnd: null,
          activeStopId: null,
          hoveredStopId: null,
          hoveredVehicleId: null,
          selectedVehicleId: null,
        };
      });
    },

    cleanup: () => {
      // Could add TTL cleanup here if needed
    },

    exportData: () => {
      return {
        routes: Object.values(get().routes)
      };
    },

    importData: (data) => {
      if (data.routes) {
        const routes: Record<string, RouteEntity> = {};
        data.routes.forEach(route => {
          routes[route.id] = route;
        });
        
        set(state => ({
          routes: { ...state.routes, ...routes }
        }));
      }
    },

    // Selected vehicle id setter/getter
    setSelectedVehicleId: (vehicleId: string | null) => set({ selectedVehicleId: vehicleId }),
    getSelectedVehicleId: () => get().selectedVehicleId,

    // Hovered vehicle setter for map marker hover
    setHoveredVehicle: (vehicleId: string | null) => set({ hoveredVehicleId: vehicleId }),

    // Toggle favorite for routes
    toggleFavoriteRoute: (id: string) => {
      set(state => {
        const existing = state.routes[id];
        if (!existing) return state;
        return {
          routes: {
            ...state.routes,
            [id]: { ...existing, isFavorite: !existing.isFavorite },
          }
        };
      });
    },
  }))
); 