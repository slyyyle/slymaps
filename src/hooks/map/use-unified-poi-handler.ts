import { useCallback, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { usePOIInteractionManager, type POIInteractionEvent, type PlaceInteractionType } from './use-poi-interaction-manager';
import { usePlaceStore } from '@/stores/use-place-store';
import { useOSMHandler } from './use-osm-handler';
import { useRouteHandler } from './use-route-handler';
import { useOSMData } from '@/hooks/data/use-osm-data';
import { osmService } from '@/services/osm-service';
import type { Place } from '@/types/core';
import type { CreatedPlace } from '@/stores/use-place-store';

/**
 * Unified POI Handler
 * 
 * Coordinates between the POI interaction manager and segregated store
 * to provide a clean interface for map components. This prevents the
 * lifecycle conflicts that were happening before.
 */

interface UnifiedPOIHandlerProps {
  map: MapRef | null;
  enableNativeInteractions?: boolean;
  enableOSMEnrichment?: boolean;
  enableRouteIntegration?: boolean;
}

// All Mapbox transit modes to detect real transit stops
const MAPBOX_TRANSIT_MODES = new Set([
  'bus','tram','rail','light_rail','subway','metro','ferry','trolleybus','cable_car','monorail'
]);

export function useUnifiedPOIHandler({
  map,
  enableNativeInteractions = true,
  enableOSMEnrichment = true,
  enableRouteIntegration = true
}: UnifiedPOIHandlerProps) {
  const poiStore = usePlaceStore();
  const { findMatchingPOI, reverseGeocode: osmReverseGeocode } = useOSMData();
  const osmHandler = useOSMHandler({ enableAutoEnrichment: enableOSMEnrichment });
  const routeHandler = useRouteHandler({ enableVehicleTracking: enableRouteIntegration });

  // Deduplicate enrichment calls per POI id within session
  const enrichingIdsRef = useRef<Set<string>>(new Set());
  // Deduplicate by name+coords, survives POI id changes across re-selects
  const enrichingKeysRef = useRef<Set<string>>(new Set());

  // 🔧 CORE FIX: Single stable handler function with no dependencies
  const handlePOIInteraction = useCallback((interaction: POIInteractionEvent) => {
    // Handle different interaction types without console noise
    switch (interaction.type) {
      case 'native': {
        // If this native POI is already enriched, just select it
        if (interaction.poi.properties?.osm_enriched) {
          poiStore.selectPOI(interaction.poi, 'native');
          break;
        }
        // Guard enrichment when disabled
        if (!enableOSMEnrichment) {
          poiStore.selectPOI(interaction.poi, 'native');
          break;
        }
        // Deduplicate inflight enrichments by id
        const enrichKey = interaction.poi.id;
        if (!enrichKey || enrichingIdsRef.current.has(enrichKey)) {
          poiStore.selectPOI(interaction.poi, 'native');
          break;
        }
        // Also dedupe by name+coords so re-renders or re-selections don't refetch
        const nameKey = `${interaction.poi.name}|${interaction.poi.latitude.toFixed(5)}|${interaction.poi.longitude.toFixed(5)}`;
        if (enrichingKeysRef.current.has(nameKey)) {
          poiStore.selectPOI(interaction.poi, 'native');
          break;
        }
        enrichingIdsRef.current.add(enrichKey);
        enrichingKeysRef.current.add(nameKey);
        // Mark lookup attempted immediately to prevent UI loops
        poiStore.selectPOI({
          ...interaction.poi,
          properties: { ...interaction.poi.properties, osm_lookup_attempted: true }
        } as any, 'native');
        setTimeout(() => {
          enrichNativePOIWithOSM(interaction.poi)
            .catch(error => console.warn('OSM enrichment failed for native POI:', error))
            .finally(() => {
              enrichingIdsRef.current.delete(enrichKey);
              enrichingKeysRef.current.delete(nameKey);
            });
        }, 100);
        break;
      }
      case 'stored':
        // Stored POIs - just select
        poiStore.selectPOI(interaction.poi, 'stored');
        break;
        
      case 'search':
        // Search results - select and optionally enhance with OSM data
        poiStore.selectPOI(interaction.poi, 'search');
        if (enableOSMEnrichment && !interaction.poi.properties?.osm_enriched) {
          osmHandler.enrichPOIWithOSM(interaction.poi.id).catch(console.error);
        }
        break;
        
      case 'created':
        // Created POIs - just select
        poiStore.selectPOI(interaction.poi, 'created');
        break;
    }
    
    // Verify the selection was set (no console noise)
  }, []);

  // 🆕 OSM ENRICHMENT: Helper function to enrich native POIs with OSM data
  const enrichNativePOIWithOSM = useCallback(async (nativePoi: Place) => {
    try {
      if (nativePoi.properties?.osm_enriched) {
        return; // Already enriched
      }
      // Fetching OSM data for native POI via react-query (deduped by key)
      const osmMatch = await findMatchingPOI(nativePoi.name, nativePoi.latitude, nativePoi.longitude);
      if (osmMatch) {
        // Found OSM match
        // Prepare address (fallback reverse geocoding if it's just raw coords)
        let address = osmMatch.address;
        const coordPattern = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;
        if (!address || (typeof address === 'string' && coordPattern.test(address))) {
          try {
            // Fallback reverse geocoding for address
            const rev = await osmReverseGeocode(nativePoi.latitude, nativePoi.longitude);
            if (rev?.address) address = rev.address;
          } catch (err) {
            console.warn('Fallback reverse geocode failed:', err);
          }
        }
        // Create enriched POI by merging native and OSM data
        const enrichedPoi = {
          ...nativePoi,
          properties: {
            ...nativePoi.properties,
            osm_opening_hours: osmMatch.opening_hours,
            osm_phone: osmMatch.phone,
            osm_website: osmMatch.website,
            osm_operator: osmMatch.operator,
            osm_brand: osmMatch.brand,
            osm_cuisine: osmMatch.cuisine,
            osm_amenity: osmMatch.amenity,
            osm_shop: osmMatch.shop,
            osm_tourism: osmMatch.tourism,
            osm_address: address,
            osm_enriched: true,
            osm_enriched_at: Date.now(),
            osm_lookup_attempted: true
          }
        };
        poiStore.selectPOI(enrichedPoi, 'native');
      } else {
        // No OSM match found; mark lookup attempted to avoid loops
        poiStore.selectPOI({
          ...nativePoi,
          properties: { ...nativePoi.properties, osm_lookup_attempted: true }
        } as any, 'native');
      }
    } catch (error) {
      console.warn('OSM enrichment failed for native POI:', error);
    }
  }, [findMatchingPOI, osmReverseGeocode, poiStore]);

  // Set up native interactions with the stable handler
  const interactionManager = usePOIInteractionManager({
    map,
    onPOIInteraction: handlePOIInteraction,
    enabledTypes: enableNativeInteractions ? ['native', 'stored', 'search', 'created'] : ['stored', 'search', 'created']
  });

  // 🔧 STABLE HANDLERS: These are memoized in the interaction manager
  const handleStoredPlaceClick = interactionManager.handleStoredPlaceClick;
  const handleSearchResultClick = interactionManager.handleSearchResultClick;
  const handleCreatedPlaceClick = interactionManager.handleCreatedPlaceClick;

  // High-level operations
  const handleSearchResult = useCallback((poi: Place, searchQuery: string) => {
    return poiStore.addSearchResult(poi, searchQuery);
  }, []);

  const handlePOICreation = useCallback((poi: Place, customData?: Partial<CreatedPlace>) => {
    return poiStore.addCreatedPlace(poi, customData);
  }, []);

  const promoteSearchResultToStored = useCallback((searchResultId: string) => {
    return poiStore.promoteSearchResultToStored(searchResultId);
  }, []);

  const deleteCustomPOI = useCallback((poiId: string) => {
    poiStore.deleteCreatedPlace(poiId);
  }, []);

  const clearSelection = useCallback(() => {
    poiStore.clearSelection();
  }, []);

  // Data access - direct store calls (no memoization needed)
  const getStoredPlaces = poiStore.getAllStoredPlaces;
  const getSearchResults = poiStore.getSearchResults;
  const getCreatedPlaces = poiStore.getAllCreatedPlaces;
  const getAllPOIs = poiStore.getAllPOIs;
  const getActiveSelection = poiStore.getActiveSelection;

  // Return stable interface
  return {
    // Interaction handlers for React markers - STABLE
    handleStoredPlaceClick,
    handleSearchResultClick,
    handleCreatedPlaceClick,
    
    // High-level POI operations
    handleSearchResult,
    handlePOICreation,
    promoteSearchResultToStored,
    deleteCustomPOI,
    clearSelection,
    
    // Data access - direct store methods
    getStoredPlaces,
    getSearchResults,
    getCreatedPlaces,
    getAllPOIs,
    getActiveSelection,
    
    // Integrated handlers
    osmHandler,
    routeHandler,
    
    // Store direct access (for advanced use cases)
    store: poiStore,
    
    // Interaction manager status
    isNativeInteractionActive: interactionManager.isNativeInteractionActive,
  };
} 