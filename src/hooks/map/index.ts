// src/hooks/map/index.ts
// Barrel file: re-export map-focused hooks with consistent naming
export { useOSMHandler as useMapOSMHandler } from './use-osm-handler';
export { useUnifiedPOIHandler as useMapPOIHandler } from './use-unified-poi-handler';
export { usePOIInteractionManager as useMapPOIInteractionManager } from './use-poi-interaction-manager';
export { useEnhancedMapInteractions as useMapEnhancedInteractions } from './use-enhanced-map-interactions';
export { useMapViewport } from './use-map-navigation';
export { useMapStyleConfig } from './use-map-style-config';
export { useMapStyling } from './use-map-styling';
export { useRouteHandler as useMapRouteHandler } from './use-route-handler';
export { useTransitLayer as useMapTransitLayer } from './use-transit-layer';
export { useMapTurnMarkers } from './use-turn-markers'; 