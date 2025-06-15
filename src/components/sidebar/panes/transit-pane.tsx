import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { PaneHeader } from '../shared/pane-header';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import { useUnifiedPOIHandler } from '@/hooks/map/use-unified-poi-handler';
import { useRouteHandler } from '@/hooks/map/use-route-handler';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { MapPin, Route } from 'lucide-react';
import { usePOIStore } from '@/stores/use-poi-store';
import { useRouteStore } from '@/stores/use-route-store';
import type { PointOfInterest } from '@/types/core';
import type { ObaStopSearchResult } from '@/types/oba';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface TransitPaneProps {
  onBack: () => void;
  mapRef?: React.RefObject<MapRef>;
}

const formatObaRouteType = (type?: number): string => {
  switch (type) {
    case 0: return 'Tram, Streetcar, Light Rail';
    case 1: return 'Subway, Metro';
    case 2: return 'Rail';
    case 3: return 'Bus';
    case 4: return 'Ferry';
    case 5: return 'Cable Car';
    case 6: return 'Gondola, Suspended Cable Car';
    case 7: return 'Funicular';
    default: return 'Unknown';
  }
};

export function TransitPane({ onBack, mapRef }: TransitPaneProps): ReactElement {
  const unifiedHandler = useUnifiedPOIHandler({ map: mapRef?.current ?? null });
  const routeHandler = useRouteHandler({ enableVehicleTracking: true });
  const activeSelection = usePOIStore(state => state.activeSelection);
  const selectedStopId = activeSelection?.poi.id;

  // User geolocation for distance computations
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      });
    }
  }, []);

  const activeRoute = useRouteStore(state => {
    const id = state.activeRouteId;
    return id ? state.routes[id] : null;
  });
  const selectedBranch = activeRoute?.selectedSegmentIndex ?? 0;
  const branchCount = activeRoute?.branches?.length ?? 0;
  const [stopsOpen, setStopsOpen] = useState(true);

  // Haversine distance helper
  const getDistance = (a: {latitude: number; longitude: number}, b: {latitude: number; longitude: number}): number => {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const R = 6371000;
    const φ1 = toRad(a.latitude);
    const φ2 = toRad(b.latitude);
    const Δφ = toRad(b.latitude - a.latitude);
    const Δλ = toRad(b.longitude - a.longitude);
    const sinΔφ = Math.sin(Δφ/2);
    const sinΔλ = Math.sin(Δλ/2);
    const c = 2 * Math.atan2(
      Math.sqrt(sinΔφ*sinΔφ + Math.cos(φ1)*Math.cos(φ2)*sinΔλ*sinΔλ),
      Math.sqrt(1 - (sinΔφ*sinΔφ + Math.cos(φ1)*Math.cos(φ2)*sinΔλ*sinΔλ))
    );
    return R * c;
  };

  const handleClearRoute = () => {
    routeHandler.clearAllRoutes();
    unifiedHandler.clearSelection();
  };

  const handleRouteSelect = async (routeId: string) => {
    const storeRouteId = await routeHandler.addOBARoute(routeId);
    routeHandler.selectRoute(storeRouteId);
    const route = routeHandler.getRoute(storeRouteId);
    const mapInst = mapRef?.current?.getMap();
    if (mapInst && route?.geometry) {
      const coordsArr = route.geometry.geometry.coordinates;
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      coordsArr.forEach(([lon, lat]) => {
        minLng = Math.min(minLng, lon);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lon);
        maxLat = Math.max(maxLat, lat);
      });
      mapInst.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 20, duration: 1500 }
      );
    }
  };

  const handleStopClick = (stop: ObaStopSearchResult) => {
    const poi: PointOfInterest = {
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
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <PaneHeader title="" onBack={onBack}>
        {activeRoute && (
          <Button variant="outline" size="sm" onClick={handleClearRoute}>
            Clear Route
          </Button>
        )}
      </PaneHeader>
      
      <div className="p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <UnifiedSearchBox
          accessToken={MAPBOX_ACCESS_TOKEN}
          mapRef={mapRef}
          onLocationSelect={(poi) => {
            unifiedHandler.handleSearchResultClick(poi);
          }}
          onClear={handleClearRoute}
          onRouteSelect={handleRouteSelect}
          placeholder="Search stops or routes..."
          className="w-full"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-4">
        {activeRoute ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Route header with shortName & longName */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Route {activeRoute.obaRoute?.shortName}</h3>
              {activeRoute.obaRoute?.longName && (
                <p className="text-sm text-muted-foreground">{activeRoute.obaRoute.longName}</p>
              )}
              <div className="border-t my-2" style={{ borderColor: 'hsl(var(--border))' }} />
            </div>
            {/* Branch selector dropdown */}
            {branchCount > 1 && (
              <Select
                value={String(selectedBranch)}
                onValueChange={(val) => routeHandler.selectSegment(activeRoute.id, parseInt(val, 10))}
              >
                <SelectTrigger className="w-full mb-4">
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  {activeRoute.branches!.map((branch, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Separator before stops */}
            <div className="border-t my-2" style={{ borderColor: 'hsl(var(--border))' }} />
            {/* Collapsible full stops list */}
            <div className="mb-2">
              <button
                className="w-full flex justify-between items-center text-sm font-medium"
                onClick={() => setStopsOpen(open => !open)}
              >
                {stopsOpen ? 'Hide All Stops' : `Show All Stops (${activeRoute.branches?.[selectedBranch]?.stops.length ?? 0})`}
              </button>
            </div>
            {stopsOpen && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ul className="list-none pl-4 space-y-1">
                  {(() => {
                    const stops = activeRoute?.branches?.[selectedBranch]?.stops || [];
                    // attach distances and sort if userLocation available
                    const processed = stops.map(stop => ({
                      stop,
                      dist: userLocation ? getDistance(userLocation, stop) : null
                    }));
                    if (userLocation) {
                      processed.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
                    }
                    return processed.map(({ stop, dist }) => (
                    <li key={stop.id}>
                    <Button
                      variant="ghost"
                          className={`w-full text-left ${selectedStopId === stop.id ? 'text-base font-semibold' : 'text-sm'}`}
                        onClick={() => handleStopClick(stop as ObaStopSearchResult)}
                    >
                      {stop.name}
                          {dist != null && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {dist < 1000 ? `${Math.round(dist)}m` : `${(dist/1000).toFixed(1)}km`}
                            </span>
                          )}
                    </Button>
                  </li>
                    ));
                  })()}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <Route className="mx-auto mb-2 w-6 h-6 text-muted-foreground" />
            <p>Search for stops or routes above.</p>
          </div>
        )}
      </div>
    </div>
  );
} 