import { useCallback, useEffect } from 'react';
import type { MapRef } from 'react-map-gl';
import { getTimeBasedLightingPreset } from '@/lib/time-utils';

interface UseMapStyleConfigProps {
  mapRef: React.RefObject<MapRef>;
  mapStyleUrl: string;
  isAutoLighting?: boolean;
  currentLightPreset?: 'day' | 'dusk' | 'dawn' | 'night';
  onChangeLightPreset?: (preset: 'day' | 'dusk' | 'dawn' | 'night') => void;
}

export function useMapStyleConfig({
  mapRef,
  mapStyleUrl,
  isAutoLighting = true,
  currentLightPreset = 'day',
  onChangeLightPreset
}: UseMapStyleConfigProps) {
  
  const isStandardStyle = useCallback((styleUrl: string): boolean => {
    return styleUrl.includes('mapbox://styles/mapbox/standard');
  }, []);

  const isSatelliteStyle = useCallback((styleUrl: string): boolean => {
    return styleUrl.includes('satellite');
  }, []);

  const updateLightingBasedOnTime = useCallback((map: mapboxgl.Map) => {
    if (!isStandardStyle(mapStyleUrl) || !isAutoLighting) return;

    const lightPreset = getTimeBasedLightingPreset();

    if (lightPreset !== currentLightPreset && onChangeLightPreset) {
      try {
        map.setConfigProperty('basemap', 'lightPreset', lightPreset);
        onChangeLightPreset(lightPreset);
        console.log(`🌅 Lighting updated to: ${lightPreset}`);
      } catch (error) {
        console.warn('Failed to update lighting:', error);
      }
    }
  }, [mapStyleUrl, isAutoLighting, currentLightPreset, onChangeLightPreset, isStandardStyle]);

  const initializeMapConfig = useCallback((map: mapboxgl.Map) => {
    if (!isStandardStyle(mapStyleUrl)) return;

    try {
      // Set initial lighting
      const initialPreset = isAutoLighting ? getTimeBasedLightingPreset() : currentLightPreset;
      map.setConfigProperty('basemap', 'lightPreset', initialPreset);
      
      // Enable 3D objects by default for Standard style
      map.setConfigProperty('basemap', 'show3dObjects', true);
      
      // Use faded theme by default for better visibility
      map.setConfigProperty('basemap', 'theme', 'faded');
      
      console.log(`🎨 Map initialized with preset: ${initialPreset}, 3D: enabled, theme: faded`);
    } catch (error) {
      console.warn('Failed to initialize map configuration:', error);
    }
  }, [mapStyleUrl, isAutoLighting, currentLightPreset, isStandardStyle]);

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

  const toggleTheme = useCallback((useFaded: boolean) => {
    if (!mapRef.current || !isStandardStyle(mapStyleUrl)) return;
    
    try {
      const map = mapRef.current.getMap();
      const theme = useFaded ? 'faded' : 'default';
      map.setConfigProperty('basemap', 'theme', theme);
      console.log(`🎨 Theme switched to: ${theme}`);
    } catch (error) {
      console.warn('Failed to toggle theme:', error);
    }
  }, [mapRef, mapStyleUrl, isStandardStyle]);

  const setLightPreset = useCallback((preset: 'day' | 'dusk' | 'dawn' | 'night') => {
    if (!mapRef.current || !isStandardStyle(mapStyleUrl)) return;
    
    try {
      const map = mapRef.current.getMap();
      map.setConfigProperty('basemap', 'lightPreset', preset);
      console.log(`🌅 Light preset set to: ${preset}`);
    } catch (error) {
      console.warn('Failed to set light preset:', error);
    }
  }, [mapRef, mapStyleUrl, isStandardStyle]);

  // Auto-update lighting every minute when auto-lighting is enabled
  useEffect(() => {
    if (!isAutoLighting || !mapRef.current) return;

    const interval = setInterval(() => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        updateLightingBasedOnTime(map);
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isAutoLighting, updateLightingBasedOnTime, mapRef]);

  return {
    isStandardStyle: isStandardStyle(mapStyleUrl),
    isSatelliteStyle: isSatelliteStyle(mapStyleUrl),
    initializeMapConfig,
    updateLightingBasedOnTime,
    toggle3D,
    toggleTheme,
    setLightPreset
  };
} 