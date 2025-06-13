import { useCallback, useRef } from 'react';
import { useRouteStore } from '@/stores/use-route-store';
import { usePOIStore } from '@/stores/use-poi-store';
import type { Coordinates, PointOfInterest } from '@/types/core';
import type { ObaRoute, ObaRouteGeometry, ObaVehicleLocation } from '@/types/oba';
import type { Route as MapboxRoute } from '@/types/directions';
import { 
  getRouteDetails,
  getVehiclesForRoute 
} from '@/services/oba';
import { getDirections } from '@/services/mapbox';

interface RouteHandlerProps {
  enableVehicleTracking?: boolean;
}

export function useRouteHandler({ enableVehicleTracking = true }: RouteHandlerProps = {}) {
  const routeStore = useRouteStore();
  const poiStore = usePOIStore();
  
  // 🔧 STABLE REFS: Prevent re-render loops
  const enableVehicleTrackingRef = useRef(enableVehicleTracking);
  
  // Keep refs current
  enableVehicleTrackingRef.current = enableVehicleTracking;

  // 🔧 STABLE HANDLERS: Empty deps, use refs internally
  const addOBARoute = useCallback(async (routeId: string) => {
    try {
      console.log(`🚌 Fetching OBA route details for ${routeId}`);
      
      const { routeGeometry, routeInfo, stops } = await getRouteDetails(routeId);
      
      if (!routeInfo) {
        throw new Error(`Route ${routeId} not found`);
      }

      // Add route to store
      const storeRouteId = routeStore.addRoute({
        id: `oba-${routeId}`,
        obaRoute: routeInfo,
        geometry: routeGeometry || undefined,
        stops: stops as any || []
      });

      // Add stops as search results
      if (stops && stops.length > 0) {
        stops.forEach(stop => {
          const poi: PointOfInterest = {
            id: stop.id,
            name: stop.name,
            description: `Stop #${stop.code} - ${stop.direction} bound`,
            type: 'Bus Stop',
            latitude: stop.latitude,
            longitude: stop.longitude,
            isSearchResult: false,
            properties: {
              source: 'oba',
              stop_code: stop.code,
              direction: stop.direction,
              route_ids: stop.routeIds,
              wheelchair_boarding: stop.wheelchairBoarding
            }
          };
          
          poiStore.addSearchResult(poi, `route-${routeId}-stops`);
        });
      }

      // Fetch vehicles if enabled
      if (enableVehicleTrackingRef.current) {
        const vehicles = await getVehiclesForRoute(routeId);
        if (vehicles.length > 0) {
          routeStore.updateRoute(storeRouteId, { vehicles });
        }
      }

      return storeRouteId;
    } catch (error) {
      console.error('Failed to add OBA route:', error);
      throw error;
    }
  }, []);

  const addMapboxRoute = useCallback(async (start: Coordinates, end: Coordinates, mode = 'driving-traffic') => {
    try {
      console.log(`🗺️ Calculating Mapbox route from ${start.latitude},${start.longitude} to ${end.latitude},${end.longitude}`);
      
      const route = await getDirections(start, end, mode as any);
      
      if (!route) {
        throw new Error('No route found');
      }

      const storeRouteId = routeStore.addRoute({
        id: `mapbox-${Date.now()}`,
        mapboxRoute: route
      });

      // Set route coordinates
      routeStore.setRouteCoordinates(start, end);

      return storeRouteId;
    } catch (error) {
      console.error('Failed to add Mapbox route:', error);
      throw error;
    }
  }, []);

  const updateRouteVehicles = useCallback(async (routeId: string) => {
    try {
      const route = routeStore.getRoute(routeId);
      if (!route?.obaRoute) return false;

      const vehicles = await getVehiclesForRoute(route.obaRoute.id);
      routeStore.updateRoute(routeId, { vehicles });
      
      return true;
    } catch (error) {
      console.error('Failed to update route vehicles:', error);
      return false;
    }
  }, []);

  const linkPOIToRoute = useCallback((poiId: string, routeId: string) => {
    // This could be enhanced to maintain POI-route relationships
    // For now, we just ensure both exist
    const poi = poiStore.getAllStoredPOIs().find((p: any) => p.id === poiId);
    const route = routeStore.getRoute(routeId);
    
    if (poi && route) {
      console.log(`🔗 Linked POI ${poi.name} to route ${route.obaRoute?.shortName || route.id}`);
      return true;
    }
    
    return false;
  }, []);

  const selectRoute = useCallback((routeId: string | null) => {
    routeStore.selectRoute(routeId);
    
    if (routeId) {
      const route = routeStore.getRoute(routeId);
      console.log(`🎯 Selected route: ${route?.obaRoute?.shortName || routeId}`);
    }
  }, []);

  const clearRouteSelection = useCallback(() => {
    routeStore.selectRoute(null);
    routeStore.setRouteCoordinates(null, null);
  }, []);

  // Return stable interface
  return {
    // Route management
    addOBARoute,
    addMapboxRoute,
    updateRouteVehicles,
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
  };
} 