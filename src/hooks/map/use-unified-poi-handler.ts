import { useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
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

  // 🔧 CORE FIX: Single stable handler function with no dependencies
  const handlePOIInteraction = useCallback((interaction: POIInteractionEvent) => {
    // Handle different interaction types without console noise
    switch (interaction.type) {
      case 'native':
        // Native POIs are ephemeral - select but don't store
        poiStore.selectPOI(interaction.poi, 'native');
        
        // 🆕 OSM ENRICHMENT: Automatically enrich native POI with OSM data (async, non-blocking)
        if (enableOSMEnrichment) {
          // Run enrichment asynchronously without blocking the popup
          setTimeout(() => {
            enrichNativePOIWithOSM(interaction.poi).catch(error => 
              console.warn('OSM enrichment failed for native POI:', error)
            );
          }, 100); // Small delay to let popup render first
        }
        break;
        
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
      // Fetching OSM data for native POI
      // Find matching OSM POI directly via service (not nested queries)
      const osmMatch = await osmService.findMatchingPOI(nativePoi.name, nativePoi.latitude, nativePoi.longitude);
      
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
            osm_enriched_at: Date.now()
          }
        };
        poiStore.selectPOI(enrichedPoi, 'native');
        // Updated native POI selection with OSM enrichment
      } else {
        // No OSM match found for native POI
      }
    } catch (error) {
      console.warn('OSM enrichment failed for native POI:', error);
        }
  }, [osmReverseGeocode, poiStore]);

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