import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Coordinates } from '@/types/core';
import type { 
  ObaRoute, 
  ObaRouteGeometry, 
  ObaVehicleLocation,
  ObaStopSearchResult,
  ObaScheduleEntry
} from '@/types/oba';
import type { Route as MapboxRoute } from '@/types/directions';
import type { PointOfInterest } from '@/types/core';

export interface RouteEntity {
  id: string;
  createdAt: number;
  lastAccessed?: number;
  
  // OBA Data
  obaRoute?: ObaRoute;
  // individual route segments for OBA shapes
  segments?: ObaRouteGeometry[];
  // branch variants (headsign branches)
  branches?: Array<{ branchIdx: number; name: string; segments: ObaRouteGeometry[]; stops: PointOfInterest[] }>;
  // stops per segment for OBA shapes
  stopsBySegment?: PointOfInterest[][];
  // fallback single geometry (first segment)
  geometry?: ObaRouteGeometry;
  vehicles?: ObaVehicleLocation[];
  // currently selected segment index
  selectedSegmentIndex?: number;
  stops?: PointOfInterest[];  // legacy flattened list
  // schedule entries for this route
  schedule?: ObaScheduleEntry[];
  
  // Mapbox Data  
  mapboxRoute?: MapboxRoute;
  
  // State
  isActive?: boolean;
  isLoading?: boolean;
}

interface RouteStoreState {
  // Route collections
  routes: Record<string, RouteEntity>;
  
  // Active selection
  activeRouteId: string | null;
  
  // Navigation state
  routeStart: Coordinates | null;
  routeEnd: Coordinates | null;
  // Stepping-stone origin stop for route jumping
  originStopId: string | null;
}

interface RouteStoreActions {
  // Route management
  addRoute: (route: Partial<RouteEntity>) => string;
  updateRoute: (id: string, updates: Partial<RouteEntity>) => void;
  deleteRoute: (id: string) => void;
  getRoute: (id: string) => RouteEntity | null;
  getAllRoutes: () => RouteEntity[];
  
  // Active selection
  selectRoute: (id: string | null) => void;
  getActiveRoute: () => RouteEntity | null;
  
  // Navigation
  setRouteCoordinates: (start: Coordinates | null, end: Coordinates | null) => void;
  getRouteCoordinates: () => { start: Coordinates | null; end: Coordinates | null };
  // Stepping-stone origin stop setter
  setOriginStop: (stopId: string | null) => void;
  
  // Cleanup
  clearAllRoutes: () => void;
  cleanup: () => void;
  exportData: () => { routes: RouteEntity[] };
  importData: (data: { routes?: RouteEntity[] }) => void;
}

type RouteStore = RouteStoreState & RouteStoreActions;

const generateId = () => `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useRouteStore = create<RouteStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    routes: {},
    activeRouteId: null,
    routeStart: null,
    routeEnd: null,
    // Stepping-stone origin stop for route jumping
    originStopId: null,

    // Route management
    addRoute: (route: Partial<RouteEntity>) => {
      const id = route.id || generateId();
      const routeEntity: RouteEntity = {
        id,
        createdAt: Date.now(),
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

    // Active selection
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

    // Stepping-stone origin stop setter
    setOriginStop: (stopId: string | null) => {
      set({ originStopId: stopId });
    },

    // Cleanup
    clearAllRoutes: () => {
      set({
        routes: {},
        activeRouteId: null,
        routeStart: null,
        routeEnd: null,
        originStopId: null
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
  }))
); 