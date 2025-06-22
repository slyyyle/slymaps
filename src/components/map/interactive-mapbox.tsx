// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMapRouteHandler, useMapTransitLayer, useMapTurnMarkers } from '@/hooks/map';
import { useRouteData } from '@/hooks/data/use-route-data';

// Map core, overlays, controls, and layers
import {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  GeolocateControl,
  Source,
  Layer
} from 'react-map-gl/mapbox';
import Core from '@/features/map/Core';
import PopupWrapper from '@/components/map/PopupWrapper';
import { VehicleStatusDisplay } from '@/components/sidebar/VehicleStatusDisplay';
import { TransitSection, ActionsSection } from '@/components/popup/popup-sections';
import { OSMInfoSection } from '@/components/popup/osm_info_section';

// Map state types
import type { ViewState, LayerProps } from 'react-map-gl/mapbox';
import type { Place } from '@/types/core';
import type { ObaVehicleLocation, ObaStopSearchResult } from '@/types/transit/oba';
import { MAPBOX_ACCESS_TOKEN, INITIAL_VIEW_STATE, ONEBUSAWAY_API_KEY } from '@/lib/constants';
// Card components replaced with themed divs using CSS variables
import { Icons, IconName } from '@/components/icons';
import type { MapViewProps } from './map-orchestrator';

// NEW SEGREGATED APPROACH
import { useUnifiedPOIHandler } from '@/hooks/map/use-unified-poi-handler';
import { useMapStyleConfig } from '@/hooks/map/use-map-style-config';
import { useEnhancedMapInteractions } from '@/hooks/map/use-enhanced-map-interactions';
import { TemporaryDestinationMarker } from './temporary-destination-marker';
import { useThemeStore } from '@/stores/theme-store';
import { useTransitStore } from '@/stores/transit';
import { useHomeStore } from '@/stores/use-home-store';
import HomePopup from '@/components/map/HomePopup';

// ENHANCED ASYNC POPUP SYSTEM
import MapPopup from '@/components/map/MapPopup';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useDrawStore } from '@/stores/draw';
import MapboxTraffic from '@mapbox/mapbox-gl-traffic';
import { useDirectionsMode } from '@/contexts/DirectionsModeContext';

import { formatAddressLines } from '@/utils/address-utils';
import type { AddressInput } from '@/utils/address-utils';

// Static import for draw controls (no longer lazy loaded)
import DrawControls from '@/components/draw/DrawControls';

const getIconForPoiType = (poi: Place): IconName => {
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
  // Home location for persistent marker
  const homeLocation = useHomeStore(state => state.homeLocation);
  const [isHomePopupOpen, setIsHomePopupOpen] = useState(false);
  // Ref for the Mapbox Directions control
  const directionsControlRef = useRef<any>(null);
  // Render transit route line via map hook
  const { getActiveRoute, getSelectedSegmentIndex } = useMapRouteHandler();
  const activeRoute = getActiveRoute();
  // Identify store route ID vs original OBA route ID
  const storeRouteId = activeRoute?.id ?? null;
  const obaRouteId = activeRoute?.obaRoute?.id ?? null;
  const branchIndex = getSelectedSegmentIndex(storeRouteId);
  // Render transit route line via map hook using original OBA ID (thicker black, no outline)
  useMapTransitLayer(mapRef.current, obaRouteId, branchIndex, {
    color: '#000000',
    width: 8,
    opacity: 1,
    disableOutline: true
  });
  // Fetch stops & vehicles via data hooks using original OBA ID
  const { detailsQuery, vehiclesQuery } = useRouteData(obaRouteId);
  // Log batch vehicles data for debugging
  useEffect(() => {
    console.log('📡 Batch vehicles data:', vehiclesQuery.data);
  }, [vehiclesQuery.data]);
  const branchData = detailsQuery.data?.branches?.[branchIndex];
  const stopsData: ObaStopSearchResult[] = branchData?.stops ?? [];
  const vehiclesData: ObaVehicleLocation[] = vehiclesQuery.data ?? [];
  
  // Filter vehicles by selected branch headsign
  const filteredVehiclesData = useMemo(() => {
    if (!vehiclesData.length) return vehiclesData;
    if (!branchData?.name) return vehiclesData;

    // Case-insensitive substring match on headsign, include vehicles without headsign
    const branchKey = branchData.name.trim().toLowerCase();
    return vehiclesData.filter(vehicle => {
      const heads = vehicle.tripHeadsign?.trim().toLowerCase();
      if (!heads) {
        return true;
      }
      return heads.includes(branchKey);
    });
  }, [vehiclesData, branchData?.name]);

  // Allowed stop IDs for filtering POIs when a route is active
  const allowedStopIds = useMemo(() => new Set(stopsData.map(stop => stop.id)), [stopsData]);

  // Fly-to helper using Mapbox GL JS directly via mapRef
  const doFlyTo = useCallback((coords: { latitude: number; longitude: number }, options: { zoom?: number; duration?: number } = {}) => {
    const mapInstance = mapRef?.current?.getMap();
    if (!mapInstance) return;
    mapInstance.flyTo({
      center: [coords.longitude, coords.latitude],
      zoom: options.zoom ?? 16,
      duration: options.duration ?? 1500,
      essential: true
    });
  }, [mapRef]);
  const [internalViewState, setInternalViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  // Vehicle selection state from transit store
  const selectedVehicleId = useTransitStore(state => state.selectedVehicleId);
  const setSelectedVehicleId = useTransitStore(state => state.setSelectedVehicleId);
  // Hover state for map vehicle markers from transit store
  const hoveredVehicleId = useTransitStore(state => state.hoveredVehicleId);
  const setHoveredVehicle = useTransitStore(state => state.setHoveredVehicle);
  // Derive selected vehicle object based on store ID
  const selectedVehicle = useMemo(() => {
    return selectedVehicleId ? filteredVehiclesData.find(v => v.id === selectedVehicleId) ?? null : null;
  }, [selectedVehicleId, filteredVehiclesData]);
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [isTerrainEnabled, setIsTerrainEnabled] = useState(false);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.2);
  // Track when the Map has loaded to initialize native POI interactions
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // 🎨 Popup theme state - now from global store
  const { popupTheme } = useThemeStore();
  // Remove local state - we'll get this from segregated stores
  
  const moveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize POI handler once map has loaded to ensure mapRef.current is available
  const poiHandler = useUnifiedPOIHandler({
    map: mapLoaded ? mapRef.current : null,
    enableNativeInteractions: true
  });

  // Modern 2025 interaction system with visual feedback
  const enhancedInteractions = useEnhancedMapInteractions(mapRef.current);
  
  // 🔧 CORE FIX: Get data directly, no wrapper callbacks
  const storedPOIs = poiHandler.getStoredPlaces();
  const searchResults = poiHandler.getSearchResults();
  const createdPOIs = poiHandler.getCreatedPlaces();
  const activeSelection = poiHandler.getActiveSelection();
  
  // 🔧 CORE FIX: Extract handlers outside useMemo - they're stable now
  const { handleSearchResultClick, handleStoredPlaceClick, handleCreatedPlaceClick } = poiHandler;

  // Combined POIs for rendering (replaces currentPois)
  const currentPois = React.useMemo(() => [
    ...searchResults,
    ...storedPOIs,
    ...createdPOIs
  ], [searchResults, storedPOIs, createdPOIs]);

  // Place markers: render place pins (search, stored, created) using directions pin style
  const searchPlaceIds = React.useMemo(() => new Set(searchResults.map(p => p.id)), [searchResults]);
  const storedPlaceIds = React.useMemo(() => new Set(storedPOIs.map(p => p.id)), [storedPOIs]);
  const createdPlaceIds = React.useMemo(() => new Set(createdPOIs.map(p => p.id)), [createdPOIs]);
  const placeMarkers = React.useMemo(() => {
    return currentPois
      .filter(poi => !poi.isObaStop)
      .map(poi => (
        <Marker
          key={`place-${poi.id}`}
          longitude={poi.longitude}
          latitude={poi.latitude}
          anchor="bottom"
          onClick={e => {
            e.originalEvent.stopPropagation();
            setSelectedVehicleId(null);
            if (searchPlaceIds.has(poi.id)) {
              handleSearchResultClick(poi);
            } else if (storedPlaceIds.has(poi.id)) {
              handleStoredPlaceClick(poi);
            } else if (createdPlaceIds.has(poi.id)) {
              handleCreatedPlaceClick(poi);
            }
          }}
        >
          {poi.type === 'home' ? (
            <span className="text-4xl drop-shadow-lg" style={{ lineHeight: 1 }}>🏠</span>
          ) : (
            <Icons.MapPin className="w-6 h-6 text-green-600 drop-shadow-lg" />
          )}
        </Marker>
      ));
  }, [currentPois, searchPlaceIds, storedPlaceIds, createdPlaceIds, handleSearchResultClick, handleStoredPlaceClick, handleCreatedPlaceClick, setSelectedVehicleId]);
  
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

  // Get current mode for manual drawing logic
  const { mode } = useDirectionsMode();

  // Map load event handler
  const handleMapLoad = useCallback((event: any) => {
    setMapLoaded(true);
    const map = event.target;
    reapplyAllSettings();
    map.on('style.load', reapplyAllSettings);

    // Add Mapbox Traffic control
    map.addControl(new MapboxTraffic({ showTraffic: true, showTrafficButton: false }));
  }, [reapplyAllSettings]);

  useEffect(() => {
    setInternalViewState(prev => ({ ...prev, ...externalViewState }));
  }, [externalViewState]);

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
    // Log full vehicle data for debugging
    console.log('🚍 Vehicle clicked data:', vehicle);
    // Fetch and log raw OBA API response for vehicles
    (async () => {
      try {
        const response = await fetch(
          `https://api.pugetsound.onebusaway.org/api/where/trips-for-route/${vehicle.routeId}.json?key=${ONEBUSAWAY_API_KEY}&includeReferences=true`
        );
        const raw = await response.json();
        console.log('🚍 Raw OBA vehicles response:', raw);
      } catch (err) {
        console.error('🚍 Error fetching raw vehicles data:', err);
      }
    })();
    setSelectedVehicleId(vehicle.id);
    // Clear any active POI selection when vehicle is selected
    poiHandler.clearSelection();
  }, [poiHandler, setSelectedVehicleId]);

  const handleToggle3D = useCallback((enabled: boolean) => {
    apply3D(enabled);
  }, [apply3D]);

  const handleToggleTerrain = useCallback((enabled: boolean) => {
    applyTerrain(enabled, terrainExaggeration);
  }, [applyTerrain, terrainExaggeration]);

  const handleTerrainExaggerationChange = useCallback((exaggeration: number) => {
    applyTerrainExaggeration(exaggeration);
  }, [applyTerrainExaggeration]);

  // Always draw the active route line (transit or non-transit) using store data
  const directionsRouteLine = React.useMemo(() => {
    const geom = mapboxDirectionsRoute?.geometry;
    if (!geom) return null;
    return {
      type: 'Feature',
      properties: { source: mode === 'transit' ? 'oba' : 'directions' },
      geometry: geom
    } as GeoJSON.Feature;
  }, [mapboxDirectionsRoute?.geometry, mode]);

  const obaRouteLayer = React.useMemo<LayerProps>(() => ({
    id: 'oba-route-line',
    type: 'line',
    slot: 'middle',
    paint: { 
      'line-color': '#000000', 
      'line-width': 4, 
      'line-opacity': 0.8,
      'line-emissive-strength': 0.9  // Modern v3 Standard compatibility for 3D lighting
    }
  } as const), []);

  const directionsLayer = React.useMemo<LayerProps>(() => ({
    id: 'directions-route-line',
    type: 'line',
    slot: 'top',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      // Pure black line for maximum contrast
      'line-color': '#000000',
      'line-width': 8,
      'line-opacity': 1
    }
  }) as const, []);

  const vehicleMarkers = React.useMemo(() => {
    if (!filteredVehiclesData || filteredVehiclesData.length === 0) return null;

    return filteredVehiclesData.map(vehicle => {
      // Determine marker color: orange = late (>0), yellow = early (<0), green = on time (0 or null)
      const deviation = vehicle.scheduleDeviation ?? 0;
      let colorClass = 'text-green-500';
      if (deviation > 0) {
        colorClass = 'text-orange-500';
      } else if (deviation < 0) {
        colorClass = 'text-yellow-500';
      }
      // Compute scale based on hover or selected state
      const isHoveredOrSelected = vehicle.id === hoveredVehicleId || vehicle.id === selectedVehicleId;
      const scaleClass = isHoveredOrSelected ? 'scale-150' : 'scale-100';
      return (
      <Marker
        key={`vehicle-${vehicle.id}-${vehicle.lastUpdateTime || 0}`}
        longitude={vehicle.longitude}
        latitude={vehicle.latitude}
      >
        <div
          onClick={(e) => { e.stopPropagation(); handleVehicleClick(vehicle); }}
          onMouseEnter={() => setHoveredVehicle(vehicle.id)}
          onMouseLeave={() => setHoveredVehicle(null)}
          className={`transform ${scaleClass} transition-transform text-4xl ${colorClass} drop-shadow-lg`}
          style={{ transform: `rotate(${vehicle.heading ?? 0}deg)` }}
        >
          ▲
        </div>
      </Marker>
      );
    });
  }, [filteredVehiclesData, handleVehicleClick, hoveredVehicleId, selectedVehicleId, setHoveredVehicle]);
  
  // Turn markers via hook
  const turnMarkers = useMapTurnMarkers(mapboxDirectionsRoute, true);

  // Manual start/end markers (re-enable for walking and cycling)
  const startMarker = React.useMemo(() => {
    if (!routeStartCoords) return null;
    return (
      <Marker
        longitude={routeStartCoords.longitude}
        latitude={routeStartCoords.latitude}
        anchor="center"
        style={{ zIndex: 1000 }}
      >
        <div className="w-6 h-6 rounded-full bg-blue-800 text-white flex items-center justify-center text-xs font-bold">
          A
        </div>
      </Marker>
    );
  }, [routeStartCoords]);
  const endMarker = React.useMemo(() => {
    if (!routeEndCoords) return null;
    return (
      <Marker
        longitude={routeEndCoords.longitude}
        latitude={routeEndCoords.latitude}
        anchor="center"
        style={{ zIndex: 1000 }}
      >
        <div className="w-6 h-6 rounded-full bg-red-800 text-white flex items-center justify-center text-xs font-bold">
          B
        </div>
      </Marker>
    );
  }, [routeEndCoords]);

  // Draw feature layers
  const drawFeatures = useDrawStore(state => state.drawFeatures);
  const lineColor = useDrawStore(state => state.lineColor);
  const lineWidth = useDrawStore(state => state.lineWidth);
  const polygonFillColor = useDrawStore(state => state.polygonFillColor);
  const polygonFillOpacity = useDrawStore(state => state.polygonFillOpacity);
  const polygonLineColor = useDrawStore(state => state.polygonLineColor);
  const polygonLineWidth = useDrawStore(state => state.polygonLineWidth);
  const pointColor = useDrawStore(state => state.pointColor);
  const pointRadius = useDrawStore(state => state.pointRadius);

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

  // Highlight stop marker when hovering in sidebar
  const hoveredStopId = useTransitStore(state => state.hoveredStopId);
  // --- Route stop markers ---
  const stopMarkers = React.useMemo(() => {
    return stopsData.map((stop: ObaStopSearchResult) => {
      const stopPoi: Place = {
        id: stop.id,
        name: stop.name,
        type: 'Bus Stop',
        latitude: stop.latitude,
        longitude: stop.longitude,
        description: `Stop #${stop.code} - ${stop.direction} bound`,
        isObaStop: true,
        properties: { source: 'oba', stop_code: stop.code, direction: stop.direction, route_ids: stop.routeIds, wheelchair_boarding: stop.wheelchairBoarding }
      };
      const isSelected = activeSelection?.poi.id === stop.id;
      const isHovered = hoveredStopId === stop.id;
      // Hovered stops should appear on top, then selected, then default
      const zIndex = isHovered ? 1000 : isSelected ? 800 : 500;
      return (
        <Marker
          key={`stop-${stop.id}`}
          latitude={stop.latitude}
          longitude={stop.longitude}
          anchor="bottom"
          style={{ zIndex }}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedVehicleId(null);
            handleSearchResultClick(stopPoi);
            doFlyTo({ latitude: stop.latitude, longitude: stop.longitude }, { zoom: 16 });
          }}
        >
          {isSelected || isHovered ? (
            <span className={`text-2xl ${isHovered && !isSelected ? 'animate-bounce' : ''}`}>🚦</span>
          ) : (
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          )}
        </Marker>
      );
    });
  }, [stopsData, handleSearchResultClick, doFlyTo, activeSelection, hoveredStopId, setSelectedVehicleId]);

  // Development-only flag for vehicle test alerts (true in non-production builds)
  const isDev = process.env.NODE_ENV !== 'production';

  // Memoized component to isolate directions route from vehicle tracking re-renders
  const DirectionsRoute = React.memo(({ 
    directionsRouteLine, 
    directionsLayer 
  }: { 
    directionsRouteLine: GeoJSON.Feature | null; 
    directionsLayer: LayerProps; 
  }) => {
    if (!directionsRouteLine) return null;
    
    return (
      <Source 
        id="directions-source" 
        type="geojson" 
        data={directionsRouteLine}
        key="stable-directions-source"
      >
        <Layer {...directionsLayer} />
      </Source>
    );
  });

  DirectionsRoute.displayName = 'DirectionsRoute';

  // Fly to new POI/stop when selected via unified handler
  React.useEffect(() => {
    if (activeSelection) {
      const { latitude, longitude } = activeSelection.poi;
      doFlyTo({ latitude, longitude }, { zoom: 16 });
    }
  }, [activeSelection, doFlyTo]);

  // Fly to selected vehicle when a vehicle is clicked or selected from sidebar
  React.useEffect(() => {
    if (selectedVehicle) {
      doFlyTo({ latitude: selectedVehicle.latitude, longitude: selectedVehicle.longitude }, { zoom: 16 });
    }
  }, [selectedVehicle, doFlyTo]);

  return (
    <>
    <Core
      mapRef={mapRef}
      viewState={internalViewState}
      onMove={handleMove}
      onLoad={handleMapLoad}
      mapStyleUrl={mapStyleUrl}
      cursor={enhancedInteractions.mapCursorStyle}
      onContextMenu={enhancedInteractions.handleMapRightClick}
    >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        {/* Removed inline 3D/Terrain controls, moved to sidebar style pane */}
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

        {/* Manual directions route line for all modes */}
        {directionsRouteLine && (
          <Source id="directions-source" type="geojson" data={directionsRouteLine} key="directions-source">
            <Layer {...directionsLayer} />
          </Source>
        )}

        {/* POI markers removed - using Mapbox right-click pinning instead */}

      {vehicleMarkers}

      {turnMarkers}
      {/* Render stops via stopMarkers hook */}
      {stopMarkers}

      {/* Only render place pins when no active directions route */}
      {!mapboxDirectionsRoute && placeMarkers}

      {/* Always render home marker if set */}
      {homeLocation && (
        <Marker
          key="home-marker"
          longitude={homeLocation.longitude}
          latitude={homeLocation.latitude}
          anchor="bottom"
          onClick={e => { e.originalEvent.stopPropagation(); setIsHomePopupOpen(true); }}
        >
          <span className="text-4xl drop-shadow-lg" style={{ lineHeight: 1 }}>🏠</span>
        </Marker>
      )}

      {/* Show HomePopup when home marker is clicked */}
      {homeLocation && isHomePopupOpen && (
        <HomePopup homeLocation={homeLocation} onClose={() => setIsHomePopupOpen(false)} mapRef={mapRef} />
      )}

        {/* Modern 2025: Temporary destination marker with visual feedback */}
        {enhancedInteractions.destinationSetting.temporaryDestination && (
          <TemporaryDestinationMarker
            coordinates={enhancedInteractions.destinationSetting.temporaryDestination}
            onConfirm={enhancedInteractions.destinationSetting.confirmDestination}
            onCancel={enhancedInteractions.destinationSetting.cancelDestinationSetting}
          />
        )}

        {/* Unified POI popup */}
        {activeSelection && (
          <MapPopup
            poi={activeSelection.poi}
            popupTheme={popupTheme}
            onClose={() => poiHandler.clearSelection()}
            mapRef={mapRef}
          />
        )}

        {/* React-Map-GL declarative popup for selected vehicle */}
        {selectedVehicle && (
          <PopupWrapper
            longitude={selectedVehicle.longitude}
            latitude={selectedVehicle.latitude}
            onClose={() => setSelectedVehicleId(null)}
            className={`${popupTheme} vehicle-popup`}
            autoAnchor={true}
            mapRef={mapRef}
            closeOnClick={false}
            closeButton={true}
            offset={25}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '1rem'
              }}
            >
              {/* Header */}
              <div className="px-4 pt-3">
                <div className="text-lg font-semibold" style={{ color: 'hsl(var(--card-foreground))' }}>
                  Vehicle: {selectedVehicle.id}
                </div>
                <div className="flex items-center justify-between mt-1 pb-2">
                  <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Real-time vehicle location
                  </span>
                  <ActionsSection
                    poi={selectedVehicle as any}
                    onDirections={() => console.log('Directions to vehicle', selectedVehicle.id)}
                    onSave={() => console.log('Save vehicle', selectedVehicle.id)}
                  />
                </div>
              </div>
              {/* Sidebar-style vehicle status display (highlighted) */}
              <div className="mb-4 bg-yellow-50 p-3 rounded-lg">
                <VehicleStatusDisplay vehicle={selectedVehicle} />
              </div>
              {/* Vehicle Details section */}
              <div className="bg-pink-50 border-2 border-pink-500 rounded-md p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-pink-900 flex items-center gap-2">
                    <Icons.Bus className="h-4 w-4" />
                    Vehicle Details
                  </h4>
                </div>
                <div className="space-y-1 text-xs text-pink-700">
                  <div>Route: {detailsQuery.data?.routeInfo.shortName ?? selectedVehicle.routeId}</div>
                  <div>Agency: {detailsQuery.data?.routeInfo.agency?.name ?? 'N/A'}</div>
                  {selectedVehicle.tripHeadsign && <div>Headsign: {selectedVehicle.tripHeadsign}</div>}
                </div>
              </div>
              {/* Content */}
              <div className="space-y-1">
                <p style={{ color: 'hsl(var(--card-foreground))' }}>
                  Last updated: {selectedVehicle.lastUpdateTime ? new Date(selectedVehicle.lastUpdateTime).toLocaleTimeString() : 'N/A'}
                </p>
                <p style={{ color: 'hsl(var(--card-foreground))' }}>
                  Heading: {selectedVehicle.heading}°
                </p>
              </div>
              {/* Service Alerts section (vehicle-level) */}
              {(isDev) && (
                <div className="bg-red-50 border-2 border-red-500 rounded-md p-3 mt-3 space-y-1 text-xs text-red-700">
                  Development-only test alert.
                </div>
              )}
            </div>
          </PopupWrapper>
        )}

        {/* Always show start/end markers when coordinates exist */}
        {startMarker}
        {endMarker}

      </Core>
    </>
  );
}