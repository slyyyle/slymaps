/**
 * OneBusAway API Service
 * Provides user-friendly methods for interacting with the OBA API
 */

import { ONEBUSAWAY_API_KEY } from '@/lib/constants';
import { handleApiError, isValidApiKey } from '@/lib/errors';
import { rateLimitedRequest, debouncedRateLimitedRequest } from '@/lib/api';
import type { Coordinates, Place } from '@/types/core';
import type { 
  ObaRouteSearchResult, 
  ObaStopSearchResult, 
  ObaNearbySearchResult,
  UnifiedSearchSuggestion,
  ObaRouteGeometry,
  ObaRoute,
  ObaVehicleLocation,
  ObaAgency,
  ObaScheduleEntry,
  ObaTripDetails,
  ObaStopSchedule,
  ObaStopScheduleWithRefs,
  ObaSituation
} from '@/types/transit/oba';
import polyline from '@mapbox/polyline';

const OBA_BASE_URL = 'https://api.pugetsound.onebusaway.org/api/where';

// NEW: Safely parse JSON or return null, and log raw text for debugging
async function safeParseJsonResponse(response: Response): Promise<any | null> {
  const text = await response.text();
  // Handle empty bodies
  if (!text || text.trim() === '') {
    console.warn(`Empty response body for ${response.url}`);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    // Log error and raw text
    console.error(`Failed to parse JSON from ${response.url}:`, err, 'Raw text:', text);
    return null;
  }
}

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
 * Get real-time vehicle locations for a specific route
 */
export async function getVehiclesForRoute(routeId: string): Promise<ObaVehicleLocation[]> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    // Silently return empty array if key is missing, as this is often called automatically
    return [];
  }

  const data = await rateLimitedRequest(async () => {
    const response = await fetch(`${OBA_BASE_URL}/trips-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}&includeReferences=true`);

    if (!response.ok) {
      // This will throw an error which will be caught by the calling hook
      await handleApiError(response, `fetch vehicles for route ${routeId}`);
    }
    
    return await response.json();
  }, `vehicles for route ${routeId}`);
  
  // Debug: log raw trips-for-route API response
  console.debug('🚍 trips-for-route raw response:', data);
  
  // Debug: log individual vehicle status objects
  if (data.data?.list?.length > 0) {
    console.debug('🚌 Sample vehicle status data:', {
      totalVehicles: data.data.list.length,
      sampleVehicle: data.data.list[0],
      sampleStatus: data.data.list[0]?.status
    });
  }
  
  const vehicles: ObaVehicleLocation[] = (data.data?.list as Array<Record<string, any>> || [])
    .map(entry => {
      const status = entry.status as Record<string, any>;
      const position = status?.position as Record<string, number> | undefined;
      if (!status?.vehicleId || !position) return null;
      
      // Find trip reference to get headsign
      const tripRef = data.data?.references?.trips?.find((trip: any) => trip.id === entry.tripId);
      const tripHeadsign = tripRef?.tripHeadsign || null;
      
      // Determine if this is real-time predicted data
      const predicted = status.predicted === true;
      
      // Debug logging for status extraction
      if (process.env.NODE_ENV === 'development') {
        console.log('🚍 Raw OBA status for vehicle:', status.vehicleId, {
          nextStop: status.nextStop,
          nextStopTimeOffset: status.nextStopTimeOffset,
          closestStop: status.closestStop,
          closestStopTimeOffset: status.closestStopTimeOffset,
          predicted: status.predicted,
          phase: status.phase
        });
      }

      const vehicleObject = {
        id: status.vehicleId,
        routeId,
        latitude: position.lat,
        longitude: position.lon,
        tripId: entry.tripId as string,
        tripHeadsign,
        lastUpdateTime: status.lastLocationUpdateTime as number,
        heading: status.orientation as number,
        // Add status fields for stop tracking
        nextStopId: status.nextStop || null,
        nextStopTimeOffset: status.nextStopTimeOffset || null,
        closestStopId: status.closestStop || null,
        closestStopTimeOffset: status.closestStopTimeOffset || null,
        phase: status.phase || null,
        predicted,
        scheduleDeviation: status.scheduleDeviation || null,
        distanceAlongTrip: status.distanceAlongTrip || null,
        totalDistanceAlongTrip: status.totalDistanceAlongTrip || null,
      } as ObaVehicleLocation;

      // Debug logging for vehicle object creation
      if (process.env.NODE_ENV === 'development') {
        console.log('🚙 Created vehicle object:', status.vehicleId, {
          nextStopId: vehicleObject.nextStopId,
          nextStopTimeOffset: vehicleObject.nextStopTimeOffset,
          closestStopId: vehicleObject.closestStopId,
          predicted: vehicleObject.predicted,
          allProps: Object.keys(vehicleObject)
        });
      }

      return vehicleObject;
    })
    .filter((v): v is ObaVehicleLocation => v !== null);

  return vehicles;
}

/**
 * Get comprehensive route details including geometry, stops, and route information
 */
export async function getRouteDetails(routeId: string): Promise<{
  routeInfo: ObaRoute | null;
  branches: { branchIdx: number; name: string; segments: ObaRouteGeometry[]; stops: Place[] }[];
}> {
  // Ensure we use the raw OBA route ID (strip any store prefix)
  const effectiveRouteId = routeId.startsWith('oba-') ? routeId.slice(4) : routeId;

  if (!routeId || typeof routeId !== 'string' || routeId.trim() === '') {
    throw new Error('A valid OneBusAway Route ID is required to fetch its details.');
  }

  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API Key is missing. Cannot fetch route details.');
  }

  // Get route geometry, details, and stops from the enhanced service
  const {
    routeDetails: enhancedRouteDetails,
    branches: enhancedBranches
  } = await getRouteShapes(routeId);

  // For backward compatibility, try fetching full API response for references (but don't error on rate limits)
  let routeInfo: ObaRoute | null = null;
  try {
    const data = await rateLimitedRequest(async () => {
      const url = `${OBA_BASE_URL}/stops-for-route/${effectiveRouteId}.json?key=${ONEBUSAWAY_API_KEY}&includePolylines=true&includeReferences=true`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    }, `route details for ${routeId}`);
    const dataData = data?.data as Record<string, unknown>;
    const references = dataData?.references as Record<string, unknown>;

    if (dataData && references?.routes && Array.isArray(references.routes) && references.routes.length > 0) {
      const refRoute = (references.routes as ObaRoute[]).find(r => r.id === effectiveRouteId) || references.routes[0] as ObaRoute;
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
  } catch (error) {
    console.error(`Error fetching fallback route details for ${routeId}:`, error);
  }

  // Prefer enhanced route details if available
  if (enhancedRouteDetails) {
    routeInfo = enhancedRouteDetails;
  }

  return {
    routeInfo,
    branches: enhancedBranches as any
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
  routeSegments: ObaRouteGeometry[];
  routeDetails: ObaRoute | null;
  stopsBySegment: ObaStopSearchResult[][];
  branches: { branchIdx: number; name: string; segments: ObaRouteGeometry[]; stops: ObaStopSearchResult[] }[];
}> {
  const baseUrl = 'https://api.pugetsound.onebusaway.org/api/where';
  
  // Ensure we use the raw OBA route ID (strip any store prefix)
  const effectiveRouteId = routeId.startsWith('oba-') ? routeId.slice(4) : routeId;
  
  try {
    const data = await rateLimitedRequest(async () => {
      const url = `${baseUrl}/stops-for-route/${effectiveRouteId}.json?key=${ONEBUSAWAY_API_KEY}&includePolylines=true&includeReferences=true`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    }, 'route shapes');
    
    // Process polylines into separate route segments
    const routeSegments: ObaRouteGeometry[] = [];
    if (data.data?.entry?.polylines?.length > 0) {
      data.data.entry.polylines.forEach((encoded: Record<string, unknown>, idx: number) => {
        try {
          const coords: number[][] = polyline.decode(encoded.points as string)
            .map(([lat, lon]) => [lon, lat]);
          if (coords.length > 0) {
            routeSegments.push({
              type: "Feature",
              geometry: { type: "LineString", coordinates: coords },
              properties: { routeId, segmentIndex: idx }
            });
          }
        } catch (error) {
          console.warn(`Failed to decode polyline segment ${idx}:`, error);
        }
      });
    }
    
    // Extract route details from references
    let routeDetails: ObaRoute | null = null;
    if (data.data?.references?.routes) {
      routeDetails = data.data.references.routes.find((r: Record<string, unknown>) => r.id === routeId) || null;
    }
    
    // Extract stops per segment
    const stopsBySegment: ObaStopSearchResult[][] = [];
    if (data.data?.entry?.stopGroupings) {
      data.data.entry.stopGroupings.forEach((grouping: Record<string, unknown>) => {
        const segmentStops: ObaStopSearchResult[] = [];
        (grouping.stopGroups as Record<string, unknown>[])?.forEach((group: Record<string, unknown>) => {
          (group.stopIds as string[])?.forEach((stopId: string) => {
            const stopRef = data.data.references?.stops?.find((s: Record<string, unknown>) => s.id === stopId);
            if (stopRef) {
              segmentStops.push({
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
        stopsBySegment.push(segmentStops);
      });
    }
    
    // Build per-branch variants
    const directionGrouping = data.data.entry.stopGroupings?.find((g: any) => (g as any).type === 'direction');
    const branches = (directionGrouping?.stopGroups as any[] || []).map((group: any, branchIdx: number) => {
      const segments: ObaRouteGeometry[] = (group.polylines as any[] || []).map((encoded, segIdx) => {
        const coords: number[][] = polyline.decode(encoded.points as string).map(([lat, lon]) => [lon, lat]);
        return ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: { routeId, branchIdx, segmentIndex: segIdx }
        } as ObaRouteGeometry);
      });
      const stops = (group.stopIds as string[] || [])
        .map(stopId => {
          const ref = data.data.references?.stops?.find((s: any) => s.id === stopId);
          if (!ref) return null;
          return {
            id: ref.id as string,
            name: ref.name as string,
            code: ref.code as string,
            latitude: ref.lat as number,
            longitude: ref.lon as number,
            direction: (ref.direction as string) || 'N',
            routeIds: (ref.routeIds as string[]) || []
          } as ObaStopSearchResult;
        })
        .filter((s): s is ObaStopSearchResult => s !== null);
      return { branchIdx, name: (group.name as any).name as string, segments, stops };
    });
    
    return {
      routeSegments,
      routeDetails,
      stopsBySegment,
      branches
    };
    
  } catch (error) {
    console.error('Error fetching route shapes:', error);
    // Return empty shapes on error to avoid breaking route loading
    return {
      routeSegments: [],
      routeDetails: null,
      stopsBySegment: [],
      branches: []
    };
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
        geometry: result.routeSegments[0] || null,
        details: result.routeDetails,
        stops: result.stopsBySegment[0] || [],
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
  // Strip any store prefix to get the raw OBA route ID
  const effectiveRouteId = routeId.startsWith('oba-') ? routeId.slice(4) : routeId;
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const scheduleUrl = `${OBA_BASE_URL}/schedule-for-route/${effectiveRouteId}.json?key=${ONEBUSAWAY_API_KEY}`;
  const response = await fetch(scheduleUrl);
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

export async function getStopSchedule(stopId: string): Promise<ObaStopScheduleWithRefs> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const response = await fetch(`${OBA_BASE_URL}/schedule-for-stop/${stopId}.json?key=${ONEBUSAWAY_API_KEY}`);
  if (!response.ok) {
    await handleApiError(response, `fetch schedule for stop ${stopId}`);
  }
  const data = await response.json();
  // Extract entry and references
  const entry = data.data?.entry as ObaStopSchedule;
  const references = data.data?.references;
  return { entry, references };
}

/**
 * Helper function to extract situations for a specific stop from API references
 * This works with any OBA API response that includes references
 */
export function getSituationsForStopFromReferences(
  references: any, 
  stopId: string
): ObaSituation[] {
  if (!references?.situations) {
    return [];
  }
  
  return references.situations.filter((situation: ObaSituation) => {
    // Check if this situation affects the specific stop
    return situation.affects?.stopIds?.includes(stopId) || false;
  });
}

/**
 * Helper function to extract situations for a specific route from API references
 * This works with any OBA API response that includes references  
 */
export function getSituationsForRouteFromReferences(
  references: any,
  routeId: string
): ObaSituation[] {
  if (!references?.situations) {
    return [];
  }
  
  return references.situations.filter((situation: ObaSituation) => {
    // Check if this situation affects the specific route
    return situation.affects?.routeIds?.includes(routeId) || false;
  });
}

/**
 * Fetch arrivals and departures for a stop (includes situations in references)
 */
/**
 * Get stop details by stop ID
 */
export async function getStopDetails(stopId: string): Promise<ObaStopSearchResult | null> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    return null;
  }

  try {
    const response = await fetch(`${OBA_BASE_URL}/stop/${stopId}.json?key=${ONEBUSAWAY_API_KEY}`);
    if (!response.ok) {
      console.warn(`Failed to fetch stop details for ${stopId}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    const stop = data.data?.entry;
    
    if (!stop) return null;
    
    return {
      id: stop.id,
      name: stop.name,
      code: stop.code,
      latitude: stop.lat,
      longitude: stop.lon,
      direction: stop.direction || 'N',
      routeIds: stop.routeIds || []
    };
  } catch (error) {
    console.warn(`Error fetching stop details for ${stopId}:`, error);
    return null;
  }
}

export async function getArrivalsAndDeparturesForStop(stopId: string): Promise<{
  arrivals: any[];
  references: any;
}> {
  if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
    throw new Error('OneBusAway API key is required');
  }

  const response = await fetch(`${OBA_BASE_URL}/arrivals-and-departures-for-stop/${stopId}.json?key=${ONEBUSAWAY_API_KEY}`);
  if (!response.ok) {
    await handleApiError(response, `fetch arrivals for stop ${stopId}`);
  }
  const data = await response.json();
  return {
    arrivals: data.data?.entry?.arrivalsAndDepartures || [],
    references: data.data?.references || {}
  };
} 