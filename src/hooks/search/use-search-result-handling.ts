import { useCallback } from 'react';
import { usePlaceIntegration } from '@/hooks/data/use-place-integration';
import { useTransitIntegration } from '@/hooks/data/use-transit-integration';
import { useMapViewport } from '@/hooks/map/use-map-navigation';
import { SEARCH_CONFIG } from '@/constants/search-config';
import { extractAddressComponents } from '@/utils/search-utils';
import type { Coordinates } from '@/types/core';
import type { MapboxRetrieveFeature } from '@/types/mapbox';
import type { UnifiedSearchSuggestion, ObaStopSearchResult } from '@/types/transit/oba';
import type { AddressInput } from '@/utils/address-utils';
import type { Place } from '@/types/core';

interface UseSearchResultHandlingOptions {
  onResult?: (coords: Coordinates, name?: string) => void;
  onRouteSelect?: (routeId: string) => void;
  onStopSelect?: (stop: ObaStopSearchResult) => void;
  onLocationSelect?: (poi: Place) => void;
  onValueChange?: (value: string) => void;
}

export function useSearchResultHandling(options: UseSearchResultHandlingOptions) {
  const { onResult, onRouteSelect, onStopSelect, onLocationSelect, onValueChange } = options;
  const placeIntegration = usePlaceIntegration();
  const transitIntegration = useTransitIntegration();
  const { flyTo } = useMapViewport();

  // Handle SearchBox result selection (onRetrieve callback) - 2025 Mapbox Search Box API
  const handleSearchBoxRetrieve = useCallback(async (result: MapboxRetrieveFeature) => {
    console.log('🔍 SearchBox retrieve result (2025 API):', result);
    
    if (!result || !result.properties || !result.geometry) {
      console.error('Invalid search result structure:', result);
      return;
    }

    const coords: Coordinates = {
      longitude: result.geometry.coordinates[0],
      latitude: result.geometry.coordinates[1],
    };
    
    const placeName = result.properties.full_address || result.properties.name;
    
    // Keep only the most recent 5 search result POIs
    const currentPOIs = placeIntegration.getAllPlaces();
    const previousSearchResults = currentPOIs.filter(poi => (poi as any).isSearchResult);
    // Sort ascending by retrieval time
    const sortedResults = previousSearchResults.sort((a, b) => {
      const aTime = (a as any).searchResultData?.retrievedAt ? new Date((a as any).searchResultData.retrievedAt).getTime() : 0;
      const bTime = (b as any).searchResultData?.retrievedAt ? new Date((b as any).searchResultData.retrievedAt).getTime() : 0;
      return aTime - bTime;
    });
    const maxResults = 5;
    if (sortedResults.length >= maxResults) {
      // Remove oldest so that after adding the new one we have at most maxResults
      const numToRemove = sortedResults.length - (maxResults - 1);
      sortedResults.slice(0, numToRemove).forEach(poi => {
        console.log(`🗑️ Removing old search result: ${poi.name}`);
        placeIntegration.deleteSearchResult(poi.id);
      });
    }
    
    // Create POI from the 2025 search result
    const searchResultPoi = {
      id: `search-result-${result.properties.mapbox_id || Date.now()}`,
      name: result.properties.name,
      type: result.properties.feature_type === 'poi' ? 'Point of Interest' : 
            result.properties.feature_type === 'address' ? 'Address' : 
            'Search Result',
      latitude: coords.latitude,
      longitude: coords.longitude,
      // Build structured address for description
      description: (() => {
        const comps = extractAddressComponents(result);
        const addr: AddressInput = {
          road: comps.street,
          city: comps.city,
          state: comps.region,
          postcode: comps.postcode
        };
        // Fallback to full_address string if structured is empty
        if (!Object.values(addr).some(Boolean)) {
          return result.properties.full_address || result.properties.place_formatted || result.properties.name;
        }
        return addr;
      })(),
      isSearchResult: true,
      searchResultData: {
        mapboxId: result.properties.mapbox_id,
        featureType: result.properties.feature_type,
        fullAddress: result.properties.full_address,
        placeFormatted: result.properties.place_formatted,
        address: result.properties.address,
        context: result.properties.context,
        coordinates: result.properties.coordinates,
        accuracy: result.properties.coordinates?.accuracy,
        maki: result.properties.maki,
        poiCategory: result.properties.poi_category,
        brand: result.properties.brand,
        externalIds: result.properties.external_ids,
        metadata: result.properties.metadata,
        retrievedAt: new Date().toISOString(),
        feature: result // Keep original feature for reference
      }
    };
    
    console.log('📍 Adding 2025 search result POI:', searchResultPoi.name);
    
    // Add the POI to the store
    const poiId = placeIntegration.addSearchResult(searchResultPoi, placeName);
    console.log('✅ 2025 search result POI added with ID:', poiId);
    
    // Select the POI in the store
    placeIntegration.selectPlace(searchResultPoi, 'search');
    
    // Determine optimal zoom level based on feature type and accuracy
    let zoomLevel: number = SEARCH_CONFIG.ZOOM_LEVELS.ADDRESS; // Default
    
    switch (result.properties.feature_type) {
      case 'country':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.COUNTRY;
        break;
      case 'region':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.REGION;
        break;
      case 'place':
      case 'locality':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.CITY;
        break;
      case 'neighborhood':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.NEIGHBORHOOD;
        break;
      case 'address':
        zoomLevel = result.properties.coordinates?.accuracy === 'rooftop' ? 
                   SEARCH_CONFIG.ZOOM_LEVELS.PRECISE : 
                   SEARCH_CONFIG.ZOOM_LEVELS.ADDRESS;
        break;
      case 'poi':
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.POI;
        break;
      default:
        zoomLevel = SEARCH_CONFIG.ZOOM_LEVELS.ADDRESS;
    }
    
    // Fly to the location with smooth animation
    console.log(`🎯 Flying to search result location with zoom: ${zoomLevel} (feature_type: ${result.properties.feature_type})`);
    flyTo(coords, { 
      zoom: zoomLevel, 
      duration: SEARCH_CONFIG.PERFORMANCE.FLY_TO_DURATION_MS 
    });
    
    // Call onLocationSelect if provided, else fallback to onResult
    if (onLocationSelect) {
      onLocationSelect(searchResultPoi);
    } else if (onResult) {
      onResult(coords, placeName);
    }
    
    // Clear the search input
    if (onValueChange) {
      onValueChange('');
    }
  }, [placeIntegration, onResult, flyTo, onValueChange, onLocationSelect]);

  // Handle unified suggestion selection (both transit and places)
  const handleUnifiedSelect = useCallback((suggestion: UnifiedSearchSuggestion) => {
    if (suggestion.type === 'route' && onRouteSelect) {
      const routeData = suggestion.data as any;
      // Add route as a recent search, nesting the data under obaRoute
      const storeId = transitIntegration.addRoute({
        id: routeData.id,
        obaRoute: routeData,
        isRecentSearch: true,
      });
      transitIntegration.selectRoute(storeId);
      // Only trigger onRouteSelect; do not create or select a POI for route
      onRouteSelect(suggestion.id);
    } else if (suggestion.type === 'stop') {
      const stopData = suggestion.data as any;
      const poi: Place = {
        id: stopData.id,
        name: stopData.name,
        type: 'Bus Stop',
        latitude: stopData.latitude,
        longitude: stopData.longitude,
        description: `Stop #${stopData.code} - ${stopData.direction} bound`,
        isSearchResult: true,
        isObaStop: true,
        properties: {
          source: 'oba',
          stop_code: stopData.code,
          direction: stopData.direction,
          route_ids: stopData.routeIds,
          wheelchair_boarding: stopData.wheelchairBoarding
        }
      };
      const stopPoiId = placeIntegration.addSearchResult(poi, poi.name);
      placeIntegration.selectPlace(poi, 'search');
      if (onLocationSelect) {
        onLocationSelect(poi);
      } else {
        if (onStopSelect) onStopSelect(stopData);
        if (onResult) onResult({ latitude: stopData.latitude, longitude: stopData.longitude }, stopData.name);
      }
    }
  }, [placeIntegration, transitIntegration, onRouteSelect, onStopSelect, onResult, onLocationSelect]);

  return {
    handleSearchBoxRetrieve,
    handleUnifiedSelect,
  };
} 