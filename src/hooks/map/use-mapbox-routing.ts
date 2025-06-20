import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDirections } from '@/services/mapbox';
import { getTransitItinerary } from '@/services/transit-otp';
import { useTransitStore } from '@/stores/transit';
import type { Coordinates, TransitMode } from '@/types/core';

/**
 * Hook to calculate routing (Mapbox or OTP) and add it to the transit store
 */
export function useMapboxRouting() {
  const queryClient = useQueryClient();
  const routeStore = useTransitStore();

  /**
   * Calculate and add a route. Uses OTP for transit mode, Mapbox for others.
   * Stores both the route and its start/end.
   * @returns store ID for the newly created route
   */
  const addMapboxRoute = useCallback(async (
    start: Coordinates,
    end: Coordinates,
    mode: TransitMode = 'driving'
  ): Promise<string> => {
    console.log(`🗺️ Calculating ${mode} route from ${start.latitude},${start.longitude} to ${end.latitude},${end.longitude}`);
    
    const { latitude: startLat, longitude: startLng } = start;
    const { latitude: endLat, longitude: endLng } = end;
    
    let route;
    
    if (mode === 'transit') {
      // Use OTP for transit routing with caching
      route = await queryClient.fetchQuery({
        queryKey: ['otp', 'transit', startLat, startLng, endLat, endLng],
        queryFn: () => getTransitItinerary(start, end),
        staleTime: Infinity,
      });
      if (!route) {
        throw new Error('No transit route found');
      }
    } else {
      // Use Mapbox for other modes with caching
      route = await queryClient.fetchQuery({
        queryKey: ['mapbox', 'directions', startLat, startLng, endLat, endLng, mode],
        queryFn: () => getDirections(start, end, mode),
        staleTime: 1000 * 60 * 5, // cache for 5 minutes
      });
      if (!route) {
        throw new Error('No route found');
      }
    }
    
    // Add to store
    const storeRouteId = routeStore.addRoute({
      id: route.id,
      mapboxRoute: route
    });
    
    // Set coordinates for the route
    routeStore.setRouteCoordinates(start, end);
    return storeRouteId;
  }, [queryClient, routeStore]);

  return { addMapboxRoute };
} 