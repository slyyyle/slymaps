// === UI & INTERFACE TYPES ===
// Types related to user interface components and state

import type { Coordinates, Place } from '../core';
import type { ObaArrivalDeparture, ObaVehicleLocation, CurrentOBARouteDisplayData } from '../transit/oba';

// === SIDEBAR TYPES ===
// Clean types for our modern 2025 sidebar architecture

export type SidebarPane = 'directions' | 'transit' | 'places' | 'style';

export interface SidebarState {
  activePane: SidebarPane | null;
  isCollapsed: boolean;
  isMobile: boolean;
}

export interface PaneProps {
  onBack: () => void;
}

// === MAP STYLE CONFIGURATION TYPES ===
// Modern Mapbox Standard style configuration

export interface MapStyleConfig {
  styleUrl: string;
  show3dObjects: boolean;
  showLabels: boolean;
  theme: 'default';
}

export interface TerrainConfig {
  enabled: boolean;
  exaggeration: number;
  source: string;
}

// === DATA INTEGRATION TYPES ===
// Types for our centralized Zustand data management

export interface LocationState {
  currentLocation: Coordinates | null;
  selectedLocation: Coordinates | null;
  isLoadingLocation: boolean;
  locationError: string | null;
}

export interface POIState {
  customPois: Place[];
  selectedPoi: Place | null;
  cachedArrivals: Record<string, ObaArrivalDeparture[]>;
}

export interface RouteState {
  activeRoute: CurrentOBARouteDisplayData | null;
  cachedRoutes: Record<string, CurrentOBARouteDisplayData>;
  vehicleLocations: Record<string, ObaVehicleLocation[]>;
  // ... you can add more route-related state here
}

// === GLOBAL TYPES ===
// Global window interface extensions for Mapbox integration

declare global {
  interface Window {
    setMapboxPoiDestination?: (lat: number, lng: number) => void;
  }
} 