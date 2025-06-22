import { useEffect, useCallback, useMemo } from 'react';
import { useFetchRouteDetails } from '@/hooks/data/use-transit-queries';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Feature } from 'geojson';

interface UseTransitLayerOptions {
  color?: string;
  width?: number;
  opacity?: number;
  disableOutline?: boolean;
}

export function useTransitLayer(
  mapRef: MapRef | null,
  routeId: string | null,
  branchIndex: number = 0,
  options: UseTransitLayerOptions = {}
) {
  const { color = '#FF1493', width = 4, opacity = 1 } = options;
  const disableOutline = Boolean(options.disableOutline);

  // Fetch route details (including branch segments) via React-Query
  const { data, status } = useFetchRouteDetails(routeId || '');
  
  // Connect all segments for the chosen branch into a FeatureCollection
  // Memoize to prevent unnecessary re-renders
  const routeGeometry = useMemo(() => {
    if (!routeId || status !== 'success' || !data?.branches?.[branchIndex]?.segments) {
      return null;
    }
    const segments = data.branches[branchIndex].segments;
    return {
      type: 'FeatureCollection' as const,
      features: segments
    };
  }, [routeId, status, data?.branches, branchIndex]);

  // Create unique layer IDs based on route and branch to prevent conflicts
  const layerIds = useMemo(() => ({
    source: `transit-route-${routeId}-${branchIndex}`,
    layer: `transit-route-layer-${routeId}-${branchIndex}`,
    outline: `transit-route-outline-${routeId}-${branchIndex}`
  }), [routeId, branchIndex]);

  const cleanupLayers = useCallback((map: any) => {
    try {
      // Remove layers in reverse order (outline first, then main layer)
      if (map.getLayer(layerIds.outline)) {
        map.removeLayer(layerIds.outline);
      }
      if (map.getLayer(layerIds.layer)) {
        map.removeLayer(layerIds.layer);
      }
      if (map.getSource(layerIds.source)) {
        map.removeSource(layerIds.source);
      }
    } catch (error) {
      // Ignore cleanup errors - layers might already be removed
    }
  }, [layerIds]);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const addLayers = () => {
      try {
        cleanupLayers(map);
        if (!routeGeometry || !routeGeometry.features.length) {
          return;
        }

        // Add source
        map.addSource(layerIds.source, {
          type: 'geojson',
          data: routeGeometry,
          lineMetrics: true
        });

        // Add main route layer
        map.addLayer({
          id: layerIds.layer,
          type: 'line',
          source: layerIds.source,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': color,
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, width * 0.5, 15, width, 18, width * 1.5],
            'line-opacity': opacity,
            'line-emissive-strength': 1
          }
        });

        // Optionally add outline layer below main layer
        if (!disableOutline) {
          map.addLayer(
            {
              id: layerIds.outline,
              type: 'line',
              source: layerIds.source,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#ffffff',
                'line-width': ['interpolate', ['linear'], ['zoom'], 10, width * 0.5 + 2, 15, width + 2, 18, width * 1.5 + 2],
                'line-opacity': 0.6,
                'line-emissive-strength': 1
              }
            },
            layerIds.layer // Insert before main layer so outline is below
          );
        }
      } catch (error) {
        console.error('Error adding transit route layers:', error);
        // Try to cleanup on error
        cleanupLayers(map);
      }
    };

    // Add layers when style is loaded
    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      // Wait for style to load
      map.once('styledata', addLayers);
    }

    return () => {
      cleanupLayers(map);
      // Remove any pending style listeners
      map.off('styledata', addLayers);
    };
  }, [mapRef, routeGeometry, color, width, opacity, cleanupLayers, layerIds, disableOutline]);
} 