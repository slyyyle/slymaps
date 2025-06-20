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
    {(activeStopId
      ? obaRouteStops.filter(stop => stop.id === activeStopId)
      : obaRouteStops
    ).map(stop => {
      const stopPoi: Place = {
        id: stop.id,
        name: stop.name,
        type: 'Bus Stop',
        latitude: stop.latitude,
        longitude: stop.longitude,
        description: `Stop #${stop.code} - ${stop.direction} bound`,
        isObaStop: true,
        properties: {
          source: 'oba',
          stop_code: stop.code,
          direction: stop.direction,
          route_ids: stop.routeIds,
          wheelchair_boarding: stop.wheelchairBoarding
        }
      };
      const isSelected = activeSelectionId === stop.id;
      return (
        <Marker
          key={`oba-stop-${stop.id}`}
          latitude={stop.latitude}
          longitude={stop.longitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            handleSearchResultClick(stopPoi);
            flyTo({ latitude: stop.latitude, longitude: stop.longitude }, { zoom: 16 });
          }}
        >
          {isSelected ? (
            <span className="text-2xl">🚦</span>
          ) : (
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          )}
        </Marker>
      );
    })}
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