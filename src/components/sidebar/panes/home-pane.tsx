import React, { useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { PaneHeader } from '../shared/pane-header';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import { OSMDescription } from '@/components/popup/osm_description';
import { useHomeStore } from '@/stores/use-home-store';
import { useOSMData } from '@/hooks/data/use-osm-data';
import type { Coordinates, Place } from '@/types/core';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';

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
      <PaneHeader title="Home" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        {homeLocation ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Icons.Home className="h-8 w-8 text-blue-500" />
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
              <OSMDescription address={homeLocation.description} />
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
              <Icons.Home className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
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
      </div>
    </div>
  );
} 