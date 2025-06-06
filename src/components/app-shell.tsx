
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
import { INITIAL_VIEW_STATE, INITIAL_POIS, MAP_STYLES, MAPBOX_ACCESS_TOKEN, ONEBUSAWAY_API_KEY } from '@/lib/constants';
import type { PointOfInterest, CustomPOI, MapStyle, Route as RouteType, Coordinates, TransitMode, ObaArrivalDeparture, ObaPolyline, ObaRouteGeometry, ObaRoute, CurrentOBARouteDisplayData, ObaVehicleLocation } from '@/types';
import { useToast } from "@/hooks/use-toast";

const SearchBar = dynamic(() => import('@/components/search-bar').then(mod => mod.SearchBar), { 
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading search...</div> 
});

export function AppShell() {
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [customPois, setCustomPois] = useState<CustomPOI[]>([]);
  const [obaStopsData, setObaStopsData] = useState<PointOfInterest[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | CustomPOI | null>(null);
  const [obaStopArrivals, setObaStopArrivals] = useState<ObaArrivalDeparture[]>([]);
  const [isLoadingArrivals, setIsLoadingArrivals] = useState(false);

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


  const { toast } = useToast();

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error("Mapbox Access Token is missing. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.");
      toast({
        title: "Configuration Error",
        description: "Mapbox Access Token is missing. Maps may not function correctly.",
        variant: "destructive",
      });
    }
    if (!ONEBUSAWAY_API_KEY || ONEBUSAWAY_API_KEY === "YOUR_ONEBUSAWAY_API_KEY_HERE" || ONEBUSAWAY_API_KEY === "") {
      console.error("OneBusAway API Key is missing. Please set NEXT_PUBLIC_ONEBUSAWAY_API_KEY environment variable.");
      toast({
        title: "Configuration Error",
        description: "OneBusAway API Key is missing. Real-time transit features will be unavailable.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchObaStops = useCallback(async (currentMap: MapRef) => {
    if (!ONEBUSAWAY_API_KEY || ONEBUSAWAY_API_KEY === "YOUR_ONEBUSAWAY_API_KEY_HERE" || ONEBUSAWAY_API_KEY === "") return;

    const map = currentMap.getMap();
    const bounds = map.getBounds();
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
      const apiUrl = `https://api.pugetsound.onebusaway.org/api/where/stops-for-location.json?key=${ONEBUSAWAY_API_KEY}&lat=${lat}&lon=${lon}&latSpan=${latSpan}&lonSpan=${lonSpan}&includeReferences=false`;
      const response = await fetch(apiUrl);
      let errorMessage = `Failed to fetch OBA stops (status ${response.status})`;
      if (!response.ok) {
        try {
          const errorData = await response.json();
          errorMessage = errorData?.text || errorData?.message || JSON.stringify(errorData) || errorMessage;
        } catch (e) {
          try {
            const textResponse = await response.text();
            if (textResponse) errorMessage = textResponse;
          } catch (textErr) { /* Do nothing */ }
        }
        throw new Error(errorMessage);
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
      } else {
        setObaStopsData([]);
      }
    } catch (error) {
      console.error("Error fetching OBA stops:", error);
      let description = "An unknown error occurred while fetching transit stops.";
      if (error instanceof Error) description = error.message;
      else if (typeof error === 'string') description = error;
      else description = String(error);
      toast({ title: "Error Fetching Transit Stops", description, variant: "destructive" });
      setObaStopsData([]);
    }
  }, [toast]);

  const fetchArrivalsForStop = useCallback(async (stopId: string) => {
    if (!ONEBUSAWAY_API_KEY || ONEBUSAWAY_API_KEY === "YOUR_ONEBUSAWAY_API_KEY_HERE" || ONEBUSAWAY_API_KEY === "") return;
    setIsLoadingArrivals(true);
    setObaStopArrivals([]);
    try {
      const response = await fetch(`https://api.pugetsound.onebusaway.org/api/where/arrivals-and-departures-for-stop/${stopId}.json?key=${ONEBUSAWAY_API_KEY}&minutesBefore=0&minutesAfter=60&includeReferences=false`);
      let errorMessage = `Failed to fetch arrivals for stop ${stopId} (status ${response.status})`;
      if (!response.ok) {
        try {
          const errorData = await response.json();
          errorMessage = errorData?.text || errorData?.message || JSON.stringify(errorData) || errorMessage;
        } catch (e) {
           try {
            const textResponse = await response.text();
            if (textResponse) errorMessage = textResponse;
          } catch (textErr) { /* Do nothing */ }
        }
        throw new Error(errorMessage);
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
      let description = "An unknown error occurred while fetching arrivals.";
      if (error instanceof Error) description = error.message;
      else if (typeof error === 'string') description = error;
      else description = String(error);
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

  const handleSelectPoi = useCallback((poi: PointOfInterest | CustomPOI | null) => {
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
  
  const handleDeleteCustomPoi = useCallback((poiId: string) => {
    setCustomPois(prev => prev.filter(p => p.id !== poiId));
    setSelectedPoi(prev => prev?.id === poiId ? null : prev);
    toast({ title: "Custom POI Deleted" });
  }, [toast]);

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
        let description = "An unknown error occurred while fetching directions.";
        if (error instanceof Error) description = error.message;
        else if (typeof error === 'string') description = error;
        else description = String(error);
        toast({ title: "Error Fetching Directions", description, variant: "destructive" });
    } finally {
        setIsLoadingRoute(false);
    }
  }, [handleFlyTo, toast]);

  const fetchVehiclesForObaRoute = useCallback(async (routeId: string) => {
    if (!ONEBUSAWAY_API_KEY || ONEBUSAWAY_API_KEY === "YOUR_ONEBUSAWAY_API_KEY_HERE" || ONEBUSAWAY_API_KEY === "") return;
    setIsLoadingObaVehicles(true);
    setObaVehicleLocations([]);
    try {
      const response = await fetch(`https://api.pugetsound.onebusaway.org/api/where/vehicles-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}&includeStatus=true&includeTrip=true`);
      let errorMessage = `Failed to fetch OBA vehicles for route ${routeId} (status ${response.status})`;
      if (!response.ok) {
        try {
          const errorData = await response.json();
          errorMessage = errorData?.text || errorData?.message || JSON.stringify(errorData) || errorMessage;
        } catch (e) {
           try {
            const textResponse = await response.text();
            if (textResponse) errorMessage = textResponse;
          } catch (textErr) { /* Do nothing */ }
        }
        throw new Error(errorMessage);
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
      let description = "An unknown error occurred while fetching vehicles.";
      if (error instanceof Error) description = error.message;
      else if (typeof error === 'string') description = error;
      else description = String(error);
      toast({ title: "Error Fetching Vehicles", description: `Route ID ${routeId}: ${description}`, variant: "destructive" });
      setObaVehicleLocations([]);
    } finally {
      setIsLoadingObaVehicles(false);
    }
  }, [toast]);

  const handleSelectRouteForPath = useCallback(async (routeId: string) => {
    if (!routeId || typeof routeId !== 'string' || routeId.trim() === '') {
      toast({ title: "Invalid Route ID", description: "A valid OneBusAway Route ID is required to fetch its path.", variant: "destructive" });
      setIsLoadingObaRouteGeometry(false);
      setCurrentOBARouteDisplayData(null);
      setObaRouteGeometry(null);
      setObaVehicleLocations([]);
      return;
    }

    if (!ONEBUSAWAY_API_KEY || ONEBUSAWAY_API_KEY === "YOUR_ONEBUSAWAY_API_KEY_HERE" || ONEBUSAWAY_API_KEY === "") {
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
        } catch (e) {
            try {
                const textResponse = await response.text();
                if (textResponse) errorMessage = textResponse; 
            } catch (textErr) { /* Do nothing, stick with initial errorMessage */ }
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
      if (data.data && data.data.references && data.data.references.routes && data.data.references.routes.length > 0) {
        const refRoute = data.data.references.routes[0];
        routeDetails = {
          id: refRoute.id,
          shortName: refRoute.shortName,
          longName: refRoute.longName,
          description: refRoute.description,
          agencyId: refRoute.agencyId,
          url: refRoute.url,
          color: refRoute.color,
          textColor: refRoute.textColor,
          type: refRoute.type,
        };
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
      
      // If we have stops, try to show route info even if routeDetails are partially missing.
      if (routeStops.length > 0) {
        let displayRouteInfo: ObaRoute;
        if (routeDetails) {
          displayRouteInfo = routeDetails;
        } else {
          // Construct a fallback routeInfo if full details are missing but we have stops
          const shortNameFromId = routeId.includes('_') ? routeId.split('_')[1] : routeId;
          displayRouteInfo = {
            id: routeId,
            shortName: shortNameFromId,
            description: `Route ${shortNameFromId}`, // Fallback description
            agencyId: routeId.includes('_') ? routeId.split('_')[0] : 'Unknown Agency', // Fallback agency
          };
        }
        setCurrentOBARouteDisplayData({ routeInfo: displayRouteInfo, stops: routeStops });
        await fetchVehiclesForObaRoute(routeId);
      } else if (routeDetails) { 
        // We have route details but no stops, still show route details
         setCurrentOBARouteDisplayData({ routeInfo: routeDetails, stops: [] });
         await fetchVehiclesForObaRoute(routeId); // Still try to fetch vehicles
      } else {
        // No route details and no stops, clear display data
        setCurrentOBARouteDisplayData(null); 
        setObaVehicleLocations([]);
      }

      if (routePath && routePath.geometry.coordinates.length > 0) {
         if (mapRef.current) {
            const firstCoord = routePath.geometry.coordinates[0];
            handleFlyTo({ longitude: firstCoord[0], latitude: firstCoord[1] }, 13);
          }
      } else if (!routeDetails && routeStops.length === 0) { 
         // Only show this toast if we truly have no useful data (no path, no details, no stops)
         toast({ title: "No Route Data", description: `No path, details, or stops found for route ${routeId}.`, variant: "default" });
      } else if (!routePath && (routeDetails || routeStops.length > 0)) {
         // Path is missing, but we have some details/stops to show in sidebar
         toast({ title: "Route Path Missing", description: `No polyline data found for route ${routeId}, but displaying available stop/route information.`, variant: "default" });
      }


    } catch (error) {
      console.error(`Error fetching OBA route path for ${routeId}:`, error);
      let description = "An unknown error occurred while fetching route path.";
      if (error instanceof Error) description = error.message;
      else if (typeof error === 'string') description = error;
      else description = String(error);
      toast({ title: "Error Fetching Route Path", description: `Route ID ${routeId}: ${description}`, variant: "destructive" });
      setObaRouteGeometry(null);
      setCurrentOBARouteDisplayData(null);
      setObaVehicleLocations([]);
    } finally {
      setIsLoadingObaRouteGeometry(false);
    }
  }, [toast, handleFlyTo, fetchVehiclesForObaRoute]);

  const allPois = React.useMemo(() => {
    const combined = [...INITIAL_POIS, ...obaStopsData];
    const poiMap = new Map<string, PointOfInterest | CustomPOI>();
    INITIAL_POIS.forEach(poi => poiMap.set(poi.id, poi));
    obaStopsData.forEach(poi => poiMap.set(poi.id, poi)); 
    
    return Array.from(poiMap.values());
  }, [obaStopsData]);

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
                customPois={customPois} 
                onDeleteCustomPoi={handleDeleteCustomPoi} 
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
      />
    </div>
  );
}

    