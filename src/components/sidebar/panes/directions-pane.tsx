import React from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { DirectionsForm } from '@/components/search/directions-form';

interface DirectionsPaneProps {
  mapRef?: React.RefObject<MapRef>;
  onBeginTrip: () => void;
}

export function DirectionsPane({ mapRef, onBeginTrip }: DirectionsPaneProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <DirectionsForm mapRef={mapRef} onBeginTrip={onBeginTrip} />
        </div>
      </div>
    </div>
  );
} 