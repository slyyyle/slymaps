"use client";

import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { TemporaryDestinationMarker } from '@/components/map/temporary-destination-marker';
import type { Place, Coordinates } from '@/types/core';
import type { ObaStopSearchResult } from '@/types/transit/oba';
import { Icons } from '@/components/icons';

interface MarkersProps {
  vehicleMarkers: React.ReactNode;
  turnMarkers: React.ReactNode;
  obaRouteStops: ObaStopSearchResult[];
  activeStopId: string | null;
  activeSelectionId: string | null;
  routeStartCoords?: { latitude: number; longitude: number };
  routeEndCoords?: { latitude: number; longitude: number };
  handleSearchResultClick: (poi: Place) => void;
  flyTo: (coords: { latitude: number; longitude: number }, opts?: any) => void;
  destinationSetting: {
    temporaryDestination?: Coordinates | null;
    confirmDestination: (coords: Coordinates) => void;
    cancelDestinationSetting: () => void;
  };
}

const Markers: React.FC<MarkersProps> = ({
  vehicleMarkers,
  turnMarkers,
  obaRouteStops,
  activeStopId,
  activeSelectionId,
  routeStartCoords,
  routeEndCoords,
  handleSearchResultClick,
  flyTo,
  destinationSetting
}) => (
  <>
    {/* POI markers removed - using Mapbox right-click pinning instead */}
    {vehicleMarkers}
    {turnMarkers}
    {routeStartCoords && (
      <Marker longitude={routeStartCoords.longitude} latitude={routeStartCoords.latitude} anchor="bottom">
        <Icons.MapPin className="w-6 h-6 text-green-600 drop-shadow-lg" />
      </Marker>
    )}
    {routeEndCoords && (
      <Marker longitude={routeEndCoords.longitude} latitude={routeEndCoords.latitude} anchor="bottom">
        <Icons.MapPin className="w-6 h-6 text-red-600 drop-shadow-lg" />
      </Marker>
    )}
    {destinationSetting.temporaryDestination && (
      <TemporaryDestinationMarker
        coordinates={destinationSetting.temporaryDestination}
        onConfirm={destinationSetting.confirmDestination}
        onCancel={destinationSetting.cancelDestinationSetting}
      />
    )}
  </>
);

export default Markers; 