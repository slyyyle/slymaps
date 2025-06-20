import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TransitProviderImpl, Branch } from '@/providers/TransitProvider';
import { useTransitStore } from '@/stores/transit';
import type { ObaVehicleLocation, ObaScheduleEntry, ObaRoute } from '@/types/transit/oba';

/**
 * Encapsulates OneBusAway fetch + store updates for routes
 */
export function useObaRoutes() {
  const routeStore = useTransitStore();
  const queryClient = useQueryClient();
  const providerRef = useRef(TransitProviderImpl);

  /**
   * Add a new route to the store by fetching details from OBA
   */
  const addRoute = useCallback(async (routeId: string) => {
    const { routeInfo, branches } = await queryClient.fetchQuery<{
      routeInfo: ObaRoute | null;
      branches: Branch[];
    }, Error>({
      queryKey: ['transit', 'details', routeId],
      queryFn: () => providerRef.current.fetchRouteDetails(routeId),
      staleTime: Infinity,
    });
    if (!routeInfo || branches.length === 0) {
      throw new Error(`Route ${routeId} not found`);
    }
    const storeId = routeStore.addRoute({
      id: `oba-${routeId}`,
      obaRoute: routeInfo,
      segments: branches[0].segments,
      branches,
      stopsBySegment: branches.map(b => b.stops),
      geometry: branches[0].segments[0],
      selectedSegmentIndex: 0,
      stops: branches[0].stops,
      schedule: [],
    });
    return storeId;
  }, [queryClient, routeStore]);

  /**
   * Refresh vehicle locations for a stored route
   */
  const updateVehicles = useCallback(async (storeRouteId: string) => {
    const route = routeStore.getRoute(storeRouteId);
    if (!route || !route.obaRoute) return;
    const obaRouteId = route.obaRoute.id;
    const vehicles = await queryClient.fetchQuery<ObaVehicleLocation[], Error>({
      queryKey: ['transit', 'vehicles', obaRouteId],
      queryFn: () => providerRef.current.fetchVehiclesForRoute(obaRouteId),
    });
    routeStore.updateRoute(storeRouteId, { vehicles });
  }, [queryClient, routeStore]);

  /**
   * Refresh schedule entries for a stored route
   */
  const updateSchedule = useCallback(async (storeRouteId: string) => {
    const route = routeStore.getRoute(storeRouteId);
    if (!route || !route.obaRoute) return;
    const obaRouteId = route.obaRoute.id;
    const schedule = await queryClient.fetchQuery<ObaScheduleEntry, Error>({
      queryKey: ['transit', 'routeSchedule', obaRouteId],
      queryFn: () => providerRef.current.fetchRouteSchedule(obaRouteId),
    });
    routeStore.updateRoute(storeRouteId, { schedule: [schedule] });
  }, [queryClient, routeStore]);

  return { addRoute, updateVehicles, updateSchedule };
} 