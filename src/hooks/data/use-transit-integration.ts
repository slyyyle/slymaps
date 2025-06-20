import { useCallback, useMemo } from 'react';
import { useTransitStore } from '@/stores/use-transit-store';
import type { Coordinates } from '@/types/core';
import type { ObaRoute } from '@/types/transit/oba';
import type { RouteEntity } from '@/stores/use-transit-store';

export function useTransitIntegration() {
  const store = useTransitStore();

  // Selectors
  const allRoutes = useMemo(() => store.getAllRoutes(), [store]);
  const activeRoute = store.getActiveRoute();
  const activeStopId = store.getActiveStopId();

  // Reference lookup: map route ID → OBA route info
  const getReferencedRoutes = useCallback((): Record<string, ObaRoute> => {
    const refs: Record<string, ObaRoute> = {};
    allRoutes.forEach(route => {
      if (route.obaRoute) {
        refs[route.id] = route.obaRoute;
      }
    });
    return refs;
  }, [allRoutes]);

  // Route operations
  const getAllRoutes = useCallback(() => allRoutes, [allRoutes]);
  const getActiveRoute = useCallback(() => activeRoute, [activeRoute]);
  const getActiveStopId = useCallback(() => activeStopId, [activeStopId]);

  const addRoute = useCallback((route: Partial<RouteEntity>) => store.addRoute(route), [store]);
  const updateRoute = useCallback((id: string, updates: Partial<RouteEntity>) => store.updateRoute(id, updates), [store]);
  const deleteRoute = useCallback((id: string) => store.deleteRoute(id), [store]);
  const selectRoute = useCallback((id: string | null) => store.selectRoute(id), [store]);
  const clearAllRoutes = useCallback(() => store.clearAllRoutes(), [store]);

  // Navigation state
  const setRouteCoordinates = useCallback((start: Coordinates | null, end: Coordinates | null) => store.setRouteCoordinates(start, end), [store]);
  const getRouteCoordinates = useCallback(() => store.getRouteCoordinates(), [store]);

  // Active stop operations
  const setActiveStop = useCallback((stopId: string | null) => store.setActiveStop(stopId), [store]);

  return {
    // Data
    allRoutes,
    activeRoute,
    activeStopId,

    // Reference mapping
    getReferencedRoutes,

    // Getters
    getAllRoutes,
    getActiveRoute,
    getActiveStopId,

    // CRUD
    addRoute,
    updateRoute,
    deleteRoute,
    selectRoute,
    clearAllRoutes,

    // Navigation
    setRouteCoordinates,
    getRouteCoordinates,

    // Stop management
    setActiveStop,
  };
} 