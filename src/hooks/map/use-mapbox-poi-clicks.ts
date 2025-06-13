import { useEffect, useState, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { useDataIntegration } from '../data/use-data-integration';
import type { PointOfInterest } from '@/types/core';

// Global window interface extensions for Mapbox integration
declare global {
  interface Window {
    setMapboxPoiDestination?: (lat: number, lng: number) => void;
    openSidebarPane?: (pane: 'directions' | 'transit' | 'places' | 'style') => void;
  }
}

interface MapInteractionsHookProps {
  map: MapRef | null;
  onSelectPoi: (poi: PointOfInterest | null) => void;
}

export function useMapInteractions({ map, onSelectPoi }: MapInteractionsHookProps) {
  const [interactions, setInteractions] = useState<string[]>([]);
  const { pois } = useDataIntegration();
  
  // Stable refs to avoid re-render loops
  const mapRef = useRef<MapRef | null>(null);
  const isSetupRef = useRef(false);
  const interactionIdsRef = useRef<string[]>([]);
  const onSelectPoiRef = useRef(onSelectPoi);
  
  // Keep onSelectPoi ref up to date without triggering effects
  useEffect(() => {
    onSelectPoiRef.current = onSelectPoi;
  }, [onSelectPoi]);

  // Stable cleanup function that doesn't depend on state
  const cleanupInteractions = useCallback(() => {
    const currentMap = mapRef.current;
    const currentInteractionIds = interactionIdsRef.current;
    
    if (!currentMap || currentInteractionIds.length === 0) {
      return;
    }
    
    console.log('🧹 Cleaning up map interactions', currentInteractionIds);
    
    currentInteractionIds.forEach(interactionId => {
      try {
        const mapInstance = currentMap.getMap();
        if (mapInstance && typeof mapInstance.removeInteraction === 'function') {
          mapInstance.removeInteraction(interactionId);
        }
      } catch (error) {
        // Interaction might already be removed, which is fine
        console.log(`⚠️ Could not remove interaction ${interactionId}:`, error);
      }
    });
    
    // Clear state and refs
    interactionIdsRef.current = [];
    setInteractions([]);
    isSetupRef.current = false;
  }, []); // No dependencies to avoid loops

  // Setup interactions function
  const setupInteractions = useCallback(() => {
    const currentMap = mapRef.current;
    if (!currentMap || isSetupRef.current) {
      return;
    }

    const mapInstance = currentMap.getMap();
    if (!mapInstance || !mapInstance.isStyleLoaded()) {
      return;
    }
    
    console.log('🚀 Setting up POI interactions');
    
    try {
      const interactionIds: string[] = [];
      const poiClickId = 'poi-click-interaction';
      
      // Remove existing interaction if it exists
      try {
        mapInstance.removeInteraction(poiClickId);
      } catch (error) {
        // No existing interaction, which is fine
      }
      
      // Add the interaction
      mapInstance.addInteraction(poiClickId, {
        type: 'click',
        target: { featuresetId: 'poi', importId: 'basemap' },
        handler: ({ feature }: { feature: { id: string; properties: Record<string, unknown>; geometry: { coordinates: [number, number] } } }) => {
          console.log('🎯 NATIVE POI CLICK DETECTED!', {
            name: feature.properties.name,
            category: feature.properties.class,
            coordinates: feature.geometry.coordinates
          });
          
          // Create ephemeral POI object for popup display only
          const ephemeralPoi: PointOfInterest = {
            id: `native-${feature.id}`,
            name: (feature.properties.name as string) || 'Unknown Place',
            type: getPoiType(feature.properties),
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
            description: '',
            isSearchResult: false,
            isNativePoi: true,
            properties: {
              ...feature.properties,
              source: 'mapbox-native'
            }
          };

          onSelectPoiRef.current(ephemeralPoi);
        }
      });
      
      interactionIds.push(poiClickId);
      console.log(`✅ Successfully added interaction: ${poiClickId}`);

      // Custom POI markers from store
      const customPois = pois.getAllPOIs().filter(poi => !poi.isNativePoi);
      console.log(`📍 ${customPois.length} custom POIs ready for interaction`);

      // Update refs and state
      interactionIdsRef.current = interactionIds;
      setInteractions(interactionIds);
      isSetupRef.current = true;
      console.log(`🎯 Successfully set up ${interactionIds.length} interactions`);
      
    } catch (error) {
      console.error('❌ Error during interaction setup:', error);
    }
  }, [pois]); // Only depend on pois data

  // Main effect: manage map reference and setup/cleanup lifecycle
  useEffect(() => {
    mapRef.current = map;
    
    if (!map) {
      cleanupInteractions();
      return;
    }

    const mapInstance = map.getMap();
    if (!mapInstance) return;

    // Setup interactions when style is loaded
    const handleStyleLoad = () => {
      // Small delay to ensure style is fully ready
      setTimeout(() => {
        setupInteractions();
      }, 100);
    };

    if (mapInstance.isStyleLoaded()) {
      handleStyleLoad();
    } else {
      mapInstance.once('style.load', handleStyleLoad);
    }

    // Cleanup on map change or unmount
    return () => {
      cleanupInteractions();
    };
  }, [map, setupInteractions, cleanupInteractions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupInteractions();
    };
  }, [cleanupInteractions]);

  return { interactions };
}

// Simple POI type mapping using only what Mapbox Standard v3 provides
function getPoiType(props: Record<string, unknown>): string {
  if (props.group === 'transit') {
    if (props.transit_mode === 'tram') return 'Tram';
    if (props.transit_mode === 'bus') return 'Bus';
    if (props.transit_mode === 'rail') return 'Rail';
    return 'Transit';
  }
  
  if (props.class && typeof props.class === 'string') {
    return props.class.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
  
  return 'Place';
} 