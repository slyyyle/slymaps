"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Map core, overlays, controls, and layers
import Map, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  GeolocateControl,
  Source,
  Layer
} from 'react-map-gl/mapbox';

// Map state types
import type { ViewState, LayerProps } from 'react-map-gl/mapbox';
import type { PointOfInterest } from '@/types/core';
import type { ObaVehicleLocation } from '@/types/oba';
import { MAPBOX_ACCESS_TOKEN, INITIAL_VIEW_STATE } from '@/lib/constants';
// Card components replaced with themed divs using CSS variables
import { Icons, IconName } from '@/components/icons';
import type { MapViewProps } from './map-orchestrator';

import { ThreeDToggle } from './3d-toggle';
import { TerrainControl } from './terrain-control';

// NEW SEGREGATED APPROACH
import { useUnifiedPOIHandler } from '@/hooks/map/use-unified-poi-handler';
import { useMapStyleConfig } from '@/hooks/map/use-map-style-config';
import { useEnhancedMapInteractions } from '@/hooks/map/use-enhanced-map-interactions';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { TemporaryDestinationMarker } from './temporary-destination-marker';
import { useThemeStore } from '../../stores/theme-store';

// ENHANCED ASYNC POPUP SYSTEM
import { useProgressivePopupLoader } from '@/hooks/popup/use-progressive-popup-loader';
import { 
  TransitSection, 
  HoursSection, 
  NearbySection, 
  PhotosSection, 
  ActionsSection 
} from '@/components/popup/popup-sections';
import { OSMInfoSection } from '@/components/popup/osm_info_section';

import 'mapbox-gl/dist/mapbox-gl.css';
// This is the dedicated view for the Mapbox Standard style.
// It handles both standard and standard-satellite v3 styles with their full feature sets.

const getIconForPoiType = (poi: PointOfInterest): IconName => {
  const type = poi.type?.toLowerCase() || 'default';
  
  // Map POI types to appropriate icons using available IconName types
  const iconMap: Record<string, IconName> = {
    restaurant: 'MapPin',
    food: 'MapPin', 
    food_and_drink: 'MapPin',
    shopping: 'MapPin',
    hotel: 'Building',
    gas: 'MapPin',
    hospital: 'MapPin',
    school: 'MapPin',
    education: 'MapPin',
    park: 'MapPin',
    arts_and_entertainment: 'MapPin',
    default: 'MapPin'
  };
  
  return iconMap[type] || iconMap.default;
};

// Utility function to format POI types nicely with smart capitalization
const formatPoiType = (type: string): string => {
  if (!type) return 'Point of Interest';
  
  // Handle a few specific edge cases that don't follow the pattern
  const specialCases: Record<string, string> = {
    'poi': 'Point of Interest',
    'atm': 'ATM',
    'search_result': 'Search Result',
    'oba_stop': 'Transit Stop'
  };
  
  const lowerType = type.toLowerCase();
  if (specialCases[lowerType]) {
    return specialCases[lowerType];
  }
  
  // Filler words that should not be capitalized
  const fillerWords = new Set(['of', 'the', 'in', 'on', 'at', 'by', 'for', 'with', 'to']);
  
  // Smart formatting: replace underscores, capitalize words, handle "and" → "&"
  return type
    .split(/[_\s]+/) // Split on underscores and spaces
    .map((word: string, index: number) => {
      const cleanWord = word.toLowerCase();
      
      // Replace "and" with "&"
      if (cleanWord === 'and') return '&';
      
      // Don't capitalize filler words unless they're the first word
      if (index > 0 && fillerWords.has(cleanWord)) {
        return cleanWord;
      }
      
      // Capitalize first letter of all other words
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    })
    .join(' ');
};

// Utility functions for pretty transit property formatting
const formatTransitMode = (mode: string): string => {
  const modeMap: Record<string, string> = {
    'bus': '🚌 Bus',
    'tram': '🚋 Light Rail',
    'light_rail': '🚋 Light Rail',
    'subway': '🚇 Subway',
    'metro': '🚇 Metro',
    'rail': '🚆 Train',
    'train': '🚆 Train',
    'ferry': '⛴️ Ferry',
    'cable_car': '🚠 Cable Car',
    'monorail': '🚝 Monorail',
    'trolleybus': '🚎 Trolleybus',
    'funicular': '🚞 Funicular',
  };
  
  return modeMap[mode.toLowerCase()] || `🚌 ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
};

const formatStopType = (stopType: string): string => {
  const stopTypeMap: Record<string, string> = {
    'stop': '🛑 Stop',
    'station': '🏢 Station',
    'platform': '🚏 Platform',
    'entrance': '🚪 Entrance',
    'exit': '🚪 Exit',
    'boarding_area': '📍 Boarding Area',
  };
  
  return stopTypeMap[stopType.toLowerCase()] || `📍 ${stopType.charAt(0).toUpperCase() + stopType.slice(1)}`;
};

const formatTransitNetwork = (network: string): string => {
  const networkMap: Record<string, string> = {
    'rail-light': '🚋 Light Rail Network',
    'rail': '🚆 Rail Network', 
    'bus': '🚌 Bus Network',
    'subway': '🚇 Subway Network',
    'metro': '🚇 Metro Network',
    'ferry': '⛴️ Ferry Network',
    'cable-car': '🚠 Cable Car Network',
    'monorail': '🚝 Monorail Network',
  };
  
  return networkMap[network.toLowerCase()] || `🚌 ${network.charAt(0).toUpperCase() + network.slice(1)} Network`;
};

const getTransitIcon = (maki?: string): string => {
  const iconMap: Record<string, string> = {
    'rail-light': '🚋',
    'rail': '🚆',
    'bus': '🚌',
    'subway': '🚇',
    'metro': '🚇',
    'ferry': '⛴️',
    'airport': '✈️',
    'cable-car': '🚠',
    'monorail': '🚝',
  };
  
  return iconMap[maki?.toLowerCase() || ''] || '🚌';
};

// Helper function to determine if category info is redundant with the type
const isRedundantCategory = (category: string, poiType: string): boolean => {
  // Format both using the same logic to compare properly
  const formattedCategory = formatPoiType(category);
  const formattedType = formatPoiType(poiType);
  
  // If the formatted category and type are the same, it's redundant
  if (formattedCategory.toLowerCase() === formattedType.toLowerCase()) return true;
  
  // Check if they're substantially similar (ignoring minor differences)
  const categoryWords = formattedCategory.toLowerCase().split(/\s+/);
  const typeWords = formattedType.toLowerCase().split(/\s+/);
  
  // If categories share most key words, consider redundant
  const sharedWords = categoryWords.filter(word => typeWords.includes(word));
  if (sharedWords.length >= Math.min(categoryWords.length, typeWords.length) * 0.7) {
    return true;
  }
  
  // Common redundant patterns
  const redundantPairs: Record<string, string[]> = {
    'park_like': ['park'],
    'food_and_drink': ['restaurant', 'cafe', 'bar', 'food & drink'],
    'food_and_drink_stores': ['food & drink', 'grocery store'],
    'poi': ['point of interest'],
    'transit': ['bus stop', 'train station', 'transit stop'],
  };
  
  // Check if this category-type combination is redundant
  for (const [cat, types] of Object.entries(redundantPairs)) {
    if (category.toLowerCase().includes(cat) && types.some(type => formattedType.toLowerCase().includes(type))) {
      return true;
    }
  }
  
  return false;
};

const PACIFIC_NORTHWEST_BOUNDS: [[number, number], [number, number]] = [
  [-170, 32.0],
  [-104, 60.0]
];

// Access token is passed via Map component props (modern approach)

export function StandardMapView({
  mapRef,
  viewState: externalViewState,
  onViewStateChange,
  mapStyleUrl,
  mapboxDirectionsRoute,
  routeStartCoords,
  routeEndCoords,
  showTurnMarkers,
  obaRouteGeometry,
  onSetDestination: _onSetDestination,
  obaStopArrivals: _obaStopArrivals,
  isLoadingArrivals: _isLoadingArrivals,
  onSelectRouteForPath: _onSelectRouteForPath,
  obaVehicleLocations,
}: MapViewProps) {
  const { flyTo } = useMapViewport();
  const [internalViewState, setInternalViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [selectedVehicle, setSelectedVehicle] = useState<ObaVehicleLocation | null>(null);
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(false);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.2);
  // Track when the Map has loaded to initialize native POI interactions
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // 🎨 Popup theme state - now from global store
  const { popupTheme } = useThemeStore();
  // Remove local state - we'll get this from segregated stores
  
  const currentVehicleLocations = React.useMemo(() => obaVehicleLocations ?? [], [obaVehicleLocations]);

  const moveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize POI handler once map has loaded to ensure mapRef.current is available
  const poiHandler = useUnifiedPOIHandler({
    map: mapLoaded ? mapRef.current : null,
    enableNativeInteractions: true
  });

  // Modern 2025 interaction system with visual feedback
  const enhancedInteractions = useEnhancedMapInteractions(mapRef.current);
  
  // 🔧 CORE FIX: Get data directly, no wrapper callbacks
  const storedPOIs = poiHandler.getStoredPOIs();
  const searchResults = poiHandler.getSearchResults();
  const createdPOIs = poiHandler.getCreatedPOIs();
  const activeSelection = poiHandler.getActiveSelection();
  
  // 🔧 CORE FIX: Extract handlers outside useMemo - they're stable now
  const { handleSearchResultClick, handleStoredPOIClick, handleCreatedPOIClick } = poiHandler;

  // 🔧 CORE FIX: Proper memoization with correct dependencies
  const searchMarkers = React.useMemo(() => {
    console.log('🔍 Rendering search markers:', searchResults.length);
    return searchResults.map(poi => (
      <Marker
        key={`search-${poi.id}`}
        longitude={poi.longitude}
        latitude={poi.latitude}
        onClick={(e) => { 
          e.originalEvent.stopPropagation(); 
          e.originalEvent.preventDefault();
          console.log(`🔍 Search result clicked: ${poi.name}`);
          handleSearchResultClick(poi);
          flyTo({ latitude: poi.latitude, longitude: poi.longitude }, { zoom: 16 });
        }}
      >
        {/* Blue pin for search results */}
        <div className="relative cursor-pointer transition-transform hover:scale-110">
          <div className="absolute -inset-3 bg-blue-500/20 rounded-full animate-pulse" />
          <div className="absolute -inset-1 bg-blue-500/30 rounded-full animate-ping" />
          <div className="relative bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white">
            {React.createElement(Icons[getIconForPoiType(poi)], { className: "w-5 h-5" })}
          </div>
        </div>
      </Marker>
    ));
  }, [searchResults, handleSearchResultClick, flyTo]);

  const storedMarkers = React.useMemo(() => {
    console.log('💾 Rendering stored markers:', storedPOIs.length);
    return storedPOIs.map(poi => (
      <Marker
        key={`stored-${poi.id}`}
        longitude={poi.longitude}
        latitude={poi.latitude}
        onClick={(e) => { 
          e.originalEvent.stopPropagation(); 
          e.originalEvent.preventDefault();
          console.log(`📍 Stored POI clicked: ${poi.name}`);
          handleStoredPOIClick(poi);
          flyTo({ latitude: poi.latitude, longitude: poi.longitude }, { zoom: 16 });
        }}
      >
        {/* Standard marker for stored POIs */}
        <div className="text-2xl cursor-pointer transition-transform hover:scale-110">
          {React.createElement(Icons[getIconForPoiType(poi)])}
        </div>
      </Marker>
    ));
  }, [storedPOIs, handleStoredPOIClick, flyTo]);

  const createdMarkers = React.useMemo(() => {
    console.log('✨ Rendering created markers:', createdPOIs.length);
    return createdPOIs.map(poi => (
      <Marker
        key={`created-${poi.id}`}
        longitude={poi.longitude}
        latitude={poi.latitude}
        onClick={(e) => { 
          e.originalEvent.stopPropagation(); 
          e.originalEvent.preventDefault();
          console.log(`🎨 Created POI clicked: ${poi.name}`);
          handleCreatedPOIClick(poi);
          flyTo({ latitude: poi.latitude, longitude: poi.longitude }, { zoom: 16 });
        }}
      >
        {/* Custom marker for created POIs */}
        <div className="text-2xl cursor-pointer transition-transform hover:scale-110">
          {React.createElement(Icons[getIconForPoiType(poi)])}
        </div>
      </Marker>
    ));
  }, [createdPOIs, handleCreatedPOIClick, flyTo]);

  // 🔧 CORE FIX: Combine markers without recreating handlers
  const segregatedMarkers = React.useMemo(() => {
    const total = searchMarkers.length + storedMarkers.length + createdMarkers.length;
    console.log(`🎯 Combining markers: ${searchMarkers.length} search + ${storedMarkers.length} stored + ${createdMarkers.length} created = ${total} total`);
    
    return [...searchMarkers, ...storedMarkers, ...createdMarkers];
  }, [searchMarkers, storedMarkers, createdMarkers]);
  
  // Combined POIs for rendering (replaces currentPois)
  const currentPois = React.useMemo(() => [
    ...storedPOIs,
    ...searchResults,
    ...createdPOIs
  ], [storedPOIs, searchResults, createdPOIs]);

  const {
    toggle3D,
    toggleTerrain,
    setTerrainExaggeration: setMapTerrainExaggeration,
    initializeMapConfig
  } = useMapStyleConfig({
    mapRef,
    mapStyleUrl,
  });

  // --- Direct setConfigProperty handlers ---
  const apply3D = useCallback((enabled: boolean) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    map.setConfigProperty('basemap', 'show3dObjects', enabled);
    setIs3DEnabled(enabled);
  }, [mapRef]);

  const applyTerrain = useCallback((enabled: boolean, exaggeration: number) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (enabled) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration });
    } else {
      map.setTerrain(null);
      if (map.getSource('mapbox-dem')) map.removeSource('mapbox-dem');
    }
    setIsTerrainEnabled(enabled);
  }, [mapRef]);

  const applyTerrainExaggeration = useCallback((exaggeration: number) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (map.getTerrain()) {
      map.setTerrain({ source: 'mapbox-dem', exaggeration });
    }
    setTerrainExaggeration(exaggeration);
  }, [mapRef]);

  // --- Re-apply all settings on style reload ---
  const reapplyAllSettings = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    setTimeout(() => {
      console.log('[Mapbox] Setting lightPreset to dusk (delayed workaround)');
      map.setConfigProperty('basemap', 'lightPreset', 'dusk');
      map.setConfigProperty('basemap', 'show3dObjects', is3DEnabled);
      if (isTerrainEnabled) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: terrainExaggeration });
      } else {
        map.setTerrain(null);
        if (map.getSource('mapbox-dem')) map.removeSource('mapbox-dem');
      }
    }, 100);
  }, [mapRef, is3DEnabled, isTerrainEnabled, terrainExaggeration]);

  // Attach settings on Map load
  const handleMapLoad = useCallback((event: any) => {
    console.log('[Mapbox] handleMapLoad fired, map instance available:', event.target);
    // Mark map as loaded so native POI interactions can initialize immediately
    setMapLoaded(true);
    const map = event.target;
    // Immediately apply settings
    reapplyAllSettings();
    // Re-apply on style reloads
    map.on('style.load', reapplyAllSettings);
  }, [reapplyAllSettings]);

  useEffect(() => {
    setInternalViewState(prev => ({ ...prev, ...externalViewState }));
  }, [externalViewState]);

  // 🔧 CORE FIX: Simple one-time log, no effects that trigger re-renders
  console.log('🗺️ MapView using segregated POI architecture');

  const handleMove = useCallback((evt: any) => {
    // Always update internal view state
    setInternalViewState(evt.viewState);
    // Only propagate to external state on user-initiated events
    if (!evt.originalEvent) {
      return;
    }
    if (moveDebounceRef.current) {
      clearTimeout(moveDebounceRef.current);
    }
    moveDebounceRef.current = setTimeout(() => {
      onViewStateChange(evt.viewState);
    }, 100);
  }, [onViewStateChange]);

  const handleVehicleClick = useCallback((vehicle: ObaVehicleLocation) => {
    setSelectedVehicle(vehicle);
    // Clear any active POI selection when vehicle is selected
    poiHandler.clearSelection();
  }, [poiHandler]);

  const handleToggle3D = useCallback((enabled: boolean) => {
    apply3D(enabled);
  }, [apply3D]);

  const handleToggleTerrain = useCallback((enabled: boolean) => {
    applyTerrain(enabled, terrainExaggeration);
  }, [applyTerrain, terrainExaggeration]);

  const handleTerrainExaggerationChange = useCallback((exaggeration: number) => {
    applyTerrainExaggeration(exaggeration);
  }, [applyTerrainExaggeration]);

  // Removed handleCustomMapClick - now using modern addInteraction API exclusively

  const directionsRouteLine = React.useMemo(() => {
    if (!mapboxDirectionsRoute?.geometry) return null;
    return {
    type: 'Feature' as const,
    properties: {},
      geometry: mapboxDirectionsRoute.geometry
    };
  }, [mapboxDirectionsRoute]);

  const obaRouteLine = React.useMemo(() => {
    if (!obaRouteGeometry) return null;
    // obaRouteGeometry is already a complete GeoJSON Feature
    return obaRouteGeometry;
  }, [obaRouteGeometry]);
  
  const directionsLayer = React.useMemo<LayerProps>(() => ({
    id: 'directions-route',
    type: 'line',
    slot: 'overlay',  // draw on top to avoid basemap shading
    paint: { 
      'line-color': '#39FF14',  // neon lime green
      'line-width': 5, 
      'line-opacity': 1,
      'line-emissive-strength': 1  // full emissive glow to override shading
    }
  }), []);

  const obaRouteLayer = React.useMemo(() => ({
    id: 'oba-route-line',
    type: 'line',
    slot: 'middle',
    paint: { 
      'line-color': '#d95f02', 
      'line-width': 6, 
      'line-opacity': 0.8,
      'line-emissive-strength': 0.9  // Modern v3 Standard compatibility for 3D lighting
    }
  } as const), []);

  const vehicleMarkers = React.useMemo(() => {
    return currentVehicleLocations.map(vehicle => (
      <Marker
        key={vehicle.id}
        longitude={vehicle.longitude}
        latitude={vehicle.latitude}
        onClick={(e) => { e.originalEvent.stopPropagation(); handleVehicleClick(vehicle); }}
      >
        <div className="transform transition-transform hover:scale-125">
          <Icons.Bus className="text-2xl" style={{ transform: `rotate(${vehicle.heading ?? 0}deg)` }} />
        </div>
      </Marker>
    ));
  }, [currentVehicleLocations, handleVehicleClick]);
  
  const startMarker = React.useMemo(() => {
    if (!routeStartCoords) return null;
    return (
      <Marker longitude={routeStartCoords.longitude} latitude={routeStartCoords.latitude} anchor="bottom">
        <Icons.MapPin className="w-8 h-8 text-green-600 drop-shadow-lg" />
      </Marker>
    );
  }, [routeStartCoords]);

  const endMarker = React.useMemo(() => {
    if (!routeEndCoords) return null;
    return (
      <Marker longitude={routeEndCoords.longitude} latitude={routeEndCoords.latitude} anchor="bottom">
        <Icons.MapPin className="w-8 h-8 text-red-600 drop-shadow-lg" />
      </Marker>
    );
  }, [routeEndCoords]);

  // Small turn/maneuver markers
  const turnMarkers = React.useMemo(() => {
    if (!showTurnMarkers || !mapboxDirectionsRoute) return null;
    return mapboxDirectionsRoute.legs.flatMap((leg, legIndex) =>
      leg.steps.flatMap((step, stepIndex) => {
        // Skip first and last steps per leg (origin/destination)
        if (stepIndex === 0 || stepIndex === leg.steps.length - 1) {
          return [];
        }
        return [
          <Marker
            key={`turn-${legIndex}-${stepIndex}`}
            longitude={step.maneuver.location[0]}
            latitude={step.maneuver.location[1]}
            anchor="center"
          >
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow" />
          </Marker>
        ];
      })
    );
  }, [showTurnMarkers, mapboxDirectionsRoute]);

  // Enhanced async popup system
  // Convert PointOfInterest to POI format for popup loader
  const popupPOI = activeSelection?.poi ? {
    id: activeSelection.poi.id,
    name: activeSelection.poi.name,
    latitude: activeSelection.poi.latitude,
    longitude: activeSelection.poi.longitude,
    type: activeSelection.poi.type,
    description: activeSelection.poi.description,
    source: (activeSelection.poi.isObaStop ? 'oba' : 
             activeSelection.poi.isSearchResult ? 'search' : 
             activeSelection.poi.isNativePoi ? 'mapbox' : 'stored') as 'mapbox' | 'search' | 'stored' | 'created' | 'osm',
    properties: activeSelection.poi.properties
  } : null;
  
  const popupLoader = useProgressivePopupLoader(popupPOI);

  // Debug POI selection changes with more detail
  useEffect(() => {
    console.log('🎯 StandardMapView activeSelection changed:', activeSelection);
    console.log('🎯 Current POI counts:', {
      stored: storedPOIs.length,
      search: searchResults.length,
      created: createdPOIs.length,
      total: storedPOIs.length + searchResults.length + createdPOIs.length
    });
    
    if (activeSelection) {
      console.log('✅ Enhanced async popup loading for POI:', {
        id: activeSelection.poi.id,
        name: activeSelection.poi.name,
        type: activeSelection.type,
        isNativePoi: activeSelection.poi.isNativePoi || false,
        coordinates: [activeSelection.poi.longitude, activeSelection.poi.latitude]
      });
      
      // Start the progressive loading
      console.log('🚀 Starting progressive popup loading...');
      popupLoader.startProgressiveLoad();
    } else {
      console.log('❌ No activeSelection - popup will not render');
    }
  }, [activeSelection, storedPOIs.length, searchResults.length, createdPOIs.length, popupLoader]);

  return (
    <>
    <Map
        {...internalViewState}
      ref={mapRef}
        onMove={handleMove}
        onLoad={handleMapLoad}
      mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
      mapStyle={mapStyleUrl}
      attributionControl={false}
        style={{ 
          width: '100%', 
          height: '100%',
          cursor: enhancedInteractions.mapCursorStyle 
        }}
        onContextMenu={enhancedInteractions.handleMapRightClick}
        projection={{name: 'globe'}}
      maxBounds={PACIFIC_NORTHWEST_BOUNDS}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        {/* Inline Map Controls: 3D & Terrain */}
        <div className="absolute bottom-4 right-4 z-50 flex flex-col items-start gap-2 quick-settings-panel rounded-lg shadow-lg p-2">
          <ThreeDToggle
            is3DEnabled={is3DEnabled}
            onToggle3D={handleToggle3D}
            isStandardStyle={true}
          />
          <TerrainControl
            isTerrainEnabled={isTerrainEnabled}
            terrainExaggeration={terrainExaggeration}
            onToggleTerrain={handleToggleTerrain}
            onExaggerationChange={handleTerrainExaggerationChange}
            isStandardStyle={true}
          />
        </div>
        {/* Native GeolocateControl provides better location handling */}
        <GeolocateControl
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={true}
          showUserHeading={true}
          showAccuracyCircle={false}
          position="top-right"
      />

        {directionsRouteLine && (
          <Source id="directions-source" type="geojson" data={directionsRouteLine}>
            <Layer {...directionsLayer} />
        </Source>
      )}

        {obaRouteLine && (
          <Source id="oba-route-source" type="geojson" data={obaRouteLine}>
            <Layer {...obaRouteLayer} />
        </Source>
      )}

              {segregatedMarkers}
      {vehicleMarkers}
        {startMarker}
        {endMarker}
        {turnMarkers}
        
        {/* Modern 2025: Temporary destination marker with visual feedback */}
        {enhancedInteractions.destinationSetting.temporaryDestination && (
          <TemporaryDestinationMarker
            coordinates={enhancedInteractions.destinationSetting.temporaryDestination}
            onConfirm={enhancedInteractions.destinationSetting.confirmDestination}
            onCancel={enhancedInteractions.destinationSetting.cancelDestinationSetting}
          />
        )}

        {/* Enhanced Async Popup System - Progressive Loading */}
        {activeSelection && (
          <Popup
            longitude={activeSelection.poi.longitude}
            latitude={activeSelection.poi.latitude}
            onClose={() => {
              console.log('🔴 Enhanced popup closed, clearing POI selection');
              poiHandler.clearSelection();
            }}
            closeOnClick={false}
            closeButton={true}
            anchor="bottom"
            offset={[0, -10]}
            maxWidth="380px"
            className={popupTheme}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <div 
                className="min-w-[320px]" 
                style={{
                  backgroundColor: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                  border: 'none',
                  borderRadius: '0.5rem'
                }}
              >
                {/* Header Section */}
                <div className="pb-2 pt-3 px-4">
                  <div 
                    className="flex items-start gap-2 text-lg leading-tight font-semibold"
                    style={{ color: 'hsl(var(--card-foreground))' }}
                  >
                    {(() => {
                      const props = activeSelection.poi.properties as Record<string, any> | undefined;
                      if (props?.group === 'transit' && props?.maki) {
                        return <span className="text-base flex-shrink-0 mt-0.5">{getTransitIcon(props.maki)}</span>;
                      }
                      return null;
                    })()}
                    <span className="break-words min-w-0 flex-1">{activeSelection.poi.name}</span>
                  </div>
                  <div 
                    className="text-sm mt-0.5" 
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    {formatPoiType(activeSelection.poi.type)}
                  </div>
                </div>
                
                {/* Content Section */}
                <div className="space-y-1 px-4 pb-4">
                  {/* Basic POI Information - Immediate */}
                  {(() => {
                    const props = activeSelection.poi.properties as Record<string, any> | undefined;
                    const isTransit = props?.group === 'transit';
                    const isNativePoi = activeSelection.poi.isNativePoi;
                    const hasOSMEnrichment = props?.osm_enriched;
                    
                    return (
                      <>
                        {/* OSM Info Section - Unified component handling description and hours */}
                        <OSMInfoSection
                          isNativePoi={Boolean(isNativePoi)}
                          hasOSMEnrichment={Boolean(hasOSMEnrichment)}
                          osmLookupAttempted={Boolean(props?.osm_lookup_attempted)}
                          isLoading={Boolean(isNativePoi && !hasOSMEnrichment && !props?.osm_lookup_attempted)}
                          address={props?.osm_address}
                          phone={props?.osm_phone}
                          website={props?.osm_website}
                          operator={props?.osm_operator}
                          brand={props?.osm_brand}
                          cuisine={props?.osm_cuisine}
                          opening_hours={props?.osm_opening_hours}
                        />

                        {/* Legacy transit information (immediate) */}
                        {isTransit && (
                          <div 
                            className="rounded-md p-2 space-y-1"
                            style={{
                              backgroundColor: 'hsl(var(--muted))',
                              border: '1px solid hsl(var(--border))'
                            }}
                          >
                            <h4 
                              className="text-sm font-medium"
                              style={{ color: 'hsl(var(--card-foreground))' }}
                            >
                              Static Transit Info
                            </h4>
                            {props?.transit_mode && (
                              <p 
                                className="text-xs"
                                style={{ color: 'hsl(var(--muted-foreground))' }}
                              >
                                <span className="font-medium">Mode:</span> {formatTransitMode(String(props.transit_mode))}
                              </p>
                            )}
                            {props?.transit_stop_type && (
                              <p 
                                className="text-xs"
                                style={{ color: 'hsl(var(--muted-foreground))' }}
                              >
                                <span className="font-medium">Stop Type:</span> {formatStopType(String(props.transit_stop_type))}
                              </p>
                            )}
                            {props?.transit_network && (
                              <p 
                                className="text-xs"
                                style={{ color: 'hsl(var(--muted-foreground))' }}
                              >
                                <span className="font-medium">Network:</span> {formatTransitNetwork(String(props.transit_network))}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* POI description */}
                        {activeSelection.poi.description && (
                          <p 
                            className="text-sm"
                            style={{ color: 'hsl(var(--card-foreground))' }}
                          >
                            {activeSelection.poi.description}
                          </p>
                        )}
                        
                        {/* POI class/category information */}
                        {props?.class && props.class !== 'poi' && !isRedundantCategory(props.class, activeSelection.poi.type) && (
                  <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Category:</span> {formatPoiType(String(props.class))}
                          </p>
                        )}
                      </>
                    );
                  })()}

                  {/* Progressive Async Sections */}
                  <TransitSection 
                    section={popupLoader.transitSection} 
                    onRetry={() => popupLoader.retrySection('transit')}
                  />
                  
                  <NearbySection 
                    section={popupLoader.nearbySection} 
                    onRetry={() => popupLoader.retrySection('nearby')}
                  />
                  
                  <PhotosSection 
                    section={popupLoader.photosSection} 
                    onRetry={() => popupLoader.retrySection('photos')}
                  />

                  {/* Separator before Hours Section */}
                  {(() => {
                    const props = activeSelection.poi.properties as Record<string, any> | undefined;
                    const isNativePoi = activeSelection.poi.isNativePoi;
                    const hasOSMEnrichment = props?.osm_enriched;
                    const osmLookupAttempted = props?.osm_lookup_attempted;
                    
                    // Show separator only if we're going to show hours section
                    const willShowHours = popupLoader.hoursSection.status !== 'idle' || 
                                         (isNativePoi && (hasOSMEnrichment || osmLookupAttempted));
                                         
                    return willShowHours ? (
                      <div className="border-t border-gray-200 my-2"></div>
                    ) : null;
                  })()}

                  {/* Hours Section - moved to bottom */}
                  <HoursSection 
                    section={popupLoader.hoursSection} 
                    onRetry={() => popupLoader.retrySection('hours')}
                  />



                  {/* OSM Attribution - Bottom placement - Only show timestamp when data exists */}
                  {(() => {
                    const props = activeSelection.poi.properties as Record<string, any> | undefined;
                    const isNativePoi = activeSelection.poi.isNativePoi;
                    const hasOSMEnrichment = props?.osm_enriched;
                    const osmLookupAttempted = props?.osm_lookup_attempted;
                    const hasContactInfo = props?.osm_address || props?.osm_phone || props?.osm_website || 
                                          props?.osm_operator || props?.osm_brand || props?.osm_cuisine;
                    const hasOpeningHours = props?.osm_opening_hours;
                    
                    // Only show attribution when we have actual OSM data to display
                    if (isNativePoi && hasOSMEnrichment && (hasContactInfo || hasOpeningHours)) {
                      return (
                        <div className="text-xs text-muted-foreground border-t pt-2 flex items-center justify-between">
                          <span>🌍 OpenStreetMap Data</span>
                          {props.osm_enriched_at && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(props.osm_enriched_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      );
                    }
                    
                    // Hide the "No data available" message since OSMInfoSection now handles error states
                    return null;
                  })()}

                  {/* Action buttons */}
                  <ActionsSection 
                    poi={activeSelection.poi}
                    onDirections={(poi) => console.log('🧭 Directions requested for:', poi.name)}
                    onSave={(poi) => {
                      console.log('💾 Save requested for:', poi.name);
                      // The save action is now handled entirely in ActionsSection
                      // No need to create pins or handle different POI types
                    }}
                  />
                </div>
              </div>
            </div>
          </Popup>
        )}

        {/* React-Map-GL declarative popup for selected vehicle */}
        {selectedVehicle && (
          <Popup
            longitude={selectedVehicle.longitude}
            latitude={selectedVehicle.latitude}
            onClose={() => setSelectedVehicle(null)}
            closeOnClick={false}
            anchor="bottom"
            offset={25}
            className={popupTheme}
          >
            <div 
              style={{
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '1rem'
              }}
            >
              {/* Header */}
              <div className="mb-3">
                <div 
                  className="text-lg font-semibold"
                  style={{ color: 'hsl(var(--card-foreground))' }}
                >
                  Vehicle: {selectedVehicle.id}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  Real-time vehicle location
                </div>
              </div>
              
              {/* Content */}
              <div className="space-y-1">
                <p style={{ color: 'hsl(var(--card-foreground))' }}>
                  Last updated: {selectedVehicle.lastUpdateTime ? new Date(selectedVehicle.lastUpdateTime * 1000).toLocaleTimeString() : 'N/A'}
                </p>
                <p style={{ color: 'hsl(var(--card-foreground))' }}>
                  Heading: {selectedVehicle.heading}°
                </p>
              </div>
            </div>
          </Popup>
        )}

      </Map>
    </>
  );
}