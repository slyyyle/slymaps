"use client";

import React from 'react';
import type { ViewState, MapRef } from 'react-map-gl/mapbox';
import type { PointOfInterest, Coordinates } from '@/types/core';
import type { FlyToOptions } from '@/hooks/map/use-map-navigation';
import { StandardMapView } from './interactive-mapbox';

// NEW SEGREGATED APPROACH - Remove monolithic data integration
// import { useDataIntegration } from '@/hooks/data/use-data-integration';

export interface MapViewProps {
  mapRef: React.RefObject<MapRef>;
  viewState: Partial<ViewState>;
  onViewStateChange: (newViewState: ViewState) => void;
  mapStyleUrl: string;
  currentLocation: Coordinates | null;
  isLoadingLocation: boolean;
  isBusy: boolean;
  
  // Route/directions data (still uses central coordination for now)
  mapboxDirectionsRoute?: import('@/types/directions').Route | null;
  routeStartCoords?: Coordinates | null;
  routeEndCoords?: Coordinates | null;
  showTurnMarkers?: boolean;
  obaRouteGeometry?: import('@/types/oba').ObaRouteGeometry | null;
  obaStopArrivals?: import('@/types/oba').ObaArrivalDeparture[];
  isLoadingArrivals?: boolean;
  onSelectRouteForPath?: (routeId: string) => void;
  obaVehicleLocations?: import('@/types/oba').ObaVehicleLocation[];
  onSetDestination?: (coords: Coordinates) => void;
  
  // Location control props (optional for consumers)
  onRequestGpsLocation?: () => Promise<Coordinates>;
  onSetManualLocation?: (coords: Coordinates) => void;
}

export function MapView(props: MapViewProps) {
  console.log('🗺️ MapView using segregated POI architecture');
  return <StandardMapView {...props} />;
} 