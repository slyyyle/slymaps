"use client";

import React from 'react';
import Map from 'react-map-gl/mapbox';
import type { ViewState, MapRef } from 'react-map-gl/mapbox';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';

interface CoreProps {
  mapRef: React.RefObject<MapRef>;
  viewState: Partial<ViewState>;
  onMove: (evt: any) => void;
  onLoad: (evt: any) => void;
  mapStyleUrl: string;
  cursor?: string;
  onContextMenu?: (e: any) => void;
  children: React.ReactNode;
}

export const Core: React.FC<CoreProps> = ({
  mapRef,
  viewState,
  onMove,
  onLoad,
  mapStyleUrl,
  cursor,
  onContextMenu,
  children,
}) => {
  // Don't render anything on the server
  if (typeof window === 'undefined') {
    return <div style={{ width: '100%', height: '100%' }} />;
  }

  return (
    <Map
      {...viewState}
      ref={mapRef}
      onMove={onMove}
      onLoad={onLoad}
      mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
      mapStyle={mapStyleUrl}
      attributionControl={false}
      style={{ width: '100%', height: '100%', cursor }}
      onContextMenu={onContextMenu}
      projection={{ name: 'globe' }}
      maxBounds={[[ -170, 32.0 ], [ -104, 60.0 ]]}
    >
      {children}
    </Map>
  );
};

export default Core; 