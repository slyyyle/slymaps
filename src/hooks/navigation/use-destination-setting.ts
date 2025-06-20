import { useState, useCallback } from 'react';
import { useMapRouteHandler } from '@/hooks/map';
import type { Coordinates } from '@/types/core';

interface DestinationSettingState {
  // Visual feedback state
  temporaryDestination: Coordinates | null;
  isSettingDestination: boolean;
  
  // Interaction modes
  mode: 'idle' | 'setting' | 'confirming';
}

export function useDestinationSetting() {
  const routeHandler = useMapRouteHandler();
  const { getRouteCoordinates, addMapboxRoute, selectRoute } = routeHandler;
  
  const [state, setState] = useState<DestinationSettingState>({
    temporaryDestination: null,
    isSettingDestination: false,
    mode: 'idle'
  });

  // Start destination setting mode
  const startDestinationSetting = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSettingDestination: true,
      mode: 'setting'
    }));
  }, []);

  // Handle map click during destination setting
  const handleMapClick = useCallback((coords: Coordinates) => {
    if (!state.isSettingDestination) return false;
    
    setState(prev => ({
      ...prev,
      temporaryDestination: coords,
      mode: 'confirming'
    }));
    
    return true; // Indicate that the click was handled
  }, [state.isSettingDestination]);

  // Confirm the temporary destination
  const confirmDestination = useCallback(async (coords: Coordinates) => {
    const { start } = getRouteCoordinates();
    if (start) {
      const storeId = await addMapboxRoute(start, coords);
      // Select the newly added route so it becomes active
      selectRoute(storeId);
    }
    setState({
      temporaryDestination: null,
      isSettingDestination: false,
      mode: 'idle'
    });
  }, [getRouteCoordinates, addMapboxRoute, selectRoute]);

  // Cancel destination setting
  const cancelDestinationSetting = useCallback(() => {
    setState({
      temporaryDestination: null,
      isSettingDestination: false,
      mode: 'idle'
    });
  }, []);

  // Quick set destination (for search results, POI clicks, etc.)
  const setDestinationDirect = useCallback(async (coords: Coordinates) => {
    const { start } = getRouteCoordinates();
    if (start) {
      await addMapboxRoute(start, coords);
    }
  }, [getRouteCoordinates, addMapboxRoute]);

  // Clear the current destination
  const clearDestination = useCallback(() => {
    routeHandler.clearRouteSelection();
  }, [routeHandler]);

  return {
    // State
    ...state,
    
    // Actions
    startDestinationSetting,
    handleMapClick,
    confirmDestination,
    cancelDestinationSetting,
    setDestinationDirect,
    clearDestination,
    
    // Convenience getters
    isIdle: state.mode === 'idle',
    isSettingMode: state.mode === 'setting',
    isConfirmingMode: state.mode === 'confirming',
    hasTemporaryDestination: !!state.temporaryDestination,
  };
} 