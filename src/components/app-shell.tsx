"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Icons } from '@/components/icons';
import { MAPBOX_ACCESS_TOKEN, ONEBUSAWAY_API_KEY } from '@/lib/constants';
import { useToast } from '@/hooks/ui/use-toast';
import { isValidApiKey } from '@/lib/errors';
import { log } from '@/lib/logging';
import { usePlaceStore } from '@/stores/use-place-store';
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
import { useUnifiedPOIHandler } from '@/hooks/map/use-unified-poi-handler';
import { useRouteData } from '@/hooks/data/use-route-data';
import type { ObaStopSearchResult, ObaScheduleEntry, ObaRouteGeometry } from '@/types/transit/oba';
import { useMapRouteHandler } from '@/hooks/map';
import { DirectionsModeProvider } from '@/contexts/DirectionsModeContext';

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
  // Initialize route handler for Mapbox and OBA integration
  const routeHandler = useMapRouteHandler({ enableVehicleTracking: true });
  const { getRouteCoordinates, getActiveRoute, showTurnMarkers, addOBARoute, selectRoute, clearRouteSelection, clearAllRoutes } = routeHandler;
  const { start: routeStartCoords, end: routeEndCoords } = getRouteCoordinates();
  const activeRoute = getActiveRoute();
  const mapboxDirectionsRoute = activeRoute?.mapboxRoute ?? null;

  const poiStore = usePlaceStore();
  // Extract search results clear action to remove route stops markers
  const clearSearchResults = usePlaceStore(state => state.clearSearchResults);
  const mapViewport = useMapViewport();
  const mapStyling = useMapStyling(mapViewport.mapRef);
  const { sidebarTheme } = useThemeStore();
  const isMobile = useIsMobile();

  // Unified POI and route handlers for topbar search
  const unifiedHandler = useUnifiedPOIHandler({ map: mapViewport.mapRef.current });

  const handleStopSelect = React.useCallback((stop: ObaStopSearchResult) => {
    // Convert OBA stop into our Place shape
    const poi = {
      id: stop.id,
      name: stop.name,
      type: 'Bus Stop',
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: `Stop #${stop.code} - ${stop.direction} bound`,
      isObaStop: true,
      properties: {
        source: 'oba',
        stop_code: stop.code,
        direction: stop.direction,
        route_ids: stop.routeIds,
        wheelchair_boarding: stop.wheelchairBoarding
      }
    };
    unifiedHandler.handleSearchResultClick(poi);
  }, [unifiedHandler]);

  const handleRouteSelect = React.useCallback(async (routeId: string) => {
    // Replace any existing displayed OBA route
    routeHandler.clearAllRoutes();
    const storeId = await addOBARoute(routeId);
    selectRoute(storeId);
  }, [addOBARoute, selectRoute, routeHandler]);

  // Clear map overlays and active selection when search is cleared (preserve past searches)
  const handleClearSearch = React.useCallback(() => {
    // Deselect the active route without clearing stored recent searches
    clearRouteSelection();
    // Clear any selected POI on the map
    unifiedHandler.clearSelection();
  }, [clearRouteSelection, unifiedHandler]);

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
    // No longer storing Mapbox token in global store; components import constants directly
    // API validation
    if (isValidApiKey(MAPBOX_ACCESS_TOKEN)) {
      if (process.env.NODE_ENV !== 'production') {
        log.info('Mapbox access token validated');
      }
    } else {
      toast({
        title: "Mapbox Configuration Error",
        description: "Mapbox access token is missing or invalid. Some features may not work properly.",
        variant: "destructive",
      });
      log.error('Invalid Mapbox access token');
    }

    if (!isValidApiKey(ONEBUSAWAY_API_KEY)) {
      if (process.env.NODE_ENV !== 'production') {
        log.info('OBA API key not configured - transit features will be limited');
      }
    }
    
    // POI cleanup is now handled by the segregated stores automatically
  }, []); // Empty dependency array - only run once on mount

  // Location handling now done via native GeolocateControl
  const currentLocation = null; // Handled by native control
  const isLoadingLocation = false; // Handled by native control

  // Subscribe to the active OBA route using its original ID and derive data via unified hook
  const { detailsQuery, vehiclesQuery, scheduleQuery } = useRouteData(activeRoute?.obaRoute?.id ?? null);
  const branchIdx = activeRoute?.selectedSegmentIndex ?? 0;
  const selectedBranch = detailsQuery.data?.branches?.[branchIdx];
  const obaRouteSegments: ObaRouteGeometry[] = selectedBranch?.segments ?? [];
  const obaVehicleLocations = vehiclesQuery.data ?? [];
  const obaRouteStops = selectedBranch?.stops ?? [];
  const obaRouteSchedule: ObaScheduleEntry[] = scheduleQuery.data ? [scheduleQuery.data] : [];

  // Fit the map to the selected route once, then hand control back to the user
  const lastFitIdRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapViewport.getMapInstance();
    if (!map) return;
    let coords: [number, number][] | null = null;
    let currentId: string | null = null;
    if (activeRoute?.id && activeRoute.id !== lastFitIdRef.current) {
      currentId = activeRoute.id;
      if (mapboxDirectionsRoute) {
        coords = mapboxDirectionsRoute.geometry.coordinates as [number, number][];
      } else if (obaRouteSegments && obaRouteSegments.length > 0) {
        coords = obaRouteSegments.flatMap((s: ObaRouteGeometry) => s.geometry.coordinates) as [number, number][];
      }
    }
    if (coords && currentId) {
      const lons = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)]
      ];
      // Compute dynamic padding to avoid overlaying sidebar and top controls
      const leftPad = !isMobile && isSidebarOpen ? 336 : 16;
      const topPad = isMobile ? 80 : 96;
      if (mapboxDirectionsRoute) {
        // Zoom out more for mapbox navigation routes (subtract 2 zoom levels)
        const currentZoom = map.getZoom();
        map.fitBounds(bounds, {
          padding: { left: leftPad, top: topPad, right: 16, bottom: 16 },
          duration: 1500,
          maxZoom: currentZoom - 2
        });
      } else {
        // For OBA routes, standard fitBounds
        map.fitBounds(bounds, {
          padding: { left: leftPad, top: topPad, right: 16, bottom: 16 },
          duration: 1500
        });
      }
      lastFitIdRef.current = currentId;
    }
  }, [mapboxDirectionsRoute, obaRouteSegments, activeRoute, mapViewport, isSidebarOpen, isMobile]);

  return (
    <DirectionsModeProvider>
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
            // Pass OBA route segments and vehicle locations
            obaRouteSegments={obaRouteSegments}
            obaVehicleLocations={obaVehicleLocations}
            obaRouteStops={obaRouteStops}
            routeSchedule={obaRouteSchedule}
          />
          
          {/* Global Toast Notifications */}
          <Toaster />
        </div>

        {/* Map Controls - Menu Button and Search Bar (hidden when sidebar open) */}
        {!isSidebarOpen && (
        <div id="topbar-controls" className="absolute top-4 left-4 z-20 flex items-center gap-3">
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
             <SheetContent side="left" className="w-96 p-0 border-r overflow-visible">
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
                  mapViewport.flyTo(coords, {
                    zoom: SEARCH_CONFIG.ZOOM_LEVELS.PRECISE,
                    duration: SEARCH_CONFIG.PERFORMANCE.FLY_TO_DURATION_MS
                  });
                }}
                onStopSelect={handleStopSelect}
                onRouteSelect={async (routeId: string) => {
                  await handleRouteSelect(routeId);
                  openSidebarPane('transit');
                }}
                onClear={handleClearSearch}
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
    </DirectionsModeProvider>
  );
} 