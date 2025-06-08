import { useEffect } from 'react';
import type { MapRef } from 'react-map-gl';

/**
 * Custom hook to handle Mapbox attribution and logo removal
 * This provides a more reliable way to remove attribution than DOM manipulation
 */
export function useMapboxAttribution(mapRef: React.RefObject<MapRef>) {
  useEffect(() => {
    const removeAttributionElements = () => {
      if (!mapRef.current) return;

      const map = mapRef.current.getMap();
      const container = map.getContainer();
      
      // Remove attribution controls
      const attributions = container.querySelectorAll('.mapboxgl-ctrl-attrib, .mapboxgl-ctrl-attribution');
      attributions.forEach(attr => {
        (attr as HTMLElement).style.display = 'none';
        attr.remove();
      });
      
      // Hide Mapbox logo
      const logos = container.querySelectorAll('.mapboxgl-ctrl-logo');
      logos.forEach(logo => {
        (logo as HTMLElement).style.display = 'none';
      });
      
      // Additional CSS-based hiding as fallback
      const style = document.createElement('style');
      style.textContent = `
        .mapboxgl-ctrl-attrib,
        .mapboxgl-ctrl-attribution,
        .mapboxgl-ctrl-logo {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      if (!document.head.querySelector('style[data-mapbox-attribution-hide]')) {
        style.setAttribute('data-mapbox-attribution-hide', 'true');
        document.head.appendChild(style);
      }
    };

    // Remove immediately if map is already loaded
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map.isStyleLoaded()) {
        removeAttributionElements();
      } else {
        map.once('load', removeAttributionElements);
      }
    }

    // Periodic cleanup in case elements are re-added
    const cleanup = setInterval(removeAttributionElements, 1000);

    return () => {
      clearInterval(cleanup);
    };
  }, [mapRef]);
} 