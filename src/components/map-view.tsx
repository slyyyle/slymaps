"use client";

import React from 'react';
import type { ViewState, MapRef } from 'react-map-gl';
import type { PointOfInterest, Route as MapboxRouteType, Coordinates, ObaArrivalDeparture, ObaRouteGeometry, ObaVehicleLocation } from '@/types';
import { StandardMapView } from './map/standard-map-view';
import { SatelliteMapView } from './map/satellite-map-view';

// This interface combines all props needed by either of the specialized map views.
export interface MapViewProps {
  mapRef: React.RefObject<MapRef>;
  viewState: Partial<ViewState>;
  onViewStateChange: (newViewState: ViewState) => void;
  pois: PointOfInterest[];
  selectedPoi: PointOfInterest | null;
  onSelectPoi: (poi: PointOfInterest | null) => void;
  mapStyleUrl: string;
  mapboxDirectionsRoute: MapboxRouteType | null;
  obaRouteGeometry: ObaRouteGeometry | null;
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
  obaStopArrivals: ObaArrivalDeparture[];
  isLoadingArrivals: boolean;
  onSelectRouteForPath: (routeId: string) => void;
  obaVehicleLocations: ObaVehicleLocation[];
  isAutoLighting?: boolean;
  onChangeLightPreset?: (preset: 'day' | 'dusk' | 'dawn' | 'night') => void;
  onToggleAutoLighting?: (auto: boolean) => void;
  currentLightPreset?: 'day' | 'dusk' | 'dawn' | 'night';
}

/**
 * A dispatcher component that renders the correct map view (Standard or Satellite)
 * based on the mapStyleUrl prop. This allows for clean separation of concerns
 * for featuresets that differ between the two styles.
 */
export function MapView(props: MapViewProps) {
  const isSatellite = props.mapStyleUrl.includes('satellite');

  if (isSatellite) {
    return <SatelliteMapView {...props} />;
  }

  return <StandardMapView {...props} />;
} 