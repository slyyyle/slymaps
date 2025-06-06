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
import { PoiCategoryFilter, type PoiFilterSettings } from '@/components/poi-category-filter';

// This is the dedicated view for the Mapbox Standard style.
// It assumes that all features of the Standard style, including the 'buildings' featureset, are available.

interface MapboxPOI {
  id: string;
  name: string;
  category: string;
  subclass?: string;
  longitude: number;
  latitude: number;
  properties: any;
}

const getIconForPoiType = (poi: PointOfInterest): IconName => {
  if (poi.isObaStop) return 'Bus';
  switch (poi.type.toLowerCase()) {
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
  return "bg-yellow-500"; 
};

const isStandardStyle = (styleUrl: string): boolean => {
  return styleUrl.includes('mapbox://styles/mapbox/standard');
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
  obaRouteGeometry,
  onFlyTo,
  obaStopArrivals,
  isLoadingArrivals,
  onSelectRouteForPath,
  obaVehicleLocations,
  isAutoLighting = true,
  currentLightPreset = 'day',
}: MapViewProps) {
  const [internalViewState, setInternalViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [selectedVehicle, setSelectedVehicle] = useState<ObaVehicleLocation | null>(null);
  const [selectedMapboxPoi, setSelectedMapboxPoi] = useState<MapboxPOI | null>(null);
  const [interactionsAdded, setInteractionsAdded] = useState<boolean>(false);
  const [showPoiFilter, setShowPoiFilter] = useState<boolean>(false);
  const [poiFilters, setPoiFilters] = useState<PoiFilterSettings>({
    showLabels: true,
    showTransit: true,
    showPlaces: true,
    selectedCategories: new Set(),
    minZoom: 12
  });
  
  // Use ref for selected building to avoid React closure issues
  const selectedBuildingRef = useRef<any>(null);

  useEffect(() => {
    setInternalViewState(prev => ({ ...prev, ...externalViewState }));
  }, [externalViewState]);

  const handleMove = (evt: { viewState: ViewState }) => {
    setInternalViewState(evt.viewState);
    onViewStateChange(evt.viewState);
  };
  
  const handlePoiClick = (poi: PointOfInterest) => {
    onSelectPoi(poi);
    setSelectedVehicle(null);
    setSelectedMapboxPoi(null);
    clearSelectedBuilding();
  };

  const handleVehicleClick = (vehicle: ObaVehicleLocation) => {
    setSelectedVehicle(vehicle);
    onSelectPoi(null);
    setSelectedMapboxPoi(null);
    clearSelectedBuilding();
  };

  const clearSelectedBuilding = useCallback(() => {
    if (!selectedBuildingRef.current) return;

    if (mapRef.current) {
      try {
        const map = mapRef.current.getMap();
        map.setFeatureState(selectedBuildingRef.current, { select: false });
      } catch (error) {
        console.log('Could not clear building feature state:', error);
      }
    }
    selectedBuildingRef.current = null;
  }, [mapRef]);

  const handleDirectionsToPoi = useCallback((lat: number, lng: number) => {
    // This could integrate with your existing directions system
    console.log(`🗺️ Directions requested to: ${lat}, ${lng}`);
    // You could call onFlyTo or trigger a directions API call here
    onFlyTo({ latitude: lat, longitude: lng }, 16);
  }, [onFlyTo]);

  const handlePoiFilterChange = useCallback((filters: PoiFilterSettings) => {
    setPoiFilters(filters);
    
    // Apply the filters to the map
    if (mapRef.current && isStandardStyle(mapStyleUrl)) {
      const map = mapRef.current.getMap();
      try {
        map.setConfigProperty('basemap', 'showPointOfInterestLabels', filters.showLabels);
        map.setConfigProperty('basemap', 'showTransitLabels', filters.showTransit);
        map.setConfigProperty('basemap', 'showPlaceLabels', filters.showPlaces);
        console.log('🎯 POI filters applied:', filters);
      } catch (error) {
        console.warn('Failed to apply POI filters:', error);
      }
    }
  }, [mapRef, mapStyleUrl]);

  const updateLightingBasedOnTime = useCallback((map: any) => {
    if (!isStandardStyle(mapStyleUrl) || !isAutoLighting) return;

    const now = new Date();
    const hour = now.getHours();
    let lightPreset: 'day' | 'dusk' | 'dawn' | 'night';
    
    if (hour >= 6 && hour < 8) lightPreset = 'dawn';
    else if (hour >= 8 && hour < 18) lightPreset = 'day';
    else if (hour >= 18 && hour < 20) lightPreset = 'dusk';
    else lightPreset = 'night';

    if (lightPreset !== currentLightPreset) {
      try {
        map.setConfigProperty('basemap', 'lightPreset', lightPreset);
        console.log(`🌅 Lighting updated to: ${lightPreset}`);
      } catch (error) {
        console.warn('Failed to update lighting:', error);
      }
    }
  }, [mapStyleUrl, currentLightPreset, isAutoLighting]);

  const setupAdvancedLighting = useCallback((map: any) => {
    if (!isStandardStyle(mapStyleUrl)) return;

    try {
        map.setConfigProperty('basemap', 'show3dObjects', true);
      map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
      map.setConfigProperty('basemap', 'showTransitLabels', true);
      map.setConfigProperty('basemap', 'showPlaceLabels', true);
      map.setConfigProperty('basemap', 'showRoadLabels', true);
      
      map.setConfigProperty('basemap', 'colorBuildingHighlight', '#ffdd44');
      map.setConfigProperty('basemap', 'colorBuildingSelect', '#0080ff');
        console.log('🏢 Building color configuration applied');
      
      map.setMaxBounds(PACIFIC_NORTHWEST_BOUNDS);
      updateLightingBasedOnTime(map);

      try {
        map.setLight({
          anchor: 'map',
          color: '#ffffff',
          intensity: 0.4,
          position: [1.5, 90, 80]
        });
        console.log('🌟 Enhanced ambient lighting configured');
      } catch {
        console.log('Enhanced lighting not supported on this style');
      }

      console.log('🏙️ Advanced 3D lighting and effects enabled');
    } catch (error) {
      console.warn('Failed to setup advanced lighting:', error);
    }
  }, [mapStyleUrl, updateLightingBasedOnTime]);

  const setupMapboxInteractions = useCallback((map: any) => {
    if (!isStandardStyle(mapStyleUrl) || interactionsAdded) return;

    try {
      setupAdvancedLighting(map);

      // POI Interactions
      map.addInteraction('poi-click', {
        type: 'click',
        target: { featuresetId: 'poi', importId: 'basemap' },
        handler: ({ feature }: any) => {
          const mapboxPoi: MapboxPOI = {
            id: feature.id || `poi-${Date.now()}`,
            name: feature.properties.name || 'Unknown POI',
            category: feature.properties.category || 'place',
            subclass: feature.properties.subclass,
            longitude: feature.geometry.coordinates[0],
            latitude: feature.geometry.coordinates[1],
            properties: feature.properties
          };
          setSelectedMapboxPoi(mapboxPoi);
          setSelectedVehicle(null);
          onSelectPoi(null);
          clearSelectedBuilding();
          map.setFeatureState(feature, { select: true });
        }
      });
      map.addInteraction('poi-hover', {
        type: 'mouseenter',
        target: { featuresetId: 'poi', importId: 'basemap' },
        handler: ({ feature }: any) => map.setFeatureState(feature, { highlight: true })
      });
      map.addInteraction('poi-leave', {
        type: 'mouseleave', 
        target: { featuresetId: 'poi', importId: 'basemap' },
        handler: ({ feature }: any) => map.setFeatureState(feature, { highlight: false })
      });

      // Building Interactions
        map.addInteraction('building-click', {
          type: 'click',
          target: { featuresetId: 'buildings', importId: 'basemap' },
          handler: ({ feature }: any) => {
            clearSelectedBuilding();
            try {
              map.setFeatureState(feature, { select: true });
              selectedBuildingRef.current = feature;
              console.log('🏢 Building selected:', feature.properties || 'Building');
            } catch (error) {
              console.log('Building feature state not supported:', error);
            }
          }
        });
        map.addInteraction('building-hover', {
          type: 'mouseenter',
          target: { featuresetId: 'buildings', importId: 'basemap' },
        handler: ({ feature }: any) => map.setFeatureState(feature, { highlight: true })
        });
        map.addInteraction('building-leave', {
          type: 'mouseleave',
          target: { featuresetId: 'buildings', importId: 'basemap' },
        handler: ({ feature }: any) => map.setFeatureState(feature, { highlight: false })
        });
      console.log('🏢 Building interactions enabled');

      // Map click to clear all selections
      map.addInteraction('map-click', {
        type: 'click',
        handler: () => {
            clearSelectedBuilding();
          setSelectedMapboxPoi(null);
          setSelectedVehicle(null);
          onSelectPoi(null);
        }
      });

      setInteractionsAdded(true);
      console.log('✨ Mapbox v3 Advanced Features & Interactions API setup complete');
    } catch (error) {
      console.warn('Failed to setup Mapbox Interactions API:', error);
    }
  }, [mapStyleUrl, interactionsAdded, onSelectPoi, setupAdvancedLighting, clearSelectedBuilding]);

  useEffect(() => {
    setInteractionsAdded(false);
    setSelectedMapboxPoi(null);
    clearSelectedBuilding();
  }, [mapStyleUrl, clearSelectedBuilding]);

  useEffect(() => {
    if (!mapRef.current || !isStandardStyle(mapStyleUrl) || !isAutoLighting) return;
    const interval = setInterval(() => {
      updateLightingBasedOnTime(mapRef.current?.getMap());
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mapRef, mapStyleUrl, updateLightingBasedOnTime, isAutoLighting]);

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

  return (
    <Map
      ref={mapRef}
      {...internalViewState}
      mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
      onMove={handleMove}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyleUrl}
      maxBounds={PACIFIC_NORTHWEST_BOUNDS}
      onClick={() => {
        onSelectPoi(null);
        setSelectedVehicle(null);
        setSelectedMapboxPoi(null);
        clearSelectedBuilding();
      }}
      onLoad={(e) => {
        setupMapboxInteractions(e.target);
      }}
    >
      <GeolocateControl position="top-right" />
      <FullscreenControl position="top-right" />
      <NavigationControl position="top-right" />
      
      {/* POI Filter Button */}
      <div className="absolute top-4 left-4">
        <Button
          onClick={() => setShowPoiFilter(!showPoiFilter)}
          variant={showPoiFilter ? "default" : "outline"}
          size="sm"
          className="shadow-lg"
        >
          <Icons.MapStyle className="h-4 w-4 mr-2" />
          POI Filters
          {poiFilters.selectedCategories.size > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {poiFilters.selectedCategories.size}
            </Badge>
          )}
        </Button>
      </div>

      {/* POI Filter Panel */}
      {showPoiFilter && (
        <div className="absolute top-16 left-4">
          <PoiCategoryFilter
            onFilterChange={handlePoiFilterChange}
            onClose={() => setShowPoiFilter(false)}
          />
        </div>
      )}

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
          </Card>
        </Popup>
      )}

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
              <CardTitle className="text-base font-headline">Vehicle {selectedVehicle.id.split('_')[1] || selectedVehicle.id}</CardTitle>
              {selectedVehicle.tripHeadsign && (
                <CardDescription className="text-xs">
                  Route {selectedVehicle.routeId.split('_')[1] || selectedVehicle.routeId} to: {selectedVehicle.tripHeadsign}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-3 pt-0 text-sm space-y-1">
              {selectedVehicle.phase && <p>Status: <Badge variant="outline" className="text-xs">{selectedVehicle.phase.replace(/_/g, ' ')}</Badge></p>}
              <p>Last Update: {selectedVehicle.lastUpdateTime ? formatObaTime(selectedVehicle.lastUpdateTime) : 'N/A'}</p>
              {typeof selectedVehicle.heading === 'number' && <p>Heading: {selectedVehicle.heading}°</p>}
            </CardContent>
          </Card>
        </Popup>
      )}

      {selectedMapboxPoi && (
        <Popup
          longitude={selectedMapboxPoi.longitude}
          latitude={selectedMapboxPoi.latitude}
          onClose={() => setSelectedMapboxPoi(null)}
          closeOnClick={false}
          anchor="top"
          offset={25}
          className="font-body"
          maxWidth="500px"
        >
          <EnhancedPoiPopup
            poi={selectedMapboxPoi}
            onClose={() => setSelectedMapboxPoi(null)}
            onDirections={handleDirectionsToPoi}
            onFlyTo={onFlyTo}
            currentLightPreset={currentLightPreset}
          />
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
    </Map>
  );
}
