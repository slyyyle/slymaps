import { useEffect, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { PointOfInterest, Coordinates } from '@/types/core';

/**
 * Centralized POI Interaction Manager
 * 
 * Segregates different types of POI interactions to prevent lifecycle conflicts:
 * 1. Native Mapbox POIs (ephemeral) - handled via addInteraction API
 * 2. Stored POIs (persistent) - handled via React markers  
 * 3. Search Results (temporary) - handled via React markers
 * 4. User-created POIs (persistent) - handled via React markers
 */

export type POIInteractionType = 'native' | 'stored' | 'search' | 'created';

export interface POIInteractionEvent {
  type: POIInteractionType;
  poi: PointOfInterest;
  coordinates: Coordinates;
  source: 'click' | 'hover' | 'context';
}

interface POIInteractionManagerProps {
  map: MapRef | null;
  onPOIInteraction: (event: POIInteractionEvent) => void;
  enabledTypes?: POIInteractionType[];
}

export function usePOIInteractionManager({
  map,
  onPOIInteraction,
  enabledTypes = ['native', 'stored', 'search', 'created']
}: POIInteractionManagerProps) {
  // 🔧 CORE FIX: Use refs for stable references
  const onPOIInteractionRef = useRef(onPOIInteraction);
  const enabledTypesRef = useRef(enabledTypes);
  const interactionSetupRef = useRef(false);
  const mapRef = useRef<MapRef | null>(null);

  // Keep refs current without causing re-renders
  useEffect(() => {
    onPOIInteractionRef.current = onPOIInteraction;
  });

  useEffect(() => {
    enabledTypesRef.current = enabledTypes;
  });

  // 🔧 CORE FIX: Setup native interactions once, not on every render
  const setupNativeInteractions = useCallback(() => {
    if (!mapRef.current || interactionSetupRef.current) return;
    
    const mapInstance = mapRef.current.getMap();
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    // Remove existing interaction if it exists
    try {
      mapInstance.removeInteraction('poi-interaction-native');
    } catch (e) {
      // Interaction doesn't exist yet, that's fine
    }

    mapInstance.addInteraction('poi-interaction-native', {
      type: 'click',
      target: { featuresetId: 'poi', importId: 'basemap' },
      handler: ({ feature }: { feature: { id: string; properties: Record<string, unknown>; geometry: { coordinates: [number, number] } } }) => {
        const ephemeralPoi: PointOfInterest = {
          id: `native-ephemeral-${feature.id}-${Date.now()}`,
          name: (feature.properties.name as string) || 'Native POI',
          type: mapNativeFeatureType(feature.properties),
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
          description: '',
          isNativePoi: true,
          properties: feature.properties
        };

        const event: POIInteractionEvent = {
          type: 'native',
          poi: ephemeralPoi,
          coordinates: {
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0]
          },
          source: 'click'
        };

        onPOIInteractionRef.current(event);
      }
    });

    interactionSetupRef.current = true;
    console.log('✅ Native POI interactions enabled');
  }, []); // 🔧 CORE FIX: Empty dependencies = stable forever

  // 🔧 CORE FIX: Stable handlers that don't recreate
  const handleStoredPOIClick = useCallback((poi: PointOfInterest) => {
    const event: POIInteractionEvent = {
      type: 'stored',
      poi,
      coordinates: { latitude: poi.latitude, longitude: poi.longitude },
      source: 'click'
    };
    onPOIInteractionRef.current(event);
  }, []); // No dependencies = stable forever

  const handleSearchResultClick = useCallback((poi: PointOfInterest) => {
    const event: POIInteractionEvent = {
      type: 'search',
      poi,
      coordinates: { latitude: poi.latitude, longitude: poi.longitude },
      source: 'click'
    };
    onPOIInteractionRef.current(event);
  }, []);

  const handleCreatedPOIClick = useCallback((poi: PointOfInterest) => {
    const event: POIInteractionEvent = {
      type: 'created',
      poi,
      coordinates: { latitude: poi.latitude, longitude: poi.longitude },
      source: 'click'
    };
    onPOIInteractionRef.current(event);
  }, []);

  // Setup interactions when map is ready
  useEffect(() => {
    mapRef.current = map;
    
    if (!map) {
      interactionSetupRef.current = false;
      return;
    }

    const mapInstance = map.getMap();
    if (!mapInstance) return;

    const handleStyleLoad = () => {
      setupNativeInteractions();
    };

    if (mapInstance.isStyleLoaded()) {
      handleStyleLoad();
    } else {
      mapInstance.once('style.load', handleStyleLoad);
    }
  }, [map, setupNativeInteractions]); // 🔧 CORE FIX: Only depends on map reference

  return {
    handleStoredPOIClick,
    handleSearchResultClick,
    handleCreatedPOIClick,
    isNativeInteractionActive: interactionSetupRef.current
  };
}

// Helper function to map native feature properties to POI type
function mapNativeFeatureType(props: Record<string, unknown>): string {
  if (props.group === 'transit') {
    if (props.transit_mode === 'tram') return 'Tram Station';
    if (props.transit_mode === 'bus') return 'Bus Stop';
    if (props.transit_mode === 'rail') return 'Rail Station';
    return 'Transit Stop';
  }
  
  if (props.class && typeof props.class === 'string') {
    return props.class.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
  
  return 'Place';
} 