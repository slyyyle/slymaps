import { useCallback } from 'react';
import { useDataIntegration } from '../data/use-data-integration';
import type { Coordinates } from '@/types/core';

/**
 * Unified directions system that bridges popup directions with sidebar directions
 * Eliminates the disconnection between different parts of the app
 */
export function useIntegratedDirections() {
  const dataIntegration = useDataIntegration();

  /**
   * Universal "Get Directions" handler - works from popups, buttons, anywhere
   * Automatically integrates with sidebar directions system
   */
  const getDirectionsTo = useCallback((coords: Coordinates, poiName?: string) => {
    console.log(`🎯 Integrated directions requested to: ${poiName || 'Location'}`, coords);
    
    // 1. Set destination in the directions system (integrates with sidebar)
    dataIntegration.directions.setDirectionsDestination(coords);
    
    // 2. Focus on the directions panel in sidebar (if we want to auto-open it)
    // This could trigger opening the sidebar or switching to directions tab
    // For now, just log that the destination is set
    console.log(`✅ Destination set in sidebar directions system`);
    
    return true;
  }, [dataIntegration.directions]);

  /**
   * Enhanced POI directions handler specifically for popup integration
   * Provides richer context and feedback
   */
  const getDirectionsToPoi = useCallback((lat: number, lng: number, poiName?: string, poiType?: string) => {
    const coords: Coordinates = { latitude: lat, longitude: lng };
    
    // Log with rich context
    console.log(`📍 POI directions requested:`, {
      name: poiName || 'Unknown POI',
      type: poiType || 'poi',
      coordinates: coords
    });
    
    return getDirectionsTo(coords, poiName);
  }, [getDirectionsTo]);

  /**
   * Get current directions state for UI feedback
   */
  const getDirectionsState = useCallback(() => {
    return dataIntegration.directions.getDirectionsState();
  }, [dataIntegration.directions]);

  /**
   * Clear directions (useful for reset buttons)
   */
  const clearDirections = useCallback(() => {
    dataIntegration.directions.setDirectionsDestination(null);
    console.log(`🧹 Directions cleared`);
  }, [dataIntegration.directions]);

  /**
   * Check if a destination is currently set
   */
  const hasDestination = useCallback(() => {
    const state = getDirectionsState();
    return !!state.destination;
  }, [getDirectionsState]);

  /**
   * Get human-readable destination info for UI display
   */
  const getDestinationInfo = useCallback(() => {
    const state = getDirectionsState();
    if (!state.destination) return null;
    
    return {
      coordinates: state.destination,
      coordinateString: `${state.destination.latitude.toFixed(4)}, ${state.destination.longitude.toFixed(4)}`,
      hasRoute: !!state.route,
      isLoading: state.isLoading
    };
  }, [getDirectionsState]);

  return {
    // Main actions
    getDirectionsTo,
    getDirectionsToPoi,
    clearDirections,
    
    // State getters
    getDirectionsState,
    hasDestination,
    getDestinationInfo,
    
    // Integration helpers
    isDirectionsActive: hasDestination,
  };
} 