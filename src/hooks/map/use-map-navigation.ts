import { useState, useCallback, useRef } from 'react';
import type { ViewState, MapRef } from 'react-map-gl/mapbox';
import type { Coordinates } from '@/types/core';
import { INITIAL_VIEW_STATE } from '@/lib/constants';

export interface MapViewportState {
  mapRef: React.RefObject<MapRef>;
  viewState: Partial<ViewState>;
}

export interface FlyToOptions {
  /** Zoom level (default: 15) */
  zoom?: number;
  /** Animation duration in milliseconds (default: 2000) */
  duration?: number;
  /** Animation speed (default: 1.2) */
  speed?: number;
  /** Animation curve (default: 1.42) */
  curve?: number;
  /** Easing function (default: smooth ease-out) */
  easing?: (t: number) => number;
  /** Whether animation is essential for accessibility (default: true) */
  essential?: boolean;
}

export interface MapViewportActions {
  setViewState: React.Dispatch<React.SetStateAction<Partial<ViewState>>>;
  /** 
   * Smoothly fly to coordinates. Uses mapboxgl instance if available, 
   * otherwise falls back to ViewState updates 
   */
  flyTo: (coords: Coordinates, options?: FlyToOptions) => void;
  /** Get the underlying Mapbox GL JS map instance */
  getMapInstance: () => mapboxgl.Map | null;
}

export function useMapViewport() {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<Partial<ViewState>>(INITIAL_VIEW_STATE);

  const getMapInstance = useCallback((): mapboxgl.Map | null => {
    return mapRef.current?.getMap() || null;
  }, []);

  const flyTo = useCallback((coords: Coordinates, options: FlyToOptions = {}) => {
    const {
      zoom = 15,
      duration = 2000,
      speed = 1.2,
      curve = 1.42,
      easing = (t: number) => t * (2 - t), // smooth ease-out
      essential = true
    } = options;

    const mapInstance = getMapInstance();

    if (mapInstance) {
      // Use native Mapbox GL JS flyTo for smooth animations
      mapInstance.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom,
        duration,
        speed,
        curve,
        easing,
        essential
      });
    } else {
      // Fallback to ViewState update (for cases where map isn't ready)
      setViewState(prev => ({
        ...prev,
        longitude: coords.longitude,
        latitude: coords.latitude,
        zoom,
        transitionDuration: duration,
        transitionInterpolator: undefined // Use default smooth transition
      }));
    }
  }, [getMapInstance]);

  const state: MapViewportState = {
    mapRef,
    viewState,
  };

  const actions: MapViewportActions = {
    setViewState,
    flyTo,
    getMapInstance,
  };

  return {
    ...state,
    ...actions,
  };
}

 