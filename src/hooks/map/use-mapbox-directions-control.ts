import { useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import { useDirectionsMode } from '@/contexts/DirectionsModeContext';
import type { Coordinates } from '@/types/core';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { useTransitStore } from '@/stores/transit';

// Feature flag: disable embedded MapboxDirections control to avoid double-draw.
const ENABLE_EMBEDDED_DIRECTIONS_CONTROL = false;

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
    if (!ENABLE_EMBEDDED_DIRECTIONS_CONTROL) {
      // Ensure detached if previously attached
      if (mapRef.current && controlRef.current) {
        try { mapRef.current.getMap().removeControl(controlRef.current); } catch {}
        controlRef.current = null;
      }
      return;
    }

    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current.getMap();

    if (mode === 'transit' || !startCoords || !endCoords) {
      if (controlRef.current) {
        try { map.removeControl(controlRef.current); } catch {}
        controlRef.current = null;
      }
      return;
    }

    if (!controlRef.current) {
      const ctrl = new MapboxDirections({
        accessToken: MAPBOX_ACCESS_TOKEN,
        unit: 'metric',
        profile: `mapbox/${mode}`,
        controls: { inputs: false, instructions: true, profileSwitcher: false },
        alternatives: true,
        interactive: false
      });
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

    controlRef.current.setOrigin([startCoords.longitude, startCoords.latitude]);
    controlRef.current.setDestination([endCoords.longitude, endCoords.latitude]);
  }, [mapLoaded, mode, startCoords, endCoords, updateRoute, activeRouteId, mapRef]);
} 