import { useCallback } from 'react';
import type { Coordinates } from '@/types/core';
import { useToast } from '@/hooks/ui/use-toast';

// Simplified interface - only POI creation now handled manually
export interface LocationActions {
  startPOICreation: () => void;
  cancelPOICreation: () => void;
  createPOIAtLocation: (coords: Coordinates, type?: string, name?: string) => string;
}

export function useLocationState() {
  const { toast } = useToast();

  const startPOICreation = useCallback(() => {
    toast({
      title: "Create Custom POI",
      description: "Click on the map to create a custom point of interest.",
    });
  }, [toast]);

  const cancelPOICreation = useCallback(() => {}, []);

  const createPOIAtLocation = useCallback((coords: Coordinates, type?: string, name?: string) => {
    toast({
      title: "POI Created",
      description: `Created "${name || 'Custom Location'}" at ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    });
    // TODO: integrate with unified POI handler
    return '';
  }, [toast]);
    
  // No direct POI creation handler beyond the above actions
  const poiCreationHandler = createPOIAtLocation;

  return {
    isCreatingPOI: false,
    startPOICreation,
    cancelPOICreation,
    createPOIAtLocation,
    poiCreationHandler,
  };
} 