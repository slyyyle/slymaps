import { useCallback } from 'react';
import type { Coordinates } from '@/types/core';
import { useToast } from '@/hooks/ui/use-toast';
import { useDataIntegration } from './use-data-integration';

// Simplified interface - only POI creation now, location is handled by native GeolocateControl
export interface LocationActions {
  // POI Creation actions
  startPOICreation: () => void;
  cancelPOICreation: () => void;
  createPOIAtLocation: (coords: Coordinates, type?: string, name?: string) => string;
}

export function useLocationState() {
  const { toast } = useToast();
  const dataIntegration = useDataIntegration();

  // Get only POI creation state - location is handled natively now
  const isCreatingPOI = dataIntegration.location.isCreatingPOI();

  // Expose the POI creation handler for map components to use
  const poiCreationHandler = dataIntegration.location.getPOICreationHandler();

  // POI Creation actions
  const startPOICreation = useCallback(() => {
    dataIntegration.location.startPOICreation();
    
    toast({
      title: "Create Custom POI",
      description: "Click on the map to create a custom point of interest.",
    });
  }, [dataIntegration.location, toast]);

  const cancelPOICreation = useCallback(() => {
    dataIntegration.location.cancelPOICreation();
  }, [dataIntegration.location]);

  const createPOIAtLocation = useCallback((coords: Coordinates, type?: string, name?: string) => {
    const poiId = dataIntegration.location.createPOIAtLocation(coords, type, name);
    
    toast({
      title: "POI Created",
      description: `Created "${name || 'Custom Location'}" at ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    });
    
    return poiId;
  }, [dataIntegration.location, toast]);

  const actions: LocationActions = {
    startPOICreation,
    cancelPOICreation,
    createPOIAtLocation,
  };

  return {
    // Only POI creation state
    isCreatingPOI,
    ...actions,
    poiCreationHandler, // Expose the POI creation handler for map components
  };
} 