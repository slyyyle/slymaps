
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ViewState, MapRef } from 'react-map-gl';
import dynamic from 'next/dynamic';
import polyline from '@mapbox/polyline';
import { MapView } from '@/components/map-view';
import { SidebarControls } from '@/components/sidebar-controls';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { INITIAL_VIEW_STATE, INITIAL_POIS, MAP_STYLES, MAPBOX_ACCESS_TOKEN, ONEBUSAWAY_API_KEY } from '@/lib/constants';
import type { PointOfInterest, CustomPOI, MapStyle, Route as RouteType, Coordinates, TransitMode, ObaArrivalDeparture, ObaPolyline, ObaRouteGeometry } from '@/types';
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
  
  // For Mapbox Directions
  const [route, setRoute] = useState<RouteType | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  
  // For OBA Route Paths
  const [obaRouteGeometry, setObaRouteGeometry] = useState<ObaRouteGeometry | null>(null);
  const [isLoadingObaRouteGeometry, setIsLoadingObaRouteGeometry] = useState(false);

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
        return;
    }

    try {
      const apiUrl = `https://api.pugetsound.onebusaway.org/api/where/stops-for-location.json?key=${ONEBUSAWAY_API_KEY}&lat=${lat}&lon=${lon}&latSpan=${latSpan}&lonSpan=${lonSpan}&includeReferences=false`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.text || `Failed to fetch OBA stops (status ${response.status})`);
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
        }));
        setObaStopsData(fetchedStops);
      } else {
        setObaStopsData([]);
      }
    } catch (error) {
      console.error("Error fetching OBA stops:", error);
      toast({ title: "Error Fetching Transit Stops", description: (error as Error).message, variant: "destructive" });
      setObaStopsData([]);
    }
  }, [toast]);

  const fetchArrivalsForStop = useCallback(async (stopId: string) => {
    if (!ONEBUSAWAY_API_KEY || ONEBUSAWAY_API_KEY === "YOUR_ONEBUSAWAY_API_KEY_HERE" || ONEBUSAWAY_API_KEY === "") return;
    setIsLoadingArrivals(true);
    setObaStopArrivals([]);
    try {
      const response = await fetch(`https://api.pugetsound.onebusaway.org/api/where/arrivals-and-departures-for-stop/${stopId}.json?key=${ONEBUSAWAY_API_KEY}&minutesBefore=0&minutesAfter=60&includeReferences=false`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.text || `Failed to fetch arrivals (status ${response.status})`);
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
      toast({ title: "Error Fetching Arrivals", description: (error as Error).message, variant: "destructive" });
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
    }));
  }, []);

  const handleSelectPoi = useCallback((poi: PointOfInterest | CustomPOI | null) => {
    setSelectedPoi(poi);
    setRoute(null); 
    setObaRouteGeometry(null); // Clear OBA route path when selecting a new POI
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
      map.on('load', () => fetchObaStops(map)); // Also fetch on initial load
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
    if (name) {
      toast({ title: "Location Found", description: `Navigating to ${name}`});
    }
  }, [handleFlyTo, toast]);

  const handleAddCustomPoi = useCallback((poi: CustomPOI) => {
    setCustomPois(prev => [...prev, poi]);
    toast({ title: "Custom POI Added", description: `${poi.name} has been saved.`});
  }, [toast]);
  
  const handleUpdateCustomPoi = useCallback((updatedPoi: CustomPOI) => {
    setCustomPois(prev => prev.map(p => p.id === updatedPoi.id ? updatedPoi : p));
    toast({ title: "Custom POI Updated", description: `${updatedPoi.name} has been updated.`});
  }, [toast]);

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
    setObaRouteGeometry(null); // Clear OBA route when fetching Mapbox directions
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
      // Fly to midpoint of route
      handleFlyTo({longitude: (start.longitude + end.longitude)/2, latitude: (start.latitude + end.latitude)/2}, 12);
    } else {
      console.error("Directions API error:", json.message);
      toast({ title: "Error Fetching Directions", description: json.message || "Could not find a route.", variant: "destructive" });
    }
    setIsLoadingRoute(false);
  }, [handleFlyTo, toast]);

  const handleSelectRouteForPath = useCallback(async (routeId: string) => {
    if (!ONEBUSAWAY_API_KEY || ONEBUSAWAY_API_KEY === "YOUR_ONEBUSAWAY_API_KEY_HERE" || ONEBUSAWAY_API_KEY === "") {
      toast({ title: "Configuration Error", description: "OneBusAway API Key is missing.", variant: "destructive" });
      return;
    }
    setIsLoadingObaRouteGeometry(true);
    setObaRouteGeometry(null);
    setRoute(null); // Clear Mapbox route when fetching OBA route path

    try {
      const response = await fetch(`https://api.pugetsound.onebusaway.org/api/where/stops-for-route/${routeId}.json?key=${ONEBUSAWAY_API_KEY}&includePolylines=true`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.text || `Failed to fetch OBA route path (status ${response.status})`);
      }
      const data = await response.json();
      
      if (data.data && data.data.entry && data.data.entry.polylines && data.data.entry.polylines.length > 0) {
        const allCoordinates: number[][] = [];
        data.data.entry.polylines.forEach((encodedPolyline: ObaPolyline) => {
          // @mapbox/polyline decodes to [lat, lon]
          const decoded = polyline.decode(encodedPolyline.points);
          // GeoJSON expects [lon, lat]
          decoded.forEach(coordPair => allCoordinates.push([coordPair[1], coordPair[0]]));
        });

        if (allCoordinates.length > 0) {
          const routePath: ObaRouteGeometry = {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: allCoordinates,
            },
            properties: { routeId: routeId },
          };
          setObaRouteGeometry(routePath);
          // Fly to the start of the OBA route path if mapRef and path exist
          if (mapRef.current && routePath.geometry.coordinates.length > 0) {
            const firstCoord = routePath.geometry.coordinates[0];
            handleFlyTo({ longitude: firstCoord[0], latitude: firstCoord[1] }, 13);
          }
        } else {
          toast({ title: "Route Path Empty", description: `No coordinates found for route ${routeId}.`, variant: "default" });
        }
      } else {
        toast({ title: "No Route Path Data", description: `No polyline data found for route ${routeId}.`, variant: "default" });
        setObaRouteGeometry(null);
      }
    } catch (error) {
      console.error(`Error fetching OBA route path for ${routeId}:`, error);
      toast({ title: "Error Fetching Route Path", description: (error as Error).message, variant: "destructive" });
      setObaRouteGeometry(null);
    } finally {
      setIsLoadingObaRouteGeometry(false);
    }
  }, [toast, handleFlyTo]);

  const allPois = React.useMemo(() => {
    const combined = [...INITIAL_POIS, ...customPois, ...obaStopsData];
    // Create a Map to ensure uniqueness by ID
    const uniquePois = Array.from(new Map(combined.map(item => [item.id, item])).values());
    return uniquePois;
  }, [customPois, obaStopsData]);

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
                onAddCustomPoi={handleAddCustomPoi}
                onUpdateCustomPoi={handleUpdateCustomPoi}
                onDeleteCustomPoi={handleDeleteCustomPoi}
                onGetDirections={fetchDirections}
                isLoadingRoute={isLoadingRoute}
                currentRoute={route}
                destination={destination}
                setDestination={setDestination}
                onFlyTo={handleFlyTo}
                mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
                oneBusAwayApiKey={ONEBUSAWAY_API_KEY}
                selectedPoi={selectedPoi}
                obaStopArrivals={obaStopArrivals}
                isLoadingArrivals={isLoadingArrivals}
                onSelectRouteForPath={handleSelectRouteForPath}
                isLoadingObaRouteGeometry={isLoadingObaRouteGeometry}
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
      />
    </div>
  );
}
