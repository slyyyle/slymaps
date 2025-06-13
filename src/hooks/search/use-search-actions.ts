import { useCallback } from 'react';
import { useToast } from '@/hooks/ui/use-toast';
import type { Coordinates } from '@/types/core';

interface UseSearchActionsOptions {
  currentLocation?: Coordinates;
  onTransitNearby?: (coords: Coordinates) => void;
  onClear: () => void;
  onValueChange?: (value: string) => void;
  searchBoxRef?: React.RefObject<HTMLElement & { clear?: () => void }>;
}

export function useSearchActions(options: UseSearchActionsOptions) {
  const { currentLocation, onTransitNearby, onClear, onValueChange, searchBoxRef } = options;
  const { toast } = useToast();

  // Handle clear
  const handleClear = useCallback(() => {
    if (searchBoxRef?.current) {
      searchBoxRef.current.clear?.();
    }
    if (onValueChange) {
      onValueChange('');
    }
    onClear();
  }, [onClear, onValueChange, searchBoxRef]);

  // Handle nearby transit search
  const handleNearbyTransit = useCallback(() => {
    if (currentLocation && onTransitNearby) {
      onTransitNearby(currentLocation);
      toast({
        title: "Finding Nearby Transit",
        description: "Searching for nearby bus stops and routes...",
      });
    } else {
      toast({
        title: "Location Required",
        description: "Please enable location services to find nearby transit.",
        variant: "destructive",
      });
    }
  }, [currentLocation, onTransitNearby, toast]);

  return {
    handleClear,
    handleNearbyTransit,
  };
} 