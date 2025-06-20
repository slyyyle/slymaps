import { usePlaceStore } from '@/stores/use-place-store';
import { useTransitStore } from '@/stores/transit';
// import { useDataStore } from '@/stores/use-data-store'; // legacy store removed

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
  const poiStore = usePlaceStore.getState();
  poiStore.cleanup();
  poiStore.clearSearchResults();
  poiStore.clearSelection();

  // Clear Route store
  const routeStore = useTransitStore.getState();
  routeStore.clearAllRoutes();
  // Optional: cleanup for route store (no-op by default)
  routeStore.cleanup();

  // Legacy data store removed

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