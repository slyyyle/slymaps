import React from 'react';
import { PaneHeader } from '../shared/pane-header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { usePlaceIntegration } from '@/hooks/data/use-place-integration';
import { useTransitIntegration } from '@/hooks/data/use-transit-integration';
import type { Place } from '@/types/core';
import type { MapRef } from 'react-map-gl/mapbox';

interface PlacesPaneProps {
  onBack: () => void;
  mapRef?: React.RefObject<MapRef>;
  /** show back chevron in header */
  showBack?: boolean;
}

export function PlacesPane({ onBack, mapRef, showBack = false }: PlacesPaneProps) {
  const { getSearchResults, promoteSearchResultToStored, deleteSearchResult } = usePlaceIntegration();
  const { recentSearchRoutes, toggleFavoriteRoute, deleteRoute } = useTransitIntegration();

  // Recent Places and Stops from temporary search history
  const searchResults: Place[] = getSearchResults();
  const placeResults = searchResults.filter(poi => !(poi as any).isObaStop);
  const stopResults = searchResults.filter(poi => (poi as any).isObaStop);

  // Recent transit routes (excluding saved favorites)
  const routes = recentSearchRoutes;

  return (
    <div className="flex flex-col h-full">
      <PaneHeader title="Recent Searches" onBack={onBack} showBack={showBack} />
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Places */}
          {placeResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium mb-2">Places</h3>
                <Button variant="ghost" size="sm" onClick={() => placeResults.forEach(poi => deleteSearchResult(poi.id))}>
                  Clear All
                </Button>
              </div>
              {placeResults.map(poi => (
                <div key={poi.id} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icons.MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{poi.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => promoteSearchResultToStored(poi.id)}>
                      <Icons.Heart className="h-4 w-4 text-white" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const map = mapRef?.current?.getMap();
                      if (map) map.flyTo({ center: [poi.longitude, poi.latitude], zoom: 15 });
                    }}>
                      <Icons.MapPin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteSearchResult(poi.id)}>
                      <Icons.X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Stops */}
          {stopResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium mb-2">Stops</h3>
                <Button variant="ghost" size="sm" onClick={() => stopResults.forEach(poi => deleteSearchResult(poi.id))}>
                  Clear All
                </Button>
              </div>
              {stopResults.map(poi => (
                <div key={poi.id} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icons.MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{poi.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => promoteSearchResultToStored(poi.id)}>
                      <Icons.Heart className="h-4 w-4 text-red-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const map = mapRef?.current?.getMap();
                      if (map) map.flyTo({ center: [poi.longitude, poi.latitude], zoom: 15 });
                    }}>
                      <Icons.MapPin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteSearchResult(poi.id)}>
                      <Icons.X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Routes */}
          {routes.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium mb-2">Routes</h3>
                <Button variant="ghost" size="sm" onClick={() => routes.forEach(route => deleteRoute(route.id))}>
                  Clear All
                </Button>
              </div>
              {routes.map(route => (
                <div key={route.id} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icons.Bus className="h-4 w-4 text-muted-foreground" />
                    <span>{route.obaRoute?.shortName || route.obaRoute?.longName || route.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleFavoriteRoute(route.id)}>
                      <Icons.Heart className={`h-4 w-4 ${route.isFavorite ? 'fill-current text-red-500' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      const map = mapRef?.current?.getMap();
                      if (map && route.geometry) {
                        const coords = route.geometry.geometry.coordinates as [number, number][];
                        const lons = coords.map(c => c[0]);
                        const lats = coords.map(c => c[1]);
                        map.fitBounds(
                          [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
                          { padding: 20 }
                        );
                      }
                    }}>
                      <Icons.MapPin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRoute(route.id)}>
                      <Icons.X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Empty state */}
          {placeResults.length === 0 && stopResults.length === 0 && routes.length === 0 && (
            <div className="text-center pt-6">
              <Icons.MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No recent searches yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 