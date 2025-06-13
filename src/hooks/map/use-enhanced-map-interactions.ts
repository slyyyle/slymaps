import { useCallback, useEffect, useRef } from 'react';
import { useDestinationSetting } from '../navigation/use-destination-setting';
import { useLocationState } from '../data/use-location-state';
import type { Coordinates, PointOfInterest } from '@/types/core';
import type { MapMouseEvent } from 'mapbox-gl';
import type { MapRef } from 'react-map-gl/maplibre';

export function useEnhancedMapInteractions(mapRef?: MapRef | null) {
  const destinationSetting = useDestinationSetting();
  const { poiCreationHandler } = useLocationState();
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  
  // Stable refs to avoid re-render loops
  const destinationSettingRef = useRef(destinationSetting);
  const poiCreationHandlerRef = useRef(poiCreationHandler);
  
  // Keep refs up to date without triggering effects
  useEffect(() => {
    destinationSettingRef.current = destinationSetting;
  }, [destinationSetting]);
  
  useEffect(() => {
    poiCreationHandlerRef.current = poiCreationHandler;
  }, [poiCreationHandler]);

  /**
   * Modern map click handler following 2025 interaction patterns
   * Priority order:
   * 1. POI Creation (if active)
   * 2. Destination Setting (if in setting mode)
   * 3. Clear selections (fallback)
   */
  const handleMapClick = useCallback((event: MapMouseEvent) => {
    // Ensure we have coordinates
    if (!event.lngLat) {
      console.warn('Map click event missing lngLat coordinates');
      return;
    }

    const coords: Coordinates = {
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng
    };

    console.log('🗺️ Map clicked:', coords);

    // Priority 1: POI Creation mode (highest priority)
    const currentPoiHandler = poiCreationHandlerRef.current;
    if (currentPoiHandler) {
      console.log('📍 POI creation mode - creating POI at clicked location');
      currentPoiHandler(coords);
      return;
    }

    // Priority 2: Destination setting mode
    const currentDestinationSetting = destinationSettingRef.current;
    if (currentDestinationSetting.isSettingDestination) {
      console.log('🎯 Destination setting mode - setting temporary destination');
      const handled = currentDestinationSetting.handleMapClick(coords);
      if (handled) return;
    }

    // Priority 3: Clear any active selections (fallback)
    console.log('🧹 Fallback: clearing active selections');
    
    // Close any native Mapbox popups
    const existingPopups = document.querySelectorAll('.mapboxgl-popup');
    if (existingPopups.length > 0) {
      existingPopups.forEach(popup => popup.remove());
    }

    // Could add other cleanup actions here
  }, []); // No dependencies to avoid loops

  /**
   * Enhanced context menu handler (right-click)
   * Provides quick actions based on context
   */
  const handleMapRightClick = useCallback((event: MapMouseEvent) => {
    if (!event.lngLat) return;
    
    const coords: Coordinates = {
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng
    };

    console.log('🖱️ Right-click detected:', coords);
    
    // For now, quick-set as destination
    // In the future, could show a context menu with options
    const currentDestinationSetting = destinationSettingRef.current;
    currentDestinationSetting.setDestinationDirect(coords);
  }, []); // No dependencies to avoid loops

  /**
   * Handle POI clicks with enhanced feedback
   */
  const handlePoiClick = useCallback((poi: PointOfInterest) => {
    console.log('📍 POI clicked:', poi.name);
    
    // Could add enhanced POI interaction logic here
    // For now, just use existing POI handling
  }, []);

  // Add click listener when in special modes (POI creation or destination setting)
  useEffect(() => {
    if (!mapRef) return;
    
    const mapInstance = mapRef.getMap();
    if (!mapInstance) return;
    
    mapInstanceRef.current = mapInstance;
    
    // Only add click listener when in special interaction modes
    const needsClickHandler = !!poiCreationHandler || destinationSetting.isSettingDestination;
    
    if (needsClickHandler) {
      console.log('🖱️ Adding enhanced click handler for special modes');
      
      const handleMapClickEvent = (e: mapboxgl.MapMouseEvent) => {
        console.log('🗺️ Enhanced map click in special mode:', {
          poiCreation: !!poiCreationHandlerRef.current,
          destinationSetting: destinationSettingRef.current.isSettingDestination,
          coords: [e.lngLat.lng, e.lngLat.lat]
        });
        
        handleMapClick(e);
      };
      
      mapInstance.on('click', handleMapClickEvent);
      
      return () => {
        console.log('🧹 Removing enhanced click handler');
        mapInstance.off('click', handleMapClickEvent);
      };
    }
  }, [mapRef, poiCreationHandler, destinationSetting.isSettingDestination, handleMapClick]);

  return {
    // Main handlers
    handleMapClick,
    handleMapRightClick,
    handlePoiClick,
    
    // Destination setting state and actions
    destinationSetting,
    
    // Convenience getters for UI state
    showDestinationCursor: destinationSetting.isSettingMode,
    showPoiCreationCursor: !!poiCreationHandler,
    mapCursorStyle: destinationSetting.isSettingMode 
      ? 'crosshair' 
      : !!poiCreationHandler 
        ? 'copy' 
        : 'default',
  };
} 