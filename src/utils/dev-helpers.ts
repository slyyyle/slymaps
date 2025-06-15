import { usePOIStore } from '@/stores/use-poi-store';
import { useRouteStore } from '@/stores/use-route-store';
import { useDataStore } from '@/stores/use-data-store';

/**
 * Development helper functions for managing application state
 * These functions are only available in development mode
 */

// Store clearing utilities
export const clearAllStores = () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Store clearing is only available in development mode');
    return;
  }

  // Clear POI store
  const poiStore = usePOIStore.getState();
  poiStore.cleanup();
  poiStore.clearSearchResults();
  poiStore.clearSelection();

  // Clear Route store
  const routeStore = useRouteStore.getState();
  routeStore.clearAllRoutes();
  // Optional: cleanup for route store (no-op by default)
  routeStore.cleanup();

  // Reset main Data store and clear expired cache
  const dataStore = useDataStore.getState();
  dataStore.resetStore();
  dataStore.cleanupExpiredData();

  console.log('✅ Dev helper: all stores and caches cleared successfully');
};

// Make the function available globally in development
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - This is intentional for development
  window.__DEV_HELPERS__ = {
    clearAllStores
  };
}

// Export a hook for components that need to clear stores
export const useDevHelpers = () => {
  if (process.env.NODE_ENV !== 'development') {
    return {
      clearAllStores: () => console.warn('Store clearing is only available in development mode')
    };
  }

  return {
    clearAllStores
  };
};

export function AppSearchBox() {
  // Implementation of AppSearchBox function
} 