"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapView } from '@/components/map-view';
import { SidebarControls } from '@/components/sidebar-controls';
import { DirectionsPopup } from '@/components/directions-popup';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { MAPBOX_ACCESS_TOKEN, ONEBUSAWAY_API_KEY, MAP_STYLES } from '@/lib/constants';
import type { ObaStopSearchResult, PointOfInterest, Coordinates, TransitMode } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { isValidApiKey } from '@/lib/error-utils';
import { log } from '@/lib/logging';
import { useMapState } from '@/hooks/use-map-state';
import { useTransitData } from '@/hooks/use-transit-data';
import { useRouteNavigation } from '@/hooks/use-route-navigation';
import { useAppLayout } from '@/hooks/use-app-layout';

const EnhancedSearchBar = dynamic(() => import('@/components/enhanced-search-bar').then(mod => mod.EnhancedSearchBar), { 
  ssr: false,
  loading: () => <div className="p-2 text-sm text-muted-foreground">Loading search...</div> 
});

// Text gradients that match the lighting presets
const getTextGradient = (preset: 'day' | 'dusk' | 'dawn' | 'night' = 'day') => {
  switch (preset) {
    case 'day':
      return 'bg-gradient-to-r from-blue-600 via-orange-500 to-yellow-600';
    case 'dusk':
      return 'bg-gradient-to-r from-orange-600 via-purple-500 to-blue-600';
    case 'dawn':
      return 'bg-gradient-to-r from-pink-600 via-rose-500 to-orange-600';
    case 'night':
      return 'bg-gradient-to-r from-slate-100 via-blue-200 to-gray-300';
    default:
      return 'bg-gradient-to-r from-blue-600 via-orange-500 to-yellow-600';
  }
};

export function AppShell() {
  const { toast } = useToast();

  // Use our new domain-specific hooks
  const mapState = useMapState();
  const transitData = useTransitData();
  const routeNavigation = useRouteNavigation();
  const appLayout = useAppLayout(
    transitData.isLoadingArrivals,
    routeNavigation.isLoadingObaRouteGeometry,
    routeNavigation.isLoadingObaVehicles
  );

  // Configuration validation
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

  // Create handler wrappers that use our hooks
  const handleStopSelect = (stop: ObaStopSearchResult) => {
    transitData.handleStopSelect(stop, mapState.handleFlyTo);
  };

  const handleSelectPoi = (poi: PointOfInterest | null) => {
    transitData.handleSelectPoi(poi, mapState.handleFlyTo);
  };

  const handleSearchResult = (coords: Coordinates, name?: string) => {
    routeNavigation.handleSearchResult(coords, name, mapState.handleFlyTo);
  };

  const handleSetDestination = (coords: Coordinates) => {
    routeNavigation.handleSetDestination(coords, mapState.handleFlyTo);
  };

  const handleSelectRouteForPath = (routeId: string | null | undefined) => {
    routeNavigation.handleSelectRouteForPath(routeId, transitData.obaReferencedRoutes, mapState.handleFlyTo);
  };

  const fetchDirections = async (start: Coordinates, end: Coordinates, mode: TransitMode) => {
    routeNavigation.fetchDirections(start, end, mode, mapState.handleFlyTo);
  };

  const handleTransitNearby = (coords: Coordinates) => {
    transitData.handleTransitNearby(coords);
  };

  return (
    <div className="relative h-screen w-screen flex flex-col overflow-hidden">
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center overflow-hidden">
        <div className="flex items-center gap-4 min-w-0 flex-1 overflow-hidden max-w-full">
           <Sheet 
             open={appLayout.sidebarOpen} 
             onOpenChange={appLayout.handleSidebarToggle} 
             modal={false}
           >
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open controls" className="shrink-0">
                <Icons.Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="left" 
              className="p-0 flex flex-col border-r bg-sidebar [&>button]:hidden overflow-hidden"
              hideOverlay={true}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {/* Custom close button that sets the allow flag */}
              <Button
                variant="ghost"
                size="sm"
                onClick={appLayout.handleSidebarClose}
                className="absolute right-4 top-4 h-8 w-8 p-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
              >
                <Icons.X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
              
              <SidebarControls
                mapStyles={MAP_STYLES}
                currentMapStyle={mapState.currentMapStyle}
                onMapStyleChange={mapState.setCurrentMapStyle}
                customPois={[]} 
                onDeleteCustomPoi={() => {}} 
                onGetDirections={fetchDirections}
                isLoadingRoute={routeNavigation.isLoadingRoute}
                destination={routeNavigation.destination}
                setDestination={routeNavigation.setDestination}
                onFlyTo={mapState.handleFlyTo}
                oneBusAwayApiKey={ONEBUSAWAY_API_KEY}
                selectedPoi={transitData.selectedPoi}
                onSelectPoi={handleSelectPoi}
                obaStopArrivals={transitData.obaStopArrivals}
                isLoadingArrivals={transitData.isLoadingArrivals}
                onSelectRouteForPath={handleSelectRouteForPath}
                currentOBARouteDisplayData={routeNavigation.currentOBARouteDisplayData}
                isBusy={appLayout.isSidebarBusy}
                obaReferencedRoutes={transitData.obaReferencedRoutes}
                currentLocation={mapState.currentLocation || undefined}
              />
            </SheetContent>
          </Sheet>
          <h1 className={`text-xl font-headline font-semibold bg-clip-text text-transparent shrink-0 ${getTextGradient(mapState.isAutoLighting ? mapState.currentLightPreset : mapState.currentLightPreset)}`}>
            SlyMaps
          </h1>
          <div className="w-full max-w-sm min-w-0 flex-1 overflow-hidden">
            <EnhancedSearchBar
              accessToken={MAPBOX_ACCESS_TOKEN}
              onResult={handleSearchResult}
              onRouteSelect={handleSelectRouteForPath}
              onStopSelect={handleStopSelect}
              onTransitNearby={handleTransitNearby}
              currentLocation={mapState.currentLocation || undefined}
              onClear={routeNavigation.clearAllRoutes}
            />
          </div>
        </div>
      </header>


      <MapView
        mapRef={mapState.mapRef}
        viewState={mapState.viewState}
        onViewStateChange={mapState.setViewState}
        pois={transitData.obaStopsData}
        selectedPoi={transitData.selectedPoi}
        onSelectPoi={handleSelectPoi}
        mapStyleUrl={mapState.currentMapStyle.url}
        mapboxDirectionsRoute={routeNavigation.route}
        routeStartCoords={routeNavigation.routeStartCoords}
        routeEndCoords={routeNavigation.routeEndCoords}
        obaRouteGeometry={routeNavigation.obaRouteGeometry}
        onFlyTo={mapState.handleFlyTo}
        onSetDestination={handleSetDestination}
        obaStopArrivals={transitData.obaStopArrivals}
        isLoadingArrivals={transitData.isLoadingArrivals}
        onSelectRouteForPath={handleSelectRouteForPath}
        obaVehicleLocations={routeNavigation.obaVehicleLocations}
        isAutoLighting={mapState.isAutoLighting}
        currentLightPreset={mapState.currentLightPreset}
        onChangeLightPreset={mapState.handleChangeLightPreset}
        onToggleAutoLighting={mapState.handleToggleAutoLighting}
      />

      <DirectionsPopup
        route={routeNavigation.route}
        onClose={routeNavigation.handleCloseDirectionsPopup}
        isVisible={routeNavigation.showDirectionsPopup}
        sidebarOpen={appLayout.sidebarOpen}
      />
    </div>
  );
}

    
