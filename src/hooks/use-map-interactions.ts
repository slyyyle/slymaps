import { useCallback, useRef } from 'react';
import type { MapRef } from 'react-map-gl';
import type { PointOfInterest } from '@/types';

interface MapboxPOI {
  id: string;
  name: string;
  category: string;
  subclass?: string;
  longitude: number;
  latitude: number;
  properties: Record<string, unknown>;
}

interface UseMapInteractionsProps {
  mapRef: React.RefObject<MapRef>;
  onSelectPoi: (poi: PointOfInterest | null) => void;
  onFlyTo: (coords: { latitude: number; longitude: number }, zoom?: number) => void;
  mapStyleUrl: string;
}

export function useMapInteractions({
  mapRef,
  onSelectPoi,
  onFlyTo,
  mapStyleUrl
}: UseMapInteractionsProps) {
  const selectedBuildingRef = useRef<{ source: string; sourceLayer: string; id: string | number } | null>(null);

  const isStandardStyle = useCallback((styleUrl: string): boolean => {
    return styleUrl.includes('mapbox://styles/mapbox/standard');
  }, []);

  const clearSelectedBuilding = useCallback(() => {
    if (!selectedBuildingRef.current || !mapRef.current) return;

    try {
      const map = mapRef.current.getMap();
      map.setFeatureState(selectedBuildingRef.current, { select: false });
    } catch (error) {
      console.log('Could not clear building feature state:', error);
    }
    selectedBuildingRef.current = null;
  }, [mapRef]);

  const handlePoiClick = useCallback((poi: PointOfInterest) => {
    onSelectPoi(poi);
    clearSelectedBuilding();
  }, [onSelectPoi, clearSelectedBuilding]);

  const handleMapClick = useCallback(() => {
    onSelectPoi(null);
    clearSelectedBuilding();
  }, [onSelectPoi, clearSelectedBuilding]);

  const handleDirectionsToPoi = useCallback((lat: number, lng: number) => {
    console.log(`🗺️ Directions requested to: ${lat}, ${lng}`);
    onFlyTo({ latitude: lat, longitude: lng }, 16);
  }, [onFlyTo]);

  const setupMapboxInteractions = useCallback((map: mapboxgl.Map) => {
    if (!isStandardStyle(mapStyleUrl)) return;

    console.log('🔧 Setting up Mapbox POI click interactions for Standard style...');

    try {
      // POI interaction setup for standard style
      map.on('click', 'poi-label', (e: mapboxgl.MapMouseEvent) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const { name, class: category, subclass } = feature.properties || {};
          const coordinates = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : [0, 0];
          const [longitude, latitude] = coordinates;

          const mapboxPoi: MapboxPOI = {
            id: `mapbox-poi-${longitude}-${latitude}`,
            name: name || 'Unknown Location',
            category: category || 'poi',
            subclass,
            longitude,
            latitude,
            properties: feature.properties || {},
          };

          console.log('🎯 Mapbox POI clicked:', mapboxPoi);
          // You can handle this as needed - perhaps convert to your POI type
        }
      });

      // Building interactions for 3D models
      map.on('click', 'building-extrusion', (e: mapboxgl.MapMouseEvent) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          clearSelectedBuilding();
          
          const buildingFeature = { 
            source: feature.source || '', 
            sourceLayer: feature.sourceLayer || '', 
            id: feature.id || 0 
          };
          selectedBuildingRef.current = buildingFeature;
          map.setFeatureState(buildingFeature, { select: true });
          
          console.log('🏢 Building selected:', feature.properties);
        }
      });

      // Change cursor on POI hover
      map.on('mouseenter', 'poi-label', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'poi-label', () => {
        map.getCanvas().style.cursor = '';
      });

      // Change cursor on building hover
      map.on('mouseenter', 'building-extrusion', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'building-extrusion', () => {
        map.getCanvas().style.cursor = '';
      });

    } catch (error) {
      console.warn('Failed to set up POI interactions:', error);
    }
  }, [mapStyleUrl, isStandardStyle, clearSelectedBuilding]);

  return {
    handlePoiClick,
    handleMapClick,
    handleDirectionsToPoi,
    setupMapboxInteractions,
    clearSelectedBuilding,
    isStandardStyle: isStandardStyle(mapStyleUrl),
    selectedBuildingRef
  };
} 