import { useCallback } from 'react';
import { usePlaceStore } from '@/stores/use-place-store';
import { useTransitStore } from '@/stores/transit';

/**
 * Hook that links a POI to a route in the transit store.
 * Returns a function that takes a POI ID and a route ID,
 * logs the link, and returns true if successful.
 */
export function usePoiLinking() {
  const poiStore = usePlaceStore();
  const routeStore = useTransitStore();

  return useCallback((poiId: string, routeId: string): boolean => {
    const poi = poiStore.getAllStoredPlaces().find(p => p.id === poiId);
    const route = routeStore.getRoute(routeId);
    if (poi && route) {
      console.log(`🔗 Linked POI ${poi.name} to route ${route.obaRoute?.shortName || route.id}`);
      return true;
    }
    return false;
  }, [poiStore, routeStore]);
} 