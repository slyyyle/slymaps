"use client";

import React, { useEffect, useState } from 'react';
import { DirectionsPopup } from '@/components/search/directions-popup';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Icons } from '@/components/icons';
import { MAPBOX_ACCESS_TOKEN, ONEBUSAWAY_API_KEY } from '@/lib/constants';
import { useToast } from "@/hooks/ui/use-toast";
import { isValidApiKey } from '@/lib/errors';
import { log } from '@/lib/logging';
import { useDataIntegration } from '@/hooks/data/use-data-integration';
import { useDataStore } from '@/stores/use-data-store';
import { usePOIStore } from '@/stores/use-poi-store';
import { useThemeStore } from '@/stores/theme-store';
import { Toaster } from '@/components/ui/toaster';
import { MapView } from '@/components/map/map-orchestrator';
import { SidebarShell, type PaneType } from '@/components/sidebar/sidebar-shell';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import type { Coordinates } from '@/types/core';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { useMapStyling } from '@/hooks/map/use-map-styling';
import { cn } from '@/lib/cn';
import { SEARCH_CONFIG } from '@/constants/search-config';

// Custom mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    // Check initial value
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
};

export function AppShell() {
  const { toast } = useToast();
  const dataIntegration = useDataIntegration();
  // Subscribe to directions state so component updates when route is fetched
  const { start: routeStartCoords, destination: routeEndCoords, route: mapboxDirectionsRoute, showTurnMarkers } = useDataStore(state => state.directions);

  const poiStore = usePOIStore();
  const mapViewport = useMapViewport();
  const mapStyling = useMapStyling(mapViewport.mapRef);
  const { sidebarTheme } = useThemeStore();
  const isMobile = useIsMobile();

  // Simplified sidebar state - single source of truth
  const [activePane, setActivePane] = useState<PaneType>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const isSidebarOpen = showSidebar;

  // Global navigation function for opening sidebar to specific panes
  const openSidebarPane = (pane: PaneType) => {
    setActivePane(pane);
    setShowSidebar(true);
  };

  // Open sidebar to main menu
  const openSidebarMenu = () => {
    setActivePane(null);
    setShowSidebar(true);
  };

  // Close sidebar function
  const closeSidebar = () => {
    setShowSidebar(false);
    setActivePane(null);
  };

  // Expose global navigation function for POI popups and other components
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as typeof window & { openSidebarPane?: typeof openSidebarPane }).openSidebarPane = openSidebarPane;
      
      // Set sidebar theme on body for portaled components (like suggestion dropdowns)
      document.body.setAttribute('data-sidebar-theme', sidebarTheme);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as typeof window & { openSidebarPane?: typeof openSidebarPane }).openSidebarPane;
      }
    };
  }, [sidebarTheme]);

  // API validation and store initialization on mount
  useEffect(() => {
    // Store the Mapbox token in our data store so sidebar forms can use it
    dataIntegration.config.setMapboxAccessToken(MAPBOX_ACCESS_TOKEN);
    // API validation
    if (isValidApiKey(MAPBOX_ACCESS_TOKEN)) {
      log.info('Mapbox access token validated');
    } else {
      toast({
        title: "Mapbox Configuration Error",
        description: "Mapbox access token is missing or invalid. Some features may not work properly.",
        variant: "destructive",
      });
      log.error('Invalid Mapbox access token');
    }

    if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
      log.info('OBA API key not configured - transit features will be limited');
    }
    
    // POI cleanup is now handled by the segregated stores automatically
    console.log('✅ Using segregated POI architecture - automatic cleanup enabled');
  }, []); // Empty dependency array - only run once on mount

  // Location handling now done via native GeolocateControl
  const currentLocation = null; // Handled by native control
  const isLoadingLocation = false; // Handled by native control

  // When a route is set, fit the map to the route bounds with UI overlay padding
  useEffect(() => {
    if (!mapboxDirectionsRoute) return;
    const map = mapViewport.getMapInstance();
    if (!map) return;
    const coords = mapboxDirectionsRoute.geometry.coordinates;
    const lons = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    const west = Math.min(...lons);
    const south = Math.min(...lats);
    const east = Math.max(...lons);
    const north = Math.max(...lats);
    // UI overlay dimensions
    const sidebarWidth = 320; // sidebar width in pixels
    const searchBarHeight = 80; // approximate height of top search controls
    // Apply asymmetric padding: leave space on left for sidebar and top for search
    map.fitBounds(
      [[west, south], [east, north]],
      {
        padding: {
          left: sidebarWidth + 16,
          top: searchBarHeight + 16,
          right: 16,
          bottom: 16
        },
        duration: 2000
      }
    );
  }, [mapboxDirectionsRoute, mapViewport]);

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Full-screen Map Area */}
      <div className="absolute inset-0">
        <MapView
          mapRef={mapViewport.mapRef}
          viewState={mapViewport.viewState}
          onViewStateChange={mapViewport.setViewState}
          mapStyleUrl={mapStyling.currentMapStyle.url}
          currentLocation={currentLocation}
          isLoadingLocation={isLoadingLocation}
          isBusy={false}
          mapboxDirectionsRoute={mapboxDirectionsRoute}
          routeStartCoords={routeStartCoords}
          routeEndCoords={routeEndCoords}
          showTurnMarkers={showTurnMarkers}
          // POI selection now completely handled by segregated architecture
        />
        
        {/* Directions Popup - floats over map */}
        <DirectionsPopup />
        
        {/* Global Toast Notifications */}
        <Toaster />
      </div>

      {/* Map Controls - Menu Button and Search Bar (hidden when sidebar open) */}
      {!isSidebarOpen && (
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        {/* Menu Button - only show when sidebar is closed */}
        {isMobile ? (
         /* Mobile Menu Button */
         <Sheet open={isSidebarOpen} onOpenChange={(open) => {
           if (!open) closeSidebar();
         }} modal={false}>
           <SheetTrigger asChild>
             <Button
               variant="outline"
               size="icon"
               className="bg-sidebar text-sidebar-foreground shadow-lg flex-shrink-0"
               onClick={openSidebarMenu}
             >
               <Icons.Menu className="h-4 w-4" />
             </Button>
           </SheetTrigger>
           <SheetContent side="left" className="w-96 p-0 border-r">
             <VisuallyHidden>
               <SheetTitle>Navigation Menu</SheetTitle>
             </VisuallyHidden>
             <SidebarShell
               defaultPane={activePane}
               onClose={closeSidebar}
               mapRef={mapViewport.mapRef}
             />
           </SheetContent>
         </Sheet>
        ) : (
          /* Desktop Menu Button - only show when sidebar is closed */
          !isSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              className="bg-sidebar text-sidebar-foreground shadow-lg flex-shrink-0"
              onClick={openSidebarMenu}
            >
              <Icons.Menu className="h-4 w-4" />
            </Button>
          )
        )}

        {/* Search Bar - pushes right when sidebar opens */}
        <div className={`
          w-[30rem]
          max-w-[calc(100vw-200px)]
        `}>
          <div
            className={cn(
              "rounded-lg shadow-lg border",
              sidebarTheme
            )}
            style={{
              backgroundColor: 'hsl(var(--sidebar-background))',
              borderColor: 'hsl(var(--sidebar-border))',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset -1px 0 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <UnifiedSearchBox
              accessToken={MAPBOX_ACCESS_TOKEN}
              mapRef={mapViewport.mapRef}
              onResult={(coords: Coordinates) => {
                // Fly to the selected location with a more precise zoom
                mapViewport.flyTo(coords, {
                  zoom: SEARCH_CONFIG.ZOOM_LEVELS.PRECISE,
                  duration: SEARCH_CONFIG.PERFORMANCE.FLY_TO_DURATION_MS
                });
              }}
              onClear={() => {}}
              placeholder="Search places, transit, routes..."
              className="bg-transparent border-none shadow-none"
            />
          </div>
        </div>
      </div>
      )}

      {/* Desktop Sidebar Overlay */}
      {!isMobile && isSidebarOpen && (
        <div className="absolute top-0 left-0 z-30 w-96 h-full">
          <SidebarShell
            onClose={closeSidebar}
            defaultPane={activePane}
            mapRef={mapViewport.mapRef}
          />
        </div>
      )}


    </div>
  );
} 