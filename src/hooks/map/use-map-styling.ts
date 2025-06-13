import { useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { MapStyle } from '@/types/core';
import { MAP_STYLES } from '@/lib/constants';

export function useMapStyling(mapRef: React.RefObject<MapRef | null>) {
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>(MAP_STYLES[0]);

  const isStandardStyle = currentMapStyle.url.includes('mapbox://styles/mapbox/standard');

  return {
    currentMapStyle,
    setCurrentMapStyle,
    isStandardStyle,
  };
} 