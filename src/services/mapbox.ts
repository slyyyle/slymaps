import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { handleApiError } from '@/lib/errors';
import type { Coordinates, TransitMode } from '@/types/core';
import type { Route } from '@/types/directions';

/**
 * Mapbox Services - June 2025 Optimized
 * 
 * NOTE: Manual geocoding functions have been removed as they are now handled
 * by the @mapbox/search-js-react SearchBox component following best practices.
 * 
 * This service now focuses on:
 * - Directions API for routing
 * - Other Mapbox services that don't have dedicated React components
 */

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

  // Map application TransitMode to Mapbox Directions API routing profiles
  // 2025 API supports: driving-traffic, driving, walking, cycling
  const getMapboxProfile = (mode: TransitMode): string => {
    switch (mode) {
      case 'walking':
        return 'walking';
      case 'cycling':
        return 'cycling';
      case 'driving-traffic':
        return 'driving-traffic';
      case 'transit':
        // Transit routing requires specialized APIs - fallback to driving with traffic for route visualization
        console.warn('Transit mode not supported by Mapbox Directions API, using driving-traffic fallback');
        return 'driving-traffic';
      default:
        console.warn(`Unknown transit mode: ${mode}, defaulting to driving-traffic`);
        return 'driving-traffic';
    }
  };

  const profile = getMapboxProfile(mode);
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`;

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