import { useState, useCallback } from 'react';
import { useTransitStore } from '@/stores/transit';

/**
 * UI controls for the map: turn markers and branch segment selection
 * @param routeId current store route ID
 */
export function useMapControls(routeId: string | null) {
  const routeStore = useTransitStore();

  // Turn markers toggle
  const [showTurnMarkers, setShowTurnMarkers] = useState<boolean>(false);
  const toggleTurnMarkers = useCallback(() => {
    setShowTurnMarkers(prev => !prev);
  }, []);

  // Segment selection for multi-branch routes
  const selectSegment = useCallback((segmentIndex: number) => {
    if (!routeId) return;
    const route = routeStore.getRoute(routeId);
    if (!route) return;
    routeStore.updateRoute(routeId, { selectedSegmentIndex: segmentIndex });
  }, [routeStore, routeId]);

  const getSelectedSegmentIndex = useCallback((): number => {
    if (!routeId) return 0;
    const route = routeStore.getRoute(routeId);
    return route?.selectedSegmentIndex ?? 0;
  }, [routeStore, routeId]);

  return {
    showTurnMarkers,
    toggleTurnMarkers,
    selectSegment,
    getSelectedSegmentIndex,
  };
} 