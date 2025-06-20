import { useQuery } from '@tanstack/react-query';
import { TransitProviderImpl } from '@/providers/TransitProvider';
import type { Coordinates } from '@/types/core';
import type {
  ObaNearbySearchResult,
  ObaVehicleLocation,
  ObaRoute,
  ObaScheduleEntry,
  ObaStopScheduleWithRefs,
} from '@/types/transit/oba';

/**
 * Fetch nearby stops and routes for a location
 */
export function useFetchNearbyTransit(
  coords: Coordinates,
  radiusMeters: number = 800
) {
  return useQuery<ObaNearbySearchResult, Error>({
    queryKey: ['transit', 'nearby', coords, radiusMeters],
    queryFn: () => TransitProviderImpl.fetchNearbyTransit(coords, radiusMeters),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
  });
}

/**
 * Fetch detailed route info and shape segments
 */
export function useFetchRouteDetails(routeId: string) {
  return useQuery<{ routeInfo: ObaRoute | null; branches: any[] }, Error>({
    queryKey: ['transit', 'details', routeId],
    queryFn: () => TransitProviderImpl.fetchRouteDetails(routeId),
    enabled: !!routeId,
    // Avoid refetching route shapes too often to prevent hitting rate limits
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch real-time vehicle locations for a route
 */
export function useFetchVehicles(routeId: string) {
  return useQuery<ObaVehicleLocation[], Error>({
    queryKey: ['transit', 'vehicles', routeId],
    queryFn: () => TransitProviderImpl.fetchVehiclesForRoute(routeId),
    enabled: !!routeId,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Fetch scheduled arrivals for a route
 */
export function useFetchRouteSchedule(routeId: string) {
  return useQuery<ObaScheduleEntry, Error>({
    queryKey: ['transit', 'routeSchedule', routeId],
    queryFn: () => TransitProviderImpl.fetchRouteSchedule(routeId),
    enabled: !!routeId,
  });
}

/**
 * Fetch schedule and references for a stop
 */
export function useFetchStopSchedule(stopId: string) {
  return useQuery<ObaStopScheduleWithRefs, Error>({
    queryKey: ['transit', 'stopSchedule', stopId],
    queryFn: () => TransitProviderImpl.fetchStopSchedule(stopId),
    enabled: !!stopId,
  });
} 