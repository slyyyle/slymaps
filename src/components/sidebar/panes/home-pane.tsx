import React, { useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { PaneHeader } from '../shared/pane-header';
import { UnifiedSearchBox } from '@/components/search/unified-search';
import { OSMDescription } from '@/components/popup/osm_description';
import { useDataIntegration } from '@/hooks/data/use-data-integration';
import type { Coordinates, PointOfInterest } from '@/types/core';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';

interface HomePaneProps {
  onBack: () => void;
  mapRef?: React.RefObject<MapRef>;
}

export function HomePane({ onBack, mapRef }: HomePaneProps) {
  const { home, osm } = useDataIntegration();
  const existing = home.getHome();
  const [isSaving, setIsSaving] = useState(false);

  const handleResult = async (coords: Coordinates, name?: string) => {
    setIsSaving(true);
    // Reverse-geocode to get full address
    const addr = await osm.getProperAddress(coords.latitude, coords.longitude);
    const poi: PointOfInterest = {
      id: `home`,
      name: name || 'Home',
      type: 'home',
      latitude: coords.latitude,
      longitude: coords.longitude,
      description: addr || undefined,
      isSearchResult: false,
    };
    home.setHomePOI(poi);
    // Fly to home location
    if (mapRef?.current) {
      const map = mapRef.current.getMap();
      map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 18 });
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PaneHeader title="Home" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        {existing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Icons.Home className="h-8 w-8 text-blue-500" />
              <h3 className="text-lg font-semibold">{existing.name}</h3>
            </div>
            {existing.description && (
              <OSMDescription address={existing.description} />
            )}
            <Button
              variant="outline"
              onClick={() => home.clearHomePOI()}
              disabled={isSaving}
            >
              Clear Home
            </Button>
          </div>
        ) : (
          <UnifiedSearchBox
            accessToken={MAPBOX_ACCESS_TOKEN}
            mapRef={mapRef}
            onResult={handleResult}
            onClear={() => {}}
            placeholder="Search for your home address…"
            className="w-full"
          />
        )}
      </div>
    </div>
  );
} 