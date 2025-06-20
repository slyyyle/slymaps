import { useCallback, useRef } from 'react';
import { useState } from 'react';
import { useTransitStore } from '@/stores/transit';
import { useObaRoutes } from '@/hooks/data/use-oba-routes';
import { useRouteSelection } from '@/hooks/map/use-route-selection';
import { usePlaceStore } from '@/stores/use-place-store';
import { useMapControls } from '@/hooks/map/use-map-controls';
import type { Coordinates, Place, TransitMode } from '@/types/core';
import type { ObaStopSearchResult } from '@/types/transit/oba';
import { useMapboxRouting } from '@/hooks/map/use-mapbox-routing';
import { usePoiLinking } from '@/hooks/map/use-poi-linking';

interface RouteHandlerProps {
  enableVehicleTracking?: boolean;
}

export function useRouteHandler({ enableVehicleTracking = true }: RouteHandlerProps = {}) {
  const routeStore = useTransitStore();
  const poiStore = usePlaceStore();
  const { addRoute: addOBARoute, updateVehicles: updateRouteVehicles, updateSchedule: updateRouteSchedule } = useObaRoutes();
  const { selectRoute, addRouteFromStop } = useRouteSelection();
  const { addMapboxRoute } = useMapboxRouting();
  
  // Derive current store route ID
  const activeRoute = routeStore.getActiveRoute();
  const storeRouteId = activeRoute?.id ?? null;
  // UI controls
  const { showTurnMarkers, toggleTurnMarkers, selectSegment, getSelectedSegmentIndex } = useMapControls(storeRouteId);
  
  // 🔧 STABLE REFS: Prevent re-render loops
  const enableVehicleTrackingRef = useRef(enableVehicleTracking);
  
  // Keep refs current
  enableVehicleTrackingRef.current = enableVehicleTracking;

  const updateRouteVehiclesHandler = useCallback(async (routeId: string) => updateRouteVehicles(routeId), [updateRouteVehicles]);

  // POI-route linking
  const linkPOIToRoute = usePoiLinking();

  const clearRouteSelection = useCallback(() => {
    selectRoute(null);
    routeStore.setRouteCoordinates(null, null);
  }, [routeStore, selectRoute]);

  // Return stable interface
  return {
    // Route management handlers
    addOBARoute,
    addRouteFromStop,
    addOBARouteFromStop: addRouteFromStop,
    addMapboxRoute,
    updateRouteVehicles: updateRouteVehiclesHandler,
    selectRoute,
    clearRouteSelection,
    
    // Route data access
    getRoute: routeStore.getRoute,
    getAllRoutes: routeStore.getAllRoutes,
    getActiveRoute: routeStore.getActiveRoute,
    getRouteCoordinates: routeStore.getRouteCoordinates,
    
    // Route operations
    linkPOIToRoute,
    deleteRoute: routeStore.deleteRoute,
    clearAllRoutes: routeStore.clearAllRoutes,
    
    // Segment selection
    selectSegment,
    getSelectedSegmentIndex,
    
    // Turn markers toggle state
    showTurnMarkers,
    toggleTurnMarkers,
  };
} 