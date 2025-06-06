
"use client";

import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, GeolocateControl, Source, Layer, type ViewState, type MapLayerMouseEvent, type MapRef } from 'react-map-gl';
import type { PointOfInterest, CustomPOI, Route as MapboxRouteType, Coordinates, ObaArrivalDeparture, ObaRouteGeometry } from '@/types';
import { MAPBOX_ACCESS_TOKEN, INITIAL_VIEW_STATE } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Icons, IconName } from '@/components/icons';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button'; // Added for route selection in popup

interface MapViewProps {
  mapRef: React.RefObject<MapRef>;
  viewState: Partial<ViewState>;
  onViewStateChange: (newViewState: ViewState) => void;
  pois: (PointOfInterest | CustomPOI)[];
  selectedPoi: PointOfInterest | CustomPOI | null;
  onSelectPoi: (poi: PointOfInterest | CustomPOI | null) => void;
  mapStyleUrl: string;
  mapboxDirectionsRoute: MapboxRouteType | null; // For Mapbox Directions
  obaRouteGeometry: ObaRouteGeometry | null; // For OBA route paths
  onFlyTo: (coords: Coordinates, zoom?: number) => void;
  obaStopArrivals: ObaArrivalDeparture[];
  isLoadingArrivals: boolean;
  // Add onSelectRouteForPath if making routes in popup clickable, similar to sidebar
  // onSelectRouteForPath?: (routeId: string) => void; 
}

const getIconForPoiType = (poi: PointOfInterest | CustomPOI): IconName => {
  if (poi.isObaStop) return 'Bus';
  switch (poi.type.toLowerCase()) {
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

const formatObaTime = (epochTime: number | null | undefined): string => {
  if (!epochTime) return 'N/A';
  return new Date(epochTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getStatusColor = (status?: string) => {
  if (!status) return "bg-gray-500";
  if (status.toLowerCase().includes("scheduled") || status.toLowerCase().includes("on_time")) return "bg-green-500";
  if (status.toLowerCase().includes("delayed")) return "bg-orange-500";
  if (status.toLowerCase().includes("canceled")) return "bg-red-500";
  return "bg-yellow-500"; // For 'early' or other statuses
};

export function MapView({
  mapRef,
  viewState: externalViewState,
  onViewStateChange,
  pois,
  selectedPoi,
  onSelectPoi,
  mapStyleUrl,
  mapboxDirectionsRoute,
  obaRouteGeometry,
  onFlyTo,
  obaStopArrivals,
  isLoadingArrivals,
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
    e.originalEvent.stopPropagation();
    onSelectPoi(poi);
  };

  const mapboxDirectionsRouteLayer: any = {
    id: 'mapbox-directions-route',
    type: 'line',
    source: 'mapbox-directions-route-source',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': 'hsl(var(--accent))', 'line-width': 6, 'line-opacity': 0.8 },
  };

  const obaRoutePathLayer: any = {
    id: 'oba-route-path',
    type: 'line',
    source: 'oba-route-path-source',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': 'hsl(var(--primary))', 'line-width': 5, 'line-opacity': 0.75, 'line-dasharray': [2, 2] },
  };
  
  const buildingsLayer: any = {
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': '#aaa',
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
      'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
      'fill-extrusion-opacity': 0.6,
    },
  };

  return (
    <Map
      ref={mapRef}
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
      interactiveLayerIds={['clusters', 'unclustered-point', 'mapbox-directions-route', 'oba-route-path']}
      onLoad={(e) => {
        if (mapRef && !mapRef.current) {
          (mapRef as React.MutableRefObject<MapRef | null>).current = e.target;
        }
      }}
    >
      <GeolocateControl position="top-right" />
      <FullscreenControl position="top-right" />
      <NavigationControl position="top-right" />

      {pois.map(poi => {
        const IconComponent = Icons[getIconForPoiType(poi)] || Icons.MapPin;
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
                className={`w-7 h-7 ${selectedPoi?.id === poi.id ? 'text-accent' : 'text-primary'} ${poi.isObaStop ? 'text-green-600' : ''} drop-shadow-md`}
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
          closeOnClick={false} // Keep popup open when map is clicked, deselect handled by map's onClick
          anchor="top"
          offset={25}
          className="font-body"
          maxWidth="320px"
        >
          <Card className="border-none shadow-none">
            <CardHeader className="p-3">
              {selectedPoi.imageUrl && !selectedPoi.isObaStop && (
                 <Image src={selectedPoi.imageUrl} alt={selectedPoi.name} width={250} height={120} className="rounded-md object-cover mb-2" data-ai-hint={selectedPoi.dataAiHint} />
              )}
              <CardTitle className="text-base font-headline">{selectedPoi.name}</CardTitle>
              <CardDescription className="text-xs">
                {selectedPoi.isObaStop ? `Stop #${selectedPoi.code} - ${selectedPoi.direction} bound` : selectedPoi.type}
              </CardDescription>
            </CardHeader>
            
            {selectedPoi.description && !selectedPoi.isObaStop && (
              <CardContent className="p-3 pt-0 text-sm">
                <p>{selectedPoi.description}</p>
                {(selectedPoi as CustomPOI).isCustom && (selectedPoi as CustomPOI).address && (
                  <p className="text-xs text-muted-foreground mt-1">{(selectedPoi as CustomPOI).address}</p>
                )}
              </CardContent>
            )}

            {selectedPoi.isObaStop && (
              <CardContent className="p-3 pt-0">
                <h4 className="text-sm font-medium mb-1">Arrivals:</h4>
                {isLoadingArrivals ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : obaStopArrivals.length > 0 ? (
                  <ScrollArea className="h-[120px] text-xs pr-2">
                    <ul className="space-y-1.5">
                      {obaStopArrivals.map((arrival, index) => (
                        <li key={`${arrival.tripId}-${arrival.scheduledArrivalTime}-${index}`} className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            {/* Route short name in popup is not clickable for now to keep it simple, use sidebar */}
                            <Badge variant="secondary" className="font-semibold w-12 text-center truncate">{arrival.routeShortName}</Badge>
                            <span className="truncate flex-1" title={arrival.tripHeadsign}>{arrival.tripHeadsign}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             {arrival.status && (
                                <span className={`inline-block h-2 w-2 rounded-full ${getStatusColor(arrival.status)}`} title={arrival.status}></span>
                              )}
                            {arrival.predictedArrivalTime ? (
                              <span className="font-semibold text-accent">{formatObaTime(arrival.predictedArrivalTime)}</span>
                            ) : (
                              <span className="text-muted-foreground">{formatObaTime(arrival.scheduledArrivalTime)}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground">No upcoming arrivals or data unavailable.</p>
                )}
              </CardContent>
            )}
          </Card>
        </Popup>
      )}

      {mapboxDirectionsRoute && mapboxDirectionsRoute.geometry && (
        <Source id="mapbox-directions-route-source" type="geojson" data={mapboxDirectionsRoute.geometry}>
          <Layer {...mapboxDirectionsRouteLayer} />
        </Source>
      )}

      {obaRouteGeometry && obaRouteGeometry.geometry && (
         <Source id="oba-route-path-source" type="geojson" data={obaRouteGeometry}>
          <Layer {...obaRoutePathLayer} />
        </Source>
      )}
      
      <Layer {...buildingsLayer} />
    </Map>
  );
}
