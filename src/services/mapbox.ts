import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { handleApiError } from '@/lib/error-utils';
import type { Coordinates, TransitMode, Route } from '@/types';

/**
 * Fetch a route from the Mapbox Directions API
 */
export async function getDirections(
  start: Coordinates,
  end: Coordinates,
  mode: TransitMode = 'driving-traffic'
): Promise<Route | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error("Mapbox access token is required for directions.");
  }

  const modeString = mode === 'walking' ? 'walking' : 
                     mode === 'cycling' ? 'cycling' : 
                     mode === 'transit' ? 'driving-traffic' : // fallback for transit
                     'driving-traffic';
  const url = `https://api.mapbox.com/directions/v5/mapbox/${modeString}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;

  const response = await fetch(url);

  if (!response.ok) {
    await handleApiError(response, `fetch Mapbox directions`);
  }

  const data = await response.json();

  if (data.routes && data.routes.length > 0) {
    const routeData = data.routes[0];
    return {
      id: `route-${Date.now()}`,
      geometry: routeData.geometry,
      legs: routeData.legs,
      distance: routeData.distance,
      duration: routeData.duration,
    };
  }

  return null;
} 