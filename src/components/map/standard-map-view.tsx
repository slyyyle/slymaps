"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, GeolocateControl, Source, Layer, type ViewState } from 'react-map-gl';
import type { PointOfInterest, ObaVehicleLocation } from '@/types';
import { MAPBOX_ACCESS_TOKEN, INITIAL_VIEW_STATE } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Icons, IconName } from '@/components/icons';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import type { MapViewProps } from '../map-view';
import { EnhancedPoiPopup } from '@/components/enhanced-poi-popup';
import { QuickSettings } from './quick-settings';
import { formatObaTime, getStatusColor } from '@/lib/time-utils';

// Custom hooks
import { useMapboxAttribution } from '@/hooks/use-mapbox-attribution';
import { useMapInteractions } from '@/hooks/use-map-interactions';
import { useMapStyleConfig } from '@/hooks/use-map-style-config';

// This is the dedicated view for the Mapbox Standard style.
// It handles both standard and standard-satellite v3 styles with their full feature sets.

interface MapboxPOI {
  id: string;
  name: string;
  category: string;
  subclass?: string;
  longitude: number;
  latitude: number;
  properties: Record<string, string | number | boolean | null>;
}

const getIconForPoiType = (poi: PointOfInterest): IconName => {
  if (poi.isObaStop) return 'Bus';
  switch (poi.type.toLowerCase()) {
    case 'home': return 'Home';
    case 'work': return 'Work';
    default: return 'MapPin';
  }
};

const PACIFIC_NORTHWEST_BOUNDS: [[number, number], [number, number]] = [
  [-170, 32.0],
  [-104, 60.0]
];

export function StandardMapView({
  mapRef,
  viewState: externalViewState,
  onViewStateChange,
  pois,
  selectedPoi,
  onSelectPoi,
  mapStyleUrl,
  mapboxDirectionsRoute,
  routeStartCoords,
  routeEndCoords,
  obaRouteGeometry,
  onFlyTo,
  onSetDestination,
  obaStopArrivals,
  isLoadingArrivals,
  onSelectRouteForPath,
  obaVehicleLocations,
  isAutoLighting = true,
  currentLightPreset = 'day',
  onChangeLightPreset,
  onToggleAutoLighting,
}: MapViewProps) {
  const [internalViewState, setInternalViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [selectedVehicle, setSelectedVehicle] = useState<ObaVehicleLocation | null>(null);
  const [selectedMapboxPoi, setSelectedMapboxPoi] = useState<MapboxPOI | null>(null);
  const [is3DEnabled, setIs3DEnabled] = useState<boolean>(true);
  const [isFadedTheme, setIsFadedTheme] = useState<boolean>(true);
  const [brightness, setBrightness] = useState<number>(50);
  const [contrast, setContrast] = useState<number>(50);
  
  // Debounce timer for move events
  const moveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Custom hooks
  useMapboxAttribution(mapRef);
  
  const {
    handlePoiClick,
    handleMapClick,
    handleDirectionsToPoi,
    setupMapboxInteractions,
    isStandardStyle
  } = useMapInteractions({
    mapRef,
    onSelectPoi,
    onFlyTo,
    mapStyleUrl
  });

  const {
    initializeMapConfig,
    updateLightingBasedOnTime,
    toggle3D,
    toggleTheme,
    setLightPreset
  } = useMapStyleConfig({
    mapRef,
    mapStyleUrl,
    isAutoLighting,
    currentLightPreset,
    onChangeLightPreset
  });

  useEffect(() => {
    setInternalViewState(prev => ({ ...prev, ...externalViewState }));
  }, [externalViewState]);

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    // Update internal state immediately for smooth visual feedback
    setInternalViewState(evt.viewState);
    
    // Debounce the parent callback to reduce unnecessary re-renders
    if (moveDebounceRef.current) {
      clearTimeout(moveDebounceRef.current);
    }
    
    moveDebounceRef.current = setTimeout(() => {
      onViewStateChange(evt.viewState);
    }, 100);
  }, [onViewStateChange]);

  const handleVehicleClick = (vehicle: ObaVehicleLocation) => {
    setSelectedVehicle(vehicle);
    onSelectPoi(null);
    setSelectedMapboxPoi(null);
  };

  const handleToggle3D = useCallback((enabled: boolean) => {
    setIs3DEnabled(enabled);
    toggle3D(enabled);
  }, [toggle3D]);

  const handleToggleTheme = useCallback((useFaded: boolean) => {
    setIsFadedTheme(useFaded);
    toggleTheme(useFaded);
  }, [toggleTheme]);

  const handleBrightnessChange = useCallback((newBrightness: number) => {
    setBrightness(newBrightness);
    console.log(`🔆 Brightness changed to: ${newBrightness}`);
  }, []);

  const handleContrastChange = useCallback((newContrast: number) => {
    setContrast(newContrast);
    console.log(`⚡ Contrast changed to: ${newContrast}`);
  }, []);

  const handleResetFilters = useCallback(() => {
    setBrightness(50);
    setContrast(50);
    console.log('🔄 CSS filters reset to defaults (50%)');
  }, []);

  const handleLightPresetChange = useCallback((preset: 'day' | 'dusk' | 'dawn' | 'night') => {
    setLightPreset(preset);
    onChangeLightPreset?.(preset);
  }, [setLightPreset, onChangeLightPreset]);

  // Route layers data
  const mapboxDirectionsRouteData = mapboxDirectionsRoute?.geometry ? {
    type: 'Feature' as const,
    properties: {},
    geometry: mapboxDirectionsRoute.geometry,
  } : null;

  const obaRoutePathData = obaRouteGeometry?.geometry ? {
    type: 'Feature' as const,
    properties: {},
    geometry: obaRouteGeometry.geometry,
  } : null;

  const mapboxDirectionsRouteLayer: mapboxgl.AnyLayer = {
    id: 'mapbox-directions-route',
    type: 'line',
    source: 'mapbox-directions-route-source',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#00FF00', 'line-width': 6, 'line-opacity': 1.0, 'line-emissive-strength': 1.0 },
  };

  const obaRoutePathLayer: mapboxgl.AnyLayer = {
    id: 'oba-route-path',
    type: 'line',
    source: 'oba-route-path-source',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': 'hsl(207, 82%, 68%)', 'line-width': 5, 'line-opacity': 0.75, 'line-dasharray': [2, 2] },
  };

  return (
    <Map
      ref={mapRef}
      {...internalViewState}
      mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
      onMove={handleMove}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyleUrl}
      maxBounds={PACIFIC_NORTHWEST_BOUNDS}
      attributionControl={false}
      logoPosition="top-left"
      onClick={handleMapClick}
      onLoad={(e) => {
        const map = e.target;
        setupMapboxInteractions(map);
        initializeMapConfig(map);
        updateLightingBasedOnTime(map);
      }}
    >
      <GeolocateControl position="top-right" />
      <FullscreenControl position="top-right" />
      <NavigationControl position="top-right" />
      
      {/* Consolidated Map Controls */}
      <QuickSettings
        currentLightPreset={currentLightPreset}
        isAutoLighting={isAutoLighting}
        onChangeLightPreset={handleLightPresetChange}
        onToggleAutoLighting={onToggleAutoLighting || (() => {})}
        is3DEnabled={is3DEnabled}
        onToggle3D={handleToggle3D}
        isFadedTheme={isFadedTheme}
        onToggleTheme={handleToggleTheme}
        brightness={brightness}
        contrast={contrast}
        onBrightnessChange={handleBrightnessChange}
        onContrastChange={handleContrastChange}
        onReset={handleResetFilters}
        isStandardStyle={isStandardStyle}
      />

      {/* Route Sources and Layers */}
      {mapboxDirectionsRouteData && (
        <Source id="mapbox-directions-route-source" type="geojson" data={mapboxDirectionsRouteData}>
          <Layer {...mapboxDirectionsRouteLayer} />
        </Source>
      )}

      {obaRoutePathData && (
        <Source id="oba-route-path-source" type="geojson" data={obaRoutePathData}>
          <Layer {...obaRoutePathLayer} />
        </Source>
      )}

      {/* Route Start and End Markers */}
      {routeStartCoords && (
        <Marker
          longitude={routeStartCoords.longitude}
          latitude={routeStartCoords.latitude}
          anchor="bottom"
        >
          <div className="relative">
            <Icons.MapPin className="w-8 h-8 text-green-600 drop-shadow-lg" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              A
            </div>
          </div>
        </Marker>
      )}

      {routeEndCoords && (
        <Marker
          longitude={routeEndCoords.longitude}
          latitude={routeEndCoords.latitude}
          anchor="bottom"
        >
          <div className="relative">
            <Icons.MapPin className="w-8 h-8 text-red-600 drop-shadow-lg" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              B
            </div>
          </div>
        </Marker>
      )}

      {/* POI Markers */}
      {pois.map(poi => {
        const IconComponent = Icons[getIconForPoiType(poi)] || Icons.MapPin;
        return (
          <Marker
            key={`poi-${poi.id}`}
            longitude={poi.longitude}
            latitude={poi.latitude}
            onClick={() => handlePoiClick(poi)}
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

      {/* Vehicle Markers */}
      {obaVehicleLocations.map(vehicle => (
        <Marker
          key={`vehicle-${vehicle.id}`}
          longitude={vehicle.longitude}
          latitude={vehicle.latitude}
          onClick={() => handleVehicleClick(vehicle)}
          anchor="bottom"
        >
          <button className="transform hover:scale-110 transition-transform focus:outline-none">
             <Icons.Driving
                className={`w-6 h-6 ${selectedVehicle?.id === vehicle.id ? 'text-orange-500' : 'text-teal-600'} drop-shadow-md`}
                strokeWidth={selectedVehicle?.id === vehicle.id ? 2.5 : 1.5}
              />
          </button>
        </Marker>
      ))}

      {/* POI Popup */}
      {selectedPoi && (
        <Popup
          longitude={selectedPoi.longitude}
          latitude={selectedPoi.latitude}
          onClose={() => onSelectPoi(null)}
          closeOnClick={false}
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
                            <Button 
                              variant="link" 
                              size="sm"
                              className="p-0 h-auto font-semibold"
                              onClick={() => onSelectRouteForPath(arrival.routeId)}
                              title={`Show path for route ${arrival.routeShortName}`}
                            >
                               <Badge variant="secondary" className="font-semibold w-12 text-center truncate hover:bg-primary/20">
                                {arrival.routeShortName}
                              </Badge>
                            </Button>
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

            {selectedPoi.isObaStop && (
              <CardContent className="p-3 pt-0 border-t">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleDirectionsToPoi(selectedPoi.latitude, selectedPoi.longitude)}
                >
                  <Icons.Directions className="w-4 h-4 mr-1.5" />
                  Get Directions
                </Button>
              </CardContent>
            )}
          </Card>
        </Popup>
      )}

      {/* Vehicle Popup */}
      {selectedVehicle && (
        <Popup
          longitude={selectedVehicle.longitude}
          latitude={selectedVehicle.latitude}
          onClose={() => setSelectedVehicle(null)}
          closeOnClick={false}
          anchor="top"
          offset={25}
          className="font-body"
          maxWidth="280px"
        >
          <Card className="border-none shadow-none">
            <CardHeader className="p-3">
                             <CardTitle className="text-base font-headline flex items-center gap-2">
                 <Icons.Driving className="w-5 h-5 text-teal-600" />
                 Route {selectedVehicle.routeId}
               </CardTitle>
                <CardDescription className="text-xs">
                 Vehicle ID: {selectedVehicle.id}
                </CardDescription>
            </CardHeader>
            
            <CardContent className="p-3 pt-0">
                             <div className="space-y-1 text-sm">
                 <p><strong>Direction:</strong> {selectedVehicle.tripHeadsign}</p>
                 <p><strong>Last Update:</strong> {selectedVehicle.lastUpdateTime ? new Date(selectedVehicle.lastUpdateTime * 1000).toLocaleTimeString() : 'N/A'}</p>
               </div>
            </CardContent>
            
            <CardContent className="p-3 pt-0 border-t">
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full"
                onClick={() => handleDirectionsToPoi(selectedVehicle.latitude, selectedVehicle.longitude)}
              >
                <Icons.Directions className="w-4 h-4 mr-1.5" />
                Get Directions
              </Button>
            </CardContent>
          </Card>
        </Popup>
      )}

      {/* Mapbox POI Popup */}
      {selectedMapboxPoi && (
        <Popup
          longitude={selectedMapboxPoi.longitude}
          latitude={selectedMapboxPoi.latitude}
          onClose={() => setSelectedMapboxPoi(null)}
          closeOnClick={false}
          anchor="top"
          offset={25}
          className="font-body"
          maxWidth="280px"
        >
          <EnhancedPoiPopup
            poi={selectedMapboxPoi}
            onClose={() => setSelectedMapboxPoi(null)}
             onDirections={() => handleDirectionsToPoi(selectedMapboxPoi.latitude, selectedMapboxPoi.longitude)}
             onSetDestination={(coords) => onSetDestination?.(coords)}
            onFlyTo={onFlyTo}
            currentLightPreset={currentLightPreset}
          />
        </Popup>
      )}
    </Map>
  );
}
