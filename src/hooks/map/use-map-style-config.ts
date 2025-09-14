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
        // Prefer dusk by default if caller wants it
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
    if (!mapRef.current) return;
    
    try {
      const map = mapRef.current.getMap();
      map.setConfigProperty('basemap', 'show3dObjects', enabled);
    } catch (error) {
      console.warn('Failed to toggle 3D objects:', error);
    }
  }, [mapRef]);

  const toggleTerrain = useCallback((enabled: boolean, exaggeration: number = 1.2) => {
    if (!mapRef.current) {
      return;
    }
    try {
      const map = mapRef.current.getMap();
      if (!map.isStyleLoaded()) {
        console.warn('Map style not loaded, skipping terrain toggle');
        return;
      }
      
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
        map.setTerrain({ 
          source: 'app-dem', 
          exaggeration: exaggeration 
        });

        // Dedicated DEM for hillshade to avoid resolution warning
        if (!map.getSource('app_hillshade_dem')) {
          map.addSource('app_hillshade_dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14
          });
        }
        if (!map.getLayer('app_hillshade')) {
          const firstSymbol = map.getStyle().layers?.find(l => l.type === 'symbol')?.id;
          const layerDef: any = {
            id: 'app_hillshade',
            type: 'hillshade',
            source: 'app_hillshade_dem',
            paint: { 'hillshade-exaggeration': 0.5 }
          };
          if (firstSymbol) map.addLayer(layerDef, firstSymbol); else map.addLayer(layerDef);
        }
      } else {
        map.setTerrain(null);
        if (map.getLayer('app_hillshade')) map.removeLayer('app_hillshade');
        if (map.getSource('app-dem')) map.removeSource('app-dem');
        if (map.getSource('app_hillshade_dem')) map.removeSource('app_hillshade_dem');
      }
    } catch (error) {
      console.warn('Failed to toggle terrain:', error);
    }
  }, [mapRef]);

  const setTerrainExaggeration = useCallback((exaggeration: number) => {
    if (!mapRef.current) {
      return;
    }
    
    try {
      const map = mapRef.current.getMap();
      if (!map.isStyleLoaded()) {
        console.warn('Map style not loaded, skipping terrain exaggeration');
        return;
      }
      
      const currentTerrain = map.getTerrain();
      if (currentTerrain) {
        map.setTerrain({ 
          source: 'app-dem', 
          exaggeration: exaggeration 
        });
      }
    } catch (error) {
      console.warn('Failed to set terrain exaggeration:', error);
    }
  }, [mapRef]);

  const setTerrainCutoff = useCallback((enabled: boolean) => {
    if (!mapRef.current) return;
    try {
      const map = mapRef.current.getMap();
      if (!map.isStyleLoaded()) return;
      // In v3 Standard, cutoff is controlled by a style config/property. If not present, this is a no-op.
      // There is no public setTerrainCutoff API; use basemap config proxy when available.
      // Many partners expose cutoff via a config key; guard with try/catch to avoid errors on older styles.
      try {
        map.setConfigProperty('basemap', 'terrainCutoff', enabled ? 'default' : 'none');
      } catch {}
    } catch (error) {
      console.warn('Failed to set terrain cutoff:', error);
    }
  }, [mapRef]);

  return {
    isStandardStyle: isStandardStyle(mapStyleUrl),
    isSatelliteStyle: isSatelliteStyle(mapStyleUrl),
    initializeMapConfig,
    toggle3D,
    toggleTerrain,
    setTerrainExaggeration,
    setTerrainCutoff
  };
} 