import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { handleApiError } from '@/lib/errors';
import type { Coordinates, TransitMode } from '@/types/core';
import type { Route } from '@/types/transit/directions';

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
  mode: TransitMode = 'driving'
): Promise<Route | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error("Mapbox access token is required for directions.");
  }

  // Map application TransitMode to Mapbox Directions API routing profiles
  const getMapboxProfile = (mode: TransitMode): string => {
    switch (mode) {
      case 'walking': return 'walking';
      case 'cycling': return 'cycling';
      case 'driving':
        return 'driving';
      case 'transit':
        console.warn('Transit mode not supported by Mapbox, using driving');
        return 'driving';
      default: console.warn(`Unknown transit mode: ${mode}, defaulting to driving`); return 'driving';
    }
  };

  const profile = getMapboxProfile(mode);

  // Request parameters: alternative routes, traffic annotations, voice and banner instructions
  const baseUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
  const params = new URLSearchParams({
    geometries: 'geojson',
    overview:   'full',
    steps:      'true',
    alternatives: 'true',
    annotations: 'congestion,duration,distance,maxspeed',
    banner_instructions: 'true',
    voice_instructions:  'true',
    voice_units:         'metric',
    access_token: MAPBOX_ACCESS_TOKEN,
  });

  const url = `${baseUrl}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response, `fetch Mapbox directions`);

  const data = await response.json();
  if (data.routes && data.routes.length > 0) {
    // Parse all Mapbox routes into our Route type
    const allRoutes: Route[] = data.routes.map((routeData: any) => ({
      id: `mapbox-${Date.now()}-${Math.random().toString(36).substr(2,6)}`,
      geometry: routeData.geometry,
      legs: routeData.legs.map((leg: any) => ({
        steps: leg.steps.map((step: any) => ({
          maneuver: step.maneuver,
          distance: step.distance,
          duration: step.duration,
          geometry: step.geometry,
          bannerInstructions: step.banner_instructions,
          voiceInstructions: step.voice_instructions,
        })),
        summary: leg.summary,
        distance: leg.distance,
        duration: leg.duration,
      })),
      distance: routeData.distance,
      duration: routeData.duration,
    }));

    // Attach alternatives onto primary route
    const primary = allRoutes[0];
    if (allRoutes.length > 1) {
      primary.alternatives = allRoutes.slice(1);
    }
    return primary;
  }

  return null;
} 