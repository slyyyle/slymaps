import { usePOIStore } from '@/stores/use-poi-store';

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

  const store = usePOIStore.getState();
  
  // Clear all POI stores by setting initial state
  store.cleanup();
  store.clearSearchResults();
  store.clearSelection();

  console.log('✅ All stores cleared successfully');
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