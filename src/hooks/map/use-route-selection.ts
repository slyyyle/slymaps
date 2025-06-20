import { useCallback } from 'react';
import { useTransitStore } from '@/stores/transit';
import { useObaRoutes } from '@/hooks/data/use-oba-routes';

/**
 * Hook for selecting and adding OBA routes, including stepping-stone behavior.
 */
export function useRouteSelection() {
  const routeStore = useTransitStore();
  const { addRoute } = useObaRoutes();

  /**
   * Select a route by store ID, clearing any active stop.
   */
  const selectRoute = useCallback((routeId: string | null) => {
    // Clear any stepping-stone active stop
    routeStore.setActiveStop(null);
    // Select the route
    routeStore.selectRoute(routeId);
    // Debug log
    if (routeId) {
      const route = routeStore.getRoute(routeId);
      console.log(`🎯 Selected route: ${route?.obaRoute?.shortName || routeId}`);
    }
  }, [routeStore]);

  /**
   * Add a new OBA route from a specific stop (stepping-stone), then select it.
   */
  const addRouteFromStop = useCallback(async (obaRouteId: string, stopId: string) => {
    // Add route via OBA data hook
    const storeRouteId = await addRoute(obaRouteId);
    // Select the new route
    routeStore.selectRoute(storeRouteId);
    // Mark the active stop for stepping-stone jumps
    routeStore.setActiveStop(stopId);
    // Determine branch index for this stop and update segment
    const route = routeStore.getRoute(storeRouteId);
    if (route?.branches) {
      const branchIndex = route.branches.findIndex(branch =>
        branch.stops.some(stop => stop.id === stopId)
      );
      if (branchIndex !== -1) {
        routeStore.updateRoute(storeRouteId, { selectedSegmentIndex: branchIndex });
      }
    }
    return storeRouteId;
  }, [addRoute, routeStore]);

  return { selectRoute, addRouteFromStop };
} 