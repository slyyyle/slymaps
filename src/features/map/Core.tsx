"use client";

import React from 'react';
import type { ViewState } from 'react-map-gl/mapbox';
import { Map } from 'react-map-gl/mapbox';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/constants';

export interface CoreProps {
  mapRef: React.RefObject<import('react-map-gl/mapbox').MapRef>;
  viewState: Partial<ViewState>;
  onMove: (e: any) => void;
  onLoad?: (e: any) => void;
  mapStyleUrl: string;
  cursor?: string;
  onContextMenu?: (e: any) => void;
  children?: React.ReactNode;
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

  // Reassert Standard config on style load (safety)
  const handleLoad = React.useCallback((e: any) => {
    try {
      const map = e?.target ?? mapRef.current?.getMap();
      if (!map) return;
      const apply = () => {
        map.setConfigProperty('basemap', 'lightPreset', 'dusk');
        map.setConfigProperty('basemap', 'show3dObjects', true);
      };
      if (map.isStyleLoaded()) apply();
      map.on('style.load', apply);
    } catch {}
    onLoad?.(e);
  }, [mapRef, onLoad]);

  return (
    <Map
      {...viewState}
      ref={mapRef}
      onMove={onMove}
      onLoad={handleLoad}
      mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
      mapStyle={mapStyleUrl}
      attributionControl={false}
      style={{ width: '100%', height: '100%', cursor }}
      onContextMenu={onContextMenu}
      projection={{ name: 'globe' }}
      antialias={false}
      maxPitch={75}
      maxBounds={[[-170, 32.0], [-104, 60.0]]}
      config={{
        basemap: {
          lightPreset: 'dusk',
          show3dObjects: true,
        },
      }}
    >
      {children}
    </Map>
  );
};

export default Core; 