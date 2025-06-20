"use client";



import React from 'react';
import {
  NavigationControl,
  FullscreenControl,
  GeolocateControl
} from 'react-map-gl/mapbox';
import { ThreeDToggle } from '@/components/map/3d-toggle';
import { TerrainControl } from '@/components/map/terrain-control';
import DrawControls from '@/components/draw/DrawControls';
import type { MapRef } from 'react-map-gl/mapbox';

interface ControlsProps {
  mapRef: React.RefObject<MapRef>;
  is3DEnabled: boolean;
  onToggle3D: (enabled: boolean) => void;
  isTerrainEnabled: boolean;
  terrainExaggeration: number;
  onToggleTerrain: (enabled: boolean) => void;
  onExaggerationChange: (exaggeration: number) => void;
}

const Controls: React.FC<ControlsProps> = ({
  mapRef,
  is3DEnabled,
  onToggle3D,
  isTerrainEnabled,
  terrainExaggeration,
  onToggleTerrain,
  onExaggerationChange
}) => (
  <>
    <NavigationControl position="top-right" />
    <FullscreenControl position="top-right" />
    <div className="absolute bottom-4 right-4 z-50 flex flex-col items-start gap-2 quick-settings-panel rounded-lg shadow-lg p-2">
      <ThreeDToggle
        is3DEnabled={is3DEnabled}
        onToggle3D={onToggle3D}
        isStandardStyle={true}
      />
      <TerrainControl
        isTerrainEnabled={isTerrainEnabled}
        terrainExaggeration={terrainExaggeration}
        onToggleTerrain={onToggleTerrain}
        onExaggerationChange={onExaggerationChange}
        isStandardStyle={true}
      />
    </div>
    <GeolocateControl
      positionOptions={{ enableHighAccuracy: true }}
      trackUserLocation={true}
      showUserHeading={true}
      showAccuracyCircle={false}
      position="top-right"
    />
    <DrawControls mapRef={mapRef} />
  </>
);

export default Controls; 