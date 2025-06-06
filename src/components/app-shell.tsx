"use client";

import React, { useState, useCallback, useEffect } from 'react';
import type { ViewState } from 'react-map-gl';
import dynamic from 'next/dynamic';
import { MapView } from '@/components/map-view';
import { SidebarControls } from '@/components/sidebar-controls';
// import { SearchBar } from '@/components/search-bar'; // Original static import
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { INITIAL_VIEW_STATE, INITIAL_POIS, MAP_STYLES, MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import type { PointOfInterest, CustomPOI, MapStyle, Route as RouteType, Coordinates, TransitMode } from '@/types';
import { useToast } from "@/hooks/use-toast";

const SearchBar = dynamic(() => import('@/components/search-bar').then(mod => mod.SearchBar), { 
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading search...</div> 
});

export function AppShell() {
  const [viewState, setViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [pois, setPois] = useState<PointOfInterest[]>(INITIAL_POIS);
  const [customPois, setCustomPois] = useState<CustomPOI[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | CustomPOI | null>(null);
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>(MAP_STYLES[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<RouteType | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
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
  }, [toast]);

  const handleFlyTo = useCallback((coords: Coordinates, zoom: number = 15) => {
    setViewState(prev => ({
      ...prev,
      longitude: coords.longitude,
      latitude: coords.latitude,
      zoom,
      transitionDuration: 2000,
      // transitionInterpolator: new FlyToInterpolator(), // react-map-gl v6, v7 uses different approach
    }));
  }, []);

  const handleSearchResult = useCallback((coords: Coordinates, name?: string) => {
    handleFlyTo(coords);
    setDestination(coords);
    // Optionally add a temporary marker for the search result
    // Or clear existing route if a new search is made
    setRoute(null); 
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
    if (!MAPBOX_ACCESS_TOKEN) return;
    setIsLoadingRoute(true);
    setRoute(null);
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
      handleFlyTo({longitude: (start.longitude + end.longitude)/2, latitude: (start.latitude + end.latitude)/2}, 12); // Adjust zoom based on route bounds
    } else {
      console.error("Directions API error:", json.message);
      toast({ title: "Error Fetching Directions", description: json.message || "Could not find a route.", variant: "destructive" });
    }
    setIsLoadingRoute(false);
  }, [handleFlyTo, toast]);


  const allPois = React.useMemo(() => [...pois, ...customPois], [pois, customPois]);

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
            }}
          />
      </div>

      <MapView
        viewState={viewState}
        onViewStateChange={setViewState}
        pois={allPois}
        selectedPoi={selectedPoi}
        onSelectPoi={setSelectedPoi}
        mapStyleUrl={currentMapStyle.url}
        route={route}
        onFlyTo={handleFlyTo}
      />
    </div>
  );
}
