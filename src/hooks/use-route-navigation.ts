import { useState, useCallback } from 'react';
import type { 
  Route as RouteType, 
  Coordinates, 
  TransitMode, 
  ObaRouteGeometry, 
  CurrentOBARouteDisplayData, 
  ObaVehicleLocation,
  ObaRoute
} from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useParameterizedFetcher } from '@/hooks/use-data-fetcher';
import { getDirections } from '@/services/mapbox';
import { getRouteDetails, getVehiclesForRoute } from '@/services/oba';
import { getErrorMessage } from '@/lib/error-utils';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { log } from '@/lib/logging';

export function useRouteNavigation() {
  const [route, setRoute] = useState<RouteType | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [obaRouteGeometry, setObaRouteGeometry] = useState<ObaRouteGeometry | null>(null);
  const [isLoadingObaRouteGeometry, setIsLoadingObaRouteGeometry] = useState(false);
  const [currentOBARouteDisplayData, setCurrentOBARouteDisplayData] = useState<CurrentOBARouteDisplayData | null>(null);
  const [obaVehicleLocations, setObaVehicleLocations] = useState<ObaVehicleLocation[]>([]);
  const [isLoadingObaVehicles, setIsLoadingObaVehicles] = useState(false);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [routeStartCoords, setRouteStartCoords] = useState<Coordinates | null>(null);
  const [routeEndCoords, setRouteEndCoords] = useState<Coordinates | null>(null);
  const [showDirectionsPopup, setShowDirectionsPopup] = useState(false);

  const { toast } = useToast();

  const fetchVehiclesForObaRoute = useParameterizedFetcher({
    fetcher: getVehiclesForRoute,
    onSuccess: setObaVehicleLocations,
    onError: (error) => {
      // Don't show a toast for this, as it runs in the background
      console.error('Error fetching OBA vehicle locations:', error);
      setObaVehicleLocations([]);
    },
    setLoading: setIsLoadingObaVehicles,
  });

  const fetchDirections = useCallback(async (
    start: Coordinates, 
    end: Coordinates, 
    mode: TransitMode,
    onFlyTo?: (coords: Coordinates, zoom?: number) => void
  ) => {
    if (!MAPBOX_ACCESS_TOKEN) {
      toast({ title: "Configuration Error", description: "Mapbox Access Token is missing.", variant: "destructive" });
      return;
    }

    // Clear previous state
    setRoute(null);
    setObaRouteGeometry(null); 
    setCurrentOBARouteDisplayData(null);
    setObaVehicleLocations([]);
    setRouteStartCoords(start);
    setRouteEndCoords(end);
    setIsLoadingRoute(true);

    try {
      const routeResult = await getDirections(start, end, mode);
      if (routeResult) {
        setRoute(routeResult);
        setShowDirectionsPopup(true);
        if (onFlyTo) {
          onFlyTo({longitude: (start.longitude + end.longitude)/2, latitude: (start.latitude + end.latitude)/2}, 16);
        }
      } else {
        toast({ title: "No Route Found", description: "Could not find a route for the selected destinations.", variant: "default" });
      }
    } catch (error) {
      const description = getErrorMessage(error, "An unknown error occurred while fetching directions.");
      toast({ title: "Error Fetching Directions", description, variant: "destructive" });
    } finally {
      setIsLoadingRoute(false);
    }
  }, [toast]);

  const handleSelectRouteForPath = useCallback(async (
    routeId: string | null | undefined,
    obaReferencedRoutes: Record<string, ObaRoute>,
    onFlyTo?: (coords: Coordinates, zoom?: number) => void
  ) => {
    if (!routeId || typeof routeId !== 'string' || routeId.trim() === '') {
      toast({ title: "Invalid Route ID", description: "A valid OneBusAway Route ID is required to fetch its path.", variant: "destructive" });
      setIsLoadingObaRouteGeometry(false);
      setCurrentOBARouteDisplayData(null);
      setObaRouteGeometry(null);
      setObaVehicleLocations([]);
      return;
    }

    // Clear previous state
    setIsLoadingObaRouteGeometry(true);
    setObaRouteGeometry(null);
    setCurrentOBARouteDisplayData(null);
    setObaVehicleLocations([]); 
    setRoute(null); 

    try {
      const { routeGeometry, routeInfo, stops } = await getRouteDetails(routeId);
      
      // Set route geometry for map display
      if (routeGeometry) {
        setObaRouteGeometry(routeGeometry);
      }

      // Handle route info, checking for fallbacks
      let displayRouteInfo = routeInfo;
      if (!displayRouteInfo && obaReferencedRoutes[routeId]) {
        displayRouteInfo = obaReferencedRoutes[routeId];
      }
      
      if (!displayRouteInfo && stops.length > 0) {
        const shortNameFromId = routeId.includes('_') ? routeId.split('_')[1] : routeId;
        displayRouteInfo = {
          id: routeId,
          shortName: shortNameFromId,
          description: `Route ${shortNameFromId}`,
          agencyId: routeId.includes('_') ? routeId.split('_')[0] : 'Unknown Agency',
        };
      }

      if (displayRouteInfo) {
        setCurrentOBARouteDisplayData({ routeInfo: displayRouteInfo, stops });
        await fetchVehiclesForObaRoute(routeId);
      } else {
        setCurrentOBARouteDisplayData(null); 
        setObaVehicleLocations([]);
      }

      // Handle UI feedback
      if (routeGeometry && routeGeometry.geometry.coordinates.length > 0 && onFlyTo) {
        const firstCoord = routeGeometry.geometry.coordinates[0];
        onFlyTo({ longitude: firstCoord[0], latitude: firstCoord[1] }, 13);
      } else if (!displayRouteInfo && stops.length === 0) { 
        toast({ title: "No Route Data", description: `No path, details, or stops found for route ${routeId}.`, variant: "default" });
      } else if (!routeGeometry && displayRouteInfo) {
        toast({ title: "Route Path Missing", description: `No polyline data found for route ${routeId}, but displaying available stop/route information.`, variant: "default" });
      }

    } catch (error) {
      console.error(`Error fetching OBA route details for ${routeId}:`, error);
      const description = getErrorMessage(error, "An unknown error occurred while fetching route details.");
      toast({ title: "Error Fetching Route Details", description: `Route ID ${routeId}: ${description}`, variant: "destructive" });
      setObaRouteGeometry(null);
      setCurrentOBARouteDisplayData(null);
      setObaVehicleLocations([]);
    } finally {
      setIsLoadingObaRouteGeometry(false);
    }
  }, [toast, fetchVehiclesForObaRoute]);

  const handleSearchResult = useCallback((
    coords: Coordinates, 
    name?: string,
    onFlyTo?: (coords: Coordinates, zoom?: number) => void
  ) => {
    if (onFlyTo) onFlyTo(coords);
    setDestination(coords);
    setRoute(null); 
    setObaRouteGeometry(null);
    setCurrentOBARouteDisplayData(null);
    setObaVehicleLocations([]);
    setRouteStartCoords(null);
    setRouteEndCoords(null);
    if (name) {
      toast({ title: "Location Found", description: `Navigating to ${name}`});
    }
  }, [toast]);

  const handleSetDestination = useCallback((
    coords: Coordinates,
    onFlyTo?: (coords: Coordinates, zoom?: number) => void
  ) => {
    setDestination(coords);
    setRoute(null); 
    setObaRouteGeometry(null);
    setCurrentOBARouteDisplayData(null);
    setObaVehicleLocations([]);
    setRouteStartCoords(null);
    setRouteEndCoords(null);
    if (onFlyTo) onFlyTo(coords, 18);
    log.poi('Destination coordinates set:', coords);
    toast({ title: "Destination Set", description: "Destination selected from map" });
  }, [toast]);

  const handleCloseDirectionsPopup = useCallback(() => {
    setShowDirectionsPopup(false);
    setRoute(null);
    setRouteStartCoords(null);
    setRouteEndCoords(null);
    setDestination(null);
  }, []);

  const clearAllRoutes = useCallback(() => {
    setRoute(null);
    setObaRouteGeometry(null);
    setCurrentOBARouteDisplayData(null);
    setObaVehicleLocations([]);
    setDestination(null);
    setRouteStartCoords(null);
    setRouteEndCoords(null);
    setShowDirectionsPopup(false);
  }, []);

  return {
    // State
    route,
    isLoadingRoute,
    obaRouteGeometry,
    isLoadingObaRouteGeometry,
    currentOBARouteDisplayData,
    obaVehicleLocations,
    isLoadingObaVehicles,
    destination,
    routeStartCoords,
    routeEndCoords,
    showDirectionsPopup,
    
    // Actions
    setDestination,
    fetchDirections,
    handleSelectRouteForPath,
    handleSearchResult,
    handleSetDestination,
    handleCloseDirectionsPopup,
    clearAllRoutes,
  };
} 