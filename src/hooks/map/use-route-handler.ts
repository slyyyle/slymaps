import { useCallback, useRef } from 'react';
import { useRouteStore } from '@/stores/use-route-store';
import { usePOIStore } from '@/stores/use-poi-store';
import type { Coordinates, PointOfInterest, TransitMode } from '@/types/core';
import type { ObaStopSearchResult } from '@/types/oba';
import { 
  getRouteDetails,
  getVehiclesForRoute,
  getScheduleForRoute
} from '@/services/oba';
import { getDirections } from '@/services/mapbox';

interface RouteHandlerProps {
  enableVehicleTracking?: boolean;
}

export function useRouteHandler({ enableVehicleTracking = true }: RouteHandlerProps = {}) {
  const routeStore = useRouteStore();
  const poiStore = usePOIStore();
  
  // Action to mark stepping-stone origin stop for route jumps
  const setOriginStop = routeStore.setOriginStop;
  
  // 🔧 STABLE REFS: Prevent re-render loops
  const enableVehicleTrackingRef = useRef(enableVehicleTracking);
  
  // Keep refs current
  enableVehicleTrackingRef.current = enableVehicleTracking;

  // 🔧 STABLE HANDLERS: Empty deps, use refs internally
  const addOBARoute = useCallback(async (routeId: string) => {
    try {
      console.log(`🚌 Fetching OBA route details for ${routeId}`);
      
      const { routeInfo, branches } = await getRouteDetails(routeId);
      console.log(`🚌 addOBARoute(${routeId}) → branches: ${branches.length}, default stops: ${branches[0]?.stops.length}`);
      
      if (!routeInfo) {
        throw new Error(`Route ${routeId} not found`);
      }

      // Add route to store
      const storeRouteId = routeStore.addRoute({
        id: `oba-${routeId}`,
        obaRoute: routeInfo,
        // individual segments for default branch (branch 0)
        segments: branches[0]?.segments,
        // branch variants
        branches,
        // stops per branch (for backward compatibility)
        stopsBySegment: branches.map(b => b.stops as PointOfInterest[]),
        // fallback to first branch first segment geometry
        geometry: branches[0]?.segments[0],
        // initialize selected branch index
        selectedSegmentIndex: 0,
        // legacy flattened stops list (default branch)
        stops: branches[0]?.stops,
        // initial empty schedule, will be populated shortly
        schedule: []
      });

      // Add stops as search results
      branches[0]?.stops.forEach(stop => {
        const poi: PointOfInterest = {
          id: stop.id,
          name: stop.name,
          description: `Stop #${stop.code} - ${stop.direction} bound`,
          type: 'Bus Stop',
          latitude: stop.latitude,
          longitude: stop.longitude,
          isObaStop: true,
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

      // Fetch vehicles if enabled, but don't block route loading on failure
      if (enableVehicleTrackingRef.current) {
        try {
          const vehicles = await getVehiclesForRoute(routeId);
          if (vehicles.length > 0) {
            routeStore.updateRoute(storeRouteId, { vehicles });
          }
        } catch (vehError) {
          console.warn(`🚌 Vehicle fetch failed for route ${routeId}:`, vehError);
        }
      }

      // Fetch route schedule and parse nested stopTimes into our schedule entries
      try {
        const raw = (await getScheduleForRoute(routeId)) as any;
        const serviceId = raw.serviceIds?.[0] ?? '';
        const routeIdStr = raw.routeId;
        const scheduleDateMs: number = raw.scheduleDate || 0;
        const parsedSchedule = (raw.stopTripGroupings || []).flatMap((grouping: any) => {
          const direction = grouping.directionId ?? '';
          const headsigns: string[] = grouping.tripHeadsigns || [];
          const trips: any[] = grouping.tripsWithStopTimes || [];
          return trips.map((trip: any, idx: number) => ({
            serviceId,
            tripId: trip.tripId,
            routeId: routeIdStr,
            stopTimes: (trip.stopTimes || []).map((st: any) => ({
              stopId: st.stopId,
              arrivalTime: scheduleDateMs + (st.arrivalTime || 0) * 1000,
              departureTime: scheduleDateMs + (st.departureTime || 0) * 1000,
            })),
            direction,
            headsign: headsigns[idx] || direction,
          }));
        });
        routeStore.updateRoute(storeRouteId, { schedule: parsedSchedule });
      } catch (schedError) {
        console.warn(`🚌 Schedule fetch failed for route ${routeId}:`, schedError);
      }

      return storeRouteId;
    } catch (error) {
      console.error('Failed to add OBA route:', error);
      throw error;
    }
  }, []);

  const selectRoute = useCallback((routeId: string | null) => {
    // Clear any previous stepping-stone origin stop on direct selection
    setOriginStop(null);
    routeStore.selectRoute(routeId);
    
    if (routeId) {
      const route = routeStore.getRoute(routeId);
      console.log(`🎯 Selected route: ${route?.obaRoute?.shortName || routeId}`);
    }
  }, [setOriginStop]);

  // Add route from a specific stop (stepping-stone behavior)
  const addOBARouteFromStop = useCallback(async (routeId: string, stopId: string) => {
    const storeRouteId = await addOBARoute(routeId);
    // Select the new route without clearing originStop
    routeStore.selectRoute(storeRouteId);
    // Mark the stepping-stone origin stop
    setOriginStop(stopId);
    return storeRouteId;
  }, [addOBARoute, routeStore, setOriginStop]);

  const addMapboxRoute = useCallback(async (start: Coordinates, end: Coordinates, mode: TransitMode = 'driving-traffic'): Promise<string> => {
    try {
      console.log(`🗺️ Calculating Mapbox route from ${start.latitude},${start.longitude} to ${end.latitude},${end.longitude}`);
      
      const route = await getDirections(start, end, mode);
      
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
    const poi = poiStore.getAllStoredPOIs().find(p => p.id === poiId);
    const route = routeStore.getRoute(routeId);
    
    if (poi && route) {
      console.log(`🔗 Linked POI ${poi.name} to route ${route.obaRoute?.shortName || route.id}`);
      return true;
    }
    
    return false;
  }, []);

  const clearRouteSelection = useCallback(() => {
    routeStore.selectRoute(null);
    routeStore.setRouteCoordinates(null, null);
  }, []);

  // Allow selecting which segment to display
  const selectSegment = useCallback((routeId: string, segmentIndex: number) => {
    const route = routeStore.getRoute(routeId);
    if (!route) return;
    routeStore.updateRoute(routeId, { selectedSegmentIndex: segmentIndex });
  }, []);

  const getSelectedSegmentIndex = useCallback((routeId: string): number => {
    const route = routeStore.getRoute(routeId);
    return route?.selectedSegmentIndex ?? 0;
  }, []);

  // Return stable interface
  return {
    // Route management
    addOBARoute,
    addOBARouteFromStop,
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
    
    // Segment selection
    selectSegment,
    getSelectedSegmentIndex,
  };
} 