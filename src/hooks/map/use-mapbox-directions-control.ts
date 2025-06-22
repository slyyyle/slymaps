import { useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import { useDirectionsMode } from '@/contexts/DirectionsModeContext';
import type { Coordinates } from '@/types/core';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { useTransitStore } from '@/stores/transit';

// Hook to manage Mapbox Directions control for driving, walking, cycling.
// Only attach MapboxDirections when in non-transit mode and both start and end coordinates are provided.
// If the map isn't loaded yet (no mapRef), in transit mode, or coords are missing, the control is detached and not displayed.
// This ensures Mapbox Navigation UI is only shown for supported routing scenarios.
export function useMapboxDirectionsControl(
  mapRef: React.RefObject<MapRef>,
  mapLoaded: boolean,
  startCoords: Coordinates | null,
  endCoords: Coordinates | null
) {
  const controlRef = useRef<any>(null);
  const { mode } = useDirectionsMode();
  const updateRoute = useTransitStore(state => state.updateRoute);
  const activeRouteId = useTransitStore(state => state.activeRouteId);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();

    // Detach control when switching to transit mode or missing coordinates
    // Covers cases where user selects transit or clears route before starting a trip.
    if (mode === 'transit' || !startCoords || !endCoords) {
      if (controlRef.current) {
        try { map.removeControl(controlRef.current); } catch {}
        controlRef.current = null;
      }
      return;
    }

    // Instantiate control if not already
    if (!controlRef.current) {
      const ctrl = new MapboxDirections({
        accessToken: MAPBOX_ACCESS_TOKEN,
        unit: 'metric',
        profile: `mapbox/${mode}`,
        controls: { inputs: false, instructions: true, profileSwitcher: false },
        alternatives: true,
        interactive: false
      });
      // Sync plugin route events to our store for manual tab UI
      ctrl.on('route', (event: any) => {
        if (!activeRouteId) return;
        const routes = event.route as any[];
        const primary = routes[0];
        const alternatives = routes.slice(1);
        updateRoute(activeRouteId, { mapboxRoute: { ...primary, alternatives } });
      });

      controlRef.current = ctrl;
      map.addControl(ctrl, 'top-left');
    }

    // Update origin/destination
    controlRef.current.setOrigin([startCoords.longitude, startCoords.latitude]);
    controlRef.current.setDestination([endCoords.longitude, endCoords.latitude]);
  }, [mapLoaded, mode, startCoords, endCoords, updateRoute, activeRouteId, mapRef]);
} 