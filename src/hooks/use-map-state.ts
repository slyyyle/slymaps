import { useState, useEffect, useCallback, useRef } from 'react';
import type { ViewState, MapRef } from 'react-map-gl';
import type { MapStyle, Coordinates } from '@/types';
import { INITIAL_VIEW_STATE, MAP_STYLES } from '@/lib/constants';
import { getTimeBasedLightingPreset } from '@/lib/time-utils';
import { log } from '@/lib/logging';

export function useMapState() {
  const mapRef = useRef<MapRef | null>(null);
  const [viewState, setViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>(MAP_STYLES[0]);
  const [currentLightPreset, setCurrentLightPreset] = useState<'day' | 'dusk' | 'dawn' | 'night'>('day');
  const [isAutoLighting, setIsAutoLighting] = useState<boolean>(true);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);

  // Initialize user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Don't show toast error for geolocation, as it's expected if user denies permission
        }
      );
    }
  }, []);

  // Initialize with current time-based lighting (only if auto lighting is enabled)
  useEffect(() => {
    if (!isAutoLighting) {
      log.ui('Auto lighting disabled - keeping current preset');
      return;
    }
    
    const now = new Date();
    const hour = now.getHours();
    
    let lightPreset: 'day' | 'dusk' | 'dawn' | 'night';
    if (hour >= 6 && hour < 8) {
      lightPreset = 'dawn';
    } else if (hour >= 8 && hour < 18) {
      lightPreset = 'day';
    } else if (hour >= 18 && hour < 20) {
      lightPreset = 'dusk';
    } else {
      lightPreset = 'night';
    }
    
    log.time(`Auto lighting enabled - setting time-based preset: ${lightPreset}`);
    setCurrentLightPreset(lightPreset);
  }, [isAutoLighting]);

  const handleFlyTo = useCallback((coords: Coordinates, zoom: number = 15) => {
    setViewState(prev => ({
      ...prev,
      longitude: coords.longitude,
      latitude: coords.latitude,
      zoom,
      transitionDuration: 1500,
    }));
  }, []);

  // Function to manually change lighting
  const handleChangeLightPreset = useCallback((preset: 'day' | 'dusk' | 'dawn' | 'night') => {
    if (!mapRef.current) return;
    
    try {
      const map = mapRef.current.getMap();
      const isStandardStyle = currentMapStyle.url.includes('mapbox://styles/mapbox/standard');
      
      if (isStandardStyle) {
        map.setConfigProperty('basemap', 'lightPreset', preset);
        setCurrentLightPreset(preset);
        log.lighting3d(`Lighting manually changed to: ${preset}`);
      }
    } catch (error) {
      log.warning('Failed to change lighting preset:', error);
    }
  }, [currentMapStyle.url]);

  // Function to toggle auto lighting
  const handleToggleAutoLighting = useCallback((auto: boolean) => {
    log.control(`Setting auto lighting to: ${auto}`);
    setIsAutoLighting(auto);
    
    if (auto) {
      // When switching to auto, immediately update to current time-based lighting
      const lightPreset = getTimeBasedLightingPreset();
      
      if (mapRef.current) {
        try {
          const map = mapRef.current.getMap();
          const isStandardStyle = currentMapStyle.url.includes('mapbox://styles/mapbox/standard');
          
          if (isStandardStyle) {
            map.setConfigProperty('basemap', 'lightPreset', lightPreset);
            setCurrentLightPreset(lightPreset);
            console.log(`🕐 Auto lighting enabled - updated to: ${lightPreset}`);
          }
        } catch (error) {
          console.warn('Failed to update lighting when enabling auto:', error);
        }
      }
    } else {
      console.log('🎨 Manual lighting control enabled');
    }
  }, [currentMapStyle.url]);

  return {
    // State
    mapRef,
    viewState,
    currentMapStyle,
    currentLightPreset,
    isAutoLighting,
    currentLocation,
    
    // Actions
    setViewState,
    setCurrentMapStyle,
    handleFlyTo,
    handleChangeLightPreset,
    handleToggleAutoLighting,
  };
} 