import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import type { Route as MapboxRoute } from '@/types/transit/directions';

/**
 * Hook to render turn/maneuver markers for a Mapbox directions route.
 * Returns an array of Marker elements or null.
 */
export function useMapTurnMarkers(
  route: MapboxRoute | null,
  showTurnMarkers: boolean
) {
  return React.useMemo(() => {
    if (!showTurnMarkers || !route) return null;

    return route.legs.flatMap((leg, legIndex) =>
      leg.steps.flatMap((step, stepIndex) => {
        if (stepIndex === 0 || stepIndex === leg.steps.length - 1) {
          return [];
        }
        const [lon, lat] = step.maneuver.location;
        return (
          <Marker
            key={`turn-${legIndex}-${stepIndex}`}
            longitude={lon}
            latitude={lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              console.log(`Turn point clicked:`, { legIndex, stepIndex, lat, lon });
            }}
          >
            <div
              className="w-3 h-3 bg-green-500 rounded-full border border-white shadow cursor-pointer transition-transform hover:scale-150"
            />
          </Marker>
        );
      })
    );
  }, [route, showTurnMarkers]);
} 