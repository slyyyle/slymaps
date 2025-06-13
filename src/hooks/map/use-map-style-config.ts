import { useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

interface UseMapStyleConfigProps {
  mapRef: React.RefObject<MapRef>;
  mapStyleUrl: string;
}

export function useMapStyleConfig({
  mapRef,
  mapStyleUrl,
}: UseMapStyleConfigProps) {
  const isStandardStyle = useCallback((styleUrl: string): boolean => {
    return styleUrl.includes('mapbox://styles/mapbox/standard');
  }, []);

  const isSatelliteStyle = useCallback((styleUrl: string): boolean => {
    return styleUrl.includes('satellite');
  }, []);

  const initializeMapConfig = useCallback((map: mapboxgl.Map) => {
    if (!isStandardStyle(mapStyleUrl)) return;
    // Only set 3D and theme, not lighting
    const configureOnStyleLoad = () => {
      if (!map.isStyleLoaded()) return;
      try {
        map.setConfigProperty('basemap', 'show3dObjects', true);
        map.setConfigProperty('basemap', 'theme', 'default');
        console.log(`✅ Map initialized with 3D: enabled, theme: default`);
      } catch (error) {
        console.error('❌ Failed to initialize map configuration:', error);
      }
    };
    if (map.isStyleLoaded()) {
      configureOnStyleLoad();
    } else {
      map.once('style.load', configureOnStyleLoad);
    }
  }, [mapStyleUrl, isStandardStyle]);

  const toggle3D = useCallback((enabled: boolean) => {
    if (!mapRef.current || !isStandardStyle(mapStyleUrl)) return;
    try {
      const map = mapRef.current.getMap();
      map.setConfigProperty('basemap', 'show3dObjects', enabled);
      console.log(`🏢 3D objects ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.warn('Failed to toggle 3D objects:', error);
    }
  }, [mapRef, mapStyleUrl, isStandardStyle]);

  const toggleTerrain = useCallback((enabled: boolean, exaggeration: number = 1.2) => {
    if (!mapRef.current || !isStandardStyle(mapStyleUrl)) return;
    try {
      const map = mapRef.current.getMap();
      if (enabled) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });
        map.setTerrain({ 
          source: 'mapbox-dem', 
          exaggeration: exaggeration 
        });
        console.log(`🏔️ 3D terrain enabled with ${exaggeration}x exaggeration (DEM v1)`);
      } else {
        map.setTerrain(null);
        if (map.getSource('mapbox-dem')) {
          map.removeSource('mapbox-dem');
        }
        console.log(`🏔️ 3D terrain disabled`);
      }
    } catch (error) {
      console.warn('Failed to toggle terrain:', error);
    }
  }, [mapRef, mapStyleUrl, isStandardStyle]);

  const setTerrainExaggeration = useCallback((exaggeration: number) => {
    if (!mapRef.current || !isStandardStyle(mapStyleUrl)) return;
    try {
      const map = mapRef.current.getMap();
      if (map.getTerrain()) {
        map.setTerrain({ 
          source: 'mapbox-dem', 
          exaggeration: exaggeration 
        });
        console.log(`🏔️ Terrain exaggeration set to: ${exaggeration}x`);
      }
    } catch (error) {
      console.warn('Failed to set terrain exaggeration:', error);
    }
  }, [mapRef, mapStyleUrl, isStandardStyle]);

  return {
    isStandardStyle: isStandardStyle(mapStyleUrl),
    isSatelliteStyle: isSatelliteStyle(mapStyleUrl),
    initializeMapConfig,
    toggle3D,
    toggleTerrain,
    setTerrainExaggeration
  };
} 