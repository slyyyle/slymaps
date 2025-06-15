import React, { useState } from 'react';
import { cn } from '@/lib/cn';
import type { MapRef } from 'react-map-gl/mapbox';

import { MainMenu } from './main-menu';
import { DirectionsPane } from './panes/directions-pane';
import { TransitPane } from './panes/transit-pane';
import { PlacesPane } from './panes/places-pane';
import { StylePane } from './panes/style-pane';
import { HomePane } from './panes/home-pane';
import { useDataIntegration } from '@/hooks/data/use-data-integration';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import { useUnifiedPOIHandler } from '@/hooks/map/use-unified-poi-handler';
import { useRouteHandler } from '@/hooks/map/use-route-handler';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';

export type PaneType = 'home' | 'directions' | 'transit' | 'places' | 'style' | null;

interface SidebarShellProps {
  className?: string;
  onClose?: () => void;
  defaultPane?: PaneType;
  mapRef?: React.RefObject<MapRef>;
}

export function SidebarShell({ 
  className, 
  onClose,
  defaultPane = null,
  mapRef
}: SidebarShellProps) {
  const [activePane, setActivePane] = useState<PaneType>(defaultPane);
  const { sidebarTheme } = useThemeStore();
  const dataIntegration = useDataIntegration();
  const unifiedHandler = useUnifiedPOIHandler({ map: mapRef?.current ?? null });
  const routeHandler = useRouteHandler({ enableVehicleTracking: true });

  // Get POI list for search and saved
  const allPois = dataIntegration.pois.getAllPOIs();
  const savedPois = allPois.filter(poi => (poi as any).favorites);
  const searchResultPois = allPois.filter(poi => poi.isSearchResult && !(poi as any).favorites);

  // Update active pane when defaultPane changes (for external navigation)
  React.useEffect(() => {
    setActivePane(defaultPane);
  }, [defaultPane]);

  const handlePaneChange = (pane: PaneType) => {
    setActivePane(activePane === pane ? null : pane);
  };

  const handleBackToMenu = () => {
    setActivePane(null);
  };

  const handleCloseSidebar = () => {
    setActivePane(null);
    onClose?.();
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-full",
        sidebarTheme,
        className
      )}
      style={{
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        borderRight: '1px solid hsl(var(--border))'
      }}
    >
      {/* Header with close button */}
      <div 
        className="flex-shrink-0 flex items-center justify-between p-3"
        style={{
          borderBottom: '1px solid hsl(var(--border))'
        }}
      >
        <h2 
          className="text-lg font-semibold"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {activePane ? (
            activePane.charAt(0).toUpperCase() + activePane.slice(1)
          ) : (
            'SlyMaps'
          )}
        </h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleCloseSidebar}
          className="h-8 w-8"
          style={{
            color: 'hsl(var(--foreground))',
            '--tw-ring-color': 'hsl(var(--ring))'
          } as React.CSSProperties}
        >
          <Icons.Close className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content area - no search section */}
      <div className="flex-1 flex flex-col min-h-0">
        {!activePane ? (
          <>
            {/* Unified search above menu */}
            <div className="px-3 py-1">
              <UnifiedSearchBox
                accessToken={MAPBOX_ACCESS_TOKEN}
                mapRef={mapRef}
                onLocationSelect={(poi) => {
                  unifiedHandler.handleSearchResultClick(poi);
                }}
                onClear={() => {}}
                onRouteSelect={async (routeId) => {
                  const storeRouteId = await routeHandler.addOBARoute(routeId);
                  routeHandler.selectRoute(storeRouteId);
                  // Switch to transit pane
                  setActivePane('transit');
                  const route = routeHandler.getRoute(storeRouteId);
                  const mapInstance = mapRef?.current?.getMap();
                  if (mapInstance && route?.geometry) {
                    const coordsArr = route.geometry.geometry.coordinates;
                    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                    coordsArr.forEach(([lon, lat]) => {
                      minLng = Math.min(minLng, lon);
                      minLat = Math.min(minLat, lat);
                      maxLng = Math.max(maxLng, lon);
                      maxLat = Math.max(maxLat, lat);
                    });
                    mapInstance.fitBounds(
                      [[minLng, minLat], [maxLng, maxLat]],
                      { padding: 20, duration: 2000 }
                    );
                  }
                }}
                placeholder="Search places, transit, routes..."
                className="w-full"
              />
            </div>
            {/* Separator between search and menu */}
            <div className="border-t my-1" style={{ borderColor: 'hsl(var(--border))' }} />
            {/* Main menu below */}
            <MainMenu onPaneSelect={handlePaneChange} className="px-3 py-1 space-y-1" />
            {/* Separator */}
            <div className="border-t my-1" style={{ borderColor: 'hsl(var(--border))' }} />
            {/* Compact Places section below menu */}
            <PlacesPane compact onBack={handleCloseSidebar} mapRef={mapRef} />
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {activePane === 'directions' && (
              <DirectionsPane onBack={handleBackToMenu} mapRef={mapRef} />
            )}
            {activePane === 'home' && (
              <HomePane onBack={handleBackToMenu} mapRef={mapRef} />
            )}
            {activePane === 'transit' && (
              <TransitPane onBack={handleBackToMenu} mapRef={mapRef} />
            )}
            {activePane === 'places' && (
              <PlacesPane onBack={handleBackToMenu} mapRef={mapRef} />
            )}
            {activePane === 'style' && (
              <StylePane onBack={handleBackToMenu} />
            )}
          </div>
        )}
      </div>
    </div>
  );
} 