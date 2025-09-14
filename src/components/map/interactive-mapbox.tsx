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
import { useTerrainStore } from '@/stores/terrain-store';
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
import { useNavigationStore } from '@/stores/navigation-store';
import type { Route } from '@/types/transit/directions';

// Hoist navigation store usage before any effects that depend on it
const { isActive: navActive, followingEnabled } = useNavigationStore.getState ? useNavigationStore.getState() : { isActive: false, followingEnabled: true };

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
  const activeRouteEntity = getActiveRoute();
  // Identify store route ID vs original OBA route ID
  const storeRouteId = activeRouteEntity?.id ?? null;
  const obaRouteId = activeRouteEntity?.obaRoute?.id ?? null;
  const branchIndex = getSelectedSegmentIndex(storeRouteId);

  // Mapbox route (non-transit) used for navigation overlay/progress
  const routeStore = useTransitStore();
  const activeRouteId = routeStore.activeRouteId;
  const activeMapboxRoute: Route | null = (() => {
    const r = activeRouteId ? routeStore.getRoute(activeRouteId) : null;
    return (r?.mapboxRoute ?? null) as any;
  })();
  // Current directions mode (driving/walking/cycling/transit)
  const { mode } = useDirectionsMode();
  // Unified route used for drawing: OTP in transit, Mapbox route otherwise
  const displayRoute = mode === 'transit' ? mapboxDirectionsRoute : activeMapboxRoute;

  // Simple nearest-point snap along a LineString (approximate, no turf)
  function getNearestIndexOnLine(coords: [number, number][], point: [number, number]) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dx = coords[i][0] - point[0];
      const dy = coords[i][1] - point[1];
      const d = dx*dx + dy*dy;
      if (d < bestD) { bestD = d; bestI = i; }
    }
    return { index: bestI, dist2: bestD };
  }

  // Minimal in-map overlay for next maneuver
  const { nextManeuverText, isActive: isNavActive } = useNavigationStore();
  // Render transit route line via map hook using original OBA ID (thicker black, no outline)
  useMapTransitLayer(mapRef.current, obaRouteId, branchIndex, {
    color: '#000000',
    width: 8,
    opacity: 1,
    disableOutline: true
  });
  // Fetch stops & vehicles via data hooks using original OBA ID
  const { detailsQuery } = useRouteData(obaRouteId);
  const branchData = detailsQuery.data?.branches?.[branchIndex];
  const stopsData: ObaStopSearchResult[] = branchData?.stops ?? [];
  const vehiclesData: ObaVehicleLocation[] = obaVehicleLocations ?? [];
  
  // Filter vehicles by selected branch headsign (fallback to all vehicles)
  const filteredVehiclesData = useMemo(() => {
    if (!vehiclesData.length) return vehiclesData;
    if (!branchData?.name) return vehiclesData;

    const branchKey = branchData.name.trim().toLowerCase();
    const filtered = vehiclesData.filter(vehicle => {
      const heads = vehicle.tripHeadsign?.trim().toLowerCase();
      if (!heads) return true;
      return heads.includes(branchKey);
    });
    return filtered.length ? filtered : vehiclesData;
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
  // Use terrain store instead of local state
  const {
    is3DEnabled,
    isTerrainEnabled,
    terrainExaggeration,
    set3DEnabled,
    setTerrainEnabled,
    setTerrainExaggeration: setStoreTerrainExaggeration
  } = useTerrainStore();
  // Track when the Map has loaded to initialize native POI interactions
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // 🎨 Popup theme state - now from global store
  const { popupTheme } = useThemeStore();
  // Remove local state - we'll get this from segregated stores
  
  const moveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Guard: skip external updates during programmatic camera moves
  const programmaticMoveRef = useRef<boolean>(false);
  const geolocateRef = useRef<any>(null);

  // When navigation becomes active, trigger geolocate follow
  useEffect(() => {
    if (!navActive) return;
    try {
      geolocateRef.current?.trigger?.();
    } catch {}
  }, [navActive]);

  // On geolocate updates, slightly increase pitch and lock follow if enabled
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const handler = (e: any) => {
      if (!followingEnabled) return;
      const heading = e?.coords?.heading ?? null;
      map.easeTo({
        pitch: Math.max(map.getPitch(), 50),
        bearing: heading ?? map.getBearing(),
        duration: 500
      });
    };
    geolocateRef.current?.on?.('geolocate', handler);
    return () => {
      try { geolocateRef.current?.off?.('geolocate', handler); } catch {}
    };
  }, [mapRef, followingEnabled]);

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
    try {
      const map = mapRef.current.getMap();
      if (!map.isStyleLoaded()) return;
      map.setConfigProperty('basemap', 'show3dObjects', enabled);
      set3DEnabled(enabled);
    } catch (error) {
      console.warn('Failed to apply 3D settings:', error);
    }
  }, [mapRef, set3DEnabled]);

  const applyCutoff = useCallback((enabled: boolean) => {
    if (!mapRef.current) return;
    try {
      const map = mapRef.current.getMap();
      if (!map.isStyleLoaded()) return;
      try { map.setConfigProperty('basemap', 'terrainCutoff', enabled ? 'default' : 'none'); } catch {}
    } catch (error) {
      console.warn('Failed to apply terrain cutoff:', error);
    }
  }, [mapRef]);

  const applyTerrain = useCallback((enabled: boolean, exaggeration: number) => {
    if (!mapRef.current) return;
    try {
      const map = mapRef.current.getMap();
      if (!map.isStyleLoaded()) return;
      
      if (enabled) {
        // Terrain DEM
        if (!map.getSource('app-dem')) {
          map.addSource('app-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
        }
        map.setTerrain({ source: 'app-dem', exaggeration });

        // Dedicated DEM for hillshade to avoid resolution warning
        if (!map.getSource('app_hillshade_dem')) {
          map.addSource('app_hillshade_dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
        }
        // Add hillshade layer if missing (place it low in the stack)
        if (!map.getLayer('app_hillshade')) {
          const firstSymbol = map.getStyle().layers?.find(l => l.type === 'symbol')?.id;
          const layerDef: any = {
            id: 'app_hillshade',
            type: 'hillshade',
            source: 'app_hillshade_dem',
            paint: { 'hillshade-exaggeration': 0.5 }
          };
          if (firstSymbol) {
            map.addLayer(layerDef, firstSymbol);
          } else {
            map.addLayer(layerDef);
          }
        }
      } else {
        map.setTerrain(null);
        if (map.getLayer('app_hillshade')) {
          map.removeLayer('app_hillshade');
        }
        if (map.getSource('app-dem')) {
          map.removeSource('app-dem');
        }
        if (map.getSource('app_hillshade_dem')) {
          map.removeSource('app_hillshade_dem');
        }
      }
      setTerrainEnabled(enabled);
    } catch (error) {
      console.warn('Failed to apply terrain settings:', error);
    }
  }, [mapRef, setTerrainEnabled]);

  const applyTerrainExaggeration = useCallback((exaggeration: number) => {
    if (!mapRef.current) return;
    try {
      const map = mapRef.current.getMap();
      if (!map.isStyleLoaded()) return;
      
      const currentTerrain = map.getTerrain();
      if (currentTerrain) {
         map.setTerrain({ source: 'app-dem', exaggeration });
      }
      setStoreTerrainExaggeration(exaggeration);
    } catch (error) {
      console.warn('Failed to apply terrain exaggeration:', error);
    }
  }, [mapRef, setStoreTerrainExaggeration]);

  // --- Re-apply all settings on style reload ---
  const reapplyAllSettings = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    
    // Wait for style to be fully loaded before applying settings
    const applySettings = () => {
      if (!map.isStyleLoaded()) return;
      
      try {
        map.setConfigProperty('basemap', 'lightPreset', 'dusk');
        apply3D(is3DEnabled);
        applyTerrain(isTerrainEnabled, terrainExaggeration);
        applyCutoff(true);
      } catch (error) {
        console.warn('Failed to reapply settings:', error);
      }
    };

    // Apply settings immediately if style is loaded, otherwise wait
    if (map.isStyleLoaded()) {
      applySettings();
    } else {
      map.once('style.load', applySettings);
    }
  }, [mapRef, is3DEnabled, isTerrainEnabled, terrainExaggeration, apply3D, applyTerrain, applyCutoff]);


  // Map load event handler
  const handleMapLoad = useCallback((event: any) => {
    const map = mapRef?.current?.getMap();
    if (!map) return;
    setMapLoaded(true);
    reapplyAllSettings();
    map.on('style.load', reapplyAllSettings);

    // Add Mapbox Traffic control
    map.addControl(new MapboxTraffic({ showTraffic: true, showTrafficButton: false }));
  }, [reapplyAllSettings, mapRef]);

  useEffect(() => {
    setInternalViewState(prev => ({ ...prev, ...externalViewState }));
  }, [externalViewState]);

  // Off-route detection & next step update when we get geolocation updates (non-transit only)
  useEffect(() => {
    if (!activeMapboxRoute || mode === 'transit') return;
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    const handleGeo = (e: any) => {
      if (!useNavigationStore.getState().isActive) return;
      const coords = (activeMapboxRoute.geometry?.coordinates as [number, number][]) || [];
      if (coords.length === 0) return;
      const here: [number, number] = [e.coords.longitude, e.coords.latitude];
      const { index, dist2 } = getNearestIndexOnLine(coords, here);
      try {
        const steps = activeMapboxRoute.legs.flatMap(l => l.steps);
        let nextText: string | null = null;
        for (const step of steps) {
          const m = step.maneuver?.location as [number, number];
          if (!m) continue;
          const stepIdx = getNearestIndexOnLine(coords, m).index;
          if (stepIdx >= index) { nextText = step.maneuver?.instruction; break; }
        }
        useNavigationStore.getState().setNextManeuverText(nextText);
      } catch {}
      if (dist2 > 1e-6) {
        // TODO: reroute
      }
      if (useNavigationStore.getState().followingEnabled) {
        map.easeTo({ center: here, duration: 500 });
      }
    };

    geolocateRef.current?.on?.('geolocate', handleGeo);
    return () => { try { geolocateRef.current?.off?.('geolocate', handleGeo); } catch {} };
  }, [activeMapboxRoute, mode, mapRef]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMove = useCallback((evt: any) => {
    // Always update internal view state
    setInternalViewState(evt.viewState);
    
    // Skip external propagation for programmatic moves to avoid redundant re-fetches
    if (programmaticMoveRef.current && !evt.originalEvent) {
      return;
    }

    // Immediately propagate external view state for responsive tile updates
    onViewStateChange(evt.viewState);
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

  // Primary route feature for all modes
  const directionsRouteLine = React.useMemo(() => {
    const geom = displayRoute?.geometry as any;
    if (!geom) return null;
    return {
      type: 'Feature',
      properties: { source: mode === 'transit' ? 'otp' : 'directions' },
      geometry: geom
    } as GeoJSON.Feature;
  }, [displayRoute?.geometry, mode]);

  // Alternatives (non-transit only)
  const directionsAlternatives = React.useMemo(() => {
    if (!displayRoute || mode === 'transit') return [] as GeoJSON.Feature[];
    const alts = (displayRoute as any).alternatives as any[] | undefined;
    if (!alts || alts.length === 0) return [] as GeoJSON.Feature[];
    const features: GeoJSON.Feature[] = alts.map((alt, idx) => ({
      type: 'Feature',
      properties: { source: 'directions-alt', altIndex: idx + 1 },
      geometry: alt.geometry
    }));
    return features;
  }, [displayRoute, mode]);

  const directionsLayer = React.useMemo<LayerProps>(() => ({
    id: 'directions-route-line',
    type: 'line',
    slot: 'top',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#000000',
      'line-width': 8,
      'line-opacity': 1
    }
  }) as const, []);

  const directionsAltLayer = React.useMemo<LayerProps>(() => ({
    id: 'directions-alts-line',
    type: 'line',
    slot: 'top',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#000000',
      'line-width': 4,
      'line-opacity': 0.35
    }
  }) as const, []);

  const obaRouteLayer = React.useMemo<LayerProps>(() => ({
    id: 'oba-route-line',
    type: 'line',
    slot: 'middle',
    paint: {
      'line-color': '#000000',
      'line-width': 4,
      'line-opacity': 0.8,
      'line-emissive-strength': 0.9
    }
  } as const), []);

  const vehicleMarkers = React.useMemo(() => {
    if (!filteredVehiclesData || filteredVehiclesData.length === 0) return null;

    return filteredVehiclesData.map(vehicle => {
      // Determine marker color: orange = late (>0), yellow = early (<0), green = on time (0 or null)
      const deviation = vehicle.scheduleDeviation ?? 0;
      // Simplified color scheme: green when driving, yellow when arrived (at_stop)
      const isAtStop = (vehicle.closestStopTimeOffset != null && Math.abs(vehicle.closestStopTimeOffset) < 30) || (vehicle.phase === 'STOPPED_AT');
      const colorClass = isAtStop ? 'text-yellow-500' : 'text-green-500';
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
          style={{ transform: `rotate(${90 - (vehicle.heading ?? 0)}deg)` }}
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
      // Hovered stops highest, then selected, others low so they sit behind the popup
      const zIndex = isHovered ? 1200 : isSelected ? 1000 : 50;
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

  // Build GeoJSON for stops to render as a Symbol layer (more performant than many DOM Markers)
  const stopsGeojson = React.useMemo(() => {
    const features = stopsData.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      properties: {
        id: s.id,
        name: s.name,
        code: s.code,
        selected: activeSelection?.poi.id === s.id ? 1 : 0,
      }
    }));
    return { type: 'FeatureCollection', features } as any;
  }, [stopsData, activeSelection]);

  const stopsLayer = React.useMemo<LayerProps>(() => ({
    id: 'oba-stops-layer',
    type: 'circle',
    slot: 'top',
    paint: {
      'circle-radius': ['case', ['==', ['get', 'selected'], 1], 6, 4],
      'circle-color': ['case', ['==', ['get', 'selected'], 1], '#ffb703', '#22c55e'],
      'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2, 0],
      'circle-stroke-color': '#1f2937',
      'circle-emissive-strength': 0.8
    }
  }) as any, []);

  // Click handler for stops layer
  const onMapClick = useCallback((e: any) => {
    const mapInst = mapRef?.current?.getMap();
    if (!mapInst) return;
    const features = mapInst.queryRenderedFeatures(e.point, { layers: ['oba-stops-layer'] });
    if (features && features.length > 0) {
      const f = features[0];
      const [lon, lat] = (f.geometry as any).coordinates;
      const id = f.properties?.id as string;
      const name = f.properties?.name as string;
      const stopPoi: Place = {
        id,
        name,
        type: 'Bus Stop',
        latitude: lat,
        longitude: lon,
        description: '',
        isObaStop: true,
        properties: { source: 'oba' }
      } as any;
      setSelectedVehicleId(null);
      handleSearchResultClick(stopPoi);
      const clearGuard = () => { programmaticMoveRef.current = false; mapInst.off('moveend', clearGuard); };
      programmaticMoveRef.current = true;
      mapInst.on('moveend', clearGuard);
      mapInst.flyTo({ center: [lon, lat], zoom: 16, duration: 800, essential: true });
    }
  }, [mapRef, handleSearchResultClick, setSelectedVehicleId]);

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

  // Fly to new POI/stop when selected via unified handler (debounced)
  React.useEffect(() => {
    if (!activeSelection) return;
    const { poi } = activeSelection;
    const mapInst = mapRef?.current?.getMap();
    if (!mapInst) return;

    const clearGuard = () => { programmaticMoveRef.current = false; mapInst.off('moveend', clearGuard); };
    programmaticMoveRef.current = true;
    mapInst.on('moveend', clearGuard);
    mapInst.flyTo({ center: [poi.longitude, poi.latitude], zoom: 16, duration: 800, essential: true });
    return () => { mapInst.off('moveend', clearGuard); programmaticMoveRef.current = false; };
  }, [activeSelection, mapRef]);

  // Fly to selected vehicle when a vehicle is clicked or selected from sidebar (debounced)
  React.useEffect(() => {
    if (!selectedVehicle) return;
    const mapInst = mapRef?.current?.getMap();
    if (!mapInst) return;

    const clearGuard = () => { programmaticMoveRef.current = false; mapInst.off('moveend', clearGuard); };
    programmaticMoveRef.current = true;
    mapInst.on('moveend', clearGuard);
    mapInst.flyTo({ center: [selectedVehicle.longitude, selectedVehicle.latitude], zoom: 15, duration: 800, essential: true });
    return () => { mapInst.off('moveend', clearGuard); programmaticMoveRef.current = false; };
  }, [selectedVehicle, mapRef]);

  // OTP legs split into walk vs transit features (only when in transit mode)
  const otpWalkLegs = React.useMemo<GeoJSON.Feature[]>(() => {
    if (mode !== 'transit' || !mapboxDirectionsRoute) return [];
    const feats: GeoJSON.Feature[] = [];
    try {
      for (const leg of mapboxDirectionsRoute.legs || []) {
        // Our OTP adapter produces one step per leg with geometry
        const step = leg.steps?.[0];
        const g = step?.geometry as GeoJSON.LineString | undefined;
        const type = step?.maneuver?.type || '';
        if (g && type.toLowerCase() === 'walk') {
          feats.push({ type: 'Feature', properties: { kind: 'walk' }, geometry: g });
        }
      }
    } catch {}
    return feats;
  }, [mapboxDirectionsRoute, mode]);

  const otpTransitLegs = React.useMemo<GeoJSON.Feature[]>(() => {
    if (mode !== 'transit' || !mapboxDirectionsRoute) return [];
    const feats: GeoJSON.Feature[] = [];
    try {
      for (const leg of mapboxDirectionsRoute.legs || []) {
        const step = leg.steps?.[0];
        const g = step?.geometry as GeoJSON.LineString | undefined;
        const type = step?.maneuver?.type || '';
        if (g && type.toLowerCase() !== 'walk') {
          feats.push({ type: 'Feature', properties: { kind: 'transit', mode: type }, geometry: g });
        }
      }
    } catch {}
    return feats;
  }, [mapboxDirectionsRoute, mode]);

  const otpWalkLayer = React.useMemo<LayerProps>(() => ({
    id: 'otp-walk-legs',
    type: 'line',
    slot: 'top',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#777777',
      'line-width': 5,
      'line-dasharray': [2, 2],
      'line-opacity': 0.95,
      'line-emissive-strength': 0.8
    }
  }) as const, []);

  const otpTransitLayer = React.useMemo<LayerProps>(() => ({
    id: 'otp-transit-legs',
    type: 'line',
    slot: 'top',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#1a73e8',
      'line-width': 6,
      'line-opacity': 1,
      'line-emissive-strength': 0.95
    }
  }) as const, []);

  // Fit bounds to the current display route when it changes (e.g., user toggles alternative)
  useEffect(() => {
    if (!displayRoute?.geometry || !mapRef.current) return;
    try {
      const coords = (displayRoute.geometry as any).coordinates as [number, number][];
      if (!coords || coords.length === 0) return;
      let minLng = coords[0][0], maxLng = coords[0][0];
      let minLat = coords[0][1], maxLat = coords[0][1];
      for (const [lng, lat] of coords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      const map = mapRef.current.getMap();
      // @ts-ignore fitBounds options
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, duration: 800, essential: true });
    } catch {}
  }, [displayRoute?.geometry, mapRef]);

  // Preview simulation when GPS is unavailable or user chose Preview (non-transit only)
  useEffect(() => {
    if (mode === 'transit') return;
    if (!activeMapboxRoute?.geometry || !mapRef.current) return;
    const nav = useNavigationStore.getState();
    if (!nav.isPreview) return;
    const coords = (activeMapboxRoute.geometry as any).coordinates as [number, number][];
    if (!coords || coords.length < 2) return;
    let i = 0;
    const map = mapRef.current.getMap();
    const tick = () => {
      if (!useNavigationStore.getState().isPreview) return; // stop if preview ended
      i = Math.min(i + 1, coords.length - 1);
      const here = coords[i];
      map.easeTo({ center: here as any, duration: 450, pitch: Math.max(map.getPitch(), 45) });
      // Update next maneuver text roughly
      try {
        const steps = activeMapboxRoute.legs.flatMap(l => l.steps);
        let nextText: string | null = null;
        const nearest = getNearestIndexOnLine(coords, here as any).index;
        for (const step of steps) {
          const m = step.maneuver?.location as [number, number];
          if (!m) continue;
          const stepIdx = getNearestIndexOnLine(coords, m).index;
          if (stepIdx >= nearest) { nextText = step.maneuver?.instruction; break; }
        }
        useNavigationStore.getState().setNextManeuverText(nextText);
      } catch {}
      if (i >= coords.length - 1) {
        useNavigationStore.getState().stopNavigation();
      }
    };
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [activeMapboxRoute, mode, mapRef]);

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
      onClick={onMapClick}
    >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        {/* Removed inline 3D/Terrain controls, moved to sidebar style pane */}
        {/* Native GeolocateControl provides better location handling */}
        <GeolocateControl
          ref={geolocateRef}
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

        {/* Manual directions route line for all modes (hidden in transit to use per-leg styling) */}
        {directionsRouteLine && mode !== 'transit' && (
          <Source id="directions-source" type="geojson" data={directionsRouteLine} key="directions-source">
            <Layer {...directionsLayer} />
          </Source>
        )}
        {/* OTP per-leg styling */}
        {mode === 'transit' && otpTransitLegs.length > 0 && (
          <Source id="otp-transit-legs-source" type="geojson" data={{ type: 'FeatureCollection', features: otpTransitLegs }}>
            <Layer {...otpTransitLayer} />
          </Source>
        )}
        {mode === 'transit' && otpWalkLegs.length > 0 && (
          <Source id="otp-walk-legs-source" type="geojson" data={{ type: 'FeatureCollection', features: otpWalkLegs }}>
            <Layer {...otpWalkLayer} />
          </Source>
        )}
        {/* Alternatives (faint) for non-transit */}
        {directionsAlternatives.length > 0 && (
          <Source id="directions-alts-source" type="geojson" data={{ type: 'FeatureCollection', features: directionsAlternatives }}>
            <Layer {...directionsAltLayer} />
          </Source>
        )}
        {/* OBA Route Line */}
        {obaRouteId && (
          <Source id="oba-route-source" type="geojson" data={{ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: obaRouteSegments } }] }}>
            <Layer {...obaRouteLayer} />
          </Source>
        )}

        {/* OBA stops as a performant layer */}
        {stopsGeojson.features.length > 0 && (
          <Source id="oba-stops-source" type="geojson" data={stopsGeojson}>
            <Layer {...stopsLayer} />
          </Source>
        )}

        {/* POI markers removed - using Mapbox right-click pinning instead */}

      {vehicleMarkers}

      {turnMarkers}

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

        {/* Navigation overlay */}
        {isNavActive && nextManeuverText && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-3 py-1.5 rounded shadow">
            {nextManeuverText}
          </div>
        )}

      </Core>
    </>
  );
}