/**
 * OneBusAway API Service
 * Provides user-friendly methods for interacting with the OBA API
 */

import { ONEBUSAWAY_API_KEY } from '@/lib/constants';
import { handleApiError, isValidApiKey } from '@/lib/errors';
import { rateLimitedRequest, debouncedRateLimitedRequest } from '@/lib/api';
import type { Coordinates, PointOfInterest } from '@/types/core';
import type { 
  ObaRouteSearchResult, 
  ObaStopSearchResult, 
  ObaNearbySearchResult,
  UnifiedSearchSuggestion,
  ObaRouteGeometry,
  ObaRoute,
  ObaArrivalDeparture,
  ObaVehicleLocation,
  ObaAgency,
  ObaScheduleEntry,
  ObaTripDetails,
  ObaStopSchedule
} from '@/types/oba';
import polyline from '@mapbox/polyline';

const OBA_BASE_URL = 'https://api.pugetsound.onebusaway.org/api/where';

/**
 * Get all agencies with coverage to understand the service area
 */
export async function getAgenciesWithCoverage(): Promise<unknown[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const data = await rateLimitedRequest(async () => {
    const response = await fetch(`${OBA_BASE_URL}/agencies-with-coverage.json?key=${ONEBUSAWAY_API_KEY}`);
    
    if (!response.ok) {
      await handleApiError(response, 'fetch agencies with coverage');
    }

    return await response.json();
  }, 'agencies with coverage');

  return data.data?.list || [];
}

/**
 * Search for routes by short name (e.g., "40", "550", "Link")
 */
export async function searchRoutesByName(
  query: string,
  coordinates: Coordinates,
  limit: number = 5
): Promise<ObaRouteSearchResult[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  if (!query.trim()) {
    return [];
  }

  try {
    const data = await debouncedRateLimitedRequest(async () => {
      const response = await fetch(
        `${OBA_BASE_URL}/routes-for-location.json?key=${ONEBUSAWAY_API_KEY}&lat=${coordinates.latitude}&lon=${coordinates.longitude}&query=${query}&radius=50000`
      );

      if (!response.ok) {
        await handleApiError(response, 'search routes');
      }

      return await response.json();
    }, 300, 'route search');

    const routes = data.data?.list || [];

    return routes.slice(0, limit).map((route: Record<string, unknown>) => ({
      id: route.id as string,
      shortName: route.shortName as string,
      longName: route.longName as string,
      description: route.description as string,
      agencyId: route.agencyId as string,
      agencyName: (route.agency as Record<string, unknown>)?.name as string,
      url: route.url as string,
      color: route.color as string,
      textColor: route.textColor as string,
      type: route.type as number,
    }));
  } catch (error) {
    console.error('Error searching routes:', error);
    return [];
  }
}

/**
 * Search for stops using the OBA search API
 */
export async function searchStops(query: string, limit: number = 5): Promise<ObaStopSearchResult[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  if (!query.trim()) {
    return [];
  }

  try {
    const data = await debouncedRateLimitedRequest(async () => {
      const response = await fetch(`${OBA_BASE_URL}/search/stop.json?input=${encodeURIComponent(query)}&maxCount=${limit}&key=${ONEBUSAWAY_API_KEY}`);
      
      if (!response.ok) {
        await handleApiError(response, 'search stops');
      }

      return await response.json();
    }, 300, 'stop search');

    const stops = data.data?.list || [];

    return stops.map((stop: Record<string, unknown>) => ({
      id: stop.id as string,
      name: stop.name as string,
      code: stop.code as string,
      direction: stop.direction as string,
      latitude: stop.lat as number,
      longitude: stop.lon as number,
      routeIds: (stop.routeIds as string[]) || [],
      wheelchairBoarding: stop.wheelchairBoarding as string,
      locationType: stop.locationType as number,
    }));
  } catch (error) {
    console.error('Error searching stops:', error);
    return [];
  }
}

/**
 * Find nearby transit (stops and routes) for a given location
 */
export async function findNearbyTransit(
  coordinates: Coordinates, 
  radiusMeters: number = 800
): Promise<ObaNearbySearchResult> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  try {
    // Calculate lat/lon spans based on radius
    const latSpan = (radiusMeters / 111320); // roughly meters to degrees latitude
    const lonSpan = (radiusMeters / (111320 * Math.cos(coordinates.latitude * Math.PI / 180)));

    const data = await rateLimitedRequest(async () => {
      const response = await fetch(
        `${OBA_BASE_URL}/stops-for-location.json?key=${ONEBUSAWAY_API_KEY}&lat=${coordinates.latitude}&lon=${coordinates.longitude}&latSpan=${latSpan}&lonSpan=${lonSpan}&includeReferences=true`
      );

      if (!response.ok) {
        await handleApiError(response, 'find nearby transit');
      }

      return await response.json();
    }, 'nearby transit search');
    const stops = data.data?.list || [];
    const referencedRoutes = data.data?.references?.routes || [];

    const stopResults: ObaStopSearchResult[] = stops.map((stop: Record<string, unknown>) => ({
      id: stop.id as string,
      name: stop.name as string,
      code: stop.code as string,
      direction: stop.direction as string,
      latitude: stop.lat as number,
      longitude: stop.lon as number,
      routeIds: (stop.routeIds as string[]) || [],
      wheelchairBoarding: stop.wheelchairBoarding as string,
      locationType: stop.locationType as number,
    }));

    const routeResults: ObaRouteSearchResult[] = referencedRoutes.map((route: Record<string, unknown>) => ({
      id: route.id as string,
      shortName: route.shortName as string,
      longName: route.longName as string,
      description: route.description as string,
      agencyId: route.agencyId as string,
      url: route.url as string,
      color: route.color as string,
      textColor: route.textColor as string,
      type: route.type as number,
    }));

    return {
      stops: stopResults,
      routes: routeResults,
      searchLocation: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius: radiusMeters,
      },
    };
  } catch (error) {
    console.error('Error finding nearby transit:', error);
    return {
      stops: [],
      routes: [],
      searchLocation: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius: radiusMeters,
      },
    };
  }
}

/**
 * Get arrivals and departures for a specific stop
 */
export async function getArrivalsForStop(stopId: string): Promise<ObaArrivalDeparture[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const data = await rateLimitedRequest(async () => {
    const response = await fetch(`${OBA_BASE_URL}/arrivals-and-departures-for-stop/${stopId}.json?key=${ONEBUSAWAY_API_KEY}&minutesBefore=0&minutesAfter=60&includeReferences=false`);
        
    if (!response.ok) {
      await handleApiError(response, `fetch arrivals for stop ${stopId}`);
    }

    return await response.json();
  }, `arrivals for stop ${stopId}`);

  const arrivals: ObaArrivalDeparture[] = data.data?.entry?.arrivalsAndDepartures.map((ad: Record<string, unknown>) => ({
    routeId: ad.routeId as string,
    routeShortName: ad.routeShortName as string,
    tripId: ad.tripId as string,
    tripHeadsign: ad.tripHeadsign as string,
    stopId: ad.stopId as string,
    scheduledArrivalTime: ad.scheduledArrivalTime as number,
    predictedArrivalTime: ad.predictedArrivalTime !== 0 ? ad.predictedArrivalTime as number : null,
    status: ad.status as string,
    vehicleId: ad.vehicleId as string,
    distanceFromStop: ad.distanceFromStop as number,
    lastUpdateTime: ad.lastKnownLocationUpdateTime as number, 
  })) || [];
  
  return arrivals;
}

/**
 * Get real-time vehicle locations for a specific route
 */
export async function getVehiclesForRoute(routeId: string): Promise<ObaVehicleLocation[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    // Silently return empty array if key is missing, as this is often called automatically
    return [];
  }

  const data = await rateLimitedRequest(async () => {
    const response = await fetch(`${OBA_BASE_URL}/vehicles-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}&includeReferences=false`);

    if (!response.ok) {
      // This will throw an error which will be caught by the calling hook
      await handleApiError(response, `fetch vehicles for route ${routeId}`);
    }
    
    return await response.json();
  }, `vehicles for route ${routeId}`);
  
  const vehicles: ObaVehicleLocation[] = data.data?.list?.map((v: Record<string, unknown>) => ({
    id: v.vehicleId as string,
    routeId: routeId,
    latitude: (v.location as Record<string, unknown>).lat as number,
    longitude: (v.location as Record<string, unknown>).lon as number,
    tripId: v.tripId as string,
    tripHeadsign: (v.trip as Record<string, unknown>)?.tripHeadsign as string,
    lastUpdateTime: v.lastLocationUpdateTime as number,
  })) || [];

  return vehicles;
}

/**
 * Get comprehensive route details including geometry, stops, and route information
 */
export async function getRouteDetails(routeId: string): Promise<{
  routeGeometry: ObaRouteGeometry | null;
  routeInfo: ObaRoute | null; 
  stops: PointOfInterest[];
}> {
  if (!routeId || typeof routeId !== 'string' || routeId.trim() === '') {
    throw new Error('A valid OneBusAway Route ID is required to fetch its details.');
  }

  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API Key is missing. Cannot fetch route details.');
  }

  // Get route geometry and details from the enhanced service
  const { routeGeometry, routeDetails: enhancedRouteDetails } = await getRouteShapes(routeId);

  // For backward compatibility, still fetch full API response for stops and other data
  const data = await rateLimitedRequest(async () => {
    const response = await fetch(`${OBA_BASE_URL}/stops-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}&includePolylines=true&includeReferences=true`);

    if (!response.ok) {
      await handleApiError(response, `fetch route details for ${routeId}`);
    }

    return await response.json();
  }, `route details for ${routeId}`);
  const dataData = data?.data as Record<string, unknown>;
  const references = dataData?.references as Record<string, unknown>;

  // Extract route details from references
  let routeInfo: ObaRoute | null = null;
  if (dataData && references?.routes && Array.isArray(references.routes) && references.routes.length > 0) {
    const refRoute = (references.routes as ObaRoute[]).find(r => r.id === routeId) || references.routes[0] as ObaRoute;
    if (refRoute) {
      routeInfo = {
        id: refRoute.id,
        shortName: refRoute.shortName,
        longName: refRoute.longName,
        description: refRoute.description,
        agencyId: refRoute.agencyId,
        agency: (references.agencies as ObaAgency[])?.find(a => a.id === refRoute.agencyId),
        url: refRoute.url,
        color: refRoute.color,
        textColor: refRoute.textColor,
        type: refRoute.type,
      };
    }
  }

  // Prefer enhanced route details if available
  if (enhancedRouteDetails) {
    routeInfo = enhancedRouteDetails;
  }

  // Extract stops
  let stops: PointOfInterest[] = [];
  if (dataData?.list && Array.isArray(dataData.list)) {
    stops = dataData.list.map((stop: Record<string, unknown>) => ({
      id: stop.id as string,
      name: stop.name as string,
      type: 'Bus Stop',
      latitude: stop.lat as number,
      longitude: stop.lon as number,
      isObaStop: true,
      direction: stop.direction as string,
      code: stop.code as string,
      routeIds: (stop.routeIds as string[]) || [], 
      locationType: stop.locationType as number,
      wheelchairBoarding: stop.wheelchairBoarding as string,
    }));
  }

  return {
    routeGeometry,
    routeInfo,
    stops,
  };
}

/**
 * Get popular/frequent routes for the region
 */
export async function getPopularRoutes(agencyId: string = '1', limit: number = 20): Promise<ObaRouteSearchResult[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  try {
    const data = await rateLimitedRequest(async () => {
      // Get routes for the specified agency
      const response = await fetch(`${OBA_BASE_URL}/routes-for-agency/${agencyId}.json?key=${ONEBUSAWAY_API_KEY}`);
      
      if (!response.ok) {
        await handleApiError(response, 'get popular routes');
      }

      return await response.json();
    }, `popular routes for agency ${agencyId}`);
    const routes = data.data?.list || [];

    // Sort by route number (treating as numbers when possible) and return top routes
    const sortedRoutes = routes
      .filter((route: Record<string, unknown>) => route.shortName) // Only routes with short names
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aNum = parseInt(a.shortName as string);
        const bNum = parseInt(b.shortName as string);
        
        // If both are numbers, sort numerically
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        
        // If one is a number and one isn't, numbers first
        if (!isNaN(aNum) && isNaN(bNum)) return -1;
        if (isNaN(aNum) && !isNaN(bNum)) return 1;
        
        // If neither are numbers, sort alphabetically
        return (a.shortName as string).localeCompare(b.shortName as string);
      })
      .slice(0, limit);

    return sortedRoutes.map((route: Record<string, unknown>) => ({
      id: route.id as string,
      shortName: route.shortName as string,
      longName: route.longName as string,
      description: route.description as string,
      agencyId: route.agencyId as string,
      url: route.url as string,
      color: route.color as string,
      textColor: route.textColor as string,
      type: route.type as number,
    }));
  } catch (error) {
    console.error('Error getting popular routes:', error);
    return [];
  }
}

/**
 * Fetches search suggestions for a given query, combining results from multiple sources.
 */
export async function getSearchSuggestions(
  query: string,
  coordinates?: Coordinates
): Promise<UnifiedSearchSuggestion[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    return [];
  }

  if (!query.trim()) {
    return [];
  }

  try {
    const suggestions: UnifiedSearchSuggestion[] = [];

    // Default to Seattle center if no coordinates provided (bbox filtering handles geographic relevance)
    const searchCoordinates = coordinates || { latitude: 47.6062, longitude: -122.3321 };

    // Search routes
    const routes = await searchRoutesByName(query, searchCoordinates, 5);
    routes.forEach(route => {
      suggestions.push({
        type: 'route',
        id: route.id,
        title: `Route ${route.shortName}`,
        subtitle: route.longName || route.description,
        data: route,
      });
    });

    // Search stops
    const stops = await searchStops(query, 5);
    stops.forEach(stop => {
      suggestions.push({
        type: 'stop',
        id: stop.id,
        title: stop.name,
        subtitle: `Stop #${stop.code} - ${stop.direction} bound`,
        data: stop,
      });
    });

    return suggestions;
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return [];
  }
}

/**
 * Fetches route shapes/polylines for drawing routes on the map
 * Uses the stops-for-route API with polylines enabled
 */
export async function getRouteShapes(routeId: string): Promise<{
  routeGeometry: ObaRouteGeometry | null;
  routeDetails: ObaRoute | null;
  stops: ObaStopSearchResult[];
}> {
  const baseUrl = 'https://api.pugetsound.onebusaway.org/api/where';
  
  try {
    const data = await rateLimitedRequest(async () => {
      const response = await fetch(
        `${baseUrl}/stops-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}&includePolylines=true&includeReferences=true`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    }, 'route shapes');
    
    if (data.code !== 200) {
      throw new Error(`OBA API error: ${data.text || 'Unknown error'}`);
    }
    
    // Process polylines into route geometry
    let routeGeometry: ObaRouteGeometry | null = null;
    if (data.data?.entry?.polylines?.length > 0) {
      const allCoordinates: number[][] = [];
      
      data.data.entry.polylines.forEach((encodedPolyline: Record<string, unknown>) => {
        try {
          const decoded = polyline.decode(encodedPolyline.points as string);
          // Convert from [lat, lng] to [lng, lat] for GeoJSON
          decoded.forEach(coordPair => {
            allCoordinates.push([coordPair[1], coordPair[0]]);
          });
        } catch (error) {
          console.warn('Failed to decode polyline:', error);
        }
      });
      
      if (allCoordinates.length > 0) {
        routeGeometry = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: allCoordinates
          },
          properties: {
            routeId: routeId
          }
        };
      }
    }
    
    // Extract route details from references
    let routeDetails: ObaRoute | null = null;
    if (data.data?.references?.routes) {
      routeDetails = data.data.references.routes.find((r: Record<string, unknown>) => r.id === routeId) || null;
    }
    
    // Extract stops
    const stops: ObaStopSearchResult[] = [];
    if (data.data?.entry?.stopGroupings) {
      data.data.entry.stopGroupings.forEach((grouping: Record<string, unknown>) => {
        (grouping.stopGroups as Record<string, unknown>[])?.forEach((group: Record<string, unknown>) => {
          (group.stopIds as string[])?.forEach((stopId: string) => {
            const stopRef = data.data.references?.stops?.find((s: Record<string, unknown>) => s.id === stopId);
            if (stopRef) {
                             stops.push({
                 id: stopRef.id as string,
                 name: stopRef.name as string,
                 code: stopRef.code as string,
                 latitude: stopRef.lat as number,
                 longitude: stopRef.lon as number,
                 direction: (stopRef.direction as string) || 'N',
                 routeIds: (stopRef.routeIds as string[]) || []
               });
            }
          });
        });
      });
    }
    
    return {
      routeGeometry,
      routeDetails,
      stops
    };
    
  } catch (error) {
    console.error('Error fetching route shapes:', error);
    throw error;
  }
}

/**
 * Fetches multiple route shapes for comparison or display
 */
export async function getMultipleRouteShapes(routeIds: string[]): Promise<{
  routes: Array<{
    routeId: string;
    geometry: ObaRouteGeometry | null;
    details: ObaRoute | null;
    stops: ObaStopSearchResult[];
    color: string;
  }>;
}> {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Purple
    '#85C1E9'  // Light Blue
  ];
  
  const promises = routeIds.map(async (routeId, index) => {
    try {
      const result = await getRouteShapes(routeId);
      return {
        routeId,
        geometry: result.routeGeometry,
        details: result.routeDetails,
        stops: result.stops,
        color: colors[index % colors.length]
      };
    } catch (error) {
      console.error(`Failed to fetch route ${routeId}:`, error);
      return {
        routeId,
        geometry: null,
        details: null,
        stops: [],
        color: colors[index % colors.length]
      };
    }
  });
  
  const routes = await Promise.all(promises);
  
  return { routes };
}

// Add new OBA service wrappers for sidebar explorer
export async function getRoutesForAgency(agencyId: string): Promise<ObaRouteSearchResult[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const response = await fetch(`${OBA_BASE_URL}/routes-for-agency/${agencyId}.json?key=${ONEBUSAWAY_API_KEY}`);
  if (!response.ok) {
    await handleApiError(response, `fetch routes for agency ${agencyId}`);
  }
  const data = await response.json();
  const routes = data.data?.list || [];
  return routes.map((route: Record<string, unknown>) => ({
    id: route.id as string,
    shortName: route.shortName as string,
    longName: route.longName as string,
    description: route.description as string,
    agencyId: route.agencyId as string,
    agencyName: (route.agency as Record<string, unknown>)?.name as string,
    url: route.url as string,
    color: route.color as string,
    textColor: route.textColor as string,
    type: route.type as number,
  }));
}

export async function getScheduleForRoute(routeId: string): Promise<ObaScheduleEntry> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const response = await fetch(`${OBA_BASE_URL}/schedule-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}`);
  if (!response.ok) {
    await handleApiError(response, `fetch schedule for route ${routeId}`);
  }
  const data = await response.json();
  return data.data?.entry || data.data;
}

export async function getTripDetails(tripId: string): Promise<ObaTripDetails> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const response = await fetch(`${OBA_BASE_URL}/trip-details/${tripId}.json?key=${ONEBUSAWAY_API_KEY}`);
  if (!response.ok) {
    await handleApiError(response, `fetch trip details for ${tripId}`);
  }
  const data = await response.json();
  return data.data?.entry || data.data;
}

// Add new OBA service wrappers for additional sidebar explorer features
export async function getSituationsForAgency(agencyId: string): Promise<unknown[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const response = await fetch(`${OBA_BASE_URL}/situations-for-agency/${agencyId}.json?key=${ONEBUSAWAY_API_KEY}`);
  if (!response.ok) {
    await handleApiError(response, `fetch situations for agency ${agencyId}`);
  }
  const data = await response.json();
  return data.data?.list || [];
}

export async function getStopSchedule(stopId: string): Promise<ObaStopSchedule> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const response = await fetch(`${OBA_BASE_URL}/schedule-for-stop/${stopId}.json?key=${ONEBUSAWAY_API_KEY}`);
  if (!response.ok) {
    await handleApiError(response, `fetch schedule for stop ${stopId}`);
  }
  const data = await response.json();
  return data.data?.entry || data.data;
} 