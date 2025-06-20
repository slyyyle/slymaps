"use client";

import React from 'react';
import type { ViewState, MapRef } from 'react-map-gl/mapbox';
import type { Coordinates } from '@/types/core';
import { StandardMapView } from './interactive-mapbox';

export interface MapViewProps {
  mapRef: React.RefObject<MapRef>;
  viewState: Partial<ViewState>;
  onViewStateChange: (newViewState: ViewState) => void;
  mapStyleUrl: string;
  currentLocation: Coordinates | null;
  isLoadingLocation: boolean;
  isBusy: boolean;
  
  // Route/directions data (still uses central coordination for now)
  mapboxDirectionsRoute?: import('@/types/transit/directions').Route | null;
  routeStartCoords?: Coordinates | null;
  routeEndCoords?: Coordinates | null;
  showTurnMarkers?: boolean;
  obaRouteSegments?: import('@/types/transit/oba').ObaRouteGeometry[];
  obaRouteStops?: import('@/types/transit/oba').ObaStopSearchResult[];
  obaVehicleLocations?: import('@/types/transit/oba').ObaVehicleLocation[];
  routeSchedule?: import('@/types/transit/oba').ObaScheduleEntry[];
  onSetDestination?: (coords: Coordinates) => void;
  
  // Location control props (optional for consumers)
  onRequestGpsLocation?: () => Promise<Coordinates>;
  onSetManualLocation?: (coords: Coordinates) => void;
}

export function MapView(props: MapViewProps) {
  return <StandardMapView {...props} />;
} 