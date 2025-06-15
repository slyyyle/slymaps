// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouteStore } from '@/stores/use-route-store';

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
import type { ObaVehicleLocation, ObaStopSearchResult } from '@/types/oba';
import { MAPBOX_ACCESS_TOKEN, INITIAL_VIEW_STATE } from '@/lib/constants';
// Card components replaced with themed divs using CSS variables
import { Icons, IconName } from '@/components/icons';
import type { MapViewProps } from './map-orchestrator';

import { ThreeDToggle } from './3d-toggle';
import { TerrainControl } from './terrain-control';
// Removed POI clustering; will render POI markers manually

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
import DrawControls from './DrawControls';
import { useDrawStore } from '@/stores/use-draw-store';
import { useDrawStyleStore } from '@/stores/use-draw-style-store';

import { formatAddressLines } from '@/utils/address-utils';
import type { AddressInput } from '@/utils/address-utils';

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

// Insert clustering helper functions for stops and turns
interface SimplePoint {
  id: string;
  latitude: number;
  longitude: number;
  type: 'stop' | 'turn';
}

interface SimpleCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  points: SimplePoint[];
}

function getClusterRadius(zoom: number): number {
  if (zoom < 10) return 5000;
  if (zoom < 13) return 1000;
  if (zoom < 16) return 200;
  return 0;
}

function getDistance(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371000;
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinΔφ = Math.sin(Δφ / 2);
  const sinΔλ = Math.sin(Δλ / 2);
  const c =
    2 *
    Math.atan2(
      Math.sqrt(sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ),
      Math.sqrt(1 - (sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ))
    );
  return R * c;
}

function clusterSimplePoints(points: SimplePoint[], zoom: number): SimpleCluster[] {
  const radius = getClusterRadius(zoom);
  const clusters: SimpleCluster[] = [];
  const visited = new Set<string>();

  for (const point of points) {
    if (visited.has(point.id)) continue;
    const group: SimplePoint[] = [point];
    visited.add(point.id);

    for (const other of points) {
      if (visited.has(other.id)) continue;
      const distance = getDistance(point, other);
      if (distance <= radius) {
        group.push(other);
        visited.add(other.id);
      }
    }

    const lat = group.reduce((sum, p) => sum + p.latitude, 0) / group.length;
    const lng = group.reduce((sum, p) => sum + p.longitude, 0) / group.length;
    clusters.push({ id: `cluster-${group.map(p => p.id).join('-')}`, latitude: lat, longitude: lng, count: group.length, points: group });
  }

  return clusters;
}

export function StandardMapView({
  mapRef,
  viewState: externalViewState,
  onViewStateChange,
  mapStyleUrl,
  isSidebarOpen,
  mapboxDirectionsRoute,
  routeStartCoords,
  routeEndCoords,
  showTurnMarkers,
  obaRouteSegments = [],
  obaRouteStops = [],
  obaVehicleLocations,
}: MapViewProps) {
  // Subscribe to active route and selected segment for marker filtering
  const activeRoute = useRouteStore(state => {
    const id = state.activeRouteId;
    return id ? state.routes[id] : null;
  });
  const selectedSegment = activeRoute?.selectedSegmentIndex ?? 0;
  // Build allowed stop IDs set for the selected segment
  const allowedStopIds = useMemo(() => {
    const stops = activeRoute?.stopsBySegment?.[selectedSegment] || [];
    return new Set(stops.map(s => s.id));
  }, [activeRoute?.stopsBySegment, selectedSegment]);

  // Stepping-stone origin stop for route jumping
  const originStopId = useRouteStore(state => state.originStopId);
  const setOriginStop = useRouteStore(state => state.setOriginStop);
  // Once new route segments are loaded, clear originStop to show all markers
  useEffect(() => {
    if (originStopId && obaRouteSegments.length > 0) {
      setOriginStop(null);
    }
  }, [originStopId, obaRouteSegments, setOriginStop]);

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
  
  const currentVehicleLocations = React.useMemo(() => {
    const vehicles = obaVehicleLocations ?? [];
    // If no schedule available, show all vehicles
    if (!activeRoute?.schedule?.length) {
      return vehicles;
    }
    // Filter vehicles to those on the selected branch by matching tripId
    const branchId = String(selectedSegment);
    const validTripIds = new Set(
      activeRoute.schedule
        .filter(entry => entry.direction === branchId)
        .map(entry => entry.tripId)
    );
    return vehicles.filter(vehicle => vehicle.tripId && validTripIds.has(vehicle.tripId));
  }, [obaVehicleLocations, activeRoute?.schedule, selectedSegment]);

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

  // Combined POIs for rendering (replaces currentPois)
  const currentPois = React.useMemo(() => [
    ...searchResults,
    ...storedPOIs,
    ...createdPOIs
  ], [searchResults, storedPOIs, createdPOIs]);

  // Filter markers: if a route is active, only show POIs for that segment
  const displayPois = useMemo(() => {
    if (!activeRoute?.segments) return currentPois;
    return currentPois.filter(poi => allowedStopIds.has(poi.id));
  }, [currentPois, activeRoute, allowedStopIds]);

  // Precompute ID sets for click handling
  const searchIds = useMemo(() => new Set(searchResults.map(p => p.id)), [searchResults]);
  const storedIds = useMemo(() => new Set(storedPOIs.map(p => p.id)), [storedPOIs]);
  const createdIds = useMemo(() => new Set(createdPOIs.map(p => p.id)), [createdPOIs]);

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const obaRouteLayer = React.useMemo<LayerProps>(() => ({
    id: 'oba-route-line',
    type: 'line',
    slot: 'middle',
    paint: { 
      'line-color': '#00FFFF', 
      'line-width': 4, 
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
        <div className="transform transition-transform hover:scale-125" style={{ transform: `rotate(${vehicle.heading ?? 0}deg)` }}>
          <span className="text-3xl">🚌</span>
        </div>
      </Marker>
    ));
  }, [currentVehicleLocations, handleVehicleClick]);
  
  const startMarker = React.useMemo(() => {
    if (!routeStartCoords) return null;
    return (
      <Marker longitude={routeStartCoords.longitude} latitude={routeStartCoords.latitude} anchor="bottom">
        <Icons.MapPin className="w-6 h-6 text-green-600 drop-shadow-lg" />
      </Marker>
    );
  }, [routeStartCoords]);

  const endMarker = React.useMemo(() => {
    if (!routeEndCoords) return null;
    return (
      <Marker longitude={routeEndCoords.longitude} latitude={routeEndCoords.latitude} anchor="bottom">
        <Icons.MapPin className="w-6 h-6 text-red-600 drop-shadow-lg" />
      </Marker>
    );
  }, [routeEndCoords]);

  // Small turn/maneuver markers
  const turnMarkers = React.useMemo(() => {
    if (!showTurnMarkers || !mapboxDirectionsRoute) return null;
    return mapboxDirectionsRoute.legs.flatMap((leg, legIndex) =>
      leg.steps.flatMap((step, stepIndex) => {
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
            <div className="w-3 h-3 bg-red-500 rounded-full border border-white shadow" />
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
    description: typeof activeSelection.poi.description === 'string'
      ? activeSelection.poi.description
      : activeSelection.poi.description
      ? formatAddressLines(activeSelection.poi.description).join(', ')
      : undefined,
    source: (activeSelection.poi.isObaStop ? 'oba' : 
             activeSelection.poi.isSearchResult ? 'search' : 
             activeSelection.poi.isNativePoi ? 'mapbox' : 'stored') as 'mapbox' | 'search' | 'stored' | 'created' | 'osm',
    isObaStop: activeSelection.poi.isObaStop,
    properties: activeSelection.poi.properties
  } : null;
  
  const {
    transitSection,
    nearbySection,
    photosSection,
    hoursSection,
    startProgressiveLoad,
    retrySection
  } = useProgressivePopupLoader(popupPOI);

  React.useEffect(() => {
    console.log('💠 StandardMapView obaRouteStops:', obaRouteStops);
  }, [obaRouteStops]);

  // Draw feature layers
  const drawFeatures = useDrawStore(state => state.drawFeatures);
  const lineColor = useDrawStyleStore(state => state.lineColor);
  const lineWidth = useDrawStyleStore(state => state.lineWidth);
  const polygonFillColor = useDrawStyleStore(state => state.polygonFillColor);
  const polygonFillOpacity = useDrawStyleStore(state => state.polygonFillOpacity);
  const polygonLineColor = useDrawStyleStore(state => state.polygonLineColor);
  const polygonLineWidth = useDrawStyleStore(state => state.polygonLineWidth);
  const pointColor = useDrawStyleStore(state => state.pointColor);
  const pointRadius = useDrawStyleStore(state => state.pointRadius);

  const drawPointLayer = React.useMemo<LayerProps>(() => ({
    id: 'draw-point-layer',
    type: 'circle',
    paint: { 'circle-radius': pointRadius, 'circle-color': pointColor },
    filter: ['==', ['geometry-type'], 'Point']
  }), [pointRadius, pointColor]);

  const drawLineLayer = React.useMemo<LayerProps>(() => ({
    id: 'draw-line-layer',
    type: 'line',
    paint: {
      'line-color': lineColor,
      'line-width': lineWidth,
      'line-emissive-strength': 1
    },
    filter: ['==', ['geometry-type'], 'LineString']
  }), [lineColor, lineWidth]);

  const drawPolygonFillLayer = React.useMemo<LayerProps>(() => ({
    id: 'draw-polygon-fill-layer',
    type: 'fill',
    paint: { 'fill-color': polygonFillColor, 'fill-opacity': polygonFillOpacity },
    filter: ['==', ['geometry-type'], 'Polygon']
  }), [polygonFillColor, polygonFillOpacity]);

  const drawPolygonLineLayer = React.useMemo<LayerProps>(() => ({
    id: 'draw-polygon-line-layer',
    type: 'line',
    paint: {
      'line-color': polygonLineColor,
      'line-width': polygonLineWidth,
      'line-emissive-strength': 1
    },
    filter: ['==', ['geometry-type'], 'Polygon']
  }), [polygonLineColor, polygonLineWidth]);

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
        {/* Custom Draw Controls */}
        <DrawControls mapRef={mapRef} />
        {/* Draw Features Source */}
        {drawFeatures.features.length > 0 && (
          <Source id="draw-source" type="geojson" data={drawFeatures}>
            <Layer {...drawPolygonFillLayer} />
            <Layer {...drawPolygonLineLayer} />
            <Layer {...drawLineLayer} />
            <Layer {...drawPointLayer} />
          </Source>
        )}

        {directionsRouteLine && (
          <Source id="directions-source" type="geojson" data={directionsRouteLine}>
            <Layer {...directionsLayer} />
        </Source>
      )}

        {/* Render the selected branch as a single GeoJSON FeatureCollection */}
        {obaRouteSegments.length > 0 && (
          <Source id="oba-route-source" type="geojson" data={{
            type: 'FeatureCollection',
            features: obaRouteSegments
          }}>
            <Layer {...obaRouteLayer} id="oba-route-layer" />
          </Source>
        )}

        {/* POI markers */}
        {displayPois.map(poi => (
          <Marker
            key={poi.id}
            latitude={poi.latitude}
            longitude={poi.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              if (searchIds.has(poi.id)) {
                handleSearchResultClick(poi);
              } else if (storedIds.has(poi.id)) {
                handleStoredPOIClick(poi);
              } else if (createdIds.has(poi.id)) {
                handleCreatedPOIClick(poi);
              }
              flyTo({ latitude: poi.latitude, longitude: poi.longitude }, { zoom: 16 });
            }}
          >
            {poi.type === 'Bus Stop' ? (
              <div className="w-3 h-3 bg-red-600 rounded-full" />
            ) : (
              <div className="cursor-pointer hover:scale-110 transition-transform">
                <div className="bg-red-600 text-white p-1 rounded-full">
                  <span className="text-xs">•</span>
                </div>
              </div>
            )}
          </Marker>
        ))}

      {vehicleMarkers}

      {turnMarkers}
      {/* OBA stop markers for selected branch */}
      {(originStopId
        ? obaRouteStops.filter((stop: ObaStopSearchResult) => stop.id === originStopId)
        : obaRouteStops
      ).map((stop: ObaStopSearchResult) => {
        const stopPoi: PointOfInterest = {
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
            <div className={`w-3 h-3 rounded-full ${activeSelection?.poi.id === stop.id ? 'bg-green-600' : 'bg-red-600'}`} />
          </Marker>
        );
      })}

        {startMarker}
        {endMarker}
        
        {/* Modern 2025: Temporary destination marker with visual feedback */}
        {enhancedInteractions.destinationSetting.temporaryDestination && (
          <TemporaryDestinationMarker
            coordinates={enhancedInteractions.destinationSetting.temporaryDestination}
            onConfirm={enhancedInteractions.destinationSetting.confirmDestination}
            onCancel={enhancedInteractions.destinationSetting.cancelDestinationSetting}
          />
        )}

        {/* Enhanced Async Popup System - Progressive Loading */}
        {/* Transit fixed panel for OBA stops */}
        {popupPOI?.isObaStop && (
          <div className={`absolute bottom-4 left-4 z-40 ${isSidebarOpen ? 'md:left-[calc(24rem+1rem)]' : ''}`}>
            <div className={`min-w-[320px] p-4 rounded-md ${popupTheme}`}> 
              <TransitSection
                section={transitSection}
                onRetry={() => retrySection('transit')}
              />
              <ActionsSection
                poi={activeSelection.poi}
                onDirections={(poi) => console.log('🧭 Directions requested for:', poi.name)}
                onSave={(poi) => console.log('💾 Save requested for:', poi.name)}
              />
            </div>
          </div>
        )}
        {activeSelection && !popupPOI?.isObaStop && (
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
                      const props = activeSelection.poi.properties;
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
                  {popupPOI?.isObaStop ? (
                    <>
                      {/* Route-stop popup: show upcoming arrivals only */}
                      <TransitSection
                        section={transitSection}
                        onRetry={() => retrySection('transit')}
                      />
                      {/* Action buttons (directions, save, share) */}
                      <ActionsSection
                        poi={activeSelection.poi}
                        onDirections={(poi) => console.log('🧭 Directions requested for:', poi.name)}
                        onSave={(poi) => console.log('💾 Save requested for:', poi.name)}
                      />
                    </>
                  ) : (
                    <>
                  {/* Basic POI Information - Immediate */}
                  {(() => {
                    const props = activeSelection.poi.properties;
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
                          address={props?.osm_address as AddressInput}
                          phone={props?.osm_phone as string}
                          website={props?.osm_website as string}
                          operator={props?.osm_operator as string}
                          brand={props?.osm_brand as string}
                          cuisine={props?.osm_cuisine as string}
                          opening_hours={props?.osm_opening_hours as string}
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
                            {typeof activeSelection.poi.description === 'string'
                              ? activeSelection.poi.description
                              : formatAddressLines(activeSelection.poi.description).join(', ')}
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

                  {/* Async Transit-Only Section */}
                  <TransitSection 
                        section={transitSection} 
                        onRetry={() => retrySection('transit')}
                  />

                  {/* Action buttons */}
                  <ActionsSection 
                    poi={activeSelection.poi}
                    onDirections={(poi) => console.log('🧭 Directions requested for:', poi.name)}
                        onSave={(poi) => console.log('💾 Save requested for:', poi.name)}
                  />
                    </>
                  )}
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