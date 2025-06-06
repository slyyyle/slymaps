"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ViewState, MapRef } from 'react-map-gl';
// Removed: import { FlyToInterpolator } from 'react-map-gl'; 
import dynamic from 'next/dynamic';
import polyline from '@mapbox/polyline';
import { MapView } from '@/components/map-view';
import { SidebarControls } from '@/components/sidebar-controls';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { INITIAL_VIEW_STATE, MAP_STYLES, MAPBOX_ACCESS_TOKEN, ONEBUSAWAY_API_KEY } from '@/lib/constants';
import type { PointOfInterest, MapStyle, Route as RouteType, Coordinates, TransitMode, ObaArrivalDeparture, ObaPolyline, ObaRouteGeometry, ObaRoute, CurrentOBARouteDisplayData, ObaVehicleLocation, ObaAgency } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, handleApiError, isValidApiKey } from '@/lib/error-utils';
import { log } from '@/lib/logging';
import { getTimeBasedLightingPreset } from '@/lib/time-utils';

const SearchBar = dynamic(() => import('@/components/search-bar').then(mod => mod.SearchBar), { 
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading search...</div> 
});

export function AppShell() {
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [obaStopsData, setObaStopsData] = useState<PointOfInterest[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const [obaStopArrivals, setObaStopArrivals] = useState<ObaArrivalDeparture[]>([]);
  const [isLoadingArrivals, setIsLoadingArrivals] = useState(false);
  const [obaReferencedRoutes, setObaReferencedRoutes] = useState<Record<string, ObaRoute>>({});

  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>(MAP_STYLES[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  
  const [route, setRoute] = useState<RouteType | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  
  const [obaRouteGeometry, setObaRouteGeometry] = useState<ObaRouteGeometry | null>(null);
  const [isLoadingObaRouteGeometry, setIsLoadingObaRouteGeometry] = useState(false);
  const [currentOBARouteDisplayData, setCurrentOBARouteDisplayData] = useState<CurrentOBARouteDisplayData | null>(null);
  const [obaVehicleLocations, setObaVehicleLocations] = useState<ObaVehicleLocation[]>([]);
  const [isLoadingObaVehicles, setIsLoadingObaVehicles] = useState(false);
  const [currentLightPreset, setCurrentLightPreset] = useState<'day' | 'dusk' | 'dawn' | 'night'>('day');
  const [isAutoLighting, setIsAutoLighting] = useState<boolean>(true);

  const { toast } = useToast();

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN) {
      log.error("Mapbox Access Token is missing. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.");
      toast({
        title: "Configuration Error",
        description: "Mapbox Access Token is missing. Maps may not function correctly.",
        variant: "destructive",
      });
    }
    if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
      log.error("OneBusAway API Key is missing. Please set NEXT_PUBLIC_ONEBUSAWAY_API_KEY environment variable.");
      toast({
        title: "Configuration Error",
        description: "OneBusAway API Key is missing. Real-time transit features will be unavailable.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchObaStops = useCallback(async (currentMap: MapRef) => {
    if (!isValidApiKey(ONEBUSAWAY_API_KEY)) return;

    const map = currentMap.getMap();
    const bounds = map.getBounds();
    if (!bounds) return;
    
    const center = map.getCenter();
    
    const lat = center.lat;
    const lon = center.lng;
    const latSpan = Math.abs(bounds.getNorthEast().lat - bounds.getSouthWest().lat);
    const lonSpan = Math.abs(bounds.getNorthEast().lng - bounds.getSouthWest().lng);

    if (latSpan > 0.05 || lonSpan > 0.05) { 
        setObaStopsData([]); 
        return;
    }

    try {
      const apiUrl = `https://api.pugetsound.onebusaway.org/api/where/stops-for-location.json?key=${ONEBUSAWAY_API_KEY}&lat=${lat}&lon=${lon}&latSpan=${latSpan}&lonSpan=${lonSpan}&includeReferences=true`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        await handleApiError(response, "fetch OBA stops");
      }
      const data = await response.json();
      if (data.data && data.data.list) {
        const fetchedStops: PointOfInterest[] = data.data.list.map((stop: any) => ({
          id: stop.id,
          name: stop.name,
          type: 'Bus Stop', 
          latitude: stop.lat,
          longitude: stop.lon,
          isObaStop: true,
          direction: stop.direction,
          code: stop.code,
          routeIds: stop.routeIds || [],
          locationType: stop.locationType,
          wheelchairBoarding: stop.wheelchairBoarding,
        }));
        setObaStopsData(fetchedStops);

        if (data.data.references && data.data.references.routes) {
          const newReferencedRoutes: Record<string, ObaRoute> = {};
          (data.data.references.routes as ObaRoute[]).forEach(route => {
            newReferencedRoutes[route.id] = route;
          });
          setObaReferencedRoutes(prev => ({ ...prev, ...newReferencedRoutes }));
        }

      } else {
        setObaStopsData([]);
      }
    } catch (error) {
      log.error("Error fetching OBA stops:", error);
      const description = getErrorMessage(error, "An unknown error occurred while fetching transit stops.");
      toast({ title: "Error Fetching Transit Stops", description, variant: "destructive" });
      setObaStopsData([]);
    }
  }, [toast]);

  const fetchArrivalsForStop = useCallback(async (stopId: string) => {
    if (!isValidApiKey(ONEBUSAWAY_API_KEY)) return;
    setIsLoadingArrivals(true);
    setObaStopArrivals([]);
    try {
      const response = await fetch(`https://api.pugetsound.onebusaway.org/api/where/arrivals-and-departures-for-stop/${stopId}.json?key=${ONEBUSAWAY_API_KEY}&minutesBefore=0&minutesAfter=60&includeReferences=false`);
      
      if (!response.ok) {
        await handleApiError(response, `fetch arrivals for stop ${stopId}`);
      }
      const data = await response.json();
      const arrivals: ObaArrivalDeparture[] = data.data?.entry?.arrivalsAndDepartures.map((ad: any) => ({
        routeId: ad.routeId,
        routeShortName: ad.routeShortName,
        tripId: ad.tripId,
        tripHeadsign: ad.tripHeadsign,
        stopId: ad.stopId,
        scheduledArrivalTime: ad.scheduledArrivalTime,
        predictedArrivalTime: ad.predictedArrivalTime !== 0 ? ad.predictedArrivalTime : null,
        status: ad.status,
        vehicleId: ad.vehicleId,
        distanceFromStop: ad.distanceFromStop,
        lastUpdateTime: ad.lastKnownLocationUpdateTime, 
      })) || [];
      setObaStopArrivals(arrivals);
    } catch (error) {
      console.error(`Error fetching OBA arrivals for stop ${stopId}:`, error);
      const description = getErrorMessage(error, "An unknown error occurred while fetching arrivals.");
      toast({ title: "Error Fetching Arrivals", description: `Stop ID ${stopId}: ${description}`, variant: "destructive" });
      setObaStopArrivals([]);
    } finally {
      setIsLoadingArrivals(false);
    }
  }, [toast]);
  
  const handleFlyTo = useCallback((coords: Coordinates, zoom: number = 15) => {
    setViewState(prev => ({
      ...prev,
      longitude: coords.longitude,
      latitude: coords.latitude,
      zoom,
      transitionDuration: 1500,
      // Removed: transitionInterpolator: new FlyToInterpolator(),
    }));
  }, []);

  const handleSelectPoi = useCallback((poi: PointOfInterest | null) => {
    setSelectedPoi(poi);
    if (poi?.isObaStop && poi.id) {
      fetchArrivalsForStop(poi.id);
    } else {
      setObaStopArrivals([]); 
      setIsLoadingArrivals(false);
    }
    if (poi) {
        handleFlyTo({latitude: poi.latitude, longitude: poi.longitude}, 15);
    }
  }, [fetchArrivalsForStop, handleFlyTo]);


  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      const handleIdle = () => fetchObaStops(map);
      map.on('idle', handleIdle);
      map.on('load', () => fetchObaStops(map)); 
      return () => {
        map.off('idle', handleIdle);
        map.off('load', handleIdle); 
      };
    }
  }, [fetchObaStops]);

  const handleSearchResult = useCallback((coords: Coordinates, name?: string) => {
    handleFlyTo(coords);
    setDestination(coords);
    setRoute(null); 
    setObaRouteGeometry(null);
    setCurrentOBARouteDisplayData(null);
    setObaVehicleLocations([]);
    if (name) {
      toast({ title: "Location Found", description: `Navigating to ${name}`});
    }
  }, [handleFlyTo, toast]);
  


  const fetchDirections = useCallback(async (start: Coordinates, end: Coordinates, mode: TransitMode) => {
    if (!MAPBOX_ACCESS_TOKEN) {
      toast({ title: "Configuration Error", description: "Mapbox Access Token is missing.", variant: "destructive" });
      return;
    }
    setIsLoadingRoute(true);
    setRoute(null);
    setObaRouteGeometry(null); 
    setCurrentOBARouteDisplayData(null);
    setObaVehicleLocations([]);
    try {
        const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${mode}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?steps=true&geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
        );
        const json = await query.json();
        if (json.routes && json.routes.length > 0) {
        const data = json.routes[0];
        const newRoute: RouteType = {
            id: `route-${Date.now()}`,
            geometry: data.geometry,
            legs: data.legs,
            distance: data.distance,
            duration: data.duration,
        };
        setRoute(newRoute);
        handleFlyTo({longitude: (start.longitude + end.longitude)/2, latitude: (start.latitude + end.latitude)/2}, 12);
        } else {
        console.error("Directions API error:", json.message);
        toast({ title: "Error Fetching Directions", description: json.message || "Could not find a route.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error fetching directions:", error);
        const description = getErrorMessage(error, "An unknown error occurred while fetching directions.");
        toast({ title: "Error Fetching Directions", description, variant: "destructive" });
    } finally {
        setIsLoadingRoute(false);
    }
  }, [handleFlyTo, toast]);

  const fetchVehiclesForObaRoute = useCallback(async (routeId: string) => {
    if (!isValidApiKey(ONEBUSAWAY_API_KEY)) return;
    setIsLoadingObaVehicles(true);
    setObaVehicleLocations([]);
    try {
      const response = await fetch(`https://api.pugetsound.onebusaway.org/api/where/vehicles-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}&includeStatus=true&includeTrip=true`);
      
      if (!response.ok) {
        await handleApiError(response, `fetch OBA vehicles for route ${routeId}`);
      }
      const data = await response.json();
      if (data.data && data.data.list && data.data.list.length > 0) {
        const vehicles: ObaVehicleLocation[] = data.data.list.map((v: any) => ({
          id: v.vehicleId,
          routeId: v.trip?.routeId || routeId, 
          latitude: v.location.lat,
          longitude: v.location.lon,
          heading: v.heading,
          tripId: v.trip?.id,
          tripHeadsign: v.trip?.tripHeadsign,
          lastUpdateTime: v.lastUpdateTime || v.observedLastKnownLocationTime,
          phase: v.phase,
        }));
        setObaVehicleLocations(vehicles);
      } else {
        setObaVehicleLocations([]);
         toast({ title: "No Vehicles Found", description: `No active vehicles currently reported for route ${routeId}.`, variant: "default" });
      }
    } catch (error) {
      console.error(`Error fetching OBA vehicles for route ${routeId}:`, error);
      const description = getErrorMessage(error, "An unknown error occurred while fetching vehicles.");
      toast({ title: "Error Fetching Vehicles", description: `Route ID ${routeId}: ${description}`, variant: "destructive" });
      setObaVehicleLocations([]);
    } finally {
      setIsLoadingObaVehicles(false);
    }
  }, [toast]);

  const handleSelectRouteForPath = useCallback(async (routeId: string | null | undefined) => {
    if (!routeId || typeof routeId !== 'string' || routeId.trim() === '') {
      toast({ title: "Invalid Route ID", description: "A valid OneBusAway Route ID is required to fetch its path.", variant: "destructive" });
      setIsLoadingObaRouteGeometry(false);
      setCurrentOBARouteDisplayData(null);
      setObaRouteGeometry(null);
      setObaVehicleLocations([]);
      return;
    }

    if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
      toast({ title: "Configuration Error", description: "OneBusAway API Key is missing. Cannot fetch route path.", variant: "destructive" });
      return;
    }
    setIsLoadingObaRouteGeometry(true);
    setObaRouteGeometry(null);
    setCurrentOBARouteDisplayData(null);
    setObaVehicleLocations([]); 
    setRoute(null); 

    try {
      const response = await fetch(`https://api.pugetsound.onebusaway.org/api/where/stops-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}&includePolylines=true&includeReferences=true`);
      let errorMessage = `Failed to fetch OBA route path (status ${response.status}) for route ${routeId}.`;
      if (!response.ok) {
        try {
          const errorData = await response.json();
          errorMessage = errorData?.text || errorData?.message || JSON.stringify(errorData) || errorMessage;
        } catch {
            try {
                const textResponse = await response.text();
                if (textResponse) errorMessage = textResponse; 
            } catch { /* Do nothing, stick with initial errorMessage */ }
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      
      let routePath: ObaRouteGeometry | null = null;
      if (data.data && data.data.entry && data.data.entry.polylines && data.data.entry.polylines.length > 0) {
        const allCoordinates: number[][] = [];
        data.data.entry.polylines.forEach((encodedPolyline: ObaPolyline) => {
          const decoded = polyline.decode(encodedPolyline.points);
          decoded.forEach(coordPair => allCoordinates.push([coordPair[1], coordPair[0]])); 
        });

        if (allCoordinates.length > 0) {
          routePath = {
            type: "Feature",
            geometry: { type: "LineString", coordinates: allCoordinates },
            properties: { routeId: routeId },
          };
          setObaRouteGeometry(routePath);
        }
      }

      let routeDetails: ObaRoute | null = null;
      // The stops-for-route response puts route details in references.routes like stops-for-location
      // It also includes route details directly in data.data.entry.route if includeReferences=false
      // We are using includeReferences=true, so check references first.
      if (data.data && data.data.references && data.data.references.routes && data.data.references.routes.length > 0) {
        // Find the specific route from references if multiple are returned (should usually be one for stops-for-route)
        const refRoute = (data.data.references.routes as ObaRoute[]).find(r => r.id === routeId) || data.data.references.routes[0];
         if (refRoute) {
            routeDetails = {
            id: refRoute.id,
            shortName: refRoute.shortName,
            longName: refRoute.longName,
            description: refRoute.description,
            agencyId: refRoute.agencyId,
            agency: (data.data.references.agencies as ObaAgency[]).find(a => a.id === refRoute.agencyId),
            url: refRoute.url,
            color: refRoute.color,
            textColor: refRoute.textColor,
            type: refRoute.type,
            };
        }
      }


      let routeStops: PointOfInterest[] = [];
      if (data.data && data.data.list && Array.isArray(data.data.list)) {
          routeStops = data.data.list.map((stop: any) => ({
            id: stop.id,
            name: stop.name,
            type: 'Bus Stop',
            latitude: stop.lat,
            longitude: stop.lon,
            isObaStop: true,
            direction: stop.direction,
            code: stop.code,
            routeIds: stop.routeIds || [], 
            locationType: stop.locationType,
            wheelchairBoarding: stop.wheelchairBoarding,
          }));
      }
      
      let displayRouteInfo: ObaRoute | null = routeDetails;

      if (!displayRouteInfo && obaReferencedRoutes[routeId]) {
        displayRouteInfo = obaReferencedRoutes[routeId];
      }
      
      if (!displayRouteInfo && routeStops.length > 0) {
        const shortNameFromId = routeId.includes('_') ? routeId.split('_')[1] : routeId;
        displayRouteInfo = {
          id: routeId,
          shortName: shortNameFromId,
          description: `Route ${shortNameFromId}`,
          agencyId: routeId.includes('_') ? routeId.split('_')[0] : 'Unknown Agency',
        };
      }

      if (displayRouteInfo) {
        setCurrentOBARouteDisplayData({ routeInfo: displayRouteInfo, stops: routeStops });
        await fetchVehiclesForObaRoute(routeId);
      } else {
        setCurrentOBARouteDisplayData(null); 
        setObaVehicleLocations([]);
      }

      if (routePath && routePath.geometry.coordinates.length > 0) {
         if (mapRef.current) {
            const firstCoord = routePath.geometry.coordinates[0];
            handleFlyTo({ longitude: firstCoord[0], latitude: firstCoord[1] }, 13);
          }
      } else if (!displayRouteInfo && routeStops.length === 0) { 
         toast({ title: "No Route Data", description: `No path, details, or stops found for route ${routeId}.`, variant: "default" });
      } else if (!routePath && displayRouteInfo) {
         toast({ title: "Route Path Missing", description: `No polyline data found for route ${routeId}, but displaying available stop/route information.`, variant: "default" });
      }

    } catch (error) {
      console.error(`Error fetching OBA route path for ${routeId}:`, error);
      const description = getErrorMessage(error, "An unknown error occurred while fetching route path.");
      toast({ title: "Error Fetching Route Path", description: `Route ID ${routeId}: ${description}`, variant: "destructive" });
      setObaRouteGeometry(null);
      setCurrentOBARouteDisplayData(null);
      setObaVehicleLocations([]);
    } finally {
      setIsLoadingObaRouteGeometry(false);
    }
  }, [toast, handleFlyTo, fetchVehiclesForObaRoute, obaReferencedRoutes]);

  const allPois = React.useMemo(() => {
    return obaStopsData;
  }, [obaStopsData]);

  // Initialize with current time-based lighting (only if auto lighting is enabled)
  useEffect(() => {
    if (!isAutoLighting) {
      log.ui('Auto lighting disabled - keeping current preset');
      return;
    }
    
    const now = new Date();
    const hour = now.getHours();
    
    let lightPreset: 'day' | 'dusk' | 'dawn' | 'night';
    if (hour >= 6 && hour < 8) {
      lightPreset = 'dawn';
    } else if (hour >= 8 && hour < 18) {
      lightPreset = 'day';
    } else if (hour >= 18 && hour < 20) {
      lightPreset = 'dusk';
    } else {
      lightPreset = 'night';
    }
    
            log.time(`Auto lighting enabled - setting time-based preset: ${lightPreset}`);
    setCurrentLightPreset(lightPreset);
  }, [isAutoLighting]);

  // Function to manually change lighting
  const handleChangeLightPreset = useCallback((preset: 'day' | 'dusk' | 'dawn' | 'night') => {
    if (!mapRef.current) return;
    
    try {
      const map = mapRef.current.getMap();
      const isStandardStyle = currentMapStyle.url.includes('mapbox://styles/mapbox/standard');
      
      if (isStandardStyle) {
        map.setConfigProperty('basemap', 'lightPreset', preset);
        setCurrentLightPreset(preset);
        log.lighting3d(`Lighting manually changed to: ${preset}`);
      }
    } catch (error) {
              log.warning('Failed to change lighting preset:', error);
    }
  }, [currentMapStyle.url]);

  // Function to toggle auto lighting
  const handleToggleAutoLighting = useCallback((auto: boolean) => {
    log.control(`Setting auto lighting to: ${auto}`);
    setIsAutoLighting(auto);
    
    if (auto) {
      // When switching to auto, immediately update to current time-based lighting
      const lightPreset = getTimeBasedLightingPreset();
      
      if (mapRef.current) {
        try {
          const map = mapRef.current.getMap();
          const isStandardStyle = currentMapStyle.url.includes('mapbox://styles/mapbox/standard');
          
          if (isStandardStyle) {
            map.setConfigProperty('basemap', 'lightPreset', lightPreset);
            setCurrentLightPreset(lightPreset);
            console.log(`🕐 Auto lighting enabled - updated to: ${lightPreset}`);
          }
        } catch (error) {
          console.warn('Failed to update lighting when enabling auto:', error);
        }
      }
    } else {
      console.log('🎨 Manual lighting control enabled');
    }
  }, [currentMapStyle.url]);

  return (
    <div className="relative h-screen w-screen flex flex-col overflow-hidden">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-background/80 to-transparent">
        <div className="flex items-center gap-2">
           <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open controls">
                <Icons.Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-[400px] p-0 flex flex-col">
              <SidebarControls
                mapStyles={MAP_STYLES}
                currentMapStyle={currentMapStyle}
                onMapStyleChange={setCurrentMapStyle}
                customPois={[]} 
                onDeleteCustomPoi={() => {}} 
                onGetDirections={fetchDirections}
                isLoadingRoute={isLoadingRoute}
                currentRoute={route}
                destination={destination}
                setDestination={setDestination}
                onFlyTo={handleFlyTo}
                oneBusAwayApiKey={ONEBUSAWAY_API_KEY}
                selectedPoi={selectedPoi}
                onSelectPoi={handleSelectPoi}
                obaStopArrivals={obaStopArrivals}
                isLoadingArrivals={isLoadingArrivals}
                onSelectRouteForPath={handleSelectRouteForPath}
                isLoadingObaRouteGeometry={isLoadingObaRouteGeometry}
                currentOBARouteDisplayData={currentOBARouteDisplayData}
                isLoadingObaVehicles={isLoadingObaVehicles}
                obaReferencedRoutes={obaReferencedRoutes}
                currentLightPreset={currentLightPreset}
                onChangeLightPreset={handleChangeLightPreset}
                isAutoLighting={isAutoLighting}
                onToggleAutoLighting={handleToggleAutoLighting}
              />
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-headline font-semibold text-foreground">Seattle Transit Compass</h1>
        </div>
      </header>
      
      <div className="absolute top-16 left-4 z-10 w-full max-w-md md:max-w-sm">
         <SearchBar
            accessToken={MAPBOX_ACCESS_TOKEN}
            onResult={handleSearchResult}
            onClear={() => {
              setDestination(null);
              setRoute(null);
              setObaRouteGeometry(null);
              setCurrentOBARouteDisplayData(null);
              setObaVehicleLocations([]);
            }}
          />
      </div>

      <MapView
        mapRef={mapRef}
        viewState={viewState}
        onViewStateChange={setViewState}
        pois={allPois}
        selectedPoi={selectedPoi}
        onSelectPoi={handleSelectPoi}
        mapStyleUrl={currentMapStyle.url}
        mapboxDirectionsRoute={route}
        obaRouteGeometry={obaRouteGeometry}
        onFlyTo={handleFlyTo}
        obaStopArrivals={obaStopArrivals}
        isLoadingArrivals={isLoadingArrivals}
        onSelectRouteForPath={handleSelectRouteForPath}
        obaVehicleLocations={obaVehicleLocations}
        isAutoLighting={isAutoLighting}
        currentLightPreset={currentLightPreset}
        onChangeLightPreset={handleChangeLightPreset}
        onToggleAutoLighting={handleToggleAutoLighting}
      />
    </div>
  );
}

    
