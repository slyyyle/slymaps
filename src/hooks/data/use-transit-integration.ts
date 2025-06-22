import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTransitStore } from '@/stores/use-transit-store';
import type { Coordinates } from '@/types/core';
import type { ObaRoute } from '@/types/transit/oba';
import type { RouteEntity } from '@/stores/use-transit-store';

export function useTransitIntegration() {
  // Reactive subscriptions to transit store using shallow equality
  const allRoutes = useTransitStore(
    useShallow(state => Object.values(state.routes))
  );
  const favoriteRoutes = useTransitStore(
    useShallow(state => Object.values(state.routes).filter(r => r.isFavorite))
  );
  const recentSearchRoutes = useTransitStore(
    useShallow(state => Object.values(state.routes)
      .filter(r => r.isRecentSearch && !r.isFavorite)
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
      .slice(0, 10) // Keep only the 10 most recent
    )
  );
  const activeRoute = useTransitStore(state => {
    const id = state.activeRouteId;
    return id ? state.routes[id] : null;
  });
  const activeStopId = useTransitStore(state => state.activeStopId);

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

  // Getters returning latest data
  const getAllRoutes = useCallback((): RouteEntity[] => {
    return useTransitStore.getState().getAllRoutes();
  }, []);
  const getFavoriteRoutes = useCallback((): RouteEntity[] => {
    return useTransitStore.getState().getAllRoutes().filter(r => r.isFavorite);
  }, []);
  const getActiveRoute = useCallback(() => activeRoute, [activeRoute]);
  const getActiveStopId = useCallback(() => activeStopId, [activeStopId]);

  // Get transit store actions
  const store = useTransitStore();

  const addRoute = useCallback((route: Partial<RouteEntity>) => store.addRoute(route), [store]);
  const updateRoute = useCallback((id: string, updates: Partial<RouteEntity>) => store.updateRoute(id, updates), [store]);
  const deleteRoute = useCallback((id: string) => store.deleteRoute(id), [store]);
  const selectRoute = useCallback((id: string | null) => store.selectRoute(id), [store]);
  const clearAllRoutes = useCallback(() => store.clearAllRoutes(), [store]);

  // Navigation state
  const setRouteCoordinates = useCallback(
    (start: Coordinates | null, end: Coordinates | null) => store.setRouteCoordinates(start, end),
    [store]
  );
  const getRouteCoordinates = useCallback(() => store.getRouteCoordinates(), [store]);

  // Active stop operations
  const setActiveStop = useCallback((stopId: string | null) => store.setActiveStop(stopId), [store]);

  return {
    // Data
    allRoutes,
    favoriteRoutes,
    recentSearchRoutes,
    activeRoute,
    activeStopId,

    // Reference mapping
    getReferencedRoutes,

    // Getters
    getAllRoutes,
    getFavoriteRoutes,
    getActiveRoute,
    getActiveStopId,

    // CRUD & selection
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

    // Favorites
    toggleFavoriteRoute: store.toggleFavoriteRoute,
  };
} 