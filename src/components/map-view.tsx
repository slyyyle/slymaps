"use client";

import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, GeolocateControl, Source, Layer, type ViewState, type MapLayerMouseEvent } from 'react-map-gl';
import type { PointOfInterest, CustomPOI, Route as RouteType, Coordinates } from '@/types';
import { MAPBOX_ACCESS_TOKEN, INITIAL_VIEW_STATE } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons, IconName } from '@/components/icons';
import Image from 'next/image';

interface MapViewProps {
  viewState: Partial<ViewState>;
  onViewStateChange: (newViewState: ViewState) => void;
  pois: (PointOfInterest | CustomPOI)[];
  selectedPoi: PointOfInterest | CustomPOI | null;
  onSelectPoi: (poi: PointOfInterest | CustomPOI | null) => void;
  mapStyleUrl: string;
  route: RouteType | null;
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
}

const getIconForPoiType = (type: string): IconName => {
  switch (type.toLowerCase()) {
    case 'restaurant': return 'Restaurant';
    case 'bar': return 'Bar';
    case 'venue': return 'Venue';
    case 'shop': return 'Shop';
    case 'park': return 'Park';
    case 'home': return 'Home';
    case 'work': return 'Work';
    default: return 'MapPin';
  }
};

export function MapView({
  viewState: externalViewState,
  onViewStateChange,
  pois,
  selectedPoi,
  onSelectPoi,
  mapStyleUrl,
  route,
  onFlyTo
}: MapViewProps) {
  const [internalViewState, setInternalViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [cursor, setCursor] = useState<string>('grab');

  useEffect(() => {
    setInternalViewState(prev => ({ ...prev, ...externalViewState }));
  }, [externalViewState]);

  const handleMove = (evt: { viewState: ViewState }) => {
    setInternalViewState(evt.viewState);
    onViewStateChange(evt.viewState);
  };
  
  const handlePoiClick = (e: MapLayerMouseEvent, poi: PointOfInterest | CustomPOI) => {
    e.originalEvent.stopPropagation(); // Prevent map click event when clicking on a marker
    onSelectPoi(poi);
    onFlyTo({ latitude: poi.latitude, longitude: poi.longitude }, 15);
  };

  const routeLayer: any = {
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': 'hsl(var(--accent))', // Use accent color from theme
      'line-width': 6,
      'line-opacity': 0.8,
    },
  };
  
  // Add 3D buildings layer
  const buildingsLayer: any = {
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': '#aaa',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'height'],
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'min_height'],
      ],
      'fill-extrusion-opacity': 0.6,
    },
  };


  return (
    <Map
      {...internalViewState}
      mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
      onMove={handleMove}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyleUrl}
      onMouseEnter={() => setCursor('grab')}
      onMouseLeave={() => setCursor('auto')}
      cursor={cursor}
      onMouseDown={() => setCursor('grabbing')}
      onMouseUp={() => setCursor('grab')}
      onClick={() => onSelectPoi(null)} // Deselect POI on map click
      interactiveLayerIds={['clusters', 'unclustered-point', 'route']} // Make sure route is interactive if needed
    >
      <GeolocateControl position="top-right" />
      <FullscreenControl position="top-right" />
      <NavigationControl position="top-right" />

      {pois.map(poi => {
        const IconComponent = Icons[getIconForPoiType(poi.type)] || Icons.MapPin;
        return (
          <Marker
            key={poi.id}
            longitude={poi.longitude}
            latitude={poi.latitude}
            onClick={(e) => handlePoiClick(e, poi)}
            anchor="bottom"
          >
            <button className="transform hover:scale-110 transition-transform focus:outline-none">
              <IconComponent
                className={`w-7 h-7 ${selectedPoi?.id === poi.id ? 'text-accent' : 'text-primary'} drop-shadow-md`}
                strokeWidth={selectedPoi?.id === poi.id ? 3 : 2}
              />
            </button>
          </Marker>
        );
      })}

      {selectedPoi && (
        <Popup
          longitude={selectedPoi.longitude}
          latitude={selectedPoi.latitude}
          onClose={() => onSelectPoi(null)}
          closeOnClick={false}
          anchor="top"
          offset={25}
          className="font-body"
        >
          <Card className="w-64 border-none shadow-none">
            <CardHeader className="p-3">
              {selectedPoi.imageUrl && (
                 <Image src={selectedPoi.imageUrl} alt={selectedPoi.name} width={250} height={120} className="rounded-md object-cover mb-2" data-ai-hint={selectedPoi.dataAiHint} />
              )}
              <CardTitle className="text-base font-headline">{selectedPoi.name}</CardTitle>
              <CardDescription className="text-xs">{selectedPoi.type}</CardDescription>
            </CardHeader>
            {selectedPoi.description && (
              <CardContent className="p-3 pt-0 text-sm">
                <p>{selectedPoi.description}</p>
                {(selectedPoi as CustomPOI).isCustom && (selectedPoi as CustomPOI).address && (
                  <p className="text-xs text-muted-foreground mt-1">{(selectedPoi as CustomPOI).address}</p>
                )}
              </CardContent>
            )}
          </Card>
        </Popup>
      )}

      {route && route.geometry && (
        <Source id="route" type="geojson" data={route.geometry}>
          <Layer {...routeLayer} />
        </Source>
      )}
      
      <Layer {...buildingsLayer} />

    </Map>
  );
}
