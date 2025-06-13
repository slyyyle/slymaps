import { useState, useCallback } from 'react';
import { useDataIntegration } from '../data/use-data-integration';
import type { Coordinates } from '@/types/core';

interface DestinationSettingState {
  // Visual feedback state
  temporaryDestination: Coordinates | null;
  isSettingDestination: boolean;
  
  // Interaction modes
  mode: 'idle' | 'setting' | 'confirming';
}

export function useDestinationSetting() {
  const dataIntegration = useDataIntegration();
  
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
  const confirmDestination = useCallback((coords: Coordinates) => {
    dataIntegration.directions.setDirectionsDestination(coords);
    
    setState({
      temporaryDestination: null,
      isSettingDestination: false,
      mode: 'idle'
    });
  }, [dataIntegration.directions]);

  // Cancel destination setting
  const cancelDestinationSetting = useCallback(() => {
    setState({
      temporaryDestination: null,
      isSettingDestination: false,
      mode: 'idle'
    });
  }, []);

  // Quick set destination (for search results, POI clicks, etc.)
  const setDestinationDirect = useCallback((coords: Coordinates) => {
    dataIntegration.directions.setDirectionsDestination(coords);
  }, [dataIntegration.directions]);

  // Get the current destination from the directions state
  const getCurrentDestination = useCallback(() => {
    return dataIntegration.directions.getDirectionsState().destination;
  }, [dataIntegration.directions]);

  // Clear the current destination
  const clearDestination = useCallback(() => {
    dataIntegration.directions.setDirectionsDestination(null);
  }, [dataIntegration.directions]);

  return {
    // State
    ...state,
    currentDestination: getCurrentDestination(),
    
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