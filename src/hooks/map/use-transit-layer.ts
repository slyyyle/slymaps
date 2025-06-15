import { useEffect, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Feature } from 'geojson';

interface UseTransitLayerOptions {
  color?: string;
  width?: number;
  opacity?: number;
}

export function useTransitLayer(
  mapRef: MapRef | null,
  geometry: Feature<GeoJSON.LineString> | null,
  options: UseTransitLayerOptions = {}
) {
  const { color = '#007cbf', width = 4, opacity = 1 } = options;

  const cleanupLayers = useCallback((map: any) => {
    if (map.getLayer('transit-route-layer')) {
      map.removeLayer('transit-route-layer');
    }
    if (map.getSource('transit-route')) {
      map.removeSource('transit-route');
    }
    if (map.getLayer('transit-route-outline')) {
      map.removeLayer('transit-route-outline');
    }
  }, []);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    const addLayers = () => {
      // Remove existing
      cleanupLayers(map);

      if (!geometry) return;

      // Add source
      map.addSource('transit-route', {
        type: 'geojson',
        data: geometry,
        lineMetrics: true
      });

      // Main route line
      map.addLayer({
        id: 'transit-route-layer',
        type: 'line',
        source: 'transit-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': color,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, width * 0.5, 15, width, 18, width * 1.5],
          'line-opacity': opacity
        }
      });

      // Outline for visibility
      map.addLayer(
        {
          id: 'transit-route-outline',
          type: 'line',
          source: 'transit-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, width * 0.5 + 2, 15, width + 2, 18, width * 1.5 + 2],
            'line-opacity': 0.6
          }
        },
        'transit-route-layer'
      );
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.on('styledata', addLayers);
    }

    return () => {
      cleanupLayers(map);
      map.off('styledata', addLayers);
    };
  }, [mapRef, geometry, color, width, opacity, cleanupLayers]);
} 