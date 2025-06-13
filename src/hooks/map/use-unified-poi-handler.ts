import { useCallback } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { usePOIInteractionManager, type POIInteractionEvent, type POIInteractionType } from './use-poi-interaction-manager';
import { usePOIStore } from '@/stores/use-poi-store';
import { useOSMHandler } from './use-osm-handler';
import { useRouteHandler } from './use-route-handler';
import { osmService } from '@/services/osm-service';

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
  const poiStore = usePOIStore();
  const osmHandler = useOSMHandler({ enableAutoEnrichment: enableOSMEnrichment });
  const routeHandler = useRouteHandler({ enableVehicleTracking: enableRouteIntegration });

  // 🔧 CORE FIX: Single stable handler function with no dependencies
  const handlePOIInteraction = useCallback((interaction: POIInteractionEvent) => {
    console.log(`🎯 POI interaction (${interaction.type}):`, interaction.poi.name);
    console.log('🎯 Full interaction data:', {
      type: interaction.type,
      poi: {
        id: interaction.poi.id,
        name: interaction.poi.name,
        coordinates: [interaction.poi.longitude, interaction.poi.latitude],
        isNativePoi: interaction.poi.isNativePoi || false,
        properties: interaction.poi.properties
      },
      source: interaction.source
    });
    
    // Handle different interaction types
    switch (interaction.type) {
      case 'native':
        console.log('📍 Selecting native POI in store...');
        // Native POIs are ephemeral - select but don't store
        poiStore.selectPOI(interaction.poi, 'native');
        
        // 🆕 OSM ENRICHMENT: Automatically enrich native POI with OSM data (async, non-blocking)
        if (enableOSMEnrichment) {
          console.log('🌍 Enriching native POI with OSM data...');
          // Run enrichment asynchronously without blocking the popup
          setTimeout(() => {
            enrichNativePOIWithOSM(interaction.poi).catch(error => 
              console.warn('OSM enrichment failed for native POI:', error)
            );
          }, 100); // Small delay to let popup render first
        }
        break;
        
      case 'stored':
        console.log('💾 Selecting stored POI in store...');
        // Stored POIs - just select
        poiStore.selectPOI(interaction.poi, 'stored');
        break;
        
      case 'search':
        console.log('🔍 Selecting search result POI in store...');
        // Search results - select and optionally enhance with OSM data
        poiStore.selectPOI(interaction.poi, 'search');
        if (enableOSMEnrichment && !interaction.poi.properties?.osm_enriched) {
          osmHandler.enrichPOIWithOSM(interaction.poi.id).catch(console.error);
        }
        break;
        
      case 'created':
        console.log('🎨 Selecting created POI in store...');
        // Created POIs - just select
        poiStore.selectPOI(interaction.poi, 'created');
        break;
    }
    
    // Verify the selection was set
    setTimeout(() => {
      const currentSelection = poiStore.getActiveSelection();
      console.log('🔍 Active selection after POI interaction:', currentSelection);
    }, 10);
  }, []);

  // 🆕 OSM ENRICHMENT: Helper function to enrich native POIs with OSM data
  const enrichNativePOIWithOSM = useCallback(async (nativePoi: any) => {
    try {
      console.log(`🌍 Fetching OSM data for native POI: ${nativePoi.name}`);
      
      // Find matching OSM POI
      const osmMatch = await osmService.findMatchingPOI(
        nativePoi.name, 
        nativePoi.latitude, 
        nativePoi.longitude
      );
      
      if (osmMatch) {
        console.log('✨ Found OSM match:', osmMatch);
        // Prepare address (fallback reverse geocoding if it's just raw coords)
        let address = osmMatch.address;
        const coordPattern = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;
        if (!address || coordPattern.test(address)) {
          try {
            console.log('🌍 Fallback reverse geocoding for address');
            const rev = await osmService.reverseGeocode(nativePoi.latitude, nativePoi.longitude);
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
        console.log('🎯 Updated native POI selection with OSM enrichment');
      } else {
        console.log('❌ No OSM match for native POI, attempting reverse geocode fallback');
        try {
          const rev = await osmService.reverseGeocode(nativePoi.latitude, nativePoi.longitude);
          if (rev?.address) {
            const enrichedPoi = {
              ...nativePoi,
              properties: {
                ...nativePoi.properties,
                osm_address: rev.address,
                osm_enriched: true,
                osm_enriched_at: Date.now()
              }
            };
            poiStore.selectPOI(enrichedPoi, 'native');
            console.log('🎯 Updated native POI selection with fallback reverse geocode');
            return;
          }
        } catch (err) {
          console.warn('Reverse geocode fallback failed:', err);
        }
        // Final fallback: mark lookup attempted but failed
        const failedEnrichmentPoi = {
          ...nativePoi,
          properties: {
            ...nativePoi.properties,
            osm_lookup_attempted: true,
            osm_lookup_attempted_at: Date.now()
          }
        };
        poiStore.selectPOI(failedEnrichmentPoi, 'native');
        console.log('🎯 Updated native POI selection with failed OSM lookup');
      }
    } catch (error) {
      console.error('Failed to enrich native POI with OSM data:', error);
      
      // Mark as attempted but failed due to error
      const failedEnrichmentPoi = {
        ...nativePoi,
        properties: {
          ...nativePoi.properties,
          osm_lookup_attempted: true,
          osm_lookup_attempted_at: Date.now(),
          osm_lookup_error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      
      poiStore.selectPOI(failedEnrichmentPoi, 'native');
      console.log('🎯 Updated native POI selection with OSM lookup error flag');
    }
  }, []);

  // Set up native interactions with the stable handler
  const interactionManager = usePOIInteractionManager({
    map,
    onPOIInteraction: handlePOIInteraction,
    enabledTypes: enableNativeInteractions ? ['native', 'stored', 'search', 'created'] : ['stored', 'search', 'created']
  });

  // 🔧 STABLE HANDLERS: These are memoized in the interaction manager
  const handleStoredPOIClick = interactionManager.handleStoredPOIClick;
  const handleSearchResultClick = interactionManager.handleSearchResultClick;
  const handleCreatedPOIClick = interactionManager.handleCreatedPOIClick;

  // High-level operations
  const handleSearchResult = useCallback((poi: any, searchQuery: string) => {
    return poiStore.addSearchResult(poi, searchQuery);
  }, []);

  const handlePOICreation = useCallback((poi: any, customData?: any) => {
    return poiStore.addCreatedPOI(poi, customData);
  }, []);

  const promoteSearchResultToStored = useCallback((searchResultId: string) => {
    return poiStore.promoteSearchResultToStored(searchResultId);
  }, []);

  const deleteCustomPOI = useCallback((poiId: string) => {
    poiStore.deleteCreatedPOI(poiId);
  }, []);

  const clearSelection = useCallback(() => {
    poiStore.clearSelection();
  }, []);

  // Data access - direct store calls (no memoization needed)
  const getStoredPOIs = poiStore.getAllStoredPOIs;
  const getSearchResults = poiStore.getSearchResults;
  const getCreatedPOIs = poiStore.getAllCreatedPOIs;
  const getAllPOIs = poiStore.getAllPOIs;
  const getActiveSelection = poiStore.getActiveSelection;

  // Return stable interface
  return {
    // Interaction handlers for React markers - STABLE
    handleStoredPOIClick,
    handleSearchResultClick,
    handleCreatedPOIClick,
    
    // High-level POI operations
    handleSearchResult,
    handlePOICreation,
    promoteSearchResultToStored,
    deleteCustomPOI,
    clearSelection,
    
    // Data access - direct store methods
    getStoredPOIs,
    getSearchResults,
    getCreatedPOIs,
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