import React, { useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import { OSMDescription } from '@/components/popup/osm_description';
import { useHomeStore } from '@/stores/use-home-store';
import { useOSMData } from '@/hooks/data/use-osm-data';
import { usePlaceStore } from '@/stores/use-place-store';
import { useTransitIntegration } from '@/hooks/data/use-transit-integration';
import { usePlaceIntegration } from '@/hooks/data/use-place-integration';
import type { Coordinates, Place } from '@/types/core';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';
import { useShallow } from 'zustand/react/shallow';

interface HomePaneProps {
  onBack: () => void;
  mapRef?: React.RefObject<MapRef>;
}

export function HomePane({ onBack, mapRef }: HomePaneProps) {
  const homeLocation = useHomeStore(state => state.homeLocation);
  const setHomeLocation = useHomeStore(state => state.setHomeLocation);
  const clearHomeLocation = useHomeStore(state => state.clearHomeLocation);
  const isSettingHome = useHomeStore(state => state.isSettingHome);
  const setIsSettingHome = useHomeStore(state => state.setIsSettingHome);
  const updateLastAccessed = useHomeStore(state => state.updateLastAccessed);
  
  const { reverseGeocode } = useOSMData();
  const [isSaving, setIsSaving] = useState(false);
  // Saved Places and Stops from Promoted search results
  const storedPOIs: Place[] = usePlaceStore(
    useShallow(state => Object.values(state.storedPOIs))
  );
  const savedPlaces = storedPOIs.filter(poi => !(poi as any).isObaStop);
  const savedStops = storedPOIs.filter(poi => (poi as any).isObaStop);
  // Saved Routes
  const transitIntegration = useTransitIntegration();
  const placeIntegration = usePlaceIntegration();
  const savedRoutes = transitIntegration.favoriteRoutes;

  const handleResult = async (coords: Coordinates, name?: string) => {
    setIsSaving(true);
    setIsSettingHome(true);
    
    try {
    // Reverse-geocode to get full address
    const result = await reverseGeocode(coords.latitude, coords.longitude);
    const addr = result?.display_name;
      
    const poi: Place = {
      id: 'home',
      name: name || 'Home',
      type: 'home',
      latitude: coords.latitude,
      longitude: coords.longitude,
      description: addr || undefined,
    };
      
      setHomeLocation(poi);
      
    // Fly to home location
    if (mapRef?.current) {
      const map = mapRef.current.getMap();
      map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 18 });
    }
    } catch (error) {
      console.error('Error setting home location:', error);
    } finally {
    setIsSaving(false);
      setIsSettingHome(false);
    }
  };

  const handleGoToHome = () => {
    if (homeLocation && mapRef?.current) {
      const map = mapRef.current.getMap();
      map?.flyTo({ 
        center: [homeLocation.longitude, homeLocation.latitude], 
        zoom: 18 
      });
      updateLastAccessed();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {homeLocation ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏠</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{homeLocation.name}</h3>
                {homeLocation.setAt && (
                  <p className="text-xs text-muted-foreground">
                    Set {new Date(homeLocation.setAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            
            {homeLocation.description && (
              <OSMDescription address={homeLocation.description} variant="double" />
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={handleGoToHome}
                className="flex-1"
                disabled={isSaving || isSettingHome}
              >
                <Icons.Navigation className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
              
            <Button
              variant="outline"
                onClick={() => clearHomeLocation()}
                disabled={isSaving || isSettingHome}
            >
              Clear Home
            </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6">
              <span className="text-5xl text-muted-foreground mx-auto mb-3">🏠</span>
              <h3 className="text-lg font-semibold mb-2">Set Your Home Location</h3>
              <p className="text-sm text-muted-foreground">
                Search for your home address to save it for quick access.
              </p>
            </div>
            
          <UnifiedSearchBox
            accessToken={MAPBOX_ACCESS_TOKEN}
            mapRef={mapRef}
            suggestionTypes={['place']}
            onResult={handleResult}
            onClear={() => {}}
            placeholder="Search for your home address…"
            className="w-full"
            disabled={isSaving || isSettingHome}
          />
            
            {(isSaving || isSettingHome) && (
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                  Setting home location...
                </div>
              </div>
            )}
          </div>
        )}
        {/* Saved Places */}
        {savedPlaces.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Saved Places</h3>
            {savedPlaces.map(poi => (
              <div key={poi.id} className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">{poi.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => placeIntegration.toggleFavorite(poi.id)}>
                    <Icons.Star className={`h-4 w-4 ${(poi as any).isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (mapRef?.current) mapRef.current.getMap().flyTo({ center: [poi.longitude, poi.latitude], zoom: 15 });
                  }}>
                    <Icons.MapPin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => placeIntegration.deleteStoredPlace(poi.id)}>
                    <Icons.X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Saved Stops */}
        {savedStops.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Saved Stops</h3>
            {savedStops.map(poi => (
              <div key={poi.id} className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">{poi.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => placeIntegration.toggleFavorite(poi.id)}>
                    <Icons.Star className={`h-4 w-4 ${(poi as any).isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (mapRef?.current) mapRef.current.getMap().flyTo({ center: [poi.longitude, poi.latitude], zoom: 15 });
                  }}>
                    <Icons.MapPin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => placeIntegration.deleteStoredPlace(poi.id)}>
                    <Icons.X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Saved Routes */}
        {savedRoutes.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Saved Routes</h3>
            {savedRoutes.map(route => (
              <div key={route.id} className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium">
                    {route.obaRoute?.shortName ? `Route ${route.obaRoute.shortName}` : route.obaRoute?.longName}
                  </span>
                  {route.obaRoute?.longName && route.obaRoute?.shortName && (
                    <p className="text-xs text-muted-foreground">{route.obaRoute.longName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    transitIntegration.toggleFavoriteRoute(route.id);
                  }}>
                    <Icons.Star className={`h-4 w-4 ${route.isFavorite ? 'fill-current' : ''}`} />
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
                  <Button variant="ghost" size="sm" onClick={() => transitIntegration.deleteRoute(route.id)}>
                    <Icons.X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 