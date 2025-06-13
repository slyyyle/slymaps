import React from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { PaneHeader } from '../shared/pane-header';
import { DirectionsForm } from '@/components/search/directions-form';

interface DirectionsPaneProps {
  onBack: () => void;
  mapRef?: React.RefObject<MapRef>;
}

export function DirectionsPane({ onBack, mapRef }: DirectionsPaneProps) {
  return (
    <div className="flex flex-col h-full">
      <PaneHeader 
        title="Directions" 
        onBack={onBack}
      />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <DirectionsForm mapRef={mapRef} />
        </div>
      </div>
    </div>
  );
} 